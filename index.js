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
  BigMLResource: require('./lib/BigMLResource'),
  utils: require('./lib/utils'),
  constants: require('./lib/constants'),
  // Source REST api interface
  BigMLSource: require('./lib/BigMLSource'),
  // Dataset REST api interface
  BigMLDataset: require('./lib/BigMLDataset'),
  // Model REST api interface
  BigMLModel: require('./lib/BigMLModel'),
  // Ensemble REST api interface
  BigMLEnsemble: require('./lib/BigMLEnsemble'),
  // Prediction REST api interface
  BigMLPrediction: require('./lib/BigMLPrediction'),
  // Evaluation REST api interface
  BigMLEvaluation: require('./lib/BigMLEvaluation'),
  // Local Model object for local predictions
  Model: require('./lib/Model'),
  // Local Ensemble object for local predictions
  Ensemble: require('./lib/Ensemble')
};
