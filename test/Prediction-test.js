var assert = require("assert"),
  Source = require('../lib/Source'),
  Dataset = require('../lib/Dataset'),
  Model = require('../lib/Model'),
  Prediction = require('../lib/Prediction'),
  constants = require('../lib/constants');

describe('Manage prediction objects', function(){
  var sourceId, source = new Source(), path = './data/iris.csv',
    datasetId, dataset = new Dataset(),
    modelId, model = new Model(),
    predictionId, prediction = new Prediction(),
    inputData = {'petal length': 1}, testPrediction = 'Iris-setosa';

  before(function (done) {
      source.create(path, undefined, function (error, data) {
          assert.equal(data.code, constants.HTTP_CREATED);
          sourceId = data.resource;
          dataset.create(sourceId, undefined, function (error, data) {
              assert.equal(data.code, constants.HTTP_CREATED);
              datasetId = data.resource;
              model.create(datasetId, undefined, function (error, data) {
                  assert.equal(data.code, constants.HTTP_CREATED);
                  modelId = data.resource;
                  done();
              });
          });
      });
  });

  describe('#create(model, inputData, args, callback)', function(){
    it('should create a prediction from a model', function(done){
        prediction.create(modelId, inputData, undefined, function (error, data) {
            assert.equal(data.code, constants.HTTP_CREATED);
            predictionId = data.resource;
            done();
        });
    })
  })
  describe('#get(prediction, finished, query, callback)', function(){
    it('should retrieve a finished prediction', function(done){
        prediction.get(predictionId, true, function (error, data) {
            if (data.object.status.code === constants.FINISHED) {
              var objective = data.object.objective_field;
              if (!objective) {
                objective = data.object.objective_fields[0];
              }
              assert.equal(data.object.prediction[objective], testPrediction);
              done();
            }
      });
    })
  })
  describe('#update(prediction, args, callback)', function(){
    it('should update properties in the prediction', function(done){
        var newName = 'my new name';
        prediction.update(predictionId, {name: newName}, function (error, data) {
            assert.equal(data.code, constants.HTTP_ACCEPTED);
            prediction.get(predictionId, true, function (errorcb, datacb) {
                if (datacb.object.status.code === constants.FINISHED &&
                    datacb.object.name == newName) {
                  assert.ok(true);
                  done();
                }
            });
      });
    })
  })
  describe('#delete(prediction, callback)', function(){
    it('should delete the remote prediction', function(done){
        prediction.delete(predictionId, function (error, data) {
            assert.equal(error, null);
            done();
        });
    })
  })

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
})
