var vm = {};
$(document).ready(function() {
	Handlebars.registerHelper('textile',function(text) {
		return textile(text);
	});

	Handlebars.registerHelper('join',function(array,delimiter,fn) {
		if(!array)
			return;
		if(typeof(array)=='string')
			return fn(array);
		else
			return array.map(fn).join(delimiter);
	});

	var templates = window.templates = {};
	$('script[type="text/x-handlebars-template"]').each(function() {
		var source = $(this).html();
		var name = $(this).attr('id');
		templates[name] = Handlebars.compile(source);
	});

	Numbas.loadScript('scripts/jme-display.js');
	Numbas.loadScript('scripts/jme.js');
	Numbas.startOK = true;
	Numbas.init = function() {
		var functions = [];

		for(var name in Numbas.jme.builtins)
		{
			var defs = Numbas.jme.builtins[name];
			for(var i=0;i<defs.length;i++)
			{
				var def = defs[i];
				var fn = {
					name: name, 
					intype: def.intype || [],
					outtype: def.outtype || '?',
					usage: def.usage || [],
					description: def.description || ''
				};
				fn.searchText = [fn.name,fn.intype.join(', '),fn.outtype,fn.usage,fn.description].join('\n');
				functions.push(fn);
			}
		}
		functions.sort();
		vm.functions = functions;
	};
	Numbas.tryInit();

	function compare()
	{
		var keys = Array.prototype.slice.apply(arguments);
		return function(a,b) {
			for(var i=0;i<keys.length;i++)
			{
				var key = keys[i];
				switch(typeof(a[key]))
				{
				case 'number':
					if(a[key]>=0 && b[key]>=0)
					{
						if(a[key]!=b[key])
							return a[key]-b[key];
					}
					else if(a[key]>=0)
						return -1;
					else if(b[key]>=0)
						return 1;
					break;
				case 'string':
					if(a[key].length==b[key].length)
					{
						if(a[key]>b[key])
							return 1;
						else if(b[key]>a[key])
							return -1;
					}
					else
						return a[key].length - b[key].length;
				}
			}
			return 0;
		};
	}

	function findFunctions() {
		var search = $('#functions #search').val().toLowerCase().split(' ');
		var found = vm.functions.slice();
		for(var i=0;i<search.length;i++)
		{
			var word = search[i];
			found = found.filter(function(def) {
				def.searchIndex = def.searchText.toLowerCase().indexOf(word);
				if(def.searchIndex >= 0)
					return true;
			});
		}
		found.sort(compare('searchIndex','name'));
		$('#functions .list').html( templates['functions-template'](found) );
	}
	$('#functions #search').keyup(findFunctions);

	var MathJaxQueue = MathJax.Callback.Queue(MathJax.Hub.Register.StartupHook('End',{}));

	function tryJME() {
		var expr = $('#tryJME #expression').val();
		$('#tryJME')
			.find('#error')
				.html('').hide()
			.end()
			.find('#display')
				.html('')
			.end()
			.find('#evaluate')
				.html('')
		;

		if(!expr.length)
			return;

		try {
			var tree = Numbas.jme.compile(expr,{},true);
			var tex = Numbas.jme.display.texify(tree);
			var result = Numbas.jme.evaluate(tree);
			result = Numbas.jme.display.treeToJME({tok:result});
			$('#tryJME')
				.find('#display')
					.html('\\['+tex+'\\]')
				.end()
				.find('#evaluate')
					.html(result)
			;
			MathJaxQueue.Push(['Typeset',MathJax.Hub,$('#tryJME #display')[0]]);
		}
		catch(e) {
			$('#tryJME #error').show().html(e.message);
		}
	}
	$('#tryJME #expression').keyup(tryJME);
});
