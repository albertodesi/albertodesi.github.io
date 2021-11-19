'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Result = require('dw/svc/Result');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var Transaction = require('dw/system/Transaction');
var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var config = generalUtils.config;
var logUtils = require('~/cartridge/scripts/utils/logUtils');
var logger = logUtils.getLogger('akeneoGetToken');

var akeneoGetToken = {};

/**
 * @desc Retrieves token from custom object
 * @returns {Object|null} Token and expiry time object or null if CO not found
 */
function getExistingToken() {
    var tokenCustomObjectType = config.customObjectType.AccessToken;
    var tokenCustomObject = CustomObjectMgr.getCustomObject(tokenCustomObjectType, tokenCustomObjectType);
    var tokenObject;

    if (tokenCustomObject) {
        if (tokenCustomObject.custom.serviceGeneralURL === config.serviceGeneralUrl) {
            tokenObject = {
                token: tokenCustomObject.custom.token,
                expiryTime: tokenCustomObject.custom.tokenExpiryTime
            };
            return tokenObject;
        }
    }
    return null;
}

/**
 * @desc Calls Akeneo Service to retrieve token
 * @param {number} count - the retry count in case of failure
 * @returns {Object} - token and expiry time or throws Error in case of failure
 */
function generateToken(count) {
    var retryCount = count;
    var initAkeneoServices = require('~/cartridge/scripts/akeneoServices/initAkeneoServices');
    var tokenConfig = {
        tokenURL: config.APIURL.endpoints.tokenAPIURL,
        clientID: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoClientID') : '',
        secret: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoSecret') : '',
        login: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoLogin') : '',
        password: Site.current.preferences ? Site.current.getCustomPreferenceValue('akeneoPassword') : ''
    };
    var localToken = StringUtils.encodeBase64(tokenConfig.clientID + ':' + tokenConfig.secret);
    var akeneoService = initAkeneoServices.getTokenService();
    akeneoService.setURL(config.serviceGeneralUrl + tokenConfig.tokenURL);

    var akeneoServiceResponse = akeneoService.call({
        login: tokenConfig.login,
        password: tokenConfig.password,
        localToken: localToken
    });

    // You shall not PASS !! =D
    if (akeneoServiceResponse.getStatus() !== Result.OK) {
        logger.error('ERROR : While retrieving token with code: ' + akeneoServiceResponse.getError() + ', message: ' + akeneoServiceResponse.getErrorMessage() + ' retrying... ' + retryCount);
        if (++retryCount < config.APIURL.retryLimit) {
            return generateToken(retryCount);
        }
        throw new Error('ERROR : While retrieving token with code: ' + akeneoServiceResponse.getError() + ', message: ' + akeneoServiceResponse.getErrorMessage());
    }

    var akeneoResult = JSON.parse(akeneoServiceResponse.object.text);

    return {
        token: akeneoResult.access_token,
        expiryTime: akeneoResult.expires_in
    };
}

/**
 * @desc Saves the token and expiry time to Custom Object
 * @param {Object} tokenObject - the token and expiry time to save to CO
 */
function saveTokenToCustomObject(tokenObject) {
    var tokenCustomObjectType = config.customObjectType.AccessToken;
    var tokenCustomObject = CustomObjectMgr.getCustomObject(tokenCustomObjectType, tokenCustomObjectType);

    Transaction.begin();
    if (!tokenCustomObject) {
        tokenCustomObject = CustomObjectMgr.createCustomObject(tokenCustomObjectType, tokenCustomObjectType);
    }
    var currentTimestamp = new Date().getTime();
    var tokenExpiryTime = (tokenObject.expiryTime * 1000) + currentTimestamp;


    tokenCustomObject.custom.token = tokenObject.token;
    tokenCustomObject.custom.tokenExpiryTime = tokenExpiryTime;
    tokenCustomObject.custom.serviceGeneralURL = config.serviceGeneralUrl;
    Transaction.commit();
}

/**
 * @desc Returns token for calling AkeneoService
 * @returns {string} - token for calling Akeneo Services
 */
akeneoGetToken.getToken = function () {
    var tokenObject = getExistingToken();

    if (tokenObject) {
        var currentTimestamp = new Date().getTime();

        if (currentTimestamp < tokenObject.expiryTime - config.APIURL.timeout) {
            return tokenObject.token;
        }
    }
    tokenObject = generateToken(0);
    saveTokenToCustomObject(tokenObject);

    return tokenObject.token;
};

/* Exported functions */
module.exports = akeneoGetToken;
