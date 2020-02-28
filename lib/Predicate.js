/**
 * Copyright 2013-2020 BigML
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

var OPERATORS = {
  '=': function (a, b) { return a == b; },
  '!=': function (a, b) { return a != b; },
  '/=': function (a, b) { return a != b; },
  '<': function (a, b) { return a < b; },
  '<=': function (a, b) { return a <= b; },
  '>': function (a, b) { return a > b; },
  '>=': function (a, b) { return a >= b; },
  'in': function (a, b) { return b.indexOf(a) > -1; }
};


/**
 * Predicate
 * @constructor
 */
function Predicate(operator, field, value, term) {
  /**
   * A predicate to be evaluated in a tree's node.
   *
   * @param {string} operator Evaluation operator
   * @param {string} field Model's field
   * @param {string | number} value Reference value
   * @param {string} term Text analysis term
   */

  this.operator = operator;
  this.missing = false;
  if (this.operator.slice(-1) == '*') {
    this.operator = this.operator.substring(0, this.operator.length - 1);
    this.missing = true;
  }
  this.field = field;
  this.value = value;
  this.term = term;
}

Predicate.prototype.isFullTerm = function (fields) {
  /**
   * Returns a boolean showing if a term is considered as a full_term
   *
   * @param {object} fields Model's fields
   */
  if ((typeof this.term) !== 'undefined') {
    if (fields[this.field].optype == 'items') {
      return false;
    }
    var options = fields[this.field]['term_analysis'],
      tokenMode = options['token_mode'];
    if (tokenMode === constants.TM_FULL_TERM) {
      return true;
    }
    if (tokenMode === constants.TM_ALL) {
      return this.term.match(constants.FULL_TERM_PATTERN);
    }
  }
  return false;
};

Predicate.prototype.toRule = function (fields) {
  /**
   * Builds the prediction rule
   *
   * @param {object} fields Model's fields
   */

  var name = fields[this.field].name,
    fullTerm = this.isFullTerm(fields),
    relationSuffix,
    relationMissing,
    relationLiteral;
  // no missing operators for text fields
  if ((typeof this.term) !== 'undefined') {
    relationSuffix = '';
    if ((this.operator == '<' && this.value <= 1) ||
        (this.operator == '<=' && this.value == 0)) {
      relationLiteral = (fullTerm) ? 'is not equal to' : 'does not contain';
    } else {
      relationLiteral = (fullTerm) ? 'is equal to' : 'contains';
      if (this.operator == '<=') {
        relationSuffix = 'no more than ' + this.value + ' ' +
                         utils.plural('time', this.value);
      } else if (this.operator == '>=') {
        relationSuffix = this.value + ' ' + utils.plural('time', this.value) +
                         ' at most';
      } else if (this.operator == '>' && this.value != 0) {
        relationSuffix = 'more than ' + this.value + ' ' +
                          utils.plural('time', this.value);
      } else if (this.operator == '<') {
        relationSuffix = 'less than ' + this.value + ' ' +
                          utils.plural('time', this.value);
      }
    }
    return name + ' ' + relationLiteral + ' ' + this.term + ' ' +
           relationSuffix;
  }
  relationMissing = (this.missing) ? " or missing" : ""
  return (fields[this.field].name + ' ' + this.operator + ' ' + this.value +
          relationMissing);
};

Predicate.prototype.evaluate = function (inputData, fields) {
  /**
   * Evaluates the predicate for the given input data
   *
   * @param {object} inputData Input data to predict
   */
  var terms, allForms, termForms, options, inputInfo,
    tmpInputData = JSON.parse(JSON.stringify(inputData));
  // for missing operators
  if (!tmpInputData.hasOwnProperty(this.field) ||
      (typeof tmpInputData[this.field]) === 'undefined') {
    // missings in text and items fields are considered as ""
    if (typeof this.term === 'undefined') {
      return (this.missing || (this.operator == '=' && this.value == null));
    } else {
      tmpInputData[this.field] = "";
    }
  } else if (this.operator == '!=' && this.value == null) {
    return true;
  }

  if ((typeof this.term) !== 'undefined') {
    if (fields[this.field].optype == 'text') {
      terms = [this.term];
      allForms = fields[this.field].summary.term_forms;
      if ((typeof allForms) !== 'undefined') {
        termForms = allForms[this.term];
        if ((typeof termForms) !== 'undefined') {
          terms = terms.concat(termForms);
        }
      }
      options = fields[this.field]['term_analysis'];
      inputInfo = utils.termMatches(tmpInputData[this.field], terms, options);
    } else {
      // new items optype
      options = fields[this.field]['item_analysis'];
      inputInfo = utils.itemMatches(tmpInputData[this.field], this.term,
                                    options);
    }
    return OPERATORS[this.operator](inputInfo, this.value);
  }

  return OPERATORS[this.operator](tmpInputData[this.field], this.value);
};

Predicate.prototype.toJSON = function () {
  /**
   * Returns the object representing the predicate
   *
   */

   var toJSON = {
    operator: (this.missing) ? "*" + this.operator : this.operator,
    field: this.field,
    value: this.value
  }
  if (this.missing) {
    toJSON.operator = "*" + toJSON.operator}
  if (this.term) {
    toJSON.term = this.term;
  }
  return toJSON;
};

if (NODEJS) {
  module.exports = Predicate;
} else {
  exports = Predicate;
}
