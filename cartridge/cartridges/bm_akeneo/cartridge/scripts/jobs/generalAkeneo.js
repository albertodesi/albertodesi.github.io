'use strict';

var Status = require('dw/system/Status');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var StringUtils = require('dw/util/StringUtils');

/**
 * @desc Generates xml of media files
 * @param {Object} args - job parameters
 * @returns {dw.system.Status} - the job status
 */
function getMediaFiles(args) {
    if ((config.assetSystemVersion === 'old' && (config.imageType === 'images' || config.imageType === 'both')) ||
    (config.assetSystemVersion === 'new' && config.imageImportType !== 'media_link' && (config.imageType === 'images' || config.imageType === 'both'))) {
        var akeneoMediaUrl = args.AkeneoMediaUrl;

        if (!akeneoMediaUrl) {
            return new Status(Status.ERROR, 'ERROR', 'Missing job parameter: akeneoMediaUrl');
        }
        var akeneoMediaFiles = require('~/cartridge/scripts/akeneoMediaFiles/akeneoMediaFiles');
        return akeneoMediaFiles.generateMediaFiles(akeneoMediaUrl);
    }
    return new Status(Status.OK, 'OK');
}

/**
 * @desc Generates xml of asset files
 * @param {Object} args - job parameters
 * @returns {dw.system.Status} - the job status
 */
function getAssetsFiles(args) {
    if (config.imageType === 'assets' || config.imageType === 'both') {
        if (config.assetSystemVersion === 'old') {
            var akeneoAssetUrl = args.AkeneoAssetUrl;

            if (!akeneoAssetUrl) {
                return new Status(Status.ERROR, 'ERROR', 'Missing job parameter: akeneoAssetUrl');
            }
            var akeneoAssets = require('~/cartridge/scripts/akeneoMediaFiles/akeneoAssets');
            return akeneoAssets.generateAssetFiles(akeneoAssetUrl);
        }
        var handleAkeneoAssets = require('~/cartridge/scripts/akeneoAssetSystem/handleAkeneoAssets');
        return handleAkeneoAssets.handleAssetFamilies();
    }
    return new Status(Status.OK, 'OK');
}

/**
 * @desc Generates pricebook xml file of akeneo products
 */
function priceBookXml() {
    try {
        var importedTime = require('~/cartridge/scripts/jobs/importedTime');
        importedTime.clearImportedTime({
            RuntimeObjectID: 'AkeneoCatalogRunTime'
        });
        var akeneoPriceBook = require('~/cartridge/scripts/akeneoPriceBook/akeneoPriceBook');
        akeneoPriceBook.generatePricebookXml();
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/**
 * @desc Generates attributes xml file
 * @returns {void}
 */
function getAttributes() {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    customCacheWebdav.clearCache(config.cacheDirectory.variantsAxes.baseLocation);
    customCacheWebdav.clearCache(config.cacheDirectory.attributes.baseLocation);

    try {
        var akeneoAttributes = require('~/cartridge/scripts/akeneoAttributes/akeneoAttributes');
        akeneoAttributes.generateAttributesXml();
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/**
 * @desc Prepares file for import
 * @param {Object} args - job parameters
 * @returns {void}
 */
function prepareImport(args) {
    var archiveFileName = 'import-meta-data-akeneo';
    if (args.AkeneoFluxPath) {
        var akeneoPrepareImport = require('~/cartridge/scripts/utils/akeneoPrepareImport');
        akeneoPrepareImport.prepareFileForImport(args.AkeneoFluxPath, archiveFileName);
    }
}

/**
 * @desc deletes family variants cache files from webdav location
 * @returns {void}
 */
function clearFamilyVariantsCache() {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    customCacheWebdav.clearCache(config.cacheDirectory.familyVariants.baseLocation);
}

/**
 * @desc clears the impex catalog location by archiving files
 * @returns {void}
 */
function clearImpexLocation() {
    generalUtils.clearDirectoryAkeneo();
}

/**
 * @desc deletes model product cache files from webdav location
 * @returns {void}
 */
function clearModelProductsCache() {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var oldBaseLocation = StringUtils.format(config.cacheDirectory.modelProducts.baseLocation, '');
    customCacheWebdav.clearOldPathModelProductsCache(oldBaseLocation);
    var baseLocation = StringUtils.format(config.cacheDirectory.modelProducts.baseLocation, config.sfccMasterCatalogID);
    customCacheWebdav.clearCache(baseLocation);
    customCacheWebdav.clearCache(StringUtils.format(config.cacheDirectory.products.baseLocation, config.sfccMasterCatalogID));
    customCacheWebdav.clearCache(config.cacheDirectory.assetFamilies.assetProductRelationBaseLocation);
}

/**
 * @desc deletes asset cache files from webdav location
 * @returns {void}
 */
function clearAssetCache() {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    customCacheWebdav.clearCache(config.cacheDirectory.assetFamilies.baseLocation);
}

/* Exported functions*/
module.exports = {
    getMediaFiles: getMediaFiles,
    getAssetsFiles: getAssetsFiles,
    getAttributes: getAttributes,
    priceBookXml: priceBookXml,
    prepareImport: prepareImport,
    clearFamilyVariantsCache: clearFamilyVariantsCache,
    clearImpexLocation: clearImpexLocation,
    clearAssetCache: clearAssetCache,
    clearModelProductsCache: clearModelProductsCache
};
