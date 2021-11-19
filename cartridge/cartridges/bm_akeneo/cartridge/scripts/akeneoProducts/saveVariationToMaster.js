'use strict';

var StringUtils = require('dw/util/StringUtils');
var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');

/**
 * @desc Push variation attribute details to custom attribute of master object
 */
var saveVariationToMaster = {};

/**
 * Remove existing variation product details from master custom object to avoid duplicate entry
 * @param {Array} variationProducts - the array of variation product
 * @param {string} productIdentifier - the variation product to remove from array
 * @returns {Array} - the modified array
 */
function removeExistingSameVariationProduct(variationProducts, productIdentifier) {
    for (var i = 0; i < variationProducts.length; i++) {
        if (variationProducts[i].identifier === productIdentifier) {
            variationProducts.splice(i, 1);
            break;
        }
    }

    return variationProducts;
}

/**
 * Save variation attribute values to master custom object
 * @param {Object} akeneoProduct - the variation product
 * @param {array} imageCodeList - array of image codes
 * @param {array} assetCodeList - array of asset codes
 * @returns {void}
 */
function saveVariationAttributeValuesToMaster(akeneoProduct, imageCodeList, assetCodeList) {
    var variationFamilyCode = akeneoProduct.family;
    var masterObject = generalUtils.getMasterModelProduct(akeneoProduct);
    if (masterObject) {
        var masterFamilyCode = masterObject.masterFamilyVariant;
        var getFamilyVariants = require('~/cartridge/scripts/akeneoModelProducts/getFamilyVariants');
        var familyVariants = getFamilyVariants.variantsByfamily(masterFamilyCode, variationFamilyCode);
        var variationProducts = masterObject.variationProducts || [];
        var variationDetails = {
            identifier: akeneoProduct.identifier
        };

        variationProducts = removeExistingSameVariationProduct(variationProducts, akeneoProduct.identifier);

        if (familyVariants && familyVariants.variant_attribute_sets) {
            var variantAttributeSets = familyVariants.variant_attribute_sets;
            var values = {};
            var mediaValues = {};

            for (var i = 0; i < variantAttributeSets.length; i++) {
                var axes = variantAttributeSets[i].axes;

                for (var j = 0; j < axes.length; j++) {
                    var axe = axes[j];
                    values[axe] = akeneoProduct.values[axe];
                }
            }

            var mediaCodesList = imageCodeList.concat(assetCodeList);

            for (var k = 0; k < mediaCodesList.length; k++) {
                var attr = mediaCodesList[k];
                mediaValues[attr] = akeneoProduct.values[attr];
            }

            variationDetails.values = values;
            variationDetails.mediaValues = mediaValues;
            variationProducts.push(variationDetails);
            masterObject.variantAttributeSets = variantAttributeSets;
        }
        masterObject.variationProducts = variationProducts;

        var cacheFileName = StringUtils.format(generalUtils.config.cacheDirectory.modelProducts.endPoint, generalUtils.config.sfccMasterCatalogID, masterObject.code);
        customCacheWebdav.clearCache(cacheFileName);
        customCacheWebdav.setCache(cacheFileName, masterObject);
    }
}

/**
 * Save variation product details to master product
 * @param {Object} akeneoProduct - the variation product
 * @param {Object} akeneoImageAttrs - akeneoImageAttrs
 */
saveVariationToMaster.saveVarToMaster = function (akeneoProduct, akeneoImageAttrs) {
    try {
        if (akeneoProduct) {
            if (akeneoProduct.parent && akeneoProduct.identifier) {
                saveVariationAttributeValuesToMaster(akeneoProduct, akeneoImageAttrs.imageCodesList, akeneoImageAttrs.assetCodesList);
            }
        }
    } catch (e) {
        throw new Error('ERROR : While pushing variation attribute details to master product\'s custom cache ' + e);
    }
};

/* Exported functions */
module.exports = saveVariationToMaster;
