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
/** @file Sets up the JME compiler and evaluator.
 *
 * Provides {@link Numbas.jme}
 */
Numbas.queueScript('jme',['jme-base','jme-builtins','jme-rules'],function(){
    var jme = Numbas.jme;
    /** For backwards compatibility, copy references to some members of jme.rules to jme.
     * These items used to belong to Numbas.jme, but were spun out to Numbas.jme.rules.
     */
    ['displayFlags','Ruleset','collectRuleset'].forEach(function(name) {
        jme[name] = jme.rules[name];
    });
});
Numbas.queueScript('jme-base',['base','math','util'],function() {
var util = Numbas.util;
var math = Numbas.math;

/** A JME expression.
 *
 * @typedef JME
 * @type {string}
 * @see {@link https://docs.numbas.org.uk/en/latest/jme-reference.html}
 */

/** A string of TeX code.
 *
 * @typedef TeX
 * @type {string}
 */

/** @typedef Numbas.jme.tree
 * @type {object}
 * @property {Array.<Numbas.jme.tree>} args - The token's arguments (if it's an op or function).
 * @property {Numbas.jme.token} tok - The token at this node.
 */

/** @typedef {object} Numbas.jme.call_signature
 * @property {Numbas.jme.funcObj} fn - The function to call.
 * @property {Numbas.jme.signature} signature - The signature to use.
 */

/** A definition of a custom constant.
 *
 * @typedef Numbas.jme.constant_definition
 * @property {TeX} tex - A TeX rendering of the constant
 * @property {Numbas.jme.token} - The JME value of the constant.
 */


/** @namespace Numbas.jme */
var jme = Numbas.jme = /** @lends Numbas.jme */ {
    normaliseRulesetName: function(name) {
        return name.toLowerCase();
    },

    normaliseName: function(name, settings) {
        settings = settings || {caseSensitive: false};
        if(!settings.caseSensitive) {
            name = name.toLowerCase();
        }
        return name;
    },

    /** Escape a string so that it will be interpreted correctly by the JME parser.
     *
     * @param {string} str
     * @returns {string}
     * @see Numbas.jme.unescape
     */
    escape: function(str) {
        return str
            .replace(/\\/g,'\\\\')
            .replace(/\\([{}])/g,'$1')
            .replace(/\n/g,'\\n')
            .replace(/"/g,'\\"')
            .replace(/'/g,"\\'")
        ;
    },

    /** Wrapper around {@link Numbas.jme.Parser#compile}.
     *
     * @param {JME} expr
     * @see Numbas.jme.Parser#compile
     * @returns {Numbas.jme.tree}
     */
    compile: function(expr) {
        return jme.standardParser.compile(expr);
    },

    /** Options for a JME operator.
     *
     * @typedef {object} Numbas.jme.operatorOptions
     * @property {Array.<string>} synonyms - Synonyms for this operator. See {@link Numbas.jme.opSynonyms}.
     * @property {number} precedence - An operator with lower precedence is evaluated before one with high precedence. Only makes sense for binary operators. See {@link Numbas.jme.precedence}.
     * @property {boolean} commutative - Is this operator commutative? Only makes sense for binary operators.
     * @property {boolean} rightAssociative - Is this operator right-associative? Only makes sense for unary operators.
     */

    /** Add a binary operator to the standard parser.
     *
     * @param {string} name
     * @param {Numbas.jme.operatorOptions} options
     */
    addBinaryOperator: function(name,options) {
        jme.standardParser.addBinaryOperator(name,options);
    },

    /** Add a prefix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPrefixOperator: function(name,alt,options) {
        jme.standardParser.addPrefixOperator(name,alt,options);
    },

    /** Add a postfix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPostfixOperator: function(name,alt,options) {
        jme.standardParser.addPostfixOperator(name,alt,options);
    },


    /** Wrapper around {@link Numbas.jme.Parser#tokenise}.
     *
     * @param {JME} expr
     * @see Numbas.jme.Parser#tokenise
     * @returns {Numbas.jme.token[]}
     */
    tokenise: function(expr) {
        return jme.standardParser.tokenise(expr);
    },

    /** Wrapper around {@link Numbas.jme.Parser#shunt}.
     *
     * @param {Numbas.jme.token[]} tokens
     * @see Numbas.jme.Parser#shunt
     * @returns {Numbas.jme.tree}
     */
    shunt: function(tokens) {
        return jme.standardParser.shunt(expr);
    },

    /** Unescape a string - backslashes escape special characters.
     *
     * @param {string} str
     * @returns {string}
     * @see Numbas.jme.escape
     */
    unescape: function(str) {
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
        return estr;
    },
    /** Substitute variables defined in `scope` into the given syntax tree (in place).
     *
     * @param {Numbas.jme.tree} tree
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} [allowUnbound=false] - Allow unbound variables to remain in the returned tree.
     * @param {boolean} [unwrapExpressions=false] - Unwrap TExpression tokens?
     * @returns {Numbas.jme.tree}
     */
    substituteTree: function(tree,scope,allowUnbound,unwrapExpressions)
    {
        if(!tree) {
            return null;
        }
        if(tree.tok.bound) {
            return tree;
        }
        if(tree.args===undefined) {
            if(tree.tok.type=='name') {
                var name = jme.normaliseName(tree.tok.name, scope);
                var v = scope.getVariable(name);
                if(v===undefined) {
                    var c = scope.getConstant(name);
                    if(c) {
                        return {tok: c.value};
                    }
                    if(allowUnbound) {
                        return {tok: new TName(tree.tok.nameWithoutAnnotation,tree.tok.annotation)};
                    } else {
                        throw new Numbas.Error('jme.substituteTree.undefined variable',{name:name});
                    }
                } else {
                    if(v.tok) {
                        return v;
                    } else if(unwrapExpressions && v.type=='expression') {
                        return v.tree;
                    } else {
                        return {tok: v};
                    }
                }
            } else {
                return tree;
            }
        } else if((tree.tok.type=='function' || tree.tok.type=='op') && tree.tok.name in substituteTreeOps) {
            tree = {tok: tree.tok,
                    args: tree.args.slice()};
            substituteTreeOps[tree.tok.name](tree,scope,allowUnbound,unwrapExpressions);
            return tree;
        } else {
            tree = {
                tok: tree.tok,
                args: tree.args.slice()
            };
            for(var i=0;i<tree.args.length;i++) {
                tree.args[i] = jme.substituteTree(tree.args[i],scope,allowUnbound,unwrapExpressions);
            }
            return tree;
        }
    },
    /** Evaluate a syntax tree (or string, which is compiled to a syntax tree), with respect to the given scope.
     *
     * @param {Numbas.jme.tree|string} tree
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.token}
     */
    evaluate: function(tree,scope)
    {
        if(!scope) {
            throw(new Numbas.Error('jme.evaluate.no scope given'));
        }
        return scope.evaluate(tree);
    },
    /** Compile a list of expressions, separated by commas.
     *
     * @param {JME} expr
     * @see Numbas.jme.tokenise
     * @see Numbas.jme.shunt
     * @returns {Numbas.jme.tree[]}
     */
    compileList: function(expr) {
        expr+='';    //make sure expression is a string and not a number or anything like that
        if(!expr.trim().length)
            return null;
        //typecheck
        //tokenise expression
        var tokens = jme.tokenise(expr);
        var bits = [];
        var brackets = [];
        var start = 0;
        for(var i=0;i<tokens.length;i++) {
            switch(tokens[i].type) {
                case '(':
                case '[':
                    brackets.push(tokens[i]);
                    break;
                case ')':
                    if(!brackets.length || brackets.pop().type!='(') {
                        throw(new Numbas.Error('jme.compile list.mismatched bracket'));
                    }
                    break;
                case ']':
                    if(!brackets.length || brackets.pop().type!='[') {
                        throw(new Numbas.Error('jme.compile list.mismatched bracket'));
                    }
                    break;
                case ',':
                    if(brackets.length==0) {
                        bits.push(tokens.slice(start,i));
                        start = i+1;
                    }
                    break;
            }
        }
        if(brackets.length) {
            throw(new Numbas.Error('jme.compile list.missing right bracket'));
        }
        bits.push(tokens.slice(start));
        //compile to parse tree
        var trees = bits.map(function(b){return jme.shunt(b)});
        return trees;
    },
    /** Settings for {@link Numbas.jme.compare}.
     *
     * @typedef {object} Numbas.jme.compare_settings
     * @property {string} checkingType - The name of the method to determine if two results are equal. See {@link Numbas.jme.checkingFunctions}.
     * @property {number} vsetRangeStart - The lower bound of the range to pick variable values from.
     * @property {number} vsetRangeEnd - The upper bound of the range to pick variable values from.
     * @property {number} vsetRangePoints - The number of values to pick for each variable.
     * @property {number} checkingAccuracy - A parameter for the checking function to determine if two results are equal. See {@link Numbas.jme.checkingFunctions}.
     * @property {number} failureRate - The number of times the comparison must fail to declare that the expressions are unequal.
     * @property {boolean} sameVars - If true, then both expressions should have exactly the same free variables.
     */
    /** Compare two expressions over some randomly selected points in the space of variables, to decide if they're equal.
     *
     * @param {JME} tree1
     * @param {JME} tree2
     * @param {Numbas.jme.compare_settings} settings
     * @param {Numbas.jme.Scope} scope
     * @returns {boolean}
     */
    compare: function(tree1,tree2,settings,scope) {
        var default_settings = {
            vsetRangeStart: 0,
            vsetRangeEnd: 1,
            vsetRangePoints: 5,
            checkingType: 'absdiff',
            checkingAccuracy: 0.0001,
            failureRate: 1
        }
        settings = util.extend_object({},default_settings,settings);
        var checkingFunction = checkingFunctions[settings.checkingType.toLowerCase()];    //work out which checking type is being used
        try {
            if(tree1 == null || tree2 == null) {    
                //one or both expressions are invalid, can't compare
                return false;
            }
            //find variable names used in both expressions - can't compare if different
            var vars1 = findvars(tree1,[],scope);
            var vars2 = findvars(tree2,[],scope);
            for(var v in scope.allVariables()) {
                delete vars1[v];
                delete vars2[v];
            }
            if(settings.sameVars) {
                if( !varnamesAgree(vars1,vars2) ) {    //whoops, differing variables
                    return false;
                }
            } else { 
                vars2.forEach(function(n) {
                    if(vars1.indexOf(n)==-1) {
                        vars1.push(n);
                    }
                });
            }
            var hasNames = vars1.length > 0;
            var numRuns = hasNames ? settings.vsetRangePoints: 1;
            var failureRate = hasNames ? settings.failureRate : 1;
            // if variables are used,  evaluate both expressions over a random selection of values and compare results
            var errors = 0;
            var rs = randoms(vars1, settings.vsetRangeStart, settings.vsetRangeEnd, numRuns);
            for(var i = 0; i<rs.length; i++) {
                var nscope = new jme.Scope([scope,{variables:rs[i]}]);
                var r1 = nscope.evaluate(tree1);
                var r2 = nscope.evaluate(tree2);
                if( !resultsEqual(r1,r2,checkingFunction,settings.checkingAccuracy,scope) ) { 
                    errors++; 
                }
            }
            return errors < failureRate;
        } catch(e) {
            return false;
        }
    },
    /** Substitute variables into a string. To substitute variables into an HTML element, use {@link Numbas.jme.variables.DOMcontentsubvars}.
     *
     * @param {string} str
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} [sub_tex=false] - Substitute into TeX? Normally this is left to MathJax.
     * @returns {string}
     */
    contentsubvars: function(str, scope, sub_tex)
    {
        var bits = util.contentsplitbrackets(str);    //split up string by TeX delimiters. eg "let $X$ = \[expr\]" becomes ['let ','$','X','$',' = ','\[','expr','\]','']
        for(var i=0; i<bits.length; i+=4) {
            bits[i] = jme.subvars(bits[i],scope,true);
            if(sub_tex && i+3<bits.length) {
                var tbits = jme.texsplit(bits[i+2]);
                var out = '';
                for(var j=0;j<tbits.length;j+=4) {
                    out += tbits[j];
                    if(j+3<tbits.length) {
                        var cmd = tbits[j+1];
                        var rules = jme.collectRuleset(tbits[j+2], scope.allRulesets());
                        var expr = tbits[j+3];
                        switch(cmd) {
                        case 'var':
                            var v = scope.evaluate(expr);
                            var tex = jme.display.texify({tok: v}, rules, scope);
                            out += '{'+tex+'}';
                            break;
                        case 'simplify':
                            expr = jme.subvars(expr,scope);
                            out += '{'+jme.display.exprToLaTeX(expr,rules,scope)+'}';
                            break;
                        }
                    }
                }
                bits[i+2] = out;
            }
        }
        return bits.join('');
    },
    /** Split up a TeX expression, finding the \var and \simplify commands.
     * Returns an array `[normal tex,var or simplify,options,argument,normal tex,...]`.
     *
     * @param {string} s
     * @returns {Array.<string>}
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
                    throw(new Numbas.Error('jme.texsubvars.no right bracket',{op:cmd}));
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
                throw(new Numbas.Error('jme.texsubvars.missing parameter',{op:cmd,parameter:s}));
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
                throw(new Numbas.Error('jme.texsubvars.no right brace',{op:cmd}));
            var expr = s.slice(si,i);
            s = s.slice(i+1);
            out.push(expr);
        }
        out.push(s);
        return out;
    },
    /** Dictionary of functions which convert a JME token to a string for display.
     *
     * @enum {Function}
     */
    typeToDisplayString: {
        'number': function(v,scope) {
            var jmeifier = new Numbas.jme.display.JMEifier({},scope);
            return jmeifier.niceNumber(v.value);
        },
        'rational': function(v) {
            var f = v.value.reduced();
            return f.toString();
        },
        'decimal': function(v) {
            var d = v.value;
            var re = d.re.toString();
            if(d.isReal()) {
                return re;
            }
            var im = d.im.absoluteValue().toString();
            if(d.im.lessThan(0)) {
                return re + ' - '+im+'i';
            } else {
                return re + ' + '+im+'i';
            }
        },
        'string': function(v,display) {
            return v.value;
        },
        'html': function(v) {
            v = v.value;
            if(window.jQuery) {
                v = v.toArray();
            }
            return v.map(function(e){return e.outerHTML;}).join('');
        }
    },
    /** Produce a string representation of the given token, for display.
     *
     * @param {Numbas.jme.token} v
     * @param {Numbas.jme.Scope} scope
     * @see Numbas.jme.typeToDisplayString
     * @returns {string}
     */
    tokenToDisplayString: function(v,scope) {
        if(v.type in jme.typeToDisplayString) {
            return jme.typeToDisplayString[v.type](v,scope);
        } else {
            return jme.display.treeToJME({tok:v},{},scope);
        }
    },
    /** Substitute variables into a text string (not maths).
     *
     * @param {string} str
     * @param {Numbas.jme.Scope} scope
     * @param {boolean} [display=false] - Is this string going to be displayed to the user? If so, avoid unnecessary brackets and quotes.
     * @returns {string}
     */
    subvars: function(str, scope,display)
    {
        var bits = util.splitbrackets(str,'{','}','(',')');
        if(bits.length==1)
        {
            return str;
        }
        var out = '';
        for(var i=0; i<bits.length; i++)
        {
            if(i % 2)
            {
                try {
                    var tree = scope.parser.compile(bits[i]);
                } catch(e) {
                    throw(new Numbas.Error('jme.subvars.error compiling',{message: e.message, expression: bits[i]},e));
                }
                var v = scope.evaluate(tree);
                if(v===null) {
                    throw(new Numbas.Error('jme.subvars.null substitution',{str:str}));
                }
                if(display) {
                    v = jme.tokenToDisplayString(v,scope);
                } else {
                    if(jme.isType(v,'number')) {
                        v = '('+Numbas.jme.display.treeToJME({tok:v},{nicenumber: false, noscientificnumbers: true},scope)+')';
                    } else if(v.type=='string') {
                        v = "'"+v.value+"'";
                    } else {
                        v = jme.display.treeToJME({tok:v},{nicenumber: false, noscientificnumbers: true},scope);
                    }
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
    /** Unwrap a {@link Numbas.jme.token} into a plain JavaScript value.
     *
     * @param {Numbas.jme.token} v
     * @returns {object}
     */
    unwrapValue: function(v) {
        switch(v.type) {
            case 'list':
                return v.value.map(jme.unwrapValue);
            case 'dict':
                var o = {};
                Object.keys(v.value).forEach(function(key) {
                    o[key] = jme.unwrapValue(v.value[key]);
                });
                return o;
            case 'name':
                return v.name;
            case 'expression':
                return v.tree;
            case 'nothing':
                return undefined;
            default:
                return v.value;
        }
    },

    /** Mark a token as 'safe', so it doesn't have {@link Numbas.jme.subvars} applied to it, or any strings it contains, when it's evaluated.
     *
     * @param {Numbas.jme.token} t
     * @returns {Numbas.jme.token}
     */
    makeSafe: function(t) {
        if(!t) {
            return t;
        }
        switch(t.type) {
            case 'string':
                t.safe = true;
                var t2 = new TString(t.value);
                if(t.latex!==undefined) {
                    t2.latex = t.latex;
                }
                t2.safe = true;
                return t2;
            case 'list':
                return new TList(t.value.map(jme.makeSafe));
            case 'dict':
                var o = {};
                for(var x in t.value) {
                    o[x] = jme.makeSafe(t.value[x]);
                }
                return new TDict(o);
            default:
                return t;
        }
    },

    /** Wrap up a plain JavaScript value (number, string, bool or array) as a {@link Numbas.jme.token}.
     *
     * @param {object} v
     * @param {string} typeHint - Name of the expected type (to differentiate between, for example, matrices, vectors and lists.
     * @returns {Numbas.jme.token}
     */
    wrapValue: function(v,typeHint) {
        switch(typeof v) {
        case 'number':
            return new jme.types.TNum(v);
        case 'string':
            var s = new jme.types.TString(v);
            s.safe = true;
            return s;
        case 'boolean':
            return new jme.types.TBool(v);
        default:
            switch(typeHint) {
                case 'html':
                    return v;
                default:
                    if(Array.isArray(v)) {
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
                    } else if(v instanceof math.ComplexDecimal) {
                        return new jme.types.TDecimal(v);
                    } else if(v instanceof Decimal) {
                        return new jme.types.TDecimal(v);
                    } else if(v instanceof math.Fraction) {
                        return new jme.types.TRational(v);
                    } else if(v===null || v===undefined) { // CONTROVERSIAL! Cast null to the empty string, because we don't have a null type.
                        return new jme.types.TString('');
                    } else if(v!==null && typeof v=='object' && v.type===undefined) {
                        var o = {};
                        Object.keys(v).forEach(function(key) {
                            o[key] = jme.wrapValue(v[key]);
                        });
                        return new jme.types.TDict(o);
                    }
                    return v;
            }
        }
    },
    /** Is a token of the given type, or can it be automatically cast to the given type?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} type
     * @returns {boolean}
     */
    isType: function(tok,type) {
        if(!tok) {
            return false;
        }
        if(tok.type==type) {
            return true;
        }
        if(tok.casts) {
            return tok.casts[type]!==undefined;
        }
        return false;
    },
    /** Cast a token to the given type, if possible.
     * 
     * @param {Numbas.jme.token} tok
     * @param {string|object} type
     * @returns {Numbas.jme.token}
     */
    castToType: function(tok,type) {
        var typeDescription = {};
        if(typeof(type)=='object') {
            typeDescription = type;
            type = typeDescription.type;
        }
        var ntok;
        if(tok.type!=type) {
            if(!tok.casts || !tok.casts[type]) {
                throw(new Numbas.Error('jme.type.no cast method',{from: tok.type, to: type}));
            }
            ntok = tok.casts[type](tok);
        } else {
            ntok = tok;
        }
        if(type=='dict' && typeDescription.items) {
            ntok = new TDict(ntok.value);
            for(var x in typeDescription.items) {
                ntok.value[x] = jme.castToType(ntok.value[x],typeDescription.items[x]);
            }
        }
        if(type=='list' && typeDescription.items) {
            var nvalue = [];
            var j = 0;
            for(var i=0;i<typeDescription.items.length;i++) {
                if(typeDescription.items[i].missing) {
                    nvalue.push(new TNothing());
                    continue;
                }
                var item = ntok.value[j];
                nvalue.push(jme.castToType(item, typeDescription.items[i]));
                j += 1;
            }
            ntok = new TList(nvalue);
        }
        return ntok;
    },
    /** Can type `a` be automatically cast to type `b`?
     *
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    isTypeCompatible: function(a,b) {
        if(b===undefined) {
            return true;
        }
        if(a==b) {
            return true;
        }
        var ta = jme.types[a];
        return ta && ta.prototype && ta.prototype.casts && ta.prototype.casts[b];
    },
    /** Find a type that both types `a` and `b` can be automatically cast to, or return `undefined`.
     *
     * @param {string} a
     * @param {string} b
     * @returns {string}
     */
    findCompatibleType: function(a,b) {
        a = jme.types[a];
        b = jme.types[b];
        if(a===undefined || b===undefined) {
            return undefined;
        }
        a = a.prototype;
        b = b.prototype;
        if(a.type==b.type) {
            return a.type;
        }
        if(a.casts) {
            if(a.casts[b.type]) {
                return b.type;
            }
            if(b.casts) {
                if(b.casts[a.type]) {
                    return a.type;
                }
                for(var x in a.casts) {
                    if(b.casts[x]) {
                        return x;
                    }
                }
            }
        } else if(b.casts) {
            if(b.casts[a.type]) {
                return a.type;
            }
        }
    },
    /** Is a token an operator with the given name?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} op
     *
     * @returns {boolean}
     */
    isOp: function(tok,op) {
        return tok.type=='op' && tok.name==op;
    },
    /** Is a token the given name?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} name
     *
     * @returns {boolean}
     */
    isName: function(tok,name) {
        return tok.type=='name' && tok.name==name;
    },
    /** Is a token a function with the given name?
     *
     * @param {Numbas.jme.token} tok
     * @param {string} name
     *
     * @returns {boolean}
     */
    isFunction: function(tok,name) {
        return tok.type=='function' && tok.name==name;
    },
    /** Does this expression behave randomly?
     * True if it contains any instances of functions or operations, defined in the given scope, which could behave randomly.
     *
     * @param {Numbas.jme.tree} expr
     * @param {Numbas.jme.Scope} scope
     * @returns {boolean}
     */
    isRandom: function(expr,scope) {
        switch(expr.tok.type) {
            case 'op':
            case 'function':
                // a function application is random if its definition is marked as random,
                // or if any of its arguments are random
                var op = jme.normaliseName(expr.tok.name, scope);
                var fns = scope.getFunction(op);
                if(fns) {
                    for(var i=0;i<fns.length;i++) {
                        var fn = fns[i]
                        if(fn.random===undefined && fn.language=='jme') {
                            fn.random = false; // put false in to avoid infinite recursion if fn is defined in terms of another function which itself uses fn
                            fn.random = jme.isRandom(fn.tree,scope);
                        }
                        if(fn.random) {
                            return true;
                        }
                    }
                }
                for(var i=0;i<expr.args.length;i++) {
                    if(jme.isRandom(expr.args[i],scope)) {
                        return true;
                    }
                }
                return false;
            default:
                if(!expr.args) {
                    return false;
                }
                for(var i=0;i<expr.args.length;i++) {
                    if(jme.isRandom(expr.args[i],scope)) {
                        return true;
                    }
                }
                return false;
        }
    },

    /** Is this a monomial - a single term of the form x^n or m*x^n, where m and n are numbers?
     *
     * @param {Numbas.jme.tree} tree
     * @returns {object} The base, degree and coefficient of the monomial, as trees.
     */
    isMonomial: function(tree) {
        /** Remove unary minuses from the top of the tree.
         *
         * @param {Numbas.jme.tree} tree
         * @returns {Numbas.jme.tree}
         */
        function unwrapUnaryMinus(tree) {
            while(jme.isOp(tree.tok,'-u')) {
                tree = tree.args[0];
            }
            return tree;
        }
        var coefficient;
        if(jme.isOp(tree.tok,'*')) {
            if(!jme.isType(unwrapUnaryMinus(tree.args[0]).tok,'number')) {
                return false;
            }
            coefficient = tree.args[0];
            tree = tree.args[1];
        } else if(jme.isOp(tree.tok,'-u')) {
            coefficient = {tok:new TNum(-1)};
            tree = tree.args[0];
        } else {
            coefficient = {tok:new TNum(1)};
        }
        if(tree.tok.type=='name') {
            return {base:tree, degree:{tok:new TInt(1)}, coefficient: coefficient};
        }
        if(jme.isOp(tree.tok,'^') && jme.isType(tree.args[0].tok,'name') && jme.isType(unwrapUnaryMinus(tree.args[1]).tok,'number')) {
            return {base:tree.args[0], degree:tree.args[1], coefficient: coefficient};
        }
        return false;
    },

    /**
     * Cast a list of arguments to match a function signature.
     *
     * @param {Array.<Numbas.jme.signature_grammar_match>} signature - A list of either types to cast to, or 'missing', representing a space that should be fillined in with 'nothing'.
     * @param {Array.<Numbas.jme.token>} args - The arguments to the function.
     * @returns {Array.<Numbas.jme.token>}
     */
    castArgumentsToSignature: function(signature,args) {
        var castargs = [];
        var j = 0;
        for(var i=0;i<signature.length;i++) {
            if(signature[i].missing) {
                castargs.push(new TNothing());
                continue;
            }
            var arg = args[j];
            if(signature[i]) {
                castargs.push(jme.castToType(arg,signature[i])); 
            } else {
                castargs.push(arg);
            }
            j += 1;
        }
        return castargs;
    }
};

/** Options for {@link Numbas.jme.Parser}
 *
 * @typedef {object} Numbas.jme.parser_options
 * @property {boolean} closeMissingBrackets - Silently ignore "missing right bracket" errors?
 * @property {boolean} addMissingArguments - When an op or function call is missing required arguments, insert `?` as a placeholder.
 */

/** A parser for {@link JME} expressions.
 *
 * @memberof Numbas.jme
 * @class
 * 
 * @param {Numbas.jme.parser_options} options
 */
var Parser = jme.Parser = function(options) {
    this.options = util.extend_object({}, this.option_defaults, options);
    this.ops = this.ops.slice();
    this.re = util.extend_object({},this.re);
    this.tokeniser_types = this.tokeniser_types.slice();
    this.constants = {};
    this.prefixForm = {};
    this.postfixForm = {};
    this.arity = {};
    this.precedence = {};
    this.relations = {};
    this.commutative = {};
    this.associative = {};
    this.funcSynonyms = {};
    this.opSynonyms = {};
    this.rightAssociative = {};
    this.make_re();
}
jme.Parser.prototype = /** @lends Numbas.jme.Parser.prototype */ {
    /** Default options for new parsers.
     *
     * @type {Numbas.jme.parser_options}
     */
    option_defaults: {
        closeMissingBrackets: false,
        addMissingArguments: false
    },

    /** There are many dictionaries storing definitions of things like constants and alternate names, which are defined both globally in Numbas.jme and locally in a Parser.
     * This is a wrapper to load the value of the setting if it exists, and return `undefined` otherwise.
     *
     * @param {string} setting - The name of the dictionary. Both `this` and of `Numbas.jme` must have members with this name.
     * @param {string} name - The name of the setting to try to load from the dictionary.
     * @returns {*}
     */
    getSetting: function(setting,name) {
        if(name in this[setting]) {
            return this[setting][name];
        }
        if(name in jme[setting]) {
            return jme[setting][name];
        }
        return undefined;
    },

    /** If the given name is defined as a constant, return its value, otherwise return `undefined`.
     *
     * @param {string} name
     * @returns {number}
     */
    getConstant: function(name) { return this.getSetting('constants',name); },

    /** If the given operator name has a defined prefix form, return it, otherwise return `undefined`.
     *
     * @param {string} name
     * @returns {string}
     */
    getPrefixForm: function(name) { return this.getSetting('prefixForm',name); },

    /** If the given operator name has a defined postfix form, return it, otherwise return `undefined`.
     *
     * @param {string} name
     * @returns {string}
     */
    getPostfixForm: function(name) { return this.getSetting('postfixForm',name); },

    /** Get the arity of the given operator.
     *
     * @param {string} name
     * @returns {number}
     */
    getArity: function(name) { return this.getSetting('arity',name) || 2; },

    /** Get the precedence of the given operator.
     *
     * @param {string} name
     * @returns {number}
     */
    getPrecedence: function(name) { return this.getSetting('precedence',name); },

    /** Is the given operator a relation?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isRelation: function(name) { return this.getSetting('relations',name) || false; },

    /** Is the given operator commutative?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isCommutative: function(name) { return this.getSetting('commutative',name) || false; },

    /** Is the given operator associative?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isAssociative: function(name) { return this.getSetting('associative',name) || false; },

    /** Is the given operator right-associative?
     *
     * @param {string} name
     * @returns {boolean}
     */
    isRightAssociative: function(name) { return this.getSetting('rightAssociative',name) || false; },

    /** If the given function name has a synonym, use it, otherwise return the original name.
     *
     * @see Numbas.jme.funcSynonyms
     * @param {string} name
     * @returns {string}
     */
    funcSynonym: function(name) { return this.getSetting('funcSynonyms',name) || name; },

    /** If the given operator name has a synonym, use it, otherwise return the original name.
     *
     * @see Numbas.jme.opSynonyms
     * @param {string} name
     * @returns {string}
     */
    opSynonym: function(name) { return this.getSetting('opSynonyms',name) || name; },

    /** Binary operations.
     * 
     * @type {Array.<string>}
     */
    ops: ['not','and','or','xor','implies','isa','except','in','divides','as','..','#','<=','>=','<>','&&','||','|','*','+','-','/','^','<','>','=','!','&','÷','×','∈','∧','∨','¬','⟹','≠','≥','≤','ˆ'],

    /** Superscript characters, and their normal-script replacements.
     * 
     * @type {Array.<string>}
     */
    superscript_replacements: [
        '0123456789()+-=ni',
        '⁰¹²³⁴⁵⁶⁷⁸⁹⁽⁾⁺⁻⁼ⁿⁱ'
    ],

    /** Regular expressions to match tokens.
     *
     * @type {object.<RegExp>}
     */
    re: {
        re_bool: /^(true|false)(?![a-zA-Z_0-9'])/i,
        re_integer: /^[0-9]+(?!\x2E|[0-9])/,
        re_number: /^[0-9]+(?:\x2E[0-9]+)?/,
        re_name: /^{?((?:(?:[a-zA-Z]+):)*)((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?\??|[π∞])}?/i,
        re_punctuation: /^([\(\),\[\]])/,
        re_string: util.re_jme_string,
        re_comment: /^\/\/.*?(?:\n|$)/,
        re_keypair: /^:/,
    },

    /** Set properties for a given operator.
     *
     * @param {string} name - The name of the operator.
     * @param {Numbas.jme.operatorOptions} options
     */
    setOperatorProperties: function(name,options) {
        if(!options) {
            return;
        }
        if('precedence' in options) {
            this.precedence[name] = options.precedence;
        }
        if('synonyms' in options) {
            options.synonyms.forEach(function(synonym) {
                if(opSynonyms[synonym]===undefined) {
                    this.opSynonyms[synonym] = name;
                }
            });
        }
        if(options.rightAssociative) {
            this.rightAssociative[name] = true;
        }
        if(options.commutative) {
            this.commutative[name] = true;
        }
    },

    addTokenType: function(re,parse) {
        this.tokeniser_types.splice(0,0,{re:re,parse:parse});
    },

    /** Add an operator to the parser.
     *
     * @param {string} name
     * @see Numbas.jme.Parser#addBinaryOperator
     * @see Numbas.jme.Parser#addPrefixOperator
     * @see Numbas.jme.Parser#addPostfixOperator
     */
    addOperator: function(name) {
        if(this.ops.contains(name)) {
            return;
        }
        this.ops.push(name);
        this.make_re();
    },

    /** Add a binary operator to the parser.
     *
     * @param {string} name
     * @param {Numbas.jme.operatorOptions} options
     */
    addBinaryOperator: function(name,options) {
        this.addOperator(name);
        this.setOperatorProperties(name,options);
    },

    /** Add a prefix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPrefixOperator: function(name,alt,options) {
        this.addOperator(name);
        alt = alt || name;
        this.prefixForm[name] = alt;
        this.arity[alt] = 1;
        this.setOperatorProperties(alt,options);
    },

    /** Add a postfix operator to the parser.
     *
     * @param {string} name
     * @param {string} alt - The "interpreted" name of the operator, e.g. '!' is interpreted as 'fact'. If not given, the value of `name` is used.
     * @param {Numbas.jme.operatorOptions} options
     */
    addPostfixOperator: function(name,alt,options) {
        this.addOperator(name);
        alt = alt || name;
        this.postfixForm[name] = alt;
        this.arity[alt] = 1;
        this.setOperatorProperties(alt,options);
    },

    /** Create an operator token with the given name.
     *
     * @param {string} name - The name of the operator.
     * @param {boolean} postfix - Is the operator postfix?
     * @param {boolean} prefix - Is the operator prefix?
     * @returns {Numbas.jme.token}
     */
    op: function(name,postfix,prefix) {
        var arity = this.getArity(name);
        var commutative = arity>1 && this.isCommutative(name);
        var associative = arity>1 && this.isAssociative(name);

        return new TOp(name,postfix,prefix,arity,commutative,associative);
    },

    /** Descriptions of kinds of token that the tokeniser can match.
     * `re` is a regular expression matching the token.
     * `parse` is a function which takes a RegEx match object, the tokens produced up to this point, the input expression, and the current position in the expression.
     * It should return an object `{tokens, start, end}`.
     */
    tokeniser_types: [
        {
            re: 're_strip_whitespace',
            parse: function(result,tokens,expr,pos) {
                return {tokens: [], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_comment',
            parse: function(result,tokens,expr,pos) {
                return {tokens: [], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_integer',
            parse: function(result,tokens,expr,pos) {
                var token = new TInt(result[0]);
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(prev.type==')' || prev.type=='name') {    //right bracket followed by a number is interpreted as multiplying contents of brackets by number
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_number',
            parse: function(result,tokens,expr,pos) {
                var token = new TNum(result[0]);
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(prev.type==')' || prev.type=='name') {    //right bracket followed by a number is interpreted as multiplying contents of brackets by number
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_bool',
            parse: function(result,tokens,expr,pos) {
                var token = new TBool(util.parseBool(result[0]));
                return {tokens: [token], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_op',
            parse: function(result,tokens,expr,pos) {
                var matched_name = result[0];
                var name = jme.normaliseName(matched_name, this.options);
                var nt;
                var postfix = false;
                var prefix = false;
                name = this.opSynonym(name);
                if( tokens.length==0 || (nt=tokens[tokens.length-1].type)=='(' || nt==',' || nt=='[' || (nt=='op' && !tokens[tokens.length-1].postfix) || nt=='keypair' ) {
                    var prefixForm = this.getPrefixForm(name);
                    if(prefixForm!==undefined) {
                        name = prefixForm;
                        prefix = true;
                    }
                } else {
                    var postfixForm = this.getPostfixForm(name);
                    if(postfixForm !== undefined) {
                        name = postfixForm;
                        postfix = true;
                    }
                }
                var token = this.op(name,postfix,prefix);
                return {tokens: [token], start: pos, end: pos+matched_name.length};
            }
        },
        {
            re: 're_name',
            parse: function(result,tokens,expr,pos) {
                var name = result[2];
                var annotation = result[1] ? result[1].split(':').slice(0,-1) : null;
                var token;
                if(!annotation) {
                    var lname = jme.normaliseName(name, this.options);
                    token = new TName(name);
                } else {
                    token = new TName(name,annotation);
                }
                var new_tokens = [token];
                if(tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,'number') || jme.isType(prev,'name') || jme.isType(prev,')')) {    //number or right bracket or name followed by a name, eg '3y', is interpreted to mean multiplication, eg '3*y'
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_punctuation',
            parse: function(result,tokens,expr,pos) {
                var new_tokens = [new TPunc(result[0])];
                if(result[0]=='(' && tokens.length>0) {
                    var prev = tokens[tokens.length-1];
                    if(jme.isType(prev,'number') || jme.isType(prev,')')) {    //number or right bracket followed by left parenthesis is also interpreted to mean multiplication
                        new_tokens.splice(0,0,this.op('*'));
                    }
                }
                return {tokens: new_tokens, start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_string',
            parse: function(result,tokens,expr,pos) {
                var str = result[2];
                var token = new TString(jme.unescape(str));
                return {tokens: [token], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_keypair',
            parse: function(result,tokens,expr,pos) {
                if(tokens.length==0 || !(tokens[tokens.length-1].type=='string' || tokens[tokens.length-1].type=='name')) {
                    throw(new Numbas.Error('jme.tokenise.keypair key not a string',{type: tokens[tokens.length-1].type}));
                }
                var token = new TKeyPair(tokens.pop().value);
                return {tokens: [token], start: pos, end: pos+result[0].length};
            }
        },
        {
            re: 're_superscript',
            parse: function(result, tokens, expr, pos) {
                var normals = this.superscript_replacements[0];
                var superscripts = this.superscript_replacements[1];
                var n = result[0].replace(/./g, function(d) { return normals[superscripts.indexOf(d)]; });
                var tokens = this.tokenise(n); 
                return {tokens: [this.op('^'), new TPunc('(')].concat(tokens).concat([new TPunc(')')]), start: pos, end: pos+result[0].length};
            }
        }
    ],


    /** Update regular expressions for matching tokens.
     *
     * @see Numbas.jme.Parser#re
     */
    make_re: function() {
        /** Put operator symbols in reverse length order (longest first), and escape regex punctuation.
         *
         * @param {Array.<string>} ops
         * @returns {Array.<string>} ops
         */
        function clean_ops(ops) {
            return ops.sort().reverse().map(function(op) {
                return op.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
            });
        };
        var word_ops = clean_ops(this.ops.filter(function(o){return o.match(/[a-zA-Z0-9_']$/); }));
        var other_ops = clean_ops(this.ops.filter(function(o){return !o.match(/[a-zA-Z0-9_']$/); }));
        var any_op_bits = [];
        if(word_ops.length) {
            any_op_bits.push('(?:'+word_ops.join('|')+')(?![a-zA-Z0-9_\'])');
        }
        if(other_ops.length) {
            any_op_bits.push('(?:'+other_ops.join('|')+')');
        }
        var re_op_source = '^(?:'+any_op_bits.join('|')+')';
        this.re.re_op = new RegExp(re_op_source,'i');
        this.re.re_superscript = new RegExp('^['+this.superscript_replacements[1]+']+');
    },

    /** Convert given expression string to a list of tokens. Does some tidying, e.g. inserts implied multiplication symbols.
     *
     * @param {JME} expr
     * @returns {Array.<Numbas.jme.token>}
     * @see Numbas.jme.Parser#compile
     */
    tokenise: function(expr) {
        if(!expr)
            return [];
        expr += '';
        var pos = 0;
        var tokens = [];
        while( pos<expr.length ) {
            var got = false;
            for(var i=0;i<this.tokeniser_types.length;i++) {
                var tt = this.tokeniser_types[i];
                var regex = (tt.re instanceof RegExp) ? tt.re : this.re[tt.re];
                var m = expr.slice(pos).match(regex);
                if(m) {
                    var result = tt.parse.apply(this,[m,tokens,expr,pos]);
                    result.tokens.forEach(function(t) {
                        t.pos = result.start;
                    });
                    pos = result.end;
                    tokens = tokens.concat(result.tokens);
                    got = true;
                    break;
                }
            }
            if(!got && pos<expr.length) {
                var nearby = expr.slice(Math.max(0,pos), pos+5);
                throw(new Numbas.Error('jme.tokenise.invalid near',{expression: expr, position: pos, nearby: nearby}));
            }
        }
        return tokens;
    },

    shunt_type_actions: {
        'number': function(tok) { this.addoutput(tok); },
        'integer': function(tok) { this.addoutput(tok); },
        'string': function(tok) { this.addoutput(tok); },
        'boolean': function(tok) { this.addoutput(tok); },
        'name': function(tok) {
            var i = this.i;
            // if followed by an open bracket, this is a function application
            if( i<this.tokens.length-1 && this.tokens[i+1].type=="(") {
                    var name = this.funcSynonym(tok.nameWithoutAnnotation);
                    var ntok = new TFunc(name,tok.annotation);
                    ntok.pos = tok.pos;
                    this.stack.push(ntok);
                    this.numvars.push(0);
            } else {
                //this is a variable otherwise
                this.addoutput(tok);
            }
        },
        ',': function(tok) {
            if(this.tokens[this.i-1].type=='(' || this.tokens[this.i-1].type=='[') {
                throw(new Numbas.Error('jme.shunt.expected argument before comma'));
            }
            //reached end of expression defining function parameter, so pop all of its operations off stack and onto output
            while( this.stack.length && this.stack[this.stack.length-1].type != "(" && this.stack[this.stack.length-1].type != '[') {
                this.addoutput(this.stack.pop())
            }
            this.numvars[this.numvars.length-1]++;
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left bracket in function'));
            }
        },
        'op': function(tok) {
            if(!tok.prefix) {
                var o1 = this.getPrecedence(tok.name);
                //while ops on stack have lower precedence, pop them onto output because they need to be calculated before this one. left-associative operators also pop off operations with equal precedence
                
                /** Should the next token on the stack be popped off?
                 *
                 * @returns {boolean}
                 */
                function should_pop() {
                    if(this.stack.length==0) {
                        return false;
                    }
                    var prev = this.stack[this.stack.length-1];
                    if(prev.type=="op" && ((o1 > this.getPrecedence(prev.name)) || (!this.isRightAssociative(tok.name) && o1 == this.getPrecedence(prev.name)))) {
                        return true;
                    }
                    if(prev.type=='keypair' && prev.pairmode=='match') {
                        return true;
                    }
                    return false;
                }
                while(should_pop.apply(this)) {
                    this.addoutput(this.stack.pop());
                }
            }
            this.stack.push(tok);
        },
        '[': function(tok) {
            var i = this.i;
            var tokens = this.tokens;
            if(i==0 || tokens[i-1].type=='(' || tokens[i-1].type=='[' || tokens[i-1].type==',' || tokens[i-1].type=='op' || tokens[i-1].type=='keypair') {
                this.listmode.push('new');
            }
            else {
                this.listmode.push('index');
            }
            this.stack.push(tok);
            this.numvars.push(0);
        },
        ']': function(tok) {
            while( this.stack.length && this.stack[this.stack.length-1].type != "[" ) {
                this.addoutput(this.stack.pop());
            }
            if(this.tokens[this.i-1].type != ',' && this.tokens[this.i-1].type != '[') {
                this.numvars[this.numvars.length-1] += 1;
            }
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left square bracket'));
            } else {
                this.stack.pop();    //get rid of left bracket
            }
            //work out size of list
            var n = this.numvars.pop();
            switch(this.listmode.pop()) {
            case 'new':
                var ntok = new TList(n);
                ntok.pos = tok.pos;
                this.addoutput(ntok)
                break;
            case 'index':
                var f = new TFunc('listval');
                f.pos = tok.pos;
                f.vars = 2;
                this.addoutput(f);
                break;
            }
        },
        '(': function(tok) {
            this.stack.push(tok);
        },
        ')': function(tok) {
            while( this.stack.length && this.stack[this.stack.length-1].type != "(" ) {
                this.addoutput(this.stack.pop());
            }
            if( ! this.stack.length ) {
                throw(new Numbas.Error('jme.shunt.no left bracket'));
            } 
            this.stack.pop();    //get rid of left bracket
            //if this is a function call, then the next thing on the stack should be a function name, which we need to pop
            if( this.stack.length && this.stack[this.stack.length-1].type=="function") {
                //work out arity of function
                if(this.tokens[this.i-1].type != ',' && this.tokens[this.i-1].type != '(') {
                    this.numvars[this.numvars.length-1] += 1;
                }
                var n = this.numvars.pop();
                var f = this.stack.pop();
                f.vars = n;
                this.addoutput(f);
            } else if(this.output.length) {
                this.output[this.output.length-1].bracketed = true;
            }
        },
        'keypair': function(tok) {
            var pairmode = null;
            for(var i=this.stack.length-1;i>=0;i--) {
                if(this.stack[i].type=='[' || jme.isFunction(this.stack[i],'dict')) {
                    pairmode = 'dict';
                    break;
                } else if(jme.isOp(this.stack[i],';')) {
                    pairmode = 'match';
                    break;
                } else if(this.stack[i].type=='(' && (this.stack.length==1 || !jme.isFunction(this.stack[i-1],'dict'))) {
                    break;
                }
            }
            if(pairmode===null) {
                throw(new Numbas.Error('jme.shunt.keypair in wrong place'));
            }
            tok.pairmode = pairmode;
            this.stack.push(tok);
        }
    },

    addoutput: function(tok) {
        if(tok.vars!==undefined) {
            if(this.output.length<tok.vars) {
                // Not enough terms have been output for this operation
                if(!this.options.addMissingArguments) {
                    throw(new Numbas.Error('jme.shunt.not enough arguments',{op:tok.name || tok.type}));
                } else {
                    for(var i=this.output.length;i<tok.vars;i++) {
                        var tvar = new types.TName('?');
                        tvar.added_missing = true;
                        this.output.push({tok:tvar});
                    }
                }
            }

            var thing = {
                tok: tok,
                args: this.output.splice(this.output.length-tok.vars,tok.vars)
            };

            if(tok.type=='list') {
                // If this is a list of keypairs, construct a dictionary instead
                var mode = null;
                for(var i=0;i<thing.args.length;i++) {
                    var argmode = thing.args[i].tok.type=='keypair' ? 'dictionary' : 'list';
                    if(i>0 && argmode!=mode) {
                        throw(new Numbas.Error('jme.shunt.list mixed argument types',{mode: mode, argmode: argmode}));
                    }
                    mode = argmode;
                }
                if(mode=='dictionary') {
                    thing.tok = new TDict();
                }
            }
            if(tok.type=='op' && this.isRelation(tok.name)) {
                // Rewrite chained relations: e.g. `a<b<c` to `a<b and b<c`
                var lhs = thing.args[0];
                var ltop = lhs;

                while(jme.isOp(ltop.tok,'and')) {
                    ltop = ltop.args[1];
                }

                var lbottom = ltop;
                while(lbottom.tok.type=='op' && this.isRelation(lbottom.tok.name)) {
                    lbottom = lbottom.args[1];
                }

                var rhs = thing.args[1];
                var rtop = rhs;

                while(jme.isOp(rtop.tok,'and')) {
                    rtop = rtop.args[0];
                }

                var rbottom = rtop;
                while(rbottom.tok.type=='op' && this.isRelation(rbottom.tok.name)) {
                    rbottom = rbottom.args[0];
                }

                /** Create a binary operation tree with the given token, and left and right arguments.
                 *
                 * @param {Numbas.jme.token} tok
                 * @param {Numbas.jme.tree} lhs
                 * @param {Numbas.jme.tree} rhs
                 * @returns {Numbas.jme.tree}
                 */
                function bin(tok,lhs,rhs) {
                    if(!tok.pos) {
                        tok.pos = lhs.tok.pos;
                    }
                    return {tok: tok, args: [lhs,rhs]};
                }

                if(lbottom!=ltop) {
                    if(rbottom!=rtop) {
                        thing = bin(this.op('and'), bin(this.op('and'),lhs,bin(tok,lbottom,rbottom)), rhs);
                    } else {
                        thing = bin(this.op('and'), lhs, bin(tok,lbottom,rhs));
                    }
                } else if(rbottom!=rtop) {
                    thing = bin(this.op('and'), bin(tok,lhs,rbottom), rhs);
                }
            }
            this.output.push(thing);
        }
        else {
            this.output.push({tok:tok});
        }
    },

    /** Shunt list of tokens into a syntax tree. Uses the shunting yard algorithm.
     *
     * @param {Array.<Numbas.jme.token>} tokens
     * @returns {Numbas.jme.tree}
     * @see Numbas.jme.Parser#tokenise
     * @see Numbas.jme.Parser#compile
     */
    shunt: function(tokens) {
        var parser = this;

        this.tokens = tokens;
        this.output = [];
        this.stack = [];
        this.numvars = [];
        this.listmode = [];


        var type_actions = this.shunt_type_actions;

        /** Shunt the given token onto the output.
         *
         * @param {Numbas.jme.token} tok
         * @see Numbas.jme.Parser.shunt_type_actions
         */
        function shunt_token(tok) {
            if(tok.type in type_actions) {
                type_actions[tok.type].apply(parser,[tok]);
            }
        }
        for(this.i = 0; this.i < tokens.length; this.i++ ) {
            var tok = tokens[this.i];
            shunt_token(tok);
        }
        //pop all remaining ops on stack into output
        while(this.stack.length) {
            var x = this.stack[this.stack.length-1];
            if(x.type=="(") {
                if(!this.options.closeMissingBrackets) {
                    throw(new Numbas.Error('jme.shunt.no right bracket'));
                } else {
                    type_actions[')'].apply(this);
                }
            } else {
                this.stack.pop();
                this.addoutput(x);
            }
        }
        if(this.listmode.length>0) {
            throw(new Numbas.Error('jme.shunt.no right square bracket'));
        }
        if(this.output.length>1) {
            throw(new Numbas.Error('jme.shunt.missing operator'));
        }
        return this.output[0];
    },

    /** Compile an expression string to a syntax tree. (Runs {@link Numbas.jme.tokenise} then {@Link Numbas.jme.shunt}).
     *
     * @param {JME} expr
     * @see Numbas.jme.Parser#tokenise
     * @see Numbas.jme.Parser#shunt
     * @returns {Numbas.jme.tree}
     */
    compile: function(expr) {
        //make sure expression is a string and not a number or anything like that
        expr += '';
        if(!expr.trim().length) {
            return null;
        }
        //tokenise expression
        var tokens = this.tokenise(expr);
        //compile to parse tree
        var tree = this.shunt(tokens);
        if(tree===null) {
            return;
        }
        return tree;
    },
}
/** Regular expression to match whitespace (because '\s' doesn't match *everything*) */
jme.Parser.prototype.re.re_whitespace = '(?:[\\s \\f\\n\\r\\t\\v\\u00A0\\u2028\\u2029]|(?:\&nbsp;))';
jme.Parser.prototype.re.re_strip_whitespace = new RegExp('^'+jme.Parser.prototype.re.re_whitespace+'+');

/** Regular expressions for parser tokens.
 * Included for backwards-compatibility.
 *
 * @type {object.<RegExp>}
 * @see Numbas.jme.Parser#re
 */
jme.re = jme.Parser.prototype.re;

var fnSort = util.sortBy('id');
/** Options for the {@link Numbas.jme.funcObj} constructor.
 *
 * @typedef {object} Numbas.jme.scope_deletions
 * @property {object} variables - Names of deleted variables.
 * @property {object} functions - Names of deleted functions.
 * @property {object} rulesets - Names of deleted rulesets.
 */

/**
 * A JME evaluation environment.
 * Stores variable, function, and ruleset definitions.
 *
 * A scope may have a parent; elements of the scope are resolved by searching up through the hierarchy of parents until a match is found.
 *
 * @memberof Numbas.jme
 * @class
 * @property {object.<Numbas.jme.token>} variables - Dictionary of variables defined **at this level in the scope**. To resolve a variable in the scope, use {@link Numbas.jme.Scope.getVariable}.
 * @property {object.<Array.<Numbas.jme.funcObj>>} functions - Dictionary of functions defined at this level in the scope. Function names map to lists of functions: there can be more than one function for each name because of multiple dispatch. To resolve a function name in the scope, use {@link Numbas.jme.Scope.getFunction}.
 * @property {object.<Numbas.jme.rules.Ruleset>} rulesets - Dictionary of rulesets defined at this level in the scope. To resolve a ruleset in the scope, use {@link Numbas.jme.Scope.getRuleset}.
 * @property {Numbas.jme.scope_deletions} deleted - Names of deleted variables/functions/rulesets.
 * @property {Numbas.Question} question - The question this scope belongs to.
 *
 * @param {Numbas.jme.Scope[]} scopes - Either: nothing, in which case this scope has no parents; a parent Scope object; a list whose first element is a parent scope, and the second element is a dictionary of extra variables/functions/rulesets to store in this scope.
 */
var Scope = jme.Scope = function(scopes) {
    var s = this;
    this.parser = jme.standardParser;
    this.constants = {};
    this.variables = {};
    this.functions = {};
    this._resolved_functions = {};
    this.rulesets = {};
    this.deleted = {
        constants: {},
        variables: {},
        functions: {},
        rulesets: {}
    }
    if(scopes===undefined) {
        return;
    }
    if(!Array.isArray(scopes)) {
        scopes = [scopes,undefined];
    }
    this.question = scopes[0].question || this.question;
    var extras;
    if(!scopes[0].evaluate) {
        extras = scopes[0];
    } else {
        this.parent = scopes[0];
        this.parser = this.parent.parser;
        this.caseSensitive = this.parent.caseSensitive;
        extras = scopes[1] || {};
    }
    if(extras) {
        if(extras.constants) {
            for(var x in extras.constants) {
                this.setConstant(x,extras.constants[x]);
            }
        }
        if(extras.variables) {
            for(var x in extras.variables) {
                this.setVariable(x,extras.variables[x]);
            }
        }
        if(extras.rulesets) {
            for(var x in extras.rulesets) {
                this.addRuleset(x,extras.rulesets[x]);
            }
        }
        if(extras.functions) {
            for(var x in extras.functions) {
                extras.functions[x].forEach(function(fn) {
                    s.addFunction(fn);
                });
            }
        }
        if(extras.caseSensitive !== undefined) {
            s.caseSensitive = extras.caseSensitive;
        }
    }
    return;
}
Scope.prototype = /** @lends Numbas.jme.Scope.prototype */ {
    /** Parser to use when compiling expressions.
     *
     * @type {Numbas.jme.Parser}
     */
    parser: jme.standardParser,

    /** Set the given constant name.
     *
     * @param {string} name
     * @param {Numbas.jme.constant_definition} data
     */
    setConstant: function(name, data) {
        data = {
            name: name,
            value: data.value,
            tex: data.tex
        };
        name = jme.normaliseName(name, this);
        this.constants[name] = data;
        this.deleted.constants[name] = false;
    },

    /** Set the given variable name.
     *
     * @param {string} name
     * @param {Numbas.jme.token} value
     */
    setVariable: function(name, value) {
        name = jme.normaliseName(name, this);
        this.variables[name] = value;
        this.deleted.variables[name] = false;
    },
    /** Add a JME function to the scope.
     *
     * @param {Numbas.jme.funcObj} fn - function to add
     */
    addFunction: function(fn) {
        var name = jme.normaliseName(fn.name, this);
        if(!(name in this.functions)) {
            this.functions[name] = [fn];
        } else {
            this.functions[name].push(fn);
            delete this._resolved_functions[name];
        }
        this.deleted.functions[name] = false;
    },
    /** Add a ruleset to the scope.
     *
     * @param {string} name
     * @param {Numbas.jme.rules.Ruleset} set
     */
    addRuleset: function(name, set) {
        this.rulesets[name] = set;
        this.deleted.rulesets[name] = false;
    },
    /** Mark the given constant name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteConstant: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.constants[name] = true;
    },
    /** Mark the given variable name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteVariable: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.variables[name] = true;
    },
    /** Mark the given function name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteFunction: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.functions[name] = true;
    },
    /** Mark the given ruleset name as deleted from the scope.
     *
     * @param {string} name
     */
    deleteRuleset: function(name) {
        name = jme.normaliseName(name, this);
        this.deleted.rulesets[name] = true;
    },
    /** Get the object with given name from the given collection.
     *
     * @param {string} collection - The name of the collection. A property of this Scope object, i.e. one of `constants`, `variables`, `functions`, `rulesets`.
     * @param {string} name - The name of the object to retrieve.
     * @returns {object}
     */
    resolve: function(collection,name) {
        var scope = this;
        while(scope) {
            var sname = jme.normaliseName(name, scope);
            if(scope.deleted[collection][sname]) {
                return;
            }
            if(scope[collection][sname]!==undefined) {
                return scope[collection][sname];
            }
            scope = scope.parent;
        }
    },
    /** Find the value of the variable with the given name, if it's defined.
     *
     * @param {string} name
     * @returns {Numbas.jme.token}
     */
    getConstant: function(name) {
        return this.resolve('constants',name);
    },

    /** If the given value is equal to one of the constant defined in this scope, return the constant.
     *
     * @param {Numbas.jme.token} value
     * @returns {object}
     */
    isConstant: function(value) {
        for(var x in this.constants) {
            if(!this.deleted.constants[x]) {
                if(util.eq(value,this.constants[x].value,this)) {
                    return this.constants[x];
                }
            }
        }
        if(this.parent) {
            return this.parent.isConstant(value);
        }
    },
    /** Find the value of the variable with the given name, if it's defined.
     *
     * @param {string} name
     * @returns {Numbas.jme.token}
     */
    getVariable: function(name) {
        return this.resolve('variables',name);
    },
    /** Get all definitions of the given function name.
     *
     * @param {string} name
     * @returns {Numbas.jme.funcObj[]} A list of all definitions of the given name.
     */
    getFunction: function(name) {
        name = jme.normaliseName(name, this);
        if(!this._resolved_functions[name]) {
            var scope = this;
            var o = [];
            while(scope) {
                if(scope.functions[name]!==undefined) {
                    o = o.merge(scope.functions[name],fnSort);
                }
                scope = scope.parent;
            }
            this._resolved_functions[name] = o;
        }
        return this._resolved_functions[name];
    },

    /** Get the definition of the function with the given name which matches the types of the given arguments.
     *
     * @param {Numbas.jme.token} tok - The token of the function or operator.
     * @param {Array.<Numbas.jme.token>} args
     * @returns {Numbas.jme.call_signature}
     */
    matchFunctionToArguments: function(tok,args) {
        var op = jme.normaliseName(tok.name, this);
        var fns = this.getFunction(op);
        if(fns.length==0) {
            if(tok.type=='function') {
                //check if the user typed something like xtan(y), when they meant x*tan(y)
                var possibleOp = op.slice(1);
                if(op.length>1 && this.getFunction(possibleOp).length) {
                    throw(new Numbas.Error('jme.typecheck.function maybe implicit multiplication',{name:op,first:op[0],possibleOp:possibleOp}));
                } else {
                    throw(new Numbas.Error('jme.typecheck.function not defined',{op:op,suggestion:op}));
                }
            }
            else {
                throw(new Numbas.Error('jme.typecheck.op not defined',{op:op}));
            }
        }

        /** Represent the difference between an input token and the description of the desired type returned by a signature checker.
         *
         * @param {Numbas.jme.token} tok
         * @param {Numbas.jme.signature_result_argument} typeDescription
         * @returns {Array.<string>} - The difference between the input argument and any of its child tokens, and the type described by `typeDescription`.
         */
        function type_difference(tok,typeDescription) {
            if(tok.type!=typeDescription.type) {
                return [typeDescription.type];
            }
            var out = [typeDescription.nonspecific ? tok.type : null];
            switch(typeDescription.type) {
                case 'list':
                    if(typeDescription.items) {
                        var items = sig_remove_missing(typeDescription.items);
                        for(var i=0;i<tok.value.length;i++) {
                            out = out.concat(type_difference(tok.value[i],items[i]));
                        }
                    }
            }
            return out;
        }

        /** Compare two function matches. A match is sorted earlier if, considering each argument in turn:
         * * it's more specific about a argument whose type is a collection;
         * * it matches the type of the corresponding argument exactly;
         * * the type it casts to is preferred over the other match's (occurs earlier in the input token's list of casts).
         *
         * @param {Numbas.jme.signature_result} m1
         * @param {Numbas.jme.signature_result} m2
         * @returns {number}
         */
        function compare_matches(m1,m2) {
            m1 = sig_remove_missing(m1);
            m2 = sig_remove_missing(m2);
            for(var i=0;i<args.length;i++) {
                var d1 = type_difference(args[i],m1[i]);
                var d2 = type_difference(args[i],m2[i]);
                for(var j=0;j<d1.length && j<d2.length;j++) {
                    if(j>=d1.length) {
                        return 1;
                    } else if(j>=d2.length) {
                        return -1;
                    }
                    if(d1[j]===null) {
                        if(d2[j]===null) {
                            continue;
                        } else {
                            return -1;
                        }
                    } else {
                        if(d2[j]===null) {
                            return 1;
                        } else {
                            if(args[i].casts) {
                                var casts = Object.keys(args[i].casts);
                                var i1 = casts.indexOf(d1[j]);
                                if(i1==-1) {
                                    i1 = Infinity;
                                }
                                var i2 = casts.indexOf(d2[j]);
                                if(i2==-1) {
                                    i2 = Infinity;
                                }
                                if(i1!=i2) {
                                    return i1<i2 ? -1 : 1;
                                }
                            }
                            continue;
                        }
                    }
                }
            }
            return 0;
        }
        var candidate = null;
        for(var j=0;j<fns.length; j++) {
            var fn = fns[j];
            if(fn.typecheck(args)) {
                var match = fn.intype(args);

                /** Does this match exactly describe the type of the given items?
                 *
                 * @param {Numbas.jme.signature_result} match
                 * @param {Array.<Numbas.jme.token>} items
                 * @returns {boolean}
                 */
                function exactType(match,items) {
                    var k = 0;
                    return match.every(function(m,i) { 
                        if(m.missing) {
                            return;
                        }
                        var ok = items[k] && items[k].type==m.type;
                        if(ok) {
                            if(m.items && items[k].type=='list') {
                                ok = exactType(m.items,items[k].value);
                            }
                        }
                        k += 1;
                        return ok; 
                    });
                }
                var exact_match = exactType(match,args);
                if(exact_match) {
                    return {fn: fn, signature: match};
                }
                var pcandidate = {fn: fn, signature: match};
                if(candidate===null || compare_matches(pcandidate.signature, candidate.signature)==-1) {
                    candidate = pcandidate;
                }
            }
        }
        return candidate;
    },
    /** Get the ruleset with the gien name.
     *
     * @param {string} name
     * @returns {Numbas.jme.rules.Ruleset}
     */
    getRuleset: function(name) {
        return this.resolve('rulesets',name);
    },
    /** Set the given ruleset name.
     *
     * @param {string} name
     * @param {Numbas.jme.rules.Ruleset[]} rules
     */
    setRuleset: function(name, rules) {
        name = jme.normaliseName(name, this);
        this.rulesets[name] = rules;
        this.deleted.rulesets[name] = false;
    },
    /** Collect together all items from the given collection.
     *
     * @param {string} collection - The name of the collection. A property of this Scope object, i.e. one of `variables`, `functions`, `rulesets`.
     * @returns {object} a dictionary of names to values
     */
    collect: function(collection) {
        var scope = this;
        var deleted = {};
        var out = {};
        var name;
        while(scope) {
            for(var name in scope.deleted[collection]) {
                deleted[name] = scope.deleted[collection][name] || deleted[name];
            }
            for(name in scope[collection]) {
                if(!deleted[name]) {
                    out[name] = out[name] || scope[collection][name];
                }
            }
            scope = scope.parent;
        }
        return out;
    },
    /** Gather all variables defined in this scope.
     *
     * @returns {object.<Numbas.jme.token>} A dictionary of variables.
     */
    allConstants: function() {
        return this.collect('constants');
    },
    /** Gather all variables defined in this scope.
     *
     * @returns {object.<Numbas.jme.token>} A dictionary of variables.
     */
    allVariables: function() {
        return this.collect('variables');
    },
    /** Gather all rulesets defined in this scope.
     *
     * @returns {object.<Numbas.jme.rules.Ruleset>} A dictionary of rulesets.
     */
    allRulesets: function() {
        return this.collect('rulesets');
    },
    /** Gather all functions defined in this scope.
     *
     * @returns {object.<Numbas.jme.funcObj[]>} A dictionary of function definitions: each name maps to a list of @link{Numbas.jme.funcObj}.
     */
    allFunctions: function() {
        var scope = this;
        var out = {}
        var name;
        /** Merge the given list of functions with any existing functions under that name.
         *
         * @param {string} name
         * @param {Array.<Numbas.jme.funcObj>} fns
         */
        function add(name,fns) {
            if(!out[name]) {
                out[name] = [];
            }
            out[name] = out[name].merge(fns,fnSort);
        }
        while(scope) {
            for(var name in scope.functions) {
                add(name,scope.functions[name])
            }
            scope = scope.parent;
        }
        return out;
    },
    /** Gather all members of this scope into this scope object.
     * A backwards-compatibility hack for questions that use `question.scope.variables.x`
     * Shouldn't be applied to any scope other than the question scope.
     */
    flatten: function() {
        this.variables = this.allVariables();
        this.rulesets = this.allRulesets();
    },

    /** Return a new scope created by unsetting the members specified by the given object.
     *
     * @param {object} defs - A dictionary with elements `variables`, `rulesets` and `functions`, each lists of names to unset.
     * @returns {Numbas.jme.Scope}
     */
    unset: function(defs) {
        var s = new Scope([this]);
        if(defs.variables) {
            defs.variables.forEach(function(v) {
                s.deleteVariable(v);
            });
        }
        if(defs.functions) {
            defs.functions.forEach(function(f) {
                s.deleteFunction(f);
            });
        }
        if(defs.rulesets) {
            defs.rulesets.forEach(function(r) {
                s.deleteRuleset(r);
            });
        }
        return s;
    },

    /** Evaluate an expression in this scope - equivalent to `Numbas.jme.evaluate(expr,this)`.
     *
     * @param {JME} expr
     * @param {object.<Numbas.jme.token|object>} [variables] - Dictionary of variables to sub into expression. Values are automatically wrapped up as JME types, so you can pass raw JavaScript values.
     * @param {boolean} [noSubstitution] - If true, don't substitute variable values from the scope into the expression.
     * @returns {Numbas.jme.token}
     */
    evaluate: function(expr,variables, noSubstitution) {
        var scope = this;
        if(variables) {
            scope = new Scope([this]);
            for(var name in variables) {
                scope.setVariable(name,jme.wrapValue(variables[name]));
            }
        }
        //if a string is given instead of an expression tree, compile it to a tree
        var tree;
        if( typeof(expr)=='string' ) {
            tree = this.parser.compile(expr,scope);
        } else {
            tree = expr;
        }
        if(!tree) {
            return null;
        }
        if(!noSubstitution) {
            tree = jme.substituteTree(tree,scope,true);
        }
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
                    value[i] = scope.evaluate(tree.args[i],null,noSubstitution);
                }
                tok = new TList(value);
            }
            return tok;
        case 'dict':
            if(tok.value===undefined) {
                var value = {};
                for(var i=0;i<tree.args.length;i++) {
                    var kp = tree.args[i];
                    value[kp.tok.key] = scope.evaluate(kp.args[0],null,noSubstitution);
                }
                tok = new TDict(value);
            }
            return tok;
        case 'string':
            var value = tok.value;
            if(!tok.safe && value.contains('{')) {
                value = jme.contentsubvars(value,scope)
                var t = new TString(value);
                if(tok.latex!==undefined) {
                    t.latex = tok.latex
                    t.display_latex = tok.display_latex;
                }
                return t;
            } else {
                return tok;
            }
        case 'name':
            var v = scope.getVariable(tok.name);
            if(v && !noSubstitution) {
                return v;
            } else {
                var c = scope.getConstant(tok.name)
                if(c) {
                    return c.value;
                }
                tok = new TName(tok.name);
                tok.unboundName = true;
                return tok;
            }
        case 'op':
        case 'function':
            var op = jme.normaliseName(tok.name, scope);
            if(lazyOps.indexOf(op)>=0) {
                return scope.getFunction(op)[0].evaluate(tree.args,scope);
            }
            else {
                var eargs = [];
                for(var i=0;i<tree.args.length;i++) {
                    eargs.push(scope.evaluate(tree.args[i],null,noSubstitution));
                }
                var matchedFunction = scope.matchFunctionToArguments(tok,eargs);
                if(matchedFunction) {
                    var signature = matchedFunction.signature;
                    var castargs = jme.castArgumentsToSignature(signature,eargs);
                    return matchedFunction.fn.evaluate(castargs,scope);
                } else {
                    for(var i=0;i<=eargs.length;i++) {
                        if(eargs[i] && eargs[i].unboundName) {
                            throw(new Numbas.Error('jme.typecheck.no right type unbound name',{name:eargs[i].name}));
                        }
                    }
                    throw(new Numbas.Error('jme.typecheck.no right type definition',{op:op, eargs: eargs}));
                }
            }
        default:
            return tok;
        }
    },

    /** Options for {@link Numbas.jme.Scope.expandJuxtapositions}.
     *
     * @typedef {object} Numbas.jme.expand_juxtapositions_options
     * @property {boolean} singleLetterVariables - Enforce single-letter variables names: a name token like `xy` is rewritten to `x*y`.
     * @property {boolean} noUnknownFunctions - Rewrite applications of functions not defined in this scope to products, e.g. `x(y)` is rewritten to `x*y`.
     * @property {boolean} implicitFunctionComposition - If function names are juxtaposed, either as a single token or as (implicit) multiplication, rewrite as composition: e.g. `lnabs(x)` and `ln abs(x)` are both rewritten to `ln(abs(x))`.
     */

    /** Expand juxtapositions in variable and function names for implicit multiplication or composition.
     *
     * @param {Numbas.jme.tree} tree
     * @param {Numbas.jme.expand_juxtapositions_options} options
     * @returns {Numbas.jme.tree}
     */
    expandJuxtapositions: function(tree, options) {
        var scope = this;
        var default_options = {
            singleLetterVariables: true,    // `xy = x*y`
            noUnknownFunctions: true,    // `x(y) = x*y` when `x` is not the name of a function defined in this scope
            implicitFunctionComposition: true,  // `lnabs(x) = ln(abs(x))`, only applied when `noUnknownFunctions` is true, and `ln abs(x) = ln(abs(x))`
            normaliseSubscripts: true
        }
        options = options || default_options;

        if(!(options.singleLetterVariables || options.noUnknownFunctions || options.implicitFunctionComposition || options.normaliseSubscripts)) {
            return tree;
        }

        /** Construct a TFunc token with the given name, applying any synonyms.
         *
         * @param {string} name
         * @returns {Numbas.jme.token}
         */
        function tfunc(name) {
            return new TFunc(scope.parser.funcSynonym(name));
        }

        /** Get the names of all functions defined in the scope.
         *
         * @returns {object}
         */
        function get_function_names() {
            var defined_names = {};
            var s = scope;
            while(s) {
                for(var name in s.functions) {
                    defined_names[jme.normaliseName(name, scope)] = true;
                }
                for(var name in jme.funcSynonyms) {
                    defined_names[jme.normaliseName(name, scope)] = true;
                }
                if(s.parser.funcSynonyms) {
                    for(var name in s.parser.funcSynonyms) {
                        defined_names[jme.normaliseName(name, scope)] = true;
                    }
                }
                s = s.parent
            }
            return defined_names;
        }

        var tok = tree.tok;

        if(options.implicitFunctionComposition && jme.isOp(tok,'*') && tree.args[1].tok.type=='function') {
            var search = true;
            var defined_names = get_function_names();
            while(search) {
                if(!jme.isOp(tree.tok,'*')) {
                    break;
                }
                search = false;
                var c = tree.args[0];
                while(jme.isOp(c.tok,'*')) {
                    c = c.args[1];
                }
                if(c.tok.type=='name' && defined_names[jme.normaliseName(c.tok.name, scope)]) {
                    search = true;
                    var composed_fn = {tok: tfunc(c.tok.name), args: [tree.args[1]]};
                    composed_fn.tok.vars = 1;
                    if(c==tree.args[0]) {
                        tree = composed_fn;
                    } else {
                        /** Remove the multiplicand from an n-ary multiplication.
                         *
                         * @param {Numbas.jme.tree} t
                         * @returns {Numbas.jme.tree}
                         */
                        function remove_multiplicand(t) {
                            if(t.args[1]==c) {
                                return t.args[0];
                            } else {
                                return {tok: t.tok, args: [t.args[0], remove_multiplicand(t.args[1])]};
                            }
                        }
                        tree = {tok: tree.tok, args: [remove_multiplicand(tree.args[0]),composed_fn]};
                    }
                }
            }

        }

        if(tree.args) {
            var oargs = tree.args;
            tree = {
                tok: tree.tok,
                args: tree.args.map(function(arg){ return scope.expandJuxtapositions(arg,options); })
            };
        }

        /**
         * Normalise the subscripts in a `TName` token.
         *
         * @param {Numbas.jme.token} tok
         * @returns {Numbas.jme.token}
         */
        function normaliseSubscripts(tok) {
            if(!options.normaliseSubscripts) {
                return tok;
            }
            if(scope.getConstant(tok.name)) {
                return tok;
            }
            var info = getNameInfo(tok.nameWithoutAnnotation);
            var name = info.root;
            if(info.subscript) {
                name += '_'+info.subscript;
            }
            if(info.primes) {
                name += info.primes;
            }
            return new TName(name,tok.annotation);
        }

        switch(tok.type) {
            case 'name':
                if(options.singleLetterVariables && tok.nameInfo.letterLength>1) {
                    var bits = [];
                    var s = tok.nameWithoutAnnotation;
                    var annotation = tok.annotation;
                    while(s.length) {
                        var i = s.length;
                        while(i>1) {
                            var info = getNameInfo(s.slice(0,i));
                            if(info.letterLength==1 && (!info.subscript || !info.subscript.match(/.[a-zA-Z]$/))) {
                                break;
                            }
                            i -= 1;
                        }
                        var ntok = normaliseSubscripts(new TName(s.slice(0,i), annotation));
                        bits.push(ntok);
                        annotation = undefined;
                        s = s.slice(i);
                    }
                    var tree = {tok: bits[0]};
                    for(var i=1;i<bits.length;i++) {
                        tree = {tok: this.parser.op('*'), args: [tree,{tok: bits[i]}]};
                    }
                } else {
                    tree = {tok: normaliseSubscripts(tok)};
                }
                break;
            case 'function':
                if(options.noUnknownFunctions) {
                    var defined_names = get_function_names();
                    var name = tok.name;
                    var breaks = [name.length];
                    for(var i=name.length-1;i>=0;i--) {
                        for(var j=0;j<breaks.length;j++) {
                            var sub = jme.normaliseName(name.slice(i,breaks[j]),scope);
                            if(defined_names[sub]) {
                                breaks = breaks.slice(0,j+1);
                                breaks.push(i);
                            }
                        }
                    }
                    var bits = [];
                    var remainder;
                    if(options.implicitFunctionComposition) {
                        breaks.reverse();
                        for(var i=0;i<breaks.length-1;i++) {
                            bits.push(name.slice(breaks[i],breaks[i+1]));
                        }
                        remainder = name.slice(0,breaks[0]);
                    } else {
                        if(breaks.length>1) {
                            bits.push(name.slice(breaks[1],breaks[0]));
                        }
                        remainder = name.slice(0,breaks[1]);
                    }
                    if(!bits.length) {
                        if(tree.args.length==1) {
                            tree = {tok: this.parser.op('*'), args: [this.expandJuxtapositions({tok: new TName(name)},options), tree.args[0]]};
                        }
                    } else {
                        var args = tree.args;
                        for(var i=bits.length-1;i>=0;i--) {
                            tree = {tok: tfunc(bits[i]), args: args};
                            tree.tok.vars = 1;
                            args = [tree];
                        }

                        // then interpret anything remaining on the left as multiplication by variables
                        if(remainder.length) {
                            var left = this.expandJuxtapositions({tok: new TName(remainder)},options);
                            tree = {tok: this.parser.op('*'), args: [left,tree]};
                        }
                    }
                }
                break;
            case 'op':
                var mult_precedence = this.parser.getPrecedence('*');
                var op_precedence = this.parser.getPrecedence(tok.name);


                /** In a tree of the form `((x*y)*z)*w`, return `[x,(y*z)*w]` - pull out the leftmost multiplicand and return it along with the remaining tree.
                 *
                 * @param {Numbas.jme.tree} tree
                 * @returns {Array.<Numbas.jme.tree,Numbas.jme.tree>}
                 */
                function extract_leftmost(tree) {
                    if(jme.isOp(tree.tok,'*')) {
                        var bits = extract_leftmost(tree.args[0]);
                        var leftmost = bits[0];
                        var rest = bits[1];
                        if(rest) {
                            return [leftmost,{tok:tree.tok, args:[rest,tree.args[1]]}];
                        } else {
                            return [leftmost,tree.args[1]];
                        }
                    } else {
                        return [tree];
                    }
                }
                /** In a tree of the form `x*(y*(z*w))`, return `[w,x*(y*z)]` - pull out the rightmost multiplicand and return it along with the remaining tree.
                 *
                 * @param {Numbas.jme.tree} tree
                 * @returns {Array.<Numbas.jme.tree,Numbas.jme.tree>}
                 */
                function extract_rightmost(tree) {
                    if(jme.isOp(tree.tok,'*')) {
                        var bits = extract_rightmost(tree.args[1]);
                        var rightmost = bits[0];
                        var rest = bits[1];
                        if(rest) {
                            return [rightmost,{tok:tree.tok, args:[tree.args[0],rest]}];
                        } else {
                            return [rightmost,tree.args[0]];
                        }
                    } else {
                        return [tree];
                    }
                }

                /** Was the ith argument rewritten?
                 *
                 * @param {number} i
                 * @returns {boolean}
                 */
                function arg_was_rewritten(i) {
                    return !oargs[i].bracketed && (oargs[i].tok.type=='name' || oargs[i].tok.type=='function') && jme.isOp(tree.args[i].tok,'*');
                }


                if(tree.args.length==1) {
                    if(tok.postfix) {
                        if(arg_was_rewritten(0)) {
                            var bits = extract_rightmost(tree.args[0]);
                            return {
                                tok: this.parser.op('*'),
                                args: [bits[1],{tok: tok, args: [bits[0]]}]
                            }
                        }
                    }
                } else if(tree.args.length==2) {
                    if(op_precedence < mult_precedence) {
                        var lrest,l,r,rrest;
                        if(arg_was_rewritten(0)) {
                            var lbits = extract_rightmost(tree.args[0]);
                            l = lbits[0];
                            lrest = lbits[1];
                        } else {
                            l = tree.args[0];
                        }
                        if(arg_was_rewritten(1)) {
                            var rbits = extract_leftmost(tree.args[1]);
                            r = rbits[0];
                            rrest = rbits[1];
                        } else {
                            r = tree.args[1];
                        }
                        tree = {
                            tok: tok,
                            args: [l,r]
                        };
                        if(lrest) {
                            tree = {
                                tok: this.parser.op('*'),
                                args: [lrest,tree]
                            }
                        }
                        if(rrest) {
                            tree = {
                                tok: this.parser.op('*'),
                                args: [tree,rrest]
                            }
                        }
                    }
                }
        }
        return tree;
    }
};
/** @typedef {object} Numbas.jme.token
 * @property {string} type
 * @see Numbas.jme.types
 */
/** The data types supported by JME expressions.
 *
 * @namespace Numbas.jme.types
 */
var types = jme.types = {}

jme.registerType = function(constructor,name,casts) {
    if(jme.types[name]) {
        throw(new Numbas.Error('jme.type.type already registered',{type:name}));
    }
    jme.types[name] = constructor;
    constructor.prototype.type = name;
    constructor.prototype.casts = casts;
}

/** Nothing type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @class
 */
var TNothing = types.TNothing = function() {};
jme.registerType(TNothing,'nothing');
/** Number type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number} value
 * @property {string|number|complex} originalValue - The value used to construct the token - either a string, a number, or a complex number object.
 * @property {string} type - "number"
 * @class
 * @param {number} num
 */
var TNum = types.TNum = function(num) {
    if(num===undefined)
        return;
    this.originalValue = num;
    switch(typeof(num)) {
        case 'object':
            if(num.complex) {
                this.value = num;
            } else {
                throw(new Numbas.Error("jme.tokenise.number.object not complex"));
            }
            break;
        case "number":
            this.value = num;
            break;
        case "string":
            this.value = parseFloat(num);
            break;
    }
    this.value = num.complex ? num : parseFloat(num);
}
jme.registerType(
    TNum,
    'number', 
    {
        'decimal': function(n) {
            var dp = 15;
            var re,im;
            if(n.value.complex) {
                var re = n.value.re.toFixed(dp);
                var im = n.value.im.toFixed(dp);
            } else {
                re = n.value.toFixed(dp);
                im = 0;
            }
            return new TDecimal(new math.ComplexDecimal(new Decimal(re), new Decimal(im)));
        }
    }
);

var TInt = types.TInt = function(num) {
    this.originalValue = num;
    this.value = Math.round(num);
}
jme.registerType(
    TInt,
    'integer',
    {
        'rational': function(n) {
            return new TRational(new math.Fraction(n.value,1));
        },
        'number': function(n) {
            var t = new TNum(n.value);
            t.originalValue = this.originalValue;
            return t;
        },
        'decimal': function(n) {
            return new TDecimal(new Decimal(n.value));
        }
    }
);

var TRational = types.TRational = function(value) {
    this.value = value;
}
jme.registerType(
    TRational,
    'rational',
    {
        'decimal': function(n) {
            return new TDecimal((new Decimal(n.value.numerator)).dividedBy(new Decimal(n.value.denominator)));
        },
        'number': function(n) {
            return new TNum(n.value.numerator/n.value.denominator);
        }
    }
);

/** A Decimal number.
 * Powered by [decimal.js](http://mikemcl.github.io/decimal.js/).
 *
 * @param {Numbas.math.ComplexDecimal|Decimal} value - If just a `Decimal` is given, it's turned into a `ComplexDecimal` with zero imaginary part.
 * @property {Numbas.jme.ComplexDecimal} value
 */
var TDecimal = types.TDecimal = function(value) {
    if(value instanceof Decimal) {
        value = new math.ComplexDecimal(value,new Decimal(0));
    }
    this.value = value;
}
jme.registerType(
    TDecimal,
    'decimal',
    {
        'number': function(n) {
            if(n.value.im.isZero()) {
                return new TNum(n.value.re.toNumber());
            } else {
                return new TNum({complex: true, re: n.value.re.toNumber(), im: n.value.im.toNumber()});
            }
        }
    }
);

/** String type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} value
 * @property {boolean} latex - Is this string LaTeX code? If so, it's displayed as-is in math mode.
 * @property {boolean} display_latex - Should this string be rendered as LaTeX when substituted into plain text?
 * @property {boolean} safe - If true, don't run {@link Numbas.jme.subvars} on this token when it's evaluated.
 * @property {string} type "string"
 * @class
 * @param {string} s
 */
var TString = types.TString = function(s) {
    this.value = s;
}
jme.registerType(TString,'string');

/** Boolean type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {boolean} value
 * @property {string} type - "boolean"
 * @class
 * @param {boolean} b
 */
var TBool = types.TBool = function(b) {
    this.value = b;
}
jme.registerType(TBool,'boolean');

/** HTML DOM element.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Element} value
 * @property {string} type - "html"
 * @class
 * @param {Element} html
 */
var THTML = types.THTML = function(html) {
    if(html.ownerDocument===undefined && !html.jquery) {
        throw(new Numbas.Error('jme.thtml.not html'));
    }
    if(window.jQuery) {
        this.value = $(html);
        this.html = this.value.clone().wrap('<div>').parent().html();
    } else {
        var elem = document.createElement('div');
        if(typeof html == 'string') {
            elem.innerHTML = html;
        } else {
            elem.appendChild(html);
        }
        this.value = elem.children;
        this.html = elem.innerHTML;
    }
}
jme.registerType(THTML,'html');

/** List of elements of any data type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {number} vars - Length of list.
 * @property {Array.<Numbas.jme.token>} value - Values (may not be filled in if the list was created empty).
 * @property {string} type - "html"
 * @class
 * @param {number|Array.<Numbas.jme.token>} value - Either the size of the list, or an array of values.
 */
var TList = types.TList = function(value) {
    switch(typeof(value)) {
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
jme.registerType(TList,'list');

/** Key-value pair assignment.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} key
 * @class
 * @param {string} key
 */
var TKeyPair = types.TKeyPair = function(key) {
    this.key = key;
}
TKeyPair.prototype = {
    vars: 1
}
jme.registerType(TKeyPair,'keypair');

/** Dictionary: map strings to values.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {object.<Numbas.jme.token>} value - Map strings to tokens. Undefined until this token is evaluated.
 * @property {string} type - "dict"
 * @class
 * @param {object.<Numbas.jme.token>} value
 */
var TDict = types.TDict = function(value) {
    this.value = value;
}
jme.registerType(TDict,'dict');

/** Set type: a collection of elements, with no duplicates.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<Numbas.jme.token>} value - Array of elements. Constructor assumes all elements are distinct
 * @property {string} type - "set"
 * @class
 * @param {Array.<Numbas.jme.token>} value
 */
var TSet = types.TSet = function(value) {
    this.value = value;
}
jme.registerType(
    TSet,
    'set',
    {
        'list': function(s) {
            return new TList(s.value);
        }
    }
);

/** Vector type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<number>} value - Array of components
 * @property {string} type - "vector"
 * @class
 * @param {Array.<number>} value
 */
var TVector = types.TVector = function(value) {
    this.value = value;
}
jme.registerType(
    TVector,
    'vector',
    {
        'list': function(v) {
            return new TList(v.value.map(function(n){ return new TNum(n); }));
        }
    }
);

/** Matrix type.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {matrix} value - Array of rows (which are arrays of numbers)
 * @property {string} type - "matrix"
 * @class
 * @param {matrix} value
 */
var TMatrix = types.TMatrix = function(value) {
    this.value = value;
    if(arguments.length>0) {
        if(value.length!=value.rows) {
            throw(new Numbas.Error("jme.matrix.reports bad size"));
        }
        if(value.rows>0 && value[0].length!=value.columns) {
            throw(new Numbas.Error("jme.matrix.reports bad size"));
        }
    }
}
jme.registerType(
    TMatrix,
    'matrix',
    {
        'list': function(m) {
            return new TList(m.value.map(function(r){return new TVector(r)}));
        }
    }
);

/** A range of numerical values - either discrete or continuous.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Array.<number>} value - `[start,end,step]`
 * @property {number} size - The number of values in the range (if it's discrete, `undefined` otherwise).
 * @property {number} start - The lower bound of the range.
 * @property {number} end - The upper bound of the range.
 * @property {number} step - The difference between elements in the range.
 * @property {string} type - "range"
 * @class
 * @param {Array.<number>} range - `[start,end,step]`
 */
var TRange = types.TRange = function(range) {
    this.value = range;
    if(this.value!==undefined)
    {
        this.start = this.value[0];
        this.end = this.value[1];
        this.step = this.value[2];
        this.size = Math.floor((this.end-this.start)/this.step);
    }
}
jme.registerType(
    TRange,
    'range',
    {
        'list': function(r) {
            return new TList(math.rangeToList(r.value).map(function(n){return new TNum(n)}));
        }
    }
);

/** 
 *
 * @typedef {object} Numbas.jme.name_info
 * @property {string} root - The 'letters' part of the name, without subscripts or primes.
 * @property {number} letterLength - The number of letters in the name's root. For Greek letters, this is 1, not the the number of characters in `root`.
 * @property {boolean} isGreek - Is the root a Greek letter?
 * @property {boolean} isLong - Is this name 'long'? True if `letterLength` is more than 1.
 * @property {string} subscript - The subscript part of the name.
 * @property {string} primes - The primes part of the name - a string of zero or more `'` characters.
 */

/** Establish properties of a variable name, for the purposes of display.
 * 
 * @memberof Numbas.jme
 * @param {string} name
 * @returns {Numbas.jme.name_info}
 */
var getNameInfo = jme.getNameInfo = function(name) {
    var nameInfo = {
        root: name,
        letterLength: name.length,
        isGreek: false,
        isLong: false,
        subscript: '',
        primes: ''
    };
    var re_math_variable = /^([^_]*[a-zA-Z])(?:(\d+)|_(\d+)|_([^']{1,2}))?('+)?$/;
    var greek = [
        'alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega',
        'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega'
    ]

    var m = name.match(re_math_variable);
    if(m) {
        nameInfo.root = m[1];
        nameInfo.letterLength = m[1].length;
        if(greek.contains(m[1])) {
            nameInfo.isGreek = true;
            nameInfo.letterLength = 1;
        }
        nameInfo.subscript = m[2] || m[3] || m[4];
        nameInfo.primes = m[5];
    } else {
        nameInfo.root = name;
        nameInfo.letterLength = name.length;
    }
    nameInfo.isLong = nameInfo.letterLength > 1;

    return nameInfo;
}

/** Variable name token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} name - The name, prefixed with any annotations joined by colons.
 * @property {string} nameWithoutAnnotation - The name without the annotations.
 * @property {string} value - Same as `name`.
 * @property {Array.<string>} annotation - List of annotations (used to modify display).
 * @property {string} type - "name"
 * @class
 * @param {string} name
 * @param {Array.<string>} annotation
 */
var TName = types.TName = function(name,annotation) {
    this.annotation = annotation;
    this.name = name;
    this.nameWithoutAnnotation = name;
    if(this.annotation && this.annotation.length) {
        this.name = this.annotation.join(':') + ':' + this.name;
    }
    this.value = this.name;
    this.nameInfo = getNameInfo(this.nameWithoutAnnotation);
}
jme.registerType(TName,'name');

/** JME function token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} name - The function's name, prefixed with any annotations joined by colons.
 * @property {string} nameWithoutAnnotation - The name without the annotations.
 * @property {Array.<string>} annotation - List of annotations (used to modify display).
 * @property {number} vars - Arity of the function.
 * @property {string} type - "function"
 * @class
 * @param {string} name
 * @param {Array.<string>} [annotation] - Any annotations for the function's name.
 */
var TFunc = types.TFunc = function(name,annotation) {
    this.name = name;
    this.annotation = annotation;
    this.nameWithoutAnnotation = name;
    if(this.annotation && this.annotation.length) {
        this.name = this.annotation.join(':') + ':' + this.name;
    }
    this.nameInfo = getNameInfo(this.nameWithoutAnnotation);
}
TFunc.prototype = {
    vars: 0
}
jme.registerType(TFunc,'function');

/** Unary/binary operation token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} name
 * @property {number} vars - Arity of the operation.
 * @property {boolean} postfix
 * @property {boolean} prefix
 * @property {boolean} commutative
 * @property {boolean} associative
 * @property {string} type - "op"
 * @class
 * @param {string} op - Name of the operation.
 * @param {boolean} postfix
 * @param {boolean} prefix
 * @param {number} arity - The number of parameters the operation takes.
 * @param {boolean} commutative
 * @param {boolean} associative
 */
var TOp = types.TOp = function(op,postfix,prefix,arity,commutative,associative) {
    this.name = op;
    this.postfix = postfix || false;
    this.prefix = prefix || false;
    this.vars = arity || 2;
    this.commutative = commutative || false;
    this.associative = associative || false;
}
jme.registerType(TOp,'op');

/** Punctuation token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {string} type - The punctuation character.
 * @class
 * @param {string} kind - The punctuation character.
 */
var TPunc = types.TPunc = function(kind) {
    this.type = kind;
}

/** A JavaScript Promise, as a token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Promise} promise - The promise this token represents.
 * @class
 * @param {string} promise - The promise this token represents.
 */
var TPromise = types.TPromise = function(promise) {
    this.promise = promise;
}
jme.registerType(TPromise,'promise');

/** A JME expression, as a token.
 *
 * @memberof Numbas.jme.types
 * @augments Numbas.jme.token
 * @property {Numbas.jme.tree} tree
 * @class
 * @param {string|Numbas.jme.tree} tree
 */
var TExpression = types.TExpression = function(tree) {
    if(typeof(tree)=='string') {
        tree = jme.compile(tree);
    }
    if(tree && tree.tok.type=='expression' && !tree.args) {
        tree = tree.tok.tree;
    }
    this.tree = tree;
}
jme.registerType(TExpression,'expression');

/** Arities of built-in operations.
 * 
 * @readonly
 * @memberof Numbas.jme
 * @enum {number} */
var arity = jme.arity = {
    '!': 1,
    'not': 1,
    'fact': 1,
    '+u': 1,
    '-u': 1,
    '/u': 1
}
/** Some names represent different operations when used as prefix. This dictionary translates them.
 *
 * @readonly
 * @memberof Numbas.jme
 * @enum {string}
 */
var prefixForm = jme.prefixForm = {
    '+': '+u',
    '-': '-u',
    '/': '/u',
    '!': 'not',
    'not': 'not'
}
/** Some names represent different operations when used as prefix. This dictionary translates them.
 *
 * @readonly
 * @memberof Numbas.jme
 * @enum {string}
 */
var postfixForm = jme.postfixForm = {
    '!': 'fact'
}
/** Operator precedence - operators with lower precedence are evaluated first.
 * 
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
    '/u': 2.5,
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
    'xor': 13,
    'implies': 14,
    ':': 100
};
/** Synonyms of operator names - keys in this dictionary are translated to their corresponding values.
 *
 * @enum {string}
 * @memberof Numbas.jme
 * @readonly
 */
var opSynonyms = jme.opSynonyms = {
    '&':'and',
    '&&':'and',
    'divides': '|',
    '||':'or',
    '÷': '/',
    '×': '*',
    '∈': 'in',
    '∧': 'and',
    '∨': 'or',
    '¬': 'not',
    '⟹': 'implies',
    '≠': '<>',
    '≥': '>=',
    '≤': '<=',
    'ˆ': '^'
}
/** Synonyms of function names - keys in this dictionary are translated to their corresponding values.
 *
 * @enum {string}
 * @memberof Numbas.jme
 * @readonly
 */
var funcSynonyms = jme.funcSynonyms = {
    'sqr':'sqrt',
    'gcf': 'gcd',
    'sgn':'sign',
    'len': 'abs',
    'length': 'abs',
    'dec': 'decimal'
};
/** Operations which evaluate lazily - they don't need to evaluate all of their arguments.
 *
 * @memberof Numbas.jme
 */
var lazyOps = jme.lazyOps = [];

/** Right-associative operations.
 *
 * @memberof Numbas.jme
 */
var rightAssociative = jme.rightAssociative = {
    '^': true,
    '+u': true,
    '-u': true,
    '/u': true
}
/** Operations representing relations.
 *
 * @enum {boolean}
 * @memberof Numbas.jme
 * @readonly
 */
var relations = jme.relations =
{
    '<': true,
    '>': true,
    '<=': true,
    '>=': true,
    '=': true,
    '<>': true,
    'in': true
};

/** Operations which commute.
 *
 * @enum {boolean}
 * @memberof Numbas.jme
 * @readonly
 */
var commutative = jme.commutative =
{
    '*': true,
    '+': true,
    'and': true,
    '=': true,
    'xor': true
};

/** Operations which are associative, i.e. (a∘b)∘c = a∘(b∘c).
 *
 * @enum {boolean}
 * @memberof Numbas.jme
 * @readonly
 */
var associative = jme.associative =
{
    '*': true,
    '+': true,
    'and': true,
    'or': true,
    'xor': true
};

/** Binary operations which have an equivalent operation written the other way round.
 *
 * @enum {string}
 * @memberof Numbas.jme
 */
var converseOps = jme.converseOps = {
    '<': '>',
    '>': '<',
    '<=': '>=',
    '>=': '<='
}


/** A standard parser for JME expressions.
 *
 * @memberof Numbas.jme
 * @type {Numbas.jme.Parser}
 */
var standardParser = jme.standardParser = new jme.Parser();
jme.standardParser.addBinaryOperator(';',{precedence:0});


/** A function which checks whether a {@link Numbas.jme.funcObj} can be applied to the given arguments.
 *
 * @callback Numbas.jme.typecheck_fn
 * @param {Array.<Numbas.jme.token>} variables
 * @returns {boolean}
 */

/** Evaluate a JME function on a list of arguments and in a given scope.
 *
 * @callback Numbas.jme.evaluate_fn
 * @param {Array.<Numbas.jme.tree|Numbas.jme.token|object>} args - Arguments of the function. If the function is {@link Numbas.jme.lazyOps|lazy}, syntax trees are passed, otherwise arguments are evaluated to JME tokens first. If the {@link Numbas.jme.funcObj_options|unwrapValues} option is set, the arguments are unwrapped to raw JavaScript values.
 * @param {Numbas.jme.Scope} scope - Scope in which the function is evaluated.
 * @returns {Numbas.jme.token|object} If {@link Numbas.jme.funcObj_options|unwrapValues} is set, the raw value of the result, otherwise a JME token.
 */

/** Options for the {@link Numbas.jme.funcObj} constructor.
 *
 * @typedef {object} Numbas.jme.funcObj_options
 * @property {Numbas.jme.typecheck_fn} typecheck - Check that this function can be evaluated on the given arguments.
 * @property {Numbas.jme.evaluate_fn} evaluate - Evaluate the function on a list of arguments and in a given scope.
 * @property {boolean} unwrapValues - Unwrap list elements in arguments into javascript primitives before passing to the evaluate function?
 */

var funcObjAcc = 0;    //accumulator for ids for funcObjs, so they can be sorted

/**
 * A JME function. Capable of confirming that it can be evaluated on a given list of arguments, and returning the result of its evaluation on a list of arguments inside a given scope.
 *
 * @memberof Numbas.jme
 * @class
 * @param {string} name
 * @param {Array.<Function|string>} intype - A list of data type constructors for the function's parameters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type. If `null`, then `options.typecheck` is used.
 * @param {Function} outcons - The constructor for the output value of the function.
 * @param {Numbas.jme.evaluate_fn} fn - JavaScript code which evaluates the function.
 * @param {Numbas.jme.funcObj_options} options
 *
 */
var funcObj = jme.funcObj = function(name,intype,outcons,fn,options)
{
    /** Globally unique ID of this function object.
     *
     * @name id
     * @member {number}
     * @memberof Numbas.jme.funcObj
     */
    this.id = funcObjAcc++;
    options = options || {};

    /** The function's name.
     *
     * @name name
     * @member {string}
     * @memberof Numbas.jme.funcObj
     */
    this.name = name;

    /** A description of what the function does.
     *
     * @name description
     * @member {string}
     * @memberof Numbas.jme.funcObj
     */
    this.description = options.description || '';

    /** Check the given list of arguments against this function's calling signature.
     *
     * @name intype
     * @memberof Numbas.jme.funcObj
     * @member {Function}
     * @param {Array.<Numbas.jme.token>}
     * @returns {Array.<string>|boolean} `false` if the given arguments are not valid for this function, or a list giving the desired type for each argument - arguments shouldbe cast to these types before evaluating.
     */
    this.intype = jme.signature.sequence.apply(this,intype.map(jme.parse_signature));
    /** The return type of this function. Either a Numbas.jme.token constructor function, or the string '?', meaning unknown type.
     *
     * @name outtype
     * @member {Function|string}
     * @memberof Numbas.jme.funcObj
     */
    if(typeof(outcons)=='function') {
        this.outtype = outcons.prototype.type;
    } else {
        this.outtype = '?';
    }
    this.outcons = outcons;
    /** Javascript function for the body of this function.
     *
     * @name fn
     * @member {Function}
     * @memberof Numbas.jme.funcObj
     */
    this.fn = fn;
    /** Can this function be called with the given list of arguments?
     *
     * @function typecheck
     * @param {Numbas.jme.token[]} variables
     * @returns {boolean}
     * @memberof Numbas.jme.funcObj
     */
    var check_signature = this.intype;
    this.typecheck = options.typecheck || function(variables) {
        var match = check_signature(variables);
        return match!==false && sig_remove_missing(match).length==variables.length;
    }
    /** Evaluate this function on the given arguments, in the given scope.
     *
     * @function evaluate
     * @param {Numbas.jme.token[]} args
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.token}
     * @memberof Numbas.jme.funcObj
     */
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
    /** Does this function behave randomly?
     *
     * @name random
     * @member {boolean}
     * @memberof Numbas.jme.funcObj
     */
    this.random = options.random;
}
/** Randoly generate values for each of the given names between `min` and `max`.
 *
 * @param {Array.<string>} varnames
 * @param {number} min
 * @param {number} max
 * @param {number} times - The number of values to produce for each name.
 * @returns {Array.<object>} - The list of dictionaries mapping names to their values.
 */
function randoms(varnames,min,max,times)
{
    times *= varnames.length || 1;
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
/** Does every name in `array1` occur in `array2`?
 *
 * @param {Array.<string>} array1
 * @param {Array.<string>} array2
 * @returns {boolean}
 */
function varnamesAgree(array1, array2) {
    var name;
    for(var i=0; i<array1.length; i++) {
        if( (name=array1[i])[0]!='$' && !array2.contains(name) )
            return false;
    }
    return true;
};
/** Decide if two numbers are close enough to count as equal.
 *
 * @callback Numbas.jme.checkingFunction
 * @param {number|Numbas.math.ComplexDecimal} r1
 * @param {number|Numbas.math.ComplexDecimal} r2
 * @param {number} tolerance - A measure of how close the results need to be to count as equal. What this means depends on the checking function.
 * @returns {boolean} - True if `r1` and `r2` are close enough to be equal.
 */
/**
 * Numerical comparison functions.
 *
 * @enum {Numbas.jme.checkingFunction}
 * @memberof Numbas.jme
 */
var checkingFunctions = jme.checkingFunctions =
{
    /** Absolute difference between variables - fail if `Math.abs(r1-r2)` is bigger than `tolerance`.
     *
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    absdiff: function(r1,r2,tolerance)
    {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.minus(r2).absoluteValue().re.lessThan(Math.abs(tolerance));
        }

        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        return math.leq(math.abs(math.sub(r1,r2)), Math.abs(tolerance));
    },
    /** Relative (proportional) difference between variables - fail if `r1/r2 - 1` is bigger than `tolerance`.
     *
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    reldiff: function(r1,r2,tolerance) {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.minus(r2).absoluteValue().re.lessThan(r2.times(tolerance));
        }

        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        //
        if(r2!=0) {
            return math.leq(Math.abs(math.sub(r1,r2)), Math.abs(math.mul(tolerance,r2)));
        } else {    //or if correct answer is 0, checks abs difference
            return math.leq(Math.abs(math.sub(r1,r2)), tolerance);
        }
    },
    /** Round both values to `tolerance` decimal places, and fail if unequal.
     *
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    dp: function(r1,r2,tolerance) {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.toDecimalPlaces(tolerance).equals(r2.toDecimalPlaces(tolerance));
        }

        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        tolerance = Math.floor(Math.abs(tolerance));
        return math.eq( math.precround(r1,tolerance), math.precround(r2,tolerance) );
    },
    /** Round both values to `tolerance` significant figures, and fail if unequal. 
     *
     * @param {number|Numbas.math.ComplexDecimal} r1
     * @param {number|Numbas.math.ComplexDecimal} r2
     * @param {number} tolerance
     * @returns {boolean}
     */
    sigfig: function(r1,r2,tolerance) {
        if(math.isComplexDecimal(r1) || math.isComplexDecimal(r2)) {
            r1 = math.ensure_decimal(r1);
            r2 = math.ensure_decimal(r2);
            return r1.toSignificantDigits(tolerance).equals(r2.toSignificantDigits(tolerance));
        }

        if(r1===Infinity || r1===-Infinity)
            return r1===r2;
        tolerance = Math.floor(Math.abs(tolerance));
        return math.eq(math.siground(r1,tolerance), math.siground(r2,tolerance));
    }
};
/** Custom substituteTree behaviour for specific functions - for a given usage of a function, substitute in variable values from the scope.
 *
 * Functions have the signature `<tree with function call at the top, scope, allowUnbound>`.
 *
 * @memberof Numbas.jme
 * @enum {Numbas.jme.substituteTree}
 * @see Numbas.jme.substituteTree
 */
var substituteTreeOps = jme.substituteTreeOps = {};
/** Custom findvars behaviour for specific functions - for a given usage of a function, work out which variables it depends on.
 *
 * @memberof Numbas.jme
 * @enum {Numbas.jme.findvars}
 * @see Numbas.jme.findvars
 */
var findvarsOps = jme.findvarsOps = {}
/** Find all variables used in given syntax tree.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.tree} tree
 * @param {Array.<string>} boundvars - Variables to be considered as bound (don't include them).
 * @param {Numbas.jme.Scope} scope
 * @returns {Array.<string>}
 */
var findvars = jme.findvars = function(tree,boundvars,scope)
{
    if(!scope) {
        scope = jme.builtinScope;
    }
    if(boundvars===undefined)
        boundvars = [];
    if(!tree) {
        return [];
    }
    if(tree.tok.type=='function' && tree.tok.name in findvarsOps) {
        return findvarsOps[tree.tok.name](tree,boundvars,scope);
    }
    if(tree.args===undefined)
    {
        switch(tree.tok.type)
        {
        case 'name':
            var name = jme.normaliseName(tree.tok.name,scope);
            if(boundvars.indexOf(name)==-1 && !scope.getConstant(name))
                return [name];
            else
                return [];
            break;
        case 'string':
            if(tree.tok.safe) {
                return [];
            }
            var bits = util.contentsplitbrackets(tree.tok.value);
            var out = [];
            for(var i=0;i<bits.length;i+=4)
            {
                var plain = bits[i];
                var sbits = util.splitbrackets(plain,'{','}','(',')');
                for(var k=1;k<=sbits.length-1;k+=2)
                {
                    var tree2 = scope.parser.compile(sbits[k]);
                    out = out.merge(findvars(tree2,boundvars,scope));
                }
                if(i<=bits.length-3) {
                    var tex = bits[i+2];
                    var tbits = jme.texsplit(tex);
                    for(var j=0;j<tbits.length;j+=4) {
                        var cmd = tbits[j+1];
                        var expr = tbits[j+3];
                        switch(cmd)
                        {
                        case 'var':
                            var tree2 = scope.parser.compile(expr);
                            out = out.merge(findvars(tree2,boundvars,scope));
                            break;
                        case 'simplify':
                            var sbits = util.splitbrackets(expr,'{','}','(',')');
                            for(var k=1;k<sbits.length-1;k+=2)
                            {
                                var tree2 = scope.parser.compile(sbits[k]);
                                out = out.merge(findvars(tree2,boundvars,scope));
                            }
                            break;
                        }
                    }
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
            vars = vars.merge(findvars(tree.args[i],boundvars,scope));
        return vars;
    }
}
/** Check that two values are equal.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.token} r1
 * @param {Numbas.jme.token} r2
 * @param {Function} checkingFunction - One of {@link Numbas.jme.checkingFunctions}.
 * @param {number} checkingAccuracy
 * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
 * @returns {boolean}
 */
var resultsEqual = jme.resultsEqual = function(r1,r2,checkingFunction,checkingAccuracy,scope)
{    // first checks both expressions are of same type, then uses given checking type to compare results
    var type = jme.findCompatibleType(r1.type,r2.type);
    if(!type) {
        return false;
    }
    r1 = jme.castToType(r1,type);
    r2 = jme.castToType(r2,type);
    var v1 = r1.value, v2 = r2.value;

    switch(type) {
        case 'rational':
            return checkingFunction( v1.toDecimal(), v2.toDecimal(), checkingAccuracy );
            break;
        case 'number':
        case 'decimal':
        case 'integer':
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
                if(!resultsEqual(new TNum(v1[i]),new TNum(v2[i]),checkingFunction,checkingAccuracy,scope))
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
                    if(!resultsEqual(new TNum(v1[i][j]||0),new TNum(v2[i][j]||0),checkingFunction,checkingAccuracy,scope))
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
                if(!resultsEqual(v1[i],v2[i],checkingFunction,checkingAccuracy,scope))
                    return false;
            }
            return true;
        default:
            return util.eq(r1,r2,scope);
    }
};

/** List names of variables used in `tree`, obtained by depth-first search.
 *
 * Differs from {@link Numbas.jme.findvars} by including duplicates, and ignoring {@link Numbas.jme.findvarsOps}.
 * 
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.tree} tree
 * @returns {string[]}
 */
var varsUsed = jme.varsUsed = function(tree) {
    switch(tree.tok.type) {
        case 'name':
            return [tree.tok.name];
        case 'op':
        case 'function':
            var o = [];
            for(var i=0;i<tree.args.length;i++) {
                o = o.concat(jme.varsUsed(tree.args[i]));
            }
            return o;
        default:
            return [];
    }
};

/** Use JS comparison operators to compare the `value` property of both tokens.
 * Used when the token wraps a JS built-in type, such as string, number or boolean.
 *
 * @memberof Numbas.jme
 * @function
 * @see Numbas.jme.tokenComparisons
 * @param {Numbas.jme.token} a
 * @param {Numbas.jme.token} b
 * @returns {boolean}
 */
var compareTokensByValue = jme.compareTokensByValue = function(a,b) {
    return a.value>b.value ? 1 : a.value<b.value ? -1 : 0;
}

/** Functions to compare two tokens of the same type.
 * Returns -1 if a<b, 0 if a=b, and 1 if a>b.
 *
 * @see Numbas.jme.compareTokens
 * @memberof Numbas.jme
 */
var tokenComparisons = Numbas.jme.tokenComparisons = {
    'number': compareTokensByValue,
    'integer': compareTokensByValue,
    'rational': function(a,b) {
        a = a.value.toFloat();
        b = b.value.toFloat();
        return a>b ? 1 : a<b ? -1 : 0;
    },
    'string': compareTokensByValue,
    'boolean': compareTokensByValue
}

/** Compare two tokens, for the purposes of sorting.
 * Uses JavaScript comparison for numbers, strings and booleans, and {@link Numbas.jme.compareTrees} for everything else, or when types differ.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.token} a
 * @param {Numbas.jme.token} b
 * @see Numbas.jme.tokenComparisons
 * @returns {number} -1 if `a < b`, 1 if `a > b`, else 0.
 */
var compareTokens = jme.compareTokens = function(a,b) {
    if(a.type!=b.type) {
        var type = jme.findCompatibleType(a.type,b.type);
        if(type) {
            var ca = jme.castToType(a,type);
            var cb = jme.castToType(b,type);
            return compareTokens(ca,cb);
        } else {
            return jme.compareTrees({tok:a},{tok:b});
        }
    } else {
        var compare = tokenComparisons[a.type];
        if(compare) {
            return compare(a,b);
        } else {
            return jme.compareTrees({tok:a},{tok:b});
        }
    }
}

/** Produce a comparison function which sorts tokens after applying a function to them.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Function} fn - take a token and return a token
 * @returns {Function}
 */
jme.sortTokensBy = function(fn) {
    return function(a,b) {
        a = fn(a);
        b = fn(b);
        if(a===undefined) {
            return b===undefined ? 0 : 1;
        } else if(b===undefined) {
            return -1;
        } else {
            return jme.compareTokens(a,b);
        }
    }
}

/** Are the two given trees exactly the same?
 *
 * @memberof Numbas.jme
 * @param {Numbas.jme.tree} a
 * @param {Numbas.jme.tree} b
 * @param {Numbas.jme.Scope} scope - The scope to use for normalising names.
 * @returns {boolean}
 */
var treesSame = jme.treesSame = function(a,b,scope) {
    var ta = a.tok;
    var tb = b.tok;
    if(a.args || b.args) {
        if(!(a.args && b.args && a.args.length==b.args.length)) {
            return false;
        }
        for(var i=0; i<a.args.length;i++) {
            if(!treesSame(a.args[i],b.args[i],scope)) {
                return false;
            }
        }
    } else {
        var type = jme.findCompatibleType(ta.type,tb.type);
        if(!type) {
            return false;
        } else {
            ta = jme.castToType(ta,type);
            tb = jme.castToType(tb,type);
        }
    }
    return util.eq(a.tok,b.tok,scope);
}

/** Compare two trees.
 *
 * * Compare lists of variables lexically using {@link Numbas.jme.varsUsed}; longest goes first if one is a prefix of the other
 * * then monomials before anything else
 * * then by data type
 * * then by function name
 * * otherwise return 0.
 *
 * @memberof Numbas.jme
 * @function
 * @param {Numbas.jme.tree} a
 * @param {Numbas.jme.tree} b
 * @returns {number} -1 if `a` should appear to the left of `b`, 0 if equal, 1 if `a` should appear to the right of `b`.
 */
var compareTrees = jme.compareTrees = function(a,b) {
    var sign_a = 1;
    while(jme.isOp(a.tok,'-u')) {
        a = a.args[0];
        sign_a *= -1;
    }
    var sign_b = 1;
    while(jme.isOp(b.tok,'-u')) {
        b = b.args[0];
        sign_b *= -1;
    }
    var va = jme.varsUsed(a);
    var vb = jme.varsUsed(b);
    for(var i=0;i<va.length;i++) {
        if(i>=vb.length) {
            return -1;
        }
        if(va[i]!=vb[i]) {
            return va[i]<vb[i] ? -1 : 1;
        }
    }
    if(vb.length>va.length) {
        return 1;
    }

    var ma = jme.isMonomial(a);
    var mb = jme.isMonomial(b);
    var isma = ma!==false;
    var ismb = mb!==false;
    if(isma!=ismb) {
        return isma ? -1 : 1;
    }
    if(isma && ismb && !(a.tok.type=='name' && b.tok.type=='name')) {
        var d = jme.compareTrees(ma.base,mb.base);
        if(d==0) {
            var dd = jme.compareTrees(mb.degree,ma.degree);
            if(dd!=0) {
                return dd;
            } else {
                var dc = compareTrees(ma.coefficient,mb.coefficient);
                return dc!=0 ? dc : sign_a==sign_b ? 0 : sign_a ? 1 : -1;
            }
        } else {
            return d;
        }
    }

    if(a.tok.type!=b.tok.type) {
        var order = ['op','function'];
        var oa = order.indexOf(a.tok.type);
        var ob = order.indexOf(b.tok.type);
        if(oa!=ob) {
            return oa>ob ? -1 : 1;
        } else {
            return a.tok.type<b.tok.type ? -1 : 1;
        }
    }

    if(a.args || b.args) {
        var aargs = a.args || [];
        var bargs = b.args || [];
        if(aargs.length!=bargs.length) {
            return aargs.length<bargs.length ? -1 : 1;
        }
        for(var i=0;i<aargs.length;i++) {
            var c = jme.compareTrees(aargs[i],bargs[i]);
            if(c!=0) {
                return c;
            }
        }
    }

    switch(a.tok.type) {
        case 'op':
        case 'function':
            /** Is the given tree of the form `?^?`, `?*(?^?)` or `?/(?^?)`.
             *
             * @param {Numbas.jme.tree} t
             * @returns {boolean}
             */
            function is_pow(t) {
                return t.tok.name=='^' || (t.tok.name=='*' && t.args[1].tok.name=='^') || (t.tok.name=='/' && t.args[1].tok.name=='^');
            }
            var pa = is_pow(a);
            var pb = is_pow(b);
            if(pa && !pb) {
                return -1;
            } else if(!pa && pb) {
                return 1;
            }
            if(a.tok.name!=b.tok.name) {
                return a.tok.name<b.tok.name ? -1 : 1;
            }
            break;
        case 'expression':
            return jme.compareTrees(a.tok.tree, b.tok.tree);
        default:
            if(jme.isType(a.tok,'number')) {
                var na = jme.castToType(a.tok,'number').value;
                var nb = jme.castToType(b.tok,'number').value;
                if(na.complex || nb.complex) {
                    na = na.complex ? na : {re:na,im:0};
                    nb = nb.complex ? nb : {re:nb,im:0};
                    var gt = na.re > nb.re || (na.re==nb.re && na.im>nb.im);
                    var eq = na.re==nb.re && na.im==nb.im && sign_a==sign_b;
                    return gt ? 1 : eq ? 0 : -1;
                } else {
                    return na<nb ? -1 : na>nb ? 1 : sign_a==sign_b ? 0 : sign_a ? 1 : -1;
                }
            }
    }
    return sign_a==sign_b ? 0 : sign_a ? 1 : -1;
}

/** Infer the types of variables in an expression, by trying all definitions of functions and returning only those that can be satisfied by an assignment of types to variable names.
 * Doesn't work well on functions with unknown return type, like `if` and `switch`. In these cases, it assumes the return type of the function is whatever it needs to be, even if that is inconsistent with what the function would actually do.
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.Scope} scope
 * @returns {object.<string>} A dictionary mapping names to types.
 */
jme.inferVariableTypes = function(tree,scope) {
    /** Create an annotated copy of the tree, fetching definitions for functions, and storing state to enumerate function definitions.
     *
     * @param {Numbas.jme.tree} tree
     */
    function AnnotatedTree(tree) {
        this.tok = tree.tok;
        if(tree.args) {
            this.args = tree.args.map(function(a){ return new AnnotatedTree(a); });
        }
        switch(tree.tok.type) {
            case 'op':
            case 'function':
                var fns = scope.getFunction(tree.tok.name);
                this.fns = [];
                this.signature_enumerators = [];
                for(var i=0;i<fns.length;i++) {
                    var fn = fns[i];
                    var se = new SignatureEnumerator(fn.intype);
                    if(se.is_static()) {
                        if(se.length() != tree.args.length) {
                            continue;
                        }
                        var sig = se.signature();
                        var constants_ok = this.args.every(function(arg,j) {
                            switch(arg.tok.type) {
                                case 'op':
                                case 'function':
                                    for(var i=0;i<arg.fns.length;i++) {
                                        if(jme.isTypeCompatible(arg.fns[i].outtype,sig[j])) {
                                            return true;
                                        }
                                    }
                                    return false;
                                case 'name':
                                    return true;
                                default:
                                    return jme.isTypeCompatible(arg.tok.type,sig[j]);
                            }
                        });
                        if(!constants_ok) {
                            continue;
                        }
                    }
                    this.fns.push(fn);
                    this.signature_enumerators.push(se);
                }
                this.pos = 0;
                break;
            default:
                break;
        }
    }
    AnnotatedTree.prototype = /** @lends AnnotatedTree.prototype */ {

        toString: function() {
            var args;
            if(this.args) {
                args = this.args.map(function(arg){ return arg.toString(); });
            }
            switch(this.tok.type) {
                case 'op':
                case 'function':
                    var header = this.tok.name+': '+this.signature_enumerators[this.pos].signature().join('->')+'->'+this.fns[this.pos].outtype;
                    return jme.display.align_text_blocks(header, args);
                default:
                    if(args) {
                        return jme.display.align_text_blocks(this.tok.type,args);
                    } else {
                        return jme.display.treeToJME({tok:this.tok});
                    }
            }
        },

        /** Reset this tree to its initial state.
         */
        backtrack: function() {
            if(this.args) {
                this.args.forEach(function(t){t.backtrack();});
            }
            switch(this.tok.type) {
                case 'op':
                case 'function':
                    this.pos = 0;
                    this.signature_enumerators.forEach(function(se){se.backtrack();});
                    break;
            }
        },

        /** Describe the current state of the functions on the tree: which definition to use, and which types to expect for arguments.
         *
         * @param {string} [depth] - Indentation for nested arguments.
         */
        describe_state: function(depth) {
            depth = depth || '';
            switch(this.tok.type) {
                case 'op':
                case 'function':
                    var sig = this.signature_enumerators[this.pos].signature().join(', ');
                    console.log(depth+this.tok.name+' '+this.pos+': '+sig);
                    break;
            }
            if(this.args) {
                this.args.forEach(function(a) { a.describe_state(depth+'  '); });
            }
        },

        /** Find an assignment of types to variables in this tree which produces the given output type.
         *
         * @param {string} outtype - The name of the desired type of this tree.
         * @param {object} assignments - Assignments of variables that have already been made.
         * @returns {object} - A dictionary of assignments.
         */
        assign: function(outtype,assignments) {
            if(outtype=='?') {
                outtype = undefined;
            }
            /** Find a type which can be cast to all of the desired types.
             *
             * @param {Array.<string>} types - The names of the desired types.
             * @returns {string}
             */
            function mutually_compatible_type(types) {
                var preferred_types = ['number','decimal'];
                /** Can the given type be cast to all of the desired types?
                 *
                 * @param {string} x - The name of a type.
                 * @returns {boolean}
                 */
                function mutually_compatible(x) {
                    var casts = jme.types[x].prototype.casts || {};
                    return types.every(function(t) { return t==x || casts[t]; });
                }
                for(var i=0;i<preferred_types.length;i++) {
                    var type = preferred_types[i];
                    if(mutually_compatible(type)) {
                        return type;
                    }
                }
                for(var x in jme.types) {
                    if(mutually_compatible(x)) {
                        return x;
                    }
                }
            }

            switch(this.tok.type) {
                case 'name':
                    var name = jme.normaliseName(this.tok.name,scope);
                    if(scope.getConstant(name)) {
                        return assignments;
                    }
                    if(outtype===undefined || assignments[name]==outtype) {
                        return assignments;
                    } else if(assignments[name]!==undefined && assignments[name].type!=outtype) {
                        assignments = util.copyobj(assignments,true);
                        assignments[name].casts[outtype] = true;
                        var type = mutually_compatible_type(Object.keys(assignments[name].casts));
                        if(type) {
                            assignments[name].type = type;
                            return assignments;
                        } else {
                            return false;
                        }
                    } else {
                        assignments = util.copyobj(assignments,true);
                        var casts = {};
                        casts[outtype] = true;
                        assignments[name] = {
                            type: outtype,
                            casts: casts
                        }
                        return assignments;
                    }
                case 'op':
                case 'function':
                    if(!this.fns.length) {
                        return this.assign_args(assignments);
                    }
                    if(outtype && !jme.isTypeCompatible(this.fns[this.pos].outtype,outtype)) {
                        return false;
                    }
                    var sig = this.signature_enumerators[this.pos].signature();
                    if(sig.length!=this.args.length) {
                        return false;
                    }
                    return this.assign_args(assignments,sig);
                default:
                    if(outtype && !jme.isTypeCompatible(this.tok.type,outtype)) {
                        return false;
                    }
                    return this.assign_args(assignments);
            }
        },

        /** Find an assignment based on this tree's arguments, with optional specified types for each of the arguments.
         *
         * @param {object} assignments - The data types of names that have been assigned.
         * @param {Numbas.jme.signature_result} [signature]
         * @returns {object} - A dictionary of assignments.
         */
        assign_args: function(assignments,signature) {
            if(!this.args) {
                return assignments;
            }
            for(var i=0;i<this.args.length;i++) {
                var outtype = signature!==undefined ? signature[i] : undefined;
                assignments = this.args[i].assign(outtype,assignments);
                if(assignments===false) {
                    return false;
                }
            }
            return assignments;
        },

        /** Advance to the next state.
         *
         * @returns {boolean} True if successful.
         */
        next: function() {
            if(this.args) {
                for(var i=0;i<this.args.length;i++) {
                    if(this.args[i].next()) {
                        for(var j=0;j<i;j++) {
                            this.args[j].backtrack();
                        }
                        return true;
                    }
                }
            }
            switch(this.tok.type) {
                case 'op':
                case 'function':
                    if(this.fns.length==0) {
                        return false;
                    }
                    var s = this.signature_enumerators[this.pos].next();
                    if(s) {
                        this.args.forEach(function(arg){ arg.backtrack(); });
                        return this.signature_enumerators[this.pos].length()<=this.args.length;
                    } else if(this.pos<this.fns.length-1) {
                        this.pos += 1;
                        this.signature_enumerators[this.pos].backtrack();
                        this.args.forEach(function(arg){ arg.backtrack(); });
                        return true;
                    } else {
                        return false;
                    }
                default:
                    return false;
            }
        }
    }

    var at = new AnnotatedTree(tree);
    var steps = 0;
    do {
        steps += 1;
        if(steps==100) {
            throw(new Error("Took too many steps to infer variable types"));
        }
        var res = at.assign(undefined,{});
        if(res!==false) {
            var o = {};
            for(var x in res) {
                o[x] = res[x].type;
            }
            return o;
        }
    } while(at.next());

    return false;
}

var SignatureEnumerator = jme.SignatureEnumerator = function(sig) {
    this.sig = sig;
    switch(sig.kind) {
        case 'multiple':
            this.children = [];
            break;
        case 'optional':
            this.child = new SignatureEnumerator(sig.signature);
            this.include = false;
            break;
        case 'label':
            this.child = new SignatureEnumerator(sig.signature);
            break;
        case 'sequence':
            this.children = sig.signatures.map(function(s){ return new SignatureEnumerator(s)});
            break;
        case 'or':
            this.children = sig.signatures.map(function(s){ return new SignatureEnumerator(s)});
            this.pos = 0;
            break;
        case 'type':
        case 'anything':
        default:
            break;
    }
}
SignatureEnumerator.prototype = {
    /** Does this signature only have one possible realisation?
     *
     * @returns {boolean}
     */
    is_static: function() {
        switch(this.sig.kind) {
            case 'type':
            case 'anything':
                return true;
            case 'sequence':
                return this.children.every(function(c){ return c.is_static(); });
            default:
                return false;
        }
    },

    /** The length of the signature corresponding to the current state of the enumerator.
     *
     * @returns {number}
     */
    length: function() {
        switch(this.sig.kind) {
            case 'label':
                return this.child.length();
            case 'optional':
                return this.include ? this.child.length() : 0;
            case 'sequence':
            case 'multiple':
                return this.children.map(function(c){return c.length()}).reduce(function(t,c){return t+c},0);
            case 'or':
                return this.children[this.pos].length();
            case 'type':
                return 1;
            case 'anything':
                return 1;
            case 'list':
                return 1;
            case 'dict':
                return 1;
        }
    },
    /** Get the signature corresponding to the current state of the enumerator.
     *
     * @returns {Array.<string>}
     */
    signature: function() {
        switch(this.sig.kind) {
            case 'label':
                return this.child.signature();
            case 'optional':
                return this.include ? this.child.signature() : [];
            case 'sequence':
            case 'multiple':
                return this.children.map(function(c){return c.signature()}).reduce(function(args,c){return args.concat(c)},[]);
            case 'or':
                return this.children[this.pos].signature();
            case 'type':
                return [this.sig.type];
            case 'anything':
                return ['?'];
            case 'list':
                return ['list'];
            case 'dict':
                return ['dict'];
            default:
                return ['?'];
        }
    },
    /** Advance to the next state, if possible.
     *
     * @returns {boolean} True if the enumerator could advance.
     */
    next: function() {
        switch(this.sig.kind) {
            case 'optional':
            case 'label':
                return false;
            case 'or':
                if(!this.children[this.pos].next()) {
                    this.pos += 1;
                    return this.pos<this.children.length;
                }
                return true;
            case 'sequence':
            case 'multiple':
                for(var i=this.children.length-1;i>=0;i--) {
                    if(this.children[i].next()) {
                        return true;
                    }
                    this.children[i].backtrack();
                }
                if(this.sig.kind=='multiple') {
                    this.children.forEach(function(c) { c.backtrack(); });
                    this.children.push(new SignatureEnumerator(this.sig.signature));
                    return true;
                }
                return false;
            case 'type':
            case 'anything':
            default:
                return false;
        }
    },
    /** Reset the enumerator to its initial state.
     */
    backtrack: function() {
        switch(this.sig.kind) {
            case 'optional':
            case 'label':
                this.child.backtrack();
                break;
            case 'or':
                this.children.forEach(function(c){ c.backtrack(); });
                this.pos = 0;
                break;
            case 'sequence':
                this.children.forEach(function(c){ c.backtrack(); });
                break;
            case 'multiple':
                this.children = [];
                break;
            default:
                break;
        }
    }
}

/** Infer the type of an expression by inferring the types of free variables, then finding definitions of operators and functions which work.
 *
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.Scope} scope
 * @returns {string}
 */
jme.inferExpressionType = function(tree,scope) {
    var assignments = jme.inferVariableTypes(tree,scope);

    /** Construct a stub of a token of the given type, for the type-checker to work against.
     *
     * @param {string} type
     * @returns {Numbas.jme.token}
     */
    function fake_token(type) {
        var tok = {type: type};
        if(jme.types[type]) {
            tok.__proto__ = jme.types[type].prototype;
        }
        return tok;
    }
    for(var x in assignments) {
        assignments[x] = fake_token(assignments[x]);
    }
    /** Infer the type of a tree.
     *
     * @param {Numbas.jme.tree} tree
     * @returns {string}
     */
    function infer_type(tree) {
        var tok = tree.tok;
        switch(tok.type) {
            case 'name':
                var assignment = assignments[jme.normaliseName(tok.name,scope)];
                if(assignment) {
                    return assignment.type;
                }
                var constant = scope.getConstant(tok.name)
                if(constant) {
                    return constant.value.type;
                }
                return tok.type;
            case 'op':
            case 'function':
                var op = jme.normaliseName(tok.name,scope);
                if(lazyOps.indexOf(op)>=0) {
                    return scope.getFunction(op)[0].outtype;
                }
                else {
                    var eargs = [];
                    for(var i=0;i<tree.args.length;i++) {
                        eargs.push(fake_token(infer_type(tree.args[i])));
                    }
                    var matchedFunction = scope.matchFunctionToArguments(tok,eargs);
                    if(matchedFunction) {
                        return matchedFunction.fn.outtype;
                    } else {
                        return '?';
                    }
                }
            default:
                return tok.type;
        }
    }

    return infer_type(tree);
}

/** Remove "missing" arguments from a signature-checker result.
 *
 * @param {Numbas.jme.signature_result} items
 * @returns {Numbas.jme.signature_result}
 */
function sig_remove_missing(items) {
    return items.filter(function(d){return !d.missing});
}

/** A signature-checker function. Takes a list of {@link Numbas.jme.token} objects, and returns a {@link Numbas.jme.signature_result} representing the matched arguments, or `false` if the signature doesn't match.
 *
 * @typedef Numbas.jme.signature
 * @type {Function}
 * @property {string} kind - The kind of this signature checker, e.g. "type", "anything", "multiple". Used by the type inference routine, among other things.
 */

/** A list of arguments matched by a signature checker. At most one per argument passed in.
 *
 * @typedef Numbas.jme.signature_result
 * @type {Array.<Numbas.jme.signature_result_argument>}
 */

/** Information about an argument matched by a signature checker.
 * The main purpose is to specify the desired type of the argument, but there are other properties for certain types.
 *
 * @typedef Numbas.jme.signature_result_argument
 * @type {object}
 * @property {string} type - The data type that the argument should be cast to.
 * @property {boolean} missing - Does this represent an optional argument that wasn't given?
 * @property {boolean} nonspecific - Does this represent an argument matched with an 'anything' signature? If so, don't use it when comparing two signature results.
 */

/** Signature-checking function constructors.
 *
 * @see {Numbas.jme.signature}
 * @enum {Function}
 */
jme.signature = {
    label: function(name,sig) {
        var f = function(args) {
            var result = sig(args);
            if(!result) {
                return false;
            }
            result.forEach(function(r) {
                r.name = name;
            });
            return result;
        };
        f.kind = 'label';
        f.signature = sig;
        return f;
    },
    anything: function() {
        var f = function(args) {
            return args.length>0 ? [{type: args[0].type, nonspecific: true}] : false;
        }
        f.kind = 'anything';
        return f;
    },
    type: function(type) {
        var f = function(args) {
            if(args.length==0) {
                return false;
            }
            if(args[0].type!=type) {
                var casts = args[0].casts;
                if(!casts || !casts[type]) {
                    return false;
                }
            }
            return [{type: type}];
        }
        f.kind = 'type';
        f.type = type;
        return f;
    },
    multiple: function(sig) {
        var f = function(args) {
            var got = [];
            while(true) {
                var match = sig(args);
                if(match===false) {
                    break;
                }
                args = args.slice(match.length);
                got = got.concat(match);
                if(match.length==0) {
                    break;
                }
            }
            return got;
        };
        f.kind = 'multiple';
        f.signature = sig;
        return f;
    },
    optional: function(sig) {
        var f = function(args) {
            var match = sig(args);
            if(match) {
                return match;
            } else {
                return [{missing: true}];
            }
        }
        f.kind = 'optional';
        f.signature = sig;
        return f;
    },
    sequence: function() {
        var bits = Array.prototype.slice.apply(arguments);
        var f = function(args) {
            var match  = [];
            for(var i=0;i<bits.length;i++) {
                var bitmatch = bits[i](args);
                if(bitmatch===false) {
                    return false;
                }
                match = match.concat(bitmatch);
                args = args.slice(sig_remove_missing(bitmatch).length);
            }
            return match;
        }
        f.kind = 'sequence';
        f.signatures = bits;
        return f;
    },
    list: function() {
        var bits = Array.prototype.slice.apply(arguments);
        var seq = jme.signature.sequence.apply(this,bits);
        var f = function(args) {
            if(args.length==0) {
                return false;
            }
            if(!jme.isType(args[0],'list')) {
                return false;
            }
            var arg = jme.castToType(args[0],'list');
            var items = seq(arg.value);
            if(items===false || items.length<arg.value.length) {
                return false;
            }
            return [{type: 'list', items: items}];
        }
        f.kind = 'list';
        f.signatures = bits;
        return f;
    },
    listof: function(sig) {
        return jme.signature.list(jme.signature.multiple(sig));
    },
    dict: function(sig) {
        var f = function(args) {
            if(args.length==0) {
                return false;
            }
            if(!jme.isType(args[0],'dict')) {
                return false;
            }
            var items = {};
            var entries = Object.entries(args[0].value);
            for(var i=0;i<entries.length;i++) {
                var key = entries[i][0];
                var value = entries[i][1];
                var m = sig([value]);
                if(m===false) {
                    return false;
                }
                items[key] = m[0];
            }
            return [{type: 'dict', items: items}];
        }
        f.kind = 'dict';
        f.signature = sig;
        return f;
    },
    or: function() {
        var bits = Array.prototype.slice.apply(arguments);
        var f = function(args) {
            for(var i=0;i<bits.length;i++) {
                var m = bits[i](args);
                if(m!==false) {
                    return m;
                }
            }
            return false;
        }
        f.kind = 'or';
        f.signatures = bits;
        return f;
    }
};

/** A match returned by @ref{Numbas.jme.parse_signature}.
 *
 * @typedef Numbas.jme.signature_grammar_match
 * @type {Array}
 * @property 0 {Numbas.jme.signature}
 * @property 1 {string}
 */

/** Parse a signature definition. 
 *
 * Grammar: (there can be any amount of whitespace between tokens)
 *
 * ```
 * SIGNATURE = MULTIPLE | OPTIONAL | EITHER | SINGLE
 * MULTIPLE = "*" SINGLE
 * OPTIONAL = "[" SIGNATURE "]"
 * EITHER = SINGLE "or" SINGLE
 * SINGLE = BRACKETED | LISTOF | DICTOF | ANY | TYPE
 * BRACKETED = "(" SIGNATURE ")"
 * LISTOF = "list of" SIGNATURE
 * DICTOF = "dict of" SIGNATURE
 * ANY = "?"
 * TYPE = \w+
 * ```
 *
 * @param {string|Function} sig - Either a string consisting of an expression in the above grammar, a {@link Numbas.jme.token} constructor, or a {@link Numbas.jme.signature} function.
 * @returns {Numbas.jme.signature}
 */
var parse_signature = jme.parse_signature = function(sig) {

    /** Return the position of the first non-space character after `pos` in `str`.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {number}
     */
    function strip_space(str,pos) {
        var leading_space = str.slice(pos).match(/^\s*/);
        return pos + leading_space[0].length;
    }

    /** Create a function to exactly match a literal token.
     *
     * @param {string} token
     * @returns {Function}
     */
    function literal(token) {
        return function(str,pos) {
            var pos = strip_space(str,pos);
            if(str.slice(pos,token.length+pos)==token) {
                return [token,pos+token.length];
            }
        }
    }

    /** Parse a type description: multiple, optional, either or a single argument or bracketed expression.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function parse_expr(str,pos) {
        pos = strip_space(str,pos || 0);
        return multiple(str,pos) || optional(str,pos) || either(str,pos) || plain_expr(str,pos);
    }
    /** Parse a description of a single argument or bracketed expression: bracketed, list of, dict of, "?" or a type name.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function plain_expr(str,pos) {
        return bracketed(str,pos) || listof(str,pos) || dictof(str,pos) || any(str,pos) || type(str,pos);
    }
    /** Parse an "any number of this" description: "*" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function multiple(str,pos) {
        var star = literal("*")(str,pos);
        if(!star) {
            return;
        }
        pos = star[1];
        var expr = plain_expr(str,pos);
        if(!expr) {
            return;
        }
        return [jme.signature.multiple(expr[0]),expr[1]];
    }
    /** Parse an optional argument description: "[" EXPR "]".
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function optional(str,pos) {
        var open = literal("[")(str,pos);
        if(!open) {
            return;
        }
        pos = open[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return;
        }
        pos = expr[1];
        var end = literal("]")(str,pos);
        if(!end) {
            return;
        }
        return [jme.signature.optional(expr[0]),end[1]];
    }
    /** Parse a bracketed description: "(" EXPR ")".
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function bracketed(str,pos) {
        var open = literal("(")(str,pos);
        if(!open) {
            return;
        }
        pos = open[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return;
        }
        pos = expr[1];
        var end = literal(")")(str,pos);
        if(!pos || !end) {
            return;
        }
        return [expr[0],end[1]];
    }
    /** Parse a "list of" description: "list of" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function listof(str,pos) {
        var start = literal("list of")(str,pos);
        if(!start) {
            return;
        }
        pos = start[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return;
        }
        return [jme.signature.listof(expr[0]),expr[1]];
    }

    /** Parse a "dict" of description: "dict of" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function dictof(str,pos) {
        var start = literal("dict of")(str,pos);
        if(!start) {
            return;
        }
        pos = start[1];
        var expr = parse_expr(str,pos);
        if(!expr) {
            return;
        }
        return [jme.signature.dict(expr[0]),expr[1]];
    }

    /** Parse an "either" description: EXPR "or" EXPR.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function either(str,pos) {
        var expr1 = plain_expr(str,pos);
        if(!expr1) {
            return;
        }
        pos = expr1[1];
        var middle = literal("or")(str,pos);
        if(!middle) {
            return;
        }
        pos = middle[1];
        var expr2 = plain_expr(str,pos);
        if(!expr2) {
            return;
        }
        return [jme.signature.or(expr1[0],expr2[0]),expr2[1]];
    }

    /** Parse an "anything" argument: exactly the string "?".
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function any(str,pos) {
        pos = strip_space(str,pos);
        var m = literal("?")(str,pos);
        if(!m) {
            return;
        }
        return [jme.signature.anything(),m[1]];
    }

    /** Parse a data type name: any string of word characters.
     *
     * @param {string} str
     * @param {number} pos
     * @returns {Numbas.jme.signature_grammar_match}
     */
    function type(str,pos) {
        pos = strip_space(str,pos);
        var m = str.slice(pos).match(/^\w+/);
        if(!m) {
            return;
        }
        var name = m[0];
        return [jme.signature.type(name),pos+name.length];
    }


    if(typeof(sig)=='function') {
        if(sig.kind!==undefined) {
            return sig;
        }
        return jme.signature.type(sig.prototype.type);
    } else {
        var m = parse_expr(sig);
        if(!m) {
            throw(new Numbas.Error("jme.parse signature.invalid signature string",{str: sig}));
        }
        return m[0];
    }
}

var describe_signature = jme.describe_signature = function(sig) {
    switch(sig.kind) {
        case 'sequence':
            return sig.signatures.map(describe_signature).join(', ');
        case 'anything':
            return '?';
        case 'type':
            return sig.type;
        case 'multiple':
            return describe_signature(sig.signature)+'*';
        case 'optional':
            return '['+describe_signature(sig.signature)+']';
        case 'list':
            return 'list of ('+sig.signatures.map(describe_signature)+')';
        case 'dict':
            return 'dict of '+describe_signature(sig.signature);
        case 'or':
            return sig.signatures.map(describe_signature).join(' or ');
    }
}


});
