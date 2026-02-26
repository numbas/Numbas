/*
Copyright 2026 Newcastle University
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
/** @file Extra JME parsers and renderers, to support different kinds of notation.
 *
 * Provides {@link Numbas.jme.notations}
 */
Numbas.queueScript('jme-notations', ['jme', 'jme-display', 'jme-rules'], function() {

const jme = Numbas.jme;

class Notation {
    Parser = jme.Parser;
    JMEifier = jme.display.JMEifier;

    /** A readable name for the notation.
     *
     * @type {string}
     */
    name = 'Standard';

    /** Delimiters for substrings of expressions that should have variables substituted in.
     *
     * @type {[string,string]}
     */
    subvars_delimiters = ['{','}'];

    /** 
     * Turn a syntax tree back into a JME expression (used when an expression is simplified).
     * Creates an instance of `this.JMEifier` and then calls its `render` method.
     *
     * @param {Numbas.jme.tree} tree
     * @param {Numbas.jme.display.jme_display_settings} settings
     * @param {Numbas.jme.Scope} scope
     * @returns {JME}
     */
    treeToJME(tree, settings, scope) {
        const jmeifier = new this.JMEifier(settings, scope);
        return jmeifier.render(tree);
    }

    /** 
     * Compile an expression string to a syntax tree.
     * Creates an instance of `this.Parser` and then calls its `compile` method.
     *
     * @param {JME} expr
     * @returns {Numbas.jme.tree}
     */
    compile(expr) {
        const parser = new this.Parser();
        return parser.compile(expr);
    }


    /** Substitute values into a JME string, and return an expression tree.
     *
     * @param {JME} expr
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.jme.tree}
     */
    subvars(expr, scope) {
        const [l,r] = this.subvars_delimiters;
        var sbits = Numbas.util.splitbrackets(expr, l, r);
        var wrapped_expr = '';
        var subs = [];
        for(let j = 0; j < sbits.length; j += 1) {
            if(j % 2 == 0) {
                wrapped_expr += sbits[j];
            } else {
                var v = scope.evaluate(sbits[j]);
                if(this.treeToJME({tok:v}, {}, scope) == '') {
                    continue;
                }
                subs.push(jme.unwrapSubexpression({tok:v}));
                wrapped_expr += ' texify_simplify_subvar(' + (subs.length - 1) + ')';
            }
        }

        var tree = this.compile(wrapped_expr);
        if(!tree) {
            return tree;
        }

        /** Replace instances of `texify_simplify_subvar(x)` anywhere in the tree with the result of evaluating `x`.
         *
         * @param {Numbas.jme.tree} tree
         * @returns {Numbas.jme.tree}{
         */
        function replace_subvars(tree) {
            if(tree.tok.type == 'function' && tree.tok.name == 'texify_simplify_subvar') {
                return subs[tree.args[0].tok.value];
            }
            if(tree.args) {
                var args = tree.args.map(replace_subvars);
                return {tok: tree.tok, args: args, bracketed: tree.bracketed};
            }
            return tree;
        }

        var subbed_tree = replace_subvars(tree);

        return subbed_tree;
    }
}
jme.Notation = Notation;

/** 
 * Set notation.
 * Curly braces delimit sets, e.g. `{1,2,3}`.
 * The `|` operator is given very high precedence, so that expressions like `{x in R | x > 2}` can easily be parsed.
 */
class SetNotation extends Notation {
    name = 'Set theory';

    subvars_delimiters = ['[[',']]'];

    Parser = class extends jme.Parser {
        precedence = Object.assign({}, jme.standardParser.precedence, {
            '|': 200
        });

        shunt_type_actions = Object.assign({}, jme.standardParser.shunt_type_actions, {
            '{': function(tok) {
                this.shunt_open_bracket(tok);
                this.listmode.push('new');
            },

            '}': function(tok) {
                var n = this.shunt_close_bracket('{',tok);

                this.listmode.pop();
                var list = new Numbas.jme.types.TList(n);
                list.pos = tok.pos;
                this.addoutput(list);
                var ntok = new Numbas.jme.types.TFunc('set');
                ntok.pos = tok.pos;
                ntok.vars = 1;
                this.addoutput(ntok);
            },
        });
    }

    JMEifier = class extends jme.display.JMEifier {
        typeToJME = Object.assign({},jme.display.JMEifier.prototype.typeToJME, {
            set(tree, tok) {
                return '{' + tok.value.map(tok => this.render({tok})).join(', ') + '}'
            }
        })
        
        jmeFunctions = Object.assign({}, jme.display.JMEifier.prototype.jmeFunctions, {
            set(tree, tok, bits) {
                if(tree.args[0].args) {
                    return '{' + tree.args[0].args.map(arg => this.render(arg)).join(', ') + '}'
                } else {
                    return 'set(' + bits.join(', ') + ')';
                }
            }
        })
    }
}

/** A modification of the standard parser that uses square brackets for grouping instead of indexing.
 */
class SquareBracketsNotation extends Notation {
    name = 'Square brackets for grouping';

    Parser = class extends jme.Parser {
        shunt_type_actions = Object.assign({}, jme.standardParser.shunt_type_actions, {
            '['(tok) {
                this.shunt_open_bracket(tok);
            },
            ']'(tok) {
                this.shunt_close_bracket('[', tok);

                if(this.output.length) {
                    this.output.at(-1).tree.bracketed = ['[',']'];
                }
            },
        });

        tokeniser_types = jme.standardParser.tokeniser_types.map((obj) => {
            if(obj.re != 're_punctuation') {
                return obj;
            }

            return Object.assign({}, obj, {
                parse(result, tokens, expr, pos) {
                    var c = this.normalisePunctuation(result[0]);
                    var new_tokens = [new jme.types.TPunc(c)];
                    if((c == '(' || c== '[') && tokens.length > 0) {
                        var prev = tokens.at(-1);
                        if(jme.isType(prev, 'number') || jme.isType(prev, ')') || jme.isType(prev, ']') || (jme.isType(prev, 'op') && prev.postfix)) {    //number, right bracket or postfix op followed by left parenthesis is also interpreted to mean multiplication
                            new_tokens.splice(0, 0, this.op('*'));
                        }
                    }
                    return {tokens: new_tokens, start: pos, end: pos + result[0].length};
                }
            });
        });
    }

}

/** A parser for expressions in boolean logic: `+` is a synonym for `or`, and `*` is a synonym for `and`.
 */
class BooleanNotation extends Notation {
    name = 'Boolean logic';

    Parser = class extends jme.Parser {
        opSynonyms = Object.assign({}, jme.standardParser.opSynonyms, {
            '+': 'or',
            '*': 'and',
        })
    }

    JMEifier = class extends jme.display.JMEifier {
        jmeOpSymbols = Object.assign({}, jme.display.JMEifier.prototype.jmeOpSymbols, {
            'and': ' * ',
            'or': ' + ',
        });
    }
}

/** Angle brackets represent dot product, and parentheses on their own delimit vectors:
 *      `<(1,2), (3,4)>` in this parser == `dot(vector(1,2), vector(3,4))` in the standard parser.
 */
class VectorShorthandNotation extends Notation {
    name = 'Vector shorthand';

    Parser = class extends jme.Parser {
        constructor(options) {
            super(options);
            this.make_re();
        }

        ops = jme.standardParser.ops.filter(x => !['<','>'].contains(x));

        re = Object.assign({}, jme.standardParser.re, {
            re_punctuation: /^(?!["'.])([,\[\]<>\p{Ps}\p{Pe}])/u,
        });

        /** Is this token an opening bracket, such as `(` or `[`?
         *
         * @param {Numbas.jme.token} tok
         * @returns {boolean}
         */
        is_opening_bracket(tok) {
            return tok.type.match(/^(?:<|\p{Ps})$/u);
        }

        /** Is this token a closing bracket, such as `(` or `[`?
         *
         * @param {Numbas.jme.token} tok
         * @returns {boolean}
         */
        is_closing_bracket(tok) {
            return tok.type.match(/^(?:>|\p{Pe})$/u);
        }

        shunt_type_actions = Object.assign({}, jme.standardParser.shunt_type_actions, {
            '<'(tok) {
                this.shunt_open_bracket(tok);
            },

            '>'(tok) {
                var n = this.shunt_close_bracket('<',tok);

                var ntok = new Numbas.jme.types.TFunc('dot');
                ntok.pos = tok.pos;
                ntok.vars = 2;
                this.addoutput(ntok);
            },

            '('(tok) {
                this.shunt_open_bracket(tok)
                this.listmode.push('new');
            },

            ')'(tok) {
                var n = this.shunt_close_bracket('(', tok);
                
                this.listmode.pop();

                var ntok = new Numbas.jme.types.TFunc('vector');
                ntok.pos = tok.pos;
                ntok.vars = n;
                this.addoutput(ntok);
            }
        });
    }

    JMEifier = class extends jme.display.JMEifier {
        typeToJME = Object.assign({},jme.display.JMEifier.prototype.typeToJME, {
            vector(tree, tok) {
                return '(' + tok.value.map(tok => this.render({tok})).join(', ') + ')'
            }
        })
        
        jmeFunctions = Object.assign({}, jme.display.JMEifier.prototype.jmeFunctions, {
            vector(tree, tok, bits) {
                return '(' + tree.args.map(arg => this.render(arg)).join(', ') + ')';
            },
            dot(tree, tok, bits) {
                return '<' + tree.args.map(arg => this.render(arg)).join(', ') + '>';
            }
        })
    }
}

/**
 * Notation for intervals of real numbers: square brackets or parentheses denote closed or open intervals, e.g. `[a,b)`.
 */
class RealIntervalNotation extends Notation {
    name = 'Intervals of real numbers';

    Parser = class extends jme.Parser {
        find_opening_bracket() {
            while(this.stack.length > 0 && !(['[','('].includes(this.stack.at(-1).type))) {
                this.addoutput(this.popstack());
            }

            if(!this.stack.length) {
                throw(new Numbas.Error('jme.shunt.no left bracket'));
            }

            //get rid of left bracket
            const opener = this.popstack();

            //work out the number of expressions between the brackets.
            var prev = this.tokens[this.i - 1];
            if(prev.type != ',' && prev.type != opener) {
                this.numvars[this.numvars.length - 1] += 1;
            }
            var n = this.numvars.pop();

            return {opener, n};
        }

        shunt_interval(closer) {
            const {opener, n} = this.find_opening_bracket();
            const includes_start = opener.type == '[';
            const includes_end = closer.type == ']';
            this.addoutput(new jme.types.TBool(includes_start));
            this.addoutput(new jme.types.TBool(includes_end));
            var ntok = new Numbas.jme.types.TFunc('interval');
            ntok.pos = opener.pos;
            ntok.vars = n + 2;
            this.addoutput(ntok);
        }

        shunt_type_actions = Object.assign({}, jme.standardParser.shunt_type_actions, {
            '['(tok) {
                this.shunt_open_bracket(tok);
            },
            '('(tok) {
                this.shunt_open_bracket(tok);
            },
            ')'(tok) {
                this.shunt_interval(tok);
            },
            ']'(tok) {
                this.shunt_interval(tok);
            }
        })
    }
    JMEifier = class extends jme.display.JMEifier {
        typeToJME = Object.assign({},jme.display.JMEifier.prototype.typeToJME, {
            interval(tree, tok) {
                const intervals = tok.value.intervals.map(interval => {
                    return `${interval.includes_start ? '[' : '('}${this.number(interval.start)}, ${this.number(interval.end)}${interval.includes_end ? ']' : ')'})`;
                });

                if(intervals.length == 1) {
                    return intervals[0];
                } else {
                    return `union(${intervals.join(', ')})`;
                }
            }
        })
        
        jmeFunctions = Object.assign({}, jme.display.JMEifier.prototype.jmeFunctions, {
            interval(tree, tok, bits) {
                const [start, end, includes_start, includes_end] = tree.args;
                if(jme.isType(includes_start.tok, 'boolean') && jme.isType(includes_end.tok, 'boolean')) {
                    return (includes_start.tok.value ? '[' : '(') + this.render(start) + ', ' + this.render(end) + (includes_end.tok.value ? ']' : ')');
                }
            },
        })
    }
}

class PatternNotation extends Notation {
    Parser = jme.rules.PatternParser;
}

/** Parsers for different kinds of notation.
 *
 * @enum {Numbas.jme.Parser}
 */
jme.notations = {
    standard: new Notation(),
    set_theory: new SetNotation(),
    square_brackets: new SquareBracketsNotation(),
    boolean_logic: new BooleanNotation(),
    vector_shorthand: new VectorShorthandNotation(),
    real_interval: new RealIntervalNotation(),
    pattern: new PatternNotation(),
};

});
