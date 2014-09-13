var assert = require('assert'),
  bigml = require('../index');

describe('Manage anomaly score objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/tiny_kdd.csv',
    datasetId, dataset = new bigml.Dataset(),
    anomalyId, anomaly = new bigml.Anomaly(),
    anomalyScoreId, anomalyScore = new bigml.AnomalyScore(),
    inputData = {'src_bytes': 350},
    testAnomalyScore = 0.92618;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        anomaly.create(datasetId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          anomalyId = data.resource;
          done();
        });
      });
    });
  });

  describe('#create(anomaly, inputData, args, callback)', function () {
    it('should create an anomaly score from an anomaly detector',
      function (done) {
        anomalyScore.create(anomalyId, inputData, undefined,
          function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            anomalyScoreId = data.resource;
            done();
        });
    });
  });
  describe('#get(anomalyScore, finished, query, callback)', function () {
    it('should retrieve a finished anomaly score', function (done) {
      anomalyScore.get(anomalyScoreId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          var anomalyScoreValue = data.object.score;
          assert.equal(anomalyScoreValue, testAnomalyScore);
          done();
        }
      });
    });
  });
  describe('#update(anomalyScore, args, callback)', function () {
    it('should update properties in the anomaly score', function (done) {
      var newName = 'my new name';
      anomalyScore.update(anomalyScoreId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        anomalyScore.get(anomalyScoreId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(anomalyScore, callback)', function () {
    it('should delete the remote anomaly score', function (done) {
      anomalyScore.delete(anomalyScoreId, function (error, data) {
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
    anomaly.delete(anomalyId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
