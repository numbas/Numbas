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


Numbas.queueScript('scripts/exam.js',['timing','util','xml','display','schedule','storage','scorm-storage','math','question','jme-variables','jme-display','jme'],function() {

	var job = Numbas.schedule.add;


// exam object keeps track of all info we need to know while exam is running
var Exam = Numbas.Exam = function()
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
	tryGetAttribute(settings,xml,'.',['name','percentPass','shuffleQuestions']);

	tryGetAttribute(settings,xml,'settings/navigation',['allowregen','reverse','browse','showfrontpage','preventleave'],['allowRegen','navigateReverse','navigateBrowse','showFrontPage','preventLeave']);

	//get navigation events and actions
	settings.navigationEvents = {};

	var navigationEventNodes = xml.selectNodes('settings/navigation/event');
	for( var i=0; i<navigationEventNodes.length; i++ )
	{
		var e = new ExamEvent(navigationEventNodes[i]);
		settings.navigationEvents[e.type] = e;
	}

	tryGetAttribute(settings,xml,'settings/timing','duration');
	
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

	this.settings.numQuestions = xml.selectNodes('questions/question').length;

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
Exam.prototype = {

	settings: {
		name: '',					//title of exam
		percentPass: 0,				//percentage student must achieve to pass
		shuffleQuestions: false,	//should the questions be shuffled?
		numQuestions: 0,			//number of questions in this sitting
		preventLeave: true,			//prevent the browser from leaving the page while the exam is running?
		allowRegen: false,			//can student re-randomise a question?
		navigateReverse: false,		//can student navigate to previous question?
		navigateBrowse: false,		//can student jump to any question they like?
		showFrontPage: true,		//show the frontpage before starting the exam?
		navigationEvents: {},		//checks to perform when doing certain navigation action
		timerEvents: {},			//events based on timing
		duration: 0,				//how long is exam?
		showActualMark: false,		//show current score?
		showTotalMark: false,		//show total marks in exam?
		showAnswerState: false,		//tell student if answer is correct/wrong/partial ?
		allowRevealAnswer: false,	//allow 'reveal answer' button ?
		adviceGlobalThreshold: 0, 	//if student scores lower than this percentage on a question, the advice is displayed
	},

	xml: undefined,				//base node of exam XML

	mode: 'normal',				//can be 	"normal" - sitting exam
                                //			"review" - looking at completed exam

	mark: 0,					//total marks available in exam
	score: 0,					//student's current score
	passed: false,				//did student pass the exam?

	//JME evaluation environment
	scope: undefined,

	//exam properties
	percentScore: 0,			//student's score as a percentage
	
	//question selection
	currentQuestionNumber: 0,	//number of current question
	currentQuestion: undefined,	//current question object
	
	questionSubset: [],			//which questions from the pool to use? for reconstructing question list on resume
	questionList: [],			//Question objects, in order student will see them
		

	//timing
	displayDuration: '',//exam duration in h:m:s format
	stopwatch: undefined,		//stopwatch object - updates timer every second
	endTime: undefined,			//time that the exam should stop
	timeRemaining: 0,			//seconds until end of exam
	timeSpent: 0,				//seconds exam has been in progress
	inProgress: false,			//is the exam in progress? False before starting, when paused, and after ending.

	start: Date(),				//time exam started
	stop: Date(),				//time exam finished
	

	display: undefined,			//display code

	//stuff to do when starting exam afresh
	init: function()
	{
		var exam = this;
		var variablesTodo = Numbas.xml.loadVariables(exam.xml,exam.scope);
		exam.scope.variables = Numbas.jme.variables.makeVariables(variablesTodo,exam.scope)
		job(exam.chooseQuestionSubset,exam);			//choose questions to use
		job(exam.makeQuestionList,exam);				//create question objects
		job(Numbas.store.init,Numbas.store,exam);		//initialise storage
		job(Numbas.store.save,Numbas.store);			//make sure data get saved to LMS
	},

	//restore previously started exam from storage
	load: function()
	{
		this.loading = true;
		var suspendData = Numbas.store.load(this);	//get saved info from storage

		job(function() {
			this.timeRemaining = suspendData.timeRemaining;
			this.questionSubset = suspendData.questionSubset;
			this.settings.numQuestions = this.questionSubset.length;
			this.start = new Date(suspendData.start);
			this.score = suspendData.score;
		},this);

		job(this.makeQuestionList,this,true);
		job(function() {
			for(var i=0;i<this.settings.numQuestions;i++)
			{
				var q = this.questionList[i];
			}
		},this);

		job(function() {
			if(suspendData.location!==undefined)
				this.changeQuestion(suspendData.location);
			this.loading = false;
		},this);
	},


	//decide which questions to use and in what order
	chooseQuestionSubset: function()
	{
		//get all questions out of XML
		var tmpQuestionList = new Array();

		//shuffle questions?
		this.questionSubset = [];
		if(this.settings.shuffleQuestions)
		{
			this.questionSubset=Numbas.math.deal(this.settings.numQuestions);
		}
		else	//otherwise just pick required number of questions from beginning of list
		{
			this.questionSubset = Numbas.math.range(this.settings.numQuestions);
		}

		if(this.questionSubset.length==0)
		{
			Numbas.display.showAlert("This exam contains no questions! Check the .exam file for errors.");
		}
	},

	//having chosen which questions to use, make question list and create question objects
	//if loading, need to restore randomised variables instead of generating anew
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
			//calculate max marks available in exam
			this.mark = 0;

			//go through the questions and recalculate the part scores, then the question scores, then the exam score
			for( i=0; i<this.settings.numQuestions; i++ )
			{
				this.mark += this.questionList[i].marks;
			}
		},this);
	},

	showInfoPage: function(page) {
		if(this.currentQuestion)
			this.currentQuestion.leave();
		this.display.showInfoPage(page);
	},
	
	//begin exam
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

	pause: function()
	{
		this.endTiming();
		this.display.showInfoPage('suspend');

		Numbas.store.pause();
	},

	resume: function()
	{
		this.startTiming();
		this.display.showQuestion();
	},

	//set the stopwatch going
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

	//display time remaining and end exam when timer reaches zero
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
			else if(this.timeRemaining===0)
			{
				var e = this.settings.timerEvents['timeout'];
				if(e && e.action=='warn')
				{
					Numbas.display.showAlert(e.message);
				}
				this.end();
			}	
		}
	},

	//stop the stopwatch
	endTiming: function()
	{
		this.inProgress = false;
		clearInterval( this.stopwatch.id );
	},


	//recalculate and display student's total score
	updateScore: function()
	{
		this.calculateScore();
		this.display.showScore();
		Numbas.store.saveExam(this);
	},

	calculateScore: function()
	{
		this.score=0;
		for(var i=0; i<this.questionList.length; i++)
			this.score += this.questionList[i].score;
		this.percentScore = Math.round(100*this.score/this.mark);
	},

	//call this when student wants to move between questions
	//will check move is allowed and if so change question and update display
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

		if(currentQuestion.answered)
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
				Numbas.display.showConfirm(eventObj.message+'<p>Proceed anyway?</p>',go);
				break;
			case 'preventifunattempted':
				Numbas.display.showAlert(eventObj.message);
				break;
			}
		}
	},

	//actually change the current question
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

	regenQuestion: function()
	{
		var e = this;
		var n = e.currentQuestion.number;
		job(e.display.startRegen,e.display);
		job(function() {
			e.questionList[n] = new Numbas.Question(e, e.xml.selectNodes('questions/question')[n], n, false, e.scope);
		})
		job(function() {
			e.changeQuestion(n);
			e.display.showQuestion();
		});
		job(e.display.endRegen,e.display);
	},

	tryEnd: function() {
		var message = R('control.confirm end');
		var answeredAll = true;
		for(var i=0;i<this.questionList.length;i++) {
			if(!this.questionList[i].answered) {
				answeredAll = false;
				break;
			}
		}
		if(!answeredAll) {
			message = R('control.not all questions answered') + '<br/>' + message;
		}
		Numbas.display.showConfirm(
			message,
			function() {
				job(Numbas.exam.end,Numbas.exam);
			}
		);
	},

	end: function()
	{
		//get time of finish
		this.stop = new Date();
		
		//stop the stopwatch
		this.endTiming();

		//work out summary info
		this.passed = this.percentScore >= this.settings.percentPass;
		this.result = R(this.passed ? 'exam.passed' :'exam.failed')

		//send result to LMS, and tell it we're finished
		Numbas.store.end();

		//display the results
		this.display.showInfoPage( 'result' );
	},

	exit: function()
	{
		this.display.showInfoPage('exit');
	}
};

function ExamEvent(eventNode)
{
	var tryGetAttribute = Numbas.xml.tryGetAttribute;
	tryGetAttribute(this,null,eventNode,['type','action']);
	this.message = Numbas.xml.serializeMessage(eventNode);
}
ExamEvent.prototype = {
	type: '',
	action: 'none',
	message: ''
};

});
