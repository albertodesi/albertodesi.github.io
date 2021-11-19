/* general utility functions */
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var Encoding = require('dw/crypto/Encoding');

var Utils = {};

/* Get Last Imported Time from custom object */
Utils.getLastImportedTime = function (runtimeObjectID) {
    var importedTime = require('~/cartridge/scripts/jobs/importedTime');
    return importedTime.getLastImportedTime(runtimeObjectID);
};

/**
 * Get Akeneo Product API URL for full import OR differential based on lastImportTime in custom object
 * @param {string} akeneoProductsUrl - product's URL
 * @return {string} - pagination url args to make service to akeneo API
 */
Utils.getAkeneoProductURLArgs = function (akeneoProductsUrl) {
    var lastImportTime = Utils.getLastImportedTime('AkeneoCatalogRunTime');
    var filterArg = {};
    var filterParams = '';

    if (this.config.importType === 'advanced') {
        try {
            var importBuilderConfigName = (akeneoProductsUrl.indexOf('product-models') === -1) ? 'akeneoProductsImportBuilderConfig' : 'akeneoModelProductsImportBuilderConfig';
            var importBuilderConfig = Utils.getJSONObjectFromSitePreferences(importBuilderConfigName);

            Object.keys(importBuilderConfig).forEach(function (key) {
                if (key === 'search') {
                    filterArg = importBuilderConfig.search;
                } else {
                    filterParams += '&' + key + '=' + importBuilderConfig[key];
                }
            });
        } catch (e) {
            throw new Error('ERROR while parsing import builder config: ' + e.message);
        }
    }

    if (lastImportTime) {
        filterArg.updated = this.config.APIURL.parameter.search.updated;
        filterArg.updated[0].value = lastImportTime;
    }
    return '?pagination_type=search_after&search=' + Encoding.toURI(JSON.stringify(filterArg)) + filterParams + '&limit=' + this.config.APIURL.parameter.pagination;
};

/**
 * @desc Get 1st level model product from cache
 * @param {Object} akeneoProduct - The product for which 1st level model product is required
 * @return {Object} - The 1st level model product
 */
Utils.getMasterModelProduct = function (akeneoProduct) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var masterCode = akeneoProduct.parent;
    var cacheFileName = StringUtils.format(Utils.config.cacheDirectory.modelProducts.endPoint, Utils.config.sfccMasterCatalogID, masterCode);
    var modelProduct = customCacheWebdav.getCache(cacheFileName);

    if (!modelProduct) {
        modelProduct = Utils.fetchModelProductObject(masterCode);
    }

    if (!modelProduct.parent) {
        return modelProduct;
    }
    /* The modelProduct is a 2nd level model. Calling this method for 2nd level model */
    return Utils.getMasterModelProduct({
        parent: modelProduct.parent
    });
};

/**
 * @desc Get parent model product from cache
 * @param {Object} akeneoProduct - The product for which parent model product is required
 * @return {Object} - The parent model product
 */
Utils.getParentModelProduct = function (akeneoProduct) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var masterCode = akeneoProduct.parent;
    var cacheFileName = StringUtils.format(Utils.config.cacheDirectory.modelProducts.endPoint, Utils.config.sfccMasterCatalogID, masterCode);
    var modelProduct = customCacheWebdav.getCache(cacheFileName);

    if (!modelProduct) {
        modelProduct = Utils.fetchModelProductObject(masterCode);
    }

    return modelProduct;
};

/**
 * fetch model product from Akeneo and create custom object
 * @param {string} masterCode - master product code
 * @return {Object} - Master product
 */
Utils.fetchModelProductObject = function (masterCode) {
    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    // define service used for call
    var akeneoService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoService = akeneoService.getGeneralService();
    var cacheModelProduct;

    // setting the default akeneo hostname
    AkeneoService.setURL(this.config.serviceGeneralUrl);
    AkeneoServicesHandler.nextUrl = '';

    var serviceURL = StringUtils.format(this.config.APIURL.endpoints.getMasterProduct, encodeURIComponent(masterCode));

    try {
        var modelProduct = AkeneoServicesHandler.serviceRequestVariationProduct(AkeneoService, serviceURL);
        cacheModelProduct = Utils.saveModelProductInCache(modelProduct);
    } catch (e) {
        throw new Error('ERROR : While calling service to get model products  : ' + e.stack + ' with Error: ' + e.message);
    }

    return cacheModelProduct;
};

/**
 * fetch product from Akeneo and saves in custom cache
 * @param {string} productCode - product code
 * @return {Object} - product
 */
Utils.fetchProductObject = function (productCode) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var AkeneoServicesHandler = require('~/cartridge/scripts/utils/akeneoServicesHandler');
    // define service used for call
    var akeneoService = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var AkeneoService = akeneoService.getGeneralService();
    var product;

    // setting the default akeneo hostname
    AkeneoService.setURL(this.config.serviceGeneralUrl);
    AkeneoServicesHandler.nextUrl = '';

    var serviceURL = StringUtils.format(this.config.APIURL.endpoints.getVariationProduct, encodeURIComponent(productCode));

    try {
        product = AkeneoServicesHandler.serviceRequestVariationProduct(AkeneoService, serviceURL);
        customCacheWebdav.setCache(StringUtils.format(this.config.cacheDirectory.products.endPoint, Utils.config.sfccMasterCatalogID, product.identifier), product);
    } catch (e) {
        throw new Error('ERROR : While calling service to get variant product : ' + e.stack + ' with Error: ' + e.message);
    }

    return product;
};

/**
 * @desc Saves model product details to custom cache files
 * @param {Object} modelProduct - The model product to be saved in cache
 * @returns {Object} - the cache model product object
 */
Utils.saveModelProductInCache = function (modelProduct) {
    var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
    var createModelProductCache = Utils.categoryMatchesWithConfig(modelProduct);
    var akeneoModelProductObject;

    if (createModelProductCache) {
        var fileName = StringUtils.format(Utils.config.cacheDirectory.modelProducts.endPoint, Utils.config.sfccMasterCatalogID, modelProduct.code);
        customCacheWebdav.clearCache(fileName);

        akeneoModelProductObject = {
            code: modelProduct.code,
            parent: modelProduct.parent,
            masterFamilyVariant: modelProduct.family_variant,
            values: modelProduct.values,
            categories: modelProduct.categories,
            associations: modelProduct.associations
        };
        customCacheWebdav.setCache(fileName, akeneoModelProductObject);
    }

    return akeneoModelProductObject;
};

/**
 * Check if scope is matching with the scope which is in configuration
 * @param {string} attributeScope - attributeScope
 * @return {boolean} - boolean value
 */
Utils.checkScope = function (attributeScope) {
    var akeneoScope = this.config.scope;

    if (attributeScope && akeneoScope) {
        return attributeScope === akeneoScope;
    }
    return true;
};

/**
 * Check if the category belongs to the category tree ID mentioned in the custom preference Akeneo Main Catalogs
 * @param {Object} akeneoProduct - akeneoProduct object
 * @return {boolean} - isImportableProduct boolean value
 */
Utils.categoryMatchesWithConfig = function (akeneoProduct) {
    var isImportableProduct = false;

    if (akeneoProduct.categories && akeneoProduct.categories.length > 0) {
        var topLevelCatCodes = Utils.config.customObjectType.TopLevelCategoriesCodes;
        var topLevelCatCodesCustomObj = CustomObjectMgr.getCustomObject(topLevelCatCodes, topLevelCatCodes);

        if (topLevelCatCodesCustomObj) {
            var categoriesCodeList = JSON.parse(topLevelCatCodesCustomObj.custom.categoriesCodes || '[]');

            if (!categoriesCodeList.length) {
                return true;
            }

            for (var index = 0; index < akeneoProduct.categories.length; index++) {
                var akeneoCategory = akeneoProduct.categories[index];
                isImportableProduct = categoriesCodeList.indexOf(akeneoCategory) !== -1;

                if (isImportableProduct) {
                    break;
                }
            }
        } else {
            isImportableProduct = true;
        }
    } else {
        isImportableProduct = true;
    }

    return isImportableProduct;
};

/**
 * save all the categories of catalog mentioned in the custom preference Akeneo Main Catalogs
 * @param {dw.util.List} akeneoCategoriesList - categories list
 * @param {dw.util.List} akeneoMainCatalogs - main catalogs list
 */
Utils.saveCategoriesToCustomObject = function (akeneoCategoriesList, akeneoMainCatalogs) {
    if (akeneoMainCatalogs.length > 0) {
        var categoryCustomObjectID = this.config.customObjectType.TopLevelCategoriesCodes;
        var categoryCustomObject = CustomObjectMgr.getCustomObject(categoryCustomObjectID, categoryCustomObjectID);

        if (!categoryCustomObject) {
            Transaction.begin();
            categoryCustomObject = CustomObjectMgr.createCustomObject(categoryCustomObjectID, categoryCustomObjectID);
            Transaction.commit();
        }
        var configMatchingTopCatCodes = JSON.parse(categoryCustomObject.custom.categoriesCodes || '[]');

        var categoriesIterator = akeneoCategoriesList.iterator();

        while (categoriesIterator.hasNext()) {
            var akeneoCategory = categoriesIterator.next();

            if (configMatchingTopCatCodes.indexOf(akeneoCategory.code) === -1) {
                if (akeneoCategory.parent === null) {
                    if (akeneoMainCatalogs.indexOf(akeneoCategory.code) !== -1) {
                        configMatchingTopCatCodes.push(akeneoCategory.code);
                    }
                } else if (configMatchingTopCatCodes.indexOf(akeneoCategory.parent) !== -1) {
                    configMatchingTopCatCodes.push(akeneoCategory.code);
                }
            }
        }
        Transaction.begin();
        categoryCustomObject.custom.categoriesCodes = JSON.stringify(configMatchingTopCatCodes);
        Transaction.commit();
    }
};

/* Clears the akeneo flux directory */
Utils.clearDirectoryAkeneo = function () {
    var File = require('dw/io/File');
    var AKENEO_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR;

    var AkeneoFluxPath = new File(AKENEO_FLUX_DIR);
    // filter on directory only
    var folderList = AkeneoFluxPath.listFiles(function (file) {
        return file.isDirectory();
    });
    var folderIterator = folderList.iterator();

    if (folderList && folderList.getLength() > 0) {
        while (folderIterator.hasNext()) {
            var folder = folderIterator.next();
            var AKENEO_ARCHIVE_DIRECTORY = folder.getFullPath() + File.SEPARATOR + 'archives' + File.SEPARATOR + 'failed' + File.SEPARATOR;
            new File(AKENEO_ARCHIVE_DIRECTORY).mkdirs();
            var filesList = folder.listFiles(function (file) {
                return file.isFile();
            });
            var filesIterator = filesList.iterator();

            if (filesList && filesList.getLength() > 0) {
                while (filesIterator.hasNext()) {
                    var file = filesIterator.next();
                    file.renameTo(new File(AKENEO_ARCHIVE_DIRECTORY + file.getName()));
                }
            }
        }
    }
};

/**
 * Get JSON object from site preferences
 * @param {string} preferenceName - name of the site preference
 * @returns {Object} - object of site preference value
 */
Utils.getJSONObjectFromSitePreferences = function (preferenceName) {
    var preferenceStr = Site.current.preferences ? Site.current.getCustomPreferenceValue(preferenceName) : '{}';
    var preferenceObj;
    try {
        preferenceObj = JSON.parse(preferenceStr || '{}');
    } catch (e) {
        throw new Error('ERROR: Failed to Parse site preference JSON: ' + preferenceName + ', found value: \'' + preferenceStr + '\', Error: ' + e);
    }
    return preferenceObj;
};

/**
 * @desc Writes single XML element
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} elementName - element name
 * @param {string} chars - chars
 * @param {string} attrKey - attr key
 * @param {string} attrValue - attr value
 */
Utils.writeElement = function (xswHandle, elementName, chars, attrKey, attrValue) {
    xswHandle.writeStartElement(elementName);

    if (attrKey && attrValue) {
        xswHandle.writeAttribute(attrKey, attrValue);
    }

    xswHandle.writeCharacters(chars);
    xswHandle.writeEndElement();
};

/* Configurations */
Utils.config = {
    serviceGeneralUrl: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoServiceGeneralUrl') : '',
    sfccMasterCatalogID: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoProductsCatalogID') : '',
    importType: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoImportType').value : 'advanced',
    imageType: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoImageType').value : '',
    topLevelCategoryID: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoTopLevelCategoryID') : '',
    scope: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoScope') : '',
    productSetFamily: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoProductSetFamily') : '',
    productBundleFamily: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoProductBundleFamily') : '',
    productSetAssociationType: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoProductSetAssociationType') : '',
    productBundleAssociationType: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoProductBundleAssociationType') : '',
    akeneoMainCatalogs: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoMainCatalogs') : [],
    akeneoCategoryOnline: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoCategoryOnline') : true,
    productPrimaryFlag: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoProductPrimaryFlag') : true,
    writeCategories: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoWriteCategories') : true,
    considerProductStatus: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoConsiderProductStatus') : false,
    modelImport: {
        type: Site.current.preferences ? Site.getCurrent().getCustomPreferenceValue('akeneoModelImportType').value : ''
    },
    productAssociationImportType: {
        type: Site.current.preferences ? Site.getCurrent().getCustomPreferenceValue('akeneoProductAssociation').value : ''
    },
    productsImportBuilderConfig: Utils.getJSONObjectFromSitePreferences('akeneoProductsImportBuilderConfig'),
    modelProductsImportBuilderConfig: Utils.getJSONObjectFromSitePreferences('akeneoModelProductsImportBuilderConfig'),
    systemAttrsMapping: Utils.getJSONObjectFromSitePreferences('akeneoProductAttrsMapping'),
    customAttrsMapping: Utils.getJSONObjectFromSitePreferences('akeneoCustomAttrMapping'),
    recommendationsMapping: Utils.getJSONObjectFromSitePreferences('akeneoRecommendationsMapping'),
    productLinkMapping: Utils.getJSONObjectFromSitePreferences('akeneoProductLinkMapping'),
    imageViewTypes: Utils.getJSONObjectFromSitePreferences('akeneoViewTypesConfig'),
    imageMetadataMapping: Utils.getJSONObjectFromSitePreferences('akeneoImageMetadataMapping'),
    imageLinkViewTypesMapping: Utils.getJSONObjectFromSitePreferences('akeneoImageLinkViewTypesMapping'),
    imageFileViewTypesMapping: Utils.getJSONObjectFromSitePreferences('akeneoImageFileViewTypesMapping'),
    externalImageLocation: Site.current.preferences ? Site.getCurrent().getCustomPreferenceValue('akeneoExternalImageLocation') : '',
    assetSystemVersion: Site.current.preferences ? Site.getCurrent().getCustomPreferenceValue('akeneoAssetSystem').value : 'new',
    imageImportType: Site.current.preferences ? Site.getCurrent().getCustomPreferenceValue('akeneoImageImportType').value : 'both',
    customObjectType: {
        RunTime: 'AkeneoRunTime',
        AccessToken: 'AkeneoToken',
        TopLevelCategoriesCodes: 'AkeneoTopLevelCategoriesCode'
    },
    cacheDirectory: {
        products: {
            baseLocation: '/products/{0}',
            endPoint: '/products/{0}/{1}'
        },
        modelProducts: {
            baseLocation: '/model-products/{0}',
            endPoint: '/model-products/{0}/{1}'
        },
        familyVariants: {
            baseLocation: '/families',
            endPoint: '/families/{0}/variants/{1}'
        },
        variantsAxes: {
            baseLocation: '/variants-axes',
            axesList: '/variants-axes/axesList'
        },
        attributes: {
            baseLocation: '/attributes',
            attributesList: '/attributes/attributesList',
            imageCodesList: '/attributes/imageCodesList',
            assetCodesList: '/attributes/assetCodesList',
            selectCodesList: '/attributes/selectCodesList'
        },
        assetFamilies: {
            baseLocation: '/asset-families',
            endPoint: '/asset-families/{0}',
            locales: '/asset-families/locales',
            attributeBaseLocation: '/asset-families/{0}/attributes',
            attributeEndPoint: '/asset-families/{0}/attributes/{1}',
            assetFamilyAsset: '/asset-families/assets/{0}',
            assetProductRelation: '/asset-product-relation/{0}',
            assetProductRelationBaseLocation: '/asset-product-relation'
        },
        categoryRefinements: {
            baseLocation: '/category-refinements',
            endPoint: '/category-refinements/{0}/{1}'
        },
        temporaryTimestamp: {
            baseLocation: '/temporary-timestamp',
            endPoint: '/temporary-timestamp/{0}'
        }
    },
    customLogFileName: 'akeneo',
    customMediaErrorLogFileName: 'akeneoMediaAssetErrors',
    APIURL: {
        endpoints: {
            attributes: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoAttributesUrl') : '/api/rest/v1/attributes',
            tokenAPIURL: '/api/oauth/v1/token',
            getMasterProduct: '/api/rest/v1/product-models/{0}',
            getVariationProduct: '/api/rest/v1/products/{0}',
            getAttributeFamily: '/api/rest/v1/families/{0}',
            getFamilyVariant: '/api/rest/v1/families/{0}/variants/{1}',
            ModelProductsUrl: '/api/rest/v1/product-models',
            ProductsUrl: '/api/rest/v1/products',
            AttributesUrl: '/api/rest/v1/attributes',
            CategoriesUrl: '/api/rest/v1/categories',
            getAllFamilies: '/api/rest/v1/families',
            getAllFamilyVariants: '/api/rest/v1/families/{0}/variants',
            assetFamiliesUrl: '/api/rest/v1/asset-families',
            assetFamilyAssetsUrl: '/api/rest/v1/asset-families/{0}/assets',
            assetFamilyAttributesUrl: '/api/rest/v1/asset-families/{0}/attributes',
            getAssetFamilyAttributeUrl: '/api/rest/v1/asset-families/{0}/attributes/{1}'
        },
        timeout: 600000,
        retryLimit: 5,
        parameter: {
            pagination: 50, // Number of items per page
            search: {
                updated: [{
                    operator: '>',
                    value: ''
                }]
            },
            paginationType: 'search_after'
        }
    },
    debug: {
        breakCodeOnLimit: false, // In debug mode keep it true if you want to run job for whole available data. In production this must be false
        pageLimit: 2 // Number of pages to be considered. This will be in action only when breakCodeOnLimit is true
    },
    codeVersion: 'v20.4.1'
};

/* Exported functions */
module.exports = Utils;
