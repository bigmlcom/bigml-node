/**
 * Copyright 2016 BigML
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
var NODEJS = ((typeof module !== 'undefined') && module.exports);
var PATH = (NODEJS) ? "./" : "";

var ZERO_CODE = 48;
var NINE_CODE = 57;
var UPPER_BEGIN = 65;
var UPPER_END = 90;
var LOWER_BEGIN = 97;
var LOWER_END = 122;
var ASCII_END = 127;

var MAXIMUM_TERM_LENGTH = 30;
var UPDATES = 64;

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

if (NODEJS) {
  var util = require('util');
  var events = require('events');
  var TopicModel = require(PATH + 'TopicModel');
  var Snowball = require('snowball');
  var MersenneTwister = require('mersenne-twister');
}
var utils = require(PATH + 'utils');
var constants = require(PATH + 'constants');

function isalnum(astr, idx) {
  var code = astr.charCodeAt(idx);

  if (code >= ZERO_CODE && code <= LOWER_END) {
    if (code <= NINE_CODE) return true;
    if (code >= UPPER_BEGIN && code <= UPPER_END) return true;
    if (code <= LOWER_END) return true;
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

  var self, topicModel, fillStructure, language, i, tstem;

  this.resourceId = utils.getResource(resource);
  if ((typeof this.resourceId) === 'undefined') {
    throw new Error('Cannot build a TopicModel from this resource: ' + resource);
  }

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
    if ((typeof resource.model) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        model = resource.model;

        if (model.hasOwnProperty("language")) {
          language = model.language;
          if (CODE_TO_NAME.hasOwnProperty(language)) {
            self.stemmer = new Snowball(CODE_TO_NAME[language]);
          }
        }

        self.termToIndex = {};

        for (i = 0; i < model.termset.length; i++) {
          tstem = self.stem(model.termset[i]);
          self.termToIndex[tstem] = i;
        }

        self.seed = model.hashed_seed;
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

        fields = resource.model.fields;
        self.fields = fields;
        self.ready = true;

        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the TopicModel instance. Could not' +
                      ' find the \'model\' key in the resource\n');
    }
  };

  // Loads the topicModel from the topicModel id or from an unfinished object
  if ((NODEJS && ((typeof resource) === 'string')) ||
      utils.getStatus(resource).code !== constants.FINISHED) {
    topicModel = new TopicModel(connection);
    topicModel.get(this.resourceId.resource, true,
                constants.ONLY_MODEL, fillStructure);
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
      spaceWasSep, sawChar, outTerms;

  buf = "";
  outTerms = [];
  sawChar = spaceWasSep = false;
  lastTerm = termBefore = null;

  index = 0;

  while (index < text.length) {
    this.appendBigram(outTerms, termBefore, lastTerm);

    if (!isalnum(text, index)) sawChar = true;

    while (!isalnum(text, index) && index < text.length)
      index++;

    while (index < text.length &&
           isalnum(text, index) &&
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
      buf = "";
    }
  }

  this.appendBigram(outTerms, termBefore, lastTerm);

  return outTerms;

};

LocalTopicModel.prototype.sampleTopic =
  function (term, assignments, normalizer, rng) {
  /**
   * Chooses a topic for a given term at random given a set of topic assignments
   * for the current document and a normalizer term derived from the dirichlet
   * hyperparameters.
   *
   * @param {integer} term Index of a single term from a given document
   * @param {array} assignments Topic assignments (integers) for given document
   * @param {float} normalizer Normalization term for topic distribution
   * @param {object} rng Random number generator, an instance of MersenneTwister
   */
  var k, topicTerm, topicDocument, randomValue, topic;

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

  return topic;
};

LocalTopicModel.prototype.sampleUniform = function (term, rng) {
  /**
   * Chooses a random topic for the given term, assuming the topic
   * distribution for the containing document is uniform.
   *
   * @param {integer} term Index of a single term from a given document
   * @param {object} rng Random number generator, an instance of MersenneTwister
   */

  var assignments = this.uniformDocAssignments, norm = this.uniformNormalizer;
  return this.sampleTopic(term, assignments, norm, rng);
};

LocalTopicModel.prototype.infer = function (doc, maxUpdates) {
  /**
   * Computes a distribution over topics for the given input data.
   *
   * @param {array} doc Document, represented as an array of term indicies
   * @param {integer} maxUpdates Iterations of gibbs sampling to perform
   */

  var rng, normalizer, docAssignments, topic, index, term, update;

  rng = new MersenneTwister([this.seed]);
  normalizer = doc.length + this.ktimesalpha;
  docAssignments = new Float64Array(this.ntopics);

  for (index = 0; index < doc.length; index++) {
    term = doc[index];
    topic = this.sampleUniform(term, rng);
    docAssignments[topic]++;
  }

  update = 0;

  while (update < maxUpdates) {
    for (index = 0; index < doc.length; index++) {
      term = doc[index];
      topic = this.sampleTopic(term, docAssignments, normalizer, rng);
      docAssignments[topic]++;
      normalizer++;
    }
    update++;
  }

  for (index = 0; index < this.ntopics; index++)
    docAssignments[index] = (docAssignments[index] + this.alpha) / normalizer;

  // Return normal array
  return [].slice.call(docAssignments);
};

LocalTopicModel.prototype.distribution = function (inputData) {
  /**
   * Computes a distribution over topics for the given input data.
   *
   * @param {object} inputData Input data to predict from
   */

  var fieldId, field, text, texts;

  texts = [];

  for (fieldId in this.fields) {
    if (this.fields.hasOwnProperty(fieldId)) {
      field = this.fields[fieldId];

      if (inputData.hasOwnProperty(fieldId)) {
        texts.push(inputData[fieldId]);
      } else if (inputData.hasOwnProperty(field.name)) {
        texts.push(inputData[field.name]);
      } else {
        throw new Error("The input data lacks some text field values." +
                        " To find the topic distribution, input data must " +
                        "contain all text field values.");
      }
    }
  }

  if (texts.length > 1) {
    text = texts.join("\n\n");
  } else {
    text = texts[0];
  }

  return this.distributionForText(text);
};

LocalTopicModel.prototype.distributionForText = function (text) {
  /**
   * Computes a distribution over topics for the given text, which can be a
   * string (as below) or an array of strings
   *
   * @param {string} text Text for which to compute the topic distribution
   */

  var astr, doc;

  if (typeof text === 'string') {
    astr = text;
  } else {
    astr = text.join("\n\n");
  }

  doc = this.tokenize(astr);
  return this.infer(doc, UPDATES);
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

if (NODEJS) {
  module.exports = LocalTopicModel;
} else {
  exports = LocalTopicModel;
}
