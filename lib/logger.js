/**
 * Copyright 2013-2015 BigML
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
 */

"use strict";

var winston = require('winston');
var constants = require('./constants');

var CONSOLE_SILENT = (['0', '3'].indexOf(constants.BIGML_LOG_LEVEL) > -1);
var FILE_SILENT = (['0', '2'].indexOf(constants.BIGML_LOG_LEVEL) > -1);
var LEVEL = (['4'].indexOf(constants.BIGML_LOG_LEVEL) > -1) ? 'debug' : 'error';

var logger = new (winston.Logger)({
  exitOnError: false,
  transports: [
    new winston.transports.Console({silent: CONSOLE_SILENT, level: LEVEL}),
    new winston.transports.File({filename: constants.BIGML_LOG_FILE,
                                 handleExceptions: true,
                                 silent: FILE_SILENT, level: LEVEL})
  ]
});

module.exports = logger;
