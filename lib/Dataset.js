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
var Resource = require('./Resource');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');

function Dataset(connection) {
  Resource.call(this, connection);
}

Dataset.prototype = new Resource();

Dataset.prototype.parent = Resource.prototype;

Dataset.prototype.create = function (sourceOrDataset, args, cb) {
  /**
   * Creates a dataset and builds customized error and resource info
   *
   * Uses HTTP POST to send dataset content.
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
    message = 'Failed to create the dataset. First parameter must be' +
    ' a source or dataset id.',
    resourceId = utils.getResource(sourceOrDataset),
    reqOptions = {
      method: 'POST',
      resourceType: 'dataset',
      endpoint: '/'
    };

  options = utils.optionalCUParams(arguments, message);

  if (resourceId.type === 'dataset') {
    options.args['origin_dataset'] = resourceId.resource;
  } else if (resourceId.type === 'source') {
    options.args.source = resourceId.resource;
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


Dataset.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'dataset', query, cb);
};


module.exports = Dataset;
