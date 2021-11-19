'use strict';

var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var StringUtilsExt = require('~/cartridge/scripts/utils/libStringUtilsExt');
var customCacheMgr = require('~/cartridge/scripts/io/customCacheWebdav');
var writeCustomAttributes = require('~/cartridge/scripts/akeneoAttributes/writeCustomAttributes');

var config = generalUtils.config;


var productCustomAttributes = {};

/**
 * Calls price attribute writing logic
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function createPriceAttributes(attribute, xmlAttrKey, xswHandle) {
    writeCustomAttributes.writePriceAttribute(attribute, xmlAttrKey, xswHandle);
}

/**
 * Calls metric attribute writing logic
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function createMetricAttributes(attribute, xmlAttrKey, xswHandle) {
    writeCustomAttributes.writeMetricAttribute(attribute, xmlAttrKey, xswHandle);
}

/**
 * Calls general attribute writing logic
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} parentCode - akeneo parent code
 */
function createGeneralAttributes(attribute, xmlAttrKey, xswHandle, parentCode) {
    writeCustomAttributes.writeGeneralAttribute(attribute, xmlAttrKey, xswHandle, parentCode);
}
/**
 * Calls select attribute writing logic for simple and multi select attributes
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} parentCode - akeneo parent code
 * @param {string} akeneoAttrCode - akeneo attribute code
 */
function createSelectAttributes(attribute, xmlAttrKey, xswHandle, parentCode, akeneoAttrCode) {
    writeCustomAttributes.writeSelectAttribute(attribute, xmlAttrKey, xswHandle, parentCode, akeneoAttrCode);
}
/**
 * Calls new data type attribute writing logic
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function createNewDataTypeAttrs(attribute, xmlAttrKey, xswHandle) {
    writeCustomAttributes.writeNewDataTypeAttribute(attribute, xmlAttrKey, xswHandle);
}

/**
 * Calls entity attribute writing logic
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} parentCode - akeneo parent code
 * @param {string} referenceDataName - entity reference data name
 */
function createEntityAttributes(attribute, xmlAttrKey, xswHandle, parentCode, referenceDataName) {
    writeCustomAttributes.writeCustomEntityAttributes(attribute, xmlAttrKey, xswHandle, parentCode, referenceDataName);
}

/**
 * Gets attribute definition from cache or API
 * @param {string} akeneoAttrCode - akeneo attribute code
 * @returns {Object} - attribute definition object
 */
function getAttributeDefinition(akeneoAttrCode) {
    var attrApiUrl = config.APIURL.endpoints.attributes + '/' + akeneoAttrCode;
    var attrDef = customCacheMgr.getCache(attrApiUrl);

    if (!attrDef) {
        var akeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
        var akeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
        var akeneoService = akeneoServices.getGeneralService();
        var nextUrlBackup = akeneoServicesHandler.nextUrl;

        akeneoServicesHandler.nextUrl = '';

        try {
            attrDef = akeneoServicesHandler.serviceRequestAttribute(akeneoService, config.serviceGeneralUrl + attrApiUrl);
            customCacheMgr.setCache(attrApiUrl, attrDef);
        } catch (e) {
            throw new Error('ERROR : While calling service to get attribute definition with Error: ' + e.message);
        }

        akeneoServicesHandler.nextUrl = nextUrlBackup;
    }

    return attrDef;
}

/**
 * Call appropriate attribute write functions as per the attribute type
 * @param {Object} attribute - attribute object
 * @param {string} akeneoAttrCode - akeneo attribute code
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} parentCode - akeneo parent code
 * @param {dw.util.HashSet} variantAxesValues - hashset object with stored variants axes values
 */
function filterAttrOnType(attribute, akeneoAttrCode, xmlAttrKey, xswHandle, parentCode, variantAxesValues) {
    var attrDefinition = getAttributeDefinition(akeneoAttrCode);
    var attrType = attrDefinition.type || '';
    var camelizeAttrCode = 'akeneo_' + StringUtilsExt.camelize(akeneoAttrCode);

    if (variantAxesValues && variantAxesValues.contains(akeneoAttrCode)) {
        if (attrType === 'pim_catalog_simpleselect') {
            var attrKey = camelizeAttrCode + '_custom';
            createSelectAttributes(attribute, attrKey, xswHandle, parentCode, akeneoAttrCode);
        }
        createGeneralAttributes(attribute, xmlAttrKey, xswHandle, parentCode);
    } else {
        switch (attrType) {
            case 'pim_catalog_price_collection' :
                createPriceAttributes(attribute, xmlAttrKey, xswHandle);
                break;
            case 'pim_catalog_metric' :
                createMetricAttributes(attribute, xmlAttrKey, xswHandle);
                break;
            case 'pim_catalog_file' :
            case 'pim_catalog_image' :
            case 'pim_catalog_boolean' :
            case 'pim_assets_collection' :
            case 'pim_catalog_number' :
            case 'pim_catalog_date' :
            case 'pim_catalog_text' :
            case 'pim_catalog_textarea' :
            case 'pim_catalog_identifier' :
            case 'pim_reference_data_multiselect' :
            case 'pim_reference_data_simpleselect' :
                createGeneralAttributes(attribute, xmlAttrKey, xswHandle, parentCode);
                break;
            case 'akeneo_reference_entity' :
            case 'akeneo_reference_entity_collection' :
                var referenceDataName = attrDefinition.reference_data_name;
                createEntityAttributes(attribute, xmlAttrKey, xswHandle, parentCode, referenceDataName);
                break;
            case 'pim_catalog_simpleselect' :
            case 'pim_catalog_multiselect' :
                createSelectAttributes(attribute, xmlAttrKey, xswHandle, parentCode, akeneoAttrCode);
                break;
            default :
                createNewDataTypeAttrs(attribute, xmlAttrKey, xswHandle);
        }
    }
}
/**
 * @desc Writes empty custom attribute tags for select attributes which have no value selected in akeneo API
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Array} selectCodesList - select codes list
 * @param {Object} systemAttrsMapping - object containing mapping of system attributes
 * @param {Object} customAttrsMapping - object containing mapping of custom attributes
 */
function writeEmptySelectAttributes(xswHandle, selectCodesList, systemAttrsMapping, customAttrsMapping) {
    for (var i = 0; i < selectCodesList.length; i++) {
        var attrCode = selectCodesList[i];
        var camelizeAttrCode = 'akeneo_' + StringUtilsExt.camelize(attrCode);

        if (!(camelizeAttrCode in systemAttrsMapping.matching)) {
            var xmlAttrKey;

            if (camelizeAttrCode in customAttrsMapping.matching) {
                xmlAttrKey = customAttrsMapping.matching[camelizeAttrCode];
            } else {
                xmlAttrKey = camelizeAttrCode;
            }
            generalUtils.writeElement(xswHandle, 'custom-attribute', '', 'attribute-id', xmlAttrKey);
        }
    }
}

/**
 * Get custom attribiutes of akeneo product.
 * @param {Object} akeneoProduct - Product object.
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} akeneoImageAttrs - object containing list of product attributes
 * @param {dw.util.HashSet} variantAxesValues - hashset object with stored variants axes values
 * @param {Array} advancedImportConfigAttrs - Get the Akeneo import configured attribute from BM preference.
 */
productCustomAttributes.getCustomAttributes = function (akeneoProduct, xswHandle, akeneoImageAttrs, variantAxesValues, advancedImportConfigAttrs) {
    var systemAttrsMapping = config.systemAttrsMapping;
    var customAttrsMapping = config.customAttrsMapping;
    var selectCodesList = akeneoImageAttrs.selectCodesList.slice();

    if (akeneoProduct && akeneoProduct.values) {
        var parentCode = akeneoProduct.parent;
        xswHandle.writeStartElement('product');
        xswHandle.writeAttribute('product-id', (akeneoProduct.identifier ? akeneoProduct.identifier : akeneoProduct.code));
        xswHandle.writeStartElement('custom-attributes');

        Object.keys(akeneoProduct.values).forEach(function (attrCode) {
            var attribute = akeneoProduct.values[attrCode];
            var camelizeAttrCode;
            var xmlAttrKey;

            if (isNaN(attrCode)) {
                camelizeAttrCode = 'akeneo_' + StringUtilsExt.camelize(attrCode);
                var attrIndex = selectCodesList.indexOf(attrCode);

                if (attrIndex !== -1) {
                    selectCodesList.splice(attrIndex, 1);
                }
            }

            if (!(camelizeAttrCode in systemAttrsMapping.matching)) { // not in system attributes mapping
                xmlAttrKey = camelizeAttrCode in customAttrsMapping.matching ? customAttrsMapping.matching[camelizeAttrCode] : camelizeAttrCode;
                if (advancedImportConfigAttrs.length) { // if advanced import is configured
                    if (advancedImportConfigAttrs.indexOf(attrCode) > -1) {
                        filterAttrOnType(attribute, attrCode, xmlAttrKey, xswHandle, parentCode, variantAxesValues);
                    }
                } else {
                    filterAttrOnType(attribute, attrCode, xmlAttrKey, xswHandle, parentCode, variantAxesValues);
                }
            }
        });

        writeEmptySelectAttributes(xswHandle, selectCodesList, systemAttrsMapping, customAttrsMapping);

        xswHandle.writeEndElement();// custom-attributes
        xswHandle.writeEndElement();// product
    }
};

/* Exported functions */
module.exports = productCustomAttributes;
