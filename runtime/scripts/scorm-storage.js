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


Numbas.queueScript('scripts/scorm-storage.js',[],function() {
Numbas.storage = {
	startLMS: function()
	//tries to initialise the SCORM API
	//if it isn't present, a pretend LMS is started
	//(this could save student progress in localStorage)
	{
		if(!pipwerks.SCORM.init())
		{
			if(!Numbas.storage.lms)
			{
				Numbas.storage.lms = new Numbas.storage.PretendLMS();
			}
			window.API_1484_11 = Numbas.storage.lms.API;
			pipwerks.SCORM.init();
		}
	}
};

//SCORM storage object - controls saving and loading of data from the LMS
var SCORMStorage = Numbas.storage.SCORMStorage = function()
{
	this.getEntry();

	//get all question-objective indices
	this.questionIndices = {};
	var numObjectives = parseInt(this.get('objectives._count'),10);
	for(var i=0;i<numObjectives;i++)
	{
		var id = this.get('objectives.'+i+'.id');
		this.questionIndices[id]=i;
	}

	//get part-interaction indices
	this.partIndices = {};
	var numInteractions = parseInt(this.get('interactions._count'),10);
	for(var i=0;i<numInteractions;i++)
	{
		var id = this.get('interactions.'+i+'.id');
		this.partIndices[id]=i;
	}
};

SCORMStorage.prototype = {
	mode: 'ab-initio',		//'ab-initio' - starting new attempt; 'resume': load incomplete exam from storage
	e: undefined,			//reference to the main exam object
	examstore: undefined,	//exam info storage object
	id: '',					//id to be prepended to all saved data so we don't overlap with other apps
	questionIndices:{},		//associate question ids with objective indices
	partIndices:{},			//associate part ids with interaction indices
	suspendData: undefined,	//save the suspend data so we don't have to keep fetching it off the server
	
	obj: {
		score: 0,
		passed: false,
		numQuestions: 0,
		questionSubset: [],
		timeRemaining: 0,
		start: undefined,
		status: 'incomplete',
		bookmark: 0
	},

	set: function(key,value)
	{
		//Numbas.debug("set "+key+" := "+value,true);
		var val = pipwerks.SCORM.set('cmi.'+key,value);
		//Numbas.debug(pipwerks.SCORM.debug.getCode(),true);
		return val;
	},

	get: function(key)
	{
		var val = pipwerks.SCORM.get('cmi.'+key);
		//Numbas.debug("get "+key+" = "+val,true);
		//Numbas.debug(pipwerks.SCORM.debug.getCode(),true);
		return val;
	},

	//make an id string corresponding to a question
	getQuestionId: function(question)
	{
		return 'q'+question.number;
	},

	//make an id string corresponding to a part
	getPartId: function(part)
	{
		return 'q'+part.question.number+part.path;
	},

	//
	//Storage methods
	//

	//when starting a new exam, must initialise storage
	//pass in ref to exam object because global var will not be set yet
	init: function(exam)
	{
		this.e=exam;

		var set = this.set;

		this.set('completion_status','incomplete');
		this.set('exit','suspend');
		this.set('progress_measure',0);
		this.set('session_time','PT0H0M0S');
		this.set('success_status','unknown');
		this.set('score.scaled',0);
		this.set('score.raw',0);
		this.set('score.min',0);
		this.set('score.max',exam.mark);

		this.questionIndices = {};
		this.partIndices = {};

		for(var i=0; i<exam.numQuestions; i++)
		{
			this.initQuestion(exam.questionList[i]);
		}

		this.setSuspendData();
	},

	//initialise a question
	initQuestion: function(q)
	{
		var id = this.getQuestionId(q);

		var index = this.get('objectives._count');
		this.questionIndices[id] = index;

		var prepath = 'objectives.'+index+'.';

		this.set(prepath+'id', id);
		this.set(prepath+'score.min',0);
		this.set(prepath+'score.max',q.marks);
		this.set(prepath+'success_status','unknown');
		this.set(prepath+'completion_status','not attempted');
		this.set(prepath+'progress_measure',0);
		this.set(prepath+'description',q.name);

		for(var i=0; i<q.parts.length;i++)
		{
			this.initPart(q.parts[i]);
		}
	},

	//initialise a part
	initPart: function(p)
	{
		var id = this.getPartId(p);

		var index = this.get('interactions._count');
		this.partIndices[id] = index;

		var prepath = 'interactions.'+index+'.';

		this.set(prepath+'id',id);
		this.set(prepath+'objectives.0.id',this.getQuestionId(p.question));
		this.set(prepath+'weighting',p.marks);
		this.set(prepath+'result',0);
		this.set(prepath+'description',p.type);
		switch(p.type)
		{
		case '1_n_2':
		case 'm_n_2':
		case 'm_n_x':
			this.set(prepath+'type','choice');
			
			var pattern='';
			for(var i=0;i<p.settings.matrix.length;i++)
			{
				for(var j=0;j<p.settings.matrix[i].length;j++)
				{
					if(p.settings.matrix[i][j]>0)
					{
						if(pattern.length>0){pattern+='[,]';}
						pattern+=i+'-'+j;
					}
				}
			}
			this.set(prepath+'correct_responses.0.pattern',pattern);

			break;
		case 'numberentry':
			this.set(prepath+'type','numeric');
			this.set(prepath+'correct_responses.0.pattern',p.settings.minvalue+':'+p.settings.maxvalue);
			break;
		case 'patternmatch':
			this.set(prepath+'type','fill-in');
			this.set(prepath+'correct_responses.0.pattern','{case_matters='+p.settings.caseSensitive+'}{order_matters=false}'+p.settings.correctAnswer);
			break;
		case 'jme':
			this.set(prepath+'type','fill-in');
			this.set(prepath+'correct_responses.0.pattern','{case_matters=false}{order_matters=false}'+p.settings.correctAnswer);
			break;
		case 'gapfill':
			this.set(prepath+'type','other');

			for(var i=0;i<p.gaps.length;i++)
			{
				this.initPart(p.gaps[i]);
			}
			break;
		}
	},


	//save all the other stuff that doesn't fit into SCORM using the suspend_data string.
	setSuspendData: function()
	{
		var exam = this.e;
		var eobj = 
		{
			timeRemaining: exam.timeRemaining,
			questionSubset: exam.questionSubset,
			start: exam.start
		};

		eobj.questions = [];
		for(var i=0;i<exam.numQuestions;i++)
		{
			eobj.questions.push(this.questionSuspendData(exam.questionList[i]));
		}
		
		this.set('suspend_data',JSON.stringify(eobj));
		this.suspendData = eobj;
	},

	//create suspend data object for a question
	questionSuspendData: function(question)
	{
		var qobj = 
		{
			visited: question.visited,
			answered: question.answered,
			submitted: question.submitted,
			adviceDisplayed: question.adviceDisplayed,
			revealed: question.revealed,
			variables: question.variables
		};
		qobj.parts = [];
		for(var i=0;i<question.parts.length;i++)
		{
			qobj.parts.push(this.partSuspendData(question.parts[i]));
		}

		return qobj;
	},

	partSuspendData: function(part)
	{
		var pobj = {};
		switch(part.type)
		{
		case 'gapfill':
			pobj.gaps=[];
			for(var i=0;i<part.gaps.length;i++)
			{
				pobj.gaps.push(this.partSuspendData(part.gaps[i]));
			}
			break;
		case '1_n_2':
		case 'm_n_2':
		case 'm_n_x':
			pobj.shuffleChoices = part.shuffleChoices;
			pobj.shuffleAnswers = part.shuffleAnswers;
			break;
		}

		return pobj;
	},

	getSuspendData: function()
	{
		if(!this.suspendData)
			this.suspendData = JSON.parse(this.get('suspend_data'));
		return this.suspendData;
	},

	//get suspended exam info
	//returns an object 
	//{ timeRemaining, questionSubset, start, score }
	load: function() 
	{
		var eobj = this.getSuspendData();
		
		var location = this.get('location');
		if(location.length)
			location=parseInt(location,10);
		else
			location=undefined;

		return {timeRemaining: eobj.timeRemaining,
				questionSubset: eobj.questionSubset,
				start: eobj.start,
				score: parseInt(this.get('score.raw'),10),
				location: location
		};
	},

	//get suspended info for a question
	//questionNumber is the one in exam.questionSubset, not the original order
	loadQuestion: function(question) 
	{
		var eobj = this.getSuspendData();
		var qobj = eobj.questions[question.number];
		var id = this.getQuestionId(question);
		var index = this.questionIndices[id];

		return {score: parseInt(this.get('objectives.'+index+'.score.raw'),10),
				visited: qobj.visited,
				answered: qobj.answered,
				submitted: qobj.submitted,
				adviceDisplayed: qobj.adviceDisplayed,
				revealed: qobj.revealed,
				variables: qobj.variables
		};
	},

	//get suspended info for a part
	loadPart: function(part)
	{
		var eobj = this.getSuspendData();
		var pobj = eobj.questions[part.question.number].parts[part.partNumber];
		var id = this.getPartId( part );
		var index = this.partIndices[id];

		if(part.gapNumber!==undefined)
			pobj = pobj.gaps[part.gapNumber];

		var out = {};

		function get(key) { return this.get('interactions.'+index+'.'+key); };

		var answer = get('learner_response');
		switch(part.type)
		{
		case 'jme':
			out.studentAnswer = answer || '';
			break;
		case 'patternmatch':
			out.studentAnswer = answer || '';
			break;
		case 'numberentry':
			out.studentAnswer = parseFloat(answer) || 0;
			break;
		case '1_n_2':
		case 'm_n_2':
		case 'm_n_x':
			var ticks = [];
			for(var i=0;i<part.numAnswers;i++)
			{
				ticks.push([]);
				for(var j=0;j<part.numChoices;j++)
				{
					ticks[i].push(false);
				}
			}
			var tick_re=/(\d+)-(\d+)/;
			var bits = answer.split('[,]');
			for(var i=0;i<bits.length;i++)
			{
				var m = bits[i].match(tick_re);
				if(m)
				{
					var x = parseInt(m[1],10);
					var y = parseInt(m[2],10);
					ticks[x][y]=true;
				}
			}
			out.ticks = ticks;
			out.shuffleChoices = pobj.shuffleChoices;
			out.shuffleAnswers = pobj.shuffleAnswers;
			break;
		}

		return out;
	},

	//record duration of current session
	setSessionTime: function()
	{
		var timeSpent = new Date((this.e.duration - this.e.timeRemaining)*1000);
		var sessionTime = 'PT'+timeSpent.getHours()+'H'+timeSpent.getMinutes()+'M'+timeSpent.getSeconds()+'S';
		this.set('session_time',sessionTime);
	},


	//this is called when the exam is started (when the "start exam" button is pressed, not when the page is loaded
	start: function() 
	{
		this.set('completion_status','incomplete');
	},

	//this is called when the exam is paused
	pause: function() 
	{
		this.setSuspendData();
	},

	//this is called when the exam is resumed
	resume: function() {},

	//this is called when the exam is ended
	end: function()
	{
		this.setSessionTime();
		this.set('success_status',this.e.passed ? 'passed' : 'failed');
		this.set('completion_status','completed');
		pipwerks.SCORM.quit();
	},

	//get entry state: 'ab-initio' or 'resume'
	getEntry: function() 
	{
		return this.get('entry');
	},

	//get viewing mode: 
	// 'browse' - see exam info, not questions
	// 'normal' - sit exam
	// 'review' - look at answers
	getMode: function() 
	{
		return this.get('mode');
	},

	//called when question is changed
	changeQuestion: function(question)
	{
		this.set('location',question.number);	//set bookmark
		this.setSuspendData();	//because currentQuestion.visited has changed
	},

	//called when a part is answered
	partAnswered: function(part)
	{
		var id = this.getPartId(part);
		var index = this.partIndices[id];

		var prepath = 'interactions.'+index+'.';

		this.set(prepath+'result',part.score);

		switch(part.type)
		{
		case 'jme':
			this.set(prepath+'learner_response',part.studentAnswer);
			break;
		case 'patternmatch':
			this.set(prepath+'learner_response',part.studentAnswer);
			break;
		case 'numberentry':
			this.set(prepath+'learner_response',part.studentAnswer);
			break;
		case '1_n_2':
		case 'm_n_2':
		case 'm_n_x':
			var s='';
			for(var i=0;i<part.numAnswers;i++)
			{
				for( var j=0;j<part.numChoices;j++ )
				{
					if(part.ticks[i][j])
					{
						if(s.length){s+='[,]';}
						s+=i+'-'+j;
					}
				}
			}
			this.set(prepath+'learner_response',s);
			break;
		}
	},

	//called when current question is submitted
	submitQuestion: function(question) 
	{
		var exam = Numbas.exam;
		//update total exam score and so on
		this.set('score.raw',exam.score);
		this.set('score.scaled',exam.score/exam.mark);

		var id = this.getQuestionId(question);
		var index = this.questionIndices[id];

		var prepath = 'objectives.'+index+'.';

		this.set(prepath+'score.raw',question.score);
		this.set(prepath+'score.scaled',question.score/question.marks);
		this.set(prepath+'success_status', question.score==question.marks ? 'passed' : 'failed' );
		this.set(prepath+'completion_status', question.answered ? 'completed' : 'incomplete' );
	},

	//record that the student displayed question advice
	adviceDisplayed: function(question)
	{
		this.setSuspendData();
	},

	//record that the student revealed the answer to a question
	answerRevealed: function(question)
	{
		this.setSuspendData();
	}
};

});
