var assert = require('assert'),
  bigml = require('../index');

describe('Manage evaluation objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(),
    ensembleId, ensemble = new bigml.Ensemble(),
    logisticId, logistic = new bigml.LogisticRegression(),
    evaluationId, evaluation = new bigml.Evaluation(),
    trainingDatasetId, testDatasetId;

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
                model.create(trainingDatasetId, undefined,
                             function (error, data) {
                  assert.equal(data.code, bigml.constants.HTTP_CREATED);
                  modelId = data.resource;
                  ensemble.create(trainingDatasetId, undefined,
                               function (error, data) {
                    assert.equal(data.code, bigml.constants.HTTP_CREATED);
                    ensembleId = data.resource;
                    logistic.create(trainingDatasetId, undefined,
                                 function (error, data) {
                      assert.equal(data.code, bigml.constants.HTTP_CREATED);
                      logisticId = data.resource;
                      done();
                    });
                  });
                });
              });
          });
      });
    });
  });

  describe('#create(ensemble, testDatasetId, args, callback)', function () {
    it('should create an evaluation for an ensemble and a dataset', function (done) {
      evaluation.create(ensembleId, testDatasetId, undefined,
                        function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          evaluationId = data.resource;
          evaluation.delete(evaluationId, function (error, data) {
            assert.equal(error, null);
            done();
          });
        });
    });
  });
  describe('#create(logistic, testDatasetId, args, callback)', function () {
    it('should create an evaluation for a logistic regression and a dataset',
      function (done) {
      evaluation.create(logisticId, testDatasetId, undefined,
                        function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          evaluationId = data.resource;
          evaluation.delete(evaluationId, function (error, data) {
            assert.equal(error, null);
            done();
          });
        });
    });
  });
  describe('#create(model, testDatasetId, args, callback)', function () {
    it('should create an evaluation for a model and a dataset', function (done) {
      evaluation.create(modelId, testDatasetId, undefined,
                        function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          evaluationId = data.resource;
          done();
        });
    });
  });
  describe('#get(evaluation, finished, query, callback)', function () {
    it('should retrieve a finished evaluation', function (done) {
      evaluation.get(evaluationId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(evaluation, args, callback)', function () {
    it('should update properties in the evaluation', function (done) {
      var newName = 'my new name';
      evaluation.update(evaluationId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        evaluation.get(evaluationId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(evaluation, callback)', function () {
    it('should delete the remote evaluation', function (done) {
      evaluation.delete(evaluationId, function (error, data) {
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
    model.delete(modelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    ensemble.delete(ensembleId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    logistic.delete(logisticId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
