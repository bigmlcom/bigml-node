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

var utils = require('./utils');

var OPERATORS = {
  '=': function (a, b) { return a == b; },
  '!=': function (a, b) { return a != b; },
  '/=': function (a, b) { return a != b; },
  '<': function (a, b) { return a < b; },
  '<=': function (a, b) { return a <= b; },
  '>': function (a, b) { return a > b; },
  '>=': function (a, b) { return a >= b; }
};

function termMatches(text, terms, options) {
  /**
   * Computes term matches depending on the chosen text analysis options
   *
   * @param {string} text Input text
   * @param {array} terms String array of terms to match
   * @param {object} options Text analysis options
   */
    var modifiers = 'g';
    if (!options['case_sensitive']) {
        modifiers += 'i';
    }
    var terms = terms.join('(\\b|_)|(\\b|_)');
    var pattern = new RegExp('(\\b|_)' + terms + '(\\b|_)', modifiers);
    var matches = text.match(pattern);
    return (matches == null) ? 0 : matches.length;
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
  this.field = field;
  this.value = value;
  this.term = term;
}

Predicate.prototype.toRule = function (fields) {
  /**
   * Builds the prediction rule
   *
   * @param {object} fields Model's fields
   */

  var name = fields[this.field].name;
  var relationSuffix, relationLiteral;
  if ((typeof this.term) !== 'undefined') {
    relationSuffix = '';
    if ((this.operator == '<' && this.value <= 1) ||
        (this.operator == '<=' && this.value == 0)) {
      relationLiteral = 'does not contain';
    }
    else {
      relationLiteral = 'contains';
      if (this.operator == '<=') {
        relationSuffix = 'no more than ' + this.value + ' ' +
        utils.plural('time', this.value);
      }
      else if (this.operator == '>=') {
        relationSuffix = this.value + ' ' + utils.plural('time', this.value) +
                          ' at most';
      }
      else if (this.operator == '>' && this.value != 0) {
        relationSuffix = 'more than ' + this.value + ' ' +
                          utils.plural('time', this.value);
      }
      else if (this.operator == '<') {
        relationSuffix = 'less than ' + this.value + ' ' +
                          utils.plural('time', this.value);
      }
    }
    return name + ' ' + relationLiteral + ' ' + this.term + ' ' +
           relationSuffix;
  }
  return fields[this.field].name + ' ' + this.operator + ' ' + this.value;
};

Predicate.prototype.evaluate = function (inputData, fields) {
  /**
   * Evaluates the predicate for the given input data
   *
   * @param {object} inputData Input data to predict
   */
  var terms, allForms, termForms, options, inputInfo;
  if ((typeof this.term) !== 'undefined') {
    terms = [this.term];
    allForms = fields[this.field].summary.term_forms;
    if ((typeof allForms) !== 'undefined') {
      termForms = allForms[this.term];
      if ((typeof termForms) !== 'undefined') {
        terms = terms.concat(termForms);
      } 
    }
    options = fields[this.field]['term_analysis'];
    inputInfo = termMatches(inputData[this.field], terms, options);
    return OPERATORS[this.operator](inputInfo, this.value);
  }
  return OPERATORS[this.operator](inputData[this.field], this.value);
};

module.exports = Predicate;
