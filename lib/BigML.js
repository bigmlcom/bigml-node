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

var request = require('request');
var qs = require('querystring');
var constants = require('./constants');
var logger = require('./logger');

/**
 * BigML: connection to the BigML api.
 * @constructor
 */
function BigML(username, apiKey, devMode) {
  /**
   * Constructor for the BigML api connection
   *
   * @param {string} username The authentication username
   * @param {string} apiKey The authentication api key
   * @param {boolean} devMode True to activate development mode
   */

  this.username = username || process.env.BIGML_USERNAME;
  this.apiKey = apiKey || process.env.BIGML_API_KEY;
  if ((typeof devMode) === 'boolean') {
    this.devMode = devMode;
  } else {
    this.devMode = false;
  }
  this.auth = "?username=" + this.username + ";api_key=" + this.apiKey;
  if (devMode) {
    this.url = constants.BIGML_DEV_URL;
  } else {
    this.url = constants.BIGML_URL;
  }

  // Base Resource URLs
  this.resourceUrls = {
    'source': this.url + constants.SOURCE_PATH,
    'dataset': this.url + constants.DATASET_PATH,
    'model': this.url + constants.MODEL_PATH,
    'prediction': this.url + constants.PREDICTION_PATH,
    'evaluation': this.url + constants.EVALUATION_PATH,
    'ensemble': this.url + constants.ENSEMBLE_PATH
  };
}

BigML.prototype.request = function (options, cb) {
  /**
   * API request processing
   *
   * @param {object} options uri, body, method and query options
   */

  var uri = this.resourceUrls[options.resourceType] +
    options.endpoint + this.auth,
    body = JSON.stringify(options.body),
    reqOptions = {
      method     : options.method || 'GET',
      headers    : options.headers || constants.SEND_JSON,
      uri        : uri,
      body       : body,
      strictSSL  : constants.VERIFY
    };

  if (options.query) {
    uri += ';' + qs.stringify(options.query);
  }

  request(reqOptions, function (error, response, body) {
    if (error) {
      logger.error(error);
      return cb(error);
    }

    if (body) {
      try {
        var json = JSON.parse(body);
        return cb(null, json, response);
      } catch (err) {
        logger.error(err);
        return cb(err, body, response);
      }
    } else {
      return cb(null, null, response);
    }
  });
}

module.exports = BigML;
