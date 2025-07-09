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

var math = Numbas.math = /** @lends Numbas.math */ {
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
        if(!im)
            return re;
        else
            return {re: re, im: im, complex: true,
            toString: math.complexToString}
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
        if(n.complex)
            return math.complex(-n.re, -n.im);
        else
            return -n;
    },
    /** Complex conjugate.
     *
     * @param {number} n
     * @returns {number}
     */
    conjugate: function(n) {
        if(n.complex)
            return math.complex(n.re, -n.im);
        else
            return n;
    },
    /** Add two numbers.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    add: function(a, b) {
        if(a.complex) {
            if(b.complex)
                return math.complex(a.re+b.re, a.im + b.im);
            else
                return math.complex(a.re+b, a.im);
        } else {
            if(b.complex)
                return math.complex(a + b.re, b.im);
            else
                return a+b;
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
            if(b.complex)
                return math.complex(a.re-b.re, a.im - b.im);
            else
                return math.complex(a.re-b, a.im);
        } else {
            if(b.complex)
                return math.complex(a - b.re, -b.im);
            else
                return a-b;
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
            if(b.complex)
                return math.complex(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
            else
                return math.complex(a.re*b, a.im*b);
        } else {
            if(b.complex)
                return math.complex(a*b.re, a*b.im);
            else
                return a*b;
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
                const q = b.re*b.re + b.im*b.im;
                return math.complex((a.re*b.re + a.im*b.im)/q, (a.im*b.re - a.re*b.im)/q);
            } else
                return math.complex(a.re/b, a.im/b);
        } else {
            if(b.complex) {
                const q = b.re*b.re + b.im*b.im;
                return math.complex(a*b.re/q, -a*b.im/q);
            } else
                return a/b;
        }
    },
    /** Exponentiate a number.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    pow: function(a, b) {
        if(a.complex && Numbas.util.isInt(b) && Math.abs(b)<100) {
            if(b<0) {
                return math.div(1, math.pow(a, -b));
            }
            if(b==0) {
                return 1;
            }
            var coeffs = math.binomialCoefficients(b);
            var re = 0;
            var im = 0;
            var sign = 1;
            for(let i=0;i<b;i+=2) {
                re += coeffs[i]*Math.pow(a.re, b-i)*Math.pow(a.im, i)*sign;
                im += coeffs[i+1]*Math.pow(a.re, b-i-1)*Math.pow(a.im, i+1)*sign;
                sign = -sign;
            }
            if(b%2==0) {
                re += Math.pow(a.im, b)*sign;
            }
            return math.complex(re, im);
        }
        if(a.complex || b.complex || (a<0 && math.fract(b)!=0)) {
            if(!a.complex)
                a = {re: a, im: 0, complex: true};
            if(!b.complex)
                b = {re: b, im: 0, complex: true};
            var ss = a.re*a.re + a.im*a.im;
            var arg1 = math.arg(a);
            var mag = Math.pow(ss, b.re/2) * Math.exp(-b.im*arg1);
            var arg = b.re*arg1 + (b.im * Math.log(ss))/2;
            return math.complex(mag*Math.cos(arg), mag*Math.sin(arg));
        } else if(a==Math.E) {
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
        for(let i=1;i<=n;i++) {
            b.push( f*=(n+1-i)/i );
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
        if(b==Infinity) {
            return a;
        }
        b = math.abs(b);
        return ((a%b)+b)%b;
    },
    /** Calculate the `b`-th root of `a`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    root: function(a, b) {
        if(!a.complex && a<0 && b%2==1) {
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
            return math.complex( Math.sqrt((r+n.re)/2), (n.im<0 ? -1 : 1) * Math.sqrt((r-n.re)/2));
        } else if(n<0)
            return math.complex(0, Math.sqrt(-n));
        else
            return Math.sqrt(n)
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
        } else if(n<0)
            return math.complex(Math.log(-n), Math.PI);
        else
            return Math.log(n);
    },
    /** Calculate `e^n`.
     *
     * @param {number} n
     * @returns {number}
     */
    exp: function(n) {
        if(n.complex) {
            return math.complex( Math.exp(n.re) * Math.cos(n.im), Math.exp(n.re) * Math.sin(n.im) );
        } else
            return Math.exp(n);
    },
    /** Magnitude of a number - absolute value of a real; modulus of a complex number.
     *
     * @param {number} n
     * @returns {number}
     */
    abs: function(n) {
        if(n.complex) {
            if(n.re==0)
                return Math.abs(n.im);
            else if(n.im==0)
                return Math.abs(n.re);
            else
                return Math.sqrt(n.re*n.re + n.im*n.im)
        } else
            return Math.abs(n);
    },
    /** Argument of a (complex) number.
     *
     * @param {number} n
     * @returns {number}
     */
    arg: function(n) {
        if(n.complex)
            return Math.atan2(n.im, n.re);
        else
            return Math.atan2(0, n);
    },
    /** Real part of a number.
     *
     * @param {number} n
     * @returns {number}
     */
    re: function(n) {
        if(n.complex)
            return n.re;
        else
            return n;
    },
    /** Imaginary part of a number.
     *
     * @param {number} n
     * @returns {number}
     */
    im: function(n) {
        if(n.complex)
            return n.im;
        else
            return 0;
    },
    /** Is `n` positive (Real, and greater than 0)?
     *
     * @param {number} n
     * @returns {boolean}
     */
    positive: function(n) {
        return !n.complex && math.gt(n, 0);
    },
    /** Is `n` negative (Real, and less than 0)?
     *
     * @param {number} n
     * @returns {boolean}
     */
    negative: function(n) {
        return math.lt(math.re(n), 0);
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
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
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
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
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
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a<b || math.eq(a, b);
    },
    /** Is `a` greater than or equal to `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    geq: function(a, b) {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a>b || math.eq(a, b);
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
                return a==b || math.isclose(a, b);
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
        if(a===Infinity || b===Infinity || a==-Infinity || b==-Infinity) {
            return a===b;
        }
        rel_tol = rel_tol===undefined ? 1e-15 : rel_tol;
        abs_tol = abs_tol===undefined ? 1e-15: abs_tol;

        if(a.complex || b.complex) {
            return math.abs(math.sub(a, b)) < abs_tol;
        }

        return Math.abs(a-b) <= Math.max( rel_tol * Math.max(Math.abs(a), Math.abs(b)), abs_tol );
    },

    /** Is `u` a scalar multiple `v`?
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
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
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
        if(numbers.length==0) {
            return undefined;
        }
        maxfn = maxfn || math.max;
        var best = numbers[0];
        for(let i=1;i<numbers.length;i++) {
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
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
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
        if(numbers.length==0) {
            return undefined;
        }
        minfn = minfn || math.min;
        var best = numbers[0];
        for(let i=1;i<numbers.length;i++) {
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
        if(allowFractions===undefined) {
            allowFractions = true;
        }

        n = Math.abs(n);
        if(n>10000)    //so big numbers don't get rounded to a power of pi accidentally
            return 0;
        var degree, a;

        /* Check for pi/k, where k is an integer < 1000 */
        a = Math.PI/n;
        if(allowFractions && a<1000 && Math.abs(a-math.round(a))<0.0000000001) {
            return 1;
        }

        for(degree=1; (a=n/Math.pow(Math.PI, degree))>1 && (Math.abs(a-math.round(a))>0.00000001 && Math.abs(1/a-math.round(1/a))>0.00000001); degree++) {}
        return a>=1 ? degree : 0;
    },
    /** Add the given number of zero digits to a string representation of a number.
     *
     * @param {string} n - A string representation of a number.
     * @param {number} digits - The number of digits to add.
     * @returns {string}
     */
    addDigits: function(n, digits) {
        n = n+'';
        var m = n.match(/^(-?\d+(?:\.\d+)?)(e[-+]?\d+)$/);
        if(m) {
            return math.addDigits(m[1], digits)+m[2];
        } else {
            if(n.indexOf('.')==-1) {
                n += '.';
            }
            for(let i=0;i<digits;i++) {
                n += '0';
            }
            return n;
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
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        var out;
        var style = options.style || Numbas.locale.default_number_notation[0];
        if(options.style=='scientific') {
            var s = n.toExponential();
            var bits = math.parseScientific(s);
            var noptions = {
                precisionType: options.precisionType,
                precision: options.precision,
                syntax: options.syntax,
                style: options.scientificStyle || Numbas.locale.default_number_notation[0]
            };
            var significand = math.niceNumber(bits.significand, noptions);
            var exponent = bits.exponent;
            if(exponent>=0) {
                exponent = '+'+exponent;
            }
            return significand+'e'+exponent;
        } else {
            let precision;
            switch(options.precisionType) {
            case 'sigfig':
                precision = options.precision;
                out = math.siground(n, precision)+'';
                var sigFigs = math.countSigFigs(out, true);
                if(sigFigs<precision) {
                    out = math.addDigits(out, precision-sigFigs);
                }
                break;
            case 'dp':
                precision = Math.min(options.precision, MAX_FLOAT_PRECISION);
                out = math.precround(n, precision)+'';
                var dp = math.countDP(out);
                if(dp<precision) {
                    out = math.addDigits(out, precision-dp);
                }
                break;
            default:
                var a = Math.abs(n);
                if(a<1e-15) {
                    out = '0';
                } else if(Math.abs(n)<1e-8) {
                    out = n+'';
                } else {
                    out = math.precround(n, 10)+'';
                }
            }
            out = math.unscientific(out);
            if(style && Numbas.util.numberNotationStyles[style]) {
                out = Numbas.util.formatNumberNotation(out, style, options.syntax);
            }
        }
        return out;
    },

    /** Display a number nicely - rounds off to 10dp so floating point errors aren't displayed.
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @see Numbas.util.numberNotationStyles
     * @returns {string}
     */
    niceNumber: function(n, options) {
        options = options || {};
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(n.complex) {
            var imaginary_unit = options.imaginary_unit || 'i';
            var re = math.niceNumber(n.re, options);
            var im = math.niceNumber(n.im, options);
            if(math.precround(n.im, 10)==0)
                return re+'';
            else if(math.precround(n.re, 10)==0) {
                if(n.im==1)
                    return imaginary_unit;
                else if(n.im==-1)
                    return '-'+imaginary_unit;
                else
                    return im+'*'+imaginary_unit;
            } else if(n.im<0) {
                if(n.im==-1)
                    return re+' - '+imaginary_unit;
                else
                    return re+im+'*'+imaginary_unit;
            } else {
                if(n.im==1)
                    return re+' + '+imaginary_unit;
                else
                    return re+' + '+im+'*'+imaginary_unit;
            }
        } else {
            var infinity = options.infinity || 'infinity';
            if(n==Infinity) {
                return infinity;
            } else if(n==-Infinity) {
                return '-'+infinity;
            }
            var piD = 0;
            var circle_constant_scale = 1;
            var circle_constant_symbol = 'pi';
            if(options.circle_constant) {
                circle_constant_scale = options.circle_constant.scale;
                circle_constant_symbol = options.circle_constant.symbol;
            }
            if(options.precisionType === undefined && (piD = math.piDegree(n, false)) > 0)
                n /= Math.pow(Math.PI*circle_constant_scale, piD);
            var out = math.niceRealNumber(n, options);
            switch(piD) {
                case 0:
                    return out;
                case 1:
                    if(n==1)
                        return circle_constant_symbol;
                    else if(n==-1)
                        return '-'+circle_constant_symbol;
                    else
                        return out+'*'+circle_constant_symbol;
                default:
                    if(n==1)
                        return circle_constant_symbol+'^'+piD;
                    else if(n==-1)
                        return '-'+circle_constant_symbol+'^'+piD;
                    else
                        return out+'*'+circle_constant_symbol+'^'+piD;
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
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        var re = math.niceDecimal(n.re, options);
        if(n.isReal()) {
            return re;
        } else {
            var im = math.niceDecimal(n.im.absoluteValue(), options);
            if(options.style=='scientific') {
                im = '('+im+')*i';
            } else {
                im = n.im.absoluteValue().equals(1) ? 'i' : im+'*i';
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
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(!n.isFinite()) {
            return n.lessThan(0) ? '-infinity' : 'infinity';
        }

        var precision = options.precision;
        var style = options.style || Numbas.locale.default_number_notation[0];
        if(options.style=='scientific') {
            var e = n.toExponential(options.precision);
            var m = e.match(/^(-?\d(?:\.\d+)?)(e[+-]\d+)$/);
            var significand = Numbas.util.formatNumberNotation(m[1], Numbas.locale.default_number_notation[0]);
            var exponential = m[2];
            return significand+exponential;
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
            if(x==Math.PI) {
                return Decimal.acos(-1);
            } else if(x==Math.E) {
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
        return Math.floor(n*(Math.random()%1));
    },
    /** Get a  random shuffling of the numbers `[0..n-1]`.
     *
     * @param {number} N
     * @returns {Array.<number>}
     */
    deal: function(N) {
        var J, K;
        var Q = new Array(N);
        for(J=0 ; J<N ; J++) {
            K = math.randomint(J+1) ; Q[J] = Q[K] ; Q[K] = J;
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
        for(let i=0;i<l;i++) {
            list2[i]=(list[permutation[i]]);
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
        for(let i=0;i<l.length;i++) {
            arr[l[i]]=i;
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
        if(lists.length==0) {
            return [];
        }
        var len = lists[0].length;
        for(let i=1;i<lists.length;i++) {
            if(lists[i].length!=len) {
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
        if(k>n || k<1) {
            throw(new Numbas.Error("math.random_integer_partition.invalid k", {n:n, k:k}));
        }
        var shuffle = [];
        for(let i=0;i<k-1;i++) {
            if(shuffle[i]===undefined) {
                shuffle[i] = i;
            }
            var j = math.randomint(n-1);
            if(shuffle[j]===undefined) {
                shuffle[j] = j;
            }
            var a = shuffle[i];
            shuffle[i] = shuffle[j];
            shuffle[j] = a;
        }
        shuffle = shuffle.slice(0, k-1);
        shuffle.sort(function(a, b) {
            return a<b ? -1 : a>b ? 1 : 0;
        });
        var partition = [];
        var last = 0;
        for(let i=0;i<k-1;i++) {
            partition.push(shuffle[i]+1-last);
            last = shuffle[i]+1;
        }
        partition.push(n-last);
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
        for(let i=0;i<=n;i++) {
            for(let p of math.integer_partitions(n-i, k-1)) {
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
        var arr=new Array(n);
        for(let i=0;i<n;i++) {
            arr[i]=i;
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
        if(b.complex)
            throw(new Numbas.Error('math.precround.complex'));
        if(a.complex)
            return math.complex(math.precround(a.re, b), math.precround(a.im, b));
        else {
            b = Math.min(b, MAX_FLOAT_PRECISION);
            var be = Math.pow(10, b);
            var fracPart = a % 1;
            var intPart = a - fracPart;
            //test to allow a bit of leeway to account for floating point errors
            //if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
            var v = fracPart*be*10 % 1;
            var d = (fracPart>0 ? Math.floor : Math.ceil)(fracPart*be*10 % 10);
            // multiply fractional part by 10^b; we'll throw away the remaining fractional part (stuff < 10^b)
            fracPart *= be;
            if( (d==4 && 1-v<1e-9) || (d==-5 && v>-1e-9 && v<0)) {
                fracPart += 1;
            }
            var rounded_fracPart = Math.round(fracPart);
            // if the fractional part has rounded up to a whole number, just add sgn(fracPart) to the integer part
            if(rounded_fracPart==be || rounded_fracPart==-be) {
                return intPart+math.sign(fracPart);
            }
            // get the fractional part as a string of decimal digits
            var fracPartString = Math.round(Math.abs(fracPart))+'';
            while(fracPartString.length<b) {
                fracPartString = '0'+fracPartString;
            }
            // construct the rounded number as a string, then convert it to a JS float
            var out = parseFloat(intPart+'.'+fracPartString);
            // make sure a negative number remains negative
            if(intPart==0 && a<0) {
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
        var digits = significand_integer+significand_decimal;
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
        if(l<pow) {
            out = digits;
            for(let i=l;i<pow;i++) {
                out += '0';
            }
        } else if(pow<0) {
            out = digits;
            for(let i=0;i<-pow;i++) {
                out = '0'+out;
            }
            out = '0.'+out;
        } else {
            out = digits.slice(0, pow);
            if(digits.length>pow) {
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
        var m = (n+'').match(/(?:\.(\d*))?(?:[Ee]([-+])?(\d+))?$/);
        if(!m)
            return 0;
        else {
            var dp = m[1] ? m[1].length : 0;
            if(m[2] && m[2]=='-') {
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
        if(!m)
            return 0;
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
        if(precisionType=='none') {
            return true;
        }
        n += '';
        var precisionOK = false;
        var counters = {'dp': math.countDP, 'sigfig': math.countSigFigs};
        var counter = counters[precisionType];
        var digits = counter(n);
        if(strictPrecision)
            precisionOK = digits == precision;
        else
            precisionOK = digits <= precision;
        if(precisionType=='sigfig' && !precisionOK && digits < precision && /[1-9]\d*0+$/.test(n)) {    // in cases like 2070, which could be to either 3 or 4 sig figs
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
        if(precisionType=='none') {
            return true;
        }
        n += '';
        var m = math.re_scientificNumber.exec(n);
        if(!m) {
            return false;
        }
        return math.toGivenPrecision(m[1], 'dp', precision+(precisionType=='sigfig' ? -1 : 0), true);
    },
    /** Is a within +/- tolerance of b?
     *
     * @param {number} a
     * @param {number} b
     * @param {number} tolerance
     * @returns {boolean}
     */
    withinTolerance: function(a, b, tolerance) {
        if(tolerance==0) {
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
        if( Numbas.util.isInt(n) && n>=0 ) {
            if(n<=1) {
                return 1;
            }else{
                var j=1;
                for(let i=2;i<=n;i++) {
                    j*=i;
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
        if((n.complex && n.re<0.5) || (!n.complex && n<0.5)) {
            return div(pi, mul(sin(mul(pi, n)), math.gamma(sub(1, n))));
        } else {
            n = sub(n, 1);            //n -= 1
            var x = p[0];
            for(let i=1;i<g+2;i++) {
                x = add(x, div(p[i], add(n, i)));    // x += p[i]/(n+i)
            }
            var t = add(n, add(g, 0.5));        // t = n+g+0.5
            return mul(sqrt(2*pi), mul(pow(t, add(n, 0.5)), mul(exp(neg(t)), x)));    // return sqrt(2*pi)*t^(z+0.5)*exp(-t)*x
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
        return mul(x, Math.PI/180);
    },
    /** Convert from radians to degrees.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.radians
     */
    degrees: function(x) {
        return mul(x, 180/Math.PI);
    },
    /** Cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    cos: function(x) {
        if(x.complex) {
            return math.complex(Math.cos(x.re)*math.cosh(x.im), -Math.sin(x.re)*math.sinh(x.im));
        } else
            return Math.cos(x);
    },
    /** Sine.
     *
     * @param {number} x
     * @returns {number}
     */
    sin: function(x) {
        if(x.complex) {
            return math.complex(Math.sin(x.re)*math.cosh(x.im), Math.cos(x.re)*math.sinh(x.im));
        } else
            return Math.sin(x);
    },
    /** Tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    tan: function(x) {
        if(x.complex)
            return div(math.sin(x), math.cos(x));
        else
            return Math.tan(x);
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
        if(x.complex || math.abs(x)>1) {
            var i = math.complex(0, 1);
            var ni = math.complex(0, -1);
            var ex = add(mul(x, i), math.sqrt(sub(1, mul(x, x)))); //ix+sqrt(1-x^2)
            return mul(ni, math.log(ex));
        } else
            return Math.asin(x);
    },
    /** Inverse cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    arccos: function(x) {
        if(x.complex || math.abs(x)>1) {
            var ni = math.complex(0, -1);
            var ex = add(x, math.sqrt( sub(mul(x, x), 1) ) );    //x+sqrt(x^2-1)
            var result = mul(ni, math.log(ex));
            if(math.re(result)<0 || math.re(result)==0 && math.im(result)<0)
                result = math.negate(result);
            return result;
        } else
            return Math.acos(x);
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
        } else
            return Math.atan(x);
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
        if(x.complex)
            return div(sub(math.exp(x), math.exp(math.negate(x))), 2);
        else
            return (Math.exp(x)-Math.exp(-x))/2;
    },
    /** Hyperbolic cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    cosh: function(x) {
        if(x.complex)
            return div(add(math.exp(x), math.exp(math.negate(x))), 2);
        else
            return (Math.exp(x)+Math.exp(-x))/2
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
        if(x.complex)
            return math.log(add(x, math.sqrt(add(mul(x, x), 1))));
        else
            return Math.log(x + Math.sqrt(x*x+1));
    },
    /** Inverse hyperbolic cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    arccosh: function (x) {
        if(x.complex)
            return math.log(add(x, math.sqrt(sub(mul(x, x), 1))));
        else
            return Math.log(x + Math.sqrt(x*x-1));
    },
    /** Inverse hyperbolic tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    arctanh: function (x) {
        if(x.complex)
            return div(math.log(div(add(1, x), sub(1, x))), 2);
        else
            return 0.5 * Math.log((1+x)/(1-x));
    },
    /** Round up to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.round
     * @see Numbas.math.floor
     */
    ceil: function(x) {
        if(x.complex)
            return math.complex(math.ceil(x.re), math.ceil(x.im));
        else
            return Math.ceil(x);
    },
    /** Round down to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.ceil
     * @see Numbas.math.round
     */
    floor: function(x) {
        if(x.complex)
            return math.complex(math.floor(x.re), math.floor(x.im));
        else
            return Math.floor(x);
    },
    /** Round to the nearest integer; fractional part >= 0.5 rounds up. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.ceil
     * @see Numbas.math.floor
     */
    round: function(x) {
        if(x.complex)
            return math.complex(Math.round(x.re), Math.round(x.im));
        else
            return Math.round(x);
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
        if(a==0) {
            return NaN;
        }
        if(x.complex) {
            return math.complex(math.toNearest(x.re, a), math.toNearest(x.im, a));
        } else {
            return Math.round(x/a)*a;
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
        if(x>0) {
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
        if(x.complex)
            return math.complex(math.fract(x.re), math.fract(x.im));
        return x-math.trunc(x);
    },
    /** Sign of a number - +1, 0, or -1. For complex numbers, gives the sign of the real and imaginary parts separately.
     *
     * @param {number} x
     * @returns {number}
     */
    sign: function(x) {
        if(x.complex)
            return math.complex(math.sign(x.re), math.sign(x.im));
        if(x==0) {
            return 0;
        }else if (x>0) {
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
        return Math.random()*(max-min)+min;
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
        if(range[2]==0) {
            return math.randomrange(range[0], range[1]);
        } else {
            var num_steps = math.rangeSize(range);
            var n = Math.floor(math.randomrange(0, num_steps));
            return range[0]+n*range[2];
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
            for(let i=0;i<exclude.length;i++) {
                if(math.eq(r, exclude[i]))
                    return false;
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
        if(selection.length==0)
            throw(new Numbas.Error('math.choose.empty selection'));
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
        if(total==0) {
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
        if(a>b)
            return 1;
        var product=a;
        var i=a;
        while (i++<b) {
            product*=i;
        }
        return product;
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
        if(n<0) {
            throw(new Numbas.Error('math.combinations.n less than zero'));
        }
        if(k<0) {
            throw(new Numbas.Error('math.combinations.k less than zero'));
        }
        if(n<k) {
            throw(new Numbas.Error('math.combinations.n less than k'));
        }
        k=Math.max(k, n-k);
        return math.productRange(k+1, n)/math.productRange(1, n-k);
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
        if(n<0) {
            throw(new Numbas.Error('math.permutations.n less than zero'));
        }
        if(k<0) {
            throw(new Numbas.Error('math.permutations.k less than zero'));
        }
        if(n<k) {
            throw(new Numbas.Error('math.permutations.n less than k'));
        }
        return math.productRange(n-k+1, n);
    },
    /** Does `a` divide `b`? If either of `a` or `b` is not an integer, return `false`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    divides: function(a, b) {
        if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b))
            return false;
        return (b % a) == 0;
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
        if(Math.floor(a)!=a || Math.floor(b)!=b || Math.abs(a)==Infinity || Math.abs(b)==Infinity) {
            return 1;
        }
        a = Math.floor(Math.abs(a));
        b = Math.floor(Math.abs(b));
        var c=0;
        if(a<b) {
            c=a; a=b; b=c;
        }
        if(b==0) {
            return a;
        }
        while(a % b != 0) {
            c=b;
            b=a % b;
            a=c;
        }
        return b;
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
        return math.gcd(a, b) == 1;
    },
    /** Lowest common multiple (LCM) of `a` and `b`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
     */
    lcm: function(a, b) {
        if(arguments.length==0) {
            return 1;
        } else if(arguments.length==1) {
            return a;
        }
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.lcm.complex'));
        if(arguments.length>2) {
            a = Math.floor(Math.abs(a));
            for(let i=1;i<arguments.length;i++) {
                if(arguments[i].complex) {
                    throw(new Numbas.Error('math.lcm.complex'));
                }
                b = Math.floor(Math.abs(arguments[i]));
                a = a*b/math.gcf(a, b);
            }
            return a;
        }
        a = Math.floor(Math.abs(a));
        b = Math.floor(Math.abs(b));
        var c = math.gcf(a, b);
        return a*b/c;
    },
    /** Write the range of integers `[a..b]` as an array of the form `[min,max,step]`, for use with {@link Numbas.math.random}. If either number is complex, only the real part is used.
     *
     * @param {number} a
     * @param {number} b
     * @returns {range}
     * @see Numbas.math.random
     */
    defineRange: function(a, b) {
        if(a.complex)
            a=a.re;
        if(b.complex)
            b=b.re;
        return [a, b, 1];
    },
    /** Change the step size of a range created with {@link Numbas.math.defineRange}.
     *
     * @param {range} range
     * @param {number} step
     * @returns {range}
     */
    rangeSteps: function(range, step) {
        if(step.complex)
            step = step.re;
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
        var diff = range[1]-range[0];
        var num_steps = Math.floor(diff/range[2])+1;
        num_steps += (math.isclose(range[0]+num_steps*range[2], range[1]) ? 1 : 0);
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
            if(t==0) {
                return [0, t, 1, 0];
            }
            var m00 = 1;
            var m01 = 0;
            var m10 = 0;
            var m11 = 1;

            var x = t;
            var ai = Math.floor(x);
            while((m10*ai + m11) <= limit) {
                var tmp = m00*ai+m01;
                m01 = m00;
                m00 = tmp;
                tmp = m10*ai+m11;
                m11 = m10;
                m10 = tmp;
                if(x==ai) {
                    break;
                }
                x = 1/(x-ai);
                ai = Math.floor(x);
            }

            var n1 = m00;
            var d1 = m10;
            var err1 = (t-n1/d1);

            ai = Math.floor((limit-m11)/m10);
            var n2 = m00*ai + m01;
            var d2 = m10*ai+m11;
            var err2 = (t-n2/d2);
            if(Math.abs(err1)<=Math.abs(err2)) {
                return [err1, n1, d1];
            } else {
                return [err2, n2, d2];
            }
        }

        if(accuracy==undefined) {
            accuracy = 15;
        }
        var err_in = Math.exp(-accuracy);
        var limit = 100000000000;
        var l_curr = 1;
        var res = rat_to_limit(l_curr, n);
        while(Math.abs(res[0])>err_in && l_curr<limit) {
            l_curr *= 10;
            res = rat_to_limit(l_curr, n);
        }
        return [res[1], res[2]];
    },

    /** The first 1000 primes. */
    primes: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997, 1009, 1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087, 1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171, 1181, 1187, 1193, 1201, 1213, 1217, 1223, 1229, 1231, 1237, 1249, 1259, 1277, 1279, 1283, 1289, 1291, 1297, 1301, 1303, 1307, 1319, 1321, 1327, 1361, 1367, 1373, 1381, 1399, 1409, 1423, 1427, 1429, 1433, 1439, 1447, 1451, 1453, 1459, 1471, 1481, 1483, 1487, 1489, 1493, 1499, 1511, 1523, 1531, 1543, 1549, 1553, 1559, 1567, 1571, 1579, 1583, 1597, 1601, 1607, 1609, 1613, 1619, 1621, 1627, 1637, 1657, 1663, 1667, 1669, 1693, 1697, 1699, 1709, 1721, 1723, 1733, 1741, 1747, 1753, 1759, 1777, 1783, 1787, 1789, 1801, 1811, 1823, 1831, 1847, 1861, 1867, 1871, 1873, 1877, 1879, 1889, 1901, 1907, 1913, 1931, 1933, 1949, 1951, 1973, 1979, 1987, 1993, 1997, 1999, 2003, 2011, 2017, 2027, 2029, 2039, 2053, 2063, 2069, 2081, 2083, 2087, 2089, 2099, 2111, 2113, 2129, 2131, 2137, 2141, 2143, 2153, 2161, 2179, 2203, 2207, 2213, 2221, 2237, 2239, 2243, 2251, 2267, 2269, 2273, 2281, 2287, 2293, 2297, 2309, 2311, 2333, 2339, 2341, 2347, 2351, 2357, 2371, 2377, 2381, 2383, 2389, 2393, 2399, 2411, 2417, 2423, 2437, 2441, 2447, 2459, 2467, 2473, 2477, 2503, 2521, 2531, 2539, 2543, 2549, 2551, 2557, 2579, 2591, 2593, 2609, 2617, 2621, 2633, 2647, 2657, 2659, 2663, 2671, 2677, 2683, 2687, 2689, 2693, 2699, 2707, 2711, 2713, 2719, 2729, 2731, 2741, 2749, 2753, 2767, 2777, 2789, 2791, 2797, 2801, 2803, 2819, 2833, 2837, 2843, 2851, 2857, 2861, 2879, 2887, 2897, 2903, 2909, 2917, 2927, 2939, 2953, 2957, 2963, 2969, 2971, 2999, 3001, 3011, 3019, 3023, 3037, 3041, 3049, 3061, 3067, 3079, 3083, 3089, 3109, 3119, 3121, 3137, 3163, 3167, 3169, 3181, 3187, 3191, 3203, 3209, 3217, 3221, 3229, 3251, 3253, 3257, 3259, 3271, 3299, 3301, 3307, 3313, 3319, 3323, 3329, 3331, 3343, 3347, 3359, 3361, 3371, 3373, 3389, 3391, 3407, 3413, 3433, 3449, 3457, 3461, 3463, 3467, 3469, 3491, 3499, 3511, 3517, 3527, 3529, 3533, 3539, 3541, 3547, 3557, 3559, 3571, 3581, 3583, 3593, 3607, 3613, 3617, 3623, 3631, 3637, 3643, 3659, 3671, 3673, 3677, 3691, 3697, 3701, 3709, 3719, 3727, 3733, 3739, 3761, 3767, 3769, 3779, 3793, 3797, 3803, 3821, 3823, 3833, 3847, 3851, 3853, 3863, 3877, 3881, 3889, 3907, 3911, 3917, 3919, 3923, 3929, 3931, 3943, 3947, 3967, 3989, 4001, 4003, 4007, 4013, 4019, 4021, 4027, 4049, 4051, 4057, 4073, 4079, 4091, 4093, 4099, 4111, 4127, 4129, 4133, 4139, 4153, 4157, 4159, 4177, 4201, 4211, 4217, 4219, 4229, 4231, 4241, 4243, 4253, 4259, 4261, 4271, 4273, 4283, 4289, 4297, 4327, 4337, 4339, 4349, 4357, 4363, 4373, 4391, 4397, 4409, 4421, 4423, 4441, 4447, 4451, 4457, 4463, 4481, 4483, 4493, 4507, 4513, 4517, 4519, 4523, 4547, 4549, 4561, 4567, 4583, 4591, 4597, 4603, 4621, 4637, 4639, 4643, 4649, 4651, 4657, 4663, 4673, 4679, 4691, 4703, 4721, 4723, 4729, 4733, 4751, 4759, 4783, 4787, 4789, 4793, 4799, 4801, 4813, 4817, 4831, 4861, 4871, 4877, 4889, 4903, 4909, 4919, 4931, 4933, 4937, 4943, 4951, 4957, 4967, 4969, 4973, 4987, 4993, 4999, 5003, 5009, 5011, 5021, 5023, 5039, 5051, 5059, 5077, 5081, 5087, 5099, 5101, 5107, 5113, 5119, 5147, 5153, 5167, 5171, 5179, 5189, 5197, 5209, 5227, 5231, 5233, 5237, 5261, 5273, 5279, 5281, 5297, 5303, 5309, 5323, 5333, 5347, 5351, 5381, 5387, 5393, 5399, 5407, 5413, 5417, 5419, 5431, 5437, 5441, 5443, 5449, 5471, 5477, 5479, 5483, 5501, 5503, 5507, 5519, 5521, 5527, 5531, 5557, 5563, 5569, 5573, 5581, 5591, 5623, 5639, 5641, 5647, 5651, 5653, 5657, 5659, 5669, 5683, 5689, 5693, 5701, 5711, 5717, 5737, 5741, 5743, 5749, 5779, 5783, 5791, 5801, 5807, 5813, 5821, 5827, 5839, 5843, 5849, 5851, 5857, 5861, 5867, 5869, 5879, 5881, 5897, 5903, 5923, 5927, 5939, 5953, 5981, 5987, 6007, 6011, 6029, 6037, 6043, 6047, 6053, 6067, 6073, 6079, 6089, 6091, 6101, 6113, 6121, 6131, 6133, 6143, 6151, 6163, 6173, 6197, 6199, 6203, 6211, 6217, 6221, 6229, 6247, 6257, 6263, 6269, 6271, 6277, 6287, 6299, 6301, 6311, 6317, 6323, 6329, 6337, 6343, 6353, 6359, 6361, 6367, 6373, 6379, 6389, 6397, 6421, 6427, 6449, 6451, 6469, 6473, 6481, 6491, 6521, 6529, 6547, 6551, 6553, 6563, 6569, 6571, 6577, 6581, 6599, 6607, 6619, 6637, 6653, 6659, 6661, 6673, 6679, 6689, 6691, 6701, 6703, 6709, 6719, 6733, 6737, 6761, 6763, 6779, 6781, 6791, 6793, 6803, 6823, 6827, 6829, 6833, 6841, 6857, 6863, 6869, 6871, 6883, 6899, 6907, 6911, 6917, 6947, 6949, 6959, 6961, 6967, 6971, 6977, 6983, 6991, 6997, 7001, 7013, 7019, 7027, 7039, 7043, 7057, 7069, 7079, 7103, 7109, 7121, 7127, 7129, 7151, 7159, 7177, 7187, 7193, 72077211, 7213, 7219, 7229, 7237, 7243, 7247, 7253, 7283, 7297, 7307, 7309, 7321, 7331, 7333, 7349, 7351, 7369, 7393, 7411, 7417, 7433, 7451, 7457, 7459, 7477, 7481, 7487, 7489, 7499, 7507, 7517, 7523, 7529, 7537, 7541, 7547, 7549, 7559, 7561, 7573, 7577, 7583, 7589, 7591, 7603, 7607, 7621, 7639, 7643, 7649, 7669, 7673, 7681, 7687, 7691, 7699, 7703, 7717, 7723, 7727, 7741, 7753, 7757, 7759, 7789, 7793, 7817, 7823, 7829, 7841, 7853, 7867, 7873, 7877, 7879, 7883, 7901, 7907, 7919],

    /** Divisors of `n`. When `n = 210`, this returns the divisors `[1, 2, 3, 5, 6, 7, 10, 14, 15, 21, 30, 35, 42, 70, 105, 210]`.
     *
     * @param {number} n
     * @returns {Array.<number>} - Divisors of n.
     */
    divisors: function(n) {
        n = Math.abs(n);
        if(n < 1) {
            return [];
        }
        var divisor_arr = [1];
        var exponents = math.factorise(n);
        for(var i=0; i < exponents.length; i++) {
            var divisor_arr_copy = [];
            for(var j=0; j<=exponents[i]; j++) {
                divisor_arr_copy = divisor_arr_copy.concat(divisor_arr.map((number) => number*math.primes[i]**j));
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
        return divisors.slice(0, divisors.length-1);
    },

    /** Factorise `n`. When `n=2^(a1)*3^(a2)*5^(a3)*...`, this returns the powers `[a1,a2,a3,...]`.
     *
     * @param {number} n
     * @returns {Array.<number>} - Exponents of the prime factors of n.
     */
    factorise: function(n) {
        n = Math.floor(Math.abs(n));
        if(n <= 0) {
            return [];
        }
        var factors = [];
        for(let i=0;i<math.primes.length;i++) {
            var acc = 0;
            var p = math.primes[i];
            while(n%p==0) {
                acc += 1;
                n /= p;
            }
            factors.push(acc);
            if(n==1) {
                break;
            }
        }
        return factors;
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
        n = Math.floor(Math.abs(n));
        var factors = math.factorise(n).map(function(f) {
            return f-f%2;
        });
        var t = 1;
        factors.forEach(function(f, i) {
            t *= Math.pow(math.primes[i], f);
        });
        return t;
    },

    /** Sum the elements in the given list.
     *
     * @param {Array.<number>} list
     * @returns {number}
     */
    sum: function(list) {
        var total = 0;
        var l = list.length;
        if(l==0) {
            return 0;
        }
        for(let i=0;i<l;i++) {
            total = math.add(total, list[i]);
        }
        return total;
    },
    /** Multiplies the elements in the given list.
     *
     * @param {Array.<number>} list
     * @returns {number}
     */
    prod: function(list) {
        var product = 1;
        for(var i = 0; i < list.length; i++) {
            product = math.mul(product, list[i]);
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
    if(denominator<0) {
        numerator = -numerator;
        denominator = -denominator;
    }
    while(numerator % 1 != 0 || denominator % 1 != 0) {
        numerator *= 2;
        denominator *= 2;
    }
    this.numerator = Math.round(numerator);
    this.denominator = Math.round(denominator);
}
Fraction.prototype = {
    toString: function() {
        if(this.denominator==1) {
            return this.numerator+'';
        } else {
            return this.numerator+'/'+this.denominator;
        }
    },
    toFloat: function() {
        return this.numerator / this.denominator;
    },
    toDecimal: function() {
        return (new Decimal(this.numerator)).div(new Decimal(this.denominator));
    },
    reduce: function() {
        if(this.denominator==0) {
            return;
        }
        if(this.denominator<0) {
            this.numerator = -this.numerator;
            this.denominator = -this.denominator;
        }
        var g = math.gcd(this.numerator, this.denominator);
        this.numerator /= g;
        this.denominator /= g;
    },

    /** Returns a copy of this fraction reduced to lowest terms.
     *
     * @returns {Numbas.math.Fraction}
     */
    reduced: function() {
        var f = new Fraction(this.numerator, this.denominator);
        f.reduce();
        return f;
    },
    add: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator, denominator;
        if(this.denominator == b.denominator) {
            numerator = this.numerator + b.numerator;
            denominator = this.denominator;
        } else {
            numerator = this.numerator*b.denominator + b.numerator*this.denominator;
            denominator = this.denominator * b.denominator;
        }
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    subtract: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator, denominator;
        if(this.denominator == b.denominator) {
            numerator = this.numerator - b.numerator;
            denominator = this.denominator;
        } else {
            numerator = this.numerator*b.denominator - b.numerator*this.denominator;
            denominator = this.denominator * b.denominator;
        }
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    multiply: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator = this.numerator * b.numerator;
        var denominator = this.denominator * b.denominator;
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    divide: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator = this.numerator * b.denominator;
        var denominator = this.denominator * b.numerator;
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    reciprocal: function() {
        return new Fraction(this.denominator, this.numerator);
    },
    negate: function() {
        return new Fraction(-this.numerator, this.denominator);
    },
    equals: function(b) {
        return this.subtract(b).numerator==0;
    },
    lt: function(b) {
        return this.subtract(b).numerator < 0;
    },
    gt: function(b) {
        return this.subtract(b).numerator > 0;
    },
    leq: function(b) {
        return this.subtract(b).numerator <= 0;
    },
    geq: function(b) {
        return this.subtract(b).numerator >= 0;
    },
    pow: function(n) {
        var numerator = n>=0 ? this.numerator : this.denominator;
        var denominator = n>=0 ? this.denominator : this.numerator;
        n = Math.abs(n);
        return new Fraction(Math.pow(numerator, n), Math.pow(denominator, n));
    },
    trunc: function() {
        var sign = math.sign(this.numerator);
        var n = Math.abs(this.numerator);
        var d = this.denominator;
        return sign*(n-n%d)/d;
    },
    floor: function() {
        var t = this.trunc();
        return (this.numerator<0) && (this.numerator%this.denominator!=0) ? t-1 : t;
    },
    ceil: function() {
        var t = this.trunc();
        return this.numerator>0 && (this.numerator%this.denominator!=0) ? t+1 : t;
    },
    fract: function() {
        return new Fraction(this.numerator % this.denominator, this.denominator);
    },
    is_zero: function() {
        return this.numerator == 0;
    },
    is_one: function() {
        return this.numerator == this.denominator;
    }
}
Fraction.zero = new Fraction(0, 1);
Fraction.one = new Fraction(1, 1);
Fraction.fromFloat = function(n) {
    var approx = math.rationalApproximation(n);
    return new Fraction(approx[0], approx[1]);
}
Fraction.fromDecimal = function(n, accuracy) {
    accuracy = accuracy===undefined ? 1e15 : accuracy;
    var approx = n.toFraction(accuracy);
    return new Fraction(approx[0].toNumber(), approx[1].toNumber());
}
Fraction.common_denominator = function(fractions) {
    var d = 1;
    fractions.forEach(function(f) {
        d = math.lcm(d, f.denominator);
    });
    return fractions.map(function(f) {
        var m = d/f.denominator;
        return new Fraction(f.numerator * m, d);
    });
}
Fraction.min = function() {
    if(arguments.length == 0) {
        return;
    }
    var commons = Fraction.common_denominator(Array.prototype.slice.apply(arguments));
    var best = 0;
    for(let i=1;i<commons.length;i++) {
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
    for(let i=1;i<commons.length;i++) {
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
    if(im===undefined) {
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
            return re+' '+symbol+' '+im+'i';
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
            return re+' '+symbol+' '+im+'i';
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
            return re+' '+symbol+' '+im+'i';
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
        if(b.length>a.length) {
            var c = b;
            b = a;
            a = c;
        }
        return a.map(function(x, i) {
            return add(x, b[i]||0)
        });
    },
    /** Subtract one vector from another.
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {vector}
     */
    sub: function(a, b) {
        if(b.length>a.length) {
            return b.map(function(x, i) {
                return sub(a[i]||0, x)
            });
        } else {
            return a.map(function(x, i) {
                return sub(x, b[i]||0)
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
            if(a.rows==1)
                a = a[0];
            else if(a.columns==1)
                a = a.map(function(x) {
                    return x[0]
                });
            else
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
        }
        //Same check for B
        if('rows' in b) {
            if(b.rows==1)
                b = b[0];
            else if(b.columns==1)
                b = b.map(function(x) {
                    return x[0]
                });
            else
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
        }
        if(b.length>a.length) {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s, x, i) {
            return add(s, mul(x, b[i]||0))
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
            if(a.rows==1)
                a = a[0];
            else if(a.columns==1)
                a = a.map(function(x) {
                    return x[0]
                });
            else
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
        }
        //Same check for B
        if('rows' in b) {
            if(b.rows==1)
                b = b[0];
            else if(b.columns==1)
                b = b.map(function(x) {
                    return x[0]
                });
            else
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
        }
        if(a.length!=3 || b.length!=3)
            throw(new Numbas.Error('vectormath.cross.not 3d'));
        return [
                sub( mul(a[1], b[2]), mul(a[2], b[1]) ),
                sub( mul(a[2], b[0]), mul(a[0], b[2]) ),
                sub( mul(a[0], b[1]), mul(a[1], b[0]) )
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
        return Math.sqrt( a.reduce(function(s, x) {
            return s + mul(x, x);
        }, 0) );
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
        if(da*db==0) {
            return 0;
        }
        var d = Math.sqrt(da*db);
        return math.arccos(dot/d);
    },
    /** Are two vectors equal? True if each pair of corresponding components is equal.
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {boolean}
     */
    eq: function(a, b) {
        if(b.length>a.length) {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s, x, i) {
            return s && eq(x, b[i]||0)
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
                return add(s, mul(x, v[i]||0));
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
        for(let i=0;i<m.columns;i++) {
            out.push(v.reduce(function(s, x, j) {
                var c = j<m.rows ? (m[j][i]||0) : 0; return add(s, mul(x, c));
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
            return c==0;
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
        for(let i=0;i<m.rows;i++) {
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
        for(let i=0;i<rows;i++) {
            var row = [];
            matrix.push(row);
            for(let j=0;j<columns;j++) {
                row[j] = add(a[i][j]||0, b[i][j]||0);
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
        for(let i=0;i<rows;i++) {
            var row = [];
            matrix.push(row);
            for(let j=0;j<columns;j++) {
                row[j] = sub(a[i][j]||0, b[i][j]||0);
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
        if(m.rows!=m.columns)
            throw(new Numbas.Error('matrixmath.abs.non-square'));
        //abstraction failure!
        switch(m.rows) {
        case 1:
            return m[0][0];
        case 2:
            return sub( mul(m[0][0], m[1][1]), mul(m[0][1], m[1][0]) );
        case 3:
            return add( sub(
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
        if(a.columns!=b.rows)
            throw(new Numbas.Error('matrixmath.mul.different sizes'));
        var out = [];
        out.rows = a.rows;
        out.columns = b.columns;
        for(let i=0;i<a.rows;i++) {
            var row = [];
            out.push(row);
            for(let j=0;j<b.columns;j++) {
                var s = 0;
                for(let k=0;k<a.columns;k++) {
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
        for(let i=0;i<rows;i++) {
            var rowA = a[i] || [];
            var rowB = b[i] || [];
            for(let j=0;j<columns;j++) {
                if(!eq(rowA[j]||0, rowB[j]||0))
                    return false;
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
        for(let i=0;i<n;i++) {
            var row = [];
            out.push(row);
            for(let j=0;j<n;j++)
                row.push(j==i ? 1 : 0);
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
        for(let i=0;i<m.columns;i++) {
            var row = [];
            out.push(row);
            for(let j=0;j<m.rows;j++) {
                row.push(m[j][i]||0);
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
                    : i >= m1.rows && j < m2.columns ? m2[i-m1.rows][j] : 0);
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
                    : j >= m1.columns && i < m2.rows ? m2[i][j-m1.columns] : 0);
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
                    : i >= m1.rows && j >= m1.columns ? m2[i-m1.rows][j-m1.columns] : 0);
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

        for(let i=0; i<n; i++) {
            U[i][i] = 1;
        }

        for(let j=0; j<n; j++) {
            for(let i=j; i<n; i++) {
                let sum = 0;
                for(let k=0; k<j; k++) {
                    sum += L[i][k] * U[k][j];
                }
                L[i][j] = m[i][j] - sum;
            }

            for(let i=j; i<n; i++) {
                let sum = 0;
                for(let k=0; k<j; k++) {
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
                return c.numerator/c.denominator
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
        for(let leader_column=0;leader_column<columns;leader_column++) {
            // find the first row with a non-zero in that column
            let row;
            for(row=current_row;row<rows;row++) {
                if(!matrix[row][leader_column].is_zero()) {
                    break;
                }
            }
            // if we found a row with a non-zero in the leader column
            if(row<rows) {
                // swap that row with the <current_row>th one
                if(row!=current_row) {
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
                for(let row=current_row+1;row<rows;row++) {
                    if(row!=current_row && !matrix[row][leader_column].is_zero()) {
                        var scale = matrix[row][leader_column];
                        var op = sub;
                        if(scale.numerator<0) {
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

        for(let row=0;row<rows;row++) {
            let column;
            for(column=0;column<columns && matrix[row][column].is_zero();column++) {}

            if(column==columns) {
                continue;
            }

            for(let vrow = 0;vrow<rows;vrow++) {
                if(vrow!=row && !matrix[vrow][column].is_zero()) {
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
        for(let i=0, l=set.length;i<l;i++) {
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
        for(let i=0, l=b.length;i<l;i++) {
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
        return a.length==b.length && setmath.intersection(a, b, scope).length==a.length;
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

});
