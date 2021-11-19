'use strict';

var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;

var akeneoCreateCatalogXML = {};

/**
 * @desc Gets the product categories that were unassigned
 * @param {Object} akeneoProduct - the product to delete categories from
 * @returns {Array} - array of unassigned categories
 */
function getUnassignedCategories(akeneoProduct) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var productID = akeneoProduct.code ? akeneoProduct.code : akeneoProduct.identifier;
    var product = ProductMgr.getProduct(productID);
    var categoryList = [];

    if (product) {
        var catAssignments = product.getCategoryAssignments();
        var catIterator = catAssignments.iterator();

        while (catIterator.hasNext()) {
            var catAssignment = catIterator.next();
            if (akeneoProduct.categories.indexOf(catAssignment.category.ID) === -1) {
                categoryList.push(catAssignment.category.ID);
            }
        }
    }
    return categoryList;
}

/**
 * @desc writes product link XML
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - the xml writer
 * @param {string} targetID - the target product link product
 * @param {string} productLinkType - the type of product link
 * @returns {void}
 */
function writeProductLink(xswHandle, targetID, productLinkType) {
    if (typeof targetID === 'string') {
        xswHandle.writeEmptyElement('product-link');
        xswHandle.writeAttribute('product-id', targetID);
        xswHandle.writeAttribute('type', productLinkType);
    }
}

/**
 * @desc writes product recommendation XML
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - the xml writer
 * @param {string} sourceID - the source product ID
 * @param {string} targetID - the target product recommendation product
 * @param {string} recommendationType - the type of product recommendation
 * @returns {void}
 */
function writeRecommendationProducts(xswHandle, sourceID, targetID, recommendationType) {
    if (typeof targetID === 'string') {
        xswHandle.writeEmptyElement('recommendation');
        xswHandle.writeAttribute('source-id', sourceID);
        xswHandle.writeAttribute('source-type', 'product');
        xswHandle.writeAttribute('target-id', targetID);
        xswHandle.writeAttribute('type', recommendationType);
    }
}

/**
 * @desc writes category XML
 * @param {Object} akeneoCategory - the category object
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - the xml writer
 * @returns {void}
 */
function generateCategoryTag(akeneoCategory, xswHandle) {
    var storefrontCatalogID = CatalogMgr.getSiteCatalog() != null ? CatalogMgr.getSiteCatalog().ID : config.topLevelCategoryID;
    var akeneoMainCatalogs = config.akeneoMainCatalogs;
    var topLevelCategoryID = config.topLevelCategoryID;
    var akeneoCategoryOnline = config.akeneoCategoryOnline;

    if (akeneoCategory && akeneoCategory.code !== topLevelCategoryID) {
        xswHandle.writeStartElement('category');
        xswHandle.writeAttribute('category-id', akeneoCategory.code);

        var defaultLocale = Site.current.defaultLocale;

        if (defaultLocale === 'default' || !akeneoCategory.labels[defaultLocale]) {
            var keys = Object.keys(akeneoCategory.labels);
            var key = keys[0];
            if (key) {
                generalUtils.writeElement(xswHandle, 'display-name', akeneoCategory.labels[key], 'xml:lang', 'x-default');
            }
        } else {
            generalUtils.writeElement(xswHandle, 'display-name', akeneoCategory.labels[defaultLocale], 'xml:lang', 'x-default');
        }

        // write localized display name
        Object.keys(akeneoCategory.labels).forEach(function (locale) {
            var localizedValue = akeneoCategory.labels[locale];
            if (localizedValue) {
                generalUtils.writeElement(xswHandle, 'display-name', localizedValue, 'xml:lang', locale.replace('_', '-'));
            }
        });

        if (akeneoCategoryOnline) {
            generalUtils.writeElement(xswHandle, 'online-flag', true);
        } else {
            generalUtils.writeElement(xswHandle, 'online-flag', false);
        }

        if (!akeneoCategory.parent || akeneoCategory.parent === topLevelCategoryID || akeneoMainCatalogs.indexOf(akeneoCategory.parent) !== -1) {
            generalUtils.writeElement(xswHandle, 'parent', 'root');
        } else {
            generalUtils.writeElement(xswHandle, 'parent', akeneoCategory.parent);
        }

        xswHandle.writeStartElement('custom-attributes');

        if (akeneoCategoryOnline) {
            generalUtils.writeElement(xswHandle, 'custom-attribute', 'true', 'attribute-id', 'showInMenu');
        }

        // close xml custom-attributes
        xswHandle.writeEndElement();

        var refinements = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.categoryRefinements.endPoint, storefrontCatalogID, akeneoCategory.code), 'XML');
        if (refinements) {
            xswHandle.writeRaw(refinements);
        }
        // close xml category
        xswHandle.writeEndElement();
    }
}

/**
 * @desc writes beginning and header of XML document
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml writer
 * @param {string} storefrontCatalogID - the ID of catalog to write
 * @returns {void}
 */
function writeAkeneoCatalogHeader(xswHandle, storefrontCatalogID) {
    var imageViewTypes = config.imageViewTypes;
    var akeneoLocales = customCacheWebdav.getCache(config.cacheDirectory.assetFamilies.locales) || [];

    // XML definition & first node
    xswHandle.writeStartDocument('UTF-8', '1.0');
    xswHandle.writeStartElement('catalog');
    xswHandle.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/catalog/2006-10-31');
    xswHandle.writeAttribute('catalog-id', storefrontCatalogID);

    if (config.imageType) {
        xswHandle.writeStartElement('header');
        xswHandle.writeStartElement('image-settings');

        if (config.imageImportType !== 'media_link') {
            generalUtils.writeElement(xswHandle, 'internal-location', '', 'base-path', '/');
        } else {
            xswHandle.writeStartElement('external-location');
            var externalLocation = config.externalImageLocation;

            if (externalLocation.indexOf('https://') !== -1) {
                generalUtils.writeElement(xswHandle, 'http-url', externalLocation.replace('https://', 'http://'));
                generalUtils.writeElement(xswHandle, 'https-url', externalLocation);
            } else if (externalLocation.indexOf('http://') !== -1) {
                generalUtils.writeElement(xswHandle, 'http-url', externalLocation);
                generalUtils.writeElement(xswHandle, 'https-url', externalLocation.replace('http://', 'https://'));
            }
            xswHandle.writeEndElement(); // external-location
        }

        if (!imageViewTypes['view-types']) {
            throw new Error('ERROR! Required site preference "akeneoViewTypesConfig" is empty.');
        }
        if (imageViewTypes && imageViewTypes['view-types'].length > 0) {
            xswHandle.writeStartElement('view-types');

            for (var i = 0; i < imageViewTypes['view-types'].length; i++) {
                var viewType = imageViewTypes['view-types'][i];
                generalUtils.writeElement(xswHandle, 'view-type', viewType);

                if (config.imageImportType === 'media_link' && akeneoLocales && akeneoLocales.length) {
                    for (var j = 0; j < akeneoLocales.length; j++) {
                        var locale = akeneoLocales[j];
                        generalUtils.writeElement(xswHandle, 'view-type', viewType + '_' + locale.replace('_', '-'));
                    }
                }
            }

            // close xml view-types
            xswHandle.writeEndElement();
        }

        generalUtils.writeElement(xswHandle, 'alt-pattern', '${productname}');
        generalUtils.writeElement(xswHandle, 'title-pattern', '${productname}');

        // close xml image-settings
        xswHandle.writeEndElement();
        // close xml header
        xswHandle.writeEndElement();
    }
    xswHandle.writeStartElement('category');
    xswHandle.writeAttribute('category-id', 'root');

    generalUtils.writeElement(xswHandle, 'display-name', storefrontCatalogID, 'xml:lang', 'x-default');
    generalUtils.writeElement(xswHandle, 'online-flag', 'true');

    var refinements = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.categoryRefinements.endPoint, storefrontCatalogID, 'root'), 'XML');

    if (refinements) {
        xswHandle.writeRaw(refinements);
    } else {
        xswHandle.writeStartElement('refinement-definitions');
        xswHandle.writeStartElement('refinement-definition');
        xswHandle.writeAttribute('type', 'category');
        xswHandle.writeAttribute('bucket-type', 'none');

        generalUtils.writeElement(xswHandle, 'display-name', 'Category', 'xml:lang', 'x-default');
        generalUtils.writeElement(xswHandle, 'sort-mode', 'category-position');
        generalUtils.writeElement(xswHandle, 'cutoff-threshold', '5');

        // close xml refinement-definition
        xswHandle.writeEndElement();

        // close xml refinement-definitions
        xswHandle.writeEndElement();
    }

    // close xml root catalog
    xswHandle.writeEndElement();
}

/**
 * @desc writes end of XML document
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml writer
 * @returns {void}
 */
function writeAkeneoCatalogFooter(xswHandle) {
    // XML definition & close first node
    xswHandle.writeEndElement();
    xswHandle.writeEndDocument();
    xswHandle.flush();
}

/**
 * @desc creates catalog header xml
 * @param {number} index - the index of the file name
 * @param {string} fileName - the part of file name to describe its contents
 * @returns {Object} - XML and file writer object
 */
akeneoCreateCatalogXML.createCatalogHeaderXML = function (index, fileName) {
    var File = require('dw/io/File');
    var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
    var FileWriter = require('dw/io/FileWriter');
    var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
    var Calendar = require('dw/util/Calendar');
    var storefrontCatalogID;

    if (fileName.indexOf('product-links') === -1) {
        storefrontCatalogID = CatalogMgr.getSiteCatalog() != null ? CatalogMgr.getSiteCatalog().ID : config.topLevelCategoryID;
    } else {
        storefrontCatalogID = config.sfccMasterCatalogID;
    }

    var AKENEO_CATALOG_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'catalog' + File.SEPARATOR;
    var AKENEO_CATALOG_FILE_PATH = 'catalog-akeneo-' + index + '-' + fileName + '-' + storefrontCatalogID + '-' + StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmss') + '.xml';
    var file = new File(AKENEO_CATALOG_FLUX_DIR + AKENEO_CATALOG_FILE_PATH);
    FileUtils.createFileAndFolders(file);

    var fwHandle = new FileWriter(file);
    var xswHandle = new XMLIndentingStreamWriter(fwHandle);

    try {
        writeAkeneoCatalogHeader(xswHandle, storefrontCatalogID);
    } catch (e) {
        throw new Error('ERROR : While writing XML Catalog file : ' + e.stack + ' with Error: ' + e.message);
    }

    return {
        fwHandle: fwHandle,
        xswHandle: xswHandle
    };
};

/**
 * @desc creates catalog footer xml
 * @param {Object} catalogWriter - Category XML writer
 */
akeneoCreateCatalogXML.createCatalogFooterXML = function (catalogWriter) {
    var xswHandle = catalogWriter.xswHandle;
    var fwHandle = catalogWriter.fwHandle;

    try {
        writeAkeneoCatalogFooter(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML Catalog file : ' + e.stack + ' with Error: ' + e.message);
    }

    if (xswHandle != null) {
        xswHandle.close();
    }
    if (fwHandle != null) {
        fwHandle.close();
    }
};

/**
 * @desc creates catalog category xml
 * @param {dw.util.List} akeneoCategories - List of categories
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml writer
 */
akeneoCreateCatalogXML.createCatalogCategoryXML = function (akeneoCategories, xswHandle) {
    var topLevelCategoryID = config.topLevelCategoryID;
    var categoriesIterator = akeneoCategories.iterator();
    var akeneoCategoryTree = [];
    var categoryCustomObjectID = config.customObjectType.TopLevelCategoriesCodes;
    var categoryCustomObject;

    if (topLevelCategoryID) {
        categoryCustomObject = CustomObjectMgr.getCustomObject(categoryCustomObjectID, categoryCustomObjectID);

        if (categoryCustomObject) {
            akeneoCategoryTree = JSON.parse(categoryCustomObject.custom.subCategoriesCodes || '[]');
        }
    }

    while (categoriesIterator.hasNext()) {
        var akeneoCategory = categoriesIterator.next();

        if (topLevelCategoryID) {
            if (akeneoCategoryTree.indexOf(akeneoCategory.parent) !== -1 || akeneoCategory.parent === topLevelCategoryID) {
                generateCategoryTag(akeneoCategory, xswHandle);
                akeneoCategoryTree.push(akeneoCategory.code);
            }
        } else {
            generateCategoryTag(akeneoCategory, xswHandle);
        }
    }

    if (topLevelCategoryID) {
        if (categoryCustomObject) {
            Transaction.begin();
            categoryCustomObject.custom.subCategoriesCodes = JSON.stringify(akeneoCategoryTree);
            Transaction.commit();
        } else {
            Transaction.begin();
            categoryCustomObject = CustomObjectMgr.createCustomObject(categoryCustomObjectID, categoryCustomObjectID);
            categoryCustomObject.custom.subCategoriesCodes = JSON.stringify(akeneoCategoryTree);
            Transaction.commit();
        }
    }
};

/**
 * @desc creates catalog category xml
 * @param {Object} akeneoProduct - product object
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml writer
 */
akeneoCreateCatalogXML.createCatalogRecommendationsXML = function (akeneoProduct, xswHandle) {
    var recommendationsMapping = config.recommendationsMapping.matching || {};
    var sourceID = akeneoProduct.code ? akeneoProduct.code : akeneoProduct.identifier;

    Object.keys(akeneoProduct.associations).forEach(function (associationType) {
        if (associationType in recommendationsMapping) {
            var recommendationType = recommendationsMapping[associationType];
            var association = akeneoProduct.associations[associationType];
            var targetID;

            for (var i = 0; i < association.products.length; i++) {
                targetID = association.products[i];

                if (typeof targetID === 'string') {
                    writeRecommendationProducts(xswHandle, sourceID, targetID, recommendationType);
                } else if (typeof targetID === 'object') {
                    for (var j = 0; j < targetID.length; j++) {
                        writeRecommendationProducts(xswHandle, sourceID, targetID[j], recommendationType);
                    }
                }
            }

            for (var k = 0; k < association.product_models.length; k++) {
                targetID = association.product_models[k];

                if (typeof targetID === 'string') {
                    writeRecommendationProducts(xswHandle, sourceID, targetID, recommendationType);
                } else if (typeof targetID === 'object') {
                    for (var l = 0; l < targetID.length; l++) {
                        writeRecommendationProducts(xswHandle, sourceID, targetID[l], recommendationType);
                    }
                }
            }
        }
    });
};

/**
 * @desc creates catalog product link xml
 * @param {Object} akeneoProduct - product object
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml writer
 */
akeneoCreateCatalogXML.createCatalogProductLinkXML = function (akeneoProduct, xswHandle) {
    var productLinkMapping = config.productLinkMapping.matching || {};
    var sourceID = akeneoProduct.code ? akeneoProduct.code : akeneoProduct.identifier;

    xswHandle.writeStartElement('product');
    xswHandle.writeAttribute('product-id', sourceID);
    xswHandle.writeStartElement('product-links');

    Object.keys(akeneoProduct.associations).forEach(function (associationType) {
        if (associationType in productLinkMapping) {
            var productLinkType = productLinkMapping[associationType];
            var association = akeneoProduct.associations[associationType];

            if (association.products.length > 0 || association.product_models.length > 0) {
                var targetID;

                for (var i = 0; i < association.products.length; i++) {
                    targetID = association.products[i];

                    if (typeof targetID === 'string') {
                        writeProductLink(xswHandle, targetID, productLinkType);
                    } else if (typeof targetID === 'object') {
                        for (var j = 0; j < targetID.length; j++) {
                            writeProductLink(xswHandle, targetID[j], productLinkType);
                        }
                    }
                }
                for (var k = 0; k < association.product_models.length; k++) {
                    targetID = association.product_models[k];

                    if (typeof targetID === 'string') {
                        writeProductLink(xswHandle, targetID, productLinkType);
                    } else if (typeof targetID === 'object') {
                        for (var l = 0; l < targetID.length; l++) {
                            writeProductLink(xswHandle, targetID[l], productLinkType);
                        }
                    }
                }
            }
        }
    });
    xswHandle.writeEndElement(); // product-links
    xswHandle.writeEndElement(); // product
};

/**
 * @desc creates catalog category assignment xml
 * @param {Object} akeneoProduct - product object
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml writer
 */
akeneoCreateCatalogXML.createCatalogCategoryAssignmentXML = function (akeneoProduct, xswHandle) {
    var productID = akeneoProduct.code ? akeneoProduct.code : akeneoProduct.identifier;
    var categoryCustomObjID = config.customObjectType.TopLevelCategoriesCodes;
    var productPrimaryFlag = config.productPrimaryFlag;
    var categoryCustomObj = CustomObjectMgr.getCustomObject(categoryCustomObjID, categoryCustomObjID);
    var topLevelCategoryID = config.topLevelCategoryID;
    var categoryTree;

    if (categoryCustomObj) {
        categoryTree = JSON.parse(categoryCustomObj.custom.subCategoriesCodes || '[]');
    }

    if(akeneoProduct.parent) {
        // remove categories that are already defined on parent level
        var parentModel = generalUtils.getParentModelProduct({
            parent: akeneoProduct.parent
        });

        for (var i = 0; i < parentModel.categories.length; i++) {
            var index = akeneoProduct.categories.indexOf(parentModel.categories[i]);
            if(index !== -1) {
                akeneoProduct.categories.splice(index, 1);
            }
        }
    }

    var category;
    for (var i = 0; i < akeneoProduct.categories.length; i++) {
        category = akeneoProduct.categories[i];
        if (!categoryTree.length || categoryTree.indexOf(category) !== -1) {
            xswHandle.writeStartElement('category-assignment');
            xswHandle.writeAttribute('category-id', category === topLevelCategoryID ? 'root' : category);
            xswHandle.writeAttribute('product-id', productID);

            if (productPrimaryFlag) {
                generalUtils.writeElement(xswHandle, 'primary-flag', 'true');
            }
            xswHandle.writeEndElement();
            productPrimaryFlag = false; // need only one categoryAssignment with primary-flag
        }
    }

    var unassignedCategories = getUnassignedCategories(akeneoProduct);

    for (var j = 0; j < unassignedCategories.length; j++) {
        category = unassignedCategories[j];
        xswHandle.writeStartElement('category-assignment');
        xswHandle.writeAttribute('category-id', category === topLevelCategoryID ? 'root' : category);
        xswHandle.writeAttribute('product-id', productID);
        xswHandle.writeAttribute('mode', 'delete');
        xswHandle.writeEndElement(); // category-assignment
    }
};

/* Exported functions */
module.exports = akeneoCreateCatalogXML;
