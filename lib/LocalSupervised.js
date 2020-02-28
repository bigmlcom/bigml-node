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

var LocalModel = require(PATH + 'LocalModel');
var LocalEnsemble = require(PATH + 'LocalEnsemble');
var LocalLogisticRegression = require(PATH + 'LocalLogisticRegression');
var LocalDeepnet = require(PATH + 'LocalDeepnet');
var LocalLinearRegression = require(PATH + 'LocalLinearRegression');

var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var SUPERVISED_MODELS = {
  'model': LocalModel,
  'ensemble': LocalEnsemble,
  'deepnet': LocalDeepnet,
  'logisticregression': LocalLogisticRegression,
  'linearregression': LocalLinearRegression
}

if (NODEJS) {
  var path = require('path');
  var util = require('util');
  var events = require('events');
  var Resource = require(PATH + 'Resource');
}

// End of imports section --- DO NOT REMOVE


/**
 * LocalSupervised: Simple class for supervised models' local predictions
 * @constructor
 */
function LocalSupervised(model, connection) {
  /**
   * Constructor for the local Supervised object
   *
   * @param {string|object} model BigML model, ensemble, logistic regression,
   *                        deepnet id, or resource
   * @param {object} connection BigML connection
   */
  var i, fillStructure, resource, filename, self;
  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new Resource(this.connection);
  this.resType = "supervised";
  this.ready = undefined;
  this.resourceId = undefined;
  this.localModel = undefined;
  self = this;

  fillStructure = function (error, resource) {
    /**
     * Fills the supervised model info from the JSON object
     */
    if (error) {
      throw new Error('Cannot create the Supervised model instance. Could not'
                      + ' retrieve the resource: ' + error);
    }
    if (typeof resource.object !== 'undefined') {
      resource = resource.object;
    }
    self.resourceId = utils.getResource(resource);
    self.localModel = new SUPERVISED_MODELS[self.resourceId.type](
      resource, connection);
    if (self.localModel.ready) {
      self.ready = true;
      if (NODEJS) {
        self.emit('ready', self);
      }
    } else {
      self.localModel.on('ready',
              function (child) {
                self.ready = true;
                if (NODEJS) {
                  self.emit('ready', self);
                }});
    }
  };

  // Loads the model from:
  // - the path to a local JSON file
  // - a local file system directory or a cache provided as connection storage
  // - the BigML remote platform
  // - the full JSON information

  resource = model;
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
  util.inherits(LocalSupervised, events.EventEmitter);
}

LocalSupervised.prototype.predictProbability = function (
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

  var self = this, prediction;
  if (this.ready) {
    switch (this.localModel.resourceId.type) {

      case "model":
        prediction = this.localModel.predictProbability(inputData, undefined);
      case "ensemble":
        prediction = this.localModel.predictProbability(inputData, undefined);
      default:
        prediction = this.localModel.predictProbability(inputData);
    }
    if (cb) {
      return cb(null, prediction);
    }
    return prediction;
  } else {
    this.on('ready',
            function (self) {return self.predictProbability(
              inputData, cb);
      });
    return;
  }

};

LocalSupervised.prototype.predict = function (
  inputData, operatingPoint, cb) {
  /**
   * Combined prediction for input data
   *
   * @param {object} inputData Input data to predict
   * @param {map} operatingPoint Setting an operating point based on the
   *                             probability of the prediction.
   * @param {function} cb Callback
   */

  var predictArguments = new Array(), self = this;

  if (this.ready) {
    switch (this.resourceId.type) {
      case "model":
        predictArguments = [arguments[0], undefined, undefined, undefined,
                            arguments[1], undefined, arguments[2]];
        break;
      case "ensemble":
        predictArguments = [arguments[0], undefined,
                            {operatingPoint: arguments[1]},
                            arguments[2]];
        break;
      default:
        predictArguments = arguments;
    }
    return this.localModel.predict.apply(self.localModel, predictArguments);
  } else {
    this.on('ready',
            function (self) {return self.predict(
              inputData, operatingPoint, cb);
      });
    return;
  }
};

if (NODEJS) {
  module.exports = LocalSupervised;
} else {
  exports = LocalSupervised;
}
