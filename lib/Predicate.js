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

var OPERATORS = {
  '=': function (a, b) { return a == b; },
  '!=': function (a, b) { return a != b; },
  '/=': function (a, b) { return a != b; },
  '<': function (a, b) { return a < b; },
  '<=': function (a, b) { return a <= b; },
  '>': function (a, b) { return a > b; },
  '>=': function (a, b) { return a >= b; }
};

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

Predicate.prototype.toRule = function (fields) {
  /**
   * Builds the prediction rule
   *
   * @param {object} fields Model's fields
   */
  return fields[this.field].name + " " + this.operator + " " + this.value;
};

Predicate.prototype.evaluate = function (inputData) {
  /**
   * Evaluates the predicate for the given input data
   *
   * @param {object} inputData Input data to predict
   */

  return OPERATORS[this.operator](inputData[this.field], this.value);
};


module.exports = Predicate;
