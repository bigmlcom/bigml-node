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


function Project(connection) {
  Resource.call(this, connection);
}

Project.prototype = new Resource();

Project.prototype.parent = Resource.prototype;

Project.prototype.create = function (args, cb) {
  /**
   * Creates a project and builds customized error and resource info
   *
   * Uses HTTP POST to send project content.
   *
   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {function} cb Callback function
   */

  var self = this,
    callArguments,
    options,
    index,
    message = 'Failed to create the project.',
    sendRequest,
    reqOptions = utils.createRequest(constants.PROJECT);

  if (arguments.length > 0) {
    // no prior resource needed to create a project, we add an empty resource
    // to use the same method as in other resources
    callArguments = [undefined];
    for (index = 0; index < arguments.length; index++) {
      callArguments.push(arguments[index]);
    }
    options = utils.optionalCUParams(callArguments, message);
    options = utils.setRetries(options);
    options.type = reqOptions.resourceType;
    options.operation = 'create';
    this.options = options;
  } else {
    if (!this.options) {
      logger.error("Create has been called with no parameters.");
      return;
    }
    options = this.options;
  }
  reqOptions.body = options.args;
  sendRequest = utils.makeSendRequest(self, reqOptions, options);
  sendRequest(null);
};


Project.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.PROJECT, query, cb);
};

module.exports = Project;
