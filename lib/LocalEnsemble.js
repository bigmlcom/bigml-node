/**
 * Copyright 2013-2015 BigML
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

var LocalModel = require(PATH + 'LocalModel');
var MultiVote = require(PATH + 'MultiVote');
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');

if (NODEJS) {
  var util = require('util');
  var events = require('events');
  var Model = require('./Model');
  var Ensemble = require('./Ensemble');
  var BigML = require('./BigML');
}

var MAX_MODELS = 10;

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
    addModel, self, ensemble;
  if (!maxModels) {
    maxModels = MAX_MODELS;
  }
  if (Object.prototype.toString.call(ensembleOrModels) !== '[object Array]') {
    this.resourceId = utils.getResource(ensembleOrModels);
    if ((typeof this.resourceId) === 'undefined') {
      throw new Error('Cannot build an Ensemble from this resource: ' +
        ensembleOrModels);
    }
    this.modelIds = undefined;
  } else {
    this.resourceId = undefined;
    this.modelIds = ensembleOrModels;
  }

  this.modelsSplits = [];
  this.predictionsOfModels = [];
  this.ready = undefined;

  self = this;


  fillEnsembleInfo = function (error, resource) {
    /**
     * Fills the modelIds array from the ensemble resource info
     */
    if (error) {
      throw new Error('Cannot create the Ensemble instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.modelIds = resource.object.models;
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
    model = new Model(connection);
    query = 'ensemble_id=' + self.resourceId.id + ';full=yes';
    function createSplit(error, resources) {
      if (error) {
        throw new Error('The ensemble models could not be retrieved');
      }
      var i, localModels = [], count = 0;
      for (i = 0; i < resources.resources.length; i++) {
        modelObject = resources.resources[i];
        localModels.push(new LocalModel(modelObject, self.connection));
      }
      self.modelsSplits.push(localModels);
      for (i = 0; i < self.modelsSplits.length; i++) {
        count += self.modelsSplits[i].length;
      }
      if (self.modelIds.length === count) {
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    }
    if (maxModels === null || maxModels >= self.modelIds.length) {
      maxModels = self.modelIds.length;
      // TODO: add limit when apian does
      //query += ';limit=' + maxModels;
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
    self.modelsSplits[0].push(new LocalModel(resource, self.connection));
    if (self.modelIds.length === self.modelsSplits[0].length) {
      self.ready = true;
      if (NODEJS) {
        self.emit('ready', self);
      }
    }
  };


  fillSeparateModelsInfo = function (self) {
    /**
     * Fills the modelsSplits array with the models listed in modelIds
     */
    var model, modelObject;
    model = new Model(connection);
    for (i = 0; i < self.modelIds.length; i++) {
      model.get(self.modelIds[i], true, constants.ONLY_MODEL, addModel);
    }
  };


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
        this.modelsSplits[0].push(new LocalModel(ensembleOrModels[i],
                                                 self.connection));
      }
      this.ready = true;
    }
  } else if ((typeof ensembleOrModels) === 'string' ||
      utils.getStatus(ensembleOrModels).code !== constants.FINISHED) {
    // Loads the ensemble when only the id is given
    ensemble = new Ensemble(connection);
    ensemble.get(ensembleOrModels, fillEnsembleInfo);
    self.on('ensembleReady', fillModelsInfo);
  } else {
    // loads when the entire resource is given
    fillEnsembleInfo(null, ensembleOrModels);
    fillModelsInfo(self);
  }
  if (NODEJS) {
    events.EventEmitter.call(this);
  }
}

if (NODEJS) {
  util.inherits(LocalEnsemble, events.EventEmitter);
}


LocalEnsemble.prototype.predict = function (inputData, method, options, cb) {
  /**
   * Combined prediction for input data
   *
   * @param {object} inputData Input data to predict
   * @param {integer} method Combination method in classifications/regressions:
   *        0 - majority vote (plurality)/ average
   *        1 - confidence weighted majority vote / error weighted
   *        2 - probability weighted majority vote / average
   *        3 - threshold filtered vote / doesn't apply
   * @param {{threshold: integer, category: string}} options Threshold
            and category information object
   * @param {function} cb Callback
   */

  var index, len, splitIndex, splitLen, predictions, votes, model,
    missingStrategy, data,
    issuePrediction, self = this;
  predictions = [];
  len = this.modelsSplits.length;
  if ((typeof options === 'function') && (typeof cb === 'undefined')) {
    cb = options;
    options = undefined;
  }
  issuePrediction = function (err, prediction) {
    if (err) {
      return cb(err, null);
    }
    predictions.push(prediction);
    if (predictions.length === self.modelIds.length) {
      votes = new MultiVote(predictions);
      return cb(null, votes.combine(method, options));
    }
  };

  if (this.ready) {
    if ((typeof options !== 'undefined') &&
        (options.hasOwnProperty('missingStrategy'))) {
      missingStrategy = options.missingStrategy;
    } else {
      missingStrategy = constants.LAST_PREDICTION;
    }
    for (index = 0; index < len; index++) {
      splitLen = this.modelsSplits[index].length;
      for (splitIndex = 0; splitIndex < splitLen; splitIndex++) {
        model = this.modelsSplits[index][splitIndex];
        data = (JSON.parse(JSON.stringify(inputData)));
        if (cb) {
          model.predict(data, missingStrategy, issuePrediction);
        } else {
          predictions.push(model.predict(data, missingStrategy));
        }
      }
    }
    this.predictionsOfModels = predictions;
    if (!cb) {
      votes = new MultiVote(predictions);
      return votes.combine(method, options);
    }
  } else {
    this.on('ready',
            function (self) {return self.predict(inputData,
                                                 method, options, cb); });
    return;
  }
};

if (NODEJS) {
  module.exports = LocalEnsemble;
} else {
  exports = LocalEnsemble;
}
