
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
var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;

var re_whitespace = '[\\s \\f\\n\\r\\t\\v\\u00A0\\u2028\\u2029]';
var re_strip_whitespace = new RegExp('^'+re_whitespace+'+|'+re_whitespace+'+$','g');

var jme = Numbas.jme = {

	constants: {
		'e': Math.E,
		'pi': Math.PI,
		'i': math.complex(0,1),
		'infinity': Infinity,
		'infty': Infinity
	},

	tokenise: function(expr)
	//takes a string in and returns a list of tokens 
	{
		if(!expr)
			return [];

		expr += '';
		
		var oexpr = expr;

		expr = expr.replace(re_strip_whitespace, '');	//get rid of whitespace

		var tokens = [];
		var i = 0;
		var re_bool = /^true|^false/i;
		var re_number = /^[0-9]+(?:\x2E[0-9]+)?/;
		var re_name = /^{?((?:(?:[a-zA-Z]+):)*)((?:\$?[a-zA-Z][a-zA-Z0-9]*'*)|\?)}?/i;
		var re_op = /^(_|\.\.|#|<=|>=|<>|&&|\|\||[\|*+\-\/\^<>=!&]|(?:(not|and|or|xor|isa|except)([^a-zA-Z0-9]|$)))/i;
		var re_punctuation = /^([\(\),\[\]])/;
		var re_string = /^(['"])((?:[^\1\\]|\\.)*?)\1/;
		var re_special = /^\\\\([%!+\-\,\.\/\:;\?\[\]=\*\&<>\|~\(\)]|\d|([a-zA-Z]+))/;
		
		while( expr.length )
		{
			expr = expr.replace(re_strip_whitespace, '');	//get rid of whitespace
		
			var result;
			var token;
			if(result = expr.match(re_number))
			{
				token = new TNum(result[0]);

				if(tokens.length>0 && (tokens[tokens.length-1].type==')' || tokens[tokens.length-1].type=='name'))	//right bracket followed by a number is interpreted as multiplying contents of brackets by number
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
					var lname = name.toLowerCase();
					// fill in constants here to avoid having more 'variables' than necessary
					if(lname in jme.constants) {
						token = new TNum(jme.constants[lname]);
					}else{
						token = new TName(name);
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
				var str = result[2];
				str = str.replace(/\\n/g,'\n').replace(/\\(["'])/g,'$1');

				token = new TString(str);
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
				throw(new Numbas.Error('jme.tokenise.invalid',oexpr));
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

	shunt: function(tokens,scope)
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
					throw(new Numbas.Error('jme.shunt.not enough arguments',tok.name || tok.type));

				var thing = {tok: tok,
							 args: output.slice(output.length-tok.vars)};
				output = output.slice(0,output.length-tok.vars);
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
				if(scope.variables[name]===undefined)
				{
					if(allowUnbound)
						return {tok: new TName(name)};
					else
						throw new Numbas.Error('jme.substituteTree.undefined variable',name);
				}
				else
				{
					if(scope.variables[name].tok)
						return scope.variables[name];
					else
						return {tok: scope.variables[name]};
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
				tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound);
			return tree;
		}
	},

	bind: function(tree,scope)
	{
		if(tree.bound)
			return
		if(tree.args)
		{
			for(var i=0;i<tree.args.length;i++)
				jme.bind(tree.args[i],scope);
		}

		jme.typecheck(tree,scope);
		tree.tok.bound = true;
	},

	evaluate: function(tree,scope)
	{
		//if a string is given instead of an expression tree, compile it to a tree
		if( typeof(tree)=='string' )
			tree = jme.compile(tree,scope);
		if(!tree)
			return null;


		tree = jme.substituteTree(tree,scope,true);
		jme.bind(tree,scope);

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
					value[i] = jme.evaluate(tree.args[i],scope);
				}
				tok = new TList(value);
			}
			return tok;
		case 'string':
			return new TString(jme.contentsubvars(tok.value,scope));
		case 'name':
			if(tok.name.toLowerCase() in scope.variables)
				return scope.variables[tok.name.toLowerCase()];
			else
				return tok;
			break;
		case 'op':
		case 'function':
			return tok.fn.evaluate(tree.args,scope);
		default:
			return tok;
		}
	},

	compile: function(expr,scope,notypecheck) 
	{
		expr+='';	//make sure expression is a string and not a number or anything like that

		if(!expr.trim().length)
			return null;
		//typecheck
		scope = new Scope(scope);

		//tokenise expression
		var tokens = jme.tokenise(expr);

		//compile to parse tree
		var tree = jme.shunt(tokens,scope);

		if(tree===null)
			return;

		if(!notypecheck)
			jme.typecheck(tree,scope);	//will throw an error if there is a type problem

		return(tree);nop
	},

	typecheck: function(tree,scope)
	{
		if(tree.bound)
			return true;

		tree.tok.bound = true;

		if(tree.args!=undefined)
		{
			for(var i=0;i<tree.args.length;i++)
			{
				jme.typecheck(tree.args[i],scope);
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

			if(scope.functions[op]===undefined)
			{
				if(tok.type=='function') {
					//check if the user typed something like xtan(y), when they meant x*tan(y)
					var possibleOp = op.slice(1);
					if(op.slice(1) in scope.functions)
						throw(new Numbas.Error('jme.typecheck.function maybe implicit multiplication',op,op[0],op.slice(1)));
					else
						throw(new Numbas.Error('jme.typecheck.function not defined',op,op));
				}
				else
					throw(new Numbas.Error('jme.typecheck.op not defined',op));
			}

			var result = undefined;

			for(var j=0;j<scope.functions[op].length; j++)
			{
				var fn = scope.functions[op][j];
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

	compare: function(expr1,expr2,settings,scope) {
		expr1 += '';
		expr2 += '';

		var compile = jme.compile, evaluate = jme.evaluate;

		var checkingFunction = checkingFunctions[settings.checkingType.toLowerCase()];	//work out which checking type is being used

		try {
			var tree1 = compile(expr1,scope);
			var tree2 = compile(expr2,scope);

			if(tree1 == null || tree2 == null) 
			{	//one or both expressions are invalid, can't compare
				return false; 
			}

			//find variable names used in both expressions - can't compare if different
			var vars1 = findvars(tree1);
			var vars2 = findvars(tree2);

			for(var v in scope.variables)
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
					var nscope = new jme.Scope([scope,{variables:rs[i]}]);
					util.copyinto(scope.variables,rs[i]);
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

	contentsubvars: function(str, scope)
	{
		var bits = util.contentsplitbrackets(str);	//split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
		var out='';
		for(var i=0; i<bits.length; i++)
		{
			switch(i % 4)
			{
			case 0:	//plain text - variables inserted by expressions in curly braces
				out += jme.subvars(bits[i],scope,true);
				break;
			case 2:	//a TeX expression - variables inserted with \var and \simplify commands
				out += jme.texsubvars(bits[i],scope)
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
				throw(new Numbas.Error('jme.texsubvars.no right brace',cmd));

			var expr = s.slice(si,i);
			s = s.slice(i+1);
			out.push(expr);
		}
		out.push(s);
		return out;
	},

	texsubvars: function(s,scope)
	{
		var bits = jme.texsplit(s);
		var out = '';
		for(var i=0;i<bits.length-3;i+=4)
		{
			out+=bits[i];
			var cmd = bits[i+1],
				args = bits[i+2],
				expr = bits[i+3];

			if(expr.length)
			{
				switch(cmd)
				{
				case 'var':	//substitute a variable
					var v = jme.evaluate(jme.compile(expr,scope),scope);
					v = jme.display.texify({tok: v});
					out += ' '+v+' ';
					break;
				case 'simplify': //a JME expression to be simplified
					expr = jme.subvars(expr,scope);
					var tex = jme.display.exprToLaTeX(expr,args,scope);
					out += ' '+tex+' ';
					break;
				}
			}
			else
				out+=' ';
		}
		return out+bits[bits.length-1];
	},

	//substitutes variables into a string "text {expr1} text {expr2} ..."
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

				out += v;
			}
			else
			{
				out+=bits[i];
			}
		}
		return out;
	}
};

//evaluation environment
//if called with a list of scopes, they will be combined into this new one
var fnSort = util.sortBy('id');
var ruleSort = util.sortBy('patternString');
var Scope = jme.Scope = function(scopes) {
	this.variables = {};
	this.functions = {};
	this.rulesets = {};

	if(scopes===undefined)
		return;

	if(!$.isArray(scopes))
		scopes = [scopes];

	for(var i=0;i<scopes.length;i++) {
		var scope = scopes[i];
		if(scope) {
			if('variables' in scope) {
				for(var x in scope.variables) {
					this.variables[x] = scope.variables[x];
				}
			}
			if('functions' in scope) {
				for(var x in scope.functions) {
					if(!(x in this.functions))
						this.functions[x] = scope.functions[x].slice();
					else 
						this.functions[x] = this.functions[x].merge(scope.functions[x],fnSort);
				}
			}
			if('rulesets' in scope) {
				for(var x in scope.rulesets) {
					if(!(x in this.rulesets))
						this.rulesets[x] = scope.rulesets[x].slice();
					else
						this.rulesets[x] = this.rulesets[x].merge(scope.rulesets[x],ruleSort);
				}
			}
		}
	}
}
Scope.prototype = {
	addFunction: function(fn) {
		if(!(fn.name in this.functions))
			this.functions[fn.name] = [fn];
		else
			this.functions[fn.name].push(fn);
	}
};

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
TNum.doc = {
	name: 'number',
	usage: ['0','1','0.234','i','e','pi'],
	description: "@i@, @e@, @infinity@ and @pi@ are reserved keywords for the imaginary unit, the base of the natural logarithm, $\\infty$ and $\\pi$, respectively."
};

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

var THTML = types.THTML = types.html = function(html) {
	this.value = $(html);
}
THTML.prototype.type = 'html';
THTML.doc = {
	name: 'html',
	usage: ['html(\'<div>things</div>\')'],
	description: "An HTML DOM node."
}


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

var TVector = types.TVector = types.vector = function(value)
{
	this.value = value;
}
TVector.prototype.type = 'vector';
TVector.doc = {
	name: 'vector',
	usage: ['vector(1,2)','vector([1,2,3,4])'],
	description: 'The components of a vector must be numbers.\n\n When combining vectors of different dimensions, the smaller vector is padded with zeroes to make up the difference.'
}

var TMatrix = types.TMatrix = types.matrix = function(value)
{
	this.value = value;
}
TMatrix.prototype.type = 'matrix';
TMatrix.doc = {
	name: 'matrix',
	usage: ['matrix([1,2,3],[4,5,6])','matrix(row1,row2)'],
	description: "Matrices are constructed from lists of numbers, representing the rows.\n\n When combining matrices of different dimensions, the smaller matrix is padded with zeroes to make up the difference."
}

var TRange = types.TRange = types.range = function(range)
{
	this.value = range;
	if(this.value!==undefined)
	{
		var start = this.value[0], end = this.value[1], step = this.value[2];

		//if range is discrete, store all values in range so they don't need to be computed each time
		if(step != 0)
		{
			var n = (end-start)/step;
			this.size = n+1;
			for(var i=0;i<=n;i++)
			{
				this.value[i+3] = start+i*step;
			}
		}
	}
}
TRange.prototype.type = 'range';
TRange.doc = {
	name: 'range',
	usage: ['1..3','1..3#0.1',';1..3#0'],
	description: 'A range @a..b#c@ represents the set of numbers $\{a+nc | 0 \leq n \leq \frac{b-a}{c} \}$. If the step size is zero, then the range is the continuous interval $\[a,b\]$.'
}

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
	'!': 'not'
}
var postfixForm = {
	'!': 'fact'
}

var precedence = jme.precedence = {
	'_': 0,
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
	'<': 7,
	'>': 7,
	'<=': 7,
	'>=': 7,
	'<>': 8,
	'=': 8,
	'isa': 9,
	'and': 11,
	'or': 12,
	'xor': 13
};

var synonyms = {
	'&':'and',
	'&&':'and',
	'divides': '|',
	'||':'or',
	'sqr':'sqrt',
	'gcf': 'gcd',
	'sgn':'sign',
	'len': 'abs',
	'length': 'abs',
	'verb': 'verbatim'
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
	'and': true
};


//function object - for doing type checking away from the evaluator
//intype is a list of data type constructors (TNum, etc.) for function's parameters' types
//use the string '?' to match any type
//put a * in front of the type name to 
//outtype is the type constructor corresponding to the value the function returns
//fn is the function to be evaluated
//
//options can contain any of:
//	typecheck: a function which checks whether the funcObj can be applied to the given arguments 
//  evaluate: a function which performs the funcObj on given arguments and variables. Arguments are passed as expression trees, i.e. unevaluated
var funcObjAcc = 0;	//accumulator for ids for funcObjs, so they can be sorted
var funcObj = jme.funcObj = function(name,intype,outcons,fn,options)
{
	this.id = funcObjAcc++;
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

	this.evaluate = options.evaluate || function(args,scope)
	{
		var nargs = [];
		for(var i=0; i<args.length; i++) {
			var result = jme.evaluate(args[i],scope);
			if(options.unwrapLists && result.type=='list') {
				var value = result.value.map(function(v){
					return v.value;
				});
				nargs.push(value);
			}else
				nargs.push(result.value);
		}

		var result = this.fn.apply(null,nargs);

		return new this.outcons(result);
	}	

	this.doc = options.doc;
}

// the built-in operations and functions
var builtinScope = jme.builtinScope = new Scope();

builtinScope.functions['eval'] = [{
	name: 'eval',
	intype: ['?'],
	outtype: '?',
	typecheck: function(){return true;},
	doc: {
		usage: ['eval(x+2)'],
		description: 'Dummy function used by simplification rules to evaluate an expression.'
	}
}];

var funcs = {};

function newBuiltin(name,intype,outcons,fn,options) {
	return builtinScope.addFunction(new funcObj(name,intype,outcons,fn,options));
}

newBuiltin('_', ['?','?'], '?', null, {doc: {usage: 'x_i', description: "Special character to create subscripts. (deprecated)", tags: ['subscript','index']}});
newBuiltin('+u', [TNum], TNum, function(a){return a;}, {doc: {usage: '+x', description: "Unary addition.", tags: ['plus','positive']}});	
newBuiltin('-u', [TNum], TNum, math.negate, {doc: {usage: '-x', description: "Negation.", tags: ['minus','negative','negate']}});
newBuiltin('+', [TNum,TNum], TNum, math.add, {doc: {usage: 'x+y', description: "Add two numbers together.", tags: ['plus','add','addition']}});

newBuiltin('+', [TList,TList], TList, null, {
	evaluate: function(args,scope)
	{
		var list0 = jme.evaluate(args[0],scope);
		var list1 = jme.evaluate(args[1],scope);
		var value = list0.value.concat(list1.value);
		return new TList(value);
	},

	doc: {
		usage: ['list1+list2','[1,2,3]+[4,5,6]'],
		description: "Concatenate two lists.",
		tags: ['join','append','concatenation']
	}
});

newBuiltin('+',[TList,'?'],TList, null, {
	evaluate: function(args,scope)
	{
		var list = jme.evaluate(args[0],scope);
		var item = jme.evaluate(args[1],scope);
		var value = list.value.slice();
		value.push(item);
		return new TList(value);
	},

	doc: {
		usage: ['list+3','[1,2] + 3'],
		description: "Add an item to a list",
		tags: ['push','append','insert']
	}
});

var fconc = function(a,b) { return a+b; }
newBuiltin('+', [TString,'?'], TString, fconc, {doc: {usage: '\'Hello \' + name', description: '_string_ + _anything else_ is string concatenation.', tags: ['concatenate','concatenation','add','join','strings','plus']}});
newBuiltin('+', ['?',TString], TString, fconc, {doc: {usage: 'name + \' is OK.\'', description: '_string_ + _anything else_ is string concatenation.', tags: ['concatenate','concatenation','add','join','strings','plus']}});

newBuiltin('+', [TVector,TVector], TVector, vectormath.add, {doc: {usage: 'vector(1,2) + vector(0,1)', description: 'Add two vectors.', tags: ['addition','plus']}});
newBuiltin('+', [TMatrix,TMatrix], TMatrix, matrixmath.add, {doc: {usage: 'matrix([1,0],[0,1]) + matrix([2,2],[2,2])', description: 'Add two matrices.', tags: ['addition','plus']}});
newBuiltin('-', [TNum,TNum], TNum, math.sub, {doc: {usage: ['x-y','2 - 1'], description: 'Subtract one number from another.', tags: ['minus','take away','subtraction']}});
newBuiltin('-', [TVector,TVector], TVector, vectormath.sub, {doc: {usage: 'vector(1,2) - vector(2,3)', description: 'Subtract one vector from another.', tags: ['subtraction','minus','take away']}});
newBuiltin('-', [TMatrix,TMatrix], TMatrix, matrixmath.sub, {doc: {usage: 'matrix([1,1],[2,3]) - matrix([3,3],[2,2])', description: 'Subtract one matrix from another.', tags: ['subtraction','minus','take away']}});
newBuiltin('*', [TNum,TNum], TNum, math.mul, {doc: {usage: ['3x','3*x','x*y','x*3'], description: 'Multiply two numbers.', tags: ['multiplication','compose','composition','times']}} );
newBuiltin('*', [TNum,TVector], TVector, vectormath.mul, {doc: {usage: '3*vector(1,2,3)', description: 'Multiply a vector on the left by a scalar.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('*', [TVector,TNum], TVector, function(a,b){return vectormath.mul(b,a)}, {doc: {usage: 'vector(1,2,3) * 3', description: 'Multiply a vector on the right by a scalar.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('*', [TMatrix,TVector], TVector, vectormath.matrixmul, {doc: {usage: 'matrix([1,0],[0,1]) * vector(1,2)', description: 'Multiply a matrix by a vector.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('*', [TNum,TMatrix], TMatrix, matrixmath.scalarmul, {doc: {usage: '3*matrix([1,0],[0,1])', description: 'Multiply a matrix on the left by a scalar.', tags: ['multiplication','composition','compose','times']}} );
newBuiltin('*', [TMatrix,TNum], TMatrix, function(a,b){ return matrixmath.scalarmul(b,a); }, {doc: {usage: 'matrix([1,0],[1,2]) * 3', description: 'Multiply a matrix on the right by a scalar.', tags: ['multiplication','composition','compose','times']}} );
newBuiltin('*', [TMatrix,TMatrix], TMatrix, matrixmath.mul, {doc: {usage: 'matrix([1,0],[1,1]) * matrix([2,3],[3,4])', description: 'Multiply two matrices.', tags: ['multiplication','composition','compose','times']}});
newBuiltin('/', [TNum,TNum], TNum, math.div, {doc: {usage: ['x/y','3/2'], description: 'Divide two numbers.', tags: ['division','quotient','fraction']}} );
newBuiltin('^', [TNum,TNum], TNum, math.pow, {doc: {usage: ['x^y','x^2','2^x','e^x'], description: 'Exponentiation.', tags: ['power','exponentiate','raise']}} );

newBuiltin('dot',[TVector,TVector],TNum,vectormath.dot, {doc: {usage: 'dot( vector(1,2,3), vector(2,3,4) )', description: 'Dot product of two vectors', tags: ['projection','project']}});
newBuiltin('dot',[TMatrix,TVector],TNum,vectormath.dot, {doc: {usage: 'dot( matrix([1],[2],[3]), vector(1,2,3) )', description: 'If the left operand is a matrix with one column, treat it as a vector, so we can calculate the dot product with another vector.', tags: ['projection','project']}});
newBuiltin('dot',[TVector,TMatrix],TNum,vectormath.dot, {doc: {usage: 'dot( vector(1,2,3), matrix([1],[2],[3]) )', description: 'If the right operand is a matrix with one column, treat it as a vector, so we can calculate the dot product with another vector.', tags: ['projection','project']}});
newBuiltin('dot',[TMatrix,TMatrix],TNum,vectormath.dot, {doc: {usage: 'dot( matrix([1],[2],[3]), matrix( [1],[2],[3] )', description: 'If both operands are matrices with one column, treat them as vectors, so we can calculate the dot product.', tags: ['projection','project']}});
newBuiltin('cross',[TVector,TVector],TVector,vectormath.cross, {doc: {usage: 'cross( vector(1,2,3), vector(1,2,3) )', description: 'Cross product of two vectors.'}});
newBuiltin('cross',[TMatrix,TVector],TVector,vectormath.cross, {doc: {usage: 'cross( matrix([1],[2],[3]), vector(1,2,3) )', description: 'If the left operand is a matrix with one column, treat it as a vector, so we can calculate the cross product with another vector.'}});
newBuiltin('cross',[TVector,TMatrix],TVector,vectormath.cross, {doc: {usage: 'cross( vector(1,2,3), matrix([1],[2],[3]) )', description: 'If the right operand is a matrix with one column, treat it as a vector, so we can calculate the crossproduct with another vector.'}});
newBuiltin('cross',[TMatrix,TMatrix],TVector,vectormath.cross, {doc: {usage: 'cross( matrix([1],[2],[3]), matrix([1],[2],[3]) )', description: 'If both operands are matrices with one column, treat them as vectors, so we can calculate the cross product with another vector.'}});
newBuiltin('det', [TMatrix], TNum, matrixmath.abs, {doc: {usage: 'det( matrix([1,2],[2,3]) )', description: 'Determinant of a matrix.'}});

newBuiltin('transpose',[TVector],TMatrix, vectormath.transpose, {doc: {usage: 'transpose( vector(1,2,3) )', description: 'Transpose of a vector.'}});
newBuiltin('transpose',[TMatrix],TMatrix, matrixmath.transpose, {doc: {usage: 'transpose( matrix([1,2,3],[4,5,6]) )', description: 'Transpose of a matrix.'}});

newBuiltin('id',[TNum],TMatrix, matrixmath.id, {doc: {usage: 'id(3)', description: 'Identity matrix with $n$ rows and columns.'}});

newBuiltin('..', [TNum,TNum], TRange, math.defineRange, {doc: {usage: ['a..b','1..2'], description: 'Define a range', tags: ['interval']}});
newBuiltin('#', [TRange,TNum], TRange, math.rangeSteps, {doc: {usage: ['a..b#c','0..1 # 0.1'], description: 'Set the step size for a range.'}}); 

newBuiltin('html',[TString],THTML,function(html) { return $(html) }, {doc: {usage: ['html(\'<div>things</div>\')'], description: 'Parse HTML from a string', tags: ['element','node']}});

//the next three versions of the `except` operator
//exclude numbers from a range, given either as a range, a list or a single value
newBuiltin('except', [TRange,TRange], TList,
	function(range,except) {
		if(range[2]==0)
			throw(new Numbas.Error("jme.func.except.continuous range"));
		range = range.slice(3);
		if(except[2]==0)
		{
			return range.filter(function(i){return i<except[0] || i>except[1]}).map(function(i){return new TNum(i)});
		}
		else
		{
			except = except.slice(3);
			return math.except(range,except).map(function(i){return new TNum(i)});
		}
	},

	{doc: {
		usage: '-9..9 except -1..1',
		description: 'Exclude a range of numbers from a larger range.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

newBuiltin('except', [TRange,TList], TList,
	function(range,except) {
		if(range[2]==0)
			throw(new Numbas.Error("jme.func.except.continuous range"));
		range = range.slice(3);
		except = except.map(function(i){ return i.value; });
		return math.except(range,except).map(function(i){return new TNum(i)});
	},

	{doc: {
		usage: '-9..9 except [-1,1]',
		description: 'Exclude a list of numbers from a range.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

newBuiltin('except', [TRange,TNum], TList,
	function(range,except) {
		if(range[2]==0)
			throw(new Numbas.Error("jme.func.except.continuous range"));
		range = range.slice(3);
		return math.except(range,[except]).map(function(i){return new TNum(i)});
	},

	{doc: {
		usage: '-9..9 except 0',
		description: 'Exclude a number from a range.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

//exclude numbers from a list, so use the math.except function
newBuiltin('except', [TList,TRange], TList,
	function(range,except) {
		range = range.map(function(i){ return i.value; });
		except = except.slice(3);
		return math.except(range,except).map(function(i){return new TNum(i)});
	},

	{doc: {
		usage: '[1,4,9,16,25,36] except 10..30',
		description: 'Exclude a range of numbers from a list.',
		tags: ['except', 'exclude', 'filter', 'remove', 'numbers']
	}}
);

//exclude values of any type from a list containing values of any type, so use the util.except function
newBuiltin('except', [TList,TList], TList,
	function(list,except) {
		return util.except(list,except);
	},

	{doc: {
		usage: ["['a','b','c'] except ['b','d']",'[vector(0,1),vector(1,0),vector(1,1)] except [vector(1,1),vector(2,2)]'],
		description: 'Remove elements of the second list from the first.',
		tags: ['except', 'exclude', 'filter', 'remove']
	}}
);

newBuiltin('except',[TList,'?'], TList, null, {
	evaluate: function(args,scope) {
		var list = jme.evaluate(args[0],scope).value;
		var except = jme.evaluate(args[1],scope);
		return new TList(util.except(list,[except]));
	},

  	doc: {
		usage: '[a,b,c,d] except b',
		description: 'Exclude a value from a list.',
		tags: ['except', 'exclude', 'filter', 'remove']
	}
});

newBuiltin('<', [TNum,TNum], TBool, math.lt, {doc: {usage: ['x<y','1<2'], description: 'Returns @true@ if the left operand is less than the right operand.', tags: ['comparison','inequality','numbers']}});
newBuiltin('>', [TNum,TNum], TBool, math.gt, {doc: {usage: ['x>y','2>1'], description: 'Returns @true@ if the left operand is greater than the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('<=', [TNum,TNum], TBool, math.leq, {doc: {usage: ['x <= y','1<=1'], description: 'Returns @true@ if the left operand is less than or equal to the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('>=', [TNum,TNum], TBool, math.geq, {doc: {usage: 'x >= y', description: 'Returns @true@ if the left operand is greater than or equal to the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('<>', ['?','?'], TBool, null, {
	evaluate: function(args,scope) {
		var a = jme.evaluate(args[0],scope);
		var b = jme.evaluate(args[1],scope);
		return new TBool(util.neq(a,b));
	},
	doc: {
		usage: ['\'this string\' <> \'that string\'', 'a <> b', '1<>2','sin(90)<>1'], 
		description: 'Inequality test.', 
		tags: ['comparison','not equal']
	}
});
newBuiltin('=', ['?','?'], TBool, null, {
	evaluate: function(args,scope) {
		var a = jme.evaluate(args[0],scope);
		var b = jme.evaluate(args[1],scope);
		return new TBool(util.eq(a,b));
	},
	doc: {
		usage: ['x=y','vector(1,2)=vector(1,2,0)','0.1=0.2'], 
		description: 'Equality test.', 
		tags: ['comparison','same','identical']
	}
});

newBuiltin('and', [TBool,TBool], TBool, function(a,b){return a&&b;}, {doc: {usage: ['true && true','true and true'], description: 'Logical AND.'}} );
newBuiltin('not', [TBool], TBool, function(a){return !a;}, {doc: {usage: ['not x','!x'], description: 'Logical NOT.'}} );	
newBuiltin('or', [TBool,TBool], TBool, function(a,b){return a||b;}, {doc: {usage: ['x || y','x or y'], description: 'Logical OR.'}} );
newBuiltin('xor', [TBool,TBool], TBool, function(a,b){return (a || b) && !(a && b);}, {doc: {usage: 'a xor b', description: 'Logical XOR.', tags: ['exclusive or']}} );

newBuiltin('abs', [TNum], TNum, math.abs, {doc: {usage: 'abs(x)', description: 'Absolute value of a number.', tags: ['norm','length','complex']}} );
newBuiltin('abs', [TList], TNum, function(l) { return l.length; }, {doc: {usage: 'abs([1,2,3])', description: 'Length of a list.', tags: ['size','number','elements']}});
newBuiltin('abs', [TRange], TNum, function(r) { return r[2]==0 ? Math.abs(r[0]-r[1]) : r.length-3; }, {doc: {usage: 'abs(1..5)', description: 'Number of elements in a numerical range.', tags: ['size','length']}});
newBuiltin('abs', [TVector], TNum, vectormath.abs, {doc: {usage: 'abs(vector(1,2,3))', description: 'Modulus of a vector.', tags: ['size','length','norm']}});
newBuiltin('arg', [TNum], TNum, math.arg, {doc: {usage: 'arg(1+i)', description: 'Argument of a complex number.', tags: ['angle','direction']}} );
newBuiltin('re', [TNum], TNum, math.re, {doc: {usage: 're(1 + 2i)', description: 'Real part of a complex number.'}} );
newBuiltin('im', [TNum], TNum, math.im, {doc: {usage: 'im(1 + 2i)', description: 'Imaginary part of a complex number.'}} );
newBuiltin('conj', [TNum], TNum, math.conjugate, {doc: {usage: 'conj(1 + 2i)', description: 'Conjugate of a complex number.'}} );

newBuiltin('isint',[TNum],TBool, function(a){ return util.isInt(a); }, {doc: {usage: 'isint(1)', description: 'Returns @true@ if the argument is an integer.', tags: ['test','whole number']}});

newBuiltin('sqrt', [TNum], TNum, math.sqrt, {doc: {usage: 'sqrt(x)', description: 'Square root.'}} );
newBuiltin('ln', [TNum], TNum, math.log, {doc: {usage: 'ln(x)', description: 'Natural logarithm.', tags: ['base e']}} );
newBuiltin('log', [TNum], TNum, math.log10, {doc: {usage: 'log(x)', description: 'Logarithm with base $10$.'}} );
newBuiltin('exp', [TNum], TNum, math.exp, {doc: {usage: 'exp(x)', description: 'Exponentiation. Equivalent to @e^x@. ', tags: ['exponential']}} );
newBuiltin('fact', [TNum], TNum, math.factorial, {doc: {usage: ['fact(x)','x!'], description: 'Factorial.', tags: ['!']}} );
newBuiltin('sin', [TNum], TNum, math.sin, {doc: {usage: 'sin(x)', description: 'Sine.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('cos', [TNum], TNum, math.cos, {doc: {usage: 'cos(x)', description: 'Cosine.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('tan', [TNum], TNum, math.tan, {doc: {usage: 'tan(x)', description: 'Tangent.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('cosec', [TNum], TNum, math.cosec, {doc: {usage: 'cosec(x)', description: 'Cosecant.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('sec', [TNum], TNum, math.sec, {doc: {usage: 'sec(x)', description: 'Secant.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('cot', [TNum], TNum, math.cot, {doc: {usage: 'cot(x)', description: 'Cotangent.', tags: ['trigonometric','trigonometry']}} );
newBuiltin('arcsin', [TNum], TNum, math.arcsin, {doc: {usage: 'arcsin(x)', description: 'Inverse sine.', tags: ['arcsine']}} );
newBuiltin('arccos', [TNum], TNum, math.arccos, {doc: {usage: 'arccos(x)', description: 'Inverse cosine.', tags: ['arccosine']}} );
newBuiltin('arctan', [TNum], TNum, math.arctan, {doc: {usage: 'arctan(x)', description: 'Inverse tangent.', tags: ['arctangent']}} );
newBuiltin('sinh', [TNum], TNum, math.sinh, {doc: {usage: 'sinh(x)', description: 'Hyperbolic sine.'}} );
newBuiltin('cosh', [TNum], TNum, math.cosh, {doc: {usage: 'cosh(x)', description: 'Hyperbolic cosine.'}} );
newBuiltin('tanh', [TNum], TNum, math.tanh, {doc: {usage: 'tanh(x)', description: 'Hyperbolic tangent.'}} );
newBuiltin('cosech', [TNum], TNum, math.cosech, {doc: {usage: 'cosech(x)', description: 'Hyperbolic cosecant.'}} );
newBuiltin('sech', [TNum], TNum, math.sech, {doc: {usage: 'sech(x)', description: 'Hyperbolic secant.'}} );
newBuiltin('coth', [TNum], TNum, math.coth, {doc: {usage: 'coth(x)', description: 'Hyperbolic cotangent.'}} );
newBuiltin('arcsinh', [TNum], TNum, math.arcsinh, {doc: {usage: 'arcsinh(x)', description: 'Inverse hyperbolic sine.'}} );
newBuiltin('arccosh', [TNum], TNum, math.arccosh, {doc: {usage: 'arccosh(x)', description: 'Inverse hyperbolic cosine.'}} );
newBuiltin('arctanh', [TNum], TNum, math.arctanh, {doc: {usage: 'arctanh(x)', description: 'Inverse hyperbolic tangent.'}} );
newBuiltin('ceil', [TNum], TNum, math.ceil, {doc: {usage: 'ceil(x)', description: 'Round up to nearest integer.', tags: ['ceiling']}} );
newBuiltin('floor', [TNum], TNum, math.floor, {doc: {usage: 'floor(x)', description: 'Round down to nearest integer.'}} );
newBuiltin('trunc', [TNum], TNum, math.trunc, {doc: {usage: 'trunc(x)', description: 'If the argument is positive, round down to the nearest integer; if it is negative, round up to the nearest integer.', tags: ['truncate','integer part']}} );
newBuiltin('fract', [TNum], TNum, math.fract, {doc: {usage: 'fract(x)', description: 'Fractional part of a number. Equivalent to @x-trunc(x)@.'}} );
newBuiltin('degrees', [TNum], TNum, math.degrees, {doc: {usage: 'degrees(pi/2)', description: 'Convert radians to degrees.'}} );
newBuiltin('radians', [TNum], TNum, math.radians, {doc: {usage: 'radians(90)', description: 'Convert degrees to radians.'}} );
newBuiltin('round', [TNum], TNum, math.round, {doc: {usage: 'round(x)', description: 'Round to nearest integer.', tags: ['whole number']}} );
newBuiltin('sign', [TNum], TNum, math.sign, {doc: {usage: 'sign(x)', description: 'Sign of a number. Equivalent to $\\frac{x}{|x|}$, or $0$ when $x=0$.', tags: ['positive','negative']}} );

newBuiltin('random', [TRange], TNum, math.random, {doc: {usage: 'random(1..4)', description: 'A random number in the given range.', tags: ['choose','pick']}} );

newBuiltin('random',[TList],'?',null, {
	evaluate: function(args,scope) 
	{
		var l = jme.evaluate(args[0],scope);
		return math.choose(l.value);
	},

	doc: {
		usage: 'random([1,1,2,3,5])',
		description: 'Choose a random item from a list.',
		tags: ['pick','select']
	}
});

newBuiltin( 'random',[],'?', null, {
	typecheck: function() { return true; },
	evaluate: function(args,scope) { return jme.evaluate(math.choose(args),scope);},
	doc: {
		usage: 'random(1,2,3,4,5)',
		description: 'Choose at random from the given arguments.',
		tags: ['pick','select']
	}
});

newBuiltin('mod', [TNum,TNum], TNum, function(a,b){return a%b;}, {doc: {usage: 'mod(a,b)', description: 'Modulus, i.e. $a \\bmod{b}.$', tags: ['remainder','modulo']}} );
newBuiltin('max', [TNum,TNum], TNum, math.max, {doc: {usage: 'max(x,y)', description: 'Maximum of two numbers.', tags: ['supremum','biggest','largest','greatest']}} );
newBuiltin('min', [TNum,TNum], TNum, math.min, {doc: {usage: 'min(x,y)', description: 'Minimum of two numbers.', tags: ['smallest','least']}} );
newBuiltin('precround', [TNum,TNum], TNum, math.precround, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('siground', [TNum,TNum], TNum, math.siground, {doc: {usage: 'siground(x,3)', description: 'Round to given number of significant figures.', tags: ['sig figs','sigfig']}} );
newBuiltin('perm', [TNum,TNum], TNum, math.permutations, {doc: {usage: 'perm(6,3)', description: 'Count permutations. $^n \\kern-2pt P_r$.', tags: ['combinatorics']}} );
newBuiltin('comb', [TNum,TNum], TNum, math.combinations , {doc: {usage: 'comb(6,3)', description: 'Count combinations. $^n \\kern-2pt C_r$.', tags: ['combinatorics']}});
newBuiltin('root', [TNum,TNum], TNum, math.root, {doc: {usage: ['root(8,3)','root(x,n)'], description: '$n$<sup>th</sup> root.', tags: ['cube']}} );
newBuiltin('award', [TNum,TBool], TNum, function(a,b){return (b?a:0);}, {doc: {usage: ['award(a,b)','award(5,x=y)'], description: 'If @b@ is @true@, returns @a@, otherwise returns @0@.', tags: ['mark']}} );
newBuiltin('gcd', [TNum,TNum], TNum, math.gcf, {doc: {usage: 'gcd(a,b)', description: 'Greatest common denominator of two integers.', tags: ['highest']}} );
newBuiltin('lcm', [TNum,TNum], TNum, math.lcm, {doc: {usage: 'lcm(a,b)', description: 'Lowest common multiple of two integers.', tags: ['least']}} );
newBuiltin('|', [TNum,TNum], TBool, math.divides, {doc: {usage: 'x|y', description: 'Returns @true@ if @y@ divides @x@.', tags: ['multiple of']}} );

newBuiltin('diff', ['?','?',TNum], '?', null, {doc: {usage: ['diff(f(x),x,n)', 'diff(x^2,x,1)','diff(y,x,1)'], description: '$n$<sup>th</sup> derivative. Currently for display only - can\'t be evaluated.', tags: ['differentiate','differential','differentiation']}});
newBuiltin('pdiff', ['?',TName,TNum], '?', null, {doc: {usage: ['pdiff(f(x,y),x,n)','pdiff(x+y,x,1)'], description: '$n$<sup>th</sup> partial derivative. Currently for display only - can\'t be evaluated.', tags: ['differentiate','differential','differentiation']}});
newBuiltin('int', ['?','?'], '?', null, {doc: {usage: 'int(f(x),x)', description: 'Integral. Currently for display only - can\'t be evaluated.'}});
newBuiltin('defint', ['?','?',TNum,TNum], '?', null, {doc: {usage: 'defint(f(x),y,0,1)', description: 'Definite integral. Currently for display only - can\'t be evaluated.'}});

newBuiltin('deal',[TNum],TList, 
	function(n) {
		return math.deal(n).map(function(i) {
			return new TNum(i);
		});
	},
	{doc: {
		usage: ['deal(n)','deal(5)'],
		description: 'A random shuffling of the integers $[0 \\dots n-1]$.',
		tags: ['permutation','order','shuffle']
	}}
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
	},

	doc: {
		usage: 'if(test,a,b)',
		description: 'If @test@ is true, return @a@, otherwise return @b@.',
		tags: ['test','decide']
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
	},

	doc: {
		usage: 'switch(test1,a1,test2,a2,b)',
		description: 'Select cases. Alternating boolean expressions with values to return, with the final argument representing the default case.',
		tags: ['choose','test']
	}
});

newBuiltin('isa',['?',TString],TBool, null, {
	evaluate: function(args,scope)
	{
		var kind = jme.evaluate(args[1],scope).value;
		if(args[0].tok.type=='name' && scope.variables[args[0].tok.name.toLowerCase()]==undefined )
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
	},

	doc: {
		usage: 'x isa \'number\'',
		description: 'Determine the data-type of an expression.',
		tags: ['typeof','test','is a']
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
	},

	doc: {
		usage: ['repeat(expr,n)','repeat( random(1..3), 5)'],
		description: 'Evaluate the given expression $n$ times, returning the results in a list.'
	}
});

newBuiltin('listval',[TList,TNum],'?', null, {
	evaluate: function(args,scope)
	{
		var index = jme.evaluate(args[1],scope).value;
		var list = jme.evaluate(args[0],scope);
		if(list.type!='list') {
			if(list.type=='name')
				throw(new Numbas.Error('jme.variables.variable not defined',list.name));
			else
				throw(new Numbas.Error('jme.func.listval.not a list'));
		}
		if(index<0)
			index += list.vars;
		if(index in list.value)
			return list.value[index];
		else
			throw(new Numbas.Error('jme.func.listval.invalid index',index,list.value.length));
	},

	doc: {
		usage: ['list[i]','[0,1,2,3][2]'],
		description: 'Return a particular element of a list.',
		tags: ['index','item','access']
	}
});

newBuiltin('listval',[TList,TRange],TList, null, {
	evaluate: function(args,scope)
	{
		var range = jme.evaluate(args[1],scope).value;
		var list = jme.evaluate(args[0],scope);
		var start = range[0];
		var end = range[1];
		var size = list.vars;
		if(start<0)
			start += size;
		if(end<0)
			end += size;
		var value = list.value.slice(start,end);
		return new TList(value);
	},

	doc: {
		usage: ['list[1..3]','[0,1,2,3,4][1..3]'],
		description: 'Slice a list - return the elements with indices in the given range.',
		tags: ['range','section','part']
	}
});

newBuiltin('listval',[TVector,TNum],TNum, null, {
	evaluate: function(args,scope)
	{
		var index = jme.evaluate(args[1],scope).value;
		var vector = jme.evaluate(args[0],scope);
		return new TNum(vector.value[index] || 0);
	},

	doc: {
		usage: ['vec[1]','vector(0,1,2)[1]'],
		description: 'Return a particular component of a vector.',
		tags: ['index','item','access']
	}
});

newBuiltin('listval',[TMatrix,TNum],TVector, null, {
	evaluate: function(args,scope)
	{
		var index = jme.evaluate(args[1],scope).value;
		var matrix = jme.evaluate(args[0],scope);
		return new TVector(matrix.value[index] || []);
	},

	doc: {
		usage: ['mat[1]','matrix([1,0],[0,1])[1]'],
		description: 'Return a particular row of a matrix.',
		tags: ['index','item','access','element','cell']
	}
});

newBuiltin('map',['?',TName,TList],TList, null, {
	evaluate: function(args,scope)
	{
		var list = jme.evaluate(args[2],scope);
		var value = [];
		var name = args[1].tok.name;
		scope = new Scope(scope);
		for(var i=0;i<list.value.length;i++)
		{
			scope.variables[name] = list.value[i];
			value[i] = jme.evaluate(args[0],scope);
		}
		return new TList(value);
	},
	
	doc: {
		usage: ['map(expr,x,list)','map(x^2,x,[0,2,4,6])'],
		description: 'Apply the given expression to every value in a list.'
	}
});

newBuiltin('map',['?',TName,TRange],TList, null, {
	evaluate: function(args,scope)
	{
		var range = jme.evaluate(args[2],scope);
		var name = args[1].tok.name;
		var newlist = new TList(range.size);
		newlist.value = [];
		scope = new Scope(scope);
		for(var i=3;i<range.value.length;i++)
		{
			scope.variables[name] = new TNum(range.value[i]);
			newlist.value[i-3] = jme.evaluate(args[0],scope);
		}
		return newlist;
	},

	doc: {
		usage: ['map(expr,x,range)','map(x^2,x,0..5)'],
		description: 'Apply the given expression to every value in a range.'
	}
});

newBuiltin('sort',[TList],TList, null, {
	evaluate: function(args,scope)
	{
		var list = jme.evaluate(args[0],scope);
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
	},

	doc: {
		usage: 'sort(list)',
		description: 'Sort a list.'
	}
});

newBuiltin('vector',['*TNum'],TVector, null, {
	evaluate: function(args,scope)
	{
		var value = [];
		for(var i=0;i<args.length;i++)
		{
			value.push(jme.evaluate(args[i],scope).value);
		}
		return new TVector(value);
	},

	doc: {
		usage: ['vector(1,2,3)','vector(a,b)'],
		description: 'Create a vector with the given components.',
		tags: ['constructor','new']
	}
});

newBuiltin('vector',[TList],TVector, null, {
	evaluate: function(args,scope)
	{
		var list = jme.evaluate(args[0],scope);
		var value = list.value.map(function(x){return x.value});
		return new TVector(value);
	},

	doc: {
		usage: ['vector([1,2,3])','vector(list)'],
		description: 'Create a vector from a list of numbers.',
		tags: ['constructor','new','convert','cast']
	}
});

newBuiltin('matrix',[TList],TMatrix,null, {
	evaluate: function(args,scope)
	{
		var list = jme.evaluate(args[0],scope);
		var rows = list.vars;
		var columns = 0;
		var value = [];
		switch(list.value[0].type)
		{
		case 'number':
			value = [list.value.map(function(e){return e.value})];
			rows = 1;
			columns = list.vars;
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
			throw(new Numbas.Error('jme.func.matrix.invalid row type',list.value[0].type));
		}
		value.rows = rows;
		value.columns = columns;
		return new TMatrix(value);
	},

	doc: {
		usage: ['matrix([ [1,2], [3,4] ])', 'matrix([ row1, row2 ])'],
		tags: ['convert','cast','constructor','new'],
		description: 'Create a matrix from a list of rows. This constructor is useful if the number of rows is not a constant.'
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
			var row = jme.evaluate(args[i],scope).value;
			value.push(row.map(function(x){return x.value}));
			columns = Math.max(columns,row.length);
		}
		value.rows = rows;
		value.columns = columns;
		return new TMatrix(value);
	},

	doc: {
		usage: ['matrix([1,0],[0,1])','matrix(row1,row2,row3)'],
		description: 'Create a matrix. The arguments are lists of numbers, representing the rows.',
		tags: ['constructor', 'new']
	}
});

newBuiltin('rowvector',['*number'],TMatrix, null, {
	evaluate: function(args,scope)
	{
		var row = [];
		for(var i=0;i<args.length;i++)
		{
			row.push(jme.evaluate(args[i],scope).value);
		}
		var matrix = [row];
		matrix.rows = 1;
		matrix.columns = row.length;
		return new TMatrix(matrix);
	},

	doc: {
		usage: 'rowvector(1,2,3)',
		description: 'Create a row vector, i.e. an $n \\times 1$ matrix, with the given components.',
		tags: ['constructor','new']
	}
});

//cast vector to list
newBuiltin('list',[TVector],TList,null, {
	evaluate: function(args,scope)
	{
		var vector = jme.evaluate(args[0],scope);
		var value = vector.value.map(function(n){ return new TNum(n)});
		return new TList(value);
	},

	doc: {
		usage: ['list(vector(0,1,2))','list(vector)'],
		description: 'Cast a vector to a list.',
		tags: ['convert']
	}
});

//cast matrix to list of lists
newBuiltin('list',[TMatrix],TList,null, {
	evaluate: function(args,scope)
	{
		var matrix = jme.evaluate(args[0],scope);
		var value = [];
		for(var i=0;i<matrix.value.rows;i++)
		{
			var row = new TList(matrix.value[i].map(function(n){return new TNum(n)}));
			value.push(row);
		}
		return new TList(value);
	},

	doc: {
		usage: ['list(matrix([0,1],[2,3]))'],
		tags: ['convert','cast'],
		description: 'Cast a matrix to a list of its rows.'
	}
});

///end of builtins



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
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		// finds absolute difference between values, fails if bigger than tolerance
		return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
	},

	reldiff: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		// fails if (r1/r2 - 1) is bigger than tolerance
		if(r2!=0) {
			return math.leq(Math.abs(math.sub(r1,r2)), Math.abs(math.mul(tolerance,r2)));
		} else {	//or if correct answer is 0, checks abs difference
			return math.leq(Math.abs(math.sub(r1,r2)), tolerance);
		}
	},

	dp: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		//rounds both values to 'tolerance' decimal places, and fails if unequal 
		tolerance = Math.floor(Math.abs(tolerance));
		return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
	},

	sigfig: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		//rounds both values to 'tolerance' sig figs, and fails if unequal
		tolerance = Math.floor(Math.abs(tolerance));
		return math.eq(math.siground(r1,tolerance), math.siground(r2,tolerance));
	}
};

var findvars = jme.findvars = function(tree,boundvars,scope)
{
	if(!scope)
		scope = jme.builtinScope;
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
					var tree2 = jme.compile(expr,scope,true);
					out = out.merge(findvars(tree2,boundvars));
					break;
				case 'simplify':
					var sbits = util.splitbrackets(expr,'{','}');
					for(var i=1;i<sbits.length-1;i+=2)
					{
						var tree2 = jme.compile(sbits[i],scope,true);
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
