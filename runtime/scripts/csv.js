/*
Copyright 2022-2023 Newcastle University
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
/** @file Functions related to the download and interpretation of student results, and interaction with the results page, usually for outside-LTI contexts. */
Numbas.queueScript('csv', ['jme'], function () {


    /** Functions related to the download and interpretation of student results, and interaction with the results page, usually for outside-LTI contexts.
     *
     * @namespace Numbas.csv */
    var csv = Numbas.csv = /** @lends Numbas.csv */ {
        // items should be accessible through Numbas.csv.function, so either write them inside this as key:function pairs, or if necessary as:
        //var ensure_decimal = math.ensure_decimal = function(n) { ? We need them to be like this to ensure they're accessible from elsewhere, maybe.

        /** Ensures a string will not cause issues within a csv due to commas, quotes, etc. 
         * 
         * @param {string} cell 
         * @returns {string}
         */
        escape_cell: function (cell) {
            cell = cell + '';
            if (cell.match(/[,"']/)) {
                cell = '"' + cell.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
            }
            return cell;
        },

        /** Escapes each cell of a list of strings such that each will not cause issues within a csv
         * 
         * @param {Array.<string>} cells 
         * @returns {string} 
         */
        make_row: function (cells) {
            return cells.map(csv.escape_cell).join(',');
        },

        /** Escapes each cell of a two-dimensional array of strings such that each will not cause issues within a csv
         * 
         * @param {Array.<Array.<string>>} rows 
         * @returns {string} 
         */
        from_array: function (rows) {
            return rows.map(csv.make_row).join('\n');
        },


        /**
         * 
         * @param {string} file 
         */
        create_and_download_file: function (file) {
            //pulled from https://stackoverflow.com/questions/8310657/how-to-create-a-dynamic-file-link-for-download-in-javascript
            let mime_type = 'text/plain';
            var blob = new Blob([file], { type: mime_type });
            var dlink = document.createElement('a');
            document.body.appendChild(dlink); //may be necessary for firefox/some browsers
            dlink.download = "results.csv";
            dlink.href = window.URL.createObjectURL(blob);
            dlink.onclick = function (e) {
                var that = this;
                setTimeout(function () {
                    window.URL.revokeObjectURL(that.href);
                }, 1500);
            };

            dlink.click()
            dlink.remove()

        }


    }
});