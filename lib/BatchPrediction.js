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

var BigML = require('./BigML');
var Resource = require('./Resource');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');

function BatchPrediction(connection) {
  Resource.call(this, connection);
}

BatchPrediction.prototype = new Resource();

BatchPrediction.prototype.parent = Resource.prototype;

BatchPrediction.prototype.create = function (modelOrEnsemble,
                                             dataset, args, cb) {
  /**
   * Creates a batch prediction and builds customized error and resource info
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
    origins = ['ensemble', 'model'],
    message = 'Failed to create the batch prediction. First parameter must be' +
    ' a model or ensemble id.',
    resourceId = utils.getResource(modelOrEnsemble),
    reqOptions = {
      method: 'POST',
      resourceType: 'batchprediction',
      endpoint: '/'
    };

  options = utils.optionalCUParams([].slice.call(arguments, 1), message);

  options.args.dataset = dataset;
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

BatchPrediction.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'batchprediction', query, cb);
};

BatchPrediction.prototype.download = function (resource, filename, cb) {
  /**
   * Downloads the batch prediction output file.
   *
   * @param {object|string} resource Batch prediction resource or id
   * @param {string} filename Name of the file to store the prediction output
   *                          in (optional)
   * @param {string} cb Callback where the response body is sent to (optional)
   *
   */
  var resourceId = utils.getResource(resource),
    reqOptions = {
      resourceType: resourceId.type,
      endpoint: '/' + resourceId.id,
    };
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }
  return this.connection.download(reqOptions, filename, cb);
};

module.exports = BatchPrediction;
