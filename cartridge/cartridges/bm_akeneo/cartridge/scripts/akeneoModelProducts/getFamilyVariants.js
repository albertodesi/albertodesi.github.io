'use strict';

var StringUtils = require('dw/util/StringUtils');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');

var getFamilyVariants = {};
/**
 * Gets variants by family and stores in custom cache
 * @param {string} masterFamilyCode - masterFamilyCode
 * @param {string} variationFamilyCode - variationFamilyCode
 * @returns {Object} - object of family variants
 */
getFamilyVariants.variantsByfamily = function (masterFamilyCode, variationFamilyCode) {
    if (!(masterFamilyCode && variationFamilyCode)) {
        return undefined;
    }
    var response;

    var serviceURL = StringUtils.format(config.APIURL.endpoints.getFamilyVariant, variationFamilyCode, masterFamilyCode);
    var cacheFileName = StringUtils.format(config.cacheDirectory.familyVariants.endPoint, variationFamilyCode, masterFamilyCode);
    var akeneoFamilyVariantsObject = customCacheWebdav.getCache(cacheFileName);

    if (akeneoFamilyVariantsObject) {
        return akeneoFamilyVariantsObject;
    }

    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    // define service used for call
    var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoService = initAkeneoServices.getGeneralService();

    // setting the default akeneo hostname
    AkeneoService.setURL(config.serviceGeneralUrl);

    AkeneoServicesHandler.nextUrl = '';

    try {
        response = AkeneoServicesHandler.serviceRequestFamilyAkeneo(AkeneoService, serviceURL);
        customCacheWebdav.setCache(cacheFileName, response);

        // sorting the image and asset codes based on family attributes
        var akeneoAttrServiceCall = require('~/cartridge/scripts/akeneoAttributes/akeneoAttrServiceCall');
        var akeneoImageAttrs = akeneoAttrServiceCall.getImageAttrs();
        var imageCodesList = akeneoImageAttrs.imageCodesList.slice();
        var assetCodesList = akeneoImageAttrs.assetCodesList.slice();
        var variantAttributeSets = response.variant_attribute_sets;

        for (var i = 0; i < variantAttributeSets.length; i++) {
            var attributes = variantAttributeSets[i].attributes;

            for (var j = 0; j < akeneoImageAttrs.imageCodesList.length; j++) {
                var imageCode = akeneoImageAttrs.imageCodesList[j];
                if (attributes.indexOf(imageCode) !== -1) {
                    imageCodesList.splice(imageCodesList.indexOf(imageCode), 1);
                    imageCodesList.unshift(imageCode);
                }
            }

            for (var k = 0; k < akeneoImageAttrs.assetCodesList.length; k++) {
                var assetCode = akeneoImageAttrs.assetCodesList[k];
                if (attributes.indexOf(assetCode) !== -1) {
                    assetCodesList.splice(assetCodesList.indexOf(assetCode), 1);
                    assetCodesList.unshift(assetCode);
                }
            }
        }
        customCacheWebdav.setCache(config.cacheDirectory.attributes.imageCodesList, imageCodesList);
        customCacheWebdav.setCache(config.cacheDirectory.attributes.assetCodesList, assetCodesList);
    } catch (e) {
        throw new Error('ERROR : While calling service to get family variants  : ' + e.stack + ' with Error: ' + e.message);
    }

    return response;
};
/**
 * Gets all variant axes of attributes of a single family code
 * @param {string} familyCode - familyCode
 * @param {string} savedNextURL - savedNextURL
 * @param {dw.util.HashSet} axesValues - hashset object to store variants axes values
 * @returns {Object} - set of variant axes and savedNextURL
 */
function getAllVariantAxes(familyCode, savedNextURL, axesValues) {
    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    // define service used for call
    var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoService = initAkeneoServices.getGeneralService();
    var serviceURL = StringUtils.format(config.APIURL.endpoints.getAllFamilyVariants, familyCode);
    var response;

    // setting the default akeneo hostname
    AkeneoService.setURL(config.serviceGeneralUrl);
    AkeneoServicesHandler.nextUrl = '';

    try {
        if (!savedNextURL) {
            AkeneoServicesHandler.nextUrl = '';
        } else {
            AkeneoServicesHandler.nextUrl = savedNextURL;
        }

        var variantAxesResult = AkeneoServicesHandler.serviceRequestCatalogAkeneo(AkeneoService, serviceURL + '?limit=' + config.APIURL.parameter.pagination);
        if (variantAxesResult && variantAxesResult.getLength() > 0) {
            for (var i = 0; i < variantAxesResult.length; i++) {
                var eachItem = variantAxesResult[i];
                var variantAttrs = eachItem.variant_attribute_sets;
                for (var j = 0; j < variantAttrs.length; j++) {
                    var variantAxes = variantAttrs[j].axes;
                    axesValues.add(variantAxes);
                }
            }
        }

        response = {
            serviceNextURL: AkeneoServicesHandler.nextUrl,
            axesValues: axesValues
        };
    } catch (e) {
        throw new Error('ERROR : While calling service to get family variants  : ' + e.stack + ' with Error: ' + e.message);
    }

    return response;
}
/**
 * Gets variants attributes by family
 * @param {string} savedNextURL - savedNextURL
 * @returns {Object} - set of variant axes and savedNextURL
 */
function variantAttributesByfamily(savedNextURL) {
    var serviceURL = config.APIURL.endpoints.getAllFamilies;
    var response;
    var HashSet = require('dw/util/HashSet');
    var axesValues = new HashSet();
    var axesResponse;
    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    // define service used for call
    var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoService = initAkeneoServices.getGeneralService();

    // setting the default akeneo hostname
    AkeneoService.setURL(config.serviceGeneralUrl);

    AkeneoServicesHandler.nextUrl = '';

    try {
        if (!savedNextURL) {
            AkeneoServicesHandler.nextUrl = '';
        } else {
            AkeneoServicesHandler.nextUrl = savedNextURL;
        }

        var familiesResult = AkeneoServicesHandler.serviceRequestCatalogAkeneo(AkeneoService, serviceURL + '?limit=' + config.APIURL.parameter.pagination);

        if (familiesResult && familiesResult.getLength() > 0) {
            for (var i = 0; i < familiesResult.length; i++) {
                var eachItem = familiesResult[i];
                var familyCode = eachItem.code;

                do {
                    var paginationURL = (typeof (axesResponse) !== 'undefined' && axesResponse.serviceNextURL) ? axesResponse.serviceNextURL : null;
                    axesResponse = getAllVariantAxes(familyCode, paginationURL, axesValues);
                } while (axesResponse.serviceNextURL !== '');
            }
        }

        response = {
            serviceNextURL: AkeneoServicesHandler.nextUrl,
            axesValues: axesResponse.axesValues
        };

        return response;
    } catch (e) {
        throw new Error('ERROR : While calling service to get family variants  : ' + e.stack + ' with Error: ' + e.message);
    }
}
/**
 * Gets all family variants axes and stores in custom cache
 * @returns {dw.util.HashSet} - set of variant axes
 */
getFamilyVariants.getAllFamilyVariantsAxes = function () {
    var HashSet = require('dw/util/HashSet');
    var hashSetObj = new HashSet();
    var response;
    var cacheFileName = config.cacheDirectory.variantsAxes.axesList;
    var familyVariantAxes = customCacheWebdav.getCache(cacheFileName);

    if (familyVariantAxes) {
        hashSetObj.add(familyVariantAxes);
        return hashSetObj;
    }

    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
        response = variantAttributesByfamily(paginationURL);
        var axesValues = response.axesValues;
        hashSetObj.addAll(axesValues);
    } while (response.serviceNextURL !== '');

    customCacheWebdav.setCache(cacheFileName, hashSetObj.toArray());
    return hashSetObj;
};

/* Exported functions */
module.exports = getFamilyVariants;
