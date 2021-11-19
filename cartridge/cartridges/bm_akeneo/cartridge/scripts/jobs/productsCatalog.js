'use strict';

var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var akeneoCreateProductsXML = require('~/cartridge/scripts/akeneoCatalog/akeneoCreateProductsXML');
var saveVariationToMaster = require('~/cartridge/scripts/akeneoProducts/saveVariationToMaster');
var productCustomAttributes = require('~/cartridge/scripts/akeneoAttributes/productCustomAttributes');
var getFamilyVariantsAxes = require('~/cartridge/scripts/akeneoModelProducts/getFamilyVariants');
var akeneoAttributes = require('~/cartridge/scripts/akeneoAttributes/akeneoAttributes');

/**
 * @desc Calls Akeneo API to get the Products list
 * @param {Object} productSystemAttrWriter - XML writer for product system attributes
 * @param {Object} productCustomAttrWriter - XML writer for product custom attributes
 */
function getProducts(productSystemAttrWriter, productCustomAttrWriter) {
    var response;
    var akeneoProduct;
    var akeneoProductsUrl = generalUtils.config.APIURL.endpoints.ProductsUrl;
    var productPagination = require('~/cartridge/scripts/akeneoProducts/productPagination');
    var akeneoAttrServiceCall = require('~/cartridge/scripts/akeneoAttributes/akeneoAttrServiceCall');
    var akeneoImageAttrs = akeneoAttrServiceCall.getImageAttrs();
    var debugConfig = generalUtils.config.debug;
    var pageCounter = 0;
    var variantAxesValues = getFamilyVariantsAxes.getAllFamilyVariantsAxes();
    var advancedImportConfigAttrs = akeneoAttributes.getAdvancedImportConfigAttrs();
    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
        response = productPagination.getProductsList(akeneoProductsUrl, paginationURL);
        if (response.productsList && response.productsList.getLength() > 0) {
            var iter = response.productsList.iterator();
            while (iter.hasNext()) {
                akeneoProduct = iter.next();
                var importProduct = generalUtils.categoryMatchesWithConfig(akeneoProduct);
                if (importProduct) {
                    if (akeneoProduct.parent != null) {
                        saveVariationToMaster.saveVarToMaster(akeneoProduct, akeneoImageAttrs);
                    }
                    akeneoCreateProductsXML.writeAkeneoProducts(akeneoProduct, productSystemAttrWriter.xswHandle);
                    productCustomAttributes.getCustomAttributes(akeneoProduct, productCustomAttrWriter.xswHandle, akeneoImageAttrs, variantAxesValues, advancedImportConfigAttrs);
                }
            }
        }
        if (debugConfig.breakCodeOnLimit && ++pageCounter >= debugConfig.pageLimit) {
            break;
        }
    } while (response.serviceNextURL !== '');
}

/**
 * @desc creates XMLs for product system and custom attributes
 */
function createProductsXml() {
    try {
        var productSystemAttrWriter = akeneoCreateProductsXML.createCatalogHeaderXML(2, 'product');
        var productCustomAttrWriter = akeneoCreateProductsXML.createCatalogHeaderXML(3, 'product-custom-attributes');

        getProducts(productSystemAttrWriter, productCustomAttrWriter);

        akeneoCreateProductsXML.createCatalogFooterXML(productSystemAttrWriter);
        akeneoCreateProductsXML.createCatalogFooterXML(productCustomAttrWriter);
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/* Exported functions */
module.exports = {
    createProductsXml: createProductsXml
};
