'use strict';

/* eslint no-param-reassign: 0 */

var Site = require('dw/system/Site');
var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
var akeneoService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');

var akeneoEntityAttrServiceCall = {};

/**
 * @desc Calls Akeneo API to get the attributes of each reference entity.
 * @param {string} AkeneoServiceUrl - akeneo enp point for entities
 * @returns {dw.util.ArrayList} - list of akeneo items
 */
akeneoEntityAttrServiceCall.getAkeneoItems = function (AkeneoServiceUrl) {
    var CustomPreferences = Site.current.preferences.custom;
    var AkeneoItemsList;


    // define service used for call
    var AkeneoService = akeneoService.getGeneralService();

    // setting the default akeneo hostname
    AkeneoService.setURL(CustomPreferences.akeneoServiceGeneralUrl);

    AkeneoServicesHandler.nextUrl = '';

    try {
        AkeneoItemsList = AkeneoServicesHandler.serviceRequestEntityAttributesAkeneo(AkeneoService, AkeneoServiceUrl);
    } catch (e) {
        throw new Error('ERROR : While calling service to get Attributes List : ' + e.stack + ' with Error: ' + e.message);
    }

    return AkeneoItemsList;
};

/**
 * @desc links entity record in another entityrecord.
 * @param {Object} entityRecord - entity record
 * @param {Object} entityAttr - entity attr
 * @param {string} referenceEntityCode - reference entity code
 * @param {string} attrCode - attr code
 * @returns {Object} - entity record
 */
function entityLinkToEntity(entityRecord, entityAttr, referenceEntityCode, attrCode) {
    var dataCharacter;

    if (entityAttr.length > 1 || entityAttr[0].locale) {
        Object.keys(entityAttr).forEach(function (localeAttrValue) {
            dataCharacter = entityAttr[localeAttrValue].data;

            if (dataCharacter && typeof (dataCharacter) === 'string') {
                entityRecord.values[attrCode][localeAttrValue].data = 'akeneo_entity_' + referenceEntityCode + '_' + dataCharacter;
            } else if (dataCharacter && typeof (dataCharacter) === 'object' && dataCharacter.length > 0) {
                var keys = Object.keys(dataCharacter);
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    entityRecord.values[attrCode][localeAttrValue].data[key] = 'akeneo_entity_' + referenceEntityCode + '_' + dataCharacter[key];
                }
            }
        });
    } else {
        dataCharacter = entityAttr[0].data;

        if (dataCharacter && typeof (dataCharacter) === 'string') {
            entityRecord.values[attrCode][0].data = 'akeneo_entity_' + referenceEntityCode + '_' + dataCharacter;
        } else if (dataCharacter && typeof (dataCharacter) === 'object' && dataCharacter.length > 0) {
            Object.keys(dataCharacter).forEach(function (key) {
                entityRecord.values[attrCode][0].data[key] = 'akeneo_entity_' + referenceEntityCode + '_' + dataCharacter[key];
            });
        }
    }

    return entityRecord;
}

/**
 * @desc Calls Akeneo API to get the attribute options of single_option, multiple_options types.
 * @param {dw.util.ArrayList} entityAttributesList - list of entity attributes
 * @param {Object} entityRecord - entity record
 * @param {string} referenceEntityCode - reference entity code
 * @param {string} entityAttributesOptionUrl - entity attributes option URL
 * @returns {Object} - entity record
 */
akeneoEntityAttrServiceCall.getAttrOptions = function (entityAttributesList, entityRecord, referenceEntityCode, entityAttributesOptionUrl) {
    var akeneoItemsList;
    var attrOptionURL = entityAttributesOptionUrl.toString().replace('{reference_entity_code}', referenceEntityCode);

    var CustomPreferences = Site.current.preferences.custom;
    // define service used for call
    var AkeneoService = akeneoService.getGeneralService();

    // setting the default akeneo hostname
    AkeneoService.setURL(CustomPreferences.akeneoServiceGeneralUrl);

    akeneoItemsList = AkeneoServicesHandler.serviceRequestEntityAttrSecondLevel(AkeneoService, entityAttributesList, attrOptionURL);
    var itemsIterator = akeneoItemsList.iterator();

    while (itemsIterator.hasNext()) {
        var AkeneoAttribute = itemsIterator.next();

        if ('options' in AkeneoAttribute && AkeneoAttribute.options) {
            if (Object.prototype.hasOwnProperty.call(entityRecord.values, AkeneoAttribute.code)) {
                entityRecord.values[AkeneoAttribute.code].push({ options: AkeneoAttribute.options });
            }
        }

        if ('reference_entity_code' in AkeneoAttribute && AkeneoAttribute.reference_entity_code) {
            if (Object.prototype.hasOwnProperty.call(entityRecord.values, AkeneoAttribute.code)) {
                var entityAttr = entityRecord.values[AkeneoAttribute.code];
                entityRecord = entityLinkToEntity(entityRecord, entityAttr, AkeneoAttribute.reference_entity_code, AkeneoAttribute.code);
            }
        }
    }
    return entityRecord;
};

/* Exported functions */
module.exports = akeneoEntityAttrServiceCall;
