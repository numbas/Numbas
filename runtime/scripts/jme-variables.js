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

jme.variables = /** @lends Numbas.jme.variables */ {

	/** Make a new function, whose definition is written in JME.
	 * @param {object} fn - contains `definition` and `paramNames`.
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
	 * @param {object} fn - contains `definition` and `paramNames`.
	 * @param {object} withEnv - dictionary of local variables for javascript functions
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
					throw(new Numbas.Error('jme.user javascript.returned undefined',fn.name));
				}
				val = jme.wrapValue(val,fn.outtype);
				if(!val.type)
					val = new fn.outcons(val);
				return val;
			}
			catch(e)
			{
				throw(new Numbas.Error('jme.user javascript.error',fn.name,e.message));
			}
		}
	},

	/** Make a custom function.
	 *
	 * @param {object} tmpfn - contains `definition`, `name`, `language`, `parameters`
	 * @param {Numbas.jme.Scope} scope
	 * @param {object} withEnv - dictionary of local variables for javascript functions
	 * @returns {object} - contains `outcons`, `intype`, `evaluate`
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
			throw(new Numbas.Error('jme.variables.error making function',fn.name,e.message));
		}
		return fn
	},

	/** Make up custom functions
	 * @param {object[]} tmpFunctions
	 * @param {Numbas.jme.Scope} scope
	 * @param {object} withEnv - dictionary of local variables for javascript functions
	 * @returns {object[]}
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
	 * @param {string} name - the name of the variable to evaluate
	 * @param {object} todo - dictionary of variables still to evaluate
	 * @param {Numbas.jme.Scope} scope
	 * @param {string[]} path - Breadcrumbs - variable names currently being evaluated, so we can detect circular dependencies
	 * @return {Numbas.jme.token}
	 */
	computeVariable: function(name,todo,scope,path)
	{
		if(scope.variables[name]!==undefined)
			return scope.variables[name];

		if(path===undefined)
			path=[];


		if(path.contains(name))
		{
			throw(new Numbas.Error('jme.variables.circular reference',name,path));
		}

		var v = todo[name];

		if(v===undefined)
			throw(new Numbas.Error('jme.variables.variable not defined',name));

		//work out dependencies
		for(var i=0;i<v.vars.length;i++)
		{
			var x=v.vars[i];
			if(scope.variables[x]===undefined)
			{
				var newpath = path.slice(0);
				newpath.splice(0,0,name);
				try {
					jme.variables.computeVariable(x,todo,scope,newpath);
				}
				catch(e) {
					if(e.originalMessage == 'jme.variables.circular reference' || e.originalMessage == 'jme.variables.variable not defined') {
						throw(e);
					} else {
						throw(new Numbas.Error('jme.variables.error computing dependency',x));
					}
				}
			}
		}

		if(!v.tree) {
			throw(new Numbas.Error('jme.variables.empty definition',name));
		}
		try {
			scope.variables[name] = jme.evaluate(v.tree,scope);
		} catch(e) {
			throw(new Numbas.Error('jme.variables.error evaluating variable',name,e.message));
		}
		return scope.variables[name];
	},

	/** Evaluate dictionary of variables
	 * @param {object} todo - dictionary of variables mapped to their definitions
	 * @param {Numbas.jme.Scope} scope
	 * @param {Numbas.jme.tree} condition - condition on the values of the variables which must be satisfied
	 * @returns {object} - {variables: dictionary of evaluated variables, conditionSatisfied: was the condition satisfied?}
	 */
	makeVariables: function(todo,scope,condition)
	{
		scope = new jme.Scope(scope);

		var conditionSatisfied = true;
		if(condition) {
			var condition_vars = jme.findvars(condition);
			condition_vars.map(function(v) {
				jme.variables.computeVariable(v,todo,scope);
			});
			conditionSatisfied = jme.evaluate(condition,scope).value;
		}

		if(conditionSatisfied) {
			for(var x in todo)
			{
				jme.variables.computeVariable(x,todo,scope);
			}
		}
		return {variables: scope.variables, conditionSatisfied: conditionSatisfied};
	},

	/** Given a todo dictionary of variables, return a dictionary with only the variables depending on the given list of variables
	 * @param {object} todo - dictionary of variables mapped to their definitions
	 * @param {string[]} variables - list of variable names whose dependants we should find
	 * @returns {object} - a copy of the todo list, only including the dependants of the given variables
	 */
	variableDependants: function(todo,ancestors) {
		var out = {}
		var dependants = {};
		function findDependants(name) {
			if(name in dependants) {
				return dependants[name];
			}
			var d = [];
			todo[name].vars.map(function(name2) {
				d = d.concat(name2,findDependants(name2));
			});
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
			for(i=0;i<ancestors.length;i++) {
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
		if($.nodeName(element,'iframe'))
			return element;
		if(element.hasAttribute('nosubvars'))
			return element;

		if(element.hasAttribute('data-jme-visible')) {
			var condition = element.getAttribute('data-jme-visible');
			var result = scope.evaluate(condition);
			if(!(result.type=='boolean' && result.value==true)) {
				$(element).remove();
				return;
			}
		}

		var re_end;
		$(element).contents().each(function() {
			if(this.nodeType==(this.TEXT_NODE || 3)) {
				var selector = $(this);
				var str = this.nodeValue;
				var bits = util.contentsplitbrackets(str,re_end);	//split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
				re_end = bits.re_end;
				var i=0;
				var l = bits.length;
				for(var i=0; i<l; i+=4) {
					var textsubs = jme.variables.DOMsubvars(bits[i],scope,this.ownerDocument);
					for(var j=0;j<textsubs.length;j++) {
						selector.before(textsubs[j]);
					}
					var startDelimiter = bits[i+1] || '';
					var tex = bits[i+2] || '';
					var endDelimiter = bits[i+3] || '';
					var n = this.ownerDocument.createTextNode(startDelimiter+tex+endDelimiter);
					selector.before(n);
				}
				selector.remove();
			} else {
				jme.variables.DOMcontentsubvars(this,scope);
			}
		});
		return element;
	},

	/** Substitute variables into the contents of a text node. Substituted values might contain HTML elements, so the return value is a collection of DOM elements, not another string.
	 * @param {string} str - the contents of the text node
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




});
