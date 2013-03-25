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
		ko.bindingHandlers.html.update(element,valueAccessor);
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

			if(display.inInput || $('#jqibox').is(':visible'))
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
		$.prompt(msg,{overlayspeed: 'fast', buttons:{Ok:true,Cancel:false},callback: function(val){ val ? fnOK() : fnCancel(); }});
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


	this.examScoreDisplay = ko.observable('');
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

		var niceNumber = Numbas.math.niceNumber;

		var totalExamScoreDisplay = '';
		if(exam.settings.showTotalMark)
			totalExamScoreDisplay = niceNumber(exam.score)+'/'+niceNumber(exam.mark);
		else
			totalExamScoreDisplay = niceNumber(exam.score);

		this.examScoreDisplay(totalExamScoreDisplay);
	},

	updateQuestionMenu: function()
	{
		var exam = this.exam;
		//highlight current question, unhighlight the rest
		for(var j=0; j<exam.questionList.length; j++)
		{
			var question = exam.questionList[j];
			$(question.display.questionSelector).attr('class',
					(question.visited || exam.settings.navigateBrowse ? 'questionSelector' : 'questionSelector-hidden')+(j==exam.currentQuestion.number ? ' qs-selected' : ''));
		}
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

	this.adviceDisplayed = ko.observable(false);

	this.getPart = function(path) {
		return q.getPart(path).display;
	}

	this.displayName = ko.observable(R('question.header',q.number+1));

	this.score = ko.observable(q.score);
	this.marks = ko.observable(q.marks);
	this.answered = ko.observable(q.answered);
	this.scoreFeedback = showScoreFeedback(this,q.exam.settings);
	this.anyAnswered = ko.observable(false);
}
display.QuestionDisplay.prototype =
{
	q: undefined,					//reference back to the main question object
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

		//display question's html
		$('#questionDisplay').append(this.html);
		ko.applyBindings(this,this.html[0]);

		
		//update the question menu - highlight this question, etc.
		exam.display.updateQuestionMenu();

		switch(exam.mode) {
		case 'normal':
			//enable the submit button
			$('#submitBtn').removeAttr('disabled');

			var submitMsg = R(q.parts.length<=1 ? 'control.submit answer' : 'control.submit all parts');
			$('.navBar #submitBtn').html(submitMsg);

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

		//update question name box in nav bar
		
		//display advice if appropriate
		this.showAdvice();

		//show correct answers if appropriate
		this.revealAnswer();
		
		//display score if appropriate
		this.showScore();
		
		//make input elements report when they get and lose focus
		$('input')	.blur( function(e) { Numbas.display.inInput = false; } )
					.focus( function(e) { Numbas.display.inInput = true; } );

		//resize text inputs to just fit their contents
		$('input[type=text],input[type=number]').keyup(resizeF).keydown(resizeF).change(resizeF).each(resizeF);

		//make sure 'input' event is triggered when inputs change
		$('input').bind('propertychange',function(){$(this).trigger('input')});

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

	addPostTypesetCallback: function(callback)
	{
		var f = this.postTypesetF;
		this.postTypesetF = function() {
			callback();
			f();
		}
	},

	//display Advice
	showAdvice: function( fromButton )
	{
		this.adviceDisplayed(this.question.adviceDisplayed);

		if( this.question.adviceDisplayed )
		{
			$('#adviceBtn').attr('disabled','true');

			//if advice text non-empty, show it and typeset maths
			if($.trim($('#adviceDisplay').text()))
			{
				$('#adviceContainer').show();			
				if(fromButton)
				{
					Numbas.display.typeset();
				}
			}else	//otherwise hide the advice box if it's empty
			{
				$('#adviceContainer').hide();
			}
		}
		else
		{
			$('#adviceContainer').hide();
			$('#adviceBtn').removeAttr('disabled');
		}	
	},

	revealAnswer: function()
	{
		if(!this.question.revealed)
			return;

		//disable submit button
		$('#submitBtn').attr('disabled','true');
		//hide reveal button
		$('#revealBtn').hide();

		for(var i=0;i<this.question.parts.length;i++)
		{
			this.question.parts[i].display.revealAnswer();
		}
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

		if(!exam.settings.showTotalMark && !exam.settings.showActualMark)
		{
			selector.find('#submitBtn').html(R(q.answered ? 'control.submit again' : 'control.submit'));
		}
		var anyAnswered = false;
		for(var i=0;i<q.parts.length;i++)
		{
			anyAnswered |= q.parts[i].answered;
		}
		this.anyAnswered(anyAnswered);
	},

	scrollToError: function() {
		scrollTo($('.warningcontainer:visible:first'));
	}
};

var extend = Numbas.util.extend;

//display methods for question parts
display.PartDisplay = function(p)
{
	var pd = this;
	this.part = p;
	this.warningDiv = '#warning-'+p.path;

	this.submit = function() {
		p.display.removeWarnings();
		p.submit();
		if(!p.answered)
		{
			Numbas.display.showAlert(R('question.can not submit'));
			scrollTo(p.display.htmlContext().find('.warningcontainer:visible:first'));
		}
		Numbas.store.save();
	}

	this.score = ko.observable(p.score);
	this.marks = ko.observable(p.marks);
	this.answered = ko.observable(p.answered);
	this.scoreFeedback = showScoreFeedback(this,p.question.exam.settings);

	this.feedbackShown = ko.observable(false);
	this.feedbackMessages = ko.observableArray([]);
	this.showFeedbackToggler = ko.computed(function() {
		return p.question.exam.settings.showAnswerState && pd.feedbackMessages().length;
	});

	this.stepsShown = ko.observable(p.stepsShown);

	this.toggleFeedback = function() {
		pd.feedbackShown(!pd.feedbackShown());
	}
}
display.PartDisplay.prototype = 
{
	p: undefined,	//reference back to main part object

	warningDiv:'',	//id of div where warning messages are displayed

	warning: function(warning)
	{
		$(this.warningDiv).show().find('.partwarning').append('<span>'+warning.toString()+'</span>');
		Numbas.display.typeset();
	},

	//remove all previously displayed warnings
	removeWarnings: function()
	{
		$(this.warningDiv).hide().find('.partwarning').html('');
	},

	//returns a jquery selector for the HTML div containing this part's things
	htmlContext: function()
	{
		s = $(this.part.question.display.html).find('#'+this.part.path);
		return s;
	},

	answerContext: function()
	{
		return this.htmlContext().find('#answer-'+this.part.path);
	},

	//called when part is displayed (basically when question is changed)
	//show steps if appropriate, restore answers
	show: function()
	{
		var p = this.part;
		var c = this.htmlContext();

		$(this.warningDiv)
			.mouseover(function(){
				$(this).find('.partwarning').show();
			})
			.mouseout(function(){
				$(this).find('.partwarning').hide()
			});

		var feedbackShown = false;
		c.find('#feedbackMessage:last').hide();

		this.showScore(this.part.answered);
	},

	//update 
	showScore: function(valid)
	{
		var c = this.htmlContext();
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
				var feedback = [];
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
						feedback.push(message);
				}
				
				this.feedbackMessages(feedback);
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
		this.answerContext().find('input[type=text]').each(resizeF);
	},

	//fills inputs with correct answers
	revealAnswer: function() 
	{
		var c = this.htmlContext();
		this.removeWarnings();
		c.find('input[type=text],input[type=number]').each(resizeF);
		c.find('#submitPart').attr('disabled',true);
		this.showScore();
	}
};

//JME display code
display.JMEPartDisplay = function()
{
}
display.JMEPartDisplay.prototype =
{
	timer: undefined,		//timer for the live preview
	txt: '',
	oldtxt: '',				//last displayed preview
	oldtex: '',
	hasFocus: false,
	validEntry: true,
	showAnyway: true,

	show: function()
	{
		var pd = this;
		var p = this.part;
		var hc = this.htmlContext();
		var ac = this.answerContext();
		var previewDiv = ac.find('#preview');
		var inputDiv = ac.find('#jme');
		var errorSpan = hc.find('#warning-'+p.path);

		this.hasFocus = false;
		this.validEntry = true;
		this.txt = this.part.stagedAnswer[0]; this.oldtxt = '';


		var keyPressed = function()
		{
			pd.inputChanged(inputDiv.val());
		};

		//when student types in input box, update display
		inputDiv.bind('input',function() {
			if(pd.timer!=undefined)
				return;

			clearTimeout(pd.timer);


			pd.timer = setTimeout(keyPressed,100);
		});

		//when input box loses focus, hide it
		inputDiv.blur(function() {
			Numbas.controls.doPart([this.value],p.path);
		});

		this.oldtxt='';
		this.inputChanged(this.part.stagedAnswer[0],true);

		previewDiv.click(function() {
			inputDiv.focus();
		});
	},

	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#jme').val(this.part.studentAnswer);
	},

	revealAnswer: function() 
	{
		var c = this.answerContext();
		c.find('#jme')
			.attr('disabled','true')
			.val(this.part.settings.correctAnswer);
		this.inputChanged(this.part.settings.correctAnswer,true);
		c.find('#preview').css('color','#555')
						  .mouseout();			//for some reason just hiding the input doesn't work, so simulate a mouseout to do the same thing
	},
	
	//display a live preview of the student's answer typeset properly
	inputChanged: function(txt,force)
	{
		if((txt!=this.oldtxt && txt!==undefined) || force)
		{
			this.part.storeAnswer([txt]);
			this.txt = txt;

			this.removeWarnings();
			var ac = this.answerContext();
			var previewDiv = ac.find('#preview');
			var inputDiv = ac.find('#jme');
			var errorSpan = this.htmlContext().find('#warning-'+this.part.path);
			if(txt!=='')
			{
				try {
					var tex = Numbas.jme.display.exprToLaTeX(txt,this.part.settings.displaySimplification,this.part.question.scope);
					if(tex===undefined){throw(new Numbas.Error('display.part.jme.error making maths'))};
					previewDiv.show().html('$'+tex+'$');
					var pp = this;
					Numbas.display.typeset(previewDiv);
					this.validEntry = true;
					this.oldtex = tex;
				}
				catch(e) {
					this.validEntry = false;
					this.warning(e);
					previewDiv.hide().html('');
				}
			}
			else
			{
				previewDiv.html('').hide();
				this.oldtex='';
				this.validEntry = true;
			}
			this.oldtxt = txt;
		}
		this.timer=undefined;
	}
};
display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);

//Pattern Match display code
display.PatternMatchPartDisplay = function()
{
}
display.PatternMatchPartDisplay.prototype = 
{
	show: function()
	{
		var c = this.answerContext();
		var p = this.part;
		c.find('#patternmatch').bind('input',function() {
			p.storeAnswer([$(this).val()]);
		});
	},

	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#patternmatch').val(this.part.studentAnswer);
	},

	revealAnswer: function()
	{
		var c = this.answerContext();
		c.find('#patternmatch')
			.attr('disabled',true)
			.val(this.part.settings.displayAnswer);
	}
};
display.PatternMatchPartDisplay = extend(display.PartDisplay,display.PatternMatchPartDisplay,true);

//Number Entry display code
display.NumberEntryPartDisplay = function()
{
}
display.NumberEntryPartDisplay.prototype =
{
	show: function() {
		var p = this.part;
		this.answerContext().find('#numberentry').bind('input',function(){
			p.storeAnswer([$(this).val()]);
		});
	},

	restoreAnswer: function()
	{
		var c = this.answerContext();
		c.find('#numberentry').val(this.part.studentAnswer);
	},

	revealAnswer: function()
	{
		var c = this.answerContext();
		c.find('#numberentry')
			.attr('disabled','true')
			.val(this.part.settings.displayAnswer);
	}
};
display.NumberEntryPartDisplay = extend(display.PartDisplay,display.NumberEntryPartDisplay,true);


//Multiple Response display code
display.MultipleResponsePartDisplay = function()
{
}
display.MultipleResponsePartDisplay.prototype =
{
	show: function()
	{
		var p = this.part;
		var c = this.htmlContext();

		function makeClicker(choice,answer)
		{
			return function() {
				p.storeAnswer([choice,answer,$(this).prop('checked')]);
			};
		}

		switch(p.settings.displayType)
		{
		case 'dropdownlist':
			c.find('.multiplechoice').bind('change',function() {
				var i = $(this).find('option:selected').index();
				p.storeAnswer([i-1,0]);
			});
			break;
		default:
			for(var i=0; i<p.numAnswers; i++)
			{
				for(var j=0; j<p.numChoices; j++)
				{
					c.find('#choice-'+j+'-'+i).change(makeClicker(i,j));
				}
			}
		}

	},
	restoreAnswer: function()
	{
		var c = this.htmlContext();
		for(var i=0; i<this.part.numChoices; i++)
		{
			for(var j=0; j<this.part.numAnswers; j++)
			{
				var checked = this.part.ticks[j][i];
				c.find('#choice-'+i+'-'+j).prop('checked',checked);
			}
		}
	},

	revealAnswer: function()
	{
		switch(this.part.settings.displayType)
		{
		case 'radiogroup':
		case 'checkbox':
			//tick a response if it has positive marks
			var c = this.answerContext();
			for(var j=0; j<this.part.numAnswers; j++)
			{
				for(var i=0; i<this.part.numChoices; i++)
				{
					var checked = this.part.settings.matrix[j][i]>0;
					c.find('#choice-'+i+'-'+j)
						.attr('disabled',true)
						.prop('checked',checked);
				}
			}
			break;
		case 'dropdownlist':
			var bigscore=0;
			for(var i=0;i<this.part.numAnswers;i++)
			{
				if(this.part.settings.matrix[i][0] > bigscore)
				{
					bigscore = this.part.settings.matrix[i][0];
					$(this.answerContext().find('option')[i]).attr('selected','true');
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
		for(var i=0; i<this.part.gaps.length; i++)
			this.part.gaps[i].display.revealAnswer();
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

function resizeF() {
	var w = $.textMetrics(this).width;
	$(this).width(Math.max(w+30,60)+'px');
};

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
			var answered = obj.answered(), score = obj.score(), marks = obj.marks();
			answered = answered || score>0;

			if( settings.showAnswerState && answered && marks>0 ) {
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

