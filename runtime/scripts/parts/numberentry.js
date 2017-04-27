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

/** @file The {@link Numbas.parts.NumberEntryPart} object */

Numbas.queueScript('parts/numberentry',['base','display','jme','jme-variables','xml','util','scorm-storage','part'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var tryGetAttribute = Numbas.xml.tryGetAttribute;

var Part = Numbas.parts.Part;

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
	tryGetAttribute(settings,this.xml,'answer',['correctanswerfraction','correctanswerstyle','inputstep','allowfractions'],['correctAnswerFraction','correctAnswerStyle','inputStep','allowFractions']);
	tryGetAttribute(settings,this.xml,'answer',['mustbereduced','mustbereducedpc'],['mustBeReduced','mustBeReducedPC']);

    var answerNode = this.xml.selectSingleNode('answer');
    var notationStyles = answerNode.getAttribute('notationstyles');
    if(notationStyles) {
        settings.notationStyles = notationStyles.split(',');
    }

	tryGetAttribute(settings,this.xml,'answer/precision',['type','partialcredit','strict','showprecisionhint'],['precisionType','precisionPC','strictPrecision','showPrecisionHint']);
	tryGetAttribute(settings,this.xml,'answer/precision','precision','precisionString',{'string':true});

	if(settings.precisionType!='none') {
		settings.allowFractions = false;
	}

    try {
    	this.getCorrectAnswer(this.question.scope);
    } catch(e) {
        this.error(e.message);
    }

	var messageNode = this.xml.selectSingleNode('answer/precision/message');
	if(messageNode)
		settings.precisionMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;

	var displayAnswer = (settings.minvalue + settings.maxvalue)/2;
	if(settings.correctAnswerFraction) {
        var diff = Math.abs(settings.maxvalue-settings.minvalue)/2;
        var accuracy = Math.max(15,Math.ceil(-Math.log(diff)));
		settings.displayAnswer = jme.display.jmeRationalNumber(displayAnswer,{accuracy:accuracy});
	} else {
		settings.displayAnswer = math.niceNumber(displayAnswer,{precisionType: settings.precisionType,precision:settings.precision, style: settings.correctAnswerStyle});
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
	 * @property {boolean} allowFractions - can the student enter a fraction as their answer?
     * @property {string[]} notationStyles - styles of notation to allow, other than `<digits>.<digits>`. See {@link Numbas.util.re_decimal}.
	 * @property {number} displayAnswer - representative correct answer to display when revealing answers
	 * @property {string} precisionType - type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures
	 * @property {number} precisionString - definition of precision setting, before variables are substituted in
	 * @property {number} precision - how many decimal places or significant figures to require
	 * @property {number} precisionPC - partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision
	 * @property {string} precisionMessage - message to display in the marking feedback if their answer was not given to the required precision
	 * @property {boolean} mustBeReduced - should the student enter a fraction in lowest terms
	 * @property {number} mustBeReducedPC - partial credit to award if the answer is not a reduced fraction
	 */
	settings:
	{
		inputStep: 1,
		minvalue: 0,
		maxvalue: 0,
		correctAnswerFraction: false,
		allowFractions: false,
        notationStyles: ['en','si-en'],
		displayAnswer: 0,
		precisionType: 'none',
		precision: 0,
		precisionPC: 0,
		mustBeReduced: false,
		mustBeReducedPC: 0,
		precisionMessage: R('You have not given your answer to the correct precision.'),
        showPrecisionHint: true
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		var precision = jme.subvars(settings.precisionString, scope);
		settings.precision = scope.evaluate(precision).value;

        if(settings.precisionType=='sigfig' && settings.precision<=0) {
            throw(new Numbas.Error('part.numberentry.zero sig fig'));
        }

        if(settings.precisionType=='dp' && settings.precision<0) {
            throw(new Numbas.Error('part.numberentry.negative decimal places'));
        }

		var minvalue = jme.subvars(settings.minvalueString,scope);
		minvalue = scope.evaluate(minvalue);
		if(minvalue && minvalue.type=='number') {
			minvalue = minvalue.value;
		} else {
			throw(new Numbas.Error('part.setting not present',{property:R('minimum value')}));
		}

		var maxvalue = jme.subvars(settings.maxvalueString,scope);
		maxvalue = scope.evaluate(maxvalue);
		if(maxvalue && maxvalue.type=='number') {
			maxvalue = maxvalue.value;
		} else {
			throw(new Numbas.Error('part.setting not present',{property:R('maximum value')}));
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

	/** Tidy up the student's answer - at the moment, just remove space.
     * You could override this to do more substantial filtering of the student's answer.
	 * @param {string} answer
	 * @returns {string}
	 */
	cleanAnswer: function(answer) {
		answer = answer.toString().trim();
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

    /** Get the student's answer as a floating point number
     * @returns {number}
     */
	studentAnswerAsFloat: function() {
		return util.parseNumber(this.studentAnswer,this.settings.allowFractions,this.settings.notationStyles);
	},

	/** Mark the student's answer */
	mark: function()
	{
		var validation = this.validation;

		if(this.answerList==undefined) {
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}
		
		if( this.studentAnswer.length>0 && util.isNumber(this.studentAnswer,this.settings.allowFractions,this.settings.notationStyles) ) {
			var answerFloat = this.studentAnswerAsFloat();
			if( answerFloat <= this.settings.maxvalue && answerFloat >= this.settings.minvalue ) {
                this.setCredit(1,R('part.marking.correct'));
			} else {
				this.setCredit(0,R('part.marking.incorrect'));
			}
			this.answered = true;

			var failedPrecision = !math.toGivenPrecision(this.studentAnswer,this.settings.precisionType,this.settings.precision,this.settings.strictPrecision);
			if(failedPrecision) {
				this.multCredit(this.settings.precisionPC,this.settings.precisionMessage);
			}

			if(this.settings.allowFractions && util.isFraction(this.studentAnswer) && this.settings.mustBeReduced){
				var answerAsFraction = util.parseFraction(this.studentAnswer);
				var failedReduced = !(math.gcd(answerAsFraction.numerator,answerAsFraction.denominator) == 1);
				if(failedReduced){
					this.multCredit(this.settings.mustBeReducedPC,R('part.numberentry.answer not reduced'));
				}
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
		if(!this.answered) {
			this.giveWarning(R('part.marking.not submitted'));
		}
		
		return this.answered;
	}
};

Numbas.partConstructors['numberentry'] = util.extend(Part,NumberEntryPart);
});
