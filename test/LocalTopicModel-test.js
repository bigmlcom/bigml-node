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

describe(scriptName + ': Local Topic Model regression', function () {
  // The dummy model, test text, and distribution here match a test
  // In the streaming-lda java library and in the python bindings
  var dummy_model = {
    "status": {"code": 5},
    "topic_model": {
      "alpha": 0.08,
      "beta": 0.1,
      "hashed_seed": 0,
      "language": "en",
      "bigrams": true,
      "case_sensitive": false,
      "term_topic_assignments": [[0, 0, 1, 2],
                                 [0, 1, 2, 0],
                                 [1, 2, 0, 0],
                                 [0, 0, 2, 0]],
      "termset": ["cycling", "playing", "shouldn't", "uńąnimous court"],
      "options": {},
      "topics": [{"name": "Topic 1",
                  "id": "000000",
                  "top_terms": ["a", "b"],
                  "probability": 0.1},
                 {"name": "Topic 2",
                  "id": "000001",
                  "top_terms": ["c", "d"],
                  "probability": 0.1},
                 {"name": "Topic 3",
                  "id": "000000",
                  "top_terms": ["e", "f"],
                  "probability": 0.1},
                 {"name": "Topic 4",
                  "id": "000000",
                  "top_terms": ["g", "h"],
                  "probability": 0.1}],
      "fields": {
        "000001": {
          "datatype": "string",
          "name": "TEST TEXT",
          "optype": "text",
          "order": 0,
          "preferred": true,
          "summary": {},
          "term_analysis": {}
        }
      }
    },
    "resource": "topicmodel/aaaaaabbbbbbccccccdddddd"
  };

  var test_text = "uńąnimous court 'UŃĄNIMOUS COURT'\n\n " +
        "`play``the plays PLAYing SHOULDN'T CYCLE        " +
        "cycling shouldn't uńąnimous or court's";

  var expected_distribution = [
    { name: 'Topic 1', probability: 0.1647366 },
    { name: 'Topic 2', probability: 0.1885310 },
    { name: 'Topic 3', probability: 0.4879441 },
    { name: 'Topic 4', probability: 0.1587880 } ];

  var localTopicModel, distribution, i, diff, exp, act;

  describe('LocalTopicModel(dummy_model)', function () {
    it('should make predictions that match python bindings', function (done) {
      localTopicModel = new bigml.LocalTopicModel(dummy_model);
      distribution = localTopicModel.distribution({"TEST TEXT": test_text});

      for (i = 0; i < distribution.length; i++) {
        exp = expected_distribution[i].probability;
        act = distribution[i].probability;
        diff = Math.abs(exp - act);
        assert(expected_distribution[i].name == distribution[i].name &&
               diff < 1e-6, i + " - Expected: " + exp + ", Actual: " + act);
      }
      done();
    });
  });
});
