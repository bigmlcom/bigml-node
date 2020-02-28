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

var OPERATING_POINT_KINDS = ["probability"];
var LOCAL_SUPERVISED = ["model", "ensemble", "logisticregression", "deepnet",
                        "fusion"];
var MAX_MODELS = 10;

var LocalSupervised = require(PATH + 'LocalSupervised');
var MultiVoteList = require(PATH + 'MultiVoteList');
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var sharedProtos = require(PATH + 'sharedProtos');


if (NODEJS) {
  var path = require('path');
  var fs = require('fs');
  var util = require('util');
  var async = require('async');
  var events = require('events');
  var BigML = require('./BigML');
  var Resource = require(PATH + 'Resource');
}

// End of imports section --- DO NOT REMOVE



function getModelsWeight(modelsInfo) {
  /**
   * Parses the information about model ids and weights in the `models`
   * key of the fusion dictionary. The contents of this key can be either
   * list of the model IDs or a list of dictionaries with one entry per
   * model.
   *
   * @param {list} modelsInfo List of model IDs or objects. When objects,
   *               the attributes need to contain "id" and "weight".
   */
  var modelIds = [],
   weights = [],
   index = 0,
   modelInfo,
   len = modelsInfo.length;

  try {
    modelInfo = modelsInfo[0];
    if (typeof modelInfo === 'object') {
      try {
        for (index = 0; index < len; index++) {
          modelIds.push(modelsInfo[index].id);
        }
      } catch (err) {
        throw new Error("The fusion information does not contain the model" +
                        " ids.");
      }
      try {
        for (index = 0; index < len; index++) {
          weights.push(modelsInfo[index].weight);
        }
      } catch (err) {
         weights = new Array(modelIds.length).fill(1);
      }
    } else {
      modelIds = modelsInfo;
      weights = new Array(modelIds.length).fill(1);
    }
    return {"modelIds": modelIds, "weights": weights};

  } catch (e) {
    throw new Error("Failed to find the models in the fusion info.");
  }
};


/**
 * LocalFusion: Simple class for fusion's local predictions
 * @constructor
 */
function LocalFusion(fusion, connection, maxModels) {
  /**
   * Constructor for the local fusion object
   *
   * @param {string|object} fusion BigML fusion id, resource or file path
   * @param {object} connection BigML connection
   * @param {integer} maxModels number of models to be used in parallel
   *        in predictions
   */
  var i, fillFusion, self = this, resource, filename, fillModelsInfo,
   localModel;
  if (!maxModels) {
    maxModels = MAX_MODELS;
  }
  this.connection = utils.getDefaultConnection(connection);
  this.modelsSplits = [];
  this.predictionsOfModels = [];
  this.fusionReady = undefined;
  this.ready = undefined;
  this.regression = false;
  this.fields = undefined;
  this.objectiveField = undefined;
  this.classNames = undefined;
  this.importance = [];
  this.missingNumerics = true;
  this.modelsReady = [];


  fillFusion = function (error, resource) {
    /**
     * Fills the fusion resource info
     */
    var index, len, index2, len2, categories, modelsInfo;

    if (error) {
      throw new Error('Cannot create the Fusion instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    if (typeof resource.object !== 'undefined') {
      resource = resource.object;
    }
    modelsInfo = getModelsWeight(resource.models);
    self.modelIds = modelsInfo["modelIds"];
    self.weights = modelsInfo["weights"];
    self.modelsReady = [];
    for (index = 0; index < self.modelIds.length; index++) {
      self.modelsReady.push(false);
    }
    self.distributions = resource.distributions || [];
    self.importance = resource.importance || [];
    self.missingNumerics = resource["missing_numerics"];
    if (typeof self.missingNumerics === 'undefined') {
      self.missingNumerics = true;
    }
    if (typeof resource.fusion !== 'undefined') {
        self.fields = resource.fusion.fields;
        self.objectiveField = resource['objective_field'];
        self.regression = (self.fields[self.objectiveField].optype ==
                           constants.NUMERIC);
    }

    if (!self.regression) {
      categories = self.fields[self.objectiveField].summary.categories;
      len = categories.length;
      self.classNames = [];
      for (index = 0; index < len; index++) {
        self.classNames.push(categories[index][0]);
      }
      self.classNames.sort();
    }

    self.fusionReady = true;
    if (NODEJS) {
      self.emit('fusionReady', self);
    }
  };

  fillModelsInfo = function (self) {
    /**
     * Fills the modelsSplits array with the models associated to a
     * fusion id.
     */
    var localModel, modelIds = [], count = 0, index = 0;

    function setReady() {
      if (self.modelsReady.every(function(item){return item;})) {
        self.sortBy = sharedProtos.sortBy;
        if (!self.ready) {
          self.ready = true;
          if (NODEJS) {
            self.emit('ready', self);
          }
        }
      }
    }

    for (i = 0; i < self.modelIds.length; i += maxModels) {
      modelIds = self.modelIds.slice(i, i + maxModels);
      async.each(modelIds,
                 function (modelId, done) {
                   // fusions can contain fusions
                   if (modelId.indexOf('fusion') > -1) {
                     localModel = new LocalFusion(modelId, self.connection);
                   } else {
                     localModel = new LocalSupervised(modelId, self.connection);
                   }
                   if (localModel.ready) {
                     self.modelsReady[self.modelIds.indexOf(modelId)] = true;
                     setReady();
                   } else {
                     localModel.on('ready',
                       function (child) {self.modelsReady[
                        self.modelIds.indexOf(modelId)] = true;
                        setReady();});
                   }
                   if (self.weights != null) {
                     localModel.weight = self.weights[
                       self.modelIds.indexOf(modelId)];
                   }
                   if (typeof self.classNames !== 'undefined') {
                      localModel.classNames = self.classNames;
                    }
                   index = parseInt(i / maxModels, 10);
                   if (typeof self.modelsSplits[index] === 'undefined') {
                     self.modelsSplits[index] = [];
                   }
                   self.modelsSplits[index].push(localModel);
                   done();
                 },
                 function (err) {
                   if (err == null) {
                     setReady();
                   }
                 });
    };
  };

  // fusion is a fusion ID or structure
  if ((typeof fusion) === 'string' ||
      utils.getStatus(fusion).code !== constants.FINISHED) {

    resource = fusion;
    self.on('fusionReady', fillModelsInfo);

    filename = null;
    if (typeof resource === 'string') {
      // When the argument contains the path to a JSON file
      if (fs.existsSync(resource)) {
        filename = resource;
      } else if (typeof this.connection.storage === 'string') {
      // Loads from file in local fs directory
      filename = utils.getStoredModelFile(resource, this.connection);
        if (!fs.existsSync(filename)) {
          filename = null;
        }
      }
    }
    if (filename != null) {
      // try to read a json file in the path provided by the first argument
      resource = utils.tryStoredFile(filename, "fusion");
      try {
        self.resourceId = utils.getResource(resource);
      } catch (e) {
        this.resourceId = undefined;
        throw new Error("Looking for the local copy of the fusion" +
                        "No valid fusion information found in " +
                        filename);
      }
      // loads when the entire resource is given
      fillFusion(null, resource);
    } else if (typeof self.connection.storage === 'object' &&
               self.connection.storage != null &&
               typeof self.connection.storage.get === 'function') {

      self.resourceId = utils.getResource(resource);
      try {
        utils.getFromCache(self.resourceId,
                           self.connection.storage,
                           function (error, data) {
                             if (error || typeof data === 'undefined') {
                               utils.getFromBigML(self.resourceId,
                                                  new Resource(self.connection),
                                                  fillFusion);
                             } else {
                               if (typeof data === 'string') {
                                 data = JSON.parse(data);
                               }
                               fillFusionInfo(null, data)}});
      } catch (e) {
        utils.getFromBigML(self.resourceId,
                          new Resource(this.connection),
                          fillFusion);
      }
    } else {
      self.resourceId = utils.getResource(resource);
      utils.getFromBigML(self.resourceId,
                         new Resource(self.connection),
                         fillFusion);
    }
  } else {
    // Loads the information about the fusion from the
    // entire API response.
    fillFusion(null, fusion);
    if (NODEJS) {
      if (self.fusionReady) {
        fillModelsInfo(self);
      } else {
        self.on('fusionReady', fillModelsInfo);
      }
    } else {
        // adds a function when the fusion information
        // has already been added. Thus models information
        // can be loaded in a two-step process after that.
        // Be careful when using this function to avoid errors
        // caused by partially filled fusion objects.
        if (typeof self.fields === 'undefined') {
          throw new Error("The fusion fields structure needs to be filled.");
        }
        self.fillModelsFromArray = function (modelsArray, weights) {
          self.modelsSplits[0] = [];
          for (i = 0; i < modelsArray.length; i++) {
            if (modelId.indexOf('fusion') > -1) {
               localModel = new LocalFusion(modelsArray[i], self.connection);
            } else {
              localModel = new LocalSupervised(modelsArray[i], self.connection);
            }
            if (typeof weights !== 'undefined') {
              localModel.weight = weights[i];
            }
            self.modelsSplits[0].push(localModel);
          }
          self.sortBy = sharedProtos.sortBy;
          self.ready = true;
        };
    }
  }
  if (NODEJS) {
    events.EventEmitter.call(this);
  }
}


LocalFusion.prototype.predictProbability = function (
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
   */

  var predictions, votes, model, modelsSplit, weightPrediction,
    prediction, self = this, len, fieldId, index1, index2, weight,
    probabilities, createMultiVote, count = 0, totalWeight = 0.0;
  predictions = [];
  len = this.modelsSplits.length;


  if (this.ready) {

    // error if no missing numerics are allowed
    if (!self.missingNumerics) {
      utils.checkNoMissingNumerics(inputData, self.fields, self.objectiveField);
    }

    createMultiVote = function (predictions) {
      try {
      if (self.regression) {
        if (typeof self.weights !== 'undefined' && self.weights.length > 0) {
          for (index1 = 0, len = self.weights.length; index1 < len; index1++) {
            totalWeight += self.weights[index1];
          }
        } else {
          totalWeight = predictions.length;
        }

        prediction = 0
        for (index1 = 0, len = predictions.length; index1 < len; index1++) {
          prediction += predictions[index1].prediction * self.weights[index1];
        }
        if (cb) {
          return cb(null, {prediction: prediction / totalWeight});
        }
        return {prediction: prediction / totalWeight};
      } else {
        votes = new MultiVoteList(predictions);
        predictions = votes.combineToDistribution("probability");
        if (cb) {
          return cb(null, predictions);
        }
        return predictions;

      }
      } catch(e) {console.log(e);}
    }

    weightPrediction = function(weight, prediction) {

      try {
        if (typeof prediction[0] === 'object') {
          len = prediction.length;
          for (index1 = 0; index1 < len; index1++) {
            prediction[index1]["probability"] *= weight;
          }
        }
      } catch (e) {
        prediction *= weight;
      }
      return prediction;
    }

    for (index1 in self.modelsSplits) {
      modelsSplit = self.modelsSplits[index1];
      for (index2 in modelsSplit) {
        model = modelsSplit[index2];
        try {
          if (self.weights != null) {
            weight = self.weights[self.modelIds.indexOf(model.resourceId.resource)];
          } else {
            weight = 1;
          }
          predictions.push(weightPrediction(
            weight, model.predictProbability(inputData)));
          count += 1;
          if (count == self.modelIds.length) {
            self.predictionsOfModels = predictions;
            return createMultiVote(predictions);
          }
        } catch (e) {
          // logistic regression can raise errors if they have
          // missing_numerics=False and some numeric missings are found
          count += 1;
          if (count == self.modelIds.length) {
            self.predictionsOfModels = predictions;
            return createMultiVote(predictions);
          }
        }
      }

    }
  } else {
    this.on('ready',
            function (self) {return self.predictProbability(inputData, cb); });
  return;
  }
};

LocalFusion.prototype.predict = function (inputData,
                                          operatingPoint,
                                          cb) {

  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {object} operatingPoint Operating point to be used in predictions
   * @param {function} cb Callback
   */
  var newInputData = {}, field, prediction, validatedInput, self = this;

  // backward compatibility for previous code with no operatingPoint argument
  if (typeof operatingPoint === "function") {
    cb = operatingPoint;
    operatingPoint = undefined;
  }

  if (typeof operatingPoint !== 'undefined' &&
      operatingPoint != null && operatingPoint) {
    if (self.regression) {
      throw new Error("The operating_point argument can only be" +
                      " used in classifications.");
    }
    return this.predictOperating(
      inputData, operatingPoint, cb);
  }

  function createLocalPrediction(error, predictions) {
    /**
     * Creates a local prediction using the model's tree info.
     *
     * @param {object} error Error message
     * @param {object} predictions Distribution of predicted categories and
     *                             probabilities
     */

    var prediction, sortFn;

    if (error) {
      return cb(error, null);
    }
    if (!self.regression) {
      sortFn = function (a, b) {
        return (a["probability"] > b["probability"]) ? -1 : (a["probability"] < b["probability"]) ? 1 : (b["category"] > a["category"]) ? -1 : 1;}
      predictions.sort(sortFn);
      prediction = {"prediction": predictions[0]["category"],
                    "probability": predictions[0]["probability"],
                    "distribution": predictions};

    } else {
      prediction = predictions;
    }
    if (cb) {
      return cb(null, prediction);
    } else {
      return prediction;
    }
  }
  if (this.ready) {
    if (cb) {
      return this.predictProbability(inputData, createLocalPrediction);
    } else {
      prediction = createLocalPrediction(null,
                                         this.predictProbability(inputData));
      return prediction;
    }
  } else {
    this.on('ready', function (self) {
      return self.predict(inputData, operatingPoint, cb);
    });
    return;
  }
};


LocalFusion.prototype.predictOperating = function (
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






if (NODEJS) {
  util.inherits(LocalFusion, events.EventEmitter);
}

if (NODEJS) {
  module.exports = LocalFusion;
} else {
  exports = LocalFusion;
}
