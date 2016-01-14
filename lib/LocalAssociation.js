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

if (NODEJS) {
  var util = require('util');
  var events = require('events');
  var Association = require(PATH + 'Association');
}
var csv = require('fast-csv');
var fs = require('fs');
var utils = require(PATH + 'utils');
var AssociationRule = require(PATH + 'AssociationRule');
var Item = require(PATH + 'Item');
var constants = require(PATH + 'constants');

var RULE_HEADERS = [
  "Rule ID", "Antecedent", "Consequent", "Antecedent Coverage %",
  "Antecedent Coverage", "Support %", "Support", "Confidence",
  "Leverage", "Lift", "p-value", "Consequent Coverage %",
  "Consequent Coverage"];


/**
 * LocalAssociation: Simplified local object for the association resource.
 * @constructor
 */
function LocalAssociation(resource, connection) {
  /**
   * Constructor for the LocalAssociation local object.
   *
   * @param {object} resource BigML cluster resource
   * @param {object} connection BigML connection
   */

  var association, self, fillStructure;
  this.resourceId = utils.getResource(resource);
  if ((typeof this.resourceId) === 'undefined') {
    throw new Error('Cannot build an Association from this resource: '
                    + resource);
  }

  this.fields = undefined;
  this.invertedFields = undefined;
  this.description = undefined;
  this.locale = undefined;
  this.ready = undefined;

  self = this;
  fillStructure = function (error, resource) {
    /**
     * Auxiliary function to load the resource info in the Association
     * structure.
     *
     * @param {object} error Error info
     * @param {object} resource Model's resource info
     */
    var status, fields, field, fieldId, fieldInfo, index, items, itemsLength,
      rules, rulesLength, associations;
    if (error) {
      throw new Error('Cannot create the Association instance. Could not' +
                      ' retrieve the resource: ' + error);
    }
    status = utils.getStatus(resource);
    if ((typeof resource.object) !== 'undefined') {
      resource = resource.object;
    }
    if ((typeof resource.associations) !== 'undefined') {
      if (status.code === constants.FINISHED) {
        associations = resource.associations;
        self.complement = associations.complement;
        self.discretization = associations.discretization;
        self.field_discretizations = associations.field_discretizations;
        fields = associations.fields;
        self.items = [];
        items = associations.items;
        itemsLength = items.length;
        for (index = 0; index < itemsLength; index++) {
          self.items.push(new Item(index, items[index], fields));
        }
        self.k = associations.k
        self.max_lhs = associations.max_lhs;
        self.min_coverage = associations.min_coverage
        self.min_leverage = associations.min_leverage
        self.min_strength = associations.min_strength
        self.min_support = associations.min_support
        self.min_lift = associations.min_lift
        self.prune = associations.prune
        self.search_strategy = associations.search_strategy
        rules = associations.rules;
        self.rules = [];
        rules = associations.rules;
        rulesLength = rules.length;
        for (index = 0; index < rulesLength; index++) {
          self.rules.push(new AssociationRule(rules[index]));
        }
        self.significance_level = associations.significance_level;
        self.fields = fields;
        self.invertedFields = utils.invertObject(fields);
        self.description = resource.description;
        self.locale = resource.locale || constants.DEFAULT_LOCALE;
        self.ready = true;
        if (NODEJS) {
          self.emit('ready', self);
        }
      }
    } else {
      throw new Error('Cannot create the Association instance. Could not' +
                      ' find the \'associations\' key in the resource\n');
    }
  };

  // Loads the association from the association id or from an unfinished object
  if ((NODEJS && ((typeof resource) === 'string')) ||
      utils.getStatus(resource).code !== constants.FINISHED) {
    association = new Association(connection);
    association.get(this.resourceId.resource, true,
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
  util.inherits(LocalAssociation, events.EventEmitter);
}



LocalAssociation.prototype.getItems = function (filters, cb) {
  /**
   * Returns the items array, previously selected by the field
   * corresponding to the given field name or a user-defined function
   * (if set)
   *
   * @param {object} filters Object that contains optional filters for
   *                 the items list. E.g.:
   *                 {field: '0000008',
   *                  names: ['Bin 5'],
   *                  inputMap: {'000008': 'Bin 5'},
   *                  filterFunction: function(item) {return true;}
   *                  }
   * @param {function} cb Callback
   */
  var self = this;
  if (typeof filters === 'undefined') {
    filters = {};
  }
  if (this.ready) {
    if (cb) {
      cb(null, this._getItems(filters.field, filters.names, filter.inputMap,
                              filters.filterFunction));
    } else {
      return this._getItems(filters.field, filters.names, filter.inputMap,
                            filters.filterFunction);
    }
  } else {
    this.on('ready', function (self) {
      return self.getItems(filters, cb); });
    return;
  }
};



LocalAssociation.prototype.getRules = function (filters, cb) {
  /**
   * Returns the rules array, previously selected by the conditions
   * set as arguments (if present)
   *
   * @param {object} filters Object that contains optional filters for the
   *                         association rules. E.g.:
   *                         {minLeverage: 0.1,
   *                          minStrength: 0.3,
   *                          minSupport: 0.2,
   *                          minPValue: 0.3,
   *                          itemList: ['Bin 5', 'Comedy'],
   *                          filterFunction: function(item) {return true;}}
   * @param {function} cb Callback
   */
  var self = this;
  if (typeof filters === 'undefined') {
    filters = {};
  }
  if (this.ready) {
    if (cb) {
      cb(null, this._getRules(filters.minLeverage, filters.minStrength,
                              filters.minSupport, filters.minPValue,
                              filters.itemList, filters.filterFunction));
    } else {
      return this._getRules(filters.minLeverage, filters.minStrength,
                            filters.minSupport, filters.minPValue,
                            filters.itemList, filters.filterFunction);
    }
  } else {
    this.on('ready', function (self) {
      return self.getRules(filters, cb); });
    return;
  }
};


LocalAssociation.prototype.rulesCSV = function (fileName, filters, cb) {
  /**
   * Stores the rules in CSV format in the user-given file. The rules
   * can be previously selected using get_rules
   *
   * @param {string} fileName Name of the file
   * @param {object} filters Object that contains filters for the rules. See
   *                         the `getRules` method.
   * @param {function} cb Callback
   */
  var self = this;
  if (typeof filters === 'undefined') {
    filters = {};
  }
  if (this.ready) {
    if (cb) {
      cb(null, this._rulesCSV(fileName, filters));
    } else {
      return this._rulesCSV(fileName, filters);
    }
  } else {
    this.on('ready', function (self) {
      return self.rulesCSV(fileName, filters, cb); });
    return;
  }
};

LocalAssociation.prototype._getItems = function (field, names, inputMap,
                                                 filterFunction) {
  /**
   * Returns the items array, previously selected by the field
   * corresponding to the given field name or a user-defined function
   * (if set)
   *
   * @param {string} field Name or ID of the field
   * @param {array} names Items names
   * @param {object} inputMap Input data map
   * @param {function} filterFunction Function to filter the items
   */
  var items = [], len = this.items.length, index, item, fieldId;
  if (typeof field !== 'undefined' && field != null) {
    if (typeof this.fields[field] !== 'undefined') {
      fieldId = field;
    } else if (typeof this.invertedFields[field] !== 'undefined') {
      fieldId = this.invertedFields[field];
    } else {
      throw new Error("Failed to find a field name or ID corresponding to " +
                      field + ".");
    }
  }

  function filterFunctionSet(item) {
    /**
     * Filters using the function given in filterFunction (if set)
     *
     * @param {object} item Item to check
     */
    if (typeof filterFunction !== 'function') {
      return true;
    }
    return filterFunction(item);
  }

  function fieldFilter(item) {
    /**
     * Checks if an item is associated to a field ID
     *
     * @param {object} item Item to check
     */
    if (typeof field === 'undefined' || field == null) {
      return true;
    }
    return item.fieldId == fieldId;
  }

  function namesFilter(item) {
    /**
     * Checks an item by name
     *
     * @param {object} item Item to check
     */
    if (typeof names === 'undefined' || names == null) {
      return true;
    }
    return names.indexOf(item.name) > -1;
  }

  function inputMapFilter(item) {
    /**
     * Checks if an item appears in the input map
     *
     * @param {object} item Item to check
     */
    if (typeof inputMap === 'undefined' || inputMap == null) {
      return true;
    }
    var value = inputMap[item.fieldId];
    return item.matches(value);
  }

  for (index = 0; index < len; index++) {
    item = this.items[index];
    if (fieldFilter(item) && namesFilter(item) && inputMapFilter(item) &&
        filterFunctionSet(item)) {
      items.push(item);
    }
  }
  return items;
};

LocalAssociation.prototype._getRules = function (
  minLeverage, minStrength, minSupport, minPValue, itemList, filterFunction) {
  /**
   * Returns the rules array, previously selected by the conditions
   * set as arguments (if present)
   *
   * @param {float} minLeverage Lower limit for the leverage of the rules
   * @param {float} minStrength Lower limit for the strength of the rules
   * @param {float} minSupport Lower limit for the support of the rules
   * @param {float} minPValue Lower limit for the p-value of the rules
   * @param {array} itemList Items array. Any of them should be in the rules
   * @param {function} filterFunction Function used as filter
   */
  var rules = [], len = this.rules.length, index, items = [], newItemList,
    rule;

  function leverage(rule) {
    /**
     * Check minimum leverage
     *
     * @param {object} rule Rule to check
     */
    if (typeof minLeverage === 'undefined' || minLeverage == null) {
      return true;
    }
    return rule.leverage >= minLeverage;
  }

  function strength(rule) {
    /**
     * Check minimum strength
     *
     * @param {object} rule Rule to check
     */
    if (typeof minStrength === 'undefined' || minStrength == null) {
      return true;
    }
    return rule.strength >= minStrength;
  }

  function support(rule) {
    /**
     * Check minimum support
     *
     * @param {object} rule Rule to check
     */
    if (typeof minSupport === 'undefined' || minSupport == null) {
      return true;
    }
    return rule.support >= minSupport;
  }

  function pValue(rule) {
    /**
     * Check minimum p-value
     *
     * @param {object} rule Rule to check
     */
    if (typeof minPValue === 'undefined' || minPValue == null) {
      return true;
    }
    return rule.pValue >= minPValue;
  }

  function filterFunctionSet(rule) {
    /**
     * Filters using the function given in filterFunction (if set)
     *
     * @param {object} rule Rule to check
     */
    if (typeof filterFunction !== 'function') {
      return true;
    }
    return filterFunction(item);
  }

  function itemListSet(rule) {
    /**
     * Checking if any of the items lists is in a rule
     *
     * @param {object} rule Rule to check
     */
    if (typeof itemList === 'undefined' || itemList == null) {
      return true;
    }
    if (typeof itemList[0] === 'Item') {
      for (index = 0; index < itemList.length; index++) {
        items.push(itemList[index]);
      }
    } else if (typeof itemList[0] === 'string') {
      newItemList = this.getItems(names=itemsList);
      for (index = 0; index < newItemList.length; index++) {
        items.push(newItemList[index]);
      }
    }
    len = rule.lhs.length;
    for (index = 0; index < len; index++) {
      itemIndex = rule.lhs[index];
      if (items.indexOf(itemIndex) > -1) {
        return true;
      }
    }
    len = rule.rhs.length;
    for (index = 0; index < len; index++) {
      itemIndex = rule.rhs[index];
      if (items.indexOf(itemIndex) > -1) {
        return true;
      }
    }
    return false;
  }

  for (index = 0; index < len; index++) {
    rule = this.rules[index];
    if (leverage(rule) && strength(rule) && support(rule) && pValue(rule) &&
        filterFunctionSet(rule) && itemListSet(rule)) {
      rules.push(rule);
    }
  }
  return rules;
};


LocalAssociation.prototype._rulesCSV = function (fileName, filters) {
  /**
   * Stores the rules in CSV format in the user-given file. The rules
   * can be previously selected using get_rules
   *
   * @param {string} fileName Name of the file
   * @param {object} filters Object that contains filters for the rules. See
   *                         the `getRules` method.
   */
  var rules, len, index, rows = [], csvStream, rule;
  rules = this._getRules(filters.minLeverage, filters.minStrength,
                         filters.minSupport, filters.minPValue,
                         filters.itemList, filters.filterFunction);
  for (index = 0; index < len; index++) {
    rule = rules[index];
    rows.push(this.describe(rule.toCSV()));
  }
  if (typeof fileName === 'undefined' || fileName == null) {
    throw new Error("A valid file name is required to store the " +
                    "rules.");
  }

  csvStream = csv.format({headers: true})
  csvStream.pipe(fs.createWriteStream(fileName));

  csvStream.write(RULE_HEADERS);
  for (index = 0; index < len; index++) {
    csvStream.write(rows[index]);
  }
  return fileName;

};

LocalAssociation.prototype.describe = function (ruleRow) {
  /**
   * Transforms the lhs and rhs index information to a human-readable
   * rule text.
   *
   * @param {array} ruleRow Rule information in an array format
   */

  // lhs items  and rhs items (second and third element in the row)
  // substitution by description
  var index, len = 3, start = 1, description, lenItems, item, itemIndex,
    itemDescription, fieldsLength, key, descriptionStr;
  for (index = start; index < len; index++) {
    description = [];
    fieldsLength = 0;
    lenItems = ruleRow.length;
    for (itemIndex = 0; itemIndex < lenItems; itemIndex++) {
      item = this.items[itemIndex];
      // if there's just one field, we don't use the item description
      // to avoid repeating the field name constantly.
      for (key in this.fields) {
        if (this.fields.hasOwnProperty(key)) {
          fieldsLength++;
          itemDescription = item.name;
          if (fieldsLength > 1) {
            itemDescription = item.describe();
            break;
          }
        }
      }
      description.push(itemDescription);
      descriptionStr = description.join(" & ");
      ruleRow[index] = descriptionStr;
    }
  }
  return ruleRow;
};

if (NODEJS) {
  module.exports = LocalAssociation;
} else {
  exports = LocalAssociation;
}
