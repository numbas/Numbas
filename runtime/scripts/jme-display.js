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
Numbas.queueScript('jme-display',['base','math','jme','util','jme-rules'],function() {
var math = Numbas.math;
var jme = Numbas.jme;
var util = Numbas.util;

/** A LaTeX string
 * @typedef TeX
 * @type {String}
 */

/** @namespace Numbas.jme.display */
jme.display = /** @lends Numbas.jme.display */ {
    /** Convert a JME expression to LaTeX.
     *
     * @param {JME} expr
     * @param {Array.<String>|Numbas.jme.rules.Ruleset} ruleset - can be anything accepted by {@link Numbas.jme.display.collectRuleset}
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.Parser} [parser=Numbas.jme.standardParser]
     * @returns {TeX}
     */
    exprToLaTeX: function(expr,ruleset,scope,parser)
    {
        if(!ruleset)
            ruleset = jme.rules.simplificationRules.basic;
        ruleset = jme.collectRuleset(ruleset,scope.allRulesets());
        expr+='';    //make sure expr is a string
        if(!expr.trim().length)    //if expr is the empty string, don't bother going through the whole compilation proces
            return '';
        var tree = jme.display.simplify(expr,ruleset,scope,parser); //compile the expression to a tree and simplify it
        var tex = texify(tree,ruleset.flags); //render the tree as TeX
        return tex;
    },
    /** Simplify a JME expression string according to the given ruleset and return it as a JME string
     *
     * @param {JME} expr
     * @param {Array.<String>|Numbas.jme.rules.Ruleset} ruleset - can be anything accepted by {@link Numbas.jme.display.collectRuleset}
     * @param {Numbas.jme.Scope} scope
     * @returns {JME}
     *
     * @see Numbas.jme.display.simplify
     */
    simplifyExpression: function(expr,ruleset,scope)
    {
        if(expr.trim()=='')
            return '';
        var simplifiedTree = jme.display.simplify(expr,ruleset,scope);
        return treeToJME(simplifiedTree,ruleset.flags);
    },
    /** Simplify a JME expression string according to given ruleset and return it as a syntax tree
     *
     * @param {JME} expr
     * @param {Array.<String>|Numbas.jme.rules.Ruleset} ruleset
     * @param {Numbas.jme.Scope} scope
     * @param {Numbas.jme.Parser} [parser=Numbas.jme.standardParser]
     * @returns {Numbas.jme.tree}
     *
     * @see Numbas.jme.display.simplifyExpression
     * @see Numbas.jme.display.simplifyTree
     */
    simplify: function(expr,ruleset,scope,parser)
    {
        if(expr.trim()=='')
            return;
        if(!ruleset)
            ruleset = jme.rules.simplificationRules.basic;
        ruleset = jme.collectRuleset(ruleset,scope.allRulesets());        //collect the ruleset - replace set names with the appropriate Rule objects
        parser = parser || Numbas.jme.standardParser;
        try {
            var exprTree = parser.compile(expr,{},true);    //compile the expression to a tree. notypecheck is true, so undefined function names can be used.
            return jme.display.simplifyTree(exprTree,ruleset,scope);    // simplify the tree
        }
        catch(e)
        {
            //e.message += '\nSimplifying expression failed. Expression was: '+expr;
            throw(e);
        }
    },
    /** Simplify a syntax tree according to the given ruleset
     *
     * @see Numbas.jme.rules.Ruleset#simplify
     * @param {Numbas.jme.tree} exprTree
     * @param {Numbas.jme.rules.Ruleset} ruleset
     * @param {Numbas.jme.Scope} scope
     * @param {Boolean} allowUnbound
     * @returns {Numbas.jme.tree}
     *
     * @see Numbas.jme.display.simplify
     */
    simplifyTree: function(exprTree,ruleset,scope,allowUnbound) {
        return ruleset.simplify(exprTree,scope);
    }
};

/** Would texify put brackets around a given argument of an operator?
 * @param {Numbas.jme.tree} thing
 * @param {Number} i - the index of the argument
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {Boolean}
 */
function texifyWouldBracketOpArg(thing,i, settings) {
    settings = settings || {};
    var tok = thing.args[i].tok;
    var precedence = jme.precedence;
    if(tok.type=='op') {    //if this is an op applied to an op, might need to bracket
        if(thing.args.length==1) {
            return thing.args[0].tok.type=='op' && thing.args[0].args.length>1;
        }
        var op1 = thing.args[i].tok.name;    //child op
        var op2 = thing.tok.name;            //parent op
        var p1 = precedence[op1];    //precedence of child op
        var p2 = precedence[op2];    //precedence of parent op
        //if leaving out brackets would cause child op to be evaluated after parent op, or precedences the same and parent op not commutative, or child op is negation and parent is exponentiation
        return ( p1 > p2 || (p1==p2 && i>0 && !jme.commutative[op2]) || (op1=='-u' && precedence[op2]<=precedence['*']) )
    }
    //complex numbers might need brackets round them when multiplied with something else or unary minusing
    else if(tok.type=='number' && tok.value.complex && thing.tok.type=='op' && (thing.tok.name=='*' || thing.tok.name=='-u' || i==0 && thing.tok.name=='^') ) {
        var v = thing.args[i].tok.value;
        return !(v.re==0 || v.im==0);
    } else if(jme.isOp(thing.tok, '^') && settings.fractionnumbers && tok.type=='number' && texSpecialNumber(tok.value)===undefined && math.rationalApproximation(Math.abs(tok.value))[1] != 1) {
        return true;
    }
    return false;
}
/** Apply brackets to an op argument if appropriate
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Numbas.jme.tree} thing
 * @param {Array.<String>} texArgs - the arguments of `thing`, as TeX
 * @param {Number} i - the index of the argument to bracket
 * @returns {TeX}
 */
function texifyOpArg(thing,texArgs,i)
{
    var tex = texArgs[i];
    if(texifyWouldBracketOpArg(thing,i)) {
        tex = '\\left ( '+tex+' \\right )';
    }
    return tex;
}
/** Helper function for texing infix operators
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the operator
 * @returns {Function} - a function which will convert a syntax tree with the operator at the top to TeX, by putting `code` in between the TeX of the two arguments.
 */
function infixTex(code)
{
    return function(thing,texArgs)
    {
        var arity = thing.args.length;
        if( arity == 1 )    //if operation is unary, prepend argument with code
        {
            var arg = texifyOpArg(thing,texArgs,0);
            return thing.tok.postfix ? arg+code : code+arg;
        }
        else if ( arity == 2 )    //if operation is binary, put code in between arguments
        {
            return texifyOpArg(thing,texArgs,0)+' '+code+' '+texifyOpArg(thing,texArgs,1);
        }
    }
}
/** Helper for texing nullary functions
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - the TeX command for the function
 * @returns {Function} - a function which returns the appropriate (constant) TeX code
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
 * @returns {Function} - a function which converts a syntax tree to the appropriate TeX
 */
function funcTex(code)
{
    var f = function(thing,texArgs){
        return code+' \\left ( '+texArgs.join(', ')+' \\right )';
    }
    f.code = code;
    return f;
}

/** TeX the name of a pattern-matching operator
 * @param {TeX} code
 * @returns {TeX}
 */
function patternName(code) {
    return '\\operatorname{\\color{grey}{'+code+'}}';
}

/** Define how to texify each operation and function
 * @enum {function}
 * @memberof Numbas.jme.display
 */
var texOps = jme.display.texOps = {
    '#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),
    'not': infixTex('\\neg '),
    '+u': function(thing,texArgs,settings) {
        var tex = texArgs[0];
        if( thing.args[0].tok.type=='op' ) {
            var op = thing.args[0].tok.name;
            if( op=='-u' || op=='+u' ) {
                tex='\\left ( '+tex+' \\right )';
            }
        }
        return '+'+tex;
    },
    '-u': (function(thing,texArgs,settings) {
        var tex = texArgs[0];
        if( thing.args[0].tok.type=='op' )
        {
            var op = thing.args[0].tok.name;
            if(
                op=='-u' || op=='+u' ||
                (!(op=='/' || op=='*') && jme.precedence[op]>jme.precedence['-u'])    //brackets are needed if argument is an operation which would be evaluated after negation
            ) {
                tex='\\left ( '+tex+' \\right )';
            }
        }
        else if(thing.args[0].tok.type=='number' && thing.args[0].tok.value.complex) {
            var value = thing.args[0].tok.value;
            return settings.texNumber({complex:true,re:-value.re,im:-value.im}, settings);
        }
        return '-'+tex;
    }),
    '^': (function(thing,texArgs,settings) {
        var tex0 = texArgs[0];
        //if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
        if(thing.args[0].tok.type=='op' || (thing.args[0].tok.type=='function' && thing.args[0].tok.name=='exp') || texifyWouldBracketOpArg(thing, 0, settings)) {
            tex0 = '\\left ( ' +tex0+' \\right )';
        }
        var trigFunctions = ['cos','sin','tan','sec','cosec','cot','arcsin','arccos','arctan','cosh','sinh','tanh','cosech','sech','coth','arccosh','arcsinh','arctanh'];
        if(thing.args[0].tok.type=='function' && trigFunctions.contains(thing.args[0].tok.name) && thing.args[1].tok.type=='number' && util.isInt(thing.args[1].tok.value) && thing.args[1].tok.value>0) {
            return texOps[thing.args[0].tok.name].code + '^{'+texArgs[1]+'}' + '\\left( '+texify(thing.args[0].args[0],settings)+' \\right)';
        }
        return (tex0+'^{ '+texArgs[1]+' }');
    }),
    '*': (function(thing, texArgs, settings) {
        var s = texifyOpArg(thing,texArgs,0);
        for(var i=1; i<thing.args.length; i++ )
        {
            var left = thing.args[i-1];
            var right = thing.args[i];
            var use_symbol = false;
            if(settings.alwaystimes) {
                use_symbol = true;
            } else {
                // if we'd end up with two digits next to each other, but from different arguments, we need a times symbol
                if(util.isInt(texArgs[i-1].charAt(texArgs[i-1].length-1)) && util.isInt(texArgs[i].charAt(0)) && !texifyWouldBracketOpArg(thing,i)) {
                    use_symbol = true;
                //anything times e^(something) or (not number)^(something)
                } else if (jme.isOp(right.tok,'^') && (right.args[0].value==Math.E || right.args[0].tok.type!='number')) {
                    use_symbol = false;
                //real number times Pi or E
                } else if (right.tok.type=='number' && (right.tok.value==Math.PI || right.tok.value==Math.E || right.tok.value.complex) && left.tok.type=='number' && !(left.tok.value.complex)) {
                    use_symbol = false
                //number times a power of i
                } else if (jme.isOp(right.tok,'^') && right.args[0].tok.type=='number' && math.eq(right.args[0].tok.value,math.complex(0,1)) && left.tok.type=='number') {
                    use_symbol = false;
                // times sign when LHS or RHS is a factorial
                } else if((left.tok.type=='function' && left.tok.name=='fact') || (right.tok.type=='function' && right.tok.name=='fact')) {
                    use_symbol = true;
                //(anything except i) times i
                } else if ( !(left.tok.type=='number' && math.eq(left.tok.value,math.complex(0,1))) && right.tok.type=='number' && math.eq(right.tok.value,math.complex(0,1))) {
                    use_symbol = false;
                // anything times number, or (-anything), or an op with lower precedence than times, with leftmost arg a number
                } else if ( right.tok.type=='number'
                        ||
                            jme.isOp(right.tok,'-u')
                        ||
                        (
                            !jme.isOp(right.tok,'-u')
                            && (right.tok.type=='op' && jme.precedence[right.tok.name]<=jme.precedence['*']
                                && (right.args[0].tok.type=='number'
                                && right.args[0].tok.value!=Math.E)
                            )
                        )
                ) {
                    use_symbol = true;
                }
            }
            s += use_symbol ? ' \\times ' : ' ';
            s += texifyOpArg(thing,texArgs,i);
        }
        return s;
    }),
    '/': (function(thing,texArgs) { return ('\\frac{ '+texArgs[0]+' }{ '+texArgs[1]+' }'); }),
    '+': (function(thing,texArgs,settings) {
        var a = thing.args[0];
        var b = thing.args[1];
        if(jme.isOp(b.tok,'+u') || jme.isOp(b.tok,'-u')) {
            return texArgs[0]+' + \\left ( '+texArgs[1]+' \\right )';
        } else {
            return texArgs[0]+' + '+texArgs[1];
        }
    }),
    '-': (function(thing,texArgs,settings) {
        var a = thing.args[0];
        var b = thing.args[1];
        if(b.tok.type=='number' && b.tok.value.complex && b.tok.value.re!=0) {
            var texb = settings.texNumber(math.complex(b.tok.value.re,-b.tok.value.im), settings);
            return texArgs[0]+' - '+texb;
        }
        else{
            if(jme.isOp(b.tok,'+') || jme.isOp(b.tok,'-') || jme.isOp(b.tok,'+u') || jme.isOp(b.tok,'-u'))
                return texArgs[0]+' - \\left ( '+texArgs[1]+' \\right )';
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
    '<>': infixTex('\\neq'),
    '=': infixTex('='),
    'and': infixTex('\\wedge'),
    'or': infixTex('\\vee'),
    'xor': infixTex('\\, \\textrm{XOR} \\,'),
    'implies': infixTex('\\to'),
    'in': infixTex('\\in'),
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
                    return '\\left ('+texArgs[0]+' \\right )!';
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
    'sub': (function(thing,texArgs) {
        return texArgs[0]+'_{ '+texArgs[1]+' }';
    }),
    'sup': (function(thing,texArgs) {
        return texArgs[0]+'^{ '+texArgs[1]+' }';
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
            return '\\ln \\left ( '+texArgs[0]+' \\right )';
    },
    'log': function(thing,texArgs,settings) {
        var base = thing.args.length==1 ? '10' : texArgs[1];
        return '\\log_{'+base+'} \\left ( '+texArgs[0]+' \\right )';
    },
    'vector': (function(thing,texArgs,settings) {
        return '\\left ( '+texVector(thing,settings)+' \\right )';
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
    },
    '`+-': infixTex(patternName('\\pm')),
    '`*/': infixTex(patternName('\\times \\atop \\div')),
    '`|': infixTex(patternName('|')),
    '`&': infixTex(patternName('\\wedge')),
    '`!': infixTex(patternName('\\neg')),
    '`where': infixTex(patternName('where')),
    '`@': infixTex(patternName('@')),
    '`?': unaryPatternTex(patternName('?')),
    '`*': unaryPatternTex(patternName('\\ast')),
    '`+': unaryPatternTex(patternName('+')),
    '`:': infixTex(patternName(':')),
    ';': function(thing,texArgs,settings) {
        return '\\underset{\\color{grey}{'+texArgs[1]+'}}{'+texArgs[0]+'}';
    },
    ';=': function(thing,texArgs,settings) {
        return '\\underset{\\color{grey}{='+texArgs[1]+'}}{'+texArgs[0]+'}';
    },
    'm_uses': funcTex(patternName('uses')),
    'm_type': funcTex(patternName('type')),
    'm_exactly': overbraceTex('exactly'),
    'm_commutative': overbraceTex('commutative'),
    'm_noncommutative': overbraceTex('non-commutative'),
    'm_associative': overbraceTex('associative'),
    'm_nonassociative': overbraceTex('non-associative'),
    'm_strictplus': overbraceTex('strict-plus'),
    'm_gather': overbraceTex('gather'),
    'm_nogather': overbraceTex('no-gather'),
    'm_func': funcTex(patternName('func')),
    'm_op': funcTex(patternName('op')),
    'm_numeric': overbraceTex('numeric ='),
}

/** Returns a function which puts the given label over the first arg of the op
 * @param {String} label
 * @returns {Function}
 */
function overbraceTex(label) {
    return function(thing,texArgs) {
        return '\\overbrace{'+texArgs[0]+'}^{\\text{'+label+'}}';
    }
}

/** Produce LaTeX for a unary pattern-matching operator
 * @param {String} code - TeX for the operator's name
 * @returns {Function}
 */
function unaryPatternTex(code) {
    return function(thing,texArgs) {
        return '{'+texArgs[0]+'}^{'+code+'}';
    }
}

/** Convert a special number to TeX, or return undefined if not a special number.
 *  @memberof Numbas.jme.display
 *  @private
 *
 *  @param {Number} value
 *  @returns {TeX}
 */
var texSpecialNumber = jme.display.texSpecialNumber = function(value) {
    var specials = jme.display.specialNumbers;
    var pvalue = Math.abs(value);
    for(var i=0;i<specials.length;i++) {
        if(pvalue==specials[i].value) {
            return (value<0 ? '-' : '') + specials[i].tex;
        }
    }
}
/** Convert a number to TeX, displaying it as a fractionm using {@link Numbas.math.rationalApproximation}
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Number} n
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {TeX}
 */
var texRationalNumber = jme.display.texRationalNumber = function(n, settings)
{
    if(n.complex)
    {
        var re = texRationalNumber(n.re, settings);
        var im = texRationalNumber(n.im, settings)+' i';
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
        var special = texSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out = math.niceNumber(n);
        if(out.length>20) {
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+' \\times 10^{'+bits.exponent+'}';
        }
        var f = math.rationalApproximation(Math.abs(n));
        if(f[1]==1) {
            out = Math.abs(f[0]).toString();
        } else {
            if(settings.mixedfractions && f[0] > f[1]) {
                var properNumerator = math.mod(f[0], f[1]);
                var mixedInteger = (f[0]-properNumerator)/f[1];
                out = mixedInteger+' \\frac{'+properNumerator+'}{'+f[1]+'}';
            }
            else {
                out = '\\frac{'+f[0]+'}{'+f[1]+'}';
            }
        }
        if(n<0)
            out='-'+out;
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
 * @param {Number} n
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {TeX}
 */
function texRealNumber(n, settings)
{
    if(n.complex)
    {
        var re = texRealNumber(n.re, settings);
        var im = texRealNumber(n.im, settings)+' i';
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
        var special = texSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out = math.niceNumber(n);
        if(out.length>20) {
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+' \\times 10^{'+bits.exponent+'}';
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
 * @param {Array.<Number>|Numbas.jme.tree} v
 * @param {Numbas.jme.display.texify_settings} settings
 * @returns {TeX}
 */
function texVector(v,settings)
{
    var out;
    var elements;
    if(v.args) {
        elements = v.args.map(function(x){return texify(x,settings)});
    } else {
        var texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
        elements = v.map(function(x){return texNumber(x, settings)});
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
 * @param {Array.<Array.<Number>>|Numbas.jme.tree} m
 * @param {Numbas.jme.display.texify_settings} settings
 * @param {Boolean} parens - enclose the matrix in parentheses?
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
            return x.map(function(y){ return texNumber(y, settings) });
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
    verbatim: function(name) {    //verbatim - use to get round things like i and e being interpreted as constants
        return name;
    },
    op: function(name) {
        return '\\operatorname{'+name+'}';
    },
    vector: function(name) {
        return '\\boldsymbol{'+name+'}';
    },
    unit: function(name) {    //unit vector
        return '\\hat{'+name+'}';
    },
    dot: function(name) {        //dot on top
        return '\\dot{'+name+'}';
    },
    matrix: function(name) {
        return '\\mathrm{'+name+'}';
    },
    complex: propertyAnnotation('complex'),
    real: propertyAnnotation('real'),
    positive: propertyAnnotation('positive'),
    nonnegative: propertyAnnotation('non-negative'),
    negative: propertyAnnotation('negative'),
    integer: propertyAnnotation('integer'),
    decimal: propertyAnnotation('decimal')
}

/** Return a function which TeXs an annotation which marks a property for pattern-matching
 * @param {String} text
 * @returns {Function}
 */
function propertyAnnotation(text) {
    return function(name) {
        return '\\text{'+text+' } '+name;
    }
}
texNameAnnotations.verb = texNameAnnotations.verbatim;
texNameAnnotations.v = texNameAnnotations.vector;
texNameAnnotations.m = texNameAnnotations.matrix;
/** Convert a variable name to TeX
 * @memberof Numbas.jme.display
 *
 * @param {String} name
 * @param {Array.<String>} [annotations]
 * @param {Function} [longNameMacro=texttt] - function which returns TeX for a long name
 * @returns {TeX}
 */
var texName = jme.display.texName = function(name,annotations,longNameMacro)
{
    longNameMacro = longNameMacro || (function(name){ return '\\texttt{'+name+'}'; });
    var oname = name;
    /** Apply annotations to the given name
     * @param {TeX} name
     * @returns {TeX}
     */
    function applyAnnotations(name) {
        if(!annotations) {
            return name;
        }
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
    if(specialNames[name]) {
        return applyAnnotations(specialNames[name]);
    }
    var num_subscripts = name.length - name.replace('_','').length;
    var re_math_variable = /^([^_]*[a-zA-Z])(?:(\d+)|_(\d+)|_([^']{1,2}))?('*)$/;
    var m,isgreek;
    // if the name is a single letter or greek letter name, followed by digits, subscripts or primes
    // m[1]: the "root" name - the bit before any digits, subscripts or primes
    // m[2]: digits immediately following the root
    // m[3]: digits in a subscript
    // m[4]: one or two non-prime characters in a subscript
    // m[5]: prime characters, at the end of the name
    if((m=name.match(re_math_variable)) && (m[1].length==1 || (isgreek=greek.contains(m[1])))) {
        if(isgreek) {
            m[1] = '\\'+m[1];
        }
        name = applyAnnotations(m[1]);
        var subscript = (m[2] || m[3] || m[4]);
        if(subscript) {
            name += '_{'+subscript+'}';
        }
        name += m[5];
    } else if(!name.match(/^\\/)) {
        name = applyAnnotations(longNameMacro(name));
    }
    return name;
}

/** TeX a special name used in pattern-matching
 * @param {TeX} display
 * @returns {TeX}
 */
function texPatternName(display) {
    return '\\text{'+display+'}';
}

/** Names with special renderings
 * @memberof Numbas.jme.display
 * @type {Object.<String>}
 */
var specialNames = jme.display.specialNames = {
    '$z': texPatternName('nothing'),
    '$n': texPatternName('number'),
    '$v': texPatternName('name')
}

var greek = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega']
/** Definition of a number with a special name
 * @typedef Numbas.jme.display.special_number_definition
 * @property {Number} value
 * @property {TeX} tex - The TeX code for this number
 * @property {JME} jme - The JME code for this number
 */
/** List of numbers with special names
 *
 * @memberof Numbas.jme.display
 * @type {Array.<Numbas.jme.display.special_number_definition>}
 */
jme.display.specialNumbers = [
    {value: Math.E, tex: 'e', jme: 'e'},
    {value: Math.PI, tex: '\\pi', jme: 'pi'},
    {value: Infinity, tex: '\\infty', jme: 'infinity'}
];
/** Dictionary of functions to turn {@link Numbas.jme.types} objects into TeX strings
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToTeX = jme.display.typeToTeX = {
    'nothing': function(thing,tok,texArgs,settings) {
        return '\\text{nothing}';
    },
    'number': function(thing,tok,texArgs,settings) {
        return settings.texNumber(tok.value, settings);
    },
    'string': function(thing,tok,texArgs,settings) {
        if(tok.latex)
            return tok.value.replace(/\\([\{\}])/g,'$1');
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
    keypair: function(thing,tok,texArgs,settings) {
        var key = '\\textrm{'+tok.key+'}';
        return key+' \\operatorname{\\colon} '+texArgs[0];
    },
    dict: function(thing,tok,texArgs,settings) {
        if(!texArgs)
        {
            texArgs = [];
            if(tok.value) {
                for(var key in tok.value) {
                    texArgs.push(texify({tok: new jme.types.TKeyPair(key), args:[{tok:tok.value[key]}]},settings));
                }
            }
        }
        return '\\left[ '+texArgs.join(', ')+' \\right]';
    },
    vector: function(thing,tok,texArgs,settings) {
        return ('\\left ( '
                + texVector(tok.value,settings)
                + ' \\right )' );
    },
    matrix: function(thing,tok,texArgs,settings) {
        return '\\left ( '+texMatrix(tok.value,settings)+' \\right )';
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
        var name = tok.name.toLowerCase();
        var fn = name in texOps ? texOps[name] : infixTex('\\, \\operatorname{'+name+'} \\,');
        return fn(thing,texArgs,settings);
    },
    'function': function(thing,tok,texArgs,settings) {
        var lowerName = tok.name.toLowerCase();
        if(texOps[lowerName]) {
            return texOps[lowerName](thing,texArgs,settings);
        }
        else {
            /** long operators get wrapped in `\operatorname`
             * @param {String} name
             * @returns {TeX}
             */
            function texOperatorName(name) {
                return '\\operatorname{'+name.replace(/_/g,'\\_')+'}';
            }
            return texName(tok.name,tok.annotation,texOperatorName)+' \\left ( '+texArgs.join(', ')+' \\right )';
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
/** Take a nested application of a single op, e.g. `((1*2)*3)*4`, and flatten it so that the tree has one op two or more arguments.
 * @param {Numbas.jme.tree} tree
 * @param {String} op
 * @returns {Array.<Numbas.jme.tree>}
 */
function flatten(tree,op) {
    if(!jme.isOp(tree.tok,op)) {
        return [tree];
    }
    var args = [];
    for(var i=0;i<tree.args.length;i++) {
        args = args.concat(flatten(tree.args[i],op));
    }
    return args;
}
/** A dictionary of settings for {@link Numbas.jme.display.texify}.
 * @typedef Numbas.jme.display.texify_settings
 * @property {Boolean} fractionnumbers - Show all numbers as fractions?
 * @property {Boolean} nicenumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {Number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 * @property {Boolean} rowvector - Display vectors as a horizontal list of components?
 */
/** Turn a syntax tree into a TeX string. Data types can be converted to TeX straightforwardly, but operations and functions need a bit more care.
 *
 * The idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX
 *
 * @memberof Numbas.jme.display
 * @method
 *
 * @param {Numbas.jme.tree} thing
 * @param {Numbas.jme.display.texify_settings} settings
 *
 * @returns {TeX}
 */
var texify = Numbas.jme.display.texify = function(thing,settings)
{
    if(!thing)
        return '';
    if(!settings)
        settings = {};
    var tok = thing.tok || thing;
    if(jme.isOp(tok,'*')) {
        // flatten nested multiplications, so a string of consecutive multiplications can be considered together
        thing = {tok: thing.tok, args: flatten(thing,'*')};
    }
    if(thing.args)
    {
        var texArgs = [];
        for(var i=0; i<thing.args.length; i++ )
        {
            texArgs[i] = texify(thing.args[i],settings);
        }
    }
    settings.texNumber = settings.fractionnumbers ? texRationalNumber : texRealNumber;
    if(tok.type in typeToTeX) {
        return typeToTeX[tok.type](thing,tok,texArgs,settings);
    } else {
        throw(new Numbas.Error(R('jme.display.unknown token type',{type:tok.type})));
    }
}
/** Convert a special number to JME, or return undefined if not a special number.
 *  @memberof Numbas.jme.display
 *  @private
 *
 *  @param {Number} value
 *  @returns {TeX}
 */
var jmeSpecialNumber = jme.display.jmeSpecialNumber = function(value) {
    var specials = jme.display.specialNumbers;
    var pvalue = Math.abs(value);
    for(var i=0;i<specials.length;i++) {
        if(pvalue==specials[i].value) {
            return (value<0 ? '-' : '') + specials[i].jme;
        }
    }
}
/** Write a number in JME syntax as a fraction, using {@link Numbas.math.rationalApproximation}
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Number} n
 * @param {Numbas.jme.display.jme_display_settings} settings - if `settings.niceNumber===false`, don't round off numbers
 * @returns {JME}
 */
var jmeRationalNumber = jme.display.jmeRationalNumber = function(n,settings)
{
    settings = settings || {};
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
        var special = jmeSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out;
        if(settings.niceNumber===false) {
            out = n+'';
        } else {
            out = math.niceNumber(n);
        }
        if(out.length>20) {
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+'*10^('+bits.exponent+')';
        }
        var f = math.rationalApproximation(Math.abs(n),settings.accuracy);
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
 * @param {Number} n
 * @param {Numbas.jme.display.jme_display_settings} settings - if `settings.niceNumber===false`, don't round off numbers
 * @returns {JME}
 */
function jmeRealNumber(n,settings)
{
    settings = settings || {};
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
        var special = jmeSpecialNumber(n);
        if(special !== undefined) {
            return special;
        }
        var piD;
        if((piD = math.piDegree(n)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out;
        if(settings.niceNumber===false) {
            out = n+'';
        } else {
            out = math.niceNumber(n);
        }
        if(out.length>20) {
            var bits = math.parseScientific(n.toExponential());
            return bits.significand+'*10^('+bits.exponent+')';
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
    'nothing': function(tree,tok,bits,settings) {
        return 'nothing';
    },
    'number': function(tree,tok,bits,settings) {
        switch(tok.value)
        {
        case Math.E:
            return 'e';
        case Math.PI:
            return 'pi';
        default:
            return settings.jmeNumber(tok.value,settings);
        }
    },
    name: function(tree,tok,bits,settings) {
        if(tok.annotation) {
            return tok.annotation.join(':')+':'+tok.name;
        } else {
            return tok.name;
        }
    },
    'string': function(tree,tok,bits,settings) {
        var str = '"'+jme.escape(tok.value)+'"';
        if(tok.latex) {
            return 'latex('+str+')';
        } else {
            return str;
        }
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
    keypair: function(tree,tok,bits,settings) {
        var key = typeToJME['string'](null,{value:tok.key},[],settings);
        var arg = bits[0];
        if(tree.args[0].tok.type=='op') {
            arg = '( '+arg+' )';
        }
        return key+': '+arg;
    },
    dict: function(tree,tok,bits,settings) {
        if(!bits)
        {
            bits = [];
            if(tok.value) {
                for(var key in tok.value) {
                    bits.push(treeToJME({tok: new jme.types.TKeyPair(key), args:[{tok:tok.value[key]}]},settings));
                }
            }
        }
        if(bits.length) {
            return '[ '+bits.join(', ')+' ]';
        } else {
            return 'dict()';
        }
    },
    vector: function(tree,tok,bits,settings) {
        return 'vector('+tok.value.map(function(n){ return settings.jmeNumber(n,settings)}).join(',')+')';
    },
    matrix: function(tree,tok,bits,settings) {
        return 'matrix('+
            tok.value.map(function(row){return '['+row.map(function(n){ return settings.jmeNumber(n,settings)}).join(',')+']'}).join(',')+')';
    },
    'function': function(tree,tok,bits,settings) {
        if(tok.name in jmeFunctions) {
            return jmeFunctions[tok.name](tree,tok,bits,settings);
        }
        if(!bits) {
            return tok.name+'()';
        } else {
            return tok.name+'('+bits.join(',')+')';
        }
    },
    op: function(tree,tok,bits,settings) {
        var op = tok.name;
        var args = tree.args, l = args.length;
        for(var i=0;i<l;i++) {
            var arg_type = args[i].tok.type;
            var arg_value = args[i].tok.value;
            var pd;
            var arg_op = null;
            if(arg_type=='op') {
                arg_op = args[i].tok.name;
            } else if(arg_type=='number' && arg_value.complex && arg_value.im!=0) {
                if(arg_value.re!=0) {
                    arg_op = arg_value.im<0 ? '-' : '+';   // implied addition/subtraction because this number will be written in the form 'a+bi'
                } else if(arg_value.im!=1) {
                    arg_op = '*';   // implied multiplication because this number will be written in the form 'bi'
                }
            } else if(arg_type=='number' && (pd = math.piDegree(args[i].tok.value))>0 && arg_value/math.pow(Math.PI,pd)>1) {
                arg_op = '*';   // implied multiplication because this number will be written in the form 'a*pi'
            } else if(arg_type=='number' && bits[i].indexOf('/')>=0) {
                arg_op = '/';   // implied division because this number will be written in the form 'a/b'
            }
            var bracketArg = arg_op!=null && op in opBrackets && opBrackets[op][i][arg_op]==true;
            if(bracketArg) {
                bits[i] = '('+bits[i]+')';
                args[i].bracketed=true;
            }
        }
        //omit multiplication symbol when not necessary
        if(op=='*') {
            //number or brackets followed by name or brackets doesn't need a times symbol
            //except <anything>*(-<something>) does
            if(!settings.alwaystimes && ((args[0].tok.type=='number' && math.piDegree(args[0].tok.value)==0 && args[0].tok.value!=Math.E) || args[0].bracketed) && (args[1].tok.type == 'name' || args[1].bracketed && !jme.isOp(tree.args[1].tok,'-u')) )
            {
                op = '';
            }
        }
        switch(op) {
        case '+u':
            op='+';
            break;
        case '-u':
            op='-';
            if(args[0].tok.type=='number' && args[0].tok.value.complex)
                return settings.jmeNumber({complex:true, re: -args[0].tok.value.re, im: -args[0].tok.value.im},settings);
            break;
        case '-':
            var b = args[1].tok.value;
            if(args[1].tok.type=='number' && args[1].tok.value.complex && args[1].tok.value.re!=0) {
                return bits[0]+' - '+settings.jmeNumber(math.complex(b.re,-b.im),settings);
            }
            op = ' - ';
            break;
        case '+':
            op=' '+op+' ';
            break;
        case 'not':
            op = 'not ';
            break;
        case 'fact':
            op = '!';
            break;
        default:
            if(op.length>1 && tok.vars==2) {
                op = ' '+op+' ';
            }
        }
        if(l==1) {
            return tok.postfix ? bits[0]+op : op+bits[0];
        } else {
            return bits[0]+op+bits[1];
        }
    },
    set: function(tree,tok,bits,settings) {
        return 'set('+tok.value.map(function(thing){return treeToJME({tok:thing},settings);}).join(',')+')';
    },
    expression: function(tree,tok,bits,settings) {
        var expr = treeToJME(tok.tree);
        if(settings.wrapexpressions) {
            expr = 'expression("'+jme.escape(expr)+'")';
        }
        return expr;
    }
}
/** Define how to render function in JME, for special cases when the normal rendering `f(...)` isn't right.
 * @enum {function}
 * @memberof Numbas.jme.display
 */
var jmeFunctions = jme.display.jmeFunctions = {
    'dict': typeToJME.dict,
    'fact': function(tree,tok,bits,settings) {
        if(tree.args[0].tok.type=='number' || tree.args[0].tok.type=='name') {
            return bits[0]+'!';
        } else {
            return '( '+bits[0]+' )!';
        }
    },
    'listval': function(tree,tok,bits,settings) {
        return bits[0]+'['+bits[1]+']';
    }
}
/** A dictionary of settings for {@link Numbas.jme.display.treeToJME}.
 * @typedef Numbas.jme.display.jme_display_settings
 * @property {Boolean} fractionnumbers - Show all numbers as fractions?
 * @property {Boolean} niceNumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {Boolean} wrapexpressions - Wrap TExpression tokens in `expression("")`?
 * @property {Number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 */
/** Turn a syntax tree back into a JME expression (used when an expression is simplified)
 * @memberof Numbas.jme.display
 * @method
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.display.jme_display_settings} settings
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
        throw(new Numbas.Error(R('jme.display.unknown token type',{type:tok.type})));
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
    '*': [{'+u':true,'+':true, '-':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '/':true}],
    '/': [{'+u':true,'+':true, '-':true, '*':false},{'+u':true,'-u':true,'+':true, '-':true, '*':true}],
    '^': [{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true, '^': true},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
    'and': [{'or':true, 'xor':true},{'or':true, 'xor':true}],
    'or': [{'xor':true},{'xor':true}],
    'xor':[{},{}],
    '=': [{},{}],
    'fact': [{'+': true, '-': true}]
};

/** Align a series of blocks of text under a header line, connected to the header by ASCII line characters.
 * @param {String} header
 * @param {Array.<String>} items
 * @returns {String}
 */
function align(header,items) {
    /** Pad a lien of text so it's in the centre of a line of length `n`.
     * @param {String} line
     * @param {Number} n
     * @returns {String}
     */
    function centre(line,n) {
        if(line.length>=n) {
            return line;
        }
        var npad = (n-line.length)/2;
        var nlpad = Math.floor(npad);
        var nrpad = Math.ceil(npad);
        for(var i=0;i<nlpad;i++) {
            line = ' '+line;
        }
        for(var i=0;i<nrpad;i++) {
            line = line+' ';
        }
        return line;
    }
    
    var item_lines = items.map(function(item){return item.split('\n')});
    var item_widths = item_lines.map(function(lines) {return lines.reduce(function(m,l){return Math.max(l.length,m)},0)});
    var num_lines = item_lines.reduce(function(t,ls){return Math.max(ls.length,t)},0);
    item_lines = item_lines.map(function(lines,i) {
        var w = item_widths[i];
        var o = [];
        for(var j=0;j<num_lines;j++) {
            var l = lines[j] || '';
            for(var i=l.length;i<w;i++) {
                l += ' ';
            }
            o.push(l);
        }
        return o;
    });
    var bottom_lines = [];
    for(var i=0;i<num_lines;i++) {
        bottom_lines.push(item_lines.map(function(lines){return lines[i]}).join('  '));
    }
    var bottom_line = bottom_lines.join('\n');
    var width = item_widths.reduce(function(t,w){return t+w},0)+2*(items.length-1);
    var ci = Math.floor(width/2-0.5);
    var top_line = '';
    top_line = centre(header,width);
    var middle_line;
    if(items.length==1) {
        middle_line = '';
        for(var i=0;i<width;i++) {
            middle_line += i==ci ? '│' : ' ';
        }
    } else {
        middle_line = items.map(function(rarg,i) {
            var s = '';
            var mid = Math.floor(item_widths[i]/2-0.5);
            for(var j=0;j<item_widths[i];j++) {
                if(i==0) {
                    s += j<mid ? ' ' : j==mid ? '┌' : '─';
                } else if(i==items.length-1) {
                    s += j<mid ? '─' : j==mid ? '┐' : ' ';
                } else {
                    s += j==mid ? '┬' : '─';
                }
            }
            return s;
        }).join('──');
    }
    var top_joins = {
        '│': '│',
        '┌': '├',
        '┐': '┤',
        '─': '┴',
        '┬': '┼'
    }
    var mid = top_joins[middle_line[ci]];
    middle_line = middle_line.slice(0,ci)+mid+middle_line.slice(ci+1);
    if(top_line.length>bottom_line.length) {
        middle_line = centre(middle_line,header.length);
        bottom_line = centre(bottom_line,header.length);
    }
    return [top_line,middle_line,bottom_line].join('\n');
}

/** Display a tree as a diagram using
 * @param {Numbas.jme.tree} tree
 * @returns {String}
 */
var tree_diagram = Numbas.jme.display.tree_diagram = function(tree) {
    switch(tree.tok.type) {
        case 'op':
        case 'function':
            var args = tree.args.map(function(arg){ return tree_diagram(arg); });
            return align(tree.tok.name, args);
        default:
            return treeToJME(tree);
    }
};

/** For backwards compatibility, copy references from some Numbas.jme.rules members to Numbas.jme.display.
 *  These used to belong to Numbas.jme.display, but were moved into a separate file.
 */
['Rule','getTerms','matchTree','matchExpression','simplificationRules','compileRules'].forEach(function(name) {
    jme.display[name] = jme.rules[name];
});
});
