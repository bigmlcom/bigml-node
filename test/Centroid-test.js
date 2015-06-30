var assert = require('assert'),
  bigml = require('../index');

describe('Manage centroid objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(),
    centroidId, centroid = new bigml.Centroid(),
    inputData = {'petal width': 0.5, 'petal length': 0.1, 'sepal length': 0.5,
                 'sepal width': 0.2, 'species': 'Iris-setosa'},
    testCentroid = 'Cluster 1',
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
