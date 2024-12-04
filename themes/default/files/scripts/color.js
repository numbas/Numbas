Numbas.queueScript('display-color', [], function() {
    /** Based on culori.js
     *
     * MIT License
     * 
     * Copyright (c) 2018 Dan Burzo
     * 
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     * 
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     * 
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */

    var k = Math.pow(29, 3) / Math.pow(3, 3);
    var e = Math.pow(6, 3) / Math.pow(29, 3);

    var D65 = {
        X: 0.3127 / 0.329,
        Y: 1,
        Z: (1 - 0.3127 - 0.329) / 0.329
    };

    var f = (value) => value > e ? Math.cbrt(value) : (k * value + 16) / 116;

    /** Convert a colour in XYZ65 format to LAB65.
     */
    var convertXyz65ToLab65 = ({ x, y, z, alpha }) => {
        let f0 = f(x / D65.X);
        let f1 = f(y / D65.Y);
        let f22 = f(z / D65.Z);
        let res = {
            mode: "lab65",
            l: 116 * f1 - 16,
            a: 500 * (f0 - f1),
            b: 200 * (f1 - f22)
        };
        if (alpha !== void 0) {
            res.alpha = alpha;
        }
        return res;
    };
    var convertXyz65ToLab65_default = convertXyz65ToLab65;

    /** Convert a colour in RGB format to XYZ65.
     */
    var convertRgbToXyz65 = (rgb4) => {
        let { r: r2, g, b, alpha } = convertRgbToLrgb_default(rgb4);
        let res = {
            mode: "xyz65",
            x: 0.4123907992659593 * r2 + 0.357584339383878 * g + 0.1804807884018343 * b,
            y: 0.2126390058715102 * r2 + 0.715168678767756 * g + 0.0721923153607337 * b,
            z: 0.0193308187155918 * r2 + 0.119194779794626 * g + 0.9505321522496607 * b
        };
        if (alpha !== void 0) {
            res.alpha = alpha;
        }
        return res;
    };
    var convertRgbToXyz65_default = convertRgbToXyz65;

    /** Convert a colour in RGB format to LAB65.
     */
    var convertRgbToLab65 = (rgb4) => {
        let res = convertXyz65ToLab65_default(convertRgbToXyz65_default(rgb4));
        if (rgb4.r === rgb4.b && rgb4.b === rgb4.g) {
            res.a = res.b = 0;
        }
        return res;
    };
    var convertRgbToLab65_default = convertRgbToLab65;


    /** Convert a colour in lRGB format to Oklab.
     */
    var convertLrgbToOklab = ({ r: r2, g, b, alpha }) => {
        let L = Math.cbrt(
            0.41222147079999993 * r2 + 0.5363325363 * g + 0.0514459929 * b
        );
        let M2 = Math.cbrt(
            0.2119034981999999 * r2 + 0.6806995450999999 * g + 0.1073969566 * b
        );
        let S = Math.cbrt(
            0.08830246189999998 * r2 + 0.2817188376 * g + 0.6299787005000002 * b
        );
        let res = {
            mode: "oklab",
            l: 0.2104542553 * L + 0.793617785 * M2 - 0.0040720468 * S,
            a: 1.9779984951 * L - 2.428592205 * M2 + 0.4505937099 * S,
            b: 0.0259040371 * L + 0.7827717662 * M2 - 0.808675766 * S
        };
        if (alpha !== void 0) {
            res.alpha = alpha;
        }
        return res;
    };
    var convertLrgbToOklab_default = convertLrgbToOklab;

    var rgb_lrgb_fn = (c4) => {
        const abs3 = Math.abs(c4);
        if (abs3 <= 0.04045) {
            return c4 / 12.92;
        }
        return (Math.sign(c4) || 1) * Math.pow((abs3 + 0.055) / 1.055, 2.4);
    };

    /** Convert a colour in RGB format to lRGB.
     */
    var convertRgbToLrgb = ({ r: r2, g, b, alpha }) => {
        let res = {
            mode: "lrgb",
            r: rgb_lrgb_fn(r2),
            g: rgb_lrgb_fn(g),
            b: rgb_lrgb_fn(b)
        };
        if (alpha !== void 0)
            res.alpha = alpha;
        return res;
    };
    var convertRgbToLrgb_default = convertRgbToLrgb;

    /** Convert a colour in RGB format to Oklab.
     */
    var convertRgbToOklab = (rgb4) => {
        let res = convertLrgbToOklab_default(convertRgbToLrgb_default(rgb4));
        if (rgb4.r === rgb4.b && rgb4.b === rgb4.g) {
            res.a = res.b = 0;
        }
        return res;
    };
    var convertRgbToOklab_default = convertRgbToOklab;

    /** Convert a colour in Oklab format to Lrgb.
     */
    var convertOklabToLrgb = ({ l, a, b, alpha }) => {
        let L = Math.pow(
            l * 0.9999999984505198 + 0.39633779217376786 * a + 0.2158037580607588 * b,
            3
        );
        let M2 = Math.pow(
            l * 1.0000000088817609 - 0.10556134232365635 * a - 0.06385417477170591 * b,
            3
        );
        let S = Math.pow(
            l * 1.0000000546724108 - 0.08948418209496575 * a - 1.2914855378640917 * b,
            3
        );
        let res = {
            mode: "lrgb",
            r: 4.076741661347994 * L - 3.307711590408193 * M2 + 0.230969928729428 * S,
            g: -1.2684380040921763 * L + 2.6097574006633715 * M2 - 0.3413193963102197 * S,
            b: -0.004196086541837188 * L - 0.7034186144594493 * M2 + 1.7076147009309444 * S
        };
        if (alpha !== void 0) {
            res.alpha = alpha;
        }
        return res;
    };

    /** Convert a colour in Oklab format to Oklch.
     */
    var convertLabToLch = ({ l, a, b, alpha }, mode = "lch") => {
        let c4 = Math.sqrt(a * a + b * b);
        let res = { mode, l, c: c4 };
        if (c4)
            res.h = normalizeHue_default(Math.atan2(b, a) * 180 / Math.PI);
        if (alpha !== void 0)
            res.alpha = alpha;
        return res;
    };

    var normalizeHue = (hue3) => (hue3 = hue3 % 360) < 0 ? hue3 + 360 : hue3;
    var normalizeHue_default = normalizeHue;

    /** Convert a colour in Oklch format to Oklab.
     */
    function convertLchToLab({ l, c: c4, h, alpha }, mode = "lab") {
        let res = {
            mode,
            l,
            a: c4 ? c4 * Math.cos(h / 180 * Math.PI) : 0,
            b: c4 ? c4 * Math.sin(h / 180 * Math.PI) : 0
        };
        if (alpha !== void 0)
            res.alpha = alpha;
        return res;
    };

    /** Convert a colour in RGB format to Oklch.
     */
    function convertRgbToOklch(col) {
        return convertLabToLch(convertRgbToOklab(col));
    }

    /** Convert a colour in Oklch format to RGB.
     */
    function convertOklchToRgb(col) {
        return convertLabToRgb(convertLchToLab(col));
    }

    /** Linear interpolation between `a` and `b`.
     *
     * @param {number} a
     * @param {number} b
     * @param {number} t
     * @returns {number}
     */
    function lerp(a, b, t) {
        if(a===undefined) {
            return b;
        }
        if(b===undefined) {
            return a;
        }
        return (1-t)*a + t*b;
    }

    /** By Christian Lawson-Perfect
    */

    /** Parse a hex string to an RGB colour object.
     *
     * @param {string} hex
     * @returns {Color.rgb}
     */
    function parseRGB(hex) {
        var r = parseInt(hex.slice(1,3),16);
        var g = parseInt(hex.slice(3,5),16);
        var b = parseInt(hex.slice(5,7),16);
        return {r: r/255, g: g/255, b: b/255, mode: 'rgb'} ;
    }

    /** Mix two colours in Oklch colour space.
     *
     * @param {Color.oklab} oklab1
     * @param {Color.oklab} oklab2
     * @param {number} t
     *
     * @returns {Color}
     */
    function mix(oklab1, oklab2, t) {
        const {l: l1, c: c1, h: h1} = oklab1;
        const {l: l2, c: c2, h: h2} = oklab2;

        return {l: lerp(l1,l2,t), c: lerp(c1,c2,t), h: c2==0 ? h1 : lerp(h1,h2,t), mode: 'oklch'};
    }

    /*
      Delta Phi Star perceptual lightness contrast by Andrew Somers:
      https://github.com/Myndex/deltaphistar 
    */
    const PHI = (1 + Math.sqrt(5))/2;

    /** Perceptual contrast between two colours.
     *
     * @param {Color.rgb} a
     * @param {Color.rgb} b
     * @returns {number}
     */
    function dpsContrast(a, b) {
      const dps = Math.abs(Math.pow(convertRgbToLab65(a).l, PHI) - Math.pow(convertRgbToLab65(b).l, PHI));
      const contrast = Math.pow(dps, 1/PHI) * Math.SQRT2 - 40;
      return contrast < 7.5 ? 0 : contrast;
    }

    /** Is the given colour "dark"? True if the contrast against white is more than the contrast against black.
     *
     * @param {Color.rgb} col
     * @returns {boolean}
     */
    function is_dark(col) {
        const black_contrast = dpsContrast(col, {r:0, g:0, b:0, mode: 'rgb'});
        const white_contrast = dpsContrast(col, {r:1, g:1, b:1, mode: 'rgb'});
        return black_contrast < white_contrast;
    }

    /** Which text colour should be used for a given background?
     *
     * @param {Color.rgb} col
     * @returns {string} `"black"` or `"white"`.
     */
    function text_for(col) {
        return is_dark(col) ? 'white' : 'black';
    }

    Numbas.display_color = {
        dpsContrast,
        is_dark,
        text_for,
        parseRGB
    }
});
