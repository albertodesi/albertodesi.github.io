'use strict';

/* eslint no-underscore-dangle: 0 */

var Result = require('dw/svc/Result');
var ArrayList = require('dw/util/ArrayList');
var Site = require('dw/system/Site');

var Logger = require('dw/system/Logger');
Logger = Logger.getLogger('AkService', 'log');
var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');
var customCacheMgr = require('~/cartridge/scripts/io/customCacheWebdav');

var akeneoServicesHandler = {};

akeneoServicesHandler.nextUrl = '';
akeneoServicesHandler.count = 0;

/**
 * @desc Call Akeneo API Service for getting Akeneo Flux (Attributes, Attributes Options, Product, Categories etc...)
 * Theirs API has a pagination system, we have to loop on API call for getting others data
 * @param {Object} AkeneoService - Service used to call Akeneo API
 * @return {dw.util.ArrayList} - AkeneoResultsList Data result from Akeneo API
 */
akeneoServicesHandler.serviceProcessCalls = function (AkeneoService) {
    var AkeneoResultsList = new ArrayList();

    //  Set next page URL if exist
    if (this.nextUrl !== '') {
        AkeneoService.setURL(this.nextUrl);
        this.nextUrl = '';
    }

    Logger.info('URL: ' + AkeneoService.URL);
    // Akeneo API call
    var resultAkeneoCall = AkeneoService.call();

    // You shall not PASS !! =D
    if (resultAkeneoCall.getStatus() !== Result.OK) {
        Logger.error('ERROR : While retrieving DATA from API with code: ' + resultAkeneoCall.getError() + ', message: ' + resultAkeneoCall.getErrorMessage() + ' retrying... ' + this.count);

        if (++this.count < GeneralUtils.config.APIURL.retryLimit) {
            return this.serviceProcessCalls(AkeneoService);
        }
        throw new Error('ERROR : While retrieving DATA from API with code: ' + resultAkeneoCall.getError() + ', message: ' + resultAkeneoCall.getErrorMessage());
    } else {
        this.count = 0;
    }

    var AkeneoFluxResults = JSON.parse(resultAkeneoCall.object.text);

    // if next page, set next page URL
    if ('next' in AkeneoFluxResults._links && AkeneoFluxResults._links.next) {
        this.nextUrl = AkeneoFluxResults._links.next.href;
    }

    // Fill the collection with new datas retrieved
    AkeneoResultsList.add(AkeneoFluxResults._embedded.items);

    return AkeneoResultsList;
};

/**
 * @desc Call Akeneo API Service for getting Akeneo Flux (Attributes of Reference Entity)
 * @param {Object} AkeneoService - Service used to call Akeneo API
 * @input AkeneoService : Service -  Service used to call Akeneo API
 * @return {dw.util.ArrayList} - response Data result from Akeneo API
 */
akeneoServicesHandler.serviceProcessEntityAttrCalls = function (AkeneoService) {
    var response = new ArrayList();

    //  Set next page URL if exist
    if (this.nextUrl !== '') {
        AkeneoService.setURL(this.nextUrl);
        this.nextUrl = '';
    }

    Logger.info('URL: ' + AkeneoService.URL);
    // Akeneo API call
    var resultAkeneoCall = AkeneoService.call();

    // You shall not PASS !! =D
    if (resultAkeneoCall.getStatus() !== Result.OK) {
        Logger.error('ERROR : While retrieving DATA from API with code: ' + resultAkeneoCall.getError() + ', message: ' + resultAkeneoCall.getErrorMessage() + ' retrying... ' + this.count);
        if (++this.count < GeneralUtils.config.APIURL.retryLimit) {
            return this.serviceProcessEntityAttrCalls(AkeneoService);
        }
        throw new Error('ERROR : While retrieving DATA from API with code: ' + resultAkeneoCall.getError() + ', message: ' + resultAkeneoCall.getErrorMessage());
    } else {
        this.count = 0;
    }

    var AkeneoFluxResults = JSON.parse(resultAkeneoCall.object.text);
    // Fill the collection with new datas retrieved
    response.add(AkeneoFluxResults);

    return response;
};

/**
 * @desc Call Akeneo API Service for getting variants
 * @param {Object} AkeneoService - Service used to call Akeneo API
 * @return {dw.util.ArrayList} - response Data result from Akeneo API
 */
akeneoServicesHandler.serviceProcessVariantCalls = function (AkeneoService) {
    var response;

    //  Set next page URL if exist
    if (this.nextUrl !== '') {
        AkeneoService.setURL(this.nextUrl);
        this.nextUrl = '';
    }

    Logger.info('URL: ' + AkeneoService.URL);
    // Akeneo API call
    var resultAkeneoCall = AkeneoService.call();

    // You shall not PASS !! =D
    if (resultAkeneoCall.getStatus() !== Result.OK) {
        Logger.error('ERROR : While retrieving DATA from API with code: ' + resultAkeneoCall.getError() + ', message: ' + resultAkeneoCall.getErrorMessage() + ' retrying... ' + this.count);
        if (++this.count < GeneralUtils.config.APIURL.retryLimit) {
            return this.serviceProcessVariantCalls(AkeneoService);
        }
        throw new Error('ERROR : While retrieving DATA from API with code: ' + resultAkeneoCall.getError() + ', message: ' + resultAkeneoCall.getErrorMessage());
    } else {
        this.count = 0;
    }

    var AkeneoFluxResults = JSON.parse(resultAkeneoCall.object.text);

    // Fill the collection with new datas retrieved
    response = AkeneoFluxResults;

    return response;
};

/**
 * @desc Call Akeneo API Service for getting akeneo families
 * @param {Object} AkeneoCatalogService - Service used to call Akeneo API
 * @param {string} AkeneoCatalogUrl - catalog URL
 * @return {dw.util.ArrayList} - response Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestFamilyAkeneo = function (AkeneoCatalogService, AkeneoCatalogUrl) {
    var response;

    try {
        // init service url to call
        if (this.nextUrl === '') {
            var AkeneoOriginalURL = AkeneoCatalogService.getURL();
            AkeneoCatalogService.setURL(AkeneoOriginalURL + AkeneoCatalogUrl);
        }


        // First call for getting all Akeneo Prducts
        response = this.serviceProcessVariantCalls(AkeneoCatalogService);
    } catch (e) {
        throw new Error('ERROR : while retrieving response from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return response;
};

/**
 * @desc Call Akeneo API Service for getting akeneo catalogs
 * @param {Object} AkeneoCatalogService - Service used to call Akeneo API
 * @param {string} AkeneoCatalogUrl - catalog URL
 * @return {dw.util.ArrayList} - AkeneoCatalogList Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestCatalogAkeneo = function (AkeneoCatalogService, AkeneoCatalogUrl) {
    var AkeneoCatalogList;

    try {
        // init service url to call
        if (this.nextUrl === '') {
            var AkeneoOriginalURL = AkeneoCatalogService.getURL();
            AkeneoCatalogService.setURL(AkeneoOriginalURL + AkeneoCatalogUrl);
        }


        // First call for getting all Akeneo Prducts
        AkeneoCatalogList = this.serviceProcessCalls(AkeneoCatalogService);
    } catch (e) {
        throw new Error('ERROR : while retrieving response from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return AkeneoCatalogList;
};

/**
 * @desc Call Akeneo API Service for getting akeneo products
 * @param {Object} AkeneoCatalogService - Service used to call Akeneo API
 * @param {string} AkeneoCatalogUrl - catalog URL
 * @return {dw.util.ArrayList} - AkeneoCatalogList Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestProductAkeneo = function (AkeneoCatalogService, AkeneoCatalogUrl) {
    var AkeneoCatalogList = new ArrayList();

    try {
        // init service url to call
        if (this.nextUrl === '') {
            var AkeneoOriginalURL = AkeneoCatalogService.getURL();
            var urlArgs = GeneralUtils.getAkeneoProductURLArgs(AkeneoCatalogUrl);

            AkeneoCatalogService.setURL(AkeneoOriginalURL + AkeneoCatalogUrl + urlArgs);
        }

        // First call for getting all Akeneo Prducts
        AkeneoCatalogList = this.serviceProcessCalls(AkeneoCatalogService);
    } catch (e) {
        throw new Error('ERROR : while retrieving products from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return AkeneoCatalogList;
};

/**
 * @desc Call Akeneo Attributes API for getting all Attributes & AttributesOptions of specified elements (pim_catalog_multiselect, pim_catalog_simpleselect)
 * @param {Object} AkeneoAttributesService - Service used to call Akeneo API
 * @return {dw.util.ArrayList} - AkeneoAttributesList Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestAttributesAkeneo = function (AkeneoAttributesService) {
    var AkeneoAttributesList = new ArrayList();

    try {
        AkeneoAttributesList = this.serviceProcessCalls(AkeneoAttributesService);
    } catch (e) {
        throw new Error('ERROR : while retrieving attributes from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return AkeneoAttributesList;
};

/**
 * @desc Call Akeneo Attributes API for getting all AttributesOptions of specified elements (pim_catalog_multiselect, pim_catalog_simpleselect)
 * @param {Object} AkeneoAttributesService - Service used to call Akeneo API
 * @param {string} akeneoAttributesOptionsUrl - attributes option url
 */
akeneoServicesHandler.serviceAttributeOptions = function (AkeneoAttributesService, akeneoAttributesOptionsUrl) {
    var pageCounter = 0;
    var debugConfig = GeneralUtils.config.debug;

    try {
        do {
            var attrOptionsPerPage = new ArrayList();
            attrOptionsPerPage = this.serviceProcessCalls(AkeneoAttributesService);
            customCacheMgr.saveAttrOptions(attrOptionsPerPage, akeneoAttributesOptionsUrl);
            pageCounter++;

            if (debugConfig.breakCodeOnLimit && pageCounter >= debugConfig.pageLimit) {
                break;
            }
        } while (akeneoServicesHandler.nextUrl !== '');
    } catch (e) {
        throw new Error('ERROR : while retrieving attributes from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }
};

/**
 * @desc Call Akeneo Attributes API for getting single attribute definition
 * @param {Object} akeneoAttributeService - Service used to call Akeneo API
 * @param {string} akeneoAttributeUrl - akeneo attributes url
 * @return {dw.util.ArrayList} - response Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestAttribute = function (akeneoAttributeService, akeneoAttributeUrl) {
    var response;

    try {
        akeneoAttributeService.setURL(akeneoAttributeUrl);
        response = this.serviceProcessVariantCalls(akeneoAttributeService);
    } catch (e) {
        throw new Error('ERROR : while retrieving attribute from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return response;
};

/**
 * @desc Call Akeneo Media Files API for getting all media files for products
 * @param {Object} AkeneoMediaFilesService - Service used to call Akeneo API
 * @return {dw.util.ArrayList} - AkeneoMediaFilesList Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestMediaFilesAkeneo = function (AkeneoMediaFilesService) {
    var AkeneoMediaFilesList = new ArrayList();

    try {
        AkeneoMediaFilesList = this.serviceProcessCalls(AkeneoMediaFilesService);
    } catch (e) {
        throw new Error('ERROR : while retrieving media files from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return AkeneoMediaFilesList;
};

/**
 * @desc Call Akeneo variation products API for single variation product
 * @param {Object} AkeneoCatalogService - Service used to call Akeneo API
 * @param {string} AkeneoProductUrl - akeneo product url
 * @return {dw.util.ArrayList} - response Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestVariationProduct = function (AkeneoCatalogService, AkeneoProductUrl) {
    var response;

    try {
        // init service url to call
        if (this.nextUrl === '') {
            var AkeneoOriginalURL = AkeneoCatalogService.getURL();
            AkeneoCatalogService.setURL(AkeneoOriginalURL + AkeneoProductUrl);
        }

        // First call for getting all Akeneo Prducts
        response = this.serviceProcessVariantCalls(AkeneoCatalogService);
    } catch (e) {
        throw new Error('ERROR : while retrieving products from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return response;
};

/**
 * @desc Call Akeneo Reference Entities or Entity Records API for getting all Entities
 * @param {Object} AkeneoService - Service used to call Akeneo API
 * @param {string} EntityUrl - Entity url
 * @return {dw.util.ArrayList} - AkeneoEntitiesList Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestEntities = function (AkeneoService, EntityUrl) {
    var AkeneoEntitiesList = new ArrayList();
    var AkeneoOriginalURL;
    try {
        // init service url to call
        if (this.nextUrl === '') {
            AkeneoOriginalURL = AkeneoService.getURL();
            AkeneoService.setURL(AkeneoOriginalURL + EntityUrl);
        }

        // First call for getting all Akeneo Entities and Entity Records
        AkeneoEntitiesList = this.serviceProcessCalls(AkeneoService);
    } catch (e) {
        throw new Error('ERROR : while retrieving entity from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }
    AkeneoService.setURL(AkeneoOriginalURL);

    return AkeneoEntitiesList;
};

/**
 * @desc Call Reference Entity Attributes API for getting all Attributes of a Entity
 * @param {Object} AkeneoAttributesService - Service used to call Akeneo API
 * @param {string} AkeneoEntityAttributesUrl - Entity attribute url
 * @return {dw.util.ArrayList} - AkeneoEntityAttributesList Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestEntityAttributesAkeneo = function (AkeneoAttributesService, AkeneoEntityAttributesUrl) {
    var AkeneoEntityAttributesList = new ArrayList();

    try {
        // init service url to call
        var AkeneoOriginalURL = AkeneoAttributesService.getURL();
        AkeneoAttributesService.setURL(AkeneoOriginalURL + AkeneoEntityAttributesUrl);

        // First call for getting all Akeneo Attributes
        AkeneoEntityAttributesList = this.serviceProcessEntityAttrCalls(AkeneoAttributesService);
    } catch (e) {
        throw new Error('ERROR : while retrieving attributes from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }

    return AkeneoEntityAttributesList;
};

/**
 * @desc Call Akeneo Entity Attributes API for getting all AttributesOptions of specified elements (single_option, multiple_options)
 * @param {Object} AkeneoAttributesService - Service used to call Akeneo API
 * @param {string} AkeneoAttributesList - attributes list
 * @param {string} AkeneoAttributesUrl - akeneo attributes url
 * @return {dw.util.ArrayList} - AkeneoAttributesList Data result from Akeneo API
 */
akeneoServicesHandler.serviceRequestEntityAttrSecondLevel = function (AkeneoAttributesService, AkeneoAttributesList, AkeneoAttributesUrl) {
    akeneoServicesHandler.nextUrl = '';

    try {
        var CustomPreferences = Site.current.preferences.custom;
        var AkeneoOriginalURL = CustomPreferences.akeneoServiceGeneralUrl;
        akeneoServicesHandler.nextUrl = '';
        // Second call of Attributes for getting Attributes Options
        var attributesIterator = AkeneoAttributesList.iterator();

        while (attributesIterator.hasNext()) {
            var AkeneoAttribute = attributesIterator.next();

            if (AkeneoAttribute.type === 'single_option' || AkeneoAttribute.type === 'multiple_options') {
                var attrsOptionURL = AkeneoAttributesUrl.replace('{attribute_code}', AkeneoAttribute.code);
                // retrieve orignal URL and build it for request on
                var AkeneoServiceURL = AkeneoOriginalURL + attrsOptionURL;
                AkeneoAttributesService.setURL(AkeneoServiceURL);

                var attrOptionsPerPage;
                do {
                    attrOptionsPerPage = this.serviceProcessEntityAttrCalls(AkeneoAttributesService);
                } while (akeneoServicesHandler.nextUrl !== '');

                AkeneoAttribute.options = attrOptionsPerPage;
            }
        }
    } catch (e) {
        throw new Error('ERROR : while retrieving attributes from API Akeneo : ' + e.stack + ' with Error: ' + e.message);
    }
    return AkeneoAttributesList;
};

/* Exported functions */
module.exports = akeneoServicesHandler;
