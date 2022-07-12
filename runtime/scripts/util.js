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
/** @file Convenience functions, extensions to javascript built-ins, etc. Provides {@link Numbas.util}. Includes es5-shim.js */
Numbas.queueScript('util',['base','es5-shim','es6-shim','math'],function() {
/** @namespace Numbas.util */
var util = Numbas.util = /** @lends Numbas.util */ {
    /** Derive type B from A (class inheritance, really)
     *
     * B's prototype supercedes A's.
     *
     * @param {Function} a - the constructor for the parent class
     * @param {Function} b - a constructor to be called after `a`'s constructor is done.
     * @param {boolean} extendMethods - if `true`, the methods of the new type are constructed so that the method from type A is applied, then the method from type B. Nothing is returned.
     * @returns {Function} a constructor for the derived class
     */
    extend: function(a,b,extendMethods)
    {
        var c = function()
        {
            a.apply(this,arguments);
            b.apply(this,arguments);
        };
        var x;
        for(x in a.prototype)
        {
            c.prototype[x]=a.prototype[x];
        }
        for(x in b.prototype)
        {
            c.prototype[x]=b.prototype[x];
        }
        if(extendMethods)
        {
            for(x in a.prototype)
            {
                if(typeof(a.prototype[x])=='function' && b.prototype[x])
                    c.prototype[x]=Numbas.util.extend(a.prototype[x],b.prototype[x]);
            }
        }
        return c;
    },
    /** Extend `destination` with all the properties from subsequent arguments.
     * `undefined` values are not copied over.
     * Replacement for jQuery.extend. Modified from https://stackoverflow.com/a/11197343
     * Object.assign doesn't behave the same way - it copies over `undefined`.
     *
     * @param {object} destination
     * @returns {object}
     */
    extend_object: function(destination) {
        for(var i=1; i<arguments.length; i++) {
            for(var key in arguments[i]) {
                if(arguments[i].hasOwnProperty(key) && arguments[i][key]!==undefined) {
                    destination[key] = arguments[i][key];
                }
            }
        }
        return destination;
    },
    /** Clone an array, with array elements copied too.
     * Array.splice() will create a copy of an array, but the elements are the same objects, which can cause fruity bugs.
     * This function clones the array elements as well, so there should be no side-effects when operating on the cloned array.
     *
     * @param {Array} arr
     * @param {boolean} deep - if true, do a deep copy of each element
     * @see Numbas.util.copyobj
     * @returns {Array}
     */
    copyarray: function(arr,deep)
    {
        arr = arr.slice();
        if(deep)
        {
            for(var i=0;i<arr.length;i++)
            {
                arr[i]=util.copyobj(arr[i],deep);
            }
        }
        return arr;
    },
    /** Clone an object.
     *
     * @param {object} obj
     * @param {boolean} deep - if true, each property is cloned as well (recursively) so there should be no side-effects when operating on the cloned object.
     * @returns {object}
     */
    copyobj: function(obj,deep)
    {
        switch(typeof(obj))
        {
        case 'object':
            if(obj===null)
                return obj;
            if(obj.length!==undefined)
            {
                return util.copyarray(obj,deep);
            }
            else
            {
                var newobj={};
                for(var x in obj)
                {
                    if(deep)
                        newobj[x] = util.copyobj(obj[x],deep);
                    else
                        newobj[x]=obj[x];
                }
                return newobj;
            }
        default:
            return obj;
        }
    },
    /** Shallow copy an object into an already existing object - add all `src`'s properties to `dest`.
     *
     * @param {object} src
     * @param {object} dest
     */
    copyinto: function(src,dest)
    {
        for(var x in src)
        {
            if(dest[x]===undefined)
                dest[x]=src[x]
        }
    },
    /** Generic equality test on {@link Numbas.jme.token}s.
     *
     * @param {Numbas.jme.token} a
     * @param {Numbas.jme.token} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @see Numbas.util.equalityTests
     * @returns {boolean}
     */
    eq: function(a,b,scope) {
        if(a.type != b.type) {
            var type = Numbas.jme.findCompatibleType(a.type,b.type);
            if(type) {
                a = Numbas.jme.castToType(a,type);
                b = Numbas.jme.castToType(b,type);
            } else {
                return false;
            }
        }
        if(a.type in util.equalityTests) {
            return util.equalityTests[a.type](a,b,scope);
        } else {
            throw(new Numbas.Error('util.equality not defined for type',{type:a.type}));
        }
    },

    /** Functions to decide if two tokens of the same type are equal.
     * Dictionary mapping token type name to function.
     *
     * @see Numbas.util.eq
     */
    equalityTests: {
        'boolean': function(a,b) {
            return a.value==b.value;
        },
        'dict': function(a,b,scope) {
            var seen = {};
            for(var x in a.value) {
                seen[x] = true;
                if(b.value[x]===undefined || !util.eq(a.value[x],b.value[x],scope)) {
                    return false;
                }
            }
            for(var x in a.value) {
                if(seen[x]) {
                    continue;
                }
                if(!util.eq(a.value[x],b.value[x],scope)) {
                    return false;
                }
            }
            return true;
        },
        'expression': function(a,b,scope) {
            return Numbas.jme.treesSame(a.tree,b.tree,scope);
        },
        'function': function(a,b) {
            return a.name==b.name;
        },
        'html': function(a,b) {
            return a.value[0] && b.value[0] && a.value[0].outerHTML == b.value[0].outerHTML;
        },
        'keypair': function(a,b) {
            return a.key==b.key;
        },
        'list': function(a,b,scope) {
            if(!a.value || !b.value) {
                return !a.value && !b.value;
            }
            return a.value.length==b.value.length && a.value.filter(function(ae,i){return !util.eq(ae,b.value[i],scope)}).length==0;
        },
        'matrix': function(a,b) {
            return Numbas.matrixmath.eq(a.value,b.value);
        },
        'name': function(a,b,scope) {
            return Numbas.jme.normaliseName(a.name,scope) == Numbas.jme.normaliseName(b.name,scope);
        },
        'nothing': function(a,b) {
            return true;
        },
        'number': function(a,b) {
            return Numbas.math.eq(a.value,b.value);
        },
        'integer': function(a,b) {
            return Numbas.math.eq(a.value,b.value);
        },
        'rational': function(a,b) {
            return a.value.equals(b.value);
        },
        'decimal': function(a,b) {
            return a.value.equals(b.value);
        },
        'op': function(a,b) {
            return a.name==b.name;
        },
        'range': function(a,b) {
            return a.value[0]==b.value[0] && a.value[1]==b.value[1] && a.value[2]==b.value[2];
        },
        'set': function(a,b,scope) {
            return Numbas.setmath.eq(a.value,b.value,scope);
        },
        'string': function(a,b) {
            return a.value==b.value;
        },
        'vector': function(a,b) {
            return Numbas.vectormath.eq(a.value,b.value);
        }
    },
    /** Generic inequality test on {@link Numbas.jme.token}s.
     *
     * @param {Numbas.jme.token} a
     * @param {Numbas.jme.token} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {boolean}
     * @see Numbas.util.eq
     */
    neq: function(a,b,scope) {
        return !util.eq(a,b,scope);
    },

    /** Are the given objects equal?
     * False if they're of different types.
     * If they're both arrays, uses {@link Numbas.util.arraysEqual}.
     * If they're both objects, true if every key in `b` is also in `a`, and `a[k]` is equal to `b[k]` for every `k` in `a`.
     * Otherwise, uses JavaScript's equality test.
     *
     * @param {*} a
     * @param {*} b
     * @returns {boolean}
     */
    objects_equal: function(a,b) {
        if(a===b) {
            return true;
        }
        if(typeof(a)!=typeof(b)) {
            return false;
        }
        if(typeof(a)=='object') {
            if(a===null || b===null) {
                return a===b;
            }
            if(Array.isArray(a) && Array.isArray(b)) {
                return util.arraysEqual(a,b);
            } else {
                return Object.keys(a).every(function(k){ return util.objects_equal(a[k],b[k]) }) && Object.keys(b).every(function(k){ return a.hasOwnProperty(k); });
            }
        }
        return a==b;
    },
    /** Are two arrays equal? True if their elements are all equal.
     *
     * @param {Array} a
     * @param {Array} b
     * @returns {boolean}
     */
    arraysEqual: function(a,b) {
        if(!Array.isArray(a) || !Array.isArray(b)) {
            return false;
        }
        if(a.length!=b.length) {
            return false;
        }
        var l = a.length;
        for(var i=0;i<l;i++) {
            if(Array.isArray(a[i])) {
                if(!Array.isArray(b[i])) {
                    return false;
                } else if(!util.arraysEqual(a[i],b[i])) {
                    return false;
                }
            } else {
                if(!util.objects_equal(a[i],b[i])) {
                    return false;
                }
            }
        }
        return true;
    },
    /** Filter out values in `exclude` from `list`.
     *
     * @param {Numbas.jme.types.TList} list
     * @param {Numbas.jme.types.TList} exclude
     * @param {Numbas.jme.Scope} scope - The scope to use for establishing equality of tokens.
     * @returns {Array}
     */
    except: function(list,exclude,scope) {
        return list.filter(function(l) {
            for(var i=0;i<exclude.length;i++) {
                if(util.eq(l,exclude[i],scope))
                    return false;
            }
            return true;
        });
    },
    /** Return a copy of the input list with duplicates removed.
     *
     * @param {Array} list
     * @param {Numbas.jme.Scope} scope - The scope to use for establishing equality of tokens.
     * @returns {Array}
     * @see Numbas.util.eq
     */
    distinct: function(list,scope) {
        if(list.length==0) {
            return [];
        }
        var out = [list[0]];
        for(var i=1;i<list.length;i++) {
            var got = false;
            for(var j=0;j<out.length;j++) {
                if(util.eq(list[i],out[j],scope)) {
                    got = true;
                    break;
                }
            }
            if(!got) {
                out.push(list[i]);
            }
        }
        return out;
    },
    /** Is value in the list?
     *
     * @param {Array} list
     * @param {Numbas.jme.token} value
     * @param {Numbas.jme.Scope} scope - The scope to use for establishing equality of tokens.
     * @returns {boolean}
     */
    contains: function(list,value,scope) {
        for(var i=0;i<list.length;i++) {
            if(util.eq(value,list[i],scope)) {
                return true;
            }
        }
        return false;
    },
    /** Test if parameter is an integer.
     *
     * @param {object} i
     * @returns {boolean}
     */
    isInt: function(i)
    {
        return parseInt(i,10)==i;
    },
    /** Test if parameter is a float.
     *
     * @param {object} f
     * @returns {boolean}
     */
    isFloat: function(f)
    {
        return parseFloat(f)==f;
    },
    /** Test if parameter is a fraction.
     *
     * @param {string} s
     * @returns {boolean}
     */
    isFraction: function(s) {
        s = s.toString().trim();
        return util.re_fraction.test(s);
    },
    /** Is `n`a number? i.e. `!isNaN(n)`, or is `n` "infinity", or if `allowFractions` is true, is `n` a fraction?
     *
     * If `styles` is given, try to put the number in standard form if it matches any of the given styles.
     *
     * @param {number|string} n
     * @param {boolean} allowFractions
     * @param {string|Array.<string>} styles - Styles of notation to allow.
     * @param {boolean} strictStyle - If false or not given, strings which do not match any of the allowed styles but are valid JavaScript number literals will be allowed. If true, these strings will return false.
     * @see Numbas.util.cleanNumber
     * @returns {boolean}
     */
    isNumber: function(n,allowFractions,styles,strictStyle) {
        if(n===undefined || n===null) {
            return false;
        }
        if(allowFractions && util.re_fraction.test(n)) {
            return true;
        }
        n = util.cleanNumber(n,styles,strictStyle);
        if(!isNaN(n)) {
            return true;
        }
        if(/-?infinity/i.test(n)) {
            return true;
        } else {
            return false;
        }
    },
    /** Wrap a list index so `-1` maps to `length-1`.
     *
     * @param {number} n
     * @param {number} size
     * @returns {number}
     */
    wrapListIndex: function(n,size) {
        if(n<0) {
            n += size;
        }
        return n;
    },
    /** Test if parameter is a boolean - that is: a boolean literal, or any of the strings 'false','true','yes','no', case-insensitive.
     *
     * @param {object} b
     * @returns {boolean}
     */
    isBool: function(b)
    {
        if(b==null) { return false; }
        if(typeof(b)=='boolean') { return true; }
        b = b.toString().toLowerCase();
        return b=='false' || b=='true' || b=='yes' || b=='no';
    },
    /** Parse a string as HTML, and return true only if it contains non-whitespace text.
     *
     * @param {string} html
     * @returns {boolean}
     */
    isNonemptyHTML: function(html) {
        if(html===undefined || html===null) {
            return false;
        }
        if(window.document) {
            var d = document.createElement('div');
            d.innerHTML = html;
            return $(d).text().trim().length>0 || d.querySelector('img,iframe,object');
        } else {
            return html.replace(/<\/?[^>]*>/g,'').trim() != '';
        }
    },
    /** Parse parameter as a boolean. The boolean value `true` and the strings 'true' and 'yes' are parsed as the value `true`, everything else is `false`.
     *
     * @param {object} b
     * @returns {boolean}
     */
    parseBool: function(b)
    {
        if(!b)
            return false;
        b = b.toString().toLowerCase();
        return( b=='true' || b=='yes' );
    },
    /** Regular expression recognising a fraction.
     *
     * @type {RegExp}
     */
    re_fraction: /^\s*(-?)\s*(\d+)\s*\/\s*(\d+)\s*/,

    /**
     * Create a function `(integer,decimal) -> string` which formats a number according to the given punctuation.
     *
     * @param {string} thousands - The string used to separate powers of 1000.
     * @param {string} decimal_mark - The decimal mark character.
     * @param {boolean} [separate_decimal=false] - Should the `thousands` separator be used to separate negative powers of 1000 (that is, groups of 3 digits after the decimal point)?
     * @returns {Function}
     */
    standardNumberFormatter: function(thousands, decimal_mark, separate_decimal) {
        return function(integer,decimal) {
            var s = util.separateThousands(integer,thousands);
            if(decimal) {
                var o = '';
                if(separate_decimal) {
                    for(var i=0;i<decimal.length;i+=3) {
                        o += (o ? thousands : '')+decimal.slice(i,i+3);
                    }
                } else {
                    o = decimal;
                }
                s += decimal_mark+o;
            }
            return s;
        }
    },

    /** Try to match a string representing a number in any of the given styles at the start of the given string, and return both the matched text and a JavaScript number literal equivalent.
     *
     * @param {string} s - The string potentially representing a number.
     * @param {string|string[]} styles - Styles of notation to allow, e.g. `['en','si-en']`.
     * @param {boolean} [strictStyle] - If false or not given, strings which do not match any of the allowed styles but are valid JavaScript number literals will be allowed. If true, these strings will return 'NaN'.
     * @param {boolean} [mustMatchAll] - If true, then the string must contain only the matched number.
     * @returns {object|null} - `{matched, cleaned}` or `null`
     *
     * @see Numbas.util.numberNotationStyles
     */
    matchNotationStyle: function(s,styles,strictStyle,mustMatchAll) {
        var pos = 0;
        s = s.toString();
        var match_neg = /^\s*(-)?\s*/.exec(s);
        var minus = match_neg[1] || '';
        pos += match_neg[0].length;

        var matched = false;
        var cleaned = s;
        var bestpos = pos;
        if(styles!==undefined) {
            if(typeof styles=='string') {
                styles = [styles];
            }
            for(var i=0,l=styles.length;i<l;i++) {
                var style = util.numberNotationStyles[styles[i]];
                if(!style) {
                    continue;
                }
                var re = style.re;
                var m;
                if(re && (m=re.exec(s.slice(pos))) && (!mustMatchAll || s.slice(pos+m[0].length).trim()=='')) {
                    matched = true;
                    var mcleaned;
                    var mpos = pos + m[0].length;
                    if(style.clean) {
                        mcleaned = minus + style.clean(m);
                    } else {
                        var integer = m[1].replace(/\D/g,'');
                        if(m[2]) {
                            var decimal = m[2].replace(/\D/g,'');
                            mcleaned = minus + integer + '.' + decimal
                        } else {
                            mcleaned = minus + integer;
                        }
                        mpos = pos + m[0].length;
                    }
                    if(mpos > bestpos) {
                        bestpos = mpos;
                        cleaned = mcleaned;
                    }
                }
            }
        }
        pos = bestpos;
        if(strictStyle && !matched) {
            cleaned = 'NaN';
        }
        return {
            matched: matched ? s.slice(0,pos) : '',
            cleaned: cleaned
        }
    },

    /** Clean a string potentially representing a number.
     * Remove space, and then try to identify a notation style.
     *
     * If `styles` is given, `s` will be tested against the given styles. If it matches, the string will be rewritten using the matched integer and decimal parts, with punctuation removed and the decimal point changed to a dot.
     *
     * @param {string} s - The string potentially representing a number.
     * @param {string|string[]} styles - Styles of notation to allow, e.g. `['en','si-en']`.
     * @param {boolean} [strictStyle] - If false or not given, strings which do not match any of the allowed styles but are valid JavaScript number literals will be allowed. If true, these strings will return 'NaN'.
     * @returns {string}
     *
     * @see Numbas.util.numberNotationStyles
     */
    cleanNumber: function(s,styles,strictStyle) {
        var result = util.matchNotationStyle(s,styles,strictStyle,true);
        return result.cleaned;
    },

    /** Format a string representing a number given in "plain" notation: an optional minus sign followed by digits, and optionally a dot and more digits.
     *
     * @param {string} s - The string representing a number.
     * @param {string} style - The style of notation to use.
     *
     * @returns {string}
     */
    formatNumberNotation: function(s,style) {
        var match_neg = /^(-)?(.*)/.exec(s);
        var minus = match_neg[1] || '';
        var bits = match_neg[2].split('.');
        var integer = bits[0];
        var decimal = bits[1];
        return minus+util.numberNotationStyles[style].format(integer,decimal);
    },

    /** Parse a number - either as a `Decimal`, or parse a fraction.
     *
     * @param {string} s
     * @param {boolean} allowFractions - Are fractions of the form `a/b` (`a` and `b` integers without punctuation) allowed?
     * @param {string|string[]} styles - Styles of notation to allow.
     * @param {boolean} strictStyle - If false or not given, strings which do not match any of the allowed styles but are valid JavaScript number literals will be allowed. If true, these strings will return NaN.
     * @see Numbas.util.cleanNumber
     * @returns {Decimal}
     */
    parseDecimal: function(s,allowFractions,styles,strictStyle) {
        var cleaned_s = util.cleanNumber(s,styles,strictStyle);
        var m;
        if(util.isFloat(cleaned_s)) {
            return new Decimal(cleaned_s);
        } else if(s.toLowerCase()=='infinity') {
            return new Decimal(Infinity);
        } else if(s.toLowerCase()=='-infinity') {
            return new Decimal(-Infinity);
        } else if(allowFractions && (m = util.parseFraction(s,true))) {
            return new Decimal(m.numerator).dividedBy(new Decimal(m.denominator));
        } else {
            return new Decimal(NaN);
        }
    },
    /** Parse a number - either parseFloat, or parse a fraction.
     *
     * @param {string} s
     * @param {boolean} allowFractions - Are fractions of the form `a/b` (`a` and `b` integers without punctuation) allowed?
     * @param {string|string[]} styles - Styles of notation to allow.
     * @param {boolean} strictStyle - If false or not given, strings which do not match any of the allowed styles but are valid JavaScript number literals will be allowed. If true, these strings will return NaN.
     * @see Numbas.util.cleanNumber
     * @returns {number}
     */
    parseNumber: function(s,allowFractions,styles,strictStyle) {
        var cleaned_s = util.cleanNumber(s,styles,strictStyle);
        var m;
        if(util.isFloat(cleaned_s)) {
            return parseFloat(cleaned_s);
        } else if(s.toLowerCase()=='infinity') {
            return Infinity;
        } else if(s.toLowerCase()=='-infinity') {
            return -Infinity;
        } else if(allowFractions && (m = util.parseFraction(s,true))) {
            return m.numerator/m.denominator;
        } else {
            return NaN;
        }
    },

    /** 
     * Parse an integer in the given base.
     * Unlike javascript's built-in `parseInt`, this returns `NaN` if an invalid character is present in the string.
     * The digits are the numerals 0 to 9, then the letters of the English alphabet.
     *
     * @param {string} s - a representation of a number.
     * @param {number} base - the base of the number's representation.
     * @returns {number}
     */
    parseInt: function(s,base) {
        s = s.toLowerCase();
        var alphabet = 'abcdefghijklmnopqrstuvwxyz';
        var digits = '0123456789';
        var acceptable_digits = (digits+alphabet).slice(0,base);
        if(!s.match(new RegExp('^['+acceptable_digits+']*$'))) {
            return NaN;
        }
        return parseInt(s,base);
    },

    /** A fraction.
     *
     * @typedef {object} fraction
     * @property {number} numerator
     * @property {number} denominator
     */
    /** Parse a string representing an integer or fraction.
     *
     * @param {string} s
     * @param {boolean} [mustMatchAll] - If true, then the string must contain only the matched number.
     * @see Numbas.util.re_fraction
     * @returns {fraction}
     */
    parseFraction: function(s, mustMatchAll) {
        if(util.isInt(s)){
            return {numerator:parseInt(s), denominator:1};
        }
        var m = util.re_fraction.exec(s);
        if(!m || (mustMatchAll && m[0]!=s)) {
            return;
        }
        var n = parseInt(m[2]);
        n = m[1] ? -n : n;
        var d = parseInt(m[3]);
        return {numerator:n, denominator:d};
    },
    /** Pad string `s` on the left with a character `p` until it is `n` characters long.
     *
     * @param {string} s
     * @param {number} n
     * @param {string} p
     * @returns {string}
     */
    lpad: function(s,n,p)
    {
        s=s.toString();
        p=(p+'').slice(0,1);
        while(s.length<n) { s=p+s; }
        return s;
    },
    /** Pad string `s` on the right with a character `p` until it is `n` characters long.
     *
     * @param {string} s
     * @param {number} n
     * @param {string} p
     * @returns {string}
     */
    rpad: function(s,n,p)
    {
        s=s.toString();
        p=(p+'').slice(0,1);
        while(s.length<n) { s=s+p; }
        return s;
    },
    /** Replace occurences of `%s` with the extra arguments of the function.
     *
     * @example 
     * formatString('hello %s %s','Mr.','Perfect') 
     * // 'hello Mr. Perfect'
     * @param {string} str
     * @param {...string} value - String to substitute.
     * @returns {string}
     */
    formatString: function(str,value)
    {
        var i=0;
        for(var i=1;i<arguments.length;i++)
        {
            str=str.replace(/%s/,arguments[i]);
        }
        return str;
    },
    /** String representation of a time, in the format HH:MM:SS.
     *
     * @param {Date} t
     * @returns {string}
     */
    formatTime: function(t) {
        var h = t.getHours();
        var m = t.getMinutes();
        var s = t.getSeconds();
        var lpad = util.lpad;
        return t.toDateString() + ' ' + lpad(h,2,'0')+':'+lpad(m,2,'0')+':'+lpad(s,2,'0');
    },
    /** Format an amount of currency.
     *
     * @example 
     * currency(5.3,'£','p')
     * // £5.30
     * @param {number} n
     * @param {string} prefix - Symbol to use in front of currency if `abs(n) >= 1`.
     * @param {string} suffix - Symbol to use after currency if `abs(n) <= 1`.
     * @returns {string}
     */
    currency: function(n,prefix,suffix) {
        if(n<0)
            return '-'+util.currency(-n,prefix,suffix);
        else if(n==0) {
            return prefix+'0';
        }
        // convert n to a whole number of pence, as a string
        var s = Numbas.math.niceRealNumber(100*n,{precisionType:'dp',precision:0});
        if(n >= 0.995) {
            if(n%1 < 0.005) {
                return prefix+Numbas.math.niceRealNumber(Math.floor(n));
            } else if(n%1 >= 0.995) {
                return prefix+Numbas.math.niceRealNumber(Math.ceil(n));
            }
            s = s.replace(/(..)$/,'.$1');   // put a dot before the last two digits, representing the pence
            return prefix + s
        } else {
            return s + suffix;
        }
    },

    /** Write a number with every three digits separated by the given separator character.
     *
     * @example 
     * separateThousands(1234567.1234,',') 
     * // '1,234,567.1234'
     * @param {number} n
     * @param {string} separator
     * @returns {string}
     */
    separateThousands: function(n,separator) {
        var s = n;
        if(typeof n=='number') {
            if(n<0) {
                return '-'+util.separateThousands(-n,separator);
            }
            s = Numbas.math.niceRealNumber(n);
        }
        var bits = s.split('.');
        var whole = bits[0];
        var frac = bits[1];
        var over = whole.length%3;
        var out = whole.slice(0,over);
        var i = over;
        while(i<whole.length) {
            out += (out ? separator: '')+whole.slice(i,i+3);
            i += 3;
        }
        if(frac>0) {
            out += '.'+(frac+'');
        }
        return out;
    },
    /** Get rid of the % on the end of percentages and parse as float, then divide by 100.
     *
     * @example 
     * unPercent('50%') 
     * // 0.5
     * @example 
     * unPercent('50') 
     * // 0.5
     * @param {string} s
     * @returns {number}
     */
    unPercent: function(s)
    {
        return (util.parseNumber(s.replace(/%/,''))/100);
    },
    /** Pluralise a word.
     *
     * If `n` is not unity, return `plural`, else return `singular`.
     *
     * @param {number} n
     * @param {string} singular - String to return if `n` is +1 or -1.
     * @param {string} plural - String to returns if `n` is not +1 or -1.
     * @returns {string}
     */
    pluralise: function(n,singular,plural)
    {
        n = Numbas.math.precround(n,10);
        if(n==-1 || n==1)
            return singular;
        else
            return plural;
    },
    /** Make the first letter in the string a capital.
     *
     * @param {string} str
     * @returns {string}
     */
    capitalise: function(str) {
        return str.replace(/^[a-z]/,function(c){return c.toUpperCase()});
    },
    /** Split a string up according to brackets.
     *
     * Strips out nested brackets.
     *
     * @example 
     * splitbrackets('a{{b}}c','{','}') 
     * // ['a','b','c']
     * @param {string} str - String to split.
     * @param {string} lb - Left bracket string.
     * @param {string} rb - Right bracket string.
     * @param {string} [nestlb=""] - String to replace nested left brackets with.
     * @param {string} [nestrb=""] - String to repalce nested right brackets with.
     * @returns {Array.<string>} - Alternating strings in brackets and strings outside: odd-numbered indices are inside brackets.
     */
    splitbrackets: function(str,lb,rb,nestlb,nestrb) {
        var length = str.length;
        nestlb = nestlb || '';
        nestrb = nestrb || '';
        var bits = [];
        var start = 0;
        var depth = 0;
        var m;
        for(var i=0;i<length;i++) {
            if(str.charAt(i)=='\\') {
                i += 1;
                continue;
            }
            // if cursor is at a left bracket
            if(str.slice(i,i+lb.length)==lb) {
                bits.push({kind:'str',str:str.slice(start,i)});
                bits.push({kind:'lb'});
                i += lb.length-1;
                start = i+1;
                depth += 1;
            } else if(str.slice(i,i+rb.length)==rb) {
                bits.push({kind:'str',str:str.slice(start,i)});
                bits.push({kind:'rb'});
                i += rb.length-1;
                start = i+1;
                depth -= 1;
            } else if(depth>0 && (m = re_jme_string.exec(str.slice(i)))) {
                bits.push({kind:'str',str: str.slice(start,i)});
                bits.push({kind:'jme_str', str: m[0]});
                i += m[0].length-1;
                start = i + 1;
            }
        }
        if(start<str.length) {
            bits.push({kind:'str',str:str.slice(start)});
        }

        depth = 0;
        var out = [];
        var s = '';
        var s_plain = '';
        var s_unclosed = '';
        var in_string = false;
        for(var i=0;i<bits.length;i++) {
            switch(bits[i].kind) {
                case 'jme_str':
                    s += bits[i].str;
                    break;
                case 'str':
                    s += bits[i].str;
                    s_unclosed += bits[i].str;
                    break;
                case 'lb':
                    s_unclosed += lb;
                    if(depth==0) {
                        s_plain = s;
                        s = '';
                    } else {
                        s += nestlb;
                    }
                    depth += 1;
                    break;
                case 'rb':
                    if(depth==0) {
                        s += rb;
                        s_unclosed += rb;
                    } else {
                        depth -= 1;
                        if(depth>0) {
                            s += nestrb;
                        } else {
                            out.push(s_plain);
                            out.push(s);
                            s = '';
                            s_unclosed = '';
                        }
                    }
                    break;
            }
        }
        if(s_unclosed.length) {
            out.push(s_unclosed);
        }
        return out;
    },

    /** Because XML doesn't like having ampersands hanging about, replace them with escape codes.
     *
     * @param {string} str - XML string.
     * @returns {string}
     */
    escapeHTML: function(str)
    {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
        ;
    },
    /** Create a comparison function which sorts objects by a particular property.
     *
     * @param {Array.<string>|string} props - Name of the property (or list of names of properties) to sort by.
     * @returns {Function}
     */
    sortBy: function(props) {
        if(typeof props=='string') {
            props = [props];
        }
        var l = props.length;
        return function(a,b) {
            for(var i=0;i<l;i++) {
                var prop = props[i];
                if(a[prop]>b[prop])
                    return 1;
                else if(a[prop]<b[prop])
                    return -1;
            }
            return 0;
        }
    },
    /** Hash a string into a string of digits.
     *
     * From {@link http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/}.
     *
     * @param {string} str
     * @returns {string}
     */
    hashCode: function(str){
        var hash = 0, i, c;
        if (str.length == 0) return hash;
        for (i = 0; i < str.length; i++) {
            c = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+c;
        }
        if(hash<0)
            return '0'+(-hash);
        else
            return '1'+hash;
    },
    /** Cartesian product of one or more lists.
     *
     * @param {Array} lists - list of arrays
     * @returns {Array}
     */
    product: function(lists) {
        if(!Array.isArray(lists)) {
            throw(new Numbas.Error("util.product.non list"));
        }
        var indexes = lists.map(function(){return 0});
        var zero = false;
        var nonArray = false;
        var lengths = lists.map(function(l){
            if(!Array.isArray(l)) {
                nonArray = true;
            }
            if(l.length==0) {
                zero = true;
            }
            return l.length
        });
        if(nonArray) {
            throw(new Numbas.Error("util.product.non list"));
        }
        if(zero) {
            return [];
        }
        var end = lists.length-1;
        var out = [];
        while(indexes[0]!=lengths[0]) {
            out.push(indexes.map(function(i,n){return lists[n][i]}));
            var k = end;
            indexes[k] += 1;
            while(k>0 && indexes[k]==lengths[k]) {
                indexes[k] = 0;
                k -= 1;
                indexes[k] += 1;
            }
        }
        return out;
    },

    /** Cartesian product of list, repeated `n` times.
     *
     * @param {Array} l
     * @param {number} n
     * @returns {Array}
     */
    cartesian_power: function(l,n) {
        var o = [[]];
        for(var i=0;i<n;i++) {
            var no = [];
            o.forEach(function(ol) {
                l.forEach(function(x) {
                    var nl = ol.slice();
                    nl.push(x);
                    no.push(nl);
                })
            });
            o = no;
        }
        return o;
    },

    /** Zip lists together: given lists `[a,b,c,...]`, `[x,y,z,...]`, return `[[a,x],[b,y],[c,z], ...]`.
     *
     * @param {Array} lists - list of arrays
     * @returns {Array}
     */
    zip: function(lists) {
        var out = [];
        if(lists.length==0) {
            return out;
        }
        for(var i=0;true;i++) {
            var z = [];
            for(var j=0;j<lists.length;j++) {
                if(i<lists[j].length) {
                    z.push(lists[j][i]);
                } else {
                    return out;
                }
            }
            out.push(z);
        }
    },
    /** All combinations of `r` items from given array, without replacement.
     *
     * @param {Array} list
     * @param {number} r
     * @returns {Array.<Array>}
     */
    combinations: function(list,r) {
        var indexes = [];
        for(var i=0;i<r;i++) {
            indexes.push(i);
        }
        var length = list.length;
        var end = r-1;
        var out = [];
        var steps = 0;
        while(steps<1000 && indexes[0]<length+1-r) {
            steps += 1;
            out.push(indexes.map(function(i){return list[i]; }));
            indexes[end] += 1;
            if(indexes[end]==length) {
                var k = end;
                while(k>=0 && indexes[k]==length+1-r+k) {
                    k -= 1;
                    indexes[k] += 1;
                }
                for(k=k+1;k<r;k++) {
                    indexes[k] = indexes[k-1]+1;
                }
            }
        }
        return out;
    },
    /** All combinations of `r` items from given array, with replacement.
     *
     * @param {Array} list
     * @param {number} r
     * @returns {Array.<Array>}
     */
    combinations_with_replacement: function(list,r) {
        var indexes = [];
        for(var i=0;i<r;i++) {
            indexes.push(0);
        }
        var length = list.length;
        var end = r-1;
        var out = [];
        while(indexes[0]<length) {
            out.push(indexes.map(function(i){return list[i]; }));
            indexes[end] += 1;
            if(indexes[end]==length) {
                var k = end;
                while(k>=0 && indexes[k]==length) {
                    k -= 1;
                    indexes[k] += 1;
                }
                for(k=k+1;k<r;k++) {
                    indexes[k] = indexes[k-1];
                }
            }
        }
        return out;
    },
    /** All permutations of all choices of `r` elements from list.
     *
     * Inspired by the algorithm in Python's itertools library.
     *
     * @param {Array} list - Elements to choose and permute.
     * @param {number} r - Number of elements to choose.
     * @returns {Array.<Array>}
     */
    permutations: function(list,r) {
        var n = list.length;
        if(r===undefined) {
            r = n;
        }
        if(r>n) {
            throw(new Numbas.Error('util.permutations.r bigger than n'));
        }
        var indices = [];
        var cycles = [];
        for(var i=0;i<n;i++) {
            indices.push(i);
        }
        for(var i=n;i>=n-r+1;i--) {
            cycles.push(i);
        }
        var out = [indices.slice(0,r).map(function(v){return list[v]})];
        while(n) {
            for(var i=r-1;i>=0;i--) {
                cycles[i] -= 1
                if(cycles[i]==0) {
                    indices.push(indices.splice(i,1)[0]);
                    cycles[i] = n-i
                } else {
                    var j = cycles[i];
                    var t = indices[i];
                    indices[i] = indices[n-j];
                    indices[n-j] = t;
                    out.push(indices.slice(0,r).map(function(v){return list[v]}));
                    break;
                }
            }
            if(i==-1) {
                return out;
            }
        }
    },
    /** Get the letter format of an ordinal.
     * e.g. the Nth element in the sequence a,b,c,...z,aa,ab,..,az,ba,...
     *
     * @param {number} n
     * @returns {string}
     */
    letterOrdinal: function(n) {
        var alphabet = 'abcdefghijklmnopqrstuvwxyz';
        var b = alphabet.length;
        if(n==0) {
            return alphabet[0];
        }
        var s = '';
        while(n>0) {
            if(s) {
                n -= 1;
            }
            var m = n%b;
            s = alphabet[m]+s;
            n = (n-m)/b;
        }
        return s;
    },
    /** Get a human-sensible name of a part, given its path.
     *
     * @param {string} path
     * @returns {string}
     */
    nicePartName: function(path) {
        var re_path = /^p(\d+)(?:s(\d+))?(?:g(\d+))?(?:a(\d+))?$/;
        var m = re_path.exec(path);
        var s = R('part')+' '+util.letterOrdinal(m[1]);
        if(m[2]) {
            s += ' '+R('step')+' '+m[2];
        }
        if(m[3]) {
            s += ' '+R('gap')+' '+m[3];
        }
        if(m[4]) {
            s += ' '+R('alternative')+' '+m[4];
        }
        return s;
    },

    /** Debounce a function: run it no more than every `frequency` milliseconds.
     *
     * @param {number} frequency - Minimum gap between runs of the callback, in milliseconds.
     * @returns {Function} Call with a callback that you want to run.
     */
    debounce: function(frequency) {
        var last_run = 0;
        var cb;
        var timeout;
        /** If it's at least `frequency` milliseconds since the last run, run the callback, else wait and try again.
         */
        function go() {
            var t = new Date();
            if(t-frequency < last_run) {
                if(timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(go,frequency+1-(t-last_run));
            } else {
                last_run = t;
                cb();
            }
        }
        return function(fn) {
            cb = fn;
            go();
        }
    }
};

/** 
 * A regular expression matching JME string tokens
 * 
 * @type {string}
 */
var re_jme_string = util.re_jme_string = /^("""|'''|['"])((?:[^\1\\]|\\.)*?)\1/;

/** Different styles of writing a decimal.
 *
 * Objects of the form `{re,format}`, where `re` is a regex recognising numbers in this style, and `format(integer,decimal)` renders the number in this style.
 *
 * Each regex matches the integer part in group 1, and the decimal part in group 2 - it should be safe to remove all non-digit characters in these and preserve meaning.
 *
 * @see {@link https://en.wikipedia.org/wiki/Decimal_mark#Examples_of_use|Examples of decimal mark use on Wikipedia}
 * @memberof Numbas.util
 */
var numberNotationStyles = util.numberNotationStyles = {
    // Plain English style - no thousands separator, dot for decimal point
    'plain': {
        re: /^([0-9]+)(\x2E[0-9]+)?/,
        format: function(integer,decimal) {
            if(decimal) {
                return integer+'.'+decimal;
            } else {
                return integer;
            }
        }
    },
    // English style - commas separate thousands, dot for decimal point
    'en': {
        re: /^(\d{1,3}(?:,\d{3})*)(\x2E\d+)?/,
        format: util.standardNumberFormatter(',','.')
    },
    // English SI style - spaces separate thousands, dot for decimal point
    'si-en': {
        re: /^(\d{1,3}(?: +\d{3})*)(\x2E(?:\d{3} )*\d{1,3})?/,
        format: util.standardNumberFormatter(' ','.',true)
    },
    // French SI style - spaces separate thousands, comma for decimal point
    'si-fr': {
        re: /^(\d{1,3}(?: +\d{3})*)(,(?:\d{3} )*\d{1,3})?/,
        format: util.standardNumberFormatter(' ',',',true)
    },
    // Continental European style - dots separate thousands, comma for decimal point
    'eu': {
        re: /^(\d{1,3}(?:\x2E\d{3})*)(,\d+)?/,
        format: util.standardNumberFormatter('.',',')
    },
    // Plain French style - no thousands separator, comma for decimal point
    'plain-eu': {
        re: /^([0-9]+)(,[0-9]+)?/,
        format: function(integer,decimal) {
            if(decimal) {
                return integer+','+decimal;
            } else {
                return integer;
            }
        }
    },
    // Swiss style - apostrophes separate thousands, dot for decimal point
    'ch': {
        re: /^(\d{1,3}(?:'\d{3})*)(\x2E\d+)?/,
        format: util.standardNumberFormatter('\'','.')
    },
    // Indian style - commas separate groups, dot for decimal point. The rightmost group is three digits, other groups are two digits.
    'in': {
        re: /^((?:\d{1,2}(?:,\d{2})*,\d{3})|\d{1,3})(\x2E\d+)?/,
        format: function(integer,decimal) {
            integer = integer+'';
            if(integer.length>3) {
                var over = (integer.length-3)%2
                var out = integer.slice(0,over);
                var i = over;
                while(i<integer.length-3) {
                    out += (out ? ',' : '')+integer.slice(i,i+2);
                    i += 2;
                }
                integer = out+','+integer.slice(i);
            }
            if(decimal) {
                return integer+'.'+decimal;
            } else {
                return integer;
            }
        }
    },
    // Significand-exponent ("scientific") style
    'scientific': {
        re: /^(\d[ \d]*)(\x2E\d[ \d]*)?[eE]([\-+]?\d[ \d]*)/,
        clean: function(m) {
            return Numbas.math.unscientific(m[0]);
        },
        format: function(integer, decimal) {
            return Numbas.math.niceRealNumber(parseFloat(integer+'.'+decimal),{style:'scientific'});
        }
    }
}
var endDelimiters = {
    '$': /[^\\]\$/,
    '\\(': /[^\\]\\\)/,
    '$$': /[^\\]\$\$/,
    '\\[': /[^\\]\\\]/
}
var re_startMaths = /(^|[^\\])(?:\$\$|\$)|\\\(|\\\[|\\begin\{(\w+)\}/;
/** Split a string up by TeX delimiters (`$`, `\[`, `\]`)
 *
 * `bits.re_end` stores the delimiter if the returned array has unfinished maths at the end.
 *
 * @param {string} txt - String to split up.
 * @param {RegExp} re_end - If tex is split across several strings (e.g. text nodes with <br> in the middle), this can be used to give the end delimiter for unfinished maths.
 * @returns {Array.<string>} bits - Stuff outside TeX, left delimiter, TeX, right delimiter, stuff outside TeX, ...
 * @example 
 * contentsplitbrackets('hello $x+y$ and \[this\] etc')
 * // ['hello ','$','x+y','$',' and ','\[','this','\]']
 * @memberof Numbas.util
 * @function
 */
var contentsplitbrackets = util.contentsplitbrackets = function(txt,re_end) {
    var i = 0;
    var m;
    var startDelimiter='', endDelimiter='';
    var startText = '';
    var start='', end='';
    var startChop, endChop;
    var re_end;
    var bits = [];
    while(txt.length) {
        if(!re_end) {
            m = re_startMaths.exec(txt);
            if(!m) {     // if no maths delimiters, we're done
                bits.push(txt);
                txt = '';
                break;
            }
            startDelimiter = m[0];
            var start = m.index;
            startChop = start+startDelimiter.length;
            startText = txt.slice(0,start);
            if(m[1]) {
                startText += m[1];
                startDelimiter = startDelimiter.slice(m[1].length);
            }
            txt = txt.slice(startChop);
            if(startDelimiter.match(/^\\begin/m)) {    //if this is an environment, construct a regexp to find the corresponding \end{} command.
                var environment = m[1];
                re_end = new RegExp('[^\\\\]\\\\end\\{'+environment+'\\}');    // don't ask if this copes with nested environments
            }
            else if(startDelimiter.match(/^(?:.|[\r\n])\$/m)) {
                re_end = endDelimiters[startDelimiter.slice(1)];
            } else {
                re_end = endDelimiters[startDelimiter];    // get the corresponding end delimiter for the matched start delimiter
            }
        }
        m = re_end.exec(txt);
        if(!m) {    // if no ending delimiter, the text contains no valid maths
            bits.push(startText,startDelimiter,txt);
            bits.re_end = re_end;
            txt = '';
            break;
        }
        endDelimiter = m[0].slice(1);
        var end = m.index+1;    // the end delimiter regexp has a "not a backslash" character at the start because JS regexps don't do negative lookbehind
        endChop = end+endDelimiter.length;
        var math = txt.slice(0,end);
        txt = txt.slice(endChop);
        i += startChop+endChop;
        bits.push(startText,startDelimiter,math,endDelimiter);
        re_end = null;
    }
    return bits;
}
//Because indexOf not supported in IE
if(!Array.indexOf)
{
    Array.prototype.indexOf = function(obj){
        for(var i=0; i<this.length; i++){
            if(this[i]==obj){
                return i;
            }
        }
        return -1;
    };
}
//nice short 'string contains' function
if(!String.prototype.contains)
{
    String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
}
if(!Array.prototype.contains)
{
    Array.prototype.contains = function(it) { return this.indexOf(it) != -1; };
}
//merge one array into another, only adding elements which aren't already present
if(!Array.prototype.merge)
{
    Array.prototype.merge = function(arr,sortfn)
    {
        if(this.length==0)
            return arr.slice();
        var out = this.concat(arr);
        if(sortfn)
            out.sort(sortfn);
        else
            out.sort();
        if(sortfn)
        {
            for(var i=1; i<out.length;) {
                if(sortfn(out[i-1],out[i])==0)    //duplicate elements, so remove latest
                    out.splice(i,1);
                else
                    i++;
            }
        }
        else
        {
            for(var i=1;i<out.length;) {
                if(out[i-1]==out[i])
                    out.splice(i,1);
                else
                    i++;
            }
        }
        return out;
    };
}
/* Cross-Browser Split 1.0.1
(c) Steven Levithan <stevenlevithan.com>; MIT License
An ECMA-compliant, uniform cross-browser split method */
var cbSplit;
// avoid running twice, which would break `cbSplit._nativeSplit`'s reference to the native `split`
if (!cbSplit) {
cbSplit = function (str, separator, limit) {
    // if `separator` is not a regex, use the native `split`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
        return cbSplit._nativeSplit.call(str, separator, limit);
    }
    var output = [],
        lastLastIndex = 0,
        flags = (separator.ignoreCase ? "i" : "") +
                (separator.multiline  ? "m" : "") +
                (separator.sticky     ? "y" : ""),
        separator = RegExp(separator.source, flags + "g"), // make `global` and avoid `lastIndex` issues by working with a copy
        separator2, match, lastIndex, lastLength;
    str = str + ""; // type conversion
    if (!cbSplit._compliantExecNpcg) {
        separator2 = RegExp("^" + separator.source + "$(?!\\s)", flags); // doesn't need /g or /y, but they don't hurt
    }
    /* behavior for `limit`: if it's...
    - `undefined`: no limit.
    - `NaN` or zero: return an empty array.
    - a positive number: use `Math.floor(limit)`.
    - a negative number: no limit.
    - other: type-convert, then use the above rules. */
    if (limit === undefined || +limit < 0) {
        limit = Infinity;
    } else {
        limit = Math.floor(+limit);
        if (!limit) {
            return [];
        }
    }
    while (match = separator.exec(str)) {
        lastIndex = match.index + match[0].length; // `separator.lastIndex` is not reliable cross-browser
        if (lastIndex > lastLastIndex) {
            output.push(str.slice(lastLastIndex, match.index));
            // fix browsers whose `exec` methods don't consistently return `undefined` for nonparticipating capturing groups
            if (!cbSplit._compliantExecNpcg && match.length > 1) {
                match[0].replace(separator2, function () {
                    for (var i = 1; i < arguments.length - 2; i++) {
                        if (arguments[i] === undefined) {
                            match[i] = undefined;
                        }
                    }
                });
            }
            if (match.length > 1 && match.index < str.length) {
                Array.prototype.push.apply(output, match.slice(1));
            }
            lastLength = match[0].length;
            lastLastIndex = lastIndex;
            if (output.length >= limit) {
                break;
            }
        }
        if (separator.lastIndex === match.index) {
            separator.lastIndex++; // avoid an infinite loop
        }
    }
    if (lastLastIndex === str.length) {
        if (lastLength || !separator.test("")) {
            output.push("");
        }
    } else {
        output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
};
cbSplit._compliantExecNpcg = /()??/.exec("")[1] === undefined; // NPCG: nonparticipating capturing group
cbSplit._nativeSplit = String.prototype.split;
} // end `if (!cbSplit)`
// for convenience, override the builtin split function with the cross-browser version...
if(!String.prototype.split)
{
    String.prototype.split = function (separator, limit) {
        return cbSplit(this, separator, limit);
    };
}

(function() {
var reduce = Function.bind.call(Function.call, Array.prototype.reduce);
var isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
var concat = Function.bind.call(Function.call, Array.prototype.concat);
var keys = Reflect.ownKeys;

if (!Object.values) {
	Object.values = function values(O) {
		return reduce(keys(O), function(v, k) { return concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []) }, []);
	};
}

if (!Object.entries) {
	Object.entries = function entries(O) {
		return reduce(keys(O), function(e, k) { return concat(e, typeof k === 'string' && isEnumerable(O, k) ? [[k, O[k]]] : []) }, []);
	};
}
})();

});
