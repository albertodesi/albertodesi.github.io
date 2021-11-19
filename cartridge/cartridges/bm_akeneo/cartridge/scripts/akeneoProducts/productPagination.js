'use strict';

var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var productPagination = {};

/**
 * @desc reads custom cache from /products directory and returns ArrayList
 * @returns {dw.util.ArrayList} - list of products from cache
 */
function getProductsListFromCache() {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var StringUtils = require('dw/util/StringUtils');
    var ArrayList = require('dw/util/ArrayList');
    var productsList = new ArrayList();
    var baseLocation = StringUtils.format(config.cacheDirectory.products.baseLocation, config.sfccMasterCatalogID);
    var filesList = customCacheWebdav.listFilesInCache(baseLocation);

    for (var index = 0; index < filesList.length; index++) {
        var file = filesList[index];
        var fileName = StringUtils.format(config.cacheDirectory.products.endPoint, config.sfccMasterCatalogID, file.substring(0, file.lastIndexOf('.')));
        var product = customCacheWebdav.getCache(fileName);

        if (product) {
            productsList.add(product);
        }
    }
    return productsList;
}

/**
 * @desc Gets products list from akeneo API
 * @param {string} akeneoProductsURL - products URL
 * @param {string} nextURL - nextURL
 * @returns {Object} - object products list and service next url
 */
productPagination.getProductsList = function (akeneoProductsURL, nextURL) {
    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var akeneoService = initAkeneoServices.getGeneralService();
    akeneoService.setURL(config.serviceGeneralUrl);
    var productsList;

    if (!nextURL) {
        AkeneoServicesHandler.nextUrl = '';
    } else if (nextURL === 'read-from-cache') {
        productsList = getProductsListFromCache();

        return {
            productsList: productsList,
            serviceNextURL: ''
        };
    } else {
        AkeneoServicesHandler.nextUrl = nextURL;
    }

    productsList = AkeneoServicesHandler.serviceRequestProductAkeneo(akeneoService, akeneoProductsURL);

    // if product pagination has ended AND it is a differential import AND call is made for products endpoint, setting nextURL to 'read-from-cache' to read products from custom cache in next function call
    if (AkeneoServicesHandler.nextUrl === '' && generalUtils.getLastImportedTime('AkeneoCatalogRunTime') && akeneoProductsURL.indexOf('product-models') === -1) {
        AkeneoServicesHandler.nextUrl = 'read-from-cache';
    }

    var response = {
        productsList: productsList,
        serviceNextURL: AkeneoServicesHandler.nextUrl
    };

    return response;
};

/* Exported functions */
module.exports = productPagination;
