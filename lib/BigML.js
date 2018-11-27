/**
 * Copyright 2013-2018 BigML
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
var path = require('path');


var PROJECT = "project";


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
    // Creating the storage directory to store JSON in local files for later use
    if (typeof context.storage !== 'undefined') {
      try {
          if (!fs.existsSync(context.storage)) {
            fs.mkdirSync(context.storage);
          }
          this.storage = context.storage;
      } catch(e) {throw new Error("Failed to create the storage directory: "
        + context.storage)}
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
    strictSSL  : constants.VERIFY,
    store      : options.store || false,
    resource   : options.resource
  };
  if (process.env.BIGML_DEBUG || false) {
    console.log(JSON.stringify(reqOptions));
  }
  request(reqOptions, function (error, response, body) {
    if (error || (reqOptions.method !== "DELETE" && body.length < 1)) {
      var errorMessage = 'Remote request failed: ' + error;
      if (retry.retriesLeft > 0) {
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
        return cb(error);
      }
    }
    if (body) {
      var json;
      try {
        if (process.env.BIGML_DEBUG || false) {
          console.log(body);
        }
        json = JSON.parse(body);
        if (typeof self.storage !== 'undefined' && self.storage !== null &&
            reqOptions.method !== "DELETE"  && reqOptions.store &&
            typeof reqOptions.resource !== 'undefined') {
          try {
            filename = path.join(self.storage,
                                 options.resource.replace("/", "_"));
            fileLength = fs.writeFileSync(filename, body);
          } catch (ferr) {logger.error('Storage error: ' + ferr +
                          "\nfilename: " + filename);}
        }
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
