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
 * @property {Numbas.jme.tree} tree - `patternString` compiled to a syntax tree
 * @property {Numbas.jme.tree} result - `result` compiled to a syntax tree
 * @property {Numbas.jme.tree[]} conditions `conditions` compiled to syntax trees
 */
var Rule = jme.rules.Rule = function(pattern,conditions,result)
{
    this.patternString = pattern;
    this.tree = jme.compile(pattern,{},true);
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
        var match = matchTree(this.tree,exprTree);
        if(match==false)
            return false;
        //if expression matches rule, then match is a dictionary of matched variables
        //check matched variables against conditions
        if(this.matchConditions(match,scope))
            return match;
        else
            return false;
    },
    matchAll: function(exprTree,scope) {
        var r = this;
        var matches = matchAllTree(this.tree,exprTree);
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
    'm_nothing':true,
    'm_number': true
}
function isEndTerm(term) {
    while(term.tok.type=='function' && /^m_(?:all|pm|not|commute)$/.test(term.tok.name) || jme.isOp(term.tok,';')) {
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
 * @param {String[]} names
 * @returns {Object} - {terms: a list of subtrees, termnames: the match names set in each term}
 */
var getCommutingTerms = Numbas.jme.rules.getCommutingTerms = function(tree,op,names) {
    if(names===undefined) {
        names = [];
    }
    if(op=='+' && jme.isOp(tree.tok,'-')) {
        tree = {tok: new jme.types.TOp('+'), args: [tree.args[0],{tok: new jme.types.TOp('-u'), args: [tree.args[1]]}]};
    }
    if(!tree.args || tree.tok.name!=op) {
        return {terms: [tree], termnames: names.slice()};
    }
    var terms = [];
    var termnames = [];
    var rest = [];
    var restnames = [];
    for(var i=0; i<tree.args.length;i++) {
        var arg = tree.args[i];
        var oarg = arg;
        var argnames = names.slice();
        while(jme.isOp(arg.tok,';')) {
            argnames.push(arg.args[1].tok.name);
            arg = arg.args[0];
        }
        if(jme.isOp(arg.tok,op) || (op=='+' && jme.isOp(arg.tok,'-'))) {
            var sub = getCommutingTerms(arg,op,argnames);
            terms = terms.concat(sub.terms);
            termnames = termnames.concat(sub.termnames);
        } else if(jme.isName(arg.tok,'?') || isEndTerm(arg)) {
            rest.push(arg);
            restnames.push(argnames);
        } else {
            terms.push(arg);
            termnames.push(argnames);
        }
    }
    if(rest.length) {
        terms = terms.concat(rest);
        termnames = termnames.concat(restnames);
    }
    return {terms: terms, termnames: termnames};
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
 * @param {Boolean} doCommute - take commutativity of operations into account, e.g. terms of a sum can be in any order.
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchTree = jme.rules.matchTree = function(ruleTree,exprTree,doCommute) {
    if(doCommute===undefined) {
        doCommute = false;
    }
    if(!exprTree)
        return false;
    var ruleTok = ruleTree.tok;
    var exprTok = exprTree.tok;
    if(jme.isOp(ruleTok,';')) {
        if(ruleTree.args[1].tok.type!='name') {
            throw(new Numbas.Error('jme.matchTree.group name not a name'));
        }
        var name = ruleTree.args[1].tok.name;
        var m = matchTree(ruleTree.args[0],exprTree,doCommute);
        if(m) {
            m[name] = exprTree;
            return m;
        } else {
            return false;
        }
    }
    if(ruleTok.type=='name')
    {
        switch(ruleTok.name) {
            case '?':
            case '??':
                return {};
            case 'm_number':
                return exprTok.type=='number' ? {} : false;
        }
    }
    if(ruleTok.type=='function') {
        switch(ruleTok.name) {
            case 'm_any':
                for(var i=0;i<ruleTree.args.length;i++) {
                    var m;
                    if(m=matchTree(ruleTree.args[i],exprTree,doCommute)) {
                        return m;
                    }
                }
                return false;
            case 'm_all':
                return matchTree(ruleTree.args[0],exprTree,doCommute);
            case 'm_pm':
                if(jme.isOp(exprTok,'-u')) {
                    return matchTree({tok: new jme.types.TOp('-u'),args: [ruleTree.args[0]]},exprTree,doCommute);
                } else {
                    return matchTree(ruleTree.args[0],exprTree,doCommute);
                }
            case 'm_not':
                if(!matchTree(ruleTree.args[0],exprTree,doCommute)) {
                    return {};
                } else {
                    return false;
                }
            case 'm_and':
                var d = {};
                for(var i=0;i<ruleTree.args.length;i++) {
                    var m = matchTree(ruleTree.args[i],exprTree,doCommute);
                    if(m) {
                        for(var name in m) {
                            d[name] = m[name];
                        }
                    } else {
                        return false;
                    }
                }
                return d;
            case 'm_uses':
                var vars = jme.findvars(exprTree);
                for(var i=0;i<ruleTree.args.length;i++) {
                    var name = ruleTree.args[i].tok.name;
                    if(!vars.contains(name)) {
                        return false;
                    }
                }
                return {};
            case 'm_commute':
                return matchTree(ruleTree.args[0],exprTree,true);
            case 'm_type':
                var wantedType = ruleTree.args[0].tok.name || ruleTree.args[0].tok.value;
                if(exprTok.type==wantedType) {
                    return {};
                } else {
                    return false;
                }
        }
    }
    if(jme.isName(ruleTok,'m_nothing')) {
        return false;
    } else if(jme.isName(ruleTok,'m_number')) {
        if(exprTok.type=='number') {
            return {};
        } else {
            return false;
        }
    }
    if(ruleTok.type!='op' && ruleTok.type != exprTok.type)
    {
        return false;
    }
    switch(ruleTok.type)
    {
    case 'number':
        if( !math.eq(ruleTok.value,exprTok.value) ) {
            return false;
        } else {
            return {};
        }
    case 'string':
    case 'boolean':
    case 'special':
    case 'range':
        if(ruleTok.value != exprTok.value) {
            return false;
        } else {
            return {};
        }
    case 'function':
    case 'op':
        var d = {};
        if(doCommute && jme.commutative[ruleTok.name]) {
            var commutingOp = ruleTok.name;
            var ruleTerms = getCommutingTerms(ruleTree,commutingOp);
            var exprTerms = getCommutingTerms(exprTree,commutingOp);
            var rest = [];
            var namedTerms = {};
            var matchedRules = [];
            var termMatches = [];
            for(var i=0; i<exprTerms.terms.length; i++) {
                var m = null;
                var matched = false;
                for(var j=0; j<ruleTerms.terms.length; j++) {
                    var ruleTerm = ruleTerms.terms[j];
                    m = matchTree(ruleTerm,exprTerms.terms[i],doCommute);
                    if((!matchedRules[j] || ruleTerm.tok.name=='m_all') && m) {
                        matched = true;
                        matchedRules[j] = true;
                        for(var name in m) {
                            if(!namedTerms[name]) {
                                namedTerms[name] = [];
                            }
                            namedTerms[name].push(m[name]);
                        }
                        var names = ruleTerms.termnames[j];
                        if(names) {
                            for(var k=0;k<names.length;k++) {
                                var name = names[k];
                                if(!namedTerms[name]) {
                                    namedTerms[name] = [];
                                }
                                namedTerms[name].push(exprTerms.terms[i]);
                            }
                        }
                        break;
                    }
                }
                if(!matched) {
                    return false;
                }
            }
            for(var i=0;i<ruleTerms.terms.length;i++) {
                var term = ruleTerms.terms[i];
                if(!isEndTerm(term) && !matchedRules[i]) {
                    return false;
                }
            }
            for(var name in namedTerms) {
                var terms = namedTerms[name];
                var sub = terms[0];
                for(var i=1;i<terms.length;i++) {
                    var op = new jme.types.TOp(commutingOp);
                    sub = {tok: op, args: [sub,terms[i]]};
                }
                d[name] = sub;
            }
            return d;
        } else {
            if(ruleTok.type!=exprTok.type || ruleTok.name!=exprTok.name) {
                return false;
            }
            var i = 0;
            var j = 0;
            for(var i=0;i<ruleTree.args.length;i++)
            {
                if(jme.isFunction(ruleTree.args[i].tok,'m_all')) {
                    while(j<exprTree.args.length) {
                        var m = matchTree(ruleTree.args[i],exprTree.args[i],doCommute);
                        if(!m) {
                            break;
                        }
                        for(var x in m) {
                            d[x]=m[x];
                        }
                        j += 1;
                    }
                } else if(jme.isName(ruleTree.args[i].tok,'m_nothing')) {
                    continue;
                } else {
                    var m = matchTree(ruleTree.args[i],exprTree.args[j],doCommute);
                    if(m===false) {
                        return false;
                    } else {
                        for(var x in m) {
                            d[x]=m[x];
                        }
                        j += 1;
                    }
                }
            }
            // if not all terms in the rule have been matched, the rule doesn't match
            if(j<i) {
                return false;
            }
            return d
        }
    case 'name':
        if(ruleTok.name.toLowerCase()==exprTok.name.toLowerCase()) {
            return {};
        } else {
            return false;
        }
    default:
        return {};
    }
}
var matchAllTree = jme.rules.matchAllTree = function(ruleTree,exprTree,doCommute) {
    var matches = [];
    var m = matchTree(ruleTree,exprTree,doCommute);
    if(m) {
        matches = [m];
    }
    if(exprTree.args) {
        exprTree.args.forEach(function(arg) {
            var submatches = matchAllTree(ruleTree,arg,doCommute);
            matches = matches.concat(submatches);
        });
    }
    return matches;
}
/** Match expression against a pattern. Wrapper for {@link Numbas.jme.rules.matchTree}
 *
 * @memberof Numbas.jme.rules
 * @method
 *
 * @param {JME} pattern
 * @param {JME} expr
 * @param {Boolean} doCommute
 *
 * @returns {Boolean|Numbas.jme.rules.jme_pattern_match} - `false` if no match, otherwise a dictionary of subtrees matched to variable names
 */
var matchExpression = jme.rules.matchExpression = function(pattern,expr,doCommute) {
    pattern = jme.compile(pattern);
    expr = jme.compile(expr);
    return matchTree(pattern,expr,doCommute);
}
/** Flags used to control the behaviour of JME display functions.
 * Values are `undefined` so they can be overridden
 * @memberof Numbas.jme.rules
 */
var displayFlags = jme.rules.displayFlags = {
    fractionnumbers: undefined,
    rowvector: undefined,
    alwaystimes: undefined
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
        ['?;x^0',['!(x=0)'],'1']
    ],
    noLeadingMinus: [
        ['-?;x+?;y',[],'y-x'],                                            //don't start with a unary minus
        ['-0',[],'0']
    ],
    collectNumbers: [
        ['-?;x-?;y',['x isa "number"','y isa "number"'],'-(x+y)'],                                        //collect minuses
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
        ['0^?;x',['!(x=0)'],'0']
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
		['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(2*(n/m)/pi)'],'eval(sin(n/m))'],
        ['cos(?;n)',['n isa "number"','isint(2*n/pi)'],'eval(cos(n))'],
		['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(2*(n/m)/pi)'],'eval(cos(n/m))'],
        ['tan(?;n)',['n isa "number"','isint(n/pi)'],'0'],
        ['cosh(0)',[],'1'],
        ['sinh(0)',[],'0'],
        ['tanh(0)',[],'0']
    ],
    trigPowers: [
        ['sin^(?;n)(?;x)',[],'sin(x)^n']
    ],
    otherNumbers: [
        ['?;n^?;m',['n isa "number"','m isa "number"','!((n=0) and (m=0))'],'eval(n^m)']
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
// other new rules 
var trigSurdsRules = [
	['sin(?;n)',['n isa "number"','isint(3*n/pi)','!(isint(n/pi))'],'eval(sin(n)*2/sqrt(3))*sqrt(3)/2'],
	['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(3*(n/m)/pi)','!(isint((n/m)/pi))'],'eval(sin(n/m)*2/sqrt(3))*sqrt(3)/2'],
	['cos(?;n)',['n isa "number"','isint(3*n/pi)','!(isint(n/pi))'],'eval(cos(n)*2)/2'],
	['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(3*(n/m)/pi)','!(isint((n/m)/pi))'],'eval(cos(n/m)*2)/2'],
	['tan(?;n)',['n isa "number"','isint(3*n/pi)','!(isint(n/pi))'],'eval(tan(n)/sqrt(3))*sqrt(3)'],
	['tan(?;n/?;m)',['n isa "number"','m isa "number"','isint(3*(n/m)/pi)','!(isint((n/m)/pi))'],'eval(tan(n/m)/sqrt(3))*sqrt(3)'],
	['sin(?;n)',['n isa "number"','isint(6*n/pi)','!(isint(3*n/pi))','!(isint(2*n/pi))'],'eval(sin(n)*2)/2'],
	['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(6*(n/m)/pi)','!(isint(3*(n/m)/pi))','!(isint(2*(n/m)/pi))'],'eval(sin(n/m)*2)/2'],
	['cos(?;n)',['n isa "number"','isint(6*n/pi)','!(isint(3*n/pi))','!(isint(2*n/pi))'],'eval(cos(n)*2/sqrt(3))*sqrt(3)/2'],
	['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(6*(n/m)/pi)','!(isint(3*(n/m)/pi))','!(isint(2*(n/m)/pi))'],'eval(cos(n/m)*2/sqrt(3))*sqrt(3)/2'],
	['tan(?;n)',['n isa "number"','isint(6*n/pi)','!(isint(3*n/pi))','!(isint(2*n/pi))'],'eval(tan(n)*sqrt(3))/sqrt(3)'],
	['tan(?;n/?;m)',['n isa "number"','m isa "number"','isint(6*(n/m)/pi)','!(isint(3*(n/m)/pi))','!(isint(2*(n/m)/pi))'],'eval(tan(n/m)*sqrt(3))/sqrt(3)'],
	['sin(?;n)',['n isa "number"','isint(4*n/pi)','!(isint(2*n/pi))'],'eval(sin(n)*sqrt(2))/sqrt(2)'],
	['sin(?;n/?;m)',['n isa "number"','m isa "number"','isint(4*(n/m)/pi)','!(isint(2*(n/m)/pi))'],'eval(sin(n/m)*sqrt(2))/sqrt(2)'],
	['cos(?;n)',['n isa "number"','isint(4*n/pi)','!(isint(2*n/pi))'],'eval(cos(n)*sqrt(2))/sqrt(2)'],
	['cos(?;n/?;m)',['n isa "number"','m isa "number"','isint(4*(n/m)/pi)','!(isint(2*(n/m)/pi))'],'eval(cos(n/m)*sqrt(2))/sqrt(2)'],
	['tan(?;n)',['n isa "number"','isint(4*n/pi)','!(isint(2*n/pi))'],'eval(tan(n))'],
	['tan(?;n/?;m)',['n isa "number"','m isa "number"','isint(4*(n/m)/pi)','!(isint(2*(n/m)/pi))'],'eval(tan(n/m))'] 
]
var oddEvenRules = [
	['sin(-?;x)',[],'-sin(x)'],
	['cos(-?;x)',[],'cos(x)'],
	['tan(-?;x)',[],'-tan(x)'],
	['sinh(-?;x)',[],'-sinh(x)'],
	['cosh(-?;x)',[],'cosh(x)'],
	['tanh(-?;x)',[],'-tanh(x)'],
	['(-?;x)^(?;n)',['n isa "number"',"isint(n/2)"],'x^n'],
	['(-?;x)^(?;n)',['n isa "number"',"isint((n-1)/2)"],'-x^n']
]
var commonFactorsRules = [
	['?;n*(?;x)+?;n*(?;y)',['n isa "number"'],'n*(x+y)']
]
var calcErrorRules = [
	['?;x',['x isa "number"','x>-0.0000000001','x<0'],'0'],
	['?;x',['x isa "number"','x<0.0000000001','x>0'],'0'],
	['?;x',['x isa "number"','x>0.9999999999','x<1'],'1'],
	['?;x',['x isa "number"','x<1.0000000001','x>1'],'1'],
]

/** Compile an array of rules (in the form `[pattern,conditions[],result]` to {@link Numbas.jme.rules.Rule} objects
 * @param {Array} rules
 * @returns {Numbas.jme.rules.Ruleset}
 */
var compileRules = jme.rules.compileRules = function(rules)
{
    for(var i=0;i<rules.length;i++)
    {
        var pattern = rules[i][0];
        var conditions = rules[i][1];
        var result = rules[i][2];
        rules[i] = new Rule(pattern,conditions,result);
    }
    return new Ruleset(rules,{});
}
var all=[];
var compiledSimplificationRules = {};
var notAll = ['canonicalOrder','expandBrackets','trigSurds','oddEven','commonFactors','calcError'];
for(var x in simplificationRules)
{
    compiledSimplificationRules[x] = compiledSimplificationRules[x.toLowerCase()] = compileRules(simplificationRules[x]);
    if(!notAll.contains(x)) {
    all = all.concat(compiledSimplificationRules[x].rules);
    }
}
compiledSimplificationRules['canonicalorder'] = compileRules(canonicalOrderRules);
compiledSimplificationRules['expandbrackets'] = compileRules(expandBracketsRules);
compiledSimplificationRules['trigsurds'] = compileRules(trigSurdsRules);
compiledSimplificationRules['oddeven'] = compileRules(oddEvenRules);
compiledSimplificationRules['commonfactors'] = compileRules(commonFactorsRules);
compiledSimplificationRules['calcerror'] = compileRules(calcErrorRules);
compiledSimplificationRules['all'] = new Ruleset(all,{});
jme.rules.simplificationRules = compiledSimplificationRules;
});
