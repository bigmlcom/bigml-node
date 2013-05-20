/**
 * Copyright 2012 BigML
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

function splitField(children) {
  /**
   * Returns the field that is used by the node to make a decision.
   *
   * @param {object} children Children info
   */
  var field = new Array();
  for (child in children) {
    field.push(children[child].predicate.field);
  }
  field = field.filter(function (e, i, field) {
    return field.indexOf(e, i+1) === -1;
  })
  if (field.length == 1) return field.pop();
}

function getInstances(distribution) {
  /**
   * Returns the total number of instances in a distribution
   *
   * @param {array} distribution List of classes and their instances
   */

  var count = 0;
  for (element in distribution) {
    count += distribution[element][1];
  }
  return count;
}


/**
 * Predicate
 * @constructor
 */
function Predicate(operator, field, value) {
  /**
   * A predicate to be evaluated in a tree's node.
   *
   * @param {string} operator Evaluation operator
   * @param {string} field Model's field
   * @param {string | number} value Reference value
   */

  this.operator = operator;
  this.field = field;
  this.value = value;
}

Predicate.prototype.eval = function (inputData) {
  /**
   * Evaluates the predicate for the given input data
   *
   * @param {object} inputData Input data to predict
   */

  return eval(inputData[this.field] + this.operator + this.value);
}

Predicate.prototype.toRule = function(fields) {
  /**
   * Builds the prediction rule
   *
   * @param {object} fields Model's fields
   */
  return fields[this.field]['name'] + " " + this.operator + " " + this.value;
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
  }
  else {
    this.predicate = new Predicate(
      tree.predicate.operator,
      tree.predicate.field,
      tree.predicate.value);
  }

  var children = new Array();
  if (tree.children) {
    for (child in tree.children) {
      children.push(new Tree(tree.children[child], this.fields, objectiveField));
    }
  }
  this.children = children;
  this.count = tree.count;
  this.confidence = tree.confidence;
  var summary;
  if (tree.distribution) {
    this.distribution = tree.distribution;
  }
  else if (tree['objective_summary']) {
    summary = tree['objective_summary'];
  }
  else {
    summary = this.fields[this.objectiveField]['summary'];
  }
  if (summary) {
    if (summary.bins) {
      this.distribution = summary.bins;
    }
    else if (summary.counts) {
      this.distribution = summary.counts;
    }
    else if (summary.categories) {
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
  if (!path) path = new Array();
  if (this.children && (splitField(this.children) in inputData)) {
    for (child in this.children) {
      var predicate = new Predicate(this.children[child].predicate.operator,
                                    this.children[child].predicate.field,                                    
                                    this.children[child].predicate.value);
      if (predicate.eval(inputData)) {
        path.push(predicate.toRule(this.fields));
        return this.children[child].predict(inputData, path);
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

module.exports = Tree
