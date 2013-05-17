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

var BigMLResource = require('./resource');
var constants = require('./constants');
var logger = require('./logger');
var request = require('request');
var fs = require('fs');
var FormData = require('form-data');
var utils = require('./utils');

function BigMLSource() {
}

BigMLSource.prototype = new BigMLResource();

BigMLSource.prototype.parent = BigMLResource.prototype

BigMLSource.prototype.create = function(path, args, cb) {
  /**
   * Creates a source and builds costumized error and resource info
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
  if ((typeof cb) === 'undefined') cb = utils.showResult;
  var uri = this.connection.resourceUrls.source + this.connection.auth;
  var form = new FormData();
  form.append('file', fs.createReadStream(path));
  for (var arg in args) {
    form.append(arg, args[arg]);
  }
  var formLength;
  var headers;
  form.getLength(function(error, length) {
    formLength = length;
    headers = form.getHeaders({'content-length': formLength})
    var r = request.post({
      uri        : uri,
      method     : 'POST',
      strictSSL  : constants.VERIFY,
      headers    : headers
      }, function (error, response){
      var code = constants.HTTP_INTERNAL_SERVER_ERROR;
      var result = {
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
      }
      if (error) {
        result.error.status.message += ': ' + error;
        logger.error(result)
        return cb(result.error, result);
      }
      try {
        var resource = JSON.parse(response.body);
        var resourceId = utils.getResource(resource)
        var location = response.request.uri.href;
        var iQuery;
        if ((iQuery = location.indexOf('?')) > -1) {
          location = location.substring(0, iQuery);
        }
        logger.debug(response)
        if (response.statusCode == constants.HTTP_CREATED) {
          result = {
            code: response.statusCode,
            object: resource,
            resource: resource.resource,
            location: location + "/" + resourceId.id,
            error: null
          }
        }
        else if (code === constants.HTTP_BAD_REQUEST ||
                 code === constants.HTTP_UNAUTHORIZED ||
                 code === constants.HTTP_PAYMENT_REQUIRED ||
                 code === constants.HTTP_NOT_FOUND) {
          result.error = response.body;
          logger.error(result.error);
          return cb(result.error, result);
        }
        else {
          logger.error('Unexpected error (' + code + ')');
          return cb(result.error, result);
        }
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
module.exports = BigMLSource
