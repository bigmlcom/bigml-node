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
 * under the License.
 */

"use strict";
var NODEJS = ((typeof module !== 'undefined') && module.exports);
var PATH = (NODEJS) ? "./" : "";

var constants = require(PATH + 'constants');
var utils = require(PATH + 'utils');
var COMBINATION_WEIGHTS = ['confidence', 'distribution'];
var WEIGHT_KEYS = [[], ['confidence'], ['distribution', 'count'], []];
var WEIGHT_LABELS = [undefined, 'confidence', 'probability', undefined];
var PLURALITY = 0;
var CONFIDENCE = 1;
var PROBABILITY = 2;
var THRESHOLD = 3;


function checkKeys(predictions, keys) {
  /**
   * Checks the presence of each of the keys in each of the predictions
   *
   * @param {array} predictions Array of prediction objects
   * @param {array} keys Array of key strings
   */
  var prediction, key, index, kindex, len;
  for (index = 0, len = predictions.length; index < len; index++) {
    prediction = predictions[index];
    for (kindex = 0; kindex < keys.length; kindex++) {
      key = keys[kindex];
      if (!prediction.hasOwnProperty(key)) {
        throw new Error('Not enough data to use the selected prediction' +
                        ' method.');
      }
    }
  }
}

/**
 * MultiVote: combiner class for ensembles voting predictions.
 * @constructor
 * @param {array|object} predictions Array of model's predictions
 */
function MultiVote(predictions) {
  this.predictions = [];
  var i, len;
  if (Object.prototype.toString.call(predictions) === '[object Array]') {
    // for array of predictions
    this.predictions = predictions;
  } else {
    // for a single prediction object
    this.predictions.push(predictions);
  }
  // If 'distribution' is given in the prediction, adds 'count' as the
  // total number of instances. At the same time, checks if order is set.
  if (predictions && this.predictions.filter(function (prediction) {
      return prediction.hasOwnProperty('order');
    }).length < this.predictions.length) {
    for (i = 0, len = this.predictions.length; i < len; i++) {
      this.predictions[i].order = i;
    }
  }
}

MultiVote.prototype.avg = function () {
  /**
   * Average for regression models' predictions
   *
   */
  var i, len, total = this.predictions.length,
    result = 0.0,
    confidence = 0.0;
  if (total < 1) {
    return NaN;
  }
  for (i = 0, len = this.predictions.length; i < len; i++) {
    result += this.predictions[i].prediction;
    confidence += this.predictions[i].confidence;
  }
  return {'prediction': result / total, 'confidence': confidence / total};

};

MultiVote.prototype.combineCategorical = function (weightLabel) {
  /**
   * Returns the prediction combining votes by using the given weight
   *
   * @param {string} weightLabel Type of combination method:
   *        'plurality':   plurality (1 vote per prediction)
   *        'confidence':  confidence weighted (confidence as a vote value)
   *        'probability': probability weighted (probability as a vote value)
   *
   * Will also return the combined confidence, as a weighted average of
   * the confidences of the votes.
   */

  var index, len, prediction, category, tuples, key, distributionInfo,
    count, distribution, combinedConfidence, mode = {}, weight = 1;
  for (index = 0, len = this.predictions.length; index < len; index++) {
    prediction = this.predictions[index];
    if (typeof weightLabel !== 'undefined' && weightLabel !== 'plurality') {
      if (WEIGHT_LABELS.indexOf(weightLabel) === -1) {
        throw new Error('Wrong weightLabel value.');
      }
      if (!prediction.hasOwnProperty(weightLabel)) {
        throw new Error('Not enough data to use the selected prediction' +
                        ' method. Try creating your model anew.');
      }
      weight = prediction[weightLabel];
    }
    category = prediction.prediction;
    if (mode.hasOwnProperty(category)) {
      mode[category] = {'count': mode[category].count +
                        weight,
                        'order': mode[category].order};
    } else {
      mode[category] = {'count': weight,
                        'order': prediction.order};
    }
  }
  tuples = [];
  for (key in mode) {
    if (mode.hasOwnProperty(key)) {
      tuples.push([key, mode[key]]);
    }
  }

  prediction = tuples.sort(function (x, y) {
    var a, b;
    a = x[1].count;
    b = y[1].count;
    return a > b ? -1 : (a < b ? 1 : x[1].order < y[1].order ? -1 : 1);
  })[0][0];

  if (this.predictions[0].hasOwnProperty('confidence')) {
    return this.weightedConfidence(prediction, weightLabel);
  }
  // If prediction had no confidence, compute it from distribution
  distributionInfo = this.combineDistribution(weightLabel);
  count = distributionInfo[1];
  distribution = distributionInfo[0];
  combinedConfidence = utils.wsConfidence(prediction, distribution, count);
  return {'prediction': prediction, 'confidence': combinedConfidence};
};

MultiVote.prototype.weightedConfidence = function (combinedPrediction,
                                                   weightLabel) {
  /**
   * Compute the combined weighted confidence from a list of predictions
   *
   * @param {object} combinedPrediction Prediction object
   * @param {string} weightLabel Label of the value in the prediction object
   *        that will be used to weight confidence
   */
  var index, len, prediction, finalConfidence = 0.0, totalWeight = 0.0,
    weight = 1, predictions = this.predictions.slice();
  predictions = predictions.filter(function (x) {
    return x.prediction == combinedPrediction;
  });
  if (typeof weightLabel !== 'undefined') {
    for (index = 0, len = predictions.length; index < len; index++) {
      prediction = predictions[index];
      if ((typeof weightLabel !== 'string') ||
          !prediction.hasOwnProperty('confidence') ||
          !prediction.hasOwnProperty(weightLabel)) {
        throw new Error('Not enough data to use the selected prediction' +
                        ' method. Lacks ' + weightLabel + ' information');
      }
    }
  }
  for (index = 0, len = predictions.length; index < len; index++) {
    prediction = predictions[index];
    if ((typeof weightLabel) !== 'undefined') {
      weight = prediction[weightLabel];
    }
    finalConfidence += weight * prediction.confidence;
    totalWeight += weight;
  }
  if (totalWeight > 0) {
    finalConfidence = finalConfidence / totalWeight;
  } else {
    finalConfidence = NaN;
  }
  return {'prediction': combinedPrediction, 'confidence': finalConfidence};
};

MultiVote.prototype.combineDistribution = function (weightLabel) {
  /**
   * Builds a distribution based on the predictions of the MultiVote
   *
   * @param {string} weightLabel Label of the value in the prediction object
   *        whose sum will be used as count in the distribution
   */

  var prediction, index, len, distribution = {}, total = 0;
  for (index = 0, len = this.predictions.length; index < len; index++) {
    prediction = this.predictions[index];
    if (!prediction.hasOwnProperty(weightLabel)) {
      throw new Error('Not enough data to use the selected prediction' +
                      ' method. Try creating your model anew.');
    }

    if (!distribution.hasOwnProperty(prediction.prediction)) {
      distribution[prediction.prediction] = 0.0;
    }
    distribution[prediction.prediction] += prediction[weightLabel];
    total += prediction.count;
  }

  return [distribution, total];
};

MultiVote.prototype.probabilityWeight = function () {
  /**
   * Creates a new predictions array based on the training data probability
   */

  var index, len, prediction, total, order, distribution, tuple, instances,
    tupleIndex, predictions = [];
  for (index = 0, len = this.predictions.length; index < len; index++) {
    prediction = this.predictions[index];
    if (!prediction.hasOwnProperty('distribution') ||
        !prediction.hasOwnProperty('count')) {
      throw new Error('Probability weighting is not available because' +
                      ' distribution information is missing.');
    }
    total = prediction.count;
    if (total < 1 || (typeof total !== "number" ||
      parseInt(total, 10) !== total)) {
      throw new Error('Probability weighting is not available because' +
                      ' distribution seems to have ' + total +
                      ' as number of instances in a node');
    }
    order = prediction.order;
    distribution = prediction.distribution;
    for (tupleIndex = 0; tupleIndex < distribution.length; tupleIndex++) {
      tuple = distribution[tupleIndex];
      prediction = tuple[0];
      instances = tuple[1];
      predictions.push({'prediction': prediction,
                        'probability': parseFloat(instances) / total,
                        'count': instances,
                        'order': order});
    }
  }
  return predictions;
};

MultiVote.prototype.singleOutCategory = function (options) {
  /**
   * Singles out the votes for a chosen category and returns a prediction
   * for this category iff the number of votes reaches at least the given
   * threshold.
   *
   * @param {{threshold: integer, category: string}} options 
   *        object structure that contains the number of votes to be reached
   *        and the category to be predicted.
   * @return {[prediction, combinedConfidence]}
   */
  if (typeof options === 'undefined' ||
      !options.hasOwnProperty('threshold') ||
      !options.hasOwnProperty('category')) {
    throw new Error('No category and threshold information was found. Add'
                    + ' threshold and category info. E.g. {threshold: 6'
                    + ', category: \'Iris-virginica\'}.');
  }

  var index, len = this.predictions.length, prediction,
    categoryPredictions = [], restOfPredictions = [];
  if (options.threshold > len) {
    throw new Error('You cannot set a threshold value larger than ' + len +
                    '. The ensemble has not enough models to use this' +
                    ' threshold value.');
  }
  for (index = 0; index < len; index++) {
    prediction = this.predictions[index];
    if (prediction.prediction == options.category) {
      categoryPredictions.push(prediction);
    } else {
      restOfPredictions.push(prediction);
    }
  }
  if (categoryPredictions.length >= options.threshold) {
    return new MultiVote(categoryPredictions);
  }
  return new MultiVote(restOfPredictions);
};

MultiVote.prototype.combine = function (method, options) {
  /**
   * Reduces a number of predictions voting for classification and
   * averaging predictions for regression.
   *
   * @param {0|1|2|3} method Code associated to the voting method (plurality,
   *        confidence weighted, probability weighted or threshold).
   * @param {{threshold: integer, category: string} | undefined} options
   *        additional options if threshold is applied.
   * @return {[prediction, combinedConfidence]}
   */

  if (typeof method === 'undefined') {
    method = PLURALITY;
  }
  // there must be at least one prediction to be combined
  if (this.predictions.length === 0) {
    throw new Error('No predictions to be combined.');
  }

  var keys = WEIGHT_KEYS[method], predictions = this;
  // and all predictions should have the weight-related keys
  if (keys.length > 0) {
    checkKeys(this.predictions, keys);
  }

  if (this.is_regression()) {
    if (method === CONFIDENCE) {
      return this.errorWeighted();
    }
    return this.avg();
  }
  if (method === THRESHOLD) {
    predictions = predictions.singleOutCategory(options);
  } else if (method === PROBABILITY) {
    predictions = new MultiVote(this.probabilityWeight());
  }
  return predictions.combineCategorical(WEIGHT_LABELS[method]);
};

MultiVote.prototype.is_regression = function () {
  /**
   * Check if this is a regression model
   * @return {boolean} True if all the predictions are numbers.
   */
  var index, len, prediction;
  for (index = 0, len = this.predictions.length; index < len; index++) {
    prediction = this.predictions[index];
    if (typeof prediction.prediction !== 'number') {
      return false;
    }
  }
  return true;
};

MultiVote.prototype.errorWeighted = function () {
  /**
   * Returns the prediction combining votes using error to compute weight
   * @return {{'prediction': {string|number}, 'confidence': {number}}} The
   *         combined error is an average of the errors in the MultiVote
   *         predictions.
   */

  checkKeys(this.predictions, ['confidence']);
  var index, len, prediction, combined_error = 0.0, topRange = 10,
    result = 0.0, normalization_factor = this.normalizeError(topRange);
  if (normalization_factor === 0) {
    return {'prediction': NaN, 'confidence': 0};
  }
  for (index = 0, len = this.predictions.length; index < len; index++) {
    prediction = this.predictions[index];
    result += prediction.prediction * prediction.errorWeight;
    combined_error += (prediction.confidence * prediction.errorWeight);
  }
  return {'prediction': result / normalization_factor,
          'confidence': combined_error / normalization_factor};
};

MultiVote.prototype.normalizeError = function (topRange) {
  /**
   * Normalizes error to a [0, top_range] range and builds probabilities
   * @param {number} The top range of error to which the original error is 
   *        normalized.
   * @return {number} The normalization factor as the sum of the normalized
   *         error weights.
   */

  var  error, index, len, errorRange, prediction, delta, maxError = -Infinity,
    minError = Infinity, normalizeFactor = 0;
  for (index = 0, len = this.predictions.length; index < len; index++) {
    prediction = this.predictions[index];
    if (!prediction.hasOwnProperty('confidence')) {
      throw new Error('Not enough data to use the selected prediction method.');
    }
    error = prediction.confidence;
    maxError = Math.max(error, maxError);
    minError = Math.min(error, minError);
  }
  errorRange = parseFloat(maxError - minError);
  normalizeFactor = 0;
  if (errorRange > 0) {
    /* Shifts and scales predictions errors to [0, top_range].
     * Then builds e^-[scaled error] and returns the normalization
     * factor to fit them between [0, 1]
     */
    for (index = 0, len = this.predictions.length; index < len; index++) {
      prediction = this.predictions[index];
      delta = (minError - prediction.confidence);
      this.predictions[index].errorWeight = Math.exp(delta / errorRange *
                                                     topRange);
      normalizeFactor += this.predictions[index].errorWeight;
    }
  } else {
    for (index = 0, len = this.predictions.length; index < len; index++) {
      prediction = this.predictions[index];
      this.predictions[index].errorWeight = 1;
    }
    normalizeFactor = this.predictions.length;
  }
  return normalizeFactor;
};

if (NODEJS) {
  module.exports = MultiVote;
} else {
  exports = MultiVote;
}
