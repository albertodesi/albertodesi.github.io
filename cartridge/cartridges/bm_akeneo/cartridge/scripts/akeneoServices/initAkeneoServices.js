'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

var initAkeneoServices = {};

/**
 * @desc Get token service
 * @returns {Object} - Service used to call Akeneo API
 */
initAkeneoServices.getTokenService = function () {
    var akeneoGetTokenConfig = {
        createRequest: function (svc, params) {
            svc.setRequestMethod('POST');
            svc.addHeader('Cache-Control', 'no-cache');
            svc.addHeader('Authorization', 'Basic ' + params.localToken);
            svc.addHeader('Content-type', 'application/json');

            return JSON.stringify({
                grant_type: 'password',
                username: params.login,
                password: params.password
            });
        },
        parseResponse: function (svc, result) {
            return result;
        },
        filterLogMessage: function (msg) {
            // No user data is getting logged
            return msg;
        }
    };
    return LocalServiceRegistry.createService('AkeneoGetToken', akeneoGetTokenConfig);
};

/**
 * @desc Get general api service
 * @returns {Object} - Service used to call Akeneo API
 */
initAkeneoServices.getGeneralService = function () {
    var akeneoGetToken = require('~/cartridge/scripts/akeneoServices/akeneoGetToken');
    var akeneoGetGeneralConfig = {
        createRequest: function (svc, params) {
            svc.setRequestMethod('GET');
            svc.addHeader('Cache-Control', 'no-cache');
            svc.addHeader('Authorization', 'Bearer ' + akeneoGetToken.getToken());
            svc.addHeader('Content-type', 'application/json');

            if (params && params.outputFile && params.fileToOutput) {
                svc.setOutFile(params.fileToOutput);
            }
            return;
        },
        parseResponse: function (svc, result) {
            return result;
        },
        filterLogMessage: function (msg) {
            // No user data is getting logged
            return msg;
        }
    };
    return LocalServiceRegistry.createService('AkeneoGetGeneral', akeneoGetGeneralConfig);
};

/* Exported functions */
module.exports = initAkeneoServices;
