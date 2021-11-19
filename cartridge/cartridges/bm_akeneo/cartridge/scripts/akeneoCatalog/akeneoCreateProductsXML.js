'use strict';

// API Includes
var File = require('dw/io/File');
var StringUtils = require('dw/util/StringUtils');
var FileWriter = require('dw/io/FileWriter');
var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
var Calendar = require('dw/util/Calendar');

// Lib includes
var fileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
var stringUtilsExt = require('~/cartridge/scripts/utils/libStringUtilsExt');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;

var akeneoCreateProductsXML = {};


var Logger = require('dw/system/Logger');

/**
 * @desc Write Header & Static part of akeneo catalog
 *
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - the XML writer
 *
 * @returns {void}
 */
function writeAkeneoCatalogHeader(xswHandle) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var catalogID = config.sfccMasterCatalogID;
    var viewTypes = config.imageViewTypes;
    var akeneoLocales = customCacheWebdav.getCache(config.cacheDirectory.assetFamilies.locales) || [];

    // XML definition & first node
    xswHandle.writeStartDocument('UTF-8', '1.0');
    xswHandle.writeStartElement('catalog');
    xswHandle.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/catalog/2006-10-31');
    xswHandle.writeAttribute('catalog-id', catalogID);

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

        if (!viewTypes['view-types']) {
            throw new Error('ERROR! Required site preference "akeneoViewTypesConfig" is empty.');
        }
        if (viewTypes && viewTypes['view-types'].length > 0) {
            xswHandle.writeStartElement('view-types');

            for (var i = 0; i < viewTypes['view-types'].length; i++) {
                var viewType = viewTypes['view-types'][i];
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

    generalUtils.writeElement(xswHandle, 'display-name', catalogID, 'xml:lang', 'x-default');
    generalUtils.writeElement(xswHandle, 'online-flag', 'true');
    generalUtils.writeElement(xswHandle, 'template', '');
    generalUtils.writeElement(xswHandle, 'page-attributes', '');

    var refinements = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.categoryRefinements.endPoint, catalogID, 'root'), 'XML');
    if (refinements) {
        xswHandle.writeRaw(refinements);
    }
    // close xml root catalog
    xswHandle.writeEndElement();
}

/**
 * @desc Creates XML file and returns file Writers
 *
 * @param {number} index - the index in the file name
 * @param {string} fileName - the part of file name to describe its contents
 *
 * @returns {Object} - The file writers
 */
akeneoCreateProductsXML.createCatalogHeaderXML = function (index, fileName) {
    var catalogID = config.sfccMasterCatalogID;
    var AKENEO_CATALOG_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'catalog' + File.SEPARATOR;
    var AKENEO_CATALOG_FILE_PATH = 'catalog-akeneo-' + index + '-' + fileName + '-' + catalogID + '-' + StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmss') + '.xml';
    var file = new File(AKENEO_CATALOG_FLUX_DIR + AKENEO_CATALOG_FILE_PATH);
    fileUtils.createFileAndFolders(file);

    var fwHandle = new FileWriter(file);
    var xswHandle = new XMLIndentingStreamWriter(fwHandle);

    try {
        writeAkeneoCatalogHeader(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML Catalog file : ' + e.stack + ' with Error: ' + e.message);
    }

    return {
        fwHandle: fwHandle,
        xswHandle: xswHandle
    };
};

/**
 * @desc Write Footer & Static part of akeneo catalog
 *
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - the XML writer
 *
 * @returns {void}
 */
function writeAkeneoCatalogFooter(xswHandle) {
    // XML definition & close first node
    xswHandle.writeEndElement();
    xswHandle.writeEndDocument();
    xswHandle.flush();
}

/**
 * @desc Write Footer Akeneo Catalog Products XML part
 *
 * @param {Object} productWriter - The object containing the file writers
 *
 * @returns {void}
 */
akeneoCreateProductsXML.createCatalogFooterXML = function (productWriter) {
    var xswHandle = productWriter.xswHandle;
    var fwHandle = productWriter.fwHandle;

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
 * @desc Return an object which contains mapping for product nodes
 *
 * @returns {Object} - which contains mapping for product nodes
 */
function getStaticProductNodes() {
    var productNodes = {
        EAN: {
            nodeName: 'ean',
            localizable: 'false',
            nodeValue: ''
        },
        UPC: {
            nodeName: 'upc',
            localizable: 'false',
            nodeValue: ''
        },
        unit: {
            nodeName: 'unit',
            localizable: 'false',
            nodeValue: ''
        },
        minOrderQuantity: {
            nodeName: 'min-order-quantity',
            localizable: 'false',
            nodeValue: ''
        },
        stepQuantity: {
            nodeName: 'step-quantity',
            localizable: 'false',
            nodeValue: ''
        },
        name: {
            nodeName: 'display-name',
            localizable: 'true',
            nodeValue: []
        },
        shortDescription: {
            nodeName: 'short-description',
            localizable: 'true',
            nodeValue: []
        },
        longDescription: {
            nodeName: 'long-description',
            localizable: 'true',
            nodeValue: []
        },
        onlineFlag: {
            nodeName: 'online-flag',
            localizable: 'false',
            nodeValue: ''
        },
        onlineFrom: {
            nodeName: 'online-from',
            localizable: 'false',
            nodeValue: []
        },
        onlineTo: {
            nodeName: 'online-to',
            localizable: 'false',
            nodeValue: []
        },
        searchable: {
            nodeName: 'searchable-flag',
            localizable: 'false',
            nodeValue: 'true'
        },
        searchableIfUnavailable: {
            nodeName: 'searchable-if-unavailable-flag',
            localizable: 'false',
            nodeValue: 'false'
        },
        template: {
            nodeName: 'template',
            localizable: 'false',
            nodeValue: ''
        },
        taxClassID: {
            nodeName: 'tax-class-id',
            localizable: 'false',
            nodeValue: ''
        },
        brand: {
            nodeName: 'brand',
            localizable: 'false',
            nodeValue: ''
        },
        manufacturerName: {
            nodeName: 'manufacturer-name',
            localizable: 'false',
            nodeValue: ''
        },
        manufacturerSKU: {
            nodeName: 'manufacturer-sku',
            localizable: 'false',
            nodeValue: ''
        },
        searchPlacement: {
            nodeName: 'search-placement',
            localizable: 'false',
            nodeValue: ''
        },
        searchRank: {
            nodeName: 'search-rank',
            localizable: 'false',
            nodeValue: ''
        },
        siteMapIncluded: {
            nodeName: 'sitemap-included-flag',
            localizable: 'false',
            nodeValue: 'false'
        },
        siteMapChangeFrequency: {
            nodeName: 'sitemap-changefrequency',
            localizable: 'false',
            nodeValue: ''
        },
        siteMapPriority: {
            nodeName: 'sitemap-priority',
            localizable: 'false',
            nodeValue: ''
        },
        pageAttributes: {
            pageTitle: {
                nodeName: 'page-title',
                localizable: 'true',
                nodeValue: []
            },
            pageDescription: {
                nodeName: 'page-description',
                localizable: 'true',
                nodeValue: []
            },
            pageKeywords: {
                nodeName: 'page-keywords',
                localizable: 'true',
                nodeValue: []
            },
            pageUrl: {
                nodeName: 'page-url',
                localizable: 'true',
                nodeValue: []
            }
        },
        productBundle: {},
        productSet: {},
        pinterestEnabled: {
            nodeName: 'pinterest-enabled-flag',
            localizable: 'false',
            nodeValue: 'false'
        },
        facebookEnabled: {
            nodeName: 'facebook-enabled-flag',
            localizable: 'false',
            nodeValue: 'false'
        },
        storeAttributes: {
            storeReceiptName: {
                nodeName: 'receipt-name',
                localizable: 'true',
                nodeValue: []
            },
            storeForcePriceEnabled: {
                nodeName: 'force-price-flag',
                localizable: 'false',
                nodeValue: 'false'
            },
            storeNonInventoryEnabled: {
                nodeName: 'non-inventory-flag',
                localizable: 'false',
                nodeValue: 'false'
            },
            storeNonRevenueEnabled: {
                nodeName: 'non-revenue-flag',
                localizable: 'false',
                nodeValue: 'false'
            },
            storeNonDiscountableEnabled: {
                nodeName: 'non-discountable-flag',
                localizable: 'false',
                nodeValue: 'false'
            }
        }
    };
    return productNodes;
}

/**
 * @desc Writing the product-set-products nodes based product recommendations from API
 * @param {dw.io.XSWIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} association - The product association object for product set
 * @returns {void}
 */
function writeAkeneoProductsSet(xswHandle, association) {
    if (association && (association.products.length > 0 || association.product_models.length > 0)) {
        var targetID;
        xswHandle.writeStartElement('product-set-products');

        for (var i = 0; i < association.products.length; i++) {
            targetID = association.products[i];

            if (typeof targetID === 'string') {
                generalUtils.writeElement(xswHandle, 'product-set-product', '', 'product-id', targetID);
            } else if (typeof targetID === 'object') {
                if (targetID.identifier) {
                    generalUtils.writeElement(xswHandle, 'product-set-product', '', 'product-id', targetID.identifier);
                } else {
                    for (var l = 0; l < targetID.length; l++) {
                        generalUtils.writeElement(xswHandle, 'product-set-product', '', 'product-id', targetID[l]);
                    }
                }
            }
        }

        for (var k = 0; k < association.product_models.length; k++) {
            targetID = association.product_models[k];

            if (typeof targetID === 'string') {
                generalUtils.writeElement(xswHandle, 'product-set-product', '', 'product-id', targetID);
            } else if (typeof targetID === 'object') {
                if (targetID.identifier) {
                    generalUtils.writeElement(xswHandle, 'product-set-product', '', 'product-id', targetID.identifier);
                } else {
                    for (var l = 0; l < targetID.length; l++) {
                        generalUtils.writeElement(xswHandle, 'product-set-product', '', 'product-id', targetID[l]);
                    }
                }
            }
        }  
        xswHandle.writeEndElement();
    }
}

/**
 * Writes the tags for product bundle
 * @param {dw.io.XSWIndentingStreamWriter} xswHandle - XML writer
 * @param {string} productID - product ID
 * @returns {void}
 */
function writeProductBundleXML(xswHandle, productID, quantity) {
    xswHandle.writeStartElement('bundled-product');
    xswHandle.writeAttribute('product-id', productID);
    generalUtils.writeElement(xswHandle, 'quantity', quantity);
    xswHandle.writeEndElement();
}

/**
 * @desc Writing the bundled-products nodes based product recommendations from API
 * @param {dw.io.XSWIndentingStreamWriter} xswHandle - XML writer
 * @param {Object} association - The product association object for product bundle
 * @returns {void}
 */
function writeAkeneoProductsBundle(xswHandle, association, quantified) {
    if (association && (association.products.length > 0 || association.product_models.length > 0)) {
        var targetID;
        xswHandle.writeStartElement('bundled-products');

        for (var i = 0; i < association.products.length; i++) {
            targetID = association.products[i];
            if (typeof targetID === 'string') {
                writeProductBundleXML(xswHandle, targetID, 1);
            } else if (typeof targetID === 'object') {
                if (quantified && targetID.identifier && targetID.quantity) {
                    writeProductBundleXML(xswHandle, targetID.identifier, targetID.quantity);
                } else {
                    for (var j = 0; j < targetID.length; j++) {
                        writeProductBundleXML(xswHandle, targetID[j], 1);
                    }
                }                
            }
        }

        for (var k = 0; k < association.product_models.length; k++) {
            targetID = association.product_models[k];

            if (typeof targetID === 'string') {
                writeProductBundleXML(xswHandle, targetID, 1);
            } else if (typeof targetID === 'object') {
                if (quantified && targetID.identifier && targetID.quantity) {
                    writeProductBundleXML(xswHandle, targetID.identifier, targetID.quantity);
                } else {
                    for (var l = 0; l < targetID.length; l++) {
                        writeProductBundleXML(xswHandle, targetID[l], 1);
                    }
                }
            }
        }
        xswHandle.writeEndElement();
    }
}

/**
 * @desc Fill the productNodes for create sorted product xml part
 *
 * @param {Object} akeneoProduct - the product to be written
 * @param {Object} productNodes - the SFCC product nodes
 */
function setMatchingFromConfiguration(akeneoProduct, productNodes) {
    var productAttrsMapping = config.systemAttrsMapping;
    var channelMatches;

    Object.keys(akeneoProduct.values).forEach(function (attrKey) {
        var attrValues = akeneoProduct.values[attrKey];
        var camelizedAttrKey = 'akeneo_' + stringUtilsExt.camelize(attrKey);

        if (camelizedAttrKey in productAttrsMapping.matching) {
            var salesforceAttrKey = productAttrsMapping.matching[camelizedAttrKey];
            var salesforceAttrValue = productNodes[salesforceAttrKey];

            if (typeof salesforceAttrValue !== 'undefined') {
                if (attrValues.length > 1 || attrValues[0].locale) {
                    salesforceAttrValue.nodeValue = {};
                    for (var i = 0; i < attrValues.length; i++) {
                        var attrValue = attrValues[i];
                        channelMatches = generalUtils.checkScope(attrValue.scope);

                        if (channelMatches) {
                            var akeneoLocale = attrValue.locale ? attrValue.locale.replace('_', '-') : 'x-default';
                            salesforceAttrValue.nodeValue[akeneoLocale] = attrValue.data;
                        }
                    }
                } else {
                    channelMatches = generalUtils.checkScope(attrValues[0].scope);

                    if (channelMatches) {
                        if (typeof salesforceAttrValue.nodeValue === 'object') {
                            salesforceAttrValue.nodeValue.push(attrValues[0].data);
                        } else {
                            salesforceAttrValue.nodeValue = attrValues[0].data;
                        }
                    }
                }
            }
        }
    });
    var onlineFlagNode = productNodes.onlineFlag;
    if (config.considerProductStatus && typeof akeneoProduct.enabled !== 'undefined' && typeof onlineFlagNode !== 'undefined') {
        onlineFlagNode.nodeValue = akeneoProduct.enabled;
    }
}

/**
 * @desc Writing the product nodes based on matching found
 *
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - the XML writer
 * @param {Object} productNodes - the SFCC product nodes
 * @param {Object} akeneoProduct - the akeneo Product
 */
function writeProductNodesBasedOnMatching(xswHandle, productNodes, akeneoProduct) {
    var prodSetFamily = config.productSetFamily;
    var prodBundleFamily = config.productBundleFamily;
    var prodSetAssociationType = config.productSetAssociationType;
    var prodBundleAssociationType = config.productBundleAssociationType;

    Object.keys(productNodes).forEach(function (productNodeKey) {
        var productNode = productNodes[productNodeKey];
        var quantifiedAssociations = akeneoProduct.quantified_associations;

        if (productNodeKey === 'pageAttributes') {
            setMatchingFromConfiguration(akeneoProduct, productNode);

            xswHandle.writeStartElement('page-attributes');
            writeProductNodesBasedOnMatching(xswHandle, productNode, akeneoProduct);
            xswHandle.writeEndElement();
        } else if (productNodeKey === 'storeAttributes') {
            setMatchingFromConfiguration(akeneoProduct, productNode);

            xswHandle.writeStartElement('store-attributes');
            writeProductNodesBasedOnMatching(xswHandle, productNode, akeneoProduct);
            xswHandle.writeEndElement();
        } else if (productNodeKey === 'productBundle') {                        
            if (quantifiedAssociations) {
                Object.keys(quantifiedAssociations).forEach(function (qaName) {
                    var currentQuantifiedAssociation = quantifiedAssociations[qaName];
                    if (currentQuantifiedAssociation && qaName === prodBundleAssociationType) {
                        writeAkeneoProductsBundle(xswHandle, currentQuantifiedAssociation, true);
                    }
                });
            }

            if (prodBundleFamily && akeneoProduct.family === prodBundleFamily) {
                writeAkeneoProductsBundle(xswHandle, akeneoProduct.associations[prodBundleAssociationType], false);
            }
        } else if (productNodeKey === 'productSet') {
            if (quantifiedAssociations) {
                Object.keys(quantifiedAssociations).forEach(function (qaName) {
                    var currentQuantifiedAssociation = quantifiedAssociations[qaName];
                    if (currentQuantifiedAssociation && qaName === prodSetAssociationType) {
                        writeAkeneoProductsSet(xswHandle, currentQuantifiedAssociation);
                    }
                });
            }

            if (prodSetFamily && akeneoProduct.family === prodSetFamily) {
                writeAkeneoProductsSet(xswHandle, akeneoProduct.associations[prodSetAssociationType]);
            }
        } else if (productNode.nodeValue !== '' && (typeof productNode.nodeValue !== 'object' || productNode.nodeValue.length || Object.keys(productNode.nodeValue).length)) {
            if (productNode.localizable === 'true') {
                if (typeof productNode.nodeValue === 'object') {
                    if (productNode.nodeValue.length) {
                        generalUtils.writeElement(xswHandle, productNode.nodeName, productNode.nodeValue[0], 'xml:lang', 'x-default');
                    } else {
                        Object.keys(productNode.nodeValue).forEach(function (locale) {
                            generalUtils.writeElement(xswHandle, productNode.nodeName, productNode.nodeValue[locale], 'xml:lang', locale);
                        });
                    }
                }
            } else {
                generalUtils.writeElement(xswHandle, productNode.nodeName, productNode.nodeValue);
            }
        }
    });
}

/**
 * @desc Write XML for single product
 *
 * @param {Object} akeneoProduct - The product to be written
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - xml writer
 *
 * @returns {void}
 */
akeneoCreateProductsXML.writeAkeneoProducts = function (akeneoProduct, xswHandle) {
    if (akeneoProduct) {
        // getting salesforce static xml product nodes
        var productNodes = getStaticProductNodes();

        var akeneoProductID = typeof akeneoProduct.identifier !== 'undefined' ? akeneoProduct.identifier : akeneoProduct.code;
        var productID = StringUtils.trim(akeneoProductID);

        xswHandle.writeStartElement('product');

        xswHandle.writeAttribute('product-id', productID);

        setMatchingFromConfiguration(akeneoProduct, productNodes);

        writeProductNodesBasedOnMatching(xswHandle, productNodes, akeneoProduct);

        // close xml product
        xswHandle.writeEndElement();
    }
};

module.exports = akeneoCreateProductsXML;
