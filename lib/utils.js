/**
 * Copyright 2013-2014 BigML
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

var constants = require('./constants');
var logger = require('./logger');
var BigML = require('./BigML');

module.exports = {
  plural: function (text, num) {
    /**
     * Pluralizer: adds "s" at the end of a string if a given number is > 1
     *
     * @parm {string} text Text to pluralize
     * @parm {number} num Number of occurences
     */

    var pluralize = (num == 1) ? '' : 's';
    return text + pluralize;
  },

  showResult : function (error, resource) {
    /**
     * Auxiliary function show the response content
     *
     * @parm {object|string} error object or message
     * @parm {object} resource Bigml resource response
     */
    if (error !== null) {
      console.log('error: ');
      console.log(error);
    }
    console.log('result: ');
    console.log(resource);
  },

  getResource: function (resource) {
    /**
     * Auxiliary function to get the resource structure
     *
     * @parm {object|string} resource object or id string
     */
    if ((typeof resource) === 'object') {
      resource = resource.resource;
    }
    var iSlash, type, id, pureResource = resource,
      types = constants.RESOURCE_TYPES;
    if (resource.indexOf(constants.PUBLIC_PREFIX) === 0) {
      pureResource = resource.substring(constants.PUBLIC_PREFIX.length);
      types = constants.PUBLIC_RESOURCE_TYPES;
    }
    if ((iSlash = pureResource.indexOf('/')) > -1) {
      type = pureResource.substring(0, iSlash);
      id = pureResource.substring(iSlash + 1);
      if (constants.ID_PATTERN.test(id) &&
          (types.indexOf(type) > -1)) {
        return {
          'type': type,
          'id': id,
          'resource': resource
        };
      }
    }
    throw new Error('Wrong resource id');
  },

  getObjectClass: function (object) {
    /**
     * Auxiliary function to get object class name
     *
     * @parm {object} object object
     */
    if (object && object.constructor && object.constructor.toString) {
      var array = object.constructor.toString().match(
        /function\s*(\w+)/
      );
      if (array && array.length === 2) {
        return array[1];
      }
    }
    return undefined;
  },

  getStatus: function (resource) {
    /**
     * Extract status info if present or sets the default if public
     * @param: {object} resource BigML resource object
     */
    var status, resourceInfo;
    if (typeof resource !== 'object') {
      throw new Error('The resource lacks data to extract its status');
    }
    resourceInfo = resource;
    if ((typeof resource.object) === 'object') {
      resourceInfo = resource.object;
    }
    if ((typeof resourceInfo) !== 'object' ||
        (typeof resourceInfo.status) !== 'object') {
      throw new Error('The resource lacks data to extract its status');
    }
    if ((typeof resourceInfo['private']) === 'undefined' ||
         resourceInfo.private) {
      status = resourceInfo.status;
    } else {
      status = {code: constants.FINISHED};
    }
    return status;
  },

  makeEmptyResult: function (type, code, message) {
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
    case 'delete':
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
  },

  makeResult: function (type, data, response) {
    /**
     * Returns an informed structure for each result type
     *
     * @param {string} type Type of results: resource, delete, list, create
     * @param {string} data Response data
     * @param {object} response Response object
     */
    var location, iQuery, resource, resourceId;
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
    case 'create':
      data = JSON.parse(response.body);
      resourceId = module.exports.getResource(data);
      location = response.request.uri.href;
      if ((iQuery = location.indexOf('?')) > -1) {
        location = location.substring(0, iQuery);
      }
      return {
        code: response.statusCode,
        object: data,
        resource: data.resource,
        location: location + "/" + resourceId.id,
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
  },

  getWaitTimeExp: function (retryOptions) {
    /**
     * Computes the wait time used in next request from the retry options
     * given by the user.
     *
     * @param {object} retryOptions Object specifying:
     *                              {retries: [total number of retries],
     *                               wait: [initial wait time in milliseconds],
                                     retriesLeft: [number of retries left]}
     */
    var retryCount, delta, expFactor, waitTime;
    retryCount = retryOptions.retries - retryOptions.retriesLeft;
    delta = Math.pow(2, retryCount) * retryOptions.wait / 2;
    expFactor = (retryCount > 1) ? delta : 0;
    waitTime = retryOptions.wait + Math.floor(Math.random() * expFactor);
    return waitTime;
  },

  requestResponse: function (type, self, okStatus, koStatuses,
                             error, data, response, result, cb) {
    /**
     * Analyzes the request response to trigger the callback and returned info
     *
     * @param {string} type Type of results: resource, delete, list, create
     * @param {object} self Reference to the original bigml Resource object
     * @param {integer} okStatus Http status code for success
     * @param {integer} koStatus Http status code for failure
     * @param {object} error Error info
     * @param {string} data Response data
     * @param {object} response Request response object
     * @param {object} result Returned info
     * @param {function} cb Callback
     */

    var errorMessage, message, wait,
      code = constants.HTTP_INTERNAL_SERVER_ERROR;
    try {
      if (error) {
        errorMessage = 'Error processing request: ' + error;
        if ((typeof data) !== 'undefined') {
          errorMessage += '\ndata: ' + data;
        }
        logger.error(errorMessage + ". Retrying.");
        result.error.status.message += ': ' + error + ". Retrying.";
        message = (self.options.type + " " + self.options.operation +
                   ' with arguments: ' +
                   JSON.stringify(self.options.args));
        return self.retryRequest(result, message);
      }
      logger.debug(response.statusCode);
      code = response.statusCode;
      if (code === okStatus) {
        try {
          result = module.exports.makeResult(type, data, response);
        } catch (err) {
          return cb(err, result);
        }
        logger.debug(JSON.stringify(result));
        return cb(null, result);
      }
      if (koStatuses.indexOf(code) > -1) {
        if ((typeof data) === "undefined" ||
            (typeof data.status) === "undefined") {
          data = {status: 
                   {code: code, message: 'Unexpected response from server'}};
        }
        result.error = data;
        logger.error(JSON.stringify(data));
      } else {
        errorMessage = 'Unexpected error ('+ code +
                       ' [' + result.error.status.code +']).';
        if (constants.RETRY_ERRORS.indexOf(result.error.status.code) > -1) {
          result.error.status.message += ': ' + errorMessage + "  Retrying.";
          if ((typeof self) !== 'undefined' && self.options.retry &&
              self.options.retry.retriesLeft > 0) {
            message = (self.options.type + " " + self.options.operation +
                       ' with arguments: ' +
                       JSON.stringify(self.options.args));
            self.retryRequest(result, message);
          } else if ((typeof self) !== 'undefined' && self.options.retry) {
            errorMessage += (' Retries limit exceeded. The request failed.');
            logger.error(errorMessage);
            result.error.status.message += ': ' + errorMessage;
            return cb(new Error("Retries limit exceeded"), result);
          }
        }
      }

      error = new Error(result.error.status.message);
      return cb(error, result);
    } catch (exc) {
      logger.error(exc)
      return cb(exc, result);
    }

  },

  setRetries: function (options) {
    /**
     * Sets the number of retries and first wait time if retry is set
     *
     * @param {object} options Object that stores resource creation variables
     */
    if (options.retry) {
      // Setting default values for the retry object
      if ((typeof options.retry) === 'boolean') {
        options.retry = {retries: constants.DEFAULT_BIGML_RETRIES,
                         wait: constants.DEFAULT_BIGML_WAIT};
      } else if (options.options.retry === Infinity) {
        logger.warning("Infinite retries are not allowed. Changing to " +
                        constants.DEFAULT_BIGML_RETRIES);
        options.retry = {retries: constants.DEFAULT_BIGML_RETRIES,
                         wait: options.finished.wait}
      }
      options.retry.retriesLeft = options.retry.retries; 
    }
    return options;
  },

  checkConnection: function (connection) {
    /**
     * Checks the argument for a BigML connection object or creates one
     *
     * @param {object} connection BigML connection object
     */
    if (module.exports.getObjectClass(connection) === 'BigML') {
      return connection;
    }
    if ((typeof connection) === 'undefined') {
      return new BigML();
    }
    throw new Error('Check your arguments. BigML connection needed.');
  },

  optionalCUParams: function (argsArray, message) {
    /**
     * Checks the arguments given to the create or update method and
     * sets their default values if absent.
     *
     * @param {array} arguments Arguments array
     * @param {string} message Resource-customized error message
     */

    var options = {
      args: argsArray[1],
      cb: argsArray[argsArray.length - 1],
      retry: false
    };
    if (argsArray.length < 1) {
      throw new Error(message);
    }
    if ((argsArray.length < 3 || ((typeof argsArray[2]) === 'undefined'))  &&
        (typeof argsArray[1]) === 'function') {
      options.cb = argsArray[1];
      options.args = undefined;
    }
    if ((argsArray.length === 3 || ((typeof argsArray[3]) === 'undefined'))  &&
        (typeof argsArray[2]) === 'function') {
      options.cb = argsArray[2];
    }
    if (argsArray.length === 3 && (typeof argsArray[2]) !== 'function' &&
        (typeof argsArray[2]) !== 'undefined') {
      options.retry = argsArray[2];
    }
    if (argsArray.length === 4 && ((typeof argsArray[3]) === 'function')  &&
        ((typeof argsArray[2]) !== 'undefined')) {
      options.retry = argsArray[2];
    }
    if ((typeof options.cb) === 'undefined' ||
        ((typeof options.cb) !== 'function' && argsArray.length < 4)) {
      options.cb = module.exports.showResult;
    }
    if ((typeof options.cb) !== 'function' && argsArray.length == 4) {
      throw new Error("The last argument is expected to be a callback" +
                      " function");
    }

    if (!options.args) {
      options.args = {};
    }
    return options;
  },

  isArray: function (param) {
    /**
     * Checks if a user given parameter is an array
     *
     * @param {array|} param Parameter that can be an array
     */
    return Object.prototype.toString.call(param) === '[object Array]';
  }
};
