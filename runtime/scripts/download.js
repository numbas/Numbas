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
/** @file Functions related to creating files to download and encrypting them. */
Numbas.queueScript('download', ['jme'], function () {

/** @namespace Numbas.download */
var download = Numbas.download = /** @lends Numbas.download */ {

    /**
     * Dynamically creates and enacts a download link for a provided file.
     * This is necessary if the contents of the file can change after the button is loaded but before it is clicked.
     *
     * @param {string} contents
     * @param {string} filename - The name of the downloaded file.
     * @param {string} mime_type - The MIME type of the file.
     */
    download_file: function (contents, filename, mime_type) {
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
    },

    /*
    Given some key material and some random salt
    derive an AES-GCM key using PBKDF2.
    */
    getEncryptionKey: async function (password, salt) {
        let enc = new TextEncoder();
        let keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        return await window.crypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                salt: salt,
                "iterations": 100000,
                "hash": "SHA-256"
            },
            keyMaterial,
            { "name": "AES-GCM", "length": 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Derive a key from a password supplied by the user, and use the key to encrypt the message.
     * Update the "ciphertextValue" box with a representation of part of the ciphertext.
     *
     * @param {string} message
     * @param {string} password
     * @returns {string}
     */
    encrypt: async function (message, password) {
        const salt = new Uint8Array(16);
        let key = await download.getEncryptionKey(password, salt);
        const iv = new Uint8Array(12);
        let enc = new TextEncoder();
        let encoded = enc.encode(message);

        let ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encoded
        );
        return ciphertext;
    },

    /*
    Derive a key from a password supplied by the user, and use the key
    to decrypt the ciphertext.
    If the ciphertext was decrypted successfully,
    update the "decryptedValue" box with the decrypted value.
    If there was an error decrypting,
    update the "decryptedValue" box with an error message.
    */
    decrypt: async function (ciphertext, password) {
        const salt = new Uint8Array(16);
        const iv = new Uint8Array(12);
        let key = await download.getEncryptionKey(password, salt);

        let decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            ciphertext
        );

        let dec = new TextDecoder();
        return dec.decode(decrypted);

    },

}
});
