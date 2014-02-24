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


Numbas.queueScript('schedule',['base'],function() {
//schedule a function to be called
Numbas.schedule = {
	calls: [],
	lifts: [],
	completed: 0,
	total: 0,
	halt:false,

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
			Numbas.showError(e);
			schedule.halt = true;
		}
		schedule.drop();

		schedule.completed++;

		Numbas.display.showLoadProgress();
	},

	//'pick up' the current queue and put stuff in front - if a queued job wants to queue some things which must be done before the rest of the queue is called
	lift: function()
	{
		var schedule = Numbas.schedule;

		schedule.lifts.push(schedule.calls);
		schedule.calls=new Array();
	},

	//put a previously lifted queue back on the end of the real queue
	drop:function()
	{
		var schedule = Numbas.schedule;

		schedule.calls = schedule.calls.concat(schedule.lifts.pop());
	}
};

});
