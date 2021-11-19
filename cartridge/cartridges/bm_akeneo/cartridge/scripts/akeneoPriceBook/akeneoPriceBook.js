'use strict';

var akeneoPriceBook = {};

/**
 * @desc Write an xml element
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} elementName - element name
 * @param {string} chars - chars to be written
 * @param {string} attrKey - attribute key
 * @param {string} attrValue - attribute value
 * @returns {void}
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
 * @desc This function retrieve all datas needed for price book creation from akeneo product flux
 * @param {dw.util.ArrayList} AkeneoProductsList - list of akeneo products
 * @returns {Object} - price book data
 */
function preparePriceBookForWriting(AkeneoProductsList) {
    var priceBookData = { currency: {} };

    // loop on all product
    var productsIterator = AkeneoProductsList.iterator();

    while (productsIterator.hasNext()) {
        var product = productsIterator.next();

        // check if price exist
        if ('price' in product.values) {
            // loop on all price
            var keyList = Object.keys(product.values.price[0].data);
            for (var j = 0; j < keyList.length; j++) {
                var key = keyList[j];
                var price = product.values.price[0].data[key];

                // create next entry for currency if not existing
                if (typeof priceBookData.currency[price.currency] === 'undefined') {
                    priceBookData.currency[price.currency] = [];
                }

                priceBookData.currency[price.currency].push({ pid: product.identifier, amount: price.amount });
            }
        }
    }

    return priceBookData;
}

/**
 * @desc Writing pricebooks header
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 */
function writePriceBooksHeader(xswHandle) {
    // XML definition & first node
    xswHandle.writeStartDocument('UTF-8', '1.0');
    xswHandle.writeStartElement('pricebooks');
    xswHandle.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/pricebook/2006-10-31');
}

/**
 * @desc Writing price book header
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {string} currency - currency to be written
 * @returns {void}
 */
function writePriceBookHeader(xswHandle, currency) {
    xswHandle.writeStartElement('pricebook');

    xswHandle.writeStartElement('header');
    xswHandle.writeAttribute('pricebook-id', currency.toLowerCase() + '-list-prices');

    writeElement(xswHandle, 'currency', currency.toString());

    writeElement(xswHandle, 'display-name', 'List Prices', 'xml:lang', 'x-default');

    writeElement(xswHandle, 'online-flag', 'true');

    // close header
    xswHandle.writeEndElement();
}

/**
 * @desc Writing price book - price table part
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Array} prices - list of prices
 * @returns {void}
 */
function writePriceBook(xswHandle, prices) {
    xswHandle.writeStartElement('price-tables');

    for (var i = 0; i < prices.length; i++) {
        var price = prices[i];
        xswHandle.writeStartElement('price-table');
        xswHandle.writeAttribute('product-id', price.pid);

        var Productprice = price.amount ? price.amount : 0.0;

        writeElement(xswHandle, 'amount', Productprice, 'quantity', '1');

        // close price-table
        xswHandle.writeEndElement();
    }

    // close price-tables
    xswHandle.writeEndElement();
}

/**
 * @desc Writing single price book footer
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @returns {void}
 */
function writePriceBookFooter(xswHandle) {
    // close pricebook
    xswHandle.writeEndElement();
}

/**
 * @desc Writing pricebooks definition
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @param {Object} priceBooksData - price Book data
 */
function writePriceBooks(xswHandle, priceBooksData) {
    if (priceBooksData.currency) {
        Object.keys(priceBooksData.currency).forEach(function (currency) {
            var prices = priceBooksData.currency[currency];

            writePriceBookHeader(xswHandle, currency);

            writePriceBook(xswHandle, prices);

            writePriceBookFooter(xswHandle);
        });
    }
}

/**
 * @desc Writing price books footer
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 * @returns {void}
 */
function writePriceBooksFooter(xswHandle) {
    // XML pricebooks & close first node
    xswHandle.writeEndElement();
    xswHandle.writeEndDocument();
    xswHandle.flush();
}

/**
 * @desc This function will call Akeneo API with ProductPagination.js then build xml file corresponding to salesforce's price book
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML stream writer
 */
function writePricebookXml(xswHandle) {
    var response;
    var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
    var akeneoProductsUrl = generalUtils.config.APIURL.endpoints.ProductsUrl;
    var productPagination = require('~/cartridge/scripts/akeneoProducts/productPagination');
    var debugConfig = generalUtils.config.debug;
    var pageCounter = 0;

    do {
        var paginationURL = (typeof (response) !== 'undefined' && response.serviceNextURL) ? response.serviceNextURL : null;
        response = productPagination.getProductsList(akeneoProductsUrl, paginationURL);

        if (response.productsList && response.productsList.getLength() > 0) {
            var priceBooksData = preparePriceBookForWriting(response.productsList);
            writePriceBooks(xswHandle, priceBooksData);
        }
        if (debugConfig.breakCodeOnLimit && ++pageCounter >= debugConfig.pageLimit) {
            break;
        }
    } while (response.serviceNextURL !== '');
}

/**
 * @desc This function will call Akeneo API with ProductPagination.js then build xml file corresponding to salesforce's price book
 */
akeneoPriceBook.generatePricebookXml = function () {
    var File = require('dw/io/File');
    var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
    var FileWriter = require('dw/io/FileWriter');
    var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
    var StringUtils = require('dw/util/StringUtils');
    var Calendar = require('dw/util/Calendar');

    var AKENEO_PRICEBOOK_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'pricebook' + File.SEPARATOR;
    var AKENEO_PRICEBOOK_FILE_PATH = 'pricebook-akeneo-' + StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmss') + '.xml';

    var file = new File(AKENEO_PRICEBOOK_FLUX_DIR + AKENEO_PRICEBOOK_FILE_PATH);

    FileUtils.createFileAndFolders(file);

    var fwHandle;
    var xswHandle;

    try {
        // Definition of file handler
        fwHandle = new FileWriter(file);
        xswHandle = new XMLIndentingStreamWriter(fwHandle);

        writePriceBooksHeader(xswHandle);

        writePricebookXml(xswHandle);

        writePriceBooksFooter(xswHandle);
    } catch (e) {
        throw new Error('ERROR : While writing XML Price-book file : ' + e.stack + ' with Error: ' + e.message);
    } finally {
        if (xswHandle != null) {
            xswHandle.close();
        }
        if (fwHandle != null) {
            fwHandle.close();
        }
    }
};

/* Exported functions */
module.exports = akeneoPriceBook;
