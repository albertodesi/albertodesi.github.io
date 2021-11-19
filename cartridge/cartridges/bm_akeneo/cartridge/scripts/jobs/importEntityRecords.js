'use strict';

var akeneoEntities = require('~/cartridge/scripts/akeneoEntity/akeneoEntities');
var akeneoEntityRecords = require('~/cartridge/scripts/akeneoEntity/akeneoEntityRecords');
var akeneoEntityMetaFile = require('~/cartridge/scripts/akeneoEntity/akeneoEntityMetaFile');
var akeneoEntityDataFile = require('~/cartridge/scripts/akeneoEntity/akeneoEntityDataFile');
var HashMap = require('dw/util/HashMap');
var Site = require('dw/system/Site');
var File = require('dw/io/File');

/**
 * @desc Calls Akeneo API to get the entity records of a entity  and creates content attributes xml
 * Creates data xml for content assets
 * Downloads media files of reference entity records
 * @param {dw.util.ArrayList} akeneoEntitiesList -
 * @param {string} entityRecordsUrl -
 * @param {dw.io.XMLIndentingStreamWriter} dataXswHandle -
 * @param {string} entityAttributesUrl -
 * @param {string} entityAttributesOptionUrl -
 * @returns {void}
 */
function getEntityRecordsData(akeneoEntitiesList, entityRecordsUrl, dataXswHandle, entityAttributesUrl, entityAttributesOptionUrl) {
    var recordsMap = new HashMap();
    var urlString;
    var iterEntities = akeneoEntitiesList.iterator();
    var CustomPreferences = Site.current.preferences.custom;
    var akeneoCatalog = CustomPreferences.akeneoProductsCatalogID ? CustomPreferences.akeneoProductsCatalogID : 'master-akeneo';
    var AKENEO_CATALOG_MEDIA_FLUX_DIR = File.CATALOGS + File.SEPARATOR + akeneoCatalog + File.SEPARATOR + 'default' + File.SEPARATOR + 'akeneo-entity' + File.SEPARATOR;
    var response;
    var metaFileIndex = 1;
    var attributeWriter;

    while (iterEntities.hasNext()) {
        var akeneoEntity = iterEntities.next();
        var referenceEntityCode = akeneoEntity.code;
        urlString = entityRecordsUrl.replace('{reference_entity_code}', referenceEntityCode);
        akeneoEntityDataFile.writeStartContent(dataXswHandle, referenceEntityCode);

        do {
            var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
            response = 	akeneoEntityRecords.getEntityRecords(paginationURL, urlString);

            if (response.recordList && response.recordList.getLength() > 0) {
                var iterRecordsList = response.recordList.iterator();

                while (iterRecordsList.hasNext()) {
                    var entityRecord = iterRecordsList.next();
                    var attributeId = 'akeneo_entity_' + referenceEntityCode + '_' + entityRecord.code;
                    akeneoEntityDataFile.writeContentData(AKENEO_CATALOG_MEDIA_FLUX_DIR, dataXswHandle, attributeId, referenceEntityCode, entityRecord, entityAttributesUrl, entityAttributesOptionUrl);
                    recordsMap.put(attributeId, entityRecord.values.label);

                    if (recordsMap.size() === 200) {
                        attributeWriter = akeneoEntityMetaFile.writeAttributeMetaHeader(metaFileIndex);
                        akeneoEntityMetaFile.writeContentAssetAttributes(attributeWriter.xswHandle, recordsMap);
                        akeneoEntityMetaFile.writeAttributesFooter(attributeWriter);
                        recordsMap.clear();
                        metaFileIndex++;
                    }
                }
            }
        } while (response.serviceNextURL !== '');

        akeneoEntityDataFile.writeEndContent(dataXswHandle);
    }

    if (!(iterEntities.hasNext())) {
        attributeWriter = akeneoEntityMetaFile.writeAttributeMetaHeader(metaFileIndex);
        akeneoEntityMetaFile.writeContentAssetAttributes(attributeWriter.xswHandle, recordsMap);
        akeneoEntityMetaFile.writeAttributesFooter(attributeWriter);
        recordsMap.clear();
    }
}

/**
 * @desc calls function to prepare file for import
 * @param {Object} args - job params
 * @returns {void}
 */
function prepareImport(args) {
    var archiveFileName = 'import-meta-content-data-akeneo';
    if (args.AkeneoFluxPath) {
        var akeneoPrepareImport = require('~/cartridge/scripts/utils/akeneoPrepareImport');
        akeneoPrepareImport.prepareFileForImport(args.AkeneoFluxPath, archiveFileName);
    }
}

/**
 * @desc This function cleans directory of content asset attributes impex location.
 */
function clearDirectoryContentAttr() {
    var AKENEO_CATALOG_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'content-asset-attributes' + File.SEPARATOR;

    var AkeneoFluxPath = new File(AKENEO_CATALOG_FLUX_DIR);

    // filter on file only
    var filesList = AkeneoFluxPath.listFiles(function (file) {
        return !file.isDirectory();
    });

    if (filesList && filesList.getLength() > 0) {
        var filesIterator = filesList.iterator();

        while (filesIterator.hasNext()) {
            var file = filesIterator.next();
            file.remove();
        }
    }
}

/**
 * @desc Calls Akeneo API to get the entity records and creates xml
 * @param {Object} args - job parameters
 * @returns {void}
 */
function getAllEntities(args) {
    try {
        // first of all, we clean directory. If necessary, in other jobs, do a step with this function
        clearDirectoryContentAttr();
        var dataWriter = akeneoEntityDataFile.writeDataFileHeader();
        var response;

        do {
            var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
            response = akeneoEntities.getAllEntities(paginationURL, args.ReferenceEntityUrl);

            if (response.entitiesList && response.entitiesList.getLength() > 0) {
                getEntityRecordsData(response.entitiesList, args.EntityRecordsUrl, dataWriter.xswHandle, args.EntityAttributesUrl, args.EntityAttributesOptionUrl);
            }
        } while (response.serviceNextURL !== '');

        akeneoEntityDataFile.writeDataFileFooter(dataWriter);
        prepareImport(args);
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/* Exported functions */
module.exports = {
    getAllEntities: getAllEntities
};
