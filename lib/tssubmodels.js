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

var NODEJS = ((typeof module !== 'undefined') && module.exports),
  OPERATORS = {"A": function(x, y) {return x + y;},
               "M": function(x, y) {return x * y;},
               "N": function(x, y) {return x;}};



function naiveForecast(submodel, horizon) {
  /**
   * Computing the forecast for the naive model
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h;
  for (h = 0; h < horizon; h++) {
    points.push(submodel.value[0]);
  }
  return points;
}

function meanForecast(submodel, horizon) {
  /**
   * Computing the forecast for the mean model
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h;
  for (h = 0; h < horizon; h++) {
    points.push(submodel.value[0]);
  }
  return points;
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
   * ŷ_t+h|t = l_t + s (if seasonality = "A")
   * ŷ_t+h|t = l_t * s (if seasonality = "M")
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, s = finalState.s || 0;

  for (h = 0; h < horizon; h++) {
    points.push(OPERATORS[seasonality](l, s));
  }
  return points;
}

function AForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=A model
   *
   * ŷ_t+h|t = l_t + h * b_t
   * ŷ_t+h|t = l_t + h * b_t + s (if seasonality = "A")
   * ŷ_t+h|t = (l_t + h * b_t) * s (if seasonality = "M")
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0;

  for (h = 0; h < horizon; h++) {
    points.push(OPERATORS[seasonality](l + b * (h + 1), s));
  }
  return points;
}

function AdForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=Ad model
   *
   * ŷ_t+h|t = l_t + phi_h * b_t
   * ŷ_t+h|t = l_t + phi_h * b_t + s (if seasonality = "A")
   * ŷ_t+h|t = (l_t + phi_h * b_t) * s (if seasonality = "M")
   * with phi_h = phi + phi^2 + ... + phi^h
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0,
    phi = finalState.phi || 0, phi_h = phi;
  for (h = 0; h < horizon; h++) {
    points.push(OPERATORS[seasonality](l + b * phi_h, s));
    phi_h = phi_h + Math.pow(phi, h + 1);
  }
  return points;
}


function MForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=Ad model
   *
    ŷ_t+h|t = l_t * b_t^h
    ŷ_t+h|t = l_t * b_t^h + s (if seasonality = "A")
    ŷ_t+h|t = (l_t * b_t^h) * s (if seasonality = "M")
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0;
  for (h = 0; h < horizon; h++) {
    points.push(OPERATORS[seasonality](l + Math.pow(b, h + 1), s));
  }
  return points;
}

function MdForecast(submodel, horizon, seasonality) {
  /**
   * Computing the forecast for the trend=Ad model
   *
   * ŷ_t+h|t = l_t + b_t^(phi_h)
   * ŷ_t+h|t = l_t + b_t^(phi_h) + s (if seasonality = "A")
   * ŷ_t+h|t = (l_t + b_t^(phi_h)) * s (if seasonality = "M")
   * with phi_h = phi + phi^2 + ... + phi^h
   *
   * @param {object} available submodels
   * @param {integer} number of points to compute
   */
  var points = [], h, finalState = submodel["final_state"] || {},
    l = finalState.l || 0, b = finalState.b || 0, s = finalState.s || 0,
    phi = finalState.phi || 0, phi_h = phi;
  for (h = 0; h < horizon; h++) {
    points.push(OPERATORS[seasonality](l * Math.pow(b, phi_h), s));
    phi_h = phi_h + Math.pow(phi, h + 1);
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
}
