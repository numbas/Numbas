Numbas.queueScript('jme-rules',['base','math','jme-base','util'],function() {
/** @file Code to do with JME pattern-matching rules.
 *
 * Provides {@link Numbas.jme.rules}
 */
/** @namespace Numbas.jme.rules */
var math = Numbas.math;
var jme = Numbas.jme;
var util = Numbas.util;
jme.rules = {};

/** Options for {@link Numbas.jme.rules.matchTree}
 * @typedef Numbas.jme.rules.matchTree_options
 * @type {Object}
 * @property {Boolean} commutative - should the commutativity of operations be used? If `false`, terms must appear in the same order as in the pattern.
 * @property {Boolean} associative - should the associativity of operations be used? If `true`, all terms in nested applications of associative ops are gathered together before comparing.
 * @property {Boolean} allowOtherTerms - when matching an associative op, if the expression contains terms that don't match any of the pattern, should they be ignored? If `false`, every term in the expression must match a term in the pattern.
 * @property {Boolean} strictPlus - If `false`, `a-b` will be interpreted as `a+(-b)` when finding additive terms.
 * @property {Numbas.jme.Scope} scope - A JME scope in which to evaluate conditions.
 */

/** Parse a string specifying options for a Rule.
 * @param {String} str
 * @returns {Numbas.jme.rules.matchTree_options}
 * @see Numbas.jme.rules.Rule
 */
function parse_options(str) {
    return {
        commutative: str.match(/c/),
        associative: str.match(/a/),
        allowOtherTerms: str.match(/g/),
        strictPlus: str.match(/p/)
    };
}

/** Simplification rule
 * @memberof Numbas.jme.rules
 * @constructor
 *
 * @param {JME} pattern - expression pattern to match. Variables will match any sub-expression.
 * @param {JME} result - expression pattern to rewrite to.
 * @param {String|Numbas.jme.rules.matchTree_options} options
 * @param {String} [name] - a human-readable name for the rule
 *
 * @property {JME} patternString - the JME string defining the pattern to match
 * @property {JME} resultString - the JME string defining the result of the rule
 * @property {Numbas.jme.rules.matchTree_options} options - default options for the match algorithm
 * @property {JME} conditionStrings - JME strings defining the conditions
 * @property {Numbas.jme.tree} patternTree - `patternString` compiled to a syntax tree
 * @property {Numbas.jme.tree} result - `result` compiled to a syntax tree
 * @property {Numbas.jme.tree[]} conditions `conditions` compiled to syntax trees
 */
var Rule = jme.rules.Rule = function(pattern,result,options,name) {
    this.name = name;
    this.patternString = pattern;
    this.pattern = patternParser.compile(pattern);
    if(typeof(options)=='string') {
        options = parse_options(options);
    }
    this.options = options || {};
    this.resultString = result;
    this.result = jme.compile(result);
}
Rule.prototype = /** @lends Numbas.jme.rules.Rule.prototype */ {
    /** Extend this rule's default options with the given options
     * @param {Numbas.jme.rules.matchTree_options} options
     * @returns {Numbas.jme.rules.matchTree_options}
     */
    get_options: function(options) {
        if(!options) {
            return this.options;
        } else {
            return {
                commutative: options.commutative===undefined ? this.options.commutative : options.commutative,
                associative: options.associative===undefined ? this.options.associative : options.associative,
                allowOtherTerms: options.allowOtherTerms===undefined ? this.options.allowOtherTerms : options.allowOtherTerms,
                strictPlus: options.strictPlus===undefined ? this.options.strictPlus : options.strictPlus,
                scope: options.scope===undefined ? this.options.scope : options.scope
            };
            return Numbas.util.extend_object({},this.options,options);
        }
    },
    /** Match a rule on given syntax tree.
     * @memberof Numbas.jme.rules.Rule.prototype
     * @param {Numbas.jme.tree} exprTree - the syntax tree to test
     * @param {Numbas.jme.Scope} scope - used when checking conditions
     * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, or a dictionary of matched subtrees
     * @see Numbas.jme.rules.matchTree
     */
    match: function(exprTree,scope) {
        return matchTree(this.pattern,exprTree,this.get_options({scope:scope}));
    },

    /** Find all matches for the rule, anywhere within the given expression.
     * @param {Numbas.jme.tree} exprTree - the syntax tree to test
     * @param {Numbas.jme.Scope} scope - used when checking conditions
     * @returns {Array.<Numbas.jme.rules.jme_pattern_match>}
     * @see {Numbas.jme.rules.matchAllTree}
     */
    matchAll: function(exprTree,scope) {
        return matchAllTree(this.pattern,exprTree,this.get_options({scope:scope}));
    },

    /** Transform the given expression if it matches this rule's pattern.
     * @param {Numbas.jme.tree} exprTree - the syntax tree to transform
     * @param {Numbas.jme.rules.matchTree_options} options - used when checking conditions
     * @returns {Numbas.jme.rules.transform_result}
     * @see Numbas.jme.rules.transform
     */
    replace: function(exprTree,options) {
        return transform(this.pattern, this.result, exprTree, this.get_options(options));
    },

    /** Transform all occurences of this rule's pattern in the given expression.
     * @param {Numbas.jme.tree} exprTree - the syntax tree to transform
     * @param {Numbas.jme.rules.matchTree_options} options - used when checking conditions
     * @returns {Numbas.jme.rules.transform_result}
     * @see Numbas.jme.rules.transform
     */
    replaceAll: function(exprTree,options) {
        return transformAll(this.pattern, this.result, exprTree, this.get_options(options));
    }
}

/** Options for {@link Numbas.jme.rules.getTerms}
 * @typedef Numbas.jme.rules.getTerms_options
 * @type Object
 * @property {Boolean} associative - should the operator be considered as associative? If yes, `(a+b)+c` will produce three terms `a`,`b` and `c`. If no, it will produce two terms, `(a+b)` and `c`.
 * @property {Boolean} strictPlus - if `false`, `a-b` will be interpreted as `a+(-b)` when finding additive terms.
 */

/** Information to do with a term found in an expression by {@link Numbas.jme.rules.getTerms}.
 * @typedef Numbas.jme.rules.term
 * @type {Object}
 * @property {Numbas.jme.tree} term
 * @property {Array.<String>} names - names captured by this term
 * @property {Array.<String>} equalnames - identified names captured by this term
 * @property {String} quantifier - code describing how many times the term can appear, if it's a pattern term
 * @property {Number} min - the minimum number of times the term must appear
 * @property {Number} max - the maximum number of times the term can appear
 * @property {Numbas.jme.tree} defaultValue - a value to use if this term is missing
 */

/** Given a tree representing a series of terms t1 <op> t2 <op> t3 <op> ..., return the terms as a list.
 * @memberof Numbas.jme.rules
 * @param {Numbas.jme.tree} tree - tree to find terms in
 * @param {String} op - the name of the operator whose terms are to be found.
 * @param {Numbas.jme.rules.getTerms_options} options
 * @param {String[]} [existing_names] - a list of match names set for this tree by a parent, used when called recursively.
 * @param {Boolean} calculate_minimum - Should the minimum allowed number of occurrences of each term be calculated? This is a pre-process step when getting the terms in a pattern expression.
 * @returns {Array.<Numbas.jme.rules.term>}
 */
var getTerms = Numbas.jme.rules.getTerms = function(tree,op,options,existing_names,calculate_minimum) {
    /** Add the list of existing names passed in at the start to each term
     * @param {Array.<Numbas.jme.rules.term>} items
     * @returns {Array.<Numbas.jme.rules.term>}
     */
    function add_existing_names(items) {
        return existing_names.length==0 ? items : items.map(function(item) {
            return {
                term: item.term, 
                names: existing_names.concat(item.names),
                equalnames: item.equalnames, 
                quantifier: item.quantifier, 
                min: item.min, 
                max: item.max,
                defaultValue: item.defaultValue,
            };
        });
    }

    var intree = tree;
    if(intree.terms === undefined) {
        intree.terms = {};
    }
    if(intree.terms[op] === undefined) {
        intree.terms[op] = {};
    }
    var option_signature = options.associative*2 + (options.strictPlus);

    if(intree.terms[op][option_signature]) {
        return add_existing_names(intree.terms[op][option_signature]);
    }


    /** Insert a unary minus in this tree.
     * If it's a product, the minus applies to the leftmost factor.
     * @param {Numbas.jme.tree} tree
     * @returns {Numbas.jme.tree}
     */
    function insertUnaryMinus(tree) {
        if(jme.isOp(tree.tok,'*')) {
            return {tok: tree.tok, args: [insertUnaryMinus(tree.args[0]),tree.args[1]]};
        } else {
            return {tok: new jme.types.TOp('-u',false,true,1,false,false), args: [tree]};
        }
    }

    if(jme.isOp(tree.tok,'-u') && op=='*') {
        tree = insertUnaryMinus(tree.args[0]);
    }

    if(!options.strictPlus && op=='+' && jme.isOp(tree.tok,'-')) {
        tree = {tok: new jme.types.TOp('+',false,false,2,true,true), args: [tree.args[0],insertUnaryMinus(tree.args[1])]};
    }
    var args = jme.isOp(tree.tok,op) ? tree.args : [tree];
    var terms = [];

    for(var i=0; i<args.length;i++) {
        var arg = args[i];
        var oarg = arg;
        var names = [];
        var equalnames = [];
        var quantifier = '1';
        var defaultValue = null;
        if(jme.isName(arg,'m_nothing')) {
            quantifier = '0';
        }
        var quantifier_combo = {
            '0': {'`?': '0', '`*': '0', '`+': '0', '`:': '0'},
            '1': {'`?': '`?', '`*': '`*', '`+': '`+', '`:': '`?'},
            '`?': {'`?': '`?', '`*': '`*', '`+': '`*', '`:': '`?'},
            '`*': {'`?': '`*', '`*': '`*', '`+': '`*', '`:': '`*'},
            '`+': {'`?': '`*', '`*': '`*', '`+': '`+', '`:': '`*'}
        };
        while(arg.tok.type=='op') {
            var argop = arg.tok.name;
            if(argop==';') {
                names.push(arg.args[1]);
            } else if(argop==';=') {
                names.push(arg.args[1]);
                equalnames.push(arg.args[1]);
            } else if(argop=='`?' || argop=='`*' || argop=='`+') {
                quantifier = quantifier_combo[quantifier][arg.tok.name];
            } else if(argop=='`:') {
                quantifier = quantifier_combo[quantifier][arg.tok.name];
                if(defaultValue===null) {
                    defaultValue = arg.args[1];
                }
            } else {
                break;
            }
            arg = arg.args[0];
        }
        /** Find "identified names" - captured subexpressions which must be equal every time the name is captured - inside this tree.
         * These are the right-hand arguments of the `;=` operator.
         * Names found are appended to the list `equalnames`.
         * @param {Numbas.jme.tree} tree
         */
        function find_equal_names(tree) {
            if(jme.isOp(tree.tok,';=')) {
                equalnames.push(tree.args[1]);
            }
            if(tree.args) {
                tree.args.forEach(find_equal_names);
            }
        }
        find_equal_names(arg);
        var item = {
            term: arg,
            names: names,
            equalnames: equalnames,
            quantifier: quantifier,
            min: quantifier_limits[quantifier][0],
            max: quantifier_limits[quantifier][1],
            defaultValue: defaultValue,
            occurrences: 0
        };
        if(options.associative && (jme.isOp(arg.tok,op) || (!options.strictPlus && op=='+' && jme.isOp(arg.tok,'-')))) {
            var sub = getTerms(arg,op,options,existing_names.length==0 ? names : existing_names.concat(names),false);
            if(quantifier!='1') {
                sub = sub.map(function(t){ t.quantifier = quantifier_combo[t.quantifier][quantifier]; });
            }
            terms = terms.concat(sub);
        } else {
            terms.push(item);
        }
    }

    if(calculate_minimum) {
        terms.min_total = 0;
        terms.forEach(function(t) {
            terms.min_total += t.min;
        });
    }

    intree.terms[op][option_signature] = terms;
    return add_existing_names(terms);
}

/** The `_match` name in a match object stores the whole tree that matched the pattern.
 * This function makes sure that `_match` is set, setting it to the given tree if it's missing.
 * @param {Numbas.jme.rules.jme_pattern_match} m
 * @param {Numbas.jme.tree} exprTree
 * @returns {Numbas.jme.rules.jme_pattern_match}
 */
function preserve_match(m,exprTree) {
    if(m===false) {
        return false;
    }
    if(m._match===undefined) {
        m._match = exprTree;
    }
    return m;
}

/** A dictionary representing the results of a successful JME pattern match.
 * Maps variable names to trees.
 * @typedef Numbas.jme.rules.jme_pattern_match
 * @type Object.<Numbas.jme.tree>
 * @see {Numbas.jme.rules#matchTree}
 */

/** Recursively check whether `exprTree` matches `ruleTree`. Variables in `ruleTree` match any subtree.
 * @method
 * @memberof Numbas.jme.rules
 *
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options - options specifying the behaviour of the matching algorithm
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchTree = jme.rules.matchTree = function(ruleTree,exprTree,options) {
    var m = (function() {
        if(!exprTree)
            return false;
        var ruleTok = ruleTree.tok;
        var exprTok = exprTree.tok;
        if(jme.isOp(ruleTok,';') || jme.isOp(ruleTok,';=')) {
            var m = matchTree(ruleTree.args[0],exprTree,options);
            if(!m) {
                return false;
            }
            var o = resolveName(ruleTree.args[1],m._match);
            m[o.name] = o.value;
            return m;
        }

        switch(ruleTok.type) {
            case 'name':
                return matchName(ruleTree,exprTree,options);
            case 'function':
                return matchFunction(ruleTree,exprTree,options);
            case 'op':
                return matchOp(ruleTree,exprTree,options);
            case 'list':
                return matchList(ruleTree,exprTree,options);
            default:
                if(ruleTok.type!=exprTok.type) {
                    return false;
                }
                return util.eq(ruleTok,exprTok) ? {} : false;
        }
    })();
    return preserve_match(m,exprTree);
}

/** Conditions for the `m_number` rule
 * @enum {Function}
 * @memberof Numbas.jme.rules
 */
var number_conditions = jme.rules.number_conditions = {
    'complex': function(tok) {
        return tok.value.complex;
    },
    'imaginary': function(tok) {
        return tok.value.complex && Numbas.math.re(tok.value)==0;
    },
    'real': function(tok) {
        return Numbas.math.im(tok.value)==0;
    },
    'positive': function(tok) {
        return Numbas.math.positive(tok.value);
    },
    'nonnegative': function(tok) {
        return Numbas.math.nonnegative(tok.value);
    },
    'negative': function(tok) {
        return Numbas.math.negative(tok.value);
    },
    'integer': function(tok) {
        return Numbas.util.isInt(tok.value);
    }
}

/** Match a name token. `?` and `??` match any name, `m_number` matches a number, with constraints specified by annotations, `m_nothing` never matches.
 * Otherwise, the name matches if the expression being considered is exactly the same name, ignoring case.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match. The top token is assumed to be a name.
 * @param {Numbas.jme.tree} exprTree - the expression being considered.
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 * @see Numbas.jme.rules.number_conditions
 */
function matchName(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(ruleTok.type!='name') {
        return false;
    }
    switch(ruleTok.name) {
        case '?':
        case '??':
            return {};
        case 'm_number':
            if(exprTok.type!='number') {
                return false;
            }
            if(ruleTok.annotation!==undefined) {
                var satisfies = ruleTok.annotation.every(function(condition) {
                    var test = number_conditions[condition];
                    return !test || test(exprTok);
                });
                if(!satisfies) {
                    return false;
                }
            }
            return {};
        case 'm_name':
            if(exprTok.type!='name') {
                return false;
            }
            return {};
        case 'm_nothing':
            return false;
        default:
            if(exprTok.type!='name') {
                return false;
            }
            var same = ruleTok.name.toLowerCase()==exprTok.name.toLowerCase();
            return same ? {} : false;
    }
}

/** Match the application of a function.
 * Dispatches to one of the special pattern-matching functions, or {@link matchOrdinaryFunction} otherwise.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match.
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 */
function matchFunction(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(ruleTok.type!='function') {
        return false;
    }
    switch(ruleTok.name) {
        case 'm_uses':
            var names = ruleTree.args.map(function(t){ return t.tok.name; });
            return matchUses(names,exprTree);
        case 'm_exactly':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object({},options,{allowOtherTerms:false}));
        case 'm_commutative':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object({},options,{commutative:true}));
        case 'm_noncommutative':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object({},options,{commutative:false}));
        case 'm_associative':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object({},options,{associative:true}));
        case 'm_nonassociative':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object({},options,{associative:false}));
        case 'm_strictplus':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object({},options,{strictPlus:true}));
        case 'm_type':
            var wantedType = ruleTree.args[0].tok.name || ruleTree.args[0].tok.value;
            return matchType(wantedType,exprTree);
        case 'm_func':
            return matchGenericFunction(ruleTree,exprTree,options);
        case 'm_op':
            return matchGenericOp(ruleTree,exprTree,options);
        default:
            return matchOrdinaryFunction(ruleTree,exprTree,options);
    }
}

/** Match the application of any function. The first argument of `ruleTree` is a pattern that the function's name, considered as a string, must satisfy, and the second argument is a pattern that the function's arguments, considered as a list, must satisfy.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match.
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 */
function matchGenericFunction(ruleTree,exprTree,options) {
    if(exprTree.tok.type!='function') {
        return false;
    }
    var nameRule = ruleTree.args[0];
    var argsRule = ruleTree.args[1];
    var exprNameTree = {tok: new jme.types.TString(exprTree.tok.name)};
    var argsTree = {tok: new jme.types.TList(), args: exprTree.args};
    var m_name = matchTree(nameRule, exprNameTree, options);
    var m_args = matchTree(argsRule, argsTree, options);
    if(m_name && m_args) {
        return mergeMatches([m_name,m_args]);
    } else {
        return false;
    }
}

/** Match the application of any operator. The first argument of `ruleTree` is a pattern that the operator's name, considered as a string, must satisfy, and the second argument is a pattern that the operator's arguments, considered as a list, must satisfy.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match.
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 */
function matchGenericOp(ruleTree,exprTree,options) {
    if(exprTree.tok.type!='op') {
        return false;
    }
    var nameRule = ruleTree.args[0];
    var argsRule = ruleTree.args[1];
    var exprNameTree = {tok: new jme.types.TString(exprTree.tok.name)};
    var argsTree = {tok: new jme.types.TList(), args: exprTree.args};
    var m_name = matchTree(nameRule, exprNameTree, options);
    var m_args = matchTree(argsRule, argsTree, options);
    if(m_name && m_args) {
        return mergeMatches([m_name,m_args]);
    } else {
        return false;
    }
}

/** Match an application of an operator.
 * Dispatches to one of the special pattern-matching operators, or {@link matchOrdinaryOp} otherwise.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match. It's assumed that the topmost token is an operator.
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 */
function matchOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(ruleTok.type!='op') {
        return false;
    }
    switch(ruleTok.name) {
        case '`?':
        case '`*':
        case '`+':
            return matchTree(ruleTree.args[0],exprTree,options);
        case '`|':
            return matchAny(ruleTree.args,exprTree,options);
        case '`:':
            return matchDefault(ruleTree.args[0],ruleTree.args[1],exprTree,options);
        case '`+-u':
            return matchPrefixPlusMinus(ruleTree.args[0],exprTree,options);
        case '`!':
            return matchNot(ruleTree.args[0],exprTree,options);
        case '`&':
            return matchAnd(ruleTree.args,exprTree,options);
        case '`where':
            return matchWhere(ruleTree.args[0],ruleTree.args[1],exprTree,options);
        default:
            return matchOrdinaryOp(ruleTree,exprTree,options);
    }
    return false;
}

/** Match a `where` condition - the expression must match the given pattern, and the condition specified in terms of the matched names must evaluate to `true`.
 * @param {Numbas.jme.tree} pattern - the pattern to match
 * @param {Numbas.jme.tree} condition - the condition to evaluate
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 */
function matchWhere(pattern,condition,exprTree,options) {
    var scope = new Numbas.jme.Scope(options.scope);

    var m = matchTree(pattern,exprTree,options);
    if(!m) {
        return false;
    }

    condition = Numbas.util.copyobj(condition,true);
    condition = jme.substituteTree(condition,new jme.Scope([{variables:m}]));
    try {
        var result = scope.evaluate(condition,null,true);
        if(result.type=='boolean' && result.value==false) {
            return false;
        }
    } catch(e) {
        return false;
    }
    return m;
}

/** Match the application of a function.
 * Matches if the expression is the application of the same function, and all of the arguments match the arguments of the pattern.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 */
function matchOrdinaryFunction(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(exprTok.type!='function' || (ruleTok.name!='?' && ruleTok.name!=exprTok.name)) {
        return false;
    }
    return matchNonAssociativeOp(ruleTree,exprTree,options);
}

/** Match the given expression against the given pattern, which is assumed to be a list.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.jme_pattern_match}
 */
function matchList(ruleTree,exprTree,options) {
    if(exprTree.tok.type!='list') {
        return false;
    }
    /** Get the elements of a list. If it's been evaluated, the elements will be stored as the token's value. Otherwise, they're the arguments of the tree.
     * @param {Numbas.jme.tree} list
     * @returns {Array.<Numbas.jme.tree>}
     */
    function getElements(list) {
        if(list.args) {
            return list.args;
        } else {
            return list.tok.value.map(function(e) { return {tok: e}; });
        }
    }
    var ruleElements = getElements(ruleTree);
    var exprElements = getElements(exprTree);
    // TODO - pay attention to quantifiers to allow for different lengths of list
    if(ruleElements.length!=exprElements.length) {
        return false;
    }
    var matches = [];
    for(var i=0;i<ruleElements.length;i++) {
        var m = matchTree(ruleElements[i],exprElements[i],options);
        if(!m) {
            return false;
        }
        matches.push(m);
    }
    return mergeMatches(matches);
}

/** How many times must a quantifier match? First element is minimum number of occurrences, second element is maximum.
 */
var quantifier_limits = {
    '0': [0,0],
    '1': [1,1],
    '`?': [0,1],
    '`*': [0,Infinity],
    '`+': [1,Infinity]
};

/** Resolve the name and value to store when capturing a subexpression.
 * @param {Numbas.jme.tree} nameTree - right-hand side of the `;` capturing operator. Either a name, or a keypair giving a name and the value to store.
 * @param {Numbas.jme.tree} value - the value to store, if `nameTree` doesn't override it.
 * @returns {Object} - `name` is the name to store under, and `value` is the value
 */
function resolveName(nameTree,value) {
    var nameTok = nameTree.tok;
    if(!(nameTok.type=='name' || nameTok.type=='keypair')) {
        throw(new Numbas.Error('jme.matchTree.group name not a name'));
    }
    var name;
    if(nameTok.type=='name') {
        name = nameTok.name;
    } else if(nameTok.type=='keypair') {
        name = nameTok.key;
        value = nameTree.args[0];
    }
    return {name: name, value: value};
}

/** Match an expression against a pattern which is an application of an operator to one or more terms.
 * Assuming that the pattern and the expression trees are each a sequence of terms joined by the same operator, find the terms of each, and try to match them up, obeying quantifiers in the pattern.
 * @param {Numbas.jme.tree} ruleTree - the pattern to match, whose top token must be an operator.
 * @param {Numbas.jme.tree} exprTree - the expression being considered
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Numbas.jme.jme_pattern_match}
 */
function matchOrdinaryOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    var op = ruleTok.name;
    var commuting = options.commutative && ruleTok.commutative;
    var associating = options.associative && ruleTok.associative;
    var term_options = {associative: associating, strictPlus: options.strictPlus};
    var ruleTerms = getTerms(ruleTree,op,term_options,[],true);
    var exprTerms = getTerms(exprTree,op,term_options,[],false);
    if(exprTerms.length<ruleTerms.min_total) {
        return false;
    }

    if(!associating) {
        if(!jme.isOp(exprTok,op) && ruleTerms.length==1) {
            return false;
        }
    }
    var matches = {};
    exprTerms.forEach(function(_,i){ matches[i] = {} });

    /** Does the given input term match the given rule term?
     * The indices of the input and rule terms are given so the result of the match can be cached
     * @param {Numbas.jme.rules.term} exprTerm - the input term
     * @param {Numbas.jme.rules.term} ruleTerm - the term in the pattern which must be matched
     * @param {Number} ic - the index of the input term 
     * @param {Number} pc - the index of the rule term
     * @returns {Boolean}
     */
    function term_ok(exprTerm,ruleTerm,ic,pc) {
        if(matches[ic][pc]===undefined) {
            var m = matchTree(ruleTerm.term,exprTerm.term,options);
            var equalnames = {};
            ruleTerm.equalnames.forEach(function(nameTree) {
                var name = nameTree.tok.name;
                var t = m[name] || resolveName(nameTree,exprTerm.term).value;
                equalnames[name] = t;
            });
            matches[ic][pc] = {
                match: m,
                equalnames: equalnames
            }
        }
        return matches[ic][pc].match!==false; 
    }

    /** Does the given assignment satisfy the constraints of the matching algorithm?
     * At the moment, the only constraint is that all subexpressions matched with the same name using the `;=` operator must be equal, according to {@link Numbas.jme.compareTrees}.
     * @param {Object} assignment - the result of {@link Numbas.jme.rules.match_sequence}
     * @param {Number} ic - the current index in the list of input terms. Only matches introduced by this term are considered - previous terms are assumed to have already passed the constraint check.
     * @param {Number} pc - the current index in the list of pattern terms
     * @returns {Boolean}
     */
    function constraint_ok(assignment,ic,pc) {
        var m = matches[ic][pc];
        var equalnames = ruleTerms[pc].equalnames;
        if(!equalnames.length) {
            return true;
        }
        var ok = assignment.every(function(p,i) {
            if(p<0 || p==pc || p>=ruleTerms.length) {
                return true;
            }
            var m2 = matches[i][p];
            return equalnames.every(function(nameTree) {
                var name = nameTree.tok.name;
                if(m2.equalnames[name]===undefined) {
                    return true;
                }
                return jme.compareTrees(m.equalnames[name], m2.equalnames[name]) == 0;
            });
        });
        return ok;
    }

    var assignment = match_sequence(ruleTerms,exprTerms,{checkFn: term_ok, constraintFn: constraint_ok, commutative: commuting, allowOtherTerms: options.allowOtherTerms});
    if(assignment===false) {
        return false;
    }

    var namedTerms = {};

    var identified_names = {};
    ruleTerms.forEach(function(ruleTerm) {
        ruleTerm.equalnames.forEach(function(nameTree) {
            var name = nameTree.tok.name;
            identified_names[name] = (identified_names[name] || 0) + 1;
        });
    });
    /** Record that `term` was captured with the given name.
     * @param {String} name
     * @param {Numbas.jme.tree} term
     * @param {Boolean} allowReservedName - if `false`, reserved names such as `_match` and `_rest`, which are introduced by the matching algorithm, will be ignored.
     */
    function nameTerm(name,term,allowReservedName) {
        if(!allowReservedName && name.match(/^_/)) {
            return;
        }
        if(!namedTerms[name]) {
            namedTerms[name] = [];
        }
        if(identified_names[name]>1 && namedTerms[name].length) {
            return;
        }
        namedTerms[name].push(term);
    }
    /** Record that `exprTree` was matched against `ruleTerm` - add `exprTree` to all of `ruleTerm`'s names.
     * @param {Numbas.jme.rules.term} ruleTerm
     * @param {Numbas.jme.tree} exprTree
     */
    function matchTerm(ruleTerm,exprTree){ 
        ruleTerm.names.forEach(function(name) {
            var o = resolveName(name,exprTree);
            nameTerm(o.name,o.value);
        });
    }

    assignment.result.forEach(function(is,j) {
        var ruleTerm = ruleTerms[j];

        if(is.length) {
            is.forEach(function(i) {
                var match = matches[i][j].match;
                for(var name in match) {
                    nameTerm(name,match[name]);
                }
                matchTerm(ruleTerm,exprTerms[i].term);
            });
        } else if(ruleTerm.defaultValue) {
            matchTerm(ruleTerm,ruleTerm.defaultValue);
        }
    });
    assignment.ignored_start_terms.forEach(function(i) {
        nameTerm('_rest',exprTerms[i].term,true);
        nameTerm('_rest_start',exprTerms[i].term,true);
    });
    assignment.ignored_end_terms.forEach(function(i) {
        nameTerm('_rest',exprTerms[i].term,true);
        nameTerm('_rest_end',exprTerms[i].term,true);
    });

    // collate the named groups
    var match = {};
    for(var name in namedTerms) {
        var terms = namedTerms[name];
        var sub = terms[0];
        for(var i=1;i<terms.length;i++) {
            sub = {tok: new jme.types.TOp(op), args: [sub,terms[i]]};
        }
        match[name] = sub;
    }
    match['__op__'] = op;
    return match;
}

/** Options for {@link Numbas.jme.rules.match_sequence}.
 * @type Object
 * @typedef Numbas.jme.rules.match_sequence_options
 * @property {Boolean} allowOtherTerms - if `true`, terms that don't match any term in the pattern can be ignored
 * @property {Boolean} commutative - can the input terms be considered in any order?
 * @property {Function} constraintFn - function to test if the current set of matches satisfies constraints
 * @property {Function} checkFn - function to test if an input term matches a given pattern term
 */

/** Match a sequence of terms against a given pattern sequence of terms.
 * Try to find an assignment of input terms to the pattern, satisfying the quantifier for each term in the pattern.
 * The match is greedy - input terms will match earlier pattern terms in preference to later ones.
 *
 * @method
 * @memberof Numbas.jme.rules
 *
 * @param {Array.<Numbas.jme.rules.term>} pattern
 * @param {Array.<Numbas.jme.tree>} input
 * @param {Numbas.jme.rules.match_sequence_options} options
 * @returns {Object} - `ignored_start_terms` is terms at the start that weren't used in the match, `ignored_end_terms` is any other terms that weren't used, and `result[i]` is a list of indices of terms in the input that were matched against pattern term `i`.
 */
var match_sequence = jme.rules.match_sequence = function(pattern,input,options) {
    var capture = [];
    var start = 0;
    var done = false;
    var failed = false;
    var pc = 0;
    var ic = 0;

    /** Count the number of times we have matched pattern term `p` so far.
     * @param {Number} p - index of the term
     * @returns {Number}
     */
    function count(p) {
        return capture.filter(function(x){return x==p}).length;
    }
    /** Have we consumed pattern term `p` as many times as allowed?
     * @param {Number} p
     * @returns {Boolean}
     */
    function consumed(p) {
        return count(p)>=pattern[p].max;
    }
    /** Have we matched this pattern term at least its minimum number of times?
     * @param {Number} p - the index of the pattern term
     * @returns {Boolean}
     */
    function enough(p) {
        return count(p)>=pattern[p].min;
    }
    /** Move the start pointer along one.
     * Terms before the start will be returned in `ignored_start_terms`
     */
    function increment_start() {
        //debug('increment start position');
        start += 1;
        ic = start;
        pc = 0;
    }
    /** Backtrack to the last time we made a free choice.
     * If we're already at the start and `allowOtherTerms` is enabled, advance the start pointer.
     */
    function backtrack() {
        //debug('backtrack');
        if(options.allowOtherTerms && ic==start && capture.length==start && start<input.length-1) {
            capture.push(-1);
            increment_start();
            return;
        } 
        
        ic -= 1;
        while(ic>=start && (ic>=capture.length || capture[ic]>=pattern.length)) {
            ic -= 1;
        }
        //debug('backtracked to '+ic);

        if(ic<start) {
            if(start<input.length-1) {
                capture = [];
                increment_start();
                return;
            } else {
                failed = true;
                return;
            }
        }
        pc = capture[ic]+1;
        capture = capture.slice(0,ic);
    }
    /** Move the input pointer along one.
     * If using commutativity, set the pattern pointer back to the start.
     */
    function advance_input() {
        ic += 1;
        if(options.commutative) {
            pc = start;
        }
    }
    var steps = 0;
    while(!done && !failed) {
        //show();
        steps += 1;
        while(pc<pattern.length && consumed(pc)) { // if have consumed this term fully, move on
            //debug('term '+pc+' consumed, move on');
            pc += 1;
        }
        if(ic==input.length) { // if we've reached the end of the input
            while(pc<pattern.length && enough(pc)) {
                //debug('got enough of '+pc+', skip forward');
                pc += 1;
            }
            if(pc==pattern.length) { // if we've consumed all the terms
                if(!pattern.every(function(_,p) { return enough(p); })) {
                    //debug('reached end but some terms not matched enough times');
                    backtrack();
                } else {
                    //debug('reached end of pattern and end of input: done');
                    done = true;
                }
            } else {
                //debug('end of input but still pattern to match')
                backtrack();
            }
        } else if(pc>=pattern.length) {
            //debug("end of pattern but unconsumed input");
            if(pc==pattern.length && options.commutative && options.allowOtherTerms) {
                //debug('capturing '+ic+' as ignored end term');
                capture.push(pattern.length);
                advance_input();
            } else if(pc==pattern.length && !options.commutative && options.allowOtherTerms) {
                while(ic<input.length) {
                    //debug('capturing '+ic+' as ignored end term');
                    capture.push(pattern.length);
                    advance_input();
                }
            } else {
                backtrack();
            }
        } else if(options.checkFn(input[ic],pattern[pc],ic,pc) && options.constraintFn(capture,ic,pc)) {
            //debug('capture '+ic+' at '+pc);
            capture.push(pc);
            advance_input();
        } else if(options.commutative || enough(pc)) {
            //debug('trying the next pattern term');
            pc += 1;
        } else {
            //debug('can\'t match next input')
            backtrack();
        }
    }
    if(failed) {
        return false;
    }
    var result = pattern.map(function(p,i) {
        return capture.map(function(_,j){return j}).filter(function(j){ return capture[j] == i;}).map(function(j){ return j+start});
    });
    var ignored_start_terms = input.slice(0,start).map(function(_,j){return j});
    var ignored_end_terms = capture.map(function(_,j){return j}).filter(function(j){return capture[j]==pattern.length});
    //debug(result);
    return {ignored_start_terms: ignored_start_terms, result: result, ignored_end_terms: ignored_end_terms};
}

/** Match any of the given patterns.
 * The first pattern which successfully matches is used.
 * @param {Array.<Numbas.jme.tree>} patterns
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchAny(patterns,exprTree,options) {
    for(var i=0;i<patterns.length;i++) {
        var m = matchTree(patterns[i],exprTree,options);
        if(m) {
            return m;
        }
    }
    return false;
}

/** Perform a match with a default value.
 * This operation only makes sense when matching a sequence of terms, so just match the pattern.
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} defaultValue - ignored
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchDefault(ruleTree, defaultValue, exprTree, options) {
    var m = matchTree(ruleTree,exprTree,options);
    return m;
}

/** Bring any unary minus to the top of the tree.
 * @param {Numbas.jme.tree} tree
 * @returns {Numbas.jme.tree}
 */
function extractLeadingMinus(tree) {
    if(jme.isOp(tree.tok,'*') || jme.isOp(tree.tok,'/')) {
        if(jme.isOp(tree.args[0].tok,'-u')) {
            return {tok:tree.args[0].tok, args: [{tok:tree.tok, args: [tree.args[0].args[0],tree.args[1]]}]};
        } else {
            var left = extractLeadingMinus(tree.args[0]);
            if(jme.isOp(left.tok,'-u')) {
                return {tok: left.tok, args: [{tok: tree.tok, args: [left, tree.args[1]]}]};
            } else {
                return tree;
            }
        }
    } else {
        return tree;
    }
}

/** Match `rule`, or `-(rule)`.
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchPrefixPlusMinus(ruleTree,exprTree,options) {
    var originalExpr = exprTree;
    exprTree = extractLeadingMinus(exprTree);
    if(jme.isOp(exprTree.tok,'-u')) {
        exprTree = exprTree.args[0];
    }
    var m = matchTree(ruleTree,exprTree,options);
    if(m) {
        m._match = originalExpr;
        return m;
    } else {
        return false;
    }
}

/** Match if the expression doesn't match the given pattern
 * @param {Numbas.jme.tree} ruleTree - the pattern which must not be matched
 * @param {Numbas.jme.tree} exprTree - the expression to teset
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchNot(ruleTree,exprTree,options) {
    if(!matchTree(ruleTree,exprTree,options)) {
        return preserve_match({},exprTree);
    } else {
        return false;
    }
}

/** Match if the expression uses all of the given names as free variables.
 * @param {Array.<String>} names
 * @param {Numbas.jme.tree} exprTree
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchUses(names,exprTree) {
    var vars = jme.findvars(exprTree);
    for(var i=0;i<names.length;i++) {
        if(!vars.contains(names[i])) {
            return false;
        }
    }
    return {};
}

/** Match if the top token of the given expression is of the given type.
 * @param {String} wantedType - the required type
 * @param {Numbas.jme.tree} exprTree
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchType(wantedType,exprTree) {
    if(exprTree.tok.type==wantedType) {
        return {};
    } else {
        return false;
    }
}

/** Match all of the given patterns against the given expression. 
 * Return `false` if any of the patterns don't match.
 * @param {Array.<Numbas.jme.tree>} patterns
 * @param {Numbas.jme.tree} exprTree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match}
 */
function matchAnd(patterns,exprTree,options) {
    var matches = [];
    for(var i=0;i<patterns.length;i++) {
        var m = matchTree(patterns[i],exprTree,options);
        if(m) {
            matches.push(m);
        } else {
            return false;
        }
    }
    return mergeMatches(matches);
}

/** Find all matches for the rule, anywhere within the given expression.
 * @memberof Numbas.jme.rules
 * @method
 * @param {Numbas.jme.tree} ruleTree - the pattern to match
 * @param {Numbas.jme.tree} exprTree - the syntax tree to test
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Array.<Numbas.jme.rules.jme_pattern_match>}
 */
var matchAllTree = jme.rules.matchAllTree = function(ruleTree,exprTree,options) {
    var matches = [];
    var m = matchTree(ruleTree,exprTree,options);
    if(m) {
        matches = [m];
    }
    if(exprTree.args) {
        exprTree.args.forEach(function(arg) {
            var submatches = matchAllTree(ruleTree,arg,options);
            matches = matches.concat(submatches);
        });
    }
    return matches;
}

/** Merge a list of matches into one match object.
 * Later matches override earlier ones: if two matches have the same captured name, the later one is used.
 * @param {Array.<Numbas.jme.rules.jme_pattern_match>} matches
 * @returns {Numbas.jme.rules.jme_pattern_match}
 */
function mergeMatches(matches) {
    var ms = matches.slice();
    ms.splice(0,0,{});
    return util.extend_object.apply(this,ms);
}

/** Apply operations specified in the result of a tree transformation: `eval(x)` is replaced with the result of evaluating `x`.
 * @memberof Numbas.jme.rules
 * @method
 * @param {Numbas.jme.tree} tree
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Numbas.jme.tree}
 */
var applyPostReplacement = jme.rules.applyPostReplacement = function(tree,options) {
    var tok = tree.tok;
    if(jme.isFunction(tok,'eval')) {
        return {tok: jme.evaluate(tree.args[0],options.scope)};
    }
    if(tree.args) {
        var args = tree.args.map(function(arg) {
            return applyPostReplacement(arg,options);
        });
        return {tok:tok, args: args};
    }
    return tree;
}

/** Object returned by {@link Numbas.jme.rules.transform}
 * @type Object
 * @typedef Numbas.jme.rules.transform_result
 * @property {Boolean} changed - Is the result expression different to the input expression?
 * @property {Numbas.jme.tree} expression - the result expression
 */

/** Replace one expression with another, if it matches the given rule
 * @memberof Numbas.jme.rules
 * @method
 * @param {Numbas.jme.tree} ruleTree - the rule to test against
 * @param {Numbas.jme.tree} resultTree - the tree to output, with named groups from the rule substituted in.
 * @param {Numbas.jme.tree} exprTree - the expression to be tested
 * @param {Numbas.jme.rules.matchTree_options} options - options for the match
 * @returns {Numbas.jme.rules.transform_result}
 */
var transform = jme.rules.transform = function(ruleTree,resultTree,exprTree,options) {
    var match = matchTree(ruleTree,exprTree,options);
    if(!match) {
        return {expression: exprTree, changed: false};
    }

    var out = jme.substituteTree(resultTree,new jme.Scope([{variables: match}]), true);
    out = applyPostReplacement(out,options);
    var ruleTok = ruleTree.tok;
    if(match._rest_start) {
        out = {tok: new jme.types.TOp(match.__op__), args: [match._rest_start, out]};
    }
    if(match._rest_end) {
        out = {tok: new jme.types.TOp(match.__op__), args: [out, match._rest_end]};
    }
    return {expression: out, changed: !jme.treesSame(exprTree,out)};
}

/** Replace anything matching the rule with the given result, at any position in the given expression
 * @memberof Numbas.jme.rules
 * @method
 * @param {Numbas.jme.tree} ruleTree - the rule to test against
 * @param {Numbas.jme.tree} resultTree - the tree to output, with named groups from the rule substituted in.
 * @param {Numbas.jme.tree} exprTree - the expression to be tested
 * @param {Numbas.jme.rules.matchTree_options} options - options for the match
 * @returns {Numbas.jme.rules.transform_result}
 */
var transformAll = jme.rules.transformAll = function(ruleTree,resultTree,exprTree,options) {
    var changed = false;
    if(exprTree.args) {
        var args = exprTree.args.map(function(arg){ 
            var o = transformAll(ruleTree,resultTree,arg,options);
            changed = changed || o.changed;
            return  o.expression;
        });
        exprTree = {tok: exprTree.tok, args: args};
    }

    var o = transform(ruleTree,resultTree,exprTree,options);
    changed = changed || o.changed;
    return {expression: o.expression, changed: changed};
}

/** A parser for JME patterns. Adds pattern-matching operators to the standard parser.
 * @memberof Numbas.jme.rules
 */
var patternParser = jme.rules.patternParser = new jme.Parser();
patternParser.addPostfixOperator('`?','`?',{precedence: 0.5});  // optional
patternParser.addPostfixOperator('`*','`*',{precedence: 0.5}); // any number of times
patternParser.addPostfixOperator('`+','`+',{precedence: 0.5}); // at least one time

patternParser.addPrefixOperator('`!','`!',{precedence: 0.5});  // not 
patternParser.addPrefixOperator('`+-','`+-u',{precedence: 0.5});  // unary plus or minus

patternParser.addBinaryOperator(';', {precedence: 0});
patternParser.addBinaryOperator(';=', {precedence: 0});
patternParser.addBinaryOperator('`+-', {precedence: 1000000});  // plus or minus
patternParser.addBinaryOperator('`|', {precedence: 1000000});   // or
patternParser.addBinaryOperator('`:', {precedence: 1000000});   // default value
patternParser.addBinaryOperator('`&',{precedence: 100000});     // and
patternParser.addBinaryOperator('`where', {precedence: 1000000});   // condition


/** Match expression against a pattern. Wrapper for {@link Numbas.jme.rules.matchTree}
 *
 * @memberof Numbas.jme.rules
 * @method
 *
 * @param {JME} pattern
 * @param {JME} expr
 * @param {Numbas.jme.rules.matchTree_options} options - default is `commutative`, `associative`, and `allowOtherTerms` all `true`, and using {@link Numbas.jme.builtinScope}.
 *
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchExpression = jme.rules.matchExpression = function(pattern,expr,options) {
    var default_options = {
        commutative: true,
        associative: true,
        allowOtherTerms: true,
        strictPlus: false,
        scope: Numbas.jme.builtinScope
    };
    options = util.extend_object({},default_options,options);
    pattern = patternParser.compile(pattern);
    expr = jme.compile(expr);
    return matchTree(pattern,expr,options);
}
/** Flags used to control the behaviour of JME display functions.
 * Values are `undefined` so they can be overridden
 * @memberof Numbas.jme.rules
 */
var displayFlags = jme.rules.displayFlags = {
    fractionnumbers: undefined,
    rowvector: undefined,
    alwaystimes: undefined,
    mixedfractions: undefined
};
/** Flags used in JME simplification rulesets
 * @type Object.<Boolean>
 * @typedef Numbas.jme.rules.ruleset_flags
 * @property {Boolean} fractionnumbers - Show all numbers as fractions?
 * @property {Boolean} rowvector - Display vectors as a horizontal list of components?
 * @property {Boolean} alwaystimes - Always show the multiplication symbol between multiplicands?
 * @see Numbas.jme.rules.Ruleset
 */
/** Set of simplification rules
 * @constructor
 * @memberof Numbas.jme.rules
 * @param {Numbas.jme.rules.Rule[]} rules
 * @param {Numbas.jme.rules.ruleset_flags} flags
 */
var Ruleset = jme.rules.Ruleset = function(rules,flags) {
    this.rules = rules;
    this.flags = util.extend_object({},displayFlags,flags);
}
Ruleset.prototype = /** @lends Numbas.jme.rules.Ruleset.prototype */ {
    /** Test whether flag is set
     * @param {String} flag
     * @returns {Boolean}
     */
    flagSet: function(flag) {
        flag = flag.toLowerCase();
        if(this.flags.hasOwnProperty(flag))
            return this.flags[flag];
        else
            return false;
    },

    /** Apply this set's rules to the given expression until they don't change any more 
     * @param {Numbas.jme.tree} exprTree
     * @param {Numbas.jme.Scope} scope
     * @see Numbas.jme.rules.transform
     * @see Numbas.jme.rules.matchTree
     * @returns {Numbas.jme.tree}
     */
    simplify: function(exprTree,scope) {
        var rs = this;
        var changed = true;
        var depth = 0;
        while(changed) {
            if(exprTree.args) {
                var nargs = exprTree.args.map(function(arg) { return rs.simplify(arg,scope); });
                exprTree = {tok: exprTree.tok, args: nargs};
            }
            changed = false;
            for(var i=0;i<this.rules.length;i++) {
                var result = this.rules[i].replace(exprTree,{scope: scope});
                if(result.changed) {
                    changed = true;
                    exprTree = result.expression;
                    depth += 1;
                    if(depth > 100) {
                        var str = Numbas.jme.display.treeToJME(exprTree);
                        throw(new Numbas.Error("jme.display.simplifyTree.stuck in a loop",{expr:str}));
                    }
                    break;
                }
            }
        }
        return exprTree;
    }
}
var ruleSort = util.sortBy(['patternString','resultString','conditionStrings']);
/** Merge two rulesets: combine their lists of rules, and merge their flags. The second rule takes precedence over the first.
 * @param {Numbas.jme.rules.Ruleset} r1
 * @param {Numbas.jme.rules.Ruleset} r2
 * @returns {Numbas.jme.rules.Ruleset}
 */
function mergeRulesets(r1,r2) {
    var rules = r1.rules.merge(r2.rules,ruleSort);
    var flags = util.extend_object({},r1.flags,r2.flags);
    return new Ruleset(rules, flags);
}
/** Collect a ruleset together from a list of ruleset names, or rulesets.
 * @memberof Numbas.jme.rules
 * @method
 * @param {String|Array.<String|Numbas.jme.rules.Ruleset>} set - A comma-separated string of ruleset names, or an array of names/Ruleset objects.
 * @param {Object.<Numbas.jme.rules.Ruleset>} scopeSets - Dictionary of rulesets defined in the current scope.
 * @returns {Numbas.jme.rules.Ruleset}
 */
var collectRuleset = jme.rules.collectRuleset = function(set,scopeSets)
{
    scopeSets = util.copyobj(scopeSets);
    if(!set) {
        return new Ruleset([],{});
    }
    if(!scopeSets) {
        throw(new Numbas.Error('jme.display.collectRuleset.no sets'));
    }

    var rules = [];
    var flags = {};
    if(typeof(set)=='string') {
        set = set.split(',');
        set.splice(0,0,'basic');
    }
    else {
        flags = util.extend_object(flags,set.flags);
        if(set.rules)
            set = set.rules;
    }
    for(var i=0; i<set.length; i++ ) {
        if(typeof(set[i])=='string') {
            var m = /^\s*(!)?(.*)\s*$/.exec(set[i]);
            var neg = m[1]=='!' ? true : false;
            var name = m[2].trim().toLowerCase();
            if(name in displayFlags) {
                flags[name]= !neg;
            } else if(name.length>0) {
                if(!(name in scopeSets)) {
                    throw(new Numbas.Error('jme.display.collectRuleset.set not defined',{name:name}));
                }
                var sub = collectRuleset(scopeSets[name],scopeSets);
                flags = util.extend_object(flags,sub.flags);
                scopeSets[name] = sub;
                sub.rules.forEach(function(r) {
                    var m = rules.indexOf(r);
                    if(neg) {
                        if(m>=0) {
                            rules.splice(m,1);
                        }
                    } else {
                        if(m==-1) {
                            rules.push(r);
                        }
                    }
                });
            }
        } else {
            rules.push(set[i]);
        }
    }
    return new Ruleset(rules,flags);
}
/** Built-in simplification rules
 * @enum {Numbas.jme.rules.Rule[]}
 * @memberof Numbas.jme.rules
 */
var simplificationRules = jme.rules.simplificationRules = {
    basic: [
        ['negative:m_number;x','','-eval(-x)'],   // the value of a TNumber should be non-negative - pull the negation out as unary minus
        ['+(?;x)','','x'],                    //get rid of unary plus
        ['?;x+(-?;y)','g','x-y'],            //plus minus = minus
        ['?;x-(-?;y)','g','x+y'],            //minus minus = plus
        ['-(-?;x)','','x'],                //unary minus minus = plus
        ['-complex:negative:m_number;x','','eval(-x)'],   // negation of a complex number with negative real part
        ['(`+- real:m_number);x + (`+- imaginary:m_number);y','cg','eval(x+y)'],    // collect the two parts of a complex number
        ['(-?;x)/?;y','','-(x/y)'],            //take negation to left of fraction
        ['?;x/(-?;y)','','-(x/y)'],
        ['(-(real:m_number `| `!m_number);x)*?;y','acg','-(x*y)'],            //take negation to left of multiplication
        ['m_number;n*i','acg','eval(n*i)'],            //always collect multiplication by i
        ['-(?;a+?`+;b)','','-a-b']
    ],
    unitFactor: [
        ['1*?;x','acg','x'],
    ],
    unitPower: [
        ['?;x^1','','x']
    ],
    unitDenominator: [
        ['?;x/1','','x']
    ],
    zeroFactor: [
        ['?;x*0','acg','0'],
        ['0/?;x','','0']
    ],
    zeroTerm: [
        ['(`+-0) + (`+- ?);x','acg','x']
    ],
    zeroPower: [
        ['?;x^0','','1']
    ],
    noLeadingMinus: [
        ['-?;x + ?;y','p','y-x'],                                            //don't start with a unary minus
        ['-0','','0']
    ],
    collectNumbers: [
        ['(`+- m_number);n1 + (`+- m_number)`+;n2','acg','eval(n1+n2)'],
        ['m_number;n * m_number;m','acg','eval(n*m)'],        //multiply numbers
        ['(`! m_number)`+;x * real:m_number;n','acg','n*x']            //shift numbers to left hand side
    ],
    simplifyFractions: [
        ['(m_number;n * (?`* `: 1);top) / (m_number;m * (?`* `: 1);bottom) `where gcd_without_pi_or_i(n,m)>1','acg','(eval(n/gcd_without_pi_or_i(n,m))*top)/(eval(m/gcd_without_pi_or_i(n,m))*bottom)'],
        ['imaginary:m_number;n / imaginary:m_number;m','','eval(n/i)/eval(m/i)']            // cancel i when numerator and denominator are both purely imaginary
    ],
    zeroBase: [
        ['0^?;x','','0']
    ],
    constantsFirst: [
        ['(`! m_number);x * real:m_number;n','ag','n*x']
    ],
    sqrtProduct: [
        ['sqrt(?;x)*sqrt(?;y)','','sqrt(x*y)']
    ],
    sqrtDivision: [
        ['sqrt(?;x)/sqrt(?;y)','','sqrt(x/y)']
    ],
    sqrtSquare: [
        ['sqrt(?;x^2)','','x'],
        ['sqrt(?;x)^2','','x'],
        ['sqrt(integer:m_number;n) `where isint(sqrt(n))','','eval(sqrt(n))']
    ],
    trig: [
        ['sin(m_number;n) `where isint(2*n/pi)','','eval(sin(n))'],
        ['cos(m_number;n) `where isint(2*n/pi)','','eval(cos(n))'],
        ['tan(m_number;n) `where isint(n/pi)','','0'],
        ['cosh(0)','','1'],
        ['sinh(0)','','0'],
        ['tanh(0)','','0']
    ],
    otherNumbers: [
        ['m_number;n ^ m_number;m','','eval(n^m)']
    ],
    cancelTerms: [
        ['((`+- ? `: 1);n * (?`+ `& `! -?);=x `| -?;=x;n:-1) + ((`+- ? `: 1);m * (?`+ `& `! -?);=x `| -?;=x;m:-1)','acg','(n+m)*x']
    ],
    cancelFactors: [
        ['?;=x^(? `: 1);n * ?;=x^(? `: 1);m','acg','x^(m+n)'],
    ],
    collectLikeFractions: [
        ['?;a/?;=d + `+- ?;b/?;=d','acg','(a+b)/d']
    ]
    /*
        // x/y or rest*x/y
        ['(?;rest*(?;x)^(?;n)) / ((?;y)^(?;m))',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n-m)'],
        ['(?;rest*(?;x)^(?;n)) / ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n-1)'],
        ['(?;rest*?;x) / ((?;y)^(?;n))',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(1-n)'],
        ['(?;rest*?;x) / ?;y',['canonical_compare(x,y)=0'],'rest*x^0'],
        ['(?;x)^(?;n) / (?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'x^eval(n-m)'],
        ['(?;x)^(?;n) / ?;y',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(n-1)'],
        ['?;x / ((?;y)^(?;n))',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(1-n)'],
        ['?;x / ?;y',['canonical_compare(x,y)=0'],'x^0'],
        // rest/x/y or rest/x*y
        ['(?;rest/((?;x)^(?;n))) * (?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(m-n)'],
        ['(?;rest/((?;x)^(?;n))) * ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(1-n)'],
        ['(?;rest/?;x) * (?;y)^(?;n)',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(1-n)'],
        ['(?;rest/((?;x)^(?;n))) / ((?;y)^(?;m))',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest/(x^eval(n+m))'],
        ['(?;rest/((?;x)^(?;n))) / ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest/(x^eval(n+1))'],
        ['(?;rest/?;x) / ((?;y)^(?;n))',['n isa "number"','canonical_compare(x,y)=0'],'rest/(x^eval(1+n))'],
        ['(?;rest/?;x) / ?;y',['canonical_compare(x,y)=0'],'rest/(x^2)'],
        ['(?;rest/?;x) * ?;y',['canonical_compare(x,y)=0'],'rest/(x^0)']
    ],
    */
};
// these rules conflict with noLeadingMinus
var canonicalOrderRules = [
    ['(`+- ?);x+(`+- ?);y `where canonical_compare(x,y)=1','ag','y+x'],
    ['?;x*?;y `where canonical_compare(x,y)=-1','ag','y*x'],
]
var expandBracketsRules = [
    ['(?;x + ((`+- ?)`+);y) * ?;z','ag','x*z+y*z'],
    ['?;x * (?;y + ((`+- ?)`+);z)','ag','x*y+x*z']
]
/** Compile an array of rules (in the form `[pattern,conditions[],result]` to {@link Numbas.jme.rules.Rule} objects
 * @memberof Numbas.jme.rules
 * @method
 * @param {Array} rules
 * @param {String} name - a name for this group of rules
 * @returns {Numbas.jme.rules.Ruleset}
 */
var compileRules = jme.rules.compileRules = function(rules,name)
{
    for(var i=0;i<rules.length;i++)
    {
        var pattern = rules[i][0];
        var options = rules[i][1];
        var result = rules[i][2];
        rules[i] = new Rule(pattern,result,options,name);
    }
    return new Ruleset(rules,{});
}
var all=[];
var compiledSimplificationRules = {};
var notAll = ['canonicalOrder','expandBrackets'];
for(var x in simplificationRules)
{
    compiledSimplificationRules[x] = compiledSimplificationRules[x.toLowerCase()] = compileRules(simplificationRules[x],x);
    if(!notAll.contains(x)) {
    all = all.concat(compiledSimplificationRules[x].rules);
    }
}
compiledSimplificationRules['canonicalorder'] = compileRules(canonicalOrderRules,'canonicalOrder');
compiledSimplificationRules['expandbrackets'] = compileRules(expandBracketsRules,'expandBrackets');
compiledSimplificationRules['all'] = new Ruleset(all,{});
jme.rules.simplificationRules = compiledSimplificationRules;
});
