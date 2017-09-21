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
var nj = require('numjs');

exports = {
  broadcast: function (fn) {
    var broadcaster = function (xs) {
      var result = [], index, len;
      if (xs.length == 0) {
        return result;
      }
      else if (xs[0].constructor === Array) {
        result = [];
        for (index = 0, len = xs.length; index < len; index++) {
          result.push(fn(xs[index]));
        }
        return result;
      } else {
        return fn(xs);
      }
    };
    return broadcaster;
  },

  plus: function (mat, vec) {
    var newMat = [], newRow = [];
    for (row in mat) {
      newRow = [];
      for (index = 0, len = row.length; index < len; index++) {
        newRow.push(row[index] + vec[index]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  minus: function (mat, vec) {
    var newMat = [], newRow = [];
    for (row in mat) {
      newRow = [];
      for (index = 0, len = row.length; index < len; index++) {
        newRow.push(row[index] - vec[index]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  times: function (mat, vec) {
    var newMat = [], newRow = [];
    for (row in mat) {
      newRow = [];
      for (index = 0, len = row.length; index < len; index++) {
        newRow.push(row[index] * vec[index]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  divide: function (mat, vec) {
    var newMat = [], newRow = [];
    for (row in mat) {
      newRow = [];
      for (index = 0, len = row.length; index < len; index++) {
        newRow.push(row[index] / vec[index]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  sigmoid: function(mat) {
    return nj.sigmoid(mat);
  },

  dot: function(mat1, mat2) {
    return nj.dot(mat1, mat2);
  },

  batchNorm: function(X, mean, stdev, shift, scale) {
    normVals = divide(minus(X, mean), stdev);
    return plus(times(normVals, scale), shift);
  },

  softplus: function(xs) {
    var newXs = [];
    for (x in xs) {
      if (x < c.LARGE_EXP) {
        newXs.push(Math.log(Math.exp(x) + 1));
      } else {
        newXs.push(x);
      }
    }
    return newXs;
  },

  softmax: function(xs) {
    return nj.softmax(xs);
  }
}


var ACTIVATORS = {
  'tanh': exports.broadcast(function (xs) {
    var x, newXs = [];
    for (x in xs) {
      newXs.push(Math.tanh(x));
    }
    return newXs;
  }),
  'sigmoid': exports.broadcast(exports.sigmoid),
  'softplus': exports.broadcast(exports.softplus),
  'ReLU': exports.broadcast(function(xs) {
    var x, newXs = [];
    for (x in xs) {
      if (x <= 0) {
        x = 0;
      }
      newXs.push(x);
    }
    return newXs;
  }),
  'softmax': exports.broadcast(exports.softmax),
  'identity': exports.broadcast(function(xs) {
      var x, newXs = [];
      for (x in xs) {
        newXs.push(1.0 * x);
      }
      return newXs;
    })};


exports.initLayers = function (layers) {
    // check whether we need to parse it
    return layers;
  };


exports.destandardize = function (vec, vStats) {
  // vStats constains vMean, vStdev
    var newVec = [];
    for (v in vec) {
      newVec.push(v[0] * vStats[1] + vStats[0]);
    }
    return newVec;
  };


exports.toWidth = function (mat, width) {
    var output = [], len;
    for (row in mat) {
      len = row.length;
      for (index = 0; index < width; index++) {
        newRow.push(row[index % len]);
      }
      output.push(newRow);
    }};


exports.addResiduals = function (residuals, identities) {
    var toAdd = exports.toWidth(identities, residuals[0].length),
      newResiduals = [], index, len, newRow;
    if (toAdd[0].length != residuals[0].length) {
      throw new Error("Residuals.");
    }
    for (vrow in toAdd) {
      for (rrow in residuals) {
        newRow = [];
        for (index = 0, len = rrow.length; index < len; index++) {
          newRow.push(rrow[index] + vrrow[index]);
        }
        newResiduals.push(newRow);
      }
    }};


exports.propagate = function (xIn, layers) {
    var lastX = xIn, identities = xIn, w, m, s, b, g, afn;
    for (layer in layers) {
      w = layer.weights;
      m = layer.mean;
      s = layer.stdev;
      b = layer.offset;
      g = layer.scale;

      afn = layer['activation_function'];
      xDotw = exports.dot(lastX, w);
      if (typeof m !== 'undefined' && typeof s !== 'undefined') {
        nextIn = exports.batchNorm(xDotw, m, s, b, g)
      } else {
        nextIn = exports.plus(xDotw, b);
      }

      if (layer.residuals) {
        nextIn = addResiduals(nextIn, identities);
        lastX = ACTIVATORS[afn](nextIn);
        identities = lastX;
      } else {
        lastX = ACTIVATORS[afn](nextIn);
      }
    }
    return lastX;
  };


if (NODEJS) {
  module.exports = exports;
}
