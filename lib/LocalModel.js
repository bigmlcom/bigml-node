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

var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var Tree = require(PATH + 'Tree');

if (NODEJS) {
  var util = require('util');
  var fs = require('fs');
  var events = require('events');
  var Model = require('./Model');
}


/**
 * LocalModel: Simplified local object for the model resource.
 * @constructor
 */
function LocalModel(resource, connection) {
  /**
   * Constructor for the LocalModel local object.
   *
   * @param {string|object} resource BigML model resource, resource id or
   *                        the path to a JSON file containing a BigML model
   *                        resource
   * @param {object} connection BigML connection
   */

  var model, self, fillStructure;

  this.fields = undefined;
  this.invertedFields = undefined;
  this.tree = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource Model's resource info
     */
    var status, fields, field, fieldInfo;
    if (error) {
      throw new Error('Cannot create the Model instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.resourceId = utils.getResource(resource);
    if ((typeof self.resourceId) === 'undefined') {
      throw new Error('Cannot build a Model from this resource: ' + resource);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }
    if ((typeof resource.model) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        if ((typeof resource.model['model_fields']) !== 'undefined') {
          fields = resource.model['model_fields'];
          for (field in fields) {
            if (fields.hasOwnProperty(field)) {
              if (!resource.model.fields.hasOwnProperty(field)) {
                throw new Error('Some fields are missing to generate a ' +
                                'local model.\nPlease provide a model ' +
                                'with the complete list of fields');
              }
              fieldInfo = resource.model.fields[field];
              fields[field].summary = fieldInfo.summary;
              fields[field].name = fieldInfo.name;
            }
          }
        } else {
          fields = resource.model.fields;
        }
        self.fields = fields;
        self.invertedFields = utils.invertObject(fields);
        self.tree = new Tree(resource.model.root, fields,
                             resource['objective_fields'],
                             resource.model.distribution.training);
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the Model instance. Could not' +
                      ' find the \'model\' key in the resource\n');
    }
  };

  // Loads the model from the model id or from an unfinished object
  if (NODEJS && ((typeof resource) === 'string' ||
      utils.getStatus(resource).code !== constants.FINISHED)) {
    try {
      self.resourceId = utils.getResource(resource);
    } catch (err) {
      self.resourceId = undefined;
    }
    if ((typeof self.resourceId) === 'undefined') {
      // try to read a json file in the path provided by the first argument
      try {
        fs.readFile(resource, 'utf8', function (err, data) {
          if (err) {
            throw new Error('Failed to read local model file: ' + resource);
          }
          try {
            resource = JSON.parse(data);
            fillStructure(null, resource);
          } catch (jsonErr) {
            throw new Error('Failed to parse the JSON model in: ' + resource);
          }
        });
      } catch (errf) {
        // if no file is read, throw error reading file
        throw new Error('Cannot build a Model from this resource: ' +
                        resource);
      }
    } else {
      // if a resource id has been found, then load the model
      model = new Model(connection);
      model.get(this.resourceId.resource, true,
                constants.ONLY_MODEL, fillStructure);
    }
  } else {
  // loads when the entire resource is given
    fillStructure(null, resource);
  }
  if (NODEJS) {
    events.EventEmitter.call(this);
  }
}

if (NODEJS) {
  util.inherits(LocalModel, events.EventEmitter);
}

LocalModel.prototype.predict = function (inputData, missingStrategy,
                                         median, cb) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, prediction, self = this;
  if (arguments.length < 3 && (typeof missingStrategy === 'function')) {
    // downgrading gently to old syntax with no missingStrategy
    return self.predict(inputData, undefined, false, missingStrategy);
  }
  if (arguments.length < 4 && (typeof median === 'function')) {
    // downgrading gently to old syntax with no median
    return self.predict(inputData, missingStrategy, false, median);
  }

  function createLocalPrediction(error, data) {
    /**
     * Creates a local prediction using the model's tree info.
     *
     * @param {object} error Error message
     * @param {object} data Input data to predict from
     */
    if (error) {
      return cb(error, null);
    }
    prediction = self.tree.predict(data, null, missingStrategy, median);
    return cb(null, prediction);
  }
  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, createLocalPrediction);
    } else {
      prediction = this.tree.predict(this.validateInput(inputData),
                                     null,
                                     missingStrategy,
                                     median);
      return prediction;
    }
  } else {
    this.on('ready', function (self) {
      return self.predict(inputData, missingStrategy, median, cb);
    });
    return;
  }
};

LocalModel.prototype.validateInput = function (inputData, cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, inputDataKey;
  if (this.ready) {
    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        if (inputData[field] === null ||
            (typeof this.tree.fields[field] === 'undefined' &&
             typeof this.invertedFields[field] === 'undefined')) {
          delete inputData[field];
        } else {
          // input data keyed by field id
          if (typeof this.tree.fields[field] !== 'undefined') {
            inputDataKey = field;
          } else { // input data keyed by field name
            inputDataKey = String(this.invertedFields[field]);
          }
          newInputData[inputDataKey] = inputData[field];
        }
      }
    }

    try {
      inputData = utils.cast(newInputData, this.tree.fields);
    } catch (err) {
      if (cb) {
        return cb(err, null);
      }
      throw err;
    }
    if (cb) {
      return cb(null, inputData);
    }
    return inputData;
  }
  this.on('ready', function (self) {
    return self.validateInput(inputData, cb);
  });
  return;
};

if (NODEJS) {
  module.exports = LocalModel;
} else {
  exports = LocalModel;
}
