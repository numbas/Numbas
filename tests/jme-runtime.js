// Compiled using  runtime/scripts/numbas.js  runtime/scripts/localisation.js  runtime/scripts/util.js  runtime/scripts/math.js  runtime/scripts/i18next/i18next.js  runtime/scripts/jme-rules.js  runtime/scripts/jme.js  runtime/scripts/jme-builtins.js  runtime/scripts/jme-display.js  runtime/scripts/jme-variables.js  runtime/scripts/part.js  runtime/scripts/question.js  runtime/scripts/schedule.js  runtime/scripts/marking.js  runtime/scripts/json.js  themes/default/files/scripts/answer-widgets.js ./runtime/scripts/parts/patternmatch.js ./runtime/scripts/parts/matrixentry.js ./runtime/scripts/parts/extension.js ./runtime/scripts/parts/custom_part_type.js ./runtime/scripts/parts/multipleresponse.js ./runtime/scripts/parts/jme.js ./runtime/scripts/parts/information.js ./runtime/scripts/parts/gapfill.js ./runtime/scripts/parts/numberentry.js
// From the Numbas compiler directory
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
/** @file Contains code to load in the other script files, and initialise the exam.
 *
 * Creates the global {@link Numbas} object, inside which everything else is stored, so as not to conflict with anything else that might be running in the page.
 */
(function() {
if(!window.Numbas) { window.Numbas = {} }
/** @namespace Numbas */
/** Extensions should add objects to this so they can be accessed */
Numbas.extensions = {};
/** A function for displaying debug info in the console. It will try to give a reference back to the line that called it, if it can.
 * @param {String} msg - text to display
 * @param {Boolean} [noStack=false] - don't show the stack trace
 */
Numbas.debug = function(msg,noStack)
{
    if(window.console)
    {
        var e = new Error(msg);
        if(e.stack && !noStack)
        {
            var words= e.stack.split('\n')[2];
            console.log(msg," "+words);
        }
        else
        {
            console.log(msg);
        }
    }
};
/** Display an error in a nice alert box. Also sends the error to the console via {@link Numbas.debug}
 * @param {Error} e
 */
Numbas.showError = function(e)
{
    var message = (e || e.message)+'';
    message += ' <br> ' + e.stack.replace(/\n/g,'<br>\n');
    Numbas.debug(message);
    Numbas.display.showAlert(message);
    throw(e);
};
/** Generic error class. Extends JavaScript's Error
 * @constructor
 * @param {String} message - A description of the error. Localised by R.js.
 */
Numbas.Error = function(message)
{
    Error.call(this);
    if(Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }
    this.name="Numbas Error";
    this.originalMessage = message;
    this.message = R.apply(this,arguments);
}
Numbas.Error.prototype = Error.prototype;
Numbas.Error.prototype.constructor = Numbas.Error;
var scriptreqs = {};
/** Keep track of loading status of a script and its dependencies
 * @param {String} file - name of script
 * @global
 * @constructor
 * @property {String} file - Name of script
 * @property {Boolean} loaded - Has the script been loaded yet?
 * @property {Boolean} executed - Has the script been run?
 * @property {Array.<String>} backdeps - Scripts which depend on this one (need this one to run first)
 * @property {Array.<String>} fdeps - Scripts which this one depends on (it must run after them)
 * @property {function} callback - The function to run when all this script's dependencies have run (this is the script itself)
 */
function RequireScript(file)
{
    this.file = file;
    scriptreqs[file] = this;
    this.backdeps = [];
    this.fdeps = [];
}
RequireScript.prototype = {
    loaded: false,
    executed: false,
    backdeps: [],
    fdeps: [],
    callback: null
};
/** Ask to load a javascript file. Unless `noreq` is set, the file's code must be wrapped in a call to Numbas.queueScript with its filename as the first parameter.
 * @memberof Numbas
 * @param {String} file
 * @param {Boolean} noreq - don't create a {@link Numbas.RequireScript} object
 */
var loadScript = Numbas.loadScript = function(file,noreq)
{
    if(!noreq)
    {
        if(scriptreqs[file]!==undefined)
            return;
        var req = new RequireScript(file);
    }
}
/**
 * Queue up a file's code to be executed.
 * Each script should be wrapped in this function
 * @param {String} file - Name of the script
 * @param {Array.<String>} deps - A list of other scripts which need to be run before this one can be run
 * @param {function} callback - A function wrapping up this file's code
 */
Numbas.queueScript = function(file, deps, callback)
{
    // find a RequireScript
    var req = scriptreqs[file] || new RequireScript(file);
    if(typeof(deps)=='string')
        deps = [deps];
    for(var i=0;i<deps.length;i++)
    {
        var dep = deps[i];
        deps[i] = dep;
        loadScript(dep);
        scriptreqs[dep].backdeps.push(file);
    }
    req.fdeps = deps;
    req.callback = callback;
    req.loaded = true;
    Numbas.tryInit();
}
/** Called when all files have been requested, will try to execute all queued code if all script files have been loaded. */
Numbas.tryInit = function()
{
    if(Numbas.dead) {
        return;
    }
    //put all scripts in a list and go through evaluating the ones that can be evaluated, until everything has been evaluated
    var stack = [];
    var ind = 0;
    function get_ind() {
        return 'margin-left: '+ind+'em';
    }
    function tryRun(req) {
        if(req.loaded && !req.executed) {
            var go = true;
            for(var j=0;j<req.fdeps.length;j++)
            {
                if(!scriptreqs[req.fdeps[j]].executed) {
                    go=false;
                    break;
                }
            }
            if(go)
            {
                if(req.callback) {
                    req.callback({exports:window});
                }
                req.executed=true;
                ind++;
                for(var j=0;j<req.backdeps.length;j++) {
                    tryRun(scriptreqs[req.backdeps[j]]);
                }
                ind--;
            }
        }
    }
    for(var x in scriptreqs)
    {
        try {
            tryRun(scriptreqs[x]);
        } catch(e) {
            alert(e+'');
            Numbas.debug(e.stack);
            Numbas.dead = true;
            return;
        }
    }
}
/** A wrapper round {@link Numbas.queueScript} to register extensions easily.
 * @param {String} name - unique name of the extension
 * @param {Array.<String>} deps - A list of other scripts which need to be run before this one can be run
 * @param {function} callback - Code to set up the extension. It's given the object `Numbas.extensions.<name>` as a parameter, which contains a {@link Numbas.jme.Scope} object.
 */
Numbas.addExtension = function(name,deps,callback) {
    deps.push('jme');
    Numbas.queueScript('extensions/'+name+'/'+name+'.js',deps,function() {
        var extension = Numbas.extensions[name] = {
            scope: new Numbas.jme.Scope()
        };
        callback(extension);
    });
}
/** Check all required scripts have executed - the theme should call this once the document has loaded
 */
Numbas.checkAllScriptsLoaded = function() {
    for(var file in scriptreqs) {
        var req = scriptreqs[file];
        if(req.executed) {
            continue;
        }
        if(req.fdeps.every(function(f){return scriptreqs[f].executed})) {
            var err = new Numbas.Error('die.script not loaded',{file:file});
            console.log(err.message);
            Numbas.display && Numbas.display.die(err);
            break;
        }
    }
}
})();
Numbas.queueScript('localisation',['i18next','localisation-resources'],function() {
    i18next.init({
        lng: Numbas.locale.preferred_locale,
        lowerCaseLng: true,
        keySeparator: false,
        nsSeparator: false,
        interpolation: {
            unescapePrefix: '-',
            format: function(value,format) {
                if(format=='niceNumber') {
                    return Numbas.math.niceNumber(value);
                }
            }
        },
        resources: Numbas.locale.resources
    });
    window.R = function(){{ return i18next.t.apply(i18next,arguments) }};
});
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
Numbas.queueScript('util',['base','math'],function() {
/** @namespace Numbas.util */
var util = Numbas.util = /** @lends Numbas.util */ {
    /** Derive type B from A (class inheritance, really)
     *
     * B's prototype supercedes A's.
     * @param {function} a - the constructor for the parent class
     * @param {function} b - a constructor to be called after `a`'s constructor is done.
     * @returns {function} a constructor for the derived class
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
     * @param {Object} destination
     * @param {Object} others*
     * @returns {Object}
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
     * @param {Array} arr
     * @param {Boolean} deep - if true, do a deep copy of each element
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
     * @param {Object} obj
     * @param {Boolean} deep - if true, each property is cloned as well (recursively) so there should be no side-effects when operating on the cloned object.
     * @returns {Object}
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
    /** Shallow copy an object into an already existing object
     * (add all src's properties to dest)
     * @param {Object} src
     * @param {Object} dest
     */
    copyinto: function(src,dest)
    {
        for(var x in src)
        {
            if(dest[x]===undefined)
                dest[x]=src[x]
        }
    },
    /** Generic equality test on {@link Numbas.jme.token}s
     * @param {Numbas.jme.token} a
     * @param {Numbas.jme.token} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        if(a.type != b.type)
            return false;
        if(a.type in util.equalityTests) {
            return util.equalityTests[a.type](a,b);
        } else {
            throw(new Numbas.Error('util.equality not defined for type',{type:a.type}));
        }
    },
    equalityTests: {
        'nothing': function(a,b) {
            return true;
        },
        'number': function(a,b) {
            return Numbas.math.eq(a.value,b.value);
        },
        'vector': function(a,b) {
            return Numbas.vectormath.eq(a.value,b.value);
        },
        'matrix': function(a,b) {
            return Numbas.matrixmath.eq(a.value,b.value);
        },
        'list': function(a,b) {
            return a.value.length==b.value.length && a.value.filter(function(ae,i){return !util.eq(ae,b.value[i])}).length==0;
        },
        'set': function(a,b) {
            return Numbas.setmath.eq(a.value,b.value);
        },
        'range': function(a,b) {
            return a.value[0]==b.value[0] && a.value[1]==b.value[1] && a.value[2]==b.value[2];
        },
        'name': function(a,b) {
            return a.name.toLowerCase() == b.name.toLowerCase();
        },
        'string': function(a,b) {
            return a.value==b.value;
        },
        'boolean': function(a,b) {
            return a.value==b.value;
        }
    },
    /** Generic inequality test on {@link Numbas.jme.token}s
     * @param {Numbas.jme.token} a
     * @param {Numbas.jme.token} b
     * @returns {Boolean}
     * @see Numbas.util.eq
     */
    neq: function(a,b) {
        return !util.eq(a,b);
    },
    objects_equal: function(a,b) {
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
    /** Are two arrays equal? True if their elements are all equal
     * @param {Array} a
     * @param {Array} b
     * @returns {Boolean}
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
    /** Filter out values in `exclude` from `list`
     * @param {Numbas.jme.types.TList} list
     * @param {Numbas.jme.types.TList} exclude
     * @returns {Array}
     */
    except: function(list,exclude) {
        return list.filter(function(l) {
            for(var i=0;i<exclude.length;i++) {
                if(util.eq(l,exclude[i]))
                    return false;
            }
            return true;
        });
    },
    /** Return a copy of the input list with duplicates removed
     * @param {Array} list
     * @returns {Array}
     * @see Numbas.util.eq
     */
    distinct: function(list) {
        if(list.length==0) {
            return [];
        }
        var out = [list[0]];
        for(var i=1;i<list.length;i++) {
            var got = false;
            for(var j=0;j<out.length;j++) {
                if(util.eq(list[i],out[j])) {
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
     * @param {Array} list
     * @param {Numbas.jme.token} value
     * @returns {Boolean}
     */
    contains: function(list,value) {
        for(var i=0;i<list.length;i++) {
            if(util.eq(value,list[i])) {
                return true;
            }
        }
        return false;
    },
    /** Test if parameter is an integer
     * @param {Object} i
     * @returns {Boolean}
     */
    isInt: function(i)
    {
        return parseInt(i,10)==i;
    },
    /** Test if parameter is a float
     * @param {Object} f
     * @returns {Boolean}
     */
    isFloat: function(f)
    {
        return parseFloat(f)==f;
    },
    /** Test if parameter is a fraction
     * @param {String} s
     * @returns {Boolean}
     */
    isFraction: function(s) {
        s = s.toString().trim();
        return util.re_fraction.test(s);
    },
    /** Is `n`a number? i.e. `!isNaN(n)`, or is `n` "infinity", or if `allowFractions` is true, is `n` a fraction?
     *
     * If `styles` is given, try to put the number in standard form if it matches any of the given styles.
     * @param {Number|String} n
     * @param {Boolean} allowFractions
     * @param {String|Array.<String>} styles - styles of notation to allow.
     * @see Numbas.util.cleanNumber
     * @returns {Boolean}
     */
    isNumber: function(n,allowFractions,styles) {
        if(n===undefined || n===null) {
            return false;
        }
        n = util.cleanNumber(n,styles);
        if(!isNaN(n)) {
            return true;
        }
        if(/-?infinity/i.test(n)) {
            return true;
        } else if(allowFractions && util.re_fraction.test(n)) {
            return true;
        } else {
            return false;
        }
    },
    /** Wrap a list index so -1 maps to length-1
     * @param {Number} n
     * @param {Number} size
     * @returns {Number}
     */
    wrapListIndex: function(n,size) {
        if(n<0) {
            n += size;
        }
        return n;
    },
    /** Test if parameter is a boolean - that is: a boolean literal, or any of the strings 'false','true','yes','no', case-insensitive.
     * @param {Object} b
     * @returns {Boolean}
     */
    isBool: function(b)
    {
        if(b==null) { return false; }
        if(typeof(b)=='boolean') { return true; }
        b = b.toString().toLowerCase();
        return b=='false' || b=='true' || b=='yes' || b=='no';
    },
    /** Parse a string as HTML, and return true only if it contains non-whitespace text
     * @param {String} html
     * @returns {Boolean}
     */
    isNonemptyHTML: function(html) {
        var d = document.createElement('div');
        d.innerHTML = html;
        return $(d).text().trim().length>0;
    },
    /** Parse parameter as a boolean. The boolean value `true` and the strings 'true' and 'yes' are parsed as the value `true`, everything else is `false`.
     * @param {Object} b
     * @returns {Boolean}
     */
    parseBool: function(b)
    {
        if(!b)
            return false;
        b = b.toString().toLowerCase();
        return( b=='true' || b=='yes' );
    },
    /** Regular expression recognising a fraction */
    re_fraction: /^\s*(-?)\s*(\d+)\s*\/\s*(\d+)\s*/,
    /** Create a function `(integer,decimal) -> string` which formats a number according to the given punctuation.
     * @param {String} thousands - the string used to separate powers of 1000
     * @param {String} decimal_mark - the decimal mark character
     * @param {Boolean} separate_decimal=false - should the `thousands` separator be used to separate negative powers of 1000 (that is, groups of 3 digits after the decimal point)?
     * @returns {function}
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
    /** Clean a string potentially representing a number.
     * Remove space, and then try to identify a notation style.
     *
     * If `styles` is given, `s` will be tested against the given styles. If it matches, the string will be rewritten using the matched integer and decimal parts, with punctuation removed and the decimal point changed to a dot.
     *
     * @param {String} s - the string potentially representing a number.
     * @param {String|String[]} styles - styles of notation to allow, e.g. `['en','si-en']`
     *
     * @see Numbas.util.numberNotationStyles
     */
    cleanNumber: function(s,styles) {
        s = s.toString().trim();
        var match_neg = /^(-)?(.*)/.exec(s);
        var minus = match_neg[1] || '';
        s = match_neg[2];
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
                if(re && (m=re.exec(s))) {
                    var integer = m[1].replace(/\D/g,'');
                    if(m[2]) {
                        var decimal = m[2].replace(/\D/g,'');
                        s = integer+'.'+decimal
                    } else {
                        s = integer;
                    }
                    break;
                }
            }
        }
        return minus+s;
    },
    /** Parse a number - either parseFloat, or parse a fraction.
     * @param {String} s
     * @param {Boolean} allowFractions - are fractions of the form `a/b` (`a` and `b` integers without punctuation) allowed?
     * @param {String|String[]} styles - styles of notation to allow.
     * @see Numbas.util.cleanNumber
     * @returns {Number}
     */
    parseNumber: function(s,allowFractions,styles) {
        s = util.cleanNumber(s,styles);
        var m;
        if(util.isFloat(s)) {
            return parseFloat(s);
        } else if(s.toLowerCase()=='infinity') {
            return Infinity;
        } else if(s.toLowerCase()=='-infinity') {
            return -Infinity;
        } else if(allowFractions && (m = util.parseFraction(s))) {
            return m.numerator/m.denominator;
        } else {
            return NaN;
        }
    },
    /** A fraction
     * @typedef {Object} fraction
     * @property {Number} numerator
     * @property {Number} denominator
     */
    /** Parse a string representing an integer or fraction
     * @param {String} s
     * @see Numbas.util.re_fraction
     * @returns {fraction}
     */
    parseFraction: function(s) {
        if(util.isInt(s)){
            return {numerator:parseInt(s), denominator:1};
        }
        var m = util.re_fraction.exec(s);
        if(!m) {
            return;
        }
        var n = parseInt(m[2]);
        n = m[1] ? -n : n;
        var d = parseInt(m[3]);
        return {numerator:n, denominator:d};
    },
    /** Pad string `s` on the left with a character `p` until it is `n` characters long.
     * @param {String} s
     * @param {Number} n
     * @param {String} p
     * @returns {String}
     */
    lpad: function(s,n,p)
    {
        s=s.toString();
        p=(p+'').slice(0,1);
        while(s.length<n) { s=p+s; }
        return s;
    },
    /** Pad string `s` on the right with a character `p` until it is `n` characters long.
     * @param {String} s
     * @param {Number} n
     * @param {String} p
     * @returns {String}
     */
    rpad: function(s,n,p)
    {
        s=s.toString();
        p=(p+'').slice(0,1);
        while(s.length<n) { s=s+p; }
        return s;
    },
    /** Replace occurences of `%s` with the extra arguments of the function
     * @example formatString('hello %s %s','Mr.','Perfect') => 'hello Mr. Perfect'
     * @param {String} str
     * @param {...String} value - string to substitute
     * @returns {String}
     */
    formatString: function(str)
    {
        var i=0;
        for(var i=1;i<arguments.length;i++)
        {
            str=str.replace(/%s/,arguments[i]);
        }
        return str;
    },
    /** String representation of a time, in the format HH:MM:SS
     * @param {Date} t
     * @returns {String}
     */
    formatTime: function(t) {
        var h = t.getHours();
        var m = t.getMinutes();
        var s = t.getSeconds();
        var lpad = util.lpad;
        return t.toDateString() + ' ' + lpad(h,2,'0')+':'+lpad(m,2,'0')+':'+lpad(s,2,'0');
    },
    /** Format an amount of currency
     * @example currency(5.3,'£','p') => £5.30
     * @param {Number} n
     * @param {String} prefix - symbol to use in front of currency if abs(n) >= 1
     * @param {String} suffix - symbol to use after currency if abs(n) <= 1
     */
    currency: function(n,prefix,suffix) {
        if(n<0)
            return '-'+util.currency(-n,prefix,suffix);
        else if(n==0) {
            return prefix+'0';
        }
        // convert n to a whole number of pence, as a string
        var s = Numbas.math.niceNumber(100*n,{precisionType:'dp',precision:0});
        if(n >= 0.995) {
            if(n%1 < 0.005) {
                return prefix+Numbas.math.niceNumber(Math.floor(n));
            } else if(n%1 >= 0.995) {
                return prefix+Numbas.math.niceNumber(Math.ceil(n));
            }
            s = s.replace(/(..)$/,'.$1');   // put a dot before the last two digits, representing the pence
            return prefix + s
        } else {
            return s + suffix;
        }
    },
    /* Write a number with every three digits separated by the given separator character
     * @example separateThousands(1234567.1234,',') => '1,234,567.1234'
     * @param {Number} n
     * @param {String} separator
     * @returns {String}
     */
    separateThousands: function(n,separator) {
        if(n<0) {
            return '-'+util.separateThousands(-n,separator);
        }
        var s = Numbas.math.niceNumber(n);
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
    /** Get rid of the % on the end of percentages and parse as float, then divide by 100
     * @example unPercent('50%') => 0.5
     * @example unPercent('50') => 0.5
     * @param {String} s
     * @returns {Number}
     */
    unPercent: function(s)
    {
        return (util.parseNumber(s.replace(/%/,''))/100);
    },
    /** Pluralise a word
     *
     * If `n` is not unity, return `plural`, else return `singular`
     * @param {Number} n
     * @param {String} singular - string to return if `n` is +1 or -1
     * @param {String} plural - string to returns if `n` is not +1 or -1
     * @returns {String}
     */
    pluralise: function(n,singular,plural)
    {
        n = Numbas.math.precround(n,10);
        if(n==-1 || n==1)
            return singular;
        else
            return plural;
    },
    /** Make the first letter in the string a capital
     * @param {String} str
     * @returns {String}
     */
    capitalise: function(str) {
        return str.replace(/^[a-z]/,function(c){return c.toUpperCase()});
    },
    /** Split a string up according to brackets
     *
     * Strips out nested brackets
     * @example splitbrackets('a{{b}}c','{','}') => ['a','b','c']
     * @param {String} t - string to split
     * @param {String} lb - left bracket string
     * @param {String} rb - right bracket string
     * @returns {Array.<String>} - alternating strings in brackets and strings outside: odd-numbered indices are inside brackets.
     */
    splitbrackets: function(str,lb,rb)
    {
        var length = str.length;
        var lb_length = lb.length;
        var rb_length = rb.length;
        var out = [];    // bits to return
        var end = 0;    // end of the last pair of bracket
        for(var i=0;i<length;i++) {
            // if last character wasn't an escape
            if(i==0 || str.charAt(i-1)!='\\') {
                // if cursor is at a left bracket
                if(str.slice(i,i+lb_length)==lb) {
                    var j = i+lb_length;
                    var depth = 1;
                    var shortened = str.slice();    // this will store the contents of the brackets, with nested brackets removed
                    var acc = 0;    // number of characters removed in shortened text
                    // scan along until matching right bracket found
                    while(j<length && depth>0) {
                        if(j==0 || str.charAt(j-1)!='\\') {
                            if(str.slice(j,j+lb_length)==lb) {
                                // remove this bracket from shortened
                                shortened = shortened.slice(0,j-acc)+shortened.slice(j+lb_length-acc);
                                acc += lb_length;
                                // add 1 to depth
                                depth += 1;
                                j += lb_length;
                            } else if(str.slice(j,j+rb_length)==rb) {
                                // remove this bracket from shortened
                                shortened = shortened.slice(0,j-acc)+shortened.slice(j+rb_length-acc);
                                acc += rb_length;
                                // subtract 1 from depth
                                depth -= 1;
                                j += rb_length;
                            } else {
                                j += 1;
                            }
                        } else {
                            j += 1;
                        }
                    }
                    // if matching right bracket found
                    if(depth==0) {
                        // output plain text found before bracket
                        out.push(str.slice(end,i));
                        // output contents of bracket
                        out.push(shortened.slice(i+lb_length,j-acc));
                        // remember the position of the end of the bracket
                        end = j;
                        i = j-1;
                    }
                }
            }
        }
        // output the remaining plain text
        out.push(str.slice(end));
        return out;
    },
    /** Because XML doesn't like having ampersands hanging about, replace them with escape codes
     * @param {String} str - XML string
     * @returns {String}
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
    /** Create a comparison function which sorts objects by a particular property
     * @param {Array.<String>|String} prop - name of the property (or list of names of properties) to sort by
     * @returns {function}
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
    /** Hash a string into a string of digits
     *
     * From {@link http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/}
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
    /** Cartesian product of one or more lists
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
    /** Zip lists together: given lists [a,b,c,...], [x,y,z,...], return [[a,x],[b,y],[c,z], ...]
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
    /** All combinations of r items from given array, without replacement
     * @param {Array} list
     * @param {Number} r
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
    /** All combinations of r items from given array, with replacement
     * @param {Array} list
     * @param {Number} r
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
    /** All permutations of all choices of r elements from list
     *
     * Inspired by the algorithm in Python's itertools library
     * @param {Array} list - elements to choose and permute
     * @param {Number} r - number of elements to choose
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
    /** Get the letter format of an ordinal
     * e.g. the Nth element in the sequence a,b,c,...z,aa,ab,..,az,ba,...
     * @param {Number} n
     * @returns {String}
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
    /** Get a human-sensible name of a part, given its path
     * @param {String} path
     * @returns {String}
     */
    nicePartName: function(path) {
        var re_path = /^p(\d+)(?:g(\d+)|s(\d+))?$/;
        var m = re_path.exec(path);
        var s = R('part')+' '+util.letterOrdinal(m[1]);
        if(m[2]) {
            s += ' '+R('gap')+' '+m[2];
        }
        if(m[3]) {
            s += ' '+R('step')+' '+m[3];
        }
        return s;
    }
};
/** Different styles of writing a decimal
 *
 * Objects of the form `{re,format}`, where `re` is a regex recognising numbers in this style, and `format(integer,decimal)` renders the number in this style.
 *
 * Each regex matches the integer part in group 1, and the decimal part in group 2 - it should be safe to remove all non-digit characters in these and preserve meaning.
 * @see {@link https://en.wikipedia.org/wiki/Decimal_mark#Examples_of_use|Examples of decimal mark use on Wikipedia}
 * @memberof Numbas.util
 */
var numberNotationStyles = util.numberNotationStyles = {
    // Plain English style - no thousands separator, dot for decimal point
    'plain-en': {
        re: /^([0-9]+)(\x2E[0-9]+)?$/,
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
        re: /^(\d{1,3}(?:,\d{3})*)(\x2E\d+)?$/,
        format: util.standardNumberFormatter(',','.')
    },
    // English SI style - spaces separate thousands, dot for decimal point
    'si-en': {
        re: /^(\d{1,3}(?: +\d{3})*)(\x2E(?:\d{3} )*\d{1,3})?$/,
        format: util.standardNumberFormatter(' ','.',true)
    },
    // French SI style - spaces separate thousands, comma for decimal point
    'si-fr': {
        re: /^(\d{1,3}(?: +\d{3})*)(,(?:\d{3} )*\d{1,3})?$/,
        format: util.standardNumberFormatter(' ',',',true)
    },
    // Continental European style - dots separate thousands, comma for decimal point
    'eu': {
        re: /^(\d{1,3}(?:\x2E\d{3})*)(,\d+)?$/,
        format: util.standardNumberFormatter('.',',')
    },
    // Plain French style - no thousands separator, comma for decimal point
    'plain-eu': {
        re: /^([0-9]+)(,[0-9]+)?$/,
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
        re: /^(\d{1,3}(?:'\d{3})*)(\x2E\d+)?$/,
        format: util.standardNumberFormatter('\'','.')
    },
    // Indian style - commas separate groups, dot for decimal point. The rightmost group is three digits, other groups are two digits.
    'in': {
        re: /^((?:\d{1,2}(?:,\d{2})*,\d{3})|\d{1,3})(\x2E\d+)?$/,
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
 * `bits.re_end` stores the delimiter if the returned array has unfinished maths at the end
 * @param {String} txt - string to split up
 * @param {RegExp} re_end - If tex is split across several strings (e.g. text nodes with <br> in the middle), this can be used to give the end delimiter for unfinished maths
 * @returns {Array.<String>} bits - stuff outside TeX, left delimiter, TeX, right delimiter, stuff outside TeX, ...
 * @example contentsplitbrackets('hello $x+y$ and \[this\] etc') => ['hello ','$','x+y','$',' and ','\[','this','\]']
 * @memberof Numbas.util
 * @method
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
// es5-shim.min.js 24/09/2012
//
// -- kriskowal Kris Kowal Copyright (C) 2009-2011 MIT License
// -- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License (Narwhal Project)
// -- dantman Daniel Friesen Copyright (C) 2010 XXX TODO License or CLA
// -- fschaefer Florian Schäfer Copyright (C) 2010 MIT License
// -- Gozala Irakli Gozalishvili Copyright (C) 2010 MIT License
// -- kitcambridge Kit Cambridge Copyright (C) 2011 MIT License
// -- kossnocorp Sasha Koss XXX TODO License or CLA
// -- bryanforbes Bryan Forbes XXX TODO License or CLA
// -- killdream Quildreen Motta Copyright (C) 2011 MIT Licence
// -- michaelficarra Michael Ficarra Copyright (C) 2011 3-clause BSD License
// -- sharkbrainguy Gerard Paapu Copyright (C) 2011 MIT License
// -- bbqsrc Brendan Molloy (C) 2011 Creative Commons Zero (public domain)
// -- iwyg XXX TODO License or CLA
// -- DomenicDenicola Domenic Denicola Copyright (C) 2011 MIT License
// -- xavierm02 Montillet Xavier Copyright (C) 2011 MIT License
// -- Raynos Jake Verbaten Copyright (C) 2011 MIT Licence
// -- samsonjs Sami Samhuri Copyright (C) 2010 MIT License
// -- rwldrn Rick Waldron Copyright (C) 2011 MIT License
// -- lexer Alexey Zakharov XXX TODO License or CLA
/*!
    Copyright (c) 2009, 280 North Inc. http://280north.com/
    MIT License. http://github.com/280north/narwhal/blob/master/README.md
*/
// Module systems magic dance
(function (definition) {
    // RequireJS
    if (typeof define == "function") {
        define(definition);
    // CommonJS and <script>
    } else {
        definition();
    }
})(function () {
/**
 * Brings an environment as close to ECMAScript 5 compliance
 * as is possible with the facilities of erstwhile engines.
 *
 * Annotated ES5: http://es5.github.com/ (specific links below)
 * ES5 Spec: http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf
 * Required reading: http://javascriptweblog.wordpress.com/2011/12/05/extending-javascript-natives/
 */
//
// Function
// ========
//
// ES-5 15.3.4.5
// http://es5.github.com/#x15.3.4.5
if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(that) { // .length is 1
        // 1. Let Target be the this value.
        var target = this;
        // 2. If IsCallable(Target) is false, throw a TypeError exception.
        if (typeof target != "function") {
            throw new TypeError("Function.prototype.bind called on incompatible " + target);
        }
        // 3. Let A be a new (possibly empty) internal list of all of the
        //   argument values provided after thisArg (arg1, arg2 etc), in order.
        // XXX slicedArgs will stand in for "A" if used
        var args = slice.call(arguments, 1); // for normal call
        // 4. Let F be a new native ECMAScript object.
        // 11. Set the [[Prototype]] internal property of F to the standard
        //   built-in Function prototype object as specified in 15.3.3.1.
        // 12. Set the [[Call]] internal property of F as described in
        //   15.3.4.5.1.
        // 13. Set the [[Construct]] internal property of F as described in
        //   15.3.4.5.2.
        // 14. Set the [[HasInstance]] internal property of F as described in
        //   15.3.4.5.3.
        var bound = function () {
            if (this instanceof bound) {
                // 15.3.4.5.2 [[Construct]]
                // When the [[Construct]] internal method of a function object,
                // F that was created using the bind function is called with a
                // list of arguments ExtraArgs, the following steps are taken:
                // 1. Let target be the value of F's [[TargetFunction]]
                //   internal property.
                // 2. If target has no [[Construct]] internal method, a
                //   TypeError exception is thrown.
                // 3. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the
                //   list boundArgs in the same order followed by the same
                //   values as the list ExtraArgs in the same order.
                // 5. Return the result of calling the [[Construct]] internal
                //   method of target providing args as the arguments.
                var F = function(){};
                F.prototype = target.prototype;
                var self = new F;
                var result = target.apply(
                    self,
                    args.concat(slice.call(arguments))
                );
                if (Object(result) === result) {
                    return result;
                }
                return self;
            } else {
                // 15.3.4.5.1 [[Call]]
                // When the [[Call]] internal method of a function object, F,
                // which was created using the bind function is called with a
                // this value and a list of arguments ExtraArgs, the following
                // steps are taken:
                // 1. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 2. Let boundThis be the value of F's [[BoundThis]] internal
                //   property.
                // 3. Let target be the value of F's [[TargetFunction]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the
                //   list boundArgs in the same order followed by the same
                //   values as the list ExtraArgs in the same order.
                // 5. Return the result of calling the [[Call]] internal method
                //   of target providing boundThis as the this value and
                //   providing args as the arguments.
                // equiv: target.call(this, ...boundArgs, ...args)
                return target.apply(
                    that,
                    args.concat(slice.call(arguments))
                );
            }
        };
        // XXX bound.length is never writable, so don't even try
        //
        // 15. If the [[Class]] internal property of Target is "Function", then
        //     a. Let L be the length property of Target minus the length of A.
        //     b. Set the length own property of F to either 0 or L, whichever is
        //       larger.
        // 16. Else set the length own property of F to 0.
        // 17. Set the attributes of the length own property of F to the values
        //   specified in 15.3.5.1.
        // TODO
        // 18. Set the [[Extensible]] internal property of F to true.
        // TODO
        // 19. Let thrower be the [[ThrowTypeError]] function Object (13.2.3).
        // 20. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "caller", PropertyDescriptor {[[Get]]: thrower, [[Set]]:
        //   thrower, [[Enumerable]]: false, [[Configurable]]: false}, and
        //   false.
        // 21. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "arguments", PropertyDescriptor {[[Get]]: thrower,
        //   [[Set]]: thrower, [[Enumerable]]: false, [[Configurable]]: false},
        //   and false.
        // TODO
        // NOTE Function objects created using Function.prototype.bind do not
        // have a prototype property or the [[Code]], [[FormalParameters]], and
        // [[Scope]] internal properties.
        // XXX can't delete prototype in pure-js.
        // 22. Return F.
        return bound;
    };
}
// Shortcut to an often accessed properties, in order to avoid multiple
// dereference that costs universally.
// _Please note: Shortcuts are defined after `Function.prototype.bind` as we
// us it in defining shortcuts.
var call = Function.prototype.call;
var prototypeOfArray = Array.prototype;
var prototypeOfObject = Object.prototype;
var slice = prototypeOfArray.slice;
// Having a toString local variable name breaks in Opera so use _toString.
var _toString = call.bind(prototypeOfObject.toString);
var owns = call.bind(prototypeOfObject.hasOwnProperty);
// If JS engine supports accessors creating shortcuts.
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;
if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
}
//
// Array
// =====
//
// ES5 15.4.3.2
// http://es5.github.com/#x15.4.3.2
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
if (!Array.isArray) {
    Array.isArray = function isArray(obj) {
        return _toString(obj) == "[object Array]";
    };
}
// The IsCallable() check in the Array functions
// has been replaced with a strict check on the
// internal class of the object to trap cases where
// the provided function was actually a regular
// expression literal, which in V8 and
// JavaScriptCore is a typeof "function".  Only in
// V8 are regular expression literals permitted as
// reduce parameters, so it is desirable in the
// general case for the shim to match the more
// strict and common behavior of rejecting regular
// expressions.
// ES5 15.4.4.18
// http://es5.github.com/#x15.4.4.18
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/forEach
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(fun /*, thisp*/) {
        var self = toObject(this),
            thisp = arguments[1],
            i = -1,
            length = self.length >>> 0;
        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }
        while (++i < length) {
            if (i in self) {
                // Invoke the callback function with call, passing arguments:
                // context, property value, property key, thisArg object context
                fun.call(thisp, self[i], i, self);
            }
        }
    };
}
// ES5 15.4.4.19
// http://es5.github.com/#x15.4.4.19
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
if (!Array.prototype.map) {
    Array.prototype.map = function map(fun /*, thisp*/) {
        var self = toObject(this),
            length = self.length >>> 0,
            result = Array(length),
            thisp = arguments[1];
        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        for (var i = 0; i < length; i++) {
            if (i in self)
                result[i] = fun.call(thisp, self[i], i, self);
        }
        return result;
    };
}
// ES5 15.4.4.20
// http://es5.github.com/#x15.4.4.20
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
if (!Array.prototype.filter) {
    Array.prototype.filter = function filter(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            result = [],
            value,
            thisp = arguments[1];
        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        for (var i = 0; i < length; i++) {
            if (i in self) {
                value = self[i];
                if (fun.call(thisp, value, i, self)) {
                    result.push(value);
                }
            }
        }
        return result;
    };
}
// ES5 15.4.4.16
// http://es5.github.com/#x15.4.4.16
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
if (!Array.prototype.every) {
    Array.prototype.every = function every(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];
        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        for (var i = 0; i < length; i++) {
            if (i in self && !fun.call(thisp, self[i], i, self)) {
                return false;
            }
        }
        return true;
    };
}
// ES5 15.4.4.17
// http://es5.github.com/#x15.4.4.17
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
    Array.prototype.some = function some(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];
        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, self)) {
                return true;
            }
        }
        return false;
    };
}
// ES5 15.4.4.21
// http://es5.github.com/#x15.4.4.21
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduce
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function reduce(fun /*, initial*/) {
        var self = toObject(this),
            length = self.length >>> 0;
        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        // no value to return if no initial value and an empty array
        if (!length && arguments.length == 1) {
            throw new TypeError('reduce of empty array with no initial value');
        }
        var i = 0;
        var result;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i++];
                    break;
                }
                // if array contains no values, no initial value to return
                if (++i >= length) {
                    throw new TypeError('reduce of empty array with no initial value');
                }
            } while (true);
        }
        for (; i < length; i++) {
            if (i in self) {
                result = fun.call(void 0, result, self[i], i, self);
            }
        }
        return result;
    };
}
// ES5 15.4.4.22
// http://es5.github.com/#x15.4.4.22
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduceRight
if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
        var self = toObject(this),
            length = self.length >>> 0;
        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        // no value to return if no initial value, empty array
        if (!length && arguments.length == 1) {
            throw new TypeError('reduceRight of empty array with no initial value');
        }
        var result, i = length - 1;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i--];
                    break;
                }
                // if array contains no values, no initial value to return
                if (--i < 0) {
                    throw new TypeError('reduceRight of empty array with no initial value');
                }
            } while (true);
        }
        do {
            if (i in this) {
                result = fun.call(void 0, result, self[i], i, self);
            }
        } while (i--);
        return result;
    };
}
// ES5 15.4.4.14
// http://es5.github.com/#x15.4.4.14
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
        var self = toObject(this),
            length = self.length >>> 0;
        if (!length) {
            return -1;
        }
        var i = 0;
        if (arguments.length > 1) {
            i = toInteger(arguments[1]);
        }
        // handle negative indices
        i = i >= 0 ? i : Math.max(0, length + i);
        for (; i < length; i++) {
            if (i in self && self[i] === sought) {
                return i;
            }
        }
        return -1;
    };
}
// ES5 15.4.4.15
// http://es5.github.com/#x15.4.4.15
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf
if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
        var self = toObject(this),
            length = self.length >>> 0;
        if (!length) {
            return -1;
        }
        var i = length - 1;
        if (arguments.length > 1) {
            i = Math.min(i, toInteger(arguments[1]));
        }
        // handle negative indices
        i = i >= 0 ? i : length - Math.abs(i);
        for (; i >= 0; i--) {
            if (i in self && sought === self[i]) {
                return i;
            }
        }
        return -1;
    };
}
//
// Object
// ======
//
// ES5 15.2.3.2
// http://es5.github.com/#x15.2.3.2
if (!Object.getPrototypeOf) {
    // https://github.com/kriskowal/es5-shim/issues#issue/2
    // http://ejohn.org/blog/objectgetprototypeof/
    // recommended by fschaefer on github
    Object.getPrototypeOf = function getPrototypeOf(object) {
        return object.__proto__ || (
            object.constructor
                ? object.constructor.prototype
                : prototypeOfObject
        );
    };
}
// ES5 15.2.3.3
// http://es5.github.com/#x15.2.3.3
if (!Object.getOwnPropertyDescriptor) {
    var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a non-object: ";
    Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
        if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError(ERR_NON_OBJECT + object);
        }
        // If object does not owns property return undefined immediately.
        if (!owns(object, property)) {
            return;
        }
        // If object has a property then it's for sure both `enumerable` and
        // `configurable`.
        var descriptor =  { enumerable: true, configurable: true };
        // If JS engine supports accessor properties then property may be a
        // getter or setter.
        if (supportsAccessors) {
            // Unfortunately `__lookupGetter__` will return a getter even
            // if object has own non getter property along with a same named
            // inherited getter. To avoid misbehavior we temporary remove
            // `__proto__` so that `__lookupGetter__` will return getter only
            // if it's owned by an object.
            var prototype = object.__proto__;
            object.__proto__ = prototypeOfObject;
            var getter = lookupGetter(object, property);
            var setter = lookupSetter(object, property);
            // Once we have getter and setter we can put values back.
            object.__proto__ = prototype;
            if (getter || setter) {
                if (getter) {
                    descriptor.get = getter;
                }
                if (setter) {
                    descriptor.set = setter;
                }
                // If it was accessor property we're done and return here
                // in order to avoid adding `value` to the descriptor.
                return descriptor;
            }
        }
        // If we got this far we know that object has an own property that is
        // not an accessor so we set it as a value and return descriptor.
        descriptor.value = object[property];
        return descriptor;
    };
}
// ES5 15.2.3.4
// http://es5.github.com/#x15.2.3.4
if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
        return Object.keys(object);
    };
}
// ES5 15.2.3.5
// http://es5.github.com/#x15.2.3.5
if (!Object.create) {
    Object.create = function create(prototype, properties) {
        var object;
        if (prototype === null) {
            object = { "__proto__": null };
        } else {
            if (typeof prototype != "object") {
                throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
            }
            var Type = function () {};
            Type.prototype = prototype;
            object = new Type();
            // IE has no built-in implementation of `Object.getPrototypeOf`
            // neither `__proto__`, but this manually setting `__proto__` will
            // guarantee that `Object.getPrototypeOf` will work as expected with
            // objects created using `Object.create`
            object.__proto__ = prototype;
        }
        if (properties !== void 0) {
            Object.defineProperties(object, properties);
        }
        return object;
    };
}
// ES5 15.2.3.6
// http://es5.github.com/#x15.2.3.6
// Patch for WebKit and IE8 standard mode
// Designed by hax <hax.github.com>
// related issue: https://github.com/kriskowal/es5-shim/issues#issue/5
// IE8 Reference:
//     http://msdn.microsoft.com/en-us/library/dd282900.aspx
//     http://msdn.microsoft.com/en-us/library/dd229916.aspx
// WebKit Bugs:
//     https://bugs.webkit.org/show_bug.cgi?id=36423
function doesDefinePropertyWork(object) {
    try {
        Object.defineProperty(object, "sentinel", {});
        return "sentinel" in object;
    } catch (exception) {
        // returns falsy
    }
}
// check whether defineProperty works if it's given. Otherwise,
// shim partially.
if (Object.defineProperty) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document == "undefined" ||
        doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
        var definePropertyFallback = Object.defineProperty;
    }
}
if (!Object.defineProperty || definePropertyFallback) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                                      "on this javascript engine";
    Object.defineProperty = function defineProperty(object, property, descriptor) {
        if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
        }
        if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null) {
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
        }
        // make a valiant attempt to use the real defineProperty
        // for I8's DOM elements.
        if (definePropertyFallback) {
            try {
                return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
                // try the shim if the real one doesn't work
            }
        }
        // If it's a data property.
        if (owns(descriptor, "value")) {
            // fail silently if "writable", "enumerable", or "configurable"
            // are requested but not supported
            /*
            // alternate approach:
            if ( // can't implement these features; allow false but not true
                !(owns(descriptor, "writable") ? descriptor.writable : true) ||
                !(owns(descriptor, "enumerable") ? descriptor.enumerable : true) ||
                !(owns(descriptor, "configurable") ? descriptor.configurable : true)
            )
                throw new RangeError(
                    "This implementation of Object.defineProperty does not " +
                    "support configurable, enumerable, or writable."
                );
            */
            if (supportsAccessors && (lookupGetter(object, property) ||
                                      lookupSetter(object, property)))
            {
                // As accessors are supported only on engines implementing
                // `__proto__` we can safely override `__proto__` while defining
                // a property to make sure that we don't hit an inherited
                // accessor.
                var prototype = object.__proto__;
                object.__proto__ = prototypeOfObject;
                // Deleting a property anyway since getter / setter may be
                // defined on object itself.
                delete object[property];
                object[property] = descriptor.value;
                // Setting original `__proto__` back now.
                object.__proto__ = prototype;
            } else {
                object[property] = descriptor.value;
            }
        } else {
            if (!supportsAccessors) {
                throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            }
            // If we got that far then getters and setters can be defined !!
            if (owns(descriptor, "get")) {
                defineGetter(object, property, descriptor.get);
            }
            if (owns(descriptor, "set")) {
                defineSetter(object, property, descriptor.set);
            }
        }
        return object;
    };
}
// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
if (!Object.defineProperties) {
    Object.defineProperties = function defineProperties(object, properties) {
        for (var property in properties) {
            if (owns(properties, property) && property != "__proto__") {
                Object.defineProperty(object, property, properties[property]);
            }
        }
        return object;
    };
}
// ES5 15.2.3.8
// http://es5.github.com/#x15.2.3.8
if (!Object.seal) {
    Object.seal = function seal(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}
// ES5 15.2.3.9
// http://es5.github.com/#x15.2.3.9
if (!Object.freeze) {
    Object.freeze = function freeze(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}
// detect a Rhino bug and patch it
try {
    Object.freeze(function () {});
} catch (exception) {
    Object.freeze = (function freeze(freezeObject) {
        return function freeze(object) {
            if (typeof object == "function") {
                return object;
            } else {
                return freezeObject(object);
            }
        };
    })(Object.freeze);
}
// ES5 15.2.3.10
// http://es5.github.com/#x15.2.3.10
if (!Object.preventExtensions) {
    Object.preventExtensions = function preventExtensions(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}
// ES5 15.2.3.11
// http://es5.github.com/#x15.2.3.11
if (!Object.isSealed) {
    Object.isSealed = function isSealed(object) {
        return false;
    };
}
// ES5 15.2.3.12
// http://es5.github.com/#x15.2.3.12
if (!Object.isFrozen) {
    Object.isFrozen = function isFrozen(object) {
        return false;
    };
}
// ES5 15.2.3.13
// http://es5.github.com/#x15.2.3.13
if (!Object.isExtensible) {
    Object.isExtensible = function isExtensible(object) {
        // 1. If Type(O) is not Object throw a TypeError exception.
        if (Object(object) !== object) {
            throw new TypeError(); // TODO message
        }
        // 2. Return the Boolean value of the [[Extensible]] internal property of O.
        var name = '';
        while (owns(object, name)) {
            name += '?';
        }
        object[name] = true;
        var returnValue = owns(object, name);
        delete object[name];
        return returnValue;
    };
}
// ES5 15.2.3.14
// http://es5.github.com/#x15.2.3.14
if (!Object.keys) {
    // http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
    var hasDontEnumBug = true,
        dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
        ],
        dontEnumsLength = dontEnums.length;
    for (var key in {"toString": null}) {
        hasDontEnumBug = false;
    }
    Object.keys = function keys(object) {
        if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError("Object.keys called on a non-object");
        }
        var keys = [];
        for (var name in object) {
            if (owns(object, name)) {
                keys.push(name);
            }
        }
        if (hasDontEnumBug) {
            for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                var dontEnum = dontEnums[i];
                if (owns(object, dontEnum)) {
                    keys.push(dontEnum);
                }
            }
        }
        return keys;
    };
}
//
// Date
// ====
//
// ES5 15.9.5.43
// http://es5.github.com/#x15.9.5.43
// This function returns a String value represent the instance in time
// represented by this Date object. The format of the String is the Date Time
// string format defined in 15.9.1.15. All fields are present in the String.
// The time zone is always UTC, denoted by the suffix Z. If the time value of
// this object is not a finite Number a RangeError exception is thrown.
if (!Date.prototype.toISOString ||
    (new Date(-1).toISOString() !== '1969-12-31T23:59:59.999Z') ||
    (new Date(-62198755200000).toISOString().indexOf('-000001') === -1)) {
    Date.prototype.toISOString = function toISOString() {
        var result, length, value, year, month;
        if (!isFinite(this)) {
            throw new RangeError("Date.prototype.toISOString called on non-finite value.");
        }
        year = this.getUTCFullYear();
        month = this.getUTCMonth();
        // see https://github.com/kriskowal/es5-shim/issues/111
        year += Math.floor(month / 12);
        month = (month % 12 + 12) % 12;
        // the date time string format is specified in 15.9.1.15.
        result = [month + 1, this.getUTCDate(),
            this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()];
        year = (year < 0 ? '-' : (year > 9999 ? '+' : '')) + ('00000' + Math.abs(year)).slice(0 <= year && year <= 9999 ? -4 : -6);
        length = result.length;
        while (length--) {
            value = result[length];
            // pad months, days, hours, minutes, and seconds to have two digits.
            if (value < 10) {
                result[length] = "0" + value;
            }
        }
        // pad milliseconds to have three digits.
        return year + "-" + result.slice(0, 2).join("-") + "T" + result.slice(2).join(":") + "." +
            ("000" + this.getUTCMilliseconds()).slice(-3) + "Z";
    }
}
// ES5 15.9.4.4
// http://es5.github.com/#x15.9.4.4
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}
// ES5 15.9.5.44
// http://es5.github.com/#x15.9.5.44
// This function provides a String representation of a Date object for use by
// JSON.stringify (15.12.3).
function isPrimitive(input) {
    var t = typeof input;
    return input === null || t === "undefined" || t === "boolean" || t === "number" || t === "string";
}
function ToPrimitive(input) {
    var val, valueOf, toString;
    if (isPrimitive(input)) {
        return input;
    }
    valueOf = input.valueOf;
    if (typeof valueOf === "function") {
        val = valueOf.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    toString = input.toString;
    if (typeof toString === "function") {
        val = toString.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    throw new TypeError();
}
var dateToJSONIsSupported = false;
try {
    dateToJSONIsSupported = Date.prototype.toJSON && new Date(NaN).toJSON() === null;
} catch (e) {}
if (!dateToJSONIsSupported) {
    Date.prototype.toJSON = function toJSON(key) {
        // When the toJSON method is called with argument key, the following
        // steps are taken:
        // 1.  Let O be the result of calling ToObject, giving it the this
        // value as its argument.
        // 2. Let tv be ToPrimitive(O, hint Number).
        var o = Object(this),
            tv = ToPrimitive(o),
            toISO;
        // 3. If tv is a Number and is not finite, return null.
        if (typeof tv === 'number' && !isFinite(tv)) {
            return null;
        }
        // 4. Let toISO be the result of calling the [[Get]] internal method of
        // O with argument "toISOString".
        toISO = o.toISOString;
        // 5. If IsCallable(toISO) is false, throw a TypeError exception.
        if (typeof toISO != "function") {
            throw new TypeError('toISOString property is not callable');
        }
        // 6. Return the result of calling the [[Call]] internal method of
        //  toISO with O as the this value and an empty argument list.
        return toISO.call(o);
        // NOTE 1 The argument is ignored.
        // NOTE 2 The toJSON function is intentionally generic; it does not
        // require that its this value be a Date object. Therefore, it can be
        // transferred to other kinds of objects for use as a method. However,
        // it does require that any such object have a toISOString method. An
        // object is free to use the argument key to filter its
        // stringification.
    };
}
// ES5 15.9.4.2
// http://es5.github.com/#x15.9.4.2
// based on work shared by Daniel Friesen (dantman)
// http://gist.github.com/303249
if (!Date.parse || "Date.parse is buggy") {
    // XXX global assignment won't work in embeddings that use
    // an alternate object for the context.
    Date = (function(NativeDate) {
        // Date.length === 7
        var Date = function Date(Y, M, D, h, m, s, ms) {
            var length = arguments.length;
            if (this instanceof NativeDate) {
                var date = length == 1 && String(Y) === Y ? // isString(Y)
                    // We explicitly pass it through parse:
                    new NativeDate(Date.parse(Y)) :
                    // We have to manually make calls depending on argument
                    // length here
                    length >= 7 ? new NativeDate(Y, M, D, h, m, s, ms) :
                    length >= 6 ? new NativeDate(Y, M, D, h, m, s) :
                    length >= 5 ? new NativeDate(Y, M, D, h, m) :
                    length >= 4 ? new NativeDate(Y, M, D, h) :
                    length >= 3 ? new NativeDate(Y, M, D) :
                    length >= 2 ? new NativeDate(Y, M) :
                    length >= 1 ? new NativeDate(Y) :
                                  new NativeDate();
                // Prevent mixups with unfixed Date object
                date.constructor = Date;
                return date;
            }
            return NativeDate.apply(this, arguments);
        };
        // 15.9.1.15 Date Time String Format.
        var isoDateExpression = new RegExp("^" +
            "(\\d{4}|[\+\-]\\d{6})" + // four-digit year capture or sign + 6-digit extended year
            "(?:-(\\d{2})" + // optional month capture
            "(?:-(\\d{2})" + // optional day capture
            "(?:" + // capture hours:minutes:seconds.milliseconds
                "T(\\d{2})" + // hours capture
                ":(\\d{2})" + // minutes capture
                "(?:" + // optional :seconds.milliseconds
                    ":(\\d{2})" + // seconds capture
                    "(?:\\.(\\d{3}))?" + // milliseconds capture
                ")?" +
            "(" + // capture UTC offset component
                "Z|" + // UTC capture
                "(?:" + // offset specifier +/-hours:minutes
                    "([-+])" + // sign capture
                    "(\\d{2})" + // hours offset capture
                    ":(\\d{2})" + // minutes offset capture
                ")" +
            ")?)?)?)?" +
        "$");
        var monthes = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
        function dayFromMonth(year, month) {
            var t = month > 1 ? 1 : 0;
            return monthes[month] + Math.floor((year - 1969 + t) / 4) - Math.floor((year - 1901 + t) / 100) + Math.floor((year - 1601 + t) / 400) + 365 * (year - 1970);
        }
        // Copy any custom methods a 3rd party library may have added
        for (var key in NativeDate) {
            Date[key] = NativeDate[key];
        }
        // Copy "native" methods explicitly; they may be non-enumerable
        Date.now = NativeDate.now;
        Date.UTC = NativeDate.UTC;
        Date.prototype = NativeDate.prototype;
        Date.prototype.constructor = Date;
        // Upgrade Date.parse to handle simplified ISO 8601 strings
        Date.parse = function parse(string) {
            var match = isoDateExpression.exec(string);
            if (match) {
                // parse months, days, hours, minutes, seconds, and milliseconds
                // provide default values if necessary
                // parse the UTC offset component
                var year = Number(match[1]),
                    month = Number(match[2] || 1) - 1,
                    day = Number(match[3] || 1) - 1,
                    hour = Number(match[4] || 0),
                    minute = Number(match[5] || 0),
                    second = Number(match[6] || 0),
                    millisecond = Number(match[7] || 0),
                    // When time zone is missed, local offset should be used (ES 5.1 bug)
                    // see https://bugs.ecmascript.org/show_bug.cgi?id=112
                    offset = !match[4] || match[8] ? 0 : Number(new Date(1970, 0)),
                    signOffset = match[9] === "-" ? 1 : -1,
                    hourOffset = Number(match[10] || 0),
                    minuteOffset = Number(match[11] || 0),
                    result;
                if (hour < (minute > 0 || second > 0 || millisecond > 0 ? 24 : 25) &&
                    minute < 60 && second < 60 && millisecond < 1000 &&
                    month > -1 && month < 12 && hourOffset < 24 && minuteOffset < 60 && // detect invalid offsets
                    day > -1 && day < dayFromMonth(year, month + 1) - dayFromMonth(year, month)) {
                    result = ((dayFromMonth(year, month) + day) * 24 + hour + hourOffset * signOffset) * 60;
                    result = ((result + minute + minuteOffset * signOffset) * 60 + second) * 1000 + millisecond + offset;
                    if (-8.64e15 <= result && result <= 8.64e15) {
                        return result;
                    }
                }
                return NaN;
            }
            return NativeDate.parse.apply(this, arguments);
        };
        return Date;
    })(Date);
}
//
// String
// ======
//
// ES5 15.5.4.20
// http://es5.github.com/#x15.5.4.20
var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
    "\u2029\uFEFF";
if (!String.prototype.trim || ws.trim()) {
    // http://blog.stevenlevithan.com/archives/faster-trim-javascript
    // http://perfectionkills.com/whitespace-deviations/
    ws = "[" + ws + "]";
    var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
        trimEndRegexp = new RegExp(ws + ws + "*$");
    String.prototype.trim = function trim() {
        if (this === undefined || this === null) {
            throw new TypeError("can't convert "+this+" to object");
        }
        return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
    };
}
//
// Util
// ======
//
// ES5 9.4
// http://es5.github.com/#x9.4
// http://jsperf.com/to-integer
var toInteger = function (n) {
    n = +n;
    if (n !== n) { // isNaN
        n = 0;
    } else if (n !== 0 && n !== (1/0) && n !== -(1/0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
    return n;
};
var prepareString = "a"[0] != "a";
    // ES5 9.9
    // http://es5.github.com/#x9.9
var toObject = function (o) {
    if (o == null) { // this matches both null and undefined
        throw new TypeError("can't convert "+o+" to object");
    }
    // If the implementation doesn't support by-index access of
    // string characters (ex. IE < 9), split the string
    if (prepareString && typeof o == "string" && o) {
        return o.split("");
    }
    return Object(o);
};
});
});
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
Numbas.queueScript('math',['base'],function() {
/** Mathematical functions, providing stuff that the built-in `Math` object doesn't
 * @namespace Numbas.math */
/** A complex number.
 * @typedef complex
 * @property {Number} re
 * @property {Number} im
 */
/** @typedef range
 * @desc A range of numbers, separated by a constant interval and between fixed lower and upper bounds.
 * @type {Array.<Number>}
 * @property {Number} 0 Minimum value
 * @property {Number} 1 Maximum value
 * @property {Number} 2 Step size
 * @see Numbas.math.defineRange
 */
var math = Numbas.math = /** @lends Numbas.math */ {
    /** Regex to match numbers in scientific notation */
    re_scientificNumber: /(\-?(?:0|[1-9]\d*)(?:\.\d+)?)[eE]([\+\-]?\d+)/,
    /** Construct a complex number from real and imaginary parts.
     *
     * Elsewhere in this documentation, `{Number}` will refer to either a JavaScript float or a {@link complex} object, interchangeably.
     * @param {Number} re
     * @param {Number} im
     * @returns {complex}
     */
    complex: function(re,im)
    {
        if(!im)
            return re;
        else
            return {re: re, im: im, complex: true,
            toString: math.complexToString}
    },
    /** String version of a complex number
     * @returns {String}
     * @method
     * @memberof! complex
     */
    complexToString: function()
    {
        return math.niceNumber(this);
    },
    /** Negate a number.
     * @param {Number} n
     * @returns {Number}
     */
    negate: function(n)
    {
        if(n.complex)
            return math.complex(-n.re,-n.im);
        else
            return -n;
    },
    /** Complex conjugate
     * @param {Number} n
     * @returns {Number}
     */
    conjugate: function(n)
    {
        if(n.complex)
            return math.complex(n.re,-n.im);
        else
            return n;
    },
    /** Add two numbers
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    add: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
                return math.complex(a.re+b.re, a.im + b.im);
            else
                return math.complex(a.re+b, a.im);
        }
        else
        {
            if(b.complex)
                return math.complex(a + b.re, b.im);
            else
                return a+b;
        }
    },
    /** Subtract one number from another
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    sub: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
                return math.complex(a.re-b.re, a.im - b.im);
            else
                return math.complex(a.re-b, a.im);
        }
        else
        {
            if(b.complex)
                return math.complex(a - b.re, -b.im);
            else
                return a-b;
        }
    },
    /** Multiply two numbers
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    mul: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
                return math.complex(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
            else
                return math.complex(a.re*b, a.im*b);
        }
        else
        {
            if(b.complex)
                return math.complex(a*b.re, a*b.im);
            else
                return a*b;
        }
    },
    /** Divide one number by another
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    div: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
            {
                var q = b.re*b.re + b.im*b.im;
                return math.complex((a.re*b.re + a.im*b.im)/q, (a.im*b.re - a.re*b.im)/q);
            }
            else
                return math.complex(a.re/b, a.im/b);
        }
        else
        {
            if(b.complex)
            {
                var q = b.re*b.re + b.im*b.im;
                return math.complex(a*b.re/q, -a*b.im/q);
            }
            else
                return a/b;
        }
    },
    /** Exponentiate a number
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    pow: function(a,b)
    {
        if(a.complex && Numbas.util.isInt(b) && Math.abs(b)<100)
        {
            if(b<0)
                return math.div(1,math.pow(a,-b));
            if(b==0)
                return 1;
            var coeffs = math.binomialCoefficients(b);
            var re = 0;
            var im = 0;
            var sign = 1;
            for(var i=0;i<b;i+=2) {
                re += coeffs[i]*Math.pow(a.re,b-i)*Math.pow(a.im,i)*sign;
                im += coeffs[i+1]*Math.pow(a.re,b-i-1)*Math.pow(a.im,i+1)*sign;
                sign = -sign;
            }
            if(b%2==0)
                re += Math.pow(a.im,b)*sign;
            return math.complex(re,im);
        }
        if(a.complex || b.complex || (a<0 && math.fract(b)!=0))
        {
            if(!a.complex)
                a = {re: a, im: 0, complex: true};
            if(!b.complex)
                b = {re: b, im: 0, complex: true};
            var ss = a.re*a.re + a.im*a.im;
            var arg1 = math.arg(a);
            var mag = Math.pow(ss,b.re/2) * Math.exp(-b.im*arg1);
            var arg = b.re*arg1 + (b.im * Math.log(ss))/2;
            return math.complex(mag*Math.cos(arg), mag*Math.sin(arg));
        }
        else
        {
            return Math.pow(a,b);
        }
    },
    /** Calculate the Nth row of Pascal's triangle
     * @param {Number} n
     * @returns {Array.<Number>}
     */
    binomialCoefficients: function(n) {
        var b = [1];
        var f = 1;
        for(var i=1;i<=n;i++) {
            b.push( f*=(n+1-i)/i );
        }
        return b;
    },
    /** a mod b. Always returns a positive number
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    mod: function(a,b) {
        if(b==Infinity) {
            return a;
        }
        b = math.abs(b);
        return ((a%b)+b)%b;
    },
    /** Calculate the `b`-th root of `a`
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    root: function(a,b)
    {
        return math.pow(a,div(1,b));
    },
    /** Square root
     * @param {Number} n
     * @returns {Number}
     */
    sqrt: function(n)
    {
        if(n.complex)
        {
            var r = math.abs(n);
            return math.complex( Math.sqrt((r+n.re)/2), (n.im<0 ? -1 : 1) * Math.sqrt((r-n.re)/2));
        }
        else if(n<0)
            return math.complex(0,Math.sqrt(-n));
        else
            return Math.sqrt(n)
    },
    /** Natural logarithm (base `e`)
     * @param {Number} n
     * @returns {Number}
     */
    log: function(n)
    {
        if(n.complex)
        {
            var mag = math.abs(n);
            var arg = math.arg(n);
            return math.complex(Math.log(mag), arg);
        }
        else if(n<0)
            return math.complex(Math.log(-n),Math.PI);
        else
            return Math.log(n);
    },
    /** Calculate `e^n`
     * @param {Number} n
     * @returns {Number}
     */
    exp: function(n)
    {
        if(n.complex)
        {
            return math.complex( Math.exp(n.re) * Math.cos(n.im), Math.exp(n.re) * Math.sin(n.im) );
        }
        else
            return Math.exp(n);
    },
    /** Magnitude of a number - absolute value of a real; modulus of a complex number.
     * @param {Number} n
     * @returns {Number}
     */
    abs: function(n)
    {
        if(n.complex)
        {
            if(n.re==0)
                return Math.abs(n.im);
            else if(n.im==0)
                return Math.abs(n.re);
            else
                return Math.sqrt(n.re*n.re + n.im*n.im)
        }
        else
            return Math.abs(n);
    },
    /** Argument of a (complex) number
     * @param {Number} n
     * @returns {Number}
     */
    arg: function(n)
    {
        if(n.complex)
            return Math.atan2(n.im,n.re);
        else
            return Math.atan2(0,n);
    },
    /** Real part of a number
     * @param {Number} n
     * @returns {Number}
     */
    re: function(n)
    {
        if(n.complex)
            return n.re;
        else
            return n;
    },
    /** Imaginary part of a number
     * @param {Number} n
     * @returns {Number}
     */
    im: function(n)
    {
        if(n.complex)
            return n.im;
        else
            return 0;
    },
    /** Is `a` less than `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    lt: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a<b;
    },
    /** Is `a` greater than `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    gt: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a>b;
    },
    /** Is `a` less than or equal to `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    leq: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a<=b;
    },
    /** Is `a` greater than or equal to `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    geq: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a>=b;
    },
    /** Is `a` equal to `b`?
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        if(isNaN(a)) {
            return isNaN(b);
        }
        if(a.complex)
        {
            if(b.complex)
                return (a.re==b.re && a.im==b.im);
            else
                return (a.re==b && a.im==0);
        }
        else
        {
            if(b.complex)
                return (a==b.re && b.im==0);
            else
                return a==b;
        }
    },
    /** Greatest of two numbers - wraps `Math.max`
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    max: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return Math.max(a,b);
    },
    /** Greatest of a list of numbers
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @returns {Number}
     */
    listmax: function(numbers) {
        if(numbers.length==0) {
            return;
        }
        var best = numbers[0];
        for(var i=1;i<numbers.length;i++) {
            best = math.max(best,numbers[i]);
        }
        return best;
    },
    /** Least of two numbers - wraps `Math.min`
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    min: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return Math.min(a,b);
    },
    /** Least of a list of numbers
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @returns {Number}
     */
    listmin: function(numbers) {
        if(numbers.length==0) {
            return;
        }
        var best = numbers[0];
        for(var i=1;i<numbers.length;i++) {
            best = math.min(best,numbers[i]);
        }
        return best;
    },
    /** Are `a` and `b` unequal?
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     * @see Numbas.math.eq
     */
    neq: function(a,b)
    {
        return !math.eq(a,b);
    },
    /** If `n` can be written in the form `a*pi^n`, return the biggest possible `n`, otherwise return `0`.
     * @param {Number} n
     * @returns {Number}
     */
    piDegree: function(n)
    {
        n=Math.abs(n);
        if(n>10000)    //so big numbers don't get rounded to a power of pi accidentally
            return 0;
        var degree,a;
        for(degree=1; (a=n/Math.pow(Math.PI,degree))>1 && Math.abs(a-math.round(a))>0.00000001; degree++) {}
        return( a>=1 ? degree : 0 );
    },
    /** Add the given number of zero digits to a string representation of a number.
     * @param {String} n - a string representation of a number
     * @param {Number} digits - the number of digits to add
     * @returns {String}
     */
    addDigits: function(n,digits) {
        n = n+'';
        var m = n.match(/^(-?\d+(?:\.\d+)?)(e[\-+]?\d+)$/);
        if(m) {
            return math.addDigits(m[1],digits)+m[2];
        } else {
            if(n.indexOf('.')==-1) {
                n += '.';
            }
            for(var i=0;i<digits;i++) {
                n += '0';
            }
            return n;
        }
    },
    /** Settings for {@link Numbas.math.niceNumber}
     * @typedef Numbas.math.niceNumber_settings
     * @property {String} precisionType - Either `"dp"` or `"sigfig"`.
     * @property {String} style - Name of a notational style to use. See {@link Numbas.util.numberNotationStyles}.
     */
    /** Display a number nicely - rounds off to 10dp so floating point errors aren't displayed
     * @param {Number} n
     * @param {Numbas.math.niceNumber_settings} options - `precisionType` is either "dp" or "sigfig". `style` is an optional notation style to use.
     * @see Numbas.util.numberNotationStyles
     * @returns {String}
     */
    niceNumber: function(n,options)
    {
        options = options || {};
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(n.complex)
        {
            var re = math.niceNumber(n.re,options);
            var im = math.niceNumber(n.im,options);
            if(math.precround(n.im,10)==0)
                return re+'';
            else if(math.precround(n.re,10)==0)
            {
                if(n.im==1)
                    return 'i';
                else if(n.im==-1)
                    return '-i';
                else
                    return im+'*i';
            }
            else if(n.im<0)
            {
                if(n.im==-1)
                    return re+' - i';
                else
                    return re+im+'*i';
            }
            else
            {
                if(n.im==1)
                    return re+' + '+'i';
                else
                    return re+' + '+im+'*i';
            }
        }
        else
        {
            if(n==Infinity) {
                return 'infinity';
            } else if(n==-Infinity) {
                return '-infinity';
            }
            var piD = 0;
            if(options.precisionType === undefined && (piD = math.piDegree(n)) > 0)
                n /= Math.pow(Math.PI,piD);
            var out;
            switch(options.precisionType) {
            case 'sigfig':
                var precision = options.precision;
                out = math.siground(n,precision)+'';
                var sigFigs = math.countSigFigs(out,true);
                if(sigFigs<precision) {
                    out = math.addDigits(out,precision-sigFigs);
                }
                break;
            case 'dp':
                var precision = options.precision;
                out = math.precround(n,precision)+'';
                var dp = math.countDP(out);
                if(dp<precision) {
                    out = math.addDigits(out,precision-dp);
                }
                break;
            default:
                var a = Math.abs(n);
                if(a<1e-15) {
                    out = '0';
                } else if(Math.abs(n)<1e-8) {
                    out = n+'';
                } else {
                    out = math.precround(n,10)+'';
                }
            }
            out = math.unscientific(out);
            if(options.style && Numbas.util.numberNotationStyles[options.style]) {
                var match_neg = /^(-)?(.*)/.exec(out);
                var minus = match_neg[1] || '';
                var bits = match_neg[2].split('.');
                var integer = bits[0];
                var decimal = bits[1];
                out = minus+Numbas.util.numberNotationStyles[options.style].format(integer,decimal);
            }
            switch(piD)
            {
            case 0:
                return out;
            case 1:
                if(n==1)
                    return 'pi';
                else if(n==-1)
                    return '-pi';
                else
                    return out+'*pi';
            default:
                if(n==1)
                    return 'pi^'+piD;
                else if(n==-1)
                    return '-pi^'+piD;
                else
                    return out+'*pi'+piD;
            }
        }
    },
    /** Get a random number in range `[0..n-1]`
     * @param {Number} n
     * @returns {Number}
     */
    randomint: function(n) {
        return Math.floor(n*(Math.random()%1));
    },
    /** Get a  random shuffling of the numbers `[0..n-1]`
     * @param {Number} n
     * @returns {Array.<Number>}
     */
    deal: function(N)
    {
        var J, K, Q = new Array(N);
        for (J=0 ; J<N ; J++)
            { K = math.randomint(J+1) ; Q[J] = Q[K] ; Q[K] = J; }
        return Q;
    },
    /** Randomly shuffle a list. Returns a new list - the original is unmodified.
     * @param {Array} list
     * @returns {Array}
     */
    shuffle: function(list) {
        var l = list.length;
        var permutation = math.deal(l);
        var list2 = new Array(l);
        for(var i=0;i<l;i++) {
            list2[i]=(list[permutation[i]]);
        }
        return list2;
    },
    /** Calculate the inverse of a shuffling
     * @param {Array.<Number>} l
     * @returns {Array.<Number>} l
     * @see Numbas.math.deal
     */
    inverse: function(l)
    {
        arr = new Array(l.length);
        for(var i=0;i<l.length;i++)
        {
            arr[l[i]]=i;
        }
        return arr;
    },
    /* Just the numbers from 1 to `n` (inclusive) in an array!
     * @param {Number} n
     * @returns {Array.<Number>}
     */
    range: function(n)
    {
        var arr=new Array(n);
        for(var i=0;i<n;i++)
        {
            arr[i]=i;
        }
        return arr;
    },
    /** Round `a` to `b` decimal places. Real and imaginary parts of complex numbers are rounded independently.
     * @param {Number} n
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.precround.complex" if b is complex
     */
    precround: function(a,b) {
        if(b.complex)
            throw(new Numbas.Error('math.precround.complex'));
        if(a.complex)
            return math.complex(math.precround(a.re,b),math.precround(a.im,b));
        else
        {
            var be = Math.pow(10,b);
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
    /** If the given string is scientific notation representing a number, return a string of the form \d+\.\d+
     * For example, '1.23e-5' is returned as '0.0000123'
     * @param {String} str
     * @returns String
     */
    unscientific: function(str) {
        var m = /(-)?(\d+)(?:\.(\d+))?e(-?\d+)/i.exec(str);
        if(!m) {
            return str;
        }
        var minus = m[1] || '';
        var digits = m[2]+(m[3] || '');
        var pow = parseInt(m[4]);
        var l = digits.length;
        var out;
        if(pow>=l-1) {
            out = digits;
            for(var i=l-1;i<pow;i++) {
                out += '0';
            }
        } else if(pow<0) {
            out = digits;
            for(var i=1;i<-pow;i++) {
                out = '0'+out;
            }
            out = '0.'+out;
        } else {
            out = digits.slice(0,pow+1) + '.' + digits.slice(pow+1);
        }
        return minus + out;
    },
    /** Round `a` to `b` significant figures. Real and imaginary parts of complex numbers are rounded independently.
     * @param {Number} n
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.precround.complex" if b is complex
     */
    siground: function(a,b) {
        if(b.complex)
            throw(new Numbas.Error('math.siground.complex'));
        if(a.complex)
            return math.complex(math.siground(a.re,b),math.siground(a.im,b));
        else
        {
            var s = math.sign(a);
            if(a==0) { return 0; }
            if(a==Infinity || a==-Infinity) { return a; }
            b = Math.pow(10, b-Math.ceil(math.log10(s*a)));
            //test to allow a bit of leeway to account for floating point errors
            //if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
            var v = a*b*10 % 1;
            var d = (a>0 ? Math.floor : Math.ceil)(a*b*10 % 10);
            if(d==4 && 1-v<1e-9) {
                return Math.round(a*b+1)/b;
            }
            else if(d==-5 && v>-1e-9 && v<0) {
                return Math.round(a*b+1)/b;
            }
            return Math.round(a*b)/b;
        }
    },
    /** Count the number of decimal places used in the string representation of a number.
     * @param {Number|String} n
     * @returns {Number}
     */
    countDP: function(n) {
        var m = (n+'').match(/(?:\.(\d*))?(?:[Ee]([\-+])?(\d+))?$/);
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
    /** Calculate the significant figures precision of a number.
     * @param {Number|String} n
     * @param {Boolean} [max] - be generous with calculating sig. figs. for whole numbers. e.g. '1000' could be written to 4 sig figs.
     * @returns {Number}
     */
    countSigFigs: function(n,max) {
        n += '';
        var m;
        if(max) {
            m = n.match(/^-?(?:(\d0*)$|(?:([1-9]\d*[1-9]0*)$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)[Ee][+\-]?\d+)$)/i);
        } else {
            m = n.match(/^-?(?:(\d)0*$|(?:([1-9]\d*[1-9])0*$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)[Ee][+\-]?\d+)$)/i);
        }
        if(!m)
            return 0;
        var sigFigs = m[1] || m[2] || m[3] || m[4] || m[5] || m[6];
        return sigFigs.replace('.','').length;
    },
    /** Is n given to the desired precision?
     * @param {Number|String} n
     * @param {String} precisionType - either 'dp' or 'sigfig'
     * @param {Number} precision - number of desired digits of precision
     * @param {Boolean} strictPrecision - must trailing zeros be used to get to the desired precision (true), or is it allowed to give fewer digits in that case (false)?
     * @returns {Boolean}
     */
    toGivenPrecision: function(n,precisionType,precision,strictPrecision) {
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
    /** Is a within +/- tolerance of b?
     * @param {Number} a
     * @param {Number} b
     * @param {Number} tolerance
     * @returns {Boolean}
     */
    withinTolerance: function(a,b,tolerance) {
        if(tolerance==0) {
            return math.eq(a,b);
        } else {
            var upper = math.add(b,tolerance);
            var lower = math.sub(b,tolerance);
            return math.geq(a,lower) && math.leq(a,upper);
        }
    },
    /** Factorial, or Gamma(n+1) if n is not a positive integer.
     * @param {Number} n
     * @returns {Number}
     */
    factorial: function(n)
    {
        if( Numbas.util.isInt(n) && n>=0 )
        {
            if(n<=1) {
                return 1;
            }else{
                var j=1;
                for(var i=2;i<=n;i++)
                {
                    j*=i;
                }
                return j;
            }
        }
        else    //gamma function extends factorial to non-ints and negative numbers
        {
            return math.gamma(math.add(n,1));
        }
    },
    /** Lanczos approximation to the gamma function
     *
     * http://en.wikipedia.org/wiki/Lanczos_approximation#Simple_implementation
     * @param {Number} n
     * @returns {Number}
     */
    gamma: function(n)
    {
        var g = 7;
        var p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
        var mul = math.mul, div = math.div, exp = math.exp, neg = math.negate, pow = math.pow, sqrt = math.sqrt, sin = math.sin, add = math.add, sub = math.sub, pi = Math.PI, im = math.complex(0,1);
        if((n.complex && n.re<0.5) || (!n.complex && n<0.5))
        {
            return div(pi,mul(sin(mul(pi,n)),math.gamma(sub(1,n))));
        }
        else
        {
            n = sub(n,1);            //n -= 1
            var x = p[0];
            for(var i=1;i<g+2;i++)
            {
                x = add(x, div(p[i],add(n,i)));    // x += p[i]/(n+i)
            }
            var t = add(n,add(g,0.5));        // t = n+g+0.5
            return mul(sqrt(2*pi),mul(pow(t,add(n,0.5)),mul(exp(neg(t)),x)));    // return sqrt(2*pi)*t^(z+0.5)*exp(-t)*x
        }
    },
    /** Base-10 logarithm
     * @param {Number} n
     * @returns {Number}
     */
    log10: function(n)
    {
        return mul(math.log(n),Math.LOG10E);
    },
    /** Arbitrary base logarithm
     * @param {Number} n
     * @param {Number} b
     * @returns {Number} log(n)/log(b)
     */
    log_base: function(n,b)
    {
        return div(math.log(n),math.log(b));
    },
    /** Convert from degrees to radians
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.degrees
     */
    radians: function(x) {
        return mul(x,Math.PI/180);
    },
    /** Convert from radians to degrees
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.radians
     */
    degrees: function(x) {
        return mul(x,180/Math.PI);
    },
    /** Cosine
     * @param {Number} x
     * @returns {Number}
     */
    cos: function(x) {
        if(x.complex)
        {
            return math.complex(Math.cos(x.re)*math.cosh(x.im), -Math.sin(x.re)*math.sinh(x.im));
        }
        else
            return Math.cos(x);
    },
    /** Sine
     * @param {Number} x
     * @returns {Number}
     */
    sin: function(x) {
        if(x.complex)
        {
            return math.complex(Math.sin(x.re)*math.cosh(x.im), Math.cos(x.re)*math.sinh(x.im));
        }
        else
            return Math.sin(x);
    },
    /** Tangent
     * @param {Number} x
     * @returns {Number}
     */
    tan: function(x) {
        if(x.complex)
            return div(math.sin(x),math.cos(x));
        else
            return Math.tan(x);
    },
    /** Cosecant
     * @param {Number} x
     * @returns {Number}
     */
    cosec: function(x) {
        return div(1,math.sin(x));
    },
    /** Secant
     * @param {Number} x
     * @returns {Number}
     */
    sec: function(x) {
        return div(1,math.cos(x));
    },
    /** Cotangent
     * @param {Number} x
     * @returns {Number}
     */
    cot: function(x) {
        return div(1,math.tan(x));
    },
    /** Inverse sine
     * @param {Number} x
     * @returns {Number}
     */
    arcsin: function(x) {
        if(x.complex || math.abs(x)>1)
        {
            var i = math.complex(0,1), ni = math.complex(0,-1);
            var ex = add(mul(x,i),math.sqrt(sub(1,mul(x,x)))); //ix+sqrt(1-x^2)
            return mul(ni,math.log(ex));
        }
        else
            return Math.asin(x);
    },
    /** Inverse cosine
     * @param {Number} x
     * @returns {Number}
     */
    arccos: function(x) {
        if(x.complex || math.abs(x)>1)
        {
            var i = math.complex(0,1), ni = math.complex(0,-1);
            var ex = add(x, math.sqrt( sub(mul(x,x),1) ) );    //x+sqrt(x^2-1)
            var result = mul(ni,math.log(ex));
            if(math.re(result)<0 || math.re(result)==0 && math.im(result)<0)
                result = math.negate(result);
            return result;
        }
        else
            return Math.acos(x);
    },
    /** Inverse tangent
     * @param {Number} x
     * @returns {Number}
     */
    arctan: function(x) {
        if(x.complex)
        {
            var i = math.complex(0,1);
            var ex = div(add(i,x),sub(i,x));
            return mul(math.complex(0,0.5), math.log(ex));
        }
        else
            return Math.atan(x);
    },
    /** Hyperbolic sine
     * @param {Number} x
     * @returns {Number}
     */
    sinh: function(x) {
        if(x.complex)
            return div(sub(math.exp(x), math.exp(math.negate(x))),2);
        else
            return (Math.exp(x)-Math.exp(-x))/2;
    },
    /** Hyperbolic cosine
     * @param {Number} x
     * @returns {Number}
     */
    cosh: function(x) {
        if(x.complex)
            return div(add(math.exp(x), math.exp(math.negate(x))),2);
        else
            return (Math.exp(x)+Math.exp(-x))/2
    },
    /** Hyperbolic tangent
     * @param {Number} x
     * @returns {Number}
     */
    tanh: function(x) {
        return div(math.sinh(x),math.cosh(x));
    },
    /** Hyperbolic cosecant
     * @param {Number} x
     * @returns {Number}
     */
    cosech: function(x) {
        return div(1,math.sinh(x));
    },
    /** Hyperbolic secant
     * @param {Number} x
     * @returns {Number}
     */
    sech: function(x) {
        return div(1,math.cosh(x));
    },
    /** Hyperbolic tangent
     * @param {Number} x
     * @returns {Number}
     */
    coth: function(x) {
        return div(1,math.tanh(x));
    },
    /** Inverse hyperbolic sine
     * @param {Number} x
     * @returns {Number}
     */
    arcsinh: function(x) {
        if(x.complex)
            return math.log(add(x, math.sqrt(add(mul(x,x),1))));
        else
            return Math.log(x + Math.sqrt(x*x+1));
    },
    /** Inverse hyperbolic cosine
     * @param {Number} x
     * @returns {Number}
     */
    arccosh: function (x) {
        if(x.complex)
            return math.log(add(x, math.sqrt(sub(mul(x,x),1))));
        else
            return Math.log(x + Math.sqrt(x*x-1));
    },
    /** Inverse hyperbolic tangent
     * @param {Number} x
     * @returns {Number}
     */
    arctanh: function (x) {
        if(x.complex)
            return div(math.log(div(add(1,x),sub(1,x))),2);
        else
            return 0.5 * Math.log((1+x)/(1-x));
    },
    /** Round up to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.round
     * @see Numbas.math.floor
     */
    ceil: function(x) {
        if(x.complex)
            return math.complex(math.ceil(x.re),math.ceil(x.im));
        else
            return Math.ceil(x);
    },
    /** Round down to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.ceil
     * @see Numbas.math.round
     */
    floor: function(x) {
        if(x.complex)
            return math.complex(math.floor(x.re),math.floor(x.im));
        else
            return Math.floor(x);
    },
    /** Round to the nearest integer; fractional part >= 0.5 rounds up. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.ceil
     * @see Numbas.math.floor
     */
    round: function(x) {
        if(x.complex)
            return math.complex(Math.round(x.re),Math.round(x.im));
        else
            return Math.round(x);
    },
    /** Integer part of a number - chop off the fractional part. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.fract
     */
    trunc: function(x) {
        if(x.complex)
            return math.complex(math.trunc(x.re),math.trunc(x.im));
        if(x>0) {
            return Math.floor(x);
        }else{
            return Math.ceil(x);
        }
    },
    /** Fractional part of a number - Take away the whole number part. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.trunc
     */
    fract: function(x) {
        if(x.complex)
            return math.complex(math.fract(x.re),math.fract(x.im));
        return x-math.trunc(x);
    },
    /** Sign of a number - +1, 0, or -1. For complex numbers, gives the sign of the real and imaginary parts separately.
     * @param {Number} x
     * @returns {Number}
     */
    sign: function(x) {
        if(x.complex)
            return math.complex(math.sign(x.re),math.sign(x.im));
        if(x==0) {
            return 0;
        }else if (x>0) {
            return 1;
        }else {
            return -1;
        }
    },
    /** Get a random real number between `min` and `max` (inclusive)
     * @param {Number} min
     * @param {Number] max
     * @returns {Number}
     * @see Numbas.math.random
     * @see Numbas.math.choose
     */
    randomrange: function(min,max)
    {
        return Math.random()*(max-min)+min;
    },
    /** Get a random number in the specified range.
     *
     * Returns a random choice from `min` to `max` at `step`-sized intervals
     *
     * If all the values in the range are appended to the list, eg `[min,max,step,v1,v2,v3,...]`, just pick randomly from the values.
     *
     * @param {range} range - `[min,max,step]`
     * @returns {Number}
     * @see Numbas.math.randomrange
     */
    random: function(range)
    {
        if(range[2]==0) {
            return math.randomrange(range[0],range[1]);
        } else {
            var num_steps = math.rangeSize(range);
            var n = Math.floor(math.randomrange(0,num_steps));
            return range[0]+n*range[2];
        }
    },
    /** Remove all the values in the list `exclude` from the list `range`
     * @param {Array.<Number>} range
     * @param {Array.<Number>} exclude
     * @returns {Array.<Number>}
     */
    except: function(range,exclude) {
        range = range.filter(function(r) {
            for(var i=0;i<exclude.length;i++) {
                if(math.eq(r,exclude[i]))
                    return false;
            }
            return true;
        });
        return range;
    },
    /** Choose one item from an array, at random
     * @param {Array} selection
     * @throws {Numbas.Error} "math.choose.empty selection" if `selection` has length 0.
     * @see Numbas.math.randomrange
     */
    choose: function(selection)
    {
        if(selection.length==0)
            throw(new Numbas.Error('math.choose.empty selection'));
        var n = Math.floor(math.randomrange(0,selection.length));
        return selection[n];
    },
    /* Product of the numbers in the range `[a..b]`, i.e. $frac{a!}{b!}$.
     *
     * from http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/
     *
     * (public domain)
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    productRange: function(a,b) {
        if(a>b)
            return 1;
        var product=a,i=a;
        while (i++<b) {
            product*=i;
        }
        return product;
    },
    /** `nCk` - number of ways of picking `k` unordered elements from `n`.
     * @param {Number} n
     * @param {Number} k
     * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
     */
    combinations: function(n,k) {
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
        k=Math.max(k,n-k);
        return math.productRange(k+1,n)/math.productRange(1,n-k);
    },
    /** `nPk` - number of ways of picking `k` ordered elements from `n`.
     * @param {Number} n
     * @param {Number} k
     * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
     */
    permutations: function(n,k) {
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
        return math.productRange(n-k+1,n);
    },
    /** Does `a` divide `b`? If either of `a` or `b` is not an integer, return `false`.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    divides: function(a,b) {
        if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b))
            return false;
        return (b % a) == 0;
    },
    /** Greatest common factor (GCF), or greatest common divisor (GCD), of `a` and `b`.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
     */
    gcd: function(a,b) {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.gcf.complex'));
        if(Math.floor(a)!=a || Math.floor(b)!=b)
            return 1;
        a = Math.floor(Math.abs(a));
        b = Math.floor(Math.abs(b));
        var c=0;
        if(a<b) { c=a; a=b; b=c; }
        if(b==0){return 1;}
        while(a % b != 0) {
            c=b;
            b=a % b;
            a=c;
        }
        return b;
    },
    /** Lowest common multiple (LCM) of `a` and `b`.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
     */
    lcm: function(a,b) {
        if(arguments.length==0) {
            return 1;
        } else if(arguments.length==1) {
            return a;
        }
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.lcm.complex'));
        if(arguments.length>2) {
            a = Math.floor(Math.abs(a));
            for(var i=1;i<arguments.length;i++) {
                if(arguments[i].complex) {
                    throw(new Numbas.Error('math.lcm.complex'));
                }
                b = Math.floor(Math.abs(arguments[i]));
                a = a*b/math.gcf(a,b);
            }
            return a;
        }
        a = Math.floor(Math.abs(a));
        b = Math.floor(Math.abs(b));
        var c = math.gcf(a,b);
        return a*b/c;
    },
    /** Write the range of integers `[a..b]` as an array of the form `[min,max,step]`, for use with {@link Numbas.math.random}. If either number is complex, only the real part is used.
     *
     * @param {Number} a
     * @param {Number} b
     * @returns {range}
     * @see Numbas.math.random
     */
    defineRange: function(a,b)
    {
        if(a.complex)
            a=a.re;
        if(b.complex)
            b=b.re;
        return [a,b,1];
    },
    /** Change the step size of a range created with {@link Numbas.math.defineRange}
     * @param {range} range
     * @param {Number} step
     * @returns {range}
     */
    rangeSteps: function(range,step)
    {
        if(step.complex)
            step = step.re;
        return [range[0],range[1],step];
    },
    /** Convert a range to a list - enumerate all the elements of the range
     * @param {range} range
     * @returns {Number[]}
     */
    rangeToList: function(range) {
        var start = range[0];
        var end = range[1];
        var step_size = range[2];
        var out = [];
        var n = 0;
        var t = start;
        if(step_size==0) {
            throw(new Numbas.Error('math.rangeToList.zero step size'));
        }
        if((end-start)*step_size < 0) {
            return [];
        }
        if(start==end) {
            return [start];
        }
        while(start<end ? t<=end : t>=end)
        {
            out.push(t)
            n += 1;
            t = start + n*step_size;
        }
        return out;
    },
    /** Calculate the number of elements in a range
     * @param {range} range
     * @returns {Number}
     */
    rangeSize: function(range) {
        var diff = range[1]-range[0];
        var num_steps = Math.floor(diff/range[2])+1;
        num_steps += (range[0]+num_steps*range[2] == range[1] ? 1 : 0);
        return num_steps;
    },
    /** Get a rational approximation to a real number by the continued fractions method.
     *
     * If `accuracy` is given, the returned answer will be within `Math.exp(-accuracy)` of the original number
     *
     * @param {Number} n
     * @param {Number} [accuracy]
     * @returns {Array.<Number>} - [numerator,denominator]
     */
    rationalApproximation: function(n,accuracy)
    {
        if(accuracy===undefined)
            accuracy = 15;
        accuracy = Math.exp(-accuracy);
        var on = n;
        var e = Math.floor(n);
        if(e==n)
            return [n,1];
        var l = 0;
        var frac = [];
        while(Math.abs(on-e)>accuracy)
        {
            l+=1;
            var i = Math.floor(n);
            frac.push(i);
            n = 1/(n-i);
            var e = Infinity;
            for(var j=l-1;j>=0;j--)
            {
                e = frac[j]+1/e;
            }
        }
        if(l==0) {
            return [e,1];
        }
        var f = [1,0];
        for(j=l-1;j>=0;j--)
        {
            f = [frac[j]*f[0]+f[1],f[0]];
        }
        return f;
    },
    /** The first 1000 primes */
    primes: [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997,1009,1013,1019,1021,1031,1033,1039,1049,1051,1061,1063,1069,1087,1091,1093,1097,1103,1109,1117,1123,1129,1151,1153,1163,1171,1181,1187,1193,1201,1213,1217,1223,1229,1231,1237,1249,1259,1277,1279,1283,1289,1291,1297,1301,1303,1307,1319,1321,1327,1361,1367,1373,1381,1399,1409,1423,1427,1429,1433,1439,1447,1451,1453,1459,1471,1481,1483,1487,1489,1493,1499,1511,1523,1531,1543,1549,1553,1559,1567,1571,1579,1583,1597,1601,1607,1609,1613,1619,1621,1627,1637,1657,1663,1667,1669,1693,1697,1699,1709,1721,1723,1733,1741,1747,1753,1759,1777,1783,1787,1789,1801,1811,1823,1831,1847,1861,1867,1871,1873,1877,1879,1889,1901,1907,1913,1931,1933,1949,1951,1973,1979,1987,1993,1997,1999,2003,2011,2017,2027,2029,2039,2053,2063,2069,2081,2083,2087,2089,2099,2111,2113,2129,2131,2137,2141,2143,2153,2161,2179,2203,2207,2213,2221,2237,2239,2243,2251,2267,2269,2273,2281,2287,2293,2297,2309,2311,2333,2339,2341,2347,2351,2357,2371,2377,2381,2383,2389,2393,2399,2411,2417,2423,2437,2441,2447,2459,2467,2473,2477,2503,2521,2531,2539,2543,2549,2551,2557,2579,2591,2593,2609,2617,2621,2633,2647,2657,2659,2663,2671,2677,2683,2687,2689,2693,2699,2707,2711,2713,2719,2729,2731,2741,2749,2753,2767,2777,2789,2791,2797,2801,2803,2819,2833,2837,2843,2851,2857,2861,2879,2887,2897,2903,2909,2917,2927,2939,2953,2957,2963,2969,2971,2999,3001,3011,3019,3023,3037,3041,3049,3061,3067,3079,3083,3089,3109,3119,3121,3137,3163,3167,3169,3181,3187,3191,3203,3209,3217,3221,3229,3251,3253,3257,3259,3271,3299,3301,3307,3313,3319,3323,3329,3331,3343,3347,3359,3361,3371,3373,3389,3391,3407,3413,3433,3449,3457,3461,3463,3467,3469,3491,3499,3511,3517,3527,3529,3533,3539,3541,3547,3557,3559,3571,3581,3583,3593,3607,3613,3617,3623,3631,3637,3643,3659,3671,3673,3677,3691,3697,3701,3709,3719,3727,3733,3739,3761,3767,3769,3779,3793,3797,3803,3821,3823,3833,3847,3851,3853,3863,3877,3881,3889,3907,3911,3917,3919,3923,3929,3931,3943,3947,3967,3989,4001,4003,4007,4013,4019,4021,4027,4049,4051,4057,4073,4079,4091,4093,4099,4111,4127,4129,4133,4139,4153,4157,4159,4177,4201,4211,4217,4219,4229,4231,4241,4243,4253,4259,4261,4271,4273,4283,4289,4297,4327,4337,4339,4349,4357,4363,4373,4391,4397,4409,4421,4423,4441,4447,4451,4457,4463,4481,4483,4493,4507,4513,4517,4519,4523,4547,4549,4561,4567,4583,4591,4597,4603,4621,4637,4639,4643,4649,4651,4657,4663,4673,4679,4691,4703,4721,4723,4729,4733,4751,4759,4783,4787,4789,4793,4799,4801,4813,4817,4831,4861,4871,4877,4889,4903,4909,4919,4931,4933,4937,4943,4951,4957,4967,4969,4973,4987,4993,4999,5003,5009,5011,5021,5023,5039,5051,5059,5077,5081,5087,5099,5101,5107,5113,5119,5147,5153,5167,5171,5179,5189,5197,5209,5227,5231,5233,5237,5261,5273,5279,5281,5297,5303,5309,5323,5333,5347,5351,5381,5387,5393,5399,5407,5413,5417,5419,5431,5437,5441,5443,5449,5471,5477,5479,5483,5501,5503,5507,5519,5521,5527,5531,5557,5563,5569,5573,5581,5591,5623,5639,5641,5647,5651,5653,5657,5659,5669,5683,5689,5693,5701,5711,5717,5737,5741,5743,5749,5779,5783,5791,5801,5807,5813,5821,5827,5839,5843,5849,5851,5857,5861,5867,5869,5879,5881,5897,5903,5923,5927,5939,5953,5981,5987,6007,6011,6029,6037,6043,6047,6053,6067,6073,6079,6089,6091,6101,6113,6121,6131,6133,6143,6151,6163,6173,6197,6199,6203,6211,6217,6221,6229,6247,6257,6263,6269,6271,6277,6287,6299,6301,6311,6317,6323,6329,6337,6343,6353,6359,6361,6367,6373,6379,6389,6397,6421,6427,6449,6451,6469,6473,6481,6491,6521,6529,6547,6551,6553,6563,6569,6571,6577,6581,6599,6607,6619,6637,6653,6659,6661,6673,6679,6689,6691,6701,6703,6709,6719,6733,6737,6761,6763,6779,6781,6791,6793,6803,6823,6827,6829,6833,6841,6857,6863,6869,6871,6883,6899,6907,6911,6917,6947,6949,6959,6961,6967,6971,6977,6983,6991,6997,7001,7013,7019,7027,7039,7043,7057,7069,7079,7103,7109,7121,7127,7129,7151,7159,7177,7187,7193,72077211,7213,7219,7229,7237,7243,7247,7253,7283,7297,7307,7309,7321,7331,7333,7349,7351,7369,7393,7411,7417,7433,7451,7457,7459,7477,7481,7487,7489,7499,7507,7517,7523,7529,7537,7541,7547,7549,7559,7561,7573,7577,7583,7589,7591,7603,7607,7621,7639,7643,7649,7669,7673,7681,7687,7691,7699,7703,7717,7723,7727,7741,7753,7757,7759,7789,7793,7817,7823,7829,7841,7853,7867,7873,7877,7879,7883,7901,7907,7919],
    /** Factorise n. When n=2^(a1)*3^(a2)*5^(a3)*..., this returns the powers [a1,a2,a3,...]
     *
     * @param {Number} n
     * @returns {Array.<Number>} - exponents of the prime factors of n
     */
    factorise: function(n) {
        if(n<=0) {
            return [];
        }
        var factors = [];
        for(var i=0;i<math.primes.length;i++) {
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
    /** Sum the elements in the given list
     *
     * @param {Array.<Number>} list
     * @returns {Number}
     */
    sum: function(list) {
        var total = 0;
        var l = list.length;
        if(l==0) {
            return 0;
        }
        for(var i=0;i<l;i++) {
            total = math.add(total,list[i]);
        }
        return total;
    }
};
math.gcf = math.gcd;
var add = math.add, sub = math.sub, mul = math.mul, div = math.div, eq = math.eq, neq = math.neq, negate = math.negate;
/** A list of a vector's components.
 * @typedef vector
 *  @type {Array.<Number>}
 */
/** Vector operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeros in when pairs of vectors don't line up exactly
 * @namespace Numbas.vectormath
 */
var vectormath = Numbas.vectormath = {
    /** Negate a vector - negate each of its components
     * @param {vector} v
     * @returns {vector}
     */
    negate: function(v) {
        return v.map(function(x) { return negate(x); });
    },
    /** Add two vectors
     * @param {vector} a
     * @param {vector} b
     * @returns {vector}
     */
    add: function(a,b) {
        if(b.length>a.length)
        {
            var c = b;
            b = a;
            a = c;
        }
        return a.map(function(x,i){ return add(x,b[i]||0) });
    },
    /** Subtract one vector from another
     * @param {vector} a
     * @param {vector} b
     * @returns {vector}
     */
    sub: function(a,b) {
        if(b.length>a.length)
        {
            return b.map(function(x,i){ return sub(a[i]||0,x) });
        }
        else
        {
            return a.map(function(x,i){ return sub(x,b[i]||0) });
        }
    },
    /** Multiply by a scalar
     * @param {Number} k
     * @param {vector} v
     * @returns {vector}
     */
    mul: function(k,v) {
        return v.map(function(x){ return mul(k,x) });
    },
    /** Divide by a scalar
     * @param {vector} v
     * @param {Number} k
     * @returns {vector}
     */
    div: function(v,k) {
        return v.map(function(x){ return div(x,k); });
    },
    /** Vector dot product - each argument can be a vector, or a matrix with one row or one column, which is converted to a vector.
     * @param {vector|matrix} a
     * @param {vector|matrix} b
     * @returns {Number}
     * @throws {Numbas.Error} "vectormaths.dot.matrix too big" if either of `a` or `b` is bigger than `1xN` or `Nx1`.
     */
    dot: function(a,b) {
        //check if A is a matrix object. If it's the right shape, we can use it anyway
        if('rows' in a)
        {
            if(a.rows==1)
                a = a[0];
            else if(a.columns==1)
                a = a.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
        }
        //Same check for B
        if('rows' in b)
        {
            if(b.rows==1)
                b = b[0];
            else if(b.columns==1)
                b = b.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
        }
        if(b.length>a.length)
        {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s,x,i){ return add(s,mul(x,b[i]||0)) },0);
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
    cross: function(a,b) {
        //check if A is a matrix object. If it's the right shape, we can use it anyway
        if('rows' in a)
        {
            if(a.rows==1)
                a = a[0];
            else if(a.columns==1)
                a = a.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
        }
        //Same check for B
        if('rows' in b)
        {
            if(b.rows==1)
                b = b[0];
            else if(b.columns==1)
                b = b.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
        }
        if(a.length!=3 || b.length!=3)
            throw(new Numbas.Error('vectormath.cross.not 3d'));
        return [
                sub( mul(a[1],b[2]), mul(a[2],b[1]) ),
                sub( mul(a[2],b[0]), mul(a[0],b[2]) ),
                sub( mul(a[0],b[1]), mul(a[1],b[0]) )
                ];
    },
    /** Length of a vector, squared
     * @param {vector} a
     * @returns {Number}
     */
    abs_squared: function(a) {
        return a.reduce(function(s,x){ return s + mul(x,x); },0);
    },
    /** Length of a vector
     * @param {vector} a
     * @returns {Number}
     */
    abs: function(a) {
        return Math.sqrt( a.reduce(function(s,x){ return s + mul(x,x); },0) );
    },
    /** Angle between vectors a and b, in radians, or 0 if either vector has length 0.
     * @param {vector} a
     * @param {vector} b
     * @returns {Number}
     */
    angle: function(a,b) {
        var dot = vectormath.dot(a,b);
        var da = vectormath.abs_squared(a);
        var db = vectormath.abs_squared(b);
        if(da*db==0) {
            return 0;
        }
        var d = Math.sqrt(da*db);
        return math.arccos(dot/d);
    },
    /** Are two vectors equal? True if each pair of corresponding components is equal.
     * @param {vector} a
     * @param {vector} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        if(b.length>a.length)
        {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s,x,i){return s && eq(x,b[i]||0)},true);
    },
    /** Are two vectors unequal?
     * @param {vector} a
     * @param {vector} b
     * @returns {Boolean}
     * @see Numbas.vectormath.eq
     */
    neq: function(a,b) {
        return !vectormath.eq(a,b);
    },
    /** Multiply a vector on the left by a matrix
     * @param {matrix} m
     * @param {vector} v
     * @returns {vector}
     */
    matrixmul: function(m,v) {
        return m.map(function(row){
            return row.reduce(function(s,x,i){ return add(s,mul(x,v[i]||0)); },0);
        });
    },
    /** Multiply a vector on the right by a matrix.
     * The vector is considered as a column vector.
     * @param {vector} v
     * @param {matrix} m
     * @returns {vector}
     */
    vectormatrixmul: function(v,m) {
        var out = [];
        for(var i=0;i<m.columns;i++) {
            out.push(v.reduce(function(s,x,j){ var c = j<m.rows ? (m[j][i]||0) : 0; return add(s,mul(x,c)); },0));
        }
        return out;
    },
    /** Apply given function to each element
     * @param {vector}
     * @param {function}
     * @returns {vector}
     */
    map: function(v,fn) {
        return v.map(fn);
    },
    /** Round each element to given number of decimal places
     * @param {vector}
     * @param {Number} - number of decimal places
     * @returns {vector}
     */
    precround: function(v,dp) {
        return vectormath.map(v,function(n){return math.precround(n,dp);});
    },
    /** Round each element to given number of significant figures
     * @param {vector}
     * @param {Number} - number of decimal places
     * @returns {vector}
     */
    siground: function(v,sf) {
        return vectormath.map(v,function(n){return math.siground(n,sf);});
    },
    /** Transpose of a vector
     * @param {vector} v
     * @returns {matrix}
     */
    transpose: function(v) {
        var matrix = [v.slice()];
        matrix.rows = 1;
        matrix.columns = v.length;
        return matrix;
    },
    /** Convert a vector to a 1-column matrix
     * @param {vector} v
     * @returns {matrix}
     */
    toMatrix: function(v) {
        var m = v.map(function(n){return [n]});
        m.rows = m.length;
        m.columns = 1;
        return m;
    }
}
/** A two-dimensional matrix: an array of rows, each of which is an array of numbers.
 * @typedef matrix
 * @type {Array.<Array.<Number>>}
 * @property {Number} rows - The number of rows in the matrix
 * @property {Number} columns - The number of columns in the matrix
 */
/** Matrix operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeros in when pairs of matrices don't line up exactly
 * @namespace Numbas.matrixmath
 */
var matrixmath = Numbas.matrixmath = {
    /** Negate a matrix - negate each of its elements */
    negate: function(m) {
        var matrix = [];
        for(var i=0;i<m.rows;i++) {
            matrix.push(m[i].map(function(x){ return negate(x) }));
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
    add: function(a,b) {
        var rows = Math.max(a.rows,b.rows);
        var columns = Math.max(a.columns,b.columns);
        var matrix = [];
        for(var i=0;i<rows;i++)
        {
            var row = [];
            matrix.push(row);
            for(var j=0;j<columns;j++)
            {
                row[j] = add(a[i][j]||0,b[i][j]||0);
            }
        }
        matrix.rows = rows;
        matrix.columns = columns;
        return matrix;
    },
    /** Subtract one matrix from another
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     */
    sub: function(a,b) {
        var rows = Math.max(a.rows,b.rows);
        var columns = Math.max(a.columns,b.columns);
        var matrix = [];
        for(var i=0;i<rows;i++)
        {
            var row = [];
            matrix.push(row);
            for(var j=0;j<columns;j++)
            {
                row[j] = sub(a[i][j]||0,b[i][j]||0);
            }
        }
        matrix.rows = rows;
        matrix.columns = columns;
        return matrix;
    },
    /** Matrix determinant. Only works up to 3x3 matrices.
     * @param {matrix} m
     * @returns {Number}
     * @throws {Numbas.Error} "matrixmath.abs.too big" if the matrix has more than 3 rows.
     */
    abs: function(m) {
        if(m.rows!=m.columns)
            throw(new Numbas.Error('matrixmath.abs.non-square'));
        //abstraction failure!
        switch(m.rows)
        {
        case 1:
            return m[0][0];
        case 2:
            return sub( mul(m[0][0],m[1][1]), mul(m[0][1],m[1][0]) );
        case 3:
            return add( sub(
                            mul(m[0][0],sub(mul(m[1][1],m[2][2]),mul(m[1][2],m[2][1]))),
                            mul(m[0][1],sub(mul(m[1][0],m[2][2]),mul(m[1][2],m[2][0])))
                        ),
                        mul(m[0][2],sub(mul(m[1][0],m[2][1]),mul(m[1][1],m[2][0])))
                    );
        default:
            throw(new Numbas.Error('matrixmath.abs.too big'));
        }
    },
    /** Multiply a matrix by a scalar
     * @param {Number} k
     * @param {matrix} m
     * @returns {matrix}
     */
    scalarmul: function(k,m) {
        var out = m.map(function(row){ return row.map(function(x){ return mul(k,x); }); });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Divide a matrix by a scalar
     * @param {matrix} m
     * @param {Number} k
     * @returns {matrix}
     */
    scalardiv: function(m,k) {
        var out = m.map(function(row){ return row.map(function(x){ return div(x,k); }); });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Multiply two matrices
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     * @throws {Numbas.Error} "matrixmath.mul.different sizes" if `a` doesn't have as many columns as `b` has rows.
     */
    mul: function(a,b) {
        if(a.columns!=b.rows)
            throw(new Numbas.Error('matrixmath.mul.different sizes'));
        var out = [];
        out.rows = a.rows;
        out.columns = b.columns;
        for(var i=0;i<a.rows;i++)
        {
            var row = [];
            out.push(row);
            for(var j=0;j<b.columns;j++)
            {
                var s = 0;
                for(var k=0;k<a.columns;k++)
                {
                    s = add(s,mul(a[i][k],b[k][j]));
                }
                row.push(s);
            }
        }
        return out;
    },
    /** Are two matrices equal? True if each pair of corresponding elements is equal.
     * @param {matrix} a
     * @param {matrix} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        var rows = Math.max(a.rows,b.rows);
        var columns = Math.max(a.columns,b.columns);
        for(var i=0;i<rows;i++)
        {
            var rowA = a[i] || [];
            var rowB = b[i] || [];
            for(var j=0;j<columns;j++)
            {
                if(!eq(rowA[j]||0,rowB[j]||0))
                    return false;
            }
        }
        return true;
    },
    /** Are two matrices unequal?
     * @param {matrix} a
     * @param {matrix} b
     * @returns {Boolean}
     * @see Numbas.matrixmath.eq
     */
    neq: function(a,b) {
        return !matrixmath.eq(a,b);
    },
    /** Make an `NxN` identity matrix.
     * @param {Number} n
     * @returns {matrix}
     */
    id: function(n) {
        var out = [];
        out.rows = out.columns = n;
        for(var i=0;i<n;i++)
        {
            var row = [];
            out.push(row);
            for(var j=0;j<n;j++)
                row.push(j==i ? 1 : 0);
        }
        return out;
    },
    /** Matrix transpose
     * @param {matrix}
     * @returns {matrix}
     */
    transpose: function(m) {
        var out = [];
        out.rows = m.columns;
        out.columns = m.rows;
        for(var i=0;i<m.columns;i++)
        {
            var row = [];
            out.push(row);
            for(var j=0;j<m.rows;j++)
            {
                row.push(m[j][i]||0);
            }
        }
        return out;
    },
    /** Apply given function to each element
     * @param {matrix}
     * @param {function}
     * @returns {matrix}
     */
    map: function(m,fn) {
        var out = m.map(function(row){
            return row.map(fn);
        });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Round each element to given number of decimal places
     * @param {matrix}
     * @param {Number} - number of decimal places
     * @returns {matrix}
     */
    precround: function(m,dp) {
        return matrixmath.map(m,function(n){return math.precround(n,dp);});
    },
    /** Round each element to given number of significant figures
     * @param {matrix}
     * @param {Number} - number of decimal places
     * @returns {matrix}
     */
    siground: function(m,sf) {
        return matrixmath.map(m,function(n){return math.siground(n,sf);});
    }
}
/** A set of objects: no item occurs more than once.
 * @typedef set
 * @type Array
 */
/** Set operations.
 *
 * @namespace Numbas.setmath
 */
var setmath = Numbas.setmath = {
    /** Does the set contain the given element?
     * @param {set} set
     * @param element
     * @returns {Boolean}
     */
    contains: function(set,element) {
        for(var i=0,l=set.length;i<l;i++) {
            if(Numbas.util.eq(set[i],element)) {
                return true;
            }
        }
    },
    /** Union of two sets
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    union: function(a,b) {
        var out = a.slice();
        for(var i=0,l=b.length;i<l;i++) {
            if(!setmath.contains(a,b[i])) {
                out.push(b[i]);
            }
        }
        return out;
    },
    /** Intersection of two sets
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    intersection: function(a,b) {
        return a.filter(function(v) {
            return setmath.contains(b,v);
        });
    },
    /** Are two sets equal? Yes if a,b and (a intersect b) all have the same length
     * @param {set} a
     * @param {set} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        return a.length==b.length && setmath.intersection(a,b).length==a.length;
    },
    /** Set minus - remove b's elements from a
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    minus: function(a,b) {
        return a.filter(function(v){ return !setmath.contains(b,v); });
    },
    /** Size of a set
     * @param {set} set
     * @returns {Number}
     */
    size: function(set) {
        return set.length;
    }
}
});

Numbas.queueScript('i18next',[],function(module) {
        var exports = {};
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):t.i18next=e()}(this,function(){"use strict";function t(t){return null==t?"":""+t}function e(t,e,n){t.forEach(function(t){e[t]&&(n[t]=e[t])})}function n(t,e,n){function o(t){return t&&t.indexOf("###")>-1?t.replace(/###/g,"."):t}function r(){return!t||"string"==typeof t}for(var i="string"!=typeof e?[].concat(e):e.split(".");i.length>1;){if(r())return{};var a=o(i.shift());!t[a]&&n&&(t[a]=new n),t=t[a]}return r()?{}:{obj:t,k:o(i.shift())}}function o(t,e,o){var r=n(t,e,Object),i=r.obj,a=r.k;i[a]=o}function r(t,e,o,r){var i=n(t,e,Object),a=i.obj,s=i.k;a[s]=a[s]||[],r&&(a[s]=a[s].concat(o)),r||a[s].push(o)}function i(t,e){var o=n(t,e),r=o.obj,i=o.k;if(r)return r[i]}function a(t,e,n){for(var o in e)o in t?"string"==typeof t[o]||t[o]instanceof String||"string"==typeof e[o]||e[o]instanceof String?n&&(t[o]=e[o]):a(t[o],e[o],n):t[o]=e[o];return t}function s(t){return t.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&")}function l(t){return"string"==typeof t?t.replace(/[&<>"'\/]/g,function(t){return E[t]}):t}function u(t){return t.interpolation={unescapeSuffix:"HTML"},t.interpolation.prefix=t.interpolationPrefix||"__",t.interpolation.suffix=t.interpolationSuffix||"__",t.interpolation.escapeValue=t.escapeInterpolation||!1,t.interpolation.nestingPrefix=t.reusePrefix||"$t(",t.interpolation.nestingSuffix=t.reuseSuffix||")",t}function c(t){return t.resStore&&(t.resources=t.resStore),t.ns&&t.ns.defaultNs?(t.defaultNS=t.ns.defaultNs,t.ns=t.ns.namespaces):t.defaultNS=t.ns||"translation",t.fallbackToDefaultNS&&t.defaultNS&&(t.fallbackNS=t.defaultNS),t.saveMissing=t.sendMissing,t.saveMissingTo=t.sendMissingTo||"current",t.returnNull=!t.fallbackOnNull,t.returnEmptyString=!t.fallbackOnEmpty,t.returnObjects=t.returnObjectTrees,t.joinArrays="\n",t.returnedObjectHandler=t.objectTreeKeyHandler,t.parseMissingKeyHandler=t.parseMissingKey,t.appendNamespaceToMissingKey=!0,t.nsSeparator=t.nsseparator||":",t.keySeparator=t.keyseparator||".","sprintf"===t.shortcutFunction&&(t.overloadTranslationOptionHandler=function(t){for(var e=[],n=1;n<t.length;n++)e.push(t[n]);return{postProcess:"sprintf",sprintf:e}}),t.whitelist=t.lngWhitelist,t.preload=t.preload,"current"===t.load&&(t.load="currentOnly"),"unspecific"===t.load&&(t.load="languageOnly"),t.backend=t.backend||{},t.backend.loadPath=t.resGetPath||"locales/__lng__/__ns__.json",t.backend.addPath=t.resPostPath||"locales/add/__lng__/__ns__",t.backend.allowMultiLoading=t.dynamicLoad,t.cache=t.cache||{},t.cache.prefix="res_",t.cache.expirationTime=6048e5,t.cache.enabled=t.useLocalStorage,t=u(t),t.defaultVariables&&(t.interpolation.defaultVariables=t.defaultVariables),t}function p(t){return t=u(t),t.joinArrays="\n",t}function f(t){return(t.interpolationPrefix||t.interpolationSuffix||void 0!==t.escapeInterpolation)&&(t=u(t)),t.nsSeparator=t.nsseparator,t.keySeparator=t.keyseparator,t.returnObjects=t.returnObjectTrees,t}function g(t){t.lng=function(){return C.deprecate("i18next.lng() can be replaced by i18next.language for detected language or i18next.languages for languages ordered by translation lookup."),t.services.languageUtils.toResolveHierarchy(t.language)[0]},t.preload=function(e,n){C.deprecate("i18next.preload() can be replaced with i18next.loadLanguages()"),t.loadLanguages(e,n)},t.setLng=function(e,n,o){return C.deprecate("i18next.setLng() can be replaced with i18next.changeLanguage() or i18next.getFixedT() to get a translation function with fixed language or namespace."),"function"==typeof n&&(o=n,n={}),n||(n={}),n.fixLng===!0&&o?o(null,t.getFixedT(e)):t.changeLanguage(e,o)},t.addPostProcessor=function(e,n){C.deprecate("i18next.addPostProcessor() can be replaced by i18next.use({ type: 'postProcessor', name: 'name', process: fc })"),t.use({type:"postProcessor",name:e,process:n})}}function h(t){return t.charAt(0).toUpperCase()+t.slice(1)}function d(){var t={};return H.forEach(function(e){e.lngs.forEach(function(n){t[n]={numbers:e.nr,plurals:U[e.fc]}})}),t}function y(t,e){for(var n=t.indexOf(e);n!==-1;)t.splice(n,1),n=t.indexOf(e)}function v(){return{debug:!1,initImmediate:!0,ns:["translation"],defaultNS:["translation"],fallbackLng:["dev"],fallbackNS:!1,whitelist:!1,nonExplicitWhitelist:!1,load:"all",preload:!1,simplifyPluralSuffix:!0,keySeparator:".",nsSeparator:":",pluralSeparator:"_",contextSeparator:"_",saveMissing:!1,saveMissingTo:"fallback",missingKeyHandler:!1,postProcess:!1,returnNull:!0,returnEmptyString:!0,returnObjects:!1,joinArrays:!1,returnedObjectHandler:function(){},parseMissingKeyHandler:!1,appendNamespaceToMissingKey:!1,appendNamespaceToCIMode:!1,overloadTranslationOptionHandler:function(t){return{defaultValue:t[1]}},interpolation:{escapeValue:!0,format:function(t,e,n){return t},prefix:"{{",suffix:"}}",formatSeparator:",",unescapePrefix:"-",nestingPrefix:"$t(",nestingSuffix:")",defaultVariables:void 0}}}function b(t){return"string"==typeof t.ns&&(t.ns=[t.ns]),"string"==typeof t.fallbackLng&&(t.fallbackLng=[t.fallbackLng]),"string"==typeof t.fallbackNS&&(t.fallbackNS=[t.fallbackNS]),t.whitelist&&t.whitelist.indexOf("cimode")<0&&t.whitelist.push("cimode"),t}function m(){}var x="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},S=function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")},k=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o])}return t},w=function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)},O=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e},L=function(){function t(t,e){var n=[],o=!0,r=!1,i=void 0;try{for(var a,s=t[Symbol.iterator]();!(o=(a=s.next()).done)&&(n.push(a.value),!e||n.length!==e);o=!0);}catch(t){r=!0,i=t}finally{try{!o&&s.return&&s.return()}finally{if(r)throw i}}return n}return function(e,n){if(Array.isArray(e))return e;if(Symbol.iterator in Object(e))return t(e,n);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}(),j=function(t){if(Array.isArray(t)){for(var e=0,n=Array(t.length);e<t.length;e++)n[e]=t[e];return n}return Array.from(t)},N={type:"logger",log:function(t){this.output("log",t)},warn:function(t){this.output("warn",t)},error:function(t){this.output("error",t)},output:function(t,e){var n;console&&console[t]&&(n=console)[t].apply(n,j(e))}},P=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};S(this,t),this.init(e,n)}return t.prototype.init=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};this.prefix=e.prefix||"i18next:",this.logger=t||N,this.options=e,this.debug=e.debug},t.prototype.setDebug=function(t){this.debug=t},t.prototype.log=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"log","",!0)},t.prototype.warn=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"warn","",!0)},t.prototype.error=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"error","")},t.prototype.deprecate=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"warn","WARNING DEPRECATED: ",!0)},t.prototype.forward=function(t,e,n,o){return o&&!this.debug?null:("string"==typeof t[0]&&(t[0]=""+n+this.prefix+" "+t[0]),this.logger[e](t))},t.prototype.create=function(e){return new t(this.logger,k({prefix:this.prefix+":"+e+":"},this.options))},t}(),C=new P,R=function(){function t(){S(this,t),this.observers={}}return t.prototype.on=function(t,e){var n=this;t.split(" ").forEach(function(t){n.observers[t]=n.observers[t]||[],n.observers[t].push(e)})},t.prototype.off=function(t,e){var n=this;this.observers[t]&&this.observers[t].forEach(function(){if(e){var o=n.observers[t].indexOf(e);o>-1&&n.observers[t].splice(o,1)}else delete n.observers[t]})},t.prototype.emit=function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),o=1;o<e;o++)n[o-1]=arguments[o];if(this.observers[t]){var r=[].concat(this.observers[t]);r.forEach(function(t){t.apply(void 0,n)})}if(this.observers["*"]){var i=[].concat(this.observers["*"]);i.forEach(function(e){var o;e.apply(e,(o=[t]).concat.apply(o,n))})}},t}(),E={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;"},A=function(t){function e(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{ns:["translation"],defaultNS:"translation"};S(this,e);var r=O(this,t.call(this));return r.data=n,r.options=o,r}return w(e,t),e.prototype.addNamespaces=function(t){this.options.ns.indexOf(t)<0&&this.options.ns.push(t)},e.prototype.removeNamespaces=function(t){var e=this.options.ns.indexOf(t);e>-1&&this.options.ns.splice(e,1)},e.prototype.getResource=function(t,e,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},r=o.keySeparator||this.options.keySeparator;void 0===r&&(r=".");var a=[t,e];return n&&"string"!=typeof n&&(a=a.concat(n)),n&&"string"==typeof n&&(a=a.concat(r?n.split(r):n)),t.indexOf(".")>-1&&(a=t.split(".")),i(this.data,a)},e.prototype.addResource=function(t,e,n,r){var i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{silent:!1},a=this.options.keySeparator;void 0===a&&(a=".");var s=[t,e];n&&(s=s.concat(a?n.split(a):n)),t.indexOf(".")>-1&&(s=t.split("."),r=e,e=s[1]),this.addNamespaces(e),o(this.data,s,r),i.silent||this.emit("added",t,e,n,r)},e.prototype.addResources=function(t,e,n){for(var o in n)"string"==typeof n[o]&&this.addResource(t,e,o,n[o],{silent:!0});this.emit("added",t,e,n)},e.prototype.addResourceBundle=function(t,e,n,r,s){var l=[t,e];t.indexOf(".")>-1&&(l=t.split("."),r=n,n=e,e=l[1]),this.addNamespaces(e);var u=i(this.data,l)||{};r?a(u,n,s):u=k({},u,n),o(this.data,l,u),this.emit("added",t,e,n)},e.prototype.removeResourceBundle=function(t,e){this.hasResourceBundle(t,e)&&delete this.data[t][e],this.removeNamespaces(e),this.emit("removed",t,e)},e.prototype.hasResourceBundle=function(t,e){return void 0!==this.getResource(t,e)},e.prototype.getResourceBundle=function(t,e){return e||(e=this.options.defaultNS),"v1"===this.options.compatibilityAPI?k({},this.getResource(t,e)):this.getResource(t,e)},e.prototype.toJSON=function(){return this.data},e}(R),T={processors:{},addPostProcessor:function(t){this.processors[t.name]=t},handle:function(t,e,n,o,r){var i=this;return t.forEach(function(t){i.processors[t]&&(e=i.processors[t].process(e,n,o,r))}),e}},M=function(t){function n(o){var r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};S(this,n);var i=O(this,t.call(this));return e(["resourceStore","languageUtils","pluralResolver","interpolator","backendConnector"],o,i),i.options=r,i.logger=C.create("translator"),i}return w(n,t),n.prototype.changeLanguage=function(t){t&&(this.language=t)},n.prototype.exists=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{interpolation:{}};return"v1"===this.options.compatibilityAPI&&(e=f(e)),void 0!==this.resolve(t,e)},n.prototype.extractFromKey=function(t,e){var n=e.nsSeparator||this.options.nsSeparator;void 0===n&&(n=":");var o=e.keySeparator||this.options.keySeparator||".",r=e.ns||this.options.defaultNS;if(n&&t.indexOf(n)>-1){var i=t.split(n);(n!==o||n===o&&this.options.ns.indexOf(i[0])>-1)&&(r=i.shift()),t=i.join(o)}return"string"==typeof r&&(r=[r]),{key:t,namespaces:r}},n.prototype.translate=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if("object"!==("undefined"==typeof e?"undefined":x(e))?e=this.options.overloadTranslationOptionHandler(arguments):"v1"===this.options.compatibilityAPI&&(e=f(e)),void 0===t||null===t||""===t)return"";"number"==typeof t&&(t=String(t)),"string"==typeof t&&(t=[t]);var n=e.keySeparator||this.options.keySeparator||".",o=this.extractFromKey(t[t.length-1],e),r=o.key,i=o.namespaces,a=i[i.length-1],s=e.lng||this.language,l=e.appendNamespaceToCIMode||this.options.appendNamespaceToCIMode;if(s&&"cimode"===s.toLowerCase()){if(l){var u=e.nsSeparator||this.options.nsSeparator;return a+u+r}return r}var c=this.resolve(t,e),p=Object.prototype.toString.apply(c),g=["[object Number]","[object Function]","[object RegExp]"],h=void 0!==e.joinArrays?e.joinArrays:this.options.joinArrays;if(c&&"string"!=typeof c&&g.indexOf(p)<0&&(!h||"[object Array]"!==p)){if(!e.returnObjects&&!this.options.returnObjects)return this.logger.warn("accessing an object - but returnObjects options is not enabled!"),this.options.returnedObjectHandler?this.options.returnedObjectHandler(r,c,e):"key '"+r+" ("+this.language+")' returned an object instead of string.";if(e.keySeparator||this.options.keySeparator){var d="[object Array]"===p?[]:{};for(var y in c)Object.prototype.hasOwnProperty.call(c,y)&&(d[y]=this.translate(""+r+n+y,k({},e,{joinArrays:!1,ns:i})));c=d}}else if(h&&"[object Array]"===p)c=c.join(h),c&&(c=this.extendTranslation(c,r,e));else{var v=!1,b=!1;if(this.isValidLookup(c)||void 0===e.defaultValue||(v=!0,c=e.defaultValue),this.isValidLookup(c)||(b=!0,c=r),b||v){this.logger.log("missingKey",s,a,r,c);var m=[],S=this.languageUtils.getFallbackCodes(this.options.fallbackLng,e.lng||this.language);if("fallback"===this.options.saveMissingTo&&S&&S[0])for(var w=0;w<S.length;w++)m.push(S[w]);else"all"===this.options.saveMissingTo?m=this.languageUtils.toResolveHierarchy(e.lng||this.language):m.push(e.lng||this.language);this.options.saveMissing&&(this.options.missingKeyHandler?this.options.missingKeyHandler(m,a,r,c):this.backendConnector&&this.backendConnector.saveMissing&&this.backendConnector.saveMissing(m,a,r,c)),this.emit("missingKey",m,a,r,c)}c=this.extendTranslation(c,r,e),b&&c===r&&this.options.appendNamespaceToMissingKey&&(c=a+":"+r),b&&this.options.parseMissingKeyHandler&&(c=this.options.parseMissingKeyHandler(c))}return c},n.prototype.extendTranslation=function(t,e,n){var o=this;n.interpolation&&this.interpolator.init(k({},n,{interpolation:k({},this.options.interpolation,n.interpolation)}));var r=n.replace&&"string"!=typeof n.replace?n.replace:n;this.options.interpolation.defaultVariables&&(r=k({},this.options.interpolation.defaultVariables,r)),t=this.interpolator.interpolate(t,r,n.lng||this.language),n.nest!==!1&&(t=this.interpolator.nest(t,function(){return o.translate.apply(o,arguments)},n)),n.interpolation&&this.interpolator.reset();var i=n.postProcess||this.options.postProcess,a="string"==typeof i?[i]:i;return void 0!==t&&a&&a.length&&n.applyPostProcessor!==!1&&(t=T.handle(a,t,e,n,this)),t},n.prototype.resolve=function(t){var e=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},o=void 0;return"string"==typeof t&&(t=[t]),t.forEach(function(t){if(!e.isValidLookup(o)){var r=e.extractFromKey(t,n),i=r.key,a=r.namespaces;e.options.fallbackNS&&(a=a.concat(e.options.fallbackNS));var s=void 0!==n.count&&"string"!=typeof n.count,l=void 0!==n.context&&"string"==typeof n.context&&""!==n.context,u=n.lngs?n.lngs:e.languageUtils.toResolveHierarchy(n.lng||e.language);a.forEach(function(t){e.isValidLookup(o)||u.forEach(function(r){if(!e.isValidLookup(o)){var a=i,u=[a],c=void 0;s&&(c=e.pluralResolver.getSuffix(r,n.count)),s&&l&&u.push(a+c),l&&u.push(a+=""+e.options.contextSeparator+n.context),s&&u.push(a+=c);for(var p=void 0;p=u.pop();)e.isValidLookup(o)||(o=e.getResource(r,t,p,n))}})})}}),o},n.prototype.isValidLookup=function(t){return!(void 0===t||!this.options.returnNull&&null===t||!this.options.returnEmptyString&&""===t)},n.prototype.getResource=function(t,e,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};return this.resourceStore.getResource(t,e,n,o)},n}(R),_=function(){function t(e){S(this,t),this.options=e,this.whitelist=this.options.whitelist||!1,this.logger=C.create("languageUtils")}return t.prototype.getScriptPartFromCode=function(t){if(!t||t.indexOf("-")<0)return null;var e=t.split("-");return 2===e.length?null:(e.pop(),this.formatLanguageCode(e.join("-")))},t.prototype.getLanguagePartFromCode=function(t){if(!t||t.indexOf("-")<0)return t;var e=t.split("-");return this.formatLanguageCode(e[0])},t.prototype.formatLanguageCode=function(t){if("string"==typeof t&&t.indexOf("-")>-1){var e=["hans","hant","latn","cyrl","cans","mong","arab"],n=t.split("-");return this.options.lowerCaseLng?n=n.map(function(t){return t.toLowerCase()}):2===n.length?(n[0]=n[0].toLowerCase(),n[1]=n[1].toUpperCase(),e.indexOf(n[1].toLowerCase())>-1&&(n[1]=h(n[1].toLowerCase()))):3===n.length&&(n[0]=n[0].toLowerCase(),2===n[1].length&&(n[1]=n[1].toUpperCase()),"sgn"!==n[0]&&2===n[2].length&&(n[2]=n[2].toUpperCase()),e.indexOf(n[1].toLowerCase())>-1&&(n[1]=h(n[1].toLowerCase())),e.indexOf(n[2].toLowerCase())>-1&&(n[2]=h(n[2].toLowerCase()))),n.join("-")}return this.options.cleanCode||this.options.lowerCaseLng?t.toLowerCase():t},t.prototype.isWhitelisted=function(t){return("languageOnly"===this.options.load||this.options.nonExplicitWhitelist)&&(t=this.getLanguagePartFromCode(t)),!this.whitelist||!this.whitelist.length||this.whitelist.indexOf(t)>-1},t.prototype.getFallbackCodes=function(t,e){if(!t)return[];if("string"==typeof t&&(t=[t]),"[object Array]"===Object.prototype.toString.apply(t))return t;if(!e)return t.default||[];var n=t[e];return n||(n=t[this.getScriptPartFromCode(e)]),n||(n=t[this.formatLanguageCode(e)]),n||(n=t.default),n||[]},t.prototype.toResolveHierarchy=function(t,e){var n=this,o=this.getFallbackCodes(e||this.options.fallbackLng||[],t),r=[],i=function(t){t&&(n.isWhitelisted(t)?r.push(t):n.logger.warn("rejecting non-whitelisted language code: "+t))};return"string"==typeof t&&t.indexOf("-")>-1?("languageOnly"!==this.options.load&&i(this.formatLanguageCode(t)),"languageOnly"!==this.options.load&&"currentOnly"!==this.options.load&&i(this.getScriptPartFromCode(t)),"currentOnly"!==this.options.load&&i(this.getLanguagePartFromCode(t))):"string"==typeof t&&i(this.formatLanguageCode(t)),o.forEach(function(t){r.indexOf(t)<0&&i(n.formatLanguageCode(t))}),r},t}(),H=[{lngs:["ach","ak","am","arn","br","fil","gun","ln","mfe","mg","mi","oc","tg","ti","tr","uz","wa"],nr:[1,2],fc:1},{lngs:["af","an","ast","az","bg","bn","ca","da","de","dev","el","en","eo","es","es_ar","et","eu","fi","fo","fur","fy","gl","gu","ha","he","hi","hu","hy","ia","it","kn","ku","lb","mai","ml","mn","mr","nah","nap","nb","ne","nl","nn","no","nso","pa","pap","pms","ps","pt","pt_br","rm","sco","se","si","so","son","sq","sv","sw","ta","te","tk","ur","yo"],nr:[1,2],fc:2},{lngs:["ay","bo","cgg","fa","id","ja","jbo","ka","kk","km","ko","ky","lo","ms","sah","su","th","tt","ug","vi","wo","zh"],nr:[1],fc:3},{lngs:["be","bs","dz","hr","ru","sr","uk"],nr:[1,2,5],fc:4},{lngs:["ar"],nr:[0,1,2,3,11,100],fc:5},{lngs:["cs","sk"],nr:[1,2,5],fc:6},{lngs:["csb","pl"],nr:[1,2,5],fc:7},{lngs:["cy"],nr:[1,2,3,8],fc:8},{lngs:["fr"],nr:[1,2],fc:9},{lngs:["ga"],nr:[1,2,3,7,11],fc:10},{lngs:["gd"],nr:[1,2,3,20],fc:11},{lngs:["is"],nr:[1,2],fc:12},{lngs:["jv"],nr:[0,1],fc:13},{lngs:["kw"],nr:[1,2,3,4],fc:14},{lngs:["lt"],nr:[1,2,10],fc:15},{lngs:["lv"],nr:[1,2,0],fc:16},{lngs:["mk"],nr:[1,2],fc:17},{lngs:["mnk"],nr:[0,1,2],fc:18},{lngs:["mt"],nr:[1,2,11,20],fc:19},{lngs:["or"],nr:[2,1],fc:2},{lngs:["ro"],nr:[1,2,20],fc:20},{lngs:["sl"],nr:[5,1,2,3],fc:21}],U={1:function(t){return Number(t>1)},2:function(t){return Number(1!=t)},3:function(t){return 0},4:function(t){return Number(t%10==1&&t%100!=11?0:t%10>=2&&t%10<=4&&(t%100<10||t%100>=20)?1:2)},5:function(t){return Number(0===t?0:1==t?1:2==t?2:t%100>=3&&t%100<=10?3:t%100>=11?4:5)},6:function(t){return Number(1==t?0:t>=2&&t<=4?1:2)},7:function(t){return Number(1==t?0:t%10>=2&&t%10<=4&&(t%100<10||t%100>=20)?1:2)},8:function(t){return Number(1==t?0:2==t?1:8!=t&&11!=t?2:3)},9:function(t){return Number(t>=2)},10:function(t){return Number(1==t?0:2==t?1:t<7?2:t<11?3:4)},11:function(t){return Number(1==t||11==t?0:2==t||12==t?1:t>2&&t<20?2:3)},12:function(t){return Number(t%10!=1||t%100==11)},13:function(t){return Number(0!==t)},14:function(t){return Number(1==t?0:2==t?1:3==t?2:3)},15:function(t){return Number(t%10==1&&t%100!=11?0:t%10>=2&&(t%100<10||t%100>=20)?1:2)},16:function(t){return Number(t%10==1&&t%100!=11?0:0!==t?1:2)},17:function(t){return Number(1==t||t%10==1?0:1)},18:function(t){return Number(0==t?0:1==t?1:2)},19:function(t){return Number(1==t?0:0===t||t%100>1&&t%100<11?1:t%100>10&&t%100<20?2:3)},20:function(t){return Number(1==t?0:0===t||t%100>0&&t%100<20?1:2)},21:function(t){return Number(t%100==1?1:t%100==2?2:t%100==3||t%100==4?3:0)}},V=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};S(this,t),this.languageUtils=e,this.options=n,this.logger=C.create("pluralResolver"),this.rules=d()}return t.prototype.addRule=function(t,e){this.rules[t]=e},t.prototype.getRule=function(t){return this.rules[this.languageUtils.getLanguagePartFromCode(t)]},t.prototype.needsPlural=function(t){var e=this.getRule(t);return e&&e.numbers.length>1},t.prototype.getSuffix=function(t,e){var n=this,o=this.getRule(t);if(o){if(1===o.numbers.length)return"";var r=o.noAbs?o.plurals(e):o.plurals(Math.abs(e)),i=o.numbers[r];this.options.simplifyPluralSuffix&&2===o.numbers.length&&1===o.numbers[0]&&(2===i?i="plural":1===i&&(i=""));var a=function(){return n.options.prepend&&i.toString()?n.options.prepend+i.toString():i.toString()};return"v1"===this.options.compatibilityJSON?1===i?"":"number"==typeof i?"_plural_"+i.toString():a():"v2"===this.options.compatibilityJSON||2===o.numbers.length&&1===o.numbers[0]?a():2===o.numbers.length&&1===o.numbers[0]?a():this.options.prepend&&r.toString()?this.options.prepend+r.toString():r.toString()}return this.logger.warn("no plural rule found for: "+t),""},t}(),I=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};S(this,e),this.logger=C.create("interpolator"),this.init(t,!0)}return e.prototype.init=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=arguments[1];e&&(this.options=t,this.format=t.interpolation&&t.interpolation.format||function(t){return t},this.escape=t.interpolation&&t.interpolation.escape||l),t.interpolation||(t.interpolation={escapeValue:!0});var n=t.interpolation;this.escapeValue=void 0===n.escapeValue||n.escapeValue,this.prefix=n.prefix?s(n.prefix):n.prefixEscaped||"{{",this.suffix=n.suffix?s(n.suffix):n.suffixEscaped||"}}",this.formatSeparator=n.formatSeparator?n.formatSeparator:n.formatSeparator||",",this.unescapePrefix=n.unescapeSuffix?"":n.unescapePrefix||"-",this.unescapeSuffix=this.unescapePrefix?"":n.unescapeSuffix||"",this.nestingPrefix=n.nestingPrefix?s(n.nestingPrefix):n.nestingPrefixEscaped||s("$t("),this.nestingSuffix=n.nestingSuffix?s(n.nestingSuffix):n.nestingSuffixEscaped||s(")"),this.resetRegExp()},e.prototype.reset=function(){this.options&&this.init(this.options)},e.prototype.resetRegExp=function(){var t=this.prefix+"(.+?)"+this.suffix;this.regexp=new RegExp(t,"g");var e=""+this.prefix+this.unescapePrefix+"(.+?)"+this.unescapeSuffix+this.suffix;this.regexpUnescape=new RegExp(e,"g");var n=this.nestingPrefix+"(.+?)"+this.nestingSuffix;this.nestingRegexp=new RegExp(n,"g")},e.prototype.interpolate=function(e,n,o){function r(t){return t.replace(/\$/g,"$$$$")}var a=this,s=void 0,l=void 0,u=function(t){if(t.indexOf(a.formatSeparator)<0)return i(n,t);var e=t.split(a.formatSeparator),r=e.shift().trim(),s=e.join(a.formatSeparator).trim();return a.format(i(n,r),s,o)};for(this.resetRegExp();s=this.regexpUnescape.exec(e);)l=u(s[1].trim()),e=e.replace(s[0],l),this.regexpUnescape.lastIndex=0;for(;s=this.regexp.exec(e);)l=u(s[1].trim()),"string"!=typeof l&&(l=t(l)),l||(this.logger.warn("missed to pass in variable "+s[1]+" for interpolating "+e),l=""),l=r(this.escapeValue?this.escape(l):l),e=e.replace(s[0],l),this.regexp.lastIndex=0;return e},e.prototype.nest=function(e,n){function o(t){if(t.indexOf(",")<0)return t;var e=t.split(",");t=e.shift();var n=e.join(",");n=this.interpolate(n,s),n=n.replace(/'/g,'"');try{s=JSON.parse(n)}catch(e){this.logger.error("failed parsing options string in nesting for key "+t,e)}return t}var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},i=void 0,a=void 0,s=k({},r);for(s.applyPostProcessor=!1;i=this.nestingRegexp.exec(e);){if(a=n(o.call(this,i[1].trim()),s),a&&i[0]===e&&"string"!=typeof a)return a;"string"!=typeof a&&(a=t(a)),a||(this.logger.warn("missed to resolve "+i[1]+" for nesting "+e),a=""),e=e.replace(i[0],a),this.regexp.lastIndex=0}return e},e}(),F=function(t){function e(n,o,r){var i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};S(this,e);var a=O(this,t.call(this));return a.backend=n,a.store=o,a.services=r,a.options=i,a.logger=C.create("backendConnector"),a.state={},a.queue=[],a.backend&&a.backend.init&&a.backend.init(r,i.backend,i),a}return w(e,t),e.prototype.queueLoad=function(t,e,n){var o=this,r=[],i=[],a=[],s=[];return t.forEach(function(t){var n=!0;e.forEach(function(e){var a=t+"|"+e;o.store.hasResourceBundle(t,e)?o.state[a]=2:o.state[a]<0||(1===o.state[a]?i.indexOf(a)<0&&i.push(a):(o.state[a]=1,n=!1,i.indexOf(a)<0&&i.push(a),r.indexOf(a)<0&&r.push(a),s.indexOf(e)<0&&s.push(e)))}),n||a.push(t)}),(r.length||i.length)&&this.queue.push({pending:i,loaded:{},errors:[],callback:n}),{toLoad:r,pending:i,toLoadLanguages:a,toLoadNamespaces:s}},e.prototype.loaded=function(t,e,n){var o=this,i=t.split("|"),a=L(i,2),s=a[0],l=a[1];e&&this.emit("failedLoading",s,l,e),n&&this.store.addResourceBundle(s,l,n),this.state[t]=e?-1:2,this.queue.forEach(function(n){r(n.loaded,[s],l),y(n.pending,t),e&&n.errors.push(e),0!==n.pending.length||n.done||(o.emit("loaded",n.loaded),n.done=!0,n.errors.length?n.callback(n.errors):n.callback())}),this.queue=this.queue.filter(function(t){return!t.done})},e.prototype.read=function(t,e,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0,r=this,i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:250,a=arguments[5];return t.length?this.backend[n](t,e,function(s,l){return s&&l&&o<5?void setTimeout(function(){r.read.call(r,t,e,n,o+1,2*i,a)},i):void a(s,l)}):a(null,{})},e.prototype.load=function(t,e,n){var o=this;if(!this.backend)return this.logger.warn("No backend was added via i18next.use. Will not load resources."),n&&n();var r=k({},this.backend.options,this.options.backend);"string"==typeof t&&(t=this.services.languageUtils.toResolveHierarchy(t)),"string"==typeof e&&(e=[e]);var a=this.queueLoad(t,e,n);return a.toLoad.length?void(r.allowMultiLoading&&this.backend.readMulti?this.read(a.toLoadLanguages,a.toLoadNamespaces,"readMulti",null,null,function(t,e){t&&o.logger.warn("loading namespaces "+a.toLoadNamespaces.join(", ")+" for languages "+a.toLoadLanguages.join(", ")+" via multiloading failed",t),!t&&e&&o.logger.log("successfully loaded namespaces "+a.toLoadNamespaces.join(", ")+" for languages "+a.toLoadLanguages.join(", ")+" via multiloading",e),a.toLoad.forEach(function(n){var r=n.split("|"),a=L(r,2),s=a[0],l=a[1],u=i(e,[s,l]);if(u)o.loaded(n,t,u);else{var c="loading namespace "+l+" for language "+s+" via multiloading failed";o.loaded(n,c),o.logger.error(c)}})}):a.toLoad.forEach(function(t){o.loadOne(t)})):(a.pending.length||n(),null)},e.prototype.reload=function(t,e){var n=this;this.backend||this.logger.warn("No backend was added via i18next.use. Will not load resources.");var o=k({},this.backend.options,this.options.backend);"string"==typeof t&&(t=this.services.languageUtils.toResolveHierarchy(t)),"string"==typeof e&&(e=[e]),o.allowMultiLoading&&this.backend.readMulti?this.read(t,e,"readMulti",null,null,function(o,r){o&&n.logger.warn("reloading namespaces "+e.join(", ")+" for languages "+t.join(", ")+" via multiloading failed",o),!o&&r&&n.logger.log("successfully reloaded namespaces "+e.join(", ")+" for languages "+t.join(", ")+" via multiloading",r),t.forEach(function(t){e.forEach(function(e){var a=i(r,[t,e]);if(a)n.loaded(t+"|"+e,o,a);else{var s="reloading namespace "+e+" for language "+t+" via multiloading failed";n.loaded(t+"|"+e,s),n.logger.error(s)}})})}):t.forEach(function(t){e.forEach(function(e){n.loadOne(t+"|"+e,"re")})})},e.prototype.loadOne=function(t){var e=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"",o=t.split("|"),r=L(o,2),i=r[0],a=r[1];this.read(i,a,"read",null,null,function(o,r){o&&e.logger.warn(n+"loading namespace "+a+" for language "+i+" failed",o),!o&&r&&e.logger.log(n+"loaded namespace "+a+" for language "+i,r),e.loaded(t,o,r)})},e.prototype.saveMissing=function(t,e,n,o){this.backend&&this.backend.create&&this.backend.create(t,e,n,o),t&&t[0]&&this.store.addResource(t[0],e,n,o)},e}(R),D=function(t){function e(n,o,r){var i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};S(this,e);var a=O(this,t.call(this));return a.cache=n,a.store=o,a.services=r,a.options=i,a.logger=C.create("cacheConnector"),a.cache&&a.cache.init&&a.cache.init(r,i.cache,i),a}return w(e,t),e.prototype.load=function(t,e,n){var o=this;if(!this.cache)return n&&n();var r=k({},this.cache.options,this.options.cache),i="string"==typeof t?this.services.languageUtils.toResolveHierarchy(t):t;r.enabled?this.cache.load(i,function(t,e){if(t&&o.logger.error("loading languages "+i.join(", ")+" from cache failed",t),e)for(var r in e)if(Object.prototype.hasOwnProperty.call(e,r))for(var a in e[r])if(Object.prototype.hasOwnProperty.call(e[r],a)&&"i18nStamp"!==a){var s=e[r][a];s&&o.store.addResourceBundle(r,a,s)}n&&n()}):n&&n()},e.prototype.save=function(){this.cache&&this.options.cache&&this.options.cache.enabled&&this.cache.save(this.store.data)},e}(R),K=function(t){function e(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=arguments[1];S(this,e);var r=O(this,t.call(this));if(r.options=b(n),r.services={},r.logger=C,r.modules={external:[]},o&&!r.isInitialized&&!n.isClone){var i;if(!r.options.initImmediate)return i=r.init(n,o),O(r,i);setTimeout(function(){r.init(n,o)},0)}return r}return w(e,t),e.prototype.init=function(t,e){function n(t){return t?"function"==typeof t?new t:t:null}var o=this;if("function"==typeof t&&(e=t,t={}),t||(t={}),"v1"===t.compatibilityAPI?this.options=k({},v(),b(c(t)),{}):"v1"===t.compatibilityJSON?this.options=k({},v(),b(p(t)),{}):this.options=k({},v(),this.options,b(t)),this.format=this.options.interpolation.format,e||(e=m),!this.options.isClone){this.modules.logger?C.init(n(this.modules.logger),this.options):C.init(null,this.options);var r=new _(this.options);this.store=new A(this.options.resources,this.options);var i=this.services;i.logger=C,i.resourceStore=this.store,i.resourceStore.on("added removed",function(t,e){i.cacheConnector.save()}),i.languageUtils=r,i.pluralResolver=new V(r,{prepend:this.options.pluralSeparator,compatibilityJSON:this.options.compatibilityJSON,simplifyPluralSuffix:this.options.simplifyPluralSuffix}),i.interpolator=new I(this.options),i.backendConnector=new F(n(this.modules.backend),i.resourceStore,i,this.options),i.backendConnector.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];o.emit.apply(o,[t].concat(n))}),i.backendConnector.on("loaded",function(t){i.cacheConnector.save()}),i.cacheConnector=new D(n(this.modules.cache),i.resourceStore,i,this.options),i.cacheConnector.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];o.emit.apply(o,[t].concat(n))}),this.modules.languageDetector&&(i.languageDetector=n(this.modules.languageDetector),i.languageDetector.init(i,this.options.detection,this.options)),this.translator=new M(this.services,this.options),
this.translator.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];o.emit.apply(o,[t].concat(n))}),this.modules.external.forEach(function(t){t.init&&t.init(o)})}var a=["getResource","addResource","addResources","addResourceBundle","removeResourceBundle","hasResourceBundle","getResourceBundle"];a.forEach(function(t){o[t]=function(){var e;return(e=o.store)[t].apply(e,arguments)}}),"v1"===this.options.compatibilityAPI&&g(this);var s=function(){o.changeLanguage(o.options.lng,function(t,n){o.isInitialized=!0,o.logger.log("initialized",o.options),o.emit("initialized",o.options),e(t,n)})};return this.options.resources||!this.options.initImmediate?s():setTimeout(s,0),this},e.prototype.loadResources=function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:m;if(this.options.resources)e(null);else{if(this.language&&"cimode"===this.language.toLowerCase())return e();var n=[],o=function(e){if(e){var o=t.services.languageUtils.toResolveHierarchy(e);o.forEach(function(t){n.indexOf(t)<0&&n.push(t)})}};if(this.language)o(this.language);else{var r=this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);r.forEach(function(t){return o(t)})}this.options.preload&&this.options.preload.forEach(function(t){return o(t)}),this.services.cacheConnector.load(n,this.options.ns,function(){t.services.backendConnector.load(n,t.options.ns,e)})}},e.prototype.reloadResources=function(t,e){t||(t=this.languages),e||(e=this.options.ns),this.services.backendConnector.reload(t,e)},e.prototype.use=function(t){return"backend"===t.type&&(this.modules.backend=t),"cache"===t.type&&(this.modules.cache=t),("logger"===t.type||t.log&&t.warn&&t.error)&&(this.modules.logger=t),"languageDetector"===t.type&&(this.modules.languageDetector=t),"postProcessor"===t.type&&T.addPostProcessor(t),"3rdParty"===t.type&&this.modules.external.push(t),this},e.prototype.changeLanguage=function(t,e){var n=this,o=function(t,o){o&&(n.emit("languageChanged",o),n.logger.log("languageChanged",o)),e&&e(t,function(){return n.t.apply(n,arguments)})},r=function(t){t&&(n.language=t,n.languages=n.services.languageUtils.toResolveHierarchy(t),n.translator.changeLanguage(t),n.services.languageDetector&&n.services.languageDetector.cacheUserLanguage(t)),n.loadResources(function(e){o(e,t)})};t||!this.services.languageDetector||this.services.languageDetector.async?!t&&this.services.languageDetector&&this.services.languageDetector.async?this.services.languageDetector.detect(r):r(t):r(this.services.languageDetector.detect())},e.prototype.getFixedT=function(t,e){var n=this,o=function t(e){var o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=k({},o);return r.lng=r.lng||t.lng,r.lngs=r.lngs||t.lngs,r.ns=r.ns||t.ns,n.t(e,r)};return"string"==typeof t?o.lng=t:o.lngs=t,o.ns=e,o},e.prototype.t=function(){var t;return this.translator&&(t=this.translator).translate.apply(t,arguments)},e.prototype.exists=function(){var t;return this.translator&&(t=this.translator).exists.apply(t,arguments)},e.prototype.setDefaultNamespace=function(t){this.options.defaultNS=t},e.prototype.loadNamespaces=function(t,e){var n=this;return this.options.ns?("string"==typeof t&&(t=[t]),t.forEach(function(t){n.options.ns.indexOf(t)<0&&n.options.ns.push(t)}),void this.loadResources(e)):e&&e()},e.prototype.loadLanguages=function(t,e){"string"==typeof t&&(t=[t]);var n=this.options.preload||[],o=t.filter(function(t){return n.indexOf(t)<0});return o.length?(this.options.preload=n.concat(o),void this.loadResources(e)):e()},e.prototype.dir=function(t){if(t||(t=this.languages&&this.languages.length>0?this.languages[0]:this.language),!t)return"rtl";var e=["ar","shu","sqr","ssh","xaa","yhd","yud","aao","abh","abv","acm","acq","acw","acx","acy","adf","ads","aeb","aec","afb","ajp","apc","apd","arb","arq","ars","ary","arz","auz","avl","ayh","ayl","ayn","ayp","bbz","pga","he","iw","ps","pbt","pbu","pst","prp","prd","ur","ydd","yds","yih","ji","yi","hbo","men","xmn","fa","jpr","peo","pes","prs","dv","sam"];return e.indexOf(this.services.languageUtils.getLanguagePartFromCode(t))>=0?"rtl":"ltr"},e.prototype.createInstance=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=arguments[1];return new e(t,n)},e.prototype.cloneInstance=function(){var t=this,n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:m,r=k({},this.options,n,{isClone:!0}),i=new e(r,o),a=["store","services","language"];return a.forEach(function(e){i[e]=t[e]}),i.translator=new M(i.services,i.options),i.translator.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),o=1;o<e;o++)n[o-1]=arguments[o];i.emit.apply(i,[t].concat(n))}),i.init(r,o),i},e}(R),q=new K;return q})
    window['i18next'] = module.exports;
});
Numbas.queueScript('jme-rules',['base','math','jme-base','util'],function() {
/** @file Code to do with JME pattern-matching rules.
 *
 * Provides {@link Numbas.jme.rules}
 */
/** @namespace Numbas.jme.rules */
var math = Numbas.math;
var jme = Numbas.jme;
var util = Numbas.util;
jme.rules = {};
/** Simplification rule
 * @memberof Numbas.jme.rules
 * @constructor
 *
 * @param {JME} pattern - expression pattern to match. Variables will match any sub-expression.
 * @param {JME[]} conditions - conditions as JME expressions on the matched variables, which must all evaluate to true for the rule to match.
 * @param {JME} result - expression pattern to rewrite to.
 *
 * @property {JME} patternString - the JME string defining the pattern to match
 * @property {JME} resultString - the JME string defining the result of the rule
 * @property {JME} conditionStrings - JME strings defining the conditions
 * @property {Numbas.jme.tree} tree - `patternString` compiled to a syntax tree
 * @property {Numbas.jme.tree} result - `result` compiled to a syntax tree
 * @property {Numbas.jme.tree[]} conditions `conditions` compiled to syntax trees
 */
var Rule = jme.rules.Rule = function(pattern,conditions,result)
{
    this.patternString = pattern;
    this.tree = jme.compile(pattern,{},true);
    this.resultString = result;
    this.result = jme.compile(result,{},true);
    this.conditionStrings = conditions.slice();
    this.conditions = [];
    for(var i=0;i<conditions.length;i++)
    {
        this.conditions.push(jme.compile(conditions[i],{},true));
    }
}
Rule.prototype = /** @lends Numbas.jme.rules.Rule.prototype */ {
    /** Match a rule on given syntax tree.
     * @memberof Numbas.jme.rules.Rule.prototype
     * @param {Numbas.jme.tree} exprTree - the syntax tree to test
     * @param {Numbas.jme.Scope} scope - used when checking conditions
     * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, or a dictionary of matched subtrees
     */
    match: function(exprTree,scope)
    {
        //see if expression matches rule
        var match = matchTree(this.tree,exprTree);
        if(match==false)
            return false;
        //if expression matches rule, then match is a dictionary of matched variables
        //check matched variables against conditions
        if(this.matchConditions(match,scope))
            return match;
        else
            return false;
    },
    matchAll: function(exprTree,scope) {
        var r = this;
        var matches = matchAllTree(this.tree,exprTree);
        return matches.filter(function(match) {
            return r.matchConditions(match,scope);
        });
    },
    /** Check that a matched pattern satisfies all the rule's conditions
     * @memberof Numbas.jme.rules.Rule.prototype
     * @param {Numbas.jme.rules.jme_pattern_match} match
     * @param {Numbas.jme.Scope} scope
     * @returns {Boolean}
     */
    matchConditions: function(match,scope)
    {
        scope = new Numbas.jme.Scope(scope);
        for(var i=0;i<this.conditions.length;i++)
        {
            var condition_tree = Numbas.util.copyobj(this.conditions[i],true);
            condition_tree = jme.substituteTree(condition_tree,new jme.Scope([{variables:match}]));
            try {
                var result = scope.evaluate(condition_tree, null, true);
                if(result.value==false)
                    return false;
            } catch(e) {
                return false;
            }
        }
        return true;
    }
}
var endTermNames = {
    '??':true,
    'm_nothing':true,
    'm_number': true
}
function isEndTerm(term) {
    while(term.tok.type=='function' && /^m_(?:all|pm|not|commute)$/.test(term.tok.name) || jme.isOp(term.tok,';')) {
        term = term.args[0];
    }
    if(term.tok.type=='function' && term.tok.name=='m_any') {
        for(var i=0;i<term.args.length;i++) {
            if(isEndTerm(term.args[i])) {
                return true;
            }
        }
        return false;
    }
    return term.tok.type=='name' && endTermNames[term.tok.name];
}
/** Given a tree representing a series of terms t1 <op> t2 <op> t3 <op> ..., return the terms as a list.
 * @param {Numbas.jme.tree} tree
 * @param {String} op
 * @param {String[]} names
 * @returns {Object} - {terms: a list of subtrees, termnames: the match names set in each term}
 */
var getCommutingTerms = Numbas.jme.rules.getCommutingTerms = function(tree,op,names) {
    if(names===undefined) {
        names = [];
    }
    if(op=='+' && jme.isOp(tree.tok,'-')) {
        tree = {tok: new jme.types.TOp('+'), args: [tree.args[0],{tok: new jme.types.TOp('-u'), args: [tree.args[1]]}]};
    }
    if(!tree.args || tree.tok.name!=op) {
        return {terms: [tree], termnames: names.slice()};
    }
    var terms = [];
    var termnames = [];
    var rest = [];
    var restnames = [];
    for(var i=0; i<tree.args.length;i++) {
        var arg = tree.args[i];
        var oarg = arg;
        var argnames = names.slice();
        while(jme.isOp(arg.tok,';')) {
            argnames.push(arg.args[1].tok.name);
            arg = arg.args[0];
        }
        if(jme.isOp(arg.tok,op) || (op=='+' && jme.isOp(arg.tok,'-'))) {
            var sub = getCommutingTerms(arg,op,argnames);
            terms = terms.concat(sub.terms);
            termnames = termnames.concat(sub.termnames);
        } else if(jme.isName(arg.tok,'?') || isEndTerm(arg)) {
            rest.push(arg);
            restnames.push(argnames);
        } else {
            terms.push(arg);
            termnames.push(argnames);
        }
    }
    if(rest.length) {
        terms = terms.concat(rest);
        termnames = termnames.concat(restnames);
    }
    return {terms: terms, termnames: termnames};
}
/** A dictionary representing the results of a JME pattern match.
 * Maps variable names to trees.
 * @typedef Numbas.jme.rules.jme_pattern_match
 * @type Object.<Numbas.jme.tree>
 * @see {Numbas.jme.rules#matchTree}
 */
/** Recursively check whether `exprTree` matches `ruleTree`. Variables in `ruleTree` match any subtree.
 * @memberof Numbas.jme.rules
 *
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {Boolean} doCommute - take commutativity of operations into account, e.g. terms of a sum can be in any order.
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchTree = jme.rules.matchTree = function(ruleTree,exprTree,doCommute) {
    if(doCommute===undefined) {
        doCommute = false;
    }
    if(!exprTree)
        return false;
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(jme.isOp(ruleTok,';')) {
        if(ruleTree.args[1].tok.type!='name') {
            throw(new Numbas.Error('jme.matchTree.group name not a name'));
        }
        var name = ruleTree.args[1].tok.name;
        var m = matchTree(ruleTree.args[0],exprTree,doCommute);
        if(m) {
            m[name] = exprTree;
            return m;
        } else {
            return false;
        }
    }
    if(ruleTok.type=='name')
    {
        switch(ruleTok.name) {
            case '?':
            case '??':
                return {};
            case 'm_number':
                return exprTok.type=='number' ? {} : false;
        }
    }
    if(ruleTok.type=='function') {
        switch(ruleTok.name) {
            case 'm_any':
                for(var i=0;i<ruleTree.args.length;i++) {
                    var m;
                    if(m=matchTree(ruleTree.args[i],exprTree,doCommute)) {
                        return m;
                    }
                }
                return false;
            case 'm_all':
                return matchTree(ruleTree.args[0],exprTree,doCommute);
            case 'm_pm':
                if(jme.isOp(exprTok,'-u')) {
                    return matchTree({tok: new jme.types.TOp('-u'),args: [ruleTree.args[0]]},exprTree,doCommute);
                } else {
                    return matchTree(ruleTree.args[0],exprTree,doCommute);
                }
            case 'm_not':
                if(!matchTree(ruleTree.args[0],exprTree,doCommute)) {
                    return {};
                } else {
                    return false;
                }
            case 'm_and':
                var d = {};
                for(var i=0;i<ruleTree.args.length;i++) {
                    var m = matchTree(ruleTree.args[i],exprTree,doCommute);
                    if(m) {
                        for(var name in m) {
                            d[name] = m[name];
                        }
                    } else {
                        return false;
                    }
                }
                return d;
            case 'm_uses':
                var vars = jme.findvars(exprTree);
                for(var i=0;i<ruleTree.args.length;i++) {
                    var name = ruleTree.args[i].tok.name;
                    if(!vars.contains(name)) {
                        return false;
                    }
                }
                return {};
            case 'm_commute':
                return matchTree(ruleTree.args[0],exprTree,true);
            case 'm_type':
                var wantedType = ruleTree.args[0].tok.name || ruleTree.args[0].tok.value;
                if(exprTok.type==wantedType) {
                    return {};
                } else {
                    return false;
                }
        }
    }
    if(jme.isName(ruleTok,'m_nothing')) {
        return false;
    } else if(jme.isName(ruleTok,'m_number')) {
        if(exprTok.type=='number') {
            return {};
        } else {
            return false;
        }
    }
    if(ruleTok.type!='op' && ruleTok.type != exprTok.type)
    {
        return false;
    }
    switch(ruleTok.type)
    {
    case 'number':
        if( !math.eq(ruleTok.value,exprTok.value) ) {
            return false;
        } else {
            return {};
        }
    case 'string':
    case 'boolean':
    case 'special':
    case 'range':
        if(ruleTok.value != exprTok.value) {
            return false;
        } else {
            return {};
        }
    case 'function':
    case 'op':
        var d = {};
        if(doCommute && jme.commutative[ruleTok.name]) {
            var commutingOp = ruleTok.name;
            var ruleTerms = getCommutingTerms(ruleTree,commutingOp);
            var exprTerms = getCommutingTerms(exprTree,commutingOp);
            var rest = [];
            var namedTerms = {};
            var matchedRules = [];
            var termMatches = [];
            for(var i=0; i<exprTerms.terms.length; i++) {
                var m = null;
                var matched = false;
                for(var j=0; j<ruleTerms.terms.length; j++) {
                    var ruleTerm = ruleTerms.terms[j];
                    m = matchTree(ruleTerm,exprTerms.terms[i],doCommute);
                    if((!matchedRules[j] || ruleTerm.tok.name=='m_all') && m) {
                        matched = true;
                        matchedRules[j] = true;
                        for(var name in m) {
                            if(!namedTerms[name]) {
                                namedTerms[name] = [];
                            }
                            namedTerms[name].push(m[name]);
                        }
                        var names = ruleTerms.termnames[j];
                        if(names) {
                            for(var k=0;k<names.length;k++) {
                                var name = names[k];
                                if(!namedTerms[name]) {
                                    namedTerms[name] = [];
                                }
                                namedTerms[name].push(exprTerms.terms[i]);
                            }
                        }
                        break;
                    }
                }
                if(!matched) {
                    return false;
                }
            }
            for(var i=0;i<ruleTerms.terms.length;i++) {
                var term = ruleTerms.terms[i];
                if(!isEndTerm(term) && !matchedRules[i]) {
                    return false;
                }
            }
            for(var name in namedTerms) {
                var terms = namedTerms[name];
                var sub = terms[0];
                for(var i=1;i<terms.length;i++) {
                    var op = new jme.types.TOp(commutingOp);
                    sub = {tok: op, args: [sub,terms[i]]};
                }
                d[name] = sub;
            }
            return d;
        } else {
            if(ruleTok.type!=exprTok.type || ruleTok.name!=exprTok.name) {
                return false;
            }
            var i = 0;
            var j = 0;
            for(var i=0;i<ruleTree.args.length;i++)
            {
                if(jme.isFunction(ruleTree.args[i].tok,'m_all')) {
                    while(j<exprTree.args.length) {
                        var m = matchTree(ruleTree.args[i],exprTree.args[i],doCommute);
                        if(!m) {
                            break;
                        }
                        for(var x in m) {
                            d[x]=m[x];
                        }
                        j += 1;
                    }
                } else if(jme.isName(ruleTree.args[i].tok,'m_nothing')) {
                    continue;
                } else {
                    var m = matchTree(ruleTree.args[i],exprTree.args[j],doCommute);
                    if(m===false) {
                        return false;
                    } else {
                        for(var x in m) {
                            d[x]=m[x];
                        }
                        j += 1;
                    }
                }
            }
            // if not all terms in the rule have been matched, the rule doesn't match
            if(j<i) {
                return false;
            }
            return d
        }
    case 'name':
        if(ruleTok.name.toLowerCase()==exprTok.name.toLowerCase()) {
            return {};
        } else {
            return false;
        }
    default:
        return {};
    }
}
var matchAllTree = jme.rules.matchAllTree = function(ruleTree,exprTree,doCommute) {
    var matches = [];
    var m = matchTree(ruleTree,exprTree,doCommute);
    if(m) {
        matches = [m];
    }
    if(exprTree.args) {
        exprTree.args.forEach(function(arg) {
            var submatches = matchAllTree(ruleTree,arg,doCommute);
            matches = matches.concat(submatches);
        });
    }
    return matches;
}
/** Match expression against a pattern. Wrapper for {@link Numbas.jme.rules.matchTree}
 *
 * @memberof Numbas.jme.rules
 * @method
 *
 * @param {JME} pattern
 * @param {JME} expr
 * @param {Boolean} doCommute
 *
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchExpression = jme.rules.matchExpression = function(pattern,expr,doCommute) {
    pattern = jme.compile(pattern);
    expr = jme.compile(expr);
    return matchTree(pattern,expr,doCommute);
}
/** Flags used to control the behaviour of JME display functions.
 * Values are `undefined` so they can be overridden
 * @memberof Numbas.jme.rules
 */
var displayFlags = jme.rules.displayFlags = {
    fractionnumbers: undefined,
    rowvector: undefined,
    alwaystimes: undefined
};
/** Flags used in JME simplification rulesets
 * @type Object.<Boolean>
 * @typedef Numbas.jme.rules.ruleset_flags
 * @property {Boolean} fractionnumbers - Show all numbers as fractions?
 * @property {Boolean} rowvector - Display vectors as a horizontal list of components?
 * @property {Boolean} alwaystimes - Always show the multiplication symbol between multiplicands?
 * @see Numbas.jme.rules.Ruleset
 */
/** Set of simplification rules
 * @constructor
 * @memberof Numbas.jme.rules
 * @param {Numbas.jme.rules.Rule[]} rules
 * @param {Numbas.jme.rules.ruleset_flags} flags
 */
var Ruleset = jme.rules.Ruleset = function(rules,flags) {
    this.rules = rules;
    this.flags = util.extend_object({},displayFlags,flags);
}
Ruleset.prototype = /** @lends Numbas.jme.rules.Ruleset.prototype */ {
    /** Test whether flag is set
     * @memberof Numbas.jme.rules.Ruleset.prototype
     */
    flagSet: function(flag) {
        flag = flag.toLowerCase();
        if(this.flags.hasOwnProperty(flag))
            return this.flags[flag];
        else
            return false;
    }
}
var ruleSort = util.sortBy(['patternString','resultString','conditionStrings']);
function mergeRulesets(r1,r2) {
    var rules = r1.rules.merge(r2.rules,ruleSort);
    var flags = util.extend_object({},r1.flags,r2.flags);
    return new Ruleset(rules, flags);
}
/** Collect a ruleset together from a list of ruleset names, or rulesets.
 * @param {String|Array.<String|Numbas.jme.rules.Ruleset>} set - A comma-separated string of ruleset names, or an array of names/Ruleset objects.
 * @param {Object.<Numbas.jme.rules.Ruleset>} scopeSets - Dictionary of rulesets defined in the current scope.
 * @returns Numbas.jme.rules.Ruleset
 */
var collectRuleset = jme.rules.collectRuleset = function(set,scopeSets)
{
    scopeSets = util.copyobj(scopeSets);
    if(!set)
        return new Ruleset([],{});
    if(!scopeSets)
        throw(new Numbas.Error('jme.display.collectRuleset.no sets'));
    var rules = [];
    var flags = {};
    if(typeof(set)=='string') {
        set = set.split(',');
        set.splice(0,0,'basic');
    }
    else {
        flags = util.extend_object(flags,set.flags);
        if(set.rules)
            set = set.rules;
    }
    for(var i=0; i<set.length; i++ )
    {
        if(typeof(set[i])=='string')
        {
            var m = /^\s*(!)?(.*)\s*$/.exec(set[i]);
            var neg = m[1]=='!' ? true : false;
            var name = m[2].trim().toLowerCase();
            if(name in displayFlags)
            {
                flags[name]= !neg;
            }
            else if(name.length>0)
            {
                if(!(name in scopeSets))
                {
                    throw(new Numbas.Error('jme.display.collectRuleset.set not defined',{name:name}));
                }
                var sub = collectRuleset(scopeSets[name],scopeSets);
                flags = util.extend_object(flags,sub.flags);
                scopeSets[name] = sub;
                if(neg)
                {
                    for(var j=0; j<sub.rules.length; j++)
                    {
                        if((m=rules.indexOf(sub.rules[j]))>=0)
                        {
                            rules.splice(m,1);
                        }
                    }
                }
                else
                {
                    for(var j=0; j<sub.rules.length; j++)
                    {
                        if(!(rules.contains(sub.rules[j])))
                        {
                            rules.push(sub.rules[j]);
                        }
                    }
                }
            }
        }
        else
            rules.push(set[i]);
    }
    return new Ruleset(rules,flags);
}
/** Built-in simplification rules
 * @enum {Numbas.jme.rules.Rule[]}
 * @memberof Numbas.jme.rules
 */
var simplificationRules = jme.rules.simplificationRules = {
    basic: [
        ['?;x',['x isa "number"','x<0'],'-eval(-x)'],   // the value of a TNumber should be non-negative - pull the negation out as unary minus
        ['+(?;x)',[],'x'],                    //get rid of unary plus
        ['?;x+(-?;y)',[],'x-y'],            //plus minus = minus
        ['?;x+?;y',['y isa "number"','y<0'],'x-eval(-y)'],
        ['?;x-?;y',['y isa "number"','y<0'],'x+eval(-y)'],
        ['?;x-(-?;y)',[],'x+y'],            //minus minus = plus
        ['-(-?;x)',[],'x'],                //unary minus minus = plus
        ['-?;x',['x isa "complex"','re(x)<0'],'eval(-x)'],
        ['?;x+?;y',['x isa "number"','y isa "complex"','re(y)=0'],'eval(x+y)'],
        ['-?;x+?;y',['x isa "number"','y isa "complex"','re(y)=0'],'-eval(x-y)'],
        ['(-?;x)/?;y',[],'-(x/y)'],            //take negation to left of fraction
        ['?;x/(-?;y)',[],'-(x/y)'],
        ['(-?;x)*?;y',['not (x isa "complex")'],'-(x*y)'],            //take negation to left of multiplication
        ['?;x*(-?;y)',['not (y isa "complex")'],'-(x*y)'],
        ['?;x+(?;y+?;z)',[],'(x+y)+z'],        //make sure sums calculated left-to-right
        ['?;x-(?;y+?;z)',[],'(x-y)-z'],
        ['?;x+(?;y-?;z)',[],'(x+y)-z'],
        ['?;x-(?;y-?;z)',[],'(x-y)+z'],
        ['(?;x*?;y)*?;z',[],'x*(y*z)'],        //make sure multiplications go right-to-left
        ['?;n*i',['n isa "number"'],'eval(n*i)'],            //always collect multiplication by i
        ['i*?;n',['n isa "number"'],'eval(n*i)']
    ],
    unitFactor: [
        ['1*?;x',[],'x'],
        ['?;x*1',[],'x']
    ],
    unitPower: [
        ['?;x^1',[],'x']
    ],
    unitDenominator: [
        ['?;x/1',[],'x']
    ],
    zeroFactor: [
        ['?;x*0',[],'0'],
        ['0*?;x',[],'0'],
        ['0/?;x',[],'0']
    ],
    zeroTerm: [
        ['0+?;x',[],'x'],
        ['?;x+0',[],'x'],
        ['?;x-0',[],'x'],
        ['0-?;x',[],'-x']
    ],
    zeroPower: [
        ['?;x^0',['!(x=0)'],'1']
    ],
    noLeadingMinus: [
        ['-?;x+?;y',[],'y-x'],                                            //don't start with a unary minus
        ['-0',[],'0']
    ],
    collectNumbers: [
        ['-?;x-?;y',['x isa "number"','y isa "number"'],'-(x+y)'],                                        //collect minuses
        ['?;n+?;m',['n isa "number"','m isa "number"'],'eval(n+m)'],    //add numbers
        ['?;n-?;m',['n isa "number"','m isa "number"'],'eval(n-m)'],    //subtract numbers
        ['?;n+?;x',['n isa "number"','!(x isa "number")'],'x+n'],        //add numbers last
        ['(?;x+?;n)+?;m',['n isa "number"','m isa "number"'],'x+eval(n+m)'],    //collect number sums
        ['(?;x-?;n)+?;m',['n isa "number"','m isa "number"'],'x+eval(m-n)'],
        ['(?;x+?;n)-?;m',['n isa "number"','m isa "number"'],'x+eval(n-m)'],
        ['(?;x-?;n)-?;m',['n isa "number"','m isa "number"'],'x-eval(n+m)'],
        ['(?;x+?;n)+?;y',['n isa "number"'],'(x+y)+n'],                        //shift numbers to right hand side
        ['(?;x+?;n)-?;y',['n isa "number"'],'(x-y)+n'],
        ['(?;x-?;n)+?;y',['n isa "number"'],'(x+y)-n'],
        ['(?;x-?;n)-?;y',['n isa "number"'],'(x-y)-n'],
        ['?;n*?;m',['n isa "number"','m isa "number"'],'eval(n*m)'],        //multiply numbers
        ['?;x*?;n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],            //shift numbers to left hand side
        ['?;m*(?;n*?;x)',['m isa "number"','n isa "number"'],'eval(n*m)*x']
    ],
    simplifyFractions: [
        ['?;n/?;m',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'eval(n/gcd_without_pi_or_i(n,m))/eval(m/gcd_without_pi_or_i(n,m))'],            //cancel simple fraction
        ['(?;n*?;x)/?;m',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'(eval(n/gcd_without_pi_or_i(n,m))*x)/eval(m/gcd_without_pi_or_i(n,m))'],    //cancel algebraic fraction
        ['?;n/(?;m*?;x)',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'eval(n/gcd_without_pi_or_i(n,m))/(eval(m/gcd_without_pi_or_i(n,m))*x)'],
        ['(?;n*?;x)/(?;m*?;y)',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'(eval(n/gcd_without_pi_or_i(n,m))*x)/(eval(m/gcd_without_pi_or_i(n,m))*y)'],
        ['?;n/?;m',['n isa "complex"','m isa "complex"','re(n)=0','re(m)=0'],'eval(n/i)/eval(m/i)']            // cancel i when numerator and denominator are both purely imaginary
    ],
    zeroBase: [
        ['0^?;x',['!(x=0)'],'0']
    ],
    constantsFirst: [
        ['?;x*?;n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],
        ['?;x*(?;n*?;y)',['n isa "number"','n<>i','!(x isa "number")'],'n*(x*y)']
    ],
    sqrtProduct: [
        ['sqrt(?;x)*sqrt(?;y)',[],'sqrt(x*y)']
    ],
    sqrtDivision: [
        ['sqrt(?;x)/sqrt(?;y)',[],'sqrt(x/y)']
    ],
    sqrtSquare: [
        ['sqrt(?;x^2)',[],'x'],
        ['sqrt(?;x)^2',[],'x'],
        ['sqrt(?;n)',['n isa "number"','isint(sqrt(n))'],'eval(sqrt(n))']
    ],
    trig: [
        ['sin(?;n)',['n isa "number"','isint(2*n/pi)'],'eval(sin(n))'],
		['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(2*(n/m)/pi)'],'eval(sin(n/m))'],
        ['cos(?;n)',['n isa "number"','isint(2*n/pi)'],'eval(cos(n))'],
		['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(2*(n/m)/pi)'],'eval(cos(n/m))'],
        ['tan(?;n)',['n isa "number"','isint(n/pi)'],'0'],
        ['cosh(0)',[],'1'],
        ['sinh(0)',[],'0'],
        ['tanh(0)',[],'0']
    ],
    trigPowers: [
        ['sin^(?;n)(?;x)',[],'sin(x)^n']
    ],
    otherNumbers: [
        ['?;n^?;m',['n isa "number"','m isa "number"','!((n=0) and (m=0))'],'eval(n^m)']
    ],
    cancelTerms: [
        // x+y or rest+x+y
        ['(?;rest+?;n*?;x) + ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+m)*x'],
        ['(?;rest+?;n*?;x) + ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+1)*x'],
        ['(?;rest+?;x) + ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+1)*x'],
        ['(?;rest+?;x) + ?;y',['canonical_compare(x,y)=0'],'rest+2*x'],
        ['?;n*?;x+?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n+m)*x'],
        ['?;n*?;x+?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n+1)*x'],
        ['-?;x+?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n-1)*x'],
        ['-?;x+?;y',['canonical_compare(x,y)=0'],'0*x'],
        ['?;x+?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n+1)*x'],
        ['?;x+?;y',['canonical_compare(x,y)=0'],'2*x'],
        // x-y or rest+x-y
        ['(?;rest+?;n*?;x) - ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n-m)*x'],
        ['(?;rest+?;n*?;x) - ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(n-1)*x'],
        ['(?;rest+?;x) - ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(1-n)*x'],
        ['(?;rest+?;x) - ?;y',['canonical_compare(x,y)=0'],'rest+0*x'],
        ['?;n*?;x-?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n-m)*x'],
        ['?;n*?;x-?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n-1)*x'],
        ['-?;x-?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(-1-n)*x'],
        ['-?;x-?;y',['canonical_compare(x,y)=0'],'-2*x'],
        ['?;x-?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(1-n)*x'],
        ['?;x-?;y',['canonical_compare(x,y)=0'],'0*x'],
        // rest-x-y or rest-x+y
        ['(?;rest-?;n*?;x) + ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(m-n)*x'],
        ['(?;rest-?;n*?;x) + ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(1-n)*x'],
        ['(?;rest-?;x) + ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(1-n)*x'],
        ['(?;rest-?;n*?;x) - ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest-eval(n+m)*x'],
        ['(?;rest-?;n*?;x) - ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest-eval(n+1)*x'],
        ['(?;rest-?;x) - ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest-eval(1+n)*x'],
        ['(?;rest-?;x) - ?;y',['canonical_compare(x,y)=0'],'rest-2*x'],
        ['(?;rest-?;x) + ?;y',['canonical_compare(x,y)=0'],'rest+0*x'],
        ['(?;rest+?;n/?;x) + ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+m)/x'],
        ['(?;n)/(?;x)+(?;m)/(?;y)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n+m)/x'],
        ['(?;rest+?;n/?;x) - ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n-m)/x'],
        ['?;n/?;x-?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n-m)/x'],
        ['(?;rest-?;n/?;x) + ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(m-n)/x'],
        ['(?;rest-?;n/?;x) - ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest-eval(n+m)/x']
    ],
    cancelFactors: [
        // x*y or rest*x*y
        ['(?;rest*(?;x)^(?;n)) * (?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest*x^(n+m)'],
        ['(?;rest*(?;x)^(?;n)) * ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n+1)'],
        ['(?;rest*?;x) * (?;y)^(?;n)',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n+1)'],
        ['(?;rest*?;x) * ?;y',['canonical_compare(x,y)=0'],'rest*x^2'],
        ['(?;x)^(?;n)*(?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'x^eval(n+m)'],
        ['(?;x)^(?;n)*?;y',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(n+1)'],
        ['(?;x)^(-?;n)*?;y',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(-n+1)'],
        ['?;x*(?;y)^(?;n)',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(n+1)'],
        ['?;x*(?;y)^(-?;n)',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(-n+1)'],
        ['?;x*?;y',['canonical_compare(x,y)=0'],'x^2'],
        // x/y or rest*x/y
        ['(?;rest*(?;x)^(?;n)) / ((?;y)^(?;m))',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n-m)'],
        ['(?;rest*(?;x)^(?;n)) / ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n-1)'],
        ['(?;rest*?;x) / ((?;y)^(?;n))',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(1-n)'],
        ['(?;rest*?;x) / ?;y',['canonical_compare(x,y)=0'],'rest*x^0'],
        ['(?;x)^(?;n) / (?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'x^eval(n-m)'],
        ['(?;x)^(?;n) / ?;y',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(n-1)'],
        ['?;x / ((?;y)^(?;n))',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(1-n)'],
        ['?;x / ?;y',['canonical_compare(x,y)=0'],'x^0'],
        // rest/x/y or rest/x*y
        ['(?;rest/((?;x)^(?;n))) * (?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(m-n)'],
        ['(?;rest/((?;x)^(?;n))) * ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(1-n)'],
        ['(?;rest/?;x) * (?;y)^(?;n)',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(1-n)'],
        ['(?;rest/((?;x)^(?;n))) / ((?;y)^(?;m))',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest/(x^eval(n+m))'],
        ['(?;rest/((?;x)^(?;n))) / ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest/(x^eval(n+1))'],
        ['(?;rest/?;x) / ((?;y)^(?;n))',['n isa "number"','canonical_compare(x,y)=0'],'rest/(x^eval(1+n))'],
        ['(?;rest/?;x) / ?;y',['canonical_compare(x,y)=0'],'rest/(x^2)'],
        ['(?;rest/?;x) * ?;y',['canonical_compare(x,y)=0'],'rest/(x^0)']
    ],
    collectLikeFractions: [
        ['?;a/?;b+?;c/?;d',['canonical_compare(b,d)=0'],'(a+c)/b']
    ]
};
// these rules conflict with noLeadingMinus
var canonicalOrderRules = [
    ['?;x+?;y',['canonical_compare(x,y)=1'],'y+x'],
    ['?;x-?;y',['canonical_compare(x,y)=1'],'(-y)+x'],
    ['-?;x+?;y',['canonical_compare(x,y)=1'],'y-x'],
    ['-?;x-?;y',['canonical_compare(x,y)=1'],'(-y)-x'],
    ['(?;x+?;y)+?;z',['canonical_compare(y,z)=1'],'(x+z)+y'],
    ['(?;x+?;y)-?;z',['canonical_compare(y,z)=1'],'(x-z)+y'],
    ['(?;x-?;y)+?;z',['canonical_compare(y,z)=1'],'(x+z)-y'],
    ['(?;x-?;y)-?;z',['canonical_compare(y,z)=1'],'(x-z)-y'],
    ['?;x*?;y',['canonical_compare(x,y)=-1'],'y*x'],
    ['(?;x*?;y)*?;z',['canonical_compare(y,z)=-1'],'(x*z)*y'],
    ['?;x*(?;y*?;z)',['canonical_compare(x,y)=-1'],'y*(x*z)'],
]
var expandBracketsRules = [
    ['(?;x+?;y)*?;z',[],'x*z+y*z'],
    ['?;x*(?;y+?;z)',[],'x*y+x*z'],
    ['(?;x-?;y)*?;z',[],'x*z-y*z'],
    ['?;x*(?;y-?;z)',[],'x*y-x*z']
]
// other new rules 
var trigSurdsRules = [
	['sin(?;n)',['n isa "number"','isint(3*n/pi)','!(isint(n/pi))'],'eval(sin(n)*2/sqrt(3))*sqrt(3)/2'],
	['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(3*(n/m)/pi)','!(isint((n/m)/pi))'],'eval(sin(n/m)*2/sqrt(3))*sqrt(3)/2'],
	['cos(?;n)',['n isa "number"','isint(3*n/pi)','!(isint(n/pi))'],'eval(cos(n)*2)/2'],
	['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(3*(n/m)/pi)','!(isint((n/m)/pi))'],'eval(cos(n/m)*2)/2'],
	['tan(?;n)',['n isa "number"','isint(3*n/pi)','!(isint(n/pi))'],'eval(tan(n)/sqrt(3))*sqrt(3)'],
	['tan(?;n/?;m)',['n isa "number"','m isa "number"','isint(3*(n/m)/pi)','!(isint((n/m)/pi))'],'eval(tan(n/m)/sqrt(3))*sqrt(3)'],
	['sin(?;n)',['n isa "number"','isint(6*n/pi)','!(isint(3*n/pi))','!(isint(2*n/pi))'],'eval(sin(n)*2)/2'],
	['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(6*(n/m)/pi)','!(isint(3*(n/m)/pi))','!(isint(2*(n/m)/pi))'],'eval(sin(n/m)*2)/2'],
	['cos(?;n)',['n isa "number"','isint(6*n/pi)','!(isint(3*n/pi))','!(isint(2*n/pi))'],'eval(cos(n)*2/sqrt(3))*sqrt(3)/2'],
	['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(6*(n/m)/pi)','!(isint(3*(n/m)/pi))','!(isint(2*(n/m)/pi))'],'eval(cos(n/m)*2/sqrt(3))*sqrt(3)/2'],
	['tan(?;n)',['n isa "number"','isint(6*n/pi)','!(isint(3*n/pi))','!(isint(2*n/pi))'],'eval(tan(n)*sqrt(3))/sqrt(3)'],
	['tan(?;n/?;m)',['n isa "number"','m isa "number"','isint(6*(n/m)/pi)','!(isint(3*(n/m)/pi))','!(isint(2*(n/m)/pi))'],'eval(tan(n/m)*sqrt(3))/sqrt(3)'],
	['sin(?;n)',['n isa "number"','isint(4*n/pi)','!(isint(2*n/pi))'],'eval(sin(n)*sqrt(2))/sqrt(2)'],
	['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(4*(n/m)/pi)','!(isint(2*(n/m)/pi))'],'eval(sin(n/m)*sqrt(2))/sqrt(2)'],
	['cos(?;n)',['n isa "number"','isint(4*n/pi)','!(isint(2*n/pi))'],'eval(cos(n)*sqrt(2))/sqrt(2)'],
	['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(4*(n/m)/pi)','!(isint(2*(n/m)/pi))'],'eval(cos(n/m)*sqrt(2))/sqrt(2)'],
	['tan(?;n)',['n isa "number"','isint(4*n/pi)','!(isint(2*n/pi))'],'eval(tan(n))'],
	['tan(?;n/?;m)',['n isa "number"','m isa "number"','isint(4*(n/m)/pi)','!(isint(2*(n/m)/pi))'],'eval(tan(n/m))'] 
]
var oddEvenRules = [
	['sin(-?;x)',[],'-sin(x)'],
	['cos(-?;x)',[],'cos(x)'],
	['tan(-?;x)',[],'-tan(x)'],
	['sinh(-?;x)',[],'-sinh(x)'],
	['cosh(-?;x)',[],'cosh(x)'],
	['tanh(-?;x)',[],'-tanh(x)'],
	['(-?;x)^(?;n)',['n isa "number"',"isint(n/2)"],'x^n'],
	['(-?;x)^(?;n)',['n isa "number"',"isint((n-1)/2)"],'-x^n']
]
var commonFactorsRules = [
	['?;n*(?;x)+?;n*(?;y)',['n isa "number"'],'n*(x+y)']
]
var calcErrorRules = [
	['?;x',['x isa "number"','x>-0.0000000001','x<0'],'0'],
	['?;x',['x isa "number"','x<0.0000000001','x>0'],'0'],
	['?;x',['x isa "number"','x>0.9999999999','x<1'],'1'],
	['?;x',['x isa "number"','x<1.0000000001','x>1'],'1'],
]

/** Compile an array of rules (in the form `[pattern,conditions[],result]` to {@link Numbas.jme.rules.Rule} objects
 * @param {Array} rules
 * @returns {Numbas.jme.rules.Ruleset}
 */
var compileRules = jme.rules.compileRules = function(rules)
{
    for(var i=0;i<rules.length;i++)
    {
        var pattern = rules[i][0];
        var conditions = rules[i][1];
        var result = rules[i][2];
        rules[i] = new Rule(pattern,conditions,result);
    }
    return new Ruleset(rules,{});
}
var all=[];
var compiledSimplificationRules = {};
var notAll = ['canonicalOrder','expandBrackets','trigSurds','oddEven','commonFactors','calcError'];
for(var x in simplificationRules)
{
    compiledSimplificationRules[x] = compiledSimplificationRules[x.toLowerCase()] = compileRules(simplificationRules[x]);
    if(!notAll.contains(x)) {
    all = all.concat(compiledSimplificationRules[x].rules);
    }
}
compiledSimplificationRules['canonicalorder'] = compileRules(canonicalOrderRules);
compiledSimplificationRules['expandbrackets'] = compileRules(expandBracketsRules);
compiledSimplificationRules['trigsurds'] = compileRules(trigSurdsRules);
compiledSimplificationRules['oddeven'] = compileRules(oddEvenRules);
compiledSimplificationRules['commonfactors'] = compileRules(commonFactorsRules);
compiledSimplificationRules['calcerror'] = compileRules(calcErrorRules);
compiledSimplificationRules['all'] = new Ruleset(all,{});
jme.rules.simplificationRules = compiledSimplificationRules;
});

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
/** @file Sets up the JME compiler and evaluator.
 *
 * Provides {@link Numbas.jme}
 */
Numbas.queueScript('jme',['jme-base','jme-builtins','jme-rules'],function(){
    var jme = Numbas.jme;
    /** For backwards compatibility, copy references to some members of jme.rules to jme.
     * These items used to belong to Numbas.jme, but were spun out to Numbas.jme.rules.
     */
    ['displayFlags','Ruleset','collectRuleset'].forEach(function(name) {
        jme[name] = jme.rules[name];
    });
});
Numbas.queueScript('jme-base',['base','math','util'],function() {
var util = Numbas.util;
var math = Numbas.math;

/** A JME expression.
 * @typedef JME
 * @type {String}
 * @see {@link http://numbas-editor.readthedocs.io/en/latest/jme-reference.html}
 */

/** @typedef Numbas.jme.tree
  * @type {Object}
  * @property {Array.<Numbas.jme.tree>} args - the token's arguments (if it's an op or function)
  * @property {Numbas.jme.token} tok - the token at this node
  */

/** @namespace Numbas.jme */
var jme = Numbas.jme = /** @lends Numbas.jme */ {
    /** Mathematical constants */
    constants: {
        'e': Math.E,
        'pi': Math.PI,
        'π': Math.PI,
        'i': math.complex(0,1),
        'infinity': Infinity,
        'infty': Infinity,
        'nan': NaN,
        '∞': Infinity
    },
    /** Escape a string so that it will be interpreted correctly by the JME parser
     * @param {String} str
     * @returns {String}
     * @see Numbas.jme.unescape
     */
    escape: function(str) {
        return str
            .replace(/\\/g,'\\\\')
            .replace(/\\([{}])/g,'$1')
            .replace(/\n/g,'\\n')
            .replace(/"/g,'\\"')
            .replace(/'/g,"\\'")
        ;
    },

    /** Wrapper around {@link Numbas.jme.Parser#compile}
     * @param {JME} expr
     * @see Numbas.jme.Parser#compile
     * @returns {Numbas.jme.tree}
     */
    compile: function(expr) {
        var parser = new jme.Parser();
        return parser.compile(expr);
    },

    /** Wrapper around {@link Numbas.jme.Parser#tokenise}
     * @param {JME} expr
     * @see Numbas.jme.Parser#tokenise
     * @returns {Numbas.jme.token[]}
     */
    tokenise: function(expr) {
        var parser = new jme.Parser();
        return parser.tokenise(expr);
    },

    /** Wrapper around {@link Numbas.jme.Parser#shunt}
     * @param {Numbas.jme.token[]} tokens
     * @see Numbas.jme.Parser#shunt
     * @returns {Numbas.jme.tree}
     */
    shunt: function(tokens) {
        var parser = new jme.Parser();
        return parser.shunt(expr);
    },

    /** Unescape a string - backslashes escape special characters
     * @param {String} str
     * @returns {String}
     * @see Numbas.jme.escape
     */
    unescape: function(str) {
        var estr = '';
        while(true) {
            var i = str.indexOf('\\');
            if(i==-1)
                break;
            else {
                estr += str.slice(0,i);
                var c;
                if((c=str.charAt(i+1))=='n') {
                    estr+='\n';
                }
                else if(c=='{' || c=='}') {
                    estr+='\\'+c;
                }
                else {
                    estr+=c;
                }
                str=str.slice(i+2);
            }
        }
        estr+=str;
        return estr;
    },
    /** Substitute variables defined in `scope` into the given syntax tree (in place).
     * @param {Numbas.jme.tree} tree
     * @param {Numbas.jme.Scope} scope
     * @param {Boolean} [allowUnbound=false] - allow unbound variables to remain in the returned tree
     * @returns {Numbas.jme.tree}
     */
    substituteTree: function(tree,scope,allowUnbound)
    {
        if(!tree)
            return null;
        if(tree.tok.bound)
            return tree;
        if(tree.args===undefined)
        {
            if(tree.tok.type=='name')
            {
                var name = tree.tok.name.toLowerCase();
                var v = scope.getVariable(name);
                if(v===undefined)
                {
                    if(allowUnbound)
                        return {tok: new TName(name)};
                    else
                        throw new Numbas.Error('jme.substituteTree.undefined variable',{name:name});
                }
                else
                {
                    if(v.tok) {
                        return v;
                    } else {
                        return {tok: v};
                    }
                }
            }
            else {
                return tree;
            }
        } else if((tree.tok.type=='function' || tree.tok.type=='op') && tree.tok.name in substituteTreeOps) {
            tree = {tok: tree.tok,
                    args: tree.args.slice()};
            substituteTreeOps[tree.tok.name](tree,scope,allowUnbound);
            return tree;
        } else {
            tree = {
                tok: tree.tok,
                args: tree.args.slice()
            };
            for(var i=0;i<tree.args.length;i++) {
                tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound);
            }
            return tree;
        }
    },
    /** Evaluate a syntax tree (or string, which is compiled to a syntax tree), with respect to the given scope.
     * @param {Numbas.jme.tree|String} tree
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.token}
     */
    evaluate: function(tree,scope)
    {
        if(!scope) {
            throw(new Numbas.Error('jme.evaluate.no scope given'));
        }
        return scope.evaluate(tree);
    },
    /** Compile a list of expressions, separated by commas
     * @param {JME} expr
     * @see Numbas.jme.tokenise
     * @see Numbas.jme.shunt
     * @returns {Numbas.jme.tree[]}
     */
    compileList: function(expr,scope) {
        expr+='';    //make sure expression is a string and not a number or anything like that
        if(!expr.trim().length)
            return null;
        //typecheck
        scope = new Scope(scope);
        //tokenise expression
        var tokens = jme.tokenise(expr);
        var bits = [];
        var brackets = [];
        var start = 0;
        for(var i=0;i<tokens.length;i++) {
            switch(tokens[i].type) {
                case '(':
                case '[':
                    brackets.push(tokens[i]);
                    break;
                case ')':
                    if(!brackets.length || brackets.pop().type!='(') {
                        throw(new Numbas.Error('jme.compile list.mismatched bracket'));
                    }
                    break;
                case ']':
                    if(!brackets.length || brackets.pop().type!='[') {
                        throw(new Numbas.Error('jme.compile list.mismatched bracket'));
                    }
                    break;
                case ',':
                    if(brackets.length==0) {
                        bits.push(tokens.slice(start,i));
                        start = i+1;
                    }
                    break;
            }
        }
        if(brackets.length) {
            throw(new Numbas.Error('jme.compile list.missing right bracket'));
        }
        bits.push(tokens.slice(start));
        //compile to parse tree
        var trees = bits.map(function(b){return jme.shunt(b)});
        return trees;
    },
    /** Settings for {@link Numbas.jme.compare}
     * @typedef {Object} Numbas.jme.compare_settings
     * @property {String} checkingType - The name of the method to determine if two results are equal. See {@link Numbas.jme.checkingFunctions}.
     * @property {Number} vsetRangeStart - The lower bound of the range to pick variable values from.
     * @property {Number} vsetRangeEnd - The upper bound of the range to pick variable values from.
     * @property {Number} vsetRangePoints - The number of values to pick for each variable.
     * @property {Number} checkingAccuracy - A parameter for the checking function to determine if two results are equal. See {@link Numbas.jme.checkingFunctions}.
     * @property {Number} failureRate - The number of times the comparison must fail to declare that the expressions are unequal.
     */
    /** Compare two expressions over some randomly selected points in the space of variables, to decide if they're equal.
     * @param {JME} expr1
     * @param {JME} expr2
     * @param {Numbas.jme.compare_settings} settings
     * @param {Numbas.jme.Scope} scope
     * @returns {Boolean}
     */
    compare: function(expr1,expr2,settings,scope) {
        expr1 += '';
        expr2 += '';
        var compile = jme.compile, evaluate = jme.evaluate;
        var checkingFunction = checkingFunctions[settings.checkingType.toLowerCase()];    //work out which checking type is being used
        try {
            var tree1 = compile(expr1,scope);
            var tree2 = compile(expr2,scope);
            if(tree1 == null || tree2 == null)
            {    //one or both expressions are invalid, can't compare
                return false;
            }
            //find variable names used in both expressions - can't compare if different
            var vars1 = findvars(tree1);
            var vars2 = findvars(tree2);
            for(var v in scope.allVariables()) {
                delete vars1[v];
                delete vars2[v];
            }
            if( !varnamesAgree(vars1,vars2) )
            {    //whoops, differing variables
                return false;
            }
            if(vars1.length)
            {    // if variables are used,  evaluate both expressions over a random selection of values and compare results
                var errors = 0;
                var rs = randoms(vars1, settings.vsetRangeStart, settings.vsetRangeEnd, settings.vsetRangePoints);
                for(var i = 0; i<rs.length; i++) {
                    var nscope = new jme.Scope([scope,{variables:rs[i]}]);
                    var r1 = evaluate(tree1,nscope);
                    var r2 = evaluate(tree2,nscope);
                    if( !resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy) ) { errors++; }
                }
                if(errors < settings.failureRate) {
                    return true;
                }else{
                    return false;
                }
            } else {
                //if no variables used, can just evaluate both expressions once and compare
                r1 = evaluate(tree1,scope);
                r2 = evaluate(tree2,scope);
                return resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy);
            }
        }
        catch(e) {
            return false;
        }
    },
    /** Substitute variables into content. To substitute variables, use {@link Numbas.jme.variables.DOMcontentsubvars}.
     * @param {String} str
     * @param {Numbas.jme.Scope} scope
     * @returns {String}
     */
    contentsubvars: function(str, scope)
    {
        var bits = util.contentsplitbrackets(str);    //split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
        for(var i=0; i<bits.length; i+=4)
        {
            bits[i] = jme.subvars(bits[i],scope,true);
        }
        return bits.join('');
    },
    /** Split up a TeX expression, finding the \var and \simplify commands.
     * Returns an array [normal tex,var or simplify,options,argument,normal tex,...]a
     * @param {String} s
     * @returns {Array.<String>}
     */
    texsplit: function(s)
    {
        var cmdre = /^((?:.|[\n\r])*?)\\(var|simplify)/m;
        var out = [];
        var m;
        while( m = s.match(cmdre) )
        {
            out.push(m[1]);
            var cmd = m[2];
            out.push(cmd);
            var i = m[0].length;
            var args = '';
            var argbrackets = false;
            if( s.charAt(i) == '[' )
            {
                argbrackets = true;
                var si = i+1;
                while(i<s.length && s.charAt(i)!=']')
                    i++;
                if(i==s.length)
                    throw(new Numbas.Error('jme.texsubvars.no right bracket',{op:cmd}));
                else
                {
                    args = s.slice(si,i);
                    i++;
                }
            }
            if(!argbrackets)
                args='all';
            out.push(args);
            if(s.charAt(i)!='{')
            {
                throw(new Numbas.Error('jme.texsubvars.missing parameter',{op:cmd,parameter:s}));
            }
            var brackets=1;
            var si = i+1;
            while(i<s.length-1 && brackets>0)
            {
                i++;
                if(s.charAt(i)=='{')
                    brackets++;
                else if(s.charAt(i)=='}')
                    brackets--;
            }
            if(i == s.length-1 && brackets>0)
                throw(new Numbas.Error('jme.texsubvars.no right brace',{op:cmd}));
            var expr = s.slice(si,i);
            s = s.slice(i+1);
            out.push(expr);
        }
        out.push(s);
        return out;
    },
    /** Dictionary of functions
     * type: function(value,display:boolean) -> string
     * which convert a JME token to a string for display
     */
    typeToDisplayString: {
        'number': function(v) {
            return ''+Numbas.math.niceNumber(v.value)+'';
        },
        'string': function(v,display) {
            return v.value;
        },
    },
    /** Produce a string representation of the given token, for display
     * @param {Numbas.jme.token} v
     * @see Numbas.jme.typeToDisplayString
     * @returns {String}
     */
    tokenToDisplayString: function(v) {
        if(v.type in jme.typeToDisplayString) {
            return jme.typeToDisplayString[v.type](v);
        } else {
            return jme.display.treeToJME({tok:v});
        }
    },
    /** Substitute variables into a text string (not maths).
     * @param {String} str
     * @param {Numbas.jme.Scope} scope
     * @param {Boolean} [display=false] - Is this string going to be displayed to the user? If so, avoid unnecessary brackets and quotes.
     */
    subvars: function(str, scope,display)
    {
        var bits = util.splitbrackets(str,'{','}');
        if(bits.length==1)
        {
            return str;
        }
        var out = '';
        for(var i=0; i<bits.length; i++)
        {
            if(i % 2)
            {
                var v = jme.evaluate(jme.compile(bits[i],scope),scope);
                if(display) {
                    v = jme.tokenToDisplayString(v);
                } else {
                    if(v.type=='number') {
                        v = '('+Numbas.jme.display.treeToJME({tok:v},{niceNumber: false})+')';
                    } else if(v.type=='string') {
                        v = "'"+v.value+"'";
                    } else {
                        v = jme.display.treeToJME({tok:v},{niceNumber: false});
                    }
                }
                out += v;
            }
            else
            {
                out+=bits[i];
            }
        }
        return out;
    },
    /** Unwrap a {@link Numbas.jme.token} into a plain JavaScript value
     * @param {Numbas.jme.token} v
     * @returns {Object}
     */
    unwrapValue: function(v) {
        switch(v.type) {
            case 'list':
                return v.value.map(jme.unwrapValue);
            case 'dict':
                var o = {};
                Object.keys(v.value).forEach(function(key) {
                    o[key] = jme.unwrapValue(v.value[key]);
                });
                return o;
            case 'name':
                return v.name;
            case 'expression':
                return v.tree;
            default:
                return v.value;
        }
    },
    /** Wrap up a plain JavaScript value (number, string, bool or array) as a {@link Numbas.jme.token}.
     * @param {Object} v
     * @param {String} typeHint - name of the expected type (to differentiate between, for example, matrices, vectors and lists
     * @returns {Numbas.jme.token}
     */
    wrapValue: function(v,typeHint) {
        switch(typeof v) {
        case 'number':
            return new jme.types.TNum(v);
        case 'string':
            var s = new jme.types.TString(v);
            s.safe = true;
            return s;
        case 'boolean':
            return new jme.types.TBool(v);
        default:
            switch(typeHint) {
                case 'html':
                    return v;
                default:
                    if(Array.isArray(v)) {
                        // it would be nice to abstract this, but some types need the arguments to be wrapped, while others don't
                        switch(typeHint) {
                        case 'matrix':
                            return new jme.types.TMatrix(v);
                        case 'vector':
                            return new jme.types.TVector(v);
                        case 'range':
                            return new jme.types.TRange(v);
                        case 'set':
                            v = v.map(jme.wrapValue);
                            return new jme.types.TSet(v);
                        default:
                            v = v.map(jme.wrapValue);
                            return new jme.types.TList(v);
                        }
                    } else if(v===null || v===undefined) { // CONTROVERSIAL! Cast null to the empty string, because we don't have a null type.
                        return new jme.types.TString('');
                    } else if(v!==null && typeof v=='object' && v.type===undefined) {
                        var o = {};
                        Object.keys(v).forEach(function(key) {
                            o[key] = jme.wrapValue(v[key]);
                        });
                        return new jme.types.TDict(o);
                    }
                    return v;
            }
        }
    },
    /** Is a token a TOp?
     *
     * @param {Numbas.jme.token}
     *
     * @returns {Boolean}
     */
    isOp: function(tok,op) {
        return tok.type=='op' && tok.name==op;
    },
    /** Is a token a TName?
     *
     * @param {Numbas.jme.token}
     *
     * @returns {Boolean}
     */
    isName: function(tok,name) {
        return tok.type=='name' && tok.name==name;
    },
    /** Is a token a TFunction?
     *
     * @param {Numbas.jme.token}
     *
     * @returns {Boolean}
     */
    isFunction: function(tok,name) {
        return tok.type=='function' && tok.name==name;
    },
    /** Does this expression behave randomly?
     *  True if it contains any instances of functions or operations, defined in the given scope, which could behave randomly.
     *
     *  @param {Numbas.jme.tree} expr
     *  @param {Numbas.jme.Scope} scope
     *  @returns {Boolean}
     */
    isRandom: function(expr,scope) {
        switch(expr.tok.type) {
            case 'op':
            case 'function':
                // a function application is random if its definition is marked as random,
                // or if any of its arguments are random
                var op = expr.tok.name.toLowerCase();
                var fns = scope.getFunction(op);
                if(fns) {
                    for(var i=0;i<fns.length;i++) {
                        var fn = fns[i]
                        if(fn.random===undefined && fn.language=='jme') {
                            fn.random = false; // put false in to avoid infinite recursion if fn is defined in terms of another function which itself uses fn
                            fn.random = jme.isRandom(fn.tree,scope);
                        }
                        if(fn.random) {
                            return true;
                        }
                    }
                }
                for(var i=0;i<expr.args.length;i++) {
                    if(jme.isRandom(expr.args[i],scope)) {
                        return true;
                    }
                }
                return false;
            default:
                if(!expr.args) {
                    return false;
                }
                for(var i=0;i<expr.args.length;i++) {
                    if(jme.isRandom(expr.args[i],scope)) {
                        return true;
                    }
                }
                return false;
        }
    },

    /** Is this a monomial - a single term of the form x^n or m*x^n, where m and n are numbers?
     * @param {Numbas.jme.tree}
     * @returns {Object} the degree of the monomial
     */
    isMonomial: function(tree) {
        function unwrapUnaryMinus(tree) {
            while(jme.isOp(tree.tok,'-u')) {
                tree = tree.args[0];
            }
            return tree;
        }
        var coefficient;
        if(jme.isOp(tree.tok,'*')) {
            if(unwrapUnaryMinus(tree.args[0]).tok.type!='number') {
                return false;
            }
            coefficient = tree.args[0];
            tree = tree.args[1];
        } else if(jme.isOp(tree.tok,'-u')) {
            coefficient = {tok:new TNum(-1)};
            tree = tree.args[0];
        } else {
            coefficient = {tok:new TNum(1)};
        }
        if(tree.tok.type=='name') {
            return {base:tree, degree:1, coefficient: coefficient};
        }
        if(jme.isOp(tree.tok,'^') && tree.args[0].tok.type=='name' && unwrapUnaryMinus(tree.args[1]).tok.type=='number') {
            return {base:tree.args[0], degree:tree.args[1].tok.value, coefficient: coefficient};
        }
        return false;
    }
};

/** Options for {@link Numbas.jme.Parser}
 *
 * @typedef {Object} Numbas.jme.parser_options
 * @property {Boolean} closeMissingBrackets - Silently ignore "missing right bracket" errors?
 * @property {Boolean} addMissingArguments - When an op or function call is missing required arguments, insert `?` as a placeholder.
 */

/** A parser for {@link JME} expressions
 * @memberof Numbas.jme
 * @constructor
 * 
 * @param {Numbas.jme.parser_options} options
 */
var Parser = jme.Parser = function(options) {
    this.options = util.extend_object({}, this.option_defaults, options);
}
jme.Parser.prototype = /** @lends Numbas.jme.Parser.prototype */ {
    /** Default options for new parsers
     * @type {Numbas.jme.parser_options}
     */
    option_defaults: {
        closeMissingBrackets: false,
        addMissingArguments: false
    },
    /** Regular expressions to match tokens 
     * @type {Object.<RegExp>}
     */
    re: {
        re_bool: /^(true|false)(?![a-zA-Z_0-9'])/i,
        re_number: /^[0-9]+(?:\x2E[0-9]+)?/,
        re_name: /^{?((?:(?:[a-zA-Z]+):)*)((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?\??|[π∞])}?/i,
        re_op: /^(\.\.|#|<=|>=|<>|&&|\|\||[\|*+\-\/\^<>=!&;÷×∈∧∨⟹≠≥≤]|(?:(not|and|or|xor|implies|isa|except|in|divides)([^a-zA-Z0-9_']|$)))/i,
        re_punctuation: /^([\(\),\[\]])/,
        re_string: /^("""|'''|['"])((?:[^\1\\]|\\.)*?)\1/,
        re_comment: /^\/\/.*(?:\n|$)/,
        re_keypair: /^:/
    },
    /** Convert given expression string to a list of tokens. Does some tidying, e.g. inserts implied multiplication symbols.
     * @param {JME} expr
     * @returns {Array.<Numbas.jme.token>}
     * @see Numbas.jme.Parser#compile
     */
    tokenise: function(expr) {
        if(!expr)
            return [];
        expr += '';
        var oexpr = expr;
        var pos = 0;
        var olen = expr.length;
        expr = expr.replace(this.re.re_strip_whitespace, '');    //get rid of whitespace
        pos += olen - expr.length;
        var tokens = [];
        var i = 0;
        while( expr.length ) {
            olen = expr.length;
            expr = expr.replace(this.re.re_strip_whitespace, '');    //get rid of whitespace
            pos += olen-expr.length;
            var token_pos= pos;
            var result;
            var token;
            while(result=expr.match(this.re.re_comment)) {
                olen = expr.length;
                expr=expr.slice(result[0].length).replace(this.re.re_strip_whitespace,'');
                pos += olen-expr.length;
            }
            if(result = expr.match(this.re.re_number)) {
                token = new TNum(result[0]);
                if(tokens.length>0 && (tokens[tokens.length-1].type==')' || tokens[tokens.length-1].type=='name'))    //right bracket followed by a number is interpreted as multiplying contents of brackets by number
                {
                    tokens.push(new TOp('*'));
                }
            } else if (result = expr.match(this.re.re_bool)) {
                token = new TBool(util.parseBool(result[0]));
                result[0] = result[1];
            } else if (result = expr.match(this.re.re_op)) {
                if(result[2])        //if word-ish operator
                    result[0] = result[2];
                token = result[0];
                //work out if operation is being used prefix or postfix
                var nt;
                var postfix = false;
                var prefix = false;
                if(token in opSynonyms) {
                    token = opSynonyms[token];
                }
                if( tokens.length==0 || (nt=tokens[tokens.length-1].type)=='(' || nt==',' || nt=='[' || (nt=='op' && !tokens[tokens.length-1].postfix) || nt=='keypair' )
                {
                    if(token in prefixForm) {
                        token = prefixForm[token];
                        prefix = true;
                    }
                }
                else
                {
                    if(token in postfixForm) {
                        token = postfixForm[token];
                        postfix = true;
                    }
                }
                token=new TOp(token,postfix,prefix);
            } else if (result = expr.match(this.re.re_name)) {
                var name = result[2];
                var annotation = result[1] ? result[1].split(':').slice(0,-1) : null;
                if(!annotation) {
                    var lname = name.toLowerCase();
                    // fill in constants here to avoid having more 'variables' than necessary
                    if(lname in jme.constants) {
                        token = new TNum(jme.constants[lname]);
                    } else {
                        token = new TName(name);
                    }
                } else {
                    token = new TName(name,annotation);
                }
                if(tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type=='name' || tokens[tokens.length-1].type==')')) {    //number or right bracket or name followed by a name, eg '3y', is interpreted to mean multiplication, eg '3*y'
                    tokens.push(new TOp('*'));
                }
            } else if (result = expr.match(this.re.re_punctuation)) {
                if(result[0]=='(' && tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type==')')) {    //number or right bracket followed by left parenthesis is also interpreted to mean multiplication
                    tokens.push(new TOp('*'));
                }
                token = new TPunc(result[0]);
            } else if (result = expr.match(this.re.re_string)) {
                var str = result[2];
                token = new TString(jme.unescape(str));
            } else if(result = expr.match(this.re.re_keypair)) {
                if(tokens.length==0 || tokens[tokens.length-1].type!='string') {
                    throw(new Numbas.Error('jme.tokenise.keypair key not a string',{type: tokens[tokens.length-1].type}));
                }
                token = new TKeyPair(tokens.pop().value);
            } else if(expr.length) {
                //invalid character or not able to match a token
                var position = oexpr.length - expr.length;
                var nearby = oexpr.slice(Math.max(0,position), position+5);
                throw(new Numbas.Error('jme.tokenise.invalid near',{expression:oexpr, position: position, nearby: nearby}));
            } else {
                break;
            }
            expr=expr.slice(result[0].length);    //chop found token off the expression
            pos += result[0].length;
            token.pos = token_pos;
            tokens.push(token);
        }
        return(tokens);
    },
    /** Shunt list of tokens into a syntax tree. Uses the shunting yard algorithm (wikipedia has a good description)
     * @param {Array.<Numbas.jme.token>} tokens
     * @returns {Numbas.jme.tree}
     * @see Numbas.jme.Parser#tokenise
     * @see Numbas.jme.Parser#compile
     */
    shunt: function(tokens) {
        var parser = this;
        var output = [];
        var stack = [];
        var numvars=[],olength=[],listmode=[];
        function addoutput(tok) {
            if(tok.vars!==undefined) {
                if(output.length<tok.vars) {
                    if(!parser.options.addMissingArguments) {
                        throw(new Numbas.Error('jme.shunt.not enough arguments',{op:tok.name || tok.type}));
                    } else {
                        for(var i=output.length;i<tok.vars;i++) {
                            var tvar = new types.TName('?');
                            tvar.added_missing = true;
                            output.push({tok:tvar});
                        }
                    }
                }
                var thing = {
                    tok: tok,
                    args: output.splice(output.length-tok.vars,tok.vars)
                };
                if(tok.type=='list') {
                    var mode = null;
                    for(var i=0;i<thing.args.length;i++) {
                        var argmode = thing.args[i].tok.type=='keypair' ? 'dictionary' : 'list';
                        if(i>0 && argmode!=mode) {
                            throw(new Numbas.Error('jme.shunt.list mixed argument types',{mode: mode, argmode: argmode}));
                        }
                        mode = argmode;
                    }
                    if(mode=='dictionary') {
                        thing.tok = new TDict();
                    }
                }
                output.push(thing);
            }
            else {
                output.push({tok:tok});
            }
        }
        var type_actions = {
            'number': addoutput,
            'string': addoutput,
            'boolean': addoutput,
            'name': function(tok) {
                // if followed by an open bracket, this is a function application
                if( i<tokens.length-1 && tokens[i+1].type=="(") {
                        if(funcSynonyms[tok.name]) {
                            tok.name=funcSynonyms[tok.name];
                        }
                        stack.push(new TFunc(tok.name,tok.annotation));
                        numvars.push(0);
                        olength.push(output.length);
                } else {
                    //this is a variable otherwise
                    addoutput(tok);
                }
            },
            ',': function(tok) {
                //reached end of expression defining function parameter, so pop all of its operations off stack and onto output
                while( stack.length && stack[stack.length-1].type != "(" && stack[stack.length-1].type != '[') {
                    addoutput(stack.pop())
                }
                numvars[numvars.length-1]++;
                if( ! stack.length ) {
                    throw(new Numbas.Error('jme.shunt.no left bracket in function'));
                }
            },
            'op': function(tok) {
                if(!tok.prefix) {
                    var o1 = precedence[tok.name];
                    //while ops on stack have lower precedence, pop them onto output because they need to be calculated before this one. left-associative operators also pop off operations with equal precedence
                    while(
                            stack.length &&
                            stack[stack.length-1].type=="op" &&
                            (
                             (o1 > precedence[stack[stack.length-1].name]) ||
                             (
                              leftAssociative(tok.name) &&
                              o1 == precedence[stack[stack.length-1].name]
                             )
                            )
                    ) {
                        addoutput(stack.pop());
                    }
                }
                stack.push(tok);
            },
            '[': function(tok) {
                if(i==0 || tokens[i-1].type=='(' || tokens[i-1].type=='[' || tokens[i-1].type==',' || tokens[i-1].type=='op' || tokens[i-1].type=='keypair') {
                    listmode.push('new');
                }
                else {
                    listmode.push('index');
                }
                stack.push(tok);
                numvars.push(0);
                olength.push(output.length);
            },
            ']': function(tok) {
                while( stack.length && stack[stack.length-1].type != "[" ) {
                    addoutput(stack.pop());
                }
                if( ! stack.length ) {
                    throw(new Numbas.Error('jme.shunt.no left square bracket'));
                } else {
                    stack.pop();    //get rid of left bracket
                }
                //work out size of list
                var n = numvars.pop();
                var l = olength.pop();
                if(output.length>l) {
                    n++;
                }
                switch(listmode.pop()) {
                case 'new':
                    addoutput(new TList(n))
                    break;
                case 'index':
                    var f = new TFunc('listval');
                    f.vars = 2;
                    addoutput(f);
                    break;
                }
            },
            '(': function(tok) {
                stack.push(tok);
            },
            ')': function(tok) {
                while( stack.length && stack[stack.length-1].type != "(" ) {
                    addoutput(stack.pop());
                }
                if( ! stack.length ) {
                    throw(new Numbas.Error('jme.shunt.no left bracket'));
                } else {
                    stack.pop();    //get rid of left bracket
                    //if this is a function call, then the next thing on the stack should be a function name, which we need to pop
                    if( stack.length && stack[stack.length-1].type=="function")
                    {
                        //work out arity of function
                        var n = numvars.pop();
                        var l = olength.pop();
                        if(output.length>l)
                            n++;
                        var f = stack.pop();
                        f.vars = n;
                        addoutput(f);
                    }
                }
            },
            'keypair': function(tok) {
                stack.push(tok);
            }
        };
        function shunt_token(tok) {
            if(tok.type in type_actions) {
                type_actions[tok.type](tok);
            }
        }
        for(var i = 0;i < tokens.length; i++ ) {
            var tok = tokens[i];
            shunt_token(tok);
        }
        //pop all remaining ops on stack into output
        while(stack.length) {
            var x = stack[stack.length-1];
            if(x.type=="(") {
                if(!this.options.closeMissingBrackets) {
                    throw(new Numbas.Error('jme.shunt.no right bracket'));
                } else {
                    type_actions[')']();
                }
            } else {
                stack.pop();
                addoutput(x);
            }
        }
        if(listmode.length>0) {
            throw(new Numbas.Error('jme.shunt.no right square bracket'));
        }
        if(output.length>1) {
            throw(new Numbas.Error('jme.shunt.missing operator'));
        }
        return(output[0]);
    },

    /** Compile an expression string to a syntax tree. (Runs {@link Numbas.jme.tokenise} then {@Link Numbas.jme.shunt})
     * @param {JME} expr
     * @see Numbas.jme.Parser#tokenise
     * @see Numbas.jme.Parser#shunt
     * @returns {Numbas.jme.tree}
     */
    compile: function(expr) {
        //make sure expression is a string and not a number or anything like that
        expr += '';
        if(!expr.trim().length) {
            return null;
        }
        //tokenise expression
        var tokens = this.tokenise(expr);
        //compile to parse tree
        var tree = this.shunt(tokens);
        if(tree===null) {
            return;
        }
        return(tree);
    },
}
/** Regular expression to match whitespace (because '\s' doesn't match *everything*) */
jme.Parser.prototype.re.re_whitespace = '(?:[\\s \\f\\n\\r\\t\\v\\u00A0\\u2028\\u2029]|(?:\&nbsp;))';
jme.Parser.prototype.re.re_strip_whitespace = new RegExp('^'+jme.Parser.prototype.re.re_whitespace+'+');

/** Regular expressions for parser tokens.
 * Included for backwards-compatibility
 * @type {Object.<RegExp>}
 * @see {Numbas.jme.Parser.re}
 */
jme.re = jme.Parser.prototype.re;

var fnSort = util.sortBy('id');
/** Options for the {@link Numbas.jme.funcObj} constructor
 * @typedef {Object} Numbas.jme.scope_deletions
 * @property {Object} variables - Names of deleted variables.
 * @property {Object} functions - Names of deleted functions.
 * @property {Object} rulesets - Names of deleted rulesets.
 */

/**
 * A JME evaluation environment.
 * Stores variable, function, and ruleset definitions.
 *
 * A scope may have a parent; elements of the scope are resolved by searching up through the hierarchy of parents until a match is found.
 *
 * @memberof Numbas.jme
 * @constructor
 * @property {Object.<Numbas.jme.token>} variables - Dictionary of variables defined **at this level in the scope**. To resolve a variable in the scope, use {@link Numbas.jme.Scope.getVariable}.
 * @property {Object.<Array.<Numbas.jme.funcObj>>} functions - Dictionary of functions defined at this level in the scope. Function names map to lists of functions: there can be more than one function for each name because of multiple dispatch. To resolve a function name in the scope, use {@link Numbas.jme.Scope.getFunction}.
 * @property {Object.<Numbas.jme.rules.Ruleset>} rulesets - Dictionary of rulesets defined at this level in the scope. To resolve a ruleset in the scope, use {@link Numbas.jme.Scope.getRuleset}.
 * @property {Numbas.jme.scope_deletions} deleted - Names of deleted variables/functions/rulesets.
 * @property {Numbas.Question} question - The question this scope belongs to.
 *
 * @param {Numbas.jme.Scope[]} scopes - Either: nothing, in which case this scope has no parents; a parent Scope object; a list whose first element is a parent scope, and the second element is a dictionary of extra variables/functions/rulesets to store in this scope
 */
var Scope = jme.Scope = function(scopes) {
    this.variables = {};
    this.functions = {};
    this._resolved_functions = {};
    this.rulesets = {};
    this.deleted = {
        variables: {},
        functions: {},
        rulesets: {}
    }
    if(scopes===undefined) {
        return;
    }
    if(!Array.isArray(scopes)) {
        scopes = [scopes,undefined];
    }
    this.question = scopes[0].question || this.question;
    var extras;
    if(!scopes[0].evaluate) {
        extras = scopes[0];
    } else {
        this.parent = scopes[0];
        extras = scopes[1] || {};
    }
    if(extras) {
        if(extras.variables) {
            for(var x in extras.variables) {
                this.setVariable(x,extras.variables[x]);
            }
        }
        this.rulesets = extras.rulesets || this.rulesets;
        this.functions = extras.functions || this.functions;
    }
    return;
}
Scope.prototype = /** @lends Numbas.jme.Scope.prototype */ {
    /** Add a JME function to the scope.
     * @param {Numbas.jme.funcObj} fn - function to add
     */
    addFunction: function(fn) {
        if(!(fn.name in this.functions)) {
            this.functions[fn.name] = [fn];
        } else {
            this.functions[fn.name].push(fn);
            delete this._resolved_functions[fn.name];
        }
    },
    /** Mark the given variable name as deleted from the scope.
     * @param {String} name
     */
    deleteVariable: function(name) {
        this.deleted.variables[name] = true;
    },
    /** Get the object with given name from the given collection
     * @param {String} collection - name of the collection. A property of this Scope object, i.e. one of `variables`, `functions`, `rulesets`.
     * @param {String} name - the name of the object to retrieve
     * @returns {Object}
     */
    resolve: function(collection,name) {
        var scope = this;
        while(scope) {
            if(scope.deleted[collection][name]) {
                return;
            }
            if(scope[collection][name]!==undefined) {
                return scope[collection][name];
            }
            scope = scope.parent;
        }
    },
    /** Find the value of the variable with the given name, if it's defined
     * @param {String} name
     * @returns {Numbas.jme.token}
     */
    getVariable: function(name) {
        return this.resolve('variables',name.toLowerCase());
    },
    /** Set the given variable name
     * @param {String} name
     * @param {Numbas.jme.token} value
     */
    setVariable: function(name, value) {
        this.variables[name.toLowerCase()] = value;
    },
    /** Get all definitions of the given function name.
     * @param {String} name
     * @returns {Numbas.jme.funcObj[]} A list of all definitions of the given name.
     */
    getFunction: function(name) {
        if(!this._resolved_functions[name]) {
            var scope = this;
            var o = [];
            while(scope) {
                if(scope.functions[name]!==undefined) {
                    o = o.merge(scope.functions[name],fnSort);
                }
                scope = scope.parent;
            }
            this._resolved_functions[name] = o;
        }
        return this._resolved_functions[name];
    },
    /** Get the ruleset with the gien name
     * @param {String} name
     * @returns {Numbas.jme.rules.Ruleset}
     */
    getRuleset: function(name) {
        return this.resolve('rulesets',name);
    },
    /** Set the given ruleset name
     * @param {String} name
     * @param {Numbas.jme.rules.Ruleset[]} rules
     */
    setRuleset: function(name, rules) {
        this.rulesets[name] = this.rulesets[name.toLowerCase()] = rules;
    },
    /** Collect together all items from the given collection
     * @param {String} collection - name of the collection. A property of this Scope object, i.e. one of `variables`, `functions`, `rulesets`.
     * @returns {Object} a dictionary of names to values
     */
    collect: function(collection,name) {
        var scope = this;
        var deleted = {};
        var out = {};
        var name;
        while(scope) {
            for(var name in scope.deleted[collection]) {
                deleted[name] = scope.deleted[collection][name];
            }
            for(name in scope[collection]) {
                if(!deleted[name]) {
                    out[name] = out[name] || scope[collection][name];
                }
            }
            scope = scope.parent;
        }
        return out;
    },
    /** Gather all variables defined in this scope
     * @returns {Object.<Numbas.jme.token>} a dictionary of variables
     */
    allVariables: function() {
        return this.collect('variables');
    },
    /** Gather all rulesets defined in this scope
     * @returns {Object.<Numbas.jme.rules.Ruleset>} a dictionary of rulesets
     */
    allRulesets: function() {
        return this.collect('rulesets');
    },
    /** Gather all functions defined in this scope
     * @returns {Object.<Numbas.jme.funcObj[]>} a dictionary of function definitions: each name maps to a list of @link{Numbas.jme.funcObj}
     */
    allFunctions: function() {
        var scope = this;
        var out = {}
        var name;
        function add(name,fns) {
            if(!out[name]) {
                out[name] = [];
            }
            out[name] = out[name].merge(fns,fnSort);
        }
        while(scope) {
            for(var name in scope.functions) {
                add(name,scope.functions[name])
            }
            scope = scope.parent;
        }
        return out;
    },
    /** Gather all members of this scope into this scope object.
     * A backwards-compatibility hack for questions that use `question.scope.variables.x`
     * Shouldn't be applied to any scope other than the question scope.
     */
    flatten: function() {
        this.variables = this.allVariables();
        this.rulesets = this.allRulesets();
    },
    /** Evaluate an expression in this scope - equivalent to `Numbas.jme.evaluate(expr,this)`
     * @param {JME} expr
     * @param {Object.<Numbas.jme.token|Object>} [variables] - Dictionary of variables to sub into expression. Values are automatically wrapped up as JME types, so you can pass raw JavaScript values.
     * @param {Boolean} [noSubstitution] - if true, don't substitute variable values from the scope into the expression.
     * @returns {Numbas.jme.token}
     */
    evaluate: function(expr,variables, noSubstitution) {
        var scope = this;
        if(variables) {
            scope = new Scope([this]);
            for(var name in variables) {
                scope.variables[name] = jme.wrapValue(variables[name]);
            }
        }
        //if a string is given instead of an expression tree, compile it to a tree
        var tree;
        if( typeof(expr)=='string' ) {
            tree = jme.compile(expr,scope);
        } else {
            tree = expr;
        }
        if(!tree) {
            return null;
        }
        if(!noSubstitution) {
            tree = jme.substituteTree(tree,scope,true);
        }
        var tok = tree.tok;
        switch(tok.type)
        {
        case 'number':
        case 'boolean':
        case 'range':
            return tok;
        case 'list':
            if(tok.value===undefined)
            {
                var value = [];
                for(var i=0;i<tree.args.length;i++)
                {
                    value[i] = scope.evaluate(tree.args[i],null,noSubstitution);
                }
                tok = new TList(value);
            }
            return tok;
        case 'dict':
            if(tok.value===undefined) {
                var value = {};
                for(var i=0;i<tree.args.length;i++) {
                    var kp = tree.args[i];
                    value[kp.tok.key] = scope.evaluate(kp.args[0],null,noSubstitution);
                }
                tok = new TDict(value);
            }
            return tok;
        case 'string':
            var value = tok.value;
            if(!tok.safe && value.contains('{')) {
                value = jme.contentsubvars(value,scope)
                var t = new TString(value);
                t.latex = tok.latex
                return t;
            } else {
                return tok;
            }
        case 'name':
            var v = scope.getVariable(tok.name.toLowerCase());
            if(v && !noSubstitution) {
                return v;
            } else {
                tok = new TName(tok.name);
                tok.unboundName = true;
                return tok;
            }
        case 'op':
        case 'function':
            var op = tok.name.toLowerCase();
            if(lazyOps.indexOf(op)>=0) {
                return scope.getFunction(op)[0].evaluate(tree.args,scope);
            }
            else {
                for(var i=0;i<tree.args.length;i++) {
                    tree.args[i] = scope.evaluate(tree.args[i],null,noSubstitution);
                }
                var matchedFunction;
                var fns = scope.getFunction(op);
                if(fns.length==0)
                {
                    if(tok.type=='function') {
                        //check if the user typed something like xtan(y), when they meant x*tan(y)
                        var possibleOp = op.slice(1);
                        if(op.length>1 && scope.getFunction(possibleOp).length) {
                            throw(new Numbas.Error('jme.typecheck.function maybe implicit multiplication',{name:op,first:op[0],possibleOp:possibleOp}));
                        } else {
                            throw(new Numbas.Error('jme.typecheck.function not defined',{op:op,suggestion:op}));
                        }
                    }
                    else {
                        throw(new Numbas.Error('jme.typecheck.op not defined',{op:op}));
                    }
                }
                for(var j=0;j<fns.length; j++)
                {
                    var fn = fns[j];
                    if(fn.typecheck(tree.args))
                    {
                        matchedFunction = fn;
                        break;
                    }
                }
                if(matchedFunction)
                    return matchedFunction.evaluate(tree.args,scope);
                else {
                    for(var i=0;i<=tree.args.length;i++) {
                        if(tree.args[i] && tree.args[i].unboundName) {
                            throw(new Numbas.Error('jme.typecheck.no right type unbound name',{name:tree.args[i].name}));
                        }
                    }
                    throw(new Numbas.Error('jme.typecheck.no right type definition',{op:op}));
                }
            }
        default:
            return tok;
        }
    }
};
/** @typedef {Object} Numbas.jme.token
 * @property {String} type
 * @see Numbas.jme.types
 */
/** The data types supported by JME expressions
 * @namespace Numbas.jme.types
 */
var types = jme.types = {}
/** Nothing type.
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @constructor
 */
var TNothing = types.TNothing = types.nothing = function() {};
TNothing.prototype.type = 'nothing';
/** Number type.
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Number} value
 * @property {String|Number|complex} originalValue - the value used to construct the token - either a string, a number, or a complex number object
 * @property type "number"
 * @constructor
 * @param {Number} num
 */
var TNum = types.TNum = types.number = function(num)
{
    if(num===undefined)
        return;
    this.originalValue = num;
    switch(typeof(num)) {
        case 'object':
            if(num.complex) {
                this.value = num;
            } else {
                throw(new Numbas.Error("jme.tokenise.number.object not complex"));
            }
            break;
        case "number":
            this.value = num;
            break;
        case "string":
            this.value = parseFloat(num);
            break;
    }
    this.value = num.complex ? num : parseFloat(num);
}
TNum.prototype.type = 'number';
TNum.doc = {
    name: 'number',
    usage: ['0','1','0.234','i','e','pi'],
    description: "@i@, @e@, @infinity@ and @pi@ are reserved keywords for the imaginary unit, the base of the natural logarithm, $\\infty$ and $\\pi$, respectively."
};
/** String type.
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {String} value
 * @property {Boolean} latex - is this string LaTeX code? If so, it's displayed as-is in math mode
 * @property {Boolean} safe - if true, don't run {@link Numbas.jme.subvars} on this token when it's evaluated
 * @property {String} type "string"
 * @constructor
 * @param {String} s
 */
var TString = types.TString = types.string = function(s)
{
    this.value = s;
}
TString.prototype.type = 'string';
TString.doc = {
    name: 'string',
    usage: ['\'hello\'','"hello"'],
    description: "Use strings to create non-mathematical text."
};
/** Boolean type
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Boolean} value
 * @property type "boolean"
 * @constructor
 * @param {Boolean} b
 */
var TBool = types.TBool = types.boolean = function(b)
{
    this.value = b;
}
TBool.prototype.type = 'boolean';
TBool.doc = {
    name: 'boolean',
    usage: ['true','false'],
    description: "Booleans represent either truth or falsity. The logical operations @and@, @or@ and @xor@ operate on and return booleans."
}
/** HTML DOM element
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Element} value
 * @property type "html"
 * @constructor
 * @param {Element} html
 */
var THTML = types.THTML = types.html = function(html) {
    if(html.ownerDocument===undefined && !html.jquery) {
        throw(new Numbas.Error('jme.thtml.not html'));
    }
    if(window.jQuery) {
        this.value = $(html);
    } else {
        var elem = document.createElement('div');
        elem.innerHTML = html;
        this.value = elem.children;
    }
}
THTML.prototype.type = 'html';
THTML.doc = {
    name: 'html',
    usage: ['html(\'<div>things</div>\')'],
    description: "An HTML DOM node."
}
/** List of elements of any data type
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Number} vars - Length of list
 * @property {Array.<Numbas.jme.token>} value - Values (may not be filled in if the list was created empty)
 * @property type "html"
 * @constructor
 * @param {Number|Array.<Numbas.jme.token>} value - Either the size of the list, or an array of values
 */
var TList = types.TList = types.list = function(value)
{
    switch(typeof(value))
    {
    case 'number':
        this.vars = value;
        break;
    case 'object':
        this.value = value;
        this.vars = value.length;
        break;
    default:
        this.vars = 0;
    }
}
TList.prototype.type = 'list';
TList.doc = {
    name: 'list',
    usage: ['[0,1,2,3]','[a,b,c]','[true,false,false]'],
    description: "A list of elements of any data type."
};
/** Key-value pair assignment
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {String} key
 * @constructor
 * @param {String} key
 */
var TKeyPair = types.TKeyPair = types.keypair = function(key) {
    this.key = key;
}
TKeyPair.prototype = {
    type: 'keypair',
    vars: 1
}
/** Dictionary: map strings to values
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Object.<Numbas.jme.token>} value - Map strings to tokens. Undefined until this token is evaluated.
 * @property type "dict"
 * @constructor
 * @param {Object.<Numbas.jme.token>} value
 */
var TDict = types.TDict = types.dict = function(value) {
    this.value = value;
}
TDict.prototype = {
    type: 'dict'
}
/** Set type: a collection of elements, with no duplicates
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<Numbas.jme.token>} value - Array of elements. Constructor assumes all elements are distinct
 * @property type "set"
 * @constructor
 * @param {Array.<Numbas.jme.token>} value
 */
var TSet = types.TSet = types.set = function(value) {
    this.value = value;
}
TSet.prototype.type = 'set';
/** Vector type
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<Number>} value - Array of components
 * @property type "vector"
 * @constructor
 * @param {Array.<Number>} value
 */
var TVector = types.TVector = types.vector = function(value)
{
    this.value = value;
}
TVector.prototype.type = 'vector';
TVector.doc = {
    name: 'vector',
    usage: ['vector(1,2)','vector([1,2,3,4])'],
    description: 'The components of a vector must be numbers.\n\n When combining vectors of different dimensions, the smaller vector is padded with zeros to make up the difference.'
}
/** Matrix type
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {matrix} value - Array of rows (which are arrays of numbers)
 * @property type "matrix"
 * @constructor
 * @param {matrix} value
 */
var TMatrix = types.TMatrix = types.matrix = function(value)
{
    this.value = value;
    if(arguments.length>0) {
        if(value.length!=value.rows) {
            throw(new Numbas.Error("jme.matrix.reports bad size"));
        }
        if(value.rows>0 && value[0].length!=value.columns) {
            throw(new Numbas.Error("jme.matrix.reports bad size"));
        }
    }
}
TMatrix.prototype.type = 'matrix';
TMatrix.doc = {
    name: 'matrix',
    usage: ['matrix([1,2,3],[4,5,6])','matrix(row1,row2)'],
    description: "Matrices are constructed from lists of numbers, representing the rows.\n\n When combining matrices of different dimensions, the smaller matrix is padded with zeros to make up the difference."
}
/** A range of numerical values - either discrete or continuous
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<Number>} value - `[start,end,step]`
 * @property {Number} size - the number of values in the range (if it's discrete, `undefined` otherwise)
 * @property {Number} start - the lower bound of the range
 * @property {Number} end - the upper bound of the range
 * @property {Number} step - the difference between elements in the range
 * @property type "range"
 * @constructor
 * @param {Array.<Number>} range - `[start,end,step]`
 */
var TRange = types.TRange = types.range = function(range)
{
    this.value = range;
    if(this.value!==undefined)
    {
        this.start = this.value[0];
        this.end = this.value[1];
        this.step = this.value[2];
        this.size = Math.floor((this.end-this.start)/this.step);
    }
}
TRange.prototype.type = 'range';
TRange.doc = {
    name: 'range',
    usage: ['1..3','1..3#0.1','1..3#0'],
    description: 'A range @a..b#c@ represents the set of numbers $\\{a+nc | 0 \\leq n \\leq \\frac{b-a}{c} \\}$. If the step size is zero, then the range is the continuous interval $\[a,b\]$.'
}
/** Variable name token
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {String} name
 * @property {String} value - Same as `name`
 * @property {Array.<String>} annotation - List of annotations (used to modify display)
 * @property type "name"
 * @constructor
 * @param {String} name
 * @param {Array.<String>} annotation
 */
var TName = types.TName = types.name = function(name,annotation)
{
    this.name = name;
    this.value = name;
    this.annotation = annotation;
}
TName.prototype.type = 'name';
TName.doc = {
    name: 'name',
    usage: ['x','X','x1','longName','dot:x','vec:x'],
    description: 'A variable or function name. Names are case-insensitive, so @x@ represents the same thing as @X@. \
\n\n\
@e@, @i@ and @pi@ are reserved names representing mathematical constants. They are rewritten by the interpreter to their respective numerical values before evaluation. \
\n\n\
Names can be given _annotations_ to change how they are displayed. The following annotations are built-in:\
\n\n\
* @verb@ - does nothing, but names like @i@, @pi@ and @e@ are not interpreted as the famous mathematical constants.\n\
* @op@ - denote the name as the name of an operator -- wraps the name in the LaTeX @\\operatorname@ command when displayed\n\
* @v@ or @vector@ - denote the name as representing a vector -- the name is displayed in boldface\n\
* @unit@ - denote the name as representing a unit vector -- places a hat above the name when displayed\n\
* @dot@ - places a dot above the name when displayed, for example when representing a derivative\n\
* @m@ or @matrix@ - denote the name as representing a matrix -- displayed using a non-italic font\
\n\n\
Any other annotation is taken to be a LaTeX command. For example, a name @vec:x@ is rendered in LaTeX as <code>\\vec{x}</code>, which places an arrow above the name.\
    '
};
/** JME function token
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {String} name
 * @property {Array.<String>} annotation - List of annotations (used to modify display)
 * @property {Number} vars - Arity of the function
 * @property type "function"
 * @constructor
 * @param {String} name
 * @param {Array.<String>} annotation
 */
var TFunc = types.TFunc = types['function'] = function(name,annotation)
{
    this.name = name;
    this.annotation = annotation;
}
TFunc.prototype.type = 'function';
TFunc.prototype.vars = 0;
/** Unary/binary operation token
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {String} name
 * @property {Number} vars - Arity of the operation
 * @property {Boolean} postfix
 * @property {Boolean} prefix
 * @properrty type "op"
 * @constructor
 * @param {String} op - Name of the operation
 * @param {Boolean} postfix
 * @param {Boolean} prefix
 */
var TOp = types.TOp = types.op = function(op,postfix,prefix)
{
    var arity = 2;
    if(jme.arity[op]!==undefined)
        arity = jme.arity[op];
    this.name = op;
    this.postfix = postfix || false;
    this.prefix = prefix || false;
    this.vars = arity;
}
TOp.prototype.type = 'op';
/** Punctuation token
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {String} type - The punctuation character
 * @constructor
 * @param {String} kind - The punctuation character
 */
var TPunc = types.TPunc = function(kind)
{
    this.type = kind;
}
var TExpression = types.TExpression = types.expression = function(tree) {
    if(typeof(tree)=='string') {
        tree = jme.compile(tree);
    }
    this.tree = tree;
}
TExpression.prototype = {
    type: 'expression'
}
/** Arities of built-in operations
 * @readonly
 * @memberof Numbas.jme
 * @enum {Number} */
var arity = jme.arity = {
    '!': 1,
    'not': 1,
    'fact': 1,
    '+u': 1,
    '-u': 1
}
/** Some names represent different operations when used as prefix. This dictionary translates them.
 * @readonly
 * @memberof Numbas.jme
 * @enum {String}
 */
var prefixForm = {
    '+': '+u',
    '-': '-u',
    '!': 'not'
}
/** Some names represent different operations when used as prefix. This dictionary translates them.
 * @readonly
 * @memberof Numbas.jme
 * @enum {String}
 */
var postfixForm = {
    '!': 'fact'
}
/** Operator precedence
 * @enum {Number}
 * @memberof Numbas.jme
 * @readonly
 */
var precedence = jme.precedence = {
    ';': 0,
    'fact': 1,
    'not': 1,
    '+u': 2.5,
    '-u': 2.5,
    '^': 2,
    '*': 3,
    '/': 3,
    '+': 4,
    '-': 4,
    '|': 5,
    '..': 5,
    '#':6,
    'except': 6.5,
    'in': 6.5,
    '<': 7,
    '>': 7,
    '<=': 7,
    '>=': 7,
    '<>': 8,
    '=': 8,
    'isa': 9,
    'and': 11,
    'or': 12,
    'xor': 13,
    'implies': 14,
    ':': 100
};
/** Synonyms of operator names - keys in this dictionary are translated to their corresponding values
 * @enum {String}
 * @memberof Numbas.jme
 * @readonly
 */
var opSynonyms = jme.opSynonyms = {
    '&':'and',
    '&&':'and',
    'divides': '|',
    '||':'or',
    '÷': '/',
    '×': '*',
    '∈': 'in',
    '∧': 'and',
    '∨': 'or',
    '⟹': 'implies',
    '≠': '<>',
    '≥': '>=',
    '≤': '<='
}
/** Synonyms of function names - keys in this dictionary are translated to their corresponding values
 * @enum {String}
 * @memberof Numbas.jme
 * @readonly
 */
var funcSynonyms = jme.funcSynonyms = {
    'sqr':'sqrt',
    'gcf': 'gcd',
    'sgn':'sign',
    'len': 'abs',
    'length': 'abs',
    'verb': 'verbatim'
};
/** Operations which evaluate lazily - they don't need to evaluate all of their arguments
 * @memberof Numbas.jme
 */
var lazyOps = jme.lazyOps = ['if','switch','repeat','map','let','isa','satisfy','filter','isset','dict','safe'];
var rightAssociative = {
    '^': true,
    '+u': true,
    '-u': true
}
function leftAssociative(op)
{
    // check for left-associativity because that is the case when you do something more
    // exponentiation is only right-associative operation at the moment
    return !(op in rightAssociative);
};
/** Operations which commute.
 * @enum {Boolean}
 * @memberof Numbas.jme
 * @readonly
 */
var commutative = jme.commutative =
{
    '*': true,
    '+': true,
    'and': true,
    '=': true
};
/** A function which checks whether a {@link Numbas.jme.funcObj} can be applied to the given arguments.
 * @callback Numbas.jme.typecheck_fn
 * @param {Array.<Numbas.jme.token>} variables
 * @returns {Boolean}
 */
/** Evaluate a JME function on a list of arguments and in a given scope.
 * @callback Numbas.jme.evaluate_fn
 * @param {Array.<Numbas.jme.tree|Numbas.jme.token|Object>} args - Arguments of the function. If the function is {@link Numbas.jme.lazyOps|lazy}, syntax trees are passed, otherwise arguments are evaluated to JME tokens first. If the {@link Numbas.jme.funcObj_options|unwrapValues} option is set, the arguments are unwrapped to raw JavaScript values.
 * @param {Numbas.jme.Scope} scope - Scope in which the function is evaluated.
 * @returns {Numbas.jme.token|Object} If {@link Numbas.jme.funcObj_options|unwrapValues} is set,
 */
/** Options for the {@link Numbas.jme.funcObj} constructor
 * @typedef {Object} Numbas.jme.funcObj_options
 * @property {Numbas.jme.typecheck_fn} typecheck - Check that this function can be evaluated on the given arguments.
 * @property {Numbas.jme.evaluate_fn} evaluate - Evaluate the function on a list of arguments and in a given scope.
 * @property {Boolean} unwrapValues - Unwrap list elements in arguments into javascript primitives before passing to the evaluate function?
 */
var funcObjAcc = 0;    //accumulator for ids for funcObjs, so they can be sorted
/**
 * A JME function. Capable of confirming that it can be evaluated on a given list of arguments, and returning the result of its evaluation on a list of arguments inside a given scope.
 *
 * @memberof Numbas.jme
 * @constructor
 * @param {String} name
 * @param {Array.<function|String>} intype - A list of data type constructors for the function's paramters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type. If `null`, then `options.typecheck` is used.
 * @param {function} outcons - The constructor for the output value of the function
 * @param {Numbas.jme.evaluate_fn} fn - JavaScript code which evaluates the function.
 * @param {Numbas.jme.funcObj_options} options
 *
 */
var funcObj = jme.funcObj = function(name,intype,outcons,fn,options)
{
    /** Globally unique ID of this function object
     * @name id
     * @member {Number}
     * @memberof Numbas.jme.funcObj
     */
    this.id = funcObjAcc++;
    options = options || {};
    for(var i=0;i<intype.length;i++)
    {
        if(intype[i]!='?' && intype[i]!='?*')
        {
            if(intype[i][0]=='*')
            {
                var type = types[intype[i].slice(1)];
                intype[i] = '*'+type.prototype.type;
            }
            else
            {
                intype[i]=intype[i].prototype.type;
            }
        }
    }
    name = name.toLowerCase();
    /** Name
     * @name name
     * @member {String}
     * @memberof Numbas.jme.funcObj
     */
    this.name=name;
    /** Calling signature of this function. A list of types - either token constructors; '?', representing any type; a type name. A type name or '?' followed by '*' means any number of arguments matching that type.
     *
     * @name intype
     * @member {Array.<Numbas.jme.token|String>}
     * @memberof Numbas.jme.funcObj
     */
    this.intype = intype;
    /** The return type of this function. Either a Numbas.jme.token constructor function, or the string '?', meaning unknown type.
     * @name outtype
     * @member {function|String}
     * @memberof Numbas.jme.funcObj
     */
    if(typeof(outcons)=='function')
        this.outtype = outcons.prototype.type;
    else
        this.outtype = '?';
    this.outcons = outcons;
    /** Javascript function for the body of this function
     * @name fn
     * @member {function}
     * @memberof Numbas.jme.funcObj
     */
    this.fn = fn;
    /** Can this function be called with the given list of arguments?
     * @function typecheck
     * @param {Numbas.jme.token[]} variables
     * @returns {Boolean}
     * @memberof Numbas.jme.funcObj
     */
    this.typecheck = options.typecheck || function(variables)
    {
        variables = variables.slice();    //take a copy of the array
        for( var i=0; i<this.intype.length; i++ )
        {
            if(this.intype[i][0]=='*')    //arbitrarily many
            {
                var ntype = this.intype[i].slice(1);
                while(variables.length)
                {
                    if(variables[0].type==ntype || ntype=='?' || variables[0].type=='?')
                        variables = variables.slice(1);
                    else
                        return false;
                }
            }else{
                if(variables.length==0)
                    return false;
                if(variables[0].type==this.intype[i] || this.intype[i]=='?' || variables[0].type=='?')
                    variables = variables.slice(1);
                else
                    return false;
            }
        }
        if(variables.length>0)    //too many args supplied
            return false;
        else
            return true;
    };
    /** Evaluate this function on the given arguments, in the given scope.
     *
     * @function evaluate
     * @param {Numbas.jme.token[]} args
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.token}
     * @memberof Numbas.jme.funcObj
     */
    this.evaluate = options.evaluate || function(args,scope)
    {
        var nargs = [];
        for(var i=0; i<args.length; i++) {
            if(options.unwrapValues)
                nargs.push(jme.unwrapValue(args[i]));
            else
                nargs.push(args[i].value);
        }
        var result = this.fn.apply(null,nargs);
        if(options.unwrapValues) {
            result = jme.wrapValue(result);
            if(!result.type)
                result = new this.outcons(result);
        }
        else
            result = new this.outcons(result);
        if(options.latex) {
            result.latex = true;
        }
        return result;
    }
    this.doc = options.doc;
    /** Does this function behave randomly?
     * @name random
     * @member {Boolean}
     * @memberof Numbas.jme.funcObj
     */
    this.random = options.random;
}
function randoms(varnames,min,max,times)
{
    times *= varnames.length;
    var rs = [];
    for( var i=0; i<times; i++ )
    {
        var r = {};
        for( var j=0; j<varnames.length; j++ )
        {
            r[varnames[j]] = new TNum(Numbas.math.randomrange(min,max));
        }
        rs.push(r);
    }
    return rs;
}
function varnamesAgree(array1, array2) {
    var name;
    for(var i=0; i<array1.length; i++) {
        if( (name=array1[i])[0]!='$' && !array2.contains(name) )
            return false;
    }
    return true;
};
/** Decide if two numbers are close enough to count as equal.
 * @callback Numbas.jme.checkingFunction
 * @param {Number} r1
 * @param {Number} r2
 * @param {Number} tolerance - A measure of how close the results need to be to count as equal. What this means depends on the checking function.
 * @returns {Boolean} - True if `r1` and `r2` are close enough to be equal.
 */
/**
 * Numerical comparison functions
 * @enum {Numbas.jme.checkingFunction}
 * @memberof Numbas.jme
 */
var checkingFunctions = jme.checkingFunctions =
{
    /** Absolute difference between variables - fail if `Math.abs(r1-r2)` is bigger than `tolerance` */
    absdiff: function(r1,r2,tolerance)
    {
        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
    },
    /** Relative (proportional) difference between variables - fail if `r1/r2 - 1` is bigger than `tolerance` */
    reldiff: function(r1,r2,tolerance) {
        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        //
        if(r2!=0) {
            return math.leq(Math.abs(math.sub(r1,r2)), Math.abs(math.mul(tolerance,r2)));
        } else {    //or if correct answer is 0, checks abs difference
            return math.leq(Math.abs(math.sub(r1,r2)), tolerance);
        }
    },
    /** Round both values to `tolerance` decimal places, and fail if unequal. */
    dp: function(r1,r2,tolerance) {
        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        tolerance = Math.floor(Math.abs(tolerance));
        return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
    },
    /** Round both values to `tolerance` significant figures, and fail if unequal. */
    sigfig: function(r1,r2,tolerance) {
        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        tolerance = Math.floor(Math.abs(tolerance));
        return math.eq(math.siground(r1,tolerance), math.siground(r2,tolerance));
    }
};
/** Custom substituteTree behaviour for specific functions - for a given usage of a function, substitute in variable values from the scope.
 *
 * Functions have the signature <tree with function call at the top, scope, allowUnbound>
 *
 * @memberof Numbas.jme
 * @enum {Numbas.jme.substituteTree}
 * @see Numbas.jme.substituteTree
 */
var substituteTreeOps = jme.substituteTreeOps = {};
/** Custom findvars behaviour for specific functions - for a given usage of a function, work out which variables it depends on.
 *
 * @memberof Numbas.jme
 * @enum {Numbas.jme.findvars}
 * @see Numbas.jme.findvars
 */
var findvarsOps = jme.findvarsOps = {}
/** Find all variables used in given syntax tree
 * @memberof Numbas.jme
 * @method
 * @param {Numbas.jme.tree} tree
 * @param {Array.<String>} boundvars - variables to be considered as bound (don't include them)
 * @param {Numbas.jme.Scope} scope
 * @returns {Array.<String>}
 */
var findvars = jme.findvars = function(tree,boundvars,scope)
{
    if(!scope)
        scope = jme.builtinScope;
    if(boundvars===undefined)
        boundvars = [];
    if(tree.tok.type=='function' && tree.tok.name in findvarsOps) {
        return findvarsOps[tree.tok.name](tree,boundvars,scope);
    }
    if(tree.args===undefined)
    {
        switch(tree.tok.type)
        {
        case 'name':
            var name = tree.tok.name.toLowerCase();
            if(boundvars.indexOf(name)==-1)
                return [name];
            else
                return [];
            break;
        case 'string':
            if(tree.tok.safe) {
                return [];
            }
            var bits = util.contentsplitbrackets(tree.tok.value);
            var out = [];
            for(var i=0;i<bits.length;i+=4)
            {
                var plain = bits[i];
                var sbits = util.splitbrackets(plain,'{','}');
                for(var k=1;k<sbits.length-1;k+=2)
                {
                    var tree2 = jme.compile(sbits[k],scope,true);
                    out = out.merge(findvars(tree2,boundvars));
                }
                if(i<=bits.length-3) {
                    var tex = bits[i+2];
                    var tbits = jme.texsplit(tex);
                    for(var j=0;j<tbits.length;j+=4) {
                        var cmd = tbits[j+1];
                        var expr = tbits[j+3];
                        switch(cmd)
                        {
                        case 'var':
                            var tree2 = jme.compile(expr,scope,true);
                            out = out.merge(findvars(tree2,boundvars));
                            break;
                        case 'simplify':
                            var sbits = util.splitbrackets(expr,'{','}');
                            for(var k=1;k<sbits.length-1;k+=2)
                            {
                                var tree2 = jme.compile(sbits[k],scope,true);
                                out = out.merge(findvars(tree2,boundvars));
                            }
                            break;
                        }
                    }
                }
            }
            return out;
        default:
            return [];
        }
    }
    else
    {
        var vars = [];
        for(var i=0;i<tree.args.length;i++)
            vars = vars.merge(findvars(tree.args[i],boundvars));
        return vars;
    }
}
/** Check that two values are equal
 * @memberof Numbas.jme
 * @method
 * @param {Numbas.jme.token} r1
 * @param {Numbas.jme.token} r2
 * @param {function} checkingFunction - one of {@link Numbas.jme.checkingFunctions}
 * @param {Number} checkingAccuracy
 * @returns {Boolean}
 */
var resultsEqual = jme.resultsEqual = function(r1,r2,checkingFunction,checkingAccuracy)
{    // first checks both expressions are of same type, then uses given checking type to compare results
    var v1 = r1.value, v2 = r2.value;
    if(r1.type != r2.type)
    {
        return false;
    }
    switch(r1.type)
    {
    case 'number':
        if(v1.complex || v2.complex)
        {
            if(!v1.complex)
                v1 = {re:v1, im:0, complex:true};
            if(!v2.complex)
                v2 = {re:v2, im:0, complex:true};
            return checkingFunction(v1.re, v2.re, checkingAccuracy) && checkingFunction(v1.im,v2.im,checkingAccuracy);
        }
        else
        {
            return checkingFunction( v1, v2, checkingAccuracy );
        }
        break;
    case 'vector':
        if(v1.length != v2.length)
            return false;
        for(var i=0;i<v1.length;i++)
        {
            if(!resultsEqual(new TNum(v1[i]),new TNum(v2[i]),checkingFunction,checkingAccuracy))
                return false;
        }
        return true;
        break;
    case 'matrix':
        if(v1.rows != v2.rows || v1.columns != v2.columns)
            return false;
        for(var i=0;i<v1.rows;i++)
        {
            for(var j=0;j<v1.columns;j++)
            {
                if(!resultsEqual(new TNum(v1[i][j]||0),new TNum(v2[i][j]||0),checkingFunction,checkingAccuracy))
                    return false;
            }
        }
        return true;
        break;
    case 'list':
        if(v1.length != v2.length)
            return false;
        for(var i=0;i<v1.length;i++)
        {
            if(!resultsEqual(v1[i],v2[i],checkingFunction,checkingAccuracy))
                return false;
        }
        return true;
    default:
        return util.eq(r1,r2);
    }
};

/** List names of variables used in `tree`, obtained by depth-first search.
 *
 * Differs from {@link Numbas.jme.findvars} by including duplicates, and ignoring {@link Numbas.jme.findvarsOps}.
 * 
 * @memberof Numbas.jme
 * @method
 * @param {Numbas.jme.tree} tree
 * @returns {String[]}
 */
var varsUsed = jme.varsUsed = function(tree) {
    switch(tree.tok.type) {
        case 'name':
            return [tree.tok.name];
        case 'op':
        case 'function':
            var o = [];
            for(var i=0;i<tree.args.length;i++) {
                o = o.concat(jme.varsUsed(tree.args[i]));
            }
            return o;
        default:
            return [];
    }
};
/** Compare two trees.
 *
 * * Compare lists of variables lexically using {@link Numbas.jme.varsUsed}; longest goes first if one is a prefix of the other
 * * then monomials before anything else
 * * then by data type
 * * then by function name
 * * otherwise return 0
 *
 * @memberof Numbas.jme
 * @method
 * @param {Numbas.jme.tree} a
 * @param {Numbas.jme.tree} b
 * @returns {Number} -1 if `a` should appear to the left of `b`, 0 if equal, 1 if `a` should appear to the right of `b`
 */
var compareTrees = jme.compareTrees = function(a,b) {
    var sign_a = 1;
    while(jme.isOp(a.tok,'-u')) {
        a = a.args[0];
        sign_a *= -1;
    }
    var sign_b = 1;
    while(jme.isOp(b.tok,'-u')) {
        b = b.args[0];
        sign_b *= -1;
    }
    var va = jme.varsUsed(a);
    var vb = jme.varsUsed(b);
    for(var i=0;i<va.length;i++) {
        if(i>=vb.length) {
            return -1;
        }
        if(va[i]!=vb[i]) {
            return va[i]<vb[i] ? -1 : 1;
        }
    }
    if(vb.length>va.length) {
        return 1;
    }

    var ma = jme.isMonomial(a);
    var mb = jme.isMonomial(b);
    var isma = ma!==false;
    var ismb = mb!==false;
    if(isma!=ismb) {
        return isma ? -1 : 1;
    }
    if(isma && ismb && !(a.tok.type=='name' && b.tok.type=='name')) {
        var d = jme.compareTrees(ma.base,mb.base);
        if(d==0) {
            return ma.degree<mb.degree ? 1 : ma.degree>mb.degree ? -1 : compareTrees(ma.coefficient,mb.coefficient);
        } else {
            return d;
        }
    }

    if(a.tok.type!=b.tok.type) {
        var order = ['op','function'];
        var oa = order.indexOf(a.tok.type);
        var ob = order.indexOf(b.tok.type);
        if(oa!=ob) {
            return oa>ob ? -1 : 1;
        } else {
            return a.tok.type<b.tok.type ? -1 : 1;
        }
    }
    switch(a.tok.type) {
        case 'op':
        case 'function':
            function is_pow(t) {
                return t.tok.name=='^' || (t.tok.name=='*' && t.args[1].tok.name=='^') || (t.tok.name=='/' && t.args[1].tok.name=='^');
            }
            var pa = is_pow(a);
            var pb = is_pow(b);
            if(pa && !pb) {
                return -1;
            } else if(!pa && pb) {
                return 1;
            }
            if(a.tok.name!=b.tok.name) {
                return a.tok.name<b.tok.name ? -1 : 1;
            }
            if(a.args.length!=b.args.length) {
                return a.args.length<b.args.length ? -1 : 1;
            }
            for(var i=0;i<a.args.length;i++) {
                var c = jme.compareTrees(a.args[i],b.args[i]);
                if(c!=0) {
                    return c;
                }
            }
            break;
        case 'number':
            var na = a.tok.value;
            var nb = b.tok.value;
            if(na.complex || nb.complex) {
                na = na.complex ? na : {re:na,im:0};
                nb = nb.complex ? nb : {re:nb,im:0};
                var gt = na.re > nb.re || (na.re==nb.re && na.im>nb.im);
                var eq = na.re==nb.re && na.im==nb.im && sign_a==sign_b;
                return gt ? 1 : eq ? 0 : -1;
            } else {
                return a.tok.value<b.tok.value ? -1 : a.tok.value>b.tok.value ? 1 : sign_a==sign_b ? 0 : sign_a ? 1 : -1;
            }
    }
    return sign_a==sign_b ? 0 : sign_a ? 1 : -1;
}
});

/*
Copyright 2011-15 Newcastle University
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
/** @file Sets up JME built-in functions.
 *
 * Provides {@link Numbas.jme}
 */
Numbas.queueScript('jme-builtins',['jme-base','jme-rules'],function(){
var util = Numbas.util;
var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;
var setmath = Numbas.setmath;
var jme = Numbas.jme;
var types = Numbas.jme.types;
var Scope = jme.Scope;
var funcObj = jme.funcObj;
var TNum = types.TNum;
var TString = types.TString;
var TBool = types.TBool;
var THTML = types.THTML;
var TList = types.TList;
var TKeyPair = types.TKeyPair;
var TDict = types.TDict;
var TMatrix = types.TMatrix;
var TName = types.TName;
var TRange = types.TRange;
var TSet = types.TSet;
var TVector = types.TVector;
var TExpression = types.TExpression;
var TOp = Numbas.jme.types.TOp;
/** The built-in JME evaluation scope
 * @type {Numbas.jme.Scope}
 * @memberof Numbas.jme
 */
var builtinScope = jme.builtinScope = new Scope({rulesets:jme.rules.simplificationRules});
builtinScope.setVariable('nothing',new types.TNothing);
var funcs = {};
function newBuiltin(name,intype,outcons,fn,options) {
    return builtinScope.addFunction(new funcObj(name,intype,outcons,fn,options));
}
newBuiltin('+u', [TNum], TNum, function(a){return a;});
newBuiltin('+u', [TVector], TVector, function(a){return a;});
newBuiltin('+u', [TMatrix], TMatrix, function(a){return a;});
newBuiltin('-u', [TNum], TNum, math.negate);
newBuiltin('-u', [TVector], TVector, vectormath.negate);
newBuiltin('-u', [TMatrix], TMatrix, matrixmath.negate);
newBuiltin('+', [TNum,TNum], TNum, math.add);
newBuiltin('+', [TList,TList], TList, null, {
    evaluate: function(args,scope)
    {
        var value = args[0].value.concat(args[1].value);
        return new TList(value);
    }
});
newBuiltin('+',[TList,'?'],TList, null, {
    evaluate: function(args,scope)
    {
        var value = args[0].value.slice();
        value.push(args[1]);
        return new TList(value);
    }
});
newBuiltin('+',[TDict,TDict],TDict, null,{
    evaluate: function(args,scope) {
        var nvalue = {};
        Object.keys(args[0].value).forEach(function(x) {
            nvalue[x] = args[0].value[x];
        })
        Object.keys(args[1].value).forEach(function(x) {
            nvalue[x] = args[1].value[x];
        })
        return new TDict(nvalue);
    }
});
var fconc = function(a,b) { return a+b; }
newBuiltin('+', [TString,'?'], TString, fconc);
newBuiltin('+', ['?',TString], TString, fconc);
newBuiltin('+', [TVector,TVector], TVector, vectormath.add);
newBuiltin('+', [TMatrix,TMatrix], TMatrix, matrixmath.add);
newBuiltin('-', [TNum,TNum], TNum, math.sub);
newBuiltin('-', [TVector,TVector], TVector, vectormath.sub);
newBuiltin('-', [TMatrix,TMatrix], TMatrix, matrixmath.sub);
newBuiltin('*', [TNum,TNum], TNum, math.mul );
newBuiltin('*', [TNum,TVector], TVector, vectormath.mul);
newBuiltin('*', [TVector,TNum], TVector, function(a,b){return vectormath.mul(b,a)});
newBuiltin('*', [TMatrix,TVector], TVector, vectormath.matrixmul);
newBuiltin('*', [TNum,TMatrix], TMatrix, matrixmath.scalarmul );
newBuiltin('*', [TMatrix,TNum], TMatrix, function(a,b){ return matrixmath.scalarmul(b,a); } );
newBuiltin('*', [TMatrix,TMatrix], TMatrix, matrixmath.mul);
newBuiltin('*', [TVector,TMatrix], TVector, vectormath.vectormatrixmul);
newBuiltin('/', [TNum,TNum], TNum, math.div );
newBuiltin('/', [TMatrix,TNum], TMatrix, function(a,b){ return matrixmath.scalardiv(a,b); } );
newBuiltin('/', [TVector,TNum], TVector, function(a,b){return vectormath.div(a,b)});
newBuiltin('^', [TNum,TNum], TNum, math.pow );
newBuiltin('dot',[TVector,TVector],TNum,vectormath.dot);
newBuiltin('dot',[TMatrix,TVector],TNum,vectormath.dot);
newBuiltin('dot',[TVector,TMatrix],TNum,vectormath.dot);
newBuiltin('dot',[TMatrix,TMatrix],TNum,vectormath.dot);
newBuiltin('cross',[TVector,TVector],TVector,vectormath.cross);
newBuiltin('cross',[TMatrix,TVector],TVector,vectormath.cross);
newBuiltin('cross',[TVector,TMatrix],TVector,vectormath.cross);
newBuiltin('cross',[TMatrix,TMatrix],TVector,vectormath.cross);
newBuiltin('det', [TMatrix], TNum, matrixmath.abs);
newBuiltin('numrows',[TMatrix], TNum, function(m){ return m.rows });
newBuiltin('numcolumns',[TMatrix], TNum, function(m){ return m.columns });
newBuiltin('angle',[TVector,TVector],TNum,vectormath.angle);
newBuiltin('transpose',[TVector],TMatrix, vectormath.transpose);
newBuiltin('transpose',[TMatrix],TMatrix, matrixmath.transpose);
newBuiltin('id',[TNum],TMatrix, matrixmath.id);
newBuiltin('..', [TNum,TNum], TRange, math.defineRange);
newBuiltin('#', [TRange,TNum], TRange, math.rangeSteps);
newBuiltin('in',[TNum,TRange],TBool,function(x,r) {
    var start = r[0];
    var end = r[1];
    var step_size = r[2];
    if(x>end || x<start) {
        return false;
    }
    if(step_size===0) {
        return true;
    } else {
        var max_steps = Math.floor(end-start)/step_size;
        var steps = Math.floor((x-start)/step_size);
        return step_size*steps + start == x && steps <= max_steps;
    }
});
newBuiltin('list',[TRange],TList,function(range) {
    return math.rangeToList(range).map(function(n){return new TNum(n)});
});
newBuiltin('dict',[TList],TDict,null, {
    evaluate: function(args,scope) {
        var value = {};
        if(args.length>0) {
            var items = scope.evaluate(args[0]).value;
            items.forEach(function(item) {
                value[item.value[0].value] = item.value[1];
            });
        }
        return new TDict(value);
    }
});
newBuiltin('dict',['*keypair'],TDict,null,{
    evaluate: function(args,scope) {
        if(args.length==0) {
            return new TDict({});
        }
        var value = {};
        if(args[0].tok.type=='keypair') {
            args.forEach(function(kp) {
                value[kp.tok.key] = jme.evaluate(kp.args[0],scope);
            });
        } else {
            var list = scope.evaluate(args[0]);
            list.value.forEach(function(pair) {
                value[pair.value[0].value] = pair.value[1];
            });
        }
        return new TDict(value);
    }
});
newBuiltin('keys',[TDict],TList,function(d) {
    var o = [];
    Object.keys(d).forEach(function(key) {
        o.push(new TString(key));
    })
    return o;
});
newBuiltin('values',[TDict],TList,function(d) {
    var o = [];
    Object.values(d).forEach(function(v) {
        o.push(v);
    })
    return o;
});
newBuiltin('values',[TDict,TList],TList,function(d,keys) {
    return keys.map(function(key) {
        if(!d.hasOwnProperty(key.value)) {
            throw(new Numbas.Error('jme.func.listval.key not in dict',{key:key}));
        } else {
            return d[key.value];
        }
    });
})
newBuiltin('items',[TDict],TList,null, {
    evaluate: function(args,scope) {
        var o = [];
        Object.entries(args[0].value).forEach(function(x) {
            o.push(new TList([new TString(x[0]), x[1]]))
        });
        return new TList(o);
    }
});
newBuiltin('listval',[TDict,TString],'?', null, {
    evaluate: function(args,scope) {
        var d = args[0].value;
        var key = args[1].value;
        if(!d.hasOwnProperty(key)) {
            throw(new Numbas.Error('jme.func.listval.key not in dict',{key:key}));
        }
        return d[key];
    }
});
newBuiltin('get',[TDict,TString,'?'],'?',null,{
    evaluate: function(args,scope) {
        var d = args[0].value;
        var key = args[1].value;
        if(!d.hasOwnProperty(key)) {
            return args[2]
        }
        return d[key];
    }
});
newBuiltin('in', [TString,TDict], TBool, function(s,d) {
    return d.hasOwnProperty(s);
});
newBuiltin('in',[TString, TString], TBool, function(sub,str) {
    return str.indexOf(sub)>=0;
});
newBuiltin('json_decode', [TString], '?', null, {
    evaluate: function(args,scope) {
        var data = JSON.parse(args[0].value);
        return jme.wrapValue(data);
    }
});
newBuiltin('json_encode', ['?'], TString, null, {
    evaluate: function(args,scope) {
        var s = new TString(JSON.stringify(jme.unwrapValue(args[0])));
        s.safe = true;
        return s;
    }
});
newBuiltin('lpad',[TString,TNum,TString],TString,util.lpad);
newBuiltin('formatstring',[TString,TList],TString,function(str,extra) {
    return util.formatString.apply(util,[str].concat(extra));
},{unwrapValues:true});
newBuiltin('unpercent',[TString],TNum,util.unPercent);
newBuiltin('letterordinal',[TNum],TString,util.letterOrdinal);
newBuiltin('html',[TString],THTML,function(html) { return $(html) });
newBuiltin('nonemptyhtml',[TString],TBool,function(html) {
    return util.isNonemptyHTML(html);
});
newBuiltin('image',[TString],THTML,function(url){ return $('<img/>').attr('src',url); });
newBuiltin('latex',[TString],TString,null,{
    evaluate: function(args,scope) {
        var s = new TString(args[0].value);
        s.latex = true;
        return s;
    }
});
newBuiltin('safe',[TString],TString,null, {
    evaluate: function(args,scope) {
        var t = args[0].tok;
        t.safe = true;
        return t;
    },
    typecheck: function(variables) {
        return variables.length==1 && variables[0].type=='string';
    }
});
jme.findvarsOps.safe = function(tree,boundvars,scope) {
    return [];
}
newBuiltin('capitalise',[TString],TString,function(s) { return util.capitalise(s); });
newBuiltin('upper',[TString],TString,function(s) { return s.toUpperCase(); });
newBuiltin('lower',[TString],TString,function(s) { return s.toLowerCase(); });
newBuiltin('pluralise',[TNum,TString,TString],TString,function(n,singular,plural) { return util.pluralise(n,singular,plural); });
newBuiltin('join',[TList,TString],TString,function(list,delimiter) {
    return list.map(jme.tokenToDisplayString).join(delimiter);
});
newBuiltin('split',[TString,TString],TList, function(str,delimiter) {
    return str.split(delimiter).map(function(s){return new TString(s)});
});
newBuiltin('trim',[TString],TString, function(str) { return str.trim(); });
newBuiltin('currency',[TNum,TString,TString],TString,util.currency);
newBuiltin('separateThousands',[TNum,TString],TString,util.separateThousands);
newBuiltin('listval',[TString,TNum],TString,function(s,i) {return s[i]});
newBuiltin('listval',[TString,TRange],TString,function(s,range) {return s.slice(range[0],range[1])});
newBuiltin('in',[TString,TString],TBool,function(sub,str) { return str.indexOf(sub)>=0 });
newBuiltin('lpad',[TString,TNum,TString], TString, util.lpad);
newBuiltin('rpad',[TString,TNum,TString], TString, util.rpad);
newBuiltin('match_regex',[TString,TString],TList,function(pattern,str) {
    var re = new RegExp(pattern);
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});
newBuiltin('match_regex',[TString,TString,TString],TList,function(pattern,str,flags) {
    var re = new RegExp(pattern,flags);
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});
//the next three versions of the `except` operator
//exclude numbers from a range, given either as a range, a list or a single value
newBuiltin('except', [TRange,TRange], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        range = math.rangeToList(range);
        if(except[2]==0) {
            return range.filter(function(i){return i<except[0] || i>except[1]}).map(function(i){return new TNum(i)});
        } else {
            except = math.rangeToList(except);
            return math.except(range,except).map(function(i){return new TNum(i)});
        }
    }
);
newBuiltin('except', [TRange,TList], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        range = math.rangeToList(range)
        except = except.map(function(i){ return i.value; });
        return math.except(range,except).map(function(i){return new TNum(i)});
    }
);
newBuiltin('except', [TRange,TNum], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        range = math.rangeToList(range);
        return math.except(range,[except]).map(function(i){return new TNum(i)});
    }
);
//exclude numbers from a list, so use the math.except function
newBuiltin('except', [TList,TRange], TList,
    function(range,except) {
        range = range.map(function(i){ return i.value; });
        except = math.rangeToList(except);
        return math.except(range,except).map(function(i){return new TNum(i)});
    }
);
//exclude values of any type from a list containing values of any type, so use the util.except function
newBuiltin('except', [TList,TList], TList,
    function(list,except) {
        return util.except(list,except);
    }
);
newBuiltin('except',[TList,'?'], TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.except(args[0].value,[args[1]]));
    }
});
newBuiltin('distinct',[TList],TList, util.distinct,{unwrapValues: false});
newBuiltin('in',['?',TList],TBool,null,{
    evaluate: function(args,scope) {
        return new TBool(util.contains(args[1].value,args[0]));
    }
});
newBuiltin('<', [TNum,TNum], TBool, math.lt);
newBuiltin('>', [TNum,TNum], TBool, math.gt );
newBuiltin('<=', [TNum,TNum], TBool, math.leq );
newBuiltin('>=', [TNum,TNum], TBool, math.geq );
newBuiltin('<>', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.neq(args[0],args[1]));
    }
});
newBuiltin('=', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.eq(args[0],args[1]));
    }
});
newBuiltin('and', [TBool,TBool], TBool, function(a,b){return a&&b;} );
newBuiltin('not', [TBool], TBool, function(a){return !a;} );
newBuiltin('or', [TBool,TBool], TBool, function(a,b){return a||b;} );
newBuiltin('xor', [TBool,TBool], TBool, function(a,b){return (a || b) && !(a && b);} );
newBuiltin('implies', [TBool,TBool], TBool, function(a,b){return !a || b;} );
newBuiltin('abs', [TNum], TNum, math.abs );
newBuiltin('abs', [TString], TNum, function(s){return s.length} );
newBuiltin('abs', [TList], TNum, function(l) { return l.length; });
newBuiltin('abs', [TRange], TNum, function(r) { return r[2]==0 ? Math.abs(r[0]-r[1]) : math.rangeSize(r); });
newBuiltin('abs', [TVector], TNum, vectormath.abs);
newBuiltin('abs', [TDict], TNum, function(d) {
    var n = 0;
    for(var x in d) {
        n += 1;
    }
    return n;
});
newBuiltin('arg', [TNum], TNum, math.arg );
newBuiltin('re', [TNum], TNum, math.re );
newBuiltin('im', [TNum], TNum, math.im );
newBuiltin('conj', [TNum], TNum, math.conjugate );
newBuiltin('isint',[TNum],TBool, function(a){ return util.isInt(a); });
newBuiltin('sqrt', [TNum], TNum, math.sqrt );
newBuiltin('ln', [TNum], TNum, math.log );
newBuiltin('log', [TNum], TNum, math.log10 );
newBuiltin('log', [TNum,TNum], TNum, math.log_base );
newBuiltin('exp', [TNum], TNum, math.exp );
newBuiltin('fact', [TNum], TNum, math.factorial );
newBuiltin('gamma', [TNum], TNum, math.gamma );
newBuiltin('sin', [TNum], TNum, math.sin );
newBuiltin('cos', [TNum], TNum, math.cos );
newBuiltin('tan', [TNum], TNum, math.tan );
newBuiltin('cosec', [TNum], TNum, math.cosec );
newBuiltin('sec', [TNum], TNum, math.sec );
newBuiltin('cot', [TNum], TNum, math.cot );
newBuiltin('arcsin', [TNum], TNum, math.arcsin );
newBuiltin('arccos', [TNum], TNum, math.arccos );
newBuiltin('arctan', [TNum], TNum, math.arctan );
newBuiltin('sinh', [TNum], TNum, math.sinh );
newBuiltin('cosh', [TNum], TNum, math.cosh );
newBuiltin('tanh', [TNum], TNum, math.tanh );
newBuiltin('cosech', [TNum], TNum, math.cosech );
newBuiltin('sech', [TNum], TNum, math.sech );
newBuiltin('coth', [TNum], TNum, math.coth );
newBuiltin('arcsinh', [TNum], TNum, math.arcsinh );
newBuiltin('arccosh', [TNum], TNum, math.arccosh );
newBuiltin('arctanh', [TNum], TNum, math.arctanh );
newBuiltin('ceil', [TNum], TNum, math.ceil );
newBuiltin('floor', [TNum], TNum, math.floor );
newBuiltin('round', [TNum], TNum, math.round );
newBuiltin('trunc', [TNum], TNum, math.trunc );
newBuiltin('fract', [TNum], TNum, math.fract );
newBuiltin('degrees', [TNum], TNum, math.degrees );
newBuiltin('radians', [TNum], TNum, math.radians );
newBuiltin('sign', [TNum], TNum, math.sign );
newBuiltin('rational_approximation',[TNum],TList,function(n) {
    return math.rationalApproximation(n);
},{unwrapValues:true});
newBuiltin('rational_approximation',[TNum,TNum],TList,function(n,accuracy) {
    return math.rationalApproximation(n,accuracy);
},{unwrapValues:true});
newBuiltin('factorise',[TNum],TList,function(n) {
        return math.factorise(n).map(function(n){return new TNum(n)});
    }
);
newBuiltin('random', [TRange], TNum, math.random, {random:true} );
newBuiltin('random',[TList],'?',null, {
    random:true,
    evaluate: function(args,scope)
    {
        return math.choose(args[0].value);
    }
});
newBuiltin( 'random',[],'?', null, {
    random:true,
    typecheck: function() { return true; },
    evaluate: function(args,scope) { return math.choose(args);}
});
newBuiltin('mod', [TNum,TNum], TNum, math.mod );
newBuiltin('max', [TNum,TNum], TNum, math.max );
newBuiltin('min', [TNum,TNum], TNum, math.min );
newBuiltin('max', [TList], TNum, math.listmax, {unwrapValues: true});
newBuiltin('min', [TList], TNum, math.listmin, {unwrapValues: true});
newBuiltin('precround', [TNum,TNum], TNum, math.precround );
newBuiltin('precround', [TMatrix,TNum], TMatrix, matrixmath.precround );
newBuiltin('precround', [TVector,TNum], TVector, vectormath.precround );
newBuiltin('siground', [TNum,TNum], TNum, math.siground );
newBuiltin('siground', [TMatrix,TNum], TMatrix, matrixmath.siground );
newBuiltin('siground', [TVector,TNum], TVector, vectormath.siground );
newBuiltin('dpformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'dp', precision:p});}, {latex: true} );
newBuiltin('dpformat', [TNum,TNum,TString], TString, function(n,p,style) {return math.niceNumber(n,{precisionType: 'dp', precision:p, style: style});}, {latex: true} );
newBuiltin('sigformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p});}, {latex: true} );
newBuiltin('sigformat', [TNum,TNum,TString], TString, function(n,p,style) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p, style:style});}, {latex: true} );
newBuiltin('formatnumber', [TNum,TString], TString, function(n,style) {return math.niceNumber(n,{style:style});});
newBuiltin('string', [TNum], TString, math.niceNumber);
newBuiltin('parsenumber', [TString,TString], TNum, function(s,style) {return util.parseNumber(s,false,style);});
newBuiltin('parsenumber', [TString,TList], TNum, function(s,styles) {return util.parseNumber(s,false,styles);}, {unwrapValues: true});
newBuiltin('parsenumber_or_fraction', [TString,TString], TNum, function(s,style) {return util.parseNumber(s,true,style);});
newBuiltin('parsenumber_or_fraction', [TString,TList], TNum, function(s,styles) {return util.parseNumber(s,true,styles);}, {unwrapValues: true});
newBuiltin('togivenprecision', [TString,TString,TNum,TBool], TBool, math.toGivenPrecision);
newBuiltin('withintolerance',[TNum,TNum,TNum],TBool, math.withinTolerance);
newBuiltin('countdp',[TString],TNum, function(s) { return math.countDP(util.cleanNumber(s)); });
newBuiltin('countsigfigs',[TString],TNum, function(s) { return math.countSigFigs(util.cleanNumber(s)); });
newBuiltin('isnan',[TNum],TBool,function(n) {
    return isNaN(n);
});
newBuiltin('cleannumber',[TString,TList],TString,util.cleanNumber,{unwrapValues:true});
newBuiltin('isbool',[TString],TBool,util.isBool);
newBuiltin('perm', [TNum,TNum], TNum, math.permutations );
newBuiltin('comb', [TNum,TNum], TNum, math.combinations );
newBuiltin('root', [TNum,TNum], TNum, math.root );
newBuiltin('award', [TNum,TBool], TNum, function(a,b){return (b?a:0);} );
newBuiltin('gcd', [TNum,TNum], TNum, math.gcf );
newBuiltin('gcd_without_pi_or_i', [TNum,TNum], TNum, function(a,b) {    // take out factors of pi or i before working out gcd. Used by the fraction simplification rules
        if(a.complex && a.re==0) {
            a = a.im;
        }
        if(b.complex && b.re==0) {
            b = b.im;
        }
        a = a/math.pow(Math.PI,math.piDegree(a));
        b = b/math.pow(Math.PI,math.piDegree(b));
        return math.gcf(a,b);
} );
newBuiltin('lcm', [TNum,TNum], TNum, math.lcm );
newBuiltin('lcm', [TList], TNum, function(l){
        if(l.length==0) {
            return 1;
        } else if(l.length==1) {
            return l[0];
        } else {
            return math.lcm.apply(math,l);
        }
    },
    {unwrapValues: true}
);
newBuiltin('|', [TNum,TNum], TBool, math.divides );
newBuiltin('sum',[TList],TNum,math.sum,{unwrapValues: true});
newBuiltin('sum',[TVector],TNum,math.sum);
newBuiltin('deal',[TNum],TList,
    function(n) {
        return math.deal(n).map(function(i) {
            return new TNum(i);
        });
    },
    {
        random:true
    }
);
newBuiltin('shuffle',[TList],TList,
    function(list) {
        return math.shuffle(list);
    },
    {
        random:true
    }
);
newBuiltin('shuffle',[TRange],TList,
    function(range) {
        var list = math.rangeToList(range).map(function(n){return new TNum(n)})
        return math.shuffle(list);
    },
    {
        random:true
    }
);
//if needs to be a bit different because it can return any type
newBuiltin('if', [TBool,'?','?'], '?',null, {
    evaluate: function(args,scope)
    {
        var test = jme.evaluate(args[0],scope).value;
        if(test)
            return jme.evaluate(args[1],scope);
        else
            return jme.evaluate(args[2],scope);
    }
});
newBuiltin('switch',[],'?', null, {
    typecheck: function(variables)
    {
        //should take alternating booleans and [any value]
        //final odd-numbered argument is the 'otherwise' option
        if(variables.length <2)
            return false;
        var check=0;
        if(variables.length % 2 == 0)
            check = variables.length;
        else
            check = variables.length-1;
        for( var i=0; i<check; i+=2 )
        {
            switch(variables[i].tok.type)
            {
            case '?':
            case 'boolean':
                break;
            default:
                return false;
            }
        }
        return true;
    },
    evaluate: function(args,scope)
    {
        for(var i=0; i<args.length-1; i+=2 )
        {
            var result = jme.evaluate(args[i],scope).value;
            if(result)
                return jme.evaluate(args[i+1],scope);
        }
        if(args.length % 2 == 1)
            return jme.evaluate(args[args.length-1],scope);
        else
            throw(new Numbas.Error('jme.func.switch.no default case'));
    }
});
newBuiltin('isa',['?',TString],TBool, null, {
    evaluate: function(args,scope)
    {
        var kind = jme.evaluate(args[1],scope).value;
        if(args[0].tok.type=='name' && scope.getVariable(args[0].tok.name.toLowerCase())==undefined )
            return new TBool(kind=='name');
        var match = false;
        if(kind=='complex')
        {
            match = args[0].tok.type=='number' && args[0].tok.value.complex || false;
        }
        else
        {
            match = args[0].tok.type == kind;
        }
        return new TBool(match);
    }
});
// repeat(expr,n) evaluates expr n times and returns a list of the results
newBuiltin('repeat',['?',TNum],TList, null, {
    evaluate: function(args,scope)
    {
        var size = jme.evaluate(args[1],scope).value;
        var value = [];
        for(var i=0;i<size;i++)
        {
            value[i] = jme.evaluate(args[0],scope);
        }
        return new TList(value);
    }
});
function satisfy(names,definitions,conditions,scope,maxRuns) {
        maxRuns = maxRuns===undefined ? 100 : maxRuns;
        if(definitions.length!=names.length) {
            throw(new Numbas.Error('jme.func.satisfy.wrong number of definitions'));
        }
        var satisfied = false;
        var runs = 0;
        while(runs<maxRuns && !satisfied) {
            runs += 1;
            var variables = {};
            for(var i=0; i<names.length; i++) {
                variables[names[i]] = jme.evaluate(definitions[i],scope);
            }
            var nscope = new jme.Scope([scope,{variables:variables}]);
            satisfied = true;
            for(var i=0; i<conditions.length; i++) {
                var ok = jme.evaluate(conditions[i],nscope);
                if(ok.type!='boolean') {
                    throw(new Numbas.Error('jme.func.satisfy.condition not a boolean'));
                }
                if(!ok.value) {
                    satisfied = false;
                    break;
                }
            }
        }
        if(!satisfied) {
            throw(new Numbas.Error('jme.func.satisfy.took too many runs'));
        }
        return variables;
}
newBuiltin('satisfy', [TList,TList,TList,TNum], TList, null, {
    evaluate: function(args,scope)
    {
        var names = args[0].args.map(function(t){ return t.tok.name; });
        var definitions = args[1].args;
        var conditions = args[2].args;
        var maxRuns = args.length>3 ? jme.evaluate(args[3]).value : 100;
        var variables = satisfy(names,definitions,conditions,scope,maxRuns);
        return new TList(names.map(function(name){ return variables[name]; }));
    }
});
jme.findvarsOps.satisfy = function(tree,boundvars,scope) {
    var names = tree.args[0].args.map(function(t){return t.tok.name});
    boundvars = boundvars.concat(0,0,names);
    var vars = [];
    for(var i=1;i<tree.args.length;i++)
        vars = vars.merge(jme.findvars(tree.args[i],boundvars));
    return vars;
}
newBuiltin('listval',[TList,TNum],'?', null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var index = util.wrapListIndex(args[1].value,list.vars);
        if(list.type!='list') {
            if(list.type=='name')
                throw(new Numbas.Error('jme.variables.variable not defined',{name:list.name}));
            else
                throw(new Numbas.Error('jme.func.listval.not a list'));
        }
        if(index in list.value)
            return list.value[index];
        else
            throw(new Numbas.Error('jme.func.listval.invalid index',{index:index,size:list.value.length}));
    }
});
newBuiltin('listval',[TList,TRange],TList, null, {
    evaluate: function(args,scope)
    {
        var range = args[1].value;
        var list = args[0];
        var size = list.vars;
        var start = util.wrapListIndex(range[0],size);
        var end = util.wrapListIndex(range[1]),size;
        var value = list.value.slice(start,end);
        return new TList(value);
    }
});
newBuiltin('listval',[TVector,TNum],TNum, null, {
    evaluate: function(args,scope)
    {
        var vector = args[0].value;
        var index = util.wrapListIndex(args[1].value,vector.length);
        return new TNum(vector[index] || 0);
    }
});
newBuiltin('listval',[TVector,TRange],TVector,null, {
    evaluate: function(args,scope)
    {
        var range = args[1].value;
        var vector = args[0].value;
        var start = util.wrapListIndex(range[0],vector.length);
        var end = util.wrapListIndex(range[1],vector.length);
        var v = [];
        for(var i=start;i<end;i++) {
            v.push(vector[i] || 0);
        }
        return new TVector(v);
    }
});
newBuiltin('listval',[TMatrix,TNum],TVector, null, {
    evaluate: function(args,scope)
    {
        var matrix = args[0].value;
        var index = util.wrapListIndex(args[1].value,matrix.length);
        return new TVector(matrix[index] || []);
    }
});
newBuiltin('listval',[TMatrix,TRange],TMatrix,null, {
    evaluate: function(args,scope)
    {
        var range = args[1].value;
        var matrix = args[0].value;
        var start = util.wrapListIndex(range[0],matrix.length);
        var end = util.wrapListIndex(range[1],matrix.length);
        var v = [];
        return new TMatrix(matrix.slice(start,end));
    }
});
newBuiltin('isset',[TName],TBool,null, {
    evaluate: function(args,scope) {
        var name = args[0].tok.name;
        return new TBool(name in scope.variables);
    }
});
jme.findvarsOps.isset = function(tree,boundvars,scope) {
    boundvars = boundvars.slice();
    boundvars.push(tree.args[1].tok.name.toLowerCase());
    var vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars));
    return vars;
}
jme.substituteTreeOps.isset = function(tree,scope,allowUnbound) {
    return tree;
}
function mapOverList(lambda,names,list,scope) {
    var olist = list.map(function(v) {
        if(typeof(names)=='string') {
            scope.variables[names] = v;
        } else {
            names.forEach(function(name,i) {
                scope.variables[name] = v.value[i];
            });
        }
        return scope.evaluate(lambda);
    });
    return new TList(olist);
}
/** Functions for 'map', by the type of the thing being mapped over.
 * Functions take a JME expression lambda, a name or list of names to map, a value to map over, and a scope to evaluate against.
 * @memberof Numbas.jme
 * @enum {function}
 */
jme.mapFunctions = {
    'list': mapOverList,
    'set': mapOverList,
    'range': function(lambda,name,range,scope) {
        var list = math.rangeToList(range).map(function(n){return new TNum(n)});
        return mapOverList(lambda,name,list,scope);
    },
    'matrix': function(lambda,name,matrix,scope) {
        return new TMatrix(matrixmath.map(matrix,function(n) {
            scope.variables[name] = new TNum(n);
            var o = scope.evaluate(lambda);
            if(o.type!='number') {
                throw(new Numbas.Error("jme.map.matrix map returned non number"))
            }
            return o.value;
        }));
    },
    'vector': function(lambda,name,vector,scope) {
        return new TVector(vectormath.map(vector,function(n) {
            scope.variables[name] = new TNum(n);
            var o = scope.evaluate(lambda);
            if(o.type!='number') {
                throw(new Numbas.Error("jme.map.vector map returned non number"))
            }
            return o.value;
        }));
    }
}
newBuiltin('map',['?',TName,'?'],TList, null, {
    evaluate: function(args,scope)
    {
        var lambda = args[0];
        var value = jme.evaluate(args[2],scope);
        if(!(value.type in jme.mapFunctions)) {
            throw(new Numbas.Error('jme.typecheck.map not on enumerable',{type:value.type}));
        }
        scope = new Scope(scope);
        var names_tok = args[1].tok;
        var names;
        if(names_tok.type=='name') {
            names = names_tok.name;
        } else {
            names = args[1].args.map(function(t){return t.tok.name;});
        }
        return jme.mapFunctions[value.type](lambda,names,value.value,scope);
    }
});
jme.findvarsOps.map = function(tree,boundvars,scope) {
    boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        boundvars.push(tree.args[1].tok.name.toLowerCase());
    }
    var vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars));
    return vars;
}
jme.substituteTreeOps.map = function(tree,scope,allowUnbound) {
    tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
    return tree;
}
newBuiltin('filter',['?',TName,'?'],TList,null, {
    evaluate: function(args,scope) {
        var lambda = args[0];
        var list = jme.evaluate(args[2],scope);
        switch(list.type) {
        case 'list':
            list = list.value;
            break;
        case 'range':
            list = math.rangeToList(list.value);
            for(var i=0;i<list.length;i++) {
                list[i] = new TNum(list[i]);
            }
            break;
        default:
            throw(new Numbas.Error('jme.typecheck.map not on enumerable',list.type));
        }
        scope = new Scope(scope);
        var name = args[1].tok.name;
        var value = list.filter(function(v) {
            scope.variables[name] = v;
            return jme.evaluate(lambda,scope).value;
        });
        return new TList(value);
    }
});
jme.findvarsOps.filter = function(tree,boundvars,scope) {
    boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        boundvars.push(tree.args[1].tok.name.toLowerCase());
    }
    var vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars));
    return vars;
}
jme.substituteTreeOps.filter = function(tree,scope,allowUnbound) {
    tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
    return tree;
}
function tok_is_true(item){return item.type=='boolean' && item.value}
newBuiltin('all',[TList],TBool,function(list) {
    return list.every(tok_is_true);
});
newBuiltin('some',[TList],TBool,function(list) {
    return list.some(tok_is_true);
});
newBuiltin('let',['?'],TList, null, {
    evaluate: function(args,scope)
    {
        var lambda = args[args.length-1];
        var variables = {};
        if(args[0].tok.type=='dict') {
            var d = scope.evaluate(args[0]);
            variables = d.value;
        } else {
            for(var i=0;i<args.length-1;i+=2) {
                var name = args[i].tok.name;
                var value = scope.evaluate(args[i+1]);
                variables[name] = value;
            }
        }
        var nscope = new Scope([scope,{variables:variables}]);
        return nscope.evaluate(lambda);
    },
    typecheck: function(variables) {
        if(variables.length==2 && variables[0].tok.type=='dict') {
            return true;
        }
        if(variables.length<3 || (variables.length%2)!=1) {
            return false;
        }
        for(var i=0;i<variables.length-1;i+=2) {
            if(variables[i].tok.type!='name') {
                return false;
            }
        }
    }
});
jme.findvarsOps.let = function(tree,boundvars,scope) {
    // find vars used in variable assignments
    var vars = [];
    for(var i=0;i<tree.args.length-1;i+=2) {
        vars = vars.merge(jme.findvars(tree.args[i+1],boundvars,scope));
    }
    // find variable names assigned by let
    boundvars = boundvars.slice();
    for(var i=0;i<tree.args.length-1;i+=2) {
        boundvars.push(tree.args[i].tok.name.toLowerCase());
    }
    // find variables used in the lambda expression, excluding the ones assigned by let
    vars = vars.merge(jme.findvars(tree.args[tree.args.length-1],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.let = function(tree,scope,allowUnbound) {
    for(var i=1;i<tree.args.length-1;i+=2) {
        tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound);
    }
}
newBuiltin('sort',[TList],TList, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var newlist = new TList(list.vars);
        newlist.value = list.value.slice().sort(function(a,b){
            if(math.gt(a.value,b.value))
                return 1;
            else if(math.lt(a.value,b.value))
                return -1;
            else
                return 0;
        });
        return newlist;
    }
});
newBuiltin('reverse',[TList],TList,null, {
    evaluate: function(args,scope) {
        var list = args[0];
        return new TList(list.value.slice().reverse());
    }
});
// indices of given value in given list
newBuiltin('indices',[TList,'?'],TList,null, {
    evaluate: function(args,scope) {
        var list = args[0];
        var target = args[1];
        var out = [];
        list.value.map(function(v,i) {
            if(util.eq(v,target)) {
                out.push(new TNum(i));
            }
        });
        return new TList(out);
    }
});
newBuiltin('set',[TList],TSet,function(l) {
    return util.distinct(l);
});
newBuiltin('set',[TRange],TSet,function(r) {
    return math.rangeToList(r).map(function(n){return new TNum(n)});
});
newBuiltin('set', ['?'], TSet, null, {
    evaluate: function(args,scope) {
        return new TSet(util.distinct(args));
    },
    typecheck: function() {
        return true;
    }
});
newBuiltin('list',[TSet],TList,function(set) {
    var l = [];
    for(var i=0;i<set.length;i++) {
        l.push(set[i]);
    }
    return l;
});
newBuiltin('union',[TSet,TSet],TSet,setmath.union);
newBuiltin('intersection',[TSet,TSet],TSet,setmath.intersection);
newBuiltin('or',[TSet,TSet],TSet,setmath.union);
newBuiltin('and',[TSet,TSet],TSet,setmath.intersection);
newBuiltin('-',[TSet,TSet],TSet,setmath.minus);
newBuiltin('abs',[TSet],TNum,setmath.size);
newBuiltin('in',['?',TSet],TBool,null,{
    evaluate: function(args,scope) {
        return new TBool(util.contains(args[1].value,args[0]));
    }
});
newBuiltin('product',['?'],TList,function() {
    var lists = Array.prototype.slice.call(arguments);
    var prod = util.product(lists);
    return prod.map(function(l){ return new TList(l); });
}, {
    typecheck: function(variables) {
        for(var i=0;i<variables.length;i++) {
            var t = variables[i].type;
            if(!(t=='list' || t=='set')) {
                return false;
            }
        }
        return true;
    }
});
newBuiltin('zip',['?'],TList,function() {
    var lists = Array.prototype.slice.call(arguments);
    var zipped = util.zip(lists);
    return zipped.map(function(l){ return new TList(l); });
}, {
    typecheck: function(variables) {
        for(var i=0;i<variables.length;i++) {
            var t = variables[i].type;
            if(!(t=='list' || t=='set')) {
                return false;
            }
        }
        return true;
    }
});
newBuiltin('combinations',['?',TNum],TList,function(list,r) {
    var prod = util.combinations(list,r);
    return prod.map(function(l){ return new TList(l); });
}, {
    typecheck: function(variables) {
        return (variables[0].type=='set' || variables[0].type=='list') && variables[1].type=='number';
    }
});
newBuiltin('combinations_with_replacement',['?',TNum],TList,function(list,r) {
    var prod = util.combinations_with_replacement(list,r);
    return prod.map(function(l){ return new TList(l); });
}, {
    typecheck: function(variables) {
        return (variables[0].type=='set' || variables[0].type=='list') && variables[1].type=='number';
    }
});
newBuiltin('permutations',['?',TNum],TList,function(list,r) {
    var prod = util.permutations(list,r);
    return prod.map(function(l){ return new TList(l); });
}, {
    typecheck: function(variables) {
        return (variables[0].type=='set' || variables[0].type=='list') && variables[1].type=='number';
    }
});
newBuiltin('vector',['*TNum'],TVector, null, {
    evaluate: function(args,scope)
    {
        var value = [];
        for(var i=0;i<args.length;i++)
        {
            value.push(args[i].value);
        }
        return new TVector(value);
    }
});
newBuiltin('vector',[TList],TVector, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var value = list.value.map(function(x){return x.value});
        return new TVector(value);
    }
});
newBuiltin('matrix',[TList],TMatrix,null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var rows = list.vars;
        var columns = 0;
        var value = [];
        if(!list.value.length) {
            rows = 0;
            columns = 0;
        } else {
            switch(list.value[0].type)
            {
            case 'number':
                value = [list.value.map(function(e){return e.value})];
                rows = 1;
                columns = list.vars;
                break;
            case 'vector':
                value = list.value.map(function(v){return v.value});
                columns = list.value[0].value.length;
                break;
            case 'list':
                for(var i=0;i<rows;i++)
                {
                    var row = list.value[i].value;
                    value.push(row.map(function(x){return x.value}));
                    columns = Math.max(columns,row.length);
                }
                break;
            default:
                throw(new Numbas.Error('jme.func.matrix.invalid row type',{type:list.value[0].type}));
            }
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('matrix',['*list'],TMatrix, null, {
    evaluate: function(args,scope)
    {
        var rows = args.length;
        var columns = 0;
        var value = [];
        for(var i=0;i<args.length;i++)
        {
            var row = args[i].value;
            value.push(row.map(function(x){return x.value}));
            columns = Math.max(columns,row.length);
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('rowvector',['*number'],TMatrix, null, {
    evaluate: function(args,scope)
    {
        var row = [];
        for(var i=0;i<args.length;i++)
        {
            row.push(args[i].value);
        }
        var matrix = [row];
        matrix.rows = 1;
        matrix.columns = row.length;
        return new TMatrix(matrix);
    }
});
newBuiltin('rowvector',[TList],TMatrix, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var row = list.value.map(function(x){return x.value});
        var matrix = [row];
        matrix.rows = 1;
        matrix.columns = row.length;
        return new TMatrix(matrix);
    }
});
//cast vector to list
newBuiltin('list',[TVector],TList,null, {
    evaluate: function(args,scope)
    {
        var vector = args[0];
        var value = vector.value.map(function(n){ return new TNum(n)});
        return new TList(value);
    }
});
//cast matrix to list of lists
newBuiltin('list',[TMatrix],TList,null, {
    evaluate: function(args,scope)
    {
        var matrix = args[0];
        var value = [];
        for(var i=0;i<matrix.value.rows;i++)
        {
            var row = new TList(matrix.value[i].map(function(n){return new TNum(n)}));
            value.push(row);
        }
        return new TList(value);
    }
});
newBuiltin('table',[TList,TList],THTML,
    function(data,headers) {
        var table = $('<table/>');
        var thead = $('<thead/>');
        table.append(thead);
        for(var i=0;i<headers.length;i++) {
            var cell = headers[i];
            if(typeof cell=='number')
                cell = Numbas.math.niceNumber(cell);
            thead.append($('<th/>').html(cell));
        }
        var tbody=$('<tbody/>');
        table.append(tbody);
        for(var i=0;i<data.length;i++) {
            var row = $('<tr/>');
            tbody.append(row);
            for(var j=0;j<data[i].length;j++) {
                var cell = data[i][j];
                if(typeof cell=='number')
                    cell = Numbas.math.niceNumber(cell);
                row.append($('<td/>').html(cell));
            }
        }
        return new THTML(table);
    },
    {
        unwrapValues: true
    }
);
newBuiltin('table',[TList],THTML,
    function(data) {
        var table = $('<table/>');
        var tbody=$('<tbody/>');
        table.append(tbody);
        for(var i=0;i<data.length;i++) {
            var row = $('<tr/>');
            tbody.append(row);
            for(var j=0;j<data[i].length;j++) {
                var cell = data[i][j];
                if(typeof cell=='number')
                    cell = Numbas.math.niceNumber(cell);
                row.append($('<td/>').html(cell));
            }
        }
        return new THTML(table);
    },
    {
        unwrapValues: true
    }
);
newBuiltin('parse',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('expression',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('args',[TExpression],TList,null, {
    evaluate: function(args, scope) {
        return new TList(args[0].tree.args.map(function(tree){ return new TExpression(tree); }));
    }
});
newBuiltin('type',[TExpression],TString,null, {
    evaluate: function(args,scope) {
        return args[0].tree.tok.type;
    }
});
newBuiltin('name',[TString],TName,function(name){ return name });
newBuiltin('string',[TName],TString,function(name){ return name });
newBuiltin('op',[TString],TOp,function(name){ return name });
newBuiltin('assert',[TBool,'?'],'?',null,{
    evaluate: function(args, scope) {
        var result = scope.evaluate(args[0]).value;
        if(!result) {
            return scope.evaluate(args[1]);
        } else {
            return new TBool(false);
        }
    }
});
Numbas.jme.lazyOps.push('assert');
newBuiltin('try',['?',TName,'?'],'?',null, {
    evaluate: function(args, scope) {
        try {
            var res = scope.evaluate(args[0]);
            return res;
        } catch(e) {
            var variables = {};
            variables[args[1].tok.name] = e.message;
            return scope.evaluate(args[2],variables);
        }
    }
});
Numbas.jme.lazyOps.push('try');
jme.findvarsOps.try = function(tree,boundvars,scope) {
    return [];
}
newBuiltin('exec',[TOp,TList],TExpression,null, {
    evaluate: function(args, scope) {
        var tok = args[0];
        var eargs = args[1].value.map(function(a) {
            if(a.type!='expression') {
                return {tok:a};
            } else {
                return a.tree;
            }
        });
        return new TExpression({tok: tok, args: eargs});
    }
});
newBuiltin('simplify',[TExpression,TString],TExpression,null, {
    evaluate: function(args, scope) {
        var tree = args[0].tree;
        var ruleset = jme.rules.collectRuleset(args[1].value,scope.allRulesets());
        return new TExpression(jme.display.simplifyTree(tree, ruleset, scope));
    }
});
newBuiltin('simplify',[TExpression,TList],TExpression,null, {
    evaluate: function(args, scope) {
        var tree = args[0].tree;
        var ruleset = jme.rules.collectRuleset(args[1].value.map(function(x){ return x.value}),scope.allRulesets());
        return new TExpression(jme.display.simplifyTree(tree, ruleset, scope));
    }
});
newBuiltin('simplify',[TString,TString],TExpression,null, {
    evaluate: function(args,scope) {
        return new TExpression(jme.display.simplify(args[0].value,args[1].value,scope));
    }
});
newBuiltin('string',[TExpression],TString,null, {
    evaluate: function(args,scope) {
        return new TString(jme.display.treeToJME(args[0].tree));
    }
});
newBuiltin('eval',[TExpression],'?',null,{
    evaluate: function(args,scope) {
        return scope.evaluate(args[0].tree);
    }
});
newBuiltin('eval',[TExpression, TDict],'?',null,{
    evaluate: function(args,scope) {
        return (new Numbas.jme.Scope([scope,{variables:args[1].value}])).evaluate(args[0].tree);
    }
});
newBuiltin('findvars',[TExpression],TList,null, {
    evaluate: function(args, scope) {
        var vars = jme.findvars(args[0].tree,[],scope);
        return new TList(vars.map(function(v){ return new TString(v) }));
    }
});
newBuiltin('definedvariables',[],TList,null, {
    evaluate: function(args, scope) {
        var vars = Object.keys(scope.allVariables());
        return new TList(vars.map(function(x){ return new TString(x) }));
    }
});
newBuiltin('resultsequal',['?','?',TString,TNum],TBool,null, {
    evaluate: function(args, scope) {
        var a = args[0];
        var b = args[1];
        var accuracy = args[3].value;
        var checkingFunction = jme.checkingFunctions[args[2].value.toLowerCase()];
        return new TBool(jme.resultsEqual(a,b,checkingFunction,accuracy));
    }
});
newBuiltin('match',[TExpression,TString],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = Numbas.jme.compile(args[1].value);
        var match = Numbas.jme.display.matchTree(pattern,expr,false);
        if(!match) {
            return jme.wrapValue({match: false, groups: {}});
        } else {
            var groups = {}
            for(var x in match) {
                groups[x] = new TExpression(match[x]);
            }
            return jme.wrapValue({
                match: true,
                groups: groups
            });
        }
    }
});
newBuiltin('matches',[TExpression,TString],TBool,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = Numbas.jme.compile(args[1].value);
        var match = Numbas.jme.display.matchTree(pattern,expr,false);
        return new TBool(match && true);
    }
});
newBuiltin('replace',[TString,TString,TExpression],TExpression,null,{
    evaluate: function(args, scope) {
        var pattern = args[0].value;
        var repl = args[1].value;
        var expr = args[2].tree;
        var rule = new jme.rules.Rule(pattern,[],repl);
        var set = new jme.rules.Ruleset([rule]);
        return new TExpression(jme.display.simplifyTree(expr,set,scope,true));
    }
});
newBuiltin('canonical_compare',['?','?'],TNum,null, {
    evaluate: function(args,scope) {
        var cmp = jme.compareTrees(args[0],args[1]);
        return new TNum(cmp);
    }
});
jme.lazyOps.push('canonical_compare');
newBuiltin('translate',[TString],TString,function(s) {
    return R(s);
});
newBuiltin('translate',[TString,TDict],TString,function(s,params) {
    return R(s,params);
},{unwrapValues:true});
///end of builtins
});

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
/** @file Stuff to do with displaying JME expressions - convert to TeX, simplify, or convert syntax trees back to JME
 *
 * Provides {@link Numbas.jme.display}
 */
Numbas.queueScript('jme-display',['base','math','jme','util','jme-rules'],function() {
var math = Numbas.math;
var jme = Numbas.jme;
var util = Numbas.util;

/** A LaTeX string
 * @typedef TeX
 * @type {String}
 */

/** @namespace Numbas.jme.display */
jme.display = /** @lends Numbas.jme.display */ {
    /** Convert a JME expression to LaTeX.
     *
     * @param {JME} expr
     * @param {Array.<String>|Numbas.jme.rules.Ruleset} ruleset - can be anything accepted by {@link Numbas.jme.display.collectRuleset}
     * @param {Numbas.jme.Scope} scope
     * @returns {TeX}
     */
    exprToLaTeX: function(expr,ruleset,scope)
    {
        if(!ruleset)
            ruleset = jme.rules.simplificationRules.basic;
        ruleset = jme.collectRuleset(ruleset,scope.allRulesets());
        expr+='';    //make sure expr is a string
        if(!expr.trim().length)    //if expr is the empty string, don't bother going through the whole compilation proces
            return '';
        var tree = jme.display.simplify(expr,ruleset,scope); //compile the expression to a tree and simplify it
        var tex = texify(tree,ruleset.flags); //render the tree as TeX
        return tex;
    },
    /** Simplify a JME expression string according to the given ruleset and return it as a JME string
     *
     * @param {JME} expr
     * @param {Array.<String>|Numbas.jme.rules.Ruleset} ruleset - can be anything accepted by {@link Numbas.jme.display.collectRuleset}
     * @param {Numbas.jme.Scope} scope
     * @returns {JME}
     *
     * @see Numbas.jme.display.simplify
     */
    simplifyExpression: function(expr,ruleset,scope)
    {
        if(expr.trim()=='')
            return '';
        return treeToJME(jme.display.simplify(expr,ruleset,scope),ruleset.flags);
    },
    /** Simplify a JME expression string according to given ruleset and return it as a syntax tree
     *
     * @param {JME} expr
     * @param {Array.<String>|Numbas.jme.rules.Ruleset} ruleset
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.tree}
     *
     * @see Numbas.jme.display.simplifyExpression
     * @see Numbas.jme.display.simplifyTree
     */
    simplify: function(expr,ruleset,scope)
    {
        if(expr.trim()=='')
            return;
        if(!ruleset)
            ruleset = jme.rules.simplificationRules.basic;
        ruleset = jme.collectRuleset(ruleset,scope.allRulesets());        //collect the ruleset - replace set names with the appropriate Rule objects
        try
        {
            var exprTree = jme.compile(expr,{},true);    //compile the expression to a tree. notypecheck is true, so undefined function names can be used.
            return jme.display.simplifyTree(exprTree,ruleset,scope);    // simplify the tree
        }
        catch(e)
        {
            //e.message += '\nSimplifying expression failed. Expression was: '+expr;
            throw(e);
        }
    },
    /** Simplify a syntax tree according to the given ruleset
     *
     * @param {Numbas.jme.tree} exprTree
     * @param {Array.<String>|Numbas.jme.rules.Ruleset} ruleset
     * @param {Numbas.jme.Scope} scope
     * @param {Boolean} allowUnbound
     * @returns {Numbas.jme.tree}
     *
     * @see Numbas.jme.display.simplify
     */
    simplifyTree: function(exprTree,ruleset,scope,allowUnbound)
    {
        if(!exprTree) {
            throw(new Numbas.Error('jme.display.simplifyTree.empty expression'));
        }
        if(!scope)
            throw(new Numbas.Error('jme.display.simplifyTree.no scope given'));
        scope = Numbas.util.copyobj(scope);
        scope.variables = {};    //remove variables from the scope so they don't accidentally get substituted in
        var applied = true;
        var rules = ruleset.rules;
        var depth = 0;
        var seen = [];
        // apply rules until nothing can be done
        while( applied )
        {
            //the eval() function is a meta-function which, when used in the result of a rule, allows you to replace an expression with a single data value
            if(exprTree.tok.type=='function' && exprTree.tok.name=='eval')
            {
                exprTree = {tok: Numbas.jme.evaluate(exprTree.args[0],scope)};
            }
            else
            {
                if(exprTree.args)    //if this token is an operation with arguments, try to simplify the arguments first
                {
                    for(var i=0;i<exprTree.args.length;i++)
                    {
                        exprTree.args[i] = jme.display.simplifyTree(exprTree.args[i],ruleset,scope,allowUnbound);
                    }
                }
                applied = false;
                for( var i=0; i<rules.length;i++)    //check each rule
                {
                    var match;
                    if(match = rules[i].match(exprTree,scope))    //if rule can be applied, apply it!
                    {
                        exprTree = jme.substituteTree(Numbas.util.copyobj(rules[i].result,true),new jme.Scope([{variables:match}]),allowUnbound);
                        applied = true;
                        depth += 1;
                        if(depth > 100) {
                            var str = Numbas.jme.display.treeToJME(exprTree);
                            if(seen.contains(str)) {
                                throw(new Numbas.Error("jme.display.simplifyTree.stuck in a loop",{expr:str}));
                            }
                            seen.push(str);
                        }
                        break;
                    }
                }
            }
        }
        return exprTree
    }
};
/// all private methods below here
function texifyWouldBracketOpArg(thing,i, settings) {
    settings = settings || {};
    var tok = thing.args[i].tok;
    var precedence = jme.precedence;
    if(tok.type=='op') {    //if this is an op applied to an op, might need to bracket
        var op1 = thing.args[i].tok.name;    //child op
        var op2 = thing.tok.name;            //parent op
        var p1 = precedence[op1];    //precedence of child op
        var p2 = precedence[op2];    //precedence of parent op
        //if leaving out brackets would cause child op to be evaluated after parent op, or precedences the same and parent op not commutative, or child op is negation and parent is exponentiation
        return ( p1 > p2 || (p1==p2 && i>0 && !jme.commutative[op2]) || (op1=='-u' && precedence[op2]<=precedence['*']) )
    }
    //complex numbers might need brackets round them when multiplied with something else or unary minusing
    else if(tok.type=='number' && tok.value.complex && thing.tok.type=='op' && (thing.tok.name=='*' || thing.tok.name=='-u' || i==0 && thing.tok.name=='^') ) {
        var v = thing.args[i].tok.value;
        return !(v.re==0 || v.im==0);
    } else if(jme.isOp(thing.tok, '^') && settings.fractionnumbers && tok.type=='number' && texSpecialNumber(tok.value)===undefined && math.rationalApproximation(Math.abs(tok.value))[1] != 1) {
        return true;
    }
    return false;
}
/** Apply brackets to an op argument if appropriate
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Numbas.jme.tree} thing
 * @param {Array.<String>} texArgs - the arguments of `thing`, as TeX
 * @param {Number} i - the index of the argument to bracket
 * @returns {TeX}
 */
function texifyOpArg(thing,texArgs,i)
{
    var tex = texArgs[i];
    if(texifyWouldBracketOpArg(thing,i)) {
        tex = '\\left ( '+tex+' \\right )';
    }
    return tex;
}
/** Helper function for texing infix operators
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the operator
 * @returns {function} - a function which will convert a syntax tree with the operator at the top to TeX, by putting `code` in between the TeX of the two arguments.
 */
function infixTex(code)
{
    return function(thing,texArgs)
    {
        var arity = jme.builtinScope.getFunction(thing.tok.name)[0].intype.length;
        if( arity == 1 )    //if operation is unary, prepend argument with code
        {
            return code+texArgs[0];
        }
        else if ( arity == 2 )    //if operation is binary, put code in between arguments
        {
            return texArgs[0]+' '+code+' '+texArgs[1];
        }
    }
}
/** Helper for texing nullary functions
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the function
 * @returns {function} - a function which returns the appropriate (constant) TeX code
 */
function nullaryTex(code)
{
    return function(thing,texArgs){ return '\\textrm{'+code+'}'; };
}
/** Helper function for texing functions
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the function
 * @returns {function} - a function which converts a syntax tree to the appropriate TeX
 */
function funcTex(code)
{
    var f = function(thing,texArgs){
        return code+' \\left ( '+texArgs.join(', ')+' \\right )';
    }
    f.code = code;
    return f;
}
/** Define how to texify each operation and function
 * @enum {function}
 * @memberof Numbas.jme.display
 */
var texOps = jme.display.texOps = {
    /** range definition. Should never really be seen */
    '#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),
    /** logical negation */
    'not': infixTex('\\neg '),
    /** unary addition */
    '+u': function(thing,texArgs,settings) {
        var tex = texArgs[0];
        if( thing.args[0].tok.type=='op' ) {
            var op = thing.args[0].tok.name;
            if( op=='-u' || op=='+u' ) {
                tex='\\left ( '+tex+' \\right )';
            }
        }
        return '+'+tex;
    },
    /** unary minus */
    '-u': (function(thing,texArgs,settings) {
        var tex = texArgs[0];
        if( thing.args[0].tok.type=='op' )
        {
            var op = thing.args[0].tok.name;
            if(
                op=='-u' || op=='+u' ||
                (!(op=='/' || op=='*') && jme.precedence[op]>jme.precedence['-u'])    //brackets are needed if argument is an operation which would be evaluated after negation
            ) {
                tex='\\left ( '+tex+' \\right )';
            }
        }
        else if(thing.args[0].tok.type=='number' && thing.args[0].tok.value.complex) {
            var value = thing.args[0].tok.value;
            return settings.texNumber({complex:true,re:-value.re,im:-value.im});
        }
        return '-'+tex;
    }),
    /** exponentiation */
    '^': (function(thing,texArgs,settings) {
        var tex0 = texArgs[0];
        //if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
        if(thing.args[0].tok.type=='op' || (thing.args[0].tok.type=='function' && thing.args[0].tok.name=='exp') || texifyWouldBracketOpArg(thing, 0, settings)) {
            tex0 = '\\left ( ' +tex0+' \\right )';
        }
        var trigFunctions = ['cos','sin','tan','sec','cosec','cot','arcsin','arccos','arctan','cosh','sinh','tanh','cosech','sech','coth','arccosh','arcsinh','arctanh'];
        if(thing.args[0].tok.type=='function' && trigFunctions.contains(thing.args[0].tok.name) && thing.args[1].tok.type=='number' && util.isInt(thing.args[1].tok.value) && thing.args[1].tok.value>0) {
            return texOps[thing.args[0].tok.name].code + '^{'+texArgs[1]+'}' + '\\left( '+texify(thing.args[0].args[0],settings)+' \\right)';
        }
        return (tex0+'^{ '+texArgs[1]+' }');
    }),
    '*': (function(thing, texArgs, settings) {
        var s = texifyOpArg(thing,texArgs,0);
        for(var i=1; i<thing.args.length; i++ )
        {
            var left = thing.args[i-1];
            var right = thing.args[i];
            var use_symbol = false;
            if(settings.alwaystimes) {
                use_symbol = true;
            } else {
                // if we'd end up with two digits next to each other, but from different arguments, we need a times symbol
                if(util.isInt(texArgs[i-1].charAt(texArgs[i-1].length-1)) && util.isInt(texArgs[i].charAt(0)) && !texifyWouldBracketOpArg(thing,i)) {
                    use_symbol = true;
                //anything times e^(something) or (not number)^(something)
                } else if (jme.isOp(right.tok,'^') && (right.args[0].value==Math.E || right.args[0].tok.type!='number')) {
                    use_symbol = false;
                //real number times Pi or E
                } else if (right.tok.type=='number' && (right.tok.value==Math.PI || right.tok.value==Math.E || right.tok.value.complex) && left.tok.type=='number' && !(left.tok.value.complex)) {
                    use_symbol = false
                //number times a power of i
                } else if (jme.isOp(right.tok,'^') && right.args[0].tok.type=='number' && math.eq(right.args[0].tok.value,math.complex(0,1)) && left.tok.type=='number') {
                    use_symbol = false;
                // times sign when LHS or RHS is a factorial
                } else if((left.tok.type=='function' && left.tok.name=='fact') || (right.tok.type=='function' && right.tok.name=='fact')) {
                    use_symbol = true;
                //(anything except i) times i
                } else if ( !(left.tok.type=='number' && math.eq(left.tok.value,math.complex(0,1))) && right.tok.type=='number' && math.eq(right.tok.value,math.complex(0,1))) {
                    use_symbol = false;
                // anything times number, or (-anything), or an op with lower precedence than times, with leftmost arg a number
                } else if ( right.tok.type=='number'
                        ||
                            jme.isOp(right.tok,'-u')
                        ||
                        (
                            !jme.isOp(right.tok,'-u')
                            && (right.tok.type=='op' && jme.precedence[right.tok.name]<=jme.precedence['*']
                                && (right.args[0].tok.type=='number'
                                && right.args[0].tok.value!=Math.E)
                            )
                        )
                ) {
                    use_symbol = true;
                }
            }
            s += use_symbol ? ' \\times ' : ' ';
            s += texifyOpArg(thing,texArgs,i);
        }
        return s;
    }),
    '/': (function(thing,texArgs) { return ('\\frac{ '+texArgs[0]+' }{ '+texArgs[1]+' }'); }),
    '+': (function(thing,texArgs,settings) {
        var a = thing.args[0];
        var b = thing.args[1];
        if(jme.isOp(b.tok,'+u') || jme.isOp(b.tok,'-u')) {
            return texArgs[0]+' + \\left ( '+texArgs[1]+' \\right )';
        } else {
            return texArgs[0]+' + '+texArgs[1];
        }
    }),
    '-': (function(thing,texArgs,settings) {
        var a = thing.args[0];
        var b = thing.args[1];
        if(b.tok.type=='number' && b.tok.value.complex && b.tok.value.re!=0) {
            var texb = settings.texNumber(math.complex(b.tok.value.re,-b.tok.value.im));
            return texArgs[0]+' - '+texb;
        }
        else{
            if(jme.isOp(b.tok,'+') || jme.isOp(b.tok,'-') || jme.isOp(b.tok,'+u') || jme.isOp(b.tok,'-u'))
                return texArgs[0]+' - \\left ( '+texArgs[1]+' \\right )';
            else
                return texArgs[0]+' - '+texArgs[1];
        }
    }),
    'dot': infixTex('\\cdot'),
    'cross': infixTex('\\times'),
    'transpose': (function(thing,texArgs) {
        var tex = texArgs[0];
        if(thing.args[0].tok.type=='op')
            tex = '\\left ( ' +tex+' \\right )';
        return (tex+'^{\\mathrm{T}}');
    }),
    '..': infixTex('\\dots'),
    'except': infixTex('\\operatorname{except}'),
    '<': infixTex('\\lt'),
    '>': infixTex('\\gt'),
    '<=': infixTex('\\leq'),
    '>=': infixTex('\\geq'),
    '<>': infixTex('\neq'),
    '=': infixTex('='),
    'and': infixTex('\\wedge'),
    'or': infixTex('\\vee'),
    'xor': infixTex('\\, \\textrm{XOR} \\,'),
    'implies': infixTex('\\to'),
    'in': infixTex('\\in'),
    '|': infixTex('|'),
    'abs': (function(thing,texArgs,settings) {
        var arg;
        if(thing.args[0].tok.type=='vector')
            arg = texVector(thing.args[0].tok.value,settings);
        else if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='vector')
            arg = texVector(thing.args[0],settings);
        else if(thing.args[0].tok.type=='matrix')
            arg = texMatrix(thing.args[0].tok.value,settings);
        else if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='matrix')
            arg = texMatrix(thing.args[0],settings);
        else
            arg = texArgs[0];
        return ('\\left | '+arg+' \\right |');
    }),
    'sqrt': (function(thing,texArgs) { return ('\\sqrt{ '+texArgs[0]+' }'); }),
    'exp': (function(thing,texArgs) { return ('e^{ '+texArgs[0]+' }'); }),
    'fact': (function(thing,texArgs)
            {
                if(thing.args[0].tok.type=='number' || thing.args[0].tok.type=='name')
                {
                    return texArgs[0]+'!';
                }
                else
                {
                    return '\\left ('+texArgs[0]+' \\right )!';
                }
            }),
    'ceil': (function(thing,texArgs) { return '\\left \\lceil '+texArgs[0]+' \\right \\rceil';}),
    'floor': (function(thing,texArgs) { return '\\left \\lfloor '+texArgs[0]+' \\right \\rfloor';}),
    'int': (function(thing,texArgs) { return ('\\int \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'defint': (function(thing,texArgs) { return ('\\int_{'+texArgs[2]+'}^{'+texArgs[3]+'} \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'diff': (function(thing,texArgs)
            {
                var degree = (thing.args[2].tok.type=='number' && thing.args[2].tok.value==1) ? '' : '^{'+texArgs[2]+'}';
                if(thing.args[0].tok.type=='name')
                {
                    return ('\\frac{\\mathrm{d}'+degree+texArgs[0]+'}{\\mathrm{d}'+texArgs[1]+degree+'}');
                }
                else
                {
                    return ('\\frac{\\mathrm{d}'+degree+'}{\\mathrm{d}'+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                }
            }),
    'partialdiff': (function(thing,texArgs)
            {
                var degree = (thing.args[2].tok.type=='number' && thing.args[2].tok.value==1) ? '' : '^{'+texArgs[2]+'}';
                if(thing.args[0].tok.type=='name')
                {
                    return ('\\frac{\\partial '+degree+texArgs[0]+'}{\\partial '+texArgs[1]+degree+'}');
                }
                else
                {
                    return ('\\frac{\\partial '+degree+'}{\\partial '+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                }
            }),
    'sub': (function(thing,texArgs) {
        return texArgs[0]+'_{ '+texArgs[1]+' }';
    }),
    'sup': (function(thing,texArgs) {
        return texArgs[0]+'^{ '+texArgs[1]+' }';
    }),
    'limit': (function(thing,texArgs) { return ('\\lim_{'+texArgs[1]+' \\to '+texArgs[2]+'}{'+texArgs[0]+'}'); }),
    'mod': (function(thing,texArgs) {return texArgs[0]+' \\pmod{'+texArgs[1]+'}';}),
    'perm': (function(thing,texArgs) { return '^{'+texArgs[0]+'}\\kern-2pt P_{'+texArgs[1]+'}';}),
    'comb': (function(thing,texArgs) { return '^{'+texArgs[0]+'}\\kern-1pt C_{'+texArgs[1]+'}';}),
    'root': (function(thing,texArgs) { return '\\sqrt['+texArgs[1]+']{'+texArgs[0]+'}'; }),
    'if': (function(thing,texArgs)
            {
                for(var i=0;i<3;i++)
                {
                    if(thing.args[i].args!==undefined)
                        texArgs[i] = '\\left ( '+texArgs[i]+' \\right )';
                }
                return '\\textbf{If} \\; '+texArgs[0]+' \\; \\textbf{then} \\; '+texArgs[1]+' \\; \\textbf{else} \\; '+texArgs[2];
            }),
    'switch': funcTex('\\operatorname{switch}'),
    'gcd': funcTex('\\operatorname{gcd}'),
    'lcm': funcTex('\\operatorname{lcm}'),
    'trunc': funcTex('\\operatorname{trunc}'),
    'fract': funcTex('\\operatorname{fract}'),
    'degrees': funcTex('\\operatorname{degrees}'),
    'radians': funcTex('\\operatorname{radians}'),
    'round': funcTex('\\operatorname{round}'),
    'sign': funcTex('\\operatorname{sign}'),
    'random': funcTex('\\operatorname{random}'),
    'max': funcTex('\\operatorname{max}'),
    'min': funcTex('\\operatorname{min}'),
    'precround': funcTex('\\operatorname{precround}'),
    'siground': funcTex('\\operatorname{siground}'),
    'award': funcTex('\\operatorname{award}'),
    'hour24': nullaryTex('hour24'),
    'hour': nullaryTex('hour'),
    'ampm': nullaryTex('ampm'),
    'minute': nullaryTex('minute'),
    'second': nullaryTex('second'),
    'msecond': nullaryTex('msecond'),
    'dayofweek': nullaryTex('dayofweek'),
    'sin': funcTex('\\sin'),
    'cos': funcTex('\\cos'),
    'tan': funcTex('\\tan'),
    'sec': funcTex('\\sec'),
    'cot': funcTex('\\cot'),
    'cosec': funcTex('\\csc'),
    'arccos': funcTex('\\arccos'),
    'arcsin': funcTex('\\arcsin'),
    'arctan': funcTex('\\arctan'),
    'cosh': funcTex('\\cosh'),
    'sinh': funcTex('\\sinh'),
    'tanh': funcTex('\\tanh'),
    'coth': funcTex('\\coth'),
    'cosech': funcTex('\\operatorname{cosech}'),
    'sech': funcTex('\\operatorname{sech}'),
    'arcsinh': funcTex('\\operatorname{arcsinh}'),
    'arccosh': funcTex('\\operatorname{arccosh}'),
    'arctanh': funcTex('\\operatorname{arctanh}'),
    'ln': function(thing,texArgs,settings) {
        if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='abs')
            return '\\ln '+texArgs[0];
        else
            return '\\ln \\left ( '+texArgs[0]+' \\right )';
    },
    'log': function(thing,texArgs,settings) {
        var base = thing.args.length==1 ? '10' : texArgs[1];
        return '\\log_{'+base+'} \\left ( '+texArgs[0]+' \\right )';
    },
    'vector': (function(thing,texArgs,settings) {
        return '\\left ( '+texVector(thing,settings)+' \\right )';
    }),
    'rowvector': (function(thing,texArgs,settings) {
        if(thing.args[0].tok.type!='list')
            return texMatrix({args:[{args:thing.args}]},settings,true);
        else
            return texMatrix(thing,settings,true);
    }),
    'matrix': (function(thing,texArgs,settings) {
        return texMatrix(thing,settings,true);
    }),
    'listval': (function(thing,texArgs) {
        return texArgs[0]+' \\left['+texArgs[1]+'\\right]';
    }),
    'verbatim': (function(thing,texArgs) {
        return thing.args[0].tok.value;
    }),
    'set': function(thing,texArgs,settings) {
        if(thing.args.length==1 && thing.args[0].tok.type=='list') {
            return '\\left\\{ '+texify(thing.args[0],settings)+' \\right\\}';
        } else {
            return '\\left\\{ '+texArgs.join(', ')+' \\right\\}';
        }
    }
}
/** Convert a special number to TeX, or return undefined if not a special number.
 *  @memberof Numbas.jme.display
 *  @private
 *
 *  @param {Number} n
 *  @returns {TeX}
 */
var texSpecialNumber = jme.display.texSpecialNumber = function(value) {
    var specials = jme.display.specialNumbers;
    var pvalue = Math.abs(value);
    for(var i=0;i<specials.length;i++) {
        if(pvalue==specials[i].value) {
            return (value<0 ? '-' : '') + specials[i].tex;
        }
    }
}
/** Convert a number to TeX, displaying it as a fractionm using {@link Numbas.math.rationalApproximation}
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Number} n
 * @returns {TeX}
 */
var texRationalNumber = jme.display.texRationalNumber = function(n)
{
    if(n.complex)
    {
        var re = texRationalNumber(n.re);
        var im = texRationalNumber(n.im)+' i';
        if(n.im==0)
            return re;
        else if(n.re==0)
        {
            if(n.im==1)
                return 'i';
            else if(n.im==-1)
                return '-i';
            else
                return im;
        }
        else if(n.im<0)
        {
            if(n.im==-1)
                return re+' - i';
            else
                return re+' '+im;
        }
        else
        {
            if(n.im==1)
                return re+' + '+'i';
            else
                return re+' + '+im;
        }
    }
    else
    {
        var special = texSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var m;
        var out = math.niceNumber(n);
        if(m = out.match(math.re_scientificNumber)) {
            var mantissa = m[1];
            var exponent = m[2];
            if(exponent[0]=='+')
                exponent = exponent.slice(1);
            return mantissa+' \\times 10^{'+exponent+'}';
        }
        var f = math.rationalApproximation(Math.abs(n));
        if(f[1]==1)
            out = Math.abs(f[0]).toString();
        else
            out = '\\frac{'+f[0]+'}{'+f[1]+'}';
        if(n<0)
            out='-'+out;
        switch(piD)
        {
        case 0:
            return out;
        case 1:
            if(n==-1)
                return '-\\pi';
            else
                return out+' \\pi';
        default:
            if(n==-1)
                return '-\\pi^{'+piD+'}';
            else
                return out+' \\pi^{'+piD+'}';
        }
    }
}
/** Convert a number to TeX, displaying it as a decimal.
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Number} n
 * @returns {TeX}
 */
function texRealNumber(n)
{
    if(n.complex)
    {
        var re = texRealNumber(n.re);
        var im = texRealNumber(n.im)+' i';
        if(n.im==0)
            return re;
        else if(n.re==0)
        {
            if(n.im==1)
                return 'i';
            else if(n.im==-1)
                return '-i';
            else
                return im;
        }
        else if(n.im<0)
        {
            if(n.im==-1)
                return re+' - i';
            else
                return re+' '+im;
        }
        else
        {
            if(n.im==1)
                return re+' + '+'i';
            else
                return re+' + '+im;
        }
    }
    else
    {
        var special = texSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out = math.niceNumber(n);
        var m;
        if(m = out.match(math.re_scientificNumber)) {
            var mantissa = m[1];
            var exponent = m[2];
            if(exponent[0]=='+')
                exponent = exponent.slice(1);
            return mantissa+' \\times 10^{'+exponent+'}';
        }
        switch(piD)
        {
        case 0:
            return out;
        case 1:
            if(n==1)
                return '\\pi';
            else if(n==-1)
                return '-\\pi';
            else
                return out+' \\pi';
        default:
            if(n==1)
                return '\\pi^{'+piD+'}';
            else if(n==-1)
                return '-\\pi^{'+piD+'}';
            else
                return out+' \\pi^{'+piD+'}';
        }
    }
}
/** Convert a vector to TeX. If `settings.rowvector` is true, then it's set horizontally.
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Array.<Number>|Numbas.jme.tree} v
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {TeX}
 */
function texVector(v,settings)
{
    var out;
    var elements;
    if(v.args) {
        elements = v.args.map(function(x){return texify(x,settings)});
    } else {
        var texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
        elements = v.map(function(x){return texNumber(x)});
    }
    if(settings.rowvector)
        out = elements.join(' , ');
    else
        out = '\\begin{matrix} '+elements.join(' \\\\ ')+' \\end{matrix}';
    return out;
}
/** Convert a matrix to TeX.
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Array.<Array.<Number>>|Numbas.jme.tree} m
 * @param {Numbas.jme.display.texify_settings} settings
 * @param {Boolean} parens - enclose the matrix in parentheses?
 * @returns {TeX}
 */
function texMatrix(m,settings,parens)
{
    var out;
    if(m.args)
    {
        var all_lists = true;
        var rows = m.args.map(function(x) {
            if(x.tok.type=='list') {
                return x.args.map(function(y){ return texify(y,settings); });
            } else {
                all_lists = false;
            }
        })
        if(!all_lists) {
            return '\\operatorname{matrix}(' + m.args.map(function(x){return texify(x,settings);}).join(',') +')';
        }
    }
    else
    {
        var texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
        var rows = m.map(function(x){
            return x.map(function(y){ return texNumber(y) });
        });
    }
    if(rows.length==1) {
        out = rows[0].join(', & ');
    }
    else {
        rows = rows.map(function(x) {
            return x.join(' & ');
        });
        out = rows.join(' \\\\ ');
    }
    if(parens)
        return '\\begin{pmatrix} '+out+' \\end{pmatrix}';
    else
        return '\\begin{matrix} '+out+' \\end{matrix}';
}
/** Dictionary of functions to convert specific name annotations to TeX
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var texNameAnnotations = jme.display.texNameAnnotations = {
    verbatim: function(name) {    //verbatim - use to get round things like i and e being interpreted as constants
        return name;
    },
    op: function(name) {
        return '\\operatorname{'+name+'}';
    },
    vector: function(name) {
        return '\\boldsymbol{'+name+'}';
    },
    unit: function(name) {    //unit vector
        return '\\hat{'+name+'}';
    },
    dot: function(name) {        //dot on top
        return '\\dot{'+name+'}';
    },
    matrix: function(name) {
        return '\\mathrm{'+name+'}';
    }
}
texNameAnnotations.verb = texNameAnnotations.verbatim;
texNameAnnotations.v = texNameAnnotations.vector;
texNameAnnotations.m = texNameAnnotations.matrix;
/** Convert a variable name to TeX
 * @memberof Numbas.jme.display
 *
 * @param {String} name
 * @param {Array.<String>} [annotations]
 * @param {function} [longNameMacro=texttt] - function which returns TeX for a long name
 * @returns {TeX}
 */
var texName = jme.display.texName = function(name,annotations,longNameMacro)
{
    longNameMacro = longNameMacro || (function(name){ return '\\texttt{'+name+'}'; });
    var oname = name;
    function applyAnnotations(name) {
        if(!annotations) {
            return name;
        }
        for(var i=0;i<annotations.length;i++)
        {
            var annotation = annotations[i];
            if(annotation in texNameAnnotations) {
                name = texNameAnnotations[annotation](name);
            } else {
                name = '\\'+annotation+'{'+name+'}';
            }
        }
        return name;
    }
    var num_subscripts = name.length - name.replace('_','').length;
    var re_math_variable = /^([^_]*[a-zA-Z])(?:(\d+)|_(\d+)|_([^']{1,2}))?('*)$/;
    var m,isgreek;
    // if the name is a single letter or greek letter name, followed by digits, subscripts or primes
    // m[1]: the "root" name - the bit before any digits, subscripts or primes
    // m[2]: digits immediately following the root
    // m[3]: digits in a subscript
    // m[4]: one or two non-prime characters in a subscript
    // m[5]: prime characters, at the end of the name
    if((m=name.match(re_math_variable)) && (m[1].length==1 || (isgreek=greek.contains(m[1])))) {
        if(isgreek) {
            m[1] = '\\'+m[1];
        }
        name = applyAnnotations(m[1]);
        var subscript = (m[2] || m[3] || m[4]);
        if(subscript) {
            name += '_{'+subscript+'}';
        }
        name += m[5];
    } else if(!name.match(/^\\/)) {
        name = applyAnnotations(longNameMacro(name));
    }
    return name;
}
var greek = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega']
/** Definition of a number with a special name
 * @typedef Numbas.jme.display.special_number_definition
 * @property {Number} value
 * @property {TeX} tex - The TeX code for this number
 * @property {JME} jme - The JME code for this number
 */
/** List of numbers with special names
 *
 * @memberof Numbas.jme.display
 * @type {Array.<Numbas.jme.display.special_number_definition>}
 */
jme.display.specialNumbers = [
    {value: Math.E, tex: 'e', jme: 'e'},
    {value: Math.PI, tex: '\\pi', jme: 'pi'},
    {value: Infinity, tex: '\\infty', jme: 'infinity'}
];
/** Dictionary of functions to turn {@link Numbas.jme.types} objects into TeX strings
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToTeX = jme.display.typeToTeX = {
    'nothing': function(thing,tok,texArgs,settings) {
        return '\\text{nothing}';
    },
    'number': function(thing,tok,texArgs,settings) {
        return settings.texNumber(tok.value);
    },
    'string': function(thing,tok,texArgs,settings) {
        if(tok.latex)
            return tok.value.replace(/\\([\{\}])/g,'$1');
        else
            return '\\textrm{'+tok.value+'}';
    },
    'boolean': function(thing,tok,texArgs,settings) {
        return tok.value ? 'true' : 'false';
    },
    range: function(thing,tok,texArgs,settings) {
        return tok.value[0]+ ' \\dots '+tok.value[1];
    },
    list: function(thing,tok,texArgs,settings) {
        if(!texArgs)
        {
            texArgs = [];
            for(var i=0;i<tok.vars;i++)
            {
                texArgs[i] = texify(tok.value[i],settings);
            }
        }
        return '\\left[ '+texArgs.join(', ')+' \\right]';
    },
    keypair: function(thing,tok,texArgs,settings) {
        var key = '\\textrm{'+tok.key+'}';
        return key+' \\colon '+texArgs[0];
    },
    dict: function(thing,tok,texArgs,settings) {
        if(!texArgs)
        {
            texArgs = [];
            if(tok.value) {
                for(var key in tok.value) {
                    texArgs.push(texify({tok: new jme.types.TKeyPair(key), args:[{tok:tok.value[key]}]},settings));
                }
            }
        }
        return '\\left[ '+texArgs.join(', ')+' \\right]';
    },
    vector: function(thing,tok,texArgs,settings) {
        return ('\\left ( '
                + texVector(tok.value,settings)
                + ' \\right )' );
    },
    matrix: function(thing,tok,texArgs,settings) {
        return '\\left ( '+texMatrix(tok.value,settings)+' \\right )';
    },
    name: function(thing,tok,texArgs,settings) {
        return texName(tok.name,tok.annotation);
    },
    special: function(thing,tok,texArgs,settings) {
        return tok.value;
    },
    conc: function(thing,tok,texArgs,settings) {
        return texArgs.join(' ');
    },
    op: function(thing,tok,texArgs,settings) {
        return texOps[tok.name.toLowerCase()](thing,texArgs,settings);
    },
    'function': function(thing,tok,texArgs,settings) {
        var lowerName = tok.name.toLowerCase();
        if(texOps[lowerName]) {
            return texOps[lowerName](thing,texArgs,settings);
        }
        else {
            function texOperatorName(name) {
                return '\\operatorname{'+name.replace(/_/g,'\\_')+'}';
            }
            return texName(tok.name,tok.annotation,texOperatorName)+' \\left ( '+texArgs.join(', ')+' \\right )';
        }
    },
    set: function(thing,tok,texArgs,settings) {
        texArgs = [];
        for(var i=0;i<tok.value.length;i++) {
            texArgs.push(texify(tok.value[i],settings));
        }
        return '\\left\\{ '+texArgs.join(', ')+' \\right\\}';
    }
}
/** Take a nested application of a single op, e.g. ((1*2)*3)*4, and flatten it so that the tree has one op two or more arguments
 */
function flatten(tree,op) {
    if(!jme.isOp(tree.tok,op)) {
        return [tree];
    }
    var args = [];
    for(var i=0;i<tree.args.length;i++) {
        args = args.concat(flatten(tree.args[i],op));
    }
    return args;
}
/** A dictionary of settings for {@link Numbas.jme.display.texify}.
 * @typedef Numbas.jme.display.texify_settings
 * @property {Boolean} fractionnumbers - Show all numbers as fractions?
 * @property {Boolean} nicenumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {Number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 * @property {Boolean} rowvector - Display vectors as a horizontal list of components?
 */
/** Turn a syntax tree into a TeX string. Data types can be converted to TeX straightforwardly, but operations and functions need a bit more care.
 *
 * The idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX
 *
 * @memberof Numbas.jme.display
 * @method
 *
 * @param {Numbas.jme.tree} thing
 * @param {Numbas.jme.display.texify_settings} settings
 *
 * @returns {TeX}
 */
var texify = Numbas.jme.display.texify = function(thing,settings)
{
    if(!thing)
        return '';
    if(!settings)
        settings = {};
    var tok = thing.tok || thing;
    if(jme.isOp(tok,'*')) {
        // flatten nested multiplications, so a string of consecutive multiplications can be considered together
        thing = {tok: thing.tok, args: flatten(thing,'*')};
    }
    if(thing.args)
    {
        var texArgs = [];
        for(var i=0; i<thing.args.length; i++ )
        {
            texArgs[i] = texify(thing.args[i],settings);
        }
    }
    settings.texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
    if(tok.type in typeToTeX) {
        return typeToTeX[tok.type](thing,tok,texArgs,settings);
    } else {
        throw(new Numbas.Error(R('jme.display.unknown token type',{type:tok.type})));
    }
}
/** Convert a special number to JME, or return undefined if not a special number.
 *  @memberof Numbas.jme.display
 *  @private
 *
 *  @param {Number} n
 *  @returns {TeX}
 */
var jmeSpecialNumber = jme.display.jmeSpecialNumber = function(value) {
    var specials = jme.display.specialNumbers;
    var pvalue = Math.abs(value);
    for(var i=0;i<specials.length;i++) {
        if(pvalue==specials[i].value) {
            return (value<0 ? '-' : '') + specials[i].jme;
        }
    }
}
/** Write a number in JME syntax as a fraction, using {@link Numbas.math.rationalApproximation}
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Number} n
 * @param {Numbas.jme.display.jme_display_settings} settings - if `settings.niceNumber===false`, don't round off numbers
 * @returns {JME}
 */
var jmeRationalNumber = jme.display.jmeRationalNumber = function(n,settings)
{
    settings = settings || {};
    if(n.complex)
    {
        var re = jmeRationalNumber(n.re);
        var im = jmeRationalNumber(n.im)+'i';
        if(n.im==0)
            return re;
        else if(n.re==0)
        {
            if(n.im==1)
                return 'i';
            else if(n.im==-1)
                return '-i';
            else
                return im;
        }
        else if(n.im<0)
        {
            if(n.im==-1)
                return re+' - i';
            else
                return re+' - '+jmeRationalNumber(-n.im)+'i';
        }
        else
        {
            if(n.im==1)
                return re+' + '+'i';
            else
                return re+' + '+im;
        }
    }
    else
    {
        var special = jmeSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var m;
        var out;
        if(settings.niceNumber===false) {
            out = n+'';
        } else {
            out = math.niceNumber(n);
        }
        if(m = out.match(math.re_scientificNumber)) {
            var mantissa = m[1];
            var exponent = m[2];
            if(exponent[0]=='+')
                exponent = exponent.slice(1);
            return mantissa+'*10^('+exponent+')';
        }
        var f = math.rationalApproximation(Math.abs(n),settings.accuracy);
        if(f[1]==1)
            out = Math.abs(f[0]).toString();
        else
            out = f[0]+'/'+f[1];
        if(n<0)
            out=' - '+out;
        switch(piD)
        {
        case 0:
            return out;
        case 1:
            return out+' pi';
        default:
            return out+' pi^'+piD;
        }
    }
}
/** Write a number in JME syntax as a decimal.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Number} n
 * @param {Numbas.jme.display.jme_display_settings} settings - if `settings.niceNumber===false`, don't round off numbers
 * @returns {JME}
 */
function jmeRealNumber(n,settings)
{
    settings = settings || {};
    if(n.complex)
    {
        var re = jmeRealNumber(n.re);
        var im = jmeRealNumber(n.im);
        if(im[im.length-1].match(/[a-zA-Z]/))
            im += '*i';
        else
            im += 'i';
        if(n.im==0)
            return re;
        else if(n.re==0)
        {
            if(n.im==1)
                return 'i';
            else if(n.im==-1)
                return '-i';
            else
                return im;
        }
        else if(n.im<0)
        {
            if(n.im==-1)
                return re+' - i';
            else
                return re+' - '+jmeRealNumber(-n.im)+'i';
        }
        else
        {
            if(n.im==1)
                return re+' + i';
            else
                return re+' + '+im;
        }
    }
    else
    {
        var special = jmeSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out;
        if(settings.niceNumber===false) {
            out = n+'';
        } else {
            out = math.niceNumber(n);
        }
        var m;
        if(m = out.match(math.re_scientificNumber)) {
            var mantissa = m[1];
            var exponent = m[2];
            if(exponent[0]=='+')
                exponent = exponent.slice(1);
            return mantissa+'*10^('+exponent+')';
        }
        switch(piD)
        {
        case 0:
            return out;
        case 1:
            if(n==1)
                return 'pi';
            else
                return out+' pi';
        default:
            if(n==1)
                return 'pi^'+piD;
            else
                return out+' pi^'+piD;
        }
    }
}
/** Dictionary of functions to turn {@link Numbas.jme.types} objects into JME strings
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToJME = Numbas.jme.display.typeToJME = {
    'nothing': function(tree,tok,bits,settings) {
        return 'nothing';
    },
    'number': function(tree,tok,bits,settings) {
        switch(tok.value)
        {
        case Math.E:
            return 'e';
        case Math.PI:
            return 'pi';
        default:
            return settings.jmeNumber(tok.value,settings);
        }
    },
    name: function(tree,tok,bits,settings) {
        return tok.name;
    },
    'string': function(tree,tok,bits,settings) {
        var str = '"'+jme.escape(tok.value)+'"';
        if(tok.latex) {
            return 'latex('+str+')';
        } else {
            return str;
        }
    },
    html: function(tree,tok,bits,settings) {
        var html = $(tok.value).clone().wrap('<div>').parent().html();
        html = html.replace(/"/g,'\\"');
        return 'html("'+html+'")';
    },
    'boolean': function(tree,tok,bits,settings) {
        return (tok.value ? 'true' : 'false');
    },
    range: function(tree,tok,bits,settings) {
        return tok.value[0]+'..'+tok.value[1]+(tok.value[2]==1 ? '' : '#'+tok.value[2]);
    },
    list: function(tree,tok,bits,settings) {
        if(!bits)
        {
            if(tok.value) {
                bits = tok.value.map(function(b){return treeToJME({tok:b},settings);});
            }
            else {
                bits = [];
            }
        }
        return '[ '+bits.join(', ')+' ]';
    },
    keypair: function(tree,tok,bits,settings) {
        var key = typeToJME['string'](null,{value:tok.key},[],settings);
        return key+': '+bits[0];
    },
    dict: function(tree,tok,bits,settings) {
        if(!bits)
        {
            bits = [];
            if(tok.value) {
                for(var key in tok.value) {
                    bits.push(treeToJME({tok: new jme.types.TKeyPair(key), args:[{tok:tok.value[key]}]},settings));
                }
            }
        }
        if(bits.length) {
            return '[ '+bits.join(', ')+' ]';
        } else {
            return 'dict()';
        }
    },
    vector: function(tree,tok,bits,settings) {
        return 'vector('+tok.value.map(function(n){ return settings.jmeNumber(n,settings)}).join(',')+')';
    },
    matrix: function(tree,tok,bits,settings) {
        return 'matrix('+
            tok.value.map(function(row){return '['+row.map(function(n){ return settings.jmeNumber(n,settings)}).join(',')+']'}).join(',')+')';
    },
    'function': function(tree,tok,bits,settings) {
        if(tok.name in jmeFunctions) {
            return jmeFunctions[tok.name](tree,tok,bits,settings);
        }
        if(!bits) {
            return tok.name+'()';
        } else {
            return tok.name+'('+bits.join(',')+')';
        }
    },
    op: function(tree,tok,bits,settings) {
        var op = tok.name;
        var args = tree.args, l = args.length;
        for(var i=0;i<l;i++) {
            var arg_type = args[i].tok.type;
            var arg_value = args[i].tok.value;
            var pd;
            var bracketNumberOp = (op=='*' || op=='-u' || op=='/' || op=='^' || op=='fact')
            var bracketArg = arg_type=='op' && op in opBrackets && opBrackets[op][i][args[i].tok.name]==true // if this kind of op as an argument to the parent op always gets brackets
            bracketArg = bracketArg || ((arg_type=='number' && arg_value.complex && bracketNumberOp) && (arg_value.im!=0 && !(arg_value.im==1 && arg_value.re==0)));  // put brackets round a complex number
            bracketArg = bracketArg || (arg_type=='number' && (pd = math.piDegree(args[i].tok.value))>0 && arg_value/math.pow(Math.PI,pd)>1 && bracketNumberOp);  // put brackets around multiples of pi
            bracketArg = bracketArg || (arg_type=='number' && bracketNumberOp && bits[i].indexOf('/')>=0); // put brackets around fractions when necessary
            if(bracketArg) {
                bits[i] = '('+bits[i]+')';
                args[i].bracketed=true;
            }
        }
        //omit multiplication symbol when not necessary
        if(op=='*') {
            //number or brackets followed by name or brackets doesn't need a times symbol
            //except <anything>*(-<something>) does
            if(!settings.alwaystimes && ((args[0].tok.type=='number' && math.piDegree(args[0].tok.value)==0 && args[0].tok.value!=Math.E) || args[0].bracketed) && (args[1].tok.type == 'name' || args[1].bracketed && !jme.isOp(tree.args[1].tok,'-u')) )
            {
                op = '';
            }
        }
        switch(op) {
        case '+u':
            op='+';
            break;
        case '-u':
            op='-';
            if(args[0].tok.type=='number' && args[0].tok.value.complex)
                return settings.jmeNumber({complex:true, re: -args[0].tok.value.re, im: -args[0].tok.value.im},settings);
            break;
        case '-':
            var b = args[1].tok.value;
            if(args[1].tok.type=='number' && args[1].tok.value.complex && args[1].tok.value.re!=0) {
                return bits[0]+' - '+settings.jmeNumber(math.complex(b.re,-b.im),settings);
            }
            op = ' - ';
            break;
        case 'and':
        case 'or':
        case 'isa':
        case 'except':
        case '+':
        case 'in':
            op=' '+op+' ';
            break;
        case 'not':
            op = 'not ';
            break;
        case 'fact':
            op = '!';
            if(!(tree.args[0].tok.type=='number' || tree.args[0].tok.type=='name')) {
                bits[0] = '('+bits[0]+')';
            }
            break;
        }
        if(l==1) {
            return tok.postfix ? bits[0]+op : op+bits[0];
        } else {
            return bits[0]+op+bits[1];
        }
    },
    set: function(tree,tok,bits,settings) {
        return 'set('+tok.value.map(function(thing){return treeToJME({tok:thing},settings);}).join(',')+')';
    },
    expression: function(tree,tok,bits,settings) {
        var expr = treeToJME(tok.tree);
        if(settings.wrapexpressions) {
            expr = 'expression("'+jme.escape(expr)+'")';
        }
        return expr;
    }
}
/** Define how to render function in JME, for special cases when the normal rendering `f(...)` isn't right.
 * @enum {function}
 * @memberof Numbas.jme.display
 */
var jmeFunctions = jme.display.jmeFunctions = {
    'dict': typeToJME.dict,
    'fact': function(tree,tok,bits,settings) {
        if(tree.args[0].tok.type=='number' || tree.args[0].tok.type=='name') {
            return bits[0]+'!';
        } else {
            return '( '+bits[0]+' )!';
        }
    }
}
/** A dictionary of settings for {@link Numbas.jme.display.treeToJME}.
 * @typedef Numbas.jme.display.jme_display_settings
 * @property {Boolean} fractionnumbers - Show all numbers as fractions?
 * @property {Boolean} niceNumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {Boolean} wrapexpressions - Wrap TExpression tokens in `expression("")`?
 * @property {Number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 */
/** Turn a syntax tree back into a JME expression (used when an expression is simplified)
 * @memberof Numbas.jme.display
 * @method
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.display.jme_display_settings} settings
 * @returns {JME}
 */
var treeToJME = jme.display.treeToJME = function(tree,settings)
{
    if(!tree)
        return '';
    settings = settings || {};
    var args=tree.args, l;
    if(args!==undefined && ((l=args.length)>0))
    {
        var bits = args.map(function(i){return treeToJME(i,settings)});
    }
    settings.jmeNumber = settings.fractionnumbers ? jmeRationalNumber : jmeRealNumber;
    var tok = tree.tok;
    if(tok.type in typeToJME) {
        return typeToJME[tok.type](tree,tok,bits,settings);
    } else {
        throw(new Numbas.Error(R('jme.display.unknown token type',{type:tok.type})));
    }
}
/** Does each argument (of an operation) need brackets around it?
 *
 * Arrays consisting of one object for each argument of the operation
 * @enum
 * @memberof Numbas.jme.display
 * @private
 */
var opBrackets = Numbas.jme.display.opBrackets = {
    '+u':[{}],
    '-u':[{'+':true,'-':true}],
    '+': [{},{}],
    '-': [{},{'+':true,'-':true}],
    '*': [{'+u':true,'-u':true,'+':true, '-':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '/':true}],
    '/': [{'+u':true,'-u':true,'+':true, '-':true, '*':true},{'+u':true,'-u':true,'+':true, '-':true, '*':true}],
    '^': [{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
    'and': [{'or':true, 'xor':true},{'or':true, 'xor':true}],
    'or': [{'xor':true},{'xor':true}],
    'xor':[{},{}],
    '=': [{},{}]
};
/** For backwards compatibility, copy references from some Numbas.jme.rules members to Numbas.jme.display.
 *  These used to belong to Numbas.jme.display, but were moved into a separate file.
 */
['Rule','getCommutingTerms','matchTree','matchExpression','simplificationRules','compileRules'].forEach(function(name) {
    jme.display[name] = jme.rules[name];
});
});

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
/** @file Stuff to do with making new functions from JME or JavaScript code,
 * generating question variables,
 * and substituting variables into maths or the DOM
 *
 * Provides {@link Numbas.jme.variables}
 */
Numbas.queueScript('jme-variables',['base','jme','util'],function() {
var jme = Numbas.jme;
var util = Numbas.util;
/** @namespace Numbas.jme.variables */

/** A dictionary describing a variable to be evaluated
 * @typedef {Object} Numbas.jme.variables.variable_data_dict
 * @property {Numbas.jme.tree} tree - definition of variable
 * @property {String[]} vars - names of variables this variable depends on
 */

/** The definition of a custom JME function.
 * @typedef Numbas.jme.variables.func_data
 * @type {Object}
 * @property {String} name
 * @property {String} definition - definition of the function, either in {@link JME} or JavaScript
 * @property {String} language - either `"jme"` or `"javascript"`
 * @property {String} outtype - name of the {@link Numbas.jme.token} type this function returns
 * @property {Array.<Object>} parameters - Definition of the function's calling signature: an array of objects with properties `name` and `type` for each of the function's parameters.
 */

jme.variables = /** @lends Numbas.jme.variables */ {
    /** Make a new function, whose definition is written in JME.
     * @param {Object} fn - contains `definition` and `paramNames`.
     * @param {Numbas.jme.Scope} scope
     * @returns {function} - function which evaluates arguments and adds them to the scope, then evaluates `fn.definition` over that scope.
     */
    makeJMEFunction: function(fn,scope) {
        fn.tree = jme.compile(fn.definition,scope,true);
        return function(args,scope) {
            var oscope = scope;
            scope = new jme.Scope(scope);
            for(var j=0;j<args.length;j++)
            {
                scope.variables[fn.paramNames[j]] = args[j];
            }
            return jme.evaluate(this.tree,scope);
        }
    },
    /** Make a new function, whose definition is written in JavaScript.
     *
     * The JavaScript is wrapped with `(function(<paramNames>){ ` and ` }`)
     *
     * @param {Object} fn - contains `definition` and `paramNames`.
     * @param {Object} withEnv - dictionary of local variables for javascript functions
     * @returns {function} - function which evaluates arguments, unwraps them to JavaScript values, then evalutes the JavaScript function and returns the result, wrapped as a {@link Numbas.jme.token}
     */
    makeJavascriptFunction: function(fn,withEnv) {
        var paramNames = fn.paramNames.slice();
        paramNames.push('scope');
        var preamble='fn.jfn=(function('+paramNames.join(',')+'){\n';
        var math = Numbas.math;
        var util = Numbas.util;
        withEnv = withEnv || {};
        try {
            with(withEnv) {
                var jfn = eval(preamble+fn.definition+'\n})');
            }
        } catch(e) {
            throw(new Numbas.Error('jme.variables.syntax error in function definition'));
        }
        return function(args,scope) {
            args = args.map(function(a){return jme.unwrapValue(a)});
            args.push(scope);
            try {
                var val = jfn.apply(this,args);
                if(val===undefined) {
                    throw(new Numbas.Error('jme.user javascript.returned undefined',{name:fn.name}));
                }
                val = jme.wrapValue(val,fn.outtype);
                if(!val.type)
                    val = new fn.outcons(val);
                return val;
            }
            catch(e)
            {
                throw(new Numbas.Error('jme.user javascript.error',{name:fn.name,message:e.message}));
            }
        }
    },
    /** Make a custom function.
     *
     * @param {Object} tmpfn - contains `definition`, `name`, `language`, `parameters`
     * @param {Numbas.jme.Scope} scope
     * @param {Object} withEnv - dictionary of local variables for javascript functions
     * @returns {Object} - contains `outcons`, `intype`, `evaluate`
     */
    makeFunction: function(tmpfn,scope,withEnv) {
        var intype = [],
            paramNames = [];
        tmpfn.parameters.map(function(p) {
            intype.push(jme.types[p.type]);
            paramNames.push(p.name);
        });
        var outcons = jme.types[tmpfn.outtype];
        var fn = new jme.funcObj(tmpfn.name,intype,outcons,null,true);
        fn.outcons = outcons;
        fn.intype = intype;
        fn.paramNames = paramNames;
        fn.definition = tmpfn.definition;
        fn.name = tmpfn.name;
        fn.language = tmpfn.language;
        try {
            switch(fn.language)
            {
            case 'jme':
                fn.evaluate = jme.variables.makeJMEFunction(fn,scope);
                break;
            case 'javascript':
                fn.evaluate = jme.variables.makeJavascriptFunction(fn,withEnv);
                break;
            }
        } catch(e) {
            throw(new Numbas.Error('jme.variables.error making function',{name:fn.name,message:e.message}));
        }
        return fn
    },
    /** Make up custom functions
     * @param {Numbas.jme.variables.func_data[]} tmpFunctions
     * @param {Numbas.jme.Scope} scope
     * @param {Object} withEnv - dictionary of local variables for javascript functions
     * @returns {Object.<Numbas.jme.funcObj>}
     * @see Numbas.jme.variables.makeFunction
     */
    makeFunctions: function(tmpFunctions,scope,withEnv)
    {
        scope = new jme.Scope(scope);
        var functions = scope.functions;
        var tmpFunctions2 = [];
        for(var i=0;i<tmpFunctions.length;i++)
        {
            var cfn = jme.variables.makeFunction(tmpFunctions[i],scope,withEnv);
            if(functions[cfn.name]===undefined)
                functions[cfn.name] = [];
            functions[cfn.name].push(cfn);
        }
        return functions;
    },
    /** Evaluate a variable, evaluating all its dependencies first.
     * @param {String} name - the name of the variable to evaluate
     * @param {Numbas.jme.variables.variable_data_dict} todo - dictionary of variables still to evaluate
     * @param {Numbas.jme.Scope} scope
     * @param {String[]} path - Breadcrumbs - variable names currently being evaluated, so we can detect circular dependencies
     * @returns {Numbas.jme.token}
     */
    computeVariable: function(name,todo,scope,path,computeFn)
    {
        if(scope.getVariable(name)!==undefined)
            return scope.variables[name];
        if(path===undefined)
            path=[];
        computeFn = computeFn || jme.variables.computeVariable;
        if(path.contains(name))
        {
            throw(new Numbas.Error('jme.variables.circular reference',{name:name,path:path}));
        }
        var v = todo[name];
        if(v===undefined)
            throw(new Numbas.Error('jme.variables.variable not defined',{name:name}));
        //work out dependencies
        for(var i=0;i<v.vars.length;i++)
        {
            var x=v.vars[i];
            if(scope.variables[x]===undefined)
            {
                var newpath = path.slice(0);
                newpath.splice(0,0,name);
                try {
                    computeFn(x,todo,scope,newpath,computeFn);
                }
                catch(e) {
                    if(e.originalMessage == 'jme.variables.circular reference' || e.originalMessage == 'jme.variables.variable not defined') {
                        throw(e);
                    } else {
                        throw(new Numbas.Error('jme.variables.error computing dependency',{name:x, message: e.message}));
                    }
                }
            }
        }
        if(!v.tree) {
            throw(new Numbas.Error('jme.variables.empty definition',{name:name}));
        }
        try {
            scope.variables[name] = jme.evaluate(v.tree,scope);
        } catch(e) {
            throw(new Numbas.Error('jme.variables.error evaluating variable',{name:name,message:e.message}));
        }
        return scope.variables[name];
    },
    /** Evaluate dictionary of variables
     * @param {Numbas.jme.variables.variable_data_dict} todo - dictionary of variables mapped to their definitions
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.tree} condition - condition on the values of the variables which must be satisfied
     * @param {function} computeFn - a function to compute a variable. Default is Numbas.jme.variables.computeVariable
     * @returns {Object} - {variables: dictionary of evaluated variables, conditionSatisfied: was the condition satisfied?}
     */
    makeVariables: function(todo,scope,condition,computeFn)
    {
        computeFn = computeFn || jme.variables.computeVariable;
        var conditionSatisfied = true;
        if(condition) {
            var condition_vars = jme.findvars(condition);
            condition_vars.map(function(v) {
                computeFn(v,todo,scope,undefined,computeFn);
            });
            conditionSatisfied = jme.evaluate(condition,scope).value;
        }
        if(conditionSatisfied) {
            for(var x in todo)
            {
                computeFn(x,todo,scope,undefined,computeFn);
            }
        }
        return {variables: scope.variables, conditionSatisfied: conditionSatisfied, scope: scope};
    },
    /** Collect together a ruleset, evaluating all its dependencies first.
     * @param {String} name - the name of the ruleset to evaluate
     * @param {Object.<String[]>} todo - dictionary of rulesets still to evaluate
     * @param {Numbas.jme.Scope} scope
     * @param {String[]} path - Breadcrumbs - rulesets names currently being evaluated, so we can detect circular dependencies
     * @returns {Numbas.jme.rules.Ruleset}
     */
    computeRuleset: function(name,todo,scope,path) {
        if(scope.getRuleset(name.toLowerCase()) || (name.toLowerCase() in jme.displayFlags)) {
            return;
        }
        if(path.contains(name)) {
            throw(new Numbas.Error('ruleset.circular reference',{name:name}));
        }
        var newpath = path.slice();
        newpath.push(name);
        if(todo[name]===undefined) {
            throw(new Numbas.Error('ruleset.set not defined',{name:name}));
        }
        todo[name].forEach(function(name) {
            if(typeof(name)!=='string') {
                return;
            }
            var m = /^\s*(!)?(.*)\s*$/.exec(name);
            var name2 = m[2].trim();
            jme.variables.computeRuleset(name2,todo,scope,newpath);
        });
        var ruleset = Numbas.jme.collectRuleset(todo[name],scope.allRulesets());
        scope.setRuleset(name,ruleset);
        return ruleset;
    },
    /** Gather together a set of ruleset definitions
     * @param {Object.<String[]>} todo - a dictionary mapping ruleset names to definitions
     * @param {Numbas.jme.Scope} scope - the scope to gather the rulesets in. The rulesets are added to this scope as a side-effect.
     * @returns {Object.<Numbas.jme.rules.Ruleset>} a dictionary of rulesets
     */
    makeRulesets: function(todo,scope) {
        var out = {};
        for(var name in todo) {
            out[name] = jme.variables.computeRuleset(name,todo,scope,[]);
        }
        return out;
    },
    /** Given a todo dictionary of variables, return a dictionary with only the variables depending on the given list of variables
     * @param {Object} todo - dictionary of variables mapped to their definitions
     * @param {String[]} ancestors - list of variable names whose dependants we should find
     * @returns {Object} - a copy of the todo list, only including the dependants of the given variables
     */
    variableDependants: function(todo,ancestors) {
        // a dictionary mapping variable names to lists of names of variables they depend on
        var dependants = {};
        function findDependants(name,path) {
            path = path || [];
            // stop at circular references
            if(path.contains(name)) {
                return [];
            }
            // if we've already done this, variable, return it
            if(name in dependants) {
                return dependants[name];
            }
            // for each variable used in this variable, find its dependants
            var d = [];
            if(name in todo) {
                var newpath = path.slice();
                newpath.push(name);
                todo[name].vars.map(function(name2) {
                    d = d.concat(name2,findDependants(name2,newpath));
                });
            }
            // make a new list with duplicates removed
            var o = [];
            d.map(function(name2) {
                if(!o.contains(name2)) {
                    o.push(name2);
                }
            });
            dependants[name] = o;
            return o;
        }
        for(var name in todo) {
            findDependants(name);
        }
        var out = {};
        for(var name in dependants) {
            for(var i=0;i<ancestors.length;i++) {
                if(dependants[name].contains(ancestors[i])) {
                    out[name] = todo[name];
                    break;
                }
            }
        }
        return out;
    },
    /** Substitute variables into a DOM element (works recursively on the element's children)
     *
     * Ignores iframes and elements with the attribute `nosubvars`.
     * @param {Element} element
     * @param {Numbas.jme.Scope} scope
     */
    DOMcontentsubvars: function(element, scope) {
        var subber = new DOMcontentsubber(scope);
        return subber.subvars(element);
    },
    /** Substitute variables into the contents of a text node. Substituted values might contain HTML elements, so the return value is a collection of DOM elements, not another string.
     * @param {String} str - the contents of the text node
     * @param {Numbas.jme.Scope} scope
     * @param {Document} doc - the document the text node belongs to.
     * @returns {Node[]} - array of DOM nodes to replace the string with
     */
    DOMsubvars: function(str,scope,doc) {
        doc = doc || document;
        var bits = util.splitbrackets(str,'{','}');
        if(bits.length==1)
            return [doc.createTextNode(str)];
        function doToken(token) {
            switch(token.type){
            case 'html':
                return token.value;
            case 'number':
                return Numbas.math.niceNumber(token.value);
            case 'string':
                return token.value.replace(/\\([{}])/g,'$1');
            case 'list':
                return '[ '+token.value.map(function(item){return doToken(item)}).join(', ')+' ]';
            default:
                return jme.display.treeToJME({tok:token});
            }
        }
        var out = [];
        for(var i=0; i<bits.length; i++)
        {
            if(i % 2)
            {
                var v = jme.evaluate(jme.compile(bits[i],scope),scope);
                v = doToken(v);
            }
            else
            {
                v = bits[i];
            }
            if(typeof v == 'string') {
                if(out.length>0 && typeof out[out.length-1]=='string')
                    out[out.length-1]+=v;
                else
                    out.push(v);
            }
            else {
                out.push(v);
            }
        }
        for(var i=0;i<out.length;i++) {
            if(typeof out[i] == 'string') {
                var d = document.createElement('div');
                d.innerHTML = out[i];
                d = importNode(doc,d,true);
                out[i] = $(d).contents();
            }
        }
        return out;
    }
};
// cross-browser importNode from http://www.alistapart.com/articles/crossbrowserscripting/
// because IE8 is completely mentile and won't let you copy nodes between documents in anything approaching a reasonable way
function importNode(doc,node,allChildren) {
    var ELEMENT_NODE = 1;
    var TEXT_NODE = 3;
    var CDATA_SECTION_NODE = 4;
    var COMMENT_NODE = 8;
    switch (node.nodeType) {
        case ELEMENT_NODE:
            var newNode = doc.createElement(node.nodeName);
            var il;
            /* does the node have any attributes to add? */
            if (node.attributes && (il=node.attributes.length) > 0) {
                for (var i = 0; i < il; i++)
                    newNode.setAttribute(node.attributes[i].nodeName, node.getAttribute(node.attributes[i].nodeName));
            }
            /* are we going after children too, and does the node have any? */
            if (allChildren && node.childNodes && (il=node.childNodes.length) > 0) {
                for (var i = 0; i<il; i++)
                    newNode.appendChild(importNode(doc,node.childNodes[i], allChildren));
            }
            return newNode;
        case TEXT_NODE:
        case CDATA_SECTION_NODE:
            return doc.createTextNode(node.nodeValue);
        case COMMENT_NODE:
            return doc.createComment(node.nodeValue);
    }
};
function DOMcontentsubber(scope) {
    this.scope = scope;
    this.re_end = undefined;
}
DOMcontentsubber.prototype = {
    subvars: function(element) {
        switch(element.nodeType) {
            case 1: //element
                this.sub_element(element);
                break;
            case 3: //text
                this.sub_text(element);
                break;
            default:
                return;
        }
    },
    sub_element: function(element) {
        var subber = this;
        var scope = this.scope;
        if($.nodeName(element,'iframe')) {
            return element;
        } else if(element.hasAttribute('nosubvars')) {
            return element;
        } else if($.nodeName(element,'object')) {
            function go() {
                jme.variables.DOMcontentsubvars(element.contentDocument.rootElement,scope);
            }
            if(element.contentDocument && element.contentDocument.rootElement) {
                go();
            } else {
                element.addEventListener('load',go,false);
            }
            return;
        }
        if(element.hasAttribute('data-jme-visible')) {
            var condition = element.getAttribute('data-jme-visible');
            var result = scope.evaluate(condition);
            if(!(result.type=='boolean' && result.value==true)) {
                $(element).remove();
                return;
            }
        }
        var new_attrs = {};
        for(var i=0;i<element.attributes.length;i++) {
            var m;
            var attr = element.attributes[i];
            if(m = attr.name.match(/^eval-(.*)/)) {
                var name = m[1];
                var value = jme.subvars(attr.value,scope,true);
                new_attrs[name] = value;
            }
        }
        for(var name in new_attrs) {
            element.setAttribute(name,new_attrs[name]);
        }
        var subber = this;
        var o_re_end = this.re_end;
        $(element).contents().each(function() {
            subber.subvars(this);
        });
        this.re_end = o_re_end; // make sure that any maths environment only applies to children of this element; otherwise, an unended maths environment could leak into later tags
        return;
    },
    sub_text: function(node) {
        var selector = $(node);
        var str = node.nodeValue;
        var bits = util.contentsplitbrackets(str,this.re_end);    //split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
        this.re_end = bits.re_end;
        var i=0;
        var l = bits.length;
        for(var i=0; i<l; i+=4) {
            var textsubs = jme.variables.DOMsubvars(bits[i],this.scope,node.ownerDocument);
            for(var j=0;j<textsubs.length;j++) {
                selector.before(textsubs[j]);
            }
            var startDelimiter = bits[i+1] || '';
            var tex = bits[i+2] || '';
            var endDelimiter = bits[i+3] || '';
            var n = node.ownerDocument.createTextNode(startDelimiter+tex+endDelimiter);
            selector.before(n);
        }
        selector.remove();
    }
}
});

