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
/** @file Functions related to  */
Numbas.queueScript('download', ['jme'], function () {


    /** Functions related to
     *
     * @namespace Numbas.download */
    var download = Numbas.download = /** @lends Numbas.download */ {

        
        /**
         * Dynamically creates and enacts a download link for a provided file.
         * This is necessary if the contents of the file can change after the button is loaded but before it is clicked
         * 
         * @param {string} contents 
         */
        download_file: function (contents,filename,mime_type) {
            //pulled from https://stackoverflow.com/questions/8310657/how-to-create-a-dynamic-file-link-for-download-in-javascript
            mime_type = mime_type || 'text/plain';
            var blob = new Blob([contents], { type: mime_type });
            var dlink = document.createElement('a');
            document.body.appendChild(dlink); //may be necessary for firefox/some browsers
            dlink.download = filename;
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