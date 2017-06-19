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

/** @file {@link Numbas.parts}, {@link Numbas.partConstructors}, {@link Numbas.createPart} and the generic {@link Numbas.parts.Part} object */

Numbas.queueScript('part',['base','schedule','display','jme','jme-variables','xml','util','scorm-storage'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;

var tryGetAttribute = Numbas.xml.tryGetAttribute;

/** A unique identifier for a {@link Numbas.parts.Part} object, of the form `qXpY[gZ|sZ]`. Numbering starts from zero, and the `gZ` bit is used only when the part is a gap, and `sZ` is used if it's a step.
 * @typedef partpath
 * @type {String}
 */

/** Part type constructors
 * These functions aren't called directly - they're the original part constructor objects before they're extended with the generic part methods, kept for reference so their methods can be reused by other parts
 * @see Numbas.partConstructors
 * @namespace Numbas.parts
 * @memberof Numbas
 */
Numbas.parts = {};

/** Associate part type names with their object constructors
 * These constructors are called by {@link Numbas.createPart} - they should be finalised constructors with all the generic part methods implemented.
 * Most often, you do this by extending {@link Numbas.parts.Part}
 * @memberof Numbas
 */
var partConstructors = Numbas.partConstructors = {};


/** Create a new question part. Automatically picks the right constructor based on the type defined in the XML.
 * @param {Element} xml
 * @param {partpath} path
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Boolean} loading
 * @returns {Numbas.parts.Part}
 * @throws {Numbas.Error} "part.missing type attribute" if the top node in `xml` doesn't have a "type" attribute.
 * @memberof Numbas
 */
var createPart = Numbas.createPart = function(xml, path, question, parentPart, loading)
{
	var type = tryGetAttribute(null,xml,'.','type',[]);
	if(type==null) {
		throw(new Numbas.Error('part.missing type attribute',{part:util.nicePartName(path)}));
	}
	if(partConstructors[type])
	{
		var cons = partConstructors[type];
		var part = new cons(xml, path, question, parentPart, loading);
		if(part.customConstructor) {
			part.customConstructor.apply(part);
		}
		if(loading && part.answered) {
			question.onHTMLAttached(function() {part.submit()});
		}
		return part;
	}
	else {
		throw(new Numbas.Error('part.unknown type',{part:util.nicePartName(path),type:type}));
	}
}

/** Base question part object
 * @constructor
 * @memberof Numbas.parts
 * @param {Element} xml
 * @param {partpath} path
 * @param {Numbas.Question} Question
 * @param {Numbas.parts.Part} parentPart
 * @param {Boolean} loading
 * @see Numbas.createPart
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

    this.index = parseInt(this.path.match(/\d+$/));

	//initialise settings object
	this.settings = util.copyobj(Part.prototype.settings);
	
	tryGetAttribute(this,this.xml,'.',['type','marks']);

	tryGetAttribute(this.settings,this.xml,'.',['minimumMarks','enableMinimumMarks','stepsPenalty','showCorrectAnswer','showFeedbackIcon'],[]);

	//initialise gap and step arrays
	this.gaps = [];
	this.steps = [];
    this.isStep = false;

	//load steps
	var stepNodes = this.xml.selectNodes('steps/part');
	for(var i=0; i<stepNodes.length; i++)
	{
		var step = Numbas.createPart( stepNodes[i], this.path+'s'+i, this.question, this, loading);
        step.isStep = true;
		this.steps[i] = step;
		this.stepsMarks += step.marks;
	}

	var variableReplacementsNode = this.xml.selectSingleNode('adaptivemarking/variablereplacements');
	tryGetAttribute(this.settings,this.xml,variableReplacementsNode,['strategy'],['variableReplacementStrategy'])

	var replacementNodes = variableReplacementsNode.selectNodes('replace');
	this.settings.errorCarriedForwardReplacements = [];
	this.errorCarriedForwardBackReferences = {};
	this.settings.hasVariableReplacements = replacementNodes.length>0;
	for(var i=0;i<replacementNodes.length;i++) {
		var n = replacementNodes[i];
		var vr = {}
		tryGetAttribute(vr,n,'.',['variable','part','must_go_first']);
		vr.variable = vr.variable.toLowerCase();
		this.settings.errorCarriedForwardReplacements.push(vr);
	}

	this.markingFeedback = [];
	this.warnings = [];
	this.validation = {};

	this.scripts = {};
	var scriptNodes = this.xml.selectNodes('scripts/script');
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
			script = eval('(function(){try{'+script+'\n}catch(e){Numbas.showError(new Numbas.Error(\'part.script.error\',{path:util.nicePartName(this.path),script:name,message:e.message}))}})');
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
	 * @type {String}
	 */
	type: '',

	/** Maximum marks available for this part
	 * @type {Number}
	 */
	marks: 0,

	/** Marks available for the steps, if any
	 * @type {Number}
	 */
	stepsMarks: 0,

	/** Proportion of available marks awarded to the student - i.e. `score/marks`. Penalties will affect this instead of the raw score, because of things like the steps marking algorithm.
	 * @type {Number}
	 */
	credit: 0,

	/** Student's score on this part
	 * @type {Number}
	 */
	score: 0,
	
	/** Messages explaining how marks were awarded
	 * @type {Array.<Numbas.parts.feedbackmessage>}
	 */
	markingFeedback: [],

	/** Warnings shown next to the student's answer
	 * @type {Array.<String>}
	 */
	warnings: [],

	/** Has the student changed their answer since last submitting?
	 * @type {Boolean}
	 */
	isDirty: false,

	/** Student's answers as visible on the screen (not necessarily yet submitted)
	 * @type {Array.<String>}
	 */
	stagedAnswer: undefined,

	/** Student's last submitted answer - a copy of {@link Numbas.parts.Part.stagedAnswer} taken when they submitted.
	 * @type {Array.<String>}
	 */
	answerList: undefined,

	/** Has this part been answered?
	 * @type {Boolean}
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
	 * @type {Boolean}
	 */
	stepsShown: false,

	/** Is the steps display open? (Students can toggle it, but that doesn't affect whether they get the penalty)
	 * @type {Boolean}
	 */
	stepsOpen: false,

	/** True if this part should be resubmitted because another part it depended on has changed
	 * @type {Boolean}
	 */
	shouldResubmit: false,

	/** Does this mark do any marking? False for information only parts
	 * @type {Boolean}
	 */
	doesMarking: true,

	/** Properties set when the part is generated
	 * @type {Object}
	 * @property {Number} stepsPenalty - Number of marks to deduct when the steps are shown
	 * @property {Boolean} enableMinimumMarks - Is there a lower limit on the score the student can be awarded for this part?
	 * @property {Number} minimumMarks - Lower limit on the score the student can be awarded for this part
	 * @property {Boolean} showCorrectAnswer - Show the correct answer on reveal?
	 * @property {Boolean} hasVariableReplacements - Does this part have any variable replacement rules?
	 */
	settings: 
	{
		stepsPenalty: 0,
		enableMinimumMarks: false,
		minimumMarks: 0,
		showCorrectAnswer: true,
		showFeedbackIcon: true,
		hasVariableReplacements: false
	},

	/** Throw an error, with the part's identifier prepended to the message
	 * @param {String} message
	 * @returns {Numbas.Error}
	 */
	error: function(message) {
		message = R.apply(this,arguments);
		var niceName = Numbas.util.capitalise(util.nicePartName(this.path));
		throw(new Numbas.Error(niceName+': '+message));
	},

	applyScripts: function() {
        var part = this;
		this.originalScripts = {};

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

                    function instead(script) {
                        return function() {
                            return script.apply(part,arguments);
                        }
                    }
                    function before(script,originalScript) {
                        return function() {
                            script.apply(part,arguments);
                            return originalScript.apply(this,arguments);
                        }
                    }
                    function after(script,originalScript) {
                        return function() {
                            originalScript.apply(this,arguments);
                            return script.apply(part,arguments);
                        }
                    }

					switch(order) {
						case 'instead':
							this[name] = instead(script);
							break;
						case 'before':
							this[name] = before(script,originalScript);
							break;
						case 'after':
							this[name] = after(script,originalScript);
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
	 * @param {String} warning
	 * @see Numbas.display.PartDisplay.warning
	 */
	giveWarning: function(warning)
	{
		this.warnings.push(warning);
		this.display.warning(warning);
	},

	/** Set the list of warnings
	 * @param {Array.<String>} warnings
	 * @see Numbas.display.PartDisplay.warning
	 */
	setWarnings: function(warnings) {
		this.warnings = warnings;
		this.display.setWarnings(warnings);
	},

	/** Remove all warnings
	 * @see Numbas.display.PartDisplay.warning
	 */
	removeWarnings: function() {
		this.setWarnings([]);
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
					this.markingComment(R('part.marking.steps change',{count:change}));
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
        if(this.revealed) {
            this.score = 0;
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
	 * @param {Boolean} dirty
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
		this.shouldResubmit = false;
		this.display.removeWarnings();
		this.credit = 0;
		this.markingFeedback = [];
		this.submitting = true;

		if(this.stepsShown)
		{
			var stepsMax = this.marks - this.settings.stepsPenalty;
			this.markingComment(
				this.settings.stepsPenalty>0 
					? R('part.marking.revealed steps with penalty',{count:stepsMax})	
                    : R('part.marking.revealed steps no penalty'));
		}

		if(this.stagedAnswer) {
			this.answerList = util.copyarray(this.stagedAnswer);
		}
		this.setStudentAnswer();

		if(this.doesMarking) {
			if(this.hasStagedAnswer()) {
				this.setDirty(false);

				// save existing feedback
				var existing_feedback = {
					warnings: this.warnings.slice(),
					markingFeedback: this.markingFeedback.slice()
				};

				var result;
				var try_replacement;

				try{
					if(this.settings.variableReplacementStrategy=='originalfirst') {
						var result_original = this.markAgainstScope(this.question.scope,existing_feedback);
						result = result_original;
						var try_replacement = this.settings.hasVariableReplacements && (!result.answered || result.credit<1);
					}
					if(this.settings.variableReplacementStrategy=='alwaysreplace' || try_replacement) {
						try {
							var scope = this.errorCarriedForwardScope();
						} catch(e) {
							if(!result) {
								this.giveWarning(e.originalMessage);
								this.answered = false;
								throw(e);
							}
						}
						var result_replacement = this.markAgainstScope(scope,existing_feedback);
						if(!(result_original) || (result_replacement.answered && result_replacement.credit>result_original.credit)) {
							result = result_replacement;
							result.markingFeedback.splice(0,0,{op: 'comment', message: R('part.marking.used variable replacements')});
						}
					}

                    if(!result) {
                        this.error('part.marking.no result');
                    }

					this.setWarnings(result.warnings);
					this.markingFeedback = result.markingFeedback;
					this.credit = result.credit;
					this.answered = result.answered;
				} catch(e) {
                    throw(new Numbas.Error('part.marking.uncaught error',{part:util.nicePartName(this.path),message:e.message}));
				}
			} else {
				this.giveWarning(R('part.marking.not submitted'));
				this.setCredit(0,R('part.marking.did not answer'));;
				this.answered = false;
			}
		}

        if(this.stepsShown) {
            for(var i=0;i<this.steps.length;i++) {
                if(this.steps[i].isDirty) {
                    this.steps[i].submit();
                }
            }
        }

		this.calculateScore();
		this.question.updateScore();

		if(this.answered)
		{
			if(!(this.parentPart && this.parentPart.type=='gapfill'))
				this.markingComment(
					R('part.marking.total score',{count:this.score})
				);
		}

		Numbas.store.partAnswered(this);
		this.display.showScore(this.answered);

		this.submitting = false;

		if(this.answered) {
			for(var path in this.errorCarriedForwardBackReferences) {
				var p2 = this.question.getPart(path);
				p2.pleaseResubmit();
			}
		}
	},

	/** Has the student entered an answer to this part?
	 * @see Numbas.parts.Part#stagedAnswer
	 * @returns {Boolean}
	 */
	hasStagedAnswer: function() {
		return !(this.stagedAnswer==undefined || this.stagedAnswer=='');
	},

	/** Called by another part when its marking means that the marking for this part might change (i.e., when this part replaces a variable with the answer from the other part)
	 * Sets this part as dirty, and gives a warning explaining why the student must resubmit.
	 */
	pleaseResubmit: function() {
		if(!this.shouldResubmit) {
			this.shouldResubmit = true;
			this.setDirty(true);
			this.giveWarning(R('part.marking.resubmit because of variable replacement'));
		}
	},

    /** @typedef {Object} Numbas.parts.feedbackmessage 
     * @property {String} op - the kind of feedback
     * @see Numbas.parts.Part#setCredit Numbas.parts.Part#addCredit Numbas.parts.Part#multCredit Numbas.parts.Part#markingComment
     */

    /** @typedef {Object} Numbas.parts.marking_results
     * A dictionary representing the results of marking a student's answer.
     * @property {Array.<String>} warnings - Warning messages.
     * @property {Array.<Numbas.parts.feedbackmessage>} markingFeedback - Feedback messages.
     * @property {Object} validation - dictionary of data to be used by {@link Numbas.parts.Part#validate} to determine if the student's answer could be marked.
     * @property {Number} credit - Proportion of the available marks to award to the student.
     * @property {Boolean} answered - True if the student's answer could be marked. False if the answer was invalid - the student should change their answer and resubmit.
     */

	/** Calculate the correct answer in the given scope, and mark the student's answer
	 * @param {Numbas.jme.Scope} scope - scope in which to calculate the correct answer
	 * @param {Object.<Array.<String>>} feedback - dictionary of existing `warnings` and `markingFeedback` lists, to add to - copies of these are returned with any additional feedback appended
	 * @returns {Numbas.parts.marking_results}
	 */
	markAgainstScope: function(scope,feedback) {
		this.setWarnings(feedback.warnings.slice());
		this.markingFeedback = feedback.markingFeedback.slice();
		this.validation = {};

        try {
    		this.getCorrectAnswer(scope);

    		this.mark();
	    	this.answered = this.validate();
        } catch(e) {
            this.giveWarning(e.message);
        }

		return {
			warnings: this.warnings.slice(),
			markingFeedback: this.markingFeedback.slice(),
			validation: util.copyobj(this.validation),
			credit: this.credit,
			answered: this.answered
		}
	},

	/** Replace variables with student's answers to previous parts
	 * @returns {Numbas.jme.Scope}
	 */
	errorCarriedForwardScope: function() {
		// dictionary of variables to replace
		var replace = this.settings.errorCarriedForwardReplacements;
		var replaced = [];

		// fill scope with new values of those variables
		var new_variables = {}
		for(var i=0;i<replace.length;i++) {
			var vr = replace[i];
			var p2 = this.question.getPart(vr.part);
			if(p2.answered) {
				new_variables[vr.variable] = p2.studentAnswerAsJME();
				replaced.push(vr.variable);
			} else if(vr.must_go_first) {
				throw(new Numbas.Error("part.marking.variable replacement part not answered",{part:util.nicePartName(vr.part)}));
			}
		}
		for(var i=0;i<replace.length;i++) {
			var p2 = this.question.getPart(replace[i].part);
			p2.errorCarriedForwardBackReferences[this.path] = true;
		}
		var scope = new Numbas.jme.Scope([this.question.scope,{variables: new_variables}])

		// find dependent variables which need to be recomputed
		var todo = Numbas.jme.variables.variableDependants(this.question.variablesTodo,replaced);
		for(var name in todo) {
			if(name in new_variables) {
				delete todo[name];
			} else {
				delete scope.variables[name];
			}
		}

		// compute those variables
		var nv = Numbas.jme.variables.makeVariables(todo,scope);
		scope = new Numbas.jme.Scope([scope,{variables:nv.variables}]);

		return scope;
	},

	/** Compute the correct answer, based on the given scope
	 * Anything to do with marking that depends on the scope should be in this method, and calling it with a new scope should update all the settings used by the marking algorithm.
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

	/** Function which marks the student's answer: set the credit for the student's answer to a number between 0 and 1. Runs before {@link Numbas.parts.Part#validate} - set properties on `this.validation` to record reasons answer is valid/invalid.
	 * @abstract
     * @see Numbas.parts.Part#setCredit
     * @see Numbas.parts.Part#markingComment
     * @see Numbas.parts.Part#validate
	 */
	mark: function() {},

	/** Set the `credit` to an absolute value
	 * @param {Number} credit
	 * @param {String} message - message to show in feedback to explain this action
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
	 * @param {Number} credit - amount to add
	 * @param {String} message - message to show in feedback to explain this action
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
	 * @param {Number} factor
	 * @param {String} message - message to show in feedback to explain this action
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
	 * @param {String} message
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
	 * @returns {Boolean}
	 */
	validate: function() { return true; },

	/** Show the steps, as a result of the student asking to show them.
	 * If the answers have not been revealed, we should apply the steps penalty.
	 *
	 * @param {Boolean} dontStore - don't tell the storage that this is happening - use when loading from storage to avoid callback loops
	 */
	showSteps: function(dontStore)
	{
		this.openSteps();
		if(this.revealed) {
			return;
		}

		this.stepsShown = true;
		if(!this.revealed) {
			if(this.answered) {
				this.submit();
            } else {
                this.calculateScore();
				this.question.updateScore();
            }
		} else {
            this.calculateScore();
        }
		if(!dontStore) {
			Numbas.store.stepsShown(this);
		}
	},

	/** Open the steps, either because the student asked or the answers to the question are being revealed. This doesn't affect the steps penalty.
	 */
	openSteps: function() {
		this.stepsOpen = true;
		this.display.showSteps();
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
	 * @param {Boolean} dontStore - don't tell the storage that this is happening - use when loading from storage to avoid callback loops
	 */
	revealAnswer: function(dontStore)
	{
		this.display.revealAnswer();
		this.revealed = true;
        this.setDirty(false);

		//this.setCredit(0);
		if(this.steps.length>0) {
			this.openSteps();
			for(var i=0; i<this.steps.length; i++ )
			{
				this.steps[i].revealAnswer(dontStore);
			}
		}
	}

};


});
