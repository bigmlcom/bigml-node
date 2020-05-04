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

var NODEJS = ((typeof process !== 'undefined') && process &&
  process.RUNNING_IN_NODEJS === 'true');

var constants = {};
constants.NODEJS = NODEJS;

function define(name, value) {
  Object.defineProperty(constants, name, {
    value:      value,
    enumerable: true
  });
}

if (NODEJS) {
  // BigML domain
  define("BIGML_DOMAIN", process.env.BIGML_DOMAIN || 'bigml.io');

  // BigML domain
  var PROTOCOLS = ['http', 'https'];
  var USER_PROTOCOL = process.env.BIGML_PROTOCOL || 'https';
  define("BIGML_PROTOCOL", USER_PROTOCOL.toLowerCase());
  if (PROTOCOLS.indexOf(constants.BIGML_PROTOCOL) < 0) {
    throw new Error('Check your BIGML_PROTOCOL environment variable.\n' +
                    'Only http and https are accepted as protocols.');
  }

  // Base URL
  define("BIGML_URL",
         constants.BIGML_PROTOCOL + '://' +
         constants.BIGML_DOMAIN + '/andromeda/');

  // Check BigML.io host’s SSL certificate
  // DO NOT CHANGE IT.
  define("VERIFY", constants.BIGML_DOMAIN.indexOf('bigml.io') === 0);

  // Logging options
  // 0 - silent,
  // 1 - console and file log winston defaults,
  // 2 - console log only
  // 3 - file log only
  // 4 - console and file with debug info
  var LOG_LEVELS = ['0', '1', '2', '3', '4'];

  define("BIGML_LOG_FILE", process.env.BIGML_LOG_FILE || 'bigml.log');
  if ((typeof process.env.BIGML_LOG_LEVEL) === 'undefined' ||
       LOG_LEVELS.indexOf(process.env.BIGML_LOG_LEVEL) < 0) {
    define("BIGML_LOG_LEVEL", 1);
  } else {
    define("BIGML_LOG_LEVEL", process.env.BIGML_LOG_LEVEL);
  }
}

// Basic resources
define("SOURCE", 'source');
define("DATASET", 'dataset');
define("MODEL", 'model');
define("PREDICTION", 'prediction');
define("EVALUATION", 'evaluation');
define("ENSEMBLE", 'ensemble');
define("BATCH_PREDICTION", 'batchprediction');
define("CLUSTER", 'cluster');
define("CENTROID", 'centroid');
define("BATCH_CENTROID", 'batchcentroid');
define("ANOMALY", 'anomaly');
define("ANOMALY_SCORE", 'anomalyscore');
define("BATCH_ANOMALY_SCORE", 'batchanomalyscore');
define("PROJECT", 'project');
define("SAMPLE", 'sample');
define("CORRELATION", 'correlation');
define("STATISTICAL_TEST", 'statisticaltest');
define("LOGISTIC_REGRESSION", 'logisticregression');
define("ASSOCIATION", 'association');
define("ASSOCIATION_SET", 'associationset');
define("TOPIC_MODEL", 'topicmodel');
define("TOPIC_DISTRIBUTION", 'topicdistribution');
define("TIME_SERIES", 'timeseries');
define("FORECAST", 'forecast');
define("OPTIML", 'optiml');
define("FUSION", 'fusion');
define("BATCH_TOPIC_DISTRIBUTION", 'batchtopicdistribution');
define('DEEPNET', 'deepnet');
define('PCA', 'pca');
define("LINEAR_REGRESSION", 'linearregression');
define('PROJECTION', 'projection');
define('BATCH_PROJECTION', 'batchprojection');
define("SCRIPT", 'script');
define("EXECUTION", 'execution');
define("LIBRARY", 'library');
define("EXTERNAL_CONNECTOR", 'externalconnector');

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
define("HTTP_COMMON_ERRORS", [constants.HTTP_UNAUTHORIZED,
                              constants.HTTP_BAD_REQUEST,
                              constants.HTTP_NOT_FOUND,
                              constants.HTTP_TOO_MANY_REQUESTS]);
var createErrors = constants.HTTP_COMMON_ERRORS.slice();
createErrors.push(constants.HTTP_PAYMENT_REQUIRED);
createErrors.push(constants.HTTP_FORBIDDEN);
define("HTTP_CREATE_ERRORS", createErrors);
var updateErrors = constants.HTTP_COMMON_ERRORS.slice();
updateErrors.push(constants.HTTP_PAYMENT_REQUIRED);
updateErrors.push(constants.HTTP_METHOD_NOT_ALLOWED);
define("HTTP_UPDATE_ERRORS", updateErrors);

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

// literal status codes:
define("STATUS", {
  'S0': "WAITING",
  'S1': "QUEUED",
  'S2': "STARTED",
  'S3': "IN PROGRESS",
  'S4': "SUMMARIZED",
  'S5': "FINISHED",
  'S6': "UPLOADING",
  'S-1': "FAULTY",
  'S-2': "UNKNOWN",
  'S-3': "RUNNABLE"
})

// Field types
define("NUMERIC", 'numeric');
define("CATEGORICAL", 'categorical');

// Laminar constants
// This can be any x where np.exp(x) + 1 == np.exp(x)  Going up to 512
// isn't strictly necessary, but hey, why not?
define("LARGE_EXP", 512);

// Resource types
define("RESOURCE_TYPES", ['source', 'dataset', 'model', 'ensemble',
  'prediction', 'evaluation', 'batchprediction', 'cluster', 'centroid',
  'batchcentroid', 'anomaly', 'anomalyscore', 'batchanomalyscore', 'project',
  'sample', 'correlation', 'statisticaltest', 'logisticregression',
  'association', 'associationset', 'topicmodel', 'topicdistribution',
  'batchtopicdistribution', 'timeseries', 'forecast', 'deepnet', 'optiml',
  'fusion', 'pca', 'projection', 'batchprojection', 'linearregression',
  'script', 'library', 'execution', 'externalconnector']);

define("PUBLIC_RESOURCE_TYPES", ['dataset', 'model']);
define("SHARED_RESOURCE_TYPES", ['dataset', 'model', 'evaluation', 'cluster',
                                 'ensemble', 'prediction', 'batchprediction',
                                 'batchcentroid', 'anomaly', 'anomalyscore',
                                 'batchanomalyscore', 'correlation',
                                 'association', 'logisticregression',
                                 'topicmodel', 'topicdistribution',
                                 'batchtopicdistribution', 'pca',
                                 'projection', 'batchprojection',
                                 'linearregression',
                                 'script', 'execution', 'library']);
// Resources syntax patterns
define("ID_PATTERN", /^[a-f0-9]{24}$/);
define("PUBLIC_PREFIX", "public/");
define("ID_SHARED_PATTERN", /^[a-zA-Z0-9]{24,30}$/);
define("SHARED_PREFIX", "shared/");
// Query string for model retrieval
define("ONLY_MODEL", 'only_model=true;limit=-1;');
// Default retries parameters
define("DEFAULT_BIGML_RETRIES", 10);
define("DEFAULT_BIGML_WAIT", 1000);

// Retriable error codes
define("RETRY_ERRORS", [-10, -20, -40, -45, -50, -500, -2000,
                        -2003, -2010, -3000, -3003, -3010, -4000,
                        -4003, -4200, -5000, -6010, -6020]);

// Text analysis constants
define("TM_TOKENS", 'tokens_only');
define("TM_FULL_TERM", 'full_terms_only');
define("TM_ALL", 'all');
define("FULL_TERM_PATTERN", new RegExp('^.+\\b.+$'));

define("LAST_PREDICTION", 0);
define("PROPORTIONAL", 1);
define("BINS_LIMIT", 32);
define("SUPERVISED_MODELS",
       [constants.ENSEMBLE,
        constants.MODEL,
        constants.LOGISTIC_REGRESSION,
        constants.LINEAR_REGRESSION,
        constants.DEEPNET,
        constants.FUSION]);

define("EXTERNAL_CONNECTION_ATTRS", {
  "BIGML_EXTERNAL_CONN_HOST": "host",
  "BIGML_EXTERNAL_CONN_PORT": "port",
  "BIGML_EXTERNAL_CONN_USER": "user",
  "BIGML_EXTERNAL_CONN_PWD": "password",
  "BIGML_EXTERNAL_CONN_DB": "database",
  "BIGML_EXTERNAL_CONN_SOURCE": "source"});



if (NODEJS) {
  module.exports = constants;
} else {
  exports = constants;
}
