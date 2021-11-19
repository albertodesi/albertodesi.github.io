'use strict';

/* eslint no-underscore-dangle: 0 */

var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var ArrayList = require('dw/util/ArrayList');
var Logger = require('dw/system/Logger');

var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
var LargeArray = require('~/cartridge/scripts/utils/libLargeArray');
var GeneralUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = GeneralUtils.config;
var customCacheMgr = require('~/cartridge/scripts/io/customCacheWebdav');
var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
var akeneoService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
var libStringUtils = require('~/cartridge/scripts/utils/libStringUtilsExt');
var getFamilyVariantsAxes = require('~/cartridge/scripts/akeneoModelProducts/getFamilyVariants');
var akeneoServicesHandler = require('~/cartridge/scripts/akeneoServices/akeneoServicesHandler');

var pageCounter;
var prodCustomAttrsMapping;
var prodSystemAttrsMapping;
var advancedImportConfigAttrs;
var axesValues = getFamilyVariantsAxes.getAllFamilyVariantsAxes();

var akeneoAttributes = {};
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
 * @desc Write Header & Static part of system object type extension
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function writeAkeneoAttributesHeader(xswHandle) {
    // XML definition & first node
    xswHandle.writeStartDocument('UTF-8', '1.0');
    xswHandle.writeStartElement('metadata');
    xswHandle.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/metadata/2006-10-31');

    xswHandle.writeStartElement('type-extension');
    xswHandle.writeAttribute('type-id', 'Product');
}

/**
 * @desc Write Footer & Static part of system object type extension
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function writeAkeneoAttributesFooter(xswHandle) {
    // close xml type-extension
    xswHandle.writeEndElement();

    // XML definition & close first node
    xswHandle.writeEndElement();
    xswHandle.writeEndDocument();
    xswHandle.flush();
}

/**
 * @desc Write Akeneo Attributes Group Definition XML part
 * @param {LargeArray} largeAttributesList - Large array to keep attribute code and type for writing group definition
 */
function writeAkeneoAttributesGroupDefinitions(largeAttributesList) {
    var AKENEO_ATTRS_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'attributes' + File.SEPARATOR;
    var AKENEO_ATTRS_FILE_PATH = 'system-objecttype-extensions-' + pageCounter + '-' + StringUtils.formatCalendar(new Calendar(), 'yyyMMddHHmmss') + '.xml';
    var file = new File(AKENEO_ATTRS_FLUX_DIR + AKENEO_ATTRS_FILE_PATH);

    FileUtils.createFileAndFolders(file);

    var fwHandle; // FileWriter;
    var xswHandle; // XMLIndentingStreamWriter;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(file);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);
        writeAkeneoAttributesHeader(xswHandle);

        xswHandle.writeStartElement('group-definitions');
        xswHandle.writeStartElement('attribute-group');
        xswHandle.writeAttribute('group-id', 'AkeneoAttributes');
        writeElement(xswHandle, 'display-name', 'Akeneo Attributes', 'xml:lang', 'x-default');

        largeAttributesList.forEach(function (akeneoAttribute) {
            if (axesValues.contains(akeneoAttribute.code) && akeneoAttribute.type === 'pim_catalog_simpleselect') {
                writeElement(xswHandle, 'attribute', '', 'attribute-id', 'akeneo_' + libStringUtils.camelize(akeneoAttribute.code) + '_custom');
            }
            if (!('akeneo_' + libStringUtils.camelize(akeneoAttribute.code) in prodCustomAttrsMapping.matching
                || 'akeneo_' + libStringUtils.camelize(akeneoAttribute.code) in prodSystemAttrsMapping.matching)) {
                writeElement(xswHandle, 'attribute', '', 'attribute-id', 'akeneo_' + libStringUtils.camelize(akeneoAttribute.code));
            }
        });

        xswHandle.writeEndElement(); // close xml attribute-group
        xswHandle.writeEndElement(); // close xml group-definitions

        writeAkeneoAttributesFooter(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML Attributes file : ' + e.stack + ' with Error: ' + e.message);
    } finally {
        if (xswHandle != null) {
            xswHandle.close();
        }
        if (fwHandle != null) {
            fwHandle.close();
        }
    }
}

/**
 * @desc Write specific nodes for attr type Set of Strings
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} AkeneoAttribute - attr object
 */
function writeAkeneoAttributeAssets(xswHandle, AkeneoAttribute) {
    writeElement(xswHandle, 'type', 'set-of-string');
    writeElement(xswHandle, 'localizable-flag', AkeneoAttribute.localizable.toString());
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
}

/**
 * @desc Write specific nodes for attr type Image
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} AkeneoAttribute - attr object
 */
function writeAkeneoAttributeImage(xswHandle, AkeneoAttribute) {
    writeElement(xswHandle, 'type', 'image');
    writeElement(xswHandle, 'localizable-flag', AkeneoAttribute.localizable.toString());
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
}

/**
 * @desc Write specific nodes for attr type Boolean
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function writeAkeneoAttributeBoolean(xswHandle) {
    writeElement(xswHandle, 'type', 'boolean');
    writeElement(xswHandle, 'site-specific-flag', false);
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'visible-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
    writeElement(xswHandle, 'order-required-flag', false);
    writeElement(xswHandle, 'externally-defined-flag', false);
}

/**
 * @desc Write specific nodes for attr type Text Area
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} AkeneoAttribute - attr object
 */
function writeAkeneoAttributeTextArea(xswHandle, AkeneoAttribute) {
    if (AkeneoAttribute.wysiwyg_enabled === true) {
        writeElement(xswHandle, 'type', 'html');
    } else {
        writeElement(xswHandle, 'type', 'text');
    }
    writeElement(xswHandle, 'localizable-flag', AkeneoAttribute.localizable.toString());
    writeElement(xswHandle, 'site-specific-flag', false);
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'visible-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
    writeElement(xswHandle, 'order-required-flag', false);
    writeElement(xswHandle, 'externally-defined-flag', false);
}

/**
 * @desc Write specific nodes for attr type Text
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {boolean} isLocalizable - attr object is localizable or not
 */
function writeAkeneoAttributeText(xswHandle, isLocalizable) {
    writeElement(xswHandle, 'type', 'string');
    writeElement(xswHandle, 'localizable-flag', isLocalizable);
    writeElement(xswHandle, 'site-specific-flag', false);
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'visible-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
    writeElement(xswHandle, 'order-required-flag', false);
    writeElement(xswHandle, 'externally-defined-flag', false);
    writeElement(xswHandle, 'min-length', '0');
}

/**
 * @desc Write specific nodes for attr type Date
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} AkeneoAttribute - attr object
 */
function writeAkeneoAttributeDate(xswHandle, AkeneoAttribute) {
    writeElement(xswHandle, 'type', 'date');
    writeElement(xswHandle, 'localizable-flag', AkeneoAttribute.localizable.toString());
    writeElement(xswHandle, 'site-specific-flag', false);
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'visible-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
    writeElement(xswHandle, 'order-required-flag', false);
    writeElement(xswHandle, 'externally-defined-flag', false);
    writeElement(xswHandle, 'min-length', '0');
}

/**
 * @desc Write specific nodes for attr type Number
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} AkeneoAttribute - attr object
 */
function writeAkeneoAttributeNumber(xswHandle, AkeneoAttribute) {
    writeElement(xswHandle, 'type', 'double');
    writeElement(xswHandle, 'localizable-flag', AkeneoAttribute.localizable.toString());
    writeElement(xswHandle, 'site-specific-flag', false);
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'visible-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
    writeElement(xswHandle, 'order-required-flag', false);
    writeElement(xswHandle, 'externally-defined-flag', false);
}

/**
 * @desc Writes attribute options to XML
 * @param {Array} attributeOptions - list of attribute options
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 */
function writeAttributeOptionsXML(attributeOptions, xswHandle) {
    if (attributeOptions) {
        for (var i = 0; i < attributeOptions.length; i++) {
            var attributeOption = attributeOptions[i];
            xswHandle.writeStartElement('value-definition');

            var localeKeys = Object.keys(attributeOption.labels);
            for (var j = 0; j < localeKeys.length; j++) {
                var localeKey = localeKeys[j];
                var label = attributeOption.labels[localeKey];

                if (label) {
                    writeElement(xswHandle, 'display', label.toString(), 'xml:lang', localeKey.replace('_', '-').toString());
                }
            }

            writeElement(xswHandle, 'value', attributeOption.code);

            // close XML value-definition
            xswHandle.writeEndElement();
        }
    }
}

/**
 * Gets attribute options from cache
 * @param {Object} akeneoAttribute -akeneoAttribute
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
function getAttributeOptions(akeneoAttribute, xswHandle) {
    var optionFileCount = customCacheMgr.getAttributeOptionFileCount(config.APIURL.endpoints.attributes + '/' + akeneoAttribute.code);
    var attributeOptions;

    xswHandle.writeStartElement('value-definitions');

    if (optionFileCount > 1) {
        for (var i = 0; i < optionFileCount; i++) {
            attributeOptions = customCacheMgr.getCache(config.APIURL.endpoints.attributes + '/' + akeneoAttribute.code + '/options' + (i > 0 ? i : ''));
            writeAttributeOptionsXML(attributeOptions, xswHandle);
        }
    } else {
        attributeOptions = customCacheMgr.getCache(config.APIURL.endpoints.attributes + '/' + akeneoAttribute.code + '/options');
        writeAttributeOptionsXML(attributeOptions, xswHandle);
    }

    // close XML value-definitions
    xswHandle.writeEndElement();
}

/**
 * @desc Writes XML tags for asset attribute options
 * @param {Object} akeneoAttribute - asset attribute
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 */
function getAssetAttributeOptions(akeneoAttribute, xswHandle) {
    var attributeOptionsURL = akeneoAttribute._links.self.href + '/options';
    var cacheAttributeOptionsEndpoint = attributeOptionsURL.substring(attributeOptionsURL.indexOf('/asset-families'));
    var optionsList = customCacheMgr.getCache(cacheAttributeOptionsEndpoint);

    if (!(optionsList && optionsList.length > 0)) {
        optionsList = akeneoServicesHandler.processService(attributeOptionsURL.substring(config.serviceGeneralUrl.length), '');
        customCacheMgr.setCache(cacheAttributeOptionsEndpoint, optionsList);
    }
    xswHandle.writeStartElement('value-definitions');
    writeAttributeOptionsXML(optionsList, xswHandle);
    xswHandle.writeEndElement(); // value-definitions
}

/**
 * @desc Write specific nodes for attr type Simple Select & Multi Select
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} akeneoAttribute - attr object
 */
function writeAkeneoAttributeSelect(xswHandle, akeneoAttribute) {
    writeElement(xswHandle, 'type', 'enum-of-string');
    writeElement(xswHandle, 'localizable-flag', true);
    writeElement(xswHandle, 'site-specific-flag', false);
    writeElement(xswHandle, 'mandatory-flag', false);
    writeElement(xswHandle, 'visible-flag', false);
    writeElement(xswHandle, 'externally-managed-flag', false);
    writeElement(xswHandle, 'order-required-flag', false);
    writeElement(xswHandle, 'externally-defined-flag', false);

    // multi select case
    if (akeneoAttribute.type === 'pim_catalog_multiselect' || akeneoAttribute.type === 'akeneo_reference_entity_collection' || akeneoAttribute.type === 'multiple_options') {
        writeElement(xswHandle, 'select-multiple-flag', 'true');
    }

    if (akeneoAttribute.type === 'multiple_options' || akeneoAttribute.type === 'single_option') {
        getAssetAttributeOptions(akeneoAttribute, xswHandle);
    } else {
        getAttributeOptions(akeneoAttribute, xswHandle);
    }
}
/**
 * @desc Write Akeneo Attribute type
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} AkeneoAttribute - AkeneoAttribute object
 * @param {string} attributeCode - attribute code
 * @param {boolean} writeAsTextAttribute - Boolean value to write attribute type as string or not
 */
function writeAttributeTypes(xswHandle, AkeneoAttribute, attributeCode, writeAsTextAttribute) {
    xswHandle.writeStartElement('attribute-definition');
    xswHandle.writeAttribute('attribute-id', attributeCode);

    // writing localizable name of attr
    if (typeof AkeneoAttribute.labels === 'object') {
        var localeKeys = Object.keys(AkeneoAttribute.labels);
        for (var j = 0; j < localeKeys.length; j++) {
            var localeKey = localeKeys[j];
            var attrLabel = AkeneoAttribute.labels[localeKey];

            if (attrLabel) {
                writeElement(xswHandle, 'display-name', attrLabel.toString(), 'xml:lang', localeKey.replace('_', '-').toString());
            }
        }
    } else {
        writeElement(xswHandle, 'display-name', AkeneoAttribute.labels.fr_FR, 'xml:lang', 'x-default');
    }

    if (writeAsTextAttribute) {
        writeAkeneoAttributeText(xswHandle, AkeneoAttribute.localizable);
    } else {
        // Order of the nodes matter in XML file for being imported by SalesForce
        switch (AkeneoAttribute.type) {
            case 'pim_catalog_boolean' :
                writeAkeneoAttributeBoolean(xswHandle);
                break;
            case 'pim_catalog_simpleselect' :
            case 'pim_catalog_multiselect' :
                writeAkeneoAttributeSelect(xswHandle, AkeneoAttribute);
                break;
            case 'pim_catalog_file' :
            case 'pim_catalog_text' :
            case 'pim_catalog_textarea' :
            case 'pim_catalog_metric' :
            case 'pim_reference_data_simpleselect' :
                writeAkeneoAttributeText(xswHandle, AkeneoAttribute.localizable);
                break;
            case 'pim_catalog_number' :
                writeAkeneoAttributeNumber(xswHandle, AkeneoAttribute);
                break;
            case 'pim_catalog_date' :
                writeAkeneoAttributeDate(xswHandle, AkeneoAttribute);
                break;
            case 'pim_catalog_image' :
                writeAkeneoAttributeImage(xswHandle, AkeneoAttribute);
                break;
            case 'pim_assets_collection' :
            case 'pim_catalog_price_collection' :
            case 'pim_reference_data_multiselect' :
            case 'akeneo_reference_entity_collection' :
            case 'akeneo_reference_entity' :
                writeAkeneoAttributeAssets(xswHandle, AkeneoAttribute);
                break;
            default :
                writeAkeneoAttributeTextArea(xswHandle, AkeneoAttribute);
                break;
        }
    }
    // close XML attribute-definition
    xswHandle.writeEndElement();
}
/**
 * @desc Write Akeneo Attributes XML part
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {Array} akeneoAttributesList - list of akeneo attrs
 */
function writeAkeneoAttributes(xswHandle, akeneoAttributesList) {
    xswHandle.writeStartElement('custom-attribute-definitions');

    for (var i = 0; i < akeneoAttributesList.length; i++) {
        var AkeneoAttribute = akeneoAttributesList[i];

        if (axesValues.contains(AkeneoAttribute.code)) {
            if (AkeneoAttribute.type === 'pim_catalog_simpleselect') {
                writeAttributeTypes(xswHandle, AkeneoAttribute, 'akeneo_' + libStringUtils.camelize(AkeneoAttribute.code) + '_custom', false);
            }
            if (!('akeneo_' + libStringUtils.camelize(AkeneoAttribute.code) in prodCustomAttrsMapping.matching
                || 'akeneo_' + libStringUtils.camelize(AkeneoAttribute.code) in prodSystemAttrsMapping.matching)) {
                writeAttributeTypes(xswHandle, AkeneoAttribute, 'akeneo_' + libStringUtils.camelize(AkeneoAttribute.code), true);
            }
        } else {
            writeAttributeTypes(xswHandle, AkeneoAttribute, 'akeneo_' + libStringUtils.camelize(AkeneoAttribute.code), false);
        }
    }
    // close xml custom-attribute-definitions
    xswHandle.writeEndElement();
}

/**
 * @desc Get the Akeneo import configured attribute from BM preference.
 * @returns {Array} - config attrs
 */
akeneoAttributes.getAdvancedImportConfigAttrs = function () {
    var configAttrs = [];

    if (config.importType === 'advanced') {
        var importConfigObj = config.productsImportBuilderConfig;
        configAttrs = importConfigObj.attributes ? importConfigObj.attributes : [];

        importConfigObj = config.modelProductsImportBuilderConfig;
        var modelProductImportConfigObj = importConfigObj.attributes ? importConfigObj.attributes : [];

        for (var i = 0; i < modelProductImportConfigObj.length; i++) {
            if (configAttrs.indexOf(modelProductImportConfigObj[i]) < 0) {
                configAttrs.push(modelProductImportConfigObj[i]);
            }
        }
    }

    return configAttrs;
};

/**
 * @desc Keeps attributes options and keeps in cache
 * @param {Object} akeneoAttribute - attribute object
 * @param {dw.svc.Service} AkeneoAttributesService - service object
 * @returns {void}
 */
function keepAttrOptionsInCache(akeneoAttribute, AkeneoAttributesService) {
    if (akeneoAttribute.type === 'pim_catalog_simpleselect' || akeneoAttribute.type === 'pim_catalog_multiselect') {
        var attrOptionsUrl = config.serviceGeneralUrl + config.APIURL.endpoints.attributes + '/' + akeneoAttribute.code + '/options';
        AkeneoServicesHandler.nextUrl = attrOptionsUrl + '?limit=' + GeneralUtils.config.APIURL.parameter.pagination;
        AkeneoServicesHandler.serviceAttributeOptions(AkeneoAttributesService, attrOptionsUrl);
    }
}

/**
 * @desc Keeps Attribute in custom cache
 * @param {Object} akeneoAttribute - attribute object
 * @param {dw.svc.Service} AkeneoAttributesService - service object
 */
function keepAttributeInCache(akeneoAttribute, AkeneoAttributesService) {
    var individualAttrUrl = config.APIURL.endpoints.attributes + '/' + akeneoAttribute.code;

    customCacheMgr.setCache(individualAttrUrl, akeneoAttribute);
    keepAttrOptionsInCache(akeneoAttribute, AkeneoAttributesService);
}

/**
 * @desc This function write main part of xml attributes in Impex file.
 * @param {Array} akeneoAttributesList - list of akeneo attrs
 */
function writeAkeneoAttributesXML(akeneoAttributesList) {
    var AKENEO_ATTRS_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'attributes' + File.SEPARATOR;
    var AKENEO_ATTRS_FILE_PATH = 'system-objecttype-extensions-' + pageCounter + '-' + StringUtils.formatCalendar(new Calendar(), 'yyyMMddHHmmss') + '.xml';

    var file = new File(AKENEO_ATTRS_FLUX_DIR + AKENEO_ATTRS_FILE_PATH);

    FileUtils.createFileAndFolders(file);

    var fwHandle; // FileWriter;
    var xswHandle; // XMLIndentingStreamWriter;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(file);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);
        writeAkeneoAttributesHeader(xswHandle);
        writeAkeneoAttributes(xswHandle, akeneoAttributesList);
        writeAkeneoAttributesFooter(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML Attributes file : ' + e.stack + ' with Error: ' + e.message);
    } finally {
        if (xswHandle != null) {
            xswHandle.close();
        }
        if (fwHandle != null) {
            fwHandle.close();
        }
    }
}

/**
 * @desc Handles single page content
 * @param {dw.util.ArrayList} akeneoAttributesList - akeneo attributes list
 * @param {LargeArray} largeAttributesList - Large array to keep attribute code and type for writing group definition
 * @returns {LargeArray} - Large array to keep attribute code and type for writing group definition
 */
function handleSinglePage(akeneoAttributesList, largeAttributesList) {
    var attributesList = [];
    var attrConsider;
    var AkeneoAttributesService = akeneoService.getGeneralService();
    var imageCodes = customCacheMgr.getCache(config.cacheDirectory.attributes.imageCodesList) || [];
    var assetCodes = customCacheMgr.getCache(config.cacheDirectory.attributes.assetCodesList) || [];
    var selectCodes = customCacheMgr.getCache(config.cacheDirectory.attributes.selectCodesList) || [];
    var assetAttributeType = 'pim_catalog_asset_collection';

    if (config.assetSystemVersion === 'old') {
        assetAttributeType = 'pim_assets_collection';
    }

    var attributesIterator = akeneoAttributesList.iterator();

    while (attributesIterator.hasNext()) {
        var akeneoAttribute = attributesIterator.next();
        attrConsider = false;

        if (!('akeneo_' + libStringUtils.camelize(akeneoAttribute.code) in prodCustomAttrsMapping.matching
            || 'akeneo_' + libStringUtils.camelize(akeneoAttribute.code) in prodSystemAttrsMapping.matching)
            || (axesValues.contains(akeneoAttribute.code) && akeneoAttribute.type === 'pim_catalog_simpleselect')) {
            if (advancedImportConfigAttrs.length) { // if advanced import is configured
                if (advancedImportConfigAttrs.indexOf(akeneoAttribute.code) > -1) {
                    attrConsider = true;
                }
            } else {
                attrConsider = true;
            }
        }

        if (attrConsider) {
            attributesList.push(akeneoAttribute);
            largeAttributesList.push({
                code: akeneoAttribute.code,
                type: akeneoAttribute.type
            });
            keepAttributeInCache(akeneoAttribute, AkeneoAttributesService);

            if (akeneoAttribute.type === 'pim_catalog_image') {
                imageCodes.push(akeneoAttribute.code);
            } else if (akeneoAttribute.type === assetAttributeType) {
                assetCodes.push(akeneoAttribute.code);
            } else if (akeneoAttribute.type === 'pim_catalog_simpleselect' || akeneoAttribute.type === 'pim_catalog_multiselect') {
                selectCodes.push(akeneoAttribute.code);
            }
        }
    }

    customCacheMgr.setCache(config.cacheDirectory.attributes.imageCodesList, imageCodes);
    customCacheMgr.setCache(config.cacheDirectory.attributes.assetCodesList, assetCodes);
    customCacheMgr.setCache(config.cacheDirectory.attributes.selectCodesList, selectCodes);

    if (attributesList && attributesList.length > 0) {
        writeAkeneoAttributesXML(attributesList);
    } else {
        Logger.error('ERROR : No attributes retrieved from API Akeneo');
    }
    return largeAttributesList;
}

/**
 * @desc This function will call Akeneo API with ServiceHandler.ds then build xml file corresponding to salesforce's attributes
 * The AkeneoService is initialized with generic url present in Site Preference.
 */
akeneoAttributes.generateAttributesXml = function () {
    if (!config.serviceGeneralUrl) {
        throw new Error('ERROR : Site Preference is missing : akeneoServiceGeneralUrl');
    }

    var attributesListPerPage = new ArrayList();
    var largeAttributesList = new LargeArray();
    var debugConfig = config.debug;
    var AkeneoAttributesService = akeneoService.getGeneralService();
    var attributesApiNextUrl = config.serviceGeneralUrl + config.APIURL.endpoints.attributes + '?limit=' + config.APIURL.parameter.pagination;

    prodCustomAttrsMapping = config.customAttrsMapping;
    prodSystemAttrsMapping = config.systemAttrsMapping;
    advancedImportConfigAttrs = akeneoAttributes.getAdvancedImportConfigAttrs();
    AkeneoServicesHandler.nextUrl = attributesApiNextUrl;
    pageCounter = 0;
    customCacheMgr.clearCache(config.APIURL.endpoints.attributes);

    do {
        attributesListPerPage = AkeneoServicesHandler.serviceRequestAttributesAkeneo(AkeneoAttributesService);
        attributesApiNextUrl = AkeneoServicesHandler.nextUrl;
        largeAttributesList = handleSinglePage(attributesListPerPage, largeAttributesList);
        pageCounter++;

        if (debugConfig.breakCodeOnLimit && pageCounter >= debugConfig.pageLimit) {
            break;
        }

        AkeneoServicesHandler.nextUrl = attributesApiNextUrl;
    } while (AkeneoServicesHandler.nextUrl !== '');
    writeAkeneoAttributesGroupDefinitions(largeAttributesList);
};

/**
 * @desc writes XML tags for akeneo asset attributes
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} assetCode - asset code
 * @param {Array} akeneoAttributesList - list of akeneo attributes
 */
akeneoAttributes.writeAkeneoAssetAttributes = function (xswHandle, assetCode, akeneoAttributesList) {
    xswHandle.writeStartElement('custom-attribute-definitions');

    for (var i = 0; i < akeneoAttributesList.length; i++) {
        var akeneoAttribute = akeneoAttributesList[i];
        xswHandle.writeStartElement('attribute-definition');
        xswHandle.writeAttribute('attribute-id', 'akeneo_' + libStringUtils.camelize(assetCode) + '_' + libStringUtils.camelize(akeneoAttribute.code));

        // writing localizable name of attr
        if (typeof akeneoAttribute.labels === 'object') {
            var localeKeys = Object.keys(akeneoAttribute.labels);
            for (var j = 0; j < localeKeys.length; j++) {
                var localeKey = localeKeys[j];
                var attrLabel = akeneoAttribute.labels[localeKey];

                if (attrLabel) {
                    writeElement(xswHandle, 'display-name', attrLabel.toString(), 'xml:lang', localeKey.replace('_', '-').toString());
                }
            }
        } else {
            writeElement(xswHandle, 'display-name', akeneoAttribute.labels.fr_FR, 'xml:lang', 'x-default');
        }

        switch (akeneoAttribute.type) {
            case 'single_option' :
            case 'multiple_options' :
                writeAkeneoAttributeSelect(xswHandle, akeneoAttribute);
                break;
            case 'media_file' :
                writeAkeneoAttributeTextArea(xswHandle, {
                    wysiwyg_enabled: true,
                    localizable: akeneoAttribute.value_per_locale
                });
                break;
            case 'media_link' :
            case 'text' :
            default :
                writeAkeneoAttributeText(xswHandle, akeneoAttribute.value_per_locale);
                break;
        }

        // close XML attribute-definition
        xswHandle.writeEndElement();
    }

    // close xml custom-attribute-definitions
    xswHandle.writeEndElement();
};

/**
 * @desc writes XML tags for akeneo asset attributes
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream  writers
 * @param {string} assetCode - asset code
 * @param {Array} akeneoAttributesList - list of attributes
 */
akeneoAttributes.writeAkeneoAssetAttributesGroupDefinitions = function (xswHandle, assetCode, akeneoAttributesList) {
    xswHandle.writeStartElement('group-definitions');
    xswHandle.writeStartElement('attribute-group');
    xswHandle.writeAttribute('group-id', 'AkeneoAsset' + libStringUtils.capitalize(libStringUtils.camelize(assetCode)) + 'Attributes');
    writeElement(xswHandle, 'display-name', 'Akeneo Asset "' + assetCode + '" Attributes', 'xml:lang', 'x-default');

    for (var i = 0; i < akeneoAttributesList.length; i++) {
        var akeneoAttribute = akeneoAttributesList[i];
        writeElement(xswHandle, 'attribute', '', 'attribute-id', 'akeneo_' + libStringUtils.camelize(assetCode) + '_' + libStringUtils.camelize(akeneoAttribute.code));
    }

    // close xml attribute-group
    xswHandle.writeEndElement();

    // close xml group-definitions
    xswHandle.writeEndElement();
};

/**
 * @desc Generates asset attributes XML
 * @param {string} assetCode - asset code
 * @param {Array} akeneoAttributesList - array of attributes
 */
akeneoAttributes.generatesAssetAttributesXml = function (assetCode, akeneoAttributesList) {
    var AKENEO_ATTRS_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'asset-attributes' + File.SEPARATOR;
    var AKENEO_ATTRS_FILE_PATH = 'system-objecttype-extensions-' + assetCode + '-' + StringUtils.formatCalendar(new Calendar(), 'yyyMMddHHmmss') + '.xml';

    var file = new File(AKENEO_ATTRS_FLUX_DIR + AKENEO_ATTRS_FILE_PATH);

    FileUtils.createFileAndFolders(file);

    var fwHandle; // FileWriter;
    var xswHandle; // XMLIndentingStreamWriter;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(file);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);
        writeAkeneoAttributesHeader(xswHandle);
        akeneoAttributes.writeAkeneoAssetAttributes(xswHandle, assetCode, akeneoAttributesList);
        akeneoAttributes.writeAkeneoAssetAttributesGroupDefinitions(xswHandle, assetCode, akeneoAttributesList);
        writeAkeneoAttributesFooter(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML Attributes file : ' + e.stack + ' with Error: ' + e.message);
    } finally {
        if (xswHandle != null) {
            xswHandle.close();
        }
        if (fwHandle != null) {
            fwHandle.close();
        }
    }
};

/**
 * @desc generates an empty XML file at given path
 * @param {string} akeneoFluxPath - path to create file
 * @return {dw.util.ArrayList} - array list of file objects
 */
akeneoAttributes.generateDummyAttributeXml = function (akeneoFluxPath) {
    var filePath = akeneoFluxPath + File.SEPARATOR + 'system-objecttype-extensions.xml';
    var dummyFile = new File(filePath);
    FileUtils.createFileAndFolders(dummyFile);

    var fwHandle; // FileWriter;
    var xswHandle; // XMLIndentingStreamWriter;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(dummyFile);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);
        writeAkeneoAttributesHeader(xswHandle);
        writeAkeneoAttributesFooter(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML Attributes file : ' + e.stack + ' with Error: ' + e.message);
    } finally {
        if (xswHandle != null) {
            xswHandle.close();
        }
        if (fwHandle != null) {
            fwHandle.close();
        }
    }

    return new File(akeneoFluxPath).listFiles(function (file) {
        return !file.isDirectory();
    });
};

/**
 * @desc Finds matching option from list
 * @param {string} attributeOptions - attribute option
 * @param {string} attributeOptionCode - attribute option code
 * @returns {Object} - attribute option object
 */
function findOptionFromList(attributeOptions, attributeOptionCode) {
    if (attributeOptions) {
        for (var i = 0; i < attributeOptions.length; i++) {
            var attributeOption = attributeOptions[i];

            if (attributeOption.code === attributeOptionCode) {
                return attributeOption;
            }
        }
    }
    return null;
}

/**
 * @desc Fetches the attribute option from custom cache
 * @param {string} attributeCode - attribute code
 * @param {string} attributeOptionCode - attribute option code
 * @returns {Object} - attribute option object
 */
akeneoAttributes.getAttributeOption = function (attributeCode, attributeOptionCode) {
    var optionFileCount = customCacheMgr.getAttributeOptionFileCount(config.APIURL.endpoints.attributes + '/' + attributeCode);
    var attributeOptions;
    var attributeOption;

    if (optionFileCount === 0) {
        var akeneoAttribute = {
            code: attributeCode,
            type: 'pim_catalog_simpleselect'
        };
        var AkeneoAttributesService = akeneoService.getGeneralService();
        keepAttrOptionsInCache(akeneoAttribute, AkeneoAttributesService);
        return this.getAttributeOption(attributeCode, attributeOptionCode);
    } else if (optionFileCount > 1) {
        for (var i = 0; i < optionFileCount; i++) {
            attributeOptions = customCacheMgr.getCache(config.APIURL.endpoints.attributes + '/' + attributeCode + '/options' + (i > 0 ? i : ''));
            attributeOption = findOptionFromList(attributeOptions, attributeOptionCode);

            if (attributeOption) {
                break;
            }
        }
    } else {
        attributeOptions = customCacheMgr.getCache(config.APIURL.endpoints.attributes + '/' + attributeCode + '/options');
        attributeOption = findOptionFromList(attributeOptions, attributeOptionCode);
    }
    return attributeOption;
};

/* Exported functions */
module.exports = akeneoAttributes;
