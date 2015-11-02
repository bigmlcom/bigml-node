/**
 * Copyright 2013-2104 BigML
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
var fs = require('fs');
var constants = require('./constants');
var logger = require('./logger');
var waittime = require('./waittime');

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
    'ensemble': this.url + constants.ENSEMBLE_PATH,
    'batchprediction': this.url + constants.BATCH_PREDICTION_PATH,
    'cluster': this.url + constants.CLUSTER_PATH,
    'centroid': this.url + constants.CENTROID_PATH,
    'batchcentroid': this.url + constants.BATCH_CENTROID_PATH,
    'anomaly': this.url + constants.ANOMALY_PATH,
    'anomalyscore': this.url + constants.ANOMALY_SCORE_PATH,
    'batchanomalyscore': this.url + constants.BATCH_ANOMALY_SCORE_PATH,
    'project': this.url + constants.PROJECT_PATH,
    'sample': this.url + constants.SAMPLE_PATH,
    'correlation': this.url + constants.CORRELATION_PATH,
    'statisticaltest': this.url + constants.STATISTICAL_TEST_PATH,
    'logisticregression': this.url + constants.LOGISTIC_REGRESSION_PATH
  };
  this.downloadPath = '/download';
}

BigML.prototype.request = function (options, retry, cb) {
  /**
   * API request processing
   *
   * @param {object} options uri, body, method and query options
   */

  var reqOptions, self = this,
    uri, body = JSON.stringify(options.body);
  if (typeof options.resource !== "undefined") {
    uri = this.url + options.resource + this.auth;
  } else {
    uri = this.resourceUrls[options.resourceType] +
      options.endpoint + this.auth;
  }
  if (arguments.length < 3) {
    retry = {retries: constants.BIGML_RETRIES, wait: constants.BIGML_WAIT,
             retriesLeft: constants.BIGML_RETRIES};
    if ((typeof arguments[arguments.length - 1]) === 'function') {
      cb = arguments[arguments.length - 1];
    }
  }
  if (options.query) {
    uri += ';' + options.query;
  }
  reqOptions = {
    method     : options.method || 'GET',
    headers    : options.headers || constants.SEND_JSON,
    uri        : uri,
    body       : body,
    strictSSL  : constants.VERIFY
  };
  request(reqOptions, function (error, response, body) {
    if (error) {
      var errorMessage = 'Remote request failed: ' + error;
      if (retry.retriesLeft > 0) {
        retry.retriesLeft -= 1;
        wait = waittime.getWaitTimeExp(retry);
        setTimeout(function () {self.request(options, retry, cb); }, wait);
        errorMessage += (' Retrying in ' + wait / 1000 +
                         ' s. ' + retry.retriesLeft +
                         ' retries left.');
        logger.error(errorMessage);
      } else {
        logger.error(errorMessage);
        return cb(error);
      }
    }
    if (body) {
      var json;
      try {
        json = JSON.parse(body);
      } catch (err) { //JSON error
        logger.error('JSON Error: ' + err + '\nbody: ' + body);
        return cb(err, body, response);
      }
      return cb(null, json, response);
    }
    return cb(null, null, response);
  });
};

BigML.prototype.download = function (options, filename, retry, cb) {
  /**
   * API request processing
   *
   * @param {string} uri Uri of the remote file
   * @param {string} filename Name of the local file to download to
   */

  var reqOptions, req, downloadFile, errorMessage, downloadStatus, wait,
    self = this, downloadFinished = false,
    uri = this.resourceUrls[options.resourceType] +
    options.endpoint + this.downloadPath + this.auth;

  reqOptions = {
    method     : 'GET',
    uri        : uri,
    strictSSL  : constants.VERIFY
  };
  req = request(reqOptions);
  req.on('error', function (error) {
      logger.error('Error: ' + error);
      return cb(error, null);
    });
  if ((typeof filename) === 'undefined') {
    return cb(null, req);
  }
  try {
    req.on('data', function(chunk) {
      // dataset export response can be either a JSON structure or the CSV file
      try {
        if (typeof retry !== 'undefined') {
          downloadStatus = JSON.parse(chunk);
          if (downloadStatus.code !== constants.HTTP_OK) {
            return cb(new Error(downloadStatus.status.message), null);
          } else {
            if (typeof downloadStatus.status.code !== 'undefined') {
              if (downloadStatus.status.code !== constants.FINISHED) {
                if (retry.retriesLeft > 0) {
                  retry.retriesLeft -= 1;
                  wait = waittime.getWaitTimeExp(retry);
                  setTimeout(function () {
                      self.download(options, filename, retry, cb); }, wait);
                  return;
                } else {
                  errorMessage = ('The maximum number of retries for ' +
                    'the download has been exceeded. You can retry your ' +
                    'command again in a while');
                  logger.error(errorMessage);
                  return cb(error, null);
                }
              } else if (retry.retriesLeft > -1) {
                retry.retriesLeft = -1;
                setTimeout(function () {
                    self.download(options, filename, retry, cb); }, wait);
                return;
              }
            }
          }
        }
      } catch (errJSON) {}
      // Pipe the downloaded data to the file
      downloadFile = fs.createWriteStream(filename, {'flags': 'a'});
      downloadFile.write(chunk);
      downloadFinished = true;
    });
    req.on('end', function() {
      if (downloadFinished) {
        downloadFile.end();
        downloadFile.close();
        return cb(null, filename);
      }
    });
  } catch (err) {
    logger.error('Error: ' + err);
    return cb(err, null);
  }
  return;
};

module.exports = BigML;
