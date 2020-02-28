/**
 * Copyright 2018-2020 BigML
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
var mathOps = require(PATH + 'mathOps');

if (NODEJS) {
  var util = require('util');
  var path = require('path');
  var fs = require('fs');
  var events = require('events');
  var PCA = require('./PCA');
  var BigML = require('./BigML');
}

// End of imports section --- DO NOT REMOVE

var CATEGORICAL = 'categorical',
  EXPANSION_ATTRIBUTES = {categorical: "categories",
                          text: "tagClouds", items: 'items'};


function parseTerms(text, caseSensitive) {
  /**
   * Parses the text into words
   *
   * @param {string} text Text to be parsed
   * @param {boolean} caseSensitive transform if caseSensitive = false
   */
  var expression, pattern, i, len, matches;
  if ((typeof text) === 'undefined' || text == null) {
    return [];
  }
  if (!caseSensitive) {
    text = text.toLowerCase();
  }
  pattern = new RegExp('(\\b|_)([^\\b_\\s]+?)(\\b|_)', 'g');
  matches = text.match(pattern);
  if (matches == null) {
    return [];
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

    if (field.optype == CATEGORICAL &&
        field.summary.missing_count > 0) {
        termsArray.push(uniqueTerms.hasOwnProperty(fieldId) ? 0: 1);
    }
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

/**
 * LocalPCA: Simplified local object for the PCA
 * resource.
 * @constructor
 */
function LocalPCA(resource, connection) {
  /**
   * Constructor for the LocalPCA local object.
   *
   * @param {string|object} resource BigML PCA resource,
   *                        resource id or
   *                        the path to a JSON file containing a BigML model
   *                        resource
   * @param {object} connection BigML connection
   */

  var self, fillStructure, objectiveField, pca, filename;

  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new PCA(this.connection);
  this.resType = "pca";
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
  this.categoriesProbabilities = {};
  this.dataFieldTypes = {};
  this.standardized = undefined;
  this.famdJ = 1;
  this.weightField = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource PCA's resource info
     */
    var status, fields, field, fieldInfo, index, pcaInfo,
      mapInfo, len, objectiveField, category, fieldIds = [],
      fieldId, realId, key, probabilities = [], index1, missings, total;

    if (error) {
      throw new Error('Cannot create the PCA instance.' +
                      ' Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.resourceId = utils.getResource(resource);
    if ((typeof self.resourceId) === 'undefined') {
      throw new Error('Cannot build a PCA from this' +
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
    } else {
      throw new Error("Failed to find the PCA expected " +
                      "JSON structure. Check your arguments.");
    }
    if (typeof resource["weight_field"] !== 'undefined') {
      self.weightField = resource["weight_field"];
    }
    if (self.datasetFieldTypes.categorical != self.datasetFieldTypes.total) {
      self.famdJ = 1;
    } else {
      self.famdJ = self.datasetFieldTypes.categorical;
    }

    if ((typeof resource['pca']) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        pcaInfo = resource['pca'];
        if ((typeof pcaInfo.fields) !== 'undefined') {
          fields = pcaInfo.fields;
          self.fields = fields;
          self.invertedFields = utils.invertObject(fields);
          if (typeof self.inputFields === 'undefined') {
            self.inputFields = [];
            for (fieldId in self.fields) {
              if (self.fields.hasOwnProperty(fieldId)) {
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
          for (field in fields) {
            if (fields.hasOwnProperty(field)) {
              fieldInfo = pcaInfo.fields[field];
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
                  probabilities.push(mapInfo[index][1]);
                }
                missings = self.fields[field].summary["missing_count"]
                if (typeof missings !== 'undefined' && missings > 0) {
                  probabilities.push(missings);
                }
                total = probabilities.reduce(
                  function(a, b) { return a + b; }, 0);
                for (index = 0; index < len; index++) {
                  probabilities[index] /= total;
                }
                self.categoriesProbabilities[field] = probabilities;
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
          self.fields = pcaInfo.fields;
        }

        self.components = pcaInfo.components;
        self.eigenvectors = pcaInfo.eigenvectors;
        self.cumulativeVariance = pcaInfo["cumulative_variance"];
        self.textStats = pcaInfo["text_stats"];
        self.standardized = pcaInfo.standardized;
        self.variance = pcaInfo.variance;

        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the LocalPCA instance.' +
                      ' Could not' +
                      ' find the \'pca\' key in the' +
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
  util.inherits(LocalPCA, events.EventEmitter);
}

LocalPCA.prototype.projection = function (inputData,
                                          maxComponents,
                                          varianceThreshold,
                                          cb) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {integer} maxComponents If set, the maximum number of components
   *                                to be created
   * @param {integer} varianceThreshold Maximimum accumulated variance
   * @param {function} cb Callback
   */
  var newInputData = {}, field, projection, validatedInput, self = this;

  if (typeof maxComponents === 'function') {
    this.projection(inputData, undefined, undefined, maxComponents);
  }
  if (typeof varianceThreshold === 'function') {
    this.projection(inputData, maxComponents, undefined, varianceThreshold);
  }

  function createLocalProjection(error, inputData) {
    /**
     * Creates a local projection using the PCA info.
     *
     * @param {object} error Error message
     * @param {object} data Input data to predict from
     *
     */

    if (error) {
      return cb(error, null);
    }
    projection = self.pcaProjection(inputData, maxComponents,
                                    varianceThreshold);
    return cb(null, projection);
  }

  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, createLocalProjection);
    } else {
      validatedInput = this.validateInput(inputData);
      projection = this.pcaProjection(validatedInput);
      return projection;
    }
  } else {
    this.on('ready', function (self) {
      return self.projection(inputData, cb);
    });
    return;
  }
};


LocalPCA.prototype.expandInput = function (inputData, uniqueTerms) {
  /**
   * Creates an input array with the values in input_data and
   * unique_terms and the following rules:
   *     - fields are ordered as input_fields
   *     - numeric fields contain the value or 0 if missing
   *     - categorial fields are one-hot encoded and classes are sorted as
   *       they appear in the field summary. If missing_count > 0 a last
   *       missing element is added set to 1 if the field is missing and o
   *       otherwise
   *     - text and items fields are expanded into their elements as found
   *       in the corresponding summmary information and their values treated
   *       as numerics.
   * It also returns the inputMask that matches the non-missing info
   * and a missings flag.
   *
   * @param {object} inputData Input numeric data to predict
   * @param {object} uniqueTerms Terms detected in input data
   */
   // Compute input data field expansion

  var inputArray = [], inputMask = [], missings = false, index, len, field,
   optype, inputIds, fieldInInput, value, stats, terms, newInputs, index2,
   len2, fieldId;

  inputIds = Object.keys(inputData);
  inputIds = inputIds.concat(Object.keys(uniqueTerms));

  len = this.inputFields.length;
  for (index = 0; index < len; index++) {
    fieldId = this.inputFields[index];
    field = this.fields[fieldId];
    optype = field.optype;
    fieldInInput = (inputIds.indexOf(fieldId) > -1);
    if (optype == constants.NUMERIC) {
      inputMask.push(fieldInInput ? 1 : 0);
      if (fieldInInput) {
        value = inputData[fieldId];
        if (this.standardized) {
          stats = this.getStats(field);
          value -= stats.mean;
          value = (stats.stdev > 0) ? value /= stats.stdev : value;
        }
      } else {
        value = 0;
        missings = true;
      }
      newInputs = [value];
    } else {
      terms = this[EXPANSION_ATTRIBUTES[optype]][fieldId];
      if (fieldInInput) {
        newInputs = getTermsArray(terms, uniqueTerms, field, fieldId);
        inputMask = inputMask.concat(new Array(newInputs.length).fill(1));
      } else {
        newInputs = new Array(terms.length).fill(0);
        if (optype != CATEGORICAL) {
          missing = true;
          inputMask = inputMask.concat(new Array(terms.length).fill(0));
        } else {
          inputMask = inputMask.concat(new Array(terms.length).fill(1));
          if (field.summary["missing_count"] > 0) {
            newInputs.push(1);
            inputMask.push(1);
          }
        }
      }
      if (this.standardized) {
        len2 = newInputs.length;
        for (index2 = 0; index2 < len2; index2++) {
          stats = this.getStats(field, fieldId, index2);
          newInputs[index2] -= stats.mean;
          if (stats.stdev > 0) {
            newInputs[index2] /= stats.stdev;
          }
        }
      }
    }
    inputArray = inputArray.concat(newInputs);
  }
  return {inputArray: inputArray,
          missings: missings,
          inputMask: inputMask};
};

LocalPCA.prototype.getStats = function (field, fieldId, index) {
  /**
   * Retrieves the mean and standard deviation of a field
   *
   * @param {object} field Field information
   */
  var mean;
  if (field.optype == CATEGORICAL && typeof index !== 'undefined') {
    mean = this.categoriesProbabilities[fieldId][index];
    return {mean: mean,
            stdev: this.famdJ * Math.sqrt(mean * this.famdJ)};
  } else if (field.optype == constants.NUMERIC) {
    return {mean: field.summary.mean,
            stdev: field.summary['standard_deviation']};
  } else {
    return {mean: this.textStats[fieldId].means[index],
            stdev: this.textStats[fieldId]['standard_deviations'][index]}
  }

};

LocalPCA.prototype.pcaProjection = function (inputData, maxComponents,
                                             varianceThreshold) {
  /**
   * Computes the projection based on the PCA model
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {integer} maxComponents If set, the maximum number of components
   *                                to be created
   * @param {integer} varianceThreshold Maximimum accumulated variance
   */
   // Compute text and categorical field expansion
  var uniqueTerms, probabilities = [], total = 0, len, probability,
    category, order, index, probabilityInfo, inputInfo, components,
    result = [], missingSums, resultMap = {};
  uniqueTerms = this.getUniqueTerms(inputData);

  index = 0;
  inputInfo = this.expandInput(inputData, uniqueTerms);

  components = this.eigenvectors.slice(0, this.eigenvectors.length);
  if (typeof maxComponents !== "undefined") {
    components = this.eigenvectors.slice(0, maxComponents);
  }
  if (typeof varianceThreshold !== 'undefined') {
    len = this.cumulativeVariance.length;
    for (index = 0; index < len; index++) {
      if (this.cumulativeVariance[index] > varianceThreshold) {
        components = this.eigenvectors.slice(0, index + 1);
      }
    }
  }

  result = mathOps.dot(components, [inputInfo.inputArray]);

  len = result.length;
  for (index = 0; index < len; index++) {
    result[index] = result[index][0];
  }

  // if non-categorical fields values are missing in input data
  // there's an additional normalization
  if (inputInfo.missings) {
    missingSums = this.missingFactors(inputInfo.inputMask);
    for (index = 0; index < len; index++) {
      if (missingSums[index] > 0) {
        result[index] /= missingSums[index];
      }
    }
  }

  for (index = 0; index < len; index++) {
    resultMap['PC' + (index + 1)] = result[index];
  }

  return resultMap;
};


LocalPCA.prototype.missingFactors = function (inputMask) {
  /**
   * Returns the factors to divide the PCA values when input data has missings
   *
   * @param {object} inputMask Flags per field in inputs fields set on
   *                           when the field is not missing in input data
   */
  var sumEigenvectors = [], len, index, col, len2, eigenvector = [];
  len = this.eigenvectors.length;
  for (index = 0; index < len; index++) {
    eigenvector = [];
    len2 = this.eigenvectors[index].length;
    for (col = 0; col < len2; col++) {
      eigenvector.push(
        (inputMask[col] == 1) ? this.eigenvectors[index][col] : 0);
    }
    sumEigenvectors.push(mathOps.dot([eigenvector], [eigenvector])[0][0]);
  }
  return sumEigenvectors;
}

LocalPCA.prototype.getUniqueTerms = function (inputData) {
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

LocalPCA.prototype.validateInput = function (inputData, cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id. Also, numeric
   * fields are non-optional when missingNumerics is not set.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, inputDataKey, fieldId;

  if (this.ready) {
    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        // input data keyed by field id
        if (typeof this.fields[field] !== 'undefined') {
          inputDataKey = field;
        } else { // input data keyed by field name
          inputDataKey = String(this.invertedFields[field]);
        }
        newInputData[inputDataKey] = inputData[field];
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
      return cb(null, newInputData);
    }
    return newInputData;
  }
  this.on('ready', function (self) {
    return self.validateInput(inputData, cb);
  });
  return;
};


if (NODEJS) {
  module.exports = LocalPCA;
} else {
  exports = LocalPCA;
}
