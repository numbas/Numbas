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
        if(external_vars.length>0) {
            jme.findvarsOps[fn.name] = function(tree,boundvars,scope) {
                var vars = external_vars.slice();
                for(var i=0;i<tree.args.length;i++) {
                    vars = vars.merge(jme.findvars(tree.args[i],boundvars,scope));
                }
                return vars;
            }
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
        try {
            with(withEnv) {
                var jfn = eval(preamble+fn.definition+'\n})');
            }
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
            var names = name.split(/\s*,\s*/).filter(function(n) { return n.trim(); });
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
     * @param {object.<Numbas.jme.token>} changed_variables - Dictionary of changed variables. These will be added to the scope, and will not be re-evaluated.
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
                scope.deleteVariable(name);
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
     * @param {object.<string[]>} todo - Dictionary of rulesets still to evaluate.
     * @param {Numbas.jme.Scope} scope
     * @param {string[]} path - Breadcrumbs - Rulesets names currently being evaluated, so we can detect circular dependencies.
     * @returns {Numbas.jme.rules.Ruleset}
     */
    computeRuleset: function(name,todo,scope,path) {
        if(scope.getRuleset(jme.normaliseName(name,scope)) || (jme.normaliseName(name,scope) in jme.displayFlags)) {
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

    /** Add a list of constants to the scope.
     *
     * @param {Array.<Numbas.jme.constant_definition>} definitions
     * @param {Numbas.jme.Scope} scope
     * @returns {Array.<string>} - The names of constants added to the scope.
     */
    makeConstants: function(definitions,scope) {
        var defined_names = [];
        definitions.forEach(function(def) {
            var names = def.name.split(/\s*,\s*/);
            var value = def.value;
            if(typeof value == 'string') {
                value = scope.evaluate(value);
            }
            names.forEach(function(name) {
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
            if(jme.isType(token,'html')) {
                token = jme.castToType(token,'html');
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
        for(var i=0; i<bits.length; i++)
        {
            if(i % 2)
            {
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
                if($(v).parent().length>0) {
                    throw(new Numbas.Error('jme.subvars.html inserted twice'))
                }
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

/** A definition of a marking note.
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
    Script.prototype = /** @lends Numbas.marking.MarkingScript.prototype */ {

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
         * @param {object.<Numbas.jme.token>} variables - Extra variables defined in the scope.
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
                scope.setVariable(name,result.variables[name]);
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
                    return;
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
        return element;
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
        $(element).contents().each(function() {
            var vars = subber.findvars(this,scope);
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
