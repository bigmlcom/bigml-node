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

var Predicate = require(PATH + 'Predicate');


// End of imports section --- DO NOT REMOVE

/**
 * Predicates
 * @constructor
 */
function Predicates(predicatesList) {
  /**
   * A list of predicates to be evaluated in an anomaly tree's node.
   *
   * @param {array} predicatesList List of Predicate objects
   */
  var index = 0, len = predicatesList.length, predicate;

  this.predicates = [];
  for (index = 0; index < len; index++) {
    predicate = predicatesList[index];
    if (predicate === true) {
      this.predicates.push(true);
    } else {
      this.predicates.push(
        new Predicate(predicate.op,
                      predicate.field,
                      predicate.value,
                      predicate.term));
    }
  }
}

Predicates.prototype.toRule = function (fields) {
  /**
   * Builds rule string from a predicates list
   *
   * @param {object} fields Model's fields
   */

  var rules = "", index = 0, len = this.predicates.length, predicate;
  for (index = 0; index < len; index++) {
    predicate = this.predicates[index];
    if (predicate !== true) {
      if (rules !== "") {
        rules += " and ";
      }
      rules += predicate.toRule(fields);
    }
  }
  return rules;
};

Predicates.prototype.evaluate = function (inputData, fields) {
  /**
   * Evaluates the predicates for the given input data
   *
   * @param {object} inputData Input data to predict
   * @param {object} fields Model's fields
   */

  var evaluation, index = 0, len = this.predicates.length, predicate;
  for (index = 0; index < len; index++) {
    predicate = this.predicates[index];
    if (predicate !== true) {
      if (!predicate.evaluate(inputData, fields)) {
        return false;
      }
    }
  }
  return true;
};

if (NODEJS) {
  module.exports = Predicates;
} else {
  exports = Predicates;
}
