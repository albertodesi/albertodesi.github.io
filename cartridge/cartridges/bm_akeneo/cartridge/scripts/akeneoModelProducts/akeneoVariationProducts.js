'use strict';

var StringUtils = require('dw/util/StringUtils');
var HashSet = require('dw/util/HashSet');

var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var StringUtilsExt = require('~/cartridge/scripts/utils/libStringUtilsExt');

var akeneoVariationProducts = {};

/**
* @desc Writes locale tags for each variation value to XML
* @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml stream writer
* @param {string} variationAttrCode - variation attribute
* @param {string} variationValue - variation attribute value
*/
function writeVariationValueLocales(xswHandle, variationAttrCode, variationValue) {
    var akeneoAttributes = require('~/cartridge/scripts/akeneoAttributes/akeneoAttributes');
    var attributeOption = akeneoAttributes.getAttributeOption(variationAttrCode, variationValue);

    if (attributeOption) {
        var labels = attributeOption.labels;
        Object.keys(labels).forEach(function (key) {
            var labelValue = labels[key];
            xswHandle.writeStartElement('display-value');
            xswHandle.writeAttribute('xml:lang', key.replace('_', '-'));
            xswHandle.writeCharacters(labelValue);
            xswHandle.writeEndElement(); // display-value
        });
    }
}

/**
 * @desc Writes variation values and attributes XML
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml stream writer
 * @param {Object} modelProduct - model product object
 * @param {Array} selectCodesList - list of select codes
 * @returns {dw.util.HashSet} - the set of values written to XML
 */
function writeVariationAttributes(xswHandle, modelProduct, selectCodesList) {
    var productCustomAttrsMapping = config.customAttrsMapping;
    var variationProducts = modelProduct.variationProducts;
    var variationValuesSet = new HashSet();

    if (variationProducts && variationProducts.length > 0) {
        var variantAttributeSets = modelProduct.variantAttributeSets;
        for (var i = 0; i < variantAttributeSets.length; i++) {
            var axes = variantAttributeSets[i].axes;
            for (var j = 0; j < axes.length; j++) {
                xswHandle.writeStartElement('variation-attribute');

                var modelValues = modelProduct.values;
                var variationAttr = axes[j];
                var variationValues = modelValues[variationAttr];
                var camelizedAttrKey = 'akeneo_' + StringUtilsExt.camelize(variationAttr);
                var displayVariationAttr;

                if (camelizedAttrKey in productCustomAttrsMapping.matching) {
                    displayVariationAttr = productCustomAttrsMapping.matching[camelizedAttrKey];
                } else {
                    displayVariationAttr = camelizedAttrKey;
                }
                xswHandle.writeAttribute('attribute-id', displayVariationAttr);
                xswHandle.writeAttribute('variation-attribute-id', displayVariationAttr);

                if (variationValues && variationValues[0].locale) {
                    for (var k = 0; k < variationValues.length; k++) {
                        xswHandle.writeStartElement('display-name');
                        xswHandle.writeAttribute('xml:lang', variationValues[i].locale.replace('_', '-'));
                        xswHandle.writeCharacters(StringUtilsExt.capitalize(displayVariationAttr));
                        xswHandle.writeEndElement(); // display-name
                    }
                } else {
                    xswHandle.writeStartElement('display-name');
                    xswHandle.writeAttribute('xml:lang', 'x-default');
                    xswHandle.writeCharacters(StringUtilsExt.capitalize(displayVariationAttr));
                    xswHandle.writeEndElement(); // display-name
                }

                xswHandle.writeStartElement('variation-attribute-values');
                var enteredValues = [];
                for (var l = 0; l < variationProducts.length; l++) {
                    if (variationAttr in variationProducts[l].values) {
                        var variationValue = variationProducts[l].values[variationAttr];
                        var variationValueData = variationValue[0].data;
                        if (variationValue) {
                            if (typeof variationValueData === 'object') {
                                if (variationValueData.amount && variationValueData.unit) {
                                    variationValueData = variationValueData.amount + ' ' + variationValueData.unit;
                                } else if (variationValueData.amount && variationValueData.currency) {
                                    variationValueData = variationValueData.amount + ' ' + variationValueData.currency;
                                }
                            }
                            if (enteredValues.indexOf(variationAttr + '-' + variationValueData) === -1) { // if same value was not entered earlier
                                xswHandle.writeStartElement('variation-attribute-value');
                                xswHandle.writeAttribute('value', variationValueData);
                                xswHandle.writeStartElement('display-value');
                                xswHandle.writeAttribute('xml:lang', 'x-default');
                                xswHandle.writeCharacters(variationValueData);
                                xswHandle.writeEndElement(); // display-value

                                if (selectCodesList.indexOf(variationAttr) !== -1) {
                                    writeVariationValueLocales(xswHandle, variationAttr, variationValueData);
                                }

                                xswHandle.writeEndElement(); // variation-attribute-value
                                variationValuesSet.add(variationValueData);
                                enteredValues.push(variationAttr + '-' + variationValueData);
                            }
                        }
                    }
                }
                xswHandle.writeEndElement(); // variation-attribute-values

                xswHandle.writeEndElement(); // variation-attribute
            }
        }
    }

    return variationValuesSet;
}

/**
 * @desc Writes variation group tags
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Object} akeneoProduct - the product object
 * @param {dw.util.HashSet} variationValues - the values for variation attributes
 * @returns {void}
 */
function writeVariationGroupXML(xswHandle, akeneoProduct, variationValues) {
    var modelList = akeneoProduct.modelList || [];

    if (modelList && modelList.length > 0) {
        var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
        xswHandle.writeStartElement('variation-groups');

        for (var i = 0; i < modelList.length; i++) {
            var modelFileName = StringUtils.format(config.cacheDirectory.modelProducts.endPoint, config.sfccMasterCatalogID, modelList[i]);
            var modelProduct = customCacheWebdav.getCache(modelFileName);

            if (modelProduct) {
                var modelValues = modelProduct.values;
                var attrKeys = Object.keys(modelValues);

                for (var j = 0; j < attrKeys.length; j++) {
                    var productAttr = modelValues[attrKeys[j]];
                    var variationValueData = productAttr[0].data;

                    if (typeof (variationValueData) === 'object') {
                        if (variationValueData.amount && variationValueData.unit) {
                            variationValueData = variationValueData.amount + ' ' + variationValueData.unit;
                        } else if (variationValueData.amount && variationValueData.currency) {
                            variationValueData = variationValueData.amount + ' ' + variationValueData.currency;
                        }
                    }

                    if (variationValues.contains(variationValueData)) {
                        xswHandle.writeEmptyElement('variation-group');
                        xswHandle.writeAttribute('product-id', modelProduct.code);
                        break;
                    }
                }
            }
        }
        xswHandle.writeEndElement(); // variation-groups
    }
}

/**
 * @desc Writes variation attributes XML
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Object} modelProduct - model product object
 * @param {Object} akeneoImageAttrs - object containing list of product attrs
 */
akeneoVariationProducts.variationProducts = function (xswHandle, modelProduct, akeneoImageAttrs) {
    var variationProducts = modelProduct.variationProducts;
    var selectCodesList = akeneoImageAttrs.selectCodesList;

    try {
        if (variationProducts && variationProducts.length > 0) {
            xswHandle.writeStartElement('product');
            xswHandle.writeAttribute('product-id', modelProduct.code);
            xswHandle.writeStartElement('variations');

            xswHandle.writeStartElement('attributes');
            var variationValues = writeVariationAttributes(xswHandle, modelProduct, selectCodesList);
            xswHandle.writeEndElement(); // attributes

            xswHandle.writeStartElement('variants');
            for (var i = 0; i < variationProducts.length; i++) {
                xswHandle.writeEmptyElement('variant');
                xswHandle.writeAttribute('product-id', variationProducts[i].identifier);
            }
            xswHandle.writeEndElement(); // variants

            if (config.modelImport.type === 'master-group-variation') {
                writeVariationGroupXML(xswHandle, modelProduct, variationValues);
            }
            xswHandle.writeEndElement(); // variations
            xswHandle.writeEndElement(); // product
        }
    } catch (e) {
        throw new Error('ERROR: while writing variation products for product:' + modelProduct.code + ', stack: ' + e.stack + ', message: ' + e.message);
    }
};

/* Exported functions */
module.exports = akeneoVariationProducts;
