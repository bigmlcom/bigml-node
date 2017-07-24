/**
 * Copyright 2012-2014 BigML
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

module.exports = {
  // Common modules: connection, REST common interface, utilities and constants
  BigML: require('./lib/BigML'),
  Resource: require('./lib/Resource'),
  constants: require('./lib/constants'),
  // Source REST api interface
  Source: require('./lib/Source'),
  // Dataset REST api interface
  Dataset: require('./lib/Dataset'),
  // Model REST api interface
  Model: require('./lib/Model'),
  // Ensemble REST api interface
  Ensemble: require('./lib/Ensemble'),
  // Prediction REST api interface
  Prediction: require('./lib/Prediction'),
  // Evaluation REST api interface
  Evaluation: require('./lib/Evaluation'),
  // Batch Prediction REST api interface
  BatchPrediction: require('./lib/BatchPrediction'),
  // Cluster REST api interface
  Cluster: require('./lib/Cluster'),
  // Centroid REST api interface
  Centroid: require('./lib/Centroid'),
  // Batch Centroid REST api interface
  BatchCentroid: require('./lib/BatchCentroid'),
  // Anomaly REST api interface
  Anomaly: require('./lib/Anomaly'),
  // Anomaly score REST api interface
  AnomalyScore: require('./lib/AnomalyScore'),
  // Batch Anomaly Score REST api interface
  BatchAnomalyScore: require('./lib/BatchAnomalyScore'),
  // Projects REST api interface
  Project: require('./lib/Project'),
  // Samples REST api interface
  Sample: require('./lib/Sample'),
  // Correlations REST api interface
  Correlation: require('./lib/Correlation'),
  // Statistical Tests REST api interface
  StatisticalTest: require('./lib/StatisticalTest'),
  // Logistic Regression REST api interface
  LogisticRegression: require('./lib/LogisticRegression'),
  // Association REST api interface
  Association: require('./lib/Association'),
  // Association REST api interface
  AssociationSet: require('./lib/AssociationSet'),
  // Topic Model REST api interface
  TopicModel: require('./lib/TopicModel'),
  // Topic Distribution REST api interface
  TopicDistribution: require('./lib/TopicDistribution'),
  // Batch Topic Distribution REST api interface
  BatchTopicDistribution: require('./lib/BatchTopicDistribution'),
  // Script REST api interface
  // Time-series REST api interface
  TimeSeries: require('./lib/TimeSeries'),
  // Forecast REST api interface
  Forecast: require('./lib/Forecast'),
  // Batch Topic Distribution REST api interface
  Script: require('./lib/Script'),
  // Local Model object for local predictions
  Library: require('./lib/Library'),
  // Local Model object for local predictions
  Execution: require('./lib/Execution'),
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
  LocalTimeSeries: require('./lib/LocalTimeSeries')
};
