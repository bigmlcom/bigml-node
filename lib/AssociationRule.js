/**
 * Copyright 2016-2020 BigML
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

var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');

// End of imports section --- DO NOT REMOVE

var SUPPORTED_LANGUAGES = ["JSON", "CSV"]


/**
 * AssociationRule
 * @constructor
 */
function AssociationRule(rule) {
  /**
   * Object encapsulating an association rule as described in
   * https://bigml.com/developers/associations
   *
   * @param {object} rule Rule object
   */

  this.ruleId = rule.id;
  this.confidence = rule.confidence;
  this.leverage = rule.leverage;
  this.lhs = rule.lhs;
  if (rule.lhs_cover == null) {
    rule.lhs_cover = [null, null];
  }
  this.lhsCover = rule.lhs_cover;
  this.pValue = rule.p_value;
  this.rhs = rule.rhs;
  if (rule.rhs_cover == null) {
    rule.rhs_cover = [null, null];
  }
  this.rhsCover = rule.rhs_cover;
  this.lift = rule.lift;
  if (rule.support == null) {
    rule.support = [null, null];
  }
  this.support = rule.support;
}

AssociationRule.prototype.out = function (language) {
  /**
   * Transforms the rule structure in the format defined by language
   *
   * @param {string} language Output language
   */
  if (SUPPORTED_LANGUAGES.indexOf(language)) {
    return this["to" + language];
  }
  return this;
};

AssociationRule.prototype.toCSV = function () {
  /**
   * Transform the rule to CSV formats
   */


  return [this.ruleId, this.lhs, this.rhs, this.lhsCover[0],
          this.lhsCover[1], this.support[0], this.support[1],
          this.confidence, this.leverage, this.lift, this.pValue,
          this.rhsCover[0], this.rhsCover[1]];
};

AssociationRule.prototype.toJSON = function () {
  /**
   * Transform the rule to JSON formats
   */
  return this.stringify();
};

AssociationRule.prototype.toLispRule = function (itemsList) {
  /**
   * Transform the rule to LISP flatline filter to select the rows in the
   * dataset that fulfill the rule
   *
   */

  var items = [], index, flatline;
  for (index = 0; index < itemsList.length; index++) {
    items.push(itemsList[index].toLispRule());
  }
  return "(and " + items.join("") + ")"
};

if (NODEJS) {
  module.exports = AssociationRule;
} else {
  exports = AssociationRule;
}
