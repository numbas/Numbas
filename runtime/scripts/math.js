/*
Copyright 2011-14 Newcastle University
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
/** @file Mathematical functions, providing stuff that the built-in `Math` object doesn't, as well as vector and matrix math operations.
 *
 * Provides {@link Numbas.math}, {@link Numbas.vectormath} and {@link Numbas.matrixmath}
 */
Numbas.queueScript('math', ['base', 'decimal'], function() {

    /** The maximum number of decimal places a float (JS Number object) can be rounded to.
     */
    var MAX_FLOAT_PRECISION = 17;

    Decimal.set({
        precision: 40,
        modulo: Decimal.EUCLID,
        toExpPos: 1000,
        toExpNeg: -1000
    });

/** Mathematical functions, providing stuff that the built-in `Math` object doesn't.
 *
 * @namespace Numbas.math
 */

/** A complex number.
 *
 * @typedef complex
 * @property {number} re - The real part.
 * @property {number} im - The imaginary part.
 */
/** @typedef range
 * A range of numbers, separated by a constant interval and between fixed lower and upper bounds.
 *
 * @type {Array.<number>}
 * @property {number} 0 Minimum value
 * @property {number} 1 Maximum value
 * @property {number} 2 Step size
 * @see Numbas.math.defineRange
 */
/** @typedef matrix
 * A 2D array of numbers.
 *
 * @type {Array.<Array.<number>>}
 * @property {number} rows - The number of rows in the matrix.
 * @property {number} columns - The number of columns in the matrix.
 */
/** @typedef fraction_matrix
 * A 2D array of fractions.
 *
 * @type {Array.<Array.<Numbas.math.Fraction>>}
 * @property {number} rows - The number of rows in the array.
 * @property {number} columns - The number of columns in the array.
 */

/** If `num` is not a BigInt value, convert it to one.
 *
 * @param {number|string|bigint} num
 * @returns {bigint}
 * @memberof Numbas.math
 */
var ensure_bigint = function(num) {
    try {
        num = BigInt(num);
    } catch {
        num = BigInt(Math.round(num));
    }
    return num;
}

var math = Numbas.math = /** @lends Numbas.math */ {
    ensure_bigint: ensure_bigint,

    /** Regex to match numbers in scientific notation.
     *
     * @type {RegExp}
     * @memberof Numbas.math
     */
    re_scientificNumber: /(-?(?:0|[1-9]\d*)(?:\.\d+)?)[eE]([+-]?\d+)/,
    /** Construct a complex number from real and imaginary parts.
     *
     * Elsewhere in this documentation, `{number}` will refer to either a JavaScript float or a {@link complex} object, interchangeably.
     *
     * @param {number} re
     * @param {number} im
     * @returns {complex}
     */
    complex: function(re, im) {
        if(!im) {
            return re;
        } else {
            return {re: re, im: im, complex: true,
                toString: math.complexToString}
        }
    },
    /** String version of a complex number.
     *
     * @see Numbas.math.niceNumber
     * @function
     * @returns {string}
     */
    complexToString: function() {
        return math.niceNumber(this);
    },
    /** Negate a number.
     *
     * @param {number} n
     * @returns {number}
     */
    negate: function(n) {
        if(n.complex) {
            return math.complex(-n.re, -n.im);
        } else {
            return -n;
        }
    },
    /** Complex conjugate.
     *
     * @param {number} n
     * @returns {number}
     */
    conjugate: function(n) {
        if(n.complex) {
            return math.complex(n.re, -n.im);
        } else {
            return n;
        }
    },
    /** Add two numbers.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    add: function(a, b) {
        if(a.complex) {
            if(b.complex) {
                return math.complex(a.re + b.re, a.im + b.im);
            } else {
                return math.complex(a.re + b, a.im);
            }
        } else {
            if(b.complex) {
                return math.complex(a + b.re, b.im);
            } else {
                return a + b;
            }
        }
    },
    /** Subtract one number from another.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    sub: function(a, b) {
        if(a.complex) {
            if(b.complex) {
                return math.complex(a.re - b.re, a.im - b.im);
            } else {
                return math.complex(a.re - b, a.im);
            }
        } else {
            if(b.complex) {
                return math.complex(a - b.re, -b.im);
            } else {
                return a - b;
            }
        }
    },
    /** Multiply two numbers.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    mul: function(a, b) {
        if(a.complex) {
            if(b.complex) {
                return math.complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
            } else {
                return math.complex(a.re * b, a.im * b);
            }
        } else {
            if(b.complex) {
                return math.complex(a * b.re, a * b.im);
            } else {
                return a * b;
            }
        }
    },
    /** Divide one number by another.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    div: function(a, b) {
        if(a.complex) {
            if(b.complex) {
                const q = b.re * b.re + b.im * b.im;
                return math.complex((a.re * b.re + a.im * b.im) / q, (a.im * b.re - a.re * b.im) / q);
            } else {
                return math.complex(a.re / b, a.im / b);
            }
        } else {
            if(b.complex) {
                const q = b.re * b.re + b.im * b.im;
                return math.complex(a * b.re / q, -a * b.im / q);
            } else {
                return a / b;
            }
        }
    },
    /** Exponentiate a number.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    pow: function(a, b) {
        if(typeof a == 'bigint' && typeof b == 'bigint') {
            if(b < 0n) {
                a = Number(a);
                b = Number(b);
            } else {
                return a ** b;
            }
        }
        if(a.complex && Numbas.util.isInt(b) && Math.abs(b) < 100) {
            if(b < 0) {
                return math.div(1, math.pow(a, -b));
            }
            if(b == 0) {
                return 1;
            }
            var coeffs = math.binomialCoefficients(b);
            var re = 0;
            var im = 0;
            var sign = 1;
            for(let i = 0;i < b;i += 2) {
                re += coeffs[i] * Math.pow(a.re, b - i) * Math.pow(a.im, i) * sign;
                im += coeffs[i + 1] * Math.pow(a.re, b - i - 1) * Math.pow(a.im, i + 1) * sign;
                sign = -sign;
            }
            if(b % 2 == 0) {
                re += Math.pow(a.im, b) * sign;
            }
            return math.complex(re, im);
        }
        if(a.complex || b.complex || (a < 0 && math.fract(b) != 0)) {
            if(!a.complex) {
                a = {re: a, im: 0, complex: true};
            }
            if(!b.complex) {
                b = {re: b, im: 0, complex: true};
            }
            var ss = a.re * a.re + a.im * a.im;
            var arg1 = math.arg(a);
            var mag = Math.pow(ss, b.re / 2) * Math.exp(-b.im * arg1);
            var arg = b.re * arg1 + (b.im * Math.log(ss)) / 2;
            return math.complex(mag * Math.cos(arg), mag * Math.sin(arg));
        } else if(a == Math.E) {
            return Math.exp(b);
        } else {
            return Math.pow(a, b);
        }
    },
    /** Calculate the Nth row of Pascal's triangle.
     *
     * @param {number} n
     * @returns {Array.<number>}
     */
    binomialCoefficients: function(n) {
        var b = [1];
        var f = 1;
        for(let i = 1;i <= n;i++) {
            b.push(f *= (n + 1 - i) / i);
        }
        return b;
    },
    /** `a mod b`. Always returns a positive number.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    mod: function(a, b) {
        b = math.abs(b);
        if(b == Infinity) {
            return a;
        }
        if(b === 0n) {
            return NaN;
        }
        return ((a % b) + b) % b;
    },
    /** Calculate the `b`-th root of `a`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    root: function(a, b) {
        if(!a.complex && a < 0 && b % 2 == 1) {
            return -math.root(-a, b);
        }
        return math.pow(a, div(1, b));
    },
    /** Square root.
     *
     * @param {number} n
     * @returns {number}
     */
    sqrt: function(n) {
        if(n.complex) {
            var r = math.abs(n);
            return math.complex(Math.sqrt((r + n.re) / 2), (n.im < 0 ? -1 : 1) * Math.sqrt((r - n.re) / 2));
        } else if(n < 0) {
            return math.complex(0, Math.sqrt(-n));
        } else {
            return Math.sqrt(n)
        }
    },
    /** Natural logarithm (base `e`).
     *
     * @param {number} n
     * @returns {number}
     */
    log: function(n) {
        if(n.complex) {
            var mag = math.abs(n);
            var arg = math.arg(n);
            return math.complex(Math.log(mag), arg);
        } else if(n < 0) {
            return math.complex(Math.log(-n), Math.PI);
        } else {
            return Math.log(n);
        }
    },
    /** Calculate `e^n`.
     *
     * @param {number} n
     * @returns {number}
     */
    exp: function(n) {
        if(n.complex) {
            return math.complex(Math.exp(n.re) * Math.cos(n.im), Math.exp(n.re) * Math.sin(n.im));
        } else {
            return Math.exp(n);
        }
    },
    /** Magnitude of a number - absolute value of a real; modulus of a complex number.
     *
     * @param {number} n
     * @returns {number}
     */
    abs: function(n) {
        if(n.complex) {
            if(n.re == 0) {
                return Math.abs(n.im);
            } else if(n.im == 0) {
                return Math.abs(n.re);
            } else {
                return Math.sqrt(n.re * n.re + n.im * n.im)
            }
        } else if(typeof n == 'bigint') {
            return n >= 0n ? n : -n;
        } else {
            return Math.abs(n);
        }
    },
    /** Argument of a (complex) number.
     *
     * @param {number} n
     * @returns {number}
     */
    arg: function(n) {
        if(n.complex) {
            return Math.atan2(n.im, n.re);
        } else {
            return Math.atan2(0, n);
        }
    },
    /** Real part of a number.
     *
     * @param {number} n
     * @returns {number}
     */
    re: function(n) {
        if(n.complex) {
            return n.re;
        } else {
            return n;
        }
    },
    /** Imaginary part of a number.
     *
     * @param {number} n
     * @returns {number}
     */
    im: function(n) {
        if(n.complex) {
            return n.im;
        } else {
            return 0;
        }
    },
    /** Is `n` positive (Real, and greater than 0)?
     *
     * @param {number} n
     * @returns {boolean}
     */
    positive: function(n) {
        return !n.complex && math.gt(n, 0n);
    },
    /** Is `n` negative (Real, and less than 0)?
     *
     * @param {number} n
     * @returns {boolean}
     */
    negative: function(n) {
        return math.lt(math.re(n), 0n);
    },
    /** Is `n` nonnegative (Real, and greater than or equal to 0)?
     *
     * @param {number} n
     * @returns {boolean}
     */
    nonnegative: function(n) {
        return !math.negative(n);
    },
    /** Is `a` less than `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    lt: function(a, b) {
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return !math.geq(a, b);
    },
    /** Is `a` greater than `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    gt: function(a, b) {
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return !math.leq(a, b);
    },
    /** Is `a` less than or equal to `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    leq: function(a, b) {
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return a < b || math.eq(a, b);
    },
    /** Is `a` greater than or equal to `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    geq: function(a, b) {
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return a > b || math.eq(a, b);
    },
    /** Is `a` equal to `b`?
     *
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    eq: function(a, b) {
        if(a.complex) {
            if(b.complex) {
                return math.eq(a.re, b.re) && math.eq(a.im, b.im);
            } else {
                return math.eq(a.re, b) && math.eq(a.im, 0);
            }
        } else {
            if(b.complex) {
                return math.eq(a, b.re) && math.eq(b.im, 0);
            } else {
                if(isNaN(a)) {
                    return isNaN(b);
                }
                return a == b || (!(typeof a == 'bigint' && typeof b == 'bigint') && math.isclose(a, b));
            }
        }
    },

    /** Is `a` close to `b`?
     *
     * @param {number} a
     * @param {number} b
     * @param {number} [rel_tol=1e-15] - Relative tolerance: amount of error relative to `max(abs(a),abs(b))`.
     * @param {number} [abs_tol=1e-15] - Absolute tolerance: maximum absolute difference between `a` and `b`.
     * @returns {boolean}
     */
    isclose: function(a, b, rel_tol, abs_tol) {
        rel_tol = rel_tol === undefined ? 1e-15 : rel_tol;
        abs_tol = abs_tol === undefined ? 1e-15 : abs_tol;

        if(a.complex || b.complex) {
            return math.abs(math.sub(a, b)) < abs_tol;
        }

        a = Number(a);
        b = Number(b);
        if(a === Infinity || b === Infinity || a == -Infinity || b == -Infinity) {
            return a === b;
        }

        return Math.abs(a - b) <= Math.max(rel_tol * Math.max(Math.abs(a), Math.abs(b)), abs_tol);
    },

    /** Is `u` a scalar multiple of `v`?
     *
     * @param {Array} u
     * @param {Array} v
     * @param {number} [rel_tol=1e-15] - Relative tolerance: amount of error relative to `max(abs(a),abs(b))`.
     * @param {number} [abs_tol=1e-15] - Absolute tolerance: maximum absolute difference between `a` and `b`.
     * @returns {boolean}
     */

    is_scalar_multiple: function(u, v, rel_tol, abs_tol) {
        // check edge case
        if(!Array.isArray(u) || !u.length || !Array.isArray(v) || !v.length) {
            return false;
        }
        // vector length must be the same
        if (u.length != v.length) {
            return false;
        }
        var n = u.length;
        var i = 0;
        var first_ratio;
        // corner case: denominator cannot be zero to avoid zero-division exception
        while (i < n) {
            if (v[i] == 0 && u[i] == 0) {
                i++;
            } else if (v[i] == 0 || u[i] == 0) {
                return false;
            } else {
                first_ratio = u[i] / v[i];
                break;
            }
        }
        for(; i < n; i++) {
            if (v[i] == 0 && u[i] == 0) {
                continue;
            } else if (v[i] == 0 || u[i] == 0) {
                return false;
            } else {
                var curr = u[i] / v[i];
                if (!math.isclose(curr, first_ratio, rel_tol, abs_tol)) {
                    return false;
                }
            }
        }
        return true;
    },

    /** Greatest of two numbers - wraps `Math.max`.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    max: function(a, b) {
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        if(typeof a == 'bigint' && typeof b == 'bigint') {
            return a > b ? a : b;
        }
        return Math.max(a, b);
    },
    /** Greatest of a list of numbers.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @param {Function} [maxfn=Numbas.math.max] - A function which returns the maximum of two values.
     * @returns {number}
     */
    listmax: function(numbers, maxfn) {
        if(numbers.length == 0) {
            return undefined;
        }
        maxfn = maxfn || math.max;
        var best = numbers[0];
        for(let i = 1;i < numbers.length;i++) {
            best = maxfn(best, numbers[i]);
        }
        return best;
    },
    /** Least of two numbers - wraps `Math.min`.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    min: function(a, b) {
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        if(typeof a == 'bigint' && typeof b == 'bigint') {
            return a < b ? a : b;
        }
        return Math.min(a, b);
    },
    /** Least of a list of numbers.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @param {Function} [minfn=Numbas.math.min] - A function which returns the minimum of two values.
     * @returns {number}
     */
    listmin: function(numbers, minfn) {
        if(numbers.length == 0) {
            return undefined;
        }
        minfn = minfn || math.min;
        var best = numbers[0];
        for(let i = 1;i < numbers.length;i++) {
            best = minfn(best, numbers[i]);
        }
        return best;
    },
    /** Are `a` and `b` unequal?
     *
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     * @see Numbas.math.eq
     */
    neq: function(a, b) {
        return !math.eq(a, b);
    },
    /** If `n` can be written in the form `a*pi^n`, with `a` an integer, return the biggest possible `n`, otherwise return `0`.
     * Also returns `1` for `n` of the form `pi/k`, with `k` an integer < 1000 if the parameter `allowFractions` is `true`.
     *
     * @param {number} n
     * @param {boolean} [allowFractions=true] - return 1 if `n` is of the form `pi/k`, for some integer `k < 1000`.
     * @returns {number}
     */
    piDegree: function(n, allowFractions) {
        if(typeof n == 'bigint') {
            return 0;
        }
        if(allowFractions === undefined) {
            allowFractions = true;
        }

        n = Math.abs(n);
        if(n > 10000) {    //so big numbers don't get rounded to a power of pi accidentally
            return 0;
        }
        var degree, a;

        /* Check for pi/k, where k is an integer < 1000 */
        a = Math.PI / n;
        if(allowFractions && a < 1000 && Math.abs(a - math.round(a)) < 0.0000000001) {
            return 1;
        }

        for(degree = 1; (a = n / Math.pow(Math.PI, degree)) > 1 && (Math.abs(a - math.round(a)) > 0.00000001 && Math.abs(1 / a - math.round(1 / a)) > 0.00000001); degree++) {}
        return a >= 1 ? degree : 0;
    },
    /** Add the given number of zero digits to a string representation of a number.
     *
     * @param {string} n - A string representation of a number.
     * @param {number} digits - The number of digits to add.
     * @returns {string}
     */
    addDigits: function(n, digits) {
        n = n + '';
        var m = n.match(/^(-?\d+(?:\.\d+)?)(e[-+]?\d+)$/);
        if(m) {
            return math.addDigits(m[1], digits) + m[2];
        } else {
            if(n.indexOf('.') == -1) {
                n += '.';
            }
            for(let i = 0;i < digits;i++) {
                n += '0';
            }
            return n;
        }
    },

    /** Convert a number to exponential format.
     *
     * @param {number} n
     * @returns {string}
     */
    toExponential: function(n) {
        if(typeof n == 'bigint') {
            if(n < 0n) {
                return '-' + math.toExponential(-n);
            }
            var s = n.toString();
            var p = s.length - 1;
            return s[0] + (p > 0 ? '.' + s.slice(1) : '') + 'e+' + p;
        } else {
            return n.toExponential();
        }
    },

    /** Settings for {@link Numbas.math.niceNumber}.
     *
     * @typedef Numbas.math.niceNumber_settings
     * @property {string} precisionType - Either `"dp"` or `"sigfig"`.
     * @property {number} precision - Number of decimal places or significant figures to show.
     * @property {string} style - Name of a notational style to use. See {@link Numbas.util.numberNotationStyles}.
     * @property {string} scientificStyle - Name of a notational style to use for the significand in scientific notation. See {@link Numbas.util.numberNotationStyles}.
     * @property {string} syntax - The syntax to use for the rendered string. Either `"plain"` or `"latex"`.
     * @property {string} [infinity="infinity"] - The string to represent infinity.
     * @property {string} [imaginary_unit="i"] - The symbol to represent the imaginary unit.
     * @property {object} circle_constant - An object with attributes `scale` and `symbol` for the circle constant. `scale` is the ratio of the circle constant to pi, and `symbol` is the string to use to represent it.
     * @property {boolean} plaindecimal - Render `Decimal` values without the `dec("...")` wrapper?
     */

    /** Display a real number nicely. Unlike {@link Numbas.math.niceNumber}, doesn't deal with complex numbers or multiples of pi.
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @see Numbas.util.numberNotationStyles
     * @returns {string}
     */
    niceRealNumber: function(n, options) {
        options = options || {};
        if(n === undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        var out;
        var style = options.style || Numbas.locale.default_number_notation[0];
        if(options.style == 'scientific') {
            var s = math.toExponential(n);
            var bits = math.parseScientific(s);
            var noptions = {
                precisionType: options.precisionType,
                precision: options.precision,
                syntax: options.syntax,
                style: options.scientificStyle || Numbas.locale.default_number_notation[0]
            };
            var significand = math.niceNumber(bits.significand, noptions);
            var exponent = bits.exponent;
            if(exponent >= 0) {
                exponent = '+' + exponent;
            }
            return significand + 'e' + exponent;
        } else {
            if(typeof n == 'bigint') {
                out = n.toString();
            } else {
                let precision;
                switch(options.precisionType) {
                case 'sigfig':
                    precision = options.precision;
                    out = math.siground(n, precision) + '';
                    var sigFigs = math.countSigFigs(out, true);
                    if(sigFigs < precision) {
                        out = math.addDigits(out, precision - sigFigs);
                    }
                    break;
                case 'dp':
                    precision = Math.min(options.precision, MAX_FLOAT_PRECISION);
                    out = math.precround(n, precision) + '';
                    var dp = math.countDP(out);
                    if(dp < precision) {
                        out = math.addDigits(out, precision - dp);
                    }
                    break;
                default:
                    var a = Math.abs(n);
                    if(a < 1e-15) {
                        out = '0';
                    } else if(Math.abs(n) < 1e-8) {
                        out = n + '';
                    } else {
                        out = math.precround(n, 10) + '';
                    }
                }
                out = math.unscientific(out);
            }
            if(style && Numbas.util.numberNotationStyles[style]) {
                out = Numbas.util.formatNumberNotation(out, style, options.syntax);
            }
        }
        return out;
    },

    /** Display a number nicely - rounds off floats to 10dp so floating point errors aren't displayed.
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @see Numbas.util.numberNotationStyles
     * @returns {string}
     */
    niceNumber: function(n, options) {
        options = options || {};
        if(n === undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(n.complex) {
            var imaginary_unit = options.imaginary_unit || 'i';
            var re = math.niceNumber(n.re, options);
            var im = math.niceNumber(n.im, options);
            if(math.precround(n.im, 10) == 0) {
                return re + '';
            } else if(math.precround(n.re, 10) == 0) {
                if(n.im == 1) {
                    return imaginary_unit;
                } else if(n.im == -1) {
                    return '-' + imaginary_unit;
                } else {
                    return im + '*' + imaginary_unit;
                }
            } else if(n.im < 0) {
                if(n.im == -1) {
                    return re + ' - ' + imaginary_unit;
                } else {
                    return re + im + '*' + imaginary_unit;
                }
            } else {
                if(n.im == 1) {
                    return re + ' + ' + imaginary_unit;
                } else {
                    return re + ' + ' + im + '*' + imaginary_unit;
}
            }
        } else {
            var infinity = options.infinity || 'infinity';
            if(n == Infinity) {
                return infinity;
            } else if(n == -Infinity) {
                return '-' + infinity;
            }
            var piD = 0;
            var circle_constant_scale = 1;
            var circle_constant_symbol = 'pi';
            if(options.circle_constant) {
                circle_constant_scale = options.circle_constant.scale;
                circle_constant_symbol = options.circle_constant.symbol;
            }
            if(options.precisionType === undefined && (piD = math.piDegree(n, false)) > 0) {
                n /= Math.pow(Math.PI * circle_constant_scale, piD);
            }
            var out = math.niceRealNumber(n, options);
            switch(piD) {
                case 0:
                    return out;
                case 1:
                    if(n == 1) {
                        return circle_constant_symbol;
                    } else if(n == -1) {
                        return '-' + circle_constant_symbol;
                    } else {
                        return out + '*' + circle_constant_symbol;
                    }
                default:
                    if(n == 1) {
                        return circle_constant_symbol + '^' + piD;
                    } else if(n == -1) {
                        return '-' + circle_constant_symbol + '^' + piD;
                    } else {
                        return out + '*' + circle_constant_symbol + '^' + piD;
}
            }
        }
    },

    /** Display a {@link Numbas.math.ComplexDecimal} as a string.
     *
     * @param {Numbas.math.ComplexDecimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @see Numbas.util.numberNotationStyles
     * @returns {string}
     */
    niceComplexDecimal: function(n, options) {
        options = options || {};
        if(n === undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        var re = math.niceDecimal(n.re, options);
        if(n.isReal()) {
            return re;
        } else {
            var im = math.niceDecimal(n.im.absoluteValue(), options);
            if(options.style == 'scientific') {
                im = '(' + im + ')*i';
            } else {
                im = n.im.absoluteValue().equals(1) ? 'i' : im + '*i';
            }
            if(n.re.isZero()) {
                return (n.im.lessThan(0) ? '-' : '') + im;
            }
            var symbol = n.im.lessThan(0) ? '-' : '+';
            return re + ' ' + symbol + ' ' + im;
        }
    },

    /** Display a Decimal as a string.
     *
     * @param {Decimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @see Numbas.util.numberNotationStyles
     * @returns {string}
     */
    niceDecimal: function(n, options) {
        options = options || {};
        if(n === undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(!n.isFinite()) {
            return n.lessThan(0) ? '-infinity' : 'infinity';
        }

        var precision = options.precision;
        var style = options.style || Numbas.locale.default_number_notation[0];
        if(options.style == 'scientific') {
            var e = n.toExponential(options.precision);
            var m = e.match(/^(-?\d(?:\.\d+)?)(e[+-]\d+)$/);
            var significand = Numbas.util.formatNumberNotation(m[1], Numbas.locale.default_number_notation[0]);
            var exponential = m[2];
            return significand + exponential;
        } else {
            var out;
            switch(options.precisionType) {
            case 'sigfig':
                out = n.toPrecision(precision);
                break;
            case 'dp':
                out = n.toFixed(precision);
                break;
            default:
                out = n.toString();
            }
            if(style && Numbas.util.numberNotationStyles[style]) {
                out = Numbas.util.formatNumberNotation(out, style);
            }
            return out;
        }
    },

    /** Convert a JS Number to a Decimal.
     *
     * @param {number} x
     * @returns {Decimal}
     */
    numberToDecimal: function(x) {
        if(x.complex) {
            return new math.ComplexDecimal(math.numberToDecimal(x.re), math.numberToDecimal(x.im));
        } else {
            x = Number(x);
            if(x == Math.PI) {
                return Decimal.acos(-1);
            } else if(x == Math.E) {
                return Decimal(1).exp();
            } else {
                return new Decimal(x);
            }
        }
    },

    /** Get a random number in range `[0..n-1]`.
     *
     * @param {number} n
     * @returns {number}
     */
    randomint: function(n) {
        return Math.floor(n * (Math.random() % 1));
    },
    /** Get a  random shuffling of the numbers `[0..n-1]`.
     *
     * @param {number} N
     * @returns {Array.<number>}
     */
    deal: function(N) {
        var J, K;
        var Q = new Array(N);
        for(J = 0 ; J < N ; J++) {
            K = math.randomint(J + 1) ; Q[J] = Q[K] ; Q[K] = J;
        }
        return Q;
    },
    /** Randomly shuffle a list. Returns a new list - the original is unmodified.
     *
     * @param {Array} list
     * @returns {Array}
     */
    shuffle: function(list) {
        var l = list.length;
        var permutation = math.deal(l);
        var list2 = new Array(l);
        for(let i = 0;i < l;i++) {
            list2[i] = (list[permutation[i]]);
        }
        return list2;
    },
    /** Calculate the inverse of a shuffling.
     *
     * @param {Array.<number>} l
     * @returns {Array.<number>} l
     * @see Numbas.math.deal
     */
    inverse: function(l) {
        var arr = new Array(l.length);
        for(let i = 0;i < l.length;i++) {
            arr[l[i]] = i;
        }
        return arr;
    },

    /** Reorder a list given a permutation.
     * The `i`th element of the output is the `order[i]`th element of `list`.
     *
     * @param {Array} list - The list to reorder.
     * @param {Array.<number>} order - The permutation to apply.
     * @returns {Array}
     */
    reorder: function(list, order) {
        return order.map(function(i) {
            return list[i];
        });
    },

    /** Shuffle a number of lists together - each list has the same permutation of its elements applied.
     * The lists must all be the same length, otherwise an error is thrown.
     *
     * @param {Array.<Array>} lists - The lists to reorder.
     * @returns {Array.<Array>}
     */
    shuffle_together: function(lists) {
        if(lists.length == 0) {
            return [];
        }
        var len = lists[0].length;
        for(let i = 1;i < lists.length;i++) {
            if(lists[i].length != len) {
                throw(new Numbas.Error("math.shuffle_together.lists not all the same length"));
            }
        }
        var order = math.deal(len);
        return lists.map(function(list) {
            return math.reorder(list, order);
        });
    },

    /** A random partition of the integer `n` into `k` non-zero parts.
     *
     * @param {number} n
     * @param {number} k
     * @returns {Array.<number>} - A list of `k` numbers whose sum is `n`.
     */
    random_integer_partition: function(n, k) {
        if(k > n || k < 1) {
            throw(new Numbas.Error("math.random_integer_partition.invalid k", {n:n, k:k}));
        }
        var shuffle = [];
        for(let i = 0;i < k - 1;i++) {
            if(shuffle[i] === undefined) {
                shuffle[i] = i;
            }
            var j = math.randomint(n - 1);
            if(shuffle[j] === undefined) {
                shuffle[j] = j;
            }
            var a = shuffle[i];
            shuffle[i] = shuffle[j];
            shuffle[j] = a;
        }
        shuffle = shuffle.slice(0, k - 1);
        shuffle.sort(function(a, b) {
            return a < b ? -1 : a > b ? 1 : 0;
        });
        var partition = [];
        var last = 0;
        for(let i = 0;i < k - 1;i++) {
            partition.push(shuffle[i] + 1 - last);
            last = shuffle[i] + 1;
        }
        partition.push(n - last);
        return partition;
    },

    /** Produce all of the ordered partitions of the integer `n` into `k` parts.
     *
     * @param {number} n
     * @param {number} k
     * @returns {Array.<Array.<number>>}
     */
    integer_partitions: function(n, k) {
        if(n < 0 || k <= 0) {
            if(k == 0 && n == 0) {
                return [[]];
            } else {
                return [];
            }
        }

        var out = [];
        for(let i = 0;i <= n;i++) {
            for(const p of math.integer_partitions(n - i, k - 1)) {
                out.push([i].concat(p));
            }
        }

        return out;
    },

    /* Just the numbers from 1 to `n` (inclusive) in an array!
     * @param {number} n
     * @returns {Array.<number>}
     */
    range: function(n) {
        var arr = new Array(n);
        for(let i = 0; i < n; i++) {
            arr[i] = i;
        }
        return arr;
    },
    /** Round `a` to `b` decimal places. Real and imaginary parts of complex numbers are rounded independently.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {Numbas.Error} "math.precround.complex" if b is complex.
     */
    precround: function(a, b) {
        if(b.complex) {
            throw(new Numbas.Error('math.precround.complex'));
        }
        if(a.complex) {
            return math.complex(math.precround(a.re, b), math.precround(a.im, b));
        } else {
            b = Math.min(b, MAX_FLOAT_PRECISION);
            var be = Math.pow(10, b);
            var fracPart = a % 1;
            var intPart = a - fracPart;
            //test to allow a bit of leeway to account for floating point errors
            //if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
            var v = fracPart * be * 10 % 1;
            var d = (fracPart > 0 ? Math.floor : Math.ceil)(fracPart * be * 10 % 10);
            // multiply fractional part by 10^b; we'll throw away the remaining fractional part (stuff < 10^b)
            fracPart *= be;
            if((d == 4 && 1 - v < 1e-9) || (d == -5 && v > -1e-9 && v < 0)) {
                fracPart += 1;
            }
            var rounded_fracPart = Math.round(fracPart);
            // if the fractional part has rounded up to a whole number, just add sgn(fracPart) to the integer part
            if(rounded_fracPart == be || rounded_fracPart == -be) {
                return intPart + math.sign(fracPart);
            }
            // get the fractional part as a string of decimal digits
            var fracPartString = Math.round(Math.abs(fracPart)) + '';
            while(fracPartString.length < b) {
                fracPartString = '0' + fracPartString;
            }
            // construct the rounded number as a string, then convert it to a JS float
            var out = parseFloat(intPart + '.' + fracPartString);
            // make sure a negative number remains negative
            if(intPart == 0 && a < 0) {
                return -out;
            } else {
                return out;
            }
        }
    },

    /** Get the significand and exponent of a number written in exponential form.
     *
     * @param {string} str
     * @param {boolean} [parse=true] - Parse the significand and exponent values to numbers, or leave them as strings?
     * @returns {object} `{significand: number, exponent: number}` if `parse` is true, or `{significand: string, exponent: string}`
     */
    parseScientific: function(str, parse) {
        var m = /(-?\d[ \d]*(?:\.\d[ \d]*)?)e([-+]?\d[ \d]*)/i.exec(str);
        var significand = m[1].replace(/ /g, '');
        var exponent = m[2].replace(/ /g, '').replace(/^\+/, '');
        parse = parse || (parse === undefined);
        if(parse) {
            return {significand: parseFloat(significand), exponent: parseInt(exponent)};
        } else {
            return {significand, exponent};
        }
    },

    /** If the given string is scientific notation representing a number, return a string of the form `\d+\.\d+`.
     * For example, '1.23e-5' is returned as '0.0000123'.
     *
     * @param {string} str
     * @returns {string}
     */
    unscientific: function(str) {
        var m = /(-)? *(0|[1-9][ \d]*)(?:\.([ \d]+))?e([-+]?[\d ]+)/i.exec(str);
        if(!m) {
            return str;
        }
        var minus = m[1] || '';
        var significand_integer = m[2].replace(/ /g, '');
        var significand_decimal = (m[3] || '').replace(/ /g, '');
        var digits = significand_integer + significand_decimal;
        var pow = parseInt(m[4].replace(/ /g, ''));
        pow += significand_integer.length
        var zm = digits.match(/^(0+)[^0]/);
        if(zm) {
            var num_zeros = zm[1].length;
            digits = digits.slice(num_zeros);
            pow -= num_zeros;
        }
        var l = digits.length;
        var out;
        if(l < pow) {
            out = digits;
            for(let i = l;i < pow;i++) {
                out += '0';
            }
        } else if(pow <= 0) {
            out = digits;
            for(let i = 0;i < -pow;i++) {
                out = '0' + out;
            }
            out = '0.' + out;
        } else {
            out = digits.slice(0, pow);
            if(digits.length > pow) {
                out += '.' + digits.slice(pow);
            }
        }
        return minus + out;
    },
    /** Round `a` to `b` significant figures. Real and imaginary parts of complex numbers are rounded independently.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {Numbas.Error} "math.precround.complex" if b is complex.
     */
    siground: function(a, b) {
        if(b.complex) {
            throw(new Numbas.Error('math.siground.complex'));
        }
        if(a.complex) {
            return math.complex(math.siground(a.re, b), math.siground(a.im, b));
        } else {
            if(math.isclose(a, 0)) {
                return 0;
            }
            return parseFloat(a.toPrecision(b))
        }
    },
    /** Count the number of decimal places used in the string representation of a number.
     *
     * @param {number|string} n
     * @returns {number}
     */
    countDP: function(n) {
        var m = (n + '').match(/(?:\.(\d*))?(?:[Ee]([-+])?(\d+))?$/);
        if(!m) {
            return 0;
        } else {
            var dp = m[1] ? m[1].length : 0;
            if(m[2] && m[2] == '-') {
                dp += parseInt(m[3]);
            }
            return dp;
        }
    },
    /**
     * Calculate the significant figures precision of a number.
     *
     * @param {number|string} n - if a string, only the "plain" number format or scientific notation is expected. Strings representing numbers should be cleaned first, using `Numbas.util.cleanNumber`.
     * @param {boolean} [max] - Be generous with calculating sig. figs. for whole numbers. e.g. '1000' could be written to 4 sig figs.
     * @returns {number}
     */
    countSigFigs: function(n, max) {
        n += '';
        var m;
        if(max) {
            m = n.match(/^-?(?:(\d0*)$|(?:([1-9]\d*[1-9]0*)$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)\s*[Ee]\s*[+-]?\d+)$)/i);
        } else {
            m = n.match(/^-?(?:(\d)0*$|(?:([1-9]\d*[1-9])0*$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)\s*[Ee]\s*[+-]?\d+)$)/i);
        }
        if(!m) {
            return 0;
        }
        var sigFigs = m[1] || m[2] || m[3] || m[4] || m[5] || m[6];
        return sigFigs.replace('.', '').length;
    },
    /** Is n given to the desired precision?
     *
     * @param {number|string} n
     * @param {string} precisionType - Either 'dp' or 'sigfig'.
     * @param {number} precision - Number of desired digits of precision.
     * @param {boolean} strictPrecision - Must trailing zeros be used to get to the desired precision (true), or is it allowed to give fewer digits in that case (false)?
     * @returns {boolean}
     */
    toGivenPrecision: function(n, precisionType, precision, strictPrecision) {
        if(precisionType == 'none') {
            return true;
        }
        n += '';
        let precisionOK;
        var counters = {'dp': math.countDP, 'sigfig': math.countSigFigs};
        var counter = counters[precisionType];
        var digits = counter(n);
        if(strictPrecision) {
            precisionOK = digits == precision;
        } else {
            precisionOK = digits <= precision;
        }
        if(precisionType == 'sigfig' && !precisionOK && digits < precision && /[1-9]\d*0+$/.test(n)) {    // in cases like 2070, which could be to either 3 or 4 sig figs
            var trailingZeroes = n.match(/0*$/)[0].length;
            if(digits + trailingZeroes >= precision) {
                precisionOK = true;
            }
        }
        return precisionOK;
    },

    /**
     * Is n given as a scientific number to the desired precision?
     *
     * This looks only at the significand part.
     * A significand of the form `D.DD` is considered to be given to 2 decimal places, or three significant figures.
     *
     * Trailing zeros must be given: `1.2` is only considered to be given to 1 decimal place, and `1.20` is only considered to be given to 2 decimal places.
     *
     * @param {number|string} n
     * @param {string} precisionType - Either 'dp' or 'sigfig'.
     * @param {number} precision - Number of desired digits of precision.
     * @see Numbas.math.toGivenPrecision
     * @returns {boolean}
     */
    toGivenPrecisionScientific(n, precisionType, precision) {
        if(precisionType == 'none') {
            return true;
        }
        n += '';
        var m = math.re_scientificNumber.exec(n);
        if(!m) {
            return false;
        }
        return math.toGivenPrecision(m[1], 'dp', precision + (precisionType == 'sigfig' ? -1 : 0), true);
    },
    /** Is a within +/- tolerance of b?
     *
     * @param {number} a
     * @param {number} b
     * @param {number} tolerance
     * @returns {boolean}
     */
    withinTolerance: function(a, b, tolerance) {
        if(a.complex || b.complex) {
            a = a.complex ? a : math.complex(a, 0);
            b = b.complex ? b : math.complex(b, 0);
            return math.withinTolerance(a.re, b.re, tolerance) && math.withinTolerance(a.im, b.im, tolerance);
        }
        if(tolerance == 0) {
            return math.eq(a, b);
        } else {
            var upper = math.add(b, tolerance);
            var lower = math.sub(b, tolerance);
            return math.geq(a, lower) && math.leq(a, upper);
        }
    },
    /** Factorial, or Gamma(n+1) if n is not a positive integer.
     *
     * @param {number} n
     * @returns {number}
     */
    factorial: function(n) {
        if(Numbas.util.isInt(n) && n >= 0) {
            if(n <= 1) {
                return 1n;
            } else {
                n = math.ensure_bigint(n);
                var j = 1n;
                for(let i = 2n;i <= n;i++) {
                    j *= i;
                }
                return j;
            }
        } else {    //gamma function extends factorial to non-ints and negative numbers
            return math.gamma(math.add(n, 1));
        }
    },
    /** Lanczos approximation to the gamma function.
     *
     * @param {number} n
     * @returns {number}
     */
    gamma: function(n) {
        var g = 7;
        var p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
        var mul = math.mul;
        var div = math.div;
        var exp = math.exp;
        var neg = math.negate;
        var pow = math.pow;
        var sqrt = math.sqrt;
        var sin = math.sin;
        var add = math.add;
        var sub = math.sub;
        var pi = Math.PI;
        if((n.complex && n.re < 0.5) || (!n.complex && n < 0.5)) {
            return div(pi, mul(sin(mul(pi, n)), math.gamma(sub(1, n))));
        } else {
            n = sub(n, 1);            //n -= 1
            var x = p[0];
            for(let i = 1;i < g + 2;i++) {
                x = add(x, div(p[i], add(n, i)));    // x += p[i]/(n+i)
            }
            var t = add(n, add(g, 0.5));        // t = n+g+0.5
            return mul(sqrt(2 * pi), mul(pow(t, add(n, 0.5)), mul(exp(neg(t)), x)));    // return sqrt(2*pi)*t^(z+0.5)*exp(-t)*x
        }
    },
    /** Base-10 logarithm.
     *
     * @param {number} n
     * @returns {number}
     */
    log10: function(n) {
        return mul(math.log(n), Math.LOG10E);
    },
    /** Arbitrary base logarithm.
     *
     * @param {number} n
     * @param {number} b
     * @returns {number} log(n)/log(b)
     */
    log_base: function(n, b) {
        return div(math.log(n), math.log(b));
    },
    /** Convert from degrees to radians.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.degrees
     */
    radians: function(x) {
        return mul(x, Math.PI / 180);
    },
    /** Convert from radians to degrees.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.radians
     */
    degrees: function(x) {
        return mul(x, 180 / Math.PI);
    },
    /** Cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    cos: function(x) {
        if(x.complex) {
            return math.complex(Math.cos(x.re) * math.cosh(x.im), -Math.sin(x.re) * math.sinh(x.im));
        } else {
            return Math.cos(x);
        }
    },
    /** Sine.
     *
     * @param {number} x
     * @returns {number}
     */
    sin: function(x) {
        if(x.complex) {
            return math.complex(Math.sin(x.re) * math.cosh(x.im), Math.cos(x.re) * math.sinh(x.im));
        } else {
            return Math.sin(x);
        }
    },
    /** Tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    tan: function(x) {
        if(x.complex) {
            return div(math.sin(x), math.cos(x));
        } else {
            return Math.tan(x);
        }
    },
    /** Cosecant.
     *
     * @param {number} x
     * @returns {number}
     */
    cosec: function(x) {
        return div(1, math.sin(x));
    },
    /** Secant.
     *
     * @param {number} x
     * @returns {number}
     */
    sec: function(x) {
        return div(1, math.cos(x));
    },
    /** Cotangent.
     *
     * @param {number} x
     * @returns {number}
     */
    cot: function(x) {
        return div(1, math.tan(x));
    },
    /** Inverse sine.
     *
     * @param {number} x
     * @returns {number}
     */
    arcsin: function(x) {
        if(x.complex || math.abs(x) > 1) {
            var i = math.complex(0, 1);
            var ni = math.complex(0, -1);
            var ex = add(mul(x, i), math.sqrt(sub(1, mul(x, x)))); //ix+sqrt(1-x^2)
            return mul(ni, math.log(ex));
        } else {
            return Math.asin(x);
        }
    },
    /** Inverse cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    arccos: function(x) {
        if(x.complex || math.abs(x) > 1) {
            var ni = math.complex(0, -1);
            var ex = add(x, math.sqrt(sub(mul(x, x), 1)));    //x+sqrt(x^2-1)
            var result = mul(ni, math.log(ex));
            if(math.re(result) < 0 || math.re(result) == 0 && math.im(result) < 0) {
                result = math.negate(result);
            }
            return result;
        } else {
            return Math.acos(x);
        }
    },
    /** Inverse tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    arctan: function(x) {
        if(x.complex) {
            var i = math.complex(0, 1);
            var ex = div(add(i, x), sub(i, x));
            return mul(math.complex(0, 0.5), math.log(ex));
        } else {
            return Math.atan(x);
        }
    },
    /** Angle between x-axis and the line through the origin and `(x,y)`.
     *
     * @param {number} y
     * @param {number} x
     * @returns {number}
     */
    atan2: function(y, x) {
        if(y.complex) {
            y = y.re;
        }
        if(x.complex) {
            x = x.re;
        }
        return Math.atan2(y, x);
    },
    /** Hyperbolic sine.
     *
     * @param {number} x
     * @returns {number}
     */
    sinh: function(x) {
        if(x.complex) {
            return div(sub(math.exp(x), math.exp(math.negate(x))), 2);
        } else {
            return (Math.exp(x) - Math.exp(-x)) / 2;
        }
    },
    /** Hyperbolic cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    cosh: function(x) {
        if(x.complex) {
            return div(add(math.exp(x), math.exp(math.negate(x))), 2);
        } else {
            return (Math.exp(x) + Math.exp(-x)) / 2
        }
    },
    /** Hyperbolic tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    tanh: function(x) {
        return div(math.sinh(x), math.cosh(x));
    },
    /** Hyperbolic cosecant.
     *
     * @param {number} x
     * @returns {number}
     */
    cosech: function(x) {
        return div(1, math.sinh(x));
    },
    /** Hyperbolic secant.
     *
     * @param {number} x
     * @returns {number}
     */
    sech: function(x) {
        return div(1, math.cosh(x));
    },
    /** Hyperbolic tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    coth: function(x) {
        return div(1, math.tanh(x));
    },
    /** Inverse hyperbolic sine.
     *
     * @param {number} x
     * @returns {number}
     */
    arcsinh: function(x) {
        if(x.complex) {
            return math.log(add(x, math.sqrt(add(mul(x, x), 1))));
        } else {
            return Math.log(x + Math.sqrt(x * x + 1));
        }
    },
    /** Inverse hyperbolic cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    arccosh: function(x) {
        if(x.complex) {
            return math.log(add(x, math.sqrt(sub(mul(x, x), 1))));
        } else {
            return Math.log(x + Math.sqrt(x * x - 1));
        }
    },
    /** Inverse hyperbolic tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    arctanh: function(x) {
        if(x.complex) {
            return div(math.log(div(add(1, x), sub(1, x))), 2);
        } else {
            return 0.5 * Math.log((1 + x) / (1 - x));
        }
    },
    /** Round up to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.round
     * @see Numbas.math.floor
     */
    ceil: function(x) {
        if(x.complex) {
            return math.complex(math.ceil(x.re), math.ceil(x.im));
        } else {
            return Math.ceil(x);
        }
    },
    /** Round down to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.ceil
     * @see Numbas.math.round
     */
    floor: function(x) {
        if(x.complex) {
            return math.complex(math.floor(x.re), math.floor(x.im));
        } else {
            return Math.floor(x);
        }
    },
    /** Round to the nearest integer; fractional part >= 0.5 rounds up. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.ceil
     * @see Numbas.math.floor
     */
    round: function(x) {
        if(x.complex) {
            return math.complex(Math.round(x.re), Math.round(x.im));
        } else {
            return Math.round(x);
        }
    },
    /** Round to the nearest multiple of `a`;For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @param {number} a
     * @returns {number}
     * @see Numbas.math.round
     */
    toNearest: function(x, a) {
        if(a.complex) {
            throw(new Numbas.Error('math.toNearest.complex'));
        }
        if(a == 0) {
            return NaN;
        }
        if(x.complex) {
            return math.complex(math.toNearest(x.re, a), math.toNearest(x.im, a));
        } else {
            return Math.round(x / a) * a;
        }
    },
    /**
     * Integer part of a number - chop off the fractional part. For complex numbers, real and imaginary parts are rounded independently.
     * When `p` is given, truncate to that many decimal places.
     *
     * @param {number} x
     * @param {number} [p=0]
     * @returns {number}
     * @see Numbas.math.fract
     */
    trunc: function(x, p) {
        if(x.complex) {
            return math.complex(math.trunc(x.re, p), math.trunc(x.im, p));
        }
        p = Math.pow(10, p || 0);
        if(x > 0) {
            return Math.floor(x * p) / p;
        } else {
            return Math.ceil(x * p) / p;
        }
    },
    /** Fractional part of a number - Take away the whole number part. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.trunc
     */
    fract: function(x) {
        if(x.complex) {
            return math.complex(math.fract(x.re), math.fract(x.im));
        }
        return x - math.trunc(x);
    },
    /** Sign of a number - +1, 0, or -1. For complex numbers, gives the sign of the real and imaginary parts separately.
     *
     * @param {number} x
     * @returns {number}
     */
    sign: function(x) {
        if(x.complex) {
            return math.complex(math.sign(x.re), math.sign(x.im));
        }
        if(x == 0) {
            return 0;
        }else if (x > 0) {
            return 1;
        }else {
            return -1;
        }
    },
    /** Get a random real number between `min` and `max` (inclusive).
     *
     * @param {number} min
     * @param {number} max
     * @returns {number}
     * @see Numbas.math.random
     * @see Numbas.math.choose
     */
    randomrange: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    /** Get a random number in the specified range.
     *
     * Returns a random choice from `min` to `max` at `step`-sized intervals
     *
     * If all the values in the range are appended to the list, eg `[min,max,step,v1,v2,v3,...]`, just pick randomly from the values.
     *
     * @param {range} range - `[min,max,step]`
     * @returns {number}
     * @see Numbas.math.randomrange
     */
    random: function(range) {
        if(range[2] == 0) {
            return math.randomrange(range[0], range[1]);
        } else {
            var num_steps = math.rangeSize(range);
            var n = Math.floor(math.randomrange(0, num_steps));
            return range[0] + n * range[2];
        }
    },
    /** Remove all the values in the list `exclude` from the list `range`.
     *
     * @param {Array.<number>} range
     * @param {Array.<number>} exclude
     * @returns {Array.<number>}
     */
    except: function(range, exclude) {
        range = range.filter(function(r) {
            for(let i = 0;i < exclude.length;i++) {
                if(math.eq(r, exclude[i])) {
                    return false;
                }
            }
            return true;
        });
        return range;
    },
    /** Choose one item from an array, at random.
     *
     * @param {Array} selection
     * @returns {*}
     * @throws {Numbas.Error} "math.choose.empty selection" if `selection` has length 0.
     * @see Numbas.math.randomrange
     */
    choose: function(selection) {
        if(selection.length == 0) {
            throw(new Numbas.Error('math.choose.empty selection'));
        }
        var n = Math.floor(math.randomrange(0, selection.length));
        return selection[n];
    },
    /** Choose at random from a weighted list of items.
     *
     * @param {Array} list - A list of pairs of the form `[item, probability]`, where `probability` is a number.
     * @returns {*}
     * @throws {Numbas.Error} "math.choose.empty selection" if `selection` has length 0.
     */
    weighted_random: function(list) {
        var total = 0;
        for(var i = 0; i < list.length; i++) {
            const p = list[i][1];
            total += p > 0 ? p : 0;
        }
        if(total == 0) {
            throw(new Numbas.Error('math.choose.empty selection'));
        }
        var target = Math.random() * total;
        var acc = 0;
        for(let i = 0; i < list.length; i++) {
            const p = list[i][1];
            acc += p > 0 ? p : 0;
            if(acc >= target) {
                return list[i][0];
            }
        }
        return undefined;
    },
    /* Product of the numbers in the range `[a..b]`, i.e. $frac{a!}{b!}$.
     *
     * from http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/
     *
     * (public domain)
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    productRange: function(a, b) {
        const use_bigint = typeof a == 'bigint' && typeof b == 'bigint';
        a = math.ensure_bigint(a);
        b = math.ensure_bigint(b);
        if(a > b) {
            return 1n;
        }
        var product = a;
        var i = a;
        while (i++ < b) {
            product *= i;
        }
        return use_bigint ? product : Number(product);
    },
    /** `nCk` - number of ways of picking `k` unordered elements from `n`.
     *
     * @param {number} n
     * @param {number} k
     * @returns {number}
     * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
     */
    combinations: function(n, k) {
        if(n.complex || k.complex) {
            throw(new Numbas.Error('math.combinations.complex'));
        }
        n = math.ensure_bigint(n);
        k = math.ensure_bigint(k);
        if(n < 0n) {
            throw(new Numbas.Error('math.combinations.n less than zero'));
        }
        if(k < 0n) {
            throw(new Numbas.Error('math.combinations.k less than zero'));
        }
        if(n < k) {
            throw(new Numbas.Error('math.combinations.n less than k'));
        }
        k = math.max(k, n - k);
        return math.productRange(k + 1n, n) / math.productRange(1n, n - k);
    },
    /** `nPk` - number of ways of picking `k` ordered elements from `n`.
     *
     * @param {number} n
     * @param {number} k
     * @returns {number}
     * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
     */
    permutations: function(n, k) {
        if(n.complex || k.complex) {
            throw(new Numbas.Error('math.permutations.complex'));
        }
        n = math.ensure_bigint(n);
        k = math.ensure_bigint(k);
        if(n < 0n) {
            throw(new Numbas.Error('math.permutations.n less than zero'));
        }
        if(k < 0n) {
            throw(new Numbas.Error('math.permutations.k less than zero'));
        }
        if(n < k) {
            throw(new Numbas.Error('math.permutations.n less than k'));
        }
        return math.productRange(n - k + 1n, n);
    },
    /** Does `a` divide `b`? If either of `a` or `b` is not an integer, return `false`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    divides: function(a, b) {
        if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b)) {
            return false;
        }
        return a != 0 && (b % a) == 0;
    },
    /** Greatest common factor (GCF), or greatest common divisor (GCD), of `a` and `b`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
     */
    gcd: function(a, b) {
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.gcf.complex'));
        }
        if(typeof a != 'bigint' && (Math.floor(a) != a || Math.abs(a) == Infinity) || (typeof b != 'bigint' && (Math.floor(b) != b || Math.abs(b) == Infinity))) {
            return 1n;
        }
        const use_bigint = typeof a == 'bigint' && typeof b == 'bigint';
        a = math.abs(math.ensure_bigint(a));
        b = math.abs(math.ensure_bigint(b));
        if(a < b) {
            const c = a;
            a = b;
            b = c;
        }
        if(b == 0n) {
            return a;
        }
        while(a % b != 0n) {
            const c = b;
            b = a % b;
            a = c;
        }
        return use_bigint ? b : Number(b);
    },
    /** Are `a` and `b` coprime? If either of `a` or `b` is not an integer, return `false`.
     * Equivalent to `gcd(a,b) = 1`.
     *
     * @param {number} a
     * @param {number} b
     * @see Numbas.math.gcd
     * @returns {boolean}
     */
    coprime: function(a, b) {
        if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b)) {
            return true;
        }
        return math.gcd(a, b) == 1n;
    },
    /** Lowest common multiple (LCM) of `a` and `b`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
     */
    lcm: function(a, b) {
        if(arguments.length == 0) {
            return 1n;
        } else if(arguments.length == 1) {
            return a;
        }
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.lcm.complex'));
        }
        let use_bigint = typeof a == 'bigint';
        if(arguments.length > 2) {
            a = math.abs(math.ensure_bigint(a));
            for(let i = 1;i < arguments.length;i++) {
                if(arguments[i].complex) {
                    throw(new Numbas.Error('math.lcm.complex'));
                }
                b = math.abs(math.ensure_bigint(arguments[i]));
                use_bigint = use_bigint && (typeof arguments[i] == 'bigint');
                a = a * b / math.gcf(a, b);
            }
            return use_bigint ? a : Number(a);
        }

        use_bigint = use_bigint && (typeof b == 'bigint');

        a = math.abs(math.ensure_bigint(a));
        b = math.abs(math.ensure_bigint(b));
        var c = math.gcf(a, b);
        const l = a * b / c;
        return use_bigint ? l : Number(l);
    },
    /** Write the range of integers `[a..b]` as an array of the form `[min,max,step]`, for use with {@link Numbas.math.random}. If either number is complex, only the real part is used.
     *
     * @param {number} a
     * @param {number} b
     * @returns {range}
     * @see Numbas.math.random
     */
    defineRange: function(a, b) {
        if(a.complex) {
            a = a.re;
        }
        if(b.complex) {
            b = b.re;
        }
        return [a, b, 1];
    },
    /** Change the step size of a range created with {@link Numbas.math.defineRange}.
     *
     * @param {range} range
     * @param {number} step
     * @returns {range}
     */
    rangeSteps: function(range, step) {
        if(step.complex) {
            step = step.re;
        }
        return [range[0], range[1], step];
    },

    /** Convert a range to a list of Decimal values - enumerate all the elements of the range.
     *
     * @param {range} range
     * @returns {Decimal[]}
     */
    rangeToDecimalList: function(range) {
        const start = new Decimal(range[0]);
        const end = new Decimal(range[1]);
        const step_size = new Decimal(range[2]);
        const out = [];
        if(step_size.isZero()) {
            throw(new Numbas.Error('math.rangeToList.zero step size'));
        }
        if(end.minus(start).times(step_size).isNegative()) {
            return [];
        }
        if(start.equals(end)) {
            return [start];
        }
        let n = 0;
        let t = start;
        while(start.lessThan(end) ? t.lessThanOrEqualTo(end) : t.greaterThanOrEqualTo(end)) {
            out.push(t);
            n += 1;
            t = start.plus(step_size.times(n));
        }
        return out;
    },

    /** Convert a range to a list - enumerate all the elements of the range.
     *
     * @param {range} range
     * @returns {number[]}
     */
    rangeToList: function(range) {
        return math.rangeToDecimalList(range).map((x) => x.toNumber());
    },
    /** Calculate the number of elements in a range.
     *
     * @param {range} range
     * @returns {number}
     */
    rangeSize: function(range) {
        var diff = range[1] - range[0];
        var num_steps = Math.floor(diff / range[2]) + 1;
        num_steps += (math.isclose(range[0] + num_steps * range[2], range[1]) ? 1 : 0);
        return num_steps;
    },
    /** Get a rational approximation to a real number by the continued fractions method.
     *
     * If `accuracy` is given, the returned answer will be within `Math.exp(-accuracy)` of the original number.
     *
     * Based on frap.c by David Eppstein - https://www.ics.uci.edu/~eppstein/numth/frap.c.
     *
     * @param {number} n
     * @param {number} [accuracy]
     * @returns {Array.<number>} - [numerator,denominator]
     */
    rationalApproximation: function(n, accuracy) {
        /** Find a rational approximation to `t` with maximum denominator `limit`.
         *
         * @param {number} limit
         * @param {number} t
         * @returns {Array.<number>} `[error,numerator,denominator]`
         */
        function rat_to_limit(limit, t) {
            limit = Math.max(limit, 1);
            if(t == 0) {
                return [0, t, 1, 0];
            }
            var m00 = 1;
            var m01 = 0;
            var m10 = 0;
            var m11 = 1;

            var x = t;
            var ai = Math.floor(x);
            while((m10 * ai + m11) <= limit) {
                var tmp = m00 * ai + m01;
                m01 = m00;
                m00 = tmp;
                tmp = m10 * ai + m11;
                m11 = m10;
                m10 = tmp;
                if(x == ai) {
                    break;
                }
                x = 1 / (x - ai);
                ai = Math.floor(x);
            }

            var n1 = m00;
            var d1 = m10;
            var err1 = (t - n1 / d1);

            ai = Math.floor((limit - m11) / m10);
            var n2 = m00 * ai + m01;
            var d2 = m10 * ai + m11;
            var err2 = (t - n2 / d2);
            if(Math.abs(err1) <= Math.abs(err2)) {
                return [err1, n1, d1];
            } else {
                return [err2, n2, d2];
            }
        }

        if(accuracy == undefined) {
            accuracy = 15;
        }
        var err_in = Math.exp(-accuracy);
        var limit = 100000000000;
        var l_curr = 1;
        var res = rat_to_limit(l_curr, n);
        while(Math.abs(res[0]) > err_in && l_curr < limit) {
            l_curr *= 10;
            res = rat_to_limit(l_curr, n);
        }
        return [res[1], res[2]];
    },

    /** The first 1000 primes. */
    primes: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997, 1009, 1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087, 1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171, 1181, 1187, 1193, 1201, 1213, 1217, 1223, 1229, 1231, 1237, 1249, 1259, 1277, 1279, 1283, 1289, 1291, 1297, 1301, 1303, 1307, 1319, 1321, 1327, 1361, 1367, 1373, 1381, 1399, 1409, 1423, 1427, 1429, 1433, 1439, 1447, 1451, 1453, 1459, 1471, 1481, 1483, 1487, 1489, 1493, 1499, 1511, 1523, 1531, 1543, 1549, 1553, 1559, 1567, 1571, 1579, 1583, 1597, 1601, 1607, 1609, 1613, 1619, 1621, 1627, 1637, 1657, 1663, 1667, 1669, 1693, 1697, 1699, 1709, 1721, 1723, 1733, 1741, 1747, 1753, 1759, 1777, 1783, 1787, 1789, 1801, 1811, 1823, 1831, 1847, 1861, 1867, 1871, 1873, 1877, 1879, 1889, 1901, 1907, 1913, 1931, 1933, 1949, 1951, 1973, 1979, 1987, 1993, 1997, 1999, 2003, 2011, 2017, 2027, 2029, 2039, 2053, 2063, 2069, 2081, 2083, 2087, 2089, 2099, 2111, 2113, 2129, 2131, 2137, 2141, 2143, 2153, 2161, 2179, 2203, 2207, 2213, 2221, 2237, 2239, 2243, 2251, 2267, 2269, 2273, 2281, 2287, 2293, 2297, 2309, 2311, 2333, 2339, 2341, 2347, 2351, 2357, 2371, 2377, 2381, 2383, 2389, 2393, 2399, 2411, 2417, 2423, 2437, 2441, 2447, 2459, 2467, 2473, 2477, 2503, 2521, 2531, 2539, 2543, 2549, 2551, 2557, 2579, 2591, 2593, 2609, 2617, 2621, 2633, 2647, 2657, 2659, 2663, 2671, 2677, 2683, 2687, 2689, 2693, 2699, 2707, 2711, 2713, 2719, 2729, 2731, 2741, 2749, 2753, 2767, 2777, 2789, 2791, 2797, 2801, 2803, 2819, 2833, 2837, 2843, 2851, 2857, 2861, 2879, 2887, 2897, 2903, 2909, 2917, 2927, 2939, 2953, 2957, 2963, 2969, 2971, 2999, 3001, 3011, 3019, 3023, 3037, 3041, 3049, 3061, 3067, 3079, 3083, 3089, 3109, 3119, 3121, 3137, 3163, 3167, 3169, 3181, 3187, 3191, 3203, 3209, 3217, 3221, 3229, 3251, 3253, 3257, 3259, 3271, 3299, 3301, 3307, 3313, 3319, 3323, 3329, 3331, 3343, 3347, 3359, 3361, 3371, 3373, 3389, 3391, 3407, 3413, 3433, 3449, 3457, 3461, 3463, 3467, 3469, 3491, 3499, 3511, 3517, 3527, 3529, 3533, 3539, 3541, 3547, 3557, 3559, 3571, 3581, 3583, 3593, 3607, 3613, 3617, 3623, 3631, 3637, 3643, 3659, 3671, 3673, 3677, 3691, 3697, 3701, 3709, 3719, 3727, 3733, 3739, 3761, 3767, 3769, 3779, 3793, 3797, 3803, 3821, 3823, 3833, 3847, 3851, 3853, 3863, 3877, 3881, 3889, 3907, 3911, 3917, 3919, 3923, 3929, 3931, 3943, 3947, 3967, 3989, 4001, 4003, 4007, 4013, 4019, 4021, 4027, 4049, 4051, 4057, 4073, 4079, 4091, 4093, 4099, 4111, 4127, 4129, 4133, 4139, 4153, 4157, 4159, 4177, 4201, 4211, 4217, 4219, 4229, 4231, 4241, 4243, 4253, 4259, 4261, 4271, 4273, 4283, 4289, 4297, 4327, 4337, 4339, 4349, 4357, 4363, 4373, 4391, 4397, 4409, 4421, 4423, 4441, 4447, 4451, 4457, 4463, 4481, 4483, 4493, 4507, 4513, 4517, 4519, 4523, 4547, 4549, 4561, 4567, 4583, 4591, 4597, 4603, 4621, 4637, 4639, 4643, 4649, 4651, 4657, 4663, 4673, 4679, 4691, 4703, 4721, 4723, 4729, 4733, 4751, 4759, 4783, 4787, 4789, 4793, 4799, 4801, 4813, 4817, 4831, 4861, 4871, 4877, 4889, 4903, 4909, 4919, 4931, 4933, 4937, 4943, 4951, 4957, 4967, 4969, 4973, 4987, 4993, 4999, 5003, 5009, 5011, 5021, 5023, 5039, 5051, 5059, 5077, 5081, 5087, 5099, 5101, 5107, 5113, 5119, 5147, 5153, 5167, 5171, 5179, 5189, 5197, 5209, 5227, 5231, 5233, 5237, 5261, 5273, 5279, 5281, 5297, 5303, 5309, 5323, 5333, 5347, 5351, 5381, 5387, 5393, 5399, 5407, 5413, 5417, 5419, 5431, 5437, 5441, 5443, 5449, 5471, 5477, 5479, 5483, 5501, 5503, 5507, 5519, 5521, 5527, 5531, 5557, 5563, 5569, 5573, 5581, 5591, 5623, 5639, 5641, 5647, 5651, 5653, 5657, 5659, 5669, 5683, 5689, 5693, 5701, 5711, 5717, 5737, 5741, 5743, 5749, 5779, 5783, 5791, 5801, 5807, 5813, 5821, 5827, 5839, 5843, 5849, 5851, 5857, 5861, 5867, 5869, 5879, 5881, 5897, 5903, 5923, 5927, 5939, 5953, 5981, 5987, 6007, 6011, 6029, 6037, 6043, 6047, 6053, 6067, 6073, 6079, 6089, 6091, 6101, 6113, 6121, 6131, 6133, 6143, 6151, 6163, 6173, 6197, 6199, 6203, 6211, 6217, 6221, 6229, 6247, 6257, 6263, 6269, 6271, 6277, 6287, 6299, 6301, 6311, 6317, 6323, 6329, 6337, 6343, 6353, 6359, 6361, 6367, 6373, 6379, 6389, 6397, 6421, 6427, 6449, 6451, 6469, 6473, 6481, 6491, 6521, 6529, 6547, 6551, 6553, 6563, 6569, 6571, 6577, 6581, 6599, 6607, 6619, 6637, 6653, 6659, 6661, 6673, 6679, 6689, 6691, 6701, 6703, 6709, 6719, 6733, 6737, 6761, 6763, 6779, 6781, 6791, 6793, 6803, 6823, 6827, 6829, 6833, 6841, 6857, 6863, 6869, 6871, 6883, 6899, 6907, 6911, 6917, 6947, 6949, 6959, 6961, 6967, 6971, 6977, 6983, 6991, 6997, 7001, 7013, 7019, 7027, 7039, 7043, 7057, 7069, 7079, 7103, 7109, 7121, 7127, 7129, 7151, 7159, 7177, 7187, 7193, 72077211, 7213, 7219, 7229, 7237, 7243, 7247, 7253, 7283, 7297, 7307, 7309, 7321, 7331, 7333, 7349, 7351, 7369, 7393, 7411, 7417, 7433, 7451, 7457, 7459, 7477, 7481, 7487, 7489, 7499, 7507, 7517, 7523, 7529, 7537, 7541, 7547, 7549, 7559, 7561, 7573, 7577, 7583, 7589, 7591, 7603, 7607, 7621, 7639, 7643, 7649, 7669, 7673, 7681, 7687, 7691, 7699, 7703, 7717, 7723, 7727, 7741, 7753, 7757, 7759, 7789, 7793, 7817, 7823, 7829, 7841, 7853, 7867, 7873, 7877, 7879, 7883, 7901, 7907, 7919],
    primes_bigints: [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n, 101n, 103n, 107n, 109n, 113n, 127n, 131n, 137n, 139n, 149n, 151n, 157n, 163n, 167n, 173n, 179n, 181n, 191n, 193n, 197n, 199n, 211n, 223n, 227n, 229n, 233n, 239n, 241n, 251n, 257n, 263n, 269n, 271n, 277n, 281n, 283n, 293n, 307n, 311n, 313n, 317n, 331n, 337n, 347n, 349n, 353n, 359n, 367n, 373n, 379n, 383n, 389n, 397n, 401n, 409n, 419n, 421n, 431n, 433n, 439n, 443n, 449n, 457n, 461n, 463n, 467n, 479n, 487n, 491n, 499n, 503n, 509n, 521n, 523n, 541n, 547n, 557n, 563n, 569n, 571n, 577n, 587n, 593n, 599n, 601n, 607n, 613n, 617n, 619n, 631n, 641n, 643n, 647n, 653n, 659n, 661n, 673n, 677n, 683n, 691n, 701n, 709n, 719n, 727n, 733n, 739n, 743n, 751n, 757n, 761n, 769n, 773n, 787n, 797n, 809n, 811n, 821n, 823n, 827n, 829n, 839n, 853n, 857n, 859n, 863n, 877n, 881n, 883n, 887n, 907n, 911n, 919n, 929n, 937n, 941n, 947n, 953n, 967n, 971n, 977n, 983n, 991n, 997n, 1009n, 1013n, 1019n, 1021n, 1031n, 1033n, 1039n, 1049n, 1051n, 1061n, 1063n, 1069n, 1087n, 1091n, 1093n, 1097n, 1103n, 1109n, 1117n, 1123n, 1129n, 1151n, 1153n, 1163n, 1171n, 1181n, 1187n, 1193n, 1201n, 1213n, 1217n, 1223n, 1229n, 1231n, 1237n, 1249n, 1259n, 1277n, 1279n, 1283n, 1289n, 1291n, 1297n, 1301n, 1303n, 1307n, 1319n, 1321n, 1327n, 1361n, 1367n, 1373n, 1381n, 1399n, 1409n, 1423n, 1427n, 1429n, 1433n, 1439n, 1447n, 1451n, 1453n, 1459n, 1471n, 1481n, 1483n, 1487n, 1489n, 1493n, 1499n, 1511n, 1523n, 1531n, 1543n, 1549n, 1553n, 1559n, 1567n, 1571n, 1579n, 1583n, 1597n, 1601n, 1607n, 1609n, 1613n, 1619n, 1621n, 1627n, 1637n, 1657n, 1663n, 1667n, 1669n, 1693n, 1697n, 1699n, 1709n, 1721n, 1723n, 1733n, 1741n, 1747n, 1753n, 1759n, 1777n, 1783n, 1787n, 1789n, 1801n, 1811n, 1823n, 1831n, 1847n, 1861n, 1867n, 1871n, 1873n, 1877n, 1879n, 1889n, 1901n, 1907n, 1913n, 1931n, 1933n, 1949n, 1951n, 1973n, 1979n, 1987n, 1993n, 1997n, 1999n, 2003n, 2011n, 2017n, 2027n, 2029n, 2039n, 2053n, 2063n, 2069n, 2081n, 2083n, 2087n, 2089n, 2099n, 2111n, 2113n, 2129n, 2131n, 2137n, 2141n, 2143n, 2153n, 2161n, 2179n, 2203n, 2207n, 2213n, 2221n, 2237n, 2239n, 2243n, 2251n, 2267n, 2269n, 2273n, 2281n, 2287n, 2293n, 2297n, 2309n, 2311n, 2333n, 2339n, 2341n, 2347n, 2351n, 2357n, 2371n, 2377n, 2381n, 2383n, 2389n, 2393n, 2399n, 2411n, 2417n, 2423n, 2437n, 2441n, 2447n, 2459n, 2467n, 2473n, 2477n, 2503n, 2521n, 2531n, 2539n, 2543n, 2549n, 2551n, 2557n, 2579n, 2591n, 2593n, 2609n, 2617n, 2621n, 2633n, 2647n, 2657n, 2659n, 2663n, 2671n, 2677n, 2683n, 2687n, 2689n, 2693n, 2699n, 2707n, 2711n, 2713n, 2719n, 2729n, 2731n, 2741n, 2749n, 2753n, 2767n, 2777n, 2789n, 2791n, 2797n, 2801n, 2803n, 2819n, 2833n, 2837n, 2843n, 2851n, 2857n, 2861n, 2879n, 2887n, 2897n, 2903n, 2909n, 2917n, 2927n, 2939n, 2953n, 2957n, 2963n, 2969n, 2971n, 2999n, 3001n, 3011n, 3019n, 3023n, 3037n, 3041n, 3049n, 3061n, 3067n, 3079n, 3083n, 3089n, 3109n, 3119n, 3121n, 3137n, 3163n, 3167n, 3169n, 3181n, 3187n, 3191n, 3203n, 3209n, 3217n, 3221n, 3229n, 3251n, 3253n, 3257n, 3259n, 3271n, 3299n, 3301n, 3307n, 3313n, 3319n, 3323n, 3329n, 3331n, 3343n, 3347n, 3359n, 3361n, 3371n, 3373n, 3389n, 3391n, 3407n, 3413n, 3433n, 3449n, 3457n, 3461n, 3463n, 3467n, 3469n, 3491n, 3499n, 3511n, 3517n, 3527n, 3529n, 3533n, 3539n, 3541n, 3547n, 3557n, 3559n, 3571n, 3581n, 3583n, 3593n, 3607n, 3613n, 3617n, 3623n, 3631n, 3637n, 3643n, 3659n, 3671n, 3673n, 3677n, 3691n, 3697n, 3701n, 3709n, 3719n, 3727n, 3733n, 3739n, 3761n, 3767n, 3769n, 3779n, 3793n, 3797n, 3803n, 3821n, 3823n, 3833n, 3847n, 3851n, 3853n, 3863n, 3877n, 3881n, 3889n, 3907n, 3911n, 3917n, 3919n, 3923n, 3929n, 3931n, 3943n, 3947n, 3967n, 3989n, 4001n, 4003n, 4007n, 4013n, 4019n, 4021n, 4027n, 4049n, 4051n, 4057n, 4073n, 4079n, 4091n, 4093n, 4099n, 4111n, 4127n, 4129n, 4133n, 4139n, 4153n, 4157n, 4159n, 4177n, 4201n, 4211n, 4217n, 4219n, 4229n, 4231n, 4241n, 4243n, 4253n, 4259n, 4261n, 4271n, 4273n, 4283n, 4289n, 4297n, 4327n, 4337n, 4339n, 4349n, 4357n, 4363n, 4373n, 4391n, 4397n, 4409n, 4421n, 4423n, 4441n, 4447n, 4451n, 4457n, 4463n, 4481n, 4483n, 4493n, 4507n, 4513n, 4517n, 4519n, 4523n, 4547n, 4549n, 4561n, 4567n, 4583n, 4591n, 4597n, 4603n, 4621n, 4637n, 4639n, 4643n, 4649n, 4651n, 4657n, 4663n, 4673n, 4679n, 4691n, 4703n, 4721n, 4723n, 4729n, 4733n, 4751n, 4759n, 4783n, 4787n, 4789n, 4793n, 4799n, 4801n, 4813n, 4817n, 4831n, 4861n, 4871n, 4877n, 4889n, 4903n, 4909n, 4919n, 4931n, 4933n, 4937n, 4943n, 4951n, 4957n, 4967n, 4969n, 4973n, 4987n, 4993n, 4999n, 5003n, 5009n, 5011n, 5021n, 5023n, 5039n, 5051n, 5059n, 5077n, 5081n, 5087n, 5099n, 5101n, 5107n, 5113n, 5119n, 5147n, 5153n, 5167n, 5171n, 5179n, 5189n, 5197n, 5209n, 5227n, 5231n, 5233n, 5237n, 5261n, 5273n, 5279n, 5281n, 5297n, 5303n, 5309n, 5323n, 5333n, 5347n, 5351n, 5381n, 5387n, 5393n, 5399n, 5407n, 5413n, 5417n, 5419n, 5431n, 5437n, 5441n, 5443n, 5449n, 5471n, 5477n, 5479n, 5483n, 5501n, 5503n, 5507n, 5519n, 5521n, 5527n, 5531n, 5557n, 5563n, 5569n, 5573n, 5581n, 5591n, 5623n, 5639n, 5641n, 5647n, 5651n, 5653n, 5657n, 5659n, 5669n, 5683n, 5689n, 5693n, 5701n, 5711n, 5717n, 5737n, 5741n, 5743n, 5749n, 5779n, 5783n, 5791n, 5801n, 5807n, 5813n, 5821n, 5827n, 5839n, 5843n, 5849n, 5851n, 5857n, 5861n, 5867n, 5869n, 5879n, 5881n, 5897n, 5903n, 5923n, 5927n, 5939n, 5953n, 5981n, 5987n, 6007n, 6011n, 6029n, 6037n, 6043n, 6047n, 6053n, 6067n, 6073n, 6079n, 6089n, 6091n, 6101n, 6113n, 6121n, 6131n, 6133n, 6143n, 6151n, 6163n, 6173n, 6197n, 6199n, 6203n, 6211n, 6217n, 6221n, 6229n, 6247n, 6257n, 6263n, 6269n, 6271n, 6277n, 6287n, 6299n, 6301n, 6311n, 6317n, 6323n, 6329n, 6337n, 6343n, 6353n, 6359n, 6361n, 6367n, 6373n, 6379n, 6389n, 6397n, 6421n, 6427n, 6449n, 6451n, 6469n, 6473n, 6481n, 6491n, 6521n, 6529n, 6547n, 6551n, 6553n, 6563n, 6569n, 6571n, 6577n, 6581n, 6599n, 6607n, 6619n, 6637n, 6653n, 6659n, 6661n, 6673n, 6679n, 6689n, 6691n, 6701n, 6703n, 6709n, 6719n, 6733n, 6737n, 6761n, 6763n, 6779n, 6781n, 6791n, 6793n, 6803n, 6823n, 6827n, 6829n, 6833n, 6841n, 6857n, 6863n, 6869n, 6871n, 6883n, 6899n, 6907n, 6911n, 6917n, 6947n, 6949n, 6959n, 6961n, 6967n, 6971n, 6977n, 6983n, 6991n, 6997n, 7001n, 7013n, 7019n, 7027n, 7039n, 7043n, 7057n, 7069n, 7079n, 7103n, 7109n, 7121n, 7127n, 7129n, 7151n, 7159n, 7177n, 7187n, 7193n, 72077211n, 7213n, 7219n, 7229n, 7237n, 7243n, 7247n, 7253n, 7283n, 7297n, 7307n, 7309n, 7321n, 7331n, 7333n, 7349n, 7351n, 7369n, 7393n, 7411n, 7417n, 7433n, 7451n, 7457n, 7459n, 7477n, 7481n, 7487n, 7489n, 7499n, 7507n, 7517n, 7523n, 7529n, 7537n, 7541n, 7547n, 7549n, 7559n, 7561n, 7573n, 7577n, 7583n, 7589n, 7591n, 7603n, 7607n, 7621n, 7639n, 7643n, 7649n, 7669n, 7673n, 7681n, 7687n, 7691n, 7699n, 7703n, 7717n, 7723n, 7727n, 7741n, 7753n, 7757n, 7759n, 7789n, 7793n, 7817n, 7823n, 7829n, 7841n, 7853n, 7867n, 7873n, 7877n, 7879n, 7883n, 7901n, 7907n, 7919],

    /** Divisors of `n`. When `n = 210`, this returns the divisors `[1, 2, 3, 5, 6, 7, 10, 14, 15, 21, 30, 35, 42, 70, 105, 210]`.
     *
     * @param {number} n
     * @returns {Array.<number>} - Divisors of n.
     */
    divisors: function(n) {
        n = math.abs(math.ensure_bigint(n));

        if(n < 1n) {
            return [];
        }

        var divisor_arr = [1n];
        var exponents = math.factorise(n);
        for(var i = 0; i < exponents.length; i++) {
            var divisor_arr_copy = [];
            for(var j = 0n; j <= exponents[i]; j++) {
                divisor_arr_copy = divisor_arr_copy.concat(divisor_arr.map((number) => number * math.primes_bigints[i] ** j));
            }
            divisor_arr = divisor_arr_copy;
        }
        return divisor_arr;
    },


    /** Proper divisors of `n`: the divisors of `n`, excluding `n` itself. When `n = 210`, this returns the divisors `[2, 3, 5, 6, 7, 10, 14, 15, 21, 30, 35, 42, 70, 105]`.
     *
     * @param {number} n
     * @returns {Array.<number>} - Proper divisors of n.
     */
    proper_divisors: function(n) {
        var divisors = math.divisors(n);
        return divisors.slice(0, divisors.length - 1);
    },

    /** Factorise `n`. When `n=2^(a1)*3^(a2)*5^(a3)*...`, this returns the powers `[a1,a2,a3,...]`.
     *
     * @param {number} n
     * @returns {Array.<number>} - Exponents of the prime factors of n.
     */
    factorise: function(n) {
        const use_bigint = typeof n == 'bigint';
        n = math.abs(n);
        if(typeof n != 'bigint') {
            n = BigInt(Math.floor(n));
        }
        if(n <= 0n) {
            return [];
        }
        var factors = [];
        for(let i = 0; i < math.primes_bigints.length;i++) {
            var acc = 0n;
            var p = math.primes_bigints[i];
            while(n % p == 0n) {
                acc += 1n;
                n /= p;
            }
            factors.push(acc);
            if(n == 1n) {
                break;
            }
        }
        return use_bigint ? factors : factors.map((f) => Number(f));
    },

    /**
     * The largest perfect square factor of the given number.
     *
     * When the prime factorisation of `n` is `p_1^x_1 * p_2^x_2 ... p_k^x_k`, the largest perfect square factor is `p_1^(2*floor(x_1/2)) * ... p_k^(2*floor(x_k)/2)`.
     *
     * @param {number} n
     * @returns {number}
     */
    largest_square_factor: function(n) {
        const use_bigint = typeof n == 'bigint';
        n = math.abs(n);
        if(typeof n != 'bigint') {
            n = BigInt(Math.floor(n));
        }

        var factors = math.factorise(n).map(function(f) {
            return f - f % 2n;
        });
        var t = 1n;
        factors.forEach(function(f, i) {
            t *= math.primes_bigints[i] ** f;
        });

        return use_bigint ? t : Number(t);
    },

    /** Sum the elements in the given list.
     *
     * @param {Array.<number>} list
     * @returns {number}
     */
    sum: function(list) {
        var l = list.length;
        if(l == 0) {
            return 0;
        }
        var total = 0n;

        for(let i = 0;i < l;i++) {
            let b = list[i];
            if(typeof b != 'bigint') {
                total = Number(total);
            } else if(typeof total != 'bigint') {
                b = Number(b);
            }
            total = math.add(total, b);
        }
        return total;
    },
    /** Multiplies the elements in the given list.
     *
     * @param {Array.<number>} list
     * @returns {number}
     */
    prod: function(list) {
        var product = 1n;
        if(list.length == 0) {
            return 1;
        }
        for(var i = 0; i < list.length; i++) {
            let b = list[i];
            if(typeof b != 'bigint') {
                product = Number(product);
            } else if(typeof product != 'bigint') {
                b = Number(b);
            }

            product = math.mul(product, b);
        }
        return product;
    }
};
math.gcf = math.gcd;

var add = math.add;
var sub = math.sub;
var mul = math.mul;
var div = math.div;
var eq = math.eq;
var negate = math.negate;


/** A rational number.
 *
 * @class
 * @param {number} numerator
 * @param {number} denominator
 *
 * @property {number} numerator - The numerator.
 * @property {number} denominator - The denominator.
 * @memberof Numbas.math
 */
var Fraction = math.Fraction = function(numerator, denominator) {
    if(denominator === undefined) {
        denominator = 1n;
    }

    if(typeof numerator == 'number' && typeof denominator == 'number') {
        while(numerator % 1 != 0 || denominator % 1 != 0) {
            numerator *= 2;
            denominator *= 2;
        }
    }

    numerator = math.ensure_bigint(numerator);
    denominator = math.ensure_bigint(denominator);

    if(denominator < 0n) {
        numerator = -numerator;
        denominator = -denominator;
    }

    this.bigNumerator = numerator;
    this.bigDenominator = denominator;
}
Fraction.prototype = {
    get numerator() {
        return Number(this.bigNumerator);
    },
    set numerator(n) {
        this.bigNumerator = math.ensure_bigint(n);
    },
    get denominator() {
        return Number(this.bigDenominator);
    },
    set denominator(n) {
        this.bigDenominator = math.ensure_bigint(n);
    },

    toString: function() {
        if(this.bigDenominator == 1) {
            return this.bigNumerator + '';
        } else {
            return this.bigNumerator + '/' + this.bigDenominator;
        }
    },
    toFloat: function() {
        return Number(this.bigNumerator) / Number(this.bigDenominator);
    },
    toDecimal: function() {
        return (new Decimal(Number(this.bigNumerator))).div(new Decimal(Number(this.bigDenominator)));
    },
    reduce: function() {
        if(this.bigDenominator == 0n) {
            return;
        }
        if(this.bigDenominator < 0n) {
            this.bigNumerator = -this.bigNumerator;
            this.bigDenominator = -this.bigDenominator;
        }
        var g = math.gcd(this.bigNumerator, this.bigDenominator);
        this.bigNumerator /= g;
        this.bigDenominator /= g;
    },

    /** Returns a copy of this fraction reduced to lowest terms.
     *
     * @returns {Numbas.math.Fraction}
     */
    reduced: function() {
        var f = new Fraction(this.bigNumerator, this.bigDenominator);
        f.reduce();
        return f;
    },
    add: function(b) {
        if(typeof(b) === 'number') {
            b = Fraction.fromFloat(b);
        }
        var numerator, denominator;
        if(this.bigDenominator == b.bigDenominator) {
            numerator = this.bigNumerator + b.bigNumerator;
            denominator = this.bigDenominator;
        } else {
            numerator = this.bigNumerator * b.bigDenominator + b.bigNumerator * this.bigDenominator;
            denominator = this.bigDenominator * b.bigDenominator;
        }
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    subtract: function(b) {
        if(typeof(b) === 'number') {
            b = Fraction.fromFloat(b);
        }
        var numerator, denominator;
        if(this.bigDenominator == b.bigDenominator) {
            numerator = this.bigNumerator - b.bigNumerator;
            denominator = this.bigDenominator;
        } else {
            numerator = this.bigNumerator * b.bigDenominator - b.bigNumerator * this.bigDenominator;
            denominator = this.bigDenominator * b.bigDenominator;
        }
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    multiply: function(b) {
        if(typeof(b) === 'number') {
            b = Fraction.fromFloat(b);
        }
        var numerator = this.bigNumerator * b.bigNumerator;
        var denominator = this.bigDenominator * b.bigDenominator;
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    divide: function(b) {
        if(typeof(b) === 'number') {
            b = Fraction.fromFloat(b);
        }
        var numerator = this.bigNumerator * b.bigDenominator;
        var denominator = this.bigDenominator * b.bigNumerator;
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    reciprocal: function() {
        return new Fraction(this.bigDenominator, this.bigNumerator);
    },
    negate: function() {
        return new Fraction(-this.bigNumerator, this.bigDenominator);
    },
    equals: function(b) {
        return this.subtract(b).bigNumerator == 0n;
    },
    lt: function(b) {
        return this.subtract(b).bigNumerator < 0n;
    },
    gt: function(b) {
        return this.subtract(b).bigNumerator > 0n;
    },
    leq: function(b) {
        return this.subtract(b).bigNumerator <= 0n;
    },
    geq: function(b) {
        return this.subtract(b).bigNumerator >= 0n;
    },
    pow: function(n) {
        n = math.ensure_bigint(n);
        var numerator = n >= 0n ? this.bigNumerator : this.bigDenominator;
        var denominator = n >= 0n ? this.bigDenominator : this.bigNumerator;
        n = math.abs(n);
        return new Fraction(numerator ** n, denominator ** n);
    },
    trunc: function() {
        var sign = math.sign(this.bigNumerator);
        var n = math.abs(this.bigNumerator);
        var d = this.bigDenominator;
        return sign * Number((n - n % d) / d);
    },
    floor: function() {
        var t = this.trunc();
        return (this.bigNumerator < 0n) && (this.bigNumerator % this.bigDenominator != 0n) ? t - 1 : t;
    },
    ceil: function() {
        var t = this.trunc();
        return this.bigNumerator > 0n && (this.bigNumerator % this.bigDenominator != 0n) ? t + 1 : t;
    },
    fract: function() {
        return new Fraction(this.bigNumerator % this.bigDenominator, this.bigDenominator);
    },
    is_zero: function() {
        return this.bigNumerator == 0n;
    },
    is_one: function() {
        return this.bigNumerator == this.bigDenominator;
    }
}
Fraction.zero = new Fraction(0n, 1n);
Fraction.one = new Fraction(1n, 1n);
Fraction.fromFloat = function(n) {
    var approx = math.rationalApproximation(n);
    return new Fraction(approx[0], approx[1]);
}
Fraction.fromDecimal = function(n, accuracy) {
    accuracy = accuracy === undefined ? 1e15 : accuracy;
    var approx = n.toFraction(accuracy);
    return new Fraction(approx[0].toNumber(), approx[1].toNumber());
}
Fraction.common_denominator = function(fractions) {
    var d = 1n;
    fractions.forEach(function(f) {
        d = math.lcm(d, f.denominator);
    });
    return fractions.map(function(f) {
        var m = d / f.denominator;
        return new Fraction(f.numerator * m, d);
    });
}
Fraction.min = function() {
    if(arguments.length == 0) {
        return;
    }
    var commons = Fraction.common_denominator(Array.prototype.slice.apply(arguments));
    var best = 0;
    for(let i = 1;i < commons.length;i++) {
        if(commons[i].numerator < commons[best].numerator) {
            best = i;
        }
    }
    return arguments[best];
}
Fraction.max = function() {
    if(arguments.length == 0) {
        return;
    }
    var commons = Fraction.common_denominator(Array.prototype.slice.apply(arguments));
    var best = 0;
    for(let i = 1;i < commons.length;i++) {
        if(commons[i].numerator > commons[best].numerator) {
            best = i;
        }
    }
    return arguments[best];
}


/** Coerce the given number to a {@link Numbas.math.ComplexDecimal} value.
 *
 * @param {number|Decimal|Numbas.math.ComplexDecimal} n
 * @returns {Numbas.math.ComplexDecimal}
 */
var ensure_decimal = math.ensure_decimal = function(n) {
    if(n instanceof ComplexDecimal) {
        return n;
    } else if(n instanceof Decimal) {
        return new ComplexDecimal(n);
    } else if(n.complex) {
        return new ComplexDecimal(new Decimal(n.re), new Decimal(n.im));
    }
    return new ComplexDecimal(new Decimal(n));
}

/**
 * Is the given argument a `ComplexDecimal` value?
 *
 * @param {object} n
 * @returns {boolean}
 */
math.isComplexDecimal = function(n) {
    return n instanceof ComplexDecimal;
}

/** A complex number with components stored as `Decimal` objects.
 *
 * @param {Decimal} re
 * @param {Decimal} [im]
 * @property {Decimal} re - The real part.
 * @property {Decimal} im - The imaginary part.
 * @class
 * @memberof Numbas.math
 */
var ComplexDecimal = math.ComplexDecimal = function(re, im) {
    this.re = re;
    if(im === undefined) {
        im = new Decimal(0);
    }
    this.im = im;
}
ComplexDecimal.prototype = {
    toString: function() {
        var re = this.re.toString();
        if(this.isReal()) {
            return re;
        } else {
            var symbol = this.im.isNegative() ? '-' : '+';
            var im = this.im.absoluteValue().toString();
            return re + ' ' + symbol + ' ' + im + 'i';
        }
    },

    toNumber: function() {
        return this.re.toNumber();
    },

    toComplexNumber: function() {
        if(this.isReal()) {
            return this.re.toNumber();
        } else {
            return {complex: true, re: this.re.toNumber(), im: this.im.toNumber()};
        }
    },

    isReal: function() {
        return this.im.isZero();
    },

    equals: function(b) {
        b = ensure_decimal(b);
        return this.re.equals(b.re) && this.im.equals(b.im);
    },

    lessThan: function(b) {
        b = ensure_decimal(b);
        if(!(this.isReal() && b.isReal())) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return this.re.lessThan(b.re);
    },

    lessThanOrEqualTo: function(b) {
        b = ensure_decimal(b);
        if(!(this.isReal() && b.isReal())) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return this.re.lessThanOrEqualTo(b.re);
    },

    greaterThan: function(b) {
        b = ensure_decimal(b);
        if(!(this.isReal() && b.isReal())) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return this.re.greaterThan(b.re);
    },

    greaterThanOrEqualTo: function(b) {
        b = ensure_decimal(b);
        if(!(this.isReal() && b.isReal())) {
            throw(new Numbas.Error('math.order complex numbers'));
        }
        return this.re.greaterThanOrEqualTo(b.re);
    },

    negated: function() {
        return new ComplexDecimal(this.re.negated(), this.im.negated());
    },

    conjugate: function() {
        return new ComplexDecimal(this.re, this.im.negated());
    },

    plus: function(b) {
        b = ensure_decimal(b);
        return new ComplexDecimal(this.re.plus(b.re), this.im.plus(b.im));
    },

    minus: function(b) {
        b = ensure_decimal(b);
        return new ComplexDecimal(this.re.minus(b.re), this.im.minus(b.im));
    },
    times: function(b) {
        b = ensure_decimal(b);
        var re = this.re.times(b.re).minus(this.im.times(b.im));
        var im = this.re.times(b.im).plus(this.im.times(b.re));
        return new ComplexDecimal(re, im);
    },

    dividedBy: function(b) {
        b = ensure_decimal(b);
        if(b.isZero()) {
            return new ComplexDecimal(new Decimal(NaN), new Decimal(0));
        }
        var q = b.re.times(b.re).plus(b.im.times(b.im));
        var re = this.re.times(b.re).plus(this.im.times(b.im)).dividedBy(q);
        var im = this.im.times(b.re).minus(this.re.times(b.im)).dividedBy(q);
        return new ComplexDecimal(re, im);
    },

    pow: function(b) {
        b = ensure_decimal(b);
        if(this.isReal() && b.isReal()) {
            if(this.re.greaterThanOrEqualTo(0) || b.re.isInt()) {
                return new ComplexDecimal(this.re.pow(b.re), new Decimal(0));
            } else if(b.re.times(2).isInt()) {
                return new ComplexDecimal(new Decimal(0), this.re.negated().pow(b.re));
            }
        }
        var ss = this.re.times(this.re).plus(this.im.times(this.im));
        var arg1 = Decimal.atan2(this.im, this.re);
        var mag = ss.pow(b.re.dividedBy(2)).times(Decimal.exp(b.im.times(arg1).negated()));
        var arg = b.re.times(arg1).plus(b.im.times(Decimal.ln(ss)).dividedBy(2));
        return new ComplexDecimal(mag.times(arg.cos()), mag.times(arg.sin()));
    },

    squareRoot: function() {
        if(!this.isReal()) {
            var r = this.re.times(this.re).plus(this.im.times(this.im)).squareRoot();
            var re = r.plus(this.re).dividedBy(2).squareRoot();
            var im = (new Decimal(this.im.lessThan(0) ? -1 : 1)).times(r.minus(this.re).dividedBy(2).squareRoot());
            return new ComplexDecimal(re, im);
        }
        if(this.re.lessThan(0)) {
            return new ComplexDecimal(new Decimal(0), this.re.absoluteValue().squareRoot());
        } else {
            return new ComplexDecimal(this.re.squareRoot());
        }
    },

    reciprocal: function() {
        var denominator = this.re.pow(2).add(this.im.pow(2));
        return new ComplexDecimal(this.re.dividedBy(denominator), this.im.dividedBy(denominator));
    },

    absoluteValue: function() {
        return new ComplexDecimal(this.re.times(this.re).plus(this.im.times(this.im)).squareRoot());
    },

    argument: function() {
        return new ComplexDecimal(Decimal.atan2(this.im, this.re));
    },

    ln: function() {
        return new ComplexDecimal(this.absoluteValue().re.ln(), this.argument().re);
    },

    exp: function() {
        var r = this.re.exp();
        return new ComplexDecimal(r.times(Decimal.cos(this.im)), r.times(Decimal.sin(this.im)));
    },

    isInt: function() {
        return this.re.isInt() && this.im.isInt();
    },

    isNaN: function() {
        return this.re.isNaN() || this.im.isNaN();
    },

    isZero: function() {
        return this.re.isZero() && this.im.isZero();
    },

    isOne: function() {
        return this.im.isZero() && this.re.equals(new Decimal(1));
    },

    round: function() {
        return new ComplexDecimal(this.re.round(), this.im.round());
    },

    toDecimalPlaces: function(dp) {
        return new ComplexDecimal(this.re.toDecimalPlaces(dp), this.im.toDecimalPlaces(dp));
    },

    toFixed: function(dp) {
        var re = this.re.toFixed(dp);
        if(this.isReal()) {
            return re;
        } else {
            var symbol = this.im.isNegative() ? '-' : '+';
            var im = this.im.absoluteValue().toFixed(dp);
            return re + ' ' + symbol + ' ' + im + 'i';
        }
    },

    toNearest: function(n) {
        return new ComplexDecimal(this.re.toNearest(n), this.im.toNearest(n));
    },

    toPrecision: function(sf) {
        var re = this.re.toPrecision(sf);
        if(this.isReal()) {
            return re;
        } else {
            var symbol = this.im.isNegative() ? '-' : '+';
            var im = this.im.absoluteValue().toPrecision(sf);
            return re + ' ' + symbol + ' ' + im + 'i';
        }
    },

    toSignificantDigits: function(sf) {
        return new ComplexDecimal(this.re.toSignificantDigits(sf), this.im.toSignificantDigits(sf));
    }
}

ComplexDecimal.min = function(a, b) {
    if(!(a.isReal() && b.isReal())) {
        throw(new Numbas.Error('math.order complex numbers'));
    }
    return new ComplexDecimal(Decimal.min(a.re, b.re));
}
ComplexDecimal.max = function(a, b) {
    if(!(a.isReal() && b.isReal())) {
        throw(new Numbas.Error('math.order complex numbers'));
    }
    return new ComplexDecimal(Decimal.max(a.re, b.re));
}



/** A list of a vector's components.
 *
 * @typedef vector
 * @type {Array.<number>}
 */
/** Vector operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeros in when pairs of vectors don't line up exactly.
 *
 * @namespace Numbas.vectormath
 */
var vectormath = Numbas.vectormath = {
    /** Negate a vector - negate each of its components.
     *
     * @param {vector} v
     * @returns {vector}
     */
    negate: function(v) {
        return v.map(function(x) {
            return negate(x);
        });
    },
    /** Add two vectors.
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {vector}
     */
    add: function(a, b) {
        if(b.length > a.length) {
            var c = b;
            b = a;
            a = c;
        }
        return a.map(function(x, i) {
            return add(x, b[i] || 0)
        });
    },
    /** Subtract one vector from another.
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {vector}
     */
    sub: function(a, b) {
        if(b.length > a.length) {
            return b.map(function(x, i) {
                return sub(a[i] || 0, x)
            });
        } else {
            return a.map(function(x, i) {
                return sub(x, b[i] || 0)
            });
        }
    },
    /** Multiply by a scalar.
     *
     * @param {number} k
     * @param {vector} v
     * @returns {vector}
     */
    mul: function(k, v) {
        return v.map(function(x) {
            return mul(k, x)
        });
    },
    /** Divide by a scalar.
     *
     * @param {vector} v
     * @param {number} k
     * @returns {vector}
     */
    div: function(v, k) {
        return v.map(function(x) {
            return div(x, k);
        });
    },
    /** Vector dot product - each argument can be a vector, or a matrix with one row or one column, which is converted to a vector.
     *
     * @param {vector|matrix} a
     * @param {vector|matrix} b
     * @returns {number}
     * @throws {Numbas.Error} "vectormaths.dot.matrix too big" if either of `a` or `b` is bigger than `1xN` or `Nx1`.
     */
    dot: function(a, b) {
        //check if A is a matrix object. If it's the right shape, we can use it anyway
        if('rows' in a) {
            if(a.rows == 1) {
                a = a[0];
            } else if(a.columns == 1) {
                a = a.map(function(x) {
                    return x[0]
                });
            } else {
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
            }
        }
        //Same check for B
        if('rows' in b) {
            if(b.rows == 1) {
                b = b[0];
            } else if(b.columns == 1) {
                b = b.map(function(x) {
                    return x[0]
                });
            } else {
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
            }
        }
        if(b.length > a.length) {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s, x, i) {
            return add(s, mul(x, b[i] || 0))
        }, 0);
    },
    /** Vector cross product - each argument can be a vector, or a matrix with one row, which is converted to a vector.
     *
     * @param {vector|matrix} a
     * @param {vector|matrix} b
     * @returns {vector}
     *
     * @throws {Numbas.Error} "vectormaths.cross.matrix too big" if either of `a` or `b` is bigger than `1xN` or `Nx1`.
     * @throws {Numbas.Error} "vectormath.cross.not 3d" if either of the vectors is not 3D.
     */
    cross: function(a, b) {
        //check if A is a matrix object. If it's the right shape, we can use it anyway
        if('rows' in a) {
            if(a.rows == 1) {
                a = a[0];
            } else if(a.columns == 1) {
                a = a.map(function(x) {
                    return x[0]
                });
            } else {
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
            }
        }
        //Same check for B
        if('rows' in b) {
            if(b.rows == 1) {
                b = b[0];
            } else if(b.columns == 1) {
                b = b.map(function(x) {
                    return x[0]
                });
            } else {
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
            }
        }
        if(a.length != 3 || b.length != 3) {
            throw(new Numbas.Error('vectormath.cross.not 3d'));
        }
        return [
                sub(mul(a[1], b[2]), mul(a[2], b[1])),
                sub(mul(a[2], b[0]), mul(a[0], b[2])),
                sub(mul(a[0], b[1]), mul(a[1], b[0]))
                ];
    },
    /** Length of a vector, squared.
     *
     * @param {vector} a
     * @returns {number}
     */
    abs_squared: function(a) {
        return a.reduce(function(s, x) {
            return s + mul(x, x);
        }, 0);
    },
    /** Length of a vector.
     *
     * @param {vector} a
     * @returns {number}
     */
    abs: function(a) {
        return Math.sqrt(a.reduce(function(s, x) {
            return s + mul(x, x);
        }, 0));
    },
    /** Angle between vectors a and b, in radians, or 0 if either vector has length 0.
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {number}
     */
    angle: function(a, b) {
        var dot = vectormath.dot(a, b);
        var da = vectormath.abs_squared(a);
        var db = vectormath.abs_squared(b);
        if(da * db == 0) {
            return 0;
        }
        var d = Math.sqrt(da * db);
        return math.arccos(dot / d);
    },
    /** Are two vectors equal? True if each pair of corresponding components is equal.
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {boolean}
     */
    eq: function(a, b) {
        if(b.length > a.length) {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s, x, i) {
            return s && eq(x, b[i] || 0)
        }, true);
    },
    /** Are two vectors unequal?
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {boolean}
     * @see Numbas.vectormath.eq
     */
    neq: function(a, b) {
        return !vectormath.eq(a, b);
    },
    /** Multiply a vector on the left by a matrix.
     *
     * @param {matrix} m
     * @param {vector} v
     * @returns {vector}
     */
    matrixmul: function(m, v) {
        return m.map(function(row) {
            return row.reduce(function(s, x, i) {
                return add(s, mul(x, v[i] || 0));
            }, 0);
        });
    },
    /** Multiply a vector on the right by a matrix.
     * The vector is considered as a column vector.
     *
     * @param {vector} v
     * @param {matrix} m
     * @returns {vector}
     */
    vectormatrixmul: function(v, m) {
        var out = [];
        for(let i = 0;i < m.columns;i++) {
            out.push(v.reduce(function(s, x, j) {
                var c = j < m.rows ? (m[j][i] || 0) : 0; return add(s, mul(x, c));
            }, 0));
        }
        return out;
    },
    /** Apply given function to each element.
     *
     * @param {vector} v
     * @param {Function} fn
     * @returns {vector}
     */
    map: function(v, fn) {
        return v.map(fn);
    },
    /** Round each element to given number of decimal places.
     *
     * @param {vector} v
     * @param {number} dp - Number of decimal places.
     * @returns {vector}
     */
    precround: function(v, dp) {
        return vectormath.map(v, function(n) {
            return math.precround(n, dp);
        });
    },
    /** Round each element to given number of significant figures.
     *
     * @param {vector} v
     * @param {number} sf - Number of decimal places.
     * @returns {vector}
     */
    siground: function(v, sf) {
        return vectormath.map(v, function(n) {
            return math.siground(n, sf);
        });
    },
    /** Transpose of a vector.
     *
     * @param {vector} v
     * @returns {matrix}
     */
    transpose: function(v) {
        var matrix = [v.slice()];
        matrix.rows = 1;
        matrix.columns = v.length;
        return matrix;
    },
    /** Convert a vector to a 1-column matrix.
     *
     * @param {vector} v
     * @returns {matrix}
     */
    toMatrix: function(v) {
        var m = v.map(function(n) {
            return [n]
        });
        m.rows = m.length;
        m.columns = 1;
        return m;
    },

    /** Is every component of this vector zero?
     *
     * @param {vector} v
     * @returns {boolean}
     */
    is_zero: function(v) {
        return v.every(function(c) {
            return c == 0;
        });
    }
}
/** A two-dimensional matrix: an array of rows, each of which is an array of numbers.
 *
 * @typedef matrix
 * @type {Array.<Array.<number>>}
 * @property {number} rows - The number of rows in the matrix.
 * @property {number} columns - The number of columns in the matrix.
 */
/** Matrix operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeros in when pairs of matrices don't line up exactly.
 *
 * @namespace Numbas.matrixmath
 */
var matrixmath = Numbas.matrixmath = {
    /** Negate a matrix - negate each of its elements .
     *
     * @param {matrix} m
     * @returns {matrix}
     */
    negate: function(m) {
        var matrix = [];
        for(let i = 0;i < m.rows;i++) {
            matrix.push(m[i].map(function(x) {
                return negate(x)
            }));
        }
        matrix.rows = m.rows;
        matrix.columns = m.columns;
        return matrix;
    },
    /** Add two matrices.
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     */
    add: function(a, b) {
        var rows = Math.max(a.rows, b.rows);
        var columns = Math.max(a.columns, b.columns);
        var matrix = [];
        for(let i = 0;i < rows;i++) {
            var row = [];
            matrix.push(row);
            for(let j = 0;j < columns;j++) {
                row[j] = add(a[i][j] || 0, b[i][j] || 0);
            }
        }
        matrix.rows = rows;
        matrix.columns = columns;
        return matrix;
    },
    /** Subtract one matrix from another.
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     */
    sub: function(a, b) {
        var rows = Math.max(a.rows, b.rows);
        var columns = Math.max(a.columns, b.columns);
        var matrix = [];
        for(let i = 0;i < rows;i++) {
            var row = [];
            matrix.push(row);
            for(let j = 0;j < columns;j++) {
                row[j] = sub(a[i][j] || 0, b[i][j] || 0);
            }
        }
        matrix.rows = rows;
        matrix.columns = columns;
        return matrix;
    },
    /** Matrix determinant. Only works up to 3x3 matrices.
     *
     * @param {matrix} m
     * @returns {number}
     * @throws {Numbas.Error} "matrixmath.abs.too big" if the matrix has more than 3 rows.
     */
    abs: function(m) {
        if(m.rows != m.columns) {
            throw(new Numbas.Error('matrixmath.abs.non-square'));
        }
        //abstraction failure!
        switch(m.rows) {
        case 1:
            return m[0][0];
        case 2:
            return sub(mul(m[0][0], m[1][1]), mul(m[0][1], m[1][0]));
        case 3:
            return add(sub(
                            mul(m[0][0], sub(mul(m[1][1], m[2][2]), mul(m[1][2], m[2][1]))),
                            mul(m[0][1], sub(mul(m[1][0], m[2][2]), mul(m[1][2], m[2][0])))
                        ),
                        mul(m[0][2], sub(mul(m[1][0], m[2][1]), mul(m[1][1], m[2][0])))
                    );
        default:
            throw(new Numbas.Error('matrixmath.abs.too big'));
        }
    },
    /** Multiply a matrix by a scalar.
     *
     * @param {number} k
     * @param {matrix} m
     * @returns {matrix}
     */
    scalarmul: function(k, m) {
        var out = m.map(function(row) {
            return row.map(function(x) {
                return mul(k, x);
            });
        });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Divide a matrix by a scalar.
     *
     * @param {matrix} m
     * @param {number} k
     * @returns {matrix}
     */
    scalardiv: function(m, k) {
        var out = m.map(function(row) {
            return row.map(function(x) {
                return div(x, k);
            });
        });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Multiply two matrices.
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     * @throws {Numbas.Error} "matrixmath.mul.different sizes" if `a` doesn't have as many columns as `b` has rows.
     */
    mul: function(a, b) {
        if(a.columns != b.rows) {
            throw(new Numbas.Error('matrixmath.mul.different sizes'));
        }
        var out = [];
        out.rows = a.rows;
        out.columns = b.columns;
        for(let i = 0;i < a.rows;i++) {
            var row = [];
            out.push(row);
            for(let j = 0;j < b.columns;j++) {
                var s = 0;
                for(let k = 0;k < a.columns;k++) {
                    s = add(s, mul(a[i][k], b[k][j]));
                }
                row.push(s);
            }
        }
        return out;
    },
    /** Are two matrices equal? True if each pair of corresponding elements is equal.
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {boolean}
     */
    eq: function(a, b) {
        var rows = Math.max(a.rows, b.rows);
        var columns = Math.max(a.columns, b.columns);
        for(let i = 0;i < rows;i++) {
            var rowA = a[i] || [];
            var rowB = b[i] || [];
            for(let j = 0;j < columns;j++) {
                if(!eq(rowA[j] || 0, rowB[j] || 0)) {
                    return false;
                }
            }
        }
        return true;
    },
    /** Are two matrices unequal?
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {boolean}
     * @see Numbas.matrixmath.eq
     */
    neq: function(a, b) {
        return !matrixmath.eq(a, b);
    },
    /** Make an `NxN` identity matrix.
     *
     * @param {number} n
     * @returns {matrix}
     */
    id: function(n) {
        var out = [];
        out.rows = out.columns = n;
        for(let i = 0;i < n;i++) {
            var row = [];
            out.push(row);
            for(let j = 0;j < n;j++) {
                row.push(j == i ? 1 : 0);
            }
        }
        return out;
    },
    /** Matrix transpose.
     *
     * @param {matrix} m
     * @returns {matrix}
     */
    transpose: function(m) {
        var out = [];
        out.rows = m.columns;
        out.columns = m.rows;
        for(let i = 0;i < m.columns;i++) {
            var row = [];
            out.push(row);
            for(let j = 0;j < m.rows;j++) {
                row.push(m[j][i] || 0);
            }
        }
        return out;
    },

    /** Sum of every cell.
     *
     * @param {matrix} m
     * @returns {number}
     */
    sum_cells: function(m) {
        var t = 0;
        m.forEach(function(row) {
            row.forEach(function(cell) {
                t += cell;
            });
        });
        return t;
    },
    /** Returns number of row in a matrix.
     *
     * @param {matrix} m
     * @returns {number}
     */
    numrows: function(m) {
        return m.rows;
    },
    /** Returns number of columns in a matrix.
     *
     * @param {matrix} m
     * @returns {number}
     */
    numcolumns: function(m) {
        return m.columns;
    },
    /** Combine two matrices vertically.
     *
     * @param {matrix} m1
     * @param {matrix} m2
     * @returns {matrix}
     */
    combine_vertically: function(m1, m2) {
        var out = [];
        out.rows = m1.rows + m2.rows;
        out.columns = m1.columns > m2.columns ? m1.columns : m2.columns;
        for(let i = 0; i < out.rows; i++) {
            var row = [];
            out.push(row);
            for(let j = 0; j < out.columns; j++) {
                row.push(i < m1.rows && j < m1.columns ? m1[i][j]
                    : i >= m1.rows && j < m2.columns ? m2[i - m1.rows][j] : 0);
            }
        } return out;
    },
    /** Combine two matrices horizontally.
     *
     * @param {matrix} m1
     * @param {matrix} m2
     * @returns {matrix}
     */
    combine_horizontally: function(m1, m2) {
        var out = [];
        out.columns = m1.columns + m2.columns;
        out.rows = m1.rows > m2.rows ? m1.rows : m2.rows;
        for(let i = 0; i < out.rows; i++) {
            var row = [];
            out.push(row);
            for(let j = 0; j < out.columns; j++) {
                row.push(j < m1.columns && i < m1.rows ? m1[i][j]
                    : j >= m1.columns && i < m2.rows ? m2[i][j - m1.columns] : 0);
            }
        } return out;
    },
    /** Combine two matrices diagonally.
     *
     * @param {matrix} m1
     * @param {matrix} m2
     * @returns {matrix}
     */
    combine_diagonally: function(m1, m2) {
        var out = [];
        out.rows = m1.rows + m2.rows;
        out.columns = m1.columns + m2.columns;
        for(let i = 0; i < out.rows; i++) {
            var row = [];
            out.push(row);
            for(let j = 0; j < out.columns; j++) {
                row.push(i < m1.rows && j < m1.columns ? m1[i][j]
                    : i >= m1.rows && j >= m1.columns ? m2[i - m1.rows][j - m1.columns] : 0);
            }
        } return out;
    },

    /** Apply given function to each element.
     *
     * @param {matrix} m
     * @param {Function} fn
     * @returns {matrix}
     */
    map: function(m, fn) {
        var out = m.map(function(row) {
            return row.map(fn);
        });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },

    /** Round each element to given number of decimal places.
     *
     * @param {matrix} m
     * @param {number} dp - Number of decimal places.
     * @returns {matrix}
     */
    precround: function(m, dp) {
        return matrixmath.map(m, function(n) {
            return math.precround(n, dp);
        });
    },

    /** Round each element to given number of significant figures.
     *
     * @param {matrix} m
     * @param {number} sf - Number of decimal places.
     * @returns {matrix}
     */
    siground: function(m, sf) {
        return matrixmath.map(m, function(n) {
            return math.siground(n, sf);
        });
    },

    /** LU decomposition: decompose a square matrix m into a lower-triangular matrix L and upper-triangular matrix U, satisfying `m = L*U`.
     *
     * @param {matrix} m
     * @returns {Array.<matrix>}
     */
    lu_decomposition: function(m) {
        if(m.rows != m.columns) {
            throw(new Numbas.Error("matrixmath.not square"));
        }
        const n = m.rows;

        const L = m.map((row) => row.map((_) => 0));
        L.rows = L.columns = n;
        const U = m.map((row) => row.map((_) => 0));
        U.rows = U.columns = n;

        for(let i = 0; i < n; i++) {
            U[i][i] = 1;
        }

        for(let j = 0; j < n; j++) {
            for(let i = j; i < n; i++) {
                let sum = 0;
                for(let k = 0; k < j; k++) {
                    sum += L[i][k] * U[k][j];
                }
                L[i][j] = m[i][j] - sum;
            }

            for(let i = j; i < n; i++) {
                let sum = 0;
                for(let k = 0; k < j; k++) {
                    sum += L[j][k] * U[k][i];
                }
                if(L[j][j] == 0) {
                    throw(new Numbas.Error("matrixmath.not invertible"));
                }
                U[j][i] = (m[j][i] - sum) / L[j][j];
            }
        }

        return [L, U];
    },

    /** Convert a matrix of numbers to a matrix of Fractions.
     *
     * @param {matrix} matrix
     * @returns {Array.<Array.<Numbas.math.Fraction>>}
     */
    fraction_matrix: function(matrix) {
        var o = matrix.map(function(r) {
            return r.map(function(c) {
                return c instanceof Fraction ? c : new Fraction(c, 1)
            })
        });
        o.rows = matrix.rows;
        o.columns = matrix.columns;
        return o;
    },

    /** Convert a matrix of fractions to a matrix of numbers.
     *
     * @param {Array.<Array.<Numbas.math.Fraction>>} matrix
     * @returns {matrix}
     */
    unfraction_matrix: function(matrix) {
        var o = matrix.map(function(r) {
            return r.map(function(c) {
                return c.numerator / c.denominator
            })
        });
        o.rows = matrix.rows;
        o.columns = matrix.columns;
        return o;
    },

    /** Put a matrix in row-echelon form.
     *
     * @param {fraction_matrix} matrix
     * @returns {fraction_matrix}
     */
    row_echelon_form: function(matrix) {
        const rows = matrix.rows;
        const columns = matrix.columns;

        var current_row = 0;
        // for each column, there should be at most one row with a 1 in that column, and every other row should have 0 in that column
        for(let leader_column = 0;leader_column < columns;leader_column++) {
            // find the first row with a non-zero in that column
            let row;
            for(row = current_row;row < rows;row++) {
                if(!matrix[row][leader_column].is_zero()) {
                    break;
                }
            }
            // if we found a row with a non-zero in the leader column
            if(row < rows) {
                // swap that row with the <current_row>th one
                if(row != current_row) {
                    var tmp = matrix[row];
                    matrix[row] = matrix[current_row];
                    matrix[current_row] = tmp;
                }

                // multiply this row so the leader column has a 1 in it
                var leader = matrix[current_row][leader_column];
                if(!leader.is_one()) {
                    matrix[current_row] = matrix[current_row].map(function(c) {
                        return c.divide(leader)
                    });
                }

                // subtract multiples of this row from every other row so they all have a zero in this column
                var sub = function(a, b) {
                    return a.subtract(b);
                };
                var add = function(a, b) {
                    return a.add(b);
                };
                for(let row = current_row + 1;row < rows;row++) {
                    if(row != current_row && !matrix[row][leader_column].is_zero()) {
                        var scale = matrix[row][leader_column];
                        var op = sub;
                        if(scale.numerator < 0) {
                            scale = new Fraction(-scale.numerator, scale.denominator);
                            op = add;
                        }
                        matrix[row] = matrix[row].map(function(c, i) {
                            return op(c, matrix[current_row][i].multiply(scale));
                        });
                    }
                }
                current_row += 1;
            }
        }

        return matrix;
    },

    /** Put a matrix representing a system of equations in reduced row-echelon form.
     * Can:
     * - Swap two rows
     * - Multiply a row by a scalar
     * - Subtract a multiple of one row from another
     * As well as being in row-echelon form, the matrix has the property that the first non-zero entry in each row is also the only non-zero entry in its column.
     *
     * @param {fraction_matrix} matrix
     * @returns {fraction_matrix}
     */
    reduced_row_echelon_form: function(matrix) {
        matrix = matrixmath.row_echelon_form(matrix);

        var rows = matrix.length;
        var columns = matrix[0].length;
        matrix.rows = rows;
        matrix.columns = columns;

        var sub = function(a, b) {
            return a.subtract(b);
        };
        var add = function(a, b) {
            return a.add(b);
        };

        for(let row = 0;row < rows;row++) {
            let column;
            for(column = 0;column < columns && matrix[row][column].is_zero();column++) {}

            if(column == columns) {
                continue;
            }

            for(let vrow = 0;vrow < rows;vrow++) {
                if(vrow != row && !matrix[vrow][column].is_zero()) {
                    var scale = matrix[vrow][column];
                    if(!scale.is_zero()) {
                        var op = sub;
                        if(scale.numerator < 0) {
                            op = add;
                            scale = new Fraction(-scale.numerator, scale.denominator);
                        }
                        matrix[vrow] = matrix[vrow].map(function(c, i) {
                            return op(c, matrix[row][i].multiply(scale));
                        });
                    }
                }
            }
        }

        return matrix;
    },

    gauss_jordan_elimination: function(matrix) {
        return matrixmath.unfraction_matrix(matrixmath.reduced_row_echelon_form(matrixmath.fraction_matrix(matrix)));
    },

    /** Find the inverse of the given square matrix.
     *
     * @param {matrix} m
     * @returns {matrix}
     */
    inverse: function(m) {
        if(m.rows != m.columns) {
            throw(new Numbas.Error("matrixmath.not square"));
        }
        const n = m.rows;

        const adjoined = matrixmath.combine_horizontally(m, matrixmath.id(m.rows));
        const reduced = matrixmath.gauss_jordan_elimination(adjoined);
        const inverse = reduced.map((row) => row.slice(n));
        inverse.rows = n;
        inverse.columns = n;

        return inverse;
    }
}

/** A set of objects: no item occurs more than once.
 *
 * @typedef set
 * @type {Array}
 */
/** Set operations.
 *
 * @namespace Numbas.setmath
 */
var setmath = Numbas.setmath = {
    /** Does the set contain the given element?
     *
     * @param {set} set
     * @param {*} element
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {boolean}
     */
    contains: function(set, element, scope) {
        for(let i = 0, l = set.length;i < l;i++) {
            if(Numbas.util.eq(set[i], element, scope)) {
                return true;
            }
        }
        return false;
    },
    /** Union of two sets.
     *
     * @param {set} a
     * @param {set} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {set}
     */
    union: function(a, b, scope) {
        var out = a.slice();
        for(let i = 0, l = b.length;i < l;i++) {
            if(!setmath.contains(a, b[i], scope)) {
                out.push(b[i]);
            }
        }
        return out;
    },
    /** Intersection of two sets.
     *
     * @param {set} a
     * @param {set} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {set}
     */
    intersection: function(a, b, scope) {
        return a.filter(function(v) {
            return setmath.contains(b, v, scope);
        });
    },
    /** Are two sets equal? Yes if a,b and (a intersect b) all have the same length.
     *
     * @param {set} a
     * @param {set} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {boolean}
     */
    eq: function(a, b, scope) {
        return a.length == b.length && setmath.intersection(a, b, scope).length == a.length;
    },
    /** Set minus - remove b's elements from a.
     *
     * @param {set} a
     * @param {set} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {set}
     */
    minus: function(a, b, scope) {
        return a.filter(function(v) {
            return !setmath.contains(b, v, scope);
        });
    },
    /** Size of a set.
     *
     * @param {set} set
     * @returns {number}
     */
    size: function(set) {
        return set.length;
    }

}

class RealInterval {
    constructor(start, end, includes_start, includes_end) {
        if(start > end) {
            const m = end;
            const im = includes_end;
            end = start;
            includes_end = includes_start;
            start = m;
            includes_start = im;
        }
        includes_start = !!(includes_start && Number.isFinite(start));
        includes_end = !!(includes_end && Number.isFinite(end));
        this.start = start;
        this.end = end;
        this.includes_start = includes_start;
        this.includes_end = includes_end;

        if(this.start == this.end) {
            this.includes_start = this.includes_end = includes_start || includes_end;
        }
    }

    static fromString(str) {
        const m = str.match(/^([[(])\s*(.*?)\s*(?:\.\.\s*(.*?))?\s*([\])])/);
        if(!m) {
            console.log(str);
            throw(new Numbas.Error("math.real interval.invalid string", {str}));
        }
        const includes_start = m[1] == '[';
        const start = parseFloat(m[2]);
        const end = m[3] === undefined ? start : parseFloat(m[3]);
        const includes_end = m[4] == ']';
        return new RealInterval(start, end, includes_start, includes_end);
    }

    /** The interval containing the single point `x`.
     * @param {number} x
     * @returns {RealInterval}
     */
    static singleton(x) {
        return new RealInterval(x, x, true, true);
    }

    is_empty() {
        return this.start == this.end && !this.includes_start;
    }

    contains(x) {
        return (this.includes_start ? x >= this.start : x > this.start) &&
            (this.includes_end ? x <= this.end : x < this.end)
        ;
    }

    overlaps(b) {
        return b.end >= this.start && b.start <= this.end;
    }

    equals(b) {
        return this.start == b.start &&
            this.end == b.end &&
            this.includes_start == b.includes_start &&
            this.includes_end == b.includes_end
        ;
    }

    toString() {
        return (this.includes_start ? '[' : '(') +
            this.start +
            ' .. ' +
            this.end +
            (this.includes_end ? ']' : ')')
        ;
    }

    /**
     * The complement of this interval.
     * If this is empty, returns one interval covering the whole real line.
     * If one or both ends are ±Infinity, returns one or zero intervals.
     * If this is non-empty and finite, returns two intervals.
     *
     * @returns {RealInterval}
     */
    complement() {
        if(this.is_empty()) {
            return [new RealInterval(-Infinity, Infinity, false, false)];
        } else {
            return [
                new RealInterval(-Infinity, this.start, false, this.start != -Infinity && !this.includes_start),
                new RealInterval(this.end, Infinity, this.end != Infinity && !this.includes_end, false)
            ].filter((i) => !i.is_empty());
        }
    }

    /** The intersection of two intervals. Returns a single interval.
     * @param {RealInterval} b
     * @returns {RealInterval}
     */
    intersection(b) {
        if(!this.overlaps(b)) {
            // empty intersection
            return new RealInterval(0, 0, false, false);
        }

        const start = Math.max(this.start, b.start);
        const end = Math.min(this.end, b.end);

        const includes_start = this.contains(start) && b.contains(start);
        const includes_end = this.contains(end) && b.contains(end);

        return new RealInterval(start, end, includes_start, includes_end);
    }

    /** The union of two intervals. Returns either one or two intervals.
     * @param {RealInterval} b
     * @returns {RealInterval}
     */
    union(b) {
        const a = this;
        // if they don't overlap at all, return both intervals
        if(a.end < b.start || a.start > b.end) {
            return a.start < b.start ? [a, b] : [b, a];
        }

        if(b.start == a.end && !(b.includes_start || a.includes_end)) {
            return [a, b];
        }

        if(a.start == b.end && !(a.includes_start || b.includes_end)) {
            return [b, a];
        }

        const start = Math.min(a.start, b.start);
        const end = Math.max(a.end, b.end);
        const includes_start = a.contains(start) || b.contains(start);
        const includes_end = a.contains(end) || b.contains(end);
        return [new RealInterval(start, end, includes_start, includes_end)];
    }

    /** The difference of two intervals: intersection of a and b's complement.
     * @param {RealInterval} b
     * @returns {RealInterval}
     */
    difference(b) {
        return b.complement().map((bc) => this.intersection(bc)).filter((x) => !x.is_empty());
    }
}

class RealIntervalUnion {
    constructor(intervals) {
        intervals = intervals.filter((i) => !i.is_empty());

        this.intervals = intervals;
        if(intervals.length == 0) {
            return;
        }

        intervals.sort((a, b) => {
            if(a.start < b.start) {
                return -1;
            } else if(a.start > b.start) {
                return 1;
            } else {
                return a.end < b.end ? -1 : a.end > b.end ? 1 : 0;
            }
        });
        const [a, ...others] = intervals;
        const out = [a];
        for(let b of others) {
            for(let i = 0;i < out.length;i++) {
                const a = out[i];
                if(b.overlaps(a)) {
                    const [na, nb] = a.union(b);
                    if(nb) {
                        out.splice(i, 1, na);
                        b = nb;
                    } else {
                        out.splice(i, 1);
                        b = na;
                    }
                }
            }
            out.push(b);
        }

        this.intervals = out;
    }

    toString() {
        return this.intervals.join(' ');
    }

    static fromString(str) {
        return new RealIntervalUnion(str.split(' ').filter((x) => x.length > 0).map((s) => RealInterval.fromString(s)));
    }

    equals(b) {
        return this.intervals.length == b.intervals.length && this.intervals.every((a, i) => a.equals(b.intervals[i]));
    }

    union(b) {
        return new RealIntervalUnion(this.intervals.concat(b.intervals));
    }

    intersection(b) {
        const out = b.intervals.flatMap((bi) => this.intervals.map((ai) => ai.intersection(bi)));
        return new RealIntervalUnion(out);
    }

    complement() {
        let last = -Infinity;
        let include_last = false;

        const out = [];
        for(const i of this.intervals) {
            out.push(new RealInterval(last, i.start, include_last, !i.includes_start));
            last = i.end;
            include_last = !i.includes_end;
        }
        out.push(new RealInterval(last, Infinity, include_last, false));

        return new RealIntervalUnion(out);
    }

    difference(b) {
        let out = this.intervals.slice();
        for(const bi of b.intervals) {
            out = out.flatMap((a) => a.difference(bi));
        }
        return new RealIntervalUnion(out);
    }

    components() {
        return this.intervals.map((x) => {
            return new RealIntervalUnion([x]);
        });
    }
}

Numbas.math.RealInterval = RealInterval;
Numbas.math.RealIntervalUnion = RealIntervalUnion;

});
