'use strict';

/* eslint no-underscore-dangle: 0 */

var File = require('dw/io/File');
var StringUtils = require('dw/util/StringUtils');
var Encoding = require('dw/crypto/Encoding');
var HashSet = require('dw/util/HashSet');
var Status = require('dw/system/Status');

var logUtils = require('~/cartridge/scripts/utils/logUtils');
var logger = logUtils.getMediaErrorLogger('handleAkeneoAssets');
var jobStatus = new Status(Status.OK, 'OK');
var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
var akeneoServicesHandler = require('~/cartridge/scripts/akeneoServices/akeneoServicesHandler');
var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;

var handleAkeneoAssets = {};

/**
 * @desc This function downloads the image file to given path using given service object
 * @param {dw.svc.Service} akeneoService - service object
 * @param {string} filePath - The path to download the file to
 * @param {Object} fileObject - The file to download
 */
function downloadAssetFile(akeneoService, filePath, fileObject) {
    var assetFile = new File(filePath);
    FileUtils.createFileAndFolders(assetFile);

    // remove file if already exist. We do this because, when the Service set OutFile, it does not remove or overwrite the file.
    if (assetFile.exists()) {
        assetFile.remove();
    }

    // process download asset file from direct link
    akeneoService.setURL(fileObject._links.download.href);

    akeneoService.call({
        outputFile: true,
        fileToOutput: assetFile
    });
}

/**
 * @desc This function handles 'media file' type of assets
 * @param {string} assetCode - asset code
 * @param {Object} imageValues - the asset image values
 * @param {dw.svc.Service} akeneoService - service object
 */
function handleMediaFile(assetCode, imageValues, akeneoService) {
    // clearing the catalog asset directories for all locales
    var AKENEO_CATALOG_DIR = File.CATALOGS + File.SEPARATOR + config.sfccMasterCatalogID;
    var akeneoCatalogDir = new File(AKENEO_CATALOG_DIR);
    var akeneoCatalogLocales = akeneoCatalogDir.list();
    var imageFileViewTypesMapping = config.imageFileViewTypesMapping.matching;
    var imageFileViewTypesKeys = Object.keys(imageFileViewTypesMapping);

    for (var idx = 0; idx < akeneoCatalogLocales.length; idx++) {
        var folder = new File(AKENEO_CATALOG_DIR + File.SEPARATOR + akeneoCatalogLocales[idx] + File.SEPARATOR + 'Assets' + File.SEPARATOR + assetCode + File.SEPARATOR);
        FileUtils.deleteDirectory(folder);
    }

    for (var i = 0; i < imageFileViewTypesKeys.length; i++) {
        var viewType = imageFileViewTypesKeys[i];
        var viewTypeMapping = imageFileViewTypesMapping[viewType];

        if (viewTypeMapping in imageValues) {
            var imageObjects = imageValues[viewTypeMapping];

            if (imageObjects && imageObjects.length) {
                if (imageObjects[0].locale === null) { // asset is non localizable
                    var AKENEO_CATALOG_ASSETS_DIR = File.CATALOGS + File.SEPARATOR + config.sfccMasterCatalogID + File.SEPARATOR + 'default' + File.SEPARATOR + 'Assets' + File.SEPARATOR + assetCode + File.SEPARATOR + viewType + File.SEPARATOR;

                    for (var j = 0; j < imageObjects.length; j++) {
                        if (generalUtils.checkScope(imageObjects[j].channel)) {
                            var AKENEO_CATALOG_ASSET_UNIQUE_DIR = AKENEO_CATALOG_ASSETS_DIR + imageObjects[j].data;
                            downloadAssetFile(akeneoService, AKENEO_CATALOG_ASSET_UNIQUE_DIR, imageObjects[j]);
                        }
                    }
                } else { // asset is localizable; we need to keep all assets with same name and same path in the Catalog location
                    var AKENEO_CATALOG_ASSETS_LOCALE_DIR = File.CATALOGS + File.SEPARATOR + config.sfccMasterCatalogID + File.SEPARATOR + '{0}' + File.SEPARATOR + 'Assets' + File.SEPARATOR + assetCode + File.SEPARATOR + viewType + File.SEPARATOR + imageObjects[0].data;

                    for (var k = 0; k < imageObjects.length; k++) {
                        if (generalUtils.checkScope(imageObjects[k].channel)) {
                            var AKENEO_CATALOG_ASSET_LOCALE_UNIQUE_DIR = StringUtils.format(AKENEO_CATALOG_ASSETS_LOCALE_DIR, imageObjects[k].locale.replace('-', '_'));
                            downloadAssetFile(akeneoService, AKENEO_CATALOG_ASSET_LOCALE_UNIQUE_DIR, imageObjects[k]);
                        }
                    }
                }
            }
        }
    }
}

/**
 * @desc Generates attributes for assetFamily
 * @param {string} assetFamilyCode - Asset family code
 * @param {string} assetCode - Asset code
 */
function createAssetAttributes(assetFamilyCode, assetCode) {
    var attributesList = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeBaseLocation, assetFamilyCode));

    if (!(attributesList && attributesList.length > 1)) { // API call for attributes
        attributesList = akeneoServicesHandler.processService(StringUtils.format(config.APIURL.endpoints.assetFamilyAttributesUrl, assetFamilyCode), '');
        customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeBaseLocation, assetFamilyCode), attributesList);
    }

    var akeneoAttributes = require('~/cartridge/scripts/akeneoAttributes/akeneoAttributes');
    akeneoAttributes.generatesAssetAttributesXml(assetCode, attributesList);
}

/**
 * @desc This function handles main media attribute of file type assets
 * @param {string} assetCode - asset code
 * @param {Array} fileValues - the asset image values
 * @param {dw.svc.Service} akeneoService - service object
 */
function downloadMainMediaFile(assetCode, fileValues, akeneoService) {
    var AKENEO_CATALOG_DIR = File.CATALOGS + File.SEPARATOR + config.sfccMasterCatalogID + File.SEPARATOR + 'default' + File.SEPARATOR + 'Assets' + File.SEPARATOR + assetCode + File.SEPARATOR;
    var akeneoCatalogDir = new File(AKENEO_CATALOG_DIR);
    FileUtils.deleteDirectory(akeneoCatalogDir);

    if (fileValues && fileValues.length) {
        for (var i = 0; i < fileValues.length; i++) {
            if (generalUtils.checkScope(fileValues[i].channel)) {
                var AKENEO_CATALOG_UNIQUE_DIR = AKENEO_CATALOG_DIR + fileValues[i].data;
                downloadAssetFile(akeneoService, AKENEO_CATALOG_UNIQUE_DIR, fileValues[i]);
            }
        }
    }
}

/**
 * @desc This function handles as single family of assets
 * @param {string} assetFamilyCode - the asset family code
 * @param {Object} attributeAsMainMedia - the attribute marked as main media attribute
 * @param {string} lastImportTime - lastImportTime string for differential import
 */
function handleAssetFamily(assetFamilyCode, attributeAsMainMedia, lastImportTime) {
    var filterArg = {};

    if (lastImportTime) {
        filterArg.updated = config.APIURL.parameter.search.updated;
        filterArg.updated[0].value = lastImportTime;
    }
    var params = '?limit=' + config.APIURL.parameter.pagination + '&search=' + Encoding.toURI(JSON.stringify(filterArg));
    var akeneoLocales = customCacheWebdav.getCache(config.cacheDirectory.assetFamilies.locales) || [];
    var akeneoService = initAkeneoServices.getGeneralService();
    var locales = new HashSet();
    locales.add(akeneoLocales);
    var clearAttributesCacheFlag = !!lastImportTime; // true if last imported time present, otherwise false
    var response;

    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.nextURL) ? response.nextURL : null;
        response = akeneoServicesHandler.processPaginatedService(StringUtils.format(config.APIURL.endpoints.assetFamilyAssetsUrl, assetFamilyCode), params, paginationURL);
        if (response && response.akeneoResultsList && response.akeneoResultsList.getLength() > 0) {
            var iterator = response.akeneoResultsList.iterator();
            while (iterator.hasNext()) {
                var asset = iterator.next();
                try {
                    if (lastImportTime) { // if differential import, store asset code in cache list
                        var assetProductRelationList = customCacheWebdav.getCache(config.cacheDirectory.assetFamilies.assetProductRelationBaseLocation) || [];
                        if (assetProductRelationList.indexOf(asset.code) === -1) {
                            assetProductRelationList.push(asset.code);
                        }
                        customCacheWebdav.setCache(config.cacheDirectory.assetFamilies.assetProductRelationBaseLocation, assetProductRelationList);
                    }
                    customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.assetFamilies.assetFamilyAsset, asset.code), asset);

                    if (config.imageImportType !== 'media_link' && attributeAsMainMedia.type === 'media_file' && attributeAsMainMedia.media_type === 'image') {
                        handleMediaFile(asset.code, asset.values, akeneoService);
                    } else if (config.imageImportType === 'media_link' && attributeAsMainMedia.type === 'media_link' && attributeAsMainMedia.media_type === 'image') {
                        var imageValues = asset.values[attributeAsMainMedia.code];

                        if (imageValues && imageValues.length && imageValues[0].locale !== null) { // asset is localizable
                            for (var i = 0; i < imageValues.length; i++) {
                                locales.add(imageValues[i].locale);
                            }
                        }
                    } else if (attributeAsMainMedia.type === 'media_link' &&
                            ((attributeAsMainMedia.media_type === 'image' && config.imageImportType === 'both') ||
                                    attributeAsMainMedia.media_type === 'youtube' || attributeAsMainMedia.media_type === 'vimeo' ||
                                    attributeAsMainMedia.media_type === 'pdf' || attributeAsMainMedia.media_type === 'other')) {
                        if (clearAttributesCacheFlag) {
                            customCacheWebdav.clearCache(StringUtils.format(config.cacheDirectory.assetFamilies.endPoint, assetFamilyCode));
                            customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeEndPoint, assetFamilyCode, attributeAsMainMedia.code), attributeAsMainMedia);
                            clearAttributesCacheFlag = false;
                        }
                        createAssetAttributes(assetFamilyCode, asset.code);
                    } else if (attributeAsMainMedia.type === 'media_file' &&
                            (attributeAsMainMedia.media_type === 'pdf' || attributeAsMainMedia.media_type === 'other')) {
                        if (clearAttributesCacheFlag) {
                            customCacheWebdav.clearCache(StringUtils.format(config.cacheDirectory.assetFamilies.endPoint, assetFamilyCode));
                            customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeEndPoint, assetFamilyCode, attributeAsMainMedia.code), attributeAsMainMedia);
                            clearAttributesCacheFlag = false;
                        }
                        createAssetAttributes(assetFamilyCode, asset.code);
                        downloadMainMediaFile(asset.code, asset.values[attributeAsMainMedia.code], akeneoService);
                    }
                } catch (e) {
                    jobStatus = new Status(Status.OK, 'WARN');
                    logger.error('ERROR : While downloading Asset : ' + asset.code + ' with error : ' + e.stack + ' and message : ' + e.message);
                }
            }
        }
    } while (response.nextURL !== '');
    customCacheWebdav.setCache(config.cacheDirectory.assetFamilies.locales, locales.toArray());
}

/**
 * @desc This function calls paginated asset family API and handles various types of assets
 * @returns {dw.system.Status} - the job status
 */
handleAkeneoAssets.handleAssetFamilies = function () {
    var lastImportTime = generalUtils.getLastImportedTime('AkeneoAssetRunTime');

    if (!lastImportTime) { // clearing catalog images if running a full import
        var AKENEO_CATALOG_ASSETS_DIR = File.CATALOGS + File.SEPARATOR + config.sfccMasterCatalogID;
        var akeneoCatalogDir = new File(AKENEO_CATALOG_ASSETS_DIR);
        var akeneoCatalogLocales = akeneoCatalogDir.list();

        for (var idx = 0; idx < akeneoCatalogLocales.length; idx++) {
            var folder = new File(AKENEO_CATALOG_ASSETS_DIR + File.SEPARATOR + akeneoCatalogLocales[idx] + File.SEPARATOR + 'Assets');
            FileUtils.deleteDirectory(folder);
        }
    }
    var params = '?limit=' + config.APIURL.parameter.pagination;
    var response;

    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.nextURL) ? response.nextURL : null;
        response = akeneoServicesHandler.processPaginatedService(config.APIURL.endpoints.assetFamiliesUrl, params, paginationURL);

        if (response && response.akeneoResultsList && response.akeneoResultsList.getLength() > 0) {
            var iterator = response.akeneoResultsList.iterator();
            while (iterator.hasNext()) {
                var assetFamily = iterator.next();
                customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.assetFamilies.endPoint, assetFamily.code), assetFamily);

                var attributeAsMainMedia = akeneoServicesHandler.processService(StringUtils.format(config.APIURL.endpoints.getAssetFamilyAttributeUrl, assetFamily.code, assetFamily.attribute_as_main_media), '');
                customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeEndPoint, assetFamily.code, assetFamily.attribute_as_main_media), attributeAsMainMedia);
                handleAssetFamily(assetFamily.code, attributeAsMainMedia, lastImportTime);
            }
        }
    } while (response.nextURL !== '');
    return jobStatus;
};

module.exports = handleAkeneoAssets;
