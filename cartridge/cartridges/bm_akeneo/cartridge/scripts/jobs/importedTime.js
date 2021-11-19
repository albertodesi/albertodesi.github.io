'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
var logUtils = require('~/cartridge/scripts/utils/logUtils');
var logger = logUtils.getLogger('importedTime');

/**
 * @desc Fetches the runtime custom object
 * @param {string} runtimeObjectID - The runtime object ID
 * @returns {dw.object.CustomObject} - runtime custom object
 */
function getRuntimeObject(runtimeObjectID) {
    var customObjectType = config.customObjectType.RunTime;
    var customObject;

    try {
        customObject = CustomObjectMgr.getCustomObject(customObjectType, runtimeObjectID);
    } catch (e) {
        logger.error('Error ocurred while fetching runtime custom object: ' + e.message + ', stack: ' + e.stack);
        return getRuntimeObject(runtimeObjectID);
    }
    return customObject;
}

/**
 * @desc Creates the runtime custom object
 * @param {string} runtimeObjectID - The runtime object ID
 * @returns {dw.object.CustomObject} - runtime custom object
 */
function createRuntimeObject(runtimeObjectID) {
    var customObjectType = config.customObjectType.RunTime;
    var customObject;

    try {
        Transaction.begin();
        customObject = CustomObjectMgr.createCustomObject(customObjectType, runtimeObjectID);
        Transaction.commit();
    } catch (e) {
        logger.error('Error ocurred while creating runtime custom object: ' + e.message + ', stack: ' + e.stack);
        return createRuntimeObject(runtimeObjectID);
    }
    return customObject;
}

/**
 * @desc Sets last imported time to custom object
 * @param {Object} args - Job parameters
 */
function setLastImportedTime(args) {
    var customObject = getRuntimeObject(args.RuntimeObjectID);

    if (!customObject) {
        customObject = createRuntimeObject(args.RuntimeObjectID);
    }
    var format = 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'';

    if (args.RuntimeObjectID === 'AkeneoCatalogRunTime') {
        format = 'yyyy-MM-dd HH:mm:ss';
    }

    var timestamp = customCacheWebdav.getCache(StringUtils.format(config.cacheDirectory.temporaryTimestamp.endPoint, args.RuntimeObjectID), 'text');

    if (!timestamp) {
        timestamp = StringUtils.formatCalendar(new Calendar(), format);
    }

    try {
        Transaction.begin();
        customObject.custom.lastImportedTime = timestamp;
        Transaction.commit();
    } catch (e) {
        logger.error('Error occurred while setting lastImportedTime: ' + e.message + ', stack: ' + e.stack);
        setLastImportedTime(args);
    }
}

/**
 * @desc Fetches last imported time from runtime custom object
 * @param {string} runtimeObjectID - The runtime object ID
 * @returns {string} - last imported time
 */
function getLastImportedTime(runtimeObjectID) {
    var customObject = getRuntimeObject(runtimeObjectID);

    if (customObject && customObject.custom.lastImportedTime && !customObject.custom.isFullImport) {
        return customObject.custom.lastImportedTime;
    }
    return '';
}

/**
 * @desc Clears last imported time from runtime custom object
 * @param {Object} args - Job parameters
 */
function clearImportedTime(args) {
    var customObject = getRuntimeObject(args.RuntimeObjectID);

    if (customObject) {
        try {
            Transaction.begin();
            customObject.custom.lastImportedTime = '';
            Transaction.commit();
        } catch (e) {
            logger.error('Error ocurred while clearing lastImportedTime: ' + e.message + ', stack: ' + e.stack);
            clearImportedTime(args);
        }
    }
}

/**
 * @desc sets temporary timestamp to custom cache at start of job
 * @param {Object} args - Job parameters
 */
function setTemporaryTimestamp(args) {
    var format = 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'';

    if (args.RuntimeObjectID === 'AkeneoCatalogRunTime') {
        format = 'yyyy-MM-dd HH:mm:ss';
    }

    try {
        customCacheWebdav.setCache(StringUtils.format(config.cacheDirectory.temporaryTimestamp.endPoint, args.RuntimeObjectID),
            StringUtils.formatCalendar(new Calendar(), format));
    } catch (e) {
        logger.error('Error occurred while setting temporaryTimestamp: ' + e.message + ', stack: ' + e.stack);
        setTemporaryTimestamp(args);
    }
}

/**
 * Sets the flag for import type on AkeneoRuntime object
 *
 * @param {Object} args - job parameters
 */
function setImportType(args) {
    var customObject = getRuntimeObject(args.RuntimeObjectID);

    if (customObject) {
        try {
            Transaction.begin();
            customObject.custom.isFullImport = (args.IsFullImport === 'true');
            Transaction.commit();
        } catch (e) {
            logger.error('Error ocurred while marking isFullImport flag: ' + e.message + ', stack: ' + e.stack);
            setImportType(args);
        }
    }
}

/* Exported functions */
module.exports = {
    setTemporaryTimestamp: setTemporaryTimestamp,
    setLastImportedTime: setLastImportedTime,
    getLastImportedTime: getLastImportedTime,
    clearImportedTime: clearImportedTime,
    setImportType: setImportType
};
