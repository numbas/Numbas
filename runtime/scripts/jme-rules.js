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
/** Simplification rule
 * @memberof Numbas.jme.rules
 * @constructor
 *
 * @param {JME} pattern - expression pattern to match. Variables will match any sub-expression.
 * @param {JME[]} conditions - conditions as JME expressions on the matched variables, which must all evaluate to true for the rule to match.
 * @param {JME} result - expression pattern to rewrite to.
 *
 * @property {JME} patternString - the JME string defining the pattern to match
 * @property {JME} resultString - the JME string defining the result of the rule
 * @property {JME} conditionStrings - JME strings defining the conditions
 * @property {Numbas.jme.tree} patternTree - `patternString` compiled to a syntax tree
 * @property {Numbas.jme.tree} result - `result` compiled to a syntax tree
 * @property {Numbas.jme.tree[]} conditions `conditions` compiled to syntax trees
 */
var Rule = jme.rules.Rule = function(pattern,conditions,result,name)
{
    this.name = name;
    this.patternString = pattern;
    this.patternTree = patternParser.compile(pattern,{},true);
    this.resultString = result;
    this.result = jme.compile(result,{},true);
    this.conditionStrings = conditions.slice();
    this.conditions = [];
    for(var i=0;i<conditions.length;i++)
    {
        this.conditions.push(jme.compile(conditions[i],{},true));
    }
}
Rule.prototype = /** @lends Numbas.jme.rules.Rule.prototype */ {
    /** Match a rule on given syntax tree.
     * @memberof Numbas.jme.rules.Rule.prototype
     * @param {Numbas.jme.tree} exprTree - the syntax tree to test
     * @param {Numbas.jme.Scope} scope - used when checking conditions
     * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, or a dictionary of matched subtrees
     */
    match: function(exprTree,scope)
    {
        //see if expression matches rule
        var match = matchTree(this.patternTree,exprTree,{scope:scope});
        if(match==false)
            return false;
        //if expression matches rule, then match is a dictionary of matched variables
        //check matched variables against conditions
        if(this.matchConditions(match,scope))
            return match;
        else
            return false;
    },

    /** Find all matches for the rule, anywhere within the given expression.
     * @param {Numbas.jme.tree} exprTree - the syntax tree to test
     * @param {Numbas.jme.Scope} scope - used when checking conditions
     * @returns {Array.<Numbas.jme.rules.jme_pattern_match>}
     */
    matchAll: function(exprTree,scope) {
        var r = this;
        var matches = matchAllTree(this.patternTree,exprTree);
        return matches.filter(function(match) {
            return r.matchConditions(match,scope);
        });
    },
    /** Check that a matched pattern satisfies all the rule's conditions
     * @memberof Numbas.jme.rules.Rule.prototype
     * @param {Numbas.jme.rules.jme_pattern_match} match
     * @param {Numbas.jme.Scope} scope
     * @returns {Boolean}
     */
    matchConditions: function(match,scope)
    {
        scope = new Numbas.jme.Scope(scope);
        for(var i=0;i<this.conditions.length;i++)
        {
            var condition_tree = Numbas.util.copyobj(this.conditions[i],true);
            condition_tree = jme.substituteTree(condition_tree,new jme.Scope([{variables:match}]));
            try {
                var result = scope.evaluate(condition_tree, null, true);
                if(result.value==false)
                    return false;
            } catch(e) {
                return false;
            }
        }
        return true;
    }
}
var endTermNames = {
    '??':true,
    'm_nothing':true
}
/** Is the given term an "end term" - a pattern that should be matched last, and is optional
 * @param {Numbas.jme.tree} term
 * @returns Boolean
 */
var isEndTerm = jme.rules.isEndTerm = function(term) {
    while(term.tok.type=='function' && /^m_(?:all|pm|commute)$/.test(term.tok.name) || jme.isOp(term.tok,';')) {
        term = term.args[0];
    }
    if(term.tok.type=='function' && term.tok.name=='m_any') {
        for(var i=0;i<term.args.length;i++) {
            if(isEndTerm(term.args[i])) {
                return true;
            }
        }
        return false;
    }
    return term.tok.type=='name' && endTermNames[term.tok.name];
}
/** Given a tree representing a series of terms t1 <op> t2 <op> t3 <op> ..., return the terms as a list.
 * @param {Numbas.jme.tree} tree
 * @param {String} op
 * @param {String[]} names - a list of match names set for this tree
 * @param {Boolean} associative - should the operator be considered as associative? If yes, `(a+b)+c` will produce three terms `a`,`b` and `c`. If no, it will produce two terms, `(a+b)` and `c`.
 * @param {Boolean} commutative - should the operator be considered as commutative? If yes, "end terms" will be shifted to the end of the returned list. See {@link Numbas.jme.rules.isEndTerm}.
 * @returns {Object} - {terms: a list of subtrees, termnames: a list giving the match names set in each term}
 */
var getTerms = Numbas.jme.rules.getTerms = function(tree,op,associative,commutative,names) {
    if(names===undefined) {
        names = [];
    }
    if(op=='+' && jme.isOp(tree.tok,'-')) {
        tree = {tok: new jme.types.TOp('+'), args: [tree.args[0],{tok: new jme.types.TOp('-u'), args: [tree.args[1]]}]};
    }
    if(!tree.args || tree.tok.name!=op) {
        return [{term: tree, names: [], quantifier: '1', occurrences: 0}];
    }
    var terms = [];
    var rest = [];
    for(var i=0; i<tree.args.length;i++) {
        var arg = tree.args[i];
        var oarg = arg;
        var argnames = names.slice();
        var quantifier = '1';
        if(jme.isName(arg,'m_nothing')) {
            quantifier = '0';
        }
        var quantifier_combo = {
            '0': {'`?': '0', '`*': '0', '`+': 0},
            '1': {'`?': '`?', '`*': '`*', '`+': '`+'},
            '`?': {'`?': '`?', '`*': '`*', '`+': '`*'},
            '`*': {'`?': '`*', '`*': '`*', '`+': '`*'},
            '`+': {'`?': '`*', '`*': '`*', '`+': '`+'}
        };
        while(true) {
            if(jme.isOp(arg.tok,';')) {
                argnames.push(arg.args[1]);
            } else if(jme.isOp(arg.tok,'`?') || jme.isOp(arg.tok,'`*') || jme.isOp(arg.tok,'`+')) {
                quantifier = quantifier_combo[quantifier][arg.tok.name];
            } else {
                break;
            }
            arg = arg.args[0];
        }
        var item = {term: arg, names: argnames, quantifier: quantifier, occurrences: 0};
        if(associative && (jme.isOp(arg.tok,op) || (op=='+' && jme.isOp(arg.tok,'-')))) {
            var sub = getTerms(arg,op,associative,commutative,argnames);
            if(quantifier!='1') {
                sub = sub.map(function(t){ t.quantifier = quantifier_combo[t.quantifier][quantifier]; });
            }
            terms = terms.concat(sub);
        } else if(commutative && (jme.isName(arg.tok,'?') || isEndTerm(arg))) {
            rest.push(item);
        } else {
            terms.push(item);
        }
    }
    if(rest.length) {
        terms = terms.concat(rest);
    }
    return terms;
}
/** A dictionary representing the results of a JME pattern match.
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
    if(!exprTree)
        return false;
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(jme.isOp(ruleTok,';')) {
        var m = matchTree(ruleTree.args[0],exprTree,options);
        if(!m) {
            return false;
        }
        var o = resolveName(ruleTree.args[0],ruleTree.args[1],exprTree);
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
        default:
            if(ruleTok.type!=exprTok.type) {
                return false;
            }
            return util.eq(ruleTok,exprTok) ? {} : false;
    }
}

function matchSpecialName(ruleTree,exprTree) {
    if(ruleTree.tok.type!='name') {
        return false;
    }
    switch(ruleTree.tok.name) {
        case '?':
        case '??':
            return {};
        case 'm_number':
            return exprTree.tok.type=='number' ? {} : false;
        case 'm_nothing':
            return false;
        default:
            if(exprTree.tok.type!='name') {
                return false;
            }
            var same = ruleTree.tok.name.toLowerCase()==exprTree.tok.name.toLowerCase();
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
        case 'm_commute':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object(options,{commutative:true}));
        case 'm_nocommute':
            return matchTree(ruleTree.args[0],exprTree,util.extend_object(options,{commutative:false}));
        case 'm_type':
            var wantedType = ruleTree.args[0].tok.name || ruleTree.args[0].tok.value;
            return matchType(wantedType,exprTree);
        default:
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

function matchOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(options.commutative && ruleTok.commutative) {
        return matchCommutativeOp(ruleTree,exprTree,options);
    } else if(options.associative && ruleTok.associative) {
        return matchAssociativeOp(ruleTree,exprTree,options);
    } else {
        if(exprTok.type!='op' || (ruleTok.name!='?' && ruleTok.name!=exprTok.name)) {
            return false;
        }
        return matchNonAssociativeOp(ruleTree,exprTree,options);
    }
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
    if(jme.isOp(ruleTree.tok,'`+-u')) {
        value = extractLeadingMinus(value);
        var sign = jme.isOp(value.tok,'-u') ? -1 : 1;
        value = {tok: new jme.types.TNum(sign)};
    }
    if(nameTok.type=='name') {
        name = nameTok.name;
    } else if(nameTok.type=='keypair') {
        name = nameTok.key;
        value = nameTree.args[0];
    }

    return {name: name, value: value};
}

function matchCommutativeOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    var commutingOp = ruleTok.name;
    var associative = ruleTok.associative;
    var ruleTerms = getTerms(ruleTree,commutingOp,associative,true);
    var exprTerms = getTerms(exprTree,commutingOp,associative,true);
    var namedTerms = {};
    var quantifierUses = [];

    function nameTerm(name,term) {
        if(!namedTerms[name]) {
            namedTerms[name] = [];
        }
        namedTerms[name].push(term);
    }

    // match terms in the expression with terms in the rule
    for(var i=0; i<exprTerms.length; i++) {
        var exprTerm = exprTerms[i].term;
        var match = false;
        for(var j=0; j<ruleTerms.length; j++) {
            var limit = quantifier_limits[ruleTerms[j].quantifier];
            if(ruleTerms[j].occurrences>=limit[1]) {
                continue;
            }
            var ruleTerm = ruleTerms[j].term;
            match = matchTree(ruleTerm,exprTerm,options);
            if(match) {
                for(var name in match) {
                    nameTerm(name,match[name]);
                }
                var names = ruleTerms[j].names;
                if(names) {
                    for(var k=0;k<names.length;k++) {
                        var o = resolveName(ruleTerm,names[k],exprTerm);
                        nameTerm(o.name,o.value);
                    }
                }
                ruleTerms[j].occurrences += 1;
                break;
            }
        }
        if(match===false) {
            return false;
        }
    }

    // if any terms in the rule remain unmatched fewer times than required, this expression doesn't match the rule
    for(var i=0;i<ruleTerms.length;i++) {
        var limit = quantifier_limits[ruleTerms[i].quantifier];
        var occurrences = ruleTerms[i].occurrences || 0;
        if(occurrences<limit[0]) {
            return false;
        }
    }

    // collate the named groups
    var match = {};
    for(var name in namedTerms) {
        var terms = namedTerms[name];
        var sub = terms[0];
        for(var i=1;i<terms.length;i++) {
            var op = new jme.types.TOp(commutingOp);
            sub = {tok: op, args: [sub,terms[i]]};
        }
        match[name] = sub;
    }
    return match;
}

function matchAssociativeOp(ruleTree,exprTree,options) {
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    var commutingOp = ruleTok.name;
    var ruleTerms = getTerms(ruleTree,commutingOp,true,false);
    var exprTerms = getTerms(exprTree,commutingOp,true,false);
    var namedTerms = {};

    function nameTerm(name,term) {
        if(!namedTerms[name]) {
            namedTerms[name] = [];
        }
        namedTerms[name].push(term);
    }

    var j = 0;
    // match terms in the expression with terms in the rule
    for(var i=0; i<exprTerms.length; i++) {
        var exprTerm = exprTerms[i].term;
        var match = false;
        while(j<ruleTerms.length && match===false) {
            var ruleTerm = ruleTerms[j].term;
            match = matchTree(ruleTerm,exprTerm,options);
            var limit = quantifier_limits[ruleTerms[j].quantifier];
            if(!match) {
                if(ruleTerms[j].occurrences >= limit[0]) {
                    j += 1;
                    continue;
                } else {
                    return false;
                }
            } else {
                for(var name in match) {
                    nameTerm(name,match[name]);
                }
                var names = ruleTerms[j].names;
                if(names) {
                    for(var k=0;k<names.length;k++) {
                        var o = resolveName(ruleTerm,names[k],exprTerm);
                        nameTerm(o.name,o.value);
                    }
                }
                ruleTerms[j].occurrences += 1;
                if(ruleTerms[j].occurrences>=limit[1]) {
                    j+=1;
                }
            }
        }
        if(match===false) {
            return false;
        }
    }

    // if any non-optional terms in the rule remain unmatched, this expression doesn't match the rule
    for(;j<ruleTerms.length;j++) {
        var limit = quantifier_limits[ruleTerms[j].quantifier];
        var occurrences = ruleTerms[j].occurrences || 0;
        if(occurrences<limit[0]) {
            return false;
        }
    }

    // collate the named groups
    var match = {};
    for(var name in namedTerms) {
        var terms = namedTerms[name];
        var sub = terms[0];
        for(var i=1;i<terms.length;i++) {
            var op = new jme.types.TOp(commutingOp);
            sub = {tok: op, args: [sub,terms[i]]};
        }
        match[name] = sub;
    }
    return match;
}

function matchNonAssociativeOp(ruleTree,exprTree,options) {
    var i = 0;
    var j = 0;
    var match = {};
    for(var i=0;i<ruleTree.args.length;i++)
    {
        if(jme.isFunction(ruleTree.args[i].tok,'m_all')) {
            while(j<exprTree.args.length) {
                var m = matchTree(ruleTree.args[i],exprTree.args[i],options);
                if(!m) {
                    break;
                }
                for(var x in m) {
                    match[x]=m[x];
                }
                j += 1;
            }
        } else if(jme.isName(ruleTree.args[i].tok,'m_nothing')) {
            continue;
        } else {
            var m = matchTree(ruleTree.args[i],exprTree.args[j],options);
            if(m===false) {
                return false;
            } else {
                for(var x in m) {
                    match[x]=m[x];
                }
                j += 1;
            }
        }
    }
    // if not all terms in the rule have been matched, the rule doesn't match
    if(j<i) {
        return false;
    }
    return match;
}

function matchAny(patterns,exprTree,options) {
    for(var i=0;i<patterns.length;i++) {
        var m = matchTree(patterns[i],exprTree,options);
        if(m) {
            return m;
        }
    }
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
    exprTree = extractLeadingMinus(exprTree);
    if(jme.isOp(exprTree.tok,'-u')) {
        exprTree = exprTree.args[0];
    }
    return matchTree(ruleTree,exprTree,options);
}

function matchNot(ruleTree,exprTree,options) {
    if(!matchTree(ruleTree,exprTree,options)) {
        return {};
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
    var d = {};
    for(var i=0;i<patterns.length;i++) {
        var m = matchTree(patterns[i],exprTree,options);
        if(m) {
            for(var name in m) {
                d[name] = m[name];
            }
        } else {
            return false;
        }
    }
    return d;
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

var patternParser = jme.rules.patternParser = new jme.Parser();
patternParser.addPostfixOperator('`?','`?',{precedence: 0.5});  // optional
patternParser.addPostfixOperator('`*','`*',{precedence: 0.5}); // any number of times
patternParser.addPostfixOperator('`+','`+',{precedence: 0.5}); // at least one time

patternParser.addPrefixOperator('`!','`!',{precedence: 0.5});  // not 
patternParser.addPrefixOperator('`+-','`+-u',{precedence: 0.5});  // unary plus or minus

patternParser.addBinaryOperator('`+-', {precedence: 1000000});  // plus or minus
patternParser.addBinaryOperator('`|', {precedence: 1000000});   // or
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
    if(!set)
        return new Ruleset([],{});
    if(!scopeSets)
        throw(new Numbas.Error('jme.display.collectRuleset.no sets'));
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
    for(var i=0; i<set.length; i++ )
    {
        if(typeof(set[i])=='string')
        {
            var m = /^\s*(!)?(.*)\s*$/.exec(set[i]);
            var neg = m[1]=='!' ? true : false;
            var name = m[2].trim().toLowerCase();
            if(name in displayFlags)
            {
                flags[name]= !neg;
            }
            else if(name.length>0)
            {
                if(!(name in scopeSets))
                {
                    throw(new Numbas.Error('jme.display.collectRuleset.set not defined',{name:name}));
                }
                var sub = collectRuleset(scopeSets[name],scopeSets);
                flags = util.extend_object(flags,sub.flags);
                scopeSets[name] = sub;
                if(neg)
                {
                    for(var j=0; j<sub.rules.length; j++)
                    {
                        if((m=rules.indexOf(sub.rules[j]))>=0)
                        {
                            rules.splice(m,1);
                        }
                    }
                }
                else
                {
                    for(var j=0; j<sub.rules.length; j++)
                    {
                        if(!(rules.contains(sub.rules[j])))
                        {
                            rules.push(sub.rules[j]);
                        }
                    }
                }
            }
        }
        else
            rules.push(set[i]);
    }
    return new Ruleset(rules,flags);
}
/** Built-in simplification rules
 * @enum {Numbas.jme.rules.Rule[]}
 * @memberof Numbas.jme.rules
 */
var simplificationRules = jme.rules.simplificationRules = {
    basic: [
        ['?;x',['x isa "number"','x<0'],'-eval(-x)'],   // the value of a TNumber should be non-negative - pull the negation out as unary minus
        ['+(?;x)',[],'x'],                    //get rid of unary plus
        ['?;x+(-?;y)',[],'x-y'],            //plus minus = minus
        ['?;x+?;y',['y isa "number"','y<0'],'x-eval(-y)'],
        ['?;x-?;y',['y isa "number"','y<0'],'x+eval(-y)'],
        ['?;x-(-?;y)',[],'x+y'],            //minus minus = plus
        ['-(-?;x)',[],'x'],                //unary minus minus = plus
        ['-?;x',['x isa "complex"','re(x)<0'],'eval(-x)'],
        ['?;x+?;y',['x isa "number"','y isa "complex"','re(y)=0'],'eval(x+y)'],
        ['-?;x+?;y',['x isa "number"','y isa "complex"','re(y)=0'],'-eval(x-y)'],
        ['(-?;x)/?;y',[],'-(x/y)'],            //take negation to left of fraction
        ['?;x/(-?;y)',[],'-(x/y)'],
        ['(-?;x)*?;y',['not (x isa "complex")'],'-(x*y)'],            //take negation to left of multiplication
        ['?;x*(-?;y)',['not (y isa "complex")'],'-(x*y)'],
        ['?;x+(?;y+?;z)',[],'(x+y)+z'],        //make sure sums calculated left-to-right
        ['?;x-(?;y+?;z)',[],'(x-y)-z'],
        ['?;x+(?;y-?;z)',[],'(x+y)-z'],
        ['?;x-(?;y-?;z)',[],'(x-y)+z'],
        ['(?;x*?;y)*?;z',[],'x*(y*z)'],        //make sure multiplications go right-to-left
        ['?;n*i',['n isa "number"'],'eval(n*i)'],            //always collect multiplication by i
        ['i*?;n',['n isa "number"'],'eval(n*i)']
    ],
    unitFactor: [
        ['1*?;x',[],'x'],
        ['?;x*1',[],'x']
    ],
    unitPower: [
        ['?;x^1',[],'x']
    ],
    unitDenominator: [
        ['?;x/1',[],'x']
    ],
    zeroFactor: [
        ['?;x*0',[],'0'],
        ['0*?;x',[],'0'],
        ['0/?;x',[],'0']
    ],
    zeroTerm: [
        ['0+?;x',[],'x'],
        ['?;x+0',[],'x'],
        ['?;x-0',[],'x'],
        ['0-?;x',[],'-x']
    ],
    zeroPower: [
        ['?;x^0',[],'1']
    ],
    noLeadingMinus: [
        ['-?;x+?;y',[],'y-x'],                                            //don't start with a unary minus
        ['-0',[],'0']
    ],
    collectNumbers: [
        ['-?;n-?;m',['n isa "number"','m isa "number"'],'-(n+m)'],                                        //collect minuses
        ['?;n+?;m',['n isa "number"','m isa "number"'],'eval(n+m)'],    //add numbers
        ['?;n-?;m',['n isa "number"','m isa "number"'],'eval(n-m)'],    //subtract numbers
        ['?;n+?;x',['n isa "number"','!(x isa "number")'],'x+n'],        //add numbers last
        ['(?;x+?;n)+?;m',['n isa "number"','m isa "number"'],'x+eval(n+m)'],    //collect number sums
        ['(?;x-?;n)+?;m',['n isa "number"','m isa "number"'],'x+eval(m-n)'],
        ['(?;x+?;n)-?;m',['n isa "number"','m isa "number"'],'x+eval(n-m)'],
        ['(?;x-?;n)-?;m',['n isa "number"','m isa "number"'],'x-eval(n+m)'],
        ['(?;x+?;n)+?;y',['n isa "number"'],'(x+y)+n'],                        //shift numbers to right hand side
        ['(?;x+?;n)-?;y',['n isa "number"'],'(x-y)+n'],
        ['(?;x-?;n)+?;y',['n isa "number"'],'(x+y)-n'],
        ['(?;x-?;n)-?;y',['n isa "number"'],'(x-y)-n'],
        ['?;n*?;m',['n isa "number"','m isa "number"'],'eval(n*m)'],        //multiply numbers
        ['?;x*?;n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],            //shift numbers to left hand side
        ['?;m*(?;n*?;x)',['m isa "number"','n isa "number"'],'eval(n*m)*x']
    ],
    simplifyFractions: [
        ['?;n/?;m',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'eval(n/gcd_without_pi_or_i(n,m))/eval(m/gcd_without_pi_or_i(n,m))'],            //cancel simple fraction
        ['(?;n*?;x)/?;m',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'(eval(n/gcd_without_pi_or_i(n,m))*x)/eval(m/gcd_without_pi_or_i(n,m))'],    //cancel algebraic fraction
        ['?;n/(?;m*?;x)',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'eval(n/gcd_without_pi_or_i(n,m))/(eval(m/gcd_without_pi_or_i(n,m))*x)'],
        ['(?;n*?;x)/(?;m*?;y)',['n isa "number"','m isa "number"','gcd_without_pi_or_i(n,m)>1'],'(eval(n/gcd_without_pi_or_i(n,m))*x)/(eval(m/gcd_without_pi_or_i(n,m))*y)'],
        ['?;n/?;m',['n isa "complex"','m isa "complex"','re(n)=0','re(m)=0'],'eval(n/i)/eval(m/i)']            // cancel i when numerator and denominator are both purely imaginary
    ],
    zeroBase: [
        ['0^?;x',[],'0']
    ],
    constantsFirst: [
        ['?;x*?;n',['n isa "number"','!(x isa "number")','n<>i'],'n*x'],
        ['?;x*(?;n*?;y)',['n isa "number"','n<>i','!(x isa "number")'],'n*(x*y)']
    ],
    sqrtProduct: [
        ['sqrt(?;x)*sqrt(?;y)',[],'sqrt(x*y)']
    ],
    sqrtDivision: [
        ['sqrt(?;x)/sqrt(?;y)',[],'sqrt(x/y)']
    ],
    sqrtSquare: [
        ['sqrt(?;x^2)',[],'x'],
        ['sqrt(?;x)^2',[],'x'],
        ['sqrt(?;n)',['n isa "number"','isint(sqrt(n))'],'eval(sqrt(n))']
    ],
    trig: [
        ['sin(?;n)',['n isa "number"','isint(2*n/pi)'],'eval(sin(n))'],
        ['cos(?;n)',['n isa "number"','isint(2*n/pi)'],'eval(cos(n))'],
        ['tan(?;n)',['n isa "number"','isint(n/pi)'],'0'],
        ['cosh(0)',[],'1'],
        ['sinh(0)',[],'0'],
        ['tanh(0)',[],'0']
    ],
    trigPowers: [
        ['sin^(?;n)(?;x)',[],'sin(x)^n']
    ],
    otherNumbers: [
        ['?;n^?;m',['n isa "number"','m isa "number"'],'eval(n^m)']
    ],
    cancelTerms: [
        // x+y or rest+x+y
        ['(?;rest+?;n*?;x) + ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+m)*x'],
        ['(?;rest+?;n*?;x) + ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+1)*x'],
        ['(?;rest+?;x) + ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+1)*x'],
        ['(?;rest+?;x) + ?;y',['canonical_compare(x,y)=0'],'rest+2*x'],
        ['?;n*?;x+?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n+m)*x'],
        ['?;n*?;x+?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n+1)*x'],
        ['-?;x+?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n-1)*x'],
        ['-?;x+?;y',['canonical_compare(x,y)=0'],'0*x'],
        ['?;x+?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n+1)*x'],
        ['?;x+?;y',['canonical_compare(x,y)=0'],'2*x'],
        // x-y or rest+x-y
        ['(?;rest+?;n*?;x) - ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n-m)*x'],
        ['(?;rest+?;n*?;x) - ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(n-1)*x'],
        ['(?;rest+?;x) - ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(1-n)*x'],
        ['(?;rest+?;x) - ?;y',['canonical_compare(x,y)=0'],'rest+0*x'],
        ['?;n*?;x-?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n-m)*x'],
        ['?;n*?;x-?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(n-1)*x'],
        ['-?;x-?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(-1-n)*x'],
        ['-?;x-?;y',['canonical_compare(x,y)=0'],'-2*x'],
        ['-(?;n*?;x)-?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(-n-m)*x'],
        ['-(?;n*?;x)-?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(-n-1)*x'],
        ['?;x-?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'eval(1-n)*x'],
        ['?;x-?;y',['canonical_compare(x,y)=0'],'0*x'],
        // rest-x-y or rest-x+y
        ['(?;rest-?;n*?;x) + ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(m-n)*x'],
        ['(?;rest-?;n*?;x) + ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(1-n)*x'],
        ['(?;rest-?;x) + ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest+eval(1-n)*x'],
        ['(?;rest-?;n*?;x) - ?;m*?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest-eval(n+m)*x'],
        ['(?;rest-?;n*?;x) - ?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest-eval(n+1)*x'],
        ['(?;rest-?;x) - ?;n*?;y',['n isa "number"','canonical_compare(x,y)=0'],'rest-eval(1+n)*x'],
        ['(?;rest-?;x) - ?;y',['canonical_compare(x,y)=0'],'rest-2*x'],
        ['(?;rest-?;x) + ?;y',['canonical_compare(x,y)=0'],'rest+0*x'],
        ['(?;rest+?;n/?;x) + ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n+m)/x'],
        ['(?;n)/(?;x)+(?;m)/(?;y)',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n+m)/x'],
        ['(?;rest+?;n/?;x) - ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(n-m)/x'],
        ['?;n/?;x-?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'eval(n-m)/x'],
        ['(?;rest-?;n/?;x) + ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest+eval(m-n)/x'],
        ['(?;rest-?;n/?;x) - ?;m/?;y',['n isa "number"','m isa "number"','canonical_compare(x,y)=0'],'rest-eval(n+m)/x']
    ],
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
};
// these rules conflict with noLeadingMinus
var canonicalOrderRules = [
    ['?;x+?;y',['canonical_compare(x,y)=1'],'y+x'],
    ['?;x-?;y',['canonical_compare(x,y)=1'],'(-y)+x'],
    ['-?;x+?;y',['canonical_compare(x,y)=1'],'y-x'],
    ['-?;x-?;y',['canonical_compare(x,y)=1'],'(-y)-x'],
    ['(?;x+?;y)+?;z',['canonical_compare(y,z)=1'],'(x+z)+y'],
    ['(?;x+?;y)-?;z',['canonical_compare(y,z)=1'],'(x-z)+y'],
    ['(?;x-?;y)+?;z',['canonical_compare(y,z)=1'],'(x+z)-y'],
    ['(?;x-?;y)-?;z',['canonical_compare(y,z)=1'],'(x-z)-y'],
    ['?;x*?;y',['canonical_compare(x,y)=-1'],'y*x'],
    ['(?;x*?;y)*?;z',['canonical_compare(y,z)=-1'],'(x*z)*y'],
    ['?;x*(?;y*?;z)',['canonical_compare(x,y)=-1'],'y*(x*z)'],
]
var expandBracketsRules = [
    ['(?;x+?;y)*?;z',[],'x*z+y*z'],
    ['?;x*(?;y+?;z)',[],'x*y+x*z'],
    ['(?;x-?;y)*?;z',[],'x*z-y*z'],
    ['?;x*(?;y-?;z)',[],'x*y-x*z']
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
        var conditions = rules[i][1];
        var result = rules[i][2];
        rules[i] = new Rule(pattern,conditions,result,name);
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
compiledSimplificationRules['canonicalorder'] = compileRules(canonicalOrderRules);
compiledSimplificationRules['expandbrackets'] = compileRules(expandBracketsRules);
compiledSimplificationRules['all'] = new Ruleset(all,{});
jme.rules.simplificationRules = compiledSimplificationRules;
});
