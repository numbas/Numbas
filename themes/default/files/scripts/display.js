/*
Copyright 2011-13 Newcastle University

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

function resizeF() {
	var w = $.textMetrics(this).width;
	$(this).width(Math.max(w+30,60)+'px');
};

ko.bindingHandlers.autosize = {
	init: function(element) {
		//resize text inputs to just fit their contents
		$(element).keyup(resizeF).keydown(resizeF).change(resizeF).each(resizeF);
	},
	update: function(element) {
		resizeF.apply(element);
	}
}

ko.bindingHandlers.dom = {
	update: function(element,valueAccessor) {
		var html = ko.utils.unwrapObservable(valueAccessor());
		$(element).children().remove();
		$(element).append(html);
	}
}

ko.bindingHandlers.slideVisible = {
	init: function(element,valueAccessor) {
		var v = ko.utils.unwrapObservable(valueAccessor());
		$(element).toggle(v);
	},
		
	update: function(element,valueAccessor) {
		var v = ko.utils.unwrapObservable(valueAccessor());
		if(v)
			$(element).slideDown('fast');
		else
			$(element).slideUp('fast');
	}
}

ko.bindingHandlers.latex = {
	update: function(element,valueAccessor) {
		ko.bindingHandlers.html.update.apply(this,arguments);
		Numbas.display.typeset(element);
	}
}

ko.bindingHandlers.maths = {
	update: function(element,valueAccessor) {
		var val = ko.utils.unwrapObservable(valueAccessor());
		element.innerHTML = '<script type="math/tex">'+val+'</script>';
		Numbas.display.typeset(element);
	}
}

ko.bindingHandlers.typeset = {
	update: function(element, valueAccessor) {
		ko.utils.unwrapObservable(valueAccessor());
		Numbas.display.typeset(element);
	}
}

ko.bindingHandlers.pulse = {
	init: function() {
	},
	update: function(element,valueAccessor) {
		valueAccessor()();
		$(element).stop(true).animate({opacity:0},200).animate({opacity:1},200);
	}
};

ko.bindingHandlers.carousel = {
	update: function() {

	}
}

ko.bindingHandlers.hover = {
	init: function(element,valueAccessor) {
		var val = valueAccessor();
		val(false);
		$(element).hover(
			function() {
				val(true);
			},
			function() {
				val(false)
			}
		);
	}
}
var display = Numbas.display = {
	localisePage: function() {
		//localise strings in page HTML
		$('[data-localise]').each(function() {
			var localString = R($(this).data('localise'));
			$(this).html(localString);
		})
	},

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
		$('.mainDisplay > *').hide();
		//show the page;
		$('#loading').hide();
		$('#everything').show();

		ko.applyBindings(Numbas.exam.display);

		$(document).keydown( function(e)
		{
			if(!Numbas.exam.inProgress) { return; }

			if($('input:focus').length || $('#jqibox').is(':visible'))
				return;
			
			switch(e.keyCode)
			{
			case 37:
				Numbas.controls.previousQuestion();
				break;
			case 39:
				Numbas.controls.nextQuestion();
				break;
			}
		});
	},

	// does an input element currently have focus?
	inInput: false,

	//alert / confirm boxes
	//

	showAlert: function(msg) {
		$.prompt(msg);
	},

	showConfirm: function(msg,fnOK,fnCancel) {
		fnOK = fnOK || function(){};
		fnCancel = fnCancel || function(){};

		$.prompt(msg,{overlayspeed: 'fast', buttons:{Ok:true,Cancel:false},submit: function(val){ val ? fnOK() : fnCancel(); }});
	},

	//make MathJax typeset any maths in elem (or whole page if elem not given)
	typeset: function(selector,callback)
	{
		try
		{
			if(!selector)
				selector = $('body');

			$(selector).each(function(i,elem) {
				MathJaxQueue.Push(['Typeset',MathJax.Hub,elem]);
			});
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
	this.exam=e;

	this.infoPage = ko.observable(null);
	this.currentQuestion = ko.observable(null);
	this.currentQuestionNumber = ko.computed(function() {
		var q = this.currentQuestion();
		if(q)
			return q.question.number;
		else
			return null;
	},this);

	this.canReverse = ko.computed(function() {
		return this.exam.settings.navigateReverse && this.currentQuestionNumber()>0;
	},this);
	this.canAdvance = ko.computed(function() {
		return this.currentQuestionNumber()<this.exam.settings.numQuestions-1;
	},this);


	this.score = ko.observable(e.score);
	this.marks = ko.observable(e.mark);
	this.examScoreDisplay = ko.computed(function() {
		var niceNumber = Numbas.math.niceNumber;
		var exam = this.exam;
		var score = this.score();
		var marks = this.marks();

		var totalExamScoreDisplay = '';
		if(exam.settings.showTotalMark)
			totalExamScoreDisplay = niceNumber(score)+'/'+niceNumber(marks);
		else
			totalExamScoreDisplay = niceNumber(score);

		return R('control.total',totalExamScoreDisplay);
	},this);
	this.displayTime = ko.observable('');

	document.title = e.settings.name;

}
display.ExamDisplay.prototype = 
{
	e:undefined,	//reference to main exam object

	showTiming: function()
	{
		this.displayTime(R('timing.time remaining',Numbas.timing.secsToDisplayTime(this.exam.timeRemaining)));
	},

	hideTiming: function()
	{
		this.displayTime('');
	},

	showScore: function()
	{
		var exam = this.exam;
		this.marks(exam.mark);
		this.score(exam.score);
	},

	updateQuestionMenu: function()
	{
		var exam = this.exam;
		//scroll question list to centre on current question
		if(display.carouselGo)
			display.carouselGo(exam.currentQuestion.number-1,300);
	},

	showInfoPage: function(page)
	{
		window.onbeforeunload = null;

		this.infoPage(page);
		this.currentQuestion(null);

		var exam = this.exam;

		//scroll back to top of screen
		scroll(0,0);

		switch(page)
		{
		case "frontpage":

			//the whole page was hidden at load, so user doesn't see all the nav elements briefly
			$('body > *').show();
			$('#loading').hide();

			$('#infoDisplay').getTransform(Numbas.xml.templates.frontpage,exam.xmlize());

			break;

		case "result":
			//turn report into XML
			var xmlDoc = Sarissa.xmlize(exam.report,"report");

			//display result page using report XML
			$('#infoDisplay').getTransform(Numbas.xml.templates.result,xmlDoc);
			
			break;

		case "suspend":
			$('#infoDisplay').getTransform(Numbas.xml.templates.suspend,exam.xmlize());
		
			Numbas.exam.display.showScore();

			break;
		
		case "exit":
			$('#infoDisplay').getTransform(Numbas.xml.templates.exit,exam.xmlize());
			break;
		}
		ko.applyBindings(this,$('#infoDisplay')[0]);
	},

	showQuestion: function()
	{
		var exam = this.exam;

		this.infoPage(null);
		this.currentQuestion(exam.currentQuestion.display);

		if(exam.settings.preventLeave)
			window.onbeforeunload = function() { return R('control.confirm leave') };

		exam.currentQuestion.display.show();
		if(!this.madeCarousel)
		{
			display.carouselGo = makeCarousel($('.questionList'),{step: 2, nextBtn: '.questionMenu .next', prevBtn: '.questionMenu .prev'});
			this.madeCarousel = true;
		}
	},

	startRegen: function() {
		$('#questionDisplay').hide();
	},
	
	endRegen: function() {
		$('#questionDisplay').fadeIn(200);
	}
};

//display properties of question object
display.QuestionDisplay = function(q)
{
	this.question = q;
	var exam = q.exam;

	this.adviceDisplayed = ko.observable(false);

	this.getPart = function(path) {
		return q.getPart(path).display;
	}

	this.submitMessage = ko.observable('');

	this.displayName = ko.observable(R('question.header',q.number+1));

	this.visited = ko.observable(q.visited);
	this.visible = ko.computed(function() {
		return this.visited() || exam.settings.navigateBrowse;
	},this);

	this.score = ko.observable(q.score);
	this.marks = ko.observable(q.marks);
	this.answered = ko.observable(q.answered);
	this.revealed = ko.observable(q.revealed);
	this.anyAnswered = ko.observable(false);

	this.scoreFeedback = showScoreFeedback(this,q.exam.settings);
}
display.QuestionDisplay.prototype =
{
	question: undefined,			//reference back to the main question object
	html: '',						//HTML for displaying question

	makeHTML: function() {
		var q = this.question;
		var html = this.html = $($.xsl.transform(Numbas.xml.templates.question, q.xml).string);

		Numbas.schedule.add(function()
		{
			html.each(function(e) {
				Numbas.jme.variables.DOMcontentsubvars(this,q.scope);
			})
		});

	},

	show: function()
	{
		var q = this.question;
		var exam = q.exam;

		this.visited(q.visited);

		//display question's html
		$('#questionDisplay').append(this.html);
		ko.applyBindings(this,this.html[0]);

		//update the question menu - highlight this question, etc.
		exam.display.updateQuestionMenu();

		switch(exam.mode) {
		case 'normal':
			this.submitMessage( R(q.parts.length<=1 ? 'control.submit answer' : 'control.submit all parts') );
			break;
		case 'review':
			break;
		}

		//show parts
		this.postTypesetF = function(){};
		for(var i=0;i<q.parts.length;i++)
		{
			q.parts[i].display.show();
		}

		//display advice if appropriate
		this.showAdvice();

		//show correct answers if appropriate
		this.revealAnswer();
		
		//display score if appropriate
		this.showScore();
		
		//scroll back to top of page
		scroll(0,0);

		// make mathjax process the question text (render the maths)
		Numbas.display.typeset($('#questionDisplay'),this.postTypesetF);
		setTimeout(function(){
			MathJaxQueue.Push(['Rerender',MathJax.Hub,$('#questionDisplay')[0]]);
		},100);
	},

	leave: function() {
		$('#questionDisplay .question').remove();
	},

	//display Advice
	showAdvice: function( fromButton )
	{
		this.adviceDisplayed(this.question.adviceDisplayed);
	},

	revealAnswer: function()
	{
		this.revealed(this.question.revealed);
		if(!this.question.revealed)
			return;
	},

	//display question score and answer state
	showScore: function()
	{
		var q = this.question;
		var exam = q.exam;

		this.score(q.score);
		this.marks(q.marks);
		this.answered(q.answered);
		this.scoreFeedback.update(true);

		var anyAnswered = false;
		for(var i=0;i<q.parts.length;i++)
		{
			anyAnswered |= q.parts[i].answered;
		}
		this.anyAnswered(anyAnswered);
	},

	scrollToError: function() {
		scrollTo($('.warning-icon:visible:first'));
	}
};

var extend = Numbas.util.extend;

//display methods for question parts
display.PartDisplay = function(p)
{
	var pd = this;
	this.part = p;
	this.warningDiv = '#warning-'+p.path;

	this.score = ko.observable(p.score);
	this.marks = ko.observable(p.marks);
	this.answered = ko.observable(p.answered);

	this.warnings = ko.observableArray([]);
	this.warningsShown = ko.observable(false);

	this.feedbackShown = ko.observable(false);
	this.toggleFeedbackText = ko.computed(function() {
		return R(this.feedbackShown() ? 'question.score feedback.hide' : 'question.score feedback.show');
	},this);
	this.feedbackMessages = ko.observableArray([]);
	this.showFeedbackToggler = ko.computed(function() {
		return p.question.exam.settings.showAnswerState && pd.feedbackMessages().length;
	});

	this.stepsShown = ko.observable(p.stepsShown);

	this.revealed = ko.observable(false);

	this.scoreFeedback = showScoreFeedback(this,p.question.exam.settings);

	this.controls = {
		toggleFeedback: function() {
			pd.feedbackShown(!pd.feedbackShown());
		},
		submit: function() {
			p.display.removeWarnings();
			p.submit();
			if(!p.answered)
			{
				Numbas.display.showAlert(R('question.can not submit'));
			}
			Numbas.store.save();
		},
		showSteps: function() {
			p.showSteps();
		}
	}
}
display.PartDisplay.prototype = 
{
	part: undefined,	//reference back to main part object

	warning: function(warning)
	{
		this.warnings.push(warning+'');
	},

	//remove all previously displayed warnings
	removeWarnings: function()
	{
		this.warnings([]);
	},

	//called when part is displayed (basically when question is changed)
	//show steps if appropriate, restore answers
	show: function()
	{
		var p = this.part;

		this.feedbackShown(false);

		this.showScore(this.part.answered);
	},

	//update 
	showScore: function(valid)
	{
		var p = this.part;
		var exam = p.question.exam;

		this.score(p.score);
		this.marks(p.marks);
		this.scoreFeedback.update(true);

		if(valid===undefined)
			valid = this.part.validate();
		this.answered(valid);

		if(exam.settings.showAnswerState)
		{
			if(this.part.markingFeedback.length && !this.part.question.revealed)
			{
				var messages = [];
				var maxMarks = this.part.marks - (this.part.stepsShown ? this.part.settings.stepsPenalty : 0);
				var t = 0;
				for(var i=0;i<this.part.markingFeedback.length;i++)
				{
					var action = this.part.markingFeedback[i];
					var change = 0;

					switch(action.op) {
					case 'addCredit':
						change = action.credit*maxMarks;
						if(action.gap!=undefined)
							change *= this.part.gaps[action.gap].marks/this.part.marks;
						t += change;
						break;
					}

					var message = action.message || '';
					if(util.isNonemptyHTML(message))
					{
						var marks = R('feedback.marks',Numbas.math.niceNumber(Math.abs(change)),util.pluralise(change,R('mark'),R('marks')));

						if(change>0)
							message+='\n\n'+R('feedback.you were awarded',marks);
						else if(change<0)
							message+='\n\n'+R('feedback.taken away',marks,util.pluralise(change,R('was'),R('were')));
					}
					if(util.isNonemptyHTML(message))
						messages.push(message);
				}
				
				this.feedbackMessages(messages);
			}
		}
	},

	//called when 'show steps' button is pressed, or coming back to a part after steps shown
	showSteps: function()
	{
		this.stepsShown(this.part.stepsShown);

		for(var i=0;i<this.part.steps.length;i++)
		{
			this.part.steps[i].display.show();
		}
	},

	//called when question displayed - fills student's last answer into inputs
	restoreAnswer: function() 
	{
	},

	//fills inputs with correct answers
	revealAnswer: function() 
	{
		this.revealed(true);
		this.removeWarnings();
		this.showScore();
	}
};

//JME display code
display.JMEPartDisplay = function()
{
	var p = this.part;
	this.studentAnswer = ko.observable('');
	this.correctAnswer = p.settings.correctAnswer;
	this.correctAnswerLaTeX = Numbas.jme.display.exprToLaTeX(this.correctAnswer,p.settings.displaySimplification,p.question.scope);

	ko.computed(function() {
		p.storeAnswer([this.studentAnswer()]);
	},this);

	this.studentAnswerLaTeX = ko.computed(function() {
		var studentAnswer = this.studentAnswer();
		if(studentAnswer=='')
			return '';

		this.removeWarnings();

		try {
			var tex = Numbas.jme.display.exprToLaTeX(studentAnswer,p.settings.displaySimplification,p.question.scope);
			if(tex===undefined)
				throw(new Numbas.Error('display.part.jme.error making maths'));

			return tex;
		}
		catch(e) {
			this.warning(e);
			return '';
		}
	},this).extend({throttle:100});

	this.inputHasFocus = ko.observable(false);
	this.focusInput = function() {
		this.inputHasFocus(true);
	}
}
display.JMEPartDisplay.prototype =
{
	restoreAnswer: function()
	{
		this.studentAnswer(this.part.studentAnswer);
	}
};
display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);

//Pattern Match display code
display.PatternMatchPartDisplay = function()
{
	var p = this.part;

	this.studentAnswer = ko.observable(this.part.studentAnswer);

	this.correctAnswer = ko.observable(p.settings.correctAnswer);

	ko.computed(function() {
		p.storeAnswer([this.studentAnswer()]);
	},this);
}
display.PatternMatchPartDisplay.prototype = 
{
	restoreAnswer: function()
	{
		this.studentAnswer(this.part.studentAnswer);
	}
};
display.PatternMatchPartDisplay = extend(display.PartDisplay,display.PatternMatchPartDisplay,true);

//Number Entry display code
display.NumberEntryPartDisplay = function()
{
	var p = this.part;

	this.studentAnswer = ko.observable(p.studentAnswer);

	this.correctAnswer = ko.observable(p.settings.displayAnswer);

	ko.computed(function() {
		p.storeAnswer([this.studentAnswer()]);
	},this);
}
display.NumberEntryPartDisplay.prototype =
{
	restoreAnswer: function()
	{
		this.studentAnswer(this.part.studentAnswer);
	}
};
display.NumberEntryPartDisplay = extend(display.PartDisplay,display.NumberEntryPartDisplay,true);


//Multiple Response display code
display.MultipleResponsePartDisplay = function()
{
	var p = this.part;

	function makeTicker(answer,choice) {
		var obs = ko.observable(false);
		ko.computed(function() {
			p.storeAnswer([answer,choice,obs()]);
		},p);
		return obs;
	}

	function makeRadioTicker(answer) {
		var obs = ko.observable(null);
		ko.computed(function() {
			var choice = parseInt(obs());
			p.storeAnswer([answer,choice]);
		},p);
		return obs;
	}
	function makeCheckboxTicker(answer,choice) {
		var obs = ko.observable(false);
		ko.computed(function() {
			p.storeAnswer([answer,choice,obs()]);
		});
		return obs;
	}

	switch(p.type) {
	case '1_n_2':
		this.studentAnswer = ko.observable(null);

		ko.computed(function() {
			var i = parseInt(this.studentAnswer());
			p.storeAnswer([i,0]);
		},this);

		var max = 0, maxi = -1;
		for(var i=0;i<p.numAnswers;i++) {
			if(p.settings.matrix[i][0]>max || maxi==-1) {
				max = p.settings.matrix[i][0];
				maxi = i;
			}
		}
		this.correctAnswer = ko.observable(maxi);

		break;
	case 'm_n_2':
		this.ticks = [];
		this.correctTicks = [];
		for(var i=0; i<p.numAnswers; i++) {
			this.ticks[i] = makeTicker(i,0);
			this.correctTicks[i] = p.settings.matrix[i][0]>0;
		}
		break;
	case 'm_n_x':
		switch(p.settings.displayType) {
		case 'radiogroup':
			this.ticks = [];
			this.correctTicks = [];
			for(var i=0; i<p.numAnswers; i++) {
				this.ticks.push(makeRadioTicker(i));
				var maxj=-1,max=0;
				for(var j=0;j<p.numChoices; j++) {
					if(maxj==-1 || p.settings.matrix[i][j]>max) {
						maxj = j;
						max = p.settings.matrix[i][j];
					}
				}
				this.correctTicks.push(maxj);
			}
			break;
		case 'checkbox':
			this.ticks = [];
			this.correctTicks = [];
			for(var i=0; i<p.numAnswers; i++) {
				var row = [];
				this.ticks.push(row);
				var correctRow = [];
				this.correctTicks.push(correctRow);
				for(var j=0; j<p.numChoices; j++) {
					row.push(makeCheckboxTicker(i,j));
					correctRow.push(p.settings.matrix[i][j]>0);
				}
			}
			break;
		}
		break;
	}
}
display.MultipleResponsePartDisplay.prototype =
{
	restoreAnswer: function()
	{
		var part = this.part;
		switch(part.type) {
		case '1_n_2':
			for(var i=0;i<part.numAnswers; i++) {
				if(part.ticks[i][0])
					this.studentAnswer(i);
			}
			break;
		case 'm_n_2':
			for(var i=0; i<part.numAnswers; i++) {
				this.ticks[i](part.ticks[i][0]);
			}
			break;
		case 'm_n_x':
			for(var i=0; i<part.numAnswers; i++) {
				for(var j=0; j<part.numChoices; j++) {
					this.ticks[i][j](part.ticks[i][j]);
				}
			}
			break;
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
		for(var i=0;i<this.part.gaps.length; i++)
			this.part.gaps[i].display.show();
	},

	restoreAnswer: function()
	{
		for(var i=0;i<this.part.gaps.length; i++)
			this.part.gaps[i].display.restoreAnswer();
	},

	revealAnswer: function()
	{
	}
};
display.GapFillPartDisplay = extend(display.PartDisplay,display.GapFillPartDisplay,true);

display.InformationPartDisplay = function()
{
}
display.InformationPartDisplay = extend(display.PartDisplay,display.InformationPartDisplay,true);


//get size of contents of an input
//from http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
$.textMetrics = function(el) {
	var h = 0, w = 0;

	var div = document.createElement('div');
	document.body.appendChild(div);
	$(div).css({
		position: 'absolute',
		left: -1000,
		top: -1000,
		display: 'none'
	});

	var val = $(el).val();
	val = val.replace(/ /g,'&nbsp;');
	$(div).html(val);
	var styles = ['font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing'];
	$(styles).each(function() {
		var s = this.toString();
		$(div).css(s, $(el).css(s));
	});

	h = $(div).outerHeight();
	w = $(div).outerWidth();

	$(div).remove();

	var ret = {
	 height: h,
	 width: w
	};

	return ret;
}

//update a score feedback box
//selector - jQuery selector of element to update
//score - student's score
//marks - total marks available
//settings - object containing the following properties:
//	showTotalMark
//	showActualMark
//	showAnswerState
function showScoreFeedback(obj,settings)
{
	var niceNumber = Numbas.math.niceNumber;
	var scoreDisplay = '';

	var newScore = ko.observable(false);

	return {
		update: ko.computed({
			read: function() {
				return newScore();
			},
			write: function() {
				newScore(!newScore());
			}
		}),
		message: ko.computed(function() {
			var answered = obj.answered(), score = obj.score(), marks = obj.marks();
			answered = answered || score>0;

			var scoreobj = {
				marks: niceNumber(marks),
				score: niceNumber(score),
				marksString: niceNumber(marks)+' '+util.pluralise(marks,R('mark'),R('marks')),
				scoreString: niceNumber(marks)+' '+util.pluralise(marks,R('mark'),R('marks'))
			};
			if(answered && marks>0)
			{
				var str = 'question.score feedback.answered'
							+ (settings.showTotalMark ? ' total' : '')
							+ (settings.showActualMark ? ' actual' : '')
				return R(str,scoreobj);
			}
			else if(settings.showTotalMark) {
				return R('question.score feedback.unanswered total',scoreobj);
			}
			else
				return '';
		}),
		state: ko.computed(function() {
			var answered = obj.answered(), revealed = obj.revealed(), score = obj.score(), marks = obj.marks();
			answered = answered || score>0;

			if( settings.showAnswerState && (answered||revealed) && marks>0 ) {
				if(score<=0)
					return 'icon-remove';
				else if(score==marks)
					return 'icon-ok';
				else
					return 'icon-ok partial';
			}
			else {
				return 'none';
			}
		})
	}
};

function scrollTo(el)
{
	if(!(el).length)
		return;
	var docTop = $(window).scrollTop();
	var docBottom = docTop + $(window).height();
	var elemTop = $(el).offset().top;
	if((elemTop-docTop < 50) || (elemTop>docBottom-50))
		$('html,body').animate({scrollTop: $(el).offset().top-50 });
}

//make a carousel out of a div containing a list
var makeCarousel = Numbas.display.makeCarousel = function(elem,options) {
	options = $.extend({
		prevBtn: null,
		nextBtn: null,
		speed: 200,
		step: 1
	}, options || {});

	var div = $(elem);
	var current = div.find('li:first');
	var going = false;
	var nextScroll = null;

	function scrollTo(i)
	{
		nextScroll = i;
		if(going)
			return;
		try {
			var listOffset = div.find('ul,ol').position().top;
			var listHeight = div.find('ul,ol').height();
		} catch(e) {
			return;
		}

		var lis = div.find('li');
		var divHeight = div.height();
		var maxI = 0;
		for(var j=0;j<lis.length;j++)
		{
			var y = lis.eq(j).position().top - listOffset;
			if(listHeight - y < divHeight)
			{
				maxI = j;
				break;
			}
		}
		i = Math.max(Math.min(i,maxI),0);

		var ocurrent = current;
		current = div.find('li').eq(i);
		var itemOffset = current.position().top - listOffset;
		if(itemOffset != div.scrollTop() && ocurrent != current)
		{
			going = true;
			nextScroll = null;
			div.animate({scrollTop: itemOffset},{
				duration: options.speed,
				complete: function() { 
					going = false;
					if(nextScroll != null)
						scrollTo(nextScroll);
				} 
			});
		}
	}

	function scrollUp() {
		var i = div.find('li').index(current) || 0;
		if(nextScroll!==null)
			i = Math.min(i,nextScroll);
		i = Math.max(i-options.step, 0);
		scrollTo(i);
	}
	function scrollDown() {
		var lis = div.find('li');
		var i = lis.index(current) || 0;
		if(nextScroll!==null)
			i = Math.max(i,nextScroll);
		i = Math.min(i+options.step,lis.length-1);
		scrollTo(i);
	}

	$(options.prevBtn).click(scrollUp);
	$(options.nextBtn).click(scrollDown);
	div.mousewheel(function(e,d) {
		d > 0 ? scrollUp() : scrollDown();
		return false;
	});

	return scrollTo;
};


});

