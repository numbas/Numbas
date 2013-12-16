/*
Copyright 2011-13 Newcastle University

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
Numbas.queueScript('scripts/jme-variables.js',['jme','util'],function() {

var jme = Numbas.jme;
var util = Numbas.util;


jme.variables = {

	scope_list: [],
	
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

	makeJavascriptFunction: function(fn,scope) {
		var paramNames = fn.paramNames.slice();
		paramNames.push('scope');
		var preamble='fn.jfn=(function('+paramNames.join(',')+'){';
		var math = Numbas.math;
		var util = Numbas.util;
		var jfn = eval(preamble+fn.definition+'})');
		return function(args,scope) {
			args = args.map(function(a){return jme.unwrapValue(a)});
			args.push(scope);
			try {
				var val = jfn.apply(this,args);
				if(val===undefined) {
					throw(new Numbas.Error('jme.user javascript.returned undefined',fn.name));
				}
				val = jme.wrapValue(val);
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

	makeFunction: function(tmpfn,scope) {
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

		switch(fn.language)
		{
		case 'jme':
			fn.evaluate = jme.variables.makeJMEFunction(fn,scope);
			break;
		case 'javascript':
			fn.evaluate = jme.variables.makeJavascriptFunction(fn,scope);
			break;
		}
		return fn
	},

	makeFunctions: function(tmpFunctions,scope)
	{
		scope = new jme.Scope(scope);
		var functions = scope.functions;
		var tmpFunctions2 = [];
		for(var i=0;i<tmpFunctions.length;i++)
		{
			var cfn = jme.variables.makeFunction(tmpFunctions[i],scope);

			if(functions[cfn.name]===undefined)
				functions[cfn.name] = [];
			functions[cfn.name].push(cfn);

		}
		return functions;
	},

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
					throw(new Numbas.Error('jme.variables.error computing dependency',x));
				}
			}
		}

		scope.variables[name] = jme.evaluate(v.tree,scope);
		return scope.variables[name];
	},

	makeVariables: function(todo,scope)
	{
		scope = new jme.Scope(scope);
		for(var x in todo)
		{
			jme.variables.computeVariable(x,todo,scope);
		}
		return scope.variables;
	},

	DOMcontentsubvars: function(element, scope) {
		if($.nodeName(element,'iframe'))
			return element;

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

	DOMsubvars: function(str,scope,doc) {
		doc = doc || document;
		var bits = util.splitbrackets(str,'{','}');

		if(bits.length==1)
			return [doc.createTextNode(str)];

		var out = [];
		for(var i=0; i<bits.length; i++)
		{
			if(i % 2)
			{
				var v = jme.evaluate(jme.compile(bits[i],scope),scope);
				switch(v.type){ 
				case 'html':
					v = v.value;
					break;
				case 'number':
					v = Numbas.math.niceNumber(v.value);
					break;
				case 'string':
					v = v.value.replace(/\\([{}])/g,'$1');
					break;
				default:
					v = jme.display.treeToJME({tok:v});
				}
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
