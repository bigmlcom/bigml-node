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

function Fusion(connection) {
  Resource.call(this, connection);
}

Fusion.prototype = new Resource();

Fusion.prototype.parent = Resource.prototype;

Fusion.prototype.create = function (models, args, retry, cb) {
  /**
   * Creates a fusion and builds customized error and resource info
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
   * @param {array} models List of model ids
   *                       (or objects) for classification
   *                       or regression
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */

  var self = this, options, resource, resources = [],
    message = ('Failed to create the fusion. First parameter must be' +
               ' a list of supervised model IDs.'),
    resourceId,
    createErrors = constants.HTTP_COMMON_ERRORS,
    sendRequest, index, len = models.length,
    reqOptions = utils.createRequest(constants.FUSION);

  if (arguments.length > 0) {
    if (typeof models[0] === 'object') {
      for (index = 0; index < len; index++) {
        resources.push(models[index].id);
      }
    } else {
      resources = models;
    }
    resource = resources[0];
    resourceId = utils.getResource(resource);
    options = utils.optionalCUParams(arguments, message);
    options.operation = 'create';
    if (constants.SUPERVISED_MODELS.indexOf(resourceId.type) > -1) {
      options.args["models"] = models;
    } else {
      throw new Error(message);
    }
    options = utils.setRetries(options);
    options.type = "models";
    this.options = options;
    this.resources = resources;
  } else {
    if (!this.options || !this.resources) {
      logger.error("Create has been called with no parameters.");
      return;
    }
    options = this.options;
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

Fusion.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.FUSION, query, cb);
};


module.exports = Fusion;
