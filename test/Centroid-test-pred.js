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

describe(scriptName + ': Manage centroid objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(),
    centroidId, centroid = new bigml.Centroid(),
    inputData = {'petal width': 0.5, 'petal length': 0.1, 'sepal length': 0.5,
                 'sepal width': 0.2, 'species': 'Iris-setosa'},
    testCentroid = 'Cluster 7',
    inputDataId = {'000003': 0.5, '000002': 0.1, '000001': 0.5,
                   '000000': 0.2, '000004': 'Iris-setosa'},
    seed = "BigML tests",
    clusterArgs = {k: 8};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        cluster.create(datasetId, clusterArgs, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          clusterId = data.resource;
          done();
        });
      });
    });
  });

  describe('#create(cluster, inputData, args, callback)', function () {
    it('should create a centroid from a cluster', function (done) {
      centroid.create(clusterId, inputData, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        centroidId = data.resource;
        done();
      });
    });
  });
  describe('#create(cluster, inputDataId, args, callback)', function () {
    it('should create a centroid from a cluster using ids in input data', function (done) {
      centroid.create(clusterId, inputDataId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        centroidId = data.resource;
        done();
      });
    });
  });
  describe('#get(centroid, finished, query, callback)', function () {
    it('should retrieve a finished centroid', function (done) {
      centroid.get(centroidId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          var centroidName = data.object.centroid_name;
          assert.equal(centroidName, testCentroid);
          done();
        }
      });
    });
  });
  describe('#update(centroid, args, callback)', function () {
    it('should update properties in the centroid', function (done) {
      var newName = 'my new name';
      centroid.update(centroidId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        centroid.get(centroidId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(centroid, callback)', function () {
    it('should delete the remote centroid', function (done) {
      centroid.delete(centroidId, function (error, data) {
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
    cluster.delete(clusterId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
