/**
 * Copyright 2013 BigML
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
 * Resource: REST interface for resources.
 * @constructor
 * @param {BigML} connection BigML connection object
 */
function Resource(connection) {
  this.connection = utils.checkConnection(connection);
}

function optionalParams(args) {
  /**
   * Returns a complete arguments array for calls that miss optional variables
   *
   * @param {array} args Arguments array
   */

  var fullArgs = [args[0], undefined, undefined, undefined],
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
        fullArgs[1] = args[1];
      } else if ((typeof args[1]) === 'string') {
        fullArgs[2] = args[1];
      } else {
        throw new Error('Check arguments type and number');
      }
    } else if (length === 3) {
      if (((typeof args[1]) === 'undefined' || (typeof args[1]) === 'boolean') &&
          ((typeof args[2]) === 'undefined' || (typeof args[2]) === 'string')) {
        fullArgs[1] = args[1];
        fullArgs[2] = args[2];
      } else {
        throw new Error('Check arguments type and number');
      }
    }
  }
  return fullArgs;
}

Resource.prototype.get = function (resource, finished, query, cb) {
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

  var length, finishOptions, finishObject, resourceId, reqOptions, fullArgs,
    params = {resource: resource, finished: finished, query: query, cb: cb};

  // Dealing with optional arguments
  if (arguments.length === 0) {
    throw new Error('No first argument was provided. A resource id is needed');
  }
  if (arguments.length < 4) {
    // Getting optional parameters into a full list
    fullArgs = optionalParams(arguments);
    params.finished = fullArgs[1];
    params.query = fullArgs[2];
    params.cb = fullArgs[3];
  }
  if ((typeof params.cb) === 'undefined') {
    params.cb = utils.showResult;
  }

  // reference to self and arguments for retries
  if (params.finished) {
    finishObject = this;
  }

  // connection options
  resourceId = utils.getResource(resource);
  reqOptions = {
    method: 'GET',
    resourceType: resourceId.type,
    endpoint: '/' + resourceId.id,
    query: params.query
  };

  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {
      var status, errorMessage,
        code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = utils.makeEmptyResult('resource',
                                       code,
                                       'The resource couldn\'t be retrieved');
      if (error) {
        logger.error('Request processing error: ' + error);
        result.error.status.message += ': ' + error;
        return params.cb(error, result);
      }
      logger.debug(response);
      code = response.statusCode;
      if (code === constants.HTTP_OK) {
        try {
          result = utils.makeResult('resource', data, response);
        } catch (err) {
          return params.cb(err, result);
        }

        if (params.finished) {
          try {
            status = utils.getStatus(result);
          } catch (statusError) {
            return params.cb(statusError, result);
          }
          if ([constants.FAULTY,
               constants.FINISHED].indexOf(status.code) > -1) {
            logger.debug(result);
            return params.cb(null, result);
          }
          setTimeout(function () {finishObject.get(params.resource,
                                                   params.finished,
                                                   params.query,
                                                   params.cb); }, 1000);
          return;
        }
        logger.debug(result);
        return params.cb(null, result);
      }
      if ([constants.HTTP_BAD_REQUEST, constants.HTTP_UNAUTHORIZED,
           constants.HTTP_NOT_FOUND].indexOf(code) > -1) {
        result.error = data;
        logger.error(data);
      } else {
        errorMessage = 'Unexpected error (' + code + ')';
        logger.error(errorMessage);
        result.error.status.message += ': ' + errorMessage;
      }
      error = new Error(result.error.status.message);
      return params.cb(error, result);
    });
};

Resource.prototype.create = function (type, origins, message,
                                           resource, body, cb) {
  /**
   * Creates a resource and builds customized error and resource info
   *
   * Uses HTTP POST to send resource content.
   *
   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   */

  var self = this, options,
    resourceId = utils.getResource(resource),
    reqOptions = {
      method: 'POST',
      resourceType: type,
      endpoint: '/'
    };

  options = utils.optionalCUParams([].slice.call(arguments, 3), message);

  if (origins.indexOf(resourceId.type) > -1) {
    options.args[resourceId.type] = resourceId.resource;
  } else {
    throw new Error(message);
  }
  reqOptions.body = options.args;

  function sendRequest(error, data) {
    self.connection.request(reqOptions,
                            function processResponse(error, data, response) {
        var code = constants.HTTP_INTERNAL_SERVER_ERROR,
          result = utils.makeEmptyResult('resource',
                                         code,
                                         'The resource couldn\'t be created');
        return utils.requestResponse('resource', constants.HTTP_CREATED,
                                     [constants.HTTP_PAYMENT_REQUIRED,
                                      constants.HTTP_UNAUTHORIZED,
                                      constants.HTTP_BAD_REQUEST,
                                      constants.HTTP_FORBIDDEN,
                                      constants.HTTP_NOT_FOUND],
                                     error, data, response, result, options.cb);
      });
  }
  this.get(resourceId.resource, true, sendRequest);
};


Resource.prototype.update = function (resource, body, cb) {
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

  var options, resourceId = utils.getResource(resource),
    reqOptions = {
      method: 'PUT',
      resourceType: resourceId.type,
      endpoint: '/' + resourceId.id,
    }, message = 'Failed to update the ' + resourceId.type +
    '. First parameter must be a ' + resourceId.type + ' id.';
  options = utils.optionalCUParams(arguments, message);
  reqOptions.body = options.args;
  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {
      var code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = utils.makeEmptyResult('resource',
                                       code,
                                       'The resource couldn\'t be updated');
      return utils.requestResponse('resource', constants.HTTP_ACCEPTED,
                                   [constants.HTTP_PAYMENT_REQUIRED,
                                    constants.HTTP_UNAUTHORIZED,
                                    constants.HTTP_METHOD_NOT_ALLOWED],
                                   error, data, response, result,
                                   options.cb);
    });
};


Resource.prototype.delete = function (resource, cb) {
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
  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {

      var code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = utils.makeEmptyResult('delete',
                                       code,
                                       'The resource couldn\'t be deleted');
      return utils.requestResponse('delete', constants.HTTP_NO_CONTENT,
                                   [constants.HTTP_BAD_REQUEST,
                                    constants.HTTP_UNAUTHORIZED,
                                    constants.HTTP_NOT_FOUND],
                                   error, data, response, result, cb);

    });
};

Resource.prototype.list = function (resourceType, query, cb) {


  var options = {
    query: query,
    cb: cb
  }, reqOptions = {
    method: 'GET',
    resourceType: resourceType,
    endpoint: '',
    query: query,
    headers: constants.ACCEPT_JSON
  };
  if ((typeof query) === 'function' && (typeof cb === 'undefined')) {
    options.query = undefined;
    options.cb = query;
  }
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }
  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {
      var code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = utils.makeEmptyResult('list',
                                       code,
                                       'The resources couldn\'t be listed');
      return utils.requestResponse('list', constants.HTTP_OK,
                                   [constants.HTTP_BAD_REQUEST,
                                    constants.HTTP_UNAUTHORIZED,
                                    constants.HTTP_NOT_FOUND],
                                   error, data, response, result, cb);
    });
};

module.exports = Resource;
