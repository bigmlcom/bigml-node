/**
 * Copyright 2013-2014 BigML
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

"use strict";

var NODEJS = ((typeof module !== 'undefined') && module.exports);
var PATH = (NODEJS) ? "./": "";

var constants = require(PATH + 'constants');
var Predicate = require(PATH + 'Predicate');
var utils = require(PATH + 'utils');
var jStat = (NODEJS) ? require('jStat') : require('jstat.min.js');

function splitField(children) {
  /**
   * Returns the field that is used by the node to make a decision.
   *
   * @param {object} children Children info
   */
  var child, field = [];
  for (child in children) {
    if (children.hasOwnProperty(child)) {
      field.push(children[child].predicate.field);
    }
  }
  field = field.filter(function (e, i, field) {
    return field.indexOf(e, i + 1) === -1;
  });
  if (field.length === 1) {
    return field.pop();
  }
}

function getInstances(distribution) {
  /**
   * Returns the total number of instances in a distribution
   *
   * @param {array} distribution List of classes and their instances
   */
  var i, count = 0;
  if (distribution != null) {
    for (i = 0; i < distribution.length; i++) {
      count += distribution[i][1];
    }
  }
  return count;
}



function itemize(newDistribution){
  var item,
      key,
      itemizedDist = new Array();
  for (key in newDistribution) {
    item = new Array();
    item[0] = key;
    item[1] = newDistribution[key];
    itemizedDist.push(item);
  }
  return itemizedDist;
}


function mergeDistributions(distribution, newDistribution){
  /**
   * Adds up a new distribution structure to a map formatted distribution
   */
  var value,
      instances,
      counter;
  //py: for value, instances in new_distribution.items():
  var distributionArrays = itemize(newDistribution);
  for (counter = 0; counter < distributionArrays.length; counter++) {
    value = distributionArrays[counter][0];
    instances = distributionArrays[counter][1];
    if (! (value in distribution) ) {
      distribution[value] = 0;
    }
    distribution[value] += instances;
  }
  return distribution;
}

function mergeBins(distribution, limit){
  /**
   * Merges the bins of a regression distribution to the given limit number
   */
  var length = distribution.length;
  if ((limit < 1) || (length <= limit) || (length < 2)) {
    return distribution;
  }
  var indexToMerge = 2,
      shortest = Number.POSITIVE_INFINITY,
      index;
  for (index = 1; index < length; index++) {
    var distance = distribution[index][0] - distribution[index - 1][0];
    if (distance < shortest) {
      shortest = distance;
      indexToMerge = index;
    }
  }
  //py:      new_distribution = distribution[: index_to_merge - 1]
  var newDistribution = distribution.slice(0, indexToMerge - 1);
  var left = distribution[indexToMerge - 1];
  var right = distribution[indexToMerge];
  var newBin = new Array()
  newBin[0] = (left[0] * left[1] + right[0] * right[1]) / (left[1] + right[1]);
  newBin[1] = left[1] + right[1];
  newDistribution.append(newBin);
  if (indexToMerge < (length - 1)) {
    //py:      new_distribution.extend(distribution[(index_to_merge + 1):])
    newDistribution.push(distribution.slice(indexToMerge + 1));
  }
  return mergeBins(newDistribution, limit);
}


function mean(distribution) {
  /**
   * Computes the mean of a distribution in the [[point, instances]] syntax
   */

  var addition = 0.0,
      count = 0.0,
      elem, point, instances;

  //for point, instances in distribution:
  for (elem = 0; elem < distribution.length; elem++) {
    point = distribution[elem][0];
    instances = distribution[elem][1];

    addition += point * instances;
    count += instances;
  }
  if (count > 0) {
    return addition / count;
  }
  return Number.NaN;
}


function unbiasedSampleVariance(distribution, distributionMean) {
  /**
   * Computes the standard deviation of a distribution in the
   *  [[point, instances]] syntax
   */
  if (distributionMean == undefined) {
    distributionMean = null;
  }

  var addition = 0.0,
    count = 0.0,
    elem, point, instances;
  if ((distributionMean == null) || (isNaN(distributionMean))) {
    distributionMean = mean(distribution);
  }
  for (elem = 0; elem < distribution.length; elem++) {
    point = parseFloat(distribution[elem][0]);
    instances = distribution[elem][1];

    addition += Math.pow((point - distributionMean), 2) * instances;
    count += instances;
  }
  if (count > 1) {
    return addition / (count - 1);
  }
  return Number.NaN;
}


function regressionError(distVariance, population, zeta) {
  /**
   * Computes the variance error
   */
  if (zeta == null) {
    zeta = 1.96;
  }

  if (population > 0) {
    var chiDistr = jStat.j$.chisquare(population);
    var ppf = chiDistr.inv(1 - jStat.j$.erf(zeta / Math.sqrt(2)));
    if (ppf != 0) {
      var error = distVariance * (population - 1) / ppf;
      error = error * Math.pow((Math.sqrt(population) + zeta), 2);
      return Math.sqrt(error / population);
    }
  }
  return Number.NaN;
}


/**
 * Tree: substructure for the Local predictive Model
 * @constructor
 */
function Tree(tree, fields, objectiveField, rootDistribution) {
  /**
   * A tree-like predictive model.
   *
   * @param {object} tree Tree-like substructure of the resource object
   * @param {object} fields Model's fields
   * @param {string} objectiveField Objective field for the Model
   */

  this.fields = fields;
  if (objectiveField && (typeof objectiveField) === 'array') {
    objectiveField = objectiveField[0];
  }
  this.objectiveField = objectiveField;
  this.output = tree.output;
  if (((typeof tree.predicate) === 'boolean') && tree.predicate) {
    this.predicate = true;
  } else {
    this.predicate = new Predicate(
      tree.predicate.operator,
      tree.predicate.field,
      tree.predicate.value,
      tree.predicate.term
    );
  }

  var child, summary, children = [];
  if (tree.children) {
    for (child in tree.children) {
      if (tree.children.hasOwnProperty(child)) {
        children.push(
          new Tree(tree.children[child], this.fields, objectiveField)
        );
      }
    }
  }
  this.children = children;
  this.regression = this.isRegression();
  this.count = tree.count;
  this.confidence = tree.confidence;
  if (tree.distribution) {
    this.distribution = tree.distribution;
  } else if (tree['objective_summary']) {
    summary = tree['objective_summary'];
  } else {
    summary = rootDistribution;
  }
  if (summary) {
    if (summary.bins) {
      this.distribution = summary.bins;
    } else if (summary.counts) {
      this.distribution = summary.counts;
    } else if (summary.categories) {
      this.distribution = summary.categories;
    }
  }
}

Tree.prototype.predict = function (inputData, path, missingStrategy) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by Id. There are two possible
   * strategies to predict when the value for the splitting field
   * is missing:
   *         0 - LAST_PREDICTION: the last issued prediction is returned.
   *         1 - PROPORTIONAL: as we cannot choose between the two branches
   *             in the tree that stem from this split, we consider both. The
   *             algorithm goes on until the final leaves are reached and
   *             all their predictions are used to decide the final prediction.
   * @param {object} inputData Input data to predict
   * @param {array} path List of predicates leading to the prediction
   *
   */
  var child, predicate;
  if (!path) {
    path = [];
  }

  if (missingStrategy == constants.PROPORTIONAL) {
    var finalDistribution = this.predictProportional(inputData, path);
    if (this.regression) {
        //categorical with strategy proportional
        var distribution = [],
            prediction, 
            confidence,
            totalInstances = 0,
            element;
        //sort elements by their mean
        var itemsSorted = itemize(finalDistribution).sort(
          function(a, b) {
            var x = a[0];
            var y = b[0];
            if (x < y) {
                return -1;
            }
            if (x > y) {
                return 1;
            }
            return 0;
        });
        for (element = 0; element < itemsSorted.length; element++) {
          distribution.push(itemsSorted[element]);
        }
        distribution = mergeBins(distribution, constants.BINS_LIMIT);
        prediction = mean(distribution);
        for (element = 0; element < distribution.length; element++) {
            totalInstances += distribution[element][1];
        }
        confidence = regressionError(
                        unbiasedSampleVariance(distribution, prediction),
                        totalInstances);
        return  {
          'prediction': prediction, 
          'path': path, 
          'confidence': confidence, 
          'distribution': distribution, 
          'count': totalInstances
        };
    } else {
      //categorical with strategy proportional
      var distribution = [], element;
      var itemsSorted = itemize(finalDistribution).sort(
        function(a, b) {
          var x = a[1];
          var y = b[1];
          if (x < y) {
            return 1;
          }
          if (x > y) {
            return -1;
          }
          return 0;
      });
      for (element = 0; element < itemsSorted.length; element++) {
        distribution.push(itemsSorted[element]);
      }

      //wsConfidence at utils.js
      return {
        'prediction': distribution[0][0],
        'path': path,
        'confidence': utils.wsConfidence(distribution[0][0],
                                         finalDistribution),
        'distribution': distribution,
        'count': getInstances(distribution)
      };
    }
  } else {

    //missingStrategy == constants.LAST_PREDICTION
    if (this.children && inputData.hasOwnProperty(splitField(this.children))) {
      for (child in this.children) {
        if (this.children.hasOwnProperty(child)) {
          predicate = new Predicate(this.children[child].predicate.operator,
                                    this.children[child].predicate.field,
                                    this.children[child].predicate.value,
                                    this.children[child].predicate.term);
          if (predicate.evaluate(inputData, this.fields)) {
            path.push(predicate.toRule(this.fields));
            return this.children[child].predict(inputData, path, missingStrategy);
          }
        }
      }
    }
    return {
      'prediction': this.output,
      'path': path,
      'confidence': this.confidence,
      'distribution': this.distribution,
      'count': getInstances(this.distribution)
    };
  }
};

Tree.prototype.predictProportional = function (inputData, path) {
  /**
   * Makes a prediction based on a number of field values averaging
   * the predictions of the leaves that fall in a subtree.
   *
   * Each time a splitting field has no value assigned, we consider
   * both branches of the split to be true, merging their predictions.
   */
  var child, numChild, predicate;
  if (!path) {
    path = new Array();
  }
  var finalDistribution = {};
  if (this.children.length == 0) {
    var counter, 
        key,
        distributionDicts = {};
    for (counter = 0; counter < this.distribution.length; counter++) {
      key = this.distribution[counter][0];
      distributionDicts[key] = this.distribution[counter][1];
    }
    return mergeDistributions({}, distributionDicts);
    //py: return merge_distributions({}, dict((x[0], x[1])
    //                                        for x in this.distribution))
  }

  if (splitField(this.children) in inputData) {
    for (numChild = 0; numChild < this.children.length; numChild++) {
      child = this.children[numChild];
      if (child.predicate.evaluate(inputData, this.fields)) {
        var newRule = child.predicate.toRule(this.fields);
        if (! (newRule in path)) {
          path.push(newRule);
        }
        return child.predictProportional(inputData, path);
      }
    }
  } else {
    var cDistribution;
    for (numChild = 0; numChild < this.children.length; numChild++) {
      child = this.children[numChild];
      cDistribution = child.predictProportional(inputData, path);
      finalDistribution = mergeDistributions(finalDistribution, cDistribution);
    }
    return finalDistribution;
  }
}


Tree.prototype.isRegression = function () {
  /**
   * Checks if the subtree structure can be a regression
   */
  function isClassification(node){
    /**
     * Checks if the node's value is a category
     */
    return (typeof (node.output) == "string");
  }

  var classification = isClassification(this);
  if (classification) {
      return false;
  }
  if (this.children.length == 0) {
      return true;
  } else {
    // py:         return not any([is_classification(child)
    //                          for child in self.children])
    var child, numChild;
    for (numChild = 0; numChild < this.children.length; numChild++) {
      child = this.children[numChild];
      if (isClassification(child)) {
        return false;
      }
    }
    return true;
  }
}


if (NODEJS) {
  module.exports = Tree;
} else {
  exports = Tree;
}
