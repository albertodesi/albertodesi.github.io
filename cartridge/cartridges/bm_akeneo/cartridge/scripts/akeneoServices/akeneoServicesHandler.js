'use strict';

/* eslint no-underscore-dangle: 0 */

var Result = require('dw/svc/Result');
var ArrayList = require('dw/util/ArrayList');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var logUtils = require('~/cartridge/scripts/utils/logUtils');
var logger = logUtils.getLogger('akeneoGetToken');

var akeneoServicesHandler = {};

/**
 * @desc Calls akeneo Service with the serviceURL
 * @param {string} serviceURL - the service URL
 * @param {number} count - the retry count in case of failure
 * @returns {Object} The service response
 */
function callAkeneoGeneralService(serviceURL, count) {
    var retryCount = count;
    var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var akeneoService = initAkeneoServices.getGeneralService();
    akeneoService.setURL(serviceURL);
    var akeneoServiceResponse;

    var Logger = require('dw/system/Logger');
    Logger = Logger.getLogger('AkeneoServiceURLs', 'info');
    Logger.info('URL: ' + serviceURL);
    try {
        akeneoServiceResponse = akeneoService.call();

        // You shall not PASS !! =D
        if (akeneoServiceResponse.getStatus() !== Result.OK) {
            logger.error('ERROR : While calling akeneo service with code: ' + akeneoServiceResponse.getError() + ', message: ' + akeneoServiceResponse.getErrorMessage() + ' retrying... ' + retryCount);
            if (++retryCount < config.APIURL.retryLimit) {
                return callAkeneoGeneralService(serviceURL, retryCount);
            }
            throw new Error('ERROR : While calling akeneo service with code: ' + akeneoServiceResponse.getError() + ', message: ' + akeneoServiceResponse.getErrorMessage());
        }
    } catch (e) {
        throw new Error('ERROR: While calling akeneo service, ' + e.message);
    }

    return JSON.parse(akeneoServiceResponse.object.text);
}

/**
 * @desc Calls akeneo service with the given service URL and returns list of items and next URL
 * @param {string} serviceURL - the service URL
 * @returns {Object} The ArrayList of objects returned in response and nextURL
 */
function callAkeneoPaginatedService(serviceURL) {
    var akeneoResultsList = new ArrayList();
    var akeneoFluxResults = callAkeneoGeneralService(serviceURL, 0);

    var nextURL = '';
    // if next page, set next page URL
    if ('next' in akeneoFluxResults._links && akeneoFluxResults._links.next) {
        nextURL = akeneoFluxResults._links.next.href;
    }

    // Fill the collection with new data retrieved
    akeneoResultsList.add(akeneoFluxResults._embedded.items);

    return {
        akeneoResultsList: akeneoResultsList,
        nextURL: nextURL
    };
}

/**
 * @desc Calls akeneo general service for the given endPoint
 * @param {string} endPoint - The service endPoint
 * @param {string} params - the query parameters
 * @returns {Object} service response
 */
akeneoServicesHandler.processService = function (endPoint, params) {
    return callAkeneoGeneralService(config.serviceGeneralUrl + endPoint + params, 0);
};

/**
 * @desc Calls akeneo paginated service for the given endPoint
 * @param {string} endPoint - The service endPoint
 * @param {string} params - the query parameters
 * @param {string} nextURL - the next URL for the paginated API (optional)
 * @returns {Object} The ArrayList of objects returned in response and nextURL
 */
akeneoServicesHandler.processPaginatedService = function (endPoint, params, nextURL) {
    
    if (nextURL) {
        return callAkeneoPaginatedService(nextURL);
    }
    return callAkeneoPaginatedService(config.serviceGeneralUrl + endPoint + params);
};

module.exports = akeneoServicesHandler;
