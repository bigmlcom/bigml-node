var assert = require('assert'),
  bigml = require('../index');

function checkProbability(distribution1, distribution2) {
  var dec = 1000;
  assert.equal(distribution1.length, distribution2.length);
  for (var index = 0; index < distribution1.length; index++) {
    probability = distribution2[index].probability
    if (typeof distribution2[index].probability == 'undefined') {
      probability = distribution2[index];
    }
    assert.equal(Math.round(distribution1[index].probability * dec) / dec,
                 Math.round(probability * dec) / dec);
  }
}

describe('Manage local topic model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    topicModelId, topicModel = new bigml.TopicModel(), topicModelResource,
    topicModelFinishedResource, seed = 'BigML tests',
    localTopicModel,
    distribution1 = [
      { name: 'Topic 00', probability: 0.009534706331045004 },
      { name: 'Topic 01', probability: 0.009534706331045004 },
      { name: 'Topic 02', probability: 0.8905415713196034 },
      { name: 'Topic 03', probability: 0.009534706331045004 },
      { name: 'Topic 04', probability: 0.014111365369946607 },
      { name: 'Topic 05', probability: 0.009534706331045004 },
      { name: 'Topic 06', probability: 0.009534706331045004 },
      { name: 'Topic 07', probability: 0.009534706331045004 },
      { name: 'Topic 08', probability: 0.009534706331045004 },
      { name: 'Topic 09', probability: 0.009534706331045004 },
      { name: 'Topic 10', probability: 0.009534706331045004 },
      { name: 'Topic 11', probability: 0.009534706331045004 } ],
    distribution2 = [
      { name: 'Topic 00', probability: 0.023277467411545627 },
      { name: 'Topic 01', probability: 0.023277467411545627 },
      { name: 'Topic 02', probability: 0.023277467411545627 },
      { name: 'Topic 03', probability: 0.023277467411545627 },
      { name: 'Topic 04', probability: 0.023277467411545627 },
      { name: 'Topic 05', probability: 0.023277467411545627 },
      { name: 'Topic 06', probability: 0.743947858472998 },
      { name: 'Topic 07', probability: 0.023277467411545627 },
      { name: 'Topic 08', probability: 0.023277467411545627 },
      { name: 'Topic 09', probability: 0.023277467411545627 },
      { name: 'Topic 10', probability: 0.023277467411545627 },
      { name: 'Topic 11', probability: 0.023277467411545627 } ],
    distribution3 = [
      { name: 'Topic 00', probability: 0.08333333333333334 },
      { name: 'Topic 01', probability: 0.08333333333333334 },
      { name: 'Topic 02', probability: 0.08333333333333334 },
      { name: 'Topic 03', probability: 0.08333333333333334 },
      { name: 'Topic 04', probability: 0.08333333333333334 },
      { name: 'Topic 05', probability: 0.08333333333333334 },
      { name: 'Topic 06', probability: 0.08333333333333334 },
      { name: 'Topic 07', probability: 0.08333333333333334 },
      { name: 'Topic 08', probability: 0.08333333333333334 },
      { name: 'Topic 09', probability: 0.08333333333333334 },
      { name: 'Topic 10', probability: 0.08333333333333334 },
      { name: 'Topic 11', probability: 0.08333333333333334 } ];


  before(function (done) {
    var tokenMode = {'fields': {
                      '000001': {'term_analysis': {'token_mode': 'all'}}}},
      textField = {'fields': {'000001': {'optype': 'text'}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, textField, function (error, data) {
          dataset.create(sourceId, tokenMode, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            topicModel.create(datasetId, {seed: seed, topicmodel_seed: seed},
              function (error, data) {
                assert.equal(data.code, bigml.constants.HTTP_CREATED);
                topicModelId = data.resource;
                topicModelResource = data;
                topicModel.get(topicModelResource, true, 'only_model=true',
                  function (error, data) {
                    topicModelFinishedResource = data;
                    done();
                  });
            });
          });
        });
      });
    });
  });

  describe('LocalTopicModel(topicModelId)', function () {
    it('should create a localTopicModel from a topicModel Id',
      function (done) {
      localTopicModel = new bigml.LocalTopicModel(topicModelId);
      if (localTopicModel.ready) {
        assert.ok(true);
        done();
      } else {
        localTopicModel.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#topicDistribution(inputData, callback)', function () {
    it('should predict topic distributions asynchronously from input data',
      function (done) {
      var inputData = {'Type': 'ham', 'Message': 'mobile mobile call'};
      localTopicModel.distribution(inputData, function (error, data) {
        checkProbability(data, distribution1);
        var topicDistribution = new bigml.TopicDistribution();
        topicDistribution.create(topicModelId, inputData,
            function (error, data) {
            checkProbability(
              distribution1,
              data.object.topic_distribution.result);
            topicDistribution.delete(data.resource, function (error, data) {
              assert.equal(error, null);
              done();
            });
        });
      });
    });
  });
  describe('#topicDistribution(inputData)', function () {
    it('should predict topic distribution synchronously from input data',
      function (done) {
      var inputData = {'Type': 'ham', 'Message': 'Ok'};
      var distribution = localTopicModel.distribution(inputData);
      checkProbability(distribution, distribution2);
      var topicDistribution = new bigml.TopicDistribution();
      topicDistribution.create(topicModelId, inputData,
          function (error, data) {
          checkProbability(
            distribution,
            data.object.topic_distribution.result);
          topicDistribution.delete(data.resource, function (error, data) {
            assert.equal(error, null);
            done();
          });
      });
    });
  });
  describe('#topicDistribution(inputData)', function () {
    it('should predict topic Distribution synchronously from empty input data',
      function (done) {
      var inputData = {};
      var distribution = localTopicModel.distribution(inputData);
      checkProbability(distribution, distribution3);
      var topicDistribution = new bigml.TopicDistribution();
      inputData = {"Type":"", "Message":""};
      topicDistribution.create(topicModelId, inputData,
          function (error, data) {
          checkProbability(
            distribution,
            data.object.topic_distribution.result);
          topicDistribution.delete(data.resource, function (error, data) {
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
