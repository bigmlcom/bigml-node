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
var PATH = NODEJS ? "./" : "";

var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var Tree = require(PATH + 'Tree');
var BoostedTree = require(PATH + 'BoostedTree');
var sharedProtos = require(PATH + 'sharedProtos');

if (NODEJS) {
  var util = require('util');
  var fs = require('fs');
  var path = require('path');
  var events = require('events');
  var Model = require('./Model');
  var BigML = require('./BigML');
}


// End of imports section --- DO NOT REMOVE

var MODEL_OPERATING_KINDS = ["probability", "confidence"];


/**
 * LocalModel: Simplified local object for the model resource.
 * @constructor
 */
function LocalModel(resource, connection, fields) {
  /**
   * Constructor for the LocalModel local object.
   *
   * @param {string|object} resource BigML model resource, resource id or
   *                        the path to a JSON file containing a BigML model
   *                        resource
   * @param {object} connection BigML connection
   * @param {object} fields Inherited fields structure (ensembles)
   */

  var model, self, fillStructure, filename;
  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new Model(this.connection);
  this.resType = "model";
  this.fields = fields;
  this.invertedFields = undefined;
  this.tree = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;
  this.isRegression = false;
  this.boosting = false;
  this.objectiveField = undefined;
  this.opKinds = MODEL_OPERATING_KINDS;
  this.classNames = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource Model's resource info
     */
    var status, fields, field, fieldInfo, rootDistribution, index,
      categories, len;
    if (error) {
      throw new Error('Cannot create the Model instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    try {
    self.resourceId = utils.getResource(resource);
    if ((typeof self.resourceId) === 'undefined') {
      throw new Error('Cannot build a Model from this resource: ' + resource);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }
    if ((typeof resource.model) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        if (typeof self.fields === 'undefined') {
          if ((typeof resource.model['model_fields']) !== 'undefined') {
            fields = resource.model['model_fields'];
            for (field in fields) {
              if (fields.hasOwnProperty(field)) {
                if (!resource.model.fields.hasOwnProperty(field)) {
                  throw new Error('Some fields are missing to generate a ' +
                                  'local model.\nPlease provide a model ' +
                                  'with the complete list of fields');
                }
                fieldInfo = resource.model.fields[field];
                fields[field].summary = fieldInfo.summary;
                fields[field].name = fieldInfo.name;
              }
            }
          } else {
            fields = resource.model.fields;
          }
          self.fields = fields;
        }
        self.invertedFields = utils.invertObject(self.fields);
        self.objectiveField = resource['objective_fields'][0];
        // boosting models are to be handled usign the BoostedTree class
        self.boosting = resource.model.boosting;
        if (typeof self.boosting === 'undefined' ||
            (Object.keys(self.boosting).length === 0 &&
             self.boosting.constructor === Object)) {
          // boosting attribute should never be empty if set
          self.boosting = false;
        }
        self.isRegression = ((
          !self.boosting &&
          self.fields[self.objectiveField].optype === 'numeric')
          || (self.boosting &&
              self.boosting.objective_class === null));
        if (self.boosting) {
          self.tree = new BoostedTree(resource.model.root, self.fields,
                                      self.objectiveField);
        } else {
          self.tree = new Tree(resource.model.root, self.fields,
                               self.objectiveField,
                               resource.model.distribution.training);
          if (!self.isRegression) {
            if (typeof self.classNames === 'undefined') { // classNames can
                // be set by an outer container, like ensembles
              try {
                categories = self.fields[self.objectiveField].summary.categories;
                len = categories.length;
                self.classNames = [];
                for (index = 0; index < len; index++) {
                  self.classNames.push(categories[index][0]);
                }
              } catch(err) {
                self.classNames = [];
                rootDistribution = self.tree.distribution;
                for (index = 0, len = rootDistribution.length; index < len; index++) {
                  self.classNames.push(rootDistribution[index][0]);
                }
              }
              self.classNames.sort();
            }
          }
        }
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.sortBy = sharedProtos.sortBy;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      } else {
          throw new Error('Cannot create the Model instance. Only models' +
                          ' correctly finished can be used. The model status' +
                          ' is currently: ' +
                          constants.STATUS["S" + status.code] + '\n');
      }
    } else {
      throw new Error('Cannot create the Model instance. Could not' +
                      ' find the \'model\' key in the resource\n');
    }
    } catch (err) {console.log(err);}
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
  util.inherits(LocalModel, events.EventEmitter);
}


LocalModel.prototype.boostingPrediction = function (prediction,
                                                    missingStrategy) {
  /**
   * The boosting predictions add the weight and class of the boosting models
   * to be used in ensemble's combinator
   *
   * @param {object} prediction Object as returned by the BoostedTree
   * @param {0|1} missingStrategy Strategy: LAST_PREDICTION or PROPORTIONAL
   */
  if (missingStrategy === constants.PROPORTIONAL) {
    prediction = {
      'prediction': -prediction.gSums / (prediction.hSums +
                                          this.boosting.lambda),
      'path': prediction.path,
      'probability': undefined,
      'distribution': undefined,
      'count': prediction.count,
      'nextPredicates': undefined
    };
  }
  prediction.weight = this.boosting.weight;
  if (typeof this.boosting.objective_class !== 'undefined') {
    prediction.objClass = this.boosting.objective_class;
  }
  return prediction;
}


LocalModel.prototype.predict = function (inputData, missingStrategy,
                                         median, addUnusedFields,
                                         operatingPoint,
                                         operatingKind,
                                         cb) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {0|1} missingStrategy Code for the missing strategy to be used
   * @param {boolean} median Boolean to use median instead of mean in
   *                  predictions
   * @param {boolean} addUnusedFields Boolean to add the information of fields
   *                                  in input data
   * @param {map} operatingPoint Map to set the probability or confidence
   *                             threshold
   * @param {string} operatingKind String (probabiity or confidence) to set the
   *                               quantity that decides the prediction
   * @param {function} cb Callback
   */
  var prediction, validatedInput, self = this;
  if (arguments.length < 3 && (typeof missingStrategy === 'function')) {
    // downgrading gently to old syntax with no missingStrategy
    return self.predict(inputData, undefined, false, false, false, false,
                        missingStrategy);
  }
  if (arguments.length < 4 && (typeof median === 'function')) {
    // downgrading gently to old syntax with no median
    return self.predict(inputData, missingStrategy, false, false, false,
                        false, median);
  }
  if (arguments.length < 5 && (typeof addUnusedFields === 'function')) {
    // downgrading gently to old syntax with no addUnusedFields
    return self.predict(inputData, missingStrategy, median, false, false,
                        false,
                        addUnusedFields);
  }
  if (arguments.length < 6 && (typeof operatingPoint === 'function')) {
    // downgrading gently to old syntax with no operatingPoint
    return self.predict(inputData, missingStrategy, median, addUnusedFields,
                        false, false, operatingPoint);
  }
  if (arguments.length < 7 && (typeof operatingKind === 'function')) {
    // downgrading gently to old syntax with no operatingKind
    return self.predict(inputData, missingStrategy, median, addUnusedFields,
                        operatingPoint, false, operatingKind);
  }

  if (typeof operatingPoint !== 'undefined' && operatingPoint) {
    return self.predictOperating(
      inputData, missingStrategy, operatingPoint, cb);
  }

  if (typeof operatingKind !== 'undefined' && operatingKind) {
    return self.predictOperatingKind(
      inputData, missingStrategy, operatingKind, cb);
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
    var probabilities, probability, len, index;
    if (error) {
      if (cb) {
        return cb(error, null);
      } else {
        return error;
      }
    }
    if (self.boosting) {
      // the prediction needs some final computations
      prediction = self.tree.predict(data.inputData, null,
                                     missingStrategy);
      prediction = self.boostingPrediction(prediction, missingStrategy);
    } else {
      prediction = self.tree.predict(data.inputData, null, missingStrategy,
                                     median, true, []);
      if (!self.isRegression) {
        probabilities = self.probabilities(prediction);
        for (index = 0, len = probabilities.length; index < len; index++) {
          if (probabilities[index].category == prediction.prediction) {
            prediction.probability = probabilities[index].probability;
            break;
          }
        }
      }
    }
    if (addUnusedFields) {
      prediction.unusedFields = data.unusedFields;
    }
    if (cb) {
      return cb(null, prediction);
    } else {
      return prediction;
    }
  }
  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, addUnusedFields, createLocalPrediction);
    } else {
      validatedInput = this.validateInput(inputData, addUnusedFields);
      return createLocalPrediction(null, validatedInput);
    }
  } else {
    this.on('ready', function (self) {
      return self.predict(inputData, missingStrategy, median, cb);
    });
    return;
  }
};

LocalModel.prototype.validateInput = function (inputData,
                                               addUnusedFields,
                                               cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {boolean} addUnusedFields Causes the validation to return the
   *                                  list of fields in inputData that are
   *                                  not used
   * @param {function} cb Callback
   */
  var newInputData = {}, field, inputDataKey, unusedFields = [];
  // backward compatibility for previous code with no addUnusedFields argument
  if (typeof addUnusedFields === "function") {
    cb = addUnusedFields;
    addUnusedFields = false;
  }
  if (this.ready) {
    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        if (inputData[field] === null ||
            (typeof this.fields[field] === 'undefined' &&
             typeof this.invertedFields[field] === 'undefined') ||
             (typeof this.fields[field] !== 'undefined' &&
              this.tree.objectiveField === field) ||
             (typeof this.invertedFields[field] !== 'undefined' &&
              this.tree.objectiveField === this.invertedFields[field])) {
          if (inputData[field] !== null) {
            unusedFields.push(field);
          }
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
      return cb(null, {inputData: newInputData,
                       unusedFields : unusedFields});
    }
    return {inputData: newInputData, unusedFields: unusedFields};
  }
  this.on('ready', function (self) {
    return self.validateInput(inputData, addUnusedFields, cb);
  });
  return;
};


LocalModel.prototype.probabilities = function (prediction) {
  /**
   * For classification models: computes the probability using
   * a laplacian term from a prediction distribution
   *
   * @param {object} prediction The predicted node information
   */
  var self = this,
      output = [],
      rootDistribution = self.tree.distribution,
      distribution = self.tree.weighted ? prediction.weightedDistribution : prediction.distribution,
      categoryMap = {},
      len = rootDistribution.length,
      instances = 0.0,
      total = 0.0,
      k, index;

  if (self.tree.weighted) {
    for (index = 0; index < len; index++) {
      categoryMap[rootDistribution[index][0]] = 0.0;
    }
  } else {
    instances = 1.0;
    // distribution in the root node
    for (index = 0; index < len; index++) {
      total += rootDistribution[index][1];
      categoryMap[rootDistribution[index][0]] = rootDistribution[index][1];
    }
    for (index = 0; index < len; index++) {
      categoryMap[rootDistribution[index][0]] /= total;
    }
  }

  // distribution in the node
  len = distribution.length;
  for (index = 0; index < len; index++) {
    categoryMap[distribution[index][0]] += distribution[index][1];
    instances += distribution[index][1];
  }
  for (index = 0, len = self.classNames.length; index < len; index++) {
    k = self.classNames[index];
    if (categoryMap.hasOwnProperty(k) && instances > 0) {
      output.push({"category": k,
                   "probability": utils.decRound(
                      categoryMap[k] /= instances, 5)});
    } else {
      output.push({"category": k,
                   "probability": 0.0});
    }
  }
  return output;
}

LocalModel.prototype.predictProbability = function (inputData, missingStrategy,
                                                    cb) {
  /**
   * For classification models, Predicts a probability for
   *    each possible output class, based on input values.  The input
   *    fields must be a dictionary keyed by field name for field ID.
   *
   *    For regressions, the output is a single element list
   *    containing the prediction.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {0|1} missingStrategy Code for the missing strategy to be used
   * @param {function} cb Callback
   */
  var prediction, self = this;
  if (arguments.length < 2 && (typeof missingStrategy === 'function')) {
    return self.predictProbability(inputData, undefined, missingStrategy);
  }

  function syncPredictProbability(error, prediction) {
    /**
     * Creates a local prediction using the model's tree info.
     *
     * @param {object} error Error message
     * @param {object} prediction Regular prediction information.
     */
    var output = [];

    if (error) {
      return cb(error, null);
    }
    if (self.isRegression) {
      output = prediction;
    } else {
      output = self.probabilities(prediction);
    }
    if (cb) {
      return cb(null, output);
    }
    return output;
  }

  if (this.ready) {
    if (cb) {
      this.predict(inputData, missingStrategy, false, false,
                   syncPredictProbability);
    } else {
      prediction = syncPredictProbability(null,
        this.predict(inputData, missingStrategy, false, false, undefined));
      return prediction;
    }
  } else {
    this.on('ready', function (self) {
      return self.predictProbability(inputData, missingStrategy, cb);
    });
    return;
  }
};

LocalModel.prototype.predictConfidence = function (inputData, missingStrategy,
                                                   cb) {
  /**
   * For classification models only, predicts a confidence for
   *    each possible output class, based on input values.  The input
   *    fields must be a dictionary keyed by field name for field ID.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {0|1} missingStrategy Code for the missing strategy to be used
   * @param {function} cb Callback
   */
  var prediction, self = this, distribution;
  if (arguments.length < 2 && (typeof missingStrategy === 'function')) {
    return self.predictConfidence(inputData, undefined, missingStrategy);
  }

  function syncPredictConfidence(error, prediction) {
    /**
     * Creates a local prediction using the model's tree info.
     *
     * @param {object} error Error message
     * @param {object} prediction Regular prediction information.
     */
    var output = [], instances = 1.0, k,
      distribution = self.tree.weighted ? prediction.weightedDistribution : prediction.distribution,
      categoryMap = {}, index,
      len = distribution.length, total = 0.0;

    if (error) {
      return cb(error, null);
    }
    if (self.isRegression) {
        output = prediction;
    }
    else if (self.boosting) {
      throw new Error("This method is available for non-boosting" +
                      " models only.")
    } else {
      len = distribution.length;
      for (index = 0; index < len; index++) {
        categoryMap[distribution[index][0]] = distribution[index][1];
      }
      for (index = 0, len = self.classNames.length; index < len; index++) {
        k = self.classNames[index];
        if (categoryMap.hasOwnProperty(k) && instances > 0) {
          output.push({"category": k,
                       "confidence": utils.wsConfidence(k, categoryMap,
                                                        prediction.count)});
        } else {
          output.push({"category": k,
                       "confidence": 0.0});
        }
      }
    }
    if (cb) {
      return cb(null, output);
    }
    return output;
  }

  if (this.ready) {
    if (cb) {
      this.predict(inputData, missingStrategy, false, false,
                   syncPredictConfidence);
    } else {
      prediction = syncPredictConfidence(null,
        this.predict(inputData, missingStrategy, false, false, undefined));
      return prediction;
    }
  } else {
    this.on('ready', function (self) {
      return self.predictConfidence(inputData, missingStrategy, cb);
    });
    return;
  }
};


LocalModel.prototype.predictOperating = sharedProtos.predictOperating;

LocalModel.prototype.predictOperatingKind = sharedProtos.predictOperatingKind;


if (NODEJS) {
  module.exports = LocalModel;
} else {
  exports = LocalModel;
}
