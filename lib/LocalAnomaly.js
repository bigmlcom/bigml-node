/**
 * Copyright 2014-2015 BigML
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
var TEXT_TYPES = ["categorical", "text", "datetime"];

if (NODEJS) {
  var util = require('util');
  var events = require('events');
  var Anomaly = require(PATH + 'Anomaly');
}
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');
var AnomalyTree = require(PATH + 'AnomalyTree');


/**
 * LocalAnomaly: Simplified local object for the anomaly detector resource.
 * @constructor
 */
function LocalAnomaly(resource, connection) {
  /**
   * Constructor for the LocalAnomaly local object.
   *
   * @param {object} resource BigML anomaly resource
   * @param {object} connection BigML connection
   */

  var anomaly, self, fillStructure;
  this.resourceId = utils.getResource(resource);
  if ((typeof this.resourceId) === 'undefined') {
    throw new Error('Cannot build an Anomaly from this resource: ' + resource);
  }

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
        self.meanDepth = anomaly.model['mean_depth'];
        self.idFields = anomaly['id_fields'];
        if ((typeof anomaly.model['top_anomalies']) !== 'undefined') {
          self.expectedMeanDepth = null;
          if ((typeof self.meanDepth) === 'undefined' ||
              (typeof self.sampleSize) === 'undefined') {
            throw new Error('The anomaly data is not complete. ' +
                            'Score will not be available');
          } else {
            defaultDepth =  (
              2 * (0.5772156649 + Math.log(self.sampleSize - 1) -
                            ((self.sampleSize - 1.0) / self.sampleSize))
            );
            self.expectedMeanDepth = Math.min(self.meanDepth, defaultDepth);
            self.iforest = [];
            len = anomaly.model.trees.length;
            for (index = 0; index < len; index++) {
              tree = anomaly.model.trees[index].root;
              self.iforest.push(new AnomalyTree(tree, fields));
            }
            self.topAnomalies = anomaly.model.top_anomalies;
          }
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

  // Loads the anomaly detector from the anomaly detector id or from
  // an unfinished object
  if ((NODEJS && ((typeof resource) === 'string')) ||
      utils.getStatus(resource).code !== constants.FINISHED) {
    anomaly = new Anomaly(connection);
    anomaly.get(this.resourceId.resource, true,
                constants.ONLY_MODEL, fillStructure);
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
  for (index = 0; index < len; index++) {
    tree = this.iforest[index];
    depthSum += tree.depth(inputData).depth;
  }
  observedMeanDepth = depthSum / len;
  return Math.pow(2, -observedMeanDepth / this.expectedMeanDepth);
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
        if (inputData[field] === null ||
            (typeof this.fields[field] === 'undefined' &&
             typeof this.invertedFields[field] === 'undefined')) {
          delete inputData[field];
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
    try {
      inputData = utils.cast(newInputData, this.fields);
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
          if (typeof value === 'undefined' || value == null) {
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
