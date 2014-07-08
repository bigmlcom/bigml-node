var assert = require('assert'),
  bigml = require('../index'),
  constants = require('../lib/constants');

describe('Manage local model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/grades.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    prediction = new bigml.Prediction(),
    localModel, firstPredictionConfidence, secondPredictionConfidence,
    firstInput = {'Midterm': 10, 'TakeHome': 10}, firstPrediction;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        model.create(datasetId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          modelId = data.resource;
          modelResource = data;
          model.get(modelResource, true, 'only_model=true',
            function (error, data) {
            modelFinishedResource = data;
            prediction.create(modelId, firstInput,
                             {missing_strategy: constants.LAST_PREDICTION},
                             function (error, data) {
                var info = data.object;
                firstPrediction = info.output;
                firstPredictionConfidence = info.confidence.toFixed(5);
                prediction.delete(data.resource, function (error, data) {});
                prediction.create(modelId, firstInput,
                                 {missing_strategy: constants.PROPORTIONAL},
                                 function (error, data) {
                    var info = data.object;
                    secondPrediction = info.output;
                    secondPredictionConfidence = info.confidence.toFixed(5);
                    prediction.delete(data.resource, function (error, data) {});
                    done();
                });
            });
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
      localModel.predict(firstInput, function (error, data) {
        assert.equal(data.prediction, firstPrediction);
        firstPredictionConfidence = data.confidence;
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict(firstInput);
      assert.equal(prediction.prediction, firstPrediction);
      assert.equal(prediction.confidence.toFixed(5), firstPredictionConfidence);
    });
  });
  describe('#predict(inputData, constants.PROPORTIONAL)', function () {
    it('should predict synchronously from input data using proportional missing strategy',
       function () {
      var prediction = localModel.predict(firstInput, constants.PROPORTIONAL);
      assert.equal(prediction.prediction, secondPrediction);
      assert.equal(prediction.confidence.toFixed(5), secondPredictionConfidence);
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
