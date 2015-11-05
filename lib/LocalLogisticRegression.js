/**
 * Copyright 2015 BigML
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

var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');

if (NODEJS) {
  var util = require('util');
  var fs = require('fs');
  var events = require('events');
  var LogisticRegression = require('./LogisticRegression');
}

var OPTIONAL_FIELDS = ['categorical', 'text'],
  EXPANSION_ATTRIBUTES = {categorical: "categories", text: "tag_cloud"};



function parseTerms(text, caseSensitive) {
  /**
   * Parses the text into words
   *
   * @param {string} text Text to be parsed
   * @param {boolean} caseSensitive transform if caseSensitive = false
   */
  var expression, pattern, i, len, matches, matchesLen;
  if ((typeof text) === 'undefined' || text == null) {
    return [];
  }
  pattern = new RegExp('(\\b|_)([^\\b_\\s]+?)(\\b|_)', 'g');
  matches = text.match(pattern);
  if (matches == null) {
    return [];
  }
  matchesLen = matches.length;
  if (!caseSensitive) {
    for (i = 0; i < matchesLen; i++) {
      matches[i] = matches[i].toLowerCase();
    }
  }
  return matches;
}


function getUniqueTerms(terms, termForms, tagCloud) {
  /**
   * Extracts the unique terms that occur in one of the alternative forms in
   * term_forms or in the tag cloud.
   *
   * @param {array} terms Terms parsed
   * @param {object} termForms Alternative forms after stemming
   * @param {array} tagCloud List of considered terms
   */
  var extendForms = {}, term, termForm, termsSet = {}, i,
    termFormsLength, termsLength = terms.length,
    tagCloudLength = tagCloud.length;
  for (term in termForms) {
    if (termForms.hasOwnProperty(term)) {
      termFormsLength = termForms[term].length;
      for (i = 0; i < termFormsLength; i++) {
        termForm = termForms[term][i];
        extendForms[termForm] = term;
      }
      extendForms[termForm] = term;
    }
  }

  for (i = 0; i < termsLength; i++) {
    term = terms[i];
    if (tagCloud.indexOf(term) > -1) {
      if (!termsSet.hasOwnProperty(term)) {
        termsSet[term] = 0;
      }
      termsSet[term] += 1;
    } else if (extendForms.hasOwnProperty(term)) {
      term = extendForms[term];
      if (!termsSet.hasOwnProperty(term)) {
        termsSet[term] = 0;
      }
      termsSet[term] += 1;
    }
  }
  return termsSet;
}


/**
 * LocalLogisticRegression: Simplified local object for the logistic regression
 * resource.
 * @constructor
 */
function LocalLogisticRegression(resource, connection) {
  /**
   * Constructor for the LocalLogisticRegression local object.
   *
   * @param {string|object} resource BigML logistic regression resource,
   *                        resource id or
   *                        the path to a JSON file containing a BigML model
   *                        resource
   * @param {object} connection BigML connection
   */

  var model, self, fillStructure, objectiveField, logisticRegression;

  this.fields = undefined;
  this.invertedFields = undefined;
  this.objectiveField = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;
  this.resourceId = undefined;
  this.termForms = {};
  this.tagClouds = {};
  this.termAnalysis = {};
  this.categories = {};
  this.coefficients = {};
  this.dataFieldTypes = {};
  this.bias = undefined;
  this.missingCoefficients = true;
  this.c = undefined;
  this.eps = undefined;
  this.lrNormalize = undefined;
  this.regularization = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource LogisticRegression's resource info
     */
    var status, fields, field, fieldInfo, index, logisticRegressionInfo,
      mapInfo, len, objectiveField, category, coefficients;
    if (error) {
      throw new Error('Cannot create the LogisticRegression instance.' +
                      ' Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.resourceId = utils.getResource(resource);
    if ((typeof self.resourceId) === 'undefined') {
      throw new Error('Cannot build a LogisticRegression from this' +
                      ' resource: ' + resource);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }

    if ((typeof resource["dataset_field_types"] !== ' undefined') &&
        (typeof resource["objective_fields"] !== ' undefined')) {
      self.datasetFieldTypes = resource["dataset_field_types"]
      self.objectiveField = resource['objective_fields']
    } else {
      throw new Error("Failed to find the logistic regression expected " +
                      "JSON structure. Check your arguments.");
    }
    if ((typeof resource['logistic_regression']) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        logisticRegressionInfo = resource['logistic_regression'];
        if ((typeof logisticRegressionInfo.fields) !== 'undefined') {
          fields = logisticRegressionInfo.fields;
          for (field in fields) {
            if (fields.hasOwnProperty(field)) {
              fieldInfo = logisticRegressionInfo.fields[field];
              fields[field].summary = fieldInfo.summary;
              fields[field].name = fieldInfo.name;
              if (fieldInfo.optype == 'text') {
                self.termForms[field] = fieldInfo.summary['term_forms'];
                self.tagClouds[field] = [];
                mapInfo = fieldInfo.summary['tag_cloud'];
                len = mapInfo.length;
                for (index = 0; index < len; index++) {
                  self.tagClouds[field].push(mapInfo[index][0]);
                }
                self.termAnalysis[field] = fieldInfo['term_analysis'];
              } else if (fieldInfo.optype == 'categorical') {
                self.categories[field] = [];
                mapInfo = fieldInfo.summary.categories;
                len = mapInfo.length;
                for (index = 0; index < len; index++) {
                  self.categories[field].push(mapInfo[index][0]);
                }
              }
            }
          }
        } else {
          fields = logisticRegressionInfo.fields;
        }
        len = logisticRegressionInfo.coefficients.length;
        for (var index = 0; index < len; index++) {
          category = logisticRegressionInfo.coefficients[index][0];
          coefficients = logisticRegressionInfo.coefficients[index][1];
          self.coefficients[category] = coefficients;
        }
        self.bias = logisticRegressionInfo.bias;
        self.c = logisticRegressionInfo.c;
        self.eps = logisticRegressionInfo.eps;
        self.lr_normalize = logisticRegressionInfo.normalize;
        self.regularization = logisticRegressionInfo.regularization;

        if (self.objectiveField && (typeof self.objectiveField) === 'array') {
          self.objectiveField = self.objectiveField[0];
        }
        self.fields = fields;
        self.mapCoefficients();
        self.invertedFields = utils.invertObject(fields);
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the LogisticRegression instance.' +
                      ' Could not' +
                      ' find the \'logistic_regression\' key in the' +
                      ' resource\n');
    }
  };

  // Loads the model from the model id or from an unfinished object
  if (NODEJS && ((typeof resource) === 'string' ||
      utils.getStatus(resource).code !== constants.FINISHED)) {
    try {
      self.resourceId = utils.getResource(resource);
    } catch (err) {
      self.resourceId = undefined;
    }
    if ((typeof self.resourceId) === 'undefined') {
      // try to read a json file in the path provided by the first argument
      try {
        fs.readFile(resource, 'utf8', function (err, data) {
          if (err) {
            throw new Error('Failed to read local logistic regression file: ' +
                            resource);
          }
          try {
            resource = JSON.parse(data);
            fillStructure(null, resource);
          } catch (jsonErr) {
            throw new Error('Failed to parse the JSON logistic regression' +
                            ' in: ' + resource);
          }
        });
      } catch (errf) {
        // if no file is read, throw error reading file
        throw new Error('Cannot build a LogisticRegression from this ' +
                        'resource: ' +
                        resource);
      }
    } else {
      // if a resource id has been found, then load the logistic regression
      logisticRegression = new LogisticRegression(connection);
      logisticRegression.get(this.resourceId.resource, true,
                             constants.ONLY_MODEL, fillStructure);
    }
  } else {
  // loads when the entire resource is given
    fillStructure(null, resource);
  }
  if (NODEJS) {
    events.EventEmitter.call(this);
  }
}

if (NODEJS) {
  util.inherits(LocalLogisticRegression, events.EventEmitter);
}

LocalLogisticRegression.prototype.predict = function (inputData, cb) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, prediction, self = this;

  function createLocalPrediction(error, data) {
    /**
     * Creates a local prediction using the model's tree info.
     *
     * @param {object} error Error message
     * @param {object} data Input data to predict from
     */
    if (error) {
      return cb(error, null);
    }
    prediction = self.logisticPredict(data);
    return cb(null, prediction);
  }
  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, createLocalPrediction);
    } else {
      prediction = this.logisticPredict(this.validateInput(inputData));
      return prediction;
    }
  } else {
    this.on('ready', function (self) {
      return self.predict(inputData, cb);
    });
    return;
  }
};


LocalLogisticRegression.prototype.logisticPredict = function (inputData) {
  /**
   * Computes the prediction based on the coefficients of the logistic
   * regression.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   */
   // Compute text and categorical field expansion
  var uniqueTerms, probabilities = [], total = 0, index = 0, len, probability,
    category, coefficients;
  uniqueTerms = this.getUniqueTerms(inputData);

  len = this.categories[this.objectiveField].length;
  for (index = 0; index < len; index++) {
    category = this.categories[this.objectiveField][index];
    coefficients = this.coefficients[category];
    probability = this.categoryProbability(
      inputData, uniqueTerms, coefficients);
    probabilities[index] = {"category": category, "probability": probability};
    total += probability;
  }
  for (index = 0; index < len; index++) {
    category = this.categories[this.objectiveField][index];
    probabilities[index].probability /= total;
  }
  probabilities.sort(function(a, b) {
      a = a.probability;
      b = b.probability;
      return a > b ? -1 : (a < b ? 1 : 0);
  });
  return {
    prediction: probabilities[0].category,
    probability: probabilities[0].probability,
    distribution: probabilities}

};

LocalLogisticRegression.prototype.mapCoefficients = function () {
  /**
   * Maps each field to the corresponding coefficients subarray
   *
   */
  var fieldIds = [], shift = 0, index = 0, len = 0, optype, fieldId, length;
  // field IDs sorted by column number
  for (fieldId in this.fields) {
    if (this.fields.hasOwnProperty(fieldId) &&
        this.objectiveField != fieldId) {
      fieldIds.push([fieldId, this.fields[fieldId].column_number]);
    }
  }
  fieldIds.sort(function(a,b) {
    a = a[1];
    b = b[1];
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  len = fieldIds.length;
  for (index = 0; index < len; index++) {
    fieldId = fieldIds[index][0];
    optype = this.fields[fieldId].optype;
    if (EXPANSION_ATTRIBUTES.hasOwnProperty(optype)) {
      // text and categorical fields have one coefficient per
      // text/class plus a missing terms coefficient plus a bias
      // coefficient
      length =
        this.fields[fieldId].summary[EXPANSION_ATTRIBUTES[optype]].length;
      if (this.missingCoefficients) {
        length += 1;
      }
    } else {
      // numeric fields have one coefficient
      length = 1;
    }
    this.fields[fieldId].coefficientsShift = shift;
    shift += length;
  }
};

LocalLogisticRegression.prototype.categoryProbability = function (
  inputData, uniqueTerms, coefficients) {
  /**
   * Computes the probability for a concrete category
   *
   * @param {object} inputData Input data to predict
   * @param {object} uniqueTerms Frequency of the terms once stemmed
   * @param {array} coefficients List of coefficients
   */
  var probability = 0, shift, occurrences, fieldId, term, index;
  for (fieldId in inputData) {
    if (inputData.hasOwnProperty(fieldId)) {
      shift = this.fields[fieldId].coefficientsShift;
      probability += coefficients[shift] * inputData[fieldId];
    }
  }

  for (fieldId in uniqueTerms) {
    shift = this.fields[fieldId]. coefficientsShift;
    for (term in uniqueTerms[fieldId]) {
      if (uniqueTerms[fieldId].hasOwnProperty(term)) {
        occurrences = uniqueTerms[fieldId][term];
        if (this.tagClouds.hasOwnProperty(fieldId)) {
          index = this.tagClouds[fieldId].indexOf(term);
        } else if (this.categories[fieldId].hasOwnProperty(fieldId)) {
          index = this.categories[fieldId].indexOf(term);
        }
        probability += coefficients[shift + index] * occurrences;
      }
    }
  }
  // missing coefficients
  if (this.missingCoefficients) {
    for (fieldId in this.tagClouds) {
      shift = this.fields[fieldId].coefficientsShift;
      if (!uniqueTerms.hasOwnProperty(fieldId) ||
          Object.keys(uniqueTerms[fieldId]).length == 0) {
        probability += coefficients[shift + this.tagClouds[fieldId].length];
      }
    }
    for (fieldId in this.categories) {
      shift = this.fields[fieldId].coefficientsShift;
      if (fieldId != this.objectiveField &&
          !uniqueTerms.hasOwnProperty(fieldId)) {
        probability += coefficients[shift + this.categories[fieldId].length];
      }
    }
  }
  // bias coefficient
  probability += coefficients[coefficients.length-1];
  return 1 / (1 + Math.exp(-probability));
};

LocalLogisticRegression.prototype.getUniqueTerms = function (inputData) {
  /**
   * Parses the input data to find the list of unique terms in the
   * tag cloud.
   *
   * @param {object} inputData Input data to predict
   */

  var uniqueTerms = {}, caseSensitive = true, inputDataField,
    tokenMode = 'all', terms = [], fieldId;
  for (fieldId in this.termForms) {
    if (this.termForms.hasOwnProperty(fieldId) &&
        inputData.hasOwnProperty(fieldId)) {
      inputDataField = inputData[fieldId];
      caseSensitive = this.termAnalysis[fieldId]['case_sensitive'];
      tokenMode = this.termAnalysis[fieldId]['token_mode'];
      if (tokenMode != constants.TM_FULL_TERM) {
        terms = parseTerms(inputDataField, caseSensitive);
      }
      if (tokenMode != constants.TOKENS) {
        terms.push(caseSensitive ? inputDataField :
                   inputDataField.toLowerCase())
      }
      uniqueTerms[fieldId] = getUniqueTerms(terms, this.termForms[fieldId],
                                            this.tagClouds[fieldId]);
      delete inputData[fieldId];
    }
  }

  for (fieldId in this.categories) {
    if (this.categories.hasOwnProperty(fieldId) &&
        inputData.hasOwnProperty(fieldId)) {
      inputDataField = inputData[fieldId];
      uniqueTerms[fieldId] = {inputDataField: 1};
      delete inputData[fieldId];
    }
  }
  return uniqueTerms;
};


LocalLogisticRegression.prototype.validateInput = function (inputData, cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id. Also, numeric
   * fields are non-optional.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, inputDataKey, fieldId;
  if (this.ready) {
    for (fieldId in this.fields) {
      if (this.fields.hasOwnProperty(fieldId)) {
        field = this.fields[fieldId];
        if (field.optype !== "categorical" && field.optype !== "text" &&
            !inputData.hasOwnProperty(fieldId) &&
            !inputData.hasOwnProperty(field.name)) {
          throw new Error("The input data lacks some numeric fields values." +
                          " To predict, input data must " +
                          "contain all numeric fields values.");
        }
      }
    }

    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        if (inputData[field] === null ||
            (typeof this.fields[field] === 'undefined' &&
             typeof this.invertedFields[field] === 'undefined')) {
          delete inputData[field];
        } else {
          // input data keyed by field id
          if (typeof this.fields[field] !== 'undefined') {
            inputDataKey = field;
          } else { // input data keyed by field name
            inputDataKey = String(this.invertedFields[field]);
          }
          newInputData[inputDataKey] = inputData[field];
        }
      }
    }
    try {
      inputData = utils.cast(newInputData, this.fields);
    } catch (err) {
      if (cb) {
        return cb(err, null);
      }
      throw err;
    }
    if (cb) {
      return cb(null, inputData);
    }
    return inputData;
  }
  this.on('ready', function (self) {
    return self.validateInput(inputData, cb);
  });
  return;
};

if (NODEJS) {
  module.exports = LocalLogisticRegression;
} else {
  exports = LocalLogisticRegression;
}
