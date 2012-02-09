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


Numbas.queueScript('scripts/storage.js',[],function() {

Numbas.store = {};

Numbas.storage = {};

//a blank storage object which does nothing
//any real storage object needs to implement the methods in this object's prototype
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

	//get suspended info for a question
	//questionNumber is the one in exam.questionSubset, not the original order
	loadQuestion: function(questionNumber) {},

	//get suspended info for a part
	loadPart: function(questionNumber, partNumber, gapNumber) {},

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

	//called when current question is submitted
	submitQuestion: function(question) {},

	//record that the student displayed question advice
	adviceDisplayed: function(question) {},

	//record that the student revealed the answer to a question
	answerRevealed: function(question) {}
};
});
