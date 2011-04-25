//a module to draw graphs of functions using flot.
//
//To use, insert a div with class "graph" in content. The expr, min, max and steps attributes control the function to be plotted.
//
//Example:
//
//	notextile. <div class="graph" expr="x^2" min="0" max="10" steps="20"></div>

Numbas.queueScript('extensions/graphs/graphs.js',['display','util','jme'],function() {
	Numbas.loadScript('extensions/graphs/flot/jquery.flot.min.js');

	var jme = Numbas.jme;
	var util = Numbas.util;

	var QuestionDisplay = Numbas.display.QuestionDisplay;

 	QuestionDisplay.prototype.show = util.extend(QuestionDisplay.prototype.show,function() {
		var q = this.q;
		var subvars = Numbas.jme.subvars;
		//do graphs
		$('.graph').each(function()
		{
			var expr = $(this).attr('expr');
			expr = subvars(expr,q.variables);
	
			var rangeMin = $(this).attr('min');
			var rangeMax = $(this).attr('max');
			var rangeSteps = $(this).attr('steps');
			var settings = {
				min: jme.evaluate(jme.compile(rangeMin,q.functions),q.variables,q.functions).value,
				max: jme.evaluate(jme.compile(rangeMax,q.functions),q.variables,q.functions).value,
				steps: jme.evaluate(jme.compile(rangeSteps,q.functions),q.variables,q.functions).value
			};

			var tree = jme.compile(expr,q.functions);
			var varname = jme.findvars(tree)[0];
			var variables = util.copyobj(q.variables);
			var points = [];
			for(var i=0; i<settings.steps; i++)
			{
				var x = i*(settings.max-settings.min)/(settings.steps-1);
				variables[varname] = new jme.types.TNum(x);
				var y = jme.evaluate(tree,variables,q.functions).value;
				points[i] = [x,y];
			}

			$(this).width(300).height(300);

			var miny=null,maxy=null;
			for(i=0;i<points.length;i++)
			{
				if(miny==null || points[i][1]<miny){miny=points[i][1];}
				if(maxy==null || points[i][1]>maxy){maxy=points[i][1];}
			}

			$.plot($(this),
					[points],
					{
						legend:{show:false},
						grid:{
								borderWidth:0,
								markings: [{
											xaxis:{from:0,to:0},
											color:'black'
											},
											{yaxis:{from:0,to:0},color:'black'}
											]
							}
					}
			);
		});
	});
});
