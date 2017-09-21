/**
 * Copyright 2013-2017 BigML
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
var PATH = NODEJS ? "./" : "";
var MODEL_OPERATING_KINDS = ["probability", "confidence"];

var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var Tree = require(PATH + 'Tree');
var BoostedTree = require(PATH + 'BoostedTree');

if (NODEJS) {
  var util = require('util');
  var fs = require('fs');
  var events = require('events');
  var Model = require('./Model');
}


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

  var model, self, fillStructure;
  this.fields = fields;
  this.invertedFields = undefined;
  this.tree = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;
  this.regression = false;
  this.boosting = false;
  this.objectiveId = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource Model's resource info
     */
    var status, fields, field, fieldInfo, rootDistribution, index, len;
    if (error) {
      throw new Error('Cannot create the Model instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
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
        self.objectiveField = resource['objective_fields'];
        // boosting models are to be handled usign the BoostedTree class
        self.boosting = resource.model.boosting;
        if (typeof self.boosting === 'undefined' ||
            (Object.keys(self.boosting).length === 0 &&
             self.boosting.constructor === Object)) {
          // boosting attribute should never be empty if set
          self.boosting = false;
        }

        if (self.boosting) {
          self.tree = new BoostedTree(resource.model.root, self.fields,
                                      self.objectiveField);
        } else {
          self.tree = new Tree(resource.model.root, self.fields,
                               self.objectiveField,
                               resource.model.distribution.training);
        }
        self.regression = ((
          !self.boosting &&
          self.fields[self.objectiveField].optype === 'numeric')
          || (self.boosting &&
              self.boosting.objective_class === null));
        if (!self.regression) {
          self.classNames = [];
          rootDistribution = self.tree.distribution;
          for (index = 0, len = rootDistribution.length; index < len; index++) {
            self.classNames.push(rootDistribution[index][0]);
          }
          self.classNames.sort();
        }
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the Model instance. Could not' +
                      ' find the \'model\' key in the resource\n');
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
            throw new Error('Failed to read local model file: ' + resource);
          }
          try {
            resource = JSON.parse(data);
            fillStructure(null, resource);
          } catch (jsonErr) {
            throw new Error('Failed to parse the JSON model in: ' + resource);
          }
        });
      } catch (errf) {
        // if no file is read, throw error reading file
        throw new Error('Cannot build a Model from this resource: ' +
                        resource);
      }
    } else {
      // if a resource id has been found, then load the model
      model = new Model(connection);
      model.get(this.resourceId.resource, true,
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
                                         operatingPoint, cb) {
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
   * @param {boolean} operatingPoint Map to set the probability or confidence
   *                                 threshold
   * @param {function} cb Callback
   */
  var prediction, validatedInput, self = this;
  if (arguments.length < 3 && (typeof missingStrategy === 'function')) {
    // downgrading gently to old syntax with no missingStrategy
    return self.predict(inputData, undefined, false, false, missingStrategy);
  }
  if (arguments.length < 4 && (typeof median === 'function')) {
    // downgrading gently to old syntax with no median
    return self.predict(inputData, missingStrategy, false, false, median);
  }
  if (arguments.length < 5 && (typeof addUnusedFields === 'function')) {
    // downgrading gently to old syntax with no addUnusedFields
    return self.predict(inputData, missingStrategy, median, false,
                        addUnusedFields);
  }
  if (arguments.length < 6 && (typeof operatingPoint === 'function')) {
    // downgrading gently to old syntax with no operatingPoint
    return self.predict(inputData, missingStrategy, median, addUnusedFields,
                        false, operatingPoint);
  }

  if (typeof operatingPoint !== 'undefined') {
    return self.predictOperating(
      inputData, missingStrategy, operatingPoint, cb);
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
    if (self.boosting) {
      // the prediction needs some final computations
      prediction = self.tree.predict(data.inputData, null,
                                     missingStrategy);
      prediction = self.boostingPrediction(prediction, missingStrategy);
    } else {
      prediction = self.tree.predict(data.inputData, null, missingStrategy,
                                     median, true, []);
    }
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
      if (self.boosting) {
        prediction = self.tree.predict(validatedInput.inputData, null,
                                       missingStrategy);
        prediction = self.boostingPrediction(prediction, missingStrategy);
      } else {
        prediction = this.tree.predict(validatedInput.inputData,
                                       null,
                                       missingStrategy,
                                       median,
                                       true,
                                       []);
      }
      if (addUnusedFields) {
        prediction.unusedFields = validatedInput.unusedFields;
      }
      return prediction;
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
   *    :param input_data: Input data to be predicted
   *    :param by_name: Boolean that is set to True if field_names (as
   *                    alternative to field ids) are used in the
   *                    input_data dict
   *    :param missing_strategy: LAST_PREDICTION|PROPORTIONAL missing strategy
   *                             for missing fields
   *    :param compact: If False, prediction is returned as a list of maps, one
   *                    per class, with the keys "prediction" and "probability"
   *                    mapped to the name of the class and it's probability,
   *                    respectively.  If True, returns a list of probabilities
   *                    ordered by the sorted order of the class names.
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {0|1} missingStrategy Code for the missing strategy to be used
   * @param {boolean} compact If False, prediction is returned as a
   *                          list of maps, one per class, with the keys
   *                          "prediction" and "probability" mapped to the
   *                          name of the class and it's probability,
   *                          respectively.  If True, returns a list of
   *                          probabilities ordered by the sorted order
   *                          of the class names.
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
      var output = [], instances = 1.0, k,
        rootDistribution = self.tree.distribution,
        categoryMap = {}, distribution = prediction.distribution, index,
        len = rootDistribution.length, total = 0.0;

      if (error) {
        return cb(error, null);
      }
      if (self.regression) {
        output = {"prediction": prediction};
      } else {
        if (self.tree.weighted) {
          for (index = 0; index < len; index++) {
            categoryMap[rootDistribution[index][0]] = 0.0;
          }
        } else {
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
            output.push({"prediction": k,
                         "probability": categoryMap[k] /= instances});
          } else {
            output.push({"prediction": k,
                         "probability": 0.0});
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
   *   :param input_data: Input data to be predicted
   *   :param by_name: Boolean that is set to True if field_names (as
   *                    alternative to field ids) are used in the
   *                    input_data dict
   *    :param missing_strategy: LAST_PREDICTION|PROPORTIONAL missing strategy
   *                             for missing fields
   *    :param compact: If False, prediction is returned as a list of maps, one
   *                    per class, with the keys "prediction" and "probability"
   *                    mapped to the name of the class and it's probability,
   *                    respectively.  If True, returns a list of probabilities
   *                    ordered by the sorted order of the class names.
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {0|1} missingStrategy Code for the missing strategy to be used
   * @param {boolean} compact If False, prediction is returned as a
   *                          list of maps, one per class, with the keys
   *                          "prediction" and "probability" mapped to the
   *                          name of the class and it's probability,
   *                          respectively.  If True, returns a list of
   *                          probabilities ordered by the sorted order
   *                          of the class names.
   */
  var prediction, self = this;
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
        categoryMap = {}, distribution = prediction.distribution, index,
        len = distribution.length, total = 0.0;

      if (error) {
        return cb(error, null);
      }
      if (self.regression || self.boosting) {
        throw new Error("This method is available for non-boosting" +
                        " categorization models only.")
      }
      len = distribution.length;
      for (index = 0; index < len; index++) {
        categoryMap[distribution[index][0]] = distribution[index][1];
      }
      for (index = 0, len = self.classNames.length; index < len; index++) {
        k = self.classNames[index];
        if (categoryMap.hasOwnProperty(k) && instances > 0) {
          output.push({"prediction": k,
                       "confidence": utils.wsConfidence(k, categoryMap)});
        } else {
          output.push({"prediction": k,
                       "confidence": 0.0});
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

LocalModel.prototype.predictOperating = function (
  inputData, missingStrategy, operatingPoint, cb) {
  /**
   * For classification models, predicts using the operation point
   *    defined by a positive class and some threshold and
   *    based on input values.  The input
   *    fields must be a dictionary keyed by field name or field ID.
   *
   *    For regressions, the output is a single element list
   *    containing the prediction.
   *
   * @param {object} inputData Input data to predict
   * @param {{0|1}]} missingStrategy Strategy for missing values
   * @param {object} operatingPoint Operating point definition. The object
   *                                should contain a positiveClass and
   *                                either a probabilityThreshold,
   *                                confidenceThreshold or a
   *                                kThreshold
   * @param {function} cb Callback
   */

  var positiveClass, kind, threshold, predictMethod, issuePrediction,
    prediction, predictions, position, index, sortFn, self=this;

  if ((typeof missingStrategy === 'function') && (typeof cb === 'undefined')) {
    cb = missingStrategy;
    missingStrategy = constants.LAST_PREDICTION;
  }
  if ((typeof operatingPoint === 'function') && (typeof cb === 'undefined')) {
    cb = operatingPoint;
  }

  if (this.ready) {
    missingStrategy = missingStrategy || constants.LAST_PREDICTION;
    utils.checkOperatingPoint(operatingPoint,
                              MODEL_OPERATING_KINDS,
                              this.classNames);
    positiveClass = operatingPoint.positiveClass;
    kind = operatingPoint.kind;
    predictMethod = "predict" + kind.charAt(0).toUpperCase() + kind.slice(1)
    threshold = operatingPoint.threshold;
    issuePrediction = function(error, predictions) {
      position = self.classNames.indexOf(positiveClass);
      if (predictions[position][kind] < threshold) {
        // if the threshold is not met, the alternative class with
        // highest probability or confidence is returned
        sortFn = function (a, b) {
          return b[kind] - a[kind];}
        predictions.sort(sortFn);
        prediction = (predictions[0]["prediction"] == positiveClass) ? predictions[1] : predictions[0];
      } else {
        prediction = predictions[position];
      }
      if (cb) {
        cb(null, prediction);
      } else {
        return prediction;
      }
    }
    if (cb) {
      this[predictMethod](inputData, missingStrategy, issuePrediction);
    } else {
      return issuePrediction(null,
                             this[predictMethod](inputData, missingStrategy));
    }

  } else {
    this.on('ready',
            function (self) {return self.predictOperating(inputData,
                                                          missingStrategy,
                                                          operatingPoint,
                                                          cb); });
    return;
  }
};

if (NODEJS) {
  module.exports = LocalModel;
} else {
  exports = LocalModel;
}
