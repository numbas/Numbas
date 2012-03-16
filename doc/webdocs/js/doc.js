$(document).ready(function() {
	var templates = window.templates = {};
	$('script[type="text/x-handlebars-template"]').each(function() {
		var source = $(this).html();
		var name = $(this).attr('id');
		templates[name] = Handlebars.compile(source);
	});
	$('script[type="text/x-handlebars-partial"]').each(function() {
		var source = $(this).html();
		var name = $(this).attr('id');
		Handlebars.registerPartial(name,source);
	});
	var MathJaxQueue = MathJax.Callback.Queue(MathJax.Hub.Register.StartupHook('End',{}));
	$.fn.mathjax = function() {
		$(this).each(function() {
			MathJaxQueue.Push(['Typeset',MathJax.Hub,this]);
		});
	}
});
