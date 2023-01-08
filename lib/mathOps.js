/**
 * Copyright 2017-2023 BigML
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
var EXT_PATH = ((typeof window !== 'undefined') &&
                (typeof window.PATH !== 'undefined')) ? window.PATH : ""
var PATH = (NODEJS) ? "./" : EXT_PATH;

var constants = require(PATH + 'constants');
var math = require(EXT_PATH + 'mathjs');


// End of imports section --- DO NOT REMOVE

var net = {
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
    var newMat = [], newRow = [], row, index1, len1, index2, len2;
    for (index1 = 0, len1 = mat.length; index1 < len1; index1++) {
      row = mat[index1];
      newRow = [];
      for (index2 = 0, len2 = row.length; index2 < len2; index2++) {
        newRow.push(row[index2] + vec[index2]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  minus: function (mat, vec) {
    var newMat = [], newRow = [], row, index1, len1, index2, len2;
    for (index1 = 0, len1 = mat.length; index1 < len1; index1++) {
      row = mat[index1];
      newRow = [];
      for (index2 = 0, len2 = row.length; index2 < len2; index2++) {
        newRow.push(row[index2] - vec[index2]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  times: function (mat, vec) {
    var newMat = [], newRow = [], row, index1, len1, index2, len2;
    for (index1 = 0, len1 = mat.length; index1 < len1; index1++) {
      row = mat[index1];
      newRow = [];
      for (index2 = 0, len2 = row.length; index2 < len2; index2++) {
        newRow.push(row[index2] * vec[index2]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  divide: function (mat, vec) {
    var newMat = [], newRow = [], row, index1, len1, index2, len2;
    for (index1 = 0, len1 = mat.length; index1 < len1; index1++) {
      row = mat[index1];
      newRow = [];
      for (index2 = 0, len2 = row.length; index2 < len2; index2++) {
        newRow.push(row[index2] / vec[index2]);
      }
      newMat.push(newRow);
    }
    return newMat;
  },

  sigmoid: function(z){
    var bottom = math.add(1, math.exp(math.multiply(-1, z)));
    return math.dotDivide(1, bottom);
  },

  dot: function(mat1, mat2) {
    var index1, len1, index2, len2, output = [], row1, row2, newRow;
    for (index1 = 0, len1 = mat1.length; index1 < len1; index1++) {
      row1 = mat1[index1];
      newRow = [];
      for (index2 = 0, len2 = mat2.length; index2 < len2; index2++) {
        row2 = mat2[index2];
        newRow = newRow.concat(math.dot(row1, row2));
      }
      output.push(newRow);
    }
    return output;
  },

  ntimes: function(xs, number) {
    var newXs = [], index, len, x;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      newXs.push(number * x);
    }
    return newXs;

  },

  batchNorm: function(X, mean, stdev, offset, scale) {
    var normVals = net.divide(net.minus(X, mean), stdev);
    return net.plus(net.times(normVals, scale), offset);
  },

  softplus: function(xs) {
    var newXs = [], index, len, x;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      if (x < constants.LARGE_EXP) {
        newXs.push(Math.log(Math.exp(x) + 1));
      } else {
        newXs.push(x);
      }
    }
    return newXs;
  },

  softmax: function(arr) {
    return arr.map(function(value, index) {
      return Math.exp(value) / arr.map( function(y){
       return Math.exp(y) } ).reduce( function(a,b){ return a + b })
    });
  },

  identity: function(xs) {
    return net.ntimes(xs, 1.0);
  },

  relu: function(xs) {
    var x, newXs = [], index, len;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      if (x <= 0) {
        x = 0;
      }
      newXs.push(x);
    }
    return newXs;
  },

  swish: function(xs) {
    var x, newXs = [], index, len;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      if (x > 0) {
        if (x < constants.LARGE_EXP) {
          x = (x * Math.exp(x)) / (Math.exp(x) + 1);
        }
      } else {
        if (-x < constants.LARGE_EXP) {
          x = x / (1 + Math.exp(-x));
        } else {
          x = 0;
        }
      }
      newXs.push(x);
    }
    return newXs;
  },

  mish: function(xs) {
    return net.tanh(net.softplus(xs));
  },

  tanh: function (xs) {
    var x, newXs = [], index, len;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      newXs.push(Math.tanh(x));
    }
    return newXs;
  },

  min: function(xs, val) {
    var x, newXs = [], index, len;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      newXs.push(Math.min(x, val));
    }
    return newXs;
  },

  relu6: function(xs) {
    return net.min(net.relu(xs), 6);
  },

  leaky_relu: function(xs) {
    var x, newXs = [], index, len, result;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      x = (x <= 0) ? x * constants.LEAKY_RELU_CONST : x
      newXs.push(x);
    }
    return newXs;
  },

  selu: function(xs) {
    var x, newXs = [], index, len, result;
    for (index = 0, len = xs.length; index < len; index++) {
      x = xs[index];
      result = (x > 0) ? constants.LAMBDA * x :
        constants.LAMBDA * constants.ALPHA * (Math.exp(x) - 1)
      newXs.push(result);
    }
    return newXs;
  }
}


var ACTIVATORS = {
  'tanh': net.broadcast(net.tanh),
  'sigmoid': net.broadcast(net.sigmoid),
  'softplus': net.broadcast(net.softplus),
  'relu': net.broadcast(net.relu),
  'softmax': net.broadcast(net.softmax),
  'identity': net.broadcast(net.identity),
  'linear': net.broadcast(net.identity),
  'swish': net.broadcast(net.swish),
  'mish': net.broadcast(net.mish),
  'relu6': net.broadcast(net.relu6),
  'leaky_relu': net.broadcast(net.leaky_relu),
  'selu': net.broadcast(net.selu)
  };


net.initLayers = function (layers) {
  // check whether we need to parse it
  return layers;
};


net.destandardize = function (vec, vStats) {
  // vStats constains vMean, vStdev
  var newVec = [], v, index, len;
  for (index = 0, len = vec.length; index < len; index++) {
    v = vec[index];
    newVec.push(v[0] * vStats[1] + vStats[0]);
  }
  return newVec;
};


net.toWidth = function (mat, width) {
  var output = [], index2, index1, len1, row, newRow = [], ntiles;
  if (width > mat[0].length) {
    ntiles = Math.round(Math.ceil(width / (0.0 + mat[0].length)));
  } else {
    ntiles = 1;
  }
  for (index1 = 0, len1 = mat.length; index1 < len1; index1++) {
    row = mat[index1];
    for (index2 = 0; index2 < ntiles; index2++) {
      newRow = newRow.concat(row);
    }
    newRow = newRow.slice(0, width);
    output.push(newRow);
  }
  return output;
};


net.addResiduals = function (residuals, identities) {
  var toAdd = net.toWidth(identities, residuals[0].length),
    newResiduals = [], index, len, newRow, index1, len1, index2, len2, vrow,
    rrow, r, v;
  if (toAdd[0].length != residuals[0].length) {
    throw new Error("Residuals.");
  }
  for (index1 = 0, len1 = toAdd.length; index1 < len1; index1++) {
    vrow = toAdd[index1];
    rrow = residuals[index1];
    newRow = [];
    for (index2 = 0, len2 = rrow.length; index2 < len2; index2++) {
      r = rrow[index2];
      v = vrow[index2];
      newRow.push(r + v);
    }
    newResiduals.push(newRow);
  }
  return newResiduals;
};


net.propagate = function (xIn, layers) {
  var lastX = xIn, identities = xIn, w, m, s, b, g, afn, index, len, layer,
    xDotw, nextIn;
  for (index = 0, len = layers.length; index < len; index++) {
    layer = layers[index];
    w = layer.weights;
    m = layer.mean;
    s = layer.stdev;
    b = layer.offset;
    g = layer.scale;

    afn = layer['activation_function'];
    xDotw = net.dot(lastX, w);

    if (typeof m !== 'undefined' && m !== null  &&
        typeof s !== 'undefined' && s !== null) {
      nextIn = net.batchNorm(xDotw, m, s, b, g)
    } else {
      nextIn = net.plus(xDotw, b);
    }
    if (layer.residuals) {
      nextIn = net.addResiduals(nextIn, identities);
      lastX = ACTIVATORS[afn](nextIn);
      identities = lastX;
    } else {
      lastX = ACTIVATORS[afn](nextIn);
    }
  }
  return lastX;
};

net.sumAndNormalize = function(youts, isRegression) {
  var ysums = [], outDist = [], index, row, len, sumRow, index2, len2,
      isRegression, ysum, rowSum, index3, len3, newRow, yout, sum, norm;
  if (isRegression) {
    norm = youts.length;
    ysum = 0;
    for (index = 0, len = norm; index < len; index++) {
      ysum += youts[index];
    }
    return ysum / (0.0 + norm);
  } else {
    for (index = 0, len = youts[0].length; index < len; index++) {
      sumRow = [];
      row = youts[0][index];
      for (index2 = 0, len2 = row.length; index2 < len2; index2++) {
        sum = 0.0;
        for (index3 = 0, len3 = youts.length; index3 < len3; index3++) {
          yout = youts[index3];
          sum += yout[index][index2];
        }
        sumRow.push(sum);
      }
      ysums.push(sumRow);
    }

    for (index = 0, len = ysums.length; index < len; index++) {
      ysum = ysums[index];
      rowSum = ysum.reduce(function(a, b) { return a + b; }, 0.0);
      for (index2 = 0, len2 = ysum.length; index2 < len2; index2++) {
        ysum[index2] /= rowSum;
      }
      outDist.push(ysum);
    }
  }
  return outDist;
}


if (NODEJS) {
  module.exports = net;
} else {
  exports = net;
}
