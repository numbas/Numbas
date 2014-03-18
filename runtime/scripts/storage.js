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


/** The active storage object to be used by the exam */
Numbas.store = null;

Numbas.storage = {};

/** A blank storage object which does nothing.
 *
 * Any real storage object needs to implement all of this object's methods.
 * @memberof Numbas.storage
 */
Numbas.storage.BlankStorage = function() {}
Numbas.storage.BlankStorage.prototype = {

	//when starting a new exam, must initialise storage
	//pass in ref to exam object because global var will not be set yet
	init: function(exam) {},

	//get suspended exam info
	//returns an object 
	//{ timeRemaining: ...,
	//	questionSubset: ...,
	//	start: ...,
	//}
	load: function() {},

	//save data. Normally the storage should save as it goes, but this forces a save
	save: function() {
	},

	//get suspended info for a question
	//questionNumber is the one in exam.questionSubset, not the original order
	loadQuestion: function(questionNumber) {},

	//get suspended info for a part
	loadPart: function(part) {},

	loadJMEPart: function(part) {},
	loadPatternMatchPart: function(part) {},
	loadNumberEntryPart: function(part) {},
	loadMultipleResponsePart: function(part) {},

	//this is called when the exam is started
	start: function() {},

	//this is called when the exam is paused
	pause: function() {},

	//this is called when the exam is resumed
	resume: function() {},

	//this is called when the exam is ended
	end: function() {},

	//get entry state: 'ab-initio' or 'resume'
	getEntry: function() { 
		return 'ab-initio';
	},

	//get viewing mode: 
	// 'browse' - see exam info, not questions
	// 'normal' - sit exam
	// 'review' - look at answers
	getMode: function() {},

	//called when question is changed
	changeQuestion: function(question) {},

	//called when a part is answered
	partAnswered: function(part) {},

	//called when exam is changed
	saveExam: function(exam) {},

	//called when current question is changed
	saveQuestion: function(question) {},

	//record that a question has been submitted
	questionSubmitted: function(question) {},

	//record that the student displayed question advice
	adviceDisplayed: function(question) {},

	//record that the student revealed the answer to a question
	answerRevealed: function(question) {},

	//record that the student showed the steps for a part
	stepsShown: function(part) {},

	//record that the student closed the steps for a part
	stepsHidden: function(part) {}
};
});
