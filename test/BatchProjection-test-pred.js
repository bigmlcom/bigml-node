/**
 * Copyright 2018-2020 BigML
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

describe(scriptName + ': Manage batch projection objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    pcaId, pca = new bigml.PCA(),
    batchProjectionId, batchProjection = new bigml.BatchProjection(),
    trainingDatasetId, testDatasetId,
    tmpFileName = '/tmp/testBatchProjection.csv';

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
                pca.create(trainingDatasetId, undefined, function (error, data) {
                  assert.equal(data.code, bigml.constants.HTTP_CREATED);
                  pcaId = data.resource;
                  done();
                });
              });
          });
      });
    });
  });

  describe('#create(pca, testDatasetId, args, callback)', function () {
    it('should create a batch projection for a pca and a dataset', function (done) {
      batchProjection.create(pcaId, testDatasetId, undefined,
                             function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          batchProjectionId = data.resource;
          done();
        });
    });
  });
  describe('#get(batchProjection, finished, query, callback)', function () {
    it('should retrieve a finished batch projection', function (done) {
      batchProjection.get(batchProjectionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#download(batchProjection, filename, callback)', function () {
    it('should download the batch projection output file', function (done) {
      batchProjection.download(batchProjectionId, tmpFileName, function (error, cbFilename) {
        if (!error && cbFilename) {
          fs.exists(cbFilename, function (exists) {
            assert.ok(exists);
            try {
              fs.unlink(cbFilename);
            } catch (err) {}
            done();
          });
        } else {
          assert.ok(false);
        }
      });
    });
  });
  describe('#update(batchProjection, args, callback)', function () {
    it('should update properties in the batch projection', function (done) {
      var newName = 'my new name';
      batchProjection.update(batchProjectionId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        batchProjection.get(batchProjectionId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(batchProjection, callback)', function () {
    it('should delete the remote batch projection', function (done) {
      batchProjection.delete(batchProjectionId, function (error, data) {
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
    pca.delete(pcaId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
