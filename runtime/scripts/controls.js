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
Numbas.queueScript('controls',['base','schedule'],function() {
var job = Numbas.schedule.add;
/** @namespace Numbas.controls */
Numbas.controls = /** @lends Numbas.controls */ {
    /** Start the exam - triggered when user clicks "Start" button on frontpage.
     *
     * @see Numbas.Exam#begin
     */
    beginExam: function()
    {
        job(Numbas.exam.begin,Numbas.exam);
    },
    /** Pause the exam.
     *
     * @see Numbas.Exam#pause
     */
    pauseExam: function()
    {
        job(Numbas.exam.pause,Numbas.exam);
    },
    /** Resume the paused exam.
     *
     * @see Numbas.Exam#resume
     */
    resumeExam: function()
    {
        job(Numbas.exam.resume,Numbas.exam);
    },
    /** Try to end the exam.
     *
     * @see Numbas.Exam#tryEnd
     */
    endExam: function()
    {
        job(function() {
            Numbas.exam.tryEnd();
        });
    },
    /** In an ended exam, go back from reviewing a question the results page. */
    backToResults: function()
    {
        job(function() {
            Numbas.exam.display.showInfoPage('result');
        });
    },
    /** Go back to the question menu.
     */
    backToMenu: function() {
        job(Numbas.exam.showMenu,Numbas.exam);
    },
    /** Try to move to the next question.
     *
     * @see Numbas.Exam#tryChangeQuestion
     */
    nextQuestion: function( )
    {
        job(function() {
            Numbas.exam.tryChangeQuestion( Numbas.exam.currentQuestion.number+1 );
        });
    },
    /** Try to move to the previous question.
     *
     * @see Numbas.Exam#tryChangeQuestion
     */
    previousQuestion: function()
    {
        job(function() {
            Numbas.exam.tryChangeQuestion( Numbas.exam.currentQuestion.number-1 );
        });
    },
    /** Make a function which tries to jump to question N.
     *
     * @param {number} n - Number of the question to jump to.
     * @returns {Function}
     * @see Numbas.controls.jumpQuestion
     */
    makeQuestionJumper: function(n) {
        return function() {
            Numbas.controls.jumpQuestion(n);
        }
    },
    /** Try to move directly to a particular question.
     *
     * @param {number} jumpTo - Number of the question to jump to.
     * @see Numbas.Exam#tryChangeQuestion
     */
    jumpQuestion: function( jumpTo )
    {
        job(function() {
            if(Numbas.exam.currentQuestion && jumpTo == Numbas.exam.currentQuestion.number) {
                Numbas.exam.display.showQuestion();
                return;
            }
            Numbas.exam.tryChangeQuestion( jumpTo );
        });
    },
    /** Regenerate the current question.
     *
     * @see Numbas.Exam#regenQuestion
     */
    regenQuestion: function()
    {
        job(function() {
            Numbas.display.showConfirm(R('control.confirm regen'+(Numbas.exam.mark == 0 ? ' no marks' : '')),
                function(){Numbas.exam.regenQuestion();}
            );
        });
    },
    /** Show the advice for the current question.
     *
     * @see Numbas.Question#getAdvice
     */
    getAdvice: function()
    {
        job(Numbas.exam.currentQuestion.getAdvice,Numbas.exam.currentQuestion);
    },
    /** Reveal the answers to the current question.
     *
     * @see Numbas.Question#revealAnswer
     */
    revealAnswer: function()
    {
        job(function() {
            Numbas.display.showConfirm(R('control.confirm reveal'+(Numbas.exam.mark == 0 ? ' no marks' : '')),
                function(){ Numbas.exam.currentQuestion.revealAnswer(); }
            );
        });
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
                Numbas.display.showConfirm(R('control.submit part.confirm remove next parts'),go);
                return;
            }
        }
        go();
    },

    /** Submit student's answers to all parts in the current question.
     *
     * @see Numbas.Question#submit
     */
    submitQuestion: function()
    {
        job(Numbas.exam.currentQuestion.submit,Numbas.exam.currentQuestion);
    },
    /* Show steps for a question part.
     *
     * @param {Numbas.parts.partpath} partRef - The id of the part.
     * @see Numbas.parts.Part#showSteps
     */
    showSteps: function( partRef )
    {
        job(function() {
            Numbas.exam.currentQuestion.getPart(partRef).showSteps();
        });
    },
    /** Hide the steps for a question part.
     *
     * @param {Numbas.parts.partpath} partRef - The id of the part.
     * @see Numbas.parts.Part#hideSteps
     */
    hideSteps: function( partRef )
    {
        job(function() {
            Numbas.exam.currentQuestion.getPart(partRef).hideSteps();
        });
    }
};
});
