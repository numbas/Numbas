// Compiled using runtime/scripts/numbas.js runtime/scripts/localisation.js runtime/scripts/util.js runtime/scripts/math.js runtime/scripts/i18next/i18next.js runtime/scripts/es5-shim.js runtime/scripts/es6-shim.js runtime/scripts/decimal/decimal.js runtime/scripts/jme-rules.js runtime/scripts/jme.js runtime/scripts/jme-builtins.js runtime/scripts/jme-display.js runtime/scripts/jme-variables.js runtime/scripts/jme-calculus.js
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
try {
    window;
} catch(e) {
    try {
        global.window = global;
        global.alert = function(m) { console.error(m); }
    } catch(e) {
    }
}
if(!window.Numbas) { window.Numbas = {} }
/** @namespace Numbas */
/** Extensions should add objects to this so they can be accessed */
Numbas.extensions = {};
/** A function for displaying debug info in the console. It will try to give a reference back to the line that called it, if it can.
 *
 * @param {string} msg - Text to display.
 * @param {boolean} [noStack=false] - Don't show the stack trace.
 */
Numbas.debug = function(msg,noStack)
{
    if(window.console)
    {
        var e = new Error(msg);
        if(e.stack && !noStack)
        {
            var words= e.stack.split('\n')[2];
            console.error(msg," "+words);
        }
        else
        {
            console.log(msg);
        }
    }
};
/** Display an error in a nice alert box. Also sends the error to the console via {@link Numbas.debug}.
 *
 * @param {Error} e
 */
Numbas.showError = function(e)
{
    var message = (e || e.message)+'';
    message += ' <br> ' + e.stack.replace(/\n/g,'<br>\n');
    Numbas.debug(message);
    Numbas.display && Numbas.display.showAlert(message);
    throw(e);
};
/** Generic error class. Extends JavaScript's `Error`.
 *
 * @class
 * @param {string} message - A description of the error. Localised by R.js.
 * @param {object} args - Arguments for the error message.
 * @param {Error} originalError - If this is a re-thrown error, the original error object.
 */
Numbas.Error = function(message, args, originalError)
{
    Error.call(this);
    if(Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }
    this.name="Numbas Error";
    this.originalMessage = message;
    this.message = R.apply(this,[message,args]);
    this.originalMessages = [message];
    if(originalError!==undefined) {
        this.originalError = originalError;
        if(originalError.originalMessages) {
            this.originalMessages = this.originalMessages.concat(originalError.originalMessages.filter(function(m){return m!=message}));
        }
    }
}
Numbas.Error.prototype = Error.prototype;
Numbas.Error.prototype.constructor = Numbas.Error;
var scriptreqs = {};
/** Keep track of loading status of a script and its dependencies.
 *
 * @param {string} file - Name of the script.
 * @param {Array.<string>} fdeps - Scripts which this one depends on.
 * @param {Function} callback
 * @global
 * @class
 * @property {string} file - Name of the script.
 * @property {boolean} loaded - Has the script been loaded yet?
 * @property {boolean} executed - Has the script been run?
 * @property {Array.<string>} backdeps - Scripts which depend on this one (need this one to run first)
 * @property {Array.<string>} fdeps - Scripts which this one depends on (it must run after them)
 * @property {Function} callback - The function to run when all this script's dependencies have run (this is the script itself)
 */
var RequireScript = Numbas.RequireScript = function(file,fdeps,callback)
{
    this.file = file;
    scriptreqs[file] = this;
    this.backdeps = [];
    this.fdeps = fdeps || [];
    this.callback = callback;
}
RequireScript.prototype = {
    loaded: false,
    executed: false,
    backdeps: [],
    fdeps: [],
    callback: null,

    
    /** Try to run this script. It will run if all of its dependencies have run.
     * Once it has run, every script which depends on it will try to run.
     */
    tryRun: function() {
        if(this.loaded && !this.executed) {
            var dependencies_executed = this.fdeps.every(function(r){ return scriptreqs[r].executed; });
            if(dependencies_executed) {
                if(this.callback) {
                    this.callback.apply(window,[{exports:window}]);
                }
                this.executed = true;
                this.backdeps.forEach(function(r) {
                    scriptreqs[r].tryRun();
                });
            }
        }
    }
};
/** Ask to load a javascript file. Unless `noreq` is set, the file's code must be wrapped in a call to Numbas.queueScript with its filename as the first parameter.
 *
 * @memberof Numbas
 * @param {string} file
 * @param {boolean} noreq - Don't create a {@link Numbas.RequireScript} object.
 * @returns {Numbas.RequireScript}
 */
var loadScript = Numbas.loadScript = function(file,noreq)
{
    if(!noreq)
    {
        if(scriptreqs[file]!==undefined)
            return scriptreqs[file];
        var req = new RequireScript(file);
        return req;
    }
    return scriptreqs[file];
}
/**
 * Queue up a file's code to be executed.
 * Each script should be wrapped in this function.
 *
 * @param {string} file - Name of the script.
 * @param {Array.<string>} deps - A list of other scripts which need to be run before this one can be run.
 * @param {Function} callback - A function wrapping up this file's code.
 */
Numbas.queueScript = function(file, deps, callback) {
    if(typeof(deps)=='string')
        deps = [deps];
    for(var i=0;i<deps.length;i++)
    {
        var dep = deps[i];
        deps[i] = dep;
        loadScript(dep);
        scriptreqs[dep].backdeps.push(file);
    }

    var req = scriptreqs[file];
    if(req) {
        req.fdeps = deps;
        req.callback = callback;
    } else {
        req = new RequireScript(file,deps,callback);
    }
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
    for(var x in scriptreqs)
    {
        try {
            scriptreqs[x].tryRun();
        } catch(e) {
            alert(e+'');
            console.error(e);
            Numbas.dead = true;
            return;
        }
    }
}

Numbas.runImmediately = function(deps,fn) {
    Numbas.queueScript('base',[], function() {});
    var missing_dependencies = deps.filter(function(r) {
        if(!scriptreqs[r]) {
            return true;
        } else if(!scriptreqs[r].loaded) {
            return true;
        } else if(!scriptreqs[r].executed) {
            return true;
        }
    });
    if(missing_dependencies.length) {
        console.log(deps.filter(function(r){return scriptreqs[r] ? scriptreqs[r].executed : true}));
        throw(new Error("Can't run because the following dependencies have not run: "+missing_dependencies.join(', ')));
    }
    fn();
}

/** A wrapper round {@link Numbas.queueScript} to register extensions easily.
 * The extension is not run immediately - call {@link Numbas.activateExtension} to run the extension.
 *
 * @param {string} name - Unique name of the extension.
 * @param {Array.<string>} deps - A list of other scripts which need to be run before this one can be run.
 * @param {Function} callback - Code to set up the extension. It's given the object `Numbas.extensions.<name>` as a parameter, which contains a {@link Numbas.jme.Scope} object.
 */
var extension_callbacks = {};
Numbas.addExtension = function(name,deps,callback) {
    deps.push('jme');
    Numbas.queueScript('extensions/'+name+'/'+name+'.js',deps,function() {
        var extension = Numbas.extensions[name] = {
            scope: new Numbas.jme.Scope()
        };
        extension_callbacks[name] = {
            callback: callback,
            extension: extension,
            activated: false
        }
    });
}

/** Run the extension with the given name. The extension must have already been registered with {@link Numbas.addExtension}.
 *
 * @param {string} name
 */
Numbas.activateExtension = function(name) {
    var cb = extension_callbacks[name];
    if(!cb) {
        throw(new Numbas.Error("extension.not found",{name: name}));
    }
    if(!cb.activated) {
        cb.callback(cb.extension);
        cb.activated = true;
    }
}

/** Check all required scripts have executed - the theme should call this once the document has loaded.
 * 
 * @returns {Array.<object>} A list of files which have not loaded.
 */
Numbas.checkAllScriptsLoaded = function() {
    var fails = [];
    for(var file in scriptreqs) {
        var req = scriptreqs[file];
        if(req.executed) {
            continue;
        }
        if(req.fdeps.every(function(f){return scriptreqs[f].executed})) {
            var err = new Numbas.Error('die.script not loaded',{file:req.file});
            Numbas.display && Numbas.display.die(err);
        }
        fails.push({file: req.file, req: req, fdeps: req.fdeps.filter(function(f){return !scriptreqs[f].executed})});
    };
    return fails;
}
})();

/** Resources to do with localisation: `preferred_locale` is the code of the locale to use, and `resources` is a dictionary of localisations.
 *
 * @name locale
 * @memberof Numbas
 * @type {object}
 */

/** Definitions of marking scripts for the built-in part types.
 *
 * @name raw_marking_scripts
 * @memberof Numbas
 * @type {object.<string>}
 */

/** Marking scripts for the built-in part types.
 *
 * @name marking_scripts
 * @memberof Numbas
 * @type {object.<Numbas.marking.MarkingScript>}
 */

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
     * @see Numbas.util.equalityTests
     * @returns {boolean}
     */
    eq: function(a,b) {
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
            return util.equalityTests[a.type](a,b);
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
        'dict': function(a,b) {
            var seen = {};
            for(var x in a.value) {
                seen[x] = true;
                if(!util.eq(a.value[x],b.value[x])) {
                    return false;
                }
            }
            for(var x in a.value) {
                if(seen[x]) {
                    continue;
                }
                if(!util.eq(a.value[x],b.value[x])) {
                    return false;
                }
            }
            return true;
        },
        'expression': function(a,b) {
            return Numbas.jme.treesSame(a.tree,b.tree);
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
        'list': function(a,b) {
            if(!a.value || !b.value) {
                return !a.value && !b.value;
            }
            return a.value.length==b.value.length && a.value.filter(function(ae,i){return !util.eq(ae,b.value[i])}).length==0;
        },
        'matrix': function(a,b) {
            return Numbas.matrixmath.eq(a.value,b.value);
        },
        'name': function(a,b) {
            return a.name.toLowerCase() == b.name.toLowerCase();
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
        'set': function(a,b) {
            return Numbas.setmath.eq(a.value,b.value);
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
     * @returns {boolean}
     * @see Numbas.util.eq
     */
    neq: function(a,b) {
        return !util.eq(a,b);
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
    /** Return a copy of the input list with duplicates removed.
     *
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
     *
     * @param {Array} list
     * @param {Numbas.jme.token} value
     * @returns {boolean}
     */
    contains: function(list,value) {
        for(var i=0;i<list.length;i++) {
            if(util.eq(value,list[i])) {
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
            return $(d).text().trim().length>0;
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
        } else if(allowFractions && (m = util.parseFraction(s))) {
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
        } else if(allowFractions && (m = util.parseFraction(s))) {
            return m.numerator/m.denominator;
        } else {
            return NaN;
        }
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
            s = Numbas.math.niceNumber(n);
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
            } else if(str.slice(i,i+rb.length)==rb) {
                bits.push({kind:'str',str:str.slice(start,i)});
                bits.push({kind:'rb'});
                i += rb.length-1;
                start = i+1;
            }
        }
        if(start<str.length) {
            bits.push({kind:'str',str:str.slice(start)});
        }
        var out = [];
        var depth = 0;
        var s = '';
        var s_plain = '';
        var s_unclosed = '';
        for(var i=0;i<bits.length;i++) {
            switch(bits[i].kind) {
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
            return Numbas.math.niceNumber(parseFloat(integer+'.'+decimal),{style:'scientific'});
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
Numbas.queueScript('math',['base','decimal'],function() {
    
    Decimal.set({ 
        precision: 40,
        modulo: Decimal.EUCLID,
        toExpPos: 1000,
        toExpNeg: -1000
    });

/** Mathematical functions, providing stuff that the built-in `Math` object doesn't.
 *
 * @namespace Numbas.math */

/** A complex number.
 *
 * @typedef complex
 * @property {number} re
 * @property {number} im
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
 * @property {number} rows
 * @property {number} columns
 */

var math = Numbas.math = /** @lends Numbas.math */ {
    /** Regex to match numbers in scientific notation.
     *
     * @type {RegExp}
     * @memberof Numbas.math
     */
    re_scientificNumber: /(\-?(?:0|[1-9]\d*)(?:\.\d+)?)[eE]([\+\-]?\d+)/,
    /** Construct a complex number from real and imaginary parts.
     *
     * Elsewhere in this documentation, `{number}` will refer to either a JavaScript float or a {@link complex} object, interchangeably.
     *
     * @param {number} re
     * @param {number} im
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
    /** String version of a complex number.
     *
     * @see Numbas.math.niceNumber
     * @function
     * @returns {string}
     */
    complexToString: function()
    {
        return math.niceNumber(this);
    },
    /** Negate a number.
     *
     * @param {number} n
     * @returns {number}
     */
    negate: function(n)
    {
        if(n.complex)
            return math.complex(-n.re,-n.im);
        else
            return -n;
    },
    /** Complex conjugate.
     *
     * @param {number} n
     * @returns {number}
     */
    conjugate: function(n)
    {
        if(n.complex)
            return math.complex(n.re,-n.im);
        else
            return n;
    },
    /** Add two numbers.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
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
    /** Subtract one number from another.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
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
    /** Multiply two numbers.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
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
    /** Divide one number by another.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
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
    /** Exponentiate a number.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    pow: function(a,b) {
        if(a.complex && Numbas.util.isInt(b) && Math.abs(b)<100) {
            if(b<0) {
                return math.div(1,math.pow(a,-b));
            }
            if(b==0) {
                return 1;
            }
            var coeffs = math.binomialCoefficients(b);
            var re = 0;
            var im = 0;
            var sign = 1;
            for(var i=0;i<b;i+=2) {
                re += coeffs[i]*Math.pow(a.re,b-i)*Math.pow(a.im,i)*sign;
                im += coeffs[i+1]*Math.pow(a.re,b-i-1)*Math.pow(a.im,i+1)*sign;
                sign = -sign;
            }
            if(b%2==0) {
                re += Math.pow(a.im,b)*sign;
            }
            return math.complex(re,im);
        }
        if(a.complex || b.complex || (a<0 && math.fract(b)!=0)) {
            if(!a.complex)
                a = {re: a, im: 0, complex: true};
            if(!b.complex)
                b = {re: b, im: 0, complex: true};
            var ss = a.re*a.re + a.im*a.im;
            var arg1 = math.arg(a);
            var mag = Math.pow(ss,b.re/2) * Math.exp(-b.im*arg1);
            var arg = b.re*arg1 + (b.im * Math.log(ss))/2;
            return math.complex(mag*Math.cos(arg), mag*Math.sin(arg));
        } else if(a==Math.E) {
            return Math.exp(b);
        } else {
            return Math.pow(a,b);
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
        for(var i=1;i<=n;i++) {
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
    mod: function(a,b) {
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
    root: function(a,b)
    {
        return math.pow(a,div(1,b));
    },
    /** Square root.
     *
     * @param {number} n
     * @returns {number}
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
    /** Natural logarithm (base `e`).
     *
     * @param {number} n
     * @returns {number}
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
    /** Calculate `e^n`.
     *
     * @param {number} n
     * @returns {number}
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
     *
     * @param {number} n
     * @returns {number}
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
    /** Argument of a (complex) number.
     *
     * @param {number} n
     * @returns {number}
     */
    arg: function(n)
    {
        if(n.complex)
            return Math.atan2(n.im,n.re);
        else
            return Math.atan2(0,n);
    },
    /** Real part of a number.
     *
     * @param {number} n
     * @returns {number}
     */
    re: function(n)
    {
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
    im: function(n)
    {
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
        return !n.complex && math.gt(n,0);
    },
    /** Is `n` negative (Real, and less than 0)?
     *
     * @param {number} n
     * @returns {boolean}
     */
    negative: function(n) {
        return math.lt(math.re(n),0);
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
    lt: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return !math.geq(a,b);
    },
    /** Is `a` greater than `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    gt: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return !math.leq(a,b);
    },
    /** Is `a` less than or equal to `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    leq: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a<b || math.eq(a,b);
    },
    /** Is `a` greater than or equal to `b`?
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    geq: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a>b || math.eq(a,b);
    },
    /** Is `a` equal to `b`?
     *
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    eq: function(a,b) {
        if(a.complex) {
            if(b.complex) {
                return math.eq(a.re,b.re) && math.eq(a.im,b.im);
            } else {
                return math.eq(a.re,b) && math.eq(a.im,0);
            }
        } else {
            if(b.complex) {
                return math.eq(a,b.re) && math.eq(b.im,0);
            } else {
                if(isNaN(a)) {
                    return isNaN(b);
                }
                return a==b || math.isclose(a,b);
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
    isclose: function(a,b,rel_tol,abs_tol) {
        if(a===Infinity || b===Infinity || a==-Infinity || b==-Infinity) {
            return a===b;
        }
        rel_tol = rel_tol===undefined ? 1e-15 : rel_tol;
        abs_tol = abs_tol===undefined ? 1e-15: abs_tol;
        return Math.abs(a-b) <= Math.max( rel_tol * Math.max(Math.abs(a), Math.abs(b)), abs_tol );
    },

    /** Greatest of two numbers - wraps `Math.max`.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    max: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return Math.max(a,b);
    },
    /** Greatest of a list of numbers.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @returns {number}
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
    /** Least of two numbers - wraps `Math.min`.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    min: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return Math.min(a,b);
    },
    /** Least of a list of numbers.
     *
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @returns {number}
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
     *
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     * @see Numbas.math.eq
     */
    neq: function(a,b)
    {
        return !math.eq(a,b);
    },
    /** If `n` can be written in the form `a*pi^n`, with `a` an integer, return the biggest possible `n`, otherwise return `0`.
     * Also returns `1` for `n` of the form `pi/k`, with `k` an integer < 1000 if the parameter `allowFractions` is `true`.
     *
     * @param {number} n
     * @param {boolean} [allowFractions=true] - return 1 if `n` is of the form `pi/k`, for some integer `k < 1000`.
     * @returns {number}
     */
    piDegree: function(n,allowFractions)
    {
        if(allowFractions===undefined) {
            allowFractions = true;
        }

        n = Math.abs(n);
        if(n>10000)    //so big numbers don't get rounded to a power of pi accidentally
            return 0;
        var degree,a;

        /* Check for pi/k, where k is an integer < 1000 */
        a = Math.PI/n;
        if(allowFractions && a<1000 && Math.abs(a-math.round(a))<0.0000000001) {
            return 1;
        }

        for(degree=1; (a=n/Math.pow(Math.PI,degree))>1 && (Math.abs(a-math.round(a))>0.00000001 && Math.abs(1/a-math.round(1/a))>0.00000001); degree++) {}
        return a>=1 ? degree : 0;
    },
    /** Add the given number of zero digits to a string representation of a number.
     *
     * @param {string} n - A string representation of a number.
     * @param {number} digits - The number of digits to add.
     * @returns {string}
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

    /** Settings for {@link Numbas.math.niceNumber}.
     *
     * @typedef Numbas.math.niceNumber_settings
     * @property {string} precisionType - Either `"dp"` or `"sigfig"`.
     * @property {number} precision - Number of decimal places or significant figures to show.
     * @property {string} style - Name of a notational style to use. See {@link Numbas.util.numberNotationStyles}.
     */

    /** Display a number nicely - rounds off to 10dp so floating point errors aren't displayed.
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @see Numbas.util.numberNotationStyles
     * @returns {string}
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
            if(options.precisionType === undefined && (piD = math.piDegree(n,false)) > 0)
                n /= Math.pow(Math.PI,piD);
            var out;
            if(options.style=='scientific') {
                var s = n.toExponential();
                var bits = math.parseScientific(s);
                var noptions = {precisionType: options.precisionType, precision: options.precision, style: 'si-en'};
                var significand = math.niceNumber(bits.significand,noptions);
                var exponent = bits.exponent;
                if(exponent>=0) {
                    exponent = '+'+exponent;
                }
                return significand+'e'+exponent;
            } else {
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

    /** Display a {@link Numbas.math.ComplexDecimal} as a string.
     *
     * @param {Numbas.math.ComplexDecimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @see Numbas.util.numberNotationStyles
     * @returns {string}
     */
    niceComplexDecimal: function(n,options) {
        options = options || {};
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        var re = math.niceDecimal(n.re,options);
        if(n.isReal()) {
            return re;
        } else {
            var im = math.niceDecimal(n.im.absoluteValue(),options);
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
    niceDecimal: function(n,options) {
        options = options || {};
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(!n.isFinite()) {
            return n.lessThan(0) ? '-infinity' : 'infinity';
        }

        var precision = options.precision;
        if(options.style=='scientific') {
            return n.toExponential(options.precision);
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
            if(options.style && Numbas.util.numberNotationStyles[options.style]) {
                var match_neg = /^(-)?(.*)/.exec(out);
                var minus = match_neg[1] || '';
                var bits = match_neg[2].split('.');
                var integer = bits[0];
                var decimal = bits[1];
                out = minus+Numbas.util.numberNotationStyles[options.style].format(integer,decimal);
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
    deal: function(N)
    {
        var J, K, Q = new Array(N);
        for (J=0 ; J<N ; J++)
            { K = math.randomint(J+1) ; Q[J] = Q[K] ; Q[K] = J; }
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
        for(var i=0;i<l;i++) {
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
     * @param {number} n
     * @returns {Array.<number>}
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
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {Numbas.Error} "math.precround.complex" if b is complex.
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

    /** Get the significand and exponent of a number written in exponential form.
     *
     * @param {string} str
     * @returns {object} `{significand: number, exponent: number}`
     */
    parseScientific: function(str) {
        var m = /(-?\d[ \d]*(?:\.\d[ \d]*)?)e([\-+]?\d[ \d]*)/i.exec(str);
        return {significand: parseFloat(m[1].replace(/ /g,'')), exponent: parseInt(m[2].replace(/ /g,''))};
    },

    /** If the given string is scientific notation representing a number, return a string of the form `\d+\.\d+`.
     * For example, '1.23e-5' is returned as '0.0000123'.
     *
     * @param {string} str
     * @returns {string}
     */
    unscientific: function(str) {
        var m = /(-)? *(0|[1-9][ \d]*)(?:\.([ \d]+))?e([\-+]?[\d ]+)/i.exec(str);
        if(!m) {
            return str;
        }
        var minus = m[1] || '';
        var significand_integer = m[2].replace(/ /g,'');
        var significand_decimal = (m[3] || '').replace(/ /g,'');
        var digits = significand_integer+significand_decimal;
        var pow = parseInt(m[4].replace(/ /g,''));
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
            for(var i=l;i<pow;i++) {
                out += '0';
            }
        } else if(pow<0) {
            out = digits;
            for(var i=0;i<-pow;i++) {
                out = '0'+out;
            }
            out = '0.'+out;
        } else {
            out = digits.slice(0,pow);
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
    siground: function(a,b) {
        if(b.complex) {
            throw(new Numbas.Error('math.siground.complex'));
        }
        if(a.complex) {
            return math.complex(math.siground(a.re,b),math.siground(a.im,b));
        } else {
            return parseFloat(a.toPrecision(b))
        }
    },
    /** Count the number of decimal places used in the string representation of a number.
     *
     * @param {number|string} n
     * @returns {number}
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
     *
     * @param {number|string} n
     * @param {boolean} [max] - Be generous with calculating sig. figs. for whole numbers. e.g. '1000' could be written to 4 sig figs.
     * @returns {number}
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
     *
     * @param {number|string} n
     * @param {string} precisionType - Either 'dp' or 'sigfig'.
     * @param {number} precision - Number of desired digits of precision.
     * @param {boolean} strictPrecision - Must trailing zeros be used to get to the desired precision (true), or is it allowed to give fewer digits in that case (false)?
     * @returns {boolean}
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
     *
     * @param {number} a
     * @param {number} b
     * @param {number} tolerance
     * @returns {boolean}
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
     *
     * @param {number} n
     * @returns {number}
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
    /** Lanczos approximation to the gamma function.
     *
     * @param {number} n
     * @returns {number}
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
    /** Base-10 logarithm.
     *
     * @param {number} n
     * @returns {number}
     */
    log10: function(n)
    {
        return mul(math.log(n),Math.LOG10E);
    },
    /** Arbitrary base logarithm.
     *
     * @param {number} n
     * @param {number} b
     * @returns {number} log(n)/log(b)
     */
    log_base: function(n,b)
    {
        return div(math.log(n),math.log(b));
    },
    /** Convert from degrees to radians.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.degrees
     */
    radians: function(x) {
        return mul(x,Math.PI/180);
    },
    /** Convert from radians to degrees.
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.radians
     */
    degrees: function(x) {
        return mul(x,180/Math.PI);
    },
    /** Cosine.
     *
     * @param {number} x
     * @returns {number}
     */
    cos: function(x) {
        if(x.complex)
        {
            return math.complex(Math.cos(x.re)*math.cosh(x.im), -Math.sin(x.re)*math.sinh(x.im));
        }
        else
            return Math.cos(x);
    },
    /** Sine.
     *
     * @param {number} x
     * @returns {number}
     */
    sin: function(x) {
        if(x.complex)
        {
            return math.complex(Math.sin(x.re)*math.cosh(x.im), Math.cos(x.re)*math.sinh(x.im));
        }
        else
            return Math.sin(x);
    },
    /** Tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    tan: function(x) {
        if(x.complex)
            return div(math.sin(x),math.cos(x));
        else
            return Math.tan(x);
    },
    /** Cosecant.
     *
     * @param {number} x
     * @returns {number}
     */
    cosec: function(x) {
        return div(1,math.sin(x));
    },
    /** Secant.
     *
     * @param {number} x
     * @returns {number}
     */
    sec: function(x) {
        return div(1,math.cos(x));
    },
    /** Cotangent.
     *
     * @param {number} x
     * @returns {number}
     */
    cot: function(x) {
        return div(1,math.tan(x));
    },
    /** Inverse sine.
     * 
     * @param {number} x
     * @returns {number}
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
    /** Inverse cosine.
     *
     * @param {number} x
     * @returns {number}
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
    /** Inverse tangent.
     *
     * @param {number} x
     * @returns {number}
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
    /** Hyperbolic sine.
     *
     * @param {number} x
     * @returns {number}
     */
    sinh: function(x) {
        if(x.complex)
            return div(sub(math.exp(x), math.exp(math.negate(x))),2);
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
            return div(add(math.exp(x), math.exp(math.negate(x))),2);
        else
            return (Math.exp(x)+Math.exp(-x))/2
    },
    /** Hyperbolic tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    tanh: function(x) {
        return div(math.sinh(x),math.cosh(x));
    },
    /** Hyperbolic cosecant.
     *
     * @param {number} x
     * @returns {number}
     */
    cosech: function(x) {
        return div(1,math.sinh(x));
    },
    /** Hyperbolic secant.
     *
     * @param {number} x
     * @returns {number}
     */
    sech: function(x) {
        return div(1,math.cosh(x));
    },
    /** Hyperbolic tangent.
     *
     * @param {number} x
     * @returns {number}
     */
    coth: function(x) {
        return div(1,math.tanh(x));
    },
    /** Inverse hyperbolic sine.
     *
     * @param {number} x
     * @returns {number}
     */
    arcsinh: function(x) {
        if(x.complex)
            return math.log(add(x, math.sqrt(add(mul(x,x),1))));
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
            return math.log(add(x, math.sqrt(sub(mul(x,x),1))));
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
            return div(math.log(div(add(1,x),sub(1,x))),2);
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
            return math.complex(math.ceil(x.re),math.ceil(x.im));
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
            return math.complex(math.floor(x.re),math.floor(x.im));
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
            return math.complex(Math.round(x.re),Math.round(x.im));
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
    toNearest: function(x,a) {
        if(a.complex) {
            throw(new Numbas.Error('math.toNearest.complex'));
        }
        if(a==0) {
            return NaN;
        }
        if(x.complex) {
            return math.complex(math.toNearest(x.re,a),math.toNearest(x.im,a));
        } else {
            return Math.round(x/a)*a;
        }
    },
    /** Integer part of a number - chop off the fractional part. For complex numbers, real and imaginary parts are rounded independently.
     *
     * @param {number} x
     * @returns {number}
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
     *
     * @param {number} x
     * @returns {number}
     * @see Numbas.math.trunc
     */
    fract: function(x) {
        if(x.complex)
            return math.complex(math.fract(x.re),math.fract(x.im));
        return x-math.trunc(x);
    },
    /** Sign of a number - +1, 0, or -1. For complex numbers, gives the sign of the real and imaginary parts separately.
     *
     * @param {number} x
     * @returns {number}
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
    /** Get a random real number between `min` and `max` (inclusive).
     *
     * @param {number} min
     * @param {number} max
     * @returns {number}
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
     * @returns {number}
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
    /** Remove all the values in the list `exclude` from the list `range`.
     *
     * @param {Array.<number>} range
     * @param {Array.<number>} exclude
     * @returns {Array.<number>}
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
    /** Choose one item from an array, at random.
     *
     * @param {Array} selection
     * @returns {*}
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
     * @param {number} a
     * @param {number} b
     * @returns {number}
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
     *
     * @param {number} n
     * @param {number} k
     * @returns {number}
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
     *
     * @param {number} n
     * @param {number} k
     * @returns {number}
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
     *
     * @param {number} a
     * @param {number} b
     * @returns {boolean}
     */
    divides: function(a,b) {
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
    /** Are `a` and `b` coprime? If either of `a` or `b` is not an integer, return `false`.
     * Equivalent to `gcd(a,b) = 1`.
     *
     * @param {number} a
     * @param {number} b
     * @see Numbas.math.gcd
     * @returns {boolean}
     */
    coprime: function(a,b) {
        if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b)) {
            return true;
        }
        return math.gcd(a,b) == 1;
    },
    /** Lowest common multiple (LCM) of `a` and `b`.
     *
     * @param {number} a
     * @param {number} b
     * @returns {number}
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
     * @param {number} a
     * @param {number} b
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
    /** Change the step size of a range created with {@link Numbas.math.defineRange}.
     *
     * @param {range} range
     * @param {number} step
     * @returns {range}
     */
    rangeSteps: function(range,step)
    {
        if(step.complex)
            step = step.re;
        return [range[0],range[1],step];
    },
    /** Convert a range to a list - enumerate all the elements of the range.
     *
     * @param {range} range
     * @returns {number[]}
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
    /** Calculate the number of elements in a range.
     *
     * @param {range} range
     * @returns {number}
     */
    rangeSize: function(range) {
        var diff = range[1]-range[0];
        var num_steps = Math.floor(diff/range[2])+1;
        num_steps += (range[0]+num_steps*range[2] == range[1] ? 1 : 0);
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
        function rat_to_limit(limit,t) {
            limit = Math.max(limit,1);
            if(t==0) {
                return [0,t,1,0];
            }
            var m00 = 1, m01 = 0;
            var m10 = 0, m11 = 1;

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
                return [err1,n1,d1];
            } else {
                return [err2,n2,d2];
            }
        }

        if(accuracy==undefined) {
            accuracy = 15;
        }
        var err_in = Math.exp(-accuracy);
        var limit = 100000000000;
        var l_curr = 1;
        var res = rat_to_limit(l_curr,n);
        while(Math.abs(res[0])>err_in && l_curr<limit) {
            l_curr *= 10;
            res = rat_to_limit(l_curr,n);
        }
        return [res[1],res[2]];
    },

    /** The first 1000 primes. */
    primes: [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997,1009,1013,1019,1021,1031,1033,1039,1049,1051,1061,1063,1069,1087,1091,1093,1097,1103,1109,1117,1123,1129,1151,1153,1163,1171,1181,1187,1193,1201,1213,1217,1223,1229,1231,1237,1249,1259,1277,1279,1283,1289,1291,1297,1301,1303,1307,1319,1321,1327,1361,1367,1373,1381,1399,1409,1423,1427,1429,1433,1439,1447,1451,1453,1459,1471,1481,1483,1487,1489,1493,1499,1511,1523,1531,1543,1549,1553,1559,1567,1571,1579,1583,1597,1601,1607,1609,1613,1619,1621,1627,1637,1657,1663,1667,1669,1693,1697,1699,1709,1721,1723,1733,1741,1747,1753,1759,1777,1783,1787,1789,1801,1811,1823,1831,1847,1861,1867,1871,1873,1877,1879,1889,1901,1907,1913,1931,1933,1949,1951,1973,1979,1987,1993,1997,1999,2003,2011,2017,2027,2029,2039,2053,2063,2069,2081,2083,2087,2089,2099,2111,2113,2129,2131,2137,2141,2143,2153,2161,2179,2203,2207,2213,2221,2237,2239,2243,2251,2267,2269,2273,2281,2287,2293,2297,2309,2311,2333,2339,2341,2347,2351,2357,2371,2377,2381,2383,2389,2393,2399,2411,2417,2423,2437,2441,2447,2459,2467,2473,2477,2503,2521,2531,2539,2543,2549,2551,2557,2579,2591,2593,2609,2617,2621,2633,2647,2657,2659,2663,2671,2677,2683,2687,2689,2693,2699,2707,2711,2713,2719,2729,2731,2741,2749,2753,2767,2777,2789,2791,2797,2801,2803,2819,2833,2837,2843,2851,2857,2861,2879,2887,2897,2903,2909,2917,2927,2939,2953,2957,2963,2969,2971,2999,3001,3011,3019,3023,3037,3041,3049,3061,3067,3079,3083,3089,3109,3119,3121,3137,3163,3167,3169,3181,3187,3191,3203,3209,3217,3221,3229,3251,3253,3257,3259,3271,3299,3301,3307,3313,3319,3323,3329,3331,3343,3347,3359,3361,3371,3373,3389,3391,3407,3413,3433,3449,3457,3461,3463,3467,3469,3491,3499,3511,3517,3527,3529,3533,3539,3541,3547,3557,3559,3571,3581,3583,3593,3607,3613,3617,3623,3631,3637,3643,3659,3671,3673,3677,3691,3697,3701,3709,3719,3727,3733,3739,3761,3767,3769,3779,3793,3797,3803,3821,3823,3833,3847,3851,3853,3863,3877,3881,3889,3907,3911,3917,3919,3923,3929,3931,3943,3947,3967,3989,4001,4003,4007,4013,4019,4021,4027,4049,4051,4057,4073,4079,4091,4093,4099,4111,4127,4129,4133,4139,4153,4157,4159,4177,4201,4211,4217,4219,4229,4231,4241,4243,4253,4259,4261,4271,4273,4283,4289,4297,4327,4337,4339,4349,4357,4363,4373,4391,4397,4409,4421,4423,4441,4447,4451,4457,4463,4481,4483,4493,4507,4513,4517,4519,4523,4547,4549,4561,4567,4583,4591,4597,4603,4621,4637,4639,4643,4649,4651,4657,4663,4673,4679,4691,4703,4721,4723,4729,4733,4751,4759,4783,4787,4789,4793,4799,4801,4813,4817,4831,4861,4871,4877,4889,4903,4909,4919,4931,4933,4937,4943,4951,4957,4967,4969,4973,4987,4993,4999,5003,5009,5011,5021,5023,5039,5051,5059,5077,5081,5087,5099,5101,5107,5113,5119,5147,5153,5167,5171,5179,5189,5197,5209,5227,5231,5233,5237,5261,5273,5279,5281,5297,5303,5309,5323,5333,5347,5351,5381,5387,5393,5399,5407,5413,5417,5419,5431,5437,5441,5443,5449,5471,5477,5479,5483,5501,5503,5507,5519,5521,5527,5531,5557,5563,5569,5573,5581,5591,5623,5639,5641,5647,5651,5653,5657,5659,5669,5683,5689,5693,5701,5711,5717,5737,5741,5743,5749,5779,5783,5791,5801,5807,5813,5821,5827,5839,5843,5849,5851,5857,5861,5867,5869,5879,5881,5897,5903,5923,5927,5939,5953,5981,5987,6007,6011,6029,6037,6043,6047,6053,6067,6073,6079,6089,6091,6101,6113,6121,6131,6133,6143,6151,6163,6173,6197,6199,6203,6211,6217,6221,6229,6247,6257,6263,6269,6271,6277,6287,6299,6301,6311,6317,6323,6329,6337,6343,6353,6359,6361,6367,6373,6379,6389,6397,6421,6427,6449,6451,6469,6473,6481,6491,6521,6529,6547,6551,6553,6563,6569,6571,6577,6581,6599,6607,6619,6637,6653,6659,6661,6673,6679,6689,6691,6701,6703,6709,6719,6733,6737,6761,6763,6779,6781,6791,6793,6803,6823,6827,6829,6833,6841,6857,6863,6869,6871,6883,6899,6907,6911,6917,6947,6949,6959,6961,6967,6971,6977,6983,6991,6997,7001,7013,7019,7027,7039,7043,7057,7069,7079,7103,7109,7121,7127,7129,7151,7159,7177,7187,7193,72077211,7213,7219,7229,7237,7243,7247,7253,7283,7297,7307,7309,7321,7331,7333,7349,7351,7369,7393,7411,7417,7433,7451,7457,7459,7477,7481,7487,7489,7499,7507,7517,7523,7529,7537,7541,7547,7549,7559,7561,7573,7577,7583,7589,7591,7603,7607,7621,7639,7643,7649,7669,7673,7681,7687,7691,7699,7703,7717,7723,7727,7741,7753,7757,7759,7789,7793,7817,7823,7829,7841,7853,7867,7873,7877,7879,7883,7901,7907,7919],

    /** Factorise `n`. When `n=2^(a1)*3^(a2)*5^(a3)*...`, this returns the powers `[a1,a2,a3,...]`.
     *
     * @param {number} n
     * @returns {Array.<number>} - Exponents of the prime factors of n.
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
        for(var i=0;i<l;i++) {
            total = math.add(total,list[i]);
        }
        return total;
    },
    /** Multiplies the elements in the given list.
     *
     * @param {Array.<number>} list
     * @returns {number}
     */
    prod: function(list)  {
        var product = 1;
        for (var i = 0; i < list.length; i++){
            product = math.mul(product, list[i]);
        }
        return product;
    }
};
math.gcf = math.gcd;
var add = math.add, sub = math.sub, mul = math.mul, div = math.div, eq = math.eq, neq = math.neq, negate = math.negate;


/** A rational number.
 *
 * @class
 * @param {number} numerator
 * @param {number} denominator
 *
 * @property {number} numerator
 * @property {number} denominator
 * @memberof Numbas.math
 */
var Fraction = math.Fraction = function(numerator,denominator) {
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
    reduce: function() {
        if(this.denominator==0) {
            return;
        }
        if(this.denominator<0) {
            this.numerator = -this.numerator;
            this.denominator = -this.denominator;
        }
        var g = math.gcd(this.numerator,this.denominator);
        this.numerator /= g;
        this.denominator /= g;
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
        var numerator;
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
    }
}
Fraction.zero = new Fraction(0,1);
Fraction.one = new Fraction(1,1);
Fraction.fromFloat = function(n) {
    var approx = math.rationalApproximation(n);
    return new Fraction(approx[0],approx[1]);
}
Fraction.fromDecimal = function(n,accuracy) {
    accuracy = accuracy===undefined ? 1e15 : accuracy;
    var approx = n.toFraction(accuracy);
    return new Fraction(approx[0].toNumber(),approx[1].toNumber());
}


/** Coerce the given number to a {@link Numbas.math.ComplexDecimal} value.
 *
 * @param {number|Decimal|Numbas.math.ComplexDecimal} n
 * @returns {Numbas.math.ComplexDecimal}
 */
function ensure_decimal(n) {
    if(n instanceof ComplexDecimal) {
        return n;
    } else if(n instanceof Decimal) {
        return new ComplexDecimal(n);
    } else if(n.complex) {
        return new ComplexDecimal(new Decimal(n.re), new Decimal(n.im));
    }
    return new ComplexDecimal(new Decimal(n));
}
/** A complex number with components stored as `Decimal` objects.
 *
 * @param {Decimal} re
 * @param {Decimal} [im]
 * @property {Decimal} re
 * @property {Decimal} im
 * @class
 * @memberof Numbas.math
 */
var ComplexDecimal = math.ComplexDecimal = function(re,im) {
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
        return new ComplexDecimal(re,im);
    },

    dividedBy: function(b) {
        b = ensure_decimal(b);
        var q = b.re.times(b.re).plus(b.re.times(b.im));
        var re = this.re.times(b.re).plus(this.im.times(b.im)).dividedBy(q);
        var im = this.im.times(b.re).minus(this.re.times(b.im)).dividedBy(q);
        return new ComplexDecimal(re,im);
    },

    pow: function(b) {
        b = ensure_decimal(b);
        if(this.isReal() && b.isReal()) {
            return new ComplexDecimal(this.re.pow(b.re),this.im);
        } else {
            var ss = this.re.times(this.re).plus(b.im.times(b.im));
            var arg1 = Decimal.atan2(this.im,this.re);
            var mag = ss.pow(b.re.dividedBy(2)).times(Decimal.exp(b.im.times(arg1).negated()));
            var arg = b.re.times(arg1).plus(b.im.times(Decimal.ln(ss)).dividedBy(2));
            return new ComplexDecimal(mag.times(arg.cos()), mag.times(arg.sin()));
        }
    },

    squareRoot: function() {
        if(!this.isReal()) {
            var r = this.re.times(this.re).plus(this.im.times(this.im)).squareRoot();
            var re = r.plus(this.re).dividedBy(2).squareRoot();
            var im = (new Decimal(this.im.lessThan(0) ? -1 : 1)).times(r.minus(this.re).dividedBy(2).squareRoot());
            return new ComplexDecimal(re,im);
        }
        if(this.re.lessThan(0)) {
            return new ComplexDecimal(new Decimal(0),this.re.absoluteValue().squareRoot());
        } else {
            return new ComplexDecimal(this.re.squareRoot());
        }
    },

    absoluteValue: function() {
        return new ComplexDecimal(this.re.times(this.re).plus(this.im.times(this.im)).squareRoot());
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
        var re = this.re.toPrecision(dp);
        if(this.isReal()) {
            return re;
        } else {
            var symbol = this.im.isNegative() ? '-' : '+';
            var im = this.im.absoluteValue().toPrecision(dp);
            return re+' '+symbol+' '+im+'i';
        }
    },

    toSignificantDigits: function(sf) {
        return new ComplexDecimal(this.re.toSignificantDigits(sf), this.im.toSignificantDigits(sf));
    }
}

ComplexDecimal.min = function(a,b) {
    if(!(a.isReal() && b.isReal())) {
        throw(new Numbas.Error('math.order complex numbers'));
    }
    return Decimal.min(a.re,b.re);
}
ComplexDecimal.max = function(a,b) {
    if(!(a.isReal() && b.isReal())) {
        throw(new Numbas.Error('math.order complex numbers'));
    }
    return Decimal.max(a.re,b.re);
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
        return v.map(function(x) { return negate(x); });
    },
    /** Add two vectors.
     *
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
    /** Subtract one vector from another.
     *
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
    /** Multiply by a scalar.
     *
     * @param {number} k
     * @param {vector} v
     * @returns {vector}
     */
    mul: function(k,v) {
        return v.map(function(x){ return mul(k,x) });
    },
    /** Divide by a scalar.
     *
     * @param {vector} v
     * @param {number} k
     * @returns {vector}
     */
    div: function(v,k) {
        return v.map(function(x){ return div(x,k); });
    },
    /** Vector dot product - each argument can be a vector, or a matrix with one row or one column, which is converted to a vector.
     *
     * @param {vector|matrix} a
     * @param {vector|matrix} b
     * @returns {number}
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
    /** Length of a vector, squared.
     *
     * @param {vector} a
     * @returns {number}
     */
    abs_squared: function(a) {
        return a.reduce(function(s,x){ return s + mul(x,x); },0);
    },
    /** Length of a vector.
     *
     * @param {vector} a
     * @returns {number}
     */
    abs: function(a) {
        return Math.sqrt( a.reduce(function(s,x){ return s + mul(x,x); },0) );
    },
    /** Angle between vectors a and b, in radians, or 0 if either vector has length 0.
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {number}
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
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {boolean}
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
     *
     * @param {vector} a
     * @param {vector} b
     * @returns {boolean}
     * @see Numbas.vectormath.eq
     */
    neq: function(a,b) {
        return !vectormath.eq(a,b);
    },
    /** Multiply a vector on the left by a matrix.
     *
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
     *
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
    /** Apply given function to each element.
     *
     * @param {vector} v
     * @param {Function} fn
     * @returns {vector}
     */
    map: function(v,fn) {
        return v.map(fn);
    },
    /** Round each element to given number of decimal places.
     *
     * @param {vector} v
     * @param {number} dp - Number of decimal places.
     * @returns {vector}
     */
    precround: function(v,dp) {
        return vectormath.map(v,function(n){return math.precround(n,dp);});
    },
    /** Round each element to given number of significant figures.
     *
     * @param {vector} v
     * @param {number} sf - Number of decimal places.
     * @returns {vector}
     */
    siground: function(v,sf) {
        return vectormath.map(v,function(n){return math.siground(n,sf);});
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
        var m = v.map(function(n){return [n]});
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
        return v.every(function(c){return c==0;});
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
    /** Subtract one matrix from another.
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
     *
     * @param {matrix} m
     * @returns {number}
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
    /** Multiply a matrix by a scalar.
     *
     * @param {number} k
     * @param {matrix} m
     * @returns {matrix}
     */
    scalarmul: function(k,m) {
        var out = m.map(function(row){ return row.map(function(x){ return mul(k,x); }); });
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
    scalardiv: function(m,k) {
        var out = m.map(function(row){ return row.map(function(x){ return div(x,k); }); });
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
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {boolean}
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
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {boolean}
     * @see Numbas.matrixmath.eq
     */
    neq: function(a,b) {
        return !matrixmath.eq(a,b);
    },
    /** Make an `NxN` identity matrix.
     *
     * @param {number} n
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
    /** Matrix transpose.
     *
     * @param {matrix} m
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

    /** Apply given function to each element.
     *
     * @param {matrix} m
     * @param {Function} fn
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
    /** Round each element to given number of decimal places.
     *
     * @param {matrix} m
     * @param {number} dp - Number of decimal places.
     * @returns {matrix}
     */
    precround: function(m,dp) {
        return matrixmath.map(m,function(n){return math.precround(n,dp);});
    },
    /** Round each element to given number of significant figures.
     *
     * @param {matrix} m
     * @param {number} sf - Number of decimal places.
     * @returns {matrix}
     */
    siground: function(m,sf) {
        return matrixmath.map(m,function(n){return math.siground(n,sf);});
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
     * @returns {boolean}
     */
    contains: function(set,element) {
        for(var i=0,l=set.length;i<l;i++) {
            if(Numbas.util.eq(set[i],element)) {
                return true;
            }
        }
    },
    /** Union of two sets.
     *
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
    /** Intersection of two sets.
     *
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    intersection: function(a,b) {
        return a.filter(function(v) {
            return setmath.contains(b,v);
        });
    },
    /** Are two sets equal? Yes if a,b and (a intersect b) all have the same length.
     *
     * @param {set} a
     * @param {set} b
     * @returns {boolean}
     */
    eq: function(a,b) {
        return a.length==b.length && setmath.intersection(a,b).length==a.length;
    },
    /** Set minus - remove b's elements from a.
     *
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    minus: function(a,b) {
        return a.filter(function(v){ return !setmath.contains(b,v); });
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

Numbas.queueScript('i18next',[],function(module) {
        var exports = {};
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):t.i18next=e()}(this,function(){"use strict";function t(t){return null==t?"":""+t}function e(t,e,n){t.forEach(function(t){e[t]&&(n[t]=e[t])})}function n(t,e,n){function o(t){return t&&t.indexOf("###")>-1?t.replace(/###/g,"."):t}function r(){return!t||"string"==typeof t}for(var i="string"!=typeof e?[].concat(e):e.split(".");i.length>1;){if(r())return{};var a=o(i.shift());!t[a]&&n&&(t[a]=new n),t=t[a]}return r()?{}:{obj:t,k:o(i.shift())}}function o(t,e,o){var r=n(t,e,Object),i=r.obj,a=r.k;i[a]=o}function r(t,e,o,r){var i=n(t,e,Object),a=i.obj,s=i.k;a[s]=a[s]||[],r&&(a[s]=a[s].concat(o)),r||a[s].push(o)}function i(t,e){var o=n(t,e),r=o.obj,i=o.k;if(r)return r[i]}function a(t,e,n){for(var o in e)o in t?"string"==typeof t[o]||t[o]instanceof String||"string"==typeof e[o]||e[o]instanceof String?n&&(t[o]=e[o]):a(t[o],e[o],n):t[o]=e[o];return t}function s(t){return t.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&")}function l(t){return"string"==typeof t?t.replace(/[&<>"'\/]/g,function(t){return E[t]}):t}function u(t){return t.interpolation={unescapeSuffix:"HTML"},t.interpolation.prefix=t.interpolationPrefix||"__",t.interpolation.suffix=t.interpolationSuffix||"__",t.interpolation.escapeValue=t.escapeInterpolation||!1,t.interpolation.nestingPrefix=t.reusePrefix||"$t(",t.interpolation.nestingSuffix=t.reuseSuffix||")",t}function c(t){return t.resStore&&(t.resources=t.resStore),t.ns&&t.ns.defaultNs?(t.defaultNS=t.ns.defaultNs,t.ns=t.ns.namespaces):t.defaultNS=t.ns||"translation",t.fallbackToDefaultNS&&t.defaultNS&&(t.fallbackNS=t.defaultNS),t.saveMissing=t.sendMissing,t.saveMissingTo=t.sendMissingTo||"current",t.returnNull=!t.fallbackOnNull,t.returnEmptyString=!t.fallbackOnEmpty,t.returnObjects=t.returnObjectTrees,t.joinArrays="\n",t.returnedObjectHandler=t.objectTreeKeyHandler,t.parseMissingKeyHandler=t.parseMissingKey,t.appendNamespaceToMissingKey=!0,t.nsSeparator=t.nsseparator||":",t.keySeparator=t.keyseparator||".","sprintf"===t.shortcutFunction&&(t.overloadTranslationOptionHandler=function(t){for(var e=[],n=1;n<t.length;n++)e.push(t[n]);return{postProcess:"sprintf",sprintf:e}}),t.whitelist=t.lngWhitelist,t.preload=t.preload,"current"===t.load&&(t.load="currentOnly"),"unspecific"===t.load&&(t.load="languageOnly"),t.backend=t.backend||{},t.backend.loadPath=t.resGetPath||"locales/__lng__/__ns__.json",t.backend.addPath=t.resPostPath||"locales/add/__lng__/__ns__",t.backend.allowMultiLoading=t.dynamicLoad,t.cache=t.cache||{},t.cache.prefix="res_",t.cache.expirationTime=6048e5,t.cache.enabled=t.useLocalStorage,t=u(t),t.defaultVariables&&(t.interpolation.defaultVariables=t.defaultVariables),t}function p(t){return t=u(t),t.joinArrays="\n",t}function f(t){return(t.interpolationPrefix||t.interpolationSuffix||void 0!==t.escapeInterpolation)&&(t=u(t)),t.nsSeparator=t.nsseparator,t.keySeparator=t.keyseparator,t.returnObjects=t.returnObjectTrees,t}function g(t){t.lng=function(){return C.deprecate("i18next.lng() can be replaced by i18next.language for detected language or i18next.languages for languages ordered by translation lookup."),t.services.languageUtils.toResolveHierarchy(t.language)[0]},t.preload=function(e,n){C.deprecate("i18next.preload() can be replaced with i18next.loadLanguages()"),t.loadLanguages(e,n)},t.setLng=function(e,n,o){return C.deprecate("i18next.setLng() can be replaced with i18next.changeLanguage() or i18next.getFixedT() to get a translation function with fixed language or namespace."),"function"==typeof n&&(o=n,n={}),n||(n={}),n.fixLng===!0&&o?o(null,t.getFixedT(e)):t.changeLanguage(e,o)},t.addPostProcessor=function(e,n){C.deprecate("i18next.addPostProcessor() can be replaced by i18next.use({ type: 'postProcessor', name: 'name', process: fc })"),t.use({type:"postProcessor",name:e,process:n})}}function h(t){return t.charAt(0).toUpperCase()+t.slice(1)}function d(){var t={};return H.forEach(function(e){e.lngs.forEach(function(n){t[n]={numbers:e.nr,plurals:U[e.fc]}})}),t}function y(t,e){for(var n=t.indexOf(e);n!==-1;)t.splice(n,1),n=t.indexOf(e)}function v(){return{debug:!1,initImmediate:!0,ns:["translation"],defaultNS:["translation"],fallbackLng:["dev"],fallbackNS:!1,whitelist:!1,nonExplicitWhitelist:!1,load:"all",preload:!1,simplifyPluralSuffix:!0,keySeparator:".",nsSeparator:":",pluralSeparator:"_",contextSeparator:"_",saveMissing:!1,saveMissingTo:"fallback",missingKeyHandler:!1,postProcess:!1,returnNull:!0,returnEmptyString:!0,returnObjects:!1,joinArrays:!1,returnedObjectHandler:function(){},parseMissingKeyHandler:!1,appendNamespaceToMissingKey:!1,appendNamespaceToCIMode:!1,overloadTranslationOptionHandler:function(t){return{defaultValue:t[1]}},interpolation:{escapeValue:!0,format:function(t,e,n){return t},prefix:"{{",suffix:"}}",formatSeparator:",",unescapePrefix:"-",nestingPrefix:"$t(",nestingSuffix:")",defaultVariables:void 0}}}function b(t){return"string"==typeof t.ns&&(t.ns=[t.ns]),"string"==typeof t.fallbackLng&&(t.fallbackLng=[t.fallbackLng]),"string"==typeof t.fallbackNS&&(t.fallbackNS=[t.fallbackNS]),t.whitelist&&t.whitelist.indexOf("cimode")<0&&t.whitelist.push("cimode"),t}function m(){}var x="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},S=function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")},k=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o])}return t},w=function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)},O=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e},L=function(){function t(t,e){var n=[],o=!0,r=!1,i=void 0;try{for(var a,s=t[Symbol.iterator]();!(o=(a=s.next()).done)&&(n.push(a.value),!e||n.length!==e);o=!0);}catch(t){r=!0,i=t}finally{try{!o&&s.return&&s.return()}finally{if(r)throw i}}return n}return function(e,n){if(Array.isArray(e))return e;if(Symbol.iterator in Object(e))return t(e,n);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}(),j=function(t){if(Array.isArray(t)){for(var e=0,n=Array(t.length);e<t.length;e++)n[e]=t[e];return n}return Array.from(t)},N={type:"logger",log:function(t){this.output("log",t)},warn:function(t){this.output("warn",t)},error:function(t){this.output("error",t)},output:function(t,e){var n;console&&console[t]&&(n=console)[t].apply(n,j(e))}},P=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};S(this,t),this.init(e,n)}return t.prototype.init=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};this.prefix=e.prefix||"i18next:",this.logger=t||N,this.options=e,this.debug=e.debug},t.prototype.setDebug=function(t){this.debug=t},t.prototype.log=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"log","",!0)},t.prototype.warn=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"warn","",!0)},t.prototype.error=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"error","")},t.prototype.deprecate=function(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];return this.forward(e,"warn","WARNING DEPRECATED: ",!0)},t.prototype.forward=function(t,e,n,o){return o&&!this.debug?null:("string"==typeof t[0]&&(t[0]=""+n+this.prefix+" "+t[0]),this.logger[e](t))},t.prototype.create=function(e){return new t(this.logger,k({prefix:this.prefix+":"+e+":"},this.options))},t}(),C=new P,R=function(){function t(){S(this,t),this.observers={}}return t.prototype.on=function(t,e){var n=this;t.split(" ").forEach(function(t){n.observers[t]=n.observers[t]||[],n.observers[t].push(e)})},t.prototype.off=function(t,e){var n=this;this.observers[t]&&this.observers[t].forEach(function(){if(e){var o=n.observers[t].indexOf(e);o>-1&&n.observers[t].splice(o,1)}else delete n.observers[t]})},t.prototype.emit=function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),o=1;o<e;o++)n[o-1]=arguments[o];if(this.observers[t]){var r=[].concat(this.observers[t]);r.forEach(function(t){t.apply(void 0,n)})}if(this.observers["*"]){var i=[].concat(this.observers["*"]);i.forEach(function(e){var o;e.apply(e,(o=[t]).concat.apply(o,n))})}},t}(),E={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;"},A=function(t){function e(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{ns:["translation"],defaultNS:"translation"};S(this,e);var r=O(this,t.call(this));return r.data=n,r.options=o,r}return w(e,t),e.prototype.addNamespaces=function(t){this.options.ns.indexOf(t)<0&&this.options.ns.push(t)},e.prototype.removeNamespaces=function(t){var e=this.options.ns.indexOf(t);e>-1&&this.options.ns.splice(e,1)},e.prototype.getResource=function(t,e,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},r=o.keySeparator||this.options.keySeparator;void 0===r&&(r=".");var a=[t,e];return n&&"string"!=typeof n&&(a=a.concat(n)),n&&"string"==typeof n&&(a=a.concat(r?n.split(r):n)),t.indexOf(".")>-1&&(a=t.split(".")),i(this.data,a)},e.prototype.addResource=function(t,e,n,r){var i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{silent:!1},a=this.options.keySeparator;void 0===a&&(a=".");var s=[t,e];n&&(s=s.concat(a?n.split(a):n)),t.indexOf(".")>-1&&(s=t.split("."),r=e,e=s[1]),this.addNamespaces(e),o(this.data,s,r),i.silent||this.emit("added",t,e,n,r)},e.prototype.addResources=function(t,e,n){for(var o in n)"string"==typeof n[o]&&this.addResource(t,e,o,n[o],{silent:!0});this.emit("added",t,e,n)},e.prototype.addResourceBundle=function(t,e,n,r,s){var l=[t,e];t.indexOf(".")>-1&&(l=t.split("."),r=n,n=e,e=l[1]),this.addNamespaces(e);var u=i(this.data,l)||{};r?a(u,n,s):u=k({},u,n),o(this.data,l,u),this.emit("added",t,e,n)},e.prototype.removeResourceBundle=function(t,e){this.hasResourceBundle(t,e)&&delete this.data[t][e],this.removeNamespaces(e),this.emit("removed",t,e)},e.prototype.hasResourceBundle=function(t,e){return void 0!==this.getResource(t,e)},e.prototype.getResourceBundle=function(t,e){return e||(e=this.options.defaultNS),"v1"===this.options.compatibilityAPI?k({},this.getResource(t,e)):this.getResource(t,e)},e.prototype.toJSON=function(){return this.data},e}(R),T={processors:{},addPostProcessor:function(t){this.processors[t.name]=t},handle:function(t,e,n,o,r){var i=this;return t.forEach(function(t){i.processors[t]&&(e=i.processors[t].process(e,n,o,r))}),e}},M=function(t){function n(o){var r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};S(this,n);var i=O(this,t.call(this));return e(["resourceStore","languageUtils","pluralResolver","interpolator","backendConnector"],o,i),i.options=r,i.logger=C.create("translator"),i}return w(n,t),n.prototype.changeLanguage=function(t){t&&(this.language=t)},n.prototype.exists=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{interpolation:{}};return"v1"===this.options.compatibilityAPI&&(e=f(e)),void 0!==this.resolve(t,e)},n.prototype.extractFromKey=function(t,e){var n=e.nsSeparator||this.options.nsSeparator;void 0===n&&(n=":");var o=e.keySeparator||this.options.keySeparator||".",r=e.ns||this.options.defaultNS;if(n&&t.indexOf(n)>-1){var i=t.split(n);(n!==o||n===o&&this.options.ns.indexOf(i[0])>-1)&&(r=i.shift()),t=i.join(o)}return"string"==typeof r&&(r=[r]),{key:t,namespaces:r}},n.prototype.translate=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if("object"!==("undefined"==typeof e?"undefined":x(e))?e=this.options.overloadTranslationOptionHandler(arguments):"v1"===this.options.compatibilityAPI&&(e=f(e)),void 0===t||null===t||""===t)return"";"number"==typeof t&&(t=String(t)),"string"==typeof t&&(t=[t]);var n=e.keySeparator||this.options.keySeparator||".",o=this.extractFromKey(t[t.length-1],e),r=o.key,i=o.namespaces,a=i[i.length-1],s=e.lng||this.language,l=e.appendNamespaceToCIMode||this.options.appendNamespaceToCIMode;if(s&&"cimode"===s.toLowerCase()){if(l){var u=e.nsSeparator||this.options.nsSeparator;return a+u+r}return r}var c=this.resolve(t,e),p=Object.prototype.toString.apply(c),g=["[object Number]","[object Function]","[object RegExp]"],h=void 0!==e.joinArrays?e.joinArrays:this.options.joinArrays;if(c&&"string"!=typeof c&&g.indexOf(p)<0&&(!h||"[object Array]"!==p)){if(!e.returnObjects&&!this.options.returnObjects)return this.logger.warn("accessing an object - but returnObjects options is not enabled!"),this.options.returnedObjectHandler?this.options.returnedObjectHandler(r,c,e):"key '"+r+" ("+this.language+")' returned an object instead of string.";if(e.keySeparator||this.options.keySeparator){var d="[object Array]"===p?[]:{};for(var y in c)Object.prototype.hasOwnProperty.call(c,y)&&(d[y]=this.translate(""+r+n+y,k({},e,{joinArrays:!1,ns:i})));c=d}}else if(h&&"[object Array]"===p)c=c.join(h),c&&(c=this.extendTranslation(c,r,e));else{var v=!1,b=!1;if(this.isValidLookup(c)||void 0===e.defaultValue||(v=!0,c=e.defaultValue),this.isValidLookup(c)||(b=!0,c=r),b||v){this.logger.log("missingKey",s,a,r,c);var m=[],S=this.languageUtils.getFallbackCodes(this.options.fallbackLng,e.lng||this.language);if("fallback"===this.options.saveMissingTo&&S&&S[0])for(var w=0;w<S.length;w++)m.push(S[w]);else"all"===this.options.saveMissingTo?m=this.languageUtils.toResolveHierarchy(e.lng||this.language):m.push(e.lng||this.language);this.options.saveMissing&&(this.options.missingKeyHandler?this.options.missingKeyHandler(m,a,r,c):this.backendConnector&&this.backendConnector.saveMissing&&this.backendConnector.saveMissing(m,a,r,c)),this.emit("missingKey",m,a,r,c)}c=this.extendTranslation(c,r,e),b&&c===r&&this.options.appendNamespaceToMissingKey&&(c=a+":"+r),b&&this.options.parseMissingKeyHandler&&(c=this.options.parseMissingKeyHandler(c))}return c},n.prototype.extendTranslation=function(t,e,n){var o=this;n.interpolation&&this.interpolator.init(k({},n,{interpolation:k({},this.options.interpolation,n.interpolation)}));var r=n.replace&&"string"!=typeof n.replace?n.replace:n;this.options.interpolation.defaultVariables&&(r=k({},this.options.interpolation.defaultVariables,r)),t=this.interpolator.interpolate(t,r,n.lng||this.language),n.nest!==!1&&(t=this.interpolator.nest(t,function(){return o.translate.apply(o,arguments)},n)),n.interpolation&&this.interpolator.reset();var i=n.postProcess||this.options.postProcess,a="string"==typeof i?[i]:i;return void 0!==t&&a&&a.length&&n.applyPostProcessor!==!1&&(t=T.handle(a,t,e,n,this)),t},n.prototype.resolve=function(t){var e=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},o=void 0;return"string"==typeof t&&(t=[t]),t.forEach(function(t){if(!e.isValidLookup(o)){var r=e.extractFromKey(t,n),i=r.key,a=r.namespaces;e.options.fallbackNS&&(a=a.concat(e.options.fallbackNS));var s=void 0!==n.count&&"string"!=typeof n.count,l=void 0!==n.context&&"string"==typeof n.context&&""!==n.context,u=n.lngs?n.lngs:e.languageUtils.toResolveHierarchy(n.lng||e.language);a.forEach(function(t){e.isValidLookup(o)||u.forEach(function(r){if(!e.isValidLookup(o)){var a=i,u=[a],c=void 0;s&&(c=e.pluralResolver.getSuffix(r,n.count)),s&&l&&u.push(a+c),l&&u.push(a+=""+e.options.contextSeparator+n.context),s&&u.push(a+=c);for(var p=void 0;p=u.pop();)e.isValidLookup(o)||(o=e.getResource(r,t,p,n))}})})}}),o},n.prototype.isValidLookup=function(t){return!(void 0===t||!this.options.returnNull&&null===t||!this.options.returnEmptyString&&""===t)},n.prototype.getResource=function(t,e,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};return this.resourceStore.getResource(t,e,n,o)},n}(R),_=function(){function t(e){S(this,t),this.options=e,this.whitelist=this.options.whitelist||!1,this.logger=C.create("languageUtils")}return t.prototype.getScriptPartFromCode=function(t){if(!t||t.indexOf("-")<0)return null;var e=t.split("-");return 2===e.length?null:(e.pop(),this.formatLanguageCode(e.join("-")))},t.prototype.getLanguagePartFromCode=function(t){if(!t||t.indexOf("-")<0)return t;var e=t.split("-");return this.formatLanguageCode(e[0])},t.prototype.formatLanguageCode=function(t){if("string"==typeof t&&t.indexOf("-")>-1){var e=["hans","hant","latn","cyrl","cans","mong","arab"],n=t.split("-");return this.options.lowerCaseLng?n=n.map(function(t){return t.toLowerCase()}):2===n.length?(n[0]=n[0].toLowerCase(),n[1]=n[1].toUpperCase(),e.indexOf(n[1].toLowerCase())>-1&&(n[1]=h(n[1].toLowerCase()))):3===n.length&&(n[0]=n[0].toLowerCase(),2===n[1].length&&(n[1]=n[1].toUpperCase()),"sgn"!==n[0]&&2===n[2].length&&(n[2]=n[2].toUpperCase()),e.indexOf(n[1].toLowerCase())>-1&&(n[1]=h(n[1].toLowerCase())),e.indexOf(n[2].toLowerCase())>-1&&(n[2]=h(n[2].toLowerCase()))),n.join("-")}return this.options.cleanCode||this.options.lowerCaseLng?t.toLowerCase():t},t.prototype.isWhitelisted=function(t){return("languageOnly"===this.options.load||this.options.nonExplicitWhitelist)&&(t=this.getLanguagePartFromCode(t)),!this.whitelist||!this.whitelist.length||this.whitelist.indexOf(t)>-1},t.prototype.getFallbackCodes=function(t,e){if(!t)return[];if("string"==typeof t&&(t=[t]),"[object Array]"===Object.prototype.toString.apply(t))return t;if(!e)return t.default||[];var n=t[e];return n||(n=t[this.getScriptPartFromCode(e)]),n||(n=t[this.formatLanguageCode(e)]),n||(n=t.default),n||[]},t.prototype.toResolveHierarchy=function(t,e){var n=this,o=this.getFallbackCodes(e||this.options.fallbackLng||[],t),r=[],i=function(t){t&&(n.isWhitelisted(t)?r.push(t):n.logger.warn("rejecting non-whitelisted language code: "+t))};return"string"==typeof t&&t.indexOf("-")>-1?("languageOnly"!==this.options.load&&i(this.formatLanguageCode(t)),"languageOnly"!==this.options.load&&"currentOnly"!==this.options.load&&i(this.getScriptPartFromCode(t)),"currentOnly"!==this.options.load&&i(this.getLanguagePartFromCode(t))):"string"==typeof t&&i(this.formatLanguageCode(t)),o.forEach(function(t){r.indexOf(t)<0&&i(n.formatLanguageCode(t))}),r},t}(),H=[{lngs:["ach","ak","am","arn","br","fil","gun","ln","mfe","mg","mi","oc","tg","ti","tr","uz","wa"],nr:[1,2],fc:1},{lngs:["af","an","ast","az","bg","bn","ca","da","de","dev","el","en","eo","es","es_ar","et","eu","fi","fo","fur","fy","gl","gu","ha","he","hi","hu","hy","ia","it","kn","ku","lb","mai","ml","mn","mr","nah","nap","nb","ne","nl","nn","no","nso","pa","pap","pms","ps","pt","pt_br","rm","sco","se","si","so","son","sq","sv","sw","ta","te","tk","ur","yo"],nr:[1,2],fc:2},{lngs:["ay","bo","cgg","fa","id","ja","jbo","ka","kk","km","ko","ky","lo","ms","sah","su","th","tt","ug","vi","wo","zh"],nr:[1],fc:3},{lngs:["be","bs","dz","hr","ru","sr","uk"],nr:[1,2,5],fc:4},{lngs:["ar"],nr:[0,1,2,3,11,100],fc:5},{lngs:["cs","sk"],nr:[1,2,5],fc:6},{lngs:["csb","pl"],nr:[1,2,5],fc:7},{lngs:["cy"],nr:[1,2,3,8],fc:8},{lngs:["fr"],nr:[1,2],fc:9},{lngs:["ga"],nr:[1,2,3,7,11],fc:10},{lngs:["gd"],nr:[1,2,3,20],fc:11},{lngs:["is"],nr:[1,2],fc:12},{lngs:["jv"],nr:[0,1],fc:13},{lngs:["kw"],nr:[1,2,3,4],fc:14},{lngs:["lt"],nr:[1,2,10],fc:15},{lngs:["lv"],nr:[1,2,0],fc:16},{lngs:["mk"],nr:[1,2],fc:17},{lngs:["mnk"],nr:[0,1,2],fc:18},{lngs:["mt"],nr:[1,2,11,20],fc:19},{lngs:["or"],nr:[2,1],fc:2},{lngs:["ro"],nr:[1,2,20],fc:20},{lngs:["sl"],nr:[5,1,2,3],fc:21}],U={1:function(t){return Number(t>1)},2:function(t){return Number(1!=t)},3:function(t){return 0},4:function(t){return Number(t%10==1&&t%100!=11?0:t%10>=2&&t%10<=4&&(t%100<10||t%100>=20)?1:2)},5:function(t){return Number(0===t?0:1==t?1:2==t?2:t%100>=3&&t%100<=10?3:t%100>=11?4:5)},6:function(t){return Number(1==t?0:t>=2&&t<=4?1:2)},7:function(t){return Number(1==t?0:t%10>=2&&t%10<=4&&(t%100<10||t%100>=20)?1:2)},8:function(t){return Number(1==t?0:2==t?1:8!=t&&11!=t?2:3)},9:function(t){return Number(t>=2)},10:function(t){return Number(1==t?0:2==t?1:t<7?2:t<11?3:4)},11:function(t){return Number(1==t||11==t?0:2==t||12==t?1:t>2&&t<20?2:3)},12:function(t){return Number(t%10!=1||t%100==11)},13:function(t){return Number(0!==t)},14:function(t){return Number(1==t?0:2==t?1:3==t?2:3)},15:function(t){return Number(t%10==1&&t%100!=11?0:t%10>=2&&(t%100<10||t%100>=20)?1:2)},16:function(t){return Number(t%10==1&&t%100!=11?0:0!==t?1:2)},17:function(t){return Number(1==t||t%10==1?0:1)},18:function(t){return Number(0==t?0:1==t?1:2)},19:function(t){return Number(1==t?0:0===t||t%100>1&&t%100<11?1:t%100>10&&t%100<20?2:3)},20:function(t){return Number(1==t?0:0===t||t%100>0&&t%100<20?1:2)},21:function(t){return Number(t%100==1?1:t%100==2?2:t%100==3||t%100==4?3:0)}},V=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};S(this,t),this.languageUtils=e,this.options=n,this.logger=C.create("pluralResolver"),this.rules=d()}return t.prototype.addRule=function(t,e){this.rules[t]=e},t.prototype.getRule=function(t){return this.rules[this.languageUtils.getLanguagePartFromCode(t)]},t.prototype.needsPlural=function(t){var e=this.getRule(t);return e&&e.numbers.length>1},t.prototype.getSuffix=function(t,e){var n=this,o=this.getRule(t);if(o){if(1===o.numbers.length)return"";var r=o.noAbs?o.plurals(e):o.plurals(Math.abs(e)),i=o.numbers[r];this.options.simplifyPluralSuffix&&2===o.numbers.length&&1===o.numbers[0]&&(2===i?i="plural":1===i&&(i=""));var a=function(){return n.options.prepend&&i.toString()?n.options.prepend+i.toString():i.toString()};return"v1"===this.options.compatibilityJSON?1===i?"":"number"==typeof i?"_plural_"+i.toString():a():"v2"===this.options.compatibilityJSON||2===o.numbers.length&&1===o.numbers[0]?a():2===o.numbers.length&&1===o.numbers[0]?a():this.options.prepend&&r.toString()?this.options.prepend+r.toString():r.toString()}return this.logger.warn("no plural rule found for: "+t),""},t}(),I=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};S(this,e),this.logger=C.create("interpolator"),this.init(t,!0)}return e.prototype.init=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=arguments[1];e&&(this.options=t,this.format=t.interpolation&&t.interpolation.format||function(t){return t},this.escape=t.interpolation&&t.interpolation.escape||l),t.interpolation||(t.interpolation={escapeValue:!0});var n=t.interpolation;this.escapeValue=void 0===n.escapeValue||n.escapeValue,this.prefix=n.prefix?s(n.prefix):n.prefixEscaped||"{{",this.suffix=n.suffix?s(n.suffix):n.suffixEscaped||"}}",this.formatSeparator=n.formatSeparator?n.formatSeparator:n.formatSeparator||",",this.unescapePrefix=n.unescapeSuffix?"":n.unescapePrefix||"-",this.unescapeSuffix=this.unescapePrefix?"":n.unescapeSuffix||"",this.nestingPrefix=n.nestingPrefix?s(n.nestingPrefix):n.nestingPrefixEscaped||s("$t("),this.nestingSuffix=n.nestingSuffix?s(n.nestingSuffix):n.nestingSuffixEscaped||s(")"),this.resetRegExp()},e.prototype.reset=function(){this.options&&this.init(this.options)},e.prototype.resetRegExp=function(){var t=this.prefix+"(.+?)"+this.suffix;this.regexp=new RegExp(t,"g");var e=""+this.prefix+this.unescapePrefix+"(.+?)"+this.unescapeSuffix+this.suffix;this.regexpUnescape=new RegExp(e,"g");var n=this.nestingPrefix+"(.+?)"+this.nestingSuffix;this.nestingRegexp=new RegExp(n,"g")},e.prototype.interpolate=function(e,n,o){function r(t){return t.replace(/\$/g,"$$$$")}var a=this,s=void 0,l=void 0,u=function(t){if(t.indexOf(a.formatSeparator)<0)return i(n,t);var e=t.split(a.formatSeparator),r=e.shift().trim(),s=e.join(a.formatSeparator).trim();return a.format(i(n,r),s,o)};for(this.resetRegExp();s=this.regexpUnescape.exec(e);)l=u(s[1].trim()),e=e.replace(s[0],l),this.regexpUnescape.lastIndex=0;for(;s=this.regexp.exec(e);)l=u(s[1].trim()),"string"!=typeof l&&(l=t(l)),l||(this.logger.warn("missed to pass in variable "+s[1]+" for interpolating "+e),l=""),l=r(this.escapeValue?this.escape(l):l),e=e.replace(s[0],l),this.regexp.lastIndex=0;return e},e.prototype.nest=function(e,n){function o(t){if(t.indexOf(",")<0)return t;var e=t.split(",");t=e.shift();var n=e.join(",");n=this.interpolate(n,s),n=n.replace(/'/g,'"');try{s=JSON.parse(n)}catch(e){this.logger.error("failed parsing options string in nesting for key "+t,e)}return t}var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},i=void 0,a=void 0,s=k({},r);for(s.applyPostProcessor=!1;i=this.nestingRegexp.exec(e);){if(a=n(o.call(this,i[1].trim()),s),a&&i[0]===e&&"string"!=typeof a)return a;"string"!=typeof a&&(a=t(a)),a||(this.logger.warn("missed to resolve "+i[1]+" for nesting "+e),a=""),e=e.replace(i[0],a),this.regexp.lastIndex=0}return e},e}(),F=function(t){function e(n,o,r){var i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};S(this,e);var a=O(this,t.call(this));return a.backend=n,a.store=o,a.services=r,a.options=i,a.logger=C.create("backendConnector"),a.state={},a.queue=[],a.backend&&a.backend.init&&a.backend.init(r,i.backend,i),a}return w(e,t),e.prototype.queueLoad=function(t,e,n){var o=this,r=[],i=[],a=[],s=[];return t.forEach(function(t){var n=!0;e.forEach(function(e){var a=t+"|"+e;o.store.hasResourceBundle(t,e)?o.state[a]=2:o.state[a]<0||(1===o.state[a]?i.indexOf(a)<0&&i.push(a):(o.state[a]=1,n=!1,i.indexOf(a)<0&&i.push(a),r.indexOf(a)<0&&r.push(a),s.indexOf(e)<0&&s.push(e)))}),n||a.push(t)}),(r.length||i.length)&&this.queue.push({pending:i,loaded:{},errors:[],callback:n}),{toLoad:r,pending:i,toLoadLanguages:a,toLoadNamespaces:s}},e.prototype.loaded=function(t,e,n){var o=this,i=t.split("|"),a=L(i,2),s=a[0],l=a[1];e&&this.emit("failedLoading",s,l,e),n&&this.store.addResourceBundle(s,l,n),this.state[t]=e?-1:2,this.queue.forEach(function(n){r(n.loaded,[s],l),y(n.pending,t),e&&n.errors.push(e),0!==n.pending.length||n.done||(o.emit("loaded",n.loaded),n.done=!0,n.errors.length?n.callback(n.errors):n.callback())}),this.queue=this.queue.filter(function(t){return!t.done})},e.prototype.read=function(t,e,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0,r=this,i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:250,a=arguments[5];return t.length?this.backend[n](t,e,function(s,l){return s&&l&&o<5?void setTimeout(function(){r.read.call(r,t,e,n,o+1,2*i,a)},i):void a(s,l)}):a(null,{})},e.prototype.load=function(t,e,n){var o=this;if(!this.backend)return this.logger.warn("No backend was added via i18next.use. Will not load resources."),n&&n();var r=k({},this.backend.options,this.options.backend);"string"==typeof t&&(t=this.services.languageUtils.toResolveHierarchy(t)),"string"==typeof e&&(e=[e]);var a=this.queueLoad(t,e,n);return a.toLoad.length?void(r.allowMultiLoading&&this.backend.readMulti?this.read(a.toLoadLanguages,a.toLoadNamespaces,"readMulti",null,null,function(t,e){t&&o.logger.warn("loading namespaces "+a.toLoadNamespaces.join(", ")+" for languages "+a.toLoadLanguages.join(", ")+" via multiloading failed",t),!t&&e&&o.logger.log("successfully loaded namespaces "+a.toLoadNamespaces.join(", ")+" for languages "+a.toLoadLanguages.join(", ")+" via multiloading",e),a.toLoad.forEach(function(n){var r=n.split("|"),a=L(r,2),s=a[0],l=a[1],u=i(e,[s,l]);if(u)o.loaded(n,t,u);else{var c="loading namespace "+l+" for language "+s+" via multiloading failed";o.loaded(n,c),o.logger.error(c)}})}):a.toLoad.forEach(function(t){o.loadOne(t)})):(a.pending.length||n(),null)},e.prototype.reload=function(t,e){var n=this;this.backend||this.logger.warn("No backend was added via i18next.use. Will not load resources.");var o=k({},this.backend.options,this.options.backend);"string"==typeof t&&(t=this.services.languageUtils.toResolveHierarchy(t)),"string"==typeof e&&(e=[e]),o.allowMultiLoading&&this.backend.readMulti?this.read(t,e,"readMulti",null,null,function(o,r){o&&n.logger.warn("reloading namespaces "+e.join(", ")+" for languages "+t.join(", ")+" via multiloading failed",o),!o&&r&&n.logger.log("successfully reloaded namespaces "+e.join(", ")+" for languages "+t.join(", ")+" via multiloading",r),t.forEach(function(t){e.forEach(function(e){var a=i(r,[t,e]);if(a)n.loaded(t+"|"+e,o,a);else{var s="reloading namespace "+e+" for language "+t+" via multiloading failed";n.loaded(t+"|"+e,s),n.logger.error(s)}})})}):t.forEach(function(t){e.forEach(function(e){n.loadOne(t+"|"+e,"re")})})},e.prototype.loadOne=function(t){var e=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"",o=t.split("|"),r=L(o,2),i=r[0],a=r[1];this.read(i,a,"read",null,null,function(o,r){o&&e.logger.warn(n+"loading namespace "+a+" for language "+i+" failed",o),!o&&r&&e.logger.log(n+"loaded namespace "+a+" for language "+i,r),e.loaded(t,o,r)})},e.prototype.saveMissing=function(t,e,n,o){this.backend&&this.backend.create&&this.backend.create(t,e,n,o),t&&t[0]&&this.store.addResource(t[0],e,n,o)},e}(R),D=function(t){function e(n,o,r){var i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};S(this,e);var a=O(this,t.call(this));return a.cache=n,a.store=o,a.services=r,a.options=i,a.logger=C.create("cacheConnector"),a.cache&&a.cache.init&&a.cache.init(r,i.cache,i),a}return w(e,t),e.prototype.load=function(t,e,n){var o=this;if(!this.cache)return n&&n();var r=k({},this.cache.options,this.options.cache),i="string"==typeof t?this.services.languageUtils.toResolveHierarchy(t):t;r.enabled?this.cache.load(i,function(t,e){if(t&&o.logger.error("loading languages "+i.join(", ")+" from cache failed",t),e)for(var r in e)if(Object.prototype.hasOwnProperty.call(e,r))for(var a in e[r])if(Object.prototype.hasOwnProperty.call(e[r],a)&&"i18nStamp"!==a){var s=e[r][a];s&&o.store.addResourceBundle(r,a,s)}n&&n()}):n&&n()},e.prototype.save=function(){this.cache&&this.options.cache&&this.options.cache.enabled&&this.cache.save(this.store.data)},e}(R),K=function(t){function e(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=arguments[1];S(this,e);var r=O(this,t.call(this));if(r.options=b(n),r.services={},r.logger=C,r.modules={external:[]},o&&!r.isInitialized&&!n.isClone){var i;if(!r.options.initImmediate)return i=r.init(n,o),O(r,i);setTimeout(function(){r.init(n,o)},0)}return r}return w(e,t),e.prototype.init=function(t,e){function n(t){return t?"function"==typeof t?new t:t:null}var o=this;if("function"==typeof t&&(e=t,t={}),t||(t={}),"v1"===t.compatibilityAPI?this.options=k({},v(),b(c(t)),{}):"v1"===t.compatibilityJSON?this.options=k({},v(),b(p(t)),{}):this.options=k({},v(),this.options,b(t)),this.format=this.options.interpolation.format,e||(e=m),!this.options.isClone){this.modules.logger?C.init(n(this.modules.logger),this.options):C.init(null,this.options);var r=new _(this.options);this.store=new A(this.options.resources,this.options);var i=this.services;i.logger=C,i.resourceStore=this.store,i.resourceStore.on("added removed",function(t,e){i.cacheConnector.save()}),i.languageUtils=r,i.pluralResolver=new V(r,{prepend:this.options.pluralSeparator,compatibilityJSON:this.options.compatibilityJSON,simplifyPluralSuffix:this.options.simplifyPluralSuffix}),i.interpolator=new I(this.options),i.backendConnector=new F(n(this.modules.backend),i.resourceStore,i,this.options),i.backendConnector.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];o.emit.apply(o,[t].concat(n))}),i.backendConnector.on("loaded",function(t){i.cacheConnector.save()}),i.cacheConnector=new D(n(this.modules.cache),i.resourceStore,i,this.options),i.cacheConnector.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];o.emit.apply(o,[t].concat(n))}),this.modules.languageDetector&&(i.languageDetector=n(this.modules.languageDetector),i.languageDetector.init(i,this.options.detection,this.options)),this.translator=new M(this.services,this.options),
this.translator.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),r=1;r<e;r++)n[r-1]=arguments[r];o.emit.apply(o,[t].concat(n))}),this.modules.external.forEach(function(t){t.init&&t.init(o)})}var a=["getResource","addResource","addResources","addResourceBundle","removeResourceBundle","hasResourceBundle","getResourceBundle"];a.forEach(function(t){o[t]=function(){var e;return(e=o.store)[t].apply(e,arguments)}}),"v1"===this.options.compatibilityAPI&&g(this);var s=function(){o.changeLanguage(o.options.lng,function(t,n){o.isInitialized=!0,o.logger.log("initialized",o.options),o.emit("initialized",o.options),e(t,n)})};return this.options.resources||!this.options.initImmediate?s():setTimeout(s,0),this},e.prototype.loadResources=function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:m;if(this.options.resources)e(null);else{if(this.language&&"cimode"===this.language.toLowerCase())return e();var n=[],o=function(e){if(e){var o=t.services.languageUtils.toResolveHierarchy(e);o.forEach(function(t){n.indexOf(t)<0&&n.push(t)})}};if(this.language)o(this.language);else{var r=this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);r.forEach(function(t){return o(t)})}this.options.preload&&this.options.preload.forEach(function(t){return o(t)}),this.services.cacheConnector.load(n,this.options.ns,function(){t.services.backendConnector.load(n,t.options.ns,e)})}},e.prototype.reloadResources=function(t,e){t||(t=this.languages),e||(e=this.options.ns),this.services.backendConnector.reload(t,e)},e.prototype.use=function(t){return"backend"===t.type&&(this.modules.backend=t),"cache"===t.type&&(this.modules.cache=t),("logger"===t.type||t.log&&t.warn&&t.error)&&(this.modules.logger=t),"languageDetector"===t.type&&(this.modules.languageDetector=t),"postProcessor"===t.type&&T.addPostProcessor(t),"3rdParty"===t.type&&this.modules.external.push(t),this},e.prototype.changeLanguage=function(t,e){var n=this,o=function(t,o){o&&(n.emit("languageChanged",o),n.logger.log("languageChanged",o)),e&&e(t,function(){return n.t.apply(n,arguments)})},r=function(t){t&&(n.language=t,n.languages=n.services.languageUtils.toResolveHierarchy(t),n.translator.changeLanguage(t),n.services.languageDetector&&n.services.languageDetector.cacheUserLanguage(t)),n.loadResources(function(e){o(e,t)})};t||!this.services.languageDetector||this.services.languageDetector.async?!t&&this.services.languageDetector&&this.services.languageDetector.async?this.services.languageDetector.detect(r):r(t):r(this.services.languageDetector.detect())},e.prototype.getFixedT=function(t,e){var n=this,o=function t(e){var o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=k({},o);return r.lng=r.lng||t.lng,r.lngs=r.lngs||t.lngs,r.ns=r.ns||t.ns,n.t(e,r)};return"string"==typeof t?o.lng=t:o.lngs=t,o.ns=e,o},e.prototype.t=function(){var t;return this.translator&&(t=this.translator).translate.apply(t,arguments)},e.prototype.exists=function(){var t;return this.translator&&(t=this.translator).exists.apply(t,arguments)},e.prototype.setDefaultNamespace=function(t){this.options.defaultNS=t},e.prototype.loadNamespaces=function(t,e){var n=this;return this.options.ns?("string"==typeof t&&(t=[t]),t.forEach(function(t){n.options.ns.indexOf(t)<0&&n.options.ns.push(t)}),void this.loadResources(e)):e&&e()},e.prototype.loadLanguages=function(t,e){"string"==typeof t&&(t=[t]);var n=this.options.preload||[],o=t.filter(function(t){return n.indexOf(t)<0});return o.length?(this.options.preload=n.concat(o),void this.loadResources(e)):e()},e.prototype.dir=function(t){if(t||(t=this.languages&&this.languages.length>0?this.languages[0]:this.language),!t)return"rtl";var e=["ar","shu","sqr","ssh","xaa","yhd","yud","aao","abh","abv","acm","acq","acw","acx","acy","adf","ads","aeb","aec","afb","ajp","apc","apd","arb","arq","ars","ary","arz","auz","avl","ayh","ayl","ayn","ayp","bbz","pga","he","iw","ps","pbt","pbu","pst","prp","prd","ur","ydd","yds","yih","ji","yi","hbo","men","xmn","fa","jpr","peo","pes","prs","dv","sam"];return e.indexOf(this.services.languageUtils.getLanguagePartFromCode(t))>=0?"rtl":"ltr"},e.prototype.createInstance=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=arguments[1];return new e(t,n)},e.prototype.cloneInstance=function(){var t=this,n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:m,r=k({},this.options,n,{isClone:!0}),i=new e(r,o),a=["store","services","language"];return a.forEach(function(e){i[e]=t[e]}),i.translator=new M(i.services,i.options),i.translator.on("*",function(t){for(var e=arguments.length,n=Array(e>1?e-1:0),o=1;o<e;o++)n[o-1]=arguments[o];i.emit.apply(i,[t].concat(n))}),i.init(r,o),i},e}(R),q=new K;return q})
    window['i18next'] = module.exports;
});
Numbas.queueScript('es5-shim',[],function() {
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

if (!Object.entries) {
  Object.entries = function( obj ){
    var ownProps = Object.keys( obj ),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    
    return resArray;
  };
}

});

Numbas.queueScript('es6-shim',['es5-shim'],function() {
/*!
 * https://github.com/paulmillr/es6-shim
 * @license es6-shim Copyright 2013-2016 by Paul Miller (http://paulmillr.com)
 *   and contributors,  MIT License
 * es6-shim: v0.35.4
 * see https://github.com/paulmillr/es6-shim/blob/0.35.3/LICENSE
 * Details and documentation:
 * https://github.com/paulmillr/es6-shim/
 */

// UMD (Universal Module Definition)
// see https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
  /*global define, module, exports */
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }
}(this, function () {
  'use strict';

  var _apply = Function.call.bind(Function.apply);
  var _call = Function.call.bind(Function.call);
  var isArray = Array.isArray;
  var keys = Object.keys;

  var not = function notThunker(func) {
    return function notThunk() {
      return !_apply(func, this, arguments);
    };
  };
  var throwsError = function (func) {
    try {
      func();
      return false;
    } catch (e) {
      return true;
    }
  };
  var valueOrFalseIfThrows = function valueOrFalseIfThrows(func) {
    try {
      return func();
    } catch (e) {
      return false;
    }
  };

  var isCallableWithoutNew = not(throwsError);
  var arePropertyDescriptorsSupported = function () {
    // if Object.defineProperty exists but throws, it's IE 8
    return !throwsError(function () {
      return Object.defineProperty({}, 'x', { get: function () { } }); // eslint-disable-line getter-return
    });
  };
  var supportsDescriptors = !!Object.defineProperty && arePropertyDescriptorsSupported();
  var functionsHaveNames = (function foo() {}).name === 'foo'; // eslint-disable-line no-extra-parens

  var _forEach = Function.call.bind(Array.prototype.forEach);
  var _reduce = Function.call.bind(Array.prototype.reduce);
  var _filter = Function.call.bind(Array.prototype.filter);
  var _some = Function.call.bind(Array.prototype.some);

  var defineProperty = function (object, name, value, force) {
    if (!force && name in object) { return; }
    if (supportsDescriptors) {
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };

  // Define configurable, writable and non-enumerable props
  // if they don’t exist.
  var defineProperties = function (object, map, forceOverride) {
    _forEach(keys(map), function (name) {
      var method = map[name];
      defineProperty(object, name, method, !!forceOverride);
    });
  };

  var _toString = Function.call.bind(Object.prototype.toString);
  var isCallable = typeof /abc/ === 'function' ? function IsCallableSlow(x) {
    // Some old browsers (IE, FF) say that typeof /abc/ === 'function'
    return typeof x === 'function' && _toString(x) === '[object Function]';
  } : function IsCallableFast(x) { return typeof x === 'function'; };

  var Value = {
    getter: function (object, name, getter) {
      if (!supportsDescriptors) {
        throw new TypeError('getters require true ES5 support');
      }
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        get: getter
      });
    },
    proxy: function (originalObject, key, targetObject) {
      if (!supportsDescriptors) {
        throw new TypeError('getters require true ES5 support');
      }
      var originalDescriptor = Object.getOwnPropertyDescriptor(originalObject, key);
      Object.defineProperty(targetObject, key, {
        configurable: originalDescriptor.configurable,
        enumerable: originalDescriptor.enumerable,
        get: function getKey() { return originalObject[key]; },
        set: function setKey(value) { originalObject[key] = value; }
      });
    },
    redefine: function (object, property, newValue) {
      if (supportsDescriptors) {
        var descriptor = Object.getOwnPropertyDescriptor(object, property);
        descriptor.value = newValue;
        Object.defineProperty(object, property, descriptor);
      } else {
        object[property] = newValue;
      }
    },
    defineByDescriptor: function (object, property, descriptor) {
      if (supportsDescriptors) {
        Object.defineProperty(object, property, descriptor);
      } else if ('value' in descriptor) {
        object[property] = descriptor.value;
      }
    },
    preserveToString: function (target, source) {
      if (source && isCallable(source.toString)) {
        defineProperty(target, 'toString', source.toString.bind(source), true);
      }
    }
  };

  // Simple shim for Object.create on ES3 browsers
  // (unlike real shim, no attempt to support `prototype === null`)
  var create = Object.create || function (prototype, properties) {
    var Prototype = function Prototype() {};
    Prototype.prototype = prototype;
    var object = new Prototype();
    if (typeof properties !== 'undefined') {
      keys(properties).forEach(function (key) {
        Value.defineByDescriptor(object, key, properties[key]);
      });
    }
    return object;
  };

  var supportsSubclassing = function (C, f) {
    if (!Object.setPrototypeOf) { return false; /* skip test on IE < 11 */ }
    return valueOrFalseIfThrows(function () {
      var Sub = function Subclass(arg) {
        var o = new C(arg);
        Object.setPrototypeOf(o, Subclass.prototype);
        return o;
      };
      Object.setPrototypeOf(Sub, C);
      Sub.prototype = create(C.prototype, {
        constructor: { value: Sub }
      });
      return f(Sub);
    });
  };

  var getGlobal = function () {
    /* global self, window, global */
    // the only reliable means to get the global object is
    // `Function('return this')()`
    // However, this causes CSP violations in Chrome apps.
    if (typeof self !== 'undefined') { return self; }
    if (typeof window !== 'undefined') { return window; }
    if (typeof global !== 'undefined') { return global; }
    throw new Error('unable to locate global object');
  };

  var globals = getGlobal();
  var globalIsFinite = globals.isFinite;
  var _indexOf = Function.call.bind(String.prototype.indexOf);
  var _arrayIndexOfApply = Function.apply.bind(Array.prototype.indexOf);
  var _concat = Function.call.bind(Array.prototype.concat);
  // var _sort = Function.call.bind(Array.prototype.sort);
  var _strSlice = Function.call.bind(String.prototype.slice);
  var _push = Function.call.bind(Array.prototype.push);
  var _pushApply = Function.apply.bind(Array.prototype.push);
  var _shift = Function.call.bind(Array.prototype.shift);
  var _max = Math.max;
  var _min = Math.min;
  var _floor = Math.floor;
  var _abs = Math.abs;
  var _exp = Math.exp;
  var _log = Math.log;
  var _sqrt = Math.sqrt;
  var _hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
  var ArrayIterator; // make our implementation private
  var noop = function () {};

  var OrigMap = globals.Map;
  var origMapDelete = OrigMap && OrigMap.prototype['delete'];
  var origMapGet = OrigMap && OrigMap.prototype.get;
  var origMapHas = OrigMap && OrigMap.prototype.has;
  var origMapSet = OrigMap && OrigMap.prototype.set;

  var Symbol = globals.Symbol || {};
  var symbolSpecies = Symbol.species || '@@species';

  var numberIsNaN = Number.isNaN || function isNaN(value) {
    // NaN !== NaN, but they are identical.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN('foo') => true
    return value !== value;
  };
  var numberIsFinite = Number.isFinite || function isFinite(value) {
    return typeof value === 'number' && globalIsFinite(value);
  };
  var _sign = isCallable(Math.sign) ? Math.sign : function sign(value) {
    var number = Number(value);
    if (number === 0) { return number; }
    if (numberIsNaN(number)) { return number; }
    return number < 0 ? -1 : 1;
  };
  var _log1p = function log1p(value) {
    var x = Number(value);
    if (x < -1 || numberIsNaN(x)) { return NaN; }
    if (x === 0 || x === Infinity) { return x; }
    if (x === -1) { return -Infinity; }

    return (1 + x) - 1 === 0 ? x : x * (_log(1 + x) / ((1 + x) - 1));
  };

  // taken directly from https://github.com/ljharb/is-arguments/blob/master/index.js
  // can be replaced with require('is-arguments') if we ever use a build process instead
  var isStandardArguments = function isArguments(value) {
    return _toString(value) === '[object Arguments]';
  };
  var isLegacyArguments = function isArguments(value) {
    return value !== null &&
      typeof value === 'object' &&
      typeof value.length === 'number' &&
      value.length >= 0 &&
      _toString(value) !== '[object Array]' &&
      _toString(value.callee) === '[object Function]';
  };
  var isArguments = isStandardArguments(arguments) ? isStandardArguments : isLegacyArguments;

  var Type = {
    primitive: function (x) { return x === null || (typeof x !== 'function' && typeof x !== 'object'); },
    string: function (x) { return _toString(x) === '[object String]'; },
    regex: function (x) { return _toString(x) === '[object RegExp]'; },
    symbol: function (x) {
      return typeof globals.Symbol === 'function' && typeof x === 'symbol';
    }
  };

  var overrideNative = function overrideNative(object, property, replacement) {
    var original = object[property];
    defineProperty(object, property, replacement, true);
    Value.preserveToString(object[property], original);
  };

  // eslint-disable-next-line no-restricted-properties
  var hasSymbols = typeof Symbol === 'function' && typeof Symbol['for'] === 'function' && Type.symbol(Symbol());

  // This is a private name in the es6 spec, equal to '[Symbol.iterator]'
  // we're going to use an arbitrary _-prefixed name to make our shims
  // work properly with each other, even though we don't have full Iterator
  // support.  That is, `Array.from(map.keys())` will work, but we don't
  // pretend to export a "real" Iterator interface.
  var $iterator$ = Type.symbol(Symbol.iterator) ? Symbol.iterator : '_es6-shim iterator_';
  // Firefox ships a partial implementation using the name @@iterator.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
  // So use that name if we detect it.
  if (globals.Set && typeof new globals.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }

  // Reflect
  if (!globals.Reflect) {
    defineProperty(globals, 'Reflect', {}, true);
  }
  var Reflect = globals.Reflect;

  var $String = String;

  /* global document */
  var domAll = (typeof document === 'undefined' || !document) ? null : document.all;
  var isNullOrUndefined = domAll == null ? function isNullOrUndefined(x) {
    return x == null;
  } : function isNullOrUndefinedAndNotDocumentAll(x) {
    return x == null && x !== domAll;
  };

  var ES = {
    // http://www.ecma-international.org/ecma-262/6.0/#sec-call
    Call: function Call(F, V) {
      var args = arguments.length > 2 ? arguments[2] : [];
      if (!ES.IsCallable(F)) {
        throw new TypeError(F + ' is not a function');
      }
      return _apply(F, V, args);
    },

    RequireObjectCoercible: function (x, optMessage) {
      if (isNullOrUndefined(x)) {
        throw new TypeError(optMessage || 'Cannot call method on ' + x);
      }
      return x;
    },

    // This might miss the "(non-standard exotic and does not implement
    // [[Call]])" case from
    // http://www.ecma-international.org/ecma-262/6.0/#sec-typeof-operator-runtime-semantics-evaluation
    // but we can't find any evidence these objects exist in practice.
    // If we find some in the future, you could test `Object(x) === x`,
    // which is reliable according to
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toobject
    // but is not well optimized by runtimes and creates an object
    // whenever it returns false, and thus is very slow.
    TypeIsObject: function (x) {
      if (x === void 0 || x === null || x === true || x === false) {
        return false;
      }
      return typeof x === 'function' || typeof x === 'object' || x === domAll;
    },

    ToObject: function (o, optMessage) {
      return Object(ES.RequireObjectCoercible(o, optMessage));
    },

    IsCallable: isCallable,

    IsConstructor: function (x) {
      // We can't tell callables from constructors in ES5
      return ES.IsCallable(x);
    },

    ToInt32: function (x) {
      return ES.ToNumber(x) >> 0;
    },

    ToUint32: function (x) {
      return ES.ToNumber(x) >>> 0;
    },

    ToNumber: function (value) {
      if (_toString(value) === '[object Symbol]') {
        throw new TypeError('Cannot convert a Symbol value to a number');
      }
      return +value;
    },

    ToInteger: function (value) {
      var number = ES.ToNumber(value);
      if (numberIsNaN(number)) { return 0; }
      if (number === 0 || !numberIsFinite(number)) { return number; }
      return (number > 0 ? 1 : -1) * _floor(_abs(number));
    },

    ToLength: function (value) {
      var len = ES.ToInteger(value);
      if (len <= 0) { return 0; } // includes converting -0 to +0
      if (len > Number.MAX_SAFE_INTEGER) { return Number.MAX_SAFE_INTEGER; }
      return len;
    },

    SameValue: function (a, b) {
      if (a === b) {
        // 0 === -0, but they are not identical.
        if (a === 0) { return 1 / a === 1 / b; }
        return true;
      }
      return numberIsNaN(a) && numberIsNaN(b);
    },

    SameValueZero: function (a, b) {
      // same as SameValue except for SameValueZero(+0, -0) == true
      return (a === b) || (numberIsNaN(a) && numberIsNaN(b));
    },

    IsIterable: function (o) {
      return ES.TypeIsObject(o) && (typeof o[$iterator$] !== 'undefined' || isArguments(o));
    },

    GetIterator: function (o) {
      if (isArguments(o)) {
        // special case support for `arguments`
        return new ArrayIterator(o, 'value');
      }
      var itFn = ES.GetMethod(o, $iterator$);
      if (!ES.IsCallable(itFn)) {
        // Better diagnostics if itFn is null or undefined
        throw new TypeError('value is not an iterable');
      }
      var it = ES.Call(itFn, o);
      if (!ES.TypeIsObject(it)) {
        throw new TypeError('bad iterator');
      }
      return it;
    },

    GetMethod: function (o, p) {
      var func = ES.ToObject(o)[p];
      if (isNullOrUndefined(func)) {
        return void 0;
      }
      if (!ES.IsCallable(func)) {
        throw new TypeError('Method not callable: ' + p);
      }
      return func;
    },

    IteratorComplete: function (iterResult) {
      return !!iterResult.done;
    },

    IteratorClose: function (iterator, completionIsThrow) {
      var returnMethod = ES.GetMethod(iterator, 'return');
      if (returnMethod === void 0) {
        return;
      }
      var innerResult, innerException;
      try {
        innerResult = ES.Call(returnMethod, iterator);
      } catch (e) {
        innerException = e;
      }
      if (completionIsThrow) {
        return;
      }
      if (innerException) {
        throw innerException;
      }
      if (!ES.TypeIsObject(innerResult)) {
        throw new TypeError("Iterator's return method returned a non-object.");
      }
    },

    IteratorNext: function (it) {
      var result = arguments.length > 1 ? it.next(arguments[1]) : it.next();
      if (!ES.TypeIsObject(result)) {
        throw new TypeError('bad iterator');
      }
      return result;
    },

    IteratorStep: function (it) {
      var result = ES.IteratorNext(it);
      var done = ES.IteratorComplete(result);
      return done ? false : result;
    },

    Construct: function (C, args, newTarget, isES6internal) {
      var target = typeof newTarget === 'undefined' ? C : newTarget;

      if (!isES6internal && Reflect.construct) {
        // Try to use Reflect.construct if available
        return Reflect.construct(C, args, target);
      }
      // OK, we have to fake it.  This will only work if the
      // C.[[ConstructorKind]] == "base" -- but that's the only
      // kind we can make in ES5 code anyway.

      // OrdinaryCreateFromConstructor(target, "%ObjectPrototype%")
      var proto = target.prototype;
      if (!ES.TypeIsObject(proto)) {
        proto = Object.prototype;
      }
      var obj = create(proto);
      // Call the constructor.
      var result = ES.Call(C, obj, args);
      return ES.TypeIsObject(result) ? result : obj;
    },

    SpeciesConstructor: function (O, defaultConstructor) {
      var C = O.constructor;
      if (C === void 0) {
        return defaultConstructor;
      }
      if (!ES.TypeIsObject(C)) {
        throw new TypeError('Bad constructor');
      }
      var S = C[symbolSpecies];
      if (isNullOrUndefined(S)) {
        return defaultConstructor;
      }
      if (!ES.IsConstructor(S)) {
        throw new TypeError('Bad @@species');
      }
      return S;
    },

    CreateHTML: function (string, tag, attribute, value) {
      var S = ES.ToString(string);
      var p1 = '<' + tag;
      if (attribute !== '') {
        var V = ES.ToString(value);
        var escapedV = V.replace(/"/g, '&quot;');
        p1 += ' ' + attribute + '="' + escapedV + '"';
      }
      var p2 = p1 + '>';
      var p3 = p2 + S;
      return p3 + '</' + tag + '>';
    },

    IsRegExp: function IsRegExp(argument) {
      if (!ES.TypeIsObject(argument)) {
        return false;
      }
      var isRegExp = argument[Symbol.match];
      if (typeof isRegExp !== 'undefined') {
        return !!isRegExp;
      }
      return Type.regex(argument);
    },

    ToString: function ToString(string) {
      return $String(string);
    }
  };

  // Well-known Symbol shims
  if (supportsDescriptors && hasSymbols) {
    var defineWellKnownSymbol = function defineWellKnownSymbol(name) {
      if (Type.symbol(Symbol[name])) {
        return Symbol[name];
      }
      // eslint-disable-next-line no-restricted-properties
      var sym = Symbol['for']('Symbol.' + name);
      Object.defineProperty(Symbol, name, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: sym
      });
      return sym;
    };
    if (!Type.symbol(Symbol.search)) {
      var symbolSearch = defineWellKnownSymbol('search');
      var originalSearch = String.prototype.search;
      defineProperty(RegExp.prototype, symbolSearch, function search(string) {
        return ES.Call(originalSearch, string, [this]);
      });
      var searchShim = function search(regexp) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(regexp)) {
          var searcher = ES.GetMethod(regexp, symbolSearch);
          if (typeof searcher !== 'undefined') {
            return ES.Call(searcher, regexp, [O]);
          }
        }
        return ES.Call(originalSearch, O, [ES.ToString(regexp)]);
      };
      overrideNative(String.prototype, 'search', searchShim);
    }
    if (!Type.symbol(Symbol.replace)) {
      var symbolReplace = defineWellKnownSymbol('replace');
      var originalReplace = String.prototype.replace;
      defineProperty(RegExp.prototype, symbolReplace, function replace(string, replaceValue) {
        return ES.Call(originalReplace, string, [this, replaceValue]);
      });
      var replaceShim = function replace(searchValue, replaceValue) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(searchValue)) {
          var replacer = ES.GetMethod(searchValue, symbolReplace);
          if (typeof replacer !== 'undefined') {
            return ES.Call(replacer, searchValue, [O, replaceValue]);
          }
        }
        return ES.Call(originalReplace, O, [ES.ToString(searchValue), replaceValue]);
      };
      overrideNative(String.prototype, 'replace', replaceShim);
    }
    if (!Type.symbol(Symbol.split)) {
      var symbolSplit = defineWellKnownSymbol('split');
      var originalSplit = String.prototype.split;
      defineProperty(RegExp.prototype, symbolSplit, function split(string, limit) {
        return ES.Call(originalSplit, string, [this, limit]);
      });
      var splitShim = function split(separator, limit) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(separator)) {
          var splitter = ES.GetMethod(separator, symbolSplit);
          if (typeof splitter !== 'undefined') {
            return ES.Call(splitter, separator, [O, limit]);
          }
        }
        return ES.Call(originalSplit, O, [ES.ToString(separator), limit]);
      };
      overrideNative(String.prototype, 'split', splitShim);
    }
    var symbolMatchExists = Type.symbol(Symbol.match);
    var stringMatchIgnoresSymbolMatch = symbolMatchExists && (function () {
      // Firefox 41, through Nightly 45 has Symbol.match, but String#match ignores it.
      // Firefox 40 and below have Symbol.match but String#match works fine.
      var o = {};
      o[Symbol.match] = function () { return 42; };
      return 'a'.match(o) !== 42;
    }());
    if (!symbolMatchExists || stringMatchIgnoresSymbolMatch) {
      var symbolMatch = defineWellKnownSymbol('match');

      var originalMatch = String.prototype.match;
      defineProperty(RegExp.prototype, symbolMatch, function match(string) {
        return ES.Call(originalMatch, string, [this]);
      });

      var matchShim = function match(regexp) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(regexp)) {
          var matcher = ES.GetMethod(regexp, symbolMatch);
          if (typeof matcher !== 'undefined') {
            return ES.Call(matcher, regexp, [O]);
          }
        }
        return ES.Call(originalMatch, O, [ES.ToString(regexp)]);
      };
      overrideNative(String.prototype, 'match', matchShim);
    }
  }

  var wrapConstructor = function wrapConstructor(original, replacement, keysToSkip) {
    Value.preserveToString(replacement, original);
    if (Object.setPrototypeOf) {
      // sets up proper prototype chain where possible
      Object.setPrototypeOf(original, replacement);
    }
    if (supportsDescriptors) {
      _forEach(Object.getOwnPropertyNames(original), function (key) {
        if (key in noop || keysToSkip[key]) { return; }
        Value.proxy(original, key, replacement);
      });
    } else {
      _forEach(Object.keys(original), function (key) {
        if (key in noop || keysToSkip[key]) { return; }
        replacement[key] = original[key];
      });
    }
    replacement.prototype = original.prototype;
    Value.redefine(original.prototype, 'constructor', replacement);
  };

  var defaultSpeciesGetter = function () { return this; };
  var addDefaultSpecies = function (C) {
    if (supportsDescriptors && !_hasOwnProperty(C, symbolSpecies)) {
      Value.getter(C, symbolSpecies, defaultSpeciesGetter);
    }
  };

  var addIterator = function (prototype, impl) {
    var implementation = impl || function iterator() { return this; };
    defineProperty(prototype, $iterator$, implementation);
    if (!prototype[$iterator$] && Type.symbol($iterator$)) {
      // implementations are buggy when $iterator$ is a Symbol
      prototype[$iterator$] = implementation;
    }
  };

  var createDataProperty = function createDataProperty(object, name, value) {
    if (supportsDescriptors) {
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };
  var createDataPropertyOrThrow = function createDataPropertyOrThrow(object, name, value) {
    createDataProperty(object, name, value);
    if (!ES.SameValue(object[name], value)) {
      throw new TypeError('property is nonconfigurable');
    }
  };

  var emulateES6construct = function (o, defaultNewTarget, defaultProto, slots) {
    // This is an es5 approximation to es6 construct semantics.  in es6,
    // 'new Foo' invokes Foo.[[Construct]] which (for almost all objects)
    // just sets the internal variable NewTarget (in es6 syntax `new.target`)
    // to Foo and then returns Foo().

    // Many ES6 object then have constructors of the form:
    // 1. If NewTarget is undefined, throw a TypeError exception
    // 2. Let xxx by OrdinaryCreateFromConstructor(NewTarget, yyy, zzz)

    // So we're going to emulate those first two steps.
    if (!ES.TypeIsObject(o)) {
      throw new TypeError('Constructor requires `new`: ' + defaultNewTarget.name);
    }
    var proto = defaultNewTarget.prototype;
    if (!ES.TypeIsObject(proto)) {
      proto = defaultProto;
    }
    var obj = create(proto);
    for (var name in slots) {
      if (_hasOwnProperty(slots, name)) {
        var value = slots[name];
        defineProperty(obj, name, value, true);
      }
    }
    return obj;
  };

  // Firefox 31 reports this function's length as 0
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1062484
  if (String.fromCodePoint && String.fromCodePoint.length !== 1) {
    var originalFromCodePoint = String.fromCodePoint;
    overrideNative(String, 'fromCodePoint', function fromCodePoint(codePoints) {
      return ES.Call(originalFromCodePoint, this, arguments);
    });
  }

  var StringShims = {
    fromCodePoint: function fromCodePoint(codePoints) {
      var result = [];
      var next;
      for (var i = 0, length = arguments.length; i < length; i++) {
        next = Number(arguments[i]);
        if (!ES.SameValue(next, ES.ToInteger(next)) || next < 0 || next > 0x10FFFF) {
          throw new RangeError('Invalid code point ' + next);
        }

        if (next < 0x10000) {
          _push(result, String.fromCharCode(next));
        } else {
          next -= 0x10000;
          _push(result, String.fromCharCode((next >> 10) + 0xD800));
          _push(result, String.fromCharCode((next % 0x400) + 0xDC00));
        }
      }
      return result.join('');
    },

    raw: function raw(callSite) {
      var cooked = ES.ToObject(callSite, 'bad callSite');
      var rawString = ES.ToObject(cooked.raw, 'bad raw value');
      var len = rawString.length;
      var literalsegments = ES.ToLength(len);
      if (literalsegments <= 0) {
        return '';
      }

      var stringElements = [];
      var nextIndex = 0;
      var nextKey, next, nextSeg, nextSub;
      while (nextIndex < literalsegments) {
        nextKey = ES.ToString(nextIndex);
        nextSeg = ES.ToString(rawString[nextKey]);
        _push(stringElements, nextSeg);
        if (nextIndex + 1 >= literalsegments) {
          break;
        }
        next = nextIndex + 1 < arguments.length ? arguments[nextIndex + 1] : '';
        nextSub = ES.ToString(next);
        _push(stringElements, nextSub);
        nextIndex += 1;
      }
      return stringElements.join('');
    }
  };
  if (String.raw && String.raw({ raw: { 0: 'x', 1: 'y', length: 2 } }) !== 'xy') {
    // IE 11 TP has a broken String.raw implementation
    overrideNative(String, 'raw', StringShims.raw);
  }
  defineProperties(String, StringShims);

  // Fast repeat, uses the `Exponentiation by squaring` algorithm.
  // Perf: http://jsperf.com/string-repeat2/2
  var stringRepeat = function repeat(s, times) {
    if (times < 1) { return ''; }
    if (times % 2) { return repeat(s, times - 1) + s; }
    var half = repeat(s, times / 2);
    return half + half;
  };
  var stringMaxLength = Infinity;

  var StringPrototypeShims = {
    repeat: function repeat(times) {
      var thisStr = ES.ToString(ES.RequireObjectCoercible(this));
      var numTimes = ES.ToInteger(times);
      if (numTimes < 0 || numTimes >= stringMaxLength) {
        throw new RangeError('repeat count must be less than infinity and not overflow maximum string size');
      }
      return stringRepeat(thisStr, numTimes);
    },

    startsWith: function startsWith(searchString) {
      var S = ES.ToString(ES.RequireObjectCoercible(this));
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('Cannot call method "startsWith" with a regex');
      }
      var searchStr = ES.ToString(searchString);
      var position;
      if (arguments.length > 1) {
        position = arguments[1];
      }
      var start = _max(ES.ToInteger(position), 0);
      return _strSlice(S, start, start + searchStr.length) === searchStr;
    },

    endsWith: function endsWith(searchString) {
      var S = ES.ToString(ES.RequireObjectCoercible(this));
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('Cannot call method "endsWith" with a regex');
      }
      var searchStr = ES.ToString(searchString);
      var len = S.length;
      var endPosition;
      if (arguments.length > 1) {
        endPosition = arguments[1];
      }
      var pos = typeof endPosition === 'undefined' ? len : ES.ToInteger(endPosition);
      var end = _min(_max(pos, 0), len);
      return _strSlice(S, end - searchStr.length, end) === searchStr;
    },

    includes: function includes(searchString) {
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('"includes" does not accept a RegExp');
      }
      var searchStr = ES.ToString(searchString);
      var position;
      if (arguments.length > 1) {
        position = arguments[1];
      }
      // Somehow this trick makes method 100% compat with the spec.
      return _indexOf(this, searchStr, position) !== -1;
    },

    codePointAt: function codePointAt(pos) {
      var thisStr = ES.ToString(ES.RequireObjectCoercible(this));
      var position = ES.ToInteger(pos);
      var length = thisStr.length;
      if (position >= 0 && position < length) {
        var first = thisStr.charCodeAt(position);
        var isEnd = position + 1 === length;
        if (first < 0xD800 || first > 0xDBFF || isEnd) { return first; }
        var second = thisStr.charCodeAt(position + 1);
        if (second < 0xDC00 || second > 0xDFFF) { return first; }
        return ((first - 0xD800) * 1024) + (second - 0xDC00) + 0x10000;
      }
    }
  };
  if (String.prototype.includes && 'a'.includes('a', Infinity) !== false) {
    overrideNative(String.prototype, 'includes', StringPrototypeShims.includes);
  }

  if (String.prototype.startsWith && String.prototype.endsWith) {
    var startsWithRejectsRegex = throwsError(function () {
      /* throws if spec-compliant */
      return '/a/'.startsWith(/a/);
    });
    var startsWithHandlesInfinity = valueOrFalseIfThrows(function () {
      return 'abc'.startsWith('a', Infinity) === false;
    });
    if (!startsWithRejectsRegex || !startsWithHandlesInfinity) {
      // Firefox (< 37?) and IE 11 TP have a noncompliant startsWith implementation
      overrideNative(String.prototype, 'startsWith', StringPrototypeShims.startsWith);
      overrideNative(String.prototype, 'endsWith', StringPrototypeShims.endsWith);
    }
  }
  if (hasSymbols) {
    var startsWithSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return '/a/'.startsWith(re);
    });
    if (!startsWithSupportsSymbolMatch) {
      overrideNative(String.prototype, 'startsWith', StringPrototypeShims.startsWith);
    }
    var endsWithSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return '/a/'.endsWith(re);
    });
    if (!endsWithSupportsSymbolMatch) {
      overrideNative(String.prototype, 'endsWith', StringPrototypeShims.endsWith);
    }
    var includesSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return '/a/'.includes(re);
    });
    if (!includesSupportsSymbolMatch) {
      overrideNative(String.prototype, 'includes', StringPrototypeShims.includes);
    }
  }

  defineProperties(String.prototype, StringPrototypeShims);

  // whitespace from: http://es5.github.io/#x15.5.4.20
  // implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
  var ws = [
    '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003',
    '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028',
    '\u2029\uFEFF'
  ].join('');
  var trimRegexp = new RegExp('(^[' + ws + ']+)|([' + ws + ']+$)', 'g');
  var trimShim = function trim() {
    return ES.ToString(ES.RequireObjectCoercible(this)).replace(trimRegexp, '');
  };
  var nonWS = ['\u0085', '\u200b', '\ufffe'].join('');
  var nonWSregex = new RegExp('[' + nonWS + ']', 'g');
  var isBadHexRegex = /^[-+]0x[0-9a-f]+$/i;
  var hasStringTrimBug = nonWS.trim().length !== nonWS.length;
  defineProperty(String.prototype, 'trim', trimShim, hasStringTrimBug);

  // Given an argument x, it will return an IteratorResult object,
  // with value set to x and done to false.
  // Given no arguments, it will return an iterator completion object.
  var iteratorResult = function (x) {
    return { value: x, done: arguments.length === 0 };
  };

  // see http://www.ecma-international.org/ecma-262/6.0/#sec-string.prototype-@@iterator
  var StringIterator = function (s) {
    ES.RequireObjectCoercible(s);
    this._s = ES.ToString(s);
    this._i = 0;
  };
  StringIterator.prototype.next = function () {
    var s = this._s;
    var i = this._i;
    if (typeof s === 'undefined' || i >= s.length) {
      this._s = void 0;
      return iteratorResult();
    }
    var first = s.charCodeAt(i);
    var second, len;
    if (first < 0xD800 || first > 0xDBFF || (i + 1) === s.length) {
      len = 1;
    } else {
      second = s.charCodeAt(i + 1);
      len = (second < 0xDC00 || second > 0xDFFF) ? 1 : 2;
    }
    this._i = i + len;
    return iteratorResult(s.substr(i, len));
  };
  addIterator(StringIterator.prototype);
  addIterator(String.prototype, function () {
    return new StringIterator(this);
  });

  var ArrayShims = {
    from: function from(items) {
      var C = this;
      var mapFn;
      if (arguments.length > 1) {
        mapFn = arguments[1];
      }
      var mapping, T;
      if (typeof mapFn === 'undefined') {
        mapping = false;
      } else {
        if (!ES.IsCallable(mapFn)) {
          throw new TypeError('Array.from: when provided, the second argument must be a function');
        }
        if (arguments.length > 2) {
          T = arguments[2];
        }
        mapping = true;
      }

      // Note that that Arrays will use ArrayIterator:
      // https://bugs.ecmascript.org/show_bug.cgi?id=2416
      var usingIterator = typeof (isArguments(items) || ES.GetMethod(items, $iterator$)) !== 'undefined';

      var length, result, i;
      if (usingIterator) {
        result = ES.IsConstructor(C) ? Object(new C()) : [];
        var iterator = ES.GetIterator(items);
        var next, nextValue;

        i = 0;
        while (true) {
          next = ES.IteratorStep(iterator);
          if (next === false) {
            break;
          }
          nextValue = next.value;
          try {
            if (mapping) {
              nextValue = typeof T === 'undefined' ? mapFn(nextValue, i) : _call(mapFn, T, nextValue, i);
            }
            result[i] = nextValue;
          } catch (e) {
            ES.IteratorClose(iterator, true);
            throw e;
          }
          i += 1;
        }
        length = i;
      } else {
        var arrayLike = ES.ToObject(items);
        length = ES.ToLength(arrayLike.length);
        result = ES.IsConstructor(C) ? Object(new C(length)) : new Array(length);
        var value;
        for (i = 0; i < length; ++i) {
          value = arrayLike[i];
          if (mapping) {
            value = typeof T === 'undefined' ? mapFn(value, i) : _call(mapFn, T, value, i);
          }
          createDataPropertyOrThrow(result, i, value);
        }
      }

      result.length = length;
      return result;
    },

    of: function of() {
      var len = arguments.length;
      var C = this;
      var A = isArray(C) || !ES.IsCallable(C) ? new Array(len) : ES.Construct(C, [len]);
      for (var k = 0; k < len; ++k) {
        createDataPropertyOrThrow(A, k, arguments[k]);
      }
      A.length = len;
      return A;
    }
  };
  defineProperties(Array, ArrayShims);
  addDefaultSpecies(Array);

  // Our ArrayIterator is private; see
  // https://github.com/paulmillr/es6-shim/issues/252
  ArrayIterator = function (array, kind) {
    this.i = 0;
    this.array = array;
    this.kind = kind;
  };

  defineProperties(ArrayIterator.prototype, {
    next: function () {
      var i = this.i;
      var array = this.array;
      if (!(this instanceof ArrayIterator)) {
        throw new TypeError('Not an ArrayIterator');
      }
      if (typeof array !== 'undefined') {
        var len = ES.ToLength(array.length);
        for (; i < len; i++) {
          var kind = this.kind;
          var retval;
          if (kind === 'key') {
            retval = i;
          } else if (kind === 'value') {
            retval = array[i];
          } else if (kind === 'entry') {
            retval = [i, array[i]];
          }
          this.i = i + 1;
          return iteratorResult(retval);
        }
      }
      this.array = void 0;
      return iteratorResult();
    }
  });
  addIterator(ArrayIterator.prototype);

  /*
  var orderKeys = function orderKeys(a, b) {
    var aNumeric = String(ES.ToInteger(a)) === a;
    var bNumeric = String(ES.ToInteger(b)) === b;
    if (aNumeric && bNumeric) {
      return b - a;
    } else if (aNumeric && !bNumeric) {
      return -1;
    } else if (!aNumeric && bNumeric) {
      return 1;
    } else {
      return a.localeCompare(b);
    }
  };

  var getAllKeys = function getAllKeys(object) {
    var ownKeys = [];
    var keys = [];

    for (var key in object) {
      _push(_hasOwnProperty(object, key) ? ownKeys : keys, key);
    }
    _sort(ownKeys, orderKeys);
    _sort(keys, orderKeys);

    return _concat(ownKeys, keys);
  };
  */

  // note: this is positioned here because it depends on ArrayIterator
  var arrayOfSupportsSubclassing = Array.of === ArrayShims.of || (function () {
    // Detects a bug in Webkit nightly r181886
    var Foo = function Foo(len) { this.length = len; };
    Foo.prototype = [];
    var fooArr = Array.of.apply(Foo, [1, 2]);
    return fooArr instanceof Foo && fooArr.length === 2;
  }());
  if (!arrayOfSupportsSubclassing) {
    overrideNative(Array, 'of', ArrayShims.of);
  }

  var ArrayPrototypeShims = {
    copyWithin: function copyWithin(target, start) {
      var o = ES.ToObject(this);
      var len = ES.ToLength(o.length);
      var relativeTarget = ES.ToInteger(target);
      var relativeStart = ES.ToInteger(start);
      var to = relativeTarget < 0 ? _max(len + relativeTarget, 0) : _min(relativeTarget, len);
      var from = relativeStart < 0 ? _max(len + relativeStart, 0) : _min(relativeStart, len);
      var end;
      if (arguments.length > 2) {
        end = arguments[2];
      }
      var relativeEnd = typeof end === 'undefined' ? len : ES.ToInteger(end);
      var finalItem = relativeEnd < 0 ? _max(len + relativeEnd, 0) : _min(relativeEnd, len);
      var count = _min(finalItem - from, len - to);
      var direction = 1;
      if (from < to && to < (from + count)) {
        direction = -1;
        from += count - 1;
        to += count - 1;
      }
      while (count > 0) {
        if (from in o) {
          o[to] = o[from];
        } else {
          delete o[to];
        }
        from += direction;
        to += direction;
        count -= 1;
      }
      return o;
    },

    fill: function fill(value) {
      var start;
      if (arguments.length > 1) {
        start = arguments[1];
      }
      var end;
      if (arguments.length > 2) {
        end = arguments[2];
      }
      var O = ES.ToObject(this);
      var len = ES.ToLength(O.length);
      start = ES.ToInteger(typeof start === 'undefined' ? 0 : start);
      end = ES.ToInteger(typeof end === 'undefined' ? len : end);

      var relativeStart = start < 0 ? _max(len + start, 0) : _min(start, len);
      var relativeEnd = end < 0 ? len + end : end;

      for (var i = relativeStart; i < len && i < relativeEnd; ++i) {
        O[i] = value;
      }
      return O;
    },

    find: function find(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#find: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0, value; i < length; i++) {
        value = list[i];
        if (thisArg) {
          if (_call(predicate, thisArg, value, i, list)) {
            return value;
          }
        } else if (predicate(value, i, list)) {
          return value;
        }
      }
    },

    findIndex: function findIndex(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#findIndex: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0; i < length; i++) {
        if (thisArg) {
          if (_call(predicate, thisArg, list[i], i, list)) {
            return i;
          }
        } else if (predicate(list[i], i, list)) {
          return i;
        }
      }
      return -1;
    },

    keys: function keys() {
      return new ArrayIterator(this, 'key');
    },

    values: function values() {
      return new ArrayIterator(this, 'value');
    },

    entries: function entries() {
      return new ArrayIterator(this, 'entry');
    }
  };
  // Safari 7.1 defines Array#keys and Array#entries natively,
  // but the resulting ArrayIterator objects don't have a "next" method.
  if (Array.prototype.keys && !ES.IsCallable([1].keys().next)) {
    delete Array.prototype.keys;
  }
  if (Array.prototype.entries && !ES.IsCallable([1].entries().next)) {
    delete Array.prototype.entries;
  }

  // Chrome 38 defines Array#keys and Array#entries, and Array#@@iterator, but not Array#values
  if (Array.prototype.keys && Array.prototype.entries && !Array.prototype.values && Array.prototype[$iterator$]) {
    defineProperties(Array.prototype, {
      values: Array.prototype[$iterator$]
    });
    if (Type.symbol(Symbol.unscopables)) {
      Array.prototype[Symbol.unscopables].values = true;
    }
  }
  // Chrome 40 defines Array#values with the incorrect name, although Array#{keys,entries} have the correct name
  if (functionsHaveNames && Array.prototype.values && Array.prototype.values.name !== 'values') {
    var originalArrayPrototypeValues = Array.prototype.values;
    overrideNative(Array.prototype, 'values', function values() { return ES.Call(originalArrayPrototypeValues, this, arguments); });
    defineProperty(Array.prototype, $iterator$, Array.prototype.values, true);
  }
  defineProperties(Array.prototype, ArrayPrototypeShims);

  if (1 / [true].indexOf(true, -0) < 0) {
    // indexOf when given a position arg of -0 should return +0.
    // https://github.com/tc39/ecma262/pull/316
    defineProperty(Array.prototype, 'indexOf', function indexOf(searchElement) {
      var value = _arrayIndexOfApply(this, arguments);
      if (value === 0 && (1 / value) < 0) {
        return 0;
      }
      return value;
    }, true);
  }

  addIterator(Array.prototype, function () { return this.values(); });
  // Chrome defines keys/values/entries on Array, but doesn't give us
  // any way to identify its iterator.  So add our own shimmed field.
  if (Object.getPrototypeOf) {
    addIterator(Object.getPrototypeOf([].values()));
  }

  // note: this is positioned here because it relies on Array#entries
  var arrayFromSwallowsNegativeLengths = (function () {
    // Detects a Firefox bug in v32
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1063993
    return valueOrFalseIfThrows(function () {
      return Array.from({ length: -1 }).length === 0;
    });
  }());
  var arrayFromHandlesIterables = (function () {
    // Detects a bug in Webkit nightly r181886
    var arr = Array.from([0].entries());
    return arr.length === 1 && isArray(arr[0]) && arr[0][0] === 0 && arr[0][1] === 0;
  }());
  if (!arrayFromSwallowsNegativeLengths || !arrayFromHandlesIterables) {
    overrideNative(Array, 'from', ArrayShims.from);
  }
  var arrayFromHandlesUndefinedMapFunction = (function () {
    // Microsoft Edge v0.11 throws if the mapFn argument is *provided* but undefined,
    // but the spec doesn't care if it's provided or not - undefined doesn't throw.
    return valueOrFalseIfThrows(function () {
      return Array.from([0], void 0);
    });
  }());
  if (!arrayFromHandlesUndefinedMapFunction) {
    var origArrayFrom = Array.from;
    overrideNative(Array, 'from', function from(items) {
      if (arguments.length > 1 && typeof arguments[1] !== 'undefined') {
        return ES.Call(origArrayFrom, this, arguments);
      } else {
        return _call(origArrayFrom, this, items);
      }
    });
  }

  var int32sAsOne = -(Math.pow(2, 32) - 1);
  var toLengthsCorrectly = function (method, reversed) {
    var obj = { length: int32sAsOne };
    obj[reversed ? (obj.length >>> 0) - 1 : 0] = true;
    return valueOrFalseIfThrows(function () {
      _call(method, obj, function () {
        // note: in nonconforming browsers, this will be called
        // -1 >>> 0 times, which is 4294967295, so the throw matters.
        throw new RangeError('should not reach here');
      }, []);
      return true;
    });
  };
  if (!toLengthsCorrectly(Array.prototype.forEach)) {
    var originalForEach = Array.prototype.forEach;
    overrideNative(Array.prototype, 'forEach', function forEach(callbackFn) {
      return ES.Call(originalForEach, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.map)) {
    var originalMap = Array.prototype.map;
    overrideNative(Array.prototype, 'map', function map(callbackFn) {
      return ES.Call(originalMap, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.filter)) {
    var originalFilter = Array.prototype.filter;
    overrideNative(Array.prototype, 'filter', function filter(callbackFn) {
      return ES.Call(originalFilter, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.some)) {
    var originalSome = Array.prototype.some;
    overrideNative(Array.prototype, 'some', function some(callbackFn) {
      return ES.Call(originalSome, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.every)) {
    var originalEvery = Array.prototype.every;
    overrideNative(Array.prototype, 'every', function every(callbackFn) {
      return ES.Call(originalEvery, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.reduce)) {
    var originalReduce = Array.prototype.reduce;
    overrideNative(Array.prototype, 'reduce', function reduce(callbackFn) {
      return ES.Call(originalReduce, this.length >= 0 ? this : [], arguments);
    }, true);
  }
  if (!toLengthsCorrectly(Array.prototype.reduceRight, true)) {
    var originalReduceRight = Array.prototype.reduceRight;
    overrideNative(Array.prototype, 'reduceRight', function reduceRight(callbackFn) {
      return ES.Call(originalReduceRight, this.length >= 0 ? this : [], arguments);
    }, true);
  }

  var lacksOctalSupport = Number('0o10') !== 8;
  var lacksBinarySupport = Number('0b10') !== 2;
  var trimsNonWhitespace = _some(nonWS, function (c) {
    return Number(c + 0 + c) === 0;
  });
  if (lacksOctalSupport || lacksBinarySupport || trimsNonWhitespace) {
    var OrigNumber = Number;
    var binaryRegex = /^0b[01]+$/i;
    var octalRegex = /^0o[0-7]+$/i;
    // Note that in IE 8, RegExp.prototype.test doesn't seem to exist: ie, "test" is an own property of regexes. wtf.
    var isBinary = binaryRegex.test.bind(binaryRegex);
    var isOctal = octalRegex.test.bind(octalRegex);
    var toPrimitive = function (O) { // need to replace this with `es-to-primitive/es6`
      var result;
      if (typeof O.valueOf === 'function') {
        result = O.valueOf();
        if (Type.primitive(result)) {
          return result;
        }
      }
      if (typeof O.toString === 'function') {
        result = O.toString();
        if (Type.primitive(result)) {
          return result;
        }
      }
      throw new TypeError('No default value');
    };
    var hasNonWS = nonWSregex.test.bind(nonWSregex);
    var isBadHex = isBadHexRegex.test.bind(isBadHexRegex);
    var NumberShim = (function () {
      // this is wrapped in an IIFE because of IE 6-8's wacky scoping issues with named function expressions.
      var NumberShim = function Number(value) {
        var primValue;
        if (arguments.length > 0) {
          primValue = Type.primitive(value) ? value : toPrimitive(value, 'number');
        } else {
          primValue = 0;
        }
        if (typeof primValue === 'string') {
          primValue = ES.Call(trimShim, primValue);
          if (isBinary(primValue)) {
            primValue = parseInt(_strSlice(primValue, 2), 2);
          } else if (isOctal(primValue)) {
            primValue = parseInt(_strSlice(primValue, 2), 8);
          } else if (hasNonWS(primValue) || isBadHex(primValue)) {
            primValue = NaN;
          }
        }
        var receiver = this;
        var valueOfSucceeds = valueOrFalseIfThrows(function () {
          OrigNumber.prototype.valueOf.call(receiver);
          return true;
        });
        if (receiver instanceof NumberShim && !valueOfSucceeds) {
          return new OrigNumber(primValue);
        }
        return OrigNumber(primValue);
      };
      return NumberShim;
    }());
    wrapConstructor(OrigNumber, NumberShim, {});
    // this is necessary for ES3 browsers, where these properties are non-enumerable.
    defineProperties(NumberShim, {
      NaN: OrigNumber.NaN,
      MAX_VALUE: OrigNumber.MAX_VALUE,
      MIN_VALUE: OrigNumber.MIN_VALUE,
      NEGATIVE_INFINITY: OrigNumber.NEGATIVE_INFINITY,
      POSITIVE_INFINITY: OrigNumber.POSITIVE_INFINITY
    });
    /* globals Number: true */
    /* eslint-disable no-undef, no-global-assign */
    Number = NumberShim;
    Value.redefine(globals, 'Number', NumberShim);
    /* eslint-enable no-undef, no-global-assign */
    /* globals Number: false */
  }

  var maxSafeInteger = Math.pow(2, 53) - 1;
  defineProperties(Number, {
    MAX_SAFE_INTEGER: maxSafeInteger,
    MIN_SAFE_INTEGER: -maxSafeInteger,
    EPSILON: 2.220446049250313e-16,

    parseInt: globals.parseInt,
    parseFloat: globals.parseFloat,

    isFinite: numberIsFinite,

    isInteger: function isInteger(value) {
      return numberIsFinite(value) && ES.ToInteger(value) === value;
    },

    isSafeInteger: function isSafeInteger(value) {
      return Number.isInteger(value) && _abs(value) <= Number.MAX_SAFE_INTEGER;
    },

    isNaN: numberIsNaN
  });
  // Firefox 37 has a conforming Number.parseInt, but it's not === to the global parseInt (fixed in v40)
  defineProperty(Number, 'parseInt', globals.parseInt, Number.parseInt !== globals.parseInt);

  // Work around bugs in Array#find and Array#findIndex -- early
  // implementations skipped holes in sparse arrays. (Note that the
  // implementations of find/findIndex indirectly use shimmed
  // methods of Number, so this test has to happen down here.)
  /* eslint-disable no-sparse-arrays */
  if ([, 1].find(function () { return true; }) === 1) {
    overrideNative(Array.prototype, 'find', ArrayPrototypeShims.find);
  }
  if ([, 1].findIndex(function () { return true; }) !== 0) {
    overrideNative(Array.prototype, 'findIndex', ArrayPrototypeShims.findIndex);
  }
  /* eslint-enable no-sparse-arrays */

  var isEnumerableOn = Function.bind.call(Function.bind, Object.prototype.propertyIsEnumerable);
  var ensureEnumerable = function ensureEnumerable(obj, prop) {
    if (supportsDescriptors && isEnumerableOn(obj, prop)) {
      Object.defineProperty(obj, prop, { enumerable: false });
    }
  };
  var sliceArgs = function sliceArgs() {
    // per https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
    // and https://gist.github.com/WebReflection/4327762cb87a8c634a29
    var initial = Number(this);
    var len = arguments.length;
    var desiredArgCount = len - initial;
    var args = new Array(desiredArgCount < 0 ? 0 : desiredArgCount);
    for (var i = initial; i < len; ++i) {
      args[i - initial] = arguments[i];
    }
    return args;
  };
  var assignTo = function assignTo(source) {
    return function assignToSource(target, key) {
      target[key] = source[key];
      return target;
    };
  };
  var assignReducer = function (target, source) {
    var sourceKeys = keys(Object(source));
    var symbols;
    if (ES.IsCallable(Object.getOwnPropertySymbols)) {
      symbols = _filter(Object.getOwnPropertySymbols(Object(source)), isEnumerableOn(source));
    }
    return _reduce(_concat(sourceKeys, symbols || []), assignTo(source), target);
  };

  var ObjectShims = {
    // 19.1.3.1
    assign: function (target, source) {
      var to = ES.ToObject(target, 'Cannot convert undefined or null to object');
      return _reduce(ES.Call(sliceArgs, 1, arguments), assignReducer, to);
    },

    // Added in WebKit in https://bugs.webkit.org/show_bug.cgi?id=143865
    is: function is(a, b) {
      return ES.SameValue(a, b);
    }
  };
  var assignHasPendingExceptions = Object.assign && Object.preventExtensions && (function () {
    // Firefox 37 still has "pending exception" logic in its Object.assign implementation,
    // which is 72% slower than our shim, and Firefox 40's native implementation.
    var thrower = Object.preventExtensions({ 1: 2 });
    try {
      Object.assign(thrower, 'xy');
    } catch (e) {
      return thrower[1] === 'y';
    }
  }());
  if (assignHasPendingExceptions) {
    overrideNative(Object, 'assign', ObjectShims.assign);
  }
  defineProperties(Object, ObjectShims);

  if (supportsDescriptors) {
    var ES5ObjectShims = {
      // 19.1.3.9
      // shim from https://gist.github.com/WebReflection/5593554
      setPrototypeOf: (function (Object, magic) {
        var set;

        var checkArgs = function (O, proto) {
          if (!ES.TypeIsObject(O)) {
            throw new TypeError('cannot set prototype on a non-object');
          }
          if (!(proto === null || ES.TypeIsObject(proto))) {
            throw new TypeError('can only set prototype to an object or null' + proto);
          }
        };

        var setPrototypeOf = function (O, proto) {
          checkArgs(O, proto);
          _call(set, O, proto);
          return O;
        };

        try {
          // this works already in Firefox and Safari
          set = Object.getOwnPropertyDescriptor(Object.prototype, magic).set;
          _call(set, {}, null);
        } catch (e) {
          if (Object.prototype !== {}[magic]) {
            // IE < 11 cannot be shimmed
            return;
          }
          // probably Chrome or some old Mobile stock browser
          set = function (proto) {
            this[magic] = proto;
          };
          // please note that this will **not** work
          // in those browsers that do not inherit
          // __proto__ by mistake from Object.prototype
          // in these cases we should probably throw an error
          // or at least be informed about the issue
          setPrototypeOf.polyfill = setPrototypeOf(
            setPrototypeOf({}, null),
            Object.prototype
          ) instanceof Object;
          // setPrototypeOf.polyfill === true means it works as meant
          // setPrototypeOf.polyfill === false means it's not 100% reliable
          // setPrototypeOf.polyfill === undefined
          // or
          // setPrototypeOf.polyfill ==  null means it's not a polyfill
          // which means it works as expected
          // we can even delete Object.prototype.__proto__;
        }
        return setPrototypeOf;
      }(Object, '__proto__'))
    };

    defineProperties(Object, ES5ObjectShims);
  }

  // Workaround bug in Opera 12 where setPrototypeOf(x, null) doesn't work,
  // but Object.create(null) does.
  if (Object.setPrototypeOf && Object.getPrototypeOf &&
      Object.getPrototypeOf(Object.setPrototypeOf({}, null)) !== null &&
      Object.getPrototypeOf(Object.create(null)) === null) {
    (function () {
      var FAKENULL = Object.create(null);
      var gpo = Object.getPrototypeOf;
      var spo = Object.setPrototypeOf;
      Object.getPrototypeOf = function (o) {
        var result = gpo(o);
        return result === FAKENULL ? null : result;
      };
      Object.setPrototypeOf = function (o, p) {
        var proto = p === null ? FAKENULL : p;
        return spo(o, proto);
      };
      Object.setPrototypeOf.polyfill = false;
    }());
  }

  var objectKeysAcceptsPrimitives = !throwsError(function () { return Object.keys('foo'); });
  if (!objectKeysAcceptsPrimitives) {
    var originalObjectKeys = Object.keys;
    overrideNative(Object, 'keys', function keys(value) {
      return originalObjectKeys(ES.ToObject(value));
    });
    keys = Object.keys;
  }
  var objectKeysRejectsRegex = throwsError(function () { return Object.keys(/a/g); });
  if (objectKeysRejectsRegex) {
    var regexRejectingObjectKeys = Object.keys;
    overrideNative(Object, 'keys', function keys(value) {
      if (Type.regex(value)) {
        var regexKeys = [];
        for (var k in value) {
          if (_hasOwnProperty(value, k)) {
            _push(regexKeys, k);
          }
        }
        return regexKeys;
      }
      return regexRejectingObjectKeys(value);
    });
    keys = Object.keys;
  }

  if (Object.getOwnPropertyNames) {
    var objectGOPNAcceptsPrimitives = !throwsError(function () { return Object.getOwnPropertyNames('foo'); });
    if (!objectGOPNAcceptsPrimitives) {
      var cachedWindowNames = typeof window === 'object' ? Object.getOwnPropertyNames(window) : [];
      var originalObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
      overrideNative(Object, 'getOwnPropertyNames', function getOwnPropertyNames(value) {
        var val = ES.ToObject(value);
        if (_toString(val) === '[object Window]') {
          try {
            return originalObjectGetOwnPropertyNames(val);
          } catch (e) {
            // IE bug where layout engine calls userland gOPN for cross-domain `window` objects
            return _concat([], cachedWindowNames);
          }
        }
        return originalObjectGetOwnPropertyNames(val);
      });
    }
  }
  if (Object.getOwnPropertyDescriptor) {
    var objectGOPDAcceptsPrimitives = !throwsError(function () { return Object.getOwnPropertyDescriptor('foo', 'bar'); });
    if (!objectGOPDAcceptsPrimitives) {
      var originalObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      overrideNative(Object, 'getOwnPropertyDescriptor', function getOwnPropertyDescriptor(value, property) {
        return originalObjectGetOwnPropertyDescriptor(ES.ToObject(value), property);
      });
    }
  }
  if (Object.seal) {
    var objectSealAcceptsPrimitives = !throwsError(function () { return Object.seal('foo'); });
    if (!objectSealAcceptsPrimitives) {
      var originalObjectSeal = Object.seal;
      overrideNative(Object, 'seal', function seal(value) {
        if (!ES.TypeIsObject(value)) { return value; }
        return originalObjectSeal(value);
      });
    }
  }
  if (Object.isSealed) {
    var objectIsSealedAcceptsPrimitives = !throwsError(function () { return Object.isSealed('foo'); });
    if (!objectIsSealedAcceptsPrimitives) {
      var originalObjectIsSealed = Object.isSealed;
      overrideNative(Object, 'isSealed', function isSealed(value) {
        if (!ES.TypeIsObject(value)) { return true; }
        return originalObjectIsSealed(value);
      });
    }
  }
  if (Object.freeze) {
    var objectFreezeAcceptsPrimitives = !throwsError(function () { return Object.freeze('foo'); });
    if (!objectFreezeAcceptsPrimitives) {
      var originalObjectFreeze = Object.freeze;
      overrideNative(Object, 'freeze', function freeze(value) {
        if (!ES.TypeIsObject(value)) { return value; }
        return originalObjectFreeze(value);
      });
    }
  }
  if (Object.isFrozen) {
    var objectIsFrozenAcceptsPrimitives = !throwsError(function () { return Object.isFrozen('foo'); });
    if (!objectIsFrozenAcceptsPrimitives) {
      var originalObjectIsFrozen = Object.isFrozen;
      overrideNative(Object, 'isFrozen', function isFrozen(value) {
        if (!ES.TypeIsObject(value)) { return true; }
        return originalObjectIsFrozen(value);
      });
    }
  }
  if (Object.preventExtensions) {
    var objectPreventExtensionsAcceptsPrimitives = !throwsError(function () { return Object.preventExtensions('foo'); });
    if (!objectPreventExtensionsAcceptsPrimitives) {
      var originalObjectPreventExtensions = Object.preventExtensions;
      overrideNative(Object, 'preventExtensions', function preventExtensions(value) {
        if (!ES.TypeIsObject(value)) { return value; }
        return originalObjectPreventExtensions(value);
      });
    }
  }
  if (Object.isExtensible) {
    var objectIsExtensibleAcceptsPrimitives = !throwsError(function () { return Object.isExtensible('foo'); });
    if (!objectIsExtensibleAcceptsPrimitives) {
      var originalObjectIsExtensible = Object.isExtensible;
      overrideNative(Object, 'isExtensible', function isExtensible(value) {
        if (!ES.TypeIsObject(value)) { return false; }
        return originalObjectIsExtensible(value);
      });
    }
  }
  if (Object.getPrototypeOf) {
    var objectGetProtoAcceptsPrimitives = !throwsError(function () { return Object.getPrototypeOf('foo'); });
    if (!objectGetProtoAcceptsPrimitives) {
      var originalGetProto = Object.getPrototypeOf;
      overrideNative(Object, 'getPrototypeOf', function getPrototypeOf(value) {
        return originalGetProto(ES.ToObject(value));
      });
    }
  }

  var hasFlags = supportsDescriptors && (function () {
    var desc = Object.getOwnPropertyDescriptor(RegExp.prototype, 'flags');
    return desc && ES.IsCallable(desc.get);
  }());
  if (supportsDescriptors && !hasFlags) {
    var regExpFlagsGetter = function flags() {
      if (!ES.TypeIsObject(this)) {
        throw new TypeError('Method called on incompatible type: must be an object.');
      }
      var result = '';
      if (this.global) {
        result += 'g';
      }
      if (this.ignoreCase) {
        result += 'i';
      }
      if (this.multiline) {
        result += 'm';
      }
      if (this.unicode) {
        result += 'u';
      }
      if (this.sticky) {
        result += 'y';
      }
      return result;
    };

    Value.getter(RegExp.prototype, 'flags', regExpFlagsGetter);
  }

  var regExpSupportsFlagsWithRegex = supportsDescriptors && valueOrFalseIfThrows(function () {
    return String(new RegExp(/a/g, 'i')) === '/a/i';
  });
  var regExpNeedsToSupportSymbolMatch = hasSymbols && supportsDescriptors && (function () {
    // Edge 0.12 supports flags fully, but does not support Symbol.match
    var regex = /./;
    regex[Symbol.match] = false;
    return RegExp(regex) === regex;
  }());

  var regexToStringIsGeneric = valueOrFalseIfThrows(function () {
    return RegExp.prototype.toString.call({ source: 'abc' }) === '/abc/';
  });
  var regexToStringSupportsGenericFlags = regexToStringIsGeneric && valueOrFalseIfThrows(function () {
    return RegExp.prototype.toString.call({ source: 'a', flags: 'b' }) === '/a/b';
  });
  if (!regexToStringIsGeneric || !regexToStringSupportsGenericFlags) {
    var origRegExpToString = RegExp.prototype.toString;
    defineProperty(RegExp.prototype, 'toString', function toString() {
      var R = ES.RequireObjectCoercible(this);
      if (Type.regex(R)) {
        return _call(origRegExpToString, R);
      }
      var pattern = $String(R.source);
      var flags = $String(R.flags);
      return '/' + pattern + '/' + flags;
    }, true);
    Value.preserveToString(RegExp.prototype.toString, origRegExpToString);
  }

  if (supportsDescriptors && (!regExpSupportsFlagsWithRegex || regExpNeedsToSupportSymbolMatch)) {
    var flagsGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, 'flags').get;
    var sourceDesc = Object.getOwnPropertyDescriptor(RegExp.prototype, 'source') || {};
    var legacySourceGetter = function () {
      // prior to it being a getter, it's own + nonconfigurable
      return this.source;
    };
    var sourceGetter = ES.IsCallable(sourceDesc.get) ? sourceDesc.get : legacySourceGetter;

    var OrigRegExp = RegExp;
    var RegExpShim = (function () {
      return function RegExp(pattern, flags) {
        var patternIsRegExp = ES.IsRegExp(pattern);
        var calledWithNew = this instanceof RegExp;
        if (!calledWithNew && patternIsRegExp && typeof flags === 'undefined' && pattern.constructor === RegExp) {
          return pattern;
        }

        var P = pattern;
        var F = flags;
        if (Type.regex(pattern)) {
          P = ES.Call(sourceGetter, pattern);
          F = typeof flags === 'undefined' ? ES.Call(flagsGetter, pattern) : flags;
          return new RegExp(P, F);
        } else if (patternIsRegExp) {
          P = pattern.source;
          F = typeof flags === 'undefined' ? pattern.flags : flags;
        }
        return new OrigRegExp(pattern, flags);
      };
    }());
    wrapConstructor(OrigRegExp, RegExpShim, {
      $input: true // Chrome < v39 & Opera < 26 have a nonstandard "$input" property
    });
    /* globals RegExp: true */
    /* eslint-disable no-undef, no-global-assign */
    RegExp = RegExpShim;
    Value.redefine(globals, 'RegExp', RegExpShim);
    /* eslint-enable no-undef, no-global-assign */
    /* globals RegExp: false */
  }

  if (supportsDescriptors) {
    var regexGlobals = {
      input: '$_',
      lastMatch: '$&',
      lastParen: '$+',
      leftContext: '$`',
      rightContext: '$\''
    };
    _forEach(keys(regexGlobals), function (prop) {
      if (prop in RegExp && !(regexGlobals[prop] in RegExp)) {
        Value.getter(RegExp, regexGlobals[prop], function get() {
          return RegExp[prop];
        });
      }
    });
  }
  addDefaultSpecies(RegExp);

  var inverseEpsilon = 1 / Number.EPSILON;
  var roundTiesToEven = function roundTiesToEven(n) {
    // Even though this reduces down to `return n`, it takes advantage of built-in rounding.
    return (n + inverseEpsilon) - inverseEpsilon;
  };
  var BINARY_32_EPSILON = Math.pow(2, -23);
  var BINARY_32_MAX_VALUE = Math.pow(2, 127) * (2 - BINARY_32_EPSILON);
  var BINARY_32_MIN_VALUE = Math.pow(2, -126);
  var E = Math.E;
  var LOG2E = Math.LOG2E;
  var LOG10E = Math.LOG10E;
  var numberCLZ = Number.prototype.clz;
  delete Number.prototype.clz; // Safari 8 has Number#clz

  var MathShims = {
    acosh: function acosh(value) {
      var x = Number(value);
      if (numberIsNaN(x) || value < 1) { return NaN; }
      if (x === 1) { return 0; }
      if (x === Infinity) { return x; }

      var xInvSquared = 1 / (x * x);
      if (x < 2) {
        return _log1p(x - 1 + (_sqrt(1 - xInvSquared) * x));
      }
      var halfX = x / 2;
      return _log1p(halfX + (_sqrt(1 - xInvSquared) * halfX) - 1) + (1 / LOG2E);
    },

    asinh: function asinh(value) {
      var x = Number(value);
      if (x === 0 || !globalIsFinite(x)) {
        return x;
      }

      var a = _abs(x);
      var aSquared = a * a;
      var s = _sign(x);
      if (a < 1) {
        return s * _log1p(a + (aSquared / (_sqrt(aSquared + 1) + 1)));
      }
      return s * (_log1p((a / 2) + (_sqrt(1 + (1 / aSquared)) * a / 2) - 1) + (1 / LOG2E));
    },

    atanh: function atanh(value) {
      var x = Number(value);

      if (x === 0) { return x; }
      if (x === -1) { return -Infinity; }
      if (x === 1) { return Infinity; }
      if (numberIsNaN(x) || x < -1 || x > 1) {
        return NaN;
      }

      var a = _abs(x);
      return _sign(x) * _log1p(2 * a / (1 - a)) / 2;
    },

    cbrt: function cbrt(value) {
      var x = Number(value);
      if (x === 0) { return x; }
      var negate = x < 0;
      var result;
      if (negate) { x = -x; }
      if (x === Infinity) {
        result = Infinity;
      } else {
        result = _exp(_log(x) / 3);
        // from http://en.wikipedia.org/wiki/Cube_root#Numerical_methods
        result = ((x / (result * result)) + (2 * result)) / 3;
      }
      return negate ? -result : result;
    },

    clz32: function clz32(value) {
      // See https://bugs.ecmascript.org/show_bug.cgi?id=2465
      var x = Number(value);
      var number = ES.ToUint32(x);
      if (number === 0) {
        return 32;
      }
      return numberCLZ ? ES.Call(numberCLZ, number) : 31 - _floor(_log(number + 0.5) * LOG2E);
    },

    cosh: function cosh(value) {
      var x = Number(value);
      if (x === 0) { return 1; } // +0 or -0
      if (numberIsNaN(x)) { return NaN; }
      if (!globalIsFinite(x)) { return Infinity; }

      var t = _exp(_abs(x) - 1);
      return (t + (1 / (t * E * E))) * (E / 2);
    },

    expm1: function expm1(value) {
      var x = Number(value);
      if (x === -Infinity) { return -1; }
      if (!globalIsFinite(x) || x === 0) { return x; }
      if (_abs(x) > 0.5) {
        return _exp(x) - 1;
      }
      // A more precise approximation using Taylor series expansion
      // from https://github.com/paulmillr/es6-shim/issues/314#issuecomment-70293986
      var t = x;
      var sum = 0;
      var n = 1;
      while (sum + t !== sum) {
        sum += t;
        n += 1;
        t *= x / n;
      }
      return sum;
    },

    hypot: function hypot(x, y) {
      var result = 0;
      var largest = 0;
      for (var i = 0; i < arguments.length; ++i) {
        var value = _abs(Number(arguments[i]));
        if (largest < value) {
          result *= (largest / value) * (largest / value);
          result += 1;
          largest = value;
        } else {
          result += value > 0 ? (value / largest) * (value / largest) : value;
        }
      }
      return largest === Infinity ? Infinity : largest * _sqrt(result);
    },

    log2: function log2(value) {
      return _log(value) * LOG2E;
    },

    log10: function log10(value) {
      return _log(value) * LOG10E;
    },

    log1p: _log1p,

    sign: _sign,

    sinh: function sinh(value) {
      var x = Number(value);
      if (!globalIsFinite(x) || x === 0) { return x; }

      var a = _abs(x);
      if (a < 1) {
        var u = Math.expm1(a);
        return _sign(x) * u * (1 + (1 / (u + 1))) / 2;
      }
      var t = _exp(a - 1);
      return _sign(x) * (t - (1 / (t * E * E))) * (E / 2);
    },

    tanh: function tanh(value) {
      var x = Number(value);
      if (numberIsNaN(x) || x === 0) { return x; }
      // can exit early at +-20 as JS loses precision for true value at this integer
      if (x >= 20) { return 1; }
      if (x <= -20) { return -1; }

      return (Math.expm1(x) - Math.expm1(-x)) / (_exp(x) + _exp(-x));
    },

    trunc: function trunc(value) {
      var x = Number(value);
      return x < 0 ? -_floor(-x) : _floor(x);
    },

    imul: function imul(x, y) {
      // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
      var a = ES.ToUint32(x);
      var b = ES.ToUint32(y);
      var ah = (a >>> 16) & 0xffff;
      var al = a & 0xffff;
      var bh = (b >>> 16) & 0xffff;
      var bl = b & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return (al * bl) + ((((ah * bl) + (al * bh)) << 16) >>> 0) | 0;
    },

    fround: function fround(x) {
      var v = Number(x);
      if (v === 0 || v === Infinity || v === -Infinity || numberIsNaN(v)) {
        return v;
      }
      var sign = _sign(v);
      var abs = _abs(v);
      if (abs < BINARY_32_MIN_VALUE) {
        return sign * roundTiesToEven(abs / BINARY_32_MIN_VALUE / BINARY_32_EPSILON) * BINARY_32_MIN_VALUE * BINARY_32_EPSILON;
      }
      // Veltkamp's splitting (?)
      var a = (1 + (BINARY_32_EPSILON / Number.EPSILON)) * abs;
      var result = a - (a - abs);
      if (result > BINARY_32_MAX_VALUE || numberIsNaN(result)) {
        return sign * Infinity;
      }
      return sign * result;
    }
  };

  var withinULPDistance = function withinULPDistance(result, expected, distance) {
    return _abs(1 - (result / expected)) / Number.EPSILON < (distance || 8);
  };

  defineProperties(Math, MathShims);
  // Chrome < 40 sinh returns ∞ for large numbers
  defineProperty(Math, 'sinh', MathShims.sinh, Math.sinh(710) === Infinity);
  // Chrome < 40 cosh returns ∞ for large numbers
  defineProperty(Math, 'cosh', MathShims.cosh, Math.cosh(710) === Infinity);
  // IE 11 TP has an imprecise log1p: reports Math.log1p(-1e-17) as 0
  defineProperty(Math, 'log1p', MathShims.log1p, Math.log1p(-1e-17) !== -1e-17);
  // IE 11 TP has an imprecise asinh: reports Math.asinh(-1e7) as not exactly equal to -Math.asinh(1e7)
  defineProperty(Math, 'asinh', MathShims.asinh, Math.asinh(-1e7) !== -Math.asinh(1e7));
  // Chrome < 54 asinh returns ∞ for large numbers and should not
  defineProperty(Math, 'asinh', MathShims.asinh, Math.asinh(1e+300) === Infinity);
  // Chrome < 54 atanh incorrectly returns 0 for large numbers
  defineProperty(Math, 'atanh', MathShims.atanh, Math.atanh(1e-300) === 0);
  // Chrome 40 has an imprecise Math.tanh with very small numbers
  defineProperty(Math, 'tanh', MathShims.tanh, Math.tanh(-2e-17) !== -2e-17);
  // Chrome 40 loses Math.acosh precision with high numbers
  defineProperty(Math, 'acosh', MathShims.acosh, Math.acosh(Number.MAX_VALUE) === Infinity);
  // Chrome < 54 has an inaccurate acosh for EPSILON deltas
  defineProperty(Math, 'acosh', MathShims.acosh, !withinULPDistance(Math.acosh(1 + Number.EPSILON), Math.sqrt(2 * Number.EPSILON)));
  // Firefox 38 on Windows
  defineProperty(Math, 'cbrt', MathShims.cbrt, !withinULPDistance(Math.cbrt(1e-300), 1e-100));
  // node 0.11 has an imprecise Math.sinh with very small numbers
  defineProperty(Math, 'sinh', MathShims.sinh, Math.sinh(-2e-17) !== -2e-17);
  // FF 35 on Linux reports 22025.465794806725 for Math.expm1(10)
  var expm1OfTen = Math.expm1(10);
  defineProperty(Math, 'expm1', MathShims.expm1, expm1OfTen > 22025.465794806719 || expm1OfTen < 22025.4657948067165168);

  var origMathRound = Math.round;
  // breaks in e.g. Safari 8, Internet Explorer 11, Opera 12
  var roundHandlesBoundaryConditions = Math.round(0.5 - (Number.EPSILON / 4)) === 0 &&
    Math.round(-0.5 + (Number.EPSILON / 3.99)) === 1;

  // When engines use Math.floor(x + 0.5) internally, Math.round can be buggy for large integers.
  // This behavior should be governed by "round to nearest, ties to even mode"
  // see http://www.ecma-international.org/ecma-262/6.0/#sec-terms-and-definitions-number-type
  // These are the boundary cases where it breaks.
  var smallestPositiveNumberWhereRoundBreaks = inverseEpsilon + 1;
  var largestPositiveNumberWhereRoundBreaks = (2 * inverseEpsilon) - 1;
  var roundDoesNotIncreaseIntegers = [
    smallestPositiveNumberWhereRoundBreaks,
    largestPositiveNumberWhereRoundBreaks
  ].every(function (num) {
    return Math.round(num) === num;
  });
  defineProperty(Math, 'round', function round(x) {
    var floor = _floor(x);
    var ceil = floor === -1 ? -0 : floor + 1;
    return x - floor < 0.5 ? floor : ceil;
  }, !roundHandlesBoundaryConditions || !roundDoesNotIncreaseIntegers);
  Value.preserveToString(Math.round, origMathRound);

  var origImul = Math.imul;
  if (Math.imul(0xffffffff, 5) !== -5) {
    // Safari 6.1, at least, reports "0" for this value
    Math.imul = MathShims.imul;
    Value.preserveToString(Math.imul, origImul);
  }
  if (Math.imul.length !== 2) {
    // Safari 8.0.4 has a length of 1
    // fixed in https://bugs.webkit.org/show_bug.cgi?id=143658
    overrideNative(Math, 'imul', function imul(x, y) {
      return ES.Call(origImul, Math, arguments);
    });
  }

  // Promises
  // Simplest possible implementation; use a 3rd-party library if you
  // want the best possible speed and/or long stack traces.
  var PromiseShim = (function () {
    var setTimeout = globals.setTimeout;
    // some environments don't have setTimeout - no way to shim here.
    if (typeof setTimeout !== 'function' && typeof setTimeout !== 'object') { return; }

    ES.IsPromise = function (promise) {
      if (!ES.TypeIsObject(promise)) {
        return false;
      }
      if (typeof promise._promise === 'undefined') {
        return false; // uninitialized, or missing our hidden field.
      }
      return true;
    };

    // "PromiseCapability" in the spec is what most promise implementations
    // call a "deferred".
    var PromiseCapability = function (C) {
      if (!ES.IsConstructor(C)) {
        throw new TypeError('Bad promise constructor');
      }
      var capability = this;
      var resolver = function (resolve, reject) {
        if (capability.resolve !== void 0 || capability.reject !== void 0) {
          throw new TypeError('Bad Promise implementation!');
        }
        capability.resolve = resolve;
        capability.reject = reject;
      };
      // Initialize fields to inform optimizers about the object shape.
      capability.resolve = void 0;
      capability.reject = void 0;
      capability.promise = new C(resolver);
      if (!(ES.IsCallable(capability.resolve) && ES.IsCallable(capability.reject))) {
        throw new TypeError('Bad promise constructor');
      }
    };

    // find an appropriate setImmediate-alike
    var makeZeroTimeout;
    /*global window */
    if (typeof window !== 'undefined' && ES.IsCallable(window.postMessage)) {
      makeZeroTimeout = function () {
        // from http://dbaron.org/log/20100309-faster-timeouts
        var timeouts = [];
        var messageName = 'zero-timeout-message';
        var setZeroTimeout = function (fn) {
          _push(timeouts, fn);
          window.postMessage(messageName, '*');
        };
        var handleMessage = function (event) {
          if (event.source === window && event.data === messageName) {
            event.stopPropagation();
            if (timeouts.length === 0) { return; }
            var fn = _shift(timeouts);
            fn();
          }
        };
        window.addEventListener('message', handleMessage, true);
        return setZeroTimeout;
      };
    }
    var makePromiseAsap = function () {
      // An efficient task-scheduler based on a pre-existing Promise
      // implementation, which we can use even if we override the
      // global Promise below (in order to workaround bugs)
      // https://github.com/Raynos/observ-hash/issues/2#issuecomment-35857671
      var P = globals.Promise;
      var pr = P && P.resolve && P.resolve();
      return pr && function (task) {
        return pr.then(task);
      };
    };
    /*global process */
    var enqueue = ES.IsCallable(globals.setImmediate) ?
      globals.setImmediate :
      typeof process === 'object' && process.nextTick ? process.nextTick : makePromiseAsap() ||
      (ES.IsCallable(makeZeroTimeout) ? makeZeroTimeout() : function (task) { setTimeout(task, 0); }); // fallback

    // Constants for Promise implementation
    var PROMISE_IDENTITY = function (x) { return x; };
    var PROMISE_THROWER = function (e) { throw e; };
    var PROMISE_PENDING = 0;
    var PROMISE_FULFILLED = 1;
    var PROMISE_REJECTED = 2;
    // We store fulfill/reject handlers and capabilities in a single array.
    var PROMISE_FULFILL_OFFSET = 0;
    var PROMISE_REJECT_OFFSET = 1;
    var PROMISE_CAPABILITY_OFFSET = 2;
    // This is used in an optimization for chaining promises via then.
    var PROMISE_FAKE_CAPABILITY = {};

    var enqueuePromiseReactionJob = function (handler, capability, argument) {
      enqueue(function () {
        promiseReactionJob(handler, capability, argument);
      });
    };

    var promiseReactionJob = function (handler, promiseCapability, argument) {
      var handlerResult, f;
      if (promiseCapability === PROMISE_FAKE_CAPABILITY) {
        // Fast case, when we don't actually need to chain through to a
        // (real) promiseCapability.
        return handler(argument);
      }
      try {
        handlerResult = handler(argument);
        f = promiseCapability.resolve;
      } catch (e) {
        handlerResult = e;
        f = promiseCapability.reject;
      }
      f(handlerResult);
    };

    var fulfillPromise = function (promise, value) {
      var _promise = promise._promise;
      var length = _promise.reactionLength;
      if (length > 0) {
        enqueuePromiseReactionJob(
          _promise.fulfillReactionHandler0,
          _promise.reactionCapability0,
          value
        );
        _promise.fulfillReactionHandler0 = void 0;
        _promise.rejectReactions0 = void 0;
        _promise.reactionCapability0 = void 0;
        if (length > 1) {
          for (var i = 1, idx = 0; i < length; i++, idx += 3) {
            enqueuePromiseReactionJob(
              _promise[idx + PROMISE_FULFILL_OFFSET],
              _promise[idx + PROMISE_CAPABILITY_OFFSET],
              value
            );
            promise[idx + PROMISE_FULFILL_OFFSET] = void 0;
            promise[idx + PROMISE_REJECT_OFFSET] = void 0;
            promise[idx + PROMISE_CAPABILITY_OFFSET] = void 0;
          }
        }
      }
      _promise.result = value;
      _promise.state = PROMISE_FULFILLED;
      _promise.reactionLength = 0;
    };

    var rejectPromise = function (promise, reason) {
      var _promise = promise._promise;
      var length = _promise.reactionLength;
      if (length > 0) {
        enqueuePromiseReactionJob(
          _promise.rejectReactionHandler0,
          _promise.reactionCapability0,
          reason
        );
        _promise.fulfillReactionHandler0 = void 0;
        _promise.rejectReactions0 = void 0;
        _promise.reactionCapability0 = void 0;
        if (length > 1) {
          for (var i = 1, idx = 0; i < length; i++, idx += 3) {
            enqueuePromiseReactionJob(
              _promise[idx + PROMISE_REJECT_OFFSET],
              _promise[idx + PROMISE_CAPABILITY_OFFSET],
              reason
            );
            promise[idx + PROMISE_FULFILL_OFFSET] = void 0;
            promise[idx + PROMISE_REJECT_OFFSET] = void 0;
            promise[idx + PROMISE_CAPABILITY_OFFSET] = void 0;
          }
        }
      }
      _promise.result = reason;
      _promise.state = PROMISE_REJECTED;
      _promise.reactionLength = 0;
    };

    var createResolvingFunctions = function (promise) {
      var alreadyResolved = false;
      var resolve = function (resolution) {
        var then;
        if (alreadyResolved) { return; }
        alreadyResolved = true;
        if (resolution === promise) {
          return rejectPromise(promise, new TypeError('Self resolution'));
        }
        if (!ES.TypeIsObject(resolution)) {
          return fulfillPromise(promise, resolution);
        }
        try {
          then = resolution.then;
        } catch (e) {
          return rejectPromise(promise, e);
        }
        if (!ES.IsCallable(then)) {
          return fulfillPromise(promise, resolution);
        }
        enqueue(function () {
          promiseResolveThenableJob(promise, resolution, then);
        });
      };
      var reject = function (reason) {
        if (alreadyResolved) { return; }
        alreadyResolved = true;
        return rejectPromise(promise, reason);
      };
      return { resolve: resolve, reject: reject };
    };

    var optimizedThen = function (then, thenable, resolve, reject) {
      // Optimization: since we discard the result, we can pass our
      // own then implementation a special hint to let it know it
      // doesn't have to create it.  (The PROMISE_FAKE_CAPABILITY
      // object is local to this implementation and unforgeable outside.)
      if (then === Promise$prototype$then) {
        _call(then, thenable, resolve, reject, PROMISE_FAKE_CAPABILITY);
      } else {
        _call(then, thenable, resolve, reject);
      }
    };
    var promiseResolveThenableJob = function (promise, thenable, then) {
      var resolvingFunctions = createResolvingFunctions(promise);
      var resolve = resolvingFunctions.resolve;
      var reject = resolvingFunctions.reject;
      try {
        optimizedThen(then, thenable, resolve, reject);
      } catch (e) {
        reject(e);
      }
    };

    var Promise$prototype, Promise$prototype$then;
    var Promise = (function () {
      var PromiseShim = function Promise(resolver) {
        if (!(this instanceof PromiseShim)) {
          throw new TypeError('Constructor Promise requires "new"');
        }
        if (this && this._promise) {
          throw new TypeError('Bad construction');
        }
        // see https://bugs.ecmascript.org/show_bug.cgi?id=2482
        if (!ES.IsCallable(resolver)) {
          throw new TypeError('not a valid resolver');
        }
        var promise = emulateES6construct(this, PromiseShim, Promise$prototype, {
          _promise: {
            result: void 0,
            state: PROMISE_PENDING,
            // The first member of the "reactions" array is inlined here,
            // since most promises only have one reaction.
            // We've also exploded the 'reaction' object to inline the
            // "handler" and "capability" fields, since both fulfill and
            // reject reactions share the same capability.
            reactionLength: 0,
            fulfillReactionHandler0: void 0,
            rejectReactionHandler0: void 0,
            reactionCapability0: void 0
          }
        });
        var resolvingFunctions = createResolvingFunctions(promise);
        var reject = resolvingFunctions.reject;
        try {
          resolver(resolvingFunctions.resolve, reject);
        } catch (e) {
          reject(e);
        }
        return promise;
      };
      return PromiseShim;
    }());
    Promise$prototype = Promise.prototype;

    var _promiseAllResolver = function (index, values, capability, remaining) {
      var alreadyCalled = false;
      return function (x) {
        if (alreadyCalled) { return; }
        alreadyCalled = true;
        values[index] = x;
        if ((--remaining.count) === 0) {
          var resolve = capability.resolve;
          resolve(values); // call w/ this===undefined
        }
      };
    };

    var performPromiseAll = function (iteratorRecord, C, resultCapability) {
      var it = iteratorRecord.iterator;
      var values = [];
      var remaining = { count: 1 };
      var next, nextValue;
      var index = 0;
      while (true) {
        try {
          next = ES.IteratorStep(it);
          if (next === false) {
            iteratorRecord.done = true;
            break;
          }
          nextValue = next.value;
        } catch (e) {
          iteratorRecord.done = true;
          throw e;
        }
        values[index] = void 0;
        var nextPromise = C.resolve(nextValue);
        var resolveElement = _promiseAllResolver(
          index,
          values,
          resultCapability,
          remaining
        );
        remaining.count += 1;
        optimizedThen(nextPromise.then, nextPromise, resolveElement, resultCapability.reject);
        index += 1;
      }
      if ((--remaining.count) === 0) {
        var resolve = resultCapability.resolve;
        resolve(values); // call w/ this===undefined
      }
      return resultCapability.promise;
    };

    var performPromiseRace = function (iteratorRecord, C, resultCapability) {
      var it = iteratorRecord.iterator;
      var next, nextValue, nextPromise;
      while (true) {
        try {
          next = ES.IteratorStep(it);
          if (next === false) {
            // NOTE: If iterable has no items, resulting promise will never
            // resolve; see:
            // https://github.com/domenic/promises-unwrapping/issues/75
            // https://bugs.ecmascript.org/show_bug.cgi?id=2515
            iteratorRecord.done = true;
            break;
          }
          nextValue = next.value;
        } catch (e) {
          iteratorRecord.done = true;
          throw e;
        }
        nextPromise = C.resolve(nextValue);
        optimizedThen(nextPromise.then, nextPromise, resultCapability.resolve, resultCapability.reject);
      }
      return resultCapability.promise;
    };

    defineProperties(Promise, {
      all: function all(iterable) {
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Promise is not object');
        }
        var capability = new PromiseCapability(C);
        var iterator, iteratorRecord;
        try {
          iterator = ES.GetIterator(iterable);
          iteratorRecord = { iterator: iterator, done: false };
          return performPromiseAll(iteratorRecord, C, capability);
        } catch (e) {
          var exception = e;
          if (iteratorRecord && !iteratorRecord.done) {
            try {
              ES.IteratorClose(iterator, true);
            } catch (ee) {
              exception = ee;
            }
          }
          var reject = capability.reject;
          reject(exception);
          return capability.promise;
        }
      },

      race: function race(iterable) {
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Promise is not object');
        }
        var capability = new PromiseCapability(C);
        var iterator, iteratorRecord;
        try {
          iterator = ES.GetIterator(iterable);
          iteratorRecord = { iterator: iterator, done: false };
          return performPromiseRace(iteratorRecord, C, capability);
        } catch (e) {
          var exception = e;
          if (iteratorRecord && !iteratorRecord.done) {
            try {
              ES.IteratorClose(iterator, true);
            } catch (ee) {
              exception = ee;
            }
          }
          var reject = capability.reject;
          reject(exception);
          return capability.promise;
        }
      },

      reject: function reject(reason) {
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Bad promise constructor');
        }
        var capability = new PromiseCapability(C);
        var rejectFunc = capability.reject;
        rejectFunc(reason); // call with this===undefined
        return capability.promise;
      },

      resolve: function resolve(v) {
        // See https://esdiscuss.org/topic/fixing-promise-resolve for spec
        var C = this;
        if (!ES.TypeIsObject(C)) {
          throw new TypeError('Bad promise constructor');
        }
        if (ES.IsPromise(v)) {
          var constructor = v.constructor;
          if (constructor === C) {
            return v;
          }
        }
        var capability = new PromiseCapability(C);
        var resolveFunc = capability.resolve;
        resolveFunc(v); // call with this===undefined
        return capability.promise;
      }
    });

    defineProperties(Promise$prototype, {
      'catch': function (onRejected) {
        return this.then(null, onRejected);
      },

      then: function then(onFulfilled, onRejected) {
        var promise = this;
        if (!ES.IsPromise(promise)) { throw new TypeError('not a promise'); }
        var C = ES.SpeciesConstructor(promise, Promise);
        var resultCapability;
        var returnValueIsIgnored = arguments.length > 2 && arguments[2] === PROMISE_FAKE_CAPABILITY;
        if (returnValueIsIgnored && C === Promise) {
          resultCapability = PROMISE_FAKE_CAPABILITY;
        } else {
          resultCapability = new PromiseCapability(C);
        }
        // PerformPromiseThen(promise, onFulfilled, onRejected, resultCapability)
        // Note that we've split the 'reaction' object into its two
        // components, "capabilities" and "handler"
        // "capabilities" is always equal to `resultCapability`
        var fulfillReactionHandler = ES.IsCallable(onFulfilled) ? onFulfilled : PROMISE_IDENTITY;
        var rejectReactionHandler = ES.IsCallable(onRejected) ? onRejected : PROMISE_THROWER;
        var _promise = promise._promise;
        var value;
        if (_promise.state === PROMISE_PENDING) {
          if (_promise.reactionLength === 0) {
            _promise.fulfillReactionHandler0 = fulfillReactionHandler;
            _promise.rejectReactionHandler0 = rejectReactionHandler;
            _promise.reactionCapability0 = resultCapability;
          } else {
            var idx = 3 * (_promise.reactionLength - 1);
            _promise[idx + PROMISE_FULFILL_OFFSET] = fulfillReactionHandler;
            _promise[idx + PROMISE_REJECT_OFFSET] = rejectReactionHandler;
            _promise[idx + PROMISE_CAPABILITY_OFFSET] = resultCapability;
          }
          _promise.reactionLength += 1;
        } else if (_promise.state === PROMISE_FULFILLED) {
          value = _promise.result;
          enqueuePromiseReactionJob(
            fulfillReactionHandler,
            resultCapability,
            value
          );
        } else if (_promise.state === PROMISE_REJECTED) {
          value = _promise.result;
          enqueuePromiseReactionJob(
            rejectReactionHandler,
            resultCapability,
            value
          );
        } else {
          throw new TypeError('unexpected Promise state');
        }
        return resultCapability.promise;
      }
    });
    // This helps the optimizer by ensuring that methods which take
    // capabilities aren't polymorphic.
    PROMISE_FAKE_CAPABILITY = new PromiseCapability(Promise);
    Promise$prototype$then = Promise$prototype.then;

    return Promise;
  }());

  // Chrome's native Promise has extra methods that it shouldn't have. Let's remove them.
  if (globals.Promise) {
    delete globals.Promise.accept;
    delete globals.Promise.defer;
    delete globals.Promise.prototype.chain;
  }

  if (typeof PromiseShim === 'function') {
    // export the Promise constructor.
    defineProperties(globals, { Promise: PromiseShim });
    // In Chrome 33 (and thereabouts) Promise is defined, but the
    // implementation is buggy in a number of ways.  Let's check subclassing
    // support to see if we have a buggy implementation.
    var promiseSupportsSubclassing = supportsSubclassing(globals.Promise, function (S) {
      return S.resolve(42).then(function () {}) instanceof S;
    });
    var promiseIgnoresNonFunctionThenCallbacks = !throwsError(function () {
      return globals.Promise.reject(42).then(null, 5).then(null, noop);
    });
    var promiseRequiresObjectContext = throwsError(function () { return globals.Promise.call(3, noop); });
    // Promise.resolve() was errata'ed late in the ES6 process.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1170742
    //      https://code.google.com/p/v8/issues/detail?id=4161
    // It serves as a proxy for a number of other bugs in early Promise
    // implementations.
    var promiseResolveBroken = (function (Promise) {
      var p = Promise.resolve(5);
      p.constructor = {};
      var p2 = Promise.resolve(p);
      try {
        p2.then(null, noop).then(null, noop); // avoid "uncaught rejection" warnings in console
      } catch (e) {
        return true; // v8 native Promises break here https://code.google.com/p/chromium/issues/detail?id=575314
      }
      return p === p2; // This *should* be false!
    }(globals.Promise));

    // Chrome 46 (probably older too) does not retrieve a thenable's .then synchronously
    var getsThenSynchronously = supportsDescriptors && (function () {
      var count = 0;
      // eslint-disable-next-line getter-return
      var thenable = Object.defineProperty({}, 'then', { get: function () { count += 1; } });
      Promise.resolve(thenable);
      return count === 1;
    }());

    var BadResolverPromise = function BadResolverPromise(executor) {
      var p = new Promise(executor);
      executor(3, function () {});
      this.then = p.then;
      this.constructor = BadResolverPromise;
    };
    BadResolverPromise.prototype = Promise.prototype;
    BadResolverPromise.all = Promise.all;
    // Chrome Canary 49 (probably older too) has some implementation bugs
    var hasBadResolverPromise = valueOrFalseIfThrows(function () {
      return !!BadResolverPromise.all([1, 2]);
    });

    if (!promiseSupportsSubclassing || !promiseIgnoresNonFunctionThenCallbacks ||
        !promiseRequiresObjectContext || promiseResolveBroken ||
        !getsThenSynchronously || hasBadResolverPromise) {
      /* globals Promise: true */
      /* eslint-disable no-undef, no-global-assign */
      Promise = PromiseShim;
      /* eslint-enable no-undef, no-global-assign */
      /* globals Promise: false */
      overrideNative(globals, 'Promise', PromiseShim);
    }
    if (Promise.all.length !== 1) {
      var origAll = Promise.all;
      overrideNative(Promise, 'all', function all(iterable) {
        return ES.Call(origAll, this, arguments);
      });
    }
    if (Promise.race.length !== 1) {
      var origRace = Promise.race;
      overrideNative(Promise, 'race', function race(iterable) {
        return ES.Call(origRace, this, arguments);
      });
    }
    if (Promise.resolve.length !== 1) {
      var origResolve = Promise.resolve;
      overrideNative(Promise, 'resolve', function resolve(x) {
        return ES.Call(origResolve, this, arguments);
      });
    }
    if (Promise.reject.length !== 1) {
      var origReject = Promise.reject;
      overrideNative(Promise, 'reject', function reject(r) {
        return ES.Call(origReject, this, arguments);
      });
    }
    ensureEnumerable(Promise, 'all');
    ensureEnumerable(Promise, 'race');
    ensureEnumerable(Promise, 'resolve');
    ensureEnumerable(Promise, 'reject');
    addDefaultSpecies(Promise);
  }

  // Map and Set require a true ES5 environment
  // Their fast path also requires that the environment preserve
  // property insertion order, which is not guaranteed by the spec.
  var testOrder = function (a) {
    var b = keys(_reduce(a, function (o, k) {
      o[k] = true;
      return o;
    }, {}));
    return a.join(':') === b.join(':');
  };
  var preservesInsertionOrder = testOrder(['z', 'a', 'bb']);
  // some engines (eg, Chrome) only preserve insertion order for string keys
  var preservesNumericInsertionOrder = testOrder(['z', 1, 'a', '3', 2]);

  if (supportsDescriptors) {

    var fastkey = function fastkey(key, skipInsertionOrderCheck) {
      if (!skipInsertionOrderCheck && !preservesInsertionOrder) {
        return null;
      }
      if (isNullOrUndefined(key)) {
        return '^' + ES.ToString(key);
      } else if (typeof key === 'string') {
        return '$' + key;
      } else if (typeof key === 'number') {
        // note that -0 will get coerced to "0" when used as a property key
        if (!preservesNumericInsertionOrder) {
          return 'n' + key;
        }
        return key;
      } else if (typeof key === 'boolean') {
        return 'b' + key;
      }
      return null;
    };

    var emptyObject = function emptyObject() {
      // accomodate some older not-quite-ES5 browsers
      return Object.create ? Object.create(null) : {};
    };

    var addIterableToMap = function addIterableToMap(MapConstructor, map, iterable) {
      if (isArray(iterable) || Type.string(iterable)) {
        _forEach(iterable, function (entry) {
          if (!ES.TypeIsObject(entry)) {
            throw new TypeError('Iterator value ' + entry + ' is not an entry object');
          }
          map.set(entry[0], entry[1]);
        });
      } else if (iterable instanceof MapConstructor) {
        _call(MapConstructor.prototype.forEach, iterable, function (value, key) {
          map.set(key, value);
        });
      } else {
        var iter, adder;
        if (!isNullOrUndefined(iterable)) {
          adder = map.set;
          if (!ES.IsCallable(adder)) { throw new TypeError('bad map'); }
          iter = ES.GetIterator(iterable);
        }
        if (typeof iter !== 'undefined') {
          while (true) {
            var next = ES.IteratorStep(iter);
            if (next === false) { break; }
            var nextItem = next.value;
            try {
              if (!ES.TypeIsObject(nextItem)) {
                throw new TypeError('Iterator value ' + nextItem + ' is not an entry object');
              }
              _call(adder, map, nextItem[0], nextItem[1]);
            } catch (e) {
              ES.IteratorClose(iter, true);
              throw e;
            }
          }
        }
      }
    };
    var addIterableToSet = function addIterableToSet(SetConstructor, set, iterable) {
      if (isArray(iterable) || Type.string(iterable)) {
        _forEach(iterable, function (value) {
          set.add(value);
        });
      } else if (iterable instanceof SetConstructor) {
        _call(SetConstructor.prototype.forEach, iterable, function (value) {
          set.add(value);
        });
      } else {
        var iter, adder;
        if (!isNullOrUndefined(iterable)) {
          adder = set.add;
          if (!ES.IsCallable(adder)) { throw new TypeError('bad set'); }
          iter = ES.GetIterator(iterable);
        }
        if (typeof iter !== 'undefined') {
          while (true) {
            var next = ES.IteratorStep(iter);
            if (next === false) { break; }
            var nextValue = next.value;
            try {
              _call(adder, set, nextValue);
            } catch (e) {
              ES.IteratorClose(iter, true);
              throw e;
            }
          }
        }
      }
    };

    var collectionShims = {
      Map: (function () {

        var empty = {};

        var MapEntry = function MapEntry(key, value) {
          this.key = key;
          this.value = value;
          this.next = null;
          this.prev = null;
        };

        MapEntry.prototype.isRemoved = function isRemoved() {
          return this.key === empty;
        };

        var isMap = function isMap(map) {
          return !!map._es6map;
        };

        var requireMapSlot = function requireMapSlot(map, method) {
          if (!ES.TypeIsObject(map) || !isMap(map)) {
            throw new TypeError('Method Map.prototype.' + method + ' called on incompatible receiver ' + ES.ToString(map));
          }
        };

        var MapIterator = function MapIterator(map, kind) {
          requireMapSlot(map, '[[MapIterator]]');
          this.head = map._head;
          this.i = this.head;
          this.kind = kind;
        };

        MapIterator.prototype = {
          isMapIterator: true,
          next: function next() {
            if (!this.isMapIterator) {
              throw new TypeError('Not a MapIterator');
            }
            var i = this.i;
            var kind = this.kind;
            var head = this.head;
            if (typeof this.i === 'undefined') {
              return iteratorResult();
            }
            while (i.isRemoved() && i !== head) {
              // back up off of removed entries
              i = i.prev;
            }
            // advance to next unreturned element.
            var result;
            while (i.next !== head) {
              i = i.next;
              if (!i.isRemoved()) {
                if (kind === 'key') {
                  result = i.key;
                } else if (kind === 'value') {
                  result = i.value;
                } else {
                  result = [i.key, i.value];
                }
                this.i = i;
                return iteratorResult(result);
              }
            }
            // once the iterator is done, it is done forever.
            this.i = void 0;
            return iteratorResult();
          }
        };
        addIterator(MapIterator.prototype);

        var Map$prototype;
        var MapShim = function Map() {
          if (!(this instanceof Map)) {
            throw new TypeError('Constructor Map requires "new"');
          }
          if (this && this._es6map) {
            throw new TypeError('Bad construction');
          }
          var map = emulateES6construct(this, Map, Map$prototype, {
            _es6map: true,
            _head: null,
            _map: OrigMap ? new OrigMap() : null,
            _size: 0,
            _storage: emptyObject()
          });

          var head = new MapEntry(null, null);
          // circular doubly-linked list.
          /* eslint no-multi-assign: 1 */
          head.next = head.prev = head;
          map._head = head;

          // Optionally initialize map from iterable
          if (arguments.length > 0) {
            addIterableToMap(Map, map, arguments[0]);
          }
          return map;
        };
        Map$prototype = MapShim.prototype;

        Value.getter(Map$prototype, 'size', function () {
          if (typeof this._size === 'undefined') {
            throw new TypeError('size method called on incompatible Map');
          }
          return this._size;
        });

        defineProperties(Map$prototype, {
          get: function get(key) {
            requireMapSlot(this, 'get');
            var entry;
            var fkey = fastkey(key, true);
            if (fkey !== null) {
              // fast O(1) path
              entry = this._storage[fkey];
              if (entry) {
                return entry.value;
              } else {
                return;
              }
            }
            if (this._map) {
              // fast object key path
              entry = origMapGet.call(this._map, key);
              if (entry) {
                return entry.value;
              } else {
                return;
              }
            }
            var head = this._head;
            var i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return i.value;
              }
            }
          },

          has: function has(key) {
            requireMapSlot(this, 'has');
            var fkey = fastkey(key, true);
            if (fkey !== null) {
              // fast O(1) path
              return typeof this._storage[fkey] !== 'undefined';
            }
            if (this._map) {
              // fast object key path
              return origMapHas.call(this._map, key);
            }
            var head = this._head;
            var i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return true;
              }
            }
            return false;
          },

          set: function set(key, value) {
            requireMapSlot(this, 'set');
            var head = this._head;
            var i = head;
            var entry;
            var fkey = fastkey(key, true);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] !== 'undefined') {
                this._storage[fkey].value = value;
                return this;
              } else {
                entry = this._storage[fkey] = new MapEntry(key, value); /* eslint no-multi-assign: 1 */
                i = head.prev;
                // fall through
              }
            } else if (this._map) {
              // fast object key path
              if (origMapHas.call(this._map, key)) {
                origMapGet.call(this._map, key).value = value;
              } else {
                entry = new MapEntry(key, value);
                origMapSet.call(this._map, key, entry);
                i = head.prev;
                // fall through
              }
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.value = value;
                return this;
              }
            }
            entry = entry || new MapEntry(key, value);
            if (ES.SameValue(-0, key)) {
              entry.key = +0; // coerce -0 to +0 in entry
            }
            entry.next = this._head;
            entry.prev = this._head.prev;
            entry.prev.next = entry;
            entry.next.prev = entry;
            this._size += 1;
            return this;
          },

          'delete': function (key) {
            requireMapSlot(this, 'delete');
            var head = this._head;
            var i = head;
            var fkey = fastkey(key, true);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] === 'undefined') {
                return false;
              }
              i = this._storage[fkey].prev;
              delete this._storage[fkey];
              // fall through
            } else if (this._map) {
              // fast object key path
              if (!origMapHas.call(this._map, key)) {
                return false;
              }
              i = origMapGet.call(this._map, key).prev;
              origMapDelete.call(this._map, key);
              // fall through
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.key = empty;
                i.value = empty;
                i.prev.next = i.next;
                i.next.prev = i.prev;
                this._size -= 1;
                return true;
              }
            }
            return false;
          },

          clear: function clear() {
            /* eslint no-multi-assign: 1 */
            requireMapSlot(this, 'clear');
            this._map = OrigMap ? new OrigMap() : null;
            this._size = 0;
            this._storage = emptyObject();
            var head = this._head;
            var i = head;
            var p = i.next;
            while ((i = p) !== head) {
              i.key = empty;
              i.value = empty;
              p = i.next;
              i.next = i.prev = head;
            }
            head.next = head.prev = head;
          },

          keys: function keys() {
            requireMapSlot(this, 'keys');
            return new MapIterator(this, 'key');
          },

          values: function values() {
            requireMapSlot(this, 'values');
            return new MapIterator(this, 'value');
          },

          entries: function entries() {
            requireMapSlot(this, 'entries');
            return new MapIterator(this, 'key+value');
          },

          forEach: function forEach(callback) {
            requireMapSlot(this, 'forEach');
            var context = arguments.length > 1 ? arguments[1] : null;
            var it = this.entries();
            for (var entry = it.next(); !entry.done; entry = it.next()) {
              if (context) {
                _call(callback, context, entry.value[1], entry.value[0], this);
              } else {
                callback(entry.value[1], entry.value[0], this);
              }
            }
          }
        });
        addIterator(Map$prototype, Map$prototype.entries);

        return MapShim;
      }()),

      Set: (function () {
        var isSet = function isSet(set) {
          return set._es6set && typeof set._storage !== 'undefined';
        };
        var requireSetSlot = function requireSetSlot(set, method) {
          if (!ES.TypeIsObject(set) || !isSet(set)) {
            // https://github.com/paulmillr/es6-shim/issues/176
            throw new TypeError('Set.prototype.' + method + ' called on incompatible receiver ' + ES.ToString(set));
          }
        };

        // Creating a Map is expensive.  To speed up the common case of
        // Sets containing only string or numeric keys, we use an object
        // as backing storage and lazily create a full Map only when
        // required.
        var Set$prototype;
        var SetShim = function Set() {
          if (!(this instanceof Set)) {
            throw new TypeError('Constructor Set requires "new"');
          }
          if (this && this._es6set) {
            throw new TypeError('Bad construction');
          }
          var set = emulateES6construct(this, Set, Set$prototype, {
            _es6set: true,
            '[[SetData]]': null,
            _storage: emptyObject()
          });
          if (!set._es6set) {
            throw new TypeError('bad set');
          }

          // Optionally initialize Set from iterable
          if (arguments.length > 0) {
            addIterableToSet(Set, set, arguments[0]);
          }
          return set;
        };
        Set$prototype = SetShim.prototype;

        var decodeKey = function (key) {
          var k = key;
          if (k === '^null') {
            return null;
          } else if (k === '^undefined') {
            return void 0;
          } else {
            var first = k.charAt(0);
            if (first === '$') {
              return _strSlice(k, 1);
            } else if (first === 'n') {
              return +_strSlice(k, 1);
            } else if (first === 'b') {
              return k === 'btrue';
            }
          }
          return +k;
        };
        // Switch from the object backing storage to a full Map.
        var ensureMap = function ensureMap(set) {
          if (!set['[[SetData]]']) {
            var m = new collectionShims.Map();
            set['[[SetData]]'] = m;
            _forEach(keys(set._storage), function (key) {
              var k = decodeKey(key);
              m.set(k, k);
            });
            set['[[SetData]]'] = m;
          }
          set._storage = null; // free old backing storage
        };

        Value.getter(SetShim.prototype, 'size', function () {
          requireSetSlot(this, 'size');
          if (this._storage) {
            return keys(this._storage).length;
          }
          ensureMap(this);
          return this['[[SetData]]'].size;
        });

        defineProperties(SetShim.prototype, {
          has: function has(key) {
            requireSetSlot(this, 'has');
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              return !!this._storage[fkey];
            }
            ensureMap(this);
            return this['[[SetData]]'].has(key);
          },

          add: function add(key) {
            requireSetSlot(this, 'add');
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              this._storage[fkey] = true;
              return this;
            }
            ensureMap(this);
            this['[[SetData]]'].set(key, key);
            return this;
          },

          'delete': function (key) {
            requireSetSlot(this, 'delete');
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              var hasFKey = _hasOwnProperty(this._storage, fkey);
              return (delete this._storage[fkey]) && hasFKey;
            }
            ensureMap(this);
            return this['[[SetData]]']['delete'](key);
          },

          clear: function clear() {
            requireSetSlot(this, 'clear');
            if (this._storage) {
              this._storage = emptyObject();
            }
            if (this['[[SetData]]']) {
              this['[[SetData]]'].clear();
            }
          },

          values: function values() {
            requireSetSlot(this, 'values');
            ensureMap(this);
            return new SetIterator(this['[[SetData]]'].values());
          },

          entries: function entries() {
            requireSetSlot(this, 'entries');
            ensureMap(this);
            return new SetIterator(this['[[SetData]]'].entries());
          },

          forEach: function forEach(callback) {
            requireSetSlot(this, 'forEach');
            var context = arguments.length > 1 ? arguments[1] : null;
            var entireSet = this;
            ensureMap(entireSet);
            this['[[SetData]]'].forEach(function (value, key) {
              if (context) {
                _call(callback, context, key, key, entireSet);
              } else {
                callback(key, key, entireSet);
              }
            });
          }
        });
        defineProperty(SetShim.prototype, 'keys', SetShim.prototype.values, true);
        addIterator(SetShim.prototype, SetShim.prototype.values);

        var SetIterator = function SetIterator(it) {
          this.it = it;
        };
        SetIterator.prototype = {
          isSetIterator: true,
          next: function next() {
            if (!this.isSetIterator) {
              throw new TypeError('Not a SetIterator');
            }
            return this.it.next();
          }
        };
        addIterator(SetIterator.prototype);

        return SetShim;
      }())
    };

    var isGoogleTranslate = globals.Set && !Set.prototype['delete'] && Set.prototype.remove && Set.prototype.items && Set.prototype.map && Array.isArray(new Set().keys);
    if (isGoogleTranslate) {
      // special-case force removal of wildly invalid Set implementation in Google Translate iframes
      // see https://github.com/paulmillr/es6-shim/issues/438 / https://twitter.com/ljharb/status/849335573114363904
      globals.Set = collectionShims.Set;
    }
    if (globals.Map || globals.Set) {
      // Safari 8, for example, doesn't accept an iterable.
      var mapAcceptsArguments = valueOrFalseIfThrows(function () { return new Map([[1, 2]]).get(1) === 2; });
      if (!mapAcceptsArguments) {
        globals.Map = function Map() {
          if (!(this instanceof Map)) {
            throw new TypeError('Constructor Map requires "new"');
          }
          var m = new OrigMap();
          if (arguments.length > 0) {
            addIterableToMap(Map, m, arguments[0]);
          }
          delete m.constructor;
          Object.setPrototypeOf(m, globals.Map.prototype);
          return m;
        };
        globals.Map.prototype = create(OrigMap.prototype);
        defineProperty(globals.Map.prototype, 'constructor', globals.Map, true);
        Value.preserveToString(globals.Map, OrigMap);
      }
      var testMap = new Map();
      var mapUsesSameValueZero = (function () {
        // Chrome 38-42, node 0.11/0.12, iojs 1/2 also have a bug when the Map has a size > 4
        var m = new Map([[1, 0], [2, 0], [3, 0], [4, 0]]);
        m.set(-0, m);
        return m.get(0) === m && m.get(-0) === m && m.has(0) && m.has(-0);
      }());
      var mapSupportsChaining = testMap.set(1, 2) === testMap;
      if (!mapUsesSameValueZero || !mapSupportsChaining) {
        overrideNative(Map.prototype, 'set', function set(k, v) {
          _call(origMapSet, this, k === 0 ? 0 : k, v);
          return this;
        });
      }
      if (!mapUsesSameValueZero) {
        defineProperties(Map.prototype, {
          get: function get(k) {
            return _call(origMapGet, this, k === 0 ? 0 : k);
          },
          has: function has(k) {
            return _call(origMapHas, this, k === 0 ? 0 : k);
          }
        }, true);
        Value.preserveToString(Map.prototype.get, origMapGet);
        Value.preserveToString(Map.prototype.has, origMapHas);
      }
      var testSet = new Set();
      var setUsesSameValueZero = Set.prototype['delete'] && Set.prototype.add && Set.prototype.has && (function (s) {
        s['delete'](0);
        s.add(-0);
        return !s.has(0);
      }(testSet));
      var setSupportsChaining = testSet.add(1) === testSet;
      if (!setUsesSameValueZero || !setSupportsChaining) {
        var origSetAdd = Set.prototype.add;
        Set.prototype.add = function add(v) {
          _call(origSetAdd, this, v === 0 ? 0 : v);
          return this;
        };
        Value.preserveToString(Set.prototype.add, origSetAdd);
      }
      if (!setUsesSameValueZero) {
        var origSetHas = Set.prototype.has;
        Set.prototype.has = function has(v) {
          return _call(origSetHas, this, v === 0 ? 0 : v);
        };
        Value.preserveToString(Set.prototype.has, origSetHas);
        var origSetDel = Set.prototype['delete'];
        Set.prototype['delete'] = function SetDelete(v) {
          return _call(origSetDel, this, v === 0 ? 0 : v);
        };
        Value.preserveToString(Set.prototype['delete'], origSetDel);
      }
      var mapSupportsSubclassing = supportsSubclassing(globals.Map, function (M) {
        var m = new M([]);
        // Firefox 32 is ok with the instantiating the subclass but will
        // throw when the map is used.
        m.set(42, 42);
        return m instanceof M;
      });
      // without Object.setPrototypeOf, subclassing is not possible
      var mapFailsToSupportSubclassing = Object.setPrototypeOf && !mapSupportsSubclassing;
      var mapRequiresNew = (function () {
        try {
          return !(globals.Map() instanceof globals.Map);
        } catch (e) {
          return e instanceof TypeError;
        }
      }());
      if (globals.Map.length !== 0 || mapFailsToSupportSubclassing || !mapRequiresNew) {
        globals.Map = function Map() {
          if (!(this instanceof Map)) {
            throw new TypeError('Constructor Map requires "new"');
          }
          var m = new OrigMap();
          if (arguments.length > 0) {
            addIterableToMap(Map, m, arguments[0]);
          }
          delete m.constructor;
          Object.setPrototypeOf(m, Map.prototype);
          return m;
        };
        globals.Map.prototype = OrigMap.prototype;
        defineProperty(globals.Map.prototype, 'constructor', globals.Map, true);
        Value.preserveToString(globals.Map, OrigMap);
      }
      var setSupportsSubclassing = supportsSubclassing(globals.Set, function (S) {
        var s = new S([]);
        s.add(42, 42);
        return s instanceof S;
      });
      // without Object.setPrototypeOf, subclassing is not possible
      var setFailsToSupportSubclassing = Object.setPrototypeOf && !setSupportsSubclassing;
      var setRequiresNew = (function () {
        try {
          return !(globals.Set() instanceof globals.Set);
        } catch (e) {
          return e instanceof TypeError;
        }
      }());
      if (globals.Set.length !== 0 || setFailsToSupportSubclassing || !setRequiresNew) {
        var OrigSet = globals.Set;
        globals.Set = function Set() {
          if (!(this instanceof Set)) {
            throw new TypeError('Constructor Set requires "new"');
          }
          var s = new OrigSet();
          if (arguments.length > 0) {
            addIterableToSet(Set, s, arguments[0]);
          }
          delete s.constructor;
          Object.setPrototypeOf(s, Set.prototype);
          return s;
        };
        globals.Set.prototype = OrigSet.prototype;
        defineProperty(globals.Set.prototype, 'constructor', globals.Set, true);
        Value.preserveToString(globals.Set, OrigSet);
      }
      var newMap = new globals.Map();
      var mapIterationThrowsStopIterator = !valueOrFalseIfThrows(function () {
        return newMap.keys().next().done;
      });
      /*
        - In Firefox < 23, Map#size is a function.
        - In all current Firefox, Set#entries/keys/values & Map#clear do not exist
        - https://bugzilla.mozilla.org/show_bug.cgi?id=869996
        - In Firefox 24, Map and Set do not implement forEach
        - In Firefox 25 at least, Map and Set are callable without "new"
      */
      if (
        typeof globals.Map.prototype.clear !== 'function' ||
        new globals.Set().size !== 0 ||
        newMap.size !== 0 ||
        typeof globals.Map.prototype.keys !== 'function' ||
        typeof globals.Set.prototype.keys !== 'function' ||
        typeof globals.Map.prototype.forEach !== 'function' ||
        typeof globals.Set.prototype.forEach !== 'function' ||
        isCallableWithoutNew(globals.Map) ||
        isCallableWithoutNew(globals.Set) ||
        typeof newMap.keys().next !== 'function' || // Safari 8
        mapIterationThrowsStopIterator || // Firefox 25
        !mapSupportsSubclassing
      ) {
        defineProperties(globals, {
          Map: collectionShims.Map,
          Set: collectionShims.Set
        }, true);
      }

      if (globals.Set.prototype.keys !== globals.Set.prototype.values) {
        // Fixed in WebKit with https://bugs.webkit.org/show_bug.cgi?id=144190
        defineProperty(globals.Set.prototype, 'keys', globals.Set.prototype.values, true);
      }

      // Shim incomplete iterator implementations.
      addIterator(Object.getPrototypeOf((new globals.Map()).keys()));
      addIterator(Object.getPrototypeOf((new globals.Set()).keys()));

      if (functionsHaveNames && globals.Set.prototype.has.name !== 'has') {
        // Microsoft Edge v0.11.10074.0 is missing a name on Set#has
        var anonymousSetHas = globals.Set.prototype.has;
        overrideNative(globals.Set.prototype, 'has', function has(key) {
          return _call(anonymousSetHas, this, key);
        });
      }
    }
    defineProperties(globals, collectionShims);
    addDefaultSpecies(globals.Map);
    addDefaultSpecies(globals.Set);
  }

  var throwUnlessTargetIsObject = function throwUnlessTargetIsObject(target) {
    if (!ES.TypeIsObject(target)) {
      throw new TypeError('target must be an object');
    }
  };

  // Some Reflect methods are basically the same as
  // those on the Object global, except that a TypeError is thrown if
  // target isn't an object. As well as returning a boolean indicating
  // the success of the operation.
  var ReflectShims = {
    // Apply method in a functional form.
    apply: function apply() {
      return ES.Call(ES.Call, null, arguments);
    },

    // New operator in a functional form.
    construct: function construct(constructor, args) {
      if (!ES.IsConstructor(constructor)) {
        throw new TypeError('First argument must be a constructor.');
      }
      var newTarget = arguments.length > 2 ? arguments[2] : constructor;
      if (!ES.IsConstructor(newTarget)) {
        throw new TypeError('new.target must be a constructor.');
      }
      return ES.Construct(constructor, args, newTarget, 'internal');
    },

    // When deleting a non-existent or configurable property,
    // true is returned.
    // When attempting to delete a non-configurable property,
    // it will return false.
    deleteProperty: function deleteProperty(target, key) {
      throwUnlessTargetIsObject(target);
      if (supportsDescriptors) {
        var desc = Object.getOwnPropertyDescriptor(target, key);

        if (desc && !desc.configurable) {
          return false;
        }
      }

      // Will return true.
      return delete target[key];
    },

    has: function has(target, key) {
      throwUnlessTargetIsObject(target);
      return key in target;
    }
  };

  if (Object.getOwnPropertyNames) {
    Object.assign(ReflectShims, {
      // Basically the result of calling the internal [[OwnPropertyKeys]].
      // Concatenating propertyNames and propertySymbols should do the trick.
      // This should continue to work together with a Symbol shim
      // which overrides Object.getOwnPropertyNames and implements
      // Object.getOwnPropertySymbols.
      ownKeys: function ownKeys(target) {
        throwUnlessTargetIsObject(target);
        var keys = Object.getOwnPropertyNames(target);

        if (ES.IsCallable(Object.getOwnPropertySymbols)) {
          _pushApply(keys, Object.getOwnPropertySymbols(target));
        }

        return keys;
      }
    });
  }

  var callAndCatchException = function ConvertExceptionToBoolean(func) {
    return !throwsError(func);
  };

  if (Object.preventExtensions) {
    Object.assign(ReflectShims, {
      isExtensible: function isExtensible(target) {
        throwUnlessTargetIsObject(target);
        return Object.isExtensible(target);
      },
      preventExtensions: function preventExtensions(target) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          return Object.preventExtensions(target);
        });
      }
    });
  }

  if (supportsDescriptors) {
    var internalGet = function get(target, key, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent === null) {
          return void 0;
        }

        return internalGet(parent, key, receiver);
      }

      if ('value' in desc) {
        return desc.value;
      }

      if (desc.get) {
        return ES.Call(desc.get, receiver);
      }

      return void 0;
    };

    var internalSet = function set(target, key, value, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent !== null) {
          return internalSet(parent, key, value, receiver);
        }

        desc = {
          value: void 0,
          writable: true,
          enumerable: true,
          configurable: true
        };
      }

      if ('value' in desc) {
        if (!desc.writable) {
          return false;
        }

        if (!ES.TypeIsObject(receiver)) {
          return false;
        }

        var existingDesc = Object.getOwnPropertyDescriptor(receiver, key);

        if (existingDesc) {
          return Reflect.defineProperty(receiver, key, {
            value: value
          });
        } else {
          return Reflect.defineProperty(receiver, key, {
            value: value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }

      if (desc.set) {
        _call(desc.set, receiver, value);
        return true;
      }

      return false;
    };

    Object.assign(ReflectShims, {
      defineProperty: function defineProperty(target, propertyKey, attributes) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          return Object.defineProperty(target, propertyKey, attributes);
        });
      },

      getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey) {
        throwUnlessTargetIsObject(target);
        return Object.getOwnPropertyDescriptor(target, propertyKey);
      },

      // Syntax in a functional form.
      get: function get(target, key) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 2 ? arguments[2] : target;

        return internalGet(target, key, receiver);
      },

      set: function set(target, key, value) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 3 ? arguments[3] : target;

        return internalSet(target, key, value, receiver);
      }
    });
  }

  if (Object.getPrototypeOf) {
    var objectDotGetPrototypeOf = Object.getPrototypeOf;
    ReflectShims.getPrototypeOf = function getPrototypeOf(target) {
      throwUnlessTargetIsObject(target);
      return objectDotGetPrototypeOf(target);
    };
  }

  if (Object.setPrototypeOf && ReflectShims.getPrototypeOf) {
    var willCreateCircularPrototype = function (object, lastProto) {
      var proto = lastProto;
      while (proto) {
        if (object === proto) {
          return true;
        }
        proto = ReflectShims.getPrototypeOf(proto);
      }
      return false;
    };

    Object.assign(ReflectShims, {
      // Sets the prototype of the given object.
      // Returns true on success, otherwise false.
      setPrototypeOf: function setPrototypeOf(object, proto) {
        throwUnlessTargetIsObject(object);
        if (proto !== null && !ES.TypeIsObject(proto)) {
          throw new TypeError('proto must be an object or null');
        }

        // If they already are the same, we're done.
        if (proto === Reflect.getPrototypeOf(object)) {
          return true;
        }

        // Cannot alter prototype if object not extensible.
        if (Reflect.isExtensible && !Reflect.isExtensible(object)) {
          return false;
        }

        // Ensure that we do not create a circular prototype chain.
        if (willCreateCircularPrototype(object, proto)) {
          return false;
        }

        Object.setPrototypeOf(object, proto);

        return true;
      }
    });
  }
  var defineOrOverrideReflectProperty = function (key, shim) {
    if (!ES.IsCallable(globals.Reflect[key])) {
      defineProperty(globals.Reflect, key, shim);
    } else {
      var acceptsPrimitives = valueOrFalseIfThrows(function () {
        globals.Reflect[key](1);
        globals.Reflect[key](NaN);
        globals.Reflect[key](true);
        return true;
      });
      if (acceptsPrimitives) {
        overrideNative(globals.Reflect, key, shim);
      }
    }
  };
  Object.keys(ReflectShims).forEach(function (key) {
    defineOrOverrideReflectProperty(key, ReflectShims[key]);
  });
  var originalReflectGetProto = globals.Reflect.getPrototypeOf;
  if (functionsHaveNames && originalReflectGetProto && originalReflectGetProto.name !== 'getPrototypeOf') {
    overrideNative(globals.Reflect, 'getPrototypeOf', function getPrototypeOf(target) {
      return _call(originalReflectGetProto, globals.Reflect, target);
    });
  }
  if (globals.Reflect.setPrototypeOf) {
    if (valueOrFalseIfThrows(function () {
      globals.Reflect.setPrototypeOf(1, {});
      return true;
    })) {
      overrideNative(globals.Reflect, 'setPrototypeOf', ReflectShims.setPrototypeOf);
    }
  }
  if (globals.Reflect.defineProperty) {
    if (!valueOrFalseIfThrows(function () {
      var basic = !globals.Reflect.defineProperty(1, 'test', { value: 1 });
      // "extensible" fails on Edge 0.12
      var extensible = typeof Object.preventExtensions !== 'function' || !globals.Reflect.defineProperty(Object.preventExtensions({}), 'test', {});
      return basic && extensible;
    })) {
      overrideNative(globals.Reflect, 'defineProperty', ReflectShims.defineProperty);
    }
  }
  if (globals.Reflect.construct) {
    if (!valueOrFalseIfThrows(function () {
      var F = function F() {};
      return globals.Reflect.construct(function () {}, [], F) instanceof F;
    })) {
      overrideNative(globals.Reflect, 'construct', ReflectShims.construct);
    }
  }

  if (String(new Date(NaN)) !== 'Invalid Date') {
    var dateToString = Date.prototype.toString;
    var shimmedDateToString = function toString() {
      var valueOf = +this;
      if (valueOf !== valueOf) {
        return 'Invalid Date';
      }
      return ES.Call(dateToString, this);
    };
    overrideNative(Date.prototype, 'toString', shimmedDateToString);
  }

  // Annex B HTML methods
  // http://www.ecma-international.org/ecma-262/6.0/#sec-additional-properties-of-the-string.prototype-object
  var stringHTMLshims = {
    anchor: function anchor(name) { return ES.CreateHTML(this, 'a', 'name', name); },
    big: function big() { return ES.CreateHTML(this, 'big', '', ''); },
    blink: function blink() { return ES.CreateHTML(this, 'blink', '', ''); },
    bold: function bold() { return ES.CreateHTML(this, 'b', '', ''); },
    fixed: function fixed() { return ES.CreateHTML(this, 'tt', '', ''); },
    fontcolor: function fontcolor(color) { return ES.CreateHTML(this, 'font', 'color', color); },
    fontsize: function fontsize(size) { return ES.CreateHTML(this, 'font', 'size', size); },
    italics: function italics() { return ES.CreateHTML(this, 'i', '', ''); },
    link: function link(url) { return ES.CreateHTML(this, 'a', 'href', url); },
    small: function small() { return ES.CreateHTML(this, 'small', '', ''); },
    strike: function strike() { return ES.CreateHTML(this, 'strike', '', ''); },
    sub: function sub() { return ES.CreateHTML(this, 'sub', '', ''); },
    sup: function sub() { return ES.CreateHTML(this, 'sup', '', ''); }
  };
  _forEach(Object.keys(stringHTMLshims), function (key) {
    var method = String.prototype[key];
    var shouldOverwrite = false;
    if (ES.IsCallable(method)) {
      var output = _call(method, '', ' " ');
      var quotesCount = _concat([], output.match(/"/g)).length;
      shouldOverwrite = output !== output.toLowerCase() || quotesCount > 2;
    } else {
      shouldOverwrite = true;
    }
    if (shouldOverwrite) {
      overrideNative(String.prototype, key, stringHTMLshims[key]);
    }
  });

  var JSONstringifiesSymbols = (function () {
    // Microsoft Edge v0.12 stringifies Symbols incorrectly
    if (!hasSymbols) { return false; } // Symbols are not supported
    var stringify = typeof JSON === 'object' && typeof JSON.stringify === 'function' ? JSON.stringify : null;
    if (!stringify) { return false; } // JSON.stringify is not supported
    if (typeof stringify(Symbol()) !== 'undefined') { return true; } // Symbols should become `undefined`
    if (stringify([Symbol()]) !== '[null]') { return true; } // Symbols in arrays should become `null`
    var obj = { a: Symbol() };
    obj[Symbol()] = true;
    if (stringify(obj) !== '{}') { return true; } // Symbol-valued keys *and* Symbol-valued properties should be omitted
    return false;
  }());
  var JSONstringifyAcceptsObjectSymbol = valueOrFalseIfThrows(function () {
    // Chrome 45 throws on stringifying object symbols
    if (!hasSymbols) { return true; } // Symbols are not supported
    return JSON.stringify(Object(Symbol())) === '{}' && JSON.stringify([Object(Symbol())]) === '[{}]';
  });
  if (JSONstringifiesSymbols || !JSONstringifyAcceptsObjectSymbol) {
    var origStringify = JSON.stringify;
    overrideNative(JSON, 'stringify', function stringify(value) {
      if (typeof value === 'symbol') { return; }
      var replacer;
      if (arguments.length > 1) {
        replacer = arguments[1];
      }
      var args = [value];
      if (!isArray(replacer)) {
        var replaceFn = ES.IsCallable(replacer) ? replacer : null;
        var wrappedReplacer = function (key, val) {
          var parsedValue = replaceFn ? _call(replaceFn, this, key, val) : val;
          if (typeof parsedValue !== 'symbol') {
            if (Type.symbol(parsedValue)) {
              return assignTo({})(parsedValue);
            } else {
              return parsedValue;
            }
          }
        };
        args.push(wrappedReplacer);
      } else {
        // create wrapped replacer that handles an array replacer?
        args.push(replacer);
      }
      if (arguments.length > 2) {
        args.push(arguments[2]);
      }
      return origStringify.apply(this, args);
    });
  }

  return globals;
}));
});

Numbas.queueScript('decimal',[],function() {
/* decimal.js v10.1.1 https://github.com/MikeMcl/decimal.js/LICENCE */
if(typeof module !='undefined') {
    module = undefined;
}
!function(n){"use strict";var h,R,e,o,u=9e15,g=1e9,m="0123456789abcdef",t="2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058",r="3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789",c={precision:20,rounding:4,modulo:1,toExpNeg:-7,toExpPos:21,minE:-u,maxE:u,crypto:!1},N=!0,f="[DecimalError] ",w=f+"Invalid argument: ",s=f+"Precision limit exceeded",a=f+"crypto unavailable",L=Math.floor,v=Math.pow,l=/^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i,d=/^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i,p=/^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i,b=/^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,T=1e7,U=7,E=t.length-1,x=r.length-1,y={name:"[object Decimal]"};function M(n){var e,i,t,r=n.length-1,s="",o=n[0];if(0<r){for(s+=o,e=1;e<r;e++)t=n[e]+"",(i=U-t.length)&&(s+=C(i)),s+=t;o=n[e],(i=U-(t=o+"").length)&&(s+=C(i))}else if(0===o)return"0";for(;o%10==0;)o/=10;return s+o}function q(n,e,i){if(n!==~~n||n<e||i<n)throw Error(w+n)}function O(n,e,i,t){var r,s,o;for(s=n[0];10<=s;s/=10)--e;return--e<0?(e+=U,r=0):(r=Math.ceil((e+1)/U),e%=U),s=v(10,U-e),o=n[r]%s|0,null==t?e<3?(0==e?o=o/100|0:1==e&&(o=o/10|0),i<4&&99999==o||3<i&&49999==o||5e4==o||0==o):(i<4&&o+1==s||3<i&&o+1==s/2)&&(n[r+1]/s/100|0)==v(10,e-2)-1||(o==s/2||0==o)&&0==(n[r+1]/s/100|0):e<4?(0==e?o=o/1e3|0:1==e?o=o/100|0:2==e&&(o=o/10|0),(t||i<4)&&9999==o||!t&&3<i&&4999==o):((t||i<4)&&o+1==s||!t&&3<i&&o+1==s/2)&&(n[r+1]/s/1e3|0)==v(10,e-3)-1}function D(n,e,i){for(var t,r,s=[0],o=0,u=n.length;o<u;){for(r=s.length;r--;)s[r]*=e;for(s[0]+=m.indexOf(n.charAt(o++)),t=0;t<s.length;t++)s[t]>i-1&&(void 0===s[t+1]&&(s[t+1]=0),s[t+1]+=s[t]/i|0,s[t]%=i)}return s.reverse()}y.absoluteValue=y.abs=function(){var n=new this.constructor(this);return n.s<0&&(n.s=1),_(n)},y.ceil=function(){return _(new this.constructor(this),this.e+1,2)},y.comparedTo=y.cmp=function(n){var e,i,t,r,s=this,o=s.d,u=(n=new s.constructor(n)).d,c=s.s,f=n.s;if(!o||!u)return c&&f?c!==f?c:o===u?0:!o^c<0?1:-1:NaN;if(!o[0]||!u[0])return o[0]?c:u[0]?-f:0;if(c!==f)return c;if(s.e!==n.e)return s.e>n.e^c<0?1:-1;for(e=0,i=(t=o.length)<(r=u.length)?t:r;e<i;++e)if(o[e]!==u[e])return o[e]>u[e]^c<0?1:-1;return t===r?0:r<t^c<0?1:-1},y.cosine=y.cos=function(){var n,e,i=this,t=i.constructor;return i.d?i.d[0]?(n=t.precision,e=t.rounding,t.precision=n+Math.max(i.e,i.sd())+U,t.rounding=1,i=function(n,e){var i,t,r=e.d.length;t=r<32?(i=Math.ceil(r/3),Math.pow(4,-i).toString()):(i=16,"2.3283064365386962890625e-10");n.precision+=i,e=W(n,1,e.times(t),new n(1));for(var s=i;s--;){var o=e.times(e);e=o.times(o).minus(o).times(8).plus(1)}return n.precision-=i,e}(t,J(t,i)),t.precision=n,t.rounding=e,_(2==o||3==o?i.neg():i,n,e,!0)):new t(1):new t(NaN)},y.cubeRoot=y.cbrt=function(){var n,e,i,t,r,s,o,u,c,f,a=this,h=a.constructor;if(!a.isFinite()||a.isZero())return new h(a);for(N=!1,(s=a.s*Math.pow(a.s*a,1/3))&&Math.abs(s)!=1/0?t=new h(s.toString()):(i=M(a.d),(s=((n=a.e)-i.length+1)%3)&&(i+=1==s||-2==s?"0":"00"),s=Math.pow(i,1/3),n=L((n+1)/3)-(n%3==(n<0?-1:2)),(t=new h(i=s==1/0?"5e"+n:(i=s.toExponential()).slice(0,i.indexOf("e")+1)+n)).s=a.s),o=(n=h.precision)+3;;)if(f=(c=(u=t).times(u).times(u)).plus(a),t=F(f.plus(a).times(u),f.plus(c),o+2,1),M(u.d).slice(0,o)===(i=M(t.d)).slice(0,o)){if("9999"!=(i=i.slice(o-3,o+1))&&(r||"4999"!=i)){+i&&(+i.slice(1)||"5"!=i.charAt(0))||(_(t,n+1,1),e=!t.times(t).times(t).eq(a));break}if(!r&&(_(u,n+1,0),u.times(u).times(u).eq(a))){t=u;break}o+=4,r=1}return N=!0,_(t,n,h.rounding,e)},y.decimalPlaces=y.dp=function(){var n,e=this.d,i=NaN;if(e){if(i=((n=e.length-1)-L(this.e/U))*U,n=e[n])for(;n%10==0;n/=10)i--;i<0&&(i=0)}return i},y.dividedBy=y.div=function(n){return F(this,new this.constructor(n))},y.dividedToIntegerBy=y.divToInt=function(n){var e=this.constructor;return _(F(this,new e(n),0,1,1),e.precision,e.rounding)},y.equals=y.eq=function(n){return 0===this.cmp(n)},y.floor=function(){return _(new this.constructor(this),this.e+1,3)},y.greaterThan=y.gt=function(n){return 0<this.cmp(n)},y.greaterThanOrEqualTo=y.gte=function(n){var e=this.cmp(n);return 1==e||0===e},y.hyperbolicCosine=y.cosh=function(){var n,e,i,t,r,s=this,o=s.constructor,u=new o(1);if(!s.isFinite())return new o(s.s?1/0:NaN);if(s.isZero())return u;i=o.precision,t=o.rounding,o.precision=i+Math.max(s.e,s.sd())+4,o.rounding=1,e=(r=s.d.length)<32?(n=Math.ceil(r/3),Math.pow(4,-n).toString()):(n=16,"2.3283064365386962890625e-10"),s=W(o,1,s.times(e),new o(1),!0);for(var c,f=n,a=new o(8);f--;)c=s.times(s),s=u.minus(c.times(a.minus(c.times(a))));return _(s,o.precision=i,o.rounding=t,!0)},y.hyperbolicSine=y.sinh=function(){var n,e,i,t,r=this,s=r.constructor;if(!r.isFinite()||r.isZero())return new s(r);if(e=s.precision,i=s.rounding,s.precision=e+Math.max(r.e,r.sd())+4,s.rounding=1,(t=r.d.length)<3)r=W(s,2,r,r,!0);else{n=16<(n=1.4*Math.sqrt(t))?16:0|n,r=W(s,2,r=r.times(Math.pow(5,-n)),r,!0);for(var o,u=new s(5),c=new s(16),f=new s(20);n--;)o=r.times(r),r=r.times(u.plus(o.times(c.times(o).plus(f))))}return _(r,s.precision=e,s.rounding=i,!0)},y.hyperbolicTangent=y.tanh=function(){var n,e,i=this,t=i.constructor;return i.isFinite()?i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+7,t.rounding=1,F(i.sinh(),i.cosh(),t.precision=n,t.rounding=e)):new t(i.s)},y.inverseCosine=y.acos=function(){var n,e=this,i=e.constructor,t=e.abs().cmp(1),r=i.precision,s=i.rounding;return-1!==t?0===t?e.isNeg()?P(i,r,s):new i(0):new i(NaN):e.isZero()?P(i,r+4,s).times(.5):(i.precision=r+6,i.rounding=1,e=e.asin(),n=P(i,r+4,s).times(.5),i.precision=r,i.rounding=s,n.minus(e))},y.inverseHyperbolicCosine=y.acosh=function(){var n,e,i=this,t=i.constructor;return i.lte(1)?new t(i.eq(1)?0:NaN):i.isFinite()?(n=t.precision,e=t.rounding,t.precision=n+Math.max(Math.abs(i.e),i.sd())+4,t.rounding=1,N=!1,i=i.times(i).minus(1).sqrt().plus(i),N=!0,t.precision=n,t.rounding=e,i.ln()):new t(i)},y.inverseHyperbolicSine=y.asinh=function(){var n,e,i=this,t=i.constructor;return!i.isFinite()||i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+2*Math.max(Math.abs(i.e),i.sd())+6,t.rounding=1,N=!1,i=i.times(i).plus(1).sqrt().plus(i),N=!0,t.precision=n,t.rounding=e,i.ln())},y.inverseHyperbolicTangent=y.atanh=function(){var n,e,i,t,r=this,s=r.constructor;return r.isFinite()?0<=r.e?new s(r.abs().eq(1)?r.s/0:r.isZero()?r:NaN):(n=s.precision,e=s.rounding,t=r.sd(),Math.max(t,n)<2*-r.e-1?_(new s(r),n,e,!0):(s.precision=i=t-r.e,r=F(r.plus(1),new s(1).minus(r),i+n,1),s.precision=n+4,s.rounding=1,r=r.ln(),s.precision=n,s.rounding=e,r.times(.5))):new s(NaN)},y.inverseSine=y.asin=function(){var n,e,i,t,r=this,s=r.constructor;return r.isZero()?new s(r):(e=r.abs().cmp(1),i=s.precision,t=s.rounding,-1!==e?0===e?((n=P(s,i+4,t).times(.5)).s=r.s,n):new s(NaN):(s.precision=i+6,s.rounding=1,r=r.div(new s(1).minus(r.times(r)).sqrt().plus(1)).atan(),s.precision=i,s.rounding=t,r.times(2)))},y.inverseTangent=y.atan=function(){var n,e,i,t,r,s,o,u,c,f=this,a=f.constructor,h=a.precision,l=a.rounding;if(f.isFinite()){if(f.isZero())return new a(f);if(f.abs().eq(1)&&h+4<=x)return(o=P(a,h+4,l).times(.25)).s=f.s,o}else{if(!f.s)return new a(NaN);if(h+4<=x)return(o=P(a,h+4,l).times(.5)).s=f.s,o}for(a.precision=u=h+10,a.rounding=1,n=i=Math.min(28,u/U+2|0);n;--n)f=f.div(f.times(f).plus(1).sqrt().plus(1));for(N=!1,e=Math.ceil(u/U),t=1,c=f.times(f),o=new a(f),r=f;-1!==n;)if(r=r.times(c),s=o.minus(r.div(t+=2)),r=r.times(c),void 0!==(o=s.plus(r.div(t+=2))).d[e])for(n=e;o.d[n]===s.d[n]&&n--;);return i&&(o=o.times(2<<i-1)),N=!0,_(o,a.precision=h,a.rounding=l,!0)},y.isFinite=function(){return!!this.d},y.isInteger=y.isInt=function(){return!!this.d&&L(this.e/U)>this.d.length-2},y.isNaN=function(){return!this.s},y.isNegative=y.isNeg=function(){return this.s<0},y.isPositive=y.isPos=function(){return 0<this.s},y.isZero=function(){return!!this.d&&0===this.d[0]},y.lessThan=y.lt=function(n){return this.cmp(n)<0},y.lessThanOrEqualTo=y.lte=function(n){return this.cmp(n)<1},y.logarithm=y.log=function(n){var e,i,t,r,s,o,u,c,f=this,a=f.constructor,h=a.precision,l=a.rounding;if(null==n)n=new a(10),e=!0;else{if(i=(n=new a(n)).d,n.s<0||!i||!i[0]||n.eq(1))return new a(NaN);e=n.eq(10)}if(i=f.d,f.s<0||!i||!i[0]||f.eq(1))return new a(i&&!i[0]?-1/0:1!=f.s?NaN:i?0:1/0);if(e)if(1<i.length)s=!0;else{for(r=i[0];r%10==0;)r/=10;s=1!==r}if(N=!1,o=V(f,u=h+5),t=e?Z(a,u+10):V(n,u),O((c=F(o,t,u,1)).d,r=h,l))do{if(o=V(f,u+=10),t=e?Z(a,u+10):V(n,u),c=F(o,t,u,1),!s){+M(c.d).slice(r+1,r+15)+1==1e14&&(c=_(c,h+1,0));break}}while(O(c.d,r+=10,l));return N=!0,_(c,h,l)},y.minus=y.sub=function(n){var e,i,t,r,s,o,u,c,f,a,h,l,d=this,p=d.constructor;if(n=new p(n),!d.d||!n.d)return d.s&&n.s?d.d?n.s=-n.s:n=new p(n.d||d.s!==n.s?d:NaN):n=new p(NaN),n;if(d.s!=n.s)return n.s=-n.s,d.plus(n);if(f=d.d,l=n.d,u=p.precision,c=p.rounding,!f[0]||!l[0]){if(l[0])n.s=-n.s;else{if(!f[0])return new p(3===c?-0:0);n=new p(d)}return N?_(n,u,c):n}if(i=L(n.e/U),a=L(d.e/U),f=f.slice(),s=a-i){for(o=(h=s<0)?(e=f,s=-s,l.length):(e=l,i=a,f.length),(t=Math.max(Math.ceil(u/U),o)+2)<s&&(s=t,e.length=1),e.reverse(),t=s;t--;)e.push(0);e.reverse()}else{for((h=(t=f.length)<(o=l.length))&&(o=t),t=0;t<o;t++)if(f[t]!=l[t]){h=f[t]<l[t];break}s=0}for(h&&(e=f,f=l,l=e,n.s=-n.s),o=f.length,t=l.length-o;0<t;--t)f[o++]=0;for(t=l.length;s<t;){if(f[--t]<l[t]){for(r=t;r&&0===f[--r];)f[r]=T-1;--f[r],f[t]+=T}f[t]-=l[t]}for(;0===f[--o];)f.pop();for(;0===f[0];f.shift())--i;return f[0]?(n.d=f,n.e=S(f,i),N?_(n,u,c):n):new p(3===c?-0:0)},y.modulo=y.mod=function(n){var e,i=this,t=i.constructor;return n=new t(n),!i.d||!n.s||n.d&&!n.d[0]?new t(NaN):!n.d||i.d&&!i.d[0]?_(new t(i),t.precision,t.rounding):(N=!1,9==t.modulo?(e=F(i,n.abs(),0,3,1)).s*=n.s:e=F(i,n,0,t.modulo,1),e=e.times(n),N=!0,i.minus(e))},y.naturalExponential=y.exp=function(){return B(this)},y.naturalLogarithm=y.ln=function(){return V(this)},y.negated=y.neg=function(){var n=new this.constructor(this);return n.s=-n.s,_(n)},y.plus=y.add=function(n){var e,i,t,r,s,o,u,c,f,a,h=this,l=h.constructor;if(n=new l(n),!h.d||!n.d)return h.s&&n.s?h.d||(n=new l(n.d||h.s===n.s?h:NaN)):n=new l(NaN),n;if(h.s!=n.s)return n.s=-n.s,h.minus(n);if(f=h.d,a=n.d,u=l.precision,c=l.rounding,!f[0]||!a[0])return a[0]||(n=new l(h)),N?_(n,u,c):n;if(s=L(h.e/U),t=L(n.e/U),f=f.slice(),r=s-t){for((o=(o=r<0?(i=f,r=-r,a.length):(i=a,t=s,f.length))<(s=Math.ceil(u/U))?s+1:o+1)<r&&(r=o,i.length=1),i.reverse();r--;)i.push(0);i.reverse()}for((o=f.length)-(r=a.length)<0&&(r=o,i=a,a=f,f=i),e=0;r;)e=(f[--r]=f[r]+a[r]+e)/T|0,f[r]%=T;for(e&&(f.unshift(e),++t),o=f.length;0==f[--o];)f.pop();return n.d=f,n.e=S(f,t),N?_(n,u,c):n},y.precision=y.sd=function(n){var e;if(void 0!==n&&n!==!!n&&1!==n&&0!==n)throw Error(w+n);return this.d?(e=k(this.d),n&&this.e+1>e&&(e=this.e+1)):e=NaN,e},y.round=function(){var n=this.constructor;return _(new n(this),this.e+1,n.rounding)},y.sine=y.sin=function(){var n,e,i=this,t=i.constructor;return i.isFinite()?i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+Math.max(i.e,i.sd())+U,t.rounding=1,i=function(n,e){var i,t=e.d.length;if(t<3)return W(n,2,e,e);i=16<(i=1.4*Math.sqrt(t))?16:0|i,e=e.times(Math.pow(5,-i)),e=W(n,2,e,e);for(var r,s=new n(5),o=new n(16),u=new n(20);i--;)r=e.times(e),e=e.times(s.plus(r.times(o.times(r).minus(u))));return e}(t,J(t,i)),t.precision=n,t.rounding=e,_(2<o?i.neg():i,n,e,!0)):new t(NaN)},y.squareRoot=y.sqrt=function(){var n,e,i,t,r,s,o=this,u=o.d,c=o.e,f=o.s,a=o.constructor;if(1!==f||!u||!u[0])return new a(!f||f<0&&(!u||u[0])?NaN:u?o:1/0);for(N=!1,t=0==(f=Math.sqrt(+o))||f==1/0?(((e=M(u)).length+c)%2==0&&(e+="0"),f=Math.sqrt(e),c=L((c+1)/2)-(c<0||c%2),new a(e=f==1/0?"1e"+c:(e=f.toExponential()).slice(0,e.indexOf("e")+1)+c)):new a(f.toString()),i=(c=a.precision)+3;;)if(t=(s=t).plus(F(o,s,i+2,1)).times(.5),M(s.d).slice(0,i)===(e=M(t.d)).slice(0,i)){if("9999"!=(e=e.slice(i-3,i+1))&&(r||"4999"!=e)){+e&&(+e.slice(1)||"5"!=e.charAt(0))||(_(t,c+1,1),n=!t.times(t).eq(o));break}if(!r&&(_(s,c+1,0),s.times(s).eq(o))){t=s;break}i+=4,r=1}return N=!0,_(t,c,a.rounding,n)},y.tangent=y.tan=function(){var n,e,i=this,t=i.constructor;return i.isFinite()?i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+10,t.rounding=1,(i=i.sin()).s=1,i=F(i,new t(1).minus(i.times(i)).sqrt(),n+10,0),t.precision=n,t.rounding=e,_(2==o||4==o?i.neg():i,n,e,!0)):new t(NaN)},y.times=y.mul=function(n){var e,i,t,r,s,o,u,c,f,a=this.constructor,h=this.d,l=(n=new a(n)).d;if(n.s*=this.s,!(h&&h[0]&&l&&l[0]))return new a(!n.s||h&&!h[0]&&!l||l&&!l[0]&&!h?NaN:h&&l?0*n.s:n.s/0);for(i=L(this.e/U)+L(n.e/U),(c=h.length)<(f=l.length)&&(s=h,h=l,l=s,o=c,c=f,f=o),s=[],t=o=c+f;t--;)s.push(0);for(t=f;0<=--t;){for(e=0,r=c+t;t<r;)u=s[r]+l[t]*h[r-t-1]+e,s[r--]=u%T|0,e=u/T|0;s[r]=(s[r]+e)%T|0}for(;!s[--o];)s.pop();return e?++i:s.shift(),n.d=s,n.e=S(s,i),N?_(n,a.precision,a.rounding):n},y.toBinary=function(n,e){return z(this,2,n,e)},y.toDecimalPlaces=y.toDP=function(n,e){var i=this,t=i.constructor;return i=new t(i),void 0===n?i:(q(n,0,g),void 0===e?e=t.rounding:q(e,0,8),_(i,n+i.e+1,e))},y.toExponential=function(n,e){var i,t=this,r=t.constructor;return i=void 0===n?A(t,!0):(q(n,0,g),void 0===e?e=r.rounding:q(e,0,8),A(t=_(new r(t),n+1,e),!0,n+1)),t.isNeg()&&!t.isZero()?"-"+i:i},y.toFixed=function(n,e){var i,t,r=this,s=r.constructor;return i=void 0===n?A(r):(q(n,0,g),void 0===e?e=s.rounding:q(e,0,8),A(t=_(new s(r),n+r.e+1,e),!1,n+t.e+1)),r.isNeg()&&!r.isZero()?"-"+i:i},y.toFraction=function(n){var e,i,t,r,s,o,u,c,f,a,h,l,d=this,p=d.d,g=d.constructor;if(!p)return new g(d);if(f=i=new g(1),o=(s=(e=new g(t=c=new g(0))).e=k(p)-d.e-1)%U,e.d[0]=v(10,o<0?U+o:o),null==n)n=0<s?e:f;else{if(!(u=new g(n)).isInt()||u.lt(f))throw Error(w+u);n=u.gt(e)?0<s?e:f:u}for(N=!1,u=new g(M(p)),a=g.precision,g.precision=s=p.length*U*2;h=F(u,e,0,1,1),1!=(r=i.plus(h.times(t))).cmp(n);)i=t,t=r,r=f,f=c.plus(h.times(r)),c=r,r=e,e=u.minus(h.times(r)),u=r;return r=F(n.minus(i),t,0,1,1),c=c.plus(r.times(f)),i=i.plus(r.times(t)),c.s=f.s=d.s,l=F(f,t,s,1).minus(d).abs().cmp(F(c,i,s,1).minus(d).abs())<1?[f,t]:[c,i],g.precision=a,N=!0,l},y.toHexadecimal=y.toHex=function(n,e){return z(this,16,n,e)},y.toNearest=function(n,e){var i=this,t=i.constructor;if(i=new t(i),null==n){if(!i.d)return i;n=new t(1),e=t.rounding}else{if(n=new t(n),void 0===e?e=t.rounding:q(e,0,8),!i.d)return n.s?i:n;if(!n.d)return n.s&&(n.s=i.s),n}return n.d[0]?(N=!1,i=F(i,n,0,e,1).times(n),N=!0,_(i)):(n.s=i.s,i=n),i},y.toNumber=function(){return+this},y.toOctal=function(n,e){return z(this,8,n,e)},y.toPower=y.pow=function(n){var e,i,t,r,s,o,u=this,c=u.constructor,f=+(n=new c(n));if(!(u.d&&n.d&&u.d[0]&&n.d[0]))return new c(v(+u,f));if((u=new c(u)).eq(1))return u;if(t=c.precision,s=c.rounding,n.eq(1))return _(u,t,s);if((e=L(n.e/U))>=n.d.length-1&&(i=f<0?-f:f)<=9007199254740991)return r=I(c,u,i,t),n.s<0?new c(1).div(r):_(r,t,s);if((o=u.s)<0){if(e<n.d.length-1)return new c(NaN);if(0==(1&n.d[e])&&(o=1),0==u.e&&1==u.d[0]&&1==u.d.length)return u.s=o,u}return(e=0!=(i=v(+u,f))&&isFinite(i)?new c(i+"").e:L(f*(Math.log("0."+M(u.d))/Math.LN10+u.e+1)))>c.maxE+1||e<c.minE-1?new c(0<e?o/0:0):(N=!1,c.rounding=u.s=1,i=Math.min(12,(e+"").length),(r=B(n.times(V(u,t+i)),t)).d&&O((r=_(r,t+5,1)).d,t,s)&&(e=t+10,+M((r=_(B(n.times(V(u,e+i)),e),e+5,1)).d).slice(t+1,t+15)+1==1e14&&(r=_(r,t+1,0))),r.s=o,N=!0,_(r,t,c.rounding=s))},y.toPrecision=function(n,e){var i,t=this,r=t.constructor;return i=void 0===n?A(t,t.e<=r.toExpNeg||t.e>=r.toExpPos):(q(n,1,g),void 0===e?e=r.rounding:q(e,0,8),A(t=_(new r(t),n,e),n<=t.e||t.e<=r.toExpNeg,n)),t.isNeg()&&!t.isZero()?"-"+i:i},y.toSignificantDigits=y.toSD=function(n,e){var i=this.constructor;return void 0===n?(n=i.precision,e=i.rounding):(q(n,1,g),void 0===e?e=i.rounding:q(e,0,8)),_(new i(this),n,e)},y.toString=function(){var n=this,e=n.constructor,i=A(n,n.e<=e.toExpNeg||n.e>=e.toExpPos);return n.isNeg()&&!n.isZero()?"-"+i:i},y.truncated=y.trunc=function(){return _(new this.constructor(this),this.e+1,1)},y.valueOf=y.toJSON=function(){var n=this,e=n.constructor,i=A(n,n.e<=e.toExpNeg||n.e>=e.toExpPos);return n.isNeg()?"-"+i:i};var F=function(){function S(n,e,i){var t,r=0,s=n.length;for(n=n.slice();s--;)t=n[s]*e+r,n[s]=t%i|0,r=t/i|0;return r&&n.unshift(r),n}function Z(n,e,i,t){var r,s;if(i!=t)s=t<i?1:-1;else for(r=s=0;r<i;r++)if(n[r]!=e[r]){s=n[r]>e[r]?1:-1;break}return s}function P(n,e,i,t){for(var r=0;i--;)n[i]-=r,r=n[i]<e[i]?1:0,n[i]=r*t+n[i]-e[i];for(;!n[0]&&1<n.length;)n.shift()}return function(n,e,i,t,r,s){var o,u,c,f,a,h,l,d,p,g,m,w,v,N,b,E,x,y,M,q,O=n.constructor,D=n.s==e.s?1:-1,F=n.d,A=e.d;if(!(F&&F[0]&&A&&A[0]))return new O(n.s&&e.s&&(F?!A||F[0]!=A[0]:A)?F&&0==F[0]||!A?0*D:D/0:NaN);for(u=s?(a=1,n.e-e.e):(s=T,a=U,L(n.e/a)-L(e.e/a)),M=A.length,x=F.length,g=(p=new O(D)).d=[],c=0;A[c]==(F[c]||0);c++);if(A[c]>(F[c]||0)&&u--,null==i?(N=i=O.precision,t=O.rounding):N=r?i+(n.e-e.e)+1:i,N<0)g.push(1),h=!0;else{if(N=N/a+2|0,c=0,1==M){for(A=A[f=0],N++;(c<x||f)&&N--;c++)b=f*s+(F[c]||0),g[c]=b/A|0,f=b%A|0;h=f||c<x}else{for(1<(f=s/(A[0]+1)|0)&&(A=S(A,f,s),F=S(F,f,s),M=A.length,x=F.length),E=M,w=(m=F.slice(0,M)).length;w<M;)m[w++]=0;for((q=A.slice()).unshift(0),y=A[0],A[1]>=s/2&&++y;f=0,(o=Z(A,m,M,w))<0?(v=m[0],M!=w&&(v=v*s+(m[1]||0)),1<(f=v/y|0)?(s<=f&&(f=s-1),1==(o=Z(l=S(A,f,s),m,d=l.length,w=m.length))&&(f--,P(l,M<d?q:A,d,s))):(0==f&&(o=f=1),l=A.slice()),(d=l.length)<w&&l.unshift(0),P(m,l,w,s),-1==o&&(o=Z(A,m,M,w=m.length))<1&&(f++,P(m,M<w?q:A,w,s)),w=m.length):0===o&&(f++,m=[0]),g[c++]=f,o&&m[0]?m[w++]=F[E]||0:(m=[F[E]],w=1),(E++<x||void 0!==m[0])&&N--;);h=void 0!==m[0]}g[0]||g.shift()}if(1==a)p.e=u,R=h;else{for(c=1,f=g[0];10<=f;f/=10)c++;p.e=c+u*a-1,_(p,r?i+p.e+1:i,t,h)}return p}}();function _(n,e,i,t){var r,s,o,u,c,f,a,h,l,d=n.constructor;n:if(null!=e){if(!(h=n.d))return n;for(r=1,u=h[0];10<=u;u/=10)r++;if((s=e-r)<0)s+=U,o=e,c=(a=h[l=0])/v(10,r-o-1)%10|0;else if(l=Math.ceil((s+1)/U),(u=h.length)<=l){if(!t)break n;for(;u++<=l;)h.push(0);a=c=0,o=(s%=U)-U+(r=1)}else{for(a=u=h[l],r=1;10<=u;u/=10)r++;c=(o=(s%=U)-U+r)<0?0:a/v(10,r-o-1)%10|0}if(t=t||e<0||void 0!==h[l+1]||(o<0?a:a%v(10,r-o-1)),f=i<4?(c||t)&&(0==i||i==(n.s<0?3:2)):5<c||5==c&&(4==i||t||6==i&&(0<s?0<o?a/v(10,r-o):0:h[l-1])%10&1||i==(n.s<0?8:7)),e<1||!h[0])return h.length=0,f?(e-=n.e+1,h[0]=v(10,(U-e%U)%U),n.e=-e||0):h[0]=n.e=0,n;if(0==s?(h.length=l,u=1,l--):(h.length=l+1,u=v(10,U-s),h[l]=0<o?(a/v(10,r-o)%v(10,o)|0)*u:0),f)for(;;){if(0==l){for(s=1,o=h[0];10<=o;o/=10)s++;for(o=h[0]+=u,u=1;10<=o;o/=10)u++;s!=u&&(n.e++,h[0]==T&&(h[0]=1));break}if(h[l]+=u,h[l]!=T)break;h[l--]=0,u=1}for(s=h.length;0===h[--s];)h.pop()}return N&&(n.e>d.maxE?(n.d=null,n.e=NaN):n.e<d.minE&&(n.e=0,n.d=[0])),n}function A(n,e,i){if(!n.isFinite())return j(n);var t,r=n.e,s=M(n.d),o=s.length;return e?(i&&0<(t=i-o)?s=s.charAt(0)+"."+s.slice(1)+C(t):1<o&&(s=s.charAt(0)+"."+s.slice(1)),s=s+(n.e<0?"e":"e+")+n.e):r<0?(s="0."+C(-r-1)+s,i&&0<(t=i-o)&&(s+=C(t))):o<=r?(s+=C(r+1-o),i&&0<(t=i-r-1)&&(s=s+"."+C(t))):((t=r+1)<o&&(s=s.slice(0,t)+"."+s.slice(t)),i&&0<(t=i-o)&&(r+1===o&&(s+="."),s+=C(t))),s}function S(n,e){var i=n[0];for(e*=U;10<=i;i/=10)e++;return e}function Z(n,e,i){if(E<e)throw N=!0,i&&(n.precision=i),Error(s);return _(new n(t),e,1,!0)}function P(n,e,i){if(x<e)throw Error(s);return _(new n(r),e,i,!0)}function k(n){var e=n.length-1,i=e*U+1;if(e=n[e]){for(;e%10==0;e/=10)i--;for(e=n[0];10<=e;e/=10)i++}return i}function C(n){for(var e="";n--;)e+="0";return e}function I(n,e,i,t){var r,s=new n(1),o=Math.ceil(t/U+4);for(N=!1;;){if(i%2&&G((s=s.times(e)).d,o)&&(r=!0),0===(i=L(i/2))){i=s.d.length-1,r&&0===s.d[i]&&++s.d[i];break}G((e=e.times(e)).d,o)}return N=!0,s}function H(n){return 1&n.d[n.d.length-1]}function i(n,e,i){for(var t,r=new n(e[0]),s=0;++s<e.length;){if(!(t=new n(e[s])).s){r=t;break}r[i](t)&&(r=t)}return r}function B(n,e){var i,t,r,s,o,u,c,f=0,a=0,h=0,l=n.constructor,d=l.rounding,p=l.precision;if(!n.d||!n.d[0]||17<n.e)return new l(n.d?n.d[0]?n.s<0?0:1/0:1:n.s?n.s<0?0:n:NaN);for(c=null==e?(N=!1,p):e,u=new l(.03125);-2<n.e;)n=n.times(u),h+=5;for(c+=t=Math.log(v(2,h))/Math.LN10*2+5|0,i=s=o=new l(1),l.precision=c;;){if(s=_(s.times(n),c,1),i=i.times(++a),M((u=o.plus(F(s,i,c,1))).d).slice(0,c)===M(o.d).slice(0,c)){for(r=h;r--;)o=_(o.times(o),c,1);if(null!=e)return l.precision=p,o;if(!(f<3&&O(o.d,c-t,d,f)))return _(o,l.precision=p,d,N=!0);l.precision=c+=10,i=s=u=new l(1),a=0,f++}o=u}}function V(n,e){var i,t,r,s,o,u,c,f,a,h,l,d=1,p=n,g=p.d,m=p.constructor,w=m.rounding,v=m.precision;if(p.s<0||!g||!g[0]||!p.e&&1==g[0]&&1==g.length)return new m(g&&!g[0]?-1/0:1!=p.s?NaN:g?0:p);if(a=null==e?(N=!1,v):e,m.precision=a+=10,t=(i=M(g)).charAt(0),!(Math.abs(s=p.e)<15e14))return f=Z(m,a+2,v).times(s+""),p=V(new m(t+"."+i.slice(1)),a-10).plus(f),m.precision=v,null==e?_(p,v,w,N=!0):p;for(;t<7&&1!=t||1==t&&3<i.charAt(1);)t=(i=M((p=p.times(n)).d)).charAt(0),d++;for(s=p.e,1<t?(p=new m("0."+i),s++):p=new m(t+"."+i.slice(1)),c=o=p=F((h=p).minus(1),p.plus(1),a,1),l=_(p.times(p),a,1),r=3;;){if(o=_(o.times(l),a,1),M((f=c.plus(F(o,new m(r),a,1))).d).slice(0,a)===M(c.d).slice(0,a)){if(c=c.times(2),0!==s&&(c=c.plus(Z(m,a+2,v).times(s+""))),c=F(c,new m(d),a,1),null!=e)return m.precision=v,c;if(!O(c.d,a-10,w,u))return _(c,m.precision=v,w,N=!0);m.precision=a+=10,f=o=p=F(h.minus(1),h.plus(1),a,1),l=_(p.times(p),a,1),r=u=1}c=f,r+=2}}function j(n){return String(n.s*n.s/0)}function $(n,e){var i,t,r;for(-1<(i=e.indexOf("."))&&(e=e.replace(".","")),0<(t=e.search(/e/i))?(i<0&&(i=t),i+=+e.slice(t+1),e=e.substring(0,t)):i<0&&(i=e.length),t=0;48===e.charCodeAt(t);t++);for(r=e.length;48===e.charCodeAt(r-1);--r);if(e=e.slice(t,r)){if(r-=t,n.e=i=i-t-1,n.d=[],t=(i+1)%U,i<0&&(t+=U),t<r){for(t&&n.d.push(+e.slice(0,t)),r-=U;t<r;)n.d.push(+e.slice(t,t+=U));e=e.slice(t),t=U-e.length}else t-=r;for(;t--;)e+="0";n.d.push(+e),N&&(n.e>n.constructor.maxE?(n.d=null,n.e=NaN):n.e<n.constructor.minE&&(n.e=0,n.d=[0]))}else n.e=0,n.d=[0];return n}function W(n,e,i,t,r){var s,o,u,c,f=n.precision,a=Math.ceil(f/U);for(N=!1,c=i.times(i),u=new n(t);;){if(o=F(u.times(c),new n(e++*e++),f,1),u=r?t.plus(o):t.minus(o),t=F(o.times(c),new n(e++*e++),f,1),void 0!==(o=u.plus(t)).d[a]){for(s=a;o.d[s]===u.d[s]&&s--;);if(-1==s)break}s=u,u=t,t=o,o=s,0}return N=!0,o.d.length=a+1,o}function J(n,e){var i,t=e.s<0,r=P(n,n.precision,1),s=r.times(.5);if((e=e.abs()).lte(s))return o=t?4:1,e;if((i=e.divToInt(r)).isZero())o=t?3:2;else{if((e=e.minus(i.times(r))).lte(s))return o=H(i)?t?2:3:t?4:1,e;o=H(i)?t?1:4:t?3:2}return e.minus(r).abs()}function z(n,e,i,t){var r,s,o,u,c,f,a,h,l,d=n.constructor,p=void 0!==i;if(p?(q(i,1,g),void 0===t?t=d.rounding:q(t,0,8)):(i=d.precision,t=d.rounding),n.isFinite()){for(p?(r=2,16==e?i=4*i-3:8==e&&(i=3*i-2)):r=e,0<=(o=(a=A(n)).indexOf("."))&&(a=a.replace(".",""),(l=new d(1)).e=a.length-o,l.d=D(A(l),10,r),l.e=l.d.length),s=c=(h=D(a,10,r)).length;0==h[--c];)h.pop();if(h[0]){if(o<0?s--:((n=new d(n)).d=h,n.e=s,h=(n=F(n,l,i,t,0,r)).d,s=n.e,f=R),o=h[i],u=r/2,f=f||void 0!==h[i+1],f=t<4?(void 0!==o||f)&&(0===t||t===(n.s<0?3:2)):u<o||o===u&&(4===t||f||6===t&&1&h[i-1]||t===(n.s<0?8:7)),h.length=i,f)for(;++h[--i]>r-1;)h[i]=0,i||(++s,h.unshift(1));for(c=h.length;!h[c-1];--c);for(o=0,a="";o<c;o++)a+=m.charAt(h[o]);if(p){if(1<c)if(16==e||8==e){for(o=16==e?4:3,--c;c%o;c++)a+="0";for(c=(h=D(a,r,e)).length;!h[c-1];--c);for(o=1,a="1.";o<c;o++)a+=m.charAt(h[o])}else a=a.charAt(0)+"."+a.slice(1);a=a+(s<0?"p":"p+")+s}else if(s<0){for(;++s;)a="0"+a;a="0."+a}else if(++s>c)for(s-=c;s--;)a+="0";else s<c&&(a=a.slice(0,s)+"."+a.slice(s))}else a=p?"0p+0":"0";a=(16==e?"0x":2==e?"0b":8==e?"0o":"")+a}else a=j(n);return n.s<0?"-"+a:a}function G(n,e){if(n.length>e)return n.length=e,!0}function K(n){return new this(n).abs()}function Q(n){return new this(n).acos()}function X(n){return new this(n).acosh()}function Y(n,e){return new this(n).plus(e)}function nn(n){return new this(n).asin()}function en(n){return new this(n).asinh()}function tn(n){return new this(n).atan()}function rn(n){return new this(n).atanh()}function sn(n,e){n=new this(n),e=new this(e);var i,t=this.precision,r=this.rounding,s=t+4;return n.s&&e.s?n.d||e.d?!e.d||n.isZero()?(i=e.s<0?P(this,t,r):new this(0)).s=n.s:!n.d||e.isZero()?(i=P(this,s,1).times(.5)).s=n.s:i=e.s<0?(this.precision=s,this.rounding=1,i=this.atan(F(n,e,s,1)),e=P(this,s,1),this.precision=t,this.rounding=r,n.s<0?i.minus(e):i.plus(e)):this.atan(F(n,e,s,1)):(i=P(this,s,1).times(0<e.s?.25:.75)).s=n.s:i=new this(NaN),i}function on(n){return new this(n).cbrt()}function un(n){return _(n=new this(n),n.e+1,2)}function cn(n){if(!n||"object"!=typeof n)throw Error(f+"Object expected");var e,i,t,r=!0===n.defaults,s=["precision",1,g,"rounding",0,8,"toExpNeg",-u,0,"toExpPos",0,u,"maxE",0,u,"minE",-u,0,"modulo",0,9];for(e=0;e<s.length;e+=3)if(i=s[e],r&&(this[i]=c[i]),void 0!==(t=n[i])){if(!(L(t)===t&&s[e+1]<=t&&t<=s[e+2]))throw Error(w+i+": "+t);this[i]=t}if(i="crypto",r&&(this[i]=c[i]),void 0!==(t=n[i])){if(!0!==t&&!1!==t&&0!==t&&1!==t)throw Error(w+i+": "+t);if(t){if("undefined"==typeof crypto||!crypto||!crypto.getRandomValues&&!crypto.randomBytes)throw Error(a);this[i]=!0}else this[i]=!1}return this}function fn(n){return new this(n).cos()}function an(n){return new this(n).cosh()}function hn(n,e){return new this(n).div(e)}function ln(n){return new this(n).exp()}function dn(n){return _(n=new this(n),n.e+1,3)}function pn(){var n,e,i=new this(0);for(N=!1,n=0;n<arguments.length;)if((e=new this(arguments[n++])).d)i.d&&(i=i.plus(e.times(e)));else{if(e.s)return N=!0,new this(1/0);i=e}return N=!0,i.sqrt()}function gn(n){return n instanceof h||n&&"[object Decimal]"===n.name||!1}function mn(n){return new this(n).ln()}function wn(n,e){return new this(n).log(e)}function vn(n){return new this(n).log(2)}function Nn(n){return new this(n).log(10)}function bn(){return i(this,arguments,"lt")}function En(){return i(this,arguments,"gt")}function xn(n,e){return new this(n).mod(e)}function yn(n,e){return new this(n).mul(e)}function Mn(n,e){return new this(n).pow(e)}function qn(n){var e,i,t,r,s=0,o=new this(1),u=[];if(void 0===n?n=this.precision:q(n,1,g),t=Math.ceil(n/U),this.crypto)if(crypto.getRandomValues)for(e=crypto.getRandomValues(new Uint32Array(t));s<t;)429e7<=(r=e[s])?e[s]=crypto.getRandomValues(new Uint32Array(1))[0]:u[s++]=r%1e7;else{if(!crypto.randomBytes)throw Error(a);for(e=crypto.randomBytes(t*=4);s<t;)214e7<=(r=e[s]+(e[s+1]<<8)+(e[s+2]<<16)+((127&e[s+3])<<24))?crypto.randomBytes(4).copy(e,s):(u.push(r%1e7),s+=4);s=t/4}else for(;s<t;)u[s++]=1e7*Math.random()|0;for(t=u[--s],n%=U,t&&n&&(r=v(10,U-n),u[s]=(t/r|0)*r);0===u[s];s--)u.pop();if(s<0)u=[i=0];else{for(i=-1;0===u[0];i-=U)u.shift();for(t=1,r=u[0];10<=r;r/=10)t++;t<U&&(i-=U-t)}return o.e=i,o.d=u,o}function On(n){return _(n=new this(n),n.e+1,this.rounding)}function Dn(n){return(n=new this(n)).d?n.d[0]?n.s:0*n.s:n.s||NaN}function Fn(n){return new this(n).sin()}function An(n){return new this(n).sinh()}function Sn(n){return new this(n).sqrt()}function Zn(n,e){return new this(n).sub(e)}function Pn(n){return new this(n).tan()}function Rn(n){return new this(n).tanh()}function Ln(n){return _(n=new this(n),n.e+1,1)}(h=function n(e){var i,t,r;function s(n){var e,i,t,r=this;if(!(r instanceof s))return new s(n);if(n instanceof(r.constructor=s))return r.s=n.s,void(N?!n.d||n.e>s.maxE?(r.e=NaN,r.d=null):n.e<s.minE?(r.e=0,r.d=[0]):(r.e=n.e,r.d=n.d.slice()):(r.e=n.e,r.d=n.d?n.d.slice():n.d));if("number"==(t=typeof n)){if(0===n)return r.s=1/n<0?-1:1,r.e=0,void(r.d=[0]);if(r.s=n<0?(n=-n,-1):1,n===~~n&&n<1e7){for(e=0,i=n;10<=i;i/=10)e++;return void(r.d=N?s.maxE<e?(r.e=NaN,null):e<s.minE?[r.e=0]:(r.e=e,[n]):(r.e=e,[n]))}return 0*n!=0?(n||(r.s=NaN),r.e=NaN,void(r.d=null)):$(r,n.toString())}if("string"!==t)throw Error(w+n);return 45===n.charCodeAt(0)?(n=n.slice(1),r.s=-1):r.s=1,b.test(n)?$(r,n):function(n,e){var i,t,r,s,o,u,c,f,a;if("Infinity"===e||"NaN"===e)return+e||(n.s=NaN),n.e=NaN,n.d=null,n;if(d.test(e))i=16,e=e.toLowerCase();else if(l.test(e))i=2;else{if(!p.test(e))throw Error(w+e);i=8}for(o=0<=(s=(e=0<(s=e.search(/p/i))?(c=+e.slice(s+1),e.substring(2,s)):e.slice(2)).indexOf(".")),t=n.constructor,o&&(s=(u=(e=e.replace(".","")).length)-s,r=I(t,new t(i),s,2*s)),s=a=(f=D(e,i,T)).length-1;0===f[s];--s)f.pop();return s<0?new t(0*n.s):(n.e=S(f,a),n.d=f,N=!1,o&&(n=F(n,r,4*u)),c&&(n=n.times(Math.abs(c)<54?Math.pow(2,c):h.pow(2,c))),N=!0,n)}(r,n)}if(s.prototype=y,s.ROUND_UP=0,s.ROUND_DOWN=1,s.ROUND_CEIL=2,s.ROUND_FLOOR=3,s.ROUND_HALF_UP=4,s.ROUND_HALF_DOWN=5,s.ROUND_HALF_EVEN=6,s.ROUND_HALF_CEIL=7,s.ROUND_HALF_FLOOR=8,s.EUCLID=9,s.config=s.set=cn,s.clone=n,s.isDecimal=gn,s.abs=K,s.acos=Q,s.acosh=X,s.add=Y,s.asin=nn,s.asinh=en,s.atan=tn,s.atanh=rn,s.atan2=sn,s.cbrt=on,s.ceil=un,s.cos=fn,s.cosh=an,s.div=hn,s.exp=ln,s.floor=dn,s.hypot=pn,s.ln=mn,s.log=wn,s.log10=Nn,s.log2=vn,s.max=bn,s.min=En,s.mod=xn,s.mul=yn,s.pow=Mn,s.random=qn,s.round=On,s.sign=Dn,s.sin=Fn,s.sinh=An,s.sqrt=Sn,s.sub=Zn,s.tan=Pn,s.tanh=Rn,s.trunc=Ln,void 0===e&&(e={}),e&&!0!==e.defaults)for(r=["precision","rounding","toExpNeg","toExpPos","maxE","minE","modulo","crypto"],i=0;i<r.length;)e.hasOwnProperty(t=r[i++])||(e[t]=this[t]);return s.config(e),s}(c)).default=h.Decimal=h,t=new h(t),r=new h(r),"function"==typeof define&&define.amd?define(function(){return h}):"undefined"!=typeof module&&module.exports?("function"==typeof Symbol&&"symbol"==typeof Symbol.iterator&&(y[Symbol.for("nodejs.util.inspect.custom")]=y.toString,y[Symbol.toStringTag]="Decimal"),module.exports=h):(n||(n="undefined"!=typeof self&&self&&self.self==self?self:window),e=n.Decimal,h.noConflict=function(){return n.Decimal=e,h},n.Decimal=h)}(this);
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

/** Options for {@link Numbas.jme.rules.matchTree}.
 *
 * @typedef Numbas.jme.rules.matchTree_options
 * @type {object}
 * @property {boolean} commutative - Should the commutativity of operations be used? If `false`, terms must appear in the same order as in the pattern.
 * @property {boolean} associative - Should the associativity of operations be used? If `true`, all terms in nested applications of associative ops are gathered together before comparing.
 * @property {boolean} allowOtherTerms - When matching an associative op, if the expression contains terms that don't match any of the pattern, should they be ignored? If `false`, every term in the expression must match a term in the pattern.
 * @property {boolean} strictInverse - If `false`, `a-b` will be interpreted as `a+(-b)` when finding additive terms.
 * @property {Numbas.jme.Scope} scope - A JME scope in which to evaluate conditions.
 */

/** Parse a string specifying options for a Rule.
 *
 * @param {string} str
 * @returns {Numbas.jme.rules.matchTree_options}
 * @see Numbas.jme.rules.Rule
 */
function parse_options(str) {
    return {
        commutative: str.match(/c/) !== null,
        associative: str.match(/a/) !== null,
        allowOtherTerms: str.match(/g/) !== null,
        gatherList: str.match(/l/) !== null,
        strictInverse: str.match(/s/) !== null
    };
}

/** Override or extend a matchTree options object with new values.
 *
 * @memberof Numbas.jme.rules
 * @param {Numbas.jme.rules.matchTree_options} a
 * @param {Numbas.jme.rules.matchTree_options} b
 * @returns {Numbas.jme.rules.matchTree_options}
 */
var extend_options = Numbas.jme.rules.extend_options = function(a,b) {
    a = a || {};
    b = b || {};
    return {
        commutative: b.commutative===undefined ? a.commutative : b.commutative,
        associative: b.associative===undefined ? a.associative : b.associative,
        allowOtherTerms: b.allowOtherTerms===undefined ? a.allowOtherTerms : b.allowOtherTerms,
        gatherList: b.gatherList===undefined ? a.gatherList : b.gatherList,
        strictInverse: b.strictInverse===undefined ? a.strictInverse : b.strictInverse,
        scope: b.scope===undefined ? a.scope : b.scope
    };
}

/** Simplification rule.
 *
 * @memberof Numbas.jme.rules
 * @class
 *
 * @param {JME} pattern - Expression pattern to match. Variables will match any sub-expression.
 * @param {JME} result - Expression pattern to rewrite to.
 * @param {string|Numbas.jme.rules.matchTree_options} options
 * @param {string} [name] - A human-readable name for the rule
 *
 * @property {JME} patternString - The JME string defining the pattern to match.
 * @property {JME} resultString - The JME string defining the result of the rule.
 * @property {Numbas.jme.rules.matchTree_options} options - Default options for the match algorithm.
 * @property {JME} conditionStrings - JME strings defining the conditions.
 * @property {Numbas.jme.tree} patternTree - `patternString` compiled to a syntax tree.
 * @property {Numbas.jme.tree} result - The parameter `result` compiled to a syntax tree.
 * @property {Numbas.jme.tree[]} conditions - The parameter `conditions` compiled to syntax trees.
 */
var Rule = jme.rules.Rule = function(pattern,result,options,name) {
    this.name = name;
    this.patternString = pattern;
    this.pattern = patternParser.compile(pattern);
    if(typeof(options)=='string') {
        options = parse_options(options);
    }
    this.options = options || {};
    this.resultString = result;
    this.result = jme.compile(result);
}
Rule.prototype = /** @lends Numbas.jme.rules.Rule.prototype */ {
    toString: function() {
        return this.patternString+' -> '+this.resultString;
    },

    /** Extend this rule's default options with the given options.
     *
     * @param {Numbas.jme.rules.matchTree_options} options
     * @returns {Numbas.jme.rules.matchTree_options}
     */
    get_options: function(options) {
        if(!options) {
            return this.options;
        } else {
            return extend_options(this.options,options);
        }
    },
    /** Match a rule on given syntax tree.
     *
     * @memberof Numbas.jme.rules.Rule.prototype
     * @param {Numbas.jme.tree} exprTree - The syntax tree to test.
     * @param {Numbas.jme.Scope} scope - Used when checking conditions.
     * @returns {boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, or a dictionary of matched subtrees.
     * @see Numbas.jme.rules.matchTree
     */
    match: function(exprTree,scope) {
        return matchTree(this.pattern,exprTree,this.get_options({scope:scope}));
    },

    /** Find all matches for the rule, anywhere within the given expression.
     *
     * @param {Numbas.jme.tree} exprTree - The syntax tree to test.
     * @param {Numbas.jme.Scope} scope - Used when checking conditions.
     * @returns {Array.<Numbas.jme.rules.jme_pattern_match>}
     * @see {Numbas.jme.rules.matchAllTree}
     */
    matchAll: function(exprTree,scope) {
        return matchAllTree(this.pattern,exprTree,this.get_options({scope:scope}));
    },

    /** Transform the given expression if it matches this rule's pattern.
     *
     * @param {Numbas.jme.tree} exprTree - The syntax tree to transform.
     * @param {Numbas.jme.Scope} scope - Used when checking conditions.
     * @returns {Numbas.jme.rules.transform_result}
     * @see Numbas.jme.rules.transform
     */
    replace: function(exprTree,scope) {
        return transform(this.pattern, this.result, exprTree, this.get_options({scope:scope}));
    },

    /** Transform all occurences of this rule's pattern in the given expression.
     *
     * @param {Numbas.jme.tree} exprTree - The syntax tree to transform.
     * @param {Numbas.jme.Scope} scope - Used when checking conditions.
     * @returns {Numbas.jme.rules.transform_result}
     * @see Numbas.jme.rules.transform
     */
    replaceAll: function(exprTree,scope) {
        return transformAll(this.pattern, this.result, exprTree, this.get_options({scope: scope}));
    }
}

/** Options for {@link Numbas.jme.rules.getTerms}.
 *
 * @typedef Numbas.jme.rules.getTerms_options
 * @type {object}
 * @property {boolean} commutative - Should the operator be considered as commutative, for the purposes of matching ops with opposites? If yes, `a>c` will produce terms `c` and `a` when `op='<'`.
 * @property {boolean} associative - Should the operator be considered as associative? If yes, `(a+b)+c` will produce three terms `a`,`b` and `c`. If no, it will produce two terms, `(a+b)` and `c`.
 * @property {boolean} strictInverse - If `false`, `a-b` will be interpreted as `a+(-b)` when finding additive terms.
 */

/** Information to do with a term found in an expression by {@link Numbas.jme.rules.getTerms}.
 *
 * @typedef Numbas.jme.rules.term
 * @type {object}
 * @property {Numbas.jme.tree} term
 * @property {Array.<string>} names - Names captured by this term.
 * @property {Array.<string>} equalnames - Identified names captured by this term.
 * @property {string} quantifier - Code describing how many times the term can appear, if it's a pattern term.
 * @property {number} min - The minimum number of times the term must appear.
 * @property {number} max - The maximum number of times the term can appear.
 * @property {Numbas.jme.tree} defaultValue - A value to use if this term is missing.
 */

/** A term in a sequence.
 *
 * @class
 * @param {Numbas.jme.tree} tree
 * @property {Numbas.jme.tree} term
 * @property {Array.<string>} names - Names captured by this term.
 * @property {Array.<string>} equalnames - Identified names captured by this term.
 * @property {string} quantifier - Code describing how many times the term can appear, if it's a pattern term.
 * @property {number} min - The minimum number of times the term must appear.
 * @property {number} max - The maximum number of times the term can appear.
 * @property {Numbas.jme.tree} defaultValue - A value to use if this term is missing.
 */
var Term = Numbas.jme.rules.Term = function(tree) {
    var names = [];
    var inside_equalnames = [];
    var outside_equalnames = [];
    var equalnames = outside_equalnames;
    var quantifier = '1';
    var defaultValue = null;
    if(jme.isName(tree.tok,'$z')) {
        quantifier = '0';
    }
    var quantifier_combo = {
        '0': {'`?': '0', '`*': '0', '`+': '0', '`:': '0'},
        '1': {'`?': '`?', '`*': '`*', '`+': '`+', '`:': '`?'},
        '`?': {'`?': '`?', '`*': '`*', '`+': '`*', '`:': '`?'},
        '`*': {'`?': '`*', '`*': '`*', '`+': '`*', '`:': '`*'},
        '`+': {'`?': '`*', '`*': '`*', '`+': '`+', '`:': '`*'}
    };
    /** Unwrap quantifiers from the top of the tree.
     */
    while(tree.tok.type=='op') {
        var op = tree.tok.name;
        if(op==';') {
            names.push(tree.args[1]);
        } else if(op==';=') {
            names.push(tree.args[1]);
            equalnames.push(resolveName(tree.args[1]).name);
        } else if(op=='`?' || op=='`*' || op=='`+') {
            quantifier = quantifier_combo[quantifier][tree.tok.name];
            equalnames = inside_equalnames;
        } else if(op=='`:') {
            quantifier = quantifier_combo[quantifier][tree.tok.name];
            if(defaultValue===null) {
                defaultValue = tree.args[1];
            }
        } else if(tree.args.length==1 && tree.args[0].tok.type=='op' && ['`?','`*','`+','`:'].indexOf(tree.args[0].tok.name)>=0) {
            // pull quantifiers through unary operations, so "-(x`?)" is equivalent to "(-x)`?".
            tree = {tok:tree.args[0].tok, args: [{tok:tree.tok, args: tree.args[0].args}]};
            continue;
        } else {
            break;
        }
        tree = tree.args[0];
    }
    /** Find "identified names" - captured subexpressions which must be equal every time the name is captured - inside this tree.
     * These are the right-hand arguments of the `;=` operator.
     * Names found are appended to the list `equalnames`.
     *
     * @param {Numbas.jme.tree} tree
     */
    function find_equal_names(tree) {
        if(tree.tok.type=='op') {
            switch(tree.tok.name) {
                case ';=':
                    equalnames.push(resolveName(tree.args[1]).name);
                    break;
                case '`+':
                case '`?':
                case '`*':
                    return;
            }
        }
        if(tree.args) {
            tree.args.forEach(find_equal_names);
        }
    }
    find_equal_names(tree);

    this.term = tree;
    this.names = names;
    this.inside_equalnames = inside_equalnames;
    this.outside_equalnames = outside_equalnames;
    this.quantifier = quantifier;
    this.min = quantifier_limits[quantifier][0];
    this.max = quantifier_limits[quantifier][1];
    this.defaultValue = defaultValue;
}

/** Replacements to make when identifying terms in a sequence of applications of a given op.
 * When looking for terms joined by `op`, `nonStrictReplacements[op]` is a list of objects with keys `op` and `replacement`. 
 * A tree `A op B` should be replaced with `replacement(tree)`.
 * For example, `x-y` should be rewritten to `x+(-y)`.
 */
var nonStrictReplacements = {
    '+': {
        '-': function(tree) {
            return {tok: new jme.types.TOp('+',false,false,2,true,true), args: [tree.args[0],insertUnaryMinus(tree.args[1])]};
        }
    },
    '*': { 
        '/': function(tree) {
            tree = {tok: new jme.types.TOp('*',false,false,2,true,true), args: [tree.args[0],{tok:new jme.types.TOp('/u',false,true,1,false,false),args:[tree.args[1]]}]};
            return tree;
        }
    }
};

/** Dictionary of 'canonical' ops to match in non-strict mode.
 * For example, `a-b` will be matched as `a+(-b)`.
 */
var nonStrictCanonicalOps = {
    '-': '+',
    '/': '*'
}

/** Insert a unary minus in this tree.
 * If it's a product, the minus applies to the leftmost factor.
 *
 * @param {Numbas.jme.tree} tree
 * @returns {Numbas.jme.tree}
 */
function insertUnaryMinus(tree) {
    if(jme.isOp(tree.tok,'*')) {
        return {tok: tree.tok, args: [insertUnaryMinus(tree.args[0]),tree.args[1]]};
    } else if(jme.isOp(tree.tok,'/')) {
        return {tok: tree.tok, args: [insertUnaryMinus(tree.args[0]),tree.args[1]]};
    } else {
        return {tok: new jme.types.TOp('-u',false,true,1,false,false), args: [tree]};
    }
}

/** Remove capturing operators ; and ;= from the top of a tree.
 *
 * @param {Numbas.jme.tree} tree
 * @returns {object} - `tree`: the unwrapped tree, `names`: a list of names removed, `equalnames`: a list of identified names removed
 */
function unwrapCapture(tree) {
    var names = [];
    var equalnames = [];
    while(jme.isOp(tree.tok,';')) {
        names.push(tree.args[1]);
        tree = tree.args[0];
    }
    while(jme.isOp(tree.tok,';=')) {
        names.push(tree.args[1]);
        equalnames.push(resolveName(tree.args[1]).name);
        tree = tree.args[0];
    }

    return {tree:tree, names:names, equalnames: equalnames};
}

/** Given a tree representing a series of terms t1 <op> t2 <op> t3 <op> ..., return the terms as a list.
 *
 * @memberof Numbas.jme.rules
 * @param {Numbas.jme.tree} tree - The tree to find terms in.
 * @param {string} op - The name of the operator whose terms are to be found.
 * @param {Numbas.jme.rules.getTerms_options} options
 * @param {boolean} calculate_minimum - Should the minimum allowed number of occurrences of each term be calculated? This is a pre-process step when getting the terms in a pattern expression.
 * @returns {Array.<Numbas.jme.rules.term>}
 */
var getTerms = Numbas.jme.rules.getTerms = function(tree,op,options,calculate_minimum) {
    /** Add the list of existing names passed in at the start to each term.
     *
     * @param {Array.<Numbas.jme.rules.term>} items
     * @param {Array.<Numbas.jme.tree>} existing_names - Names captured higher up the tree.
     * @param {Array.<Numbas.jme.tree>} existing_equal_names - Identified names captured higher up the tree.
     * @returns {Array.<Numbas.jme.rules.term>}
     */
    function add_existing_names(items,existing_names,existing_equal_names) {
        return existing_names.length==0 && existing_equal_names.length==0 ? items : items.map(function(item) {
            return {
                term: item.term, 
                names: existing_names.concat(item.names),
                inside_equalnames: item.inside_equalnames,
                outside_equalnames: existing_equal_names.concat(item.outside_equalnames),
                quantifier: item.quantifier, 
                min: item.min, 
                max: item.max,
                defaultValue: item.defaultValue,
            };
        });
    }

    // we'll cache the results of this call in the tree object, to save time if the same thing is asked for again
    var intree = tree;
    if(intree.terms === undefined) {
        intree.terms = {};
    }
    if(intree.terms[op] === undefined) {
        intree.terms[op] = {};
    }
    var option_signature = options.associative*2 + (options.strictInverse);

    if(intree.terms[op][option_signature]) {
        return intree.terms[op][option_signature];
    }


    if(jme.isOp(tree.tok,'-u') && op=='*') {
        tree = insertUnaryMinus(tree.args[0]);
    }

    if(!options.strictInverse && op in nonStrictReplacements) {
        for(var subop in nonStrictReplacements[op]) {
            if(jme.isOp(tree.tok,subop)) {
                tree = nonStrictReplacements[op][subop](tree);
            }
        };
    }

    /** Is the given token the op we're looking for?
     * True if it's literally that operator, it's the converse of that operator, or it would be replaced to that op in non-strict mode.
     *
     * @param {Numbas.jme.token} tok
     * @returns {boolean}
     */
    function isThisOp(tok) {
        if(jme.isOp(tok,op)) {
            return true;
        }
        if(options.commutative && jme.converseOps[op] && jme.isOp(tok,jme.converseOps[op])) {
            return true;
        }
        if(!options.strictInverse && op in nonStrictReplacements && tok.type=='op' && tok.name in nonStrictReplacements[op]) {
            return true;
        }
    }

    var args = jme.isOp(tree.tok,op) ? tree.args : [tree];
    if(options.commutative && jme.converseOps[op] && jme.isOp(tree.tok,jme.converseOps[op])) {
        args = tree.args.slice().reverse();
    }

    var terms = [];

    for(var i=0; i<args.length;i++) {
        var arg = args[i];
        var item = new Term(arg);
        var res = unwrapCapture(arg);
        var argtok = res.tree.tok;
        if(op=='*' && jme.isOp(argtok,'-u')) {
            argtok = unwrapCapture(args[i].args[0]).tree.tok;
        }
        if(options.associative && (isThisOp(argtok) || (!options.strictInverse && op=='+' && jme.isOp(argtok,'-')))) {
            var sub = getTerms(res.tree,op,options,false);
            sub = add_existing_names(sub,item.names,item.outside_equalnames);
            if(item.quantifier!='1') {
                sub = sub.map(function(t){ t.quantifier = quantifier_combo[t.quantifier][item.quantifier]; });
            }
            terms = terms.concat(sub);
        } else {
            if(item.max>0) {
                terms.push(item);
            }
        }
    }

    if(calculate_minimum) {
        terms.min_total = 0;
        terms.forEach(function(t) {
            terms.min_total += t.min;
        });
    }

    intree.terms[op][option_signature] = terms;
    return terms;
}

/** The `_match` name in a match object stores the whole tree that matched the pattern.
 * This function makes sure that `_match` is set, setting it to the given tree if it's missing.
 *
 * @param {Numbas.jme.rules.jme_pattern_match} m
 * @param {Numbas.jme.tree} exprTree
 * @returns {Numbas.jme.rules.jme_pattern_match}
 */
function preserve_match(m,exprTree) {
    if(m===false) {
        return false;
    }
    if(m._match===undefined) {
        m._match = exprTree;
    }
    return m;
}

/** A dictionary representing the results of a successful JME pattern match.
 * Maps variable names to trees.
 *
 * @typedef Numbas.jme.rules.jme_pattern_match
 * @type {object.<Numbas.jme.tree>}
 * @see {Numbas.jme.rules#matchTree}
 */

/** Recursively check whether `exprTree` matches `ruleTree`. Variables in `ruleTree` match any subtree.
 *
 * @function
 * @memberof Numbas.jme.rules
 *
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options - Options specifying the behaviour of the matching algorithm.
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names.
 */
var matchTree = jme.rules.matchTree = function(ruleTree,exprTree,options) {
    var m = (function() {
        if(!exprTree)
            return false;
        var ruleTok = ruleTree.tok;
        var exprTok = exprTree.tok;
        if(jme.isOp(ruleTok,';') || jme.isOp(ruleTok,';=')) {
            var m = matchTree(ruleTree.args[0],exprTree,options);
            if(!m) {
                return false;
            }
            var o = resolveName(ruleTree.args[1],m._match);
            m[o.name] = o.value;
            return m;
        }

        switch(ruleTok.type) {
            case 'name':
                return matchName(ruleTree,exprTree,options);
            case 'function':
                return matchFunction(ruleTree,exprTree,options);
            case 'op':
                return matchOp(ruleTree,exprTree,options);
            case 'list':
                return matchList(ruleTree,exprTree,options);
            default:
                return matchToken(ruleTree,exprTree,options);
        }
    })();
    return preserve_match(m,exprTree);
}

/** Conditions for the `$n` rule.
 *
 * @enum {Function}
 * @memberof Numbas.jme.rules
 */
var number_conditions = jme.rules.number_conditions = {
    'complex': function(exprTree) {
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return tok.value.complex;
    },
    'imaginary': function(exprTree) {
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return tok.value.complex && Numbas.math.re(tok.value)==0;
    },
    'real': function(exprTree) {
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return Numbas.math.im(tok.value)==0;
    },
    'positive': function(exprTree) {
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return Numbas.math.positive(tok.value);
    },
    'nonnegative': function(exprTree) {
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return Numbas.math.nonnegative(tok.value);
    },
    'negative': function(exprTree) {
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return Numbas.math.negative(tok.value);
    },
    'integer': function(exprTree) {
        if(exprTree.tok.type=='integer') {
            return true;
        }
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return Numbas.util.isInt(tok.value);
    },
    'decimal': function(exprTree) {
        try {
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e) {
            return false;
        }
        return Numbas.math.countDP(exprTree.tok.originalValue)>0;
    },
    'rational': function(exprTree,options) {
        if(exprTree.tok.type=='rational') {
            return true;
        }
        return matchTree(patternParser.compile('integer:$n/integer:$n`?'),exprTree,options);
    }
}

/** Special JME names used in pattern-matching.
 *
 * @enum {Function}
 * @memberof Numbas.jme.rules
 */
var specialMatchNames = jme.rules.specialMatchNames = {
    '?': function(ruleTree,exprTree,options) {
        return {};
    },
    '$n': function(ruleTree,exprTree,options) {
        var ruleTok = ruleTree.tok;
        var exprTok = exprTree.tok;
        if(ruleTok.annotation!==undefined) {
            var satisfies = ruleTok.annotation.every(function(condition) {
                var test = number_conditions[condition];
                return !test || test(exprTree,options);
            });
            if(!satisfies) {
                return false;
            }
        } else {
            if(!jme.isType(exprTok,'number')) {
                return false;
            }
        }
        return {};
    },
    '$v': function(ruleTree,exprTree,options) {
        var exprTok = exprTree.tok;
        if(exprTok.type!='name') {
            return false;
        }
        return {};
    },
    '$z': function(ruleTree,exprTree,options) {
        return false;
    }
}

/** Match a name token. `?` matches any name, `$n` matches a number, with constraints specified by annotations, `$z` never matches.
 * Otherwise, the name matches if the expression being considered is exactly the same name, ignoring case.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match. The top token is assumed to be a name.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 * @see Numbas.jme.rules.number_conditions
 */
function matchName(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(ruleTok.type!='name') {
        return false;
    }
    if(ruleTok.nameWithoutAnnotation in specialMatchNames) {
        return specialMatchNames[ruleTok.nameWithoutAnnotation](ruleTree,exprTree,options);
    } else {
        if(exprTok.type!='name') {
            return false;
        }
        var same = ruleTok.name.toLowerCase()==exprTok.name.toLowerCase();
        return same ? {} : false;
    }
}

/** Make a matching function which overrides one or more matching options, then calls {@link Numbas.jme.rules.matchTree}.
 *
 * @param {Numbas.jme.rules.matchTree_options} new_options
 * @returns {Function}
 */
function setMatchOptions(new_options) {
    return function(ruleTree,exprTree,options) {
        return matchTree(ruleTree.args[0],exprTree,extend_options(options,new_options));
    }
}

/** Match if the given pattern occurs as a subexpression anywhere in the given expression.
 *
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchAnywhere(ruleTree,exprTree,options) {
    var m = matchTree(ruleTree,exprTree,options);
    if(m!==false) {
        return m;
    }
    if(exprTree.args) {
        for(var i=0;i<exprTree.args.length;i++) {
            var am = matchAnywhere(ruleTree,exprTree.args[i],options);
            if(am!==false)  {
                return am;
            }
        }
    }
    return false;
}

/** Special JME functions used in pattern-matching.
 * 
 * @enum {Function}
 * @memberof Numbas.jme.rules
 */
var specialMatchFunctions = jme.rules.specialMatchFunctions = {
    'm_uses': function(ruleTree,exprTree,options) {
        var names = ruleTree.args.map(function(t){ return t.tok.name; });
        return matchUses(names,exprTree);
    },
    'm_exactly': setMatchOptions({allowOtherTerms:false}),
    'm_commutative': setMatchOptions({commutative:true}),
    'm_noncommutative': setMatchOptions({commutative:false}),
    'm_associative': setMatchOptions({associative:true}),
    'm_nonassociative': setMatchOptions({associative:false}),
    'm_strictinverse': setMatchOptions({strictInverse:true}),
    'm_gather': setMatchOptions({gatherList:false}),
    'm_nogather': setMatchOptions({gatherList:true}),
    'm_type': function(ruleTree,exprTree,options) {
        var wantedType = ruleTree.args[0].tok.name || ruleTree.args[0].tok.value;
        return matchType(wantedType,exprTree);
    },
    'm_func': function(ruleTree,exprTree,options) {
        return matchGenericFunction(ruleTree,exprTree,options);
    },
    'm_op': function(ruleTree,exprTree,options) {
        return matchGenericOp(ruleTree,exprTree,options);
    },
    'm_anywhere': function(ruleTree,exprTree,options) {
        return matchAnywhere(ruleTree.args[0],exprTree,options);
    }
}

/** Match the application of a function.
 * Dispatches to one of the special pattern-matching functions, or {@link matchOrdinaryFunction} otherwise.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchFunction(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(ruleTok.type!='function') {
        return false;
    }
    if(ruleTok.nameWithoutAnnotation in specialMatchFunctions) {
        return specialMatchFunctions[ruleTok.nameWithoutAnnotation](ruleTree,exprTree,options);
    } else { 
        return matchOrdinaryFunction(ruleTree,exprTree,options);
    }
}

/** Match the application of any function. The first argument of `ruleTree` is a pattern that the function's name, considered as a string, must satisfy, and the second argument is a pattern that the function's arguments, considered as a list, must satisfy.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchGenericFunction(ruleTree,exprTree,options) {
    if(exprTree.tok.type!='function') {
        return false;
    }
    var nameRule = ruleTree.args[0];
    var argsRule = ruleTree.args[1];
    var exprNameTree = {tok: new jme.types.TString(exprTree.tok.name)};
    var argsTree = {tok: new jme.types.TList(), args: exprTree.args};
    var m_name = matchTree(nameRule, exprNameTree, options);
    var m_args = matchTree(argsRule, argsTree, options);
    if(m_name && m_args) {
        return mergeMatches([m_name,m_args]);
    } else {
        return false;
    }
}

/** Match the application of any operator. The first argument of `ruleTree` is a pattern that the operator's name, considered as a string, must satisfy, and the second argument is a pattern that the operator's arguments, considered as a list, must satisfy.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchGenericOp(ruleTree,exprTree,options) {
    if(exprTree.tok.type!='op') {
        return false;
    }
    var nameRule = ruleTree.args[0];
    var argsRule = ruleTree.args[1];
    var exprNameTree = {tok: new jme.types.TString(exprTree.tok.name)};
    var argsTree = {tok: new jme.types.TList(), args: exprTree.args};
    var m_name = matchTree(nameRule, exprNameTree, options);
    var m_args = matchTree(argsRule, argsTree, options);
    if(m_name && m_args) {
        return mergeMatches([m_name,m_args]);
    } else {
        return false;
    }
}

/** Special JME operators used in pattern-matching.
 *
 * @enum {Function}
 * @memberof Numbas.jme.rules
 */
var specialMatchOps = jme.rules.specialMatchOps = {
    '`?': function(ruleTree,exprTree,options) {
        return matchTree(ruleTree.args[0],exprTree,options);
    },
    '`*': function(ruleTree,exprTree,options) {
        return matchTree(ruleTree.args[0],exprTree,options);
    },
    '`+': function(ruleTree,exprTree,options) {
        return matchTree(ruleTree.args[0],exprTree,options);
    },
    '`|': function(ruleTree,exprTree,options) {
        return matchAny(ruleTree.args,exprTree,options);
    },
    '`:': function(ruleTree,exprTree,options) {
        return matchDefault(ruleTree.args[0],ruleTree.args[1],exprTree,options);
    },
    '`+-': function(ruleTree,exprTree,options) {
        return matchOptionalPrefix(['-u','+u'],ruleTree.args[0],exprTree,options);
    },
    '`*/': function(ruleTree,exprTree,options) {
        return matchOptionalPrefix(['/u'],ruleTree.args[0],exprTree,options);
    },
    '`!': function(ruleTree,exprTree,options) {
        return matchNot(ruleTree.args[0],exprTree,options);
    },
    '`&': function(ruleTree,exprTree,options) {
        return matchAnd(ruleTree.args,exprTree,options);
    },
    '`where': function(ruleTree,exprTree,options) {
        return matchWhere(ruleTree.args[0],ruleTree.args[1],exprTree,options);
    },
    '`@': function(ruleTree,exprTree,options) {
        return matchMacro(ruleTree.args[0],ruleTree.args[1],exprTree,options);
    }
}

/** Match an application of an operator.
 * Dispatches to one of the special pattern-matching operators, or {@link matchOrdinaryOp} otherwise.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match. It's assumed that the topmost token is an operator.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    if(ruleTok.type!='op') {
        return false;
    }
    if(ruleTok.name in specialMatchOps) {
        return specialMatchOps[ruleTok.name](ruleTree,exprTree,options);
    } else {
        return matchOrdinaryOp(ruleTree,exprTree,options);
    }
}

/** Match a `where` condition - the expression must match the given pattern, and the condition specified in terms of the matched names must evaluate to `true`.
 *
 * @param {Numbas.jme.tree} pattern - The pattern to match.
 * @param {Numbas.jme.tree} condition - The condition to evaluate.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchWhere(pattern,condition,exprTree,options) {
    var scope = new Numbas.jme.Scope(options.scope);

    var m = matchTree(pattern,exprTree,options);
    if(!m) {
        return false;
    }

    condition = Numbas.util.copyobj(condition,true);
    condition = jme.substituteTree(condition,new jme.Scope([{variables:m}]));
    try {
        var result = scope.evaluate(condition,null,true);
        if(result.type=='boolean' && result.value==false) {
            return false;
        }
    } catch(e) {
        return false;
    }
    return m;
}

/** Substitute sub-patterns into a bigger pattern before matching.
 *
 * @param {Numbas.jme.tree} subPatterns - A dictionary of patterns.
 * @param {Numbas.jme.tree} pattern - The pattern to substitute into.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchMacro(subPatterns, pattern, exprTree, options) {
    if(subPatterns.tok.type!='dict') {
        throw(new Numbas.Error('jme.matchTree.match macro first argument not a dictionary'));
    }
    var d = {}
    subPatterns.args.forEach(function(keypair) {
        var name = keypair.tok.key;
        var tree = keypair.args[0];
        d[name] = tree;
    });
    pattern = jme.substituteTree(pattern,new jme.Scope([{variables:d}]),true);
    return matchTree(pattern,exprTree,options)
}

/** Match the application of a function.
 * Matches if the expression is the application of the same function, and all of the arguments match the arguments of the pattern.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchOrdinaryFunction(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(exprTok.type!='function' || (ruleTok.name!='?' && ruleTok.name!=exprTok.name)) {
        return false;
    }
    var ruleArgs = ruleTree.args.map(function(t){ return new Term(t); });
    var exprArgs = exprTree.args.map(function(t){ return new Term(t); });

    options = extend_options(options,{allowOtherTerms:false, commutative: false});

    var namedTerms = matchTermSequence(ruleArgs,exprArgs,false,false,options);
    if(namedTerms===false) {
        return false;
    }

    /** Is the given name captured by this tree?
     *
     * @param {string} name
     * @param {Numbas.jme.tree} tree
     * @returns {boolean}
     */
    function name_captured(name,tree) {
        if(jme.isOp(tree.tok,';')) {
            var res = resolveName(tree.args[1]);
            if(res.name==name) {
                return true;
            }
        }
        if(tree.args) {
            return tree.args.some(function(t2){ return name_captured(name,t2); });
        }
        return false;
    }

    // collate the named groups
    var match = {};
    for(var name in namedTerms) {
        var occurrences = 0;
        for(var i=0;i<ruleTree.args.length;i++) {
            if(name_captured(name,ruleTree.args[i])) {
                occurrences += 1;
            }
        }
        var terms = namedTerms[name];
        match[name] = occurrences<=1 ? terms[0] : {tok: new jme.types.TList(terms.length), args: terms};
    }
    return match;
}

/** Match the given expression against the given pattern, which is assumed to be a list.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchList(ruleTree,exprTree,options) {
    if(exprTree.tok.type!='list') {
        return false;
    }
    /** Get the elements of a list. If it's been evaluated, the elements will be stored as the token's value. Otherwise, they're the arguments of the tree.
     *
     * @param {Numbas.jme.tree} list
     * @returns {Array.<Numbas.jme.tree>}
     */
    function getElements(list) {
        if(list.args) {
            return list.args;
        } else {
            return list.tok.value.map(function(e) { return {tok: e}; });
        }
    }
    var ruleElements = getElements(ruleTree).map(function(t){ return new Term(t) });
    var exprElements = getElements(exprTree).map(function(t){ return new Term(t); });

    options = extend_options(options,{allowOtherTerms:false});

    var namedTerms = matchTermSequence(ruleElements,exprElements,false,false,options);
    if(namedTerms===false) {
        return false;
    }

    // collate the named groups
    var match = {};
    for(var name in namedTerms) {
        var terms = namedTerms[name];
        match[name] = {tok: new jme.types.TList(terms.length), args: terms};
    }
    return match;
}

/** Match an exact token - the expression must be the same type, and equal to, the rule token.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.jme_pattern_match}
 */
function matchToken(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    return util.eq(ruleTok,exprTok) ? {} : false;
}

/** How many times must a quantifier match? First element is minimum number of occurrences, second element is maximum.
 */
var quantifier_limits = {
    '0': [0,0],
    '1': [1,1],
    '`?': [0,1],
    '`*': [0,Infinity],
    '`+': [1,Infinity]
};

/** Resolve the name and value to store when capturing a subexpression.
 *
 * @param {Numbas.jme.tree} nameTree - The right-hand side of the `;` capturing operator. Either a name, or a keypair giving a name and the value to store.
 * @param {Numbas.jme.tree} value - The value to store, if `nameTree` doesn't override it.
 * @returns {object} - `name` is the name to store under, and `value` is the value.
 */
function resolveName(nameTree,value) {
    var nameTok = nameTree.tok;
    if(!(nameTok.type=='name' || nameTok.type=='keypair')) {
        throw(new Numbas.Error('jme.matchTree.group name not a name'));
    }
    var name;
    if(nameTok.type=='name') {
        name = nameTok.name;
    } else if(nameTok.type=='keypair') {
        name = nameTok.key;
        value = nameTree.args[0];
    }
    return {name: name, value: value};
}

/** Find names captured by this pattern.
 *
 * @param {Numbas.jme.tree} ruleTree
 * @returns {Array.<string>}
 */
var findCapturedNames = jme.rules.findCapturedNames = function(ruleTree) {
    var tok = ruleTree.tok;
    var names = [];
    if(jme.isOp(tok,';') || jme.isOp(tok,';=')) {
        var res = resolveName(ruleTree.args[1]);
        names.push(res.name);
    }
    if(ruleTree.args) {
        for(var i=0;i<ruleTree.args.length;i++) {
            var argnames = findCapturedNames(ruleTree.args[i]);
            names = names.merge(argnames);
        }
    }
    return names;
}

/** Remove unary divisions from a tree.
 * They're only introduced to make pattern-matching products work more easily, and are a hassle to deal with elsewhere.
 * Expressions of the form `a*(/b)` are replaced with `a/b`.
 *
 * @param {Numbas.jme.tree} tree
 * @returns {Numbas.jme.tree}
 */
function removeUnaryDivision(tree) {
    if(jme.isOp(tree.tok,'*')) {
        if(jme.isOp(tree.args[1].tok,'/u')) {
            return {tok: new Numbas.jme.types.TOp('/',false,false,2,false,false), args: [removeUnaryDivision(tree.args[0]),removeUnaryDivision(tree.args[1].args[0])]};
        }
        return {tok: tree.tok, args: tree.args.map(removeUnaryDivision)}
    }
    if(jme.isOp(tree.tok,'/u')) {
        return {tok: new Numbas.jme.types.TOp('/',false,false,2,false,false), args: [{tok:new Numbas.jme.types.TNum(1)},removeUnaryDivision(tree.args[0])]};
    }
    return tree;
}

/** Match an expression against a pattern which is an application of an operator to one or more terms.
 * Assuming that the pattern and the expression trees are each a sequence of terms joined by the same operator, find the terms of each, and try to match them up, obeying quantifiers in the pattern.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern to match, whose top token must be an operator.
 * @param {Numbas.jme.tree} exprTree - The expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Numbas.jme.jme_pattern_match}
 */
function matchOrdinaryOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    var op = ruleTok.name;
    var commuting = options.commutative && ruleTok.commutative;
    var associating = options.associative && ruleTok.associative;
    if(!options.strictInverse && nonStrictCanonicalOps[op]) {
        op = nonStrictCanonicalOps[op];
        commuting = options.commutative && jme.commutative[op];
        associating = options.associative && jme.associative[op];
    }
    var term_options = {commutative: options.commutative, associative: associating, strictInverse: options.strictInverse};
    var ruleTerms = getTerms(ruleTree,op,term_options,true);
    var exprTerms = getTerms(exprTree,op,term_options,false);
    if(exprTerms.length<ruleTerms.min_total) {
        return false;
    }

    if(!associating) {
        if(!jme.isOp(exprTok,op) && ruleTerms.length==1) {
            return false;
        }
    }

    var namedTerms = matchTermSequence(ruleTerms,exprTerms,commuting,options.allowOtherTerms && associating, options);
    if(namedTerms===false) {
        return false;
    }

    // collate the named groups
    var match = {};
    for(var name in namedTerms) {
        var terms = namedTerms[name];
        if(terms.length==1) {
            match[name] = removeUnaryDivision(terms[0]);
        } else if(options.gatherList) {
            match[name] = {tok: new jme.types.TList(terms.length), args: terms.map(function(t){ return {tok: new jme.types.TExpression(removeUnaryDivision(t))} })};
        } else {
            var sub = terms[0];
            for(var i=1;i<terms.length;i++) {
                sub = {tok: new jme.types.TOp(op), args: [sub,terms[i]]};
            }
            if(op=='*') {
                sub = removeUnaryDivision(sub);
            }
            match[name] = sub;
        }
    }
    match['__op__'] = op;

    return match;
}

/** Match a sequence of terms.
 * Calls {@link Numbas.jme.rules.findSequenceMatch}, and uses {@link Numbas.jme.rules.matchTree} to match individual terms up.
 *
 * @param {Array.<Numbas.jme.rules.Term>} ruleTerms - The terms in the pattern.
 * @param {Array.<Numbas.jme.rules.Term>} exprTerms - The terms in the expression.
 * @param {boolean} commuting - Can the terms match in any order?
 * @param {boolean} allowOtherTerms - Allow extra terms which don't match any of the pattern terms?
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|object.<Numbas.jme.jme_pattern_match>} - False if no match, or a dictionary mapping names to lists of subexpressions matching those names (it's up to whatever called this to join together subexpressions matched under the same name).
 */
function matchTermSequence(ruleTerms, exprTerms, commuting, allowOtherTerms, options) {
    var matches = {};
    exprTerms.forEach(function(_,i){ matches[i] = {} });

    /** Does the given input term match the given rule term?
     * The indices of the input and rule terms are given so the result of the match can be cached.
     *
     * @param {Numbas.jme.rules.term} exprTerm - The input term.
     * @param {Numbas.jme.rules.term} ruleTerm - The term in the pattern which must be matched.
     * @param {number} ic - The index of the input term.
     * @param {number} pc - The index of the rule term.
     * @returns {boolean}
     */
    function term_ok(exprTerm,ruleTerm,ic,pc) {
        if(matches[ic][pc]===undefined) {
            var m = matchTree(ruleTerm.term,exprTerm.term,options);
            var inside_equalnames = {};
            ruleTerm.inside_equalnames.forEach(function(name) {
                if(m[name]) {
                    inside_equalnames[name] = m[name];
                } else if(ruleTerm.names.some(function(n){return resolveName(n).name==name})) {
                    inside_equalnames[name] = m._match;
                }
            });
            var outside_equalnames = {};
            ruleTerm.outside_equalnames.forEach(function(name) {
                if(m[name]) {
                    outside_equalnames[name] = m[name];
                } else if(ruleTerm.names.some(function(n){return resolveName(n).name==name})) {
                    outside_equalnames[name] = m._match;
                }
            });
            matches[ic][pc] = {
                match: m,
                inside_equalnames: inside_equalnames,
                outside_equalnames: outside_equalnames
            }
        }
        return matches[ic][pc].match!==false; 
    }

    /** Does the given assignment satisfy the constraints of the matching algorithm?
     * At the moment, the only constraint is that all subexpressions matched with the same name using the `;=` operator must be equal, according to {@link Numbas.jme.compareTrees}.
     *
     * @param {object} assignment - The result of {@link Numbas.jme.rules.findSequenceMatch}.
     * @param {number} ic - The current index in the list of input terms. Only matches introduced by this term are considered - previous terms are assumed to have already passed the constraint check.
     * @param {number} pc - The current index in the list of pattern terms.
     * @returns {boolean}
     */
    function constraint_ok(assignment,ic,pc) {
        var m1 = matches[ic][pc];
        var ruleTerm = ruleTerms[pc];
        if(ruleTerm.inside_equalnames.length==0 && ruleTerm.outside_equalnames.length==0) {
            return true;
        }
        var ok = assignment.every(function(p,i) {
            if(p<0 || p>=ruleTerms.length) {
                return true;
            }
            var m2 = matches[i][p];
            var equalnames = p==pc ? 'inside_equalnames' : 'outside_equalnames';
            return ruleTerm[equalnames].every(function(name) {
                var e1 = m1[equalnames][name];
                var e2 = m2[equalnames][name];
                if(e1===undefined || e2===undefined) {
                    return true;
                }
                var res = jme.compareTrees(e1, e2) == 0;
                return res;
            });
        });
        return ok;
    }

    var assignment = findSequenceMatch(ruleTerms,exprTerms,{checkFn: term_ok, constraintFn: constraint_ok, commutative: commuting, allowOtherTerms: allowOtherTerms});
    if(assignment===false) {
        return false;
    }

    var namedTerms = {};

    var identified_names = {};
    ruleTerms.forEach(function(ruleTerm,i) {
        var equalnames = ruleTerm.outside_equalnames;
        equalnames.forEach(function(name) {
            identified_names[name] = identified_names[name] || ruleTerm;
        });
    });
    /** Record that `exprTree` was captured with the given name.
     *
     * @param {string} name
     * @param {Numbas.jme.tree} exprTree
     * @param {Numbas.jme.rules.Term} ruleTerm
     * @param {boolean} allowReservedName - If `false`, reserved names such as `_match` and `_rest`, which are introduced by the matching algorithm, will be ignored.
     */
    function nameTerm(name,exprTree,ruleTerm,allowReservedName) {
        if(!allowReservedName && name.match(/^_/)) {
            return;
        }
        if(!namedTerms[name]) {
            namedTerms[name] = [];
        }
        if(identified_names[name]!==undefined && identified_names[name]!==ruleTerm && namedTerms[name].length) {
            return;
        }
        namedTerms[name].push(exprTree);
    }
    /** Record that `exprTree` was matched against `ruleTerm` - add `exprTree` to all of `ruleTerm`'s names.
     *
     * @param {Numbas.jme.rules.term} ruleTerm
     * @param {Numbas.jme.tree} exprTree
     */
    function matchTerm(ruleTerm,exprTree){ 
        ruleTerm.names.forEach(function(name) {
            var o = resolveName(name,exprTree);
            nameTerm(o.name,o.value,ruleTerm);
        });
    }

    assignment.result.forEach(function(is,j) {
        var ruleTerm = ruleTerms[j];

        if(is.length) {
            is.forEach(function(i) {
                var match = matches[i][j].match;
                for(var name in match) {
                    nameTerm(name,match[name],ruleTerm);
                }
                matchTerm(ruleTerm,exprTerms[i].term);
            });
        } else if(ruleTerm.defaultValue) {
            matchTerm(ruleTerm,ruleTerm.defaultValue);
        }
    });
    assignment.ignored_start_terms.forEach(function(i) {
        nameTerm('_rest',exprTerms[i].term,undefined,true);
        nameTerm('_rest_start',exprTerms[i].term,undefined,true);
    });
    assignment.ignored_end_terms.forEach(function(i) {
        nameTerm('_rest',exprTerms[i].term,undefined,true);
        nameTerm('_rest_end',exprTerms[i].term,undefined,true);
    });

    return namedTerms;
}

/** Options for {@link Numbas.jme.rules.findSequenceMatch}.
 *
 * @type {object}
 * @typedef Numbas.jme.rules.findSequenceMatch_options
 * @property {boolean} allowOtherTerms - If `true`, terms that don't match any term in the pattern can be ignored.
 * @property {boolean} commutative - Can the input terms be considered in any order?
 * @property {Function} constraintFn - Function to test if the current set of matches satisfies constraints.
 * @property {Function} checkFn - Function to test if an input term matches a given pattern term.
 */

/** Match a sequence of terms against a given pattern sequence of terms.
 * Try to find an assignment of input terms to the pattern, satisfying the quantifier for each term in the pattern.
 * The match is greedy - input terms will match earlier pattern terms in preference to later ones.
 *
 * @function
 * @memberof Numbas.jme.rules
 *
 * @param {Array.<Numbas.jme.rules.term>} pattern
 * @param {Array.<Numbas.jme.tree>} input
 * @param {Numbas.jme.rules.findSequenceMatch_options} options
 * @returns {object} - `ignored_start_terms` is terms at the start that weren't used in the match, `ignored_end_terms` is any other terms that weren't used, and `result[i]` is a list of indices of terms in the input that were matched against pattern term `i`.
 */
var findSequenceMatch = jme.rules.findSequenceMatch = function(pattern,input,options) {
    var capture = [];
    var start = 0;
    var done = false;
    var failed = false;
    var pc = 0;
    var ic = 0;

    /** Count the number of times we have matched pattern term `p` so far.
     *
     * @param {number} p - The index of the term.
     * @returns {number}
     */
    function count(p) {
        return capture.filter(function(x){return x==p}).length;
    }
    /** Have we consumed pattern term `p` as many times as allowed?
     *
     * @param {number} p
     * @returns {boolean}
     */
    function consumed(p) {
        return count(p)>=pattern[p].max;
    }
    /** Have we matched this pattern term at least its minimum number of times?
     *
     * @param {number} p - The index of the pattern term.
     * @returns {boolean}
     */
    function enough(p) {
        return count(p)>=pattern[p].min;
    }
    /** Move the start pointer along one.
     * Terms before the start will be returned in `ignored_start_terms`.
     */
    function increment_start() {
        //debug('increment start position');
        start += 1;
        ic = start;
        pc = 0;
    }
    /** Backtrack to the last time we made a free choice.
     * If we're already at the start and `allowOtherTerms` is enabled, advance the start pointer.
     */
    function backtrack() {
        //debug('backtrack');
        if(options.allowOtherTerms && ic==start && capture.length==start && start<input.length-1) {
            capture.push(-1);
            increment_start();
            return;
        } 
        
        ic -= 1;
        while(ic>=start && (ic>=capture.length || capture[ic]>=pattern.length)) {
            ic -= 1;
        }
        //debug('backtracked to '+ic);

        if(ic<start) {
            if(options.allowOtherTerms && start<input.length-1) {
                capture = [];
                increment_start();
                for(var i=0;i<start;i++) {
                    capture.push(-1);
                }
                return;
            } else {
                failed = true;
                return;
            }
        }
        pc = capture[ic]+1;
        capture = capture.slice(0,ic);
    }
    /** Move the input pointer along one.
     * If using commutativity, set the pattern pointer back to the start.
     */
    function advance_input() {
        ic += 1;
        if(options.commutative) {
            pc = 0;
        }
    }
    var steps = 0;
    while(!done && !failed) {
        //show();
        steps += 1;
        while(pc<pattern.length && consumed(pc)) { // if have consumed this term fully, move on
            //debug('term '+pc+' consumed, move on');
            pc += 1;
        }
        if(ic==input.length) { // if we've reached the end of the input
            while(pc<pattern.length && enough(pc)) {
                //debug('got enough of '+pc+', skip forward');
                pc += 1;
            }
            if(pc==pattern.length) { // if we've consumed all the terms
                if(!pattern.every(function(_,p) { return enough(p); })) {
                    //debug('reached end but some terms not matched enough times');
                    backtrack();
                } else {
                    //debug('reached end of pattern and end of input: done');
                    done = true;
                }
            } else {
                //debug('end of input but still pattern to match')
                backtrack();
            }
        } else if(pc>=pattern.length) {
            //debug("end of pattern but unconsumed input");
            if(pc==pattern.length && options.commutative && options.allowOtherTerms) {
                //debug('capturing '+ic+' as ignored end term');
                capture.push(pattern.length);
                advance_input();
            } else if(pc==pattern.length && !options.commutative && options.allowOtherTerms) {
                while(ic<input.length) {
                    //debug('capturing '+ic+' as ignored end term');
                    capture.push(pattern.length);
                    advance_input();
                }
            } else {
                backtrack();
            }
        } else if(options.checkFn(input[ic],pattern[pc],ic,pc) && options.constraintFn(capture,ic,pc)) {
            //debug('capture '+ic+' at '+pc);
            capture.push(pc);
            advance_input();
        } else if(options.commutative || enough(pc)) {
            //debug('trying the next pattern term');
            pc += 1;
        } else {
            //debug('can\'t match next input')
            backtrack();
        }
    }
    if(failed) {
        return false;
    }
    var result = pattern.map(function(p,i) {
        return capture.map(function(_,j){return j}).filter(function(j){ return capture[j] == i;});
    });
    if(options.commutative) {
        var ignored_start_terms = [];
        var ignored_end_terms = [];
        var ignored = ignored_start_terms;
        capture.forEach(function(p,i) {
            if(p==pattern.length) {
                ignored.push(i);
            } else {
                ignored = ignored_end_terms;
            }
        });
    } else {
        var ignored_start_terms = input.slice(0,start).map(function(_,j){return j});
        var ignored_end_terms = capture.map(function(_,j){return j}).filter(function(j){return capture[j]==pattern.length});
    }
    //debug(result);
    return {ignored_start_terms: ignored_start_terms, result: result, ignored_end_terms: ignored_end_terms};
}

/** Match any of the given patterns.
 * The first pattern which successfully matches is used.
 *
 * @param {Array.<Numbas.jme.tree>} patterns
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchAny(patterns,exprTree,options) {
    for(var i=0;i<patterns.length;i++) {
        var m = matchTree(patterns[i],exprTree,options);
        if(m) {
            return m;
        }
    }
    return false;
}

/** Perform a match with a default value.
 * This operation only makes sense when matching a sequence of terms, so just match the pattern.
 *
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} defaultValue - Ignored.
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchDefault(ruleTree, defaultValue, exprTree, options) {
    var m = matchTree(ruleTree,exprTree,options);
    return m;
}

/** Bring any unary minus to the top of the tree.
 *
 * @param {Numbas.jme.tree} tree
 * @returns {Numbas.jme.tree}
 */
function extractLeadingMinus(tree) {
    if(jme.isOp(tree.tok,'*') || jme.isOp(tree.tok,'/')) {
        if(jme.isOp(tree.args[0].tok,'-u')) {
            return {tok:tree.args[0].tok, args: [{tok:tree.tok, args: [tree.args[0].args[0],tree.args[1]]}]};
        } else {
            var left = extractLeadingMinus(tree.args[0]);
            if(jme.isOp(left.tok,'-u')) {
                return {tok: left.tok, args: [{tok: tree.tok, args: [left, tree.args[1]]}]};
            } else {
                return tree;
            }
        }
    } else {
        return tree;
    }
}

/** Match `rule`, or `prefix(rule)` - allow any of a list of optional unary operators at the top of the tree.
 *
 * @param {Array.<string>} prefixes - The names of the optional operators.
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchOptionalPrefix(prefixes,ruleTree,exprTree,options) {
    var originalExpr = exprTree;
    exprTree = extractLeadingMinus(exprTree);
    for(var i=0;i<prefixes.length;i++) {
        var prefix = prefixes[i];
        if(jme.isOp(exprTree.tok,prefix)) {
            exprTree = exprTree.args[0];
            break;
        }
    }
    var m = matchTree(ruleTree,exprTree,options);
    if(m) {
        m._match = originalExpr;
        return m;
    } else {
        return false;
    }
}

/** Match if the expression doesn't match the given pattern.
 *
 * @param {Numbas.jme.tree} ruleTree - The pattern which must not be matched.
 * @param {Numbas.jme.tree} exprTree - The expression to test.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchNot(ruleTree,exprTree,options) {
    if(!matchTree(ruleTree,exprTree,options)) {
        return preserve_match({},exprTree);
    } else {
        return false;
    }
}

/** Match if the expression uses all of the given names as free variables.
 *
 * @param {Array.<string>} names
 * @param {Numbas.jme.tree} exprTree
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchUses(names,exprTree) {
    var vars = jme.findvars(exprTree);
    for(var i=0;i<names.length;i++) {
        if(!vars.contains(names[i])) {
            return false;
        }
    }
    return {};
}

/** Match if the top token of the given expression is of the given type.
 *
 * @param {string} wantedType - The required type.
 * @param {Numbas.jme.tree} exprTree
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchType(wantedType,exprTree) {
    if(exprTree.tok.type==wantedType) {
        return {};
    } else {
        return false;
    }
}

/** Match all of the given patterns against the given expression. 
 * Return `false` if any of the patterns don't match.
 *
 * @param {Array.<Numbas.jme.tree>} patterns
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchAnd(patterns,exprTree,options) {
    var matches = [];
    for(var i=0;i<patterns.length;i++) {
        var m = matchTree(patterns[i],exprTree,options);
        if(m) {
            matches.push(m);
        } else {
            return false;
        }
    }
    return mergeMatches(matches);
}

/** Find all matches for the rule, anywhere within the given expression.
 *
 * @memberof Numbas.jme.rules
 * @function
 * @param {Numbas.jme.tree} ruleTree - The pattern to match.
 * @param {Numbas.jme.tree} exprTree - The syntax tree to test.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Array.<Numbas.jme.rules.jme_pattern_match>}
 */
var matchAllTree = jme.rules.matchAllTree = function(ruleTree,exprTree,options) {
    var matches = [];
    var m = matchTree(ruleTree,exprTree,options);
    if(m) {
        matches = [m];
    }
    if(exprTree.args) {
        exprTree.args.forEach(function(arg) {
            var submatches = matchAllTree(ruleTree,arg,options);
            matches = matches.concat(submatches);
        });
    }
    return matches;
}

/** Merge a list of matches into one match object.
 * Later matches override earlier ones: if two matches have the same captured name, the later one is used.
 *
 * @param {Array.<Numbas.jme.rules.jme_pattern_match>} matches
 * @returns {Numbas.jme.rules.jme_pattern_match}
 */
function mergeMatches(matches) {
    var ms = matches.slice();
    ms.splice(0,0,{});
    return util.extend_object.apply(this,ms);
}

/** Apply operations specified in the result of a tree transformation: `eval(x)` is replaced with the result of evaluating `x`.
 *
 * @memberof Numbas.jme.rules
 * @function
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Numbas.jme.tree}
 */
var applyPostReplacement = jme.rules.applyPostReplacement = function(tree,options) {
    var tok = tree.tok;
    if(tree.args) {
        var args = tree.args.map(function(arg) {
            return applyPostReplacement(arg,options);
        });
        tree = {tok:tok, args: args};
    }
    if(jme.isFunction(tok,'eval')) {
        return {tok: jme.evaluate(tree.args[0],options.scope)};
    } else if(jme.isFunction(tok,'m_listval')) {
        var n = tree.args[1].tok.value;
        return tree.args[0].args[n];
    }

    return tree;
}

/** Object returned by {@link Numbas.jme.rules.transform}.
 *
 * @type {object}
 * @typedef Numbas.jme.rules.transform_result
 * @property {boolean} changed - Is the result expression different to the input expression?
 * @property {Numbas.jme.tree} expression - The result expression.
 */

/** Replace one expression with another, if it matches the given rule.
 *
 * @memberof Numbas.jme.rules
 * @function
 * @param {Numbas.jme.tree} ruleTree - The rule to test against.
 * @param {Numbas.jme.tree} resultTree - The tree to output, with named groups from the rule substituted in.
 * @param {Numbas.jme.tree} exprTree - The expression to be tested.
 * @param {Numbas.jme.rules.matchTree_options} options - Options for the match.
 * @returns {Numbas.jme.rules.transform_result}
 */
var transform = jme.rules.transform = function(ruleTree,resultTree,exprTree,options) {
    var match = matchTree(ruleTree,exprTree,options);
    if(!match) {
        return {expression: exprTree, changed: false};
    }

    var out = jme.substituteTree(resultTree,new jme.Scope([{variables: match}]), true);
    out = applyPostReplacement(out,options);
    var ruleTok = ruleTree.tok;
    if(match._rest_start) {
        out = {tok: new jme.types.TOp(match.__op__), args: [match._rest_start, out]};
    }
    if(match._rest_end) {
        out = {tok: new jme.types.TOp(match.__op__), args: [out, match._rest_end]};
    }
    return {expression: out, changed: !jme.treesSame(exprTree,out)};
}

/** Replace anything matching the rule with the given result, at any position in the given expression.
 *
 * @memberof Numbas.jme.rules
 * @function
 * @param {Numbas.jme.tree} ruleTree - The rule to test against.
 * @param {Numbas.jme.tree} resultTree - The tree to output, with named groups from the rule substituted in.
 * @param {Numbas.jme.tree} exprTree - The expression to be tested.
 * @param {Numbas.jme.rules.matchTree_options} options - Options for the match.
 * @returns {Numbas.jme.rules.transform_result}
 */
var transformAll = jme.rules.transformAll = function(ruleTree,resultTree,exprTree,options) {
    var changed = false;
    if(exprTree.args) {
        var args = exprTree.args.map(function(arg){ 
            var o = transformAll(ruleTree,resultTree,arg,options);
            changed = changed || o.changed;
            return  o.expression;
        });
        exprTree = {tok: exprTree.tok, args: args};
    }

    var o = transform(ruleTree,resultTree,exprTree,options);
    changed = changed || o.changed;
    return {expression: o.expression, changed: changed};
}

/** A parser for JME patterns. Adds pattern-matching operators to the standard parser.
 *
 * @memberof Numbas.jme.rules
 */
var patternParser = jme.rules.patternParser = new jme.Parser();
patternParser.addTokenType(
    /^\$[a-zA-Z_]+/,
    function(result,tokens,expr,pos) {
        var name = result[0];
        var token;
        var lname = name.toLowerCase();
        token = new jme.types.TName(name);
        return {tokens: [token], start: pos, end: pos+result[0].length};
    }
);
patternParser.addPostfixOperator('`?','`?',{precedence: 0.5});  // optional
patternParser.addPostfixOperator('`*','`*',{precedence: 0.5}); // any number of times
patternParser.addPostfixOperator('`+','`+',{precedence: 0.5}); // at least one time

patternParser.addPrefixOperator('`!','`!',{precedence: 0.5});  // not 
patternParser.addPrefixOperator('`+-','`+-',{precedence: 0.5});  // unary plus or minus
patternParser.addPrefixOperator('`*/','`*/',{precedence: 0.5});  // unary multiply or divide

patternParser.addBinaryOperator(';', {precedence: 0.5});
patternParser.addBinaryOperator(';=', {precedence: 0.5});
patternParser.addBinaryOperator('`|', {precedence: 1000000});   // or
patternParser.addBinaryOperator('`:', {precedence: 1000000});   // default value
patternParser.addBinaryOperator('`&',{precedence: 100000});     // and
patternParser.addBinaryOperator('`where', {precedence: 1000000});   // condition
patternParser.addBinaryOperator('`@', {precedence: 1000000, rightAssociative: true});   // macro


/** Match expression against a pattern. Wrapper for {@link Numbas.jme.rules.matchTree}.
 *
 * @memberof Numbas.jme.rules
 * @function
 *
 * @param {JME} pattern
 * @param {JME} expr
 * @param {Numbas.jme.rules.matchTree_options} options - Default is `commutative`, `associative`, and `allowOtherTerms` all `true`, and using {@link Numbas.jme.builtinScope}.
 *
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names.
 */
var matchExpression = jme.rules.matchExpression = function(pattern,expr,options) {
    var default_options = {
        commutative: true,
        associative: true,
        allowOtherTerms: true,
        gatherList: false,
        strictInverse: false,
        scope: Numbas.jme.builtinScope
    };
    options = extend_options(default_options,options);
    pattern = patternParser.compile(pattern);
    expr = jme.compile(expr);
    return matchTree(pattern,expr,options);
}
/** Flags used to control the behaviour of JME display functions.
 * Values are `undefined` so they can be overridden.
 *
 * @memberof Numbas.jme.rules
 */
var displayFlags = jme.rules.displayFlags = {
    fractionnumbers: undefined,
    rowvector: undefined,
    alwaystimes: undefined,
    mixedfractions: undefined,
    flatfractions: undefined,
    barematrices: undefined
};
/** Flags used in JME simplification rulesets
 *
 * @type {object.<boolean>}
 * @typedef Numbas.jme.rules.ruleset_flags
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} rowvector - Display vectors as a horizontal list of components?
 * @property {boolean} alwaystimes - Always show the multiplication symbol between multiplicands?
 * @property {boolean} mixedfractions - Show top-heavy fractions as mixed fractions, e.g. 3 3/4?
 * @property {boolean} flatfractions - Display fractions horizontally?
 * @property {boolean} barematrices - Render matrices without wrapping them in parentheses.
 * @see Numbas.jme.rules.Ruleset
 */
/** Set of simplification rules.
 *
 * @class
 * @memberof Numbas.jme.rules
 * @param {Numbas.jme.rules.Rule[]} rules
 * @param {Numbas.jme.rules.ruleset_flags} flags
 */
var Ruleset = jme.rules.Ruleset = function(rules,flags) {
    this.rules = rules;
    this.flags = util.extend_object({},displayFlags,flags);
}

Ruleset.prototype = /** @lends Numbas.jme.rules.Ruleset.prototype */ {
    /** Test whether flag is set.
     *
     * @param {string} flag
     * @returns {boolean}
     */
    flagSet: function(flag) {
        flag = flag.toLowerCase();
        if(this.flags.hasOwnProperty(flag))
            return this.flags[flag];
        else
            return false;
    },

    /** Apply this set's rules to the given expression until they don't change any more.
     *
     * @param {Numbas.jme.tree} exprTree
     * @param {Numbas.jme.Scope} scope
     * @see Numbas.jme.rules.transform
     * @see Numbas.jme.rules.matchTree
     * @returns {Numbas.jme.tree}
     */
    simplify: function(exprTree,scope) {
        var rs = this;
        var changed = true;
        var depth = 0;
        var seen = [];
        while(changed) {
            if(exprTree.args) {
                var nargs = exprTree.args.map(function(arg) { return rs.simplify(arg,scope); });
                exprTree = {tok: exprTree.tok, args: nargs};
            }
            changed = false;
            for(var i=0;i<this.rules.length;i++) {
                var result = this.rules[i].replace(exprTree,scope);
                if(result.changed) {
                    if(depth > 100) {
                        var str = Numbas.jme.display.treeToJME(exprTree);
                        if(seen.indexOf(str)!=-1) {
                            throw(new Numbas.Error("jme.display.simplifyTree.stuck in a loop",{expr:str}));
                        }
                        seen.push(str);
                    }
                    changed = true;
                    exprTree = result.expression;
                    depth += 1;
                    break;
                }
            }
        }
        return exprTree;
    }
}
var ruleSort = util.sortBy(['patternString','resultString','conditionStrings']);
/** Merge two rulesets: combine their lists of rules, and merge their flags. The second rule takes precedence over the first.
 *
 * @param {Numbas.jme.rules.Ruleset} r1
 * @param {Numbas.jme.rules.Ruleset} r2
 * @returns {Numbas.jme.rules.Ruleset}
 */
function mergeRulesets(r1,r2) {
    var rules = r1.rules.merge(r2.rules,ruleSort);
    var flags = util.extend_object({},r1.flags,r2.flags);
    return new Ruleset(rules, flags);
}
/** Collect a ruleset together from a list of ruleset names, or rulesets.
 *
 * @memberof Numbas.jme.rules
 * @function
 * @param {string|Array.<string|Numbas.jme.rules.Ruleset>} set - A comma-separated string of ruleset names, or an array of names/Ruleset objects.
 * @param {object.<Numbas.jme.rules.Ruleset>} scopeSets - Dictionary of rulesets defined in the current scope.
 * @returns {Numbas.jme.rules.Ruleset}
 */
var collectRuleset = jme.rules.collectRuleset = function(set,scopeSets)
{
    scopeSets = util.copyobj(scopeSets);
    if(!set) {
        return new Ruleset([],{});
    }
    if(!scopeSets) {
        throw(new Numbas.Error('jme.display.collectRuleset.no sets'));
    }

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
    for(var i=0; i<set.length; i++ ) {
        if(typeof(set[i])=='string') {
            var m = /^\s*(!)?(.*)\s*$/.exec(set[i]);
            var neg = m[1]=='!' ? true : false;
            var name = m[2].trim().toLowerCase();
            if(name in displayFlags) {
                flags[name]= !neg;
            } else if(name.length>0) {
                if(!(name in scopeSets)) {
                    throw(new Numbas.Error('jme.display.collectRuleset.set not defined',{name:name}));
                }
                var sub = collectRuleset(scopeSets[name],scopeSets);
                flags = util.extend_object(flags,sub.flags);
                scopeSets[name] = sub;
                sub.rules.forEach(function(r) {
                    var m = rules.indexOf(r);
                    if(neg) {
                        if(m>=0) {
                            rules.splice(m,1);
                        }
                    } else {
                        if(m==-1) {
                            rules.push(r);
                        }
                    }
                });
            }
        } else {
            rules.push(set[i]);
        }
    }
    return new Ruleset(rules,flags);
}
/** Built-in simplification rules.
 *
 * @enum {Numbas.jme.rules.Rule[]}
 * @memberof Numbas.jme.rules
 */
var simplificationRules = jme.rules.simplificationRules = {
    basic: [
        ['negative:$n;x','','-eval(-x)'],   // the value of a TNumber should be non-negative - pull the negation out as unary minus
        ['+(?;x)','s','x'],                    //get rid of unary plus
        ['?;x+(-?;y)','gs','x-y'],            //plus minus = minus
        ['?;x-(-?;y)','gs','x+y'],            //minus minus = plus
        ['-(-?;x)','s','x'],                //unary minus minus = plus
        ['(-?;x)/?;y','s','-(x/y)'],            //take negation to left of fraction
        ['?;x/(-?;y)','s','-(x/y)'],
        ['-(`! complex:$n);x * (-?;y)','asg','x*y'],
        ['`!-? `& (-(real:$n/real:$n`? `| `!$n);x) * ?`+;y','asgc','-(x*y)'],            //take negation to left of multiplication
        ['-(?;a+?`+;b)','','-a-b'],
        ['?;a+(-?;b-?;c)','','a-b-c'],
        ['?;a/?;b/?;c','','a/(b*c)']
    ],
    collectComplex: [
        ['-complex:negative:$n;x','','eval(-x)'],   // negation of a complex number with negative real part
        ['(`+- real:$n);x + (`+- imaginary:$n);y','cg','eval(x+y)'],    // collect the two parts of a complex number
        ['$n;n*i','acsg','eval(n*i)'],            //always collect multiplication by i
    ],
    unitFactor: [
        ['1*(`! (/?));x','acgs','x'],
    ],
    unitPower: [
        ['?;x^1','','x']
    ],
    unitDenominator: [
        ['?;x/1','','x']
    ],
    zeroFactor: [
        ['?;x*0','acg','0'],
        ['0/?;x','','0']
    ],
    zeroTerm: [
        ['(`+-0) + (`+- ?);x','acg','x']
    ],
    zeroPower: [
        ['?;x^0','','1']
    ],
    noLeadingMinus: [
        ['-?;x + ?;y','s','y-x'],                                            //don't start with a unary minus
        ['-0','','0']
    ],
    collectNumbers: [
        ['$n;a * (1/?;b)','ags','a/b'],
        ['(`+- $n);n1 + (`+- $n)`+;n2','acg','eval(n1+n2)'],
        ['$n;n * $n;m','acg','eval(n*m)'],        //multiply numbers
        ['(`! $n)`+;x * real:$n;n * ((`! $n )`* `| $z);y','ags','n*x*y']            //shift numbers to left hand side
    ],
    simplifyFractions: [
        ['($n;n * (?`* `: 1);top) / ($n;m * (?`* `: 1);bottom) `where gcd_without_pi_or_i(n,m)>1','acg','(eval(n/gcd_without_pi_or_i(n,m))*top)/(eval(m/gcd_without_pi_or_i(n,m))*bottom)'],
        ['imaginary:$n;n / imaginary:$n;m','','eval(n/i)/eval(m/i)'],            // cancel i when numerator and denominator are both purely imaginary
        ['?;=a / ?;=a','acg','1']
    ],
    zeroBase: [
        ['0^?;x','','0']
    ],
    constantsFirst: [
        ['(`! `+- $n);x * (real:$n/real:$n`?);n','asg','n*x']
    ],
    sqrtProduct: [
        ['sqrt(?;x)*sqrt(?;y)','','sqrt(x*y)']
    ],
    sqrtDivision: [
        ['sqrt(?;x)/sqrt(?;y)','','sqrt(x/y)']
    ],
    sqrtSquare: [
        ['sqrt(?;x^2)','','x'],
        ['sqrt(?;x)^2','','x'],
        ['sqrt(integer:$n;n) `where isint(sqrt(n))','','eval(sqrt(n))']
    ],
    trig: [
        ['sin($n;n) `where isint(2*n/pi)','','eval(sin(n))'],
        ['cos($n;n) `where isint(2*n/pi)','','eval(cos(n))'],
        ['tan($n;n) `where isint(n/pi)','','0'],
        ['cosh(0)','','1'],
        ['sinh(0)','','0'],
        ['tanh(0)','','0']
    ],
    otherNumbers: [
        ['(`+-$n);n ^ $n;m','','eval(n^m)']
    ],
    cancelTerms: [
        ['m_exactly((`+- $n `: 1);n * (?`+ `& `! -?);=x `| -?;=x;n:-1) + m_exactly((`+- $n `: 1);m * (?`+ `& `! -?);=x `| -?;=x;m:-1)','acg','eval(n+m)*x']
    ],
    cancelFactors: [
        ['?;=x^(? `: 1);n * ?;=x^(? `: 1);m','acg','x^(m+n)'],
    ],
    collectLikeFractions: [
        ['(?`+);a/?;=d + `+- (?`+);b/?;=d','acg','(a+b)/d']
    ]
    /*
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
    */
};
var conflictingSimplificationRules = {
    // these rules conflict with noLeadingMinus
    canonicalOrder: [
        ['(`+- ?);x+(`+- ?);y `where canonical_compare(x,y)=1','ag','y+x'],
        ['?;x*?;y `where canonical_compare(x,y)=-1','ag','y*x'],
    ],
    expandBrackets: [
        ['(?;x + ((`+- ?)`+);y) * ?;z','ag','x*z+y*z'],
        ['?;x * (?;y + ((`+- ?)`+);z)','ag','x*y+x*z']
    ],
    noDivision: [
        ['?;top/(?;base^(?`? `: 1);degree)','','top * base^(-degree)']
    ]
}
/** Compile an array of rules (in the form `[pattern,conditions[],result]` to {@link Numbas.jme.rules.Rule} objects.
 *
 * @memberof Numbas.jme.rules
 * @function
 * @param {Array} rules
 * @param {string} name - a name for this group of rules
 * @returns {Numbas.jme.rules.Ruleset}
 */
var compileRules = jme.rules.compileRules = function(rules,name)
{
    for(var i=0;i<rules.length;i++)
    {
        var pattern = rules[i][0];
        var options = rules[i][1];
        var result = rules[i][2];
        rules[i] = new Rule(pattern,result,options,name);
    }
    return new Ruleset(rules,{});
}
var all=[];
var compiledSimplificationRules = {};
for(var x in simplificationRules) {
    compiledSimplificationRules[x] = compiledSimplificationRules[x.toLowerCase()] = compileRules(simplificationRules[x],x);
    all = all.concat(compiledSimplificationRules[x].rules);
}
for(var x in conflictingSimplificationRules) {
    compiledSimplificationRules[x] = compiledSimplificationRules[x.toLowerCase()] = compileRules(conflictingSimplificationRules[x],x);
}
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
 *
 * @typedef JME
 * @type {string}
 * @see {@link https://docs.numbas.org.uk/en/latest/jme-reference.html}
 */

/** @typedef Numbas.jme.tree
 * @type {object}
 * @property {Array.<Numbas.jme.tree>} args - The token's arguments (if it's an op or function).
 * @property {Numbas.jme.token} tok - The token at this node.
 */

/** @typedef {object} Numbas.jme.call_signature
 * @property {Numbas.jme.funcObj} fn - The function to call.
 * @property {Numbas.jme.signature} signature - The signature to use.
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
    /** Escape a string so that it will be interpreted correctly by the JME parser.
     *
     * @param {string} str
     * @returns {string}
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

    /** Wrapper around {@link Numbas.jme.Parser#compile}.
     *
     * @param {JME} expr
     * @see Numbas.jme.Parser#compile
     * @returns {Numbas.jme.tree}
     */
    compile: function(expr) {
        return jme.standardParser.compile(expr);
    },

    /** Options for a JME operator.
     *
     * @typedef {object} Numbas.jme.operatorOptions
     * @property {Array.<string>} synonyms - Synonyms for this operator. See {@link Numbas.jme.opSynonyms}.
     * @property {number} precedence - An operator with lower precedence is evaluated before one with high precedence. Only makes sense for binary operators. See {@link Numbas.jme.precedence}.
     * @property {boolean} commutative - Is this operator commutative? Only makes sense for binary operators.
     * @property {boolean} rightAssociative - Is this operator right-associative? Only makes sense for unary operators.
     */

    /** Add a binary operator to the standard parser.
     *
     * @param {string} name
     * @param {Numbas.jme.operatorOptions} options
     */
    addBinaryOperator: function(name,options) {
        jme.standardParser.addBinaryOperator(name,options);
    },

    /** Add a prefix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPrefixOperator: function(name,alt,options) {
        jme.standardParser.addPrefixOperator(name,alt,options);
    },

    /** Add a postfix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPostfixOperator: function(name,alt,options) {
        jme.standardParser.addPostfixOperator(name,alt,options);
    },


    /** Wrapper around {@link Numbas.jme.Parser#tokenise}.
     *
     * @param {JME} expr
     * @see Numbas.jme.Parser#tokenise
     * @returns {Numbas.jme.token[]}
     */
    tokenise: function(expr) {
        return jme.standardParser.tokenise(expr);
    },

    /** Wrapper around {@link Numbas.jme.Parser#shunt}.
     *
     * @param {Numbas.jme.token[]} tokens
     * @see Numbas.jme.Parser#shunt
     * @returns {Numbas.jme.tree}
     */
    shunt: function(tokens) {
        return jme.standardParser.shunt(expr);
    },

    /** Unescape a string - backslashes escape special characters.
     *
     * @param {string} str
     * @returns {string}
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
     *
     * @param {Numbas.jme.tree} tree
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} [allowUnbound=false] - Allow unbound variables to remain in the returned tree.
     * @param {boolean} [unwrapExpressions=false] - Unwrap TExpression tokens?
     * @returns {Numbas.jme.tree}
     */
    substituteTree: function(tree,scope,allowUnbound,unwrapExpressions)
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
                    } else if(unwrapExpressions && v.type=='expression') {
                        return v.tree;
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
            substituteTreeOps[tree.tok.name](tree,scope,allowUnbound,unwrapExpressions);
            return tree;
        } else {
            tree = {
                tok: tree.tok,
                args: tree.args.slice()
            };
            for(var i=0;i<tree.args.length;i++) {
                tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound,unwrapExpressions);
            }
            return tree;
        }
    },
    /** Evaluate a syntax tree (or string, which is compiled to a syntax tree), with respect to the given scope.
     *
     * @param {Numbas.jme.tree|string} tree
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
    /** Compile a list of expressions, separated by commas.
     *
     * @param {JME} expr
     * @see Numbas.jme.tokenise
     * @see Numbas.jme.shunt
     * @returns {Numbas.jme.tree[]}
     */
    compileList: function(expr) {
        expr+='';    //make sure expression is a string and not a number or anything like that
        if(!expr.trim().length)
            return null;
        //typecheck
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
    /** Settings for {@link Numbas.jme.compare}.
     *
     * @typedef {object} Numbas.jme.compare_settings
     * @property {string} checkingType - The name of the method to determine if two results are equal. See {@link Numbas.jme.checkingFunctions}.
     * @property {number} vsetRangeStart - The lower bound of the range to pick variable values from.
     * @property {number} vsetRangeEnd - The upper bound of the range to pick variable values from.
     * @property {number} vsetRangePoints - The number of values to pick for each variable.
     * @property {number} checkingAccuracy - A parameter for the checking function to determine if two results are equal. See {@link Numbas.jme.checkingFunctions}.
     * @property {number} failureRate - The number of times the comparison must fail to declare that the expressions are unequal.
     * @property {boolean} sameVars - If true, then both expressions should have exactly the same free variables.
     */
    /** Compare two expressions over some randomly selected points in the space of variables, to decide if they're equal.
     *
     * @param {JME} tree1
     * @param {JME} tree2
     * @param {Numbas.jme.compare_settings} settings
     * @param {Numbas.jme.Scope} scope
     * @returns {boolean}
     */
    compare: function(tree1,tree2,settings,scope) {
        var default_settings = {
            vsetRangeStart: 0,
            vsetRangeEnd: 1,
            vsetRangePoints: 5,
            checkingType: 'absdiff',
            checkingAccuracy: 0.0001,
            failureRate: 1
        }
        settings = util.extend_object({},default_settings,settings);
        var checkingFunction = checkingFunctions[settings.checkingType.toLowerCase()];    //work out which checking type is being used
        try {
            if(tree1 == null || tree2 == null) {    
                //one or both expressions are invalid, can't compare
                return false;
            }
            //find variable names used in both expressions - can't compare if different
            var vars1 = findvars(tree1);
            var vars2 = findvars(tree2);
            for(var v in scope.allVariables()) {
                delete vars1[v];
                delete vars2[v];
            }
            if(settings.sameVars) {
                if( !varnamesAgree(vars1,vars2) ) {    //whoops, differing variables
                    return false;
                }
            } else { 
                vars2.forEach(function(n) {
                    if(vars1.indexOf(n)==-1) {
                        vars1.push(n);
                    }
                });
            }
            var hasNames = vars1.length > 0;
            var numRuns = hasNames ? settings.vsetRangePoints: 1;
            var failureRate = hasNames ? settings.failureRate : 1;
            // if variables are used,  evaluate both expressions over a random selection of values and compare results
            var errors = 0;
            var rs = randoms(vars1, settings.vsetRangeStart, settings.vsetRangeEnd, numRuns);
            for(var i = 0; i<rs.length; i++) {
                var nscope = new jme.Scope([scope,{variables:rs[i]}]);
                var r1 = nscope.evaluate(tree1);
                var r2 = nscope.evaluate(tree2);
                if( !resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy) ) { 
                    errors++; 
                }
            }
            return errors < failureRate;
        } catch(e) {
            return false;
        }
    },
    /** Substitute variables into content. To substitute variables, use {@link Numbas.jme.variables.DOMcontentsubvars}.
     *
     * @param {string} str
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} [sub_tex=false] - Substitute into TeX? Normally this is left to MathJax.
     * @returns {string}
     */
    contentsubvars: function(str, scope, sub_tex)
    {
        var bits = util.contentsplitbrackets(str);    //split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
        for(var i=0; i<bits.length; i+=4) {
            bits[i] = jme.subvars(bits[i],scope,true);
            if(sub_tex && i+3<bits.length) {
                var tbits = jme.texsplit(bits[i+2]);
                var out = '';
                for(var j=0;j<tbits.length;j+=4) {
                    out += tbits[j];
                    if(j+3<tbits.length) {
                        var cmd = tbits[j+1];
                        var rules = jme.collectRuleset(tbits[j+2], scope.allRulesets());
                        var expr = tbits[j+3];
                        switch(cmd) {
                        case 'var':
                            var v = scope.evaluate(expr);
                            var tex = jme.display.texify({tok: v}, rules);
                            out += '{'+tex+'}';
                            break;
                        case 'simplify':
                            expr = jme.subvars(expr,scope);
                            out += '{'+jme.display.exprToLaTeX(expr,rules,scope)+'}';
                            break;
                        }
                    }
                }
                bits[i+2] = out;
            }
        }
        return bits.join('');
    },
    /** Split up a TeX expression, finding the \var and \simplify commands.
     * Returns an array `[normal tex,var or simplify,options,argument,normal tex,...]`.
     *
     * @param {string} s
     * @returns {Array.<string>}
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
    /** Dictionary of functions which convert a JME token to a string for display.
     *
     * @enum {Function}
     */
    typeToDisplayString: {
        'number': function(v) {
            return ''+Numbas.math.niceNumber(v.value)+'';
        },
        'decimal': function(v) {
            var d = v.value;
            var re = d.re.toString();
            if(d.isReal()) {
                return re;
            }
            var im = d.im.absoluteValue().toString();
            if(d.im.lessThan(0)) {
                return re + ' - '+im+'i';
            } else {
                return re + ' + '+im+'i';
            }
        },
        'string': function(v,display) {
            return v.value;
        },
        'html': function(v) {
            v = v.value;
            if(window.jQuery) {
                v = v.toArray();
            }
            return v.map(function(e){return e.outerHTML;}).join('');
        }
    },
    /** Produce a string representation of the given token, for display.
     *
     * @param {Numbas.jme.token} v
     * @see Numbas.jme.typeToDisplayString
     * @returns {string}
     */
    tokenToDisplayString: function(v) {
        if(v.type in jme.typeToDisplayString) {
            return jme.typeToDisplayString[v.type](v);
        } else {
            return jme.display.treeToJME({tok:v});
        }
    },
    /** Substitute variables into a text string (not maths).
     *
     * @param {string} str
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} [display=false] - Is this string going to be displayed to the user? If so, avoid unnecessary brackets and quotes.
     * @returns {string}
     */
    subvars: function(str, scope,display)
    {
        var bits = util.splitbrackets(str,'{','}','(',')');
        if(bits.length==1)
        {
            return str;
        }
        var out = '';
        for(var i=0; i<bits.length; i++)
        {
            if(i % 2)
            {
                var v = jme.evaluate(jme.compile(bits[i]),scope);
                if(v===null) {
                    throw(new Numbas.Error('jme.subvars.null substitution',{str:str}));
                }
                if(display) {
                    v = jme.tokenToDisplayString(v);
                } else {
                    if(jme.isType(v,'number')) {
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
    /** Unwrap a {@link Numbas.jme.token} into a plain JavaScript value.
     *
     * @param {Numbas.jme.token} v
     * @returns {object}
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
            case 'nothing':
                return undefined;
            default:
                return v.value;
        }
    },

    /** Mark a token as 'safe', so it doesn't have {@link Numbas.jme.subvars} applied to it, or any strings it contains, when it's evaluated.
     *
     * @param {Numbas.jme.token} t
     * @returns {Numbas.jme.token}
     */
    makeSafe: function(t) {
        if(!t) {
            return t;
        }
        switch(t.type) {
            case 'string':
                t.safe = true;
                var t2 = new TString(t.value);
                if(t.latex!==undefined) {
                    t2.latex = t.latex;
                }
                t2.safe = true;
                return t2;
            case 'list':
                return new TList(t.value.map(jme.makeSafe));
            case 'dict':
                var o = {};
                for(var x in t.value) {
                    o[x] = jme.makeSafe(t.value[x]);
                }
                return new TDict(o);
            default:
                return t;
        }
    },

    /** Wrap up a plain JavaScript value (number, string, bool or array) as a {@link Numbas.jme.token}.
     *
     * @param {object} v
     * @param {string} typeHint - Name of the expected type (to differentiate between, for example, matrices, vectors and lists.
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
                    } else if(v instanceof math.ComplexDecimal) {
                        return new jme.types.TDecimal(v);
                    } else if(v instanceof Decimal) {
                        return new jme.types.TDecimal(v);
                    } else if(v instanceof math.Fraction) {
                        return new jme.types.TRational(v);
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
    /** Is a token of the given type, or can it be automatically cast to the given type?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} type
     * @returns {boolean}
     */
    isType: function(tok,type) {
        if(!tok) {
            return false;
        }
        if(tok.type==type) {
            return true;
        }
        if(tok.casts) {
            return tok.casts[type]!==undefined;
        }
        return false;
    },
    /** Cast a token to the given type, if possible.
     * 
     * @param {Numbas.jme.token} tok
     * @param {string|object} type
     * @returns {Numbas.jme.token}
     */
    castToType: function(tok,type) {
        var typeDescription = {};
        if(typeof(type)=='object') {
            typeDescription = type;
            type = typeDescription.type;
        }
        var ntok;
        if(tok.type!=type) {
            if(!tok.casts || !tok.casts[type]) {
                throw(new Numbas.Error('jme.type.no cast method',{from: tok.type, to: type}));
            }
            ntok = tok.casts[type](tok);
        } else {
            ntok = tok;
        }
        if(type=='dict' && typeDescription.items) {
            ntok = new TDict(ntok.value);
            for(var x in typeDescription.items) {
                ntok.value[x] = jme.castToType(ntok.value[x],typeDescription.items[x]);
            }
        }
        if(type=='list' && typeDescription.items) {
            ntok = new TList(ntok.value);
            ntok.value = ntok.value.map(function(item,i) {
                return jme.castToType(item,typeDescription.items[i]);
            });
        }
        return ntok;
    },
    /** Find a type that both types `a` and `b` can be automatically cast to, or return `undefined`.
     *
     * @param {string} a
     * @param {string} b
     * @returns {string}
     */
    findCompatibleType: function(a,b) {
        a = jme.types[a];
        b = jme.types[b];
        if(a===undefined || b===undefined) {
            return undefined;
        }
        a = a.prototype;
        b = b.prototype;
        if(a.type==b.type) {
            return a.type;
        }
        if(a.casts) {
            if(a.casts[b.type]) {
                return b.type;
            }
            if(b.casts) {
                if(b.casts[a.type]) {
                    return a.type;
                }
                for(var x in a.casts) {
                    if(b.casts[x]) {
                        return x;
                    }
                }
            }
        } else if(b.casts) {
            if(b.casts[a.type]) {
                return a.type;
            }
        }
    },
    /** Is a token an operator with the given name?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} op
     *
     * @returns {boolean}
     */
    isOp: function(tok,op) {
        return tok.type=='op' && tok.name==op;
    },
    /** Is a token the given name?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} name
     *
     * @returns {boolean}
     */
    isName: function(tok,name) {
        return tok.type=='name' && tok.name==name;
    },
    /** Is a token a function with the given name?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} name
     *
     * @returns {boolean}
     */
    isFunction: function(tok,name) {
        return tok.type=='function' && tok.name==name;
    },
    /** Does this expression behave randomly?
     * True if it contains any instances of functions or operations, defined in the given scope, which could behave randomly.
     *
     * @param {Numbas.jme.tree} expr
     * @param {Numbas.jme.Scope} scope
     * @returns {boolean}
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
     *
     * @param {Numbas.jme.tree} tree
     * @returns {object} The base, degree and coefficient of the monomial, as trees.
     */
    isMonomial: function(tree) {
        /** Remove unary minuses from the top of the tree.
         *
         * @param {Numbas.jme.tree} tree
         * @returns {Numbas.jme.tree}
         */
        function unwrapUnaryMinus(tree) {
            while(jme.isOp(tree.tok,'-u')) {
                tree = tree.args[0];
            }
            return tree;
        }
        var coefficient;
        if(jme.isOp(tree.tok,'*')) {
            if(!jme.isType(unwrapUnaryMinus(tree.args[0]).tok,'number')) {
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
            return {base:tree, degree:{tok:new TInt(1)}, coefficient: coefficient};
        }
        if(jme.isOp(tree.tok,'^') && jme.isType(tree.args[0].tok,'name') && jme.isType(unwrapUnaryMinus(tree.args[1]).tok,'number')) {
            return {base:tree.args[0], degree:tree.args[1], coefficient: coefficient};
        }
        return false;
    }
};

/** Options for {@link Numbas.jme.Parser}
 *
 * @typedef {object} Numbas.jme.parser_options
 * @property {boolean} closeMissingBrackets - Silently ignore "missing right bracket" errors?
 * @property {boolean} addMissingArguments - When an op or function call is missing required arguments, insert `?` as a placeholder.
 */

/** A parser for {@link JME} expressions.
 *
 * @memberof Numbas.jme
 * @class
 * 
 * @param {Numbas.jme.parser_options} options
 */
var Parser = jme.Parser = function(options) {
    this.options = util.extend_object({}, this.option_defaults, options);
    this.ops = this.ops.slice();
    this.re = util.extend_object({},this.re);
    this.tokeniser_types = this.tokeniser_types.slice();
    this.constants = {};
    this.prefixForm = {};
    this.postfixForm = {};
    this.arity = {};
    this.precedence = {};
    this.commutative = {};
    this.associative = {};
    this.funcSynonyms = {};
    this.opSynonyms = {};
    this.rightAssociative = {};
    this.make_re();
}
jme.Parser.prototype = /** @lends Numbas.jme.Parser.prototype */ {
    /** Default options for new parsers.
     *
     * @type {Numbas.jme.parser_options}
     */
    option_defaults: {
        closeMissingBrackets: false,
        addMissingArguments: false
    },

    /** There are many dictionaries storing definitions of things like constants and alternate names, which are defined both globally in Numbas.jme and locally in a Parser.
     * This is a wrapper to load the value of the setting if it exists, and return `undefined` otherwise.
     *
     * @param {string} setting - The name of the dictionary. Both `this` and of `Numbas.jme` must have members with this name.
     * @param {string} name - The name of the setting to try to load from the dictionary.
     * @returns {*}
     */
    getSetting: function(setting,name) {
        if(name in this[setting]) {
            return this[setting][name];
        }
        if(name in jme[setting]) {
            return jme[setting][name];
        }
        return undefined;
    },

    /** If the given name is defined as a constant, return its value, otherwise return `undefined`.
     *
     * @param {string} name
     * @returns {number}
     */
    getConstant: function(name) { return this.getSetting('constants',name); },

    /** If the given operator name has a defined prefix form, return it, otherwise return `undefined`.
     *
     * @param {string} name
     * @returns {string}
     */
    getPrefixForm: function(name) { return this.getSetting('prefixForm',name); },

    /** If the given operator name has a defined postfix form, return it, otherwise return `undefined`.
     *
     * @param {string} name
     * @returns {string}
     */
    getPostfixForm: function(name) { return this.getSetting('postfixForm',name); },

    /** Get the arity of the given operator.
     *
     * @param {string} name
     * @returns {number}
     */
    getArity: function(name) { return this.getSetting('arity',name) || 2; },

    /** Get the precedence of the given operator.
     *
     * @param {string} name
     * @returns {number}
     */
    getPrecedence: function(name) { return this.getSetting('precedence',name); },

    /** Is the given operator commutative?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isCommutative: function(name) { return this.getSetting('commutative',name) || false; },

    /** Is the given operator associative?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isAssociative: function(name) { return this.getSetting('associative',name) || false; },

    /** Is the given operator right-associative?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isRightAssociative: function(name) { return this.getSetting('rightAssociative',name) || false; },

    /** If the given function name has a synonym, use it, otherwise return the original name.
     *
     * @see Numbas.jme.funcSynonyms
     * @param {string} name
     * @returns {string}
     */
    funcSynonym: function(name) { return this.getSetting('funcSynonyms',name) || name; },

    /** If the given operator name has a synonym, use it, otherwise return the original name.
     *
     * @see Numbas.jme.opSynonyms
     * @param {string} name
     * @returns {string}
     */
    opSynonym: function(name) { return this.getSetting('opSynonyms',name) || name; },

    /** Binary operations.
     * 
     * @type {Array.<string>}
     */
    ops: ['not','and','or','xor','implies','isa','except','in','divides','as','..','#','<=','>=','<>','&&','||','|','*','+','-','/','^','<','>','=','!','&','÷','×','∈','∧','∨','¬','⟹','≠','≥','≤','ˆ'],

    /** Regular expressions to match tokens.
     *
     * @type {object.<RegExp>}
     */
    re: {
        re_bool: /^(true|false)(?![a-zA-Z_0-9'])/i,
        re_integer: /^[0-9]+(?!\x2E|[0-9])/,
        re_number: /^[0-9]+(?:\x2E[0-9]+)?/,
        re_name: /^{?((?:(?:[a-zA-Z]+):)*)((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?\??|[π∞])}?/i,
        re_punctuation: /^([\(\),\[\]])/,
        re_string: /^("""|'''|['"])((?:[^\1\\]|\\.)*?)\1/,
        re_comment: /^\/\/.*?(?:\n|$)/,
        re_keypair: /^:/
    },

    /** Set properties for a given operator.
     *
     * @param {string} name - The name of the operator.
     * @param {Numbas.jme.operatorOptions} options
     */
    setOperatorProperties: function(name,options) {
        if(!options) {
            return;
        }
        if('precedence' in options) {
            this.precedence[name] = options.precedence;
        }
        if('synonyms' in options) {
            options.synonyms.forEach(function(synonym) {
                if(opSynonyms[synonym]===undefined) {
                    this.opSynonyms[synonym] = name;
                }
            });
        }
        if(options.rightAssociative) {
            this.rightAssociative[name] = true;
        }
        if(options.commutative) {
            this.commutative[name] = true;
        }
    },

    addTokenType: function(re,parse) {
        this.tokeniser_types.splice(0,0,{re:re,parse:parse});
    },

    /** Add an operator to the parser.
     *
     * @param {string} name
     * @see Numbas.jme.Parser#addBinaryOperator
     * @see Numbas.jme.Parser#addPrefixOperator
     * @see Numbas.jme.Parser#addPostfixOperator
     */
    addOperator: function(name) {
        if(this.ops.contains(name)) {
            return;
        }
        this.ops.push(name);
        this.make_re();
    },

    /** Add a binary operator to the parser.
     *
     * @param {string} name
     * @param {Numbas.jme.operatorOptions} options
     */
    addBinaryOperator: function(name,options) {
        this.addOperator(name);
        this.setOperatorProperties(name,options);
    },

    /** Add a prefix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPrefixOperator: function(name,alt,options) {
        this.addOperator(name);
        alt = alt || name;
        this.prefixForm[name] = alt;
        this.arity[alt] = 1;
        this.setOperatorProperties(alt,options);
    },

    /** Add a postfix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPostfixOperator: function(name,alt,options) {
        this.addOperator(name);
        alt = alt || name;
        this.postfixForm[name] = alt;
        this.arity[alt] = 1;
        this.setOperatorProperties(alt,options);
    },

    /** Create an operator token with the given name.
     *
     * @param {string} name - The name of the operator.
     * @param {boolean} postfix - Is the operator postfix?
     * @param {boolean} prefix - Is the operator prefix?
     * @returns {Numbas.jme.token}
     */
    op: function(name,postfix,prefix) {
        var arity = this.getArity(name);
        var commutative = arity>1 && this.isCommutative(name);
        var associative = arity>1 && this.isAssociative(name);

        return new TOp(name,postfix,prefix,arity,commutative,associative);
    },

    /** Descriptions of kinds of token that the tokeniser can match.
     * `re` is a regular expression matching the token.
     * `parse` is a function which takes a RegEx match object, the tokens produced up to this point, the input expression, and the current position in the expression.
     * It should return an object `{tokens, start, end}`.
     */
    tokeniser_types: [
        {
            re: 're_strip_whitespace',
            parse: function(result,tokens,expr,pos) {
                return {tokens: [], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_comment',
            parse: function(result,tokens,expr,pos) {
                return {tokens: [], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_integer',
            parse: function(result,tokens,expr,pos) {
                var token = new TInt(result[0]);
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(prev.type==')' || prev.type=='name') {    //right bracket followed by a number is interpreted as multiplying contents of brackets by number
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_number',
            parse: function(result,tokens,expr,pos) {
                var token = new TNum(result[0]);
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(prev.type==')' || prev.type=='name') {    //right bracket followed by a number is interpreted as multiplying contents of brackets by number
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_bool',
            parse: function(result,tokens,expr,pos) {
                var token = new TBool(util.parseBool(result[0]));
                return {tokens: [token], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_op',
            parse: function(result,tokens,expr,pos) {
                var matched_name = result[0];
                var name = matched_name.toLowerCase();
                var nt;
                var postfix = false;
                var prefix = false;
                name = this.opSynonym(name);
                if( tokens.length==0 || (nt=tokens[tokens.length-1].type)=='(' || nt==',' || nt=='[' || (nt=='op' && !tokens[tokens.length-1].postfix) || nt=='keypair' ) {
                    var prefixForm = this.getPrefixForm(name);
                    if(prefixForm!==undefined) {
                        name = prefixForm;
                        prefix = true;
                    }
                } else {
                    var postfixForm = this.getPostfixForm(name);
                    if(postfixForm !== undefined) {
                        name = postfixForm;
                        postfix = true;
                    }
                }
                var token = this.op(name,postfix,prefix);
                return {tokens: [token], start: pos, end: pos+matched_name.length};
            }
        },
        {
            re: 're_name',
            parse: function(result,tokens,expr,pos) {
                var name = result[2];
                var annotation = result[1] ? result[1].split(':').slice(0,-1) : null;
                var token;
                if(!annotation) {
                    var lname = name.toLowerCase();
                    // fill in constants here to avoid having more 'variables' than necessary
                    var constant = this.getConstant(lname);
                    if(constant !== undefined) {
                        token = new TNum(constant);
                    } else {
                        token = new TName(name);
                    }
                } else {
                    token = new TName(name,annotation);
                }
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,'number') || jme.isType(prev,'name') || jme.isType(prev,')')) {    //number or right bracket or name followed by a name, eg '3y', is interpreted to mean multiplication, eg '3*y'
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_punctuation',
            parse: function(result,tokens,expr,pos) {
                var new_tokens = [new TPunc(result[0])];
                if(result[0]=='(' && tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,'number') || jme.isType(prev,')')) {    //number or right bracket followed by left parenthesis is also interpreted to mean multiplication
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_string',
            parse: function(result,tokens,expr,pos) {
                var str = result[2];
                var token = new TString(jme.unescape(str));
                return {tokens: [token], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_keypair',
            parse: function(result,tokens,expr,pos) {
                if(tokens.length==0 || !(tokens[tokens.length-1].type=='string' || tokens[tokens.length-1].type=='name')) {
                    throw(new Numbas.Error('jme.tokenise.keypair key not a string',{type: tokens[tokens.length-1].type}));
                }
                var token = new TKeyPair(tokens.pop().value);
                return {tokens: [token], start: pos, end: pos+result[0].length};
            }
        }
    ],


    /** Update regular expressions for matching tokens.
     *
     * @see Numbas.jme.Parser#re
     */
    make_re: function() {
        /** Put operator symbols in reverse length order (longest first), and escape regex punctuation.
         *
         * @param {Array.<string>} ops
         * @returns {Array.<string>} ops
         */
        function clean_ops(ops) {
            return ops.sort().reverse().map(function(op) {
                return op.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
            });
        };
        var word_ops = clean_ops(this.ops.filter(function(o){return o.match(/[a-zA-Z0-9_']$/); }));
        var other_ops = clean_ops(this.ops.filter(function(o){return !o.match(/[a-zA-Z0-9_']$/); }));
        var any_op_bits = [];
        if(word_ops.length) {
            any_op_bits.push('(?:'+word_ops.join('|')+')(?![a-zA-Z0-9_\'])');
        }
        if(other_ops.length) {
            any_op_bits.push('(?:'+other_ops.join('|')+')');
        }
        var re_op_source = '^(?:'+any_op_bits.join('|')+')';
        this.re.re_op = new RegExp(re_op_source,'i');
    },

    /** Convert given expression string to a list of tokens. Does some tidying, e.g. inserts implied multiplication symbols.
     *
     * @param {JME} expr
     * @returns {Array.<Numbas.jme.token>}
     * @see Numbas.jme.Parser#compile
     */
    tokenise: function(expr) {
        if(!expr)
            return [];
        expr += '';
        var pos = 0;
        var tokens = [];
        while( pos<expr.length ) {
            var got = false;
            for(var i=0;i<this.tokeniser_types.length;i++) {
                var tt = this.tokeniser_types[i];
                var regex = (tt.re instanceof RegExp) ? tt.re : this.re[tt.re];
                var m = expr.slice(pos).match(regex);
                if(m) {
                    var result = tt.parse.apply(this,[m,tokens,expr,pos]);
                    result.tokens.forEach(function(t) {
                        t.pos = result.start;
                    });
                    pos = result.end;
                    tokens = tokens.concat(result.tokens);
                    got = true;
                    break;
                }
            }
            if(!got && pos<expr.length) {
                var nearby = expr.slice(Math.max(0,pos), pos+5);
                throw(new Numbas.Error('jme.tokenise.invalid near',{expression: expr, position: pos, nearby: nearby}));
            }
        }
        return tokens;
    },

    shunt_type_actions: {
        'number': function(tok) { this.addoutput(tok); },
        'integer': function(tok) { this.addoutput(tok); },
        'string': function(tok) { this.addoutput(tok); },
        'boolean': function(tok) { this.addoutput(tok); },
        'name': function(tok) {
            var i = this.i;
            // if followed by an open bracket, this is a function application
            if( i<this.tokens.length-1 && this.tokens[i+1].type=="(") {
                    var name = this.funcSynonym(tok.nameWithoutAnnotation);
                    this.stack.push(new TFunc(name,tok.annotation));
                    this.numvars.push(0);
                    this.olength.push(this.output.length);
            } else {
                //this is a variable otherwise
                this.addoutput(tok);
            }
        },
        ',': function(tok) {
            //reached end of expression defining function parameter, so pop all of its operations off stack and onto output
            while( this.stack.length && this.stack[this.stack.length-1].type != "(" && this.stack[this.stack.length-1].type != '[') {
                this.addoutput(this.stack.pop())
            }
            this.numvars[this.numvars.length-1]++;
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left bracket in function'));
            }
        },
        'op': function(tok) {
            if(!tok.prefix) {
                var o1 = this.getPrecedence(tok.name);
                //while ops on stack have lower precedence, pop them onto output because they need to be calculated before this one. left-associative operators also pop off operations with equal precedence
                
                /** Should the next token on the stack be popped off?
                 *
                 * @returns {boolean}
                 */
                function should_pop() {
                    if(this.stack.length==0) {
                        return false;
                    }
                    var prev = this.stack[this.stack.length-1];
                    if(prev.type=="op" && ((o1 > this.getPrecedence(prev.name)) || (!this.isRightAssociative(tok.name) && o1 == this.getPrecedence(prev.name)))) {
                        return true;
                    }
                    if(prev.type=='keypair' && prev.pairmode=='match') {
                        return true;
                    }
                    return false;
                }
                while(should_pop.apply(this)) {
                    this.addoutput(this.stack.pop());
                }
            }
            this.stack.push(tok);
        },
        '[': function(tok) {
            var i = this.i;
            var tokens = this.tokens;
            if(i==0 || tokens[i-1].type=='(' || tokens[i-1].type=='[' || tokens[i-1].type==',' || tokens[i-1].type=='op' || tokens[i-1].type=='keypair') {
                this.listmode.push('new');
            }
            else {
                this.listmode.push('index');
            }
            this.stack.push(tok);
            this.numvars.push(0);
            this.olength.push(this.output.length);
        },
        ']': function(tok) {
            while( this.stack.length && this.stack[this.stack.length-1].type != "[" ) {
                this.addoutput(this.stack.pop());
            }
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left square bracket'));
            } else {
                this.stack.pop();    //get rid of left bracket
            }
            //work out size of list
            var n = this.numvars.pop();
            var l = this.olength.pop();
            if(this.output.length>l) {
                n++;
            }
            if(this.output.length==n-1) {
                n -= 1;
            }
            switch(this.listmode.pop()) {
            case 'new':
                this.addoutput(new TList(n))
                break;
            case 'index':
                var f = new TFunc('listval');
                f.vars = 2;
                this.addoutput(f);
                break;
            }
        },
        '(': function(tok) {
            this.stack.push(tok);
        },
        ')': function(tok) {
            while( this.stack.length && this.stack[this.stack.length-1].type != "(" ) {
                this.addoutput(this.stack.pop());
            }
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left bracket'));
            } else {
                this.stack.pop();    //get rid of left bracket
                //if this is a function call, then the next thing on the stack should be a function name, which we need to pop
                if( this.stack.length && this.stack[this.stack.length-1].type=="function")
                {
                    //work out arity of function
                    var n = this.numvars.pop();
                    var l = this.olength.pop();
                    if(this.output.length>l)
                        n++;
                    var f = this.stack.pop();
                    f.vars = n;
                    this.addoutput(f);
                }
            }
        },
        'keypair': function(tok) {
            var pairmode = null;
            for(var i=this.stack.length-1;i>=0;i--) {
                if(this.stack[i].type=='[' || jme.isFunction(this.stack[i],'dict')) {
                    pairmode = 'dict';
                    break;
                } else if(jme.isOp(this.stack[i],';')) {
                    pairmode = 'match';
                    break;
                } else if(this.stack[i].type=='(' && (this.stack.length==1 || !jme.isFunction(this.stack[i-1],'dict'))) {
                    break;
                }
            }
            if(pairmode===null) {
                throw(new Numbas.Error('jme.shunt.keypair in wrong place'));
            }
            tok.pairmode = pairmode;
            this.stack.push(tok);
        }
    },

    addoutput: function(tok) {
        if(tok.vars!==undefined) {
            if(this.output.length<tok.vars) {
                if(!this.options.addMissingArguments) {
                    throw(new Numbas.Error('jme.shunt.not enough arguments',{op:tok.name || tok.type}));
                } else {
                    for(var i=this.output.length;i<tok.vars;i++) {
                        var tvar = new types.TName('?');
                        tvar.added_missing = true;
                        this.output.push({tok:tvar});
                    }
                }
            }
            var thing = {
                tok: tok,
                args: this.output.splice(this.output.length-tok.vars,tok.vars)
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
            this.output.push(thing);
        }
        else {
            this.output.push({tok:tok});
        }
    },

    /** Shunt list of tokens into a syntax tree. Uses the shunting yard algorithm.
     *
     * @param {Array.<Numbas.jme.token>} tokens
     * @returns {Numbas.jme.tree}
     * @see Numbas.jme.Parser#tokenise
     * @see Numbas.jme.Parser#compile
     */
    shunt: function(tokens) {
        var parser = this;

        this.tokens = tokens;
        this.output = [];
        this.stack = [];
        this.numvars = [];
        this.olength = [];
        this.listmode = [];


        var type_actions = this.shunt_type_actions;

        /** Shunt the given token onto the output.
         *
         * @param {Numbas.jme.token} tok
         * @see Numbas.jme.Parser.shunt_type_actions
         */
        function shunt_token(tok) {
            if(tok.type in type_actions) {
                type_actions[tok.type].apply(parser,[tok]);
            }
        }
        for(this.i = 0; this.i < tokens.length; this.i++ ) {
            var tok = tokens[this.i];
            shunt_token(tok);
        }
        //pop all remaining ops on stack into output
        while(this.stack.length) {
            var x = this.stack[this.stack.length-1];
            if(x.type=="(") {
                if(!this.options.closeMissingBrackets) {
                    throw(new Numbas.Error('jme.shunt.no right bracket'));
                } else {
                    type_actions[')'].apply(this);
                }
            } else {
                this.stack.pop();
                this.addoutput(x);
            }
        }
        if(this.listmode.length>0) {
            throw(new Numbas.Error('jme.shunt.no right square bracket'));
        }
        if(this.output.length>1) {
            throw(new Numbas.Error('jme.shunt.missing operator'));
        }
        return this.output[0];
    },

    /** Compile an expression string to a syntax tree. (Runs {@link Numbas.jme.tokenise} then {@Link Numbas.jme.shunt}).
     *
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
        return tree;
    },
}
/** Regular expression to match whitespace (because '\s' doesn't match *everything*) */
jme.Parser.prototype.re.re_whitespace = '(?:[\\s \\f\\n\\r\\t\\v\\u00A0\\u2028\\u2029]|(?:\&nbsp;))';
jme.Parser.prototype.re.re_strip_whitespace = new RegExp('^'+jme.Parser.prototype.re.re_whitespace+'+');

/** Regular expressions for parser tokens.
 * Included for backwards-compatibility.
 *
 * @type {object.<RegExp>}
 * @see Numbas.jme.Parser#re
 */
jme.re = jme.Parser.prototype.re;

var fnSort = util.sortBy('id');
/** Options for the {@link Numbas.jme.funcObj} constructor.
 *
 * @typedef {object} Numbas.jme.scope_deletions
 * @property {object} variables - Names of deleted variables.
 * @property {object} functions - Names of deleted functions.
 * @property {object} rulesets - Names of deleted rulesets.
 */

/**
 * A JME evaluation environment.
 * Stores variable, function, and ruleset definitions.
 *
 * A scope may have a parent; elements of the scope are resolved by searching up through the hierarchy of parents until a match is found.
 *
 * @memberof Numbas.jme
 * @class
 * @property {object.<Numbas.jme.token>} variables - Dictionary of variables defined **at this level in the scope**. To resolve a variable in the scope, use {@link Numbas.jme.Scope.getVariable}.
 * @property {object.<Array.<Numbas.jme.funcObj>>} functions - Dictionary of functions defined at this level in the scope. Function names map to lists of functions: there can be more than one function for each name because of multiple dispatch. To resolve a function name in the scope, use {@link Numbas.jme.Scope.getFunction}.
 * @property {object.<Numbas.jme.rules.Ruleset>} rulesets - Dictionary of rulesets defined at this level in the scope. To resolve a ruleset in the scope, use {@link Numbas.jme.Scope.getRuleset}.
 * @property {Numbas.jme.scope_deletions} deleted - Names of deleted variables/functions/rulesets.
 * @property {Numbas.Question} question - The question this scope belongs to.
 *
 * @param {Numbas.jme.Scope[]} scopes - Either: nothing, in which case this scope has no parents; a parent Scope object; a list whose first element is a parent scope, and the second element is a dictionary of extra variables/functions/rulesets to store in this scope.
 */
var Scope = jme.Scope = function(scopes) {
    var s = this;
    this.parser = jme.standardParser;
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
        this.parser = this.parent.parser;
        extras = scopes[1] || {};
    }
    if(extras) {
        if(extras.variables) {
            for(var x in extras.variables) {
                this.setVariable(x,extras.variables[x]);
            }
        }
        if(extras.rulesets) {
            for(var x in extras.rulesets) {
                this.addRuleset(x,extras.rulesets[x]);
            }
        }
        if(extras.functions) {
            for(var x in extras.functions) {
                extras.functions[x].forEach(function(fn) {
                    s.addFunction(fn);
                });
            }
        }
    }
    return;
}
Scope.prototype = /** @lends Numbas.jme.Scope.prototype */ {
    /** Parser to use when compiling expressions.
     *
     * @type {Numbas.jme.Parser}
     */
    parser: jme.standardParser,

    /** Set the given variable name.
     *
     * @param {string} name
     * @param {Numbas.jme.token} value
     */
    setVariable: function(name, value) {
        name = name.toLowerCase();
        this.variables[name] = value;
        this.deleted.variables[name] = false;
    },
    /** Add a JME function to the scope.
     *
     * @param {Numbas.jme.funcObj} fn - function to add
     */
    addFunction: function(fn) {
        var name = fn.name.toLowerCase();
        if(!(name in this.functions)) {
            this.functions[name] = [fn];
        } else {
            this.functions[name].push(fn);
            delete this._resolved_functions[name];
        }
        this.deleted.functions[name] = false;
    },
    /** Add a ruleset to the scope.
     *
     * @param {string} name
     * @param {Numbas.jme.rules.Ruleset} set
     */
    addRuleset: function(name, set) {
        this.rulesets[name] = set;
        this.deleted.rulesets[name] = false;
    },
    /** Mark the given variable name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteVariable: function(name) {
        name = name.toLowerCase();
        this.deleted.variables[name] = true;
    },
    /** Mark the given function name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteFunction: function(name) {
        name = name.toLowerCase();
        this.deleted.functions[name] = true;
    },
    /** Mark the given ruleset name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteRuleset: function(name) {
        name = name.toLowerCase();
        this.deleted.rulesets[name] = true;
    },
    /** Get the object with given name from the given collection.
     *
     * @param {string} collection - The name of the collection. A property of this Scope object, i.e. one of `variables`, `functions`, `rulesets`.
     * @param {string} name - The name of the object to retrieve.
     * @returns {object}
     */
    resolve: function(collection,name) {
        var scope = this;
        name = name.toLowerCase();
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
    /** Find the value of the variable with the given name, if it's defined.
     *
     * @param {string} name
     * @returns {Numbas.jme.token}
     */
    getVariable: function(name) {
        return this.resolve('variables',name);
    },
    /** Get all definitions of the given function name.
     *
     * @param {string} name
     * @returns {Numbas.jme.funcObj[]} A list of all definitions of the given name.
     */
    getFunction: function(name) {
        name = name.toLowerCase();
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

    /** Get the definition of the function with the given name which matches the types of the given arguments.
     *
     * @param {Numbas.jme.token} tok - The token of the function or operator.
     * @param {Array.<Numbas.jme.token>} args
     * @returns {Numbas.jme.call_signature}
     */
    matchFunctionToArguments: function(tok,args) {
        var op = tok.name.toLowerCase();
        var fns = this.getFunction(op);
        if(fns.length==0) {
            if(tok.type=='function') {
                //check if the user typed something like xtan(y), when they meant x*tan(y)
                var possibleOp = op.slice(1);
                if(op.length>1 && this.getFunction(possibleOp).length) {
                    throw(new Numbas.Error('jme.typecheck.function maybe implicit multiplication',{name:op,first:op[0],possibleOp:possibleOp}));
                } else {
                    throw(new Numbas.Error('jme.typecheck.function not defined',{op:op,suggestion:op}));
                }
            }
            else {
                throw(new Numbas.Error('jme.typecheck.op not defined',{op:op}));
            }
        }

        /** Represent the difference between an input token and the description of the desired type returned by a signature checker.
         *
         * @param {Numbas.jme.token} tok
         * @param {Numbas.jme.signature_result_argument} typeDescription
         * @returns {Array.<string>} - The difference between the input argument and any of its child tokens, and the type described by `typeDescription`.
         */
        function type_difference(tok,typeDescription) {
            if(tok.type!=typeDescription.type) {
                return [typeDescription.type];
            }
            var out = [typeDescription.nonspecific ? tok.type : null];
            switch(typeDescription.type) {
                case 'list':
                    if(typeDescription.items) {
                        var items = sig_remove_missing(typeDescription.items);
                        for(var i=0;i<tok.value.length;i++) {
                            out = out.concat(type_difference(tok.value[i],items[i]));
                        }
                    }
            }
            return out;
        }

        /** Compare two function matches. A match is sorted earlier if, considering each argument in turn:
         * * it's more specific about a argument whose type is a collection;
         * * it matches the type of the corresponding argument exactly;
         * * the type it casts to is preferred over the other match's (occurs earlier in the input token's list of casts).
         *
         * @param {Numbas.jme.signature_result} m1
         * @param {Numbas.jme.signature_result} m2
         * @returns {number}
         */
        function compare_matches(m1,m2) {
            m1 = sig_remove_missing(m1);
            m2 = sig_remove_missing(m2);
            for(var i=0;i<args.length;i++) {
                var d1 = type_difference(args[i],m1[i]);
                var d2 = type_difference(args[i],m2[i]);
                for(var j=0;j<d1.length && j<d2.length;j++) {
                    if(j>=d1.length) {
                        return 1;
                    } else if(j>=d2.length) {
                        return -1;
                    }
                    if(d1[j]===null) {
                        if(d2[j]===null) {
                            continue;
                        } else {
                            return -1;
                        }
                    } else {
                        if(d2[j]===null) {
                            return 1;
                        } else {
                            if(args[i].casts) {
                                var casts = Object.keys(args[i].casts);
                                var i1 = casts.indexOf(d1[j]);
                                if(i1==-1) {
                                    i1 = Infinity;
                                }
                                var i2 = casts.indexOf(d2[j]);
                                if(i2==-1) {
                                    i2 = Infinity;
                                }
                                if(i1!=i2) {
                                    return i1<i2 ? -1 : 1;
                                }
                            }
                            continue;
                        }
                    }
                }
            }
            return 0;
        }
        var candidate = null;
        for(var j=0;j<fns.length; j++) {
            var fn = fns[j];
            if(fn.typecheck(args)) {
                var match = fn.intype(args);
                var k = 0;
                var exact_match = match.every(function(m,i) { 
                    if(m.missing) {
                        return;
                    }
                    var ok = args[k].type==m.type;
                    k += 1;
                    return ok; 
                });
                if(exact_match) {
                    return {fn: fn, signature: match};
                }
                var pcandidate = {fn: fn, signature: match};
                if(candidate===null || compare_matches(pcandidate.signature, candidate.signature)==-1) {
                    candidate = pcandidate;
                }
            }
        }
        return candidate;
    },
    /** Get the ruleset with the gien name.
     *
     * @param {string} name
     * @returns {Numbas.jme.rules.Ruleset}
     */
    getRuleset: function(name) {
        return this.resolve('rulesets',name);
    },
    /** Set the given ruleset name.
     *
     * @param {string} name
     * @param {Numbas.jme.rules.Ruleset[]} rules
     */
    setRuleset: function(name, rules) {
        name = name.toLowerCase();
        this.rulesets[name] = rules;
        this.deleted.rulesets[name] = false;
    },
    /** Collect together all items from the given collection.
     *
     * @param {string} collection - The name of the collection. A property of this Scope object, i.e. one of `variables`, `functions`, `rulesets`.
     * @returns {object} a dictionary of names to values
     */
    collect: function(collection) {
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
    /** Gather all variables defined in this scope.
     *
     * @returns {object.<Numbas.jme.token>} A dictionary of variables.
     */
    allVariables: function() {
        return this.collect('variables');
    },
    /** Gather all rulesets defined in this scope.
     *
     * @returns {object.<Numbas.jme.rules.Ruleset>} A dictionary of rulesets.
     */
    allRulesets: function() {
        return this.collect('rulesets');
    },
    /** Gather all functions defined in this scope.
     *
     * @returns {object.<Numbas.jme.funcObj[]>} A dictionary of function definitions: each name maps to a list of @link{Numbas.jme.funcObj}.
     */
    allFunctions: function() {
        var scope = this;
        var out = {}
        var name;
        /** Merge the given list of functions with any existing functions under that name.
         *
         * @param {string} name
         * @param {Array.<Numbas.jme.funcObj>} fns
         */
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

    /** Return a new scope created by unsetting the members specified by the given object.
     *
     * @param {object} defs - A dictionary with elements `variables`, `rulesets` and `functions`, each lists of names to unset.
     * @returns {Numbas.jme.Scope}
     */
    unset: function(defs) {
        var s = new Scope([this]);
        if(defs.variables) {
            defs.variables.forEach(function(v) {
                s.deleteVariable(v);
            });
        }
        if(defs.functions) {
            defs.functions.forEach(function(f) {
                s.deleteFunction(f);
            });
        }
        if(defs.rulesets) {
            defs.rulesets.forEach(function(r) {
                s.deleteRuleset(r);
            });
        }
        return s;
    },

    /** Evaluate an expression in this scope - equivalent to `Numbas.jme.evaluate(expr,this)`.
     *
     * @param {JME} expr
     * @param {object.<Numbas.jme.token|object>} [variables] - Dictionary of variables to sub into expression. Values are automatically wrapped up as JME types, so you can pass raw JavaScript values.
     * @param {boolean} [noSubstitution] - If true, don't substitute variable values from the scope into the expression.
     * @returns {Numbas.jme.token}
     */
    evaluate: function(expr,variables, noSubstitution) {
        var scope = this;
        if(variables) {
            scope = new Scope([this]);
            for(var name in variables) {
                scope.setVariable(name,jme.wrapValue(variables[name]));
            }
        }
        //if a string is given instead of an expression tree, compile it to a tree
        var tree;
        if( typeof(expr)=='string' ) {
            tree = this.parser.compile(expr,scope);
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
                if(tok.latex!==undefined) {
                    t.latex = tok.latex
                }
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
                var eargs = [];
                for(var i=0;i<tree.args.length;i++) {
                    eargs.push(scope.evaluate(tree.args[i],null,noSubstitution));
                }
                var matchedFunction = scope.matchFunctionToArguments(tok,eargs);
                if(matchedFunction) {
                    var signature = matchedFunction.signature;
                    var castargs = [];
                    var j = 0;
                    for(var i=0;i<signature.length;i++) {
                        if(signature[i].missing) {
                            castargs.push(new TNothing());
                            continue;
                        }
                        var arg = eargs[j];
                        if(signature[i]) {
                            castargs.push(jme.castToType(arg,signature[i])); 
                        } else {
                            castargs.push(arg);
                        }
                        j += 1;
                    }
                    return matchedFunction.fn.evaluate(castargs,scope);
                } else {
                    for(var i=0;i<=eargs.length;i++) {
                        if(eargs[i] && eargs[i].unboundName) {
                            throw(new Numbas.Error('jme.typecheck.no right type unbound name',{name:eargs[i].name}));
                        }
                    }
                    throw(new Numbas.Error('jme.typecheck.no right type definition',{op:op}));
                }
            }
        default:
            return tok;
        }
    },

    /** Options for {@link Numbas.jme.Scope.expandJuxtapositions}.
     *
     * @typedef {object} Numbas.jme.expand_juxtapositions_options
     * @property {boolean} singleLetterVariables - Enforce single-letter variables names: a name token like `xy` is rewritten to `x*y`.
     * @property {boolean} noUnknownFunctions - Rewrite applications of functions not defined in this scope to products, e.g. `x(y)` is rewritten to `x*y`.
     * @property {boolean} implicitFunctionComposition - If function names are juxtaposed, either as a single token or as (implicit) multiplication, rewrite as composition: e.g. `lnabs(x)` and `ln abs(x)` are both rewritten to `ln(abs(x))`.
     */

    /** Expand juxtapositions in variable and function names for implicit multiplication or composition.
     *
     * @param {Numbas.jme.tree} tree
     * @param {Numbas.jme.expand_juxtapositions_options} options
     * @returns {Numbas.jme.tree}
     */
    expandJuxtapositions: function(tree, options) {
        var scope = this;
        var default_options = {
            singleLetterVariables: true,    // `xy = x*y`
            noUnknownFunctions: true,    // `x(y) = x*y` when `x` is not the name of a function defined in this scope
            implicitFunctionComposition: true  // `lnabs(x) = ln(abs(x))`, only applied when `noUnknownFunctions` is true, and `ln abs(x) = ln(abs(x))`
        }
        options = options || default_options;

        if(!(options.singleLetterVariables || options.noUnknownFunctions || options.implicitFunctionComposition)) {
            return tree;
        }

        /** Construct a TFunc token with the given name, applying any synonyms.
         *
         * @param {string} name
         * @returns {Numbas.jme.token}
         */
        function tfunc(name) {
            return new TFunc(scope.parser.funcSynonym(name));
        }

        /** Get the names of all functions defined in the scope.
         *
         * @returns {object}
         */
        function get_function_names() {
            var defined_names = {};
            var s = scope;
            while(s) {
                for(var name in s.functions) {
                    defined_names[name] = true;
                }
                for(var name in jme.funcSynonyms) {
                    defined_names[name] = true;
                }
                if(s.parser.funcSynonyms) {
                    for(var name in s.parser.funcSynonyms) {
                        defined_names[name] = true;
                    }
                }
                s = s.parent
            }
            return defined_names;
        }

        var tok = tree.tok;

        if(options.implicitFunctionComposition && jme.isOp(tok,'*') && tree.args[1].tok.type=='function') {
            var search = true;
            var defined_names = get_function_names();
            while(search) {
                if(!jme.isOp(tree.tok,'*')) {
                    break;
                }
                search = false;
                var c = tree.args[0];
                while(jme.isOp(c.tok,'*')) {
                    c = c.args[1];
                }
                if(c.tok.type=='name' && defined_names[c.tok.name]) {
                    search = true;
                    var composed_fn = {tok: tfunc(c.tok.name), args: [tree.args[1]]};
                    composed_fn.tok.vars = 1;
                    if(c==tree.args[0]) {
                        tree = composed_fn;
                    } else {
                        /** Remove the multiplicand from an n-ary multiplication.
                         *
                         * @param {Numbas.jme.tree} t
                         * @returns {Numbas.jme.tree}
                         */
                        function remove_multiplicand(t) {
                            if(t.args[1]==c) {
                                return t.args[0];
                            } else {
                                return {tok: t.tok, args: [t.args[0], remove_multiplicand(t.args[1])]};
                            }
                        }
                        tree = {tok: tree.tok, args: [remove_multiplicand(tree.args[0]),composed_fn]};
                    }
                }
            }

        }

        if(tree.args) {
            tree.args = tree.args.map(function(arg){ return scope.expandJuxtapositions(arg,options); });
        }

        switch(tok.type) {
            case 'name':
                if(options.singleLetterVariables && tok.name.length>1) {
                    var bits = [];
                    var name = tok.name;
                    var re_name = /^[a-zA-Z][0-9]*(_([a-zA-Z]|[0-9]+|$))?'*/;
                    var m;
                    while(name.length && (m = re_name.exec(name))) {
                        bits.push(m[0]);
                        name = name.slice(m[0].length);
                    }
                    var tree = {tok: new TName(bits[0])};
                    for(var i=1;i<bits.length;i++) {
                        tree = {tok: this.parser.op('*'), args: [tree,{tok: new TName(bits[i])}]};
                    }
                    return tree;
                }
                break;
            case 'function':
                if(options.noUnknownFunctions) {
                    var defined_names = get_function_names();
                    var name = tok.name;
                    var breaks = [name.length];
                    for(var i=name.length-1;i>=0;i--) {
                        for(var j=0;j<breaks.length;j++) {
                            var sub = name.slice(i,breaks[j]);
                            if(defined_names[sub]) {
                                breaks = breaks.slice(0,j+1);
                                breaks.push(i);
                            }
                        }
                    }
                    var bits = [];
                    var remainder;
                    if(options.implicitFunctionComposition) {
                        breaks.reverse();
                        for(var i=0;i<breaks.length-1;i++) {
                            bits.push(name.slice(breaks[i],breaks[i+1]));
                        }
                        remainder = name.slice(0,breaks[0]);
                    } else {
                        if(breaks.length>1) {
                            bits.push(name.slice(breaks[1],breaks[0]));
                        }
                        remainder = name.slice(0,breaks[1]);
                    }
                    if(!bits.length) {
                        if(tree.args.length!=1) {
                            return tree;
                        } else {
                            return {tok: this.parser.op('*'), args: [this.expandJuxtapositions({tok: new TName(name)},options), tree.args[0]]};
                        }
                    }
                    var args = tree.args;
                    for(var i=bits.length-1;i>=0;i--) {
                        tree = {tok: tfunc(bits[i]), args: args};
                        tree.tok.vars = 1;
                        args = [tree];
                    }

                    // then interpret anything remaining on the left as multiplication by variables
                    if(remainder.length) {
                        var left = this.expandJuxtapositions({tok: new TName(remainder)},options);
                        tree = {tok: this.parser.op('*'), args: [left,tree]};
                    }
                    return tree;
                }
                break;
        }
        return tree;
    }
};
/** @typedef {object} Numbas.jme.token
 * @property {string} type
 * @see Numbas.jme.types
 */
/** The data types supported by JME expressions.
 *
 * @namespace Numbas.jme.types
 */
var types = jme.types = {}

jme.registerType = function(constructor,name,casts) {
    if(jme.types[name]) {
        throw(new Numbas.Error('jme.type.type already registered',{type:name}));
    }
    jme.types[name] = constructor;
    constructor.prototype.type = name;
    constructor.prototype.casts = casts;
}

/** Nothing type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @class
 */
var TNothing = types.TNothing = function() {};
jme.registerType(TNothing,'nothing');
/** Number type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number} value
 * @property {string|number|complex} originalValue - The value used to construct the token - either a string, a number, or a complex number object.
 * @property {string} type - "number"
 * @class
 * @param {number} num
 */
var TNum = types.TNum = function(num) {
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
jme.registerType(
    TNum,
    'number', 
    {
        'decimal': function(n) {
            var dp = 14;
            var re,im;
            if(n.value.complex) {
                var re = n.value.re.toFixed(dp);
                var im = n.value.im.toFixed(dp);
            } else {
                re = n.value.toFixed(dp);
                im = 0;
            }
            return new TDecimal(new math.ComplexDecimal(new Decimal(re), new Decimal(im)));
        }
    }
);

var TInt = types.TInt = function(num) {
    this.originalValue = num;
    this.value = Math.round(num);
}
jme.registerType(
    TInt,
    'integer',
    {
        'rational': function(n) {
            return new TRational(new math.Fraction(n.value,1));
        },
        'number': function(n) {
            var t = new TNum(n.value);
            t.originalValue = this.originalValue;
            return t;
        },
        'decimal': function(n) {
            return new TDecimal(new Decimal(n.value));
        }
    }
);

var TRational = types.TRational = function(value) {
    this.value = value;
}
jme.registerType(
    TRational,
    'rational',
    {
        'number': function(n) {
            return new TNum(n.value.numerator/n.value.denominator);
        },
        'decimal': function(n) {
            return new TDecimal((new Decimal(n.value.numerator)).dividedBy(new Decimal(n.value.denominator)));
        }
    }
);

/** A Decimal number.
 * Powered by [decimal.js](http://mikemcl.github.io/decimal.js/).
 *
 * @param {Numbas.math.ComplexDecimal|Decimal} value - If just a `Decimal` is given, it's turned into a `ComplexDecimal` with zero imaginary part.
 * @property {Numbas.jme.ComplexDecimal} value
 */
var TDecimal = types.TDecimal = function(value) {
    if(value instanceof Decimal) {
        value = new math.ComplexDecimal(value,new Decimal(0));
    }
    this.value = value;
}
jme.registerType(
    TDecimal,
    'decimal',
    {
        'number': function(n) {
            if(n.value.im.isZero()) {
                return new TNum(n.value.re.toNumber());
            } else {
                return new TNum({complex: true, re: n.value.re.toNumber(), im: n.value.im.toNumber()});
            }
        }
    }
);

/** String type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} value
 * @property {boolean} latex - Is this string LaTeX code? If so, it's displayed as-is in math mode.
 * @property {boolean} safe - If true, don't run {@link Numbas.jme.subvars} on this token when it's evaluated.
 * @property {string} type "string"
 * @class
 * @param {string} s
 */
var TString = types.TString = function(s) {
    this.value = s;
}
jme.registerType(TString,'string');

/** Boolean type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {boolean} value
 * @property {string} type - "boolean"
 * @class
 * @param {boolean} b
 */
var TBool = types.TBool = function(b) {
    this.value = b;
}
jme.registerType(TBool,'boolean');

/** HTML DOM element.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Element} value
 * @property {string} type - "html"
 * @class
 * @param {Element} html
 */
var THTML = types.THTML = function(html) {
    if(html.ownerDocument===undefined && !html.jquery) {
        throw(new Numbas.Error('jme.thtml.not html'));
    }
    if(window.jQuery) {
        this.value = $(html);
    } else {
        var elem = document.createElement('div');
        if(typeof html == 'string') {
            elem.innerHTML = html;
        } else {
            elem.appendChild(html);
        }
        this.value = elem.children;
    }
}
jme.registerType(THTML,'html');

/** List of elements of any data type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number} vars - Length of list.
 * @property {Array.<Numbas.jme.token>} value - Values (may not be filled in if the list was created empty).
 * @property {string} type - "html"
 * @class
 * @param {number|Array.<Numbas.jme.token>} value - Either the size of the list, or an array of values.
 */
var TList = types.TList = function(value) {
    switch(typeof(value)) {
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
jme.registerType(TList,'list');

/** Key-value pair assignment.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} key
 * @class
 * @param {string} key
 */
var TKeyPair = types.TKeyPair = function(key) {
    this.key = key;
}
TKeyPair.prototype = {
    vars: 1
}
jme.registerType(TKeyPair,'keypair');

/** Dictionary: map strings to values.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {object.<Numbas.jme.token>} value - Map strings to tokens. Undefined until this token is evaluated.
 * @property {string} type - "dict"
 * @class
 * @param {object.<Numbas.jme.token>} value
 */
var TDict = types.TDict = function(value) {
    this.value = value;
}
jme.registerType(TDict,'dict');

/** Set type: a collection of elements, with no duplicates.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<Numbas.jme.token>} value - Array of elements. Constructor assumes all elements are distinct
 * @property {string} type - "set"
 * @class
 * @param {Array.<Numbas.jme.token>} value
 */
var TSet = types.TSet = function(value) {
    this.value = value;
}
jme.registerType(
    TSet,
    'set',
    {
        'list': function(s) {
            return new TList(s.value);
        }
    }
);

/** Vector type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<number>} value - Array of components
 * @property {string} type - "vector"
 * @class
 * @param {Array.<number>} value
 */
var TVector = types.TVector = function(value) {
    this.value = value;
}
jme.registerType(
    TVector,
    'vector',
    {
        'list': function(v) {
            return new TList(v.value.map(function(n){ return new TNum(n); }));
        }
    }
);

/** Matrix type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {matrix} value - Array of rows (which are arrays of numbers)
 * @property {string} type - "matrix"
 * @class
 * @param {matrix} value
 */
var TMatrix = types.TMatrix = function(value) {
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
jme.registerType(
    TMatrix,
    'matrix',
    {
        'list': function(m) {
            return new TList(m.value.map(function(r){return new TVector(r)}));
        }
    }
);

/** A range of numerical values - either discrete or continuous.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<number>} value - `[start,end,step]`
 * @property {number} size - The number of values in the range (if it's discrete, `undefined` otherwise).
 * @property {number} start - The lower bound of the range.
 * @property {number} end - The upper bound of the range.
 * @property {number} step - The difference between elements in the range.
 * @property {string} type - "range"
 * @class
 * @param {Array.<number>} range - `[start,end,step]`
 */
var TRange = types.TRange = function(range) {
    this.value = range;
    if(this.value!==undefined)
    {
        this.start = this.value[0];
        this.end = this.value[1];
        this.step = this.value[2];
        this.size = Math.floor((this.end-this.start)/this.step);
    }
}
jme.registerType(
    TRange,
    'range',
    {
        'list': function(r) {
            return new TList(math.rangeToList(r.value).map(function(n){return new TNum(n)}));
        }
    }
);

/** Variable name token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} name - The name, prefixed with any annotations joined by colons.
 * @property {string} nameWithoutAnnotation - The name without the annotations.
 * @property {string} value - Same as `name`.
 * @property {Array.<string>} annotation - List of annotations (used to modify display).
 * @property {string} type - "name"
 * @class
 * @param {string} name
 * @param {Array.<string>} annotation
 */
var TName = types.TName = function(name,annotation) {
    this.annotation = annotation;
    this.name = name;
    this.nameWithoutAnnotation = name;
    if(this.annotation && this.annotation.length) {
        this.name = this.annotation.join(':') + ':' + this.name;
    }
    this.value = this.name;
}
jme.registerType(TName,'name');

/** JME function token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} name - The function's name, prefixed with any annotations joined by colons.
 * @property {string} nameWithoutAnnotation - The name without the annotations.
 * @property {Array.<string>} annotation - List of annotations (used to modify display).
 * @property {number} vars - Arity of the function.
 * @property {string} type - "function"
 * @class
 * @param {string} name
 * @param {Array.<string>} [annotation] - Any annotations for the function's name.
 */
var TFunc = types.TFunc = function(name,annotation) {
    this.name = name;
    this.annotation = annotation;
    this.nameWithoutAnnotation = name;
    if(this.annotation && this.annotation.length) {
        this.name = this.annotation.join(':') + ':' + this.name;
    }
}
TFunc.prototype = {
    vars: 0
}
jme.registerType(TFunc,'function');

/** Unary/binary operation token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} name
 * @property {number} vars - Arity of the operation.
 * @property {boolean} postfix
 * @property {boolean} prefix
 * @property {boolean} commutative
 * @property {boolean} associative
 * @property {string} type - "op"
 * @class
 * @param {string} op - Name of the operation.
 * @param {boolean} postfix
 * @param {boolean} prefix
 * @param {number} arity - The number of parameters the operation takes.
 * @param {boolean} commutative
 * @param {boolean} associative
 */
var TOp = types.TOp = function(op,postfix,prefix,arity,commutative,associative) {
    this.name = op;
    this.postfix = postfix || false;
    this.prefix = prefix || false;
    this.vars = arity || 2;
    this.commutative = commutative || false;
    this.associative = associative || false;
}
jme.registerType(TOp,'op');

/** Punctuation token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} type - The punctuation character.
 * @class
 * @param {string} kind - The punctuation character.
 */
var TPunc = types.TPunc = function(kind) {
    this.type = kind;
}

/** A JME expression, as a token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Numbas.jme.tree} tree
 * @class
 * @param {string|Numbas.jme.tree} tree
 */
var TExpression = types.TExpression = function(tree) {
    if(typeof(tree)=='string') {
        tree = jme.compile(tree);
    }
    if(tree && tree.tok.type=='expression' && !tree.args) {
        tree = tree.tok.tree;
    }
    this.tree = tree;
}
jme.registerType(TExpression,'expression');

/** Arities of built-in operations.
 * 
 * @readonly
 * @memberof Numbas.jme
 * @enum {number} */
var arity = jme.arity = {
    '!': 1,
    'not': 1,
    'fact': 1,
    '+u': 1,
    '-u': 1,
    '/u': 1
}
/** Some names represent different operations when used as prefix. This dictionary translates them.
 *
 * @readonly
 * @memberof Numbas.jme
 * @enum {string}
 */
var prefixForm = jme.prefixForm = {
    '+': '+u',
    '-': '-u',
    '/': '/u',
    '!': 'not',
    'not': 'not'
}
/** Some names represent different operations when used as prefix. This dictionary translates them.
 *
 * @readonly
 * @memberof Numbas.jme
 * @enum {string}
 */
var postfixForm = jme.postfixForm = {
    '!': 'fact'
}
/** Operator precedence - operators with lower precedence are evaluated first.
 * 
 * @enum {number}
 * @memberof Numbas.jme
 * @readonly
 */
var precedence = jme.precedence = {
    ';': 0,
    'fact': 1,
    'not': 1,
    '+u': 2.5,
    '-u': 2.5,
    '/u': 2.5,
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
/** Synonyms of operator names - keys in this dictionary are translated to their corresponding values.
 *
 * @enum {string}
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
    '¬': 'not',
    '⟹': 'implies',
    '≠': '<>',
    '≥': '>=',
    '≤': '<=',
    'ˆ': '^'
}
/** Synonyms of function names - keys in this dictionary are translated to their corresponding values.
 *
 * @enum {string}
 * @memberof Numbas.jme
 * @readonly
 */
var funcSynonyms = jme.funcSynonyms = {
    'sqr':'sqrt',
    'gcf': 'gcd',
    'sgn':'sign',
    'len': 'abs',
    'length': 'abs',
    'verb': 'verbatim',
    'dec': 'decimal'
};
/** Operations which evaluate lazily - they don't need to evaluate all of their arguments.
 *
 * @memberof Numbas.jme
 */
var lazyOps = jme.lazyOps = [];

/** Right-associative operations.
 *
 * @memberof Numbas.jme
 */
var rightAssociative = jme.rightAssociative = {
    '^': true,
    '+u': true,
    '-u': true,
    '/u': true
}
/** Operations which commute.
 *
 * @enum {boolean}
 * @memberof Numbas.jme
 * @readonly
 */
var commutative = jme.commutative =
{
    '*': true,
    '+': true,
    'and': true,
    '=': true,
    'xor': true
};

/** Operations which are associative, i.e. (a∘b)∘c = a∘(b∘c).
 *
 * @enum {boolean}
 * @memberof Numbas.jme
 * @readonly
 */
var associative = jme.associative =
{
    '*': true,
    '+': true,
    'and': true,
    'or': true,
    'xor': true
};

/** Binary operations which have an equivalent operation written the other way round.
 *
 * @enum {string}
 * @memberof Numbas.jme
 */
var converseOps = jme.converseOps = {
    '<': '>',
    '>': '<',
    '<=': '>=',
    '>=': '<='
}


/** A standard parser for JME expressions.
 *
 * @memberof Numbas.jme
 * @type {Numbas.jme.Parser}
 */
var standardParser = jme.standardParser = new jme.Parser();
jme.standardParser.addBinaryOperator(';',{precedence:0});


/** A function which checks whether a {@link Numbas.jme.funcObj} can be applied to the given arguments.
 *
 * @callback Numbas.jme.typecheck_fn
 * @param {Array.<Numbas.jme.token>} variables
 * @returns {boolean}
 */

/** Evaluate a JME function on a list of arguments and in a given scope.
 *
 * @callback Numbas.jme.evaluate_fn
 * @param {Array.<Numbas.jme.tree|Numbas.jme.token|object>} args - Arguments of the function. If the function is {@link Numbas.jme.lazyOps|lazy}, syntax trees are passed, otherwise arguments are evaluated to JME tokens first. If the {@link Numbas.jme.funcObj_options|unwrapValues} option is set, the arguments are unwrapped to raw JavaScript values.
 * @param {Numbas.jme.Scope} scope - Scope in which the function is evaluated.
 * @returns {Numbas.jme.token|object} If {@link Numbas.jme.funcObj_options|unwrapValues} is set, the raw value of the result, otherwise a JME token.
 */

/** Options for the {@link Numbas.jme.funcObj} constructor.
 *
 * @typedef {object} Numbas.jme.funcObj_options
 * @property {Numbas.jme.typecheck_fn} typecheck - Check that this function can be evaluated on the given arguments.
 * @property {Numbas.jme.evaluate_fn} evaluate - Evaluate the function on a list of arguments and in a given scope.
 * @property {boolean} unwrapValues - Unwrap list elements in arguments into javascript primitives before passing to the evaluate function?
 */

var funcObjAcc = 0;    //accumulator for ids for funcObjs, so they can be sorted

/**
 * A JME function. Capable of confirming that it can be evaluated on a given list of arguments, and returning the result of its evaluation on a list of arguments inside a given scope.
 *
 * @memberof Numbas.jme
 * @class
 * @param {string} name
 * @param {Array.<Function|string>} intype - A list of data type constructors for the function's parameters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type. If `null`, then `options.typecheck` is used.
 * @param {Function} outcons - The constructor for the output value of the function.
 * @param {Numbas.jme.evaluate_fn} fn - JavaScript code which evaluates the function.
 * @param {Numbas.jme.funcObj_options} options
 *
 */
var funcObj = jme.funcObj = function(name,intype,outcons,fn,options)
{
    /** Globally unique ID of this function object.
     *
     * @name id
     * @member {number}
     * @memberof Numbas.jme.funcObj
     */
    this.id = funcObjAcc++;
    options = options || {};

    /** Parse a signature definition. 
     *
     * @param {string|Function} sig - Either a string consisting of a variable name optionally followed by '*' and/or '?', a {@link Numbas.jme.token} constructor, or a {@link Numbas.jme.signature} function.
     * @returns {Numbas.jme.signature}
     */
    function parse_signature(sig) {
        if(typeof(sig)=='function') {
            if(sig.kind!==undefined) {
                return sig;
            }
            return jme.signature.type(sig.prototype.type);
        } else {
            if(sig[0]=='*') {
                return jme.signature.multiple(parse_signature(sig.slice(1)));
            } else if(sig.match(/^\[(.*?)\]$/)) {
                return jme.signature.optional(parse_signature(sig.slice(1,sig.length-1)));
            }
            if(sig=='?') {
                return jme.signature.anything();
            }
            return jme.signature.type(jme.types[sig].prototype.type);
        }
    }

    name = name.toLowerCase();
    /** The function's name.
     *
     * @name name
     * @member {string}
     * @memberof Numbas.jme.funcObj
     */
    this.name = name;

    /** A description of what the function does.
     *
     * @name description
     * @member {string}
     * @memberof Numbas.jme.funcObj
     */
    this.description = options.description || '';

    /** Check the given list of arguments against this function's calling signature.
     *
     * @name intype
     * @memberof Numbas.jme.funcObj
     * @member {Function}
     * @param {Array.<Numbas.jme.token>}
     * @returns {Array.<string>|boolean} `false` if the given arguments are not valid for this function, or a list giving the desired type for each argument - arguments shouldbe cast to these types before evaluating.
     */
    this.intype = jme.signature.sequence.apply(this,intype.map(parse_signature));
    /** The return type of this function. Either a Numbas.jme.token constructor function, or the string '?', meaning unknown type.
     *
     * @name outtype
     * @member {Function|string}
     * @memberof Numbas.jme.funcObj
     */
    if(typeof(outcons)=='function') {
        this.outtype = outcons.prototype.type;
    } else {
        this.outtype = '?';
    }
    this.outcons = outcons;
    /** Javascript function for the body of this function.
     *
     * @name fn
     * @member {Function}
     * @memberof Numbas.jme.funcObj
     */
    this.fn = fn;
    /** Can this function be called with the given list of arguments?
     *
     * @function typecheck
     * @param {Numbas.jme.token[]} variables
     * @returns {boolean}
     * @memberof Numbas.jme.funcObj
     */
    var check_signature = this.intype;
    this.typecheck = options.typecheck || function(variables) {
        var match = check_signature(variables);
        return match!==false && sig_remove_missing(match).length==variables.length;
    }
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
    /** Does this function behave randomly?
     *
     * @name random
     * @member {boolean}
     * @memberof Numbas.jme.funcObj
     */
    this.random = options.random;
}
/** Randoly generate values for each of the given names between `min` and `max`.
 *
 * @param {Array.<string>} varnames
 * @param {number} min
 * @param {number} max
 * @param {number} times - The number of values to produce for each name.
 * @returns {Array.<object>} - The list of dictionaries mapping names to their values.
 */
function randoms(varnames,min,max,times)
{
    times *= varnames.length || 1;
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
/** Does every name in `array1` occur in `array2`?
 *
 * @param {Array.<string>} array1
 * @param {Array.<string>} array2
 * @returns {boolean}
 */
function varnamesAgree(array1, array2) {
    var name;
    for(var i=0; i<array1.length; i++) {
        if( (name=array1[i])[0]!='$' && !array2.contains(name) )
            return false;
    }
    return true;
};
/** Decide if two numbers are close enough to count as equal.
 *
 * @callback Numbas.jme.checkingFunction
 * @param {number} r1
 * @param {number} r2
 * @param {number} tolerance - A measure of how close the results need to be to count as equal. What this means depends on the checking function.
 * @returns {boolean} - True if `r1` and `r2` are close enough to be equal.
 */
/**
 * Numerical comparison functions.
 *
 * @enum {Numbas.jme.checkingFunction}
 * @memberof Numbas.jme
 */
var checkingFunctions = jme.checkingFunctions =
{
    /** Absolute difference between variables - fail if `Math.abs(r1-r2)` is bigger than `tolerance`.
     *
     * @param {number} r1
     * @param {number} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    absdiff: function(r1,r2,tolerance)
    {
        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
    },
    /** Relative (proportional) difference between variables - fail if `r1/r2 - 1` is bigger than `tolerance`.
     *
     * @param {number} r1
     * @param {number} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
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
    /** Round both values to `tolerance` decimal places, and fail if unequal.
     *
     * @param {number} r1
     * @param {number} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    dp: function(r1,r2,tolerance) {
        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        tolerance = Math.floor(Math.abs(tolerance));
        return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
    },
    /** Round both values to `tolerance` significant figures, and fail if unequal. 
     *
     * @param {number} r1
     * @param {number} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    sigfig: function(r1,r2,tolerance) {
        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        tolerance = Math.floor(Math.abs(tolerance));
        return math.eq(math.siground(r1,tolerance), math.siground(r2,tolerance));
    }
};
/** Custom substituteTree behaviour for specific functions - for a given usage of a function, substitute in variable values from the scope.
 *
 * Functions have the signature `<tree with function call at the top, scope, allowUnbound>`.
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
/** Find all variables used in given syntax tree.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.tree} tree
 * @param {Array.<string>} boundvars - Variables to be considered as bound (don't include them).
 * @param {Numbas.jme.Scope} scope
 * @returns {Array.<string>}
 */
var findvars = jme.findvars = function(tree,boundvars,scope)
{
    if(!scope)
        scope = jme.builtinScope;
    if(boundvars===undefined)
        boundvars = [];
    if(!tree) {
        return [];
    }
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
                var sbits = util.splitbrackets(plain,'{','}','(',')');
                for(var k=1;k<=sbits.length-1;k+=2)
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
                            var sbits = util.splitbrackets(expr,'{','}','(',')');
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
/** Check that two values are equal.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.token} r1
 * @param {Numbas.jme.token} r2
 * @param {Function} checkingFunction - One of {@link Numbas.jme.checkingFunctions}.
 * @param {number} checkingAccuracy
 * @returns {boolean}
 */
var resultsEqual = jme.resultsEqual = function(r1,r2,checkingFunction,checkingAccuracy)
{    // first checks both expressions are of same type, then uses given checking type to compare results
    var type = jme.findCompatibleType(r1.type,r2.type);
    if(!type) {
        return false;
    }
    r1 = jme.castToType(r1,type);
    r2 = jme.castToType(r2,type);
    var v1 = r1.value, v2 = r2.value;

    switch(type) {
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
 * @function
 * @param {Numbas.jme.tree} tree
 * @returns {string[]}
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

/** Use JS comparison operators to compare the `value` property of both tokens.
 * Used when the token wraps a JS built-in type, such as string, number or boolean.
 *
 * @memberof Numbas.jme
 * @function
 * @see Numbas.jme.tokenComparisons
 * @param {Numbas.jme.token} a
 * @param {Numbas.jme.token} b
 * @returns {boolean}
 */
var compareTokensByValue = jme.compareTokensByValue = function(a,b) {
    return a.value>b.value ? 1 : a.value<b.value ? -1 : 0;
}

/** Functions to compare two tokens of the same type.
 * Returns -1 if a<b, 0 if a=b, and 1 if a>b.
 *
 * @see Numbas.jme.compareTokens
 * @memberof Numbas.jme
 */
var tokenComparisons = Numbas.jme.tokenComparisons = {
    'number': compareTokensByValue,
    'integer': compareTokensByValue,
    'rational': function(a,b) {
        a = a.value.toFloat();
        b = b.value.toFloat();
        return a>b ? 1 : a<b ? -1 : 0;
    },
    'string': compareTokensByValue,
    'boolean': compareTokensByValue
}

/** Compare two tokens, for the purposes of sorting.
 * Uses JavaScript comparison for numbers, strings and booleans, and {@link Numbas.jme.compareTrees} for everything else, or when types differ.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.token} a
 * @param {Numbas.jme.token} b
 * @see Numbas.jme.tokenComparisons
 * @returns {number} -1 if `a < b`, 1 if `a > b`, else 0.
 */
var compareTokens = jme.compareTokens = function(a,b) {
    if(a.type!=b.type) {
        var type = jme.findCompatibleType(a.type,b.type);
        if(type) {
            var ca = jme.castToType(a,type);
            var cb = jme.castToType(b,type);
            return compareTokens(ca,cb);
        } else {
            return jme.compareTrees({tok:a},{tok:b});
        }
    } else {
        var compare = tokenComparisons[a.type];
        if(compare) {
            return compare(a,b);
        } else {
            return jme.compareTrees({tok:a},{tok:b});
        }
    }
}

/** Produce a comparison function which sorts tokens after applying a function to them.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Function} fn - take a token and return a token
 * @returns {Function}
 */
jme.sortTokensBy = function(fn) {
    return function(a,b) {
        a = fn(a);
        b = fn(b);
        if(a===undefined) {
            return b===undefined ? 0 : 1;
        } else if(b===undefined) {
            return -1;
        } else {
            return jme.compareTokens(a,b);
        }
    }
}

/** Are the two given trees exactly the same?
 *
 * @memberof Numbas.jme
 * @param {Numbas.jme.tree} a
 * @param {Numbas.jme.tree} b
 * @returns {boolean}
 */
var treesSame = jme.treesSame = function(a,b) {
    var ta = a.tok;
    var tb = b.tok;
    if(a.args || b.args) {
        if(!(a.args && b.args && a.args.length==b.args.length)) {
            return false;
        }
        for(var i=0; i<a.args.length;i++) {
            if(!treesSame(a.args[i],b.args[i])) {
                return false;
            }
        }
    } else {
        var type = jme.findCompatibleType(ta.type,tb.type);
        if(!type) {
            return false;
        } else {
            ta = jme.castToType(ta,type);
            tb = jme.castToType(tb,type);
        }
    }
    return util.eq(a.tok,b.tok);
}

/** Compare two trees.
 *
 * * Compare lists of variables lexically using {@link Numbas.jme.varsUsed}; longest goes first if one is a prefix of the other
 * * then monomials before anything else
 * * then by data type
 * * then by function name
 * * otherwise return 0.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.tree} a
 * @param {Numbas.jme.tree} b
 * @returns {number} -1 if `a` should appear to the left of `b`, 0 if equal, 1 if `a` should appear to the right of `b`.
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
            var dd = jme.compareTrees(mb.degree,ma.degree);
            if(dd!=0) {
                return dd;
            } else {
                var dc = compareTrees(ma.coefficient,mb.coefficient);
                return dc!=0 ? dc : sign_a==sign_b ? 0 : sign_a ? 1 : -1;
            }
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

    if(a.args || b.args) {
        var aargs = a.args || [];
        var bargs = b.args || [];
        if(aargs.length!=bargs.length) {
            return aargs.length<bargs.length ? -1 : 1;
        }
        for(var i=0;i<aargs.length;i++) {
            var c = jme.compareTrees(aargs[i],bargs[i]);
            if(c!=0) {
                return c;
            }
        }
    }

    switch(a.tok.type) {
        case 'op':
        case 'function':
            /** Is the given tree of the form `?^?`, `?*(?^?)` or `?/(?^?)`.
             *
             * @param {Numbas.jme.tree} t
             * @returns {boolean}
             */
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
            break;
        case 'expression':
            return jme.compareTrees(a.tok.tree, b.tok.tree);
        default:
            if(jme.isType(a.tok,'number')) {
                var na = jme.castToType(a.tok,'number').value;
                var nb = jme.castToType(b.tok,'number').value;
                if(na.complex || nb.complex) {
                    na = na.complex ? na : {re:na,im:0};
                    nb = nb.complex ? nb : {re:nb,im:0};
                    var gt = na.re > nb.re || (na.re==nb.re && na.im>nb.im);
                    var eq = na.re==nb.re && na.im==nb.im && sign_a==sign_b;
                    return gt ? 1 : eq ? 0 : -1;
                } else {
                    return na<nb ? -1 : na>nb ? 1 : sign_a==sign_b ? 0 : sign_a ? 1 : -1;
                }
            }
    }
    return sign_a==sign_b ? 0 : sign_a ? 1 : -1;
}

/** Infer the types of variables in an expression, by trying all definitions of functions and returning only those that can be satisfied by an assignment of types to variable names.
 * Doesn't work well on functions with unknown return type, like `if` and `switch`. In these cases, it assumes the return type of the function is whatever it needs to be, even if that is inconsistent with what the function would actually do.
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.Scope} scope
 * @returns {object.<string>} A dictionary mapping names to types.
 */
jme.inferVariableTypes = function(tree,scope) {
    /** Create an annotated copy of the tree, fetching definitions for functions, and storing state to enumerate function definitions.
     *
     * @param {Numbas.jme.tree} tree
     */
    function AnnotatedTree(tree) {
        this.tok = tree.tok;
        if(tree.args) {
            this.args = tree.args.map(function(a){ return new AnnotatedTree(a); });
        }
        switch(tree.tok.type) {
            case 'op':
            case 'function':
                var fns = scope.getFunction(tree.tok.name);
                this.fns = [];
                this.signature_enumerators = [];
                for(var i=0;i<fns.length;i++) {
                    var fn = fns[i];
                    var se = new SignatureEnumerator(fn.intype);
                    if(se.is_static()) {
                        if(se.length() != tree.args.length) {
                            continue;
                        }
                        var sig = se.signature();
                        var constants_ok = this.args.every(function(arg,j) {
                            switch(arg.tok.type) {
                                case 'op':
                                case 'function':
                                    for(var i=0;i<arg.fns.length;i++) {
                                        if(jme.findCompatibleType(arg.fns[i].outtype,sig[j])!==undefined) {
                                            return true;
                                        }
                                    }
                                    return false;
                                case 'name':
                                    return true;
                                default:
                                    return jme.findCompatibleType(arg.tok.type,sig[j])!==undefined;
                            }
                        });
                        if(!constants_ok) {
                            continue;
                        }
                    }
                    this.fns.push(fn);
                    this.signature_enumerators.push(se);
                }
                this.pos = 0;
                break;
            default:
                break;
        }
    }
    AnnotatedTree.prototype = /** @lends AnnotatedTree.prototype */ {

        toString: function() {
            var args;
            if(this.args) {
                args = this.args.map(function(arg){ return arg.toString(); });
            }
            switch(this.tok.type) {
                case 'op':
                case 'function':
                    var header = this.tok.name+': '+this.signature_enumerators[this.pos].signature().join('->')+'->'+this.fns[this.pos].outtype;
                    return jme.display.align_text_blocks(header, args);
                default:
                    if(args) {
                        return jme.display.align_text_blocks(this.tok.type,args);
                    } else {
                        return jme.display.treeToJME({tok:this.tok});
                    }
            }
        },

        /** Reset this tree to its initial state.
         */
        backtrack: function() {
            if(this.args) {
                this.args.forEach(function(t){t.backtrack();});
            }
            switch(this.tok.type) {
                case 'op':
                case 'function':
                    this.pos = 0;
                    this.signature_enumerators.forEach(function(se){se.backtrack();});
                    break;
            }
        },

        /** Find an assignment of types to variables in this tree which produces the given output type.
         *
         * @param {string} outtype - The name of the desired type of this tree.
         * @param {object} assignments - Assignments of variables that have already been made.
         * @returns {object} - A dictionary of assignments.
         */
        assign: function(outtype,assignments) {
            if(outtype=='?') {
                outtype = undefined;
            }
            /** Find a type which can be cast to all of the desired types.
             *
             * @param {Array.<string>} types - The names of the desired types.
             * @returns {string}
             */
            function mutually_compatible_type(types) {
                var preferred_types = ['number','decimal'];
                /** Can the given type be cast to all of the desired types?
                 *
                 * @param {string} x - The name of a type.
                 * @returns {boolean}
                 */
                function mutually_compatible(x) {
                    var casts = jme.types[x].prototype.casts || {};
                    return types.every(function(t) { return t==x || casts[t]; });
                }
                for(var i=0;i<preferred_types.length;i++) {
                    var type = preferred_types[i];
                    if(mutually_compatible(type)) {
                        return type;
                    }
                }
                for(var x in jme.types) {
                    if(mutually_compatible(x)) {
                        return x;
                    }
                }
            }

            switch(this.tok.type) {
                case 'name':
                    var name = this.tok.name.toLowerCase();
                    if(outtype===undefined || assignments[name]==outtype) {
                        return assignments;
                    } else if(assignments[name]!==undefined && assignments[name].type!=outtype) {
                        assignments = util.copyobj(assignments,true);
                        assignments[name].casts[outtype] = true;
                        var type = mutually_compatible_type(Object.keys(assignments[name].casts));
                        if(type) {
                            assignments[name].type = type;
                            return assignments;
                        } else {
                            return false;
                        }
                    } else {
                        assignments = util.copyobj(assignments,true);
                        var casts = {};
                        casts[outtype] = true;
                        assignments[name] = {
                            type: outtype,
                            casts: casts
                        }
                        return assignments;
                    }
                case 'op':
                case 'function':
                    if(!this.fns.length) {
                        return this.assign_args(assignments);
                    }
                    if(outtype && !jme.findCompatibleType(this.fns[this.pos].outtype,outtype)) {
                        return false;
                    }
                    var sig = this.signature_enumerators[this.pos].signature();
                    if(sig.length!=this.args.length) {
                        return false;
                    }
                    return this.assign_args(assignments,sig);
                default:
                    if(outtype && !jme.findCompatibleType(this.tok.type,outtype)) {
                        return false;
                    }
                    return this.assign_args(assignments);
            }
        },

        /** Find an assignment based on this tree's arguments, with optional specified types for each of the arguments.
         *
         * @param {object} assignments - The data types of names that have been assigned.
         * @param {Numbas.jme.signature_result} [signature]
         * @returns {object} - A dictionary of assignments.
         */
        assign_args: function(assignments,signature) {
            if(!this.args) {
                return assignments;
            }
            for(var i=0;i<this.args.length;i++) {
                var outtype = signature!==undefined ? signature[i] : undefined;
                assignments = this.args[i].assign(outtype,assignments);
                if(assignments===false) {
                    return false;
                }
            }
            return assignments;
        },

        /** Advance to the next state.
         *
         * @returns {boolean} True if successful.
         */
        next: function() {
            if(this.args) {
                for(var i=0;i<this.args.length;i++) {
                    if(this.args[i].next()) {
                        for(i++;i<this.args.length;i++) {
                            this.args[i].backtrack();
                        }
                        return true;
                    }
                }
            }
            switch(this.tok.type) {
                case 'op':
                case 'function':
                    var s = this.signature_enumerators[this.pos].next();
                    if(s) {
                        this.args.forEach(function(arg){ arg.backtrack(); });
                        return true;
                    } else if(this.pos<this.fns.length-1) {
                        this.pos += 1;
                        this.signature_enumerators[this.pos].backtrack();
                        this.args.forEach(function(arg){ arg.backtrack(); });
                        return true;
                    } else {
                        return false;
                    }
                default:
                    return false;
            }
        }
    }

    var at = new AnnotatedTree(tree);
    do {
        var res = at.assign(undefined,{});
        if(res!==false) {
            var o = {};
            for(var x in res) {
                o[x] = res[x].type;
            }
            return o;
        }
    } while(at.next());

    return false;
}

var SignatureEnumerator = jme.SignatureEnumerator = function(sig) {
    this.sig = sig;
    switch(sig.kind) {
        case 'multiple':
            this.children = [];
            break;
        case 'optional':
            this.child = new SignatureEnumerator(sig.signature);
            this.include = false;
            break;
        case 'sequence':
            this.children = sig.signatures.map(function(s){ return new SignatureEnumerator(s)});
            break;
        case 'or':
            this.children = sig.signatures.map(function(s){ return new SignatureEnumerator(s)});
            this.pos = 0;
            break;
        case 'type':
        case 'anything':
        default:
            break;
    }
}
SignatureEnumerator.prototype = {
    /** Does this signature only have one possible realisation?
     *
     * @returns {boolean}
     */
    is_static: function() {
        switch(this.sig.kind) {
            case 'type':
            case 'anything':
                return true;
            case 'sequence':
                return this.children.every(function(c){ return c.is_static(); });
            default:
                return false;
        }
    },

    /** The length of the signature corresponding to the current state of the enumerator.
     *
     * @returns {number}
     */
    length: function() {
        switch(this.sig.kind) {
            case 'optional':
                return this.include ? this.child.length() : 0;
            case 'sequence':
            case 'multiple':
                return this.children.map(function(c){return c.length()}).reduce(function(t,c){return t+c},0);
            case 'or':
                return this.children[this.pos].length();
            case 'type':
                return 1;
            case 'anything':
                return 1;
            case 'list':
                return 1;
            case 'dict':
                return 1;
        }
    },
    /** Get the signature corresponding to the current state of the enumerator.
     *
     * @returns {Array.<string>}
     */
    signature: function() {
        switch(this.sig.kind) {
            case 'optional':
                return this.include ? this.child.signature() : [];
            case 'sequence':
            case 'multiple':
                return this.children.map(function(c){return c.signature()}).reduce(function(args,c){return args.concat(c)},[]);
            case 'or':
                return this.children[this.pos].signature();
            case 'type':
                return [this.sig.type];
            case 'anything':
                return ['?'];
            case 'list':
                return ['list'];
            case 'dict':
                return ['dict'];
            default:
                return ['?'];
        }
    },
    /** Advance to the next state, if possible.
     *
     * @returns {boolean} True if the enumerator could advance.
     */
    next: function() {
        switch(this.sig.kind) {
            case 'optional':
                return false;
            case 'or':
                if(!this.children[this.pos].next()) {
                    this.pos += 1;
                    return this.pos<this.children.length;
                }
                return true;
            case 'sequence':
            case 'multiple':
                for(var i=this.children.length-1;i>=0;i--) {
                    if(this.children[i].next()) {
                        return true;
                    }
                    this.children[i].backtrack();
                }
                if(this.sig.kind=='multiple') {
                    this.children.forEach(function(c) { c.backtrack(); });
                    this.children.push(new SignatureEnumerator(this.sig.signature));
                    return true;
                }
                return false;
            case 'type':
            case 'anything':
            default:
                return false;
        }
    },
    /** Reset the enumerator to its initial state.
     */
    backtrack: function() {
        switch(this.sig.kind) {
            case 'optional':
                this.child.backtrack();
                break;
            case 'or':
                this.children.forEach(function(c){ c.backtrack(); });
                this.pos = 0;
                break;
            case 'sequence':
                this.children.forEach(function(c){ c.backtrack(); });
                break;
            case 'multiple':
                this.children = [];
                break;
            default:
                break;
        }
    }
}

/** Infer the type of an expression by inferring the types of free variables, then finding definitions of operators and functions which work.
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.Scope} scope
 * @returns {string}
 */
jme.inferExpressionType = function(tree,scope) {
    var assignments = jme.inferVariableTypes(tree,scope);

    /** Construct a stub of a token of the given type, for the type-checker to work against.
     *
     * @param {string} type
     * @returns {Numbas.jme.token}
     */
    function fake_token(type) {
        var tok = {type: type};
        if(jme.types[type]) {
            tok.__proto__ = jme.types[type].prototype;
        }
        return tok;
    }
    for(var x in assignments) {
        assignments[x] = fake_token(assignments[x]);
    }
    /** Infer the type of a tree.
     *
     * @param {Numbas.jme.tree} tree
     * @returns {string}
     */
    function infer_type(tree) {
        var tok = tree.tok;
        switch(tok.type) {
            case 'name':
                return (assignments[tok.name] || tok).type;
            case 'op':
            case 'function':
                var op = tok.name.toLowerCase();
                if(lazyOps.indexOf(op)>=0) {
                    return scope.getFunction(op)[0].outtype;
                }
                else {
                    var eargs = [];
                    for(var i=0;i<tree.args.length;i++) {
                        eargs.push(fake_token(infer_type(tree.args[i])));
                    }
                    var matchedFunction = scope.matchFunctionToArguments(tok,eargs);
                    if(matchedFunction) {
                        return matchedFunction.fn.outtype;
                    } else {
                        return '?';
                    }
                }
            default:
                return tok.type;
        }
    }

    return infer_type(tree);
}

/** Remove "missing" arguments from a signature-checker result.
 *
 * @param {Numbas.jme.signature_result} items
 * @returns {Numbas.jme.signature_result}
 */
function sig_remove_missing(items) {
    return items.filter(function(d){return !d.missing});
}

/** A signature-checker function. Takes a list of {@link Numbas.jme.token} objects, and returns a {@link Numbas.jme.signature_result} representing the matched arguments, or `false` if the signature doesn't match.
 *
 * @typedef Numbas.jme.signature
 * @type {Function}
 * @property {string} kind - The kind of this signature checker, e.g. "type", "anything", "multiple". Used by the type inference routine, among other things.
 */

/** A list of arguments matched by a signature checker. At most one per argument passed in.
 *
 * @typedef Numbas.jme.signature_result
 * @type {Array.<Numbas.jme.signature_result_argument>}
 */

/** Information about an argument matched by a signature checker.
 * The main purpose is to specify the desired type of the argument, but there are other properties for certain types.
 *
 * @typedef Numbas.jme.signature_result_argument
 * @type {object}
 * @property {string} type - The data type that the argument should be cast to.
 * @property {boolean} missing - Does this represent an optional argument that wasn't given?
 * @property {boolean} nonspecific - Does this represent an argument matched with an 'anything' signature? If so, don't use it when comparing two signature results.
 */

/** Signature-checking function constructors.
 *
 * @see {Numbas.jme.signature}
 * @enum {Function}
 */
jme.signature = {
    anything: function() {
        var f = function(args) {
            return args.length>0 ? [{type: args[0].type, nonspecific: true}] : false;
        }
        f.kind = 'anything';
        return f;
    },
    type: function(type) {
        var f = function(args) {
            if(args.length==0) {
                return false;
            }
            if(args[0].type!=type) {
                var casts = args[0].casts;
                if(!casts || !casts[type]) {
                    return false;
                }
            }
            return [{type: type}];
        }
        f.kind = 'type';
        f.type = type;
        return f;
    },
    multiple: function(sig) {
        var f = function(args) {
            var got = [];
            while(true) {
                var match = sig(args);
                if(match===false) {
                    break;
                }
                args = args.slice(match.length);
                got = got.concat(match);
                if(match.length==0) {
                    break;
                }
            }
            return got;
        };
        f.kind = 'multiple';
        f.signature = sig;
        return f;
    },
    optional: function(sig) {
        var f = function(args) {
            var match = sig(args);
            if(match) {
                return match;
            } else {
                return [{missing: true}];
            }
        }
        f.kind = 'optional';
        f.signature = sig;
        return f;
    },
    sequence: function() {
        var bits = Array.prototype.slice.apply(arguments);
        var f = function(args) {
            var match  = [];
            for(var i=0;i<bits.length;i++) {
                var bitmatch = bits[i](args);
                if(bitmatch===false) {
                    return false;
                }
                match = match.concat(bitmatch);
                args = args.slice(sig_remove_missing(bitmatch).length);
            }
            return match;
        }
        f.kind = 'sequence';
        f.signatures = bits;
        return f;
    },
    list: function() {
        var bits = Array.prototype.slice.apply(arguments);
        var seq = jme.signature.sequence.apply(this,bits);
        var f = function(args) {
            if(args.length==0) {
                return false;
            }
            if(!jme.isType(args[0],'list')) {
                return false;
            }
            var arg = jme.castToType(args[0],'list');
            var items = seq(arg.value);
            if(items===false || items.length!=arg.value.length) {
                return false;
            }
            return [{type: 'list', items: items}];
        }
        f.kind = 'list';
        f.signatures = bits;
        return f;
    },
    listof: function(sig) {
        return jme.signature.list(jme.signature.multiple(sig));
    },
    dict: function(sig) {
        var f = function(args) {
            if(args.length==0) {
                return false;
            }
            if(!jme.isType(args[0],'dict')) {
                return false;
            }
            var items = {};
            var entries = Object.entries(args[0].value);
            for(var i=0;i<entries.length;i++) {
                var key = entries[i][0];
                var value = entries[i][1];
                var m = sig([value]);
                if(m===false) {
                    return false;
                }
                items[key] = m[0];
            }
            return [{type: 'dict', items: items}];
        }
        f.kind = 'dict';
        f.signature = sig;
        return f;
    },
    or: function() {
        var bits = Array.prototype.slice.apply(arguments);
        var f = function(args) {
            for(var i=0;i<bits.length;i++) {
                var m = bits[i](args);
                if(m!==false) {
                    return m;
                }
            }
            return false;
        }
        f.kind = 'or';
        f.signatures = bits;
        return f;
    }
};
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
Numbas.queueScript('jme-builtins',['jme-base','jme-rules','jme-calculus'],function(){
var util = Numbas.util;
var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;
var setmath = Numbas.setmath;
var jme = Numbas.jme;

var Scope = jme.Scope;
var funcObj = jme.funcObj;

var types = Numbas.jme.types;
var TNum = types.TNum;
var TInt = types.TInt;
var TRational = types.TRational;
var TDecimal = types.TDecimal;
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
var TOp = types.TOp;
var TFunc = types.TFunc;

var sig = jme.signature;

/** The built-in JME evaluation scope.
 *
 * @type {Numbas.jme.Scope}
 * @memberof Numbas.jme
 */
var builtinScope = jme.builtinScope = new Scope({rulesets:jme.rules.simplificationRules});
builtinScope.setVariable('nothing',new types.TNothing);
var funcs = {};

/** Add a function to the built-in scope.
 *
 * @see Numbas.jme.builtinScope
 * @param {string} name
 * @param {Array.<Function|string>} intype - A list of data type constructors for the function's paramters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type. If `null`, then `options.typecheck` is used.
 * @param {Function} outcons - The constructor for the output value of the function
 * @param {Numbas.jme.evaluate_fn} fn - JavaScript code which evaluates the function.
 * @param {Numbas.jme.funcObj_options} options
 * @returns {Numbas.jme.funcObj}
 */
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
newBuiltin('is_zero',[TVector],TBool, vectormath.is_zero);
newBuiltin('id',[TNum],TMatrix, matrixmath.id);
newBuiltin('sum_cells',[TMatrix],TNum,matrixmath.sum_cells);
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
        } else if(args.length==1) {
            var list = scope.evaluate(args[0]);
            var items = list.value;
            if(list.type!='list' || !items.every(function(item) {return item.type=='list' && item.value.length==2 && item.value[0].type=='string';})) {
                throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'dict'}));
            }
            items.forEach(function(item) {
                value[item.value[0].value] = item.value[1];
            });
        } else {
            throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'dict'}));
        }
        return new TDict(value);
    }
});
Numbas.jme.lazyOps.push('dict');
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
newBuiltin('values',[TDict,sig.listof(sig.type('string'))],TList,function(d,keys) {
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
newBuiltin('formatstring',[TString,TList],TString,function(str,extra) {
    return util.formatString.apply(util,[str].concat(extra.map(jme.tokenToDisplayString)));
});
newBuiltin('unpercent',[TString],TNum,util.unPercent);
newBuiltin('letterordinal',[TNum],TString,util.letterOrdinal);
newBuiltin('html',[TString],THTML,function(html) { return $(html) });
newBuiltin('isnonemptyhtml',[TString],TBool,function(html) {
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
        var s = args[0];
        while(jme.isFunction(s.tok,'safe')) {
            s = s.args[0];
        }
        var t = new TString(s.tok.value);
        t.safe = true;
        return t;
    }
});
Numbas.jme.lazyOps.push('safe');
jme.findvarsOps.safe = function(tree,boundvars,scope) {
    return [];
}
newBuiltin('render',[TString,sig.optional(sig.type('dict'))],TString, null, {
    evaluate: function(args,scope) {
        var str = args[0].value;
        var variables = args.length>1 ? args[1].value : {};
        scope = new Scope([scope,{variables: variables}]);
        return new TString(jme.contentsubvars(str,scope,true));
    }
});
jme.findvarsOps.render = function(tree,boundvars,scope) {
    var vars = [];
    if(tree.args[0].tok.type!='string') {
        vars = jme.findvars(tree.args[0]);
    }
    if(tree.args.length>1) {
        vars = vars.merge(jme.findvars(tree.args[1],boundvars,scope));
    }
    return vars;
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
    var re = new RegExp(pattern,'u');
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});
newBuiltin('match_regex',[TString,TString,TString],TList,function(pattern,str,flags) {
    var re = new RegExp(pattern,flags);
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});

newBuiltin('split_regex',[TString,TString],TList, function(str,delimiter) {
    return str.split(new RegExp(delimiter,'u')).map(function(s){return new TString(s)});
});
newBuiltin('split_regex',[TString,TString,TString],TList, function(str,delimiter,flags) {
    return str.split(new RegExp(delimiter,flags)).map(function(s){return new TString(s)});
});
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
newBuiltin('isclose', [TNum,TNum,sig.optional(sig.type('number')),sig.optional(sig.type('number'))], TBool, math.isclose);
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
newBuiltin('tonearest',[TNum,TNum], TNum, math.toNearest);
newBuiltin('trunc', [TNum], TNum, math.trunc );
newBuiltin('fract', [TNum], TNum, math.fract );
newBuiltin('degrees', [TNum], TNum, math.degrees );
newBuiltin('radians', [TNum], TNum, math.radians );
newBuiltin('sign', [TNum], TNum, math.sign );
newBuiltin('rational_approximation',[TNum],TList,function(n) {
    return math.rationalApproximation(n).map(function(x) { return new TInt(x); });
});
newBuiltin('rational_approximation',[TNum,TNum],TList,function(n,accuracy) {
    return math.rationalApproximation(n,accuracy).map(function(x) { return new TInt(x); });
});
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
newBuiltin( 'random',['*?'],'?', null, {
    random:true,
    evaluate: function(args,scope) { return math.choose(args);}
});
newBuiltin('mod', [TNum,TNum], TNum, math.mod );
newBuiltin('max', [TNum,TNum], TNum, math.max );
newBuiltin('min', [TNum,TNum], TNum, math.min );
newBuiltin('clamp',[TNum,TNum,TNum], TNum, function(x,min,max) { return math.max(math.min(x,max),min); });
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
newBuiltin('parsenumber', [TString,TString], TNum, function(s,style) {return util.parseNumber(s,false,style,true);});
newBuiltin('parsenumber', [TString,sig.listof(sig.type('string'))], TNum, function(s,styles) {return util.parseNumber(s,false,styles,true);}, {unwrapValues: true});
newBuiltin('parsenumber_or_fraction', [TString], TNum, function(s) {return util.parseNumber(s,true,"plain-en",true);});
newBuiltin('parsenumber_or_fraction', [TString,TString], TNum, function(s,style) {return util.parseNumber(s,true,style,true);});
newBuiltin('parsenumber_or_fraction', [TString,sig.listof(sig.type('string'))], TNum, function(s,styles) {return util.parseNumber(s,true,styles,true);}, {unwrapValues: true});

newBuiltin('parsedecimal', [TString,TString], TDecimal, function(s,style) {return util.parseDecimal(s,false,style,true);});
newBuiltin('parsedecimal', [TString,sig.listof(sig.type('string'))], TDecimal, function(s,styles) {return util.parseDecimal(s,false,styles,true);}, {unwrapValues: true});
newBuiltin('parsedecimal_or_fraction', [TString], TDecimal, function(s,style) {return util.parseDecimal(s,true,"plain-en",true);});
newBuiltin('parsedecimal_or_fraction', [TString,TString], TDecimal, function(s,style) {return util.parseDecimal(s,true,style,true);});
newBuiltin('parsedecimal_or_fraction', [TString,sig.listof(sig.type('string'))], TDecimal, function(s,styles) {return util.parseDecimal(s,true,styles,true);}, {unwrapValues: true});

newBuiltin('scientificnumberlatex', [TDecimal], TString, null, {
    evaluate: function(args,scope) {
        var n = args[0].value;
        var bits = math.parseScientific(n.re.toExponential());
        var s = new TString(math.niceDecimal(bits.significand)+' \\times 10^{'+bits.exponent+'}');
        s.latex = true;
        return s;
    }
});
newBuiltin('scientificnumberhtml', [TDecimal], THTML, function(n) {
    var bits = math.parseScientific(n.re.toExponential());
    var s = document.createElement('span');
    s.innerHTML = math.niceDecimal(bits.significand)+' × 10<sup>'+bits.exponent+'</sup>';
    return s;
});

newBuiltin('togivenprecision', [TString,TString,TNum,TBool], TBool, math.toGivenPrecision);
newBuiltin('withintolerance',[TNum,TNum,TNum],TBool, math.withinTolerance);
newBuiltin('countdp',[TString],TNum, function(s) { return math.countDP(util.cleanNumber(s)); });
newBuiltin('countsigfigs',[TString],TNum, function(s) { return math.countSigFigs(util.cleanNumber(s)); });
newBuiltin('isnan',[TNum],TBool,function(n) {
    return isNaN(n);
});
newBuiltin('matchnumber',[TString,sig.listof(sig.type('string'))],TList,function(s,styles) {
    var result = util.matchNotationStyle(s,styles,true);
    return [new TString(result.matched), new TNum(util.parseNumber(result.cleaned,false,['plain'],true))];
},{unwrapValues:true});
newBuiltin('cleannumber',[TString,sig.optional(sig.listof(sig.type('string')))],TString,util.cleanNumber,{unwrapValues:true});
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
newBuiltin('coprime',[TNum,TNum], TBool, math.coprime);
newBuiltin('lcm', [sig.multiple(sig.type('number'))], TNum, math.lcm );
newBuiltin('lcm', [sig.listof(sig.type('number'))], TNum, function(l){
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


var Fraction = math.Fraction;

// Integer arithmetic
newBuiltin('int',[TNum],TInt, function(n){ return n; });
newBuiltin('+u', [TInt], TInt, function(a){return a;});
newBuiltin('-u', [TInt], TInt, math.negate);
newBuiltin('+', [TInt,TInt], TInt, math.add);
newBuiltin('-', [TInt,TInt], TInt, math.sub);
newBuiltin('*', [TInt,TInt], TInt, math.mul );
newBuiltin('/', [TInt,TInt], TRational, function(a,b) { return new Fraction(a,b); });
newBuiltin('^', [TInt,TInt], TNum, function(a,b) { return math.pow(a,b); });
newBuiltin('mod', [TInt,TInt], TInt, math.mod );
newBuiltin('string',[TInt], TString, function(a) { return a+''; });

// Rational arithmetic
newBuiltin('+u', [TRational], TRational, function(a){return a;});
newBuiltin('-u', [TRational], TRational, function(r){ return r.negate(); });
newBuiltin('+', [TRational,TRational], TRational, function(a,b){ return a.add(b); });
newBuiltin('-', [TRational,TRational], TRational, function(a,b){ return a.subtract(b); });
newBuiltin('*', [TRational,TRational], TRational, function(a,b){ return a.multiply(b); });
newBuiltin('/', [TRational,TRational], TRational, function(a,b){ return a.divide(b); });
newBuiltin('string',[TRational], TString, function(a) { return a.toString(); });

//Decimal arithmetic
newBuiltin('string',[TDecimal], TString, function(a) { return a.toString(); });
newBuiltin('decimal',[TNum],TDecimal,math.numberToDecimal);
newBuiltin('decimal',[TString],TDecimal,function(x){return new Decimal(x)});
newBuiltin('+u', [TDecimal], TDecimal, function(a){return a;});
newBuiltin('-u', [TDecimal], TDecimal, function(a){ return a.negated(); });
newBuiltin('+', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.plus(b); });
newBuiltin('+', [TNum,TDecimal], TDecimal, function(a,b){ return (new math.ComplexDecimal(new Decimal(a))).plus(b); });
newBuiltin('-', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.minus(b); });
newBuiltin('-', [TNum,TDecimal], TDecimal, function(a,b){ return (new math.ComplexDecimal(new Decimal(a))).minus(b); });
newBuiltin('*', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.times(b); });
newBuiltin('/', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.dividedBy(b); });
newBuiltin('/', [TNum,TDecimal], TDecimal, function(a,b){ return (new math.ComplexDecimal(new Decimal(a))).dividedBy(b); });
newBuiltin('abs', [TDecimal], TDecimal, function(a){ return a.absoluteValue(); });
newBuiltin('ceil', [TDecimal], TDecimal, function(a){ return a.re.ceil(); });
newBuiltin('cos', [TDecimal], TDecimal, function(a){ return a.re.cos(); });
newBuiltin('countdp', [TDecimal], TInt, function(a){ return a.decimalPlaces(); });
newBuiltin('floor', [TDecimal], TDecimal, function(a){ return a.re.floor(); });
newBuiltin('>', [TDecimal,TDecimal], TBool, function(a,b){ return a.greaterThan(b); });
newBuiltin('>=', [TDecimal,TDecimal], TBool, function(a,b){ return a.greaterThanOrEqualTo(b); });
newBuiltin('>=', [TDecimal,TNum], TBool, function(a,b){ return math.geq(a.re.toNumber(),b); });
newBuiltin('cosh', [TDecimal], TDecimal, function(a){ return a.re.cosh(); });
newBuiltin('sinh', [TDecimal], TDecimal, function(a){ return a.re.sinh(); });
newBuiltin('tanh', [TDecimal], TDecimal, function(a){ return a.re.tanh(); });
newBuiltin('arccos', [TDecimal], TDecimal, function(a){ return a.re.acos(); });
newBuiltin('arccosh', [TDecimal], TDecimal, function(a){ return a.re.acosh(); });
newBuiltin('arcsinh', [TDecimal], TDecimal, function(a){ return a.re.asinh(); });
newBuiltin('arctanh', [TDecimal], TDecimal, function(a){ return a.re.atanh(); });
newBuiltin('arcsin', [TDecimal], TDecimal, function(a){ return a.re.asin(); });
newBuiltin('arctan', [TDecimal], TDecimal, function(a){ return a.re.atan(); });
newBuiltin('isint',[TDecimal], TBool, function(a) {return a.isInt(); })
newBuiltin('isnan',[TDecimal], TBool, function(a) {return a.isNaN(); })
newBuiltin('iszero',[TDecimal], TBool, function(a) {return a.isZero(); })
newBuiltin('<', [TDecimal,TDecimal], TBool, function(a,b){ return a.lessThan(b); });
newBuiltin('<=', [TDecimal,TDecimal], TBool, function(a,b){ return a.lessThanOrEqualTo(b); });
newBuiltin('<=', [TDecimal,TNum], TBool, function(a,b){ return math.leq(a.re.toNumber(),b); });
newBuiltin('log',[TDecimal], TDecimal, function(a) {return a.re.log(); })
newBuiltin('log',[TDecimal,TDecimal], TDecimal, function(a,b) {return a.re.log()/b.re.log(); })
newBuiltin('mod', [TDecimal,TDecimal], TDecimal, function(a,b) {
    var m = a.re.mod(b.re);
    if(m.isNegative()) {
        m = m.plus(b.re);
    }
    return m;
});
newBuiltin('exp',[TDecimal], TDecimal, function(a) {return a.re.exp(); });
newBuiltin('ln',[TDecimal], TDecimal, function(a) {return a.re.ln(); });
newBuiltin('countsigfigs',[TDecimal], TInt, function(a) {return a.re.countSigFigs(); });
newBuiltin('round',[TDecimal], TDecimal, function(a) {return a.round(); });
newBuiltin('sin',[TDecimal], TDecimal, function(a) {return a.re.sin(); });
newBuiltin('sqrt',[TDecimal], TDecimal, function(a) {return a.squareRoot(); });
newBuiltin('tan',[TDecimal], TDecimal, function(a) {return a.re.tan(); });
newBuiltin('precround',[TDecimal,TNum], TDecimal, function(a,dp) {return a.toDecimalPlaces(dp); });
newBuiltin('min', [TDecimal,TDecimal], TDecimal, math.ComplexDecimal.min );
newBuiltin('max', [TDecimal,TDecimal], TDecimal, math.ComplexDecimal.max );
newBuiltin('dpformat',[TDecimal,TNum], TString, function(a,dp) {return a.toFixed(dp); });
newBuiltin('tonearest',[TDecimal,TDecimal], TDecimal, function(a,x) {return a.toNearest(x.re); });
newBuiltin('^',[TDecimal,TDecimal], TDecimal, function(a,b) {return a.pow(b); });
newBuiltin('sigformat',[TDecimal,TNum], TString, function(a,sf) {return a.toPrecision(sf); });
newBuiltin('siground',[TDecimal,TNum], TDecimal, function(a,sf) {return a.toSignificantDigits(sf); });
newBuiltin('trunc',[TDecimal], TDecimal, function(a) {return a.re.trunc(); });
newBuiltin('fract',[TDecimal], TDecimal, function(a) {return a.re.minus(a.re.trunc()); });



newBuiltin('sum',[sig.listof(sig.type('number'))],TNum,math.sum,{unwrapValues: true});
newBuiltin('sum',[TVector],TNum,math.sum);
newBuiltin('prod',[sig.listof(sig.type('number'))],TNum,math.prod,{unwrapValues: true});
newBuiltin('prod',[TVector],TNum,math.prod);
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
Numbas.jme.lazyOps.push('if');
newBuiltin('switch',[sig.multiple(sig.sequence(sig.type('boolean'),sig.anything())),'?'],'?', null, {
    evaluate: function(args,scope) {
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
Numbas.jme.lazyOps.push('switch');
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
            match = jme.isType(args[0].tok, kind);
        }
        return new TBool(match);
    }
});
Numbas.jme.lazyOps.push('isa');
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
Numbas.jme.lazyOps.push('repeat');

/** Evaluate the given expressions until the list of conditions is satisfied.
 *
 * @param {Array.<string>} names - Names for each expression.
 * @param {Array.<Numbas.jme.tree>} definitions - Definition of each expression.
 * @param {Array.<Numbas.jme.tree>} conditions - Expressions in terms of the assigned names, which should evaluate to `true` if the values are acceptable.
 * @param {Numbas.jme.Scope} scope - The scope in which to evaluate everything.
 * @param {number} [maxRuns=100] - The maximum number of times to try to generate a set of values.
 * @returns {object.<Numbas.jme.token>} - A dictionary mapping names to their generated values.
 */
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
                variables[names[i]] = scope.evaluate(definitions[i]);
            }
            var nscope = new jme.Scope([scope,{variables:variables}]);
            satisfied = true;
            for(var i=0; i<conditions.length; i++) {
                var ok = nscope.evaluate(conditions[i]);
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
        var maxRuns = args.length>3 ? scope.evaluate(args[3]).value : 100;
        var variables = satisfy(names,definitions,conditions,scope,maxRuns);
        return new TList(names.map(function(name){ return variables[name]; }));
    }
});
Numbas.jme.lazyOps.push('satisfy');
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
        var end = util.wrapListIndex(range[1],size);
        var step = range[2];
        var value;
        if(step!=1) {
            value = [];
            for(var i=start;i<end;i += step) {
                if(i%1==0) {
                    value.push(list.value[i]);
                }
            }
        } else {
            value = list.value.slice(start,end);
        }
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
Numbas.jme.lazyOps.push('isset');
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
/** Map the given expression, considered as a lambda, over the given list.
 *
 * @param {Numbas.jme.tree} lambda
 * @param {string|Array.<string>} names - Either the name to assign to the elements of the lists, or a list of names if each element is itself a list.
 * @param {Numbas.jme.types.TList} list - The list to map over.
 * @param {Numbas.jme.Scope} scope - The scope in which to evaluate.
 * @returns {Numbas.jme.types.TList}
 */
function mapOverList(lambda,names,list,scope) {
    var olist = list.map(function(v) {
        if(typeof(names)=='string') {
            scope.setVariable(names,v);
        } else {
            names.forEach(function(name,i) {
                scope.setVariable(name,v.value[i]);
            });
        }
        return scope.evaluate(lambda);
    });
    return new TList(olist);
}
/** Functions for 'map', by the type of the thing being mapped over.
 * Functions take a JME expression lambda, a name or list of names to map, a value to map over, and a scope to evaluate against.
 *
 * @memberof Numbas.jme
 * @name mapFunctions
 * @enum {Function}
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
            scope.setVariable(name,new TNum(n));
            var o = scope.evaluate(lambda);
            if(!jme.isType(o,'number')) {
                throw(new Numbas.Error("jme.map.matrix map returned non number"))
            }
            return jme.castToType(o,'number').value;
        }));
    },
    'vector': function(lambda,name,vector,scope) {
        return new TVector(vectormath.map(vector,function(n) {
            scope.setVariable(name,new TNum(n));
            var o = scope.evaluate(lambda);
            if(!jme.isType(o,'number')) {
                throw(new Numbas.Error("jme.map.vector map returned non number"))
            }
            return jme.castToType(o,'number').value;
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
Numbas.jme.lazyOps.push('map');
jme.findvarsOps.map = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        mapped_boundvars.push(tree.args[1].tok.name.toLowerCase());
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars,scope));
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
        list = jme.castToType(list,'list').value;
        scope = new Scope(scope);
        var name = args[1].tok.name;
        var value = list.filter(function(v) {
            scope.setVariable(name,v);
            return jme.evaluate(lambda,scope).value;
        });
        return new TList(value);
    }
});
Numbas.jme.lazyOps.push('filter');
jme.findvarsOps.filter = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        mapped_boundvars.push(tree.args[1].tok.name.toLowerCase());
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.filter = function(tree,scope,allowUnbound) {
    tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
    return tree;
}


newBuiltin('take',[TNum,'?',TName,'?'],TList,null, {
    evaluate: function(args,scope) {
        var n = scope.evaluate(args[0]).value;
        var lambda = args[1];
        var list = scope.evaluate(args[3]);
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
        var name = args[2].tok.name;
        var value = [];
        for(var i=0;i<list.length && value.length<n;i++) {
            var v = list[i];
            scope.setVariable(name,v);
            var ok = scope.evaluate(lambda).value;
            if(ok) {
                value.push(v);
            }
        };
        return new TList(value);
    }
});
Numbas.jme.lazyOps.push('take');
jme.findvarsOps.take = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[2].tok.type=='list') {
        var names = tree.args[2].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        mapped_boundvars.push(tree.args[2].tok.name.toLowerCase());
    }
    var vars = jme.findvars(tree.args[1],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[0],boundvars,scope));
    vars = vars.merge(jme.findvars(tree.args[3],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.take = function(tree,scope,allowUnbound) {
    var args = tree.args.slice();
    args[0] = jme.substituteTree(args[0],scope,allowUnbound);
    args[3] = jme.substituteTree(args[3],scope,allowUnbound);
    return {tok:tree.tok, args: args};
}

newBuiltin('enumerate',[TList],TList,function(list) {
    return list.map(function(v,i) {
        return new TList([new TInt(i),v]);
    });
});


/** Is the given token the value `true`?
 *
 * @param {Numbas.jme.token} item
 * @returns {boolean}
 */
function tok_is_true(item){return item.type=='boolean' && item.value}
newBuiltin('all',[sig.listof(sig.type('boolean'))],TBool,function(list) {
    return list.every(tok_is_true);
});
newBuiltin('some',[sig.listof(sig.type('boolean'))],TBool,function(list) {
    return list.some(tok_is_true);
});

var let_sig_names = sig.multiple(
                    sig.or(
                        sig.sequence(sig.type('name'),sig.anything()),
                        sig.sequence(sig.listof(sig.type('name')),sig.anything())
                    )
                );
newBuiltin('let',[sig.or(sig.type('dict'), let_sig_names),'?'],TList, null, {
    evaluate: function(args,scope) {
        var signature = sig.or(sig.type('dict'), let_sig_names)(args.map(function(a){
            if(a.tok.type=='list' && a.args) {
                return new TList(a.args.map(function(aa){return aa.tok;}));
            } else {
                return a.tok
            }
        }));
        if(!signature) {
            throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'let'}));
        }
        if(signature[0].type=="dict") {
            var d = scope.evaluate(args[0]);
            var variables = d.value;
            var lambda = args[1];
            var nscope = new Scope([scope,{variables:variables}]);
            return nscope.evaluate(lambda);
        } else {
            var lambda = args[args.length-1];
            var variables = {};
            var nscope = new Scope([scope]);
            for(var i=0;i<args.length-1;i+=2) {
                var value = nscope.evaluate(args[i+1]);
                if(args[i].tok.type=='name') {
                    var name = args[i].tok.name;
                    nscope.setVariable(name,value);
                } else if(args[i].tok.type=='list') {
                    var names = args[i].args.map(function(t){return t.tok.name});
                    var values = jme.castToType(value,'list').value;
                    for(var j=0;j<names.length;j++) {
                        nscope.setVariable(names[j],values[j]);
                    }
                }
            }
            return nscope.evaluate(lambda);
        }
    }
});
Numbas.jme.lazyOps.push('let');
jme.findvarsOps.let = function(tree,boundvars,scope) {
    var vars = [];
    boundvars = boundvars.slice();
    for(var i=0;i<tree.args.length-1;i+=2) {
        switch(tree.args[i].tok.type) {
            case 'name':
                boundvars.push(tree.args[i].tok.name.toLowerCase());
                break;
            case 'list':
                boundvars = boundvars.concat(tree.args[i].args.map(function(t){return t.tok.name}));
                break;
            case 'dict':
                tree.args[i].args.forEach(function(kp) {
                    boundvars.push(kp.tok.key);
                    vars = vars.merge(jme.findvars(kp.args[0],boundvars,scope));
                });
                break;
        }
        vars = vars.merge(jme.findvars(tree.args[i+1],boundvars,scope));
    }
    // find variables used in the lambda expression, excluding the ones assigned by let
    vars = vars.merge(jme.findvars(tree.args[tree.args.length-1],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.let = function(tree,scope,allowUnbound) {
    var nscope = new Scope([scope]);
    if(tree.args[0].tok.type=='dict') {
        var d = tree.args[0];
        var names = d.args.map(function(da) { return da.tok.key; });
        for(var i=0;i<names.length;i++) {
            nscope.deleteVariable(names[i]);
        }
        d.args = d.args.map(function(da) { return jme.substituteTree(da,nscope,allowUnbound) });
    } else {
        for(var i=1;i<tree.args.length-1;i+=2) {
            switch(tree.args[i-1].tok.type) {
                case 'name':
                    var name = tree.args[i-1].tok.name;
                    nscope.deleteVariable(name);
                    break;
                case 'list':
                    var names = tree.args[i-1].args;
                    for(var j=0;j<names.length;j++) {
                        nscope.deleteVariable(names[j].tok.name);
                    }
                    break;
            }
            tree.args[i] = jme.substituteTree(tree.args[i],nscope,allowUnbound);
        }
    }
}

newBuiltin('unset',[TDict,'?'],'?',null,{
    evaluate: function(args,scope) {
        var defs = jme.unwrapValue(scope.evaluate(args[0]));
        var nscope = scope.unset(defs);
        return nscope.evaluate(args[1]);
    }
});
Numbas.jme.lazyOps.push('unset');

newBuiltin('sort',[TList],TList, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var newlist = new TList(list.vars);
        newlist.value = list.value.slice().sort(jme.compareTokens);
        return newlist;
    }
});
newBuiltin('sort_by',[TNum,sig.listof(sig.type('list'))],TList, null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        newlist.value = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        return newlist;
    }
});

newBuiltin('sort_by',[TString,sig.listof(sig.type('dict'))],TList, null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        newlist.value = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        return newlist;
    }
});

newBuiltin('sort_destinations',[TList],TList,null, {
    evaluate: function(args,scope) {
        var list = args[0];
        var newlist = new TList(list.vars);
        var sorted = list.value.map(function(v,i){ return {tok:v,i:i} }).sort(function(a,b){
            return jme.compareTokens(a.tok,b.tok);
        });
        var inverse = [];
        for(var i=0;i<sorted.length;i++) {
            inverse[sorted[i].i] = i;
        }
        newlist.value = inverse.map(function(n) {
            return new TNum(n);
        });
        return newlist;
    }
});

newBuiltin('group_by',[TNum,sig.listof(sig.type('list'))],TList,null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        var sorted = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        var out = [];
        for(var i=0;i<sorted.length;) {
            var key = sorted[i].value[index];
            var values = [sorted[i]];
            for(i++;i<sorted.length;i++) {
                if(jme.compareTokens(key,sorted[i].value[index])==0) {
                    values.push(sorted[i]);
                } else {
                    break;
                }
            }
            out.push(new TList([key,new TList(values)]));
        }
        return new TList(out);
    }
});

newBuiltin('group_by',[TString,sig.listof(sig.type('dict'))],TList,null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        var sorted = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        var out = [];
        for(var i=0;i<sorted.length;) {
            var key = sorted[i].value[index];
            var values = [sorted[i]];
            for(i++;i<sorted.length;i++) {
                if(jme.compareTokens(key,sorted[i].value[index])==0) {
                    values.push(sorted[i]);
                } else {
                    break;
                }
            }
            out.push(new TList([key,new TList(values)]));
        }
        return new TList(out);
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
newBuiltin('set',[TRange],TSet,null, {
    evaluate: function(args,scope) {
        var l = jme.castToType(args[0],'list');
        return new TSet(util.distinct(l.value));
    }
});
newBuiltin('set', ['*?'], TSet, null, {
    evaluate: function(args,scope) {
        return new TSet(util.distinct(args));
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
newBuiltin('product',[sig.multiple(sig.type('list'))],TList,function() {
    var lists = Array.prototype.slice.call(arguments);
    var prod = util.product(lists);
    return prod.map(function(l){ return new TList(l); });
});

newBuiltin('product',[TList,TNum],TList,function(l,n) {
    return util.cartesian_power(l,n).map(function(sl){ return new TList(sl); });
});

newBuiltin('zip',[sig.multiple(sig.type('list'))],TList,function() {
    var lists = Array.prototype.slice.call(arguments);
    var zipped = util.zip(lists);
    return zipped.map(function(l){ return new TList(l); });
});
newBuiltin('combinations',[TList,TNum],TList,function(list,r) {
    var prod = util.combinations(list,r);
    return prod.map(function(l){ return new TList(l); });
});
newBuiltin('combinations_with_replacement',[TList,TNum],TList,function(list,r) {
    var prod = util.combinations_with_replacement(list,r);
    return prod.map(function(l){ return new TList(l); });
});
newBuiltin('permutations',[TList,TNum],TList,function(list,r) {
    var prod = util.permutations(list,r);
    return prod.map(function(l){ return new TList(l); });
});
newBuiltin('vector',[sig.multiple(sig.type('number'))],TVector, null, {
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
newBuiltin('vector',[sig.listof(sig.type('number'))],TVector, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var value = list.value.map(function(x){return x.value});
        return new TVector(value);
    }
});
newBuiltin('matrix',[sig.listof(sig.type('vector'))],TMatrix,null, {
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
            value = list.value.map(function(v){return v.value});
            columns = list.value[0].value.length;
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('matrix',[sig.listof(sig.listof(sig.type('number')))],TMatrix,null, {
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
            for(var i=0;i<rows;i++) {
                var row = list.value[i].value;
                value.push(row.map(function(x){return x.value}));
                columns = Math.max(columns,row.length);
            }
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('matrix',[sig.listof(sig.type('number'))],TMatrix,null, {
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
            value = [list.value.map(function(e){return jme.castToType(e,'number').value})];
            rows = 1;
            columns = list.vars;
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('matrix',[sig.multiple(sig.listof(sig.type('number')))],TMatrix, null, {
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
newBuiltin('rowvector',[sig.multiple(sig.type('number'))],TMatrix, null, {
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
newBuiltin('rowvector',[sig.listof(sig.type('number'))],TMatrix, null, {
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

newBuiltin('diff',[TExpression,String],TExpression,null, {
    evaluate: function(args,scope) {
        var expr = scope.evaluate(args[0]).tree;
        var name = scope.evaluate(args[1]).value;
        var res = jme.calculus.differentiate(expr,name,scope);
        var ruleset = jme.collectRuleset('all',scope.allRulesets());
        var simplified = jme.display.simplifyTree(res,ruleset,scope);
        return new TExpression(simplified);
    }
});
Numbas.jme.lazyOps.push('diff');

/** Set the content of an HTML element to something corresponding to the value of the given token.
 * If the token is not of type HTML, use {@link jme.typeToDisplayString}.
 *
 * @param {Element} element
 * @param {Numbas.jme.token} tok
 */
function set_html_content(element,tok) {
    if(tok.type!='html') {
        element.innerHTML = jme.tokenToDisplayString(tok);
    } else {
        element.appendChild(tok.value);
    }
}
newBuiltin('table',[TList,TList],THTML,
    function(data,headers) {
        var table = document.createElement('table');
        var thead = document.createElement('thead');
        table.appendChild(thead);
        for(var i=0;i<headers.length;i++) {
            var th = document.createElement('th');
            set_html_content(th,headers[i]);
            thead.appendChild(th);
        }
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for(var i=0;i<data.length;i++) {
            var row = document.createElement('tr');
            tbody.appendChild(row);
            for(var j=0;j<data[i].value.length;j++) {
                var cell = data[i].value[j];
                var td = document.createElement('td');
                set_html_content(td,data[i].value[j]);
                row.appendChild(td);
            }
        }
        return table;
    }
);
newBuiltin('table',[TList],THTML,
    function(data) {
        var table = document.createElement('table');
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for(var i=0;i<data.length;i++) {
            var row = document.createElement('tr');
            tbody.appendChild(row);
            for(var j=0;j<data[i].value.length;j++) {
                var td = document.createElement('td');
                set_html_content(td,data[i].value[j]);
                row.appendChild(td);
            }
        }
        return table;
    }
);

newBuiltin('max_width',[TNum,THTML],THTML,function(w,h) {
    h[0].style['max-width'] = w+'em';
    return h[0];
});

newBuiltin('max_height',[TNum,THTML],THTML,function(w,h) {
    h[0].style['max-height'] = w+'em';
    return h[0];
});

newBuiltin('parse',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('expand_juxtapositions',[TExpression,sig.optional(sig.type('dict'))],TExpression,null, {
    evaluate: function(args,scope) {
        var tree = args[0].tree;
        var options = args[1] ? jme.unwrapValue(args[1]) : undefined;
        return new TExpression(scope.expandJuxtapositions(tree,options));
    }
});
newBuiltin('expression',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('args',[TExpression],TList,null, {
    evaluate: function(args, scope) {
        if(!args[0].tree.args) {
            return new TList([]);
        }
        return new TList(args[0].tree.args.map(function(tree){ return new TExpression(tree); }));
    }
});
newBuiltin('as',['?',TString],'?',null, {
    evaluate: function(args,scope) {
        var target = args[1].value;
        return jme.castToType(args[0],target);
    }
});
newBuiltin('type',[TExpression],TString,null, {
    evaluate: function(args,scope) {
        return new TString(args[0].tree.tok.type);
    }
});
newBuiltin('type',['?'],TString,null, {
    evaluate: function(args,scope) {
        return new TString(args[0].type);
    }
});
newBuiltin('name',[TString],TName,function(name){ return name });
newBuiltin('string',[TName],TString,function(name){ return name });
newBuiltin('op',[TString],TOp,function(name){ return name });
newBuiltin('function',[TString],TFunc,function(name){ return name });
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
    var try_boundvars = boundvars.slice();
    try_boundvars.push(tree.args[1].tok.name.toLowerCase());
    vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],try_boundvars,scope));
    return vars;
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
newBuiltin('exec',[TFunc,TList],TExpression,null, {
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
newBuiltin('latex',[TExpression],TString,null, {
    evaluate: function(args,scope) {
        var expr = args[0];
        var tex = jme.display.texify(expr.tree);
        var s = new TString(tex);
        s.latex = true;
        return s;
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

newBuiltin('infer_variable_types',[TExpression],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0];
        var assignments = jme.inferVariableTypes(expr.tree,scope);
        return jme.wrapValue(assignments);
    }
});

newBuiltin('infer_type',[TExpression],TString,null, {
    evaluate: function(args, scope) {
        var expr = args[0];
        return jme.wrapValue(jme.inferExpressionType(expr.tree,scope));
    }
});

newBuiltin('make_variables',[sig.dict(sig.type('expression')),sig.optional(sig.type('range'))],TDict,null, {
    evaluate: function(args,scope) {
        var todo = {};
        var scope = new jme.Scope([scope]);
        if(args.length>1) {
            scope.setVariable('vrange',args[1]);
        }
        for(var x in args[0].value) {
            scope.deleteVariable(x);
            var tree = args[0].value[x].tree;
            var vars = jme.findvars(tree);
            todo[x] = {tree: args[0].value[x].tree, vars: vars};
        }
        var result = jme.variables.makeVariables(todo,scope);
        var out = {};
        for(var x in result.variables) {
            out[x] = result.variables[x];
        }
        return new TDict(out);
    }
});

/** Helper function for the JME `match` function.
 *
 * @param {Numbas.jme.tree} expr
 * @param {string} pattern
 * @param {string} options
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.token}
 * @see Numbas.jme.rules.Rule#match
 */
function match_subexpression(expr,pattern,options,scope) {
    var rule = new jme.rules.Rule(pattern, null, options);
    var match = rule.match(expr,scope);
    if(!match) {
        return jme.wrapValue({match: false, groups: {}});
    } else {
        var groups = {}
        for(var x in match) {
            if(x.slice(0,2)!='__') {
                groups[x] = new TExpression(match[x]);
            }
        }
        return jme.wrapValue({
            match: true,
            groups: groups
        });
    }
}

newBuiltin('match',[TExpression,TString],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = 'ac';
        return match_subexpression(expr,pattern,options,scope);
    }
});
newBuiltin('match',[TExpression,TString,TString],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = args[2].value;
        return match_subexpression(expr,pattern,options,scope);
    }
});

/** Helper function for the JME `matches` function.
 *
 * @param {Numbas.jme.tree} expr
 * @param {string} pattern
 * @param {string} options
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.token}
 * @see Numbas.jme.rules.Rule#match
 */
function matches_subexpression(expr,pattern,options,scope) {
    var rule = new jme.rules.Rule(pattern, null, options);
    var match = rule.match(expr,scope);
    return new TBool(match && true);
}

newBuiltin('matches',[TExpression,TString],TBool,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = 'ac';
        return matches_subexpression(expr,pattern,options,scope);
    }
});
newBuiltin('matches',[TExpression,TString,TString],TBool,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = args[2].value;
        return matches_subexpression(expr,pattern,options,scope);
    }
});

/** Helper function for the JME `replace` function.
 *
 * @param {string} pattern
 * @param {string} repl
 * @param {Numbas.jme.tree} expr
 * @param {string} options
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.token}
 * @see Numbas.jme.rules.Rule#replaceAll
 */
function replace_expression(pattern,repl,expr,options,scope) {
        var rule = new jme.rules.Rule(pattern,repl,options);
        var out = rule.replaceAll(expr,scope).expression;
        return new TExpression(out);
}
newBuiltin('replace',[TString,TString,TExpression],TExpression,null,{
    evaluate: function(args, scope) {
        var pattern = args[0].value;
        var repl = args[1].value;
        var expr = args[2].tree;
        var options = 'acg';
        return replace_expression(pattern,repl,expr,options,scope);
    }
});
newBuiltin('replace',[TString,TString,TExpression,TString],TExpression,null,{
    evaluate: function(args, scope) {
        var pattern = args[0].value;
        var repl = args[1].value;
        var expr = args[2].tree;
        var options = args[3].value;
        return replace_expression(pattern,repl,expr,options,scope);
    }
});
newBuiltin('substitute',[TDict,TExpression],TExpression,null,{
    evaluate: function(args,scope) {
        var substitutions = args[0].value;
        for(var x in substitutions) {
            if(substitutions[x].type=='expression') {
                substitutions[x] = substitutions[x].tree;
            }
        }
        var expr = args[1].tree;
        scope = new Scope({variables: substitutions});
        var nexpr = jme.substituteTree(expr,scope,true,true);
        return new TExpression(nexpr);
    }
});

newBuiltin('canonical_compare',['?','?'],TNum,null, {
    evaluate: function(args,scope) {
        var cmp = jme.compareTrees(args[0],args[1]);
        return new TNum(cmp);
    }
});
jme.lazyOps.push('canonical_compare');

newBuiltin('numerical_compare',[TExpression,TExpression],TBool,null,{
    evaluate: function(args,scope) {
        var a = args[0].tree;
        var b = args[1].tree;
        return new TBool(jme.compare(a,b,{},scope));
    }
});

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

/** A LaTeX string.
 *
 * @typedef TeX
 * @type {string}
 */

/** @namespace Numbas.jme.display */
jme.display = /** @lends Numbas.jme.display */ {
    /** Convert a JME expression to LaTeX.
     *
     * @param {JME} expr
     * @param {Array.<string>|Numbas.jme.rules.Ruleset} ruleset - Can be anything accepted by {@link Numbas.jme.display.collectRuleset}.
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.Parser} [parser=Numbas.jme.standardParser]
     * @returns {TeX}
     */
    exprToLaTeX: function(expr,ruleset,scope,parser)
    {
        if(!ruleset)
            ruleset = jme.rules.simplificationRules.basic;
        ruleset = jme.collectRuleset(ruleset,scope.allRulesets());
        expr+='';    //make sure expr is a string
        if(!expr.trim().length)    //if expr is the empty string, don't bother going through the whole compilation proces
            return '';
        var tree = jme.display.simplify(expr,ruleset,scope,parser); //compile the expression to a tree and simplify it
        var tex = texify(tree,ruleset.flags); //render the tree as TeX
        return tex;
    },
    /** Simplify a JME expression string according to the given ruleset and return it as a JME string.
     *
     * @param {JME} expr
     * @param {Array.<string>|Numbas.jme.rules.Ruleset} ruleset - Can be anything accepted by {@link Numbas.jme.display.collectRuleset}.
     * @param {Numbas.jme.Scope} scope
     * @returns {JME}
     *
     * @see Numbas.jme.display.simplify
     */
    simplifyExpression: function(expr,ruleset,scope)
    {
        if(expr.trim()=='')
            return '';
        var simplifiedTree = jme.display.simplify(expr,ruleset,scope);
        return treeToJME(simplifiedTree,ruleset.flags);
    },
    /** Simplify a JME expression string according to given ruleset and return it as a syntax tree.
     *
     * @param {JME} expr
     * @param {Array.<string>|Numbas.jme.rules.Ruleset} ruleset
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.Parser} [parser=Numbas.jme.standardParser]
     * @returns {Numbas.jme.tree}
     *
     * @see Numbas.jme.display.simplifyExpression
     * @see Numbas.jme.display.simplifyTree
     */
    simplify: function(expr,ruleset,scope,parser)
    {
        if(expr.trim()=='')
            return;
        if(!ruleset)
            ruleset = jme.rules.simplificationRules.basic;
        ruleset = jme.collectRuleset(ruleset,scope.allRulesets());        //collect the ruleset - replace set names with the appropriate Rule objects
        parser = parser || Numbas.jme.standardParser;
        try {
            var exprTree = parser.compile(expr,{},true);    //compile the expression to a tree. notypecheck is true, so undefined function names can be used.
            return jme.display.simplifyTree(exprTree,ruleset,scope);    // simplify the tree
        }
        catch(e)
        {
            //e.message += '\nSimplifying expression failed. Expression was: '+expr;
            throw(e);
        }
    },
    /** Simplify a syntax tree according to the given ruleset.
     *
     * @see Numbas.jme.rules.Ruleset#simplify
     * @param {Numbas.jme.tree} exprTree
     * @param {Numbas.jme.rules.Ruleset} ruleset
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} allowUnbound
     * @returns {Numbas.jme.tree}
     *
     * @see Numbas.jme.display.simplify
     */
    simplifyTree: function(exprTree,ruleset,scope,allowUnbound) {
        return ruleset.simplify(exprTree,scope);
    }
};

/** Would texify put brackets around a given argument of an operator?
 *
 * @param {Numbas.jme.tree} thing
 * @param {number} i - The index of the argument.
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {boolean}
 */
function texifyWouldBracketOpArg(thing,i, settings) {
    settings = settings || {};
    var tok = thing.args[i].tok;
    var precedence = jme.precedence;
    if(tok.type=='op') {    //if this is an op applied to an op, might need to bracket
        if(thing.args.length==1) {
            return thing.args[0].tok.type=='op' && thing.args[0].args.length>1;
        }
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
    } else if(jme.isOp(thing.tok, '^') && settings.fractionnumbers && jme.isType(tok,'number') && texSpecialNumber(tok.value)===undefined && math.rationalApproximation(Math.abs(tok.value))[1] != 1) {
        return true;
    }
    return false;
}
/** Apply brackets to an op argument if appropriate.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Numbas.jme.tree} thing
 * @param {Array.<string>} texArgs - The arguments of `thing`, as TeX.
 * @param {number} i - The index of the argument to bracket.
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
/** Helper function for texing infix operators.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - The TeX command for the operator.
 * @returns {Function} - A function which will convert a syntax tree with the operator at the top to TeX, by putting `code` in between the TeX of the two arguments.
 */
function infixTex(code)
{
    return function(thing,texArgs)
    {
        var arity = thing.args.length;
        if( arity == 1 )    //if operation is unary, prepend argument with code
        {
            var arg = texifyOpArg(thing,texArgs,0);
            return thing.tok.postfix ? arg+code : code+arg;
        }
        else if ( arity == 2 )    //if operation is binary, put code in between arguments
        {
            return texifyOpArg(thing,texArgs,0)+' '+code+' '+texifyOpArg(thing,texArgs,1);
        }
    }
}
/** Helper for texing nullary functions.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - The TeX command for the function.
 * @returns {Function} - A function which returns the appropriate (constant) TeX code.
 */
function nullaryTex(code)
{
    return function(thing,texArgs){ return '\\textrm{'+code+'}'; };
}
/** Helper function for texing functions.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - The TeX command for the function.
 * @returns {Function} - A function which converts a syntax tree to the appropriate TeX.
 */
function funcTex(code)
{
    var f = function(thing,texArgs){
        return code+' \\left ( '+texArgs.join(', ')+' \\right )';
    }
    f.code = code;
    return f;
}

/** TeX the name of a pattern-matching operator.
 *
 * @param {TeX} code
 * @returns {TeX}
 */
function patternName(code) {
    return '\\operatorname{\\color{grey}{'+code+'}}';
}

/** Define how to texify each operation and function.
 *
 * @enum {Function}
 * @memberof Numbas.jme.display
 */
var texOps = jme.display.texOps = {
    '#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),
    'not': infixTex('\\neg '),
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
            return settings.texNumber({complex:true,re:-value.re,im:-value.im}, settings);
        }
        return '-'+tex;
    }),
    '^': (function(thing,texArgs,settings) {
        var tex0 = texArgs[0];
        //if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
        if(thing.args[0].tok.type=='op' || (thing.args[0].tok.type=='function' && thing.args[0].tok.name=='exp') || texifyWouldBracketOpArg(thing, 0, settings)) {
            tex0 = '\\left ( ' +tex0+' \\right )';
        }
        var trigFunctions = ['cos','sin','tan','sec','cosec','cot','arcsin','arccos','arctan','cosh','sinh','tanh','cosech','sech','coth','arccosh','arcsinh','arctanh'];
        if(thing.args[0].tok.type=='function' && trigFunctions.contains(thing.args[0].tok.name) && jme.isType(thing.args[1].tok,'number') && util.isInt(thing.args[1].tok.value) && thing.args[1].tok.value>0) {
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
                } else if (jme.isOp(right.tok,'^') && (right.args[0].value==Math.E || !jme.isType(right.args[0].tok,'number'))) {
                    use_symbol = false;
                //real number times Pi or E
                } else if (jme.isType(right.tok,'number') && (right.tok.value==Math.PI || right.tok.value==Math.E || right.tok.value.complex) && jme.isType(left.tok,'number') && !(left.tok.value.complex)) {
                    use_symbol = false
                //number times a power of i
                } else if (jme.isOp(right.tok,'^') && jme.isType(right.args[0].tok,'number') && math.eq(right.args[0].tok.value,math.complex(0,1)) && jme.isType(left.tok,'number')) {
                    use_symbol = false;
                // times sign when LHS or RHS is a factorial
                } else if((left.tok.type=='function' && left.tok.name=='fact') || (right.tok.type=='function' && right.tok.name=='fact')) {
                    use_symbol = true;
                //(anything except i) times i
                } else if ( !(jme.isType(left.tok,'number') && math.eq(left.tok.value,math.complex(0,1))) && jme.isType(right.tok,'number') && math.eq(right.tok.value,math.complex(0,1))) {
                    use_symbol = false;
                // multiplication of two names, at least one of which has more than one letter
                } else if(right.tok.type=='name' && left.tok.type=='name' && Math.max(left.tok.name.length,right.tok.name.length)>1) {
                    use_symbol = true;
                // multiplication of a name by something in brackets
                } else if(jme.isType(left.tok,'name') && texifyWouldBracketOpArg(thing,i)) {
                    use_symbol = true;
                // anything times number, or (-anything), or an op with lower precedence than times, with leftmost arg a number
                } else if ( jme.isType(right.tok,'number')
                        ||
                            jme.isOp(right.tok,'-u')
                        ||
                        (
                            !jme.isOp(right.tok,'-u')
                            && (right.tok.type=='op' && jme.precedence[right.tok.name]<=jme.precedence['*']
                                && (jme.isType(right.args[0].tok,'number')
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
    '/': (function(thing,texArgs,settings) {
        if (settings.flatfractions) {
            return '\\left. ' + texifyOpArg(thing,texArgs,0) + ' \\middle/ ' + texifyOpArg(thing,texArgs,1) + ' \\right.'
        } else {
            return ('\\frac{ '+texArgs[0]+' }{ '+texArgs[1]+' }');
        }
    }),
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
            var texb = settings.texNumber(math.complex(b.tok.value.re,-b.tok.value.im), settings);
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
    '<>': infixTex('\\neq'),
    '=': infixTex('='),
    'and': infixTex('\\wedge'),
    'or': infixTex('\\vee'),
    'xor': infixTex('\\, \\textrm{XOR} \\,'),
    'implies': infixTex('\\to'),
    'in': infixTex('\\in'),
    '|': infixTex('|'),
    'decimal': function(thing,texArgs,settings) {
        return texArgs[0];
    },
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
                if(jme.isType(thing.args[0].tok,'number') || thing.args[0].tok.type=='name') {
                    return texArgs[0]+'!';
                } else {
                    return '\\left ('+texArgs[0]+' \\right )!';
                }
            }),
    'ceil': (function(thing,texArgs) { return '\\left \\lceil '+texArgs[0]+' \\right \\rceil';}),
    'floor': (function(thing,texArgs) { return '\\left \\lfloor '+texArgs[0]+' \\right \\rfloor';}),
    'int': (function(thing,texArgs) { return ('\\int \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'defint': (function(thing,texArgs) { return ('\\int_{'+texArgs[2]+'}^{'+texArgs[3]+'} \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'diff': (function(thing,texArgs,settings)
            {
                var degree = thing.args.length>=2 ? (jme.isType(thing.args[2].tok,'number') && jme.castToType(thing.args[2].tok,'number').value==1) ? '' : '^{'+texArgs[2]+'}' : '';
                if(thing.args[0].tok.type=='name') {
                    if (settings.flatfractions) {
                        return ('\\left. \\mathrm{d}'+degree+texifyOpArg(thing, texArgs, 0)+' \\middle/ \\mathrm{d}'+texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\mathrm{d}'+degree+texArgs[0]+'}{\\mathrm{d}'+texArgs[1]+degree+'}');
                    }
                } else {
                    if (settings.flatfractions) {
                        return ('\\left. \\mathrm{d}'+degree+'('+texArgs[0]+') \\middle/ \\mathrm{d}'+texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\mathrm{d}'+degree+'}{\\mathrm{d}'+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                    }
                }
            }),
    'partialdiff': (function(thing,texArgs,settings)
            {
                var degree = thing.args.length>=2 ? (jme.isType(thing.args[2].tok,'number') && jme.castToType(thing.args[2].tok,'number').value==1) ? '' : '^{'+texArgs[2]+'}' : '';
                if(thing.args[0].tok.type=='name')
                    if (settings.flatfractions) {
                        return ('\\left. \\partial '+degree+texifyOpArg(thing, texArgs, 0)+' \\middle/ \\partial '+texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\partial '+degree+texArgs[0]+'}{\\partial '+texArgs[1]+degree+'}');
                    }
                else
                {
                    if (settings.flatfractions) {
                        return ('\\left. \\partial '+degree+'('+texArgs[0]+') \\middle/ \\partial '+texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\partial '+degree+'}{\\partial '+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                    }
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
        return texMatrix(thing,settings,!settings.barematrices);
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
    },
    '`+-': infixTex(patternName('\\pm')),
    '`*/': infixTex(patternName('\\times \\atop \\div')),
    '`|': infixTex(patternName('|')),
    '`&': infixTex(patternName('\\wedge')),
    '`!': infixTex(patternName('\\neg')),
    '`where': infixTex(patternName('where')),
    '`@': infixTex(patternName('@')),
    '`?': unaryPatternTex(patternName('?')),
    '`*': unaryPatternTex(patternName('\\ast')),
    '`+': unaryPatternTex(patternName('+')),
    '`:': infixTex(patternName(':')),
    ';': function(thing,texArgs,settings) {
        return '\\underset{\\color{grey}{'+texArgs[1]+'}}{'+texArgs[0]+'}';
    },
    ';=': function(thing,texArgs,settings) {
        return '\\underset{\\color{grey}{='+texArgs[1]+'}}{'+texArgs[0]+'}';
    },
    'm_uses': funcTex(patternName('uses')),
    'm_type': funcTex(patternName('type')),
    'm_exactly': overbraceTex('exactly'),
    'm_commutative': overbraceTex('commutative'),
    'm_noncommutative': overbraceTex('non-commutative'),
    'm_associative': overbraceTex('associative'),
    'm_nonassociative': overbraceTex('non-associative'),
    'm_strictplus': overbraceTex('strict-plus'),
    'm_gather': overbraceTex('gather'),
    'm_nogather': overbraceTex('no-gather'),
    'm_func': funcTex(patternName('func')),
    'm_op': funcTex(patternName('op')),
    'm_numeric': overbraceTex('numeric ='),
}

/** Returns a function which puts the given label over the first arg of the op.
 *
 * @param {string} label
 * @returns {Function}
 */
function overbraceTex(label) {
    return function(thing,texArgs) {
        return '\\overbrace{'+texArgs[0]+'}^{\\text{'+label+'}}';
    }
}

/** Produce LaTeX for a unary pattern-matching operator.
 *
 * @param {string} code - TeX for the operator's name.
 * @returns {Function}
 */
function unaryPatternTex(code) {
    return function(thing,texArgs) {
        return '{'+texArgs[0]+'}^{'+code+'}';
    }
}

/** Convert a special number to TeX, or return undefined if not a special number.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} value
 * @returns {TeX}
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
/** Convert a number to TeX, displaying it as a fraction using {@link Numbas.math.rationalApproximation}.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} n
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {TeX}
 */
var texRationalNumber = jme.display.texRationalNumber = function(n, settings)
{
    if(n.complex)
    {
        var re = texRationalNumber(n.re, settings);
        var im = texRationalNumber(n.im, settings)+' i';
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
        if(out.length>20) {
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+' \\times 10^{'+bits.exponent+'}';
        }
        var f = math.rationalApproximation(Math.abs(n));
        if(f[1]==1) {
            out = Math.abs(f[0]).toString();
        } else {
            if(settings.mixedfractions && f[0] > f[1]) {
                var properNumerator = math.mod(f[0], f[1]);
                var mixedInteger = (f[0]-properNumerator)/f[1];
                if (settings.flatfractions) {
                    out = mixedInteger+'\\; \\left. '+properNumerator+' \\middle/ '+f[1]+' \\right.';
                } else {
                    out = mixedInteger+' \\frac{'+properNumerator+'}{'+f[1]+'}';
                }
            }
            else {
                if (settings.flatfractions) {
                    out = '\\left. '+f[0]+' \\middle/ '+f[1]+' \\right.'
                }
                else {
                    out = '\\frac{'+f[0]+'}{'+f[1]+'}';
                }
            }
        }
        if(n<0 && out!='0')
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
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} n
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {TeX}
 */
function texRealNumber(n, settings)
{
    if(n.complex)
    {
        var re = texRealNumber(n.re, settings);
        var im = texRealNumber(n.im, settings)+' i';
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
        if((piD = math.piDegree(n,false)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out = math.niceNumber(n);
        if(out.length>20) {
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+' \\times 10^{'+bits.exponent+'}';
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
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Array.<number>|Numbas.jme.tree} v
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
        elements = v.map(function(x){return texNumber(x, settings)});
    }
    if(settings.rowvector)
        out = elements.join(' , ');
    else
        out = '\\begin{matrix} '+elements.join(' \\\\ ')+' \\end{matrix}';
    return out;
}
/** Convert a matrix to TeX.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Array.<Array.<number>>|Numbas.jme.tree} m
 * @param {Numbas.jme.display.texify_settings} settings
 * @param {boolean} parens - Enclose the matrix in parentheses?
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
            return x.map(function(y){ return texNumber(y, settings) });
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
/** Dictionary of functions to convert specific name annotations to TeX.
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
    },
    complex: propertyAnnotation('complex'),
    real: propertyAnnotation('real'),
    positive: propertyAnnotation('positive'),
    nonnegative: propertyAnnotation('non-negative'),
    negative: propertyAnnotation('negative'),
    integer: propertyAnnotation('integer'),
    decimal: propertyAnnotation('decimal')
}

/** Return a function which TeXs an annotation which marks a property for pattern-matching.
 * 
 * @param {string} text
 * @returns {Function}
 */
function propertyAnnotation(text) {
    return function(name) {
        return '\\text{'+text+' } '+name;
    }
}
texNameAnnotations.verb = texNameAnnotations.verbatim;
texNameAnnotations.v = texNameAnnotations.vector;
texNameAnnotations.m = texNameAnnotations.matrix;
/** Convert a variable name to TeX.
 *
 * @memberof Numbas.jme.display
 *
 * @param {string} name
 * @param {Array.<string>} [annotations]
 * @param {Function} [longNameMacro=texttt] - Function which returns TeX for a long name.
 * @returns {TeX}
 */
var texName = jme.display.texName = function(name,annotations,longNameMacro)
{
    longNameMacro = longNameMacro || (function(name){ return '\\texttt{'+name+'}'; });
    var oname = name;
    /** Apply annotations to the given name.
     *
     * @param {TeX} name
     * @returns {TeX}
     */
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
    if(specialNames[name]) {
        return applyAnnotations(specialNames[name]);
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

/** TeX a special name used in pattern-matching.
 *
 * @param {TeX} display
 * @returns {TeX}
 */
function texPatternName(display) {
    return '\\text{'+display+'}';
}

/** Names with special renderings.
 *
 * @memberof Numbas.jme.display
 * @type {object.<string>}
 */
var specialNames = jme.display.specialNames = {
    '$z': texPatternName('nothing'),
    '$n': texPatternName('number'),
    '$v': texPatternName('name')
}

var greek = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega']

/** Definition of a number with a special name.
 *
 * @typedef Numbas.jme.display.special_number_definition
 * @property {number} value
 * @property {TeX} tex - The TeX code for this number.
 * @property {JME} jme - The JME code for this number.
 */

/** List of numbers with special names.
 *
 * @memberof Numbas.jme.display
 * @type {Array.<Numbas.jme.display.special_number_definition>}
 */
jme.display.specialNumbers = [
    {value: Math.E, tex: 'e', jme: 'e'},
    {value: Math.PI, tex: '\\pi', jme: 'pi'},
    {value: Infinity, tex: '\\infty', jme: 'infinity'}
];
/** Dictionary of functions to turn {@link Numbas.jme.types} objects into TeX strings.
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToTeX = jme.display.typeToTeX = {
    'nothing': function(thing,tok,texArgs,settings) {
        return '\\text{nothing}';
    },
    'integer': function(thing,tok,texArgs,settings) {
        return settings.texNumber(tok.value, settings);
    },
    'rational': function(thing,tok,texArgs,settings) {
        return settings.texNumber(tok.value.toFloat(), settings);
    },
    'decimal': function(thing,tok,texArgs,settings) {
        return settings.texNumber(tok.value.toComplexNumber(), settings);
    },
    'number': function(thing,tok,texArgs,settings) {
        return settings.texNumber(tok.value, settings);
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
        return key+' \\operatorname{\\colon} '+texArgs[0];
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
        var m = texMatrix(tok.value,settings);
        if(!settings.barematrices) {
            m = '\\left ( ' + m + ' \\right )';
        }
        return m;
    },
    name: function(thing,tok,texArgs,settings) {
        return texName(tok.nameWithoutAnnotation,tok.annotation);
    },
    special: function(thing,tok,texArgs,settings) {
        return tok.value;
    },
    conc: function(thing,tok,texArgs,settings) {
        return texArgs.join(' ');
    },
    op: function(thing,tok,texArgs,settings) {
        var name = tok.name.toLowerCase();
        var fn = name in texOps ? texOps[name] : infixTex('\\, \\operatorname{'+name+'} \\,');
        return fn(thing,texArgs,settings);
    },
    'function': function(thing,tok,texArgs,settings) {
        var lowerName = tok.name.toLowerCase();
        if(texOps[lowerName]) {
            return texOps[lowerName](thing,texArgs,settings);
        }
        else {
            /** Long operators get wrapped in `\operatorname`.
             *
             * @param {string} name
             * @returns {TeX}
             */
            function texOperatorName(name) {
                return '\\operatorname{'+name.replace(/_/g,'\\_')+'}';
            }
            return texName(tok.nameWithoutAnnotation,tok.annotation,texOperatorName)+' \\left ( '+texArgs.join(', ')+' \\right )';
        }
    },
    set: function(thing,tok,texArgs,settings) {
        texArgs = [];
        for(var i=0;i<tok.value.length;i++) {
            texArgs.push(texify(tok.value[i],settings));
        }
        return '\\left\\{ '+texArgs.join(', ')+' \\right\\}';
    },
    expression: function(thing,tok,texArgs,settings) {
        return texify(tok.tree,settings);
    }
}
/** Take a nested application of a single op, e.g. `((1*2)*3)*4`, and flatten it so that the tree has one op two or more arguments.
 *
 * @param {Numbas.jme.tree} tree
 * @param {string} op
 * @returns {Array.<Numbas.jme.tree>}
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
 *
 * @see Numbas.jme.rules.displayFlags
 *
 * @typedef Numbas.jme.display.texify_settings
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} rowvector - Display vectors as a horizontal list of components?
 * @property {boolean} alwaystimes - Always show the multiplication symbol between multiplicands?
 * @property {boolean} mixedfractions - Show top-heavy fractions as mixed fractions, e.g. 3 3/4?
 * @property {boolean} flatfractions - Display fractions horizontally?
 * @property {boolean} barematrices - Render matrices without wrapping them in parentheses.
 * @property {boolean} nicenumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 */

/** Turn a syntax tree into a TeX string. Data types can be converted to TeX straightforwardly, but operations and functions need a bit more care.
 *
 * The idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX.
 *
 * @memberof Numbas.jme.display
 * @function
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
        thing = {
            tok: thing.tok,
            args: thing.args.map(function(arg) {
                if(arg.tok.type=='expression') {
                    return arg.tree;
                } else {
                    return arg;
                }
            })
        }
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
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} value
 * @returns {TeX}
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
/** Write a number in JME syntax as a fraction, using {@link Numbas.math.rationalApproximation}.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} n
 * @param {Numbas.jme.display.jme_display_settings} settings - Ff `settings.niceNumber===false`, don't round off numbers.
 * @returns {JME}
 */
var jmeRationalNumber = jme.display.jmeRationalNumber = function(n,settings)
{
    settings = settings || {};
    if(n.complex)
    {
        var re = jmeRationalNumber(n.re);
        var im = jmeRationalNumber(n.im);
        im += im.match(/\d$/) ? 'i' : '*i';
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
            if(n.im==-1) {
                return re+' - i';
            } else {
                return re+' - '+im.slice(1);
            }
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
        var out;
        if(settings.niceNumber===false) {
            out = n+'';
        } else {
            out = math.niceNumber(n);
        }
        if(out.length>20) {
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+'*10^('+bits.exponent+')';
        }
        var f = math.rationalApproximation(Math.abs(n),settings.accuracy);
        if(f[1]==1)
            out = Math.abs(f[0]).toString();
        else
            out = f[0]+'/'+f[1];
        if(n<0 && out!='0')
            out='-'+out;
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
 * @param {number} n
 * @param {Numbas.jme.display.jme_display_settings} settings - If `settings.niceNumber===false`, don't round off numbers.
 * @returns {JME}
 */
var jmeRealNumber = jme.display.jmeRealNumber = function(n,settings)
{
    settings = settings || {};
    if(n.complex)
    {
        var re = jmeRealNumber(n.re);
        var im = jmeRealNumber(n.im);
        im += im.match(/\d$/) ? 'i' : '*i';
        if(Math.abs(n.im)<1e-15) {
            return re;
        } 
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
                return re+' - '+im.slice(1);
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
        if((piD = math.piDegree(n,false)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out;
        if(settings.niceNumber===false) {
            out = n+'';
            if(out.match(/e/)) {
                out = math.unscientific(out);
            }
        } else {
            out = math.niceNumber(n);
        }
        if(out.length>20) {
            if(Math.abs(n)<1e-15) {
                return '0';
            }
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+'*10^('+bits.exponent+')';
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

/** Write a {@link Numbas.jme.math.ComplexDecimal} in JME syntax.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Numbas.math.ComplexDecimal|Decimal} n
 * @param {Numbas.jme.display.jme_display_settings} settings - If `settings.niceNumber===false`, don't round off numbers.
 * @returns {JME}
 */
var jmeDecimal = jme.display.jmeDecimal = function(n,settings)
{
    settings = settings || {};
    if(n instanceof Numbas.math.ComplexDecimal) {
        var re = jmeDecimal(n.re);
        if(n.isReal()) {
            return re;
        } 
        var im = jmeDecimal(n.im)+'*i';
        if(n.re.isZero()) {
            if(n.im.eq(1))
                return 'i';
            else if(n.im.eq(-1))
                return '-i';
            else
                return im;
        } else if(n.im.lt(0)) {
            if(n.im.eq(-1))
                return re+' - i';
            else
                return re+' - '+im.slice(1);
        } else {
            if(n.im.eq(1))
                return re+' + i';
            else
                return re+' + '+im;
        }
    } else if(n instanceof Decimal) {
        var out = n.toString();
        if(n.absoluteValue().toNumber()<Infinity && ((n.isInteger() && n.absoluteValue().lt(Number.MAX_SAFE_INTEGER)) || n.decimalPlaces()<10)) {
            return out;
        }
        if(out.length>20) {
            out = n.toExponential();
        }
        return 'dec("'+out+'")';
    } else {
        return jmeRealNumber(n, settings);
    }
}

/** Dictionary of functions to turn {@link Numbas.jme.types} objects into JME strings.
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToJME = Numbas.jme.display.typeToJME = {
    'nothing': function(tree,tok,bits,settings) {
        return 'nothing';
    },
    'integer': function(tree,tok,bits,settings) {
        return settings.jmeNumber(tok.value,settings);
    },
    'rational': function(tree,tok,bits,settings) {
        return settings.jmeNumber(tok.value.toFloat(),settings);
    },
    'decimal': function(tree,tok,bits,settings) {
        return jmeDecimal(tok.value,settings);
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
        if(tok.latex && !settings.ignorestringattributes) {
            return 'latex('+str+')';
        } else if(tok.safe && !settings.ignorestringattributes) {
            return 'safe('+str+')';
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
        var arg = bits[0];
        if(tree.args[0].tok.type=='op') {
            arg = '( '+arg+' )';
        }
        return key+': '+arg;
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
            var arg = args[i].tok;
            var isNumber = jme.isType(arg,'number');
            var arg_type = arg.type;
            var arg_value = arg.value;
            var pd;
            var arg_op = null;
            if(arg_type=='op') {
                arg_op = args[i].tok.name;
            } else if(isNumber && arg_value.complex && arg_value.im!=0) {
                if(arg_value.re!=0) {
                    arg_op = arg_value.im<0 ? '-' : '+';   // implied addition/subtraction because this number will be written in the form 'a+bi'
                } else if(arg_value.im!=1) {
                    arg_op = '*';   // implied multiplication because this number will be written in the form 'bi'
                }
            } else if(isNumber && (pd = math.piDegree(args[i].tok.value))>0 && arg_value/math.pow(Math.PI,pd)>1) {
                arg_op = '*';   // implied multiplication because this number will be written in the form 'a*pi'
            } else if(isNumber && bits[i].indexOf('/')>=0) {
                arg_op = '/';   // implied division because this number will be written in the form 'a/b'
            }
            var bracketArg = false;
            if(arg_op!=null) {
                if(op in opBrackets) {
                    bracketArg = opBrackets[op][i][arg_op]==true || (tok.prefix && opBrackets[op][i][arg_op]===undefined);
                } else {
                    bracketArg = tok.prefix==true || tok.postfix==true;
                }
            }
            if(bracketArg) {
                bits[i] = '('+bits[i]+')';
                args[i].bracketed=true;
            }
        }
        //omit multiplication symbol when not necessary
        if(op=='*') {
            //number or brackets followed by name or brackets doesn't need a times symbol
            //except <anything>*(-<something>) does
            if(!settings.alwaystimes && ((jme.isType(args[0].tok,'number') && math.piDegree(args[0].tok.value)==0 && args[0].tok.value!=Math.E) || args[0].bracketed) && (jme.isType(args[1].tok,'name') || args[1].bracketed && !jme.isOp(tree.args[1].tok,'-u')) )
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
        case '+':
            op=' '+op+' ';
            break;
        case 'not':
            op = 'not ';
            break;
        case 'fact':
            op = '!';
            break;
        default:
            if(op.length>1 && tok.vars==2) {
                op = ' '+op+' ';
            }
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

jme.display.registerType = function(type, renderers) {
    var name = type.prototype.type;
    if(renderers.tex) {
        typeToTeX[name] = renderers.tex;
    }
    if(renderers.jme) {
        typeToJME[name] = renderers.jme;
    }
    if(renderers.displayString) {
        jme.typeToDisplayString[name] = renderers.displayString;
    }
}

/** Define how to render function in JME, for special cases when the normal rendering `f(...)` isn't right.
 *
 * @enum {Function}
 * @memberof Numbas.jme.display
 */
var jmeFunctions = jme.display.jmeFunctions = {
    'dict': typeToJME.dict,
    'fact': function(tree,tok,bits,settings) {
        if(jme.isType(tree.args[0].tok,'number') || tree.args[0].tok.type=='name') {
            return bits[0]+'!';
        } else {
            return '( '+bits[0]+' )!';
        }
    },
    'listval': function(tree,tok,bits,settings) {
        return bits[0]+'['+bits[1]+']';
    }
}

/** A dictionary of settings for {@link Numbas.jme.display.treeToJME}.
 *
 * @typedef Numbas.jme.display.jme_display_settings
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} niceNumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {boolean} wrapexpressions - Wrap TExpression tokens in `expression("")`?
 * @property {boolean} ignorestringattributes - Don't wrap strings in functions for attributes like latex() and safe().
 * @property {number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 */

/** Turn a syntax tree back into a JME expression (used when an expression is simplified).
 *
 * @memberof Numbas.jme.display
 * @function
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.display.jme_display_settings} settings
 * @returns {JME}
 */
var treeToJME = jme.display.treeToJME = function(tree,settings)
{
    if(!tree)
        return '';
    settings = util.copyobj(settings || {}, true);
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
 * Arrays consisting of one object for each argument of the operation.
 *
 * @enum
 * @memberof Numbas.jme.display
 * @private
 */
var opBrackets = Numbas.jme.display.opBrackets = {
    '+u':[{}],
    '-u':[{'+':true,'-':true,'*':false,'/':false}],
    '+': [{},{}],
    '-': [{},{'+':true,'-':true}],
    '*': [{'+u':true,'+':true, '-':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '/':true}],
    '/': [{'+u':true,'+':true, '-':true, '*':false},{'+u':true,'-u':true,'+':true, '-':true, '*':true}],
    '^': [{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true, '^': true},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
    'and': [{'or':true, 'xor':true},{'or':true, 'xor':true}],
    'not': [{'and':true,'or':true,'xor':true}],
    'or': [{'xor':true},{'xor':true}],
    'xor':[{},{}],
    '=': [{},{}]
};

/** Align a series of blocks of text under a header line, connected to the header by ASCII line characters.
 *
 * @param {string} header
 * @param {Array.<string>} items
 * @returns {string}
 */
var align_text_blocks = jme.display.align_text_blocks = function(header,items) {
    /** Pad a line of text so it's in the centre of a line of length `n`.
     *
     * @param {string} line
     * @param {number} n
     * @returns {string}
     */
    function centre(line,n) {
        if(line.length>=n) {
            return line;
        }
        var npad = (n-line.length)/2;
        var nlpad = Math.floor(npad);
        var nrpad = Math.ceil(npad);
        for(var i=0;i<nlpad;i++) {
            line = ' '+line;
        }
        for(var i=0;i<nrpad;i++) {
            line = line+' ';
        }
        return line;
    }
    
    var item_lines = items.map(function(item){return item.split('\n')});
    var item_widths = item_lines.map(function(lines) {return lines.reduce(function(m,l){return Math.max(l.length,m)},0)});
    var num_lines = item_lines.reduce(function(t,ls){return Math.max(ls.length,t)},0);
    item_lines = item_lines.map(function(lines,i) {
        var w = item_widths[i];
        var o = [];
        for(var j=0;j<num_lines;j++) {
            var l = lines[j] || '';
            for(var i=l.length;i<w;i++) {
                l += ' ';
            }
            o.push(l);
        }
        return o;
    });
    var bottom_lines = [];
    for(var i=0;i<num_lines;i++) {
        bottom_lines.push(item_lines.map(function(lines){return lines[i]}).join('  '));
    }
    var bottom_line = bottom_lines.join('\n');
    var width = item_widths.reduce(function(t,w){return t+w},0)+2*(items.length-1);
    var ci = Math.floor(width/2-0.5);
    var top_line = '';
    top_line = centre(header,width);
    var middle_line;
    if(items.length==1) {
        middle_line = '';
        for(var i=0;i<width;i++) {
            middle_line += i==ci ? '│' : ' ';
        }
    } else {
        middle_line = items.map(function(rarg,i) {
            var s = '';
            var mid = Math.floor(item_widths[i]/2-0.5);
            for(var j=0;j<item_widths[i];j++) {
                if(i==0) {
                    s += j<mid ? ' ' : j==mid ? '┌' : '─';
                } else if(i==items.length-1) {
                    s += j<mid ? '─' : j==mid ? '┐' : ' ';
                } else {
                    s += j==mid ? '┬' : '─';
                }
            }
            return s;
        }).join('──');
    }
    var top_joins = {
        '│': '│',
        '┌': '├',
        '┐': '┤',
        '─': '┴',
        '┬': '┼'
    }
    var mid = top_joins[middle_line[ci]];
    middle_line = middle_line.slice(0,ci)+mid+middle_line.slice(ci+1);
    if(top_line.length>bottom_line.length) {
        middle_line = centre(middle_line,header.length);
        bottom_line = centre(bottom_line,header.length);
    }
    return [top_line,middle_line,bottom_line].join('\n');
}

/** Display a tree as a diagram using.
 *
 * @param {Numbas.jme.tree} tree
 * @returns {string}
 */
var tree_diagram = Numbas.jme.display.tree_diagram = function(tree) {
    switch(tree.tok.type) {
        case 'op':
        case 'function':
            var args = tree.args.map(function(arg){ return tree_diagram(arg); });
            return align_text_blocks(tree.tok.name, args);
        default:
            return treeToJME(tree);
    }
};

/** For backwards compatibility, copy references from some Numbas.jme.rules members to Numbas.jme.display.
 * These used to belong to Numbas.jme.display, but were moved into a separate file.
 */
['Rule','getTerms','matchTree','matchExpression','simplificationRules','compileRules'].forEach(function(name) {
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
 * and substituting variables into maths or the DOM.
 *
 * Provides {@link Numbas.jme.variables}
 */
Numbas.queueScript('jme-variables',['base','jme','util'],function() {
var jme = Numbas.jme;
var util = Numbas.util;
/** @namespace Numbas.jme.variables */

/** A dictionary describing a variable to be evaluated.
 *
 * @typedef {object} Numbas.jme.variables.variable_data_dict
 * @property {Numbas.jme.tree} tree - Definition of the variable.
 * @property {string[]} vars - Names of variables this variable depends on.
 */

/** The definition of a custom JME function.
 *
 * @typedef Numbas.jme.variables.func_data
 * @type {object}
 * @property {string} name
 * @property {string} definition - Definition of the function, either in {@link JME} or JavaScript.
 * @property {string} language - Either `"jme"` or `"javascript"`.
 * @property {string} outtype - Name of the {@link Numbas.jme.token} type this function returns.
 * @property {Array.<object>} parameters - Definition of the function's calling signature: an array of objects with properties `name` and `type` for each of the function's parameters.
 */

jme.variables = /** @lends Numbas.jme.variables */ {
    /** Make a new function, whose definition is written in JME.
     *
     * @param {object} fn - Contains `definition` and `paramNames`.
     * @param {Numbas.jme.Scope} scope
     * @returns {Function} - Function which evaluates arguments and adds them to the scope, then evaluates `fn.definition` over that scope.
     */
    makeJMEFunction: function(fn,scope) {
        fn.tree = jme.compile(fn.definition,scope,true);
        return function(args,scope) {
            var oscope = scope;
            scope = new jme.Scope(scope);
            for(var j=0;j<args.length;j++)
            {
                scope.setVariable(fn.paramNames[j],args[j]);
            }
            return jme.evaluate(this.tree,scope);
        }
    },
    /** Make a new function, whose definition is written in JavaScript.
     *
     * The JavaScript is wrapped with `(function(<paramNames>){ ` and ` }`).
     *
     * @param {object} fn - Contains `definition` and `paramNames`.
     * @param {object} withEnv - Dictionary of local variables for javascript functions.
     * @returns {Function} - Function which evaluates arguments, unwraps them to JavaScript values, then evalutes the JavaScript function and returns the result, wrapped as a {@link Numbas.jme.token}.
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
     * @param {object} tmpfn - Contains `definition`, `name`, `language`, `parameters`.
     * @param {Numbas.jme.Scope} scope
     * @param {object} withEnv - Dictionary of local variables for javascript functions.
     * @returns {Numbas.jme.funcObj}
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
        fn.paramNames = paramNames;
        fn.definition = tmpfn.definition;
        fn.name = tmpfn.name.toLowerCase();
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
    /** Make up custom functions.
     *
     * @param {Numbas.jme.variables.func_data[]} tmpFunctions
     * @param {Numbas.jme.Scope} scope
     * @param {object} withEnv - Dictionary of local variables for javascript functions.
     * @returns {object.<Numbas.jme.funcObj>}
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
            scope.addFunction(cfn);
        }
        return functions;
    },
    /** Evaluate a variable, evaluating all its dependencies first.
     *
     * @param {string} name - The name of the variable to evaluate.
     * @param {Numbas.jme.variables.variable_data_dict} todo - Dictionary of variables still to evaluate.
     * @param {Numbas.jme.Scope} scope
     * @param {string[]} path - Breadcrumbs - Variable names currently being evaluated, so we can detect circular dependencies.
     * @param {Function} [computeFn=Numbas.jme.variables.computeVariable] - A function to call when a dependency needs to be computed.
     * @returns {Numbas.jme.token}
     */
    computeVariable: function(name,todo,scope,path,computeFn)
    {
        if(scope.getVariable(name)!==undefined)
            return scope.variables[name];
        if(path===undefined)
            path=[];
        computeFn = computeFn || jme.variables.computeVariable;
        if(name=='') {
            throw(new Numbas.Error('jme.variables.empty name'));
        }
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
                        throw(new Numbas.Error('jme.variables.error computing dependency',{name:x, message: e.message},e));
                    }
                }
            }
        }
        if(!v.tree) {
            throw(new Numbas.Error('jme.variables.empty definition',{name:name}));
        }
        try {
            var value = jme.evaluate(v.tree,scope);
            scope.setVariable(name,value);
        } catch(e) {
            throw(new Numbas.Error('jme.variables.error evaluating variable',{name:name,message:e.message},e));
        }
        return value;
    },
    /** Evaluate dictionary of variables.
     *
     * @param {Numbas.jme.variables.variable_data_dict} todo - Dictionary of variables mapped to their definitions.
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.tree} condition - Condition on the values of the variables which must be satisfied.
     * @param {Function} computeFn - A function to compute a variable. Default is Numbas.jme.variables.computeVariable.
     * @returns {object} - `variables`: a dictionary of evaluated variables, and `conditionSatisfied`: was the condition satisfied?
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

    /** Remake a dictionary of variables, only re-evaluating variables which depend on the changed_variables.
     * A new scope is created with the values from `changed_variables`, and then the dependent variables are evaluated in that scope.
     *
     * @param {Numbas.jme.variables.variable_data_dict} todo - Dictionary of variables mapped to their definitions.
     * @param {object.<Numbas.jme.token>} changed_variables - Dictionary of changed variables.
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.Scope}
     */
    remakeVariables: function(todo,changed_variables,scope) {
        var scope = new Numbas.jme.Scope([scope, {variables: changed_variables}]);
        var replaced = Object.keys(changed_variables);
        // find dependent variables which need to be recomputed
        dependents_todo = jme.variables.variableDependants(todo,replaced);
        for(var name in dependents_todo) {
            if(name in changed_variables) {
                delete dependents_todo[name];
            } else {
                scope.deleteVariable(name);
            }
        }
        // compute those variables
        var nv = jme.variables.makeVariables(dependents_todo,scope);
        scope = new Numbas.jme.Scope([scope,{variables:nv.variables}]);
        return scope;
    },

    /** Collect together a ruleset, evaluating all its dependencies first.
     *
     * @param {string} name - The name of the ruleset to evaluate.
     * @param {object.<string[]>} todo - Dictionary of rulesets still to evaluate.
     * @param {Numbas.jme.Scope} scope
     * @param {string[]} path - Breadcrumbs - Rulesets names currently being evaluated, so we can detect circular dependencies.
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
    /** Gather together a set of ruleset definitions.
     *
     * @param {object.<string[]>} todo - A dictionary mapping ruleset names to definitions.
     * @param {Numbas.jme.Scope} scope - The scope to gather the rulesets in. The rulesets are added to this scope as a side-effect.
     * @returns {object.<Numbas.jme.rules.Ruleset>} A dictionary of rulesets.
     */
    makeRulesets: function(todo,scope) {
        var out = {};
        for(var name in todo) {
            out[name] = jme.variables.computeRuleset(name,todo,scope,[]);
        }
        return out;
    },
    /** Given a todo dictionary of variables, return a dictionary with only the variables depending on the given list of variables.
     *
     * @param {object} todo - Dictionary of variables mapped to their definitions.
     * @param {string[]} ancestors - List of variable names whose dependants we should find.
     * @returns {object} - A copy of the todo list, only including the dependants of the given variables.
     */
    variableDependants: function(todo,ancestors) {
        // a dictionary mapping variable names to lists of names of variables they depend on
        var dependants = {};
        /** Find the names of the variables this variable depends on.
         *
         * @param {string} name - The name of the variable to consider.
         * @param {Array.<string>} path - The chain of variables that have led to the one being considered, used to detect circular references.
         * @returns {Array.<string>} - The names of the variables this one depends on.
         */
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
                var ancestor = ancestors[i].toLowerCase()
                if(dependants[name].contains(ancestor)) {
                    out[name] = todo[name];
                    break;
                }
            }
        }
        return out;
    },
    /** Substitute variables into a DOM element (works recursively on the element's children).
     *
     * Ignores iframes and elements with the attribute `nosubvars`.
     *
     * @param {Element} element
     * @param {Numbas.jme.Scope} scope
     * @see Numbas.jme.variables.DOMcontentsubber
     */
    DOMcontentsubvars: function(element, scope) {
        var subber = new DOMcontentsubber(scope);
        subber.subvars(element);
    },
    /** Substitute variables into the contents of a text node. Substituted values might contain HTML elements, so the return value is a collection of DOM elements, not another string.
     *
     * @param {string} str - The contents of the text node.
     * @param {Numbas.jme.Scope} scope
     * @param {Document} doc - The document the text node belongs to.
     * @returns {Node[]} - Array of DOM nodes to replace the string with.
     */
    DOMsubvars: function(str,scope,doc) {
        doc = doc || document;
        var bits = util.splitbrackets(str,'{','}','(',')');
        if(bits.length==1) {
            return [doc.createTextNode(str)];
        }
        /** Get HTML content for a given JME token.
         *
         * @param {Numbas.jme.token} token
         * @returns {Element|string}
         */
        function doToken(token) {
            switch(token.type){
            case 'html':
                return token.value;
            case 'string':
                var html = token.value.replace(/\\([{}])/g,'$1');
                if(token.latex) {
                    html = '\\('+html+'\\)';
                }
                return html;
            case 'list':
                return '[ '+token.value.map(function(item){return doToken(item)}).join(', ')+' ]';
            default:
                return jme.tokenToDisplayString(token);
            }
        }
        var out = [];
        for(var i=0; i<bits.length; i++)
        {
            if(i % 2)
            {
                var v = jme.evaluate(jme.compile(bits[i],scope),scope);
                if(v===null) {
                    throw(new Numbas.Error('jme.subvars.null substitution',{str:bits[i]}));
                }
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
                d = doc.importNode(d,true);
                out[i] = $(d).contents();
            }
        }
        return out;
    }
};

/** An object which substitutes JME values into HTML.
 * JME expressions found inside text nodes are evaluated with respect to the given scope.
 *
 * @param {Numbas.jme.Scope} scope
 * @memberof Numbas.jme.variables
 * @class
 */
var DOMcontentsubber = Numbas.jme.variables.DOMcontentsubber = function(scope) {
    this.scope = scope;
    this.re_end = undefined;

    this.IGNORE_TAGS = ['iframe','script','style'];
}
DOMcontentsubber.prototype = {
    /** Substitute JME values into the given element and any children.
     *
     * @param {Element} element
     */
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
        var tagName = element.tagName.toLowerCase();
        if(this.IGNORE_TAGS.indexOf(tagName)>=0) {
            return element;
        } else if(element.hasAttribute('nosubvars')) {
            return element;
        } else if(tagName=='img') {
            if(element.getAttribute('src').match(/.svg$/i)) {
                element.parentElement
                var object = element.ownerDocument.createElement('object');
                for(var i=0;i<element.attributes.length;i++) {
                    var attr = element.attributes[i];
                    if(attr.name!='src') {
                        object.setAttribute(attr.name,attr.value);
                    }
                }
                object.setAttribute('type','image/svg+xml');
                object.setAttribute('data',element.getAttribute('src'));
                element.parentElement.replaceChild(object,element);
                subber.sub_element(object);
                return;
            }
        } else if(tagName=='object') {
            /** Substitute content into the object's root element.
             */
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
                if(element.parentElement) {
                    element.parentElement.removeChild(element);
                }
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
    },

    /** Find all variables which would be used when substituting into the given element.
     *
     * @param {Element} element
     * @returns {Array.<string>}
     */
    findvars: function(element) {
        switch(element.nodeType) {
            case 1: //element
                return this.findvars_element(element);
            case 3: //text
                return this.findvars_text(element);
            default:
                return [];
        }
    },

    findvars_element: function(element) {
        var subber = this;
        var scope = this.scope;
        var tagName = element.tagName.toLowerCase();
        if(this.IGNORE_TAGS.indexOf(tagName)>=0) {
            return [];
        } else if(element.hasAttribute('nosubvars')) {
            return [];
        } else if(tagName=='img') {
            return [];
        } else if(tagName=='object') {
            if(element.contentDocument && element.contentDocument.rootElement) {
                return this.findvars_element(element.contentDocument.rootElement);
            }
            return;
        }
        var foundvars = [];
        if(element.hasAttribute('data-jme-visible')) {
            var condition = element.getAttribute('data-jme-visible');
            try {
                var tree = scope.parser.compile(condition);
            } catch(e) {
                return [];
            }
            foundvars = foundvars.merge(jme.findvars(tree));
        }
        for(var i=0;i<element.attributes.length;i++) {
            var m;
            var attr = element.attributes[i];
            if(m = attr.name.match(/^eval-(.*)/)) {
                try {
                    var tree = scope.parser.compile(attr.value);
                } catch(e) {
                    continue;
                }
                foundvars = foundvars.merge(jme.findvars(tree));
            }
        }
        var subber = this;
        var o_re_end = this.re_end;
        $(element).contents().each(function() {
            var vars = subber.findvars(this);
            if(vars.length) {
                foundvars = foundvars.merge(vars);
            }
        });
        this.re_end = o_re_end; // make sure that any maths environment only applies to children of this element; otherwise, an unended maths environment could leak into later tags
        return foundvars;
    },

    findvars_text: function(node) {
        var scope = this.scope;
        var foundvars = [];
        var str = node.nodeValue;
        var bits = util.contentsplitbrackets(str,this.re_end);    //split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
        this.re_end = bits.re_end;
        for(var i=0; i<bits.length; i+=4) {
            var tbits = util.splitbrackets(bits[i],'{','}','(',')');
            for(var j=1;j<tbits.length;j+=2) {
                try {
                    var tree = scope.parser.compile(tbits[j]);
                } catch(e) {
                    continue;
                }
                foundvars = foundvars.merge(jme.findvars(tree));
            }
            var tex = bits[i+2] || '';
            var texbits = jme.texsplit(tex);
            for(var j=3;j<texbits.length;j+=4) {
                try {
                    var tree = scope.parser.compile(texbits[j]);
                } catch(e) {
                    continue;
                }
                foundvars = foundvars.merge(jme.findvars(tree));
            }
        }
        return foundvars;
    }
}
});

Numbas.queueScript('jme-calculus',['jme-base','jme-rules'],function() {
/** @file Code to do with differentiation and integration
 *
 * Provides {@link Numbas.jme.calculus}
 */

var jme = Numbas.jme;
var TNum = Numbas.jme.types.TNum;

/** @namespace Numbas.jme.calculus */
var calculus = jme.calculus = {};

var differentiation_rules = [
    ['$n','0'],
    ['?;a + ?`+;b','$diff(a) + $diff(b)'],
    ['?;a - ?`+;b','$diff(a) - $diff(b)'],
    ['+?;a','$diff(a)'],
    ['-?;a','-$diff(a)'],
    ['?;u / ?;v', '(v*$diff(u) - u*$diff(v))/v^2'],
    ['?;u * ?;v','u*$diff(v) + v*$diff(u)'],
    ['e^?;p', '$diff(p)*e^p'],
    ['(`+-$n);a ^ ?;b', 'ln(a) * $diff(b) * a^b'],
    ['?;a^(`+-$n);p','p*$diff(a)*a^(p-1)'],
];
/** Rules for differentiating parts of expressions.
 *
 * Occurrences of the function `$diff` in the result expression have differentiation applied with respect to the same variable.
 *
 * @type {object.<Numbas.jme.rules.Rule>}
 */
calculus.differentiation_rules = differentiation_rules.map(function(r) {
    return new Numbas.jme.rules.Rule(r[0],r[1],'acgs');
});

/** Standard derivatives of functions of one variable.
 * 
 * {@link Numbas.jme.calculus.differentiate} replaces `x` in these expressions with the argument of the function, and applies the chain rule.
 *
 * @type {object.<Numbas.jme.tree>}
 */
calculus.derivatives = {
    'cos': '-sin(x)',
    'sin': 'cos(x)',
    'e': 'e^x',
    'ln': '1/x',
    'log': '1/(ln(10)*x)',
    'tan': 'sec(x)^2',
    'cosec': '-cosec(x)*cot(x)',
    'sec': 'sec(x)*tan(x)',
    'cot': '-cosec(x)^2',
    'arcsin': '1/sqrt(1-x^2)',
    'arccos': '-1/sqrt(1-x^2)',
    'arctan': '1/(1+x^2)',
    'cosh': 'sinh(x)',
    'sinh': 'cosh(x)',
    'tanh': 'sech(x)^2',
    'sech': '-sech(x)*tanh(x)',
    'cosech': '-cosech(x)*coth(x)',
    'coth': '-cosech(x)^2',
    'arccosh': '1/sqrt(x^2-1)',
    'arcsinh': '1/sqrt(x^2+1)',
    'arctanh': '1/(1-x^2)',
    'sqrt': '1/(2*sqrt(x))'
};

for(var x in calculus.derivatives) {
    calculus.derivatives[x] = jme.compile(calculus.derivatives[x]);
}

/** Functions that differentiation distributes over.
 *
 * i.e. d/dx f(a, b, ...) = f(da/dx, db/dx, ...)
 *
 * @type {object.<boolean>}
 */
calculus.distributing_derivatives = {
    'vector': true,
    'matrix': true,
    'rowvector': true,

}

var function_derivative_rule = new jme.rules.Rule('m_func(?;f,?;a)','$diff(m_listval(a,0))*standard_derivative(f,m_listval(a,0))');

/** Differentiate the given expression with respect to the given variable name.
 *
 * @param {Numbas.jme.tree} tree
 * @param {string} x
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.tree}
 */
var differentiate = calculus.differentiate = function(tree,x,scope) {
    /** Apply differentiation to the given tree.
     *
     * @param {Numbas.jme.tree} tree
     * @returns {Numbas.jme.tree}
     */
    function apply_diff(tree) {
        if(jme.isFunction(tree.tok,'$diff')) {
            var res = base_differentiate(tree.args[0]);
            return res;
        } else if(jme.isFunction(tree.tok,'standard_derivative')) {
            var name = tree.args[0].tok.value;
            var derivative = calculus.derivatives[name];
            var arg = apply_diff(tree.args[1]);
            var scope = new jme.Scope({variables: {x: arg}});
            return jme.substituteTree(derivative,scope);
        }
        if(tree.args) {
            var args = tree.args.map(apply_diff);
            return {tok: tree.tok, args: args};
        }
        return tree;
    }

    /** Apply base_differentiation over all the tree's arguments, but don't look at the root token.
     *
     * @param {Numbas.jme.tree} tree
     * @returns {Numbas.jme.tree}
     */
    function distribute_differentiation(tree) {
        var nargs = tree.args.map(base_differentiate);
        return {tok: tree.tok, args: nargs};
    }

    /** Apply differentiation to the given tree.
     * First look at the type of the root token, then see if the tree matches any of the differentiation rules.
     *
     * @see Numbas.jme.calculus.differentiation_rules
     * @param {Numbas.jme.tree} tree
     * @returns {Numbas.jme.tree}
     */
    function base_differentiate(tree) {
        var tok = tree.tok;

        switch(tok.type) {
        case 'number':
            return {tok: new TNum(0)};
        case 'name':
            return {tok: new TNum(tok.name==x ? 1 : 0)};
        case 'list':
            if(tree.args) {
                return distribute_differentiation(tree);
            } else {
                return {tok: new jme.types.TList(tree.tok.value.map(function(v) { return new TNum(0); }))};
            }
        case 'expression':
            return base_differentiate(tok.tree);
        case 'op':
        case 'function':
            if(tree.args.length==1 && tok.name in calculus.derivatives) {
                var res = function_derivative_rule.replace(tree,scope);
                return apply_diff(res.expression);
            }
            if(calculus.distributing_derivatives[tok.name]) {
                return distribute_differentiation(tree);
            }
            break;
        }


        for(var i=0;i<calculus.differentiation_rules.length;i++) {
            var result = calculus.differentiation_rules[i].replace(tree,scope);
            if(result.changed) {
                var res = apply_diff(result.expression);
                return res;
            }
        }

        throw(new Numbas.Error("jme.calculus.unknown derivative",{tree: jme.display.treeToJME(tree)}));
    }

    return base_differentiate(tree);
}

});

