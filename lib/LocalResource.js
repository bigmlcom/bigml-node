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

var NODEJS = ((typeof module !== 'undefined') && module.exports);
var PATH = NODEJS ? "./" : "";
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');


sharedProtos = {
  predictOperatingModel: function (
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
      prediction, predictions, position, index, sortFn, self=this;

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
                                MODEL_OPERATING_KINDS,
                                this.classNames);
      positiveClass = operatingPoint.positiveClass;
      kind = operatingPoint.kind;
      predictMethod = "predict" + kind.charAt(0).toUpperCase() + kind.slice(1)
      threshold = operatingPoint.threshold;
      issuePrediction = function(error, predictions) {
        position = self.classNames.indexOf(positiveClass);
        if (predictions[position][kind] < threshold) {
          // if the threshold is not met, the alternative class with
          // highest probability or confidence is returned
          sortFn = function (a, b) {
            return b[kind] - a[kind];}
          predictions.sort(sortFn);
          prediction = (predictions[0]["prediction"] == positiveClass) ? predictions[1] : predictions[0];
        } else {
          prediction = predictions[position];
        }
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
                               this[predictMethod](inputData, missingStrategy));
      }

    } else {
      this.on('ready',
              function (self) {return self.predictOperating(inputData,
                                                            missingStrategy,
                                                            operatingPoint,
                                                            cb); });
      return;
    }
  }
};

if (NODEJS) {
  module.exports = sharedProtos;
}
