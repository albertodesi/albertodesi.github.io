'use strict';

/**
 * Implementation for a Large Array which can handle an increased number of entries in memory by using 'array of arrays' approach
 * Note: this should not be used in the storefront but is meant only for integration purposes (jobs)
 *
 * Usage:
 *     var LargeArray = require('~/cartridge/scripts/utils/libLargeArray');
 *     var array1 = new LargeArray();
 */

module.exports = function () {
    return {
        MAX_ARRAY_LENGTH: 50, // 10000, // Default Limit: 20,000 (warning at 12,000)
        primaryArray: [],

        /**
         * @desc Method to push objects into the large array
         * @param {Object} object - the object to push into the large array
         */
        push: function (object) {
            var primaryArrayLength = this.primaryArray.length;

            if (primaryArrayLength <= this.MAX_ARRAY_LENGTH) {
                if (primaryArrayLength === 0) {
                    this.primaryArray.push([object]);
                } else {
                    var lastEntry = this.primaryArray[primaryArrayLength - 1];

                    if (lastEntry.length < this.MAX_ARRAY_LENGTH) {
                        lastEntry.push(object);
                    } else if (primaryArrayLength !== this.MAX_ARRAY_LENGTH) {
                        this.primaryArray.push([object]);
                    } else {
                        throw new Error('ERROR in inserting new element in largeArray: ' + JSON.stringify(object) + ', Max Size reached (' + (this.MAX_ARRAY_LENGTH * this.MAX_ARRAY_LENGTH) + ')');
                    }
                }
            } else {
                throw new Error('ERROR in inserting new element in largeArray: ' + JSON.stringify(object) + ', Max Size reached (' + (this.MAX_ARRAY_LENGTH * this.MAX_ARRAY_LENGTH) + ')');
            }
        },

        /**
         * @desc Method to remove and return the last item from the large array
         * @returns {Object} - the last object in the array
         */
        pop: function () {
            var primaryArrayLength = this.primaryArray.length;

            if (primaryArrayLength > 0) {
                return this.primaryArray[primaryArrayLength - 1].pop();
            }
            return undefined;
        },

        /**
         * @desc Method to iterate over the large array by calling the function 'callback' for each item,
         * the function definition should be of the type `function callback (object) {}`
         * @param {function} callback - the function which is called for each item contained in the large array
         */
        forEach: function (callback) {
            for (var i = 0; i < this.primaryArray.length; i++) {
                var subArray = this.primaryArray[i];

                for (var j = 0; j < subArray.length; j++) {
                    callback(subArray[j]);
                }
            }
        },

        /**
         * @desc returns the count of items in the large array
         * @returns {number} - the count of items
         */
        size: function () {
            var size = 0;

            for (var i = 0; i < this.primaryArray.length; i++) {
                size += this.primaryArray[i].length;
            }
            return size;
        }
    };
};
