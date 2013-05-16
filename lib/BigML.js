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

var request = require('request');
var constants = require('./constants');
var logger = require('./logger');

function getResource(resource) {
  /**
   * Auxiliar function to get the resource structure
   *
   * @parm {object|string} resource object or id string
   */
  if ((typeof resource) === 'object') resource = resource.resource;
  var iSlash;
  if ((iSlash = resource.indexOf("/")) > -1) {
    type = resource.substring(0, iSlash);
    id = resource.substring(iSlash + 1);
    return {
      'type':type,
      'id': id
    }
  }
  else throw "Wrong resource id";
}

function showResult(error, resource) {
    console.log('error: ' + error);
    console.log('result: ' + JSON.stringify(resource));
}

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
  }
  else {
    this.devMode = false;
  }
  this.auth = "?username=" + this.username + ";api_key=" + this.apiKey;
  if (devMode) {
      this.url = constants.BIGML_DEV_URL;
  }
  else {
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
  }
}

BigML.prototype.request = function(options, cb) {
  /**
   * API request processing
   *
   * @param {object} options uri, body, method and query options
   */

  var uri = this.resourceUrls[options.resourceType] +
    options.endpoint + this.auth;

  if (options.query) {
    uri += ';' + qs.stringify(options.query);
  }

  var body = JSON.stringify(options.body);

  var reqOptions = {
    method     : options.method || 'GET',
    headers    : options.headers || constants.SEND_JSON,
    uri        : uri,
    body       : body,
    strictSSL  : constants.VERIFY
  };

  request(reqOptions, function(error, response, body) {
    if (error) {
      logger.error(error);
      return cb(error);
    }

    if (body) {
      try {
        var json = JSON.parse(body);
        cb(null, json, response);
      } catch (err) { 
        logger.error(err);
        return cb(err, body, response);
      }
    } else {
      return cb(null, null, response);
    }
  });
}

BigML.prototype.get = function(resource, query, cb) {
  /**
   * Gets a resource and builds costumized error and resource info
   *
   * Uses HTTP GET to retrieve a BigML `url`.

   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   */
  if ((typeof cb) === 'undefined') cb = showResult;
  resourceId = getResource(resource);
  reqOptions = {
    method: 'GET',
    resourceType: resourceId.type,
    endpoint: '/' + resourceId.id,
    query: query
  }
  this.request(reqOptions, function processResponse(error, data, response) {
    var code = constants.HTTP_INTERNAL_SERVER_ERROR;
    var result = {
      code: code,
      object: null,
      resource: null,
      location: null,
      error: {
        status: {
          code: code,
          message: 'The resource couldn\'t be retrieved'
        }
      }
    }
    if (error) {
      result.error.status.message += ': ' + error;
      logger.error(result)
      return cb(result.error, result);
    }
    try {
      var resource = data;
      var location = response.request.uri.href;
      var iQuery;
      if ((iQuery = location.indexOf('?')) > -1) {
        location = location.substring(0, iQuery);
      }
      logger.debug(response)
      if (response.statusCode == constants.HTTP_OK) {
        result = {
          code: response.statusCode,
          object: resource,
          resource: resource.resource,
          location: location,
          error: null
        }
      }
      else if (code === constants.HTTP_BAD_REQUEST ||
               code === constants.HTTP_UNAUTHORIZED ||
               code === constants.HTTP_NOT_FOUND) {
        result.error = data;
        logger.error(data);
        return cb(result.error, result);
      }
      else {
        logger.error('Unexpected error (' + code + ')');
        return cb(result.error, result);
      }
    } catch (err) {
      result.error.status.message += ': ' + error;
      logger.error(result);
      return cb(result.error, result);
    }
    logger.debug(result);
    return cb(null, result);
  })
}

BigML.prototype.delete = function(resource, cb) {
  /**
   * Deletes a resource
   * If the request is successful the status `code` will be HTTP_NO_CONTENT
   * and `error` will be null. Otherwise, the `code` will be an error code
   * and `error` will be provide a specific code and explanation.
   *
   */
  if ((typeof cb) === 'undefined') cb = showResult;
  resourceId = getResource(resource);
  reqOptions = {
    method: 'DELETE',
    resourceType: resourceId.type,
    endpoint: '/' + resourceId.id
  }
  this.request(reqOptions, function processResponse(error, data, response) {
    var code = constants.HTTP_INTERNAL_SERVER_ERROR;
    var result = {
      code: code,
      error: {
        status: {
          code: code,
          message: 'The resource couldn\'t be retrieved'
        }
      }
    }
    if (error) {
      result.error.status.message += ': ' + error;
      logger.error(result)
      return cb(result.error, result);
    }
    try {
      logger.debug(response)
      if (response.statusCode == constants.HTTP_NO_CONTENT) {
        result = {
          code: response.statusCode,
          error: null
        }
      }
      else if (code === constants.HTTP_BAD_REQUEST ||
               code === constants.HTTP_UNAUTHORIZED ||
               code === constants.HTTP_NOT_FOUND) {
        result.error = data;
        logger.error(data);
        return cb(result.error, result);
      }
      else {
        logger.error('Unexpected error (' + code + ')');
        return cb(result.error, result);
      }
    } catch (err) {
      result.error.status.message += ': ' + error;
      logger.error(result);
      return cb(result.error, result);
    }
    logger.debug(result);
    return cb(null, result);
  });
}

module.exports = BigML;
