/**
 * Copyright 2017-2020 BigML
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

var assert = require('assert'),
  bigml = require('../index'),
  constants = require('../lib/constants'),
  path = require('path');
var scriptName = path.basename(__filename);

function formatAPIPrediction(data) {
  var index, probabilities = data.object.probabilities, probability;
  for (index = 0; index < probabilities.length; index++) {
    if (probabilities[index][0] == data.object.output) {
      probability = probabilities[index][1];
      break;
    }
  }
  return {prediction: data.object.output,
          probability: probability};
}

function truncate(number, decimals) {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10.0,
                                                                decimals);
}

describe(scriptName + ': Manage local logistic regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    logisticId1, logisticId2, logisticId3, logisticId4,
    logistic = new bigml.LogisticRegression(),
    logisticResource, logisticFinishedResource,
    localLogisticRegression, prediction = new bigml.Prediction(),
    objective1 = "000000",
    fieldCodings1 = [{"field": "species", "coding": "contrast",
                      "coefficients": [[1, 2, -1, -2]]}],
    prediction1 = {"prediction":"5.0","probability":0.05104},
    inputData1 = {'species': 'Iris-setosa'},
    objective2 = "000000",
    fieldCodings2 = [{"field": "species", "coding": "other",
                      "coefficients": [[1, 2, -1, -2]]}],
    prediction2 = prediction1,
    objective3 = "000000",
    fieldCodings3 = [{"field": "species", "coding": "dummy",
                      "dummy_class": "Iris-setosa"}],
    prediction3 = {"prediction":"5.0","probability":0.04093},
    objective4 = "000000",
    fieldCodings4 = [{"field": "species", "coding": "other",
                      "coefficients": [[1, 2, -1]]}],
    prediction4 = {"prediction":"5.0","probability":0.05104};

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
            {field_codings: fieldCodings1, objective_field: objective1,
             'balance_fields': false},
              function (error, data) {
                assert.equal(data.code, bigml.constants.HTTP_CREATED);
                logisticId1 = data.resource;
                logistic.get(logisticId1, true, function(error, data) {
                  logistic.create(datasetId,
                    {field_codings: fieldCodings2, objective_field: objective2,
                     'balance_fields': false},
                      function (error, data) {
                        assert.equal(data.code, bigml.constants.HTTP_CREATED);
                        logisticId2 = data.resource;
                        logistic.get(logisticId2, true, function(error,data) {
                          logistic.create(datasetId,
                            {field_codings: fieldCodings3,
                             'balance_fields': false,
                             objective_field: objective3},
                               function (error, data) {
                                 assert.equal(data.code,
                                              bigml.constants.HTTP_CREATED);
                                 logisticId3 = data.resource;
                                  logistic.get(logisticId3, true, function(error, data) {
                                    logistic.create(datasetId,
                                      {field_codings: fieldCodings4,
                                       'balance_fields': false,
                                       objective_field: objective4},
                                         function (error, data) {
                                           assert.equal(data.code,
                                                        bigml.constants.HTTP_CREATED);
                                           logisticId4 = data.resource;
                                           done();
                                          });
                                    });
                                  })
                                });
                            });
                        });
                  })
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
        data.probability = truncate(data.probability, 5);
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        prediction.create(logisticId1, inputData1, function (error, data) {
            apiPrediction = formatAPIPrediction(data);
              assert.equal(JSON.stringify(apiPrediction),
                           JSON.stringify(prediction1));
            prediction.delete(data.resource, function (error, data){});
            done();
          });
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
        data.probability = truncate(data.probability, 5);
        assert.equal(JSON.stringify(data), JSON.stringify(prediction2));
        prediction.create(logisticId2, inputData1, function (error, data) {
            apiPrediction = formatAPIPrediction(data);
              assert.equal(JSON.stringify(apiPrediction),
                           JSON.stringify(prediction2));
            prediction.delete(data.resource, function (error, data){});
            done();
          });
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
        data.probability = truncate(data.probability, 5);
        assert.equal(JSON.stringify(data), JSON.stringify(prediction3));
        prediction.create(logisticId3, inputData1, function (error, data) {
            apiPrediction = formatAPIPrediction(data);
              assert.equal(JSON.stringify(apiPrediction),
                           JSON.stringify(prediction3));
            prediction.delete(data.resource, function (error, data){});
            done();
          });
      });
    });
  });

  describe('LocalLogisticRegression(logisticId)', function () {
    it('should create a LocalLogisticRegression from a logistic regression Id',
      function (done) {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticId4);
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
        data.probability = truncate(data.probability, 5);
        assert.equal(JSON.stringify(data), JSON.stringify(prediction4));
        prediction.create(logisticId4, inputData1, function (error, data) {
            apiPrediction = formatAPIPrediction(data);
              assert.equal(JSON.stringify(apiPrediction),
                           JSON.stringify(prediction4));
            prediction.delete(data.resource, function (error, data){});
            done();
          });
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

  after(function (done) {
    logistic.delete(logisticId4, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });

});
