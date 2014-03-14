/**
 * Copyright 2013-2014 BigML
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

var exports = {};

module.exports = exports;

function define(name, value) {
  Object.defineProperty(exports, name, {
    value:      value,
    enumerable: true
  });
}

// BigML domain
define("BIGML_DOMAIN", process.env.BIGML_DOMAIN || 'bigml.io');

// BigML domain
var PROTOCOLS = ['http', 'https'];
var USER_PROTOCOL = process.env.BIGML_PROTOCOL || 'https';
define("BIGML_PROTOCOL", USER_PROTOCOL.toLowerCase());
if (PROTOCOLS.indexOf(exports.BIGML_PROTOCOL) < 0) {
  throw new Error('Check your BIGML_PROTOCOL environment variable.\n' +
                  'Only http and https are accepted as protocols.');
}

// Base URL
define("BIGML_URL",
       exports.BIGML_PROTOCOL + '://' +
       exports.BIGML_DOMAIN + '/andromeda/');

// Development Mode URL
define("BIGML_DEV_URL",
       exports.BIGML_PROTOCOL + '://'  +
       exports.BIGML_DOMAIN + '/dev/andromeda/');

// Check BigML.io host’s SSL certificate
// DO NOT CHANGE IT.
define("VERIFY", exports.BIGML_DOMAIN.indexOf('bigml.io') === 0);

// Logging options
// 0 - silent,
// 1 - console and file log winston defaults,
// 2 - console log only
// 3 - file log only
// 4 - console and file with debug info
var LOG_LEVELS = ['0', '1', '2', '3', '4']; 

define("BIGML_LOG_FILE", process.env.BIGML_LOG_FILE || 'bigml.log');
if ((typeof process.env.BIGML_LOG_LEVEL) == 'undefined' ||
     LOG_LEVELS.indexOf(process.env.BIGML_LOG_LEVEL) < 0) {
  define("BIGML_LOG_LEVEL", 1);
} else {
  define("BIGML_LOG_LEVEL", process.env.BIGML_LOG_LEVEL);
}


// Basic resources
define("SOURCE_PATH", 'source');
define("DATASET_PATH", 'dataset');
define("MODEL_PATH", 'model');
define("PREDICTION_PATH", 'prediction');
define("EVALUATION_PATH", 'evaluation');
define("ENSEMBLE_PATH", 'ensemble');
define("BATCH_PREDICTION_PATH", 'batchprediction');

// Headers
define("SEND_JSON", {'Content-Type': 'application/json;charset=utf-8'});
define("ACCEPT_JSON", {'Accept': 'application/json;charset=utf-8'});


// HTTP Status Codes from https://bigml.com/developers/status_codes
define("HTTP_OK", 200);
define("HTTP_CREATED", 201);
define("HTTP_ACCEPTED", 202);
define("HTTP_NO_CONTENT", 204);
define("HTTP_BAD_REQUEST", 400);
define("HTTP_UNAUTHORIZED", 401);
define("HTTP_PAYMENT_REQUIRED", 402);
define("HTTP_FORBIDDEN", 403);
define("HTTP_NOT_FOUND", 404);
define("HTTP_METHOD_NOT_ALLOWED", 405);
define("HTTP_LENGTH_REQUIRED", 411);
define("HTTP_TOO_MANY_REQUESTS", 429);
define("HTTP_INTERNAL_SERVER_ERROR", 500);
define("HTTP_COMMON_ERRORS", [module.exports.HTTP_UNAUTHORIZED,
                              module.exports.HTTP_BAD_REQUEST,
                              module.exports.HTTP_NOT_FOUND,
                              module.exports.HTTP_TOO_MANY_REQUESTS]);

// Resource status codes
define("WAITING", 0);
define("QUEUED", 1);
define("STARTED", 2);
define("IN_PROGRESS", 3);
define("SUMMARIZED", 4);
define("FINISHED", 5);
define("UPLOADING", 6);
define("FAULTY", -1);
define("UNKNOWN", -2);
define("RUNNABLE", -3);

// Resource types
define("RESOURCE_TYPES", ['source', 'dataset', 'model', 'ensemble',
  'prediction', 'evaluation', 'batchprediction']);
define("PUBLIC_RESOURCE_TYPES", ['dataset', 'model']);
// Resources syntax patterns
define("ID_PATTERN", /^[a-f0-9]{24}$/);
define("PUBLIC_PREFIX", "public/");
// Query string for model retrieval
define("ONLY_MODEL", 'only_model=true;limit=-1;');
// Default retries parameters
define("DEFAULT_BIGML_RETRIES", 10);
define("DEFAULT_BIGML_WAIT", 1000);

// Retriable error codes
define("RETRY_ERRORS", [-10, -20, -40, -45, -50, -500, -2000,
                        -2003, -2010, -3000, -3003, -3010, -4000,
                        -4003, -4200, -5000, -6010, -6020]);
