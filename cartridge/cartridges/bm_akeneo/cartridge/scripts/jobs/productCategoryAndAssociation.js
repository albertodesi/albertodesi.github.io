'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var writeCategory = config.writeCategories;
var akeneoCreateCatalogXML = require('~/cartridge/scripts/akeneoCatalog/akeneoCreateCatalogXML');

/**
 * @desc check if product categories are matching with sub categories list stored in custom object
 * @param {Object} akeneoProduct - the product to check
 * @returns {boolean} - true if product categories are matching with sub categories list
 */
function checkSubCategoryMatching(akeneoProduct) {
    if (akeneoProduct.categories.length === 0) {
        return true;
    }
    var topLevelCatCodes = config.customObjectType.TopLevelCategoriesCodes;
    var topLevelCatCodesCustomObj = CustomObjectMgr.getCustomObject(topLevelCatCodes, topLevelCatCodes);

    if (topLevelCatCodesCustomObj) {
        var subCategoriesCodeList = JSON.parse(topLevelCatCodesCustomObj.custom.subCategoriesCodes || '[]');

        if (!subCategoriesCodeList.length) {
            return true;
        }
        for (var index = 0; index < akeneoProduct.categories.length; index++) {
            var akeneoCategory = akeneoProduct.categories[index];
            if (subCategoriesCodeList.indexOf(akeneoCategory) !== -1) {
                return true;
            }
        }
    }
    return false;
}

/**
 * @desc Writes category assignment and associations XML
 * @param {Object} akeneoProduct - the product to write XML for
 * @param {Object} catalogWriter - the XML writers
 */
function writeCategoryAndAssociation(akeneoProduct, catalogWriter) {
    var importCategory = checkSubCategoryMatching(akeneoProduct);
    var productAssociationImportType = config.productAssociationImportType.type;

    if (importCategory) {
        if (writeCategory) {
            akeneoCreateCatalogXML.createCatalogCategoryAssignmentXML(akeneoProduct, catalogWriter.categoryWriter.xswHandle);
        }

        switch (productAssociationImportType) {
            case 'product-recommendations':
                akeneoCreateCatalogXML.createCatalogRecommendationsXML(akeneoProduct, catalogWriter.recommendationWriter.xswHandle);
                break;
            case 'product-links':
                akeneoCreateCatalogXML.createCatalogProductLinkXML(akeneoProduct, catalogWriter.recommendationWriter.xswHandle);
                break;
            default:
        }
    }
}

/**
 * @desc Gets the XML file writers
 * @param {boolean} isProductModelCatalog - true if the catalog writers are for model products
 * @returns {Object} - category and recommendation file writers
 */
function writeFileHeaders(isProductModelCatalog) {
    var catFileIndex;
    var recoFileIndex;
    var catFileName;
    var recoFileName;
    var akeneoProductAssociation = config.productAssociationImportType.type ? config.productAssociationImportType.type : 'product-recommendations';

    if (isProductModelCatalog) {
        catFileIndex = 3.1;
        recoFileIndex = 3.2;
        catFileName = 'product-model-category-assignment';
        recoFileName = 'product-model-' + akeneoProductAssociation;
    } else {
        catFileIndex = 2.1;
        recoFileIndex = 2.2;
        catFileName = 'product-category-assignment';
        recoFileName = 'product-' + akeneoProductAssociation;
    }
    var categoryWriter = akeneoCreateCatalogXML.createCatalogHeaderXML(catFileIndex, catFileName);
    var recommendationWriter = akeneoCreateCatalogXML.createCatalogHeaderXML(recoFileIndex, recoFileName);

    return {
        categoryWriter: categoryWriter,
        recommendationWriter: recommendationWriter
    };
}

/**
 * @desc Flushes and closes XML writers
 * @param {Object} catalogWriter - Object containing the file writers
 */
function writeFileFooters(catalogWriter) {
    akeneoCreateCatalogXML.createCatalogFooterXML(catalogWriter.categoryWriter);
    akeneoCreateCatalogXML.createCatalogFooterXML(catalogWriter.recommendationWriter);
}

/**
 * @desc get model products list from custom cache
 */
function getMasterProducts() {
    var catalogWriter = writeFileHeaders(true);
    var StringUtils = require('dw/util/StringUtils');
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var baseLocation = StringUtils.format(config.cacheDirectory.modelProducts.baseLocation, config.sfccMasterCatalogID);
    var filesList = customCacheWebdav.listFilesInCache(baseLocation);

    for (var index = 0; index < filesList.length; index++) {
        var file = filesList[index];
        var fileName = StringUtils.format(config.cacheDirectory.modelProducts.endPoint, config.sfccMasterCatalogID, file.substring(0, file.lastIndexOf('.')));
        var masterProduct = customCacheWebdav.getCache(fileName);

        if (masterProduct) {
            writeCategoryAndAssociation(masterProduct, catalogWriter);
        }
    }
    writeFileFooters(catalogWriter);
}

/**
 * @desc Calls Akeneo API to get the Products list
 */
function getProducts() {
    var response;
    var akeneoProductsUrl = config.APIURL.endpoints.ProductsUrl;
    var catalogWriter = writeFileHeaders(false);
    var productPagination = require('~/cartridge/scripts/akeneoProducts/productPagination');

    var debugConfig = config.debug;
    var pageCounter = 0;

    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
        response = productPagination.getProductsList(akeneoProductsUrl, paginationURL);

        if (response.productsList && response.productsList.getLength() > 0) {
            var iter = response.productsList.iterator();

            while (iter.hasNext()) {
                var akeneoProduct = iter.next();
                var importProduct = generalUtils.categoryMatchesWithConfig(akeneoProduct);

                if (importProduct) {
                    writeCategoryAndAssociation(akeneoProduct, catalogWriter);
                }
            }
        }

        if (debugConfig.breakCodeOnLimit && ++pageCounter >= debugConfig.pageLimit) {
            break;
        }
    } while (response.serviceNextURL !== '');

    writeFileFooters(catalogWriter);
}

/**
 * @desc Calls Akeneo API to create product-category and product-associations xml files
 */
function createCategoryAssociationXml() {
    try {
        getProducts();
        getMasterProducts();
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/* Exported functions */
module.exports = {
    createCategoryAssociationXml: createCategoryAssociationXml
};
