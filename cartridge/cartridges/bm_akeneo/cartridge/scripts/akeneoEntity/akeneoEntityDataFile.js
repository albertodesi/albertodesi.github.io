'use strict';

/* eslint no-underscore-dangle: 0 */
/* eslint no-param-reassign: 0 */

var Site = require('dw/system/Site');
var File = require('dw/io/File');
var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;

var akeneoEntityAttrServiceCall = require('~/cartridge/scripts/akeneoEntity/akeneoEntityAttrServiceCall');
var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');
var AkeneoGetService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');

var akeneoEntityDataFile = {};

/**
 * @desc This function cleans directory of Library impex location.
 */
function clearDirectoryLibrary() {
    var AKENEO_CATALOG_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'library' + File.SEPARATOR;

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
 * @desc Write Header & Static part of content asset xml file
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function writeDataHeader(xswHandle) {
    var customPreferences = Site.current.preferences.custom;
    // XML definition & first node
    xswHandle.writeStartDocument('UTF-8', '1.0');
    xswHandle.writeStartElement('library');
    xswHandle.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/library/2006-10-31');

    if (customPreferences.akeneoSharedLibraryId) {
        xswHandle.writeAttribute('library-id', customPreferences.akeneoSharedLibraryId);
    }
}

/**
 * @desc This function write main part of xml attributes-definition in Impex file.
 * @returns {Object} - XML and File writer Object
 */
akeneoEntityDataFile.writeDataFileHeader = function () {
    // first of all, we clean directory. If necessary, in other jobs, do a step with this function
    clearDirectoryLibrary();

    var FileWriter = require('dw/io/FileWriter');
    var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
    var StringUtils	= require('dw/util/StringUtils');
    var Calendar = require('dw/util/Calendar');

    var AKENEO_ATTRS_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'library' + File.SEPARATOR;
    var AKENEO_ATTRS_FILE_PATH = 'content-assets-' + StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmss') + '.xml';

    var file = new File(AKENEO_ATTRS_FLUX_DIR + AKENEO_ATTRS_FILE_PATH);

    FileUtils.createFileAndFolders(file);
    var fwHandle;
    var xswHandle;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(file);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);

        writeDataHeader(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML content asset attributes file : ' + e.stack + ' with Error: ' + e.message);
    }
    return {
        xswHandle: xswHandle,
        fwHandle: fwHandle
    };
};

/**
 * @desc Process upload of all media files of entity record
 * @param {Array} imageDataTypeList - list of image data types
 * @param {Object} entityRecord - entity object
 * @param {string} AKENEO_CATALOG_MEDIA_FLUX_DIR - akeneo impex location
 */
function uploadMediaFiles(imageDataTypeList, entityRecord, AKENEO_CATALOG_MEDIA_FLUX_DIR) {
    var AkeneoService = AkeneoGetService.getGeneralService();

    for (var i = 0; i < imageDataTypeList.length; i++) {
        var imageAttr = imageDataTypeList[i];
        try {
            if (Object.prototype.hasOwnProperty.call(entityRecord.values, imageAttr)) {
                var imgDownloadPath = entityRecord.values[imageAttr][0]._links.download.href;
                var imgCode = entityRecord.values[imageAttr][0].data;

                var mediaFile = new File(AKENEO_CATALOG_MEDIA_FLUX_DIR + imgCode);

                // getting the full folder path for creating it before upload
                var folderToCreate = AKENEO_CATALOG_MEDIA_FLUX_DIR + imgCode;
                folderToCreate = folderToCreate.split('/');
                folderToCreate.pop();
                folderToCreate = folderToCreate.join('/');

                FileUtils.createFileAndFolders(mediaFile);

                // remove file if already exist. We do this because, when the Service set OutFile, it does not remove or overwrite the file.
                if (mediaFile.exists()) {
                    mediaFile.remove();
                }

                AkeneoService.setURL(imgDownloadPath);

                AkeneoService.call({
                    outputFile: true,
                    fileToOutput: mediaFile
                });
            }
        } catch (e) {
            throw new Error('ERROR : While downloading Media File of : ' + entityRecord.code + ' with error : ' + e.stack + ' and message : ' + e.message);
        }
    }
}

/**
 * @desc filter scope specific (which defined in custom preference) attributes
 * @param {Object} entityRecord - entity object
 * @returns {Object} - entity object
 */
function filterChannelAttributes(entityRecord) {
    var channelMatches;
    Object.keys(entityRecord.values).forEach(function (attrKey) {
        var entityAttr = entityRecord.values[attrKey];

        if (entityAttr.length > 1 || entityAttr[0].locale) {
            var attrKeys = Object.keys(entityAttr);
            for (var i = 0; i < attrKeys.length; i++) {
                var localeAttrValue = attrKeys[i];
                channelMatches = GeneralUtils.checkScope(entityAttr[localeAttrValue].channel);

                if (!channelMatches) {
                    delete entityRecord.values[attrKey][localeAttrValue];
                }
            }
        } else {
            channelMatches = GeneralUtils.checkScope(entityAttr[0].channel);

            if (!channelMatches) {
                delete entityRecord.values[attrKey][0];
            }
        }
    });

    return entityRecord;
}

/**
 * @desc This function writes content data(custom-attribute) of each reference entity
 * @param {string} AKENEO_CATALOG_MEDIA_FLUX_DIR - media flux directory path
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} attributeId - attribute ID
 * @param {string} referenceEntityCode - reference entity code
 * @param {Object} entityRecord - entity record object
 * @param {string} akeneoEntityAttributesUrl - akeneoEntityAttributesUrl
 * @param {string} entityAttributesOptionUrl - entityAttributesOptionUrl
 */
akeneoEntityDataFile.writeContentData = function (AKENEO_CATALOG_MEDIA_FLUX_DIR, xswHandle, attributeId, referenceEntityCode, entityRecord, akeneoEntityAttributesUrl, entityAttributesOptionUrl) {
    var imageDataTypeList = [];
    var entityAttributesURL = akeneoEntityAttributesUrl.toString().replace('{reference_entity_code}', referenceEntityCode);
    var entityAttributesList = akeneoEntityAttrServiceCall.getAkeneoItems(entityAttributesURL);
    var entityAttributesIterator = entityAttributesList.iterator();

    while (entityAttributesIterator.hasNext()) {
        var attrList = entityAttributesIterator.next();
        if (attrList.type === 'image') {
            imageDataTypeList.push(attrList.code);
        }
    }

    uploadMediaFiles(imageDataTypeList, entityRecord, AKENEO_CATALOG_MEDIA_FLUX_DIR);
    entityRecord = akeneoEntityAttrServiceCall.getAttrOptions(entityAttributesList, entityRecord, referenceEntityCode, entityAttributesOptionUrl);

    for (var i = 0; i < imageDataTypeList.length; i++) {
        var imageAttr = imageDataTypeList[i];

        if (Object.prototype.hasOwnProperty.call(entityRecord.values, imageAttr)) {
            entityRecord.values[imageAttr][0]._links.download.href = 'akeneo-entity/' + entityRecord.values[imageAttr][0].data;
        }
    }

    entityRecord = filterChannelAttributes(entityRecord);

    xswHandle.writeStartElement('custom-attribute');
    xswHandle.writeAttribute('attribute-id', attributeId);
    GeneralUtils.writeElement(xswHandle, 'value', JSON.stringify(entityRecord));
    // close xml custom-attribute
    xswHandle.writeEndElement();
};

/**
 * @desc This function Ends each content and it's custom attributes of each reference entity
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
akeneoEntityDataFile.writeEndContent = function (xswHandle) {
    // close xml custom-attributes
    xswHandle.writeEndElement();
    // close xml content
    xswHandle.writeEndElement();
};

/**
 * @desc This function starts writting content and it's custom attributes for each reference entity
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} referenceEntityCode - reference entity code
 */
akeneoEntityDataFile.writeStartContent = function (xswHandle, referenceEntityCode) {
    xswHandle.writeStartElement('content');
    xswHandle.writeAttribute('content-id', 'akeneo_entity_' + referenceEntityCode);
    // Custom akeneo attributes nodes
    xswHandle.writeStartElement('custom-attributes');
};

/**
 * @desc This function  Write Footer & Static part of content asset xml file
 * @param {Object} dataWriter - XML and File writer object
 */
akeneoEntityDataFile.writeDataFileFooter = function (dataWriter) {
    var xswHandle = dataWriter.xswHandle;
    var fwHandle = dataWriter.fwHandle;

    // close xml Library
    xswHandle.writeEndElement();
    xswHandle.writeEndDocument();
    xswHandle.flush();

    if (xswHandle !== null) {
        xswHandle.close();
    }
    if (fwHandle !== null) {
        fwHandle.close();
    }
};

/* Exported functions */
module.exports = akeneoEntityDataFile;
