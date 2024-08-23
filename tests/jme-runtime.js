// Compiled using runtime/scripts/numbas.js runtime/scripts/localisation.js runtime/scripts/util.js runtime/scripts/math.js runtime/scripts/i18next/i18next.js runtime/scripts/decimal/decimal.js runtime/scripts/parsel/parsel.js runtime/scripts/unicode-mappings.js runtime/scripts/jme-rules.js runtime/scripts/jme.js runtime/scripts/jme-builtins.js runtime/scripts/jme-display.js runtime/scripts/jme-variables.js runtime/scripts/jme-calculus.js
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
    const _globalThis = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    if(typeof window == 'undefined') {
        window = _globalThis.window = _globalThis;
        _globalThis.alert = function(m) { console.error(m); }
    }
    if(!_globalThis.Numbas) { _globalThis.Numbas = {} }

/** @namespace Numbas */
/** Extensions should add objects to this so they can be accessed */
Numbas.extensions = {};
/** A function for displaying debug info in the console. It will try to give a reference back to the line that called it, if it can.
 *
 * @param {string} msg - Text to display.
 * @param {boolean} [noStack=false] - Don't show the stack trace.
 * @param {Error} error
 */
Numbas.debug = function(msg,noStack,error)
{
    if(window.console)
    {
        var e = new Error(msg);
        if(e.stack && !noStack)
        {
            var words= e.stack.split('\n')[2];
            if(error) {
                console.error(msg,error);
            } else {
                console.error(msg," "+words);
            }
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
    Numbas.debug(message,false,e);
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
    var e = new Error();
    e.name = "Numbas Error";
    e.message = _globalThis.R && R.apply(e,[message,args]);
    e.originalMessage = message;
    e.originalMessages = [message];
    if(originalError!==undefined) {
        e.originalError = originalError;
        if(originalError.originalMessages) {
            e.originalMessages = e.originalMessages.concat(originalError.originalMessages.filter(function(m){return m!=message}));
        }
    }
    return e;
}

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
                    var module = { exports: {} };
                    this.callback.apply(window,[module]);
                    for(var x in module.exports) {
                        window[x] = module.exports[x];
                        if(typeof global!=='undefined') {
                            global[x] = module.exports[x];
                        }
                    }
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

var extension_callbacks = {};
/** A wrapper round {@link Numbas.queueScript} to register extensions easily.
 * The extension is not run immediately - call {@link Numbas.activateExtension} to run the extension.
 *
 * @param {string} name - Unique name of the extension.
 * @param {Array.<string>} deps - A list of other scripts which need to be run before this one can be run.
 * @param {Function} callback - Code to set up the extension. It's given the object `Numbas.extensions.<name>` as a parameter, which contains a {@link Numbas.jme.Scope} object.
 */
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

/** 
 * Get the URL of a standalone file from an extension.
 *
 * @param {string} extension - The name of the extension.
 * @param {string} path - The path to the script, relative to the extension's `standalone_scripts` folder.
 * @returns {string}
 */
Numbas.getStandaloneFileURL = function(extension, path) {
    return 'extensions/'+extension+'/standalone_scripts/'+path;
}

/** 
 * Load a standalone script from an extension.
 * Inserts a <script> tag into the page's head.
 *
 * @param {string} extension - The name of the extension.
 * @param {string} path - The path to the script, relative to the extension's `standalone_scripts` folder.
 */
Numbas.loadStandaloneScript = function(extension, path) {
    var script = document.createElement('script');
    script.setAttribute('src',Numbas.getStandaloneFileURL(extension, path));
    document.head.appendChild(script);
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
 * @type {Object<string>}
 */

/** Marking scripts for the built-in part types.
 *
 * @name marking_scripts
 * @memberof Numbas
 * @type {Object<Numbas.marking.MarkingScript>}
 */

Numbas.queueScript('localisation',['i18next','localisation-resources'],function(module) {
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
    module.exports.R = function(){{ return i18next.t.apply(i18next,arguments) }};

    var plain_en = ['plain','en','si-en'];
    var plain_eu = ['plain-eu','eu','si-fr'];
    Numbas.locale.default_number_notations = {
        'ar-SA': plain_en,
        'en-GB': plain_en,
        'de-DE': plain_eu,
        'es-ES': plain_eu,
        'fr-FR': plain_eu,
        'he-IL': plain_en,
        'in-ID': plain_eu,
        'it-IT': plain_eu,
        'ja-JP': plain_en,
        'ko-KR': plain_en,
        'nb-NO': plain_eu,
        'nl-NL': plain_eu,
        'pl-PL': plain_eu,
        'pt-BR': plain_eu,
        'sq-AL': plain_eu,
        'sv-SR': plain_eu,
        'tr-TR': plain_eu,
        'vi-VN': plain_eu,
        'zh-CN': plain_en
    }

    Numbas.locale.default_list_separators = {
        'ar-SA': ',',
        'en-GB': ',',
        'de-DE': ';',
        'es-ES': ';',
        'fr-FR': ';',
        'he-IL': ',',
        'in-ID': ';',
        'it-IT': ';',
        'ja-JP': ',',
        'ko-KR': ',',
        'nb-NO': ';',
        'nl-NL': ';',
        'pl-PL': ';',
        'pt-BR': ';',
        'sq-AL': ';',
        'sv-SR': ';',
        'tr-TR': ';',
        'vi-VN': ';',
        'zh-CN': ','
    };

    Numbas.locale.set_preferred_locale = function(locale) {
        Numbas.locale.preferred_locale = locale;
        Numbas.locale.default_number_notation = Numbas.locale.default_number_notations[Numbas.locale.preferred_locale] || plain_en;
        Numbas.locale.default_list_separator = Numbas.locale.default_list_separators[Numbas.locale.preferred_locale] || ',';
    }

    Numbas.locale.set_preferred_locale(Numbas.locale.preferred_locale);
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
Numbas.queueScript('util',['base', 'math', 'parsel'],function() {
/** @namespace Numbas.util */
var util = Numbas.util = /** @lends Numbas.util */ {
    /** Run the given function when the document is ready.
     *
     * @param {Function} fn
     */
    document_ready: function(fn) {
        if(document.readyState == 'complete') {
            setTimeout(fn, 1);
        } else {
            document.addEventListener('readystatechange', function(e) {
                if(document.readyState == 'complete') {
                    setTimeout(fn, 1);
                }
            });
        }
    },

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
        var c = function() {
            a.apply(this,arguments);
            return b.apply(this,arguments);
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
    /** Extend `destination` with all the properties from subsequent arguments, and recursively extend objects that both properties have under the same key.
     *
     * @param {object} destination
     * @returns {object}
     */
    deep_extend_object: function(destination) {
        for(var i=1; i<arguments.length; i++) {
            const arg = arguments[i];
            for(let key of Object.keys(arg)) {
                if(arg[key] === undefined) {
                    continue;
                }
                if(typeof arg[key] === 'object' && typeof destination[key] === 'object') {
                    util.deep_extend_object(destination[key], arg[key]);
                } else {
                    destination[key] = arg[key];
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
            return d.textContent.trim().length>0 || d.querySelector('img,iframe,object');
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
    re_fraction: /^\s*(-?)\s*(\d+)\s*\/\s*(-?)\s*(\d+)\s*/,

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
     * @param {string} [syntax="plain"] - The syntax to use, either "plain" for plain text, or "latex", for LaTeX.
     * @returns {string}
     */
    formatNumberNotation: function(s, style, syntax) {
        var match_neg = /^(-)?(.*)/.exec(s);
        var minus = match_neg[1] || '';
        var bits = match_neg[2].split('.');
        var integer = bits[0];
        var decimal = bits[1];
        var style = util.numberNotationStyles[style];
        syntax = syntax || 'plain';
        if(!style.format[syntax]) {
            throw(new Error('util.formatNumberNotation.unrecognised syntax', {syntax: syntax}));
        }
        var formatted = style.format[syntax](integer,decimal);
        return minus + formatted;
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
        n = (!!m[1] ^ !!m[3]) ? -n : n;
        var d = parseInt(m[4]);
        return {numerator:n, denominator:d};
    },

    /** Transform the given string to one containing only letters, digits and hyphens.
     * @param {string} str
     * @returns {string}
     */
    slugify: function(str) {
        if (str === undefined){
            return '';
        }
        return (str + '').replace(/\s+/g,'-').replace(/[^a-zA-Z0-9\-]/g,'').replace(/-+/g,'-');
        
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
        return out;
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
                break;
            }
        }
        return out;
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
    },

    /** Encode the contents of an ArrayBuffer in base64.
     *
     * @param {ArrayBuffer} arrayBuffer
     * @returns {string}
     */
    b64encode: function (arrayBuffer) {
        return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    },

    /** Decode a base64 string to an ArrayBuffer.
     *
     * @param {string} encoded
     * @returns {ArrayBuffer}
     */
    b64decode: function (encoded) {
        let byteString = atob(encoded);
        const bytes = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            bytes[i] = byteString.charCodeAt(i);
        }
        return bytes.buffer;
    },

    /** Compare two strings, ignoring differences in case.
     * Does not ignore differences in accent, even where
     * base characters are identical
    *
    * @param {string} a - reference string
    * @param {string} b - comparison string
    * @returns {boolean}
    */
    caselessCompare: function (a,b) {
        return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
    },

    /** Prefix every selector in the given CSS stylesheet with the given selector.
     *
     * @param {StyleElement} sheet
     * @param {string} prefix - A CSS selector.
     */
    prefix_css_selectors: function(style, prefix) {
        const sheet = style.sheet;
        const prefix_tokens = parsel.tokenize(prefix);
        const space_token = {"type": "combinator","content": " "};
        prefix_tokens.push(space_token);

        function visit_rule(rule) {
            if(rule instanceof CSSStyleRule) {
                const tokens = parsel.tokenize(rule.selectorText);
                tokens.splice(0,0,...prefix_tokens);
                for(let i=0;i<tokens.length;i++) {
                    if(tokens[i].type=='comma') {
                        tokens.splice(i+1,0, space_token, ...prefix_tokens);
                        i += prefix_tokens.length + 1;
                    }
                }
                rule.selectorText = parsel.stringify(tokens);
            }

            if(rule.cssRules) {
                for(let r of rule.cssRules) {
                    visit_rule(r);
                }
            }
        }

        for(let rule of sheet.cssRules) {
            visit_rule(rule);
        }

        style.textContent = Array.from(style.sheet.cssRules).map(function(r) { return r.cssText; }).join('\n');
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
        format: {
            plain: function(integer,decimal) {
                if(decimal) {
                    return integer+'.'+decimal;
                } else {
                    return integer;
                }
            },
            latex: function(integer,decimal) {
                if(decimal) {
                    return integer+'.'+decimal;
                } else {
                    return integer;
                }
            }
        }
    },
    // English style - commas separate thousands, dot for decimal point
    'en': {
        re: /^(\d{1,3}(?:,\d{3})*)(\x2E\d+)?/,
        format: {
            plain: util.standardNumberFormatter(',','.'),
            latex: util.standardNumberFormatter('{,}','.')
        }
    },
    // English SI style - spaces separate thousands, dot for decimal point
    'si-en': {
        re: /^(\d{1,3}(?: +\d{3})*)(\x2E(?:\d{3} )*\d{1,3})?/,
        format: {
            plain: util.standardNumberFormatter(' ','.',true),
            latex: util.standardNumberFormatter('\\,','.',true)
        }
    },
    // French SI style - spaces separate thousands, comma for decimal point
    'si-fr': {
        re: /^(\d{1,3}(?: +\d{3})*)(,(?:\d{3} )*\d{1,3})?/,
        format: {
            plain: util.standardNumberFormatter(' ',',',true),
            latex: util.standardNumberFormatter('\\,','{,}',true)
        }
    },
    // Continental European style - dots separate thousands, comma for decimal point
    'eu': {
        re: /^(\d{1,3}(?:\x2E\d{3})*)(,\d+)?/,
        format: {
            plain: util.standardNumberFormatter('.',','),
            latex: util.standardNumberFormatter('.\\,','{,}')
        }
    },
    // Plain French style - no thousands separator, comma for decimal point
    'plain-eu': {
        re: /^([0-9]+)(,[0-9]+)?/,
        format: {
            plain: function(integer,decimal) {
                if(decimal) {
                    return integer+','+decimal;
                } else {
                    return integer;
                }
            },
            latex: function(integer,decimal) {
                if(decimal) {
                    return integer+'{,}'+decimal;
                } else {
                    return integer;
                }
            }
        }
    },
    // Swiss style - apostrophes separate thousands, dot for decimal point
    'ch': {
        re: /^(\d{1,3}(?:'\d{3})*)(\x2E\d+)?/,
        format: {
            plain: util.standardNumberFormatter('\'','.'),
            latex: util.standardNumberFormatter('\'','.')
        }
    },
    // Indian style - commas separate groups, dot for decimal point. The rightmost group is three digits, other groups are two digits.
    'in': {
        re: /^((?:\d{1,2}(?:,\d{2})*,\d{3})|\d{1,3})(\x2E\d+)?/,
        format: {
            plain: function(integer,decimal) {
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
            },
            latex: function(integer,decimal) {
                integer = integer+'';
                if(integer.length>3) {
                    var over = (integer.length-3)%2
                    var out = integer.slice(0,over);
                    var i = over;
                    while(i<integer.length-3) {
                        out += (out ? '{,}' : '')+integer.slice(i,i+2);
                        i += 2;
                    }
                    integer = out+'{,}'+integer.slice(i);
                }
                if(decimal) {
                    return integer+'.'+decimal;
                } else {
                    return integer;
                }
            }
        }
    },
    // Significand-exponent ("scientific") style
    'scientific': {
        re: /^(\d[ \d]*)(\x2E\d[ \d]*)?\s*[eE]\s*([\-+]?\d[ \d]*)/,
        clean: function(m) {
            return Numbas.math.unscientific(m[0]);
        },
        format: {
            plain: function(integer, decimal) {
                return Numbas.math.niceRealNumber(parseFloat(integer+'.'+decimal),{style:'scientific'});
            },
            latex: function(integer, decimal) {
                return Numbas.math.niceRealNumber(parseFloat(integer+'.'+decimal),{style:'scientific', syntax: 'latex'});
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
    if(txt===undefined) {
        return [''];
    }
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

if (!Date.prototype.toISOString) {
  (function() {

    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }

    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
    };

  }());
}

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
        if(!a.complex && a<0 && b%2==1) {
            return -math.root(-a,b);
        }
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

        if(a.complex || b.complex) {
            return math.abs(math.sub(a,b)) < abs_tol;
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

    is_scalar_multiple: function(u, v, rel_tol,abs_tol) {
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
            }
            else if (v[i] == 0 || u[i] == 0) {
                return false;
            }
            else {
                first_ratio = u[i] / v[i];
                break;
            }
        }
        for (; i < n; i++) {
            if (v[i] == 0 && u[i] == 0) {
                continue;
            }
            else if (v[i] == 0 || u[i] == 0) {
                return false;
            }
            else {
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
     * @param {Function} [maxfn=Numbas.math.max] - A function which returns the maximum of two values.
     * @returns {number}
     */
    listmax: function(numbers, maxfn) {
        if(numbers.length==0) {
            return undefined;
        }
        maxfn = maxfn || math.max;
        var best = numbers[0];
        for(var i=1;i<numbers.length;i++) {
            best = maxfn(best,numbers[i]);
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
     * @param {Function} [minfn=Numbas.math.min] - A function which returns the minimum of two values.
     * @returns {number}
     */
    listmin: function(numbers, minfn) {
        if(numbers.length==0) {
            return undefined;
        }
        minfn = minfn || math.min;
        var best = numbers[0];
        for(var i=1;i<numbers.length;i++) {
            best = minfn(best,numbers[i]);
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
    niceRealNumber: function(n,options) {
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
                var precision = Math.min(options.precision, MAX_FLOAT_PRECISION);
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
    niceNumber: function(n,options) {
        options = options || {};
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(n.complex)
        {
            var imaginary_unit = options.imaginary_unit || 'i';
            var re = math.niceNumber(n.re,options);
            var im = math.niceNumber(n.im,options);
            if(math.precround(n.im,10)==0)
                return re+'';
            else if(math.precround(n.re,10)==0)
            {
                if(n.im==1)
                    return imaginary_unit;
                else if(n.im==-1)
                    return '-'+imaginary_unit;
                else
                    return im+'*'+imaginary_unit;
            }
            else if(n.im<0)
            {
                if(n.im==-1)
                    return re+' - '+imaginary_unit;
                else
                    return re+im+'*'+imaginary_unit;
            }
            else
            {
                if(n.im==1)
                    return re+' + '+imaginary_unit;
                else
                    return re+' + '+im+'*'+imaginary_unit;
            }
        }
        else
        {
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
            if(options.precisionType === undefined && (piD = math.piDegree(n,false)) > 0)
                n /= Math.pow(Math.PI*circle_constant_scale,piD);
            var out = math.niceRealNumber(n,options);
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
        var style = options.style || Numbas.locale.default_number_notation[0];
        if(options.style=='scientific') {
            var e = n.toExponential(options.precision);
            var m = e.match(/^(-?\d(?:\.\d+)?)(e[+\-]\d+)$/);
            var significand = Numbas.util.formatNumberNotation(m[1],Numbas.locale.default_number_notation[0]);
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
                out = Numbas.util.formatNumberNotation(out,style);
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
        var arr = new Array(l.length);
        for(var i=0;i<l.length;i++) {
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
    reorder: function(list,order) {
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
        for(var i=1;i<lists.length;i++) {
            if(lists[i].length!=len) {
                throw(new Numbas.Error("math.shuffle_together.lists not all the same length"));
            }
        }
        var order = math.deal(len);
        return lists.map(function(list) {
            return math.reorder(list,order);
        });
    },

    /** A random partition of the integer `n` into `k` non-zero parts.
     *
     * @param {number} n
     * @param {number} k
     * @returns {Array.<number>} - A list of `k` numbers whose sum is `n`.
     */
    random_integer_partition: function(n,k) {
        if(k>n || k<1) {
            throw(new Numbas.Error("math.random_integer_partition.invalid k",{n:n,k:k}));
        }
        var shuffle = [];
        for(var i=0;i<k-1;i++) {
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
        shuffle = shuffle.slice(0,k-1);
        shuffle.sort(function(a,b) {
            return a<b ? -1 : a>b ? 1 : 0;
        });
        var partition = [];
        var last = 0;
        for(var i=0;i<k-1;i++) {
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
            b = Math.min(b,MAX_FLOAT_PRECISION);
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
     * @param {boolean} [parse=true] - Parse the significand and exponent values to numbers, or leave them as strings?
     * @returns {object} `{significand: number, exponent: number}` if `parse` is true, or `{significand: string, exponent: string}`
     */
    parseScientific: function(str, parse) {
        var m = /(-?\d[ \d]*(?:\.\d[ \d]*)?)e([\-+]?\d[ \d]*)/i.exec(str);
        var significand = m[1].replace(/ /g,'');
        var exponent = m[2].replace(/ /g,'').replace(/^\+/,'');
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
            if(math.isclose(a,0)) {
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
    /**
     * Calculate the significant figures precision of a number.
     *
     * @param {number|string} n - if a string, only the "plain" number format or scientific notation is expected. Strings representing numbers should be cleaned first, using `Numbas.util.cleanNumber`.
     * @param {boolean} [max] - Be generous with calculating sig. figs. for whole numbers. e.g. '1000' could be written to 4 sig figs.
     * @returns {number}
     */
    countSigFigs: function(n,max) {
        n += '';
        var m;
        if(max) {
            m = n.match(/^-?(?:(\d0*)$|(?:([1-9]\d*[1-9]0*)$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)\s*[Ee]\s*[+\-]?\d+)$)/i);
        } else {
            m = n.match(/^-?(?:(\d)0*$|(?:([1-9]\d*[1-9])0*$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)\s*[Ee]\s*[+\-]?\d+)$)/i);
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
    toGivenPrecisionScientific(n,precisionType,precision) {
        if(precisionType=='none') {
            return true;
        }
        n += '';
        var m = math.re_scientificNumber.exec(n);
        if(!m) {
            return false;
        }
        return math.toGivenPrecision(m[1],'dp',precision+(precisionType=='sigfig' ? -1 : 0),true);
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
    /** Angle between x-axis and the line through the origin and `(x,y)`.
     *
     * @param {number} y
     * @param {number} x
     * @returns {number}
     */
    atan2: function(y,x) {
        if(y.complex) {
            y = y.re;
        }
        if(x.complex) {
            x = x.re;
        }
        return Math.atan2(y,x);
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
            return math.complex(math.trunc(x.re, p),math.trunc(x.im, p));
        }
        p = Math.pow(10, p || 0);
        if(x>0) {
            return  Math.floor(x * p) / p;
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
    /** Choose at random from a weighted list of items.
     * 
     * @param {Array} list - A list of pairs of the form `[item, probability]`, where `probability` is a number.
     * @returns {*}
     * @throws {Numbas.Error} "math.choose.empty selection" if `selection` has length 0.
     */
    weighted_random: function(list) {
        var total = 0;
        for (var i = 0; i < list.length; i++) {
            var p = list[i][1];
            total += p > 0 ? p : 0;
        }
        if(total==0) {
            throw(new Numbas.Error('math.choose.empty selection'));
        }
        var target = Math.random() * total;
        var acc = 0;
        for (var i = 0; i < list.length; i++) {
            var p = list[i][1];
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
        if(a.complex || b.complex) {
            throw(new Numbas.Error('math.gcf.complex'));
        }
        if(Math.floor(a)!=a || Math.floor(b)!=b || Math.abs(a)==Infinity || Math.abs(b)==Infinity) {
            return 1;
        }
        a = Math.floor(Math.abs(a));
        b = Math.floor(Math.abs(b));
        var c=0;
        if(a<b) { c=a; a=b; b=c; }
        if(b==0){return a;}
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
        return math.rangeToDecimalList(range).map(x => x.toNumber());
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
        for (var i=0; i < exponents.length; i++) {
            var divisor_arr_copy = [];
            for (var j=0; j<=exponents[i]; j++) {
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
        var factors = math.factorise(n).map(function(f) { return f-f%2; });
        var t = 1;
        factors.forEach(function(f,i) {
            t *= Math.pow(math.primes[i],f);
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
    if(denominator<0) {
        numerator = -numerator;
        denominator = -denominator;
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
        var g = math.gcd(this.numerator,this.denominator);
        this.numerator /= g;
        this.denominator /= g;
    },

    /** Returns a copy of this fraction reduced to lowest terms.
     *
     * @returns {Numbas.math.Fraction}
     */
    reduced: function() {
        var f = new Fraction(this.numerator,this.denominator);
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
        return new Fraction(Math.pow(numerator,n), Math.pow(denominator,n));
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
Fraction.common_denominator = function(fractions) {
    var d = 1;
    fractions.forEach(function(f) {
        d = math.lcm(d,f.denominator);
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
    for(var i=1;i<commons.length;i++) {
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
    for(var i=1;i<commons.length;i++) {
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
var isComplexDecimal = math.isComplexDecimal = function(n) {
    return n instanceof ComplexDecimal;
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
        return new ComplexDecimal(re,im);
    },

    dividedBy: function(b) {
        b = ensure_decimal(b);
        if(b.isZero()) {
            return new ComplexDecimal(new Decimal(NaN), new Decimal(0));
        }
        var q = b.re.times(b.re).plus(b.im.times(b.im));
        var re = this.re.times(b.re).plus(this.im.times(b.im)).dividedBy(q);
        var im = this.im.times(b.re).minus(this.re.times(b.im)).dividedBy(q);
        return new ComplexDecimal(re,im);
    },

    pow: function(b) {
        b = ensure_decimal(b);
        if(this.isReal() && b.isReal()) {
            if(this.re.greaterThanOrEqualTo(0) || b.re.isInt()) {
                return new ComplexDecimal(this.re.pow(b.re),new Decimal(0));
            } else if(b.re.times(2).isInt()) {
                return new ComplexDecimal(new Decimal(0), this.re.negated().pow(b.re));
            }
        }
        var ss = this.re.times(this.re).plus(this.im.times(this.im));
        var arg1 = Decimal.atan2(this.im,this.re);
        var mag = ss.pow(b.re.dividedBy(2)).times(Decimal.exp(b.im.times(arg1).negated()));
        var arg = b.re.times(arg1).plus(b.im.times(Decimal.ln(ss)).dividedBy(2));
        return new ComplexDecimal(mag.times(arg.cos()), mag.times(arg.sin()));
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

    reciprocal: function() {
        var denominator = this.re.pow(2).add(this.im.pow(2));
        return new ComplexDecimal(this.re.dividedBy(denominator), this.im.dividedBy(denominator));
    },

    absoluteValue: function() {
        return new ComplexDecimal(this.re.times(this.re).plus(this.im.times(this.im)).squareRoot());
    },

    argument: function() {
        return new ComplexDecimal(Decimal.atan2(this.im,this.re));
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

ComplexDecimal.min = function(a,b) {
    if(!(a.isReal() && b.isReal())) {
        throw(new Numbas.Error('math.order complex numbers'));
    }
    return new ComplexDecimal(Decimal.min(a.re,b.re));
}
ComplexDecimal.max = function(a,b) {
    if(!(a.isReal() && b.isReal())) {
        throw(new Numbas.Error('math.order complex numbers'));
    }
    return new ComplexDecimal(Decimal.max(a.re,b.re));
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
    /** Returns number of row in a matrix.
     * 
     * @param {matrix} m
     * @returns {number}
     */
    numrows: function(m){
        return m.rows;
    },
    /** Returns number of columns in a matrix.
     * 
     * @param {matrix} m
     * @returns {number}
     */
    numcolumns: function(m){
        return m.columns;
    },
    /** Combine two matrices vertically.
     * 
     * @param {matrix} m1
     * @param {matrix} m2
     * @returns {matrix}
     */
    combine_vertically: function(m1,m2){
        var out = [];
        out.rows = m1.rows + m2.rows;
        out.columns = m1.columns > m2.columns ? m1.columns : m2.columns;
        for(var i = 0; i < out.rows; i++){
            var row = [];
            out.push(row);
            for(var j = 0; j < out.columns; j++)
            {
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
    combine_horizontally: function(m1,m2){
        var out = [];
        out.columns = m1.columns + m2.columns;
        out.rows = m1.rows > m2.rows ? m1.rows : m2.rows;
        for(var i = 0; i < out.rows; i++){
            var row = [];
            out.push(row);
            for(var j = 0; j < out.columns; j++)
            {
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
    combine_diagonally: function(m1,m2){
        var out = [];
        out.rows = m1.rows + m2.rows;
        out.columns = m1.columns + m2.columns;
        for(var i = 0; i < out.rows; i++){
            var row = [];
            out.push(row);
            for(var j = 0; j < out.columns; j++)
            {
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

        const L = m.map(row => row.map(_ => 0));
        L.rows = L.columns = n;
        const U = m.map(row => row.map(_ => 0));
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

    /** Perform Gauss-Jordan elimination on a copy of the given matrix.
     * 
     * @param {matrix} m
     * @returns {matrix}
     */
    gauss_jordan_elimination: function(m) {
        const rows = m.rows;
        const columns = m.columns;

        if(rows>columns) {
            throw(new Numbas.Error("matrixmath.gauss-jordan elimination.not enough columns"));
        }

        m = m.map(row => row.slice());
        for(let i=0; i<rows; i++) {
            // divide row i by m[i][i]
            const f = m[i][i];
            if(f==0) {
                throw(new Numbas.Error("matrixmath.not invertible"));
            }
            for(let x=0; x<columns; x++) {
                m[i][x] /= f;
            }

            // subtract m[y][i] lots of row i from row y.
            for(let y=i+1; y<rows; y++) {
                const f = m[y][i];
                for(let x=0; x<columns; x++) {
                    m[y][x] -= m[i][x] * f;
                }
            }
        }
        for(let i = rows-1; i>0; i--) {
            // subtract m[y][i] lots of row i from row y;
            for(let y=i-1; y>=0; y--) {
                const f = m[y][i];
                for(let x=0; x<columns; x++) {
                    m[y][x] -= m[i][x] * f;
                }
            }
        }

        m.rows = rows;
        m.columns = columns;

        return m;
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
        const inverse = reduced.map(row => row.slice(n));
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
    contains: function(set,element,scope) {
        for(var i=0,l=set.length;i<l;i++) {
            if(Numbas.util.eq(set[i],element,scope)) {
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
    union: function(a,b,scope) {
        var out = a.slice();
        for(var i=0,l=b.length;i<l;i++) {
            if(!setmath.contains(a,b[i],scope)) {
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
    intersection: function(a,b,scope) {
        return a.filter(function(v) {
            return setmath.contains(b,v,scope);
        });
    },
    /** Are two sets equal? Yes if a,b and (a intersect b) all have the same length.
     *
     * @param {set} a
     * @param {set} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {boolean}
     */
    eq: function(a,b,scope) {
        return a.length==b.length && setmath.intersection(a,b,scope).length==a.length;
    },
    /** Set minus - remove b's elements from a.
     *
     * @param {set} a
     * @param {set} b
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {set}
     */
    minus: function(a,b,scope) {
        return a.filter(function(v){ return !setmath.contains(b,v,scope); });
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
    var exports = module.exports;
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e=e||self).i18next=t()}(this,function(){"use strict";function e(t){return(e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(t)}function t(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function n(e){for(var n=1;n<arguments.length;n++){var o=null!=arguments[n]?Object(arguments[n]):{},i=Object.keys(o);"function"==typeof Object.getOwnPropertySymbols&&(i=i.concat(Object.getOwnPropertySymbols(o).filter(function(e){return Object.getOwnPropertyDescriptor(o,e).enumerable}))),i.forEach(function(n){t(e,n,o[n])})}return e}function o(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o)}}function r(e,t,n){return t&&i(e.prototype,t),n&&i(e,n),e}function a(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function s(t,n){return!n||"object"!==e(n)&&"function"!=typeof n?a(t):n}function u(e){return(u=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function l(e,t){return(l=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function c(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&l(e,t)}var p={type:"logger",log:function(e){this.output("log",e)},warn:function(e){this.output("warn",e)},error:function(e){this.output("error",e)},output:function(e,t){console&&console[e]&&console[e].apply(console,t)}},g=new(function(){function e(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};o(this,e),this.init(t,n)}return r(e,[{key:"init",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};this.prefix=t.prefix||"i18next:",this.logger=e||p,this.options=t,this.debug=t.debug}},{key:"setDebug",value:function(e){this.debug=e}},{key:"log",value:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return this.forward(t,"log","",!0)}},{key:"warn",value:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return this.forward(t,"warn","",!0)}},{key:"error",value:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return this.forward(t,"error","")}},{key:"deprecate",value:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return this.forward(t,"warn","WARNING DEPRECATED: ",!0)}},{key:"forward",value:function(e,t,n,o){return o&&!this.debug?null:("string"==typeof e[0]&&(e[0]="".concat(n).concat(this.prefix," ").concat(e[0])),this.logger[t](e))}},{key:"create",value:function(t){return new e(this.logger,n({},{prefix:"".concat(this.prefix,":").concat(t,":")},this.options))}}]),e}()),f=function(){function e(){o(this,e),this.observers={}}return r(e,[{key:"on",value:function(e,t){var n=this;return e.split(" ").forEach(function(e){n.observers[e]=n.observers[e]||[],n.observers[e].push(t)}),this}},{key:"off",value:function(e,t){this.observers[e]&&(t?this.observers[e]=this.observers[e].filter(function(e){return e!==t}):delete this.observers[e])}},{key:"emit",value:function(e){for(var t=arguments.length,n=new Array(t>1?t-1:0),o=1;o<t;o++)n[o-1]=arguments[o];this.observers[e]&&[].concat(this.observers[e]).forEach(function(e){e.apply(void 0,n)});this.observers["*"]&&[].concat(this.observers["*"]).forEach(function(t){t.apply(t,[e].concat(n))})}}]),e}();function h(){var e,t,n=new Promise(function(n,o){e=n,t=o});return n.resolve=e,n.reject=t,n}function d(e){return null==e?"":""+e}function v(e,t,n){function o(e){return e&&e.indexOf("###")>-1?e.replace(/###/g,"."):e}function i(){return!e||"string"==typeof e}for(var r="string"!=typeof t?[].concat(t):t.split(".");r.length>1;){if(i())return{};var a=o(r.shift());!e[a]&&n&&(e[a]=new n),e=e[a]}return i()?{}:{obj:e,k:o(r.shift())}}function y(e,t,n){var o=v(e,t,Object);o.obj[o.k]=n}function m(e,t){var n=v(e,t),o=n.obj,i=n.k;if(o)return o[i]}function b(e,t,n){var o=m(e,n);return void 0!==o?o:m(t,n)}function k(e){return e.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&")}var x={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;"};function w(e){return"string"==typeof e?e.replace(/[&<>"'\/]/g,function(e){return x[e]}):e}var S="undefined"!=typeof window&&window.navigator&&window.navigator.userAgent&&window.navigator.userAgent.indexOf("MSIE")>-1,L=function(e){function t(e){var n,i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{ns:["translation"],defaultNS:"translation"};return o(this,t),n=s(this,u(t).call(this)),S&&f.call(a(n)),n.data=e||{},n.options=i,void 0===n.options.keySeparator&&(n.options.keySeparator="."),n}return c(t,f),r(t,[{key:"addNamespaces",value:function(e){this.options.ns.indexOf(e)<0&&this.options.ns.push(e)}},{key:"removeNamespaces",value:function(e){var t=this.options.ns.indexOf(e);t>-1&&this.options.ns.splice(t,1)}},{key:"getResource",value:function(e,t,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},i=void 0!==o.keySeparator?o.keySeparator:this.options.keySeparator,r=[e,t];return n&&"string"!=typeof n&&(r=r.concat(n)),n&&"string"==typeof n&&(r=r.concat(i?n.split(i):n)),e.indexOf(".")>-1&&(r=e.split(".")),m(this.data,r)}},{key:"addResource",value:function(e,t,n,o){var i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{silent:!1},r=this.options.keySeparator;void 0===r&&(r=".");var a=[e,t];n&&(a=a.concat(r?n.split(r):n)),e.indexOf(".")>-1&&(o=t,t=(a=e.split("."))[1]),this.addNamespaces(t),y(this.data,a,o),i.silent||this.emit("added",e,t,n,o)}},{key:"addResources",value:function(e,t,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{silent:!1};for(var i in n)"string"!=typeof n[i]&&"[object Array]"!==Object.prototype.toString.apply(n[i])||this.addResource(e,t,i,n[i],{silent:!0});o.silent||this.emit("added",e,t,n)}},{key:"addResourceBundle",value:function(e,t,o,i,r){var a=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{silent:!1},s=[e,t];e.indexOf(".")>-1&&(i=o,o=t,t=(s=e.split("."))[1]),this.addNamespaces(t);var u=m(this.data,s)||{};i?function e(t,n,o){for(var i in n)"__proto__"!==i&&(i in t?"string"==typeof t[i]||t[i]instanceof String||"string"==typeof n[i]||n[i]instanceof String?o&&(t[i]=n[i]):e(t[i],n[i],o):t[i]=n[i]);return t}(u,o,r):u=n({},u,o),y(this.data,s,u),a.silent||this.emit("added",e,t,o)}},{key:"removeResourceBundle",value:function(e,t){this.hasResourceBundle(e,t)&&delete this.data[e][t],this.removeNamespaces(t),this.emit("removed",e,t)}},{key:"hasResourceBundle",value:function(e,t){return void 0!==this.getResource(e,t)}},{key:"getResourceBundle",value:function(e,t){return t||(t=this.options.defaultNS),"v1"===this.options.compatibilityAPI?n({},{},this.getResource(e,t)):this.getResource(e,t)}},{key:"getDataByLanguage",value:function(e){return this.data[e]}},{key:"toJSON",value:function(){return this.data}}]),t}(),O={processors:{},addPostProcessor:function(e){this.processors[e.name]=e},handle:function(e,t,n,o,i){var r=this;return e.forEach(function(e){r.processors[e]&&(t=r.processors[e].process(t,n,o,i))}),t}},R={},C=function(t){function i(e){var t,n,r,l,c=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return o(this,i),t=s(this,u(i).call(this)),S&&f.call(a(t)),n=["resourceStore","languageUtils","pluralResolver","interpolator","backendConnector","i18nFormat","utils"],r=e,l=a(t),n.forEach(function(e){r[e]&&(l[e]=r[e])}),t.options=c,void 0===t.options.keySeparator&&(t.options.keySeparator="."),t.logger=g.create("translator"),t}return c(i,f),r(i,[{key:"changeLanguage",value:function(e){e&&(this.language=e)}},{key:"exists",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{interpolation:{}},n=this.resolve(e,t);return n&&void 0!==n.res}},{key:"extractFromKey",value:function(e,t){var n=void 0!==t.nsSeparator?t.nsSeparator:this.options.nsSeparator;void 0===n&&(n=":");var o=void 0!==t.keySeparator?t.keySeparator:this.options.keySeparator,i=t.ns||this.options.defaultNS;if(n&&e.indexOf(n)>-1){var r=e.match(this.interpolator.nestingRegexp);if(r&&r.length>0)return{key:e,namespaces:i};var a=e.split(n);(n!==o||n===o&&this.options.ns.indexOf(a[0])>-1)&&(i=a.shift()),e=a.join(o)}return"string"==typeof i&&(i=[i]),{key:e,namespaces:i}}},{key:"translate",value:function(t,o,i){var r=this;if("object"!==e(o)&&this.options.overloadTranslationOptionHandler&&(o=this.options.overloadTranslationOptionHandler(arguments)),o||(o={}),null==t)return"";Array.isArray(t)||(t=[String(t)]);var a=void 0!==o.keySeparator?o.keySeparator:this.options.keySeparator,s=this.extractFromKey(t[t.length-1],o),u=s.key,l=s.namespaces,c=l[l.length-1],p=o.lng||this.language,g=o.appendNamespaceToCIMode||this.options.appendNamespaceToCIMode;if(p&&"cimode"===p.toLowerCase()){if(g){var f=o.nsSeparator||this.options.nsSeparator;return c+f+u}return u}var h=this.resolve(t,o),d=h&&h.res,v=h&&h.usedKey||u,y=h&&h.exactUsedKey||u,m=Object.prototype.toString.apply(d),b=void 0!==o.joinArrays?o.joinArrays:this.options.joinArrays,k=!this.i18nFormat||this.i18nFormat.handleAsObject;if(k&&d&&("string"!=typeof d&&"boolean"!=typeof d&&"number"!=typeof d)&&["[object Number]","[object Function]","[object RegExp]"].indexOf(m)<0&&("string"!=typeof b||"[object Array]"!==m)){if(!o.returnObjects&&!this.options.returnObjects)return this.logger.warn("accessing an object - but returnObjects options is not enabled!"),this.options.returnedObjectHandler?this.options.returnedObjectHandler(v,d,o):"key '".concat(u," (").concat(this.language,")' returned an object instead of string.");if(a){var x="[object Array]"===m,w=x?[]:{},S=x?y:v;for(var L in d)if(Object.prototype.hasOwnProperty.call(d,L)){var O="".concat(S).concat(a).concat(L);w[L]=this.translate(O,n({},o,{joinArrays:!1,ns:l})),w[L]===O&&(w[L]=d[L])}d=w}}else if(k&&"string"==typeof b&&"[object Array]"===m)(d=d.join(b))&&(d=this.extendTranslation(d,t,o,i));else{var R=!1,C=!1;if(!this.isValidLookup(d)&&void 0!==o.defaultValue){if(R=!0,void 0!==o.count){var N=this.pluralResolver.getSuffix(p,o.count);d=o["defaultValue".concat(N)]}d||(d=o.defaultValue)}this.isValidLookup(d)||(C=!0,d=u);var j=o.defaultValue&&o.defaultValue!==d&&this.options.updateMissing;if(C||R||j){if(this.logger.log(j?"updateKey":"missingKey",p,c,u,j?o.defaultValue:d),a){var E=this.resolve(u,n({},o,{keySeparator:!1}));E&&E.res&&this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.")}var P=[],F=this.languageUtils.getFallbackCodes(this.options.fallbackLng,o.lng||this.language);if("fallback"===this.options.saveMissingTo&&F&&F[0])for(var V=0;V<F.length;V++)P.push(F[V]);else"all"===this.options.saveMissingTo?P=this.languageUtils.toResolveHierarchy(o.lng||this.language):P.push(o.lng||this.language);var T=function(e,t){r.options.missingKeyHandler?r.options.missingKeyHandler(e,c,t,j?o.defaultValue:d,j,o):r.backendConnector&&r.backendConnector.saveMissing&&r.backendConnector.saveMissing(e,c,t,j?o.defaultValue:d,j,o),r.emit("missingKey",e,c,t,d)};if(this.options.saveMissing){var A=void 0!==o.count&&"string"!=typeof o.count;this.options.saveMissingPlurals&&A?P.forEach(function(e){r.pluralResolver.getPluralFormsOfKey(e,u).forEach(function(t){return T([e],t)})}):T(P,u)}}d=this.extendTranslation(d,t,o,h,i),C&&d===u&&this.options.appendNamespaceToMissingKey&&(d="".concat(c,":").concat(u)),C&&this.options.parseMissingKeyHandler&&(d=this.options.parseMissingKeyHandler(d))}return d}},{key:"extendTranslation",value:function(e,t,o,i,r){var a=this;if(this.i18nFormat&&this.i18nFormat.parse)e=this.i18nFormat.parse(e,o,i.usedLng,i.usedNS,i.usedKey,{resolved:i});else if(!o.skipInterpolation){o.interpolation&&this.interpolator.init(n({},o,{interpolation:n({},this.options.interpolation,o.interpolation)}));var s,u=o.interpolation&&o.interpolation.skipOnVariables||this.options.interpolation.skipOnVariables;if(u){var l=e.match(this.interpolator.nestingRegexp);s=l&&l.length}var c=o.replace&&"string"!=typeof o.replace?o.replace:o;if(this.options.interpolation.defaultVariables&&(c=n({},this.options.interpolation.defaultVariables,c)),e=this.interpolator.interpolate(e,c,o.lng||this.language,o),u){var p=e.match(this.interpolator.nestingRegexp);s<(p&&p.length)&&(o.nest=!1)}!1!==o.nest&&(e=this.interpolator.nest(e,function(){for(var e=arguments.length,n=new Array(e),o=0;o<e;o++)n[o]=arguments[o];return r&&r[0]===n[0]?(a.logger.warn("It seems you are nesting recursively key: ".concat(n[0]," in key: ").concat(t[0])),null):a.translate.apply(a,n.concat([t]))},o)),o.interpolation&&this.interpolator.reset()}var g=o.postProcess||this.options.postProcess,f="string"==typeof g?[g]:g;return null!=e&&f&&f.length&&!1!==o.applyPostProcessor&&(e=O.handle(f,e,t,this.options&&this.options.postProcessPassResolved?n({i18nResolved:i},o):o,this)),e}},{key:"resolve",value:function(e){var t,n,o,i,r,a=this,s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return"string"==typeof e&&(e=[e]),e.forEach(function(e){if(!a.isValidLookup(t)){var u=a.extractFromKey(e,s),l=u.key;n=l;var c=u.namespaces;a.options.fallbackNS&&(c=c.concat(a.options.fallbackNS));var p=void 0!==s.count&&"string"!=typeof s.count,g=void 0!==s.context&&"string"==typeof s.context&&""!==s.context,f=s.lngs?s.lngs:a.languageUtils.toResolveHierarchy(s.lng||a.language,s.fallbackLng);c.forEach(function(e){a.isValidLookup(t)||(r=e,!R["".concat(f[0],"-").concat(e)]&&a.utils&&a.utils.hasLoadedNamespace&&!a.utils.hasLoadedNamespace(r)&&(R["".concat(f[0],"-").concat(e)]=!0,a.logger.warn('key "'.concat(n,'" for languages "').concat(f.join(", "),'" won\'t get resolved as namespace "').concat(r,'" was not yet loaded'),"This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!")),f.forEach(function(n){if(!a.isValidLookup(t)){i=n;var r,u,c=l,f=[c];if(a.i18nFormat&&a.i18nFormat.addLookupKeys)a.i18nFormat.addLookupKeys(f,l,n,e,s);else p&&(r=a.pluralResolver.getSuffix(n,s.count)),p&&g&&f.push(c+r),g&&f.push(c+="".concat(a.options.contextSeparator).concat(s.context)),p&&f.push(c+=r);for(;u=f.pop();)a.isValidLookup(t)||(o=u,t=a.getResource(n,e,u,s))}}))})}}),{res:t,usedKey:n,exactUsedKey:o,usedLng:i,usedNS:r}}},{key:"isValidLookup",value:function(e){return!(void 0===e||!this.options.returnNull&&null===e||!this.options.returnEmptyString&&""===e)}},{key:"getResource",value:function(e,t,n){var o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};return this.i18nFormat&&this.i18nFormat.getResource?this.i18nFormat.getResource(e,t,n,o):this.resourceStore.getResource(e,t,n,o)}}]),i}();function N(e){return e.charAt(0).toUpperCase()+e.slice(1)}var j=function(){function e(t){o(this,e),this.options=t,this.whitelist=this.options.supportedLngs||!1,this.supportedLngs=this.options.supportedLngs||!1,this.logger=g.create("languageUtils")}return r(e,[{key:"getScriptPartFromCode",value:function(e){if(!e||e.indexOf("-")<0)return null;var t=e.split("-");return 2===t.length?null:(t.pop(),"x"===t[t.length-1].toLowerCase()?null:this.formatLanguageCode(t.join("-")))}},{key:"getLanguagePartFromCode",value:function(e){if(!e||e.indexOf("-")<0)return e;var t=e.split("-");return this.formatLanguageCode(t[0])}},{key:"formatLanguageCode",value:function(e){if("string"==typeof e&&e.indexOf("-")>-1){var t=["hans","hant","latn","cyrl","cans","mong","arab"],n=e.split("-");return this.options.lowerCaseLng?n=n.map(function(e){return e.toLowerCase()}):2===n.length?(n[0]=n[0].toLowerCase(),n[1]=n[1].toUpperCase(),t.indexOf(n[1].toLowerCase())>-1&&(n[1]=N(n[1].toLowerCase()))):3===n.length&&(n[0]=n[0].toLowerCase(),2===n[1].length&&(n[1]=n[1].toUpperCase()),"sgn"!==n[0]&&2===n[2].length&&(n[2]=n[2].toUpperCase()),t.indexOf(n[1].toLowerCase())>-1&&(n[1]=N(n[1].toLowerCase())),t.indexOf(n[2].toLowerCase())>-1&&(n[2]=N(n[2].toLowerCase()))),n.join("-")}return this.options.cleanCode||this.options.lowerCaseLng?e.toLowerCase():e}},{key:"isWhitelisted",value:function(e){return this.logger.deprecate("languageUtils.isWhitelisted",'function "isWhitelisted" will be renamed to "isSupportedCode" in the next major - please make sure to rename it\'s usage asap.'),this.isSupportedCode(e)}},{key:"isSupportedCode",value:function(e){return("languageOnly"===this.options.load||this.options.nonExplicitSupportedLngs)&&(e=this.getLanguagePartFromCode(e)),!this.supportedLngs||!this.supportedLngs.length||this.supportedLngs.indexOf(e)>-1}},{key:"getBestMatchFromCodes",value:function(e){var t,n=this;return e?(e.forEach(function(e){if(!t){var o=n.formatLanguageCode(e);n.options.supportedLngs&&!n.isSupportedCode(o)||(t=o)}}),!t&&this.options.supportedLngs&&e.forEach(function(e){if(!t){var o=n.getLanguagePartFromCode(e);if(n.isSupportedCode(o))return t=o;t=n.options.supportedLngs.find(function(e){if(0===e.indexOf(o))return e})}}),t||(t=this.getFallbackCodes(this.options.fallbackLng)[0]),t):null}},{key:"getFallbackCodes",value:function(e,t){if(!e)return[];if("string"==typeof e&&(e=[e]),"[object Array]"===Object.prototype.toString.apply(e))return e;if(!t)return e.default||[];var n=e[t];return n||(n=e[this.getScriptPartFromCode(t)]),n||(n=e[this.formatLanguageCode(t)]),n||(n=e[this.getLanguagePartFromCode(t)]),n||(n=e.default),n||[]}},{key:"toResolveHierarchy",value:function(e,t){var n=this,o=this.getFallbackCodes(t||this.options.fallbackLng||[],e),i=[],r=function(e){e&&(n.isSupportedCode(e)?i.push(e):n.logger.warn("rejecting language code not found in supportedLngs: ".concat(e)))};return"string"==typeof e&&e.indexOf("-")>-1?("languageOnly"!==this.options.load&&r(this.formatLanguageCode(e)),"languageOnly"!==this.options.load&&"currentOnly"!==this.options.load&&r(this.getScriptPartFromCode(e)),"currentOnly"!==this.options.load&&r(this.getLanguagePartFromCode(e))):"string"==typeof e&&r(this.formatLanguageCode(e)),o.forEach(function(e){i.indexOf(e)<0&&r(n.formatLanguageCode(e))}),i}}]),e}(),E=[{lngs:["ach","ak","am","arn","br","fil","gun","ln","mfe","mg","mi","oc","pt","pt-BR","tg","ti","tr","uz","wa"],nr:[1,2],fc:1},{lngs:["af","an","ast","az","bg","bn","ca","da","de","dev","el","en","eo","es","et","eu","fi","fo","fur","fy","gl","gu","ha","hi","hu","hy","ia","it","kn","ku","lb","mai","ml","mn","mr","nah","nap","nb","ne","nl","nn","no","nso","pa","pap","pms","ps","pt-PT","rm","sco","se","si","so","son","sq","sv","sw","ta","te","tk","ur","yo"],nr:[1,2],fc:2},{lngs:["ay","bo","cgg","fa","id","ja","jbo","ka","kk","km","ko","ky","lo","ms","sah","su","th","tt","ug","vi","wo","zh"],nr:[1],fc:3},{lngs:["be","bs","cnr","dz","hr","ru","sr","uk"],nr:[1,2,5],fc:4},{lngs:["ar"],nr:[0,1,2,3,11,100],fc:5},{lngs:["cs","sk"],nr:[1,2,5],fc:6},{lngs:["csb","pl"],nr:[1,2,5],fc:7},{lngs:["cy"],nr:[1,2,3,8],fc:8},{lngs:["fr"],nr:[1,2],fc:9},{lngs:["ga"],nr:[1,2,3,7,11],fc:10},{lngs:["gd"],nr:[1,2,3,20],fc:11},{lngs:["is"],nr:[1,2],fc:12},{lngs:["jv"],nr:[0,1],fc:13},{lngs:["kw"],nr:[1,2,3,4],fc:14},{lngs:["lt"],nr:[1,2,10],fc:15},{lngs:["lv"],nr:[1,2,0],fc:16},{lngs:["mk"],nr:[1,2],fc:17},{lngs:["mnk"],nr:[0,1,2],fc:18},{lngs:["mt"],nr:[1,2,11,20],fc:19},{lngs:["or"],nr:[2,1],fc:2},{lngs:["ro"],nr:[1,2,20],fc:20},{lngs:["sl"],nr:[5,1,2,3],fc:21},{lngs:["he"],nr:[1,2,20,21],fc:22}],P={1:function(e){return Number(e>1)},2:function(e){return Number(1!=e)},3:function(e){return 0},4:function(e){return Number(e%10==1&&e%100!=11?0:e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?1:2)},5:function(e){return Number(0==e?0:1==e?1:2==e?2:e%100>=3&&e%100<=10?3:e%100>=11?4:5)},6:function(e){return Number(1==e?0:e>=2&&e<=4?1:2)},7:function(e){return Number(1==e?0:e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?1:2)},8:function(e){return Number(1==e?0:2==e?1:8!=e&&11!=e?2:3)},9:function(e){return Number(e>=2)},10:function(e){return Number(1==e?0:2==e?1:e<7?2:e<11?3:4)},11:function(e){return Number(1==e||11==e?0:2==e||12==e?1:e>2&&e<20?2:3)},12:function(e){return Number(e%10!=1||e%100==11)},13:function(e){return Number(0!==e)},14:function(e){return Number(1==e?0:2==e?1:3==e?2:3)},15:function(e){return Number(e%10==1&&e%100!=11?0:e%10>=2&&(e%100<10||e%100>=20)?1:2)},16:function(e){return Number(e%10==1&&e%100!=11?0:0!==e?1:2)},17:function(e){return Number(1==e||e%10==1&&e%100!=11?0:1)},18:function(e){return Number(0==e?0:1==e?1:2)},19:function(e){return Number(1==e?0:0==e||e%100>1&&e%100<11?1:e%100>10&&e%100<20?2:3)},20:function(e){return Number(1==e?0:0==e||e%100>0&&e%100<20?1:2)},21:function(e){return Number(e%100==1?1:e%100==2?2:e%100==3||e%100==4?3:0)},22:function(e){return Number(1==e?0:2==e?1:(e<0||e>10)&&e%10==0?2:3)}};var F=function(){function e(t){var n,i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};o(this,e),this.languageUtils=t,this.options=i,this.logger=g.create("pluralResolver"),this.rules=(n={},E.forEach(function(e){e.lngs.forEach(function(t){n[t]={numbers:e.nr,plurals:P[e.fc]}})}),n)}return r(e,[{key:"addRule",value:function(e,t){this.rules[e]=t}},{key:"getRule",value:function(e){return this.rules[e]||this.rules[this.languageUtils.getLanguagePartFromCode(e)]}},{key:"needsPlural",value:function(e){var t=this.getRule(e);return t&&t.numbers.length>1}},{key:"getPluralFormsOfKey",value:function(e,t){var n=this,o=[],i=this.getRule(e);return i?(i.numbers.forEach(function(i){var r=n.getSuffix(e,i);o.push("".concat(t).concat(r))}),o):o}},{key:"getSuffix",value:function(e,t){var n=this,o=this.getRule(e);if(o){var i=o.noAbs?o.plurals(t):o.plurals(Math.abs(t)),r=o.numbers[i];this.options.simplifyPluralSuffix&&2===o.numbers.length&&1===o.numbers[0]&&(2===r?r="plural":1===r&&(r=""));var a=function(){return n.options.prepend&&r.toString()?n.options.prepend+r.toString():r.toString()};return"v1"===this.options.compatibilityJSON?1===r?"":"number"==typeof r?"_plural_".concat(r.toString()):a():"v2"===this.options.compatibilityJSON?a():this.options.simplifyPluralSuffix&&2===o.numbers.length&&1===o.numbers[0]?a():this.options.prepend&&i.toString()?this.options.prepend+i.toString():i.toString()}return this.logger.warn("no plural rule found for: ".concat(e)),""}}]),e}(),V=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};o(this,e),this.logger=g.create("interpolator"),this.options=t,this.format=t.interpolation&&t.interpolation.format||function(e){return e},this.init(t)}return r(e,[{key:"init",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};e.interpolation||(e.interpolation={escapeValue:!0});var t=e.interpolation;this.escape=void 0!==t.escape?t.escape:w,this.escapeValue=void 0===t.escapeValue||t.escapeValue,this.useRawValueToEscape=void 0!==t.useRawValueToEscape&&t.useRawValueToEscape,this.prefix=t.prefix?k(t.prefix):t.prefixEscaped||"{{",this.suffix=t.suffix?k(t.suffix):t.suffixEscaped||"}}",this.formatSeparator=t.formatSeparator?t.formatSeparator:t.formatSeparator||",",this.unescapePrefix=t.unescapeSuffix?"":t.unescapePrefix||"-",this.unescapeSuffix=this.unescapePrefix?"":t.unescapeSuffix||"",this.nestingPrefix=t.nestingPrefix?k(t.nestingPrefix):t.nestingPrefixEscaped||k("$t("),this.nestingSuffix=t.nestingSuffix?k(t.nestingSuffix):t.nestingSuffixEscaped||k(")"),this.nestingOptionsSeparator=t.nestingOptionsSeparator?t.nestingOptionsSeparator:t.nestingOptionsSeparator||",",this.maxReplaces=t.maxReplaces?t.maxReplaces:1e3,this.alwaysFormat=void 0!==t.alwaysFormat&&t.alwaysFormat,this.resetRegExp()}},{key:"reset",value:function(){this.options&&this.init(this.options)}},{key:"resetRegExp",value:function(){var e="".concat(this.prefix,"(.+?)").concat(this.suffix);this.regexp=new RegExp(e,"g");var t="".concat(this.prefix).concat(this.unescapePrefix,"(.+?)").concat(this.unescapeSuffix).concat(this.suffix);this.regexpUnescape=new RegExp(t,"g");var n="".concat(this.nestingPrefix,"(.+?)").concat(this.nestingSuffix);this.nestingRegexp=new RegExp(n,"g")}},{key:"interpolate",value:function(e,t,n,o){var i,r,a,s=this,u=this.options&&this.options.interpolation&&this.options.interpolation.defaultVariables||{};function l(e){return e.replace(/\$/g,"$$$$")}var c=function(e){if(e.indexOf(s.formatSeparator)<0){var i=b(t,u,e);return s.alwaysFormat?s.format(i,void 0,n):i}var r=e.split(s.formatSeparator),a=r.shift().trim(),l=r.join(s.formatSeparator).trim();return s.format(b(t,u,a),l,n,o)};this.resetRegExp();var p=o&&o.missingInterpolationHandler||this.options.missingInterpolationHandler,g=o&&o.interpolation&&o.interpolation.skipOnVariables||this.options.interpolation.skipOnVariables;return[{regex:this.regexpUnescape,safeValue:function(e){return l(e)}},{regex:this.regexp,safeValue:function(e){return s.escapeValue?l(s.escape(e)):l(e)}}].forEach(function(t){for(a=0;i=t.regex.exec(e);){if(void 0===(r=c(i[1].trim())))if("function"==typeof p){var n=p(e,i,o);r="string"==typeof n?n:""}else{if(g){r=i[0];continue}s.logger.warn("missed to pass in variable ".concat(i[1]," for interpolating ").concat(e)),r=""}else"string"==typeof r||s.useRawValueToEscape||(r=d(r));if(e=e.replace(i[0],t.safeValue(r)),t.regex.lastIndex=0,++a>=s.maxReplaces)break}}),e}},{key:"nest",value:function(e,t){var o,i,r=this,a=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},s=n({},a);function u(e,t){var o=this.nestingOptionsSeparator;if(e.indexOf(o)<0)return e;var i=e.split(new RegExp("".concat(o,"[ ]*{"))),r="{".concat(i[1]);e=i[0],r=(r=this.interpolate(r,s)).replace(/'/g,'"');try{s=JSON.parse(r),t&&(s=n({},t,s))}catch(t){return this.logger.warn("failed parsing options string in nesting for key ".concat(e),t),"".concat(e).concat(o).concat(r)}return delete s.defaultValue,e}for(s.applyPostProcessor=!1,delete s.defaultValue;o=this.nestingRegexp.exec(e);){var l=[],c=!1;if(o[0].includes(this.formatSeparator)&&!/{.*}/.test(o[1])){var p=o[1].split(this.formatSeparator).map(function(e){return e.trim()});o[1]=p.shift(),l=p,c=!0}if((i=t(u.call(this,o[1].trim(),s),s))&&o[0]===e&&"string"!=typeof i)return i;"string"!=typeof i&&(i=d(i)),i||(this.logger.warn("missed to resolve ".concat(o[1]," for nesting ").concat(e)),i=""),c&&(i=l.reduce(function(e,t){return r.format(e,t,a.lng,a)},i.trim())),e=e.replace(o[0],i),this.regexp.lastIndex=0}return e}}]),e}();var T=function(e){function t(e,n,i){var r,l=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};return o(this,t),r=s(this,u(t).call(this)),S&&f.call(a(r)),r.backend=e,r.store=n,r.services=i,r.languageUtils=i.languageUtils,r.options=l,r.logger=g.create("backendConnector"),r.state={},r.queue=[],r.backend&&r.backend.init&&r.backend.init(i,l.backend,l),r}return c(t,f),r(t,[{key:"queueLoad",value:function(e,t,n,o){var i=this,r=[],a=[],s=[],u=[];return e.forEach(function(e){var o=!0;t.forEach(function(t){var s="".concat(e,"|").concat(t);!n.reload&&i.store.hasResourceBundle(e,t)?i.state[s]=2:i.state[s]<0||(1===i.state[s]?a.indexOf(s)<0&&a.push(s):(i.state[s]=1,o=!1,a.indexOf(s)<0&&a.push(s),r.indexOf(s)<0&&r.push(s),u.indexOf(t)<0&&u.push(t)))}),o||s.push(e)}),(r.length||a.length)&&this.queue.push({pending:a,loaded:{},errors:[],callback:o}),{toLoad:r,pending:a,toLoadLanguages:s,toLoadNamespaces:u}}},{key:"loaded",value:function(e,t,n){var o=e.split("|"),i=o[0],r=o[1];t&&this.emit("failedLoading",i,r,t),n&&this.store.addResourceBundle(i,r,n),this.state[e]=t?-1:2;var a={};this.queue.forEach(function(n){var o,s,u,l,c,p;o=n.loaded,s=r,l=v(o,[i],Object),c=l.obj,p=l.k,c[p]=c[p]||[],u&&(c[p]=c[p].concat(s)),u||c[p].push(s),function(e,t){for(var n=e.indexOf(t);-1!==n;)e.splice(n,1),n=e.indexOf(t)}(n.pending,e),t&&n.errors.push(t),0!==n.pending.length||n.done||(Object.keys(n.loaded).forEach(function(e){a[e]||(a[e]=[]),n.loaded[e].length&&n.loaded[e].forEach(function(t){a[e].indexOf(t)<0&&a[e].push(t)})}),n.done=!0,n.errors.length?n.callback(n.errors):n.callback())}),this.emit("loaded",a),this.queue=this.queue.filter(function(e){return!e.done})}},{key:"read",value:function(e,t,n){var o=this,i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0,r=arguments.length>4&&void 0!==arguments[4]?arguments[4]:350,a=arguments.length>5?arguments[5]:void 0;return e.length?this.backend[n](e,t,function(s,u){s&&u&&i<5?setTimeout(function(){o.read.call(o,e,t,n,i+1,2*r,a)},r):a(s,u)}):a(null,{})}},{key:"prepareLoading",value:function(e,t){var n=this,o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},i=arguments.length>3?arguments[3]:void 0;if(!this.backend)return this.logger.warn("No backend was added via i18next.use. Will not load resources."),i&&i();"string"==typeof e&&(e=this.languageUtils.toResolveHierarchy(e)),"string"==typeof t&&(t=[t]);var r=this.queueLoad(e,t,o,i);if(!r.toLoad.length)return r.pending.length||i(),null;r.toLoad.forEach(function(e){n.loadOne(e)})}},{key:"load",value:function(e,t,n){this.prepareLoading(e,t,{},n)}},{key:"reload",value:function(e,t,n){this.prepareLoading(e,t,{reload:!0},n)}},{key:"loadOne",value:function(e){var t=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"",o=e.split("|"),i=o[0],r=o[1];this.read(i,r,"read",void 0,void 0,function(o,a){o&&t.logger.warn("".concat(n,"loading namespace ").concat(r," for language ").concat(i," failed"),o),!o&&a&&t.logger.log("".concat(n,"loaded namespace ").concat(r," for language ").concat(i),a),t.loaded(e,o,a)})}},{key:"saveMissing",value:function(e,t,o,i,r){var a=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{};this.services.utils&&this.services.utils.hasLoadedNamespace&&!this.services.utils.hasLoadedNamespace(t)?this.logger.warn('did not save key "'.concat(o,'" as the namespace "').concat(t,'" was not yet loaded'),"This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!"):null!=o&&""!==o&&(this.backend&&this.backend.create&&this.backend.create(e,t,o,i,null,n({},a,{isUpdate:r})),e&&e[0]&&this.store.addResource(e[0],t,o,i))}}]),t}();function A(e){return"string"==typeof e.ns&&(e.ns=[e.ns]),"string"==typeof e.fallbackLng&&(e.fallbackLng=[e.fallbackLng]),"string"==typeof e.fallbackNS&&(e.fallbackNS=[e.fallbackNS]),e.whitelist&&(e.whitelist&&e.whitelist.indexOf("cimode")<0&&(e.whitelist=e.whitelist.concat(["cimode"])),e.supportedLngs=e.whitelist),e.nonExplicitWhitelist&&(e.nonExplicitSupportedLngs=e.nonExplicitWhitelist),e.supportedLngs&&e.supportedLngs.indexOf("cimode")<0&&(e.supportedLngs=e.supportedLngs.concat(["cimode"])),e}function U(){}return new(function(t){function i(){var e,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=arguments.length>1?arguments[1]:void 0;if(o(this,i),e=s(this,u(i).call(this)),S&&f.call(a(e)),e.options=A(t),e.services={},e.logger=g,e.modules={external:[]},n&&!e.isInitialized&&!t.isClone){if(!e.options.initImmediate)return e.init(t,n),s(e,a(e));setTimeout(function(){e.init(t,n)},0)}return e}return c(i,f),r(i,[{key:"init",value:function(){var t=this,o=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},i=arguments.length>1?arguments[1]:void 0;function r(e){return e?"function"==typeof e?new e:e:null}if("function"==typeof o&&(i=o,o={}),o.whitelist&&!o.supportedLngs&&this.logger.deprecate("whitelist",'option "whitelist" will be renamed to "supportedLngs" in the next major - please make sure to rename this option asap.'),o.nonExplicitWhitelist&&!o.nonExplicitSupportedLngs&&this.logger.deprecate("whitelist",'options "nonExplicitWhitelist" will be renamed to "nonExplicitSupportedLngs" in the next major - please make sure to rename this option asap.'),this.options=n({},{debug:!1,initImmediate:!0,ns:["translation"],defaultNS:["translation"],fallbackLng:["dev"],fallbackNS:!1,whitelist:!1,nonExplicitWhitelist:!1,supportedLngs:!1,nonExplicitSupportedLngs:!1,load:"all",preload:!1,simplifyPluralSuffix:!0,keySeparator:".",nsSeparator:":",pluralSeparator:"_",contextSeparator:"_",partialBundledLanguages:!1,saveMissing:!1,updateMissing:!1,saveMissingTo:"fallback",saveMissingPlurals:!0,missingKeyHandler:!1,missingInterpolationHandler:!1,postProcess:!1,postProcessPassResolved:!1,returnNull:!0,returnEmptyString:!0,returnObjects:!1,joinArrays:!1,returnedObjectHandler:!1,parseMissingKeyHandler:!1,appendNamespaceToMissingKey:!1,appendNamespaceToCIMode:!1,overloadTranslationOptionHandler:function(t){var n={};if("object"===e(t[1])&&(n=t[1]),"string"==typeof t[1]&&(n.defaultValue=t[1]),"string"==typeof t[2]&&(n.tDescription=t[2]),"object"===e(t[2])||"object"===e(t[3])){var o=t[3]||t[2];Object.keys(o).forEach(function(e){n[e]=o[e]})}return n},interpolation:{escapeValue:!0,format:function(e,t,n,o){return e},prefix:"{{",suffix:"}}",formatSeparator:",",unescapePrefix:"-",nestingPrefix:"$t(",nestingSuffix:")",nestingOptionsSeparator:",",maxReplaces:1e3,skipOnVariables:!1}},this.options,A(o)),this.format=this.options.interpolation.format,i||(i=U),!this.options.isClone){this.modules.logger?g.init(r(this.modules.logger),this.options):g.init(null,this.options);var a=new j(this.options);this.store=new L(this.options.resources,this.options);var s=this.services;s.logger=g,s.resourceStore=this.store,s.languageUtils=a,s.pluralResolver=new F(a,{prepend:this.options.pluralSeparator,compatibilityJSON:this.options.compatibilityJSON,simplifyPluralSuffix:this.options.simplifyPluralSuffix}),s.interpolator=new V(this.options),s.utils={hasLoadedNamespace:this.hasLoadedNamespace.bind(this)},s.backendConnector=new T(r(this.modules.backend),s.resourceStore,s,this.options),s.backendConnector.on("*",function(e){for(var n=arguments.length,o=new Array(n>1?n-1:0),i=1;i<n;i++)o[i-1]=arguments[i];t.emit.apply(t,[e].concat(o))}),this.modules.languageDetector&&(s.languageDetector=r(this.modules.languageDetector),s.languageDetector.init(s,this.options.detection,this.options)),this.modules.i18nFormat&&(s.i18nFormat=r(this.modules.i18nFormat),s.i18nFormat.init&&s.i18nFormat.init(this)),this.translator=new C(this.services,this.options),this.translator.on("*",function(e){for(var n=arguments.length,o=new Array(n>1?n-1:0),i=1;i<n;i++)o[i-1]=arguments[i];t.emit.apply(t,[e].concat(o))}),this.modules.external.forEach(function(e){e.init&&e.init(t)})}this.modules.languageDetector||this.options.lng||this.logger.warn("init: no languageDetector is used and no lng is defined");["getResource","addResource","addResources","addResourceBundle","removeResourceBundle","hasResourceBundle","getResourceBundle","getDataByLanguage"].forEach(function(e){t[e]=function(){var n;return(n=t.store)[e].apply(n,arguments)}});var u=h(),l=function(){t.changeLanguage(t.options.lng,function(e,n){t.isInitialized=!0,t.logger.log("initialized",t.options),t.emit("initialized",t.options),u.resolve(n),i(e,n)})};return this.options.resources||!this.options.initImmediate?l():setTimeout(l,0),u}},{key:"loadResources",value:function(e){var t=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:U,o="string"==typeof e?e:this.language;if("function"==typeof e&&(n=e),!this.options.resources||this.options.partialBundledLanguages){if(o&&"cimode"===o.toLowerCase())return n();var i=[],r=function(e){e&&t.services.languageUtils.toResolveHierarchy(e).forEach(function(e){i.indexOf(e)<0&&i.push(e)})};if(o)r(o);else this.services.languageUtils.getFallbackCodes(this.options.fallbackLng).forEach(function(e){return r(e)});this.options.preload&&this.options.preload.forEach(function(e){return r(e)}),this.services.backendConnector.load(i,this.options.ns,n)}else n(null)}},{key:"reloadResources",value:function(e,t,n){var o=h();return e||(e=this.languages),t||(t=this.options.ns),n||(n=U),this.services.backendConnector.reload(e,t,function(e){o.resolve(),n(e)}),o}},{key:"use",value:function(e){if(!e)throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");if(!e.type)throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");return"backend"===e.type&&(this.modules.backend=e),("logger"===e.type||e.log&&e.warn&&e.error)&&(this.modules.logger=e),"languageDetector"===e.type&&(this.modules.languageDetector=e),"i18nFormat"===e.type&&(this.modules.i18nFormat=e),"postProcessor"===e.type&&O.addPostProcessor(e),"3rdParty"===e.type&&this.modules.external.push(e),this}},{key:"changeLanguage",value:function(e,t){var n=this;this.isLanguageChangingTo=e;var o=h();this.emit("languageChanging",e);var i=function(e){var i="string"==typeof e?e:n.services.languageUtils.getBestMatchFromCodes(e);i&&(n.language||(n.language=i,n.languages=n.services.languageUtils.toResolveHierarchy(i)),n.translator.language||n.translator.changeLanguage(i),n.services.languageDetector&&n.services.languageDetector.cacheUserLanguage(i)),n.loadResources(i,function(e){!function(e,i){i?(n.language=i,n.languages=n.services.languageUtils.toResolveHierarchy(i),n.translator.changeLanguage(i),n.isLanguageChangingTo=void 0,n.emit("languageChanged",i),n.logger.log("languageChanged",i)):n.isLanguageChangingTo=void 0,o.resolve(function(){return n.t.apply(n,arguments)}),t&&t(e,function(){return n.t.apply(n,arguments)})}(e,i)})};return e||!this.services.languageDetector||this.services.languageDetector.async?!e&&this.services.languageDetector&&this.services.languageDetector.async?this.services.languageDetector.detect(i):i(e):i(this.services.languageDetector.detect()),o}},{key:"getFixedT",value:function(t,o){var i=this,r=function t(o,r){var a;if("object"!==e(r)){for(var s=arguments.length,u=new Array(s>2?s-2:0),l=2;l<s;l++)u[l-2]=arguments[l];a=i.options.overloadTranslationOptionHandler([o,r].concat(u))}else a=n({},r);return a.lng=a.lng||t.lng,a.lngs=a.lngs||t.lngs,a.ns=a.ns||t.ns,i.t(o,a)};return"string"==typeof t?r.lng=t:r.lngs=t,r.ns=o,r}},{key:"t",value:function(){var e;return this.translator&&(e=this.translator).translate.apply(e,arguments)}},{key:"exists",value:function(){var e;return this.translator&&(e=this.translator).exists.apply(e,arguments)}},{key:"setDefaultNamespace",value:function(e){this.options.defaultNS=e}},{key:"hasLoadedNamespace",value:function(e){var t=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(!this.isInitialized)return this.logger.warn("hasLoadedNamespace: i18next was not initialized",this.languages),!1;if(!this.languages||!this.languages.length)return this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty",this.languages),!1;var o=this.languages[0],i=!!this.options&&this.options.fallbackLng,r=this.languages[this.languages.length-1];if("cimode"===o.toLowerCase())return!0;var a=function(e,n){var o=t.services.backendConnector.state["".concat(e,"|").concat(n)];return-1===o||2===o};if(n.precheck){var s=n.precheck(this,a);if(void 0!==s)return s}return!!this.hasResourceBundle(o,e)||(!this.services.backendConnector.backend||!(!a(o,e)||i&&!a(r,e)))}},{key:"loadNamespaces",value:function(e,t){var n=this,o=h();return this.options.ns?("string"==typeof e&&(e=[e]),e.forEach(function(e){n.options.ns.indexOf(e)<0&&n.options.ns.push(e)}),this.loadResources(function(e){o.resolve(),t&&t(e)}),o):(t&&t(),Promise.resolve())}},{key:"loadLanguages",value:function(e,t){var n=h();"string"==typeof e&&(e=[e]);var o=this.options.preload||[],i=e.filter(function(e){return o.indexOf(e)<0});return i.length?(this.options.preload=o.concat(i),this.loadResources(function(e){n.resolve(),t&&t(e)}),n):(t&&t(),Promise.resolve())}},{key:"dir",value:function(e){if(e||(e=this.languages&&this.languages.length>0?this.languages[0]:this.language),!e)return"rtl";return["ar","shu","sqr","ssh","xaa","yhd","yud","aao","abh","abv","acm","acq","acw","acx","acy","adf","ads","aeb","aec","afb","ajp","apc","apd","arb","arq","ars","ary","arz","auz","avl","ayh","ayl","ayn","ayp","bbz","pga","he","iw","ps","pbt","pbu","pst","prp","prd","ug","ur","ydd","yds","yih","ji","yi","hbo","men","xmn","fa","jpr","peo","pes","prs","dv","sam"].indexOf(this.services.languageUtils.getLanguagePartFromCode(e))>=0?"rtl":"ltr"}},{key:"createInstance",value:function(){return new i(arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},arguments.length>1?arguments[1]:void 0)}},{key:"cloneInstance",value:function(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:U,r=n({},this.options,t,{isClone:!0}),a=new i(r);return["store","services","language"].forEach(function(t){a[t]=e[t]}),a.services=n({},this.services),a.services.utils={hasLoadedNamespace:a.hasLoadedNamespace.bind(a)},a.translator=new C(a.services,a.options),a.translator.on("*",function(e){for(var t=arguments.length,n=new Array(t>1?t-1:0),o=1;o<t;o++)n[o-1]=arguments[o];a.emit.apply(a,[e].concat(n))}),a.init(r,o),a.translator.options=a.options,a.translator.backendConnector.services.utils={hasLoadedNamespace:a.hasLoadedNamespace.bind(a)},a}}]),i}())});

    module.exports = {'i18next': module.exports};
});

Numbas.queueScript('decimal',[],function(module) {
/* decimal.js v10.1.1 https://github.com/MikeMcl/decimal.js/LICENCE */
!function(n){"use strict";var h,R,e,o,u=9e15,g=1e9,m="0123456789abcdef",t="2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058",r="3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789",c={precision:20,rounding:4,modulo:1,toExpNeg:-7,toExpPos:21,minE:-u,maxE:u,crypto:!1},N=!0,f="[DecimalError] ",w=f+"Invalid argument: ",s=f+"Precision limit exceeded",a=f+"crypto unavailable",L=Math.floor,v=Math.pow,l=/^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i,d=/^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i,p=/^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i,b=/^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,T=1e7,U=7,E=t.length-1,x=r.length-1,y={name:"[object Decimal]"};function M(n){var e,i,t,r=n.length-1,s="",o=n[0];if(0<r){for(s+=o,e=1;e<r;e++)t=n[e]+"",(i=U-t.length)&&(s+=C(i)),s+=t;o=n[e],(i=U-(t=o+"").length)&&(s+=C(i))}else if(0===o)return"0";for(;o%10==0;)o/=10;return s+o}function q(n,e,i){if(n!==~~n||n<e||i<n)throw Error(w+n)}function O(n,e,i,t){var r,s,o;for(s=n[0];10<=s;s/=10)--e;return--e<0?(e+=U,r=0):(r=Math.ceil((e+1)/U),e%=U),s=v(10,U-e),o=n[r]%s|0,null==t?e<3?(0==e?o=o/100|0:1==e&&(o=o/10|0),i<4&&99999==o||3<i&&49999==o||5e4==o||0==o):(i<4&&o+1==s||3<i&&o+1==s/2)&&(n[r+1]/s/100|0)==v(10,e-2)-1||(o==s/2||0==o)&&0==(n[r+1]/s/100|0):e<4?(0==e?o=o/1e3|0:1==e?o=o/100|0:2==e&&(o=o/10|0),(t||i<4)&&9999==o||!t&&3<i&&4999==o):((t||i<4)&&o+1==s||!t&&3<i&&o+1==s/2)&&(n[r+1]/s/1e3|0)==v(10,e-3)-1}function D(n,e,i){for(var t,r,s=[0],o=0,u=n.length;o<u;){for(r=s.length;r--;)s[r]*=e;for(s[0]+=m.indexOf(n.charAt(o++)),t=0;t<s.length;t++)s[t]>i-1&&(void 0===s[t+1]&&(s[t+1]=0),s[t+1]+=s[t]/i|0,s[t]%=i)}return s.reverse()}y.absoluteValue=y.abs=function(){var n=new this.constructor(this);return n.s<0&&(n.s=1),_(n)},y.ceil=function(){return _(new this.constructor(this),this.e+1,2)},y.comparedTo=y.cmp=function(n){var e,i,t,r,s=this,o=s.d,u=(n=new s.constructor(n)).d,c=s.s,f=n.s;if(!o||!u)return c&&f?c!==f?c:o===u?0:!o^c<0?1:-1:NaN;if(!o[0]||!u[0])return o[0]?c:u[0]?-f:0;if(c!==f)return c;if(s.e!==n.e)return s.e>n.e^c<0?1:-1;for(e=0,i=(t=o.length)<(r=u.length)?t:r;e<i;++e)if(o[e]!==u[e])return o[e]>u[e]^c<0?1:-1;return t===r?0:r<t^c<0?1:-1},y.cosine=y.cos=function(){var n,e,i=this,t=i.constructor;return i.d?i.d[0]?(n=t.precision,e=t.rounding,t.precision=n+Math.max(i.e,i.sd())+U,t.rounding=1,i=function(n,e){var i,t,r=e.d.length;t=r<32?(i=Math.ceil(r/3),Math.pow(4,-i).toString()):(i=16,"2.3283064365386962890625e-10");n.precision+=i,e=W(n,1,e.times(t),new n(1));for(var s=i;s--;){var o=e.times(e);e=o.times(o).minus(o).times(8).plus(1)}return n.precision-=i,e}(t,J(t,i)),t.precision=n,t.rounding=e,_(2==o||3==o?i.neg():i,n,e,!0)):new t(1):new t(NaN)},y.cubeRoot=y.cbrt=function(){var n,e,i,t,r,s,o,u,c,f,a=this,h=a.constructor;if(!a.isFinite()||a.isZero())return new h(a);for(N=!1,(s=a.s*Math.pow(a.s*a,1/3))&&Math.abs(s)!=1/0?t=new h(s.toString()):(i=M(a.d),(s=((n=a.e)-i.length+1)%3)&&(i+=1==s||-2==s?"0":"00"),s=Math.pow(i,1/3),n=L((n+1)/3)-(n%3==(n<0?-1:2)),(t=new h(i=s==1/0?"5e"+n:(i=s.toExponential()).slice(0,i.indexOf("e")+1)+n)).s=a.s),o=(n=h.precision)+3;;)if(f=(c=(u=t).times(u).times(u)).plus(a),t=F(f.plus(a).times(u),f.plus(c),o+2,1),M(u.d).slice(0,o)===(i=M(t.d)).slice(0,o)){if("9999"!=(i=i.slice(o-3,o+1))&&(r||"4999"!=i)){+i&&(+i.slice(1)||"5"!=i.charAt(0))||(_(t,n+1,1),e=!t.times(t).times(t).eq(a));break}if(!r&&(_(u,n+1,0),u.times(u).times(u).eq(a))){t=u;break}o+=4,r=1}return N=!0,_(t,n,h.rounding,e)},y.decimalPlaces=y.dp=function(){var n,e=this.d,i=NaN;if(e){if(i=((n=e.length-1)-L(this.e/U))*U,n=e[n])for(;n%10==0;n/=10)i--;i<0&&(i=0)}return i},y.dividedBy=y.div=function(n){return F(this,new this.constructor(n))},y.dividedToIntegerBy=y.divToInt=function(n){var e=this.constructor;return _(F(this,new e(n),0,1,1),e.precision,e.rounding)},y.equals=y.eq=function(n){return 0===this.cmp(n)},y.floor=function(){return _(new this.constructor(this),this.e+1,3)},y.greaterThan=y.gt=function(n){return 0<this.cmp(n)},y.greaterThanOrEqualTo=y.gte=function(n){var e=this.cmp(n);return 1==e||0===e},y.hyperbolicCosine=y.cosh=function(){var n,e,i,t,r,s=this,o=s.constructor,u=new o(1);if(!s.isFinite())return new o(s.s?1/0:NaN);if(s.isZero())return u;i=o.precision,t=o.rounding,o.precision=i+Math.max(s.e,s.sd())+4,o.rounding=1,e=(r=s.d.length)<32?(n=Math.ceil(r/3),Math.pow(4,-n).toString()):(n=16,"2.3283064365386962890625e-10"),s=W(o,1,s.times(e),new o(1),!0);for(var c,f=n,a=new o(8);f--;)c=s.times(s),s=u.minus(c.times(a.minus(c.times(a))));return _(s,o.precision=i,o.rounding=t,!0)},y.hyperbolicSine=y.sinh=function(){var n,e,i,t,r=this,s=r.constructor;if(!r.isFinite()||r.isZero())return new s(r);if(e=s.precision,i=s.rounding,s.precision=e+Math.max(r.e,r.sd())+4,s.rounding=1,(t=r.d.length)<3)r=W(s,2,r,r,!0);else{n=16<(n=1.4*Math.sqrt(t))?16:0|n,r=W(s,2,r=r.times(Math.pow(5,-n)),r,!0);for(var o,u=new s(5),c=new s(16),f=new s(20);n--;)o=r.times(r),r=r.times(u.plus(o.times(c.times(o).plus(f))))}return _(r,s.precision=e,s.rounding=i,!0)},y.hyperbolicTangent=y.tanh=function(){var n,e,i=this,t=i.constructor;return i.isFinite()?i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+7,t.rounding=1,F(i.sinh(),i.cosh(),t.precision=n,t.rounding=e)):new t(i.s)},y.inverseCosine=y.acos=function(){var n,e=this,i=e.constructor,t=e.abs().cmp(1),r=i.precision,s=i.rounding;return-1!==t?0===t?e.isNeg()?P(i,r,s):new i(0):new i(NaN):e.isZero()?P(i,r+4,s).times(.5):(i.precision=r+6,i.rounding=1,e=e.asin(),n=P(i,r+4,s).times(.5),i.precision=r,i.rounding=s,n.minus(e))},y.inverseHyperbolicCosine=y.acosh=function(){var n,e,i=this,t=i.constructor;return i.lte(1)?new t(i.eq(1)?0:NaN):i.isFinite()?(n=t.precision,e=t.rounding,t.precision=n+Math.max(Math.abs(i.e),i.sd())+4,t.rounding=1,N=!1,i=i.times(i).minus(1).sqrt().plus(i),N=!0,t.precision=n,t.rounding=e,i.ln()):new t(i)},y.inverseHyperbolicSine=y.asinh=function(){var n,e,i=this,t=i.constructor;return!i.isFinite()||i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+2*Math.max(Math.abs(i.e),i.sd())+6,t.rounding=1,N=!1,i=i.times(i).plus(1).sqrt().plus(i),N=!0,t.precision=n,t.rounding=e,i.ln())},y.inverseHyperbolicTangent=y.atanh=function(){var n,e,i,t,r=this,s=r.constructor;return r.isFinite()?0<=r.e?new s(r.abs().eq(1)?r.s/0:r.isZero()?r:NaN):(n=s.precision,e=s.rounding,t=r.sd(),Math.max(t,n)<2*-r.e-1?_(new s(r),n,e,!0):(s.precision=i=t-r.e,r=F(r.plus(1),new s(1).minus(r),i+n,1),s.precision=n+4,s.rounding=1,r=r.ln(),s.precision=n,s.rounding=e,r.times(.5))):new s(NaN)},y.inverseSine=y.asin=function(){var n,e,i,t,r=this,s=r.constructor;return r.isZero()?new s(r):(e=r.abs().cmp(1),i=s.precision,t=s.rounding,-1!==e?0===e?((n=P(s,i+4,t).times(.5)).s=r.s,n):new s(NaN):(s.precision=i+6,s.rounding=1,r=r.div(new s(1).minus(r.times(r)).sqrt().plus(1)).atan(),s.precision=i,s.rounding=t,r.times(2)))},y.inverseTangent=y.atan=function(){var n,e,i,t,r,s,o,u,c,f=this,a=f.constructor,h=a.precision,l=a.rounding;if(f.isFinite()){if(f.isZero())return new a(f);if(f.abs().eq(1)&&h+4<=x)return(o=P(a,h+4,l).times(.25)).s=f.s,o}else{if(!f.s)return new a(NaN);if(h+4<=x)return(o=P(a,h+4,l).times(.5)).s=f.s,o}for(a.precision=u=h+10,a.rounding=1,n=i=Math.min(28,u/U+2|0);n;--n)f=f.div(f.times(f).plus(1).sqrt().plus(1));for(N=!1,e=Math.ceil(u/U),t=1,c=f.times(f),o=new a(f),r=f;-1!==n;)if(r=r.times(c),s=o.minus(r.div(t+=2)),r=r.times(c),void 0!==(o=s.plus(r.div(t+=2))).d[e])for(n=e;o.d[n]===s.d[n]&&n--;);return i&&(o=o.times(2<<i-1)),N=!0,_(o,a.precision=h,a.rounding=l,!0)},y.isFinite=function(){return!!this.d},y.isInteger=y.isInt=function(){return!!this.d&&L(this.e/U)>this.d.length-2},y.isNaN=function(){return!this.s},y.isNegative=y.isNeg=function(){return this.s<0},y.isPositive=y.isPos=function(){return 0<this.s},y.isZero=function(){return!!this.d&&0===this.d[0]},y.lessThan=y.lt=function(n){return this.cmp(n)<0},y.lessThanOrEqualTo=y.lte=function(n){return this.cmp(n)<1},y.logarithm=y.log=function(n){var e,i,t,r,s,o,u,c,f=this,a=f.constructor,h=a.precision,l=a.rounding;if(null==n)n=new a(10),e=!0;else{if(i=(n=new a(n)).d,n.s<0||!i||!i[0]||n.eq(1))return new a(NaN);e=n.eq(10)}if(i=f.d,f.s<0||!i||!i[0]||f.eq(1))return new a(i&&!i[0]?-1/0:1!=f.s?NaN:i?0:1/0);if(e)if(1<i.length)s=!0;else{for(r=i[0];r%10==0;)r/=10;s=1!==r}if(N=!1,o=V(f,u=h+5),t=e?Z(a,u+10):V(n,u),O((c=F(o,t,u,1)).d,r=h,l))do{if(o=V(f,u+=10),t=e?Z(a,u+10):V(n,u),c=F(o,t,u,1),!s){+M(c.d).slice(r+1,r+15)+1==1e14&&(c=_(c,h+1,0));break}}while(O(c.d,r+=10,l));return N=!0,_(c,h,l)},y.minus=y.sub=function(n){var e,i,t,r,s,o,u,c,f,a,h,l,d=this,p=d.constructor;if(n=new p(n),!d.d||!n.d)return d.s&&n.s?d.d?n.s=-n.s:n=new p(n.d||d.s!==n.s?d:NaN):n=new p(NaN),n;if(d.s!=n.s)return n.s=-n.s,d.plus(n);if(f=d.d,l=n.d,u=p.precision,c=p.rounding,!f[0]||!l[0]){if(l[0])n.s=-n.s;else{if(!f[0])return new p(3===c?-0:0);n=new p(d)}return N?_(n,u,c):n}if(i=L(n.e/U),a=L(d.e/U),f=f.slice(),s=a-i){for(o=(h=s<0)?(e=f,s=-s,l.length):(e=l,i=a,f.length),(t=Math.max(Math.ceil(u/U),o)+2)<s&&(s=t,e.length=1),e.reverse(),t=s;t--;)e.push(0);e.reverse()}else{for((h=(t=f.length)<(o=l.length))&&(o=t),t=0;t<o;t++)if(f[t]!=l[t]){h=f[t]<l[t];break}s=0}for(h&&(e=f,f=l,l=e,n.s=-n.s),o=f.length,t=l.length-o;0<t;--t)f[o++]=0;for(t=l.length;s<t;){if(f[--t]<l[t]){for(r=t;r&&0===f[--r];)f[r]=T-1;--f[r],f[t]+=T}f[t]-=l[t]}for(;0===f[--o];)f.pop();for(;0===f[0];f.shift())--i;return f[0]?(n.d=f,n.e=S(f,i),N?_(n,u,c):n):new p(3===c?-0:0)},y.modulo=y.mod=function(n){var e,i=this,t=i.constructor;return n=new t(n),!i.d||!n.s||n.d&&!n.d[0]?new t(NaN):!n.d||i.d&&!i.d[0]?_(new t(i),t.precision,t.rounding):(N=!1,9==t.modulo?(e=F(i,n.abs(),0,3,1)).s*=n.s:e=F(i,n,0,t.modulo,1),e=e.times(n),N=!0,i.minus(e))},y.naturalExponential=y.exp=function(){return B(this)},y.naturalLogarithm=y.ln=function(){return V(this)},y.negated=y.neg=function(){var n=new this.constructor(this);return n.s=-n.s,_(n)},y.plus=y.add=function(n){var e,i,t,r,s,o,u,c,f,a,h=this,l=h.constructor;if(n=new l(n),!h.d||!n.d)return h.s&&n.s?h.d||(n=new l(n.d||h.s===n.s?h:NaN)):n=new l(NaN),n;if(h.s!=n.s)return n.s=-n.s,h.minus(n);if(f=h.d,a=n.d,u=l.precision,c=l.rounding,!f[0]||!a[0])return a[0]||(n=new l(h)),N?_(n,u,c):n;if(s=L(h.e/U),t=L(n.e/U),f=f.slice(),r=s-t){for((o=(o=r<0?(i=f,r=-r,a.length):(i=a,t=s,f.length))<(s=Math.ceil(u/U))?s+1:o+1)<r&&(r=o,i.length=1),i.reverse();r--;)i.push(0);i.reverse()}for((o=f.length)-(r=a.length)<0&&(r=o,i=a,a=f,f=i),e=0;r;)e=(f[--r]=f[r]+a[r]+e)/T|0,f[r]%=T;for(e&&(f.unshift(e),++t),o=f.length;0==f[--o];)f.pop();return n.d=f,n.e=S(f,t),N?_(n,u,c):n},y.precision=y.sd=function(n){var e;if(void 0!==n&&n!==!!n&&1!==n&&0!==n)throw Error(w+n);return this.d?(e=k(this.d),n&&this.e+1>e&&(e=this.e+1)):e=NaN,e},y.round=function(){var n=this.constructor;return _(new n(this),this.e+1,n.rounding)},y.sine=y.sin=function(){var n,e,i=this,t=i.constructor;return i.isFinite()?i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+Math.max(i.e,i.sd())+U,t.rounding=1,i=function(n,e){var i,t=e.d.length;if(t<3)return W(n,2,e,e);i=16<(i=1.4*Math.sqrt(t))?16:0|i,e=e.times(Math.pow(5,-i)),e=W(n,2,e,e);for(var r,s=new n(5),o=new n(16),u=new n(20);i--;)r=e.times(e),e=e.times(s.plus(r.times(o.times(r).minus(u))));return e}(t,J(t,i)),t.precision=n,t.rounding=e,_(2<o?i.neg():i,n,e,!0)):new t(NaN)},y.squareRoot=y.sqrt=function(){var n,e,i,t,r,s,o=this,u=o.d,c=o.e,f=o.s,a=o.constructor;if(1!==f||!u||!u[0])return new a(!f||f<0&&(!u||u[0])?NaN:u?o:1/0);for(N=!1,t=0==(f=Math.sqrt(+o))||f==1/0?(((e=M(u)).length+c)%2==0&&(e+="0"),f=Math.sqrt(e),c=L((c+1)/2)-(c<0||c%2),new a(e=f==1/0?"1e"+c:(e=f.toExponential()).slice(0,e.indexOf("e")+1)+c)):new a(f.toString()),i=(c=a.precision)+3;;)if(t=(s=t).plus(F(o,s,i+2,1)).times(.5),M(s.d).slice(0,i)===(e=M(t.d)).slice(0,i)){if("9999"!=(e=e.slice(i-3,i+1))&&(r||"4999"!=e)){+e&&(+e.slice(1)||"5"!=e.charAt(0))||(_(t,c+1,1),n=!t.times(t).eq(o));break}if(!r&&(_(s,c+1,0),s.times(s).eq(o))){t=s;break}i+=4,r=1}return N=!0,_(t,c,a.rounding,n)},y.tangent=y.tan=function(){var n,e,i=this,t=i.constructor;return i.isFinite()?i.isZero()?new t(i):(n=t.precision,e=t.rounding,t.precision=n+10,t.rounding=1,(i=i.sin()).s=1,i=F(i,new t(1).minus(i.times(i)).sqrt(),n+10,0),t.precision=n,t.rounding=e,_(2==o||4==o?i.neg():i,n,e,!0)):new t(NaN)},y.times=y.mul=function(n){var e,i,t,r,s,o,u,c,f,a=this.constructor,h=this.d,l=(n=new a(n)).d;if(n.s*=this.s,!(h&&h[0]&&l&&l[0]))return new a(!n.s||h&&!h[0]&&!l||l&&!l[0]&&!h?NaN:h&&l?0*n.s:n.s/0);for(i=L(this.e/U)+L(n.e/U),(c=h.length)<(f=l.length)&&(s=h,h=l,l=s,o=c,c=f,f=o),s=[],t=o=c+f;t--;)s.push(0);for(t=f;0<=--t;){for(e=0,r=c+t;t<r;)u=s[r]+l[t]*h[r-t-1]+e,s[r--]=u%T|0,e=u/T|0;s[r]=(s[r]+e)%T|0}for(;!s[--o];)s.pop();return e?++i:s.shift(),n.d=s,n.e=S(s,i),N?_(n,a.precision,a.rounding):n},y.toBinary=function(n,e){return z(this,2,n,e)},y.toDecimalPlaces=y.toDP=function(n,e){var i=this,t=i.constructor;return i=new t(i),void 0===n?i:(q(n,0,g),void 0===e?e=t.rounding:q(e,0,8),_(i,n+i.e+1,e))},y.toExponential=function(n,e){var i,t=this,r=t.constructor;return i=void 0===n?A(t,!0):(q(n,0,g),void 0===e?e=r.rounding:q(e,0,8),A(t=_(new r(t),n+1,e),!0,n+1)),t.isNeg()&&!t.isZero()?"-"+i:i},y.toFixed=function(n,e){var i,t,r=this,s=r.constructor;return i=void 0===n?A(r):(q(n,0,g),void 0===e?e=s.rounding:q(e,0,8),A(t=_(new s(r),n+r.e+1,e),!1,n+t.e+1)),r.isNeg()&&!r.isZero()?"-"+i:i},y.toFraction=function(n){var e,i,t,r,s,o,u,c,f,a,h,l,d=this,p=d.d,g=d.constructor;if(!p)return new g(d);if(f=i=new g(1),o=(s=(e=new g(t=c=new g(0))).e=k(p)-d.e-1)%U,e.d[0]=v(10,o<0?U+o:o),null==n)n=0<s?e:f;else{if(!(u=new g(n)).isInt()||u.lt(f))throw Error(w+u);n=u.gt(e)?0<s?e:f:u}for(N=!1,u=new g(M(p)),a=g.precision,g.precision=s=p.length*U*2;h=F(u,e,0,1,1),1!=(r=i.plus(h.times(t))).cmp(n);)i=t,t=r,r=f,f=c.plus(h.times(r)),c=r,r=e,e=u.minus(h.times(r)),u=r;return r=F(n.minus(i),t,0,1,1),c=c.plus(r.times(f)),i=i.plus(r.times(t)),c.s=f.s=d.s,l=F(f,t,s,1).minus(d).abs().cmp(F(c,i,s,1).minus(d).abs())<1?[f,t]:[c,i],g.precision=a,N=!0,l},y.toHexadecimal=y.toHex=function(n,e){return z(this,16,n,e)},y.toNearest=function(n,e){var i=this,t=i.constructor;if(i=new t(i),null==n){if(!i.d)return i;n=new t(1),e=t.rounding}else{if(n=new t(n),void 0===e?e=t.rounding:q(e,0,8),!i.d)return n.s?i:n;if(!n.d)return n.s&&(n.s=i.s),n}return n.d[0]?(N=!1,i=F(i,n,0,e,1).times(n),N=!0,_(i)):(n.s=i.s,i=n),i},y.toNumber=function(){return+this},y.toOctal=function(n,e){return z(this,8,n,e)},y.toPower=y.pow=function(n){var e,i,t,r,s,o,u=this,c=u.constructor,f=+(n=new c(n));if(!(u.d&&n.d&&u.d[0]&&n.d[0]))return new c(v(+u,f));if((u=new c(u)).eq(1))return u;if(t=c.precision,s=c.rounding,n.eq(1))return _(u,t,s);if((e=L(n.e/U))>=n.d.length-1&&(i=f<0?-f:f)<=9007199254740991)return r=I(c,u,i,t),n.s<0?new c(1).div(r):_(r,t,s);if((o=u.s)<0){if(e<n.d.length-1)return new c(NaN);if(0==(1&n.d[e])&&(o=1),0==u.e&&1==u.d[0]&&1==u.d.length)return u.s=o,u}return(e=0!=(i=v(+u,f))&&isFinite(i)?new c(i+"").e:L(f*(Math.log("0."+M(u.d))/Math.LN10+u.e+1)))>c.maxE+1||e<c.minE-1?new c(0<e?o/0:0):(N=!1,c.rounding=u.s=1,i=Math.min(12,(e+"").length),(r=B(n.times(V(u,t+i)),t)).d&&O((r=_(r,t+5,1)).d,t,s)&&(e=t+10,+M((r=_(B(n.times(V(u,e+i)),e),e+5,1)).d).slice(t+1,t+15)+1==1e14&&(r=_(r,t+1,0))),r.s=o,N=!0,_(r,t,c.rounding=s))},y.toPrecision=function(n,e){var i,t=this,r=t.constructor;return i=void 0===n?A(t,t.e<=r.toExpNeg||t.e>=r.toExpPos):(q(n,1,g),void 0===e?e=r.rounding:q(e,0,8),A(t=_(new r(t),n,e),n<=t.e||t.e<=r.toExpNeg,n)),t.isNeg()&&!t.isZero()?"-"+i:i},y.toSignificantDigits=y.toSD=function(n,e){var i=this.constructor;return void 0===n?(n=i.precision,e=i.rounding):(q(n,1,g),void 0===e?e=i.rounding:q(e,0,8)),_(new i(this),n,e)},y.toString=function(){var n=this,e=n.constructor,i=A(n,n.e<=e.toExpNeg||n.e>=e.toExpPos);return n.isNeg()&&!n.isZero()?"-"+i:i},y.truncated=y.trunc=function(){return _(new this.constructor(this),this.e+1,1)},y.valueOf=y.toJSON=function(){var n=this,e=n.constructor,i=A(n,n.e<=e.toExpNeg||n.e>=e.toExpPos);return n.isNeg()?"-"+i:i};var F=function(){function S(n,e,i){var t,r=0,s=n.length;for(n=n.slice();s--;)t=n[s]*e+r,n[s]=t%i|0,r=t/i|0;return r&&n.unshift(r),n}function Z(n,e,i,t){var r,s;if(i!=t)s=t<i?1:-1;else for(r=s=0;r<i;r++)if(n[r]!=e[r]){s=n[r]>e[r]?1:-1;break}return s}function P(n,e,i,t){for(var r=0;i--;)n[i]-=r,r=n[i]<e[i]?1:0,n[i]=r*t+n[i]-e[i];for(;!n[0]&&1<n.length;)n.shift()}return function(n,e,i,t,r,s){var o,u,c,f,a,h,l,d,p,g,m,w,v,N,b,E,x,y,M,q,O=n.constructor,D=n.s==e.s?1:-1,F=n.d,A=e.d;if(!(F&&F[0]&&A&&A[0]))return new O(n.s&&e.s&&(F?!A||F[0]!=A[0]:A)?F&&0==F[0]||!A?0*D:D/0:NaN);for(u=s?(a=1,n.e-e.e):(s=T,a=U,L(n.e/a)-L(e.e/a)),M=A.length,x=F.length,g=(p=new O(D)).d=[],c=0;A[c]==(F[c]||0);c++);if(A[c]>(F[c]||0)&&u--,null==i?(N=i=O.precision,t=O.rounding):N=r?i+(n.e-e.e)+1:i,N<0)g.push(1),h=!0;else{if(N=N/a+2|0,c=0,1==M){for(A=A[f=0],N++;(c<x||f)&&N--;c++)b=f*s+(F[c]||0),g[c]=b/A|0,f=b%A|0;h=f||c<x}else{for(1<(f=s/(A[0]+1)|0)&&(A=S(A,f,s),F=S(F,f,s),M=A.length,x=F.length),E=M,w=(m=F.slice(0,M)).length;w<M;)m[w++]=0;for((q=A.slice()).unshift(0),y=A[0],A[1]>=s/2&&++y;f=0,(o=Z(A,m,M,w))<0?(v=m[0],M!=w&&(v=v*s+(m[1]||0)),1<(f=v/y|0)?(s<=f&&(f=s-1),1==(o=Z(l=S(A,f,s),m,d=l.length,w=m.length))&&(f--,P(l,M<d?q:A,d,s))):(0==f&&(o=f=1),l=A.slice()),(d=l.length)<w&&l.unshift(0),P(m,l,w,s),-1==o&&(o=Z(A,m,M,w=m.length))<1&&(f++,P(m,M<w?q:A,w,s)),w=m.length):0===o&&(f++,m=[0]),g[c++]=f,o&&m[0]?m[w++]=F[E]||0:(m=[F[E]],w=1),(E++<x||void 0!==m[0])&&N--;);h=void 0!==m[0]}g[0]||g.shift()}if(1==a)p.e=u,R=h;else{for(c=1,f=g[0];10<=f;f/=10)c++;p.e=c+u*a-1,_(p,r?i+p.e+1:i,t,h)}return p}}();function _(n,e,i,t){var r,s,o,u,c,f,a,h,l,d=n.constructor;n:if(null!=e){if(!(h=n.d))return n;for(r=1,u=h[0];10<=u;u/=10)r++;if((s=e-r)<0)s+=U,o=e,c=(a=h[l=0])/v(10,r-o-1)%10|0;else if(l=Math.ceil((s+1)/U),(u=h.length)<=l){if(!t)break n;for(;u++<=l;)h.push(0);a=c=0,o=(s%=U)-U+(r=1)}else{for(a=u=h[l],r=1;10<=u;u/=10)r++;c=(o=(s%=U)-U+r)<0?0:a/v(10,r-o-1)%10|0}if(t=t||e<0||void 0!==h[l+1]||(o<0?a:a%v(10,r-o-1)),f=i<4?(c||t)&&(0==i||i==(n.s<0?3:2)):5<c||5==c&&(4==i||t||6==i&&(0<s?0<o?a/v(10,r-o):0:h[l-1])%10&1||i==(n.s<0?8:7)),e<1||!h[0])return h.length=0,f?(e-=n.e+1,h[0]=v(10,(U-e%U)%U),n.e=-e||0):h[0]=n.e=0,n;if(0==s?(h.length=l,u=1,l--):(h.length=l+1,u=v(10,U-s),h[l]=0<o?(a/v(10,r-o)%v(10,o)|0)*u:0),f)for(;;){if(0==l){for(s=1,o=h[0];10<=o;o/=10)s++;for(o=h[0]+=u,u=1;10<=o;o/=10)u++;s!=u&&(n.e++,h[0]==T&&(h[0]=1));break}if(h[l]+=u,h[l]!=T)break;h[l--]=0,u=1}for(s=h.length;0===h[--s];)h.pop()}return N&&(n.e>d.maxE?(n.d=null,n.e=NaN):n.e<d.minE&&(n.e=0,n.d=[0])),n}function A(n,e,i){if(!n.isFinite())return j(n);var t,r=n.e,s=M(n.d),o=s.length;return e?(i&&0<(t=i-o)?s=s.charAt(0)+"."+s.slice(1)+C(t):1<o&&(s=s.charAt(0)+"."+s.slice(1)),s=s+(n.e<0?"e":"e+")+n.e):r<0?(s="0."+C(-r-1)+s,i&&0<(t=i-o)&&(s+=C(t))):o<=r?(s+=C(r+1-o),i&&0<(t=i-r-1)&&(s=s+"."+C(t))):((t=r+1)<o&&(s=s.slice(0,t)+"."+s.slice(t)),i&&0<(t=i-o)&&(r+1===o&&(s+="."),s+=C(t))),s}function S(n,e){var i=n[0];for(e*=U;10<=i;i/=10)e++;return e}function Z(n,e,i){if(E<e)throw N=!0,i&&(n.precision=i),Error(s);return _(new n(t),e,1,!0)}function P(n,e,i){if(x<e)throw Error(s);return _(new n(r),e,i,!0)}function k(n){var e=n.length-1,i=e*U+1;if(e=n[e]){for(;e%10==0;e/=10)i--;for(e=n[0];10<=e;e/=10)i++}return i}function C(n){for(var e="";n--;)e+="0";return e}function I(n,e,i,t){var r,s=new n(1),o=Math.ceil(t/U+4);for(N=!1;;){if(i%2&&G((s=s.times(e)).d,o)&&(r=!0),0===(i=L(i/2))){i=s.d.length-1,r&&0===s.d[i]&&++s.d[i];break}G((e=e.times(e)).d,o)}return N=!0,s}function H(n){return 1&n.d[n.d.length-1]}function i(n,e,i){for(var t,r=new n(e[0]),s=0;++s<e.length;){if(!(t=new n(e[s])).s){r=t;break}r[i](t)&&(r=t)}return r}function B(n,e){var i,t,r,s,o,u,c,f=0,a=0,h=0,l=n.constructor,d=l.rounding,p=l.precision;if(!n.d||!n.d[0]||17<n.e)return new l(n.d?n.d[0]?n.s<0?0:1/0:1:n.s?n.s<0?0:n:NaN);for(c=null==e?(N=!1,p):e,u=new l(.03125);-2<n.e;)n=n.times(u),h+=5;for(c+=t=Math.log(v(2,h))/Math.LN10*2+5|0,i=s=o=new l(1),l.precision=c;;){if(s=_(s.times(n),c,1),i=i.times(++a),M((u=o.plus(F(s,i,c,1))).d).slice(0,c)===M(o.d).slice(0,c)){for(r=h;r--;)o=_(o.times(o),c,1);if(null!=e)return l.precision=p,o;if(!(f<3&&O(o.d,c-t,d,f)))return _(o,l.precision=p,d,N=!0);l.precision=c+=10,i=s=u=new l(1),a=0,f++}o=u}}function V(n,e){var i,t,r,s,o,u,c,f,a,h,l,d=1,p=n,g=p.d,m=p.constructor,w=m.rounding,v=m.precision;if(p.s<0||!g||!g[0]||!p.e&&1==g[0]&&1==g.length)return new m(g&&!g[0]?-1/0:1!=p.s?NaN:g?0:p);if(a=null==e?(N=!1,v):e,m.precision=a+=10,t=(i=M(g)).charAt(0),!(Math.abs(s=p.e)<15e14))return f=Z(m,a+2,v).times(s+""),p=V(new m(t+"."+i.slice(1)),a-10).plus(f),m.precision=v,null==e?_(p,v,w,N=!0):p;for(;t<7&&1!=t||1==t&&3<i.charAt(1);)t=(i=M((p=p.times(n)).d)).charAt(0),d++;for(s=p.e,1<t?(p=new m("0."+i),s++):p=new m(t+"."+i.slice(1)),c=o=p=F((h=p).minus(1),p.plus(1),a,1),l=_(p.times(p),a,1),r=3;;){if(o=_(o.times(l),a,1),M((f=c.plus(F(o,new m(r),a,1))).d).slice(0,a)===M(c.d).slice(0,a)){if(c=c.times(2),0!==s&&(c=c.plus(Z(m,a+2,v).times(s+""))),c=F(c,new m(d),a,1),null!=e)return m.precision=v,c;if(!O(c.d,a-10,w,u))return _(c,m.precision=v,w,N=!0);m.precision=a+=10,f=o=p=F(h.minus(1),h.plus(1),a,1),l=_(p.times(p),a,1),r=u=1}c=f,r+=2}}function j(n){return String(n.s*n.s/0)}function $(n,e){var i,t,r;for(-1<(i=e.indexOf("."))&&(e=e.replace(".","")),0<(t=e.search(/e/i))?(i<0&&(i=t),i+=+e.slice(t+1),e=e.substring(0,t)):i<0&&(i=e.length),t=0;48===e.charCodeAt(t);t++);for(r=e.length;48===e.charCodeAt(r-1);--r);if(e=e.slice(t,r)){if(r-=t,n.e=i=i-t-1,n.d=[],t=(i+1)%U,i<0&&(t+=U),t<r){for(t&&n.d.push(+e.slice(0,t)),r-=U;t<r;)n.d.push(+e.slice(t,t+=U));e=e.slice(t),t=U-e.length}else t-=r;for(;t--;)e+="0";n.d.push(+e),N&&(n.e>n.constructor.maxE?(n.d=null,n.e=NaN):n.e<n.constructor.minE&&(n.e=0,n.d=[0]))}else n.e=0,n.d=[0];return n}function W(n,e,i,t,r){var s,o,u,c,f=n.precision,a=Math.ceil(f/U);for(N=!1,c=i.times(i),u=new n(t);;){if(o=F(u.times(c),new n(e++*e++),f,1),u=r?t.plus(o):t.minus(o),t=F(o.times(c),new n(e++*e++),f,1),void 0!==(o=u.plus(t)).d[a]){for(s=a;o.d[s]===u.d[s]&&s--;);if(-1==s)break}s=u,u=t,t=o,o=s,0}return N=!0,o.d.length=a+1,o}function J(n,e){var i,t=e.s<0,r=P(n,n.precision,1),s=r.times(.5);if((e=e.abs()).lte(s))return o=t?4:1,e;if((i=e.divToInt(r)).isZero())o=t?3:2;else{if((e=e.minus(i.times(r))).lte(s))return o=H(i)?t?2:3:t?4:1,e;o=H(i)?t?1:4:t?3:2}return e.minus(r).abs()}function z(n,e,i,t){var r,s,o,u,c,f,a,h,l,d=n.constructor,p=void 0!==i;if(p?(q(i,1,g),void 0===t?t=d.rounding:q(t,0,8)):(i=d.precision,t=d.rounding),n.isFinite()){for(p?(r=2,16==e?i=4*i-3:8==e&&(i=3*i-2)):r=e,0<=(o=(a=A(n)).indexOf("."))&&(a=a.replace(".",""),(l=new d(1)).e=a.length-o,l.d=D(A(l),10,r),l.e=l.d.length),s=c=(h=D(a,10,r)).length;0==h[--c];)h.pop();if(h[0]){if(o<0?s--:((n=new d(n)).d=h,n.e=s,h=(n=F(n,l,i,t,0,r)).d,s=n.e,f=R),o=h[i],u=r/2,f=f||void 0!==h[i+1],f=t<4?(void 0!==o||f)&&(0===t||t===(n.s<0?3:2)):u<o||o===u&&(4===t||f||6===t&&1&h[i-1]||t===(n.s<0?8:7)),h.length=i,f)for(;++h[--i]>r-1;)h[i]=0,i||(++s,h.unshift(1));for(c=h.length;!h[c-1];--c);for(o=0,a="";o<c;o++)a+=m.charAt(h[o]);if(p){if(1<c)if(16==e||8==e){for(o=16==e?4:3,--c;c%o;c++)a+="0";for(c=(h=D(a,r,e)).length;!h[c-1];--c);for(o=1,a="1.";o<c;o++)a+=m.charAt(h[o])}else a=a.charAt(0)+"."+a.slice(1);a=a+(s<0?"p":"p+")+s}else if(s<0){for(;++s;)a="0"+a;a="0."+a}else if(++s>c)for(s-=c;s--;)a+="0";else s<c&&(a=a.slice(0,s)+"."+a.slice(s))}else a=p?"0p+0":"0";a=(16==e?"0x":2==e?"0b":8==e?"0o":"")+a}else a=j(n);return n.s<0?"-"+a:a}function G(n,e){if(n.length>e)return n.length=e,!0}function K(n){return new this(n).abs()}function Q(n){return new this(n).acos()}function X(n){return new this(n).acosh()}function Y(n,e){return new this(n).plus(e)}function nn(n){return new this(n).asin()}function en(n){return new this(n).asinh()}function tn(n){return new this(n).atan()}function rn(n){return new this(n).atanh()}function sn(n,e){n=new this(n),e=new this(e);var i,t=this.precision,r=this.rounding,s=t+4;return n.s&&e.s?n.d||e.d?!e.d||n.isZero()?(i=e.s<0?P(this,t,r):new this(0)).s=n.s:!n.d||e.isZero()?(i=P(this,s,1).times(.5)).s=n.s:i=e.s<0?(this.precision=s,this.rounding=1,i=this.atan(F(n,e,s,1)),e=P(this,s,1),this.precision=t,this.rounding=r,n.s<0?i.minus(e):i.plus(e)):this.atan(F(n,e,s,1)):(i=P(this,s,1).times(0<e.s?.25:.75)).s=n.s:i=new this(NaN),i}function on(n){return new this(n).cbrt()}function un(n){return _(n=new this(n),n.e+1,2)}function cn(n){if(!n||"object"!=typeof n)throw Error(f+"Object expected");var e,i,t,r=!0===n.defaults,s=["precision",1,g,"rounding",0,8,"toExpNeg",-u,0,"toExpPos",0,u,"maxE",0,u,"minE",-u,0,"modulo",0,9];for(e=0;e<s.length;e+=3)if(i=s[e],r&&(this[i]=c[i]),void 0!==(t=n[i])){if(!(L(t)===t&&s[e+1]<=t&&t<=s[e+2]))throw Error(w+i+": "+t);this[i]=t}if(i="crypto",r&&(this[i]=c[i]),void 0!==(t=n[i])){if(!0!==t&&!1!==t&&0!==t&&1!==t)throw Error(w+i+": "+t);if(t){if("undefined"==typeof crypto||!crypto||!crypto.getRandomValues&&!crypto.randomBytes)throw Error(a);this[i]=!0}else this[i]=!1}return this}function fn(n){return new this(n).cos()}function an(n){return new this(n).cosh()}function hn(n,e){return new this(n).div(e)}function ln(n){return new this(n).exp()}function dn(n){return _(n=new this(n),n.e+1,3)}function pn(){var n,e,i=new this(0);for(N=!1,n=0;n<arguments.length;)if((e=new this(arguments[n++])).d)i.d&&(i=i.plus(e.times(e)));else{if(e.s)return N=!0,new this(1/0);i=e}return N=!0,i.sqrt()}function gn(n){return n instanceof h||n&&"[object Decimal]"===n.name||!1}function mn(n){return new this(n).ln()}function wn(n,e){return new this(n).log(e)}function vn(n){return new this(n).log(2)}function Nn(n){return new this(n).log(10)}function bn(){return i(this,arguments,"lt")}function En(){return i(this,arguments,"gt")}function xn(n,e){return new this(n).mod(e)}function yn(n,e){return new this(n).mul(e)}function Mn(n,e){return new this(n).pow(e)}function qn(n){var e,i,t,r,s=0,o=new this(1),u=[];if(void 0===n?n=this.precision:q(n,1,g),t=Math.ceil(n/U),this.crypto)if(crypto.getRandomValues)for(e=crypto.getRandomValues(new Uint32Array(t));s<t;)429e7<=(r=e[s])?e[s]=crypto.getRandomValues(new Uint32Array(1))[0]:u[s++]=r%1e7;else{if(!crypto.randomBytes)throw Error(a);for(e=crypto.randomBytes(t*=4);s<t;)214e7<=(r=e[s]+(e[s+1]<<8)+(e[s+2]<<16)+((127&e[s+3])<<24))?crypto.randomBytes(4).copy(e,s):(u.push(r%1e7),s+=4);s=t/4}else for(;s<t;)u[s++]=1e7*Math.random()|0;for(t=u[--s],n%=U,t&&n&&(r=v(10,U-n),u[s]=(t/r|0)*r);0===u[s];s--)u.pop();if(s<0)u=[i=0];else{for(i=-1;0===u[0];i-=U)u.shift();for(t=1,r=u[0];10<=r;r/=10)t++;t<U&&(i-=U-t)}return o.e=i,o.d=u,o}function On(n){return _(n=new this(n),n.e+1,this.rounding)}function Dn(n){return(n=new this(n)).d?n.d[0]?n.s:0*n.s:n.s||NaN}function Fn(n){return new this(n).sin()}function An(n){return new this(n).sinh()}function Sn(n){return new this(n).sqrt()}function Zn(n,e){return new this(n).sub(e)}function Pn(n){return new this(n).tan()}function Rn(n){return new this(n).tanh()}function Ln(n){return _(n=new this(n),n.e+1,1)}(h=function n(e){var i,t,r;function s(n){var e,i,t,r=this;if(!(r instanceof s))return new s(n);if(n instanceof(r.constructor=s))return r.s=n.s,void(N?!n.d||n.e>s.maxE?(r.e=NaN,r.d=null):n.e<s.minE?(r.e=0,r.d=[0]):(r.e=n.e,r.d=n.d.slice()):(r.e=n.e,r.d=n.d?n.d.slice():n.d));if("number"==(t=typeof n)){if(0===n)return r.s=1/n<0?-1:1,r.e=0,void(r.d=[0]);if(r.s=n<0?(n=-n,-1):1,n===~~n&&n<1e7){for(e=0,i=n;10<=i;i/=10)e++;return void(r.d=N?s.maxE<e?(r.e=NaN,null):e<s.minE?[r.e=0]:(r.e=e,[n]):(r.e=e,[n]))}return 0*n!=0?(n||(r.s=NaN),r.e=NaN,void(r.d=null)):$(r,n.toString())}if("string"!==t)throw Error(w+n);return 45===n.charCodeAt(0)?(n=n.slice(1),r.s=-1):r.s=1,b.test(n)?$(r,n):function(n,e){var i,t,r,s,o,u,c,f,a;if("Infinity"===e||"NaN"===e)return+e||(n.s=NaN),n.e=NaN,n.d=null,n;if(d.test(e))i=16,e=e.toLowerCase();else if(l.test(e))i=2;else{if(!p.test(e))throw Error(w+e);i=8}for(o=0<=(s=(e=0<(s=e.search(/p/i))?(c=+e.slice(s+1),e.substring(2,s)):e.slice(2)).indexOf(".")),t=n.constructor,o&&(s=(u=(e=e.replace(".","")).length)-s,r=I(t,new t(i),s,2*s)),s=a=(f=D(e,i,T)).length-1;0===f[s];--s)f.pop();return s<0?new t(0*n.s):(n.e=S(f,a),n.d=f,N=!1,o&&(n=F(n,r,4*u)),c&&(n=n.times(Math.abs(c)<54?Math.pow(2,c):h.pow(2,c))),N=!0,n)}(r,n)}if(s.prototype=y,s.ROUND_UP=0,s.ROUND_DOWN=1,s.ROUND_CEIL=2,s.ROUND_FLOOR=3,s.ROUND_HALF_UP=4,s.ROUND_HALF_DOWN=5,s.ROUND_HALF_EVEN=6,s.ROUND_HALF_CEIL=7,s.ROUND_HALF_FLOOR=8,s.EUCLID=9,s.config=s.set=cn,s.clone=n,s.isDecimal=gn,s.abs=K,s.acos=Q,s.acosh=X,s.add=Y,s.asin=nn,s.asinh=en,s.atan=tn,s.atanh=rn,s.atan2=sn,s.cbrt=on,s.ceil=un,s.cos=fn,s.cosh=an,s.div=hn,s.exp=ln,s.floor=dn,s.hypot=pn,s.ln=mn,s.log=wn,s.log10=Nn,s.log2=vn,s.max=bn,s.min=En,s.mod=xn,s.mul=yn,s.pow=Mn,s.random=qn,s.round=On,s.sign=Dn,s.sin=Fn,s.sinh=An,s.sqrt=Sn,s.sub=Zn,s.tan=Pn,s.tanh=Rn,s.trunc=Ln,void 0===e&&(e={}),e&&!0!==e.defaults)for(r=["precision","rounding","toExpNeg","toExpPos","maxE","minE","modulo","crypto"],i=0;i<r.length;)e.hasOwnProperty(t=r[i++])||(e[t]=this[t]);return s.config(e),s}(c)).default=h.Decimal=h,t=new h(t),r=new h(r),"function"==typeof define&&define.amd?define(function(){return h}):"undefined"!=typeof module&&module.exports?("function"==typeof Symbol&&"symbol"==typeof Symbol.iterator&&(y[Symbol.for("nodejs.util.inspect.custom")]=y.toString,y[Symbol.toStringTag]="Decimal"),module.exports=h):(n||(n="undefined"!=typeof self&&self&&self.self==self?self:window),e=n.Decimal,h.noConflict=function(){return n.Decimal=e,h},n.Decimal=h)}(this);
module.exports = {Decimal: module.exports.Decimal};
});

Numbas.queueScript('parsel',[],function(module) {
    var exports = module.exports;

const TOKENS = {
    attribute: /\[\s*(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)\s*(?:(?<operator>\W?=)\s*(?<value>.+?)\s*(\s(?<caseSensitive>[iIsS]))?\s*)?\]/gu,
    id: /#(?<name>[-\w\P{ASCII}]+)/gu,
    class: /\.(?<name>[-\w\P{ASCII}]+)/gu,
    comma: /\s*,\s*/g,
    combinator: /\s*[\s>+~]\s*/g,
    'pseudo-element': /::(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
    'pseudo-class': /:(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
    universal: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?\*/gu,
    type: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)/gu, // this must be last
};
const TRIM_TOKENS = new Set(['combinator', 'comma']);
const RECURSIVE_PSEUDO_CLASSES = new Set([
    'not',
    'is',
    'where',
    'has',
    'matches',
    '-moz-any',
    '-webkit-any',
    'nth-child',
    'nth-last-child',
]);
const nthChildRegExp = /(?<index>[\dn+-]+)\s+of\s+(?<subtree>.+)/;
const RECURSIVE_PSEUDO_CLASSES_ARGS = {
    'nth-child': nthChildRegExp,
    'nth-last-child': nthChildRegExp,
};
const getArgumentPatternByType = (type) => {
    switch (type) {
        case 'pseudo-element':
        case 'pseudo-class':
            return new RegExp(TOKENS[type].source.replace('(?<argument>¶*)', '(?<argument>.*)'), 'gu');
        default:
            return TOKENS[type];
    }
};
function gobbleParens(text, offset) {
    let nesting = 0;
    let result = '';
    for (; offset < text.length; offset++) {
        const char = text[offset];
        switch (char) {
            case '(':
                ++nesting;
                break;
            case ')':
                --nesting;
                break;
        }
        result += char;
        if (nesting === 0) {
            return result;
        }
    }
    return result;
}
function tokenizeBy(text, grammar = TOKENS) {
    if (!text) {
        return [];
    }
    const tokens = [text];
    for (const [type, pattern] of Object.entries(grammar)) {
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (typeof token !== 'string') {
                continue;
            }
            pattern.lastIndex = 0;
            const match = pattern.exec(token);
            if (!match) {
                continue;
            }
            const from = match.index - 1;
            const args = [];
            const content = match[0];
            const before = token.slice(0, from + 1);
            if (before) {
                args.push(before);
            }
            args.push({
                ...match.groups,
                type,
                content,
            });
            const after = token.slice(from + content.length + 1);
            if (after) {
                args.push(after);
            }
            tokens.splice(i, 1, ...args);
        }
    }
    let offset = 0;
    for (const token of tokens) {
        switch (typeof token) {
            case 'string':
                throw new Error(`Unexpected sequence ${token} found at index ${offset}`);
            case 'object':
                offset += token.content.length;
                token.pos = [offset - token.content.length, offset];
                if (TRIM_TOKENS.has(token.type)) {
                    token.content = token.content.trim() || ' ';
                }
                break;
        }
    }
    return tokens;
}
const STRING_PATTERN = /(['"])([^\\\n]+?)\1/g;
const ESCAPE_PATTERN = /\\./g;
function tokenize(selector, grammar = TOKENS) {
    // Prevent leading/trailing whitespaces from being interpreted as combinators
    selector = selector.trim();
    if (selector === '') {
        return [];
    }
    const replacements = [];
    // Replace escapes with placeholders.
    selector = selector.replace(ESCAPE_PATTERN, (value, offset) => {
        replacements.push({ value, offset });
        return '\uE000'.repeat(value.length);
    });
    // Replace strings with placeholders.
    selector = selector.replace(STRING_PATTERN, (value, quote, content, offset) => {
        replacements.push({ value, offset });
        return `${quote}${'\uE001'.repeat(content.length)}${quote}`;
    });
    // Replace parentheses with placeholders.
    {
        let pos = 0;
        let offset;
        while ((offset = selector.indexOf('(', pos)) > -1) {
            const value = gobbleParens(selector, offset);
            replacements.push({ value, offset });
            selector = `${selector.substring(0, offset)}(${'¶'.repeat(value.length - 2)})${selector.substring(offset + value.length)}`;
            pos = offset + value.length;
        }
    }
    // Now we have no nested structures and we can parse with regexes
    const tokens = tokenizeBy(selector, grammar);
    // Replace placeholders in reverse order.
    const changedTokens = new Set();
    for (const replacement of replacements.reverse()) {
        for (const token of tokens) {
            const { offset, value } = replacement;
            if (!(token.pos[0] <= offset &&
                offset + value.length <= token.pos[1])) {
                continue;
            }
            const { content } = token;
            const tokenOffset = offset - token.pos[0];
            token.content =
                content.slice(0, tokenOffset) +
                    value +
                    content.slice(tokenOffset + value.length);
            if (token.content !== content) {
                changedTokens.add(token);
            }
        }
    }
    // Update changed tokens.
    for (const token of changedTokens) {
        const pattern = getArgumentPatternByType(token.type);
        if (!pattern) {
            throw new Error(`Unknown token type: ${token.type}`);
        }
        pattern.lastIndex = 0;
        const match = pattern.exec(token.content);
        if (!match) {
            throw new Error(`Unable to parse content for ${token.type}: ${token.content}`);
        }
        Object.assign(token, match.groups);
    }
    return tokens;
}
/**
 *  Convert a flat list of tokens into a tree of complex & compound selectors
 */
function nestTokens(tokens, { list = true } = {}) {
    if (list && tokens.find((t) => t.type === 'comma')) {
        const selectors = [];
        const temp = [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type === 'comma') {
                if (temp.length === 0) {
                    throw new Error('Incorrect comma at ' + i);
                }
                selectors.push(nestTokens(temp, { list: false }));
                temp.length = 0;
            }
            else {
                temp.push(tokens[i]);
            }
        }
        if (temp.length === 0) {
            throw new Error('Trailing comma');
        }
        else {
            selectors.push(nestTokens(temp, { list: false }));
        }
        return { type: 'list', list: selectors };
    }
    for (let i = tokens.length - 1; i >= 0; i--) {
        let token = tokens[i];
        if (token.type === 'combinator') {
            let left = tokens.slice(0, i);
            let right = tokens.slice(i + 1);
            return {
                type: 'complex',
                combinator: token.content,
                left: nestTokens(left),
                right: nestTokens(right),
            };
        }
    }
    switch (tokens.length) {
        case 0:
            throw new Error('Could not build AST.');
        case 1:
            // If we're here, there are no combinators, so it's just a list.
            return tokens[0];
        default:
            return {
                type: 'compound',
                list: [...tokens], // clone to avoid pointers messing up the AST
            };
    }
}
/**
 * Traverse an AST in depth-first order
 */
function* flatten(node, 
/**
 * @internal
 */
parent) {
    switch (node.type) {
        case 'list':
            for (let child of node.list) {
                yield* flatten(child, node);
            }
            break;
        case 'complex':
            yield* flatten(node.left, node);
            yield* flatten(node.right, node);
            break;
        case 'compound':
            yield* node.list.map((token) => [token, node]);
            break;
        default:
            yield [node, parent];
    }
}
/**
 * Traverse an AST (or part thereof), in depth-first order
 */
function walk(node, visit, 
/**
 * @internal
 */
parent) {
    if (!node) {
        return;
    }
    for (const [token, ast] of flatten(node, parent)) {
        visit(token, ast);
    }
}
/**
 * Parse a CSS selector
 *
 * @param selector - The selector to parse
 * @param options.recursive - Whether to parse the arguments of pseudo-classes like :is(), :has() etc. Defaults to true.
 * @param options.list - Whether this can be a selector list (A, B, C etc). Defaults to true.
 */
function parse(selector, { recursive = true, list = true } = {}) {
    const tokens = tokenize(selector);
    if (!tokens) {
        return;
    }
    const ast = nestTokens(tokens, { list });
    if (!recursive) {
        return ast;
    }
    for (const [token] of flatten(ast)) {
        if (token.type !== 'pseudo-class' || !token.argument) {
            continue;
        }
        if (!RECURSIVE_PSEUDO_CLASSES.has(token.name)) {
            continue;
        }
        let argument = token.argument;
        const childArg = RECURSIVE_PSEUDO_CLASSES_ARGS[token.name];
        if (childArg) {
            const match = childArg.exec(argument);
            if (!match) {
                continue;
            }
            Object.assign(token, match.groups);
            argument = match.groups['subtree'];
        }
        if (!argument) {
            continue;
        }
        Object.assign(token, {
            subtree: parse(argument, {
                recursive: true,
                list: true,
            }),
        });
    }
    return ast;
}
/**
 * Converts the given list or (sub)tree to a string.
 */
function stringify(listOrNode) {
    let tokens;
    if (Array.isArray(listOrNode)) {
        tokens = listOrNode;
    }
    else {
        tokens = [...flatten(listOrNode)].map(([token]) => token);
    }
    return tokens.map(token => token.content).join('');
}
/**
 * To convert the specificity array to a number
 */
function specificityToNumber(specificity, base) {
    base = base || Math.max(...specificity) + 1;
    return (specificity[0] * (base << 1) + specificity[1] * base + specificity[2]);
}
/**
 * Calculate specificity of a selector.
 *
 * If the selector is a list, the max specificity is returned.
 */
function specificity(selector) {
    let ast = selector;
    if (typeof ast === 'string') {
        ast = parse(ast, { recursive: true });
    }
    if (!ast) {
        return [];
    }
    if (ast.type === 'list' && 'list' in ast) {
        let base = 10;
        const specificities = ast.list.map((ast) => {
            const sp = specificity(ast);
            base = Math.max(base, ...specificity(ast));
            return sp;
        });
        const numbers = specificities.map((ast) => specificityToNumber(ast, base));
        return specificities[numbers.indexOf(Math.max(...numbers))];
    }
    const ret = [0, 0, 0];
    for (const [token] of flatten(ast)) {
        switch (token.type) {
            case 'id':
                ret[0]++;
                break;
            case 'class':
            case 'attribute':
                ret[1]++;
                break;
            case 'pseudo-element':
            case 'type':
                ret[2]++;
                break;
            case 'pseudo-class':
                if (token.name === 'where') {
                    break;
                }
                if (!RECURSIVE_PSEUDO_CLASSES.has(token.name) ||
                    !token.subtree) {
                    ret[1]++;
                    break;
                }
                const sub = specificity(token.subtree);
                sub.forEach((s, i) => (ret[i] += s));
                // :nth-child() & :nth-last-child() add (0, 1, 0) to the specificity of their most complex selector
                if (token.name === 'nth-child' ||
                    token.name === 'nth-last-child') {
                    ret[1]++;
                }
        }
    }
    return ret;
}

    module.exports = {'parsel': { RECURSIVE_PSEUDO_CLASSES, RECURSIVE_PSEUDO_CLASSES_ARGS, TOKENS, TRIM_TOKENS, flatten, gobbleParens, parse, specificity, specificityToNumber, stringify, tokenize, tokenizeBy, walk }};
});


// Created using https://github.com/numbas/unicode-math-normalization
Numbas.queueScript('unicode-mappings',[], function() {
    Numbas.unicode_mappings = {"greek": {"\u0391": "Alpha", "\u0392": "Beta", "\u03a7": "Chi", "\u0394": "Delta", "\u0395": "Epsilon", "\u0397": "Eta", "\u0393": "Gamma", "\u0370": "Heta", "\u0399": "Iota", "\u039a": "Kappa", "\u039b": "Lambda", "\u039c": "Mu", "\u039d": "Nu", "\u03a9": "Omega", "\u039f": "Omicron", "\u03a6": "Phi", "\u03a0": "Pi", "\u03a8": "Psi", "\u03a1": "Rho", "\u03fa": "San", "\u03f7": "Sho", "\u03a3": "Sigma", "\u03a4": "Tau", "\u0398": "Theta", "\u03a5": "Upsilon", "\u039e": "Xi", "\u037f": "Yot", "\u0396": "Zeta", "\u1d26": "Gamma", "\u1d27": "Lambda", "\uab65": "Omega", "\u1d28": "Pi", "\u1d2a": "Psi", "\u1d29": "Rho", "\u03b1": "alpha", "\u03b2": "beta", "\u03c7": "chi", "\u03b4": "delta", "\u03dd": "digamma", "\u03b5": "epsilon", "\u03b7": "eta", "\u03c2": "sigma", "\u03b3": "gamma", "\u0371": "heta", "\u03b9": "iota", "\u03ba": "kappa", "\u03df": "koppa", "\u03bb": "lambda", "\u03bc": "mu", "\u03bd": "nu", "\u03c9": "omega", "\u03bf": "omicron", "\u03c6": "phi", "\u03c0": "pi", "\u03c8": "psi", "\u03c1": "rho", "\u03e1": "sampi", "\u03fb": "san", "\u03f8": "sho", "\u03c3": "sigma", "\u03db": "stigma", "\u03c4": "tau", "\u03b8": "theta", "\u03c5": "upsilon", "\u03be": "xi", "\u03b6": "zeta"}, "subscripts": {"\u1d62": "i", "\u1d63": "r", "\u1d64": "u", "\u1d65": "v", "\u1d66": "\u03b2", "\u1d67": "\u03b3", "\u1d68": "\u03c1", "\u1d69": "\u03c6", "\u1d6a": "\u03c7", "\u2080": "0", "\u2081": "1", "\u2082": "2", "\u2083": "3", "\u2084": "4", "\u2085": "5", "\u2086": "6", "\u2087": "7", "\u2088": "8", "\u2089": "9", "\u208a": "+", "\u208b": "-", "\u208c": "=", "\u208d": "(", "\u208e": ")", "\u2090": "a", "\u2091": "e", "\u2092": "o", "\u2093": "x", "\u2095": "h", "\u2096": "k", "\u2097": "l", "\u2098": "m", "\u2099": "n", "\u209a": "p", "\u209b": "s", "\u209c": "t", "\u2c7c": "j"}, "superscripts": {"\u00b2": "2", "\u00b3": "3", "\u00b9": "1", "\u2070": "0", "\u2071": "i", "\u2074": "4", "\u2075": "5", "\u2076": "6", "\u2077": "7", "\u2078": "8", "\u2079": "9", "\u207a": "+", "\u207b": "-", "\u207c": "=", "\u207d": "(", "\u207e": ")", "\u207f": "n"}, "letters": {"\ud835\udc00": ["A", ["BOLD"]], "\ud835\udc01": ["B", ["BOLD"]], "\ud835\udc02": ["C", ["BOLD"]], "\ud835\udc03": ["D", ["BOLD"]], "\ud835\udc04": ["E", ["BOLD"]], "\ud835\udc05": ["F", ["BOLD"]], "\ud835\udc06": ["G", ["BOLD"]], "\ud835\udc07": ["H", ["BOLD"]], "\ud835\udc08": ["I", ["BOLD"]], "\ud835\udc09": ["J", ["BOLD"]], "\ud835\udc0a": ["K", ["BOLD"]], "\ud835\udc0b": ["L", ["BOLD"]], "\ud835\udc0c": ["M", ["BOLD"]], "\ud835\udc0d": ["N", ["BOLD"]], "\ud835\udc0e": ["O", ["BOLD"]], "\ud835\udc0f": ["P", ["BOLD"]], "\ud835\udc10": ["Q", ["BOLD"]], "\ud835\udc11": ["R", ["BOLD"]], "\ud835\udc12": ["S", ["BOLD"]], "\ud835\udc13": ["T", ["BOLD"]], "\ud835\udc14": ["U", ["BOLD"]], "\ud835\udc15": ["V", ["BOLD"]], "\ud835\udc16": ["W", ["BOLD"]], "\ud835\udc17": ["X", ["BOLD"]], "\ud835\udc18": ["Y", ["BOLD"]], "\ud835\udc19": ["Z", ["BOLD"]], "\ud835\udc1a": ["a", ["BOLD"]], "\ud835\udc1b": ["b", ["BOLD"]], "\ud835\udc1c": ["c", ["BOLD"]], "\ud835\udc1d": ["d", ["BOLD"]], "\ud835\udc1e": ["e", ["BOLD"]], "\ud835\udc1f": ["f", ["BOLD"]], "\ud835\udc20": ["g", ["BOLD"]], "\ud835\udc21": ["h", ["BOLD"]], "\ud835\udc22": ["i", ["BOLD"]], "\ud835\udc23": ["j", ["BOLD"]], "\ud835\udc24": ["k", ["BOLD"]], "\ud835\udc25": ["l", ["BOLD"]], "\ud835\udc26": ["m", ["BOLD"]], "\ud835\udc27": ["n", ["BOLD"]], "\ud835\udc28": ["o", ["BOLD"]], "\ud835\udc29": ["p", ["BOLD"]], "\ud835\udc2a": ["q", ["BOLD"]], "\ud835\udc2b": ["r", ["BOLD"]], "\ud835\udc2c": ["s", ["BOLD"]], "\ud835\udc2d": ["t", ["BOLD"]], "\ud835\udc2e": ["u", ["BOLD"]], "\ud835\udc2f": ["v", ["BOLD"]], "\ud835\udc30": ["w", ["BOLD"]], "\ud835\udc31": ["x", ["BOLD"]], "\ud835\udc32": ["y", ["BOLD"]], "\ud835\udc33": ["z", ["BOLD"]], "\ud835\udc34": ["A", ["ITALIC"]], "\ud835\udc35": ["B", ["ITALIC"]], "\ud835\udc36": ["C", ["ITALIC"]], "\ud835\udc37": ["D", ["ITALIC"]], "\ud835\udc38": ["E", ["ITALIC"]], "\ud835\udc39": ["F", ["ITALIC"]], "\ud835\udc3a": ["G", ["ITALIC"]], "\ud835\udc3b": ["H", ["ITALIC"]], "\ud835\udc3c": ["I", ["ITALIC"]], "\ud835\udc3d": ["J", ["ITALIC"]], "\ud835\udc3e": ["K", ["ITALIC"]], "\ud835\udc3f": ["L", ["ITALIC"]], "\ud835\udc40": ["M", ["ITALIC"]], "\ud835\udc41": ["N", ["ITALIC"]], "\ud835\udc42": ["O", ["ITALIC"]], "\ud835\udc43": ["P", ["ITALIC"]], "\ud835\udc44": ["Q", ["ITALIC"]], "\ud835\udc45": ["R", ["ITALIC"]], "\ud835\udc46": ["S", ["ITALIC"]], "\ud835\udc47": ["T", ["ITALIC"]], "\ud835\udc48": ["U", ["ITALIC"]], "\ud835\udc49": ["V", ["ITALIC"]], "\ud835\udc4a": ["W", ["ITALIC"]], "\ud835\udc4b": ["X", ["ITALIC"]], "\ud835\udc4c": ["Y", ["ITALIC"]], "\ud835\udc4d": ["Z", ["ITALIC"]], "\ud835\udc4e": ["a", ["ITALIC"]], "\ud835\udc4f": ["b", ["ITALIC"]], "\ud835\udc50": ["c", ["ITALIC"]], "\ud835\udc51": ["d", ["ITALIC"]], "\ud835\udc52": ["e", ["ITALIC"]], "\ud835\udc53": ["f", ["ITALIC"]], "\ud835\udc54": ["g", ["ITALIC"]], "\ud835\udc56": ["i", ["ITALIC"]], "\ud835\udc57": ["j", ["ITALIC"]], "\ud835\udc58": ["k", ["ITALIC"]], "\ud835\udc59": ["l", ["ITALIC"]], "\ud835\udc5a": ["m", ["ITALIC"]], "\ud835\udc5b": ["n", ["ITALIC"]], "\ud835\udc5c": ["o", ["ITALIC"]], "\ud835\udc5d": ["p", ["ITALIC"]], "\ud835\udc5e": ["q", ["ITALIC"]], "\ud835\udc5f": ["r", ["ITALIC"]], "\ud835\udc60": ["s", ["ITALIC"]], "\ud835\udc61": ["t", ["ITALIC"]], "\ud835\udc62": ["u", ["ITALIC"]], "\ud835\udc63": ["v", ["ITALIC"]], "\ud835\udc64": ["w", ["ITALIC"]], "\ud835\udc65": ["x", ["ITALIC"]], "\ud835\udc66": ["y", ["ITALIC"]], "\ud835\udc67": ["z", ["ITALIC"]], "\ud835\udc68": ["A", ["BOLD", "ITALIC"]], "\ud835\udc69": ["B", ["BOLD", "ITALIC"]], "\ud835\udc6a": ["C", ["BOLD", "ITALIC"]], "\ud835\udc6b": ["D", ["BOLD", "ITALIC"]], "\ud835\udc6c": ["E", ["BOLD", "ITALIC"]], "\ud835\udc6d": ["F", ["BOLD", "ITALIC"]], "\ud835\udc6e": ["G", ["BOLD", "ITALIC"]], "\ud835\udc6f": ["H", ["BOLD", "ITALIC"]], "\ud835\udc70": ["I", ["BOLD", "ITALIC"]], "\ud835\udc71": ["J", ["BOLD", "ITALIC"]], "\ud835\udc72": ["K", ["BOLD", "ITALIC"]], "\ud835\udc73": ["L", ["BOLD", "ITALIC"]], "\ud835\udc74": ["M", ["BOLD", "ITALIC"]], "\ud835\udc75": ["N", ["BOLD", "ITALIC"]], "\ud835\udc76": ["O", ["BOLD", "ITALIC"]], "\ud835\udc77": ["P", ["BOLD", "ITALIC"]], "\ud835\udc78": ["Q", ["BOLD", "ITALIC"]], "\ud835\udc79": ["R", ["BOLD", "ITALIC"]], "\ud835\udc7a": ["S", ["BOLD", "ITALIC"]], "\ud835\udc7b": ["T", ["BOLD", "ITALIC"]], "\ud835\udc7c": ["U", ["BOLD", "ITALIC"]], "\ud835\udc7d": ["V", ["BOLD", "ITALIC"]], "\ud835\udc7e": ["W", ["BOLD", "ITALIC"]], "\ud835\udc7f": ["X", ["BOLD", "ITALIC"]], "\ud835\udc80": ["Y", ["BOLD", "ITALIC"]], "\ud835\udc81": ["Z", ["BOLD", "ITALIC"]], "\ud835\udc82": ["a", ["BOLD", "ITALIC"]], "\ud835\udc83": ["b", ["BOLD", "ITALIC"]], "\ud835\udc84": ["c", ["BOLD", "ITALIC"]], "\ud835\udc85": ["d", ["BOLD", "ITALIC"]], "\ud835\udc86": ["e", ["BOLD", "ITALIC"]], "\ud835\udc87": ["f", ["BOLD", "ITALIC"]], "\ud835\udc88": ["g", ["BOLD", "ITALIC"]], "\ud835\udc89": ["h", ["BOLD", "ITALIC"]], "\ud835\udc8a": ["i", ["BOLD", "ITALIC"]], "\ud835\udc8b": ["j", ["BOLD", "ITALIC"]], "\ud835\udc8c": ["k", ["BOLD", "ITALIC"]], "\ud835\udc8d": ["l", ["BOLD", "ITALIC"]], "\ud835\udc8e": ["m", ["BOLD", "ITALIC"]], "\ud835\udc8f": ["n", ["BOLD", "ITALIC"]], "\ud835\udc90": ["o", ["BOLD", "ITALIC"]], "\ud835\udc91": ["p", ["BOLD", "ITALIC"]], "\ud835\udc92": ["q", ["BOLD", "ITALIC"]], "\ud835\udc93": ["r", ["BOLD", "ITALIC"]], "\ud835\udc94": ["s", ["BOLD", "ITALIC"]], "\ud835\udc95": ["t", ["BOLD", "ITALIC"]], "\ud835\udc96": ["u", ["BOLD", "ITALIC"]], "\ud835\udc97": ["v", ["BOLD", "ITALIC"]], "\ud835\udc98": ["w", ["BOLD", "ITALIC"]], "\ud835\udc99": ["x", ["BOLD", "ITALIC"]], "\ud835\udc9a": ["y", ["BOLD", "ITALIC"]], "\ud835\udc9b": ["z", ["BOLD", "ITALIC"]], "\ud835\udc9c": ["A", ["SCRIPT"]], "\ud835\udc9e": ["C", ["SCRIPT"]], "\ud835\udc9f": ["D", ["SCRIPT"]], "\ud835\udca2": ["G", ["SCRIPT"]], "\ud835\udca5": ["J", ["SCRIPT"]], "\ud835\udca6": ["K", ["SCRIPT"]], "\ud835\udca9": ["N", ["SCRIPT"]], "\ud835\udcaa": ["O", ["SCRIPT"]], "\ud835\udcab": ["P", ["SCRIPT"]], "\ud835\udcac": ["Q", ["SCRIPT"]], "\ud835\udcae": ["S", ["SCRIPT"]], "\ud835\udcaf": ["T", ["SCRIPT"]], "\ud835\udcb0": ["U", ["SCRIPT"]], "\ud835\udcb1": ["V", ["SCRIPT"]], "\ud835\udcb2": ["W", ["SCRIPT"]], "\ud835\udcb3": ["X", ["SCRIPT"]], "\ud835\udcb4": ["Y", ["SCRIPT"]], "\ud835\udcb5": ["Z", ["SCRIPT"]], "\ud835\udcb6": ["a", ["SCRIPT"]], "\ud835\udcb7": ["b", ["SCRIPT"]], "\ud835\udcb8": ["c", ["SCRIPT"]], "\ud835\udcb9": ["d", ["SCRIPT"]], "\ud835\udcbb": ["f", ["SCRIPT"]], "\ud835\udcbd": ["h", ["SCRIPT"]], "\ud835\udcbe": ["i", ["SCRIPT"]], "\ud835\udcbf": ["j", ["SCRIPT"]], "\ud835\udcc0": ["k", ["SCRIPT"]], "\ud835\udcc1": ["l", ["SCRIPT"]], "\ud835\udcc2": ["m", ["SCRIPT"]], "\ud835\udcc3": ["n", ["SCRIPT"]], "\ud835\udcc5": ["p", ["SCRIPT"]], "\ud835\udcc6": ["q", ["SCRIPT"]], "\ud835\udcc7": ["r", ["SCRIPT"]], "\ud835\udcc8": ["s", ["SCRIPT"]], "\ud835\udcc9": ["t", ["SCRIPT"]], "\ud835\udcca": ["u", ["SCRIPT"]], "\ud835\udccb": ["v", ["SCRIPT"]], "\ud835\udccc": ["w", ["SCRIPT"]], "\ud835\udccd": ["x", ["SCRIPT"]], "\ud835\udcce": ["y", ["SCRIPT"]], "\ud835\udccf": ["z", ["SCRIPT"]], "\ud835\udcd0": ["A", ["BOLD", "SCRIPT"]], "\ud835\udcd1": ["B", ["BOLD", "SCRIPT"]], "\ud835\udcd2": ["C", ["BOLD", "SCRIPT"]], "\ud835\udcd3": ["D", ["BOLD", "SCRIPT"]], "\ud835\udcd4": ["E", ["BOLD", "SCRIPT"]], "\ud835\udcd5": ["F", ["BOLD", "SCRIPT"]], "\ud835\udcd6": ["G", ["BOLD", "SCRIPT"]], "\ud835\udcd7": ["H", ["BOLD", "SCRIPT"]], "\ud835\udcd8": ["I", ["BOLD", "SCRIPT"]], "\ud835\udcd9": ["J", ["BOLD", "SCRIPT"]], "\ud835\udcda": ["K", ["BOLD", "SCRIPT"]], "\ud835\udcdb": ["L", ["BOLD", "SCRIPT"]], "\ud835\udcdc": ["M", ["BOLD", "SCRIPT"]], "\ud835\udcdd": ["N", ["BOLD", "SCRIPT"]], "\ud835\udcde": ["O", ["BOLD", "SCRIPT"]], "\ud835\udcdf": ["P", ["BOLD", "SCRIPT"]], "\ud835\udce0": ["Q", ["BOLD", "SCRIPT"]], "\ud835\udce1": ["R", ["BOLD", "SCRIPT"]], "\ud835\udce2": ["S", ["BOLD", "SCRIPT"]], "\ud835\udce3": ["T", ["BOLD", "SCRIPT"]], "\ud835\udce4": ["U", ["BOLD", "SCRIPT"]], "\ud835\udce5": ["V", ["BOLD", "SCRIPT"]], "\ud835\udce6": ["W", ["BOLD", "SCRIPT"]], "\ud835\udce7": ["X", ["BOLD", "SCRIPT"]], "\ud835\udce8": ["Y", ["BOLD", "SCRIPT"]], "\ud835\udce9": ["Z", ["BOLD", "SCRIPT"]], "\ud835\udcea": ["a", ["BOLD", "SCRIPT"]], "\ud835\udceb": ["b", ["BOLD", "SCRIPT"]], "\ud835\udcec": ["c", ["BOLD", "SCRIPT"]], "\ud835\udced": ["d", ["BOLD", "SCRIPT"]], "\ud835\udcee": ["e", ["BOLD", "SCRIPT"]], "\ud835\udcef": ["f", ["BOLD", "SCRIPT"]], "\ud835\udcf0": ["g", ["BOLD", "SCRIPT"]], "\ud835\udcf1": ["h", ["BOLD", "SCRIPT"]], "\ud835\udcf2": ["i", ["BOLD", "SCRIPT"]], "\ud835\udcf3": ["j", ["BOLD", "SCRIPT"]], "\ud835\udcf4": ["k", ["BOLD", "SCRIPT"]], "\ud835\udcf5": ["l", ["BOLD", "SCRIPT"]], "\ud835\udcf6": ["m", ["BOLD", "SCRIPT"]], "\ud835\udcf7": ["n", ["BOLD", "SCRIPT"]], "\ud835\udcf8": ["o", ["BOLD", "SCRIPT"]], "\ud835\udcf9": ["p", ["BOLD", "SCRIPT"]], "\ud835\udcfa": ["q", ["BOLD", "SCRIPT"]], "\ud835\udcfb": ["r", ["BOLD", "SCRIPT"]], "\ud835\udcfc": ["s", ["BOLD", "SCRIPT"]], "\ud835\udcfd": ["t", ["BOLD", "SCRIPT"]], "\ud835\udcfe": ["u", ["BOLD", "SCRIPT"]], "\ud835\udcff": ["v", ["BOLD", "SCRIPT"]], "\ud835\udd00": ["w", ["BOLD", "SCRIPT"]], "\ud835\udd01": ["x", ["BOLD", "SCRIPT"]], "\ud835\udd02": ["y", ["BOLD", "SCRIPT"]], "\ud835\udd03": ["z", ["BOLD", "SCRIPT"]], "\ud835\udd04": ["A", ["FRAKTUR"]], "\ud835\udd05": ["B", ["FRAKTUR"]], "\ud835\udd07": ["D", ["FRAKTUR"]], "\ud835\udd08": ["E", ["FRAKTUR"]], "\ud835\udd09": ["F", ["FRAKTUR"]], "\ud835\udd0a": ["G", ["FRAKTUR"]], "\ud835\udd0d": ["J", ["FRAKTUR"]], "\ud835\udd0e": ["K", ["FRAKTUR"]], "\ud835\udd0f": ["L", ["FRAKTUR"]], "\ud835\udd10": ["M", ["FRAKTUR"]], "\ud835\udd11": ["N", ["FRAKTUR"]], "\ud835\udd12": ["O", ["FRAKTUR"]], "\ud835\udd13": ["P", ["FRAKTUR"]], "\ud835\udd14": ["Q", ["FRAKTUR"]], "\ud835\udd16": ["S", ["FRAKTUR"]], "\ud835\udd17": ["T", ["FRAKTUR"]], "\ud835\udd18": ["U", ["FRAKTUR"]], "\ud835\udd19": ["V", ["FRAKTUR"]], "\ud835\udd1a": ["W", ["FRAKTUR"]], "\ud835\udd1b": ["X", ["FRAKTUR"]], "\ud835\udd1c": ["Y", ["FRAKTUR"]], "\ud835\udd1e": ["a", ["FRAKTUR"]], "\ud835\udd1f": ["b", ["FRAKTUR"]], "\ud835\udd20": ["c", ["FRAKTUR"]], "\ud835\udd21": ["d", ["FRAKTUR"]], "\ud835\udd22": ["e", ["FRAKTUR"]], "\ud835\udd23": ["f", ["FRAKTUR"]], "\ud835\udd24": ["g", ["FRAKTUR"]], "\ud835\udd25": ["h", ["FRAKTUR"]], "\ud835\udd26": ["i", ["FRAKTUR"]], "\ud835\udd27": ["j", ["FRAKTUR"]], "\ud835\udd28": ["k", ["FRAKTUR"]], "\ud835\udd29": ["l", ["FRAKTUR"]], "\ud835\udd2a": ["m", ["FRAKTUR"]], "\ud835\udd2b": ["n", ["FRAKTUR"]], "\ud835\udd2c": ["o", ["FRAKTUR"]], "\ud835\udd2d": ["p", ["FRAKTUR"]], "\ud835\udd2e": ["q", ["FRAKTUR"]], "\ud835\udd2f": ["r", ["FRAKTUR"]], "\ud835\udd30": ["s", ["FRAKTUR"]], "\ud835\udd31": ["t", ["FRAKTUR"]], "\ud835\udd32": ["u", ["FRAKTUR"]], "\ud835\udd33": ["v", ["FRAKTUR"]], "\ud835\udd34": ["w", ["FRAKTUR"]], "\ud835\udd35": ["x", ["FRAKTUR"]], "\ud835\udd36": ["y", ["FRAKTUR"]], "\ud835\udd37": ["z", ["FRAKTUR"]], "\ud835\udd38": ["A", ["DOUBLE-STRUCK"]], "\ud835\udd39": ["B", ["DOUBLE-STRUCK"]], "\ud835\udd3b": ["D", ["DOUBLE-STRUCK"]], "\ud835\udd3c": ["E", ["DOUBLE-STRUCK"]], "\ud835\udd3d": ["F", ["DOUBLE-STRUCK"]], "\ud835\udd3e": ["G", ["DOUBLE-STRUCK"]], "\ud835\udd40": ["I", ["DOUBLE-STRUCK"]], "\ud835\udd41": ["J", ["DOUBLE-STRUCK"]], "\ud835\udd42": ["K", ["DOUBLE-STRUCK"]], "\ud835\udd43": ["L", ["DOUBLE-STRUCK"]], "\ud835\udd44": ["M", ["DOUBLE-STRUCK"]], "\ud835\udd46": ["O", ["DOUBLE-STRUCK"]], "\ud835\udd4a": ["S", ["DOUBLE-STRUCK"]], "\ud835\udd4b": ["T", ["DOUBLE-STRUCK"]], "\ud835\udd4c": ["U", ["DOUBLE-STRUCK"]], "\ud835\udd4d": ["V", ["DOUBLE-STRUCK"]], "\ud835\udd4e": ["W", ["DOUBLE-STRUCK"]], "\ud835\udd4f": ["X", ["DOUBLE-STRUCK"]], "\ud835\udd50": ["Y", ["DOUBLE-STRUCK"]], "\ud835\udd52": ["a", ["DOUBLE-STRUCK"]], "\ud835\udd53": ["b", ["DOUBLE-STRUCK"]], "\ud835\udd54": ["c", ["DOUBLE-STRUCK"]], "\ud835\udd55": ["d", ["DOUBLE-STRUCK"]], "\ud835\udd56": ["e", ["DOUBLE-STRUCK"]], "\ud835\udd57": ["f", ["DOUBLE-STRUCK"]], "\ud835\udd58": ["g", ["DOUBLE-STRUCK"]], "\ud835\udd59": ["h", ["DOUBLE-STRUCK"]], "\ud835\udd5a": ["i", ["DOUBLE-STRUCK"]], "\ud835\udd5b": ["j", ["DOUBLE-STRUCK"]], "\ud835\udd5c": ["k", ["DOUBLE-STRUCK"]], "\ud835\udd5d": ["l", ["DOUBLE-STRUCK"]], "\ud835\udd5e": ["m", ["DOUBLE-STRUCK"]], "\ud835\udd5f": ["n", ["DOUBLE-STRUCK"]], "\ud835\udd60": ["o", ["DOUBLE-STRUCK"]], "\ud835\udd61": ["p", ["DOUBLE-STRUCK"]], "\ud835\udd62": ["q", ["DOUBLE-STRUCK"]], "\ud835\udd63": ["r", ["DOUBLE-STRUCK"]], "\ud835\udd64": ["s", ["DOUBLE-STRUCK"]], "\ud835\udd65": ["t", ["DOUBLE-STRUCK"]], "\ud835\udd66": ["u", ["DOUBLE-STRUCK"]], "\ud835\udd67": ["v", ["DOUBLE-STRUCK"]], "\ud835\udd68": ["w", ["DOUBLE-STRUCK"]], "\ud835\udd69": ["x", ["DOUBLE-STRUCK"]], "\ud835\udd6a": ["y", ["DOUBLE-STRUCK"]], "\ud835\udd6b": ["z", ["DOUBLE-STRUCK"]], "\ud835\udd6c": ["A", ["BOLD", "FRAKTUR"]], "\ud835\udd6d": ["B", ["BOLD", "FRAKTUR"]], "\ud835\udd6e": ["C", ["BOLD", "FRAKTUR"]], "\ud835\udd6f": ["D", ["BOLD", "FRAKTUR"]], "\ud835\udd70": ["E", ["BOLD", "FRAKTUR"]], "\ud835\udd71": ["F", ["BOLD", "FRAKTUR"]], "\ud835\udd72": ["G", ["BOLD", "FRAKTUR"]], "\ud835\udd73": ["H", ["BOLD", "FRAKTUR"]], "\ud835\udd74": ["I", ["BOLD", "FRAKTUR"]], "\ud835\udd75": ["J", ["BOLD", "FRAKTUR"]], "\ud835\udd76": ["K", ["BOLD", "FRAKTUR"]], "\ud835\udd77": ["L", ["BOLD", "FRAKTUR"]], "\ud835\udd78": ["M", ["BOLD", "FRAKTUR"]], "\ud835\udd79": ["N", ["BOLD", "FRAKTUR"]], "\ud835\udd7a": ["O", ["BOLD", "FRAKTUR"]], "\ud835\udd7b": ["P", ["BOLD", "FRAKTUR"]], "\ud835\udd7c": ["Q", ["BOLD", "FRAKTUR"]], "\ud835\udd7d": ["R", ["BOLD", "FRAKTUR"]], "\ud835\udd7e": ["S", ["BOLD", "FRAKTUR"]], "\ud835\udd7f": ["T", ["BOLD", "FRAKTUR"]], "\ud835\udd80": ["U", ["BOLD", "FRAKTUR"]], "\ud835\udd81": ["V", ["BOLD", "FRAKTUR"]], "\ud835\udd82": ["W", ["BOLD", "FRAKTUR"]], "\ud835\udd83": ["X", ["BOLD", "FRAKTUR"]], "\ud835\udd84": ["Y", ["BOLD", "FRAKTUR"]], "\ud835\udd85": ["Z", ["BOLD", "FRAKTUR"]], "\ud835\udd86": ["a", ["BOLD", "FRAKTUR"]], "\ud835\udd87": ["b", ["BOLD", "FRAKTUR"]], "\ud835\udd88": ["c", ["BOLD", "FRAKTUR"]], "\ud835\udd89": ["d", ["BOLD", "FRAKTUR"]], "\ud835\udd8a": ["e", ["BOLD", "FRAKTUR"]], "\ud835\udd8b": ["f", ["BOLD", "FRAKTUR"]], "\ud835\udd8c": ["g", ["BOLD", "FRAKTUR"]], "\ud835\udd8d": ["h", ["BOLD", "FRAKTUR"]], "\ud835\udd8e": ["i", ["BOLD", "FRAKTUR"]], "\ud835\udd8f": ["j", ["BOLD", "FRAKTUR"]], "\ud835\udd90": ["k", ["BOLD", "FRAKTUR"]], "\ud835\udd91": ["l", ["BOLD", "FRAKTUR"]], "\ud835\udd92": ["m", ["BOLD", "FRAKTUR"]], "\ud835\udd93": ["n", ["BOLD", "FRAKTUR"]], "\ud835\udd94": ["o", ["BOLD", "FRAKTUR"]], "\ud835\udd95": ["p", ["BOLD", "FRAKTUR"]], "\ud835\udd96": ["q", ["BOLD", "FRAKTUR"]], "\ud835\udd97": ["r", ["BOLD", "FRAKTUR"]], "\ud835\udd98": ["s", ["BOLD", "FRAKTUR"]], "\ud835\udd99": ["t", ["BOLD", "FRAKTUR"]], "\ud835\udd9a": ["u", ["BOLD", "FRAKTUR"]], "\ud835\udd9b": ["v", ["BOLD", "FRAKTUR"]], "\ud835\udd9c": ["w", ["BOLD", "FRAKTUR"]], "\ud835\udd9d": ["x", ["BOLD", "FRAKTUR"]], "\ud835\udd9e": ["y", ["BOLD", "FRAKTUR"]], "\ud835\udd9f": ["z", ["BOLD", "FRAKTUR"]], "\ud835\udda0": ["A", ["SANS-SERIF"]], "\ud835\udda1": ["B", ["SANS-SERIF"]], "\ud835\udda2": ["C", ["SANS-SERIF"]], "\ud835\udda3": ["D", ["SANS-SERIF"]], "\ud835\udda4": ["E", ["SANS-SERIF"]], "\ud835\udda5": ["F", ["SANS-SERIF"]], "\ud835\udda6": ["G", ["SANS-SERIF"]], "\ud835\udda7": ["H", ["SANS-SERIF"]], "\ud835\udda8": ["I", ["SANS-SERIF"]], "\ud835\udda9": ["J", ["SANS-SERIF"]], "\ud835\uddaa": ["K", ["SANS-SERIF"]], "\ud835\uddab": ["L", ["SANS-SERIF"]], "\ud835\uddac": ["M", ["SANS-SERIF"]], "\ud835\uddad": ["N", ["SANS-SERIF"]], "\ud835\uddae": ["O", ["SANS-SERIF"]], "\ud835\uddaf": ["P", ["SANS-SERIF"]], "\ud835\uddb0": ["Q", ["SANS-SERIF"]], "\ud835\uddb1": ["R", ["SANS-SERIF"]], "\ud835\uddb2": ["S", ["SANS-SERIF"]], "\ud835\uddb3": ["T", ["SANS-SERIF"]], "\ud835\uddb4": ["U", ["SANS-SERIF"]], "\ud835\uddb5": ["V", ["SANS-SERIF"]], "\ud835\uddb6": ["W", ["SANS-SERIF"]], "\ud835\uddb7": ["X", ["SANS-SERIF"]], "\ud835\uddb8": ["Y", ["SANS-SERIF"]], "\ud835\uddb9": ["Z", ["SANS-SERIF"]], "\ud835\uddba": ["a", ["SANS-SERIF"]], "\ud835\uddbb": ["b", ["SANS-SERIF"]], "\ud835\uddbc": ["c", ["SANS-SERIF"]], "\ud835\uddbd": ["d", ["SANS-SERIF"]], "\ud835\uddbe": ["e", ["SANS-SERIF"]], "\ud835\uddbf": ["f", ["SANS-SERIF"]], "\ud835\uddc0": ["g", ["SANS-SERIF"]], "\ud835\uddc1": ["h", ["SANS-SERIF"]], "\ud835\uddc2": ["i", ["SANS-SERIF"]], "\ud835\uddc3": ["j", ["SANS-SERIF"]], "\ud835\uddc4": ["k", ["SANS-SERIF"]], "\ud835\uddc5": ["l", ["SANS-SERIF"]], "\ud835\uddc6": ["m", ["SANS-SERIF"]], "\ud835\uddc7": ["n", ["SANS-SERIF"]], "\ud835\uddc8": ["o", ["SANS-SERIF"]], "\ud835\uddc9": ["p", ["SANS-SERIF"]], "\ud835\uddca": ["q", ["SANS-SERIF"]], "\ud835\uddcb": ["r", ["SANS-SERIF"]], "\ud835\uddcc": ["s", ["SANS-SERIF"]], "\ud835\uddcd": ["t", ["SANS-SERIF"]], "\ud835\uddce": ["u", ["SANS-SERIF"]], "\ud835\uddcf": ["v", ["SANS-SERIF"]], "\ud835\uddd0": ["w", ["SANS-SERIF"]], "\ud835\uddd1": ["x", ["SANS-SERIF"]], "\ud835\uddd2": ["y", ["SANS-SERIF"]], "\ud835\uddd3": ["z", ["SANS-SERIF"]], "\ud835\uddd4": ["A", ["SANS-SERIF", "BOLD"]], "\ud835\uddd5": ["B", ["SANS-SERIF", "BOLD"]], "\ud835\uddd6": ["C", ["SANS-SERIF", "BOLD"]], "\ud835\uddd7": ["D", ["SANS-SERIF", "BOLD"]], "\ud835\uddd8": ["E", ["SANS-SERIF", "BOLD"]], "\ud835\uddd9": ["F", ["SANS-SERIF", "BOLD"]], "\ud835\uddda": ["G", ["SANS-SERIF", "BOLD"]], "\ud835\udddb": ["H", ["SANS-SERIF", "BOLD"]], "\ud835\udddc": ["I", ["SANS-SERIF", "BOLD"]], "\ud835\udddd": ["J", ["SANS-SERIF", "BOLD"]], "\ud835\uddde": ["K", ["SANS-SERIF", "BOLD"]], "\ud835\udddf": ["L", ["SANS-SERIF", "BOLD"]], "\ud835\udde0": ["M", ["SANS-SERIF", "BOLD"]], "\ud835\udde1": ["N", ["SANS-SERIF", "BOLD"]], "\ud835\udde2": ["O", ["SANS-SERIF", "BOLD"]], "\ud835\udde3": ["P", ["SANS-SERIF", "BOLD"]], "\ud835\udde4": ["Q", ["SANS-SERIF", "BOLD"]], "\ud835\udde5": ["R", ["SANS-SERIF", "BOLD"]], "\ud835\udde6": ["S", ["SANS-SERIF", "BOLD"]], "\ud835\udde7": ["T", ["SANS-SERIF", "BOLD"]], "\ud835\udde8": ["U", ["SANS-SERIF", "BOLD"]], "\ud835\udde9": ["V", ["SANS-SERIF", "BOLD"]], "\ud835\uddea": ["W", ["SANS-SERIF", "BOLD"]], "\ud835\uddeb": ["X", ["SANS-SERIF", "BOLD"]], "\ud835\uddec": ["Y", ["SANS-SERIF", "BOLD"]], "\ud835\udded": ["Z", ["SANS-SERIF", "BOLD"]], "\ud835\uddee": ["a", ["SANS-SERIF", "BOLD"]], "\ud835\uddef": ["b", ["SANS-SERIF", "BOLD"]], "\ud835\uddf0": ["c", ["SANS-SERIF", "BOLD"]], "\ud835\uddf1": ["d", ["SANS-SERIF", "BOLD"]], "\ud835\uddf2": ["e", ["SANS-SERIF", "BOLD"]], "\ud835\uddf3": ["f", ["SANS-SERIF", "BOLD"]], "\ud835\uddf4": ["g", ["SANS-SERIF", "BOLD"]], "\ud835\uddf5": ["h", ["SANS-SERIF", "BOLD"]], "\ud835\uddf6": ["i", ["SANS-SERIF", "BOLD"]], "\ud835\uddf7": ["j", ["SANS-SERIF", "BOLD"]], "\ud835\uddf8": ["k", ["SANS-SERIF", "BOLD"]], "\ud835\uddf9": ["l", ["SANS-SERIF", "BOLD"]], "\ud835\uddfa": ["m", ["SANS-SERIF", "BOLD"]], "\ud835\uddfb": ["n", ["SANS-SERIF", "BOLD"]], "\ud835\uddfc": ["o", ["SANS-SERIF", "BOLD"]], "\ud835\uddfd": ["p", ["SANS-SERIF", "BOLD"]], "\ud835\uddfe": ["q", ["SANS-SERIF", "BOLD"]], "\ud835\uddff": ["r", ["SANS-SERIF", "BOLD"]], "\ud835\ude00": ["s", ["SANS-SERIF", "BOLD"]], "\ud835\ude01": ["t", ["SANS-SERIF", "BOLD"]], "\ud835\ude02": ["u", ["SANS-SERIF", "BOLD"]], "\ud835\ude03": ["v", ["SANS-SERIF", "BOLD"]], "\ud835\ude04": ["w", ["SANS-SERIF", "BOLD"]], "\ud835\ude05": ["x", ["SANS-SERIF", "BOLD"]], "\ud835\ude06": ["y", ["SANS-SERIF", "BOLD"]], "\ud835\ude07": ["z", ["SANS-SERIF", "BOLD"]], "\ud835\ude08": ["A", ["SANS-SERIF", "ITALIC"]], "\ud835\ude09": ["B", ["SANS-SERIF", "ITALIC"]], "\ud835\ude0a": ["C", ["SANS-SERIF", "ITALIC"]], "\ud835\ude0b": ["D", ["SANS-SERIF", "ITALIC"]], "\ud835\ude0c": ["E", ["SANS-SERIF", "ITALIC"]], "\ud835\ude0d": ["F", ["SANS-SERIF", "ITALIC"]], "\ud835\ude0e": ["G", ["SANS-SERIF", "ITALIC"]], "\ud835\ude0f": ["H", ["SANS-SERIF", "ITALIC"]], "\ud835\ude10": ["I", ["SANS-SERIF", "ITALIC"]], "\ud835\ude11": ["J", ["SANS-SERIF", "ITALIC"]], "\ud835\ude12": ["K", ["SANS-SERIF", "ITALIC"]], "\ud835\ude13": ["L", ["SANS-SERIF", "ITALIC"]], "\ud835\ude14": ["M", ["SANS-SERIF", "ITALIC"]], "\ud835\ude15": ["N", ["SANS-SERIF", "ITALIC"]], "\ud835\ude16": ["O", ["SANS-SERIF", "ITALIC"]], "\ud835\ude17": ["P", ["SANS-SERIF", "ITALIC"]], "\ud835\ude18": ["Q", ["SANS-SERIF", "ITALIC"]], "\ud835\ude19": ["R", ["SANS-SERIF", "ITALIC"]], "\ud835\ude1a": ["S", ["SANS-SERIF", "ITALIC"]], "\ud835\ude1b": ["T", ["SANS-SERIF", "ITALIC"]], "\ud835\ude1c": ["U", ["SANS-SERIF", "ITALIC"]], "\ud835\ude1d": ["V", ["SANS-SERIF", "ITALIC"]], "\ud835\ude1e": ["W", ["SANS-SERIF", "ITALIC"]], "\ud835\ude1f": ["X", ["SANS-SERIF", "ITALIC"]], "\ud835\ude20": ["Y", ["SANS-SERIF", "ITALIC"]], "\ud835\ude21": ["Z", ["SANS-SERIF", "ITALIC"]], "\ud835\ude22": ["a", ["SANS-SERIF", "ITALIC"]], "\ud835\ude23": ["b", ["SANS-SERIF", "ITALIC"]], "\ud835\ude24": ["c", ["SANS-SERIF", "ITALIC"]], "\ud835\ude25": ["d", ["SANS-SERIF", "ITALIC"]], "\ud835\ude26": ["e", ["SANS-SERIF", "ITALIC"]], "\ud835\ude27": ["f", ["SANS-SERIF", "ITALIC"]], "\ud835\ude28": ["g", ["SANS-SERIF", "ITALIC"]], "\ud835\ude29": ["h", ["SANS-SERIF", "ITALIC"]], "\ud835\ude2a": ["i", ["SANS-SERIF", "ITALIC"]], "\ud835\ude2b": ["j", ["SANS-SERIF", "ITALIC"]], "\ud835\ude2c": ["k", ["SANS-SERIF", "ITALIC"]], "\ud835\ude2d": ["l", ["SANS-SERIF", "ITALIC"]], "\ud835\ude2e": ["m", ["SANS-SERIF", "ITALIC"]], "\ud835\ude2f": ["n", ["SANS-SERIF", "ITALIC"]], "\ud835\ude30": ["o", ["SANS-SERIF", "ITALIC"]], "\ud835\ude31": ["p", ["SANS-SERIF", "ITALIC"]], "\ud835\ude32": ["q", ["SANS-SERIF", "ITALIC"]], "\ud835\ude33": ["r", ["SANS-SERIF", "ITALIC"]], "\ud835\ude34": ["s", ["SANS-SERIF", "ITALIC"]], "\ud835\ude35": ["t", ["SANS-SERIF", "ITALIC"]], "\ud835\ude36": ["u", ["SANS-SERIF", "ITALIC"]], "\ud835\ude37": ["v", ["SANS-SERIF", "ITALIC"]], "\ud835\ude38": ["w", ["SANS-SERIF", "ITALIC"]], "\ud835\ude39": ["x", ["SANS-SERIF", "ITALIC"]], "\ud835\ude3a": ["y", ["SANS-SERIF", "ITALIC"]], "\ud835\ude3b": ["z", ["SANS-SERIF", "ITALIC"]], "\ud835\ude3c": ["A", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude3d": ["B", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude3e": ["C", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude3f": ["D", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude40": ["E", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude41": ["F", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude42": ["G", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude43": ["H", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude44": ["I", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude45": ["J", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude46": ["K", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude47": ["L", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude48": ["M", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude49": ["N", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude4a": ["O", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude4b": ["P", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude4c": ["Q", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude4d": ["R", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude4e": ["S", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude4f": ["T", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude50": ["U", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude51": ["V", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude52": ["W", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude53": ["X", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude54": ["Y", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude55": ["Z", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude56": ["a", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude57": ["b", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude58": ["c", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude59": ["d", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude5a": ["e", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude5b": ["f", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude5c": ["g", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude5d": ["h", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude5e": ["i", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude5f": ["j", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude60": ["k", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude61": ["l", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude62": ["m", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude63": ["n", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude64": ["o", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude65": ["p", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude66": ["q", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude67": ["r", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude68": ["s", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude69": ["t", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude6a": ["u", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude6b": ["v", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude6c": ["w", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude6d": ["x", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude6e": ["y", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude6f": ["z", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\ude70": ["A", ["MONOSPACE"]], "\ud835\ude71": ["B", ["MONOSPACE"]], "\ud835\ude72": ["C", ["MONOSPACE"]], "\ud835\ude73": ["D", ["MONOSPACE"]], "\ud835\ude74": ["E", ["MONOSPACE"]], "\ud835\ude75": ["F", ["MONOSPACE"]], "\ud835\ude76": ["G", ["MONOSPACE"]], "\ud835\ude77": ["H", ["MONOSPACE"]], "\ud835\ude78": ["I", ["MONOSPACE"]], "\ud835\ude79": ["J", ["MONOSPACE"]], "\ud835\ude7a": ["K", ["MONOSPACE"]], "\ud835\ude7b": ["L", ["MONOSPACE"]], "\ud835\ude7c": ["M", ["MONOSPACE"]], "\ud835\ude7d": ["N", ["MONOSPACE"]], "\ud835\ude7e": ["O", ["MONOSPACE"]], "\ud835\ude7f": ["P", ["MONOSPACE"]], "\ud835\ude80": ["Q", ["MONOSPACE"]], "\ud835\ude81": ["R", ["MONOSPACE"]], "\ud835\ude82": ["S", ["MONOSPACE"]], "\ud835\ude83": ["T", ["MONOSPACE"]], "\ud835\ude84": ["U", ["MONOSPACE"]], "\ud835\ude85": ["V", ["MONOSPACE"]], "\ud835\ude86": ["W", ["MONOSPACE"]], "\ud835\ude87": ["X", ["MONOSPACE"]], "\ud835\ude88": ["Y", ["MONOSPACE"]], "\ud835\ude89": ["Z", ["MONOSPACE"]], "\ud835\ude8a": ["a", ["MONOSPACE"]], "\ud835\ude8b": ["b", ["MONOSPACE"]], "\ud835\ude8c": ["c", ["MONOSPACE"]], "\ud835\ude8d": ["d", ["MONOSPACE"]], "\ud835\ude8e": ["e", ["MONOSPACE"]], "\ud835\ude8f": ["f", ["MONOSPACE"]], "\ud835\ude90": ["g", ["MONOSPACE"]], "\ud835\ude91": ["h", ["MONOSPACE"]], "\ud835\ude92": ["i", ["MONOSPACE"]], "\ud835\ude93": ["j", ["MONOSPACE"]], "\ud835\ude94": ["k", ["MONOSPACE"]], "\ud835\ude95": ["l", ["MONOSPACE"]], "\ud835\ude96": ["m", ["MONOSPACE"]], "\ud835\ude97": ["n", ["MONOSPACE"]], "\ud835\ude98": ["o", ["MONOSPACE"]], "\ud835\ude99": ["p", ["MONOSPACE"]], "\ud835\ude9a": ["q", ["MONOSPACE"]], "\ud835\ude9b": ["r", ["MONOSPACE"]], "\ud835\ude9c": ["s", ["MONOSPACE"]], "\ud835\ude9d": ["t", ["MONOSPACE"]], "\ud835\ude9e": ["u", ["MONOSPACE"]], "\ud835\ude9f": ["v", ["MONOSPACE"]], "\ud835\udea0": ["w", ["MONOSPACE"]], "\ud835\udea1": ["x", ["MONOSPACE"]], "\ud835\udea2": ["y", ["MONOSPACE"]], "\ud835\udea3": ["z", ["MONOSPACE"]], "\ud835\udea4": ["\u0131", ["ITALIC"]], "\ud835\udea5": ["\u0237", ["ITALIC"]], "\ud835\udea8": ["\u0391", ["BOLD"]], "\ud835\udea9": ["\u0392", ["BOLD"]], "\ud835\udeaa": ["\u0393", ["BOLD"]], "\ud835\udeab": ["\u0394", ["BOLD"]], "\ud835\udeac": ["\u0395", ["BOLD"]], "\ud835\udead": ["\u0396", ["BOLD"]], "\ud835\udeae": ["\u0397", ["BOLD"]], "\ud835\udeaf": ["\u0398", ["BOLD"]], "\ud835\udeb0": ["\u0399", ["BOLD"]], "\ud835\udeb1": ["\u039a", ["BOLD"]], "\ud835\udeb2": ["\u039b", ["BOLD"]], "\ud835\udeb3": ["\u039c", ["BOLD"]], "\ud835\udeb4": ["\u039d", ["BOLD"]], "\ud835\udeb5": ["\u039e", ["BOLD"]], "\ud835\udeb6": ["\u039f", ["BOLD"]], "\ud835\udeb7": ["\u03a0", ["BOLD"]], "\ud835\udeb8": ["\u03a1", ["BOLD"]], "\ud835\udeb9": ["\u0398", ["BOLD"]], "\ud835\udeba": ["\u03a3", ["BOLD"]], "\ud835\udebb": ["\u03a4", ["BOLD"]], "\ud835\udebc": ["\u03a5", ["BOLD"]], "\ud835\udebd": ["\u03a6", ["BOLD"]], "\ud835\udebe": ["\u03a7", ["BOLD"]], "\ud835\udebf": ["\u03a8", ["BOLD"]], "\ud835\udec0": ["\u03a9", ["BOLD"]], "\ud835\udec2": ["\u03b1", ["BOLD"]], "\ud835\udec3": ["\u03b2", ["BOLD"]], "\ud835\udec4": ["\u03b3", ["BOLD"]], "\ud835\udec5": ["\u03b4", ["BOLD"]], "\ud835\udec6": ["\u03b5", ["BOLD"]], "\ud835\udec7": ["\u03b6", ["BOLD"]], "\ud835\udec8": ["\u03b7", ["BOLD"]], "\ud835\udec9": ["\u03b8", ["BOLD"]], "\ud835\udeca": ["\u03b9", ["BOLD"]], "\ud835\udecb": ["\u03ba", ["BOLD"]], "\ud835\udecc": ["\u03bb", ["BOLD"]], "\ud835\udecd": ["\u03bc", ["BOLD"]], "\ud835\udece": ["\u03bd", ["BOLD"]], "\ud835\udecf": ["\u03be", ["BOLD"]], "\ud835\uded0": ["\u03bf", ["BOLD"]], "\ud835\uded1": ["\u03c0", ["BOLD"]], "\ud835\uded2": ["\u03c1", ["BOLD"]], "\ud835\uded3": ["\u03c2", ["BOLD"]], "\ud835\uded4": ["\u03c3", ["BOLD"]], "\ud835\uded5": ["\u03c4", ["BOLD"]], "\ud835\uded6": ["\u03c5", ["BOLD"]], "\ud835\uded7": ["\u03c6", ["BOLD"]], "\ud835\uded8": ["\u03c7", ["BOLD"]], "\ud835\uded9": ["\u03c8", ["BOLD"]], "\ud835\udeda": ["\u03c9", ["BOLD"]], "\ud835\udedc": ["\u03b5", ["BOLD"]], "\ud835\udedd": ["\u03b8", ["BOLD"]], "\ud835\udede": ["\u03ba", ["BOLD"]], "\ud835\udedf": ["\u03c6", ["BOLD"]], "\ud835\udee0": ["\u03c1", ["BOLD"]], "\ud835\udee1": ["\u03c0", ["BOLD"]], "\ud835\udee2": ["\u0391", ["ITALIC"]], "\ud835\udee3": ["\u0392", ["ITALIC"]], "\ud835\udee4": ["\u0393", ["ITALIC"]], "\ud835\udee5": ["\u0394", ["ITALIC"]], "\ud835\udee6": ["\u0395", ["ITALIC"]], "\ud835\udee7": ["\u0396", ["ITALIC"]], "\ud835\udee8": ["\u0397", ["ITALIC"]], "\ud835\udee9": ["\u0398", ["ITALIC"]], "\ud835\udeea": ["\u0399", ["ITALIC"]], "\ud835\udeeb": ["\u039a", ["ITALIC"]], "\ud835\udeec": ["\u039b", ["ITALIC"]], "\ud835\udeed": ["\u039c", ["ITALIC"]], "\ud835\udeee": ["\u039d", ["ITALIC"]], "\ud835\udeef": ["\u039e", ["ITALIC"]], "\ud835\udef0": ["\u039f", ["ITALIC"]], "\ud835\udef1": ["\u03a0", ["ITALIC"]], "\ud835\udef2": ["\u03a1", ["ITALIC"]], "\ud835\udef3": ["\u0398", ["ITALIC"]], "\ud835\udef4": ["\u03a3", ["ITALIC"]], "\ud835\udef5": ["\u03a4", ["ITALIC"]], "\ud835\udef6": ["\u03a5", ["ITALIC"]], "\ud835\udef7": ["\u03a6", ["ITALIC"]], "\ud835\udef8": ["\u03a7", ["ITALIC"]], "\ud835\udef9": ["\u03a8", ["ITALIC"]], "\ud835\udefa": ["\u03a9", ["ITALIC"]], "\ud835\udefc": ["\u03b1", ["ITALIC"]], "\ud835\udefd": ["\u03b2", ["ITALIC"]], "\ud835\udefe": ["\u03b3", ["ITALIC"]], "\ud835\udeff": ["\u03b4", ["ITALIC"]], "\ud835\udf00": ["\u03b5", ["ITALIC"]], "\ud835\udf01": ["\u03b6", ["ITALIC"]], "\ud835\udf02": ["\u03b7", ["ITALIC"]], "\ud835\udf03": ["\u03b8", ["ITALIC"]], "\ud835\udf04": ["\u03b9", ["ITALIC"]], "\ud835\udf05": ["\u03ba", ["ITALIC"]], "\ud835\udf06": ["\u03bb", ["ITALIC"]], "\ud835\udf07": ["\u03bc", ["ITALIC"]], "\ud835\udf08": ["\u03bd", ["ITALIC"]], "\ud835\udf09": ["\u03be", ["ITALIC"]], "\ud835\udf0a": ["\u03bf", ["ITALIC"]], "\ud835\udf0b": ["\u03c0", ["ITALIC"]], "\ud835\udf0c": ["\u03c1", ["ITALIC"]], "\ud835\udf0d": ["\u03c2", ["ITALIC"]], "\ud835\udf0e": ["\u03c3", ["ITALIC"]], "\ud835\udf0f": ["\u03c4", ["ITALIC"]], "\ud835\udf10": ["\u03c5", ["ITALIC"]], "\ud835\udf11": ["\u03c6", ["ITALIC"]], "\ud835\udf12": ["\u03c7", ["ITALIC"]], "\ud835\udf13": ["\u03c8", ["ITALIC"]], "\ud835\udf14": ["\u03c9", ["ITALIC"]], "\ud835\udf16": ["\u03b5", ["ITALIC"]], "\ud835\udf17": ["\u03b8", ["ITALIC"]], "\ud835\udf18": ["\u03ba", ["ITALIC"]], "\ud835\udf19": ["\u03c6", ["ITALIC"]], "\ud835\udf1a": ["\u03c1", ["ITALIC"]], "\ud835\udf1b": ["\u03c0", ["ITALIC"]], "\ud835\udf1c": ["\u0391", ["BOLD", "ITALIC"]], "\ud835\udf1d": ["\u0392", ["BOLD", "ITALIC"]], "\ud835\udf1e": ["\u0393", ["BOLD", "ITALIC"]], "\ud835\udf1f": ["\u0394", ["BOLD", "ITALIC"]], "\ud835\udf20": ["\u0395", ["BOLD", "ITALIC"]], "\ud835\udf21": ["\u0396", ["BOLD", "ITALIC"]], "\ud835\udf22": ["\u0397", ["BOLD", "ITALIC"]], "\ud835\udf23": ["\u0398", ["BOLD", "ITALIC"]], "\ud835\udf24": ["\u0399", ["BOLD", "ITALIC"]], "\ud835\udf25": ["\u039a", ["BOLD", "ITALIC"]], "\ud835\udf26": ["\u039b", ["BOLD", "ITALIC"]], "\ud835\udf27": ["\u039c", ["BOLD", "ITALIC"]], "\ud835\udf28": ["\u039d", ["BOLD", "ITALIC"]], "\ud835\udf29": ["\u039e", ["BOLD", "ITALIC"]], "\ud835\udf2a": ["\u039f", ["BOLD", "ITALIC"]], "\ud835\udf2b": ["\u03a0", ["BOLD", "ITALIC"]], "\ud835\udf2c": ["\u03a1", ["BOLD", "ITALIC"]], "\ud835\udf2d": ["\u0398", ["BOLD", "ITALIC"]], "\ud835\udf2e": ["\u03a3", ["BOLD", "ITALIC"]], "\ud835\udf2f": ["\u03a4", ["BOLD", "ITALIC"]], "\ud835\udf30": ["\u03a5", ["BOLD", "ITALIC"]], "\ud835\udf31": ["\u03a6", ["BOLD", "ITALIC"]], "\ud835\udf32": ["\u03a7", ["BOLD", "ITALIC"]], "\ud835\udf33": ["\u03a8", ["BOLD", "ITALIC"]], "\ud835\udf34": ["\u03a9", ["BOLD", "ITALIC"]], "\ud835\udf36": ["\u03b1", ["BOLD", "ITALIC"]], "\ud835\udf37": ["\u03b2", ["BOLD", "ITALIC"]], "\ud835\udf38": ["\u03b3", ["BOLD", "ITALIC"]], "\ud835\udf39": ["\u03b4", ["BOLD", "ITALIC"]], "\ud835\udf3a": ["\u03b5", ["BOLD", "ITALIC"]], "\ud835\udf3b": ["\u03b6", ["BOLD", "ITALIC"]], "\ud835\udf3c": ["\u03b7", ["BOLD", "ITALIC"]], "\ud835\udf3d": ["\u03b8", ["BOLD", "ITALIC"]], "\ud835\udf3e": ["\u03b9", ["BOLD", "ITALIC"]], "\ud835\udf3f": ["\u03ba", ["BOLD", "ITALIC"]], "\ud835\udf40": ["\u03bb", ["BOLD", "ITALIC"]], "\ud835\udf41": ["\u03bc", ["BOLD", "ITALIC"]], "\ud835\udf42": ["\u03bd", ["BOLD", "ITALIC"]], "\ud835\udf43": ["\u03be", ["BOLD", "ITALIC"]], "\ud835\udf44": ["\u03bf", ["BOLD", "ITALIC"]], "\ud835\udf45": ["\u03c0", ["BOLD", "ITALIC"]], "\ud835\udf46": ["\u03c1", ["BOLD", "ITALIC"]], "\ud835\udf47": ["\u03c2", ["BOLD", "ITALIC"]], "\ud835\udf48": ["\u03c3", ["BOLD", "ITALIC"]], "\ud835\udf49": ["\u03c4", ["BOLD", "ITALIC"]], "\ud835\udf4a": ["\u03c5", ["BOLD", "ITALIC"]], "\ud835\udf4b": ["\u03c6", ["BOLD", "ITALIC"]], "\ud835\udf4c": ["\u03c7", ["BOLD", "ITALIC"]], "\ud835\udf4d": ["\u03c8", ["BOLD", "ITALIC"]], "\ud835\udf4e": ["\u03c9", ["BOLD", "ITALIC"]], "\ud835\udf50": ["\u03b5", ["BOLD", "ITALIC"]], "\ud835\udf51": ["\u03b8", ["BOLD", "ITALIC"]], "\ud835\udf52": ["\u03ba", ["BOLD", "ITALIC"]], "\ud835\udf53": ["\u03c6", ["BOLD", "ITALIC"]], "\ud835\udf54": ["\u03c1", ["BOLD", "ITALIC"]], "\ud835\udf55": ["\u03c0", ["BOLD", "ITALIC"]], "\ud835\udf56": ["\u0391", ["SANS-SERIF", "BOLD"]], "\ud835\udf57": ["\u0392", ["SANS-SERIF", "BOLD"]], "\ud835\udf58": ["\u0393", ["SANS-SERIF", "BOLD"]], "\ud835\udf59": ["\u0394", ["SANS-SERIF", "BOLD"]], "\ud835\udf5a": ["\u0395", ["SANS-SERIF", "BOLD"]], "\ud835\udf5b": ["\u0396", ["SANS-SERIF", "BOLD"]], "\ud835\udf5c": ["\u0397", ["SANS-SERIF", "BOLD"]], "\ud835\udf5d": ["\u0398", ["SANS-SERIF", "BOLD"]], "\ud835\udf5e": ["\u0399", ["SANS-SERIF", "BOLD"]], "\ud835\udf5f": ["\u039a", ["SANS-SERIF", "BOLD"]], "\ud835\udf60": ["\u039b", ["SANS-SERIF", "BOLD"]], "\ud835\udf61": ["\u039c", ["SANS-SERIF", "BOLD"]], "\ud835\udf62": ["\u039d", ["SANS-SERIF", "BOLD"]], "\ud835\udf63": ["\u039e", ["SANS-SERIF", "BOLD"]], "\ud835\udf64": ["\u039f", ["SANS-SERIF", "BOLD"]], "\ud835\udf65": ["\u03a0", ["SANS-SERIF", "BOLD"]], "\ud835\udf66": ["\u03a1", ["SANS-SERIF", "BOLD"]], "\ud835\udf67": ["\u0398", ["SANS-SERIF", "BOLD"]], "\ud835\udf68": ["\u03a3", ["SANS-SERIF", "BOLD"]], "\ud835\udf69": ["\u03a4", ["SANS-SERIF", "BOLD"]], "\ud835\udf6a": ["\u03a5", ["SANS-SERIF", "BOLD"]], "\ud835\udf6b": ["\u03a6", ["SANS-SERIF", "BOLD"]], "\ud835\udf6c": ["\u03a7", ["SANS-SERIF", "BOLD"]], "\ud835\udf6d": ["\u03a8", ["SANS-SERIF", "BOLD"]], "\ud835\udf6e": ["\u03a9", ["SANS-SERIF", "BOLD"]], "\ud835\udf70": ["\u03b1", ["SANS-SERIF", "BOLD"]], "\ud835\udf71": ["\u03b2", ["SANS-SERIF", "BOLD"]], "\ud835\udf72": ["\u03b3", ["SANS-SERIF", "BOLD"]], "\ud835\udf73": ["\u03b4", ["SANS-SERIF", "BOLD"]], "\ud835\udf74": ["\u03b5", ["SANS-SERIF", "BOLD"]], "\ud835\udf75": ["\u03b6", ["SANS-SERIF", "BOLD"]], "\ud835\udf76": ["\u03b7", ["SANS-SERIF", "BOLD"]], "\ud835\udf77": ["\u03b8", ["SANS-SERIF", "BOLD"]], "\ud835\udf78": ["\u03b9", ["SANS-SERIF", "BOLD"]], "\ud835\udf79": ["\u03ba", ["SANS-SERIF", "BOLD"]], "\ud835\udf7a": ["\u03bb", ["SANS-SERIF", "BOLD"]], "\ud835\udf7b": ["\u03bc", ["SANS-SERIF", "BOLD"]], "\ud835\udf7c": ["\u03bd", ["SANS-SERIF", "BOLD"]], "\ud835\udf7d": ["\u03be", ["SANS-SERIF", "BOLD"]], "\ud835\udf7e": ["\u03bf", ["SANS-SERIF", "BOLD"]], "\ud835\udf7f": ["\u03c0", ["SANS-SERIF", "BOLD"]], "\ud835\udf80": ["\u03c1", ["SANS-SERIF", "BOLD"]], "\ud835\udf81": ["\u03c2", ["SANS-SERIF", "BOLD"]], "\ud835\udf82": ["\u03c3", ["SANS-SERIF", "BOLD"]], "\ud835\udf83": ["\u03c4", ["SANS-SERIF", "BOLD"]], "\ud835\udf84": ["\u03c5", ["SANS-SERIF", "BOLD"]], "\ud835\udf85": ["\u03c6", ["SANS-SERIF", "BOLD"]], "\ud835\udf86": ["\u03c7", ["SANS-SERIF", "BOLD"]], "\ud835\udf87": ["\u03c8", ["SANS-SERIF", "BOLD"]], "\ud835\udf88": ["\u03c9", ["SANS-SERIF", "BOLD"]], "\ud835\udf8a": ["\u03b5", ["SANS-SERIF", "BOLD"]], "\ud835\udf8b": ["\u03b8", ["SANS-SERIF", "BOLD"]], "\ud835\udf8c": ["\u03ba", ["SANS-SERIF", "BOLD"]], "\ud835\udf8d": ["\u03c6", ["SANS-SERIF", "BOLD"]], "\ud835\udf8e": ["\u03c1", ["SANS-SERIF", "BOLD"]], "\ud835\udf8f": ["\u03c0", ["SANS-SERIF", "BOLD"]], "\ud835\udf90": ["\u0391", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf91": ["\u0392", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf92": ["\u0393", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf93": ["\u0394", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf94": ["\u0395", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf95": ["\u0396", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf96": ["\u0397", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf97": ["\u0398", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf98": ["\u0399", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf99": ["\u039a", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf9a": ["\u039b", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf9b": ["\u039c", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf9c": ["\u039d", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf9d": ["\u039e", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf9e": ["\u039f", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udf9f": ["\u03a0", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa0": ["\u03a1", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa1": ["\u0398", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa2": ["\u03a3", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa3": ["\u03a4", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa4": ["\u03a5", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa5": ["\u03a6", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa6": ["\u03a7", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa7": ["\u03a8", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfa8": ["\u03a9", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfaa": ["\u03b1", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfab": ["\u03b2", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfac": ["\u03b3", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfad": ["\u03b4", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfae": ["\u03b5", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfaf": ["\u03b6", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb0": ["\u03b7", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb1": ["\u03b8", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb2": ["\u03b9", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb3": ["\u03ba", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb4": ["\u03bb", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb5": ["\u03bc", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb6": ["\u03bd", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb7": ["\u03be", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb8": ["\u03bf", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfb9": ["\u03c0", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfba": ["\u03c1", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfbb": ["\u03c2", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfbc": ["\u03c3", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfbd": ["\u03c4", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfbe": ["\u03c5", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfbf": ["\u03c6", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc0": ["\u03c7", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc1": ["\u03c8", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc2": ["\u03c9", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc4": ["\u03b5", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc5": ["\u03b8", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc6": ["\u03ba", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc7": ["\u03c6", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc8": ["\u03c1", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc9": ["\u03c0", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfca": ["\u03dc", ["BOLD"]], "\ud835\udfcb": ["\u03dd", ["BOLD"]], "\ud83b\ude00": ["\u0627", []], "\ud83b\ude01": ["\u0628", []], "\ud83b\ude02": ["\u062c", []], "\ud83b\ude03": ["\u062f", []], "\ud83b\ude05": ["\u0648", []], "\ud83b\ude06": ["\u0632", []], "\ud83b\ude07": ["\u062d", []], "\ud83b\ude08": ["\u0637", []], "\ud83b\ude09": ["\u064a", []], "\ud83b\ude0a": ["\u0643", []], "\ud83b\ude0b": ["\u0644", []], "\ud83b\ude0c": ["\u0645", []], "\ud83b\ude0d": ["\u0646", []], "\ud83b\ude0e": ["\u0633", []], "\ud83b\ude0f": ["\u0639", []], "\ud83b\ude10": ["\u0641", []], "\ud83b\ude11": ["\u0635", []], "\ud83b\ude12": ["\u0642", []], "\ud83b\ude13": ["\u0631", []], "\ud83b\ude14": ["\u0634", []], "\ud83b\ude15": ["\u062a", []], "\ud83b\ude16": ["\u062b", []], "\ud83b\ude17": ["\u062e", []], "\ud83b\ude18": ["\u0630", []], "\ud83b\ude19": ["\u0636", []], "\ud83b\ude1a": ["\u0638", []], "\ud83b\ude1b": ["\u063a", []], "\ud83b\ude1c": ["\u066e", ["DOTLESS"]], "\ud83b\ude1d": ["\u06ba", ["DOTLESS"]], "\ud83b\ude1e": ["\u06a1", ["DOTLESS"]], "\ud83b\ude1f": ["\u066f", ["DOTLESS"]], "\ud83b\ude21": ["\u0628", ["INITIAL"]], "\ud83b\ude22": ["\u062c", ["INITIAL"]], "\ud83b\ude24": ["\u0647", ["INITIAL"]], "\ud83b\ude27": ["\u062d", ["INITIAL"]], "\ud83b\ude29": ["\u064a", ["INITIAL"]], "\ud83b\ude2a": ["\u0643", ["INITIAL"]], "\ud83b\ude2b": ["\u0644", ["INITIAL"]], "\ud83b\ude2c": ["\u0645", ["INITIAL"]], "\ud83b\ude2d": ["\u0646", ["INITIAL"]], "\ud83b\ude2e": ["\u0633", ["INITIAL"]], "\ud83b\ude2f": ["\u0639", ["INITIAL"]], "\ud83b\ude30": ["\u0641", ["INITIAL"]], "\ud83b\ude31": ["\u0635", ["INITIAL"]], "\ud83b\ude32": ["\u0642", ["INITIAL"]], "\ud83b\ude34": ["\u0634", ["INITIAL"]], "\ud83b\ude35": ["\u062a", ["INITIAL"]], "\ud83b\ude36": ["\u062b", ["INITIAL"]], "\ud83b\ude37": ["\u062e", ["INITIAL"]], "\ud83b\ude39": ["\u0636", ["INITIAL"]], "\ud83b\ude3b": ["\u063a", ["INITIAL"]], "\ud83b\ude42": ["\u062c", ["TAILED"]], "\ud83b\ude47": ["\u062d", ["TAILED"]], "\ud83b\ude49": ["\u064a", ["TAILED"]], "\ud83b\ude4b": ["\u0644", ["TAILED"]], "\ud83b\ude4d": ["\u0646", ["TAILED"]], "\ud83b\ude4e": ["\u0633", ["TAILED"]], "\ud83b\ude4f": ["\u0639", ["TAILED"]], "\ud83b\ude51": ["\u0635", ["TAILED"]], "\ud83b\ude52": ["\u0642", ["TAILED"]], "\ud83b\ude54": ["\u0634", ["TAILED"]], "\ud83b\ude57": ["\u062e", ["TAILED"]], "\ud83b\ude59": ["\u0636", ["TAILED"]], "\ud83b\ude5b": ["\u063a", ["TAILED"]], "\ud83b\ude5d": ["\u06ba", ["TAILED", "DOTLESS"]], "\ud83b\ude5f": ["\u066f", ["TAILED", "DOTLESS"]], "\ud83b\ude61": ["\u0628", ["STRETCHED"]], "\ud83b\ude62": ["\u062c", ["STRETCHED"]], "\ud83b\ude64": ["\u0647", ["STRETCHED"]], "\ud83b\ude67": ["\u062d", ["STRETCHED"]], "\ud83b\ude68": ["\u0637", ["STRETCHED"]], "\ud83b\ude69": ["\u064a", ["STRETCHED"]], "\ud83b\ude6a": ["\u0643", ["STRETCHED"]], "\ud83b\ude6c": ["\u0645", ["STRETCHED"]], "\ud83b\ude6d": ["\u0646", ["STRETCHED"]], "\ud83b\ude6e": ["\u0633", ["STRETCHED"]], "\ud83b\ude6f": ["\u0639", ["STRETCHED"]], "\ud83b\ude70": ["\u0641", ["STRETCHED"]], "\ud83b\ude71": ["\u0635", ["STRETCHED"]], "\ud83b\ude72": ["\u0642", ["STRETCHED"]], "\ud83b\ude74": ["\u0634", ["STRETCHED"]], "\ud83b\ude75": ["\u062a", ["STRETCHED"]], "\ud83b\ude76": ["\u062b", ["STRETCHED"]], "\ud83b\ude77": ["\u062e", ["STRETCHED"]], "\ud83b\ude79": ["\u0636", ["STRETCHED"]], "\ud83b\ude7a": ["\u0638", ["STRETCHED"]], "\ud83b\ude7b": ["\u063a", ["STRETCHED"]], "\ud83b\ude7c": ["\u066e", ["STRETCHED", "DOTLESS"]], "\ud83b\ude7e": ["\u06a1", ["STRETCHED", "DOTLESS"]], "\ud83b\ude80": ["\u0627", ["LOOPED"]], "\ud83b\ude81": ["\u0628", ["LOOPED"]], "\ud83b\ude82": ["\u062c", ["LOOPED"]], "\ud83b\ude83": ["\u062f", ["LOOPED"]], "\ud83b\ude84": ["\u0647", ["LOOPED"]], "\ud83b\ude85": ["\u0648", ["LOOPED"]], "\ud83b\ude86": ["\u0632", ["LOOPED"]], "\ud83b\ude87": ["\u062d", ["LOOPED"]], "\ud83b\ude88": ["\u0637", ["LOOPED"]], "\ud83b\ude89": ["\u064a", ["LOOPED"]], "\ud83b\ude8b": ["\u0644", ["LOOPED"]], "\ud83b\ude8c": ["\u0645", ["LOOPED"]], "\ud83b\ude8d": ["\u0646", ["LOOPED"]], "\ud83b\ude8e": ["\u0633", ["LOOPED"]], "\ud83b\ude8f": ["\u0639", ["LOOPED"]], "\ud83b\ude90": ["\u0641", ["LOOPED"]], "\ud83b\ude91": ["\u0635", ["LOOPED"]], "\ud83b\ude92": ["\u0642", ["LOOPED"]], "\ud83b\ude93": ["\u0631", ["LOOPED"]], "\ud83b\ude94": ["\u0634", ["LOOPED"]], "\ud83b\ude95": ["\u062a", ["LOOPED"]], "\ud83b\ude96": ["\u062b", ["LOOPED"]], "\ud83b\ude97": ["\u062e", ["LOOPED"]], "\ud83b\ude98": ["\u0630", ["LOOPED"]], "\ud83b\ude99": ["\u0636", ["LOOPED"]], "\ud83b\ude9a": ["\u0638", ["LOOPED"]], "\ud83b\ude9b": ["\u063a", ["LOOPED"]], "\ud83b\udea1": ["\u0628", ["DOUBLE-STRUCK"]], "\ud83b\udea2": ["\u062c", ["DOUBLE-STRUCK"]], "\ud83b\udea3": ["\u062f", ["DOUBLE-STRUCK"]], "\ud83b\udea5": ["\u0648", ["DOUBLE-STRUCK"]], "\ud83b\udea6": ["\u0632", ["DOUBLE-STRUCK"]], "\ud83b\udea7": ["\u062d", ["DOUBLE-STRUCK"]], "\ud83b\udea8": ["\u0637", ["DOUBLE-STRUCK"]], "\ud83b\udea9": ["\u064a", ["DOUBLE-STRUCK"]], "\ud83b\udeab": ["\u0644", ["DOUBLE-STRUCK"]], "\ud83b\udeac": ["\u0645", ["DOUBLE-STRUCK"]], "\ud83b\udead": ["\u0646", ["DOUBLE-STRUCK"]], "\ud83b\udeae": ["\u0633", ["DOUBLE-STRUCK"]], "\ud83b\udeaf": ["\u0639", ["DOUBLE-STRUCK"]], "\ud83b\udeb0": ["\u0641", ["DOUBLE-STRUCK"]], "\ud83b\udeb1": ["\u0635", ["DOUBLE-STRUCK"]], "\ud83b\udeb2": ["\u0642", ["DOUBLE-STRUCK"]], "\ud83b\udeb3": ["\u0631", ["DOUBLE-STRUCK"]], "\ud83b\udeb4": ["\u0634", ["DOUBLE-STRUCK"]], "\ud83b\udeb5": ["\u062a", ["DOUBLE-STRUCK"]], "\ud83b\udeb6": ["\u062b", ["DOUBLE-STRUCK"]], "\ud83b\udeb7": ["\u062e", ["DOUBLE-STRUCK"]], "\ud83b\udeb8": ["\u0630", ["DOUBLE-STRUCK"]], "\ud83b\udeb9": ["\u0636", ["DOUBLE-STRUCK"]], "\ud83b\udeba": ["\u0638", ["DOUBLE-STRUCK"]], "\ud83b\udebb": ["\u063a", ["DOUBLE-STRUCK"]], "\u00b5": ["\u03bc", []], "\u2107": ["E", []], "\u210e": ["h", []], "\u210f": ["hbar", []], "\u2126": ["omega", []], "\u2127": ["ohm", []], "\u212b": ["A", ["RING"]], "\u2102": ["C", ["DOUBLE-STRUCK"]], "\u210d": ["H", ["DOUBLE-STRUCK"]], "\u2115": ["N", ["DOUBLE-STRUCK"]], "\u2119": ["P", ["DOUBLE-STRUCK"]], "\u211a": ["Q", ["DOUBLE-STRUCK"]], "\u211d": ["R", ["DOUBLE-STRUCK"]], "\u2124": ["Z", ["DOUBLE-STRUCK"]], "\u213c": ["pi", ["DOUBLE-STRUCK"]], "\u213d": ["gamma", ["DOUBLE-STRUCK"]], "\u213e": ["gamma", ["DOUBLE-STRUCK"]], "\u213f": ["Pi", []], "\u2145": ["D", ["DOUBLE-STRUCK", "ITALIC"]], "\u2146": ["d", ["DOUBLE-STRUCK", "ITALIC"]], "\u2147": ["e", ["DOUBLE-STRUCK", "ITALIC"]], "\u2148": ["i", ["DOUBLE-STRUCK", "ITALIC"]], "\u2149": ["j", ["DOUBLE-STRUCK", "ITALIC"]], "\u210a": ["g", ["SCRIPT"]], "\u210b": ["H", ["SCRIPT"]], "\u2110": ["I", ["SCRIPT"]], "\u2112": ["L", ["SCRIPT"]], "\u2113": ["l", ["SCRIPT"]], "\u211b": ["R", ["SCRIPT"]], "\u212c": ["B", ["SCRIPT"]], "\u212f": ["e", ["SCRIPT"]], "\u2130": ["E", ["SCRIPT"]], "\u2131": ["F", ["SCRIPT"]], "\u2133": ["M", ["SCRIPT"]], "\u2134": ["o", ["SCRIPT"]], "\u210c": ["H", ["BLACK-LETTER"]], "\u2111": ["I", ["BLACK-LETTER"]], "\u211c": ["R", ["BLACK-LETTER"]], "\u2128": ["Z", ["BLACK-LETTER"]], "\u212d": ["C", ["BLACK-LETTER"]], "\u2135": ["alef", []], "\u2136": ["bet", []], "\u2137": ["gimel", []], "\u2138": ["dalet", []], "\u221e": ["infinity", []], "\u2205": ["emptyset", []], "\u29b0": ["emptyset", []]}, "symbols": {"~": ["~", []], "\u00ac": ["not", []], "\u00d7": ["*", []], "\u00f7": ["/", []], "\u2208": ["in", []], "\u2213": ["pm", []], "\u2227": ["and", []], "\u2228": ["or", []], "\u00b1": ["pm", []], "\u0606": ["cube_root", []], "\u0607": ["fourth_root", []], "\u2044": ["/", []], "\u2052": ["-", []], "\u208b": ["-", []], "\u2118": ["P", ["SCRIPT"]], "\u2140": ["sum", ["DOUBLE-STRUCK"]], "\u2200": ["forall", []], "\u2201": ["complement", []], "\u2202": ["pdiff", []], "\u2203": ["exists", []], "\u2204": ["not exists", []], "\u2206": ["increment", []], "\u2207": ["nabla", []], "\u2209": ["not in", []], "\u220a": ["in", []], "\u220b": ["contains", []], "\u220c": ["not contains", []], "\u220d": ["contains", []], "\u220f": ["product", []], "\u2210": ["coproduct", []], "\u2211": ["sum", []], "\u2212": ["-", []], "\u2214": ["+", ["DOT"]], "\u2215": ["/", []], "\u2216": ["setminus", []], "\u2217": ["*", []], "\u2218": ["circ", []], "\u2219": ["cdot", []], "\u221a": ["sqrt", []], "\u221b": ["cube_root", []], "\u221c": ["fourth_root", []], "\u221d": ["propto", []], "\u221f": ["right_angle", []], "\u2220": ["angle", []], "\u2223": ["divides", []], "\u2224": ["not divides", []], "\u2225": ["parallel_to", []], "\u2226": ["not parallel_to", []], "\u2229": ["intersection", []], "\u222a": ["union", []], "\u222b": ["integral", []], "\u222e": ["contour_integral", []], "\u222f": ["surface_integral", []], "\u2230": ["volume_integral", []], "\u2231": ["clockwise_integral", []], "\u2232": ["clockwise_contour_integral", []], "\u2233": ["anticlockwise_contour_integral", []], "\u2234": ["therefore", []], "\u2235": ["because", []], "\u2236": [":", []], "\u2237": ["::", []], "\u2238": ["-", ["DOT"]], "\u223c": ["~", []], "\u223d": ["~", []], "\u2240": ["wreath", []], "\u2241": ["not ~", []], "\u2245": ["approx", []], "\u2260": ["<>", []], "\u2261": ["identical", []], "\u2262": ["not identical", []], "\u227a": ["prec", []], "\u227b": ["succ", []], "\u227c": ["prec_eq", []], "\u227d": ["succ_eq", []], "\u2280": ["not prec", []], "\u2281": ["not succ", []], "\u2282": ["subset", []], "\u2283": ["superset", []], "\u2284": ["not subset", []], "\u2285": ["not superset", []], "\u2286": ["subset_eq", []], "\u2287": ["superset_eq", []], "\u2288": ["not subset_eq", []], "\u2289": ["not superset_eq", []], "\u228a": ["subset_neq", []], "\u228b": ["superset_neq", []], "\u2293": ["cap", ["SQUARE"]], "\u2294": ["cup", ["SQUARE"]], "\u2295": ["+", ["CIRCLE"]], "\u2296": ["-", ["CIRCLE"]], "\u2297": ["*", ["CIRCLE"]], "\u2298": ["/", ["CIRCLE"]], "\u2299": ["cdot", ["CIRCLE"]], "\u229a": ["circ", ["CIRCLE"]], "\u229b": ["*", ["CIRCLE"]], "\u229c": ["=", ["CIRCLE"]], "\u229d": ["-", ["CIRCLE"]], "\u229e": ["+", ["SQUARE"]], "\u229f": ["-", ["SQUARE"]], "\u22a0": ["*", ["SQUARE"]], "\u22a1": ["cdot", ["SQUARE"]], "\u22b0": ["prec", ["RELATION"]], "\u22b1": ["prec", ["RELATION"]], "\u22b2": ["normal_subgroup", []], "\u22b3": ["contains_normal_subgroup", []], "\u22b4": ["normal_subgroup_eq", []], "\u22b5": ["contains_normal_subgroup_eq", []], "\u22bb": ["xor", []], "\u22bc": ["nand", []], "\u22bd": ["nor", []], "\u22be": ["right_angle ARC", []], "\u22bf": ["right_triangle", []], "\u22c0": ["and", []], "\u22c1": ["or", []], "\u22c2": ["intersection", []], "\u22c3": ["union", []], "\u22c4": ["diamond", []], "\u22c5": ["cdot", []], "\u22c6": ["star", []], "\u22c7": ["divide_times", []], "\u22c8": ["bowtie", []], "\u22ce": ["or", ["CURLY"]], "\u22cf": ["and", ["CURLY"]], "\u22d0": ["subset", ["DOUBLE"]], "\u22d1": ["superset", ["DOUBLE"]], "\u22d2": ["intersection", ["DOUBLE"]], "\u22d3": ["union", ["DOUBLE"]], "\u2264": ["<=", []], "\u2265": [">=", []], "\u22d6": ["<", ["DOT"]], "\u22d7": [">", ["DOT"]], "\u22dc": ["<=", []], "\u22dd": [">=", []], "\u22de": ["prec_eq", []], "\u22df": ["succ_eq", []], "\u22e0": ["not prec_eq", []], "\u22e1": ["not succ_eq", []], "\u22ea": ["not normal_subgroup", []], "\u22eb": ["not contains_normal_subgroup", []], "\u22ec": ["not normal_subgroup_eq", []], "\u22ed": ["not contains_normal_subgroup_eq", []], "\u27c0": ["angle", ["THREE-DIMENSIONAL"]], "\u27c2": ["perpendicular", []], "\u27c3": ["subset", ["OPEN"]], "\u27c4": ["superset", ["OPEN"]], "\u27c7": ["or", ["DOT"]], "\u27cc": ["/", []], "\u27ce": ["and", ["SQUARE"]], "\u27cf": ["or", ["SQUARE"]], "\u27d1": ["and", ["DOT"]], "\u27d2": ["in", ["UPWARDS"]], "\u27f9": ["implies", []], "\u27fa": ["iff", []], "\u299c": ["right_angle", ["SQUARE"]], "\u299d": ["right_angle", ["DOT"]], "\u299e": ["angle", []], "\u299f": ["angle", ["ACUTE"]], "\u29b6": ["|", ["CIRCLE"]], "\u29b7": ["parallel_to", ["CIRCLE"]], "\u29b8": ["/", ["CIRCLE", "REVERSE"]], "\u29b9": ["perpendicular", ["CIRCLE"]], "\u29c0": ["<", ["CIRCLE"]], "\u29c1": [">", ["CIRCLE"]], "\u29c6": ["*", ["SQUARE"]], "\u29c7": ["circ", ["SQUARE"]], "\u29fa": ["+", ["DOUBLE"]], "\u29fb": ["+", ["TRIPLE"]], "\u2a00": ["dot", ["CIRCLE"]], "\u2a01": ["+", ["CIRCLE"]], "\u2a02": ["*", ["CIRCLE"]], "\u2a05": ["intersection", []], "\u2a06": ["union", ["SQUARE"]], "\u2a07": ["and", ["DOUBLE"]], "\u2a08": ["or", ["DOUBLE"]], "\u2a09": ["*", []], "\u2a1d": ["join", []], "\u2a2f": ["cross", []], "\u2a33": ["smash", []], "\u2a51": ["and", ["DOT"]], "\u2a52": ["or", ["DOT"]], "\u2a53": ["and", ["DOUBLE"]], "\u2a54": ["or", ["DOUBLE"]], "\u2a57": ["or", ["SLOPING"]], "\u2a58": ["and", ["SLOPING"]], "\u2a66": ["=", ["DOT"]], "\u2a67": ["identical", ["DOT"]], "\u2a6a": ["~", ["DOT"]], "\u2a6d": ["congruent", ["DOT"]], "\u2aaa": ["<", []], "\u2aab": [">", []], "\u2aac": ["<=", []], "\u2aad": [">=", []], "\u2abb": ["prec", ["DOUBLE"]], "\u2abc": ["succ", ["DOUBLE"]], "\u2abd": ["subset", ["DOT"]], "\u2abe": ["superset", ["DOT"]], "\u2acf": ["subset", ["CLOSED"]], "\u2ad0": ["superset", ["CLOSED"]], "\u2ad1": ["subset_eq", ["CLOSED"]], "\u2ad2": ["superset_eq", ["CLOSED"]], "\u2ad9": ["in", ["DOWNWARDS"]], "\uff5e": ["~", []], "\ud835\udec1": ["nabla", ["BOLD"]], "\ud835\udedb": ["pdiff", ["BOLD"]], "\ud835\udefb": ["nabla", ["ITALIC"]], "\ud835\udf15": ["pdiff", ["ITALIC"]], "\ud835\udf35": ["nabla", ["BOLD", "ITALIC"]], "\ud835\udf4f": ["pdiff", ["BOLD", "ITALIC"]], "\ud835\udf6f": ["nabla", ["SANS-SERIF", "BOLD"]], "\ud835\udf89": ["pdiff", ["SANS-SERIF", "BOLD"]], "\ud835\udfa9": ["nabla", ["SANS-SERIF", "BOLD", "ITALIC"]], "\ud835\udfc3": ["pdiff", ["SANS-SERIF", "BOLD", "ITALIC"]], "\u02c6": ["^", []], "\u00b7": ["*", []], "\u0387": ["*", []], "\u055a": ["'", []], "\u055c": ["!", []], "\u055d": [",", []], "\u055e": ["?", []], "\u060c": [",", []], "\u060d": [",", []], "\u061b": [";", []], "\u061f": ["?", []], "\u066a": ["%", []], "\u066d": ["*", []], "\u0704": [":", []], "\u0705": [":", []], "\u0706": [":", []], "\u0707": [":", []], "\u0708": [":", []], "\u0709": [":", []], "\u07f8": [",", []], "\u07f9": ["!", []], "\u1363": [",", []], "\u1364": [";", []], "\u1365": [":", []], "\u1366": [":", []], "\u1367": ["?", []], "\u16eb": ["*", []], "\u16ec": [":", []], "\u16ed": ["+", []], "\u1802": [",", []], "\u1804": [":", []], "\u1808": [",", []], "\u180a": ["-", []], "\u1944": ["!", []], "\u1945": ["?", []], "\u1c3d": ["*", []], "\u2022": ["*", []], "\u2027": ["*", []], "\u2032": ["'", []], "\u2035": ["'", []], "\u2043": ["-", []], "\u204e": ["*", []], "\u204f": [";", []], "\u2e31": ["*", []], "\u2e32": [",", []], "\u2e33": ["*", []], "\u2e34": [",", []], "\u2e35": [";", []], "\ua60d": [",", []], "\ua60f": ["?", []], "\ua6f4": [":", []], "\ua6f5": [",", []], "\ua6f6": [";", []], "\ua6f7": ["?", []], "\ufe11": [",", []], "\uff65": ["*", []], "\ud802\udd1f": ["*", []]}, "punctuation": {"\u00b7": ["*", []], "\u0387": ["*", []], "\u055a": ["'", []], "\u055c": ["!", []], "\u055d": [",", []], "\u055e": ["?", []], "\u060c": [",", []], "\u060d": [",", []], "\u061b": [";", []], "\u061f": ["?", []], "\u066a": ["%", []], "\u066d": ["*", []], "\u0704": [":", []], "\u0705": [":", []], "\u0706": [":", []], "\u0707": [":", []], "\u0708": [":", []], "\u0709": [":", []], "\u07f8": [",", []], "\u07f9": ["!", []], "\u1363": [",", []], "\u1364": [";", []], "\u1365": [":", []], "\u1366": [":", []], "\u1367": ["?", []], "\u16eb": ["*", []], "\u16ec": [":", []], "\u16ed": ["+", []], "\u1802": [",", []], "\u1804": [":", []], "\u1808": [",", []], "\u180a": ["-", []], "\u1944": ["!", []], "\u1945": ["?", []], "\u1c3d": ["*", []], "\u2022": ["*", []], "\u2027": ["*", []], "\u2032": ["'", []], "\u2035": ["'", []], "\u2043": ["-", []], "\u204e": ["*", []], "\u204f": [";", []], "\u2e31": ["*", []], "\u2e32": [",", []], "\u2e33": ["*", []], "\u2e34": [",", []], "\u2e35": [";", []], "\ua60d": [",", []], "\ua60f": ["?", []], "\ua6f4": [":", []], "\ua6f5": [",", []], "\ua6f6": [";", []], "\ua6f7": ["?", []], "\ufe11": [",", []], "\uff65": ["*", []], "\ud802\udd1f": ["*", []]}, "brackets": {"\u2768": ["(", []], "\u276a": ["(", []], "\u2774": ["{", []], "\u27e6": ["[", []], "\u27ee": ["(", []], "\u2983": ["{", []], "\u2985": ["(", []], "\u2e28": ["(", []], "\u301a": ["[", []], "\ufd3f": ["]", []], "\uff5f": ["(", []], "\u2769": [")", []], "\u276b": [")", []], "\u2775": ["}", []], "\u27e7": ["]", []], "\u27ef": [")", []], "\u2984": ["}", []], "\u2986": [")", []], "\u2e29": [")", []], "\u301b": ["]", []], "\ufd3e": ["(", []], "\uff60": [")", []]}}
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
 * @property {Array.<string>} inside_equalnames - Identified names captured by this term inside the qualifier.
 * @property {Array.<string>} outside_equalnames - Identified names captured by this term outside the qualifier.
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
        '0':  {'`?': '0',  '`*': '0',  '`+': '0',  '`:': '0'},
        '1':  {'`?': '`?', '`*': '`*', '`+': '`+', '`:': '`?'},
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
        return false;
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
        if(options.associative && isThisOp(argtok)) {
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
 * @type {Object<Numbas.jme.tree>}
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

        if(jme.isType(ruleTree.tok,'name')) {
            var c = options.scope.getConstant(ruleTree.tok.name);
            if(c) {
                ruleTree = {tok: c.value};
            }
        }

        if(jme.isType(exprTree.tok,'name')) {
            var c = options.scope.getConstant(exprTree.tok.name);
            if(c) {
                exprTree = {tok: c.value};
            }
        }

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
    },
    'nonzero': function(exprTree) {
        try{
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e){
            return false;
        }
        return !Numbas.math.eq(tok.value,0);
    },
    'nonone': function(exprTree) {
        try{
            var tok = jme.castToType(exprTree.tok,'number');
        } catch(e){
            return false;
        }
        return !Numbas.math.eq(tok.value,1);
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
        var same = jme.normaliseName(ruleTok.name,options.scope)==jme.normaliseName(exprTok.name,options.scope);
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
    var noptions = extend_options(options, {allowOtherTerms: true});
    var m = matchTree(ruleTree,exprTree,noptions);
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
        return matchUses(names,exprTree,options);
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
    condition = jme.substituteTree(condition,new jme.Scope([{variables:m}]),true);
    try {
        var cscope = new jme.Scope([scope,{variables:m}]);
        var result = cscope.evaluate(condition,null,true);
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
    if(exprTok.type!='function' || (ruleTok.name!='?' && jme.normaliseName(ruleTok.name,options.scope) != jme.normaliseName(exprTok.name,options.scope))) {
        return false;
    }
    var ruleArgs = ruleTree.args.map(function(t){ return new Term(t); });
    var exprArgs = exprTree.args.map(function(t){ return new Term(t); });

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
        if(terms.length==1 && !options.gatherList) {
            match[name] = terms[0];
        } else {
            match[name] = {tok: new jme.types.TList(terms.length), args: terms};
        }
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
    return util.eq(ruleTok,exprTok,options.scope) ? {} : false;
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
 * @param {Numbas.jme.rules.matchTree_options} term_options - Options to use when matching individual terms.
 * @returns {boolean | Object<Numbas.jme.jme_pattern_match>} - False if no match, or a dictionary mapping names to lists of subexpressions matching those names (it's up to whatever called this to join together subexpressions matched under the same name).
 */
function matchTermSequence(ruleTerms, exprTerms, commuting, allowOtherTerms, options, term_options) {
    term_options = term_options || options;
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
            var m = matchTree(ruleTerm.term,exprTerm.term,term_options);
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
 * @param {Array.<Numbas.jme.rules.term>} input
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
var extractLeadingMinus = jme.rules.extractLeadingMinus = function(tree) {
    if(jme.isOp(tree.tok,'*') || jme.isOp(tree.tok,'/')) {
        if(jme.isOp(tree.args[0].tok,'-u')) {
            return {tok:tree.args[0].tok, args: [{tok:tree.tok, args: [tree.args[0].args[0],tree.args[1]]}]};
        } else {
            var left = extractLeadingMinus(tree.args[0]);
            if(jme.isOp(left.tok,'-u')) {
                return {tok: left.tok, args: [{tok: tree.tok, args: [left.args[0], tree.args[1]]}]};
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
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchUses(names,exprTree,options) {
    var vars = jme.findvars(exprTree,[],options.scope);
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
    } else if(tok.type=='op') {
        var filled_args = tree.args.filter(function(a) { return a.tok.type!='nothing'; });
        if(filled_args.length==1 && filled_args.length<tree.args.length) {
            return filled_args[0];
        }
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
    var names = findCapturedNames(ruleTree);
    names.forEach(function(name) {
        if(!(name in match)) {
            match[name] = {tok: new jme.types.TNothing()};
        }
    });

    var out = jme.substituteTree(resultTree,new jme.Scope([{variables: match}]), true);
    out = applyPostReplacement(out,options);
    var ruleTok = ruleTree.tok;
    if(match._rest_start) {
        out = {tok: new jme.types.TOp(match.__op__), args: [match._rest_start, out]};
    }
    if(match._rest_end) {
        out = {tok: new jme.types.TOp(match.__op__), args: [out, match._rest_end]};
    }
    return {expression: out, changed: !jme.treesSame(exprTree,out,options.scope)};
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
        var lname = jme.normaliseName(name,this.options);
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
    barematrices: undefined,
    timesdot: undefined,
    timesspace: undefined,
    noscientificnumbers: undefined
};
/** Flags used in JME simplification rulesets
 *
 * @type {Object<boolean>}
 * @typedef Numbas.jme.rules.ruleset_flags
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} rowvector - Display vectors as a horizontal list of components?
 * @property {boolean} alwaystimes - Always show the multiplication symbol between multiplicands?
 * @property {boolean} mixedfractions - Show top-heavy fractions as mixed fractions, e.g. 3 3/4?
 * @property {boolean} flatfractions - Display fractions horizontally?
 * @property {boolean} barematrices - Render matrices without wrapping them in parentheses.
 * @property {boolean} timesdot - Use a dot for the multiplication symbol instead of a cross?
 * @property {boolean} timesspace - Use a space for the multiplication symbol instead of a cross?
 * @property {boolean} noscientificnumbers - Numbers are never rendered in scientific notation.
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
        flag = jme.normaliseRulesetName(flag);
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
 * @param {Object<Numbas.jme.rules.Ruleset>} scopeSets - Dictionary of rulesets defined in the current scope.
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
            var name = jme.normaliseRulesetName(m[2].trim());
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
        ['negative:$n;x','','-eval(-x)'],       // The value of a number token should be non-negative - pull the negation out as unary minus
        ['+(?;x)','s','x'],                     // Get rid of unary plus
        ['?;x+(-?;y)','ags','x-y'],             // Plus minus = minus
        ['?;x-(-?;y)','ags','x+y'],             // Minus minus = plus
        ['-(-?;x)','s','x'],                    // Unary minus minus = plus
        ['(-?;x)/?;y','s','-(x/y)'],            // Take negation to the left of a fraction
        ['?;x/(-?;y)','s','-(x/y)'],
        ['-(`! complex:$n);x * (-?;y)','asg','x*y'], // Cancel the product of two negated things that aren't complex numbers
        ['`!-? `& (-(real:$n/real:$n`? `| imaginary:$n `| `!$n);x) * ?`+;y','sgc','-(x*y)'],            // Take negation to the left of multiplication
        ['imaginary:$n;z * ?;y `where im(z)<0', 'acsg', '-(eval(-z)*y)'], // Pull negation out of products involving negative imaginary numbers
        ['-(?;a+?`+;b)','','-a-b'],             // Expand negated brackets
        ['?;a+(-?;b-?;c)','','a-b-c'],          // Remove brackets involving subtraction
        ['?;a/?;b/?;c','','a/(b*c)']            // Prefer a product on the denominator to a string of divisions
    ],
    collectComplex: [
        ['-complex:negative:$n;x','','eval(-x)'],   // Cancel negation of a complex number with negative real part
        ['(`+- real:$n);x + (`+- imaginary:$n);y','cg','eval(x+y)'],    // Collect the two parts of a complex number
        ['$n;n*i','acsg','eval(n*i)'],            // Always collect multiplication by i
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
    powerPower: [
        ['(?;x^$n;a)^$n;b `where abs(a*b)<infinity', '', 'x^eval(a*b)']
    ],
    noLeadingMinus: [
        ['-?;x + ?;y','s','y-x'],   // Don't start with a unary minus
        ['-0','','0']               // Cancel negative 0
    ],
    collectNumbers: [
        ['$n;a * (1/?;b)','ags','a/b'],
        ['(`+- $n);n1 + (`+- $n)`+;n2 `where abs(n1+n2)<infinity','acg','eval(n1+n2)'],                // Addition of two numbers
        ['$n;n * $n;m `where abs(n*m)<infinity','acg','eval(n*m)'],                                  // Product of two numbers
        ['(`! $n)`+;x * real:$n;n * ((`! $n )`* `| $z);y','ags','n*x*y']    // Shift numbers to left hand side of multiplication
    ],
    simplifyFractions: [
        ['($n;n * (?`* `: 1);top) / ($n;m * (?`* `: 1);bottom) `where gcd_without_pi_or_i(n,m)>1','acg','(eval(n/gcd_without_pi_or_i(n,m))*top)/(eval(m/gcd_without_pi_or_i(n,m))*bottom)'],    // Cancel common factors of integers on top and bottom of a fraction
        ['imaginary:$n;n / imaginary:$n;m','','eval(n/i)/eval(m/i)'],            // Cancel i when numerator and denominator are both purely imaginary
        ['?;=a / ?;=a','acg','1'],              // Cancel fractions equal to 1
        ['?;a / (?;b/?;c * ?`*;rest)','acg','(a*c)/(b * rest)']     // Un-nest nested fractions
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
        ['sqrt(integer:$n;n) `where isint(sqrt(n))','','eval(sqrt(n))'] // Cancel square root of a square integer
    ],
    trig: [
        ['sin($n;n) `where isint(2*n/pi)','','eval(sin(n))'],   // Evaluate sin on multiples of pi/2
        ['cos($n;n) `where isint(2*n/pi)','','eval(cos(n))'],   // Evaluate cos on multiples of pi/2
        ['tan($n;n) `where isint(n/pi)','','0'],                // Evaluate tan on multiples of pi
        ['cosh(0)','','1'],
        ['sinh(0)','','0'],
        ['tanh(0)','','0']
    ],
    otherNumbers: [
        ['(`+-$n);n ^ $n;m `where abs(n^m)<infinity','','eval(n^m)']
    ],
    cancelTerms: [
        ['["term": `!$n] `@ (m_exactly((`+- $n `: 1);n * (?`+ `& `! -? `& term);=x `| -term;=x;n:-1) + m_exactly((`+- $n `: 1);m * (?`+ `& `! -? `& term);=x `| -term;=x;m:-1))','acg','eval(n+m)*x']
    ],
    cancelFactors: [
        ['?;=x^(? `: 1);n * ?;=x^(? `: 1);m','acg','x^(m+n)'],
        ['?;=x^(? `: 1);n / ?;=x^(? `: 1);m','acg','x^(n-m)']
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
/** 
 * Sets of rules that conflict with some of the rules in `simplificationRules`, so can't be enabled at the same time.
 * Or, sets of rules that shouldn't always be turned on.
 */
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
    ],
    rationalDenominators: [
        ['?;a/(sqrt(?;surd)*?`*;rest)','acg','(a*sqrt(surd))/(surd*rest)'],
    ],
    reduceSurds: [
        ['sqrt((`+-$n);n * (?`* `: 1);rest) `where abs(largest_square_factor(n))>1','acg','eval(sqrt(abs(largest_square_factor(n))))*sqrt(eval(n/abs(largest_square_factor(n))) * rest)'],
        ['sqrt((?;a)^(`+-$n;n) * (?`* `: 1);rest) `where abs(n)>1','acg','a^eval(trunc(n/2)) * sqrt(a^eval(mod(n,2))*rest)']
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
var compileRules = jme.rules.compileRules = function(rules,name) {
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
var subscope = new jme.Scope();
subscope.setConstant('i',{value: new jme.types.TNum(Numbas.math.complex(0,1))});
subscope.setConstant('pi',{value: new jme.types.TNum(Math.PI)});
for(var x in simplificationRules) {
    compiledSimplificationRules[x] = compiledSimplificationRules[jme.normaliseRulesetName(x)] = compileRules(simplificationRules[x],x);
    all = all.concat(compiledSimplificationRules[x].rules);
}
for(var x in conflictingSimplificationRules) {
    compiledSimplificationRules[x] = compiledSimplificationRules[jme.normaliseRulesetName(x)] = compileRules(conflictingSimplificationRules[x],x);
}
Object.values(compiledSimplificationRules).forEach(function(set) {
    set.rules.forEach(function(rule) {
        rule.pattern = jme.substituteTree(rule.pattern,subscope,true);
        rule.result = jme.substituteTree(rule.result,subscope,true);
    })
});
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
Numbas.queueScript('jme',['jme-base','jme-builtins','jme-rules','unicode-mappings'],function(){
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

/** A string of TeX code.
 *
 * @typedef TeX
 * @type {string}
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

/** A definition of a custom constant.
 *
 * @typedef Numbas.jme.constant_definition
 * @property {TeX} tex - A TeX rendering of the constant
 * @property {Numbas.jme.token} value - The JME value of the constant.
 * @property {boolean} enabled - Is the constant enabled? True by default.
 */


/** @namespace Numbas.jme */
var jme = Numbas.jme = /** @lends Numbas.jme */ {
    normaliseRulesetName: function(name) {
        return name.toLowerCase();
    },

    normaliseName: function(name, settings) {
        settings = settings || {caseSensitive: false};

        if(!settings.caseSensitive) {
            name = name.toLowerCase();
        }

        return name;
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

    /**
     * Copy a tree, but keep the original token objects.
     *
     * @param {Numbas.jme.tree} tree
     * @returns {Numbas.jme.tree}
     */
    copy_tree: function(tree) {
        var o = {tok: tree.tok};
        if(tree.args) {
            o.args = tree.args.map(jme.copy_tree);
        }
        return o;
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
    substituteTree: function(tree,scope,allowUnbound,unwrapExpressions) {
        if(!tree) {
            return null;
        }
        if(tree.tok.bound) {
            return tree;
        }
        if(tree.args===undefined) {
            if(tree.tok.type=='name') {
                var name = jme.normaliseName(tree.tok.name, scope);
                var v = scope.getVariable(name);
                if(v===undefined) {
                    var c = scope.getConstant(name);
                    if(c) {
                        return {tok: c.value};
                    }
                    if(allowUnbound) {
                        return {tok: new TName(tree.tok.nameWithoutAnnotation,tree.tok.annotation)};
                    } else {
                        throw new Numbas.Error('jme.substituteTree.undefined variable',{name:name});
                    }
                } else {
                    if(v.tok) {
                        return v;
                    } else if(unwrapExpressions) {
                        return jme.unwrapSubexpression({tok:v});
                    } else {
                        return {tok: v};
                    }
                }
            } else {
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
            var vars1 = findvars(tree1,[],scope);
            var vars2 = findvars(tree2,[],scope);
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
                if( !resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy,scope) ) { 
                    errors++; 
                }
            }
            return errors < failureRate;
        } catch(e) {
            return false;
        }
    },
    /** Substitute variables into a string. To substitute variables into an HTML element, use {@link Numbas.jme.variables.DOMcontentsubvars}.
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
                            var tex = jme.display.texify({tok: v}, rules, scope);
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
        'number': function(v,scope) {
            var jmeifier = new Numbas.jme.display.JMEifier({},scope);
            return jmeifier.niceNumber(v.value, Numbas.jme.display.number_options(v));
        },
        'rational': function(v) {
            var f = v.value.reduced();
            return f.toString();
        },
        'decimal': function(v, scope) {
            var jmeifier = new Numbas.jme.display.JMEifier({},scope);
            var options = Numbas.jme.display.number_options(v);
            return jmeifier.niceDecimal(v.value, options);
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
     * @param {Numbas.jme.Scope} scope
     * @see Numbas.jme.typeToDisplayString
     * @returns {string}
     */
    tokenToDisplayString: function(v,scope) {
        if(v.type in jme.typeToDisplayString) {
            return jme.typeToDisplayString[v.type](v,scope);
        } else {
            return jme.display.treeToJME({tok:v},{},scope);
        }
    },
    /** Substitute variables into a text string (not maths).
     *
     * Warning: when `display = true`, subbed-in values might not be bracketed correctly. Use {@link Numbas.jme.display.subvars} to substitute values into JME expressions.
     *
     * @param {string} str
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} [display=false] - Is this string going to be displayed to the user? If so, avoid unnecessary brackets and quotes.
     * @returns {string}
     */
    subvars: function(str, scope, display) {
        var bits = util.splitbrackets(str,'{','}','(',')');
        if(bits.length==1) {
            return str;
        }
        var out = '';
        for(var i=0; i<bits.length; i++) {
            if(i % 2) {
                try {
                    var tree = scope.parser.compile(bits[i]);
                } catch(e) {
                    throw(new Numbas.Error('jme.subvars.error compiling',{message: e.message, expression: bits[i]},e));
                }
                var v = scope.evaluate(tree);
                if(v===null) {
                    throw(new Numbas.Error('jme.subvars.null substitution',{str:str}));
                }
                var ov;
                if(display) {
                    ov = jme.tokenToDisplayString(v,scope);
                } else {
                    if(jme.isType(v,'number')) {
                        ov = '('+Numbas.jme.display.treeToJME({tok:v},{nicenumber: false, noscientificnumbers: true},scope)+')';
                    } else if(v.type=='string') {
                        ov = "'"+jme.escape(v.value)+"'";
                    } else {
                        ov = jme.display.treeToJME({tok:v},{nicenumber: false, noscientificnumbers: true},scope);
                    }
                }
                out += ov;
            } else {
                out += bits[i];
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

    /** 
     * Unwrap TExpression tokens: if `tree.tok` is a TExpression token, just return its `tree` property.
     * Applies recursively.
     *
     * @param {Numbas.jme.tree} tree
     * @returns {Numbas.jme.tree}
     */
    unwrapSubexpression: function(tree) {
        if(tree.tok.type == 'expression') {
            return jme.unwrapSubexpression(tree.tok.tree);
        } else {
            return tree;
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
     * If `type` is an object, it can give more detailed information about the types of items in a collection.
     * The object should have a property `type` describing the type of the resulting collection object, and one of `items`, an array or object describing the type of each item individually, or `all_items`, a string or object describing the type of every item.
     * For lists, the `items` array can contain an object with property `missing: true` for items that are not present in the input token. A placeholder `'nothing'` value is included in the output list instead.
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
        if(type=='dict') {
            if(typeDescription.items) {
                ntok = new TDict(ntok.value);
                for(var x in typeDescription.items) {
                    ntok.value[x] = jme.castToType(ntok.value[x],typeDescription.items[x]);
                }
            } else if(typeDescription.all_items) {
                ntok = new TDict(ntok.value);
                for(var x in Object.keys(ntok.value)) {
                    ntok.value[x] = jme.castToType(ntok.value[x],typeDescription.all_items);
                }
            }
        }
        if(type=='list') {
            if(typeDescription.items) {
                var nvalue = [];
                var j = 0;
                for(var i=0;i<typeDescription.items.length;i++) {
                    if(typeDescription.items[i].missing) {
                        nvalue.push(new TNothing());
                        continue;
                    }
                    var item = ntok.value[j];
                    nvalue.push(jme.castToType(item, typeDescription.items[i]));
                    j += 1;
                }
                ntok = new TList(nvalue);
            } else if(typeDescription.all_items) {
                var nvalue = ntok.value.map(function(item) {
                    return jme.castToType(item, typeDescription.all_items);
                });
                ntok = new TList(nvalue);
            }
        }
        return ntok;
    },
    /** Can type `a` be automatically cast to type `b`?
     *
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    isTypeCompatible: function(a,b) {
        if(b===undefined) {
            return true;
        }
        if(a==b) {
            return true;
        }
        var ta = jme.types[a];
        return ta && ta.prototype && ta.prototype.casts && ta.prototype.casts[b];
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
        return undefined;
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

    /** 
     * Does this expression behave deterministically?
     *
     * True if all functions or operations in the expression are marked `deterministic`.
     *
     * Note that this is _not_ just the converse of `Numbas.jme.isRandom`: to be conservative, a third option of "unknown", corresponding to "not isRandom and not isDeterministic", is possible.
     * In that case, this function returns `false`.
     *
     * @param {Numbas.jme.tree} expr
     * @param {Numbas.jme.Scope} scope
     * @returns {boolean}
     */
    isDeterministic: function(expr,scope) {
        switch(expr.tok.type) {
            case 'op':
            case 'function':
                // a function application is deterministic if its definition is marked as not random,
                // and all of its arguments are deterministic
                var op = jme.normaliseName(expr.tok.name, scope);
                var fns = scope.getFunction(op);
                if(!fns || fns.length==0) {
                    return false;
                }
                if(fns.some(fn => fn.random !== false)) {
                    return false;
                }
                for(var i=0;i<expr.args.length;i++) {
                    if(op=='safe' && expr.args[i].tok.type=='string') {
                        continue;
                    }
                    if(!jme.isDeterministic(expr.args[i],scope)) {
                        return false;
                    }
                }
                return true;
            case 'string':
                if(expr.tok.safe) {
                    return true;
                }
                var bits = util.splitbrackets(expr.tok.value,'{','}','(',')');
                for(var i=1;i<bits.length;i+=2) {
                    try {
                        var subexpr = Numbas.jme.compile(bits[i]);
                    } catch(e) {
                        continue;
                    }
                    if(!jme.isDeterministic(subexpr,scope)) {
                        return false;
                    }
                }
                return true;
            default:
                if(!expr.args) {
                    return true;
                }
                for(var i=0;i<expr.args.length;i++) {
                    if(!jme.isDeterministic(expr.args[i],scope)) {
                        return false;
                    }
                }
                return true;
        }
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
                var op = jme.normaliseName(expr.tok.name, scope);
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
            case 'string':
                var bits = util.splitbrackets(expr.tok.value,'{','}','(',')');
                for(var i=1;i<bits.length;i+=2) {
                    try {
                        var subexpr = Numbas.jme.compile(bits[i]);
                    } catch(e) {
                        continue;
                    }
                    if(jme.isRandom(subexpr,scope)) {
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
    },

    /**
     * Cast a list of arguments to match a function signature.
     *
     * @param {Array.<Numbas.jme.signature_grammar_match>} signature - A list of either types to cast to, or 'missing', representing a space that should be fillined in with 'nothing'.
     * @param {Array.<Numbas.jme.token>} args - The arguments to the function.
     * @returns {Array.<Numbas.jme.token>}
     */
    castArgumentsToSignature: function(signature,args) {
        var castargs = [];
        var j = 0;
        for(var i=0;i<signature.length;i++) {
            if(signature[i].missing) {
                castargs.push(new TNothing());
                continue;
            }
            var arg = args[j];
            if(signature[i]) {
                castargs.push(jme.castToType(arg,signature[i])); 
            } else {
                castargs.push(arg);
            }
            j += 1;
        }
        return castargs;
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
    this.relations = {};
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

    /** Is the given operator a relation?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isRelation: function(name) { return this.getSetting('relations',name) || false; },

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
    ops: ['not','and','or','xor','implies','isa','except','in','for:','of:','where:','divides','as','..','#','<=','>=','<>','&&','||','|','*','+','-','/','^','<','>','=','!','&', '|>'].concat(Object.keys(Numbas.unicode_mappings.symbols)),

    /** Superscript characters, and their normal-script replacements.
     * 
     * @type {Array.<string>}
     */
    superscript_replacements: [
        Object.values(Numbas.unicode_mappings.superscripts).join(''),
        Object.keys(Numbas.unicode_mappings.superscripts).join('')
    ],

    /** Regular expressions to match tokens.
     *
     * @type {Object<RegExp>}
     */
    re: {
        re_bool: /^(true|false)(?![a-zA-Z_0-9'])/i,
        re_integer: /^\p{Nd}+(?!\.|\p{Nd})/u,
        re_number: /^\p{Nd}+(?:\.\p{Nd}+)?/u,
        re_name: new RegExp(
            "^" +
            "\\{?" + //optionally wrapped in curly braces
            "((?:(?:[\\p{Ll}\\p{Lu}\\p{Lo}\\p{Lt}]+):)*)" + // annotations
            "(" + // main name part
                "(?:" + // a string:
                    "\\$?" + // optional dollar sign prefix
                    "[\\p{Ll}\\p{Lu}\\p{Lo}\\p{Lt}_\\p{Pc}]" + // at least one letter or underscore
                    "[\\p{Ll}\\p{Lu}\\p{Lo}\\p{Lt}\\p{Nl}\\p{Nd}_\\p{Pc}]*" + // any number of letters, number symbols, or underscores
                    "["+Object.keys(Numbas.unicode_mappings.subscripts).join('')+"]*" +  // any number of subscript characters
                    "'*" + // any number of primes
                ")" +
                "|" +   // or
                "\\?\\??" + // one or two question marks
                "|" +   // or
                "[π∞]" + // special name symbols
            ")" + 
            "\\}?" // optional closing curly brace

        , 'iu'),

        re_string: util.re_jme_string,
        re_comment: /^\/\/.*?(?:\n|$)/,
        re_keypair: /^:/,
        re_lambda: /^(?:->|→)/u,

        /** A regular expression matching a string of subscript characters at the end of a name token.
         */
        re_subscript_character: new RegExp('['+Object.keys(Numbas.unicode_mappings.subscripts).join('')+']+$', 'u'),

        /** A regular expression matching a mathematical letter character.
         */
        re_math_letter: new RegExp('^['+Object.keys(Numbas.unicode_mappings.letters).join('')+']', 'u'),
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
     * @param {boolean} negated - Is this operator negated?
     * @returns {Numbas.jme.token}
     */
    op: function(name,postfix,prefix,negated) {
        var arity = this.getArity(name);
        var commutative = arity>1 && this.isCommutative(name);
        var associative = arity>1 && this.isAssociative(name);

        return new TOp(name,postfix,prefix,arity,commutative,associative,negated);
    },

    /** A dictionary mapping the descriptive tags in `Numbas.unicode_mappings.letters` to JME name annotations.
     */
    unicode_annotations: {
        'FRAKTUR': 'frak',
        'BLACK-LETTER': 'frak',
        'DOUBLE-STRUCK': 'bb',
        'MONOSPACE': 'tt',
        'SCRIPT': 'cal',
        'BOLD': 'bf',
    },

    /** 
     * Normalise a name token, returning a name string and a list of annotations.
     * Don't confuse this with {@link Numbas.jme.normaliseName}, which applies scope-dependent normalisation, e.g. case-insensitivity, after parsing.
     *
     * @param {string} name
     * @returns {object}
     */
    normaliseName: function(name) {
        let annotations = [];
        let m;

        if(name.match(/^[a-zA-Z0-9_']*$/)) {
            return {name, annotations};
        }

        name = name.replace(/\p{Pc}/ug,c => c.normalize('NFKD'));

        let math_prefix = ''
        while(m = name.match(this.re.re_math_letter)) {
            const letter = m[0];
            const [c, anns] = Numbas.unicode_mappings.letters[letter];
            name = name.slice(letter.length);
            annotations = annotations.merge(anns);
            math_prefix += c;
        }
        annotations = annotations.map(a => this.unicode_annotations[a]).filter(a => a);
        name = math_prefix + name;

        for(let [k,v] of Object.entries(Numbas.unicode_mappings.greek)) {
            name = name.replaceAll(k,v);
        }

        name = name.replace(this.re.re_subscript_character,m => (name.match(/_/) ? '' : '_')+m.split('').map(c => Numbas.unicode_mappings.subscripts[c]).join(''));

        return {name, annotations};
    },

    /** Normalise a string containing a single string literal, using the Unicode normalization algorithm NFKD.
     *
     * @param {string} literal
     * @returns {string}
     */
    normaliseNumber: function(literal) {
        return literal.normalize('NFKD');
    },

    /** Normalise a string containing a single punctuation character, using the Unicode normalization algorithm NFKD.
     *
     * @param {string} c
     * @returns {string}
     */
    normalisePunctuation: function(c) {
        c = c.normalize('NFKD');
        if(Numbas.unicode_mappings.brackets[c]) {
            c = Numbas.unicode_mappings.brackets[c][0];
        }
        return c;
    },

    /** Normalise a string containing a single operator name or symbol.
     *
     * @param {string} op
     * @returns {string}
     */
    normaliseOp: function(op) {
        op = op.replace(/\p{Pd}/gu, '-');
        if(Numbas.unicode_mappings.symbols[op]) {
            op = Numbas.unicode_mappings.symbols[op][0];
        }
        return jme.normaliseName(op, this.options);
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
                const literal = this.normaliseNumber(result[0]);
                var token = new TInt(literal);
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,')') || jme.isType(prev,'name') || (jme.isType(prev,'op') && prev.postfix)) {    //right bracket, name or postfix op followed by a number is interpreted as multiplying contents of brackets by number
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_number',
            parse: function(result,tokens,expr,pos) {
                const literal = this.normaliseNumber(result[0]);
                var token = new TNum(literal);
                token.precisionType = 'dp';
                token.precision = math.countDP(literal);
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,')') || jme.isType(prev,'name') || (jme.isType(prev,'op') && prev.postfix)) {    //right bracket, name or postfix op followed by a number is interpreted as multiplying contents of brackets by number
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
            re: 're_lambda',
            parse: function(result, tokens, expr, pos) {
                var token = new TLambda();
                return {tokens: [token], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_op',
            parse: function(result,tokens,expr,pos) {
                var matched_name = result[0];
                var name = this.normaliseOp(matched_name);
                var m;
                var negated = false;
                if(m = name.match(/^not (\w+)$/)) {
                    name = m[1];
                    negated = true;
                }
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
                var token = this.op(name, postfix, prefix, negated);
                return {tokens: [token], start: pos, end: pos+matched_name.length};
            }
        },
        {
            re: 're_name',
            parse: function(result,tokens,expr,pos) {
                let {name, annotations} = this.normaliseName(result[2]);
                var annotation = result[1] ? result[1].split(':').slice(0,-1) : null;
                annotation = annotation === null ? annotations.length ? annotations : null : annotation.concat(annotations);
                var token;
                if(!annotation) {
                    token = new TName(name);
                } else {
                    token = new TName(name,annotation);
                }
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,'number') || jme.isType(prev,'name') || jme.isType(prev,')') || (jme.isType(prev,'op') && prev.postfix)) {    //number, right bracket, name or postfix op followed by a name, eg '3y', is interpreted to mean multiplication, eg '3*y'
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
            re: 're_superscript',
            parse: function(result, tokens, expr, pos) {
                var normals = this.superscript_replacements[0];
                var superscripts = this.superscript_replacements[1];
                var n = result[0].replace(/./g, function(d) { return normals[superscripts.indexOf(d)]; });
                var tokens = this.tokenise(n); 
                return {tokens: [this.op('^'), new TPunc('(')].concat(tokens).concat([new TPunc(')')]), start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_punctuation',
            parse: function(result,tokens,expr,pos) {
                var c = this.normalisePunctuation(result[0]);
                var new_tokens = [new TPunc(c)];
                if(c=='(' && tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,'number') || jme.isType(prev,')') || (jme.isType(prev,'op') && prev.postfix)) {    //number, right bracket or postfix op followed by left parenthesis is also interpreted to mean multiplication
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
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
        },
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
                return op.replace(/[.?*+^$[\]\\(){}|]/g, "\\$&");
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
        this.re.re_op = new RegExp('^(?:'+any_op_bits.join('|')+'|\\p{Pd})', 'iu');

        this.re.re_superscript = new RegExp('^['+this.superscript_replacements[1]+']+', 'u');

        this.re.re_punctuation = new RegExp('^(?!["\'\.])([,\\[\\]\\p{Ps}\\p{Pe}])','u');
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
                    tokens.push.apply(tokens, result.tokens);
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
                var ntok = new TFunc(name,tok.annotation);
                ntok.pos = tok.pos;
                this.stack.push(ntok);
            } else {
                //this is a variable otherwise
                this.addoutput(tok);
            }
        },
        ',': function(tok) {
            if(this.tokens[this.i-1].type=='(' || this.tokens[this.i-1].type=='[') {
                throw(new Numbas.Error('jme.shunt.expected argument before comma'));
            }
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
            if(tok.name == '*' && this.output.length && this.output[this.output.length-1].tok.type=='lambda') {
                this.stack.push(this.output.pop().tok);
                this.numvars.push(0);
                return;
            }

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
            var last_token = i==0 ? null : tokens[i-1].type;
            if(i==0 || last_token=='(' || last_token=='[' || last_token==',' || last_token=='op' || last_token=='keypair' || last_token=='lambda') {
                this.listmode.push('new');
            }
            else {
                this.listmode.push('index');
            }
            this.stack.push(tok);
            this.numvars.push(0);
        },
        ']': function(tok) {
            while( this.stack.length && this.stack[this.stack.length-1].type != "[" ) {
                this.addoutput(this.stack.pop());
            }
            if(this.tokens[this.i-1].type != ',' && this.tokens[this.i-1].type != '[') {
                this.numvars[this.numvars.length-1] += 1;
            }
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left square bracket'));
            } else {
                this.stack.pop();    //get rid of left bracket
            }
            //work out size of list
            var n = this.numvars.pop();
            switch(this.listmode.pop()) {
            case 'new':
                var ntok = new TList(n);
                ntok.pos = tok.pos;
                this.addoutput(ntok)
                break;
            case 'index':
                var f = new TFunc('listval');
                f.pos = tok.pos;
                f.vars = 2;
                this.addoutput(f);
                break;
            }
        },
        '(': function(tok) {
            this.stack.push(tok);
            this.numvars.push(0);
        },
        ')': function(tok) {
            while( this.stack.length && this.stack[this.stack.length-1].type != "(" ) {
                this.addoutput(this.stack.pop());
            }
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left bracket'));
            } 
            this.stack.pop();    //get rid of left bracket

            //work out number of items between the brackets
            var n = this.numvars.pop();
            if(this.tokens[this.i-1].type != ',' && this.tokens[this.i-1].type != '(') {
                n += 1;
            }

            //if this is a function call, then the next thing on the stack should be a function name, which we need to pop
            if( this.stack.length && (this.stack[this.stack.length-1].type=="function" || this.stack[this.stack.length-1].type=="lambda")) {
                var f = this.stack.pop();
                f.vars = n;
                this.addoutput(f);
            //if this is the list of argument names for an anonymous function, add them to the lambda token, which is next.
            } else if(this.i < this.tokens.length-1 && this.tokens[this.i+1].type=='lambda') {
                var names = this.output.splice(this.output.length-n, n);
                var lambda = this.tokens[this.i+1];
                lambda.set_names(names);
                lambda.vars = 1;
            } else if(this.output.length) {
                this.output[this.output.length-1].bracketed = true;
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
        },
        'lambda': function(tok) {
            this.stack.push(tok);
        }
    },

    addoutput: function(tok) {
        if(tok.vars!==undefined) {
            if(this.output.length<tok.vars) {
                // Not enough terms have been output for this operation
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

            if(tok.type=='lambda') {
                if(tok.expr === undefined) {
                    if(tok.names == undefined) {
                        tok.set_names([thing.args[0]]);
                    }
                    tok.set_expr(thing.args[tok.vars-1]);
                    thing = {tok: tok};
                }
            }

            if(tok.type=='list') {
                // If this is a list of keypairs, construct a dictionary instead
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
            if(tok.type=='op' && this.isRelation(tok.name)) {
                // Rewrite chained relations: e.g. `a<b<c` to `a<b and b<c`
                var lhs = thing.args[0];
                var ltop = lhs;

                while(jme.isOp(ltop.tok,'and')) {
                    ltop = ltop.args[1];
                }

                var lbottom = ltop;
                while(lbottom.tok.type=='op' && this.isRelation(lbottom.tok.name)) {
                    lbottom = lbottom.args[1];
                }

                var rhs = thing.args[1];
                var rtop = rhs;

                while(jme.isOp(rtop.tok,'and')) {
                    rtop = rtop.args[0];
                }

                var rbottom = rtop;
                while(rbottom.tok.type=='op' && this.isRelation(rbottom.tok.name)) {
                    rbottom = rbottom.args[0];
                }

                /** Create a binary operation tree with the given token, and left and right arguments.
                 *
                 * @param {Numbas.jme.token} tok
                 * @param {Numbas.jme.tree} lhs
                 * @param {Numbas.jme.tree} rhs
                 * @returns {Numbas.jme.tree}
                 */
                function bin(tok,lhs,rhs) {
                    if(!tok.pos) {
                        tok.pos = lhs.tok.pos;
                    }
                    return {tok: tok, args: [lhs,rhs]};
                }

                if(lbottom!=ltop) {
                    if(rbottom!=rtop) {
                        thing = bin(this.op('and'), bin(this.op('and'),lhs,bin(tok,lbottom,rbottom)), rhs);
                    } else {
                        thing = bin(this.op('and'), lhs, bin(tok,lbottom,rhs));
                    }
                } else if(rbottom!=rtop) {
                    thing = bin(this.op('and'), bin(tok,lhs,rbottom), rhs);
                }
            }
            if(thing.tok.type=='op' && thing.tok.negated) {
                thing.tok.negated = false;
                thing = {tok:this.op('not',false,true), args: [thing]};
            }
            if(thing.tok.type == 'op' && thing.tok.name == '|>') {
                if(thing.args[1].tok.type == 'lambda') {
                    thing = {
                        tok: thing.args[1].tok,
                        args: [thing.args[0]]
                    };
                } else if(thing.args[1].args === undefined) {
                    throw(new Numbas.Error("jme.shunt.pipe right hand takes no arguments"));
                } else {
                    thing = {
                        tok: thing.args[1].tok,
                        args: [thing.args[0]].concat(thing.args[1].args)
                    };
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
            return undefined;
        }
        return tree;
    },
}
/** Regular expression to match whitespace (because '\s' doesn't match *everything*) */
jme.Parser.prototype.re.re_whitespace = '(?:\\p{White_Space}|(?:\&nbsp;))';
jme.Parser.prototype.re.re_strip_whitespace = new RegExp('^'+jme.Parser.prototype.re.re_whitespace+'+', 'u');

/** Regular expressions for parser tokens.
 * Included for backwards-compatibility.
 *
 * @type {Object<RegExp>}
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
 * @property {Object<Numbas.jme.token>} variables - Dictionary of variables defined **at this level in the scope**. To resolve a variable in the scope, use {@link Numbas.jme.Scope.getVariable}.
 * @property {Object<Array.<Numbas.jme.funcObj>>} functions - Dictionary of functions defined at this level in the scope. Function names map to lists of functions: there can be more than one function for each name because of multiple dispatch. To resolve a function name in the scope, use {@link Numbas.jme.Scope.getFunction}.
 * @property {Object<Numbas.jme.rules.Ruleset>} rulesets - Dictionary of rulesets defined at this level in the scope. To resolve a ruleset in the scope, use {@link Numbas.jme.Scope.getRuleset}.
 * @property {Numbas.jme.scope_deletions} deleted - Names of deleted variables/functions/rulesets.
 * @property {Numbas.Question} question - The question this scope belongs to.
 *
 * @param {Numbas.jme.Scope[]} scopes - Either: nothing, in which case this scope has no parents; a parent Scope object; a list whose first element is a parent scope, and the second element is a dictionary of extra variables/functions/rulesets to store in this scope.
 */
var Scope = jme.Scope = function(scopes) {
    var s = this;
    this.parser = jme.standardParser;
    this.constants = {};
    this.variables = {};
    this.functions = {};
    this._resolved_functions = {};
    this.rulesets = {};
    this.deleted = {
        constants: {},
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
        this.caseSensitive = this.parent.caseSensitive;
        extras = scopes[1] || {};
    }
    if(extras) {
        if(extras.constants) {
            for(var x in extras.constants) {
                this.setConstant(x,extras.constants[x]);
            }
        }
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
        if(extras.caseSensitive !== undefined) {
            s.caseSensitive = extras.caseSensitive;
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

    /** Set the given constant name.
     *
     * @param {string} name
     * @param {Numbas.jme.constant_definition} data
     */
    setConstant: function(name, data) {
        data = {
            name: name,
            value: data.value,
            tex: data.tex || name
        };
        name = jme.normaliseName(name, this);
        this.constants[name] = data;
        this.deleted.constants[name] = false;
    },

    /** Set the given variable name.
     *
     * @param {string} name
     * @param {Numbas.jme.token} value
     */
    setVariable: function(name, value) {
        name = jme.normaliseName(name, this);
        this.variables[name] = value;
        this.deleted.variables[name] = false;
    },
    /** Add a JME function to the scope.
     *
     * @param {Numbas.jme.funcObj} fn - Function to add.
     * @returns {Numbas.jme.funcObj} - The function.
     */
    addFunction: function(fn) {
        var name = jme.normaliseName(fn.name, this);
        if(!(name in this.functions)) {
            this.functions[name] = [fn];
        } else {
            this.functions[name].push(fn);
            delete this._resolved_functions[name];
        }
        this.deleted.functions[name] = false;
        return fn;
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
    /** Mark the given constant name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteConstant: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.constants[name] = true;
    },
    /** Mark the given variable name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteVariable: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.variables[name] = true;
        this.deleted.constants[name] = true;
    },
    /** Mark the given function name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteFunction: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.functions[name] = true;
    },
    /** Mark the given ruleset name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteRuleset: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.rulesets[name] = true;
    },
    /** Get the object with given name from the given collection.
     *
     * @param {string} collection - The name of the collection. A property of this Scope object, i.e. one of `constants`, `variables`, `functions`, `rulesets`.
     * @param {string} name - The name of the object to retrieve.
     * @returns {object}
     */
    resolve: function(collection,name) {
        var scope = this;
        while(scope) {
            var sname = jme.normaliseName(name, scope);
            if(scope.deleted[collection][sname]) {
                return undefined;
            }
            if(scope[collection][sname]!==undefined) {
                return scope[collection][sname];
            }
            scope = scope.parent;
        }
        return undefined;
    },
    /** Find the value of the variable with the given name, if it's defined.
     *
     * @param {string} name
     * @returns {Numbas.jme.token}
     */
    getConstant: function(name) {
        return this.resolve('constants',name);
    },

    /** If the given value is equal to one of the constant defined in this scope, return the constant.
     *
     * @param {Numbas.jme.token} value
     * @returns {object}
     */
    isConstant: function(value) {
        for(var x in this.constants) {
            if(!this.deleted.constants[x]) {
                if(util.eq(value,this.constants[x].value,this)) {
                    return this.constants[x];
                }
            }
        }
        if(this.parent) {
            return this.parent.isConstant(value);
        }
        return undefined;
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
        name = jme.normaliseName(name, this);
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
        var op = jme.normaliseName(tok.name, this);
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

                /** Does this match exactly describe the type of the given items?
                 *
                 * @param {Numbas.jme.signature_result} match
                 * @param {Array.<Numbas.jme.token>} items
                 * @returns {boolean}
                 */
                function exactType(match,items) {
                    var k = 0;
                    return match.every(function(m,i) { 
                        if(m.missing) {
                            return false;
                        }
                        var ok = items[k] && items[k].type==m.type;
                        if(ok) {
                            if(m.items && items[k].type=='list') {
                                ok = exactType(m.items,items[k].value);
                            }
                        }
                        k += 1;
                        return ok; 
                    });
                }
                var exact_match = exactType(match,args);
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
        name = jme.normaliseName(name, this);
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
                deleted[name] = scope.deleted[collection][name] || deleted[name];
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
     * @returns {Object<Numbas.jme.token>} A dictionary of variables.
     */
    allConstants: function() {
        return this.collect('constants');
    },
    /** Gather all variables defined in this scope.
     *
     * @returns {Object<Numbas.jme.token>} A dictionary of variables.
     */
    allVariables: function() {
        return this.collect('variables');
    },
    /** Gather all rulesets defined in this scope.
     *
     * @returns {Object<Numbas.jme.rules.Ruleset>} A dictionary of rulesets.
     */
    allRulesets: function() {
        return this.collect('rulesets');
    },
    /** Gather all functions defined in this scope.
     *
     * @returns {Object<Numbas.jme.funcObj[]>} A dictionary of function definitions: each name maps to a list of @link{Numbas.jme.funcObj}.
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
     * @param {Object<Numbas.jme.token | object>} [variables] - Dictionary of variables to sub into expression. Values are automatically wrapped up as JME types, so you can pass raw JavaScript values.
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
                if(tok.subjme) {
                    value = jme.display.treeToJME(jme.display.subvars(value,scope));
                } else {
                    value = jme.contentsubvars(value,scope)
                }
                var t = new TString(value);
                if(tok.latex!==undefined) {
                    t.latex = tok.latex
                    t.display_latex = tok.display_latex;
                }
                return t;
            } else {
                return tok;
            }
        case 'name':
            var v = scope.getVariable(tok.name);
            if(v && !noSubstitution) {
                return v;
            } else {
                var c = scope.getConstant(tok.name)
                if(c) {
                    return c.value;
                }
                tok = new TName(tok.name);
                tok.unboundName = true;
                return tok;
            }
        case 'op':
        case 'function':
            var op = jme.normaliseName(tok.name, scope);

            if(lazyOps.indexOf(op)>=0) {
                return scope.getFunction(op)[0].evaluate(tree.args,scope);
            }
            else {
                var eargs = [];
                for(var i=0;i<tree.args.length;i++) {
                    eargs.push(scope.evaluate(tree.args[i],null,noSubstitution));
                }

                var op_variable = scope.getVariable(op);

                if(op_variable && op_variable.type == 'lambda') {
                    return op_variable.evaluate(eargs, this);
                }

                var matchedFunction = scope.matchFunctionToArguments(tok,eargs);
                if(matchedFunction) {
                    var signature = matchedFunction.signature;
                    var castargs = jme.castArgumentsToSignature(signature,eargs);
                    return matchedFunction.fn.evaluate(castargs,scope);
                } else {
                    for(var i=0;i<=eargs.length;i++) {
                        if(eargs[i] && eargs[i].unboundName) {
                            throw(new Numbas.Error('jme.typecheck.no right type unbound name',{name:eargs[i].name}));
                        }
                    }
                    throw(new Numbas.Error('jme.typecheck.no right type definition',{op:op, eargs: eargs}));
                }
            }
        case 'lambda':
            if(tree.args) {
                var eargs = [];
                for(var i=0;i<tree.args.length;i++) {
                    eargs.push(scope.evaluate(tree.args[i],null,noSubstitution));
                }
                return tok.evaluate(eargs, scope);
            } else {
                var nlambda = new types.TLambda();
                nlambda.names = tok.names;
                nlambda.set_expr(jme.substituteTree(tok.expr, scope, true, false));
                return nlambda;
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
            implicitFunctionComposition: true,  // `lnabs(x) = ln(abs(x))`, only applied when `noUnknownFunctions` is true, and `ln abs(x) = ln(abs(x))`
            normaliseSubscripts: true
        }
        options = options || default_options;

        if(!(options.singleLetterVariables || options.noUnknownFunctions || options.implicitFunctionComposition || options.normaliseSubscripts)) {
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
                    defined_names[jme.normaliseName(name, scope)] = true;
                }
                for(var name in jme.funcSynonyms) {
                    defined_names[jme.normaliseName(name, scope)] = true;
                }
                if(s.parser.funcSynonyms) {
                    for(var name in s.parser.funcSynonyms) {
                        defined_names[jme.normaliseName(name, scope)] = true;
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
                if(c.tok.type=='name' && defined_names[jme.normaliseName(c.tok.name, scope)]) {
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
            var oargs = tree.args;
            tree = {
                tok: tree.tok,
                args: tree.args.map(function(arg){ return scope.expandJuxtapositions(arg,options); })
            };
        }

        /**
         * Normalise the subscripts in a `TName` token.
         *
         * @param {Numbas.jme.token} tok
         * @returns {Numbas.jme.token}
         */
        function normaliseSubscripts(tok) {
            if(!options.normaliseSubscripts) {
                return tok;
            }
            if(scope.getConstant(tok.name)) {
                return tok;
            }
            var info = getNameInfo(tok.nameWithoutAnnotation);
            var name = info.root;
            if(info.subscript) {
                name += '_'+info.subscript;
            }
            if(info.primes) {
                name += info.primes;
            }
            return new TName(name,tok.annotation);
        }

        switch(tok.type) {
            case 'name':
                if(options.singleLetterVariables && tok.nameInfo.letterLength>1) {
                    var bits = [];
                    var s = tok.nameWithoutAnnotation;
                    var annotation = tok.annotation;
                    while(s.length) {
                        var i = s.length;
                        while(i>1) {
                            var info = getNameInfo(s.slice(0,i));
                            if(info.letterLength==1 && (!info.subscript || !info.subscript.match(/.[a-zA-Z]$/))) {
                                break;
                            }
                            i -= 1;
                        }
                        var ntok = normaliseSubscripts(new TName(s.slice(0,i), annotation));
                        bits.push(ntok);
                        annotation = undefined;
                        s = s.slice(i);
                    }
                    var tree = {tok: bits[0]};
                    for(var i=1;i<bits.length;i++) {
                        tree = {tok: this.parser.op('*'), args: [tree,{tok: bits[i]}]};
                    }
                } else {
                    tree = {tok: normaliseSubscripts(tok)};
                }
                break;
            case 'function':
                if(options.noUnknownFunctions) {
                    var defined_names = get_function_names();
                    var name = tok.name;
                    var breaks = [name.length];
                    for(var i=name.length-1;i>=0;i--) {
                        for(var j=0;j<breaks.length;j++) {
                            var sub = jme.normaliseName(name.slice(i,breaks[j]),scope);
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
                        if(tree.args.length==1) {
                            var arg = tree.args[0];
                            arg.bracketed = true;
                            tree = {tok: this.parser.op('*'), args: [this.expandJuxtapositions({tok: new TName(name)},options), arg]};
                        }
                    } else {
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
                    }
                }
                break;
            case 'op':
                var mult_precedence = this.parser.getPrecedence('*');
                var op_precedence = this.parser.getPrecedence(tok.name);


                /** In a tree of the form `((x*y)*z)*w`, return `[x,(y*z)*w]` - pull out the leftmost multiplicand and return it along with the remaining tree.
                 *
                 * @param {Numbas.jme.tree} tree
                 * @returns {Array.<Numbas.jme.tree,Numbas.jme.tree>}
                 */
                function extract_leftmost(tree) {
                    if(!tree.bracketed && jme.isOp(tree.tok,'*')) {
                        var bits = extract_leftmost(tree.args[0]);
                        var leftmost = bits[0];
                        var rest = bits[1];
                        if(rest) {
                            return [leftmost,{tok:tree.tok, args:[rest,tree.args[1]]}];
                        } else {
                            return [leftmost,tree.args[1]];
                        }
                    } else {
                        return [tree];
                    }
                }
                /** In a tree of the form `x*(y*(z*w))`, return `[w,x*(y*z)]` - pull out the rightmost multiplicand and return it along with the remaining tree.
                 *
                 * @param {Numbas.jme.tree} tree
                 * @returns {Array.<Numbas.jme.tree,Numbas.jme.tree>}
                 */
                function extract_rightmost(tree) {
                    if(!tree.bracketed && jme.isOp(tree.tok,'*')) {
                        var bits = extract_rightmost(tree.args[1]);
                        var rightmost = bits[0];
                        var rest = bits[1];
                        if(rest) {
                            return [rightmost,{tok:tree.tok, args:[tree.args[0],rest]}];
                        } else {
                            return [rightmost,tree.args[0]];
                        }
                    } else {
                        return [tree];
                    }
                }

                /** Was the ith argument rewritten?
                 *
                 * @param {number} i
                 * @returns {boolean}
                 */
                function arg_was_rewritten(i) {
                    return !oargs[i].bracketed && (oargs[i].tok.type=='name' || oargs[i].tok.type=='function') && jme.isOp(tree.args[i].tok,'*');
                }


                if(tree.args.length==1) {
                    if(tok.postfix) {
                        if(arg_was_rewritten(0)) {
                            var bits = extract_rightmost(tree.args[0]);
                            return {
                                tok: this.parser.op('*'),
                                args: [bits[1],{tok: tok, args: [bits[0]]}]
                            }
                        }
                    }
                } else if(tree.args.length==2) {
                    if(op_precedence < mult_precedence) {
                        var lrest,l,r,rrest;
                        if(arg_was_rewritten(0)) {
                            var lbits = extract_rightmost(tree.args[0]);
                            l = lbits[0];
                            lrest = lbits[1];
                        } else {
                            l = tree.args[0];
                        }
                        if(arg_was_rewritten(1)) {
                            var rbits = extract_leftmost(tree.args[1]);
                            r = rbits[0];
                            rrest = rbits[1];
                        } else {
                            r = tree.args[1];
                        }
                        tree = {
                            tok: tok,
                            args: [l,r]
                        };
                        if(lrest) {
                            tree = {
                                tok: this.parser.op('*'),
                                args: [lrest,tree]
                            }
                        }
                        if(rrest) {
                            tree = {
                                tok: this.parser.op('*'),
                                args: [tree,rrest]
                            }
                        }
                    }
                }
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
 * The `precisionType` and `precision` properties are optional. If given, they describe the precision to which the number is known.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number} value
 * @property {string|number|complex} originalValue - The value used to construct the token - either a string, a number, or a complex number object.
 * @property {string} precisionType - The type of precision of the value; either "dp" or "sigfig".
 * @property {number} precision - The number of digits of precision in the number.
 * @property {string} type - "number"
 * @class
 * @param {number} num
 */
var TNum = types.TNum = function(num) {
    if(num===undefined) {
        return;
    }
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

/** Convert a plain number to a `ComplexDecimal` value.
 * 
 * @param {number} n
 * @property {string} precisionType - The type of precision of the value; either "dp" or "sigfig".
 * @property {number} precision - The number of digits of precision in the number.
 * @returns {Numbas.math.ComplexDecimal}
 */
function number_to_decimal(n, precisionType, precision) {
    var dp = 15;
    if(precisionType == 'dp' && isFinite(precision)) {
        dp = Math.max(dp, -precision);
    }
    var re,im;
    if(n.complex) {
        var re = n.re.toFixed(dp);
        var im = n.im.toFixed(dp);
    } else {
        // If the original string value is kept, use that to avoid any precision lost when parsing it to a float.
        if(n.originalValue) {
            return new math.ComplexDecimal(new Decimal(n.originalValue));
        }
        re = n.toFixed(dp);
        im = 0;
    }
    return new math.ComplexDecimal(new Decimal(re), new Decimal(im));
}

jme.registerType(
    TNum,
    'number', 
    {
        'decimal': function(n) {
            return new TDecimal(number_to_decimal(n.value, n.precisionType, n.precision));
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
        'decimal': function(n) {
            return new TDecimal((new Decimal(n.value.numerator)).dividedBy(new Decimal(n.value.denominator)));
        },
        'number': function(n) {
            return new TNum(n.value.numerator/n.value.denominator);
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

/** Convert a `ComplexDecimal` value to a plain number.
 *
 * @param {Numbas.math.ComplexDecimal} n
 * @returns {number}
 */
function decimal_to_number(n) {
    if(n.im.isZero()) {
        return n.re.toNumber();
    } else {
        return {complex: true, re: n.re.toNumber(), im: n.im.toNumber()};
    }
}

jme.registerType(
    TDecimal,
    'decimal',
    {
        'number': function(n) {
            return new TNum(decimal_to_number(n.value));
        }
    }
);

/** String type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} value
 * @property {boolean} latex - Is this string LaTeX code? If so, it's displayed as-is in math mode.
 * @property {boolean} display_latex - Should this string be rendered as LaTeX when substituted into plain text?
 * @property {boolean} safe - If true, don't run {@link Numbas.jme.subvars} on this token when it's evaluated.
 * @property {boolean} subjme - If true, then this string represents JME code and variables should be substituted in using JME semantics instead of plain-text.
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
    if(html.ownerDocument===undefined && !html.jquery && !(typeof html == 'string' || Array.isArray(html))) {
        throw(new Numbas.Error('jme.thtml.not html'));
    }
    var elem = document.createElement('div');
    if(typeof html == 'string') {
        elem.innerHTML = html;
    } else if(Array.isArray(html)) {
        for(let child of html) {
            elem.appendChild(child);
        }
    } else {
        elem.appendChild(html);
    }
    this.value = Array.from(elem.childNodes);
    this.html = elem.innerHTML;
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
 * @property {Object<Numbas.jme.token>} value - Map strings to tokens. Undefined until this token is evaluated.
 * @property {string} type - "dict"
 * @class
 * @param {Object<Numbas.jme.token>} value
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
    if(!(Array.isArray(value) && value.every(function(e) { return typeof e=='number' || e.complex; }))) {
        throw(new Numbas.Error('jme.vector.value not an array of numbers'));
    }
    this.value = value;
}
jme.registerType(
    TVector,
    'vector',
    {
        'list': function(v) {
            return new TList(v.value.map(function(n){ 
                var t = new TNum(n); 
                t.precisionType = v.precisionType;
                t.precision = v.precision;
                return t;
            }));
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
    if(value.rows===undefined || value.columns===undefined || !(Array.isArray(value) && value.every(function(row) { return Array.isArray(row) && row.every(function(n) { return typeof n=='number' || n.complex; }); }))) {
        throw(new Numbas.Error("jme.matrix.value not the right type"));
    }
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
            return new TList(m.value.map(function(r){
                var t = new TVector(r);
                t.precisionType = m.precisionType;
                t.precision = m.precision;
                return t;
            }));
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

/** 
 *
 * @typedef {object} Numbas.jme.name_info
 * @property {string} root - The 'letters' part of the name, without subscripts or primes.
 * @property {number} letterLength - The number of letters in the name's root. For Greek letters, this is 1, not the the number of characters in `root`.
 * @property {boolean} isGreek - Is the root a Greek letter?
 * @property {boolean} isLong - Is this name 'long'? True if `letterLength` is more than 1.
 * @property {string} subscript - The subscript part of the name.
 * @property {string} subscriptGreek - Is the subscript a Greek letter?
 * @property {string} primes - The primes part of the name - a string of zero or more `'` characters.
 */

jme.re_greek = new RegExp('^(?:'+Object.values(Numbas.unicode_mappings.greek).join('|')+')$');

/** Establish properties of a variable name, for the purposes of display.
 * 
 * @memberof Numbas.jme
 * @param {string} name
 * @returns {Numbas.jme.name_info}
 */
var getNameInfo = jme.getNameInfo = function(name) {
    var nameInfo = {
        root: name,
        letterLength: name.length,
        isGreek: false,
        isLong: false,
        subscript: '',
        subscriptGreek: false,
        primes: ''
    };
    var re_math_variable = /^([^_]*[\p{Ll}\p{Lu}\p{Lo}\p{Lt}])(?:([\p{Nl}\p{Nd}]+)|_([\p{Nl}\p{Nd}]+)|_([^'_]+))?('+)?$/u;

    var m = name.match(re_math_variable);
    if(m) {
        nameInfo.root = m[1];
        nameInfo.letterLength = m[1].length;
        if(nameInfo.root.match(jme.re_greek)) {
            nameInfo.isGreek = true;
            nameInfo.letterLength = 1;
        }
        nameInfo.subscript = m[2] || m[3] || m[4];
        if(nameInfo.subscript && nameInfo.subscript.match(jme.re_greek)) {
            nameInfo.subscriptGreek = true;
        } else if(nameInfo.subscript && !nameInfo.subscript.match(/^[\p{Nl}\p{Nd}]*$/u) && nameInfo.subscript.length>2) {
            nameInfo.letterLength += nameInfo.subscript.length;
        }
        nameInfo.primes = m[5];
    }
    if(!m || nameInfo.letterLength > 1) {
        nameInfo.root = name;
        nameInfo.subscript = '';
        nameInfo.subscriptGreek = false;
        nameInfo.primes = '';
        nameInfo.letterLength = name.length;
    }
    nameInfo.isLong = nameInfo.letterLength > 1;

    return nameInfo;
}

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
    this.nameInfo = getNameInfo(this.nameWithoutAnnotation);
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
    this.nameInfo = getNameInfo(this.nameWithoutAnnotation);
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
 * @param {negated} negated
 */
var TOp = types.TOp = function(op,postfix,prefix,arity,commutative,associative,negated) {
    this.name = op;
    this.postfix = postfix || false;
    this.prefix = prefix || false;
    this.vars = arity || 2;
    this.commutative = commutative || false;
    this.associative = associative || false;
    this.negated = negated || false;
}
jme.registerType(TOp,'op');

/** An anonymous function.
 *
 * @param {Array.<Numbas.jme.tree>} names - Specification of the arguments. Each argument is either a name token, or a list of (lists of) names.
 * @param {Numbas.jme.tree} expr - The body of the function.
 */
var TLambda = types.TLambda = function(names, expr) {
    if(names !== undefined) {
        this.set_names(names);
    }
    if(expr !== undefined) {
        this.set_expr(expr);
    }
}
TLambda.prototype = {
    vars: 2,

    evaluate: function(args, scope) {
        return this.fn.evaluate(args, scope);
    },

    /** Set the argument names for this function.
     *
     * @param {Array.<Numbas.jme.tree>} names
     */
    set_names: function(names) {
        this.names = names;
    },

    /** Set the body of this function. The argument names must already have been set.
     *
     * @param {Numbas.jme.tree} expr
     */
    set_expr: function(expr) {
        const lambda = this;
        this.expr = expr;
        var all_names = [];

        /** Make the signature for the given argument.
         *
         * @param {Numbas.jme.tree} name
         * @returns {Numbas.jme.signature}
         */
        function make_signature(name) {
            if(name.tok.type=='name') {
                all_names.push(name.tok.name);
                return jme.signature.anything();
            } else if(name.tok.type=='list') {
                const items = name.args.map(make_signature);
                items.push(jme.signature.multiple(jme.signature.anything()));
                return jme.signature.list(...items);
            } else {
                throw(new Numbas.Error('jme.typecheck.wrong names for anonymous function',{names_type: names_tree.tok.type}));
            }
        };

        const signature = this.names.map(make_signature);

        this.all_names = all_names;

        this.fn = new jme.funcObj('', signature, '?', null, {
            evaluate: function(args, scope) {
                var nscope = new jme.Scope([scope]);
                var signature = lambda.fn.intype(args);
                if(!signature) {
                    throw(new Numbas.Error("jme.typecheck.wrong arguments for anonymous function"));
                }
                var castargs = jme.castArgumentsToSignature(signature, args);
                
                /** Assign values to the function's named arguments.
                 *
                 * @param {Numbas.jme.tree} name - The specification of the name.
                 * @param {Numbas.jme.token} arg - The value to bind to this name.
                 */
                function assign_names(name,arg) {
                    if(name.tok.type=='name') {
                        nscope.setVariable(name.tok.name, arg);
                    } else if(name.tok.type=='list') {
                        name.args.forEach((lname,i) => assign_names(lname, arg.value[i]));
                    }
                }
                lambda.names.forEach((name,i) => assign_names(name, castargs[i]));

                return nscope.evaluate(jme.copy_tree(lambda.expr));
            }
        });
    }
}
jme.registerType(TLambda,'lambda');

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

/** A JavaScript Promise, as a token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Promise} promise - The promise this token represents.
 * @class
 * @param {string} promise - The promise this token represents.
 */
var TPromise = types.TPromise = function(promise) {
    this.promise = promise;
}
jme.registerType(TPromise,'promise');

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
    if(tree) {
        tree = jme.unwrapSubexpression(tree);
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
    '/u': 1,
    'sqrt': 1
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
    'not': 'not',
    'sqrt': 'sqrt'
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
    'sqrt': 1,
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
    'of:': 48,
    'where:': 49,
    'for:': 50,
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
    'ˆ': '^',
    'identical': '='
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
    '/u': true,
    'for:': true
}
/** Operations representing relations.
 *
 * @enum {boolean}
 * @memberof Numbas.jme
 * @readonly
 */
var relations = jme.relations =
{
    '<': true,
    '>': true,
    '<=': true,
    '>=': true,
    '=': true,
    '<>': true,
    'in': true
};

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
    'or': true,
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
    options = this.options = options || {};

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
    this.intype = jme.signature.sequence.apply(this,intype.map(jme.parse_signature));
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
        } else {
            result = new this.outcons(result);
        }
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
 * @param {number|Numbas.math.ComplexDecimal} r1
 * @param {number|Numbas.math.ComplexDecimal} r2
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
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    absdiff: function(r1,r2,tolerance)
    {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.minus(r2).absoluteValue().re.lessThan(Math.abs(tolerance));
        }

        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
    },
    /** Relative (proportional) difference between variables - fail if `r1/r2 - 1` is bigger than `tolerance`.
     *
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    reldiff: function(r1,r2,tolerance) {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.minus(r2).absoluteValue().re.lessThan(r2.re.times(tolerance));
        }

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
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    dp: function(r1,r2,tolerance) {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.toDecimalPlaces(tolerance).equals(r2.toDecimalPlaces(tolerance));
        }

        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        tolerance = Math.floor(Math.abs(tolerance));
        return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
    },
    /** Round both values to `tolerance` significant figures, and fail if unequal. 
     *
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    sigfig: function(r1,r2,tolerance) {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.toSignificantDigits(tolerance).equals(r2.toSignificantDigits(tolerance));
        }

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
var findvars = jme.findvars = function(tree,boundvars,scope) {
    if(!scope) {
        scope = jme.builtinScope;
    }
    if(boundvars===undefined) {
        boundvars = [];
    }
    if(!tree) {
        return [];
    }
    if((tree.tok.type=='function' || tree.tok.type=='op') && tree.tok.name in findvarsOps) {
        return findvarsOps[tree.tok.name](tree,boundvars,scope);
    }
    if(tree.args===undefined) {
        switch(tree.tok.type) {
        case 'name':
            var name = jme.normaliseName(tree.tok.name,scope);
            if(boundvars.indexOf(name)==-1 && !scope.getConstant(name)) {
                return [name];
            } else {
                return [];
            }
        case 'string':
            if(tree.tok.safe) {
                return [];
            }
            var bits = util.contentsplitbrackets(tree.tok.value);
            var out = [];
            for(var i=0;i<bits.length;i+=4) {
                var plain = bits[i];
                var sbits = util.splitbrackets(plain,'{','}','(',')');
                for(var k=1;k<=sbits.length-1;k+=2) {
                    var tree2 = scope.parser.compile(sbits[k]);
                    out = out.merge(findvars(tree2,boundvars,scope));
                }
                if(i<=bits.length-3) {
                    var tex = bits[i+2];
                    var tbits = jme.texsplit(tex);
                    for(var j=0;j<tbits.length;j+=4) {
                        var cmd = tbits[j+1];
                        var expr = tbits[j+3];
                        switch(cmd) {
                        case 'var':
                            var tree2 = scope.parser.compile(expr);
                            out = out.merge(findvars(tree2,boundvars,scope));
                            break;
                        case 'simplify':
                            var sbits = util.splitbrackets(expr,'{','}','(',')');
                            for(var k=1;k<sbits.length-1;k+=2)
                            {
                                var tree2 = scope.parser.compile(sbits[k]);
                                out = out.merge(findvars(tree2,boundvars,scope));
                            }
                            break;
                        }
                    }
                }
            }
            return out;
        case 'lambda':
            var mapped_boundvars = boundvars.concat(tree.tok.all_names.map(name => jme.normaliseName(name, scope)));
            return jme.findvars(tree.tok.expr, mapped_boundvars, scope);
        default:
            return [];
        }
    } else {
        return jme.findvars_args(tree.args, boundvars, scope);
    }
}

/** 
 * Find variables used in any of a list of trees.
 * Used to find variables used in arguments to functions / operations.
 *
 * @param {Array.<Numbas.jme.tree>} trees
 * @param {Array.<string>} boundvars - Variables to be considered as bound (don't include them).
 * @param {Numbas.jme.Scope} scope
 * @returns {Array.<string>}
 */
var findvars_args = jme.findvars_args = function(trees, boundvars, scope) {
    return trees.reduce((vars, tree) => vars.merge(findvars(tree, boundvars, scope)), []);
}

/** Check that two values are equal.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.token} r1
 * @param {Numbas.jme.token} r2
 * @param {Function} checkingFunction - One of {@link Numbas.jme.checkingFunctions}.
 * @param {number} checkingAccuracy
 * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
 * @returns {boolean}
 */
var resultsEqual = jme.resultsEqual = function(r1,r2,checkingFunction,checkingAccuracy,scope)
{    // first checks both expressions are of same type, then uses given checking type to compare results
    var type = jme.findCompatibleType(r1.type,r2.type);
    if(!type) {
        return false;
    }
    r1 = jme.castToType(r1,type);
    r2 = jme.castToType(r2,type);
    var v1 = r1.value, v2 = r2.value;

    switch(type) {
        case 'rational':
            return checkingFunction( v1.toDecimal(), v2.toDecimal(), checkingAccuracy );
        case 'number':
        case 'decimal':
        case 'integer':
            if(v1.complex || v2.complex)
            {
                if(!v1.complex) {
                    v1 = {re:v1, im:0, complex:true};
                }
                if(!v2.complex) {
                    v2 = {re:v2, im:0, complex:true};
                }
                return checkingFunction(v1.re, v2.re, checkingAccuracy) && checkingFunction(v1.im,v2.im,checkingAccuracy);
            } else {
                return checkingFunction( v1, v2, checkingAccuracy );
            }
        case 'vector':
            if(v1.length != v2.length) {
                return false;
            }
            for(var i=0;i<v1.length;i++) {
                if(!resultsEqual(new TNum(v1[i]),new TNum(v2[i]),checkingFunction,checkingAccuracy,scope)) {
                    return false;
                }
            }
            return true;
        case 'matrix':
            if(v1.rows != v2.rows || v1.columns != v2.columns) {
                return false;
            }
            for(var i=0;i<v1.rows;i++) {
                for(var j=0;j<v1.columns;j++) {
                    if(!resultsEqual(new TNum(v1[i][j]||0),new TNum(v2[i][j]||0),checkingFunction,checkingAccuracy,scope)) {
                        return false;
                    }
                }
            }
            return true;
        case 'list':
            if(v1.length != v2.length) {
                return false;
            }
            for(var i=0;i<v1.length;i++) {
                if(!resultsEqual(v1[i],v2[i],checkingFunction,checkingAccuracy,scope)) {
                    return false;
                }
            }
            return true;
        default: {
            return util.eq(r1,r2,scope);
        }
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
 * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
 * @returns {boolean}
 */
var treesSame = jme.treesSame = function(a,b,scope) {
    if(a == undefined || b == undefined) {
        return a == undefined && b == undefined;
    }
    var ta = a.tok;
    var tb = b.tok;
    if(a.args || b.args) {
        if(!(a.args && b.args && a.args.length==b.args.length)) {
            return false;
        }
        for(var i=0; i<a.args.length;i++) {
            if(!treesSame(a.args[i],b.args[i],scope)) {
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
    return util.eq(a.tok,b.tok,scope);
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
 * @returns {Object<string>} A dictionary mapping names to types.
 */
jme.inferVariableTypes = function(tree,scope) {
    const annotated_assignments = find_valid_assignments(tree, scope);
    return Object.fromEntries(Object.entries(annotated_assignments).map(([name,assignment]) => [name, assignment.type]));
}

/** Enumerate lists of `n` arguments matching the signature `sig`.
 *
 * @param {Numbas.jme.signature} sig
 * @param {number} n
 * @returns {Array.<Array.<string>>} - A list of lists of type names. Each list of type names has `n` elements.
 */
function enumerate_signatures(sig, n) {
    let out;
    switch(sig.kind) {
        case 'multiple':
            if(n==0) {
                return [[]];
            } else {
                let o = [];
                for(let i=1; i<=n; i++) {
                    const subs = enumerate_signatures(sig.signature, i);
                    const rest = enumerate_signatures(sig, n-i);
                    subs.forEach(s => {
                        for(let r of rest) {
                            o.push(s.concat(r));
                        }
                    });
                }
                return o;
            }
        case 'optional':
            if(n==0) {
                return [[]];
            } else {
                return enumerate_signatures(sig.signature, n);
            }
        case 'label':
            return enumerate_signatures(sig.signature, n);
        case 'sequence':
            var partitions = math.integer_partitions(n,sig.signatures.length);
            out = [];
            partitions.forEach(p => {
                const bits = sig.signatures.map((s,i) => {
                    return enumerate_signatures(s,p[i]);
                });
                let o = [[]];
                for(let bit of bits) {
                    const no = [];
                    for(let a of o) {
                        for(let b of bit) {
                            no.push(a.concat(b));
                        }
                    }
                    o = no;
                }
                out = out.concat(o);
            });
            return out;
        case 'or':
            out = [];
            for(let s of sig.signatures) {
                out = out.concat(enumerate_signatures(s, n));
            }
            return out;
        case 'type':
            if(n==1) {
                return [[sig.type]];
            } else {
                return [];
            }
        case 'anything':
            if(n==1) {
                return [[undefined]];
            } else {
                return [];
            }
        case 'list':
            if(n==1) {
                return [['list']];
            } else {
                return [];
            }
        case 'dict':
            if(n==1) {
                return [['dict']];
            } else {
                return [];
            }
    }
}
jme.enumerate_signatures = enumerate_signatures;

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
    return undefined;
}
jme.mutually_compatible_type = mutually_compatible_type

/** Find an assignment of types to free variables in an expression such that it can be evaluated in the given scope.
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.Scope} scope
 * @param {object} [assignments] - A dictionary mapping variable names to their types. A missing entry implies that the variable can have any type.
 * @param {string} [outtype] - The desired type of the result of the expression. `undefined` means that any type is fine.
 * @returns {object} - A dictionary mapping variable names to their types.
 */
function find_valid_assignments(tree, scope, assignments, outtype) {
    if(assignments === undefined) {
        assignments = {};
    }
    let out;
    switch(tree.tok.type) {
        case 'op': 
        case 'function':
            let fns = scope.getFunction(tree.tok.name);
            if(outtype !== undefined) {
                fns = fns.filter(fn => fn.outtype == '?' || fn.outtype == outtype);
            }
            out = [];
            for(let fn of fns) {
                /* For each definition of the function, find input types that it can work on.
                 * For each list of input types, check if the given arguments can produce that input type, and if so, how they change the variable type assignments.
                 */
                let options = enumerate_signatures(fn.intype, tree.args.length).map(arg_types => {return {arg_types, sub_assignments: assignments}});
                if(options.length==0) {
                    continue;
                }
                /* TODO: group options by type of each arg */
                tree.args.forEach((arg, i) => {
                    options = options.map(({arg_types, sub_assignments}) => {
                        const arg_type = arg_types[i];
                        const arg_assignments = find_valid_assignments(arg, scope, sub_assignments, arg_type);
                        return {arg_types, sub_assignments: arg_assignments};
                    }).filter(({arg_types, sub_assignments}) => sub_assignments !== false);
                });
                if(options.length > 0) {
                    return options[0].sub_assignments;
                }
            };
            return false;
        
        case 'name':
            const name = jme.normaliseName(tree.tok.name,scope);
            if(scope.getConstant(name)) {
                return assignments;
            }
            // don't care what type is produced: this assignment is fine by default
            // or this name is already assigned to the desired type
            if(outtype === undefined || assignments[name] === outtype) {
                return assignments;

            // this name has been assigned, but not to the desired outtype:
            // find a mututally compatible type to assign to this name, compatible with the desired use and all previous uses
            } else if(assignments[name] !== undefined && assignments[name].type != outtype) {
                var type = mutually_compatible_type(Object.keys(assignments[name].casts));
                if(type) {
                    assignments = util.copyobj(assignments,true);
                    assignments[name].casts[outtype] = true;
                    assignments[name].type = type;
                    return assignments;
                } else {
                    return false;
                }

            // this name has not been assigned: assign it to the desired type
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

        // all other token types: must be compatible with desired outtype, or we mustn't care what the output type is.
        default:
            if(outtype && !jme.isTypeCompatible(tree.tok.type,outtype)) {
                return false;
            }

            if(!tree.args) {
                return assignments;
            }

            for(let arg of tree.args) {
                assignments = find_valid_assignments(arg, scope, assignments, undefined);
                if(assignments === false) {
                    return false;
                }
            };
            return assignments;
    }
}
jme.find_valid_assignments = find_valid_assignments;

/** Infer the type of each part of a tree by inferring the types of free variables, then finding definitions of operators and functions which work.
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.tree} Each node in the tree has an `inferred_type` property giving the name of that subtree's inferred type. Function and operator nodes also have a `matched_function` property giving the `Numbas.jme.funcObj` object that would be used.
 */
jme.inferTreeType = function(tree,scope) {
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
                var normalised_name = jme.normaliseName(tok.name,scope);
                var assignment = assignments[normalised_name];
                var type = tok.type;
                var constant;
                if(assignment) {
                    inferred_type = assignment.type;
                } else {
                    constant = scope.getConstant(tok.name)
                    if(constant) {
                        inferred_type = constant.value.type;
                    }
                }
                return {tok: tok, inferred_type: inferred_type, constant: constant, normalised_name: normalised_name};
            case 'op':
            case 'function':
                var op = jme.normaliseName(tok.name,scope);
                if(lazyOps.indexOf(op)>=0) {
                    return {tok: tok, inferred_type: scope.getFunction(op)[0].outtype};
                }
                else {
                    var iargs = [];
                    var eargs = [];
                    for(var i=0;i<tree.args.length;i++) {
                        var iarg = infer_type(tree.args[i]);
                        eargs.push(fake_token(iarg.inferred_type));
                        iargs.push(iarg);
                    }
                    var matched_function = scope.matchFunctionToArguments(tok,eargs);
                    var inferred_type = matched_function ? matched_function.fn.outtype : '?';
                    return {tok: tok, args: iargs, inferred_type: inferred_type, matched_function: matched_function};
                }
            default:
                return {tok: tok, inferred_type: tok.type};
        }
    }

    return infer_type(tree);
}

/** Infer the type of an expression by inferring the types of free variables, then finding definitions of operators and functions which work.
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.Scope} scope
 * @see Numbas.jme.inferTreeType
 * @returns {string}
 */
jme.inferExpressionType = function(tree,scope) {
    var inferred_tree = jme.inferTreeType(tree,scope);
    return inferred_tree.inferred_type;
}

/** A dictionary of methods to cast the underlying JS values of JME types to other types.
 * `Numbas.jme.makeFast` uses these to avoid constructing tokens when it has to cast values to other types.
 *
 * @enum {Object<Function>}
 */
const fast_casters = jme.fast_casters = {
    'number': {
        'decimal': number_to_decimal
    },
    'integer': {
        'rational': n => new math.Fraction(n,1),
        'number': n => n,
        'decimal': n => new math.ComplexDecimal(n)
    },
    'rational': {
        'decimal': r => new math.ComplexDecimal((new Decimal(r.numerator)).dividedBy(new Decimal(r.denominator))),
        'number': r => r.numerator / r.denominator
    },
    'decimal': {
        'number': decimal_to_number
    }
};
    

/** 
 * Make a function version of an expression tree which can be evaluated quickly by assuming that:
 * * The arguments will always have the same type
 * * All operations have non-lazy, native JS implementations.
 *
 * All of the control flow functions, such as `if` and `switch`, are lazy so can't be used here. Many other functions have implementations which operate on JME tokens, so can't be used either, typically functions operating on collections or sub-expressions.
 * All of the arithmetic and trigonometric operations can be used, so this is good for speeding up the kinds of expressions a student might enter.
 *
 * Giving the names of the arguments makes this much faster: otherwise, each operation involves an Array.map() operation which is very slow.
 * If there are more than 5 free variables or an operation takes more than 5 arguments, a slower method is used.
 *
 * @example
 * const tree = Numbas.jme.compile('(x/2)^y');
 * const f = Numbas.jme.makeFast(tree, Numbas.jme.builtinScope, ['x', 'y']);
 * const a = f(1,2);
 * // a = 0.25;
 *
 * @param {Numbas.jme.tree} tree - The expression tree to be evaluated.
 * @param {Numbas.jme.Scope} scope
 * @param {Array.<string>} [names] - The order of arguments in the returned function, mapping to variable names. If not given, then the function will take a dictionary mapping variable names to values.
 * @returns {Function}
 */
jme.makeFast = function(tree,scope,names) {
    const given_names = names !== undefined;

    /** Make a function which evaluates the given expression tree quickly.
     *
     * @param {Numbas.jme.tree} t
     * @returns {Function}
     */
    function fast_eval(t) {
        switch(t.tok.type) {
            case 'name':
                if(t.constant) {
                    var constant = jme.unwrapValue(t.constant);
                    return function() { return constant; }
                }
                var name = t.normalised_name;
                if(given_names) {
                    const i = names.indexOf(name);
                    return function() {
                        return arguments[i];
                    }
                } else {
                    return function(params) {
                        return params[name];
                    }
                }

            case 'function':
            case 'op':
                const args = t.args.map(t2 => fast_eval(t2));
                const fn = t.matched_function && t.matched_function.fn && t.matched_function.fn.fn;
                if(!fn) {
                    throw(new Numbas.Error("jme.makeFast.no fast definition of function", {name: t.tok.name}));
                }
                if(given_names) {
                    if(names.length > 5 || args.length > 5) {
                        return function() {
                            const fargs = arguments;
                            return fn(...args.map(fn => fn(...fargs)));
                        }
                    }
                    var sig = sig_remove_missing(t.matched_function.signature);

                    /** Wrap a fast function so that it casts the output to the desired type.
                     *
                     * @param {Function} f
                     * @param {string} from_type
                     * @param {string} to_type
                     * @returns {Function}
                     */
                    function make_caster(f, from_type, to_type) {
                        const fast_cast = fast_casters[from_type] && fast_casters[from_type][to_type];
                        const caster = jme.types[from_type].prototype.casts[to_type];
                        if(fast_cast) {
                            if(f.uses_maps) {
                                return function(...params) {
                                    var res = f(...params);
                                    return fast_cast(res);
                                }
                            } else {
                                return function(a1,a2,a3,a4,a5) {
                                    var res = f(a1,a2,a3,a4,a5);
                                    return fast_cast(res);
                                }
                            }
                        } else if(caster) {
                            return function(...params) {
                                var res = f(...params);
                                var tok = new jme.types[from_type](res);
                                var otok = caster.call(tok, tok);
                                return jme.unwrapValue(otok);
                            }
                        } else {
                            return function(...params) {
                                var res = f(...params);
                                var tok = new jme.types[from_type](res);
                                var otok = jme.castToType(tok, to_type);
                                return jme.unwrapValue(otok);
                            }
                        }
                    }
                    for(let i=0;i<args.length;i++) {
                        const from_type = t.args[i].inferred_type;
                        const to_type = sig[i].type;
                        if(to_type != from_type) {
                            args[i] = make_caster(args[i], from_type, to_type);
                        }
                    }
                    let [f1, f2, f3, f4, f5] = args;
                    if(f5) {
                        return function(a1,a2,a3,a4,a5) {
                            return fn(
                                f1(a1, a2, a3, a4, a5),
                                f2(a1, a2, a3, a4, a5),
                                f3(a1, a2, a3, a4, a5),
                                f4(a1, a2, a3, a4, a5),
                                f5(a1, a2, a3, a4, a5),
                            );
                        }
                    } else if(f4) {
                        return function(a1,a2,a3,a4,a5) {
                            return fn(
                                f1(a1, a2, a3, a4, a5),
                                f2(a1, a2, a3, a4, a5),
                                f3(a1, a2, a3, a4, a5),
                                f4(a1, a2, a3, a4, a5)
                            );
                        }
                    } else if(f3) {
                        return function(a1,a2,a3,a4,a5) {
                            return fn(
                                f1(a1, a2, a3, a4, a5),
                                f2(a1, a2, a3, a4, a5),
                                f3(a1, a2, a3, a4, a5)
                            );
                        }
                    } else if(f2) {
                        return function(a1,a2,a3,a4,a5) {
                            return fn(
                                f1(a1, a2, a3, a4, a5),
                                f2(a1, a2, a3, a4, a5),
                            );
                        }
                    } else if(f1) {
                        return function(a1,a2,a3,a4,a5) {
                            return fn(
                                f1(a1, a2, a3, a4, a5)
                            );
                        }
                    } else {
                        return function(a1,a2,a3,a4,a5) {
                            return fn(a1, a2, a3, a4, a5);
                        }
                    }

                } else {
                    const f = function(params) {
                        const eargs = args.map(f => f(params));
                        return fn(...eargs);
                    }
                    f.uses_maps = true;
                }

            default:
                const value = jme.unwrapValue(t.tok);
                return function() { return value; }
        }
    }

    let subbed_tree = jme.substituteTree(tree, scope, true, true);

    /** Replace all integer constants with equivalent numbers, in order to avoid casting to rationals.
     *
     * @param {Numbas.jme.tree} t
     * @returns {Numbas.jme.tree}
     */
    function replace_integers(t) {
        if(t.tok.type == 'integer') {
            return {tok: jme.castToType(t.tok, 'number')};
        }
        if(t.args) {
            t.args = t.args.map(a => replace_integers(a));
        }
        return t;
    }

    const typed_tree = jme.inferTreeType(replace_integers(subbed_tree), scope);

    let f = fast_eval(typed_tree);

    if(tree.tok.name) {
        Object.defineProperty(f,'name',{value:tree.tok.name});
    }

    return f;
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
    label: function(name,sig) {
        var f = function(args) {
            var result = sig(args);
            if(!result) {
                return false;
            }
            result.forEach(function(r) {
                r.name = name;
            });
            return result;
        };
        f.kind = 'label';
        f.signature = sig;
        return f;
    },
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
            if(items===false || items.length<arg.value.length) {
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

/** A match returned by @ref{Numbas.jme.parse_signature}.
 *
 * @typedef Numbas.jme.signature_grammar_match
 * @type {Array}
 * @property 0 {Numbas.jme.signature}
 * @property 1 {string}
 */

/** Parse a signature definition. 
 *
 * Grammar: (there can be any amount of whitespace between tokens)
 *
 * ```
 * SIGNATURE = MULTIPLE | OPTIONAL | EITHER | SINGLE
 * MULTIPLE = "*" SINGLE
 * OPTIONAL = "[" SIGNATURE "]"
 * EITHER = SINGLE "or" SINGLE
 * SINGLE = BRACKETED | LISTOF | DICTOF | ANY | TYPE
 * BRACKETED = "(" SIGNATURE ")"
 * LISTOF = "list of" SIGNATURE
 * DICTOF = "dict of" SIGNATURE
 * ANY = "?"
 * TYPE = \w+
 * ```
 *
 * @param {string|Function} sig - Either a string consisting of an expression in the above grammar, a {@link Numbas.jme.token} constructor, or a {@link Numbas.jme.signature} function.
 * @returns {Numbas.jme.signature}
 */
var parse_signature = jme.parse_signature = function(sig) {

    /** Return the position of the first non-space character after `pos` in `str`.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {number}
     */
    function strip_space(str,pos) {
        var leading_space = str.slice(pos).match(/^\s*/);
        return pos + leading_space[0].length;
    }

    /** Create a function to exactly match a literal token.
     *
     * @param {string} token
     * @returns {Function}
     */
    function literal(token) {
        return function(str,pos) {
            var pos = strip_space(str,pos);
            if(str.slice(pos,token.length+pos)==token) {
                return [token,pos+token.length];
            }
        }
    }

    /** Parse a type description: multiple, optional, either or a single argument or bracketed expression.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function parse_expr(str,pos) {
        pos = strip_space(str,pos || 0);
        return multiple(str,pos) || optional(str,pos) || either(str,pos) || plain_expr(str,pos);
    }
    /** Parse a description of a single argument or bracketed expression: bracketed, list of, dict of, "?" or a type name.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function plain_expr(str,pos) {
        return bracketed(str,pos) || listof(str,pos) || dictof(str,pos) || any(str,pos) || type(str,pos);
    }
    /** Parse an "any number of this" description: "*" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function multiple(str,pos) {
        var star = literal("*")(str,pos);
        if(!star) {
            return undefined;
        }
        pos = star[1];
        var expr = plain_expr(str,pos);
        if(!expr) {
            return undefined;
        }
        return [jme.signature.multiple(expr[0]),expr[1]];
    }
    /** Parse an optional argument description: "[" EXPR "]".
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function optional(str,pos) {
        var open = literal("[")(str,pos);
        if(!open) {
            return undefined;
        }
        pos = open[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return undefined;
        }
        pos = expr[1];
        var end = literal("]")(str,pos);
        if(!end) {
            return undefined;
        }
        return [jme.signature.optional(expr[0]),end[1]];
    }
    /** Parse a bracketed description: "(" EXPR ")".
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function bracketed(str,pos) {
        var open = literal("(")(str,pos);
        if(!open) {
            return undefined;
        }
        pos = open[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return undefined;
        }
        pos = expr[1];
        var end = literal(")")(str,pos);
        if(!pos || !end) {
            return undefined;
        }
        return [expr[0],end[1]];
    }
    /** Parse a "list of" description: "list of" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function listof(str,pos) {
        var start = literal("list of")(str,pos);
        if(!start) {
            return undefined;
        }
        pos = start[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return undefined;
        }
        return [jme.signature.listof(expr[0]),expr[1]];
    }

    /** Parse a "dict" of description: "dict of" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function dictof(str,pos) {
        var start = literal("dict of")(str,pos);
        if(!start) {
            return undefined;
        }
        pos = start[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return undefined;
        }
        return [jme.signature.dict(expr[0]),expr[1]];
    }

    /** Parse an "either" description: EXPR "or" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function either(str,pos) {
        var expr1 = plain_expr(str,pos);
        if(!expr1) {
            return undefined;
        }
        pos = expr1[1];
        var middle = literal("or")(str,pos);
        if(!middle) {
            return undefined;
        }
        pos = middle[1];
        var expr2 = plain_expr(str,pos);
        if(!expr2) {
            return undefined;
        }
        return [jme.signature.or(expr1[0],expr2[0]),expr2[1]];
    }

    /** Parse an "anything" argument: exactly the string "?".
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function any(str,pos) {
        pos = strip_space(str,pos);
        var m = literal("?")(str,pos);
        if(!m) {
            return undefined;
        }
        return [jme.signature.anything(),m[1]];
    }

    /** Parse a data type name: any string of word characters.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function type(str,pos) {
        pos = strip_space(str,pos);
        var m = str.slice(pos).match(/^\w+/);
        if(!m) {
            return undefined;
        }
        var name = m[0];
        return [jme.signature.type(name),pos+name.length];
    }


    if(typeof(sig)=='function') {
        if(sig.kind!==undefined) {
            return sig;
        }
        return jme.signature.type(sig.prototype.type);
    } else {
        var m = parse_expr(sig);
        if(!m) {
            throw(new Numbas.Error("jme.parse signature.invalid signature string",{str: sig}));
        }
        return m[0];
    }
}

var describe_signature = jme.describe_signature = function(sig) {
    switch(sig.kind) {
        case 'sequence':
            return sig.signatures.map(describe_signature).join(', ');
        case 'anything':
            return '?';
        case 'type':
            return sig.type;
        case 'multiple':
            return describe_signature(sig.signature)+'*';
        case 'optional':
            return '['+describe_signature(sig.signature)+']';
        case 'list':
            return 'list of ('+sig.signatures.map(describe_signature)+')';
        case 'dict':
            return 'dict of '+describe_signature(sig.signature);
        case 'or':
            return sig.signatures.map(describe_signature).join(' or ');
    }
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
Numbas.queueScript('jme-builtins',['jme-base','jme-rules','jme-calculus','jme-variables'],function(){
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
var TLambda = types.TLambda;

var sig = jme.signature;

/** The built-in JME evaluation scope.
 *
 * @type {Numbas.jme.Scope}
 * @memberof Numbas.jme
 */
var builtinScope = jme.builtinScope = new Scope({rulesets:jme.rules.simplificationRules});
builtinScope.setConstant('nothing',{value: new types.TNothing, tex: '\\text{nothing}'});
/** Definitions of constants to include in `Numbas.jme.builtinScope`.
 *
 * @type {Array.<Numbas.jme.constant_definition>}
 * @memberof Numbas.jme
 */
var builtin_constants = Numbas.jme.builtin_constants = [
    {name: 'e', value: new TNum(Math.E), tex: 'e'},
    {name: 'pi', value: new TNum(Math.PI), tex: '\\pi'},
    {name: 'i', value: new TNum(math.complex(0,1)), tex: 'i'},
    {name: 'infinity,infty', value: new TNum(Infinity), tex: '\\infty'},
    {name: 'NaN', value: new TNum(NaN), tex: '\\texttt{NaN}'},
    {name: 'j', value: new TNum(math.complex(0,1)), tex: 'j', enabled: false},
];
Numbas.jme.variables.makeConstants(Numbas.jme.builtin_constants, builtinScope);

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
    options = options || {};
    options.random = 'random' in options ? options.random : false;
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
newBuiltin('transpose', ['list of list'], TList, null, {
    evaluate: function(args, scope) {
        var lists = args[0].value;
        var l = Math.min(...lists.map(l => l.value.length));
        var o = [];
        for(let i=0;i<l;i++) {
            var r = [];
            o.push(new TList(lists.map(l => l.value[i])));
        }
        return new TList(o);
    }
});
newBuiltin('is_zero',[TVector],TBool, vectormath.is_zero);
newBuiltin('id',[TNum],TMatrix, matrixmath.id);
newBuiltin('sum_cells',[TMatrix],TNum,matrixmath.sum_cells);
newBuiltin('numrows', [TMatrix], TNum,function(m) {return matrixmath.numrows(m)});
newBuiltin('numcolumns', [TMatrix], TNum,function(m) {return matrixmath.numcolumns(m)});
newBuiltin('combine_vertically',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_vertically(m1,m2)
});
newBuiltin('stack',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_vertically(m1,m2)
});
newBuiltin('combine_horizontally',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_horizontally(m1,m2)
});
newBuiltin('augment',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_horizontally(m1,m2)
});
newBuiltin('combine_diagonally',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_diagonally(m1,m2)
});
newBuiltin('lu_decomposition', [TMatrix], TList, null, {
    evaluate: function(args, scope) {
        var m = args[0].value;
        const [L,U] = matrixmath.lu_decomposition(m);
        return new TList([new TMatrix(L), new TMatrix(U)]);
    }
});

newBuiltin('gauss_jordan_elimination', [TMatrix], TMatrix, matrixmath.gauss_jordan_elimination);

newBuiltin('inverse', [TMatrix], TMatrix, matrixmath.inverse);

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
newBuiltin('formatstring',[TString,TList],TString,null, {
    evaluate: function(args,scope) {
        var str = args[0].value;
        var extra = args[1].value;
        return new TString(util.formatString.apply(util,[str].concat(extra.map(function(x) { return jme.tokenToDisplayString(x,scope); }))));
    }
});
newBuiltin('jme_string',['?'],TString,null,{evaluate: function(args,scope){return new TString(jme.display.treeToJME({tok:args[0]},{},scope))}});
newBuiltin('unpercent',[TString],TNum,util.unPercent);
newBuiltin('letterordinal',[TNum],TString,util.letterOrdinal);
newBuiltin('html',[TString],THTML,null, {
    evaluate: function(args, scope) { 
        var container = document.createElement('div');
        container.innerHTML = args[0].value;
        var subber = new jme.variables.DOMcontentsubber(scope);
        subber.subvars(container);
        return new THTML(Array.from(container.childNodes));
    }
});
newBuiltin('isnonemptyhtml',[TString],TBool,function(html) {
    return util.isNonemptyHTML(html);
});
newBuiltin('image',[TString, '[number]', '[number]'],THTML,null, {
    evaluate: function(args,scope) { 
        var url = args[0].value;
        var width = args[1];
        var height = args[2];
        var img = document.createElement('img');
        img.setAttribute('src',url);
        if(width.type != 'nothing') {
            img.style.width = width.value+'em';
        }
        if(height.type != 'nothing') {
            img.style.height = height.value+'em';
        }
        var subber = new jme.variables.DOMcontentsubber(scope);
        var element = subber.subvars(img);
        return new THTML(element);
    }
});
newBuiltin('latex',[TString],TString,null,{
    evaluate: function(args,scope) {
        var s = new TString(args[0].value);
        s.latex = true;
        s.display_latex = true;
        s.safe = args[0].safe;
        return s;
    }
});
newBuiltin('safe',[TString],TString,null, {
    evaluate: function(args,scope) {
        var s = args[0];
        while(jme.isFunction(s.tok,'safe')) {
            s = s.args[0];
        }
        var t;
        if(s.args) {
            var r = scope.evaluate(s);
            t = new TString(r.value);
            t.latex = r.latex;
            t.display_latex = r.display_latex;
        } else {
            t = new TString(s.tok.value);
        }
        t.safe = true;
        return t;
    }
});
Numbas.jme.lazyOps.push('safe');
jme.findvarsOps.safe = function(tree,boundvars,scope) {
    return [];
}

newBuiltin('escape_html', [TString], TString, function(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
});

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
        vars = jme.findvars(tree.args[0],[],scope);
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
newBuiltin('join',[TList,TString],TString,null, {
    evaluate: function(args,scope) {
        var list = args[0].value;
        var delimiter = args[1].value;
        return new TString(list.map(function(x) { return jme.tokenToDisplayString(x,scope); }).join(delimiter));
    }
});
newBuiltin('split',[TString,TString],TList, function(str,delimiter) {
    return str.split(delimiter).map(function(s){return new TString(s)});
});
newBuiltin('trim',[TString],TString, function(str) { return str.trim(); });
newBuiltin('currency',[TNum,TString,TString],TString,util.currency, {latex: true});
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

newBuiltin('replace_regex',[TString,TString,TString],TString,function(pattern,replacement,str) {
    return str.replace(new RegExp(pattern,'u'),replacement);
});

newBuiltin('replace_regex',[TString,TString,TString,TString],TString,function(pattern,replacement,str,flags) {
    return str.replace(new RegExp(pattern,flags),replacement);
});

//the next three versions of the `except` operator
//exclude numbers from a range, given either as a range, a list or a single value
newBuiltin('except', [TRange,TRange], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        var cons = best_number_type_for_range(range);
        range = math.rangeToList(range);
        if(except[2]==0) {
            return range.filter(function(i){return i<except[0] || i>except[1]}).map(function(i){return new cons(i)});
        } else {
            except = math.rangeToList(except);
            return math.except(range,except).map(function(i){return new cons(i)});
        }
    }
);
newBuiltin('except', [TRange,'list of number'], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        var cons = best_number_type_for_range(range);
        range = math.rangeToList(range)
        except = except.map(function(i){ return i.value; });
        return math.except(range,except).map(function(i){return new cons(i)});
    }
);
newBuiltin('except', [TRange,TNum], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        var cons = best_number_type_for_range(range);
        range = math.rangeToList(range);
        return math.except(range,[except]).map(function(i){return new cons(i)});
    }
);
//exclude numbers from a list, so use the math.except function
newBuiltin('except', [TList,TRange], TList,
    function(range,except) {
        except = math.rangeToList(except);
        return range.filter(function(r) {
            return !except.some(function(e) { return math.eq(r.value,e) });
        });
    }
);
//exclude values of any type from a list containing values of any type, so use the util.except function
newBuiltin('except', [TList,TList], TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.except(args[0].value,args[1].value,scope));
    }
});
newBuiltin('except',[TList,'?'], TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.except(args[0].value,[args[1]],scope));
    }
});
newBuiltin('distinct',[TList],TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.distinct(args[0].value,scope));
    }
},{unwrapValues: false});
newBuiltin('in',['?',TList],TBool,null,{
    evaluate: function(args,scope) {
        return new TBool(util.contains(args[1].value,args[0],scope));
    }
});
newBuiltin('<', [TNum,TNum], TBool, math.lt);
newBuiltin('>', [TNum,TNum], TBool, math.gt );
newBuiltin('<=', [TNum,TNum], TBool, math.leq );
newBuiltin('>=', [TNum,TNum], TBool, math.geq );
newBuiltin('<>', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.neq(args[0],args[1],scope));
    }
});
newBuiltin('=', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.eq(args[0],args[1],scope));
    }
});
newBuiltin('isclose', [TNum,TNum,sig.optional(sig.type('number')),sig.optional(sig.type('number'))], TBool, math.isclose);
newBuiltin('is_scalar_multiple', [TVector,TVector,sig.optional(sig.type('number')),sig.optional(sig.type('number'))], TBool, math.is_scalar_multiple);
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
newBuiltin('atan2', [TNum,TNum], TNum, math.atan2 );
newBuiltin('ceil', [TNum], TNum, null, {
    evaluate: function(args,scope) {
        var n = math.ceil(jme.castToType(args[0],'number').value);
        if(n.complex) {
            return new TNum(n);
        } else {
            return new TInt(n);
        }
    }
});
newBuiltin('floor', [TNum], TNum, null, {
    evaluate: function(args,scope) {
        var n = math.floor(jme.castToType(args[0],'number').value);
        if(n.complex) {
            return new TNum(n);
        } else {
            return new TInt(n);
        }
    }
});
newBuiltin('round', [TNum], TNum, null, {
    evaluate: function(args,scope) {
        var n = math.round(jme.castToType(args[0],'number').value);
        if(n.complex) {
            return new TNum(n);
        } else {
            return new TInt(n);
        }
    }
});
newBuiltin('tonearest',[TNum,TNum], TNum, math.toNearest);
newBuiltin('trunc', [TNum], TNum, math.trunc );
newBuiltin('trunc', [TNum, TNum], TNum, math.trunc );
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
newBuiltin('largest_square_factor',[TNum],TInt, math.largest_square_factor);
newBuiltin('divisors',[TNum],TList,function(n) {
        return math.divisors(n).map(function(n){return new TNum(n)});
    }
);
newBuiltin('proper_divisors',[TNum],TList,function(n) {
        return math.proper_divisors(n).map(function(n){return new TNum(n)});
    }
);

/** Work out which number type best represents a range: if all values are integers, return `TInt`, otherwise `TNum`.
 *
 * @param {Numbas.math.range} range
 * @returns {Function} - a token constructor
 */
function best_number_type_for_range(range) {
    if(util.isInt(range[0]) && util.isInt(range[2]) && range[2]!=0) {
        return TInt;
    } else {
        return TNum;
    }
}
newBuiltin('random', [TRange], TNum, null, {
    evaluate: function(args,scope) {
        var range = args[0];
        var n = math.random(range.value);
        var cons = best_number_type_for_range(range.value);
        return new cons(n);
    },
    random:true
});
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
newBuiltin('weighted_random',[sig.listof(sig.list(sig.anything(),sig.type('number')))],'?',null, {
    evaluate: function(args,scope) {
        var items = args[0].value.map(function(item) {
            return [item.value[0], Numbas.jme.unwrapValue(item.value[1])];
        });
        return math.weighted_random(items);
    },
    random: true
});
newBuiltin('mod', [TNum,TNum], TNum, math.mod );
newBuiltin('max', [TNum,TNum], TNum, math.max );
newBuiltin('min', [TNum,TNum], TNum, math.min );
newBuiltin('clamp',[TNum,TNum,TNum], TNum, function(x,min,max) { return math.max(math.min(x,max),min); });
newBuiltin('max', [TRange], TNum, function(range) { return range[1]; });
newBuiltin('min', [TRange], TNum, function(range) { return range[0]; });
newBuiltin('max', [sig.listof(sig.type('number'))], TNum, math.listmax, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('number'))], TNum, math.listmin, {unwrapValues: true});
/**
 * Define a builtin function with input signature `type, number` which returns a number-like type with the `precisionType` attribute specified.
 *
 * @param {string} name - The name of the functoin.
 * @param {Function} fn - The function.
 * @param {Function} type - The constructor for the type of the first argument, which must be the same as the output.
 * @param {string} precisionType - The precision type of the returned number.
 */
function function_with_precision_info(name,fn,type,precisionType) {
    newBuiltin(name, [type,TNum], type, function(a,precision) {
        var r = fn(a, precision);
        var t = new type(r);
        t.precisionType = precisionType;
        t.precision = precision;
        return t;
    }, {unwrapValues: true});
}

function_with_precision_info('precround', math.precround, TNum, 'dp');
function_with_precision_info('precround', matrixmath.precround, TMatrix, 'dp');
function_with_precision_info('precround', vectormath.precround, TVector, 'dp');
function_with_precision_info('siground', math.siground, TNum, 'sigfig');
function_with_precision_info('siground', matrixmath.siground, TMatrix, 'sigfig');
function_with_precision_info('siground', vectormath.siground, TVector, 'sigfig');
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

newBuiltin('with_precision', [TNum,'nothing or number', 'nothing or string'], TNum, null, {
    evaluate: function(args, scope) {
        var n = args[0];
        var precision = args[1];
        var precisionType = args[2];

        if(jme.isType(precision,'nothing')) {
            delete n.precision;
        } else {
            n.precision = precision.value;
        }

        if(jme.isType(precisionType,'nothing')) {
            delete n.precisionType;
        } else {
            n.precisionType = precisionType.value;
        }

        return n;
    }
});

newBuiltin('imprecise', [TNum], TNum, null, {
    evaluate: function(args, scope) {
        var n = args[0];

        delete n.precision;
        delete n.precisionType;

        return n;
    }
});

newBuiltin('parsedecimal', [TString,TString], TDecimal, function(s,style) {return util.parseDecimal(s,false,style,true);});
newBuiltin('parsedecimal', [TString,sig.listof(sig.type('string'))], TDecimal, function(s,styles) {return util.parseDecimal(s,false,styles,true);}, {unwrapValues: true});
newBuiltin('parsedecimal_or_fraction', [TString], TDecimal, function(s,style) {return util.parseDecimal(s,true,"plain-en",true);});
newBuiltin('parsedecimal_or_fraction', [TString,TString], TDecimal, function(s,style) {return util.parseDecimal(s,true,style,true);});
newBuiltin('parsedecimal_or_fraction', [TString,sig.listof(sig.type('string'))], TDecimal, function(s,styles) {return util.parseDecimal(s,true,styles,true);}, {unwrapValues: true});

newBuiltin('tobinary', [TInt], TString, function(n) {
    return n.toString(2);
},{latex: true});
newBuiltin('tooctal', [TInt], TString, function(n) {
    return n.toString(8);
},{latex: true});
newBuiltin('tohexadecimal', [TInt], TString, function(n) {
    return n.toString(16);
},{latex: true});
newBuiltin('tobase', [TInt,TInt], TString, function(n,b) {
    return n.toString(b);
},{latex: true});
newBuiltin('frombinary', [TString], TInt, function(s) {
    return util.parseInt(s,2);
});
newBuiltin('fromoctal', [TString], TInt, function(s) {
    return util.parseInt(s,8);
});
newBuiltin('fromhexadecimal', [TString], TInt, function(s) {
    return util.parseInt(s,16);
});
newBuiltin('frombase', [TString, TInt], TInt, function(s,b) {
    return util.parseInt(s,b);
});

newBuiltin('scientificnumberlatex', [TNum], TString, null, {
    evaluate: function(args,scope) {
        var n = args[0].value;
        if(n.complex) {
            n = n.re;
        }
        var bits = math.parseScientific(math.niceRealNumber(n,{style:'scientific', scientificStyle: 'plain'}));
        var s = new TString(math.niceRealNumber(bits.significand,{syntax:'latex'})+' \\times 10^{'+bits.exponent+'}');
        s.latex = true;
        s.safe = true;
        s.display_latex = true;
        return s;
    }
});
newBuiltin('scientificnumberlatex', [TDecimal], TString, null, {
    evaluate: function(args,scope) {
        var n = args[0].value;
        var bits = math.parseScientific(n.re.toExponential());
        var s = new TString(math.niceRealNumber(bits.significand)+' \\times 10^{'+bits.exponent+'}');
        s.latex = true;
        s.safe = true;
        s.display_latex = true;
        return s;
    }
});
newBuiltin('scientificnumberhtml', [TDecimal], THTML, function(n) {
    var bits = math.parseScientific(n.re.toExponential());
    var s = document.createElement('span');
    s.innerHTML = math.niceRealNumber(bits.significand)+' × 10<sup>'+bits.exponent+'</sup>';
    return s;
});
newBuiltin('scientificnumberhtml', [TNum], THTML, function(n) {
    if(n.complex) {
        n = n.re;
    }
    var bits = math.parseScientific(math.niceRealNumber(n,{style:'scientific', scientificStyle:'plain'}));
    var s = document.createElement('span');
    s.innerHTML = math.niceRealNumber(bits.significand)+' × 10<sup>'+bits.exponent+'</sup>';
    return s;
});

newBuiltin('togivenprecision', [TString,TString,TNum,TBool], TBool, math.toGivenPrecision);
newBuiltin('togivenprecision_scientific', [TString,TString,TNum], TBool, math.toGivenPrecisionScientific);
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
newBuiltin('string',[TInt], TString, math.niceNumber);
newBuiltin('max', [TInt,TInt], TInt, math.max );
newBuiltin('min', [TInt,TInt], TInt, math.min );
newBuiltin('max', [sig.listof(sig.type('integer'))], TInt, math.listmax, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('integer'))], TInt, math.listmin, {unwrapValues: true});

// Rational arithmetic
newBuiltin('+u', [TRational], TRational, function(a){return a;});
newBuiltin('-u', [TRational], TRational, function(r){ return r.negate(); });
newBuiltin('+', [TRational,TRational], TRational, function(a,b){ return a.add(b); });
newBuiltin('-', [TRational,TRational], TRational, function(a,b){ return a.subtract(b); });
newBuiltin('*', [TRational,TRational], TRational, function(a,b){ return a.multiply(b); });
newBuiltin('*', [TRational,TNum], TNum, function(a,b){ return math.mul(a.toFloat(), b); });
newBuiltin('/', [TRational,TRational], TRational, function(a,b){ return a.divide(b); });
newBuiltin('^', [TRational,TInt], TRational, function(a,b) { return a.pow(b); });
newBuiltin('max', [TRational,TRational], TRational, Fraction.max );
newBuiltin('min', [TRational,TRational], TRational, Fraction.min );
newBuiltin('max', [sig.listof(sig.type('rational'))], TRational, function(l) { return Fraction.max.apply(Fraction,l); }, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('rational'))], TRational, function(l) { return Fraction.min.apply(Fraction,l); }, {unwrapValues: true});
newBuiltin('trunc',[TRational], TInt, function(a) {return a.trunc(); });
newBuiltin('floor',[TRational], TInt, function(a) {return a.floor(); });
newBuiltin('ceil',[TRational], TInt, function(a) {return a.ceil(); });
newBuiltin('fract',[TRational], TRational, function(a) {return a.fract(); });

newBuiltin('string',[TRational], TString, function(a) { return a.toString(); });
newBuiltin('rational',[TNum],TRational, function(n) {
    var r = math.rationalApproximation(n);
    return new Fraction(r[0],r[1]);
});

//Decimal arithmetic
newBuiltin('string',[TDecimal], TString, math.niceComplexDecimal);

newBuiltin('decimal',[TNum],TDecimal,null, {
    evaluate: function(args,scope) {
        if(args.length!==1) {
            throw(new Numbas.Error("jme.typecheck.no right type definition",{op:'decimal'}));
        }
        /**
         * Replace all occurrences of the `number` type in an expression with the equivalent `decimal` value.
         *
         * @param {Numbas.jme.tree} tree
         * @returns {Numbas.jme.tree}
         */
        function replace_number(tree) {
            var ntree = {};
            if(tree.args) {
                ntree.args = tree.args.map(replace_number);
            }
            var tok;
            switch(tree.tok.type) {
                case 'number':
                    var n = tree.tok;
                    var d = (typeof n.originalValue == 'string') ? new math.ComplexDecimal(new Decimal(n.originalValue)) : math.numberToDecimal(n.value);
                    tok = new TDecimal(d);
                    tok.precisionType = n.precisionType;
                    tok.precision = n.precision;
                    break;
                default:
                    tok = tree.tok;
            }
            tree.tok = tok;
            return tree;
        }
        var tree = replace_number(args[0]);
        var arg = scope.evaluate(tree);
        if(jme.isType(arg,'decimal')) {
            return jme.castToType(arg,'decimal');
        } else if(jme.isType(arg,'number')) {
            var n = jme.castToType(arg,'number');
            var d = math.numberToDecimal(n.value);
            var t = new TDecimal(d);
            t.precisionType = n.precisionType;
            t.precision = n.precision;
            return t;
        } else if(jme.isType(arg,'string')) {
            var s = jme.castToType(arg,'string').value;
            var d = new Decimal(s);
            var t = new TDecimal(d);
            t.precisionType = 'dp';
            t.precision = math.countDP(s);
            return t;
        } else {
        }
    }
});
Numbas.jme.lazyOps.push('decimal');
newBuiltin('decimal',[TRational],TDecimal,null, {
    evaluate: function(args,scope) {
        var n = args[0];
        return new TDecimal((new Decimal(n.value.numerator)).dividedBy(new Decimal(n.value.denominator)));
    }
});
newBuiltin('decimal',[TString],TDecimal, function(x) {
    var d = new Decimal(x);
    var t = new TDecimal(d);
    t.precisionType = 'dp';
    t.precision = math.countDP(x);
    return t;
},{unwrapValues:true});
newBuiltin('+u', [TDecimal], TDecimal, function(a){return a;});
newBuiltin('-u', [TDecimal], TDecimal, function(a){ return a.negated(); });
newBuiltin('+', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.plus(b); });
newBuiltin('+', [TNum,TDecimal], TDecimal, function(a,b){ return math.ensure_decimal(a).plus(b); });
newBuiltin('-', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.minus(b); });
newBuiltin('-', [TNum,TDecimal], TDecimal, function(a,b){ return math.ensure_decimal(a).minus(b); });
newBuiltin('*', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.times(b); });
newBuiltin('/', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.dividedBy(b); });
newBuiltin('/', [TNum,TDecimal], TDecimal, function(a,b){ return math.ensure_decimal(a).dividedBy(b); });
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
newBuiltin('atan2', [TDecimal,TDecimal], TDecimal, function(a,b) { return Decimal.atan2(a.re,b.re); } );
newBuiltin('isint',[TDecimal], TBool, function(a) {return a.isInt(); })
newBuiltin('isnan',[TDecimal], TBool, function(a) {return a.isNaN(); })
newBuiltin('iszero',[TDecimal], TBool, function(a) {return a.isZero(); })
newBuiltin('<', [TDecimal,TDecimal], TBool, function(a,b){ return a.lessThan(b); });
newBuiltin('<=', [TDecimal,TDecimal], TBool, function(a,b){ return a.lessThanOrEqualTo(b); });
newBuiltin('<=', [TDecimal,TNum], TBool, function(a,b){ return math.leq(a.re.toNumber(),b); });
newBuiltin('log',[TDecimal], TDecimal, function(a) {return a.re.log(); })
newBuiltin('log',[TDecimal,TDecimal], TDecimal, function(a,b) {return a.re.log().div(b.re.log()); })
newBuiltin('mod', [TDecimal,TDecimal], TDecimal, function(a,b) {
    var m = a.re.mod(b.re);
    if(m.isNegative()) {
        m = m.plus(b.re);
    }
    return m;
});
newBuiltin('exp',[TDecimal], TDecimal, function(a) {return a.exp(); });
newBuiltin('ln',[TDecimal], TDecimal, function(a) {return a.ln(); });
newBuiltin('arg', [TDecimal], TDecimal, function(a) { return a.argument(); } );
newBuiltin('countsigfigs',[TDecimal], TInt, function(a) {return a.re.countSigFigs(); });
newBuiltin('round',[TDecimal], TDecimal, function(a) {return a.round(); });
newBuiltin('sin',[TDecimal], TDecimal, function(a) {return a.re.sin(); });
newBuiltin('sqrt',[TDecimal], TDecimal, function(a) {return a.squareRoot(); });
newBuiltin('tan',[TDecimal], TDecimal, function(a) {return a.re.tan(); });
function_with_precision_info('precround', function(a,dp) {return a.toDecimalPlaces(dp); }, TDecimal, 'dp');
newBuiltin('min', [TDecimal,TDecimal], TDecimal, math.ComplexDecimal.min );
newBuiltin('max', [TDecimal,TDecimal], TDecimal, math.ComplexDecimal.max );
newBuiltin('max', [sig.listof(sig.type('decimal'))], TDecimal, function(l) { return math.listmax(l,math.ComplexDecimal.max); }, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('decimal'))], TDecimal, function(l) { return math.listmin(l,math.ComplexDecimal.min); }, {unwrapValues: true});
newBuiltin('dpformat',[TDecimal,TNum], TString, function(a,dp) {return a.toFixed(dp); });
newBuiltin('tonearest',[TDecimal,TDecimal], TDecimal, function(a,x) {return a.toNearest(x.re); });
newBuiltin('^',[TDecimal,TDecimal], TDecimal, function(a,b) {return a.pow(b); });
newBuiltin('^', [TInt,TDecimal], TDecimal, function(a,b) { return math.ensure_decimal(a).pow(b); });
newBuiltin('sigformat',[TDecimal,TNum], TString, function(a,sf) {return a.toPrecision(sf); });
function_with_precision_info('siground', function(a,dp) {return a.toSignificantDigits(dp); }, TDecimal, 'sigfig');
newBuiltin('formatnumber', [TDecimal,TString], TString, function(n,style) {return math.niceComplexDecimal(n,{style:style});});
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
newBuiltin('reorder',[TList,sig.listof(sig.type('number'))],TList,function(list,order) {
    order = order.map(function(n) { return n.value; });
    return math.reorder(list,order);
});
newBuiltin('shuffle_together',[sig.listof(sig.type('list'))],TList,function(lists) {
    lists = lists.map(function(l) { return l.value; });
    lists = math.shuffle_together(lists);
    return lists.map(function(l) { return new TList(l); });
}, {random: true});

newBuiltin('random_integer_partition',[TNum,TNum],TList, function(n,k) {
    return math.random_integer_partition(n,k).map(function(x) { return new TInt(x); })
}, {random: true});

//if needs to be a bit different because it can return any type
newBuiltin('if', [TBool,'?','?'], '?',null, {
    evaluate: function(args,scope) {
        if(args.length!==3) {
            throw(new Numbas.Error("jme.typecheck.no right type definition",{op:'if'}));
        }
        var test = jme.evaluate(args[0],scope);
        if(jme.isType(test,'boolean')) {
            test = jme.castToType(test,'boolean').value;
        } else {
            // If the test can't be cast to a boolean, use JS's truthiness test on the value attribute.
            // Ideally this should throw an error, but I don't know if anything depends on this undocumented behaviour.
            test = test.value;  
        }
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
        var tok = args[0].tok;
        var kind = jme.evaluate(args[1],scope).value;
        if(tok.type=='name') {
            var c = scope.getConstant(tok.name);
            if(c) {
                tok = c.value;
            }
        }
        if(tok.type=='name' && scope.getVariable(tok.name)==undefined ) {
            return new TBool(kind=='name');
        }
        var match = false;
        if(kind=='complex') {
            match = jme.isType(tok,'number') && tok.value.complex || false;
        } else {
            match = jme.isType(tok, kind);
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
 * @returns {Object<Numbas.jme.token>} - A dictionary mapping names to their generated values.
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
        vars = vars.merge(jme.findvars(tree.args[i],boundvars,scope));
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
        var sliced_matrix = matrix.slice(start,end);
        sliced_matrix.columns = matrix.columns;
        sliced_matrix.rows = end - start;
        return new TMatrix(sliced_matrix);
    }
});
newBuiltin('flatten',['list of list'],TList,null, {
    evaluate: function(args,scope) {
        var o = [];
        args[0].value.forEach(function(l) {
            o = o.concat(l.value);
        });
        return new TList(o);
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
    return boundvars;
}
jme.substituteTreeOps.isset = function(tree,scope,allowUnbound) {
    return tree;
}
/** Map the given expression, considered as a lambda, over the given list.
 *
 * @param {Numbas.jme.types.TLambda} lambda
 * @param {Numbas.jme.types.TList} list - The list to map over.
 * @param {Numbas.jme.Scope} scope - The scope in which to evaluate.
 * @returns {Numbas.jme.types.TList}
 */
function mapOverList(lambda,list,scope) {
    var olist = list.map(function(v) {
        return lambda.evaluate([v], scope);
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
    'range': function(lambda,range,scope) {
        var list = math.rangeToList(range).map(function(n){return new TNum(n)});
        return mapOverList(lambda,list,scope);
    },
    'matrix': function(lambda,matrix,scope) {
        return new TMatrix(matrixmath.map(matrix,function(n) {
            var o = lambda.evaluate([new TNum(n)], scope);
            if(!jme.isType(o,'number')) {
                throw(new Numbas.Error("jme.map.matrix map returned non number"))
            }
            return jme.castToType(o,'number').value;
        }));
    },
    'vector': function(lambda,vector,scope) {
        return new TVector(vectormath.map(vector,function(n) {
            var o = lambda.evaluate([new TNum(n)], scope);
            if(!jme.isType(o,'number')) {
                throw(new Numbas.Error("jme.map.vector map returned non number"))
            }
            return jme.castToType(o,'number').value;
        }));
    }
}
var fn_map = newBuiltin('map',['?',TName,'?'],TList, null, {
    make_lambda: function(args, scope) {
        if(args[0].tok.type == 'lambda') {
            return args;
        }
        return [{tok: new TLambda([args[1]], args[0])}, args[2]];
    },
    evaluate: function(args,scope){
        args = this.options.make_lambda(args, scope);

        var lambda = args[0].tok;

        var value = scope.evaluate(args[1]);

        if(!(value.type in jme.mapFunctions)) {
            throw(new Numbas.Error('jme.typecheck.map not on enumerable',{type:value.type}));
        }

        return jme.mapFunctions[value.type](lambda, value.value, scope);
    }
});
Numbas.jme.lazyOps.push('map');
jme.findvarsOps.map = function(tree,boundvars,scope) {
    return jme.findvars_args(fn_map.options.make_lambda(tree.args, scope), boundvars, scope);
}
jme.substituteTreeOps.map = function(tree,scope,allowUnbound) {
    var list_index = tree.args[0].tok.type == 'lambda' ? 1 : 2;
    tree.args[list_index] = jme.substituteTree(tree.args[list_index],scope,allowUnbound);
    return tree;
}
newBuiltin('for:',['?',TName,'?'],TList, null, {
    evaluate: function(args,scope)
    {
        var lambda = args[0];

        var fors = [];

        /** Unfold chained applications of the `for:`, `of:` and `where:` operators.
         *
         * @param {Numbas.jme.tree} arg
         * @returns {object}
         */
        function unfold_for(arg) {
            if(jme.isOp(arg.tok, 'for:')) {
                unfold_for(arg.args[0]);
                unfold_for(arg.args[1]);
                return null;
            } else if(jme.isOp(arg.tok, 'where:')) {
                var f = unfold_for(arg.args[0]);
                f.where = arg.args[1];
                return null;
            } else if(jme.isOp(arg.tok, 'of:')) {
                var value_tree = arg.args[1];
                var namearg = arg.args[0];
                if(jme.isType(namearg.tok, 'name')) {
                    var f = {name: namearg.tok.name, value_tree};
                    fors.push(f);
                    return f;
                } else if(jme.isType(namearg.tok, 'list')) {
                    var names = namearg.args.map(function(subnamearg) {
                        if(!jme.isType(subnamearg.tok, 'name')) {
                            throw(new Numbas.Error('jme.typecheck.for in name wrong type',{type: subnamearg.tok.type}));
                        }
                        return subnamearg.tok.name;
                    });
                    var f = {names, value_tree};
                    fors.push(f);
                    return f;
                } else {
                    throw(new Numbas.Error('jme.typecheck.for in name wrong type',{type: namearg.tok.type}));
                }
            } else {
                throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'for:'}));
            }
        }

        unfold_for(args[1]);

        scope = new Scope(scope);

        var indexes = fors.map(function() { return 0; });
        var values = fors.map(function() { return []; });

        var end = fors.length-1;
        var out = [];
        var j = 0;

        /** After reaching the end of the mapping chain, go back a step and move to the next item in the last collection.
         */
        function retreat() {
            values[j] = [];
            if(fors[j].names !== undefined) {
                fors[j].names.forEach(function(name) {
                    scope.deleteVariable(name);
                });
            } else {
                scope.deleteVariable(fors[j].name);
            }
            indexes[j] = 0;
            j -= 1;
            if(j >= 0) {
                indexes[j] += 1;
            }
        }

        while(j >= 0) {
            if(indexes[j] == 0) {
                values[j] = jme.castToType(scope.evaluate(fors[j].value_tree), 'list').value;
                if(fors[j].names !== undefined) {
                    values[j] = values[j].map(function(v) { return jme.castToType(v, 'list').value; });
                }
            }
            var f = fors[j];
            while(indexes[j] < values[j].length) {
                var value = values[j][indexes[j]];
                if(f.name !== undefined) {
                    scope.setVariable(f.name, value);
                } else {
                    f.names.forEach(function(name,j) {
                        scope.setVariable(name, value[j]);
                    });
                }
                if(f.where === undefined) {
                    break;
                }
                var res = jme.castToType(scope.evaluate(f.where), 'boolean').value;
                if(res) {
                    break;
                }
                indexes[j] += 1;
            }
            if(indexes[j] >= values[j].length) {
                retreat();
                continue;
            }

            if(j==end) {
                out.push(scope.evaluate(lambda));
                indexes[j] += 1;
                while(j >= 0 && indexes[j] >= values[j].length) {
                    retreat();
                }
            } else {
                j += 1;
                if(j <= end) {
                    indexes[j] = 0;
                }
            }
        }

        return new TList(out);
    }
});
Numbas.jme.lazyOps.push('for:');
jme.findvarsOps['for:'] = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    var lambda_expr = tree.args[0];
    var vars = [];

    /** Find variables used in part of a `.. for: .. of: ..` expression.
     * 
     * @param {Numbas.jme.tree} arg
     */
    function visit_for(arg) {
        if(jme.isOp(arg.tok, 'for:')) {
            visit_for(arg.args[0]);
            visit_for(arg.args[1]);
        } else if(jme.isOp(arg.tok, 'where:')) {
            visit_for(arg.args[0]);
            vars = vars.merge(jme.findvars(arg.args[1], mapped_boundvars, scope));
        } else if(jme.isOp(arg.tok, 'of:')) {
            var namearg = arg.args[0];
            if(namearg.tok.type=='list') {
                var names = namearg.args;
                for(var i=0;i<names.length;i++) {
                    mapped_boundvars.push(jme.normaliseName(names[i].tok.name,scope));
                }
            } else {
                mapped_boundvars.push(jme.normaliseName(namearg.tok.name,scope));
            }
            vars = vars.merge(jme.findvars(arg.args[1], mapped_boundvars, scope));
        }
    }
    visit_for(tree.args[1]);
    vars = vars.merge(jme.findvars(tree.args[0],mapped_boundvars,scope));
    return vars;
}
jme.substituteTreeOps['for:'] = function(tree,scope,allowUnbound) {
    var nscope = new Scope([scope]);
    
    /** Substitute variables into part of a `.. for: .. of: ..` expression.
     *
     * @param {Numbas.jme.tree} arg
     * @returns {Numbas.jme.tree}
     */
    function visit_for(arg) {
        arg = {tok: arg.tok, args: arg.args.slice()};
        if(jme.isOp(arg.tok, 'for:')) {
            arg.args[0] = visit_for(arg.args[0]);
            arg.args[1] = visit_for(arg.args[1]);
        } else if(jme.isOp(arg.tok, 'when:')) {
            arg.args[0] = visit_for(arg.args[0]);
            arg.args[1] = visit_for(arg.args[1]);
        } else if(jme.isOp(arg.tok, 'of:')) {
            var namearg = arg.args[0];
            if(namearg.tok.type=='list') {
                namearg.args.forEach(function(name) {
                    nscope.deleteVariable(name.tok.name);
                });
            } else {
                nscope.deleteVariable(namearg.tok.name);
            }
            arg.args[1] = jme.substituteTree(arg.args[1], nscope, true);
        } else {
            arg = jme.substituteTree(arg, nscope, true);
        }
        return arg;
    }
    tree.args[1] = visit_for(tree.args[1]);
    tree.args[0] = jme.substituteTree(tree.args[0], nscope, true);
    return tree;
}

var fn_filter = newBuiltin('filter',['?',TName,'?'],TList,null, {
    make_lambda: function(args, scope) {
        if(args[0].tok.type == 'lambda') {
            return args;
        }
        return [{tok: new TLambda([args[1]], args[0])}, args[2]];
    },
    evaluate: function(args,scope) {
        args = this.options.make_lambda(args, scope);

        var lambda = args[0].tok;
        var list = jme.castToType(scope.evaluate(args[1]), 'list').value;

        var ovalue = list.filter(function(v) {
            return jme.castToType(lambda.evaluate([v],scope), 'boolean').value;
        });

        return new TList(ovalue);
    }
});
Numbas.jme.lazyOps.push('filter');
jme.findvarsOps.filter = function(tree,boundvars,scope) {
    return jme.findvars_args(fn_filter.options.make_lambda(tree.args), boundvars, scope);
}
jme.substituteTreeOps.filter = function(tree,scope,allowUnbound) {
    var list_index = tree.args[0].tok.type == 'lambda' ? 1 : 2;
    tree.args[list_index] = jme.substituteTree(tree.args[list_index],scope,allowUnbound);
    return tree;
}

var fn_iterate = newBuiltin('iterate',['?',TName,'?',TNum],TList,null, {
    make_lambda: function(args, scope) {
        if(args[0].tok.type == 'lambda') {
            return args;
        }
        return [{tok: new TLambda([args[1]], args[0])}, args[2], args[3]];
    },
    evaluate: function(args,scope) {
        args = this.options.make_lambda(args, scope);

        var lambda = args[0].tok;
        var value = scope.evaluate(args[1]);
        var times = Math.round(jme.castToType(scope.evaluate(args[2]), 'number').value);

        var out = [value];
        for(var i=0;i<times;i++) {
            value = lambda.evaluate([value], scope);
            out.push(value);
        }
        return new TList(out);
    }
});
Numbas.jme.lazyOps.push('iterate');
jme.findvarsOps.iterate = function(tree,boundvars,scope) {
    return jme.findvars_args(fn_iterate.options.make_lambda(tree.args), boundvars, scope);
}
jme.substituteTreeOps.iterate = function(tree,scope,allowUnbound) {
    var i = tree.args[0].tok.type=='lambda' ? 0 : 1;
    tree.args[i+1] = jme.substituteTree(tree.args[i+1],scope,allowUnbound);
    tree.args[i+2] = jme.substituteTree(tree.args[i+2],scope,allowUnbound);
    return tree;
}

var fn_iterate_until = newBuiltin('iterate_until',['?',TName,'?','?',sig.optional(sig.type('number'))],TList,null, {
    make_lambda: function(args, scope) {
        if(args[0].tok.type == 'lambda') {
            return args;
        }
        return [{tok: new TLambda([args[1]], args[0])}, args[2], {tok: new TLambda([args[1]], args[3])}, args[4]];
    },

    evaluate: function(args,scope) {
        args = this.options.make_lambda(args, scope);

        var lambda = args[0].tok;
        var value = scope.evaluate(args[1]);
        var condition = args[2].tok;
        var max_iterations = args[3] ? jme.castToType(scope.evaluate(args[3]), 'number').value : 100;

        var out = [value];

        for(var n=0;n<max_iterations;n++) {
            var stop = condition.evaluate([value], scope);
            if(!jme.isType(stop,'boolean')) {
                throw(new Numbas.Error('jme.iterate_until.condition produced non-boolean',{type: stop.type}));
            } else {
                stop = jme.castToType(stop,'boolean');
                if(stop.value) {
                    break;
                }
            }
            value = lambda.evaluate([value], scope);
            out.push(value);
        }

        return new TList(out);
    }
});
Numbas.jme.lazyOps.push('iterate_until');
jme.findvarsOps.iterate_until = function(tree,boundvars,scope) {
    return jme.findvars_args(fn_iterate_until.options.make_lambda(tree.args), boundvars, scope);
}
jme.substituteTreeOps.iterate_until = function(tree,scope,allowUnbound) {
    tree = {
        tok: tree.tok,
        args: tree.args
    };

    var i = tree.args[0].tok.type=='lambda' ? 0 : 1;
    tree.args[i+1] = jme.substituteTree(tree.args[i+1],scope,allowUnbound);
    if(tree.args[i+3]) {
        tree.args[i+3] = jme.substituteTree(tree.args[i+3], scope. allowUnbound);
    }
    return tree;
}

var fn_foldl = newBuiltin('foldl',['?',TName,TName,'?',TList],'?',null, {
    make_lambda: function(args, scope) {
        if(args[0].tok.type == 'lambda') {
            return args;
        }
        return [{tok: new TLambda([args[1], args[2]], args[0])}, args[3], args[4]];
    },
    evaluate: function(args,scope) {
        args = this.options.make_lambda(args);

        var lambda = args[0].tok;
        var first_value = scope.evaluate(args[1]);
        var list = jme.castToType(scope.evaluate(args[2]), 'list').value;

        var result = list.reduce(function(acc,value) {
            return lambda.evaluate([acc,value], scope);
        },first_value)
        return result;
    }
});
Numbas.jme.lazyOps.push('foldl');
jme.findvarsOps.foldl = function(tree,boundvars,scope) {
    return jme.findvars_args(fn_foldl.options.make_lambda(tree.args), boundvars, scope);
}
jme.substituteTreeOps.foldl = function(tree,scope,allowUnbound) {
    var i = tree.args[0].tok.type=='lambda' ? 0 : 2;
    tree.args[i+1] = jme.substituteTree(tree.args[i+1],scope,allowUnbound);
    tree.args[i+2] = jme.substituteTree(tree.args[i+2],scope,allowUnbound);
    return tree;
}


var fn_take = newBuiltin('take',[TNum,'?',TName,'?'],TList,null, {
    make_lambda: function(args, scope) {
        if(args[1].tok.type == 'lambda') {
            return args;
        }
        return [args[0], {tok: new TLambda([args[2]], args[1])}, args[3]];
    },
    evaluate: function(args,scope) {
        args = this.options.make_lambda(args);

        var n = scope.evaluate(args[0]).value;
        var lambda = args[1].tok;
        var list = args[2];

        list = jme.castToType(scope.evaluate(list), 'list').value;

        var value = [];

        for(var i=0; i<list.length && value.length<n; i++) {
            var v = list[i];
            var ok = jme.castToType(lambda.evaluate([v], scope), 'boolean').value;
            if(ok) {
                value.push(v);
            }
        };
        return new TList(value);
    }
});
Numbas.jme.lazyOps.push('take');
jme.findvarsOps.take = function(tree,boundvars,scope) {
    return jme.findvars_args(fn_take.options.make_lambda(tree.args), boundvars, scope);
}
jme.substituteTreeOps.take = function(tree,scope,allowUnbound) {
    var list_index = tree.args[1].tok.type=='lambda' ? 2 : 3;
    var args = tree.args.slice();
    args[0] = jme.substituteTree(args[0],scope,allowUnbound);
    args[list_index] = jme.substituteTree(args[list_index],scope,allowUnbound);
    return {tok:tree.tok, args: args};
}

newBuiltin('separate', [TList, TLambda], TList, null, {
    evaluate: function(args, scope) {
        var trues = [];
        var falses = [];
        
        var list = args[0];
        var lambda = args[1];

        list.value.forEach(x => {
            const b = jme.castToType(lambda.evaluate([x], scope), 'boolean').value;
            (b ? trues : falses).push(x);
        });

        return new TList([new TList(trues), new TList(falses)]);
    }
});

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
                boundvars.push(jme.normaliseName(tree.args[i].tok.name,scope));
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
            if(util.eq(v,target,scope)) {
                out.push(new TNum(i));
            }
        });
        return new TList(out);
    }
});
newBuiltin('set',[TList],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(util.distinct(args[0].value,scope));
    }
});
newBuiltin('set',[TRange],TSet,null, {
    evaluate: function(args,scope) {
        var l = jme.castToType(args[0],'list');
        return new TSet(util.distinct(l.value,scope));
    }
});
newBuiltin('set', ['*?'], TSet, null, {
    evaluate: function(args,scope) {
        return new TSet(util.distinct(args,scope));
    }
});
newBuiltin('list',[TSet],TList,function(set) {
    var l = [];
    for(var i=0;i<set.length;i++) {
        l.push(set[i]);
    }
    return l;
});
newBuiltin('union',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.union(args[0].value,args[1].value,scope));
    }
});
newBuiltin('intersection',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.intersection(args[0].value,args[1].value,scope));
    }
});
newBuiltin('or',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.union(args[0].value,args[1].value,scope));
    }
});
newBuiltin('and',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.intersection(args[0].value,args[1].value,scope));
    }
});
newBuiltin('-',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.minus(args[0].value,args[1].value,scope));
    }
});
newBuiltin('abs',[TSet],TNum, setmath.size);
newBuiltin('in',['?',TSet],TBool,null,{
    evaluate: function(args,scope) {
        return new TBool(util.contains(args[1].value,args[0],scope));
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
newBuiltin('frequencies',[TList],[TList],null, {
    evaluate: function(args,scope) {
        var o = [];
        var l = args[0].value;
        l.forEach(function(x) {
            var p = o.find(function(item) {
                return util.eq(item[0],x);
            });
            if(p) {
                p[1] += 1;
            } else {
                o.push([x,1]);
            }
        });
        return new TList(o.map(function(p){ return new TList([p[0],new TNum(p[1])]); }));
    }
});
newBuiltin('vector',[sig.multiple(sig.type('number'))],TVector, null, {
    evaluate: function(args,scope)
    {
        var value = [];
        for(var i=0;i<args.length;i++)
        {
            value.push(args[i].value);
        }
        var t = new TVector(value);
        if(args.length>0) {
            t.precisionType = args[0].precisionType;
            t.precision = args[0].precision;
        }
        return t;
    }
});
newBuiltin('vector',[sig.listof(sig.type('number'))],TVector, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var value = list.value.map(function(x){return x.value});
        var t = new TVector(value);
        if(list.value.length>0) {
            var tn = list.value[0];
            t.precisionType = tn.precisionType;
            t.precision = tn.precision;
        }
        return t;
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
        var t = new TMatrix(value);
        if(list.value.length>0) {
            t.precisionType = list.value[0].precisionType;
            t.precision = list.value[0].precision;
        }
        return t;
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
        var t = new TMatrix(value);
        if(rows>0 && columns>0) {
            var tn = list.value[0].value[0];
            t.precisionType = tn.precisionType;
            t.precision = tn.precision;
        }
        return t;
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
        var t = new TMatrix(value);
        if(rows>0 && columns>0) {
            var tn = list.value[0];
            t.precisionType = tn.precisionType;
            t.precision = tn.precision;
        }
        return t;
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
        var t = new TMatrix(value);
        if(rows>0 && columns>0) {
            var tn = args[0].value[0];
            t.precisionType = tn.precisionType;
            t.precision = tn.precision;
        }
        return t;
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
        var t = new TMatrix(matrix);
        if(matrix.columns>0) {
            var tn = args[0];
            t.precisionType = tn.precisionType;
            t.precision = tn.precision;
        }
        return t;
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
        var t = new TMatrix(matrix);
        if(matrix.columns>0) {
            var tn = args[0].value[0];
            t.precisionType = tn.precisionType;
            t.precision = tn.precision;
        }
        return t;
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
 * @param {Numbas.jme.Scope} scope
 */
function set_html_content(element,tok,scope) {
    if(tok.type!='html') {
        element.innerHTML = jme.tokenToDisplayString(tok,scope);
    } else {
        element.appendChild(tok.value);
    }
}
newBuiltin('table',[TList,TList],THTML, null, {
    evaluate: function(args, scope) {
        var data = args[0].value;
        var headers = args[1].value;
        var table = document.createElement('table');
        var thead = document.createElement('thead');
        table.appendChild(thead);
        for(var i=0;i<headers.length;i++) {
            var th = document.createElement('th');
            set_html_content(th,headers[i],scope);
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
                set_html_content(td,data[i].value[j],scope);
                row.appendChild(td);
            }
        }
        return new THTML(table);
    }
});
newBuiltin('table',[TList],THTML, null, {
    evaluate: function(args,scope) {
        var data = args[0].value;
        var table = document.createElement('table');
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for(var i=0;i<data.length;i++) {
            var row = document.createElement('tr');
            tbody.appendChild(row);
            for(var j=0;j<data[i].value.length;j++) {
                var td = document.createElement('td');
                set_html_content(td,data[i].value[j],scope);
                row.appendChild(td);
            }
        }
        return new THTML(table);
    }
});

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
newBuiltin('expression',[TString],TExpression,null, {
    evaluate: function(args,scope) {
        var notation = Numbas.locale.default_number_notation;
        Numbas.locale.default_number_notation = ['plain'];
        /**
         * Replace all strings in the given expression with copies marked with `subjme`.
         *
         * @param {Numbas.jme.tree} tree
         * @returns {Numbas.jme.tree}
         */
        function sub_strings(tree) {
            if(jme.isType(tree.tok,'string') && !tree.tok.safe) {
                var tok = new TString(tree.tok.value);
                tok.subjme = true;
                return {tok: tok};
            } else if(tree.args) {
                return {
                    tok: tree.tok,
                    args: tree.args.map(sub_strings)
                };
            } else {
                return tree;
            }
        }
        var arg = sub_strings(args[0]);
        try {
            var str = scope.evaluate(arg);
        } finally {
            Numbas.locale.default_number_notation = notation;
        }
        if(!jme.isType(str,'string')) {
                throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'expression'}));
        }
        str = jme.castToType(str,'string');
        return new TExpression(jme.compile(str.value));
    }
});
Numbas.jme.lazyOps.push('expression');
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
    try_boundvars.push(jme.normaliseName(tree.args[1].tok.name,scope));
    var vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],try_boundvars,scope));
    return vars;
}
newBuiltin('exec',[sig.or(sig.type('function'),sig.type('op')),TList],TExpression,null, {
    evaluate: function(args, scope) {
        var tok;
        if(args[0].args) {
            tok = scope.evaluate(args[0]);
        } else {
            tok = args[0].tok;
        }
        var list = scope.evaluate(args[1]);
        var eargs = list.value.map(function(a) {
            if(a.type!='expression') {
                return {tok:a};
            } else {
                return a.tree;
            }
        });
        tok.vars = eargs.length;
        return new TExpression({tok: tok, args: eargs});
    }
});
Numbas.jme.lazyOps.push('exec');

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
newBuiltin('string',[TExpression,'[string or list of string]'],TString,null, {
    evaluate: function(args,scope) {
        var flags = {};
        if(args[1]) {
            var rules = args[1].value;
            var ruleset = jme.collectRuleset(rules,scope.allRulesets());
            flags = ruleset.flags;
        }
        return new TString(jme.display.treeToJME(args[0].tree, flags, scope));
    }
});
newBuiltin('latex',[TExpression,'[string or list of string]'],TString,null, {
    evaluate: function(args,scope) {
        var expr = args[0];
        var flags = {};
        if(args[1]) {
            var rules = args[1].value;
            var ruleset = jme.collectRuleset(rules,scope.allRulesets());
            flags = ruleset.flags;
        }
        var tex = jme.display.texify(expr.tree,flags, scope);
        var s = new TString(tex);
        s.latex = true;
        s.display_latex = true;
        return s;
    }
});

newBuiltin('eval',[TExpression],'?',null,{
    evaluate: function(args,scope) {
        return scope.evaluate(args[0].tree);
    },
    random: undefined
});
newBuiltin('eval',[TExpression, TDict],'?',null,{
    evaluate: function(args,scope) {
        return (new Numbas.jme.Scope([scope,{variables:args[1].value}])).evaluate(args[0].tree);
    },
    random: undefined
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
        return new TBool(jme.resultsEqual(a,b,checkingFunction,accuracy,scope));
    }
});

newBuiltin('infer_variable_types',[TExpression],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0];
        var assignments = jme.inferVariableTypes(expr.tree,scope);
        if(!assignments) {
            assignments = {};
        }
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
        if(args.length>1 && args[1].type!='nothing') {
            scope.setVariable('vrange',args[1]);
        }
        for(var x in args[0].value) {
            scope.deleteVariable(x);
            var tree = args[0].value[x].tree;
            var vars = jme.findvars(tree,[],scope);
            todo[x] = {tree: args[0].value[x].tree, vars: vars};
        }
        var result = jme.variables.makeVariables(todo,scope);
        var out = {};
        for(var x in result.variables) {
            out[x] = result.variables[x];
        }
        return new TDict(out);
    },
    random: undefined
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

newBuiltin('scope_case_sensitive', ['?',TBool], '?', null, {
    evaluate: function(args,scope) {
        var caseSensitive = args.length>1 ? scope.evaluate(args[1]).value : true;
        var scope2 = new jme.Scope([scope,{caseSensitive: caseSensitive}]);
        return scope2.evaluate(args[0]);
    }
});
jme.lazyOps.push('scope_case_sensitive');


/** 
 * Rewrite an application of the pipe operator `a |> b(...)` to `b(a, ...)`.
 *
 * Note that the `|>` operator won't normally appear in compiled expressions, because the tree is rewritten as part of the compilation process.
 * This definition is added only so that manually-constructed expressions containing `|>` still work.
 *
 * @param {Array.<Numbas.jme.tree>} args
 * @returns {Numbas.jme.tree}
 */
function pipe_rewrite(args) {
    var bargs = args[1].args.slice();
    bargs.splice(0,0,args[0]);
    var tree = {
        tok: args[1].tok,
        args: bargs
    };

    return tree;
}

newBuiltin('|>', ['?','?'], '?', null, {
    evaluate: function(args, scope) {
        return scope.evaluate(pipe_rewrite(args));
    }
});
jme.lazyOps.push('|>');
jme.findvarsOps['|>'] = function(tree, boundvars, scope) {
    tree = pipe_rewrite(tree.args);
    return jme.findvars(tree, boundvars, scope);
}

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

var D1 = new Decimal(1);
var Dm1 = new Decimal(-1)
var DPI = Decimal.acos(-1);

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

        var settings = util.extend_object({scope: scope},ruleset.flags);
        var tex = texify(tree,settings,scope); //render the tree as TeX
        return tex;
    },

    /** Convert a compiled JME expression to LaTeX.
     *
     * @param {Numbas.jme.tree} tree
     * @param {Array.<string>|Numbas.jme.rules.Ruleset} ruleset - Can be anything accepted by {@link Numbas.jme.display.collectRuleset}.
     * @param {Numbas.jme.Scope} scope
     * @returns {TeX}
     */
    treeToLaTeX: function(tree, ruleset, scope) {
        if(!ruleset) {
            ruleset = jme.rules.simplificationRules.basic;
        }
        ruleset = jme.collectRuleset(ruleset, scope.allRulesets());

        var simplified_tree = jme.display.simplifyTree(tree,ruleset,scope);

        var settings = util.extend_object({scope: scope},ruleset.flags);

        var tex = texify(simplified_tree, settings, scope);

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
        var settings = util.extend_object({nicenumber: false, noscientificnumbers: true}, ruleset.flags);
        return treeToJME(simplifiedTree, ruleset.flags, scope);
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
        if(expr.trim()=='') {
            return '';
        }
        if(!ruleset) {
            ruleset = jme.rules.simplificationRules.basic;
        }
        ruleset = jme.collectRuleset(ruleset,scope.allRulesets());        //collect the ruleset - replace set names with the appropriate Rule objects
        parser = parser || Numbas.jme.standardParser;
        try {
            var exprTree = parser.compile(expr,{},true);    //compile the expression to a tree. notypecheck is true, so undefined function names can be used.
            if(!exprTree) {
                return '';
            }
            return jme.display.simplifyTree(exprTree,ruleset,scope);    // simplify the tree
        } catch(e) {
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
    },


    /** Substitute values into a JME string, and return an expression tree.
     *
     * @param {JME} expr
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.tree}
     */
    subvars: function(expr, scope) {
        var sbits = Numbas.util.splitbrackets(expr,'{','}');
        var wrapped_expr = '';
        var subs = [];
        for(var j = 0; j < sbits.length; j += 1) {
            if(j % 2 == 0) {
                wrapped_expr += sbits[j];
            } else {
                var v = scope.evaluate(sbits[j]);
                if(Numbas.jme.display.treeToJME({tok:v},{},scope)=='') {
                    continue;
                }
                subs.push(jme.unwrapSubexpression({tok:v}));
                wrapped_expr += ' texify_simplify_subvar('+(subs.length-1)+')';
            }
        }

        var tree = Numbas.jme.compile(wrapped_expr);
        if(!tree) {
            return tree;
        }

        /** Replace instances of `texify_simplify_subvar(x)` anywhere in the tree with the result of evaluating `x`.
         *
         * @param {Numbas.jme.tree} tree
         * @returns {Numbas.jme.tree}{
         */
        function replace_subvars(tree) {
            if(tree.tok.type=='function' && tree.tok.name == 'texify_simplify_subvar'){ 
                return subs[tree.args[0].tok.value];
            }
            if(tree.args) {
                var args = tree.args.map(replace_subvars);
                return {tok: tree.tok, args: args};
            }
            return tree;
        }

        var subbed_tree = replace_subvars(tree);

        return subbed_tree;
    }
};

/** The niceNumber options for a given token.
 *
 * @param {Numbas.jme.token} tok
 * @returns {Numbas.math.niceNumber_settings}
 */
var number_options = jme.display.number_options = function(tok) {
    const options = {
        precisionType: tok.precisionType,
        precision: tok.precision
    };
    if(tok.type == 'integer' || tok.type == 'rational') {
        options.store_precision = false;
    }
    return options;
}

/** Options for rendering a string token.
 *
 * @typedef Numbas.jme.display.string_options
 * @see Numbas.jme.types.TString
 * @property {boolean} latex
 * @property {boolean} safe
 */

/** Get options for rendering a string token.
 *
 * @param {Numbas.jme.token} tok
 * @returns {Numbas.jme.display.string_options}
 */
var string_options = jme.display.string_options = function(tok) {
    return {
        latex: tok.latex,
        safe: tok.safe
    };
}

/** Is the given token a complex number?
 * 
 * @param {Numbas.jme.token} tok
 * @returns {boolean}
 */
function isComplex(tok) {
    return (tok.type=='number' && tok.value.complex && tok.value.im!=0) || (tok.type=='decimal' && !tok.value.isReal());
}

/** Is the given token a negative number?
 *
 * @param {Numbas.jme.token} tok
 * @returns {boolean}
 */
function isNegative(tok) {
    if(!jme.isType(tok, 'number')){ 
        return false;
    }
    if(isComplex(tok)) {
        return false;
    }
    if(tok.type == 'decimal') {
        return tok.value.re.isNegative();
    }
    tok = jme.castToType(tok, 'number');
    return tok.value < 0;
}

/** Is the given token a number with non-zero real part?
 *
 * @param {Numbas.jme.token} tok
 * @returns {boolean}
 */
function hasRealPart(tok) {
    switch(tok.type) {
        case 'number':
            return !tok.value.complex || tok.value.re!=0;
        case 'decimal':
            return !tok.value.re.isZero();
        default:
            return hasRealPart(jme.castToType(tok,'number'));
    }
}

/** Get the complex conjugate of a token, assuming it's a number.
 *
 * @param {Numbas.jme.token} tok
 * @returns {Numbas.jme.token}
 */
function conjugate(tok) {
    switch(tok.type) {
        case 'number':
            return math.conjugate(tok.value);
        case 'decimal':
            return tok.value.conjugate().toComplexNumber();
        default:
            return conjugate(jme.castToType(tok,'number'));
    }
}

/** Get the negation of a token, assuming it's a number.
 *
 * @param {Numbas.jme.token} tok
 * @returns {Numbas.jme.token}
 */
function negated(tok) {
    var v = tok.value;
    switch(tok.type) {
        case 'number':
            return math.negate(v);
        case 'decimal':
            return v.negated().toComplexNumber();
        default:
            return negated(jme.castToType(tok,'number'));
    }
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
    return function(tree,texArgs)
    {
        var arity = tree.args.length;
        if( arity == 1 )    //if operation is unary, prepend argument with code
        {
            var arg = this.texifyOpArg(tree,texArgs,0);
            return tree.tok.postfix ? arg+code : code+arg;
        }
        else if ( arity == 2 )    //if operation is binary, put code in between arguments
        {
            return this.texifyOpArg(tree,texArgs,0)+' '+code+' '+this.texifyOpArg(tree,texArgs,1);
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
    return function(tree,texArgs){ return '\\textrm{'+code+'}'; };
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
    var f = function(tree,texArgs){
        return code+' \\left ( '+texArgs.join(Numbas.locale.default_list_separator+' ')+' \\right )';
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

/** TeX a unary positive or minus operation.
 *
 * @param {string} symbol - The symbol for the operation, either `+` or `-`.
 * @returns {Function} - A function which converts a syntax tree to the appropriate TeX.
 */
function texUnaryAdditionOrMinus(symbol) {
    return function(tree,texArgs) {
        var tex = texArgs[0];
        if( tree.args[0].tok.type=='op' ) {
            var op = tree.args[0].tok.name;
            if(
                op=='-u' || op=='+u' ||
                (!(op=='/' || op=='*') && jme.precedence[op]>jme.precedence[symbol+'u'])    //brackets are needed if argument is an operation which would be evaluated after the unary op
            ) {
                tex='\\left ( '+tex+' \\right )';
            }
        } else if(isComplex(tree.args[0].tok)) {
            var tok = tree.args[0].tok;
            switch(tok.type) {
                case 'number':
                    var value = tok.value;
                    return this.number({complex:true,re:-value.re,im:-value.im}, number_options(tok));
                case 'decimal':
                    return this.number(tok.value.negated().toComplexNumber(), number_options(tok));
            }
        }
        return symbol+tex;
    }
}

/** Define how to texify each operation and function.
 *
 * @enum {Function}
 * @memberof Numbas.jme.display
 */
var texOps = jme.display.texOps = {
    '#': (function(tree,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),
    'not': infixTex('\\neg '),
    '+u': texUnaryAdditionOrMinus('+'),
    '-u': texUnaryAdditionOrMinus('-'),
    '^': (function(tree,texArgs) {
        var tex0 = texArgs[0];
        //if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
        if(tree.args[0].tok.type=='op' || (tree.args[0].tok.type=='function' && tree.args[0].tok.name=='exp') || this.texifyWouldBracketOpArg(tree, 0)) {
            tex0 = '\\left ( ' +tex0+' \\right )';
        }
        var trigFunctions = ['cos','sin','tan','sec','cosec','cot','arcsin','arccos','arctan','cosh','sinh','tanh','cosech','sech','coth','arccosh','arcsinh','arctanh'];
        if(tree.args[0].tok.type=='function' && trigFunctions.contains(tree.args[0].tok.name) && jme.isType(tree.args[1].tok,'number') && util.isInt(tree.args[1].tok.value) && tree.args[1].tok.value>0) {
            return texOps[tree.args[0].tok.name].code + '^{'+texArgs[1]+'}' + '\\left( '+this.render(tree.args[0].args[0])+' \\right)';
        }
        return (tex0+'^{ '+texArgs[1]+' }');
    }),
    '*': (function(tree, texArgs) {
        var s = this.texifyOpArg(tree,texArgs,0);
        for(var i=1; i<tree.args.length; i++ ) {
            var left = tree.args[i-1];
            var right = tree.args[i];
            var use_symbol = false;
            if(this.settings.alwaystimes) {
                use_symbol = true;
            } else {
                if(this.texifyWouldBracketOpArg(tree,i-1) && this.texifyWouldBracketOpArg(tree,i)) {
                    use_symbol = false;
                // if we'd end up with two digits next to each other, but from different arguments, we need a times symbol
                } else if(util.isInt(texArgs[i-1].charAt(texArgs[i-1].length-1)) && util.isInt(texArgs[i].charAt(0)) && !this.texifyWouldBracketOpArg(tree,i)) {
                    use_symbol = true;
                //real number times something that doesn't start with a letter
                } else if (jme.isType(left.tok,'number') && !isComplex(left.tok) && texArgs[i].match(/^[^0-9]/)) {
                    use_symbol = false
                //number times a power of i
                } else if (jme.isOp(right.tok,'^') && jme.isType(right.args[0].tok,'number') && math.eq(right.args[0].tok.value,math.complex(0,1)) && jme.isType(left.tok,'number')) {
                    use_symbol = false;
                // times sign when LHS or RHS is a factorial
                } else if((left.tok.type=='function' && left.tok.name=='fact') || (right.tok.type=='function' && right.tok.name=='fact')) {
                    use_symbol = true;
                //(anything except i) times i
                } else if ( !(jme.isType(left.tok,'number') && math.eq(jme.castToType(left.tok,'number').value,math.complex(0,1))) && jme.isType(right.tok,'number') && math.eq(jme.castToType(right.tok,'number').value,math.complex(0,1))) {
                    use_symbol = false;
                // multiplication of two names, at least one of which has more than one letter
                } else if(right.tok.type=='name' && left.tok.type=='name' && Math.max(left.tok.nameInfo.letterLength,right.tok.nameInfo.letterLength)>1) {
                    use_symbol = true;
                // multiplication of a name by something in brackets
                } else if(jme.isType(left.tok,'name') && this.texifyWouldBracketOpArg(tree,i)) {
                    use_symbol = true;
                // anything times number, or (-anything), or an op with lower precedence than times, with leftmost arg a number
                } else if ( jme.isType(right.tok,'number') || (right.tok.type=='op' && jme.precedence[right.tok.name]<=jme.precedence['*'] && texArgs[i].match(/^\d/))) {
                    use_symbol = true;
                }
            }
            s += use_symbol ? ' '+this.texTimesSymbol()+' ' : ' ';
            s += this.texifyOpArg(tree,texArgs,i);
        }
        return s;
    }),
    '/': (function(tree,texArgs) {
        if (this.settings.flatfractions) {
            return '\\left. ' + this.texifyOpArg(tree,texArgs,0) + ' \\middle/ ' + this.texifyOpArg(tree,texArgs,1) + ' \\right.'
        } else {
            return ('\\frac{ '+texArgs[0]+' }{ '+texArgs[1]+' }');
        }
    }),
    '+': (function(tree,texArgs) {
        var a = tree.args[0];
        var b = tree.args[1];
        if(jme.isOp(b.tok,'+u') || jme.isOp(b.tok,'-u')) {
            return texArgs[0]+' + \\left ( '+texArgs[1]+' \\right )';
        } else {
            return texArgs[0]+' + '+texArgs[1];
        }
    }),
    '-': (function(tree,texArgs) {
        var a = tree.args[0];
        var b = tree.args[1];
        if(isComplex(b.tok) && hasRealPart(b.tok)) {
            var texb = this.number(conjugate(b.tok), number_options(b.tok));
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
    'transpose': (function(tree,texArgs) {
        var tex = texArgs[0];
        if(tree.args[0].tok.type=='op')
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
    'decimal': function(tree,texArgs) {
        if(jme.isType(tree.args[0].tok, 'string')) {
            var s = jme.castToType(tree.args[0].tok, 'string').value;
            var t = new jme.types.TDecimal(new Decimal(s));
            t.precisionType = 'dp';
            t.precision = math.countDP(s);
            return this.typeToTeX['decimal'].call(this,{tok:t},t);
        }
        return texArgs[0];
    },
    'abs': (function(tree,texArgs) {
        var arg;
        if(tree.args[0].tok.type=='vector')
            arg = this.texVector(tree.args[0].tok.value, number_options(tree.args[0].tok));
        else if(tree.args[0].tok.type=='function' && tree.args[0].tok.name=='vector')
            arg = this.texVector(tree.args[0]);
        else if(tree.args[0].tok.type=='matrix')
            arg = this.texMatrix(tree.args[0].tok.value, false, number_options(tree.args[0].tok));
        else if(tree.args[0].tok.type=='function' && tree.args[0].tok.name=='matrix')
            arg = this.texMatrix(tree.args[0], false);
        else
            arg = texArgs[0];
        return ('\\left | '+arg+' \\right |');
    }),
    'sqrt': (function(tree,texArgs) { return ('\\sqrt{ '+texArgs[0]+' }'); }),
    'exp': (function(tree,texArgs) { 
        if(this.common_constants.e) {
            return (this.common_constants.e.tex+'^{ '+texArgs[0]+' }');
        } else {
            return funcTex('\\exp')(tree,texArgs);
        }
    }),
    'fact': (function(tree,texArgs) {
                if(jme.isType(tree.args[0].tok,'number') || tree.args[0].tok.type=='name') {
                    return texArgs[0]+'!';
                } else {
                    return '\\left ('+texArgs[0]+' \\right )!';
                }
            }),
    'ceil': (function(tree,texArgs) { return '\\left \\lceil '+texArgs[0]+' \\right \\rceil';}),
    'floor': (function(tree,texArgs) { return '\\left \\lfloor '+texArgs[0]+' \\right \\rfloor';}),
    'int': (function(tree,texArgs) { return ('\\int \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'defint': (function(tree,texArgs) { return ('\\int_{'+texArgs[2]+'}^{'+texArgs[3]+'} \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'diff': (function(tree,texArgs)
            {
                var degree = tree.args.length>=2 ? (jme.isType(tree.args[2].tok,'number') && jme.castToType(tree.args[2].tok,'number').value==1) ? '' : '^{'+texArgs[2]+'}' : '';
                if(tree.args[0].tok.type=='name') {
                    if (this.settings.flatfractions) {
                        return ('\\left. \\mathrm{d}'+degree+this.texifyOpArg(tree, texArgs, 0)+' \\middle/ \\mathrm{d}'+this.texifyOpArg(tree, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\mathrm{d}'+degree+texArgs[0]+'}{\\mathrm{d}'+texArgs[1]+degree+'}');
                    }
                } else {
                    if (this.settings.flatfractions) {
                        return ('\\left. \\mathrm{d}'+degree+'('+texArgs[0]+') \\middle/ \\mathrm{d}'+this.texifyOpArg(tree, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\mathrm{d}'+degree+'}{\\mathrm{d}'+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                    }
                }
            }),
    'partialdiff': (function(tree,texArgs)
            {
                var degree = tree.args.length>=2 ? (jme.isType(tree.args[2].tok,'number') && jme.castToType(tree.args[2].tok,'number').value==1) ? '' : '^{'+texArgs[2]+'}' : '';
                if(tree.args[0].tok.type=='name')
                    if (this.settings.flatfractions) {
                        return ('\\left. \\partial '+degree+this.texifyOpArg(tree, texArgs, 0)+' \\middle/ \\partial '+this.texifyOpArg(tree, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\partial '+degree+texArgs[0]+'}{\\partial '+texArgs[1]+degree+'}');
                    }
                else
                {
                    if (this.settings.flatfractions) {
                        return ('\\left. \\partial '+degree+'('+texArgs[0]+') \\middle/ \\partial '+this.texifyOpArg(tree, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\partial '+degree+'}{\\partial '+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                    }
                }
            }),
    'sub': (function(tree,texArgs) {
        return texArgs[0]+'_{ '+texArgs[1]+' }';
    }),
    'sup': (function(tree,texArgs) {
        return texArgs[0]+'^{ '+texArgs[1]+' }';
    }),
    'limit': (function(tree,texArgs) { return ('\\lim_{'+texArgs[1]+' \\to '+texArgs[2]+'}{'+texArgs[0]+'}'); }),
    'mod': (function(tree,texArgs) {return texArgs[0]+' \\pmod{'+texArgs[1]+'}';}),
    'perm': (function(tree,texArgs) { return '^{'+texArgs[0]+'}\\kern-2pt P_{'+texArgs[1]+'}';}),
    'comb': (function(tree,texArgs) { return '^{'+texArgs[0]+'}\\kern-1pt C_{'+texArgs[1]+'}';}),
    'root': (function(tree,texArgs) { 
        if(jme.isType(tree.args[1].tok, 'number')) {
            var n = jme.castToType(tree.args[1].tok, 'number').value;
            if(n == 2) {
                return '\\sqrt{ '+texArgs[0]+' }';
            }
        }
        return '\\sqrt['+texArgs[1]+']{ '+texArgs[0]+' }'; 
    }),
    'if': (function(tree,texArgs)
            {
                for(var i=0;i<3;i++)
                {
                    if(tree.args[i].args!==undefined)
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
    'ln': function(tree,texArgs) {
        if(tree.args[0].tok.type=='function' && tree.args[0].tok.name=='abs')
            return '\\ln '+texArgs[0];
        else
            return '\\ln \\left ( '+texArgs[0]+' \\right )';
    },
    'log': function(tree,texArgs) {
        var base = tree.args.length==1 ? '10' : texArgs[1];
        return '\\log_{'+base+'} \\left ( '+texArgs[0]+' \\right )';
    },
    'vector': (function(tree,texArgs) {
        return '\\left ( '+this.texVector(tree)+' \\right )';
    }),
    'rowvector': (function(tree,texArgs) {
        if(tree.args[0].tok.type!='list')
            return this.texMatrix({args:[{args:tree.args}]},true, number_options(tree.tok));
        else
            return this.texMatrix(tree,true, number_options(tree.tok));
    }),
    'matrix': (function(tree,texArgs) {
        return this.texMatrix(tree,!this.settings.barematrices,number_options(tree.tok));
    }),
    'listval': (function(tree,texArgs) {
        return texArgs[0]+' \\left['+texArgs[1]+'\\right]';
    }),
    'set': function(tree,texArgs) {
        if(tree.args.length==1 && tree.args[0].tok.type=='list') {
            return '\\left\\{ '+this.render({tok: tree.args[0]})+' \\right\\}';
        } else {
            return '\\left\\{ '+texArgs.join(Numbas.locale.default_list_separator+' ')+' \\right\\}';
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
    ';': function(tree,texArgs) {
        return '\\underset{\\color{grey}{'+texArgs[1]+'}}{'+texArgs[0]+'}';
    },
    ';=': function(tree,texArgs) {
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
    return function(tree,texArgs) {
        return '\\overbrace{'+texArgs[0]+'}^{\\text{'+label+'}}';
    }
}

/** Produce LaTeX for a unary pattern-matching operator.
 *
 * @param {string} code - TeX for the operator's name.
 * @returns {Function}
 */
function unaryPatternTex(code) {
    return function(tree,texArgs) {
        return '{'+texArgs[0]+'}^{'+code+'}';
    }
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
    diff: function(name) {
        return '{\\mathrm{d}'+name+'}';
    },
    degrees: function(name) {
        return name+'^{\\circ}';
    },
    bb: function(name) { 
        return '\\mathbb{'+name+'}'; 
    },
    complex: propertyAnnotation('complex'),
    imaginary: propertyAnnotation('imaginary'),
    real: propertyAnnotation('real'),
    positive: propertyAnnotation('positive'),
    nonnegative: propertyAnnotation('non-negative'),
    negative: propertyAnnotation('negative'),
    integer: propertyAnnotation('integer'),
    decimal: propertyAnnotation('decimal'),
    rational: propertyAnnotation('rational'),
    nonone: propertyAnnotation('nonone'),
    nonzero: propertyAnnotation('nonzero'),
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
 * @type {Object<string>}
 */
var specialNames = jme.display.specialNames = {
    '$z': texPatternName('nothing'),
    '$n': texPatternName('number'),
    '$v': texPatternName('name')
}

/** Definition of a number with a special name.
 *
 * @typedef Numbas.jme.display.special_number_definition
 * @property {number} value
 * @property {TeX} tex - The TeX code for this number.
 * @property {JME} jme - The JME code for this number.
 */

/** Dictionary of functions to turn {@link Numbas.jme.types} objects into TeX strings.
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToTeX = jme.display.typeToTeX = {
    'nothing': function(tree,tok,texArgs) {
        return '\\text{nothing}';
    },
    'integer': function(tree,tok,texArgs) {
        return this.number(tok.value, number_options(tok));
    },
    'rational': function(tree,tok,texArgs) {
        return this.number(tok.value.toFloat(), number_options(tok));
    },
    'decimal': function(tree,tok,texArgs) {
        return this.decimal(tok.value, number_options(tok));
    },
    'number': function(tree,tok,texArgs) {
        return this.number(tok.value, number_options(tok));
    },
    'string': function(tree,tok,texArgs) {
        if(tok.latex) {
            if(tok.safe) {
                return tok.value;
            } else {
                return tok.value.replace(/\\([\{\}])/g,'$1').replace(/\$/g,'\\$');
            }
        } else {
            return '\\textrm{'+tok.value+'}';
        }
    },
    'boolean': function(tree,tok,texArgs) {
        return tok.value ? 'true' : 'false';
    },
    range: function(tree,tok,texArgs) {
        return tok.value[0]+ ' \\dots '+tok.value[1];
    },
    list: function(tree,tok,texArgs) {
        if(!texArgs)
        {
            texArgs = [];
            for(var i=0;i<tok.vars;i++) {
                texArgs[i] = this.render({tok:tok.value[i]});
            }
        }
        return '\\left[ '+texArgs.join(Numbas.locale.default_list_separator+' ')+' \\right]';
    },
    keypair: function(tree,tok,texArgs) {
        var key = '\\textrm{'+tok.key+'}';
        return key+' \\operatorname{\\colon} '+texArgs[0];
    },
    dict: function(tree,tok,texArgs) {
        if(!texArgs)
        {
            texArgs = [];
            if(tok.value) {
                for(var key in tok.value) {
                    texArgs.push(this.render({tok: new jme.types.TKeyPair(key), args:[{tok:tok.value[key]}]}));
                }
            }
        }
        return '\\left[ '+texArgs.join(Numbas.locale.default_list_separator+' ')+' \\right]';
    },
    vector: function(tree,tok,texArgs) {
        return ('\\left ( '
                + this.texVector(tok.value, number_options(tok))
                + ' \\right )' );
    },
    matrix: function(tree,tok,texArgs) {
        var m = this.texMatrix(tok.value, false, number_options(tok));
        if(!this.settings.barematrices) {
            m = '\\left ( ' + m + ' \\right )';
        }
        return m;
    },
    name: function(tree,tok,texArgs) {
        var c = this.scope.getConstant(tok.name);
        if(c) {
            return c.tex;
        }
        return this.texName(tok);
    },
    op: function(tree,tok,texArgs) {
        return this.texOp(tree,tok,texArgs);
    },
    'function': function(tree,tok,texArgs) {
        return this.texFunction(tree,tok,texArgs);
    },
    set: function(tree,tok,texArgs) {
        texArgs = [];
        for(var i=0;i<tok.value.length;i++) {
            texArgs.push(this.render({tok: tok.value[i]}));
        }
        return '\\left\\{ '+texArgs.join(Numbas.locale.default_list_separator+' ')+' \\right\\}';
    },
    expression: function(tree,tok,texArgs) {
        return this.render(tok.tree);
    },
    'lambda': function(tree, tok, texArgs) {
        var names = tok.names.map(name => this.render(name)).join(', ');
        if(names.length != 1) {
            names = '\\left(' + names + '\\right)';
        }
        var expr = this.render(tok.expr);
        return '\\left('+names + ' \\to ' + expr+'\\right)';
    },
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
 * @typedef Numbas.jme.display.displayer_settings
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} rowvector - Display vectors as a horizontal list of components?
 * @property {boolean} alwaystimes - Always show the multiplication symbol between multiplicands?
 * @property {boolean} mixedfractions - Show top-heavy fractions as mixed fractions, e.g. 3 3/4?
 * @property {boolean} flatfractions - Display fractions horizontally?
 * @property {boolean} barematrices - Render matrices without wrapping them in parentheses.
 * @property {boolean} nicenumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {boolean} noscientificnumbers - If true, don't write numbers in scientific notation.
 * @property {number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 * @property {boolean} timesdot - Use a dot for the multiplication symbol instead of a cross?
 * @property {boolean} timesspace - Use a space for the multiplication symbol instead of a cross?
 */

/** An object which can convert a JME tree into some display format.
 *
 * @memberof Numbas.jme.display
 * @class
 *
 * @param {Numbas.jme.display.displayer_settings} settings
 * @param {Numbas.jme.Scope} scope
 * @see Numbas.jme.display.Texifier
 * @see Numbas.jme.display.JMEifier
 */
var JMEDisplayer = jme.display.JMEDisplayer = function(settings,scope) {
    this.settings = settings || {};
    this.scope = scope || Numbas.jme.builtinScope;
    this.getConstants();
}
JMEDisplayer.prototype = {

    /** Fill the dictionaries of constants from the scope. Done once, on creation of the Texifier.
     *
     */
    getConstants: function() {
        var scope = this.scope;
        this.constants = Object.values(scope.allConstants()).reverse();
        var common_constants = this.common_constants = {
            pi: null,
            imaginary_unit: null,
            e: null,
            infinity: null
        }
        var cpi = scope.getConstant('pi');
        if(cpi && util.eq(cpi.value, new jme.types.TNum(Math.PI), scope)) {
            common_constants.pi = cpi;
        }

        var imaginary_unit = new jme.types.TNum(math.complex(0,1));
        this.constants.forEach(function(c) {
            if(jme.isType(c.value,'number')) {
                var n = jme.castToType(c.value,'number').value;
                if(util.eq(c.value,imaginary_unit,scope)) {
                    common_constants.imaginary_unit = c;
                } else if(math.piDegree(n)==1) {
                    common_constants.pi = {
                        scale: n/Math.PI,
                        constant: c
                    }
                } else if(n===Infinity) {
                    common_constants.infinity = c;
                } else if(n==Math.E) {
                    common_constants.e = c;
                }
            }
        });
        this.constants.reverse();
    },

    /** Convert the given JME tree to the output format.
     *
     * @abstract
     * @param {Numbas.jme.tree} tree
     * @returns {*}
     */
    render: function(tree) {
    },

    /** Display a complex number.
     *
     * @abstract
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#number
     */
    complex_number: function(n,options) {
    },

    /** Display a number as a fraction.
     *
     * @abstract
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#number
     */
    rational_number: function(n,options) {
    },

    /** Display a number as a decimal.
     *
     * @abstract
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#number
     */
    real_number: function(n,options) {
    },

    /** Display a number.
     *
     * @param {number|complex} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#complex_number
     * @see Numbas.jme.display.JMEDisplayer#rational_number
     * @see Numbas.jme.display.JMEDisplayer#real_number
     */
    number: function(n,options) {
        if(n.complex) {
            return this.complex_number(n,options);
        } else {
            var fn = this.settings.fractionnumbers ? this.rational_number : this.real_number;
            return fn.call(this,n,options);
        }
    },


    /** Display a complex decimal.
     *
     * @abstract
     * @param {Numbas.math.ComplexDecimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#decimal
     */
    complex_decimal: function(n,options) {
    },

    /** Display a decimal as a fraction.
     *
     * @abstract
     * @param {Decimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#decimal
     */
    rational_decimal: function(n,options) {
    },

    /** Display a decimal as a decimal.
     *
     * @abstract
     * @param {Decimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#decimal
     */
    real_decimal: function(n,options) {
    },

    /** Display a decimal.
     *
     * @param {Numbas.math.ComplexDecimal|Decimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {*}
     * @see Numbas.jme.display.JMEDisplayer#complex_decimal
     * @see Numbas.jme.display.JMEDisplayer#rational_decimal
     * @see Numbas.jme.display.JMEDisplayer#real_decimal
     */
    decimal: function(n,options) {
        var isComplexDecimal = n instanceof Numbas.math.ComplexDecimal;
        if(isComplexDecimal && !n.isReal()) {
            return this.complex_decimal(n,options);
        } else {
            var fn = this.settings.fractionnumbers ? this.rational_decimal : this.real_decimal;
            var re = isComplexDecimal ? n.re : n;
            return fn.call(this, re, options);
        }
    },
};

/** Convert a JME tree to TeX.
 *
 * @augments Numbas.jme.display.JMEDisplayer
 * @memberof Numbas.jme.display
 */
var Texifier = jme.display.Texifier = util.extend(JMEDisplayer,function() {});
Texifier.prototype = {
    __proto__: JMEDisplayer.prototype,

    render: function(tree) {
        var texifier = this;
        if(!tree) {
            return '';
        }
        var texArgs;

        var tok = tree.tok || tree;
        if(jme.isOp(tok,'*')) {
            // flatten nested multiplications, so a string of consecutive multiplications can be considered together
            tree = {tok: tree.tok, args: flatten(tree,'*')};
        }
        if(tree.args) {
            tree = {
                tok: tree.tok,
                args: tree.args.map(function(arg) { return jme.unwrapSubexpression(arg); })
            }
            texArgs = tree.args.map(function(arg) {
                return texifier.render(arg);
            });
        } else {
            var constantTex = this.texConstant(tree);
            if(constantTex) {
                return constantTex;
            }
        }
        if(tok.type in this.typeToTeX) {
            return this.typeToTeX[tok.type].call(this,tree,tok,texArgs);
        } else {
            throw(new Numbas.Error(R('jme.display.unknown token type',{type:tok.type})));
        }
    },

    /** Convert a complex number to TeX.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {complex} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    complex_number: function(n,options) {
        var imaginary_unit = '\\sqrt{-1}';
        if(this.common_constants.imaginary_unit) {
            imaginary_unit = this.common_constants.imaginary_unit.tex;
        }
        var re = this.number(n.re,options);
        var im = this.number(n.im,options)+' ' + imaginary_unit;
        if(n.im==0) {
            return re;
        } else if(n.re==0) {
            if(n.im==1) {
                return imaginary_unit;
            } else if(n.im==-1) {
                return '-' + imaginary_unit;
            } else {
                return im;
            }
        } else if(n.im<0) {
            if(n.im==-1) {
                return re + ' - ' + imaginary_unit;
            } else {
                return re + ' ' + im;
            }
        } else {
            if(n.im==1) {
                return re + ' + ' + imaginary_unit;
            } else {
                return re + ' + ' + im;
            }
        }
    },

    /** Convert a complex decimal to TeX.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Numbas.math.ComplexDecimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    complex_decimal: function(n,options) {
        var imaginary_unit = '\\sqrt{-1}';
        if(this.common_constants.imaginary_unit) {
            imaginary_unit = this.common_constants.imaginary_unit.tex;
        }
        var re = this.decimal(n.re, options);
        var im = this.decimal(n.im, options)+' ' + imaginary_unit;
        if(n.im.isZero()) {
            return re;
        } else if(n.re.isZero()) {
            if(n.im.equals(D1)) {
                return imaginary_unit;
            } else if(n.im.equals(Dm1)) {
                return '-' + imaginary_unit;
            } else {
                return im;
            }
        } else if(n.im.isNegative()) {
            if(n.im.equals(Dm1)) {
                return re + ' - ' + imaginary_unit;
            } else {
                return re + ' ' + im;
            }
        } else {
            if(n.im.equals(D1)) {
                return re + ' + ' + imaginary_unit;
            } else {
                return re + ' + ' + im;
            }
        }
    },

    /** Convert a number to TeX, displaying it as a fraction using {@link Numbas.math.rationalApproximation}.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    rational_number: function(n,options) {
        var piD;
        if(this.common_constants.pi && (piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI*this.common_constants.pi.scale, piD);
        var out = math.niceNumber(n, Object.assign({}, options, {syntax:'latex'}));
        if(out.length>20 && !this.settings.noscientificnumbers) {
            var bits = math.parseScientific(n.toExponential(), false);
            return bits.significand+' '+this.texTimesSymbol()+' 10^{'+bits.exponent+'}';
        }
        var f = math.rationalApproximation(Math.abs(n));
        if(f[1]==1) {
            out = Math.abs(f[0]).toString();
        } else {
            if(this.settings.mixedfractions && f[0] > f[1]) {
                var properNumerator = math.mod(f[0], f[1]);
                var mixedInteger = (f[0]-properNumerator)/f[1];
                if (this.settings.flatfractions) {
                    out = mixedInteger+'\\; \\left. '+properNumerator+' \\middle/ '+f[1]+' \\right.';
                } else {
                    out = mixedInteger+' \\frac{'+properNumerator+'}{'+f[1]+'}';
                }
            }
            else {
                if (this.settings.flatfractions) {
                    out = '\\left. '+f[0]+' \\middle/ '+f[1]+' \\right.'
                }
                else {
                    out = '\\frac{'+f[0]+'}{'+f[1]+'}';
                }
            }
        }
        if(n<0 && out!='0')
            out='-'+out;
        var circle_constant_symbol = this.common_constants.pi && this.common_constants.pi.constant.tex;
        switch(piD) {
            case undefined:
            case 0:
                return out;
            case 1:
                if(n==-1)
                    return '-'+circle_constant_symbol;
                else
                    return out+' '+circle_constant_symbol;
            default:
                if(n==-1)
                    return '-'+circle_constant_symbol+'^{'+piD+'}';
                else
                    return out+' '+circle_constant_symbol+'^{'+piD+'}';
        }
    },

    /** Convert a decimal to TeX, displaying it as a fraction.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Decimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    rational_decimal: function(n,options) {
        var piD;
        if(this.common_constants.pi && (piD = math.piDegree(n.toNumber())) > 0) {
            n = n.dividedBy(DPI.times(this.common_constants.pi.scale).pow(piD));
        }
        var out = math.niceDecimal(n, Object.assign({}, options, {syntax:'latex'}));
        if(out.length>20 && !this.settings.noscientificnumbers) {
            var bits = math.parseScientific(n.toExponential(), false);
            return bits.significand+' '+this.texTimesSymbol()+' 10^{'+bits.exponent+'}';
        }
        var f = n.toFraction();
        if(f[1].equals(D1)) {
            out = f[0].absoluteValue().toString();
        } else {
            if(this.settings.mixedfractions && f[0].greaterThan(f[1])) {
                var properNumerator = f[0].mod(f[1]);
                var mixedInteger = f[0].minus(properNumerator).dividedBy(f[1]);
                if (this.settings.flatfractions) {
                    out = mixedInteger+'\\; \\left. '+properNumerator+' \\middle/ '+f[1]+' \\right.';
                } else {
                    out = mixedInteger+' \\frac{'+properNumerator+'}{'+f[1]+'}';
                }
            }
            else {
                if (this.settings.flatfractions) {
                    out = '\\left. '+f[0]+' \\middle/ '+f[1]+' \\right.'
                }
                else {
                    out = '\\frac{'+f[0]+'}{'+f[1]+'}';
                }
            }
        }
        if(n.isNegative() && out!='0') {
            out='-'+out;
        }
        var circle_constant_symbol = this.common_constants.pi && this.common_constants.pi.constant.tex;
        switch(piD) {
            case undefined:
            case 0:
                return out;
            case 1:
                if(n.isNegative()) {
                    return '-'+circle_constant_symbol;
                } else {
                    return out+' '+circle_constant_symbol;
                }
            default:
                if(n==-1) {
                    return '-'+circle_constant_symbol+'^{'+piD+'}';
                } else {
                    return out+' '+circle_constant_symbol+'^{'+piD+'}';
                }
        }
    },

    /** Convert a number to TeX, displaying it as a decimal.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    real_number: function(n,options) {
        var piD;
        if(this.common_constants.pi && (piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI*this.common_constants.pi.scale, piD);
        var out = math.niceNumber(n, Object.assign({}, options, {syntax:'latex'}));
        if(out.length>20 && !this.settings.noscientificnumbers) {
            var bits = math.parseScientific(n.toExponential(), false);
            return bits.significand+' '+this.texTimesSymbol()+' 10^{'+bits.exponent+'}';
        }
        var circle_constant_symbol = this.common_constants.pi && this.common_constants.pi.constant.tex;
        switch(piD) {
            case undefined:
            case 0:
                return out;
            case 1:
                if(n==1)
                    return circle_constant_symbol;
                else if(n==-1)
                    return '-'+circle_constant_symbol;
                else
                    return out+' '+circle_constant_symbol;
            default:
                if(n==1)
                    return circle_constant_symbol+'^{'+piD+'}';
                else if(n==-1)
                    return '-'+circle_constant_symbol+'^{'+piD+'}';
                else
                    return out+' '+circle_constant_symbol+'^{'+piD+'}';
        }
    },

    /** Convert a decimal to TeX, displaying it as a decimal.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Decimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    real_decimal: function(n,options) {
        var piD;
        if(this.common_constants.pi && (piD = math.piDegree(n.toNumber())) > 0) {
            n = n.dividedBy(DPI.times(this.common_constants.pi.scale).pow(piD));
        }
        var out = math.niceDecimal(n, Object.assign({}, options, {syntax:'latex'}));
        if(out.length>20 && !this.settings.noscientificnumbers) {
            var bits = math.parseScientific(n.toExponential(), false);
            return bits.significand+' '+this.texTimesSymbol()+' 10^{'+bits.exponent+'}';
        }
        var circle_constant_symbol = this.common_constants.pi && this.common_constants.pi.constant.tex;
        switch(piD) {
            case undefined:
            case 0:
                return out;
            case 1:
                if(n==1)
                    return circle_constant_symbol;
                else if(n==-1)
                    return '-'+circle_constant_symbol;
                else
                    return out+' '+circle_constant_symbol;
            default:
                if(n==1)
                    return circle_constant_symbol+'^{'+piD+'}';
                else if(n==-1)
                    return '-'+circle_constant_symbol+'^{'+piD+'}';
                else
                    return out+' '+circle_constant_symbol+'^{'+piD+'}';
        }
    },
    /** Convert a vector to TeX. If `settings.rowvector` is true, then it's set horizontally.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Array.<number>|Numbas.jme.tree} v
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    texVector: function(v,options) {
        var texifier = this;
        var out;
        var elements;
        if(v.args) {
            elements = v.args.map(function(x){return texifier.render(x)});
        } else {
            elements = v.map(function(x){return texifier.number(x,options)});
        }
        if(this.settings.rowvector) {
            out = elements.join(this.settings.matrixcommas===false ? ' \\quad ' : ' '+Numbas.locale.default_list_separator+' ');
        } else {
            out = '\\begin{matrix} '+elements.join(' \\\\ ')+' \\end{matrix}';
        }
        return out;
    },
    /** Convert a matrix to TeX.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Array.<Array.<number>>|Numbas.jme.tree} m
     * @param {boolean} parens - Enclose the matrix in parentheses?
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {TeX}
     */
    texMatrix: function(m,parens,options) {
        var texifier = this;
        var out;
        if(m.args) {
            var all_lists = true;
            var rows = m.args.map(function(x) {
                if(x.tok.type=='list') {
                    return x.args.map(function(y){ return texifier.render(y); });
                } else {
                    all_lists = false;
                }
            })
            if(!all_lists) {
                return '\\operatorname{matrix}(' + m.args.map(function(x){return texifier.render(x);}).join(Numbas.locale.default_list_separator) +')';
            }
        } else {
            var rows = m.map(function(x) {
                return x.map(function(y) { return texifier.number(y,options) });
            });
        }
        var commas = (rows.length==1 && this.settings.matrixcommas!==false) || this.settings.matrixcommas;
        rows = rows.map(function(x) {
            return x.join((commas ? Numbas.locale.default_list_separator : '')+' & ');
        });
        out = rows.join(' \\\\ ');
        var macro = parens ? 'pmatrix' : 'matrix';
        return '\\begin{'+macro+'} '+out+' \\end{'+macro+'}';
    },

    /** Return the TeX for the multiplication symbol.
     *
     * @returns {TeX}
     */
    texTimesSymbol: function() {
        if(this.settings.timesdot) {
            return '\\cdot';
        } else if(this.settings.timesspace) {
            return '\\,';
        } else {
            return '\\times';
        }
    },

    /** Convert a variable name to TeX.
     *
     * @memberof Numbas.jme.display
     *
     * @param {Numbas.jme.token} tok
     * @param {Function} [longNameMacro=texttt] - Function which returns TeX for a long name.
     * @returns {TeX}
     */
    texName: function(tok,longNameMacro) {
        var name = tok.nameWithoutAnnotation;
        var annotations = tok.annotation;
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

        var nameInfo = tok.nameInfo;
        name = nameInfo.root;
        if(nameInfo.isGreek) {
            name = '\\'+name;
        }
        if(nameInfo.isLong) {
            name = longNameMacro(name);
        } 
        name = applyAnnotations(name);
        if(nameInfo.subscript) {
            var subscript = nameInfo.subscript;
            if(nameInfo.subscriptGreek) {
                subscript = '\\'+subscript;
            }
            name += '_{'+subscript+'}';
        }
        if(nameInfo.primes) {
            name += nameInfo.primes;
        }
        return name;
    },

    texConstant: function(tree) {
        var constantTex;
        var scope = this.scope;
        this.constants.find(function(c) {
            if(c.value === null || c.value === undefined) {
                return false;
            }
            if(util.eq(tree.tok, c.value, scope)) {
                constantTex = c.tex;
                return true;
            }
            if(jme.isType(tree.tok,'number') && jme.isType(c.value,'number') && util.eq(negated(tree.tok),c.value, scope)) {
                constantTex = '-'+c.tex;
                return true;
            }
        });
        return constantTex;
    },

    texOp: function(tree,tok,texArgs) {
        var name = jme.normaliseName(tok.name,this.scope);
        var fn = name in this.texOps ? this.texOps[name] : infixTex('\\, \\operatorname{'+name+'} \\,');
        return fn.call(this,tree,texArgs);
    },

    texFunction: function(tree,tok,texArgs) {
        var normalisedName = jme.normaliseName(tok.name,this.scope);
        if(this.texOps[normalisedName]) {
            return this.texOps[normalisedName].call(this,tree,texArgs);
        } else {
            /** Long operators get wrapped in `\operatorname`.
             *
             * @param {string} name
             * @returns {TeX}
             */
            function texOperatorName(name) {
                return '\\operatorname{'+name.replace(/_/g,'\\_')+'}';
            }
            return this.texName(tok,texOperatorName)+' \\left ( '+texArgs.join(Numbas.locale.default_list_separator+' ')+' \\right )';
        }
    },

    /** Would texify put brackets around a given argument of an operator?
     *
     * @param {Numbas.jme.tree} tree
     * @param {number} i - The index of the argument.
     * @returns {boolean}
     */
    texifyWouldBracketOpArg: function(tree,i) {
        var precedence = jme.precedence;

        var arg = tree.args[i];
        if((jme.isOp(arg.tok,'-u') || jme.isOp(arg.tok,'+u')) && isComplex(arg.args[0].tok)) {
            arg = arg.args[0];
        }
        var tok = arg.tok;

        if(tok.type=='op') {    //if this is an op applied to an op, might need to bracket
            if(tree.args.length==1) {
                return tree.args[0].tok.type=='op' && tree.args[0].args.length>1;
            }
            var op1 = arg.tok.name;    //child op
            var op2 = tree.tok.name;            //parent op
            var p1 = precedence[op1];    //precedence of child op
            var p2 = precedence[op2];    //precedence of parent op
            //if leaving out brackets would cause child op to be evaluated after parent op, or precedences the same and parent op not commutative, or child op is negation and parent is exponentiation
            return ( p1 > p2 || (p1==p2 && i>0 && !jme.commutative[op2]) || (i>0 && (op1=='-u' || op2=='+u') && precedence[op2]<=precedence['*']) )
        }
        //complex numbers might need brackets round them when multiplied with something else or unary minusing
        else if(isComplex(tok) && tree.tok.type=='op' && (tree.tok.name=='*' || tree.tok.name=='-u' || tree.tok.name=='-u' || i==0 && tree.tok.name=='^') ) {
            var v = arg.tok.value;
            return !(v.re==0 || v.im==0);
        } else if(jme.isOp(tree.tok, '^') && this.settings.fractionnumbers && jme.isType(tok,'number') && this.texConstant(arg)===undefined && math.rationalApproximation(Math.abs(tok.value))[1] != 1) {
            return true;
        }
        return false;
    },


    /** Apply brackets to an op argument if appropriate.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Numbas.jme.tree} tree
     * @param {Array.<string>} texArgs - The arguments of `thing`, as TeX.
     * @param {number} i - The index of the argument to bracket.
     * @returns {TeX}
     */
    texifyOpArg: function(tree,texArgs,i) {
        var tex = texArgs[i];
        if(this.texifyWouldBracketOpArg(tree,i)) {
            tex = '\\left ( '+tex+' \\right )';
        }
        return tex;
    }

}
Texifier.prototype.typeToTeX = jme.display.typeToTeX;
Texifier.prototype.texOps = jme.display.texOps;

/** Turn a syntax tree into a TeX string. Data types can be converted to TeX straightforwardly, but operations and functions need a bit more care.
 *
 * The idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX.
 *
 * @memberof Numbas.jme.display
 * @function
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.display.displayer_settings} settings
 * @param {Numbas.jme.Scope} scope
 *
 * @returns {TeX}
 */
var texify = Numbas.jme.display.texify = function(tree,settings,scope)
{
    var texifier = new Texifier(settings,scope);
    return texifier.render(tree);
}

/** Dictionary of functions to turn {@link Numbas.jme.types} objects into JME strings.
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToJME = Numbas.jme.display.typeToJME = {
    'nothing': function(tree,tok,bits) {
        return 'nothing';
    },
    'integer': function(tree,tok,bits) {
        return this.number(tok.value, number_options(tok));
    },
    'rational': function(tree,tok,bits) {
        var value = tok.value.reduced();
        const options = number_options(tok);
        var numerator = this.number(value.numerator, options);
        if(value.denominator == 1) {
            return numerator;
        } else {
            return numerator + '/' + this.number(value.denominator, options);
        }
    },
    'decimal': function(tree,tok,bits) {
        return this.decimal(tok.value, number_options(tok));
    },
    'number': function(tree,tok,bits,settings) {
        return this.number(tok.value, number_options(tok));
    },
    name: function(tree,tok,bits) {
        return tok.name;
    },
    'string': function(tree,tok,bits) {
        return this.string(tok.value, string_options(tok));
    },
    html: function(tree,tok,bits) {
        var html = tok.html.replace(/"/g,'\\"');
        return 'html(safe("'+html+'"))';
    },
    'boolean': function(tree,tok,bits) {
        return (tok.value ? 'true' : 'false');
    },
    range: function(tree,tok,bits) {
        return tok.value[0]+'..'+tok.value[1]+(tok.value[2]==1 ? '' : '#'+tok.value[2]);
    },
    list: function(tree,tok,bits) {
        var jmeifier = this;
        if(!bits) {
            if(tok.value) {
                bits = tok.value.map(function(b){return jmeifier.render({tok:b});});
            }
            else {
                bits = [];
            }
        }
        return '[ '+bits.join(', ')+' ]';
    },
    keypair: function(tree,tok,bits) {
        var key = this.typeToJME['string'].call(this,null,{value:tok.key},[]);
        var arg = bits[0];
        if(tree.args[0].tok.type=='op') {
            arg = '( '+arg+' )';
        }
        return key+': '+arg;
    },
    dict: function(tree,tok,bits) {
        if(!bits) {
            bits = [];
            if(tok.value) {
                for(var key in tok.value) {
                    bits.push(this.render({tok: new jme.types.TKeyPair(key), args:[{tok:tok.value[key]}]}));
                }
            }
        }
        if(bits.length) {
            return '[ '+bits.join(', ')+' ]';
        } else {
            return 'dict()';
        }
    },
    vector: function(tree,tok,bits) {
        var jmeifier = this;
        return 'vector('+tok.value.map(function(n){ return jmeifier.number(n, number_options(tok))}).join(',')+')';
    },
    matrix: function(tree,tok,bits) {
        var jmeifier = this;
        return 'matrix('+
            tok.value.map(function(row){return '['+row.map(function(n){ return jmeifier.number(n, number_options(tok))}).join(',')+']'}).join(',')
            +')';
    },
    'function': function(tree,tok,bits) {
        if(tok.name in jmeFunctions) {
            return this.jmeFunctions[tok.name].call(this,tree,tok,bits);
        }
        if(!bits) {
            return tok.name+'()';
        } else {
            return tok.name+'('+bits.join(',')+')';
        }
    },
    op: function(tree,tok,bits) {
        var op = tok.name;
        var args = tree.args;
        var bracketed = [];
        for(var i=0;i<args.length;i++) {
            var arg = args[i].tok;
            var isNumber = jme.isType(arg,'number');
            var arg_type = arg.type;
            var arg_value = arg.value;
            var pd;
            var arg_op = null;
            if(arg_type=='op') {
                arg_op = args[i].tok.name;
            } else if(isNumber) {
                if(isComplex(arg)) {
                    if(arg_value.re!=0) {
                        arg_op = arg_value.im<0 ? '-' : '+';   // implied addition/subtraction because this number will be written in the form 'a+bi'
                    } else if(i==0 || arg_value.im!=1) {
                        arg_op = '*';   // implied multiplication because this number will be written in the form 'bi'
                    }
                } else if(isNegative(arg)) {
                    arg_op = '-u';
                } else if(bits[i].indexOf('*')>=0 || (this.common_constants.pi && (pd = math.piDegree(args[i].tok.value))>0 && arg_value/math.pow(Math.PI*this.common_constants.pi.scale,pd)>1)) {
                    arg_op = '*';   // implied multiplication because this number will be written in the form 'a*pi'
                } else if(bits[i].indexOf('/')>=0) {
                    arg_op = '/';   // implied division because this number will be written in the form 'a/b'
                }
            }
            var bracketArg = false;
            if(arg_op!=null) {
                if((jme.isOp(arg,'-u') || jme.isOp(arg,'+u')) && isComplex(args[i].args[0].tok)) {
                    arg_op = '+';
                }
                var j = i>0 ? 1 : 0;
                if(op in opBrackets) {
                    bracketArg = opBrackets[op][j][arg_op]==true || (tok.prefix && opBrackets[op][j][arg_op]===undefined);
                } else {
                    bracketArg = tok.prefix==true || tok.postfix==true;
                }
            }
            bracketed[i] = bracketArg;
            if(bracketArg) {
                bits[i] = '('+bits[i]+')';
            }
        }
        var symbol = ' ';
        if(this.jmeOpSymbols[op]!==undefined) {
            symbol = this.jmeOpSymbols[op];
        } else if(args.length>1 && op.length>1) {
            symbol = ' '+op+' ';
        } else {
            symbol = op;
        }
        switch(op) {
        case '-u':
            if(isComplex(args[0].tok)) {
                return this.number(negated(args[0].tok), number_options(args[0].tok));
            }
            break;
        case '-':
            if(isComplex(args[1].tok) && hasRealPart(args[1].tok)) {
                bits[1] = this.number(conjugate(args[1].tok), number_options(args[1].tok));
            }
            break;
        case '*':
            //omit multiplication symbol when not necessary
            var s = bits[0];
            for(var i=1;i<args.length;i++) {
                //number or brackets followed by name or brackets doesn't need a times symbol
                //except <anything>*(-<something>) does
                var use_symbol = true;
                if(
                    !this.settings.alwaystimes && 
                    ((jme.isType(args[i-1].tok,'number') && bits[i-1].match(/\d$/)) || bracketed[i-1]) &&
                    (jme.isType(args[i].tok,'name') || bracketed[i] && !(jme.isOp(tree.args[i].tok,'-u') || jme.isOp(tree.args[i].tok,'+u'))) 
                ) {
                    use_symbol = false;
                }
                if(use_symbol) {
                    s += symbol;
                }
                s += bits[i];
            }
            return s;
        }
        if(args.length==1) {
            return tok.postfix ? bits[0]+symbol : symbol+bits[0];
        } else {
            return bits[0]+symbol+bits[1];
        }
    },
    set: function(tree,tok,bits) {
        var jmeifier = this;
        return 'set('+tok.value.map(function(tree){return jmeifier.render({tok:tree});}).join(',')+')';
    },
    expression: function(tree,tok,bits) {
        var expr = this.render(tok.tree);
        if(this.settings.wrapexpressions) {
            expr = 'expression("'+jme.escape(expr)+'")';
        }
        return expr;
    },
    'lambda': function(tree, tok, bits) {
        var names = tok.names.map(name => this.render(name)).join(', ');
        if(names.length != 1) {
            names = '(' + names + ')';
        }
        var expr = this.render(tok.expr);
        return '('+names + ' -> ' + expr+')';
    },
}

/** Register a new data type with the displayers. 
 *
 * @param {Function} type - The constructor for the type. `type.prototype.type` must be a string giving the type's name.
 * @param {object} renderers - A dictionary of rendering functions, with keys `tex`, `jme` and `displayString`.
 *
 * @see Numbas.jme.display.typeToTeX
 * @see Numbas.jme.display.typeToJME
 * @see Numbas.jme.typeToDisplayString
 */
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
    'fact': function(tree,tok,bits) {
        if(jme.isType(tree.args[0].tok,'number') || tree.args[0].tok.type=='name') {
            return bits[0]+'!';
        } else {
            return '( '+bits[0]+' )!';
        }
    },
    'listval': function(tree,tok,bits) {
        return bits[0]+'['+bits[1]+']';
    }
}

/** A dictionary of settings for {@link Numbas.jme.display.treeToJME}.
 *
 * @typedef Numbas.jme.display.jme_display_settings
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} niceNumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {boolean} wrapexpressions - Wrap TExpression tokens in `expression("")`?
 * @property {boolean} store_precision - Render numbers along with their precision metadata, if any?
 * @property {boolean} ignorestringattributes - Don't wrap strings in functions for attributes like latex() and safe().
 * @property {boolean} matrixcommas - Put commas between cells in matrix rows?
 * @property {number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 */

/** Turn a syntax tree back into a JME expression (used when an expression is simplified).
 *
 * @memberof Numbas.jme.display
 * @function
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.display.jme_display_settings} settings
 * @param {Numbas.jme.Scope} scope
 * @returns {JME}
 */
var treeToJME = jme.display.treeToJME = function(tree,settings,scope) {
    var jmeifier = new JMEifier(settings,scope);
    return jmeifier.render(tree);
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
    '+u':[{'+':true,'-':true,'*':false,'/':false}],
    '-u':[{'+':true,'-':true,'*':false,'/':false}],
    '+': [{},{}],
    '-': [{},{'+':true,'-':true}],
    '*': [{'+u':true,'+':true, '-':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '/':true}],
    '/': [{'+u':true,'+':true, '-':true, '*':false},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
    '^': [{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true, '^': true},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
    'and': [{'or':true, 'xor':true},{'or':true, 'xor':true}],
    'not': [{'and':true,'or':true,'xor':true}],
    'or': [{'xor':true},{'xor':true}],
    'xor':[{},{}],
    '=': [{},{}]
};

/** How to render operator symbols as JME.
 *
 * See `Numbas.jme.display.typeToJME.op`.
 *
 * @enum
 * @memberof Numbas.jme.display
 * @private
 */
var jmeOpSymbols = Numbas.jme.display.jmeOpSymbols = {
    '+u': '+',
    '-u': '-',
    'not': 'not ',
    'fact': '!',
    '+': ' + ',
    '-': ' - '
}

/** An object which can convert a JME tree into a string of JME code.
 *
 * @augments Numbas.jme.display.JMEDisplayer
 * @memberof Numbas.jme.display
 */
var JMEifier = jme.display.JMEifier = util.extend(JMEDisplayer, function() {});
JMEifier.prototype = {
    __proto__: JMEDisplayer.prototype,

    render: function(tree) {
        var jmeifier = this;
        if(!tree) {
            return '';
        }

        if(jme.isOp(tree.tok,'*')) {
            // flatten nested multiplications, so a string of consecutive multiplications can be considered together
            tree = {tok: tree.tok, args: flatten(tree,'*')};
        }

        var bits;
        if(tree.args !== undefined) {
            bits = tree.args.map(function(i){return jmeifier.render(i)});
        } else {
            var constant = this.constant(tree);
            if(constant) {
                return constant;
            }
        }
        var tok = tree.tok;
        if(tok.type in this.typeToJME) {
            return this.typeToJME[tok.type].call(this,tree,tok,bits);
        } else {
            throw(new Numbas.Error(R('jme.display.unknown token type',{type:tok.type})));
        }
    },

    constant: function(tree) {
        var constantJME;
        var scope = this.scope;
        this.constants.find(function(c) {
            if(c.value === null) {
                return false;
            }
            if(util.eq(c.value, tree.tok, scope)) {
                constantJME = c.name;
                return true;
            }
            if(jme.isType(tree.tok,'number') && jme.isType(c.value,'number') && util.eq(c.value, negated(tree.tok), scope)) {
                constantJME = '-'+c.name;
                return true;
            }
        });
        return constantJME;
    },

    string: function(s, options) {
        options = options || {};

        var str = '"'+jme.escape(s)+'"';

        if(options.latex && !this.settings.ignorestringattributes) {
            return 'latex('+str+')';
        } else if(options.safe && !this.settings.ignorestringattributes) {
            return 'safe('+str+')';
        } else {
            return str;
        }
    },

    complex_number: function(n,options) {
        var imaginary_unit = 'sqrt(-1)';
        if(this.common_constants.imaginary_unit) {
            imaginary_unit = this.common_constants.imaginary_unit.name;
        }
        options = Object.assign({},options,{store_precision:false});
        var re = this.number(n.re, options);
        var im = this.number(n.im, options);
        im += (im.match(/\d$/) ? '' : '*') + imaginary_unit;
        if(Math.abs(n.im)<1e-15) {
            return re;
        } else if(n.re==0) {
            if(n.im==1) {
                return imaginary_unit;
            } else if(n.im==-1) {
                return '-' + imaginary_unit;
            } else {
                return im;
            }
        } else if(n.im<0) {
            if(n.im==-1) {
                return re + ' - ' + imaginary_unit;
            } else {
                return re + ' - ' + im.slice(1);
            }
        } else {
            if(n.im==1) {
                return re + ' + ' + imaginary_unit;
            } else {
                return re + ' + ' + im;
            }
        }
    },

    /** Call {@link Numbas.math.niceNumber} with the scope's symbols for the imaginary unit and circle constant.
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {string}
     */
    niceNumber: function(n,options) {
        options = options || {};
        if(this.common_constants.imaginary_unit) {
            options.imaginary_unit = this.common_constants.imaginary_unit.name;
        }
        if(this.common_constants.pi) {
            options.circle_constant = {
                scale: this.common_constants.pi.scale,
                symbol: this.common_constants.pi.constant.name
            };
        }
        if(this.common_constants.infinity) {
            options.infinity = this.common_constants.infinity.name;
        }
        return math.niceNumber(n,options);
    },

    /** Call {@link Numbas.math.niceNumber} with the scope's symbols for the imaginary unit and circle constant.
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {string}
     */
    niceDecimal: function(n, options) {
        options = options || {};
        if(this.common_constants.imaginary_unit) {
            options.imaginary_unit = this.common_constants.imaginary_unit.name;
        }
        if(this.common_constants.pi) {
            options.circle_constant = {
                scale: this.common_constants.pi.scale,
                symbol: this.common_constants.pi.constant.name
            };
        }
        if(this.common_constants.infinity) {
            options.infinity = this.common_constants.infinity.name;
        }
        return math.niceComplexDecimal(n,options);
    },

    /** Write a number in JME syntax as a fraction, using {@link Numbas.math.rationalApproximation}.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {JME}
     */
    rational_number: function(n,options) {
        var piD;
        if(isNaN(n)) {
            return 'NaN';
        }
        var circle_constant_symbol = this.common_constants.pi && this.common_constants.pi.constant.name;
        if(this.common_constants.pi && (piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI*this.common_constants.pi.scale, piD);
        var out;
        if(this.settings.nicenumber===false) {
            out = n+'';
        } else {
            out = this.niceNumber(n,options);
        }
        if(out.length>20 && !this.settings.noscientificnumbers) {
            var bits = math.parseScientific(n.toExponential(), false);
            return bits.significand+'*10^('+bits.exponent+')';
        }
        var f = math.rationalApproximation(Math.abs(n),this.settings.accuracy);
        if(f[1]==1)
            out = Math.abs(f[0]).toString();
        else
            out = f[0]+'/'+f[1];
        if(n<0 && out!='0')
            out='-'+out;
        switch(piD) {
            case undefined:
            case 0:
                return out;
            case 1:
                return out+' '+circle_constant_symbol;
            default:
                return out+' '+circle_constant_symbol+'^'+piD;
        }
    },

    /** Write a number in JME syntax as a decimal.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {number} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {JME}
     */
    real_number: function(n, options) {
        var piD;
        if(isNaN(n)) {
            return 'NaN';
        }
        options = options || {};
        if(this.common_constants.pi && (piD = math.piDegree(n,false)) > 0)
            n /= Math.pow(Math.PI*this.common_constants.pi.scale, piD);
        var out;
        if(this.settings.nicenumber===false) {
            out = n+'';
            if(out.match(/e/)) {
                out = math.unscientific(out);
            }
            var precision = options.precision === undefined ? 'nothing' : options.precision;
            var precisionType = options.precisionType === undefined ? 'nothing' : this.string(options.precisionType,{});
            var store_precision = options.store_precision === undefined ? this.settings.store_precision : options.store_precision;
            if(store_precision) {
                if(precision == 'nothing' && precisionType == 'nothing') {
                    out = 'imprecise('+out+')';
                } else {
                    out = 'with_precision('+out+', ' + precision + ', '+ precisionType +')';
                }
                return out;
            }
        } else {
            out = this.niceNumber(n,Object.assign({},options,{style:'plain'}));
        }
        if(Math.abs(n)<1e-15) {
            if(this.settings.nicenumber===false) {
                return '0';
            } else {
                return this.niceNumber(0,options);
            }
        }
        if(out.length>20 && !this.settings.noscientificnumbers) {
            var bits = math.parseScientific(n.toExponential(), false);
            return bits.significand+'*10^('+bits.exponent+')';
        }
        var circle_constant_symbol = this.common_constants.pi && this.common_constants.pi.constant.name;
        switch(piD) {
            case undefined:
            case 0:
                return out;
            case 1:
                if(n==1) {
                    return circle_constant_symbol;
                } else if(n==-1) {
                    return '-'+circle_constant_symbol;
                } else {
                    return out+' '+circle_constant_symbol;
                }
            default:
                if(n==1) {
                    return circle_constant_symbol+'^'+piD;
                } else if(n==-1) {
                    return '-'+circle_constant_symbol+'^'+piD;
                } else {
                    return out+' '+circle_constant_symbol+'^'+piD;
                }
        }
    },

    /** Write a {@link Numbas.jme.math.ComplexDecimal} in JME syntax.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Numbas.math.ComplexDecimal|Decimal} n
     * @param {Numbas.math.niceNumber_settings} options
     * @returns {JME}
     */
    decimal: function(n, options) {
        if(n instanceof Numbas.math.ComplexDecimal) {
            var re = this.decimal(n.re,options);
            if(n.isReal()) {
                return re;
            } 
            var imaginary_unit = 'sqrt(-1)';
            if(this.common_constants.imaginary_unit) {
                imaginary_unit = this.common_constants.imaginary_unit.name;
            }
            var im = this.decimal(n.im,options)+'*'+imaginary_unit;
            if(n.re.isZero()) {
                if(n.im.eq(1)) {
                    return imaginary_unit;
                } else if(n.im.eq(-1)) {
                    return '-'+imaginary_unit;
                } else {
                    return im;
                }
            } else if(n.im.lt(0)) {
                if(n.im.eq(-1)) {
                    return re+' - '+imaginary_unit;
                } else {
                    return re+' - '+im.replace(/^(dec\(\")?\-/,'$1');
                }
            } else {
                if(n.im.eq(1)) {
                    return re+' + '+imaginary_unit;
                } else {
                    return re+' + '+im;
                }
            }
        } else if(n instanceof Decimal) {
            var out = math.niceDecimal(n, Object.assign({}, this.settings.plaindecimal ? {} : options, {style: 'plain'}));
            if(this.settings.plaindecimal) {
                return out;
            } else { 
                if(out.length > 20) {
                    out = n.toExponential().replace(/e\+0$/,'');
                }
                return 'dec("'+out+'")';
            }
        } else {
            return this.number(n,options);
        }
    }

}
JMEifier.prototype.typeToJME = typeToJME;
JMEifier.prototype.jmeOpSymbols = jmeOpSymbols;
JMEifier.prototype.jmeFunctions = jmeFunctions;


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
Numbas.queueScript('jme-variables',['base','jme-base','util'],function() {
var jme = Numbas.jme;
var sig = jme.signature;
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
        var external_vars = jme.findvars(fn.tree,fn.paramNames.map(function(v) { return jme.normaliseName(v,scope) }),scope);
        jme.findvarsOps[fn.name] = function(tree,boundvars,scope) {
            var vars = external_vars.slice();
            for(var i=0;i<tree.args.length;i++) {
                vars = vars.merge(jme.findvars(tree.args[i],boundvars,scope));
            }
            return vars;
        }
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
        var env_args = Object.entries(withEnv).map(([name,v]) => {
            paramNames.push(name);
            return v;
        });
        delete jme.findvarsOps[fn.name];
        try {
            var jfn = new Function(paramNames,fn.definition);
        } catch(e) {
            throw(new Numbas.Error('jme.variables.syntax error in function definition'));
        }
        return function(args,scope) {
            if(fn.definition.match(/variables/)) {
                // backwards-compatibility hack for functions that try to access scope.variables.varname
                // instead of scope.getVariable(varname)
                scope = new Numbas.jme.Scope([scope]);
                scope.flatten();
            }
            args = args.map(function(a){return jme.unwrapValue(a)});
            args.push(scope);
            args = args.concat(env_args);
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
     * @param {Numbas.jme.variables.func_data} def - Contains `definition`, `name`, `language`, `parameters`.
     * @param {Numbas.jme.Scope} scope
     * @param {object} withEnv - Dictionary of local variables for javascript functions.
     * @returns {Numbas.jme.funcObj}
     */
    makeFunction: function(def,scope,withEnv) {
        var intype = [],
            paramNames = [];
        def.parameters.map(function(p) {
            intype.push(p.type);
            paramNames.push(p.name);
        });
        var outcons = jme.types[def.outtype];
        var fn = new jme.funcObj(def.name,intype,outcons,null,true);
        fn.paramNames = paramNames;
        fn.definition = def.definition;
        fn.name = jme.normaliseName(def.name,scope);
        fn.language = def.language;
        try {
            switch(fn.language)
            {
            case 'jme':
                fn.evaluate = jme.variables.makeJMEFunction(fn,scope);
                break;
            case 'javascript':
                fn.evaluate = jme.variables.makeJavascriptFunction(fn,withEnv);
                break;
            default:
                throw(new Numbas.Error('jme.variables.invalid function language',{language: fn.language}));
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
     * @returns {Object<Numbas.jme.funcObj>}
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
        var originalName = (todo[name] && todo[name].originalName) || name;
        var existing_value = scope.getVariable(name);
        if(existing_value!==undefined) {
            return existing_value;
        }
        if(path===undefined) {
            path=[];
        }
        computeFn = computeFn || jme.variables.computeVariable;
        if(name=='') {
            throw(new Numbas.Error('jme.variables.empty name'));
        }
        if(path.contains(name))
        {
            throw(new Numbas.Error('jme.variables.circular reference',{name:name,path:path}));
        }
        var v = todo[name];
        if(v===undefined) {
            var c = scope.getConstant(name);
            if(c) {
                return c.value;
            }
            throw(new Numbas.Error('jme.variables.variable not defined',{name:name}));
        }
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
            throw(new Numbas.Error('jme.variables.empty definition',{name: originalName}));
        }
        try {
            var value = jme.evaluate(v.tree,scope);
            if(v.names) {
                value = jme.castToType(value,'list');
            }
            scope.setVariable(name,value);
        } catch(e) {
            throw(new Numbas.Error('jme.variables.error evaluating variable',{name:originalName,message:e.message},e));
        }
        return value;
    },

    /** Split up a list of variable names separated by commas, for destructuring assignment.
     *
     * @param {string} s
     * @returns {Array.<string>}
     */
    splitVariableNames: function(s) {
        return s.split(/\s*,\s*/).filter(function(n) { return n.trim(); })
    },
    /**
     * Evaluate dictionary of variables.
     *
     * @param {Numbas.jme.variables.variable_data_dict} todo - Dictionary of variables mapped to their definitions.
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.tree} condition - Condition on the values of the variables which must be satisfied.
     * @param {Function} computeFn - A function to compute a variable. Default is Numbas.jme.variables.computeVariable.
     * @param {Array.<string>} targets - Variables which must be re-evaluated, even if they're already present in the scope.
     * @returns {object} - `variables`: a dictionary of evaluated variables, and `conditionSatisfied`: was the condition satisfied?
     */
    makeVariables: function(todo,scope,condition,computeFn,targets)
    {
        var multis = {};
        var multi_acc = 0;
        var ntodo = {};
        Object.keys(todo).forEach(function(name) {
            var names = jme.variables.splitVariableNames(name);
            if(names.length==0) {
                return;
            }
            if(names.length>1) {
                var mname;
                while(true) {
                    mname = '$multi_'+(multi_acc++);
                    if(todo[mname]===undefined) {
                        break;
                    }
                }
                multis[mname] = name;
                ntodo[mname] = todo[name];
                ntodo[mname].names = names;
                ntodo[mname].originalName = name;
                names.forEach(function(sname,i) {
                    ntodo[sname] = {
                        tree: jme.compile(mname+'['+i+']'),
                        vars: [mname]
                    }
                });
            } else {
                ntodo[name] = todo[name];
            }
        });
        todo = ntodo;
        computeFn = computeFn || jme.variables.computeVariable;
        var conditionSatisfied = true;
        if(condition) {
            var condition_vars = jme.findvars(condition,[],scope);
            condition_vars.map(function(v) {
                computeFn(v,todo,scope,undefined,computeFn);
            });
            conditionSatisfied = jme.evaluate(condition,scope).value;
        }
        if(conditionSatisfied) {
            if(!targets) {
                targets = Object.keys(todo);
            }
            targets.forEach(function(x) {
                computeFn(x,todo,scope,undefined,computeFn);
            });
        }
        var variables = scope.variables;
        Object.keys(multis).forEach(function(mname) {
            variables[multis[mname]] = variables[mname];
            delete variables[mname];
        });
        return {variables: variables, conditionSatisfied: conditionSatisfied, scope: scope};
    },

    /**
     * Remake a dictionary of variables, only re-evaluating variables which depend on the changed_variables.
     * A new scope is created with the values from `changed_variables`, and then the dependent variables are evaluated in that scope.
     *
     * @param {Numbas.jme.variables.variable_data_dict} todo - Dictionary of variables mapped to their definitions.
     * @param {Object<Numbas.jme.token>} changed_variables - Dictionary of changed variables. These will be added to the scope, and will not be re-evaluated.
     * @param {Numbas.jme.Scope} scope
     * @param {Function} [computeFn] - A function to compute a variable. Default is Numbas.jme.variables.computeVariable.
     * @param {Array.<string>} targets - Variables which must be re-evaluated, even if they're already present in the scope.
     * @returns {Numbas.jme.Scope}
     */
    remakeVariables: function(todo,changed_variables,scope,computeFn,targets) {
        var scope = new Numbas.jme.Scope([scope, {variables: changed_variables}]);
        var replaced = Object.keys(changed_variables);
        // find dependent variables which need to be recomputed
        var dependents_todo = jme.variables.variableDependants(todo,replaced,scope);
        for(var name in dependents_todo) {
            if(name in changed_variables) {
                delete dependents_todo[name];
            } else {
                var names = jme.variables.splitVariableNames(name);
                for(let sname of names) {
                    scope.deleteVariable(sname);
                }
            }
        }
        if(targets) {
            targets.forEach(function(name) {
                scope.deleteVariable(name);
            });
        }
        for(var name in todo) {
            if(name in dependents_todo) {
                continue;
            }
            if(scope.getVariable(name)===undefined) {
                dependents_todo[name] = todo[name];
            }
        }
        // compute those variables
        var nv = jme.variables.makeVariables(dependents_todo,scope,null,computeFn,targets);
        scope = new Numbas.jme.Scope([scope,{variables:nv.variables}]);
        return scope;
    },

    /** Collect together a ruleset, evaluating all its dependencies first.
     *
     * @param {string} name - The name of the ruleset to evaluate.
     * @param {Object<string[]>} todo - Dictionary of rulesets still to evaluate.
     * @param {Numbas.jme.Scope} scope
     * @param {string[]} path - Breadcrumbs - Rulesets names currently being evaluated, so we can detect circular dependencies.
     * @returns {Numbas.jme.rules.Ruleset}
     */
    computeRuleset: function(name,todo,scope,path) {
        var existing_ruleset = scope.getRuleset(jme.normaliseName(name,scope));
        if(existing_ruleset) {
            return existing_ruleset;
        }
        if(jme.normaliseName(name,scope) in jme.displayFlags) {
            return undefined;
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
     * @param {Object<string[]>} todo - A dictionary mapping ruleset names to definitions.
     * @param {Numbas.jme.Scope} scope - The scope to gather the rulesets in. The rulesets are added to this scope as a side-effect.
     * @returns {Object<Numbas.jme.rules.Ruleset>} A dictionary of rulesets.
     */
    makeRulesets: function(todo,scope) {
        var out = {};
        for(var name in todo) {
            out[name] = jme.variables.computeRuleset(name,todo,scope,[]);
        }
        return out;
    },

    /** Add a list of constants to the scope.
     *
     * @param {Array.<Numbas.jme.constant_definition>} definitions
     * @param {Numbas.jme.Scope} scope
     * @param {Object.<boolean>} enabled - For each constant name, is it enabled? If not given, then the `enabled` value in the definition is used.
     * @returns {Array.<string>} - The names of constants added to the scope.
     */
    makeConstants: function(definitions, scope, enabled) {
        var defined_names = [];
        definitions.forEach(function(def) {
            var names = def.name.split(/\s*,\s*/);
            var value = def.value;
            if(typeof value != 'object') {
                value = scope.evaluate(value+'');
            }
            names.forEach(function(name) {
                var def_enabled = def.enabled === undefined || def.enabled;
                var q_enabled = enabled !== undefined && (enabled[name] || (enabled[name]===undefined && def_enabled));
                if(!(enabled===undefined ? def_enabled : q_enabled)) {
                    scope.deleteConstant(name);
                    return;
                }
                defined_names.push(jme.normaliseName(name,scope));
                scope.setConstant(name,{value:value, tex:def.tex});
            });
        });
        return defined_names
    },
    /** Given a todo dictionary of variables, return a dictionary with only the variables depending on the given list of variables.
     *
     * @param {object} todo - Dictionary of variables mapped to their definitions.
     * @param {string[]} ancestors - List of variable names whose dependants we should find.
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {object} - A copy of the todo list, only including the dependants of the given variables.
     */
    variableDependants: function(todo,ancestors,scope) {
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
                var ancestor = jme.normaliseName(ancestors[i],scope)
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
     * @returns {Element}
     */
    DOMcontentsubvars: function(element, scope) {
        var subber = new DOMcontentsubber(scope);
        return subber.subvars(element);
    },
    /** Substitute variables into the contents of a text node. Substituted values might contain HTML elements, so the return value is a collection of DOM elements, not another string.
     *
     * @param {string} str - The contents of the text node.
     * @param {Numbas.jme.Scope} scope
     * @param {Document} doc - The document the text node belongs to.
     * @returns {Array.<Array.<Node>>} - Array of DOM nodes to replace the string with.
     */
    DOMsubvars: function(str,scope,doc) {
        doc = doc || document;
        var bits = util.splitbrackets(str,'{','}','(',')');
        if(bits.length==1) {
            return [[doc.createTextNode(str)]];
        }
        /** Get HTML content for a given JME token.
         *
         * @param {Numbas.jme.token} token
         * @returns {Element|string}
         */
        function doToken(token) {
            if(jme.isType(token,'html')) {
                token = jme.castToType(token,'html');
                if(token.value.numbas_embedded) {
                    throw(new Numbas.Error('jme.subvars.html inserted twice'))
                }
                token.value.numbas_embedded = true;
                return token.value;
            } else if(jme.isType(token,'string')) {
                token = jme.castToType(token,'string');
                var html = token.value;
                if(!token.safe) {
                    html = html.replace(/\\([{}])/g,'$1');
                }
                if(token.latex && token.display_latex) {
                    html = '\\('+html+'\\)';
                }
                return html;
            } else if(jme.isType(token,'list')) {
                token = jme.castToType(token,'list');
                return '[ '+token.value.map(function(item){return doToken(item)}).join(', ')+' ]';
            } else {
                return jme.tokenToDisplayString(token,scope);
            }
        }
        var out = [];
        for(var i=0; i<bits.length; i++) {
            if(i % 2) {
                try {
                    var tree = jme.compile(bits[i]);
                } catch(e) {
                    throw(new Numbas.Error('jme.subvars.error compiling',{message: e.message, expression: bits[i]},e));
                }
                var v = scope.evaluate(tree);
                if(v===null) {
                    throw(new Numbas.Error('jme.subvars.null substitution',{str:bits[i]}));
                }
                v = doToken(v);
            } else {
                v = bits[i];
            }
            if(typeof v == 'string') {
                if(out.length>0 && typeof out[out.length-1]=='string') {
                    out[out.length-1]+=v;
                } else {
                    out.push(v);
                }
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
                out[i] = Array.from(d.childNodes);
            }
        }
        return out;
    }
};

/** A definition of a note.
 *
 * The note's name, followed by an optional description enclosed in parentheses, then a colon, and finally a {@link JME} expression to evaluate.
 *
 * @typedef {string} Numbas.jme.variables.note_definition
 */


var re_note = /^(\$?[a-zA-Z_][a-zA-Z0-9_]*'*)(?:\s*\(([^)]*)\))?\s*:\s*((?:.|\n)*)$/m;

/** A note forming part of a notes script.
 *
 * @memberof Numbas.jme.variables
 * @class
 *
 * @property {string} name
 * @property {string} description
 * @property {Numbas.jme.variables.note_definition} expr - The JME expression to evaluate to compute this note.
 * @property {Numbas.jme.tree} tree - The compiled form of the expression.
 * @property {string[]} vars - The names of the variables this note depends on.
 *
 * @param {JME} source
 * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
 * 
 */
var ScriptNote = jme.variables.ScriptNote = function(source,scope) {
    source = source.trim();
    var m = re_note.exec(source);
    if(!m) {
        var hint;
        if(/^[a-zA-Z_][a-zA-Z0-9+]*'*(?:\s*\(([^)]*)\))?$/.test(source)) {
            hint = R('jme.script.note.invalid definition.missing colon');
        } else if(/^[a-zA-Z_][a-zA-Z0-9+]*'*\s*\(/.test(source)) {
            hint = R('jme.script.note.invalid definition.description missing closing bracket');
        }
        throw(new Numbas.Error("jme.script.note.invalid definition",{source: source, hint: hint}));
    }
    this.name = m[1];
    this.description = m[2];
    this.expr = m[3];
    if(!this.expr) {
        throw(new Numbas.Error("jme.script.note.empty expression",{name:this.name}));
    }
    try {
        this.tree = jme.compile(this.expr);
    } catch(e) {
        throw(new Numbas.Error("jme.script.note.compilation error",{name:this.name, message:e.message}));
    }
    this.vars = jme.findvars(this.tree, [], scope);
}

/** Create a constructor for a notes script.
 *
 * @param {Function} construct_scope - A function which takes a base scope and a dictionary of variables, and returns a new scope in which to evaluate notes.
 * @param {Function} process_result - A function which takes the result of evaluating a note, and a scope, and returns a potentially modified result.
 * @param {Function} compute_note - A function which computes a note.
 *
 * @returns {Function}
 */
jme.variables.note_script_constructor = function(construct_scope, process_result, compute_note) {
    construct_scope = construct_scope || function(scope,variables) {
        return new jme.Scope([scope,{variables:variables}]);
    };

    process_result = process_result || function(r) { return r; }
    /**
     * A notes script.
     *
     * @param {string} source - The source of the script.
     * @param {Numbas.jme.variables.Script} base - A base script to extend.
     * @param {Numbas.jme.Scope} scope
     * @memberof Numbas.jme.variables
     * @class
     */
    function Script(source, base, scope) {
        this.source = source;
        try {
            var notes = source.split(/\n(\s*\n)+/);
            var ntodo = {};
            var todo = {};
            notes.forEach(function(note) {
                if(note.trim().length) {
                    var res = new ScriptNote(note, scope);
                    var name = jme.normaliseName(res.name, scope);
                    ntodo[name] = todo[name] = res;
                }
            });
            if(base) {
                Object.keys(base.notes).forEach(function(name) {
                    if(name in ntodo) {
                        todo['base_'+name] = base.notes[name];
                    } else {
                        todo[name] = base.notes[name];
                    }
                });
            }
        } catch(e) {
            throw(new Numbas.Error("jme.script.error parsing notes",{message:e.message}));
        }
        this.notes = todo;
    }
    Script.prototype = /** @lends Numbas.jme.variables.Script.prototype */ {

        /** The source code of the script.
         *
         * @type {string}
         */
        source: '',


        construct_scope: function(scope,variables) {
            scope = construct_scope(scope,variables);

            // if any names used by notes are already defined as variables in this scope, delete them
            Object.keys(this.notes).forEach(function(name) {
                if(variables[name] === undefined) {
                    scope.deleteVariable(name);
                }
            });
            return scope;
        },

        /** Evaluate all of this script's notes in the given scope.
         *
         * @param {Numbas.jme.Scope} scope
         * @param {Object<Numbas.jme.token>} variables - Extra variables defined in the scope.
         *
         * @returns {object}
         */
        evaluate: function(scope, variables) {
            scope = this.construct_scope(scope,variables);

            var result = jme.variables.makeVariables(this.notes,scope,null,compute_note);
            return process_result(result,scope);
        },

        evaluate_note: function(note, scope, changed_variables) {
            changed_variables = changed_variables || {};
            var nscope = construct_scope(scope);
            var result = jme.variables.remakeVariables(this.notes,changed_variables,nscope,compute_note,[note]);
            for(var name in result.variables) {
                nscope.setVariable(name,result.variables[name]);
            }
            return {value: result.variables[note], scope: nscope};
        }
    }

    return Script
}


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
     * @returns {Element}
     */
    subvars: function(element) {
        try {
            switch(element.nodeType) {
                case 1: //element
                    element = this.sub_element(element);
                    break;
                case 3: //text
                    element = this.sub_text(element);
                    break;
                default:
                    return element;
            }
        } catch(error) {
            error.element = error.element || element;
            throw(error);
        }
        return element;
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
                if(element.hasAttribute('alt')) {
                    object.setAttribute('aria-label', element.getAttribute('alt'));
                }
                if(element.parentElement) {
                    element.parentElement.replaceChild(object,element);
                }
                subber.sub_element(object);
                return object;
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
            return element;
        }
        if(element.hasAttribute('data-jme-visible')) {
            var condition = element.getAttribute('data-jme-visible');
            var result = scope.evaluate(condition);
            if(!(result.type=='boolean' && result.value==true)) {
                var el = element;
                while(el.parentElement) {
                    var p = el.parentElement;
                    p.removeChild(el);
                    el = p;
                    if(p.childNodes.length>0) {
                        break;
                    }
                }
                return element;
            }
        }
        var new_attrs = {};
        for(var i=0;i<element.attributes.length;i++) {
            var m;
            var attr = element.attributes[i];
            if((m = attr.name.match(/^eval-(.*)/) || (m = attr.name.match(/^(alt)/)))) {
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
        for(let child of Array.from(element.childNodes)) {
            subber.subvars(child);
        }
        this.re_end = o_re_end; // make sure that any maths environment only applies to children of this element; otherwise, an unended maths environment could leak into later tags
        return element;
    },
    sub_text: function(node) {
        var str = node.nodeValue;
        var bits = util.contentsplitbrackets(str,this.re_end);    //split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
        this.re_end = bits.re_end;
        var i=0;
        var l = bits.length;
        for(var i=0; i<l; i+=4) {
            var textsubs = jme.variables.DOMsubvars(bits[i],this.scope,node.ownerDocument);
            for(var j=0;j<textsubs.length;j++) {
                textsubs[j].forEach(function(t) {
                    node.parentElement.insertBefore(t,node);
                });
            }
            var startDelimiter = bits[i+1] || '';
            var tex = bits[i+2] || '';
            var endDelimiter = bits[i+3] || '';
            var n = node.ownerDocument.createTextNode(startDelimiter+tex+endDelimiter);
            node.parentElement.insertBefore(n,node);
        }
        node.parentElement.removeChild(node);
        return node;
    },

    /** 
     * Find all variables which would be used when substituting into the given HTML node.
     * If the node is an element, use `findvars_element`; if it's text, use `findvars_text`.
     *
     * @param {Node} element
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

    /** Find all variables which would be used when substituting into the given element.
     *
     * @param {Element} element
     * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
     * @returns {Array.<string>}
     */
    findvars_element: function(element,scope) {
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
            foundvars = foundvars.merge(jme.findvars(tree,[],scope));
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
                foundvars = foundvars.merge(jme.findvars(tree,[],scope));
            }
        }
        var subber = this;
        var o_re_end = this.re_end;
        for(let child of Array.from(element.childNodes)) {
            var vars = subber.findvars(child,scope);
            if(vars.length) {
                foundvars = foundvars.merge(vars);
            }
        }
        this.re_end = o_re_end; // make sure that any maths environment only applies to children of this element; otherwise, an unended maths environment could leak into later tags
        return foundvars;
    },

    findvars_text: function(node) {
        var scope = this.scope;
        var foundvars = [];
        var str = node.nodeValue;
        var bits = util.contentsplitbrackets(str,this.re_end);    //split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
        this.re_end = bits.re_end;

        /**
         * Find variables used in plain text: look for substitutions between curly braces.
         *
         * @param {string} text
         */
        function findvars_plaintext(text) {
            var tbits = util.splitbrackets(text,'{','}','(',')');
            for(var j=1;j<tbits.length;j+=2) {
                try {
                    var tree = scope.parser.compile(tbits[j]);
                } catch(e) {
                    continue;
                }
                foundvars = foundvars.merge(jme.findvars(tree,[],scope));
            }
        }

        for(var i=0; i<bits.length; i+=4) {
            findvars_plaintext(bits[i]);
            var tex = bits[i+2] || '';
            var texbits = jme.texsplit(tex);
            for(var j=0;j<texbits.length;j+=4) {
                var command = texbits[j+1];
                var content = texbits[j+3];
                switch(command) {
                    case 'var':
                        try {
                            var tree = scope.parser.compile(content);
                            foundvars = foundvars.merge(jme.findvars(tree,[],scope));
                            break;
                        } catch(e) {
                            continue;
                        }
                    case 'simplify':
                        findvars_plaintext(content);
                        break;
                }
            }
        }
        return foundvars;
    }
}
});

Numbas.queueScript('jme-calculus',['jme-base', 'jme-rules'],function() {
/** @file Code to do with differentiation and integration
 *
 * Provides {@link Numbas.jme.calculus}
 */

var jme = Numbas.jme;
var TNum = Numbas.jme.types.TNum;

/** @namespace Numbas.jme.calculus */
var calculus = jme.calculus = {};

var differentiation_rules = [
    ['rational:$n','0'],
    ['?;a + ?`+;b','$diff(a) + $diff(b)'],
    ['?;a - ?`+;b','$diff(a) - $diff(b)'],
    ['+?;a','$diff(a)'],
    ['-?;a','-$diff(a)'],
    ['?;u / ?;v', '(v*$diff(u) - u*$diff(v))/v^2'],
    ['?;u * ?;v`+','u*$diff(v) + v*$diff(u)'],
    ['e^?;p', '$diff(p)*e^p'],
    ['exp(?;p)', '$diff(p)*exp(p)'],
    ['(`+-rational:$n);a ^ ?;b', 'ln(a) * $diff(b) * a^b'],
    ['?;a^(`+-rational:$n);p','p*$diff(a)*a^(p-1)'],
];
/** Rules for differentiating parts of expressions.
 *
 * Occurrences of the function `$diff` in the result expression have differentiation applied with respect to the same variable.
 *
 * @type {Object<Numbas.jme.rules.Rule>}
 */
calculus.differentiation_rules = differentiation_rules.map(function(r) {
    return new Numbas.jme.rules.Rule(r[0],r[1],'acgs');
});

/** Standard derivatives of functions of one variable.
 * 
 * {@link Numbas.jme.calculus.differentiate} replaces `x` in these expressions with the argument of the function, and applies the chain rule.
 *
 * @type {Object<Numbas.jme.tree>}
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
 * @type {Object<boolean>}
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

        if(jme.isType(tok,'number')) {
            return {tok: new TNum(0)};
        } else if(jme.isType(tok,'name')) {
            var nameTok = jme.castToType(tok,'name');
            return {tok: new TNum(nameTok.name==x ? 1 : 0)};
        } else if(jme.isType(tok,'list')) {
            var listTok = jme.castToType(tok,'list');
            if(tree.args) {
                return distribute_differentiation(tree);
            } else {
                return {tok: new jme.types.TList(listTok.value.map(function(v) { return new TNum(0); }))};
            }
        } else if(jme.isType(tok,'expression')) {
            var exprTok = jme.castToType(tok,'expression');
            return base_differentiate(exprTok.tree);
        } else if(jme.isType(tok,'op') || jme.isType(tok,'function')) {
            if(tree.args.length==1 && tok.name in calculus.derivatives) {
                var res = function_derivative_rule.replace(tree,scope);
                return apply_diff(res.expression);
            }
            if(calculus.distributing_derivatives[tok.name]) {
                return distribute_differentiation(tree);
            }
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

    tree = jme.rules.simplificationRules.basic.simplify(tree, scope);

    return base_differentiate(tree);
}

});

