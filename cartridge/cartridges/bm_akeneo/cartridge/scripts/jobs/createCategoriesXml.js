'use strict';

var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');
var akeneoCreateCatalogXML = require('~/cartridge/scripts/akeneoCatalog/akeneoCreateCatalogXML');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');

/**
 * @desc Gets list of categories
 * @param {Object} catalogWriter - Category XML writer
 */
function getCategories(catalogWriter) {
    var response;
    var categoryPagination = require('~/cartridge/scripts/akeneoCategory/categoryPagination');
    var pageCounter = 0;
    var debugConfig = GeneralUtils.config.debug;

    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
        response = categoryPagination.getCategoriesList(paginationURL);

        if (response.categoriesList && response.categoriesList.getLength() > 0) {
            akeneoCreateCatalogXML.createCatalogCategoryXML(response.categoriesList, catalogWriter.xswHandle);
        }

        if (debugConfig.breakCodeOnLimit && ++pageCounter >= debugConfig.pageLimit) {
            break;
        }
    } while (response.serviceNextURL !== '');
}

/**
 * @desc clear sub categories form category custom object
 */
function clearSubCategoriesList() {
    var categoryCustomObjectID = GeneralUtils.config.customObjectType.TopLevelCategoriesCodes;
    var categoryCustomObject = CustomObjectMgr.getCustomObject(categoryCustomObjectID, categoryCustomObjectID);

    if (!categoryCustomObject) {
        Transaction.begin();
        categoryCustomObject = CustomObjectMgr.createCustomObject(categoryCustomObjectID, categoryCustomObjectID);
        Transaction.commit();
    } else {
        Transaction.begin();
        // making subCategoriesCodes as empty array
        categoryCustomObject.custom.subCategoriesCodes = '[]';
        Transaction.commit();
    }
}

/**
 * @desc Calls Akeneo API to get the categories list and creates xml
 */
function writeCategoriesXml() {
    if (GeneralUtils.config.writeCategories) {
        // clear sub categories
        clearSubCategoriesList();

        try {
            var catalogWriter = akeneoCreateCatalogXML.createCatalogHeaderXML(1, 'categories');

            getCategories(catalogWriter);

            akeneoCreateCatalogXML.createCatalogFooterXML(catalogWriter);
        } catch (e) {
            throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
        }
    }
}

/* Exported functions */
module.exports = {
    writeCategoriesXml: writeCategoriesXml
};
