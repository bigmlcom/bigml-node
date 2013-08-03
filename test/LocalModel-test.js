var assert = require('assert'),
  bigml = require('../index');

describe('Manage local model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel, firstPredictionConfidence, secondPredictionConfidence;

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
      localModel.predict({'petal length': 1}, function (error, data) {
        assert.equal(data.prediction, 'Iris-setosa');
        firstPredictionConfidence = data.confidence;
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict({'petal length': 3});
      assert.equal(prediction.prediction, 'Iris-virginica');
      secondPredictionConfidence = prediction.confidence;
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data keyed by field id', 
       function (done) {
      localModel.predict({'000002': 1}, function (error, data) {
        assert.equal(data.prediction, 'Iris-setosa');
        assert.equal(data.confidence, firstPredictionConfidence);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data keyed by field id',
       function () {
      var prediction = localModel.predict({'000002': 3});
      assert.equal(prediction.prediction, 'Iris-virginica');
      assert.equal(prediction.confidence, secondPredictionConfidence);
    });
  });
  describe('LocalModel(modelResource)', function () {
    it('should create a localModel from a model unfinished resource', function (done) {
      localModel = new bigml.LocalModel(modelResource);
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
      localModel.predict({'petal length': 1}, function (error, data) {
        assert.equal(data.prediction, 'Iris-setosa');
        done();
      });
    });
  });
  describe('LocalModel(modelFinishedResource)', function () {
    it('should create a localModel from a model finished resource', function () {
      localModel = new bigml.LocalModel(modelFinishedResource);
      assert.ok(localModel.ready);
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function (done) {
      localModel.predict({'petal length': 1}, function (error, data) {
        assert.equal(data.prediction, 'Iris-setosa');
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
    dataset.delete(modelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
