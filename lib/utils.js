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

var fs = require('fs');

var NODEJS = (typeof process !== 'undefined') && process && process.RUNNING_IN_NODEJS === 'true';
var PATH = (NODEJS) ? "./" : "";

var constants = require(PATH + 'constants');
var DECIMAL_DIGITS = 5;
if (NODEJS) {
  var fs = require('fs');
  var path = require('path');
  var logger = require('./logger');
  var BigML = require('./BigML');
} else {
  var logger = {error: console.log, debug: console.log, warning: console.log,
                info: console.log};
}

RegExp.escape = function(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

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

   decRound: function(value, digits) {
  /**
   * Rounds the number to the given number of decimals
   *
   * @param {float} value Float number to be rounded
   * @param {integer} digits Number of decimals
   */
    var factor = 0.0 + Math.pow(10, digits);
    return Math.round(factor * value) / factor;
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

    var iSlash, type, id, idPattern, pureResource, resourceId,
      types = constants.RESOURCE_TYPES, shared = false;

    if ((typeof resource) === 'object') {
      resourceId = resource.resource;
      if (typeof resourceId === 'undefined' &&
          typeof resource.id !== 'undefined') {
        resourceId = resource.id;
      }
    } else {
        resourceId = resource;
    }
    pureResource = resourceId;
    if (resourceId.indexOf(constants.PUBLIC_PREFIX) === 0) {
      pureResource = resourceId.substring(constants.PUBLIC_PREFIX.length);
      types = constants.PUBLIC_RESOURCE_TYPES;
    }
    if (resourceId.indexOf(constants.SHARED_PREFIX) === 0) {
      pureResource = resourceId.substring(constants.SHARED_PREFIX.length);
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
          'resource': resourceId
        };
      }
    }

    throw new Error('Wrong resource id: ' + resource);
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
          resource.resource.indexOf(constants.PROJECT) == 0) {
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

    var errorMessage, message, wait, body,
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
        body = JSON.parse(response.body);
        if ((typeof body.status) !== "undefined") {
          errorMessage = body.status.message + ": " +
                         JSON.stringify(body.status.extra);
        } else if ((typeof data) !== "undefined" &&
                   (typeof data.status) !== "undefined" &&
                   (typeof data.status.message) !== "undefined") {
          errorMessage = data.status.message;
        } else {
          errorMessage = "Unexpected response from server";
        }
        result.error = {status: {code: code, message: errorMessage}};
        logger.error(JSON.stringify(result.error));
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
    var field, value, type, booleans = {}, categories, len, index,
      category, boolKey;
    for (field in inputData) {
      if (inputData.hasOwnProperty(field)) {
        value = inputData[field];
        if (typeof value === 'boolean' &&
            fields[field].optype == 'categorical' &&
            fields[field].summary.categories.length == 2) {
          try {
            categories = fields[field].summary.categories;
            len = categories.length;
            // checking which string represents the boolean
            for (index = 0; index < len; index++) {
              category = categories[index][0];
              boolKey = JSON.parse(category.toLowerCase()) ? 'true' : 'false';
              booleans[boolKey] = category;
            }
            inputData[field] = booleans["" + value];
          } catch (e) {
            throw new Error("Mismatch input data type in field \"" +
                            fields[field].name + "\" for value " + value +
                            ". String expected.")
          }
        } else if ((fields[field].optype === 'numeric' &&
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
                            inputData[field] + ".");
          }
        } else if (fields[field].optype == 'numeric' &&
                   typeof value === 'boolean') {
          throw new Error('Mismatch input data type in field ' +
                          fields[field].name + 'for value ' +
                          value + ". Number expected.");
        }
        if (fields[field].optype == 'numeric') {
            inputData[field] = exports.decRound(value, DECIMAL_DIGITS);
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
     * @param {object} distribution Distribution-like structure of predictions and
     *        the associated weights.
     *        (e.g. {'Iris-setosa': 10, 'Iris-versicolor': 5})
     * @param {integer} n Total number of instances in the distribution. If
     *         absent, the number is computed as the sum of weights in the
     *         provided distribution
     * @param {float} z Percentile of the standard normal distribution
     */

    var norm, z2, n2, wsSqrt, key,
      p = parseFloat(distribution[prediction] || 0.0), zDefault = 1.96;
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
    return exports.decRound(
      (p + (z2 / (2 * n)) - (z * wsSqrt)) / (1 + (z2 / n)), 5);
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
  },

  separatorRegexp: function(itemAnalysis) {
    /**
     * Builds the separator regexp used to parse items
     *
     * @param {object} itemAnalysis Value of the item_analysis attribute
     *                 that stores the separator or regexp information
     */
    var separator, regexp;
    separator = itemAnalysis.separator;
    regexp = itemAnalysis.regexp;
    if (typeof regexp === 'undefined' || regexp == null) {
      if (typeof separator === 'undefined' || separator == null) {
        separator = " ";
      }
      regexp = RegExp.escape(separator);
    }
    return regexp;
  },

  getTokensFlags: function (caseSensitive) {
    /**
     * Modifiers for RegExp matching according to case_sensitive option
     *
     * @param {boolean} caseSensitive Text analysis case_sensitive option
     */
    var flags = 'g';
    if (!caseSensitive) {
      flags += 'i';
    }
    return flags;
  },

  termMatchesTokens: function (text, terms, caseSensitive) {
    /**
     * Computes term matches depending on the chosen text analysis options
     *
     * @param {string} text Input text
     * @param {array} terms String array of terms to match
     * @param {boolean} caseSensitive Text analysis case_sensitive option
     */

    var flags = exports.getTokensFlags(caseSensitive),
      pattern = new RegExp('(\\b|_)' + terms.join('(\\b|_)|(\\b|_)') +
                           '(\\b|_)', flags),
      matches = text.match(pattern);
    return (matches == null) ? 0 : matches.length;
  },

  fullTermMatch: function (text, fullTerm, caseSensitive) {
    /**
     * Counts the match for full terms according to the caseSensitive option
     *
     * @param {string} text Input text
     * @param {string} fullTerm String to match
     * @param {boolean} caseSensitive Text analysis case_sensitive option
     */

    if (!caseSensitive) {
      text = text.toLowerCase();
      fullTerm = fullTerm.toLowerCase();
    }
    return (text == fullTerm) ? 1 : 0;
  },

  termMatches: function (text, terms, options) {
    /**
     * Computes term matches depending on the chosen text analysis options
     *
     * @param {string} text Input text
     * @param {array} terms String array of terms to match
     * @param {object} options Text analysis options
     */
    var tokenMode = options['token_mode'],
      caseSensitive = options['case_sensitive'],
      firstTerm = terms[0];
    if (tokenMode === constants.TM_FULL_TERM) {
      return exports.fullTermMatch(text, firstTerm, caseSensitive);
    }
    if (tokenMode === constants.TM_ALL && terms.length == 1) {
      if (firstTerm.match(constants.FULL_TERM_PATTERN)) {
        return exports.fullTermMatch(text, firstTerm, caseSensitive);
      }
    }
    return exports.termMatchesTokens(text, terms, caseSensitive);
  },


  itemMatches: function (text, item, options) {
    /**
     * Check whether the item is in the text
     *
     * @param {string} text Input text
     * @param {string} item Item to match
     * @param {object} options Item analysis options
     */
    var regexp = exports.separatorRegexp(options),
      items = [];
    items = text.split(new RegExp(regexp));
    return (items.indexOf(item) > -1) ? 1 : 0;
  },

  checkOperatingPoint: function (operatingPoint, operatingKinds, classNames) {
    /**
     * Checks the operating point contents and extracts the three defined
     * variables
     *
     * @param {string} kind Kind of threshold to apply
     * @param {float} threshold Threshold used as operating point
     * @param {string} positiveClass Name of the positive class
     */
    var positiveClass, kind, threshold;

    if (Object.keys(operatingPoint).indexOf("positiveClass") < 0) {
      throw new Error("The operating point needs to have a" +
                      " positiveClass attribute.");
    }
    positiveClass = operatingPoint.positiveClass;
    if (classNames.indexOf(positiveClass) < 0) {
      throw new Error("The positive class must be one of the" +
                      " objective field classes.");
    }
    if (Object.keys(operatingPoint).indexOf("kind") < 0) {
      throw new Error("Failed to find the kind of operating point.");
    }
    kind = operatingPoint.kind;
    if (operatingKinds.indexOf(kind) < 0) {
      throw new Error("Unexpected operating point kind. Allowed values" +
                      " are: " + operatingKinds.join(", "));
    }
    if (Object.keys(operatingPoint).indexOf("threshold") < 0) {
      throw new Error("Failed to find the threshold of the operating point.");
    }
    threshold = operatingPoint.threshold;
    if (threshold > 1 || threshold < 0) {
      throw new Error("The threshold value should be in the 0 to 1 range.");
    }
  },

  sortCategory: function(a, b, list) {
    /**
     * Sorts categories according to their position in a list or alphabetically
     *
     * @param {object} a Object that contains a category
     * @param {object} b Object that contains a category
     * @param {array} list List of categories to be used as reference
     */
    var posA, posB;
    posA = list.indexOf(a.category);
    posB = list.indexOf(b.category);
    if (posA < 0 && posB < 0) {
      posA = a.category;
      posB = b.category;
    }
    return (posA < posB) ? -1 : (posB < posA) ? 1 : 0;
  },

  optionalCUParamsPred: function(argsArray, message) {
    /**
     * Checks the arguments given to the create method and
     * sets their default values if absent.
     *
     * @param {array} arguments Arguments array
     * @param {string} message Resource-customized error message
     */

    var options, newArgs;
    newArgs = [argsArray[0]].concat([].slice.call(argsArray, 2));
    options = exports.optionalCUParams(newArgs, message);
    options.inputData = argsArray[1];
    return options;
  },

  createRequest: function(resourceType) {
    /**
     * Builds the create options for the given resource type
     *
     * @param {string} resourceType Type of the resource used as endpoint
     */
      return {
        method: 'POST',
        resourceType: resourceType,
        endpoint: '/',
        store: true
      };
  },

  tryStoredFile(resource, resourceType, cb) {
    /**
     * Tries to read the JSON structure from a stored file
     *
     * @param {object} resource Resource object
     * @param {object} resourceType Type of the resource used
     * @param {function} cb Callback
     */
    var contents;
    if (typeof cb === 'undefined') {
      try {
        contents = fs.readFileSync(resource, 'utf8');
        return JSON.parse(contents);
      } catch (err) {
        throw new Error('Failed to read local ' + resourceType +
                        ' file: ' + resource);
      }
    } else {
      try {
        fs.readFile(resource, 'utf8', function (err, data) {
          if (err) {
            throw new Error('Failed to read local ' + resourceType +
                            ' file: ' + resource);
          }
          try {
            resource = JSON.parse(data);
          } catch (jsonErr) {
            throw new Error('Failed to parse the JSON ' + resourceType
                            + ' in: ' + resource);
          }
          cb(null, resource);

        });
      } catch (errf) {
        // if no file is read, throw error reading file
        throw new Error('Cannot build the local object from this resource: ' +
                        resource);
      }
    }
  },

  getDefaultConnection: function(connection) {
    /**
     * Tries to read the connection object or creates one by default
     *
     * @param {object} connection BigML connection
     */
      if (typeof connection === 'undefined') {
        connection = new BigML(undefined, undefined,
                               {storage: './storage'});
      }
      connection;
      return connection;
  },

  getStoredModelFile: function (resourceId, connection) {
    /**
     * Tries to read the JSON structure from a stored file. On success, it
     * returns the name of the file, and null on error.
     *
     * @param {object} resourceId Resource structured object
     * @param {object} connection BigML Connection
     */

      var filename,
       resource;
      // When resourceId is a real resource ID, use the storage directory
      if (typeof connection !== 'undefined' &&
          typeof connection.storage === 'string' &&
          connection.storage != null) {
        try {
          resource = ((typeof resourceId.resource !== 'undefined') ?
                      resourceId.resource :
                      exports.getResource(resourceId).resource);
          filename = path.join(connection.storage,
                               resource.replace("/", "_"));
          if (fs.existsSync(filename)) {
            return filename;
          }
          return null;
        } catch (err) { logger.error("Stored file error:", err);}
      }
      return null;
  },

  getFromBigML: function (resourceId , resourceConn, cb) {
    /**
     * Tries to read the JSON structure from BigML's API
     *
     * @param {object} resourceId Resource structured object
     * @param {object} connection BigML Connection
     * @param {function} cb Callback
     */
    try {
      resourceConn.get(resourceId.resource, true,
                       constants.ONLY_MODEL, cb);
    } catch(e) {throw new Error("Error downloading " + resourceId.type + " " +
                                resourceId.resource + ": " + e);}
  },

  getFromCache: function(resourceId, cache, cb) {
    /**
     * Tries to read the JSON structure from a cache manager
     *
     * @param {object} resourceId Resource ID structured object
     * @param {object} cache Cache-management object with set, get, del methods
     * @param {function} cb Callback
     */
    var safeId = resourceId.resource.replace('/', '_');
    cache.get(safeId, cb);
  },

  getResourceInfo: function (self, resource, cb) {
    /**
     * Tries to read the resource JSON structure from any repo
     *
     * @param {object} self Pointer to the caller object
     * @param {object} resource Path to JSON file or resource ID
     * @param {function} cb Callback
     */
    var filename = null, storageError;

    filename = null;
    if (typeof resource === 'string') {
      // When the argument contains the path to a JSON file
      if (fs.existsSync(resource)) {
        filename = resource;
      } else if (typeof self.connection.storage === 'string') {
        // Loads from file in local fs directory
        filename = exports.getStoredModelFile(resource, self.connection);
        if (!fs.existsSync(filename)) {
          filename = null;
        }
      }
    }

    if (filename != null) {
      // try to read a json file in the path provided by the first argument
      // or the local storage path
      try {
        resource = exports.tryStoredFile(filename, self.resType);
        self.resourceId = exports.getResource(resource);
        cb(null, resource);
      } catch (e) {
          storageError = e;
          try {
            self.resourceId = exports.getResource(resource);
            fs.unlinkSync(filename);
            exports.getFromBigML(self.resourceId,
                                 self.resourceConnector,
                                 cb);
          } catch (err) {
            throw storageError;
          }
      }
    } else if (typeof self.connection.storage === 'object' &&
               self.connection.storage != null &&
               typeof self.connection.storage.get === 'function') {
      // try to read from a cache manager
      self.resourceId = exports.getResource(resource);
      try {
        exports.getFromCache(self.resourceId,
                             self.connection.storage,
                             function (error, data) {
                               if (error || typeof data === 'undefined' ||
                                   data == null) {
                                 exports.getFromBigML(self.resourceId,
                                                      self.resourceConnector,
                                                      cb);
                               } else {
                                 if (typeof data === 'string') {
                                   data = JSON.parse(data);
                                   if (typeof data.resource === 'undefined') {
                                     throw new Error("The data retrieved from" +
                                                     " cache does not match " +
                                                     "the expected structure.");
                                   }
                                 }
                                 cb(null, data)}});
      } catch (e) {
        exports.getFromBigML(self.resourceId,
                             self.resourceConnector,
                             cb);
      }
    } else {
      self.resourceId = exports.getResource(resource);
      exports.getFromBigML(self.resourceId,
                           self.resourceConnector,
                           cb);
    }
  },

  isEmpty: function(value) {
    /**
     * Checks whether a value is null or has not been defined
     *
     */
    return (typeof value === 'undefined') || value === null;
  },

  nullConfidence: function (confidence) {
    /**
     * Checks the confidence returned by the tree. Some strange trees can
     * have null confidences (nodes with only one value)
     * @param {number} confidence Confidence returned by the node
     *
     */
    return  exports.isEmpty(confidence) || isNaN(confidence);
  },

  checkNoMissingNumerics: function(inputData, fields, objective) {
    /**
     * Checks whether some numeric fields are missing in the input data
     * @param {object} inputData Input data structure
     * @param {object} fields Fields structure
     * @param {string} objective Objective field
     *
     */
    var index, fieldIds, fieldId;
    fieldIds = Object.keys(fields);
    for (index in fieldIds) {
      fieldId = fieldIds[index];
      if (fields[fieldId].optype == constants.NUMERIC &&
          (typeof objective === 'undefined' || fieldId != objective) &&
          !inputData.hasOwnProperty(fieldId)) {
        throw new Error("Failed to predict. Input data must contain" +
                        " values for all numeric fields to get a" +
                        " prediction.");
      }
    }
  },

  checkNoTrainingMissings: function(inputData, fields, weightField, objective) {
    /**
     * Checks whether some numeric fields are missing in the input data
     * @param {object} inputData Input data structure
     * @param {object} fields Fields structure
     * @param {string} weightField Field ID to be used as weight
     * @param {string} objective Objective field
     *
     */
    var index, fieldIds, fieldId, len;
    fieldIds = Object.keys(fields);
    for (index = 0, len = fieldIds.length; index < len; index++) {
      fieldId = fieldIds[index];
      if (fields[fieldId].summary['missings_count'] == 0 &&
          (typeof objective === 'undefined' || fieldId != objective) &&
          (typeof weightField === 'undefined' || fieldId != weightField) &&
          !inputData.hasOwnProperty(fieldId)) {
        throw new Error("Failed to predict. Input data must contain" +
                        " values for '" + fields[fieldId]['name'] +
                        "' to get a" +
                        " prediction.");
      }
    }
  },

  dot: function(mat1, mat2) {
    /**
     * Simple version of the scalar product of two vectors
     * @param {array} mat1 First array
     * @param {array} mat2 Second array
     *
     */
    var index1, scalar = 0, len1, newRow = [], row1, row2, index2, len2,
      isScalar = false;

    for (index1 = 0, len1 = mat1.length; index1 < len1; index1++) {
      row1 = mat1[index1];
      if (exports.isArray(row1)) {
        for (index2 = 0, len2 = mat2.length; index2 < len2; index2++) {
          row2 = mat2[index2];
          newRow.push(exports.dot(row1, row2));
        }
      } else {
        if (mat1.length != mat2.length) {
          throw new Error("The scalar product cannot be computed for arrays with" +
                          " different lengths (" + mat1.length +
                          " vs. " + mat2.length + ")");
        }
        scalar += row1 * mat2[index1];
        isScalar = true;
      }
    }
    return (isScalar) ? scalar : newRow;
  },

  getExternalConnectionInfo: function () {
    var connectionInfo = {}, index, len, attrValue, attr,
      attrs = Object.keys(constants.EXTERNAL_CONNECTION_ATTRS);
    for (index = 0, len = attrs.length;
         index < len; index++) {
      attr = attrs[index];
      attrValue = process.env[attr];
      if (typeof attrValue !== 'undefined') {
        connectionInfo[constants.EXTERNAL_CONNECTION_ATTRS[attr]] = attrValue;
      }
    }
    return connectionInfo;
  }

};

if (NODEJS) {
  module.exports = exports;
}
