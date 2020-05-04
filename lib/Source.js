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

var request = require('request');
var fs = require('fs');
var FormData = require('form-data');
var util = require('util');

var BigML = require('./BigML');
var Resource = require('./Resource');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');
var util = require('util');

var createErrors = constants.HTTP_COMMON_ERRORS.slice();
createErrors.push(constants.HTTP_PAYMENT_REQUIRED);

function Source(connection) {
  Resource.call(this, connection);
}

Source.prototype = new Resource();

Source.prototype.parent = Resource.prototype;

Source.prototype.create = function (path, args, retry, cb) {
  /**
   * Creates a source and builds customized error and resource info
   *
   * Uses HTTP POST to send source content.
   *
   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   * @param {string} path Path to the source file, external connector info
   *                      or inline data
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */

  var self = this, uri, form, formLength, headers, arg, options, sendRequest,
    message = 'Failed to create the source. First parameter must be' +
    ' a file path, external connector info or inline data.', reqOptions;

  if (arguments.length > 0) {
    options = utils.optionalCUParams(arguments, message);
    if (typeof path === 'object') { // external connector
      options.args["external_data"] = path;
    } else {
      options.path = path;
    }
    options = utils.setRetries(options);
    options.type = constants.SOURCE;
    options.operation = 'create';
    this.options = options;
  } else {
    options = this.options;
  }
  uri = this.connection.resourceUrls.source + this.connection.auth;
  if (typeof path !== 'object') {
    // source from local, remote or inline data
    form = new FormData();
    try {
      form.append('file', fs.createReadStream(options.path));
    } catch (err) {
      return options.cb(err, null);
    }

    for (arg in options.args) {
      if (options.args.hasOwnProperty(arg)) {
        if (typeof options.args[arg] == 'object') {
          form.append(arg, JSON.stringify(options.args[arg]));
        } else {
          form.append(arg, options.args[arg]);
        }
      }
    }
    form.getLength(function (error, length) {
      formLength = length;
      headers = form.getHeaders({'content-length': formLength});
      var r = request.post({
        uri        : uri,
        method     : 'POST',
        strictSSL  : constants.VERIFY,
        headers    : headers
      }, function (error, response) {
        var code = constants.HTTP_INTERNAL_SERVER_ERROR,
          result = utils.makeEmptyResult('resource',
                                         code,
                                         'The resource couldn\'t be created');

        return utils.requestResponse('create', self, constants.HTTP_CREATED,
                                     createErrors,
                                     error, undefined, response,
                                     result, options.cb);
      });
      form.pipe(r);
    });

  } else {
    // source from external connector
    reqOptions = utils.createRequest('source');
    options.operationFunction = this.create;
    this.options = options;
    reqOptions.body = options.args;

    sendRequest = utils.makeSendRequest(self, reqOptions, options);
    sendRequest(null);
  }

};

Source.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.SOURCE, query, cb);
};

module.exports = Source;
