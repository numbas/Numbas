Numbas.queueScript('mathjax-hooks',['display-base','jme','jme-display'],function() {
	var jme = Numbas.jme;

	Numbas.display.MathJaxQueue = MathJax.Callback.Queue(MathJax.Hub.Register.StartupHook('End',{}));

    MathJax.Hub.Register.MessageHook("Math Processing Error",function(message){
        throw(new Numbas.Error(message[2].message));
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
						var setting = v.trim().toLowerCase();
						settings[setting] = true;
					});
				}
				var expr = this.GetArgument(name);

				var scope = currentScope;

				try {
					var v = jme.evaluate(jme.compile(expr,scope),scope);

					var tex = jme.display.texify({tok: v},settings);
				}catch(e) {
					throw(new Numbas.Error('mathjax.math processing error',{message:e.message,expression:expr}));
				}
				var mml = TEX.Parse(tex,this.stack.env).mml();

				this.Push(mml);
			},

			JMEsimplify: function(name) {
				var rules = this.GetBrackets(name);
				if(rules===undefined) {
					rules = 'all';
				}
				var expr = this.GetArgument(name);

				var scope = currentScope;
				expr = jme.subvars(expr,scope);

				var tex = jme.display.exprToLaTeX(expr,rules,scope);
				var mml = TEX.Parse(tex,this.stack.env).mml();

				this.Push(mml);
			}
		})
	});
});
