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


Numbas.queueScript('scripts/question.js',['schedule','display','jme','jme-variables','xml','util','scorm-storage'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;

var job = Numbas.schedule.add;

var tryGetAttribute = Numbas.xml.tryGetAttribute;

var Question = Numbas.Question = function( exam, xml, number, loading, gscope )
{
	var q = this;
	q.exam = exam;
	q.xml = xml;
	q.originalXML = q.xml;
	q.number = number;
	q.scope = new jme.Scope(gscope);

	//get question's name
	tryGetAttribute(q,'.','name');

	job(function() {
		q.scope.functions = Numbas.jme.variables.makeFunctions(q.xml,q.scope);
		//make rulesets
		var rulesetNodes = q.xml.selectNodes('rulesets/set');

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

			sets[name] = set;
		}

		for(var name in sets)
		{
			q.scope.rulesets[name] = Numbas.jme.display.collectRuleset(sets[name],q.scope);
		}
	});

	job(function() {
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
			q.scope.variables = Numbas.jme.variables.makeVariables(q.xml,q.scope);
		}
	
		q.scope = new jme.Scope([gscope,q.scope]);
	});

	job(this.subvars,this);

	job(function()
	{
		q.adviceThreshold = q.exam.adviceGlobalThreshold;
		q.followVariables = {};
		
		//initialise display - get question HTML, make menu item, etc.
		q.display = new Numbas.display.QuestionDisplay(q);

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
		}

		q.updateScore();
		
		q.display.makeHTML();
		q.display.showScore();
	});

}
Question.prototype = 
{
	xml: '',
	number: -1,
	name: '',
	
	marks: 0,				//max. marks available for this question
	score: 0,				//student's score on this question
	adviceThreshold: 0,		//percentage score below which the advice is revealed.

	visited: false,			//has this question been seen by the student? For determining if you can jump back to this question, when navigateBrowse is disabled
	answered: false,		//has question been answered satisfactorily?
	submitted: 0,			//number of times question submitted
	adviceDisplayed: false,	//has question advice been displayed?
	revealed: false,		//has correct answer been revealed?

	parts: [],				//array containing all key parts
	partDictionary: {},		//dictionary mapping part addresses to objects

	display: undefined,		//display code

	subvars: function()
	{
		var q = this;
		var doc = Sarissa.getDomDocument();
		doc.appendChild($(q.originalXML).clone()[0]);	//get a fresh copy of the original XML, to sub variables into
		q.xml = doc.selectSingleNode('question');
		q.xml.setAttribute('number',q.number);

		job(function()
		{
			//substitute variables into content nodes
			var serializer = new XMLSerializer();
			var parser = new DOMParser();
			var contents = q.xml.selectNodes('descendant::content');

			//filter to get non-whitespace text nodes 
			function tnf(){ return ((this.nodeType == Node.TEXT_NODE) && !(/^\s*$/.test(this.nodeValue))); }

			//do contentsubvars on all content
			for(var i=0;i<contents.length;i++)
			{
				jme.variables.DOMcontentsubvars(contents[i],q.scope);
			}


		});

		job(function() {
			//sub vars into math nodes
			var mathsNodes = q.xml.selectNodes('descendant::math');
			for( i=0; i<mathsNodes.length; i++ )
			{
				var expr = Numbas.xml.getTextContent(mathsNodes[i]);
				expr = jme.subvars(expr,q.scope);
				Numbas.xml.setTextContent(mathsNodes[i],expr);
			}
			//turn content maths into LaTeX
			mathsNodes = q.xml.selectNodes('descendant::content/descendant::math');
			for( i=0; i<mathsNodes.length; i++ )
			{
				var expr = Numbas.xml.getTextContent(mathsNodes[i]);
				expr = jme.subvars(expr,q.scope);
				var tex = jme.display.exprToLaTeX(expr,null,q.scope);
				Numbas.xml.setTextContent( mathsNodes[i], tex );
			}

			//sub into question name
			q.name = jme.contentsubvars(q.name,q.scope);
		});
	},

	//get the part object corresponding to a path
	getPart: function(path)
	{
		return this.partDictionary[path];
	},

	//trigger advice
	getAdvice: function(loading)
	{
		this.adviceDisplayed = true;
		if(!loading)
		{
			this.display.showAdvice(true);
			Numbas.store.adviceDisplayed(this);
		}
	},

	//reveal correct answer to student
	revealAnswer: function(loading)
	{
		this.revealed = true;
		this.answered = true;
		
		//display advice if allowed
		this.getAdvice(loading);

		//part-specific reveal code. Might want to do some logging in future? 
		for(var i=0; i<this.parts.length; i++)
			this.parts[i].revealAnswer(loading);

		this.score = 0;

		if(!loading)
		{
			//display revealed answers
			this.display.revealAnswer();

			this.display.showScore();

			Numbas.store.answerRevealed(this);
		}

		this.exam.updateScore();
	},

	//validate question - returns true if all parts completed
	validate: function()
	{
		var success = true;
		for(i=0; i<this.parts.length; i++)
		{
			success = success && (this.parts[i].answered || this.parts[i].marks==0);
		}
		return success;
	},

	//mark the student's answer to a given part/gap/step
	doPart: function(answerList, partRef)
	{
		var part = this.getPart(partRef);
		if(!part)
			throw(new Numbas.Error('question.no such part',partRef));
		part.storeAnswer(answerList);
	},

	//calculate score - adds up all part scores
	calculateScore: function(uiWarning)
	{
		if(this.revealed)
		{
			this.score = 0;
			return 0;
		}

		var tmpScore=0;
		var answered = true;
		for(var i=0; i<this.parts.length; i++)
		{
			tmpScore += this.parts[i].score;
			answered = answered && this.parts[i].answered;
		}
		this.answered = answered;
		
		if( uiWarning!="uwPrevent" )
		{
			this.score = tmpScore;
		}
		else 
		{
			this.score = 0;
		}
	},


	//submit question answers
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

	//recalculate score, display, notify storage
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
	}

};



function createPart(xml, path, question, parentPart, loading)
{
	var type = tryGetAttribute(null,'.','type',[],{xml: xml});
	if(type==null)
		throw(new Numbas.Error('part.missing type attribute'));
	if(partConstructors[type])
	{
		var cons = partConstructors[type];
		var part = new cons(xml, path, question, parentPart, loading);
		return part;
	}
	else
	{
		throw(new Numbas.Error('part.unknown type',type));
	}
}

//base Question Part object
function Part( xml, path, question, parentPart, loading )
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
	
	tryGetAttribute(this,'.',['type','marks']);

	tryGetAttribute(this.settings,'.',['minimumMarks','enableMinimumMarks','stepsPenalty'],[],{xml: this.xml});

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

	//initialise display code
	this.display = new Numbas.display.PartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadPart(this);
		this.answered = pobj.answered;
		this.stepsShown = pobj.stepsShown;
	}
}

Part.prototype = {
	xml: '',				//XML defining this part
	question: undefined,	//reference to parent question object
	parentPart: undefined,	//reference to 'parent' part object - GapFillPart if this is a gap, the main keypart if this is a step
	path: '',				//a question-wide unique 'address' for this part 
	type: '',				//this part's type
	marks: 0,				//max. marks available for this part
	stepsMarks: 0,			//marks available in the steps, if any
	credit: 0,				//proportion of availabe marks awarded to student
	score: 0,				//student's score on this part
	markingFeedback: [],	//messages explaining awarded marks

	stagedAnswer: undefined,	//student's answers as visible on screen (not yet submitted)
	answerList: undefined,	//student's last submitted answer
	answered: false,		//has this part been answered

	gaps: [],				//child gapfills, if any
	steps: [],				//child steps, if any
	stepsShown: false,		//have steps for this part been shown?

	settings: 
	{
		stepsPenalty: 0,		//number of marks to deduct when steps shown
		enableMinimumMarks: false,
		minimumMarks: 0		//minimum marks to award
	},			//store part's settings in here

	display: undefined,		//code to do with displaying this part

	//give the student a warning about this part
	//might want to do some logging at some point,
	//so this is a method of the part object, which
	//then calls the display code
	giveWarning: function(warning)
	{
		this.display.warning(warning);
	},

	//calculate student's score for given answer.
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

	//update the stored answer from the student (called when student changes their answer, before submitting)
	storeAnswer: function(answerList) {
		this.stagedAnswer = answerList;
		this.display.removeWarnings();
	},

	//submit answer to this part - save answer, mark, update score
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

		if(this.marks==0)
			return;
		if(this.stagedAnswer==undefined || this.stagedAnswer=='')
		{
			this.giveWarning(R('part.marking.not submitted'));
			this.setCredit(0,R('part.marking.did not answer'));;
			this.answered = false;
		}
		else
		{
			this.answerList = util.copyarray(this.stagedAnswer);
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
			this.reportStudentAnswer(this.studentAnswer);
			if(!(this.parentPart && this.parentPart.type=='gapfill'))
				this.markingComment(
					util.pluralise(this.score,
						R('part.marking.total score single',math.niceNumber(this.score)),
						R('part.marking.total score plural',math.niceNumber(this.score))
					)
				);
		}
		else
			this.reportStudentAnswer('');

		Numbas.store.partAnswered(this);
		this.display.showScore(this.answered);

		this.submitting = false;
	},

	//save the student's answer as a question variable
	//so it can be used for carry-over marking
	reportStudentAnswer: function(answer) {
		var val;
		if(util.isFloat(answer))
			val = new Numbas.jme.types.TNum(answer);
		else
			val = new Numbas.jme.types.TString(answer);
		this.question.followVariables['$'+this.path] = val;
	},

	//function which marks the student's answer
	mark: function() {},

	////////marking feedback helpers
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

	addCredit: function(credit,message)
	{
		this.credit += credit;
		this.markingFeedback.push({
			op: 'addCredit',
			credit: credit,
			message: message
		});
	},

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

	markingComment: function(message)
	{
		this.markingFeedback.push({
			op: 'comment',
			message: message
		});
	},

	//is student's answer acceptable?
	validate: function() { return true; },

	//reveal the steps
	showSteps: function(loading)
	{
		this.stepsShown = true;
		this.calculateScore();
		if(!loading)
		{
			this.display.showSteps();
			this.question.updateScore();
			Numbas.store.stepsShown(this);
		}
	},

	//reveal the correct answer
	revealAnswer: function(loading)
	{
		if(!loading)
			this.display.revealAnswer();
		this.answered = true;
		this.setCredit(0);
		this.showSteps(loading);
		for(var i=0; i<this.steps.length; i++ )
		{
			this.steps[i].revealAnswer(loading);
		}
	}

};

//Judged Mathematical Expression
//student enters a string representing a mathematical expression, eg.
//		'x^2+x+1'
//and it is compared with the correct answer by evaluating over a range of values
function JMEPart(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(JMEPart.prototype.settings,settings);

	//parse correct answer from XML
	answerMathML = this.xml.selectSingleNode('answer/correctanswer');
	if(!answerMathML)
		throw(new Numbas.Error('part.jme.answer missing',this.path));

	tryGetAttribute(settings,'answer/correctanswer','simplification','answerSimplification',{xml: this.xml});

	settings.answerSimplification = Numbas.jme.display.collectRuleset(settings.answerSimplification,this.question.scope);

	settings.correctAnswer = jme.display.simplifyExpression(
		Numbas.xml.getTextContent(answerMathML).trim(),
		settings.answerSimplification,
		this.question.scope
	);

	settings.displaySimplification = '';
	
	//get checking type, accuracy, checking range
	var parametersPath = 'answer';
	tryGetAttribute(settings,parametersPath+'/checking',['type','accuracy','failurerate'],['checkingType','checkingAccuracy','failureRate'],{xml: this.xml});

	tryGetAttribute(settings,parametersPath+'/checking/range',['start','end','points'],['vsetRangeStart','vsetRangeEnd','vsetRangePoints'],{xml: this.xml});


	//max length and min length
	tryGetAttribute(settings,parametersPath+'/maxlength',['length','partialcredit'],['maxLength','maxLengthPC'],{xml: this.xml});
	var messageNode = xml.selectSingleNode('answer/maxlength/message');
	if(messageNode)
	{
		settings.maxLengthMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
		if($(settings.maxLengthMessage).text() == '')
			settings.maxLengthMessage = R('part.jme.answer too long');
	}
	tryGetAttribute(settings,parametersPath+'/minlength',['length','partialcredit'],['minLength','minLengthPC'],{xml: this.xml});
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
		tryGetAttribute(settings,mustHaveNode,['partialcredit','showstrings'],['mustHavePC','mustHaveShowStrings']);
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
		tryGetAttribute(settings,notAllowedNode,['partialcredit','showstrings'],['notAllowedPC','notAllowedShowStrings']);
		var messageNode = notAllowedNode.selectSingleNode('message');
		if(messageNode)
			settings.notAllowedMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
	}

	this.display = new Numbas.display.JMEPartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadJMEPart(this);
		this.stagedAnswer = [pobj.studentAnswer];
		if(this.answered)
			this.submit();
	}
}

JMEPart.prototype = 
{
	studentAnswer: '',

	settings: 
	{
		//string representing correct answer to question
		correctAnswer: '',

		//default simplification rules to use on correct answer
		answerSimplification: ['basic','unitFactor','unitPower','unitDenominator','zeroFactor','zeroTerm','zeroPower','collectNumbers','zeroBase','constantsFirst','sqrtProduct','sqrtDivision','sqrtSquare','otherNumbers'],
		
		//	checking type : SigFig (round answers to x sig figs)
		//					RelDiff (compare ratio of student answer to correct answer)
		//					AbsDiff (compare absolute difference between answers)
		//					Dp (round answers to x decimal places)
		checkingType: 'RelDiff',

		checkingAccuracy: 0,	//accuracy for checking - depends on checking type
		failureRate: 0,			//comparison failures allowed before we decide answers are different

		vsetRangeStart: 0,		//range to pick variable values from
		vsetRangeEnd: 1,
		vsetRangePoints: 1,		//number of points to compare answers on
		
		maxLength: 0,		//max length of student's answer
		maxLengthPC: 0,		//partial credit if student's answer too long
		maxLengthMessage: 'Your answer is too long',

		minLength: 0,		//min length of student's answer
		minLengthPC: 0,		//partial credit if student's answer too short
		minLengthMessage: 'Your answer is too short',

		mustHave: [],				//strings which must be present in student's answer
		mustHavePC: 0,				//partial credit if a must-have is missing
		mustHaveMessage: '',		//warning message if missing a must-have
		mustHaveShowStrings: false,	//tell students which strings must be included?

		notAllowed: [],				//strings which must not be present in student's answer
		notAllowedPC: 0,			//partial credit if a not-allowed string is present
		notAllowedMessage: '',		//warning message if not-allowed string present
		notAllowedShowStrings: false//tell students which strings are not allowed?
	},

	mark: function()
	{
		if(this.answerList==undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}
		this.studentAnswer = this.answerList[0];

		try
		{
			var simplifiedAnswer = Numbas.jme.display.simplifyExpression(this.studentAnswer,'',this.question.scope);
		}
		catch(e)
		{
			this.setCredit(0,R('part.jme.answer invalid'));
			return;
		}

		this.failMinLength = (this.settings.minLength>0 && simplifiedAnswer.length<this.settings.minLength);
		this.failMaxLength = (this.settings.maxLength>0 && simplifiedAnswer.length>this.settings.maxLength);
		this.failNotAllowed = false;
		this.failMustHave = false;

		//did student actually write anything?
		this.answered = this.studentAnswer.length > 0;
		
		//do comparison of student's answer with correct answer
		if(!jme.compare(this.studentAnswer, this.settings.correctAnswer, this.settings, this.question.scope))
		{
			this.setCredit(0,R('part.marking.incorrect'));
			return;
		}

		var noSpaceAnswer = this.studentAnswer.replace(/\s/g,'');
		//see if student answer contains any forbidden strings
		for( i=0; i<this.settings.notAllowed.length; i++ )
		{
			if(noSpaceAnswer.contains(this.settings.notAllowed[i])) { this.failNotAllowed = true; }
		}
		
		if(!this.failNotAllowed)
		{
			//see if student answer contains all the required strings
			for( i=0; i<this.settings.mustHave.length; i++ )
			{
				if(!noSpaceAnswer.contains(this.settings.mustHave[i])) { this.failMustHave = true; }
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


function PatternMatchPart(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(PatternMatchPart.prototype.settings,settings);

	settings.correctAnswer = Numbas.xml.getTextContent(this.xml.selectSingleNode('correctanswer'));
	settings.correctAnswer = jme.subvars(settings.correctAnswer, question.scope);

	var displayAnswerNode = this.xml.selectSingleNode('displayanswer');
	if(!displayAnswerNode)
		throw(new Numbas.Error('part.patternmatch.display answer missing',this.path));
	settings.displayAnswer = $.trim(Numbas.xml.getTextContent(displayAnswerNode));

	tryGetAttribute(settings,'case',['sensitive','partialCredit'],'caseSensitive',{xml: this.xml});

	this.display = new Numbas.display.PatternMatchPartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadPatternMatchPart(this);
		this.stagedAnswer = [pobj.studentAnswer];
		if(this.answered)
			this.submit();
	}
}
PatternMatchPart.prototype = {
	studentAnswer: '',

	settings: 
	{
		correctAnswer: /.*/,
		displayAnswer: '',
		caseSensitive: false,
		partialCredit: 0
	},

	mark: function ()
	{
		if(this.answerList==undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}
		this.studentAnswer = this.answerList[0];
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

	validate: function()
	{
		if(!this.answered)
			this.giveWarning(R('part.marking.not submitted'));

		return this.answered;
	}
};

function NumberEntryPart(xml, path, question, parentPart, loading)
{
	var evaluate = jme.evaluate, compile = jme.compile;
	var settings = this.settings;
	util.copyinto(NumberEntryPart.prototype.settings,settings);

	tryGetAttribute(settings,'answer',['minvalue','maxvalue'],['minvalue','maxvalue'],{xml: this.xml, string:true});
	tryGetAttribute(settings,'answer','inputstep','inputStep',{xml:this.xml});

	var minvalue = jme.subvars(settings.minvalue,this.question.scope);
	minvalue = evaluate(minvalue,this.question.scope);
	if(minvalue && minvalue.type=='number')
		settings.minvalue = minvalue.value - 0.00000000001;
	else
		throw(new Numbas.Error('part.setting not present','minimum value',this.path,this.question.name));

	var maxvalue = jme.subvars(settings.maxvalue,this.question.scope);
	maxvalue = evaluate(maxvalue,this.question.scope);
	if(maxvalue && maxvalue.type=='number')
		settings.maxvalue = maxvalue.value + 0.00000000001;
	else
		throw(new Numbas.Error('part.setting not present','maximum value',this.path,this.question.name));

	tryGetAttribute(settings,'answer/allowonlyintegeranswers',['value','partialcredit'],['integerAnswer','partialCredit'],{xml: this.xml});

	settings.displayAnswer = math.niceNumber((settings.minvalue + settings.maxvalue)/2);

	this.display = new Numbas.display.NumberEntryPartDisplay(this);
	
	if(loading)
	{
		var pobj = Numbas.store.loadNumberEntryPart(this);
		this.stagedAnswer = [pobj.studentAnswer+''];
		if(this.answered)
			this.submit();
	}
}
NumberEntryPart.prototype =
{
	studentAnswer: '',

	settings:
	{
		inputStep: 1,
		minvalue: 0,
		maxvalue: 0,
		integerAnswer: false,//must answer be an integer?
		partialCredit: 0,	//partial credit to award if answer is not an integer
		displayAnswer: 0	//number to display if revealing answer
	},

	mark: function()
	{
		if(this.answerList==undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}
		this.studentAnswer = this.answerList[0];
		
		// do a bit of string tidy up
		// uk number format only for now - get rid of any UK 1000 separators	
		this.studentAnswer = this.studentAnswer.replace(/,/g, '');
		this.studentAnswer = $.trim(this.studentAnswer);
		
		if( this.studentAnswer.length>0 && !isNaN(this.studentAnswer) )
		{
			this.studentAnswer = parseFloat(this.studentAnswer);
			if( this.studentAnswer <= this.settings.maxvalue && this.studentAnswer >= this.settings.minvalue )
			{
				if(this.settings.integerAnswer && !util.isInt(this.studentAnswer))
					this.setCredit(this.settings.partialCredit,R('part.numberentry.correct except decimal'));
				else
					this.setCredit(1,R('part.marking.correct'));
			}else{
				this.setCredit(0,R('part.marking.incorrect'));
			}
			this.answered = true;
		}else{
			this.answered = false;
			this.setCredit(0,R('part.numberentry.answer invalid'));
		}
	},

	validate: function()
	{
		if(!this.answered)
			this.giveWarning(R('part.marking.not submitted'));
		
		return this.answered;
	}
};


function MultipleResponsePart(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(MultipleResponsePart.prototype.settings,settings);


	//work out marks available
	tryGetAttribute(settings,'marking/maxmarks','enabled','maxMarksEnabled',{xml: this.xml});
	if(settings.maxMarksEnabled)
	{
		tryGetAttribute(this,'marking/maxmarks','value','marks',{xml: this.xml});
	}
	else
	{
		tryGetAttribute(this,'.','marks');
	}

	//get restrictions on number of choices
	var choicesNode = this.xml.selectSingleNode('choices');
	if(!choicesNode)
		throw(new Numbas.Error('part.mcq.choices missing',this.path));

	tryGetAttribute(settings,choicesNode,['minimumexpected','maximumexpected','order','displayType'],['minAnswers','maxAnswers','choiceOrder']);

	var minAnswers = jme.subvars(settings.minAnswers, question.scope);
	minAnswers = jme.evaluate(settings.minAnswers,this.question.scope);
	if(minAnswers && minAnswers.type=='number')
		settings.minAnswers = minAnswers.value;
	else
		throw(new Numbas.Error('part.setting not present','minimum answers',this.path,this.question.name))
	var maxAnswers = jme.subvars(settings.maxAnswers, question.scope);
	maxAnswers = jme.evaluate(settings.maxAnswers,this.question.scope);
	if(maxAnswers && maxAnswers.type=='number')
		settings.maxAnswers = maxAnswers.value;
	else
		throw(new Numbas.Error('part.setting not present','maximum answers',this.path,this.question.name))

	var choiceNodes = choicesNode.selectNodes('choice');
	this.numChoices = choiceNodes.length;
	
	//get number of answers and answer order setting
	if(this.type == '1_n_2' || this.type == 'm_n_2')
	{
		this.numAnswers = 1;
	}
	else
	{
		var answersNode = this.xml.selectSingleNode('answers');
		if(answersNode)
		{
			tryGetAttribute(settings,answersNode,'order','answerOrder');
			var answerNodes = answersNode.selectNodes('answer');
			this.numAnswers = answerNodes.length;
		}
	}

	//get warning type and message for wrong number of choices
	warningNode = this.xml.selectSingleNode('uiwarning');
	if(warningNode)
	{
		tryGetAttribute(settings,warningNode,'type','warningType');
		settings.warningMessage = $.xsl.transform(Numbas.xml.templates.question,warningNode).string;
	}
	
	if(loading)
	{
		var pobj = Numbas.store.loadMultipleResponsePart(this);
		this.shuffleChoices = pobj.shuffleChoices;
		this.shuffleAnswers = pobj.shuffleAnswers;
		this.ticks = pobj.ticks;
	}
	else
	{

		this.shuffleChoices=[];
		if(settings.choiceOrder=='random')
		{
			this.shuffleChoices = math.deal(this.numChoices);
		}
		else
		{
			this.shuffleChoices = math.range(this.numChoices);
		}

		this.shuffleAnswers=[];
		if(settings.answerOrder=='random')
		{
			this.shuffleAnswers = math.deal(this.numAnswers);
		}
		else
		{
			this.shuffleAnswers = math.range(this.numAnswers);
		}
	}

	for(var i=0;i<this.numChoices;i++)
	{
		choicesNode.removeChild(choiceNodes[i]);
	}
	for(i=0;i<this.numChoices;i++)
	{
		choicesNode.appendChild(choiceNodes[this.shuffleChoices[i]]);
	}
	if(this.type == 'm_n_x')
	{
		for(i=0;i<this.numAnswers;i++)
		{
			answersNode.removeChild(answerNodes[i]);
		}
		for(i=0;i<this.numAnswers;i++)
		{
			answersNode.appendChild(answerNodes[this.shuffleAnswers[i]]);
		}
	}

	//invert the shuffle so we can now tell where particular choices/answers went
	this.shuffleChoices = math.inverse(this.shuffleChoices);
	this.shuffleAnswers = math.inverse(this.shuffleAnswers);

	//fill marks matrix
	var matrix=[];
	var def;
	if(def = this.xml.selectSingleNode('marking/matrix').getAttribute('def'))
	{
		matrix = jme.evaluate(def,this.question.scope);
		if(matrix.type!='list')
		{
			throw(new Numbas.Error('part.mcq.matrix not a list'));
		}
		if(matrix.value[0].type=='list')
		{
			matrix = matrix.value.map(function(row){	//convert TNums to javascript numbers
				return row.map(function(e){return e.value;});
			});
		}
		else
		{
			matrix = matrix.value.map(function(e) {
				return [e.value];
			});
		}
	}
	else
	{
		var matrixNodes = this.xml.selectNodes('marking/matrix/mark');
		for( i=0; i<matrixNodes.length; i++ )
		{
			var cell = {value: ""};
			tryGetAttribute(cell, matrixNodes[i], ['answerIndex', 'choiceIndex', 'value']);

			if(util.isFloat(cell.value))
				cell.value = parseFloat(cell.value);
			else
			{
				cell.value = jme.evaluate(cell.value,this.question.scope).value;
				if(!util.isFloat(cell.value))
					throw(new Numbas.Error('part.mcq.matrix not a number',this.path,cell.answerIndex,cell.choiceIndex));
				cell.value = parseFloat(cell.value);
			}

			//take into account shuffling
			cell.answerIndex = this.shuffleAnswers[cell.answerIndex];
			cell.choiceIndex = this.shuffleChoices[cell.choiceIndex];

			if(this.type == '1_n_2' || this.type == 'm_n_2')
			{	//for some reason, possible answers are recorded as choices in the multiple choice types.
				//switch the indices round, so we don't have to worry about this again
				cell.answerIndex = cell.choiceIndex;
				cell.choiceIndex = 0;
			}

			if(!matrix[cell.answerIndex])
				matrix[cell.answerIndex]=[];
			matrix[cell.answerIndex][cell.choiceIndex] = cell.value;
		}
	}
	settings.matrix = matrix;
	var distractors=[];
	var distractorNodes = this.xml.selectNodes('marking/distractors/distractor');
	for( i=0; i<distractorNodes.length; i++ )
	{
		var cell = {message: ""};
		tryGetAttribute(cell, distractorNodes[i], ['answerIndex', 'choiceIndex']);
		cell.message= $.xsl.transform(Numbas.xml.templates.question,distractorNodes[i]).string;

		//take into account shuffling
		cell.answerIndex = this.shuffleAnswers[cell.answerIndex];
		cell.choiceIndex = this.shuffleChoices[cell.choiceIndex];

		if(this.type == '1_n_2' || this.type == 'm_n_2')
		{	//for some reason, possible answers are recorded as choices in the multiple choice types.
			//switch the indices round, so we don't have to worry about this again
			cell.answerIndex = cell.choiceIndex;
			cell.choiceIndex = 0;
		}

		if(!distractors[cell.answerIndex])
			distractors[cell.answerIndex]=[];
		distractors[cell.answerIndex][cell.choiceIndex] = cell.message;
	}
	settings.distractors = distractors;

	if(settings.maxAnswers==0)
	{
		if(this.type=='1_n_2')
			settings.maxAnswers = 1;
		else
			settings.maxAnswers = this.numAnswers * this.numChoices;
	}
	
	if(this.marks == 0)	//if marks not set explicitly
	{
		var flat = [];
		switch(this.type)
		{
		case '1_n_2':
			for(var i=0;i<matrix.length;i++)
			{
				flat.push(matrix[i][0]);
			}
			break;
		case 'm_n_2':
			for(var i=0;i<matrix.length;i++)
			{
				flat.push(matrix[i][0]);
			}
			break;
		case 'm_n_x':
			if(settings.displayType=='radiogroup')
			{
				for(var i=0;i<this.numChoices;i++)
				{
					var row = [];
					for(var j=0;j<this.numAnswers;j++)
					{
						row.push(matrix[j][i]);
					}
					row.sort();
					flat.push(row[row.length-1]);
				}
			}
			else
			{
				for(var i=0;i<matrix.length;i++)
				{
					flat = flat.concat(matrix[i]);
				}
			}
			break;
		}
		flat.sort();
		for(var i=flat.length-1; i>=0 && flat.length-1-i<settings.maxAnswers && flat[i]>0;i--)
		{
			this.marks+=flat[i];
		}
	}

	if(this.type == '1_n_2' || this.type == 'm_n_2')
	{	//because we swapped answers and choices round in the marking matrix
		this.numAnswers = this.numChoices;
		this.numChoices = 1;
		var flipped=true;
	}
	else
		var flipped=false;

	//restore saved choices
	if(loading)
	{
		this.stagedAnswer = [];
		for( i=0; i<this.numAnswers; i++ )
		{
			this.stagedAnswer.push([]);
			for( var j=0; j<this.numChoices; j++ )
			{
				this.stagedAnswer[i].push(false);
			}
		}
		for( i=0;i<this.numAnswers;i++)
		{
			for(j=0;j<this.numChoices;j++)
			{
				if(pobj.ticks[i][j])
					this.stagedAnswer[i][j]=true;
			}
		}
		if(this.answered)
			this.submit();
	}
	else
	{
		//ticks array - which answers/choices are selected?
		this.ticks=[];
		this.stagedAnswer = [];
		for( i=0; i<this.numAnswers; i++ )
		{
			this.ticks.push([]);
			this.stagedAnswer.push([]);
			for( var j=0; j<this.numChoices; j++ )
			{
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
MultipleResponsePart.prototype =
{
	ticks: [],						//store student's responses here - array to say if each response has been selected or not
	wrongNumber: false,				//has student given the wrong number of responses?
	numChoices: 0,					//number of choices
	numAnswers: 0,					//number of possible answers

	settings:
	{
		maxMarksEnabled: false,		//is there a maximum number of marks the student can get?
		minAnswers: '0',				//minimum number of responses student must select
		maxAnswers: '0',				//maximum ditto
		choiceOrder: '',			//order in which to display choices
		answerOrder: '',			//order in which to display answers
		matrix: [],					//marks matrix
		displayType: '',			//how to display the responses? can be: radiogroup, dropdownlist, buttonimage, checkbox, choicecontent
		warningType: '',			//what to do if wrong number of responses
		warningMessage: ''			//message to display if wrong number of responses
	},

	storeAnswer: function(answerList)
	{
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

	mark: function()
	{
		if(this.stagedAnswer==undefined)
		{
			this.setCredit(0,R('part.marking.did not answer'));
			return false;
		}
		this.ticks = util.copyarray(this.stagedAnswer);
		this.setCredit(0);

		this.numTicks = 0;
		var partScore = 0;
		for( i=0; i<this.numAnswers; i++ )
		{
			for(var j=0; j<this.numChoices; j++ )
			{
				if(this.ticks[i][j])
				{
					partScore += this.settings.matrix[i][j];
					this.numTicks += 1;

					var row = this.settings.distractors[i];
					if(row)
						var message = row[j];
					var award = this.settings.matrix[i][j];
					if(award>0) {
						if($(message).text().trim().length==0 && award>0)
							message = R('part.mcq.correct choice');
						this.addCredit(award/this.marks,message);
					}
				}
			}
		}

		if(this.credit<=0)
			this.markingComment(R('part.marking.incorrect'));

		this.wrongNumber = (this.numTicks<this.settings.minAnswers || (this.numTicks>this.settings.maxAnswers && this.settings.maxAnswers>0));

		if(this.marks>0 && !this.wrongNumber)
		{
			this.setCredit(Math.min(partScore,this.marks)/this.marks);	//this part might have a maximum number of marks which is less then the sum of the marking matrix
		}
		else
			this.setCredit(0,R('part.mcq.wrong number of choices'));
	},

	validate: function()
	{
		if(this.wrongNumber)
		{
			switch(this.settings.warningType)
			{
			case 'uwPrevent':
				this.giveWarning(this.settings.warningMessage);
				return false;
				break;
			case 'uwWarn':
				this.giveWarning(this.settings.warningMessage);
				break;
			}
		}

		if(this.numTicks>0)
			return true;
		else
			this.giveWarning(R('part.mcq.no choices selected'));
			return false;
	},

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

function GapFillPart(xml, path, question, parentPart, loading)
{
	var gapXML = this.xml.selectNodes('gaps/part');

	this.marks = 0;

	for( var i=0 ; i<gapXML.length; i++ )
	{
		var gap = createPart(gapXML[i], path+'g'+i, this.question, this, loading);
		this.marks += gap.marks;
		this.gaps[i]=gap;
	}

	this.display = new Numbas.display.GapFillPartDisplay(this);

	if(loading)
	{
		if(this.answered)
			this.submit();
	}
}	
GapFillPart.prototype =
{
	stagedAnswer: 'something',

	revealAnswer: function(loading)
	{
		for(var i=0; i<this.gaps.length; i++)
			this.gaps[i].revealAnswer(loading);
	},

	submit: function()
	{
		this.submitting = true;
		for(var i=0;i<this.gaps.length;i++)
		{
			this.gaps[i].submit();
		}
		this.submitting = false;
	},

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

function InformationPart(xml, path, question, parentPart, loading)
{
	this.display = new Numbas.display.InformationPartDisplay(this);
}
InformationPart.prototype = {
	validate: function() {
		return true;
	}
};


//associate part type names with their object constructors
var partConstructors = Numbas.Question.partConstructors = {
	'CUEdt.JMEPart': JMEPart, 
	'jme': JMEPart,

	'CUEdt.PatternMatchPart': PatternMatchPart,
	'patternmatch': PatternMatchPart,

	'CUEdt.NumberEntryPart': NumberEntryPart,
	'numberentry': NumberEntryPart,

	'CUEdt.MR1_n_2Part': MultipleResponsePart,
	'CUEdt.MRm_n_2Part': MultipleResponsePart,
	'CUEdt.MRm_n_xPart': MultipleResponsePart,
	'1_n_2': MultipleResponsePart,
	'm_n_2': MultipleResponsePart,
	'm_n_x': MultipleResponsePart,

	'CUEdt.GapFillPart': GapFillPart,
	'gapfill': GapFillPart,

	'CUEdt.InformationOnlyPart': InformationPart,
	'information': InformationPart
};

var extend = util.extend;
for(var pc in partConstructors)
	partConstructors[pc]=extend(Part,partConstructors[pc]);

});
