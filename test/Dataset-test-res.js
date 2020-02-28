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

describe(scriptName + ': Manage dataset objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(), dataset2 = new bigml.Dataset(),
    dataset3 = new bigml.Dataset(), dataset4 = new bigml.Dataset(),
    cluster = new bigml.Cluster(), filename = '/tmp/exported.csv',
    datasetId2, datasetId3, datasetId4, clusterId, centroidId,
    dataset5 = new bigml.Dataset(), datasetId5;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      done();
    });
  });

  describe('#create(source, callback)', function () {
    it('should create a dataset from a source', function (done) {
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        done();
      });
    });
  });
  describe('#get(dataset, finished, query, callback)', function () {
    it('should retrieve a finished dataset', function (done) {
      dataset.get(datasetId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(dataset, args, callback)', function () {
    it('should update properties in the dataset', function (done) {
      var newName = 'my new name';
      dataset.update(datasetId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        dataset.get(datasetId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#create(dataset, callback)', function () {
    it('should create a new dataset from a dataset', function (done) {
      dataset2.create(datasetId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId2 = data.resource;
        done();
      });
    });
  });
  describe('#create([dataset], callback)', function () {
    it('should create a new dataset from a list of datasets', function (done) {
      dataset3.create([datasetId, datasetId2], undefined,
                      function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId3 = data.resource;
        done();
      });
    });
  });
  describe('#create([{id: dataset}], callback)', function () {
    it('should create a new dataset from a list of the same dataset', function (done) {
      dataset5.create([datasetId, {id: datasetId, sample_rate: 0.5}], undefined,
                      function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId5 = data.resource;
        done();
      });
    });
  });
  describe('#create(cluster, {centroid: centroidId}, callback)', function () {
    it('should create a new dataset from cluster and a centroid id',
      function (done) {
        cluster.create(datasetId, {k:8}, function (error, data) {
          clusterId = data.resource;
          centroidId = "000000"
          dataset4.create(clusterId, {centroid: centroidId},
                          function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId4 = data.resource;
            done();
          });
        });
    });
  });
  describe('#download(dataset, filename, callback)', function () {
    it('should download the dataset to a CSV file', function (done) {
      var datap = fs.readFileSync(path, 'utf8');
      dataset.download(datasetId, filename, function (error, data) {
        if (error == null) {
          fs.readFile(filename, "utf8", function (error2, dataf) {
            assert.equal(dataf, datap);
            fs.unlink(filename, function (error, data) {
              assert.equal(error, null);
              done();
            });
          });
        }
      });
    });
  });
    /*
  after(function (done) {
    dataset.delete(datasetId3, function (error, data) {
      assert.equal(error, null);
      dataset.delete(datasetId2, function (error2, data2) {
        assert.equal(error2, null);
        dataset.delete(datasetId, function (error3, data3) {
          assert.equal(error3, null);
          dataset.delete(datasetId5, function (error5, data) {
            assert.equal(error5, null);
            done();
          })
        });
      });
    });
  });
    */
  after(function (done) {
    source.delete(sourceId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    cluster.delete(clusterId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    dataset.delete(datasetId4, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
