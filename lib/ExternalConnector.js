/**
 * Copyright 2020 BigML
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


function ExternalConnector(connection) {
  Resource.call(this, connection);
}

ExternalConnector.prototype = new Resource();

ExternalConnector.prototype.parent = Resource.prototype;

ExternalConnector.prototype.create = function (connectionInfo, args,
                                               retry, cb) {
  /**
   * Creates an External Connector to retrieve data
   * and builds customized error and resource info
   *
   * Uses HTTP POST
   *
   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   * @param {object} connectionInfo Object that contains the connection
   *                                attributes: host, port, user, password
   *                                and database
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name", "source": "postgresql"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */


var self = this, options, resource, resources,
    message = 'Failed to create the External Connector. First' +
    ' parameter must be' +
    ' an object with the following attributes: host, port, user, password' +
    ' and database.',
    sendRequest,
    reqOptions = {
      method: 'POST',
      resourceType: constants.EXTERNAL_CONNECTOR,
      endpoint: '/',
      store: true
    };

  if (arguments.length > 0) {
    options = utils.optionalCUParams(arguments, message);
    options = utils.setRetries(options);
    options.type = reqOptions.resourceType;
    options.cb = cb;
    options.operation = 'create';
    if (typeof connectionInfo === 'undefined') {// reading from envvars
      connectionInfo = utils.getExternalConnectionInfo();
    }
    this.connectionInfo = connectionInfo;
    this.options = options
  } else {
    if (!this.options || !this.connectionInfo) {
      logger.error("Create has been called with no parameters.");
      return;
    }
    options = this.options;
  }
  options.args.connection = this.connectionInfo;
  reqOptions.body = options.args;

  sendRequest = utils.makeSendRequest(self, reqOptions, options);
  sendRequest(null);
};

ExternalConnector.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.EXTERNAL_CONNECTOR, query, cb);
};

module.exports = ExternalConnector;
