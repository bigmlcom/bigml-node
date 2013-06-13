/**
 * Copyright 2013 BigML
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

var Predicate = require('./Predicate');

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
  for (i = 0; i < distribution.length; i++) {
    count += distribution[i][1];
  }
  return count;
}

/**
 * Tree: substructure for the Local predictive Model
 * @constructor
 */
function Tree(tree, fields, objectiveField) {
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
  this.objetiveField = objectiveField;
  this.output = tree.output;
  if (((typeof tree.predicate) === 'boolean') && tree.predicate) {
    this.predicate = true;
  } else {
    this.predicate = new Predicate(
      tree.predicate.operator,
      tree.predicate.field,
      tree.predicate.value
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
  this.count = tree.count;
  this.confidence = tree.confidence;
  if (tree.distribution) {
    this.distribution = tree.distribution;
  } else if (tree['objective_summary']) {
    summary = tree['objective_summary'];
  } else {
    summary = this.fields[this.objectiveField].summary;
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

Tree.prototype.predict = function (inputData, path) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by Id.
   * @param {object} inputData Input data to predict
   * @param {array} path List of predicates leading to the prediction
   *
   */
  var child, predicate;
  if (!path) {
    path = [];
  }
  if (this.children && inputData.hasOwnProperty(splitField(this.children))) {
    for (child in this.children) {
      if (this.children.hasOwnProperty(child)) {
        predicate = new Predicate(this.children[child].predicate.operator,
                                  this.children[child].predicate.field,
                                  this.children[child].predicate.value);
        if (predicate.evaluate(inputData)) {
          path.push(predicate.toRule(this.fields));
          return this.children[child].predict(inputData, path);
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
};

module.exports = Tree;
