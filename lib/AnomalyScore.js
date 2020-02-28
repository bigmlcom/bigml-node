/**
 * Copyright 2014-2020 BigML
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


function AnomalyScore(connection) {
  Resource.call(this, connection);
}

AnomalyScore.prototype = new Resource();

AnomalyScore.prototype.parent = Resource.prototype;

AnomalyScore.prototype.create = function (anomaly, inputData, args,
                                          retry, cb) {
  /**
   * Creates an anomaly score and builds customized error and resource info
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
   * @param {string} anomaly Anomaly id
   * @param {object} inputData Input Data to predict from
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */

  var options,
    message = 'Failed to create the anomaly score. First parameter must be' +
              ' an anomaly detector id.',
    resourceId = utils.getResource(anomaly),
    self = this;

  options = utils.optionalCUParamsPred(arguments, message);

  options.args['input_data'] = options.inputData;
  self.parent.create.call(self, constants.ANOMALY_SCORE,
                          [constants.ANOMALY], message,
                          resourceId.resource,
                          options.args, options.retry, options.cb);
};

AnomalyScore.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.ANOMALY_SCORE, query, cb);
};


module.exports = AnomalyScore;
