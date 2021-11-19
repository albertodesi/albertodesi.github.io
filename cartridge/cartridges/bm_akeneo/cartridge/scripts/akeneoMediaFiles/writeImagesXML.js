'use strict';

/* eslint no-underscore-dangle: 0 */

var File = require('dw/io/File');
var HashSet = require('dw/util/HashSet');
var StringUtils = require('dw/util/StringUtils');
var libStringUtils = require('~/cartridge/scripts/utils/libStringUtilsExt');
var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var akeneoViewTypesConfig = config.imageViewTypes;
var akeneoViewTypeList = akeneoViewTypesConfig['view-types'] || [];
var akeneoLocales = customCacheWebdav.getCache(config.cacheDirectory.assetFamilies.locales) || [];

var writeImagesXML = {};

/**
 * @desc gets list of image paths
 * @param {Object} productValues - the product image values
 * @param {Array} imageCodeList - the list of image codes
 * @returns {Array} - the list of image paths
 */
function getImagePathList(productValues, imageCodeList) {
    var imagePathList = [];

    if (config.imageType === 'images' || config.imageType === 'both') {
        if (imageCodeList && imageCodeList.length > 0) {
            for (var idx = 0; idx < imageCodeList.length; idx++) {
                var imageAttr = imageCodeList[idx];

                if (Object.prototype.hasOwnProperty.call(productValues, imageAttr)) {
                    var imageAttrObject = productValues[imageAttr];
                    if (imageAttrObject) {
                        imagePathList.push(imageAttrObject[0].data);
                    }
                }
            }
        }
    }
    return imagePathList;
}

/**
 * @desc gets list of asset paths
 * @param {Object} productValues - the product image values
 * @param {Array} assetCodeList - the list of asset codes
 * @returns {Array} - the list of asset paths
 */
function getAssetPathList(productValues, assetCodeList) {
    var assetPathList = [];

    if (config.imageType === 'assets' || config.imageType === 'both') {
        var AKENEO_CATALOG_PATH = File.CATALOGS + File.SEPARATOR + config.sfccMasterCatalogID + File.SEPARATOR + 'default' + File.SEPARATOR;
        var AKENEO_CATALOG_ASSETS_DIR = AKENEO_CATALOG_PATH + 'Assets' + File.SEPARATOR;

        if (assetCodeList && assetCodeList.length > 0) {
            for (var i = 0; i < assetCodeList.length; i++) {
                var assetAttr = assetCodeList[i];
                if (Object.prototype.hasOwnProperty.call(productValues, assetAttr)) {
                    var productAssetList = productValues[assetAttr][0].data;

                    if (productAssetList && productAssetList.length > 0) {
                        for (var j = 0; j < productAssetList.length; j++) {
                            var asset = productAssetList[j];
                            var AKENEO_CATALOG_ASSET_UNIQUE_DIR = new File(AKENEO_CATALOG_ASSETS_DIR + asset);
                            var folderExists = AKENEO_CATALOG_ASSET_UNIQUE_DIR.isDirectory();

                            if (folderExists) {
                                var assetFilePath = 'Assets' + File.SEPARATOR + asset;          // Assets/sample_asset
                                var assetFileFullPath = AKENEO_CATALOG_PATH + assetFilePath;    // CATALOG/default/Assets/sample_asset
                                var ASSET_FULL_PATH_FILE = new File(assetFileFullPath);

                                while (ASSET_FULL_PATH_FILE.isDirectory()) {
                                    var NewFileList = ASSET_FULL_PATH_FILE.list();
                                    assetFilePath += File.SEPARATOR + NewFileList[0];
                                    assetFileFullPath = AKENEO_CATALOG_PATH + assetFilePath;
                                    ASSET_FULL_PATH_FILE = new File(assetFileFullPath);
                                }

                                if (ASSET_FULL_PATH_FILE.isFile()) {
                                    assetPathList.push(assetFilePath);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return assetPathList;
}

/**
 * @desc Puts image metadata values in an object
 * @param {Object} assetValues - The object containing asset values
 * @returns {Object} - Object with image metadata
 */
function getAssetMetadataObject(assetValues) {
    var assetObject = {};
    var imageMetadataMapping = config.imageMetadataMapping;
    var metaKeys = Object.keys(imageMetadataMapping.matching);

    for (var i = 0; i < metaKeys.length; i++) {
        var key = metaKeys[i];
        if (imageMetadataMapping.matching[key] in assetValues) {
            assetObject[key] = assetValues[imageMetadataMapping.matching[key]];
        }
    }
    return assetObject;
}

/**
 * @desc Pushes asset path object to list for media link type
 * @param {Array} assetObjectList - list of asset path objects
 * @param {Object} akeneoAsset - asset object
 * @returns {Array} - list of asset path objects
 */
function getMediaFileValues(assetObjectList, akeneoAsset) {
    var AKENEO_CATALOG_PATH = File.CATALOGS + File.SEPARATOR + config.sfccMasterCatalogID;
    var akeneoCatalogFile = new File(AKENEO_CATALOG_PATH);
    var akeneoCatalogLocales = akeneoCatalogFile.list();
    var existingViewTypes = [];

    for (var i = 0; i < akeneoCatalogLocales.length; i++) {
        var AKENEO_CATALOG_ASSET_UNIQUE_DIR_PATH = AKENEO_CATALOG_PATH + File.SEPARATOR + akeneoCatalogLocales[i] + File.SEPARATOR + 'Assets' + File.SEPARATOR + akeneoAsset.code;
        var AKENEO_CATALOG_ASSET_UNIQUE_DIR = new File(AKENEO_CATALOG_ASSET_UNIQUE_DIR_PATH);
        var folderExists = AKENEO_CATALOG_ASSET_UNIQUE_DIR.isDirectory();

        if (folderExists) {
            var assetFilePath = 'Assets' + File.SEPARATOR + akeneoAsset.code; // Assets/sample_asset
            var assetFileFullPath = AKENEO_CATALOG_ASSET_UNIQUE_DIR_PATH; // CATALOG/catalog_id/{locale}/Assets/sample_asset
            var ASSET_FULL_PATH_FILE = new File(assetFileFullPath);
            var viewTypesList = ASSET_FULL_PATH_FILE.list();

            for (var j = 0; j < viewTypesList.length; j++) {
                var viewType = viewTypesList[j];
                if (existingViewTypes.indexOf(viewType) === -1) {
                    var newAssetFilePath = assetFilePath + File.SEPARATOR + viewType; // Assets/sample_asset/{viewType}
                    var newAssetFileFullPath = assetFileFullPath + File.SEPARATOR + viewType; // CATALOG/catalog_id/{locale}/Assets/sample_asset/{viewType}
                    ASSET_FULL_PATH_FILE = new File(newAssetFileFullPath);

                    while (ASSET_FULL_PATH_FILE.isDirectory()) {
                        var newFileList = ASSET_FULL_PATH_FILE.list();
                        newAssetFilePath += File.SEPARATOR + newFileList[0];
                        newAssetFileFullPath += File.SEPARATOR + newFileList[0];
                        ASSET_FULL_PATH_FILE = new File(newAssetFileFullPath);
                    }

                    if (ASSET_FULL_PATH_FILE.isFile()) {
                        var assetObject = getAssetMetadataObject(akeneoAsset.values);
                        assetObject.path = newAssetFilePath;
                        assetObject.viewType = viewType;
                        assetObjectList.push(assetObject);
                        existingViewTypes.push(viewType);
                    }
                }
            }
        }
    }
    return assetObjectList;
}

/**
 * @desc Pushes asset path object to list for media link type
 * @param {Array} assetObjectList - list of asset path objects
 * @param {Oject} akeneoAsset - asset object
 * @returns {Array} - list of asset path objects
 */
function getMediaLinkValues(assetObjectList, akeneoAsset) {
    var externalImageLocation = config.externalImageLocation;
    var imageLinkViewTypesMapping = config.imageLinkViewTypesMapping.matching;
    var imageLinkViewTypesKeys = Object.keys(imageLinkViewTypesMapping);

    for (var i = 0; i < imageLinkViewTypesKeys.length; i++) {
        var imageLinkViewTypesKey = imageLinkViewTypesKeys[i];

        if (imageLinkViewTypesMapping[imageLinkViewTypesKey] in akeneoAsset.values) {
            for (var j = 0; j < akeneoAsset.values[imageLinkViewTypesMapping[imageLinkViewTypesKey]].length; j++) {
                var imageObject = akeneoAsset.values[imageLinkViewTypesMapping[imageLinkViewTypesKey]][j];

                if (generalUtils.checkScope(imageObject.channel)) {
                    var imageURL = imageObject.data;
                    var locale = imageObject.locale;

                    if (imageURL.indexOf(externalImageLocation) !== -1) {
                        var assetObject = getAssetMetadataObject(akeneoAsset.values);
                        assetObject.path = imageURL.substring(externalImageLocation.length);
                        assetObject.viewType = locale ? imageLinkViewTypesKey + '_' + locale.replace('_', '-') : imageLinkViewTypesKey;
                        assetObjectList.push(assetObject);
                    }
                }
            }
        }
    }
    return assetObjectList;
}

/**
 * @desc gets list of asset paths and metadata objects
 * @param {Object} productValues - the product image values
 * @param {Array} assetCodeList - the list of asset codes
 * @param {boolean} isModelProduct - whether the product is a model product
 * @param {string} productCode - code of product
 * @returns {Array} - the list of asset paths and metadata objects
 */
function getAssetValues(productValues, assetCodeList, isModelProduct, productCode) {
    var assetObjectList = [];
    var assetCustomAttrList = [];

    if ((config.imageType === 'assets' || config.imageType === 'both') && assetCodeList && assetCodeList.length) {
        for (var i = 0; i < assetCodeList.length; i++) {
            var assetAttr = assetCodeList[i];

            if (Object.prototype.hasOwnProperty.call(productValues, assetAttr)) {
                for (var j = 0; j < productValues[assetAttr].length; j++) {
                    if (generalUtils.checkScope(productValues[assetAttr][j].scope)) {
                        var productAssetList = productValues[assetAttr][j].data;

                        if (productAssetList && productAssetList.length) {
                            for (var k = 0; k < productAssetList.length; k++) {
                                var asset = productAssetList[k];
                                var assetProductRelation = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.assetProductRelation, asset)) || [];
                                if (!isModelProduct) {
                                    if (assetProductRelation.indexOf(productCode) === -1) {
                                        assetProductRelation.push(productCode);
                                    }
                                }
                                customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.assetFamilies.assetProductRelation, asset), assetProductRelation);

                                var akeneoAsset = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.assetFamilyAsset, asset));
                                if (!akeneoAsset) {
                                    throw new Error('ERROR: Asset definition for \'' + asset + '\' not found in system, please run job 2-2-Akeneo-Full-Import-Media-Assets-Pricebook to reinitialize cache.');
                                }
                                var akeneoAssetFamilyCode = akeneoAsset._links.self.href.match(/\/asset-families\/([\w\d_]+)\/assets\//)[1];
                                var akeneoAssetFamily = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.endPoint, akeneoAssetFamilyCode));
                                var attributeAsMainMedia = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeEndPoint, akeneoAssetFamilyCode, akeneoAssetFamily.attribute_as_main_media));

                                // Handle prefix and suffix at level family
                                if (attributeAsMainMedia.prefix && attributeAsMainMedia.prefix != null && attributeAsMainMedia.type === 'media_link' && attributeAsMainMedia.media_type === 'image') {
                                    var assetGroupFamily = akeneoAsset.values[attributeAsMainMedia.code];
                                    for (let index = 0; index < assetGroupFamily.length; index++) {
                                        var element = assetGroupFamily[index];
                                        var fullUrl = attributeAsMainMedia.prefix + element.data;
                                        fullUrl = (attributeAsMainMedia.suffix && attributeAsMainMedia.suffix !== null) ? fullUrl+attributeAsMainMedia.suffix : fullUrl;
                                        akeneoAsset.values[attributeAsMainMedia.code][index].data = fullUrl;
                                    }
                                }

                                if (config.imageImportType !== 'media_link' && attributeAsMainMedia.type === 'media_file' && attributeAsMainMedia.media_type === 'image') {
                                    assetObjectList = getMediaFileValues(assetObjectList, akeneoAsset);
                                } else if (config.imageImportType === 'media_link' && attributeAsMainMedia.type === 'media_link' && attributeAsMainMedia.media_type === 'image') {
                                    assetObjectList = getMediaLinkValues(assetObjectList, akeneoAsset);
                                } else if (config.imageImportType === 'both' && attributeAsMainMedia.type === 'media_link' && attributeAsMainMedia.media_type === 'image') {
                                    assetCustomAttrList.push({
                                        code: akeneoAsset.code,
                                        values: akeneoAsset.values,
                                        assetFamily: akeneoAssetFamily,
                                        isMediaFile: false
                                    });
                                } else if (attributeAsMainMedia.type === 'media_link' && (attributeAsMainMedia.media_type === 'youtube' || attributeAsMainMedia.media_type === 'vimeo' || attributeAsMainMedia.media_type === 'pdf' || attributeAsMainMedia.media_type === 'other')) {
                                    assetCustomAttrList.push({
                                        code: akeneoAsset.code,
                                        values: akeneoAsset.values,
                                        assetFamily: akeneoAssetFamily,
                                        isMediaFile: false
                                    });
                                } else if (attributeAsMainMedia.type === 'media_file' && (attributeAsMainMedia.media_type === 'pdf' || attributeAsMainMedia.media_type === 'other')) {
                                    assetCustomAttrList.push({
                                        code: akeneoAsset.code,
                                        values: akeneoAsset.values,
                                        assetFamily: akeneoAssetFamily,
                                        isMediaFile: true
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return {
        assetObjectList: assetObjectList,
        assetCustomAttrList: assetCustomAttrList
    };
}

/**
 * @desc Gets the image path list for variation products
 * @param {Object} masterProduct - the master product object
 * @param {Array} imageCodeList - the array of image codes
 * @param {Array} assetCodeList - the array of asset codes
 * @returns {Array} - the image path list for variation products
 */
function getVariationImageList(masterProduct, imageCodeList, assetCodeList) {
    var variantProductSet = masterProduct.variationProducts || [];
    var variationImageList = [];

    for (var i = 0; i < variantProductSet.length; i++) {
        var variant = variantProductSet[i];
        var variantImagePathList = getImagePathList(variant.mediaValues, imageCodeList);
        var variantAssetPathList = getAssetPathList(variant.mediaValues, assetCodeList);

        if (variantAssetPathList && variantAssetPathList.length > 0) {
            variantImagePathList = variantImagePathList.concat(variantAssetPathList);
        }

        if (variantImagePathList && variantImagePathList.length > 0) {
            variationImageList.push({
                imagePathList: variantImagePathList,
                variationValues: variant.values
            });
        }
    }

    return variationImageList;
}

/**
 * @desc Gets the first level variation values for model products
 * @param {Object} modelProductValues - complete set of model values
 * @param {Array} variantAttributeSets - the variant attributes set based on family variants
 * @returns {Object} - The first level variation values
 */
function getModelVariationValues(modelProductValues, variantAttributeSets) {
    var values = {};

    if (variantAttributeSets && variantAttributeSets.length > 0) {
        var firstLevelAxes = variantAttributeSets[0].axes;

        for (var i = 0; i < firstLevelAxes.length; i++) {
            var axe = firstLevelAxes[i];
            values[axe] = modelProductValues[axe];
        }
    }
    return values;
}

/**
 * @desc Gets the image path list for variation group products
 * @param {Object} masterProduct - the master product object
 * @param {Array} imageCodeList - the list of image codes
 * @param {Array} assetCodeList - the list of asset codes
 * @returns {Array} - the image path list for variation group products
 */
function getVariationGroupImageList(masterProduct, imageCodeList, assetCodeList) {
    var variationGroupImageList = [];
    var modelList = masterProduct.modelList;

    if (modelList && modelList.length) {
        for (var i = 0; i < modelList.length; i++) {
            var modelFileName = StringUtils.format(config.cacheDirectory.modelProducts.endPoint, config.sfccMasterCatalogID, modelList[i]);
            var modelProduct = customCacheWebdav.getCache(modelFileName);

            if (!modelProduct) {
                throw new Error('Could not locate cache files (' + modelList[i] + ') from storage. Please run imports without deleting caches');
            }
            var modelImagePathList = getImagePathList(modelProduct.values, imageCodeList);
            var modelAssetPathList = getAssetPathList(modelProduct.values, assetCodeList);

            if (modelAssetPathList && modelAssetPathList.length > 0) {
                modelImagePathList = modelImagePathList.concat(modelAssetPathList);
            }
            var modelVariationValues = getModelVariationValues(modelProduct.values, masterProduct.variantAttributeSets);
            if (modelImagePathList && modelImagePathList.length > 0) {
                variationGroupImageList.push({
                    imagePathList: modelImagePathList,
                    variationValues: modelVariationValues
                });
            }
        }
    }
    return variationGroupImageList;
}

/**
 * @desc Gets the image path list for variation products
 * @param {Object} masterProduct - the master product object
 * @param {Array} imageCodeList - the array of image codes
 * @param {Array} assetCodeList - the array of asset codes
 * @returns {Array} - the image path list for variation products
 */
function getVariationImageAssetList(masterProduct, imageCodeList, assetCodeList) {
    var variantProductSet = masterProduct.variationProducts || [];
    var variationImageList = [];

    for (var i = 0; i < variantProductSet.length; i++) {
        var variant = variantProductSet[i];
        var variantImagePathList = getImagePathList(variant.mediaValues, imageCodeList);
        var variantAssetValues = getAssetValues(variant.mediaValues, assetCodeList, false, variant.identifier);

        if (variantImagePathList.length || variantAssetValues.assetObjectList.length || variantAssetValues.assetCustomAttrList.length) {
            variationImageList.push({
                productID: variant.identifier,
                imagePathList: variantImagePathList,
                variationValues: variant.values,
                assetObjectList: variantAssetValues.assetObjectList,
                assetCustomAttrList: variantAssetValues.assetCustomAttrList
            });
        }
    }

    return variationImageList;
}

/**
 * @desc Gets the image path list for variation group products
 * @param {Object} masterProduct - the master product object
 * @param {Array} imageCodeList - the array of image codes
 * @param {Array} assetCodeList - the array of asset codes
 * @returns {Array} - the image path list for variation group products
 */
function getVariationGroupImageAssetList(masterProduct, imageCodeList, assetCodeList) {
    var variationGroupImageList = [];
    var modelList = masterProduct.modelList;

    if (modelList && modelList.length) {
        for (var i = 0; i < modelList.length; i++) {
            var modelFileName = StringUtils.format(config.cacheDirectory.modelProducts.endPoint, config.sfccMasterCatalogID, modelList[i]);
            var modelProduct = customCacheWebdav.getCache(modelFileName);

            if (!modelProduct) {
                throw new Error('Could not locate cache files (' + modelList[i] + ') from storage. Please run imports without deleting caches');
            }
            var modelImagePathList = getImagePathList(modelProduct.values, imageCodeList);
            var modelAssetValues = getAssetValues(modelProduct.values, assetCodeList, true, modelProduct.code);
            var modelVariationValues = getModelVariationValues(modelProduct.values, masterProduct.variantAttributeSets);

            if (modelImagePathList.length || modelAssetValues.assetObjectList.length || modelAssetValues.assetCustomAttrList.length) {
                variationGroupImageList.push({
                    productID: modelProduct.code,
                    imagePathList: modelImagePathList,
                    variationValues: modelVariationValues,
                    assetObjectList: modelAssetValues.assetObjectList,
                    assetCustomAttrList: modelAssetValues.assetCustomAttrList
                });
            }
        }
    }
    return variationGroupImageList;
}

/**
 * @desc Writes XML tags for image path lists
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Array} imagePathList - The array of image paths
 * @returns {void}
 */
function writeImagePathList(xswHandle, imagePathList) {
    for (var i = 0; i < imagePathList.length; i++) {
        var imagePath = imagePathList[i];
        xswHandle.writeEmptyElement('image');
        xswHandle.writeAttribute('path', imagePath);
    }
}

/**
 * @desc Write XML tags for asset object lists
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Array} assetObjectList - The array of asset objects
 * @param {string} viewType - The view-type for the list of asset objects
 * @returns {void}
 */
function writeAssetObjectList(xswHandle, assetObjectList, viewType) {
    for (var i = 0; i < assetObjectList.length; i++) {
        var assetObject = assetObjectList[i];

        if (!assetObject.viewType || assetObject.viewType === viewType) {
            xswHandle.writeStartElement('image');
            xswHandle.writeAttribute('path', assetObject.path);
            var assetObjectKeys = Object.keys(assetObject);

            for (var j = 0; j < assetObjectKeys.length; j++) {
                var key = assetObjectKeys[j];
                if (!(key === 'path' || key === 'viewType')) {
                    var values = assetObject[key];

                    for (var k = 0; k < values.length; k++) {
                        var value = values[k];

                        if (generalUtils.checkScope(value.channel)) {
                            xswHandle.writeStartElement(key);

                            if (value.locale) {
                                xswHandle.writeAttribute('xml:lang', value.locale.replace('_', '-'));
                            }
                            xswHandle.writeCharacters(value.data);
                            xswHandle.writeEndElement();
                        }
                    }
                }
            }
            xswHandle.writeEndElement(); // image
        }
    }
}

/**
 * @desc Writes a single custom asset attribute
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} assetCode - asset code
 * @param {string} attrKey - attribute key
 * @param {string|array} data - data to be written
 * @param {string|undefined} locale - locale
 * @param {boolean} isMainMediaFile - is media_file type asset attributes of file type
 */
function writeSingleAttribute(xswHandle, assetCode, attrKey, data, locale, isMainMediaFile) {
    xswHandle.writeStartElement('custom-attribute');
    xswHandle.writeAttribute('attribute-id', 'akeneo_' + libStringUtils.camelize(assetCode) + '_' + libStringUtils.camelize(attrKey));

    if (locale) {
        xswHandle.writeAttribute('xml:lang', locale.replace('_', '-'));
    }
    if (isMainMediaFile) {
        xswHandle.writeCharacters('Assets' + File.SEPARATOR + assetCode + File.SEPARATOR + data + '?$staticlink$');
    } else if (typeof data === 'object' && data.length) {
        for (var i = 0; i < data.length; i++) {
            generalUtils.writeElement(xswHandle, 'value', data[i]);
        }
    } else {
        xswHandle.writeCharacters(data);
    }
    xswHandle.writeEndElement(); // custom-attribute
}

/**
 * @desc writes custom attribute tags for image values
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Array} assetCustomAttrList - list of custom attributes objects
 */
function writeAssetCustomAttributes(xswHandle, assetCustomAttrList) {
    for (var i = 0; i < assetCustomAttrList.length; i++) {
        var assetCode = assetCustomAttrList[i].code;
        var assetFamily = assetCustomAttrList[i].assetFamily.code;
        var attributeAsMainMedia = assetCustomAttrList[i].assetFamily.attribute_as_main_media;
        var isMediaFile = assetCustomAttrList[i].isMediaFile;
        var attrValues = assetCustomAttrList[i].values;
        var attrKeys = Object.keys(attrValues);

        for (var j = 0; j < attrKeys.length; j++) {
            var attrKey = attrKeys[j];
            var attribute;
            var attributesList = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeBaseLocation, assetFamily));
            for (var k = 0; k < attributesList.length; k++) {
                if (attrKey === attributesList[k].code) {
                    attribute = attributesList[k];
                    break;
                }
            }
            var attrValue = attrValues[attrKey];

            for (var l = 0; l < attrValue.length; l++) {
                var value = attrValue[l];

                if (generalUtils.checkScope(value.channel)) {
                    if (attribute && (attribute.type === 'multiple_options' || attribute.type === 'single_option') && !value.locale) {
                        var idx;
                        var locales = new HashSet();
                        var attrOptions = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.assetFamilies.attributeEndPoint, assetFamily, attrKey) + '/options');

                        for (idx = 0; idx < attrOptions.length; idx++) {
                            if (value.data.indexOf(attrOptions[idx].code) !== -1) {
                                locales.add(Object.keys(attrOptions[idx].labels));
                            }
                        }
                        locales = locales.toArray();
                        for (idx = 0; idx < locales.length; idx++) {
                            writeSingleAttribute(xswHandle, assetCode, attrKey, value.data, locales[idx], isMediaFile && attrKey === attributeAsMainMedia);
                        }
                    } else {
                        writeSingleAttribute(xswHandle, assetCode, attrKey, value.data, value.locale, isMediaFile && attrKey === attributeAsMainMedia);
                    }
                }
            }
        }
    }
}

/**
 * @desc Writes variation values for image groups
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Object} variationValues - the object containing variation values
 */
function writeImageVariationValues(xswHandle, variationValues) {
    var stringUtilsExt = require('~/cartridge/scripts/utils/libStringUtilsExt');
    var customAttrsMapping = config.customAttrsMapping;

    Object.keys(variationValues).forEach(function (key) {
        var attributeKey = 'akeneo_' + stringUtilsExt.camelize(key);
        var attributeValue = variationValues[key][0].data;

        if (typeof attributeValue === 'object') {
            if (attributeValue.amount && attributeValue.unit) {
                attributeValue = attributeValue.amount + ' ' + attributeValue.unit;
            } else if (attributeValue.amount && attributeValue.currency) {
                attributeValue = attributeValue.amount + ' ' + attributeValue.currency;
            }
        }
        if (attributeKey in customAttrsMapping.matching) {
            attributeKey = customAttrsMapping.matching[attributeKey];
        }
        xswHandle.writeEmptyElement('variation');
        xswHandle.writeAttribute('attribute-id', attributeKey);
        xswHandle.writeAttribute('value', attributeValue);
    });
}

/**
 * @desc Writes XML image tags
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} masterProductID - master product code
 * @param {Array} masterImages - The array of master image paths
 * @param {Array} variationImages - The list of variation image paths
 * @param {Array} variationGroupImages - The list of variation group image paths
 */
function writeMasterImageXML(xswHandle, masterProductID, masterImages, variationImages, variationGroupImages) {
    if (akeneoViewTypeList.length && (masterImages.length || variationImages.length || (variationGroupImages && variationGroupImages.length))) {
        xswHandle.writeStartElement('product');
        xswHandle.writeAttribute('product-id', masterProductID);
        xswHandle.writeStartElement('images');

        for (var i = 0; i < akeneoViewTypeList.length; i++) {
            var viewType = akeneoViewTypeList[i];

            xswHandle.writeStartElement('image-group');
            xswHandle.writeAttribute('view-type', viewType);

            writeImagePathList(xswHandle, masterImages);

            xswHandle.writeEndElement(); // image-group

            if (variationGroupImages && variationGroupImages.length) {
                for (var idx = 0; idx < variationGroupImages.length; idx++) {
                    var variationGroupImage = variationGroupImages[idx];
                    xswHandle.writeStartElement('image-group');
                    xswHandle.writeAttribute('view-type', viewType);

                    writeImageVariationValues(xswHandle, variationGroupImage.variationValues);
                    writeImagePathList(xswHandle, variationGroupImage.imagePathList);

                    xswHandle.writeEndElement(); // image-group
                }
            }

            for (var j = 0; j < variationImages.length; j++) {
                var variationImage = variationImages[j];
                xswHandle.writeStartElement('image-group');
                xswHandle.writeAttribute('view-type', viewType);

                writeImageVariationValues(xswHandle, variationImage.variationValues);
                writeImagePathList(xswHandle, variationImage.imagePathList);

                xswHandle.writeEndElement(); // image-group
            }
        }
        xswHandle.writeEndElement(); // images
        xswHandle.writeEndElement(); // product
    }
}

/**
 * @desc Writes XML image tags
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} masterProductID - master product code
 * @param {Array} masterImages - The array of master image paths
 * @param {Array} masterAssets - The array of master asset paths
 * @param {Array} variationImages - The array of variation image paths
 * @param {Array} variationGroupImages - The array of variation group image paths
 */
function writeNewAssetMasterImageXML(xswHandle, masterProductID, masterImages, masterAssets, variationImages, variationGroupImages) {
    var akeneoViewTypes = akeneoViewTypeList.slice();
    if (config.imageImportType === 'media_link' && akeneoLocales && akeneoLocales.length) {
        akeneoLocales.forEach(function (locale) {
            for (var idx = 0; idx < akeneoViewTypeList.length; idx++) {
                akeneoViewTypes.push(akeneoViewTypeList[idx] + '_' + locale.replace('_', '-'));
            }
        });
    }
    var masterAssetObjectList = masterAssets.assetObjectList;
    var masterAssetCustomAttrList = masterAssets.assetCustomAttrList;

    if ((akeneoViewTypes.length && (masterImages.length || masterAssetObjectList.length)) || masterAssetCustomAttrList.length || variationImages.length || (variationGroupImages && variationGroupImages.length)) {
        xswHandle.writeStartElement('product');
        xswHandle.writeAttribute('product-id', masterProductID);
        xswHandle.writeStartElement('images');

        for (var i = 0; i < akeneoViewTypes.length; i++) {
            var viewType = akeneoViewTypes[i];

            xswHandle.writeStartElement('image-group');
            xswHandle.writeAttribute('view-type', viewType);

            writeImagePathList(xswHandle, masterImages);
            writeAssetObjectList(xswHandle, masterAssets, viewType);

            xswHandle.writeEndElement(); // image-group

            if (variationGroupImages && variationGroupImages.length) {
                for (var idx = 0; idx < variationGroupImages.length; idx++) {
                    var variationGroupObject = variationGroupImages[idx];
                    xswHandle.writeStartElement('image-group');
                    xswHandle.writeAttribute('view-type', viewType);

                    writeImageVariationValues(xswHandle, variationGroupObject.variationValues);
                    writeImagePathList(xswHandle, variationGroupObject.imagePathList);
                    writeAssetObjectList(xswHandle, variationGroupObject.assetObjectList, viewType);

                    xswHandle.writeEndElement(); // image-group
                }
            }

            for (var j = 0; j < variationImages.length; j++) {
                var variationObject = variationImages[j];
                xswHandle.writeStartElement('image-group');
                xswHandle.writeAttribute('view-type', viewType);

                writeImageVariationValues(xswHandle, variationObject.variationValues);
                writeImagePathList(xswHandle, variationObject.imagePathList);
                writeAssetObjectList(xswHandle, variationObject.assetObjectList, viewType);

                xswHandle.writeEndElement(); // image-group
            }
        }
        xswHandle.writeEndElement(); // images

        if (masterAssetCustomAttrList.length) {
            xswHandle.writeStartElement('custom-attributes');
            writeAssetCustomAttributes(xswHandle, masterAssetCustomAttrList);
            xswHandle.writeEndElement(); // custom-attributes
        }
        xswHandle.writeEndElement(); // product

        if (variationGroupImages && variationGroupImages.length) {
            for (var l = 0; l < variationGroupImages.length; l++) {
                var variantGroupObject = variationGroupImages[l];

                if (variantGroupObject.assetCustomAttrList.length) {
                    xswHandle.writeStartElement('product');
                    xswHandle.writeAttribute('product-id', variantGroupObject.productID);
                    xswHandle.writeStartElement('custom-attributes');
                    writeAssetCustomAttributes(xswHandle, variantGroupObject.assetCustomAttrList);
                    xswHandle.writeEndElement(); // custom-attributes
                    xswHandle.writeEndElement(); // product
                }
            }
        }

        for (var k = 0; k < variationImages.length; k++) {
            var variantObject = variationImages[k];

            if (variantObject.assetCustomAttrList.length) {
                xswHandle.writeStartElement('product');
                xswHandle.writeAttribute('product-id', variantObject.productID);
                xswHandle.writeStartElement('custom-attributes');
                writeAssetCustomAttributes(xswHandle, variantObject.assetCustomAttrList);
                xswHandle.writeEndElement(); // custom-attributes
                xswHandle.writeEndElement(); // product
            }
        }
    }
}

/**
 * @desc Creates image XML for products
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} productID - the product identifier
 * @param {Array} imagePathList - list of image paths
 * @returns {void}
 */
function writeProductImageXML(xswHandle, productID, imagePathList) {
    if (akeneoViewTypeList.length && imagePathList.length) {
        xswHandle.writeStartElement('product');
        xswHandle.writeAttribute('product-id', productID);
        xswHandle.writeStartElement('images');

        for (var i = 0; i < akeneoViewTypeList.length; i++) {
            var viewType = akeneoViewTypeList[i];
            xswHandle.writeStartElement('image-group');
            xswHandle.writeAttribute('view-type', viewType);

            writeImagePathList(xswHandle, imagePathList);

            xswHandle.writeEndElement(); // image-group
        }
        xswHandle.writeEndElement(); // images
        xswHandle.writeEndElement(); // product
    }
}

/**
 * @desc Creates image XML for products
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} productID - the product identifier
 * @param {Array} imagePathList - list of image paths
 * @param {Object} assetValues - object containing list of asset paths and list of custom attributes
 * @returns {void}
 */
function writeNewAssetProductImageXML(xswHandle, productID, imagePathList, assetValues) {
    var akeneoViewTypes = akeneoViewTypeList.slice();
    if (config.imageImportType === 'media_link' && akeneoLocales && akeneoLocales.length) {
        akeneoLocales.forEach(function (locale) {
            for (var idx = 0; idx < akeneoViewTypeList.length; idx++) {
                akeneoViewTypes.push(akeneoViewTypeList[idx] + '_' + locale.replace('_', '-'));
            }
        });
    }
    var assetObjectList = assetValues.assetObjectList;
    var assetCustomAttrList = assetValues.assetCustomAttrList;

    if ((akeneoViewTypes.length && (imagePathList.length || assetObjectList.length)) || assetCustomAttrList.length) {
        xswHandle.writeStartElement('product');
        xswHandle.writeAttribute('product-id', productID);

        if (akeneoViewTypes.length && (imagePathList.length || assetObjectList.length)) {
            xswHandle.writeStartElement('images');

            for (var i = 0; i < akeneoViewTypes.length; i++) {
                var viewType = akeneoViewTypes[i];
                xswHandle.writeStartElement('image-group');
                xswHandle.writeAttribute('view-type', viewType);

                writeImagePathList(xswHandle, imagePathList);
                writeAssetObjectList(xswHandle, assetObjectList, viewType);

                xswHandle.writeEndElement(); // image-group
            }

            xswHandle.writeEndElement(); // images
        }
        if (assetCustomAttrList.length) {
            xswHandle.writeStartElement('custom-attributes');
            writeAssetCustomAttributes(xswHandle, assetCustomAttrList);
            xswHandle.writeEndElement(); // custom-attributes
        }
        xswHandle.writeEndElement(); // product
    }
}

/**
 * @desc Creates image XML for master products
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Object} masterProduct - the master product object
 * @param {Array} imageCodeList - list of image codes
 * @param {Array} assetCodeList - list of asset codes
 * @returns {void}
 */
writeImagesXML.createMasterImageXML = function (xswHandle, masterProduct, imageCodeList, assetCodeList) {
    var masterImagePathList = getImagePathList(masterProduct.values, imageCodeList);
    var variationGroupImageList;
    var variationImageList;

    if (config.assetSystemVersion === 'old') {
        var masterAssetPathList = getAssetPathList(masterProduct.values, assetCodeList);

        if (masterAssetPathList && masterAssetPathList.length) {
            masterImagePathList = masterImagePathList.concat(masterAssetPathList);
        }
        if (config.modelImport.type === 'master-group-variation') {
            variationGroupImageList = getVariationGroupImageList(masterProduct, imageCodeList, assetCodeList);
        }
        variationImageList = getVariationImageList(masterProduct, imageCodeList, assetCodeList);

        writeMasterImageXML(xswHandle, masterProduct.code, masterImagePathList, variationImageList, variationGroupImageList);
    } else {
        var masterAssetValues = getAssetValues(masterProduct.values, assetCodeList, true, masterProduct.code);
        if (config.modelImport.type === 'master-group-variation') {
            variationGroupImageList = getVariationGroupImageAssetList(masterProduct, imageCodeList, assetCodeList);
        }
        variationImageList = getVariationImageAssetList(masterProduct, imageCodeList, assetCodeList);
        writeNewAssetMasterImageXML(xswHandle, masterProduct.code, masterImagePathList, masterAssetValues, variationImageList, variationGroupImageList);
    }
};

/**
 * @desc Creates image XML for simple products
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Object} akeneoProduct - the product object
 * @param {Array} imageCodeList - list of image codes
 * @param {Array} assetCodeList - list of asset codes
 * @returns {void}
 */
writeImagesXML.createProductImageXML = function (xswHandle, akeneoProduct, imageCodeList, assetCodeList) {
    var imagePathList = getImagePathList(akeneoProduct.values, imageCodeList);

    if (config.assetSystemVersion === 'old') {
        var assetPathList = getAssetPathList(akeneoProduct.values, assetCodeList);

        if (assetPathList && assetPathList.length) {
            imagePathList = imagePathList.concat(assetPathList);
        }
        writeProductImageXML(xswHandle, akeneoProduct.identifier, imagePathList);
    } else {
        var assetValues = getAssetValues(akeneoProduct.values, assetCodeList, false, akeneoProduct.identifier);
        writeNewAssetProductImageXML(xswHandle, akeneoProduct.identifier, imagePathList, assetValues);
    }
};

/* Exported functions */
module.exports = writeImagesXML;
