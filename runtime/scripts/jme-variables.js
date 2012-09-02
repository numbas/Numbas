/*
Copyright 2011 Newcastle University

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
Numbas.queueScript('scripts/jme-variables.js',['schedule','jme','xml','util'],function() {

var jme = Numbas.jme;
var job = Numbas.schedule.add;
var util = Numbas.util;

jme.variables = {
	makeFunctions: function(xml,scope)
	{
		var tmpFunctions = [];

		//work out functions
		var functionNodes = xml.selectNodes('functions/function');
		if(!functionNodes)
			return {};

		//first pass: get function names and types
		for(var i=0; i<functionNodes.length; i++)
		{
			var name = functionNodes[i].getAttribute('name').toLowerCase();

			var definition = functionNodes[i].getAttribute('definition');
			var language = functionNodes[i].getAttribute('language');

			var outtype = functionNodes[i].getAttribute('outtype').toLowerCase();

			var parameterNodes = functionNodes[i].selectNodes('parameters/parameter');
			var parameters = [];
			for(var j=0; j<parameterNodes.length; j++)
			{
				parameters.push({
					name: parameterNodes[j].getAttribute('name'),
					type: parameterNodes[j].getAttribute('type').toLowerCase()
				});
			}
			tmpFunctions.push({
				name: name,
				definition: definition,
				language: language,
				outtype: outtype,
				parameters: parameters
			});

		}
		return jme.variables.compileFunctions(tmpFunctions,scope);
	},
	
	compileFunctions: function(tmpFunctions,scope)
	{
		scope = new jme.Scope(scope);
		var functions = scope.functions;
		var tmpFunctions2 = [];
		for(var i=0;i<tmpFunctions.length;i++)
		{
			var tmpfn = tmpFunctions[i];

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

			if(functions[tmpfn.name]===undefined)
				functions[tmpfn.name] = [];
			functions[tmpfn.name].push(fn);

			tmpFunctions2.push(fn);
		}


		function makeJMEFunction(fn) {
			fn.tree = jme.compile(fn.definition,scope);
			return function(args,scope) {
				var oscope = scope;
				scope = new jme.Scope(scope);

				for(var j=0;j<args.length;j++)
				{
					scope.variables[fn.paramNames[j]] = jme.evaluate(args[j],oscope);
				}
				return jme.evaluate(this.tree,scope);
			}
		}
		function unwrapValue(v) {
			if(v.type=='list')
				return v.value.map(unwrapValue);
			else
				return v.value;
		}
		function makeJavascriptFunction(fn) {
			var preamble='(function('+fn.paramNames.join(',')+'){';
			var math = Numbas.math;
			var util = Numbas.util;
			var jfn = eval(preamble+fn.definition+'})');
			return function(args,scope) {
				args = args.map(function(a){return unwrapValue(jme.evaluate(a,scope))});
				try {
					var val = jfn.apply(this,args);
					if(!val.type)
						val = new fn.outcons(val);
					return val;
				}
				catch(e)
				{
					throw(new Numbas.Error('jme.user javascript error',fn.name,e.message));
				}
			}
		}


		for(var i=0;i<tmpFunctions2.length;i++)
		{
			var fn = tmpFunctions2[i];

			switch(fn.language)
			{
			case 'jme':
				fn.evaluate = makeJMEFunction(fn);

				break;
			case 'javascript':
				fn.evaluate = makeJavascriptFunction(fn);
				break;
			}

		}
		return functions;
	},

	makeVariables: function(xml,scope)
	{
		var variableNodes = xml.selectNodes('variables/variable');	//get variable definitions out of XML
		if(!variableNodes)
			return {};

		//list of variable names to ignore because they don't make sense
		var ignoreVariables = ['pi','e','date','year','month','monthname','day','dayofweek','dayofweekname','hour24','hour','minute','second','msecond','firstcdrom'];

		//evaluate variables - work out dependency structure, then evaluate from definitions in correct order
		var todo = {};
		for( var i=0; i<variableNodes.length; i++ )
		{
			var name = variableNodes[i].getAttribute('name').toLowerCase();
			if(!ignoreVariables.contains(name))
			{
				var value = variableNodes[i].getAttribute('value');

				var vars = [];

				var tree = jme.compile(value,scope,true);
				vars = vars.merge(jme.findvars(tree));
				todo[name]={
					tree: tree,
					vars: vars
				};
			}
		}
		function compute(name,todo,scope,path)
		{
			if(scope.variables[name]!==undefined)
				return;

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
					compute(x,todo,scope,newpath);
				}
			}

			scope.variables[name] = jme.evaluate(v.tree,scope);
		}
		scope = new jme.Scope(scope);
		for(var x in todo)
		{
			compute(x,todo,scope);
		}
		return scope.variables;
	},

	DOMcontentsubvars: function(element, scope) {
		$(element).contents().each(function() {
			if(this.nodeType==this.TEXT_NODE) {
				var selector = $(this);
				var str = this.nodeValue;
				var bits = util.contentsplitbrackets(str);	//split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
				var i=0;
				var l = bits.length;
				for(var i=0; i<l; i+=4) {
					var textsubs = jme.variables.DOMsubvars(bits[i],scope);
					for(var j=0;j<textsubs.length;j++) {
						selector.before(textsubs[j]);
					}
					selector.before((bits[i+1]||'')+jme.texsubvars(bits[i+2]||'',scope)+(bits[i+3]||''));
				}
				selector.remove();
			} else {
				jme.variables.DOMcontentsubvars(this,scope);
			}
		});
		return element;
	},

	DOMsubvars: function(str,scope) {
		var bits = util.splitbrackets(str,'{','}');

		if(bits.length==1)
			return [str];

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
					v = v.value;
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
		return out;
	}
};

});
