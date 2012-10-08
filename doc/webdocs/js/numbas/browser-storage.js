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


/*
//browser storage - uses browser's localStorage element to save data
function BrowserStorage()
{
	var name = examXML.selectSingleNode('exam').getAttribute('name');
	this.id = name;
}
BrowserStorage.prototype = 
{
	id: '',		//id to be prepended to all saved data so we don't overlap with other apps


	//get key's name in local storage
	makeKey: function(name)
	{
		return 'numbas.'+this.id+'.'+name;
	},

	//store a key/value pair - JSONifies objects
	set: function(key,value)
	{
		key=this.makeKey(key);
		value = JSON.stringify(value);

		console.log('Set "'+key+'": '+value);

		localStorage[key]=value;
	},

	//get value corresponding to a key
	get: function(key)
	{
		key = this.makeKey(key);
		var value = localStorage[key];

		console.log('Get "'+key+'": ',value);
		if(!value)
			return undefined;

		return JSON.parse(value);
	},

	init: function(e)
	{
		var set = this.set;

		set('entry','ab-initio');
		set('mode','normal');
		set('numQuestions',e.numQuestions);
		set('timeRemaining',e.timeRemaining);
		set('questionSubset',e.questionSubset);
		set('start',e.start);
		this.setScore(0);
		this.setCompletionStatus('not attempted');
		this.setSuccessStatus('failed');
		
		for(var i=0; i<e.questionList.length;i++)
		{
			this.initQuestion(e.questionList[i]);
		}
	},

	initQuestion: function(q)
	{
		var set = this.set;

		var path = 'question.'+q.number+'.';
		set(path+'visited',false);
		set(path+'answered',false);
		set(path+'submitted',false);
		set(path+'adviceDisplayed',false);
		set(path+'revealed',false);
		set(path+'variables',q.variables);
		set(path+'score',0);

		for(var i=0;i<q.parts.length;i++)
		{
			this.initPart(q.parts[i]);
		}
	},

	initPart: function(p)
	{
		var set = this.set;

		var path = 'question.'+p.question.number+'.part.'+p.partNumber+(p.gapNumber!==undefined ? 'gap.'+p.gapNumber+'.' : '')+'.';
		set(path+'answered',false);

		if(p.gaps.length)
		{
			for(var i=0;i<p.gaps.length;i++)
			{
				this.initPart(p.gaps[i]);
			}
		}
	},

	//debug - deletes all stored data for this exam
	cleanup: function()
	{
		this.set('mode','ab-initio');
	}
};		   

	update: function()
	{
		var e = this.e;
		if(!e)
			return;

		this.obj = {
			score: e.score,
			passed: e.passed,
			numQuestions: e.numQuestions,
			timeRemaining: e.timeRemaining,
			questionSubset: e.questionSubset,
			start: e.start,
			bookmark: currentQuestionNumber
		}
	},

	save: function()
	{
		this.update();

		this.set('exam',this.obj);
		
		for(var i=0;i<this.questions.length;i++)
			this.questions[i].save();
	},

	load: function()
	{
		this.obj = this.get('exam');

		this.questions = [];
		for(var i=0; i<this.obj.numQuestions; i++)
		{
			var qs = new BrowserStorage.QuestionStore(this);
			qs.load(i);
			this.questions[i]=qs;
		}
	},



	//initialises storage - creates storage objects for exam/questions/parts
	//and saves
	init: function(e)
	{
		this.e=e;

		this.update();
	
		this.questions = [];
		for(var i=0; i<e.numQuestions; i++)
		{
			var q = e.questionList[i];
			var qs = this.questions[i] = new BrowserStorage.QuestionStore(this);
			qs.init(q);
			q.storage = qs;
			this.questions[i] = qs;
		}
	},

	//called when leaving exam
	exit: function()
	{
	},

};

BrowserStorage.QuestionStore = function(bs,q)
{
	this.bs = bs;
	this.q = q;
	this.update();
};
BrowserStorage.QuestionStore.prototype = 
{
	q: undefined,

	obj: 
	{
		score: 0,
		visited: false,
		answered: false,
		submitted: false,
		adviceDisplayed: false,
		revealed: false,
		numParts: 0,
		variables: {}
	},

	parts: [],

	init: function (q)
	{
		this.q = q;
		this.update();

		this.parts = [];
		for(var i=0; i<q.parts.length; i++)
		{
			var p = q.parts[i];
			var ps = createPartStore(this.bs,q.parts[i].type);
			ps.init(p);
			p.storage = ps;
			this.parts[i]=ps;
		}
	},

	update: function ()
	{
		var q = this.q;
		if(!q)
			return;

		this.obj = {
			score: q.score,
			visited: q.visited,
			answered: q.answered,
			submitted: q.submitted,
			adviceDisplayed: q.adviceDisplayed,
			revealed: q.revealed,
			numParts: q.parts.length,
			variables: q.variables
		};
	},

	save: function ()
	{
		this.update();

		var path = 'question.'+this.q.number;

		this.bs.set(path,this.obj);

		for(var i=0;i<this.parts.length;i++)
			this.parts[i].save(path+'.part.'+i);
	},

	load: function(i)
	{
		var path = 'question.'+i;
		this.obj = this.bs.get(path);
	}
}

function createPartStore(bs,type)
{
	var cons = BrowserStorage.PartStore.constructors[type];
	var ps = new BrowserStorage[cons](bs);
	return ps;
}

BrowserStorage.PartStore = function(bs)
{
	this.bs = bs;
};
BrowserStorage.PartStore.prototype = 
{
	bs: undefined,		//reference to main storage object
	p: undefined,		//reference to real part object
	obj: {},			//object for storing save info in, because some gets set in PartStore, rest in type-specific object

	init: function(part)
	{
		this.p = part;
		this.update();
	},

	update: function()
	{
		var p = this.p;
		if(!p)
			return;

		this.obj = {
			score: p.score,
			answerList: p.answerList,
			answered: p.answered
		}
	},

	//this is just a shell which stores the common info shared by all part types
	//the type-specific part object does the actual storage call
	save: function(path)
	{
		this.update();
		this.bs.set(path,this.obj);
	},

	load: function(path)
	{
		this.obj = this.bs.get(path);
	}
};

BrowserStorage.PartStore.constructors = {
	'CUEdt.JMEPart': 'JMEPartStore',
	'CUEdt.PatternMatchPart': 'PatternMatchPartStore',
	'CUEdt.NumberEntryPart': 'NumberEntryPartStore',
	'CUEdt.MR1_n_2Part': 'MultipleResponsePartStore',
	'CUEdt.MRm_n_2Part': 'MultipleResponsePartStore',
	'CUEdt.MRm_n_xPart': 'MultipleResponsePartStore',
	'CUEdt.GapFillPart': 'GapFillPartStore'
};


BrowserStorage.JMEPartStore = function()
{
};
BrowserStorage.JMEPartStore.prototype =
{
	update: function()
	{
		this.obj.studentAnswer = this.p.studentAnswer;
	}
};
BrowserStorage.JMEPartStore = extend(BrowserStorage.PartStore,BrowserStorage.JMEPartStore, true);


BrowserStorage.PatternMatchPartStore = function()
{
};
BrowserStorage.PatternMatchPartStore.prototype =
{
	update: function()
	{
		this.obj.studentAnswer = this.p.studentAnswer;
	}
};
BrowserStorage.PatternMatchPartStore = extend(BrowserStorage.PartStore,BrowserStorage.PatternMatchPartStore, true);


BrowserStorage.NumberEntryPartStore = function()
{
};
BrowserStorage.NumberEntryPartStore.prototype =
{
	update: function ()
	{
		this.obj.studentAnswer = this.p.studentAnswer;
	}
};
BrowserStorage.NumberEntryPartStore = extend(BrowserStorage.PartStore,BrowserStorage.NumberEntryPartStore, true);


BrowserStorage.MultipleResponsePartStore = function()
{
};
BrowserStorage.MultipleResponsePartStore.prototype =
{
	update: function ()
	{
		this.obj.ticks = this.p.ticks;
		this.obj.wrongNumber = this.p.wrongNumber;
		this.obj.shuffleChoices = this.p.shuffleChoices;
		this.obj.shuffleAnswers = this.p.shuffleAnswers;
	}
};
BrowserStorage.MultipleResponsePartStore = extend(BrowserStorage.PartStore,BrowserStorage.MultipleResponsePartStore, true);


BrowserStorage.GapFillPartStore = function()
{
};
BrowserStorage.GapFillPartStore.prototype =
{
	gaps: [],

	init: function()
	{
		this.gaps = [];
		for(var i=0; i<this.p.gaps.length;i++)
		{
			var ps = createPartStore(this.bs,this.p.gaps[i].type);
			ps.init(this.p.gaps[i]);
			this.gaps[i]=ps;
		}
	},

	update: function ()
	{
		this.obj.numGaps = this.p.gaps.length;

		for(var i=0;i<this.gaps.length; i++)
			this.gaps[i].update();
	},

	save: function (path)
	{
		for(var i=0; i<this.gaps.length; i++)
		{
			this.gaps[i].save(path+'.gaps.'+i);
		}
	}
};
BrowserStorage.GapFillPartStore = extend(BrowserStorage.PartStore,BrowserStorage.GapFillPartStore, true);

*/
