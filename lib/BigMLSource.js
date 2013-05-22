/**
 * Copyright 2012 BigML
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

var BigMLResource = require('./BigMLResource');
var constants = require('./constants');
var logger = require('./logger');
var request = require('request');
var fs = require('fs');
var FormData = require('form-data');
var utils = require('./utils');

function BigMLSource(connection) {
  if (utils.getObjectClass(connection) === 'BigML') {
    this.connection = connection;
  } else {
    this.connection = new BigML();
  }
}

BigMLSource.prototype = new BigMLResource();

BigMLSource.prototype.parent = BigMLResource.prototype;

BigMLSource.prototype.create = function (path, args, cb) {
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
  var uri, form, formLength, headers, arg;
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }
  uri = this.connection.resourceUrls.source + this.connection.auth;
  form = new FormData();
  form.append('file', fs.createReadStream(path));
  for (arg in args) {
    if (args.hasOwnProperty(arg)) {
      form.append(arg, args[arg]);
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
      var resource, resourceId, location, iQuery,
        code = constants.HTTP_INTERNAL_SERVER_ERROR,
        result = {
          code: code,
          object: null,
          resource: null,
          location: null,
          error: {
            status: {
              code: code,
              message: 'The resource couldn\'t be created'
            }
          }
        };
      if (error) {
        result.error.status.message += ': ' + error;
        logger.error(result);
        return cb(result.error, result);
      }
      try {
        resource = JSON.parse(response.body);
        resourceId = utils.getResource(resource);
        location = response.request.uri.href;
        if ((iQuery = location.indexOf('?')) > -1) {
          location = location.substring(0, iQuery);
        }
        logger.debug(response);
        if (response.statusCode === constants.HTTP_CREATED) {
          result = {
            code: response.statusCode,
            object: resource,
            resource: resource.resource,
            location: location + "/" + resourceId.id,
            error: null
          };
        } else if (code === constants.HTTP_BAD_REQUEST ||
                   code === constants.HTTP_UNAUTHORIZED ||
                   code === constants.HTTP_PAYMENT_REQUIRED ||
                   code === constants.HTTP_NOT_FOUND) {
          result.error = response.body;
          logger.error(result.error);
          return cb(result.error, result);
        }
        logger.error('Unexpected error (' + code + ')');
        return cb(result.error, result);
      } catch (err) {
        result.error.status.message += ': ' + error;
        logger.error(result);
        return cb(result.error, result);
      }
      logger.debug(result);
      return cb(null, result);
    });

    form.pipe(r);
  });
}

BigMLSource.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'source', query, cb);
}

module.exports = BigMLSource;
