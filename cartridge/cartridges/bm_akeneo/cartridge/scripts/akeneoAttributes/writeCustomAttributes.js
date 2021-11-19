'use strict';

var generalUtils = require('~/cartridge/scripts/utils/generalUtils');
var Logger = require('dw/system/Logger');
var ArrayList = require('dw/util/ArrayList');

var writeCustomAttributes = {};

/**
 * Writes Price Attribute.
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
writeCustomAttributes.writePriceAttribute = function (attribute, xmlAttrKey, xswHandle) {
    var channelMatches;
    var attrValue;

    try {
        var productAmount = new ArrayList();

        if (attribute.length > 1 || attribute[0].locale) {
            // loop on localizable attributes
            // EDIT : if there are multiple entrie in one attrs, it does not mean that it's a localizable attr.
            //        It could mean that it has multiple 'scope'
            Object.keys(attribute).forEach(function (index) {
                attrValue = attribute[index];
                var dataCharacter = attrValue.data;

                channelMatches = generalUtils.checkScope(attrValue.scope);

                if (channelMatches) {
                    Object.keys(dataCharacter).forEach(function (key) {
                        var value = dataCharacter[key];
                        if (value.amount) {
                            productAmount.add(value.amount);
                        }
                    });

                    if (productAmount.length > 0) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        Object.keys(dataCharacter).forEach(function (key) {
                            var value = dataCharacter[key];

                            if (value.amount && value.currency) {
                                generalUtils.writeElement(xswHandle, 'value', value.amount + ' ' + value.currency);
                            }
                        });
                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    }

                    if (!dataCharacter) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);
                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }
                        xswHandle.writeEndElement();
                    }
                }
            });
        } else {
            channelMatches = generalUtils.checkScope(attribute[0].scope);

            if (channelMatches) {
                var attrData = attribute[0].data;

                Object.keys(attrData).forEach(function (key) {
                    var value = attrData[key];
                    if (value.amount) {
                        productAmount.add(value.amount);
                    }
                });

                xswHandle.writeStartElement('custom-attribute');
                xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                if (productAmount.length > 0) {
                    Object.keys(attrData).forEach(function (key) {
                        var value = attrData[key];

                        if (value.amount && value.currency) {
                            generalUtils.writeElement(xswHandle, 'value', value.amount + ' ' + value.currency);
                        }
                    });
                }
                // close xml custom-attribute
                xswHandle.writeEndElement();
            }
        }
    } catch (e) {
        Logger.error('ERROR : While writing product custom attributes of type price : ' + e.stack + ' with Error: ' + e.message);
    }
};

/**
 * Writes Metric Attribute.
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
writeCustomAttributes.writeMetricAttribute = function (attribute, xmlAttrKey, xswHandle) {
    var channelMatches;
    var attrValue;

    try {
        if (attribute.length > 1 || attribute[0].locale) {
            // loop on localizable attributes
            // EDIT : if there is multiple entrie in one attrs, it does not mean that it's a localizable attr.
            //        It could mean that it have multiple 'scope'
            Object.keys(attribute).forEach(function (index) {
                attrValue = attribute[index];
                var dataCharacter = attrValue.data;

                channelMatches = generalUtils.checkScope(attrValue.scope);

                if (channelMatches) {
                    if (dataCharacter.amount && dataCharacter.unit) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        generalUtils.writeElement(xswHandle, 'value', dataCharacter.amount + ' ' + dataCharacter.unit);

                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    }

                    if (!dataCharacter) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        xswHandle.writeEndElement();
                    }
                }
            });
        } else {
            channelMatches = generalUtils.checkScope(attribute[0].scope);

            if (channelMatches) {
                var attrData = attribute[0].data;
                xswHandle.writeStartElement('custom-attribute');
                xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                if (attrData.amount && attrData.unit) {
                    generalUtils.writeElement(xswHandle, 'value', attrData.amount + ' ' + attrData.unit);
                }
                // close xml custom-attribute
                xswHandle.writeEndElement();
            }
        }
    } catch (e) {
        Logger.error('ERROR : While writing product custom attributes of type metric : ' + e.stack + ' with Error: ' + e.message);
    }
};

/**
 * Writes General Attribute.
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} parentCode - akeneo parent code
 */
writeCustomAttributes.writeGeneralAttribute = function (attribute, xmlAttrKey, xswHandle, parentCode) {
    var channelMatches;
    var attrValue;

    try {
        if (attribute.length > 1 || attribute[0].locale) {
            // loop on localizable attributes
            // EDIT : if there is multiple entrie in one attrs, it does not mean that it's a localizable attr.
            //        It could mean that it have multiple 'scope'
            Object.keys(attribute).forEach(function (index) {
                attrValue = attribute[index];
                var dataCharacter = attrValue.data;
                channelMatches = generalUtils.checkScope(attrValue.scope);

                if (channelMatches) {
                    if ((dataCharacter || dataCharacter === false) && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        xswHandle.writeCharacters(attrValue.data);

                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    } else if (dataCharacter && typeof (dataCharacter) === 'object' && dataCharacter.length > 0) {
                        xswHandle.writeStartElement('custom-attribute');

                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        Object.keys(dataCharacter).forEach(function (key) {
                            var value = dataCharacter[key];
                            generalUtils.writeElement(xswHandle, 'value', value);
                        });

                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    } else if (!dataCharacter) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        xswHandle.writeEndElement();
                    }
                }
            });
        } else {
            channelMatches = generalUtils.checkScope(attribute[0].scope);

            if (channelMatches) {
                var dataCharacter = attribute[0].data;

                if ((dataCharacter || dataCharacter === false) && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
                    if (parentCode && xmlAttrKey === 'color') {
                        generalUtils.writeElement(xswHandle, 'custom-attribute', dataCharacter, 'attribute-id', 'refinementColor');
                    }

                    generalUtils.writeElement(xswHandle, 'custom-attribute', dataCharacter, 'attribute-id', xmlAttrKey);
                } else {
                    xswHandle.writeStartElement('custom-attribute');
                    xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                    if (dataCharacter && typeof (dataCharacter) === 'object') {
                        if (dataCharacter.amount && dataCharacter.unit) {
                            xswHandle.writeCharacters(dataCharacter.amount + ' ' + dataCharacter.unit);
                        } else if (dataCharacter.amount && dataCharacter.currency) {
                            xswHandle.writeCharacters(dataCharacter.amount + ' ' + dataCharacter.currency);
                        } else {
                            Object.keys(dataCharacter).forEach(function (key) {
                                var value = dataCharacter[key];
                                generalUtils.writeElement(xswHandle, 'value', value);
                            });
                        }
                    }

                    // close xml custom-attribute
                    xswHandle.writeEndElement();
                }
            }
        }
    } catch (e) {
        Logger.error('ERROR : While writing product general custom attributes: ' + e.stack + ' with Error: ' + e.message);
    }
};

/**
 * Writes General Attribute.
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 */
writeCustomAttributes.writeNewDataTypeAttribute = function (attribute, xmlAttrKey, xswHandle) {
    var channelMatches;
    var attrValue;

    try {
        if (attribute.length > 1 || attribute[0].locale) {
            // loop on localizable attributes
            // EDIT : if there is multiple entrie in one attrs, it does not mean that it's a localizable attr.
            //        It could mean that it have multiple 'scope'
            Object.keys(attribute).forEach(function (index) {
                attrValue = attribute[index];
                var dataCharacter = attrValue.data;
                channelMatches = generalUtils.checkScope(attrValue.scope);

                if (channelMatches) {
                    if (dataCharacter && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        xswHandle.writeCharacters(attrValue.data);

                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    } else if (dataCharacter && typeof (dataCharacter) === 'object' && dataCharacter.length > 0) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        xswHandle.writeCharacters(JSON.stringify(dataCharacter));
                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    } else if (!dataCharacter) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        xswHandle.writeEndElement();
                    }
                }
            });
        } else {
            channelMatches = generalUtils.checkScope(attribute[0].scope);

            if (channelMatches) {
                var dataCharacter = attribute[0].data;

                if (dataCharacter && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
                    generalUtils.writeElement(xswHandle, 'custom-attribute', dataCharacter, 'attribute-id', xmlAttrKey);
                } else {
                    xswHandle.writeStartElement('custom-attribute');
                    xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                    if (dataCharacter && typeof (dataCharacter) === 'object') {
                        xswHandle.writeCharacters(JSON.stringify(dataCharacter));
                    }
                    // close xml custom-attribute
                    xswHandle.writeEndElement();
                }
            }
        }
    } catch (e) {
        Logger.error('ERROR : While writing custom attributes of new data types : ' + e.stack + ' with Error: ' + e.message);
    }
};

/**
 * Writes custom entity Attribute.
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} parentCode - akeneo parent code
 * @param {string} referenceDataName - entity reference data name
 */
writeCustomAttributes.writeCustomEntityAttributes = function (attribute, xmlAttrKey, xswHandle, parentCode, referenceDataName) {
    var channelMatches;
    var attrValue;

    try {
        if (attribute.length > 1 || attribute[0].locale) {
            // loop on localizable attributes
            // EDIT : if there are multiple entries in one attributes, it does not mean that it's a localizable attributes.
            // It could mean that it have multiple 'scope'
            Object.keys(attribute).forEach(function (index) {
                attrValue = attribute[index];
                var dataCharacter = attrValue.data;
                channelMatches = generalUtils.checkScope(attrValue.scope);
                if (channelMatches) {
                    if (dataCharacter && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        if (referenceDataName) {
                            xswHandle.writeCharacters('akeneo_entity_' + referenceDataName + '_' + attrValue.data);
                        }
                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    } else if (dataCharacter && typeof (dataCharacter) === 'object' && dataCharacter.length > 0) {
                        xswHandle.writeStartElement('custom-attribute');

                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }

                        Object.keys(dataCharacter).forEach(function (key) {
                            var value = dataCharacter[key];

                            if (referenceDataName) {
                                generalUtils.writeElement(xswHandle, 'value', 'akeneo_entity_' + referenceDataName + '_' + value);
                            }
                        });
                        // close xml custom-attribute
                        xswHandle.writeEndElement();
                    } else if (!dataCharacter) {
                        xswHandle.writeStartElement('custom-attribute');
                        xswHandle.writeAttribute('attribute-id', xmlAttrKey);
                        if (attrValue.locale != null) {
                            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
                        }
                        xswHandle.writeEndElement();
                    }
                }
            });
        } else {
            channelMatches = generalUtils.checkScope(attribute[0].scope);

            if (channelMatches) {
                var dataCharacter = attribute[0].data;

                if (dataCharacter && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
                    if (parentCode && xmlAttrKey === 'color') {
                        generalUtils.writeElement(xswHandle, 'custom-attribute', dataCharacter, 'attribute-id', 'refinementColor');
                    }

                    if (referenceDataName) {
                        generalUtils.writeElement(xswHandle, 'custom-attribute', 'akeneo_entity_' + referenceDataName + '_' + dataCharacter, 'attribute-id', xmlAttrKey);
                    }
                } else {
                    xswHandle.writeStartElement('custom-attribute');
                    xswHandle.writeAttribute('attribute-id', xmlAttrKey);

                    if (dataCharacter && typeof (dataCharacter) === 'object') {
                        Object.keys(dataCharacter).forEach(function (key) {
                            var value = dataCharacter[key];

                            if (referenceDataName) {
                                generalUtils.writeElement(xswHandle, 'value', 'akeneo_entity_' + referenceDataName + '_' + value);
                            }
                        });
                    }
                    // close xml custom-attribute
                    xswHandle.writeEndElement();
                }
            }
        }
    } catch (e) {
        Logger.error('ERROR : While writing product custom attributes of entity type: ' + e.stack + ' with Error: ' + e.message);
    }
};

/**
 * Writes General Attribute.
 * @param {string} dataCharacter - dataCharacter of the attribute data
 * @param {Object} attrValue - object of attribute data value and locales
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} xmlAttrKey - xml attribute key
 */
function writeAttributeData(dataCharacter, attrValue, xswHandle, xmlAttrKey) {
    if ((dataCharacter || dataCharacter === false) && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
        xswHandle.writeStartElement('custom-attribute');
        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

        if (attrValue.locale != null) {
            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
        }

        xswHandle.writeCharacters(attrValue.data);

        // close xml custom-attribute
        xswHandle.writeEndElement();
    } else if (dataCharacter && typeof (dataCharacter) === 'object' && dataCharacter.length > 0) {
        xswHandle.writeStartElement('custom-attribute');

        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

        if (attrValue.locale != null) {
            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
        }

        Object.keys(dataCharacter).forEach(function (key) {
            var value = dataCharacter[key];
            generalUtils.writeElement(xswHandle, 'value', value);
        });

        // close xml custom-attribute
        xswHandle.writeEndElement();
    } else if (!dataCharacter) {
        xswHandle.writeStartElement('custom-attribute');
        xswHandle.writeAttribute('attribute-id', xmlAttrKey);

        if (attrValue.locale != null) {
            xswHandle.writeAttribute('xml:lang', attrValue.locale.replace('_', '-'));
        }

        xswHandle.writeEndElement();
    }
}
/**
 * Writes option code locale labels .
 * @param {Object} attrOptionCodeObj - attributeCode labels object
 * @param {string} dataCharacter - dataCharacter of the attribute data
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} xmlAttrKey - xml attribute key
 */
function writeOptionLocaleValues(attrOptionCodeObj, dataCharacter, xswHandle, xmlAttrKey) {
    if (attrOptionCodeObj) {
        var lables = attrOptionCodeObj.labels;
        var lableKeys = Object.keys(lables);
        lableKeys.unshift('x-default');
        for (var j = 0; j < lableKeys.length; j++) {
            var attrValue = {
                data: dataCharacter,
                locale: lableKeys[j],
                scope: null
            };

            writeAttributeData(dataCharacter, attrValue, xswHandle, xmlAttrKey);
        }
    }
}
/**
 * Writes General Attribute.
 * @param {Object} attribute - attribute object
 * @param {string} xmlAttrKey - xml attribute key
 * @param {dw.io.XMLIndentingStreamWriter} xswHandle - XML writer
 * @param {string} parentCode - akeneo parent code
 * @param {string} akeneoAttrCode - akeneo attribute code
 */
writeCustomAttributes.writeSelectAttribute = function (attribute, xmlAttrKey, xswHandle, parentCode, akeneoAttrCode) {
    var akeneoAttributes = require('~/cartridge/scripts/akeneoAttributes/akeneoAttributes');
    var channelMatches;
    var attrValue;

    try {
        if (attribute.length > 1 || attribute[0].locale) {
            // loop on localizable attributes
            // EDIT : if there is multiple entrie in one attrs, it does not mean that it's a localizable attr.
            //        It could mean that it have multiple 'scope'
            Object.keys(attribute).forEach(function (index) {
                attrValue = attribute[index];
                var dataCharacter = attrValue.data;
                channelMatches = generalUtils.checkScope(attrValue.scope);

                if (channelMatches) {
                    writeAttributeData(dataCharacter, attrValue, xswHandle, xmlAttrKey);
                }
            });
        } else {
            channelMatches = generalUtils.checkScope(attribute[0].scope);
            var attrOptionCodeObj;
            if (channelMatches) {
                var dataCharacter = attribute[0].data;
                if (dataCharacter && (typeof (dataCharacter) === 'string' || typeof (dataCharacter) === 'boolean' || typeof (dataCharacter) === 'number')) {
                    if (parentCode && xmlAttrKey === 'color') {
                        generalUtils.writeElement(xswHandle, 'custom-attribute', dataCharacter, 'attribute-id', 'refinementColor');
                    }
                    generalUtils.writeElement(xswHandle, 'custom-attribute', dataCharacter, 'attribute-id', xmlAttrKey);
                    attrOptionCodeObj = akeneoAttributes.getAttributeOption(akeneoAttrCode, dataCharacter);
                    writeOptionLocaleValues(attrOptionCodeObj, dataCharacter, xswHandle, xmlAttrKey);
                } else if (dataCharacter && (typeof (dataCharacter) === 'object' && dataCharacter.length > 0)) {
                    Object.keys(dataCharacter).forEach(function (key) {
                        var value = dataCharacter[key];
                        attrOptionCodeObj = akeneoAttributes.getAttributeOption(akeneoAttrCode, value);
                        writeOptionLocaleValues(attrOptionCodeObj, dataCharacter, xswHandle, xmlAttrKey);
                    });
                }
            }
        }
    } catch (e) {
        Logger.error('ERROR : While writing product general custom attributes: ' + e.stack + ' with Error: ' + e.message);
    }
};

/* Exported functions */
module.exports = writeCustomAttributes;
