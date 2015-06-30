var assert = require('assert'),
  bigml = require('../index');

describe('Manage local cluster objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(), clusterResource, clusterFinishedResource,
    localCluster, firstCentroidDistance, secondCentroidDistance, thirdCentroidDistance,
    seed = 'BigML tests';

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        cluster.create(datasetId, {seed: seed,
                                   cluster_seed: seed, k: 8},
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
                       'sepal width': 1, 'species': 'Iris-setosa'};
      localCluster.centroid(inputData, function (error, data) {
        assert.equal(data.centroidName, 'Cluster 6');
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
  describe('#centroid(inputData)', function () {
    it('should predict centroids synchronously from input data', function (done) {
      var inputData = {'petal width': 3, 'petal length': 3, 'sepal length': 3,
                       'sepal width': 3, 'species': 'Iris-virginica'};
      var prediction = localCluster.centroid(inputData);
      assert.equal(prediction.centroidName, 'Cluster 1');
      var centroidName = prediction.centroidName;
      secondCentroidDistance = prediction.distance;
      var centroid = new bigml.Centroid();
      centroid.create(clusterId, inputData, function (error, data) {
          assert.equal(centroidName, data.object.centroid_name);
          assert.equal(secondCentroidDistance, data.object.distance);
          done();
      });
    });
  });
  describe('#centroid(inputData)', function () {
    it('should predict centroids synchronously from input data without categorical field', function (done) {
      var inputData = {'petal width': 3, 'petal length': 3, 'sepal length': 3,
                       'sepal width': 3, 'species': ''};
      var prediction = localCluster.centroid(inputData);
      assert.equal(prediction.centroidName, 'Cluster 1');
      var centroidName = prediction.centroidName;
      thirdCentroidDistance = prediction.distance;
      var centroid = new bigml.Centroid();
      centroid.create(clusterId, inputData, function (error, data) {
          assert.equal(centroidName, data.object.centroid_name);
          assert.equal(thirdCentroidDistance, data.object.distance);
          done();
      });
    });
  });
  describe('#centroid(inputData, callback)', function () {
    it('should predict centroids asynchronously from input data keyed by field id',
       function (done) {
      var inputData = {'000000': 1, '000001': 1, '000002': 1,
                       '000003': 1, '000004': 'Iris-setosa'};
      localCluster.centroid(inputData, function (error, data) {
        assert.equal(data.centroidName, 'Cluster 6');
        assert.equal(data.distance, firstCentroidDistance);
        done();
      });
    });
  });
  describe('#centroid(inputData)', function () {
    it('should predict synchronously from input data keyed by field id',
       function () {
      var inputData = {'000000': 3, '000001': 3, '000002': 3,
                       '000003': 3, '000004': 'Iris-virginica'};
      var prediction = localCluster.centroid(inputData);
      assert.equal(prediction.centroidName, 'Cluster 1');
      assert.equal(prediction.distance, secondCentroidDistance);
    });
  });
  describe('#centroid(inputData)', function () {
    it('should predict synchronously from input data keyed by field id and no categorical field',
       function () {
      var inputData = {'000000': 3, '000001': 3, '000002': 3,
                       '000003': 3};
      var prediction = localCluster.centroid(inputData);
      assert.equal(prediction.centroidName, 'Cluster 1');
      assert.equal(prediction.distance, thirdCentroidDistance);
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
      var inputData = {'petal width': 1, 'petal length': 1, 'sepal length': 1,
                       'sepal width': 1, 'species': 'Iris-setosa'};
      localCluster.centroid(inputData, function (error, data) {
        assert.equal(data.centroidName, 'Cluster 6');
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
      var inputData = {'petal width': 1, 'petal length': 1, 'sepal length': 1,
                       'sepal width': 1, 'species': 'Iris-setosa'};
      localCluster.centroid(inputData, function (error, data) {
        assert.equal(data.centroidName, 'Cluster 6');
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
