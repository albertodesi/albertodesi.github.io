'use strict';

var Site = require('dw/system/Site');

var akeneoEntities = {};

/**
 * @desc get all reference entities from API
 * @param {string} savedNextURL - next URL to hit
 * @param {string} entityUrl - akeneo entity end point
 * @returns {dw.util.ArrayList} - list of akeneo entities
 */
akeneoEntities.getAllEntities = function (savedNextURL, entityUrl) {
    var CustomPreferences = Site.current.preferences.custom;
    var akeneoEntitiesList;
    var entitiesList;

    if (!CustomPreferences.akeneoServiceGeneralUrl) {
        throw new Error('ERROR : Site Preference are missing : akeneoServiceGeneralUrl');
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

    akeneoEntitiesList = AkeneoServicesHandler.serviceRequestEntities(akeneoService, entityUrl);

    if (akeneoEntitiesList && akeneoEntitiesList.getLength() > 0) {
        entitiesList = akeneoEntitiesList;
    }

    var response = {
        entitiesList: entitiesList,
        serviceNextURL: AkeneoServicesHandler.nextUrl
    };


    return response;
};

/* Exported functions */
module.exports = akeneoEntities;
