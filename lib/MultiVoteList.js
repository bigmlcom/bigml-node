/**
 * Copyright 2017-2020 BigML
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
var PATH = (NODEJS) ? "./" : "";

var constants = require(PATH + 'constants');
var utils = require(PATH + 'utils');


// End of imports section --- DO NOT REMOVE

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


MultiVoteList.prototype.combineToDistribution = function (measure, normalize) {
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
  if (typeof normalize === 'undefined') {
    normalize = true;
  }
  for (i = 0, len = this.predictions.length; i < len; i++) {
    distribution = this.predictions[i];
    if (output.length == 0) {
      for (j = 0, len2 = distribution.length; j < len2; j++) {
        output.push(0.0);
        classNames.push(distribution[j]['category']);
      }
    }
    for (j = 0, len2 = distribution.length; j < len2; j++) {
      output[classNames.indexOf(distribution[j].category)] += distribution[j][measure];
      total += distribution[j][measure];
    }
  }
  if (!normalize) {
    total = this.predictions.length;
  }
  if (total == 0) {
    return [];
  }
  for (i = 0, len = output.length; i < len; i++) {
    result = {'category': classNames[i]};
    result[measure] = utils.decRound(output[i] / total, 5);
    results.push(result);
  }
  return results;
};


if (NODEJS) {
  module.exports = MultiVoteList;
} else {
  exports = MultiVoteList;
}
