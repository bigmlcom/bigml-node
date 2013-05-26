/**
 * Copyright 2012 BigML
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
var BigMLModel = require('./BigMLModel');
var BigMLEnsemble = require('./BigMLEnsemble');
var Model = require('./Model');
var BigML = require('./BigML');
var MultiVote = require('./MultiVote');
var utils = require('./utils');

var MAX_MODELS = 10;

/**
 * Ensemble: Simple class for ensemble's local predictions
 * @constructor
 */
function Ensemble(resource, connection, maxModels) {
  /**
   * Constructor for the local ensemble object 
   *
   * @param {object} ensemble BigML ensemble resource
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
    throw "Cannot build an Ensemble from this resource:" + resource;
  }

  this.modelIds = undefined;
  this.modelsSplits = [];
  this.ready = undefined;

  self = this;
  fillEnsembleInfo = function (error, resource) {
    if (error) {
      throw "Cannot create the Ensemble instance. Could not" +
          " retrieve the resource:" + error;
    }
    self.modelIds = resource.object.models;
    self.emit('ensembleReady', self);
  };

  fillModelsInfo = function (self) {
    var models, query, modelObject;
    models = new BigMLModel(connection);
    query = 'ensemble_id=' + self.resourceId.id + ';full=yes';
    function createSplit(error, resources) {
      if (error) {
        throw 'The ensemble models could not be retrieved';
      }
      var i, localModels = [], count = 0;
      for (i = 0; i < resources.resources.length; i++) {
        modelObject = resources.resources[i];
        localModels.push(new Model(modelObject, self.connection));
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
      models.list(query, createSplit);
    } else {
      query += ';limit=' + maxModels;
      for (i = 0; i < self.modelIds.length; i += maxModels) {
        query += ';offset=' + i;
        models.list(query, createSplit);
      }
    }
  };
  self.on('ensembleReady', fillModelsInfo);

  // Loads the ensemble when only the id is given
  if ((typeof resource) === 'string') {
    ensemble = new BigMLEnsemble(connection);
    ensemble.get(resource, fillEnsembleInfo);
  } else {
  // loads when the entire resource is given
    fillEnsembleInfo(null, resource);
    fillModelsInfo(self);
  }
  events.EventEmitter.call(this);
}

util.inherits(Ensemble, events.EventEmitter);

Ensemble.prototype.predict = function (inputData, method, cb) {
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
    var index, len, index2, len2, predictions, votes, model;
    predictions = [];
    for (index = 0, len = this.modelsSplits.length; index < len; index++) {
      for ( index2 = 0, len2 = this.modelsSplits[index].length; index2 < len2; index2++) {
        model = this.modelsSplits[index][index2];
        model.predict(inputData, 
                      function (prediction) {predictions.push(prediction)});
      }
    }
    votes = new MultiVote(predictions);
    if (cb) {
      return cb(votes.combine(method));
    }
    return votes.combine(method);
  }
  this.on('ready', function (self) {return self.predict(inputData, method, cb); });
  return;
};

module.exports = Ensemble;
