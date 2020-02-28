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
var NODEJS = ((typeof process !== 'undefined') && process &&
  process.RUNNING_IN_NODEJS === 'true');
var PATH = (NODEJS) ? "./" : "";

var utils = require(PATH + 'utils');


// End of imports section --- DO NOT REMOVE

function cosineDistance2(terms, centroidTerms, scale) {
  /**
   * Returns the square of the distance defined by cosine similarity
   *
   * @param {array} terms Array of input terms
   * @param {array} centroidTerms Array of terms used in the centroid field
   * @param {number} scale Scaling factor for the field
   */

  var inputCount = 0, term, cosineSimilarity, similarityDistance, i,
    centroidTermsLength = centroidTerms.length;

  // Centroid values for the field can be an empty list.
  // Then the distance for an empty input is 1
  // (before applying the scale factor).
  if (terms.length === 0 && centroidTermsLength === 0) {
    return 0;
  }
  if (terms.length === 0 || centroidTermsLength === 0) {
    return Math.pow(scale, 2);
  }

  for (i = 0; i < centroidTermsLength; i++) {
    term = centroidTerms[i];
    if (terms.indexOf(term) > -1) {
      inputCount += 1;
    }
  }
  cosineSimilarity = (inputCount /
                      Math.sqrt(terms.length * centroidTermsLength));
  similarityDistance = scale * (1 - cosineSimilarity);
  return Math.pow(similarityDistance, 2);
}


/**
 * LocalCentroid
 * @constructor
 */
function LocalCentroid(centroidInfo) {
  /**
   * Local centroid object that encapsulates the remote centroid info
   * @param {object} centroidInfo Object derived from the remote centroid
   *                              info
   */
  this.center = centroidInfo.center;
  this.count = centroidInfo.count;
  this.centroidId = centroidInfo.id;
  this.name = centroidInfo.name;
}

LocalCentroid.prototype.distance2 = function (inputData, termSets,
                                             scales, stopDistance2) {
  /**
   * Squared distance from the given input data to the centroid
   *
   * @param {object} inputData Object describing the numerical or categorical
   *                           input data per field
   * @param {object} termSets Object containing the array of unique terms per
   *                          field
   * @param {object} scales Object containing the scaling factor per field
   * @param {number} stopDistance2 Maximum allowed distance. If reached,
   *                               the algorithm stops computing the actual
   *                               squared distance
   */

  var distance2 = 0.0, fieldId, value, valueType, terms;
  for (fieldId in this.center) {
    if (this.center.hasOwnProperty(fieldId)) {
      value = this.center[fieldId];
      valueType = typeof value;
      if (utils.isArray(value)) {
        // text field
        if (termSets.hasOwnProperty(fieldId)) {
          terms = termSets[fieldId];
        } else {
          terms = [];
        }
        distance2 += cosineDistance2(terms, value, scales[fieldId]);
      } else {
        switch (valueType) {
        case 'string':
          if (!inputData.hasOwnProperty(fieldId) ||
              inputData[fieldId] !== value) {
            distance2 += Math.pow(scales[fieldId], 2);
          }
          break;
        default:
          distance2 += Math.pow((inputData[fieldId] - value) *
                                scales[fieldId], 2);
        }
      }
      if (typeof stopDistance2 !== 'undefined' && distance2 >= stopDistance2) {
        break;
      }
    }
  }
  return distance2;
};

if (NODEJS) {
  module.exports = LocalCentroid;
} else {
  exports = LocalCentroid;
}
