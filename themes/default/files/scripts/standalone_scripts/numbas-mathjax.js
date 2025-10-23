/**
 * An extension to MathJax which adds \var and \simplify commands.
 */
(function() {

    new MathJax._.input.tex.TokenMap.CommandMap(
        'numbasMap',

        {
            var: ['numbasVar', 'var'],
            simplify: ['numbasSimplify', 'simplify']
        },

        {
            numbasVar: function mmlToken(parser, name, type) {
                const {jme} = Numbas;

                let expr;
                try {
                    const settings_string = parser.GetBrackets(name); // The optional argument to the command, in square brackets.

                    const settings = {};
                    if(settings_string !== undefined) {
                        settings_string.split(/\s*,\s*/g).forEach(function(v) {
                            var setting = jme.normaliseRulesetName(v.trim());
                            settings[setting] = true;
                        });
                    }

                    expr = parser.GetArgument(name);

                    const {scope} = parser.configuration.packageData.get('numbas');

                    const tok = jme.evaluate(expr, scope);
                    const tex = '{' + jme.display.texify({tok}, settings, scope) + '}';
                    const mml = new MathJax._.input.tex.TexParser.default(tex, parser.stack.env, parser.configuration).mml();

                    parser.Push(mml);
                } catch(e) {
                    if(e.retry instanceof Promise) {
                        throw e;
                    }
                    console.error(e);
                    throw(new Numbas.Error('mathjax.math processing error', {message:e.message, expression:expr}));
                }

            },

            numbasSimplify: function mmlToken(parser, name, type) {
                const {jme} = Numbas;

                let expr;
                try {
                    let ruleset = parser.GetBrackets(name); // The optional argument to the command, in square brackets.
                    if(ruleset === undefined) {
                        ruleset = 'all';
                    }

                    expr = parser.GetArgument(name);

                    const {scope} = parser.configuration.packageData.get('numbas');

                    const subbed_tree = jme.display.subvars(expr, scope);
                    const tex = '{' + jme.display.treeToLaTeX(subbed_tree, ruleset, scope) + '}';
                    const mml = new MathJax._.input.tex.TexParser.default(tex, parser.stack.env, parser.configuration).mml();

                    parser.Push(mml);
                } catch(e) {
                    if(e.retry instanceof Promise) {
                        throw e;
                    }
                    console.error(e);
                    throw(new Numbas.Error('mathjax.math processing error', {message:e.message, expression:expr}));
                }

            },
        }
    );

    /**
     * Cache the JME scope associated with the math element's start node.
     * @param {object} arg
     */
    function saveJMEScope(arg) {
        const scope = Numbas.display_util.find_jme_scope(arg.math.start.node);
        arg.data.packageData.set('numbas', {scope});
    }


    MathJax._.input.tex.Configuration.Configuration.create('numbas', {
        handler: {
            macro: ['numbasMap']
        },
        preprocessors: [
            [saveJMEScope, 1]
        ],
    });

})();
