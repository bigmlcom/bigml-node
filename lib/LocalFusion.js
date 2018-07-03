/**
 * Copyright 2018 BigML
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
  var util = require('util');
  var async = require('async');
  var events = require('events');
  var BigML = require('./BigML');
  var Resource = require(PATH + 'Resource');
}

// End of imports section --- DO NOT REMOVE



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
  var i, fillFusion, self = this, resource, filename, fillModelsInfo;
  if (!maxModels) {
    maxModels = MAX_MODELS;
  }
  this.connection = utils.getDefaultConnection(connection);
  this.modelsSplits = [];
  this.predictionsOfModels = [];
  this.ready = undefined;
  this.regression = false;
  this.fields = undefined;
  this.objectiveField = undefined;
  this.classNames = undefined;
  this.importance = [];
  this.missingNumerics = true;


  fillFusion = function (error, resource) {
    /**
     * Fills the fusion resource info
     */
    var index, len, index2, len2, categories;

    if (error) {
      throw new Error('Cannot create the Fusion instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    if (typeof resource.object !== 'undefined') {
      resource = resource.object;
    }
    self.modelIds = resource.models;
    self.distributions = resource.distributions || [];
    self.importance = resource.importance || [];
    self.missingNumerics = resource["missing_numerics"];
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
      self.sortBy = sharedProtos.sortBy;
      self.ready = true;
      if (NODEJS) {
        self.emit('ready', self);
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
                     count += maxModels;
                     if (count >= self.modelIds.length) {
                       setReady();
                     }
                   }
                 });
    };
  };

  // fusion is a fusion ID or structure
  if ((typeof fusion) === 'string' ||
      utils.getStatus(fusion).code !== constants.FINISHED) {
    // Loads the fusion when only the id is given
    try {
      self.resourceId = utils.getResource(fusion);
    } catch (err) {
      self.resourceId = undefined;
    }
    if ((typeof self.resourceId) === 'undefined') {
      // try to read a json file in the path provided by the first argument
      utils.tryStoredFile(fusion, self.resourceId.type, fillFusion);
    } else {
      // if a resource id has been found, then load the model
      // if no connection info is provided, create one default connection with
      // local storage
      filename = utils.getStoredModelFile(this, connection);
      if (filename != null) {
        return new LocalFusion(filename);
      }

      resource = new Resource(connection);
      resource.get(self.resourceId.resource, true,
                   constants.ONLY_MODEL, fillFusion);
    }
    self.on('fusionReady', fillModelsInfo);
  } else {
    // Loads the information about the fusion from the
    // entire API response.
    fillFusion(null, fusion);
    if (NODEJS) {
      fillModelsInfo(self);
    } else {
        // adds a function when the fusion information
        // has already been added. Thus models information
        // can be loaded in a two-step process after that.
        // Be careful when using this function to avoid errors
        // caused by partially filled fusion objects.
        if (typeof self.fields === 'undefined') {
          throw new Error("The fusion fields structure needs to be filled.");
        }
        self.fillModelsFromArray = function (modelsArray) {
          self.modelsSplits[0] = [];
          for (i = 0; i < modelsArray.length; i++) {
            self.modelsSplits[0].push(new LocalSupervised(modelsArray[i],
                                                          self.connection));
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
  inputData, missingStrategy, cb) {
  /**
   * For classification models, predicts a probability for
   *    each possible output class, based on input values.  The input
   *    fields must be a dictionary keyed by field name or field ID.
   *
   *    For regressions, the output is a single element list
   *    containing the prediction.
   *
   * @param {object} inputData Input data to predict
   * @param {{0|1}]} missingStrategy Strategy for missing values
   * @param {function} cb Callback
   */

  var predictions, votes, model, modelsSplit, args, addPrediction,
    prediction, self = this, len, fieldId, index1, index2,
    probabilities, createMultiVote, count = 0;
  predictions = [];
  len = this.modelsSplits.length;
  if ((typeof missingStrategy === 'function') && (typeof cb === 'undefined')) {
    cb = missingStrategy;
    missingStrategy = constants.LAST_PREDICTION;
  }

  // error if no missing numerics are allowed
  if (!self.missingNumerics) {
    utils.checkNoMissingNumerics(inputData, self.fields, self.objectiveField);
  }

  if (this.ready) {
    missingStrategy = missingStrategy || constants.LAST_PREDICTION;

    createMultiVote = function (predictions) {

      votes = new MultiVoteList(predictions);
      predictions = votes.combineToDistribution("probability");
      if (cb) {
        return cb(null, predictions);
      }
      return predictions;
    }

    addPrediction = function(error, prediction) {
      if (error) {
        return cb(error, null);
      }
      predictions.push(prediction);
      count += 1;
    }

    for (index1 in self.modelsSplits) {
        modelsSplit = self.modelsSplits[index1];
      for (index2 in modelsSplit) {
        model = modelsSplit[index2];
        try {
          args = [inputData];
          if (model.resourceId.type in ["model", "ensemble"]) {
            args.push(missingStrategy);
          }
          args.push(addPrediction);
          model.predictProbability.apply(model, args);
        } catch (e) {
          // logistic regression can raise errors if they have
          // missing_numerics=False and some numeric missings are found
          count += 1;
        }
      }
      if (count == self.modelIds.length) {
        self.predictionsOfModels = predictions;
        return createMultiVote(predictions);
      }
    }
  } else {
    this.on('ready',
            function (self) {return self.predictProbability(inputData,
                                                            missingStrategy,
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
