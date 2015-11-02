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

/** @file Provides a storage API {@link Numbas.storage.SCORMstorage} which interfaces with SCORM */

Numbas.queueScript('scorm-storage',['base','SCORM_API_wrapper','storage'],function() {

/** SCORM storage object - controls saving and loading of data from the LMS 
 * @constructor
 * @memberof Numbas.storage
 * @augments Numbas.storage.BlankStorage
 */
var SCORMStorage = Numbas.storage.SCORMStorage = function()
{
	if(!pipwerks.SCORM.init())
	{
		var errorCode = pipwerks.SCORM.debug.getCode();
		if(errorCode) {
			throw(new Numbas.Error(R('scorm.error initialising',pipwerks.SCORM.debug.getInfo(errorCode))));
		}

		//if the pretend LMS extension is loaded, we can start that up
		if(Numbas.storage.PretendLMS)
		{
			if(!Numbas.storage.lms)
			{
				Numbas.storage.lms = new Numbas.storage.PretendLMS();
			}
			window.API_1484_11 = Numbas.storage.lms.API;
			pipwerks.SCORM.init();
		}
		//otherwise return a blank storage object which does nothing
		else
		{
			return new Numbas.storage.BlankStorage();	
		}
	}

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

SCORMStorage.prototype = /** @lends Numbas.storage.SCORMstorage.prototype */ {
	/** Mode the session started in:
	 *
	 * * `ab-initio` - starting a new attempt
	 * * `resume` - loaded attempt in progress
	 */
	mode: 'ab-initio',
	
	/** reference to the {@link Numbas.Exam} object for the current exam */
	exam: undefined,			//reference to the main exam object

	/** Dictionary mapping question ids (of the form `qN`) to `cmi.objective` indices */
	questionIndices:{},		//associate question ids with objective indices

	/** Dictionary mapping {@link partpath} ids to `cmi.interaction` indices */
	partIndices:{},			//associate part ids with interaction indices

	/** The last `cmi.suspend_data` object 
	 * @type {json} 
	 */
	suspendData: undefined,	//save the suspend data so we don't have to keep fetching it off the server
	
	/** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server */
	save: function()
	{
		var exam = this.exam;
		function trySave() {
			exam.display.saving(true);
			var saved = pipwerks.SCORM.save();

			if(!saved) {
				Numbas.display.showAlert(R('scorm.failed save'),function(){
					setTimeout(trySave,1);
				});
			}
			else
				exam.display.saving(false);
		}
		trySave();
	},

	/** Set a SCORM data model element.
	 * @param {string} key - element name. This is prepended with `cmi.`
	 * @param {string} value - element value
	 * @returns {boolean} - did the call succeed?
	 */
	set: function(key,value)
	{
		//Numbas.debug("set "+key+" := "+value,true);
		var val = pipwerks.SCORM.set('cmi.'+key,value);
		//Numbas.debug(pipwerks.SCORM.debug.getCode(),true);
		return val;
	},

	/** Get a SCORM data model element
	 * @param {string} key - element name. This is prepended with `cmi.`
	 * @returns {string} - the value of the element
	 */
	get: function(key)
	{
		var val = pipwerks.SCORM.get('cmi.'+key);
		//Numbas.debug("get "+key+" = "+val,true);
		//Numbas.debug(pipwerks.SCORM.debug.getCode(),true);
		return val;
	},

	/** Make an id string corresponding to a question, of the form `qN`, where `N` is the question's number
	 * @param {Numbas.Question} question
	 * @returns {string}
	 */
	getQuestionId: function(question)
	{
		return 'q'+question.number;
	},

	/** Make an id string corresponding to a part, of the form `qNpXgYsZ`
	 * @param {Numbas.parts.Part} part
	 * @returns {string}
	 */
	getPartId: function(part)
	{
		return this.getQuestionId(part.question)+part.path;
	},

	/** Load student's name and ID
	 */
	get_student_name: function() {
		this.exam.student_name = this.get('learner_name');
		this.exam.student_id = this.get('learner_id');
	},

	/** Initialise the SCORM data model and this storage object.
	 * @param {Numbas.Exam} exam
	 */
	init: function(exam)
	{
		this.exam = exam;

		this.get_student_name();

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

		for(var i=0; i<exam.settings.numQuestions; i++)
		{
			this.initQuestion(exam.questionList[i]);
		}

		this.setSuspendData();
	},

	/** Initialise a question - make an objective for it, and initialise all its parts.
	 * @param {Numbas.Question} q
	 */
	initQuestion: function(q)
	{
		var id = this.getQuestionId(q);

		var index = this.get('objectives._count');
		this.questionIndices[id] = index;

		var prepath = 'objectives.'+index+'.';

		this.set(prepath+'id', id);
		this.set(prepath+'score.min',0);
		this.set(prepath+'score.max',q.marks);
		this.set(prepath+'score.raw',q.score || 0);
		this.set(prepath+'success_status','unknown');
		this.set(prepath+'completion_status','not attempted');
		this.set(prepath+'progress_measure',0);
		this.set(prepath+'description',q.name);

		for(var i=0; i<q.parts.length;i++)
		{
			this.initPart(q.parts[i]);
		}
	},

	/** Initialise a part - make an interaction for it, and set up correct responses.
	 * @param {Numbas.parts.Part} part
	 */
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
			this.set(prepath+'correct_responses.0.pattern',Numbas.math.niceNumber(p.settings.minvalue)+'[:]'+Numbas.math.niceNumber(p.settings.maxvalue));
			break;
		case 'matrix':
			this.set(prepath+'type','fill-in');
			this.set(prepath+'correct_responses.0.pattern','{case_matters=false}{order_matters=false}'+JSON.stringify(p.settings.correctAnswer));
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

		for(var i=0;i<p.steps.length;i++)
		{
			this.initPart(p.steps[i]);
		}
	},


	/** Save all the other stuff that doesn't fit into the standard SCORM data model using the `cmi.suspend_data` string.
	 */
	setSuspendData: function()
	{
		var exam = this.exam;
		if(exam.loading)
			return;
		var eobj = 
		{
			timeRemaining: exam.timeRemaining || 0,
			duration: exam.settings.duration || 0,
			questionSubset: exam.questionSubset,
			start: exam.start
		};

		eobj.questions = [];
		for(var i=0;i<exam.settings.numQuestions;i++)
		{
			eobj.questions.push(this.questionSuspendData(exam.questionList[i]));
		}
		
		this.set('suspend_data',JSON.stringify(eobj));
		this.setSessionTime();
		this.suspendData = eobj;
	},

	/** Create suspend data object for a question
	 * @param {Numbas.Question} question
	 * @returns {object}
	 * @see Numbas.storage.SCORMstorage.setSuspendData
	 */
	questionSuspendData: function(question)
	{
		var qobj = 
		{
			name: question.name,
			visited: question.visited,
			answered: question.answered,
			submitted: question.submitted,
			adviceDisplayed: question.adviceDisplayed,
			revealed: question.revealed
		};

		qobj.variables = {};
		for(var name in question.scope.variables)
		{
			qobj.variables[name] = Numbas.jme.display.treeToJME({tok: question.scope.variables[name]},{niceNumber:false});
		}

		qobj.parts = [];
		for(var i=0;i<question.parts.length;i++)
		{
			qobj.parts.push(this.partSuspendData(question.parts[i]));
		}

		return qobj;
	},

	/** Create suspend data object for a part
	 * @param {Numbas.parts.Part} part
	 * @returns {object}
	 * @see Numbas.storage.SCORMstorage.setSuspendData
	 */
	partSuspendData: function(part)
	{
		var pobj = {
			answered: part.answered,
			stepsShown: part.stepsShown,
			stepsOpen: part.stepsOpen
		};
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
			pobj.shuffleChoices = Numbas.math.inverse(part.shuffleChoices);
			pobj.shuffleAnswers = Numbas.math.inverse(part.shuffleAnswers);
			break;
		}

		pobj.steps = [];
		for(var i=0;i<part.steps.length;i++)
		{
			pobj.steps.push(this.partSuspendData(part.steps[i]));
		}

		return pobj;
	},

	/** Get the suspend data from the SCORM data model
	 * @returns {object}
	 */
	getSuspendData: function()
	{
		try {
			if(!this.suspendData)
			{
				var suspend_data = this.get('suspend_data');
				if(suspend_data.length)
					this.suspendData = JSON.parse(suspend_data);
			}
			if(!this.suspendData) {
				throw(new Numbas.Error('scorm.no exam suspend data'));
			}
		} catch(e) {
			throw(new Numbas.Error('scorm.error loading suspend data',e.message));
		}
		return this.suspendData;
	},

	/** Get suspended exam info
	 * @param {Numbas.Exam} exam
	 * @returns {exam_suspend_data}
	 */
	load: function(exam) 
	{
		this.exam = exam;

		this.get_student_name();

		var eobj = this.getSuspendData();
		this.set('exit','suspend');
		
		var currentQuestion = this.get('location');
		if(currentQuestion.length)
			currentQuestion=parseInt(currentQuestion,10);
		else
			currentQuestion=undefined;

		var score = parseInt(this.get('score.raw'),10);

		return {timeRemaining: eobj.timeRemaining || 0,
				duration: eobj.duration || 0 ,
				questionSubset: eobj.questionSubset,
				start: eobj.start,
				score: score,
				currentQuestion: currentQuestion
		};
	},

	/** Get suspended info for a question
	 * @param {Numbas.Question} question
	 * @returns {question_suspend_data}
	 */
	loadQuestion: function(question) 
	{
		try {
			var eobj = this.getSuspendData();
			var qobj = eobj.questions[question.number];
			if(!qobj) {
				throw(new Numbas.Error('scorm.no question suspend data'));
			}
			var id = this.getQuestionId(question);
			var index = this.questionIndices[id];

			var variables = {};
			for(var name in qobj.variables)
			{
				variables[name] = Numbas.jme.evaluate(qobj.variables[name],question.scope);
			}

			return {
					name: qobj.name,
					score: parseInt(this.get('objectives.'+index+'.score.raw') || 0,10),
					visited: qobj.visited,
					answered: qobj.answered,
					submitted: qobj.submitted,
					adviceDisplayed: qobj.adviceDisplayed,
					revealed: qobj.revealed,
					variables: variables
			};
		} catch(e) {
			throw(new Numbas.Error('scorm.error loading question',question.number,e.message));
		}
	},

	/** Get suspended info for a part
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadPart: function(part)
	{
		try {
			var eobj = this.getSuspendData();
			var pobj = eobj.questions[part.question.number];
			var re = /(p|g|s)(\d+)/g;
			while(m = re.exec(part.path))
			{
				var i = parseInt(m[2]);
				switch(m[1])
				{
				case 'p':
					pobj = pobj.parts[i];
					break;
				case 'g':
					pobj = pobj.gaps[i];
					break;
				case 's':
					pobj = pobj.steps[i];
					break;
				}
			}
			if(!pobj) {
				throw(new Numbas.Error('scorm.no part suspend data'));
			}

			var id = this.getPartId( part );
			var index = this.partIndices[id];
			var sc = this;
			function get(key) { return sc.get('interactions.'+index+'.'+key); };

			pobj.answer = get('learner_response');

			return pobj;
		} catch(e) {
			throw(new Numbas.Error('scorm.error loading part',part.path,e.message));
		}
	},

	/** Load a {@link Numbas.parts.JMEPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadJMEPart: function(part)
	{
		var out = this.loadPart(part);
		out.studentAnswer = out.answer || '';
		return out;
	},

	/** Load a {@link Numbas.parts.PatternMatchPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadPatternMatchPart: function(part)
	{
		var out = this.loadPart(part);
		out.studentAnswer = out.answer || '';
		return out;
	},

	/** Load a {@link Numbas.parts.NumberEntryPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadNumberEntryPart: function(part)
	{
		var out = this.loadPart(part);
		out.studentAnswer = out.answer || '';
		return out;
	},

	/** Load a {@link Numbas.parts.NumberEntryPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadMatrixEntryPart: function(part)
	{
		var out = this.loadPart(part);
		if(out.answer) {
			out.studentAnswer = JSON.parse(out.answer);
		} else {
			out.studentAnswer = null;
		}
		return out;
	},

	/** Load a {@link Numbas.parts.MultipleResponsePart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadMultipleResponsePart: function(part)
	{
		var out = this.loadPart(part);

		if(part.numAnswers===undefined)
			return out;
		var ticks = [];
		var w = part.numAnswers;
		var h = part.numChoices;
		if(w==0 || h==0) {
			out.ticks = [];
			return out;
		}
		for(var i=0;i<w;i++)
		{
			ticks.push([]);
			for(var j=0;j<h;j++)
			{
				ticks[i].push(false);
			}
		}
		var tick_re=/(\d+)-(\d+)/;
		var bits = out.answer.split('[,]');
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
		return out;
	},

	/** Record duration of the current session
	 */
	setSessionTime: function()
	{
		var timeSpent = new Date(this.exam.timeSpent*1000);
		var sessionTime = 'PT'+timeSpent.getHours()+'H'+timeSpent.getMinutes()+'M'+timeSpent.getSeconds()+'S';
		this.set('session_time',sessionTime);
	},


	/** Call this when the exam is started (when {@link Numbas.Exam#begin} runs, not when the page loads) */
	start: function() 
	{
		this.set('completion_status','incomplete');
	},

	/** Call this when the exam is paused ({@link Numbas.Exam#pause}) */
	pause: function() 
	{
		this.setSuspendData();
	},

	/** Call this when the exam is resumed ({@link Numbas.Exam#resume}) */
	resume: function() {},

	/** Call this when the exam ends ({@link Numbas.Exam#end}) */
	end: function()
	{
		this.setSessionTime();
		this.set('success_status',this.exam.passed ? 'passed' : 'failed');
		this.set('completion_status','completed');
		pipwerks.SCORM.quit();
	},

	/** Get the student's ID
	 * @returns {string}
	 */
	getStudentID: function() {
		var id = this.get('learner_id');
		return id || null;
	},

	/** Get entry state: `ab-initio`, or `resume`
	 * @returns {string}
	 */
	getEntry: function() 
	{
		return this.get('entry');
	},

	/** Get viewing mode: 
	 *
	 * * `browse` - see exam info, not questions
	 * * `normal` - sit exam
	 * * `review` - look at completed exam
	 * @returns {string}
	 */
	getMode: function() 
	{
		return this.get('mode');
	},

	/** Call this when the student moves to a different question
	 * @param {Numbas.Question} question
	 */
	changeQuestion: function(question)
	{
		this.set('location',question.number);	//set bookmark
		this.setSuspendData();	//because currentQuestion.visited has changed
	},

	/** Call this when a part is answered
	 * @param {Numbas.parts.Part} part
	 */
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
		case 'matrix':
			this.set(prepath+'learner_response',JSON.stringify(part.studentAnswer));
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
		this.setSuspendData();
	},

	/** Save exam-level details (just score at the mo)
	 * @param {Numbas.Exam} exam
	 */
	saveExam: function(exam)
	{
		if(exam.loading)
			return;

		//update total exam score and so on
		this.set('score.raw',exam.score);
		this.set('score.scaled',exam.score/exam.mark || 0);
	},

	/* Save details about a question - save score and success status
	 * @param {Numbas.Question} question
	 */
	saveQuestion: function(question) 
	{
		if(question.exam.loading)
			return;

		var id = this.getQuestionId(question);

		if(!(id in this.questionIndices))
			return;

		var index = this.questionIndices[id];


		var prepath = 'objectives.'+index+'.';

		this.set(prepath+'score.raw',question.score);
		this.set(prepath+'score.scaled',question.score/question.marks || 0);
		this.set(prepath+'success_status', question.score==question.marks ? 'passed' : 'failed' );
		this.set(prepath+'completion_status', question.answered ? 'completed' : 'incomplete' );
	},

	/** Record that a question has been submitted
	 * @param {Numbas.Question} question
	 */
	questionSubmitted: function(question)
	{
		this.save();
	},

	/** Record that the student displayed question advice
	 * @param {Numbas.Question} question
	 */
	adviceDisplayed: function(question)
	{
		this.setSuspendData();
	},

	/** Record that the student revealed the answers to a question
	 * @param {Numbas.Question} question
	 */
	answerRevealed: function(question)
	{
		this.setSuspendData();
		this.save();
	},

	/** Record that the student showed the steps for a part
	 * @param {Numbas.parts.Part} part
	 */
	stepsShown: function(part)
	{
		this.setSuspendData();
		this.save();
	},
	
	/** Record that the student hid the steps for a part
	 * @param {Numbas.parts.Part} part
	 */
	stepsHidden: function(part)
	{
		this.setSuspendData();
		this.save();
	}
	
};

});
