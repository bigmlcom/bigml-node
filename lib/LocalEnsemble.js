/**
 * Copyright 2013 BigML
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

var util = require('util');
var events = require('events');
var Model = require('./Model');
var Ensemble = require('./Ensemble');
var LocalModel = require('./LocalModel');
var BigML = require('./BigML');
var MultiVote = require('./MultiVote');
var utils = require('./utils');

var MAX_MODELS = 10;

/**
 * LocalEnsemble: Simple class for ensemble's local predictions
 * @constructor
 */
function LocalEnsemble(resource, connection, maxModels) {
  /**
   * Constructor for the local ensemble object 
   *
   * @param {object} resource BigML ensemble resource
   * @param {object} connection BigML connection
   * @param {integer} maxModels number of models to be used in parallel
   *        in predictions
   */
  var i, fillEnsembleInfo, fillModelsInfo, self, ensemble;
  if (!maxModels) {
    maxModels = MAX_MODELS;
  }
  this.resourceId = utils.getResource(resource);
  if ((typeof this.resourceId) === 'undefined') {
    throw new Error('Cannot build an Ensemble from this resource: ' + resource);
  }

  this.modelIds = undefined;
  this.modelsSplits = [];
  this.ready = undefined;

  self = this;
  fillEnsembleInfo = function (error, resource) {
    if (error) {
      throw new Error('Cannot create the Ensemble instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.modelIds = resource.object.models;
    self.emit('ensembleReady', self);
  };

  fillModelsInfo = function (self) {
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
        self.emit('ready', self);
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
        query += ';offset=' + i;
        model.list(query, createSplit);
      }
    }
  };
  self.on('ensembleReady', fillModelsInfo);


  if ((typeof resource) === 'string') {
    // Loads the ensemble when only the id is given
    ensemble = new Ensemble(connection);
    ensemble.get(resource, fillEnsembleInfo);
  } else {
    // loads when the entire resource is given
    fillEnsembleInfo(null, resource);
    fillModelsInfo(self);
  }
  events.EventEmitter.call(this);
}

util.inherits(LocalEnsemble, events.EventEmitter);

LocalEnsemble.prototype.predict = function (inputData, method, cb) {
  /**
   * Combined prediction for input data
   *
   * @param {object} inputData Input data to predict
   * @param {integer} method Combination method in classifications/regressions:
   *        0 - majority vote (plurality)/ average
   *        1 - confidence weighted majority vote / error weighted
   *        2 - probability weighted majority vote / average
   * @param {function} cb Callback
   */
  if (this.ready) {
    var index, len, splitIndex, splitLen, predictions, votes, model,
      issuePrediction;
    predictions = [];
    len = this.modelsSplits.length;
    issuePrediction = function (err, prediction) {
      if (err) {
        if (cb) {
          return cb(err, null);
        }
        throw err;
      }
      predictions.push(prediction);
    };
    for (index = 0; index < len; index++) {
      splitLen = this.modelsSplits[index].length;
      for (splitIndex = 0; splitIndex < splitLen; splitIndex++) {
        model = this.modelsSplits[index][splitIndex];
        model.predict(inputData, issuePrediction);
      }
    }
    votes = new MultiVote(predictions);
    if (cb) {
      return cb(null, votes.combine(method));
    }
    return votes.combine(method);
  }
  this.on('ready',
          function (self) {return self.predict(inputData, method, cb); });
  return;
};

module.exports = LocalEnsemble;
