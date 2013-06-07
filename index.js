/**
 * Copyright 2012 BigML
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
  // Local Model object for local predictions
  LocalModel: require('./lib/LocalModel'),
  // Local Ensemble object for local predictions
  LocalEnsemble: require('./lib/LocalEnsemble')
};
