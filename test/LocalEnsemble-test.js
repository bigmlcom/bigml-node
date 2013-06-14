var assert = require('assert'),
  Source = require('../lib/Source'),
  Dataset = require('../lib/Dataset'),
  Ensemble = require('../lib/Ensemble'),
  Model = require('../lib/Model'),
  Prediction = require('../lib/Prediction');
  constants = require('../lib/constants'),
  LocalEnsemble = require('../lib/LocalEnsemble');

describe('Manage local ensemble objects', function () {
  var sourceId, source = new Source(), path = './data/iris.csv',
    datasetId, dataset = new Dataset(),
    ensembleId, ensemble = new Ensemble(), ensembleResource,
    prediction = new Prediction(), inputData = {'petal length': 1}, method = 1,
    ensembleFinishedResource, modelsList, index, model = new Model(), reference,
    localEnsemble, len, finishedModelsList = [];

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, constants.HTTP_CREATED);
        datasetId = data.resource;
        ensemble.create(datasetId, {number_of_models: 2, sample_rate: 0.99}, function (error, data) {
          assert.equal(data.code, constants.HTTP_CREATED);
          ensembleId = data.resource;
          ensembleResource = data;
          ensemble.get(ensembleResource, true, 'limit=-1', function (error, data) {
            ensembleFinishedResource = data;
            modelsList = data.object.models;
            len = modelsList.length;
            for (index = 0; index < len; index++) {
              model.get(modelsList[index], true, 'limit=-1', function (error, data) {
                finishedModelsList.push(data);
                if (finishedModelsList.length === len) {
                  prediction.create(ensembleId, inputData, {combiner: method}, function (error, data) {
                    prediction.get(data, true, function (error, data) {
                      reference = data.object.output;
                      done();
                    });
                  });
                }
              });
            }
          });
        });
      });
    });
  });

  describe('LocalEnsemble(ensemble)', function () {
    it('should create a localEnsemble from an ensemble Id', function (done) {
      localEnsemble = new LocalEnsemble(ensembleId);
      if (localEnsemble.ready) {
        assert.ok(true);
        done();
      } else {
        localEnsemble.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localEnsemble.predict(inputData, method, function (error, data) {
        assert.equal(data.prediction, reference);
        done();
      });
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, method);
      assert.equal(result.prediction, reference);
    });
  });
  describe('LocalEnsemble(ensembleResource)', function () {
    it('should create a localEnsemble from an ensemble unfinished resource', function (done) {
      localEnsemble = new LocalEnsemble(ensembleResource);
      if (localEnsemble.ready) {
        assert.ok(true);
        done();
      } else {
        localEnsemble.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localEnsemble.predict(inputData, method, function (error, data) {
        assert.equal(data.prediction, reference);
        done();
      });
    });
  });
  describe('LocalEnsemble(ensembleFinishedResource)', function () {
    it('should create a localEnsemble from an ensemble finished resource', function (done) {
      localEnsemble = new LocalEnsemble(ensembleFinishedResource);
      if (localEnsemble.ready) {
        assert.ok(true);
        done();
      } else {
        localEnsemble.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict asynchronously from input data', function (done) {
      localEnsemble.predict(inputData, method, function (error, data) {
        assert.equal(data.prediction, reference);
        done();
      });
    });
  });
  describe('LocalEnsemble(finishedModelsList)', function () {
    it('should create a localEnsemble from a finished models list', function () {
      localEnsemble = new LocalEnsemble(finishedModelsList);
      assert.ok(localEnsemble.ready);
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, method);
      assert.equal(result.prediction, reference);
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
    dataset.delete(ensembleId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });

})
