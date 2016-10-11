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

/** @file A few functions to do with time and date, and also performance timing. Provides {@link Numbas.timing}. */

Numbas.queueScript('timing',['base'],function() {

/** @namespace Numbas.timing */

var timing = Numbas.timing = /** @lends Numbas.timing */ {
	
	/** Get the current date as a string in the user's locale
	 * @returns {string}
	 */
	displayDate: function()
	{
		return (new Date()).toLocaleDateString();
	},

	/** Convert a number of seconds to a string in `HH:MM:SS` format
	 * @param {number} time
	 * @returns {string}
	 */
	secsToDisplayTime: function( time )
	{		
		if(time<0)
			return '-'+Numbas.timing.secsToDisplayTime(-time);
		var hours = 0;
		var minutes = 0;
		var seconds = 0;
		
		var remainder = time % 3600;
		hours = ( time - remainder ) / 3600;	
		
		time = remainder;
		
		if (time>59)
		{
			remainder = time % 60;
			minutes = ( time - remainder ) / 60;
		}
		else
		{
			minutes = 0;
		}		
				
		seconds = Math.floor(remainder);
					
		if( minutes<=9 )
		{ 
			minutes = "0" + minutes;
		}
		
		if( seconds<=9 )
		{
			seconds = "0" + seconds;
		}
		
		displayTime = hours + ":" + minutes + ":" + seconds;
		return displayTime;	
	},

	/** A queue of timers
	 * @type {Date[]}
	 */
	timers: [],

	/** Timing messages - how long did each timer take?
	 * @type {string[]}
	 */
	messages: [],
	start: function()
	{
		timing.timers.push(new Date());
	},

	/** End the top timer on the queue
	 * @param {string} label - a description of the timer
	 */
	end: function(label)
	{
		var s='';
		for(var i=0;i<timing.timers.length;i++){s+='   ';}
		s+=(new Date())-timing.timers.pop();
		s+=' '+label;
		timing.messages.push(s);
		if(!timing.timers.length){timing.show();}
	},

	/** Show all timing messages through {@link Numbas.debug}*/
	show: function()
	{
		for(var x in timing.accs)
		{
			Numbas.debug(timing.accs[x].total+' '+x,true);
		}
		timing.accs = {};

		for(var i=0;i<timing.messages.length;i++)
		{
			Numbas.debug(timing.messages[i],true);
		}
		timing.messages = [];

	},

	/** Stress test a function by running it a lot of times and seeing how long it takes
	 * @param {function} f
	 * @param {number} times
	 */
	stress: function(f,times)
	{
		timing.start();
		for(var i=0;i<times;i++)
		{
			f();
		}
		timing.end();
	},

	/** Timing accumulators
	 * @see Numbas.timing.startacc}
	 */
	accs: {},

	/** Accumulators are for counting time spent in functions which don't take long to evaluate, but are called repeatedly.
	 * 
	 * Call this with the function's name when you start the function, and {@link Numbas.timing.endacc} with the same name just before returning a value.
	 *
	 * It copes with recursion automatically, so you don't need to worry about double counting
	 * @param {string} name
	 */
	startacc: function(name)
	{
		if(timing.accs[name]==undefined)
		{
			timing.accs[name] = {
				total: 0,
				go: 0
			}
		}
		var acc = timing.accs[name];
		acc.go+=1;
		if(acc.go>1) { return; }
		acc.start = new Date();
	},

	/** Stop accumulating runtime for a function
	 * @param {string} name
	 * @see Numbas.timing.startacc
	 */
	endacc: function(name)
	{
		var acc = timing.accs[name];
		if(!acc)
			throw(new Numbas.Error('timing.no accumulator',{name:name}));

		acc.go -= 1;
		if(acc.go==0)
		{
			var end = new Date();
			acc.total += (end - acc.start);
		}
	}
	

};

});
