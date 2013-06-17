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

var constants = require('./constants');
var logger = require('./logger');
var BigML = require('./BigML');

module.exports = {
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
     * @param {string} type Type of results: resource, delete, list
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

  requestResponse: function (type, okStatus, koStatuses,
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
    var errorMessage, code = constants.HTTP_INTERNAL_SERVER_ERROR;
    if (error) {
      logger.error('Error processing request: ' + error + '\ndata: ' + data);
      result.error.status.message += ': ' + error;
      return cb(error, result);
    }

    logger.debug(response);
    code = response.statusCode;
    if (code === okStatus) {
      try {
        result = module.exports.makeResult(type, data, response);
      } catch (err) {
        return cb(err, result);
      }
      logger.debug(result);
      return cb(null, result);
    }
    if (koStatuses.indexOf(code) > -1) {
      result.error = data;
      logger.error(data);
    } else {
      errorMessage = 'Unexpected error (' + code + ')';
      logger.error(errorMessage);
      result.error.status.message += ': ' + errorMessage;
    }
    error = new Error(result.error.status.message);
    return cb(error, result);
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
      cb: argsArray[2]
    };
    if (argsArray.length < 1) {
      throw new Error(message);
    }
    if ((argsArray.length < 3 || ((typeof argsArray[2]) === 'undefined'))  &&
        (typeof argsArray[1]) === 'function') {
      options.cb = argsArray[1];
      options.args = undefined;
    }

    if ((typeof options.cb) === 'undefined') {
      options.cb = module.exports.showResult;
    }
    if ((typeof options.cb) !== 'function') {
      throw new Error("The last argument is expected to be a callback function");
    }

    if (!options.args) {
      options.args = {};
    }
    return options;
  }
};
