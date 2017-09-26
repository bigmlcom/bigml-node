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

/**
/ Auxiliary functions for preprocessing
 */

"use strict";

var NODEJS = ((typeof module !== 'undefined') && module.exports);
var PATH = (NODEJS) ? "./" : "";

var constants = require(PATH + 'constants');
var nj = require('numjs');

var MEAN = "mean";
var STANDARD_DEVIATION = "stdev";

var ZERO = "zero_value";
var ONE = "one_value";


exports = {

  npC: function (arrayA, arrayC) {
    var newArray = [];
    if ([null, []].indexOf(arrayA) > -1 || typeof arrayA === 'undefined') {
      return [arrayC];
    }
    newArray = JSON.parse(JSON.stringify(arrayA));
    newArray[0] = newArray[0].concat(arrayC);
    return newArray;
  },

  npAsArray: function(array) {
    var newArray = [], index, len, item;
    for (index = 0, len = array.length; index < len; index++) {
      item = array[index];
      if (typeof index === 'string') {
        item = parseFloat(item);
      }
      newArray.push(item);
    }
    return newArray;
  },

  index: function (aList, value) {
    var pos;
    pos = aList.indexOf(value);
    if (pos < 0) {
      return null
    }
    return pos;
  },

  oneHot: function(vector, possibleValues) {
    var idxs, validPairs, outvec, indices, i, len, v, is = [], js = [];
    idxs = [];
    for (v in vector) {
      indices = exports.indexOf(possibleValues, v);
    }
    for (i = 0, len = indices.length; i < len; i++) {
      idxs.push([i, indices[i]]);
    }
    validPairs = idxs.filter(function(x) {return typeof x[1] !== 'undefined';});
    outvec = nj.zeros([idxs.length,
                       possibleValues.length], dtype='float64');
    for (v in validPairs){
      outvec[v[0]][v[1]] = 1;
    }
    return outvec;
  },

  standardize: function(vector, stats) {
    var newVec = [], mn = stats[0], stdev = stats[1], component, index, len;
    for (index = 0, len = vector.length; index < len; index++) {
      component = vector[index];
      component = component - mn;
      if (stdev > 0) {
        component  = component / stdev;
      }
      newVec.push(component);
    }
    return newVec;
  },

  binarize: function(vector, zeroOne) {
    var zero = zeroOne[0], one = zeroOne[1];
    if (one == 0.0) {
      vector[vector == one] = 1.0;
      vector[(vector != one) && (vector != 1.0)] = 0.0;
    } else {
      vector[vector != one] = 0.0;
      vector[vector == one] = 1.0;
    }
    return vector;
  },

  moments:  function (aMap) {
    return [aMap[MEAN], aMap[STANDARD_DEVIATION]];
  },

  bounds:  function (aMap) {
    return [aMap[ZERO], aMap[ONE]];
  },

  transform: function (vector, spec) {
    var vtype = spec.type, stats, output;
    if (vtype == constants.NUMERIC) {
      if (spec.hasOwnProperty(STANDARD_DEVIATION)) {
        // array of mean and stdev
        stats = exports.moments(spec);
        output = exports.standardize(vector, stats);
      } else if (spec.hasOwnProperty(ZERO)) {
        lowHigh = exports.bounds(spec);
        output = exports.binarize(vector, lowHigh);
      } else {
        throw new Error(JSON.scriptify(spec) + ' is not a valid numeric spec');
      }
    } else if (vtype == constants.CATEGORICAL) {
      output = oneHot(vector, spec['values'])[0];
    } else {
      throw new Error(vtype + " is not a valid spec type!");
    }
      return output;
  },

  preprocess: function (columns, specs) {
    var outdata, outarray, spec, index, len, column;
    for (index = 0, len = specs.length; index < len; index++) {
      spec = specs[index];
      column = [columns[spec['index']]];
      if (spec.type == constants.NUMERIC) {
        column = exports.npAsArray(column);
      }
      outarray = exports.transform(column, spec);
      if (typeof outdata !== 'undefined') {
        outdata = exports.npC(outdata, outarray);
      } else {
        outdata = [outarray];
      }
    }
    return outdata;
  }};


if (NODEJS) {
  module.exports = exports;
}
