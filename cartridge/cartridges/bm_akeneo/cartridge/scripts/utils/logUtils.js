'use strict';

// Global Variables
var Logger = require('dw/system/Logger');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');

var logUtils = {};

/**
 * Creates custom log file for the cartridge
 * @param {string} category - the category to log in
 * @returns {dw.system.Logger} - logger object
 */
logUtils.getLogger = function (category) {
    var defaultLogFilePrefix = generalUtils.config.customLogFileName;

    if (category) {
        return Logger.getLogger(defaultLogFilePrefix, category);
    }
    return Logger.getLogger(defaultLogFilePrefix);
};

/**
 * Creates custom log file for media and asset errors
 * @param {string} category - the category to log in
 * @returns {dw.system.Logger} - logger object
 */
logUtils.getMediaErrorLogger = function (category) {
    var logFilePrefix = generalUtils.config.customMediaErrorLogFileName;

    if (category) {
        return Logger.getLogger(logFilePrefix, category);
    }
    return Logger.getLogger(logFilePrefix);
};

/* Exported functions */
module.exports = logUtils;
