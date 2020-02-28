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
var PATH = (NODEJS) ? "./" : "";

var LocalModel = require(PATH + 'LocalModel');
var MultiVote = require(PATH + 'MultiVote');
var MultiVoteList = require(PATH + 'MultiVoteList');
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var sharedProtos = require(PATH + 'sharedProtos');


if (NODEJS) {
  var path = require('path');
  var fs = require('fs');
  var util = require('util');
  var events = require('events');
  var Model = require('./Model');
  var Ensemble = require('./Ensemble');
  var BigML = require('./BigML');
}

// End of imports section --- DO NOT REMOVE

var MAX_MODELS = 200;
var BOOSTING = 1;
var REGRESSION_BOOSTING_OFFSET_DFT = 0;
var CLASSIFICATION_BOOSTING_OFFSET_DFT = {};
var ENSEMBLE_OPERATING_KINDS = ["probability", "confidence", "votes"];
var VOTES_METHOD = 0;
var CONFIDENCE_METHOD = 1;
var PROBABILITY_METHOD = 2;


function toMap(arrayOfPairs) {
  /**
   * Auxiliary function to build a map from the list of
   * category, offset pairs
   *
   * @param {array} arrayOfPairs list of [category, offset] pairs
   */
  var index, len = arrayOfPairs.length, map = {}, pair = Array();
  for (index = 0; index < len; index++) {
    pair = arrayOfPairs[index];
    map[pair[0]] = pair[1];
  }
  return map;
}


function asPredictionMap(arrayOfPairs) {
  /**
   * Auxiliary function to build a prediction map from the list of
   * category, probability pairs
   *
   * @param {array} arrayOfPairs list of [category, probability] pairs
   */
  var index, len = arrayOfPairs.length, mapArray = [] , pair = Array();
  for (index = 0; index < len; index++) {
    pair = arrayOfPairs[index];
    mapArray.push({"category": pair[0], "probability": pair[1]});
  }
  return mapArray;
}


/**
 * LocalEnsemble: Simple class for ensemble's local predictions
 * @constructor
 */
function LocalEnsemble(ensembleOrModels, connection, maxModels) {
  /**
   * Constructor for the local ensemble object
   *
   * @param {string|object|list} ensembleOrModels BigML ensemble id,
   *                             resource or list of model ids or resources
   * @param {object} connection BigML connection
   * @param {integer} maxModels number of models to be used in parallel
   *        in predictions
   */
  var i, fillEnsembleInfo, fillModelsInfo, fillSeparateModelsInfo, fill,
    addModel, self = this, ensemble, resource, filename, storageError,
    localModel;
  if (!maxModels) {
    maxModels = MAX_MODELS;
  }
  this.connection = utils.getDefaultConnection(connection);
  this.modelsSplits = [];
  this.predictionsOfModels = [];
  this.ready = undefined;
  this.isRegression = false;
  this.boosting = undefined;
  this.boostingOffsets = undefined;
  this.fields = undefined;
  this.objectiveField = undefined;
  this.classNames = undefined;
  this.importance = [];
  this.modelsReadyCount = 0;
  this.opKinds = ENSEMBLE_OPERATING_KINDS;


  fillEnsembleInfo = function (error, resource) {
    /**
     * Fills the modelIds array from the ensemble resource info
     */
    var index, len, index2, len2, categories;

    if (error) {
      throw new Error('Cannot create the Ensemble instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    if (typeof resource.object !== 'undefined') {
      resource = resource.object;
    }
    self.modelIds = resource.models;
    self.distributions = resource.distributions || []
    self.importance = resource.importance || []

    if (resource.type === BOOSTING) {
      self.boosting = resource.boosting;
    }
    // new ensembles have the fields structure
    if (typeof resource.ensemble !== 'undefined'){
      self.fields = resource.ensemble.fields;
      self.objectiveField = resource.objective_field;
      self.isRegression = self.fields[self.objectiveField].optype == 'numeric';
    }
    if (self.boosting) {
      if (self.isRegression) {
        self.boostingOffsets = (resource['initial_offset'] ||
          REGRESSION_BOOSTING_OFFSET_DFT);
      } else {
        self.boostingOffsets = toMap(resource['initial_offsets'] ||
          CLASSIFICATION_BOOSTING_OFFSET_DFT);
      }
    }
    if (!self.isRegression) {
      try {
        categories = self.fields[self.objectiveField].summary.categories;
        len = categories.length;
        self.classNames = [];
        for (index = 0; index < len; index++) {
          self.classNames.push(categories[index][0]);
        }
      } catch(err) {
        self.classNames = [];
        if (typeof self.boosting === 'undefined') {
          len = self.distributions.length;
          for (index = 0; index < len; index++) {
            categories = self.distributions[index].training.categories;
            len2 = categories.length;
            for (index2 = 0; index2 < len2; index2++) {
              if (self.classNames.indexOf(categories[index2][0]) < 0) {
                self.classNames.push(categories[index2][0]);
              }
            }
          }
        }
      }
      self.classNames.sort();
    }

    if (NODEJS) {
      self.emit('ensembleReady', self);
    }
  };

  fillModelsInfo = function (self) {
    /**
     * Fills the modelsSplits array with the models associated to an
     * ensemble id.
     */
    var model, query, modelObject;

    model = new Model(self.connection);
    query = 'ensemble_id=' + self.resourceId.id + ';full=yes';

    function createSplit(error, resources) {
      if (error) {
        throw new Error('The ensemble models could not be retrieved: ' +
                        error);
      }
      var i, localModels = [], localModel, j;
      for (i = 0; i < resources.resources.length; i++) {
        modelObject = resources.resources[i];
        localModel = new LocalModel(modelObject.resource,
                                    self.connection,
                                    self.fields);
        if (typeof self.classNames !== 'undefined') {
          localModel.classNames = self.classNames;
        }
        localModels.push(localModel);
      }

      for (i = 0; i < localModels.length; i++) {
        self.checkModelsReady(localModels[i]);
      }
      self.modelsSplits.push(localModels);
    }

    if (maxModels == null || maxModels >= self.modelIds.length) {
      maxModels = self.modelIds.length;
      query += ';limit=' + maxModels;
      model.list(query, createSplit);
    } else {
      query += ';limit=' + maxModels;
      for (i = 0; i < self.modelIds.length; i += maxModels) {
        model.list(query + ';offset=' + i, createSplit);
      }
    }
  };

  addModel = function (error, resource) {
    /**
     * Adds the finished model to the models array of the LocalEnsemble
     */
    var localModel = new LocalModel(resource,
                                    self.connection,
                                    self.fields);
    self.modelsSplits[0].push(localModel);
    self.checkModelsReady(localModel);
  };


  fillSeparateModelsInfo = function (localEnsemble) {
    /**
     * Fills the modelsSplits array with the models listed in modelIds
     */
    var model, modelObject, storageError;

    self.modelsSplits[0] = [];

    for (i = 0; i < localEnsemble.modelIds.length; i++) {
      if (typeof localEnsemble.connection.storage !== 'undefined') {
        addModel(null, localEnsemble.modelIds[i]);
      }
    }
  };




  // get ensemble ID if any
  if (Object.prototype.toString.call(ensembleOrModels) !== '[object Array]') {
    try {
      // ensemble ID or structure
      this.resourceId = utils.getResource(ensembleOrModels);
    } catch (e) {
      this.resourceId = undefined;
    }
    if ((typeof this.resourceId) === 'undefined' &&
        (typeof ensembleOrModels) === 'string') {
      // try to read a json file in the path provided by the first argument
      // or the local storage path
      try {
        resource = utils.tryStoredFile(filename, "ensemble");
        ensembleOrModels = resource;
        self.resourceId = utils.getResource(resource);
      } catch (e) {
          storageError = e;
          try {
            self.resourceId = utils.getResource(resource);
            ensembleORModels = self.resourceId;
            filename = null;
          } catch (err) {
            throw storageError;
          }
      }
    }
    this.modelIds = undefined;
  } else {
    // array of models
    this.resourceId = undefined;
    this.modelIds = ensembleOrModels;
  }
  // ensemble is now array of models or ensemble ID or structure

  if (Object.prototype.toString.call(ensembleOrModels) === '[object Array]') {
    // Loads models when a list of model ids or resources is given
    fill = false;
    self.modelsSplits[0] = [];
    for (i = 0; i < ensembleOrModels.length; i++) {
      if ((typeof ensembleOrModels[i]) !== 'object') {
        fill = true;
      }
      if (utils.getResource(ensembleOrModels[i]).type !== 'model') {
        throw new Error('The list seems to contain a resource that is not a' +
          ' model. Can\'t be used to build a LocalEnsemble');
      }
    }
    fillEnsembleInfo(null, {object: {models: ensembleOrModels}});

    if (fill) {
      fillSeparateModelsInfo(self);
    } else {
      for (i = 0; i < ensembleOrModels.length; i++) {
        localModel = new LocalModel(ensembleOrModels[i],
                                    self.connection,
                                    self.fields);
        this.modelsSplits[0].push(localModel);
        self.checkModelsReady(localModel);
      }
    }
  } else if ((typeof ensembleOrModels) === 'string' ||
      utils.getStatus(ensembleOrModels).code !== constants.FINISHED) {
    // Loads the ensemble when only the id is given
    resource = ensembleOrModels;

    self.on('ensembleReady', fillSeparateModelsInfo);

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
      // or the local storage path
      try {
        resource = utils.tryStoredFile(filename, "ensemble");
        ensembleOrModels = resource;
        self.resourceId = utils.getResource(resource);
        // loads when the entire resource is given
        fillEnsembleInfo(null, resource);
      } catch (e) {
          storageError = e;
          try {
            self.resourceId = utils.getResource(resource);
            fs.unlinkSync(filename);
            utils.getFromBigML(self.resourceId,
                               new Ensemble(self.connection),
                               fillEnsembleInfo);
          } catch (err) {
            throw storageError;
          }
      }
    } else if (typeof self.connection.storage === 'object' &&
               self.connection.storage != null &&
               typeof self.connection.storage.get === 'function') {

      self.resourceId = utils.getResource(resource);
      try {
        utils.getFromCache(self.resourceId,
                           self.connection.storage,
                           function (error, data) {
                             if (error || typeof data === 'undefined' ||
                                 data == null) {
                               utils.getFromBigML(self.resourceId,
                                                  new Ensemble(self.connection),
                                                  fillEnsembleInfo);
                             } else {
                               if (typeof data === 'string') {
                                 data = JSON.parse(data);
                                 if (typeof data.resource === 'undefined') {
                                   throw new Error("The data retrieved from" +
                                                   " cache does not match " +
                                                   "the expected structure.");
                                 }
                               }
                               fillEnsembleInfo(null, data)}});
      } catch (e) {
        utils.getFromBigML(self.resourceId,
                          new Ensemble(self.connection),
                          fillEnsembleInfo);
      }
    } else {
      self.resourceId = utils.getResource(resource);
      utils.getFromBigML(self.resourceId,
                         new Ensemble(self.connection),
                         fillEnsembleInfo);
    }
  } else {
    // Loads the information about the ensemble from the
    // entire API response.
    if (NODEJS) {
      self.on('ensembleReady', fillSeparateModelsInfo);
    }
    fillEnsembleInfo(null, ensembleOrModels);
    if (!NODEJS) {
        // adds a function when the ensemble information
        // has already been added. Thus models information
        // can be loaded in a two-step process after that.
        // Be careful when using this function to avoid errors
        // caused by partially filled ensemble objects.
        if (typeof self.fields === 'undefined') {
          throw new Error("The ensemble fields structure needs to be filled.");
        }
        self.fillModelsFromArray = function (modelsArray) {
          self.modelsSplits[0] = [];
          for (i = 0; i < modelsArray.length; i++) {
            self.modelsSplits[0].push(new LocalModel(modelsArray[i],
                                                     self.connection,
                                                     self.fields));
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

if (NODEJS) {
  util.inherits(LocalEnsemble, events.EventEmitter);
}


function intersect(array1, array2) {
    var temp;
    if (array2.length > array1.length) {
      temp = array2, array2 = array1, array1 = temp;
    } // indexOf to loop over shorter
    return array1.filter(function (e) {
        if (array2.indexOf(e) !== -1) return true;
    });
}

LocalEnsemble.prototype.checkModelsReady = function (localModel) {
  var self = this, addBoosting;

  addBoosting = function () {
    /**
     * Fills the boosting and fields info if not set previously
     * with the models' info
     */
    if (typeof self.boosting === "undefined") {
      if (self.modelsSplits[0][0].boosting) {
        self.boosting = self.modelsSplits[0][0].boosting;
      }
      if (self.boosting) {
        throw Error("Failed to build the local ensemble. Boosted" +
                    " ensembles cannot be built from a list" +
                    " of boosting models.");
      }
      if (typeof self.fields === 'undefined') {
        self.fields = self.modelsSplits[0][0].fields;
        self.objectiveField = self.modelsSplits[0][0].objectiveField;
      }
      self.isRegression = self.fields[self.objectiveField].optype == 'numeric';
    }
  };

  if (localModel.ready) {
    self.modelsReadyCount++;
    if (self.modelIds.length === self.modelsReadyCount) {
      addBoosting();
      self.sortBy = sharedProtos.sortBy;
      self.ready = true;
      if (NODEJS) {
        self.emit('ready', self);
      }
    }
  } else {
    localModel.on('ready', function () {self.checkModelsReady(localModel);})
  }
};



LocalEnsemble.prototype.predictProbability = function (
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

  var index, len, splitIndex, splitLen, predictions, votes, model,
    missingStrategy, data, prediction, issuePrediction, self = this,
    probabilities, createMultiVote, sortFn;
  predictions = [];
  len = this.modelsSplits.length;
  if ((typeof missingStrategy === 'function') && (typeof cb === 'undefined')) {
    cb = missingStrategy;
    missingStrategy = constants.LAST_PREDICTION;
  }

  if (this.ready) {
    missingStrategy = missingStrategy || constants.LAST_PREDICTION;

    createMultiVote = function (predictions) {

      votes = new MultiVoteList(predictions);
      predictions = votes.combineToDistribution(ENSEMBLE_OPERATING_KINDS[0]);
      if (cb) {
        return cb(null, predictions);
      }
      return predictions;
    }
    issuePrediction = function (err, prediction) {
      if (err) {
        return cb(err, null);
      }
      predictions.push(prediction);
      if (predictions.length === self.modelIds.length) {
        return createMultiVote(predictions);
      }
    };

    if (this.isRegression) {
      return this.predict(inputData, PROBABILITY_METHOD,
                          {missingStrategy: missingStrategy}, cb);
    } else if (typeof this.boosting !== 'undefined') {
      probabilities = this.predict(
        inputData, PROBABILITY_METHOD,
        {missingStrategy: missingStrategy})['probabilities'];
      probabilities = asPredictionMap(probabilities);
      sortFn = function(a, b) {
        return utils.sortCategory(a, b, self.classNames);
      }
      probabilities.sort(sortFn);
      if (cb) {
        return cb(null, probabilities);
      }
      return probabilities;
    } else {
      for (index = 0; index < len; index++) {
        splitLen = this.modelsSplits[index].length;
        for (splitIndex = 0; splitIndex < splitLen; splitIndex++) {
          model = this.modelsSplits[index][splitIndex];
          data = (JSON.parse(JSON.stringify(inputData)));
          if (cb) {
            model.predictProbability(data, missingStrategy,
                                     issuePrediction);
          } else {
            predictions.push(model.predictProbability(data, missingStrategy));
          }
        }
      }
      this.predictionsOfModels = predictions;
      if (!cb) {
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

LocalEnsemble.prototype.predictConfidence = function (
  inputData, missingStrategy, cb) {
  /**
   * For classification models, predicts a confidence for
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

  var index, len, splitIndex, splitLen, predictions, votes, model,
    missingStrategy, data, prediction, issuePrediction, self = this,
    confidences, createMultiVote;
  predictions = [];
  len = this.modelsSplits.length;
  if ((typeof missingStrategy === 'function') && (typeof cb === 'undefined')) {
    cb = missingStrategy;
    missingStrategy = constants.LAST_PREDICTION;
  }

  if (this.ready) {
    missingStrategy = missingStrategy || constants.LAST_PREDICTION;

    createMultiVote = function (predictions) {

      votes = new MultiVoteList(predictions);
      predictions = votes.combineToDistribution("confidence", false);
      if (cb) {
        return cb(null, predictions);
      }
      return predictions;
    }
    issuePrediction = function (err, prediction) {
      if (err) {
        return cb(err, null);
      }
      predictions.push(prediction);
      if (predictions.length === self.modelIds.length) {
        return createMultiVote(predictions);
      }
    };

    if (this.isRegression) {
      return this.predict(inputData, CONFIDENCE_METHOD,
                          {missingStrategy: missingStrategy}, cb);
    }
    if (typeof this.boosting !== 'undefined') {
      throw new Error ("Confidence cannot be computed for boosted ensembles.");
    }

    for (index = 0; index < len; index++) {
      splitLen = this.modelsSplits[index].length;
      for (splitIndex = 0; splitIndex < splitLen; splitIndex++) {
        model = this.modelsSplits[index][splitIndex];
        data = (JSON.parse(JSON.stringify(inputData)));
        if (cb) {
          model.predictConfidence(data, missingStrategy,
                                  issuePrediction);
        } else {
          predictions.push(model.predictConfidence(data, missingStrategy));
        }
      }
    }
    this.predictionsOfModels = predictions;
    if (!cb) {
      return createMultiVote(predictions);
    }

  } else {
    this.on('ready',
            function (self) {return self.predictConfidence(inputData,
                                                           missingStrategy,
                                                           cb); });
    return;
  }
};

LocalEnsemble.prototype.predictVotes = function (
  inputData, missingStrategy, cb) {
  /**
   * For classification models, predicts the votes distribution for
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

  var index, len, splitIndex, splitLen, predictions, votes, model, kIndex,
    missingStrategy, data, prediction, issuePrediction, self = this, className,
    confidences, createMultiVote, predictionList, createPredictionVector,
    classLen;
  predictions = [];
  if ((typeof missingStrategy === 'function') && (typeof cb === 'undefined')) {
    cb = missingStrategy;
    missingStrategy = constants.LAST_PREDICTION;
  }

  if (this.ready) {
    missingStrategy = missingStrategy || constants.LAST_PREDICTION;

    createPredictionVector = function (prediction) {
      predictionList = [];
      for (kIndex = 0, classLen = self.classNames.length;
           kIndex < classLen; kIndex++) {
        className = self.classNames[kIndex];
        votes = (prediction.prediction == className) ? 1 : 0;
        predictionList.push({"category": className, "votes": votes});
      }
      return predictionList;
    }
    createMultiVote = function (predictions) {

      votes = new MultiVoteList(predictions);
      predictions = votes.combineToDistribution("votes");
      if (cb) {
        return cb(null, predictions);
      }
      return predictions;
    }
    issuePrediction = function (err, prediction) {
      if (err) {
        return cb(err, null);
      }
      predictionList = createPredictionVector(prediction);
      predictions.push(predictionList);
      if (predictions.length === self.modelIds.length) {
        return createMultiVote(predictions);
      }
    };

    len = self.modelsSplits.length;

    if (this.isRegression) {
      return this.predict(inputData, VOTES_METHOD,
                          {missingStrategy: missingStrategy}, cb);
    } else if (typeof self.boosting !== 'undefined') {
      throw new Error ("Votes cannot be computed for boosted ensembles.");
    } else {
      for (index = 0; index < len; index++) {
        splitLen = this.modelsSplits[index].length;
        for (splitIndex = 0; splitIndex < splitLen; splitIndex++) {
          model = this.modelsSplits[index][splitIndex];
          data = (JSON.parse(JSON.stringify(inputData)));
          if (cb) {
            model.predict(data, undefined,
                          {missingStrategy: missingStrategy},
                          issuePrediction);
          } else {
            prediction = model.predict(data, undefined,
                                       {missingStrategy: missingStrategy});
            predictionList = createPredictionVector(prediction);
            predictions.push(predictionList);
          }
        }
      }
      this.predictionsOfModels = predictions;
      if (!cb) {
        return createMultiVote(predictions);
      }
    }
  } else {
    this.on('ready',
            function (self) {return self.predictPlurality(inputData,
                                                          missingStrategy,
                                                          cb); });
    return;
  }
};

LocalEnsemble.prototype.predictOperating = sharedProtos.predictOperating;

LocalEnsemble.prototype.predictOperatingKind = sharedProtos.predictOperatingKind;

LocalEnsemble.prototype.predict = function (inputData, method, options, cb) {
  /**
   * Combined prediction for input data
   *
   * @param {object} inputData Input data to predict
   * @param {integer} method (to be **deprecated**)
   *        Combination method in classifications/regressions:
   *        0 - majority vote (plurality)/ average
   *        1 - confidence weighted majority vote / error weighted
   *        2 - probability weighted majority vote / average
   *        3 - threshold filtered vote / doesn't apply
   *        for boosted trees, this method parameter is not required, as the
   *        combiner is set internally
   * @param {{missingStrategy: {0|1},
   *          operatingPoint: map,
   *          operatingKind: {'confidence'|'probability'|'votes'},
   *          threshold: integer,
   *          category: string,
   *          addUnusedFields: boolean}]}
   *        options strategy for missing values, operating point,
   *                operating kind (if no operating point is set),
   *                threshold and category information object (only used if
   *                method=3), info about fields not used in
   *                the ensemble.
   * @param {function} cb Callback
   */
  var index, len, splitIndex, splitLen, predictions, votes, model,
    missingStrategy, data, addUnusedFields, mean, prediction, unused,
    unusedFields, categories = [], predicting = true, operatingPoint,
    issuePrediction, self = this;
  predictions = [];
  len = this.modelsSplits.length;
  if (arguments.length < 2) {
    return self.predict(inputData, undefined,
                        {operatingKind: ENSEMBLE_OPERATING_KINDS[0]});
  }
  if (arguments.length < 3 &&
      (typeof method === 'function') && (typeof cb === 'undefined')) {
    return self.predict(inputData, undefined,
                        {operatingKind: ENSEMBLE_OPERATING_KINDS[0]}, method);
  }
  if (arguments.length < 4 &&
      (typeof options === 'function') && (typeof cb === 'undefined')) {
    return self.predict(inputData, method, undefined, options);
  }

  if (this.ready) {
    if ((typeof options !== 'undefined') &&
        (options.hasOwnProperty('missingStrategy'))) {
      missingStrategy = options.missingStrategy;
    } else {
      missingStrategy = constants.LAST_PREDICTION;
    }
    if (typeof options !== 'undefined') {
      if (options.hasOwnProperty('operatingPoint')) {
      operatingPoint = options.operatingPoint;
      return self.predictOperating(
        inputData, missingStrategy, operatingPoint, cb);
      } else if (options.hasOwnProperty('operatingKind') ||
                 typeof method === 'undefined') {
        if (self.isRegression) {
          return self.predict(
            inputData,
            (options.operatingKind == ENSEMBLE_OPERATING_KINDS[1]) ? 1 : 0,
              {missingStrategy: missingStrategy}, cb);
        }
        return self.predictOperatingKind(
          inputData, missingStrategy, options.operatingKind, cb);
      }
    }
    mean = ((typeof options !== 'undefined') && options.hasOwnProperty('mean')
            && mean);
    addUnusedFields = ((typeof options !== 'undefined') &&
                        options.hasOwnProperty('addUnusedFields') &&
                        addUnusedFields);

    issuePrediction = function (err, prediction) {
      if (err) {
        predicting = false;
        return cb(err, null);
      }
      predictions.push(prediction);
      if (predictions.length === self.modelIds.length && predicting) {
        if (self.boosting && !self.isRegression) {
          len = self.fields[self.objectiveField].summary.categories.length;
          for (index = 0; index < len; index++) {
            categories.push(self.fields[
              self.objectiveField].summary.categories[index][0]);
          }
          options = {"categories": categories};
        }
        if (!self.boosting &&
            predictions[0].hasOwnProperty("weightedDistribution")) {
          // for weighted models the ensemble needs to use the weightedDistribution
          for (index = 0; index < len; index++) {
            predictions[index].distribution = (
              predictions[index].weightedDistribution);
          }
        }
        votes = new MultiVote(predictions, self.boostingOffsets);
        prediction = votes.combine(method, options);
        if (addUnusedFields) {
          len = predictions.length;
          unusedFields = predictions[0].unusedFields;
          for (index = 0; index < len; index++) {
            unused = predictions[index].unusedFields;
            unusedFields = intersect(unused, unusedFields);
          }
          prediction.unusedFields = unusedFields;
        }
        return cb(null, prediction);
      }
    };

    for (index = 0; index < len; index++) {
      splitLen = this.modelsSplits[index].length;
      for (splitIndex = 0; splitIndex < splitLen; splitIndex++) {
        model = this.modelsSplits[index][splitIndex];
        data = (JSON.parse(JSON.stringify(inputData)));
        if (cb) {
          model.predict(data, missingStrategy, mean, addUnusedFields, false,
                        issuePrediction);
        } else {
          predictions.push(model.predict(data, missingStrategy, mean,
                                         addUnusedFields));
        }
      }
    }
    this.predictionsOfModels = predictions;

    if (!cb) {
      if (!this.boosting &&
          predictions[0].hasOwnProperty("weightedDistribution")) {
        // for weighted models the ensemble needs to use the
        // weightedDistribution
        for (index = 0; index < len; index++) {
          predictions[index].distribution = (
            predictions[index].weightedDistribution);
        }
      }
      options = {"categories": self.classNames};
      votes = new MultiVote(predictions, this.boostingOffsets);
      prediction = votes.combine(method, options);

      if (addUnusedFields) {
        len = predictions.length;
        unusedFields = predictions[0].unusedFields;
        for (index = 0; index < len; index++) {
          unused = predictions[index].unusedFields;
          unusedFields = intersect(unused, unusedFields);
        }
        prediction.unusedFields = unusedFields;
      }
      return prediction;
    }
  } else {
    this.on('ready',
            function (self) {return self.predict(inputData,
                                                 method, options, cb);});
    return;
  }
};

if (NODEJS) {
  module.exports = LocalEnsemble;
} else {
  exports = LocalEnsemble;
}
