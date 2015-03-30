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

/** @file Sets up most of the JME stuff: compiler, built-in functions, and expression comparison functions.
 *
 * Provides {@link Numbas.jme}
 */

Numbas.queueScript('jme',['base','math','util'],function() {

var util = Numbas.util;
var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;
var setmath = Numbas.setmath;

/** @typedef Numbas.jme.tree
  * @type {object}
  * @property {tree[]} args - the token's arguments (if it's an op or function)
  * @property {Numbas.jme.token} tok - the token at this node
  */

/** @namespace Numbas.jme */
var jme = Numbas.jme = /** @lends Numbas.jme */ {

	/** Mathematical constants */
	constants: {
		'e': Math.E,
		'pi': Math.PI,
		'i': math.complex(0,1),
		'infinity': Infinity,
		'infty': Infinity
	},

	/** Regular expressions to match tokens */
	re: {
		re_bool: /^true|^false/i,
		re_number: /^[0-9]+(?:\x2E[0-9]+)?/,
		re_name: /^{?((?:(?:[a-zA-Z]+):)*)((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?\??)}?/i,
		re_op: /^(\.\.|#|<=|>=|<>|&&|\|\||[\|*+\-\/\^<>=!&;]|(?:(not|and|or|xor|isa|except|in)([^a-zA-Z0-9]|$)))/i,
		re_punctuation: /^([\(\),\[\]])/,
		re_string: /^(['"])((?:[^\1\\]|\\.)*?)\1/,
		re_comment: /^\/\/.*(?:\n|$)/
	},

	/** Convert given expression string to a list of tokens. Does some tidying, e.g. inserts implied multiplication symbols.
	 * @param {JME} expr 
	 * @returns {token[]}
	 * @see Numbas.jme.compile
	 */
	tokenise: function(expr)
	{
		if(!expr)
			return [];

		expr += '';
		
		var oexpr = expr;

		expr = expr.replace(jme.re.re_strip_whitespace, '');	//get rid of whitespace

		var tokens = [];
		var i = 0;
		
		while( expr.length )
		{
			expr = expr.replace(jme.re.re_strip_whitespace, '');	//get rid of whitespace
		
			var result;
			var token;

            while(result=expr.match(jme.re.re_comment)) {
                expr=expr.slice(result[0].length).replace(jme.re.re_strip_whitespace,'');
            }

			if(result = expr.match(jme.re.re_number))
			{
				token = new TNum(result[0]);

				if(tokens.length>0 && (tokens[tokens.length-1].type==')' || tokens[tokens.length-1].type=='name'))	//right bracket followed by a number is interpreted as multiplying contents of brackets by number
				{
					tokens.push(new TOp('*'));
				}
			}
			else if (result = expr.match(jme.re.re_bool))
			{
				token = new TBool(util.parseBool(result[0]));
			}
			else if (result = expr.match(jme.re.re_op))
			{
				if(result[2])		//if word-ish operator
					result[0] = result[2];
				token = result[0];
				//work out if operation is being used prefix or postfix
				var nt;
				var postfix = false;
				var prefix = false;
				if( tokens.length==0 || (nt=tokens[tokens.length-1].type)=='(' || nt==',' || nt=='[' || (nt=='op' && !tokens[tokens.length-1].postfix) )
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
			}
			else if (result = expr.match(jme.re.re_name))
			{
				var name = result[2];
				var annotation = result[1] ? result[1].split(':').slice(0,-1) : null;
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
			else if (result = expr.match(jme.re.re_punctuation))
			{
				if(result[0]=='(' && tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type==')')) {	//number or right bracket followed by left parenthesis is also interpreted to mean multiplication
					tokens.push(new TOp('*'));
				}

				token = new TPunc(result[0]);
			}
			else if (result = expr.match(jme.re.re_string))
			{
				var str = result[2];
	
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

				token = new TString(estr);
			}
			else if(expr.length)
			{
				//invalid character or not able to match a token
				throw(new Numbas.Error('jme.tokenise.invalid',oexpr));
			}
			else
				break;
			
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

	/** Shunt list of tokens into a syntax tree. Uses the shunting yard algorithm (wikipedia has a good description)
	 * @param {token[]} tokens
	 * @param {Numbas.jme.Scope} scope
	 * @returns {Numbas.jme.tree}
	 * @see Numbas.jme.tokenise
	 * @see Numbas.jme.compile
	 */
	shunt: function(tokens,scope)
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

				if(!tok.prefix) {
					var o1 = precedence[tok.name];
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
					) 
					{	//while ops on stack have lower precedence, pop them onto output because they need to be calculated before this one. left-associative operators also pop off operations with equal precedence
						addoutput(stack.pop());
					}
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

	/** Substitute variables defined in `scope` into the given syntax tree (in place).
	 * @param {Numbas.jme.tree} tree
	 * @param {Numbas.jme.Scope} scope
	 * @param {boolean} [allowUnbound=false] - allow unbound variables to remain in the returned tree
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
			else {
				return tree;
			}
		} else if((tree.tok.type=='function' || tree.tok.type=='op') && tree.tok.name in substituteTreeOps) {
			tree = {tok: tree.tok,
					args: tree.args.slice()};
			substituteTreeOps[tree.tok.name](tree,scope,allowUnbound);
			return tree;
		} else
		{
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
	 * @param {tree|string} tree
	 * @param {Numbas.jme.Scope} scope
	 * @returns {jme.type}
	 */
	evaluate: function(tree,scope)
	{
		//if a string is given instead of an expression tree, compile it to a tree
		if( typeof(tree)=='string' )
			tree = jme.compile(tree,scope);
		if(!tree)
			return null;


		tree = jme.substituteTree(tree,scope,true);

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
			var value = tok.value;
			if(value.contains('{'))
				value = jme.contentsubvars(value,scope)
			var t = new TString(value);
			t.latex = tok.latex;
			return t;
		case 'name':
			if(tok.name.toLowerCase() in scope.variables)
				return scope.variables[tok.name.toLowerCase()];
			else
				tok.unboundName = true;
				return tok;
			break;
		case 'op':
		case 'function':
			var op = tok.name.toLowerCase();
			if(lazyOps.indexOf(op)>=0) {
				return scope.functions[op][0].evaluate(tree.args,scope);
			}
			else {

				for(var i=0;i<tree.args.length;i++) {
					tree.args[i] = jme.evaluate(tree.args[i],scope);
				}

				if(scope.functions[op]===undefined)
				{
					if(tok.type=='function') {
						//check if the user typed something like xtan(y), when they meant x*tan(y)
						var possibleOp = op.slice(1);
						if(possibleOp in scope.functions)
							throw(new Numbas.Error('jme.typecheck.function maybe implicit multiplication',op,op[0],possibleOp));
						else
							throw(new Numbas.Error('jme.typecheck.function not defined',op,op));
					}
					else
						throw(new Numbas.Error('jme.typecheck.op not defined',op));
				}

				for(var j=0;j<scope.functions[op].length; j++)
				{
					var fn = scope.functions[op][j];
					if(fn.typecheck(tree.args))
					{
						tok.fn = fn;
						break;
					}
				}
				if(tok.fn)
					return tok.fn.evaluate(tree.args,scope);
				else {
					for(var i=0;i<=tree.args.length;i++) {
						if(tree.args[i] && tree.args[i].unboundName) {
							throw(new Numbas.Error('jme.typecheck.no right type unbound name',tree.args[i].name));
						}
					}
					throw(new Numbas.Error('jme.typecheck.no right type definition',op));
				}
			}
		default:
			return tok;
		}
	},

	/** Compile an expression string to a syntax tree. (Runs {@link Numbas.jme.tokenise} then {@Link Numbas.jme.shunt})
	 * @param {JME} expr
	 * @param {Numbas.jme.Scope} scope
	 * @see Numbas.jme.tokenise
	 * @see Numbas.jme.shunt
	 * @returns {Numbas.jme.tree}
	 */
	compile: function(expr,scope)
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

		return(tree);
	},

	/** Compare two expressions over some randomly selected points in the space of variables, to decide if they're equal.
	 * @param {JME} expr1
	 * @param {JME} expr2
	 * @param {object} settings
	 * @param {Numbas.jme.Scope} scope
	 * @returns {boolean}
	 */
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

	/** Substitute variables into content. To substitute variables, use {@link Numbas.jme.variables.DOMcontentsubvars}.
	 * @param {string} str
	 * @param {Numbas.jme.Scope} scope
	 * @returns {string}
	 */
	contentsubvars: function(str, scope)
	{
		var bits = util.contentsplitbrackets(str);	//split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
		for(var i=0; i<bits.length; i+=4)
		{
			bits[i] = jme.subvars(bits[i],scope,true);
		}
		return bits.join('');
	},

	/** Split up a string along TeX delimiters (`$`, `\[`, `\]`)
	 * @param {string} s
	 * @returns {string[]}
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

	/** Substitute variables into a text string (not maths).
	 * @param {string} str
	 * @param {Numbas.jme.Scope} scope
	 * @param {boolean} [display=false] - Is this string going to be displayed to the user? If so, avoid unnecessary brackets and quotes.
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
				if(v.type=='number')
				{
					if(display)
						v = ''+Numbas.math.niceNumber(v.value)+'';
					else
						v = '('+Numbas.jme.display.treeToJME({tok:v})+')';
				}
				else if(v.type=='string')
				{
					if(display) {
						v = v.value;
					}
					else {
						v = "'"+v.value+"'";
					}
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
	},

	/** Unwrap a {@link Numbas.jme.token} into a plain JavaScript value
	 * @param {Numbas.jme.token} v
	 * @returns {object}
	 */
	unwrapValue: function(v) {
		if(v.type=='list')
			return v.value.map(jme.unwrapValue);
		else
			return v.value;
	},
	
	/** Wrap up a plain JavaScript value (number, string, bool or array) as a {@link Numbas.jme.token}.
	 * @param {object} v
	 * @param {string} typeHint - name of the expected type (to differentiate between, for example, matrices, vectors and lists
	 * @returns {Numbas.jme.token}
	 */
	wrapValue: function(v,typeHint) {
		switch(typeof v) {
		case 'number':
			return new jme.types.TNum(v);
		case 'string':
			return new jme.types.TString(v);
		case 'boolean':
			return new jme.types.TBool(v);
		default:
			if($.isArray(v)) {
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
			}
			return v;
		}
	},

	/** Is a token a TOp?
	 *
	 * @param {Numbas.jme.token} 
	 * 
	 * @returns {boolean}
	 */
	isOp: function(tok,op) {
		return tok.type=='op' && tok.name==op;
	},

	/** Is a token a TName?
	 *
	 * @param {Numbas.jme.token} 
	 * 
	 * @returns {boolean}
	 */
	isName: function(tok,name) {
		return tok.type=='name' && tok.name==name;
	},

	/** Is a token a TFunction?
	 *
	 * @param {Numbas.jme.token} 
	 * 
	 * @returns {boolean}
	 */
	isFunction: function(tok,name) {
		return tok.type=='function' && tok.name==name;
	}
};

/** Regular expression to match whitespace (because '\s' doesn't match *everything*) */
jme.re.re_whitespace = '(?:[\\s \\f\\n\\r\\t\\v\\u00A0\\u2028\\u2029]|(?:\&nbsp;))';
jme.re.re_strip_whitespace = new RegExp('^'+jme.re.re_whitespace+'+|'+jme.re.re_whitespace+'+$','g');


var displayFlags = {
	fractionnumbers: undefined,
	rowvector: undefined
};

var ruleSort = util.sortBy('patternString');

/** Set of simplification rules
 * @constructor
 * @memberof Numbas.jme
 * @param {rule[]} rules
 * @param {object} flags
 */
var Ruleset = jme.Ruleset = function(rules,flags) {
	this.rules = rules;
	this.flags = $.extend({},displayFlags,flags);
}
Ruleset.prototype = /** @lends Numbas.jme.Ruleset.prototype */ {
	/** Test whether flag is set 
	 * @memberof Numbas.jme.Ruleset.prototype
	 */
	flagSet: function(flag) {
		flag = flag.toLowerCase();
		if(this.flags.hasOwnProperty(flag))
			return this.flags[flag];
		else
			return false;
	}
}

function mergeRulesets(r1,r2) {
	var rules = r1.rules.merge(r2.rules,ruleSort);
	var flags = $.extend({},r1.flags,r2.flags);
	return new Ruleset(rules, flags);
}

//collect a ruleset together from a list of ruleset names, or rulesets.
// set can be a comma-separated string of ruleset names, or an array of names/Ruleset objects.
var collectRuleset = jme.collectRuleset = function(set,scopeSets)
{
	scopeSets = util.copyobj(scopeSets);

	if(!set)
		return [];

	if(!scopeSets)
		throw(new Numbas.Error('jme.display.collectRuleset.no sets'));

	var rules = [];
	var flags = {};

	if(typeof(set)=='string') {
		set = set.split(',');
	}
	else {
		flags = $.extend(flags,set.flags);
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
					throw(new Numbas.Error('jme.display.collectRuleset.set not defined',name));
				}

				var sub = collectRuleset(scopeSets[name],scopeSets);

				flags = $.extend(flags,sub.flags);

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

var fnSort = util.sortBy('id');

/**
 * JME evaluation environment.
 * @memberof Numbas.jme
 * @constructor
 * @property {object} variables - dictionary of {@link Numbas.jme.token} objects
 * @property {object} functions - dictionary of arrays of {@link Numbas.jme.funcObj} objects. There can be more than one function for each name because of signature overloading.
 * @property {objects} rulesets - dictionary of {@link Numbas.jme.Ruleset} objects
 *
 * @param {Numbas.jme.Scope[]} scopes - List of scopes to combine into this one. Scopes appearing later in the list override ones appearing earlier, in case variable/ruleset names conflict.
 */
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
						this.rulesets[x] = scope.rulesets[x];
					else
						this.rulesets[x] = mergeRulesets(this.rulesets[x],scope.rulesets[x]);
				}
			}
		}
	}
}
Scope.prototype = /** @lends Numbas.jme.Scope.prototype */ {
	/** Add a JME function to the scope.
	 * @param {jme.funcObj} fn - function to add
	 */
	addFunction: function(fn) {
		if(!(fn.name in this.functions))
			this.functions[fn.name] = [fn];
		else
			this.functions[fn.name].push(fn);
	},

	/** Evaluate an expression in this scope - equivalent to `Numbas.jme.evaluate(expr,this)`
	 * @param {JME} expr
	 * @returns {token}
	 */
	evaluate: function(expr) {
		return jme.evaluate(expr,this);
	}
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


/** @typedef Numbas.jme.token
 * @type {object}
 * @property {string} type
 * @see Numbas.jme.types
 */

/** The data types supported by JME expressions 
 * @namespace Numbas.jme.types
 */
var types = jme.types = {}

/** Number type.
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number} value
 * @property type "number"
 * @constructor
 * @param {number} num
 */
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

/** String type.
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} value
 * @property type "string"
 * @constructor
 * @param {string} s
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
 * @property {boolean} value
 * @property type "boolean"
 * @constructor
 * @param {boolean} b
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
 * @property {element} value
 * @property type "html"
 * @constructor
 * @param {element} html
 */
var THTML = types.THTML = types.html = function(html) {
	this.value = $(html);
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
 * @property {number} vars - Length of list
 * @property {object[]} value - Values (may not be filled in if the list was created empty)
 * @property type "html"
 * @constructor
 * @param {number|object} value - Either the size of the list, or an array of values
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

/** Set type
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {object[]} value - Array of elements. Constructor assumes all elements are distinct
 * @property type "set"
 * @constructor
 * @param {object[]} value
 */
var TSet = types.TSet = types.set = function(value) {
	this.value = value;
}
TSet.prototype.type = 'set';

/** Vector type
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number[]} value - Array of components
 * @property type "vector"
 * @constructor
 * @param {number[]} value
 */
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
}
TMatrix.prototype.type = 'matrix';
TMatrix.doc = {
	name: 'matrix',
	usage: ['matrix([1,2,3],[4,5,6])','matrix(row1,row2)'],
	description: "Matrices are constructed from lists of numbers, representing the rows.\n\n When combining matrices of different dimensions, the smaller matrix is padded with zeroes to make up the difference."
}

/** A range of numerical values - either discrete or continuous
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number[]} value - `[start,end,step]` and then, if the range is discrete, all the values included in the range.
 * @property {number} size - the number of values in the range (if it's discrete, `undefined` otherwise)
 * @property type "range"
 * @constructor
 * @param {number[]} range - `[start,end,step]`
 */
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
	usage: ['1..3','1..3#0.1','1..3#0'],
	description: 'A range @a..b#c@ represents the set of numbers $\\{a+nc | 0 \\leq n \\leq \\frac{b-a}{c} \\}$. If the step size is zero, then the range is the continuous interval $\[a,b\]$.'
}

/** Variable name token
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} name
 * @property {string} value - Same as `name`
 * @property {string[]} annotation - List of annotations (used to modify display)
 * @property type "name"
 * @constructor
 * @param {string} name
 * @param {string[]} annotation
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
 * @property {string} name
 * @property {string[]} annotation - List of annotations (used to modify display)
 * @property {number} vars - Arity of the function
 * @property type "function"
 * @constructor
 * @param {string} name
 * @param {string[]} annotation
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
 * @property {string} name
 * @property {number} vars - Arity of the operation
 * @property {boolean} postfix
 * @property {boolean} prefix
 * @properrty type "op"
 * @constructor
 * @param {string} op - Name of the operation
 * @param {boolean} postfix
 * @param {boolean} prefix
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
 * @property {string} type - The punctuation character
 * @constructor
 * @param {string} kind - The punctuation character
 */
var TPunc = types.TPunc = function(kind)
{
	this.type = kind;
}


/** Arities of built-in operations
 * @readonly
 * @memberof Numbas.jme
 * @enum {number} */
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
 * @enum {string}
 */
var prefixForm = {
	'+': '+u',
	'-': '-u',
	'!': 'not'
}
/** Some names represent different operations when used as prefix. This dictionary translates them.
 * @readonly
 * @memberof Numbas.jme
 * @enum {string}
 */
var postfixForm = {
	'!': 'fact'
}

/** Operator precedence
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
	'xor': 13
};

/** Synonyms of names - keys in this dictionary are translated to their corresponding values after tokenising.
 * @enum {string}
 * @memberof Numbas.jme
 * @readonly
 */
var synonyms = jme.synonyms = {
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
	
/** Operations which evaluate lazily - they don't need to evaluate all of their arguments 
 * @memberof Numbas.jme
 */
var lazyOps = jme.lazyOps = ['if','switch','repeat','map','let','isa','satisfy'];

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
 * @enum {boolean}
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


var funcObjAcc = 0;	//accumulator for ids for funcObjs, so they can be sorted
/**
 * Function object - for doing type checking away from the evaluator.
 * 
 * `options` can contain any of
 *
 * - `typecheck`: a function which checks whether the funcObj can be applied to the given arguments 
 * - `evaluate`: a function which performs the funcObj on given arguments and variables. Arguments are passed as expression trees, i.e. unevaluated
 * - `unwrapValues`: unwrap list elements in arguments into javascript primitives before passing to the evaluate function
 *
 * @memberof Numbas.jme
 * @constructor
 * @param {string} name
 * @param {function[]|string[]} intype - A list of data type constructors for the function's paramters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type.
 * @param {function} outcons - The constructor for the output value of the function
 * @param {function} fn - JavaScript code which evaluates the function.
 * @param {object} options
 *
 */
var funcObj = jme.funcObj = function(name,intype,outcons,fn,options)
{
	/** 
	 * @member {number} 
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
		if(variables.length>0)	//too many args supplied
			return false;
		else
			return true;
	};

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
}

/** The built-in JME evaluation scope
 * @type {Numbas.jme.Scope}
 * @memberof Numbas.jme
 */
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

newBuiltin('+u', [TNum], TNum, function(a){return a;}, {doc: {usage: '+x', description: "Unary addition.", tags: ['plus','positive']}});	
newBuiltin('+u', [TVector], TVector, function(a){return a;}, {doc: {usage: '+x', description: "Vector unary addition.", tags: ['plus','positive']}});	
newBuiltin('+u', [TMatrix], TMatrix, function(a){return a;}, {doc: {usage: '+x', description: "Matrix unary addition.", tags: ['plus','positive']}});	
newBuiltin('-u', [TNum], TNum, math.negate, {doc: {usage: '-x', description: "Negation.", tags: ['minus','negative','negate']}});
newBuiltin('-u', [TVector], TVector, vectormath.negate, {doc: {usage: '-x', description: "Vector negation.", tags: ['minus','negative','negate']}});
newBuiltin('-u', [TMatrix], TMatrix, matrixmath.negate, {doc: {usage: '-x', description: "Matrix negation.", tags: ['minus','negative','negate']}});

newBuiltin('+', [TNum,TNum], TNum, math.add, {doc: {usage: 'x+y', description: "Add two numbers together.", tags: ['plus','add','addition']}});

newBuiltin('+', [TList,TList], TList, null, {
	evaluate: function(args,scope)
	{
		var value = args[0].value.concat(args[1].value);
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
		var value = args[0].value.slice();
		value.push(args[1]);
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
newBuiltin('/', [TMatrix,TNum], TMatrix, function(a,b){ return matrixmath.scalardiv(a,b); }, {doc: {usage: 'matrix([1,0],[1,2]) * 3', description: 'Multiply a matrix on the right by a scalar.', tags: ['multiplication','composition','compose','times']}} );
newBuiltin('/', [TVector,TNum], TVector, function(a,b){return vectormath.div(a,b)}, {doc: {usage: 'vector(1,2,3) * 3', description: 'Multiply a vector on the right by a scalar.', tags: ['multiplication','composition','compose','times']}});
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

newBuiltin('in',[TNum,TRange],TBool,function(x,r) {
	var start = r[0];
	var end = r[1];
	var step = r[2];
	var max_steps = Math.floor(end-start)/step;
	if(x>end) {
		return false;
	}
	var steps = Math.floor((x-start)/step);
	return step*steps+start==x && steps <= max_steps;
});

newBuiltin('list',[TRange],TList,function(range) {
	var numbers = range.slice(3).map(function(n){ return new TNum(n); });
	return numbers;
});

newBuiltin('html',[TString],THTML,function(html) { return $(html) }, {doc: {usage: ['html(\'<div>things</div>\')'], description: 'Parse HTML from a string', tags: ['element','node']}});
newBuiltin('image',[TString],THTML,function(url){ return $('<img/>').attr('src',url); }, {doc: {usage: ['image(\'picture.png\')'], description: 'Load an image from the given URL', tags: ['element','image','html']}});

newBuiltin('latex',[TString],TString,null,{
	evaluate: function(args,scope) {
		args[0].latex = true;
		return args[0];
	},
	doc: {
		usage: ['latex("something")'],
		description: 'Output a string as raw LaTeX. Normally, strings are wrapped in a \\textrm command.'
	}
});

newBuiltin('capitalise',[TString],TString,function(s) { return util.capitalise(s); }, {doc: {usage: ['capitalise(\'hello there\')'], description: 'Capitalise the first letter of a string', tags: ['upper-case','case','upper']}});
newBuiltin('upper',[TString],TString,function(s) { return s.toUpperCase(); }, {doc: {usage: ['upper(\'hello there\')'], description: 'Change all the letters in a string to capitals.', tags: ['upper-case','case','upper','capitalise','majuscule']}});
newBuiltin('lower',[TString],TString,function(s) { return s.toLowerCase(); }, {doc: {usage: ['lower(\'HELLO, you!\')'], description: 'Change all the letters in a string to minuscules.', tags: ['lower-case','lower','case']}});
newBuiltin('pluralise',[TNum,TString,TString],TString,function(n,singular,plural) { return util.pluralise(n,singular,plural); });
newBuiltin('join',[TList,TString],TString,function(list,delimiter) { return list.join(delimiter); },{unwrapValues:true});

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
		return new TList(util.except(args[0].value,[args[1]]));
	},

  	doc: {
		usage: '[a,b,c,d] except b',
		description: 'Exclude a value from a list.',
		tags: ['except', 'exclude', 'filter', 'remove']
	}
});

newBuiltin('distinct',[TList],TList, util.distinct,{unwrapValues: false});

newBuiltin('in',['?',TList],TBool,null,{
	evaluate: function(args,scope) {
		return new TBool(util.contains(args[1].value,args[0]));
	}
});

newBuiltin('<', [TNum,TNum], TBool, math.lt, {doc: {usage: ['x<y','1<2'], description: 'Returns @true@ if the left operand is less than the right operand.', tags: ['comparison','inequality','numbers']}});
newBuiltin('>', [TNum,TNum], TBool, math.gt, {doc: {usage: ['x>y','2>1'], description: 'Returns @true@ if the left operand is greater than the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('<=', [TNum,TNum], TBool, math.leq, {doc: {usage: ['x <= y','1<=1'], description: 'Returns @true@ if the left operand is less than or equal to the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('>=', [TNum,TNum], TBool, math.geq, {doc: {usage: 'x >= y', description: 'Returns @true@ if the left operand is greater than or equal to the right operand.', tags: ['comparison','inequality','numbers']}} );
newBuiltin('<>', ['?','?'], TBool, null, {
	evaluate: function(args,scope) {
		return new TBool(util.neq(args[0],args[1]));
	},
	doc: {
		usage: ['\'this string\' <> \'that string\'', 'a <> b', '1<>2','sin(90)<>1'], 
		description: 'Inequality test.', 
		tags: ['comparison','not equal']
	}
});
newBuiltin('=', ['?','?'], TBool, null, {
	evaluate: function(args,scope) {
		return new TBool(util.eq(args[0],args[1]));
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
newBuiltin('abs', [TString], TNum, function(s){return s.length}, {doc: {usage: 'abs(x)', description: 'Absolute value of a number.', tags: ['norm','length','complex']}} );
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
newBuiltin('gamma', [TNum], TNum, math.gamma, {doc: {usage: ['fact(x)','x!'], description: 'Factorial.', tags: ['!']}} );
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

newBuiltin('factorise',[TNum],TList,function(n) {
		return math.factorise(n).map(function(n){return new TNum(n)});
	}
);

newBuiltin('random', [TRange], TNum, math.random, {doc: {usage: 'random(1..4)', description: 'A random number in the given range.', tags: ['choose','pick']}} );

newBuiltin('random',[TList],'?',null, {
	evaluate: function(args,scope) 
	{
		return math.choose(args[0].value);
	},

	doc: {
		usage: 'random([1,1,2,3,5])',
		description: 'Choose a random item from a list.',
		tags: ['pick','select']
	}
});

newBuiltin( 'random',[],'?', null, {
	typecheck: function() { return true; },
	evaluate: function(args,scope) { return math.choose(args);},
	doc: {
		usage: 'random(1,2,3,4,5)',
		description: 'Choose at random from the given arguments.',
		tags: ['pick','select']
	}
});

newBuiltin('mod', [TNum,TNum], TNum, math.mod, {doc: {usage: 'mod(a,b)', description: 'Modulus, i.e. $a \\bmod{b}.$', tags: ['remainder','modulo']}} );
newBuiltin('max', [TNum,TNum], TNum, math.max, {doc: {usage: 'max(x,y)', description: 'Maximum of two numbers.', tags: ['supremum','biggest','largest','greatest']}} );
newBuiltin('min', [TNum,TNum], TNum, math.min, {doc: {usage: 'min(x,y)', description: 'Minimum of two numbers.', tags: ['smallest','least']}} );
newBuiltin('max', [TList], TNum, math.listmax, {unwrapValues: true});
newBuiltin('min', [TList], TNum, math.listmin, {unwrapValues: true});
newBuiltin('precround', [TNum,TNum], TNum, math.precround, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('precround', [TMatrix,TNum], TMatrix, matrixmath.precround, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('siground', [TNum,TNum], TNum, math.siground, {doc: {usage: 'siground(x,3)', description: 'Round to given number of significant figures.', tags: ['sig figs','sigfig']}} );
newBuiltin('siground', [TMatrix,TNum], TMatrix, matrixmath.siground, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('dpformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'dp', precision:p});}, {doc: {usage: 'dpformat(x,3)', description: 'Round to given number of decimal points and pad with zeroes if necessary.', tags: ['dp','decimal points','format','display','precision']}} );
newBuiltin('sigformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p});}, {doc: {usage: 'dpformat(x,3)', description: 'Round to given number of significant figures and pad with zeroes if necessary.', tags: ['sig figs','sigfig','format','display','precision']}} );
newBuiltin('perm', [TNum,TNum], TNum, math.permutations, {doc: {usage: 'perm(6,3)', description: 'Count permutations. $^n \\kern-2pt P_r$.', tags: ['combinatorics']}} );
newBuiltin('comb', [TNum,TNum], TNum, math.combinations , {doc: {usage: 'comb(6,3)', description: 'Count combinations. $^n \\kern-2pt C_r$.', tags: ['combinatorics']}});
newBuiltin('root', [TNum,TNum], TNum, math.root, {doc: {usage: ['root(8,3)','root(x,n)'], description: '$n$<sup>th</sup> root.', tags: ['cube']}} );
newBuiltin('award', [TNum,TBool], TNum, function(a,b){return (b?a:0);}, {doc: {usage: ['award(a,b)','award(5,x=y)'], description: 'If @b@ is @true@, returns @a@, otherwise returns @0@.', tags: ['mark']}} );
newBuiltin('gcd', [TNum,TNum], TNum, math.gcf, {doc: {usage: 'gcd(a,b)', description: 'Greatest common denominator of two integers.', tags: ['highest']}} );
newBuiltin('gcd_without_pi_or_i', [TNum,TNum], TNum, function(a,b) {	// take out factors of pi or i before working out gcd. Used by the fraction simplification rules
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
newBuiltin('lcm', [TNum,TNum], TNum, math.lcm, {doc: {usage: 'lcm(a,b)', description: 'Lowest common multiple of two integers.', tags: ['least']}} );
newBuiltin('lcm', [TList], TNum, function(l){ 
		if(l.length==0) {
			return 1;
		} else if(l.length==1) {
			return l[0];
		} else {
			return math.lcm.apply(math,l);
		}
	},
	{unwrapValues: true, doc: {usage: 'lcm(a,b)', description: 'Lowest common multiple of two integers.', tags: ['least']}} 
);
newBuiltin('|', [TNum,TNum], TBool, math.divides, {doc: {usage: 'x|y', description: 'Returns @true@ if @x@ divides @y@.', tags: ['multiple of']}} );

newBuiltin('diff', ['?','?',TNum], '?', null, {doc: {usage: ['diff(f(x),x,n)', 'diff(x^2,x,1)','diff(y,x,1)'], description: '$n$<sup>th</sup> derivative. Currently for display only - can\'t be evaluated.', tags: ['differentiate','differential','differentiation']}});
newBuiltin('pdiff', ['?',TName,TNum], '?', null, {doc: {usage: ['pdiff(f(x,y),x,n)','pdiff(x+y,x,1)'], description: '$n$<sup>th</sup> partial derivative. Currently for display only - can\'t be evaluated.', tags: ['differentiate','differential','differentiation']}});
newBuiltin('int', ['?','?'], '?', null, {doc: {usage: 'int(f(x),x)', description: 'Integral. Currently for display only - can\'t be evaluated.'}});
newBuiltin('defint', ['?','?',TNum,TNum], '?', null, {doc: {usage: 'defint(f(x),y,0,1)', description: 'Definite integral. Currently for display only - can\'t be evaluated.'}});

newBuiltin('sum',[TList],TNum,function(list) {
	var total = 0;
	var l = list.length;

	if(l==0) {
		return 0;
	}

	for(var i=0;i<l;i++) {
		total = math.add(total,list[i].value);
	}
	
	return total;
});

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

newBuiltin('shuffle',[TList],TList,
	function(list) {
		return math.shuffle(list);
	},
	{doc: {
		usage: ['shuffle(list)','shuffle([1,2,3])'],
		description: 'Randomly reorder a list.',
		tags: ['permutation','order','shuffle','deal']	
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

newBuiltin('listval',[TList,TNum],'?', null, {
	evaluate: function(args,scope)
	{
		var list = args[0];
		var index = util.wrapListIndex(args[1].value,list.vars);
		if(list.type!='list') {
			if(list.type=='name')
				throw(new Numbas.Error('jme.variables.variable not defined',list.name));
			else
				throw(new Numbas.Error('jme.func.listval.not a list'));
		}
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
		var range = args[1].value;
		var list = args[0];
		var size = list.vars;
		var start = util.wrapListIndex(range[0],size);
		var end = util.wrapListIndex(range[1]),size;
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
		var vector = args[0].value;
		var index = util.wrapListIndex(args[1].value,vector.length);
		return new TNum(vector[index] || 0);
	},

	doc: {
		usage: ['vec[1]','vector(0,1,2)[1]'],
		description: 'Return a particular component of a vector.',
		tags: ['index','item','access']
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
	},

	doc: {
		usage: ['mat[1]','matrix([1,0],[0,1])[1]'],
		description: 'Return a particular row of a matrix.',
		tags: ['index','item','access','element','cell']
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

newBuiltin('map',['?',TName,'?'],TList, null, {
	evaluate: function(args,scope)
	{
		var lambda = args[0];

		var list = jme.evaluate(args[2],scope);
		switch(list.type) {
		case 'list':
		case 'set':
			list = list.value;
			break;
		case 'range':
			list = list.value.slice(3);
			for(var i=0;i<list.length;i++) {
				list[i] = new TNum(list[i]);
			}
			break;
		default:
			throw(new Numbas.Error('jme.typecheck.map not on enumerable',list.type));
		}
		var value = [];
		scope = new Scope(scope);

		var names_tok = args[1].tok;
		if(names_tok.type=='name') {
			var name = names_tok.name;
			for(var i=0;i<list.length;i++)
			{
				scope.variables[name] = list[i];
				value[i] = jme.evaluate(lambda,scope);
			}
		} else if(names_tok.type=='list') {
			var names = args[1].args.map(function(t){return t.tok.name;});
			for(var i=0;i<list.length;i++)
			{
				names.map(function(name,j) {
					scope.variables[name] = list[i].value[j];
				});
				value[i] = jme.evaluate(lambda,scope);
			}
		}
		return new TList(value);
	},
	
	doc: {
		usage: ['map(expr,x,list)','map(x^2,x,[0,2,4,6])'],
		description: 'Apply the given expression to every value in a list.'
	}
});

newBuiltin('map',['?',TList,'?'],TList,null, {
	evaluate: function(args,scope)
	{
		var list = jme.evaluate(args[2],scope);
		switch(list.type) {
		case 'list':
			list = list.value;
			break;
		case 'range':
			list = list.value.slice(3);
			for(var i=0;i<list.length;i++) {
				list[i] = new TNum(list[i]);
			}
			break;
		default:
			throw(new Numbas.Error('jme.typecheck.map not on enumerable',list.type));
		}
		var value = [];
		var names = args[1].tok.args.map(function(t){return t.tok.name;});
		scope = new Scope(scope);
		for(var i=0;i<list.length;i++)
		{
			names.map(function(name,j) {
				console.log(name,list[i].value[j]);
				scope.variables[name] = list[i].value[j];
			});
			scope.variables[name] = list[i];
			value[i] = jme.evaluate(args[0],scope);
		}
		return new TList(value);
	}
});

newBuiltin('let',['?'],TList, null, {
	evaluate: function(args,scope)
	{
		var lambda = args[args.length-1];

		var variables = {};
		for(var i=0;i<args.length-1;i+=2) {
			var name = args[i].tok.name;
			var value = scope.evaluate(args[i+1]);
			variables[name] = value;
		}
		var nscope = new Scope([scope,{variables:variables}]);

		return nscope.evaluate(lambda);
	},

	typecheck: function(variables) {
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
	},

	doc: {
		usage: 'sort(list)',
		description: 'Sort a list.'
	}
});

newBuiltin('set',[TList],TSet,function(l) {
	return util.distinct(l);
});
newBuiltin('set',[TRange],TSet,function(r) {
	return r.slice(3).map(function(n){return new TNum(n)});
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
	for(i=0;i<set.length;i++) {
		l.push(set[i]);
	}
	return l;
});

newBuiltin('union',[TSet,TSet],TSet,setmath.union);
newBuiltin('intersection',[TSet,TSet],TSet,setmath.intersection);
newBuiltin('or',[TSet,TSet],TSet,setmath.union);
newBuiltin('and',[TSet,TSet],TSet,setmath.intersection);
newBuiltin('-',[TSet,TSet],TSet,setmath.minus);

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
		var list = args[0];
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
		var list = args[0];
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
			var row = args[i].value;
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
			row.push(args[i].value);
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

newBuiltin('rowvector',[TList],TMatrix, null, {
	evaluate: function(args,scope)
	{
		var list = args[0];
		var row = list.value.map(function(x){return x.value});
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
		var vector = args[0];
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
		var matrix = args[0];
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

		return table;
	},
	{
		unwrapValues: true,

		doc: {
			usage: ['table([ [1,2,3], [4,5,6] ], [\'Header 1\', \'Header 2\'])', 'table(data,headers)'],
			tags: ['table','tabular','data','html'],
			description: 'Create a table to display a list of rows of data, with the given headers.'
		}
	}
);

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
		if( (name=array1[i])[0]!='$' && !array2.contains(name) )
			return false;
	}
	
	return true;
};

/** 
 * Numerical comparison functions
 * @enum {function}
 * @memberof Numbas.jme 
 */
var checkingFunctions = 
{
	/** Absolute difference between variables - fail if bigger than tolerance */
	absdiff: function(r1,r2,tolerance) 
	{
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
	},

	/** Relative (proportional) difference between variables - fail if `r1/r2 - 1` is bigger than tolerance */
	reldiff: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		// 
		if(r2!=0) {
			return math.leq(Math.abs(math.sub(r1,r2)), Math.abs(math.mul(tolerance,r2)));
		} else {	//or if correct answer is 0, checks abs difference
			return math.leq(Math.abs(math.sub(r1,r2)), tolerance);
		}
	},

	/** Round both values to given number of decimal places, and fail if unequal. */
	dp: function(r1,r2,tolerance) {
		if(r1===Infinity || r1===-Infinity)
			return r1===r2;

		tolerance = Math.floor(Math.abs(tolerance));
		return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
	},

	/** Round both values to given number of significant figures, and fail if unequal. */
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
 * @enum {function}
 * @see Numbas.jme.substituteTree
 */
var substituteTreeOps = jme.substituteTreeOps = {
	'map': function(tree,scope,allowUnbound) {
		tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
		return tree;
	},
	'let': function(tree,scope,allowUnbound) {
		for(var i=1;i<tree.args.length-1;i+=2) {
			tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound);
		}
	}
};

/** Custom findvars behaviour for specific functions - for a given usage of a function, work out which variables it depends on.
 * 
 * Functions have the signature <tree with function call at top, list of bound variable names, scope>.
 *
 * tree.args is a list of the function's arguments.
 *
 * @memberof Numbas.jme
 * @enum {function}
 * @see Numbas.jme.findvars
 */
var findvarsOps = jme.findvarsOps = {
	'map': function(tree,boundvars,scope) {
		boundvars = boundvars.slice();
		if(tree.args[1].tok.type=='list') {
			var names = tree.args[1].args;
			for(var i=0;i<names.length;i++) {
				boundvars.push(names[i].tok.name.toLowerCase());
			}
		} else {
			boundvars.push(tree.args[1].tok.name.toLowerCase());
		}
		var vars = findvars(tree.args[0],boundvars,scope);
		vars = vars.merge(findvars(tree.args[2],boundvars));
		return vars;
	},
	'let': function(tree,boundvars,scope) {
		// find vars used in variable assignments
		var vars = [];
		for(var i=0;i<tree.args.length-1;i+=2) {
			vars = vars.merge(findvars(tree.args[i+1],boundvars,scope));
		}

		// find variable names assigned by let
		boundvars = boundvars.slice();
		for(var i=0;i<tree.args.length-1;i+=2) {
			boundvars.push(tree.args[i].tok.name.toLowerCase());
		}

		// find variables used in the lambda expression, excluding the ones assigned by let
		vars = vars.merge(findvars(tree.args[tree.args.length-1],boundvars,scope));

		return vars;
	},
	'satisfy': function(tree,boundvars,scope) {
		var names = tree.args[0].args.map(function(t){return t.tok.name});
		boundvars = boundvars.concat(0,0,names);
		var vars = [];
		for(var i=1;i<tree.args.length;i++)
			vars = vars.merge(findvars(tree.args[i],boundvars));
		return vars;
	}
}

/** Find all variables used in given syntax tree
 * @memberof Numbas.jme
 * @method
 * @param {Numbas.jme.tree} tree
 * @param {string[]} boundvars - variables to be considered as bound (don't include them)
 * @param {Numbas.jme.Scope} scope
 * @returns {string[]}
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

/** Check that two values are equal 
 * @memberof Numbas.jme
 * @method
 * @param {Numbas.jme.token} r1
 * @param {Numbas.jme.token} r2
 * @param {function} checkingFunction - one of {@link Numbas.jme.checkingFunctions}
 * @param {number} checkingAccuracy
 * @returns {boolean}
 */
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

});
