Numbas.queueScript('mathjax-hooks',['display-base','jme','jme-display'],function() {
    if(typeof MathJax=='undefined') {
        return;
    }

    /** Wrap a variable substitution inside `\simplify` with the `texify_simplify_subvar` function so it can be evaluated.
     *
     * @param {string} expr
     * @returns {string}
     */
    function wrap_subvar(expr) {
        var sbits = Numbas.util.splitbrackets(expr,'{','}');
        var out = '';
        for(var j=0;j<sbits.length;j+=1) {
            out += j%2 ? ' texify_simplify_subvar('+sbits[j]+')' : sbits[j];
        }
        return out;
    }

    var jme = Numbas.jme;
    Numbas.display.MathJaxQueue = MathJax.Hub.queue;
    MathJax.Hub.Register.MessageHook("Math Processing Error",function(message){
        var elem = message[1];
        var contexts = [];
        while(elem.parentElement) {
            var context = Numbas.display.getLocalisedAttribute(elem,'data-jme-context-description');
            if(context) {
                console.log(elem);
                contexts.splice(0,0,context);
            }
            elem = elem.parentElement;
        }
        var context_description = contexts.join(' ');
        throw(new Numbas.Error(context_description ? 'mathjax.error with context' : 'mathjax.error',{context: context_description, message:message[2].message}));
    });
    MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
        var TEX = MathJax.InputJax.TeX;
        var currentScope = null;
        TEX.prefilterHooks.Add(function(data) {
            currentScope = $(data.script).parents('.jme-scope').first().data('jme-scope');
        });
        TEX.Definitions.Add({macros: {
            'var': 'JMEvar',
            'simplify': 'JMEsimplify'
        }});
        TEX.Parse.Augment({
            JMEvar: function(name) {
                var settings_string = this.GetBrackets(name);
                var settings = {};
                if(settings_string!==undefined) {
                    settings_string.split(/\s*,\s*/g).forEach(function(v) {
                        var setting = jme.normaliseRulesetName(v.trim());
                        settings[setting] = true;
                    });
                }
                var expr = this.GetArgument(name);
                var scope = currentScope;
                try {
                    var v = jme.evaluate(jme.compile(expr,scope),scope);
                    var tex = jme.display.texify({tok: v},settings,scope);
                }catch(e) {
                    throw(new Numbas.Error('mathjax.math processing error',{message:e.message,expression:expr}));
                }
                var mml = TEX.Parse(tex,this.stack.env).mml();
                this.Push(mml);
            },
            JMEsimplify: function(name) {
                var ruleset = this.GetBrackets(name);
                if(ruleset === undefined) {
                    ruleset = 'all';
                }
                var expr = this.GetArgument(name);
                var scope = currentScope;

                var tree = Numbas.jme.compile(wrap_subvar(expr));

                /** Replace instances of `subvars(x)` anywhere in the tree with the result of evaluating `x`.
                 *
                 * @param {Numbas.jme.tree} tree
                 * @returns {Numbas.jme.tree}{
                 */
                function subvars(tree) {
                    if(tree.tok.type=='function' && tree.tok.name == 'texify_simplify_subvar'){ 
                        return {tok: scope.evaluate(tree.args[0])};
                    }
                    if(tree.args) {
                        var args = tree.args.map(subvars);
                        return {tok: tree.tok, args: args};
                    }
                    return tree;
                }

                var subbed_tree = subvars(tree);

                try {
                    var tex = Numbas.jme.display.treeToLaTeX(subbed_tree, ruleset, scope);
                } catch(e) {
                    throw(new Numbas.Error('mathjax.math processing error',{message:e.message,expression:expr}));
                }

                var mml = TEX.Parse(tex,this.stack.env).mml();
                this.Push(mml);
            }
        })
    });
});
