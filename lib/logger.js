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
 */

"use strict";

const ZAP = process.env.BIGML_REQUIRE_PRELOAD &&
  process.env.BIGML_REQUIRE_PRELOAD != "false" &&
  process.env.BIGML_REQUIRE_PRELOAD != "no";

if (ZAP) {
  module.exports = {
    error : function(){},
    debug : function(){},
    warning : function(){},
  };
} else {

  const winston = require('winston');
  const constants = require('./constants');

  const CONSOLE_SILENT = (['0', '3'].indexOf(constants.BIGML_LOG_LEVEL) > -1);
  const FILE_SILENT = (['0', '2'].indexOf(constants.BIGML_LOG_LEVEL) > -1);
  const LEVEL = (['4'].indexOf(constants.BIGML_LOG_LEVEL) > -1) ? 'debug' : 'error';
  const BIGML_LOG_EXCEPTIONS = (process.env.BIGML_LOG_EXCEPTIONS != "0") ? true : false;
  const BIGML_EXIT_ON_ERROR = (process.env.BIGML_EXIT_ON_ERROR != "0") ? true: false;

  const exitOnError = BIGML_EXIT_ON_ERROR;
  var transports = [
    new winston.transports.Console({handleExceptions: BIGML_LOG_EXCEPTIONS,
                                    silent: CONSOLE_SILENT, level: LEVEL})
  ];

  if (constants.BIGML_LOG_FILE) {
    transports.push(
      new winston.transports.File({filename: constants.BIGML_LOG_FILE,
                                   handleExceptions: BIGML_LOG_EXCEPTIONS,
                                   silent: FILE_SILENT, level: LEVEL})
    );
  }

  var logger = new (winston.Logger)({
    exitOnError: exitOnError,
    transports: transports
  });

  module.exports = logger;
}
