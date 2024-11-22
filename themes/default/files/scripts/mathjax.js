Numbas.queueScript('mathjax-hooks',['display-base','jme','jme-display'],function() {
    if(typeof MathJax=='undefined') {
        return;
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
            currentScope = Numbas.display.find_jme_scope(data.script);
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

                var subbed_tree = Numbas.jme.display.subvars(expr, scope);

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
