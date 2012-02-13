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

	Numbas.loadScript('scripts/jme.js');
	Numbas.startOK = true;
	Numbas.init = function() {
		var functions = [];

		for(var name in Numbas.jme.builtins)
		{
			functions.push({name: name, defs: Numbas.jme.builtins[name]});
		}
		functions.sort();
		$('body').html( templates['functions'](functions) );
	};
	Numbas.tryInit();
});
