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
  var fs = require('fs');
  var util = require('util');
  var events = require('events');
  var Cluster = require('./Cluster');
  var BigML = require('./BigML');
}
var utils = require(PATH + 'utils');
var LocalCentroid = require(PATH + 'LocalCentroid');
var constants = require(PATH + 'constants');


// End of imports section --- DO NOT REMOVE

var OPTIONAL_FIELDS = ["categorical", "text", "items", "datetime"];


function parseTerms(text, caseSensitive) {
  /**
   * Parses the text into words
   *
   * @param {string} text Text to be parsed
   * @param {boolean} caseSensitive transform if caseSensitive = false
   */
  var expression, pattern, i, len, matches, matchesLen;
  if ((typeof text) === 'undefined' || text == null) {
    return [];
  }
  pattern = new RegExp('(\\b|_)([^\\b_\\s]+?)(\\b|_)', 'g');
  matches = text.match(pattern);
  if (matches == null) {
    return [];
  }
  matchesLen = matches.length;
  if (!caseSensitive) {
    for (i = 0; i < matchesLen; i++) {
      matches[i] = matches[i].toLowerCase();
    }
  }
  return matches;
}

function getUniqueTerms(terms, termForms, tagCloud) {
  /**
   * Extracts the unique terms that occur in one of the alternative forms in
   * term_forms or in the tag cloud.
   *
   * @param {array} terms Terms parsed
   * @param {object} termForms Alternative forms after stemming
   * @param {array} tagCloud List of considered terms
   */

  var extendForms = {}, tagTerms = [], term, termForm, termsSet = [], i,
    termFormsLength, termsLength = terms.length,
    tagCloudLength = tagCloud.length;
  for (i = 0; i < tagCloudLength; i++) {
    tagTerms.push(tagCloud[i][0]);
  }
  for (term in termForms) {
    if (termForms.hasOwnProperty(term)) {
      termFormsLength = termForms[term].length;
      for (i = 0; i < termFormsLength; i++) {
        termForm = termForms[term][i];
        extendForms[termForm] = term;
      }
      extendForms[termForm] = term;
    }
  }
  for (i = 0; i < termsLength; i++) {
    term = terms[i];
    if ((termsSet.indexOf(term) < 0) && tagTerms.indexOf(term) > -1) {
      termsSet.push(term);
    } else if ((termsSet.indexOf(term) < 0) &&
               extendForms.hasOwnProperty(term)) {
      termsSet.push(extendForms[term]);
    }
  }
  return termsSet;
}

/**
 * LocalCluster: Simplified local object for the cluster resource.
 * @constructor
 */
function LocalCluster(resource, connection) {
  /**
   * Constructor for the LocalCluster local object.
   *
   * @param {object} resource BigML cluster resource
   * @param {object} connection BigML connection
   */

  var cluster, self, fillStructure, filename;
  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new Cluster(this.connection);
  this.resType = "cluster";

  this.fields = undefined;
  this.invertedFields = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Cluster structure.
     *
     * @param {object} error Error info
     * @param {object} resource Model's resource info
     */
    var status, fields, field, fieldId, fieldInfo, clusters, i, clustersLength,
      centroid, summaryFields, index;
    if (error) {
      throw new Error('Cannot create the Cluster instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }
    if ((typeof resource.clusters) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        clusters = resource.clusters.clusters;
        clustersLength = clusters.length;
        self.centroids = [];
        for (i = 0; i < clustersLength; i++) {
          centroid = clusters[i];
          self.centroids.push(new LocalCentroid(centroid));
        }
        self.scales = resource.scales;
        self.termForms = {};
        self.tagClouds = {};
        self.termAnalysis = {};
        self.items = {};
        self.itemAnalysis = {};
        fields = resource.clusters.fields;
        summaryFields = resource['summary_fields'];
        for (index = 0; index < summaryFields.length; index++) {
          delete fields[summaryFields[index]];
        }
        for (fieldId in fields) {
          if (fields.hasOwnProperty(fieldId)) {
            field = fields[fieldId];
            if (field.optype === 'text') {
              self.termForms[fieldId] = field.summary.term_forms;
              self.tagClouds[fieldId] = field.summary.tag_cloud;
              self.termAnalysis[fieldId] = field.term_analysis;
            }
            else if (field.optype === 'items') {
              self.items[fieldId] = field.summary.items;
              self.itemAnalysis[fieldId] = field.item_analysis;
            }
          }
        }
        self.fields = fields;
        self.invertedFields = utils.invertObject(fields);
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the Cluster instance. Could not' +
                      ' find the \'clusters\' key in the resource\n');
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
  util.inherits(LocalCluster, events.EventEmitter);
}

LocalCluster.prototype.computeNearest = function (inputData) {
  /**
   * Computes the nearest centroid using the cluster info.
   *
   * @param {object} data Input data to predict from
   */
  var uniqueTerms = {}, terms, caseSensitive, tokenMode, inputDataField,
    fieldId, nearest, distance2, i, clustersLength, centroid,
    regexp;
  for (fieldId in this.tagClouds) {
    if (this.tagClouds.hasOwnProperty(fieldId) &&
        inputData.hasOwnProperty(fieldId)) {
      caseSensitive = this.termAnalysis[fieldId]['case_sensitive'];
      tokenMode = this.termAnalysis[fieldId].tokenMode;
      inputDataField = "";
      if (inputData.hasOwnProperty(fieldId)) {
        inputDataField = inputData[fieldId];
        if (tokenMode !== constants.TM_FULL_TERM) {
          terms = parseTerms(inputDataField, caseSensitive);
        } else {
          terms = [];
        }

        if (tokenMode !== constants.TM_TOKENS) {
          terms.push((caseSensitive) ? inputDataField :
                     inputDataField.toLowerCase());
        }
        uniqueTerms[fieldId] = getUniqueTerms(terms,
                                              this.termForms[fieldId],
                                              this.tagClouds[fieldId]);
        delete inputData[fieldId];
      }
    }
  }
  for (fieldId in this.items) {
    if (this.items.hasOwnProperty(fieldId) &&
        inputData.hasOwnProperty(fieldId)) {
      regexp = utils.separatorRegexp(this.itemAnalysis[fieldId]);
      inputDataField = "";
      if (inputData.hasOwnProperty(fieldId)) {
        inputDataField = inputData[fieldId];
        terms = inputDataField.split(new RegExp(regexp));
        uniqueTerms[fieldId] = getUniqueTerms(terms,
                                              {},
                                              this.items[fieldId]);
        delete inputData[fieldId];
      }
    }
  }

  nearest = {'centroidId': null, 'centroidName': null,
             'distance': Infinity};
  clustersLength = this.centroids.length;
  for (i = 0; i < clustersLength; i++) {
    centroid = this.centroids[i];
    distance2 = centroid.distance2(inputData, uniqueTerms, this.scales,
                                   nearest.distance);
    if (distance2 < nearest.distance) {
      nearest = {'centroidId': centroid.centroidId,
                 'centroidName': centroid.name,
                 'distance': distance2};
    }
  }
  // updating the real distance from its square.
  nearest.distance = Math.sqrt(nearest.distance);
  return nearest;
};

LocalCluster.prototype.centroid = function (inputData, cb) {
  /**
   * Makes a centroid prediction based on a number of field values.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, centroid, clustersLength, self = this;

  function createLocalCentroid(error, inputData) {
    /**
     * Creates a local centroid using the cluster info.
     *
     * @param {object} error Error message
     * @param {object} data Input data to predict from
     */
    if (error) {
      return cb(error, null);
    }
    return cb(null, self.computeNearest(inputData));
  }

  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, createLocalCentroid);
    } else {
      centroid = this.computeNearest(this.validateInput(inputData));
      return centroid;
    }
  } else {
    this.on('ready', function (self) {return self.centroid(inputData, cb); });
    return;
  }
};

LocalCluster.prototype.validateInput = function (inputData, cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var newInputData = {}, field, fieldId, inputDataKey;
  for (fieldId in this.fields) {
    if (this.fields.hasOwnProperty(fieldId)) {
      field = this.fields[fieldId];
      if (OPTIONAL_FIELDS.indexOf(field.optype) < 0 &&
          !inputData.hasOwnProperty(fieldId) &&
          !inputData.hasOwnProperty(field.name)) {
        throw new Error("The input data lacks some numeric fields values." +
                        " To find the related centroid, input data must " +
                        "contain all numeric fields values.");
      }
    }
  }
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


if (NODEJS) {
  module.exports = LocalCluster;
} else {
  exports = LocalCluster;
}
