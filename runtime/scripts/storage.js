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
 * @property {number} timeRemaining - Seconds until the end of the exam ({@link Numbas.Exam#timeRemaining})
 * @property {number} duration - Length of the exam, in seconds ({@link Numbas.Exam#settings})
 * @property {Array.<Array.<number>>} questionSubsets - The sets of questions in each question group ({@link Numbas.Exam#question_groups})
 * @property {Date} start - The time the exam was started ({@link Numbas.Exam#start})
 * @property {number} score - The student's current score ({@link Numbas.exam#score})
 * @property {number} currentQuestion - The index of the current question ({@link Numbas.Exam#currentQuestionNumber})
 */
/** @typedef question_suspend_data
 * @memberof Numbas.storage
 * @property {string} name - The name of the question ({@link Numbas.Question#name})
 * @property {number} score - The student's score for this question ({@link Numbas.Question#score})
 * @property {boolean} visited - Has the student visited this question yet? ({@link Numbas.Question#visited})
 * @property {boolean} answered - Has the student answered this question? ({@link Numbas.Question#answered})
 * @property {boolean} adviceDisplayed - Has the advice been displayed? ({@link Numbas.Question#adviceDisplayed})
 * @property {boolean} revealed - Have the correct answers been revealed? ({@link Numbas.Question#revealed})
 * @property {object.<JME>} variables - A dictionary of the values of the question variables. ({@link Numbas.Question#scope})
 * @see Numbas.storage.SCORMStorage#loadQuestion
 */
/** @typedef part_suspend_data
 * @memberof Numbas.storage
 * @property {string} answer - student's answer to the part, as encoded for saving
 * @property {boolean} answered - has the student answered this part? ({@link Numbas.parts.Part#answered})
 * @property {boolean} stepsShown - have the steps been shown? ({@link Numbas.parts.Part#stepsShown})
 * @property {boolean} stepsOpen - are the steps currently visible? ({@link Numbas.parts.Part#stepsOpen})
 * @property {Array.<Numbas.storage.part_suspend_data>} gaps - data for gaps, if this is a gapfill part
 * @property {Array.<Numbas.storage.part_suspend_data>} steps - data for steps, if this part has steps
 * @property {string} studentAnswer - student's answer, for {@link Numbas.parts.JMEPart}, {@link Numbas.parts.NumberEntryPart} or {@link Numbas.parts.PatternMatchPart} parts
 * @property {Array.<number>} shuffleChoices - order of choices, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {Array.<number>} shuffleAnswers - order of answers, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {Array.<Array.<number>>} ticks - student's choices, for {@link Numbas.parts.MultipleResponsePart} parts
 */
/** The active storage object ({@link Numbas.storage}) to be used by the exam */
Numbas.store = null;
Numbas.storage = {};
/** A blank storage object which does nothing.
 *
 * Any real storage object needs to implement all of this object's methods.
 *
 * @memberof Numbas.storage
 * @class
 */
Numbas.storage.BlankStorage = function() {}
Numbas.storage.BlankStorage.prototype = /** @lends Numbas.storage.BlankStorage.prototype */ {
    /** Initialise the SCORM data model and this storage object.
     *
     * @param {Numbas.Exam} exam
     */
    init: function(exam) {},
    /** Initialise a question.
     *
     * @param {Numbas.Question} q
     * @abstract
     */
    initQuestion: function(q) {},
    /**
     * Initialise a part.
     *
     * @param {Numbas.parts.Part} p
     * @abstract
     */
    initPart: function(p) {},
    /** Get an externally-set extension to the exam duration.
     *
     * @returns {object}
     */
    getDurationExtension: function() {
    },

    /** Get suspended exam info.
     *
     * @abstract
     * @param {Numbas.Exam} exam
     * @returns {Numbas.storage.exam_suspend_data}
     */
    load: function(exam) {},
    /** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server/backing store. 
     *
     * @abstract
     */
    save: function() {
    },
    /** Load student's name and ID.
     *
     * @abstract
     */
    get_student_name: function() {},
    /**
     * Get suspended info for a question.
     *
     * @abstract
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     */
    loadQuestion: function(question) {},
    /** Get suspended info for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPart: function(part) {},
    /** Load a {@link Numbas.parts.JMEPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadJMEPart: function(part) {},
    /** Load a {@link Numbas.parts.PatternMatchPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPatternMatchPart: function(part) {},
    /** Load a {@link Numbas.parts.NumberEntryPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadNumberEntryPart: function(part) {},
    /** Load a {@link Numbas.parts.MatrixEntryPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMatrixEntryPart: function(part) {},
    /** Load a {@link Numbas.parts.MultipleResponsePart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMultipleResponsePart: function(part) {},
    /** Load a {@link Numbas.parts.ExtensionPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadExtensionPart: function(part) {},
    /** Call this when the exam is started (when {@link Numbas.Exam#begin} runs, not when the page loads).
     *
     * @abstract
     */
    start: function() {},
    /** Call this when the exam is paused ({@link Numbas.Exam#pause}).
     *
     * @abstract
     */
    pause: function() {},
    /** Call this when the exam is resumed ({@link Numbas.Exam#resume}). 
     *
     * @abstract
     */
    resume: function() {},
    /** Call this when the exam ends ({@link Numbas.Exam#end}).
     *
     * @abstract
     */
    end: function() {},
    /** Get the student's ID.
     *
     * @abstract
     * @returns {string}
     */
    getStudentID: function() {
        return '';
    },
    /** Get entry state: `ab-initio`, or `resume`.
     *
     * @abstract
     * @returns {string}
     */
    getEntry: function() {
        return 'ab-initio';
    },
    /** Get viewing mode:
     *
     * * `browse` - see exam info, not questions;
     * * `normal` - sit exam;
     * * `review` - look at completed exam.
     *
     * @abstract
     * @returns {string}
     */
    getMode: function() {},
    /** Call this when the student moves to a different question.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    changeQuestion: function(question) {},
    /** Call this when a part is answered.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    partAnswered: function(part) {},
    /** Save the staged answer for a part.
     * Note: this is not part of the SCORM standard, so can't rely on this being saved.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    storeStagedAnswer: function(part) {},
    /** Save exam-level details.
     *
     * @abstract
     * @param {Numbas.Exam} exam
     */
    saveExam: function(exam) {},
    /* Save details about a question - save score and success status.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    saveQuestion: function(question) {},
    /** Record that a question has been submitted.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    questionSubmitted: function(question) {},
    /** Rcord that the student displayed question advice.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    adviceDisplayed: function(question) {},
    /** Record that the student revealed the answers to a question.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    answerRevealed: function(question) {},
    /** Record that the student showed the steps for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    stepsShown: function(part) {},
    /** Record that the student hid the steps for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    stepsHidden: function(part) {}
};
});
