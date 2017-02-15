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

   Numbas.queueScript('parts/patternmatch',['base','display','jme','jme-variables','xml','util','scorm-storage','part','marking_scripts'],function() {

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

    /** The script to mark this part - assign credit, and give messages and feedback.
     * @type {Numbas.marking.MarkingScript}
     */
    markingScript: Numbas.marking_scripts.patternmatch,

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

	/** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	 rawStudentAnswerAsJME: function() {
	 	return new Numbas.jme.types.TString(this.studentAnswer);
	 },

	};

	Numbas.partConstructors['patternmatch'] = util.extend(Part,PatternMatchPart);
});
