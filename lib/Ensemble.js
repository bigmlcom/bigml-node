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

var BigML = require('./BigML');
var Resource = require('./Resource');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');

function Ensemble(connection) {
  Resource.call(this, connection);
}

Ensemble.prototype = new Resource();

Ensemble.prototype.parent = Resource.prototype;

Ensemble.prototype.create = function (dataset, args, cb) {
  /**
   * Creates an ensemble and builds customized error and resource info
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
   */

  var message = 'Failed to create the ensemble. First parameter must be' +
                ' a dataset id.';
  this.parent.create.call(this, 'ensemble', ['dataset'], message,
                          dataset, args, cb);
};

Ensemble.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'ensemble', query, cb);
};


module.exports = Ensemble;
