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
/** @file Sets up JME built-in functions.
 *
 * Provides {@link Numbas.jme}
 */
Numbas.queueScript('jme-builtins',['jme-base','jme-rules','jme-calculus','jme-variables'],function(){
var util = Numbas.util;
var math = Numbas.math;
var vectormath = Numbas.vectormath;
var matrixmath = Numbas.matrixmath;
var setmath = Numbas.setmath;
var jme = Numbas.jme;

var Scope = jme.Scope;
var funcObj = jme.funcObj;

var types = Numbas.jme.types;
var TNum = types.TNum;
var TInt = types.TInt;
var TRational = types.TRational;
var TDecimal = types.TDecimal;
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
var TExpression = types.TExpression;
var TOp = types.TOp;
var TFunc = types.TFunc;

var sig = jme.signature;

/** The built-in JME evaluation scope.
 *
 * @type {Numbas.jme.Scope}
 * @memberof Numbas.jme
 */
var builtinScope = jme.builtinScope = new Scope({rulesets:jme.rules.simplificationRules});
builtinScope.setConstant('nothing',{value: new types.TNothing, tex: '\\text{nothing}'});
/** Definitions of constants to include in `Numbas.jme.builtinScope`.
 *
 * @type {Array.<Numbas.jme.constant_definition>}
 * @memberof Numbas.jme
 */
var builtin_constants = Numbas.jme.builtin_constants = [
    {name: 'e', value: new TNum(Math.E), tex: 'e'},
    {name: 'pi,π', value: new TNum(Math.PI), tex: '\\pi'},
    {name: 'i', value: new TNum(math.complex(0,1)), tex: 'i'},
    {name: 'infinity,infty,∞', value: new TNum(Infinity), tex: '\\infty'},
    {name: 'NaN', value: new TNum(NaN), tex: '\\texttt{NaN}'}
];
Numbas.jme.variables.makeConstants(Numbas.jme.builtin_constants, builtinScope);

var funcs = {};

/** Add a function to the built-in scope.
 *
 * @see Numbas.jme.builtinScope
 * @param {string} name
 * @param {Array.<Function|string>} intype - A list of data type constructors for the function's paramters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type. If `null`, then `options.typecheck` is used.
 * @param {Function} outcons - The constructor for the output value of the function
 * @param {Numbas.jme.evaluate_fn} fn - JavaScript code which evaluates the function.
 * @param {Numbas.jme.funcObj_options} options
 * @returns {Numbas.jme.funcObj}
 */
function newBuiltin(name,intype,outcons,fn,options) {
    return builtinScope.addFunction(new funcObj(name,intype,outcons,fn,options));
}

newBuiltin('+u', [TNum], TNum, function(a){return a;});
newBuiltin('+u', [TVector], TVector, function(a){return a;});
newBuiltin('+u', [TMatrix], TMatrix, function(a){return a;});
newBuiltin('-u', [TNum], TNum, math.negate);
newBuiltin('-u', [TVector], TVector, vectormath.negate);
newBuiltin('-u', [TMatrix], TMatrix, matrixmath.negate);
newBuiltin('+', [TNum,TNum], TNum, math.add);
newBuiltin('+', [TList,TList], TList, null, {
    evaluate: function(args,scope)
    {
        var value = args[0].value.concat(args[1].value);
        return new TList(value);
    }
});
newBuiltin('+',[TList,'?'],TList, null, {
    evaluate: function(args,scope)
    {
        var value = args[0].value.slice();
        value.push(args[1]);
        return new TList(value);
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
newBuiltin('+', [TString,'?'], TString, fconc);
newBuiltin('+', ['?',TString], TString, fconc);
newBuiltin('+', [TVector,TVector], TVector, vectormath.add);
newBuiltin('+', [TMatrix,TMatrix], TMatrix, matrixmath.add);
newBuiltin('-', [TNum,TNum], TNum, math.sub);
newBuiltin('-', [TVector,TVector], TVector, vectormath.sub);
newBuiltin('-', [TMatrix,TMatrix], TMatrix, matrixmath.sub);
newBuiltin('*', [TNum,TNum], TNum, math.mul );
newBuiltin('*', [TNum,TVector], TVector, vectormath.mul);
newBuiltin('*', [TVector,TNum], TVector, function(a,b){return vectormath.mul(b,a)});
newBuiltin('*', [TMatrix,TVector], TVector, vectormath.matrixmul);
newBuiltin('*', [TNum,TMatrix], TMatrix, matrixmath.scalarmul );
newBuiltin('*', [TMatrix,TNum], TMatrix, function(a,b){ return matrixmath.scalarmul(b,a); } );
newBuiltin('*', [TMatrix,TMatrix], TMatrix, matrixmath.mul);
newBuiltin('*', [TVector,TMatrix], TVector, vectormath.vectormatrixmul);
newBuiltin('/', [TNum,TNum], TNum, math.div );
newBuiltin('/', [TMatrix,TNum], TMatrix, function(a,b){ return matrixmath.scalardiv(a,b); } );
newBuiltin('/', [TVector,TNum], TVector, function(a,b){return vectormath.div(a,b)});
newBuiltin('^', [TNum,TNum], TNum, math.pow );
newBuiltin('dot',[TVector,TVector],TNum,vectormath.dot);
newBuiltin('dot',[TMatrix,TVector],TNum,vectormath.dot);
newBuiltin('dot',[TVector,TMatrix],TNum,vectormath.dot);
newBuiltin('dot',[TMatrix,TMatrix],TNum,vectormath.dot);
newBuiltin('cross',[TVector,TVector],TVector,vectormath.cross);
newBuiltin('cross',[TMatrix,TVector],TVector,vectormath.cross);
newBuiltin('cross',[TVector,TMatrix],TVector,vectormath.cross);
newBuiltin('cross',[TMatrix,TMatrix],TVector,vectormath.cross);
newBuiltin('det', [TMatrix], TNum, matrixmath.abs);
newBuiltin('numrows',[TMatrix], TNum, function(m){ return m.rows });
newBuiltin('numcolumns',[TMatrix], TNum, function(m){ return m.columns });
newBuiltin('angle',[TVector,TVector],TNum,vectormath.angle);
newBuiltin('transpose',[TVector],TMatrix, vectormath.transpose);
newBuiltin('transpose',[TMatrix],TMatrix, matrixmath.transpose);
newBuiltin('is_zero',[TVector],TBool, vectormath.is_zero);
newBuiltin('id',[TNum],TMatrix, matrixmath.id);
newBuiltin('sum_cells',[TMatrix],TNum,matrixmath.sum_cells);
newBuiltin('numrows', [TMatrix], TNum,function(m) {return matrixmath.numrows(m)});
newBuiltin('numcolumns', [TMatrix], TNum,function(m) {return matrixmath.numcolumns(m)});
newBuiltin('combine_vertically',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_vertically(m1,m2)
});
newBuiltin('stack',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_vertically(m1,m2)
});
newBuiltin('combine_horizontally',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_horizontally(m1,m2)
});
newBuiltin('augment',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_horizontally(m1,m2)
});
newBuiltin('combine_diagonally',[TMatrix,TMatrix],TMatrix,function(m1,m2) {
    return matrixmath.combine_diagonally(m1,m2)
});
newBuiltin('..', [TNum,TNum], TRange, math.defineRange);
newBuiltin('#', [TRange,TNum], TRange, math.rangeSteps);
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
        if(args.length==0) {
            return new TDict({});
        }
        var value = {};
        if(args[0].tok.type=='keypair') {
            args.forEach(function(kp) {
                value[kp.tok.key] = jme.evaluate(kp.args[0],scope);
            });
        } else if(args.length==1) {
            var list = scope.evaluate(args[0]);
            var items = list.value;
            if(list.type!='list' || !items.every(function(item) {return item.type=='list' && item.value.length==2 && item.value[0].type=='string';})) {
                throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'dict'}));
            }
            items.forEach(function(item) {
                value[item.value[0].value] = item.value[1];
            });
        } else {
            throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'dict'}));
        }
        return new TDict(value);
    }
});
Numbas.jme.lazyOps.push('dict');
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
newBuiltin('values',[TDict,sig.listof(sig.type('string'))],TList,function(d,keys) {
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
newBuiltin('formatstring',[TString,TList],TString,null, {
    evaluate: function(args,scope) {
        var str = args[0].value;
        var extra = args[1].value;
        return new TString(util.formatString.apply(util,[str].concat(extra.map(function(x) { return jme.tokenToDisplayString(x,scope); }))));
    }
});
newBuiltin('unpercent',[TString],TNum,util.unPercent);
newBuiltin('letterordinal',[TNum],TString,util.letterOrdinal);
newBuiltin('html',[TString],THTML,null, {
    evaluate: function(args, scope) { 
        var elements = $(args[0].value);
        var subber = new jme.variables.DOMcontentsubber(scope);
        elements = $(elements).map(function(i,element) {
            return subber.subvars(element);
        });
        return new THTML(elements);
    }
});
newBuiltin('isnonemptyhtml',[TString],TBool,function(html) {
    return util.isNonemptyHTML(html);
});
newBuiltin('image',[TString, '[number]', '[number]'],THTML,null, {
    evaluate: function(args,scope) { 
        var url = args[0].value;
        var width = args[1];
        var height = args[2];
        var img = document.createElement('img');
        img.setAttribute('src',url);
        if(width.type != 'nothing') {
            img.style.width = width.value+'em';
        }
        if(height.type != 'nothing') {
            img.style.height = height.value+'em';
        }
        var subber = new jme.variables.DOMcontentsubber(scope);
        var element = subber.subvars(img);
        return new THTML(element);
    }
});
newBuiltin('latex',[TString],TString,null,{
    evaluate: function(args,scope) {
        var s = new TString(args[0].value);
        s.latex = true;
        s.display_latex = true;
        s.safe = args[0].safe;
        return s;
    }
});
newBuiltin('safe',[TString],TString,null, {
    evaluate: function(args,scope) {
        var s = args[0];
        while(jme.isFunction(s.tok,'safe')) {
            s = s.args[0];
        }
        var t;
        if(s.args) {
            var r = scope.evaluate(s);
            t = new TString(r.value);
            t.latex = r.latex;
            t.display_latex = r.display_latex;
        } else {
            t = new TString(s.tok.value);
        }
        t.safe = true;
        return t;
    }
});
Numbas.jme.lazyOps.push('safe');
jme.findvarsOps.safe = function(tree,boundvars,scope) {
    return [];
}
newBuiltin('render',[TString,sig.optional(sig.type('dict'))],TString, null, {
    evaluate: function(args,scope) {
        var str = args[0].value;
        var variables = args.length>1 ? args[1].value : {};
        scope = new Scope([scope,{variables: variables}]);
        return new TString(jme.contentsubvars(str,scope,true));
    }
});
jme.findvarsOps.render = function(tree,boundvars,scope) {
    var vars = [];
    if(tree.args[0].tok.type!='string') {
        vars = jme.findvars(tree.args[0],[],scope);
    }
    if(tree.args.length>1) {
        vars = vars.merge(jme.findvars(tree.args[1],boundvars,scope));
    }
    return vars;
}
newBuiltin('capitalise',[TString],TString,function(s) { return util.capitalise(s); });
newBuiltin('upper',[TString],TString,function(s) { return s.toUpperCase(); });
newBuiltin('lower',[TString],TString,function(s) { return s.toLowerCase(); });
newBuiltin('pluralise',[TNum,TString,TString],TString,function(n,singular,plural) { return util.pluralise(n,singular,plural); });
newBuiltin('join',[TList,TString],TString,null, {
    evaluate: function(args,scope) {
        var list = args[0].value;
        var delimiter = args[1].value;
        return new TString(list.map(function(x) { return jme.tokenToDisplayString(x,scope); }).join(delimiter));
    }
});
newBuiltin('split',[TString,TString],TList, function(str,delimiter) {
    return str.split(delimiter).map(function(s){return new TString(s)});
});
newBuiltin('trim',[TString],TString, function(str) { return str.trim(); });
newBuiltin('currency',[TNum,TString,TString],TString,util.currency);
newBuiltin('separateThousands',[TNum,TString],TString,util.separateThousands);
newBuiltin('listval',[TString,TNum],TString,function(s,i) {return s[i]});
newBuiltin('listval',[TString,TRange],TString,function(s,range) {return s.slice(range[0],range[1])});
newBuiltin('in',[TString,TString],TBool,function(sub,str) { return str.indexOf(sub)>=0 });
newBuiltin('lpad',[TString,TNum,TString], TString, util.lpad);
newBuiltin('rpad',[TString,TNum,TString], TString, util.rpad);
newBuiltin('match_regex',[TString,TString],TList,function(pattern,str) {
    var re = new RegExp(pattern,'u');
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});
newBuiltin('match_regex',[TString,TString,TString],TList,function(pattern,str,flags) {
    var re = new RegExp(pattern,flags);
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});

newBuiltin('split_regex',[TString,TString],TList, function(str,delimiter) {
    return str.split(new RegExp(delimiter,'u')).map(function(s){return new TString(s)});
});
newBuiltin('split_regex',[TString,TString,TString],TList, function(str,delimiter,flags) {
    return str.split(new RegExp(delimiter,flags)).map(function(s){return new TString(s)});
});

newBuiltin('replace_regex',[TString,TString,TString],TString,function(pattern,replacement,str) {
    return str.replace(new RegExp(pattern,'u'),replacement);
});

newBuiltin('replace_regex',[TString,TString,TString,TString],TString,function(pattern,replacement,str,flags) {
    return str.replace(new RegExp(pattern,flags),replacement);
});

//the next three versions of the `except` operator
//exclude numbers from a range, given either as a range, a list or a single value
newBuiltin('except', [TRange,TRange], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        var cons = best_number_type_for_range(range);
        range = math.rangeToList(range);
        if(except[2]==0) {
            return range.filter(function(i){return i<except[0] || i>except[1]}).map(function(i){return new cons(i)});
        } else {
            except = math.rangeToList(except);
            return math.except(range,except).map(function(i){return new cons(i)});
        }
    }
);
newBuiltin('except', [TRange,'list of number'], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        var cons = best_number_type_for_range(range);
        range = math.rangeToList(range)
        except = except.map(function(i){ return i.value; });
        return math.except(range,except).map(function(i){return new cons(i)});
    }
);
newBuiltin('except', [TRange,TNum], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        var cons = best_number_type_for_range(range);
        range = math.rangeToList(range);
        return math.except(range,[except]).map(function(i){return new cons(i)});
    }
);
//exclude numbers from a list, so use the math.except function
newBuiltin('except', [TList,TRange], TList,
    function(range,except) {
        except = math.rangeToList(except);
        return range.filter(function(r) {
            return !except.some(function(e) { return math.eq(r.value,e) });
        });
    }
);
//exclude values of any type from a list containing values of any type, so use the util.except function
newBuiltin('except', [TList,TList], TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.except(args[0].value,args[1].value,scope));
    }
});
newBuiltin('except',[TList,'?'], TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.except(args[0].value,[args[1]],scope));
    }
});
newBuiltin('distinct',[TList],TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.distinct(args[0].value,scope));
    }
},{unwrapValues: false});
newBuiltin('in',['?',TList],TBool,null,{
    evaluate: function(args,scope) {
        return new TBool(util.contains(args[1].value,args[0],scope));
    }
});
newBuiltin('<', [TNum,TNum], TBool, math.lt);
newBuiltin('>', [TNum,TNum], TBool, math.gt );
newBuiltin('<=', [TNum,TNum], TBool, math.leq );
newBuiltin('>=', [TNum,TNum], TBool, math.geq );
newBuiltin('<>', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.neq(args[0],args[1],scope));
    }
});
newBuiltin('=', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.eq(args[0],args[1],scope));
    }
});
newBuiltin('isclose', [TNum,TNum,sig.optional(sig.type('number')),sig.optional(sig.type('number'))], TBool, math.isclose);
newBuiltin('is_scalar_multiple', [TVector,TVector,sig.optional(sig.type('number')),sig.optional(sig.type('number'))], TBool, math.is_scalar_multiple);
newBuiltin('and', [TBool,TBool], TBool, function(a,b){return a&&b;} );
newBuiltin('not', [TBool], TBool, function(a){return !a;} );
newBuiltin('or', [TBool,TBool], TBool, function(a,b){return a||b;} );
newBuiltin('xor', [TBool,TBool], TBool, function(a,b){return (a || b) && !(a && b);} );
newBuiltin('implies', [TBool,TBool], TBool, function(a,b){return !a || b;} );
newBuiltin('abs', [TNum], TNum, math.abs );
newBuiltin('abs', [TString], TNum, function(s){return s.length} );
newBuiltin('abs', [TList], TNum, function(l) { return l.length; });
newBuiltin('abs', [TRange], TNum, function(r) { return r[2]==0 ? Math.abs(r[0]-r[1]) : math.rangeSize(r); });
newBuiltin('abs', [TVector], TNum, vectormath.abs);
newBuiltin('abs', [TDict], TNum, function(d) {
    var n = 0;
    for(var x in d) {
        n += 1;
    }
    return n;
});
newBuiltin('arg', [TNum], TNum, math.arg );
newBuiltin('re', [TNum], TNum, math.re );
newBuiltin('im', [TNum], TNum, math.im );
newBuiltin('conj', [TNum], TNum, math.conjugate );
newBuiltin('isint',[TNum],TBool, function(a){ return util.isInt(a); });
newBuiltin('sqrt', [TNum], TNum, math.sqrt );
newBuiltin('ln', [TNum], TNum, math.log );
newBuiltin('log', [TNum], TNum, math.log10 );
newBuiltin('log', [TNum,TNum], TNum, math.log_base );
newBuiltin('exp', [TNum], TNum, math.exp );
newBuiltin('fact', [TNum], TNum, math.factorial );
newBuiltin('gamma', [TNum], TNum, math.gamma );
newBuiltin('sin', [TNum], TNum, math.sin );
newBuiltin('cos', [TNum], TNum, math.cos );
newBuiltin('tan', [TNum], TNum, math.tan );
newBuiltin('cosec', [TNum], TNum, math.cosec );
newBuiltin('sec', [TNum], TNum, math.sec );
newBuiltin('cot', [TNum], TNum, math.cot );
newBuiltin('arcsin', [TNum], TNum, math.arcsin );
newBuiltin('arccos', [TNum], TNum, math.arccos );
newBuiltin('arctan', [TNum], TNum, math.arctan );
newBuiltin('sinh', [TNum], TNum, math.sinh );
newBuiltin('cosh', [TNum], TNum, math.cosh );
newBuiltin('tanh', [TNum], TNum, math.tanh );
newBuiltin('cosech', [TNum], TNum, math.cosech );
newBuiltin('sech', [TNum], TNum, math.sech );
newBuiltin('coth', [TNum], TNum, math.coth );
newBuiltin('arcsinh', [TNum], TNum, math.arcsinh );
newBuiltin('arccosh', [TNum], TNum, math.arccosh );
newBuiltin('arctanh', [TNum], TNum, math.arctanh );
newBuiltin('atan2', [TNum,TNum], TNum, math.atan2 );
newBuiltin('ceil', [TNum], TNum, null, {
    evaluate: function(args,scope) {
        var n = math.ceil(jme.castToType(args[0],'number').value);
        if(n.complex) {
            return new TNum(n);
        } else {
            return new TInt(n);
        }
    }
});
newBuiltin('floor', [TNum], TNum, null, {
    evaluate: function(args,scope) {
        var n = math.floor(jme.castToType(args[0],'number').value);
        if(n.complex) {
            return new TNum(n);
        } else {
            return new TInt(n);
        }
    }
});
newBuiltin('round', [TNum], TNum, null, {
    evaluate: function(args,scope) {
        var n = math.round(jme.castToType(args[0],'number').value);
        if(n.complex) {
            return new TNum(n);
        } else {
            return new TInt(n);
        }
    }
});
newBuiltin('tonearest',[TNum,TNum], TNum, math.toNearest);
newBuiltin('trunc', [TNum], TNum, math.trunc );
newBuiltin('fract', [TNum], TNum, math.fract );
newBuiltin('degrees', [TNum], TNum, math.degrees );
newBuiltin('radians', [TNum], TNum, math.radians );
newBuiltin('sign', [TNum], TNum, math.sign );
newBuiltin('rational_approximation',[TNum],TList,function(n) {
    return math.rationalApproximation(n).map(function(x) { return new TInt(x); });
});
newBuiltin('rational_approximation',[TNum,TNum],TList,function(n,accuracy) {
    return math.rationalApproximation(n,accuracy).map(function(x) { return new TInt(x); });
});
newBuiltin('factorise',[TNum],TList,function(n) {
        return math.factorise(n).map(function(n){return new TNum(n)});
    }
);
newBuiltin('divisors',[TNum],TList,function(n) {
        return math.divisors(n).map(function(n){return new TNum(n)});
    }
);
newBuiltin('proper_divisors',[TNum],TList,function(n) {
        return math.proper_divisors(n).map(function(n){return new TNum(n)});
    }
);

/** Work out which number type best represents a range: if all values are integers, return `TInt`, otherwise `TNum`.
 *
 * @param {Numbas.math.range} range
 * @returns {Function} - a token constructor
 */
function best_number_type_for_range(range) {
    if(util.isInt(range[0]) && util.isInt(range[2]) && range[2]!=0) {
        return TInt;
    } else {
        return TNum;
    }
}
newBuiltin('random', [TRange], TNum, null, {
    evaluate: function(args,scope) {
        var range = args[0];
        var n = math.random(range.value);
        var cons = best_number_type_for_range(range.value);
        return new cons(n);
    },
    random:true
});
newBuiltin('random',[TList],'?',null, {
    random:true,
    evaluate: function(args,scope)
    {
        return math.choose(args[0].value);
    }
});
newBuiltin( 'random',['*?'],'?', null, {
    random:true,
    evaluate: function(args,scope) { return math.choose(args);}
});
newBuiltin('weighted_random',[sig.listof(sig.list(sig.anything(),sig.type('number')))],'?',null, {
    evaluate: function(args,scope) {
        var items = args[0].value.map(function(item) {
            return [item.value[0], Numbas.jme.unwrapValue(item.value[1])];
        });
        return math.weighted_random(items);
    }
});
newBuiltin('mod', [TNum,TNum], TNum, math.mod );
newBuiltin('max', [TNum,TNum], TNum, math.max );
newBuiltin('min', [TNum,TNum], TNum, math.min );
newBuiltin('clamp',[TNum,TNum,TNum], TNum, function(x,min,max) { return math.max(math.min(x,max),min); });
newBuiltin('max', [sig.listof(sig.type('number'))], TNum, math.listmax, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('number'))], TNum, math.listmin, {unwrapValues: true});
newBuiltin('precround', [TNum,TNum], TNum, math.precround );
newBuiltin('precround', [TMatrix,TNum], TMatrix, matrixmath.precround );
newBuiltin('precround', [TVector,TNum], TVector, vectormath.precround );
newBuiltin('siground', [TNum,TNum], TNum, math.siground );
newBuiltin('siground', [TMatrix,TNum], TMatrix, matrixmath.siground );
newBuiltin('siground', [TVector,TNum], TVector, vectormath.siground );
newBuiltin('dpformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'dp', precision:p});}, {latex: true} );
newBuiltin('dpformat', [TNum,TNum,TString], TString, function(n,p,style) {return math.niceNumber(n,{precisionType: 'dp', precision:p, style: style});}, {latex: true} );
newBuiltin('sigformat', [TNum,TNum], TString, function(n,p) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p});}, {latex: true} );
newBuiltin('sigformat', [TNum,TNum,TString], TString, function(n,p,style) {return math.niceNumber(n,{precisionType: 'sigfig', precision:p, style:style});}, {latex: true} );
newBuiltin('formatnumber', [TNum,TString], TString, function(n,style) {return math.niceNumber(n,{style:style});});
newBuiltin('string', [TNum], TString, math.niceNumber);
newBuiltin('parsenumber', [TString,TString], TNum, function(s,style) {return util.parseNumber(s,false,style,true);});
newBuiltin('parsenumber', [TString,sig.listof(sig.type('string'))], TNum, function(s,styles) {return util.parseNumber(s,false,styles,true);}, {unwrapValues: true});
newBuiltin('parsenumber_or_fraction', [TString], TNum, function(s) {return util.parseNumber(s,true,"plain-en",true);});
newBuiltin('parsenumber_or_fraction', [TString,TString], TNum, function(s,style) {return util.parseNumber(s,true,style,true);});
newBuiltin('parsenumber_or_fraction', [TString,sig.listof(sig.type('string'))], TNum, function(s,styles) {return util.parseNumber(s,true,styles,true);}, {unwrapValues: true});

newBuiltin('parsedecimal', [TString,TString], TDecimal, function(s,style) {return util.parseDecimal(s,false,style,true);});
newBuiltin('parsedecimal', [TString,sig.listof(sig.type('string'))], TDecimal, function(s,styles) {return util.parseDecimal(s,false,styles,true);}, {unwrapValues: true});
newBuiltin('parsedecimal_or_fraction', [TString], TDecimal, function(s,style) {return util.parseDecimal(s,true,"plain-en",true);});
newBuiltin('parsedecimal_or_fraction', [TString,TString], TDecimal, function(s,style) {return util.parseDecimal(s,true,style,true);});
newBuiltin('parsedecimal_or_fraction', [TString,sig.listof(sig.type('string'))], TDecimal, function(s,styles) {return util.parseDecimal(s,true,styles,true);}, {unwrapValues: true});

newBuiltin('tobinary', [TInt], TString, function(n) {
    return n.toString(2);
},{latex: true});
newBuiltin('tooctal', [TInt], TString, function(n) {
    return n.toString(8);
},{latex: true});
newBuiltin('tohexadecimal', [TInt], TString, function(n) {
    return n.toString(16);
},{latex: true});
newBuiltin('tobase', [TInt,TInt], TString, function(n,b) {
    return n.toString(b);
},{latex: true});
newBuiltin('frombinary', [TString], TInt, function(s) {
    return util.parseInt(s,2);
});
newBuiltin('fromoctal', [TString], TInt, function(s) {
    return util.parseInt(s,8);
});
newBuiltin('fromhexadecimal', [TString], TInt, function(s) {
    return util.parseInt(s,16);
});
newBuiltin('frombase', [TString, TInt], TInt, function(s,b) {
    return util.parseInt(s,b);
});

newBuiltin('scientificnumberlatex', [TNum], TString, null, {
    evaluate: function(args,scope) {
        var n = args[0].value;
        if(n.complex) {
            n = n.re;
        }
        var bits = math.parseScientific(math.niceRealNumber(n,{style:'scientific'}));
        var s = new TString(math.niceRealNumber(bits.significand)+' \\times 10^{'+bits.exponent+'}');
        s.latex = true;
        s.safe = true;
        s.display_latex = true;
        return s;
    }
});
newBuiltin('scientificnumberlatex', [TDecimal], TString, null, {
    evaluate: function(args,scope) {
        var n = args[0].value;
        var bits = math.parseScientific(n.re.toExponential());
        var s = new TString(math.niceRealNumber(bits.significand)+' \\times 10^{'+bits.exponent+'}');
        s.latex = true;
        s.safe = true;
        s.display_latex = true;
        return s;
    }
});
newBuiltin('scientificnumberhtml', [TDecimal], THTML, function(n) {
    var bits = math.parseScientific(n.re.toExponential());
    var s = document.createElement('span');
    s.innerHTML = math.niceRealNumber(bits.significand)+' × 10<sup>'+bits.exponent+'</sup>';
    return s;
});
newBuiltin('scientificnumberhtml', [TDecimal], THTML, function(n) {
    if(n.complex) {
        n = n.re;
    }
    var bits = math.parseScientific(math.niceRealNumber(n,{style:'scientific'}));
    var s = document.createElement('span');
    s.innerHTML = math.niceRealNumber(bits.significand)+' × 10<sup>'+bits.exponent+'</sup>';
    return s;
});

newBuiltin('togivenprecision', [TString,TString,TNum,TBool], TBool, math.toGivenPrecision);
newBuiltin('withintolerance',[TNum,TNum,TNum],TBool, math.withinTolerance);
newBuiltin('countdp',[TString],TNum, function(s) { return math.countDP(util.cleanNumber(s)); });
newBuiltin('countsigfigs',[TString],TNum, function(s) { return math.countSigFigs(util.cleanNumber(s)); });
newBuiltin('isnan',[TNum],TBool,function(n) {
    return isNaN(n);
});
newBuiltin('matchnumber',[TString,sig.listof(sig.type('string'))],TList,function(s,styles) {
    var result = util.matchNotationStyle(s,styles,true);
    return [new TString(result.matched), new TNum(util.parseNumber(result.cleaned,false,['plain'],true))];
},{unwrapValues:true});
newBuiltin('cleannumber',[TString,sig.optional(sig.listof(sig.type('string')))],TString,util.cleanNumber,{unwrapValues:true});
newBuiltin('isbool',[TString],TBool,util.isBool);
newBuiltin('perm', [TNum,TNum], TNum, math.permutations );
newBuiltin('comb', [TNum,TNum], TNum, math.combinations );
newBuiltin('root', [TNum,TNum], TNum, math.root );
newBuiltin('award', [TNum,TBool], TNum, function(a,b){return (b?a:0);} );
newBuiltin('gcd', [TNum,TNum], TNum, math.gcf );
newBuiltin('gcd_without_pi_or_i', [TNum,TNum], TNum, function(a,b) {    // take out factors of pi or i before working out gcd. Used by the fraction simplification rules
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
newBuiltin('coprime',[TNum,TNum], TBool, math.coprime);
newBuiltin('lcm', [sig.multiple(sig.type('number'))], TNum, math.lcm );
newBuiltin('lcm', [sig.listof(sig.type('number'))], TNum, function(l){
        if(l.length==0) {
            return 1;
        } else if(l.length==1) {
            return l[0];
        } else {
            return math.lcm.apply(math,l);
        }
    },
    {unwrapValues: true}
);
newBuiltin('|', [TNum,TNum], TBool, math.divides );


var Fraction = math.Fraction;

// Integer arithmetic
newBuiltin('int',[TNum],TInt, function(n){ return n; });
newBuiltin('+u', [TInt], TInt, function(a){return a;});
newBuiltin('-u', [TInt], TInt, math.negate);
newBuiltin('+', [TInt,TInt], TInt, math.add);
newBuiltin('-', [TInt,TInt], TInt, math.sub);
newBuiltin('*', [TInt,TInt], TInt, math.mul );
newBuiltin('/', [TInt,TInt], TRational, function(a,b) { return new Fraction(a,b); });
newBuiltin('^', [TInt,TInt], TNum, function(a,b) { return math.pow(a,b); });
newBuiltin('mod', [TInt,TInt], TInt, math.mod );
newBuiltin('string',[TInt], TString, math.niceNumber);
newBuiltin('max', [TInt,TInt], TInt, math.max );
newBuiltin('min', [TInt,TInt], TInt, math.min );
newBuiltin('max', [sig.listof(sig.type('integer'))], TInt, math.listmax, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('integer'))], TInt, math.listmin, {unwrapValues: true});

// Rational arithmetic
newBuiltin('+u', [TRational], TRational, function(a){return a;});
newBuiltin('-u', [TRational], TRational, function(r){ return r.negate(); });
newBuiltin('+', [TRational,TRational], TRational, function(a,b){ return a.add(b); });
newBuiltin('-', [TRational,TRational], TRational, function(a,b){ return a.subtract(b); });
newBuiltin('*', [TRational,TRational], TRational, function(a,b){ return a.multiply(b); });
newBuiltin('/', [TRational,TRational], TRational, function(a,b){ return a.divide(b); });
newBuiltin('^', [TRational,TInt], TRational, function(a,b) { return a.pow(b); });
newBuiltin('max', [TRational,TRational], TRational, Fraction.max );
newBuiltin('min', [TRational,TRational], TRational, Fraction.min );
newBuiltin('max', [sig.listof(sig.type('rational'))], TRational, function(l) { return Fraction.max.apply(Fraction,l); }, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('rational'))], TRational, function(l) { return Fraction.min.apply(Fraction,l); }, {unwrapValues: true});

newBuiltin('string',[TRational], TString, function(a) { return a.toString(); });
newBuiltin('rational',[TNum],TRational, function(n) {
    var r = math.rationalApproximation(n);
    return new Fraction(r[0],r[1]);
});

//Decimal arithmetic
newBuiltin('string',[TDecimal], TString, math.niceComplexDecimal);
newBuiltin('decimal',[TNum],TDecimal,math.numberToDecimal);
newBuiltin('decimal',[TString],TDecimal,function(x){return new Decimal(x)});
newBuiltin('+u', [TDecimal], TDecimal, function(a){return a;});
newBuiltin('-u', [TDecimal], TDecimal, function(a){ return a.negated(); });
newBuiltin('+', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.plus(b); });
newBuiltin('+', [TNum,TDecimal], TDecimal, function(a,b){ return (new math.ComplexDecimal(new Decimal(a))).plus(b); });
newBuiltin('-', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.minus(b); });
newBuiltin('-', [TNum,TDecimal], TDecimal, function(a,b){ return (new math.ComplexDecimal(new Decimal(a))).minus(b); });
newBuiltin('*', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.times(b); });
newBuiltin('/', [TDecimal,TDecimal], TDecimal, function(a,b){ return a.dividedBy(b); });
newBuiltin('/', [TNum,TDecimal], TDecimal, function(a,b){ return (new math.ComplexDecimal(new Decimal(a))).dividedBy(b); });
newBuiltin('abs', [TDecimal], TDecimal, function(a){ return a.absoluteValue(); });
newBuiltin('ceil', [TDecimal], TDecimal, function(a){ return a.re.ceil(); });
newBuiltin('cos', [TDecimal], TDecimal, function(a){ return a.re.cos(); });
newBuiltin('countdp', [TDecimal], TInt, function(a){ return a.decimalPlaces(); });
newBuiltin('floor', [TDecimal], TDecimal, function(a){ return a.re.floor(); });
newBuiltin('>', [TDecimal,TDecimal], TBool, function(a,b){ return a.greaterThan(b); });
newBuiltin('>=', [TDecimal,TDecimal], TBool, function(a,b){ return a.greaterThanOrEqualTo(b); });
newBuiltin('>=', [TDecimal,TNum], TBool, function(a,b){ return math.geq(a.re.toNumber(),b); });
newBuiltin('cosh', [TDecimal], TDecimal, function(a){ return a.re.cosh(); });
newBuiltin('sinh', [TDecimal], TDecimal, function(a){ return a.re.sinh(); });
newBuiltin('tanh', [TDecimal], TDecimal, function(a){ return a.re.tanh(); });
newBuiltin('arccos', [TDecimal], TDecimal, function(a){ return a.re.acos(); });
newBuiltin('arccosh', [TDecimal], TDecimal, function(a){ return a.re.acosh(); });
newBuiltin('arcsinh', [TDecimal], TDecimal, function(a){ return a.re.asinh(); });
newBuiltin('arctanh', [TDecimal], TDecimal, function(a){ return a.re.atanh(); });
newBuiltin('arcsin', [TDecimal], TDecimal, function(a){ return a.re.asin(); });
newBuiltin('arctan', [TDecimal], TDecimal, function(a){ return a.re.atan(); });
newBuiltin('atan2', [TDecimal,TDecimal], TDecimal, function(a,b) { return Decimal.atan2(a.re,b.re); } );
newBuiltin('isint',[TDecimal], TBool, function(a) {return a.isInt(); })
newBuiltin('isnan',[TDecimal], TBool, function(a) {return a.isNaN(); })
newBuiltin('iszero',[TDecimal], TBool, function(a) {return a.isZero(); })
newBuiltin('<', [TDecimal,TDecimal], TBool, function(a,b){ return a.lessThan(b); });
newBuiltin('<=', [TDecimal,TDecimal], TBool, function(a,b){ return a.lessThanOrEqualTo(b); });
newBuiltin('<=', [TDecimal,TNum], TBool, function(a,b){ return math.leq(a.re.toNumber(),b); });
newBuiltin('log',[TDecimal], TDecimal, function(a) {return a.re.log(); })
newBuiltin('log',[TDecimal,TDecimal], TDecimal, function(a,b) {return a.re.log()/b.re.log(); })
newBuiltin('mod', [TDecimal,TDecimal], TDecimal, function(a,b) {
    var m = a.re.mod(b.re);
    if(m.isNegative()) {
        m = m.plus(b.re);
    }
    return m;
});
newBuiltin('exp',[TDecimal], TDecimal, function(a) {return a.re.exp(); });
newBuiltin('ln',[TDecimal], TDecimal, function(a) {return a.re.ln(); });
newBuiltin('countsigfigs',[TDecimal], TInt, function(a) {return a.re.countSigFigs(); });
newBuiltin('round',[TDecimal], TDecimal, function(a) {return a.round(); });
newBuiltin('sin',[TDecimal], TDecimal, function(a) {return a.re.sin(); });
newBuiltin('sqrt',[TDecimal], TDecimal, function(a) {return a.squareRoot(); });
newBuiltin('tan',[TDecimal], TDecimal, function(a) {return a.re.tan(); });
newBuiltin('precround',[TDecimal,TNum], TDecimal, function(a,dp) {return a.toDecimalPlaces(dp); });
newBuiltin('min', [TDecimal,TDecimal], TDecimal, math.ComplexDecimal.min );
newBuiltin('max', [TDecimal,TDecimal], TDecimal, math.ComplexDecimal.max );
newBuiltin('max', [sig.listof(sig.type('decimal'))], TDecimal, function(l) { return math.listmax(l,math.ComplexDecimal.max); }, {unwrapValues: true});
newBuiltin('min', [sig.listof(sig.type('decimal'))], TDecimal, function(l) { return math.listmin(l,math.ComplexDecimal.min); }, {unwrapValues: true});
newBuiltin('dpformat',[TDecimal,TNum], TString, function(a,dp) {return a.toFixed(dp); });
newBuiltin('tonearest',[TDecimal,TDecimal], TDecimal, function(a,x) {return a.toNearest(x.re); });
newBuiltin('^',[TDecimal,TDecimal], TDecimal, function(a,b) {return a.pow(b); });
newBuiltin('sigformat',[TDecimal,TNum], TString, function(a,sf) {return a.toPrecision(sf); });
newBuiltin('siground',[TDecimal,TNum], TDecimal, function(a,sf) {return a.toSignificantDigits(sf); });
newBuiltin('formatnumber', [TDecimal,TString], TString, function(n,style) {return math.niceComplexDecimal(n,{style:style});});
newBuiltin('trunc',[TDecimal], TDecimal, function(a) {return a.re.trunc(); });
newBuiltin('fract',[TDecimal], TDecimal, function(a) {return a.re.minus(a.re.trunc()); });



newBuiltin('sum',[sig.listof(sig.type('number'))],TNum,math.sum,{unwrapValues: true});
newBuiltin('sum',[TVector],TNum,math.sum);
newBuiltin('prod',[sig.listof(sig.type('number'))],TNum,math.prod,{unwrapValues: true});
newBuiltin('prod',[TVector],TNum,math.prod);
newBuiltin('deal',[TNum],TList,
    function(n) {
        return math.deal(n).map(function(i) {
            return new TNum(i);
        });
    },
    {
        random:true
    }
);
newBuiltin('shuffle',[TList],TList,
    function(list) {
        return math.shuffle(list);
    },
    {
        random:true
    }
);
newBuiltin('reorder',[TList,sig.listof(sig.type('number'))],TList,function(list,order) {
    order = order.map(function(n) { return n.value; });
    return math.reorder(list,order);
});
newBuiltin('shuffle_together',[sig.listof(sig.type('list'))],TList,function(lists) {
    lists = lists.map(function(l) { return l.value; });
    lists = math.shuffle_together(lists);
    return lists.map(function(l) { return new TList(l); });
});
//if needs to be a bit different because it can return any type
newBuiltin('if', [TBool,'?','?'], '?',null, {
    evaluate: function(args,scope) {
        if(args.length!==3) {
            throw(new Numbas.Error("jme.typecheck.no right type definition",{op:'if'}));
        }
        var test = jme.evaluate(args[0],scope);
        if(jme.isType(test,'boolean')) {
            test = jme.castToType(test,'boolean').value;
        } else {
            // If the test can't be cast to a boolean, use JS's truthiness test on the value attribute.
            // Ideally this should throw an error, but I don't know if anything depends on this undocumented behaviour.
            test = test.value;  
        }
        if(test)
            return jme.evaluate(args[1],scope);
        else
            return jme.evaluate(args[2],scope);
    }
});
Numbas.jme.lazyOps.push('if');
newBuiltin('switch',[sig.multiple(sig.sequence(sig.type('boolean'),sig.anything())),'?'],'?', null, {
    evaluate: function(args,scope) {
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
    }
});
Numbas.jme.lazyOps.push('switch');
newBuiltin('isa',['?',TString],TBool, null, {
    evaluate: function(args,scope)
    {
        var tok = args[0].tok;
        var kind = jme.evaluate(args[1],scope).value;
        if(tok.type=='name') {
            var c = scope.getConstant(tok.name);
            if(c) {
                tok = c.value;
            }
        }
        if(tok.type=='name' && scope.getVariable(tok.name)==undefined ) {
            return new TBool(kind=='name');
        }
        var match = false;
        if(kind=='complex') {
            match = jme.isType(tok,'number') && tok.value.complex || false;
        } else {
            match = jme.isType(tok, kind);
        }
        return new TBool(match);
    }
});
Numbas.jme.lazyOps.push('isa');
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
    }
});
Numbas.jme.lazyOps.push('repeat');

/** Evaluate the given expressions until the list of conditions is satisfied.
 *
 * @param {Array.<string>} names - Names for each expression.
 * @param {Array.<Numbas.jme.tree>} definitions - Definition of each expression.
 * @param {Array.<Numbas.jme.tree>} conditions - Expressions in terms of the assigned names, which should evaluate to `true` if the values are acceptable.
 * @param {Numbas.jme.Scope} scope - The scope in which to evaluate everything.
 * @param {number} [maxRuns=100] - The maximum number of times to try to generate a set of values.
 * @returns {object.<Numbas.jme.token>} - A dictionary mapping names to their generated values.
 */
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
                variables[names[i]] = scope.evaluate(definitions[i]);
            }
            var nscope = new jme.Scope([scope,{variables:variables}]);
            satisfied = true;
            for(var i=0; i<conditions.length; i++) {
                var ok = nscope.evaluate(conditions[i]);
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
        var maxRuns = args.length>3 ? scope.evaluate(args[3]).value : 100;
        var variables = satisfy(names,definitions,conditions,scope,maxRuns);
        return new TList(names.map(function(name){ return variables[name]; }));
    }
});
Numbas.jme.lazyOps.push('satisfy');
jme.findvarsOps.satisfy = function(tree,boundvars,scope) {
    var names = tree.args[0].args.map(function(t){return t.tok.name});
    boundvars = boundvars.concat(0,0,names);
    var vars = [];
    for(var i=1;i<tree.args.length;i++)
        vars = vars.merge(jme.findvars(tree.args[i],boundvars,scope));
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
    }
});
newBuiltin('listval',[TList,TRange],TList, null, {
    evaluate: function(args,scope)
    {
        var range = args[1].value;
        var list = args[0];
        var size = list.vars;
        var start = util.wrapListIndex(range[0],size);
        var end = util.wrapListIndex(range[1],size);
        var step = range[2];
        var value;
        if(step!=1) {
            value = [];
            for(var i=start;i<end;i += step) {
                if(i%1==0) {
                    value.push(list.value[i]);
                }
            }
        } else {
            value = list.value.slice(start,end);
        }
        return new TList(value);
    }
});
newBuiltin('listval',[TVector,TNum],TNum, null, {
    evaluate: function(args,scope)
    {
        var vector = args[0].value;
        var index = util.wrapListIndex(args[1].value,vector.length);
        return new TNum(vector[index] || 0);
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
newBuiltin('flatten',['list of list'],TList,null, {
    evaluate: function(args,scope) {
        var o = [];
        args[0].value.forEach(function(l) {
            o = o.concat(l.value);
        });
        return new TList(o);
    }
});
newBuiltin('isset',[TName],TBool,null, {
    evaluate: function(args,scope) {
        var name = args[0].tok.name;
        return new TBool(name in scope.variables);
    }
});
Numbas.jme.lazyOps.push('isset');
jme.findvarsOps.isset = function(tree,boundvars,scope) {
    return boundvars;
}
jme.substituteTreeOps.isset = function(tree,scope,allowUnbound) {
    return tree;
}
/** Map the given expression, considered as a lambda, over the given list.
 *
 * @param {Numbas.jme.tree} lambda
 * @param {string|Array.<string>} names - Either the name to assign to the elements of the lists, or a list of names if each element is itself a list.
 * @param {Numbas.jme.types.TList} list - The list to map over.
 * @param {Numbas.jme.Scope} scope - The scope in which to evaluate.
 * @returns {Numbas.jme.types.TList}
 */
function mapOverList(lambda,names,list,scope) {
    var olist = list.map(function(v) {
        if(typeof(names)=='string') {
            scope.setVariable(names,v);
        } else {
            names.forEach(function(name,i) {
                scope.setVariable(name,v.value[i]);
            });
        }
        return scope.evaluate(lambda);
    });
    return new TList(olist);
}
/** Functions for 'map', by the type of the thing being mapped over.
 * Functions take a JME expression lambda, a name or list of names to map, a value to map over, and a scope to evaluate against.
 *
 * @memberof Numbas.jme
 * @name mapFunctions
 * @enum {Function}
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
            scope.setVariable(name,new TNum(n));
            var o = scope.evaluate(lambda);
            if(!jme.isType(o,'number')) {
                throw(new Numbas.Error("jme.map.matrix map returned non number"))
            }
            return jme.castToType(o,'number').value;
        }));
    },
    'vector': function(lambda,name,vector,scope) {
        return new TVector(vectormath.map(vector,function(n) {
            scope.setVariable(name,new TNum(n));
            var o = scope.evaluate(lambda);
            if(!jme.isType(o,'number')) {
                throw(new Numbas.Error("jme.map.vector map returned non number"))
            }
            return jme.castToType(o,'number').value;
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
    }
});
Numbas.jme.lazyOps.push('map');
jme.findvarsOps.map = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(jme.normaliseName(names[i].tok.name,scope));
        }
    } else {
        mapped_boundvars.push(jme.normaliseName(tree.args[1].tok.name,scope));
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars,scope));
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
        list = jme.castToType(list,'list').value;
        scope = new Scope(scope);
        var name = args[1].tok.name;
        var value = list.filter(function(v) {
            scope.setVariable(name,v);
            return jme.evaluate(lambda,scope).value;
        });
        return new TList(value);
    }
});
Numbas.jme.lazyOps.push('filter');
jme.findvarsOps.filter = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(jme.normaliseName(names[i].tok.name,scope));
        }
    } else {
        mapped_boundvars.push(jme.normaliseName(tree.args[1].tok.name,scope));
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.filter = function(tree,scope,allowUnbound) {
    tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
    return tree;
}

newBuiltin('iterate',['?',TName,'?',TNum],TList,null, {
    evaluate: function(args,scope) {
        var lambda = args[0];
        var value = jme.evaluate(args[2],scope);
        var times = Math.round(jme.castToType(jme.evaluate(args[3],scope), 'number').value);
        scope = new Scope(scope);
        var names_tok = args[1].tok;
        var names;
        if(names_tok.type=='name') {
            names = names_tok.name;
        } else {
            names = args[1].args.map(function(t){return t.tok.name;});
        }

        var out = [value];
        for(var i=0;i<times;i++) {
            if(typeof names=='string') {
                scope.setVariable(names,value);
            } else {
                var l = jme.castToType(value,'list');
                names.forEach(function(name,i) {
                    scope.setVariable(name,l.value[i]);
                });
            }
            value = scope.evaluate(lambda);
            out.push(value);
        }
        return new TList(out);
    }
});
Numbas.jme.lazyOps.push('iterate');
jme.findvarsOps.iterate = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(jme.normaliseName(names[i].tok.name,scope));
        }
    } else {
        mapped_boundvars.push(jme.normaliseName(tree.args[1].tok.name,scope));
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars,scope));
    vars = vars.merge(jme.findvars(tree.args[3],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.iterate = function(tree,scope,allowUnbound) {
    tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
    tree.args[3] = jme.substituteTree(tree.args[3],scope,allowUnbound);
    return tree;
}

newBuiltin('iterate_until',['?',TName,'?','?',sig.optional(sig.type('number'))],TList,null, {
    evaluate: function(args,scope) {
        var lambda = args[0];
        var value = jme.evaluate(args[2],scope);
        var condition = args[3];
        var max_iterations = args[4] ? jme.castToType(scope.evaluate(args[4]),'number').value : 100;
        scope = new Scope(scope);
        var names_tok = args[1].tok;
        var names;
        if(names_tok.type=='name') {
            names = names_tok.name;
        } else {
            names = args[1].args.map(function(t){return t.tok.name;});
        }

        var out = [value];
        for(var n=0;n<max_iterations;n++) {
            if(typeof names=='string') {
                scope.setVariable(names,value);
            } else {
                var l = jme.castToType(value,'list');
                names.forEach(function(name,i) {
                    scope.setVariable(name,l.value[i]);
                });
            }
            var stop = scope.evaluate(condition);
            if(!jme.isType(stop,'boolean')) {
                throw(new Numbas.Error('jme.iterate_until.condition produced non-boolean',{type: stop.type}));
            } else {
                stop = jme.castToType(stop,'boolean');
                if(stop.value) {
                    break;
                }
            }
            value = scope.evaluate(lambda);
            out.push(value);
        }
        return new TList(out);
    }
});
Numbas.jme.lazyOps.push('iterate_until');
jme.findvarsOps.iterate_until = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(jme.normaliseName(names[i].tok.name,scope));
        }
    } else {
        mapped_boundvars.push(jme.normaliseName(tree.args[1].tok.name,scope));
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars,scope));
    vars = vars.merge(jme.findvars(tree.args[3],mapped_boundvars,scope));
    if(tree.args[4]) {
        vars = vars.merge(jme.findvars(tree.args[4],boundvars,scope));
    }
    return vars;
}
jme.substituteTreeOps.iterate_until = function(tree,scope,allowUnbound) {
    tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
    return tree;
}

newBuiltin('foldl',['?',TName,TName,'?',TList],'?',null, {
    evaluate: function(args,scope) {
        var lambda = args[0];
        var first_value = jme.evaluate(args[3],scope);
        var list = jme.castToType(jme.evaluate(args[4],scope),'list').value;
        scope = new Scope(scope);
        var accumulator_name = args[1].tok.name;
        var names_tok = args[2].tok;
        var names;
        if(names_tok.type=='name') {
            names = names_tok.name;
        } else {
            names = args[2].args.map(function(t){return t.tok.name;});
        }

        var result = list.reduce(function(acc,value) {
            scope.setVariable(accumulator_name,acc);

            if(typeof names=='string') {
                scope.setVariable(names,value);
            } else {
                var l = jme.castToType(value,'list');
                names.forEach(function(name,i) {
                    scope.setVariable(name,l.value[i]);
                });
            }
            return scope.evaluate(lambda);
        },first_value)
        return result;
    }
});
Numbas.jme.lazyOps.push('foldl');
jme.findvarsOps.foldl = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    mapped_boundvars.push(tree.args[1].tok.name.toLowerCase());
    if(tree.args[2].tok.type=='list') {
        var names = tree.args[2].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        mapped_boundvars.push(tree.args[2].tok.name.toLowerCase());
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[3],boundvars,scope));
    vars = vars.merge(jme.findvars(tree.args[4],mapped_boundvars,scope));
    return vars;
}
jme.substituteTreeOps.foldl = function(tree,scope,allowUnbound) {
    tree.args[3] = jme.substituteTree(tree.args[3],scope,allowUnbound);
    tree.args[4] = jme.substituteTree(tree.args[4],scope,allowUnbound);
    return tree;
}


newBuiltin('take',[TNum,'?',TName,'?'],TList,null, {
    evaluate: function(args,scope) {
        var n = scope.evaluate(args[0]).value;
        var lambda = args[1];
        var list = scope.evaluate(args[3]);
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
        var name = args[2].tok.name;
        var value = [];
        for(var i=0;i<list.length && value.length<n;i++) {
            var v = list[i];
            scope.setVariable(name,v);
            var ok = scope.evaluate(lambda).value;
            if(ok) {
                value.push(v);
            }
        };
        return new TList(value);
    }
});
Numbas.jme.lazyOps.push('take');
jme.findvarsOps.take = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[2].tok.type=='list') {
        var names = tree.args[2].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(jme.normaliseName(names[i].tok.name,scope));
        }
    } else {
        mapped_boundvars.push(jme.normaliseName(tree.args[2].tok.name,scope));
    }
    var vars = jme.findvars(tree.args[1],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[0],boundvars,scope));
    vars = vars.merge(jme.findvars(tree.args[3],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.take = function(tree,scope,allowUnbound) {
    var args = tree.args.slice();
    args[0] = jme.substituteTree(args[0],scope,allowUnbound);
    args[3] = jme.substituteTree(args[3],scope,allowUnbound);
    return {tok:tree.tok, args: args};
}

newBuiltin('enumerate',[TList],TList,function(list) {
    return list.map(function(v,i) {
        return new TList([new TInt(i),v]);
    });
});


/** Is the given token the value `true`?
 *
 * @param {Numbas.jme.token} item
 * @returns {boolean}
 */
function tok_is_true(item){return item.type=='boolean' && item.value}
newBuiltin('all',[sig.listof(sig.type('boolean'))],TBool,function(list) {
    return list.every(tok_is_true);
});
newBuiltin('some',[sig.listof(sig.type('boolean'))],TBool,function(list) {
    return list.some(tok_is_true);
});

var let_sig_names = sig.multiple(
                    sig.or(
                        sig.sequence(sig.type('name'),sig.anything()),
                        sig.sequence(sig.listof(sig.type('name')),sig.anything())
                    )
                );
newBuiltin('let',[sig.or(sig.type('dict'), let_sig_names),'?'],TList, null, {
    evaluate: function(args,scope) {
        var signature = sig.or(sig.type('dict'), let_sig_names)(args.map(function(a){
            if(a.tok.type=='list' && a.args) {
                return new TList(a.args.map(function(aa){return aa.tok;}));
            } else {
                return a.tok
            }
        }));
        if(!signature) {
            throw(new Numbas.Error('jme.typecheck.no right type definition',{op:'let'}));
        }
        if(signature[0].type=="dict") {
            var d = scope.evaluate(args[0]);
            var variables = d.value;
            var lambda = args[1];
            var nscope = new Scope([scope,{variables:variables}]);
            return nscope.evaluate(lambda);
        } else {
            var lambda = args[args.length-1];
            var variables = {};
            var nscope = new Scope([scope]);
            for(var i=0;i<args.length-1;i+=2) {
                var value = nscope.evaluate(args[i+1]);
                if(args[i].tok.type=='name') {
                    var name = args[i].tok.name;
                    nscope.setVariable(name,value);
                } else if(args[i].tok.type=='list') {
                    var names = args[i].args.map(function(t){return t.tok.name});
                    var values = jme.castToType(value,'list').value;
                    for(var j=0;j<names.length;j++) {
                        nscope.setVariable(names[j],values[j]);
                    }
                }
            }
            return nscope.evaluate(lambda);
        }
    }
});
Numbas.jme.lazyOps.push('let');
jme.findvarsOps.let = function(tree,boundvars,scope) {
    var vars = [];
    boundvars = boundvars.slice();
    for(var i=0;i<tree.args.length-1;i+=2) {
        switch(tree.args[i].tok.type) {
            case 'name':
                boundvars.push(jme.normaliseName(tree.args[i].tok.name,scope));
                break;
            case 'list':
                boundvars = boundvars.concat(tree.args[i].args.map(function(t){return t.tok.name}));
                break;
            case 'dict':
                tree.args[i].args.forEach(function(kp) {
                    boundvars.push(kp.tok.key);
                    vars = vars.merge(jme.findvars(kp.args[0],boundvars,scope));
                });
                break;
        }
        vars = vars.merge(jme.findvars(tree.args[i+1],boundvars,scope));
    }
    // find variables used in the lambda expression, excluding the ones assigned by let
    vars = vars.merge(jme.findvars(tree.args[tree.args.length-1],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.let = function(tree,scope,allowUnbound) {
    var nscope = new Scope([scope]);
    if(tree.args[0].tok.type=='dict') {
        var d = tree.args[0];
        var names = d.args.map(function(da) { return da.tok.key; });
        for(var i=0;i<names.length;i++) {
            nscope.deleteVariable(names[i]);
        }
        d.args = d.args.map(function(da) { return jme.substituteTree(da,nscope,allowUnbound) });
    } else {
        for(var i=1;i<tree.args.length-1;i+=2) {
            switch(tree.args[i-1].tok.type) {
                case 'name':
                    var name = tree.args[i-1].tok.name;
                    nscope.deleteVariable(name);
                    break;
                case 'list':
                    var names = tree.args[i-1].args;
                    for(var j=0;j<names.length;j++) {
                        nscope.deleteVariable(names[j].tok.name);
                    }
                    break;
            }
            tree.args[i] = jme.substituteTree(tree.args[i],nscope,allowUnbound);
        }
    }
}

newBuiltin('unset',[TDict,'?'],'?',null,{
    evaluate: function(args,scope) {
        var defs = jme.unwrapValue(scope.evaluate(args[0]));
        var nscope = scope.unset(defs);
        return nscope.evaluate(args[1]);
    }
});
Numbas.jme.lazyOps.push('unset');

newBuiltin('sort',[TList],TList, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var newlist = new TList(list.vars);
        newlist.value = list.value.slice().sort(jme.compareTokens);
        return newlist;
    }
});
newBuiltin('sort_by',[TNum,sig.listof(sig.type('list'))],TList, null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        newlist.value = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        return newlist;
    }
});

newBuiltin('sort_by',[TString,sig.listof(sig.type('dict'))],TList, null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        newlist.value = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        return newlist;
    }
});

newBuiltin('sort_destinations',[TList],TList,null, {
    evaluate: function(args,scope) {
        var list = args[0];
        var newlist = new TList(list.vars);
        var sorted = list.value.map(function(v,i){ return {tok:v,i:i} }).sort(function(a,b){
            return jme.compareTokens(a.tok,b.tok);
        });
        var inverse = [];
        for(var i=0;i<sorted.length;i++) {
            inverse[sorted[i].i] = i;
        }
        newlist.value = inverse.map(function(n) {
            return new TNum(n);
        });
        return newlist;
    }
});

newBuiltin('group_by',[TNum,sig.listof(sig.type('list'))],TList,null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        var sorted = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        var out = [];
        for(var i=0;i<sorted.length;) {
            var key = sorted[i].value[index];
            var values = [sorted[i]];
            for(i++;i<sorted.length;i++) {
                if(jme.compareTokens(key,sorted[i].value[index])==0) {
                    values.push(sorted[i]);
                } else {
                    break;
                }
            }
            out.push(new TList([key,new TList(values)]));
        }
        return new TList(out);
    }
});

newBuiltin('group_by',[TString,sig.listof(sig.type('dict'))],TList,null, {
    evaluate: function(args,scope) {
        var index = args[0].value;
        var list = args[1];
        var newlist = new TList(list.vars);
        var sorted = list.value.slice().sort(jme.sortTokensBy(function(x){ return x.value[index]; }));
        var out = [];
        for(var i=0;i<sorted.length;) {
            var key = sorted[i].value[index];
            var values = [sorted[i]];
            for(i++;i<sorted.length;i++) {
                if(jme.compareTokens(key,sorted[i].value[index])==0) {
                    values.push(sorted[i]);
                } else {
                    break;
                }
            }
            out.push(new TList([key,new TList(values)]));
        }
        return new TList(out);
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
            if(util.eq(v,target,scope)) {
                out.push(new TNum(i));
            }
        });
        return new TList(out);
    }
});
newBuiltin('set',[TList],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(util.distinct(args[0].value,scope));
    }
});
newBuiltin('set',[TRange],TSet,null, {
    evaluate: function(args,scope) {
        var l = jme.castToType(args[0],'list');
        return new TSet(util.distinct(l.value,scope));
    }
});
newBuiltin('set', ['*?'], TSet, null, {
    evaluate: function(args,scope) {
        return new TSet(util.distinct(args,scope));
    }
});
newBuiltin('list',[TSet],TList,function(set) {
    var l = [];
    for(var i=0;i<set.length;i++) {
        l.push(set[i]);
    }
    return l;
});
newBuiltin('union',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.union(args[0].value,args[1].value,scope));
    }
});
newBuiltin('intersection',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.intersection(args[0].value,args[1].value,scope));
    }
});
newBuiltin('or',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.union(args[0].value,args[1].value,scope));
    }
});
newBuiltin('and',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.intersection(args[0].value,args[1].value,scope));
    }
});
newBuiltin('-',[TSet,TSet],TSet,null, {
    evaluate: function(args,scope) {
        return new TSet(setmath.minus(args[0].value,args[1].value,scope));
    }
});
newBuiltin('abs',[TSet],TNum, setmath.size);
newBuiltin('in',['?',TSet],TBool,null,{
    evaluate: function(args,scope) {
        return new TBool(util.contains(args[1].value,args[0],scope));
    }
});
newBuiltin('product',[sig.multiple(sig.type('list'))],TList,function() {
    var lists = Array.prototype.slice.call(arguments);
    var prod = util.product(lists);
    return prod.map(function(l){ return new TList(l); });
});

newBuiltin('product',[TList,TNum],TList,function(l,n) {
    return util.cartesian_power(l,n).map(function(sl){ return new TList(sl); });
});

newBuiltin('zip',[sig.multiple(sig.type('list'))],TList,function() {
    var lists = Array.prototype.slice.call(arguments);
    var zipped = util.zip(lists);
    return zipped.map(function(l){ return new TList(l); });
});
newBuiltin('combinations',[TList,TNum],TList,function(list,r) {
    var prod = util.combinations(list,r);
    return prod.map(function(l){ return new TList(l); });
});
newBuiltin('combinations_with_replacement',[TList,TNum],TList,function(list,r) {
    var prod = util.combinations_with_replacement(list,r);
    return prod.map(function(l){ return new TList(l); });
});
newBuiltin('permutations',[TList,TNum],TList,function(list,r) {
    var prod = util.permutations(list,r);
    return prod.map(function(l){ return new TList(l); });
});
newBuiltin('frequencies',[TList],[TList],null, {
    evaluate: function(args,scope) {
        var o = [];
        var l = args[0].value;
        l.forEach(function(x) {
            var p = o.find(function(item) {
                return util.eq(item[0],x);
            });
            if(p) {
                p[1] += 1;
            } else {
                o.push([x,1]);
            }
        });
        return new TList(o.map(function(p){ return new TList([p[0],new TNum(p[1])]); }));
    }
});
newBuiltin('vector',[sig.multiple(sig.type('number'))],TVector, null, {
    evaluate: function(args,scope)
    {
        var value = [];
        for(var i=0;i<args.length;i++)
        {
            value.push(args[i].value);
        }
        return new TVector(value);
    }
});
newBuiltin('vector',[sig.listof(sig.type('number'))],TVector, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var value = list.value.map(function(x){return x.value});
        return new TVector(value);
    }
});
newBuiltin('matrix',[sig.listof(sig.type('vector'))],TMatrix,null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var rows = list.vars;
        var columns = 0;
        var value = [];
        if(!list.value.length) {
            rows = 0;
            columns = 0;
        } else {
            value = list.value.map(function(v){return v.value});
            columns = list.value[0].value.length;
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('matrix',[sig.listof(sig.listof(sig.type('number')))],TMatrix,null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var rows = list.vars;
        var columns = 0;
        var value = [];
        if(!list.value.length) {
            rows = 0;
            columns = 0;
        } else {
            for(var i=0;i<rows;i++) {
                var row = list.value[i].value;
                value.push(row.map(function(x){return x.value}));
                columns = Math.max(columns,row.length);
            }
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('matrix',[sig.listof(sig.type('number'))],TMatrix,null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var rows = list.vars;
        var columns = 0;
        var value = [];
        if(!list.value.length) {
            rows = 0;
            columns = 0;
        } else {
            value = [list.value.map(function(e){return jme.castToType(e,'number').value})];
            rows = 1;
            columns = list.vars;
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
    }
});
newBuiltin('matrix',[sig.multiple(sig.listof(sig.type('number')))],TMatrix, null, {
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
    }
});
newBuiltin('rowvector',[sig.multiple(sig.type('number'))],TMatrix, null, {
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
    }
});
newBuiltin('rowvector',[sig.listof(sig.type('number'))],TMatrix, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var row = list.value.map(function(x){return x.value});
        var matrix = [row];
        matrix.rows = 1;
        matrix.columns = row.length;
        return new TMatrix(matrix);
    }
});
//cast vector to list
newBuiltin('list',[TVector],TList,null, {
    evaluate: function(args,scope)
    {
        var vector = args[0];
        var value = vector.value.map(function(n){ return new TNum(n)});
        return new TList(value);
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
    }
});

newBuiltin('diff',[TExpression,String],TExpression,null, {
    evaluate: function(args,scope) {
        var expr = scope.evaluate(args[0]).tree;
        var name = scope.evaluate(args[1]).value;
        var res = jme.calculus.differentiate(expr,name,scope);
        var ruleset = jme.collectRuleset('all',scope.allRulesets());
        var simplified = jme.display.simplifyTree(res,ruleset,scope);
        return new TExpression(simplified);
    }
});
Numbas.jme.lazyOps.push('diff');

/** Set the content of an HTML element to something corresponding to the value of the given token.
 * If the token is not of type HTML, use {@link jme.typeToDisplayString}.
 *
 * @param {Element} element
 * @param {Numbas.jme.token} tok
 * @param {Numbas.jme.Scope} scope
 */
function set_html_content(element,tok,scope) {
    if(tok.type!='html') {
        element.innerHTML = jme.tokenToDisplayString(tok,scope);
    } else {
        element.appendChild(tok.value);
    }
}
newBuiltin('table',[TList,TList],THTML, null, {
    evaluate: function(args, scope) {
        var data = args[0].value;
        var headers = args[1].value;
        var table = document.createElement('table');
        var thead = document.createElement('thead');
        table.appendChild(thead);
        for(var i=0;i<headers.length;i++) {
            var th = document.createElement('th');
            set_html_content(th,headers[i],scope);
            thead.appendChild(th);
        }
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for(var i=0;i<data.length;i++) {
            var row = document.createElement('tr');
            tbody.appendChild(row);
            for(var j=0;j<data[i].value.length;j++) {
                var cell = data[i].value[j];
                var td = document.createElement('td');
                set_html_content(td,data[i].value[j],scope);
                row.appendChild(td);
            }
        }
        return new THTML(table);
    }
});
newBuiltin('table',[TList],THTML, null, {
    evaluate: function(args,scope) {
        var data = args[0].value;
        var table = document.createElement('table');
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for(var i=0;i<data.length;i++) {
            var row = document.createElement('tr');
            tbody.appendChild(row);
            for(var j=0;j<data[i].value.length;j++) {
                var td = document.createElement('td');
                set_html_content(td,data[i].value[j],scope);
                row.appendChild(td);
            }
        }
        return new THTML(table);
    }
});

newBuiltin('max_width',[TNum,THTML],THTML,function(w,h) {
    h[0].style['max-width'] = w+'em';
    return h[0];
});

newBuiltin('max_height',[TNum,THTML],THTML,function(w,h) {
    h[0].style['max-height'] = w+'em';
    return h[0];
});

newBuiltin('parse',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('expand_juxtapositions',[TExpression,sig.optional(sig.type('dict'))],TExpression,null, {
    evaluate: function(args,scope) {
        var tree = args[0].tree;
        var options = args[1] ? jme.unwrapValue(args[1]) : undefined;
        return new TExpression(scope.expandJuxtapositions(tree,options));
    }
});
newBuiltin('expression',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('args',[TExpression],TList,null, {
    evaluate: function(args, scope) {
        if(!args[0].tree.args) {
            return new TList([]);
        }
        return new TList(args[0].tree.args.map(function(tree){ return new TExpression(tree); }));
    }
});
newBuiltin('as',['?',TString],'?',null, {
    evaluate: function(args,scope) {
        var target = args[1].value;
        return jme.castToType(args[0],target);
    }
});
newBuiltin('type',[TExpression],TString,null, {
    evaluate: function(args,scope) {
        return new TString(args[0].tree.tok.type);
    }
});
newBuiltin('type',['?'],TString,null, {
    evaluate: function(args,scope) {
        return new TString(args[0].type);
    }
});
newBuiltin('name',[TString],TName,function(name){ return name });
newBuiltin('string',[TName],TString,function(name){ return name });
newBuiltin('op',[TString],TOp,function(name){ return name });
newBuiltin('function',[TString],TFunc,function(name){ return name });
newBuiltin('assert',[TBool,'?'],'?',null,{
    evaluate: function(args, scope) {
        var result = scope.evaluate(args[0]).value;
        if(!result) {
            return scope.evaluate(args[1]);
        } else {
            return new TBool(false);
        }
    }
});
Numbas.jme.lazyOps.push('assert');
newBuiltin('try',['?',TName,'?'],'?',null, {
    evaluate: function(args, scope) {
        try {
            var res = scope.evaluate(args[0]);
            return res;
        } catch(e) {
            var variables = {};
            variables[args[1].tok.name] = e.message;
            return scope.evaluate(args[2],variables);
        }
    }
});
Numbas.jme.lazyOps.push('try');
jme.findvarsOps.try = function(tree,boundvars,scope) {
    var try_boundvars = boundvars.slice();
    try_boundvars.push(jme.normaliseName(tree.args[1].tok.name,scope));
    vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],try_boundvars,scope));
    return vars;
}
newBuiltin('exec',[sig.or(sig.type('function'),sig.type('op')),TList],TExpression,null, {
    evaluate: function(args, scope) {
        var tok;
        if(args[0].args) {
            tok = scope.evaluate(args[0]);
        } else {
            tok = args[0].tok;
        }
        var list = scope.evaluate(args[1]);
        var eargs = list.value.map(function(a) {
            if(a.type!='expression') {
                return {tok:a};
            } else {
                return a.tree;
            }
        });
        tok.vars = eargs.length;
        return new TExpression({tok: tok, args: eargs});
    }
});
Numbas.jme.lazyOps.push('exec');

newBuiltin('simplify',[TExpression,TString],TExpression,null, {
    evaluate: function(args, scope) {
        var tree = args[0].tree;
        var ruleset = jme.rules.collectRuleset(args[1].value,scope.allRulesets());
        return new TExpression(jme.display.simplifyTree(tree, ruleset, scope));
    }
});
newBuiltin('simplify',[TExpression,TList],TExpression,null, {
    evaluate: function(args, scope) {
        var tree = args[0].tree;
        var ruleset = jme.rules.collectRuleset(args[1].value.map(function(x){ return x.value}),scope.allRulesets());
        return new TExpression(jme.display.simplifyTree(tree, ruleset, scope));
    }
});
newBuiltin('simplify',[TString,TString],TExpression,null, {
    evaluate: function(args,scope) {
        return new TExpression(jme.display.simplify(args[0].value,args[1].value,scope));
    }
});
newBuiltin('string',[TExpression,'[string or list of string]'],TString,null, {
    evaluate: function(args,scope) {
        var flags = {};
        if(args[1]) {
            var rules = args[1].value;
            var ruleset = jme.collectRuleset(rules,scope.allRulesets());
            flags = ruleset.flags;
        }
        return new TString(jme.display.treeToJME(args[0].tree, flags, scope));
    }
});
newBuiltin('latex',[TExpression,'[string or list of string]'],TString,null, {
    evaluate: function(args,scope) {
        var expr = args[0];
        var flags = {};
        if(args[1]) {
            var rules = args[1].value;
            var ruleset = jme.collectRuleset(rules,scope.allRulesets());
            flags = ruleset.flags;
        }
        var tex = jme.display.texify(expr.tree,flags, scope);
        var s = new TString(tex);
        s.latex = true;
        s.display_latex = true;
        return s;
    }
});

newBuiltin('eval',[TExpression],'?',null,{
    evaluate: function(args,scope) {
        return scope.evaluate(args[0].tree);
    }
});
newBuiltin('eval',[TExpression, TDict],'?',null,{
    evaluate: function(args,scope) {
        return (new Numbas.jme.Scope([scope,{variables:args[1].value}])).evaluate(args[0].tree);
    }
});
newBuiltin('findvars',[TExpression],TList,null, {
    evaluate: function(args, scope) {
        var vars = jme.findvars(args[0].tree,[],scope);
        return new TList(vars.map(function(v){ return new TString(v) }));
    }
});
newBuiltin('definedvariables',[],TList,null, {
    evaluate: function(args, scope) {
        var vars = Object.keys(scope.allVariables());
        return new TList(vars.map(function(x){ return new TString(x) }));
    }
});
newBuiltin('resultsequal',['?','?',TString,TNum],TBool,null, {
    evaluate: function(args, scope) {
        var a = args[0];
        var b = args[1];
        var accuracy = args[3].value;
        var checkingFunction = jme.checkingFunctions[args[2].value.toLowerCase()];
        return new TBool(jme.resultsEqual(a,b,checkingFunction,accuracy,scope));
    }
});

newBuiltin('infer_variable_types',[TExpression],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0];
        var assignments = jme.inferVariableTypes(expr.tree,scope);
        if(!assignments) {
            assignments = {};
        }
        return jme.wrapValue(assignments);
    }
});

newBuiltin('infer_type',[TExpression],TString,null, {
    evaluate: function(args, scope) {
        var expr = args[0];
        return jme.wrapValue(jme.inferExpressionType(expr.tree,scope));
    }
});

newBuiltin('make_variables',[sig.dict(sig.type('expression')),sig.optional(sig.type('range'))],TDict,null, {
    evaluate: function(args,scope) {
        var todo = {};
        var scope = new jme.Scope([scope]);
        if(args.length>1) {
            scope.setVariable('vrange',args[1]);
        }
        for(var x in args[0].value) {
            scope.deleteVariable(x);
            var tree = args[0].value[x].tree;
            var vars = jme.findvars(tree,[],scope);
            todo[x] = {tree: args[0].value[x].tree, vars: vars};
        }
        var result = jme.variables.makeVariables(todo,scope);
        var out = {};
        for(var x in result.variables) {
            out[x] = result.variables[x];
        }
        return new TDict(out);
    }
});

/** Helper function for the JME `match` function.
 *
 * @param {Numbas.jme.tree} expr
 * @param {string} pattern
 * @param {string} options
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.token}
 * @see Numbas.jme.rules.Rule#match
 */
function match_subexpression(expr,pattern,options,scope) {
    var rule = new jme.rules.Rule(pattern, null, options);
    var match = rule.match(expr,scope);
    if(!match) {
        return jme.wrapValue({match: false, groups: {}});
    } else {
        var groups = {}
        for(var x in match) {
            if(x.slice(0,2)!='__') {
                groups[x] = new TExpression(match[x]);
            }
        }
        return jme.wrapValue({
            match: true,
            groups: groups
        });
    }
}

newBuiltin('match',[TExpression,TString],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = 'ac';
        return match_subexpression(expr,pattern,options,scope);
    }
});
newBuiltin('match',[TExpression,TString,TString],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = args[2].value;
        return match_subexpression(expr,pattern,options,scope);
    }
});

/** Helper function for the JME `matches` function.
 *
 * @param {Numbas.jme.tree} expr
 * @param {string} pattern
 * @param {string} options
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.token}
 * @see Numbas.jme.rules.Rule#match
 */
function matches_subexpression(expr,pattern,options,scope) {
    var rule = new jme.rules.Rule(pattern, null, options);
    var match = rule.match(expr,scope);
    return new TBool(match && true);
}

newBuiltin('matches',[TExpression,TString],TBool,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = 'ac';
        return matches_subexpression(expr,pattern,options,scope);
    }
});
newBuiltin('matches',[TExpression,TString,TString],TBool,null, {
    evaluate: function(args, scope) {
        var expr = args[0].tree;
        var pattern = args[1].value;
        var options = args[2].value;
        return matches_subexpression(expr,pattern,options,scope);
    }
});

/** Helper function for the JME `replace` function.
 *
 * @param {string} pattern
 * @param {string} repl
 * @param {Numbas.jme.tree} expr
 * @param {string} options
 * @param {Numbas.jme.Scope} scope
 * @returns {Numbas.jme.token}
 * @see Numbas.jme.rules.Rule#replaceAll
 */
function replace_expression(pattern,repl,expr,options,scope) {
        var rule = new jme.rules.Rule(pattern,repl,options);
        var out = rule.replaceAll(expr,scope).expression;
        return new TExpression(out);
}
newBuiltin('replace',[TString,TString,TExpression],TExpression,null,{
    evaluate: function(args, scope) {
        var pattern = args[0].value;
        var repl = args[1].value;
        var expr = args[2].tree;
        var options = 'acg';
        return replace_expression(pattern,repl,expr,options,scope);
    }
});
newBuiltin('replace',[TString,TString,TExpression,TString],TExpression,null,{
    evaluate: function(args, scope) {
        var pattern = args[0].value;
        var repl = args[1].value;
        var expr = args[2].tree;
        var options = args[3].value;
        return replace_expression(pattern,repl,expr,options,scope);
    }
});
newBuiltin('substitute',[TDict,TExpression],TExpression,null,{
    evaluate: function(args,scope) {
        var substitutions = args[0].value;
        for(var x in substitutions) {
            if(substitutions[x].type=='expression') {
                substitutions[x] = substitutions[x].tree;
            }
        }
        var expr = args[1].tree;
        scope = new Scope({variables: substitutions});
        var nexpr = jme.substituteTree(expr,scope,true,true);
        return new TExpression(nexpr);
    }
});

newBuiltin('canonical_compare',['?','?'],TNum,null, {
    evaluate: function(args,scope) {
        var cmp = jme.compareTrees(args[0],args[1]);
        return new TNum(cmp);
    }
});
jme.lazyOps.push('canonical_compare');

newBuiltin('numerical_compare',[TExpression,TExpression],TBool,null,{
    evaluate: function(args,scope) {
        var a = args[0].tree;
        var b = args[1].tree;
        return new TBool(jme.compare(a,b,{},scope));
    }
});

newBuiltin('scope_case_sensitive', ['?',TBool], '?', null, {
    evaluate: function(args,scope) {
        var caseSensitive = args.length>1 ? scope.evaluate(args[1]).value : true;
        var scope2 = new jme.Scope([scope,{caseSensitive: caseSensitive}]);
        return scope2.evaluate(args[0]);
    }
});
jme.lazyOps.push('scope_case_sensitive');

newBuiltin('translate',[TString],TString,function(s) {
    return R(s);
});
newBuiltin('translate',[TString,TDict],TString,function(s,params) {
    return R(s,params);
},{unwrapValues:true});
///end of builtins


});
