/**
 * Copyright 2017 BigML
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
var net = require(PATH + 'math_ops');
var pp = require(PATH + 'preprocess');

if (NODEJS) {
  var util = require('util');
  var fs = require('fs');
  var events = require('events');
  var Deepnet = require('./Deepnet');
}

var MEAN = "mean",
  STANDARD_DEVIATION = "stdev";


function moments(aMap) {
  return [aMap[MEAN], aMap[STANDARD_DEVIATION]];}


function expandTerms(termsList, inputTerms) {
  /**
   * Builds a list of occurrences for all the available terms
   *
   * @param {list} termsList List of terms
   * @param {list} inputTerms Text inputs
   */
  var termOccurrences;

  for (index = 0; index < termsList.length; index++) {
    termOccurrences[index] = 0.0;
  }
  for (termInfo in inputTerms) {
    index = termsList.index(termInfo[0]);
    termOccurrences[index] = termInfo[1];
  }
  return termOccurrences;
}


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
 * LocalDeepnet: Simplified local object for the deepnet
 * resource.
 * @constructor
 */
function LocalDeepnet(resource, connection) {
  /**
   * Constructor for the LocalDeepnet local object.
   *
   * @param {string|object} resource BigML deepnet resource,
   *                        resource id or
   *                        the path to a JSON file containing a BigML model
   *                        resource
   * @param {object} connection BigML connection
   */

  var model, self, fillStructure, objectiveField, deepnet;

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
  this.numericFields = {};
  this.dataFieldTypes = {};
  this.missingNumerics = false;
  this.classNames = [];
  this.preprocess = [];
  this.regression = false;
  this.network = undefined;
  this.networks = undefined;
  this.outExposition = undefined;
  this.beta1 = undefined;
  this.beta2 = undefined;
  this.decay = undefined;
  this.descentAlgorithm = undefined;
  this.epsilon = undefined;
  this.hiddenLayers = [];
  this.initialAccumulatorValue = undefined;
  this.l1Regularization = undefined;
  this.l2Regularization = undefined;
  this.learningRate = undefined;
  this.learningRatePower = undefined;
  this.maxIterations = undefined;
  this.maxTrainingTime = undefined;
  this.momentum = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource deepnet's resource info
     */
    var status, fields, field, fieldInfo, index, deepnetInfo,
      mapInfo, len, objectiveField, category, fieldIds = [],
      fieldId, realId, key, contributions, network, categoryInfo,
      categoriesInfo;

    if (error) {
      throw new Error('Cannot create the Deepnet instance.' +
                      ' Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.resourceId = utils.getResource(resource);
    if ((typeof self.resourceId) === 'undefined') {
      throw new Error('Cannot build a Deepnet from this' +
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
      throw new Error("Failed to find the deepnet expected " +
                      "JSON structure. Check your arguments.");
    }
    if ((typeof resource['deepnet']) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        deepnetInfo = resource['deepnet'];
        self.missingNumerics = deepnetInfo['missing_numerics'];
        // in case old models have no missing_numerics attribute
        if (typeof self.missingNumerics === 'undefined') {
          self.missingNumerics = false;
        }
        if ((typeof deepnetInfo.fields) !== 'undefined') {
          fields = deepnetInfo.fields;
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
          for (field in fields) {
            if (fields.hasOwnProperty(field)) {
              fieldInfo = deepnetInfo.fields[field];
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
          fields = deepnetInfo.fields;
        }

        // TODO: add properties
        self.fields = fields;
        self.invertedFields = utils.invertObject(fields);
        if (self.objectiveField && (typeof self.objectiveField) === 'array') {
          self.objectiveField = self.objectiveField[0];
        }


        self.regression = (self.fields[self.objectiveField].optype ==
                           constants.NUMERIC);
        if (!self.regression){
          categoriesInfo = self.fields[self.objectiveField].summary.categories;
          for (index = 0, len = categoriesInfo.length; index < len; index++) {
            categoryInfo = categoriesInfo[index];
            self.classNames.push(categoryInfo[0]);
          }
          self.classNames.sort();
        }
        network = deepnetInfo.network;
        self.network = network;
        self.networks = network.networks;
        self.outputExposition = network['output_exposition'];
        self.preprocess = network.preprocess;
        self.beta1 = network.beta1 || 0.9;
        self.beta2 = network.beta2 || 0.999;
        self.decay = network.decay || 0.0;
        self.descentAlgorithm = network['descent_algorithm'] || 'adam';
        self.epsilon = network.epsilon | 1e-08;
        self.hiddenLayers = network['hidden_layers'] || [];
        self.initialAccumulatorValue = (network['initial_accumulator_value']
                                        || 0);
        self.l1Regularization = network['l1_regularization'] || 0;
        self.l2Regularization = network['l2_regularization'] || 0;
        self.learningRate = network['learning_rate'] || 0.001;
        self.maxIterations = network['max_iterations'];
        self.maxTrainingTime = network['max_training_time'] || 1800;
        self.momentum = network.momentum || 0.99;
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the Deepnet instance.' +
                      ' Could not' +
                      ' find the \'deepnet\' key in the' +
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
            throw new Error('Failed to read local deepnet file: ' +
                            resource);
          }
          try {
            resource = JSON.parse(data);
            fillStructure(null, resource);
          } catch (jsonErr) {
            throw new Error('Failed to parse the JSON deepnet' +
                            ' in: ' + resource);
          }
        });
      } catch (errf) {
        // if no file is read, throw error reading file
        throw new Error('Cannot build a Deepnet from this ' +
                        'resource: ' +
                        resource);
      }
    } else {
      // if a resource id has been found, then load the deepnet
      deepnet = new Deepnet(connection);
      deepnet.get(this.resourceId.resource, true,
                  constants.ONLY_MODEL, fillStructure);
    }

  } else {
  // loads when the entire resource is given
    fillStructure(null, resource);
  }
  if (NODEJS) {
    events.EventEmitter.call(this);
  } else {
    this.integerInputCheck = false;
  }
}

if (NODEJS) {
  util.inherits(LocalDeepnet, events.EventEmitter);
}

LocalDeepnet.prototype.predict = function (inputData,
                                           addUnusedFields,
                                           cb) {

    /**
     * Makes a prediction based on a number of field values.
     *
     * The input fields must be keyed by field name or field id.
     * @param {object} inputData Input data to predict
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
      prediction = self.deepnetPredict(data.inputData);
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
        prediction = this.deepnetPredict(validatedInput.inputData);
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


LocalDeepnet.prototype.fillArray = function(inputData, uniqueTerms) {
  /**
   * Filling the input array for the network with the data in the
   * inputData object. Numeric missings are added as a new field
   * and texts/items are processed.
   * The input fields must be keyed by field name or field id.
   *
   * @param {object} inputData Input data to predict
   * @param {object} uniqueTerms Terms for the text/items fields
   */

  var columns = [], termsOccurrences, fieldId, index, len;
  for (index = 0, len = this.inputFields.length; index < len; index++) {
    // if the field is text or items, we need to expand the field
    // in one field per term and get its frequency
    fieldId = this.inputFields[index];

    if (this.tagClouds.hasOwnProperty(fieldId)) {
      termsOccurrences = expandTerms(this.tagClouds[fieldId],
                                     uniqueTerms[fieldId] || []);
      columns.concat(termsOccurrences);
    } else if (this.items.hasOwnProperty(fieldId)) {
      termsOccurrences = expandTerms(this.items[fieldId],
                                     uniqueTerms[fieldId] || []);
      columns.concat(termsOccurrences);
    } else if (this.categories.hasOwnProperty(fieldId)) {
      columns.push(Object.keys(uniqueTerms[fieldId]));
    } else {
      columns.push([inputData[fieldId]]);
    }
  }
  return pp.preprocess(columns, this.preprocess);
};


LocalDeepnet.prototype.deepnetPredict = function (inputData) {
  /**
   * Computes the prediction based on the coefficients of the deepnet.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   */
   // Compute text and categorical field expansion

  var uniqueTerms, probabilities = [], total = 0, len, probability,
    category, yOut, order, index, probabilityInfo, inputArray, prediction,
    distribution, sortedPrediction;
  uniqueTerms = this.getUniqueTerms(inputData);

  inputArray = this.fillArray(inputData, uniqueTerms);

  if (typeof this.networks !== 'undefined') {
    return this.predictList(inputArray);
  }
  return this.predictSingle(inputArray);
};

LocalDeepnet.prototype.predictSingle = function (inputArray) {
  /**
   * Computes the prediction with a single network.
   *
   * @param {array} inputArray Input data array prepared according to
   *                           the input fields description.
   */
  if (typeof this.network.trees !== 'undefined' &&
      this.network.trees) {
    inputArray = pp.treeTransform(inputArray, this.network.trees);
  }
  return this.toPrediction(this.modelPredict(inputArray, this.network));
}


LocalDeepnet.prototype.predictList = function (inputArray) {
  /**
   * Computes the prediction with a list of networks.
   *
   * @param {array} inputArray Input data array prepared according to
   *                           the input fields description.
   */

  var inputArrayTrees, youts, model, index, len;
  if (typeof this.network.trees !== 'undefined' && this.network.trees != null) {
    inputArrayTrees = pp.treeTransform(inputArray, this.network.trees);
    youts = [];
    for (index = 0, len = this.networks.length; index < len; index++) {
      model = this.networks[index];
      if (typeof model.trees !== 'undefined' && model.trees != null
          && model.trees) {
        // so far, model.tress = false when empty, but just in case
        youts.push(this.modelPredict(inputArrayTrees, model));
      } else {
        youts.push(this.modelPredict(inputArray, model));
      }
    }
    return this.toPrediction(net.sumAndNormalize(youts, this.regression));
  }
}


LocalDeepnet.prototype.modelPredict = function (inputArray, model) {
  /**
   * Predictions with one model
   *
   * @param {array} inputArray Input data array prepared according to
   *                           the input fields description.
   * @param {object} model Model info.
   */

  var layers, yOut, yStats;
  layers = net.initLayers(model.layers);
  yOut = net.propagate(inputArray, layers);
  if (this.regression) {
    yStats = moments(this.outputExposition);
    yOut = net.destandardize(yOut, yStats);
    return yOut[0];
  }
  if (yOut[0].constructor != Array) {
    yOut[0] = yOut[0].tolist();
  }
  return yOut;
}


LocalDeepnet.prototype.toPrediction = function (yOut) {
  /**
   * Formatting prediction in an object output
   *
   * @param {object} yOut Probabilities array
   */

  var prediction, sortedPrediction, distribution, index, len, category;

  if (this.regression) {
    return yOut;
  }
  prediction = yOut[0];
  if (prediction.constructor != Array) {
    prediction = prediction.tolist();
  }
  sortedPrediction = [];

  distribution = [];
  for (index = 0, len = this.classNames.length; index < len; index++) {
    category = this.classNames[index];
    distribution.push({category: category, probability: prediction[index]});
    sortedPrediction.push([index, prediction[index]]);
  }
  sortedPrediction.sort(function(a, b) {
      return a[1] > b[1] ? -1 : (
        a[1] < b[1] ? 1 : 0)});

  return {
    prediction: this.classNames[sortedPrediction[0][0]],
    probability: sortedPrediction[0][1],
    distribution: distribution};
}


LocalDeepnet.prototype.getUniqueTerms = function (inputData) {
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
          (tokenMode == constants.TM_ALL && (true || fullTerm != terms[0]))) {
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


LocalDeepnet.prototype.validateInput = function (inputData,
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
      newInputData = utils.cast(newInputData, this.fields,
                                this.integerInputCheck);
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


if (NODEJS) {
  module.exports = LocalDeepnet;
} else {
  exports = LocalDeepnet;
}
