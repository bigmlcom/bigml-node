/**
 * Copyright 2017-2020 BigML
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

var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var SUBMODELS = require(PATH + 'tssubmodels');

if (NODEJS) {
  var util = require('util');
  var path = require('path');
  var fs = require('fs');
  var events = require('events');
  var TimeSeries = require('./TimeSeries');
  var BigML = require('./BigML');
}

// End of imports section --- DO NOT REMOVE

var REQUIRED_INPUT = "horizon";
var SUBMODEL_KEYS = ["indices", "names", "criterion", "limit"];
var DEFAULT_SUBMODEL = {"criterion": "aic", "limit": 1};


function computeForecasts(submodels, horizon) {
  /**
   * Computes the forecasts for each of the models in the submodels
   * array. The number of forecasts is set by horizon.
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */

  var forecasts = [], index, len = submodels.length, name, seasonality, error,
    trend, labels, submodel;
  for (index = 0; index < len; index++) {
    submodel = submodels[index];
    name = submodel.name;
    seasonality = null;
    if (name.indexOf(",") > -1) {
      labels = name.split(",");
      error = labels[0];
      trend = labels[1];
      seasonality = labels[2];
      forecasts.push({model: name,
        pointForecast: SUBMODELS[trend](
          submodel, horizon, seasonality)});
    } else {
      forecasts.push({model: name,
        pointForecast: SUBMODELS[name](submodel, horizon)});
    }
  }
  return forecasts;
}


function filterSubmodels(submodels, filterInfo) {
  /**
   * Filters the submodels available for the field in the time-series
   * model according to the criteria provided in the forecast input data
   * for the field
   *
   * @param {object} available submodels
   * @param {object} description of the filters to select the submodels
   */

  var fieldSubmodels = [], submodelNames = [], indices, names, index, len,
    pattern, submodelNames, criterion, limit;
  // filtering by indices and/or names
  indices = filterInfo[SUBMODEL_KEYS[0]] || [];
  names = filterInfo[SUBMODEL_KEYS[1]] || [];
  if (indices) {
    len = indices.length;
    for (var index = 0; index < len; index++) {
      fieldSubmodels.push(submodels[indices[index]]);
    }
  }
  // union with filtered by names
  if (names) {
    pattern = new RegExp(names.join("|"));
    len = fieldSubmodels.length;
    // exisiting submodels names
    for (var index = 0; index < len; index++) {
      submodelNames.push(fieldSubmodels[index].name);
    }
    len = submodels.length
    for (var index = 0; index < len; index++) {
      if (submodelNames.indexOf(submodels[index].name) == -1 &&
          submodels[index].name.match(pattern) != null) {
        fieldSubmodels.push(submodels[index]);
      }
    }
  }
  // default if none is set
  if (indices.length == 0 && names.length == 0) {
    fieldSubmodels.concat(submodels);
  }

  // filtering the resulting set by criterion and limit
  criterion = filterInfo[SUBMODEL_KEYS[2]];

  if (typeof criterion !== 'undefined') {
    fieldSubmodels.sort(
      function (a, b) {
        if ((a[criterion] || Infinity) > (b[criterion] || Infinity)) {
          return 1;
        } else if ((a[criterion] || Infinity) < (b[criterion] || Infinity)) {
          return -1;
        } else {
        return 0;}});
    limit = filterInfo[SUBMODEL_KEYS[3]];
    if (typeof limit !==  'undefined') {
      fieldSubmodels = fieldSubmodels.slice(0, limit);
    }
  }
  return fieldSubmodels;
}

/**
 * LocalTimeSeries: Simplified local object for the time-series model
 * resource.
 * @constructor
 */
function LocalTimeSeries(resource, connection) {
  /**
   * Constructor for the LocalTimeSeries local object.
   *
   * @param {string|object} resource BigML time-series resource,
   *                        resource id or
   *                        the path to a JSON file containing a BigML
   *                        time-series resource
   * @param {object} connection BigML connection
   */

  var self, fillStructure, objectiveField, timeSeries, timeSeriesInfo, filename;

  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new TimeSeries(this.connection);
  this.resType = "timeseries";
  this.resourceId = undefined;
  this.inputFields = undefined;
  this.fields = undefined;
  this.invertedFields = undefined;
  this.objectiveFields = [];
  this.allNumericObjectives = false;
  this.period = 1;
  this.etsModels = {};
  this.error = undefined;
  this.dampedTrend = undefined;
  this.seasonality = undefined;
  this.trend = undefined;
  this.timeRange = {};
  this.fieldParameters = {};
  this._forecast = [];

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Model structure.
     *
     * @param {object} error Error info
     * @param {object} resource TimeSeries's resource info
     */
    var status, fields, field, fieldInfo, index, TimeSeriesInfo,
      len, fieldIds = [], fieldId;

    if (error) {
      throw new Error('Cannot create the LocalTimeSeries instance.' +
                      ' Could not' +
                      ' retrieve the resource: ' + error);
    }
    self.resourceId = utils.getResource(resource);
    if ((typeof self.resourceId) === 'undefined') {
      throw new Error('Cannot build a LocalTimeSeries from this' +
                      ' resource: ' + resource);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }

    if ((typeof resource["input_fields"]) !== 'undefined') {
      self.inputFields = resource["input_fields"];
    }

    if (typeof resource["objective_fields"] !== 'undefined') {
      self.objectiveFields = resource['objective_fields'];
      self.objectiveField = resource['objective_field'];
    } else {
      throw new Error("Failed to find the time-series expected " +
                      "JSON structure. Check your arguments.");
    }
    if ((typeof resource['time_series']) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        timeSeriesInfo = resource['time_series'];
        if ((typeof timeSeriesInfo.fields) !== 'undefined') {
          fields = timeSeriesInfo.fields;
          if (typeof self.inputFields === 'undefined') {
            self.inputFields = [];
            for (fieldId in self.fields) {
              if (self.fields.hasOwnProperty(fieldId) &&
                  self.objectiveField != fieldId) {
                fieldIds.push([fieldId, self.fields[fieldId].column_number]);
              }
            }
            fieldIds.sort(function(a,b) {
              a = a[1];
              b = b[1];
              return a < b ? -1 : (a > b ? 1 : 0);
            });
            for (index = 0; index < fieldIds.length; index++) {
              self.inputFields.push(fieldIds[index]);
            }
          }
          for (field in fields) {
            if (fields.hasOwnProperty(field)) {
              fieldInfo = timeSeriesInfo.fields[field];
              fields[field].summary = fieldInfo.summary;
              fields[field].name = fieldInfo.name;
            }
          }
        } else {
          fields = timeSeriesInfo.fields;
        }
        self.fields = fields;
        self.invertedFields = utils.invertObject(fields);
        self.allNumericObjectives = timeSeriesInfo['all_numeric_objectives'];
        self.etsModels = timeSeriesInfo['ets_models'] || {};
        self.period = timeSeriesInfo.period || 1;
        self.error = timeSeriesInfo.error;
        self.dampedTrend = timeSeriesInfo['damped_trend'];
        self.seasonality = timeSeriesInfo.seasonality;
        self.trend = timeSeriesInfo.trend;
        self.timeRange = timeSeriesInfo['time_range'];
        self.fieldParameters = timeSeriesInfo['field_parameters'];
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the LocalTimeSeries instance.' +
                      ' Could not' +
                      ' find the \'time_series\' key in the' +
                      ' resource\n');
    }
  };


  // Loads the model from:
  // - the path to a local JSON file
  // - a local file system directory or a cache provided as connection storage
  // - the BigML remote platform
  // - the full JSON information

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
  } else {
    this.integerInputCheck = false;
  }
}

if (NODEJS) {
  util.inherits(LocalTimeSeries, events.EventEmitter);
}

LocalTimeSeries.prototype.forecast = function (inputData,
                                               addUnusedFields,
                                               cb) {
  /**
   * Makes a forecast for a horizon based on the selected submodels
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, forecast, validatedInput, self = this;

  // backward compatibility for previous code with no addUnusedFields argument
  if (typeof addUnusedFields === "function") {
    cb = addUnusedFields;
    addUnusedFields = false;
  }
  function createLocalForecast(error, data) {
    /**
     * Creates a local forecast using the model's tree info.
     *
     * @param {object} error Error message
     * @param {object} data Input data to predict from. If the addUnusedFields
     *                      flag is set, it also includes the fields in
     *                      inputData that were not used in the model
     */

    if (error) {
      return cb(error, null);
    }
    forecast = self.tsForecast(data.inputData);
    if (addUnusedFields) {
      forecast.unusedFields = data.unusedFields;
    }
    return cb(null, forecast);
  }

  if (this.ready) {
    if (cb) {
      this.filterObjectives(inputData, addUnusedFields, createLocalForecast);
    } else {
      validatedInput = this.filterObjectives(inputData, addUnusedFields);
      forecast = this.tsForecast(validatedInput.inputData);
      if (addUnusedFields) {
        forecast.unusedFields = validatedInput.unusedFields;
      }
      return forecast;
    }
  } else {
    this.on('ready', function (self) {
      return self.forecast(inputData, addUnusedFields, cb);
    });
    return;
  }
};


LocalTimeSeries.prototype.tsForecast = function (inputData) {
  /**
   * Computes the forecast based on the models in the time-series
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   */

  var len, index, fieldId, fieldInput, filterInfo, filteredSubmodels = {},
    forecasts = {}, forecast, localForecast;

  if (typeof inputData === 'undefined' || inputData == null ||
      Object.keys(inputData).length == 0) {
    for (fieldId in this._forecast) {
      if (this._forecast.hasOwnProperty(fieldId)) {
        forecasts[fieldId] = [];
        for (forecast in this._forecast[fieldId]) {
          localForecast = {};
          localForecast["pointForecast"] = forecast["point_forecast"];
          localForecast["model"] = forecast["model"];
          forecasts[fieldId].append(localForecast);
        }
      }
    }
    return forecasts;
  }

  for (fieldId in inputData) {
    if (inputData.hasOwnProperty(fieldId)) {
      fieldInput = inputData[fieldId];
      // we use the same input data keys that work remotely
      filterInfo = fieldInput["ets_models"]|| DEFAULT_SUBMODEL;
      filteredSubmodels[fieldId] = filterSubmodels(this.etsModels[fieldId],
        filterInfo);
    }
  }

  for (fieldId in filteredSubmodels) {
    if (filteredSubmodels.hasOwnProperty(fieldId)) {
      forecasts[fieldId] = computeForecasts(filteredSubmodels[fieldId],
        inputData[fieldId].horizon);
    }
  }
  return forecasts;

};


LocalTimeSeries.prototype.filterObjectives = function (inputData,
                                                       addUnusedFields,
                                                       cb) {
  /**
   * Filters the keys given in input_data checking against the
   * objective fields in the time-series model fields.
   * If `add_unused_fields` is set to True, it also
   * provides information about the ones that are not used.
   * @param {object} inputData Input data to predict
   * @param {boolean} addUnusedFields Causes the validation to return the
   *                                  list of fields in inputData that are
   *                                  not used
   * @param {function} cb Callback
   */
  var newInputData = {}, field, inputDataKey, fieldId, mean, stddev, value,
    unusedFields = [];
  if (this.ready) {
    try {
      for (field in inputData) {
        if (inputData.hasOwnProperty(field)) {
          value = inputData[field];
          if (value === null) {
            throw new Error('Input data cannot be empty.');
          }
          if (typeof value !== 'object') {
            throw new Error('Each field input data needs to be specified' +
                            ' as an Object. Found ' + (typeof value) +
                            ' for field ' + field + '.');
          }
          if (typeof value[REQUIRED_INPUT] === 'undefined') {
            throw new Error('Each field in input data must contain at least' +
                            ' a "horizon" attribute.');
          }
          if (typeof value.submodel !== 'undefined' &&
              Object.keys(value.submodel).filter(
                function(item) {SUBMODEL_KEYS.indexOf(item) == - 1})) {
            throw new Error('Only ' + SUBMODEL_KEYS.join(", ") +
                            ' allowed as keys in each fields' +
                            ' submodel filter.');
          }
          if (typeof this.fields[field] === 'undefined' &&
               typeof this.invertedFields[field] === 'undefined') {
            if (inputData[field] !== null) unusedFields.push(field);
          } else {
            // input data keyed by field id
            if (typeof this.fields[field] !== 'undefined') {
              inputDataKey = field;
            } else { // input data keyed by field name
              inputDataKey = String(this.invertedFields[field]);
            }
            newInputData[inputDataKey] = inputData[field];
          }
        }
      }
    } catch (err) {
      if (cb) {
        return cb(err, null);
      }
      throw err;
    }
    if (cb) {
      return cb(null, {inputData: newInputData, unusedFields : unusedFields});
    }
    return {inputData: newInputData, unusedFields: unusedFields};
  }
  this.on('ready', function (self) {
    return self.filterObjectives(inputData, addUnusedFields, cb);
  });
  return;
};


if (NODEJS) {
  module.exports = LocalTimeSeries;
} else {
  exports = LocalTimeSeries;
}
