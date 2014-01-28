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

Numbas.queueScript('display',['controls','math','xml','util','timing','jme','jme-display'],function() {
	
	var util = Numbas.util;
	var jme = Numbas.jme;

	var MathJaxQueue = MathJax.Callback.Queue(MathJax.Hub.Register.StartupHook('End',{}));

	MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {

		var TEX = MathJax.InputJax.TeX;
		var currentScope = null;

		TEX.prefilterHooks.Add(function(data) {
			currentScope = $(data.script).parents('.jme-scope').first().data('jme-scope');
		});

		TEX.Definitions.Add({macros: {
			'var': 'JMEvar', 
			'simplify': 'JMEsimplify'
		}});

		TEX.Parse.Augment({
			JMEvar: function(name) {
				var expr = this.GetArgument(name);
				var scope = currentScope;

				var v = jme.evaluate(jme.compile(expr,scope),scope);

				var tex = jme.display.texify({tok: v});
				var mml = TEX.Parse(tex,this.stack.env).mml();

				this.Push(mml);
			},

			JMEsimplify: function(name) {
				var rules = this.GetBrackets(name);
				if(rules===undefined)
					rules = 'all';
				var expr = this.GetArgument(name);

				var scope = currentScope;
				expr = jme.subvars(expr,scope);

				var tex = jme.display.exprToLaTeX(expr,rules,scope);
				var mml = TEX.Parse(tex,this.stack.env).mml();

				this.Push(mml);
			}
		})
	});

function resizeF() {
	var w = $.textMetrics(this).width;
	$(this).width(Math.max(w+30,60)+'px');
};

ko.bin

ko.bindingHandlers.horizontalSlideVisible = {
	init: function(element, valueAccessor) {
		var containerWidth = $(element).width();
		ko.utils.domData.set(element,'originalWidth',containerWidth);
		$(element).css({display:'inline-block', 'overflow-x': 'hidden'});

		var buttonWidth = $(element).children().outerWidth();
		$(element).children().css({width:buttonWidth});
	},
	update: function(element, valueAccessor) {
		var value = ko.utils.unwrapObservable(valueAccessor());
		var originalWidth = ko.utils.domData.get(element,'originalWidth');

		$(element).animate({width: value ? originalWidth : 0}, 1000);
	}
}

ko.bindingHandlers.niceNumber = {
	update: function(element,valueAccessor) {
		var n = ko.utils.unwrapObservable(valueAccessor());
		$(element).text(Numbas.math.niceNumber(n));
	}
}

ko.bindingHandlers.autosize = {
	init: function(element) {
		//resize text inputs to just fit their contents
		$(element).keyup(resizeF).keydown(resizeF).change(resizeF).each(resizeF);
		resizeF.apply(element);
	},
	update: function(element) {
		resizeF.apply(element);
	}
}

ko.bindingHandlers.test = {
	update: function(element,valueAccessor) {
		console.log(ko.utils.unwrapObservable(valueAccessor()));
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
			$(element).stop().slideDown('fast');
		else
			$(element).stop().slideUp('fast');
	}
}

ko.bindingHandlers.fadeVisible = {
	init: function(element,valueAccessor) {
		var v = ko.utils.unwrapObservable(valueAccessor());
		$(element).toggle(v);
	},
		
	update: function(element,valueAccessor) {
		var v = ko.utils.unwrapObservable(valueAccessor());
		if(v)
			$(element).stop().fadeIn();
		else
			$(element).stop().fadeOut();
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
		$(element).html('<script type="math/tex">'+val+'</script>');
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

ko.bindingHandlers.visible = {
	init: function(element,valueAccessor) {
		$(element).css('display','');
	},
	update: function(element,valueAccessor) {
		var val = ko.unwrap(valueAccessor());
		$(element).toggleClass('invisible',!val);
	}
}

ko.bindingHandlers.visibleIf = {
	init: function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var val = ko.utils.unwrapObservable(valueAccessor());
		$(element).toggle(val);
		if(val)
			ko.applyBindingsToDescendants(bindingContext,element);

		return {controlsDescendantBindings: true};
	},
	update:function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var val = ko.utils.unwrapObservable(valueAccessor());
		$(element).toggle(val);
		if(val)
			ko.applyBindingsToDescendants(bindingContext,element);
	}
}

ko.bindingHandlers.stopbinding = {
	init: function() {
		return {controlsDescendantBindings: true};
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
		for(var i=0;i<Numbas.exam.questionList.length;i++) {
			Numbas.exam.display.applyQuestionBindings(Numbas.exam.questionList[i]);
		}

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
		Numbas.exam.display.questions().map(function(q) {
			q.init();
		});
	},

	// does an input element currently have focus?
	inInput: false,

	//alert / confirm boxes
	//

	showAlert: function(msg,fnOK) {
		fnOK = fnOK || function() {};
		$.prompt(msg,{overlayspeed: 'fast', close: function() {
			fnOK();
		}});
	},

	showConfirm: function(msg,fnOK,fnCancel) {
		fnOK = fnOK || function(){};
		fnCancel = fnCancel || function(){};

		$.prompt(msg,{overlayspeed: 'fast', buttons:{Ok:true,Cancel:false},submit: function(e,val){
				val ? fnOK() : fnCancel(); 
		}});
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

	this.mode = ko.observable(e.mode);
	
	this.saving = ko.observable(false);

	this.infoPage = ko.observable(null);
	this.currentQuestion = ko.observable(null);
	this.currentQuestionNumber = ko.computed(function() {
		var q = this.currentQuestion();
		if(q)
			return q.question.number;
		else
			return null;
	},this);
	this.questions = ko.observableArray([]);

	this.canReverse = ko.computed(function() {
		return this.exam.settings.navigateReverse && this.currentQuestionNumber()>0;
	},this);
	this.canAdvance = ko.computed(function() {
		return this.currentQuestionNumber()<this.exam.settings.numQuestions-1;
	},this);


	this.score = ko.observable(e.score);
	this.marks = ko.observable(e.mark);
	this.percentPass = ko.observable(e.settings.percentPass*100+'%');
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

		return totalExamScoreDisplay;
	},this);
	this.percentScore = ko.observable(0);

	this.displayTime = ko.observable('');
	this.timeSpent = ko.observable('');
	this.allowPause = e.settings.allowPause;

	this.questionsAttempted = ko.computed(function() {
		return this.questions().reduce(function(s,q) { 
			return s + (q.answered() ? 1 : 0); 
		},0);
	},this);
	this.questionsAttemptedDisplay = ko.computed(function() {
		return this.questionsAttempted()+' / '+this.exam.settings.numQuestions;
	},this);

	this.result = ko.observable('');

	document.title = e.settings.name;

}
display.ExamDisplay.prototype = 
{
	exam: undefined,	//reference to main exam object

	showTiming: function()
	{
		this.displayTime(R('timing.time remaining',Numbas.timing.secsToDisplayTime(this.exam.timeRemaining)));
		this.timeSpent(Numbas.timing.secsToDisplayTime(this.exam.timeSpent));
	},

	initQuestionList: function() {
		for(var i=0; i<this.exam.questionList.length; i++) {
			this.questions.push(this.exam.questionList[i].display);
		}
	},

	hideTiming: function()
	{
		this.displayTime('');
	},

	showScore: function()
	{
		var exam = this.exam;
		this.marks(Numbas.math.niceNumber(exam.mark));
		this.score(Numbas.math.niceNumber(exam.score));
		this.percentScore(exam.percentScore);
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
			this.marks(exam.mark);

			break;

		case "result":
			this.result(exam.result);
			
			break;

		case "suspend":
			this.showScore();

			break;
		
		case "exit":
			break;
		}
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
		this.exam.currentQuestion.display.html.remove();
		this.oldQuestion = this.exam.currentQuestion.display;
	},
	
	endRegen: function() {
		var currentQuestion = this.exam.currentQuestion;
		this.questions.splice(currentQuestion.number,1,currentQuestion.display);
		this.applyQuestionBindings(currentQuestion);
		$('#questionDisplay').fadeIn(200);
	},

	applyQuestionBindings: function(question) {
		ko.applyBindings({exam: this, question: question.display},question.display.html[0]);
	},

	end: function() {
		this.mode(this.exam.mode);
		this.questions().map(function(q) {
			q.end();
		});
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

	this.isDirty = ko.observable(false);

	this.canReveal = ko.computed(function() {
		return exam.settings.allowRevealAnswer && !this.revealed();
	},this);


	this.scoreFeedback = showScoreFeedback(this,q.exam.settings);

	this.review = function() {
		exam.reviewQuestion(q.number);
	}
}
display.QuestionDisplay.prototype =
{
	question: undefined,			//reference back to the main question object
	html: '',						//HTML for displaying question

	makeHTML: function() {
		var q = this.question;
		var qd = this;
		var html = this.html = $($.xsl.transform(Numbas.xml.templates.question, q.xml).string);
		html.addClass('jme-scope').data('jme-scope',q.scope);
		$('#questionDisplay').append(html);

		qd.css = $('<style type="text/css">').text(q.preamble.css);

		Numbas.schedule.add(function()
		{
			html.each(function(e) {
				Numbas.jme.variables.DOMcontentsubvars(this,q.scope);
			})

			$('body').trigger('question-html-attached',q,qd);
			$('body').unbind('question-html-attached');

			// make mathjax process the question text (render the maths)
			Numbas.display.typeset(this.html,this.postTypesetF);
		});
	},

	show: function()
	{
		var q = this.question;
		var qd = this;
		var exam = q.exam;

		this.html.append(this.css);

		this.visited(q.visited);

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
		Numbas.display.typeset(this.html,this.postTypesetF);
	},

	leave: function() {
		this.css.remove();
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
		scroll(0,0);
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
	},

	init: function() {
		var q = this.question;
		for(var i=0;i<q.parts.length;i++)
		{
			q.parts[i].display.init();
		}
	},

	end: function() {
		var q = this.question;
		for(var i=0;i<q.parts.length;i++)
		{
			q.parts[i].display.end();
		}
	}
};

var extend = Numbas.util.extend;

//display methods for question parts
display.PartDisplay = function(p)
{
	var pd = this;
	this.part = p;
	this.question = p.question;

	this.score = ko.observable(p.score);
	this.marks = ko.observable(p.marks);
	this.answered = ko.observable(p.answered);

	this.isDirty = ko.observable(false);

	this.warnings = ko.observableArray([]);
	this.warningsShown = ko.observable(false);

	this.showWarnings = function() {
		this.warningsShown(true);
	}
	this.hideWarnings = function() {
		this.warningsShown(false);
	}

	this.feedbackShown = ko.observable(false);
	this.toggleFeedbackText = ko.computed(function() {
		return R(this.feedbackShown() ? 'question.score feedback.hide' : 'question.score feedback.show');
	},this);
	this.feedbackMessages = ko.observableArray([]);
	this.showFeedbackToggler = ko.computed(function() {
		return p.question.exam.settings.showAnswerState && pd.feedbackMessages().length;
	});

	this.stepsShown = ko.observable(p.stepsShown);
	this.stepsOpen = ko.observable(p.stepsOpen);
	this.stepsPenaltyMessage = ko.computed(function() {
		if(this.stepsOpen())
			return R('question.hide steps no penalty');
		else if(this.part.settings.stepsPenalty==0)
			return R('question.show steps no penalty');
		else if(this.stepsShown())
			return R('question.show steps already penalised');
		else
			return R('question.show steps penalty',Numbas.math.niceNumber(this.part.settings.stepsPenalty),util.pluralise(this.part.settings.stepsPenalty,R('mark'),R('marks')));
	},this);

	this.revealed = ko.observable(false);

	this.scoreFeedback = showScoreFeedback(this,p.question.exam.settings);

	this.controls = {
		toggleFeedback: function() {
			pd.feedbackShown(!pd.feedbackShown());
		},
		submit: function() {
			var np = p;
			while(np.isGap)
				np = np.parentPart;
			np.display.removeWarnings();
			np.submit();
			if(!np.answered)
			{
				Numbas.display.showAlert(R('question.can not submit'));
			}
			Numbas.store.save();
		},
		showSteps: function() {
			p.showSteps();
		},
		hideSteps: function() {
			p.hideSteps();
		}
	}
	this.inputEvents = {
		keypress: function(context,e) {
			if(e.which==13) {
				pd.controls.submit();
			}
			else
				return true;
		}
	}
}
display.PartDisplay.prototype = 
{
	part: undefined,	//reference back to main part object

	warning: function(warning)
	{
		this.warnings.push({message:warning+''});
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
		this.stepsOpen(this.part.stepsOpen);

		for(var i=0;i<this.part.steps.length;i++)
		{
			this.part.steps[i].display.show();
		}
	},

	hideSteps: function()
	{
		this.stepsOpen(this.part.stepsOpen);
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
	},

	init: function() {
		this.part.setDirty(false);
		for(var i=0;i<this.part.steps.length;i++) {
			this.part.steps[i].display.init();
		}
	},

	end: function() {
		this.restoreAnswer();
		for(var i=0;i<this.part.steps.length;i++) {
			this.part.steps[i].display.end();
		}
	}
};

//JME display code
display.JMEPartDisplay = function()
{
	var p = this.part;
	this.studentAnswer = ko.observable('');
	this.correctAnswer = p.settings.correctAnswer;
	this.showPreview = p.settings.showPreview;
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

		}
		catch(e) {
			this.warning(e);
			return '';
		}

		if(p.settings.checkVariableNames) {
			var tree = Numbas.jme.compile(studentAnswer,p.question.scope);
			var usedvars = Numbas.jme.findvars(tree);
			var failExpectedVariableNames = false;
			var unexpectedVariableName;
			for(var i=0;i<usedvars.length;i++) {
				if(!p.settings.expectedVariableNames.contains(usedvars[i])) {
					failExpectedVariableNames = true;
					unexpectedVariableName = usedvars[i];
					break;
				}
			}
			if( failExpectedVariableNames ) {
				var suggestedNames = unexpectedVariableName.split(Numbas.jme.re.re_short_name);
				if(suggestedNames.length>3) {
					var suggestion = [];
					for(var i=1;i<suggestedNames.length;i+=2) {
						suggestion.push(suggestedNames[i]);
					}
					suggestion = suggestion.join('*');
					this.warning(R('part.jme.unexpected variable name suggestion',unexpectedVariableName,suggestion));
				}
				else
					this.warning(R('part.jme.unexpected variable name', unexpectedVariableName));
			}
		}

		return tex;
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
	this.displayAnswer = ko.observable(p.settings.displayAnswer);

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
		var obs = ko.observable(p.ticks[answer][choice]);
		ko.computed(function() {
			p.storeAnswer([answer,choice,obs()]);
		},p);
		return obs;
	}

	function makeRadioTicker(choice) {
		var obs = ko.observable(null);
		for(var i=0;i<p.numAnswers;i++) {
			if(p.ticks[i][choice])
				obs(i);
		}
		ko.computed(function() {
			var answer = parseInt(obs());
			p.storeAnswer([answer,choice]);
		},p);
		return obs;
	}
	function makeCheckboxTicker(answer,choice) {
		var obs = ko.observable(p.ticks[answer][choice]);
		ko.computed(function() {
			p.storeAnswer([answer,choice,obs()]);
		});
		return obs;
	}

	switch(p.type) {
	case '1_n_2':
		this.studentAnswer = ko.observable(null);
		for(var i=0;i<p.numAnswers;i++) {
			if(p.ticks[i][0])
				this.studentAnswer(i);
		}

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
			for(var i=0; i<p.numChoices; i++) {
				this.ticks.push(makeRadioTicker(i));
				var maxj=-1,max=0;
				for(var j=0;j<p.numAnswers; j++) {
					if(maxj==-1 || p.settings.matrix[j][i]>max) {
						maxj = j;
						max = p.settings.matrix[j][i];
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
			this.studentAnswer(null);
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
			switch(part.settings.displayType) {
			case 'radiogroup':
				for(var i=0; i<part.numAnswers; i++) {
					for(var j=0; j<part.numChoices; j++) {
						if(part.ticks[i][j]) {
							this.ticks[j](i);
						}
					}
				}
				break;
			case 'checkbox':
				for(var i=0; i<part.numAnswers; i++) {
					for(var j=0; j<part.numChoices; j++) {
						this.ticks[i][j](part.ticks[i][j]);
					}
				}
				break;
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
	},

	init: function() {
		for(var i=0;i<this.part.gaps.length; i++)
			this.part.gaps[i].display.init();
	},

	end: function() {
		for(var i=0;i<this.part.gaps.length; i++)
			this.part.gaps[i].display.end();
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

	var state = ko.computed(function() {
		var answered = obj.answered(), revealed = obj.revealed(), score = obj.score(), marks = obj.marks();
		answered = answered || score>0;

		if( marks>0 && (revealed || (settings.showAnswerState && answered)) ) {
			if(score<=0)
				return 'wrong';
			else if(score==marks)
				return 'correct';
			else
				return 'partial';
		}
		else {
			return 'none';
		}
	});

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
			var answered = obj.answered(), revealed = obj.revealed(), score = obj.score(), marks = obj.marks();
			answered = answered || score>0;

			var scoreobj = {
				marks: niceNumber(marks),
				score: niceNumber(score),
				marksString: niceNumber(marks)+' '+util.pluralise(marks,R('mark'),R('marks')),
				scoreString: niceNumber(marks)+' '+util.pluralise(marks,R('mark'),R('marks'))
			};
			if(revealed && !answered)
				return R('question.score feedback.unanswered');
			else if(answered && marks>0)
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
		iconClass: ko.computed(function() {
			switch(state()) {
			case 'wrong':
				return 'icon-remove';
			case 'correct':
				return 'icon-ok';
			case 'partial':
				return 'icon-ok partial';
			}
		}),
		iconAttr: ko.computed(function() {
			return {title:R('question.score feedback.'+state())};
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

