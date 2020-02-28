/**
 * Copyright 2018-2020 BigML
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

function OptiML(connection) {
  Resource.call(this, connection);
}

OptiML.prototype = new Resource();

OptiML.prototype.parent = Resource.prototype;

OptiML.prototype.create = function (dataset, args, retry, cb) {
  /**
   * Creates a model and builds customized error and resource info
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
   * @param {string|object|array} dataset Dataset id (or object)
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */

  var self = this, options, resource, resources, datasetsArray = false,
    message = 'Failed to create the OptiML. First parameter must be' +
    ' a dataset or datasets array.',
    resourceId,
    sendRequest,
    reqOptions = utils.createRequest(constants.OPTIML);

  if (arguments.length > 0) {
    resource = dataset;
    resourceId = utils.getResource(resource);
    options = utils.optionalCUParams(arguments, message);

    if (resourceId.type !== 'dataset') {
      throw new Error(message);
    }

    options.args['dataset'] = resourceId.resource;
    options = utils.setRetries(options);
    options.type = reqOptions.resourceType;
    options.operation = 'create';
    this.options = options;
  } else {
    if (!this.options || !this.resources) {
      logger.error("Create has been called with no parameters.");
      return;
    }
    options = this.options;
    resource = this.options["dataset"];
    resourceId = utils.getResource(resource);
  }
  reqOptions.body = options.args;

  sendRequest = utils.makeSendRequest(self, reqOptions, options);
  // The origin resources must be retrieved in a finished state before
  // create starts. This is only done when create is called by the user, not
  // internally to retry creation.
  if (arguments.length > 0) {
    var id = utils.getResource(resource);
    new Resource(self.connection).get(id.resource, true, sendRequest);
  } else {
    sendRequest(null);
  }
};

OptiML.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.OPTIML, query, cb);
};


module.exports = OptiML;
