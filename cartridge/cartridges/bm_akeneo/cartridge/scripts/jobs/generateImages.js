'use strict';

var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');
var StringUtils = require('dw/util/StringUtils');
var writeImagesXML = require('~/cartridge/scripts/akeneoMediaFiles/writeImagesXML');

/**
 * @desc Calls Akeneo API to get the Products list
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Array} imageCodeList - list of image codes
 * @param {Array} assetCodeList - list of asset codes
 * @returns {void}
 */
function productImageXML(xswHandle, imageCodeList, assetCodeList) {
    var response;
    var akeneoProduct;
    var akeneoProductsUrl = GeneralUtils.config.APIURL.endpoints.ProductsUrl;
    var productPagination = require('~/cartridge/scripts/akeneoProducts/productPagination');
    var debugConfig = GeneralUtils.config.debug;
    var pageCounter = 0;

    try {
        do {
            var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
            response = 	productPagination.getProductsList(akeneoProductsUrl, paginationURL);

            if (response.productsList && response.productsList.getLength() > 0) {
                var iter = response.productsList.iterator();
                while (iter.hasNext()) {
                    akeneoProduct = iter.next();
                    var importProduct = GeneralUtils.categoryMatchesWithConfig(akeneoProduct);

                    if (importProduct && !akeneoProduct.parent) {
                        writeImagesXML.createProductImageXML(xswHandle, akeneoProduct, imageCodeList, assetCodeList);
                    }
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

/**
 * @desc Creates image attributes  tags for master product
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - the XML writer
 * @param {Array} imageCodeList - array of image codes
 * @param {Array} assetCodeList - array of asset codes
 * @returns {void}
 */
function masterImageXML(xswHandle, imageCodeList, assetCodeList) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var baseLocation = StringUtils.format(GeneralUtils.config.cacheDirectory.modelProducts.baseLocation, GeneralUtils.config.sfccMasterCatalogID);
    var filesList = customCacheWebdav.listFilesInCache(baseLocation);

    for (var index = 0; index < filesList.length; index++) {
        var file = filesList[index];
        var fileName = StringUtils.format(GeneralUtils.config.cacheDirectory.modelProducts.endPoint, GeneralUtils.config.sfccMasterCatalogID, file.substring(0, file.lastIndexOf('.')));
        var masterProduct = customCacheWebdav.getCache(fileName);

        if (masterProduct && !masterProduct.parent) {
            writeImagesXML.createMasterImageXML(xswHandle, masterProduct, imageCodeList, assetCodeList);
        }
    }
}

/**
 * @desc Creates Image XML with Assets and Media files
 */
function createMediaXml() {
    var akeneoAttrServiceCall = require('~/cartridge/scripts/akeneoAttributes/akeneoAttrServiceCall');
    var akeneoImageAttrs = akeneoAttrServiceCall.getImageAttrs();
    var akeneoCreateProductsXML = require('~/cartridge/scripts/akeneoCatalog/akeneoCreateProductsXML');
    var productWriter = akeneoCreateProductsXML.createCatalogHeaderXML(7, 'product-images');

    productImageXML(productWriter.xswHandle, akeneoImageAttrs.imageCodesList, akeneoImageAttrs.assetCodesList);
    masterImageXML(productWriter.xswHandle, akeneoImageAttrs.imageCodesList, akeneoImageAttrs.assetCodesList);

    akeneoCreateProductsXML.createCatalogFooterXML(productWriter);
}

/* Exported functions */
module.exports = {
    createMediaXml: createMediaXml
};
