/**
 * Copyright 2016-2020 BigML
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
"use strict";
var NODEJS = ((typeof process !== 'undefined') && process &&
  process.RUNNING_IN_NODEJS === 'true');
var PATH = (NODEJS) ? "./" : "";

if (NODEJS) {
  var path = require('path');
  var fs = require('fs');
  var util = require('util');
  var events = require('events');
  var TopicModel = require('./TopicModel');
  var Snowball = require('snowball');
  var MersenneTwister = require('mersenne-twister');
  var BigML = require('./BigML');
}
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');


// End of imports section --- DO NOT REMOVE

var QUOTE_CODE = 39;
var ZERO_CODE = 48;
var NINE_CODE = 57;
var UPPER_BEGIN = 65;
var UPPER_END = 90;
var LOWER_BEGIN = 97;
var LOWER_END = 122;
var ASCII_END = 127;

var MAXIMUM_TERM_LENGTH = 30;
var MIN_UPDATES = 16;
var MAX_UPDATES = 512;
var SAMPLES_PER_TOPIC = 128;

var CODE_TO_NAME = {
    "da": "danish",
    "nl": "dutch",
    "en": "english",
    "fi": "finnish",
    "fr": "french",
    "de": "german",
    "hu": "hungarian",
    "it": "italian",
    "nn": "norwegian",
    "pt": "portuguese",
    "ro": "romanian",
    "ru": "russian",
    "es": "spanish",
    "sv": "swedish",
    "tr": "turkish"
}


function isalnum(astr, idx) {
  var code = astr.charCodeAt(idx);

  if (code >= ZERO_CODE && code <= LOWER_END) {
    if (code <= NINE_CODE) return true;
    if (code >= UPPER_BEGIN && code <= UPPER_END) return true;
    if (code >= LOWER_BEGIN && code <= LOWER_END) return true;
    return false;
  } else if (code >= ASCII_END) {
    // This will break for CJK / Arabic alphabets, but so will everything else.
    if (astr.charAt(idx).toLowerCase() != astr.charAt(idx).toUpperCase())
      return true;
    else return false;
  } else return false;
}

/**
 * LocalTopicModel: Simplified local object for the topicmodel resource.
 * @constructor
 */
function LocalTopicModel(resource, connection) {
  /**
   * Constructor for the LocalTopicModel local object.
   *
   * @param {object} resource BigML topicmodel resource
   * @param {object} connection BigML connection
   */

  var self, topicModel, fillStructure, language, i, tstem, filename;

  this.connection = utils.getDefaultConnection(connection);
  this.resourceConnector = new TopicModel(this.connection);
  this.resType = "topicmodel";
  this.fields = null;
  this.ready = null;
  this.stemmer = null;
  this.ready = null;
  this.seed = null;
  this.caseSensitive = null;
  this.bigrams = null;
  this.ntopics = null;
  this.temp = null;
  this.uniformDocAssignments = null;
  this.uniformNormalizer = null;
  this.phi = null;
  this.termToIndex = null;
  this.topics = null;
  this.term_topic_assignments = null;

  self = this;

  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the TopicModel structure.
     *
     * @param {object} error Error info
     * @param {object} resource Model's resource info
     */
    var model, status, fields, index, fieldId, field, assignments, beta,
        sums, nterms, norm, i, j, k, w;

    if (error) {
      throw new Error('Cannot create the TopicModel instance. Could not' +
                      ' retrieve the resource: ' + error);

    }

    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }
    if ((typeof resource.topic_model) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        model = resource.topic_model;

        self.topics = model.topics;
        if (model.hasOwnProperty("language")) {
          language = model.language;
          if (CODE_TO_NAME.hasOwnProperty(language)) {
            self.stemmer = new Snowball(CODE_TO_NAME[language]);
          }
        }

        self.termTopicAssignments = model.term_topic_assignments;
        self.termToIndex = {};

        for (i = 0; i < model.termset.length; i++) {
          tstem = self.stem(model.termset[i]);
          self.termToIndex[tstem] = i;
        }

        self.seed = Math.abs(model.hashed_seed);
        self.caseSensitive = model.case_sensitive;
        self.bigrams = model.bigrams;

        self.ntopics = model.term_topic_assignments[0].length;
        self.alpha = model.alpha;
        self.ktimesalpha = self.ntopics * self.alpha;

        self.uniformDocAssignments = new Float64Array(self.ntopics);

        for (i = 0; i < self.uniformDocAssignments.length; i++) {
          self.uniformDocAssignments[i] = 1;
        }

        self.uniformNormalizer = self.ntopics + self.ktimesalpha;

        self.temp = new Float64Array(self.ntopics);

        assignments = model.term_topic_assignments;
        beta = model.beta;
        nterms = model.termset.length;

        sums = [];

        for (i = 0; i < self.ntopics; i++) {
          sums.push(0);
          for (j = 0; j < assignments.length; j++) {
            sums[i] += assignments[j][i];
          }
        }

        self.phi = [];

        for (k = 0; k < self.ntopics; k++) {
          self.phi.push(new Array(nterms));
          norm = sums[k] + nterms * beta;
          for (w = 0; w < nterms; w++) {
            self.phi[k][w] = (assignments[w][k] + beta) / norm;
          }
        }

        self.fields = model.fields;
        self.ready = true;

        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the TopicModel instance. Could not' +
                      ' find the \'topic_model\' key in the resource\n');
    }
  };

  // Loads the model from:
  // - the path to a local JSON file
  // - a local file system directory or a cache provided as connection storage
  // - the BigML remote platform
  // - the full JSON information

  if (NODEJS && ((typeof resource) === 'string' ||
      utils.getStatus(resource).code !== constants.FINISHED)) {
    // Retrieving the model info from local repo, cache manager or bigml
    utils.getResourceInfo(self, resource, fillStructure);
  } else {
    // loads when the entire resource is given
    fillStructure(null, resource);
  }
  if (NODEJS) {
    events.EventEmitter.call(this);
  }
}

if (NODEJS) {
  util.inherits(LocalTopicModel, events.EventEmitter);
}

LocalTopicModel.prototype.appendBigram = function (outTerms, first, second) {
  /**
   * Appends a bigram to the list of output terms, if the bigram comprising
   * the two terms is in the local model's termset
   *
   * @param {array} data Array to which to append bigram index
   * @param {string} first First term of the bigram
   * @param {string} second Second term of the bigram
   */

  if (this.bigrams && second != null && first != null) {
    var bigram = this.stem(first + " " + second);
    if (this.termToIndex.hasOwnProperty(bigram))
      outTerms.push(this.termToIndex[bigram]);
  }
};

LocalTopicModel.prototype.tokenize = function (text) {
  /**
   * Computes an array of integers, each corresponding to a token in the given
   * text that is in the input model's termset
   *
   * @param {object} text Input string to tokenize
   */

  var char, index, lastTerm, termBefore, buf, tstem,
      spaceWasSep, sawChar, outTerms, lastText;

  buf = "";
  outTerms = [];
  sawChar = spaceWasSep = false;
  lastTerm = termBefore = null;

  index = 0;

  while (index < text.length) {
    this.appendBigram(outTerms, termBefore, lastTerm);

    buf = "";
    sawChar = false;

    if (!isalnum(text, index)) sawChar = true;

    while (!isalnum(text, index) && index < text.length)
      index++;

    while (index < text.length &&
           (isalnum(text, index) || text.charCodeAt(index) == QUOTE_CODE) &&
           buf.length < MAXIMUM_TERM_LENGTH) {

      buf += text.charAt(index);
      index++;
    }

    if (buf.length > 0) {
      if (!this.caseSensitive) buf = buf.toLowerCase();

      if (spaceWasSep && !sawChar)
        termBefore = lastTerm;
      else
        termBefore = null;

      lastTerm = buf;

      if (text.charAt(index) == " " || text.charAt(index) == "\n")
        spaceWasSep = true;

      tstem = this.stem(buf);
      if (this.termToIndex.hasOwnProperty(tstem))
        outTerms.push(this.termToIndex[tstem]);

      index++;
    }
  }

  this.appendBigram(outTerms, termBefore, lastTerm);

  return outTerms;

};

LocalTopicModel.prototype.sampleTopics =
  function (doc, assignments, normalizer, updates, rng) {
  /**
   * Iteratively chooses a topic for the terms in the given document
   * at random given a set of topic assignments for the current
   * document and a normalizer term derived from the dirichlet
   * hyperparameters.
   *
   * @param {array} doc The document, an array of term indices
   * @param {array} assignments Topic assignments (integers) for given document
   * @param {float} normalizer Normalization term for topic distribution
   * @param {object} updates The number of iterations of sampling to perform
   * @param {object} rng Random number generator, an instance of MersenneTwister
   */
  var k, update, index, term, randomValue, topic, topicTerm, topicDocument,
      counts = new Float64Array(this.ntopics);

  for (update = 0; update < updates; update++) {
    for (index = 0; index < doc.length; index++) {
      term = doc[index];
      for (k = 0; k < this.ntopics; k++) {
        topicTerm = this.phi[k][term];
        topicDocument = (assignments[k] + this.alpha) / normalizer;
        this.temp[k] = topicTerm * topicDocument;
      }

      for (k = 1; k < this.ntopics; k++) {
        this.temp[k] += this.temp[k - 1];
      }

      randomValue = rng.random_long() * this.temp[this.temp.length - 1];
      topic = 0;

      while (this.temp[topic] < randomValue && topic < this.ntopics) {
        topic++;
      }
      counts[topic]++;
    }
  }
  return counts;
};

LocalTopicModel.prototype.sampleUniform = function (doc, updates, rng) {
  /**
   * Chooses a random topic for each of the terms in the given doc for
   * multiple iterations, assuming the topic distribution for the
   * containing document is uniform.  Returns an aggregated list of
   * the topic choices.
   *
   * @param {array} doc The document, an array of term indices
   * @param {object} updates The number of iterations of sampling to perform
   * @param {object} rng Random number generator, an instance of MersenneTwister
   */

  var k, update, index, term, randomValue, topic,
      counts = new Float64Array(this.ntopics);

  for (update = 0; update < updates; update++) {
    for (index = 0; index < doc.length; index++) {
      term = doc[index];
      for (k = 0; k < this.ntopics; k++) {
        this.temp[k] = this.phi[k][term];
      }

      for (k = 1; k < this.ntopics; k++) {
        this.temp[k] += this.temp[k - 1];
      }

      randomValue = rng.random_long() * this.temp[this.temp.length - 1];
      topic = 0;

      while (this.temp[topic] < randomValue && topic < this.ntopics) {
        topic++;
      }
      counts[topic]++;
    }
  }
  return counts;
};

LocalTopicModel.prototype.infer = function (list_of_indices) {
  /**
   * Computes a distribution over topics for the given input document.
   *
   * @param {array} list_of_indices The document, an array of term indices
   */

  var rng, normalizer, topic, index, term, update, uniformCounts,
      burnCounts, sampleCounts, updates, doc;

  doc = list_of_indices.sort(function(a, b) { return a - b; });
  updates = 0;

  if (doc.length > 0) {
    updates = Math.floor(SAMPLES_PER_TOPIC * this.ntopics / doc.length);
    updates = Math.min(MAX_UPDATES, Math.max(MIN_UPDATES, updates));
  }

  rng = new MersenneTwister([this.seed]);
  normalizer = (doc.length * updates) + this.ktimesalpha;

  uniformCounts = this.sampleUniform(doc, updates, rng);
  burnCounts = this.sampleTopics(doc, uniformCounts, normalizer, updates, rng);
  sampleCounts = this.sampleTopics(doc, burnCounts, normalizer, updates, rng);

  for (index = 0; index < this.ntopics; index++) {
    sampleCounts[index] = (sampleCounts[index] + this.alpha) / normalizer;
  }

  // Return normal array
  return [].slice.call(sampleCounts);
};

LocalTopicModel.prototype.distribution = function (inputData, cb) {
  /**
   * Computes a distribution over topics for the given input data.
   *
   * @param {object} inputData Input data to predict from
   * @param {function} cb Callback
   */
  var validatedInput, distribution, self = this;
  function createLocalDistribution(error, texts) {
    /**
     * Creates a local distribution using the topic model's info.
     *
     * @param {object} error Error message
     * @param {array} texts Texts to predict from.
     */
    var text;
    if (error) {
      return cb(error, null);
    }
    if (texts.length > 1) {
      text = texts.join("\n\n");
    } else {
      text = texts[0];
    }

    return cb(null, self.distributionForText(text));
  }
  if (this.ready) {
    if (cb) {
      this.validateInput(inputData, createLocalDistribution);
    } else {
      validatedInput = this.validateInput(inputData);
      return this.distributionForText(validatedInput);
    }
  } else {
    this.on('ready', function (self) {
      return self.distribution(inputData, cb);
    });
    return;
  }
};


LocalTopicModel.prototype.distributionForText = function (text) {
  /**
   * Computes a distribution over topics for the given text, which can be a
   * string (as below) or an array of strings
   *
   * @param {string} text Text for which to compute the topic distribution
   */

  var astr, doc, topicsDistribution = [], index, len;

  if (typeof text === 'string') {
    astr = text;
  } else {
    astr = text.join("\n\n");
  }

  doc = this.tokenize(astr);
  this.topicsProbability = this.infer(doc);
  len = this.topicsProbability.length;
  for (index = 0; index < len; index++) {
    topicsDistribution.push({name: this.topics[index].name,
                             probability: this.topicsProbability[index]});
  }
  return topicsDistribution;
};

LocalTopicModel.prototype.stem = function (text) {
  /**
   * Computes the stem of the given text according to the Snowball stemming
   * algorithm for the language specified in the model, or do nothing
   * if we don't support stemming for the given language.
   *
   * @param {string} text A single word to stem
   */
  if (this.stemmer == null) {
    return text;
  } else {
    this.stemmer.setCurrent(text);
    this.stemmer.stem();
    return this.stemmer.getCurrent();
  }
};


LocalTopicModel.prototype.validateInput = function (inputData, cb) {
  /**
   * Validates the syntax of input data.
   *
   * The input fields must be keyed by field name or field id.
   * @param {object} inputData Input data to predict
   * @param {function} cb Callback
   */
  var field, fieldId, texts = [], error;
  if (this.ready) {
    for (fieldId in this.fields) {
      if (this.fields.hasOwnProperty(fieldId)) {
        field = this.fields[fieldId];

        if (inputData.hasOwnProperty(fieldId)) {
          texts.push(inputData[fieldId]);
        } else if (inputData.hasOwnProperty(field.name)) {
          texts.push(inputData[field.name]);
        }
      }
    }
    if (cb) {
      return cb(null, texts);
    }
    return texts;
  }
  this.on('ready', function (self) {
    return self.validateInput(inputData, cb);
  });
  return;
};


if (NODEJS) {
  module.exports = LocalTopicModel;
} else {
  exports = LocalTopicModel;
}
