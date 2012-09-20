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

//Display code

Numbas.queueScript('scripts/display.js',['controls','math','xml','util','timing','jme','jme-display'],function() {
	
	var MathJaxQueue = MathJax.Callback.Queue(MathJax.Hub.Register.StartupHook('End',{}));

	var util = Numbas.util;

var display = Numbas.display = {
	// update progress bar when loading
	showLoadProgress: function()
	{
		var p= 100 * Numbas.schedule.completed / Numbas.schedule.total;
		$('#progressbar #completed').width(p+'%');
	},

	//display code to be called before anything else has happened
	init: function()
	{
		//hide the various content-display bits
		//show the page;
		$('#loading').hide();
		$('#everything').show();

		var numExams = 1;
		function updateExamNoun() {
			numExams = parseInt($('#numExams').val());
			$('#examNoun').html(numExams==1 ? 'exam' : 'exams');
		}
		$('#numExams').on('input change paste',updateExamNoun);

		function updateSheetType() {
			var sheetType = $('#sheettype input:checked').val();
			$('#examList').attr('class',sheetType);
		}

		$('#sheettype').on('input change',updateSheetType);
		$('#sheettype li').on('click',function() {
			$(this).find('input').attr('checked',true).trigger('change');
		})
		updateSheetType();

		$('#generateButton').on('click',function() {

			var exams = Numbas.exams = [];

			$('#print').hide();
			$('#progress').show();
			$('#typesetProgress').hide();

			$('#examProgress').html('');
			$('#examList').html('');
			var offset = parseInt($('#offset').val()) || 0;

			var job = Numbas.schedule.add;

			for(var i=0;i<numExams;i++) {
				job(function() {
					Math.seedrandom(offset);

					var exam = new Numbas.Exam();

					exam.id = offset;
					offset = offset+1;

					exams.push(exam);
					job(function() {
						var progressMarker = $('<li/>').html('Working...');
						$('#examProgress').append(progressMarker)
					})
					job(exam.init,exam);
					job(exam.display.show,exam.display);
					job(function() {
						$('#examProgress li:last').html('Done');
					});
				})
			}

			job(function() {
				$('#typesetProgress').html('Typesetting...').show();

				var oldProcessMessage = MathJax.Hub.processMessage;
				MathJax.Hub.processMessage = function(state,type) {
					oldProcessMessage.apply(MathJax.Hub,arguments);
					var m = Math.floor(state.i/(state.scripts.length)*100);
					$('#typesetProgress').html('Typesetting... '+m+'%');
				}

				MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
				MathJax.Hub.Queue(function() {
					$('#print').fadeIn();
					$('#progress').delay(500).slideUp();
					$('#typesetProgress').html('Typesetting finished.');
					$('#examList .exam').show();
				});
			});

		});

		$('#printButton').on('click',function() {
			window.print();
		});
	},

	//alert / confirm boxes
	//
	showAlert: function(msg) {
		$.prompt(msg);
	},

	showConfirm: function(msg,fnOK,fnCancel) {
		fnOK = fnOK || function(){};
		fnCancel = fnCancel || function(){};
		$.prompt(msg,{overlayspeed: 'fast', buttons:{Ok:true,Cancel:false},callback: function(val){ val ? fnOK() : fnCancel(); }});
	},

	//make MathJax typeset any maths in elem (or whole page if elem not given)
	typeset: function(elem,callback)
	{
		try
		{
			MathJaxQueue.Push(['Typeset',MathJax.Hub,elem]);
			if(callback)
				MathJaxQueue.Push(callback);
		}
		catch(e)
		{
			if(MathJax===undefined && !display.failedMathJax)
			{
				display.failedMathJax = true;
				display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
			}
			else
			{
				Numbas.showError(e);
			}
		};
	}

};

//display properties of exam object
display.ExamDisplay = function(e) 
{
	this.e=e;
	var c = this.htmlContext = $('#examTemplate').clone().removeAttr('id');

	$('#examList').append(c);


}
display.ExamDisplay.prototype = 
{
	e:undefined,	//reference to main exam object

	show: function() {
		var e = this.e;

		//display exam title at top of page
		this.htmlContext.find('#examBanner .name').html(e.name);
		this.htmlContext.find('.examID .id').html(e.id);

		for(var i=0;i<e.numQuestions;i++) {
			e.questionList[i].display.show();
		}
	},

	showInfoPage: function() {},

	showScore: function() {}
};

//display properties of question object
display.QuestionDisplay = function(q)
{
	this.q = q;
	this.examContext = q.exam.display.htmlContext;

	this.contentSelector = '#question-'+q.number;
}
display.QuestionDisplay.prototype =
{
	q: undefined,					//reference back to the main question object
	html: '',						//HTML for displaying question
	menuSelector: '',			//jQuery selector for this question's menu entry

	makeHTML: function() {
		//make html for question and advice text
		this.html = $.xsl.transform(Numbas.xml.templates.question, this.q.xml).string;
		var el = this.htmlContext = $(this.html);
		this.examContext.find('.questionList').append(el);
	},

	show: function()
	{
		var q = this.q;
		var exam = this.q.exam;

		if(this.htmlContext.find('.statement').text().trim()==''){	//hide statement block if empty
		console.log(this.htmlContext.find('.statement'));
			this.htmlContext.find('.statement').html('');
		}

		//show parts
		this.postTypesetF = function(){};
		for(var i=0;i<q.parts.length;i++)
		{
			q.parts[i].display.show();
		}
	},

	showScore: function() {}
};

var extend = Numbas.util.extend;

//display methods for question parts
display.PartDisplay = function(p)
{
	this.p = p;
	this.questionContext = p.question.display.htmlContext;
}
display.PartDisplay.prototype = 
{
	p: undefined,	//reference back to main part object

	//returns a jquery selector for the HTML div containing this part's things
	htmlContext: function()
	{
		s = this.questionContext.find('#'+this.p.path);
		return s;
	},

	answerContext: function()
	{
		return this.htmlContext().find('#answer-'+this.p.path);
	},

	//called when part is displayed (basically when question is changed)
	//show steps if appropriate, restore answers
	show: function()
	{
	}
};

//JME display code
display.JMEPartDisplay = function()
{
}
display.JMEPartDisplay.prototype =
{
	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#jme').val(this.p.studentAnswer);
	}

};
display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);

//Pattern Match display code
display.PatternMatchPartDisplay = function()
{
}
display.PatternMatchPartDisplay.prototype = 
{
	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#patternmatch').val(this.p.studentAnswer);
	}

};
display.PatternMatchPartDisplay = extend(display.PartDisplay,display.PatternMatchPartDisplay,true);

//Number Entry display code
display.NumberEntryPartDisplay = function()
{
}
display.NumberEntryPartDisplay.prototype =
{
	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#numberentry').val(this.p.studentAnswer);
	}
};
display.NumberEntryPartDisplay = extend(display.PartDisplay,display.NumberEntryPartDisplay,true);


//Multiple Response display code
display.MultipleResponsePartDisplay = function()
{
}
display.MultipleResponsePartDisplay.prototype =
{
	restoreAnswer: function()
	{
		var c = this.htmlContext();
		for(var i=0; i<this.p.numChoices; i++)
		{
			for(var j=0; j<this.p.numAnswers; j++)
			{
				var checked = this.p.ticks[j][i];
				c.find('#choice-'+i+'-'+j).prop('checked',checked);
			}
		}
	}
};
display.MultipleResponsePartDisplay = extend(display.PartDisplay,display.MultipleResponsePartDisplay,true);


display.GapFillPartDisplay = function()
{
}
display.GapFillPartDisplay.prototype =
{
	show: function()
	{
		for(var i=0;i<this.p.gaps.length; i++)
			this.p.gaps[i].display.show();
	},

	restoreAnswer: function()
	{
		for(var i=0;i<this.p.gaps.length; i++)
			this.p.gaps[i].display.restoreAnswer();
	},

	revealAnswer: function()
	{
		for(var i=0; i<this.p.gaps.length; i++)
			this.p.gaps[i].display.revealAnswer();
	}
};
display.GapFillPartDisplay = extend(display.PartDisplay,display.GapFillPartDisplay,true);

display.InformationPartDisplay = function()
{
}
display.InformationPartDisplay = extend(display.PartDisplay,display.InformationPartDisplay,true);


});

