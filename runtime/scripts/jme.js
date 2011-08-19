
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
		var re_name = /^{?((?:\$?[a-zA-Z][a-zA-Z0-9]*'*)|\?)}?/i;
		var re_op = /^(_|\.\.|#|not|and|or|xor|isa|<=|>=|<>|&&|\|\||[\|*+\-\/\^<>=!])/i;
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
				token = new TBool(Numbas.util.parseBool(result[0]));
			}
			else if (result = expr.match(re_op))
			{
				token = result[0];
				if(result[0]=='+' || result[0]=='-') 
				{
					if(tokens.length>0) 
					{
						switch(tokens[tokens.length-1].type) 
						{
						case '(':
						case ',':
						case 'op':
							token=result[0]+'u';		// '+u' and '-u' are the unary sign-changing operations, used if preceding token is appropriate punctuation or another operator
						}
					}else{
						token=result[0]+'u';		// + or - at start of expression are interpreted to be unary sign thingies too
					}
				}
				token=new TOp(token);
			}
			else if (result = expr.match(re_name))
			{
				//see if this is something like xsin, i.e. a single-letter variable name concatenated with a function name
				var bit = result[1].match(builtinsre);
				if(bit && bit[0].length==result[1].length-1)
					{result[1] = result[1].substring(0,result[1].length-bit[0].length);}
				else
					{bit=null;}

				// fill in constants here to avoid having more 'variables' than necessary
				if(result[1].toLowerCase()=='e') {
					token = new TNum(Math.E);

				}else if (result[1].toLowerCase()=='pi' || result[1].toLowerCase()=='\\pi') {
					token = new TNum(Math.PI);

				}else if (result[i].toLowerCase()=='i') {
					token = new TNum(math.complex(0,1));
				}else{
					token = new TName(result[1]);
				}
				
				if(tokens.length>0 && (tokens[tokens.length-1].type=='number' || tokens[tokens.length-1].type=='name' || tokens[tokens.length-1].type==')')) {	//number or right bracket or name followed by a name, eg '3y', is interpreted to mean multiplication, eg '3*y'
					tokens.push(new TOp('*'));
				}

				// if this was something like xsin, put 'x','*' tokens on stack, then 'sin' token is what we say we read
				if( bit )
				{
					tokens.push(new TName(result[1]));
					tokens.push(new TOp('*'));
					token=new TName(bit[0]);
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
				string = Numbas.util.escapeString(string);
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
					throw(new Error("Not enough arguments for operation "+tok.name));

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
						stack.push(new TFunc(tok.name));
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
					throw(new Error("no matching left bracket in function"));
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
					throw(new Error("no matching left bracket"));
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
					throw(new Error("no matching left bracket"));
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
				throw(new Error( "no matching right bracket"));
			}
			else
			{
				addoutput(x);
			}
		}

		if(listmode.length>0)
			throw(new Error("No matching right square bracket to end list"));

		if(output.length>1)
			throw(new Error("Expression can't be evaluated -- missing an operator."));

		return(output[0]);
	},

	substituteTree: function(tree,variables,allowUnbound)
	{
		if(tree.tok.bound)
			return tree;

		if(tree.args===undefined)
		{
			if(tree.tok.type=='name')
			{
				var name = tree.tok.name;
				if(variables[name]===undefined)
				{
					if(allowUnbound)
						return {tok: new TName(name)};
					else
						throw new Error("Variable "+name+" is undefined");
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
			functions = Numbas.util.copyobj(functions);
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
				throw(new Error("Variable "+tok.name+" not defined"));
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
			functions = Numbas.util.copyobj(functions);
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
			throw(new Error('Invalid expression: '+expr));
		}

		//compile to parse tree
		var tree = jme.shunt(tokens,functions);

		if(tree===null)
			return;

		if(!notypecheck)
		{
			if(!jme.typecheck(tree,functions))
				throw(new Error("Type error in expression "+expr));
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
					throw(new Error("Operation '"+op+"' is not defined. Did you mean \n\n'"+op+"*(...)' ?"));
				else
					throw(new Error("Operation '"+op+"' is not defined"));
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
			throw(new Error("No definition of "+op+" of correct type found."));
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
					Numbas.util.copyinto(variables,rs[i]);
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
		var bits = Numbas.util.contentsplitbrackets(str);	//split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
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

	texsubvars: function(s,variables,functions)
	{
		var cmdre = /(.*?)\\((?:var)|(?:simplify))/;
		var out = ''
		while( m = s.match(cmdre) )
		{
			out += m[1];
			var cmd = m[2];
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
					throw(new Error("No matching ] in "+cmd+" args."));
				else
				{
					args = s.slice(si,i);
					i++;
				}
			}

			if(s.charAt(i)!='{')
			{
				throw(new Error("Missing parameter in "+cmd+': '+s));
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
				throw(new Error( "No matching } in "+cmd));

			var expr = s.slice(si,i)

			switch(cmd)
			{
			case 'var':	//substitute a variable
				var v = jme.evaluate(jme.compile(expr,functions),variables,functions);
				v = jme.display.texify({tok: v});
				out += ' '+v+' ';
				break;
			case 'simplify': //a JME expression to be simplified
				if(!argbrackets)
					args = 'all';
				expr = jme.subvars(expr,variables,functions);
				var tex = jme.display.exprToLaTeX(expr,args);
				out += ' '+tex+' ';
				break;
			}
			s = s.slice(i+1);
		}

		return out+s;
	},

	//substitutes variables into a string "text {expr1} text {expr2} ..."
	subvars: function(str, variables,functions,display)
	{
		var bits = splitbrackets(str,'{','}');
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
				else if(!display && v.type=='string')
				{
					v="'"+v.value+"'";
				}
				else if(v.type=='list')
				{
					v = '['+v.value.map(function(x){return x.value;}).join(',')+']';
				}
				else
				{
					v = v.value;
				}
				if(display)
				{
					v = textile(' '+v);
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
			var newvars = Numbas.util.copyobj(variables);
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

var TRange = types.TRange = types.range = function(range)
{
	this.value = range;
	if(this.value!==undefined)
	{
		var start = this.value[0], end = this.value[1], step = this.value[2];

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

var TName = types.TName = types.name = function(name)
{
	this.name = name;
	this.value = name;
}
TName.prototype.type = 'name';

var TFunc = types.TFunc = types['function'] = function(name)
{
	this.name = name;
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
	'+u': 1,
	'-u': 1
}

var precedence = jme.precedence = {
	'_': 0,
	'!': 1,
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
	'not':'!',
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
//outtype is the type constructor corresponding to the value the function returns
//fn is the function to be evaluated
var funcObj = jme.funcObj = function(name,intype,outcons,fn,nobuiltin)
{
	for(var i=0;i<intype.length;i++)
	{
		if(intype[i]!='?')
			intype[i]=new intype[i]().type;
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

	if(nobuiltin!=true)
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

	this.typecheck = function(variables)
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

	this.evaluate = function(args,variables,functions)
	{
		var nargs = [];
		for(var i=0; i<args.length; i++)
			nargs.push(jme.evaluate(args[i],variables,functions).value);

		var result = this.fn.apply(null,nargs);

		return new this.outcons(result);
	}
		
}

var math = Numbas.math;

// the built-in operations and functions
var builtins = jme.builtins = {};

builtins['eval'] = [{name: 'eval',
					intype: ['?'],
					outtype: '?',
					typecheck: function(){return true;}
	}];

new funcObj('_', ['?','?'], function(){return new TNum(0);});

new funcObj('+u', [TNum], TNum, function(a){return a;});	//unary plus
new funcObj('-u', [TNum], TNum, math.negate);	//unary minus

new funcObj('+', [TNum,TNum], TNum, math.add );				//'number + number' is addition
var fconc = function(a,b) { return a+b; };					//'string + anything' is concatenation
new funcObj('+', [TString,'?'], TString, fconc );
new funcObj('+', ['?',TString], TString, fconc );

new funcObj('-', [TNum,TNum], TNum, math.sub );
new funcObj('*', [TNum,TNum], TNum, math.mul );
new funcObj('/', [TNum,TNum], TNum, math.div );
new funcObj('^', [TNum,TNum], TNum, math.pow );

new funcObj('..', [TNum,TNum], TRange, math.defineRange );	//define a range
new funcObj('#', [TRange,TNum], TRange, math.rangeSteps );	//define step size for range

new funcObj('<', [TNum,TNum], TBool, math.lt );
new funcObj('>', [TNum,TNum], TBool, math.gt );
new funcObj('<=', [TNum,TNum], TBool, math.leq );
new funcObj('>=', [TNum,TNum], TBool, math.geq );
new funcObj('<>', [TNum], TBool, math.neq );
new funcObj('<>', ['?','?'], TBool, function(a,b){ return a!=b; } );
new funcObj('=', [TNum,TNum], TBool, math.eq );
new funcObj('=', [TName,TName], TBool, function(a,b){ return a==b; });
new funcObj('=', ['?','?'], TBool, function(a,b){ return a==b; } );

new funcObj('&&', [TBool,TBool], TBool, function(a,b){return a&&b;} );
new funcObj('!', [TBool], TBool, function(a){return !a;} );	
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
new funcObj('arg', [TNum], TNum, math.arg );
new funcObj('re', [TNum], TNum, math.re );
new funcObj('im', [TNum], TNum, math.im );
new funcObj('conj', [TNum], TNum, math.conjugate );

new funcObj('isint',[TNum],TBool, function(a){ return Numbas.util.isInt(a); });

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
arbrandom = new funcObj( 'random',[],'?');			//pick at random from a list of any data type
arbrandom.typecheck = function() { return true; }
arbrandom.evaluate = function(args,variables,functions) { return jme.evaluate(math.choose(args),variables,functions);};
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

var funcs = {};

//if needs to be a bit different because it can return any type
funcs.iff = new funcObj('if', [TBool,'?','?'], '?');
funcs.iff.evaluate = function(args,variables,functions)
{
	var test = jme.evaluate(args[0],variables,functions).value;

	if(test)
		return jme.evaluate(args[1],variables,functions);
	else
		return jme.evaluate(args[2],variables,functions);
};

//switch pretty much breaks my nice system
funcs.switchf = new funcObj('switch',[],'?');
funcs.switchf.typecheck = function(variables)
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
}
funcs.switchf.evaluate = function(args,variables,functions)
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
		throw(new Error("No default case for Switch statement"));
}

funcs.isa = new funcObj('isa',['?',TString],TBool)
funcs.isa.evaluate = function(args,variables,functions)
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
};

funcs.repeat = new funcObj('repeat',['?',TNum],TList)
funcs.repeat.evaluate = function(args,variables,functions)
{
	var size = jme.evaluate(args[1],variables,functions).value;
	var l = new TList(size,[]);
	for(var i=0;i<size;i++)
	{
		l.value[i] = jme.evaluate(args[0],variables,functions);
	}
	return l;
}

funcs.listval = new funcObj('listval',[TList,TNum],'?')
funcs.listval.evaluate = function(args,variables,functions)
{
	var index = jme.evaluate(args[1],variables,functions).value;
	var list = jme.evaluate(args[0],variables,functions);
	if(index in list.value)
		return list.value[index];
	else
		throw(new Error("Invalid list index "+index+" on list of size "+list.value.length));
}

funcs.maplist = new funcObj('map',['?',TName,TList],TList)
funcs.maplist.evaluate = function(args,variables,functions)
{
	var list = jme.evaluate(args[2],variables,functions);
	var newlist = new TList(list.size,[]);
	var name = args[1].tok.name;
	variables = Numbas.util.copyobj(variables);
	for(var i=0;i<list.value.length;i++)
	{
		variables[name] = list.value[i];
		newlist.value[i] = jme.evaluate(args[0],variables,functions);
	}
	return newlist;
}

funcs.maprange = new funcObj('map',['?',TName,TRange],TList)
funcs.maprange.evaluate = function(args,variables,functions)
{
	var range = jme.evaluate(args[2],variables,functions);
	var name = args[1].tok.name;
	var newlist = new TList(range.size);
	var variables = Numbas.util.copyobj(variables);
	for(var i=3;i<range.value.length;i++)
	{
		variables[name] = new TNum(range.value[i]);
		newlist.value[i-3] = jme.evaluate(args[0],variables,functions);
	}
	return newlist;
}

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
		return math.leq(Math.abs(math.sub(r1,r2)), tolerance);
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

var findvars = jme.findvars = function(tree)
{
	if(tree.args===undefined)
	{
		if(tree.tok.type=='name')
			return [tree.tok.name.toLowerCase()];
		else
			return [];
	}
	else
	{
		var vars = [];
		for(var i=0;i<tree.args.length;i++)
			vars = vars.merge(findvars(tree.args[i]));
		return vars;
	}
}


function resultsEqual(r1,r2,checkingFunction,checkingAccuracy)
{	// first checks both expressions are of same type, then uses given checking type to compare results

	if(r1.type != r2.type)
	{
		return false;
	}
	if(r1.type == 'number')
	{
		if(r1.value.complex || r2.value.complex)
		{
			if(!r1.value.complex)
				r1.value = {re:r1.value, im:0, complex:true};
			if(!r2.value.complex)
				r2.value = {re:r2.value, im:0, complex:true};
			return checkingFunction(r1.value.re, r2.value.re, checkingAccuracy) && checkingFunction(r1.value.im,r2.value.im,checkingAccuracy);
		}
		else
		{
			return checkingFunction( r1.value, r2.value, checkingAccuracy );
		}
	}
	else
	{
		return r1.value == r2.value;
	}
};

/*                    MATHS FUNCTIONS                */






//split a string up between curly braces
//so a{b}c -> ['a','b','c']
var splitbrackets = jme.splitbrackets = function(t,lb,rb)
{
	var o=[];
	var l=t.length;
	var s=0;
	var depth=0;
	for(var i=0;i<l;i++)
	{
		if(t.charAt(i)==lb && !(i>0 && t.charAt(i-1)=='\\'))
		{
			depth+=1;
			if(depth==1)
			{
				o.push(t.slice(s,i));
				s=i+1;
			}
			else
			{
				t = t.slice(0,i)+t.slice(i+1);
				i-=1;
			}
		}
		else if(t.charAt(i)==rb && !(i>0 && t.charAt(i-1)=='\\'))
		{
			depth-=1;
			if(depth==0)
			{
				o.push(t.slice(s,i));
				s=i+1;
			}
			else
			{
				t = t.slice(0,i)+t.slice(i+1);
				i -= 1;
			}
		}
	}
	if(s<l)
		o.push(t.slice(s));
	return o;
}

});
