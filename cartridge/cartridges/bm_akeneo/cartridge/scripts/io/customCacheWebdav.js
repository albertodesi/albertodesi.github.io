'use strict';

/* eslint no-cond-assign: 0 */

/**
 * This feature uses WebDav folder as custom cache.
 * When ever there is a need of calling the same API end point multiple times, we can make use this feature.
 * For the first time API call of a specific end point, if the response is needed again later, then keep the response in cache.
 * Later before hitting the same API end point, check if the response is there in cache corresponding to the end point.
 * If the response data is there in cache, then take it and avoid further API call to same end point.
 * If the response data is not found in cache, then trigger the actual API call keep the response in cache for further use.
 * Here we use any webdav folder to keep cache.
 * Each end point is represented by a text file kept in similar path corresponding to the end point, so easy to access later.
 */

var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var FileWriter = require('dw/io/FileWriter');

var logUtils = require('~/cartridge/scripts/utils/logUtils');
var Logger = logUtils.getLogger('customCacheWebdav');

var CACHE_BASE_FOLDER = File.IMPEX; // File.IMPEX or File.TEMP
var SEP = File.SEPARATOR;
var CACHE_FOLDER_NAME = 'customcache';
var CACHE_PROJECT_CODE = 'akeneo'; // folder name for project
var CACHE_FILE_EXT = '.txt';

/**
 * @desc Return relative folder path of the cache - removes base domain part and final filename part
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @returns {string} - returns relative folder path of the cache - removes base domain part and final filename part
 */
function getRelativeFolderPath(endPoint) {
    var relFolderPath = endPoint.replace(/\s/g, '');
    relFolderPath = relFolderPath.substring(relFolderPath.indexOf('://') !== -1 ? relFolderPath.indexOf('://') + 3 : 0, relFolderPath.length);
    relFolderPath = relFolderPath.substring(relFolderPath.indexOf('/') !== -1 ? relFolderPath.indexOf('/') : 0, relFolderPath.length);

    if (relFolderPath.lastIndexOf('/') + 1 === relFolderPath.length) {
        // remove trailing '/'
        relFolderPath = relFolderPath.substring(0, relFolderPath.length - 1);
    }

    relFolderPath = relFolderPath.substring(0, relFolderPath.lastIndexOf('/'));
    relFolderPath = relFolderPath.replace(/\//g, SEP);

    return relFolderPath;
}

/**
 * @desc Generates cache file name from end point
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @returns {string} - returns file name for the given endpoint
 */
function getCacheFileName(endPoint) {
    var fileName = endPoint.replace(/\s/g, '');

    if (fileName.lastIndexOf('/') + 1 === fileName.length) {
        // remove trailing '/'
        fileName = fileName.substring(0, fileName.length - 1);
    }

    fileName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.length);
    fileName += CACHE_FILE_EXT;

    return fileName;
}

/**
 * @desc Generates full cache file name
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @returns {string} - returns full file path for the given endpoint
 */
function getFullFileName(endPoint) {
    var relFolderPath = getRelativeFolderPath(endPoint);
    var fileName = getCacheFileName(endPoint);
    var fullFolderPath = CACHE_BASE_FOLDER + SEP + CACHE_FOLDER_NAME + SEP + CACHE_PROJECT_CODE + relFolderPath;
    var cacheFolder = new File(fullFolderPath);

    if (!cacheFolder.exists()) {
        try {
            cacheFolder.mkdirs();
        } catch (e) {
            Logger.error(e.getMessage());
            Logger.error('Error while making folders for end point: ' + endPoint);
        }
    }

    var fullFileName = fullFolderPath + SEP + fileName;

    return fullFileName;
}

/**
 * @desc Keeps API response in cache
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @param {Object} data - the object to be stored in the cache
 */
function setCache(endPoint, data) {
    if (endPoint.indexOf('?') > -1) {
        return;
    }

    var dataToCache = typeof data === 'string' ? data : JSON.stringify(data);

    var fullFileName = getFullFileName(endPoint);
    var cacheFile = new File(fullFileName);
    var fileWriter = new FileWriter(cacheFile);

    try {
        fileWriter.write(dataToCache);
    } catch (e) {
        Logger.error(e.getMessage());
        Logger.error('Error while writing content to cache for end point: ' + endPoint);
    } finally {
        if (fileWriter !== null) {
            fileWriter.flush();
            fileWriter.close();
        }
    }
}

/**
 * @desc Returns API response from cache
 * @param {string} endPoint - unique identifier for the file to be fetched from cache. Should begin with '/'
 * @param {string} type - the type of data stored in the cache file. Optional if type is JSON, required if type is 'text' or 'XML'
 * @returns {Object|null} - returns the object if present in the cache file
 */
function getCache(endPoint, type) {
    if (endPoint.indexOf('?') > -1) {
        return null;
    }

    var fullFileName = getFullFileName(endPoint);
    var cacheFile = new File(fullFileName);

    if (cacheFile.exists()) {
        var fileContent = '';
        var charCount = 10000;
        var fileReader = new FileReader(cacheFile);
        var chunk;

        try {
            while (chunk = fileReader.readN(charCount)) {
                fileContent += chunk;
            }
        } catch (e) {
            Logger.error(e.getMessage());
            Logger.error('Error while reading content from cache for end point: ' + endPoint);
        }

        fileReader.close();

        if (fileContent) {
            try {
                if (type && (type === 'XML' || type === 'text')) {
                    return fileContent;
                }
                return JSON.parse(fileContent);
            } catch (e) {
                Logger.error(e.getMessage());
                Logger.error('Error while parsing the cache content to JSON for end point: ' + endPoint);
            }
        }
    }

    return null;
}

/**
 * @desc Returns list of filenames in the given location
 * @param {string} baseLocation - The name of directory for the files
 * @returns {Array} - String array of name of files in the directory
 */
function listFilesInCache(baseLocation) {
    var fullFolderPath = new File(CACHE_BASE_FOLDER + SEP + CACHE_FOLDER_NAME + SEP + CACHE_PROJECT_CODE + baseLocation);

    if (fullFolderPath.directory) {
        return fullFolderPath.list();
    }
    return [];
}

/**
 * @desc Makes folder empty - remove all files and sub folders
 * @param {dw.io.File} folder - folder to be cleared of all files
 */
function makeFolderEmpty(folder) {
    var filesList = folder.listFiles(function (file) {
        return file.exists();
    });
    var filesIterator = filesList.iterator();

    while (filesIterator.hasNext()) {
        var file = filesIterator.next();

        if (file.file) {
            file.remove();
        } else if (file.directory) {
            makeFolderEmpty(file);
            file.remove();
        }
    }
}

/**
 * @desc Clears all text files corresponding to cache responses
 * @param {string} folder - optional folder name to clear particular folder, if not provided, clears entire cache
 */
function clearCache(folder) {
    var rootFolder = new File(CACHE_BASE_FOLDER + SEP + CACHE_FOLDER_NAME + SEP + CACHE_PROJECT_CODE + (folder || ''));

    if (rootFolder.directory) {
        makeFolderEmpty(rootFolder);
        rootFolder.remove();
    } else if (rootFolder.file) {
        rootFolder.remove();
    }
}

/**
 * @desc Saves attributes option values in cache - to overcome limit of large number of options
 * @param {Object} attrOptionsPerPage - attribute options per page
 * @param {string} attributesOptionsUrl - the url path to cache the attrs
 */
function saveAttrOptions(attrOptionsPerPage, attributesOptionsUrl) {
    var cacheValue = getCache(attributesOptionsUrl);
    var writeContent = attrOptionsPerPage.toArray();

    if (cacheValue) {
        var cacheValueStrLength = JSON.stringify(cacheValue).length;
        var optionsStrLength = JSON.stringify(writeContent).length;
        if ((cacheValueStrLength + optionsStrLength) > 1000000) {
            // rename existing cache file
            var relFolderPath = getRelativeFolderPath(attributesOptionsUrl);
            var fullFolderPath = CACHE_BASE_FOLDER + SEP + CACHE_FOLDER_NAME + SEP + CACHE_PROJECT_CODE + relFolderPath;
            var optionsFolder = new File(fullFolderPath);
            var listFiles = optionsFolder.listFiles(function (file) {
                return file.file;
            });
            var fileCount = listFiles.size();
            var cacheFullFileName = getFullFileName(attributesOptionsUrl);
            var cacheFile = new File(cacheFullFileName);
            var newCacheFileFullName = cacheFullFileName.replace(CACHE_FILE_EXT, '') + fileCount + CACHE_FILE_EXT;
            var newCacheFile = new File(newCacheFileFullName);
            cacheFile.renameTo(newCacheFile);
        } else {
            writeContent = cacheValue.concat(writeContent);
        }
    }

    setCache(attributesOptionsUrl, writeContent);
}

/**
 * @desc Gets Attribute Options cache File Count
 * @param {string} attrOptionsPath - Attribute Options Path
 * @returns {number} - the number of files in the given path
 */
function getAttributeOptionFileCount(attrOptionsPath) {
    var optionsFolder = new File(CACHE_BASE_FOLDER + SEP + CACHE_FOLDER_NAME + SEP + CACHE_PROJECT_CODE + attrOptionsPath);
    var listFiles = optionsFolder.listFiles(function (file) {
        return file.file;
    });
    if (!listFiles) {
        return 0;
    }
    return listFiles.size();
}

/**
 * @desc Clears model products from Impex/customcache/akeneo/model-products custom path
 * @param {string} oldBaseLocation - Old base location path of model products
 */
function clearOldPathModelProductsCache(oldBaseLocation) {
    var baseDir = new File(CACHE_BASE_FOLDER + SEP + CACHE_FOLDER_NAME + SEP + CACHE_PROJECT_CODE + (oldBaseLocation || ''));

    var filesList = baseDir.listFiles(function (file) {
        return file.file;
    });

    if (filesList) {
        var filesIterator = filesList.iterator();

        while (filesIterator.hasNext()) {
            filesIterator.next().remove();
        }
    }
}

/* Exported functions */
module.exports = {
    setCache: setCache,
    getCache: getCache,
    listFilesInCache: listFilesInCache,
    clearCache: clearCache,
    saveAttrOptions: saveAttrOptions,
    getAttributeOptionFileCount: getAttributeOptionFileCount,
    clearOldPathModelProductsCache: clearOldPathModelProductsCache
};
