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

/** @file The {@link Numbas.Question} object */

Numbas.queueScript('standard_parts',['parts/jme','parts/patternmatch','parts/numberentry','parts/matrixentry','parts/multipleresponse','parts/gapfill','parts/information','parts/extension'],function() {});

Numbas.queueScript('question',['base','schedule','display','jme','jme-variables','xml','util','scorm-storage','part','standard_parts'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;

var job = Numbas.schedule.add;

var tryGetAttribute = Numbas.xml.tryGetAttribute;

/** Keeps track of all info to do with an instance of a single question
 *
 * @constructor
 * @memberof Numbas
 * @param {Numbas.Exam} exam - parent exam
 * @param {Numbas.QuestionGroup} group - group this question belongs to
 * @param {Element} xml
 * @param {number} number - index of this question in the exam (starting at 0)
 * @param {boolean} loading - is this question being resumed from an existing session?
 * @param {Numbas.jme.Scope} gscope - global JME scope
 */
var Question = Numbas.Question = function( exam, group, xml, number, loading, gscope)
{
	var question = this;
	var q = question;
	q.exam = exam;
    q.group = group;
	q.adviceThreshold = q.exam.adviceGlobalThreshold;
	q.xml = xml;
	q.originalXML = q.xml;
	q.number = number;
	q.scope = new jme.Scope(gscope);
    q.scope.question = q;
	q.preamble = {
		'js': '',
		'css': ''
	};
	q.callbacks = {
		HTMLAttached: [],
		variablesGenerated: []
	};

	//get question's name
	tryGetAttribute(q,q.xml,'.','name');

	job = function(fn,that) {
		function handleError(e) {
			e.message = R('question.error',{'number':q.number+1,message:e.message});
			throw(e);
		}
		Numbas.schedule.add({task: fn, error: handleError},that);
	}

	if(loading)
	{
		// check the suspend data was for this question - if the test is updated and the question set changes, this won't be the case!
		var qobj = Numbas.store.loadQuestion(q);

		if(qobj.name && qobj.name!=q.name) {
			throw(new Numbas.Error('question.loaded name mismatch'));
		}
	}

	job(function() {
		var preambleNodes = q.xml.selectNodes('preambles/preamble');
		for(var i = 0; i<preambleNodes.length; i++) {
			var lang = preambleNodes[i].getAttribute('language');
			q.preamble[lang] = Numbas.xml.getTextContent(preambleNodes[i]);
		}

		q.runPreamble();
	});

	job(function() {
		var functionsTodo = Numbas.xml.loadFunctions(q.xml,q.scope);
		q.scope.functions = Numbas.jme.variables.makeFunctions(functionsTodo,q.scope,{question:q});
		//make rulesets
		var rulesetNodes = q.xml.selectNodes('rulesets/set');

		var sets = {};
		sets['default'] = ['unitFactor','unitPower','unitDenominator','zeroFactor','zeroTerm','zeroPower','collectNumbers','zeroBase','constantsFirst','sqrtProduct','sqrtDivision','sqrtSquare','otherNumbers'];
		for(var i=0; i<rulesetNodes.length; i++)
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

			sets[name] = set;
		}

		for(var name in sets)
		{
			q.scope.rulesets[name] = Numbas.jme.collectRuleset(sets[name],q.scope.rulesets);
		}
	});

	job(function() {
		var variablesTodo = q.variablesTodo = Numbas.xml.loadVariables(q.xml,q.scope);
		if(loading)
		{
			var qobj = Numbas.store.loadQuestion(q);
			for(var x in qobj.variables)
			{
				q.scope.variables[x] = qobj.variables[x];
			}
		}
		else
		{
			q.variablesTest = {
				condition: '',
				maxRuns: 10
			};
			tryGetAttribute(q.variablesTest,q.xml,'variables',['condition','maxRuns'],[]);
			var conditionSatisfied = false;
			var condition = jme.compile(q.variablesTest.condition);
			var runs = 0;
			var scope;
			while(runs<q.variablesTest.maxRuns && !conditionSatisfied) {
				runs += 1;
				scope = new jme.Scope([q.scope]);
				var result = jme.variables.makeVariables(variablesTodo,q.scope,condition);
				scope.variables = result.variables;
				conditionSatisfied = result.conditionSatisfied;
			}
			if(!conditionSatisfied) {
				throw(new Numbas.Error('jme.variables.question took too many runs to generate variables'));
			} else {
				q.scope = scope;
			}
		}
	
		q.scope = new jme.Scope([gscope,q.scope]);

		q.unwrappedVariables = {};
		for(var name in q.scope.variables) {
			q.unwrappedVariables[name] = Numbas.jme.unwrapValue(q.scope.variables[name]);
		}

		q.runCallbacks('variablesGenerated');
	});

	job(this.subvars,this);

	job(function()
	{
		//initialise display - get question HTML, make menu item, etc.
		q.display = new Numbas.display.QuestionDisplay(q);
	});

	job(function() 
	{
		//load parts
		q.parts=new Array();
		q.partDictionary = {};
		var parts = q.xml.selectNodes('parts/part');
		for(var j = 0; j<parts.length; j++)
		{
			var part = Numbas.createPart(parts[j], 'p'+j,q,null, loading);
			q.parts[j] = part;
			q.marks += part.marks;
		}

		q.display.makeHTML();
	});
	job(function() {
		q.runCallbacks('HTMLAttached');
	});
	job(function() {
		if(loading)
		{
			var qobj = Numbas.store.loadQuestion(q);

			q.adviceDisplayed = qobj.adviceDisplayed;
			q.answered = qobj.answered;
			q.revealed = qobj.revealed;
			q.submitted = qobj.submitted;
			q.visited = qobj.visited;
			q.score = qobj.score;

			if(q.revealed)
				q.revealAnswer(true);
			else if(q.adviceDisplayed)
				q.getAdvice(true);

			for(var j=0;j<q.parts.length;j++) {
				q.parts[j].display.restoreAnswer();
			}
		}

		q.updateScore();
		
		q.display.showScore();
	});

}
Question.prototype = /** @lends Numbas.Question.prototype */ 
{
	/** XML definition of this question 
	 * @type {Element}
	 */
	xml: null,
	/** Position of this question in the exam
	 * @type {number}
	 */
	number: -1,
	/** Name - shouldn't be shown to students
	 * @type {string}
	 */
	name: '',
	
	/** Maximum marks available for this question
	 * @type {number}
	 */
	marks: 0,

	/** Student's score on this question
	 * @type {number}
	 */
	score: 0,

	/** Percentage score below which the advice is revealed
	 * @type {number}
	 */
	adviceThreshold: 0,

	/** Has this question been seen by the student? For determining if you can jump back to this question, when {@link Numbas.Question.navigateBrowse} is disabled.
	 * @type {boolean}
	 */
	visited: false,

	/** Has this question been answered satisfactorily?
	 * @type {boolean}
	 */
	answered: false,

	/** Number of times this question has been submitted.
	 * @type {number}
	 */
	submitted: 0,

	/** Has the advice been displayed?
	 * @type {boolean}
	 */
	adviceDisplayed: false,

	/** Have correct answers been revealed?
	 * @type {boolean}
	 */
	revealed: false,

	/** Parts belonging to this question, in the order they're displayed.
	 * @type {Numbas.parts.Part}
	 */
	parts: [],

	/** Dictionary mapping part addresses (of the form `qXpY[gZ]`) to {@link Numbas.parts.Part} objects.
	 * @type {object}
	 */
	partDictionary: {},

	/** Associated display object
	 * @type {Numbas.display.QuestionDisplay}
	 */
	display: undefined,

	/** Callbacks to run when the question's HTML is attached to the page
	 * @type {object.Array.<function>}
	 */
	callbacks: {
		HTMLAttached: [],
		variablesGenerated: []
	},

	/** Run the callbacks for a given event
	 *
	 * @param {string} name - name of the event
	 */
	runCallbacks: function(name) {
		var callbacks = this.callbacks[name];
		for(var i=0;i<callbacks.length;i++) {
			callbacks[i](this);
		}
	},

	/** Leave this question - called when moving to another question, or showing an info page. 
	 * @see Numbas.display.QuestionDisplay.leave
	 */
	leave: function() {
		this.display.leave();
	},

	/** Execute the question's JavaScript preamble - should happen as soon as the configuration has been loaded from XML, before variables are generated. */
	runPreamble: function() {
		with({
			question: this
		}) {
			var js = '(function() {'+this.preamble.js+'\n})()';
			try{
				eval(js);
			} catch(e) {
				var errorName = e.name=='SyntaxError' ? 'question.preamble.syntax error' : 'question.preamble.error';
				throw(new Numbas.Error(errorName,{'number':this.number+1,message:e.message}));
			}
		}
	},

	/** Substitute the question's variables into its XML - clones the XML so the original is untouched.
	 */
	subvars: function()
	{
		var q = this;
		var doc = Sarissa.getDomDocument();
		doc.appendChild(q.originalXML.cloneNode(true));	//get a fresh copy of the original XML, to sub variables into
		q.xml = doc.selectSingleNode('question');
		q.xml.setAttribute('number',q.number);
		q.name = jme.contentsubvars(q.name,q.scope);
	},

	/** Get the part object corresponding to a path
	 * @param {partpath} path
	 * @returns {Numbas.parts.Part}
	 */
	getPart: function(path)
	{
		return this.partDictionary[path];
	},

	/** Show the question's advice
	 * @param {boolean} dontStore - Don't tell the storage that the advice has been shown - use when loading from storage!
	 */
	getAdvice: function(dontStore)
	{
		this.adviceDisplayed = true;
		this.display.showAdvice(true);
		if(!dontStore)
			Numbas.store.adviceDisplayed(this);
	},

	/** Reveal the correct answers to the student
	 * @param {booelan} dontStore - Don't tell the storage that the advice has been shown - use when loading from storage!
	 */
	revealAnswer: function(dontStore)
	{
		this.revealed = true;
		
		//display advice if allowed
		this.getAdvice(dontStore);

		//part-specific reveal code. Might want to do some logging in future? 
		for(var i=0; i<this.parts.length; i++) {
			this.parts[i].revealAnswer(dontStore);
        }

		//display revealed answers
		this.display.end();
		this.display.revealAnswer();

		this.display.showScore();

		if(!dontStore) {
			Numbas.store.answerRevealed(this);
		}

		this.exam.updateScore();
	},

	/** Validate the student's answers to the question. True if all parts are either answered or have no marks available.
	 * @returns {boolean}
	 */
	validate: function()
	{
		var success = true;
		for(i=0; i<this.parts.length; i++)
		{
			success = success && (this.parts[i].answered || this.parts[i].marks==0);
		}
		return success;
	},

	/** Has anything been changed since the last submission? If any part has `isDirty` set to true, return true.
	 * @returns {boolean}
	 */
	isDirty: function()
	{
        if(this.revealed) {
            return false;
        }
		for(var i=0;i<this.parts.length; i++) {
			if(this.parts[i].isDirty)
				return true;
		}
		return false;
	},

	/** Show a warning and return true if the question is dirty.
	 * @see Numbas.Question.isDirty
	 * @returns {boolean}
	 */
	leavingDirtyQuestion: function() {
		if(this.answered && this.isDirty()) {
			Numbas.display.showAlert(R('question.unsubmitted changes',{count:this.parts.length}));
			return true;
		}
	},

	/** Mark the student's answer to a given part/gap/step.
	 */
	doPart: function(answerList, partRef)
	{
		var part = this.getPart(partRef);
		if(!part)
			throw(new Numbas.Error('question.no such part',{path:partRef}));
		part.storeAnswer(answerList);
	},

	/** Calculate the student's total score for this questoin - adds up all part scores 
	 */
	calculateScore: function()
	{
		var tmpScore=0;
		var answered = true;
		for(var i=0; i<this.parts.length; i++)
		{
			tmpScore += this.parts[i].score;
			answered = answered && this.parts[i].answered;
		}
		this.answered = answered;
		
		this.score = tmpScore;
	},


	/** Submit every part in the question */
	submit: function()
	{
		//submit every part
		for(var i=0; i<this.parts.length; i++)
		{
			this.parts[i].submit();
		}

		//validate every part
		//displays warning messages if appropriate, 
		//and returns false if any part is not completed sufficiently
		this.answered = this.validate();

		//keep track of how many times question successfully submitted
		if(this.answered)
			this.submitted += 1;

		//display message about success or failure
		if(! this.answered )
		{
			Numbas.display.showAlert(R('question.can not submit'));
			this.display.scrollToError();
		}

							
		this.updateScore();

		if(this.exam.adviceType == 'threshold' && 100*this.score/this.marks < this.adviceThreshold )
		{
			this.getAdvice();
		}
		Numbas.store.questionSubmitted(this);
	},

	/** Recalculate the student's score, update the display, and notify storage. */
	updateScore: function()
	{
		//calculate score - if warning is uiPrevent then score is 0
		this.calculateScore('uwNone');

		//update total exam score
		this.exam.updateScore();

		//display score - ticks and crosses etc.
		this.display.showScore();

		//notify storage
		Numbas.store.saveQuestion(this);
	},

	/** Add a callback function to run when the question's HTML is attached to the page
	 *
	 * @param {function} fn
	 */
	onHTMLAttached: function(fn) {
		this.callbacks.HTMLAttached.push(fn);
	},

	/** Add a callback function to run when the question's variables are generated (but before the HTML is attached)
	 *
	 * @param {function} fn
	 */
	onVariablesGenerated: function(fn) {
		this.callbacks.variablesGenerated.push(fn);
	}
};

});
