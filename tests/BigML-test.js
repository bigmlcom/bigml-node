var vows = require('vows');
var assert = require('assert');
var BigML = require('../lib/BigML');
var constants = require('../lib/constants');

var suite = vows.describe('BigML connection');

suite.addBatch({
  'Connect with a BigML object and user\'s credentials': {
    topic: function() {
      var bigml = new BigML(),
          reqOptions = {
          method: 'GET',
          resourceType: 'source',
          endpoint: '',
          query: undefined,
          headers: constants.ACCEPT_JSON
        };
      bigml.request(reqOptions, this.callback);
    },
    'We connect without error': function (error, data, response) {
        assert.equal(error, null);
    }
  },
  'Connect with a BigML object and no credentials': {
    topic: function() {
      var bigml = new BigML(' ', ' '),
          reqOptions = {
          method: 'GET',
          resourceType: 'source',
          endpoint: '',
          query: undefined,
          headers: constants.ACCEPT_JSON
        };
      bigml.request(reqOptions, this.callback);
    },
    'We can\'t connect': function (error, data, response) {
        assert.equal(data.code, 401);
    }
  }
   //'Another context': {}
}).export(module);
