'use strict';

var ArrayList = require('dw/util/ArrayList');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;

var akeneoAttrServiceCall = {};

/**
 * @desc Calls Akeneo API to get the attributes list.
 * @returns {dw.util.ArrayList} - list of akeneo attributes
 */
akeneoAttrServiceCall.getAkeneoItems = function () {
    var AkeneoItemsList = new ArrayList();
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var itemsPerPage;
    var attributesList = customCacheWebdav.getCache(config.cacheDirectory.attributes.attributesList);

    if (attributesList != null) {
        AkeneoItemsList.add(attributesList);
        return AkeneoItemsList;
    }

    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    // define service used for call
    var akeneoService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoService = akeneoService.getGeneralService();

    // setting the default akeneo hostname
    AkeneoService.setURL(config.serviceGeneralUrl + config.APIURL.endpoints.AttributesUrl + '?limit=' + config.APIURL.parameter.pagination);

    AkeneoServicesHandler.nextUrl = '';

    try {
        do {
            itemsPerPage = AkeneoServicesHandler.serviceRequestAttributesAkeneo(AkeneoService);
            AkeneoItemsList.addAll(itemsPerPage);
        } while (AkeneoServicesHandler.nextUrl !== '');
    } catch (e) {
        throw new Error('ERROR : While calling service to get Attributes List : ' + e.stack + ' with Error: ' + e.message);
    }
    customCacheWebdav = customCacheWebdav.setCache(config.cacheDirectory.attributes.attributesList, AkeneoItemsList.toArray());

    return AkeneoItemsList;
};

/**
 * @desc Get image attributes from customCacheWebdav.
 * @returns {Object} - object of imageCodesList and assetCodesList
 */
akeneoAttrServiceCall.getImageAttrs = function () {
    var imageCodesList = [];
    var assetCodesList = [];
    var selectCodesList = [];
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');

    var imageCodes = customCacheWebdav.getCache(config.cacheDirectory.attributes.imageCodesList);
    var assetCodes = customCacheWebdav.getCache(config.cacheDirectory.attributes.assetCodesList);
    var selectCodes = customCacheWebdav.getCache(config.cacheDirectory.attributes.selectCodesList);

    if (imageCodes && assetCodes && selectCodes) {
        return {
            imageCodesList: imageCodes,
            assetCodesList: assetCodes,
            selectCodesList: selectCodes
        };
    }
    var AkeneoAttributesList = this.getAkeneoItems();
    var attributesIterator = AkeneoAttributesList.iterator();
    var assetAttributeType = 'pim_catalog_asset_collection';

    if (config.assetSystemVersion === 'old') {
        assetAttributeType = 'pim_assets_collection';
    }
    while (attributesIterator.hasNext()) {
        var attr = attributesIterator.next();

        if (attr.type === assetAttributeType) {
            assetCodesList.push(attr.code);
        } else if (attr.type === 'pim_catalog_image') {
            imageCodesList.push(attr.code);
        } else if (attr.type === 'pim_catalog_simpleselect' || attr.type === 'pim_catalog_multiselect') {
            selectCodesList.push(attr.code);
        }
    }

    customCacheWebdav.setCache(config.cacheDirectory.attributes.imageCodesList, imageCodesList);
    customCacheWebdav.setCache(config.cacheDirectory.attributes.assetCodesList, assetCodesList);
    customCacheWebdav.setCache(config.cacheDirectory.attributes.selectCodesList, selectCodesList);

    return {
        imageCodesList: imageCodesList,
        assetCodesList: assetCodesList,
        selectCodesList: selectCodesList
    };
};

/* Exported functions */
module.exports = akeneoAttrServiceCall;
