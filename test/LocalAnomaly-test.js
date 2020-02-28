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
  path = require('path');
var scriptName = path.basename(__filename);

describe(scriptName + ': Manage local anomaly objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/tiny_kdd.csv',
    datasetId, dataset = new bigml.Dataset(),
    anomalyId, anomaly = new bigml.Anomaly(), anomalyResource,
    anomalyFinishedResource,
    localAnomaly, lazyLocalAnomaly,
    firstScore = 0.5098650089562002,
    inputDataById = {'000020': 9.0, '000004': 181.0, '000016': 8.0,
                     '000024': 0.0, '000025': 0.0, '000026': 0.0,
                     '000019': 0.0, '000017': 8.0, '000018': 0.0,
                     '00001e': 0.0, '000005': 5450.0, '000009': '0',
                     '000023': 0.11, '00001f': 9.0},
    inputData = {'count': 8.0, 'srv_serror_rate': 0.0, 'src_bytes': 181.0,
                 'srv_count': 8.0, 'serror_rate': 0.0,
                 'dst_host_same_src_port_rate': 0.11,
                 'dst_host_srv_serror_rate': 0.0, 'hot': '0',
                 'dst_host_srv_diff_host_rate': 0.0, 'dst_host_srv_count': 9.0,
                 'srv_diff_host_rate': 0.0, 'dst_host_count': 9.0,
                 'dst_bytes': 5450.0, 'dst_host_serror_rate': 0.0},
    firstAnomaly = '(and (= (f "000004") 183) (= (f "000005") 8654) (= (f "000009") "0") (= (f "000016") 4) (= (f "000017") 4) (= (f "000018") 0.25) (= (f "000019") 0.25) (missing? "00001e") (= (f "00001f") 123) (= (f "000020") 255) (= (f "000023") 0.01) (= (f "000024") 0.04) (= (f "000025") 0.01) (missing? "000026"))',
    seed = 'BigML tests';

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        anomaly.create(datasetId, {seed: seed,
                                   anomaly_seed: seed,
                                   top_n: 1},
          function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            anomalyId = data.resource;
            anomalyResource = data;
            anomaly.get(anomalyResource, true, 'only_model=true',
              function (error, data) {
                anomalyFinishedResource = data;
                done();
              });
        });
      });
    });
  });

  describe('LocalAnomaly(anomalyId)', function () {
    it('should create a localAnomaly from an anomaly detector Id', function (done) {
      localAnomaly = new bigml.LocalAnomaly(anomalyId);
      if (localAnomaly.ready) {
        assert.ok(true);
        done();
      } else {
        localAnomaly.on('ready', function () {
          assert.ok(true);
          done();
          });
      }
    });
  });
  describe('LocalAnomaly(anomalyId, lazy)', function () {
    it('should create a lazy localAnomaly from an anomaly detector Id', function (done) {
      lazyLocalAnomaly = new bigml.LocalAnomaly(anomalyId, undefined, { lazy: true });
      if (lazyLocalAnomaly.ready) {
        assert.ok(true);
        done();
      } else {
        lazyLocalAnomaly.on('ready', function () {
          assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#anomalyScore(inputData, callback)', function () {
    it('should predict anomaly scores asynchronously from input data', function (done) {
      localAnomaly.anomalyScore(inputData, function (error, data) {
        assert.equal(data, firstScore);
        var anomalyScore = new bigml.AnomalyScore();
        anomalyScore.create(anomalyId, inputData, function (error, data) {
            assert.equal(Math.round(firstScore * 100000, 5) / 100000, data['object']['score']);
            done();
        });
      });
    });
  });
  describe('#anomalyScore(inputData)', function () {
    it('should predict anomaly scores synchronously from input data', function (done) {
      var prediction = localAnomaly.anomalyScore(inputData);
      assert.equal(prediction, firstScore);
      var anomalyScore = new bigml.AnomalyScore();
      anomalyScore.create(anomalyId, inputData, function (error, data) {
          assert.equal(Math.round(prediction * 100000, 5) / 100000, data['object']['score']);
          done();
      });
    });
  });
  describe('#anomalyScore(inputData, callback) lazy', function () {
    it('should lazily predict anomaly scores asynchronously from input data', function (done) {
      lazyLocalAnomaly.anomalyScore(inputData, function (error, data) {
        assert.equal(data, firstScore);
        var anomalyScore = new bigml.AnomalyScore();
        anomalyScore.create(anomalyId, inputData, function (error, data) {
            assert.equal(Math.round(firstScore * 100000, 5) / 100000, data['object']['score']);
            done();
        });
      });
    });
  });
  describe('#anomalyScore(inputData) lazy', function () {
    it('should lazily predict anomaly scores synchronously from input data', function (done) {
      var prediction = lazyLocalAnomaly.anomalyScore(inputData);
      assert.equal(prediction, firstScore);
      var anomalyScore = new bigml.AnomalyScore();
      anomalyScore.create(anomalyId, inputData, function (error, data) {
          assert.equal(Math.round(prediction * 100000, 5) / 100000, data['object']['score']);
          done();
      });
    });
  });

  describe('#anomalyScore(inputData, callback)', function () {
    it('should predict anomaly scores asynchronously from input data keyed by field id',
       function (done) {
      localAnomaly.anomalyScore(inputDataById, function (error, data) {
        assert.equal(data, firstScore);
        done();
      });
    });
  });
  describe('#anomalyScore(inputData)', function () {
    it('should predict synchronously from input data keyed by field id',
       function () {
      var prediction = localAnomaly.anomalyScore(inputData);
      assert.equal(prediction, firstScore);
    });
  });
  describe('LocalAnomaly(anomalyResource)', function () {
    it('should create a localAnomaly from an anomaly detector unfinished resource', function (done) {
      localAnomaly = new bigml.LocalAnomaly(anomalyResource);
      if (localAnomaly.ready) {
        assert.ok(true);
        done();
      } else {
        localAnomaly.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#anomalyScore(inputData, callback)', function () {
    it('should predict anomalyScores asynchronously from input data', function (done) {
      localAnomaly.anomalyScore(inputData, function (error, data) {
        assert.equal(data, firstScore);
        done();
      });
    });
  });
  describe('LocalAnomaly(anomalyFinishedResource)', function () {
    it('should create a localAnomaly from an anomaly detector finished resource', function () {
      localAnomaly = new bigml.LocalAnomaly(anomalyFinishedResource);
      assert.ok(localAnomaly.ready);
    });
  });
  describe('#anomalyScore(inputData)', function () {
    it('should predict anomaly score synchronously from input data', function (done) {
      localAnomaly.anomalyScore(inputData, function (error, data) {
        assert.equal(data, firstScore);
        done();
      });
    });
  });
  describe('#anomaliesFilter(true)', function () {
    it('should produce the filter to select the anomalies from the dataset', function (done) {
      localAnomaly.anomaliesFilter(true, function (error, data) {
        assert.equal(data, firstAnomaly);
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
    anomaly.delete(anomalyId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
