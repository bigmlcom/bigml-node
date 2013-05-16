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


exports.showResult = function (error, resource) {
  /**
   * Auxiliar function show the response content
   *
   * @parm {object|string} error object or message
   * @parm {object} resource Bigml resource response
   */
  if (error !== null) console.log('error: ' + error);
  console.log('result: ' + JSON.stringify(resource));
}

exports.getResource = function (resource) {
  /**
   * Auxiliar function to get the resource structure
   *
   * @parm {object|string} resource object or id string
   */
  if ((typeof resource) === 'object') resource = resource.resource;
  var iSlash;
  if ((iSlash = resource.indexOf("/")) > -1) {
    type = resource.substring(0, iSlash);
    id = resource.substring(iSlash + 1);
    return {
      'type':type,
      'id': id
    }
  }
  else throw "Wrong resource id";
}

