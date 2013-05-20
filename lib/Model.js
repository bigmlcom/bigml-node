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

var utils = require('./utils');
var constants = require('./constants');
var Tree = require('./Tree');

function mapType(type) {
  /**
   * Returns function to cast to type
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
   * Strips prefixes and suffixes for numerical input data fields
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
   * Sets the right type for input data fields
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
          throw 'Mismatch input data type in field ' + fields[field].name +
                'for value ' + inputData[field];
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
 * Model: Simplified local object for the model resource.
 * @constructor
 */
function Model(resource) {
  /**
   * Constructor for the Model local object
   *
   * @param {object} resource BigML model resource
   */

  var status, fields, field, fieldInfo;
  this.resourceId = resource.resource;
  if ((typeof this.resourceId) === 'undefined') {
    throw "Cannot build a Model from this resource:" + resource;
  }

  if ((typeof resource.object) !== 'undefined') {
    status = utils.getStatus(resource);
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
      this.invertedFields = invertObject(fields);
      this.allInvertedFields = invertObject(resource.model.fields);
      this.tree = new Tree(resource.model.root, fields, resource['objective_fields']);
      this.description = resource.description;
      this.locale = resource.locale || constants.DEFAULT_LOCALE;
    }
  } else {
    throw "Cannot create the Model instance. Could not" +
          " find the 'model' key in the resource\n";
  }

}

Model.prototype.predict = function (inputData) {
  /**
   * Makes a prediction based on a number of field values.
   *
   * The input fields must be keyed by field name.
   * @param {object} inputData Input data to predict
   */

  var newInputData = {}, field;
  for (field in inputData) {
    if (inputData.hasOwnProperty(field)) {
      if (inputData[field] === null ||
          (!this.invertedFields.hasOwnProperty(field))) {
        delete inputData[field];
      } else {
        newInputData[String(this.invertedFields[field])] = inputData[field];
      }
    }
  }
  inputData = cast(newInputData, this.tree.fields);
  return this.tree.predict(inputData);
}

module.exports = Model
