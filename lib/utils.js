/**
 * Copyright 2013-2015 BigML
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

var NODEJS = ((typeof module !== 'undefined') && module.exports);
var PATH = (NODEJS) ? "./" : "";

var constants = require(PATH + 'constants');
if (NODEJS) {
  var logger = require('./logger');
  var BigML = require('./BigML');
} else {
  var logger = {error: console.log, debug: console.log, warning: console.log,
                info: console.log};
}

exports = {
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
    var iSlash, type, id, idPattern, pureResource = resource,
      types = constants.RESOURCE_TYPES, shared = false;
    if (resource.indexOf(constants.PUBLIC_PREFIX) === 0) {
      pureResource = resource.substring(constants.PUBLIC_PREFIX.length);
      types = constants.PUBLIC_RESOURCE_TYPES;
    }
    if (resource.indexOf(constants.SHARED_PREFIX) === 0) {
      pureResource = resource.substring(constants.SHARED_PREFIX.length);
      types = constants.SHARED_RESOURCE_TYPES;
      shared = true;
    }
    if ((iSlash = pureResource.indexOf('/')) > -1) {
      type = pureResource.substring(0, iSlash);
      id = pureResource.substring(iSlash + 1);
      idPattern = shared ? constants.ID_SHARED_PATTERN : constants.ID_PATTERN;
      if (idPattern.test(id) &&
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
     * Extract status info if present or sets the default if public or project
     * @param: {object} resource BigML resource object
     */
    var status, resourceInfo, defaultStatus = {code: constants.FINISHED};
    if (typeof resource !== 'object') {
      throw new Error('The resource lacks data to extract its status');
    }
    resourceInfo = resource;
    if ((typeof resource.object) === 'object') {
      resourceInfo = resource.object;
    }
    if ((typeof resourceInfo) !== 'object' ||
        (typeof resourceInfo.status) !== 'object') {
      if (typeof resource.resource !== 'undefined' &&
          resource.resource.indexOf(constants.PROJECT_PATH) == 0) {
        return defaultStatus;
      } else {
        throw new Error('The resource lacks data to extract its status');
      }
    }
    if ((typeof resourceInfo['private']) === 'undefined' ||
         resourceInfo.private) {
      status = resourceInfo.status;
    } else {
      return defaultStatus;
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
      resourceId = exports.getResource(data);
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
          result = exports.makeResult(type, data, response);
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
        errorMessage = 'Unexpected error (' + code +
                       ' [' + result.error.status.code + ']).';
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
      logger.error(exc);
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
                         wait: options.finished.wait};
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
    if (NODEJS) {
      if (exports.getObjectClass(connection) === 'BigML') {
        return connection;
      }
      if ((typeof connection) === 'undefined') {
        return new BigML();
      }
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
      options.cb = exports.showResult;
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
  },

  coerce: function (type) {
    /**
     * Returns function to cast to type.
     *
     * @param {string} type
     */
    if (type === 'numeric') {
      // TODO: find a way to interpret not en_US locales
      return parseFloat;
    }
    return String;
  },

  stripAffixes: function (value, field) {
    /**
     * Strips prefixes and suffixes for numerical input data fields.
     *
     * @param {string} value Value of the field
     * @param {object} field model's field
     */
    if (field.prefix && value.indexOf(field.prefix) === 0) {
      value = value.substring(field.prefix.length);
    }
    if (field.suffix &&
        value.indexOf(field.suffix) === value.length - field.suffix.length) {
      value = value.substring(0, value.length - field.suffix.length);
    }
    return value;
  },

  cast: function (inputData, fields) {
    /**
     * Sets the right type for input data fields.
     *
     * @param {object} inputData Input data to predict
     * @param {object} fields Model's fields collection
     */
    var field, value, type,
      integerDataTypes = ['int8', 'int16', 'int32', 'int64', 'year', 'month',
                          'day', 'day-of-week', 'day-of-month', 'minute',
                          'second', 'milisecond'];
    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        if ((fields[field].optype === 'numeric' &&
             (typeof inputData[field]) === 'string') ||
            (fields[field].optype !== 'numeric' &&
              (typeof inputData[field] !== 'string'))) {
          try {
            type = fields[field].optype;
            if (type === 'numeric') {
              value = exports.stripAffixes(inputData[field],
                                                  fields[field]);
              inputData[field] = exports.coerce(type)(value);
            }
          } catch (error) {
            throw new Error('Mismatch input data type in field ' +
                            fields[field].name + 'for value ' +
                            inputData[field]);
          }
        }
        // round the value for fields that should be integers
        if ((integerDataTypes.indexOf(fields[field].datatype) >= 0) &&
            (inputData[field] % 1 !== 0)) {
          inputData[field] = Math.round(inputData[field]);
        }
      }
    }
    return inputData;
  },

  invertObject: function (fields) {
    /**
     * Creates a field name to Id hash.
     *
     * @param {object} fields Model's fields
     */
    var newObject = {}, field;
    for (field in fields) {
      if (fields.hasOwnProperty(field)) {
        newObject[fields[field].name] = field;
      }
    }
    return newObject;
  },


  wsConfidence: function (prediction, distribution, n, z) {
    /**
     * Wilson score interval computation of the distribution for the prediction
     *
     * @param {object} prediction Value of the prediction for which confidence is
     *        computed
     * @param {array} distribution Distribution-like structure of predictions and
     *        the associated weights. 
     *        (e.g. [{'Iris-setosa': 10}, {'Iris-versicolor': 5}])
     * @param {integer} n Total number of instances in the distribution. If
     *         absent, the number is computed as the sum of weights in the
     *         provided distribution
     * @param {float} z Percentile of the standard normal distribution
     */

    var norm, z2, n2, wsSqrt, key,
      p = parseFloat(distribution[prediction]), zDefault = 1.96;
    z = ((typeof z) !== 'undefined') ? parseFloat(z) : zDefault;
    if (p < 0) {
      throw new Error('The distribution weight must be a positive value');
    }
    if (n && (isNaN(parseInt(n, 10)) || n < 1)) {
      throw new Error('The total of instances in the distribution must be' +
                      ' a positive integer');
    }
    norm = 0.0;
    for (key in distribution) {
      if (distribution.hasOwnProperty(key)) {
        norm += distribution[key];
      }
    }
    if (norm === 0.0) {
      throw new Error('Invalid distribution norm: ' + distribution);
    }
    if (norm !== 1.0) {
      p = p / norm;
    }
    n = ((typeof n) !== 'undefined') ? parseFloat(n) : norm;
    z2 = z * z;
    n2 = n * n;
    wsSqrt = Math.sqrt((p * (1 - p) / n) + (z2 / (4 * n2)));
    return (p + (z2 / (2 * n)) - (z * wsSqrt)) / (1 + (z2 / n));
  },


  makeSendRequest: function (self, reqOptions, options) {
  
    function sendRequest (error) {
        if (error) {
          logger.error("Origin resources could not be retrieved: " + error);
        } else {
          self.connection.request(reqOptions,
                                  function processResponse(error, data,
                                                           response) {
              var code = constants.HTTP_INTERNAL_SERVER_ERROR,
                result = exports.makeEmptyResult('resource',
                                                 code,
                                                 'The resource couldn\'t' +
                                                 ' be created');

              return exports.requestResponse('resource', self,
                                             constants.HTTP_CREATED,
                                             constants.HTTP_CREATE_ERRORS,
                                             error, data, response, result,
                                             options.cb);
            });
        }
    }
    return sendRequest;
  }
};

if (NODEJS) {
  module.exports = exports;
}
