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

/** @file Provides {@link Numbas.schedule} */

Numbas.queueScript('schedule',['base'],function() {

/** Schedule functions to be called. The scheduler can put tiny timeouts in between function calls so the browser doesn't become unresponsive. It also updates the loading bar.
 * @namespace Numbas.schedule 
 */

Numbas.schedule = /** @lends Numbas.schedule */ {

	/** Functions to call 
	 * @type {function[]}
	 */
	calls: [],

	/** Bits of queue that have been picked up while a task performs sub-tasks 
	 * @type {Array.Array.<function>} */
	lifts: [],

	/** Number of tasks completed 
	 * @type {number}
	 */
	completed: 0,

	/** Total number of tasks ever scheduled
	 * @type {number}
	 */
	total: 0,

	/** Should the scheduler stop running tasks?
	 * @type {boolean}
	 */
	halt:false,

	/** Add a task to the queue
	 * @param {function} fn - the function to run
	 * @param {object} that - what `this` should be when the function is called
	 */
	add: function(fn,that)
	{
		var schedule = Numbas.schedule;

		if(schedule.halt)
			return;

		var args = [],l=arguments.length;
		for(var i=2;i<l;i++)
		{
			args[i-2]=arguments[i];
		}

		var task = function()
		{
			fn.apply(that,args);
		
		};
		
		schedule.calls.push(task);
		setTimeout(schedule.pop,0);

		schedule.total++;
	},

	/** Pop the first task off the queue and run it.
	 *
	 * If there's an error, the scheduler halts and shows the error.
	 */
	pop: function()
	{
		var schedule = Numbas.schedule;

		var calls = schedule.calls;
		if(!calls.length || schedule.halt){return;}

		var task = calls.shift();

		schedule.lift();
		try {
			task();
		}
		catch(e) {
			Numbas.display.die(e);
			schedule.halt = true;
			Numbas.showError(e);
		}
		schedule.drop();

		schedule.completed++;

		Numbas.display.showLoadProgress();
	},

	/** 'pick up' the current queue and put stuff in front. Called before running a task, so it can queue things which must be done before the rest of the queue is called */
	lift: function()
	{
		var schedule = Numbas.schedule;

		schedule.lifts.push(schedule.calls);
		schedule.calls=new Array();
	},

	/** Put the last lifted queue back on the end of the real queue */
	drop:function()
	{
		var schedule = Numbas.schedule;

		schedule.calls = schedule.calls.concat(schedule.lifts.pop());
	}
};

});
