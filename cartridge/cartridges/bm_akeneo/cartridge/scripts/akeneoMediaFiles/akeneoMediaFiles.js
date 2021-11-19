'use strict';

/* eslint no-underscore-dangle: 0 */

var CatalogMgr = require('dw/catalog/CatalogMgr');
var Catalog = require('dw/catalog/Catalog');
var Status = require('dw/system/Status');
var File = require('dw/io/File');

var jobStatus = new Status(Status.OK, 'OK');
var logUtils = require('~/cartridge/scripts/utils/logUtils');
var logger = logUtils.getMediaErrorLogger('akeneoMediaFiles');
var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');
var pageCounter;
var akeneoGetService;

var akeneoMediaFiles = {};

/**
 * Process upload of all media files retrieved from Akeneo API
 * @param {Object} AkeneoMediaFilesList - Media files list
 */
function uploadMediaFiles(AkeneoMediaFilesList) {
    var AkeneoService = akeneoGetService.getGeneralService();
    var AKENEO_CATALOG_MEDIA_FLUX_DIR = File.CATALOGS + File.SEPARATOR + GeneralUtils.config.sfccMasterCatalogID + File.SEPARATOR + 'default' + File.SEPARATOR;

    // Loop on all media file retrieved from Akeneo API
    var mediaFilesIterator = AkeneoMediaFilesList.iterator();

    while (mediaFilesIterator.hasNext()) {
        var AkeneoMediaFile = mediaFilesIterator.next();

        try {
            var mediaFile = new File(AKENEO_CATALOG_MEDIA_FLUX_DIR + AkeneoMediaFile.code);

            // getting the full folder path for creating it before upload
            var folderToCreate = AKENEO_CATALOG_MEDIA_FLUX_DIR + AkeneoMediaFile.code;
            folderToCreate = folderToCreate.split('/');
            folderToCreate.pop();
            folderToCreate = folderToCreate.join('/');

            FileUtils.createFileAndFolders(mediaFile);

            // remove file if already exist. We do this because, when the Service set OutFile, it does not remove or overwrite the file.
            if (mediaFile.exists()) {
                mediaFile.remove();
            }

            // process download media file from direct link
            AkeneoService.setURL(AkeneoMediaFile._links.download.href);

            AkeneoService.call({
                outputFile: true,
                fileToOutput: mediaFile
            });
        } catch (e) {
            jobStatus = new Status(Status.OK, 'WARN');
            logger.error('ERROR : While downloading Media File : ' + AkeneoMediaFile.code + ' with error : ' + e.stack + ' and message : ' + e.message);
        }
    }
}

/**
 * @desc before importing assets into the catalog, clear the directory and import new files
 */
function clearMediaDirectory() {
    var AKENEO_CATALOG_FLUX_DIR = File.CATALOGS + File.SEPARATOR + GeneralUtils.config.sfccMasterCatalogID + File.SEPARATOR + 'default' + File.SEPARATOR;

    var AkeneoFluxPath = new File(AKENEO_CATALOG_FLUX_DIR);

    // clean directory
    FileUtils.deleteDirectory(AkeneoFluxPath);
}

/** Process akeneo api call for getting all Media files required for products. The call will be processed by SearviceHandler.ds. We ask for ProductsCatalogID because, products can be in an other catalog,
 * @param {string} akeneoMediaUrl - media api url
 * @returns {dw.system.Status} - the job status
 */
akeneoMediaFiles.generateMediaFiles = function (akeneoMediaUrl) {
    if (!GeneralUtils.config.serviceGeneralUrl || !GeneralUtils.config.sfccMasterCatalogID) {
        throw new Error('ERROR : Site Preference are missing : akeneoServiceGeneralUrl or akeneoProductsCatalogID');
    }

    // Catalog ID must be provide by Site Preference.
    if (CatalogMgr.getCatalog(GeneralUtils.config.sfccMasterCatalogID) instanceof Catalog === false) {
        throw new Error('ERROR : No catalog retrieved with ID : ' + GeneralUtils.config.sfccMasterCatalogID);
    }
    clearMediaDirectory();

    akeneoGetService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');

    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    var AkeneoService = akeneoGetService.getGeneralService();
    var debugConfig = GeneralUtils.config.debug;
    var apiNextPageUrl = GeneralUtils.config.serviceGeneralUrl + akeneoMediaUrl + '?limit=' + GeneralUtils.config.APIURL.parameter.pagination;

    AkeneoService.setURL(apiNextPageUrl);
    pageCounter = 0;

    do {
        var imagesPerPage = AkeneoServicesHandler.serviceRequestMediaFilesAkeneo(AkeneoService);
        apiNextPageUrl = AkeneoServicesHandler.nextUrl;

        if (imagesPerPage && imagesPerPage.getLength() > 0) {
            uploadMediaFiles(imagesPerPage);
        }

        AkeneoServicesHandler.nextUrl = apiNextPageUrl;
        pageCounter++;

        if (debugConfig.breakCodeOnLimit && pageCounter >= debugConfig.pageLimit) {
            break;
        }
    } while (AkeneoServicesHandler.nextUrl !== '');
    return jobStatus;
};

/* Exported functions */
module.exports = akeneoMediaFiles;
