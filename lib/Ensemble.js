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
  var i, modelIds;
  if (utils.getObjectClass(connection) === 'BigML') {
    this.connection = connection;
  } else {
    this.connection = new BigML();
  }

  if (!maxModels) {
    maxModels = MAX_MODELS;
  }
  this.modelIds = ensemble.object.models;
  if (maxModels === null) {
    this.modelsSplits = [this.modelIds];
  } else {
    this.modelsSplits = [];
    for (i = 0; i < this.modelIds.length; i += maxModels) {
      this.modelsSplits.push(this.modelIds.slice(i, i + maxModels));
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
}

module.exports = Ensemble;
