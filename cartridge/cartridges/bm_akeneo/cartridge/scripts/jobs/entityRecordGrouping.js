'use strict';

var akeneoEntityRecordGroup = require('~/cartridge/scripts/akeneoEntity/akeneoEntityRecordGroup');
var Site = require('dw/system/Site');

/**
 * @desc Write group attributes xml part
 * @param {dw.io.XMLIndentingStreamWriter} groupXswHandle - XML writer
 * @returns {void}
 */
function writeGroupAttributes(groupXswHandle) {
    try {
        var entityRecordGrpConfig = Site.getCurrent().getCustomPreferenceValue('akeneoEntityRecordGrouping') || '{}';
        entityRecordGrpConfig = JSON.parse(entityRecordGrpConfig);

        for (var i = 0; i < entityRecordGrpConfig.length; i++) {
            var eachEntityObj = entityRecordGrpConfig[i];
            var entityID = eachEntityObj.entity_id;
            var entityRecordIDs = eachEntityObj.entity_record_ids;

            for (var j = 0; j < entityRecordIDs.length; j++) {
                var recordID = entityRecordIDs[j];
                var akeneoEntityID = 'akeneo_entity_' + entityID;
                var akeneoEntityRecordID = 'akeneo_entity_' + entityID + '_' + recordID;
                akeneoEntityRecordGroup.writeAkeneoAttributesGroupDefinitions(groupXswHandle, akeneoEntityRecordID, akeneoEntityID);
            }
        }
    } catch (e) {
        throw new Error('ERROR while parsing entity record  group config: ' + e.message);
    }
}

/**
 * @desc calls function to prepare file for import
 * @param {Object} args - job params
 * @returns {void}
 */
function prepareImport(args) {
    var archiveFileName = 'import-meta-content-group-data-akeneo';
    if (args.AkeneoFluxPath) {
        var akeneoPrepareImport = require('~/cartridge/scripts/utils/akeneoPrepareImport');
        akeneoPrepareImport.prepareFileForImport(args.AkeneoFluxPath, archiveFileName);
    }
}

/**
 * @desc This function cleans directory of content asset attributes impex location.
 */
function clearDirectoryContentGroup() {
    var File = require('dw/io/File');
    var AKENEO_CATALOG_FLUX_DIR = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'akeneo' + File.SEPARATOR + 'content-asset-attributes-group' + File.SEPARATOR;

    var AkeneoFluxPath = new File(AKENEO_CATALOG_FLUX_DIR);

    // filter on file only
    var filesList = AkeneoFluxPath.listFiles(function (file) {
        return !file.isDirectory();
    });

    if (filesList && filesList.getLength() > 0) {
        var filesIterator = filesList.iterator();

        while (filesIterator.hasNext()) {
            var file = filesIterator.next();
            file.remove();
        }
    }
}

/**
 * @desc Get custom site preference JSON object for content asset grouping
 * @param {Object} args - job parameters
 * @returns {void}
 */
function groupEntityRecords(args) {
    try {
        // first of all, we clean directory. If necessary, in other jobs, do a step with this function
        clearDirectoryContentGroup();
        var groupWriter = akeneoEntityRecordGroup.writeAttrGroupMetaHeader();
        writeGroupAttributes(groupWriter.xswHandle);
        akeneoEntityRecordGroup.writeAttrGroupFooter(groupWriter);
        prepareImport(args);
    } catch (e) {
        throw new Error('Error occured due to ' + e.stack + ' with Error: ' + e.message);
    }
}

/** Exported functions **/
module.exports = {
    groupEntityRecords: groupEntityRecords
};
