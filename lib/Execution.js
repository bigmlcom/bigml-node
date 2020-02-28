/**
 * Copyright 2015-2020 BigML
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

function Execution(connection) {
  Resource.call(this, connection);
}

Execution.prototype = new Resource();

Execution.prototype.parent = Resource.prototype;

Execution.prototype.create = function (originResource, args, retry, cb) {
  /**
   * Creates a whizzml script execution and builds
   * customized error and resource info
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
   * @param {string|object|array} originResource Script id or
   *                                             array of script ids (or
   *                                             resource objects).
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */


  var self = this, options, resource, resources, scriptsArray = false,
    message = 'Failed to create the whizzml script execution. First' +
    ' parameter must be' +
    ' a script id or a list of them.',
    resourceId,
    sendRequest,
    reqOptions = utils.createRequest(constants.EXECUTION);

  if (arguments.length > 0) {
    // piped scripts
    scriptsArray = utils.isArray(originResource);

    resource = (scriptsArray) ? originResource[0] : originResource;
    resourceId = utils.getResource(resource);
    options = utils.optionalCUParams(arguments, message);

    if (scriptsArray && resourceId.type === 'script') {
      // piped scripts
      resources = originResource;
      options.args['scripts'] = originResource;
    } else if (resourceId.type === 'script') {
      // new execution from script
      resources = [originResource];
      options.args['script'] = resourceId.resource;
    } else {
      throw new Error(message);
    }
    options = utils.setRetries(options);
    options.type = reqOptions.resourceType;
    options.operation = 'create';
    this.resources = resources;
    this.options = options;
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

  sendRequest = utils.makeSendRequest(self, reqOptions, options);
  // The origin resources must be retrieved in a finished state before
  // create starts. This is only done when create is called by the user, not
  // internally to retry creation.
  if (arguments.length > 0) {
    async.each(resources, function (resource, done) {
      var id = utils.getResource(resource);
      new Resource(self.connection).get(id.resource, true, done);
    },
      sendRequest);
  } else {
    sendRequest(null);
  }
};

Execution.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.EXECUTION, query, cb);
};


module.exports = Execution;
