
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

Numbas.queueScript('scripts/jme.js',['math','util'],function() {
	var util = Numbas.util;

var jme = Numbas.jme = {

	tokenise: function(expr)
	//takes a string in and returns a list of tokens 
	{
		if(!expr)
			return [];
	
		expr += '';

		expr = expr.replace(/^\s+|\s+$/g, '');	//get rid of whitespace

		var tokens = [];
		var i = 0;
		var re_bool = /^true|^false/;
		var re_number = /^[0-9]+(?:\x2E[0-9]+)?/;
		var re_name = /^{?((?:(?:[a-zA-Z]+):)*)((?:\$?[a-zA-Z][a-zA-Z0-9]*'*)|\?)}?/i;
		var re_op = /^(_|\.\.|#|<=|>=|<>|&&|\|\||[\|*+\-\/\^<>=!]|(?:(not|and|or|xor|isa)([^a-zA-Z0-9])))/i;
		var re_punctuation = /^([\(\),\[\]])/;
		var re_string = /^("([^"]*)")|^('([^']*)')/;
		var re_special = /^\\\\([%!+\-\,\.\/\:;\?\[\]=\*\&<>\|~\(\)]|\d|([a-zA-Z]+))/;
		
		while( expr.length )
		{
			expr = expr.replace(/^\s+|\s+$/g, '');	//get rid of whitespace
		
			var result;
			var token;
			if(result = expr.match(re_number))
			{
				token = new TNum(result[0]);

				if(tokens.length>0 && (tokens[tokens.length-1].type==')'))	//right bracket followed by a number is interpreted as multiplying contents of brackets by number
				{
					tokens.push(new TOp('*'));
				}
			}
			else if (result = expr.match(re_bool))
			{
				token = new TBool(util.parseBool(result[0]));
			}
			else if (result = expr.match(re_op))
			{
				if(result[2])		//if word-ish operator
					result[0] = result[2];
				token = result[0];
				//work out if operation is being used prefix or postfix
				var nt;
				if( tokens.length==0 || (nt=tokens[tokens.length-1].type)=='(' || nt==',' || nt=='[' || nt=='op' )
				{
					if(token in prefixForm)
						token = prefixForm[token];
				}
				else
				{
					if(token in postfixForm)
						token = postfixForm[token];
				}
				token=new TOp(token);
			}
			else if (result = expr.match(re_name))
			{
				var name = result[2];
				var annotation = result[1] ? result[1].split(':') : null;
				if(!annotation)
				{
					// fill in constants here to avoid having more 'variables' than necessary
					if(name.toLowerCase()=='e') {
						token = new TNum(Math.E);

					}else if (name.toLowerCase()=='pi' || name.toLowerCase()=='\\pi') {
						token = new TNum(Math.PI);

					}else if (name.toLowerCase()=='i') {
						token = new TNum(math.complex(0,1));
					}else{
						token = new TName(name,annotation);
					}
				}
				else
				{
					token = new TName(name,annotation);
				}
				
				if(tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type=='name' || tokens[tokens.length-1].type==')')) {	//number or right bracket or name followed by a name, eg '3y', is interpreted to mean multiplication, eg '3*y'
					tokens.push(new TOp('*'));
				}
			}
			else if (result = expr.match(re_punctuation))
			{
				if(result[0]=='(' && tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type==')')) {	//number or right bracket followed by left parenthesis is also interpreted to mean multiplication
					tokens.push(new TOp('*'));
				}

				token = new TPunc(result[0]);
			}
			else if (result = expr.match(re_string))
			{
				var string = result[2] || result[4];
				string = string.replace(/\\n/g,'\n');
				token = new TString(string);
			}
			else if (result = expr.match(re_special))
			{
				var code = result[1] || result[2];
				
				var tex;
				var cons = TSpecial;
				if( varsymbols.contains(code) )	//varsymbols letters should act like variable names
				{
					cons = TName;
				}
				if(samesymbols.contains(code))	//numbers, punctuation, etc. can be left as they are
				{
					tex = code;
				}
				else if (symbols[code]!==undefined)	//is code in dictionary of things that have a particular translation?
				{
					tex = symbols[code];
				}
				else	//otherwise latex command must be the same as numbas, so stick a slash in front
				{
					tex = '\\'+code;
				}

				token = new cons(tex);
			}
			else
			{
				//invalid character or not able to match a token
				return undefined;
			}
			
			expr=expr.slice(result[0].length);	//chop found token off the expression
			
			tokens.push(token);
		}

		//rewrite some synonyms
		for(var i=0; i<tokens.length; i++)
		{
			if(tokens[i].name)
			{
				if(synonyms[tokens[i].name])
					tokens[i].name=synonyms[tokens[i].name];
			}
		}


		return(tokens);
	},

	shunt: function(tokens,functions)
	// turns tokenised infix expression into a parse tree (shunting yard algorithm, wikipedia has a good description)
	{
		var output = [];
		var stack = [];
		
		var numvars=[],olength=[],listmode=[];

		function addoutput(tok)
		{
			if(tok.vars!==undefined)
			{
				if(output.length<tok.vars)
					throw(new Numbas.Error('jme.shunt.not enough arguments',tok.name));

				var thing = {tok: tok,
							 args: output.slice(-tok.vars)};
				output = output.slice(0,-tok.vars);
				output.push(thing);
			}
			else
				output.push({tok:tok});
		}

		for(var i = 0;i < tokens.length; i++ )
		{
			var tok = tokens[i];
			
			switch(tok.type) 
			{
			case "number":
			case "string":
			case 'boolean':
				addoutput(tok);
				break;
			case 'special':
				while( stack.length && stack[stack.length-1].type != "(" )
				{
					addoutput(stack.pop());
				}
				addoutput(tok);
				break;
			case "name":
				if( i<tokens.length-1 && tokens[i+1].type=="(")
				{
						stack.push(new TFunc(tok.name,tok.annotation));
						numvars.push(0);
						olength.push(output.length);
				}
				else 
				{										//this is a variable otherwise
					addoutput(tok);
				}
				break;
				
			case ",":
				while( stack.length && stack[stack.length-1].type != "(" && stack[stack.length-1].type != '[')
				{	//reached end of expression defining function parameter, so pop all of its operations off stack and onto output
					addoutput(stack.pop())
				}

				numvars[numvars.length-1]++;

				if( ! stack.length )
				{
					throw(new Numbas.Error('jme.shunt.no left bracket in function'));
				}
				break;
				
			case "op":

				var o1 = precedence[tok.name];
				while(stack.length && stack[stack.length-1].type=="op" && ((o1 > precedence[stack[stack.length-1].name]) || (leftAssociative(tok.name) && o1 == precedence[stack[stack.length-1].name]))) 
				{	//while ops on stack have lower precedence, pop them onto output because they need to be calculated before this one. left-associative operators also pop off operations with equal precedence
					addoutput(stack.pop());
				}
				stack.push(tok);
				break;

			case '[':
				if(i==0 || tokens[i-1].type=='(' || tokens[i-1].type=='[' || tokens[i-1].type==',' || tokens[i-1].type=='op')	//define list
				{
					listmode.push('new');
				}
				else		//list index
					listmode.push('index');

				stack.push(tok);
				numvars.push(0);
				olength.push(output.length);
				break;

			case ']':
				while( stack.length && stack[stack.length-1].type != "[" ) 
				{
					addoutput(stack.pop());
				}
				if( ! stack.length ) 
				{
					throw(new Numbas.Error('jme.shunt.no left square bracket'));
				}
				else
				{
					stack.pop();	//get rid of left bracket
				}

				//work out size of list
				var n = numvars.pop();
				var l = olength.pop();
				if(output.length>l)
					n++;

				switch(listmode.pop())
				{
				case 'new':
					addoutput(new TList(n))
					break;
				case 'index':
					var f = new TFunc('listval');
					f.vars = 2;
					addoutput(f);
					break;
				}
				break;
				
			case "(":
				stack.push(tok);
				break;
				
			case ")":
				while( stack.length && stack[stack.length-1].type != "(" ) 
				{
					addoutput(stack.pop());
				}
				if( ! stack.length ) 
				{
					throw(new Numbas.Error('jme.shunt.no left bracket'));
				}
				else
				{
					stack.pop();	//get rid of left bracket

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
				break;
			}
		}

		//pop all remaining ops on stack into output
		while(stack.length)
		{
			var x = stack.pop();
			if(x.type=="(")
			{
				throw(new Numbas.Error('jme.shunt.no right bracket'));
			}
			else
			{
				addoutput(x);
			}
		}

		if(listmode.length>0)
			throw(new Numbas.Error('jme.shunt.no right square bracket'));

		if(output.length>1)
			throw(new Numbas.Error('jme.shunt.missing operator'));

		return(output[0]);
	},

	substituteTree: function(tree,variables,allowUnbound)
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
				if(variables[name]===undefined)
				{
					if(allowUnbound)
						return {tok: new TName(name)};
					else
						throw new Numbas.Error('jme.substituteTree.undefined variable',name);
				}
				else
				{
					if(variables[name].tok)
						return variables[name];
					else
						return {tok: variables[name]};
				}
			}
			else
				return tree;
		}
		else
		{
			tree = {tok: tree.tok,
					args: tree.args.slice()};
			for(var i=0;i<tree.args.length;i++)
				tree.args[i] = jme.substituteTree(tree.args[i],variables,allowUnbound);
			return tree;
		}
	},

	bind: function(tree,variables,functions)
	{
		if(tree.bound)
			return
		if(tree.args)
		{
			for(var i=0;i<tree.args.length;i++)
				jme.bind(tree.args[i],variables,functions);
		}

		jme.typecheck(tree,functions);
		tree.tok.bound = true;
	},

	evaluate: function(tree,variables,functions)
	{
		if( typeof(tree)=='string' )
			tree = jme.compile(tree,functions);

		if(variables===undefined)
			variables = {};
		if(functions===undefined)
			functions = {};
		else
			functions = util.copyobj(functions);
		for(var x in builtins)
		{
			if(functions[x]===undefined)
				functions[x]=builtins[x];
			else
				functions[x]=functions[x].concat(builtins[x]);
		}

		tree = jme.substituteTree(tree,variables,true);
		jme.bind(tree,variables,functions);	//

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
				tok.value = [];
				for(var i=0;i<tree.args.length;i++)
				{
					tok.value[i] = jme.evaluate(tree.args[i],variables,functions);
				}
			}
			return tok;
		case 'string':
			return new TString(jme.contentsubvars(tok.value,variables,functions));
		case 'name':
			if(variables[tok.name.toLowerCase()])
				return variables[tok.name.toLowerCase()];
			else
				return tok;
				throw(new Numbas.Error('jme.evaluate.undefined variable'));
			break;
		case 'op':
		case 'function':
			return tok.fn.evaluate(tree.args,variables,functions);
		default:
			return tok;
		}
	},

	compile: function(expr,functions,notypecheck) 
	{
		expr+='';	//make sure expression is a string and not a number or anything like that

		if(!expr.trim().length)
			return null;
		//typecheck
		if(functions===undefined)
			functions = {};
		else
			functions = util.copyobj(functions);
		for(var x in builtins)
		{
			if(functions[x]===undefined)
				functions[x]=builtins[x];
			else
				functions[x]=functions[x].concat(builtins[x]);
		}


		//tokenise expression
		var tokens = jme.tokenise(expr);
		if(tokens===undefined){
			throw(new Numbas.Error('jme.compile.tokenise failed',expr));
		}

		//compile to parse tree
		var tree = jme.shunt(tokens,functions);

		if(tree===null)
			return;

		if(!notypecheck)
		{
			if(!jme.typecheck(tree,functions))
				throw(new Numbas.Error('jme.compile.type error'));
		}

		return(tree);
	},

	typecheck: function(tree,functions)
	{
		if(tree.bound)
			return true;

		tree.tok.bound = true;

		if(tree.args!=undefined)
		{
			for(var i=0;i<tree.args.length;i++)
			{
				jme.typecheck(tree.args[i],functions);
				if(!tree.args[i].tok.bound)
					tree.tok.bound = false;
			}
		}

		var tok = tree.tok;
		switch(tok.type)
		{
		case 'number':
		case 'string':
		case 'boolean':
		case 'range':
		case 'list':
		case 'vector':
		case 'matrix':
			tok.outtype = tok.type;
			return true;
		case 'name':
			tok.outtype = '?';
			tok.bound = false;
			return true;
		case 'op':
		case 'function':
			var op = tok.name.toLowerCase();

			if(functions[op]===undefined)
			{
				if(tok.type=='function')
					throw(new Numbas.Error('jme.typecheck.function not defined',op,op));
				else
					throw(new Numbas.Error('jme.typecheck.op not defined',op));
			}

			var result = undefined;

			for(var j=0;j<functions[op].length; j++)
			{
				var fn = functions[op][j];
				if(fn.typecheck(tree.args))
				{
					tok.fn = fn;
					tok.outtype = fn.outtype;
					return true;
				}
			}
			throw(new Numbas.Error('jme.typecheck.no right type definition',op));
		}
	},

	compare: function(expr1,expr2,settings,variables) {
		date = new Date();	//might as well get an even more up-to-date time than the one got when the script was loaded

		expr1 += '';
		expr2 += '';

		var compile = jme.compile, evaluate = jme.evaluate;

		var checkingFunction = checkingFunctions[settings.checkingType.toLowerCase()];	//work out which checking type is being used

		try {
			var tree1 = compile(expr1);
			var tree2 = compile(expr2);

			if(tree1 == null || tree2 == null) 
			{	//one or both expressions are invalid, can't compare
				return false; 
			}

			//find variable names used in both expressions - can't compare if different
			var vars1 = findvars(tree1);
			var vars2 = findvars(tree2);

			for(var v in variables)
			{
				delete vars1[v];
				delete vars2[v];
			}
			
			if( !varnamesAgree(vars1,vars2) ) 
			{	//whoops, differing variables
				return false;
			}

			if(vars1.length) 
			{	// if variables are used,  evaluate both expressions over a random selection of values and compare results
				var errors = 0;
				var rs = randoms(vars1, settings.vsetRangeStart, settings.vsetRangeEnd, settings.vsetRangePoints);
				for(var i = 0; i<rs.length; i++) {
					util.copyinto(variables,rs[i]);
					var r1 = evaluate(tree1,rs[i]);
					var r2 = evaluate(tree2,rs[i]);
					if( !resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy) ) { errors++; }
				}
				if(errors < settings.failureRate) {
					return true;
				}else{
					return false;
				}
			} else {
				//if no variables used, can just evaluate both expressions once and compare
				r1 = evaluate(tree1,variables);
				r2 = evaluate(tree2,variables);
				return resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy);
			}
		}
		catch(e) {
			return false;
		}

	},

	contentsubvars: function(str, variables,functions)
	{
		var bits = util.contentsplitbrackets(str);	//split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
		var out='';
		for(var i=0; i<bits.length; i++)
		{
			switch(i % 4)
			{
			case 0:	//plain text - variables inserted by expressions in curly braces
				out += jme.subvars(bits[i],variables,functions,true);
				break;
			case 2:	//a TeX expression - variables inserted with \var and \simplify commands
				out += jme.texsubvars(bits[i],variables,functions)
				break;
			case 1:	//a TeX delimiter
			case 3:
				out += bits[i];
				break;
			}
		}
		return out;
	},

	texsplit: function(s)
	{
		var cmdre = /((?:.|\n)*?)\\((?:var)|(?:simplify))/m;
		var out = [];
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
					throw(new Numbas.Error('jme.texsubvars.no right bracket',cmd));
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
				throw(new Numbas.Error('jme.texsubvars.missing parameter',cmd,s));
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
				throw(new Numbas.Error('jme.texsubvars.no right brace'));

			var expr = s.slice(si,i);
			s = s.slice(i+1);
			out.push(expr);
		}
		out.push(s);
		return out;
	},

	texsubvars: function(s,variables,functions)
	{
		var bits = jme.texsplit(s);
		var out = '';
		for(var i=0;i<bits.length-3;i+=4)
		{
			out+=bits[i];
			var cmd = bits[i+1],
				args = bits[i+2],
				expr = bits[i+3];

			switch(cmd)
			{
			case 'var':	//substitute a variable
				var v = jme.evaluate(jme.compile(expr,functions),variables,functions);
				v = jme.display.texify({tok: v});
				out += ' '+v+' ';
				break;
			case 'simplify': //a JME expression to be simplified
				expr = jme.subvars(expr,variables,functions);
				var tex = jme.display.exprToLaTeX(expr,args);
				out += ' '+tex+' ';
				break;
			}
		}
		return out+bits[bits.length-1];
	},

	//substitutes variables into a string "text {expr1} text {expr2} ..."
	subvars: function(str, variables,functions,display)
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
				var v = jme.evaluate(jme.compile(bits[i],functions),variables,functions);
				if(v.type=='number')
				{
					v = Numbas.math.niceNumber(v.value);
					if(display)
						v = ''+v+'';
					else
						v = '('+v+')';
				}
				else if(v.type=='string')
				{
					if(display)
						v = v.value;
					else
						v = "'"+v.value+"'";
				}
				else
				{
					v = jme.display.treeToJME({tok:v});
				}

				if(display)
				{
					v = textile(v,{nowrapPlainBlocks:true});
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

	plot: function(eqn,settings)
	{
		var tree = compile(eqn,settings.functions);
		var varname = findvars(tree)[0];
		var points=[];
		for(var x = settings.min; x<=settings.max; x+=(settings.max-settings.min)/settings.steps)
		{
			var variables={};
			variables[varname]=new TNum(x);
			var y = evaluate(tree,variables).value;
			points.push([x,y]);
		}
		return points;
	},

	userFunction: function(name,outtype,definition,parameters)
	{
		var intype=[];
		for(var i=0;i<parameters.length;i++)
			intype.push(parameters[i][1]);

		var tree = jme.compile(definition);

		var evaluate = function(variables)
		{
			var newvars = util.copyobj(variables);
			for(var i=0;i<this.paramtypes.length;i++)
			{
				var name = this.paramtypes[i][0];
				newvars[name] = jme.evaluate(variables[i],variables)
			}
		}

		var func = funcObj(name,intype,outtype,evaluate,true);
		func.typecheck = typecheck;
		func.paramtypes = parameters;
	}
};

var date = new Date();  //date needs to be global so the same time can be used for Seconds/mSeconds functions, and I don't want to pass it around all the eval functions

//dictionary mapping numbas symbols to LaTeX symbols
//symbols \\x not in this dictionary will be mapped to \x.

var varsymbols = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','psi','chi','phi','omega','=','space'];
var samesymbols = '!+-,./0123456789:;?[]=';
var symbols = {
	'space': ' ',				'&': '\\&',							'contains': '\\ni',
	'*': '\\ast',				'<': '\\lt',						'>': '\\gt',
	'congruent': '\\cong',		'perpendicular': '\\perp',			'uptee': '\\perp',
	'overscore': '\\bar',		'|': '\\mid',						'~': '\\sim',
	'dash': '^{\\prime}',			'leftanglebracket': '\\langle',		'le': '\\leq',
	'infinity': '\\infty',		'doublearrow': '\\leftrightarrow',	'degree': '^{\\circ}',
	'plusorminus': '\\pm',		'doublequotes': '"',				'ge': '\\geq',
	'proportional': '\\propto',	'filledcircle': '\\bullet',			'divide': '\\div',
	'notequal': '\\neq',		'identical': '\\equiv',				'approximately': '\\approx',
	'vbar': '\\mid',			'hbar': '---',						'dots': '\\ldots',
	'imaginary': '\\mathbb{I}',	'real': '\\mathbb{R}',				'osol': '\\varnothing',
	'subsetequal': '\\supseteq','subset': '\\supset',				'notsubset': '\\not \\subset',
	'supersetequal': '\\subseteq','superset': '\\subset',			'notin': '\\not \\in',
	'product': '\\prod',		'sqrt': '\\sqrt',					'dot': '\\cdot',
	'¬': '\\neg',				'logicaland': '\\wedge',			'logicalor': '\\vee',
	'doubleimplies': '\\Leftrightarrow',							'impliesby': '\\Leftarrow',
	'impliesup': '\\Uparrow', 	'impliesdown': '\\Downarrow',		'implies': '\\Rightarrow',
	'rightanglebracket': '\\rangle',								'integral': '\\int',
	'(': '\\left ( \\right .',					')': '\\left ) \\right .'
};



//a length-sorted list of all the builtin functions, for recognising stuff like xcos() as x*cos()
var builtinsbylength=[],builtinsre=new RegExp();
builtinsbylength.add = function(e)
{
	if(!e.match(/^[a-zA-Z]+$/)){return;}
	var l = e.length;
	for(var i=0;i<this.length;i++)
	{
		if(this[i].length<=l)
		{
			this.splice(i,0,e);
			builtinsre = new RegExp('('+builtinsbylength.join('|')+')$');
			return;
		}
	}
	this.push(e);
	builtinsre = new RegExp('('+builtinsbylength.join('|')+')$');
};


//the data types supported by JME expressions
var types = jme.types = {}
var TNum = types.TNum = types.number = function(num)
{
	if(num===undefined) 
		return;

	this.value = num.complex ? num : parseFloat(num);
}
TNum.prototype.type = 'number';

var TString = types.TString = types.string = function(s)
{
	this.value = s;
}
TString.prototype.type = 'string';

var TBool = types.TBool = types.boolean = function(b)
{
	this.value = b;
}
TBool.prototype.type = 'boolean';

var TList = types.TList = types.list = function(n,value)
{
	this.vars = n;
	this.value = value;
}
TList.prototype.type = 'list';

var TVector = types.TVector = types.vector = function(value)
{
	this.value = value;
}
TVector.prototype.type = 'vector';

var TMatrix = types.TMatrix = types.matrix = function(value)
{
	this.value = value;
}
TMatrix.prototype.type = 'matrix';

var TRange = types.TRange = types.range = function(range)
{
	this.value = range;
	if(this.value!==undefined)
	{
		var start = this.value[0], end = this.value[1], step = this.value[2];

		//if step is discrete, store all values in range so they don't need to be computed each time
		if(step > 0)
		{
			var n = this.size = (end-start)/step+1;
			for(var i=0;i<n;i++)
			{
				this.value[i+3] = start+i*step;
			}
		}
	}
}
TRange.prototype.type = 'range';

var TName = types.TName = types.name = function(name,annotation)
{
	this.name = name;
	this.value = name;
	this.annotation = annotation;
}
TName.prototype.type = 'name';

var TFunc = types.TFunc = types['function'] = function(name,annotation)
{
	this.name = name;
	this.annotation = annotation;
}
TFunc.prototype.type = 'function';
TFunc.prototype.vars = 0;

var TOp = types.TOp = types.op = function(op)
{
	var arity = 2;
	if(jme.arity[op]!==undefined)
		arity = jme.arity[op];

	this.name = op;
	this.vars = arity;
}
TOp.prototype.type = 'op';

var TPunc = types.TPunc = function(kind)
{
	this.type = kind;
}


//special character
var TSpecial = jme.types.TSpecial = function(value)
{
	this.value = value;
}
TSpecial.prototype.type = 'special';

//concatenation - for dealing with special characters
var TConc = jme.types.TConc = function()
{
}
TConc.prototype.type = 'conc';

var arity = jme.arity = {
	'!': 1,
	'not': 1,
	'fact': 1,
	'+u': 1,
	'-u': 1
}

//some names represent different operations when used as prefix or as postfix. This dictionary translates them
var prefixForm = {
	'+': '+u',
	'-': '-u',
	'!': 'not',
}
var postfixForm = {
	'!': 'fact'
}

var precedence = jme.precedence = {
	'_': 0,
	'fact': 1,
	'not': 1,
	'^': 2,
	'*': 3,
	'/': 3,
	'+u': 3.5,
	'-u': 3.5,
	'+': 4,
	'-': 4,
	'..': 5,
	'#':6,
	'<': 7,
	'>': 7,
	'<=': 7,
	'>=': 7,
	'<>': 8,
	'=': 8,
	'|': 9,
	'&': 11,
	'&&': 11,
	'and': 11,
	'|': 12,
	'||': 12,
	'or': 12,
	'xor': 13,
	'isa': 0
};

var synonyms = {
	'&':'&&',
	'and':'&&',
	'divides': '|',
	'or':'||',
	'sqr':'sqrt',
	'gcf': 'gcd',
	'sgn':'sign',
	'len': 'abs',
	'length': 'abs'
};
	


function leftAssociative(op)
{
	// check for left-associativity because that is the case when you do something more
	// exponentiation is only right-associative operation at the moment
	return (op!='^');
};

var commutative = jme.commutative =
{
	'*': true,
	'+': true,
	'&&': true
};


//function object - for doing type checking away from the evaluator
//intype is a list of data type constructors (TNum, etc.) for function's parameters' types
//use the string '?' to match any type
//put a * in front of the type name to 
//outtype is the type constructor corresponding to the value the function returns
//fn is the function to be evaluated
//
//options can contain any of:
//	nobuiltin: don't add this funcObj to the list of builtins
//	typecheck: a function which checks whether the funcObj can be applied to the given arguments 
//  evaluate: a function which performs the funcObj on given arguments and variables. Arguments are passed as expression trees, i.e. unevaluated
var funcObj = jme.funcObj = function(name,intype,outcons,fn,options)
{
	options = options || {};
	for(var i=0;i<intype.length;i++)
	{
		if(intype[i]!='?')
		{
			if(intype[i][0]=='*')
			{
				var type = types[intype[i].slice(1)];
				intype[i] = '*'+(new type()).type;
			}
			else
			{
				intype[i]=new intype[i]().type;
			}
		}
	}

	name = name.toLowerCase();

	this.name=name;
	this.intype = intype;
	if(typeof(outcons)=='function')
		this.outtype = new outcons().type;
	else
		this.outtype = '?';
	this.outcons = outcons;
	this.fn = fn;

	if(!options.nobuiltin)
	{
		if(builtins[name]===undefined)
		{
			builtins[name]=[this];
			builtinsbylength.add(name);
		}
		else
		{
			builtins[name].push(this);
		}
	}

	this.typecheck = options.typecheck || function(variables)
	{
		variables = variables.slice();	//take a copy of the array

		for( var i=0; i<this.intype.length; i++ )
		{
			if(this.intype[i][0]=='*')	//arbitrarily many
			{
				var ntype = this.intype[i].slice(1);
				while(variables.length)
				{
					if(variables[0].tok.outtype==ntype || ntype=='?' || variables[0].tok.outtype=='?')
						variables = variables.slice(1);
					else
						return false;
				}
			}else{
				if(variables.length==0)
					return false;

				if(variables[0].tok.outtype==this.intype[i] || this.intype[i]=='?' || variables[0].tok.outtype=='?')
					variables = variables.slice(1);
				else
					return false;
			}
		}
		if(variables.length>0)	//too many args supplied
			return false;
		else
			return true;
	};

	this.evaluate = options.evaluate || function(args,variables,functions)
	{
		var nargs = [];
		for(var i=0; i<args.length; i++)
			nargs.push(jme.evaluate(args[i],variables,functions).value);

		var result = this.fn.apply(null,nargs);

		return new this.outcons(result);
	}	

	this.description = options.description || '';
}

var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;

// the built-in operations and functions
var builtins = jme.builtins = {};

builtins['eval'] = [{name: 'eval',
					intype: ['?'],
					outtype: '?',
					typecheck: function(){return true;}
	}];

var funcs = {};

new funcObj('_', ['?','?'], function(){return new TNum(0);},
	{description: "Special character to create subscripts (deprecated)"}
);

new funcObj('+u', [TNum], TNum, function(a){return a;},
	{description: "Unary addition"}
);	

new funcObj('-u', [TNum], TNum, math.negate,
	{description: "Negation"}
);

new funcObj('+', [TNum,TNum], TNum, math.add,
	{description: "Add two numbers together"}
);

new funcObj('+', [TList,TList], TList, null, {
	evaluate: function(args,variables,functions)
	{
		var list0 = jme.evaluate(args[0],variables,functions);
		var list1 = jme.evaluate(args[1],variables,functions);
		var value = list0.value.concat(list1.value);
		return new TList(value.length,value);
	},

	description: "Concatenate two lists"
});

new funcObj('+',[TList,'?'],TList, null, {
	evaluate: function(args,variables,functions)
	{
		var list = jme.evaluate(args[0],variables,functions);
		var item = jme.evaluate(args[1],variables,functions);
		var value = list.value.slice();
		value.push(item);
		return new TList(value.length,value);
	},

	description: "Add an item to a list"
});

var fconc = function(a,b) { return a+b; }

new funcObj('+', [TString,'?'], TString, fconc,
	{description: '_string_ + _anything else_ is string concatenation.'}
);
new funcObj('+', ['?',TString], TString, fconc,
	{description: '_string_ + _anything else_ is string concatenation.'}
);
new funcObj('+', [TVector,TVector], TVector, vectormath.add,
	{description: 'Add two vectors.'}		
);
new funcObj('+', [TMatrix,TMatrix], TMatrix, matrixmath.add,
	{description: 'Add two matrices.'}
);

new funcObj('-', [TNum,TNum], TNum, math.sub,
	{description: 'Subtract one number from another.'}
);
new funcObj('-', [TVector,TVector], TVector, vectormath.sub,
	{description: 'Subtract one vector from another.'}
);
new funcObj('-', [TMatrix,TMatrix], TMatrix, matrixmath.sub,
	{description: 'Subtract one matrix from another.'}
);
new funcObj('*', [TNum,TNum], TNum, math.mul );
new funcObj('*', [TNum,TVector], TVector, vectormath.mul);
new funcObj('*', [TMatrix,TVector], TVector, vectormath.matrixmul);
new funcObj('*', [TNum,TMatrix], TMatrix, matrixmath.scalarmul);
new funcObj('*', [TMatrix,TMatrix], TMatrix, matrixmath.mul);
new funcObj('/', [TNum,TNum], TNum, math.div );
new funcObj('^', [TNum,TNum], TNum, math.pow );

new funcObj('dot',[TVector,TVector],TNum,vectormath.dot);
new funcObj('dot',[TMatrix,TVector],TNum,vectormath.dot);
new funcObj('dot',[TVector,TMatrix],TNum,vectormath.dot);
new funcObj('dot',[TMatrix,TMatrix],TNum,vectormath.dot);
new funcObj('cross',[TVector,TVector],TVector,vectormath.cross);
new funcObj('cross',[TMatrix,TVector],TVector,vectormath.cross);
new funcObj('cross',[TVector,TMatrix],TVector,vectormath.cross);
new funcObj('cross',[TMatrix,TMatrix],TVector,vectormath.cross);
new funcObj('det', [TMatrix], TNum, matrixmath.abs);

new funcObj('transpose',[TVector],TMatrix, vectormath.transpose);
new funcObj('transpose',[TMatrix],TMatrix, matrixmath.transpose);

new funcObj('id',[TNum],TMatrix, matrixmath.id);

new funcObj('..', [TNum,TNum], TRange, math.defineRange );	//define a range
new funcObj('#', [TRange,TNum], TRange, math.rangeSteps );	//define step size for range

new funcObj('<', [TNum,TNum], TBool, math.lt );
new funcObj('>', [TNum,TNum], TBool, math.gt );
new funcObj('<=', [TNum,TNum], TBool, math.leq );
new funcObj('>=', [TNum,TNum], TBool, math.geq );
new funcObj('<>', [TNum,TNum], TBool, math.neq );
new funcObj('<>', [TVector,TVector], TVector, vectormath.neq );
new funcObj('<>', [TMatrix,TMatrix], TBool, matrixmath.neq);
new funcObj('<>', ['?','?'], TBool, function(a,b){ return a!=b; } );
new funcObj('=', [TNum,TNum], TBool, math.eq );
new funcObj('=', [TVector,TVector], TBool, vectormath.eq);
new funcObj('=', [TMatrix,TMatrix], TBool, matrixmath.eq);
new funcObj('=', [TName,TName], TBool, function(a,b){ return a==b; });
new funcObj('=', ['?','?'], TBool, function(a,b){ return a==b; } );

new funcObj('&&', [TBool,TBool], TBool, function(a,b){return a&&b;} );
new funcObj('not', [TBool], TBool, function(a){return !a;} );	
new funcObj('||', [TBool,TBool], TBool, function(a,b){return a||b;} );
new funcObj('xor', [TBool,TBool], TBool, function(a,b){return (a || b) && !(a && b);} );

new funcObj('hour24', [], TNum, date.getHours );
new funcObj('hour', [], TNum, function(){return (date.getHours() % 12);} );
new funcObj('ampm', [], TBool, function(){return (date.getHours() >= 12);} );
new funcObj('minute', [], TNum, date.getMinutes );
new funcObj('second', [], TNum, date.getSeconds );
new funcObj('msecond', [], TNum, date.getMilliseconds );
new funcObj('dayofweek', [], TNum, date.getDay );

new funcObj('abs', [TNum], TNum, math.abs );
new funcObj('abs', [TList], TNum, function(l) { return l.length; });
new funcObj('abs', [TRange], TNum, function(r) { return (r[1]-r[0])/r[2]+1; });
new funcObj('abs', [TVector], TNum, vectormath.abs);
new funcObj('arg', [TNum], TNum, math.arg );
new funcObj('re', [TNum], TNum, math.re );
new funcObj('im', [TNum], TNum, math.im );
new funcObj('conj', [TNum], TNum, math.conjugate );

new funcObj('isint',[TNum],TBool, function(a){ return util.isInt(a); });

new funcObj('sqrt', [TNum], TNum, math.sqrt );
new funcObj('ln', [TNum], TNum, math.log );
new funcObj('log', [TNum], TNum, math.log10 );
new funcObj('exp', [TNum], TNum, math.exp );
new funcObj('fact', [TNum], TNum, math.factorial );
new funcObj('sin', [TNum], TNum, math.sin );
new funcObj('cos', [TNum], TNum, math.cos );
new funcObj('tan', [TNum], TNum, math.tan );
new funcObj('cosec', [TNum], TNum, math.cosec );
new funcObj('sec', [TNum], TNum, math.sec );
new funcObj('cot', [TNum], TNum, math.cot );
new funcObj('arcsin', [TNum], TNum, math.arcsin );
new funcObj('arccos', [TNum], TNum, math.arccos );
new funcObj('arctan', [TNum], TNum, math.arctan );
new funcObj('sinh', [TNum], TNum, math.sinh );
new funcObj('cosh', [TNum], TNum, math.cosh );
new funcObj('tanh', [TNum], TNum, math.tanh );
new funcObj('cosech', [TNum], TNum, math.cosech );
new funcObj('sech', [TNum], TNum, math.sech );
new funcObj('coth', [TNum], TNum, math.coth );
new funcObj('arcsinh', [TNum], TNum, math.arcsinh );
new funcObj('arccosh', [TNum], TNum, math.arccosh );
new funcObj('arctanh', [TNum], TNum, math.arctanh );
new funcObj('ceil', [TNum], TNum, math.ceil );
new funcObj('floor', [TNum], TNum, math.floor );
new funcObj('trunc', [TNum], TNum, math.trunc );
new funcObj('fract', [TNum], TNum, math.fract );
new funcObj('degrees', [TNum], TNum, math.degrees );
new funcObj('radians', [TNum], TNum, math.radians );
new funcObj('round', [TNum], TNum, math.round );
new funcObj('sign', [TNum], TNum, math.sign );
new funcObj('random', [TRange], TNum, math.random );

new funcObj('random',[TList],'?',null, {
	evaluate: function(args,variables,functions) 
	{
		var l = jme.evaluate(args[0],variables,functions);
		return math.choose(l.value);
	}
});

//to pick at random from a list of any data type
new funcObj( 'random',[],'?', null, {
	typecheck: function() { return true; },
	evaluate: function(args,variables,functions) { return jme.evaluate(math.choose(args),variables,functions);}
});

new funcObj('mod', [TNum,TNum], TNum, function(a,b){return a%b;} );
new funcObj('max', [TNum,TNum], TNum, math.max );
new funcObj('min', [TNum,TNum], TNum, math.min );
new funcObj('precround', [TNum,TNum], TNum, math.precround );
new funcObj('siground', [TNum,TNum], TNum, math.siground );
new funcObj('perm', [TNum,TNum], TNum, math.permutations );
new funcObj('comb', [TNum,TNum], TNum, math.combinations );
new funcObj('root', [TNum,TNum], TNum, math.root );
new funcObj('award', [TNum,TBool], TNum, function(a,b){return (b?a:0);} );
new funcObj('gcd', [TNum,TNum], TNum, math.gcf );
new funcObj('lcm', [TNum,TNum], TNum, math.lcm );
new funcObj('|', [TNum,TNum], TBool, math.divides );

new funcObj('diff', ['?','?',TNum], '?');
new funcObj('pdiff', ['?','?',TNum], '?');
new funcObj('int', ['?','?'], '?');
new funcObj('defint', ['?','?',TNum,TNum], '?');

//if needs to be a bit different because it can return any type
new funcObj('if', [TBool,'?','?'], '?',null, {
	evaluate: function(args,variables,functions)
	{
		var test = jme.evaluate(args[0],variables,functions).value;

		if(test)
			return jme.evaluate(args[1],variables,functions);
		else
			return jme.evaluate(args[2],variables,functions);
	}
});

new funcObj('switch',[],'?', null, {
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
			switch(variables[i].tok.outtype)
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
	evaluate: function(args,variables,functions)
	{
		for(var i=0; i<args.length-1; i+=2 )
		{
			var result = jme.evaluate(args[i],variables,functions).value;
			if(result)
				return jme.evaluate(args[i+1],variables,functions);
		}
		if(args.length % 2 == 1)
			return jme.evaluate(args[args.length-1],variables,functions);
		else
			throw(new Numbas.Error('jme.func.switch.no default case'));
	}
});

new funcObj('isa',['?',TString],TBool, null, {
	evaluate: function(args,variables,functions)
	{
		var kind = jme.evaluate(args[1],variables,functions).value;
		if(args[0].tok.type=='name' && variables[args[0].tok.name.toLowerCase()]==undefined )
			return new TBool(kind=='name');

		var match = false;
		if(kind=='complex')
		{
			if(args[0].tok.type=='number' && v.value.complex)
				match = true
		}
		else
		{
			var match = args[0].tok.type == kind;
		}
		return new TBool(match);
	}
});

// repeat(expr,n) evaluates expr n times and returns a list of the results
new funcObj('repeat',['?',TNum],TList, null, {
	evaluate: function(args,variables,functions)
	{
		var size = jme.evaluate(args[1],variables,functions).value;
		var l = new TList(size,[]);
		for(var i=0;i<size;i++)
		{
			l.value[i] = jme.evaluate(args[0],variables,functions);
		}
		return l;
	}
});

new funcObj('listval',[TList,TNum],'?', null, {
	evaluate: function(args,variables,functions)
	{
		var index = jme.evaluate(args[1],variables,functions).value;
		var list = jme.evaluate(args[0],variables,functions);
		if(index<0)
			index += list.vars;
		if(index in list.value)
			return list.value[index];
		else
			throw(new Numbas.Error('jme.func.listval.invalid index',index,list.value.length));
	}
});

new funcObj('listval',[TList,TRange],TList, null, {
	evaluate: function(args,variables,functions)
	{
		var range = jme.evaluate(args[1],variables,functions).value;
		var list = jme.evaluate(args[0],variables,functions);
		var start = range[0];
		var end = range[1];
		var size = list.vars;
		if(start<0)
			start += size;
		if(end<0)
			end += size;
		var value = list.value.slice(start,end);
		return new TList(value.length,value);
	}
});

new funcObj('listval',[TVector,TNum],TNum, null, {
	evaluate: function(args,variables,functions)
	{
		var index = jme.evaluate(args[1],variables,functions).value;
		var vector = jme.evaluate(args[0],variables,functions);
		return new TNum(vector.value[index] || 0);
	}
});

new funcObj('listval',[TMatrix,TNum],TVector, null, {
	evaluate: function(args,variables,functions)
	{
		var index = jme.evaluate(args[1],variables,functions).value;
		var matrix = jme.evaluate(args[0],variables,functions);
		return new TVector(matrix.value[index] || []);
	}
});

new funcObj('map',['?',TName,TList],TList, null, {
	evaluate: function(args,variables,functions)
	{
		var list = jme.evaluate(args[2],variables,functions);
		var newlist = new TList(list.size,[]);
		var name = args[1].tok.name;
		variables = util.copyobj(variables);
		for(var i=0;i<list.value.length;i++)
		{
			variables[name] = list.value[i];
			newlist.value[i] = jme.evaluate(args[0],variables,functions);
		}
		return newlist;
	}
});

new funcObj('map',['?',TName,TRange],TList, null, {
	evaluate: function(args,variables,functions)
	{
		var range = jme.evaluate(args[2],variables,functions);
		var name = args[1].tok.name;
		var newlist = new TList(range.size);
		newlist.value = new Array(range.size);
		var variables = Numbas.util.copyobj(variables);
		for(var i=3;i<range.value.length;i++)
		{
			variables[name] = new TNum(range.value[i]);
			newlist.value[i-3] = jme.evaluate(args[0],variables,functions);
		}
		return newlist;
	}
});

new funcObj('sort',[TList],TList, null, {
	evaluate: function(args,variables,functions)
	{
		var list = jme.evaluate(args[0],variables,functions);
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

new funcObj('vector',['*TNum'],TVector, null, {
	evaluate: function(args,variables,functions)
	{
		var value = [];
		for(var i=0;i<args.length;i++)
		{
			value.push(jme.evaluate(args[i],variables,functions).value);
		}
		return new TVector(value);
	}
});

new funcObj('vector',[TList],TVector, null, {
	evaluate: function(args,variables,functions)
	{
		var list = jme.evaluate(args[0],variables,functions);
		var value = list.value.map(function(x){return x.value});
		return new TVector(value);
	}
});

new funcObj('matrix',['*list'],TMatrix, null, {
	evaluate: function(args,variables,functions)
	{
		var rows = args.length;
		var columns = 0;
		var value = [];
		for(var i=0;i<args.length;i++)
		{
			var row = jme.evaluate(args[i],variables,functions).value;
			value.push(row.map(function(x){return x.value}));
			columns = Math.max(columns,row.length);
		}
		value.rows = rows;
		value.columns = columns;
		return new TMatrix(value);
	}
});

new funcObj('rowvector',['*number'],TMatrix, null, {
	evaluate: function(args,variables,functions)
	{
		var row = [];
		for(var i=0;i<args.length;i++)
		{
			row.push(jme.evaluate(args[i],variables,functions).value);
		}
		var matrix = [row];
		matrix.rows = 1;
		matrix.columns = row.length;
		return new TMatrix(matrix);
	}
});

new funcObj('list',[TVector],TList,null, {
	evaluate: function(args,variables,functions)
	{
		var vector = jme.evaluate(args[0],variables,functions);
		var value = vector.value.map(function(n){ return new TNum(n)});
		return new TList(value.length,value);
	},
	usage: ['list(vector(0,1,2))','list(vector)'],
	description: 'Cast a vector to a list.'
});

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
		if( (name=array1[i][0])!='$' && !array2.contains(name) )
			return false;
	}
	
	return true;
};

var checkingFunctions = 
{
	absdiff: function(r1,r2,tolerance) 
	{
		// finds absolute difference between values, fails if bigger than tolerance
		return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
	},

	reldiff: function(r1,r2,tolerance) {
		// fails if (r1/r2 - 1) is bigger than tolerance
		if(r2!=0) {
			return math.leq(Math.abs(math.sub(r1,r2)), Math.abs(math.mul(tolerance,r2)));
		} else {	//or if correct answer is 0, checks abs difference
			return math.leq(Math.abs(math.sub(r1,r2)), tolerance);
		}
	},

	dp: function(r1,r2,tolerance) {
		//rounds both values to 'tolerance' decimal places, and fails if unequal 
		tolerance = Math.floor(Math.abs(tolerance));
		return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
	},

	sigfig: function(r1,r2,tolerance) {
		//rounds both values to 'tolerance' sig figs, and fails if unequal
		tolerance = Math.floor(Math.abs(tolerance));
		return math.eq(math.siground(r1,tolerance), math.siground(r2,tolerance));
	}
};

var findvars = jme.findvars = function(tree,boundvars)
{
	if(boundvars===undefined)
		boundvars = [];

	if(tree.tok.type=='function' && tree.tok.name=='map')
	{
		boundvars = boundvars.slice();
		boundvars.push(tree.args[1].tok.name.toLowerCase());
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
			var bits = jme.texsplit(tree.tok.value);
			var out = [];
			for(var i=0;i<bits.length-3;i+=4)
			{
				var cmd = bits[i+1];
				var expr = bits[i+3];
				switch(cmd)
				{
				case 'var':
					var tree2 = jme.compile(expr,{},true);
					out = out.merge(findvars(tree2,boundvars));
					break;
				case 'simplify':
					var sbits = splitbrackets(expr,'{','}');
					for(var i=1;i<sbits.length-1;i+=2)
					{
						var tree2 = jme.compile(sbits[i],{},true);
						out = out.merge(findvars(tree2,boundvars));
					}
					break;
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


function resultsEqual(r1,r2,checkingFunction,checkingAccuracy)
{	// first checks both expressions are of same type, then uses given checking type to compare results

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
			if(!resultsEqual(v1[i],v2[i],checkingFunction,checkingAccuracy))
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
				if(!resultsEqual(v1[i][j]||0,v2[i][j]||0,checkingFunction,checkingAccuracy))
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
		return v1 == v2;
	}
};

});
