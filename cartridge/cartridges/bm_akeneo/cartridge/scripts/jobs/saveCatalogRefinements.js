'use strict';

var StringUtils = require('dw/util/StringUtils');
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var XMLStreamReader = require('dw/io/XMLStreamReader');
var XMLStreamConstants = require('dw/io/XMLStreamConstants');
var customCacheWebdav = require('~/cartridge/scripts/io/customCacheWebdav');
var config = require('~/cartridge/scripts/utils/generalUtils').config;

/**
 * @desc reads a single catalog XML file and saves refinement definitions to custom cache
 * @param {dw.io.File} catalogFile - catalog XML file
 */
function saveCatalogRefinements(catalogFile) {
    var fileReader;
    var xmlStreamReader;
    var catalogID;

    try {
        fileReader = new FileReader(catalogFile);
        xmlStreamReader = new XMLStreamReader(fileReader);

        while (xmlStreamReader.hasNext()) {
            if (xmlStreamReader.next() === XMLStreamConstants.START_ELEMENT) {
                var localElementName = xmlStreamReader.getLocalName();

                if (localElementName === 'catalog') {
                    catalogID = xmlStreamReader.getAttributeValue(null, 'catalog-id');
                }
                if (localElementName === 'category') {
                    // read single 'category' as XML
                    var category = xmlStreamReader.readXMLObject();
                    var categoryString = category.toXMLString();

                    if (categoryString.indexOf('<refinement-definitions>') !== -1) {
                        var categoryRefinementEndpoint = StringUtils.format(config.cacheDirectory.categoryRefinements.endPoint, catalogID, category.attribute('category-id'));
                        var categoryRefinementText = categoryString.substring(categoryString.indexOf('<refinement-definitions>'), categoryString.indexOf('</refinement-definitions>')) + '</refinement-definitions>';
                        customCacheWebdav.setCache(categoryRefinementEndpoint, categoryRefinementText);
                    }
                }
            }
        }
    } catch (e) {
        throw new Error('ERROR: occurred in reading catalog XML: ' + e.getMessage() + ', stack: ' + e.getStackTrace());
    } finally {
        if (xmlStreamReader) {
            xmlStreamReader.close();
        }
        if (fileReader) {
            fileReader.close();
        }
    }
}

/**
 * @desc reads the catalog XML files in the location and sends them to be processed and archives them
 */
function readCatalogFiles() {
    customCacheWebdav.clearCache(config.cacheDirectory.categoryRefinements.baseLocation);
    var AKENEO_FLUX_LOCATION = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'catalog';
    var AKENEO_FLUX_ARCHIVE_LOCATION = AKENEO_FLUX_LOCATION + File.SEPARATOR + 'archives' + File.SEPARATOR + 'processed';
    new File(AKENEO_FLUX_ARCHIVE_LOCATION).mkdirs();
    var folder = new File(AKENEO_FLUX_LOCATION);
    var files = folder.listFiles(function (file) {
        return file.isFile();
    });
    var filesIterator = files.iterator();

    while (filesIterator.hasNext()) {
        var catalogFile = filesIterator.next();
        saveCatalogRefinements(catalogFile);
        catalogFile.renameTo(new File(AKENEO_FLUX_ARCHIVE_LOCATION + File.SEPARATOR + catalogFile.getName()));
    }
}

module.exports = {
    readCatalogFiles: readCatalogFiles
};
