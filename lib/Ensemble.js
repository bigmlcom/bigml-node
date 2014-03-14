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
var async = require('async');

function Ensemble(connection) {
  Resource.call(this, connection);
}

Ensemble.prototype = new Resource();

Ensemble.prototype.parent = Resource.prototype;

Ensemble.prototype.create = function (datasets, args, retry, cb) {
  /**
   * Creates an ensemble and builds customized error and resource info
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

  var self = this, options, resource, resources, datasetsArray = false,
    message = 'Failed to create the ensemble. First parameter must be' +
                ' a dataset id or datasets array.',
    resourceId,
    createErrors = constants.HTTP_COMMON_ERRORS,
    reqOptions = {
      method: 'POST',
      resourceType: 'ensemble',
      endpoint: '/'
    };
    createErrors.push(constants.HTTP_PAYMENT_REQUIRED);
    createErrors.push(constants.HTTP_FORBIDDEN);

  if (arguments.length > 0) {
    datasetsArray = utils.isArray(datasets);
    resource = (datasetsArray) ? datasets[0] : datasets;  
    resourceId = utils.getResource(resource);
    options = utils.optionalCUParams(arguments, message);

    if (datasetsArray && resourceId.type === 'dataset') {
      resources = datasets;
      options.args['datasets'] = datasets;
    } else if (resourceId.type === 'dataset') {
      resources = [datasets];
      options.args['dataset'] = resourceId.resource;
    } else {
      throw new Error(message);
    }
    options = utils.setRetries(options);
    options.type = reqOptions.resourceType;
    options.operation = 'create';
    this.resources = resources;
    this.options = options
  } else {
    if (!this.options || !this.resources) {
      logger.error("Create has been called with no parameters.");
      return;
    }
    options = this.options;
    datasetsArray = this.resources.length > 1;
    resource = this.resources[0];
    resources = this.resources;
    resourceId = utils.getResource(resource);
  }
  reqOptions.body = options.args;

  function sendRequest(error) {
    if (error) {
      logger.error("Origin resources could not be retrieved: " + error);
    } else {
      self.connection.request(reqOptions,
                              function processResponse(error, data, response) {
          var code = constants.HTTP_INTERNAL_SERVER_ERROR,
            result = utils.makeEmptyResult('resource',
                                           code,
                                           'The resource couldn\'t be created');
          return utils.requestResponse('resource', self,
                                       constants.HTTP_CREATED,
                                       createErrors,
                                       error, data, response, result,
                                       options.cb);
        });
    }
  }
  // The origin resources must be retrieved in a finished state before 
  // create starts. This is only done when create is called by the user, not
  // internally to retry creation.
  if (arguments.length > 0) {
    async.each(resources, function(resource, done) {
        var id = utils.getResource(resource);
        new Resource(self.connection).get(id.resource, true, done);
        },
      sendRequest);
  } else {
    sendRequest(null);
  }

};

Ensemble.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'ensemble', query, cb);
};


module.exports = Ensemble;
