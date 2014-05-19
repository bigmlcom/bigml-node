var assert = require('assert'),
  bigml = require('../index');

describe('Manage cluster objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(), datasetId2,
    dataset2 = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(), clusterId2,
    cluster2 = new bigml.Cluster();

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
      cluster.create(datasetId, undefined, function (error, data) {
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
      cluster2.create([datasetId, datasetId2], undefined,
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
