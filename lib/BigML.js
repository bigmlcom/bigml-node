/**
 * Copyright 2013-2023 BigML
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

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const constants = require('./constants');
const logger = require('./logger');
const waittime = require('./waittime');
const path = require('path');


const PROJECT = "project";


function getUrl(context) {
  var url = constants.BIGML_URL, protocol, domain;
  if (typeof context !== 'undefined' && context != null) {
    if (typeof context !== 'object') {
      throw new Error("The connection constructor accepts an object" +
                      " whose allowed keys are: protocol, domain and" +
                      " storage. Old devMode parameter has been deprecated.");
    }
    protocol = context.protocol || constants.BIGML_PROTOCOL;
    domain = context.domain || constants.BIGML_DOMAIN;
    url = protocol + "://" + domain + "/andromeda/";
  }
  return url;
}

function credentials(connection, organization) {
  var auth = connection.auth;
  if (organization && connection.organization) {
    auth += ";organization=" + connection.organization;
  } else if (connection.project) {
    auth += ";project=" + connection.project;
  }
  return auth;
}


/**
 * BigML: connection to the BigML api.
 * @constructor
 */
function BigML(username, apiKey, context) {
  /**
   * Constructor for the BigML api connection
   *
   * @param {string} username The authentication username
   * @param {string} apiKey The authentication api key
   * @param {object} context Optional settings for the connection:
   *                         domain, protocol and storage
   * Warning: the old `devMode` parameter has been deprecated
   */

  this.username = username || process.env.BIGML_USERNAME;
  this.apiKey = apiKey || process.env.BIGML_API_KEY;
  this.url = getUrl(context)
  this.auth = "?username=" + this.username + ";api_key=" + this.apiKey;
  this.project = undefined;
  this.organization = undefined;
  this.resourceUrls = {};
  this.debug = false;
  try {
    this.debug = (process.env.BIGML_DEBUG == "1");
  } catch (e)
  {}
  // Base resource URLs
  for (var index = 0; index < constants.RESOURCE_TYPES.length; index++) {
    this.resourceUrls[constants.RESOURCE_TYPES[index]] = this.url +
      constants.RESOURCE_TYPES[index];
  }
  this.downloadPath = '/download';
  this.storage = null;
  // Context depending attributes
  if (typeof context !== 'undefined') {
    this.project = context.project;
    this.organization = context.organization;
    // Creating the storage directory to store JSON
    // in local files for later use if needed
    if (typeof context.storage !== 'undefined' &&
        context.storage != null) {
      if (typeof context.storage === 'string') {
        try {
            if (!fs.existsSync(context.storage)) {
              fs.mkdirSync(context.storage);
            }
            this.storage = context.storage;
        } catch(e) {throw new Error("Failed to create the storage directory: "
          + context.storage)}
      } else if (typeof context.storage === 'object' &&
               typeof context.storage.get === 'function' &&
               typeof context.storage.set === 'function') {
        // cache-manager handles storage
        this.storage = context.storage;
      }
    }
  }
}

BigML.prototype.request = function (options, retry, cb) {
  /**
   * API request processing
   *
   * @param {object} options uri, body, method and query options
   * @param {object} retry Retry options, if any, for communications failure
   * @param {function} cb Callback function
   */

  var reqOptions, self = this, filename, fileLength,
    uri, body = JSON.stringify(options.body);
  if (typeof options.resource !== "undefined") {
    uri = this.url + options.resource +
          credentials(this, options.resourceType == PROJECT);
  } else {
    uri = this.resourceUrls[options.resourceType] +
      options.endpoint + credentials(this, options.resourceType == PROJECT);
  }
  if (arguments.length < 3) {
    retry = {retries: constants.DEFAULT_BIGML_RETRIES,
             wait: constants.DEFAULT_BIGML_WAIT,
             retriesLeft: constants.DEFAULT_BIGML_RETRIES};
    if ((typeof arguments[arguments.length - 1]) === 'function') {
      cb = arguments[arguments.length - 1];
    }
  }
  if (options.query) {
    uri += ';' + options.query;
  }
  reqOptions = {
    method       : options.method || 'GET',
    headers      : options.headers || constants.SEND_JSON,
    data         : body,
    responseType : "json",
    httpsAgent   : new https.Agent({rejectUnauthorized: constants.VERIFY}),
    store        : options.store || false,
    url          : uri,
    debug        : this.debug
  };
  if (this.debug) {
    console.log(JSON.stringify(reqOptions));
  }
  axios(reqOptions)
    .then(function (response) {
      if (response) {
        var json, body, safeId;
        json = response.data;
        try {
          body = JSON.stringify(json);
          if (self.debug) {
            console.log(response);
          }
          if (typeof self.storage !== 'undefined' && self.storage !== null &&
              reqOptions.method !== "DELETE"  && reqOptions.store &&
              typeof options.resource !== 'undefined') {
            safeId = options.resource.replace('/', '_');

            // local storage in file system expects the path to a directory
            if (typeof self.storage === 'string') {
              try {
                if (!fs.existsSync(self.storage)) {
                  fs.mkdirSync(self.storage);
                }
                filename = path.join(self.storage, safeId);
                fileLength = fs.writeFileSync(filename, body);
              } catch (ferr) {logger.error('Storage error: ' + ferr +
                              "\nfilename: " + filename);}
            } else if (typeof self.storage === 'object' &&
                       typeof self.storage.set === 'function') {
              // cache-like type of storage needs a set function to be provided
              // expecting the following arguments:
              // self.storage.set(key, val, cb). The ttl value should be
              // defined in the cache manager constructor
              self.storage.set(safeId, body,
                               function(error) {
                if (error) {logger.error('Problem caching ' + options.resource +
                                         ': ' + error);}
                if (self.debug) {
                  self.storage.get(safeId, function (error, data) {
                    console.log("Stored in cache:"+ JSON.parse(data).resource)});}});
            } else {
              logger.error("Invalid storage. Storage can the path to" +
                           " a file system directory" +
                           " used as storage or to a cache-manager object" +
                           " that provides set, get and del methods.");
            }
          }
        } catch (err) { //JSON error
          logger.error('JSON Error: ' + err + '\nresponse: ');
          logger.error(response);

          return cb(err, null, response);
        }
        return cb(null, json, response);
      }
      return cb(null, null, response)})
    .catch(function (error) {
      if (reqOptions.method !== "DELETE") {
        var errMessage = error
        if (typeof error.response !== undefined) {
          errMessage += " " + error.response.data.status.message;
          errMessage += "(" + JSON.stringify(
            error.response.data.status.extra) +")";
        }
        var errorMessage = 'Remote request failed: ' + errMessage, wait;
        if (self.debug) {
          console.log("error message:", errorMessage);
        }
        if (retry.retriesLeft > 0 &&
            constants.RETRY_ERRORS.indexOf(error.response.status) > -1) {
          retry.retriesLeft -= 1;
          wait = waittime.getWaitTimeExp(retry);
          logger.error(options);
          logger.error(retry);
          setTimeout(function () {self.request(options, retry, cb); }, wait);
          errorMessage += (' Retrying in ' + wait / 1000 +
                           ' s. ' + retry.retriesLeft +
                           ' retries left.');
          logger.error(errorMessage);
        } else {
          logger.error(errorMessage);
          return cb(error, error.response.data, error.response);
        }
      }
    })};




BigML.prototype.download = function (options, filename, retry, cb) {
  /**
   * API request processing
   *
   * @param {string} uri Uri of the remote file
   * @param {string} filename Name of the local file to download to
   */

  var reqOptions, downloadFile, errorMessage, downloadStatus, wait,
    self = this, uri = this.resourceUrls[options.resourceType] +
    options.endpoint + this.downloadPath + this.auth, secondStep = false;

  if (arguments.length < 3 || typeof retry === "undefined") {
    retry = {retries: constants.DEFAULT_BIGML_RETRIES,
             wait: constants.DEFAULT_BIGML_WAIT,
             retriesLeft: constants.DEFAULT_BIGML_RETRIES};
    if ((typeof arguments[arguments.length - 1]) === 'function') {
      cb = arguments[arguments.length - 1];
    }
  }

  reqOptions = {
    method       : 'GET',
    url          : uri,
    responseType : 'stream',
    httpsAgent   : new https.Agent({rejectUnauthorized: constants.VERIFY})
  };
  axios(reqOptions).then(function (response) {
    if (typeof retry !== 'undefined' &&
        typeof retry.retriesLeft !== undefined &&
        retry.retriesLeft == -1) {
      // Pipe the downloaded data to the file

      downloadFile = fs.createWriteStream(filename);
      response.data.pipe(downloadFile);
      downloadFile.on('finish', function() {
        downloadFile.close(function() {cb(null, filename);});
      });

    } else {

      try {
        response.data.on('data', function (chunk) {
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
                } else {
                  return cb(new Error("Error downloading"), null);
                }
              }
            }
          } catch (errJSON) {
            if (retry.retriesLeft > -1) {
              retry.retriesLeft = -1;
              setTimeout(function () {
                  self.download(options, filename, retry, cb); }, wait);
              return;}
            }
        });
      } catch (err) {
        logger.error('Error: ' + err);
        return cb(err, null);
      }
    }
  })
  .catch(function (error) {
    logger.error('Error: ' + error);
    return cb(error, null);
  });

  if ((typeof filename) === 'undefined') {
    return cb(null, response);
  }

  return;
};

module.exports = BigML;
