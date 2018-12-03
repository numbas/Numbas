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
     * @returns {Function} - function which evaluates arguments and adds them to the scope, then evaluates `fn.definition` over that scope.
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
     * The JavaScript is wrapped with `(function(<paramNames>){ ` and ` }`)
     *
     * @param {Object} fn - contains `definition` and `paramNames`.
     * @param {Object} withEnv - dictionary of local variables for javascript functions
     * @returns {Function} - function which evaluates arguments, unwraps them to JavaScript values, then evalutes the JavaScript function and returns the result, wrapped as a {@link Numbas.jme.token}
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
     * @param {Function} [computeFn=Numbas.jme.variables.computeVariable] - a function to call when a dependency needs to be computed.
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
            var value = jme.evaluate(v.tree,scope);
            scope.setVariable(name,value);
        } catch(e) {
            throw(new Numbas.Error('jme.variables.error evaluating variable',{name:name,message:e.message},e));
        }
        return value;
    },
    /** Evaluate dictionary of variables
     * @param {Numbas.jme.variables.variable_data_dict} todo - dictionary of variables mapped to their definitions
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.tree} condition - condition on the values of the variables which must be satisfied
     * @param {Function} computeFn - a function to compute a variable. Default is Numbas.jme.variables.computeVariable
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
        /** Find the names of the variables this variable depends on
         * @param {String} name - the name of the variable to consider
         * @param {Array.<String>} path - the chain of variables that have led to the one being considered, used to detect circular references
         * @returns {Array.<String>} - the names of the variables this one depends on
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
    /** Substitute variables into a DOM element (works recursively on the element's children)
     *
     * Ignores iframes and elements with the attribute `nosubvars`.
     * @param {Element} element
     * @param {Numbas.jme.Scope} scope
     * @see Numbas.jme.variables.DOMcontentsubber
     */
    DOMcontentsubvars: function(element, scope) {
        var subber = new DOMcontentsubber(scope);
        subber.subvars(element);
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
        if(bits.length==1) {
            return [doc.createTextNode(str)];
        }
        /** Get HTML content for a given JME token
         * @param {Numbas.jme.token} token
         * @returns {Element|String}
         */
        function doToken(token) {
            switch(token.type){
            case 'html':
                return token.value;
            case 'string':
                return token.value.replace(/\\([{}])/g,'$1');
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
 * @param {Numbas.jme.Scope} scope
 * @memberof Numbas.jme.variables
 * @constructor
 */
var DOMcontentsubber = Numbas.jme.variables.DOMcontentsubber = function(scope) {
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
            /** Substitute content into the object's root element
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
