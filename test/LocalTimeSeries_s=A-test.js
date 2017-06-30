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

var assert = require('assert'),
  bigml = require('../index'),
  constants = require('../lib/constants'),
  path = require('path');
var scriptName = path.basename(__filename);

function checkForecast(forecast, reference) {
  var item, refItem, len, index;
  assert.equal(Object.keys(forecast).length, Object.keys(reference).length);
  for (fieldId in forecast) {
    if (forecast.hasOwnProperty(fieldId)) {
      item = forecast[fieldId][0];
      refItem = reference[fieldId][0];
      assert.equal(item.submodel, refItem.submodel);
      assert.equal(item.pointForecast.length, refItem.pointForecast.length);
      len = item.pointForecast.length;
      for (index = 0; index < len; index++) {
        assert.equal(Math.round(item.pointForecast[index] * 100000) / 100000.0,
                     refItem.pointForecast[index]);
      }
    }
  }
}

describe(scriptName + ': Manage local Time-series objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/grades.csv',
    datasetId, dataset = new bigml.Dataset(),
    timeSeriesId, timeSeries = new bigml.TimeSeries(),
    timeSeriesResource, timeSeriesFinishedResource, forecastId,
    localTimeSeries, forecast = new bigml.Forecast(),
    forecast1 = {},
    inputData1 = {"000005": {"horizon": 5, "submodels": {"criterion": "aic",
                                                         "limit": 3}}};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        timeSeries.create(datasetId, {objective_fields: ["000001", "000005"],
                                      period: 12},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          timeSeriesId = data.resource;
          timeSeriesResource = data;
          timeSeries.get(timeSeriesResource, true, 'only_model=true',
            function (error, data) {
            timeSeriesFinishedResource = data;
            done();
          });
        });
      });
    });
  });

  describe('LocalLocalTimeSeries(timeSeriesId)', function () {
    it('should create a LocalTimeSeries from a time-series Id',
      function (done) {
      localTimeSeries = new bigml.LocalTimeSeries(timeSeriesId);
      if (localTimeSeries.ready) {
        assert.ok(true);
        done();
      } else {
        localTimeSeries.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#forecast(inputData) for submodel "M,N,N"', function () {
    it('should forecast synchronously from input data', function () {
      inputData1["000005"].submodels.names = ["M,N,N"];
      forecast1 = {"000005": [{"pointForecast": [68.51, 68.51, 68.51, 68.51, 68.51], "submodel": "M,N,N"}]};
      var forecast = localTimeSeries.forecast(inputData1);
      checkForecast(forecast, forecast1);
    });
  });
  describe('#forecast(inputData) for submodel "M,N,A"', function () {
    it('should forecast synchronously from input data', function () {
      inputData1["000005"].submodels.names = ["M,N,A"];
      forecast1 = {"000005": [{"pointForecast":  [67.48942, 65.12405, 66.98087, 68.41619, 72.63298], "submodel": "M,N,A"}]};
      var forecast = localTimeSeries.forecast(inputData1);
      checkForecast(forecast, forecast1);
    });
  });
  describe('#forecast(inputData) for submodel "A,A,A"', function () {
    it('should forecast synchronously from input data', function () {
      inputData1["000005"].submodels.names = ["A,A,A"];
      forecast1 = {"000005": [{"pointForecast": [74.72557, 70.48612, 74.41286, 75.18915, 79.59162], "submodel": "A,A,A"}]};
      var forecast = localTimeSeries.forecast(inputData1);
      checkForecast(forecast, forecast1);
    });
  });

  describe('#forecast(inputData) for submodel "A,Ad,A"', function () {
    it('should forecast synchronously from input data', function () {
      inputData1["000005"].submodels.names = ["A,Ad,A"];
      forecast1 = {"000005": [{"pointForecast": [72.12127, 69.46876, 73.2959, 73.35428, 77.65995], "submodel": "A,Ad,A"}]};
      var forecast = localTimeSeries.forecast(inputData1);
      checkForecast(forecast, forecast1);
    });
  });
  after(function (done) {
    source.delete(sourceId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    dataset.delete(datasetId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    timeSeries.delete(timeSeriesId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
