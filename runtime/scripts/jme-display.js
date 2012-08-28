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


Numbas.queueScript('scripts/jme-display.js',['math','jme','util'],function() {
	
var math = Numbas.math;
var jme = Numbas.jme;

jme.display = {

	//convert a JME expression to LaTeX
	//ruleset can be anything accepted by jme.display.collectRuleset
	//settings are also passed through to the texify function
	exprToLaTeX: function(expr,ruleset,scope)
	{
		if(!ruleset)
			ruleset = simplificationRules.basic;
		ruleset = collectRuleset(ruleset,scope);

		expr+='';	//make sure expr is a string

		if(!expr.trim().length)	//if expr is the empty string, don't bother going through the whole compilation proces
			return '';
		var tree = jme.display.simplify(expr,ruleset,scope); //compile the expression to a tree and simplify it
		var tex = texify(tree,ruleset); //render the tree as TeX
		return tex;
	},

	//simplify a JME expression string according to given ruleset and return it as a JME string
	simplifyExpression: function(expr,ruleset,scope)
	{
		if(expr.trim()=='')
			return '';
		return treeToJME(jme.display.simplify(expr,ruleset,scope),ruleset);
	},

	//simplify a JME expression string according to given ruleset and return it as a syntax tree
	simplify: function(expr,ruleset,scope)
	{
		if(expr.trim()=='')
			return;

		if(!ruleset)
			ruleset = simplificationRules.basic;
		ruleset = collectRuleset(ruleset,scope);		//collect the ruleset - replace set names with the appropriate Rule objects

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

	//simplify a syntax tree according to given ruleset
	simplifyTree: function(exprTree,rules,scope)
	{
		if(!scope)
			throw(new Numbas.Error('jme.display.simplifyTree.no scope given'));
		scope = Numbas.util.copyobj(scope);
		scope.variables = {};	//remove variables from the scope so they don't accidentally get substituted in
		var applied = true;

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
						exprTree.args[i] = jme.display.simplifyTree(exprTree.args[i],rules,scope);
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



// texify turns a syntax tree into a TeX string
//
// data types can be converted to TeX straightforwardly, but operations and functions need a bit more care
// the idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX


//apply brackets to an op argument if appropraite
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

// helper function for texing infix operators
// returns a function which will convert a syntax tree with the operator at the top to TeX
// 'code' is the TeX code for the operator
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

//helper for texing nullary functions
//returns a function which returns the appropriate (constant) code
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

// define how to texify each operation and function
var texOps = jme.display.texOps = {
	//range definition. Should never really be seen
	'#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),	

	//subscript
	'_': (function(thing,texArgs) { return texArgs[0]+'_{'+texArgs[1]+'}'; }),

	//logical negation
	'!': infixTex('\\neg '),	

	//unary addition
	'+u': infixTex('+'),	

	//unary minus
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

	//exponentiation
	'^': (function(thing,texArgs) {
		var tex0 = texArgs[0];
		//if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
		if(thing.args[0].tok.type=='op')
			tex0 = '\\left ( ' +tex0+' \\right )';	
		return (tex0+'^{ '+texArgs[1]+' }');
	}),


	'*': (function(thing,texArgs) {
		var s = texifyOpArg(thing,texArgs,0);
		for(var i=1; i<thing.args.length; i++ )
		{
			//specials or subscripts
			if(thing.args[i-1].tok.type=='special' || thing.args[i].tok.type=='special' || (thing.args[i-1].tok.type=='op' && thing.args[i-1].tok.name=='_') || (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='_'))	
			{
				s+=' ';
			}
			//anything times e^(something) or (not number)^(something)
			else if (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='^' && (thing.args[i].args[0].value==Math.E || thing.args[i].args[0].tok.type!='number'))	
			{
				s+=' ';
			}
			//real number times Pi or E
			else if (thing.args[i].tok.type=='number' && (thing.args[i].tok.value==Math.PI || thing.args[i].tok.value==Math.E || thing.args[i].tok.value.complex) && thing.args[i-1].tok.type=='number' && !(thing.args[i-1].tok.value.complex))	
			{
				s+=' ';
			}
			//number times a power of i
			else if (thing.args[i].tok.type=='op' && thing.args[i].tok.name=='^' && thing.args[i].args[0].tok.type=='number' && math.eq(thing.args[i].args[0].tok.value,math.complex(0,1)) && thing.args[i-1].tok.type=='number')	
			{
				s+=' ';
			}
			else if ( !(thing.args[i-1].tok.type=='number' && math.eq(thing.args[i-1].tok.value,math.complex(0,1))) && thing.args[i].tok.type=='number' && math.eq(thing.args[i].tok.value,math.complex(0,1)))	//(anything except i) times i
			{
				s+=' ';
			}
			else if ( thing.args[i].tok.type=='number'
					||
						thing.args[i].tok.type=='op' && thing.args[i].tok.name=='-u'
					||
					(
						!(thing.args[i-1].tok.type=='op' && thing.args[i-1].tok.name=='-u') 
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
	'log': funcTex('\\log_{10}'),
	'vector': (function(thing,texArgs,settings) {
		return '\\left( '+texVector(thing,settings)+' \\right)';
	}),
	'matrix': (function(thing,texArgs) {
		var rows = thing.args.map(function(x) {
			return x.args.map(function(y){ return texify(y); }).join(' & ');
		})
		return '\\begin{pmatrix} ' + rows.join(' \\\\ ')+' \\end{pmatrix}';
	}),
	'listval': (function(thing,texArgs) {
		return texArgs[0]+' \\left['+texArgs[1]+'\\right]';
	}),
	'verbatim': (function(thing,texArgs) {
		return thing.args[0].tok.value;
	})
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

		var m;
		var out = math.niceNumber(n);
		if(m = out.match(math.re_scientificNumber)) {
			var mantissa = m[1];
			var exponent = m[2];
			if(exponent[0]=='+')
				exponent = exponent.slice(1);
			return mantissa+' \times 10^{'+exponent+'}';
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
		if(n==Infinity)
			return '\\infty';

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
			return mantissa+' \times 10^{'+exponent+'}';
		}

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

function texMatrix(m,settings)
{
	var out;
	if(m.args)
	{
		var rows = m.args.map(function(x) {
			return x.args.map(function(y){ return texify(y,settings); }).join(' & ');
		})
		out = rows.join(' \\\\ ');
	}
	else
	{
		var texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
		var rows = m.map(function(x){
			return x.map(function(y){ return texNumber(y) }).join(' & ');
		});
		out = rows.join(' \\\\ ');
	}
	return '\\begin{matrix} '+out+' \\end{matrix}';
}

function texName(name,annotation)
{
	var name = greek.contains(name) ? '\\'+name : name;
	name = name.replace(/^(.*?)(\d+)/,'$1_{$2}');	//make numbers at the end of a variable name subscripts
	if(!annotation)
		return name;

	for(var i=0;i<annotation.length;i++)
	{
		switch(annotation[i])
		{
		case 'verb':	//verbatim - use to get round things like i and e being interpreted as constants
		case 'verbatim':
			break;
		case 'op':	//operator name - use non-italic font
			name = '\\operatorname{'+name+'}';
			break;
		case 'v':	//vector
		case 'vector':
			name = '\\boldsymbol{'+name+'}';
			break;
		case 'unit':	//unit vector
			name = '\\hat{'+name+'}';
			break;
		case 'dot':		//dot on top
			name = '\\dot{'+name+'}';
			break;
		case 'm':	//matrix
		case 'matrix':
			name = '\\mathrm{'+name+'}';
			break;
		default:
			if(annotation[i].length)
				name = '\\'+annotation[i]+'{'+name+'}';
			break;
		}
	}
	return name;
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

	var texNumber = settings.texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;

	var tok = thing.tok || thing;
	switch(tok.type)
	{
	case 'number':
		if(tok.value==Math.E)
			return 'e';
		else if(tok.value==Math.PI)
			return '\\pi';
		else
			return texNumber(tok.value);
	case 'string':
		return '\\textrm{'+tok.value+'}';
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
		return '\\left[ '+texArgs.join(', ')+' \\right]';
	case 'vector':
		return('\\left( ' 
				+ texVector(tok.value,settings)
				+ ' \\right)' );
	case 'matrix':
		return '\\left( '+texMatrix(tok.value,settings)+' \\right)';
	case 'name':
		return texName(tok.name,tok.annotation);
		break;
	case 'special':
		return tok.value;
		break;
	case 'conc':
		return texArgs.join(' ');
		break;
	case 'op':
		return texOps[tok.name.toLowerCase()](thing,texArgs,settings);
		break;
	case 'function':
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
		break;
	default:
		throw(new Numbas.Error('jme.display.unknown token type',tok.type));
	}
}

function jmeRationalNumber(n)
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

function jmeRealNumber(n)
{
	if(n.complex)
	{
		var re = jmeRealNumber(n.re);
		var im = jmeRealNumber(n.im)+'i';
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


//turns an evaluation tree back into a JME expression
//(used when an expression is simplified)
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

    var jmeNumber = settings.fractionnumbers ? jmeRationalNumber : jmeRealNumber;

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
			return jmeNumber(tok.value);
		}
	case 'name':
		return tok.name;
	case 'string':
		var str = tok.value.replace(/\n/g,'\\n').replace(/"/g,'\\"').replace(/'/g,"\\'");
		return '"'+str+'"';
	case 'boolean':
		return (tok.value ? 'true' : 'false');
	case 'range':
		return tok.value[0]+'..'+tok.value[1]+(tok.value[2]==1 ? '' : '#'+tok.value[2]);
	case 'list':
		if(!bits)
		{
			bits = tok.value.map(function(b){return treeToJME({tok:b},settings);});
		}
		return '[ '+bits.join(', ')+' ]';
	case 'vector':
		return 'vector('+tok.value.map(jmeNumber).join(',')+')';
	case 'matrix':
		return 'matrix('+
			tok.value.map(function(row){return '['+row.map(jmeNumber).join(',')+']'}).join(',')+')';
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
			else if(args[i].tok.type=='number' && args[i].tok.value.complex && (op=='*' || op=='-u' || op=='/'))
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
			//number or brackets followed by name or brackets doesn't need a times symbol
			//except <anything>*(-<something>) does
			if( (args[0].tok.type=='number' || args[0].bracketed) && (args[1].tok.type == 'name' || args[1].bracketed && !(args[1].tok.type=='op' && args[1].tok.name=='-u')) )	
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
				return jmeNumber({complex:true, re: -args[0].tok.value.re, im: -args[0].tok.value.im});
			break;
		case '-':
			var b = args[1].tok.value;
			if(args[1].tok.type=='number' && args[1].tok.value.complex && args[1].tok.value.re!=0) {
				return bits[0]+' - '+jmeNumber(math.complex(b.re,-b.im));
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
	}
}

//does each argument (of an operation) need brackets around it?
var opBrackets = {
	'+u':{},
	'-u':{'+':true,'-':true},
	'+': {},
	'-': {},
	'*': {'+u':true,'-u':true,'+':true, '-':true, '/':true},
	'/': {'+u':true,'-u':true,'+':true, '-':true, '*':true},
	'^': {'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true},
	'and': {'or':true, 'xor':true},
	'or': {'xor':true},
	'xor':{},
	'=': {}
};

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

Rule.prototype = {
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
		['x+y',['x isa "number"','y isa "complex"','re(y)=0'],'eval(x+y)'],
		['-x+y',['x isa "number"','y isa "complex"','re(y)=0'],'-eval(x-y)'],
		['(-x)/y',[],'-(x/y)'],			//take negation to left of fraction
		['x/(-y)',[],'-(x/y)'],			
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

	noLeadingMinus: [
		['-x+y',[],'y-x']											//don't start with a unary minus
	],

	collectNumbers: [
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
		['x*n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],			//shift numbers to left hand side
		['m*(n*x)',['m isa "number"','n isa "number"'],'eval(n*m)*x']
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
		['x*n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],
		['x*(n*y)',['n isa "number"','n<>i','!(x isa "number")'],'n*(x*y)']
	],

	sqrtProduct: [
		['sqrt(x)*sqrt(y)',[],'sqrt(x*y)']
	],

	sqrtDivision: [
		['sqrt(x)/sqrt(y)',[],'sqrt(x/y)']
	],

	sqrtSquare: [
		['sqrt(x^2)',[],'x'],
		['sqrt(x)^2',[],'x'],
		['sqrt(n)',['n isa "number"','isint(sqrt(n))'],'eval(sqrt(n))']
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

var all=[];
var nsimplificationRules = Numbas.jme.display.simplificationRules = {};
for(var x in simplificationRules)
{
	nsimplificationRules[x] = nsimplificationRules[x.toLowerCase()] = compileRules(simplificationRules[x]);
	all = all.concat(nsimplificationRules[x.toLowerCase()]);
}
simplificationRules = nsimplificationRules;
simplificationRules['all']=all;
Numbas.jme.builtinScope = new Numbas.jme.Scope([Numbas.jme.builtinScope,{rulesets: simplificationRules}]);

var displayFlags = ['fractionnumbers','rowvector'];

var collectRuleset = jme.display.collectRuleset = function(set,scope)
{
	scope = new jme.Scope([scope]);
	var sets = scope.rulesets;
	if(typeof(set)=='string')
	{
		set = set.split(',');
	}
	if(!set)
	{
		return [];
	}
	if(!sets)
	{
		throw(new Numbas.Error('jme.display.collectRuleset.no sets'));
	}

	var out = [];
	for(var i=0;i<displayFlags.length;i++)
	{
		out[displayFlags[i]] = set[displayFlags[i]];
	}
	for(var i=0; i<set.length; i++ )
	{
		if(typeof(set[i])=='string')
		{
			var m = /^(!)?(.*)$/.exec(set[i]);
			var neg = m[1]=='!' ? true : false;
			var name = m[2].trim().toLowerCase();
			if(displayFlags.contains(name))
			{
				out[name]= !neg;
			}
			else if(name.length>0)
			{
				if(!(name in sets))
				{
					throw(new Numbas.Error('jme.display.collectRuleset.set not defined',name));
				}

				var sub = collectRuleset(sets[name],scope);

				for(var j=0;j<displayFlags.length;j++)
				{
					if(displayFlags[j] in sub)
						out[displayFlags[j]] = sub[displayFlags[j]];
				}

				sets[name] = sub;
				if(neg)
				{
					for(var j=0; j<sub.length; j++)
					{
						if((m=out.indexOf(sub[j]))>=0)
						{
							out.splice(m,1);
						}
					}
				}
				else
				{
					for(var j=0; j<sub.length; j++)
					{
						if(!(out.contains(sub[j])))
						{
							out.push(sub[j]);
						}
					}
				}
			}
		}
		else
			out.push(set[i]);
	}
	return out;
}
});
