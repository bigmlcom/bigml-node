var assert = require('assert'),
  bigml = require('../index');

describe('Manage local model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel, firstPredictionConfidence, secondPredictionConfidence;

  before(function (done) {
    var tokenMode = {'fields': {'000001': {'term_analysis': {'token_mode': 'all'}}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, tokenMode, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        model.create(datasetId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          modelId = data.resource;
          modelResource = data;
          model.get(modelResource, true, 'only_model=true', function (error, data) {
            modelFinishedResource = data;
            done();
          });
        });
      });
    });
  });

  describe('LocalModel(modelId)', function () {
    it('should create a localModel from a model Id', function (done) {
      localModel = new bigml.LocalModel(modelId);
      if (localModel.ready) {
        assert.ok(true);
        done();
      } else {
        localModel.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predict({'Message': 'mobile mobile call'}, function (error, data) {
        assert.equal(data.prediction, 'spam');
        firstPredictionConfidence = data.confidence;
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict({'Message': 'Ok'});
      assert.equal(prediction.prediction, 'ham');
      secondPredictionConfidence = prediction.confidence;
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
    model.delete(modelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
