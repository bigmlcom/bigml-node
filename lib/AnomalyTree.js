/**
 * Copyright 2014-2020 BigML
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
var PATH = (NODEJS) ? "./" : "";

var Predicates = require(PATH + 'Predicates');

// End of imports section --- DO NOT REMOVE

const gTruePredicate = new Predicates([true]);

function predicates(tree) {
    if (((typeof tree.predicates) === 'boolean') && tree.predicates) {
      return gTruePredicate;
    } else {
      return new Predicates(tree.predicates);
    }
}

/**
 * AnomalyTree: substructure for the Local predictive Anomaly Detector
 * @constructor
 */
function AnomalyTree(tree, fields, opts = {}) {
  /**
   * A tree-like predictive anomaly detector.
   *
   * @param {object} tree AnomalyTree-like substructure of the resource object
   * @param {object} fields Anomaly detector's fields
   */

  this.fields = fields;

  if (tree.hasOwnProperty('id')) {
    this.id = tree.id;
  } else {
    this.id = null;
  }

  if (!opts.shallow) {
    opts.lazy = false;
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
  } else {
    this.tree = tree;
  }

  this.lazy = opts.lazy;
  if (!this.lazy)
    this.predicates = predicates(tree);
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
    const preds = this.predicates || predicates(this.tree);
    if (!preds.evaluate(inputData, this.fields)) {
      return {depth: depth, path: path};
    }
    depth += 1;
  }

  let children = this.tree ? this.tree.children : this.children;
  if (children) {
    len = children.length;
    for (index = 0; index < len; index++) {
      if (this.children) { // if this.children, we are non-lazy
        child = children[index];
      } else {
        child = new AnomalyTree(children[index],
                                this.fields,
                                { lazy: this.lazy, shallow: true });
        if (this.lazy)
          child.predicates = predicates(children[index]);
      }
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
