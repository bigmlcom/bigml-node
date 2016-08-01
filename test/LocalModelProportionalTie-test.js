var assert = require('assert'),
  bigml = require('../index'),
  constants = require('../lib/constants');

function truncate(number, decimals) {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10.0,
                                                                decimals);
}
describe('Manage local model objects: tie breaks in predictions', function () {
  var sourceId, source = new bigml.Source(),
    path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel, prediction = new bigml.Prediction(), remotePrediction1,
    inputData1 = {"sepal width": 2.7, "sepal length": 5.8};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        model.create(datasetId, {"balance_objective": true,
                                 "input_fields": ["sepal length",
                                                  "sepal width"]},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          modelId = data.resource;
          modelResource = data;
          model.get(modelResource, true, 'only_model=true', function (error, data) {
            modelFinishedResource = data;
              prediction.create(modelId, inputData1, {missing_strategy: 1},
                function (error, data) {
                remotePrediction1 = data;
                done();
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
      localModel.predict(inputData1, constants.PROPORTIONAL,
        function (error, data) {
        assert.equal(remotePrediction1.object.output, data.prediction);
        assert.equal(remotePrediction1.object.confidence,
                     truncate(data.confidence, 5));
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
    model.delete(modelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    prediction.delete(remotePrediction1.resource, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
