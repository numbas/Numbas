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

/** @file Defines the {@link Numbas.Exam} object. */


Numbas.queueScript('exam',['base','timing','util','xml','display','schedule','storage','scorm-storage','math','question','jme-variables','jme-display','jme'],function() {
	var job = Numbas.schedule.add;

/** Keeps track of all info we need to know while exam is running.
 *
 * Loads XML from {@link Numbas.xml.examXML}
 * @constructor
 * @memberof Numbas
 */
function Exam()
{
	var tryGetAttribute = Numbas.xml.tryGetAttribute;

	//get the exam info out of the XML and into the exam object
	var xml = this.xml = Numbas.xml.examXML.selectSingleNode('/exam');
	if(!xml)
	{
		throw(new Numbas.Error('exam.xml.bad root'));
	}

	var settings = this.settings;

	//load settings from XML
	tryGetAttribute(settings,xml,'.',['name','percentPass']);
	tryGetAttribute(settings,xml,'questions',['shuffle','all','pick'],['shuffleQuestions','allQuestions','pickQuestions']);

	tryGetAttribute(settings,xml,'settings/navigation',['allowregen','reverse','browse','showfrontpage','preventleave'],['allowRegen','navigateReverse','navigateBrowse','showFrontPage','preventLeave']);

	//get navigation events and actions
	settings.navigationEvents = {};

	var navigationEventNodes = xml.selectNodes('settings/navigation/event');
	for( var i=0; i<navigationEventNodes.length; i++ )
	{
		var e = new ExamEvent(navigationEventNodes[i]);
		settings.navigationEvents[e.type] = e;
	}

	tryGetAttribute(settings,xml,'settings/timing',['duration','allowPause']);
	
	//get text representation of exam duration
	this.displayDuration = settings.duration>0 ? Numbas.timing.secsToDisplayTime( settings.duration ) : '';
						
	//get timing events
	settings.timerEvents = {};
	var timerEventNodes = this.xml.selectNodes('settings/timing/event');
	for( i=0; i<timerEventNodes.length; i++ )
	{
		var e = new ExamEvent(timerEventNodes[i]);
		settings.timerEvents[e.type] = e;
	}
		
	//feedback
	var feedbackPath = 'settings/feedback';
	tryGetAttribute(settings,xml,feedbackPath,['showactualmark','showtotalmark','showanswerstate','allowrevealanswer'],['showActualMark','showTotalMark','showAnswerState','allowRevealAnswer']);

	tryGetAttribute(settings,xml,feedbackPath+'/advice',['threshold'],['adviceGlobalThreshold']);	

	settings.numQuestions = xml.selectNodes('questions/question').length;

	var scopes = [Numbas.jme.builtinScope];
	for(var extension in Numbas.extensions) {
		if('scope' in Numbas.extensions[extension]) {
			scopes.push(Numbas.extensions[extension].scope);
		}
	}
	scopes.push({
		functions: Numbas.jme.variables.makeFunctions(this.xml,this.scope)
	});

	this.scope = new Numbas.jme.Scope(scopes);

	//rulesets
	var rulesetNodes = xml.selectNodes('settings/rulesets/set');
	this.scope.rulesets = Numbas.util.copyobj(Numbas.jme.display.simplificationRules);

	var sets = {};
	sets['default'] = ['unitFactor','unitPower','unitDenominator','zeroFactor','zeroTerm','zeroPower','collectNumbers','zeroBase','constantsFirst','sqrtProduct','sqrtDivision','sqrtSquare','otherNumbers'];
	for( i=0; i<rulesetNodes.length; i++)
	{
		var name = rulesetNodes[i].getAttribute('name');
		var set = [];

		//get new rule definitions
		defNodes = rulesetNodes[i].selectNodes('ruledef');
		for( var j=0; j<defNodes.length; j++ )
		{
			var pattern = defNodes[j].getAttribute('pattern');
			var result = defNodes[j].getAttribute('result');
			var conditions = [];
			var conditionNodes = defNodes[j].selectNodes('conditions/condition');
			for(var k=0; k<conditionNodes.length; k++)
			{
				conditions.push(Numbas.xml.getTextContent(conditionNodes[k]));
			}
			var rule = new Numbas.jme.display.Rule(pattern,conditions,result);
			set.push(rule);
		}

		//get included sets
		var includeNodes = rulesetNodes[i].selectNodes('include');
		for(var j=0; j<includeNodes.length; j++ )
		{
			set.push(includeNodes[j].getAttribute('name'));
		}

		sets[name] = this.scope.rulesets[name] = set;
	}

	for(var name in sets)
	{
		this.scope.rulesets[name] = Numbas.jme.collectRuleset(sets[name],this.scope.rulesets);
	}

	//initialise display
	this.display = new Numbas.display.ExamDisplay(this);

}
Numbas.Exam = Exam;
Exam.prototype = /** @lends Numbas.Exam.prototype */ {
	/** Settings
	 * @property {string} name - Title of exam
	 * @property {number} percentPass - Percentage of max. score student must achieve to pass 
	 * @property {boolean} shuffleQuestions - should the questions be shuffled?
	 * @property {number} numQuestions - number of questions in this sitting
	 * @property {boolean} preventLeave - prevent the browser from leaving the page while the exam is running?
	 * @property {boolean} allowRegen -can student re-randomise a question?
	 * @property {boolean} navigateReverse - can student navigate to previous question?
	 * @property {boolean} navigateBrowse - can student jump to any question they like?
	 * @property {boolean} showFrontPage - show the frontpage before starting the exam?
	 * @property {Array.object} navigationEvents - checks to perform when doing certain navigation action
	 * @property {Array.object} timerEvents - events based on timing
	 * @property {number} duration - how long is exam? (seconds)
	 * @property {boolean} allowPause - can the student suspend the timer with the pause button or by leaving?
	 * @property {boolean} showActualMark - show current score?
	 * @property {boolean} showTotalMark - show total marks in exam?
	 * @property {boolean} showAnswerState - tell student if answer is correct/wrong/partial?
	 * @property {boolean} allowRevealAnswer - allow 'reveal answer' button?
	 * @property {number} adviceGlobalThreshold - if student scores lower than this percentage on a question, the advice is displayed
	 */
	settings: {
		
		name: '',					
		percentPass: 0,				
		shuffleQuestions: false,	
		numQuestions: 0,			
		preventLeave: true,			
		allowRegen: false,			
		navigateReverse: false,		
		navigateBrowse: false,		
		showFrontPage: true,		
		navigationEvents: {},		
		timerEvents: {},			
		duration: 0,				
		allowPause: false,			
		showActualMark: false,		
		showTotalMark: false,		
		showAnswerState: false,		
		allowRevealAnswer: false,	
		adviceGlobalThreshold: 0, 	
	},

	/** Base node of exam XML
	 * @type Element
	 */
	xml: undefined,

	/**
	 * Can be
	 *  * `"normal"` - Student is currently sitting the exam
	 *  * `"review"` - Student is reviewing a completed exam
	 *  @type string
	 */
	mode: 'normal',				
                                
	/** Total marks available in the exam 
	 * @type number
	 */
	mark: 0,					

	/** Student's current score 
	 * @type number
	 */
	score: 0,					//student's current score

	/** Student's score as a percentage
	 * @type number
	 */
	percentScore: 0,
	
	/** Did the student pass the exam? 
	 * @type boolean
	 */
	passed: false,				//did student pass the exam?

	/** JME evaluation environment
	 *
	 * Contains variables, rulesets and functions defined by the exam and by extensions.
	 *
	 * Inherited by each {@link Numbas.Question}'s scope.
	 * @type Numbas.jme.Scope
	 */
	scope: undefined,

	/** Number of the current question
	 * @type number
	 */
	currentQuestionNumber: 0,
	/**
	 * Object representing the current question.
	 * @type Numbas.Question
	 */
	currentQuestion: undefined,
	
	/**
	 * Which questions are used?
	 * @type number[]
	 */
	questionSubset: [],
	/**
	 * Question objects, in the order the student will see them
	 * @type Numbas.Question[]
	 */
	questionList: [],			
		
	/** Exam duration in `h:m:s` format
	 * @type string
	 */
	displayDuration: '',
	/** Stopwatch object - updates the timer every second.
	 * @property {Date} start
	 * @property {Date} end
	 * @property {number} oldTimeSpent - `timeSpent` when the stopwatch was last updated
	 * @property {number} id - id of the `Interval` which calls {@link Numbas.Exam#countDown}
	 */
	stopwatch: undefined,
	/** Time that the exam should stop
	 * @type Date
	 */
	endTime: undefined,
	/** Seconds until the end of the exam
	 * @type number
	 */
	timeRemaining: 0,
	/** Seconds the exam has been in progress
	 * @type number
	 */
	timeSpent: 0,
	/** Is the exam in progress?
	 *
	 * `false` before starting, when paused, and after ending.
	 * @type boolean
	 */
	inProgress: false,

	/** Time the exam started
	 * @type Date
	 */
	start: Date(),
	/** Time the exam finished
	 * @type Date
	 */
	stop: Date(),
	

	/* Display object for this exam
	 * @type Numbas.display.ExamDisplay
	 */
	display: undefined,

	/** Stuff to do when starting exam afresh, before showing the front page.
	 */
	init: function()
	{
		var exam = this;
		var variablesTodo = Numbas.xml.loadVariables(exam.xml,exam.scope);
		var result = Numbas.jme.variables.makeVariables(variablesTodo,exam.scope);
		exam.scope.variables = result.variables;
		job(exam.chooseQuestionSubset,exam);			//choose questions to use
		job(exam.makeQuestionList,exam);				//create question objects
		job(Numbas.store.init,Numbas.store,exam);		//initialise storage
		job(Numbas.store.save,Numbas.store);			//make sure data get saved to LMS
	},

	/** Restore previously started exam from storage */
	load: function()
	{
		this.loading = true;
		var suspendData = Numbas.store.load(this);	//get saved info from storage

		job(function() {
			this.questionSubset = suspendData.questionSubset;
			this.settings.numQuestions = this.questionSubset.length;
			this.start = new Date(suspendData.start);
			if(this.settings.allowPause) {
				this.timeRemaining = this.settings.duration - (suspendData.duration-suspendData.timeRemaining);
			}
			else {
				this.endTime = new Date(this.start.getTime()+this.settings.duration*1000);
				this.timeRemaining = (this.endTime - new Date())/1000;
			}
			this.score = suspendData.score;
		},this);

		job(this.makeQuestionList,this,true);

		job(function() {
			if(suspendData.currentQuestion!==undefined)
				this.changeQuestion(suspendData.currentQuestion);
			this.loading = false;
		},this);
	},


	/** Decide which questions to use and in what order */
	chooseQuestionSubset: function()
	{
		//get all questions out of XML
		var tmpQuestionList = new Array();

		//shuffle questions?
		this.questionSubset = [];
		if(this.settings.shuffleQuestions)
		{
			this.questionSubset = Numbas.math.deal(this.settings.numQuestions);
		}
		else	//otherwise just pick required number of questions from beginning of list
		{
			this.questionSubset = Numbas.math.range(this.settings.numQuestions);
		}
		if(!this.settings.allQuestions) {
			this.questionSubset = this.questionSubset.slice(0,this.settings.pickQuestions);
			this.settings.numQuestions = this.settings.pickQuestions;
		}

		if(this.questionSubset.length==0)
		{
			Numbas.display.showAlert("This exam contains no questions! Check the .exam file for errors.");
		}
	},

	/**
	 * Having chosen which questions to use, make question list and create question objects
	 *
	 * If loading, need to restore randomised variables instead of generating anew
	 *
	 * @param {boolean} [loading=true]
	 */
	makeQuestionList: function(loading)
	{
		this.questionList = [];
		
		var questions = this.xml.selectNodes("questions/question");
		for(var i = 0; i<this.questionSubset.length; i++) 
		{
			job(function(i)
			{
				var question = new Numbas.Question( this, questions[this.questionSubset[i]], i, loading, this.scope );
				this.questionList.push(question);
			},this,i);
		}

		job(function() {
			//register questions with exam display
			this.display.initQuestionList();

			//calculate max marks available in exam
			this.mark = 0;

			//go through the questions and recalculate the part scores, then the question scores, then the exam score
			for( i=0; i<this.settings.numQuestions; i++ )
			{
				this.mark += this.questionList[i].marks;
			}
		},this);
	},

	/** 
	 * Show the given info page
	 * @param {string} page - Name of the page to show
	 */
	showInfoPage: function(page) {
		if(this.currentQuestion)
			this.currentQuestion.leave();
		this.display.showInfoPage(page);
	},
	
	/**
	 * Begin the exam - start timing, go to the first question
	 */
	begin: function()
	{
		this.start = new Date();        //make a note of when the exam was started
		this.endTime = new Date(this.start.getTime()+this.settings.duration*1000);	//work out when the exam should end
		this.timeRemaining = this.settings.duration;

		this.changeQuestion(0);			//start at the first question!

		this.updateScore();				//initialise score

		//set countdown going
		if(this.mode!='review')
			this.startTiming();

		this.display.showQuestion();	//display the current question

	},

	/**
	 * Pause the exam, and show the `suspend` page
	 */
	pause: function()
	{
		this.endTiming();
		this.display.showInfoPage('suspend');

		Numbas.store.pause();
	},

	/**
	 * Resume the exam
	 */
	resume: function()
	{
		this.startTiming();
		this.display.showQuestion();
	},

	/** 
	 * Set the stopwatch going
	 */
	startTiming: function()
	{
		this.inProgress = true;
		this.stopwatch = {
			start: new Date(),
			end: new Date((new Date()).getTime() + this.timeRemaining*1000),
			oldTimeSpent: this.timeSpent,
			id: setInterval(function(){exam.countDown();}, 1000)
		};

		if( this.settings.duration > 0 )
			this.display.showTiming();
			
		else
			this.display.hideTiming();

		var exam = this;
		this.countDown();
	},

	/**
	 * Calculate time remaining and end the exam when timer reaches zero
	 */
	countDown: function()
	{
		var t = new Date();
		this.timeSpent = this.stopwatch.oldTimeSpent + (t - this.stopwatch.start)/1000;

		if(this.settings.duration > 0)
		{
			this.timeRemaining = Math.ceil((this.stopwatch.end - t)/1000);
			this.display.showTiming();

			if(this.settings.duration > 300 && this.timeRemaining<300 && !this.showedTimeWarning)
			{
				this.showedTimeWarning = true;
				var e = this.settings.timerEvents['timedwarning'];
				if(e && e.action=='warn')
				{
					Numbas.display.showAlert(e.message);
				}
			}
			else if(this.timeRemaining<=0)
			{
				var e = this.settings.timerEvents['timeout'];
				if(e && e.action=='warn')
				{
					Numbas.display.showAlert(e.message);
				}
				this.end(true);
			}	
		}
	},

	/** Stop the stopwatch */
	endTiming: function()
	{
		this.inProgress = false;
		clearInterval( this.stopwatch.id );
	},


	/** Recalculate and display the student's total score. 
	 * @see Numbas.Exam#calculateScore
	 */
	updateScore: function()
	{
		this.calculateScore();
		this.display.showScore();
		Numbas.store.saveExam(this);
	},

	/** Calculate the student's score */
	calculateScore: function()
	{
		this.score=0;
		for(var i=0; i<this.questionList.length; i++)
			this.score += this.questionList[i].score;
		this.percentScore = Math.round(100*this.score/this.mark);
	},

	/**
	 * Call this when student wants to move between questions.
	 *
	 * Will check move is allowed and if so change question and update display
	 *
	 * @param {number} i - Number of the question to move to
	 * @see Numbas.Exam#changeQuestion
	 */
	tryChangeQuestion: function(i)
	{
		if(i<0 || i>=this.settings.numQuestions)
			return;

		if( ! (this.settings.navigateBrowse 	// is browse navigation enabled?
			|| (this.questionList[i].visited && this.settings.navigateReverse)	// if not, we can still move backwards to questions already seen if reverse navigation is enabled
			|| (i>this.currentQuestion.number && this.questionList[i-1].visited)	// or you can always move to the next question
		))
		{
			return;
		}

		var currentQuestion = this.currentQuestion;
		if(!currentQuestion)
			return;

		if(i==currentQuestion.number)
			return;

		var exam = this;
		function go()
		{
			exam.changeQuestion(i);
			exam.display.showQuestion();
		}

		if(currentQuestion.leavingDirtyQuestion()) {
		}
		else if(currentQuestion.answered || currentQuestion.revealed || currentQuestion.marks==0)
		{
			go();
		}
		else
		{
			var eventObj = this.settings.navigationEvents.onleave;
			switch( eventObj.action )
			{
			case 'none':
				go();
				break;
			case 'warnifunattempted':
				Numbas.display.showConfirm(eventObj.message+'<p>'+R('control.proceed anyway')+'</p>',go);
				break;
			case 'preventifunattempted':
				Numbas.display.showAlert(eventObj.message);
				break;
			}
		}
	},

	/**
	 * Change the current question. Student's can't trigger this without going through {@link Numbas.Exam#tryChangeQuestion}
	 *
	 * @param {number} i - Number of the question to move to
	 */
	changeQuestion: function(i)
	{
		if(this.currentQuestion) {
			this.currentQuestion.leave();
		}
		this.currentQuestion = this.questionList[i];
		if(!this.currentQuestion)
		{
			throw(new Numbas.Error('exam.changeQuestion.no questions'));
		}
		this.currentQuestion.visited = true;
		Numbas.store.changeQuestion(this.currentQuestion);
	},

	/**
	 * Show a question in review mode
	 *
	 * @param {number} i - Number of the question to show
	 */
	reviewQuestion: function(i) {
		this.changeQuestion(i);
		this.display.showQuestion();
	},

	/**
	 * Regenerate the current question
	 */
	regenQuestion: function()
	{
		var e = this;
		var n = e.currentQuestion.number;
		job(e.display.startRegen,e.display);
		job(function() {
			var on = e.questionSubset.indexOf(n);
			e.questionList[n] = new Numbas.Question(e, e.xml.selectNodes('questions/question')[on], n, false, e.scope);
		})
		job(function() {
			e.changeQuestion(n);
			e.currentQuestion.display.init();
			e.display.showQuestion();
		});
		job(e.display.endRegen,e.display);
	},

	/**
	 * Try to end the exam - shows confirmation dialog, and checks that all answers have been submitted.
	 * @see Numbas.Exam#end
	 */
	tryEnd: function() {
		var message = R('control.confirm end');
		var answeredAll = true;
		var submittedAll = true;
		for(var i=0;i<this.questionList.length;i++) {
			if(!this.questionList[i].answered) {
				answeredAll = false;
				break;
			}
			if(this.questionList[i].isDirty()) {
				submittedAll = false;
			}
		}
		if(this.currentQuestion.leavingDirtyQuestion())
			return;
		if(!answeredAll) {
			message = R('control.not all questions answered') + '<br/>' + message;
		}
		else if(!submittedAll) {
			message = R('control.not all questions submitted') + '<br/>' + message;
		}
		Numbas.display.showConfirm(
			message,
			function() {
				job(Numbas.exam.end,Numbas.exam,true);
			}
		);
	},

	/**
	 * End the exam. The student can't directly trigger this without going through {@link Numbas.Exam#tryEnd}
	 */
	end: function(save)
	{
		this.mode = 'review';

		//work out summary info
		this.passed = (this.percentScore >= this.settings.percentPass*100);
		this.result = R(this.passed ? 'exam.passed' :'exam.failed')

		if(save) {
			//get time of finish
			this.stop = new Date();

			//stop the stopwatch
			this.endTiming();

			//send result to LMS, and tell it we're finished
			Numbas.store.end();
		}

		//display the results
		this.display.end();
		this.display.showInfoPage( 'result' );

		for(var i=0;i<this.questionList.length;i++) {
			this.questionList[i].revealAnswer(true);
		}
	},

	/**
	 * Exit the exam - show the `exit` page
	 */
	exit: function()
	{
		this.display.showInfoPage('exit');
	}
};

/** Represents what should happen when a particular timing or navigation event happens
 * @param Element eventNode - XML to load settings from
 * @constructor
 * @memberof Numbas
 */
function ExamEvent(eventNode)
{
	var tryGetAttribute = Numbas.xml.tryGetAttribute;
	tryGetAttribute(this,null,eventNode,['type','action']);
	this.message = Numbas.xml.serializeMessage(eventNode);
}
ExamEvent.prototype = /** @lends Numbas.ExamEvent.prototype */ {
	/** Name of the event this corresponds to 
	 *
	 * Navigation events:
	 * * `onleave` - the student tries to move to another question without answering the current one.
	 *
	 * (there used to be more, but now they're all the same one)
	 *
	 * Timer events:
	 * * `timedwarning` - Five minutes until the exam ends.
	 * * `timeout` - There's no time left; the exam is over.
	 * @memberof Numbas.ExamEvent
	 * @instance
	 * @type string 
	 */
	type: '',

	/** Action to take when the event happens.
	 *
	 * Choices for timer events:
	 * * `none` - don't do anything
	 * * `warn` - show a message
	 *
	 * Choices for navigation events:
	 * * `none` - just allow the navigation
	 * * `warnifunattempted` - Show a warning but allow the student to continue.
	 * * `preventifunattempted` - Show a warning but allow the student to continue.
	 * @memberof Numbas.ExamEvent
	 * @instance
	 * @type string
	 */
	action: 'none',

	/** Message to show the student when the event happens.
	 * @memberof Numbas.ExamEvent
	 * @instance
	 * @type string
	 */
	message: ''
};

});
