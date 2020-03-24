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
 * @property {Number} timeRemaining - Seconds until the end of the exam ({@link Numbas.Exam#timeRemaining})
 * @property {Number} duration - Length of the exam, in seconds ({@link Numbas.Exam#settings})
 * @property {Array.<Array.<Number>>} questionSubsets - The sets of questions in each question group ({@link Numbas.Exam#question_groups})
 * @property {Date} start - The time the exam was started ({@link Numbas.Exam#start})
 * @property {Number} score - The student's current score ({@link Numbas.exam#score})
 * @property {Number} currentQuestion - The index of the current question ({@link Numbas.Exam#currentQuestionNumber})
 */
/** @typedef question_suspend_data
 * @memberof Numbas.storage
 * @property {String} name - The name of the question ({@link Numbas.Question#name})
 * @property {Number} score - The student's score for this question ({@link Numbas.Question#score})
 * @property {Boolean} visited - Has the student visited this question yet? ({@link Numbas.Question#visited})
 * @property {Boolean} answered - Has the student answered this question? ({@link Numbas.Question#answered})
 * @property {Boolean} adviceDisplayed - Has the advice been displayed? ({@link Numbas.Question#adviceDisplayed})
 * @property {Boolean} revealed - Have the correct answers been revealed? ({@link Numbas.Question#revealed})
 * @property {Object.<JME>} variables - A dictionary of the values of the question variables. ({@link Numbas.Question#scope})
 * @see Numbas.storage.SCORMStorage#loadQuestion
 */
/** @typedef part_suspend_data
 * @memberof Numbas.storage
 * @property {String} answer - student's answer to the part, as encoded for saving
 * @property {Boolean} answered - has the student answered this part? ({@link Numbas.parts.Part#answered})
 * @property {Boolean} stepsShown - have the steps been shown? ({@link Numbas.parts.Part#stepsShown})
 * @property {Boolean} stepsOpen - are the steps currently visible? ({@link Numbas.parts.Part#stepsOpen})
 * @property {Array.<Numbas.storage.part_suspend_data>} gaps - data for gaps, if this is a gapfill part
 * @property {Array.<Numbas.storage.part_suspend_data>} steps - data for steps, if this part has steps
 * @property {String} studentAnswer - student's answer, for {@link Numbas.parts.JMEPart}, {@link Numbas.parts.NumberEntryPart} or {@link Numbas.parts.PatternMatchPart} parts
 * @property {Array.<Number>} shuffleChoices - order of choices, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {Array.<Number>} shuffleAnswers - order of answers, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {Array.<Array.<Number>>} ticks - student's choices, for {@link Numbas.parts.MultipleResponsePart} parts
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
     * @returns {Numbas.storage.exam_suspend_data}
     */
    load: function() {},
    /** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server/backing store */
    save: function() {
    },
    /** Get suspended info for a question
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     */
    loadQuestion: function(questionNumber) {},
    /** Get suspended info for a part
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPart: function(part) {},
    /** Load a {@link Numbas.parts.JMEPart}
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadJMEPart: function(part) {},
    /** Load a {@link Numbas.parts.PatternMatchPart}
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPatternMatchPart: function(part) {},
    /** Load a {@link Numbas.parts.NumberEntryPart}
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadNumberEntryPart: function(part) {},
    /** Load a {@link Numbas.parts.MatrixEntryPart}
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMatrixEntryPart: function(part) {},
    /** Load a {@link Numbas.parts.MultipleResponsePart}
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMultipleResponsePart: function(part) {},
    /** Load a {@link Numbas.parts.ExtensionPart}
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
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
     * @returns {String}
     */
    getStudentID: function() {
        return '';
    },
    /** Get entry state: `ab-initio`, or `resume`
     * @returns {String}
     */
    getEntry: function() {
        return 'ab-initio';
    },
    /** Get viewing mode:
     *
     * * `browse` - see exam info, not questions
     * * `normal` - sit exam
     * * `review` - look at completed exam
     * @returns {String}
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
    /** Save the staged answer for a part.
     * Note: this is not part of the SCORM standard, so can't rely on this being saved.
     * @param {Numbas.parts.Part} part
     */
    storeStagedAnswer: function(part) {},
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
