var assert = require('assert'),
  bigml = require('../index'),
  fs = require('fs');

describe('Manage batch topic distribution objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    topicDistributionId, topicModel = new bigml.TopicModel(),
    batchTopicDistributionId,
    batchTopicDistribution = new bigml.BatchTopicDistribution(),
    trainingDatasetId, testDatasetId,
    tmpFileName = '/tmp/testBatchTopicDistribution.csv',
    seed = "BigML tests",
    topicModelArgs = {topicmodel_seed: seed, seed: seed};

  before(function (done) {
    var seed = 'BigML, Machine Learning made simple',
      sampleRate = 0.8,
      textField = {'fields': {'000001': {'optype': 'text'}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, textField, function (error, data) {
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
                    topicModel.create(trainingDatasetId, topicModelArgs, true,
                      function (error, data) {
                      assert.equal(data.code, bigml.constants.HTTP_CREATED);
                      topicModelId = data.resource;
                      done();
                    });
                  });
              });
          });
        });
      });
    });
  });

  describe('#create(topicModel, testDatasetId, args, callback)', function () {
    it('should create a batch topicDistribution for a topicModel and a dataset',
      function (done) {
      batchTopicDistribution.create(topicModelId, testDatasetId, undefined,
          true,
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          batchTopicDistributionId = data.resource;
          done();
        });
    });
  });
  describe('#get(batchTopicDistribution, finished, query, callback)',
    function () {
    it('should retrieve a finished batch topic distribution', function (done) {
      batchTopicDistribution.get(batchTopicDistributionId, true,
        function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#download(batchTopicDistribution, filename, callback)',
    function () {
    it('should download the batch topic distribution output file',
      function (done) {
      batchTopicDistribution.download(batchTopicDistributionId,
                                      tmpFileName,
        function (error, cbFilename) {
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
  describe('#update(batchTopicDistribution, args, callback)', function () {
    it('should update properties in the batch topic distribution',
      function (done) {
      var newName = 'my new name';
      batchTopicDistribution.update(batchTopicDistributionId,
                                    {name: newName},
        function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        batchTopicDistribution.get(batchTopicDistributionId, true,
          function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(batchTopicDistribution, callback)', function () {
    it('should delete the remote batch topic distribution', function (done) {
      batchTopicDistribution.delete(batchTopicDistributionId,
        function (error, data) {
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
    topicModel.delete(topicModelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
