/*
Copyright 2011-14 Newcastle University

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

/** @file Display code. Provides {@link Numbas.display} */

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

ko.bindingHandlers.realVisible = ko.bindingHandlers.visible;

ko.bindingHandlers.visible = {
	init: function(element,valueAccessor) {
		$(element).css('display','');
		ko.utils.domData.set(element,'tabindex',$(element).attr('tabindex'));
	},
	update: function(element,valueAccessor) {
		var val = ko.unwrap(valueAccessor());
		$(element).toggleClass('invisible',!val);
		$(element).attr('disabled',!val);
		if(val) {
			$(element).attr('tabindex',ko.utils.domData.get(element,'tabindex'));
		}
		else {
			$(element).removeAttr('tabindex');
		}
	}
}

ko.bindingHandlers.visibleIf = {
	init: function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var val = ko.utils.unwrapObservable(valueAccessor());
		if(val && !ko.utils.domData.get(element,'visible-if-happened')) {
			ko.applyBindingsToDescendants(bindingContext,element);
			ko.utils.domData.set(element,'visible-if-happened',true);
		}
		$(element).toggleClass('invisible',!val);
		return {controlsDescendantBindings: true};
	},
	update:function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var val = ko.utils.unwrapObservable(valueAccessor());
		if(val && !ko.utils.domData.get(element,'visible-if-happened')) {
			ko.applyBindingsToDescendants(bindingContext,element);
			ko.utils.domData.set(element,'visible-if-happened',true);
		}
		$(element).toggleClass('invisible',!val);
	}
}

ko.bindingHandlers.stopbinding = {
	init: function() {
		return {controlsDescendantBindings: true};
	}
}

/** @namespace Numbas.display */

var display = Numbas.display = /** @lends Numbas.display */ {

	/** Localise strings in page HTML - for tags with an attribute `data-localise`, run that attribute through R.js to localise it, and replace the tag's HTML with the result
	 */
	localisePage: function() {
		$('[data-localise]').each(function() {
			var localString = R($(this).data('localise'));
			$(this).html(localString);
		})
	},

	/** Update the progress bar when loading
	 */
	showLoadProgress: function()
	{
		var p= 100 * Numbas.schedule.completed / Numbas.schedule.total;
		$('#progressbar #completed').width(p+'%');
	},

	/** Initialise the display. Called as soon as the page loads.
	 */
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

	/** Does an input element currently have focus?
	 * @type {boolean}
	 */
	inInput: false,

	//alert / confirm boxes
	//

	/** Show an alert dialog
	 * @param {string} msg - message to show the user
	 * @param {function} fnOK - callback when OK is clicked
	 */
	showAlert: function(msg,fnOK) {
		fnOK = fnOK || function() {};
		$.prompt(msg,{overlayspeed: 'fast', close: function() {
			fnOK();
		}});
	},

	/** Show a confirmation dialog box
	 * @param {string} msg - message to show the user
	 * @param {function} fnOK - callback if OK is clicked
	 * @param {function} fnCancel - callback if cancelled
	 */
	showConfirm: function(msg,fnOK,fnCancel) {
		fnOK = fnOK || function(){};
		fnCancel = fnCancel || function(){};

		$.prompt(msg,{overlayspeed: 'fast', buttons:{Ok:true,Cancel:false},submit: function(e,val){
				val ? fnOK() : fnCancel(); 
		}});
	},

	/** Make MathJax typeset any maths in the selector
	 * @param {jQuery_selection} [selector] - elements to typeset. If not given, the whole page is typeset
	 * @param {function} callback - function to call when typesetting is finished
	 */
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
	},

	/** The Numbas exam has failed so much it can't continue - show an error message and the error
	 * @param {Error} e
	 */
	die: function(e) {
		//hide all the non-error stuff
		$('.mainDisplay > *,#loading,#everything').hide();

		//show the error stuff
		$('#die').show();

		var message;
		if(e) {
			if(e.stack) {
				message=e.stack.replace(/\n/g,'<br/>\n');
			}
			else {
				message = (e || e.message)+'';
			}
		}
		$('#die .error').html(message);
	}

};

/** Display properties of the {@link Numbas.Exam} object.
 * @name ExamDisplay
 * @memberof Numbas.display
 * @constructor
 * @param {Numbas.Exam} e - associated exam
 * 
 */
display.ExamDisplay = function(e) 
{
	this.exam=e;

	/** The exam's mode ({@link Numbas.Exam#mode})
	 * @member {observable|string} mode
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.mode = ko.observable(e.mode);
	
	/** Is {@link Numbas.store} currently saving?
	 * @member {observable|boolean} saving
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.saving = ko.observable(false);

	/** The name of the currently displayed info page
	 * @member {observable|string} infoPage
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.infoPage = ko.observable(null);

	/** The current question ({@link Numbas.Exam#currentQuestion})
	 * @member {observable|Numbas.Question} currentQuestion
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.currentQuestion = ko.observable(null);

	/** The number of the current question
	 * @member {observable|number} currentQuestionNumber 
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.currentQuestionNumber = ko.computed(function() {
		var q = this.currentQuestion();
		if(q)
			return q.question.number;
		else
			return null;
	},this);

	/** All the exam's question display objects
	 * @member {observable|Numbas.display.QuestionDisplay[]} questions
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.questions = ko.observableArray([]);

	/** Can the student go back to the previous question? (False if the current question is the first one
	 * @member {observable|boolean} canReverse
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.canReverse = ko.computed(function() {
		return this.exam.settings.navigateReverse && this.currentQuestionNumber()>0;
	},this);
	
	/** Can the student go forward to the next question? (False if the current question is the last one)
	 * @member {observable|boolean} canAdvance
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.canAdvance = ko.computed(function() {
		return this.currentQuestionNumber()<this.exam.settings.numQuestions-1;
	},this);

	/** The student's total score ({@link Numbas.Exam#score})
	 * @member {observable|number} score
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.score = ko.observable(e.score);

	/** The total marks available for the exam ({@link Numbas.Exam#mark})
	 * @member {observable|number} marks
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.marks = ko.observable(e.mark);

	/** The percentage score the student needs to achieve to pass ({@link Numbas.Exam#percentPass}), formatted as a string.
	 * @member {observable|string} percentPass
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.percentPass = ko.observable(e.settings.percentPass*100+'%');

	/** String displaying the student's current score, and the total marks available, if allowed
	 * @member {observable|string} examScoreDisplay
	 * @memberof Numbas.display.ExamDisplay
	 */
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

	/** The student's total score as a percentage of the total marks available
	 * @member {observable|number} percentScore
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.percentScore = ko.observable(0);

	/** The time left in the exam
	 * @member {observable|string} displayTime
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.displayTime = ko.observable('');

	/** The total time the student has spent in the exam
	 * @member {observable|string} timeSpent
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.timeSpent = ko.observable('');

	/** Is the student allowed to pause the exam?
	 * @member {boolean} allowPause
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.allowPause = e.settings.allowPause;

	/** Total number of questions the student attempted
	 * @member {observable|number} questionsAttempted
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.questionsAttempted = ko.computed(function() {
		return this.questions().reduce(function(s,q) { 
			return s + (q.answered() ? 1 : 0); 
		},0);
	},this);

	/** Total number of questions the student attempted, formatted as a fraction of the total number of questions
	 * @member {observable|string} questionsAttemptedDisplay
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.questionsAttemptedDisplay = ko.computed(function() {
		return this.questionsAttempted()+' / '+this.exam.settings.numQuestions;
	},this);

	/** The result of the exam - passed or failed?
	 * @member {observable|string} result
	 * @memberof Numbas.display.ExamDisplay
	 */
	this.result = ko.observable('');

	document.title = e.settings.name;

}
display.ExamDisplay.prototype = /** @lends Numbas.display.ExamDisplay.prototype */
{
	/** Reference to the associated exam object
	 * @type {Numbas.Exam}
	 */
	exam: undefined,

	/** Update the timer */
	showTiming: function()
	{
		this.displayTime(R('timing.time remaining',Numbas.timing.secsToDisplayTime(this.exam.timeRemaining)));
		this.timeSpent(Numbas.timing.secsToDisplayTime(this.exam.timeSpent));
	},

	/** Initialise the question list display */
	initQuestionList: function() {
		for(var i=0; i<this.exam.questionList.length; i++) {
			this.questions.push(this.exam.questionList[i].display);
		}
	},

	/** Hide the timer */
	hideTiming: function()
	{
		this.displayTime('');
	},

	/** Show/update the student's total score */
	showScore: function()
	{
		var exam = this.exam;
		this.marks(Numbas.math.niceNumber(exam.mark));
		this.score(Numbas.math.niceNumber(exam.score));
		this.percentScore(exam.percentScore);
	},

	/** Update the question list display - typically, scroll so the current question is visible */
	updateQuestionMenu: function()
	{
		var exam = this.exam;
		//scroll question list to centre on current question
		if(display.carouselGo)
			display.carouselGo(exam.currentQuestion.number-1,300);
	},

	/** Show an info page (one of the front page, pause , results, or exit)
	 * @param {string} page - name of the page to show
	 */
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

	/** Show the current question */
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

	/** Called just before the current question is regenerated */
	startRegen: function() {
		$('#questionDisplay').hide();
		this.exam.currentQuestion.display.html.remove();
		this.oldQuestion = this.exam.currentQuestion.display;
	},
	
	/** Called after the current question has been regenerated */
	endRegen: function() {
		var currentQuestion = this.exam.currentQuestion;
		this.questions.splice(currentQuestion.number,1,currentQuestion.display);
		this.applyQuestionBindings(currentQuestion);
		$('#questionDisplay').fadeIn(200);
	},

	applyQuestionBindings: function(question) {
		ko.applyBindings({exam: this, question: question.display},question.display.html[0]);
	},

	/** Called when the exam ends */
	end: function() {
		this.mode(this.exam.mode);
		this.questions().map(function(q) {
			q.end();
		});
	}
};

/** Display properties of a question object
 * @name QuestionDisplay
 * @memberof Numbas.display
 * @constructor
 * @param {Numbas.Question} q - the associated question object
 */
display.QuestionDisplay = function(q)
{
	this.question = q;
	var exam = q.exam;

	/** Has the advice been shown?
	 * @member {observable|boolean} adviceDisplayed
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.adviceDisplayed = ko.observable(false);

	/** Get the {@link Numbas.display.PartDisplay} object for the given path.
	 * @param {partpath} path
	 * @returns {Numbas.display.PartDisplay}
	 * @method getPart
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.getPart = function(path) {
		return q.getPart(path).display;
	}

	/** Text for the "submit all answers" button
	 * @member {observable|string} submitMessage
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.submitMessage = ko.observable('');

	/** The name to display for this question - in default locale, it's "Question {N}"
	 * @member {observable|string} displayName
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.displayName = ko.observable(R('question.header',q.number+1));

	/** Has the student looked at this question? ({@link Numbas.Question#visited})
	 * @member {observable|boolean} visited
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.visited = ko.observable(q.visited);

	/** Is this question visible in the list?
	 * @member {observable|boolean} visible
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.visible = ko.computed(function() {
		return this.visited() || exam.settings.navigateBrowse;
	},this);

	/** Student's current score ({@link Numbas.Question#score})
	 * @member {observable|number} score
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.score = ko.observable(q.score);

	/** Total marks available for this question ({@link Numbas.Question#marks})
	 * @member {observable|number} marks
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.marks = ko.observable(q.marks);

	/** Has this question been answered? ({@link Numbas.Question#answered})
	 * @member {observable|boolean} answered
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.answered = ko.observable(q.answered);

	/** Have the correct answers been revealed? ({@link Numbas.Question#revealed})
	 * @member {observable|boolean} revealed
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.revealed = ko.observable(q.revealed);

	/** Have any of this question's parts been answered?
	 * @member {observable|boolean} anyAnswered
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.anyAnswered = ko.observable(false);

	/** Has the student changed any of their answers since submitting?
	 * @member {observable|boolean} isDirty
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.isDirty = ko.observable(false);

	/** Is the student able to reveal the correct answers?
	 * @member {observable|boolean} canReveal
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.canReveal = ko.computed(function() {
		return exam.settings.allowRevealAnswer && !this.revealed();
	},this);

	/** Score feedback string
	 * @member {{update: function, message: observable|string}} scoreFeedback
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.scoreFeedback = showScoreFeedback(this,q.exam.settings);

	/** Show this question in review mode
	 * @member {function} review
	 * @method
	 * @memberof Numbas.display.QuestionDisplay
	 */
	this.review = function() {
		exam.reviewQuestion(q.number);
	}
}
display.QuestionDisplay.prototype = /** @lends Numbas.display.QuestionDisplay.prototype */
{
	/** The associated question object
	 * @type {Numbas.Question}
	 */
	question: undefined,			//reference back to the main question object

	/** HTML representing the question
	 * @type {Element}
	 */
	html: '',						//HTML for displaying question

	/** Make the HTML to display the question */
	makeHTML: function() {
		var q = this.question;
		var qd = this;
		var html = this.html = $($.xsl.transform(Numbas.xml.templates.question, q.xml).string);
		html.addClass('jme-scope').data('jme-scope',q.scope);
		$('#questionDisplay').append(html);

		qd.css = document.createElement('style');
		qd.css.setAttribute('type','text/css');
		if(qd.css.styleSheet) {
			qd.css.styleSheet.cssText = q.preamble.css;
		} else {
			qd.css.appendChild(document.createTextNode(q.preamble.css));
		}

		Numbas.schedule.add(function()
		{
			html.each(function(e) {
				Numbas.jme.variables.DOMcontentsubvars(this,q.scope);
			})

			// trigger a signal that the question HTML is attached
			// DEPRECATED: use question.onHTMLAttached(fn) instead
			$('body').trigger('question-html-attached',q,qd);
			$('body').unbind('question-html-attached');

			// make mathjax process the question text (render the maths)
			Numbas.display.typeset(qd.html,qd.postTypesetF);
		});
	},

	/** Show the question */
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

	/** Called when the student leaves the question */
	leave: function() {
		$(this.css).remove();
	},

	/** Show this question's advice */
	showAdvice: function( fromButton )
	{
		this.adviceDisplayed(this.question.adviceDisplayed);
	},

	/** Reveal the answers to this question */
	revealAnswer: function()
	{
		this.revealed(this.question.revealed);
		if(!this.question.revealed)
			return;
		scroll(0,0);
	},

	/** Display question score and answer state */
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

	/** Scroll to the first part submission error */
	scrollToError: function() {
		scrollTo($('.warning-icon:visible:first'));
	},

	/* Initialise this question's display 
	 * @see Numbas.display.ExamDisplay.init
	 */
	init: function() {
		var q = this.question;
		for(var i=0;i<q.parts.length;i++)
		{
			q.parts[i].display.init();
		}
	},

	/** Called when the exam ends */
	end: function() {
		var q = this.question;
		for(var i=0;i<q.parts.length;i++)
		{
			q.parts[i].display.end();
		}
	}
};

var extend = Numbas.util.extend;

/** Display methods for a generic question part
 * @name PartDisplay
 * @memberof Numbas.display
 * @constructor
 * @param {Numbas.parts.Part} p - the associated part object
 */
display.PartDisplay = function(p)
{

	var pd = this;
	/** The associated part object
	 * @member {Numbas.parts.Part} part
	 * @memberof Numbas.display.PartDisplay
	 */
	this.part = p;

	/** The question this part belongs to
	 * @member {Numbas.Question} question
	 * @memberof Numbas.display.PartDisplay
	 */
	this.question = p.question;

	/** The student's current score ({@link Numbas.parts.Part#score})
	 * @member {observable|number} score
	 * @memberof Numbas.display.PartDisplay
	 */
	this.score = ko.observable(p.score);

	/** The total marks available for this part ({@link Numbas.parts.Part#marks})
	 * @member {observable|number} marks
	 * @memberof Numbas.display.PartDisplay
	 */
	this.marks = ko.observable(p.marks);

	/** Has the student answered this part?
	 * @member {observable|boolean} answered
	 * @memberof Numbas.display.PartDisplay
	 */
	this.answered = ko.observable(p.answered);

	/** Has the student changed their answer since the last submission?
	 * @member {observable|boolean} isDirty
	 * @memberof Numbas.display.PartDisplay
	 */
	this.isDirty = ko.observable(false);

	/** Warnings based on the student's answer
	 * @member {observable|Array.<{message:string}>} warnings
	 * @memberof Numbas.display.PartDisplay
	 */
	this.warnings = ko.observableArray([]);

	/** Are the warnings visible?
	 * @member {observable|boolean} warningsShown
	 * @memberof Numbas.display.PartDisplay
	 */
	this.warningsShown = ko.observable(false);

	/** Show the warnings
	 * @member {function} showWarnings
	 * @method
	 * @memberof Numbas.display.PartDisplay
	 */
	this.showWarnings = function() {
		this.warningsShown(true);
	}

	/** Hide the warnings
	 * @member {function} hideWarnings
	 * @method
	 * @memberof Numbas.display.PartDisplay
	 */
	this.hideWarnings = function() {
		this.warningsShown(false);
	}

	/** Are the marking feedback messages visible?
	 * @member {observable|boolean} feedbackShown
	 * @memberof Numbas.display.PartDisplay
	 */
	this.feedbackShown = ko.observable(false);

	/** Text for the button to toggle the display of the feedback messages
	 * @member {observable|string} toggleFeedbackText
	 * @memberof Numbas.display.PartDisplay
	 */
	this.toggleFeedbackText = ko.computed(function() {
		return R(this.feedbackShown() ? 'question.score feedback.hide' : 'question.score feedback.show');
	},this);

	/** Feedback messages
	 * @member {observable|string[]} feedbackMessages
	 * @memberof Numbas.display.PartDisplay
	 */
	this.feedbackMessages = ko.observableArray([]);
	
	/** Should the button to toggle feedback messages be shown?
	 * @member {observable|boolean} showFeedbackToggler
	 * @memberof Numbas.display.PartDisplay
	 */
	this.showFeedbackToggler = ko.computed(function() {
		return p.question.exam.settings.showAnswerState && pd.feedbackMessages().length;
	});

	/** Have the steps ever been shown? ({@link Numbas.parts.Part#stepsShown})
	 * @member {observable|boolean} stepsShown
	 * @memberof Numbas.display.PartDisplay
	 */
	this.stepsShown = ko.observable(p.stepsShown);

	/** Are the steps currently open? ({@link Numbas.parts.Part#stepsOpen})
	 * @member {observable|boolean} stepsOpen
	 * @memberof Numbas.display.PartDisplay
	 */
	this.stepsOpen = ko.observable(p.stepsOpen);

	/** Text to describe the state of the steps penalty
	 * @member {observable|string} stepsPenaltyMessage
	 * @memberof Numbas.display.PartDisplay
	 */
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

	/** Have the correct answers been revealed?
	 * @member {observable|boolean} revealed
	 * @memberof Numbas.display.PartDisplay
	 */
	this.revealed = ko.observable(false);

	/** Should the correct answer be shown? True if revealed and {@link Numbas.parts.Part#settings.showCorrectAnswer}) is true
	 * @member {observable|boolean} showCorrectAnswer
	 * @memberof Numbas.display.PartDisplay
	 */
	this.showCorrectAnswer = ko.computed(function() {
		return p.settings.showCorrectAnswer && pd.revealed();
	});

	/** Display of this parts's current score / answered status
	 * @member {observable|object} scoreFeedback
	 * @memberof Numbas.display.PartDisplay
	 */
	this.scoreFeedback = showScoreFeedback(this,p.question.exam.settings);

	/** Control functions
	 * @member {object} controls
	 * @memberof Numbas.display.PartDisplay
	 * @property {function} toggleFeedback - Toggle the display of the marking feedback messages
	 * @property {function} submit - Submit the student's answers for marking
	 * @property {function} showSteps - Show the steps
	 * @property {function} hideSteps - Hide the steps
	 */
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

	/** Event bindings
	 * @member {object} inputEvents
	 * @memberof Numbas.display.PartDisplay
	 */
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
display.PartDisplay.prototype = /** @lends Numbas.display.PartDisplay.prototype */
{
	/** Show a warning message about this part
	 * @param {string} warning
	 */
	warning: function(warning)
	{
		this.warnings.push({message:warning+''});
	},

	/** Remove all previously displayed warnings */
	removeWarnings: function()
	{
		this.warnings([]);
	},

	/** Called when the part is displayed (basically when question is changed)
	 * @see Numbas.display.QuestionDisplay.show
	 */
	show: function()
	{
		var p = this.part;

		this.feedbackShown(false);

		this.showScore(this.part.answered);
	},

	/** Show/update the student's score and answer status on this part */
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

	/** Called when 'show steps' button is pressed, or coming back to a part after steps shown */
	showSteps: function()
	{
		this.stepsShown(this.part.stepsShown);
		this.stepsOpen(this.part.stepsOpen);

		for(var i=0;i<this.part.steps.length;i++)
		{
			this.part.steps[i].display.show();
		}
	},

	/** Hide the steps */
	hideSteps: function()
	{
		this.stepsOpen(this.part.stepsOpen);
	},

	/** Fill the student's last submitted answer into inputs
	 * @abstract
	 */
	restoreAnswer: function() 
	{
	},

	/** Show the correct answers to this part */
	revealAnswer: function() 
	{
		this.revealed(true);
		this.removeWarnings();
		this.showScore();
	},

	/** Initialise this part's display
	 * @see Numbas.display.QuestionDisplay.init
	 */
	init: function() {
		this.part.setDirty(false);
		for(var i=0;i<this.part.steps.length;i++) {
			this.part.steps[i].display.init();
		}
	},

	/** Called when the exam ends */
	end: function() {
		this.restoreAnswer();
		for(var i=0;i<this.part.steps.length;i++) {
			this.part.steps[i].display.end();
		}
	}
};

/** Display code for a {@link Numbas.parts.JMEPart}
 * @constructor
 * @augments Numbas.display.PartDisplay
 * @name JMEPartDisplay
 * @memberof Numbas.display
 */
display.JMEPartDisplay = function()
{
	var p = this.part;

	/** The student's current answer (not necessarily submitted)
	 * @member {observable|JME} studentAnswer
	 * @memberof Numbas.display.JMEPartDisplay
	 */
	this.studentAnswer = ko.observable('');

	/** The correct answer
	 * @member {observable|JME} correctAnswer
	 * @memberof Numbas.display.JMEPartDisplay
	 */
	this.correctAnswer = p.settings.correctAnswer;

	/** Should the LaTeX rendering of the student's answer be shown?
	 * @member {boolean} showPreview
	 * @memberof Numbas.display.JMEPartDisplay
	 */
	this.showPreview = p.settings.showPreview;

	/** The correct answer, in LaTeX form
	 * @member {observable|TeX} correctAnswerLaTeX
	 * @memberof Numbas.display.JMEPartDisplay
	 */
	this.correctAnswerLaTeX = Numbas.jme.display.exprToLaTeX(this.correctAnswer,p.settings.displaySimplification,p.question.scope);

	ko.computed(function() {
		p.storeAnswer([this.studentAnswer()]);
	},this);

	/** The student's answer, in LaTeX form
	 * @member {observable|TeX} studentAnswerLaTeX
	 * @memberof Numbas.display.JMEPartDisplay
	 */
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
			this.warning(e.message);
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

	/** Does the input box have focus?
	 * @member {observable|boolean} inputHasFocus
	 * @memberof Numbas.display.JMEPartDisplay
	 */
	this.inputHasFocus = ko.observable(false);

	/** Give the input box focus
	 * @member {function} focusInput
	 * @method
	 * @memberof Numbas.display.JMEPartDisplay
	 */
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

/** Display code for a {@link Numbas.parts.PatternMatchPart}
 * @augments Numbas.display.PartDisplay
 * @constructor
 * @name PatternMatchPartDisplay
 * @memberof Numbas.display
 */
display.PatternMatchPartDisplay = function()
{
	var p = this.part;

	/** The student's current answer (not necessarily submitted)
	 * @member {observable|string} studentAnswer
	 * @memberof Numbas.display.PatternMatchPartDisplay
	 */
	this.studentAnswer = ko.observable(this.part.studentAnswer);

	/** The correct answer regular expression
	 * @member {observable|RegExp} correctAnswer
	 * @memberof Numbas.display.PatternMatchPartDisplay
	 */
	this.correctAnswer = ko.observable(p.settings.correctAnswer);

	/** A representative correct answer to display when answers are revealed
	 * @member {observable|string} displayAnswer
	 * @memberof Numbas.display.PatternMatchPartDisplay
	 */
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

/** Display code for a {@link Numbas.parts.NumberEntryPart}
 * @augments Numbas.display.PartDisplay
 * @constructor
 * @name NumberEntryPartDisplay
 * @memberof Numbas.display
 */
display.NumberEntryPartDisplay = function()
{
	var p = this.part;

	/** The student's current (not necessarily submitted) answer
	 * @member {observable|string} studentAnswer
	 * @memberof Numbas.display.NumberEntryPartDisplay
	 */
	this.studentAnswer = ko.observable(p.studentAnswer);

	/** The correct answer
	 * @member {observable|number} correctAnswer
	 * @memberof Numbas.display.NumberEntryPartDisplay
	 */
	this.correctAnswer = ko.observable(p.settings.displayAnswer);

	ko.computed(function() {
		p.storeAnswer([this.studentAnswer()]);
	},this);

	/** Cleaned-up version of student answer (remove commas and trim whitespace)
	 * 
	 * Also check for validity and give warnings
	 * @member {observable|string} cleanStudentAnswer
	 * @memberof Numbas.display.NumberEntryPartDisplay
	 */
	this.cleanStudentAnswer = ko.computed(function() {
		var studentAnswer = p.cleanAnswer(this.studentAnswer());
		this.removeWarnings();
		if(studentAnswer=='')
			return '';

		if(p.settings.integerAnswer) {
			var dp = Numbas.math.countDP(studentAnswer);
			if(dp>0)
				this.warning(R('part.numberentry.answer not integer'));
		}
		if(!/^[\-+]?[0-9]+(?:\x2E[0-9]+)?$/.test(studentAnswer)) {
			this.warning(R('part.numberentry.answer not integer or decimal'));
			return '';
		}
		var n = parseFloat(studentAnswer);
		return n+'';
	},this);

	/** Show a LaTeX rendering of the answer?
	 * @member {boolean} showPreview
	 * @memberof Numbas.display.NumberEntryPartDisplay
	 */
	this.showPreview = false;

	/** TeX version of student's answer
	 * @member {observable|TeX} studentAnswerLaTeX
	 * @memberof Numbas.display.NumberEntryPartDisplay
	 */
	this.studentAnswerLaTeX = ko.computed(function() {
		return this.cleanStudentAnswer();
	},this);

	/** Does the input box have focus?
	 * @member {observable|boolean} inputHasFocus
	 * @memberof Numbas.display.NumberEntryPartDisplay
	 */
	this.inputHasFocus = ko.observable(false);

	/** Give the input box focus
	 * @member {function} focusInput
	 * @method
	 * @memberof Numbas.display.NumberEntryPartDisplay
	 */
	this.focusInput = function() {
		this.inputHasFocus(true);
	}
}
display.NumberEntryPartDisplay.prototype =
{
	restoreAnswer: function()
	{
		this.studentAnswer(this.part.studentAnswer);
	}
};
display.NumberEntryPartDisplay = extend(display.PartDisplay,display.NumberEntryPartDisplay,true);

/** Display code for a {@link Numbas.parts.MultipleResponsePart}
 * @augments Numbas.display.PartDisplay
 * @constructor
 * @name MultipleResponsePartDisplay
 * @memberof Numbas.display
 */
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
		/** Index of student's current answer choice (not necessarily submitted)
		 * @member {observable|number} studentAnswer
		 * @memberof Numbas.display.MultipleResponsePartDisplay
		 */
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
		/** Index of the answer which gains the most marks
		 * @member {observable|number} correctAnswer
		 * @memberof Numbas.display.MultipleResponsePartDisplay
		 */
		this.correctAnswer = ko.observable(maxi);

		break;
	case 'm_n_2':
		/** For each choice, has the student selected it?
		 *
		 * For m_n_2 parts, this is a list of booleans. For m_n_x radiogroup parts, it's a list of indices. For m_n_x checkbox parts, it's a 2d array of booleans.
		 * @member {observable|boolean[]|number[]|Array.Array.<boolean>} ticks
		 * @memberof Numbas.display.MultipleResponsePartDisplay
		 */
		this.ticks = [];

		/** For each choice, should it be selected to get the most marks?
		 *
		 * For m_n_2 parts, this is a list of booleans. For m_n_x radiogroup parts, it's a list of indices. For m_n_x checkbox parts, it's a 2d array of booleans.
		 * @member {observable|boolean[]|number[]|Array.Array.<boolean>} ticks
		 * @memberof Numbas.display.MultipleResponsePartDisplay
		 */
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
					this.studentAnswer(i+'');
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
							this.ticks[j](i+'');
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


/** Display code for a {@link Numbas.parts.GapFillPart}
 * @augments Numbas.display.PartDisplay
 * @constructor
 * @name GapFillPartDisplay
 * @memberof Numbas.display
 */
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

/** Display code for a {@link Numbas.parts.InformationPart}
 * @augments Numbas.display.PartDisplay
 * @constructor
 * @name InformationPartDisplay
 * @memberof Numbas.display
 */
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

	var answered = ko.computed(function() {
		return !obj.isDirty() && (obj.answered() || obj.score()>0);
	});

	var state = ko.computed(function() {
		var revealed = obj.revealed(), score = obj.score(), marks = obj.marks();

		if( marks>0 && (revealed || (settings.showAnswerState && answered())) ) {
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
			var revealed = obj.revealed(), score = obj.score(), marks = obj.marks();

			var scoreobj = {
				marks: niceNumber(marks),
				score: niceNumber(score),
				marksString: niceNumber(marks)+' '+util.pluralise(marks,R('mark'),R('marks')),
				scoreString: niceNumber(score)+' '+util.pluralise(score,R('mark'),R('marks'))
			};
			if(revealed && !answered())
				return R('question.score feedback.unanswered');
			else if(answered() && marks>0)
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

/** Make a carousel out of a div containing a list
 * @param {Element} elem - div containing list to turn into a carousel
 * @param {object} options -`prevBtn`, `nextBtn` - selectors of buttons to move up and down, `speed`, `step`
 */
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

