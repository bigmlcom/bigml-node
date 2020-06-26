/**
 * Copyright 2017-2020 BigML
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
var sharedProtos = require(PATH + 'sharedProtos');
var net = require(PATH + 'mathOps');
var pp = require(PATH + 'preprocess');

if (NODEJS) {
  var path = require('path');
  var util = require('util');
  var fs = require('fs');
  var events = require('events');
  var Deepnet = require('./Deepnet');
  var BigML = require('./BigML');
}


// End of imports section --- DO NOT REMOVE

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
  var termOccurrences = [], index, term;

  for (index = 0; index < termsList.length; index++) {
    termOccurrences[index] = 0.0;
  }
  for (term in inputTerms) {
    if(inputTerms.hasOwnProperty(term)) {
      var index = termsList.indexOf(term);
      if (index !== -1) {
        termOccurrences[index] = inputTerms[term];
      }
    }
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

  var deepnet, self, fillStructure, objectiveField, filename;

  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new Deepnet(this.connection);
  this.resType = "deepnet";
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
  this.preprogress = undefined;
  this.optimizer = undefined;
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
        self.sortBy = sharedProtos.sortBy;
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
  util.inherits(LocalDeepnet, events.EventEmitter);
}

LocalDeepnet.prototype.predict = function (inputData,
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
  var newInputData = {}, field, prediction, validatedInput, self = this;

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

  var columns = [], termsOccurrences, fieldId, index, len, category;
  for (index = 0, len = this.inputFields.length; index < len; index++) {
    // if the field is text or items, we need to expand the field
    // in one field per term and get its frequency
    fieldId = this.inputFields[index];

    if (this.tagClouds.hasOwnProperty(fieldId)) {
      termsOccurrences = expandTerms(this.tagClouds[fieldId],
                                     uniqueTerms[fieldId] || []);
      columns = columns.concat(termsOccurrences);
    } else if (this.items.hasOwnProperty(fieldId)) {
      termsOccurrences = expandTerms(this.items[fieldId],
                                     uniqueTerms[fieldId] || []);
      columns = columns.concat(termsOccurrences);
    } else if (this.categories.hasOwnProperty(fieldId)) {
      category = uniqueTerms[fieldId];
      if (typeof category !== 'undefined') {
        category = Object.keys(category);
      } else {
        category = [category];
      }
      columns.push(category);
    } else {
      // when missing_numerics is True and the field had missings
      // in the training data, then we add a new "is missing?" element
      // whose value is 1 or 0 according to whether the field is
      // missing or not in the input data
      if (this.missingNumerics &&
          this.fields[fieldId].summary['missing_count'] > 0) {
        if (inputData.hasOwnProperty(fieldId)) {
          columns = columns.concat([inputData[fieldId], 0.0]);
        } else {
          columns = columns.concat([0.0, 1.0]);
        }
      } else {
        columns.push(inputData[fieldId])
      }
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
  } else {
    return this.predictSingle(inputArray);
  }
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
  }
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
    yStats = moments(model['output_exposition']);
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
    return { prediction : yOut };
  }
  prediction = yOut[0];
  if (prediction.constructor != Array) {
    prediction = prediction.tolist();
  }
  sortedPrediction = [];

  distribution = [];
  for (index = 0, len = this.classNames.length; index < len; index++) {
    category = this.classNames[index];
    distribution.push({category: category,
                       probability: utils.decRound(prediction[index], 5)});
    sortedPrediction.push({category: category,
                           probability: utils.decRound(prediction[index], 5)});
  }
  sortedPrediction.sort(this.sortBy("probability"));

  return {
    prediction: sortedPrediction[0]["category"],
    probability: sortedPrediction[0]["probability"],
    distribution: distribution};
}


LocalDeepnet.prototype.getUniqueTerms = function (inputData) {
  /**
   * Parses the input data to find the list of unique terms in the
   * tag cloud.
   *
   * @param {object} inputData Input data to predict
   */
  var input = JSON.parse(JSON.stringify(inputData));
  var uniqueTerms = {}, caseSensitive = true, inputDataField,
    tokenMode = 'all', terms = [], fieldId, separator, regexp,
    fullTerm;
  for (fieldId in this.termForms) {
    if (this.termForms.hasOwnProperty(fieldId) &&
        input.hasOwnProperty(fieldId)) {
      inputDataField = String(input[fieldId]);
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
      delete input[fieldId];
    }
  }
  for (fieldId in this.items) {
    if (this.items.hasOwnProperty(fieldId) &&
        input.hasOwnProperty(fieldId)) {
      regexp = utils.separatorRegexp(this.itemAnalysis[fieldId]);
      inputDataField = "";
      inputDataField = String(input[fieldId]);
      terms = inputDataField.split(new RegExp(regexp));
      uniqueTerms[fieldId] = getUniqueTerms(terms,
                                            {},
                                            this.items[fieldId]);
      delete input[fieldId];
    }
  }
  for (fieldId in this.categories) {
    if (this.categories.hasOwnProperty(fieldId) &&
        input.hasOwnProperty(fieldId)) {
      inputDataField = String(input[fieldId]);
      uniqueTerms[fieldId] = {}
      uniqueTerms[fieldId][inputDataField] = 1;
      delete input[fieldId];
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


LocalDeepnet.prototype.predictOperating = function (
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
    // deepnet only accepts the probability kind
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


LocalDeepnet.prototype.predictProbability = function (
  inputData, cb) {
  /**
   * For classification models, predicts a probability for
   *    each possible output class, based on input values.  The input
   *    fields must be a dictionary keyed by field name or field ID.
   *
   *    For regressions, the output is a single element list
   *    containing the prediction.
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
  module.exports = LocalDeepnet;
} else {
  exports = LocalDeepnet;
}
