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
 * Auxiliary functions to compute time-series forecasts
 * following the formulae in
 * https://www.otexts.org/sites/default/files/fpp/images/Table7-8.png
 * as explained in
 * https://www.otexts.org/fpp/7/6
 */

"use strict";
var NODEJS = ((typeof process !== 'undefined') && process &&
  process.RUNNING_IN_NODEJS === 'true');


// End of imports section --- DO NOT REMOVE

var OPERATORS = {"A": function(x, s) {return x + s;},
                 "M": function(x, s) {return x * s;},
                 "N": function(x, s) {return x;}};

function seasonContribution(s, h) {
  /**
   * Computing the contribution of each season component
   *
   */
  var index = 0, m;
  if (Object.prototype.toString.call(s) === '[object Array]') {
      m = s.length;
      index = Math.abs(- m + 1 + h % m);
      return s[index];
  } else {
      return 0;}
}

function trivialForecast(submodel, horizon) {
  /**
   * Computing the forecast for the trivial models
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, period, submodelPoints;
  submodelPoints = submodel.value;
  period = submodelPoints.length;
  if (period > 1) {
    for (h = 0; h < horizon; h++) {
      points.push(submodelPoints[h % period]);
    }
  } else {
    for (h = 0; h < horizon; h++) {
      points.push(submodelPoints[0]);
    }
  }
  return points;
}

function naiveForecast(submodel, horizon) {
  /**
   * Computing the forecast for the naive model
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  return trivialForecast(submodel, horizon);
}

function meanForecast(submodel, horizon) {
  /**
   * Computing the forecast for the mean model
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  return trivialForecast(submodel, horizon);
}

function driftForecast(submodel, horizon) {
  /**
   * Computing the forecast for the mean model
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h;
  for (h = 0; h < horizon; h++) {
    points.push(submodel.value + submodel.slope * (h + 1));
  }
  return points;
}

function NForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=N model
   *
   * ŷ_t+h|t = l_t
   * ŷ_t+h|t = l_t + s_f(s, h) (if seasonality = "A")
   * ŷ_t+h|t = l_t * s_f(s, h) (if seasonality = "M")
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, s = finalState.s || 0, sh;

  for (h = 0; h < horizon; h++) {
    sh = seasonContribution(s, h);
    points.push(OPERATORS[seasonality](l, sh));
  }
  return points;
}

function AForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=A model
   *
   * ŷ_t+h|t = l_t + h * b_t
   * ŷ_t+h|t = l_t + h * b_t + s_f(s, h) (if seasonality = "A")
   * ŷ_t+h|t = (l_t + h * b_t) * s_f(s, h) (if seasonality = "M")
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0, sh;

  for (h = 0; h < horizon; h++) {
    sh = seasonContribution(s, h);
    points.push(OPERATORS[seasonality](l + b * (h + 1), sh));
  }
  return points;
}

function AdForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=Ad model
   *
   * ŷ_t+h|t = l_t + phi_h * b_t
   * ŷ_t+h|t = l_t + phi_h * b_t + s_f(s, h) (if seasonality = "A")
   * ŷ_t+h|t = (l_t + phi_h * b_t) * s_f(s, h) (if seasonality = "M")
   * with phi_h = phi + phi^2 + ... + phi^h
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0,
    phi = submodel.phi || 0, phi_h = 0, sh;
  for (h = 0; h < horizon; h++) {
    sh = seasonContribution(s, h);
    phi_h = phi_h + Math.pow(phi, h + 1);
    points.push(OPERATORS[seasonality](l + b * phi_h, sh));
  }
  return points;
}


function MForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=Ad model
   *
    ŷ_t+h|t = l_t * b_t^h
    ŷ_t+h|t = l_t * b_t^h + s_f(s, h) (if seasonality = "A")
    ŷ_t+h|t = (l_t * b_t^h) * s_f(s, h) (if seasonality = "M")
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0, sh;
  for (h = 0; h < horizon; h++) {
    sh = seasonContribution(s, h);
    points.push(OPERATORS[seasonality](l * Math.pow(b, h + 1), sh));
  }
  return points;
}

function MdForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=Ad model
   *
   * ŷ_t+h|t = l_t + b_t^(phi_h)
   * ŷ_t+h|t = l_t + b_t^(phi_h) + s_f(s, h) (if seasonality = "A")
   * ŷ_t+h|t = (l_t + b_t^(phi_h)) * s_f(s, h) (if seasonality = "M")
   * with phi_h = phi + phi^2 + ... + phi^h
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0,
    phi = submodel.phi || 0, phi_h = 0, sh;
  for (h = 0; h < horizon; h++) {
    sh = seasonContribution(s, h);
    phi_h = phi_h + Math.pow(phi, h + 1);
    points.push(OPERATORS[seasonality](l * Math.pow(b, phi_h), sh));
  }
  return points;
}

var SUBMODELS = {
  naive: naiveForecast,
  mean: meanForecast,
  drift: driftForecast,
  N: NForecast,
  A: AForecast,
  Ad: AdForecast,
  M: MForecast,
  Md: MdForecast};

if (NODEJS) {
  module.exports = SUBMODELS;
} else {
  exports = SUBMODELS;
}
