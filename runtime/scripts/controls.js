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
/** @file Wrappers for the various navigation actions the user can do.
 *
 * The assumption is that these should only be called in response to some event the user triggers, by clicking or whatever.
 *
 * Provides {@link Numbas.controls}
 */
Numbas.queueScript('controls', ['base', 'schedule'], function() {
/** @namespace Numbas.controls */
Numbas.controls = /** @lends Numbas.controls */ {
    /** Start the exam - triggered when user clicks "Start" button on frontpage.
     *
     * @see Numbas.Exam#begin
     */
    beginExam: function() {
        Numbas.exam.begin();
    },
    /** Pause the exam.
     *
     * @see Numbas.Exam#pause
     */
    pauseExam: function() {
        Numbas.exam.pause();
    },
    /** Resume the paused exam.
     *
     * @see Numbas.Exam#resume
     */
    resumeExam: function() {
        Numbas.exam.resume();
    },

    /** Show the introduction text, while the exam is in progress.
     */
    showIntroduction: function() {
        Numbas.exam.display.showInfoPage('introduction');
    },

    /** Try to end the exam.
     *
     * @see Numbas.Exam#tryEnd
     */
    endExam: function() {
        Numbas.exam.tryEnd();
    },
    /** In an ended exam, go back from reviewing a question the results page. */
    backToResults: function() {
        Numbas.exam.display.showInfoPage('result');
    },
    /** Go back to the question menu.
     */
    backToMenu: function() {
        Numbas.exam.showMenu();
    },
    /** Try to move to the next question.
     *
     * @param {Numbas.Exam} exam
     * @see Numbas.Exam#tryChangeQuestion
     */
    nextQuestion: function(exam) {
        exam = exam || Numbas.exam;
        exam.tryChangeQuestion( exam.currentQuestion.number+1 );
    },
    /** Try to move to the previous question.
     *
     * @param {Numbas.Exam} exam
     * @see Numbas.Exam#tryChangeQuestion
     */
    previousQuestion: function(exam) {
        exam = exam || Numbas.exam;
        exam.tryChangeQuestion( exam.currentQuestion.number-1 );
    },
    /** Make a function which tries to jump to question N.
     *
     * @param {number} n - Number of the question to jump to.
     * @param {Numbas.Exam} exam
     * @returns {Function}
     * @see Numbas.controls.jumpQuestion
     */
    makeQuestionJumper: function(n, exam) {
        exam = exam || Numbas.exam;
        return function() {
            Numbas.controls.jumpQuestion(n, exam);
        }
    },
    /** Try to move directly to a particular question.
     *
     * @param {number} jumpTo - Number of the question to jump to.
     * @param {Numbas.Exam} exam
     * @see Numbas.Exam#tryChangeQuestion
     */
    jumpQuestion: function( jumpTo, exam ) {
        exam = exam || Numbas.exam;
        if(exam.currentQuestion && jumpTo == exam.currentQuestion.number) {
            exam.display.showQuestion();
            return;
        }
        exam.tryChangeQuestion( jumpTo );
    },
    /** Regenerate the current question.
     *
     * @param {Numbas.Exam} exam
     * @see Numbas.Exam#regenQuestion
     */
    regenQuestion: function(exam) {
        exam = exam || Numbas.exam;
        exam.display.root_element.showConfirm(
            R('control.confirm regen'+(exam.mark == 0 ? ' no marks' : '')),
            function() {
                exam.regenQuestion();
            }
        );
    },
    /** Show the advice for the current question.
     *
     * @param {Numbas.Exam} exam
     * @see Numbas.Question#getAdvice
     */
    getAdvice: function(exam) {
        exam = exam || Numbas.exam;
        Numbas.exam.currentQuestion.getAdvice();
    },
    /** Reveal the answers to the current question.
     *
     * @param {Numbas.Exam} exam
     * @see Numbas.Question#revealAnswer
     */
    revealAnswer: function(exam) {
        exam = exam || Numbas.exam;
        exam.display.root_element.showConfirm(R('control.confirm reveal'+(exam.mark == 0 ? ' no marks' : '')),
            function() {
                exam.currentQuestion.revealAnswer();
            }
        );
    },

    /** Submit a part.
     *
     * @param {Numbas.parts.Part} part
     */
    submitPart: function(part) {
        /** Actually submit the part.
         */
        function go() {
            if(part.locked) {
                return;
            }
            part.submit();
            Numbas.store.save();
        }
        if(part.question.partsMode=='explore') {
            var uses_answer = part.nextParts.some(function(np) {
                return np.instance!==null && np.usesStudentAnswer();
            })
            if(uses_answer) {
                part.question.exam.display.root_element.showConfirm(R('control.submit part.confirm remove next parts'), go);
                return;
            }
        }
        go();
    },

    /** Submit student's answers to all parts in the current question.
     *
     * @param {Numbas.Exam} exam
     * @see Numbas.Question#submit
     */
    submitQuestion: function(exam) {
        exam = exam || Numbas.exam;
        exam.currentQuestion.submit();
    }
};
});
