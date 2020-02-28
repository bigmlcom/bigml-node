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
        assert.equal(Math.round(item.pointForecast[index] * 100000) / 100000,
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
    inputData1 = {"000005": {"horizon": 5}};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        timeSeries.create(datasetId, {objective_fields: ["000001", "000005"]},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          timeSeriesId = data.resource;
          timeSeriesResource = data;
          timeSeries.get(timeSeriesResource, true, 'only_model=true',
            function (error, data) {
            timeSeriesFinishedResource = data;
            forecast.create(timeSeriesId, inputData1, function (error, data) {
              forecast1.pointForecast = data.object.forecast.result["000005"][0].point_forecast;
              forecast1.submodel = data.object.forecast.result["000005"][0].submodel;
              forecast1 = {"000005": [forecast1]};
              forecastId = data.resource;
              done();
            });
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
  describe('#forecast(inputData, callback)', function () {
    it('should forecast asynchronously from input data', function (done) {
      localTimeSeries.forecast(inputData1, false, function (error, data) {
        checkForecast(data, forecast1);
        done();
      });
    });
  });
  describe('#forecast(inputData)', function () {
    it('should forecast synchronously from input data', function () {
      var forecast = localTimeSeries.forecast(inputData1);
      checkForecast(forecast, forecast1);
    });
  });
  describe('LocalTimeSeries(timeSeriesResource)', function () {
    it('should create a LocalTimeSeries from a time-series unfinished resource',
      function (done) {
      localTimeSeries = new bigml.LocalTimeSeries(timeSeriesResource);
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
  describe('#forecast(inputData, callback)', function () {
    it('should forecast asynchronously from input data', function (done) {
      localTimeSeries.forecast(inputData1, function (error, data) {
        checkForecast(data, forecast1);
        done();
      });
    });
  });
  describe('LocalTimeSeries(timeSeriesFinishedResource)', function () {
    it('should create a LocalTimeSeries from a time-series finished resource',
      function () {
      localTimeSeries = new bigml.LocalTimeSeries(timeSeriesFinishedResource);
      assert.ok(localTimeSeries.ready);
    });
  });
  describe('#forecast(inputData, callback)', function () {
    it('should forecast asynchronously from input data', function (done) {
      localTimeSeries.forecast(inputData1, function (error, data) {
        checkForecast(data, forecast1);
        done();
      });
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
  after(function (done) {
    forecast.delete(forecastId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
