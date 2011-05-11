/*
Copyright 2011 Newcastle University

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


// controls.js
// wrappers for the various navigation actions the user can do

Numbas.queueScript('scripts/controls.js',[],function() {

Numbas.controls = {
//user controls - these wrap the exam methods so I can just bind buttons once to these

	beginExam: function()
	//Start the exam - triggered when user clicks "Start" button on frontpage
	{
		Numbas.exam.begin();
	},

	pauseExam: function()
	{
		Numbas.exam.pause();
	},

	resumeExam: function()
	{
		Numbas.exam.resume();
	},

	endExam: function()
	{
		Numbas.exam.end();
	},

	exitExam: function()
	{
		Numbas.exam.exit();
	},

	nextQuestion: function( )
	{
		Numbas.exam.tryChangeQuestion( Numbas.exam.currentQuestion.number+1 );
	},


	previousQuestion: function()
	{
		Numbas.exam.tryChangeQuestion( Numbas.exam.currentQuestion.number-1 );
	},


	// move directly to a particular question
	jumpQuestion: function( jumpTo )
	{
		if(jumpTo == Numbas.exam.currentQuestion.number)
			return;

		if( Numbas.exam.navigateBrowse || 											// is browse navigation enabled?
			(questionList[jumpTo].visited && Numbas.exam.navigateReverse) ||		// if not, we can still move backwards to questions already seen if reverse navigation is enabled
			(jumpTo>Numbas.exam.currentQuestion.number && questionList[jumpTo-1].visited)// or you can always move to the next question
		)
		{
			Numbas.exam.tryChangeQuestion( jumpTo );
		}
	},


	//show the advice for this question
	getAdvice: function()
	{
		Numbas.exam.currentQuestion.getAdvice();
	},

	//reveal the answers to all parts in this question
	revealAnswer: function()
	{
		Numbas.display.showConfirm("Would you like to reveal the answer to this question? Any marks you have received so far will be removed and you will not be able to answer this question later.",
			function(){ Numbas.exam.currentQuestion.revealAnswer(); }
		);
	},

	//submit student's answers, and then update exam total
	submitQuestion: function()
	{
		Numbas.exam.currentQuestion.submit();
	},

	//student has changed answer to part - record it and calculate new score
	doPart: function( answerList, partRef )
	{
		Numbas.exam.currentQuestion.doPart(answerList, partRef);
	},

	//show steps for a question part
	showSteps: function( partRef )
	{
		Numbas.exam.currentQuestion.getPart(partRef).showSteps();
	}
};

});
