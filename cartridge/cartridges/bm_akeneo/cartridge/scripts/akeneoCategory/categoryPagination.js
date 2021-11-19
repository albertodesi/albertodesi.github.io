'use strict';

var logUtils = require('~/cartridge/scripts/utils/logUtils');
var Logger = logUtils.getLogger('categoryPagination');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;

var categoryPagination = {};
/**
 * @desc Gets categories list from akeneo API
 * @param {string} savedNextURL - savedNextURL
 * @returns {Object} - list of akeneo categories and savedNextURL
 */
categoryPagination.getCategoriesList = function (savedNextURL) {
    var response;
    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');

    // define service used for call
    var akeneoService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoCategoryService = akeneoService.getGeneralService();

    // setting the default akeneo hostname
    AkeneoCategoryService.setURL(config.serviceGeneralUrl);

    try {
        if (!savedNextURL) {
            AkeneoServicesHandler.nextUrl = '';
        } else {
            AkeneoServicesHandler.nextUrl = savedNextURL;
        }

        var akeneoCategoriesList = AkeneoServicesHandler.serviceRequestCatalogAkeneo(AkeneoCategoryService, config.APIURL.endpoints.CategoriesUrl + '?limit=' + config.APIURL.parameter.pagination);

        response = {
            categoriesList: akeneoCategoriesList,
            serviceNextURL: AkeneoServicesHandler.nextUrl
        };
    } catch (e) {
        Logger.error('ERROR : No  Categories retrieved from API Akeneo ' + e.message);
    }
    return response;
};

/* Exported functions */
module.exports = categoryPagination;

