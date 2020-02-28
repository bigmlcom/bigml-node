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
var PATH = NODEJS ? "./" : "";
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');


// End of imports section --- DO NOT REMOVE

var DEFAULT_OP_KIND = "probability";

var sharedProtos = {
  sortBy: function(property) {
    /**
     * For classification models, function that sorts the possible predictions
     * according to one of their properties. Tie break is done using the
     * objective field summary
     *
     * @param {string} property Property of the predictions to use as sort
     *                          criteria.
     */
    var self = this;
    return function (a, b) {
      var index = 0,
        summary = self.fields[self.objectiveField].summary.categories,
        len = summary.length,
        categories = [];
      for (index = 0; index < len; index++) {
        categories.push(summary[index][0]);
      }
      if (a[property] == b[property]) {
        return utils.sortCategory(a, b, categories);
      }
      return b[property] - a[property];}
  },

  predictOperating: function (
    inputData, missingStrategy, operatingPoint, cb) {
    /**
     * For classification models, predicts using the operation point
     *    defined by a positive class and some threshold and
     *    based on input values.  The input
     *    fields must be a dictionary keyed by field name or field ID.
     *
     *    For regressions, the output is a single element list
     *    containing the prediction.
     *
     * @param {object} inputData Input data to predict
     * @param {{0|1}]} missingStrategy Strategy for missing values
     * @param {object} operatingPoint Operating point definition. The object
     *                                should contain a positiveClass and
     *                                either a probabilityThreshold,
     *                                confidenceThreshold or a
     *                                kThreshold
     * @param {function} cb Callback
     */

    var positiveClass, kind, threshold, predictMethod, issuePrediction,
      prediction, predictions, position, index, self = this;

    if ((typeof missingStrategy === 'function') && (typeof cb === 'undefined')) {
      cb = missingStrategy;
      missingStrategy = constants.LAST_PREDICTION;
    }
    if ((typeof operatingPoint === 'function') && (typeof cb === 'undefined')) {
      cb = operatingPoint;
    }

    if (this.ready) {
      missingStrategy = missingStrategy || constants.LAST_PREDICTION;
      utils.checkOperatingPoint(operatingPoint,
                                this.opKinds,
                                this.classNames);
      positiveClass = operatingPoint.positiveClass;
      kind = operatingPoint.kind;
      predictMethod = "predict" + kind.charAt(0).toUpperCase() + kind.slice(1)
      threshold = operatingPoint.threshold;
      issuePrediction = function(error, predictions) {
        var distribution = JSON.parse(JSON.stringify(predictions));
        position = self.classNames.indexOf(positiveClass);
        if (predictions[position][kind] > threshold) {
          prediction = predictions[position];
        } else {
          // If threshold is not met,
          // the class with the
          // highest probability, confidence or votes is returned
          predictions.sort(self.sortBy(kind));
          prediction = ((predictions[0]["category"] == positiveClass) ?
            predictions[1] : predictions[0]);
        }
        prediction = JSON.parse(JSON.stringify(prediction));
        prediction.prediction = prediction.category;
        delete prediction["category"];
        prediction["distribution"] = distribution;
        if (cb) {
          cb(null, prediction);
        } else {
          return prediction;
        }
      }
      if (cb) {
        this[predictMethod](inputData, missingStrategy, issuePrediction);
      } else {
        return issuePrediction(null,
                               self[predictMethod](inputData, missingStrategy));
      }

    } else {
      this.on('ready',
              function (self) {return self.predictOperating(inputData,
                                                            missingStrategy,
                                                            operatingPoint,
                                                            cb); });
      return;
    }
  },

 predictOperatingKind: function (
    inputData, missingStrategy, operatingKind, cb) {
    /**
     * For classification models, predicts using the operation kind, i.e
     * confidence or probability.  The input
     * fields must be a dictionary keyed by field name or field ID.
     *
     *    For regressions, the output is a single element list
     *    containing the prediction.
     *
     * @param {object} inputData Input data to predict
     * @param {{0|1}]} missingStrategy Strategy for missing values
     * @param {string} operatingKind Operating kind definition (confidence or
     *                               probability).
     * @param {function} cb Callback
     */

    var kind, predictMethod, issuePrediction,
      prediction, predictions, position, index, self = this;

    if ((typeof missingStrategy === 'function') && (typeof cb === 'undefined')) {
      cb = missingStrategy;
      missingStrategy = constants.LAST_PREDICTION;
    }
    if ((typeof operatingKind === 'function') && (typeof cb === 'undefined')) {
      cb = operatingKind;
    }

    if (this.ready) {
      missingStrategy = missingStrategy || constants.LAST_PREDICTION;
      kind = operatingKind || DEFAULT_OP_KIND;
      kind = kind.toLowerCase();
      if (this.opKinds.indexOf(kind) < 0) {
        throw new Error("Allowed operating kinds are " +
                        this.opKinds.join(", ") +
                        ". " + opKind +" found.");
      }
      if (kind !== "probability" && typeof this.boosting !== 'undefined'
          && this.boosting) {
        throw new Error("Boosted ensembles only allow probability as " +
                        " operating kind.");
      }
      predictMethod = "predict" + kind.charAt(0).toUpperCase() + kind.slice(1)
      issuePrediction = function(error, predictions) {
        var distribution = JSON.parse(JSON.stringify(predictions));
        if (self.isRegression) {
          prediction = {"prediction": predictions.prediction,
                        "confidence": predictions.confidence};
        } else {
          // For classifications, the class with the
          // highest probability, confidence or votes is returned
          predictions.sort(self.sortBy(kind));
          prediction = predictions[0];
          prediction = JSON.parse(JSON.stringify(prediction));
          prediction.prediction = prediction.category;
          delete prediction["category"];
          prediction["distribution"] = distribution;
        }
        if (cb) {
          cb(null, prediction);
        } else {
          return prediction;
        }};

      if (cb) {
        this[predictMethod](inputData, missingStrategy, issuePrediction);
      } else {
        return issuePrediction(null,
                               self[predictMethod](inputData, missingStrategy));
      }

    } else {
      this.on('ready',
              function (self) {return self.predictOperatingKind(inputData,
                                                                missingStrategy,
                                                                operatingKind,
                                                                cb); });
      return;
    }
  }
};


if (NODEJS) {
  module.exports = sharedProtos;
} else {
  exports = sharedProtos;
}
