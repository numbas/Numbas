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
// the assumption is that these should only be called in response to some event the user triggers, by clicking or whatever.

Numbas.queueScript('scripts/controls.js',['schedule'],function() {

var job = Numbas.schedule.add;

Numbas.controls = {
//user controls - these wrap the exam methods so I can just bind buttons once to these

	beginExam: function()
	//Start the exam - triggered when user clicks "Start" button on frontpage
	{
		job(Numbas.exam.begin,Numbas.exam);
	},

	pauseExam: function()
	{
		job(Numbas.exam.pause,Numbas.exam);
	},

	resumeExam: function()
	{
		job(Numbas.exam.resume,Numbas.exam);
	},

	endExam: function()
	{
		Numbas.display.showConfirm(
			R('control.confirm end'),
			function() {
				job(Numbas.exam.end,Numbas.exam);
			}
		);
	},

	exitExam: function()
	{
		job(Numbas.exam.exit,Numbas.exam);
	},

	nextQuestion: function( )
	{
		job(function() {
			Numbas.exam.tryChangeQuestion( Numbas.exam.currentQuestion.number+1 );
		});
	},


	previousQuestion: function()
	{
		job(function() {
			Numbas.exam.tryChangeQuestion( Numbas.exam.currentQuestion.number-1 );
		});
	},


	// move directly to a particular question
	jumpQuestion: function( jumpTo )
	{
		job(function() {
			if(jumpTo == Numbas.exam.currentQuestion.number)
				return;

			if( Numbas.exam.navigateBrowse || 											// is browse navigation enabled?
				(Numbas.exam.questionList[jumpTo].visited && Numbas.exam.navigateReverse) ||		// if not, we can still move backwards to questions already seen if reverse navigation is enabled
				(jumpTo>Numbas.exam.currentQuestion.number && Numbas.exam.questionList[jumpTo-1].visited)// or you can always move to the next question
			)
			{
				Numbas.exam.tryChangeQuestion( jumpTo );
			}
		});
	},

	regenQuestion: function() 
	{
		job(function() {
			Numbas.display.showConfirm(R('control.confirm regen'),
				function(){Numbas.exam.regenQuestion();}
			);
		});
	},

	//show the advice for this question
	getAdvice: function()
	{
		job(Numbas.exam.currentQuestion.getAdvice,Numbas.exam.currentQuestion);
	},

	//reveal the answers to all parts in this question
	revealAnswer: function()
	{
		job(function() {
			Numbas.display.showConfirm(R('control.confirm reveal'),
				function(){ Numbas.exam.currentQuestion.revealAnswer(); }
			);
		});
	},

	//submit student's answers, and then update exam total
	submitQuestion: function()
	{
		job(Numbas.exam.currentQuestion.submit,Numbas.exam.currentQuestion);
	},

	//student has changed answer to part - record it and calculate new score
	doPart: function( answerList, partRef )
	{
		job(function() {
			Numbas.exam.currentQuestion.doPart(answerList, partRef);
		});
	},

	//show steps for a question part
	showSteps: function( partRef )
	{
		job(function() {
			Numbas.exam.currentQuestion.getPart(partRef).showSteps();
		});
	}
};

});
