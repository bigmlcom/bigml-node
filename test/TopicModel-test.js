var assert = require('assert'),
  bigml = require('../index');
try {
describe('Manage TopicModel objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/movies.csv',
    datasetId, dataset = new bigml.Dataset(), datasetId2,
    dataset2 = new bigml.Dataset(),
    topicModelId, topicModel = new bigml.TopicModel(), topicModelId2,
    topicModel2 = new bigml.TopicModel(),
    seed = "BigML tests",
    fields = {'000000': {'name': 'user_id', 'optype': 'numeric'},
              '000001': {'name': 'gender', 'optype': 'categorical'},
              '000002': {'name': 'age_range', 'optype': 'categorical'},
              '000003': {'name': 'occupation', 'optype': 'categorical'},
              '000004': {'name': 'zipcode', 'optype': 'numeric'},
              '000005': {'name': 'movie_id', 'optype': 'numeric'},
              '000006': {'name': 'title', 'optype': 'text'},
              '000007': {'name': 'genres', 'optype': 'items',
                         'item_analysis': {'separator': "$"}},
              '000008': {'name': 'timestamp', 'optype': 'numeric'},
              '000009': {'name': 'rating', 'optype': 'categorical'}},
    separator = ";",
    topicArgs = {seed: seed, topic_model_seed: seed};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.update(sourceId, {"fields": fields,
                               "source_parser": {"separator": separator}},
        function (error, data) {
          dataset.create(sourceId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            dataset2.create(sourceId, undefined, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              datasetId2 = data.resource;
              done();
            });
          });
        });
    });
  });

  describe('#create(dataset, args, callback)', function () {
    it('should create a TopicModel from a dataset', function (done) {
      topicModel.create(datasetId, topicModelArgs, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        topicModelId = data.resource;
        done();
      });
    });
  });
  describe('#get(topicModel, finished, query, callback)', function () {
    it('should retrieve a finished TopicModel', function (done) {
      topicModel.get(topicModelId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(topicModel, args, callback)', function () {
    it('should update properties in the topicModel', function (done) {
      var newName = 'my new name';
      topicModel.update(topicModelId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        topicModel.get(topicModelId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#create([dataset], args, callback)', function () {
    it('should create a TopicModel from a list of datasets ', function (done) {
      topicModel2.create([datasetId, datasetId2], topicModelArgs,
                  function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        topicModelId2 = data.resource;
        done();
      });
    });
  });
  describe('#delete(topicModel, callback)', function () {
    it('should delete the remote topicModel', function (done) {
      topicModel.delete(topicModelId, function (error, data) {
        assert.equal(error, null);
        topicModel2.delete(topicModelId2, function (error, data) {
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
      dataset2.delete(datasetId2, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
} catch (e) {console.log(e);}
