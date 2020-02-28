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

function LogisticRegression(connection) {
  Resource.call(this, connection);
}

LogisticRegression.prototype = new Resource();

LogisticRegression.prototype.parent = Resource.prototype;

LogisticRegression.prototype.create = function (datasets, args, retry, cb) {
  /**
   * Creates a logistic regression and builds customized error and resource
   * infor
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
   * @param {string|object|array} datasets Dataset id or array of dataset ids
   *                                       (or objects)
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */


var self = this, options, resource, resources, datasetsArray = false,
    message = 'Failed to create the logistic regression model. First' +
    ' parameter must be' +
    ' a dataset or datasets array.',
    resourceId,
    sendRequest,
    reqOptions = {
      method: 'POST',
      resourceType: constants.LOGISTIC_REGRESSION,
      endpoint: '/',
      store: true
    };

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

  sendRequest = utils.makeSendRequest(self, reqOptions, options);
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

LogisticRegression.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.LOGISTIC_REGRESSION, query, cb);
};

module.exports = LogisticRegression;
