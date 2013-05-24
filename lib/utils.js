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
      console.log('error: ' + error);
    }
    console.log('result: ' + JSON.stringify(resource));
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
    var iSlash, type, id;
    if ((iSlash = resource.indexOf("/")) > -1) {
      type = resource.substring(0, iSlash);
      id = resource.substring(iSlash + 1);
      return {
        'type': type,
        'id': id
      };
    }
    throw "Wrong resource id";
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
    var status;
    if (typeof resource !== 'object') {
      throw "We need a complete resource to extract its status";
    }
    resource = resource.object;
    if ((typeof resource) !== 'object') {
      throw "We could not obtain status for the resource";
    }
    if ((typeof resource['private']) === 'undefined' || resource.private) {
      status = resource.status;
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
        result = module.exports.makeResult(type, data, response);
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
    throw "Check your arguments. BigML connection needed.";
  }
};
