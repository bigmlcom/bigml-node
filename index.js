/**
 * Copyright 2012-2019 BigML
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

// This will allow us to know we are running under node
process.RUNNING_IN_NODEJS = 'true';

if (process.env.BIGML_REQUIRE_PRELOAD &&
   process.env.BIGML_REQUIRE_PRELOAD != "false" &&
   process.env.BIGML_REQUIRE_PRELOAD != "no") {
  require('./lib/sharedProtos');
  require('./lib/LocalAnomaly');
  require('./lib/LocalAssociation');
  require('./lib/LocalCentroid');
  require('./lib/LocalModel');
  require('./lib/AnomalyTree');
  require('./lib/AssociationRule');
  require('./lib/Item');
  require('./lib/Tree');
  require('./lib/BoostedTree');
  require('./lib/Predicates');
  require('./lib/Predicate');
  require('./lib/MultiVote');
  require('./lib/MultiVote');
  require('./lib/MultiVoteList');
  require('./lib/tssubmodels');
  require('./lib/math_ops');
  require('jStat');
  require('cwise');
}

module.exports = {
  // Common modules: connection, REST common interface, utilities and constants
  BigML: require('./lib/BigML'),
  Resource: require('./lib/Resource'),
  constants: require('./lib/constants'),
  // Source REST API interface
  Source: require('./lib/Source'),
  // Dataset REST API interface
  Dataset: require('./lib/Dataset'),
  // Model REST API interface
  Model: require('./lib/Model'),
  // Ensemble REST API interface
  Ensemble: require('./lib/Ensemble'),
  // Prediction REST API interface
  Prediction: require('./lib/Prediction'),
  // Evaluation REST API interface
  Evaluation: require('./lib/Evaluation'),
  // Batch Prediction REST API interface
  BatchPrediction: require('./lib/BatchPrediction'),
  // Cluster REST API interface
  Cluster: require('./lib/Cluster'),
  // Centroid REST API interface
  Centroid: require('./lib/Centroid'),
  // Batch Centroid REST API interface
  BatchCentroid: require('./lib/BatchCentroid'),
  // Anomaly REST API interface
  Anomaly: require('./lib/Anomaly'),
  // Anomaly score REST API interface
  AnomalyScore: require('./lib/AnomalyScore'),
  // Batch Anomaly Score REST API interface
  BatchAnomalyScore: require('./lib/BatchAnomalyScore'),
  // Projects REST API interface
  Project: require('./lib/Project'),
  // Samples REST API interface
  Sample: require('./lib/Sample'),
  // Correlations REST API interface
  Correlation: require('./lib/Correlation'),
  // Statistical Tests REST API interface
  StatisticalTest: require('./lib/StatisticalTest'),
  // Logistic Regression REST API interface
  LogisticRegression: require('./lib/LogisticRegression'),
  // Association REST API interface
  Association: require('./lib/Association'),
  // Association REST API interface
  AssociationSet: require('./lib/AssociationSet'),
  // Topic Model REST API interface
  TopicModel: require('./lib/TopicModel'),
  // Topic Distribution REST API interface
  TopicDistribution: require('./lib/TopicDistribution'),
  // Batch Topic Distribution REST API interface
  BatchTopicDistribution: require('./lib/BatchTopicDistribution'),
  // Script REST API interface
  // Time-series REST API interface
  TimeSeries: require('./lib/TimeSeries'),
  // Forecast REST API interface
  Forecast: require('./lib/Forecast'),
  // Deepnet REST API interface
  Deepnet: require('./lib/Deepnet'),
  // OptiML REST API interface
  OptiML: require('./lib/OptiML'),
  // Fusion REST API interface
  Fusion: require('./lib/Fusion'),
  // PCA REST API interface
  PCA: require('./lib/PCA'),
  // Projection REST API interface
  Projection: require('./lib/Projection'),
  // BatchProjection REST API interface
  BatchProjection: require('./lib/BatchProjection'),
  // LinearRegression REST API interface
  LinearRegression: require('./lib/LinearRegression'),
  // Script REST API interface
  Script: require('./lib/Script'),
  // Library REST API interface
  Library: require('./lib/Library'),
  // Execution REST API interface
  Execution: require('./lib/Execution'),
  // External Connector REST API interface
  ExternalConnector: require('./lib/ExternalConnector'),
  // Local Model object for local predictions
  LocalModel: require('./lib/LocalModel'),
  // Local Ensemble object for local predictions
  LocalEnsemble: require('./lib/LocalEnsemble'),
  // Local Cluster object for local centroid predictions
  LocalCluster: require('./lib/LocalCluster'),
  // Local Anomaly detector object for local anomaly score predictions
  LocalAnomaly: require('./lib/LocalAnomaly'),
  // Local Logistic Regression object for local predictions
  LocalLogisticRegression: require('./lib/LocalLogisticRegression'),
  // Local Association object for local predictions
  LocalAssociation: require('./lib/LocalAssociation'),
  // Local Topic Model object for local predictions
  LocalTopicModel: require('./lib/LocalTopicModel'),
  // Local Time-series object for local predictions
  LocalTimeSeries: require('./lib/LocalTimeSeries'),
  // Local Deepnet object for local predictions
  LocalDeepnet: require('./lib/LocalDeepnet'),
  // Local Supervised Model object for local predictions
  LocalSupervised: require('./lib/LocalSupervised'),
  // Local Supervised Model object for local predictions
  LocalFusion: require('./lib/LocalFusion'),
  // Local PCA object for local projections
  LocalPCA: require('./lib/LocalPCA'),
  // Local Linear Regression object for local predictions
  LocalLinearRegression: require('./lib/LocalLinearRegression'),

  private: { Predicates : require('./lib/Predicates'),
             AnomalyTree : require('./lib/AnomalyTree'),
             utils: require('./lib/utils')}

};
