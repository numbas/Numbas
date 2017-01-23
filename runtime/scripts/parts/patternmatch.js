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

   /** @file The {@link Numbas.parts.PatternMatchPart} object */

   Numbas.queueScript('parts/patternmatch',['base','display','jme','jme-variables','xml','util','scorm-storage','part'],function() {

   	var util = Numbas.util;
   	var jme = Numbas.jme;
   	var math = Numbas.math;
   	var tryGetAttribute = Numbas.xml.tryGetAttribute;

   	var Part = Numbas.parts.Part;

/** Text-entry part - student's answer must match the given regular expression
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
 var PatternMatchPart = Numbas.parts.PatternMatchPart = function(xml, path, question, parentPart, loading)
 {
 	var settings = this.settings;
 	util.copyinto(PatternMatchPart.prototype.settings,settings);

 	settings.correctAnswerString = $.trim(Numbas.xml.getTextContent(this.xml.selectSingleNode('correctanswer')));

 	tryGetAttribute(settings,this.xml,'correctanswer',['mode'],['matchMode']);

 	var displayAnswerNode = this.xml.selectSingleNode('displayanswer');
 	if(!displayAnswerNode)
 		this.error('part.patternmatch.display answer missing');
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
	 	partialCredit: 0,
	 	matchMode: 'regex'
	 },

	/** Compute the correct answer, based on the given scope
	*/
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		settings.correctAnswer = jme.subvars(settings.correctAnswerString, scope, true);

        switch(this.settings.matchMode) {
            case 'regex':
                settings.correctAnswer = '^'+settings.correctAnswer+'$';
                break;
        }

		settings.displayAnswer = jme.subvars(settings.displayAnswerString,scope, true);
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
		var validation = this.validation;

		if(this.answerList==undefined) {
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}
		this.answered = this.studentAnswer.length>0;

		switch (this.settings.matchMode){
			case 'regex':

                var caseInsensitiveAnswer = new RegExp( this.settings.correctAnswer, 'i' );
                var caseSensitiveAnswer = new RegExp( this.settings.correctAnswer );

                if( this.settings.caseSensitive ) {
                    if( caseSensitiveAnswer.test(this.studentAnswer) ) {
                        this.setCredit(1,R('part.marking.correct'));
                    } else if(caseInsensitiveAnswer.test(this.studentAnswer)) {
                        this.setCredit(this.settings.partialCredit,R('part.patternmatch.correct except case'));
                    } else {
                        this.setCredit(0,R('part.marking.incorrect'));
                    }
                } else {
                    if(caseInsensitiveAnswer.test(this.studentAnswer)) {
                        this.setCredit(1,R('part.marking.correct'));
                    } else {
                        this.setCredit(0,R('part.marking.incorrect'));
                    }
                }

                break;

			case 'exact':

                if( this.settings.caseSensitive ) {
                    if( this.studentAnswer == this.settings.correctAnswer ) {
                        this.setCredit(1,R('part.marking.correct'));
                    } else if(this.studentAnswer.toLowerCase() == this.settings.correctAnswer.toLowerCase()) {
                        this.setCredit(this.settings.partialCredit,R('part.patternmatch.correct except case'));
                    } else {
                        this.setCredit(0,R('part.marking.incorrect'));
                    }
                } else {
                    if(this.studentAnswer.toLowerCase() == this.settings.correctAnswer.toLowerCase()) {
                        this.setCredit(1,R('part.marking.correct'));
                    } else {
                        this.setCredit(0,R('part.marking.incorrect'));
                    }
                }

                break;
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

	Numbas.partConstructors['patternmatch'] = util.extend(Part,PatternMatchPart);
});
