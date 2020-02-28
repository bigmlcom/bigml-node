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

describe(scriptName + ': Manage cluster objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(), datasetId2,
    dataset2 = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(), clusterId2,
    cluster2 = new bigml.Cluster(),
    seed = "BigML tests",
    clusterArgs = {seed: seed, cluster_seed: seed, k: 8};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        dataset2.create(sourceId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          datasetId2 = data.resource;
          done();
        });
      });
    });
  });

  describe('#create(dataset, args, callback)', function () {
    it('should create a cluster from a dataset', function (done) {
      cluster.create(datasetId, clusterArgs, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        clusterId = data.resource;
        done();
      });
    });
  });
  describe('#get(cluster, finished, query, callback)', function () {
    it('should retrieve a finished cluster', function (done) {
      cluster.get(clusterId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(cluster, args, callback)', function () {
    it('should update properties in the cluster', function (done) {
      var newName = 'my new name';
      cluster.update(clusterId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        cluster.get(clusterId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#create([dataset], args, callback)', function () {
    it('should create a cluster from a list of datasets ', function (done) {
      cluster2.create([datasetId, datasetId2], clusterArgs,
                    function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        clusterId2 = data.resource;
        done();
      });
    });
  });
  describe('#delete(cluster, callback)', function () {
    it('should delete the remote cluster', function (done) {
      cluster.delete(clusterId, function (error, data) {
        assert.equal(error, null);
        cluster2.delete(clusterId2, function (error, data) {
          assert.equal(error, null);
          done();
        });
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
      dataset2.delete(datasetId2, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
