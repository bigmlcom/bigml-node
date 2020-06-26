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

/**
/ Auxiliary functions for preprocessing
 */

"use strict";

var NODEJS = ((typeof process !== 'undefined') && process &&
  process.RUNNING_IN_NODEJS === 'true');
var PATH = (NODEJS) ? "./" : "";

var constants = require(PATH + 'constants');
var math = require('mathjs');


// End of imports section --- DO NOT REMOVE

var MEAN = "mean";
var STANDARD_DEVIATION = "stdev";

var ZERO = "zero_value";
var ONE = "one_value";


var pp = {

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
    var index, validPairs, outvec, i, len, v, is = [], js = [],
    idxs = [];
    for (i = 0, len = vector.length; i < len; i++) {
      v = vector[i];
      index = possibleValues.indexOf(v[0]);
      idxs.push([i, index]);
    }
    validPairs = idxs.filter(function(x) {return typeof x[1] !== 'undefined';});
    outvec = math.zeros([idxs.length,
                         possibleValues.length]);
    for (i = 0, len = validPairs.length; i < len; i++) {
      v = validPairs[i];
      outvec[v[0]][v[1]] = 1;
    }
    return outvec;
  },

  standardize: function(vector, stats) {
    var newVec = [], mn = stats[0], stdev = stats[1], component, index, len;
    for (index = 0, len = vector.length; index < len; index++) {
      component = vector[index];
      if (typeof component === 'undefined') {
        newVec.push(0.0);
      } else {
        component = component - mn;
        if (stdev > 0) {
          component  = component / stdev;
        }
        newVec.push(component);
      }
    }
    return newVec;
  },

  binarize: function(vector, zeroOne) {
    var zero = zeroOne[0], one = zeroOne[1], index, len, value;
    for (index = 0, len = vector.length; index < len; index++) {
      value = vector[index];
      if (one == 0.0) {
        if (value == one) {
          vector[index] = 1.0;
        }
        if (value != one && value == 0.0) {
          vector[ìndex] = 0.0;
        }
      } else {
        if (value != one) {
          vector[index] = 0.0;
        } else {
          vector[index] = 1.0;
        }
      }
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
    var vtype = spec.type, stats, output, lowHigh;
    if (vtype == constants.NUMERIC) {
      if (spec.hasOwnProperty(STANDARD_DEVIATION)) {
        // array of mean and stdev
        stats = pp.moments(spec);
        output = pp.standardize(vector, stats);
      } else if (spec.hasOwnProperty(ZERO)) {
        lowHigh = pp.bounds(spec);
        output = pp.binarize(vector, lowHigh);
      } else {
        throw new Error(JSON.scriptify(spec) + ' is not a valid numeric spec');
      }
    } else if (vtype == constants.CATEGORICAL) {
      output = pp.oneHot(vector, spec['values'])[0];
    } else {
      throw new Error(vtype + " is not a valid spec type!");
    }

    return output;
  },

  treePredict: function (tree, point) {
    var node = JSON.parse(JSON.stringify(tree)), last = node.length - 1;
    while (typeof node[last] !== 'undefined' && node[last] != null) {
      if (point[node[0]] <= node[1]) {
        node = node[2];
      } else {
        node = node[3];
      }
    }
    return node[0];
  },

  getEmbedding(X, model) {
    var preds, tree, index, len, treePreds = [], norm, index2, len2,
      newPreds = [], pred, row;
    if (model.constructor === Array) {
      for (index = 0, len = model.length; index < len; index++) {
        tree = model[index];
        treePreds = [];
        for (index2 = 0, len2 = X.length; index2 < len2; index2++) {
          row = X[index2];
          treePreds.push(pp.treePredict(tree, row));
        }
        if (typeof preds === 'undefined') {
          preds = pp.npAsArray(treePreds)[0];
        } else {
          for (index2 = 0, len2 = preds.length; index2 < len2; index2++) {
            preds[index2] += pp.npAsArray(treePreds)[0][index2];
          }
        }
      }

      if (typeof preds !== 'undefined' && preds.length > 1) {
        norm = preds.reduce(function(a, b) { return a + b; }, 0.0);
      } else {
        norm = model.length * 1.0;
      }
      for (index2 = 0, len2 = preds.length; index2 < len2; index2++) {
        preds[index2] /= norm;
      }
      return [preds];
    } else {
      throw new Error("Model is unknown type!");
    }
  },

  treeTransform(X, trees) {
    var outdata, featureRange, model, index, len, modelInfo, inputs,
      outarray, sIdx, eIdx, index2, len2, row;
    for (index = 0, len = trees.length; index < len; index++) {
      modelInfo = trees[index];
      featureRange = modelInfo[0];
      model = modelInfo[1];
      sIdx = featureRange[0];
      eIdx = featureRange[1];
      inputs = JSON.parse(JSON.stringify(X));
      for (index2 = 0, len2 = inputs.length; index2 < len2; index2++) {
        row = inputs[index2];
        inputs[index2] = row.slice(sIdx, eIdx);
      }
      outarray = pp.getEmbedding(inputs, model);
      if (typeof outdata !== 'undefined') {
        outdata = pp.npC(outdata, outarray[0]);
      } else {
        outdata = outarray;
      }
    }
    return pp.npC(outdata, X[0]);
  },

  preprocess: function (columns, specs) {
    var outdata, outarray, spec, index, len, column;
    for (index = 0, len = specs.length; index < len; index++) {
      spec = specs[index];
      column = [columns[spec['index']]];
      if (spec.type == constants.NUMERIC) {
        column = pp.npAsArray(column);
      }
      outarray = pp.transform(column, spec);
      if (typeof outdata !== 'undefined') {
        outdata = pp.npC(outdata, outarray);
      } else {
        outdata = [outarray];
      }
    }
    return outdata;
  }};


if (NODEJS) {
  module.exports = pp;
} else {
  exports = pp;
}
