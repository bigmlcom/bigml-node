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

var MAX_MODELS = 10;
var async = require('async');
var BigMLModel = require('./BigMLModel');
var BigML = require('./BigML');
var utils = require('./utils');

/**
 * Ensemble: Simple class for ensemble's local predictions
 * @constructor
 */
function Ensemble(ensemble, connection, maxModels) {
  /**
   * Constructor for the local ensemble object 
   *
   * @param {object} ensemble BigML ensemble resource
   */
  var i, modelIds, modelsSplits, query, models;
  if (utils.getObjectClass(connection) === 'BigML') {
    this.connection = connection;
  } else {
    this.connection = new BigML();
  }

  if (!maxModels) {
    maxModels = MAX_MODELS;
  }
  this.Id = utils.getResource(ensemble.resource).id;
  this.modelIds = ensemble.object.models;
  this.modelsSplits = [];
  models = new BigMLModel(this.connection);
  query = 'ensemble_id=' + this.Id + ';full=yes';
  modelsSplits = this.modelsSplits;
  function createSplit(error, resources) {
    if (error) {
      throw 'The ensemble models could not be retrieved';
    }
    modelsSplits.push(resources.resources);
  }
  if (maxModels === null || maxModels >= this.modelIds.length) {
    maxModels = this.modelIds.length;
    query += ';limit=' + maxModels;
    models.list(query, createSplit);
  } else {
    query += ';limit=' + maxModels;
    for (i = 0; i < this.modelIds.length; i += maxModels) {
      query += ';offset=' + i;
      models.list(query, createSplit);
    }
  }
}

Ensemble.prototype.predict = function (inputData, method) {
  /**
   * Combined prediction for input data
   *
   * @param {object} inputData Input data to predict
   * @param {integer} method Combination method in classifications/regressions:
   *        0 - majority vote (plurality)/ average
   *        1 - confidence weighted majority vote / error weighted
   *        2 - probability weighted majority vote / average
   */
  throw "Not yet implemented";
};

module.exports = Ensemble;
