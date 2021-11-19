'use strict';

var akeneoEntityRecords = {};

/**
 * @desc getEntityRecords of a single reference entity from API
 * @param {string} savedNextURL - savedNextURL
 * @param {string} entityRecordUrl - entityRecordUrl
 * @returns {dw.util.ArrayList} - list of entity records
 */
akeneoEntityRecords.getEntityRecords = function (savedNextURL, entityRecordUrl) {
    var Site = require('dw/system/Site');
    var CustomPreferences = Site.current.preferences.custom;
    var akeneoEntityRecordsList;
    var recordList;

    if (!CustomPreferences.akeneoServiceGeneralUrl || !CustomPreferences.akeneoProductsCatalogID) {
        throw new Error('ERROR : Site Preference are missing : akeneoServiceGeneralUrl or akeneoProductsCatalogID');
    }

    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    // define service used for call
    var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var akeneoService = initAkeneoServices.getGeneralService();

    // setting the default akeneo hostname
    akeneoService.setURL(CustomPreferences.akeneoServiceGeneralUrl);

    if (!savedNextURL) {
        AkeneoServicesHandler.nextUrl = '';
    } else {
        AkeneoServicesHandler.nextUrl = savedNextURL;
    }

    akeneoEntityRecordsList = AkeneoServicesHandler.serviceRequestEntities(akeneoService, entityRecordUrl);

    if (akeneoEntityRecordsList && akeneoEntityRecordsList.getLength() > 0) {
        recordList = akeneoEntityRecordsList;
    }
    var response = {
        recordList: recordList,
        serviceNextURL: AkeneoServicesHandler.nextUrl
    };

    return response;
};

/* Exported functions */
module.exports = akeneoEntityRecords;
