'use strict';

/**
 * @desc Adds products to custom cache which are part of asset modification list
 */
function updateProducts() {
    var HashSet = require('dw/util/HashSet');
    var StringUtils = require('dw/util/StringUtils');

    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
    var config = generalUtils.config;

    var assetProductRelationList = customCacheWebdav.getCache(config.cacheDirectory.assetFamilies.assetProductRelationBaseLocation) || [];

    if (assetProductRelationList.length) {
        var products = new HashSet();

        for (var i = 0; i < assetProductRelationList.length; i++) {
            var asset = assetProductRelationList[i];
            var assetProductRelation = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.assetProductRelation, asset)) || [];
            products.add(assetProductRelation);
        }
        customCacheWebdav.setCache(config.cacheDirectory.assetFamilies.assetProductRelationBaseLocation, []);
        var productsIterator = products.iterator();

        while (productsIterator.hasNext()) {
            var productCode = productsIterator.next();
            generalUtils.fetchProductObject(productCode);
        }
    }
}

module.exports = {
    updateProducts: updateProducts
};
