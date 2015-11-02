/**
 * Copyright 2013-2015 BigML
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
var PATH = (NODEJS) ? "./" : "";

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
  if (distribution !== null) {
    for (i = 0; i < distribution.length; i++) {
      count += distribution[i][1];
    }
  }
  return count;
}



function itemize(newDistribution) {
  var item,
    key,
    itemizedDist = [];
  for (key in newDistribution) {
    if (newDistribution.hasOwnProperty(key)) {
      item = [];
      item[0] = key;
      item[1] = newDistribution[key];
      itemizedDist.push(item);
    }
  }
  return itemizedDist;
}


function mergeDistributions(distribution, newDistribution) {
  /**
   * Adds up a new distribution structure to a map formatted distribution
   */
  var value,
    instances,
    counter,
    distributionArrays = itemize(newDistribution);
  for (counter = 0; counter < distributionArrays.length; counter++) {
    value = distributionArrays[counter][0];
    instances = distributionArrays[counter][1];
    if (!distribution.hasOwnProperty(value)) {
      distribution[value] = 0;
    }
    distribution[value] += instances;
  }
  return distribution;
}

function mergeBins(distribution, limit) {
  /**
   * Merges the bins of a regression distribution to the given limit number
   */
  var length = distribution.length,
    indexToMerge = 2,
    shortest = Number.POSITIVE_INFINITY,
    index,
    distance,
    newDistribution,
    left,
    right,
    newBin = [];
  if ((limit < 1) || (length <= limit) || (length < 2)) {
    return distribution;
  }
  for (index = 1; index < length; index++) {
    distance = distribution[index][0] - distribution[index - 1][0];
    if (distance < shortest) {
      shortest = distance;
      indexToMerge = index;
    }
  }
  newDistribution = distribution.slice(0, indexToMerge - 1);
  left = distribution[indexToMerge - 1];
  right = distribution[indexToMerge];
  newBin[0] = (left[0] * left[1] + right[0] * right[1]) / (left[1] + right[1]);
  newBin[1] = left[1] + right[1];
  newDistribution.push(newBin);
  if (indexToMerge < (length - 1)) {
    newDistribution = newDistribution.concat(distribution.slice(indexToMerge + 1));
  }
  return mergeBins(newDistribution, limit);
}


function mean(distribution) {
  /**
   * Computes the mean of a distribution in the [[point, instances]] syntax
   */

  var addition = 0.0,
    count = 0.0,
    elem,
    point,
    instances;

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
  if (distributionMean === undefined) {
    distributionMean = null;
  }

  var addition = 0.0,
    count = 0.0,
    elem,
    point,
    instances;
  if ((distributionMean === null) || (isNaN(distributionMean))) {
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
  if (zeta === null || zeta === undefined) {
    zeta = 1.96;
  }

  if (population > 0) {
    var error, jDollar = (NODEJS) ? jStat.j$ : j$,
      chiDistr = jDollar.chisquare(population),
      ppf = chiDistr.inv(1 - jDollar.erf(zeta / Math.sqrt(2)));
    if (ppf !== 0) {
      error = distVariance * (population - 1) / ppf;
      error = error * Math.pow((Math.sqrt(population) + zeta), 2);
      return Math.sqrt(error / population);
    }
  }
  return Number.NaN;
}


function missingBranch(children) {
  /**
   * Checks if the missing values are assigned to a special branch with other
   * values
   *
   * @param {array} children Array of Tree structures
   */
  var i, len = children.length;
  for (i = 0; i < len; i++) {
    if (children[i].predicate.missing) {
      return true;
    }
  }
  return false;
}


function noneValue(children) {
  /**
   * Checks if the missing values are assigned to a special branch
   *
   * @param {array} children Array of Tree structures
   */
  var i, len = children.length;
  for (i = 0; i < len; i++) {
    if (children[i].predicate.value == null) {
      return true;
    }
  }
  return false;
}


function oneBranch(children, inputData) {
  /**
   * Checks if there's only one branch to be followed
   *
   * @param {array} children Array of Tree structures
   * @param {object} inputData Input Data map
   */

  return (inputData.hasOwnProperty(splitField(children)) ||
          missingBranch(children) || noneValue(children));
}

function distMedian(distribution, count) {
  /**
   * Returns the median value for a distribution
   */
  var counter = 0, previousValue = null, value, instances, index;
  for (index in distribution) {
    value = distribution[index][0];
    instances = distribution[index][1];
    counter += instances;
    if (counter > count / 2.0) {
      if (!(count % 2) && ((counter - 1) == (count / 2)) &&
          previousValue !== null) {
        return (value + previousValue) / 2.0;
      }
      return value;
    }
    previousValue = value;
  }
  return null;
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
  if (this.regression) {
    this.median = null;
    if (summary && summary.hasOwnProperty('median')) {
      this.median = summary.median;
    }
    if (!this.median) {
      this.median = distMedian(this.distribution, this.count);
    }
  }
  this.impurity = null;
  if (!this.regression && this.distribution) {
    this.impurity = this.giniImpurity();
  }
}


Tree.prototype.giniImpurity = function () {
  /**
   * Returns the gini impurity score associated to the distribution
   * in the node.
   */
  var purity = 0.0, instances, index;
  if (!this.distribution) {
    return null;
  }
  for (index in this.distribution) {
    instances = this.distribution[index][1];
    purity += Math.pow(instances / (this.count + 0.0), 2);
    return (1.0 - purity) / 2;
  }
};


Tree.prototype.predict = function (inputData, path, missingStrategy, median) {
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
   * @param {0|1} missingStrategy Code for the chosen missing strategy
   * @param {boolean} median The `median` flag is used in regression models
   *                  only and causes the prediction to be the median of
   *                  the node distribution.
   */
  var predicate, finalDistribution, lastNode, distribution = [],
    prediction, confidence, totalInstances = 0, element, itemsSorted,
    instances, items, index, len, nextPredicates = [];
  if (!path) {
    path = [];
  }
  if (typeof median === 'undefined') {
    median = false;
  }
  if (missingStrategy === constants.PROPORTIONAL) {
    prediction = this.predictProportional(inputData, path, false, median);
    finalDistribution = prediction.distribution;
    lastNode = prediction.lastNode;
    items = itemize(finalDistribution);
    if (this.regression) {
      //regression with strategy proportional
      // singular case:
      // when the prediction is the one given in a 1-instance node
      if (items.length == 1) {
        instances = items[0][1];
        if (instances === 1) {
          return {
            'prediction': lastNode.output,
            'path': path,
            'confidence': lastNode.confidence,
            'distribution': lastNode.distribution,
            'count': instances,
            'nextPredicates': nextPredicates
          };
        }
      }
      //when there's more instances, sort elements by their mean
      itemsSorted = items.sort(
        function (a, b) {
          var x = parseInt(a[0], 10),
            y = parseInt(b[0], 10);
          if (x < y) {
            return -1;
          }
          if (x > y) {
            return 1;
          }
          return 0;
        }
      );
      for (element = 0; element < itemsSorted.length; element++) {
        distribution.push(itemsSorted[element]);
      }
      distribution = mergeBins(distribution, constants.BINS_LIMIT);
      for (element = 0; element < distribution.length; element++) {
        totalInstances += distribution[element][1];
      }
      prediction = (median ? distMedian(distribution, totalInstances) :
                    mean(distribution));
      confidence = regressionError(
        unbiasedSampleVariance(distribution, prediction),
        totalInstances
      );

      return {
        'prediction': prediction,
        'path': path,
        'confidence': confidence,
        'distribution': distribution,
        'count': totalInstances,
        'nextPredicates': nextPredicates
      };
    }
    //categorical with strategy proportional
    itemsSorted = itemize(finalDistribution).sort(
      function (a, b) {
        var x = a[1],
          y = b[1];
        if (x < y) {
          return 1;
        }
        if (x > y) {
          return -1;
        }
        return 0;
      }
    );
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
      'count': getInstances(distribution),
      'nextPredicates': nextPredicates
    };
  }

  //missingStrategy == constants.LAST_PREDICTION

  if (this.children) {
    len = this.children.length;
    for (index = 0; index < len; index++) {
      predicate = this.children[index].predicate;
      nextPredicates.push(this.children[index].nextPredicate());
      if (predicate.evaluate(inputData, this.fields)) {
        path.push(predicate.toRule(this.fields));
        return this.children[index].predict(inputData, path,
                                            missingStrategy, median);
      }
    }

  }
  prediction = (!this.regression || !median) ? this.output : this.median;

  return {
    'prediction': prediction,
    'path': path,
    'confidence': this.confidence,
    'distribution': this.distribution,
    'count': getInstances(this.distribution),
    'nextPredicates': nextPredicates
  };
};

Tree.prototype.predictProportional = function (inputData, path,
                                               missingFound, median) {
  /**
   * Makes a prediction based on a number of field values averaging
   * the predictions of the leaves that fall in a subtree.
   *
   * Each time a splitting field has no value assigned, we consider
   * both branches of the split to be true, merging their predictions.
   * The function returns the merged distribution and the
   * last node reached by a unique path.
   */
  var child, numChild, predicate, finalDistribution = {}, counter, key,
    distributionDicts = {}, newRule, cDistribution;
  if (!path) {
    path = [];
  }
  if (this.children.length === 0) {
    for (counter = 0; counter < this.distribution.length; counter++) {
      key = this.distribution[counter][0];
      distributionDicts[key] = this.distribution[counter][1];
    }
    return {distribution: mergeDistributions({}, distributionDicts),
            lastNode: this};
  }

  if (oneBranch(this.children, inputData)) {
    for (numChild = 0; numChild < this.children.length; numChild++) {
      child = this.children[numChild];
      if (child.predicate.evaluate(inputData, this.fields)) {
        newRule = child.predicate.toRule(this.fields);
        if (path.indexOf(newRule) < 0 && !missingFound) {
          path.push(newRule);
        }
        return child.predictProportional(
          inputData, path, missingFound, median);
      }
    }
  } else {
    missingFound = true;
    for (numChild = 0; numChild < this.children.length; numChild++) {
      child = this.children[numChild];
      cDistribution = child.predictProportional(inputData,
                                                path,
                                                missingFound,
                                                median).distribution;
      finalDistribution = mergeDistributions(finalDistribution, cDistribution);
    }
    return {distribution: finalDistribution,
            lastNode: this};
  }
};


Tree.prototype.isRegression = function () {
  /**
   * Checks if the subtree structure can be a regression
   */
  function isClassification(node) {
    /**
     * Checks if the node's value is a category
     */
    return (typeof (node.output) === "string");
  }


Tree.prototype.nextPredicate = function () {
  /**
   * Returns the info needed for the next predicate structure
   */
  var toJSON = this.predicate.toJSON();
  toJSON.count = this.count;
  return toJSON;
}


  var classification = isClassification(this), child, numChild;
  if (classification) {
    return false;
  }
  if (this.children.length === 0) {
    return true;
  }

  for (numChild = 0; numChild < this.children.length; numChild++) {
    child = this.children[numChild];
    if (isClassification(child)) {
      return false;
    }
  }
  return true;
};


if (NODEJS) {
  module.exports = Tree;
} else {
  exports = Tree;
}
