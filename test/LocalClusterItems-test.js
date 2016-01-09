var assert = require('assert'),
  bigml = require('../index');

describe('Manage local cluster objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/movies.csv',
    datasetId, dataset = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(), clusterResource,
    clusterFinishedResource, seed = 'BigML tests',
    localCluster, firstCentroidDistance,
    inputData = {"gender": "Female", "genres": "Adventure$Action",
                 "timestamp": 993906291, "occupation": "K-12 student",
                 "zipcode": 59583, "rating": 3, "age_range": "25-34"},
    centroidName = "Cluster 2";

  before(function (done) {
    var itemsField = {
      'fields': {'000007': {
        'optype': 'items', 'item_analysis': {'separator': '$'}}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, itemsField, function (error, data) {
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
      localCluster.centroid(inputData,
        function (error, data) {
          assert.equal(data.centroidName, centroidName);
          firstCentroidDistance = data.distance;
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
