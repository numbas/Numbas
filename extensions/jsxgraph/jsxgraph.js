/*
Copyright 2011 Newcastle University

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/*
 This extension allows you to use jsxGraph to create pretty graphs inside question content.
 Create a graph by writing code inside a <div class="jsxgraph"> tag.
 By default, it uses JessieScript (jsxGraph's simple scripting language for creating geometric constructions).
 You can use javascript by adding the attribute language="javascript" to the <div class="jsxgraph"> tag.

 Example Usage:

 notextile. 	//this line is required so textile doesn't mess anything up
 <div class="jsxgraph">
 	A(1,1);
 	B(0,0);
 	[AB[;
 </div>

 You can specify a width and height:

 notextile.
 <div class="jsxgraph" width="400" height="300">
  ....
 </div>

 Or use javascript for more complicated constructions:

 notextile.
 <div class="jsxgraph" language="javascript">
		var g1 = board.create('point', [1, -1], {style:6});
		var g2 = board.create('point', [2.5, -2], {style:6});
		var g3 = board.create('point', [1, -3], {style:5});
		var g4 = board.create('point', [2.5, -4], {style:5});
		var g5 = board.create('point', [-4, 1], {style:5,name:''});
		var c1 = board.create('curve', [
			   function(t){ return (g1.x()-g2.x())*math.cos(t)+g3.x()*math.cos(t*(g1.x()-g2.x())/g2.x()); },
			   function(t){ return (g1.x()-g2.x())*math.sin(t)+g3.x()*math.sin(t*(g1.x()-g2.x())/g2.x()); },
			   0,function(){ return math.pi*7*math.abs(g4.x());}],{
				  strokewidth:function(){return g5.y()*3;},
				  strokeopacity:function(){return g5.y()*0.6;}
				 });
		var t = board.create('text', [function() { return g5.x()+0.2; },function() { return g5.y()+0.25; },'x(b)=<value>x(b)</value>'], 
				{ 
					digits:3, 
					fontsize:function(){return math.abs(g5.y())*10+1;}
				})
 </div>
*/

Numbas.queueScript('extensions/jsxgraph/jsxgraph.js',['display','util','jme'],function() {
	Numbas.loadScript('extensions/jsxgraph/jsxgraphcore.js');
	Numbas.loadCSS('extensions/jsxgraph/jsxgraph.css');
	
	var jme = Numbas.jme;	
	var util = Numbas.util;
	var math = Numbas.math;

	var QuestionDisplay = Numbas.display.QuestionDisplay;

	QuestionDisplay.prototype.show = util.extend(QuestionDisplay.prototype.show, function() {
		JXG.Options.text.useMathJax = true;

		var question = this.q;

		var variables = {};
		for(var x in question.variables)
		{
			variables[x] = question.variables[x].value;
		}

		$('div.jsxgraph').each(function(index) {
			var id ='jsxgraphboard'+index;
			var text = $(this).text();
			var width= $(this).attr('width') || 400;
			var height = $(this).attr('height') || 400;
			var language = ($(this).attr('language') || 'jessiescript').toLowerCase();
			if((axis = $(this).attr('axis'))=='') { axis = true; }
			axis = util.parseBool(axis);
			var options = {
				width:width,
				height:height, 
				originX: width/2,
				originY: height/2,
				axis: false,
				showCopyright: false
			};

			//create div for board to go in
			$(this).replaceWith('<div id="'+id+'" class="jxgbox"></div>');
			$('#'+id).css('width',width+'px')
					.css('height',height+'px');

			//create board
			var board = JXG.JSXGraph.initBoard(id,options);

			switch(language)
			{
			case 'jessiescript':
				var constr = board.construct(text);
				break;
			case 'javascript':
				eval(text);
				break;
			}
			MathJax.Hub.Queue(['Typeset',MathJax.Hub,$('#'+id)[0]]);
		});
	});
});
