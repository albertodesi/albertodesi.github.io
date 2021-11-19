'use strict';

var StringUtils = require('dw/util/StringUtils');
var config = require('~/cartridge/scripts/utils/generalUtils').config;
var akeneoCreateProductsXML = require('~/cartridge/scripts/akeneoCatalog/akeneoCreateProductsXML');
var productCustomAttributes = require('~/cartridge/scripts/akeneoAttributes/productCustomAttributes');
var getFamilyVariantsAxes = require('~/cartridge/scripts/akeneoModelProducts/getFamilyVariants');
var akeneoAttributes = require('~/cartridge/scripts/akeneoAttributes/akeneoAttributes');

/**
 * @desc Saves ID of second level model product to its parent
 * @param {Object} modelProduct - 2nd level model
 */
function saveModelProductToParent(modelProduct) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var masterFileName = StringUtils.format(config.cacheDirectory.modelProducts.endPoint, config.sfccMasterCatalogID, modelProduct.parent);
    var masterProduct = customCacheWebdav.getCache(masterFileName);

    if (masterProduct) {
        var modelList = masterProduct.modelList || [];
        modelList.push(modelProduct.code);
        masterProduct.modelList = modelList;
        customCacheWebdav.clearCache(masterFileName);
        customCacheWebdav.setCache(masterFileName, masterProduct);
    }
}

/**
 * @desc gets the Model Products list from custom cache
 * @param {Object} modelProductSystemAttrWriter - XML writer for product system attributes
 * @param {Object} modelProductCustomAttrWriter - XML writer for product custom attributes
 */
function getModelProducts(modelProductSystemAttrWriter, modelProductCustomAttrWriter) {
    var modelImportType = config.modelImport.type ? config.modelImport.type : 'master-variation';
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var variantAxesValues = getFamilyVariantsAxes.getAllFamilyVariantsAxes();
    var akeneoAttrServiceCall = require('~/cartridge/scripts/akeneoAttributes/akeneoAttrServiceCall');
    var akeneoImageAttrs = akeneoAttrServiceCall.getImageAttrs();
    var baseLocation = StringUtils.format(config.cacheDirectory.modelProducts.baseLocation, config.sfccMasterCatalogID);
    var filesList = customCacheWebdav.listFilesInCache(baseLocation);
    var advancedImportConfigAttrs = akeneoAttributes.getAdvancedImportConfigAttrs();

    for (var index = 0; index < filesList.length; index++) {
        var file = filesList[index];
        var fileName = StringUtils.format(config.cacheDirectory.modelProducts.endPoint, config.sfccMasterCatalogID, file.substring(0, file.lastIndexOf('.')));
        var modelProduct = customCacheWebdav.getCache(fileName);

        if (modelProduct) {
            if (modelImportType === 'master-group-variation' && modelProduct.parent) {
                saveModelProductToParent(modelProduct);
            }
            if ((modelImportType === 'master-variation' && !modelProduct.parent) || modelImportType === 'master-group-variation') {
                akeneoCreateProductsXML.writeAkeneoProducts(modelProduct, modelProductSystemAttrWriter.xswHandle);
                productCustomAttributes.getCustomAttributes(modelProduct, modelProductCustomAttrWriter.xswHandle, akeneoImageAttrs, variantAxesValues, advancedImportConfigAttrs);
            }
        }
    }
}

/**
 * @desc creates system and custom attributes XMLs for model products
 */
function createModelCatalog() {
    try {
        var modelProductSystemAttrWriter = akeneoCreateProductsXML.createCatalogHeaderXML(4, 'product-model');
        var modelProductCustomAttrWriter = akeneoCreateProductsXML.createCatalogHeaderXML(3.1, 'model-product-custom-attributes');

        getModelProducts(modelProductSystemAttrWriter, modelProductCustomAttrWriter);

        akeneoCreateProductsXML.createCatalogFooterXML(modelProductSystemAttrWriter);
        akeneoCreateProductsXML.createCatalogFooterXML(modelProductCustomAttrWriter);
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/* Exported functions */
module.exports = {
    createModelCatalog: createModelCatalog
};
