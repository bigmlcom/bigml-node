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

function checkProbability(distribution1, distribution2) {
  var dec = 1000;
  assert.equal(distribution1.length, distribution2.length);
  for (var index = 0; index < distribution1.length; index++) {
    probability = distribution2[index].probability
    if (typeof distribution2[index].probability == 'undefined') {
      probability = distribution2[index];
    }
    assert.equal(Math.round(distribution1[index].probability * dec) / dec,
                 Math.round(probability * dec) / dec);
  }
}

describe(scriptName + ': Manage local topic model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    topicModelId, topicModel = new bigml.TopicModel(), topicModelResource,
    topicModelFinishedResource, seed = 'BigML tests',
    localTopicModel,
    distribution1 = [
      { name: 'Topic 00', probability: 0.944619588062211 },
      { name: 'Topic 01', probability: 0.003257671290458176 },
      { name: 'Topic 02', probability: 0.002627154266498529 },
      { name: 'Topic 03', probability: 0.002627154266498529 },
      { name: 'Topic 04', probability: 0.002627154266498529 },
      { name: 'Topic 05', probability: 0.002627154266498529 },
      { name: 'Topic 06', probability: 0.02847835224884405 },
      { name: 'Topic 07', probability: 0.002627154266498529 },
      { name: 'Topic 08', probability: 0.002627154266498529 },
      { name: 'Topic 09', probability: 0.002627154266498529 },
      { name: 'Topic 10', probability: 0.002627154266498529 },
      { name: 'Topic 11', probability: 0.002627154266498529 } ],
    distribution2 = [
      { name: 'Topic 00', probability: 0.00741399762752076 },
      { name: 'Topic 01', probability: 0.00741399762752076 },
      { name: 'Topic 02', probability: 0.01453143534994069 },
      { name: 'Topic 03', probability: 0.00741399762752076 },
      { name: 'Topic 04', probability: 0.00741399762752076 },
      { name: 'Topic 05', probability: 0.8757413997627521 },
      { name: 'Topic 06', probability: 0.00741399762752076 },
      { name: 'Topic 07', probability: 0.00741399762752076 },
      { name: 'Topic 08', probability: 0.00741399762752076 },
      { name: 'Topic 09', probability: 0.01453143534994069 },
      { name: 'Topic 10', probability: 0.03588374851720048 },
      { name: 'Topic 11', probability: 0.00741399762752076 } ],
    distribution3 = [
      { name: 'Topic 00', probability: 0.08333333333333334 },
      { name: 'Topic 01', probability: 0.08333333333333334 },
      { name: 'Topic 02', probability: 0.08333333333333334 },
      { name: 'Topic 03', probability: 0.08333333333333334 },
      { name: 'Topic 04', probability: 0.08333333333333334 },
      { name: 'Topic 05', probability: 0.08333333333333334 },
      { name: 'Topic 06', probability: 0.08333333333333334 },
      { name: 'Topic 07', probability: 0.08333333333333334 },
      { name: 'Topic 08', probability: 0.08333333333333334 },
      { name: 'Topic 09', probability: 0.08333333333333334 },
      { name: 'Topic 10', probability: 0.08333333333333334 },
      { name: 'Topic 11', probability: 0.08333333333333334 } ];


  before(function (done) {
    var tokenMode = {'fields': {
                      '000001': {'term_analysis': {'token_mode': 'all'}}}},
      textField = {'fields': {'000001': {'optype': 'text'}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, textField, function (error, data) {
          dataset.create(sourceId, tokenMode, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            topicModel.create(datasetId, {seed: seed, topicmodel_seed: seed},
              function (error, data) {
                assert.equal(data.code, bigml.constants.HTTP_CREATED);
                topicModelId = data.resource;
                topicModelResource = data;
                topicModel.get(topicModelResource, true, 'only_model=true',
                  function (error, data) {
                    topicModelFinishedResource = data;
                    done();
                  });
            });
          });
        });
      });
    });
  });

  describe('LocalTopicModel(topicModelId)', function () {
    it('should create a localTopicModel from a topicModel Id',
      function (done) {
      localTopicModel = new bigml.LocalTopicModel(topicModelId);
      if (localTopicModel.ready) {
        assert.ok(true);
        done();
      } else {
        localTopicModel.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#topicDistribution(inputData, callback)', function () {
    it('should predict topic distributions asynchronously from input data',
      function (done) {
      var inputData = {'Type': 'ham', 'Message': 'mobile mobile call'};
      localTopicModel.distribution(inputData, function (error, data) {
        checkProbability(data, distribution1);
        var topicDistribution = new bigml.TopicDistribution();
        topicDistribution.create(topicModelId, inputData,
            function (error, data) {
            checkProbability(
              distribution1,
              data.object.topic_distribution.result);
            topicDistribution.delete(data.resource, function (error, data) {
              assert.equal(error, null);
              done();
            });
        });
      });
    });
  });
  describe('#topicDistribution(inputData)', function () {
    it('should predict topic distribution synchronously from input data',
      function (done) {
      var inputData = {'Type': 'ham', 'Message': 'Ok'};
      var distribution = localTopicModel.distribution(inputData);
      checkProbability(distribution, distribution2);
      var topicDistribution = new bigml.TopicDistribution();
      topicDistribution.create(topicModelId, inputData,
          function (error, data) {
          checkProbability(
            distribution,
            data.object.topic_distribution.result);
          topicDistribution.delete(data.resource, function (error, data) {
            assert.equal(error, null);
            done();
          });
      });
    });
  });
  describe('#topicDistribution(inputData)', function () {
    it('should predict topic Distribution synchronously from empty input data',
      function (done) {
      var inputData = {};
      var distribution = localTopicModel.distribution(inputData);
      checkProbability(distribution, distribution3);
      var topicDistribution = new bigml.TopicDistribution();
      inputData = {"Type":"", "Message":""};
      topicDistribution.create(topicModelId, inputData,
          function (error, data) {
          checkProbability(
            distribution,
            data.object.topic_distribution.result);
          topicDistribution.delete(data.resource, function (error, data) {
            assert.equal(error, null);
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
    topicModel.delete(topicModelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
