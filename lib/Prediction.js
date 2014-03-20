/**
 * Copyright 2013-2014 BigML
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

var BigML = require('./BigML');
var Resource = require('./Resource');
var Ensemble = require('./Ensemble');
var LocalModel = require('./LocalModel');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');

function optionalCUParams(argsArray, message) {
  /**
   * Checks the arguments given to the create method and
   * sets their default values if absent.
   *
   * @param {array} arguments Arguments array
   * @param {string} message Resource-customized error message
   */

  var options, newArgs;
  newArgs = [argsArray[0]].concat([].slice.call(argsArray, 2));
  options = utils.optionalCUParams(newArgs, message);
  options.inputData = argsArray[1];
  return options;
}

function Prediction(connection) {
  Resource.call(this, connection);
}

Prediction.prototype = new Resource();

Prediction.prototype.parent = Resource.prototype;

Prediction.prototype.create = function (modelOrEnsemble, inputData, args,
                                        retry, cb) {
  /**
   * Creates a prediction and builds customized error and resource info
   *
   * Uses HTTP POST to send dataset content.
   *
   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   * @param {string} modelOrEnsemble Model id or Ensemble id
   * @param {object} inputData Input Data to predict from
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */

  var options,
    message = 'Failed to create the prediction. First parameter must be' +
              ' a model or an ensemble id.',
    resourceId = utils.getResource(modelOrEnsemble),
    self = this,
    modelId,
    ensemble,
    model;

  options = optionalCUParams(arguments, message);

  function createRemotePrediction(model) {
    /**
     * Creates a remote prediction using one of the models to validate
     * inputData previously
     * @param {object} model Model resource
     */
    options.args['input_data'] = model.validateInput(options.inputData);
    self.options = options;
    self.parent.create.call(self, 'prediction', ['model', 'ensemble'], message,
                            resourceId.resource,
                            options.args, options.retry, options.cb);
  }

  function createEnsembleModel(error, data) {
    /**
     * Creates a local model using the info of the first model in an ensemble
     * This is later used in validation of input data.
     *
     * @param {object} error Error message
     * @param {object} data Ensemble resource
     */
    if (error) {
      options.cb(error, data);
    } else {
      model = new LocalModel(data.object.models[0]);
      model.on('ready', function () {
        createRemotePrediction(model);
      });
    }
  }

  if (resourceId.type === 'ensemble') {
    if (modelOrEnsemble.object && modelOrEnsemble.object.models) {
      model = new LocalModel(modelOrEnsemble.object.models[0]);
      model.on('ready', function () {
        createRemotePrediction(model);
      });
    } else {
      ensemble = new Ensemble(this.connection);
      ensemble.get(resourceId.resource, createEnsembleModel);
    }
  } else {
    model = new LocalModel(resourceId.resource);
    model.on('ready', function () {
      createRemotePrediction(model);
    });
  }
};

Prediction.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'prediction', query, cb);
};


module.exports = Prediction;
