var vm = {};
$(document).ready(function() {
	var MathJaxQueue = MathJax.Callback.Queue(MathJax.Hub.Register.StartupHook('End',{}));
	$.fn.mathjax = function() {
		$(this).each(function() {
			MathJaxQueue.Push(['Typeset',MathJax.Hub,this]);
		});
	}

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
					description: def.description || '',
					tags: def.tags || []
				};
				fn.searchText = [fn.name,fn.tags.join(', '),fn.intype.join(', '),fn.outtype,fn.usage,fn.description].join('\n');
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
		if(!(search[0].length))
		{
			$('#functions .list').html('');
			return;
		}
		var found = vm.foundFunctions = vm.functions.slice();
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
		$('#functions .list').mathjax();

	}
	$('#functions #search').keyup(findFunctions).change(findFunctions);


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
			try {
				var tex = Numbas.jme.display.texify(tree);
				$('#tryJME #display')
					.removeClass('error')
					.html('\\['+tex+'\\]')
				;
				$('#tryJME #display').mathjax();
			}
			catch(e) {
				$('#tryJME #display')
					.addClass('error')
					.append(e.message)
				;
			}
			try {
				var result = Numbas.jme.evaluate(tree);
				result = Numbas.jme.display.treeToJME({tok:result});
				$('#tryJME #evaluate')
					.removeClass(error)
					.html(result)
				;
			}
			catch(e) {
				$('#tryJME #evaluate')
					.addClass('error').
					append(e.message)
				;
			}
		}
		catch(e) {
			$('#tryJME #error').show().append(e.message);
		}
	}
	$('#tryJME #expression').keyup(tryJME).change(tryJME);

	$('#functions .list').on({click: function() {
		var expr = $(this).text();
		$('#tryJME #expression').val(expr).change();
	}},'.example');
});
