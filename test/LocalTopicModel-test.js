var assert = require('assert'),
    bigml = require('../index');

describe('Local Topic Model regression', function () {
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
      "termset": ["cycling", "playing", "tacos", "unanimous court"],
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

  var test_text = "unanimous court UNANIMOUS COURT\n\n " +
        "play the plays PLAYing TACO CYCLE        " +
        "cycling tacos unanimous or court";

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
