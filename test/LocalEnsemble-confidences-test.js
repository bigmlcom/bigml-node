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
  path = require('path');
var scriptName = path.basename(__filename);

function toList(confidences) {
  var index, len = confidences.length, confidence, list = [];
  for (index = 0; index < len; index++) {
    confidence = confidences[index];
    list.push([confidence["category"],
               Math.round(confidence["confidence"] * 100000) / 100000]);
  }
  return list;
}

describe(scriptName + ': Manage local ensemble objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    ensembleId, ensemble = new bigml.Ensemble(), ensembleResource,
    ensembleArgs = {missing_splits: false, number_of_models: 2,
                    sample_rate: 0.80, seed: "BigML", ensemble_sample: {seed: "BigML"}},
    prediction = new bigml.Prediction(), inputData = {'petal width': 0.5},
    method = 1, ensembleFinishedResource, modelsList, index,
    model = new bigml.Model(), reference,
    localEnsemble, len, finishedModelsList = [], missingStrategy = 1,
    confidences = '[["Iris-setosa",0.33385],["Iris-versicolor",0.26136],["Iris-virginica",0.16568]]';

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        ensemble.create(datasetId, ensembleArgs, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          ensembleId = data.resource;
          ensembleResource = data;
          ensemble.get(ensembleResource, true, undefined, function (error, data) {
            ensembleFinishedResource = data;
            modelsList = data.object.models;
            len = modelsList.length;
            function retrievePrediction(error, data) {
              prediction.get(data, true, function (error, data) {
                reference = data.object.confidences;
                assert.equal(JSON.stringify(reference), confidences);
                done();
              });
            }
            function retrieveModel(error, data) {
              finishedModelsList.push(data);
              if (finishedModelsList.length === len) {
                prediction.create(ensembleId, inputData,
                                  {combiner: method,
                                   'missing_strategy': missingStrategy},
                                  retrievePrediction);
              }
            }
            for (index = 0; index < len; index++) {
              model.get(modelsList[index], true, 'only_model=true', retrieveModel);
            }
          });
        });
      });
    });
  });

  describe('LocalEnsemble(ensemble)', function () {
    it('should create a localEnsemble from an ensemble Id', function (done) {
      localEnsemble = new bigml.LocalEnsemble(ensembleId);
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
      localEnsemble.predictConfidence(inputData, missingStrategy,
        function (error, data) {

          assert.equal(JSON.stringify(toList(data)),
                       JSON.stringify(reference));
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
    ensemble.delete(ensembleId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });

});
