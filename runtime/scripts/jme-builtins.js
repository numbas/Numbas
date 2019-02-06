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
Numbas.queueScript('jme-builtins',['jme-base','jme-rules'],function(){
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
var TExpression = types.TExpression;
var TOp = Numbas.jme.types.TOp;
/** The built-in JME evaluation scope
 * @type {Numbas.jme.Scope}
 * @memberof Numbas.jme
 */
var builtinScope = jme.builtinScope = new Scope({rulesets:jme.rules.simplificationRules});
builtinScope.setVariable('nothing',new types.TNothing);
var funcs = {};

/** Add a function to the built-in scope.
 * @see Numbas.jme.builtinScope
 * @param {String} name
 * @param {Array.<Function|String>} intype - A list of data type constructors for the function's paramters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type. If `null`, then `options.typecheck` is used.
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
newBuiltin('in',[TString, TString], TBool, function(sub,str) {
    return str.indexOf(sub)>=0;
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
newBuiltin('lpad',[TString,TNum,TString],TString,util.lpad);
newBuiltin('formatstring',[TString,TList],TString,function(str,extra) {
    return util.formatString.apply(util,[str].concat(extra));
},{unwrapValues:true});
newBuiltin('unpercent',[TString],TNum,util.unPercent);
newBuiltin('letterordinal',[TNum],TString,util.letterOrdinal);
newBuiltin('html',[TString],THTML,function(html) { return $(html) });
newBuiltin('nonemptyhtml',[TString],TBool,function(html) {
    return util.isNonemptyHTML(html);
});
newBuiltin('image',[TString],THTML,function(url){ return $('<img/>').attr('src',url); });
newBuiltin('latex',[TString],TString,null,{
    evaluate: function(args,scope) {
        var s = new TString(args[0].value);
        s.latex = true;
        return s;
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
Numbas.jme.lazyOps.push('safe');
jme.findvarsOps.safe = function(tree,boundvars,scope) {
    return [];
}
newBuiltin('render',[TString,TDict],TString, null, {
    evaluate: function(args,scope) {
        var str = args[0].value;
        var variables = args[1].value;
        scope = new Scope([scope,{variables: variables}]);
        return new TString(jme.contentsubvars(str,scope,true));
    },
    typecheck: function(variables) {
        return variables[0].type=='string' && (variables.length==1 || variables[1].type=='dict');
    }
});
newBuiltin('capitalise',[TString],TString,function(s) { return util.capitalise(s); });
newBuiltin('upper',[TString],TString,function(s) { return s.toUpperCase(); });
newBuiltin('lower',[TString],TString,function(s) { return s.toLowerCase(); });
newBuiltin('pluralise',[TNum,TString,TString],TString,function(n,singular,plural) { return util.pluralise(n,singular,plural); });
newBuiltin('join',[TList,TString],TString,function(list,delimiter) {
    return list.map(jme.tokenToDisplayString).join(delimiter);
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
    var re = new RegExp(pattern);
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});
newBuiltin('match_regex',[TString,TString,TString],TList,function(pattern,str,flags) {
    var re = new RegExp(pattern,flags);
    var m = re.exec(str);
    return m || [];
},{unwrapValues: true});
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
    }
);
newBuiltin('except', [TRange,TList], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        range = math.rangeToList(range)
        except = except.map(function(i){ return i.value; });
        return math.except(range,except).map(function(i){return new TNum(i)});
    }
);
newBuiltin('except', [TRange,TNum], TList,
    function(range,except) {
        if(range[2]==0) {
            throw(new Numbas.Error("jme.func.except.continuous range"));
        }
        range = math.rangeToList(range);
        return math.except(range,[except]).map(function(i){return new TNum(i)});
    }
);
//exclude numbers from a list, so use the math.except function
newBuiltin('except', [TList,TRange], TList,
    function(range,except) {
        range = range.map(function(i){ return i.value; });
        except = math.rangeToList(except);
        return math.except(range,except).map(function(i){return new TNum(i)});
    }
);
//exclude values of any type from a list containing values of any type, so use the util.except function
newBuiltin('except', [TList,TList], TList,
    function(list,except) {
        return util.except(list,except);
    }
);
newBuiltin('except',[TList,'?'], TList, null, {
    evaluate: function(args,scope) {
        return new TList(util.except(args[0].value,[args[1]]));
    }
});
newBuiltin('distinct',[TList],TList, util.distinct,{unwrapValues: false});
newBuiltin('in',['?',TList],TBool,null,{
    evaluate: function(args,scope) {
        return new TBool(util.contains(args[1].value,args[0]));
    }
});
newBuiltin('<', [TNum,TNum], TBool, math.lt);
newBuiltin('>', [TNum,TNum], TBool, math.gt );
newBuiltin('<=', [TNum,TNum], TBool, math.leq );
newBuiltin('>=', [TNum,TNum], TBool, math.geq );
newBuiltin('<>', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.neq(args[0],args[1]));
    }
});
newBuiltin('=', ['?','?'], TBool, null, {
    evaluate: function(args,scope) {
        return new TBool(util.eq(args[0],args[1]));
    }
});
newBuiltin('isclose', [TNum,TNum,TNum,TNum], TBool, math.isclose);
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
newBuiltin('ceil', [TNum], TNum, math.ceil );
newBuiltin('floor', [TNum], TNum, math.floor );
newBuiltin('round', [TNum], TNum, math.round );
newBuiltin('trunc', [TNum], TNum, math.trunc );
newBuiltin('fract', [TNum], TNum, math.fract );
newBuiltin('degrees', [TNum], TNum, math.degrees );
newBuiltin('radians', [TNum], TNum, math.radians );
newBuiltin('sign', [TNum], TNum, math.sign );
newBuiltin('rational_approximation',[TNum],TList,function(n) {
    return math.rationalApproximation(n);
},{unwrapValues:true});
newBuiltin('rational_approximation',[TNum,TNum],TList,function(n,accuracy) {
    return math.rationalApproximation(n,accuracy);
},{unwrapValues:true});
newBuiltin('factorise',[TNum],TList,function(n) {
        return math.factorise(n).map(function(n){return new TNum(n)});
    }
);
newBuiltin('random', [TRange], TNum, math.random, {random:true} );
newBuiltin('random',[TList],'?',null, {
    random:true,
    evaluate: function(args,scope)
    {
        return math.choose(args[0].value);
    }
});
newBuiltin( 'random',[],'?', null, {
    random:true,
    typecheck: function() { return true; },
    evaluate: function(args,scope) { return math.choose(args);}
});
newBuiltin('mod', [TNum,TNum], TNum, math.mod );
newBuiltin('max', [TNum,TNum], TNum, math.max );
newBuiltin('min', [TNum,TNum], TNum, math.min );
newBuiltin('max', [TList], TNum, math.listmax, {unwrapValues: true});
newBuiltin('min', [TList], TNum, math.listmin, {unwrapValues: true});
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
newBuiltin('parsenumber', [TString,TList], TNum, function(s,styles) {return util.parseNumber(s,false,styles,true);}, {unwrapValues: true});
newBuiltin('parsenumber_or_fraction', [TString,TString], TNum, function(s,style) {return util.parseNumber(s,true,style,true);});
newBuiltin('parsenumber_or_fraction', [TString,TList], TNum, function(s,styles) {return util.parseNumber(s,true,styles,true);}, {unwrapValues: true});
newBuiltin('togivenprecision', [TString,TString,TNum,TBool], TBool, math.toGivenPrecision);
newBuiltin('withintolerance',[TNum,TNum,TNum],TBool, math.withinTolerance);
newBuiltin('countdp',[TString],TNum, function(s) { return math.countDP(util.cleanNumber(s)); });
newBuiltin('countsigfigs',[TString],TNum, function(s) { return math.countSigFigs(util.cleanNumber(s)); });
newBuiltin('isnan',[TNum],TBool,function(n) {
    return isNaN(n);
});
newBuiltin('matchnumber',[TString,TList],TList,function(s,styles) {
    var result = util.matchNotationStyle(s,styles,true);
    return [new TString(result.matched), new TNum(util.parseNumber(result.cleaned,false,['plain'],true))];
},{unwrapValues:true});
newBuiltin('cleannumber',[TString,TList],TString,util.cleanNumber,{unwrapValues:true});
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
newBuiltin('lcm', [TNum,TNum], TNum, math.lcm );
newBuiltin('lcm', [TList], TNum, function(l){
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
newBuiltin('sum',[TList],TNum,math.sum,{unwrapValues: true});
newBuiltin('sum',[TVector],TNum,math.sum);
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
newBuiltin('shuffle',[TRange],TList,
    function(range) {
        var list = math.rangeToList(range).map(function(n){return new TNum(n)})
        return math.shuffle(list);
    },
    {
        random:true
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
    }
});
Numbas.jme.lazyOps.push('if');
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
    }
});
Numbas.jme.lazyOps.push('switch');
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

/** Evaluate the given expressions until the list of conditions is satisfied
 * @param {Array.<String>} names - names for each expression
 * @param {Array.<Numbas.jme.tree>} definitions - definition of each expression
 * @param {Array.<Numbas.jme.tree>} conditions - expressions in terms of the assigned names, which should evaluate to `true` if the values are acceptable.
 * @param {Numbas.jme.Scope} scope - the scope in which to evaluate everything
 * @param {Number} [maxRuns=100] - the maximum number of times to try to generate a set of values
 * @returns {Object.<Numbas.jme.token>} - a dictionary mapping names to their generated values.
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
newBuiltin('isset',[TName],TBool,null, {
    evaluate: function(args,scope) {
        var name = args[0].tok.name;
        return new TBool(name in scope.variables);
    }
});
Numbas.jme.lazyOps.push('isset');
jme.findvarsOps.isset = function(tree,boundvars,scope) {
    boundvars = boundvars.slice();
    boundvars.push(tree.args[1].tok.name.toLowerCase());
    var vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars));
    return vars;
}
jme.substituteTreeOps.isset = function(tree,scope,allowUnbound) {
    return tree;
}
/** Map the given expression, considered as a lambda, over the given list.
 * @param {Numbas.jme.tree} lambda
 * @param {String|Array.<String>} names - either the name to assign to the elements of the lists, or a list of names if each element is itself a list.
 * @param {Numbas.jme.types.TList} list - the list to map over.
 * @param {Numbas.jme.Scope} scope - the scope in which to evaluate
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
 * @memberof Numbas.jme
 * @name mapFunctions
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
            scope.setVariable(name,new TNum(n));
            var o = scope.evaluate(lambda);
            if(o.type!='number') {
                throw(new Numbas.Error("jme.map.matrix map returned non number"))
            }
            return o.value;
        }));
    },
    'vector': function(lambda,name,vector,scope) {
        return new TVector(vectormath.map(vector,function(n) {
            scope.setVariable(name,new TNum(n));
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
    }
});
Numbas.jme.lazyOps.push('map');
jme.findvarsOps.map = function(tree,boundvars,scope) {
    var mapped_boundvars = boundvars.slice();
    if(tree.args[1].tok.type=='list') {
        var names = tree.args[1].args;
        for(var i=0;i<names.length;i++) {
            mapped_boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        mapped_boundvars.push(tree.args[1].tok.name.toLowerCase());
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
            mapped_boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        mapped_boundvars.push(tree.args[1].tok.name.toLowerCase());
    }
    var vars = jme.findvars(tree.args[0],mapped_boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],boundvars,scope));
    return vars;
}
jme.substituteTreeOps.filter = function(tree,scope,allowUnbound) {
    tree.args[2] = jme.substituteTree(tree.args[2],scope,allowUnbound);
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
            mapped_boundvars.push(names[i].tok.name.toLowerCase());
        }
    } else {
        mapped_boundvars.push(tree.args[2].tok.name.toLowerCase());
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



/** Is the given token the value `true`?
 * @param {Numbas.jme.token} item
 * @returns {Boolean}
 */
function tok_is_true(item){return item.type=='boolean' && item.value}
newBuiltin('all',[TList],TBool,function(list) {
    return list.every(tok_is_true);
});
newBuiltin('some',[TList],TBool,function(list) {
    return list.some(tok_is_true);
});
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
Numbas.jme.lazyOps.push('let');
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
    for(var i=0;i<set.length;i++) {
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

newBuiltin('product',[TList,TNum],TList,function(l,n) {
    return util.cartesian_power(l,n).map(function(sl){ return new TList(sl); });
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
    }
});
newBuiltin('vector',[TList],TVector, null, {
    evaluate: function(args,scope)
    {
        var list = args[0];
        var value = list.value.map(function(x){return x.value});
        return new TVector(value);
    }
});
newBuiltin('matrix',[TList],TMatrix,null, {
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
        }
        value.rows = rows;
        value.columns = columns;
        return new TMatrix(value);
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
        unwrapValues: true
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
        unwrapValues: true
    }
);
newBuiltin('parse',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('expression',[TString],TExpression,function(str) {
    return jme.compile(str);
});
newBuiltin('args',[TExpression],TList,null, {
    evaluate: function(args, scope) {
        return new TList(args[0].tree.args.map(function(tree){ return new TExpression(tree); }));
    }
});
newBuiltin('type',[TExpression],TString,null, {
    evaluate: function(args,scope) {
        return new TString(args[0].tree.tok.type);
    }
});
newBuiltin('name',[TString],TName,function(name){ return name });
newBuiltin('string',[TName],TString,function(name){ return name });
newBuiltin('op',[TString],TOp,function(name){ return name });
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
    try_boundvars.push(tree.args[1].tok.name.toLowerCase());
    vars = jme.findvars(tree.args[0],boundvars,scope);
    vars = vars.merge(jme.findvars(tree.args[2],try_boundvars,scope));
    return vars;
}
newBuiltin('exec',[TOp,TList],TExpression,null, {
    evaluate: function(args, scope) {
        var tok = args[0];
        var eargs = args[1].value.map(function(a) {
            if(a.type!='expression') {
                return {tok:a};
            } else {
                return a.tree;
            }
        });
        return new TExpression({tok: tok, args: eargs});
    }
});
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
newBuiltin('string',[TExpression],TString,null, {
    evaluate: function(args,scope) {
        return new TString(jme.display.treeToJME(args[0].tree));
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
        return new TBool(jme.resultsEqual(a,b,checkingFunction,accuracy));
    }
});

newBuiltin('infer_variable_types',[TExpression],TDict,null, {
    evaluate: function(args, scope) {
        var expr = args[0];
        var assignments = jme.inferVariableTypes(expr.tree,scope);
        return jme.wrapValue(assignments);
    }
});

newBuiltin('make_variables',[TDict],TDict,null, {
    evaluate: function(args,scope) {
        var todo = {};
        var scope = new jme.Scope([scope]);
        for(var x in args[0].value) {
            scope.deleteVariable(x);
            var tree = args[0].value[x].tree;
            var vars = jme.findvars(tree);
            todo[x] = {tree: args[0].value[x].tree, vars: vars};
        }
        var result = jme.variables.makeVariables(todo,scope);
        var out = {};
        for(var x in result.variables) {
            out[x] = result.variables[x];
        }
        return new TDict(out);
    },
    typecheck: function(variables) {
        if(variables.length!=1) {
            return false;
        }
        var d = variables[0];
        for(var x in d.value) {
            if(d.value[x].type!='expression') {
                return false;
            }
        }
        return true;
    }
});

/** Helper function for the JME `match` function
 * @param {Numbas.jme.tree} expr
 * @param {String} pattern
 * @param {String} options
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

/** Helper function for the JME `matches` function
 * @param {Numbas.jme.tree} expr
 * @param {String} pattern
 * @param {String} options
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

/** Helper function for the JME `replace` function
 * @param {String} pattern
 * @param {String} repl
 * @param {Numbas.jme.tree} expr
 * @param {String} options
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

newBuiltin('translate',[TString],TString,function(s) {
    return R(s);
});
newBuiltin('translate',[TString,TDict],TString,function(s,params) {
    return R(s,params);
},{unwrapValues:true});
///end of builtins
});
