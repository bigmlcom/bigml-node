/**
 * Copyright 2014-2015 BigML
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

var Predicates = require(PATH + 'Predicates');


/**
 * AnomalyTree: substructure for the Local predictive Anomaly Detector
 * @constructor
 */
function AnomalyTree(tree, fields) {
  /**
   * A tree-like predictive anomaly detector.
   *
   * @param {object} tree AnomalyTree-like substructure of the resource object
   * @param {object} fields Anomaly detector's fields
   */

  this.fields = fields;

  if (((typeof tree.predicates) === 'boolean') && tree.predicates) {
    this.predicates = new Predicates([true]);
  } else {
    this.predicates = new Predicates(tree.predicates);
  }

  if (tree.hasOwnProperty('id')) {
    this.id = tree.id;
  } else {
    this.id = null;
  }
  var child, index, len, children = [];
  if (tree.children) {
    len = tree.children.length;
    for (index = 0; index < len; index++) {
      child = tree.children[index];
      children.push(
        new AnomalyTree(child, this.fields)
      );
    }
  }
  this.children = children;
}

AnomalyTree.prototype.depth = function (inputData, path, depth) {
  /**
   * Returns the depth of the node that reaches the input data instance
   * when run through the tree, and the associated set of rules.
   *
   * If a node has any children whose
   * predicates are all true given the instance, then the instance will
   * flow through that child.  If the node has no children or no
   * children with all valid predicates, then it outputs the depth of the
   * node.
   * @param {object} inputData Input data to predict
   * @param {array} path List of predicates leading to the prediction
   * @param {integer} depth Depth of the prediction node in the tree
   *
   */
  var child, index, len, predicate, finalDistribution, lastNode,
    distribution = [],
    prediction, confidence, totalInstances = 0, element, itemsSorted,
    instances, items;
  if ((typeof path) === 'undefined') {
    path = [];
  }
  if ((typeof depth) === 'undefined') {
    depth = 0;
  }
  if (depth === 0) {
    if (!this.predicates.evaluate(inputData, this.fields)) {
      return {depth: depth, path: path};
    }
    depth += 1;
  }
  if (this.children) {
    len = this.children.length;
    for (index = 0; index < len; index++) {
      child = this.children[index];
      if (child.predicates.evaluate(inputData, this.fields)) {
        path.push(child.predicates.toRule(this.fields));
        return child.depth(inputData, path, depth + 1);
      }
    }
  }
  return {depth: depth, path: path};
};


if (NODEJS) {
  module.exports = AnomalyTree;
} else {
  exports = AnomalyTree;
}
