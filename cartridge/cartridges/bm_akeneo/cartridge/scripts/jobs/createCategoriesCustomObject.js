'use strict';

var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');

/**
 * @desc Get list of categories
 * @param {Array} akeneoMainCatalogs - the catalogs to download from Akeneo
 * @returns {void}
 */
function getCategories(akeneoMainCatalogs) {
    var response;
    var categoryPagination = require('~/cartridge/scripts/akeneoCategory/categoryPagination');

    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
        response = categoryPagination.getCategoriesList(paginationURL);

        if (response.categoriesList && response.categoriesList.getLength() > 0) {
            generalUtils.saveCategoriesToCustomObject(response.categoriesList, akeneoMainCatalogs);
        }
    } while (response.serviceNextURL !== '');
}

/**
 * @desc Deletes the existing custom object
 * @returns {void}
 */
function deleteCategoryCustomObj() {
    var customObjType = config.customObjectType.TopLevelCategoriesCodes;
    var categoryCustomObj = CustomObjectMgr.getCustomObject(customObjType, customObjType);

    if (categoryCustomObj) {
        Transaction.begin();
        CustomObjectMgr.remove(categoryCustomObj);
        Transaction.commit();
    }
}

/**
 * @desc Calls Akeneo API to get the Categories list and saves to custom object
 * @returns {void}
 */
function saveCategoriesCO() {
    // delete the existing category custom objects and create new by considering akeneoMainCatalogs preference value
    deleteCategoryCustomObj();
    var akeneoMainCatalogs = config.akeneoMainCatalogs;

    try {
        if (akeneoMainCatalogs && akeneoMainCatalogs.length > 0) {
            getCategories(akeneoMainCatalogs);
        }
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/* Exported functions */
module.exports = {
    saveCategoriesCO: saveCategoriesCO
};
