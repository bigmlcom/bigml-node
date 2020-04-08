/**
 * Copyright 2017-2020 BigML
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

var NODEJS = ((typeof process !== 'undefined') && process &&
  process.RUNNING_IN_NODEJS === 'true');
var PATH = NODEJS ? "./" : "";

var constants = require(PATH + 'constants');
var Predicate = require(PATH + 'Predicate');
var utils = require(PATH + 'utils');
var JSTAT_EXT = NODEJS ? "" : ".min.js";
var jStat = require('jstat' + JSTAT_EXT);


// End of imports section --- DO NOT REMOVE

var TEXT_TYPES = ["text", "items"];


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
    if (children[i].predicate.value === null) {
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


/**
 * BoostedTree: substructure for the Local predictive Model
 * @constructor
 */
function BoostedTree(tree, fields, objectiveField) {
  /**
   * A tree-like predictive model for boosted ensembles
   *
   * @param {object} tree Tree-like substructure of the resource object
   * @param {object} fields Model's fields
   * @param {string} objectiveField Objective field for the Model
   */

  this.fields = fields;
  if (objectiveField && (objectiveField.constructor === Array)) {
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

  var child, children = [];
  if (tree.children) {
    for (child in tree.children) {
      if (tree.children.hasOwnProperty(child)) {
        children.push(
          new BoostedTree(tree.children[child], this.fields, objectiveField)
        );
      }
    }
  }
  this.children = children;
  this.regression = this.isRegression();
  this.count = tree.count;
  this.gSum = tree.g_sum;
  this.hSum = tree.h_sum;
}


BoostedTree.prototype.predict = function (inputData, path, missingStrategy) {
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
   */
  var predicate, index, len, result;
  if (!path) {
    path = [];
  }
  if (missingStrategy === constants.PROPORTIONAL) {
    return this.predictProportional(inputData, path, false);
  }

  //missingStrategy == constants.LAST_PREDICTION

  if (this.children) {
    len = this.children.length;
    for (index = 0; index < len; index++) {
      predicate = this.children[index].predicate;
      if (predicate.evaluate(inputData, this.fields)) {
        path.push(predicate.toRule(this.fields));
        return this.children[index].predict(inputData, path,
                                            missingStrategy);
      }
    }

  }
  result = {
    'prediction': this.output,
    'path': path,
    'confidence': undefined,
    'distribution': undefined,
    'count': this.count,
    'nextPredicates': undefined
  };
  return result;
};

BoostedTree.prototype.predictProportional = function (inputData, path,
                                                      missingFound) {
  /**
   * Makes a prediction based on a number of field values averaging
   * the predictions of the leaves that fall in a subtree.
   *
   * Each time a splitting field has no value assigned, we consider
   * both branches of the split to be true, merging their predictions.
   * The function returns the merged distribution and the
   * last node reached by a unique path.
   */
  var child, numChild, newRule, fieldType, population = 0, gSums = 0.0,
    hSums = 0.0, childPredictions;

  if (!path) {
    path = [];
  }

  if (this.children.length === 0) {
    return {"gSums": this.gSum, "hSums": this.hSum,
            "count": this.count, "path": path};
  }

  fieldType = this.fields[splitField(this.children)].optype;
  if (oneBranch(this.children, inputData) ||
      TEXT_TYPES.indexOf(fieldType) > -1) {
    for (numChild = 0; numChild < this.children.length; numChild++) {
      child = this.children[numChild];
      if (child.predicate.evaluate(inputData, this.fields)) {
        newRule = child.predicate.toRule(this.fields);
        if (path.indexOf(newRule) < 0 && !missingFound) {
          path.push(newRule);
        }
        return child.predictProportional(inputData, path, missingFound);
      }
    }
  } else {
    missingFound = true;
    for (numChild = 0; numChild < this.children.length; numChild++) {
      child = this.children[numChild];
      childPredictions = child.predictProportional(inputData,
                                                   path,
                                                   missingFound);
      gSums += childPredictions.gSums;
      hSums += childPredictions.hSums;
      population += childPredictions.count;
    }
    return {"gSums": gSums, "hSums": hSums,
            "count": population, "path": path};
  }
};


BoostedTree.prototype.isRegression = function () {
  /**
   * Checks if the subtree structure can be a regression
   */
  function isClassification(node) {
    /**
     * Checks if the node's value is a category
     */
    return (typeof (node.output) === "string");
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


BoostedTree.prototype.nextPredicate = function () {
  /**
   * Returns the info needed for the next predicate structure
   */
  var toJSON = this.predicate.toJSON();
  toJSON.count = this.count;
  return toJSON;
};


if (NODEJS) {
  module.exports = BoostedTree;
} else {
  exports = BoostedTree;
}
