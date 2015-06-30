var assert = require('assert'),
  bigml = require('../index');

describe('Manage local cluster objects with summary fields', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(), clusterResource, clusterFinishedResource,
    localCluster, firstCentroidDistance,
    seed = 'BigML tests';

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        cluster.create(datasetId, {seed: seed,
                                   cluster_seed: seed, k: 8,
                                   summary_fields: ['sepal width']},
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
      var inputData = {'petal width': 1, 'petal length': 1, 'sepal length': 1,
                       'species': 'Iris-setosa'};
      localCluster.centroid(inputData, function (error, data) {
        assert.equal(data.centroidName, 'Cluster 4');
        firstCentroidDistance = data.distance;
        var centroidName = data.centroidName;
        var centroid = new bigml.Centroid();
        centroid.create(clusterId, inputData, function (error, data) {
            assert.equal(centroidName, data.object.centroid_name);
            assert.equal(firstCentroidDistance, data.object.distance);
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
