/**
 * Return a StringUtilsExt instance
 *
 * @output StringUtilsExt : Object
 *
 */
var StringUtils = require('dw/util/StringUtils');

/**
 * Returns a StringUtilsExt instance
 * @param {string} str - string value
 * @returns {string} - formatted string
 */
var StringUtilsExt = {
    trim: function (str) {
        return StringUtils.trim(str);
    },

    titleize: function (str) {
        if (str == null) return '';
        return str.toLowerCase().replace(/(?:^|\s)\S/g, function (c) { return c.toUpperCase(); });
    },

    capitalize: function (str) {
        var string = (str == null) ? '' : str.toLowerCase();
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    camelize: function (str) {
        return StringUtilsExt.trim(str).toLowerCase().replace(/[-_\s]+(.)?/g, function (match, c) { return c.toUpperCase(); });
    },

    underscored: function (str) {
        return StringUtilsExt.trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    },

    dasherize: function (str) {
        return StringUtilsExt.trim(str).replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
    },

    classify: function (str) {
        return StringUtilsExt.titleize(String(str).replace(/_/g, ' ')).replace(/\s/g, '');
    },

    humanize: function (str) {
        return StringUtilsExt.capitalize(StringUtilsExt.underscored(str).replace(/_id$/, '').replace(/_/g, ' '));
    }
};

/* Exported functions */
module.exports = StringUtilsExt;
