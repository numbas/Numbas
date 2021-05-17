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

/** A LaTeX string.
 *
 * @typedef TeX
 * @type {string}
 */

/** @namespace Numbas.jme.display */
jme.display = /** @lends Numbas.jme.display */ {
    /** Convert a JME expression to LaTeX.
     *
     * @param {JME} expr
     * @param {Array.<string>|Numbas.jme.rules.Ruleset} ruleset - Can be anything accepted by {@link Numbas.jme.display.collectRuleset}.
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

        var settings = util.extend_object({scope: scope},ruleset.flags);
        var tex = texify(tree,settings,scope); //render the tree as TeX
        return tex;
    },
    /** Simplify a JME expression string according to the given ruleset and return it as a JME string.
     *
     * @param {JME} expr
     * @param {Array.<string>|Numbas.jme.rules.Ruleset} ruleset - Can be anything accepted by {@link Numbas.jme.display.collectRuleset}.
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
    /** Simplify a JME expression string according to given ruleset and return it as a syntax tree.
     *
     * @param {JME} expr
     * @param {Array.<string>|Numbas.jme.rules.Ruleset} ruleset
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
    /** Simplify a syntax tree according to the given ruleset.
     *
     * @see Numbas.jme.rules.Ruleset#simplify
     * @param {Numbas.jme.tree} exprTree
     * @param {Numbas.jme.rules.Ruleset} ruleset
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} allowUnbound
     * @returns {Numbas.jme.tree}
     *
     * @see Numbas.jme.display.simplify
     */
    simplifyTree: function(exprTree,ruleset,scope,allowUnbound) {
        return ruleset.simplify(exprTree,scope);
    }
};

/** Is the given token a complex number?
 * 
 * @param {Numbas.jme.token} tok
 * @returns {boolean}
 */
function isComplex(tok) {
    return (tok.type=='number' && tok.value.complex && tok.value.im!=0) || (tok.type=='decimal' && !tok.value.isReal());
}

/** Is the given token a number with non-zero real part?
 *
 * @param {Numbas.jme.token} tok
 * @returns {boolean}
 */
function hasRealPart(tok) {
    switch(tok.type) {
        case 'number':
            return !tok.value.complex || tok.value.re!=0;
        case 'decimal':
            return !tok.value.re.isZero();
        default:
            return hasRealPart(jme.castToType(tok,'number'));
    }
}

/** Get the complex conjugate of a token, assuming it's a number.
 *
 * @param {Numbas.jme.token} tok
 * @returns {Numbas.jme.token}
 */
function conjugate(tok) {
    switch(tok.type) {
        case 'number':
            return math.conjugate(tok.value);
        case 'decimal':
            return tok.value.conjugate().toComplexNumber();
        default:
            return conjugate(jme.castToType(tok,'number'));
    }
}

/** Get the negation of a token, assuming it's a number.
 *
 * @param {Numbas.jme.token} tok
 * @returns {Numbas.jme.token}
 */
function negated(tok) {
    var v = tok.value;
    switch(tok.type) {
        case 'number':
            return math.negate(v);
        case 'decimal':
            return v.negated().toComplexNumber();
        default:
            return negated(jme.castToType(tok,'number'));
    }
}

/** Helper function for texing infix operators.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - The TeX command for the operator.
 * @returns {Function} - A function which will convert a syntax tree with the operator at the top to TeX, by putting `code` in between the TeX of the two arguments.
 */
function infixTex(code)
{
    return function(thing,texArgs)
    {
        var arity = thing.args.length;
        if( arity == 1 )    //if operation is unary, prepend argument with code
        {
            var arg = this.texifyOpArg(thing,texArgs,0);
            return thing.tok.postfix ? arg+code : code+arg;
        }
        else if ( arity == 2 )    //if operation is binary, put code in between arguments
        {
            return texifyOpArg(thing,texArgs,0)+' '+code+' '+texifyOpArg(thing,texArgs,1);
        }
    }
}
/** Helper for texing nullary functions.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - The TeX command for the function.
 * @returns {Function} - A function which returns the appropriate (constant) TeX code.
 */
function nullaryTex(code)
{
    return function(thing,texArgs){ return '\\textrm{'+code+'}'; };
}
/** Helper function for texing functions.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {TeX} code - The TeX command for the function.
 * @returns {Function} - A function which converts a syntax tree to the appropriate TeX.
 */
function funcTex(code)
{
    var f = function(thing,texArgs){
        return code+' \\left ( '+texArgs.join(', ')+' \\right )';
    }
    f.code = code;
    return f;
}

/** TeX the name of a pattern-matching operator.
 *
 * @param {TeX} code
 * @returns {TeX}
 */
function patternName(code) {
    return '\\operatorname{\\color{grey}{'+code+'}}';
}

/** TeX a unary positive or minus operation.
 *
 * @param {string} symbol - The symbol for the operation, either `+` or `-`.
 * @returns {Function} - A function which converts a syntax tree to the appropriate TeX.
 */
function texUnaryAdditionOrMinus(symbol) {
    return function(thing,texArgs) {
        var tex = texArgs[0];
        if( thing.args[0].tok.type=='op' ) {
            var op = thing.args[0].tok.name;
            if(
                op=='-u' || op=='+u' ||
                (!(op=='/' || op=='*') && jme.precedence[op]>jme.precedence[symbol+'u'])    //brackets are needed if argument is an operation which would be evaluated after the unary op
            ) {
                tex='\\left ( '+tex+' \\right )';
            }
        } else if(isComplex(thing.args[0].tok)) {
            var tok = thing.args[0].tok;
            switch(tok.type) {
                case 'number':
                    var value = thing.args[0].tok.value;
                    return this.texNumber({complex:true,re:-value.re,im:-value.im});
                case 'decimal':
                    return this.texNumber(tok.value.negated().toComplexNumber());
            }
        }
        return symbol+tex;
    }
}

/** Define how to texify each operation and function.
 *
 * @enum {Function}
 * @memberof Numbas.jme.display
 */
var texOps = jme.display.texOps = {
    '#': (function(thing,texArgs) { return texArgs[0]+' \\, \\# \\, '+texArgs[1]; }),
    'not': infixTex('\\neg '),
    '+u': texUnaryAdditionOrMinus('+'),
    '-u': texUnaryAdditionOrMinus('-'),
    '^': (function(thing,texArgs) {
        var tex0 = texArgs[0];
        //if left operand is an operation, it needs brackets round it. Exponentiation is right-associative, so 2^3^4 won't get any brackets, but (2^3)^4 will.
        if(thing.args[0].tok.type=='op' || (thing.args[0].tok.type=='function' && thing.args[0].tok.name=='exp') || this.texifyWouldBracketOpArg(thing, 0)) {
            tex0 = '\\left ( ' +tex0+' \\right )';
        }
        var trigFunctions = ['cos','sin','tan','sec','cosec','cot','arcsin','arccos','arctan','cosh','sinh','tanh','cosech','sech','coth','arccosh','arcsinh','arctanh'];
        if(thing.args[0].tok.type=='function' && trigFunctions.contains(thing.args[0].tok.name) && jme.isType(thing.args[1].tok,'number') && util.isInt(thing.args[1].tok.value) && thing.args[1].tok.value>0) {
            return texOps[thing.args[0].tok.name].code + '^{'+texArgs[1]+'}' + '\\left( '+this.texify(thing.args[0].args[0])+' \\right)';
        }
        return (tex0+'^{ '+texArgs[1]+' }');
    }),
    '*': (function(thing, texArgs) {
        var s = this.texifyOpArg(thing,texArgs,0);
        for(var i=1; i<thing.args.length; i++ ) {
            var left = thing.args[i-1];
            var right = thing.args[i];
            var use_symbol = false;
            if(this.settings.alwaystimes) {
                use_symbol = true;
            } else {
                if(this.texifyWouldBracketOpArg(thing,i-1) && this.texifyWouldBracketOpArg(thing,i)) {
                    use_symbol = false;
                // if we'd end up with two digits next to each other, but from different arguments, we need a times symbol
                } else if(util.isInt(texArgs[i-1].charAt(texArgs[i-1].length-1)) && util.isInt(texArgs[i].charAt(0)) && !this.texifyWouldBracketOpArg(thing,i)) {
                    use_symbol = true;
                //anything times e^(something) or (not number)^(something)
                } else if (jme.isOp(right.tok,'^') && (right.args[0].value==Math.E || !jme.isType(right.args[0].tok,'number'))) {
                    use_symbol = false;
                //real number times Pi or E
                } else if (jme.isType(right.tok,'number') && (right.tok.value==Math.PI || right.tok.value==Math.E || isComplex(right.tok)) && jme.isType(left.tok,'number') && !isComplex(left.tok)) {
                    use_symbol = false
                //number times a power of i
                } else if (jme.isOp(right.tok,'^') && jme.isType(right.args[0].tok,'number') && math.eq(right.args[0].tok.value,math.complex(0,1)) && jme.isType(left.tok,'number')) {
                    use_symbol = false;
                // times sign when LHS or RHS is a factorial
                } else if((left.tok.type=='function' && left.tok.name=='fact') || (right.tok.type=='function' && right.tok.name=='fact')) {
                    use_symbol = true;
                //(anything except i) times i
                } else if ( !(jme.isType(left.tok,'number') && math.eq(jme.castToType(left.tok,'number').value,math.complex(0,1))) && jme.isType(right.tok,'number') && math.eq(jme.castToType(right.tok,'number').value,math.complex(0,1))) {
                    use_symbol = false;
                // multiplication of two names, at least one of which has more than one letter
                } else if(right.tok.type=='name' && left.tok.type=='name' && Math.max(left.tok.nameInfo.letterLength,right.tok.nameInfo.letterLength)>1) {
                    use_symbol = true;
                // multiplication of a name by something in brackets
                } else if(jme.isType(left.tok,'name') && this.texifyWouldBracketOpArg(thing,i)) {
                    use_symbol = true;
                // anything times number, or (-anything), or an op with lower precedence than times, with leftmost arg a number
                } else if ( jme.isType(right.tok,'number')
                        ||
                            jme.isOp(right.tok,'-u') || jme.isOp(right.tok,'+u')
                        ||
                        (
                            (right.tok.type=='op' && jme.precedence[right.tok.name]<=jme.precedence['*']
                                && (jme.isType(right.args[0].tok,'number')
                                && right.args[0].tok.value!=Math.E)
                            )
                        )
                ) {
                    use_symbol = true;
                }
            }
            s += use_symbol ? ' '+this.texTimesSymbol()+' ' : ' ';
            s += this.texifyOpArg(thing,texArgs,i);
        }
        return s;
    }),
    '/': (function(thing,texArgs) {
        if (this.settings.flatfractions) {
            return '\\left. ' + this.texifyOpArg(thing,texArgs,0) + ' \\middle/ ' + this.texifyOpArg(thing,texArgs,1) + ' \\right.'
        } else {
            return ('\\frac{ '+texArgs[0]+' }{ '+texArgs[1]+' }');
        }
    }),
    '+': (function(thing,texArgs) {
        var a = thing.args[0];
        var b = thing.args[1];
        if(jme.isOp(b.tok,'+u') || jme.isOp(b.tok,'-u')) {
            return texArgs[0]+' + \\left ( '+texArgs[1]+' \\right )';
        } else {
            return texArgs[0]+' + '+texArgs[1];
        }
    }),
    '-': (function(thing,texArgs) {
        var a = thing.args[0];
        var b = thing.args[1];
        if(isComplex(b.tok) && hasRealPart(b.tok)) {
            var texb = this.texNumber(conjugate(b.tok));
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
    'decimal': function(thing,texArgs) {
        return texArgs[0];
    },
    'abs': (function(thing,texArgs) {
        var arg;
        if(thing.args[0].tok.type=='vector')
            arg = this.texVector(thing.args[0].tok.value);
        else if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='vector')
            arg = this.texVector(thing.args[0]);
        else if(thing.args[0].tok.type=='matrix')
            arg = this.texMatrix(thing.args[0].tok.value);
        else if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='matrix')
            arg = this.texMatrix(thing.args[0]);
        else
            arg = texArgs[0];
        return ('\\left | '+arg+' \\right |');
    }),
    'sqrt': (function(thing,texArgs) { return ('\\sqrt{ '+texArgs[0]+' }'); }),
    'exp': (function(thing,texArgs) { return ('e^{ '+texArgs[0]+' }'); }),
    'fact': (function(thing,texArgs)
            {
                if(jme.isType(thing.args[0].tok,'number') || thing.args[0].tok.type=='name') {
                    return texArgs[0]+'!';
                } else {
                    return '\\left ('+texArgs[0]+' \\right )!';
                }
            }),
    'ceil': (function(thing,texArgs) { return '\\left \\lceil '+texArgs[0]+' \\right \\rceil';}),
    'floor': (function(thing,texArgs) { return '\\left \\lfloor '+texArgs[0]+' \\right \\rfloor';}),
    'int': (function(thing,texArgs) { return ('\\int \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'defint': (function(thing,texArgs) { return ('\\int_{'+texArgs[2]+'}^{'+texArgs[3]+'} \\! '+texArgs[0]+' \\, \\mathrm{d}'+texArgs[1]); }),
    'diff': (function(thing,texArgs)
            {
                var degree = thing.args.length>=2 ? (jme.isType(thing.args[2].tok,'number') && jme.castToType(thing.args[2].tok,'number').value==1) ? '' : '^{'+texArgs[2]+'}' : '';
                if(thing.args[0].tok.type=='name') {
                    if (this.settings.flatfractions) {
                        return ('\\left. \\mathrm{d}'+degree+this.texifyOpArg(thing, texArgs, 0)+' \\middle/ \\mathrm{d}'+this.texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\mathrm{d}'+degree+texArgs[0]+'}{\\mathrm{d}'+texArgs[1]+degree+'}');
                    }
                } else {
                    if (this.settings.flatfractions) {
                        return ('\\left. \\mathrm{d}'+degree+'('+texArgs[0]+') \\middle/ \\mathrm{d}'+this.texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\mathrm{d}'+degree+'}{\\mathrm{d}'+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                    }
                }
            }),
    'partialdiff': (function(thing,texArgs)
            {
                var degree = thing.args.length>=2 ? (jme.isType(thing.args[2].tok,'number') && jme.castToType(thing.args[2].tok,'number').value==1) ? '' : '^{'+texArgs[2]+'}' : '';
                if(thing.args[0].tok.type=='name')
                    if (this.settings.flatfractions) {
                        return ('\\left. \\partial '+degree+this.texifyOpArg(thing, texArgs, 0)+' \\middle/ \\partial '+this.texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\partial '+degree+texArgs[0]+'}{\\partial '+texArgs[1]+degree+'}');
                    }
                else
                {
                    if (this.settings.flatfractions) {
                        return ('\\left. \\partial '+degree+'('+texArgs[0]+') \\middle/ \\partial '+this.texifyOpArg(thing, texArgs, 1)+'\\right.')
                    } else {
                        return ('\\frac{\\partial '+degree+'}{\\partial '+texArgs[1]+degree+'} \\left ('+texArgs[0]+' \\right )');
                    }
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
    'ln': function(thing,texArgs) {
        if(thing.args[0].tok.type=='function' && thing.args[0].tok.name=='abs')
            return '\\ln '+texArgs[0];
        else
            return '\\ln \\left ( '+texArgs[0]+' \\right )';
    },
    'log': function(thing,texArgs) {
        var base = thing.args.length==1 ? '10' : texArgs[1];
        return '\\log_{'+base+'} \\left ( '+texArgs[0]+' \\right )';
    },
    'vector': (function(thing,texArgs) {
        return '\\left ( '+this.texVector(thing)+' \\right )';
    }),
    'rowvector': (function(thing,texArgs) {
        if(thing.args[0].tok.type!='list')
            return this.texMatrix({args:[{args:thing.args}]},true);
        else
            return this.texMatrix(thing,true);
    }),
    'matrix': (function(thing,texArgs) {
        return this.texMatrix(thing,!this.settings.barematrices);
    }),
    'listval': (function(thing,texArgs) {
        return texArgs[0]+' \\left['+texArgs[1]+'\\right]';
    }),
    'verbatim': (function(thing,texArgs) {
        return thing.args[0].tok.value;
    }),
    'set': function(thing,texArgs) {
        if(thing.args.length==1 && thing.args[0].tok.type=='list') {
            return '\\left\\{ '+this.texify(thing.args[0])+' \\right\\}';
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
    ';': function(thing,texArgs) {
        return '\\underset{\\color{grey}{'+texArgs[1]+'}}{'+texArgs[0]+'}';
    },
    ';=': function(thing,texArgs) {
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

/** Returns a function which puts the given label over the first arg of the op.
 *
 * @param {string} label
 * @returns {Function}
 */
function overbraceTex(label) {
    return function(thing,texArgs) {
        return '\\overbrace{'+texArgs[0]+'}^{\\text{'+label+'}}';
    }
}

/** Produce LaTeX for a unary pattern-matching operator.
 *
 * @param {string} code - TeX for the operator's name.
 * @returns {Function}
 */
function unaryPatternTex(code) {
    return function(thing,texArgs) {
        return '{'+texArgs[0]+'}^{'+code+'}';
    }
}

/** Dictionary of functions to convert specific name annotations to TeX.
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
    diff: function(name) {
        return '{\\mathrm{d}'+name+'}';
    },
    degrees: function(name) {
        return name+'^{\\circ}';
    },
    complex: propertyAnnotation('complex'),
    imaginary: propertyAnnotation('imaginary'),
    real: propertyAnnotation('real'),
    positive: propertyAnnotation('positive'),
    nonnegative: propertyAnnotation('non-negative'),
    negative: propertyAnnotation('negative'),
    integer: propertyAnnotation('integer'),
    decimal: propertyAnnotation('decimal'),
    rational: propertyAnnotation('rational')
}

/** Return a function which TeXs an annotation which marks a property for pattern-matching.
 * 
 * @param {string} text
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

/** TeX a special name used in pattern-matching.
 *
 * @param {TeX} display
 * @returns {TeX}
 */
function texPatternName(display) {
    return '\\text{'+display+'}';
}

/** Names with special renderings.
 *
 * @memberof Numbas.jme.display
 * @type {object.<string>}
 */
var specialNames = jme.display.specialNames = {
    '$z': texPatternName('nothing'),
    '$n': texPatternName('number'),
    '$v': texPatternName('name')
}

/** Definition of a number with a special name.
 *
 * @typedef Numbas.jme.display.special_number_definition
 * @property {number} value
 * @property {TeX} tex - The TeX code for this number.
 * @property {JME} jme - The JME code for this number.
 */

/** List of numbers with special names.
 *
 * @memberof Numbas.jme.display
 * @type {Array.<Numbas.jme.display.special_number_definition>}
 */
jme.display.specialNumbers = [
    {value: Math.E, tex: 'e', jme: 'e'},
    {value: Math.PI, tex: '\\pi', jme: 'pi'},
    {value: Infinity, tex: '\\infty', jme: 'infinity'}
];
/** Dictionary of functions to turn {@link Numbas.jme.types} objects into TeX strings.
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToTeX = jme.display.typeToTeX = {
    'nothing': function(thing,tok,texArgs) {
        return '\\text{nothing}';
    },
    'integer': function(thing,tok,texArgs) {
        return this.texNumber(tok.value);
    },
    'rational': function(thing,tok,texArgs) {
        return this.texNumber(tok.value.toFloat());
    },
    'decimal': function(thing,tok,texArgs) {
        return this.texNumber(tok.value.toComplexNumber());
    },
    'number': function(thing,tok,texArgs) {
        return this.texNumber(tok.value);
    },
    'string': function(thing,tok,texArgs) {
        if(tok.latex) {
            if(tok.safe) {
                return tok.value;
            } else {
                return tok.value.replace(/\\([\{\}])/g,'$1');
            }
        } else {
            return '\\textrm{'+tok.value+'}';
        }
    },
    'boolean': function(thing,tok,texArgs) {
        return tok.value ? 'true' : 'false';
    },
    range: function(thing,tok,texArgs) {
        return tok.value[0]+ ' \\dots '+tok.value[1];
    },
    list: function(thing,tok,texArgs) {
        if(!texArgs)
        {
            texArgs = [];
            for(var i=0;i<tok.vars;i++) {
                texArgs[i] = this.texify(tok.value[i]);
            }
        }
        return '\\left[ '+texArgs.join(', ')+' \\right]';
    },
    keypair: function(thing,tok,texArgs) {
        var key = '\\textrm{'+tok.key+'}';
        return key+' \\operatorname{\\colon} '+texArgs[0];
    },
    dict: function(thing,tok,texArgs) {
        if(!texArgs)
        {
            texArgs = [];
            if(tok.value) {
                for(var key in tok.value) {
                    texArgs.push(this.texify({tok: new jme.types.TKeyPair(key), args:[{tok:tok.value[key]}]}));
                }
            }
        }
        return '\\left[ '+texArgs.join(', ')+' \\right]';
    },
    vector: function(thing,tok,texArgs) {
        return ('\\left ( '
                + this.texVector(tok.value)
                + ' \\right )' );
    },
    matrix: function(thing,tok,texArgs) {
        var m = this.texMatrix(tok.value);
        if(!this.settings.barematrices) {
            m = '\\left ( ' + m + ' \\right )';
        }
        return m;
    },
    name: function(thing,tok,texArgs) {
        var c = this.scope.getConstant(tok.name);
        if(c) {
            return c.tex;
        }
        return this.texName(tok);
    },
    op: function(thing,tok,texArgs) {
        return this.texOp(thing,tok,texArgs);
    },
    'function': function(thing,tok,texArgs) {
        return this.texFunction(thing,tok,texArgs);
    },
    set: function(thing,tok,texArgs) {
        texArgs = [];
        for(var i=0;i<tok.value.length;i++) {
            texArgs.push(this.texify(tok.value[i]));
        }
        return '\\left\\{ '+texArgs.join(', ')+' \\right\\}';
    },
    expression: function(thing,tok,texArgs) {
        return this.texify(tok.tree);
    }
}
/** Take a nested application of a single op, e.g. `((1*2)*3)*4`, and flatten it so that the tree has one op two or more arguments.
 *
 * @param {Numbas.jme.tree} tree
 * @param {string} op
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
 *
 * @see Numbas.jme.rules.displayFlags
 *
 * @typedef Numbas.jme.display.texify_settings
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} rowvector - Display vectors as a horizontal list of components?
 * @property {boolean} alwaystimes - Always show the multiplication symbol between multiplicands?
 * @property {boolean} mixedfractions - Show top-heavy fractions as mixed fractions, e.g. 3 3/4?
 * @property {boolean} flatfractions - Display fractions horizontally?
 * @property {boolean} barematrices - Render matrices without wrapping them in parentheses.
 * @property {boolean} nicenumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 * @property {boolean} timesdot - Use a dot for the multiplication symbol instead of a cross?
 */


var Texifier = jme.display.Texifier = function(settings,scope) {
    this.settings = settings || {};
    this.scope = scope || Numbas.jme.builtinScope;
    this.constants = Object.values(this.scope.allConstants());
}
Texifier.prototype = {
    texify: function(thing) {
        var texifier = this;
        if(!thing) {
            return '';
        }
        var texArgs;

        var tok = thing.tok || thing;
        if(jme.isOp(tok,'*')) {
            // flatten nested multiplications, so a string of consecutive multiplications can be considered together
            thing = {tok: thing.tok, args: flatten(thing,'*')};
        }
        if(thing.args) {
            thing = {
                tok: thing.tok,
                args: thing.args.map(function(arg) {
                    if(arg.tok.type=='expression') {
                        return arg.tree;
                    } else {
                        return arg;
                    }
                })
            }
            texArgs = thing.args.map(function(arg) {
                return texifier.texify(arg);
            });
        } else {
            var constantTex = this.texConstant(thing);
            if(constantTex) {
                return constantTex;
            }
        }
        if(tok.type in this.typeToTeX) {
            return this.typeToTeX[tok.type].call(this,thing,tok,texArgs);
        } else {
            throw(new Numbas.Error(R('jme.display.unknown token type',{type:tok.type})));
        }
    },

    texNumber: function(n) {
        return this.settings.fractionnumbers ? this.texRationalNumber(n) : this.texRealNumber(n);
    },

    /** Convert a number to TeX, displaying it as a fraction using {@link Numbas.math.rationalApproximation}.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {number} n
     * @param {Numbas.jme.display.texify_settings} settings
     * @returns {TeX}
     */
    texRationalNumber: function(n) {
        if(n.complex) {
            var re = this.texRationalNumber(n.re);
            var im = this.texRationalNumber(n.im)+' i';
            if(n.im==0) {
                return re;
            } else if(n.re==0) {
                if(n.im==1) {
                    return 'i';
                } else if(n.im==-1) {
                    return '-i';
                } else {
                    return im;
                }
            } else if(n.im<0) {
                if(n.im==-1) {
                    return re+' - i';
                } else {
                    return re+' '+im;
                }
            } else {
                if(n.im==1) {
                    return re+' + '+'i';
                } else {
                    return re+' + '+im;
                }
            }
        } else {
            var piD;
            if((piD = math.piDegree(n)) > 0)
                n /= Math.pow(Math.PI,piD);
            var out = math.niceNumber(n);
            if(out.length>20) {
                var bits = math.parseScientific(n.toExponential());
                return bits.significand+' '+this.texTimesSymbol()+' 10^{'+bits.exponent+'}';
            }
            var f = math.rationalApproximation(Math.abs(n));
            if(f[1]==1) {
                out = Math.abs(f[0]).toString();
            } else {
                if(this.settings.mixedfractions && f[0] > f[1]) {
                    var properNumerator = math.mod(f[0], f[1]);
                    var mixedInteger = (f[0]-properNumerator)/f[1];
                    if (this.settings.flatfractions) {
                        out = mixedInteger+'\\; \\left. '+properNumerator+' \\middle/ '+f[1]+' \\right.';
                    } else {
                        out = mixedInteger+' \\frac{'+properNumerator+'}{'+f[1]+'}';
                    }
                }
                else {
                    if (this.settings.flatfractions) {
                        out = '\\left. '+f[0]+' \\middle/ '+f[1]+' \\right.'
                    }
                    else {
                        out = '\\frac{'+f[0]+'}{'+f[1]+'}';
                    }
                }
            }
            if(n<0 && out!='0')
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
    },
    /** Convert a number to TeX, displaying it as a decimal.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {number} n
     * @param {Numbas.jme.display.texify_settings} settings
     * @returns {TeX}
     */
    texRealNumber: function(n)
    {
        if(n.complex) {
            var re = this.texRealNumber(n.re);
            var im = this.texRealNumber(n.im)+' i';
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
            if((piD = math.piDegree(n,false)) > 0)
                n /= Math.pow(Math.PI,piD);
            var out = math.niceNumber(n);
            if(out.length>20) {
                var bits = math.parseScientific(n.toExponential());
                return bits.significand+' '+this.texTimesSymbol()+' 10^{'+bits.exponent+'}';
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
    },
    /** Convert a vector to TeX. If `settings.rowvector` is true, then it's set horizontally.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Array.<number>|Numbas.jme.tree} v
     * @param {Numbas.jme.display.texify_settings} settings
     * @returns {TeX}
     */
    texVector: function(v) {
        var texifier = this;
        var out;
        var elements;
        if(v.args) {
            elements = v.args.map(function(x){return this.texify(x)});
        } else {
            elements = v.map(function(x){return texifier.texNumber(x)});
        }
        if(this.settings.rowvector)
            out = elements.join(' , ');
        else
            out = '\\begin{matrix} '+elements.join(' \\\\ ')+' \\end{matrix}';
        return out;
    },
    /** Convert a matrix to TeX.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Array.<Array.<number>>|Numbas.jme.tree} m
     * @param {Numbas.jme.display.texify_settings} settings
     * @param {boolean} parens - Enclose the matrix in parentheses?
     * @returns {TeX}
     */
    texMatrix: function(m,parens) {
        var texifier = this;
        var out;
        if(m.args)
        {
            var all_lists = true;
            var rows = m.args.map(function(x) {
                if(x.tok.type=='list') {
                    return x.args.map(function(y){ return texifier.texify(y); });
                } else {
                    all_lists = false;
                }
            })
            if(!all_lists) {
                return '\\operatorname{matrix}(' + m.args.map(function(x){return texifier.texify(x);}).join(',') +')';
            }
        } else {
            var rows = m.map(function(x){
                return x.map(function(y){ return texifier.texNumber(y) });
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
    },

    /** Return the TeX for the multiplication symbol.
     *
     * @returns {TeX}
     */
    texTimesSymbol: function() {
        if(this.settings.timesdot) {
            return '\\cdot';
        } else {
            return '\\times';
        }
    },

    /** Convert a variable name to TeX.
     *
     * @memberof Numbas.jme.display
     *
     * @param {Numbas.jme.token} tok
     * @param {Function} [longNameMacro=texttt] - Function which returns TeX for a long name.
     * @returns {TeX}
     */
    texName: function(tok,longNameMacro) {
        var name = tok.nameWithoutAnnotation;
        var annotations = tok.annotation;
        longNameMacro = longNameMacro || (function(name){ return '\\texttt{'+name+'}'; });
        var oname = name;
        /** Apply annotations to the given name.
         *
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

        var nameInfo = tok.nameInfo;
        name = nameInfo.root;
        if(nameInfo.isGreek) {
            name = '\\'+name;
        }
        if(nameInfo.isLong) {
            name = longNameMacro(name);
        } 
        name = applyAnnotations(name);
        if(nameInfo.subscript) {
            name += '_{'+nameInfo.subscript+'}';
        }
        if(nameInfo.primes) {
            name += nameInfo.primes;
        }
        return name;
    },

    texConstant: function(thing) {
        var constantTex;
        this.constants.find(function(c) {
            if(util.eq(thing.tok, c.value, scope)) {
                constantTex = c.tex;
                return true;
            }
            if(jme.isType(thing.tok,'number') && jme.isType(c.value,'number') && util.eq(negated(thing.tok),c.value, scope)) {
                constantTex = '-'+c.tex;
                return true;
            }
        });
        return constantTex;
    },

    texOp: function(thing,tok,texArgs) {
        var name = jme.normaliseName(tok.name,this.scope);
        var fn = name in this.texOps ? this.texOps[name] : infixTex('\\, \\operatorname{'+name+'} \\,');
        return fn.call(this,thing,texArgs);
    },

    texFunction: function(thing,tok,texArgs) {
        var normalisedName = jme.normaliseName(tok.name,this.scope);
        if(this.texOps[normalisedName]) {
            return this.texOps[normalisedName].call(this,thing,texArgs);
        } else {
            /** Long operators get wrapped in `\operatorname`.
             *
             * @param {string} name
             * @returns {TeX}
             */
            function texOperatorName(name) {
                return '\\operatorname{'+name.replace(/_/g,'\\_')+'}';
            }
            return this.texName(tok,texOperatorName)+' \\left ( '+texArgs.join(', ')+' \\right )';
        }
    },

    /** Would texify put brackets around a given argument of an operator?
     *
     * @param {Numbas.jme.tree} thing
     * @param {number} i - The index of the argument.
     * @returns {boolean}
     */
    texifyWouldBracketOpArg: function(thing,i) {
        var precedence = jme.precedence;

        var arg = thing.args[i];
        if((jme.isOp(arg.tok,'-u') || jme.isOp(arg.tok,'+u')) && isComplex(arg.args[0].tok)) {
            arg = arg.args[0];
        }
        var tok = arg.tok;

        if(tok.type=='op') {    //if this is an op applied to an op, might need to bracket
            if(thing.args.length==1) {
                return thing.args[0].tok.type=='op' && thing.args[0].args.length>1;
            }
            var op1 = arg.tok.name;    //child op
            var op2 = thing.tok.name;            //parent op
            var p1 = precedence[op1];    //precedence of child op
            var p2 = precedence[op2];    //precedence of parent op
            //if leaving out brackets would cause child op to be evaluated after parent op, or precedences the same and parent op not commutative, or child op is negation and parent is exponentiation
            return ( p1 > p2 || (p1==p2 && i>0 && !jme.commutative[op2]) || (i>0 && (op1=='-u' || op2=='+u') && precedence[op2]<=precedence['*']) )
        }
        //complex numbers might need brackets round them when multiplied with something else or unary minusing
        else if(isComplex(tok) && thing.tok.type=='op' && (thing.tok.name=='*' || thing.tok.name=='-u' || thing.tok.name=='-u' || i==0 && thing.tok.name=='^') ) {
            var v = arg.tok.value;
            return !(v.re==0 || v.im==0);
        } else if(jme.isOp(thing.tok, '^') && this.settings.fractionnumbers && jme.isType(tok,'number') && this.texConstant(arg)===undefined && math.rationalApproximation(Math.abs(tok.value))[1] != 1) {
            return true;
        }
        return false;
    },


    /** Apply brackets to an op argument if appropriate.
     *
     * @memberof Numbas.jme.display
     * @private
     *
     * @param {Numbas.jme.tree} thing
     * @param {Array.<string>} texArgs - The arguments of `thing`, as TeX.
     * @param {number} i - The index of the argument to bracket.
     * @returns {TeX}
     */
    texifyOpArg: function(thing,texArgs,i)
    {
        var tex = texArgs[i];
        if(this.texifyWouldBracketOpArg(thing,i)) {
            tex = '\\left ( '+tex+' \\right )';
        }
        return tex;
    }

}
Texifier.prototype.typeToTeX = jme.display.typeToTeX;
Texifier.prototype.texOps = jme.display.texOps;


/** Turn a syntax tree into a TeX string. Data types can be converted to TeX straightforwardly, but operations and functions need a bit more care.
 *
 * The idea here is that each function and op has a function associated with it which takes a syntax tree with that op at the top and returns the appropriate TeX.
 *
 * @memberof Numbas.jme.display
 * @function
 *
 * @param {Numbas.jme.tree} thing
 * @param {Numbas.jme.display.texify_settings} settings
 *
 * @returns {TeX}
 */
var texify = Numbas.jme.display.texify = function(thing,settings,scope)
{
    var texifier = new Texifier(settings,scope);
    return texifier.texify(thing);
}

/** Convert a special number to JME, or return undefined if not a special number.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} value
 * @returns {TeX}
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
/** Write a number in JME syntax as a fraction, using {@link Numbas.math.rationalApproximation}.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {number} n
 * @param {Numbas.jme.display.jme_display_settings} settings - Ff `settings.niceNumber===false`, don't round off numbers.
 * @returns {JME}
 */
var jmeRationalNumber = jme.display.jmeRationalNumber = function(n,settings)
{
    settings = settings || {};
    if(n.complex)
    {
        var re = jmeRationalNumber(n.re);
        var im = jmeRationalNumber(n.im);
        im += im.match(/\d$/) ? 'i' : '*i';
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
            if(n.im==-1) {
                return re+' - i';
            } else {
                return re+' - '+im.slice(1);
            }
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
            out = math.niceNumber(n,{style:'plain'});
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
        if(n<0 && out!='0')
            out='-'+out;
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
 * @param {Numbas.jme.display.jme_display_settings} settings - If `settings.niceNumber===false`, don't round off numbers.
 * @returns {JME}
 */
var jmeRealNumber = jme.display.jmeRealNumber = function(n,settings)
{
    settings = settings || {};
    if(n.complex)
    {
        var re = jmeRealNumber(n.re);
        var im = jmeRealNumber(n.im);
        im += im.match(/\d$/) ? 'i' : '*i';
        if(Math.abs(n.im)<1e-15) {
            return re;
        } 
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
                return re+' - '+im.slice(1);
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
        if((piD = math.piDegree(n,false)) > 0)
            n /= Math.pow(Math.PI,piD);
        var out;
        if(settings.niceNumber===false) {
            out = n+'';
            if(out.match(/e/)) {
                out = math.unscientific(out);
            }
        } else {
            out = math.niceNumber(n,{style:'plain'});
        }
        if(out.length>20) {
            if(Math.abs(n)<1e-15) {
                return '0';
            }
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

/** Write a {@link Numbas.jme.math.ComplexDecimal} in JME syntax.
 *
 * @memberof Numbas.jme.display
 * @private
 *
 * @param {Numbas.math.ComplexDecimal|Decimal} n
 * @param {Numbas.jme.display.jme_display_settings} settings - If `settings.niceNumber===false`, don't round off numbers.
 * @returns {JME}
 */
var jmeDecimal = jme.display.jmeDecimal = function(n,settings)
{
    settings = settings || {};
    if(n instanceof Numbas.math.ComplexDecimal) {
        var re = jmeDecimal(n.re);
        if(n.isReal()) {
            return re;
        } 
        var im = jmeDecimal(n.im)+'*i';
        if(n.re.isZero()) {
            if(n.im.eq(1))
                return 'i';
            else if(n.im.eq(-1))
                return '-i';
            else
                return im;
        } else if(n.im.lt(0)) {
            if(n.im.eq(-1))
                return re+' - i';
            else
                return re+' - '+im.slice(1);
        } else {
            if(n.im.eq(1))
                return re+' + i';
            else
                return re+' + '+im;
        }
    } else if(n instanceof Decimal) {
        var out = n.toString();
        if(n.absoluteValue().toNumber()<Infinity && ((n.isInteger() && n.absoluteValue().lt(Number.MAX_SAFE_INTEGER)) || n.decimalPlaces()<10)) {
            return out;
        }
        if(out.length>20) {
            out = n.toExponential();
        }
        return 'dec("'+out+'")';
    } else {
        return jmeRealNumber(n, settings);
    }
}

/** Dictionary of functions to turn {@link Numbas.jme.types} objects into JME strings.
 *
 * @enum
 * @memberof Numbas.jme.display
 */
var typeToJME = Numbas.jme.display.typeToJME = {
    'nothing': function(tree,tok,bits,settings) {
        return 'nothing';
    },
    'integer': function(tree,tok,bits,settings) {
        return settings.jmeNumber(tok.value,settings);
    },
    'rational': function(tree,tok,bits,settings) {
        var value = tok.value.reduced();
        var numerator = settings.jmeNumber(value.numerator,settings);
        if(value.denominator==1) {
            return numerator;
        } else {
            return numerator + '/' + settings.jmeNumber(value.denominator,settings);
        }
    },
    'decimal': function(tree,tok,bits,settings) {
        return jmeDecimal(tok.value,settings);
    },
    'number': function(tree,tok,bits,settings) {
        return settings.jmeNumber(tok.value,settings);
    },
    name: function(tree,tok,bits,settings) {
        return tok.name;
    },
    'string': function(tree,tok,bits,settings) {
        var str = '"'+jme.escape(tok.value)+'"';
        if(tok.latex && !settings.ignorestringattributes) {
            return 'latex('+str+')';
        } else if(tok.safe && !settings.ignorestringattributes) {
            return 'safe('+str+')';
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
        var args = tree.args;
        for(var i=0;i<args.length;i++) {
            var arg = args[i].tok;
            var isNumber = jme.isType(arg,'number');
            var arg_type = arg.type;
            var arg_value = arg.value;
            var pd;
            var arg_op = null;
            if(arg_type=='op') {
                arg_op = args[i].tok.name;
            } else if(isNumber && isComplex(arg)) {
                if(arg_value.re!=0) {
                    arg_op = arg_value.im<0 ? '-' : '+';   // implied addition/subtraction because this number will be written in the form 'a+bi'
                } else if(i==0 || arg_value.im!=1) {
                    arg_op = '*';   // implied multiplication because this number will be written in the form 'bi'
                }
            } else if(isNumber && (pd = math.piDegree(args[i].tok.value))>0 && arg_value/math.pow(Math.PI,pd)>1) {
                arg_op = '*';   // implied multiplication because this number will be written in the form 'a*pi'
            } else if(isNumber && bits[i].indexOf('/')>=0) {
                arg_op = '/';   // implied division because this number will be written in the form 'a/b'
            }
            var bracketArg = false;
            if(arg_op!=null) {
                if((jme.isOp(arg,'-u') || jme.isOp(arg,'+u')) && isComplex(args[i].args[0].tok)) {
                    arg_op = '+';
                }
                var j = i>0 ? 1 : 0;
                if(op in opBrackets) {
                    bracketArg = opBrackets[op][j][arg_op]==true || (tok.prefix && opBrackets[op][j][arg_op]===undefined);
                } else {
                    bracketArg = tok.prefix==true || tok.postfix==true;
                }
            }
            if(bracketArg) {
                bits[i] = '('+bits[i]+')';
                args[i].bracketed = true;
            }
        }
        var symbol = ' ';
        if(jmeOpSymbols[op]!==undefined) {
            symbol = jmeOpSymbols[op];
        } else if(args.length>1 && op.length>1) {
            symbol = ' '+op+' ';
        } else {
            symbol = op;
        }
        switch(op) {
        case '-u':
            if(isComplex(args[0].tok)) {
                return settings.jmeNumber(negated(args[0].tok),settings);
            }
            break;
        case '-':
            if(isComplex(args[1].tok) && hasRealPart(args[1].tok)) {
                bits[1] = settings.jmeNumber(conjugate(args[1].tok),settings);
            }
            break;
        case '*':
            //omit multiplication symbol when not necessary
            var s = bits[0];
            for(var i=1;i<args.length;i++) {
                //number or brackets followed by name or brackets doesn't need a times symbol
                //except <anything>*(-<something>) does
                var use_symbol = true;
                if(
                    !settings.alwaystimes && 
                    ((jme.isType(args[i-1].tok,'number') && !isComplex(args[i-1].tok) && math.piDegree(args[i-1].tok.value)==0 && args[i-1].tok.value!=Math.E) || args[i-1].bracketed) &&
                    (jme.isType(args[i].tok,'name') || args[i].bracketed && !(jme.isOp(tree.args[i].tok,'-u') || jme.isOp(tree.args[i].tok,'+u'))) 
                ) {
                    use_symbol = false;
                }
                if(use_symbol) {
                    s += symbol;
                }
                s += bits[i];
            }
            return s;
        }
        if(args.length==1) {
            return tok.postfix ? bits[0]+symbol : symbol+bits[0];
        } else {
            return bits[0]+symbol+bits[1];
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

jme.display.registerType = function(type, renderers) {
    var name = type.prototype.type;
    if(renderers.tex) {
        typeToTeX[name] = renderers.tex;
    }
    if(renderers.jme) {
        typeToJME[name] = renderers.jme;
    }
    if(renderers.displayString) {
        jme.typeToDisplayString[name] = renderers.displayString;
    }
}

/** Define how to render function in JME, for special cases when the normal rendering `f(...)` isn't right.
 *
 * @enum {Function}
 * @memberof Numbas.jme.display
 */
var jmeFunctions = jme.display.jmeFunctions = {
    'dict': typeToJME.dict,
    'fact': function(tree,tok,bits,settings) {
        if(jme.isType(tree.args[0].tok,'number') || tree.args[0].tok.type=='name') {
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
 *
 * @typedef Numbas.jme.display.jme_display_settings
 * @property {boolean} fractionnumbers - Show all numbers as fractions?
 * @property {boolean} niceNumber - Run numbers through {@link Numbas.math.niceNumber}?
 * @property {boolean} wrapexpressions - Wrap TExpression tokens in `expression("")`?
 * @property {boolean} ignorestringattributes - Don't wrap strings in functions for attributes like latex() and safe().
 * @property {number} accuracy - Accuracy to use when finding rational approximations to numbers. See {@link Numbas.math.rationalApproximation}.
 */

/** Turn a syntax tree back into a JME expression (used when an expression is simplified).
 *
 * @memberof Numbas.jme.display
 * @function
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.display.jme_display_settings} settings
 * @returns {JME}
 */
var treeToJME = jme.display.treeToJME = function(tree,settings)
{
    if(!tree)
        return '';
    settings = util.copyobj(settings || {}, true);

    if(jme.isOp(tree.tok,'*')) {
        // flatten nested multiplications, so a string of consecutive multiplications can be considered together
        tree = {tok: tree.tok, args: flatten(tree,'*')};
    }

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
 * Arrays consisting of one object for each argument of the operation.
 *
 * @enum
 * @memberof Numbas.jme.display
 * @private
 */
var opBrackets = Numbas.jme.display.opBrackets = {
    '+u':[{'+':true,'-':true,'*':false,'/':false}],
    '-u':[{'+':true,'-':true,'*':false,'/':false}],
    '+': [{},{}],
    '-': [{},{'+':true,'-':true}],
    '*': [{'+u':true,'+':true, '-':true, '/':true},{'+u':true,'-u':true,'+':true, '-':true, '/':true}],
    '/': [{'+u':true,'+':true, '-':true, '*':false},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
    '^': [{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true, '^': true},{'+u':true,'-u':true,'+':true, '-':true, '*':true, '/':true}],
    'and': [{'or':true, 'xor':true},{'or':true, 'xor':true}],
    'not': [{'and':true,'or':true,'xor':true}],
    'or': [{'xor':true},{'xor':true}],
    'xor':[{},{}],
    '=': [{},{}]
};

/** How to render operator symbols as JME.
 *
 * See `Numbas.jme.display.typeToJME.op`.
 *
 * @enum
 * @memberof Numbas.jme.display
 * @private
 */
var jmeOpSymbols = Numbas.jme.display.jmeOpSymbols = {
    '+u': '+',
    '-u': '-',
    'not': 'not ',
    'fact': '!',
    '+': ' + ',
    '-': ' - '
}


/** Align a series of blocks of text under a header line, connected to the header by ASCII line characters.
 *
 * @param {string} header
 * @param {Array.<string>} items
 * @returns {string}
 */
var align_text_blocks = jme.display.align_text_blocks = function(header,items) {
    /** Pad a line of text so it's in the centre of a line of length `n`.
     *
     * @param {string} line
     * @param {number} n
     * @returns {string}
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

/** Display a tree as a diagram using.
 *
 * @param {Numbas.jme.tree} tree
 * @returns {string}
 */
var tree_diagram = Numbas.jme.display.tree_diagram = function(tree) {
    switch(tree.tok.type) {
        case 'op':
        case 'function':
            var args = tree.args.map(function(arg){ return tree_diagram(arg); });
            return align_text_blocks(tree.tok.name, args);
        default:
            return treeToJME(tree);
    }
};

/** For backwards compatibility, copy references from some Numbas.jme.rules members to Numbas.jme.display.
 * These used to belong to Numbas.jme.display, but were moved into a separate file.
 */
['Rule','getTerms','matchTree','matchExpression','simplificationRules','compileRules'].forEach(function(name) {
    jme.display[name] = jme.rules[name];
});
});
