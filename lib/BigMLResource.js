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

var BigML = require('./BigML');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');

/**
 * BigMLResource: REST interface for resources.
 * @constructor
 * @param {BigML} connection BigML connection object
 */
function BigMLResource(connection) {
  if (utils.getObjectClass(connection) === 'BigML') {
    this.connection = connection;
  } else {
    this.connection = new BigML();
  }
}

function fillGetArguments(args) {
  /**
   * Returns a complete arguments array for calls that miss optional variables
   *
   * @param {array} args Arguments array
   */

  var fullArgs = [undefined, undefined, undefined, undefined],
    length = arguments.length;
  if (length > 1) {
    length -= 1;
    if ((typeof arguments[length]) === 'function') {
      fullArgs[3] = arguments[length];
    } else {
      length += 1;
    }
    if (length === 2) {
      if ((typeof arguments[1]) === 'boolean') {
        fullArgs[2] = arguments[1];
      } else if ((typeof arguments[1]) === 'string') {
        fullArgs[1] = arguments[1];
      } else {
        throw "Check arguments type and number";
      }
    } else if (length === 3) {
      if (((typeof arguments[1]) === 'undefined' || (typeof arguments[1]) === 'boolean') &&
          ((typeof arguments[2]) === 'undefined' || (typeof arguments[2]) === 'string')) {
        fullArgs[1] = arguments[1];
        fullArgs[2] = arguments[2];
      } else {
        throw "Check arguments type and number";
      }
    }
  }
  return fullArgs;
}

BigMLResource.prototype.get = function (resource, finished, query, cb) {
  /**
   * Gets a resource and builds costumized error and resource info
   *
   * @param {object|string} resource BigML resource or resource id
   * @param {boolean} finished (optional) Set to true if you want only
   *        finished resources
   * @param {string} query (optional) Query string for the api call
   * @param {function} cb (optional) Callback
   *
   * Uses HTTP GET to retrieve a BigML `url`.
   *
   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   */

  var length, finishOptions, finishObject, resourceId, reqOptions, fullArgs;

  // Dealing with optional arguments
  if (arguments.length === 0) {
    throw "We need a resource id";
  }
  if (arguments.length < 4) {
    // Getting optional parameters into a full list
    fullArgs = fillGetArguments(arguments);
    finished = fullArgs[1];
    query = fullArgs[2];
    cb = fullArgs[3];
  }
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }

  // reference to self and arguments for retries
  if (finished) {
    finishObject = this;
    finishOptions = {
      resource: resource,
      query: query,
      finished: finished,
      cb: cb
    };
  }

  // connection options
  resourceId = utils.getResource(resource);
  reqOptions = {
    method: 'GET',
    resourceType: resourceId.type,
    endpoint: '/' + resourceId.id,
    query: query
  };

  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {
      var location, iQuery, status,
        code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = {
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
        };

      if (error) {
        result.error.status.message += ': ' + error;
        logger.error(result);
        return cb(result.error, result);
      }
      try {
        location = response.request.uri.href;
        if ((iQuery = location.indexOf('?')) > -1) {
          location = location.substring(0, iQuery);
        }
        logger.debug(response);
        if (response.statusCode === constants.HTTP_OK) {
          result = {
            code: response.statusCode,
            object: data,
            resource: data.resource,
            location: location,
            error: null
          };
          if (finished) {
            status = utils.getStatus(result);
            if (status.code === constants.FAULTY) {
              return cb(null, result);
            }
            if (status.code === constants.FINISHED) {
              return cb(null, result);
            }
            setTimeout(function () {finishObject.get(finishOptions.resource,
                                                    finishOptions.finished,
                                                    finishOptions.query,
                                                    finishOptions.cb); }, 5000);
            return;
          }
          return cb(null, result);
        }
        if (code === constants.HTTP_BAD_REQUEST ||
            code === constants.HTTP_UNAUTHORIZED ||
            code === constants.HTTP_NOT_FOUND) {
          result.error = data;
          logger.error(data);
          return cb(result.error, result);
        }
        logger.error('Unexpected error (' + code + ')');
        return cb(result.error, result);
      } catch (err) {
        result.error.status.message += ': ' + error;
        logger.error(result);
        return cb(result.error, result);
      }
      logger.debug(result);
      return cb(null, result);
    });
};


BigMLResource.prototype.update = function (resource, body, cb) {
  /**
   * Updates a resource and builds costumized error and resource info
   *
   *   Uses PUT to update a BigML resource. Only the new fields that
   *   are going to be updated need to be included in the `body`.
   *
   *   Returns a resource wrapped in a dictionary:
   *     code: HTTP_ACCEPTED if the update has been OK or an error
   *           code otherwise.
   *     resource: Resource/id
   *     location: Remote location of the resource.
   *     object: The new updated resource
   *     error: Error code if any. Null otherwise
   *
   */
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }
  var resourceId = utils.getResource(resource),
    reqOptions = {
      method: 'PUT',
      resourceType: resourceId.type,
      endpoint: '/' + resourceId.id,
      body: body
    };
  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {
      var location, iQuery,
        code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = {
          code: code,
          object: null,
          resource: null,
          location: null,
          error: {
            status: {
              code: code,
              message: 'The resource couldn\'t be updated'
            }
          }
        };
      if (error) {
        result.error.status.message += ': ' + error;
        logger.error(result);
        return cb(result.error, result);
      }
      try {
        location = response.request.uri.href;
        if ((iQuery = location.indexOf('?')) > -1) {
          location = location.substring(0, iQuery);
        }
        logger.debug(response);
        if (response.statusCode === constants.HTTP_ACCEPTED) {
          result = {
            code: response.statusCode,
            object: data,
            resource: data.resource,
            location: location,
            error: null
          };
        } else if (code === constants.HTTP_PAYMENT_REQUIRED ||
                   code === constants.HTTP_UNAUTHORIZED ||
                   code === constants.HTTP_METHOD_NOT_ALLOWED) {
          result.error = data;
          logger.error(data);
          return cb(result.error, result);
        }
        logger.error('Unexpected error (' + code + ')');
        return cb(result.error, result);
      } catch (err) {
        result.error.status.message += ': ' + error;
        logger.error(result);
        return cb(result.error, result);
      }
      logger.debug(result);
      return cb(null, result);
    });
};


BigMLResource.prototype.delete = function (resource, cb) {
  /**
   * Deletes a resource
   * If the request is successful the status `code` will be HTTP_NO_CONTENT
   * and `error` will be null. Otherwise, the `code` will be an error code
   * and `error` will be provide a specific code and explanation.
   *
   */
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }
  var resourceId = utils.getResource(resource),
    reqOptions = {
      method: 'DELETE',
      resourceType: resourceId.type,
      endpoint: '/' + resourceId.id
    };
  this.request(reqOptions, function processResponse(error, data, response) {
    var code = constants.HTTP_INTERNAL_SERVER_ERROR,
      result = {
        code: code,
        error: {
          status: {
            code: code,
            message: 'The resource couldn\'t be retrieved'
          }
        }
      };
    if (error) {
      result.error.status.message += ': ' + error;
      logger.error(result);
      return cb(result.error, result);
    }
    try {
      logger.debug(response);
      if (response.statusCode === constants.HTTP_NO_CONTENT) {
        result = {
          code: response.statusCode,
          error: null
        };
      } else if (code === constants.HTTP_BAD_REQUEST ||
                 code === constants.HTTP_UNAUTHORIZED ||
                 code === constants.HTTP_NOT_FOUND) {
        result.error = data;
        logger.error(data);
        return cb(result.error, result);
      }
      logger.error('Unexpected error (' + code + ')');
      return cb(result.error, result);
    } catch (err) {
      result.error.status.message += ': ' + error;
      logger.error(result);
      return cb(result.error, result);
    }
    logger.debug(result);
    return cb(null, result);
  });
};

module.exports = BigMLResource;
