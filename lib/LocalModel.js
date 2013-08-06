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
var utils = require('./utils');
var Model = require('./Model');
var constants = require('./constants');
var Tree = require('./Tree');


function mapType(type) {
  /**
   * Returns function to cast to type.
   *
   * @param {string} type
   */
  if (type === 'numeric') {
    // TODO: find a way to interpret not en_US locales
    return parseFloat;
  }
  return String;
}

function stripAffixes(value, field) {
  /**
   * Strips prefixes and suffixes for numerical input data fields.
   *
   * @param {string} value Value of the field
   * @param {object} field model's field
   */
  if (field.prefix && value.indexOf(field.prefix) === 0) {
    value = value.substring(field.prefix.length);
  }
  if (field.suffix && value.indexOf(field.suffix) === value.length - field.suffix.length) {
    value = value.substring(0, value.length - field.suffix.length);
  }
  return value;
}

function cast(inputData, fields) {
  /**
   * Sets the right type for input data fields.
   *
   * @param {object} inputData Input data to predict
   * @param {object} fields Model's fields collection
   */
  var field, value;
  for (field in inputData) {
    if (inputData.hasOwnProperty(field)) {
      if ((fields[field].optype === 'numeric' &&
           (typeof inputData[field]) === 'string') ||
          (fields[field].optype !== 'numeric' &&
            (typeof inputData[field] !== 'string'))) {
        try {
          if (fields[field].optype === 'numeric') {
            value = stripAffixes(inputData[field], fields[field]);
            inputData[field] = mapType(fields[field].optype)(value);
          }
        } catch (error) {
          throw new Error('Mismatch input data type in field ' +
                          fields[field].name + 'for value ' +
                          inputData[field]);
        }
      }
    }
  }
  return inputData;
}

function invertObject(fields) {
  /**
   * Creates a field name to Id hash.
   *
   * @param {object} fields Model's fields
   */
  var newObject = {}, field;
  for (field in fields) {
    if (fields.hasOwnProperty(field)) {
      newObject[fields[field].name] = field;
    }
  }
  return newObject;
}

/**
 * LocalModel: Simplified local object for the model resource.
 * @constructor
 */
function LocalModel(resource, connection) {
  /**
   * Constructor for the LocalModel local object.
   *
   * @param {object} resource BigML model resource
   * @param {object} connection BigML connection
   */

  var model, self, fillStructure;
  this.resourceId = utils.getResource(resource);
  if ((typeof this.resourceId) === 'undefined') {
    throw new Error('Cannot build a Model from this resource: ' + resource);
  }

  this.invertedFields = undefined;
  this.allInvertedFields = undefined;
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
                throw "Some fields are missing to generate a local model.\n" +
                      "Please provide a model with the complete list of fields";
              }
              fieldInfo = resource.model.fields[field];
              fields[field].summary = fieldInfo.summary;
              fields[field].name = fieldInfo.name;
            }
          }
        } else {
          fields = resource.model.fields;
        }
        self.invertedFields = invertObject(fields);
        self.allInvertedFields = invertObject(resource.model.fields);
        self.tree = new Tree(resource.model.root, fields, resource['objective_fields']);
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        self.emit('ready', self);
      }
    } else {
      throw new Error('Cannot create the Model instance. Could not' +
                      ' find the \'model\' key in the resource\n');
    }
  };

  // Loads the model from the model id or from an unfinished object
  if ((typeof resource) === 'string' ||
      utils.getStatus(resource).code !== constants.FINISHED) {
    model = new Model(connection);
    model.get(this.resourceId.resource, true, 'only_model=true', fillStructure);
  } else {
  // loads when the entire resource is given
    fillStructure(null, resource);
  }
  events.EventEmitter.call(this);
}

util.inherits(LocalModel, events.EventEmitter);

LocalModel.prototype.predict = function (inputData, cb) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, prediction, self = this;

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
    prediction = self.tree.predict(data);
    return cb(null, prediction);
  }

  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, createLocalPrediction);
    } else {
      prediction = this.tree.predict(this.validateInput(inputData));
      return prediction;
    }
  } else {
    this.on('ready', function (self) {return self.predict(inputData, cb); });
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
            (!this.tree.fields.hasOwnProperty(field) && 
             !this.invertedFields.hasOwnProperty(field))) {
          delete inputData[field];
        } else {
          // input data keyed by field id
          if (this.tree.fields.hasOwnProperty(field)) {
            inputDataKey = field
          }
          // input data keyed by field name
          else {
            inputDataKey = String(this.invertedFields[field])
          }
          newInputData[inputDataKey] = inputData[field];
        }
      }
    }

    try {
      inputData = cast(newInputData, this.tree.fields);
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

module.exports = LocalModel;
