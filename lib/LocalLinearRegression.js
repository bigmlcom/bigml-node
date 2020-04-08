/**
 * Copyright 2019-2020 BigML
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
var jStat = require('jstat');


if (NODEJS) {
  var util = require('util');
  var path = require('path');
  var fs = require('fs');
  var events = require('events');
  var LinearRegression = require('./LinearRegression');
  var BigML = require('./BigML');
}

// End of imports section --- DO NOT REMOVE

var OPTIONAL_FIELDS = ['categorical', 'text', 'items'],
  EXPANSION_ATTRIBUTES = {categorical: "categories",
                          text: "tagClouds", items: 'items'},
  DUMMY = "dummy", CONTRAST = "contrast", OTHER = "other",
  CATEGORICAL = 'categorical',
  ALPHA_FACTOR = 0.975; // alpha = 0.05



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


function getTermsArray(terms, uniqueTerms, field, fieldId) {
  /**
   * Returns an array that represents the frequency of terms as ordered
   * in the reference `terms` parameter.
   * @param {list} terms Reference of terms in the field
   * @param {map} uniqueTerms Map with the input data terms per field ID
   * @param {map} field Field information
   * @param {string} fieldId Field ID
   */
  var inputTerms, pos, termsArray, term, frequency, len, index;
    inputTerms = uniqueTerms[fieldId] || {};
    termsArray = new Array(terms.length).fill(0);

    try {
      len = terms.length;
      for (index = 0; index < len; index++) {
        term = terms[index];
        frequency = inputTerms[term] || 0;
        termsArray[index] = frequency;
      }
    } catch (e) {console.log(e);};

    return termsArray;
}


function flatten(innerArray) {
  /**
   * Checks whether some input fields are missing in the input data
   * while not training data has no missings in that field
   *
   * @param {array} innerArray Array with inner arrays
   */

  var element, newArray = [], index, len;
  for (index = 0, len = innerArray.length; index < len; index++) {
    element = innerArray[index];
    if (utils.isArray(element)) {
      newArray = newArray.concat(element);
    } else {
      newArray.push(element);
    }
  }
  return newArray;
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
 * LocalLinearRegression: Simplified local object for the linear regression
 * resource.
 * @constructor
 */
function LocalLinearRegression(resource, connection) {
  /**
   * Constructor for the LocalLinearcRegression local object.
   *
   * @param {string|object} resource BigML linear regression resource,
   *                        resource id or
   *                        the path to a JSON file containing a BigML model
   *                        resource
   * @param {object} connection BigML connection
   */

  var self, fillStructure, objectiveField, linearRegression, filename;

  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new LinearRegression(this.connection);
  this.resType = "linearregression";
  this.fields = undefined;
  this.inputFields = undefined;
  this.invertedFields = undefined;
  this.objectiveField = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;
  this.resourceId = undefined;
  this.termForms = {};
  this.tagClouds = {};
  this.termAnalysis = {};
  this.items = {};
  this.itemAnalysis = {};
  this.categories = {};
  this.coefficients = {};
  this.dataFieldTypes = {};
  this.fieldCodings = {};
  this.bias = undefined;
  this.xtxInverse = undefined;
  this.meanSquaredError = undefined;
  this.numberOfParameters = undefined;
  this.numberOfSamples = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource LinearRegression's resource info
     */
    var status, fields, field, fieldInfo, index, linearRegressionInfo,
      mapInfo, len, objectiveField, category, coefficients, fieldIds = [],
      fieldId, realId, key, contributions, oldCoefficients = false,
      distribution, index1, stats;

    if (error) {
      throw new Error('Cannot create the LinearcRegression instance.' +
                      ' Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.resourceId = utils.getResource(resource);
    if ((typeof self.resourceId) === 'undefined') {
      throw new Error('Cannot build a LinearRegression from this' +
                      ' resource: ' + resource);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }

    if ((typeof resource["input_fields"]) !== 'undefined') {
      self.inputFields = resource["input_fields"];
    }
    if ((typeof resource["dataset_field_types"] !== ' undefined') &&
        (typeof resource["objective_fields"] !== ' undefined')) {
      self.datasetFieldTypes = resource["dataset_field_types"]
      self.objectiveField = resource['objective_fields']
    } else {
      throw new Error("Failed to find the linear regression expected " +
                      "JSON structure. Check your arguments.");
    }
    if (typeof resource["weight_field"] !== 'undefined') {
      self.weightField = resource["weight_field"];
    }
    if ((typeof resource['linear_regression']) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        linearRegressionInfo = resource['linear_regression'];
        if ((typeof linearRegressionInfo.fields) !== 'undefined') {
          fields = linearRegressionInfo.fields;
          if (typeof self.inputFields === 'undefined') {
            self.inputFields = [];
            for (fieldId in self.fields) {
              if (self.fields.hasOwnProperty(fieldId) &&
                  self.objectiveField != fieldId) {
                fieldIds.push([fieldId, self.fields[fieldId].column_number]);
              }
            }
            fieldIds.sort(function(a,b) {
              a = a[1];
              b = b[1];
              return a < b ? -1 : (a > b ? 1 : 0);
            });
            for (index = 0; index < fieldIds.length; index++) {
              self.inputFields.push(fieldIds[index]);
            }
          }
          self.coeffIds = JSON.parse(JSON.stringify(self.inputFields));
          for (field in fields) {
            if (fields.hasOwnProperty(field)) {
              fieldInfo = linearRegressionInfo.fields[field];
              fields[field].summary = fieldInfo.summary;
              fields[field].name = fieldInfo.name;
              if (fieldInfo.optype == 'datetime') {
                index1 = self.inputFields.indexOf(field);
                if (index1 > -1) {
                  self.coeffIds.splice(index1, 1);
                }
              } else if (fieldInfo.optype == 'text') {
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
              } else if (fieldInfo.optype == 'items') {
                self.items[field] = [];
                mapInfo = fieldInfo.summary.items;
                len = mapInfo.length;
                for (index = 0; index < len; index++) {
                  self.items[field].push(mapInfo[index][0]);
                }
                self.itemAnalysis[field] = fieldInfo['item_analysis'];
              }
            }
          }
        } else {
          fields = linearRegressionInfo.fields;
        }
        self.coefficients = linearRegressionInfo.coefficients;
        self.bias = linearRegressionInfo.bias;
        self.fields = fields;
        self.invertedFields = utils.invertObject(fields);
        self.fieldCodings = linearRegressionInfo['field_codings'];
        self.numberOfParameters = linearRegressionInfo["number_of_parameters"];
        if (typeof self.fieldCodings === 'undefined') {
          self.fieldCodings = {};
        }
        if (self.fieldCodings.constructor === Array) {
          self.formatFieldCodings();
        }
        if (self.objectiveField && (typeof self.objectiveField) === 'array') {
          self.objectiveField = self.objectiveField[0];
        }
        distribution = self.fields[self.objectiveField].summary.categories;
        for (fieldId in self.fieldCodings) {
          if (self.fieldCodings.hasOwnProperty(fieldId) &&
              fieldId in self.invertedFields) {
            realId = self.invertedFields[fieldId];
            self.fieldCodings[realId] = self.fieldCodings[fieldId];
            delete self.fieldCodings[fieldId];
          }
        }
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;

        stats = linearRegressionInfo.stats;

        if (typeof stats !== 'undefined' &&
            typeof stats["xtx_inverse"] !== 'undefined' &&
            stats["xtx_inverse"] != null) {
          self.xtxInverse = JSON.parse(JSON.stringify(stats["xtx_inverse"]));
          self.meanSquaredError = stats["mean_squared_error"];
          self.numberOfSamples = stats["number_of_samples"];

          // to be used in predictions
          self.tDist = jStat.studentt(self.numberOfSamples -
                                      self.numberOfParameters);
          // alpha 0.05
          self.tCrit = self.tDist.inv(ALPHA_FACTOR);
        }

        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the LinearRegression instance.' +
                      ' Could not' +
                      ' find the \'linear_regression\' key in the' +
                      ' resource\n');
    }
  };


  // Loads the model from:
  // - the path to a local JSON file
  // - a local file system directory or a cache provided as connection storage
  // - the BigML remote platform
  // - the full JSON information

  if (NODEJS && ((typeof resource) === 'string' ||
      utils.getStatus(resource).code !== constants.FINISHED)) {
    // Retrieving the model info from local repo, cache manager or bigml
    utils.getResourceInfo(self, resource, fillStructure);
  } else {
    // loads when the entire resource is given
    fillStructure(null, resource);
  }
  if (NODEJS) {
    events.EventEmitter.call(this);
  }
}

if (NODEJS) {
  util.inherits(LocalLinearRegression, events.EventEmitter);
}

LocalLinearRegression.prototype.predict = function (inputData,
                                                    addUnusedFields,
                                                    cb) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {boolean} addUnusedFields Whether to add information about fields
   *                                  in input data not used in the model
   * @param {object} operatingPoint Operating point to be used in predictions
   * @param {function} cb Callback
   */
  var newInputData = {}, field, prediction, validatedInput, self = this;

  // backward compatibility for previous code with no addUnusedFields argument
  if (typeof addUnusedFields === "function") {
    cb = addUnusedFields;
    addUnusedFields = false;
  }

  function createLocalPrediction(error, data) {
    /**
     * Creates a local prediction using the model's tree info.
     *
     * @param {object} error Error message
     * @param {object} data Input data to predict from. If the addUnusedFields
     *                      flag is set, it also includes the fields in
     *                      inputData that were not used in the model
     */

    if (error) {
      return cb(error, null);
    }
    prediction = self.linearPredict(data.inputData);
    if (addUnusedFields) {
      prediction.unusedFields = data.unusedFields;
    }
    return cb(null, prediction);
  }

  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, addUnusedFields, createLocalPrediction);
    } else {
      validatedInput = this.validateInput(inputData, addUnusedFields);
      prediction = this.linearPredict(validatedInput.inputData);
      if (addUnusedFields) {
        prediction.unusedFields = validatedInput.unusedFields;
      }
      return prediction;
    }
  } else {
    this.on('ready', function (self) {
      return self.predict(inputData, addUnusedFields, cb);
    });
    return;
  }
};

LocalLinearRegression.prototype.linearPredict = function (inputData) {
  /**
   * Computes the prediction based on the coefficients of the linear
   * regression.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   */
   // Compute text and categorical field expansion
  var uniqueTerms, index, inputInfo, inputArray, prediction, compactInputArray;

  utils.checkNoTrainingMissings(inputData, this.fields, this.weightField,
                                this.objectiveField)

  uniqueTerms = this.getUniqueTerms(inputData);

  index = 0;
  inputArray = this.expandInput(inputData, uniqueTerms, false);
  compactInputArray = this.expandInput(inputData, uniqueTerms, true);
  prediction = {prediction: utils.dot(flatten(this.coefficients), inputArray)};
  if (typeof this.xtxInverse !== 'undefined') {
    prediction.confidenceBounds = this.confidenceBounds(compactInputArray);
  } else {
    prediction.confidenceBounds = {confidenceInterval: 0,
                                   predictionInterval: 0,
                                   valid: false};
  }
  return prediction;
};


LocalLinearRegression.prototype.getUniqueTerms = function (inputData) {
  /**
   * Parses the input data to find the list of unique terms in the
   * tag cloud.
   *
   * @param {object} inputData Input data to predict
   */

  var uniqueTerms = {}, caseSensitive = true, inputDataField,
    tokenMode = 'all', terms = [], fieldId, separator, regexp,
    fullTerm;
  for (fieldId in this.termForms) {
    if (this.termForms.hasOwnProperty(fieldId) &&
        inputData.hasOwnProperty(fieldId)) {
      inputDataField = String(inputData[fieldId]);
      caseSensitive = this.termAnalysis[fieldId]['case_sensitive'];
      tokenMode = this.termAnalysis[fieldId]['token_mode'];
      if (tokenMode != constants.TM_FULL_TERM) {
        terms = parseTerms(inputDataField, caseSensitive);
      }
      // We must add the full term contents in case we use full_term token mode
      // or all. Note that in the latest case, if there's only one term in
      // the input data, then the full term must not be appended because it's
      // completely equal to the term, and would duplicate counters.
      fullTerm = caseSensitive ? inputDataField : inputDataField.toLowerCase();
      if (tokenMode == constants.TM_FULL_TERM ||
          (tokenMode == constants.TM_ALL && fullTerm != terms[0])) {
        terms.push(fullTerm);
      }
      uniqueTerms[fieldId] = getUniqueTerms(terms, this.termForms[fieldId],
                                            this.tagClouds[fieldId]);
      delete inputData[fieldId];
    }
  }
  for (fieldId in this.items) {
    if (this.items.hasOwnProperty(fieldId) &&
        inputData.hasOwnProperty(fieldId)) {
      regexp = utils.separatorRegexp(this.itemAnalysis[fieldId]);
      inputDataField = "";
      inputDataField = String(inputData[fieldId]);
      terms = inputDataField.split(new RegExp(regexp));
      uniqueTerms[fieldId] = getUniqueTerms(terms,
                                            {},
                                            this.items[fieldId]);
      delete inputData[fieldId];
    }
  }
  for (fieldId in this.categories) {
    if (this.categories.hasOwnProperty(fieldId) &&
        inputData.hasOwnProperty(fieldId)) {
      inputDataField = String(inputData[fieldId]);
      uniqueTerms[fieldId] = {}
      uniqueTerms[fieldId][inputDataField] = 1;
      delete inputData[fieldId];
    }
  }
  return uniqueTerms;
};



LocalLinearRegression.prototype.expandInput = function (inputData, uniqueTerms,
                                                        compact) {
  /**
   * Creates an input array with the values in input_data and
   * unique_terms and the following rules:
   *     - fields are ordered as input_fields
   *     - Any field adds a missings value iff the original field in the training
   *       data had missings
   *     - categorial fields are dummy encoded unless a coding in set in field
   *       codings and classes are sorted as
   *       they appear in the field summary.
   *     - text and items fields are expanded into their elements as found
   *       in the corresponding summmary information and their values treated
   *       as numerics.
   *
   * @param {object} inputData Input numeric data to predict
   * @param {object} uniqueTerms Terms detected in input data
   */
   // Compute input data field expansion

  var inputArray = [], missing = false, index, len, field,
   optype, inputIds, fieldInInput, value, stats, terms, newInputs, index2,
   len2, fieldId, length, encoding;

  inputIds = Object.keys(inputData);
  inputIds = inputIds.concat(Object.keys(uniqueTerms));

  len = this.coeffIds.length;
  for (index = 0; index < len; index++) {
    fieldId = this.coeffIds[index];
    field = this.fields[fieldId];
    optype = field.optype;
    missing = false;
    fieldInInput = (inputIds.indexOf(fieldId) > -1);
    if (optype == constants.NUMERIC) {
      if (fieldInInput) {
        value = inputData[fieldId];
      } else {
        value = 0;
        missing = true;
      }
      newInputs = [value];
    } else {
      terms = this[EXPANSION_ATTRIBUTES[optype]][fieldId];
      length = terms.length;
      if (fieldInInput) {
        newInputs = getTermsArray(terms, uniqueTerms, field, fieldId);
      } else {
        newInputs = new Array(length).fill(0);
        missing = true;
      }
    }

    if (field.summary["missing_count"] > 0 ||
        (optype == CATEGORICAL &&
         typeof this.fieldCodings[fieldId][DUMMY] === 'undefined')) {
      newInputs.push((missing) ? 1 : 0);
    }
    if (optype == CATEGORICAL) {
      newInputs = this.categoricalEncoding(newInputs, fieldId, compact);
    }
    inputArray = inputArray.concat(newInputs);

  }
  // the bias term will appear in coefficients even if bias = False
  if (this.bias || !compact) {
    inputArray.push(1);
  }
  return inputArray;
};


LocalLinearRegression.prototype.categoricalEncoding = function (inputs,
                                                                fieldId,
                                                                compact) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputs Input data to predict
   * @param {string} fieldId Id for the categorical field
   * @param {boolean} compact Whether to exclude the dummy classes
   *
   */

  var newInputs, projections, dummyClass, index, catNewInputs;

  newInputs = JSON.parse(JSON.stringify(inputs));
  projections = this.fieldCodings[fieldId][CONTRAST];
  if (typeof projections === 'undefined') {
    projections = this.fieldCodings[fieldId][OTHER];
  }
  if (typeof projections !== 'undefined') {
    newInputs = flatten(utils.dot(projections, [newInputs]));
  }

  if (compact && this.fieldCodings[fieldId][DUMMY]) {
    dummyClass = this.fieldCodings[fieldId][DUMMY];
    index = this.categories[fieldId].indexOf(dummyClass);
    catNewInputs = newInputs.slice(0, index);
    if (index + 1 < newInputs.length) {
      catNewInputs = catNewInputs.concat(newInputs.slice(index + 1,
                                                         newInputs.length));
    }
    newInputs = catNewInputs;
  }

  return newInputs;
};


LocalLinearRegression.prototype.validateInput = function (inputData,
                                                          addUnusedFields,
                                                          cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id. Also, numeric
   * fields are non-optional when missingNumerics is not set.
   * @param {object} inputData Input data to predict
   * @param {boolean} addUnusedFields Causes the validation to return the
   *                                  list of fields in inputData that are
   *                                  not used
   * @param {function} cb Callback
   */
  var newInputData = {}, field, inputDataKey, fieldId, mean, stddev,
    unusedFields = [];
  if (this.ready) {
    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        if (inputData[field] === null ||
            (typeof this.fields[field] === 'undefined' &&
             typeof this.invertedFields[field] === 'undefined') ||
            (typeof this.fields[field] !== 'undefined' &&
             [this.objectiveField, this.weightField].indexOf(field) > -1) ||
            (typeof this.invertedFields[field] !== 'undefined' &&
             [this.objectiveField,
              this.weightField].indexOf(this.invertedFields[field]) > -1)) {
          if (inputData[field] !== null) unusedFields.push(field);
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
      newInputData = utils.cast(newInputData, this.fields);
    } catch (err) {
      if (cb) {
        return cb(err, null);
      }
      throw err;
    }
    if (cb) {
      return cb(null, {inputData: newInputData, unusedFields : unusedFields});
    }
    return {inputData: newInputData, unusedFields: unusedFields};
  }
  this.on('ready', function (self) {
    return self.validateInput(inputData, addUnusedFields, cb);
  });
  return;
};


LocalLinearRegression.prototype.formatFieldCodings = function () {
  /* Changes the fieldCodings format to the old notation.

   */
  var fieldCodings = JSON.parse(JSON.stringify(this.fieldCodings)),
    coding, coefficients, index, tail, groups, expectedLength, groupLength,
    coefficientsGroups, fieldId;
  if (fieldCodings.constructor === Array) {
    this.fieldCodingsList = JSON.parse(JSON.stringify(fieldCodings));
    this.fieldCodings = {};
    for (index = 0; index < fieldCodings.length; index++) {
      if (this.invertedFields.hasOwnProperty(fieldCodings[index].field)) {
        fieldId = this.invertedFields[fieldCodings[index].field];
      } else {
        fieldId = fieldCodings[index].field;
      }
      if (typeof fieldCodings[index].coefficients === 'undefined') {
        coefficients = fieldCodings[index].dummy_class;
      } else {
        coefficients = fieldCodings[index].coefficients;
      }
      this.fieldCodings[fieldId] = {}
      this.fieldCodings[fieldId][fieldCodings[index].coding] = coefficients;
    }
  }
};


LocalLinearRegression.prototype.confidenceBounds = function (inputArray) {
  /* Computes the confidence interval for the prediction

   */
  var product = [], index, len, confidenceInterval, predictionInterval,
    index2, len2, total, valid;

  for (index = 0, len = this.xtxInverse.length; index < len; index++) {
    total = 0;
    for (index2 = 0, len2 = this.xtxInverse[index].length;
         index2 < len2; index2++) {
      total += inputArray[index2] * this.xtxInverse[index][index2];
    }
    product.push(total);
  }

  product = utils.dot(product, inputArray);
  confidenceInterval = this.tCrit * Math.sqrt(this.meanSquaredError * product);
  predictionInterval = this.tCrit * Math.sqrt(this.meanSquaredError *
                                              (1 + product));
  valid = !isNaN(confidenceInterval) && !isNaN(predictionInterval);
  confidenceInterval = (isNaN(confidenceInterval)) ? 0 : confidenceInterval;
  predictionInterval = (isNaN(predictionInterval)) ? 0 : predictionInterval;
  return {confidenceInterval: confidenceInterval,
          predictionInterval: predictionInterval,
          valid: valid}
};

if (NODEJS) {
  module.exports = LocalLinearRegression;
} else {
  exports = LocalLinearRegression;
}
