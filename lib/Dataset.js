/**
 * Copyright 2013-2020 BigML
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

var BigML = require('./BigML');
var Resource = require('./Resource');
var constants = require('./constants');
var logger = require('./logger');
var utils = require('./utils');
var async = require('async');

function centroidInCluster(centroidId, clusterResource) {
  /**
   * Checks the user-given centroid id against the centroids in the
   * provided cluster finished resource that have no built dataset.
   *
   * @param {string} centroidId User-given centroid id.
   * @param {object} clusterResource Finished cluster resource.
   */
  var datasets;
  if ((typeof centroidId) === 'undefined') {
    return false;
  }
  try {
    datasets = clusterResource.object['cluster_datasets'];
    return datasets.hasOwnProperty(centroidId);
  } catch (err) {return false; }
  return false;
}

function Dataset(connection) {
  Resource.call(this, connection);
}

Dataset.prototype = new Resource();

Dataset.prototype.parent = Resource.prototype;

Dataset.prototype.create = function (originResource, args, retry, cb) {
  /**
   * Creates a dataset and builds customized error and resource info
   *
   * Uses HTTP POST to send dataset content.
   *
   * Returns a BigML resource wrapped in an object that includes
   *   code: HTTP status code
   *   resource: The resource/id
   *   location: Remote location of the resource
   *   object: The resource itself
   *   error: An error code and message
   *
   * @param {string|object|array} originResource Source id, dataset id,
   *                                             array of dataset ids (or
   *                                             resource objects) or
                                                 cluster id (plus centroid id).
   * @param {object} args Arguments that should be used in the call. For
   *                      example {name: "my_name"}
   * @param {boolean} retry Turns on/off the retries if a resumable
   *                        condition happens
   * @param {function} cb Callback function
   */


  var self = this, options, resource, resources, datasetsArray = false,
    message = 'Failed to create the dataset. First parameter must be' +
    ' a source or dataset id.',
    resourceId,
    sendRequest,
    reqOptions = utils.createRequest(constants.DATASET);

  if (arguments.length > 0) {
    // multidatasets
    datasetsArray = utils.isArray(originResource);

    resource = (datasetsArray) ? originResource[0] : originResource;
    resourceId = utils.getResource(resource);
    options = utils.optionalCUParams(arguments, message);

    if (datasetsArray && resourceId.type === 'dataset') {
      // multidatasets
      resources = originResource;
      options.args['origin_datasets'] = originResource;
    } else if (resourceId.type === 'dataset') {
      // new dataset from dataset
      resources = [originResource];
      options.args['origin_dataset'] = resourceId.resource;
    } else if (resourceId.type === 'source') {
      // new dataset form source
      resources = [originResource];
      options.args.source = resourceId.resource;
    } else if (resourceId.type === 'cluster') {
      // new dataset from cluster and centroid
      resources = [originResource];
      options.args.cluster = resourceId.resource;
    } else {
      throw new Error(message);
    }
    options = utils.setRetries(options);
    options.type = reqOptions.resourceType;
    options.operation = 'create';
    this.resources = resources;
    this.options = options;
  } else {
    if (!this.options || !this.resources) {
      logger.error("Create has been called with no parameters.");
      return;
    }
    options = this.options;
    datasetsArray = this.resources.length > 1;
    resource = this.resources[0];
    resources = this.resources;
    resourceId = utils.getResource(resource);
  }
  reqOptions.body = options.args;
  sendRequest = utils.makeSendRequest(self, reqOptions, options);
  // The origin resources must be retrieved in a finished state before
  // create starts. This is only done when create is called by the user, not
  // internally to retry creation.
  if (arguments.length > 0) {
    async.each(resources, function (resource, done) {
      var id = utils.getResource(resource);
      new Resource(self.connection).get(id.resource, true,
        function (error, finishedResource) {
          // Checking centroid id or assigning first one available
          var datasets, centroid, index, len, centroids;
          if (resourceId.type === 'cluster' &&
              !centroidInCluster(self.options.args.centroid,
                                 finishedResource)) {
            try {
              centroids = finishedResource.object.clusters.clusters;
              for (index = 0, len = centroids.length; index < len; index++) {
                centroid = centroids[index].id;
                if (typeof finishedResource.object["cluster_datasets"][centroid] === 'undefined' ||
                    finishedResource.object["cluster_datasets"][centroid] == "") {
                  break;
                }
              }
              self.options.args.centroid = centroid;
              reqOptions.body = self.options.args;
            } catch (err) {
              throw new Error("Failed to generate the dataset. A " +
                              "centroid id is needed in the args " +
                              "argument to generate a dataset from " +
                              "a cluster.");
            }
          }
          done();
        });
    },
      sendRequest);
  } else {
    sendRequest(null);
  }
};


Dataset.prototype.list = function (query, cb) {
  this.parent.list.call(this, 'dataset', query, cb);
};


Dataset.prototype.download = function (resource, filename, cb) {
  /**
   * Downloads the dataset as a CSV exported file.
   *
   * @param {object|string} resource Dataset resource or id
   * @param {string} filename Name of the file to store the prediction output
   *                          in (optional)
   * @param {string} cb Callback where the response body is sent to (optional)
   *
   */
  var resourceId = utils.getResource(resource),
    reqOptions = {
      resourceType: resourceId.type,
      endpoint: '/' + resourceId.id
    },
    retry = {
      retries: constants.DEFAULT_BIGML_RETRIES,
      wait: constants.DEFAULT_BIGML_WAIT,
      retriesLeft: constants.DEFAULT_BIGML_RETRIES
    };
  if ((typeof cb) === 'undefined') {
    cb = utils.showResult;
  }
  // Some retries are needed till the file is generated
  return this.connection.download(reqOptions, filename, retry, cb);
};


module.exports = Dataset;
