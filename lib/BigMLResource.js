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
    length = args.length;
  if (length > 1) {
    length -= 1;
    if ((typeof args[length]) === 'function') {
      fullArgs[3] = args[length];
    } else {
      length += 1;
    }
    if (length === 2) {
      if ((typeof args[1]) === 'boolean') {
        fullArgs[2] = args[1];
      } else if ((typeof args[1]) === 'string') {
        fullArgs[1] = args[1];
      } else {
        throw "Check arguments type and number";
      }
    } else if (length === 3) {
      if (((typeof args[1]) === 'undefined' || (typeof args[1]) === 'boolean') &&
          ((typeof args[2]) === 'undefined' || (typeof args[2]) === 'string')) {
        fullArgs[1] = args[1];
        fullArgs[2] = args[2];
      } else {
        throw "Check arguments type and number";
      }
    }
  }
  return fullArgs;
}

function buildEmptyResult(type, code, message) {
  /**
   * Returns an initialized structure for each result type
   *
   * @param {string} type Type of results: resource, delete, list
   * @param {integer} code Default error code
   * @param {string} message Default error message
   */
  switch (type) {
  case 'resource':
    return {
      code: code,
      object: null,
      resource: null,
      location: null,
      error: {
        status: {
          code: code,
          message: message
        }
      }
    };
  case 'deleted':
    return {
      code: code,
      error: {
        status: {
          code: code,
          message: message
        }
      }
    };
  case 'list':
    return {
      code: code,
      meta: null,
      resources: null,
      error: {
        status: {
          code: code,
          message: message
        }
      }
    };
  }
}

function buildResult(type, data, response) {
  /**
   * Returns an informed structure for each result type
   *
   * @param {string} type Type of results: resource, delete, list
   * @param {string} data Response data
   * @param {object} response Response object
   */
  var location, iQuery;
  switch (type) {
  case 'resource':
    location = response.request.uri.href;
    if ((iQuery = location.indexOf('?')) > -1) {
      location = location.substring(0, iQuery);
    }
    return {
      code: response.statusCode,
      object: data,
      resource: data.resource,
      location: location,
      error: null
    };
  case 'delete':
    return {
      code: response.statusCode,
      error: null
    };
  case 'list':
    return {
      code: response.statusCode,
      meta: data.meta,
      resources: data.objects,
      error: null
    };
  }
}

function requestResponse(type, okStatus, koStatuses,
                         error, data, response, result, cb) {
  /**
   * Analyzes the request response to trigger the callback and returned info
   *
   * @param {string} type Type of results: resource, delete, list
   * @param {integer} okStatus Http status code for success
   * @param {integer} koStatus Http status code for failure
   * @param {object} error Error info
   * @param {string} data Response data
   * @param {object} response Request response object
   * @param {object} result Returned info
   * @param {function} cb Callback
   */
  var code = constants.HTTP_INTERNAL_SERVER_ERROR;
  if (error) {
    logger.error('Error processing request: ' + error + '\ndata: ' + data);
    result.error.status.message += ': ' + error;
    return cb(result.error, result);
  }
  try {
    logger.debug(response);
    code = response.statusCode;
    if (code === okStatus) {
      result = buildResult(type, data, response);
      logger.debug(result);
      return cb(null, result);
    }
    if (koStatuses.indexOf(code) > -1) {
      result.error = data;
      logger.error(data);
    } else {
      logger.error('Unexpected error (' + code + ')');
    }
  } catch (err) {
    logger.error(err);
    result.error.status.message += ': ' + err;
  }
  return cb(result.error, result);
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
      var status,
        code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = buildEmptyResult('resource',
                                code,
                                'The resource couldn\'t be retrieved');

      if (error) {
        logger.error("Request processing error: " + error + "\ndata: " + data);
        result.error.status.message += ': ' + error;
        return cb(error, result);
      }
      try {
        logger.debug(response);
        code = response.statusCode;
        if (code === constants.HTTP_OK) {
          result = buildResult('resource', data, response);
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
          logger.debug(result);
          return cb(null, result);
        }
        if ([constants.HTTP_BAD_REQUEST, constants.HTTP_UNAUTHORIZED,
                     constants.HTTP_NOT_FOUND].indexOf(code) > -1) {
          result.error = data;
          logger.error(data);
        } else {
          logger.error('Unexpected error (' + code + ')');
        }
      } catch (err) {
        logger.error(err);
        result.error.status.message += ': ' + error;
      }
      return cb(result.error, result);
    });
};


BigMLResource.prototype.update = function (resource, body, cb) {
  /**
   * Updates a resource and builds customized error and resource info
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
      var code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = buildEmptyResult('resource',
                                code,
                                'The resource couldn\'t be updated');
      return requestResponse('resource', constants.HTTP_ACCEPTED,
                             [constants.HTTP_PAYMENT_REQUIRED,
                              constants.HTTP_UNAUTHORIZED,
                              constants.HTTP_METHOD_NOT_ALLOWED],
                             error, data, response, result, cb);
    });
};


BigMLResource.prototype.delete = function (resource, cb) {
  /**
   * Deletes a resource
   * If the request is successful the status `code` will be HTTP_NO_CONTENT
   * and `error` will be null. Otherwise, the `code` will be an error code
   * and `error` will provide a specific code and explanation.
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
  this.connection.request(reqOptions, function processResponse(error, data, response) {

    var code = constants.HTTP_INTERNAL_SERVER_ERROR,
      result = buildEmptyResult('delete',
                              code,
                              'The resource couldn\'t be deleted');
    return requestResponse('delete', constants.HTTP_NO_CONTENT,
                           [constants.HTTP_BAD_REQUEST,
                            constants.HTTP_UNAUTHORIZED,
                            constants.HTTP_NOT_FOUND],
                           error, data, response, result, cb);

  });
};

BigMLResource.prototype.list = function (resourceType, query, cb) {
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }
  var reqOptions = {
      method: 'GET',
      resourceType: resourceType,
      endpoint: '',
      query: query,
      headers: constants.ACCEPT_JSON
    };
  this.connection.request(reqOptions, function processResponse(error, data, response) {
    var code = constants.HTTP_INTERNAL_SERVER_ERROR,
      result = buildEmptyResult('list',
                              code,
                              'The resources couldn\'t be listed');
    return requestResponse('list', constants.HTTP_OK,
                           [constants.HTTP_BAD_REQUEST,
                            constants.HTTP_UNAUTHORIZED,
                            constants.HTTP_NOT_FOUND],
                           error, data, response, result, cb);
  });
};

module.exports = BigMLResource;
