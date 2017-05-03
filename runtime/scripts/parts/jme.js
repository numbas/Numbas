/*
Copyright 2011-15 Newcastle University

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

/** @file The {@link Numbas.parts.JMEPart} object */

Numbas.queueScript('parts/jme',['base','display','jme','jme-variables','xml','util','scorm-storage','part'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var tryGetAttribute = Numbas.xml.tryGetAttribute;
var nicePartName = util.nicePartName;

var Part = Numbas.parts.Part;

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
	if(!answerMathML) {
		this.error('part.jme.answer missing');
	}

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
			settings.expectedVariableNames.push(Numbas.xml.getTextContent(nameNodes[i]).toLowerCase().trim());
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
	 * @type {String}
	 */
	studentAnswer: '',

	/** Properties set when the part is generated.
	 *
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {JME} correctAnswerString - the definition of the correct answer, without variables substituted into it.
	 * @property {String} correctAnswer - An expression representing the correct answer to the question. The student's answer should evaluate to the same value as this.
	 * @property {String} answerSimplificationString - string from the XML defining which answer simplification rules to use
	 * @property {Array.<String>} answerSimplification - names of simplification rules (see {@link Numbas.jme.display.Rule}) to use on the correct answer
	 * @property {String} checkingType - method to compare answers. See {@link Numbas.jme.checkingFunctions}
	 * @property {Number} checkingAccuracy - accuracy threshold for checking. Exact definition depends on the checking type.
	 * @property {Number} failureRate - comparison failures allowed before we decide answers are different
	 * @property {Number} vsetRangeStart - lower bound on range of points to pick values from for variables in the answer expression
	 * @property {Number} vsetRangeEnd - upper bound on range of points to pick values from for variables in the answer expression
	 * @property {Number} vsetRangePoints - number of points to compare answers on
	 * @property {Number} maxLength - maximum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted
	 * @property {Number} maxLengthPC - partial credit if the student's answer is too long
	 * @property {String} maxLengthMessage - Message to add to marking feedback if the student's answer is too long
	 * @property {Number} minLength - minimum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted
	 * @property {Number} minLengthPC - partial credit if the student's answer is too short
	 * @property {String} minLengthMessage - message to add to the marking feedback if the student's answer is too short
	 * @property {Array.<String>} mustHave - strings which must be present in the student's answer
	 * @property {Number} mustHavePC - partial credit to award if any must-have string is missing
	 * @property {String} mustHaveMessage - message to add to the marking feedback if the student's answer is missing a must-have string.
	 * @property {Boolean} mustHaveShowStrings - tell the students which strings must be included in the marking feedback, if they're missing a must-have?
	 * @property {Array.<String>} notAllowed - strings which must not be present in the student's answer
	 * @property {Number} notAllowedPC - partial credit to award if any not-allowed string is present
	 * @property {String} notAllowedMessage - message to add to the marking feedback if the student's answer contains a not-allowed string.
	 * @property {Boolean} notAllowedShowStrings - tell the students which strings must not be included in the marking feedback, if they've used a not-allowed string?
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
			this.error('part.jme.answer missing');
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
		var validation = this.validation;

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
			this.setCredit(0,R('part.jme.answer invalid',{message:e.message}));
			return;
		}

		if(this.settings.checkVariableNames) {
			var tree = jme.compile(this.studentAnswer,this.question.scope);
			var usedvars = jme.findvars(tree);
			validation.failExpectedVariableNames = false;
			for(var i=0;i<usedvars.length;i++) {
				if(!this.settings.expectedVariableNames.contains(usedvars[i].toLowerCase())) {
					validation.failExpectedVariableNames = true;
					validation.unexpectedVariableName = usedvars[i];
					break;
				}
			}
		}

		validation.failMinLength = (this.settings.minLength>0 && simplifiedAnswer.length<this.settings.minLength);
		validation.failMaxLength = (this.settings.maxLength>0 && simplifiedAnswer.length>this.settings.maxLength);
		validation.failNotAllowed = false;
		validation.failMustHave = false;

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
		for( i=0; i<this.settings.notAllowed.length; i++ ) {
            var notAllowedString = this.settings.notAllowed[i].toLowerCase();
			if(noSpaceAnswer.contains(notAllowedString)) { 
                validation.failNotAllowed = true; 
                break;
            }
		}

		if(!validation.failNotAllowed) {
            var checkMustHaveAnswer = noSpaceAnswer;
			//see if student answer contains all the required strings
			for( i=0; i<this.settings.mustHave.length; i++ ) {
                var mustHaveString = this.settings.mustHave[i].toLowerCase();
				if(!checkMustHaveAnswer.contains(mustHaveString)) { 
                    validation.failMustHave = true; 
                    break;
                } else {
                    checkMustHaveAnswer = checkMustHaveAnswer.replace(mustHaveString,'');
                }
			}
		}

		//calculate how many marks will be given for a correct answer
		//(can be modified if answer wrong length or fails string restrictions)
		this.setCredit(1,R('part.jme.marking.correct'));

		if(validation.failMinLength)
		{
			this.multCredit(this.settings.minLengthPC,this.settings.minLengthMessage);
		}
		if(validation.failMaxLength)
		{
			this.multCredit(this.settings.maxLengthPC,this.settings.maxLengthMessage);
		}

		if(validation.failMustHave)
		{
			if(this.settings.mustHaveShowStrings)
			{
				var strings = this.settings.mustHave.map(function(x){return R('part.jme.must-have bits',{'string':x})}).join(', ');
				var message = this.settings.mustHave.length==1 ? R('part.jme.must-have one',{strings:strings}) : R('part.jme.must-have several',{strings:strings})
				this.addCredit(0,message);
			}
			this.multCredit(this.settings.mustHavePC,this.settings.mustHaveMessage);
		}

		if(validation.failNotAllowed)
		{
			if(this.settings.notAllowedShowStrings)
			{
				var strings = this.settings.notAllowed.map(function(x){return R('part.jme.not-allowed bits',{'string':x})}).join(', ');
				var message = this.settings.notAllowed.length==1 ? R('part.jme.not-allowed one',{strings:strings}) : R('part.jme.not-allowed several',{strings:strings})
				this.addCredit(0,message);
			}
			this.multCredit(this.settings.notAllowedPC,this.settings.notAllowedMessage);
		}

	},

	/** Is the student's answer valid? False if student hasn't submitted an answer
	 * @returns {Boolean}
	 */
	validate: function()
	{
		var validation = this.validation;

		if(this.studentAnswer.length===0)
		{
			this.giveWarning(R('part.marking.not submitted'));
			return false;
		}

		try{
			var scope = new jme.Scope(this.question.scope);

			var tree = jme.compile(this.studentAnswer,scope);
			var varnames = jme.findvars(tree);
			for(i=0;i<varnames.length;i++) {
				scope.variables[varnames[i]]=new jme.types.TNum(0);
			}
			jme.evaluate(tree,scope);
		}
		catch(e)
		{
			this.giveWarning(R('part.jme.answer invalid',{message:e.message}));
			return false;
		}

		if( validation.failExpectedVariableNames ) {
			var suggestedNames = validation.unexpectedVariableName.split(jme.re.re_short_name);
			if(suggestedNames.length>3) {
				var suggestion = [];
				for(var i=1;i<suggestedNames.length;i+=2) {
					suggestion.push(suggestedNames[i]);
				}
				suggestion = suggestion.join('*');
				this.giveWarning(R('part.jme.unexpected variable name suggestion',{name:validation.unexpectedVariableName,suggestion:suggestion}));
			}
			else
				this.giveWarning(R('part.jme.unexpected variable name', {name:validation.unexpectedVariableName}));
		}

		if( validation.failMinLength)
		{
			this.giveWarning(this.settings.minLengthMessage);
		}

		if( validation.failMaxLength )
		{
			this.giveWarning(this.settings.maxLengthMessage);
		}

		if( validation.failMustHave )
		{
			this.giveWarning(this.settings.mustHaveMessage);
			if(this.settings.mustHaveShowStrings)
			{
				var strings = this.settings.mustHave.map(function(x){return R('part.jme.must-have bits',{'string':x})}).join(', ');
				var message = this.settings.mustHave.length==1 ? R('part.jme.must-have one',{strings:strings}) : R('part.jme.must-have several',{strings:strings})
				this.giveWarning(message);
			}
		}

		if( validation.failNotAllowed )
		{
			this.giveWarning(this.settings.notAllowedMessage);
			if(this.settings.notAllowedShowStrings)
			{
				var strings = this.settings.notAllowed.map(function(x){return R('part.jme.not-allowed bits',{'string':x})}).join(', ');
				var message = this.settings.notAllowed.length==1 ? R('part.jme.not-allowed one',{strings:strings}) : R('part.jme.not-allowed several',{strings:strings})
				this.giveWarning(message);
			}
		}

		return true;
	}
};

Numbas.partConstructors['jme'] = util.extend(Part,JMEPart);

});

