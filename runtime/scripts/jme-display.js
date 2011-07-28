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


Numbas.queueScript('scripts/jme-display.js',['math','jme'],function() {
	
	var math = Numbas.math;

	var jme = Numbas.jme;

jme.display = {

	exprToLaTeX: function(expr,settings)
	{
		expr+='';
		if(!expr.trim().length)
			return '';
		var tree = jme.display.simplify(expr,settings);
		var tex = texify(tree,settings);
		return tex;
	},

	parseSimplificationSettings: function(settingsString)
	{
		var settings = {};

		for(var i=0; i<settingsString.length && i<simplificationNames.length; i++)
		{
			settings[ simplificationNames[i] ] = settingsString.substr(i,1)=='1';
		}

		return settings;
	},

	simplifyExpression: function(expr,settings)
	{
		return treeToJME(jme.display.simplify(expr,settings));
	},

	simplify: function(expr,settings)
	{
		try 
		{
			var exprTree = jme.compile(expr,{},true);
			var rules = Numbas.util.copyarray(simplificationRules.basic);
			for(var x in settings)
			{
				if(settings[x]==true && simplificationRules[x]!==undefined)
				{
					rules = rules.concat(simplificationRules[x]);
				}
			}
			return jme.display.simplifyTree(exprTree,rules);
		}
		catch(e) 
		{
			e.message += '\nExpression was: '+expr;
			throw(e);
		}
	},

	simplifyTree: function(exprTree,rules)
	{
		var applied = true;
		while( applied )
		{
			if(exprTree.tok.type=='function' && exprTree.tok.name=='eval')
			{
				exprTree = {tok: Numbas.jme.evaluate(exprTree.args[0])};
			}
			else
			{
				if(exprTree.args)
				{
					for(var i=0;i<exprTree.args.length;i++)
					{
						exprTree.args[i] = jme.display.simplifyTree(exprTree.args[i],rules);
					}
				}
				applied = false;
				for( var i=0; i<rules.length;i++)
				{
					var match;
					if(match = rules[i].match(exprTree))
					{
						//Numbas.debug("match rule "+rules[i].patternString,true);
						//Numbas.debug(treeToJME(exprTree),true);
						exprTree = jme.substituteTree(Numbas.util.copyobj(rules[i].result,true),match);
						//Numbas.debug(treeToJME(exprTree),true);
						applied = true;
						break;
					}
				}
			}
		}
		return exprTree
	}
};


var simplificationNames = jme.display.simplificationNames = [	
							'unitFactor','unitPower','unitDenominator','zeroFactor','zeroTerm','zeroPower',
							'collectNumbers','simplifyFractions','zeroBase','constantsFirst','sqrtProduct',
							'sqrtDivision','sqrtSquare','trig','otherNumbers', 'fractionNumbers' ];

//gets the LaTeX version of an op argument - applies brackets if appropraite
function texifyOpArg(thing,texArgs,i)
{
	var precedence = jme.precedence;
	tex = texArgs[i];
	if(thing.args[i].tok.type=='op')	//if this is an op applied to an op, might need to bracket
	{
		var op1 = thing.args[i].tok.name;	//child op
		var op2 = thing.tok.name;			//parent op
		var p1 = precedence[op1];	//precedence of child op
		var p2 = precedence[op2];	//precedence of parent op
		if( p1 > p2 || (p1==p2 && i>0 && !jme.commutative[op2]) || (op1=='-u' && precedence[op2]<=precedence['*']) )	
		//if leaving out brackets would cause child op to be evaluated after parent op, or precedences the same and parent op not commutative, or child op is negation and parent is exponentiation
			tex = '\\left ( '+tex+' \\right )';
	}
	else if(thing.args[i].tok.type=='number' && thing.args[i].tok.value.complex && thing.tok.type=='op' && (thing.tok.name=='*' || thing.tok.name=='-u') )	
	//complex numbers might need brackets round them when multiplied with something else or unary minusing
	{
		var v = thing.args[i].tok.value;
		if(!(v.re==0 || v.im==0))
			tex = '\\left ( '+tex+' \\right )';
	}
	return tex;
}

// helper function for texing infix operators
function infixTex(code)
{
	return function(thing,texArgs)
	{
		var arity = jme.builtins[thing.tok.name][0].intype.length;
		if( arity == 1 )
		{
			return code+texArgs[0];
		}
		else if ( arity == 2 )
		{
			return texArgs[0]+' '+code+' '+texArgs[1];
		}
	}
}

//helper for texing nullary functions
function nullaryTex(code)
{
	return function(thing,texArgs){ return '\\textrm{'+code+'}'; };
}

//helper function for texing functions
function funcTex(code)
{
	return function(thing,texArgs)
	{
		return code+' \\left ( '+texArgs.join(', ')+' \\right )';
	}
}

var texOps = {
	'#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),
	'_': (function(thing,texArgs) { return texArgs[0]+'_{'+texArgs[1]+'}'; }),
	'!': infixTex('\\neg '),
	'+u': infixTex('+'),
	'-u': (function(thing,texArgs) { 
		var tex = texArgs[0];
		if( thing.args[0].tok.type=='op' )
		{
			var op = thing.args[0].tok.name;
			//if(!( thing.args[0].tok.name=='*' || thing.args[0].tok.name=='/' ))
			if(jme.precedence[op]>jme.precedence['-u'])
			{
				tex='\\left ( '+tex+' \\right )';
			}
		}
		return '-'+tex;
	}),
	'^': (function(thing,texArgs) { 
		var tex0 = texArgs[0];
		if(thing.args[0].tok.type=='op')
			tex0 = '\\left ( ' +tex0+' \\right )';
		return (tex0+'^{ '+texArgs[1]+' }');
	}),
	'*': (function(thing,texArgs) {
		var s = texifyOpArg(thing,texArgs,0);
		for(var i=1; i<thing.args.length; i++ )
		{
			if(thing.args[i-1].tok.type=='special' || thing.args[i].tok.type=='special' || (thing.args[i-1].tok.type=='op' && thing.args[i-1].tok.name=='_') || (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='_'))	//specials or subscripts
			{
				s+=' ';
			}
			else if (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='^' && (thing.args[i].args[0].value==Math.E || thing.args[i].args[0].tok.type!='number'))	//anything times e^(something) or (not number)^(something)
			{
				s+=' ';
			}
			else if (thing.args[i].tok.type=='number' && (thing.args[i].tok.value==Math.PI || thing.args[i].tok.value==Math.E || thing.args[i].tok.value.complex) && thing.args[i-1].tok.type=='number')	//number times Pi or E
			{
				s+=' ';
			}
			else if (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='^' && thing.args[i].args[0].tok.type=='number' && math.eq(thing.args[i].args[0].tok.value,math.complex(0,1)) && thing.args[i-1].tok.type=='number')	//number times a power of i
			{
				s+=' ';
			}
			else if ( thing.args[i].tok.type=='number'
					|| (!(thing.args[i-1].tok.type=='op' && thing.args[i-1].tok.name=='-u') &&
						(thing.args[i].tok.type=='op' && jme.precedence[thing.args[i].tok.name]<=jme.precedence['*'] && thing.args[i].tok.name!='-u' && (thing.args[i].args[0].tok.type=='number' && thing.args[i].args[0].tok.value!=Math.E))
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
	'-': infixTex('-'),
	'..': infixTex('\\dots'),
	'<': infixTex('\\lt'),
	'>': infixTex('\\gt'),
	'<=': infixTex('\\leq'),
	'>=': infixTex('\\geq'),
	'<>': infixTex('\neq'),
	'=': infixTex('='),
	'&&': infixTex('\\wedge'),
	'||': infixTex('\\vee'),
	'xor': infixTex('\\, \\textrm{XOR} \\,'),
	'|': infixTex('|'),
	'abs': (function(thing,texArgs) { return ('\\left | '+texArgs[0]+' \\right |') }),
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
	'int': (function(thing,texArgs) { return ('\\int \\! '+texArgs[0]+' \\, d'+texArgs[1]); }),
	'defint': (function(thing,texArgs) { return ('\\int_{'+texArgs[2]+'}^{'+texArgs[3]+'} \\! '+texArgs[0]+' \\, d'+texArgs[1]); }),
	'diff': (function(thing,texArgs) 
			{
				var degree = (thing.args[2].tok.type=='number' && thing.args[2].tok.value==1) ? '' : '^{'+texArgs[2]+'}';
				if(thing.args[0].tok.type=='name')
				{
					return ('\\frac{d'+degree+texArgs[0]+'}{d'+texArgs[1]+degree+'}');
				}
				else
				{
					return ('\\frac{d'+degree+'}{d'+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
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
	'root': (function(thing,texArgs) { return '\\sqrt['+texArgs[0]+']{'+texArgs[1]+'}'; }),
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
	'ln': funcTex('\\ln'),
	'log': funcTex('\\log_{10}')
}

function texRationalNumber(n)
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

		var f = math.rationalApproximation(Math.abs(n));
		if(f[1]==1)
			out = Math.abs(f[0]).toString();
		else
			var out = '\\frac{'+f[0]+'}{'+f[1]+'}';
		if(n<0)
			out=' - '+out;

		switch(piD)
		{
		case 0:
			return out;
		case 1:
			return out+' \\pi';
		default:
			return out+' \\pi^{'+piD+'}';
		}
	}
}

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
		var piD;
		if((piD = math.piDegree(n)) > 0)
			n /= Math.pow(Math.PI,piD);

		out = math.niceNumber(n);
		switch(piD)
		{
		case 0:
			return out;
		case 1:
			if(n==1)
				return '\\pi';
			else
				return out+' \\pi';
		default:
			if(n==1)
				return '\\pi^{'+piD+'}';
			else
				return out+' \\pi^{'+piD+'}';
		}
	}
}

var greek = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega']

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

	var tok = thing.tok || thing;
	switch(tok.type)
	{
	case 'number':
		if(tok.value==Math.E)
			return 'e';
		else if(tok.value==Math.PI)
			return '\\pi';
		else
			if(settings.fractionNumbers)
			{
				return texRationalNumber(tok.value);
			}
			else
			{
				return texRealNumber(tok.value);
			}
	case 'string':
		return '"\\textrm{'+tok.value+'}"';
		break;
	case 'boolean':
		return tok.value ? 'true' : 'false';
		break;
	case 'range':
		return tok.value[0]+ ' \dots '+tok.value[1];
		break;
	case 'list':
		if(!texArgs)
		{
			texArgs = [];
			for(var i=0;i<tok.vars;i++)
			{
				texArgs[i] = texify(tok.value[i],settings);
			}
		}
		return '\\{ '+texArgs.join(', ')+' \\}';
	case 'name':
		if(greek.contains(tok.name))
			return '\\'+tok.name;
		else
			return tok.name;
		break;
	case 'special':
		return tok.value;
		break;
	case 'conc':
		return texArgs.join(' ');
		break;
	case 'op':
		return texOps[tok.name.toLowerCase()](thing,texArgs);
		break;
	case 'function':
		if(texOps[tok.name.toLowerCase()])
		{
			return texOps[tok.name.toLowerCase()](thing,texArgs);
		}
		else
		{
			if(tok.name.replace(/[^A-Za-z]/g,'').length==1)
				var texname=tok.name;
			else
				var texname='\\operatorname{'+tok.name+'}';

			return texname+' \\left ( '+texArgs.join(', ')+' \\right )';
		}
		break;
	default:
		throw(new Error("Can't texify token type "+tok.type));
	}
}


//turns an evaluation tree back into a JME expression
//(used when an expression is simplified)
function treeToJME(tree)
{
	var args=tree.args, l;

	if(args!==undefined && ((l=args.length)>0))
	{
		var bits = args.map(treeToJME);
	}

	var tok = tree.tok;
	switch(tok.type)
	{
	case 'number':
		switch(tok.value)
		{
		case Math.E:
			return 'e';
		case Math.PI:
			return 'pi';
		default:
			return Numbas.math.niceNumber(tok.value);
		}
	case 'name':
		return tok.name;
	case 'string':
		return '"'+tok.value+'"';
	case 'boolean':
		return (tok.value ? 'true' : false);
	case 'range':
		return tok.value[0]+'..'+tok.value[1]+(tok.value[2]==1 ? '' : '#'+tok.value[2]);
	case 'list':
		return '[ '+bits.join(', ')+' ]';
	case 'special':
		return tok.value;
	case 'conc':
		return '';
	case 'function':
		return tok.name+'('+bits.join(',')+')';
	case 'op':
		var op = tok.name;

		for(var i=0;i<l;i++)
		{
			if(args[i].tok.type=='op' && opBrackets[op][args[i].tok.name]==true)
			{
				bits[i]='('+bits[i]+')';
				args[i].bracketed=true;
			}
			else if(args[i].tok.type=='number' && args[i].tok.value.complex && (op=='*' || op=='-u'))
			{
				if(!(args[i].tok.value.re==0 || args[i].tok.value.im==0))
				{
					bits[i] = '('+bits[i]+')';
					args[i].bracketed = true;
				}
			}
		}
		
		//omit multiplication symbol when not necessary
		if(op=='*')
		{
			if( (args[0].tok.type=='number' || args[0].bracketed) && (args[1].tok.type == 'name' || args[1].bracketed) )	//number or brackets followed by name or brackets doesn't need a times symbol
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
			break;
		}

		if(l==1)
			{return op+bits[0];}
		else
			{return bits[0]+op+bits[1];}
	}
}

//does each argument (of an operation) need brackets around it?
var opBrackets = {
	'+u':{},
	'-u':{'+':true,'-':true},
	'+': {},
	'-': {},
	'*': {'+u':true,'-u':true,'+':true, '-':true},
	'/': {'+u':true,'-u':true,'+':true, '-':true, '*':true},
	'^': {'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true},
	'and': {'or':true, 'xor':true},
	'or': {'xor':true},
	'xor':{}
};

var Rule = jme.display.Rule = function(pattern,conditions,result)
{
	this.patternString = pattern;
	this.tree = jme.compile(pattern,{});

	this.result = jme.compile(result,{});

	this.conditions = [];
	for(var i=0;i<conditions.length;i++)
	{
		this.conditions.push(jme.compile(conditions[i],{}));
	}
}

Rule.prototype = {
	match: function(exprTree)
	{
		//see if expression matches rule
		var match = matchTree(this.tree,exprTree);
		if(match==false)
			return false;

		//if expression matches rule, then match is a dictionary of matched variables
		//check matched variables against conditions
		if(this.matchConditions(match))
			return match;
		else
			return false;
	},

	matchConditions: function(match)
	{
		for(var i=0;i<this.conditions.length;i++)
		{
			var c = Numbas.util.copyobj(this.conditions[i],true);
			c = jme.substituteTree(c,match);
			try
			{
				var result = jme.evaluate(c,{});
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


function matchTree(ruleTree,exprTree)
{
	if(!exprTree)
		return false;

	//Numbas.debug("matching "+treeToJME(ruleTree)+" with "+treeToJME(exprTree));

	var ruleTok = ruleTree.tok;
	var exprTok = exprTree.tok;

	var d = {};

	if(ruleTok.type=='name')
	{
		d[ruleTok.name] = exprTree;
		return d;
	}

	if(ruleTok.type != exprTok.type)
	{
		return false;
	}

	switch(ruleTok.type)
	{
	case 'number':
		if( !math.eq(ruleTok.value,exprTok.value) )
			return false;
		return d;

	case 'string':
	case 'boolean':
	case 'special':
	case 'range':
		if(ruleTok.value != exprTok.value)
			return false;
		return d;

	case 'function':
	case 'op':
		if(ruleTok.name != exprTok.name)
			return false;
		
		for(var i=0;i<ruleTree.args.length;i++)
		{
			var m = matchTree(ruleTree.args[i],exprTree.args[i]);
			if(m==false)
				return false;
			else
			{
				for(var x in m)	//get matched variables
				{
					d[x]=m[x];
				}
			}
		}
		return d
	default:
		return d;
	}
}


var simplificationRules = jme.display.simplificationRules = {
	basic: [
		['+x',[],'x'],					//get rid of unary plus
		['x+(-y)',[],'x-y'],			//plus minus = minus
		['x-(-y)',[],'x+y'],			//minus minus = plus
		['-(-x)',[],'x'],				//unary minus minus = plus
		['-x',['x isa "complex"','re(x)<0'],'eval(-x)'],
		['(-x)/y',[],'-x/y'],			//take negation to left of fraction
		['x/(-y)',[],'-x/y'],			
		['(-x)*y',[],'-(x*y)'],			//take negation to left of multiplication
		['x*(-y)',[],'-(x*y)'],		
		['x+(y+z)',[],'(x+y)+z'],		//make sure sums calculated left-to-right
		['x-(y+z)',[],'(x-y)-z'],
		['x+(y-z)',[],'(x+y)-z'],
		['x-(y-z)',[],'(x-y)+z'],
		['(x*y)*z',[],'x*(y*z)'],		//make sure multiplications go right-to-left
		['n*i',['n isa "number"'],'eval(n*i)'],			//always collect multiplication by i
		['i*n',['n isa "number"'],'eval(n*i)']
	],

	unitFactor: [
		['1*x',[],'x'],
		['x*1',[],'x']
	],

	unitPower: [
		['x^1',[],'x']
	],

	unitDenominator: [
		['x/1',[],'x']
	],

	zeroFactor: [
		['x*0',[],'0'],
		['0*x',[],'0'],
		['0/x',[],'0']
	],

	zeroTerm: [
		['0+x',[],'x'],
		['x+0',[],'x'],
		['x-0',[],'x'],
		['0-x',[],'-x']
	],

	zeroPower: [
		['x^0',[],'1']
	],

	collectNumbers: [
		['-x+y',[],'y-x'],											//don't start with a unary minus
		['-x-y',[],'-(x+y)'],										//collect minuses
		['n+m',['n isa "number"','m isa "number"'],'eval(n+m)'],	//add numbers
		['n-m',['n isa "number"','m isa "number"'],'eval(n-m)'],	//subtract numbers
		['n+x',['n isa "number"','!(x isa "number")'],'x+n'],		//add numbers last

		['(x+n)+m',['n isa "number"','m isa "number"'],'x+eval(n+m)'],	//collect number sums
		['(x-n)+m',['n isa "number"','m isa "number"'],'x+eval(m-n)'],	
		['(x+n)-m',['n isa "number"','m isa "number"'],'x+eval(n-m)'],	
		['(x-n)-m',['n isa "number"','m isa "number"'],'x-eval(n+m)'],	
		['(x+n)+y',['n isa "number"'],'(x+y)+n'],						//shift numbers to right hand side
		['(x+n)-y',['n isa "number"'],'(x-y)+n'],
		['(x-n)+y',['n isa "number"'],'(x+y)-n'],
		['(x-n)-y',['n isa "number"'],'(x-y)-n'],

		['n*m',['n isa "number"','m isa "number"'],'eval(n*m)'],		//multiply numbers
		['x*n',['n isa "number"','!(x isa "number")'],'n*x']								//shift numbers to left hand side
	],

	simplifyFractions: [
		['n/m',['n isa "number"','m isa "number"','gcd(n,m)>1'],'eval(n/gcd(n,m))/eval(m/gcd(n,m))'],			//cancel simple fraction
		['(n*x)/m',['n isa "number"','m isa "number"','gcd(n,m)>1'],'(eval(n/gcd(n,m))*x)/eval(m/gcd(n,m))'],	//cancel algebraic fraction
		['n/(m*x)',['n isa "number"','m isa "number"','gcd(n,m)>1'],'eval(n/gcd(n,m))/(eval(m/gcd(n,m))*x)'],	
		['(n*x)/(m*y)',['n isa "number"','m isa "number"','gcd(n,m)>1'],'(eval(n/gcd(n,m))*x)/(eval(m/gcd(n,m))*y)']	
	],

	zeroBase: [
		['0^x',[],'0']
	],

	constantsFirst: [
		['x*n',['n isa "number"','!(x isa "number")'],'n*x']
	],

	sqrtProduct: [
		['sqrt(x)*sqrt(y)',[],'sqrt(x*y)']
	],

	sqrtDivision: [
		['sqrt(x)/sqrt(y)',[],'sqrt(x/y)']
	],

	sqrtSquare: [
		['sqrt(x^2)',[],'x'],
		['sqrt(x)^2',[],'x']
	],

	trig: [
		['sin(n)',['n isa "number"','isint(2*n/pi)'],'eval(sin(n))'],
		['cos(n)',['n isa "number"','isint(2*n/pi)'],'eval(cos(n))'],
		['tan(n)',['n isa "number"','isint(n/pi)'],'0'],
		['cosh(0)',[],'1'],
		['sinh(0)',[],'0'],
		['tanh(0)',[],'0']
	],

	otherNumbers: [
		['n^m',['n isa "number"','m isa "number"'],'eval(n^m)']
	]
};

var compileRules = jme.display.compileRules = function(rules)
{
	for(var i=0;i<rules.length;i++)
	{
		pattern = rules[i][0];
		conditions = rules[i][1];
		result = rules[i][2];
		rules[i] = new Rule(pattern,conditions,result);
	}
	return rules;
}

for(var x in simplificationRules)
	simplificationRules[x] = compileRules(simplificationRules[x]);



});
