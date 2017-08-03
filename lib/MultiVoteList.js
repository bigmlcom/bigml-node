/**
 * Copyright 2017 BigML
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
var NODEJS = ((typeof module !== 'undefined') && module.exports);
var PATH = (NODEJS) ? "./" : "";

var constants = require(PATH + 'constants');
var utils = require(PATH + 'utils');

/**
 * MultiVoteList: combiner class for classification ensembles distributions.
 * @constructor
 * @param {array|object} predictions Array of model's predictions distributions
 */
function MultiVoteList(predictions) {
  this.predictions = [];
  if (Object.prototype.toString.call(predictions) === '[object Array]') {
    // for array of predictions
    this.predictions = predictions;
  } else {
    throw new Error("Failed to find the array of predictions' distributions" +
                    " needed to create a MultiVoteList.");
  }
}


MultiVoteList.prototype.combineToDistribution = function (measure) {
  /**
   * Receives a list of predictions distributions.
   * Each element is the list of probabilities
   * or confidences
   * associated to each class in the ensemble. Returns the
   * probability obtained by adding these predictions into a single one
   * by adding their probabilities and normalizing.
   * @param {string} measure Quantity used in the distribution (confidence or
   *                         probability)
   */
  var i, len, total = 0.0, output = [], classNames = [], result, results = [],
    distribution, j, len2;
  for (i = 0, len = this.predictions.length; i < len; i++) {
    distribution = this.predictions[i];
    if (output.length == 0) {
      for (j = 0, len2 = distribution.length; j < len2; j++) {
        output.push(0.0);
        classNames.push(distribution[j]['prediction']);
      }
    }
    for (j = 0, len2 = distribution.length; j < len2; j++) {
      output[j] += distribution[j][measure];
      total += distribution[j][measure];
    }
  }
  if (total == 0) {
    return [];
  }
  for (i = 0, len = output.length; i < len; i++) {
    result = {'prediction': classNames[i]};
    result[measure] = output[i] / total;
    results.push(result);
  }
  return results;
};


if (NODEJS) {
  module.exports = MultiVoteList;
} else {
  exports = MultiVoteList;
}
