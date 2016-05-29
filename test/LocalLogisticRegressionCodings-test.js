var assert = require('assert'),
  bigml = require('../index'),
  constants = require('../lib/constants');

describe('Manage local logistic regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    logisticId1, logisticId2, logisticId3,
    logistic = new bigml.LogisticRegression(),
    logisticResource, logisticFinishedResource,
    localLogisticRegression, prediction = new bigml.Prediction(),
    objective1 = "000000",
    fieldCodings1 = {species: {contrast: [[1, 2, -1, -2]]}}
    prediction1 = {prediction: '5.5', probability: 0.04292825759854652},
    inputData1 = {'species': 'Iris-setosa'},
    objective2 = "000000",
    fieldCodings2 = {species: {other: [[1, 2, -1, -2]]}}
    prediction2 = prediction1,
    objective3 = "000000",
    fieldCodings3 = {species: {dummy: "Iris-setosa"}},
    prediction3 = {prediction: '6.9', probability: 0.02857142857142857};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.update(sourceId,
                    {"fields": {"000000": {"optype": "categorical"}}},
                    function (error, data) {
        dataset.create(sourceId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          datasetId = data.resource;
          logistic.create(datasetId,
            {field_codings: fieldCodings1, objective_field: objective1},
              function (error, data) {
                assert.equal(data.code, bigml.constants.HTTP_CREATED);
                logisticId1 = data.resource;
                logistic.create(datasetId,
                  {field_codings: fieldCodings2, objective_field: objective2},
                    function (error, data) {
                      assert.equal(data.code, bigml.constants.HTTP_CREATED);
                      logisticId2 = data.resource;
                      logistic.create(datasetId,
                        {field_codings: fieldCodings3,
                         objective_field: objective3},
                           function (error, data) {
                             assert.equal(data.code,
                                          bigml.constants.HTTP_CREATED);
                             logisticId3 = data.resource;
                             done();
                            });
                      });
                });
            });
          });
      });
  });

  describe('LocalLogisticRegression(logisticId)', function () {
    it('should create a LocalLogisticRegression from a logistic regression Id',
      function (done) {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticId1);
      if (localLogisticRegression.ready) {
        assert.ok(true);
        done();
      } else {
        localLogisticRegression.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLogisticRegression.predict(inputData1, function (error, data) {
        delete data["distribution"];
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        done();
      });
    });
  });


  describe('LocalLogisticRegression(logisticId)', function () {
    it('should create a LocalLogisticRegression from a logistic regression Id',
      function (done) {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticId2);
      if (localLogisticRegression.ready) {
        assert.ok(true);
        done();
      } else {
        localLogisticRegression.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLogisticRegression.predict(inputData1, function (error, data) {
        delete data["distribution"];
        assert.equal(JSON.stringify(data), JSON.stringify(prediction2));
        done();
      });
    });
  });


  describe('LocalLogisticRegression(logisticId)', function () {
    it('should create a LocalLogisticRegression from a logistic regression Id',
      function (done) {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticId3);
      if (localLogisticRegression.ready) {
        assert.ok(true);
        done();
      } else {
        localLogisticRegression.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLogisticRegression.predict(inputData1, function (error, data) {
        delete data["distribution"];
        assert.equal(JSON.stringify(data), JSON.stringify(prediction3));
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
    logistic.delete(logisticId1, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });

  after(function (done) {
    logistic.delete(logisticId2, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });

  after(function (done) {
    logistic.delete(logisticId3, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
