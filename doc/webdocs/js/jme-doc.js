var vm = {};
$(document).ready(function() {
	function changeTitle(title) {
		if(title.length)
			document.title = title+' - Numbas Documentation';
		else
			document.title = 'Numbas Documentation';
	}

	var app = Sammy('#documentation',function() {
		this.get('#functions/:query',function(context) {
			$('#documentation').tabs('select',1);
			$('#functions #search').val(context.params.query);
			findFunctions();
			changeTitle(context.params.query+' - Functions');
		});
		this.get('#:section',function(context) {
			var section = context.params.section;
			var index = $('#documentation div#'+section).prevAll('div').length;
			$('#documentation').tabs('select',index);
			$('#documentation .tab:visible').mathjax();
			var title = $('#documentation > ul li').eq(index).text();
			changeTitle(title)
		});
	});



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
				var doc = def.doc || {};
				var fn = {
					name: name, 
					intype: def.intype || [],
					outtype: def.outtype || '?',
					usage: doc.usage || [],
					description: doc.description || '',
					tags: doc.tags || []
				};
				if(!doc.description.length)
					Numbas.debug('Function '+name+' has not been documented.',true);
				fn.searchText = [fn.name,fn.tags.join(', '),fn.intype.join(', '),fn.outtype,fn.usage,fn.description].join('\n');
				functions.push(fn);
			}
		}
		functions.sort();
		vm.functions = functions;

		var types = vm.types = [];
		var got = {};
		for(var name in Numbas.jme.types)
		{
			var type = Numbas.jme.types[name];
			if(type.doc && !(type.doc.name in got))
			{
				types.push(type.doc);
				got[type.doc.name] = true;
			}
		}
		types.sort(function(a,b){return a.name>b.name ? 1 : (a.name<b.name ? -1 : 0)});
		$('#types .list').html( templates['types-template'](vm.types) );

		app.run();
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
		var query = $('#functions #search').val().toLowerCase().split(' ');
		if(!(query[0].length))
		{
			$('#functions .list').html('');
			return;
		}
		var found = vm.foundFunctions = vm.functions.slice();
		for(var i=0;i<query.length;i++)
		{
			var word = query[i];
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
	function enterSearch() {
		var query = $('#functions #search').val().toLowerCase();
		if(history.replaceState)
			history.replaceState(null,'','#functions/'+query);
		findFunctions();
	}
	$('#functions #search').keyup(findFunctions).change(enterSearch);


	function tryJME() {
		var expr = $('#tryJME #expression').val();
		$('#tryJME')
			.find('#error')
				.html('').hide()
			.end()
			.find('#display')
				.html('')
				.removeClass('error')
			.end()
			.find('#result')
				.html('')
				.removeClass('error')
		;

		if(!expr.length)
		{
			return;
		}

		try {
			var tree = Numbas.jme.compile(expr,{},true);
			try {
				var tex = Numbas.jme.display.texify(tree);
				$('#tryJME #display')
					.html('\\['+tex+'\\]')
					.mathjax();
				;
			}
			catch(e) {
				$('#tryJME #display')
					.addClass('error')
					.append(e.message)
				;
			}
			try {
				var result = Numbas.jme.evaluate(tree);
				if(!((result.type=='number' && !result.value.complex && isNaN(result.value)) || result.value==undefined || result.value==null))
				{
					result = Numbas.jme.display.treeToJME({tok:result});
					$('#tryJME #result')
						.html(result)
					;
				}
				else
				{
					$('#tryJME #result')
						.addClass('error')
						.html('Can\'t evaluate this expression.')
					;
				}
			}
			catch(e) {
				$('#tryJME #result')
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

	$('#documentation').on(
		{click: function() {
			var expr = $(this).text();
			$('#tryJME #expression').val(expr).change();
			scrollTo($('#tryJME')[0]);
		}},
		'.example'
	);

	$('#documentation').tabs({
		select: function(e,ui) {
			location.href = ui.tab.href;
		}
	});

});
