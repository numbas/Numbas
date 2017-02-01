/*
Copyright 2011-15 Newcastle University

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

Numbas.queueScript('jme-builtins',['jme-base'],function(){

var util = Numbas.util;
var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;
var setmath = Numbas.setmath;
var jme = Numbas.jme;
var types = Numbas.jme.types;

var Scope = jme.Scope;
var funcObj = jme.funcObj;

var TNum = types.TNum;
var TString = types.TString;
var TBool = types.TBool;
var THTML = types.THTML;
var TList = types.TList;
var TKeyPair = types.TKeyPair;
var TDict = types.TDict;
var TMatrix = types.TMatrix;
var TName = types.TName;
var TRange = types.TRange;
var TSet = types.TSet;
var TVector = types.TVector;


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

newBuiltin('+',[TDict,TDict],TDict, null,{
    evaluate: function(args,scope) {
        var nvalue = {};
        Object.keys(args[0].value).forEach(function(x) {
            nvalue[x] = args[0].value[x];
        })
        Object.keys(args[1].value).forEach(function(x) {
            nvalue[x] = args[1].value[x];
        })
        return new TDict(nvalue);
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
newBuiltin('*', [TVector,TMatrix], TVector, vectormath.vectormatrixmul, {doc: {usage: 'vector(1,2) * matrix([2,3],[3,4])', description: 'Multiply a vector by a matrix.', tags: ['multiplication','composition','compose','times']}});
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

newBuiltin('angle',[TVector,TVector],TNum,vectormath.angle);

newBuiltin('transpose',[TVector],TMatrix, vectormath.transpose, {doc: {usage: 'transpose( vector(1,2,3) )', description: 'Transpose of a vector.'}});
newBuiltin('transpose',[TMatrix],TMatrix, matrixmath.transpose, {doc: {usage: 'transpose( matrix([1,2,3],[4,5,6]) )', description: 'Transpose of a matrix.'}});

newBuiltin('id',[TNum],TMatrix, matrixmath.id, {doc: {usage: 'id(3)', description: 'Identity matrix with $n$ rows and columns.'}});

newBuiltin('..', [TNum,TNum], TRange, math.defineRange, {doc: {usage: ['a..b','1..2'], description: 'Define a range', tags: ['interval']}});
newBuiltin('#', [TRange,TNum], TRange, math.rangeSteps, {doc: {usage: ['a..b#c','0..1 # 0.1'], description: 'Set the step size for a range.'}}); 

newBuiltin('in',[TNum,TRange],TBool,function(x,r) {
	var start = r[0];
	var end = r[1];
	var step_size = r[2];
	if(x>end || x<start) {
		return false;
	}
	if(step_size===0) {
		return true;
	} else {
		var max_steps = Math.floor(end-start)/step_size;
		var steps = Math.floor((x-start)/step_size);
		return step_size*steps + start == x && steps <= max_steps;
	}
});

newBuiltin('list',[TRange],TList,function(range) {
    return math.rangeToList(range).map(function(n){return new TNum(n)});
});

newBuiltin('dict',['*keypair'],TDict,null,{
    evaluate: function(args,scope) {
        var value = {};
        args.forEach(function(kp) {
            value[kp.tok.key] = jme.evaluate(kp.args[0],scope);
        });
        return new TDict(value);
    }
});
newBuiltin('keys',[TDict],TList,function(d) {
    var o = [];
    Object.keys(d).forEach(function(key) {
        o.push(new TString(key));
    })
    return o;
});
newBuiltin('values',[TDict],TList,function(d) {
    var o = [];
    Object.values(d).forEach(function(v) {
        o.push(v);
    })
    return o;
});
newBuiltin('values',[TDict,TList],TList,function(d,keys) {
    return keys.map(function(key) {
        if(!d.hasOwnProperty(key.value)) {
            throw(new Numbas.Error('jme.func.listval.key not in dict',{key:key}));
        } else {
            return d[key.value];
        }
    });
})
newBuiltin('items',[TDict],TList,null, {
    evaluate: function(args,scope) {
        var o = [];
        Object.entries(args[0].value).forEach(function(x) {
            o.push(new TList([new TString(x[0]), x[1]]))
        });
        return new TList(o);
    }
});
newBuiltin('listval',[TDict,TString],'?', null, {
    evaluate: function(args,scope) {
        var d = args[0].value;
        var key = args[1].value;
        if(!d.hasOwnProperty(key)) {
            throw(new Numbas.Error('jme.func.listval.key not in dict',{key:key}));
        }
        return d[key];
    }
});
newBuiltin('get',[TDict,TString,'?'],'?',null,{
    evaluate: function(args,scope) {
        var d = args[0].value;
        var key = args[1].value;
        if(!d.hasOwnProperty(key)) {
            return args[2]
        }
        return d[key];
    }
});
newBuiltin('in', [TString,TDict], TBool, function(s,d) {
    return d.hasOwnProperty(s);
});

newBuiltin('json_decode', [TString], '?', null, {
    evaluate: function(args,scope) {
        var data = JSON.parse(args[0].value);
        return jme.wrapValue(data);
    }
});
newBuiltin('json_encode', ['?'], TString, null, {
    evaluate: function(args,scope) {
        var s = new TString(JSON.stringify(jme.unwrapValue(args[0])));
        s.safe = true;
        return s;
    }
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

newBuiltin('safe',[TString],TString,null, {
    evaluate: function(args,scope) {
        var t = args[0].tok;
        t.safe = true;
        return t;
    },
    typecheck: function(variables) {
        return variables.length==1 && variables[0].type=='string';
    }
});
jme.findvarsOps.safe = function(tree,boundvars,scope) {
	return [];
}

newBuiltin('capitalise',[TString],TString,function(s) { return util.capitalise(s); }, {doc: {usage: ['capitalise(\'hello there\')'], description: 'Capitalise the first letter of a string', tags: ['upper-case','case','upper']}});
newBuiltin('upper',[TString],TString,function(s) { return s.toUpperCase(); }, {doc: {usage: ['upper(\'hello there\')'], description: 'Change all the letters in a string to capitals.', tags: ['upper-case','case','upper','capitalise','majuscule']}});
newBuiltin('lower',[TString],TString,function(s) { return s.toLowerCase(); }, {doc: {usage: ['lower(\'HELLO, you!\')'], description: 'Change all the letters in a string to minuscules.', tags: ['lower-case','lower','case']}});
newBuiltin('pluralise',[TNum,TString,TString],TString,function(n,singular,plural) { return util.pluralise(n,singular,plural); });
newBuiltin('join',[TList,TString],TString,function(list,delimiter) { 
	return list.map(jme.tokenToDisplayString).join(delimiter);
});
newBuiltin('split',[TString,TString],TList, function(str,delimiter) {
    return str.split(delimiter).map(function(s){return new TString(s)});
});
newBuiltin('currency',[TNum,TString,TString],TString,util.currency);
newBuiltin('separateThousands',[TNum,TString],TString,util.separateThousands);

//the next three versions of the `except` operator
//exclude numbers from a range, given either as a range, a list or a single value
newBuiltin('except', [TRange,TRange], TList,
	function(range,except) {
		if(range[2]==0) {
			throw(new Numbas.Error("jme.func.except.continuous range"));
        }

		range = math.rangeToList(range);
		if(except[2]==0) {
			return range.filter(function(i){return i<except[0] || i>except[1]}).map(function(i){return new TNum(i)});
		} else {
			except = math.rangeToList(except);
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
		if(range[2]==0) {
			throw(new Numbas.Error("jme.func.except.continuous range"));
        }
		range = math.rangeToList(range)
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
		if(range[2]==0) {
			throw(new Numbas.Error("jme.func.except.continuous range"));
        }
		range = math.rangeToList(range);
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
		except = math.rangeToList(except);
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
newBuiltin('implies', [TBool,TBool], TBool, function(a,b){return !a || b;}, {doc: {usage: 'a xor b', description: 'Logical XOR.', tags: ['exclusive or']}} );

newBuiltin('abs', [TNum], TNum, math.abs, {doc: {usage: 'abs(x)', description: 'Absolute value of a number.', tags: ['norm','length','complex']}} );
newBuiltin('abs', [TString], TNum, function(s){return s.length}, {doc: {usage: 'abs(x)', description: 'Absolute value of a number.', tags: ['norm','length','complex']}} );
newBuiltin('abs', [TList], TNum, function(l) { return l.length; }, {doc: {usage: 'abs([1,2,3])', description: 'Length of a list.', tags: ['size','number','elements']}});
newBuiltin('abs', [TRange], TNum, function(r) { return r[2]==0 ? Math.abs(r[0]-r[1]) : math.rangeSize(r); }, {doc: {usage: 'abs(1..5)', description: 'Number of elements in a numerical range.', tags: ['size','length']}});
newBuiltin('abs', [TVector], TNum, vectormath.abs, {doc: {usage: 'abs(vector(1,2,3))', description: 'Modulus of a vector.', tags: ['size','length','norm']}});
newBuiltin('abs', [TDict], TNum, function(d) {
    var n = 0;
    for(var x in d) {
        n += 1;
    }
    return n;
});
newBuiltin('arg', [TNum], TNum, math.arg, {doc: {usage: 'arg(1+i)', description: 'Argument of a complex number.', tags: ['angle','direction']}} );
newBuiltin('re', [TNum], TNum, math.re, {doc: {usage: 're(1 + 2i)', description: 'Real part of a complex number.'}} );
newBuiltin('im', [TNum], TNum, math.im, {doc: {usage: 'im(1 + 2i)', description: 'Imaginary part of a complex number.'}} );
newBuiltin('conj', [TNum], TNum, math.conjugate, {doc: {usage: 'conj(1 + 2i)', description: 'Conjugate of a complex number.'}} );

newBuiltin('isint',[TNum],TBool, function(a){ return util.isInt(a); }, {doc: {usage: 'isint(1)', description: 'Returns @true@ if the argument is an integer.', tags: ['test','whole number']}});

newBuiltin('sqrt', [TNum], TNum, math.sqrt, {doc: {usage: 'sqrt(x)', description: 'Square root.'}} );
newBuiltin('ln', [TNum], TNum, math.log, {doc: {usage: 'ln(x)', description: 'Natural logarithm.', tags: ['base e']}} );
newBuiltin('log', [TNum], TNum, math.log10, {doc: {usage: 'log(x)', description: 'Logarithm with base $10$.'}} );
newBuiltin('log', [TNum,TNum], TNum, math.log_base, {doc: {usage: 'log(x,b)', description: 'Logarithm with base $b$.'}} );
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

newBuiltin('random', [TRange], TNum, math.random, {random:true, doc: {usage: 'random(1..4)', description: 'A random number in the given range.', tags: ['choose','pick']}} );

newBuiltin('random',[TList],'?',null, {
	random:true, 
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
	random:true, 
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
newBuiltin('precround', [TVector,TNum], TVector, vectormath.precround, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('siground', [TNum,TNum], TNum, math.siground, {doc: {usage: 'siground(x,3)', description: 'Round to given number of significant figures.', tags: ['sig figs','sigfig']}} );
newBuiltin('siground', [TMatrix,TNum], TMatrix, matrixmath.siground, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('siground', [TVector,TNum], TVector, vectormath.siground, {doc: {usage: 'precround(x,3)', description: 'Round to given number of decimal places.', tags: ['dp']}} );
newBuiltin('dpformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'dp', precision:p});}, {latex: true, doc: {usage: 'dpformat(x,3)', description: 'Round to given number of decimal points and pad with zeroes if necessary.', tags: ['dp','decimal points','format','display','precision']}} );
newBuiltin('dpformat', [TNum,TNum,TString], TString, function(n,p,style) {return math.niceNumber(n,{precisionType: 'dp', precision:p, style: style});}, {latex: true, doc: {usage: 'dpformat(x,3)', description: 'Round to given number of decimal points and pad with zeroes if necessary.', tags: ['dp','decimal points','format','display','precision']}} );
newBuiltin('sigformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p});}, {latex: true, doc: {usage: 'dpformat(x,3)', description: 'Round to given number of significant figures and pad with zeroes if necessary.', tags: ['sig figs','sigfig','format','display','precision']}} );
newBuiltin('sigformat', [TNum,TNum,TString], TString, function(n,p,style) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p, style:style});}, {latex: true, doc: {usage: 'dpformat(x,3)', description: 'Round to given number of significant figures and pad with zeroes if necessary.', tags: ['sig figs','sigfig','format','display','precision']}} );
newBuiltin('formatnumber', [TNum,TString], TString, function(n,style) {return math.niceNumber(n,{style:style});});
newBuiltin('parsenumber', [TString,TString], TString, function(s,style) {return util.parseNumber(s,false,style);});
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

newBuiltin('sum',[TList],TNum,math.sum,{unwrapValues: true});
newBuiltin('sum',[TVector],TNum,math.sum);

newBuiltin('deal',[TNum],TList, 
	function(n) {
		return math.deal(n).map(function(i) {
			return new TNum(i);
		});
	},
	{
		random:true, 
		doc: {
			usage: ['deal(n)','deal(5)'],
			description: 'A random shuffling of the integers $[0 \\dots n-1]$.',
			tags: ['permutation','order','shuffle']
		}
	}
);

newBuiltin('shuffle',[TList],TList,
	function(list) {
		return math.shuffle(list);
	},
	{
		random:true, 
		doc: {
			usage: ['shuffle(list)','shuffle([1,2,3])'],
			description: 'Randomly reorder a list.',
			tags: ['permutation','order','shuffle','deal']	
		}
	}
);

newBuiltin('shuffle',[TRange],TList,
	function(range) {
		var list = math.rangeToList(range).map(function(n){return new TNum(n)})
		return math.shuffle(list);
	},
	{
		random:true, 
		doc: {
			usage: ['shuffle(list)','shuffle([1,2,3])'],
			description: 'Randomly reorder a list.',
			tags: ['permutation','order','shuffle','deal']	
		}
	}
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
		if(args[0].tok.type=='name' && scope.getVariable(args[0].tok.name.toLowerCase())==undefined )
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
jme.findvarsOps.satisfy = function(tree,boundvars,scope) {
	var names = tree.args[0].args.map(function(t){return t.tok.name});
	boundvars = boundvars.concat(0,0,names);
	var vars = [];
	for(var i=1;i<tree.args.length;i++)
		vars = vars.merge(jme.findvars(tree.args[i],boundvars));
	return vars;
}

newBuiltin('listval',[TList,TNum],'?', null, {
	evaluate: function(args,scope)
	{
		var list = args[0];
		var index = util.wrapListIndex(args[1].value,list.vars);
		if(list.type!='list') {
			if(list.type=='name')
				throw(new Numbas.Error('jme.variables.variable not defined',{name:list.name}));
			else
				throw(new Numbas.Error('jme.func.listval.not a list'));
		}
		if(index in list.value)
			return list.value[index];
		else
			throw(new Numbas.Error('jme.func.listval.invalid index',{index:index,size:list.value.length}));
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

newBuiltin('isset',[TName],TBool,null, {
	evaluate: function(args,scope) {
		var name = args[0].tok.name;
		return new TBool(name in scope.variables);
	}
});
jme.findvarsOps.isset = function(tree,boundvars,scope) {
	return [];
}
jme.substituteTreeOps.isset = function(tree,scope,allowUnbound) {
	return tree;
}

function mapOverList(lambda,names,list,scope) {
	var olist = list.map(function(v) {
		if(typeof(names)=='string') {
			scope.variables[names] = v;
		} else {
			names.forEach(function(name,i) {
				scope.variables[name] = v.value[i];
			});
		}
		return scope.evaluate(lambda);
	});
	return new TList(olist);
}

/** Functions for 'map', by the type of the thing being mapped over.
 * Functions take a JME expression lambda, a name or list of names to map, a value to map over, and a scope to evaluate against.
 * @memberof Numbas.jme
 * @enum {function}
 */
jme.mapFunctions = {
	'list': mapOverList,
	'set': mapOverList,
	'range': function(lambda,name,range,scope) {
		var list = math.rangeToList(range).map(function(n){return new TNum(n)});
		return mapOverList(lambda,name,list,scope);
	},
	'matrix': function(lambda,name,matrix,scope) {
		return new TMatrix(matrixmath.map(matrix,function(n) {
			scope.variables[name] = new TNum(n);
			var o = scope.evaluate(lambda);
			if(o.type!='number') {
				throw(new Numbas.Error("jme.map.matrix map returned non number"))
			}
			return o.value;
		}));
	},
	'vector': function(lambda,name,vector,scope) {
		return new TVector(vectormath.map(vector,function(n) {
			scope.variables[name] = new TNum(n);
			var o = scope.evaluate(lambda);
			if(o.type!='number') {
				throw(new Numbas.Error("jme.map.vector map returned non number"))
			}
			return o.value;
		}));
	}
}

newBuiltin('map',['?',TName,'?'],TList, null, {
	evaluate: function(args,scope)
	{
		var lambda = args[0];

		var value = jme.evaluate(args[2],scope);
		if(!(value.type in jme.mapFunctions)) {
			throw(new Numbas.Error('jme.typecheck.map not on enumerable',{type:value.type}));
		}
		scope = new Scope(scope);

		var names_tok = args[1].tok;
		var names;
		if(names_tok.type=='name') {
			names = names_tok.name;
		} else {
			names = args[1].args.map(function(t){return t.tok.name;});
		}
		return jme.mapFunctions[value.type](lambda,names,value.value,scope);
	},
	
	doc: {
		usage: ['map(expr,x,list)','map(x^2,x,[0,2,4,6])'],
		description: 'Apply the given expression to every value in a list.'
	}
});

jme.findvarsOps.map = function(tree,boundvars,scope) {
	boundvars = boundvars.slice();
	if(tree.args[1].tok.type=='list') {
		var names = tree.args[1].args;
		for(var i=0;i<names.length;i++) {
			boundvars.push(names[i].tok.name.toLowerCase());
		}
	} else {
		boundvars.push(tree.args[1].tok.name.toLowerCase());
	}
	var vars = jme.findvars(tree.args[0],boundvars,scope);
	vars = vars.merge(jme.findvars(tree.args[2],boundvars));
	return vars;
}
jme.substituteTreeOps.map = function(tree,scope,allowUnbound) {
	tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
	return tree;
}

newBuiltin('filter',['?',TName,'?'],TList,null, {
	evaluate: function(args,scope) {
		var lambda = args[0];

		var list = jme.evaluate(args[2],scope);
		switch(list.type) {
		case 'list':
			list = list.value;
			break;
		case 'range':
			list = math.rangeToList(list.value);
			for(var i=0;i<list.length;i++) {
				list[i] = new TNum(list[i]);
			}
			break;
		default:
			throw(new Numbas.Error('jme.typecheck.map not on enumerable',list.type));
		}
		scope = new Scope(scope);
		var name = args[1].tok.name;
		var value = list.filter(function(v) {
			scope.variables[name] = v;
			return jme.evaluate(lambda,scope).value;
		});
		return new TList(value);
	}
});
jme.findvarsOps.filter = function(tree,boundvars,scope) {
	boundvars = boundvars.slice();
	if(tree.args[1].tok.type=='list') {
		var names = tree.args[1].args;
		for(var i=0;i<names.length;i++) {
			boundvars.push(names[i].tok.name.toLowerCase());
		}
	} else {
		boundvars.push(tree.args[1].tok.name.toLowerCase());
	}
	var vars = jme.findvars(tree.args[0],boundvars,scope);
	vars = vars.merge(jme.findvars(tree.args[2],boundvars));
	return vars;
}
jme.substituteTreeOps.filter = function(tree,scope,allowUnbound) {
	tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
	return tree;
}

newBuiltin('let',['?'],TList, null, {
	evaluate: function(args,scope)
	{
		var lambda = args[args.length-1];

		var variables = {};
        if(args[0].tok.type=='dict') {
            var d = scope.evaluate(args[0]);
            variables = d.value;
        } else {
            for(var i=0;i<args.length-1;i+=2) {
                var name = args[i].tok.name;
                var value = scope.evaluate(args[i+1]);
                variables[name] = value;
            }
        }
		var nscope = new Scope([scope,{variables:variables}]);

		return nscope.evaluate(lambda);
	},

	typecheck: function(variables) {
        if(variables.length==2 && variables[0].tok.type=='dict') {
            return true;
        }
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
jme.findvarsOps.let = function(tree,boundvars,scope) {
	// find vars used in variable assignments
	var vars = [];
	for(var i=0;i<tree.args.length-1;i+=2) {
		vars = vars.merge(jme.findvars(tree.args[i+1],boundvars,scope));
	}

	// find variable names assigned by let
	boundvars = boundvars.slice();
	for(var i=0;i<tree.args.length-1;i+=2) {
		boundvars.push(tree.args[i].tok.name.toLowerCase());
	}

	// find variables used in the lambda expression, excluding the ones assigned by let
	vars = vars.merge(jme.findvars(tree.args[tree.args.length-1],boundvars,scope));

	return vars;
}
jme.substituteTreeOps.let = function(tree,scope,allowUnbound) {
	for(var i=1;i<tree.args.length-1;i+=2) {
		tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound);
	}
}

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

newBuiltin('reverse',[TList],TList,null, {
	evaluate: function(args,scope) {
		var list = args[0];
		return new TList(list.value.slice().reverse());
	}
});

// indices of given value in given list
newBuiltin('indices',[TList,'?'],TList,null, {
	evaluate: function(args,scope) {
		var list = args[0];
		var target = args[1];
		var out = [];
		list.value.map(function(v,i) {
			if(util.eq(v,target)) {
				out.push(new TNum(i));
			}
		});
		return new TList(out);
	}
});

newBuiltin('set',[TList],TSet,function(l) {
	return util.distinct(l);
});
newBuiltin('set',[TRange],TSet,function(r) {
	return math.rangeToList(r).map(function(n){return new TNum(n)});
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
newBuiltin('abs',[TSet],TNum,setmath.size);

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
			throw(new Numbas.Error('jme.func.matrix.invalid row type',{type:list.value[0].type}));
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

		return new THTML(table);
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

newBuiltin('table',[TList],THTML,
	function(data) {
		var table = $('<table/>');

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

		return new THTML(table);
	},
	{
		unwrapValues: true,

		doc: {
			usage: ['table([ [1,2,3], [4,5,6] ])', 'table(data)'],
			tags: ['table','tabular','data','html'],
			description: 'Create a table to display a list of rows of data.'
		}
	}
);

///end of builtins
});
