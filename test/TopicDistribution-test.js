var assert = require('assert'),
  bigml = require('../index');

describe('Manage topic distribution objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    topicModelId, topicModel = new bigml.TopicModel(),
    topicDistributionId, topicDistribution = new bigml.TopicDistribution(),
    inputData = {"Message": "mobile"},
    testDistribution = [0.00741,0.00741,0.00741,0.00741,0.00741,
                        0.00741,0.00741,0.91845,0.00741,0.00741,
                        0.00741,0.00741],
    inputDataId = {'000001': "mobile"},
    seed = "BigML tests";
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
            topicModel.create(datasetId, {topicmodel_seed: seed, seed: seed},
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
  describe('#create(topicModel, inputData, args, callback)', function () {
    it('should create a topicDistribution from a topicModel', function (done) {
      topicDistribution.create(topicModelId, inputData, undefined,
        function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        topicDistributionId = data.resource;
        done();
      });
    });
  });
  describe('#create(topicModel, inputDataId, args, callback)', function () {
    it('should create a topicDistribution from a topicModel using ids' +
       'in input data',
      function (done) {
      topicDistribution.create(topicModelId, inputDataId, undefined,
        function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        topicDistributionId = data.resource;
        done();
      });
    });
  });
  describe('#get(topicDistribution, finished, query, callback)', function () {
    it('should retrieve a finished topicDistribution', function (done) {
      topicDistribution.get(topicDistributionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          var distribution = data.object.topic_distribution.result;
          assert.equal(JSON.stringify(distribution),
                       JSON.stringify(testDistribution));
          done();
        }
      });
    });
  });
  describe('#update(topicDistribution, args, callback)', function () {
    it('should update properties in the topicDistribution', function (done) {
      var newName = 'my new name';
      topicDistribution.update(topicDistributionId, {name: newName},
        function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        topicDistribution.get(topicDistributionId, true,
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
  describe('#delete(topicDistribution, callback)', function () {
    it('should delete the remote topicDistribution', function (done) {
      topicDistribution.delete(topicDistributionId, function (error, data) {
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
    topicModel.delete(topicModelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
