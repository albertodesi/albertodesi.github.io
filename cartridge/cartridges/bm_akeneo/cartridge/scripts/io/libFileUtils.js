'use strict';

var Site = require('dw/system/Site');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var FileReader = require('dw/io/FileReader');

var FileUtils = {};

/**
 * Copy source file to target location. All directories will be created if is necessary.
 *
 * @param {string} sourceString - source string
 * @param {string} targetString - target string
 */
FileUtils.copyFile = function (sourceString, targetString) {
    var source = new File(sourceString);
    var target = new File(targetString);

    if (!source.isDirectory() && !target.isDirectory()) {
        var targetPath = target.fullPath.split(File.SEPARATOR);

        targetPath.pop();
        var targetFolder = targetPath.join(File.SEPARATOR);

        (new File(targetFolder)).mkdirs();
        var fileReader = new FileReader(source, 'latin1');
        var fileWriter = new FileWriter(target, 'latin1', false);

        var bytesToCopy = source.length();
        var buffer;

        do {
            if (bytesToCopy > 10240) {
                buffer = fileReader.readN(10240);
                bytesToCopy -= 10240;
            } else {
                buffer = fileReader.readN(bytesToCopy);
                bytesToCopy = 0;
            }

            if (buffer !== null) {
                fileWriter.write(buffer);
            }
        } while (bytesToCopy !== 0);

        fileReader.close();
        fileWriter.flush();
        fileWriter.close();
    } else {
        target.mkdirs();
        var sourceFile = source;

        var targetZipFileName = target.fullPath + '.zip';
        var targetZipped = new File(targetZipFileName);

        sourceFile.zip(targetZipped);

        var targetDirectory = FileUtils.findFileDirectory(targetZipped);

        targetZipped.unzip(targetDirectory);
        targetZipped.remove();
    }
};

/**
 * Ensures existence of file directories
 *
 * @param {File} targetFile - the target file
 */
FileUtils.ensureFileDirectories = function (targetFile) {
    var targetFilePath = targetFile.fullPath;
    var index = targetFilePath.lastIndexOf(File.SEPARATOR);
    var directoryFilePath = targetFilePath.substr(0, index);

    new File(directoryFilePath).mkdirs();
};

/**
 * Find directory for given file
 *
 * @param {dw.io.File} file - the file to find directory for
 * @returns {dw.io.File} - the directory for the file
 */
FileUtils.findFileDirectory = function (file) {
    var filePath = file.getFullPath();

    var lastSlashIndex = filePath.lastIndexOf('/');
    var directoryPath = filePath.substring(0, lastSlashIndex);
    var directory = new File(directoryPath);

    return directory;
};

/**
 *
 * Delete given directory and all files and sub-directories in it
 *
 * @param {File} file - the directory to delete
 */
FileUtils.deleteDirectory = function (file) {
    if (!file.exists()) {
        return;
    }
    if (!file.isDirectory()) {
        throw new Error('file instance is not directory');
    }

    var fileNames = file.list();

    for (var i = 0; i < fileNames.length; i++) {
        var filePath = file.getFullPath() + File.SEPARATOR + fileNames[i];
        var processedFile = new File(filePath);

        if (processedFile.isDirectory()) {
            FileUtils.deleteDirectory(processedFile);
        } else {
            processedFile.remove();
        }
    }

    file.remove();
};

/**
 * Loop through the directories in Asset directory in catalog and retrieve the final image path
 *
 * @param {dw.io.File} file - the file to get image URL
 * @param {Array} assetsURLSList - The list of asset URLs
 * @returns {Array} - the modified list of asset URLs
 */
FileUtils.getImageURLs = function (file, assetsURLSList) {
    var fileNames = file.list();

    for (var i = 0; i < fileNames.length; i++) {
        var filePath = file.getFullPath() + File.SEPARATOR + fileNames[i];
        var processedFile = new File(filePath);

        if (processedFile.isDirectory()) {
            FileUtils.getImageURLs(processedFile, assetsURLSList);
        } else {
            var pathToBeTrimmed = processedFile.path;
            var finalPath = pathToBeTrimmed.substr(8);
            assetsURLSList.add(finalPath);
        }
    }
    return assetsURLSList;
};

/**
 *
 * creates a file and it's parent folder in case it does not exist
 *
 * @param {File} file - The target file
 */
FileUtils.createFileAndFolders = function (file) {
    var path = file.fullPath.split(File.SEPARATOR);

    path.pop();
    var folder = new File(path.join(File.SEPARATOR));

    if (!folder.exists()) {
        folder.mkdirs();
    }

    if (!file.exists()) {
        file.createNewFile();
    }
};

/**
 * checks a file pattern for specific placeholders and exchanges them
 * valid placeholders: {siteID}
 *
 * @param {string} filePattern - original filePattern
 * @return {string} - modified filePattern
 */
FileUtils.checkFilePatternForPlaceholders = function (filePattern) {
    if (!filePattern) {
        throw new Error('filePattern was empty');
    }

    if (filePattern.match(/\{siteID\}/)) {
        var siteID = Site.getCurrent().getID();

        if (siteID === 'Sites-Site') {
            throw new Error('SiteID placeholder found but site context missing');
        }

        return filePattern.replace(/\{siteID\}/ig, siteID);
    }

    return filePattern;
};

/* Exported functions */
if (typeof (exports) !== 'undefined') {
    exports.FileUtils = FileUtils;
}
