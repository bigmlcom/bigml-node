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

var exports = {
  getWaitTimeExp: function (retryOptions) {
    /**
     * Computes the wait time used in next request from the retry options
     * given by the user.
     *
     * @param {object} retryOptions Object specifying:
     *                              {retries: [total number of retries],
     *                               wait: [initial wait time in milliseconds],
                                     retriesLeft: [number of retries left]}
     */
    var retryCount, delta, expFactor, waitTime;
    retryCount = retryOptions.retries - retryOptions.retriesLeft;
    delta = Math.pow(2, retryCount) * retryOptions.wait / 2;
    expFactor = (retryCount > 1) ? delta : 0;
    waitTime = retryOptions.wait + Math.floor(Math.random() * expFactor);
    return waitTime;
  }
};


module.exports = exports;
