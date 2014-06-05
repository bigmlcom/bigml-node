/**
 * Copyright 2014 BigML
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
var utils = require('./utils');


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

LocalCentroid.prototype.distance = function (inputData, termSets,
                                             scales, stopDistance) {
  /**
   * Distance from the given input data to the centroid
   *
   * @param {object} inputData Object describing the numerical or categorical
   *                           input data per field
   * @param {object} termSets Object containing the array of unque terms per
   *                          field
   * @param {object} scales Object containing the scaling factor per field
   * @param {number} stopDistance Maximum allowed distances. If reached, 
   *                              the algorithm stops computing the actual
   *                              distance
   */

  var distance = 0.0, fieldId, value, valueType;
  for (fieldId in this.center) {
    if (this.center.hasOwnProperty(fieldId)) {
      value = this.center[fieldId];
      valueType = typeof value;
      if (utils.isArray(value)) {
        // text field
        distance += cosineDistance2(termSets[fieldId], value,
                                    scales[fieldId]);
      } else {
        switch (valueType) {
        case 'string':
          if (!inputData.hasOwnProperty(fieldId) ||
              inputData[fieldId] !== value) {
            distance += Math.pow(scales[fieldId], 2);
          }
          break;
        default:
          distance += Math.pow((inputData[fieldId] - value) *
                               scales[fieldId], 2);
        }
      }
      if (typeof stopDistance !== 'undefined' && distance >= stopDistance) {
        break;
      }
    }
  }
  return distance;
};

module.exports = LocalCentroid;
