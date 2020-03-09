/**
 * Copyright 2013-2020 BigML
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
var waittime = require('./waittime');
var async = require('async');


/**
 * Resource: REST interface for resources.
 * @constructor
 * @param {BigML} connection BigML connection object
 */
function Resource(connection) {
  this.connection = utils.checkConnection(connection);
  this.options = null;
  this.resources = null;
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
      if ((typeof args[1]) === 'boolean' || (typeof args[1]) === 'object') {
        fullArgs[1] = args[1];
      } else if ((typeof args[1]) === 'string') {
        fullArgs[2] = args[1];
      } else {
        throw new Error('Check arguments type and number');
      }
    } else if (length === 3) {
      if (((typeof args[1]) === 'undefined' || (typeof args[1]) === 'boolean'
          || (typeof args[1]) === 'object') &&
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
   * @param {object|boolean} finished (optional) Set to true if you want only
   *        finished resources. Can also be given as an object specifying the
            retries and the time to wait between them.
             {retries: 5,
              wait: 10}

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
   */

  var length, finishOptions, self = this, resourceId,
    reqOptions, fullArgs, options;

  // Dealing with optional arguments
  if (arguments.length > 0) {
    options = {query: query, finished: finished, cb: cb};
    if (arguments.length < 4) {
      // Getting optional parameters into a full list
      fullArgs = optionalParams(arguments);
      options.finished = fullArgs[1];
      options.query = fullArgs[2];
      options.cb = fullArgs[3];
    }
    if ((typeof options.cb) === 'undefined') {
      options.cb = utils.showResult;
    }

    // reference to self and arguments for retries
    if (options.finished) {
      // Setting default values for the finished object
      if ((typeof options.finished) === 'boolean') {
        options.retry = {retries: constants.DEFAULT_BIGML_RETRIES,
                         wait: constants.DEFAULT_BIGML_WAIT};
      } else if (options.finished.retries === Infinity) {
        logger.warning("Infinite retries are not allowed. Changing to " +
                        constants.DEFAULT_BIGML_RETRIES);
        options.retry = {retries: constants.DEFAULT_BIGML_RETRIES,
                         wait: options.finished.wait};
      } else {
        options.retry = options.finished;
      }
      if ((typeof options.retry.retriesLeft) === 'undefined') {
        options.retry.retriesLeft = options.retry.retries;
      }
      options.operation = 'get';
      this.options = options;
      this.resource = resource;
    }
  } else {
    options = this.options;
    resource = this.resource;
  }

  // connection options
  resourceId = utils.getResource(resource);
  reqOptions = {
    method: 'GET',
    resource: resourceId.resource,
    resourceType: resourceId.type,
    endpoint: '/' + resourceId.id,
    query: options.query,
    store: true
  };

  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {
      var status, errorMessage, wait, info,
        code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = utils.makeEmptyResult('resource',
                                       code,
                                       'The resource couldn\'t be retrieved');
      if (error || !response) {
        logger.error('Request processing error: ' + error);
        result.error.status.message += ': ' + error;
        info = '';
        if ((typeof data) !== 'undefined') {
          info = self.options.operation + " for " + data.name +
                   ' (' + data.resource + ').';
        }
        return self.retryRequest(result, info);
      }
      logger.debug(response.statusCode);
      code = response.statusCode;
      if (code === constants.HTTP_OK) {
        try {
          result = utils.makeResult('resource', data, response);
        } catch (err) {
          return options.cb(err, result);
        }
        if (options.finished) {
          try {
            status = utils.getStatus(result);
          } catch (statusError) {
            console.log(statusError);
            return options.cb(statusError, result);
          }
          if ([constants.FAULTY,
               constants.FINISHED].indexOf(status.code) > -1) {
            logger.debug(result);
            return options.cb(null, result);
          }
          return self.retryRequest(result);
        }
        logger.debug(result);
        return options.cb(null, result);
      }
      if (constants.HTTP_COMMON_ERRORS.indexOf(code) > -1) {
        result.error = data;
        logger.error(data);
      } else {
        errorMessage = 'Unexpected error (' + code +
                       ' [' + result.error.status.code + ']).';
        logger.error(errorMessage);
        result.error.status.message += ': ' + errorMessage;
        if (constants.RETRY_ERRORS.indexOf(result.error.status.code) > -1) {
          info = '';
          if ((typeof data) !== 'undefined') {
            info = self.options.operation + " for " + data.name +
                   ' (' + data.resource + ').';
          }
          return self.retryRequest(result, info);
        }
      }
      error = new Error(result.error.status.message);
      return options.cb(error, result);
    });
};

Resource.prototype.create = function (type, origins, message,
                                      resource, body, retry, cb) {
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
   * @param {string} type Type of resource: source, dataset, model, ensemble,
   *                                        evaluation, prediction,
   *                                        batchprediction
   * @param {array} origins Types of resource allowed as origin for the
   *                        create
   * @param {string} message Error message
   * @param {string|object} resource Resource id or object
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */

  var self = this, options,
    resourceId,
    sendRequest,
    reqOptions = utils.createRequest(type);

  if (arguments.length > 0) {
    resourceId = utils.getResource(resource);
    this.resource = resource;
    options = utils.optionalCUParams([].slice.call(arguments, 3), message);

    if (origins.indexOf(resourceId.type) > -1) {
      options.args[resourceId.type] = resourceId.resource;
    } else {
      throw new Error(message);
    }
    options = utils.setRetries(options);
    options.type = type;
    options.operation = 'create';
    options.operationFunction = this.create;
    this.options = options;
  } else {
    resourceId = utils.getResource(this.resource);
    options = this.options;
  }
  reqOptions.body = options.args;

  sendRequest = utils.makeSendRequest(self, reqOptions, options);
  // The origin resource must be retrieved in a finished state before
  // create starts. This is only done when create is called by the user, not
  // internally to retry creation.
  if (arguments.length > 0) {
    this.get(resourceId.resource, true, sendRequest);
  } else {
    sendRequest(null);
  }
};


Resource.prototype.update = function (resource, body, retry, cb) {
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
   * @param {string|object} resource Resource id (or object)
   * @param {object} body Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */

  var options, resourceId, reqOptions, message, self = this, sendRequest;
  if (arguments.length > 0) {
    resourceId = utils.getResource(resource);
    message = ('Failed to update the ' + resourceId.type +
    '. First parameter must be a ' + resourceId.type + ' id.');

    options = utils.optionalCUParams(arguments, message);
    options = utils.setRetries(options);
    options.type = resourceId.type;
    options.operation = 'update';
    this.options = options;
    this.resource = resource;
  } else {
    options = this.options;
    resourceId = utils.getResource(this.resource);
  }
  reqOptions = {
    method: 'PUT',
    resourceType: resourceId.type,
    endpoint: '/' + resourceId.id,
    store: true
  };
  reqOptions.body = options.args;
  sendRequest = function () {
      self.connection.request(reqOptions,
                              function processResponse(error, data, response) {
          var code = constants.HTTP_INTERNAL_SERVER_ERROR,
            result = utils.makeEmptyResult('resource',
                                           code,
                                           'The resource couldn\'t be updated');
          return utils.requestResponse('resource', self,
                                       constants.HTTP_ACCEPTED,
                                       constants.HTTP_UPDATE_ERRORS,
                                       error, data, response, result,
                                       options.cb);
        });
  }
  // The origin resources must be retrieved in a finished state before
  // create starts. This is only done when create is called by the user, not
  // internally to retry creation.
  if (arguments.length > 0) {
    async.each([resource], function (resource, done) {
      var id = utils.getResource(resource);
      new Resource(self.connection).get(id.resource, true, done);
    },
      sendRequest);
  } else {
    sendRequest(null);
  }
};


Resource.prototype.delete = function (resource, retry, cb) {
  /**
   * Deletes a resource
   * If the request is successful the status `code` will be HTTP_NO_CONTENT
   * and `error` will be null. Otherwise, the `code` will be an error code
   * and `error` will provide a specific code and explanation.
   *
   * @param {string|object} resource Resource id (or object)
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */
  var resourceId, reqOptions, options, message;

  if (arguments.length > 0) {

    resourceId = utils.getResource(resource);
    message = ('Failed to delete the ' + resourceId.type +
    '. First parameter must be a ' + resourceId.type + ' id.');
    options = utils.optionalCUParams(arguments, message);
    options.operation = 'delete';
    this.resource = resource;
    this.options = options;
  } else {
    resourceId = utils.getResource(this.resource);
    options = this.options;
  }

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
      return utils.requestResponse('delete', this,
                                   constants.HTTP_NO_CONTENT,
                                   constants.HTTP_COMMON_ERRORS,
                                   error, data, response, result, options.cb);

    });
};

Resource.prototype.list = function (resourceType, query, cb) {
  /**
   * Lists the resources of a certain type
   *
   * @param {string} resourceType Type of the resource: source, dataset...
   * @param {query} query Query to filter retrieved resources
   * @param {function} cb Callback
   */

  var options, reqOptions;
  if (arguments.length > 0) {
    options = {
      resourceType: resourceType,
      query: query,
      cb: cb,
      operation: 'list'
    };
    if ((typeof query) === 'function' && (typeof cb === 'undefined')) {
      options.query = undefined;
      options.cb = query;
    }
    if ((typeof cb) === 'undefined') {
      options.cb = utils.showResult;
    }
    this.options = options;
  } else {
    options = this.options;
  }
  reqOptions = {
    method: 'GET',
    resourceType: options.resourceType,
    endpoint: '',
    query: options.query,
    headers: constants.ACCEPT_JSON
  };
  this.connection.request(reqOptions,
                          function processResponse(error, data, response) {
      var code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = utils.makeEmptyResult('list',
                                       code,
                                       'The resources couldn\'t be listed');
      return utils.requestResponse('list', this, constants.HTTP_OK,
                                   constants.HTTP_COMMON_ERRORS,
                                   error, data, response, result, options.cb);
    });
};

Resource.prototype.retryRequest = function (result, resourceInfo) {
  /**
   * Retries a request
   *
   */
  var wait, debug, errorMessage, self = this;
  if (this.options.retry.retriesLeft > 0) {
    this.options.retry.retriesLeft -= 1;
    wait = waittime.getWaitTimeExp(this.options.retry);
    if ((typeof resourceInfo) !== 'undefined') {
      errorMessage = "Retrying " + resourceInfo + '. ';
      logger.error(errorMessage);
    }
    debug = 'Waiting ' + wait / 1000 + 's. ';
    debug += this.options.retry.retriesLeft + ' retries left.';
    logger.debug(debug);
    setTimeout(function () {self[self.options.operation](); }, wait);
  } else {
    return this.options.cb(new Error('Retries limit exceeded'), result);
  }
  return;
};

module.exports = Resource;
