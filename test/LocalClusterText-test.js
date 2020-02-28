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

function truncate(number, decimals) {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10.0,
                                                                decimals);
}

describe(scriptName + ': Manage local cluster objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(), clusterResource,
    clusterFinishedResource, seed = 'BigML tests',
    localCluster, firstCentroidDistance, secondCentroidDistance,
    prediction1 = 'Cluster 1', prediction2 = 'Cluster 0';

  before(function (done) {
    var textField = {'fields': {'000001': {'optype': 'text'}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, textField, function (error, data) {
          dataset.create(sourceId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            cluster.create(datasetId, {seed: seed, cluster_seed: seed, k:8},
              function (error, data) {
                assert.equal(data.code, bigml.constants.HTTP_CREATED);
                clusterId = data.resource;
                clusterResource = data;
                cluster.get(clusterResource, true, 'only_model=true',
                  function (error, data) {
                    clusterFinishedResource = data;
                    done();
              });
            });
          });
        });
      });
    });
  });

  describe('LocalCluster(clusterId)', function () {
    it('should create a localCluster from a cluster Id', function (done) {
      localCluster = new bigml.LocalCluster(clusterId);
      if (localCluster.ready) {
        assert.ok(true);
        done();
      } else {
        localCluster.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#centroid(inputData, callback)', function () {
    it('should predict centroids asynchronously from input data', function (done) {
      var inputData = {'Type': 'ham', 'Message': 'mobile Mobile call'};
      localCluster.centroid(inputData,
        function (error, data) {
          assert.equal(data.centroidName, prediction1);
          var centroidName = data.centroidName;
          firstCentroidDistance = truncate(data.distance, 5);
          var centroid = new bigml.Centroid();
          centroid.create(clusterId, inputData, function (error, data) {
              assert.equal(centroidName, data.object.centroid_name);
              assert.equal(firstCentroidDistance, data.object.distance);
              centroid.delete(data.resource, function (error, data) {
                assert.equal(error, null);
                done();
              });
          });
      });
    });
  });
  describe('#centroid(inputData)', function () {
    it('should predict centroids synchronously from input data', function (done) {
      var inputData = {'Type': 'ham', 'Message': 'A normal message'};
      var prediction = localCluster.centroid(inputData);
      assert.equal(prediction.centroidName, prediction2);
      var centroidName = prediction.centroidName;
      secondCentroidDistance = truncate(prediction.distance, 5);
          var centroid = new bigml.Centroid();
          centroid.create(clusterId, inputData, function (error, data) {
              assert.equal(centroidName, data.object.centroid_name);
              assert.equal(secondCentroidDistance, data.object.distance);
              centroid.delete(data.resource, function (error, data) {
                assert.equal(error, null);
                done();
              });
          });
    });
  });
  describe('#centroid(inputData, callback)', function () {
    it('should predict centroids asynchronously from input data keyed by field id',
       function (done) {
      localCluster.centroid({'000000': 'ham', '000001': 'mobile Mobile call'}, function (error, data) {
        assert.equal(data.centroidName, prediction1);
        assert.equal(truncate(data.distance, 5), firstCentroidDistance);
        done();
      });
    });
  });
  describe('#centroid(inputData)', function () {
    it('should predict centroids synchronously from input data keyed by field id',
       function () {
      var prediction = localCluster.centroid({'000000': 'ham', '000001': 'A normal message'});
      assert.equal(prediction.centroidName, prediction2);
      assert.equal(truncate(prediction.distance, 5), secondCentroidDistance);
    });
  });
  describe('LocalCluster(clusterResource)', function () {
    it('should create a localCluster from a cluster unfinished resource', function (done) {
      localCluster = new bigml.LocalCluster(clusterResource);
      if (localCluster.ready) {
        assert.ok(true);
        done();
      } else {
        localCluster.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#centroid(inputData, callback)', function () {
    it('should predict centroids asynchronously from input data', function (done) {
      localCluster.centroid({'Type': 'ham', 'Message': 'A normal message'}, function (error, data) {
        assert.equal(data.centroidName, prediction2);
        done();
      });
    });
  });
  describe('LocalCluster(clusterFinishedResource)', function () {
    it('should create a localCluster from a cluster finished resource', function () {
      localCluster = new bigml.LocalCluster(clusterFinishedResource);
      assert.ok(localCluster.ready);
    });
  });
  describe('#centroid(inputData)', function () {
    it('should predict centroids synchronously from input data', function (done) {
      localCluster.centroid({'Type': 'ham', 'Message': 'A normal message'}, function (error, data) {
        assert.equal(data.centroidName, prediction2);
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
