var vm = {}
$(document).ready(function() {
	Numbas.loadScript('scripts/jme-display.js');
	Numbas.loadScript('scripts/jme.js');
	Numbas.startOK = true;
	Numbas.init = function() {
	};
	Numbas.tryInit();

	var variables = vm.variables = {};
	var selectors = vm.selectors = {};

	function tryExpression() {
		var expr = $('#tryDisplay #expression').val();

		//find variable names used in expression, and make input boxes for them
		var foundvars = {};
		var foundany = false;
		try {
			var bits = Numbas.util.contentsplitbrackets(expr);
			for(var i=2;i<bits.length;i+=4)
			{
				var bits2 = Numbas.jme.texsplit(bits[i])
				for(var j=3;j<bits2.length;j+=4)
				{
					try {
						var varnames = Numbas.jme.findvars(Numbas.jme.compile(bits2[j],Numbas.jme.builtinScope));
						for(var k=0;k<varnames.length;k++)
						{
							foundvars[varnames[k]]=true;
							foundany = true;
						}
					}
					catch(e) {
						$('#tryDisplay #display')
							.addClass('error')
							.append(e.message)
						;
					}
				}
			}
		}
		catch(e) {
			$('#tryDisplay #display')
				.addClass('error')
				.append(e.message)
			;
		}

		//remove variables no longer used
		var name;
		for(name in variables) {
			selectors[name].toggle(name in foundvars);
		}

		//make new variables
		for(name in foundvars) {
			if(!(name in variables))
			{
				var selector = $(templates['variable-template']({name: name}));
				$('#tryDisplay #variables ul').append(selector);

				var value = Numbas.jme.evaluate('random(1..10)',Numbas.jme.builtinScope);
				selector.find('input').val(Numbas.jme.display.treeToJME({tok:value}));

				variables[name] = value;
				selectors[name] = selector;
			}
		}
		$('#tryDisplay #variables').toggle(foundany);

		//update the display
		$('#tryDisplay')
			.find('#error')
				.html('').hide()
			.end()
			.find('#display')
				.removeClass('error')
				.html('')
		;

		if(!expr.length)
			return;
		
		try {
			scope = new Numbas.jme.Scope(Numbas.jme.builtinScope,{variables:variables});
			var line = Numbas.jme.contentsubvars(expr,scope);
			$('#tryDisplay #display')
				.html(line)
				.mathjax()
			;
		}
		catch(e) {
			$('#tryDisplay #display')
				.addClass('error')
				.append(e.message)
			;
		}

	}

	$('#tryDisplay #expression').keyup(tryExpression).change(tryExpression);

	function updateVariable() {
		var name = $(this).attr('data-name');
		try {
			var value = Numbas.jme.evaluate($(this).val(),Numbas.jme.builtinScope);
			variables[name] = value;
			tryExpression();
		}
		catch(e) {}
	}

	$('#tryDisplay #variables').on(
		{keyup: updateVariable, change: updateVariable},
		'.value'
	);

	$('#documentation').on(
		{click: function() {
			var expr = $(this).text();
			$('#tryDisplay #expression').val(expr).change();
			scrollTo($('#tryDisplay')[0]);
		}},
		'.example'
	);
});
