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
  fs = require('fs'),
  path = require('path');
var scriptName = path.basename(__filename);

describe(scriptName + 'Manage batch anomaly score objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/tiny_kdd.csv',
    datasetId, dataset = new bigml.Dataset(),
    anomalyId, anomaly = new bigml.Anomaly(),
    batchAnomalyScoreId, batchAnomalyScore = new bigml.BatchAnomalyScore(),
    trainingDatasetId, testDatasetId,
    tmpFileName = '/tmp/testBatchAnomalyScore.csv';

  before(function (done) {
    var seed = 'BigML, Machine Learning made simple',
      sampleRate = 0.8;
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        dataset.create(datasetId, {seed: seed, sample_rate: sampleRate},
                       function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            trainingDatasetId = data.resource;
            dataset.create(datasetId, {seed: seed,
                                       sample_rate: sampleRate,
                                       out_of_bag: true},
                           function (error, data) {
                assert.equal(data.code, bigml.constants.HTTP_CREATED);
                testDatasetId = data.resource;
                anomaly.create(trainingDatasetId, undefined, function (error, data) {
                  assert.equal(data.code, bigml.constants.HTTP_CREATED);
                  anomalyId = data.resource;
                  done();
                });
              });
          });
      });
    });
  });

  describe('#create(anomaly, testDatasetId, args, callback)', function () {
    it('should create a batch anomaly score for an anomaly detector and a dataset', function (done) {
      batchAnomalyScore.create(anomalyId, testDatasetId, undefined,
                               function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          batchAnomalyScoreId = data.resource;
          done();
        });
    });
  });
  describe('#get(batchAnomalyScore, finished, query, callback)', function () {
    it('should retrieve a finished batch anomaly score', function (done) {
      batchAnomalyScore.get(batchAnomalyScoreId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#download(batchAnomalyScore, filename, callback)', function () {
    it('should download the batch anomaly score output file', function (done) {
      batchAnomalyScore.download(batchAnomalyScoreId, tmpFileName, function (error, cbFilename) {
        if (!error && cbFilename) {
          fs.exists(cbFilename, function (exists) {
            assert.ok(exists);
            try {
              fs.unlink(cbFilename);
            } catch (err) {}
            done();
          });
        } else {
          console.log(error);
          assert.ok(false);
        }
      });
    });
  });
  describe('#update(batchAnomalyScore, args, callback)', function () {
    it('should update properties in the batch anomaly score', function (done) {
      var newName = 'my new name';
      batchAnomalyScore.update(batchAnomalyScoreId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        batchAnomalyScore.get(batchAnomalyScoreId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(batchAnomalyScore, callback)', function () {
    it('should delete the remote batch anomaly score', function (done) {
      batchAnomalyScore.delete(batchAnomalyScoreId, function (error, data) {
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
    dataset.delete(trainingDatasetId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    dataset.delete(testDatasetId, function (error, data) {
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
