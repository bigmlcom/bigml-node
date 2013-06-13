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

var request = require('request');
var fs = require('fs');
var FormData = require('form-data');
var util = require('util');

var BigML = require('./BigML');
var Resource = require('./Resource');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');

function Source(connection) {
  Resource.call(this, connection);
}

Source.prototype = new Resource();

Source.prototype.parent = Resource.prototype;

Source.prototype.create = function (path, args, cb) {
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
   */
  var uri, form, formLength, headers, arg, options,
    message = 'Failed to create the source. First parameter must be' +
    ' a file path.';

  options = utils.optionalCUParams(arguments, message);

  uri = this.connection.resourceUrls.source + this.connection.auth;
  form = new FormData();
  try {
    form.append('file', fs.createReadStream(path));
  } catch (err) {
    return options.cb(err, null);
  }
  for (arg in options.args) {
    if (options.args.hasOwnProperty(arg)) {
      form.append(arg, options.args[arg]);
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

      return utils.requestResponse('create', constants.HTTP_CREATED,
                                   [constants.HTTP_PAYMENT_REQUIRED,
                                    constants.HTTP_UNAUTHORIZED,
                                    constants.HTTP_BAD_REQUEST,
                                    constants.HTTP_NOT_FOUND],
                                   error, undefined, response,
                                   result, options.cb);
    });

    form.pipe(r);
  });
};

Source.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'source', query, cb);
};

module.exports = Source;
