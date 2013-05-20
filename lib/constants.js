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

var exports = {};

module.exports = exports;

function define(name, value) {
  Object.defineProperty(exports, name, {
    value:      value,
    enumerable: true
  });
}

// Base URL
define("BIGML_URL",
       process.env.BIGML_URL || 'https://bigml.io/andromeda/');

// Development Mode URL
define("BIGML_DEV_URL",
       process.env.BIGML_DEV_URL || 'https://bigml.io/dev/andromeda/');

// Check BigML.io host’s SSL certificate
// DO NOT CHANGE IT.
define("VERIFY",
       (exports.BIGML_URL.indexOf('https://bigml.io/') === 0 ||
        exports.BIGML_DEV_URL.indexOf('https://bigml.io/') === 0));

// Basic resources
define("SOURCE_PATH", 'source');
define("DATASET_PATH", 'dataset');
define("MODEL_PATH", 'model');
define("PREDICTION_PATH", 'prediction');
define("EVALUATION_PATH", 'evaluation');
define("ENSEMBLE_PATH", 'ensemble');

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
define("HTTP_INTERNAL_SERVER_ERROR", 500);

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


/*
# Resource Ids patterns
SOURCE_RE = re.compile(r'^%s/[a-f,0-9]{24}$' % SOURCE_PATH)
DATASET_RE = re.compile(r'^%s/[a-f,0-9]{24}$|^public/%s/[a-f,0-9]{24}$' %
                        (DATASET_PATH, DATASET_PATH))
MODEL_RE = re.compile(r'^%s/[a-f,0-9]{24}$|^public/%s/[a-f,0-9]{24}$' %
                      (MODEL_PATH, MODEL_PATH))
PREDICTION_RE = re.compile(r'^%s/[a-f,0-9]{24}$' % PREDICTION_PATH)
EVALUATION_RE = re.compile(r'^%s/[a-f,0-9]{24}$' % EVALUATION_PATH)
ENSEMBLE_RE = re.compile(r'^%s/[a-f,0-9]{24}$' % ENSEMBLE_PATH)






# Resource status codes
WAITING = 0
QUEUED = 1
STARTED = 2
IN_PROGRESS = 3
SUMMARIZED = 4
FINISHED = 5
UPLOADING = 6
FAULTY = -1
UNKNOWN = -2
RUNNABLE = -3

# Map status codes to labels
STATUSES = {
    WAITING: "WAITING",
    QUEUED: "QUEUED",
    STARTED: "STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    SUMMARIZED: "SUMMARIZED",
    FINISHED: "FINISHED",
    UPLOADING: "UPLOADING",
    FAULTY: "FAULTY",
    UNKNOWN: "UNKNOWN",
    RUNNABLE: "RUNNABLE"
}

*/
