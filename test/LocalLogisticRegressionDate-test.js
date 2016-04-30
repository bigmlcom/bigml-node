var assert = require('assert'),
  bigml = require('../index'),
  constants = require('../lib/constants');

describe('Manage local logistic regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/price.csv',
    datasetId, dataset = new bigml.Dataset(),
    logisticId, logistic = new bigml.LogisticRegression(),
    logisticResource, logisticFinishedResource,
    localLogisticRegression,
    prediction1 = {"prediction":"Product2","probability":0.9993123276433774,"distribution":[{"category":"Product2","probability":0.9993123276433774},{"category":"Product1","probability":0.0006876723566225701}]},
    inputData1 = {'Price': 1200};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        logistic.create(datasetId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          logisticId = data.resource;
          logisticResource = data;
          logistic.get(logisticResource, true, 'only_model=true',
            function (error, data) {
            logisticFinishedResource = data;
            done();
          });
        });
      });
    });
  });

  describe('LocalLogisticRegression(logisticId)', function () {
    it('should create a LocalLogisticRegression from a logistic regression Id',
      function (done) {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticId);
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
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localLogisticRegression.predict(inputData1);
      assert.equal(JSON.stringify(prediction), JSON.stringify(prediction1));
    });
  });
  describe('LocalLogisticRegression(localRegressionResource)', function () {
    it('should create a LocalLogisticRegression from a logistic regression unfinished resource',
      function (done) {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticResource);
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
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        done();
      });
    });
  });
  describe('LocalLogisticRegression(logisticRegressionFinishedResource)', function () {
    it('should create a LocalLogisticRegression from a logistic regression finished resource',
      function () {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticFinishedResource);
      assert.ok(localLogisticRegression.ready);
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLogisticRegression.predict(inputData1, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
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
    logistic.delete(logisticId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
