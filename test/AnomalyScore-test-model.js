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

describe(scriptName + ': Manage anomaly score objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/tiny_kdd.csv',
    datasetId, dataset = new bigml.Dataset(),
    anomalyId, anomaly = new bigml.Anomaly(),
    anomalyScoreId, anomalyScore = new bigml.AnomalyScore(),
    inputData = {'src_bytes': 350},
    testAnomalyScore = 0.92846;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        anomaly.create(datasetId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          anomalyId = data.resource;
          done();
        });
      });
    });
  });

  describe('#create(anomaly, inputData, args, callback)', function () {
    it('should create an anomaly score from an anomaly detector',
      function (done) {
        anomalyScore.create(anomalyId, inputData, undefined,
          function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            anomalyScoreId = data.resource;
            done();
        });
    });
  });
  describe('#get(anomalyScore, finished, query, callback)', function () {
    it('should retrieve a finished anomaly score', function (done) {
      anomalyScore.get(anomalyScoreId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          var anomalyScoreValue = data.object.score;
          assert.equal(anomalyScoreValue, testAnomalyScore);
          done();
        }
      });
    });
  });
  describe('#update(anomalyScore, args, callback)', function () {
    it('should update properties in the anomaly score', function (done) {
      var newName = 'my new name';
      anomalyScore.update(anomalyScoreId, {name: newName},
        function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
          anomalyScore.get(anomalyScoreId, true, function (errorcb, datacb) {
            if (datacb.object.status.code === bigml.constants.FINISHED &&
                datacb.object.name === newName) {
              assert.ok(true);
              done();
          }
        });
      });
    });
  });
  describe('#delete(anomalyScore, callback)', function () {
    it('should delete the remote anomaly score', function (done) {
      anomalyScore.delete(anomalyScoreId, function (error, data) {
        assert.equal(error, null);
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
