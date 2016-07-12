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


Numbas.queueScript('storage',['base'],function() {

/** @namespace Numbas.storage */

/** @typedef exam_suspend_data
 * @memberof Numbas.storage
 * @property {number} timeRemaining - seconds until exam timer runs out
 * @property {number[]} questionSubset - order of questions
 * @property {number} start - time the exam started
 * @property {number} score - student's current score
 * @property {number} currentQuestion - number of the question the student was looking at before suspending
 */

/** @typedef question_suspend_data
 * @memberof Numbas.storage
 * @property {number} score - student's current score on this question ({@link Numbas.Question#score})
 * @property {boolean} visited - has the student looked at this question? ({@link Numbas.Question#visited})
 * @property {boolean} answered - has the student answered this question? ({@link Numbas.Question#answered})
 * @property {boolean} submitted - how many times has the student submitted this question? ({@link Numbas.Question#submitted})
 * @property {boolean} adviceDisplayed - has the advice been shown to the student? ({@link Numbas.Question#adviceDisplayed})
 * @property {boolean} revealed - have the correct answers been revealed to the student? ({@link Numbas.Question#revealed})
 * @property {object} variables - dictionary mapping variable names to values, in {@link JME} format.
 */

/** @typedef part_suspend_data
 * @memberof Numbas.storage
 * @property {string} answer - student's answer to the part, as encoded for saving
 * @property {boolean} answered - has the student answered this part? ({@link Numbas.parts.Part#answered})
 * @property {boolean} stepsShown - have the steps been shown? ({@link Numbas.parts.Part#stepsShown})
 * @property {boolean} stepsOpen - are the steps currently visible? ({@link Numbas.parts.Part#stepsOpen})
 * @property {part_suspend_data[]} gaps - data for gaps, if this is a gapfill part
 * @property {part_suspend_data[]} steps - data for steps, if this part has steps
 * @property {string} studentAnswer - student's answer, for {@link Numbas.parts.JMEPart}, {@link Numbas.parts.NumberEntryPart} or {@link Numbas.parts.PatternMatchPart} parts
 * @property {number[]} shuffleChoices - order of choices, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {number[]} shuffleAnswers - order of answers, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {Array.Array.<number>} ticks - student's choices, for {@link Numbas.parts.MultipleResponsePart} parts
 */


/** The active storage object ({@link Numbas.storage}) to be used by the exam */
Numbas.store = null;

Numbas.storage = {};

/** A blank storage object which does nothing.
 *
 * Any real storage object needs to implement all of this object's methods.
 * @memberof Numbas.storage
 * @constructor
 */
Numbas.storage.BlankStorage = function() {}
Numbas.storage.BlankStorage.prototype = /** @lends Numbas.storage.BlankStorage.prototype */ {

	/** Initialise the SCORM data model and this storage object.
	 * @param {Numbas.Exam} exam
	 */
	init: function(exam) {},

	/** Get suspended exam info
	 * @param {Numbas.Exam} exam
	 * @returns {exam_suspend_data}
	 */
	load: function() {},

	/** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server/backing store */
	save: function() {
	},

	/** Get suspended info for a question
	 * @param {Numbas.Question} question
	 * @returns {question_suspend_data}
	 */
	loadQuestion: function(questionNumber) {},

	/** Get suspended info for a part
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadPart: function(part) {},

	/** Load a {@link Numbas.parts.JMEPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadJMEPart: function(part) {},

	/** Load a {@link Numbas.parts.PatternMatchPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadPatternMatchPart: function(part) {},

	/** Load a {@link Numbas.parts.NumberEntryPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadNumberEntryPart: function(part) {},

	/** Load a {@link Numbas.parts.MatrixEntryPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadMatrixEntryPart: function(part) {},

	/** Load a {@link Numbas.parts.MultipleResponsePart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadMultipleResponsePart: function(part) {},

	/** Load a {@link Numbas.parts.ExtensionPart}
	 * @param {Numbas.parts.Part} part
	 * @returns {part_suspend_data}
	 */
	loadExtensionPart: function(part) {},

	/** Call this when the exam is started (when {@link Numbas.Exam#begin} runs, not when the page loads) */
	start: function() {},

	/** Call this when the exam is paused ({@link Numbas.Exam#pause}) */
	pause: function() {},

	/** Call this when the exam is resumed ({@link Numbas.Exam#resume}) */
	resume: function() {},

	/** Call this when the exam ends ({@link Numbas.Exam#end}) */
	end: function() {},

	/** Get the student's ID
	 * @returns {string}
	 */
	getStudentID: function() {
		return '';
	},

	/** Get entry state: `ab-initio`, or `resume`
	 * @returns {string}
	 */
	getEntry: function() { 
		return 'ab-initio';
	},

	/** Get viewing mode: 
	 *
	 * * `browse` - see exam info, not questions
	 * * `normal` - sit exam
	 * * `review` - look at completed exam
	 * @returns {string}
	 */
	getMode: function() {},

	/** Call this when the student moves to a different question
	 * @param {Numbas.Question} question
	 */
	changeQuestion: function(question) {},

	/** Call this when a part is answered
	 * @param {Numbas.parts.Part} part
	 */
	partAnswered: function(part) {},

	/** Save exam-level details (just score at the mo)
	 * @param {Numbas.Exam} exam
	 */
	saveExam: function(exam) {},

	/* Save details about a question - save score and success status
	 * @param {Numbas.Question} question
	 */
	saveQuestion: function(question) {},

	/** Record that a question has been submitted
	 * @param {Numbas.Question} question
	 */
	questionSubmitted: function(question) {},

	/** Rcord that the student displayed question advice
	 * @param {Numbas.Question} question
	 */
	adviceDisplayed: function(question) {},

	/** Record that the student revealed the answers to a question
	 * @param {Numbas.Question} question
	 */
	answerRevealed: function(question) {},

	/** Record that the student showed the steps for a part
	 * @param {Numbas.parts.Part} part
	 */
	stepsShown: function(part) {},

	/** Record that the student hid the steps for a part
	 * @param {Numbas.parts.Part} part
	 */
	stepsHidden: function(part) {}
};
});
