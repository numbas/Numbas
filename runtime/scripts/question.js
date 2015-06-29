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

/** @file The {@link Numbas.Question} object, and {@link Numbas.parts} */

Numbas.queueScript('question',['base','schedule','display','jme','jme-variables','xml','util','scorm-storage'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;

var job = Numbas.schedule.add;

var tryGetAttribute = Numbas.xml.tryGetAttribute;

/** A unique identifier for a {@link Numbas.parts.Part} object, of the form `qXpY[gZ|sZ]`. Numbering starts from zero, and the `gZ` bit is used only when the part is a gap, and `sZ` is used if it's a step.
 * @typedef partpath
 * @type {string}
 */

/** Keeps track of all info to do with an instance of a single question
 *
 * @constructor
 * @memberof Numbas
 * @param {Numbas.Exam} exam - parent exam
 * @param {Element} xml
 * @param {number} number - index of this question in the exam (starting at 0)
 * @param {boolean} loading - is this question being resumed from an existing session?
 * @param {Numbas.jme.Scope} gscope - global JME scope
 */
var Question = Numbas.Question = function( exam, xml, number, loading, gscope)
{
	var question = this;
	var q = question;
	q.exam = exam;
	q.adviceThreshold = q.exam.adviceGlobalThreshold;
	q.xml = xml;
	q.originalXML = q.xml;
	q.number = number;
	q.scope = new jme.Scope(gscope);
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
			e.message = R('question.error',q.number+1,e.message);
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
			var part = createPart(parts[j], 'p'+j,q,null, loading);
			q.parts[j] = part;
			q.marks += part.marks;
		}

		q.display.makeHTML();

		q.runCallbacks('HTMLAttached');

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
				throw(new Numbas.Error(errorName,this.number+1,e.message));
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
		q.name = jme.subvars(q.name,q.scope);
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
		for(var i=0; i<this.parts.length; i++)
			this.parts[i].revealAnswer(dontStore);

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
			Numbas.display.showAlert(R(this.parts.length>1 ? 'question.unsubmitted changes.several parts' : 'question.unsubmitted changes.one part'));
			return true;
		}
	},

	/** Mark the student's answer to a given part/gap/step.
	 */
	doPart: function(answerList, partRef)
	{
		var part = this.getPart(partRef);
		if(!part)
			throw(new Numbas.Error('question.no such part',partRef));
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

Numbas.parts = {};


/** Create a new question part. Automatically picks the right constructor based on the type defined in the XML.
 * @param {Element} xml
 * @param {partpath} path
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {boolean} loading
 * @returns {Numbas.parts.Part}
 * @throws {NumbasError} "part.missing type attribute" if the top node in `xml` doesn't have a "type" attribute.
 * @memberof Numbas
 */
function createPart(xml, path, question, parentPart, loading)
{
	var type = tryGetAttribute(null,xml,'.','type',[]);
	if(type==null)
		throw(new Numbas.Error('part.missing type attribute'));
	if(partConstructors[type])
	{
		var cons = partConstructors[type];
		var part = new cons(xml, path, question, parentPart, loading);
		if(part.customConstructor) {
			part.customConstructor.apply(part);
		}
		if(loading && part.answered) {
			part.submit();
		}
		return part;
	}
	else
	{
		throw(new Numbas.Error('part.unknown type',type));
	}
}

/** Question part types
 * @namespace Numbas.parts */

/** Base question part object
 * @constructor
 * @memberof Numbas.parts
 * @param {Element} xml
 * @param {partpath} path
 * @param {Numbas.Question} Question
 * @param {Numbas.parts.Part} parentPart
 * @param {boolean} loading
 * @see {Numbas.createPart}
 */
var Part = Numbas.parts.Part = function( xml, path, question, parentPart, loading )
{
	//remember XML
	this.xml = xml;

	//remember parent question object
	this.question = question;

	//remember parent part object, so scores can percolate up for steps/gaps
	this.parentPart = parentPart;
	
	//remember a path for this part, for stuff like marking and warnings
	this.path = path;
	this.question.partDictionary[path] = this;

	//initialise settings object
	this.settings = util.copyobj(Part.prototype.settings);
	
	tryGetAttribute(this,this.xml,'.',['type','marks']);

	tryGetAttribute(this.settings,this.xml,'.',['minimumMarks','enableMinimumMarks','stepsPenalty','showCorrectAnswer'],[]);

	//initialise gap and step arrays
	this.gaps = [];
	this.steps = [];

	//load steps
	var stepNodes = xml.selectNodes('steps/part');
	for(var i=0; i<stepNodes.length; i++)
	{
		var step = createPart( stepNodes[i], this.path+'s'+i,this.question, this, loading);
		this.steps[i] = step;
		this.stepsMarks += step.marks;
	}

	this.markingFeedback = [];

	this.scripts = {};
	var scriptNodes = xml.selectNodes('scripts/script');
	for(var i=0;i<scriptNodes.length; i++) {
		var name = scriptNodes[i].getAttribute('name');
		var order = scriptNodes[i].getAttribute('order');
		var script = Numbas.xml.getTextContent(scriptNodes[i]);
		var withEnv = {
			variables: this.question.unwrappedVariables,
			question: this.question,
			part: this
		};
		with(withEnv) {
			script = eval('(function(){try{'+script+'\n}catch(e){Numbas.showError(new Numbas.Error(\'part.script.error\',this.path,name,e.message))}})');
		}
		this.scripts[name] = {script: script, order: order};
	}

	this.applyScripts();

	//initialise display code
	this.display = new Numbas.display.PartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadPart(this);
		this.answered = pobj.answered;
		this.stepsShown = pobj.stepsShown;
		this.stepsOpen = pobj.stepsOpen;
	}
}

Part.prototype = /** @lends Numbas.parts.Part.prototype */ {
	/** XML defining this part
	 * @type {Element}
	 */
	xml: '',				
	
	/** The question this part belongs to
	 * @type {Numbas.Question}
	 */
	question: undefined,

	/** Reference to parent of this part, if this is a gap or a step
	 * @type {Numbas.parts.Part}
	 */
	parentPart: undefined,

	/** A question-wide unique 'address' for this part.
	 * @type {partpath}
	 */
	path: '',

	/** This part's type, e.g. "jme", "numberentry", ...
	 * @type {string}
	 */
	type: '',

	/** Maximum marks available for this part
	 * @type {number}
	 */
	marks: 0,

	/** Marks available for the steps, if any
	 * @type {number}
	 */
	stepsMarks: 0,

	/** Proportion of available marks awarded to the student - i.e. `score/marks`. Penalties will affect this instead of the raw score, because of things like the steps marking algorithm.
	 * @type {number}
	 */
	credit: 0,

	/** Student's score on this part
	 * @type {number}
	 */
	score: 0,
	
	/** Messages explaining how marks were awarded
	 * @type {feedbackmessage}
	 */
	markingFeedback: [],

	/** Has the student changed their answer since last submitting?
	 * @type {boolean}
	 */
	isDirty: false,

	/** Student's answers as visible on the screen (not necessarily yet submitted)
	 * @type {string[]}
	 */
	stagedAnswer: undefined,

	/** Student's last submitted answer - a copy of {@link Numbas.parts.Part.stagedAnswer} taken when they submitted.
	 * @type {string[]}
	 */
	answerList: undefined,

	/** Has this part been answered?
	 * @type {boolean}
	 */
	answered: false,

	/** Child gapfill parts
	 * @type {Numbas.parts.Part[]}
	 */
	gaps: [],

	/** Child step parts
	 * @type {Numbas.parts.Part[]}
	 */
	steps: [],

	/** Have the steps been show for this part?
	 * @type {boolean}
	 */
	stepsShown: false,

	/** Is the steps display open? (Students can toggle it, but that doesn't affect whether they get the penalty)
	 * @type {boolean}
	 */
	stepsOpen: false,

	/** Properties set when the part is generated
	 * @type {object}
	 * @property {number} stepsPenalty - Number of marks to deduct when the steps are shown
	 * @property {boolean} enableMinimumMarks - Is there a lower limit on the score the student can be awarded for this part?
	 * @property {number} minimumMarks - Lower limit on the score the student can be awarded for this part
	 * @property {boolean} showCorrectAnswer - Show the correct answer on reveal?
	 */
	settings: 
	{
		stepsPenalty: 0,
		enableMinimumMarks: false,
		minimumMarks: 0,
		showCorrectAnswer: true
	},

	applyScripts: function() {
		this.originalScripts = {
		}
		for(var name in this.scripts) {
			var script_dict = this.scripts[name];
			var order = script_dict.order;
			var script = script_dict.script;
			switch(name) {
				case 'constructor':
					this.customConstructor = script;
					break;
				default:
					var originalScript = this[name];
					switch(order) {
						case 'instead':
							this[name] = script;
							break;
						case 'before':
							this[name] = function() {
								script.apply(this,arguments);
								originalScript.apply(this,arguments);
							}
							break;
						case 'after':
							this[name] = function() {
								originalScript.apply(this,arguments);
								script.apply(this,arguments);
							}
							break;
					}
			}
		}
	},

	/** Associated display object
	 * @type {Numbas.display.PartDisplay}
	 */
	display: undefined,

	/** Give the student a warning about this part. 	
	 * @see {Numbas.display.PartDisplay.warning}
	 */
	giveWarning: function(warning)
	{
		this.display.warning(warning);
	},

	/** Calculate the student's score based on their submitted answers
	 *
	 * Calls the parent part's `calculateScore` method at the end.
	 */
	calculateScore: function()
	{
		if(this.steps.length && this.stepsShown)
		{
			var oScore = this.score = (this.marks - this.settings.stepsPenalty) * this.credit; 	//score for main keypart

			var stepsScore = 0, stepsMarks=0;
			for(var i=0; i<this.steps.length; i++)
			{
				stepsScore += this.steps[i].score;
				stepsMarks += this.steps[i].marks;
			}

			var stepsFraction = Math.max(Math.min(1-this.credit,1),0);	//any credit not earned in main part can be earned back in steps

			this.score += stepsScore;						//add score from steps to total score


			this.score = Math.min(this.score,this.marks - this.settings.stepsPenalty)	//if too many marks are awarded for steps, it's possible that getting all the steps right leads to a higher score than just getting the part right. Clip the score to avoid this.

			if(this.settings.enableMinimumMarks)								//make sure awarded score is not less than minimum allowed
				this.score = Math.max(this.score,this.settings.minimumMarks);

			if(stepsMarks!=0 && stepsScore!=0)
			{
				if(this.credit==1)
					this.markingComment(R('part.marking.steps no matter'));
				else
				{
					var change = this.score - oScore;
					this.markingComment(
						util.pluralise(change,
							R('part.marking.steps change single',math.niceNumber(change)),
							R('part.marking.steps change plural',math.niceNumber(change))
					));
				}
			}
		}
		else
		{
			this.score = this.credit * this.marks;
			//make sure awarded score is not less than minimum allowed
			if(this.settings.enableMinimumMarks && this.credit*this.marks<this.settings.minimumMarks)
				this.score = Math.max(this.score,this.settings.minimumMarks);
		}

		if(this.parentPart && !this.parentPart.submitting)
			this.parentPart.calculateScore();
	},

	/** Update the stored answer from the student (called when the student changes their answer, but before submitting) 
	 */
	storeAnswer: function(answerList) {
		this.stagedAnswer = answerList;
		this.setDirty(true);
		this.display.removeWarnings();
	},

	/** Call when the student changes their answer, or submits - update {@link Numbas.parts.Part.isDirty}
	 * @param {boolean} dirty
	 */
	setDirty: function(dirty) {
		this.isDirty = dirty;
		if(this.display) {
			this.display.isDirty(dirty);
			if(dirty && this.parentPart) {
				this.parentPart.setDirty(true);
			}
			this.question.display.isDirty(this.question.isDirty());
		}
	},


	/** Submit the student's answers to this part - remove warnings. save answer, calculate marks, update scores
	 */
	submit: function() {
		this.display.removeWarnings();
		this.credit = 0;
		this.markingFeedback = [];
		this.submitting = true;

		if(this.stepsShown)
		{
			var stepsMax = this.marks - this.settings.stepsPenalty;
			this.markingComment(
				this.settings.stepsPenalty>0 
					? util.pluralise(stepsMax,
						R('part.marking.revealed steps with penalty single',math.niceNumber(stepsMax)),
						R('part.marking.revealed steps with penalty plural',math.niceNumber(stepsMax))
						)
					: R('part.marking.revealed steps no penalty'));
		}

		if(this.stagedAnswer) {
			this.answerList = util.copyarray(this.stagedAnswer);
		}
		this.setStudentAnswer();

		if(this.marks==0) {
			this.answered = true;
			return;
		}
		if(this.stagedAnswer==undefined || this.stagedAnswer=='')
		{
			this.giveWarning(R('part.marking.not submitted'));
			this.setCredit(0,R('part.marking.did not answer'));;
			this.answered = false;
		}
		else
		{
			this.setDirty(false);
			this.mark();
			this.answered = this.validate();
		}

		if(this.stepsShown)
		{
			for(var i=0;i<this.steps.length;i++)
			{
				this.steps[i].submit();
			}
		}

		this.calculateScore();
		this.question.updateScore();

		if(this.answered)
		{
			if(!(this.parentPart && this.parentPart.type=='gapfill'))
				this.markingComment(
					util.pluralise(this.score,
						R('part.marking.total score single',math.niceNumber(this.score)),
						R('part.marking.total score plural',math.niceNumber(this.score))
					)
				);
		}

		Numbas.store.partAnswered(this);
		this.display.showScore(this.answered);

		this.submitting = false;
	},

	/** Replace variables with student's answers to previous parts
	 * @returns {Numbas.jme.Scope}
	 */
	errorCarriedForwardScope: function() {
		// dictionary of variables to replace
		var replace = this.settings.errorCarriedForwardReplacements;

		// fill scope with new values of those variables
		var new_variables = {}
		for(var name in replace) {
		  var p2 = this.question.getPart(replace[name]);
		  if(p2.answered) {
			new_variables[name] = p2.studentAnswerAsJME()
		  }
		}
		var scope = new Numbas.jme.Scope([this.question.scope,{variables: new_variables}])

		// get names of replaced variables
		var replaced = [];
		for(var name in replace) {
		  replaced.push(name);
		}

		// find dependent variables which need to be recomputed
		var todo = Numbas.jme.variables.variableDependants(this.question.variablesTodo,replaced);
		for(var name in todo) {
		  delete scope.variables[name];
		}

		// compute those variables
		var nv = Numbas.jme.variables.makeVariables(todo,scope);
		scope = new Numbas.jme.Scope([scope,{variables:nv.variables}]);

		return scope;
	},

	/** Compute the correct answer, based on the given scope
	 * Anything to do with marking that depends on the scope should be in this method, and calling it witha new scope should update all the settings used by the marking algorithm.
	 * @param {Numbas.jme.Scope} scope
	 * @abstract
	 */
	getCorrectAnswer: function(scope) {},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 * @abstract
	 */
	setStudentAnswer: function() {},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
	},

	/* Function which marks the student's answer
	 * @abstract
	 */
	mark: function() {},

	/** Set the `credit` to an absolute value
	 * @param {number} credit
	 * @param {string} message - message to show in feedback to explain this action
	 */
	setCredit: function(credit,message)
	{
		var oCredit = this.credit;
		this.credit = credit;
		this.markingFeedback.push({
			op: 'addCredit',
			credit: this.credit - oCredit,
			message: message
		});
	},

	/** Add an absolute value to `credit`
	 * @param {number} credit - amount to add
	 * @param {string} message - message to show in feedback to explain this action
	 */
	addCredit: function(credit,message)
	{
		this.credit += credit;
		this.markingFeedback.push({
			op: 'addCredit',
			credit: credit,
			message: message
		});
	},

	/** Multiply `credit` by the given amount - use to apply penalties
	 * @param {number} factor
	 * @param {string} message - message to show in feedback to explain this action
	 */
	multCredit: function(factor,message)
	{
		var oCredit = this.credit
		this.credit *= factor;
		this.markingFeedback.push({
			op: 'addCredit',
			credit: this.credit - oCredit,
			message: message
		});
	},

	/** Add a comment to the marking feedback
	 * @param {string} message
	 */
	markingComment: function(message)
	{
		this.markingFeedback.push({
			op: 'comment',
			message: message
		});
	},

	/** Is the student's answer acceptable?
	 * @abstract
	 * @returns {boolean}
	 */
	validate: function() { return true; },

	/** Show the steps
	 * @param {boolean} dontStore - don't tell the storage that this is happening - use when loading from storage to avoid callback loops
	 */
	showSteps: function(dontStore)
	{
		this.stepsShown = true;
		this.stepsOpen = true;
		this.calculateScore();
		this.display.showSteps();
		if(!this.revealed) {
			if(this.answered)
				this.submit();
			else
				this.question.updateScore();
		}
		if(!dontStore)
		{
			Numbas.store.stepsShown(this);
		}
	},

	/** Close the steps box. This doesn't affect the steps penalty.
	 */
	hideSteps: function()
	{
		this.stepsOpen = false;
		this.display.hideSteps();
		Numbas.store.stepsHidden(this);
	},

	/** Reveal the correct answer to this part
	 * @param {boolean} dontStore - don't tell the storage that this is happening - use when loading from storage to avoid callback loops
	 */
	revealAnswer: function(dontStore)
	{
		this.display.revealAnswer();
		this.revealed = true;

		//this.setCredit(0);
		if(this.steps.length>0) {
			this.showSteps(dontStore);
			for(var i=0; i<this.steps.length; i++ )
			{
				this.steps[i].revealAnswer(dontStore);
			}
		}
	}

};

/** Judged Mathematical Expression
 *
 * Student enters a string representing a mathematical expression, eg. `x^2+x+1`, and it is compared with the correct answer by evaluating over a range of values.
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var JMEPart = Numbas.parts.JMEPart = function(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(JMEPart.prototype.settings,settings);

	//parse correct answer from XML
	answerMathML = this.xml.selectSingleNode('answer/correctanswer');
	if(!answerMathML)
		throw(new Numbas.Error('part.jme.answer missing',this.path));

	tryGetAttribute(settings,this.xml,'answer/correctanswer','simplification','answerSimplificationString');

	settings.correctAnswerString = Numbas.xml.getTextContent(answerMathML).trim();

	this.getCorrectAnswer(this.question.scope);

	//get checking type, accuracy, checking range
	var parametersPath = 'answer';
	tryGetAttribute(settings,this.xml,parametersPath+'/checking',['type','accuracy','failurerate'],['checkingType','checkingAccuracy','failureRate']);

	tryGetAttribute(settings,this.xml,parametersPath+'/checking/range',['start','end','points'],['vsetRangeStart','vsetRangeEnd','vsetRangePoints']);


	//max length and min length
	tryGetAttribute(settings,this.xml,parametersPath+'/maxlength',['length','partialcredit'],['maxLength','maxLengthPC']);
	var messageNode = xml.selectSingleNode('answer/maxlength/message');
	if(messageNode)
	{
		settings.maxLengthMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
		if($(settings.maxLengthMessage).text() == '')
			settings.maxLengthMessage = R('part.jme.answer too long');
	}
	tryGetAttribute(settings,this.xml,parametersPath+'/minlength',['length','partialcredit'],['minLength','minLengthPC']);
	var messageNode = xml.selectSingleNode('answer/minlength/message');
	if(messageNode)
	{
		settings.minLengthMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
		if($(settings.minLengthMessage).text() == '')
			settings.minLengthMessage = R('part.jme.answer too short');
	}

	//get list of 'must have' strings
	var mustHaveNode = this.xml.selectSingleNode('answer/musthave');
	settings.mustHave = [];
	if(mustHaveNode)
	{
		var mustHaves = mustHaveNode.selectNodes('string');
		for(var i=0; i<mustHaves.length; i++)
		{
			settings.mustHave.push(Numbas.xml.getTextContent(mustHaves[i]));
		}
		//partial credit for failing must-have test and whether to show strings which must be present to student when warning message displayed
		tryGetAttribute(settings,this.xml,mustHaveNode,['partialcredit','showstrings'],['mustHavePC','mustHaveShowStrings']);
		//warning message to display when a must-have is missing
		var messageNode = mustHaveNode.selectSingleNode('message');
		if(messageNode)
			settings.mustHaveMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
	}

	//get list of 'not allowed' strings
	var notAllowedNode = this.xml.selectSingleNode('answer/notallowed');
	settings.notAllowed = [];
	if(notAllowedNode)
	{
		var notAlloweds = notAllowedNode.selectNodes('string');
		for(i=0; i<notAlloweds.length; i++)
		{
			settings.notAllowed.push(Numbas.xml.getTextContent(notAlloweds[i]));
		}
		//partial credit for failing not-allowed test
		tryGetAttribute(settings,this.xml,notAllowedNode,['partialcredit','showstrings'],['notAllowedPC','notAllowedShowStrings']);
		var messageNode = notAllowedNode.selectSingleNode('message');
		if(messageNode)
			settings.notAllowedMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
	}

	tryGetAttribute(settings,this.xml,parametersPath,['checkVariableNames','showPreview']);
	var expectedVariableNamesNode = this.xml.selectSingleNode('answer/expectedvariablenames');
	settings.expectedVariableNames = [];
	if(expectedVariableNamesNode)
	{
		var nameNodes = expectedVariableNamesNode.selectNodes('string');
		for(i=0; i<nameNodes.length; i++)
			settings.expectedVariableNames.push(Numbas.xml.getTextContent(nameNodes[i]).toLowerCase());
	}

	this.display = new Numbas.display.JMEPartDisplay(this);

	if(loading)	{
		var pobj = Numbas.store.loadJMEPart(this);
		this.stagedAnswer = [pobj.studentAnswer];
	}
	else {
		this.stagedAnswer = [''];
	}
}

JMEPart.prototype = /** @lends Numbas.JMEPart.prototype */ 
{
	/** Student's last submitted answer
	 * @type {string}
	 */
	studentAnswer: '',

	/** Properties set when the part is generated.
	 *
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {jme} correctAnswerString - the definition of the correct answer, without variables substituted into it.
	 * @property {string} correctAnswer - An expression representing the correct answer to the question. The student's answer should evaluate to the same value as this.
	 * @property {string} answerSimplificationString - string from the XML defining which answer simplification rules to use
	 * @property {string[]} answerSimplification - names of simplification rules (see {@link Numbas.jme.display.Rule}) to use on the correct answer
	 * @property {string} checkingType - method to compare answers. See {@link Numbas.jme.checkingFunctions}
	 * @property {number} checkingAccuracy - accuracy threshold for checking. Exact definition depends on the checking type.
	 * @property {number} failureRate - comparison failures allowed before we decide answers are different
	 * @property {number} vsetRangeStart - lower bound on range of points to pick values from for variables in the answer expression
	 * @property {number} vsetRangeEnd - upper bound on range of points to pick values from for variables in the answer expression
	 * @property {number} vsetRangePoints - number of points to compare answers on
	 * @property {number} maxLength - maximum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted
	 * @property {number} maxLengthPC - partial credit if the student's answer is too long
	 * @property {string} maxLengthMessage - Message to add to marking feedback if the student's answer is too long
	 * @property {number} minLength - minimum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted
	 * @property {number} minLengthPC - partial credit if the student's answer is too short
	 * @property {string} minLengthMessage - message to add to the marking feedback if the student's answer is too short
	 * @property {string[]} mustHave - strings which must be present in the student's answer
	 * @property {number} mustHavePC - partial credit to award if any must-have string is missing
	 * @property {string} mustHaveMessage - message to add to the marking feedback if the student's answer is missing a must-have string.
	 * @property {boolean} mustHaveShowStrings - tell the students which strings must be included in the marking feedback, if they're missing a must-have?
	 * @property {string[]} notAllowed - strings which must not be present in the student's answer
	 * @property {number} notAllowedPC - partial credit to award if any not-allowed string is present
	 * @property {string} notAllowedMessage - message to add to the marking feedback if the student's answer contains a not-allowed string.
	 * @property {boolean} notAllowedShowStrings - tell the students which strings must not be included in the marking feedback, if they've used a not-allowed string?
	 */
	settings: 
	{
		correctAnswerString: '',
		correctAnswer: '',

		answerSimplificationString: '',
		answerSimplification: ['basic','unitFactor','unitPower','unitDenominator','zeroFactor','zeroTerm','zeroPower','collectNumbers','zeroBase','constantsFirst','sqrtProduct','sqrtDivision','sqrtSquare','otherNumbers'],
		
		checkingType: 'RelDiff',

		checkingAccuracy: 0,
		failureRate: 0,

		vsetRangeStart: 0,
		vsetRangeEnd: 1,
		vsetRangePoints: 1,
		
		maxLength: 0,
		maxLengthPC: 0,
		maxLengthMessage: 'Your answer is too long',

		minLength: 0,
		minLengthPC: 0,
		minLengthMessage: 'Your answer is too short',

		mustHave: [],
		mustHavePC: 0,
		mustHaveMessage: '',
		mustHaveShowStrings: false,

		notAllowed: [],
		notAllowedPC: 0,
		notAllowedMessage: '',
		notAllowedShowStrings: false
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		settings.answerSimplification = Numbas.jme.collectRuleset(settings.answerSimplificationString,scope.rulesets);

		var expr = jme.subvars(settings.correctAnswerString,scope);
		settings.correctAnswer = jme.display.simplifyExpression(
			expr,
			settings.answerSimplification,
			scope
		);
		if(settings.correctAnswer == '' && this.marks>0) {
			throw(new Numbas.Error('part.jme.answer missing',this.path));
		}

		this.markingScope = new jme.Scope(this.question.scope);
		this.markingScope.variables = {};

	},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 */
	setStudentAnswer: function() {
		this.studentAnswer = this.answerList[0];
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return new Numbas.jme.types.TExpression(Numbas.jme.compile(this.studentAnswer));
	},

	/** Mark the student's answer
	 */
	mark: function()
	{
		if(this.answerList==undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}

		try
		{
			var simplifiedAnswer = Numbas.jme.display.simplifyExpression(this.studentAnswer,'',this.question.scope);
		}
		catch(e)
		{
			this.setCredit(0,R('part.jme.answer invalid',e.message));
			return;
		}

		if(this.settings.checkVariableNames) {
			var tree = jme.compile(this.studentAnswer,this.question.scope);
			var usedvars = jme.findvars(tree);
			this.failExpectedVariableNames = false;
			for(var i=0;i<usedvars.length;i++) {
				if(!this.settings.expectedVariableNames.contains(usedvars[i].toLowerCase())) {
					this.failExpectedVariableNames = true;
					this.unexpectedVariableName = usedvars[i];
					break;
				}
			}
		}

		this.failMinLength = (this.settings.minLength>0 && simplifiedAnswer.length<this.settings.minLength);
		this.failMaxLength = (this.settings.maxLength>0 && simplifiedAnswer.length>this.settings.maxLength);
		this.failNotAllowed = false;
		this.failMustHave = false;

		//did student actually write anything?
		this.answered = this.studentAnswer.length > 0;
		
		//do comparison of student's answer with correct answer
		if(!jme.compare(this.studentAnswer, this.settings.correctAnswer, this.settings, this.markingScope))
		{
			this.setCredit(0,R('part.marking.incorrect'));
			return;
		}

		var noSpaceAnswer = this.studentAnswer.replace(/\s/g,'').toLowerCase();
		//see if student answer contains any forbidden strings
		for( i=0; i<this.settings.notAllowed.length; i++ )
		{
			if(noSpaceAnswer.contains(this.settings.notAllowed[i].toLowerCase())) { this.failNotAllowed = true; }
		}

		if(!this.failNotAllowed)
		{
			//see if student answer contains all the required strings
			for( i=0; i<this.settings.mustHave.length; i++ )
			{
				if(!noSpaceAnswer.contains(this.settings.mustHave[i].toLowerCase())) { this.failMustHave = true; }
			}
		}

		//calculate how many marks will be given for a correct answer
		//(can be modified if answer wrong length or fails string restrictions)
		this.setCredit(1,R('part.jme.marking.correct'));

		if(this.failMinLength)
		{
			this.multCredit(this.settings.minLengthPC,this.settings.minLengthMessage);
		}
		if(this.failMaxLength)
		{
			this.multCredit(this.settings.maxLengthPC,this.settings.maxLengthMessage);
		}

		if(this.failMustHave)
		{
			if(this.settings.mustHaveShowStrings)
			{
				var strings = this.settings.mustHave.map(function(x){return R('part.jme.must-have bits',x)});
				var message = this.settings.mustHave.length==1 ? R('part.jme.must-have one',strings) : R('jme.must-have several',strings)
				this.addCredit(0,message);
			}
			this.multCredit(this.settings.mustHavePC,this.settings.mustHaveMessage);
		}

		if(this.failNotAllowed)
		{
			if(this.settings.notAllowedShowStrings)
			{
				var strings = this.settings.notAllowed.map(function(x){return R('part.jme.not-allowed bits',x)});
				var message = this.settings.notAllowed.length==1 ? R('part.jme.not-allowed one',strings) : R('jme.not-allowed several',strings)
				this.addCredit(0,message);
			}
			this.multCredit(this.settings.notAllowedPC,this.settings.notAllowedMessage);
		}

	},

	/** Is the student's answer valid? False if student hasn't submitted an answer
	 * @returns {boolean}
	 */
	validate: function()
	{
		if(this.studentAnswer.length===0)
		{
			this.giveWarning(R('part.marking.not submitted'));
			return false;
		}

		try{
			var scope = new jme.Scope(this.question.scope);

			var tree = jme.compile(this.studentAnswer,scope);
			var varnames = jme.findvars(tree);
			for(i=0;i<varnames.length;i++)
			{
				scope.variables[varnames[i]]=new jme.types.TNum(0);
			}
			jme.evaluate(tree,scope);
		}
		catch(e)
		{
			this.giveWarning(R('part.jme.answer invalid',e.message));
			return false;
		}

		if( this.failExpectedVariableNames ) {
			var suggestedNames = this.unexpectedVariableName.split(jme.re.re_short_name);
			if(suggestedNames.length>3) {
				var suggestion = [];
				for(var i=1;i<suggestedNames.length;i+=2) {
					suggestion.push(suggestedNames[i]);
				}
				suggestion = suggestion.join('*');
				this.giveWarning(R('part.jme.unexpected variable name suggestion',this.unexpectedVariableName,suggestion));
			}
			else
				this.giveWarning(R('part.jme.unexpected variable name', this.unexpectedVariableName));
		}

		if( this.failMinLength)
		{
			this.giveWarning(this.settings.minLengthMessage);
		}

		if( this.failMaxLength )
		{
			this.giveWarning(this.settings.maxLengthMessage);
		}

		if( this.failMustHave )
		{
			this.giveWarning(this.settings.mustHaveMessage);
			if(this.settings.mustHaveShowStrings)
			{
				var strings = this.settings.mustHave.map(function(x){return R('part.jme.must-have bits',x)});
				var message = this.settings.mustHave.length==1 ? R('part.jme.must-have one',strings) : R('jme.must-have several',strings)
				this.giveWarning(message);
			}
		}

		if( this.failNotAllowed )
		{
			this.giveWarning(this.settings.notAllowedMessage);
			if(this.settings.notAllowedShowStrings)
			{
				var strings = this.settings.notAllowed.map(function(x){return R('part.jme.not-allowed bits',x)});
				var message = this.settings.notAllowed.length==1 ? R('part.jme.not-allowed one',strings) : R('jme.not-allowed several',strings)
				this.giveWarning(message);
			}
		}

		return true;
	}
};

/** Text-entry part - student's answer must match the given regular expression
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var PatternMatchPart = Numbas.parts.PatternMatchPart = function(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(PatternMatchPart.prototype.settings,settings);

	settings.correctAnswerString = Numbas.xml.getTextContent(this.xml.selectSingleNode('correctanswer'));

	var displayAnswerNode = this.xml.selectSingleNode('displayanswer');
	if(!displayAnswerNode)
		throw(new Numbas.Error('part.patternmatch.display answer missing',this.path));
	settings.displayAnswerString = $.trim(Numbas.xml.getTextContent(displayAnswerNode));

	this.getCorrectAnswer(this.question.scope);

	tryGetAttribute(settings,this.xml,'case',['sensitive','partialCredit'],'caseSensitive');

	this.display = new Numbas.display.PatternMatchPartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadPatternMatchPart(this);
		this.stagedAnswer = [pobj.studentAnswer];
	}
}
PatternMatchPart.prototype = /** @lends Numbas.PatternMatchPart.prototype */ {
	/** The student's last submitted answer 
	 * @type {string}
	 */
	studentAnswer: '',

	/** Properties set when the part is generated.
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {string} correctAnswerString - the definition of the correct answer, without variables substituted in.
	 * @property {RegExp} correctAnswer - regular expression pattern to match correct answers
	 * @property {string} displayAnswerString - the definition of the display answer, without variables substituted in.
	 * @property {string} displayAnswer - a representative correct answer to display when answers are revealed
	 * @property {boolean} caseSensitive - does case matter?
	 * @property {number} partialCredit - partial credit to award if the student's answer matches, apart from case, and `caseSensitive` is `true`.
	 */
	settings: 
	{
		correctAnswerString: '.*',
		correctAnswer: /.*/,
		displayAnswerString: '',
		displayAnswer: '',
		caseSensitive: false,
		partialCredit: 0
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		settings.correctAnswer = '^'+jme.contentsubvars(settings.correctAnswerString, scope)+'$';
		settings.displayAnswer = jme.contentsubvars(settings.displayAnswerString,scope);
	},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 */
	setStudentAnswer: function() {
		this.studentAnswer = this.answerList[0];
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return new Numbas.jme.types.TString(this.studentAnswer);
	},

	/** Mark the student's answer
	 */
	mark: function ()
	{
		if(this.answerList==undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}
		this.answered = this.studentAnswer.length>0;

		var caseInsensitiveAnswer = new RegExp( this.settings.correctAnswer, 'i' );			
		var caseSensitiveAnswer = new RegExp( this.settings.correctAnswer );
		
		if( this.settings.caseSensitive )
		{
			if( caseSensitiveAnswer.test(this.studentAnswer) )
			{
				this.setCredit(1,R('part.marking.correct'));
			}
			else if(caseInsensitiveAnswer.test(this.studentAnswer))
			{
				this.setCredit(this.settings.partialCredit,R('part.patternmatch.correct except case'));
			}
			else
			{
				this.setCredit(0,R('part.marking.incorrect'));
			}
		}else{
			if(caseInsensitiveAnswer.test(this.studentAnswer))
			{
				this.setCredit(1,R('part.marking.correct'));
			}
			else
			{
				this.setCredit(0,R('part.marking.incorrect'));
			}
		}
	},

	/** Is the student's answer valid? False if the part hasn't been submitted.
	 * @returns {boolean}
	 */
	validate: function()
	{
		if(!this.answered)
			this.giveWarning(R('part.marking.not submitted'));

		return this.answered;
	}
};

/** Number entry part - student's answer must be within given range, and written to required precision.
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var NumberEntryPart = Numbas.parts.NumberEntryPart = function(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(NumberEntryPart.prototype.settings,settings);

	tryGetAttribute(settings,this.xml,'answer',['minvalue','maxvalue'],['minvalueString','maxvalueString'],{string:true});
	tryGetAttribute(settings,this.xml,'answer',['correctanswerfraction','inputstep','allowfractions'],['correctAnswerFraction','inputStep','allowFractions']);

	tryGetAttribute(settings,this.xml,'answer/allowonlyintegeranswers',['value','partialcredit'],['integerAnswer','integerPC']);
	tryGetAttribute(settings,this.xml,'answer/precision',['type','partialcredit','strict'],['precisionType','precisionPC','strictPrecision']);
	tryGetAttribute(settings,this.xml,'answer/precision','precision','precisionString',{'string':true});

	if(settings.precisionType!='none') {
		settings.allowFractions = false;
	}

	this.getCorrectAnswer(this.question.scope);

	var messageNode = this.xml.selectSingleNode('answer/precision/message');
	if(messageNode)
		settings.precisionMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;

	var displayAnswer = (settings.minvalue + settings.maxvalue)/2;
	if(settings.correctAnswerFraction) {
		settings.displayAnswer = jme.display.jmeRationalNumber(displayAnswer);
	} else {
		settings.displayAnswer = math.niceNumber(displayAnswer,{precisionType: settings.precisionType,precision:settings.precision});
	}

	this.display = new Numbas.display.NumberEntryPartDisplay(this);
	
	if(loading)
	{
		var pobj = Numbas.store.loadNumberEntryPart(this);
		this.stagedAnswer = [pobj.studentAnswer+''];
	}
}
NumberEntryPart.prototype = /** @lends Numbas.parts.NumberEntryPart.prototype */
{
	/** The student's last submitted answer */
	studentAnswer: '',

	/** Properties set when the part is generated
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {number} inputStep - step size for the number input if it's being displayed as an `<input type=number>` control.
	 * @property {number} minvalueString - definition of minimum value, before variables are substituted in
	 * @property {number} minvalue - minimum value marked correct
	 * @property {number} maxvalueString - definition of maximum value, before variables are substituted in
	 * @property {number} maxvalue - maximum value marked correct
	 * @property {number} correctAnswerFraction - display the correct answer as a fraction?
	 * @property {boolean} integerAnswer - must the answer be an integer?
	 * @property {boolean} allowFractions - can the student enter a fraction as their answer?
	 * @property {number} integerPC - partial credit to award if the answer is between `minvalue` and `maxvalue` but not an integer, when `integerAnswer` is true.
	 * @property {number} displayAnswer - representative correct answer to display when revealing answers
	 * @property {string} precisionType - type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures
	 * @property {number} precisionString - definition of precision setting, before variables are substituted in
	 * @property {number} precision - how many decimal places or significant figures to require
	 * @property {number} precisionPC - partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision
	 * @property {string} precisionMessage - message to display in the marking feedback if their answer was not given to the required precision
	 */
	settings:
	{
		inputStep: 1,
		minvalue: 0,
		maxvalue: 0,
		correctAnswerFraction: false,
		integerAnswer: false,
		allowFractions: false,
		integerPC: 0,
		displayAnswer: 0,
		precisionType: 'none',
		precision: 0,
		precisionPC: 0,
		precisionMessage: R('You have not given your answer to the correct precision.')
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		var precision = jme.subvars(settings.precisionString, scope);
		settings.precision = scope.evaluate(precision).value;

		var minvalue = jme.subvars(settings.minvalueString,scope);
		minvalue = scope.evaluate(minvalue);
		if(minvalue && minvalue.type=='number') {
			minvalue = minvalue.value;
		} else {
			throw(new Numbas.Error('part.setting not present','minimum value',this.path,this.question.name));
		}

		var maxvalue = jme.subvars(settings.maxvalueString,scope);
		maxvalue = scope.evaluate(maxvalue);
		if(maxvalue && maxvalue.type=='number') {
			maxvalue = maxvalue.value;
		} else {
			throw(new Numbas.Error('part.setting not present','maximum value',this.path,this.question.name));
		}

		switch(settings.precisionType) {
		case 'dp':
			minvalue = math.precround(minvalue,settings.precision);
			maxvalue = math.precround(maxvalue,settings.precision);
			break;
		case 'sigfig':
			minvalue = math.siground(minvalue,settings.precision);
			maxvalue = math.siground(maxvalue,settings.precision);
			break;
		}

		var fudge = 0.00000000001;
		settings.minvalue = minvalue - fudge;
		settings.maxvalue = maxvalue + fudge;
	},

	/** Tidy up the student's answer - remove space, and get rid of comma separators
	 * @param {string} answer}
	 * @returns {string}
	 */
	cleanAnswer: function(answer) {
		// do a bit of string tidy up
		// uk number format only for now - get rid of any UK 1000 separators	
		answer = (answer+'').replace(/,/g, '');
		answer = $.trim(answer);
		return answer;
	},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 */
	setStudentAnswer: function() {
		this.studentAnswer = this.cleanAnswer(this.answerList[0]);
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return new Numbas.jme.types.TNum(this.studentAnswerAsFloat());
	},

	studentAnswerAsFloat: function() {
		return util.parseNumber(this.studentAnswer,this.settings.allowFractions);
	},

	/** Mark the student's answer */
	mark: function()
	{
		if(this.answerList==undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}
		
		if( this.studentAnswer.length>0 && util.isNumber(this.studentAnswer,this.settings.allowFractions) )
		{
			var answerFloat = this.studentAnswerAsFloat();
			if( answerFloat <= this.settings.maxvalue && answerFloat >= this.settings.minvalue )
			{
				if(this.settings.integerAnswer && math.countDP(this.studentAnswer)>0)
					this.setCredit(this.settings.integerPC,R('part.numberentry.correct except decimal'));
				else
					this.setCredit(1,R('part.marking.correct'));
			}else{
				this.setCredit(0,R('part.marking.incorrect'));
			}
			this.answered = true;

			var failedPrecision = !math.toGivenPrecision(this.studentAnswer,this.settings.precisionType,this.settings.precision,this.settings.strictPrecision);
			
			if(failedPrecision) {
				this.multCredit(this.settings.precisionPC,this.settings.precisionMessage);
			}
		}else{
			this.answered = false;
			this.setCredit(0,R('part.numberentry.answer invalid'));
		}
	},

	/** Is the student's answer valid? False if the part hasn't been submitted.
	 * @returns {boolean}
	 */
	validate: function()
	{
		if(!this.answered)
			this.giveWarning(R('part.marking.not submitted'));
		
		return this.answered;
	}
};

/** Matrix entry part - student enters a matrix of numbers
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var MatrixEntryPart = Numbas.parts.MatrixEntryPart = function(xml, path, question, parentPart, loading) {
	var settings = this.settings;
	util.copyinto(MatrixEntryPart.prototype.settings,settings);

	tryGetAttribute(settings,this.xml,'answer',['correctanswer'],['correctAnswerString'],{string:true});
	tryGetAttribute(settings,this.xml,'answer',['correctanswerfractions','rows','columns','allowresize','tolerance','markpercell','allowfractions'],['correctAnswerFractions','numRows','numColumns','allowResize','tolerance','markPerCell','allowFractions']);
	settings.tolerance = Math.max(settings.tolerance,0.00000000001);

	tryGetAttribute(settings,this.xml,'answer/precision',['type','partialcredit','strict'],['precisionType','precisionPC','strictPrecision']);
	tryGetAttribute(settings,this.xml,'answer/precision','precision','precisionString',{'string':true});

	if(settings.precisionType!='none') {
		settings.allowFractions = false;
	}

	this.studentAnswer = [];
	for(var i=0;i<this.settings.numRows;i++) {
		var row = [];
		for(var j=0;j<this.settings.numColumns;j++) {
			row.push('');
		}
		this.studentAnswer.push(row);
	}
	
	var messageNode = this.xml.selectSingleNode('answer/precision/message');
	if(messageNode) {
		settings.precisionMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
	}

	this.getCorrectAnswer(this.question.scope);

	this.display = new Numbas.display.MatrixEntryPartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadMatrixEntryPart(this);
		if(pobj.studentAnswer) {
			var rows = pobj.studentAnswer.length;
			var columns = rows>0 ? pobj.studentAnswer[0].length : 0;
			this.stagedAnswer = [rows, columns, pobj.studentAnswer];
		}
	}
}
MatrixEntryPart.prototype = /** @lends Numbas.parts.MatrixEntryPart.prototype */
{
	/** The student's last submitted answer */
	studentAnswer: '',

	/** Properties set when part is generated
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {matrix} correctAnswer - the correct answer to the part
	 * @property {number} numRows - default number of rows in the student's answer
	 * @property {number} numColumns - default number of columns in the student's answer
	 * @property {boolean} allowResize - allow the student to change the dimensions of their answer?
	 * @property {number} tolerance - allowed margin of error in each cell (if student's answer is within +/- `tolerance` of the correct answer (after rounding to , mark it as correct
	 * @property {boolean} markPerCell - should the student gain marks for each correct cell (true), or only if they get every cell right (false)?
	 * @property {boolean} allowFractions - can the student enter a fraction as their answer for a cell?
	 * @property {string} precisionType - type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures
	 * @property {number} precision - how many decimal places or significant figures to require
	 * @property {number} precisionPC - partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision
	 * @property {string} precisionMessage - message to display in the marking feedback if their answer was not given to the required precision
	 */
	settings: {
		correctAnswer: null,
		correctAnswerFractions: false,
		numRows: 3,
		numColumns: 3,
		allowResize: true,
		tolerance: 0,
		markPerCell: false,
		allowFractions: false,
		precisionType: 'none',	//'none', 'dp' or 'sigfig'
		precision: 0,
		precisionPC: 0,	//fraction of credit to take away if precision wrong
		precisionMessage: R('You have not given your answer to the correct precision.')	//message to give to student if precision wrong
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		var correctAnswer = jme.subvars(settings.correctAnswerString,scope);
		correctAnswer = jme.evaluate(correctAnswer,scope);
		if(correctAnswer && correctAnswer.type=='matrix') {
			settings.correctAnswer = correctAnswer.value;
		} else if(correctAnswer && correctAnswer.type=='vector') {
			settings.correctAnswer = Numbas.vectormath.toMatrix(correctAnswer.value);
		} else {
			throw(new Numbas.Error('part.setting not present','correct answer',this.path,this.question.name));
		}

		settings.precision = jme.subvars(settings.precisionString, scope);
		settings.precision = jme.evaluate(settings.precision,scope).value;

		switch(settings.precisionType) {
		case 'dp':
			settings.correctAnswer = Numbas.matrixmath.precround(settings.correctAnswer,settings.precision);
			break;
		case 'sigfig':
			settings.correctAnswer = Numbas.matrixmath.precround(settings.correctAnswer,settings.precision);
			break;
		}

	},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 */
	setStudentAnswer: function() {
		this.studentAnswerRows = parseInt(this.stagedAnswer[0]);
		this.studentAnswerColumns = parseInt(this.stagedAnswer[1]);
		this.studentAnswer = this.stagedAnswer[2];
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return new Numbas.jme.types.TMatrix(this.studentAnswerAsMatrix());
	},

	studentAnswerAsMatrix: function() {
		var rows = this.studentAnswerRows;
		var columns = this.studentAnswerColumns;

		var studentMatrix = [];
		for(var i=0;i<rows;i++) {
			var row = [];
			for(var j=0;j<columns;j++) {
				var cell = this.studentAnswer[i][j];
				var n = util.parseNumber(cell,this.settings.allowFractions);
				
				if(isNaN(n)) {
					return null;
				} else {
					row.push(n);
				}
			}
			studentMatrix.push(row);
		}

		studentMatrix.rows = rows;
		studentMatrix.columns = columns;
		
		return studentMatrix;
	},

	/** Mark the student's answer */
	mark: function()
	{
		if(this.answerList===undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}

		var correctMatrix = this.settings.correctAnswer;

		if(this.studentAnswer) {
			var studentMatrix = this.studentAnswerAsMatrix();

			if(studentMatrix===null) {
				this.setCredit(0,R('part.matrix.invalid cell'));
				this.invalidCell = true;
				return;
			} else {
				this.invalidCell = false;
			}

			var precisionOK = true;
			for(var i=0;i<rows;i++) {
				for(var j=0;j<columns;j++) {
					var cell = this.studentAnswer[i][j];
					precisionOK &= math.toGivenPrecision(cell,this.settings.precisionType,this.settings.precision,this.settings.strictPrecision); 
				}
			}

			var rows = studentMatrix.rows;
			var columns = studentMatrix.columns;

			this.wrongSize = rows!=correctMatrix.rows || columns!=correctMatrix.columns;
			if(this.wrongSize) {
				this.answered = true;
				this.setCredit(0,R('part.marking.incorrect'));
				return;
			}

			var rounders = {'dp': Numbas.matrixmath.precround, 'sigfig': Numbas.matrixmath.siground, 'none': function(x){return x}};
			var round = rounders[this.settings.precisionType];
			studentMatrix = round(studentMatrix,this.settings.precision);

			var numIncorrect = 0;
			for(var i=0;i<rows;i++) {
				for(var j=0;j<columns;j++) {
					var studentCell = studentMatrix[i][j];
					var correctCell = correctMatrix[i][j];
					if(!math.withinTolerance(studentCell,correctCell,this.settings.tolerance)) {
						numIncorrect += 1;
					}
				}
			}

			var numCells = rows*columns;

			if(numIncorrect==0) {
				this.setCredit(1,R('part.marking.correct'));
			} else if(this.settings.markPerCell && numIncorrect<numCells) {
				this.setCredit( (numCells-numIncorrect)/numCells, R('part.matrix.some incorrect',numIncorrect) );
			} else {
				this.setCredit(0,R('part.marking.incorrect'));
			}

			if(!precisionOK) {
				this.multCredit(this.settings.precisionPC,this.settings.precisionMessage);
			}

			this.answered = true;
		} else {
			this.answered = false;
			this.setCredit(0,R('part.matrix.answer invalid'));
		}
	},

	/** Is the student's answer valid? False if the part hasn't been submitted.
	 * @returns {boolean}
	 */
	validate: function()
	{
		if(this.invalidCell) {
			this.giveWarning(R('part.matrix.invalid cell'));
		} else if(!this.answered) {
			this.giveWarning(R('part.matrix.empty cell'));
		}
		
		return this.answered;
	}
}


/** Multiple choice part - either pick one from a list, pick several from a list, or match choices with answers (2d grid, either pick one from each row or tick several from each row)
 *
 * Types:
 * * `1_n_2`: pick one from a list. Represented as N answers, 1 choice
 * * `m_n_2`: pick several from a list. Represented as N answers, 1 choice
 * * `m_n_x`: match choices (rows) with answers (columns). Represented as N answers, X choices.
 *
 * @constructor
 * @augments Numbas.parts.Part
 * @memberof Numbas.parts
 */
var MultipleResponsePart = Numbas.parts.MultipleResponsePart = function(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(MultipleResponsePart.prototype.settings,settings);

	//work out marks available
	tryGetAttribute(settings,this.xml,'marking/maxmarks','enabled','maxMarksEnabled');
	if(settings.maxMarksEnabled) {
		tryGetAttribute(this,this.xml,'marking/maxmarks','value','marks');
	} else {
		tryGetAttribute(this,this.xml,'.','marks');
	}

	//get minimum marks setting
	tryGetAttribute(settings,this.xml,'marking/minmarks','enabled','minMarksEnabled');
	if(settings.minMarksEnabled) {
		tryGetAttribute(this.settings,this.xml,'marking/minmarks','value','minimumMarks');
	}

	//get restrictions on number of choices
	var choicesNode = this.xml.selectSingleNode('choices');
	if(!choicesNode) {
		throw(new Numbas.Error('part.mcq.choices missing',this.path));
	}

	tryGetAttribute(settings,null,choicesNode,['minimumexpected','maximumexpected','order','displayType'],['minAnswers','maxAnswers','choiceOrder']);

	var minAnswers = jme.subvars(settings.minAnswers, this.question.scope);
	minAnswers = jme.evaluate(settings.minAnswers,this.question.scope);
	if(minAnswers && minAnswers.type=='number') {
		settings.minAnswers = minAnswers.value;
	} else {
		throw(new Numbas.Error('part.setting not present','minimum answers',this.path,this.question.name))
	}

	var maxAnswers = jme.subvars(settings.maxAnswers, question.scope);
	maxAnswers = jme.evaluate(settings.maxAnswers,this.question.scope);
	if(maxAnswers && maxAnswers.type=='number') {
		settings.maxAnswers = maxAnswers.value;
	} else {
		throw(new Numbas.Error('part.setting not present','maximum answers',this.path,this.question.name))
	}

	var choiceNodes = choicesNode.selectNodes('choice');

	var answersNode, answerNodes;
	
	//get number of answers and answer order setting
	if(this.type == '1_n_2' || this.type == 'm_n_2') {
		// the XML for these parts lists the options in the <choices> tag, but it makes more sense to list them as answers
		// so swap "answers" and "choices"
		// this all stems from an extremely bad design decision made very early on
		this.flipped = true;
		this.numAnswers = choiceNodes.length;
		this.numChoices = 1;
		settings.answerOrder = settings.choiceOrder;
		settings.choiceOrder = '';
		answersNode = choicesNode;
		answerNodes = choiceNodes;
		choicesNode = null;
	} else {
		this.flipped = false;
		this.numChoices = choiceNodes.length;
		answersNode = this.xml.selectSingleNode('answers');
		if(answersNode) {
			tryGetAttribute(settings,null,answersNode,'order','answerOrder');
			answerNodes = answersNode.selectNodes('answer');
			this.numAnswers = answerNodes.length;
		}
	}

	//get warning type and message for wrong number of choices
	warningNode = this.xml.selectSingleNode('marking/warning');
	if(warningNode) {
		tryGetAttribute(settings,null,warningNode,'type','warningType');
	}
	
	if(loading) {
		var pobj = Numbas.store.loadMultipleResponsePart(this);
		this.shuffleChoices = pobj.shuffleChoices;
		this.shuffleAnswers = pobj.shuffleAnswers;
		this.ticks = pobj.ticks;
	} else {
		this.shuffleChoices = [];
		if(settings.choiceOrder=='random') {
			this.shuffleChoices = math.deal(this.numChoices);
		} else {
			this.shuffleChoices = math.range(this.numChoices);
		}

		this.shuffleAnswers = [];
		if(settings.answerOrder=='random') {
			this.shuffleAnswers = math.deal(this.numAnswers);
		} else {
			this.shuffleAnswers = math.range(this.numAnswers);
		}
	}

	// apply shuffling to XML nodes, so the HTML to display is generated in the right order
	for(i=0;i<this.numAnswers;i++) {
		answersNode.removeChild(answerNodes[i]);
	}
	for(i=0;i<this.numAnswers;i++) {
		answersNode.appendChild(answerNodes[this.shuffleAnswers[i]]);
	}
	if(this.type == 'm_n_x') {
		for(var i=0;i<this.numChoices;i++) {
			choicesNode.removeChild(choiceNodes[i]);
		}
		for(i=0;i<this.numChoices;i++) {
			choicesNode.appendChild(choiceNodes[this.shuffleChoices[i]]);
		}
	}

	// fill layout matrix
	var layout = this.layout = [];
	if(this.type=='m_n_x') {
		var layoutNode = this.xml.selectSingleNode('layout');
		tryGetAttribute(settings,null,layoutNode,['type','expression'],['layoutType','layoutExpression']);
		var layoutTypes = {
			all: function(row,column) { return true; },
			lowertriangle: function(row,column) { return row>=column; },
			strictlowertriangle: function(row,column) { return row>column; },
			uppertriangle: function(row,column) { return row<=column; },
			strictuppertriangle: function(row,column) { return row<column; },
			expression: function(row,column) { return layoutMatrix[row][column]; }
		};
		if(settings.layoutType=='expression') {
			// expression can either give a 2d array (list of lists) or a matrix
			// note that the list goes [row][column], unlike all the other properties of this part object, which go [column][row], i.e. they're indexed by answer then choice
			// it's easier for question authors to go [row][column] because that's how they're displayed, but it's too late to change the internals of the part to match that now
			// I have only myself to thank for this - CP
			var layoutMatrix = jme.unwrapValue(jme.evaluate(settings.layoutExpression,this.question.scope));
		}
		var layoutFunction = layoutTypes[settings.layoutType];
		for(var i=0;i<this.numAnswers;i++) {
			var row = [];
			for(var j=0;j<this.numChoices;j++) {
				row.push(layoutFunction(j,i));
			}
			layout.push(row);
		}
	} else {
		for(var i=0;i<this.numAnswers;i++) {
			var row = [];
			for(var j=0;j<this.numChoices;j++) {
				row.push(true);
			}
			layout.push(row);
		}
	}

	//invert the shuffle so we can now tell where particular choices/answers went
	this.shuffleChoices = math.inverse(this.shuffleChoices);
	this.shuffleAnswers = math.inverse(this.shuffleAnswers);

	//fill marks matrix
	var def;
	if(def = this.xml.selectSingleNode('marking/matrix').getAttribute('def')) {
		settings.markingMatrixString = def;
	} else {
		var matrixNodes = this.xml.selectNodes('marking/matrix/mark');
		var markingMatrixArray = settings.markingMatrixArray = [];
		for( i=0; i<this.numAnswers; i++ ) {
			markingMatrixArray.push([]);
		}
		for( i=0; i<matrixNodes.length; i++ ) {
			var cell = {value: ""};
			tryGetAttribute(cell,null, matrixNodes[i], ['answerIndex', 'choiceIndex', 'value']);

			if(this.flipped) {
				// possible answers are recorded as choices in the multiple choice types.
				// switch the indices round, so we don't have to worry about this again
				cell.answerIndex = cell.choiceIndex;
				cell.choiceIndex = 0;
			}

			//take into account shuffling
			cell.answerIndex = this.shuffleAnswers[cell.answerIndex];
			cell.choiceIndex = this.shuffleChoices[cell.choiceIndex];

			markingMatrixArray[cell.answerIndex][cell.choiceIndex] = cell.value;
		}
	}

	var distractors = [];
	for( i=0; i<this.numAnswers; i++ ) {
		distractors.push([]);
	}
	var distractorNodes = this.xml.selectNodes('marking/distractors/distractor');
	for( i=0; i<distractorNodes.length; i++ )
	{
		var cell = {message: ""};
		tryGetAttribute(cell,null, distractorNodes[i], ['answerIndex', 'choiceIndex']);
		cell.message = $.xsl.transform(Numbas.xml.templates.question,distractorNodes[i]).string;
		cell.message = jme.contentsubvars(cell.message,question.scope);

		if(this.type == '1_n_2' || this.type == 'm_n_2') {	
			// possible answers are recorded as choices in the multiple choice types.
			// switch the indices round, so we don't have to worry about this again
			cell.answerIndex = cell.choiceIndex;
			cell.choiceIndex = 0;
		}

		//take into account shuffling
		cell.answerIndex = this.shuffleAnswers[cell.answerIndex];
		cell.choiceIndex = this.shuffleChoices[cell.choiceIndex];

		distractors[cell.answerIndex][cell.choiceIndex] = cell.message;
	}
	settings.distractors = distractors;

	if(this.type=='1_n_2') {
		settings.maxAnswers = 1;
	} else if(settings.maxAnswers==0) {
		settings.maxAnswers = this.numAnswers * this.numChoices;
	}

	this.getCorrectAnswer(this.question.scope);
	var matrix = this.settings.matrix;
	
	if(this.marks == 0) {	//if marks not set explicitly
		var flat = [];
		switch(this.type)
		{
		case '1_n_2':
			for(var i=0;i<matrix.length;i++) {
				flat.push(matrix[i][0]);
			}
			break;
		case 'm_n_2':
			for(var i=0;i<matrix.length;i++) {
				flat.push(matrix[i][0]);
			}
			break;
		case 'm_n_x':
			if(settings.displayType=='radiogroup') {
				for(var i=0;i<this.numChoices;i++)
				{
					var row = [];
					for(var j=0;j<this.numAnswers;j++)
					{
						row.push(matrix[j][i]);
					}
					row.sort(function(a,b){return a>b ? 1 : a<b ? -1 : 0});
					flat.push(row[row.length-1]);
				}
			} else {
				for(var i=0;i<matrix.length;i++) {
					flat = flat.concat(matrix[i]);
				}
			}
			break;
		}
		flat.sort(function(a,b){return a>b ? 1 : a<b ? -1 : 0});
		for(var i=flat.length-1; i>=0 && flat.length-1-i<settings.maxAnswers && flat[i]>0;i--) {
			this.marks+=flat[i];
		}
	}

	//restore saved choices
	if(loading) {
		this.stagedAnswer = [];
		for( i=0; i<this.numAnswers; i++ ) {
			this.stagedAnswer.push([]);
			for( var j=0; j<this.numChoices; j++ ) {
				this.stagedAnswer[i].push(false);
			}
		}
		for( i=0;i<this.numAnswers;i++) {
			for(j=0;j<this.numChoices;j++) {
				if(pobj.ticks[i][j]) {
					this.stagedAnswer[i][j]=true;
				}
			}
		}
	} else {
		//ticks array - which answers/choices are selected?
		this.ticks = [];
		this.stagedAnswer = [];
		for( i=0; i<this.numAnswers; i++ ) {
			this.ticks.push([]);
			this.stagedAnswer.push([]);
			for( var j=0; j<this.numChoices; j++ ) {
				this.ticks[i].push(false);
				this.stagedAnswer[i].push(false);
			}
		}
	}

	//if this part has a minimum number of answers more than zero, then
	//we start in an error state
	this.wrongNumber = settings.minAnswers > 0;

	this.display = new Numbas.display.MultipleResponsePartDisplay(this);
}
MultipleResponsePart.prototype = /** @lends Numbas.parts.MultipleResponsePart.prototype */
{
	/** Student's last submitted answer/choice selections
	 * @type {Array.Array.<boolean>}
	 */
	ticks: [],
	
	/** Has the student given the wrong number of responses?
	 * @type {boolean}
	 */
	wrongNumber: false,

	/** Number of choices - used by `m_n_x` parts
	 * @type {number}
	 */
	numChoices: 0,

	/** Number of answers
	 * @type {number}
	 */
	numAnswers: 0,

	/** Have choice and answers been swapped (because of the weird settings for 1_n_2 and m_n_2 parts)
	 * @type {boolean}
	 */
	flipped: false,

	/** Properties set when the part is generated
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {boolean} maxMarksEnabled - is there a maximum number of marks the student can get?
	 * @property {number} minAnswers - minimum number of responses the student must select
	 * @property {number} maxAnswers - maxmimum number of responses the student must select
	 * @property {string} choiceOrder - order in which to display choices - either `random` or `fixed`
	 * @property {string} answerOrder - order in which to display answers - either `random` or `fixed`
	 * @property {Array.Array.<number>} matrix - marks for each answer/choice pair. Arranged as `matrix[answer][choice]`
	 * @property {string} displayType - how to display the response selectors. Can be `radiogroup` or `checkbox`
	 * @property {string} warningType - what to do if the student picks the wrong number of responses? Either `none` (do nothing), `prevent` (don't let the student submit), or `warn` (show a warning but let them submit)
	 */
	settings:
	{
		maxMarksEnabled: false,		//is there a maximum number of marks the student can get?
		minAnswers: '0',				//minimum number of responses student must select
		maxAnswers: '0',				//maximum ditto
		choiceOrder: '',			//order in which to display choices
		answerOrder: '',			//order in which to display answers
		matrix: [],					//marks matrix
		displayType: '',			//how to display the responses? can be: radiogroup, dropdownlist, buttonimage, checkbox, choicecontent
		warningType: ''				//what to do if wrong number of responses
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		var matrix = [];
		if(settings.markingMatrixString) {
			matrix = jme.evaluate(settings.markingMatrixString,scope);
			switch(matrix.type) {
			case 'list':
				var numLists = 0;
				var numNumbers = 0;
				for(var i=0;i<matrix.value.length;i++) {
					switch(matrix.value[i].type) {
					case 'list':
						numLists++;
						break;
					case 'number':
						numNumbers++;
						break;
					default:
						throw(new Numbas.Error('part.mcq.matrix wrong type',matrix.value[i].type));
					}
				}
				if(numLists == matrix.value.length) {
					matrix = matrix.value.map(function(row){	//convert TNums to javascript numbers
						return row.value.map(function(e){return e.value;});
					});
				} else if(numNumbers == matrix.value.length) {
					matrix = matrix.value.map(function(e) {
						return [e.value];
					});
				} else {
					throw(new Numbas.Error('part.mcq.matrix mix of numbers and lists'));
				}
				matrix.rows = matrix.length;
				matrix.columns = matrix[0].length;
				break;
			case 'matrix':
				matrix = matrix.value;
				break;
			default:
				throw(new Numbas.Error('part.mcq.matrix not a list'));
			}
			if(this.flipped) {
				matrix = Numbas.matrixmath.transpose(matrix);
			}
			if(matrix.length!=this.numChoices) {
				throw(new Numbas.Error('part.mcq.matrix wrong size'));
			}

			// take into account shuffling;
			var omatrix = matrix;
			var matrix = [];
			matrix.rows = omatrix.rows;
			matrix.columns = omatrix.columns;
			for(var i=0;i<this.numChoices;i++) {
				matrix[i]=[];
				if(omatrix[i].length!=this.numAnswers) {
					throw(new Numbas.Error('part.mcq.matrix wrong size'));
				}
			}
			for(var i=0; i<this.numChoices; i++) {
				for(var j=0;j<this.numAnswers; j++) {
					matrix[this.shuffleChoices[i]][this.shuffleAnswers[j]] = omatrix[i][j];
				}
			}

			matrix = Numbas.matrixmath.transpose(matrix);
		} else {
			for(var i=0;i<this.numAnswers;i++) {
				var row = [];
				matrix.push(row);
				for(var j=0;j<this.numChoices;j++) {
					var value = settings.markingMatrixArray[i][j];

					if(util.isFloat(value)) {
						value = parseFloat(value);
					} else {
						value = jme.evaluate(value,scope).value;
						if(!util.isFloat(value)) {
							throw(new Numbas.Error('part.mcq.matrix not a number',this.path,i,j));
						}
						value = parseFloat(value);
					}

					row[j] = value;
				}
			}
		}

		for(var i=0;i<matrix.length;i++) {
			var l = matrix[i].length;
			for(var j=0;j<l;j++) {
				if(!this.layout[i][j]) {
					matrix[i][j] = 0;
				}
			}
		}

		settings.matrix = matrix;
	},

	/** Store the student's choices */
	storeAnswer: function(answerList)
	{
		this.setDirty(true);
		//get choice and answer 
		//in MR1_n_2 and MRm_n_2 parts, only the choiceindex matters
		var answerIndex = answerList[0];
		var choiceIndex = answerList[1];

		switch(this.settings.displayType)
		{
		case 'radiogroup':							//for radiogroup parts, only one answer can be selected.
		case 'dropdownlist':
			for(var i=0; i<this.numAnswers; i++)
			{
				this.stagedAnswer[i][choiceIndex]= i==answerIndex;
			}
			break;
		default:
			this.stagedAnswer[answerIndex][choiceIndex] = answerList[2];
		}
	},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 */
	setStudentAnswer: function() {
		this.ticks = util.copyarray(this.stagedAnswer,true);
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return Numbas.jme.wrapValue(this.ticks);
	},

	/** Mark the student's choices */
	mark: function()
	{
		if(this.stagedAnswer==undefined)
		{
			this.setCredit(0,R('part.marking.did not answer'));
			return false;
		}
		this.setCredit(0);

		this.numTicks = 0;
		var partScore = 0;
		for( i=0; i<this.numAnswers; i++ )
		{
			for(var j=0; j<this.numChoices; j++ )
			{
				if(this.ticks[i][j])
				{
					this.numTicks += 1;
				}
			}
		}

		this.wrongNumber = (this.numTicks<this.settings.minAnswers || (this.numTicks>this.settings.maxAnswers && this.settings.maxAnswers>0));
		if(this.wrongNumber) {
			this.setCredit(0,R('part.mcq.wrong number of choices'));
			return;
		}

		for( i=0; i<this.numAnswers; i++ )
		{
			for(var j=0; j<this.numChoices; j++ )
			{
				if(this.ticks[i][j])
				{
					partScore += this.settings.matrix[i][j];

					var row = this.settings.distractors[i];
					if(row)
						var message = row[j];
					var award = this.settings.matrix[i][j];
					if(award!=0) {
						if(!util.isNonemptyHTML(message) && award>0)
							message = R('part.mcq.correct choice');
						this.addCredit(award/this.marks,message);
					} else {
						this.markingComment(message);
					}
				}
			}
		}

		if(this.credit<=0)
			this.markingComment(R('part.marking.incorrect'));

		if(this.marks>0)
		{
			this.setCredit(Math.min(partScore,this.marks)/this.marks);	//this part might have a maximum number of marks which is less then the sum of the marking matrix
		}
	},

	/** Are the student's answers valid? Show a warning if they've picked the wrong number */
	validate: function()
	{
		if(this.wrongNumber)
		{
			switch(this.settings.warningType)
			{
			case 'prevent':
				this.giveWarning(R('part.mcq.wrong number of choices'));
				return false;
				break;
			case 'warn':
				this.giveWarning(R('part.mcq.wrong number of choices'));
				break;
			}
		}

		if(this.numTicks>0)
			return true;
		else
			this.giveWarning(R('part.mcq.no choices selected'));
			return false;
	},

	/** Reveal the correct answers, and any distractor messages for the student's choices 
	 * Extends {@link Numbas.parts.Part.revealAnswer}
	 */
	revealAnswer: function()
	{
		var row,message;
		for(var i=0;i<this.numAnswers;i++)
		{
			for(var j=0;j<this.numChoices;j++)
			{
				if((row = this.settings.distractors[i]) && (message=row[j]))
				{
					this.markingComment(message);
				}
			}
		}
	}
};
MultipleResponsePart.prototype.revealAnswer = util.extend(MultipleResponsePart.prototype.revealAnswer, Part.prototype.revealAnswer);

/** Gap-fill part: text with multiple input areas, each of which is its own sub-part, known as a 'gap'.
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var GapFillPart = Numbas.parts.GapFillPart = function(xml, path, question, parentPart, loading)
{
	var gapXML = this.xml.selectNodes('gaps/part');

	this.marks = 0;

	for( var i=0 ; i<gapXML.length; i++ )
	{
		var gap = createPart(gapXML[i], path+'g'+i, this.question, this, loading);
		gap.isGap = true;
		this.marks += gap.marks;
		this.gaps[i]=gap;
		this.answered = this.answered || gap.answered;
	}

	this.display = new Numbas.display.GapFillPartDisplay(this);
}	
GapFillPart.prototype = /** @lends Numbas.parts.GapFillPart.prototype */
{
	/** Included so the "no answer entered" error isn't triggered for the whole gap-fill part.
	 */
	stagedAnswer: 'something',

	/** Reveal the answers to all of the child gaps 
	 * Extends {@link Numbas.parts.Part.revealAnswer}
	 */
	revealAnswer: function(dontStore)
	{
		for(var i=0; i<this.gaps.length; i++)
			this.gaps[i].revealAnswer(dontStore);
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return new Numbas.jme.types.TList(this.gaps.map(function(g){return g.studentAnswerAsJME()}));
	},

	/** Submit all of the child gaps.
	 *
	 * Sets `this.submitting = true` while submitting, so that child parts don't try to recalculate the score during marking.
	 */
	submit: function()
	{
		this.submitting = true;
		for(var i=0;i<this.gaps.length;i++)
		{
			this.gaps[i].submit();
		}
		this.submitting = false;
	},

	/** Mark this part - add up the scores from each of the child gaps.
	 */
	mark: function()
	{
		this.credit=0;
		if(this.marks>0)
		{
			for(var i=0; i<this.gaps.length; i++)
			{
				var gap = this.gaps[i];
				this.credit += gap.credit*gap.marks;
				if(this.gaps.length>1)
					this.markingComment(R('part.gapfill.feedback header',i+1));
				for(var j=0;j<gap.markingFeedback.length;j++)
				{
					var action = util.copyobj(gap.markingFeedback[j]);
					action.gap = i;
					this.markingFeedback.push(action);
				}
			}
			this.credit/=this.marks;
		}
	},

	/** Are the student's answers to all of the gaps valid?
	 * @returns {boolean}
	 */
	validate: function()
	{
		//go through all gaps, and if any one fails to validate then
		//whole part fails to validate
		var success = true;
		for(var i=0; i<this.gaps.length; i++)
			success = success && this.gaps[i].answered;

		return success;
	}
};
GapFillPart.prototype.submit = util.extend(GapFillPart.prototype.submit, Part.prototype.submit);
GapFillPart.prototype.revealAnswer = util.extend(GapFillPart.prototype.revealAnswer, Part.prototype.revealAnswer);

/** Information only part - no input, no marking, just display some content to the student. 
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var InformationPart = Numbas.parts.InformationPart = function(xml, path, question, parentPart, loading)
{
	this.display = new Numbas.display.InformationPartDisplay(this);
	this.answered = true;
	this.isDirty = false;
}
InformationPart.prototype = /** @lends Numbas.parts.InformationOnlyPart.prototype */ {
	/** This part is always valid
	 * @returns {boolean} true
	 */
	validate: function() {
		this.answered = true;
		return true;
	},

	/** This part is never dirty
	 */
	setDirty: function() {
		this.isDirty = false;
	}
};


/** Associate part type names with their object constructors
 * @memberof Numbas.Question
 */
var partConstructors = Numbas.Question.partConstructors = {
	'jme': JMEPart,

	'patternmatch': PatternMatchPart,

	'numberentry': NumberEntryPart,
	'matrix': MatrixEntryPart,

	'1_n_2': MultipleResponsePart,
	'm_n_2': MultipleResponsePart,
	'm_n_x': MultipleResponsePart,

	'gapfill': GapFillPart,

	'information': InformationPart
};

var extend = util.extend;
for(var pc in partConstructors)
	partConstructors[pc]=extend(Part,partConstructors[pc]);

});
