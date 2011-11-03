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


Numbas.queueScript('extensions/pretendlms/pretendlms.js',['util','scorm-storage'],function() {

var isFloat = Numbas.util.isFloat;
var isInt = Numbas.util.isInt;

//This is a pretend SCORM LMS
//It does not interact with a server.
var PretendLMS = Numbas.storage.PretendLMS = function()
{
	//console.log("new LMS");
	this.comments_from_learner = [];
	this.comments_from_lms = [];
	this.interactions = [];
	this.objectives = [];
	this.learner_preference = Numbas.util.copyobj(this.learner_preference);
	this.score = Numbas.util.copyobj(this.score);

	this.savePrefix = '('+window.location+') ';

	this.LoadAll();

	this.SaveAll();
}
PretendLMS.prototype =
{

	//Book-keeping
	running_state: 'Not Initialized',	//Not Initialized, Initialized, Terminated
	last_error: 0,						//last error code produced
	last_diagnostic: '',				//more information about last error

	//SCORM Data Model
	_version: '1.0',					//version of SCORM data model 												(RO)
	comments_from_learner: [],			//learner can provide comments
	comments_from_lms: [],				//LMS can provide comments
	completion_status: 'unknown',		//completed, incomplete, not attempted, unknown 							(RW)
	completion_threshold: 1,			//real, range(0..1), to determine whether SCO should be considered complete (RO)
	credit: 'credit',					//should student be given credit for performance in SCO?					(RO)
	entry: 'ab-initio',					//ab-initio, resume, ''  													(RO)
	exit: '',							//timeout,suspend,logout,normal,''	reason for leaving exam					(WO)
	launch_data: '',					//data provided to SCO at launch, provided by manifest						(RO)
	learner_id: 'urn:ADL:learner-id-01',//unique identifier of learner												(RO)
	learner_name: 'Student',			//name of student															(RO)
	learner_preference: {				
		audio_level: 1,					//intended change in perceived audio level									(RW)
		language: 'en-GB',				//preferred language														(RW)
		delivery_speed: 1,				//preferred speed of delivery of content									(RW)
		audio_captioning:0				//whether subtitles are displayed											(RW)
	},
	location: '',						//learner's current location in SCO											(RW)
	max_time_allowed: 0,				//total amount of time user can spend in SCO								(RO)
	mode: 'normal',						//browse,normal,review - how SCO is presented								(RO)
	progress_measure: 0,				//range (0..1) how much progress towards completing SCO						(RW)
	scaled_passing_score: 1,			//range(-1..1) scaled score required to pass SCO							(RO)
	score: {
		scaled:0,						//scaled score for whole SCO												(RW)
		raw: 0,							//student's score, between score.min and score.max							(RW)
		min: undefined,					//minimum possible score													(RW)
		max: undefined					//maximum possible score													(RW)
	},
	session_time: 0,					//time learner has spent in current session									(WO)
	success_status: 'unknown',			//passed, failed, unknown													(RW)
	suspend_data: '',					//space to store data between sessions										(RW)
	time_limit_action: 'continue, no message',	//[exit/continue],[message/nomessage] - what to do on timeout		(RO)
	total_time: 0,						//total time across all sessions											(RO)

	errorcodes: [],


	//methods
	
	LoadValue: function( element )
	{
		var res = window.localStorage[this.savePrefix+element] || '';
		if(isInt(res))
			return parseInt(res);
		else if(isFloat(res))
			return parseFloat(res);
		else
			return res;
	},
	
	SaveValue: function( element, value )
	{
		//Numbas.debug(element+' : '+value);
		window.localStorage[this.savePrefix+element] = value;
	},

	SetError: function( errorCode, diagnostic )
	{
		if(errorCode>0)
			Numbas.debug("SCORM error: "+errorCode+' '+this.errorcodes[errorCode]+' '+(diagnostic? ": "+diagnostic : ''));

		this.last_error = errorCode;
		this.last_diagnostic = diagnostic;
	},
	
	Initialize: function( parameter )
	{
		if(parameter !== '')
		{
			this.SetError(201,"You must pass in an empty string as a parameter to the Initialize function.");
			return false;
		}

		switch(this.running_state)
		{
		case 'Not Initialized':
			this.session_start = new Date();

			this.running_state = 'Initialized';
			return true;
		case 'Initialized':
			this.SetError(103);	//already initialized
			return false;
		case 'Terminated':
			this.SetError(104); //instance terminated
			return false;
		}
	},

	Terminate: function( parameter )
	{
		//console.log("Terminate");

		if(parameter !== '')
		{
			this.SetError(201,"You must pass in an empty string as a parameter to the Terminate function.");
			return false;
		}

		switch(this.running_state)
		{
		case 'Not Initialized':
			this.SetError(112);	//not initialized yet
			return false;
		case 'Initialized':
			this.running_state = 'Terminated';
			return true;
		case 'Terminated':
			this.SetError(113);	//already terminated
			return false;
		}
	},

	GetValue: function( element )
	{
		//console.log("Get "+element);

		switch(this.running_state)
		{
		case 'Not Initialized':
			this.SetError(122);	//not initialized yet
			return false;
		case 'Terminated':
			this.SetError(123);	//instance terminated
			return false;
		}

		var path = element.split(".");
		switch(path[0])
		{
		case 'cmi':
			return this.GetCMI(path.slice(1));
		case 'adl':
			this.SetError(402);	//unimplemented
			return '';
		default:
			this.SetError(401);	//undefined data model element
			return '';
		}

	},

	GetCMI: function( path )
	{
		switch(path[0])
		{
		case '_version':
			return this._version;
		case 'comments_from_learner':
			switch(path[1])
			{
			case '_children':
				return 'comment,location,timestamp';
			case '_count':
				return this.comments_from_learner.length;
			default:
				return this.GetCommentFromLearner(path.slice(1));
			}

			break;
		case 'comments_from_lms':
			switch(path[1])
			{
			case '_children':
				return 'comment,location,timestamp';
			case '_count':
				return this.comments_from_lms.length;
			default:
				return this.GetCommentFromLMS(path.slice(1));
			}

			break;
		case 'completion_status':
			return this.completion_status;
		case 'completion_threshold':
			return this.completion_threshold;
		case 'credit':
			return this.credit;
		case 'entry':
			return this.entry;
		case 'exit':
			this.SetError(405);	//write-only
			return '';
		case 'interactions':
			switch(path[1])
			{
			case '_children':
				return 'id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description';
			case '_count':
				return this.interactions.length;
			default:
				return this.GetInteraction(path.slice(1));
			}
			break;
		case 'launch_data':
			return this.launch_data;
		case 'learner_id':
			return this.learner_id;
		case 'learner_name':
			return this.learner_name;
		case 'learner_preference':
			switch(path[1])
			{
			case '_children':
				return 'audio_level,language,delivery_speed,audio_captioning';
			case 'audio_level':
				return this.learner_preference.audio_level;
			case 'language':
				return this.learner_preference.language;
			case 'delivery_speed':
				return this.learner_preference.delivery_speed;
			case 'audio_captioning':
				return this.learner_preference.audio_captioning;
			default:
				this.SetError(401);	//undefined data model element
				return '';
			}
			break;
		case 'location':
			return this.location;
		case 'max_time_allowed':
			return this.max_time_allowed;
		case 'mode':
			return this.mode;
		case 'objectives':
			switch(path[1])
			{
			case '_children':
				return 'id,score,success_status,completion_status,description';
			case '_count':
				return this.objectives.length;
			default:
				return this.GetObjective( path.slice(1) );
			}
			break;
		case 'progress_measure':
			return this.progress_measure;
		case 'scaled_passing_score':
			return this.scaled_passing_score;
		case 'score':
			switch(path[1])
			{
			case '_children':
				return 'scaled,raw,max,min';
			case 'scaled':
				return this.score.scaled;
			case 'raw':
				return this.score.raw;
			case 'max':
				return this.score.max;
			case 'min':
				return this.score.min;
			default:
				this.SetError(401);	//undefined data model element
				return '';
			}
			break;
		case 'session_time':
			this.SetError(405,'cmi.session_time is write-only - it is used by the SCO to report how long student spent viewing content');
			return '';
		case 'success_status':
			return this.success_status;
		case 'suspend_data':
			return this.suspend_data;
		case 'time_limit_action':
			return this.time_limit_action;
		case 'total_time':
			return this.total_time;
		default:
			this.SetError(401);	//undefined data model element
			return '';
		}
	},

	GetCommentFromLearner: function( path )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for a comment_from_learner.");
			return '';
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>=this.comments_from_learner.length )
		{
			this.SetError(301,"Index out of range");
			return '';
		}
		
		var c = this.comments_from_learner[n];
		switch(path[1])
		{
		case 'comment':
			return c.comment;
		case 'location':
			return c.location;
		case 'timestamp':
			return c.timestamp;
		default:
			this.SetError(402);
			return '';
		}
	},

	GetCommentFromLMS: function( path )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for a comment_from_lms.");
			return '';
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>=this.comments_from_lms.length )
		{
			this.SetError(301,"Index out of range");
			return '';
		}
		
		var c = this.comments_from_lms[n];
		switch(path[1])
		{
		case 'comment':
			return c.comment;
		case 'location':
			return c.location;
		case 'timestamp':
			return c.timestamp;
		default:
			this.SetError(402);
			return '';
		}
	},

	GetInteraction: function( path )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for an interaction.");
			return '';
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>=this.interactions.length )
		{
			this.SetError(301,"Index out of range");
			return '';
		}

		var i = this.interactions[n];

		switch(path[1])
		{
		case 'id':
			return i.id;
		case 'type':
			return i.type;
		case 'objectives':
			switch(path[2])
			{
			case '_count':
				return i.objectives.length;
			default:
				return i.GetObjective(path.slice(2));
			}
			break;
		case 'timestamp':
			return i.timestamp;
		case 'correct_responses':
			switch(path[2])
			{
			case '_count':
				return i.correct_responses.length;
			default:
				return i.GetCorrectResponse(path.slice(2));
			}
			break;
		case 'weighting':
			return i.weighting;
		case 'learner_response':
			return i.learner_response;
		case 'result':
			return i.result;
		case 'latency':
			return i.latency;
		case 'description':
			return i.description;
		default:
			this.SetError(401);	//undefined data model element
			return '';
		}
	},

	GetObjective: function( path )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for an objective.");
			return '';
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>=this.objectives.length )
		{
			this.SetError(301,"Index out of range");
			return '';
		}

		var o = this.objectives[n];
		switch(path[1])
		{
		case 'id':
			return o.id;
		case 'score':
			switch(path[2])
			{
			case '_children':
				return 'scaled,raw,max,min';
			case 'scaled':
				return o.score.scaled;
			case 'raw':
				return o.score.raw;
			case 'max':
				return o.score.max;
			case 'min':
				return o.score.min;
			default:
				this.SetError(401);	//undefined data model element
				return '';
			}
			break;
		case 'success_status':
			return o.success_status;
		case 'completion_status':
			return o.completion_status;
		case 'progress_measure':
			return o.progress_measure;
		case 'description':
			return o.description;
		default:
			this.SetError(401);	//undefined data model element
			return '';
		}
	},

	SetValue: function( element, value )
	{
		//console.log("Set "+element+" : '"+value+"'");

		switch(this.running_state)
		{
		case 'Not Initialized':
			this.SetError(132);	//not initialized yet
			return false;
		case 'Terminated':
			this.SetError(133);	//instance terminated
			return false;
		}

		var path = element.split(".");
		var result;
		switch(path[0])
		{
		case 'cmi':
			result = this.SetCMI(path.slice(1), value);
			break;
		case 'adl':
			this.SetError(402);	//unimplemented
			result = false;
			break;
		default:
			this.SetError(401);	//undefined data model element
			result = false;
			break;
		}
		if(result)
			this.SaveValue(element,value);

		return result;
	},

	SetCMI: function( path, value )
	{
		switch(path[0])
		{
		case '_version':
			this.SetError(404,"cmi._version is read-only and informs the SCO of the data model version being used by the LMS");
			return false;
		case 'comments_from_learner':
			switch(path[1])
			{
			case '_children':
				this.SetError(404);	//read-only
				return false;
			case '_count':
				this.SetError(404,"cmi.comments_from_learner._count is read-only. To add another comment, set cmi.comments_from_learner."+this.comments_from_learner.length+".comment");
				return false;
			default:
				return this.SetCommentFromLearner(path.slice(1), value);
			}
			break;
		case 'comments_from_lms':
			switch(path[1])
			{
			case '_children':
				this.SetError(404);	//read-only
				return false;
			case '_count':
				this.SetError(404,"cmi.comments_from_lms._count is read-only. To add another comment, set cmi.comments_from_lms."+this.comments_from_lms.length+".comment");
				return false;
			default:
				return this.SetCommentFromLMS(path.slice(1), value);
			}
			break;
		case 'completion_status':
			switch(value)
			{
			case 'completed':
			case 'incomplete':
			case 'not attempted':
			case 'unknown':
				this.completion_status = value;
				return true;
			default:
				this.SetError(406,"Possible values for cmi.completion_status are: completed, incomplete, not attempted, unknown.");
				return false;
			}
			break;
		case 'completion_threshold':
			this.SetError(404,"cmi.completion_threshold is read-only and is calculated by the LMS");
			return false;
		case 'credit':
			this.SetError(404); //read-only
			return false;
		case 'entry':
			this.SetError(404); //read-only
			return false;
		case 'exit':
			switch(value)
			{
			case 'timeout':
			case 'suspend':
			case 'logout':
			case 'normal':
				this.exit = value;
				return true;
			default:
				this.SetError(406,"Possible values for cmi.exit are: timeout, suspend, logout, normal.");
				return false;
			}
			break;
		case 'interactions':
			switch(path[1])
			{
			case '_children':
				this.SetError(404); //read-only
				return false;
			case '_count':
				this.SetError(404,"cmi.interactions._count is read-only. To add another interaction set cmi.interactions."+this.interactions.length+".id");
				return false;
			default:
				return this.SetInteraction( path.slice(1), value );
			}
			break;
		case 'launch_data':
			this.SetError(404,"cmi.launch_data is read-only and is used to provide data to the SCO, as defined in the manifest.");
			return false;
		case 'learner_id':
			this.SetError(404,"cmi.learner_id is read-only.");
			return false;
		case 'learner_name':
			this.SetError(404,"cmi.learner_name is read-only.");
		case 'learner_preference':
			switch(path[1])
			{
			case '_children':
				this.SetError(404,"cmi.learner_preference._children is read-only.");
				return false;
			case 'audio_level':
				if(!isFloat(value) || parseFloat(value)<0)
				{
					this.SetError(406,"audio_level must be a real number in the range (0..)");
					return false;
				}
				else
				{
					this.learner_preference.audio_level = parseFloat(value);
					return true;
				}
				break;
			case 'language':
				if(isLanguageCode(value))
				{
					this.learner_preference.language = value;
					return true;
				}
				else
				{
					this.SetError(406,"cmi.learner_preference.language must be a language code in the format 'aa-BB'");
					return false;
				}
			case 'delivery_speed':
				if(!isFloat(value) || parseFloat(value)<0)
				{
					this.SetError(406,"delivery_speed must be a real number in the range (0..)");
					return false;
				}
				else
				{
					this.learner_preference.delivery_speed = parseFloat(value);
					return true;
				}
				break;
			case 'audio_captioning':
				switch(value)
				{
				case '-1':
				case '0':
				case '1':
					this.learner_preference.audio_captioning = value;
					return true;
				default:
					this.SetError(406,"Possible values for cmi.learner_preference.audio_captioning: -1,0,1.");
					return false;
				}
				break;
			default:
				this.SetError(401); //undefined data model element
				return false;
			}
			break;
		case 'location':
			this.location = value;
			return true;
		case 'max_time_allowed':
			this.SetError(404,"cmi.max_time_allowed is read-only.");
			return false;
		case 'mode':
			this.SetError(404,"cmi.mode is read-only.");
			return false;
		case 'objectives':
			switch(path[1])
			{
			case '_children':
				this.SetError(404,"cmi.objectives._children is read-only");
				return false;
			case '_count':
				this.SetError(404,"cmi.objectives._count is read-only. To add another objective, set cmi.objectives."+this.objectives.length+".id");
				return false;
			default:
				return this.SetObjective(path.slice(1),value);
			}
			break;
		case 'progress_measure':
			if(isFloat(value) && parseFloat(value)>=0 && parseFloat(value)<=1)
			{
				this.progress_measure = parseFloat(value);
				return true;
			}
			else
			{
				this.SetError(406,"cmi.progress_measure must be a real number in the range (0..1)");
				return false;
			}
		case 'scaled_passing_score':
			this.SetError(404,"cmi.scaled_passing_score is read-only");
			return false;
		case 'score':
			switch(path[1])
			{
			case 'scaled':
				if(isFloat(value) && parseFloat(value)>=-1 && parseFloat(value)<=1)
				{
					this.score.scaled = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"cmi.score.scaled must be a number in the range (-1..1)");
					return false;
				}
			case 'raw':
				if(isFloat(value))
				{
					this.score.raw = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"cmi.score.raw must be a real number.");
					return false;
				}
			case 'min':
				if(isFloat(value))
				{
					this.score.min = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"cmi.score.min must be a real number.");
					return false;
				}
			case 'max':
				if(isFloat(value))
				{
					this.score.max = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"cmi.score.max must be a real number.");
					return false;
				}
			default:
				this.SetError(401);	//undefined data model element
				return false;
			}
			break;
		case 'session_time':
			if(isTimeInterval(value))
			{
				this.session_time = value;
				return true;
			}
			else
			{
				this.SetError(406,"cmi.session_time must be a time interval in the format PyYmMdDThHmMs.sS");
				return false;
			}
			break;
		case 'success_status':
			switch(value)
			{
			case 'passed':
			case 'failed':
			case 'unknown':
				this.success_status = value;
				return true;
			default:
				this.SetError(406,"Possible values for cmi.success_status are: passed, failed, unknown.");
				return false;
			}
			break;
		case 'suspend_data':
			this.suspend_data = value;
			return true;
		case 'time_limit_action':
			this.SetError(404);
			return false;
		case 'total_time':
			this.SetError(404,"cmi.total_time is read-only. To record the time spent in the current session, set cmi.session_time.");
			return false;
		default:
			this.SetError(401);	//undefined data model element
			return false;
		}
	},

	SetCommentFromLearner: function( path, value )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for a comment_from_learner.");
			return false;
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>this.comments_from_learner.length )
		{
			this.SetError(351,"Index out of range");
			return false;
		}

		var c;
		if(n==this.comments_from_learner.length)
		{
			c = new Comment();
			this.comments_from_learner.push(c);
			this.SaveValue('cmi.comments_from_learner._count',this.comments_from_learner.length);
		}
		else
		{
			c = this.comments_from_learner[n];
		}
		
		switch(path[1])
		{
		case 'comment':
			c.comment = value;
			return true;
		case 'location':
			c.location = value;
			return true;
		case 'timestamp':
			if(!isTimestamp(value))
			{
				this.SetError(406,"Timestamps should be in the format YYYY-MM-DDThh:mm:ss.sTZD");
				return false;
			}
			else
			{
				c.timestamp = value;
				return true;
			}
		default:
			this.SetError(401); //undefined data model element
			return false;
		}
	},

	SetCommentFromLMS: function( path, value )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for a comment_from_lms.");
			return false;
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>this.comments_from_lms.length )
		{
			this.SetError(351,"Index out of range");
			return false;
		}

		var c;
		if(n==this.comments_from_lms.length)
		{
			c = new Comment();
			this.comments_from_lms.push(c);
			this.SaveValue('cmi.comments_from_lms._count',this.comments_from_lms.length);
		}
		else
		{
			c = this.comments_from_lms[n];
		}
		
		switch(path[1])
		{
		case 'comment':
			c.comment = value;
			return true;
		case 'location':
			c.location = value;
			return true;
		case 'timestamp':
			if(!isTimestamp(value))
			{
				this.SetError(406,"Timestamps should be in the format YYYY-MM-DDThh:mm:ss.sTZD");
				return false;
			}
			else
			{
				c.timestamp = value;
				return true;
			}
		default:
			this.SetError(401); //undefined data model element
			return false;
		}
	},

	SetInteraction: function( path, value )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for an interaction.");
			return false;
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>this.interactions.length )
		{
			this.SetError(351,"Index out of range");
			return false;
		}

		var i;
		if(n==this.interactions.length)
		{
			if(path[1]=='id')
			{
				i = new Interaction(this,n);
				this.interactions.push(i);
				this.SaveValue('cmi.interactions._count',this.interactions.length);
			}
			else
			{
				this.SetError(408,"You must set cmi.interactions."+n+".id before you can set any other element of this interaction.");
				return false;
			}
		}
		else
		{
			i = this.interactions[n];
		}

		switch(path[1])
		{
		case 'id':
			i.id=value;
			return true;
		case 'type':
			switch(value)
			{
			case 'true-false':
			case 'choice':
			case 'fill-in':
			case 'long-fill-in':
			case 'matching':
			case 'performance':
			case 'sequencing':
			case 'likert':
			case 'numeric':
			case 'other':
				i.type=value;
				return true;
			default:
				this.SetError(406,"Possible values for interaction type: true-false, choice, fill-in, long-fill-in, matching, performance, sequencing, likert, numeric, other.");
				return false;
			}
			break;
		case 'objectives':
			switch(path[2])
			{
			case '_count':
				this.SetError(405,"cmi.interactions.n.objectives._count is read-only. To add another objective, set cmi.interactions."+n+".objectives."+i.objectives.length+".id");
				return false;
			default:
				return i.SetObjective(path.slice(2), value);
			}
			break;
		case 'timestamp':
			if(!isTimestamp(value))
			{
				this.SetError(406,"Timestamps must be in the format YYYY-MM-DDThh:mm:ss.sTZD");
				return false;
			}
			else
			{
				i.timestamp = value;
				return true;
			}
		case 'correct_responses':
			switch(path[2])
			{
			case '_count':
				this.SetError(405,"cmi.interactions.n.correct_responses._count is read-only. To add another correct response, set cmi.interactions."+n+".correct_responses."+i.correct_responses.length+".pattern");
				return false;
			default:
				return i.SetCorrectResponse( path.slice(2), value );
			}
			break;
		case 'weighting':
			if(!isFloat(value))
			{
				this.SetError(406,"Weighting must be a number.");
				return false;
			}
			else
			{
				i.weighting = value;
				return true;
			}
		case 'learner_response':
			if( i.ValidResponse(value) )
			{
				i.learner_response = value;
				return true;
			}
			else
			{
				return false;
			}
		case 'result':
			switch(value)
			{
			case 'correct':
			case 'incorrect':
			case 'unanticipated':
			case 'neutral':
				i.result = value;
				return true;
			default:
				if(isFloat(value))
				{
					i.result = value;
					return true;
				}
				else
				{
					this.SetError(406,"Possible values for interaction result: correct, incorrect, unanticipated, neutral, <real number>");
					return false;
				}
			}
			break;
		case 'latency':
			if( isTimeInterval(value) )
			{
				i.latency = value;
				return true;
			}
			else
			{
				this.SetError(406,"Interaction latency must be a time-interval in the format: PyYmMdDThHmMs.sS");
				return false;
			}
		case 'description':
			i.description = value;
			return true;
		default:
			this.SetError(401);	//undefined data model element
			return false;
		}
	},

	SetObjective: function( path, value )
	{
		if( !isInt(path[0]) )
		{
			this.SetError(401,"You tried to use a non-number as an index for an objective.");
			return false;
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>this.objectives.length )
		{
			this.SetError(351,"Index out of range");
			return false;
		}

		var o;
		if(n==this.objectives.length)
		{
			if(path[1]=='id')
			{
				o = new Objective();
				this.objectives.push(o);
				this.SaveValue('cmi.objectives._count',this.objectives.length);
			}
			else
			{
				this.SetError(408,"You must set cmi.objectives."+n+".id before you can set any other element of this objective.");
				return false;
			}
		}
		else
		{
			o = this.objectives[n];
		}

		switch(path[1])
		{
		case 'id':
			o.id = value;
			return true;
		case 'score':
			switch(path[2])
			{
			case '_children':
				this.SetError(404,"score._children is read-only.");
				return false;
			case 'scaled':
				if(isFloat(value) & parseFloat(value)>=-1 & parseFloat(value)<=1)
				{
					o.score.scaled = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"score.scaled should be a real number in the range (-1..1)");
					return false;
				}
			case 'raw':
				if(isFloat(value))
				{
					o.score.raw = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"score.raw should be a real number.");
					return false;
				}
			case 'min':
				if(isFloat(value))
				{
					o.score.min = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"score.min should be a real number.");
					return false;
				}
			case 'max':
				if(isFloat(value))
				{
					o.score.max = parseFloat(value);
					return true;
				}
				else
				{
					this.SetError(406,"score.max should be a real number.");
					return false;
				}
			default:
				this.SetError(401);	//undefined data model element
				return false;
			}
			break;
		case 'success_status':
			switch(value)
			{
			case 'passed':
			case 'failed':
			case 'unknown':
				o.success_status = value;
				return true;
			default:
				this.SetError(406,"Possible values for success_status: passed, failed, unknown.");
				return false;
			}
			break;
		case 'completion_status':
			switch(value)
			{
			case 'completed':
			case 'incomplete':
			case 'not attempted':
			case 'unknown':
				o.completion_status = value;
				return true;
			default:
				this.SetError(406,"Possible values for completion_status: completed,incomplete,not attempted,unknown.");
				return false;
			}
			break;
		case 'progress_measure':
			if(isFloat(value) && parseFloat(value)>=0 && parseFloat(value)<=1)
			{
				o.progress_measure = parseFloat(value);
				return true;
			}
			else
			{
				this.SetError(406,"progress_measure must be a real number in the range (0..1)");
				return false;
			}
		case 'description':
			o.description = value;
			return true;
		default:
			this.SetError(401);	//undefined data model element
			return false;
		}

	},

	Commit: function( parameter )
	{
		if(parameter !== '')
		{
			this.SetError(201,"You must pass in an empty string as a parameter to the Commit function.");
			return false;
		}

		switch(this.running_state)
		{
		case 'Not Initialized':
			this.SetError(142);	//not initialized yet
			return false;
		case 'Terminated':
			this.SetError(143);	//instance terminated
			return false;
		case 'Initialized':
			this.SaveAll();
			return true;
		}
	},

	//save all of data object model to localStorage
	SaveAll: function()
	{
		var lms = this;
		var save = function(element,value){ if(value !=undefined) {return lms.SaveValue(element,value);} };

		save('cmi.comments_from_learner._count',this.comments_from_learner.length);
		for(var i=0;i<this.comments_from_learner.length;i++)
		{
			save('cmi.comments_from_learner.'+i+'.comment',this.comments_from_learner[i].comment);
			save('cmi.comments_from_learner.'+i+'.location',this.comments_from_learner[i].location);
			save('cmi.comments_from_learner.'+i+'.timestamp',this.comments_from_learner[i].timestamp);
		}

		save('cmi.comments_from_lms._count',this.comments_from_lms.length);
		for(var i=0;i<this.comments_from_lms.length;i++)
		{
			save('cmi.comments_from_lms.'+i+'.comment',this.comments_from_lms[i].comment);
			save('cmi.comments_from_lms.'+i+'.location',this.comments_from_lms[i].location);
			save('cmi.comments_from_lms.'+i+'.timestamp',this.comments_from_lms[i].timestamp);
		}

		save('cmi.completion_status',this.completion_status);
		save('cmi.exit',this.exit);
		
		save('cmi.interactions._count',this.interactions.length);
		for(var i=0;i<this.interactions._count;i++)
		{
			var path = 'cmi.interactions.'+i+'.';
			var interaction = this.interactions[i];
			save(path+'id',interaction.id);
			save(path+'type',interaction.type);
			save(path+'objectives._count',interaction.objectives.length);
			for(var j=0;j<interaction.objectives.length;j++)
			{
				save(path+'objectives.'+j+'.id',interaction.objectives[j]);
			}
			save(path+'timestamp',interaction.timestamp);
			save(path+'correct_responses._count',interaction.correct_responses.length);
			for(var j=0;j<interaction.correct_responses.length;j++)
			{
				save(path+'correct_responses.'+j+'.pattern',interaction.correct_responses[j]);
			}
			save(path+'weighting',interaction.weighting);
			save(path+'learner_response',interaction.learner_response);
			save(path+'result',interaction.result);
			save(path+'latency',interaction.latency);
			save(path+'description',interaction.description);
		}

		save('cmi.learner_preference.audio_level',this.learner_preference.audio_level);
		save('cmi.learner_preference.language',this.learner_preference.language);
		save('cmi.learner_preference.delivery_speed',this.learner_preference.delivery_speed);
		save('cmi.learner_preference.audio_captioning',this.learner_preference.audio_captioning);
		save('cmi.location',this.location);

		save('cmi.objectives._count',this.objectives.length);
		for(var i=0;i<this.objectives.length;i++)
		{
			var path = 'cmi.objectives.'+i+'.';
			var objective = this.objectives[i];
			save(path+'id',objective.id);
			save(path+'score.scaled',objective.score.scaled);
			save(path+'score.raw',objective.score.raw);
			save(path+'score.min',objective.score.min);
			save(path+'score.max',objective.score.max);
			save(path+'success_status',objective.success_status);
			save(path+'completion_status',objective.completion_status);
			save(path+'progress_measure',objective.progress_measure);
			save(path+'description',objective.description);
		}

		save('cmi.progress_measure',this.progress_measure);
		save('cmi.score.scaled',this.score.scaled);
		save('cmi.score.raw',this.score.raw);
		save('cmi.score.min',this.score.min);
		save('cmi.score.max',this.score.max);
		save('cmi.session_time',this.session_time);
		save('cmi.success_status',this.success_status);
		save('cmi.suspend_data',this.suspend_data);
	},

	LoadAll: function() 
	{
		var i,j,n,m;

		var lms = this;
		var get = function(element){return lms.LoadValue(element); };

		if(get('cmi.exit')!='suspend')
			return;

		//Numbas.debug("SCORM resuming",true);

		var ostate = this.running_state;
		this.running_state = 'Initialized';

		function load(element)
		{
			var val = lms.LoadValue(element)+'';
			if(val.length)
				lms.SetValue(element,val);
		}

		this.entry = 'resume';

		this.comments_from_learner = [];
		this.comments_from_lms = [];
		this.interactions = [];
		this.objectives = [];

		n = get('cmi.comments_from_learner._count');
		for(i=0;i<n;i++)
		{
			var path = 'cmi.comments_from_learner.'+i+'.';
			load(path+'comment');
			load(path+'location');
			load(path+'timestamp');
		}

		n = get('cmi.comments_from_lms._count');
		for(i=0;i<n;i++)
		{
			var path = 'cmi.comments_from_lms.'+i+'.';
			load(path+'comment');
			load(path+'location');
			load(path+'timestamp');
		}

		load('cmi.completion_status');
		this.exit = 'suspend';

		n = get('cmi.interactions._count');
		for(i=0;i<n;i++)
		{
			var path = 'cmi.interactions.'+i+'.';
			load(path+'id');
			load(path+'type');
			m = get(path+'objectives._count');
			for(j=0;j<m;j++)
			{
				load(path+'objectives.'+j+'.id');
			}
			load(path+'timestamp');
			m=get(path+'correct_responses._count');
			for(j=0;j<m;j++)
			{
				load(path+'correct_responses.'+j+'.pattern');
			}
			load(path+'weighting');
			load(path+'learner_response');
			load(path+'result');
			load(path+'latency');
			load(path+'description');
		}

		load('cmi.learner_preference.audio_level');
		load('cmi.learner_preference.language');
		load('cmi.learner_preference.delivery_speed');
		load('cmi.learner_preference.audio_captioning');
		load('cmi.location');

		n = get('cmi.objectives._count');
		for(i=0;i<n;i++)
		{
			var path = 'cmi.objectives.'+i+'.';
			load(path+'id');
			load(path+'score.raw');
			load(path+'score.min');
			load(path+'score.max');
			load(path+'score.scaled');
			load(path+'success_status');
			load(path+'completion_status');
			load(path+'progress_measure');
			load(path+'description');
		}

		load('cmi.progress_measure');
		load('cmi.score.raw');
		load('cmi.score.min');
		load('cmi.score.max');
		load('cmi.score.scaled');
		load('cmi.session_time');
		load('cmi.success_status');
		load('cmi.suspend_data');

		this.running_state = ostate;
	},

	GetLastError: function()
	{
		return this.last_error;
	},

	GetErrorString: function()
	{
		return this.errorcodes[this.last_error];
	},

	GetDiagnostic: function()
	{
		return this.last_diagnostic;
	}
};
PretendLMS.prototype.API =
{
	Initialize: function( parameter ) { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.Initialize( parameter ); },
	Terminate: function( parameter ) { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.Terminate( parameter ); },
	GetValue: function( element ) { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.GetValue( element ); },
	SetValue: function( element, value ) { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.SetValue( element, value ); },
	Commit: function( parameter ) { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.Commit( parameter ); },
	GetLastError: function() { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.GetLastError(); },
	GetErrorString: function( errorCode ) { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.GetErrorString( errorCode ); },
	GetDiagnostic: function( errorCode ) { Numbas.storage.lms.SetError(0); return Numbas.storage.lms.GetDiagnostic( errorCode ); }
};


var ec = PretendLMS.prototype.errorcodes;
ec[0] =		'No error';
ec[101] =	'General Exception';
ec[102] =	'General Initialization Failure';
ec[103] =	'Already Initialized';
ec[104] =	'Content Instance Terminated';
ec[111] =	'General Termination Failure';
ec[112] =	'Termination Before Initialization';
ec[113] =	'Termination After Termination';
ec[122] =	'Retrieve Data Before Initialization';
ec[123] =	'Retrieve Data After Termination';
ec[132] =	'Store Data Before Initialization';
ec[133] =	'Store Data After Termination';
ec[142] =	'Commit Before Initialization';
ec[143] =	'Commit After Termination';
ec[201] =	'General Argument Error';
ec[301] =	'General Get Failure';
ec[351] =	'General Set Failure';
ec[391] =	'General Commit Failure';
ec[401] =	'Undefined Data Model Element';
ec[402] =	'Unimplemented Data Model Element';
ec[403] =	'Data Model Element Value Not Initialized';
ec[404] =	'Data Model Element Is Read Only';
ec[405] =	'Data Model Element Is Write Only';
ec[406] =	'Data Model Element Type Mismatch';
ec[407] =	'Data Model Element Value Out Of Range';
ec[408] =	'Data Model Dependency Not Established';

function Comment()
{
}
Comment.prototype =
{
	comment: '',						//text of comment															(RW if learner, RO if LMS)
	location: '',						//location comment applies to												ditto
	timestamp: ''						//time comment last updated													ditto
};


function Interaction(lms,number)
{
	this.lms = lms;
	this.objectives = [];
	this.correct_responses = [];
	this.number = number;
}
Interaction.prototype = {
	id: '',								//unique label for interaction												(RW)
	type: 'other',					//true-false,choice,fill-in,long-fill-in,matching,performance,		(RW)
										//sequencing,likert,numeric,other
	objectives: [],
	timestamp: '',						//time when interaction first made available to learner						(RW)
	correct_responses: [],
	weighting: 1,				//weight relative to other interactions										(RW)
	learner_response: '',		//learner's response to interaction											(RW)
	result: 'neutral',					//correct,incorrect,unanticipated,neutral,[real]							(RW)
	latency: '',						//time between first availability and first response						(RW)
	description: '',					//description of interaction												(RW)

	//methods
	
	GetObjective: function( path )
	{
		if( !isInt(path[0]) )
		{
			this.lms.SetError(401,"You tried to use a non-number as an index for an interaction objective.");
			return '';
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>=this.objectives.length )
		{
			this.lms.SetError(301,"Index out of range");
			return '';
		}

		var o = this.objectives[n];
		switch(path[1])
		{
		case 'id':
			return o;
		default:
			this.lms.SetError(401);	//undefined data model element
			return '';
		}
	},

	GetCorrectResponse: function( path )
	{
		if( !isInt(path[0]) )
		{
			this.lms.SetError(401,"You tried to use a non-number as an index for an interaction correct-response.");
			return '';
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>=this.correct_responses.length )
		{
			this.lms.SetError(301,"Index out of range");
			return '';
		}

		var c = this.correct_responses[n];
		switch(path[1])
		{
		case 'pattern':
			return c;
		default:
			this.lms.SetError(401); //undefined data model element
			return '';
		}
	},

	SetObjective: function( path, value )
	{
		if( !isInt(path[0]) )
		{
			this.lms.SetError(401,"You tried to use a non-number as an index for an interaction objective.");
			return '';
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>this.objectives.length )
		{
			this.lms.SetError(351,"Index out of range");
			return '';
		}

		if(path[1]!='id')
		{
			this.lms.SetError(401);	//undefined data model element
			return false;
		}

		//check id is unique
		for(var i=0;i<this.objectives.length;i++)
		{
			if( i!=n && this.objectives[i]==value )
			{
				this.lms.SetError(351,"Objective ids must be unique within the interaction. Objective no. "+i+" has the same id as the one you were trying to set.");
				return false;
			}
		}

		if(n==this.objectives.length)
		{
			this.objectives.push(value);
			this.lms.SaveValue('cmi.interactions.'+this.number+'.objectives._count',this.objectives.length);
			return true;
		}
		else
		{
			this.objectives[n]=value;
			return true;
		}
	},

	ValidResponse: function( value,isPattern )
	{
		switch(this.type)
		{
		case 'true-false':
			switch(value)
			{
			case 'true':
			case 'false':
				return true;
			default:
				this.lms.SetError(406,"Possible answer patterns for true-false type are: true, false.");
				return false;
			}
			break;

		case 'choice':
			var bits = value.split('[,]');
			for(var i=0;i<bits.length;i++)
			{
				if( bits[i]=='')
				{
					this.lms.SetError(406,"Empty strings are not valid as multiple choice responses");
					return false;
				}
			}
			return true;

		case 'fill-in':
		case 'long-fill-in':
			if(!isPattern)
				return true;

			var fill_in_re = /^\{case_matters=(true|false)\}\{order_matters=(true|false)\}(.*)$/
			if(!fill_in_re.test(value))
			{
				this.lms.SetError(406,"fill-in answers must be in the format: {case_matters=<true|false>}{order_matters=<true|false>}answer[,]answer[,]....");
				return false;
			}
			else
			{
				return true;
			}

		case 'likert':
			return true;

		case 'matching':
			var matching_re = /^.+?\[\.\].+$/;
			var matches = value.split('[,]');
			for(var i=0;i<matches.length;i++)
			{
				if(!matching_re.test(matches[i]))
				{
					this.lms.SetError(406,"matching type response patterns must be in the format: source1[.]target1[,]source2[.]target2[,]....");
					return false;
				}
			}

			return true;

		case 'performance':
			var performance_re = /^(?:{order_matters=(true|false)})?(.*)$/;

			if(isPattern && !performance_re.test(value))
			{
				this.lms.SetError(406,"performance type response patterns must be in the format: {order_matters=<true|false>}step1name[.]step1answer[,]step2name[.]step2answer[,]....");
				return false;
			}

			var actions = value.match(performance_re)[2].split('[,]');
			var action_re = /^(.*?)\[\.\](.*?)$/;
			for(var i=0;i<actions.length;i++)
			{
				if(!action_re.test(actions[i]))
				{
					this.lms.SetError(406,"performance type response patterns must be in the format: {order_matters=<true|false>}step1name[.]step1answer[,]step2name[.]step2answer[,]....");
					return false;
				}
			}

			return true;

		case 'sequencing':
			if(value=='')
			{
				this.lms.SetError(406,"Empty string passed as response pattern for sequencing interaction.");
				return false;
			}
			var parts = value.split('[,]');
			for(var i=0;i<parts.length;i++)
			{
				if(parts[i]=='')
				{
					this.lms.SetError(406,"Empty strings are not valid choices in a sequence interaction.");
					return false;
				}
			}

			return true;

		case 'numeric':
			var numeric_re = /^(-?\d+(?:\.\d+)?)?(:(-?\d+(?:\.\d+)?)?)?$/;

			if(!numeric_re.test(value))
			{
				this.lms.SetError(406,"Numeric response patterns must be in the format <min>:<max>");
				return false;
			}
			else
			{
				return true
			}

		case 'other':
			return true;
		}
	},

	SetCorrectResponse: function( path, value )
	{
		if( !isInt(path[0]) )
		{
			this.lms.SetError(401,"You tried to use a non-number as an index for an interaction correct-response.");
			return false;
		}

		var n = parseInt(path[0],10);
				
		if( n<0 || n>this.correct_responses.length )
		{
			this.lms.SetError(351,"Index out of range");
			return false;
		}

		if(path[1]!='pattern')
		{
			this.lms.SetError(401,"You probably meant to set correct_responses."+n+".pattern");
			return false;
		}

		if(this.type===undefined)
		{
			this.lms.SetError(408,"You must set this interaction's type before setting a correct response.");
			return false;
		}

		switch(this.type)
		{
		case 'likert':
			if(n>0)
			{
				this.lms.SetError(351,"There can only be one correct response to a likert type interaction.");
				return false;
			}
			break;
		case 'sequencing':
			//check uniqueness of response
			for(var i=0;i<this.correct_responses.length;i++)
			{
				if(i!=n && this.correct_responses[i]==value)
				{
					this.lms.SetError(351,"Response patterns must be unique. Response "+i+" is the same as the one you are trying to set.");
					return false;
				}
			}
			break;
		case 'numeric':
			if(n>0)
			{
				this.lms.SetError(351,"There can only be one correct response pattern for a numeric type interaction.");
				return false;
			}
			break;
		}

		if( this.ValidResponse(value,true) )
		{
			this.correct_responses[n] = value;
			return true;
		}
		else
		{
			return false;
		}

	}
};

function Objective()
{
}
Objective.prototype = {
	id: '',								//unique label for objective												(RW)
	score: {
		scaled: 0,						//scaled score for objective, range(-1..1)									(RW)
		raw: 0,							//raw score for objective													(RW)
		min: 0,							//minimum possible score for objective										(RW)
		max: 0							//maximum possible score for objective										(RW)
	},
	success_status: 'unknown',		//passed,failed,unknown														(RW)
	completion_status: 'unknown',	//completed,incomplete,not attempted,unknown								(RW)
	progress_measure: 0,			//measure of progress towards completing, range(0..1)						(RW)
	description: ''					//Brief description of objective											(RW)
};



function isTimestamp(t)
{
	//format YYYY-[MM-[DD[Thh[:mm[:ss[.s[TZD]]]]]]]
	//where TZD is 'Z' for UTC, or +hh:mm or -hh:mm
	//.s is any number of digits representing a fraction of a second
	var re = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d\d?)(?:(Z)|(\+|\-)(\d{2}):(\d{2}))?)?)?)?)?)?)?$/;

	if(!re.test(t))
		return false;

	var res = t.match(re);
	var year = parseInt(res[1,10]);
	var month = parseInt(res[2],10);
	var day = parseInt(res[3],10);
	var hour = parseInt(res[4],10);
	var minute = parseInt(res[5],10);
	var second = parseInt(res[6],10);
	var milliseconds = parseInt(res[7],10)*10;
	var timezone = res[8];

	if( year<1970 || month<1 || month>12 || day<1 || day>31 || hour<0 || hour>23 || minute<0 || minute>59 || second<0 || second>59)
		return false;

	if(timezone!='Z' && timezone!==undefined)
	{
		var plusminus = res[9];
		var addhour = parseInt(res[10],10);
		var addminute = parseInt(res[11],10);
		if(!(plusminus=='+' || plusminus=='-') || addhour<0 || addhour > 23 || addminute < 0 || addminute > 59 )
			return false;
	}

	return true;
}

function timestampToDate(t)
{
	var re = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d\d?)(?:(Z)|(\+|\-)(\d{2}):(\d{2}))?)?)?)?)?)?)?$/;
	
	var res = t.match(re);
	var year = parseInt(res[1],10);
	var month = parseInt(res[2],10) || 1;
	var day = parseInt(res[3],10) || 1;
	var hour = parseInt(res[4],10) || 0;
	var minute = parseInt(res[5],10) || 0;
	var second = parseInt(res[6],10) || 0;
	var milliseconds = parseInt(res[7],10)*10 || 0;

	var timezone = res[8];
	
	var plusminus = res[9];
	switch(plusminus)
	{
	case '+':
		plusminus=1;
		break;
	case '-':
		plusminus=-1;
		break;
	default:
		plusminus=0;
	}
	var addhour = parseInt(res[10],10) || 0;
	var addminute = parseInt(res[11],10) || 0;

	hour += addhour*plusminus;
	minute += addminute*plusminus;

	var date = new Date(year,month-1,day,hour,minute,second+milliseconds/1000);
	return date;
}

function dateToTimestamp(d)
{
	var year = d.getFullYear().toString();
	var month = lpad(d.getMonth()+1,2,'0');
	var day = lpad(d.getDate(),2,'0');
	var hour = lpad(d.getHours(),2,'0');
	var minute = lpad(d.getMinutes(),2,'0');
	var second = lpad(d.getSeconds(),2,'0');
	var milliseconds = lpad(Math.round(d.getMilliseconds()/10),2,'0');

	return year+'-'+month+'-'+day+'T'+hour+':'+minute+':'+second+'.'+milliseconds+'Z';
}

function isTimeInterval(t)
{
	var re = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
	return re.test(t);
}

//converts a number of seconds into a string
//PyYmMdDThHmMsS
function formatTimeInterval(d)
{
	var ms = d % 1000; d=(d-ms)/1000;
	var seconds = d % 60; d=(d-seconds)/60;
	var minutes = d % 60; d=(d-minutes)/60;
	var hours = d % 24; d=(d-hours)/24;
	var days = d % 31; d=(d-days)/31;
	var months = d % 12; 
	var years=(d-months)/12;

	seconds += ms/1000;

	return 	'P'+
			(years>0 ? years+'Y' : '') +
			(months>0 ? months+'M' : '') +
			(days>0 ? days+'D' : '') +
			(hours+minutes+seconds>0 ? ('T'+
				(hours>0 ? hours+'H' : '') +
				(minutes>0 ? minutes+'M' : '') +
				(seconds>0 ? seconds+'S' : '')
			):'');
}

//converts a time-interval type into a number of seconds
function timeIntervalToSeconds(i)
{
	var re = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

	var res = i.match(re);
	var t = (parseInt(res[1],10) || 0);	//years
	t = t*12+(parseInt(res[2],10) || 0);	//months
	t = t*31+(parseInt(res[3],10) || 0);	//days
	t = t*24+(parseInt(res[4],10) || 0);	//hours
	t = t*60+(parseInt(res[5],10) || 0);	//minutes
	t = t*60000+(parseInt(res[6],10)*1000 || 0);	//seconds

	return t;

}

function isLanguageCode(l)
{
	var re = /^[a-z][a-z](-[A-Z][A-Z])?$/;
	return re.test(l);
}

});
