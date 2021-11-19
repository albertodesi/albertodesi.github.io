'use strict';

var Site = require('dw/system/Site');
var ContentMgr = require('dw/content/ContentMgr');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');

var akeneoEntityRecordGroup = {};
var CustomPreferences = Site.current.preferences ? Site.current.preferences.custom : '';

/**
 * @desc Write Header & Static part of system object type extension for attributes xml
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML Writer
 */
function writeAttrGroupHeader(xswHandle) {
    var groupID = CustomPreferences.akeneoContentAttrGrpID;

    // XML definition & first node
    xswHandle.writeStartDocument('UTF-8', '1.0');
    xswHandle.writeStartElement('metadata');
    xswHandle.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/metadata/2006-10-31');

    xswHandle.writeStartElement('type-extension');
    xswHandle.writeAttribute('type-id', 'Content');
    xswHandle.writeStartElement('group-definitions');
    xswHandle.writeStartElement('attribute-group');
    xswHandle.writeAttribute('group-id', groupID);

    generalUtils.writeElement(xswHandle, 'display-name', groupID, 'xml:lang', 'x-default');
}

/**
 * @desc This function write main part of xml attributes-definition in Impex file.
 * @returns {Object} - XML and File Writer Object
 */
akeneoEntityRecordGroup.writeAttrGroupMetaHeader = function () {
    var File = require('dw/io/File');
    var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
    var FileWriter = require('dw/io/FileWriter');
    var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
    var StringUtils	= require('dw/util/StringUtils');
    var Calendar = require('dw/util/Calendar');

    var AKENEO_ATTRS_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'content-asset-attributes-group' + File.SEPARATOR;
    var AKENEO_ATTRS_FILE_PATH = '1-content-assets-attributes-group-' + StringUtils.formatCalendar(new Calendar(), 'yyyMMddHHmmss') + '.xml';

    var file = new File(AKENEO_ATTRS_FLUX_DIR + AKENEO_ATTRS_FILE_PATH);

    FileUtils.createFileAndFolders(file);
    var fwHandle;
    var xswHandle;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(file);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);

        writeAttrGroupHeader(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML content asset attributes file : ' + e.stack + ' with Error: ' + e.message);
    }
    return {
        xswHandle: xswHandle,
        fwHandle: fwHandle
    };
};

/**
 * @desc Write Akeneo Attributes Group Definition XML part
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} akeneoEntityRecordID - akeneoEntityRecordID
 * @param {string} akeneoEntityID - akeneoEntityID
 */
akeneoEntityRecordGroup.writeAkeneoAttributesGroupDefinitions = function (xswHandle, akeneoEntityRecordID, akeneoEntityID) {
    var Content = ContentMgr.getContent(akeneoEntityID);
    try {
        var contentAttr = Object.prototype.hasOwnProperty.call(Content.getCustom(), akeneoEntityRecordID);

        if (contentAttr) {
            generalUtils.writeElement(xswHandle, 'attribute', '', 'attribute-id', akeneoEntityRecordID);
        } else {
            throw new Error('ERROR No such content attribute : ' + akeneoEntityRecordID);
        }
    } catch (e) {
        throw new Error('ERROR: Please ensure ' + CustomPreferences.akeneoSharedLibraryId + ' is assigned to Site ' + Site.current.ID);
    }
};

/**
 * @desc Write Footer & Static part of attribute-definitions system object type extension
 * @param {Object} groupWriter - XML and file writer object
 */
akeneoEntityRecordGroup.writeAttrGroupFooter = function (groupWriter) {
    var xswHandle = groupWriter.xswHandle;
    var fwHandle = groupWriter.fwHandle;

    // close xml attribute-group
    xswHandle.writeEndElement();
    // close xml group-definitions
    xswHandle.writeEndElement();
    // close xml type-extension
    xswHandle.writeEndElement();

    // XML definition & close first node
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
module.exports = akeneoEntityRecordGroup;
