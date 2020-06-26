/**
 * Copyright 2014-2020 BigML
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

if (NODEJS) {
  var path = require('path');
  var util = require('util');
  var events = require('events');
  var Anomaly = require('./Anomaly');
  var BigML = require('./BigML');
}
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var AnomalyTree = require(PATH + 'AnomalyTree');

// End of imports section --- DO NOT REMOVE

var TEXT_TYPES = ["categorical", "text", "datetime"];
var DEPTH_FACTOR = 0.5772156649;


function normFactor(sampleSize, meanDepth) {
  /**
   * Computing the normalization factor for simple anomaly detectors
   *
   * @param {object} sampleSize Size of the original sample
   * @param {object} meanDepth Mean of the trees depth
   */
  var defaultDepth = meanDepth;
  if (utils.isEmpty(meanDepth) || utils.isEmpty(sampleSize)) {
    throw new Error("The anomaly dector information is not complete." +
      "Failed to build a local anomaly detector.");
  }
  if (!utils.isEmpty(meanDepth) && sampleSize != 1) {
      defaultDepth = (2 * (DEPTH_FACTOR + Math.log(sampleSize - 1) -
          (sampleSize - 1.0) / sampleSize));
  }
  return Math.min(meanDepth, defaultDepth);
}

/**
 * LocalAnomaly: Simplified local object for the anomaly detector resource.
 * @constructor
 */
function LocalAnomaly(resource, connection, opts = {}) {
  /**
   * Constructor for the LocalAnomaly local object.
   *
   * @param {object} resource BigML anomaly resource
   * @param {object} connection BigML connection
   */

  var anomaly, self, fillStructure, filename;
  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new Anomaly(this.connection);
  this.resType = "anomaly";
  this.inputFields = undefined;
  this.fields = undefined;
  this.invertedFields = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;
  this.idFields = undefined;

  self = this;

  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Anomaly detector
     * structure.
     *
     * @param {object} error Error info
     * @param {object} resource Anomaly's resource info
     */
    var status, fields, inputFields, anomaly, index, len, tree, defaultDepth;

    if (error) {
      throw new Error('Cannot create the Anomaly detector instance. Could not'
                      + ' retrieve the resource: ' + error);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }
    anomaly = resource;
    if (status.code === constants.FINISHED) {
      self.sampleSize = anomaly['sample_size'];
      if ((typeof resource.model) !== 'undefined') {
        fields = anomaly.model.fields;
        inputFields = anomaly["input_fields"];
        self.idFields = anomaly['id_fields'];

        if ((typeof anomaly.model['top_anomalies']) !== 'undefined') {
          self.meanDepth = anomaly.model['mean_depth'];
          self.normalizationFactor = anomaly.model["nomalization_factor"];
          self.nodesMeanDepth = anomaly.model["nodes_mean_depth"];
          self.norm = ((utils.isEmpty(self.normalizationFactor)) ?
            normFactor(self.sampleSize, self.meanDepth) :
            self.normalizationFactor);
          self.iforest = [];
          len = anomaly.model.trees.length;
          for (index = 0; index < len; index++) {
            tree = anomaly.model.trees[index].root;
            self.iforest.push(new AnomalyTree(tree, fields, opts));
          }
          self.topAnomalies = anomaly.model.top_anomalies;
        } else {
          throw new Error('Cannot create the Anomaly detector instance. ' +
                          'Could not find the \'top_anomalies\' key\n');
        }
      } else {
        throw new Error('Cannot create the Anomaly detector instance. ' +
                        'Could not' +
                        'find the \'model\' key in the resource\n');
      }
      self.inputFields = inputFields;
      self.fields = fields;
      self.invertedFields = utils.invertObject(fields);
      self.description = resource.description;
      self.locale = resource.locale || constants.DEFAULT_LOCALE;
      self.ready = true;
      if (NODEJS) {
        self.emit('ready', self);
      }
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
  }
}

if (NODEJS) {
  util.inherits(LocalAnomaly, events.EventEmitter);
}

LocalAnomaly.prototype.computeScore = function (inputData) {
  /**
   * Returns the anomaly score given by the iforest
   *
   * To produce an anomaly score, we evaluate each tree in the iforest
   * for its depth result (see the depth method in the AnomalyTree
   * object for details). We find the average of these depths
   * to produce an `observed_mean_depth`. We calculate an
   * `expected_mean_depth` using the `sample_size` and `mean_depth`
   *  parameters which come as part of the forest message.
   *  We combine those values as seen below, which should result in a
   *  value between 0 and 1.
   */

  var depthSum = 0.0, index = 0, len = this.iforest.length,
    tree, observedMeanDepth;
  if ((this.sampleSize == 1) && utils.isEmpty(this.normalizationFactor)) {
    // corner case with only one record
    return 1;
  }
  for (index = 0; index < len; index++) {
    tree = this.iforest[index];
    depthSum += tree.depth(inputData).depth;
  }
  observedMeanDepth = depthSum / len;
  return Math.pow(2, -observedMeanDepth / this.norm);
};

LocalAnomaly.prototype.anomalyScore = function (inputData, cb) {
  /**
   * Makes an anomaly score prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, anomalyScore, self = this;
  function createLocalAnomalyScore(error, inputData) {
    /**
     * Creates a local centroid using the cluster info.
     *
     * @param {object} error Error message
     * @param {object} data Input data to predict from
     */
    if (error) {
      return cb(error, null);
    }
    return cb(null, self.computeScore(inputData));
  }

  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, createLocalAnomalyScore);
    } else {
      anomalyScore = this.computeScore(this.validateInput(inputData));
      return anomalyScore;
    }
  } else {
    this.on('ready',
            function (self) {return self.anomalyScore(inputData, cb); });
    return;
  }
};

LocalAnomaly.prototype.validateInput = function (inputData, cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, fieldId, inputDataKey;
  if (this.ready) {
    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        if (inputData[field] !== null &&
            (typeof this.fields[field] !== 'undefined' ||
             typeof this.invertedFields[field] !== 'undefined')) {
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
    try {
      newInputData = utils.cast(newInputData, this.fields);
    } catch (err) {
      if (cb) {
        return cb(err, null);
      }
      throw err;
    }
    if (cb) {
      return cb(null, newInputData);
    }
    return newInputData;
  }
  this.on('ready', function (self) {
    return self.validateInput(inputData, cb);
  });
  return;
};

LocalAnomaly.prototype.anomaliesFilter = function (include, cb) {
  /**
   * Returns the LISP expression needed to filter the subset of
   * top anomalies. When include is set to true, only the top
   * anomalies are selected by the filter. If set to false, only the
   * rest of the dataset is selected.
   *
   * @param {boolean} include True to include only the top anomalies, false
   *                          otherwise.
   * @param {function} cb Callback
   */
  if (this.ready) {
    var anomalyFilters = [], filterRules = [], value, row, rowLen, filter,
      index = 0, len = this.topAnomalies.length, i = 0, fieldId;
    for (index = 0; index < len; index++) {
      filterRules = [];
      row = this.topAnomalies[i].row;
      rowLen = row.length;
      for (i = 0; i < rowLen; i++) {
        fieldId = this.inputFields[i];
        if (this.idFields.indexOf(fieldId) > -1) {
          continue;
        } else {
          value = row[i];
          if (typeof value === 'undefined' || value == null || value == "") {
            filterRules.push('(missing? "' + fieldId + '")');
          } else {
            if (TEXT_TYPES.indexOf(this.fields[fieldId].optype) > -1) {
              value = JSON.stringify(value);
            }
            filterRules.push('(= (f "' + fieldId + '") ' + value + ')');
          }
        }
      }
      if (filterRules.length > 0) {
        anomalyFilters.push('(and ' + filterRules.join(" ") + ')');
      }
    }
    filter = anomalyFilters.join(" ")
    if (include) {
      if (anomalyFilters.length == 1) {
        return (cb) ? cb(null, filter) : filter;
      }
      return (cb) ? cb(null, "(or " + filter + ")") : "(or " + filter + ")";
    }
    return ((cb) ? cb(null, "(not (or " + filter + "))") :
            "(not (or " + filter + "))");
  }
  this.on('ready', function (self) {
    return self.anomaliesFilter(include, cb);
  });
  return;
};

if (NODEJS) {
  module.exports = LocalAnomaly;
} else {
  exports = LocalAnomaly;
}
