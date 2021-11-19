'use strict';

var File = require('dw/io/File');
var Logger = require('dw/system/Logger');

var akeneoPrepareImport = {};

/**
 * @desc Prepare directory, create an archive of specified meta file, and remove other files found
 * @param {Array} filesList - list of files
 * @param {string} AkeneoFluxPath - akeneo flux path
 * @param {string} archiveFileName - archive file name
 * @returns {void}
 */
function createArchiveZip(filesList, AkeneoFluxPath, archiveFileName) {
    var FileUtils = require('~/cartridge/scripts/io/libFileUtils').FileUtils;
    var StringUtils = require('dw/util/StringUtils');
    var Calendar = require('dw/util/Calendar');
    var fileIndex = 1;
    // define archive directory
    var AkeneoFluxPathArchive = new File(AkeneoFluxPath + File.SEPARATOR + 'archives' + File.SEPARATOR + archiveFileName + StringUtils.formatCalendar(new Calendar(), 'yyyMMddHHmmss') + '.zip');
    FileUtils.createFileAndFolders(AkeneoFluxPathArchive);

    // archive which need to be imported
    var InstanceArchivePath = new File(File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'instance' + File.SEPARATOR + archiveFileName + '.zip');

    var filesIterator = filesList.iterator();

    while (filesIterator.hasNext()) {
        var file = filesIterator.next();
        // create full path of the archive
        var AkeneoArchiveMeta = new File(AkeneoFluxPath + File.SEPARATOR + archiveFileName + File.SEPARATOR + 'meta' + File.SEPARATOR + fileIndex + '-system-objecttype-extensions.xml');
        FileUtils.createFileAndFolders(AkeneoArchiveMeta);

        // move the last generated file into correct folder
        file.renameTo(AkeneoArchiveMeta);
        fileIndex++;
    }

    // create archive
    var tempArchiveZip = new File(AkeneoFluxPath + File.SEPARATOR + archiveFileName);
    var zipFile = new File(AkeneoFluxPath + File.SEPARATOR + archiveFileName + '.zip');

    tempArchiveZip.zip(zipFile);

    // clean directory
    FileUtils.deleteDirectory(tempArchiveZip);

    filesIterator = filesList.iterator();
    while (filesIterator.hasNext()) {
        filesIterator.next().remove();
    }
    // save a copy of the imported file
    FileUtils.copyFile(zipFile.getFullPath(), AkeneoFluxPathArchive.getFullPath());

    // move Archive into instance path
    zipFile.renameTo(InstanceArchivePath);
}

/**
 * @desc This function is used for prepare import of Akeneo Flux
 * if AkeneoFluxPath passed is a directory, we consider that folder have to be imported and it must be compress into zip Archive for being imported by the instance & clean directories
 *
 * @must define a parameter in folder case which correspond to the full path of archive
 *
 * @param {string} akeneoFluxPath - akeneo flux path
 * @param {string} archiveFileName - archive file name
 */
akeneoPrepareImport.prepareFileForImport = function (akeneoFluxPath, archiveFileName) {
    var AkeneoFluxPath = new File(akeneoFluxPath);

    if (AkeneoFluxPath.isDirectory()) {
        // filter on file only
        var filesList = AkeneoFluxPath.listFiles(function (file) {
            return file.isFile();
        });

        if (filesList.getLength() === 0) { // No file generated during job - Need a dummy file because ImportSiteArchive will fail otherwise
            var akeneoAttributes = require('~/cartridge/scripts/akeneoAttributes/akeneoAttributes');
            filesList = akeneoAttributes.generateDummyAttributeXml(akeneoFluxPath);
        }
        filesList.sort(); // sort on natural order
        try {
            createArchiveZip(filesList, akeneoFluxPath, archiveFileName);
        } catch (e) {
            Logger.error('ERROR : While preparing archive ZIP for import : ' + e.stack + ' with Error: ' + e.message);
        }
    }
};

/* Exported functions */
module.exports = akeneoPrepareImport;
