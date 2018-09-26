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

/** Parse a string specifying options for a Rule.
 * @param {String} str
 * @returns {Numbas.jme.rules.matchTree_options}
 * @see Numbas.jme.rules.Rule
 */
function parse_options(str) {
    return {
        commutative: str.match(/c/),
        associative: str.match(/a/),
        allowOtherTerms: str.match(/g/)
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
    this.options = options;
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
     * @see Numbas.jme.rules.matchAllTree
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
/** Given a tree representing a series of terms t1 <op> t2 <op> t3 <op> ..., return the terms as a list.
 * @param {Numbas.jme.tree} tree - tree to find terms in
 * @param {String} op - the name of the operator whose terms are to be found.
 * @param {Boolean} associative - should the operator be considered as associative? If yes, `(a+b)+c` will produce three terms `a`,`b` and `c`. If no, it will produce two terms, `(a+b)` and `c`.
 * @param {String[]} [existing_names] - a list of match names set for this tree by a parent, used when called recursively.
 * @returns {Array.<Numbas.jme.rules.term>}
 */
var getTerms = Numbas.jme.rules.getTerms = function(tree,op,associative,existing_names) {
    if(existing_names===undefined) {
        existing_names = [];
    }
    if(op=='+' && jme.isOp(tree.tok,'-')) {
        /** Insert a unary minus in this tree.
         * If it's a product, the minus applies to the leftmost factor.
         */
        function insertUnaryMinus(tree) {
            if(jme.isOp(tree.tok,'*')) {
                return {tok: tree.tok, args: [insertUnaryMinus(tree.args[0]),tree.args[1]]};
            } else {
                return {tok: new jme.types.TOp('-u'), args: [tree]};
            }
        }
        tree = {tok: new jme.types.TOp('+'), args: [tree.args[0],insertUnaryMinus(tree.args[1])]};
    }
    var args = jme.isOp(tree.tok,op) ? tree.args : [tree];
    var terms = [];
    var rest = [];
    for(var i=0; i<args.length;i++) {
        var arg = args[i];
        var oarg = arg;
        var names = existing_names.slice();
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
        while(true) {
            if(jme.isOp(arg.tok,';')) {
                names.push(arg.args[1]);
            } else if(jme.isOp(arg.tok,';=')) {
                names.push(arg.args[1]);
                equalnames.push(arg.args[1]);
            } else if(jme.isOp(arg.tok,'`?') || jme.isOp(arg.tok,'`*') || jme.isOp(arg.tok,'`+')) {
                quantifier = quantifier_combo[quantifier][arg.tok.name];
            } else if(jme.isOp(arg.tok,'`:')) {
                quantifier = quantifier_combo[quantifier][arg.tok.name];
                if(defaultValue===null) {
                    defaultValue = arg.args[1];
                }
            } else {
                break;
            }
            arg = arg.args[0];
        }
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
        if(associative && (jme.isOp(arg.tok,op) || (op=='+' && jme.isOp(arg.tok,'-')))) {
            var sub = getTerms(arg,op,associative,names);
            if(quantifier!='1') {
                sub = sub.map(function(t){ t.quantifier = quantifier_combo[t.quantifier][quantifier]; });
            }
            terms = terms.concat(sub);
        } else {
            terms.push(item);
        }
    }
    if(rest.length) {
        terms = terms.concat(rest);
    }
    return terms;
}

/** The `_match` name in a stores the whole tree that matched the pattern.
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
 * @memberof Numbas.jme.rules
 *
 * @param {Numbas.jme.tree} ruleTree
 * @param {Numbas.jme.tree} exprTree
 * @param {matchTree_options} options - options specifying the behaviour of the matching algorithm
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchTree = jme.rules.matchTree = function(ruleTree,exprTree,options) {
    var m = (function() {
        if(!exprTree)
            return false;
        var ruleTok = ruleTree.tok;
        var exprTok = exprTree.tok;
        if(jme.isOp(ruleTok,';')) {
            var m = matchTree(ruleTree.args[0],exprTree,options);
            if(!m) {
                return false;
            }
            var o = resolveName(ruleTree.args[0],ruleTree.args[1],m._match);
            m[o.name] = o.value;
            return m;
        }
        var m_special = 
            (ruleTok.type=='name' && matchSpecialName(ruleTree,exprTree)) || 
            (ruleTok.type=='function' && matchSpecialFunction(ruleTree,exprTree,options)) || 
            (ruleTok.type=='op' && matchSpecialOp(ruleTree,exprTree,options))
        ;
        if(m_special) {
            return m_special;
        }

        switch(ruleTok.type) {
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

function matchSpecialName(ruleTree,exprTree) {
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

function matchSpecialFunction(ruleTree,exprTree,options) {
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
        case 'm_type':
            var wantedType = ruleTree.args[0].tok.name || ruleTree.args[0].tok.value;
            return matchType(wantedType,exprTree);
        case 'm_func':
            return matchGenericFunction(ruleTree,exprTree,options);
        case 'm_op':
            return matchGenericOp(ruleTree,exprTree,options);
        default:
            return false;
    }
}

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

function matchSpecialOp(ruleTree,exprTree,options) {
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
            return false;
    }
    return false;
}

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

function matchFunction(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(exprTok.type!='function' || (ruleTok.name!='?' && ruleTok.name!=exprTok.name)) {
        return false;
    }
    return matchNonAssociativeOp(ruleTree,exprTree,options);
}

function matchList(ruleTree,exprTree,options) {
    if(exprTree.tok.type!='list') {
        return false;
    }
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

function resolveName(ruleTree,nameTree,value) {
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

function matchOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    var op = ruleTok.name;
    var commuting = options.commutative && ruleTok.commutative;
    var associating = options.associative && ruleTok.associative;
    if(!associating) {
        if(!jme.isOp(exprTok,op)) {
            return false;
        }
    }
    var ruleTerms = getTerms(ruleTree,op,associating);
    var exprTerms = getTerms(exprTree,op,associating);
    var matches = {};
    exprTerms.forEach(function(_,i){ matches[i] = {} });

    function term_ok(exprTerm,ruleTerm,ic,pc) {
        if(matches[ic][pc]===undefined) {
            var m = matchTree(ruleTerm.term,exprTerm.term,options);
            var equalnames = {};
            ruleTerm.equalnames.forEach(function(nameTree) {
                var name = nameTree.tok.name;
                var t = m[name] || resolveName(ruleTerm,nameTree,exprTerm.term).value;
                equalnames[name] = t;
            });
            matches[ic][pc] = {
                match: m,
                equalnames: equalnames
            }
        }
        //console.log('check '+Numbas.jme.display.treeToJME(exprTerm.term)+' against '+Numbas.jme.display.treeToJME(ruleTerm.term)+': '+(matches[ic][pc] ? 'Y' : 'N'));
        return matches[ic][pc].match!==false; 
    }

    function constraint_ok(assignment,ic,pc) {
        console.log('constraint check at ',assignment,ic,pc);
        var m = matches[ic][pc];
        var equalnames = ruleTerms[pc].equalnames;
        var ok = assignment.every(function(p,i) {
            if(p<0 || p>=ruleTerms.length) {
                return true;
            }
            var m2 = matches[i][p];
            return equalnames.every(function(nameTree) {
                var name = nameTree.tok.name;
                return m2.equalnames[name]===undefined || jme.compareTrees(m.equalnames[name], m2.equalnames[name]) == 0;
            });
        });
        console.log(ok ? 'ok' : 'nope');
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
            identified_names[name] = true;
        });
    });
    function nameTerm(name,term,allowReservedName) {
        if(!allowReservedName && name.match(/^_/)) {
            return;
        }
        if(!namedTerms[name]) {
            namedTerms[name] = [];
        }
        if(identified_names[name] && namedTerms[name].length) {
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
            var o = resolveName(ruleTerm,name,exprTree);
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
    return match;
}

/** Match a sequence of terms against a given pattern sequence of terms.
 * Try to find an assignment of input terms to the pattern, satisfying the quantifier for each term in the pattern.
 * The match is greedy - input terms will match earlier pattern terms in preference to later ones.
 * If `options.commutative` is `true`, terms can match the pattern in any order.
 *
 * @param {Array.<Numbas.jme.rules.term>} pattern
 * @param {Array.<Numbas.jme.tree>} input
 * @param {Function} checkFn - function to test if an input term matches a given pattern term
 * @param {Numbas.jme.rules.matchTree_options} options
 * @returns {Numbas.jme.rules.jme_pattern_match}
 */
function match_sequence(pattern,input,options) {
    var capture = [];
    var start = 0;
    var done = false;
    var failed = false;
    var pc = 0;
    var ic = 0;
    function debug(s) {
        if(window.debugging) {
            console.log(s);
        }
    }
    function show() {
        debug(`start: ${start}, ic: ${ic}, pc: ${pc}, capture: ${capture.join(' ')}`);
    }

    function count(p) { // count the number of times we matched term p
        return capture.filter(function(x){return x==p}).length;
    }
    function consumed(p) { // have we consumed term p as many times as allowed?
        return count(p)>=pattern[p].max;
    }
    function enough(p) {
        return count(p)>=pattern[p].min;
    }
    function increment_start() {
        debug('increment start position');
        start += 1;
        ic = start;
        pc = 0;
    }
    function backtrack() {
        debug('backtrack');
        if(options.allowOtherTerms && ic==start && capture.length==start && start<input.length-1) {
            capture.push(-1);
            increment_start();
            return true;
        } 
        
        ic -= 1;
        while(ic>=start && (ic>=capture.length || capture[ic]>=pattern.length)) {
            ic -= 1;
        }
        debug('backtracked to '+ic);

        if(ic<start) {
            if(start<input.length-1) {
                capture = [];
                increment_start();
                return true;
            } else {
                failed = true;
                return false;
            }
        }
        pc = capture[ic]+1;
        capture = capture.slice(0,ic);
        return true;
    }
    function advance_input() {
        ic += 1;
        if(options.commutative) {
            pc = start;
        }
    }
    var steps = 0;
    while(!done && !failed) {
        show();
        steps += 1;
        while(pc<pattern.length && consumed(pc)) { // if have consumed this term fully, move on
            pc += 1;
        }
        if(ic==input.length) { // if we've reached the end of the input
            while(pc<pattern.length && enough(pc)) {
                pc += 1;
            }
            if(pc==pattern.length) { // if we've consumed all the terms
                done = true;
            } else {
                debug('end of input but still pattern to match')
                backtrack();
            }
        } else if(pc>=pattern.length) {
            debug("end of pattern but unconsumed input");
            if(pc==pattern.length && options.commutative && options.allowOtherTerms) {
                capture.push(pattern.length);
                advance_input();
            } else if(pc==pattern.length && !options.commutative && options.allowOtherTerms) {
                while(ic<input.length) {
                    capture.push(pattern.length);
                    advance_input();
                }
            } else {
                backtrack();
            }
        } else if(options.checkFn(input[ic],pattern[pc],ic,pc) && options.constraintFn(capture,ic,pc)) {
            debug('capture '+ic+' at '+pc);
            capture.push(pc);
            advance_input();
        } else if(options.commutative || enough(pc)) {
            pc += 1;
        } else {
            debug('can\'t match next input')
            backtrack();
        }
    }
    if(failed) {
        return false;
    }
    var result = pattern.map(function(p,i) {
        return capture.map(function(_,j){return j}).filter(function(j){ return capture[j] == i;}).map(function(j){ return j});
    });
    var ignored_start_terms = input.slice(0,start).map(function(_,j){return j});
    var ignored_end_terms = capture.map(function(_,j){return j}).filter(function(j){return capture[j]==pattern.length});
    return {ignored_start_terms: ignored_start_terms, result: result, ignored_end_terms: ignored_end_terms};
}

function matchAny(patterns,exprTree,options) {
    for(var i=0;i<patterns.length;i++) {
        var m = matchTree(patterns[i],exprTree,options);
        if(m) {
            return m;
        }
    }
}

function matchDefault(ruleTree, defaultValue, exprTree, options) {
    var m = matchTree(ruleTree,exprTree,options);
    return m;
}

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

function matchNot(ruleTree,exprTree,options) {
    if(!matchTree(ruleTree,exprTree,options)) {
        return preserve_match({},exprTree);
    } else {
        return false;
    }
}

function matchUses(names,exprTree) {
    var vars = jme.findvars(exprTree);
    for(var i=0;i<names.length;i++) {
        if(!vars.contains(names[i])) {
            return false;
        }
    }
    return {};
}

function matchType(wantedType,exprTree) {
    if(exprTree.tok.type==wantedType) {
        return {};
    } else {
        return false;
    }
}

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

function mergeMatches(matches) {
    var ms = matches.slice();
    ms.splice(0,0,{});
    return util.extend_object.apply(this,ms);
}

/** Apply operations specified in the result of a tree transformation: `eval(x)` is replaced with the result of evaluating `x`.
 * @params {Numbas.jme.tree} tree
 * @params {Numbas.jme.matchTree_options} options
 * @returns {Numbas.jme.matchTree_options}
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
 * @param {Numbas.jme.tree} ruleTree - the rule to test against
 * @param {Numbas.jme.tree} resultTree - the tree to output, with named groups from the rule substituted in.
 * @param {Numbas.jme.tree} exprTree - the expression to be tested
 * @param {matchTree_options} options - options for the match
 * @returns {transform_result}
 */
var transform = jme.rules.transform = function(ruleTree,resultTree,exprTree,options) {
    var match = matchTree(ruleTree,exprTree,options);
    if(!match) {
        return {expression: exprTree, changed: false};
    }

    var out = jme.substituteTree(resultTree,new jme.Scope([{variables: match}]), true);
    out = applyPostReplacement(out,options);
    var ruleTok = ruleTree.tok;
    if(ruleTok.associative) {
        if(match._rest_start) {
            out = {tok: new jme.types.TOp(ruleTok.name), args: [match._rest_start, out]};
        }
        if(match._rest_end) {
            out = {tok: new jme.types.TOp(ruleTok.name), args: [out, match._rest_end]};
        }
    }
    return {expression: out, changed: !jme.treesSame(exprTree,out)};
}

/** Replace anything matching the rule with the given result, at any position in the given expression
 * @param {Numbas.jme.tree} ruleTree - the rule to test against
 * @param {Numbas.jme.tree} resultTree - the tree to output, with named groups from the rule substituted in.
 * @param {Numbas.jme.tree} exprTree - the expression to be tested
 * @param {matchTree_options} options - options for the match
 * @returns {transform_result}
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
 * @param {matchTree_options} options
 *
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchExpression = jme.rules.matchExpression = function(pattern,expr,options) {
    var default_options = {
        commutative: false,
        associative: true,
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
     * @memberof Numbas.jme.rules.Ruleset.prototype
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
     * @returns Numbas.jme.tree
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
                //this.rules[i].name=='basic' && console.log(`consider ${this.rules[i].name}: ${this.rules[i].patternString} on ${Numbas.jme.display.treeToJME(exprTree)}`);
                if(result.changed) {
                    console.log(`applied ${this.rules[i].name}: ${this.rules[i].patternString}, converting ${Numbas.jme.display.treeToJME(exprTree)} to ${Numbas.jme.display.treeToJME(result.expression)}`);
                    console.log(exprTree);
                    console.log(result.expression);
                    changed = true;
                    exprTree = result.expression;
                    depth += 1;
                    if(depth > 100) {
                        var str = Numbas.jme.display.treeToJME(exprTree);
                        console.log(str);
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
function mergeRulesets(r1,r2) {
    var rules = r1.rules.merge(r2.rules,ruleSort);
    var flags = util.extend_object({},r1.flags,r2.flags);
    return new Ruleset(rules, flags);
}
/** Collect a ruleset together from a list of ruleset names, or rulesets.
 * @param {String|Array.<String|Numbas.jme.rules.Ruleset>} set - A comma-separated string of ruleset names, or an array of names/Ruleset objects.
 * @param {Object.<Numbas.jme.rules.Ruleset>} scopeSets - Dictionary of rulesets defined in the current scope.
 * @returns Numbas.jme.rules.Ruleset
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
        ['-?;x + ?;y','','y-x'],                                            //don't start with a unary minus
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
        ['(`+- m_number`? `: 1);n * ?`+;x + (`+- m_number`? `: 1);m * ?`+;y `where canonical_compare(x,y)=0','acg','eval(n+m)*x']
    ],
    /*
    cancelFactors: [
        // x*y or rest*x*y
        ['(?;rest*(?;x)^(?;n)) * (?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest*x^(n+m)'],
        ['(?;rest*(?;x)^(?;n)) * ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n+1)'],
        ['(?;rest*?;x) * (?;y)^(?;n)',['n isa "number"','canonical_compare(x,y)=0'],'rest*x^eval(n+1)'],
        ['(?;rest*?;x) * ?;y',['canonical_compare(x,y)=0'],'rest*x^2'],
        ['(?;x)^(?;n)*(?;y)^(?;m)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'x^eval(n+m)'],
        ['(?;x)^(?;n)*?;y',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(n+1)'],
        ['(?;x)^(-?;n)*?;y',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(-n+1)'],
        ['?;x*(?;y)^(?;n)',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(n+1)'],
        ['?;x*(?;y)^(-?;n)',['n isa "number"','canonical_compare(x,y)=0'],'x^eval(-n+1)'],
        ['?;x*?;y',['canonical_compare(x,y)=0'],'x^2'],
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
    collectLikeFractions: [
        ['?;a/?;b+?;c/?;d',['canonical_compare(b,d)=0'],'(a+c)/b']
    ]
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
 * @param {Array} rules
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
