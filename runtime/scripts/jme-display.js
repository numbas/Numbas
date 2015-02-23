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

Numbas.queueScript('jme-display',['base','math','jme','util'],function() {
	
var math = Numbas.math;
var jme = Numbas.jme;
var util = Numbas.util;

/** A JME expression
 * @typedef JME
 * @type {string}
 */

/** A LaTeX string
 * @typedef TeX
 * @type {string}
 */

/** @namespace Numbas.jme.display */

jme.display = /** @lends Numbas.jme.display */ {
	/** Convert a JME expression to LaTeX.
	 *
	 * @param {JME} expr
	 * @param {string[]|Numbas.jme.Ruleset} ruleset - can be anything accepted by {@link Numbas.jme.display.collectRuleset}
	 * @param {Numbas.jme.Scope} scope
	 * @returns {TeX}
	 */
	exprToLaTeX: function(expr,ruleset,scope)
	{
		if(!ruleset)
			ruleset = simplificationRules.basic;
		ruleset = jme.collectRuleset(ruleset,scope.rulesets);

		expr+='';	//make sure expr is a string

		if(!expr.trim().length)	//if expr is the empty string, don't bother going through the whole compilation proces
			return '';
		var tree = jme.display.simplify(expr,ruleset,scope); //compile the expression to a tree and simplify it
		var tex = texify(tree,ruleset.flags); //render the tree as TeX
		return tex;
	},

	/** Simplify a JME expression string according to the given ruleset and return it as a JME string
	 * 
	 * @param {JME} expr
	 * @param {string[]|Numbas.jme.Ruleset} ruleset - can be anything accepted by {@link Numbas.jme.display.collectRuleset}
	 * @param {Numbas.jme.Scope} scope
	 * @returns {JME}
	 *
	 * @see Numbas.jme.display.simplify
	 */
	simplifyExpression: function(expr,ruleset,scope)
	{
		if(expr.trim()=='')
			return '';
		return treeToJME(jme.display.simplify(expr,ruleset,scope),ruleset.flags);
	},

	/** Simplify a JME expression string according to given ruleset and return it as a syntax tree
	 *
	 * @param {JME} expr 
	 * @param {string[]|Numbas.jme.Ruleset} ruleset
	 * @param {Numbas.jme.Scope} scope
	 * @returns {Numbas.jme.tree}
	 *
	 * @see Numbas.jme.display.simplifyExpression
	 * @see Numbas.jme.display.simplifyTree
	 */
	simplify: function(expr,ruleset,scope)
	{
		if(expr.trim()=='')
			return;

		if(!ruleset)
			ruleset = simplificationRules.basic;
		ruleset = jme.collectRuleset(ruleset,scope.rulesets);		//collect the ruleset - replace set names with the appropriate Rule objects

		try 
		{
			var exprTree = jme.compile(expr,{},true);	//compile the expression to a tree. notypecheck is true, so undefined function names can be used.
			return jme.display.simplifyTree(exprTree,ruleset,scope);	// simplify the tree
		}
		catch(e) 
		{
			//e.message += '\nSimplifying expression failed. Expression was: '+expr;
			throw(e);
		}
	},

	/** Simplify a syntax tree according to the given ruleset
	 * 
	 * @param {Numbas.jme.tree} exprTree
	 * @param {string[]|Numbas.jme.Ruleset} ruleset
	 * @param {Numbas.jme.Scope} scope
	 * @returns {Numbas.jme.tree}
	 *
	 * @see Numbas.jme.display.simplify
	 */
	simplifyTree: function(exprTree,ruleset,scope)
	{
		if(!scope)
			throw(new Numbas.Error('jme.display.simplifyTree.no scope given'));
		scope = Numbas.util.copyobj(scope);
		scope.variables = {};	//remove variables from the scope so they don't accidentally get substituted in
		var applied = true;

		var rules = ruleset.rules;

		// apply rules until nothing can be done
		while( applied )
		{
			//the eval() function is a meta-function which, when used in the result of a rule, allows you to replace an expression with a single data value
			if(exprTree.tok.type=='function' && exprTree.tok.name=='eval')	
			{
				exprTree = {tok: Numbas.jme.evaluate(exprTree.args[0],scope)};
			}
			else
			{
				if(exprTree.args)	//if this token is an operation with arguments, try to simplify the arguments first
				{
					for(var i=0;i<exprTree.args.length;i++)
					{
						exprTree.args[i] = jme.display.simplifyTree(exprTree.args[i],ruleset,scope);
					}
				}
				applied = false;
				for( var i=0; i<rules.length;i++)	//check each rule
				{
					var match;
					if(match = rules[i].match(exprTree,scope))	//if rule can be applied, apply it!
					{
						exprTree = jme.substituteTree(Numbas.util.copyobj(rules[i].result,true),new jme.Scope([{variables:match}]));
						applied = true;
						break;
					}
				}
			}
		}
		return exprTree
	}
};


/// all private methods below here



/** Apply brackets to an op argument if appropriate
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Numbas.jme.tree} thing
 * @param {string[]} texArgs - the arguments of `thing`, as TeX
 * @param {number} i - the index of the argument to bracket
 * @returns {TeX}
 */
function texifyOpArg(thing,texArgs,i)
{
	var precedence = jme.precedence;
	var tex = texArgs[i];
	if(thing.args[i].tok.type=='op')	//if this is an op applied to an op, might need to bracket
	{
		var op1 = thing.args[i].tok.name;	//child op
		var op2 = thing.tok.name;			//parent op
		var p1 = precedence[op1];	//precedence of child op
		var p2 = precedence[op2];	//precedence of parent op

		//if leaving out brackets would cause child op to be evaluated after parent op, or precedences the same and parent op not commutative, or child op is negation and parent is exponentiation
		if( p1 > p2 || (p1==p2 && i>0 && !jme.commutative[op2]) || (op1=='-u' && precedence[op2]<=precedence['*']) )	
			tex = '\\left ( '+tex+' \\right )';
	}
	//complex numbers might need brackets round them when multiplied with something else or unary minusing
	else if(thing.args[i].tok.type=='number' && thing.args[i].tok.value.complex && thing.tok.type=='op' && (thing.tok.name=='*' || thing.tok.name=='-u') )	
	{
		var v = thing.args[i].tok.value;
		if(!(v.re==0 || v.im==0))
			tex = '\\left ( '+tex+' \\right )';
	}
	return tex;
}

/** Helper function for texing infix operators
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the operator
 * @returns {function} - a function which will convert a syntax tree with the operator at the top to TeX, by putting `code` in between the TeX of the two arguments.
 */
function infixTex(code)
{
	return function(thing,texArgs)
	{
		var arity = jme.builtinScope.functions[thing.tok.name][0].intype.length;
		if( arity == 1 )	//if operation is unary, prepend argument with code
		{
			return code+texArgs[0];
		}
		else if ( arity == 2 )	//if operation is binary, put code in between arguments
		{
			return texArgs[0]+' '+code+' '+texArgs[1];
		}
	}
}

/** Helper for texing nullary functions
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the function
 * @returns {function} - a function which returns the appropriate (constant) TeX code
 */
function nullaryTex(code)
{
	return function(thing,texArgs){ return '\\textrm{'+code+'}'; };
}

/** Helper function for texing functions
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the function
 * @returns {function} - a function which converts a syntax tree to the appropriate TeX
 */
function funcTex(code)
{
	return function(thing,texArgs)
	{
		return code+' \\left ( '+texArgs.join(', ')+' \\right )';
	}
}

/** Define how to texify each operation and function
 * @enum {function}
 * @memberof Numbas.jme.display
 */
var texOps = jme.display.texOps = {
	/** range definition. Should never really be seen */
	'#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),	

	/** logical negation */
	'!': infixTex('\\neg '),	

	/** unary addition */
	'+u': infixTex('+'),	

	/** unary minus */
	'-u': (function(thing,texArgs,settings) {
		var tex = texArgs[0];
		if( thing.args[0].tok.type=='op' )
		{
			var op = thing.args[0].tok.name;
			if(!(op=='/' || op=='*') && jme.precedence[op]>jme.precedence['-u'])	//brackets are needed if argument is an operation which would be evaluated after negation
			{
				tex='\\left ( '+tex+' \\right )';
			}
		}
		else if(thing.args[0].tok.type=='number' && thing.args[0].tok.value.complex) {
			var value = thing.args[0].tok.value;
			return settings.texNumber({complex:true,re:-value.re,im:-value.im});
		}
		return '-'+tex;
	}),

	/** exponentiation */
	'^': (function(thing,texArgs) {
		var tex0 = texArgs[0];
		//if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
		if(thing.args[0].tok.type=='op' || (thing.args[0].tok.type=='function' && thing.args[0].tok.name=='exp'))
			tex0 = '\\left ( ' +tex0+' \\right )';	
		return (tex0+'^{ '+texArgs[1]+' }');
	}),


	'*': (function(thing,texArgs) {
		var s = texifyOpArg(thing,texArgs,0);
		for(var i=1; i<thing.args.length; i++ )
		{
			//specials or subscripts
			if(util.isInt(texArgs[i-1].charAt(texArgs[i-1].length-1)) && util.isInt(texArgs[i].charAt(0)))
			{ 
				s+=' \\times ';
			}
			else if(thing.args[i-1].tok.type=='special' || thing.args[i].tok.type=='special')	
			{
				s+=' ';
			}
			//anything times e^(something) or (not number)^(something)
			else if (jme.isOp(thing.args[i].tok,'^') && (thing.args[i].args[0].value==Math.E || thing.args[i].args[0].tok.type!='number'))	
			{
				s+=' ';
			}
			//real number times Pi or E
			else if (thing.args[i].tok.type=='number' && (thing.args[i].tok.value==Math.PI || thing.args[i].tok.value==Math.E || thing.args[i].tok.value.complex) && thing.args[i-1].tok.type=='number' && !(thing.args[i-1].tok.value.complex))	
			{
				s+=' ';
			}
			//number times a power of i
			else if (jme.isOp(thing.args[i].tok,'^') && thing.args[i].args[0].tok.type=='number' && math.eq(thing.args[i].args[0].tok.value,math.complex(0,1)) && thing.args[i-1].tok.type=='number')	
			{
				s+=' ';
			}
			else if ( !(thing.args[i-1].tok.type=='number' && math.eq(thing.args[i-1].tok.value,math.complex(0,1))) && thing.args[i].tok.type=='number' && math.eq(thing.args[i].tok.value,math.complex(0,1)))	//(anything except i) times i
			{
				s+=' ';
			}
			else if ( thing.args[i].tok.type=='number'
					||
						jme.isOp(thing.args[i].tok,'-u')
					||
					(
						!jme.isOp(thing.args[i].tok,'-u') 
						&& (thing.args[i].tok.type=='op' && jme.precedence[thing.args[i].tok.name]<=jme.precedence['*'] 
							&& (thing.args[i].args[0].tok.type=='number' 
							&& thing.args[i].args[0].tok.value!=Math.E)
						)
					)
			)
			{
				s += ' \\times ';
			}
			else
				s+= ' ';
			s += texifyOpArg(thing,texArgs,i);
		}
		return s;
	}),
	'/': (function(thing,texArgs) { return ('\\frac{ '+texArgs[0]+' }{ '+texArgs[1]+' }'); }),
	'+': infixTex('+'),
	'-': (function(thing,texArgs,settings) {
		var a = thing.args[0];
		var b = thing.args[1];
		if(b.tok.type=='number' && b.tok.value.complex && b.tok.value.re!=0) {
			var texb = settings.texNumber(math.complex(b.tok.value.re,-b.tok.value.im));
			return texArgs[0]+' - '+texb;
		}
		else{
			if(jme.isOp(b.tok,'+') || jme.isOp(b.tok,'-'))
				return texArgs[0]+' - \\left( '+texArgs[1]+' \\right)';
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
	'<>': infixTex('\neq'),
	'=': infixTex('='),
	'and': infixTex('\\wedge'),
	'or': infixTex('\\vee'),
	'xor': infixTex('\\, \\textrm{XOR} \\,'),
	'|': infixTex('|'),
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
				if(thing.args[0].tok.type=='number' || thing.args[0].tok.type=='name')
				{
					return texArgs[0]+'!';
				}
				else
				{
					return '\\left ('+texArgs[0]+' \\right)!';
				}
			}),
	'ceil': (function(thing,texArgs) { return '\\left \\lceil '+texArgs[0]+' \\right \\rceil';}),
	'floor': (function(thing,texArgs) { return '\\left \\lfloor '+texArgs[0]+' \\right \\rfloor';}),
	'int': (function(thing,texArgs) { return ('\\int \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
	'defint': (function(thing,texArgs) { return ('\\int_{'+texArgs[2]+'}^{'+texArgs[3]+'} \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
	'diff': (function(thing,texArgs) 
			{
				var degree = (thing.args[2].tok.type=='number' && thing.args[2].tok.value==1) ? '' : '^{'+texArgs[2]+'}';
				if(thing.args[0].tok.type=='name')
				{
					return ('\\frac{\\mathrm{d}'+degree+texArgs[0]+'}{\\mathrm{d}'+texArgs[1]+degree+'}');
				}
				else
				{
					return ('\\frac{\\mathrm{d}'+degree+'}{\\mathrm{d}'+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
				}
			}),
	'partialdiff': (function(thing,texArgs) 
			{ 
				var degree = (thing.args[2].tok.type=='number' && thing.args[2].tok.value==1) ? '' : '^{'+texArgs[2]+'}';
				if(thing.args[0].tok.type=='name')
				{
					return ('\\frac{\\partial '+degree+texArgs[0]+'}{\\partial '+texArgs[1]+degree+'}');
				}
				else
				{
					return ('\\frac{\\partial '+degree+'}{\\partial '+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
				}
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
			return '\\ln \\left( '+texArgs[0]+' \\right)';
	},
	'log': funcTex('\\log_{10}'),
	'vector': (function(thing,texArgs,settings) {
		return '\\left( '+texVector(thing,settings)+' \\right)';
	}),
	'rowvector': (function(thing,texArgs,settings) {
		if(thing.args[0].tok.type!='list')
			return texMatrix({args:[{args:thing.args}]},settings,true);
		else
			return texMatrix(thing,settings,true);
	}),
	'matrix': (function(thing,texArgs,settings) {
		return texMatrix(thing,settings,true);
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
	}
}

/** Convert a number to TeX, displaying it as a fractionm using {@link Numbas.math.rationalApproximation}
 * @memberof Numbas.jme.display
 * @private
 * 
 * @param {number} n
 * @returns {TeX}
 */
var texRationalNumber = jme.display.texRationalNumber = function(n)
{
	if(n.complex)
	{
		var re = texRationalNumber(n.re);
		var im = texRationalNumber(n.im)+' i';
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
		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		var m;
		var out = math.niceNumber(n);
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+' \\times 10^{'+exponent+'}';
		}

		var f = math.rationalApproximation(Math.abs(n));
		if(f[1]==1)
			out = Math.abs(f[0]).toString();
		else
			out = '\\frac{'+f[0]+'}{'+f[1]+'}';
		if(n<0)
			out=' - '+out;

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
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} n
 * @returns {TeX}
 */
function texRealNumber(n)
{
	if(n.complex)
	{
		var re = texRealNumber(n.re);
		var im = texRealNumber(n.im)+' i';
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
		if(n==Infinity)
			return '\\infty';
		else if(n==-Infinity)
			return '-\\infty';

		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		var out = math.niceNumber(n);

		var m;
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+' \\times 10^{'+exponent+'}';
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
 * @memberof Numbas.jme.display
 * @private
 * 
 * @param {number[]|Numbas.jme.tree} v
 * @param {object} settings
 * @returns {TeX}
 */
function texVector(v,settings)
{
	var out;
	var elements;
	if(v.args)
	{
		elements = v.args.map(function(x){return texify(x,settings)});
	}
	else
	{
		var texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
		elements = v.map(function(x){return texNumber(x)});
	}
	if(settings.rowvector)
		out = elements.join(' , ');
	else
		out = '\\begin{matrix} '+elements.join(' \\\\ ')+' \\end{matrix}';
	return out;
}

/** Convert a matrix to TeX.
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Array.Array.<number>|Numbas.jme.tree} m
 * @param {object} settings
 * @param {boolean} parens - enclose the matrix in parentheses?
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
			return x.map(function(y){ return texNumber(y) });
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

/** Dictionary of functions to convert specific name annotations to TeX
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var texNameAnnotations = jme.display.texNameAnnotations = {
	verbatim: function(name) {	//verbatim - use to get round things like i and e being interpreted as constants
		return name;
	},
	op: function(name) {
		return '\\operatorname{'+name+'}';
	},
	vector: function(name) {
		return '\\boldsymbol{'+name+'}';
	},
	unit: function(name) {	//unit vector
		return '\\hat{'+name+'}';
	},
	dot: function(name) {		//dot on top
		return '\\dot{'+name+'}';
	},
	matrix: function(name) {
		return '\\mathrm{'+name+'}';
	}
}
texNameAnnotations.verb = texNameAnnotations.verbatim;
texNameAnnotations.v = texNameAnnotations.vector;
texNameAnnotations.m = texNameAnnotations.matrix;


/** Convert a variable name to TeX
 * @memberof Numbas.jme.display
 *
 * @param {string} name
 * @param {string[]} annotation - 
 * @returns {TeX}
 */

var texName = jme.display.texName = function(name,annotations)
{
	var name = greek.contains(name) ? '\\'+name : name;
	name = name.replace(/(.*)_(.*)('*)$/g,'$1_{$2}$3');	//make numbers at the end of a variable name subscripts
	name = name.replace(/^(.*?[^_])(\d+)('*)$/,'$1_{$2}$3');	//make numbers at the end of a variable name subscripts

	if(!annotations)
		return name;

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

var greek = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega']

/** Dictionary of functions to turn {@link Numbas.jme.types} objects into TeX strings
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToTeX = jme.display.typeToTeX = {
	'number': function(thing,tok,texArgs,settings) {
		if(tok.value==Math.E)
			return 'e';
		else if(tok.value==Math.PI)
			return '\\pi';
		else
			return settings.texNumber(tok.value);
	},
	'string': function(thing,tok,texArgs,settings) {
		if(tok.latex)
			return tok.value;
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
	vector: function(thing,tok,texArgs,settings) {
		return ('\\left( ' 
				+ texVector(tok.value,settings)
				+ ' \\right)' );
	},
	matrix: function(thing,tok,texArgs,settings) {
		return '\\left( '+texMatrix(tok.value,settings)+' \\right)';
	},
	name: function(thing,tok,texArgs,settings) {
		return texName(tok.name,tok.annotation);
	},
	special: function(thing,tok,texArgs,settings) {
		return tok.value;
	},
	conc: function(thing,tok,texArgs,settings) {
		return texArgs.join(' ');
	},
	op: function(thing,tok,texArgs,settings) {
		return texOps[tok.name.toLowerCase()](thing,texArgs,settings);
	},
	'function': function(thing,tok,texArgs,settings) {
		if(texOps[tok.name.toLowerCase()])
		{
			return texOps[tok.name.toLowerCase()](thing,texArgs,settings);
		}
		else
		{
			if(tok.name.replace(/[^A-Za-z]/g,'').length==1)
				var texname=tok.name;
			else
				var texname='\\operatorname{'+tok.name+'}';

			return texName(texname,tok.annotation)+' \\left ( '+texArgs.join(', ')+' \\right )';
		}
	},
	set: function(thing,tok,texArgs,settings) {
		texArgs = [];
		for(var i=0;i<tok.value.length;i++) {
			texArgs.push(texify(tok.value[i],settings));
		}
		return '\\left\\{ '+texArgs.join(', ')+' \\right\\}';
	}
}
/** Turn a syntax tree into a TeX string. Data types can be converted to TeX straightforwardly, but operations and functions need a bit more care.
 *
 * The idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX
 *
 * @memberof Numbas.jme.display
 * @method
 *
 * @param {Numbas.jme.tree} thing
 * @param {object} settings
 *
 * @returns {TeX}
 */
var texify = Numbas.jme.display.texify = function(thing,settings)
{
	if(!thing)
		return '';

	if(!settings)
		settings = {};

	if(thing.args)
	{
		var texArgs = [];
		for(var i=0; i<thing.args.length; i++ )
		{
			texArgs[i] = texify(thing.args[i],settings);
		}
	}

	settings.texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;

	var tok = thing.tok || thing;
	if(tok.type in typeToTeX) {
		return typeToTeX[tok.type](thing,tok,texArgs,settings);
	} else {
		throw(new Numbas.Error(R('jme.display.unknown token type',tok.type)));
	}
}

/** Write a number in JME syntax as a fraction, using {@link Numbas.math.rationalApproximation}
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} n
 * @returns {JME}
 */
var jmeRationalNumber = jme.display.jmeRationalNumber = function(n)
{
	if(n.complex)
	{
		var re = jmeRationalNumber(n.re);
		var im = jmeRationalNumber(n.im)+'i';
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
				return re+' - '+jmeRationalNumber(-n.im)+'i';
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
		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		
		var m;
		var out = math.niceNumber(n);
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+'*10^('+exponent+')';
		}

		var f = math.rationalApproximation(Math.abs(n));
		if(f[1]==1)
			out = Math.abs(f[0]).toString();
		else
			out = f[0]+'/'+f[1];
		if(n<0)
			out=' - '+out;

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
 * @returns {JME}
 */
function jmeRealNumber(n)
{
	if(n.complex)
	{
		var re = jmeRealNumber(n.re);
		var im = jmeRealNumber(n.im);
		if(im[im.length-1].match(/[a-zA-Z]/))
			im += '*i';
		else
			im += 'i';

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
				return re+' - '+jmeRealNumber(-n.im)+'i';
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
		if(n==Infinity)
			return 'infinity';
		else if(n==-Infinity)
			return '-infinity';

		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		var out = math.niceNumber(n);

		var m;
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+'*10^('+exponent+')';
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

/** Dictionary of functions to turn {@link Numbas.jme.types} objects into JME strings
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToJME = Numbas.jme.display.typeToJME = {
	'number': function(tree,tok,bits,settings) {
		switch(tok.value)
		{
		case Math.E:
			return 'e';
		case Math.PI:
			return 'pi';
		default:
			return settings.jmeNumber(tok.value);
		}
	},
	name: function(tree,tok,bits,settings) {
		return tok.name;
	},
	'string': function(tree,tok,bits,settings) {
		var str = tok.value
					.replace(/\\/g,'\\\\')
					.replace(/\\([{}])/g,'$1')
					.replace(/\n/g,'\\n')
					.replace(/"/g,'\\"')
					.replace(/'/g,"\\'")
		;
		return '"'+str+'"';
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
	vector: function(tree,tok,bits,settings) {
		return 'vector('+tok.value.map(settings.jmeNumber).join(',')+')';
	},
	matrix: function(tree,tok,bits,settings) {
		return 'matrix('+
			tok.value.map(function(row){return '['+row.map(settings.jmeNumber).join(',')+']'}).join(',')+')';
	},
	'function': function(tree,tok,bits,settings) {
		if(!bits) {
			return tok.name+'()';
		} else {
			return tok.name+'('+bits.join(',')+')';
		}
	},
	op: function(tree,tok,bits,settings) {
		var op = tok.name;
		var args = tree.args, l = args.length;

		for(var i=0;i<l;i++)
		{
			var arg_type = args[i].tok.type;
			var arg_value = args[i].tok.value;
			var pd;

			if(arg_type=='op' && op in opBrackets && opBrackets[op][i][args[i].tok.name]==true)
			{
				bits[i]='('+bits[i]+')';
				args[i].bracketed=true;
			}
			else if(arg_type=='number' && arg_value.complex && (op=='*' || op=='-u' || op=='/'))	// put brackets round a complex number
			{
				if(arg_value.im!=0 && arg_value.im!=1)
				{
					bits[i] = '('+bits[i]+')';
					args[i].bracketed = true;
				}
			} else if(arg_type=='number' && (pd = math.piDegree(args[i].tok.value))>0 && arg_value/math.pow(Math.PI,pd)>1 && (op=='*' || op=='-u' || op=='/')) {
				bits[i] = '('+bits[i]+')';
				args[i].bracketed = true;
			}
		}
		
		//omit multiplication symbol when not necessary
		if(op=='*')
		{
			//number or brackets followed by name or brackets doesn't need a times symbol
			//except <anything>*(-<something>) does
			if( ((args[0].tok.type=='number' && math.piDegree(args[0].tok.value)==0 && args[0].tok.value!=Math.E) || args[0].bracketed) && (args[1].tok.type == 'name' || args[1].bracketed && !jme.isOp(tree.args[1].tok,'-u')) )	
			{
				op = '';
			}
		}

		switch(op)
		{
		case '+u':
			op='+';
			break;
		case '-u':
			op='-';
			if(args[0].tok.type=='number' && args[0].tok.value.complex)
				return settings.jmeNumber({complex:true, re: -args[0].tok.value.re, im: -args[0].tok.value.im});
			break;
		case '-':
			var b = args[1].tok.value;
			if(args[1].tok.type=='number' && args[1].tok.value.complex && args[1].tok.value.re!=0) {
				return bits[0]+' - '+settings.jmeNumber(math.complex(b.re,-b.im));
			}
			op = ' - ';
			break;
		case 'and':
		case 'or':
		case 'isa':
		case 'except':
		case '+':
			op=' '+op+' ';
			break;
		case 'not':
			op = 'not ';
		}

		if(l==1)
			{return op+bits[0];}
		else
			{return bits[0]+op+bits[1];}
	},
	set: function(tree,tok,bits,settings) {
		return 'set('+tok.value.map(function(thing){return treeToJME({tok:thing},settings);}).join(',')+')';
	}
}

/** Turn a syntax tree back into a JME expression (used when an expression is simplified)
 * @memberof Numbas.jme.display
 * @method
 * 
 * @param {Numbas.jme.tree} tree
 * @param {object} settings
 * @returns {JME}
 */
var treeToJME = jme.display.treeToJME = function(tree,settings)
{
	if(!tree)
		return '';

	settings = settings || {};

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
		throw(new Numbas.Error(R('jme.display.unknown token type',tok.type)));
	}
}


/** Does each argument (of an operation) need brackets around it?
 *
 * Arrays consisting of one object for each argument of the operation
 * @enum
 * @memberof Numbas.jme.display
 * @private
 */
var opBrackets = Numbas.jme.display.opBrackets = {
	'+u':[{}],
	'-u':[{'+':true,'-':true}],
	'+': [{},{}],
	'-': [{},{'+':true,'-':true}],
	'*': [{'+u':true,'-u':true,'+':true, '-':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '/':true}],
	'/': [{'+u':true,'-u':true,'+':true, '-':true, '*':true},{'+u':true,'-u':true,'+':true, '-':true, '*':true}],
	'^': [{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
	'and': [{'or':true, 'xor':true},{'or':true, 'xor':true}],
	'or': [{'xor':true},{'xor':true}],
	'xor':[{},{}],
	'=': [{},{}]
};

/** Simplification rule
 * @memberof Numbas.jme.display
 * @constructor
 *
 * @param {JME} pattern - expression pattern to match. Variables will match any sub-expression.
 * @param {JME[]} conditions - conditions as expressions in JME expressions on the matched variables, which must all evaluate to true for the rule to match.
 * @param {JME} result - expression pattern to rewrite to.
 * 
 * @property {JME} patternString
 * @property {Numbas.jme.tree} tree - `patternString` compiled to a syntax tree
 * @property {Numbas.jme.tree} result - `result` compiled to a syntax tree
 * @property {Numbas.jme.tree[]} conditions `conditions` compiled to syntax trees
 */
var Rule = jme.display.Rule = function(pattern,conditions,result)
{
	this.patternString = pattern;
	this.tree = jme.compile(pattern,{},true);

	this.result = jme.compile(result,{},true);

	this.conditions = [];
	for(var i=0;i<conditions.length;i++)
	{
		this.conditions.push(jme.compile(conditions[i],{},true));
	}
}

Rule.prototype = /** @lends Numbas.jme.display.Rule.prototype */ {
	/** Match a rule on given syntax tree.
	 * @memberof Numbas.jme.display.Rule.prototype
	 * @param {Numbas.jme.tree} exprTree - the syntax tree to test
	 * @param {Numbas.jme.Scope} scope - used when checking conditions
	 * @returns {boolean|object} - `false` if no match, or a dictionary of matched subtrees
	 */
	match: function(exprTree,scope)
	{
		//see if expression matches rule
		var match = matchTree(this.tree,exprTree);
		if(match==false)
			return false;

		//if expression matches rule, then match is a dictionary of matched variables
		//check matched variables against conditions
		if(this.matchConditions(match,scope))
			return match;
		else
			return false;
	},

	/** Check that a matched pattern satisfies all the rule's conditions
	 * @memberof Numbas.jme.display.Rule.prototype
	 * @param {object} match
	 * @param {Numbas.jme.Scope} scope
	 * @returns {boolean}
	 */
	matchConditions: function(match,scope)
	{
		for(var i=0;i<this.conditions.length;i++)
		{
			var c = Numbas.util.copyobj(this.conditions[i],true);
			c = jme.substituteTree(c,new jme.Scope([{variables:match}]));
			try
			{
				var result = jme.evaluate(c,scope);
				if(result.value==false)
					return false;
			}
			catch(e)
			{
				return false;
			}
		}
		return true;
	}
}

var endTermNames = {
	'??':true,
	'm_nothing':true,
	'm_number': true
}
function isEndTerm(term) {
	while(term.tok.type=='function' && /^m_(?:all|pm|not|commute)$/.test(term.tok.name) || jme.isOp(term.tok,';')) {
		term = term.args[0];
	}
	if(term.tok.type=='function' && term.tok.name=='m_any') {
		for(var i=0;i<term.args.length;i++) {
			if(isEndTerm(term.args[i])) {
				return true;
			}
		}
		return false;
	}
	return term.tok.type=='name' && endTermNames[term.tok.name];
}

function getCommutingTerms(tree,op,names) {
	if(names===undefined) {
		names = [];
	}

	if(op=='+' && jme.isOp(tree.tok,'-')) {
		tree = {tok: new jme.types.TOp('+'), args: [tree.args[0],{tok: new jme.types.TOp('-u'), args: [tree.args[1]]}]};
	}

	if(!tree.args || tree.tok.name!=op) {
		return {terms: [tree], termnames: names.slice()};
	}

	var terms = [];
	var termnames = [];
	var rest = [];
	var restnames = [];
	for(var i=0; i<tree.args.length;i++) {
		var arg = tree.args[i];
		var oarg = arg;
		var argnames = names.slice();
		while(jme.isOp(arg.tok,';')) {
			argnames.push(arg.args[1].tok.name);
			arg = arg.args[0];
		}
		if(jme.isOp(arg.tok,op) || (op=='+' && jme.isOp(arg.tok,'-'))) {
			var sub = getCommutingTerms(arg,op,argnames);
			terms = terms.concat(sub.terms);
			termnames = termnames.concat(sub.termnames);
		} else if(jme.isName(arg.tok,'?') || isEndTerm(arg)) {
			rest.push(arg);
			restnames.push(argnames);
		} else {
			terms.push(arg);
			termnames.push(argnames);
		}
	}
	if(rest.length) {
		terms = terms.concat(rest);
		termnames = termnames.concat(restnames);
	}
	return {terms: terms, termnames: termnames};
}
Numbas.jme.display.getCommutingTerms = getCommutingTerms;

/** Recusrively check whether `exprTree` matches `ruleTree`. Variables in `ruleTree` match any subtree.
 * @memberof Numbas.jme.display
 *
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {boolean} doCommute - take commutativity of operations into account, e.g. terms of a sum can be in any order.
 * @returns {boolean|object} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
function matchTree(ruleTree,exprTree,doCommute)
{
	if(doCommute===undefined) {
		doCommute = false;
	}
	if(!exprTree)
		return false;

	var ruleTok = ruleTree.tok;
	var exprTok = exprTree.tok;

	if(jme.isOp(ruleTok,';')) {
		if(ruleTree.args[1].tok.type!='name') {
			throw(new Numbas.Error('jme.matchTree.group name not a name'));
		}
		var name = ruleTree.args[1].tok.name;
		var m = matchTree(ruleTree.args[0],exprTree,doCommute);
		if(m) {
			m[name] = exprTree;
			return m;
		} else {
			return false;
		}
	}

	if(ruleTok.type=='name')
	{
		switch(ruleTok.name) {
			case '?':
			case '??':
				return {};
			case 'm_number':
				return exprTok.type=='number' ? {} : false;
		}
	}

	if(ruleTok.type=='function') {
		switch(ruleTok.name) {
			case 'm_any':
				for(var i=0;i<ruleTree.args.length;i++) {
					var m;
					if(m=matchTree(ruleTree.args[i],exprTree,doCommute)) {
						return m;
					}
				}
				return false;

			case 'm_all':
				return matchTree(ruleTree.args[0],exprTree,doCommute);

			case 'm_pm':
				if(jme.isOp(exprTok,'-u')) {
					return matchTree({tok: new jme.types.TOp('-u'),args: [ruleTree.args[0]]},exprTree,doCommute);
				} else {
					return matchTree(ruleTree.args[0],exprTree,doCommute);
				}

			case 'm_not':
				if(!matchTree(ruleTree.args[0],exprTree,doCommute)) {
					return {};
				} else {
					return false;
				}

			case 'm_and':
				var d = {};
				for(var i=0;i<ruleTree.args.length;i++) {
					var m = matchTree(ruleTree.args[i],exprTree,doCommute);
					if(m) {
						for(var name in m) {
							d[name] = m[name];
						}
					} else {
						return false;
					}
				}
				return d;

			case 'm_uses':
				var vars = jme.findvars(exprTree);
				for(var i=0;i<ruleTree.args.length;i++) {
					var name = ruleTree.args[i].tok.name;
					if(!vars.contains(name)) {
						return false;
					}
				}
				return {};

			case 'm_commute':
				return matchTree(ruleTree.args[0],exprTree,true);

			case 'm_type':
				var wantedType = ruleTree.args[0].tok.name || ruleTree.args[0].tok.value;
				if(exprTok.type==wantedType) {
					return {};
				} else {
					return false;
				}
		}
	}
	if(jme.isName(ruleTok,'m_nothing')) {
		return false;
	} else if(jme.isName(ruleTok,'m_number')) {
		if(exprTok.type=='number') {
			return {};
		} else {
			return false;
		}
	}

	if(ruleTok.type!='op' && ruleTok.type != exprTok.type)
	{
		return false;
	}

	switch(ruleTok.type)
	{
	case 'number':
		if( !math.eq(ruleTok.value,exprTok.value) ) {
			return false;
		} else {
			return {};
		}

	case 'string':
	case 'boolean':
	case 'special':
	case 'range':
		if(ruleTok.value != exprTok.value) {
			return false;
		} else {
			return {};
		}

	case 'function':
	case 'op':
		var d = {};

		if(doCommute && jme.commutative[ruleTok.name]) {
			var commutingOp = ruleTok.name;

			var ruleTerms = getCommutingTerms(ruleTree,commutingOp);
			var exprTerms = getCommutingTerms(exprTree,commutingOp);
			var rest = [];

			var namedTerms = {};
			var matchedRules = [];
			var termMatches = [];

			for(var i=0; i<exprTerms.terms.length; i++) {
				var m = null;
				var matched = false;
				for(var j=0; j<ruleTerms.terms.length; j++) {
					var ruleTerm = ruleTerms.terms[j];
					m = matchTree(ruleTerm,exprTerms.terms[i],doCommute);
					if((!matchedRules[j] || ruleTerm.tok.name=='m_all') && m) {
						matched = true;
						matchedRules[j] = true;
						for(var name in m) {
							if(!namedTerms[name]) {
								namedTerms[name] = [];
							}
							namedTerms[name].push(m[name]);
						}
						var names = ruleTerms.termnames[j];
						if(names) {
							for(var k=0;k<names.length;k++) {
								var name = names[k];
								if(!namedTerms[name]) {
									namedTerms[name] = [];
								}
								namedTerms[name].push(exprTerms.terms[i]);
							}
						}
						break;
					}
				}
				if(!matched) {
					return false;
				}
			}
			for(var i=0;i<ruleTerms.terms.length;i++) {
				var term = ruleTerms.terms[i];
				if(!isEndTerm(term) && !matchedRules[i]) {
					return false;
				}
			}
			for(var name in namedTerms) {
				var terms = namedTerms[name];
				var sub = terms[0];
				for(var i=1;i<terms.length;i++) {
					var op = new jme.types.TOp(commutingOp);
					sub = {tok: op, args: [sub,terms[i]]};
				}
				d[name] = sub;
			}
			return d;
		} else {
			if(ruleTok.type!=exprTok.type || ruleTok.name!=exprTok.name) {
				return false;
			}
			for(var i=0;i<ruleTree.args.length;i++)
			{
				var m = matchTree(ruleTree.args[i],exprTree.args[i],doCommute);
				if(m==false) {
					return false;
				} else {
					for(var x in m) {
						d[x]=m[x];
					}
				}
			}
			return d
		}
	case 'name':
		if(ruleTok.name.toLowerCase()==exprTok.name.toLowerCase()) {
			return {};
		} else {
			return false;
		}
	default:
		return {};
	}
}
jme.display.matchTree = matchTree;

/** Match expresison against a pattern. Wrapper for {@link Numbas.jme.display.matchTree}
 *
 * @memberof Numbas.jme.display
 * @method
 *
 * @param {JME} pattern
 * @param {JME} expr
 * @param {boolean} doCommute
 *
 * @returns {boolean|object} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchExpression = jme.display.matchExpression = function(pattern,expr,doCommute) {
	pattern = jme.compile(pattern);
	expr = jme.compile(expr);
	return matchTree(pattern,expr,doCommute);
}

/** Built-in simplification rules
 * @enum {Numbas.jme.display.Rule[]}
 * @memberof Numbas.jme.display
 */
var simplificationRules = jme.display.simplificationRules = {
	basic: [
		['+(?;x)',[],'x'],					//get rid of unary plus
		['?;x+(-?;y)',[],'x-y'],			//plus minus = minus
		['?;x+?;y',['y<0'],'x-eval(-y)'],
		['?;x-?;y',['y<0'],'x+eval(-y)'],
		['?;x-(-?;y)',[],'x+y'],			//minus minus = plus
		['-(-?;x)',[],'x'],				//unary minus minus = plus
		['-?;x',['x isa "complex"','re(x)<0'],'eval(-x)'],
		['?;x+?;y',['x isa "number"','y isa "complex"','re(y)=0'],'eval(x+y)'],
		['-?;x+?;y',['x isa "number"','y isa "complex"','re(y)=0'],'-eval(x-y)'],
		['(-?;x)/?;y',[],'-(x/y)'],			//take negation to left of fraction
		['?;x/(-?;y)',[],'-(x/y)'],			
		['(-?;x)*?;y',[],'-(x*y)'],			//take negation to left of multiplication
		['?;x*(-?;y)',[],'-(x*y)'],		
		['?;x+(?;y+?;z)',[],'(x+y)+z'],		//make sure sums calculated left-to-right
		['?;x-(?;y+?;z)',[],'(x-y)-z'],
		['?;x+(?;y-?;z)',[],'(x+y)-z'],
		['?;x-(?;y-?;z)',[],'(x-y)+z'],
		['(?;x*?;y)*?;z',[],'x*(y*z)'],		//make sure multiplications go right-to-left
		['?;n*i',['n isa "number"'],'eval(n*i)'],			//always collect multiplication by i
		['i*?;n',['n isa "number"'],'eval(n*i)']
	],

	unitFactor: [
		['1*?;x',[],'x'],
		['?;x*1',[],'x']
	],

	unitPower: [
		['?;x^1',[],'x']
	],

	unitDenominator: [
		['?;x/1',[],'x']
	],

	zeroFactor: [
		['?;x*0',[],'0'],
		['0*?;x',[],'0'],
		['0/?;x',[],'0']
	],

	zeroTerm: [
		['0+?;x',[],'x'],
		['?;x+0',[],'x'],
		['?;x-0',[],'x'],
		['0-?;x',[],'-x']
	],

	zeroPower: [
		['?;x^0',[],'1']
	],

	noLeadingMinus: [
		['-?;x+?;y',[],'y-x']											//don't start with a unary minus
	],

	collectNumbers: [
		['-?;x-?;y',['x isa "number"','y isa "number"'],'-(x+y)'],										//collect minuses
		['?;n+?;m',['n isa "number"','m isa "number"'],'eval(n+m)'],	//add numbers
		['?;n-?;m',['n isa "number"','m isa "number"'],'eval(n-m)'],	//subtract numbers
		['?;n+?;x',['n isa "number"','!(x isa "number")'],'x+n'],		//add numbers last

		['(?;x+?;n)+?;m',['n isa "number"','m isa "number"'],'x+eval(n+m)'],	//collect number sums
		['(?;x-?;n)+?;m',['n isa "number"','m isa "number"'],'x+eval(m-n)'],	
		['(?;x+?;n)-?;m',['n isa "number"','m isa "number"'],'x+eval(n-m)'],	
		['(?;x-?;n)-?;m',['n isa "number"','m isa "number"'],'x-eval(n+m)'],	
		['(?;x+?;n)+?;y',['n isa "number"'],'(x+y)+n'],						//shift numbers to right hand side
		['(?;x+?;n)-?;y',['n isa "number"'],'(x-y)+n'],
		['(?;x-?;n)+?;y',['n isa "number"'],'(x+y)-n'],
		['(?;x-?;n)-?;y',['n isa "number"'],'(x-y)-n'],

		['?;n*?;m',['n isa "number"','m isa "number"'],'eval(n*m)'],		//multiply numbers
		['?;x*?;n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],			//shift numbers to left hand side
		['?;m*(?;n*?;x)',['m isa "number"','n isa "number"'],'eval(n*m)*x']
	],

	simplifyFractions: [
		['?;n/?;m',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'eval(n/gcd_without_pi_or_i(n,m))/eval(m/gcd_without_pi_or_i(n,m))'],			//cancel simple fraction
		['(?;n*?;x)/?;m',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'(eval(n/gcd_without_pi_or_i(n,m))*x)/eval(m/gcd_without_pi_or_i(n,m))'],	//cancel algebraic fraction
		['?;n/(?;m*?;x)',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'eval(n/gcd_without_pi_or_i(n,m))/(eval(m/gcd_without_pi_or_i(n,m))*x)'],	
		['(?;n*?;x)/(?;m*?;y)',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'(eval(n/gcd_without_pi_or_i(n,m))*x)/(eval(m/gcd_without_pi_or_i(n,m))*y)'],
		['?;n/?;m',['n isa "complex"','m isa "complex"','re(n)=0','re(m)=0'],'eval(n/i)/eval(m/i)']			// cancel i when numerator and denominator are both purely imaginary
	],

	zeroBase: [
		['0^?;x',[],'0']
	],

	constantsFirst: [
		['?;x*?;n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],
		['?;x*(?;n*?;y)',['n isa "number"','n<>i','!(x isa "number")'],'n*(x*y)']
	],

	sqrtProduct: [
		['sqrt(?;x)*sqrt(?;y)',[],'sqrt(x*y)']
	],

	sqrtDivision: [
		['sqrt(?;x)/sqrt(?;y)',[],'sqrt(x/y)']
	],

	sqrtSquare: [
		['sqrt(?;x^2)',[],'x'],
		['sqrt(?;x)^2',[],'x'],
		['sqrt(?;n)',['n isa "number"','isint(sqrt(n))'],'eval(sqrt(n))']
	],

	trig: [
		['sin(?;n)',['n isa "number"','isint(2*n/pi)'],'eval(sin(n))'],
		['cos(?;n)',['n isa "number"','isint(2*n/pi)'],'eval(cos(n))'],
		['tan(?;n)',['n isa "number"','isint(n/pi)'],'0'],
		['cosh(0)',[],'1'],
		['sinh(0)',[],'0'],
		['tanh(0)',[],'0']
	],

	otherNumbers: [
		['?;n^?;m',['n isa "number"','m isa "number"'],'eval(n^m)']
	]
};
/** Compile an array of rules (in the form `[pattern,conditions[],result]` to {@link Numbas.jme.display.Rule} objects
 * @param {Array} rules
 * @returns {Numbas.jme.Ruleset}
 */
var compileRules = jme.display.compileRules = function(rules)
{
	for(var i=0;i<rules.length;i++)
	{
		pattern = rules[i][0];
		conditions = rules[i][1];
		result = rules[i][2];
		rules[i] = new Rule(pattern,conditions,result);
	}
	return new jme.Ruleset(rules,{});
}

var all=[];
var nsimplificationRules = Numbas.jme.display.simplificationRules = {};
for(var x in simplificationRules)
{
	nsimplificationRules[x] = nsimplificationRules[x.toLowerCase()] = compileRules(simplificationRules[x]);
	all = all.concat(nsimplificationRules[x].rules);
}
simplificationRules = nsimplificationRules;
simplificationRules['all']=new jme.Ruleset(all,{});

Numbas.jme.builtinScope = new Numbas.jme.Scope([Numbas.jme.builtinScope,{rulesets: simplificationRules}]);
});
