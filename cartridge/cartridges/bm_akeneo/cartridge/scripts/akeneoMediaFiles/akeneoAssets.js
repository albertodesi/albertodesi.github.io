'use strict';

/* eslint no-underscore-dangle: 0 */

var Site = require('dw/system/Site');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var Catalog = require('dw/catalog/Catalog');
var File = require('dw/io/File');
var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
var logUtils = require('~/cartridge/scripts/utils/logUtils');
var logger = logUtils.getMediaErrorLogger('akeneoAssets');
var Status = require('dw/system/Status');
var jobStatus = new Status(Status.OK, 'OK');

var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');

var akeneoAssets = {};

/**
 * @desc before importing assets into the catalog, clear the directory and import new files
 * @param {Object} CustomPreferences - custom preferences
 */
function clearAssetDirectory(CustomPreferences) {
    var AKENEO_CATALOG_FLUX_DIR = File.CATALOGS + File.SEPARATOR + CustomPreferences.akeneoProductsCatalogID + File.SEPARATOR + 'default' + File.SEPARATOR + 'Assets' + File.SEPARATOR;

    var AkeneoFluxPath = new File(AKENEO_CATALOG_FLUX_DIR);

    // clean directory
    FileUtils.deleteDirectory(AkeneoFluxPath);
}

/**
 * @desc After retrieving the asset file , import the asset into the catalog
 * @param {dw.io.File} fileObject - the file object
 * @param {string} assetUniqueDir - unique path for asset
 * @param {dw.svc.Service} akeneoService - akeneo general Service
 */
function downloadAssets(fileObject, assetUniqueDir, akeneoService) {
    var assetFile = new File(assetUniqueDir + fileObject.code);

    // getting the full folder path for creating it before import
    var folderToCreate = assetUniqueDir + fileObject.code;

    folderToCreate = folderToCreate.split('/');
    folderToCreate.pop();
    folderToCreate = folderToCreate.join('/');

    FileUtils.createFileAndFolders(assetFile);

    // remove file if already exist. We do this because, when the Service set OutFile, it does not remove or overwrite the file.
    if (assetFile.exists()) {
        assetFile.remove();
    }

    // process download asset file from direct link
    akeneoService.setURL(fileObject._link.download.href);

    akeneoService.call({
        outputFile: true,
        fileToOutput: assetFile
    });
}

/**
 * @desc check if scope of the asset images in variation assets files matches with the scope configured in BM
 * @param {Array} variationFilesArray - list of variation assets
 * @param {string} assetUniqueDir - unique path for asset
 * @param {dw.svc.Service} akeneoService - akeneo general  service
 * @returns {boolean} - true if variation assets exist
 */
function variationAssets(variationFilesArray, assetUniqueDir, akeneoService) {
    var channelMatches = false;
    var variationAssetsExists = false;

    for (var i = 0; i < variationFilesArray.length; i++) {
        var fileObject = variationFilesArray[i];
        channelMatches = GeneralUtils.checkScope(fileObject.scope);

        if (channelMatches) {
            downloadAssets(fileObject, assetUniqueDir, akeneoService);
            variationAssetsExists = true;
        }
    }
    return variationAssetsExists;
}

/**
 * @desc if variation assets files are empty or scope of variation files doesnt matches with the scope configured in BM then retrieve the reference asset file
 * @param {Array} referenceFilesArray - list of reference files
 * @param {string} assetUniqueDir - unique path for asset
 * @param {dw.svc.Service} akeneoService - akeneo general service
 */
function referenceAssets(referenceFilesArray, assetUniqueDir, akeneoService) {
    for (var i = 0; i < referenceFilesArray.length; i++) {
        var fileObject = referenceFilesArray[i];
        downloadAssets(fileObject, assetUniqueDir, akeneoService);
    }
}

/**
 * @desc Loop through each asset file in the list and retrieve the variation asset file or reference asset file based on the scope then import it into the catalog
 * @param {Array} AkeneoAssetsList - list of akeneo assets
 * @param {dw.catalog.Catalog} AkeneoCatalog - akeneo catalog
 * @param {dw.svc.Service} AkeneoService - akeneo general service
 */
function handleAssetsResponse(AkeneoAssetsList, AkeneoCatalog, AkeneoService) {
    var AKENEO_CATALOG_ASSETS_DIR = File.CATALOGS + File.SEPARATOR + AkeneoCatalog.getID() + File.SEPARATOR + 'default' + File.SEPARATOR + 'Assets' + File.SEPARATOR;

    // Loop on all asset file retrieved from Akeneo API
    var assetsIterator = AkeneoAssetsList.iterator();

    while (assetsIterator.hasNext()) {
        var AkeneoAssetFile = assetsIterator.next();

        try {
            var AKENEO_CATALOG_ASSET_UNIQUE_DIR = AKENEO_CATALOG_ASSETS_DIR + File.SEPARATOR + AkeneoAssetFile.code + File.SEPARATOR;

            if (AkeneoAssetFile.variation_files) {
                var variationAssetsExists = variationAssets(AkeneoAssetFile.variation_files, AKENEO_CATALOG_ASSET_UNIQUE_DIR, AkeneoService);

                if (!variationAssetsExists) {
                    referenceAssets(AkeneoAssetFile.reference_files, AKENEO_CATALOG_ASSET_UNIQUE_DIR, AkeneoService);
                }
            } else {
                referenceAssets(AkeneoAssetFile.reference_files, AKENEO_CATALOG_ASSET_UNIQUE_DIR, AkeneoService);
            }
        } catch (e) {
            jobStatus = new Status(Status.OK, 'WARN');
            logger.error('ERROR : While downloading Asset File : ' + AkeneoAssetFile.code + ' with error : ' + e.stack + ' and message : ' + e.message);
        }
    }
}

/**
 * @desc Process akeneo api call for getting all Media files required for products. The call will be processed by SearviceHandler.ds
 *  We ask for ProductsCatalogID because, products can be in an other catalog
 * @param {string} akeneoAssetUrl - akeneo Asset Url
 * @returns {dw.system.Status} - the job status
 */
akeneoAssets.generateAssetFiles = function (akeneoAssetUrl) {
    var CustomPreferences = Site.current.preferences.custom;
    // first of all, we clean directory. If necessary, in other jobs, do a step with this function
    clearAssetDirectory(CustomPreferences);

    if (!CustomPreferences.akeneoServiceGeneralUrl || !CustomPreferences.akeneoProductsCatalogID) {
        throw new Error('ERROR : Site Preference are missing : akeneoServiceGeneralUrl or akeneoProductsCatalogID');
    }

    // Catalog ID must be provide by Site Preference.
    if (CatalogMgr.getCatalog(CustomPreferences.akeneoProductsCatalogID) instanceof Catalog === false) {
        throw new Error('ERROR : No catalog retrieved with ID : ' + CustomPreferences.akeneoProductsCatalogID);
    }

    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');

    // define service used for call
    var akeneoGetServiceFile = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoService = akeneoGetServiceFile.getGeneralService();
    var AkeneoAssetDownloadService = akeneoGetServiceFile.getGeneralService();

    AkeneoService.setURL(CustomPreferences.akeneoServiceGeneralUrl);
    AkeneoAssetDownloadService.setURL(CustomPreferences.akeneoServiceGeneralUrl);

    // calling Akeneo asset Files flux
    var assetsPerPage;
    var debugConfig = GeneralUtils.config.debug;
    var pageCounter = 0;
    var paginationLimit = '?limit=' + GeneralUtils.config.APIURL.parameter.pagination;
    do {
        assetsPerPage = AkeneoServicesHandler.serviceRequestCatalogAkeneo(AkeneoService, akeneoAssetUrl + paginationLimit);
        if (assetsPerPage && assetsPerPage.getLength() > 0) {
            handleAssetsResponse(assetsPerPage, CatalogMgr.getCatalog(CustomPreferences.akeneoProductsCatalogID), AkeneoAssetDownloadService);
        }
        if (debugConfig.breakCodeOnLimit && ++pageCounter >= debugConfig.pageLimit) {
            break;
        }
    } while (AkeneoServicesHandler.nextUrl !== '');
    return jobStatus;
};

/* Exported functions */
module.exports = akeneoAssets;
