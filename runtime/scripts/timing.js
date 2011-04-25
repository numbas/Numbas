/*
 * Copyright (c) Christian Perfect for Newcastle University 2010-2011
 */

Numbas.queueScript('scripts/timing.js',[],function() {
var timing = Numbas.timing = {
	//timing
	displayDate: function()
	{
		return (new Date()).toLocaleDateString();
	},


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

	timers: [],
	messages: [],
	start: function()
	{
		timing.timers.push(new Date());
	},
	end: function(label)
	{
		var s='';
		for(var i=0;i<timing.timers.length;i++){s+='   ';}
		s+=(new Date())-timing.timers.pop();
		s+=' '+label;
		timing.messages.push(s);
		if(!timing.timers.length){timing.show();}
	},

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

	//stress test a function by running it a lot of times and seeing how long it takes
	stress: function(f,times)
	{
		timing.start();
		for(var i=0;i<times;i++)
		{
			f();
		}
		timing.end();
	},


	//accumulators are for counting time spent in functions which don't take long to evaluate, but are called repeatedly
	//call startacc with the function's name at the start of the function, and endacc with the same name just before returning a value
	//it copes with recursion automatically, so you don't need to worry about double counting
	accs: {},
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

	endacc: function(name)
	{
		var acc = timing.accs[name];
		if(!acc)
			throw(new Error("no timing accumulator "+name));

		acc.go -= 1;
		if(acc.go==0)
		{
			var end = new Date();
			acc.total += (end - acc.start);
		}
	}
	

};

});
