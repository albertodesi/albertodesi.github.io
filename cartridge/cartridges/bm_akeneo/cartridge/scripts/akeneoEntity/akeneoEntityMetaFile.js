'use strict';

var akeneoEntityMetaFile = {};

/**
 * @desc Write Header & Static part of system object type extension for attributes xml
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML Writer
 */
function writeAttributeHeader(xswHandle) {
    // XML definition & first node
    xswHandle.writeStartDocument('UTF-8', '1.0');
    xswHandle.writeStartElement('metadata');
    xswHandle.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/metadata/2006-10-31');

    xswHandle.writeStartElement('type-extension');
    xswHandle.writeAttribute('type-id', 'Content');
    xswHandle.writeStartElement('custom-attribute-definitions');
}

/**
 * @desc This function write main part of xml attributes-definition in Impex file.
 * @param {number} metaFileIndex - meta file name
 * @returns {Object} - XML and File Writer Object
 */
akeneoEntityMetaFile.writeAttributeMetaHeader = function (metaFileIndex) {
    var File = require('dw/io/File');
    var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
    var FileWriter = require('dw/io/FileWriter');
    var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
    var StringUtils	= require('dw/util/StringUtils');
    var Calendar = require('dw/util/Calendar');

    var AKENEO_ATTRS_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'content-asset-attributes' + File.SEPARATOR;
    var AKENEO_ATTRS_FILE_PATH = metaFileIndex + '-content-assets-attributes-' + StringUtils.formatCalendar(new Calendar(), 'yyyMMddHHmmss') + '.xml';

    var file = new File(AKENEO_ATTRS_FLUX_DIR + AKENEO_ATTRS_FILE_PATH);

    FileUtils.createFileAndFolders(file);
    var fwHandle;
    var xswHandle;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(file);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);

        writeAttributeHeader(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML content asset attributes file : ' + e.stack + ' with Error: ' + e.message);
    }
    return {
        xswHandle: xswHandle,
        fwHandle: fwHandle
    };
};

/**
 * @desc Write an xml element
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} elementName - element name
 * @param {string} chars - chars
 * @param {string} attrKey - attr key
 * @param {string} attrValue - attr value
 */
function writeElement(xswHandle, elementName, chars, attrKey, attrValue) {
    xswHandle.writeStartElement(elementName);
    if (attrKey && attrValue) {
        xswHandle.writeAttribute(attrKey, attrValue);
    }
    xswHandle.writeCharacters(chars);
    xswHandle.writeEndElement();
}

/**
 * @desc Write specific nodes for attr type Text
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML Writer
 */
function writeAkeneoAttributeText(xswHandle) {
    writeElement(xswHandle, 'type', 'text');
    writeElement(xswHandle, 'site-specific-flag', false);
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'visible-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
    writeElement(xswHandle, 'order-required-flag', false);
    writeElement(xswHandle, 'externally-defined-flag', false);
    writeElement(xswHandle, 'min-length', '0');
}

/**
 * @desc Write content asset attributes XML part
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML Writer
 * @param {dw.util.HashMap} recordsMap - records Map
 */
akeneoEntityMetaFile.writeContentAssetAttributes = function (xswHandle, recordsMap) {
    var keyIterator = recordsMap.keySet().iterator();

    while (keyIterator.hasNext()) {
        var attributeId = keyIterator.next();
        xswHandle.writeStartElement('attribute-definition');
        xswHandle.writeAttribute('attribute-id', attributeId);
        var mapValue = recordsMap.get(attributeId);

        if (typeof mapValue === 'object') {
            var keys = Object.keys(mapValue);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var locale = mapValue[key].locale;
                writeElement(xswHandle, 'display-name', mapValue[key].data.toString(), 'xml:lang', locale.replace('_', '-').toString());
            }
        } else {
            writeElement(xswHandle, 'display-name', attributeId, 'xml:lang', 'x-default');
        }
        writeAkeneoAttributeText(xswHandle);
        xswHandle.writeEndElement(); // attribute-definition
    }
    // close xml custom-attribute
    xswHandle.writeEndElement();
};

/**
 * @desc Write Footer & Static part of attribute-definitions system object type extension
 * @param {Object} metaWriter - XML and File Writer object
 */
akeneoEntityMetaFile.writeAttributesFooter = function (metaWriter) {
    var xswHandle = metaWriter.xswHandle;
    var fwHandle = metaWriter.fwHandle;

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
module.exports = akeneoEntityMetaFile;
