/**
 * Copyright 2015-2020 BigML
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

if (NODEJS) {
  var util = require('util');
  var path = require('path');
  var fs = require('fs');
  var events = require('events');
  var LogisticRegression = require('./LogisticRegression');
  var BigML = require('./BigML');
}

// End of imports section --- DO NOT REMOVE

var OPTIONAL_FIELDS = ['categorical', 'text', 'items'],
  EXPANSION_ATTRIBUTES = {categorical: "categories",
                          text: "tag_cloud", items: 'items'};


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

  var self, fillStructure, objectiveField, logisticRegression, filename;

  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new LogisticRegression(this.connection);
  this.resType = "logisticregression";
  this.fields = undefined;
  this.inputFields = undefined;
  this.invertedFields = undefined;
  this.objectiveField = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;
  this.resourceId = undefined;
  this.classNames = [];
  this.termForms = {};
  this.tagClouds = {};
  this.termAnalysis = {};
  this.items = {};
  this.itemAnalysis = {};
  this.categories = {};
  this.numericFields = {};
  this.coefficients = {};
  this.dataFieldTypes = {};
  this.fieldCodings = {};
  this.bias = true;
  this.missingNumerics = false;
  this.c = undefined;
  this.eps = undefined;
  this.lrNormalize = false;
  this.balanceFields = true;
  this.regularization = undefined;
  this.weightField = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource LogisticRegression's resource info
     */
    var status, fields, field, fieldInfo, index, logisticRegressionInfo,
      mapInfo, len, objectiveField, category, coefficients, fieldIds = [],
      fieldId, realId, key, contributions, oldCoefficients = false,
      distribution, index1;

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

    if ((typeof resource["input_fields"]) !== 'undefined') {
      self.inputFields = resource["input_fields"];
    }
    if ((typeof resource["dataset_field_types"] !== ' undefined') &&
        (typeof resource["objective_fields"] !== ' undefined')) {
      self.datasetFieldTypes = resource["dataset_field_types"]
      self.objectiveField = resource['objective_fields']
    } else {
      throw new Error("Failed to find the logistic regression expected " +
                      "JSON structure. Check your arguments.");
    }
    if (typeof resource["weight_field"] !== 'undefined') {
      self.weightField = resource["weight_field"];
    }
    if ((typeof resource['logistic_regression']) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        logisticRegressionInfo = resource['logistic_regression'];
        self.missingNumerics = logisticRegressionInfo['missing_numerics'];
        // in case old models have no missing_numerics attribute
        if (typeof self.missingNumerics === 'undefined') {
          self.missingNumerics = false;
        }
        if ((typeof logisticRegressionInfo.fields) !== 'undefined') {
          fields = logisticRegressionInfo.fields;
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
              fieldInfo = logisticRegressionInfo.fields[field];
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
              } else if (self.missingNumerics &&
                         fieldInfo.optype == 'numeric') {
                self.numericFields[field] = true;
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
          if (coefficients[0].constructor !== Array) {
            oldCoefficients = true;
          }
        }
        self.bias = logisticRegressionInfo.bias;
        self.c = logisticRegressionInfo.c;
        self.eps = logisticRegressionInfo.eps;
        self.lrNormalize = logisticRegressionInfo.normalize;
        self.balanceFields = logisticRegressionInfo["balance_fields"];
        self.regularization = logisticRegressionInfo.regularization;
        self.fields = fields;
        self.invertedFields = utils.invertObject(fields);
        self.fieldCodings = logisticRegressionInfo['field_codings'];
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
        // adding the missings class when the objective field has missings
        if (Object.keys(self.coefficients).length > distribution.length) {
            self.classNames.push("");
        }
        for (index = 0, len = distribution.length; index < len; index++) {
          self.classNames.push(distribution[index][0]);
        }
        self.classNames.sort();
        for (fieldId in self.fieldCodings) {
          if (self.fieldCodings.hasOwnProperty(fieldId) &&
              fieldId in self.invertedFields) {
            realId = self.invertedFields[fieldId];
            self.fieldCodings[realId] = self.fieldCodings[fieldId];
            delete self.fieldCodings[fieldId];
          }
        }
        if (oldCoefficients) {
          self.mapCoefficients();
        }
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
  util.inherits(LocalLogisticRegression, events.EventEmitter);
}

LocalLogisticRegression.prototype.predict = function (inputData,
                                                      addUnusedFields,
                                                      operatingPoint,
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
  var field, prediction, validatedInput, self = this;

  // backward compatibility for previous code with no addUnusedFields argument
  if (typeof addUnusedFields === "function") {
    cb = addUnusedFields;
    addUnusedFields = false;
  }
  // backward compatibility for previous code with no operatingPoint argument
  if (typeof operatingPoint === "function") {
    cb = operatingPoint;
    operatingPoint = undefined;
  }

  if (typeof operatingPoint !== 'undefined' &&
      operatingPoint != null && operatingPoint) {
    return this.predictOperating(
      inputData, operatingPoint, cb);
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
    prediction = self.logisticPredict(data.inputData);
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
      prediction = this.logisticPredict(validatedInput.inputData);
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


LocalLogisticRegression.prototype.logisticPredict = function (inputData) {
  /**
   * Computes the prediction based on the coefficients of the logistic
   * regression.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   */
   // Compute text and categorical field expansion
  var uniqueTerms, probabilities = [], total = 0, len, probability,
    category, coefficients, order, index, probabilityInfo;
  uniqueTerms = this.getUniqueTerms(inputData);

  index = 0;
  for (category in this.coefficients) {
    if (this.coefficients.hasOwnProperty(category)) {
      probability = this.categoryProbability(
        inputData, uniqueTerms, category);
      order = this.categories[this.objectiveField].indexOf(category);
      probabilities[index] = {"category": category,
                              "probability": probability,
                              "order": order};
      total += probability;
      index++;
    }
  }
  len = index;
  for (index = 0; index < len; index++) {
    category = this.categories[this.objectiveField][index];
    probabilities[index].probability /= total;
    probabilities[index].probability = Math.round(
      100000 * probabilities[index].probability) / 100000.0;
  }

  probabilities.sort(function(a, b) {
      return a.probability > b.probability ? -1 : (
        a.probability < b.probability ? 1 : (a.order > b.order ? 1 : -1));
  });
  for (index = 0; index < len; index++) {
    delete probabilities[index]['order'];
  }
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
  var shift = 0, index = 0, len = 0, optype,
    fieldId, length, key, contributions;
  // field IDs sorted by input fields
  len = this.inputFields.length;
  for (index = 0; index < len; index++) {
    fieldId = this.inputFields[index];
    optype = this.fields[fieldId].optype;
    if (EXPANSION_ATTRIBUTES.hasOwnProperty(optype)) {
      // text and items fields have one coefficient per
      // text/class plus a missing terms coefficient plus a bias
      // coefficient
      if (optype != 'categorical' ||
          !this.fieldCodings.hasOwnProperty(fieldId) ||
          Object.keys(this.fieldCodings[fieldId])[0] === "dummy") {
        length =
          (this.fields[fieldId].summary[EXPANSION_ATTRIBUTES[optype]].length
           + 1);
      } else {
        key = Object.keys(this.fieldCodings[fieldId])[0];
        contributions = this.fieldCodings[fieldId][key];
        length = contributions.length;
      }
    } else {
      // numeric fields have one coefficient if missing_numerics is false and
      // two otherwise
      length = (this.missingNumerics) ? 2 : 1;
    }
    this.fields[fieldId].coefficientsShift = shift;
    this.fields[fieldId].coefficientsLength = length;
    shift += length;
  }
  this.groupCoefficients();
};

LocalLogisticRegression.prototype.getCoefficients = function(
  category, fieldId) {
  /**
   * Coefficients for the given category and fieldId
   *
   * @param {string} category
   * @param {string} Field ID
   */
  var coeffIndex = this.coeffIds.indexOf(fieldId);
  return this.coefficients[category][coeffIndex];
}

LocalLogisticRegression.prototype.categoryProbability = function (
  inputData, uniqueTerms, category) {
  /**
   * Computes the probability for a concrete category
   *
   * @param {object} inputData Input data to predict
   * @param {object} uniqueTerms Frequency of the terms once stemmed
   * @param {string} category Category name
   */
  var probability = 0, shift, occurrences, fieldId, term, index, oneHot,
    coeffIndex, contribution, contributions, key,
    bias = this.coefficients[category][
      this.coefficients[category].length -1][0],
      coefficients,
      norm2 = 0;

  // inputData should contain only numeric data after preprocessing
  for (fieldId in inputData) {
    if (this.coeffIds.indexOf(fieldId) > -1) {
      if (inputData.hasOwnProperty(fieldId)) {
        coefficients = this.getCoefficients(category, fieldId);
        probability += coefficients[0] * inputData[fieldId];
        norm2 += Math.pow(inputData[fieldId], 2);
      }
    }
  }

  // text, categorical or items data
  for (fieldId in uniqueTerms) {
    if (this.coeffIds.indexOf(fieldId) > -1) {
      oneHot = true;
      coefficients = this.getCoefficients(category, fieldId);
      for (term in uniqueTerms[fieldId]) {
        if (uniqueTerms[fieldId].hasOwnProperty(term)) {
          occurrences = uniqueTerms[fieldId][term];
          if (this.tagClouds.hasOwnProperty(fieldId)) {
            index = this.tagClouds[fieldId].indexOf(term);
          } else if (this.categories.hasOwnProperty(fieldId)) {
            index = this.categories[fieldId].indexOf(term);
            if (this.fieldCodings.hasOwnProperty(fieldId) &&
                Object.keys(this.fieldCodings[fieldId])[0] != "dummy") {
              // codings are given as arrays of coefficients. The last one is
              // for missings and the previous ones are one per category as
              // found in summary
              oneHot = false;
              key = Object.keys(this.fieldCodings[fieldId])[0];
              contributions = this.fieldCodings[fieldId][key];
              for (coeffIndex = 0;
                   coeffIndex < contributions.length ;
                   coeffIndex++) {
                contribution = contributions[coeffIndex][index];
                probability += (coefficients[coeffIndex] *
                  contribution * occurrences);
              }
            }
          } else if (this.items.hasOwnProperty(fieldId)) {
            index = this.items[fieldId].indexOf(term);
            occurrences = 1;
          }
          if (oneHot) {
            probability += coefficients[index] * occurrences;
          }
          norm2 += Math.pow(occurrences, 2);
        }
      }
    }
  }
  // missing coefficients

  for (fieldId in this.tagClouds) {
    if (this.coeffIds.indexOf(fieldId) > -1) {
      coefficients = this.getCoefficients(category, fieldId);
      if (!uniqueTerms.hasOwnProperty(fieldId) ||
          Object.keys(uniqueTerms[fieldId]).length == 0) {
        probability += coefficients[this.tagClouds[fieldId].length];
        norm2 += 1;
      }
    }
  }
  for (fieldId in this.categories) {
    if (this.coeffIds.indexOf(fieldId) > -1) {
      coefficients = this.getCoefficients(category, fieldId);
      if (fieldId != this.objectiveField &&
          !uniqueTerms.hasOwnProperty(fieldId)) {
        norm2 += 1;
        if (!this.fieldCodings.hasOwnProperty(fieldId) ||
            Object.keys(this.fieldCodings[fieldId])[0] === "dummy") {
          probability += coefficients[this.categories[fieldId].length];
        } else {
          /* codings are given as arrays of coefficients. The last one is for
             missings and the previous ones are one per category as found in
             summary
           */
          coeffIndex = 0;
          key = Object.keys(this.fieldCodings[fieldId])[0];
          contributions = this.fieldCodings[fieldId][key];
          for (coeffIndex = 0;
               coeffIndex < contributions.length; coeffIndex++) {
            probability += (coefficients[coeffIndex] *
              contributions[coeffIndex][contributions[coeffIndex].length - 1]);
          }
        }
      }
    }
  }

  for (fieldId in this.items) {
    if (this.coeffIds.indexOf(fieldId) > -1) {
      coefficients = this.getCoefficients(category, fieldId);
      if (!uniqueTerms.hasOwnProperty(fieldId) ||
          Object.keys(uniqueTerms[fieldId]).length == 0) {
        probability += coefficients[this.items[fieldId].length];
        norm2 += 1;
      }
    }
  }

  if (this.missingNumerics) {
    for (fieldId in this.numericFields) {
      if (this.coeffIds.indexOf(fieldId) > -1 &&
          !inputData.hasOwnProperty(fieldId)) {
        coefficients = this.getCoefficients(category, fieldId);
        probability += coefficients[1];
        norm2 += 1;
      }
    }
  }
  // bias coefficient
  probability += bias;
  if (this.bias) {
    norm2 += 1;
  }

  if (this.lrNormalize) {
    if (norm2 == 0) {
      // this should never happen, because either there's input data or
      // missings are contributing
      return NaN;
    }
    probability /= Math.sqrt(norm2);
  }

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

LocalLogisticRegression.prototype.validateInput = function (inputData,
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
    if (!this.missingNumerics) {
      for (fieldId in this.fields) {
        if (this.fields.hasOwnProperty(fieldId)) {
          field = this.fields[fieldId];
          if (field.optype == 'numeric' &&
              (typeof this.weightField !== 'undefined') &&
              this.weightField != fieldId &&
              !inputData.hasOwnProperty(fieldId) &&
              !inputData.hasOwnProperty(field.name)) {
            throw new Error("The input data lacks some numeric fields values" +
                            ". To predict, input data must " +
                            "contain all numeric fields values.");
          }
        }
      }
    }

    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        if (inputData[field] === null ||
            (typeof this.fields[field] === 'undefined' &&
             typeof this.invertedFields[field] === 'undefined') ||
            (typeof this.fields[field] !== 'undefined' &&
             this.objectiveField === field) ||
            (typeof this.invertedFields[field] !== 'undefined' &&
             this.objectiveField === this.invertedFields[field])) {
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
      // if balance_fields is true, input data should be transformed:
      // x = (x - mean(x))/ stddev(x)
      if (this.balanceFields) {
        for (field in newInputData) {
          if (newInputData.hasOwnProperty(field) &&
              this.fields[field].optype === 'numeric') {
            mean = this.fields[field].summary.mean;
            stddev = this.fields[field].summary['standard_deviation'];
            newInputData[field] = (newInputData[field] - mean)
            // if the field is constant, we only remove the mean
            if (stddev > 0) {
              newInputData[field] = newInputData[field] / stddev;
            }
          }
        }
      }
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

LocalLogisticRegression.prototype.groupCoefficients = function () {
  /* Group the coefficients of the flat arrays into grouped arrays, as used
     in the new notation

   */
  var coefficients = JSON.parse(JSON.stringify(this.coefficients)),
    index, category, coefficientsGroup, shift, length;
  for (category in coefficients) {
    if (coefficients.hasOwnProperty(category)) {
      this.flatCoefficients = coefficients;
      this.coefficients[category] = [];
      for (index = 0; index < this.coeffIds.length; index++) {
        shift = this.fields[this.coeffIds[index]].coefficientsShift;
        length = this.fields[this.coeffIds[index]].coefficientsLength;
        coefficientsGroup = coefficients[category].slice(shift,
                                                         length + shift);
        this.coefficients[category].push(coefficientsGroup);
      }
      this.coefficients[category].push(
        [coefficients[category][coefficients[category].length - 1]]);
    }
  }
};


LocalLogisticRegression.prototype.formatFieldCodings = function () {
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
        fieldCodings[index].coefficients = fieldCodings[index].dummy_class;
      } else {
        // ensures that the length of the coefficients list is the one required
        expectedLength = this.categories[fieldId].length + 1;
        coefficientsGroups = fieldCodings[index].coefficients.length;
        for (groups = 0; groups < coefficientsGroups; groups++) {
          groupLength = fieldCodings[index].coefficients[groups].length;
          if (groupLength < expectedLength) {
            tail = expectedLength - groupLength;
            for (groupLength = 0; groupLength < tail; groupLength++) {
              fieldCodings[index].coefficients[groups].push(0);
            }
          }
        }
      }
      coding = fieldCodings[index].coding;
      coefficients = fieldCodings[index].coefficients;
      this.fieldCodings[fieldId] = {}
      this.fieldCodings[fieldId][coding] = coefficients;
    }
  }
};

LocalLogisticRegression.prototype.predictOperating = function (
  inputData, operatingPoint, cb) {
  /**
   *    Predicts using the operation point
   *    defined by a positive class and some threshold and
   *    based on input values.  The input
   *    fields must be a dictionary keyed by field name or field ID.
   *   *
   * @param {object} inputData Input data to predict
   * @param {object} operatingPoint Operating point definition. The object
   *                                should contain a positiveClass and
   *                                either a probabilityThreshold,
   *                                confidenceThreshold or a
   *                                kThreshold
   * @param {function} cb Callback
   */

  var positiveClass, kind, threshold, issuePrediction,
    predictions, position, index, len, sortFn, self=this;

  if ((typeof operatingPoint === 'function') && (typeof cb === 'undefined')) {
    cb = operatingPoint;
  }

  if (this.ready) {
    // logistic regression only accepts the probability kind
    utils.checkOperatingPoint(operatingPoint,
                              ["probability"],
                              this.classNames);
    positiveClass = operatingPoint.positiveClass;
    kind = operatingPoint.kind;
    threshold = operatingPoint.threshold;
    issuePrediction = function(error, prediction) {
      predictions = prediction.distribution;
      position = self.classNames.indexOf(positiveClass);
      sortFn = function (a, b) {
        return (b["category"] > a["category"]) ? -1 : 1;}
      predictions.sort(sortFn);
      if (predictions[position][kind] > threshold) {
        prediction = predictions[position];
      } else {
        // if the threshold is not met, the alternative class with
        // highest probability is returned
        sortFn = function (a, b) {
          return b[kind] - a[kind];}
        predictions.sort(sortFn);
        prediction = (predictions[0]["category"] == positiveClass) ? predictions[1] : predictions[0];
      }
      prediction = {"prediction": prediction["category"],
                    "probability": prediction["probability"],
                    "distribution": predictions};
      if (cb) {
        cb(null, prediction);
      } else {
        return prediction;
      }
    }
    if (cb) {
      this.predict(inputData, null, issuePrediction);
    } else {
      return issuePrediction(null,
                             this.predict(inputData));
    }

  } else {
    this.on('ready',
            function (self) {return self.predictOperating(inputData,
                                                          operatingPoint,
                                                          cb); });
    return;
  }
};


LocalLogisticRegression.prototype.predictProbability = function (
  inputData, cb) {
  /**
   * For classification models, predicts a probability for
   *    each possible output class, based on input values.  The input
   *    fields must be a dictionary keyed by field name or field ID.
   *
   *
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
  **/

  var issuePrediction = function(err, prediction) {
      var predictions = [];
      if (err && cb) {
        return cb(err, null);
      }
      predictions = prediction.distribution;
      if (cb) {
        return cb(null, predictions);
      }
      return predictions;
    }

  if (this.ready) {
    if (cb) {
      this.predict(inputData, null, issuePrediction);
    } else {
      return issuePrediction(null,
                             this.predict(inputData));
    }
  } else {
    this.on('ready',
            function (self) {return self.predictProbability(
              inputData, cb);
      });
    return;
  }
}


if (NODEJS) {
  module.exports = LocalLogisticRegression;
} else {
  exports = LocalLogisticRegression;
}
