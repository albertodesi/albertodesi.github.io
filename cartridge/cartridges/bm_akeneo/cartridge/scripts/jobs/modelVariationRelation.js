'use strict';

var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');
var StringUtils = require('dw/util/StringUtils');

/**
 * @desc gets model products from custom cache
 * @param {Object} productWriter - XML writer
 */
function getMasterObject(productWriter) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var baseLocation = StringUtils.format(GeneralUtils.config.cacheDirectory.modelProducts.baseLocation, GeneralUtils.config.sfccMasterCatalogID);
    var filesList = customCacheWebdav.listFilesInCache(baseLocation);
    var akeneoVariationProducts = require('~/cartridge/scripts/akeneoModelProducts/akeneoVariationProducts');
    var akeneoAttrServiceCall = require('~/cartridge/scripts/akeneoAttributes/akeneoAttrServiceCall');
    var akeneoImageAttrs = akeneoAttrServiceCall.getImageAttrs();

    for (var index = 0; index < filesList.length; index++) {
        var file = filesList[index];
        var fileName = StringUtils.format(GeneralUtils.config.cacheDirectory.modelProducts.endPoint, GeneralUtils.config.sfccMasterCatalogID, file.substring(0, file.lastIndexOf('.')));
        var masterProduct = customCacheWebdav.getCache(fileName);

        if (masterProduct && !masterProduct.parent) {
            akeneoVariationProducts.variationProducts(productWriter.xswHandle, masterProduct, akeneoImageAttrs);
        }
    }
}

/**
 * @desc Writes Model variation relation XML
 */
function createMasterVarCatalog() {
    var akeneoCreateProductsXML = require('~/cartridge/scripts/akeneoCatalog/akeneoCreateProductsXML');
    var productWriter = akeneoCreateProductsXML.createCatalogHeaderXML(6, 'model-variation-products');

    getMasterObject(productWriter);

    akeneoCreateProductsXML.createCatalogFooterXML(productWriter);
}

/* Exported functions */
module.exports = {
    createMasterVarCatalog: createMasterVarCatalog
};
