var assert = require('assert'),
  bigml = require('../index'),
  fs = require('fs');

describe('Manage batch centroid objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    clusterId, cluster = new bigml.Cluster(),
    batchCentroidId, batchCentroid = new bigml.BatchCentroid(),
    trainingDatasetId, testDatasetId,
    tmpFileName = '/tmp/testBatchCentroid.csv',
    seed = "BigML tests",
    clusterArgs = {seed: seed, cluster_seed: seed, k: 8};

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
                cluster.create(trainingDatasetId, clusterArgs, function (error, data) {
                  assert.equal(data.code, bigml.constants.HTTP_CREATED);
                  clusterId = data.resource;
                  done();
                });
              });
          });
      });
    });
  });

  describe('#create(cluster, testDatasetId, args, callback)', function () {
    it('should create a batch centroid for a cluster and a dataset', function (done) {
      batchCentroid.create(clusterId, testDatasetId, undefined,
                           function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          batchCentroidId = data.resource;
          done();
        });
    });
  });
  describe('#get(batchCentroid, finished, query, callback)', function () {
    it('should retrieve a finished batch centroid', function (done) {
      batchCentroid.get(batchCentroidId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#download(batchCentroid, filename, callback)', function () {
    it('should download the batch centroid output file', function (done) {
      batchCentroid.download(batchCentroidId, tmpFileName, function (error, cbFilename) {
        if (!error && cbFilename) {
          fs.exists(cbFilename, function (exists) {
            assert.ok(exists);
            try {
              fs.unlink(cbFilename);
            } catch (err) {}
            done();
          });
        } else {
          console.log(error);
          assert.ok(false);
        } 
      });
    });
  });
  describe('#update(batchCentroid, args, callback)', function () {
    it('should update properties in the batch centroid', function (done) {
      var newName = 'my new name';
      batchCentroid.update(batchCentroidId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        batchCentroid.get(batchCentroidId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(batchCentroid, callback)', function () {
    it('should delete the remote batch centroid', function (done) {
      batchCentroid.delete(batchCentroidId, function (error, data) {
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
    cluster.delete(clusterId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
