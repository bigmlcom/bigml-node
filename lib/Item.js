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

var SUPPORTED_LANGUAGES = ["JSON", "CSV"];

var JSON_EXCLUDES = ["fieldInfo", "complementIndex", "index"];

/**
 * Item
 * @constructor
 */
function Item(index, itemInfo, fields) {
  /**
   * Object encapsulating an Item of association rules as described in
   * https://bigml.com/developers/associations
   *
   * @param {integer} index Item index
   * @param {object} itemInfo Object describing the Item attributes as
   *                          retrieved from BigML
   * @param {object} fields Fields structure as retrieved from BigML
   */

  this.index = index
  this.complement = itemInfo.complement || false;
  this.complementIndex = itemInfo.complement_index;
  this.count = itemInfo.count;
  this.description = itemInfo.description;
  this.fieldId = itemInfo.field_id;
  this.fieldInfo = fields[this.fieldId];
  this.name = itemInfo.name;
  this.binEnd = itemInfo.bin_end;
  this.binStart = itemInfo.bin_start;
}

Item.prototype.out = function (language) {
  /**
   * Transforms the item structure in the format defined by language
   *
   * @param {string} language Output language
   */
  if (SUPPORTED_LANGUAGES.indexOf(language)) {
    return this["to" + language];
  }
  return this;
};

Item.prototype.toCSV = function () {
  /**
   * Transforms the item structure to CSV formats
   */
  return [this.complement, this.complement_indes, this.count, this.description,
          this.fieldInfo['name'], this.name, this.binStart, this.binEnd];
};


Item.prototype.toJSON = function (excludedAttributes) {
  /**
   * Transforms the item structure to JSON formats
   * @param {array} excludedAttributes List of attributes to be excluded
   */
  var itemObj = {}, attribute;
  excludedAttributes = excludedAttributes.concat(JSON_EXCLUDES);
  for (attribute in this) {
    if (this.hasOwnProperty(attribute) &&
        excludedAttributes.indexOf(attribute) < 0) {
      itemObj[attribute] = this[attribute];
    }
  }
  return itemObj;
};

Item.prototype.toLispRule = function() {
  /**
   * Transforms the item structure to a List flatline expression
   */
  var flatline = "", fieldType, start, end, operator, caseInsensitive,
    language, options;
  if (this.name == null) {
    return "(missing? (f " + this.fieldId + "))";
  }
  fieldType = this.fieldInfo.optype;
  if (fieldType == "numeric") {
    start = self.complement ? this.binEnd: this.binStart;
    end = self.complement ? this.binStart: this.binEnd;
    if (start != null && end != null) {
      if (start < end) {
        flatline = "(and (< " + start + " (f " + this.fieldId +
                   ")) (<= (f " + this.fieldId + ") " + end + "))";
      } else {
        flatline = "(or (> (f " + this.fieldId + ") " + start +
                   ") (<= (f " + this.fieldId + ") " + end + "))";
      }
    } else if (start != null) {
      flatline = "(> (f " + this.fieldId + ") " + start + ")";
    } else {
      flatline = "(> (f " + this.fieldId + ") " + end + ")";
    }
  } else if (fieldType == "categorical") {
    operator = this.complement ? "!=" : "=";
    flatline = "(" + operator + " (f " + this.fieldId + ") " + this.name + ")";
  } else if (fieldType == "text") {
    operator = this.complement ? "=" : ">";
    options = this.fieldInfo['term_analysis'];
    if (typeof options.case_sensitive === 'undefined') {
      caseInsensitive = false;
    }
    caseInsensitive = !options['case_sensitive'];
    language = options.language;
    if (typeof language === 'undefined') {
      language = "";
    }
    flatline = "(" + operator + " (occurrences (f " + this.fieldId + ") " +
               this.name + " " + caseInsensitive + language + ") 0)";
  } else if (fieldType == 'items') {
    operator = this.complement ? "!": "";
    flatline = "(" + operator + " (contains-items? " + this.fieldId +
               " " + this.name + "))";
  }
  return flatline;
};

Item.prototype.describe = function() {
  /**
   * Human-readable description of a item structure
   */
  var description = "", fieldName, fieldType, start, end, operator;
  if (this.name == null) {
    return this.fieldInfo.name + " is " + (this.complement ? "not ": "") +
           "missing";
  }
  fieldName = this.fieldInfo.name;
  fieldType = this.fieldInfo.optype;
  if (fieldType == 'numeric') {
    start = self.complement ? this.binEnd: this.binStart;
    end = self.complement ? this.binStart: this.binEnd;
    if (start != null && end != null) {
      if (start < end) {
        description = start + "< " + fieldName + " <= " + end;
      } else {
        description = fieldName + " > " + start + " or <= " + end
      }
    } else if (start != null) {
      description = fieldName + " > " + start ;
    } else {
      description = fieldName + " < " + end;
    }
  } else if (fieldType == "categorical") {
    operator = this.complement ? "!=" : "=";
    description = [fieldName, operator, this.name].join(" ");
  } else if (["text", "items"].indexOf(fieldType) > -1) {
    operator = this.complement ? "excludes" : "includes";
    description = [fieldName, operator, this.name].join(" ");
  } else {
    description = this.name;
  }
  return description;
};


Item.prototype.matches = function(value) {
  /**
   * Checks whether the value is in a range for numeric fields or
   * matches a category for categorical fields.
   */
  var fieldType, result, options, allForms, termForms, terms;
  fieldType = this.fieldInfo.optype;
  if (value == null) {
    return this.name == null;
  }
  if (fieldType == 'numeric' &&
      (this.binEnd != null || this.binStart != null)) {
    if (this.binStart != null && this.binEnd != null) {
      result = this.binStart <= value <= this.binEnd;
    } else if (this.binEnd != null) {
      result = value <= this.binEnd;
    } else {
      result = value >= this.binStart;
    }
  } else if (fieldType == 'categorical') {
    result = this.name == value;
  } else if (fieldType == 'text') {
    // for text fields, the item.name or the related term_forms should be in
    // the considered value
    allForms = this.fieldInfo.summary.term_forms;
    if (typeof allForms === 'undefined') {
      allForms = {};
    }
    termForms = allForms[this.name];
    if (typeof termForms === 'undefined') {
      termForms = {};
    }
    terms = [this.name];
    terms.concat(termForms);
    options = this.fieldInfo['term_analysis'];
    result = utils.termMatches(value, terms, options) > 0;
  } else if (fieldType == 'items') {
    // for items fields, the item.name should be in the considered value
    // surrounded by separators or regexp
    options = this.fieldInfo['item_analysis'];
    result = utils.itemMatches(value, this.name, options) > 0;
  }
  if (this.complement) {
    result = !result;
  }
  return result;
};

if (NODEJS) {
  module.exports = Item;
} else {
  exports = Item;
}
