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
var BaseScript = require('./BaseScript');
var request = require('request');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');

var createErrors = constants.HTTP_COMMON_ERRORS.slice();
createErrors.push(constants.HTTP_PAYMENT_REQUIRED);

function Library(connection) {
  BaseScript.call(this, connection);
}

Library.prototype = new BaseScript();

Library.prototype.parent = BaseScript.prototype;

Library.prototype.create = function (sourceCode, args, retry, cb) {
  this.parent.create.call(this, constants.LIBRARY, sourceCode, args,
                          retry, cb);
};

Library.prototype.list = function (query, cb) {
  this.parent.list.call(this, constants.LIBRARY, query, cb);
};


module.exports = Library;
