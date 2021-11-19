'use strict';

var generalUtils = require('~/cartridge/scripts/utils/generalUtils');

/**
 * @desc Fetches the model products by calling Akeneo API
 */
function getModelProducts() {
    var response;
    var akeneoProduct;
    var akeneoModelProductsUrl = generalUtils.config.APIURL.endpoints.ModelProductsUrl;
    var productPagination = require('~/cartridge/scripts/akeneoProducts/productPagination');
    var debugConfig = generalUtils.config.debug;
    var pageCounter = 0;

    try {
        do {
            var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
            response = 	productPagination.getProductsList(akeneoModelProductsUrl, paginationURL);

            if (response && response.productsList && response.productsList.getLength() > 0) {
                var iterator = response.productsList.iterator();

                while (iterator.hasNext()) {
                    akeneoProduct = iterator.next();
                    generalUtils.saveModelProductInCache(akeneoProduct);
                }
            }

            if (debugConfig.breakCodeOnLimit && ++pageCounter >= debugConfig.pageLimit) {
                break;
            }
        } while (response.serviceNextURL !== '');
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/* Exported functions */
module.exports = {
    getModelProducts: getModelProducts
};
