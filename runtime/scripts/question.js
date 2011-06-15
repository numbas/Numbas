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


Numbas.queueScript('scripts/question.js',['display','jme','jme-mathml','xml','util','scorm-storage'],function() {

var util = Numbas.util;
var jme = Numbas.jme;

var job = Numbas.schedule.add;

var tryGetAttribute = Numbas.xml.tryGetAttribute;

var Question = Numbas.Question = function( xml, number, loading )
{
	var q = this;
	q.xml = xml;
	q.originalXML = q.xml;
	q.number = number;

	this.makeVariables(loading);

	this.subvars();

	job(function()
	{
		q.followVariables = {};

		//load parts
		q.parts=new Array();
		q.partDictionary = {};
		var parts = q.xml.selectNodes('parts/part');
		for(var j = 0; j<parts.length; j++)
		{
			var part = createPart(parts[j], 'p'+j,q,null, loading);
			q.parts[j] = part;
			q.marks += part.marks;
		}
		
		//initialise display - get question HTML, make menu item, etc.
		q.display = new Numbas.display.QuestionDisplay(q);
	});

}
Question.prototype = 
{
	xml: '',
	number: -1,
	name: '',
	
	marks: 0,				//max. marks available for this question
	score: 0,				//student's score on this question
	adviceThreshold: 0,		//percentage score below which the advice is revealed.

	visited: false,			//has this question been seen by the student? For determining if you can jump back to this question, when navigateBrowse is disabled
	answered: false,		//has question been answered satisfactorily?
	submitted: 0,			//number of times question submitted
	adviceDisplayed: false,	//has question advice been displayed?
	revealed: false,		//has correct answer been revealed?

	parts: [],				//array containing all key parts
	partDictionary: {},		//dictionary mapping part addresses to objects

	display: undefined,		//display code

	makeVariables: function(loading)
	{
		var q = this;
		var myfunctions = q.functions = {};
		var tmpFunctions = [];
		job(function()
		{
			//get question's name
			tryGetAttribute(q,'.','name');

			if(loading)
				var qobj = Numbas.store.loadQuestion(q);

			q.adviceThreshold = Numbas.exam.adviceGlobalThreshold;

			//work out functions
			var functionNodes = q.xml.selectNodes('functions/function');

			//first pass: get function names and types
			for(var i=0; i<functionNodes.length; i++)
			{
				var name = functionNodes[i].getAttribute('name').toLowerCase();

				var definition = functionNodes[i].getAttribute('definition');

				var outtype = functionNodes[i].getAttribute('outtype').toLowerCase();
				var outcons = Numbas.jme.types[outtype];

				var parameterNodes = functionNodes[i].selectNodes('parameters/parameter');
				var paramNames = [];
				var intype = [];
				for(var j=0; j<parameterNodes.length; j++)
				{
					var paramName = parameterNodes[j].getAttribute('name');
					var paramType = parameterNodes[j].getAttribute('type').toLowerCase();
					paramNames.push(paramName);
					var incons = Numbas.jme.types[paramType];
					intype.push(incons);
				}

				var tmpfunc = new jme.funcObj(name,intype,outcons,null,true);
				tmpfunc.definition = definition;
				tmpfunc.paramNames = paramNames;

				if(q.functions[name]===undefined)
					q.functions[name] = [];
				q.functions[name].push(tmpfunc);
				tmpFunctions.push(tmpfunc);
			}
		});

		job(function()
		{
			//second pass: compile functions
			for(var i=0; i<tmpFunctions.length; i++)
			{
				tmpFunctions[i].tree = jme.compile(tmpFunctions[i].definition,q.functions);

				tmpFunctions[i].evaluate = function(args,variables,functions)
				{
					nvariables = Numbas.util.copyobj(variables);

					for(var j=0;j<args.length;j++)
					{
						nvariables[this.paramNames[j]] = jme.evaluate(args[j],variables,functions);
					}
					return jme.evaluate(this.tree,nvariables,functions);
				}
			}
		});

		job(function()
		{
			//evaluate question variables
			q.variables = {};
			if(loading)
			{
				for(var x in qobj.variables)
				{
					q.variables[x] = qobj.variables[x];
				}
			}
			else
			{
				var variableNodes = q.xml.selectNodes('variables/variable');	//get variable definitions out of XML

				//list of variable names to ignore because they don't make sense
				var ignoreVariables = ['pi','e','date','year','month','monthname','day','dayofweek','dayofweekname','hour24','hour','minute','second','msecond','firstcdrom'];

				//evaluate variables - work out dependency structure, then evaluate from definitions in correct order
				var todo = {};
				for( var i=0; i<variableNodes.length; i++ )
				{
					var name = variableNodes[i].getAttribute('name').toLowerCase();
					if(!ignoreVariables.contains(name))
					{
						var value = variableNodes[i].getAttribute('value');

						var vars = [];
						//get vars referred to in string definitions like "hi {name}"
						/*
						var stringvars = value.split(/{(\w+)}/g);
						for(var j=1;j<stringvars.length;j+=2)
						{
							if(!vars.contains(stringvars[j]))
								vars.push(stringvars[j].toLowerCase());
						}
						*/

						var tree = jme.compile(value,q.functions);
						vars = vars.merge(jme.findvars(tree));
						todo[name]={
							tree: tree,
							vars: vars
						};
					}
				}
				function compute(name,todo,variables,path)
				{
					if(variables[name]!==undefined)
						return;

					if(path===undefined)
						path=[];


					if(path.contains(name))
					{
						alert("Circular variable reference in question "+name+' '+path);
						return;
					}

					var v = todo[name];

					if(v===undefined)
						throw(new Error("Variable "+name+" not defined."));

					//work out dependencies
					for(var i=0;i<v.vars.length;i++)
					{
						var x=v.vars[i];
						if(variables[x]===undefined)
						{
							var newpath = path.slice(0);
							newpath.splice(0,0,name);
							compute(x,todo,variables,newpath);
						}
					}

					variables[name] = jme.evaluate(v.tree,variables,myfunctions);
				}
				for(var x in todo)
				{
					compute(x,todo,q.variables);
				}
			}

		});
	},

	subvars: function()
	{
		var q = this;
		var doc = Sarissa.getDomDocument();
		doc.appendChild($(q.originalXML).clone()[0]);	//get a fresh copy of the original XML, to sub variables into
		q.xml = doc.selectSingleNode('question');

		job(function()
		{
			//convert mathml to string expressions
			var mathsNodes = q.xml.selectNodes('descendant::math');
			for( i=0; i<mathsNodes.length; i++ )
			{
				if(mathsNodes[i].selectNodes('*').length)
				{
					var text = jme.MathMLToJME(mathsNodes[i]);
				}
				else
				{
					var text = Numbas.xml.getTextContent(mathsNodes[i]);
				}
				for( var j=mathsNodes[i].childNodes.length-1; j>=0; j-- )
				{
					mathsNodes[i].removeChild( mathsNodes[i].childNodes[j] );
				}
				var stext = jme.subvars( text, q.variables, q.functions );
				mathsNodes[i].appendChild( Numbas.xml.examXML.createTextNode(stext) );
			}

			//substitute variables into content nodes
			var serializer = new XMLSerializer();
			var parser = new DOMParser();
			var contents = q.xml.selectNodes('descendant::content');

			//filter to get non-whitespace text nodes 
			function tnf(){ return ((this.nodeType == Node.TEXT_NODE) && !(/^\s*$/.test(this.nodeValue))); }

			//do contentsubvars on all content
			for(var i=0;i<contents.length;i++)
			{
				//get all non-whitespace text nodes
				var textNodes = $(contents[i]).filter(tnf).add($(contents[i]).find('*').contents().filter(tnf));

				//filter out script nodes
				textNodes = textNodes.filter(function(){return !$(this).parent().attr('language')});

				//run contentsubvars on the collection of text nodes
				textNodes.each(function(){
						var old = this.nodeValue;
						//this.nodeValue = jme.contentsubvars(this.nodeValue, q.variables, q.functions);
						var newtext = jme.contentsubvars(this.nodeValue, q.variables, q.functions);
						newtext = util.escapeHTML(newtext);
						if(newtext!=old)
						{
							//parse new content
							var newNode = parser.parseFromString('<tempContent>'+newtext+'</tempContent>','text/xml');
							if(Sarissa.getParseErrorText(newNode) != Sarissa.PARSED_OK)
							{
								throw(new Error("Error substituting content: \n"+Sarissa.getParseErrorText(newNode)+'\n\n'+newtext));
							}

							//copy new content to same place as original text
							var p = this.parentNode;
							Sarissa.copyChildNodes(newNode,p,true);
							var t = this;

							//move all the new content next to original text
							$(p).find('tempContent').contents().each(function(){
								p.insertBefore(this,t);
							});

							//remove tempContent tag and original text
							$(p).find('tempContent').remove();
							$(this).remove();
						}
				});
			}


		});

		job(function() {
			//turn content maths into LaTeX
			mathsNodes = q.xml.selectNodes('descendant::content/descendant::math');
			for( i=0; i<mathsNodes.length; i++ )
			{
				var expr = Numbas.xml.getTextContent(mathsNodes[i]);
				var settingsString = mathsNodes[i].getAttribute('simplificationsettings') || '111111111111111';
				var simplificationSettings = jme.display.parseSimplificationSettings( settingsString );
				var tex = jme.display.exprToLaTeX(expr, simplificationSettings);
				Numbas.xml.setTextContent( mathsNodes[i], tex );
			}
		});
	},

	//get the part object corresponding to a path
	getPart: function(path)
	{
		return this.partDictionary[path];
	},

	//trigger advice
	getAdvice: function()
	{
		this.adviceDisplayed = true;
		this.display.showAdvice(true);
		Numbas.store.adviceDisplayed(this);
	},

	//reveal correct answer to student
	revealAnswer: function()
	{
		this.revealed = true;
		this.answered = true;
		
		//display advice if allowed
		this.getAdvice();

		//part-specific reveal code. Might want to do some logging in future? 
		for(var i=0; i<this.parts.length; i++)
			this.parts[i].revealAnswer();

		//display revealed answers
		this.display.revealAnswer();

		this.score = 0;

		this.display.showScore();

		Numbas.store.answerRevealed(this);

		Numbas.exam.updateScore();
	},

	//validate question - returns true if all parts completed
	validate: function()
	{
		var success = true;
		for(i=0; i<this.parts.length; i++)
		{
			success = success && this.parts[i].answered;
		}
		return success;
	},

	//mark the student's answer to a given part/gap/step
	doPart: function(answerList, partRef)
	{
		var part = this.getPart(partRef);
		if(!part)
			throw(new Error("Can't find part "+partRef+"/"));
		part.storeAnswer(answerList);
	},

	//calculate score - adds up all part scores
	calculateScore: function(uiWarning)
	{
		if(this.revealed)
		{
			this.score = 0;
			return 0;
		}

		var tmpScore=0;
		for(var i=0; i<this.parts.length; i++)
		{
			tmpScore += this.parts[i].score;
		}
		
		if( uiWarning!="uwPrevent" )
		{
			this.score = tmpScore;
		}
		else 
		{
			this.score = 0;
		}
	},


	//submit question answers
	submit: function()
	{
		//submit every part
		for(var i=0; i<this.parts.length; i++)
		{
			this.parts[i].submit();
		}

		//validate every part
		//displays warning messages if appropriate, 
		//and returns false if any part is not completed sufficiently
		this.answered = this.validate();

		//keep track of how many times question successfully submitted
		if(this.answered)
			this.submitted += 1;

		//display message about success or failure
		if(! this.answered )
		{
			Numbas.display.showAlert("Can not submit answer - check for errors.");
			this.display.scrollToError();
		}

							
		this.updateScore();

		if(Numbas.exam.adviceType == 'threshold' && 100*this.score/this.marks < this.adviceThreshold )
		{
			this.getAdvice();
		}
	},

	//recalculate score, display, notify storage
	updateScore: function()
	{
		//calculate score - if warning is uiPrevent then score is 0
		this.calculateScore('uwNone');

		//update total exam score
		Numbas.exam.updateScore();

		//display score - ticks and crosses etc.
		this.display.showScore();

		//notify storage
		Numbas.store.submitQuestion(this);
	}

};



function createPart(xml, path, question, parentPart, loading)
{
	var type = tryGetAttribute(null,'.','type',[],{xml: xml});
	if(type==null)
		throw(new Error("Missing part type attribute"));
	if(partConstructors[type])
	{
		var cons = partConstructors[type];
		var part = new cons(xml, path, question, parentPart, loading);
		return part;
	}
	else
	{
		throw(new Error("Unrecognised part type "+type));
	}
}

//base Question Part object
function Part( xml, path, question, parentPart, loading )
{
	//remember XML
	this.xml = xml;

	//remember parent question object
	this.question = question;

	//remember parent part object, so scores can percolate up for steps/gaps
	this.parentPart = parentPart;
	
	//remember a path for this part, for stuff like marking and warnings
	this.path = path;
	this.question.partDictionary[path] = this;

	//initialise settings object
	this.settings = util.copyobj(Part.prototype.settings);
	
	tryGetAttribute(this,'.',['type','marks']);

	tryGetAttribute(this.settings,'.',['minimumMarks','enableMinimumMarks','stepsPenalty'],[],{xml: this.xml});

	//initialise gap and step arrays
	this.gaps = [];
	this.steps = [];

	//load steps
	var stepNodes = xml.selectNodes('steps/part');
	for(var i=0; i<stepNodes.length; i++)
	{
		var step = createPart( stepNodes[i], this.path+'s'+i,this.question, this, loading);
		this.steps[i] = step;
		this.stepsMarks += step.marks;
	}
	this.marks += this.stepsMarks;

	//initialise display code
	this.display = new Numbas.display.PartDisplay(this);
}

Part.prototype = {
	xml: '',				//XML defining this part
	question: undefined,	//reference to parent question object
	parentPart: undefined,	//reference to 'parent' part object - GapFillPart if this is a gap, the main keypart if this is a step
	path: '',				//a question-wide unique 'address' for this part 
	type: '',				//this part's type
	marks: 0,				//max. marks available for this part
	stepsMarks: 0,			//marks available in the steps, if any
	credit: 0,				//proportion of availabe marks awarded to student
	score: 0,				//student's score on this part
	stagedAnswer: undefined,	//student's answers as visible on screen (not yet submitted)
	answerList: undefined,	//student's last submitted answer
	answered: false,		//has this part been answered

	gaps: [],				//child gapfills, if any
	steps: [],				//child steps, if any
	stepsShown: false,		//have steps for this part been shown?

	settings: 
	{
		stepsPenalty: 0,		//number of marks to deduct when steps shown
		enableMinimumMarks: false,
		minimumMarks: 0		//minimum marks to award
	},			//store part's settings in here

	display: undefined,		//code to do with displaying this part

	//give the student a warning about this part
	//might want to do some logging at some point,
	//so this is a method of the part object, which
	//then calls the display code
	giveWarning: function(warning)
	{
		warning = warning.replace('\n\n','\n<br/>\n');
		this.display.warning(warning);
	},

	//calculate student's score for given answer.
	calculateScore: function(answerList)
	{
		if(this.steps.length && this.stepsShown)
		{
			this.score = (this.marks - this.stepsMarks) * this.credit; 	//score for main keypart

			for(var i=0; i<this.steps.length; i++)
			{
				this.score += this.steps[i].score;
			}
			this.score -= this.settings.stepsPenalty;

			if(this.settings.enableMinimumMarks && this.score < this.settings.minimumMarks)
			{
				this.score = this.settings.minimumMarks;
			}
		}
		else
		{
			this.score = this.credit * this.marks;
		}

		if(this.parentPart)
			this.parentPart.calculateScore();
	},

	//update the stored answer from the student (called when student changes their answer, before submitting)
	storeAnswer: function(answerList) {
		this.stagedAnswer = answerList;
		this.display.removeWarnings();
	},

	//submit answer to this part - save answer, mark, update score
	submit: function() {
		this.display.removeWarnings();
		if(this.stagedAnswer==undefined || this.stagedAnswer=='')
		{
			this.giveWarning("No answer submitted.");
			this.credit = 0;
			this.answered = false;
		}
		else
		{
			this.answerList = util.copyarray(this.stagedAnswer);
			this.mark();
			this.answered = this.validate();
		}
		if(this.answered)
			this.reportStudentAnswer(this.studentAnswer);
		else
			this.reportStudentAnswer('');


		this.calculateScore();
		this.question.updateScore();
		this.display.showScore(this.answered);
	},

	//save the student's answer as a question variable
	//so it can be used for carry-over marking
	reportStudentAnswer: function(answer) {
		var val;
		if(util.isFloat(answer))
			val = new Numbas.jme.types.TNum(answer);
		else
			val = new Numbas.jme.types.TString(answer);
		this.question.followVariables['$'+this.path] = val;
	},

	//function which marks the student's answer
	mark: function() {},

	//is student's answer acceptable?
	validate: function() { return true; },

	//reveal the steps
	showSteps: function()
	{
		this.stepsShown = true;
		this.calculateScore();
		this.display.showSteps();
		this.question.updateScore();
	},

	//reveal the correct answer
	revealAnswer: function()
	{
		this.display.revealAnswer();
		this.answered = true;
		this.credit = 0;
	}

};

//simplification settings to use for correct answers - turn off collectNumbers, simplifyFractions and trig simplifications
var answerSimplification = jme.display.parseSimplificationSettings('111111101111101');

//Judged Mathematical Expression
//student enters a string representing a mathematical expression, eg.
//		'x^2+x+1'
//and it is compared with the correct answer by evaluating over a range of values
function JMEPart(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(JMEPart.prototype.settings,settings);

	//parse correct answer from XML
	answerMathML = this.xml.selectSingleNode('answer/correctanswer');
	if(!answerMathML)
		throw(new Error("Correct answer for a JME part is missing ("+this.path+")"));

	tryGetAttribute(settings,'answer/correctanswer','simplification','answerSimplification',{xml: this.xml});

	settings.answerSimplification = jme.display.parseSimplificationSettings(settings.answerSimplification);

	settings.correctAnswer = jme.display.simplifyExpression(
		Numbas.xml.getTextContent(answerMathML).trim(),
		settings.answerSimplification
	);
	
	//get checking type, accuracy, checking range
	var parametersPath = 'answer';
	tryGetAttribute(settings,parametersPath+'/checking',['type','accuracy','failurerate'],['checkingType','checkingAccuracy','failureRate'],{xml: this.xml});

	tryGetAttribute(settings,parametersPath+'/checking/range',['start','end','points'],['vsetRangeStart','vsetRangeEnd','vsetRangePoints'],{xml: this.xml});


	//max length and min length
	tryGetAttribute(settings,parametersPath+'/maxlength',['length','partialcredit'],['maxLength','maxLengthPC'],{xml: this.xml});
	tryGetAttribute(settings,parametersPath+'/minlength',['length','partialcredit'],['minLength','minLengthPC'],{xml: this.xml});

	//get list of 'must have' strings
	var mustHaveNode = this.xml.selectSingleNode('answer/musthave');
	settings.mustHave = [];
	if(mustHaveNode)
	{
		var mustHaves = mustHaveNode.selectNodes('string');
		for(var i=0; i<mustHaves.length; i++)
		{
			settings.mustHave.push(Numbas.xml.getTextContent(mustHaves[i]));
		}
		//partial credit for failing must-have test and whether to show strings which must be present to student when warning message displayed
		tryGetAttribute(settings,mustHaveNode,['partialcredit','showstrings'],['mustHavePC','mustHaveShowStrings']);
		//warning message to display when a must-have is missing
		var messageNode = mustHaveNode.selectSingleNode('message');
		if(messageNode)
			settings.mustHaveMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
	}

	//get list of 'not allowed' strings
	var notAllowedNode = this.xml.selectSingleNode('answer/notallowed');
	settings.notAllowed = [];
	if(notAllowedNode)
	{
		var notAlloweds = notAllowedNode.selectNodes('string');
		for(i=0; i<notAlloweds.length; i++)
		{
			settings.notAllowed.push(Numbas.xml.getTextContent(notAlloweds[i]));
		}
		//partial credit for failing not-allowed test
		tryGetAttribute(settings,notAllowedNode,['partialcredit','showstrings'],['notAllowedPC','notAllowedShowStrings']);
		var messageNode = notAllowedNode.selectSingleNode('message');
		if(messageNode)
			settings.notAllowedMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
	}

	this.display = new Numbas.display.JMEPartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadPart(this);
		this.studentAnswer = pobj.studentAnswer;
	}
}

JMEPart.prototype = 
{
	studentAnswer: '',

	settings: 
	{
		//string representing correct answer to question
		correctAnswer: '',
		answerSimplification: '1111111011111011',
		
		//	checking type : SigFig (round answers to x sig figs)
		//					RelDiff (compare ratio of student answer to correct answer)
		//					AbsDiff (compare absolute difference between answers)
		//					Dp (round answers to x decimal places)
		checkingType: 'RelDiff',

		checkingAccuracy: 0,	//accuracy for checking - depends on checking type
		failureRate: 0,			//comparison failures allowed before we decide answers are different

		vsetRangeStart: 0,		//range to pick variable values from
		vsetRangeEnd: 1,
		vsetRangePoints: 1,		//number of points to compare answers on
		
		maxLength: 0,		//max length of student's answer
		maxLengthPC: 0,		//partial credit if student's answer too long

		minLength: 0,		//min length of student's answer
		minLengthPC: 0,		//partial credit if student's answer too short

		mustHave: [],				//strings which must be present in student's answer
		mustHavePC: 0,				//partial credit if a must-have is missing
		mustHaveMessage: '',		//warning message if missing a must-have
		mustHaveShowStrings: false,	//tell students which strings must be included?

		notAllowed: [],				//strings which must not be present in student's answer
		notAllowedPC: 0,			//partial credit if a not-allowed string is present
		notAllowedMessage: '',		//warning message if not-allowed string present
		notAllowedShowStrings: false//tell students which strings are not allowed?
	},

	mark: function()
	{
		if(this.answerList==undefined)
		{
			this.credit = 0;
			return false;
		}
		this.studentAnswer = this.answerList[0];
		this.failMinLength = (this.settings.minLength>0 && this.studentAnswer.length<this.settings.minLength);
		this.failMaxLength = (this.settings.maxLength>0 && this.studentAnswer.length>this.settings.maxLength);

		//did student actually write anything?
		this.answered = this.studentAnswer.length > 0;
		
		//do comparison of student's answer with correct answer
		if(!jme.compare(this.studentAnswer, this.settings.correctAnswer, this.settings, this.question.followVariables))
		{
			this.credit = 0;
			return;
		}

		//see if student answer contains any forbidden strings
		this.failNotAllowed = false;
		for( i=0; i<this.settings.notAllowed.length; i++ )
		{
			if(this.studentAnswer.contains(this.settings.notAllowed[i])) { this.failNotAllowed = true; }
		}
		
		this.failMustHave = false;
		if(!this.failNotAllowed)
		{
			//see if student answer contains all the required strings
			for( i=0; i<this.settings.mustHave.length; i++ )
			{
				if(!this.studentAnswer.contains(this.settings.mustHave[i])) { this.failMustHave = true; }
			}
		}

		//calculate how many marks will be given for a correct answer
		//(can be modified if answer wrong length or fails string restrictions)
		this.credit = 1;

		if(this.failMinLength)
		{
			this.credit *= this.settings.minLengthPC;
		}
		if(this.failMaxLength)
		{
			this.credit *= this.settings.maxLengthPC;
		}

		if(this.failMustHave)
		{
			this.credit *= this.settings.mustHavePC;
		}

		if(this.failNotAllowed)
		{
			this.credit *= this.settings.notAllowedPC;
		}

	},

	validate: function()
	{
		if(this.studentAnswer.length===0)
		{
			this.giveWarning("No answer submitted.");
			return false;
		}

		try{
			var tree = jme.compile(this.studentAnswer);
			var varnames = jme.findvars(tree);
			var vars = {}
			for(i=0;i<varnames.length;i++)
			{
				vars[varnames[i]]=jme.types.TNum(0);
			}
			jme.evaluate(tree,vars,this.question.functions);
		}
		catch(e)
		{
			this.giveWarning("This is not a valid mathematical expression.\n\n"+e.message);
			return false;
		}

		if( this.failMinLength)
		{
			this.giveWarning("Your answer is too short.");
		}

		if( this.failMaxLength )
		{
			this.giveWarning("Your answer is too long.");
		}

		if( this.failMustHave )
		{
			this.giveWarning(this.settings.mustHaveMessage);
			if(this.settings.mustHaveShowStrings)
			{
				this.giveWarning('Your answer must contain all of: "'+this.settings.mustHave.join('", "')+'"');
			}
		}

		if( this.failNotAllowed )
		{
			this.giveWarning(this.settings.notAllowedMessage);
			if(this.settings.notAllowedShowStrings)
			{
				this.giveWarning('Your answer must not contain any of: "'+this.settings.notAllowed.join('", "')+'"');
			}
		}

		return true;
	}
};


function PatternMatchPart(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(PatternMatchPart.prototype.settings,settings);

	settings.correctAnswer = Numbas.xml.getTextContent(this.xml.selectSingleNode('answer/correctanswer'));
	settings.correctAnswer = jme.subvars(settings.correctAnswer, question.variables);

	var displayAnswerNode = this.xml.selectSingleNode('answer/displayanswer');
	if(!displayAnswerNode)
		throw(new Error("Display answer is missing from a Pattern Match part ("+this.path+")"));
	settings.displayAnswer = $.trim(Numbas.xml.getTextContent(displayAnswerNode));

	tryGetAttribute(settings,'answer/case',['sensitive','partialCredit'],'caseSensitive',{xml: this.xml});

	this.display = new Numbas.display.PatternMatchPartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadPart(this);
		this.studentAnswer = pobj.studentAnswer;
	}
}
PatternMatchPart.prototype = {
	studentAnswer: '',

	settings: 
	{
		correctAnswer: /.*/,
		displayAnswer: '',
		caseSensitive: false,
		partialCredit: 0
	},

	mark: function ()
	{
		if(this.answerList==undefined)
		{
			this.credit = 0;
			return false;
		}
		this.studentAnswer = this.answerList[0];
		this.answered = this.studentAnswer.length>0;

		var caseInsensitiveAnswer = new RegExp( this.settings.correctAnswer, 'i' );			
		var caseSensitiveAnswer = new RegExp( this.settings.correctAnswer );
		
		if( this.settings.caseSensitive )
		{
			if( caseSensitiveAnswer.test(this.studentAnswer) )
			{
				this.credit = 1;
			}
			else if(caseInsensitiveAnswer.test(this.studentAnswer))
			{
				this.credit = this.settings.partialCredit;
			}
			else
			{
				this.credit = 0;
			}
		}else{
			if(caseInsensitiveAnswer.test(this.studentAnswer))
			{
				this.credit = 1;
			}
			else
			{
				this.credit = 0;
			}
		}
	},

	validate: function()
	{
		if(!this.answered)
			this.giveWarning("No answer submitted.");

		return this.answered;
	}
};

function NumberEntryPart(xml, path, question, parentPart, loading)
{
	var evaluate = jme.evaluate, compile = jme.compile;
	var settings = this.settings;
	util.copyinto(NumberEntryPart.prototype.settings,settings);

	tryGetAttribute(settings,'answer',['minvalue','maxvalue'],['minvalue','maxvalue'],{xml: this.xml, string:true});
	tryGetAttribute(settings,'answer','inputstep','inputStep',{xml:this.xml});
	settings.minvalue = jme.subvars(settings.minvalue,this.question.variables,this.question.functions);
	settings.maxvalue = jme.subvars(settings.maxvalue,this.question.variables,this.question.functions);
	settings.minvalue = evaluate(compile(settings.minvalue),this.question.variables,this.question.functions).value;
	settings.maxvalue = evaluate(compile(settings.maxvalue),this.question.variables,this.question.functions).value;

	tryGetAttribute(settings,'answer/allowonlyintegeranswers',['value','partialcredit'],['integerAnswer','partialCredit'],{xml: this.xml});

	settings.displayAnswer = Numbas.math.niceNumber((settings.minvalue + settings.maxvalue)/2);

	this.display = new Numbas.display.NumberEntryPartDisplay(this);
	
	if(loading)
	{
		var pobj = Numbas.store.loadPart(this);
		this.studentAnswer = pobj.studentAnswer;
	}
}
NumberEntryPart.prototype =
{
	studentAnswer: '',

	settings:
	{
		inputStep: 1,
		minvalue: 0,
		maxvalue: 0,
		integerAnswer: false,//must answer be an integer?
		partialCredit: 0,	//partial credit to award if answer is not an integer
		displayAnswer: 0	//number to display if revealing answer
	},

	mark: function()
	{
		if(this.answerList==undefined)
		{
			this.credit = 0;
			return false;
		}
		this.studentAnswer = this.answerList[0];
		
		// do a bit of string tidy up
		// uk number format only for now - get rid of any UK 1000 separators	
		this.studentAnswer = this.studentAnswer.replace(/,/g, '');
		this.studentAnswer = $.trim(this.studentAnswer);
		
		if( this.studentAnswer.length>0 && !isNaN(this.studentAnswer) )
		{
			this.studentAnswer = parseFloat(this.studentAnswer);
			if( this.studentAnswer <= this.settings.maxvalue && this.studentAnswer >= this.settings.minvalue )
			{
				if(this.settings.integerAnswer && !util.isInt(this.studentAnswer))
					this.credit = this.settings.partialCredit;
				else
					this.credit=1;
			}else{
				this.credit=0;
			}
			this.answered = true;
		}else{
			this.answered = false;
			this.credit = 0;
		}
	},

	validate: function()
	{
		if(!this.answered)
			this.giveWarning("No answer submitted.");
		
		return this.answered;
	}
};


function MultipleResponsePart(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(MultipleResponsePart.prototype.settings,settings);


	//work out marks available
	tryGetAttribute(settings,'marking/maxmarks','enabled','maxMarksEnabled',{xml: this.xml});
	if(settings.maxMarksEnabled)
	{
		tryGetAttribute(this,'marking/maxmarks','value','marks',{xml: this.xml});
	}
	else
	{
		tryGetAttribute(this,'.','marks');
	}

	//get restrictions on number of choices
	var choicesNode = this.xml.selectSingleNode('choices');
	if(!choicesNode)
		throw(new Error("Definition of choices is missing from a Multiple Response part ("+this.path+")"));

	tryGetAttribute(settings,choicesNode,['minimumexpected','maximumexpected','order','displayType'],['minAnswers','maxAnswers','choiceOrder']);
	var choiceNodes = choicesNode.selectNodes('choice');
	this.numChoices = choiceNodes.length;
	
	//randomise answers?
	var answersNode = this.xml.selectSingleNode('possibleanswers');
	if(answersNode)
	{
		tryGetAttribute(settings,answersNode,'order','answerOrder');
		var answerNodes = answersNode.selectNodes('possibleanswer');
		this.numAnswers = answerNodes.length;
	}

	//get warning type and message for wrong number of choices
	warningNode = this.xml.selectSingleNode('uiwarning');
	if(warningNode)
	{
		tryGetAttribute(settings,warningNode,'type','warningType');
		settings.warningMessage = $.xsl.transform(Numbas.xml.templates.question,warningNode).string;
	}
	
	if(loading)
	{
		var pobj = Numbas.store.loadPart(this);
		this.shuffleChoices = pobj.shuffleChoices;
		this.shuffleAnswers = pobj.shuffleAnswers;
	}
	else
	{

		this.shuffleChoices=[];
		if(settings.choiceOrder=='random')
		{
			this.shuffleChoices = Numbas.math.deal(this.numChoices);
		}
		else
		{
			this.shuffleChoices = Numbas.math.range(this.numChoices);
		}

		this.shuffleAnswers=[];
		if(settings.answerOrder=='random')
		{
			this.shuffleAnswers = Numbas.math.deal(this.numAnswers);
		}
		else
		{
			this.shuffleAnswers = Numbas.math.range(this.numAnswers);
		}
	}

	for(var i=0;i<this.numChoices;i++)
	{
		choicesNode.removeChild(choiceNodes[i]);
	}
	for(i=0;i<this.numChoices;i++)
	{
		choicesNode.appendChild(choiceNodes[this.shuffleChoices[i]]);
	}
	for(i=0;i<this.numAnswers;i++)
	{
		answersNode.removeChild(answerNodes[i]);
	}
	for(i=0;i<this.numAnswers;i++)
	{
		answersNode.appendChild(answerNodes[this.shuffleAnswers[i]]);
	}

	//invert the shuffle so we can now tell where particular choices/answers went
	this.shuffleChoices = Numbas.math.inverse(this.shuffleChoices);
	this.shuffleAnswers = Numbas.math.inverse(this.shuffleAnswers);

	//fill marks matrix
	var matrix=[];
	var matrixNodes = this.xml.selectNodes('marking/matrix/mark');
	var matrixTotal = 0;
	for( i=0; i<matrixNodes.length; i++ )
	{
		var cell = {value: ""};
		tryGetAttribute(cell, matrixNodes[i], ['possibleAnswerIndex', 'choiceIndex', 'value']);

		if(util.isFloat(cell.value))
			cell.value = parseFloat(cell.value);
		else
		{
			cell.value = jme.evaluate(jme.compile(cell.value),this.question.variables,this.question.functions).value;
			if(!util.isFloat(cell.value))
				throw(new Error("Part "+this.path+" marking matrix cell "+cell.possibleAnswerIndex+","+cell.choiceIndex+" does not evaluate to a number"));
			cell.value = parseFloat(cell.value);
		}
		matrixTotal += cell.value;

		//take into account shuffling
		cell.possibleAnswerIndex = this.shuffleAnswers[cell.possibleAnswerIndex];
		cell.choiceIndex = this.shuffleChoices[cell.choiceIndex];

		if(this.type == '1_n_2' || this.type == 'm_n_2')
		{	//for some reason, possible answers are recorded as choices in the multiple choice types.
			//switch the indices round, so we don't have to worry about this again
			cell.possibleAnswerIndex = cell.choiceIndex;
			cell.choiceIndex = 0;
		}

		if(!matrix[cell.possibleAnswerIndex])
			matrix[cell.possibleAnswerIndex]=[];
		matrix[cell.possibleAnswerIndex][cell.choiceIndex] = cell.value;
	}
	settings.matrix = matrix;
	
	if(this.marks == 0)
		this.marks = matrixTotal;

	if(this.type == '1_n_2' || this.type == 'm_n_2')
	{	//because we swapped answers and choices round in the marking matrix
		this.numAnswers = this.numChoices;
		this.numChoices = 1;
		var flipped=true;
	}
	else
		var flipped=false;

	//ticks array - which answers/choices are selected?
	this.ticks=[];
	this.stagedAnswer = [];
	for( i=0; i<this.numAnswers; i++ )
	{
		this.ticks.push([]);
		this.stagedAnswer.push([]);
		for( var j=0; j<this.numChoices; j++ )
		{
			this.ticks[i].push(false);
			this.stagedAnswer[i].push(false);
		}
	}

	//restore saved choices
	if(loading)
	{
		for( i=0;i<this.numAnswers;i++)
		{
			for(j=0;j<this.numChoices;j++)
			{
				if( (flipped && (pobj.ticks[j][i])) || (!flipped && pobj.ticks[i][j]) )
					this.ticks[i][j]=true;
			}
		}
	}

	//if this part has a minimum number of answers more than zero, then
	//we start in an error state
	this.wrongNumber = settings.minAnswers > 0;

	this.display = new Numbas.display.MultipleResponsePartDisplay(this);
}
MultipleResponsePart.prototype =
{
	ticks: [],						//store student's responses here - array to say if each response has been selected or not
	wrongNumber: false,				//has student given the wrong number of responses?

	settings:
	{
		maxMarksEnabled: false,		//is there a maximum number of marks the student can get?
		minAnswers: 0,				//minimum number of responses student must select
		maxAnswers: 0,				//maximum ditto
		choiceOrder: '',			//order in which to display choices
		answerOrder: '',			//order in which to display answers
		matrix: [],					//marks matrix
		displayType: '',			//how to display the responses? can be: radiogroup, dropdownlist, buttonimage, checkbox, choicecontent
		numChoices: 0,				//number of choices
		numAnswers: 0,				//number of possible answers
		warningType: '',			//what to do if wrong number of responses
		warningMessage: ''			//message to display if wrong number of responses
	},

	storeAnswer: function(answerList)
	{
		//get choice and answer 
		//in MR1_n_2 and MRm_n_2 parts, only the choiceindex matters
		var answerIndex = answerList[0];
		var choiceIndex = answerList[1];

		switch(this.settings.displayType)
		{
		case 'radiogroup':							//for radiogroup parts, only one answer can be selected.
		case 'dropdownlist':
			for(var i=0; i<this.numAnswers; i++)
			{
				this.stagedAnswer[i][choiceIndex]= i==answerIndex;
			}
			break;
		default:
			this.stagedAnswer[answerIndex][choiceIndex] = this.answerList[2];
		}
	},

	mark: function()
	{
		if(this.stagedAnswer==undefined)
		{
			this.credit = 0;
			return false;
		}
		this.ticks = util.copyarray(this.stagedAnswer);

		this.numTicks = 0;
		var partScore = 0;
		for( i=0; i<this.numAnswers; i++ )
		{
			for(var j=0; j<this.numChoices; j++ )
			{
				if(this.ticks[i][j])
				{
					partScore += this.settings.matrix[i][j];
					this.numTicks += 1;
				}
			}
		}

		this.wrongNumber = (this.numTicks<this.settings.minAnswers || (this.numTicks>this.settings.maxAnswers && this.settings.maxAnswers>0));

		if(this.marks>0 && !this.wrongNumber)
			this.credit = Math.min(partScore,this.marks)/this.marks;	//this part might have a maximum number of marks which is less then the sum of the marking matrix
		else
			this.credit = 0;
	},

	validate: function()
	{
		if(this.wrongNumber)
		{
			switch(this.settings.warningType)
			{
			case 'uwPrevent':
				this.giveWarning(this.settings.warningMessage);
				return false;
				break;
			case 'uwWarn':
				this.giveWarning(this.settings.warningMessage);
				break;
			}
		}

		if(this.numTicks>0)
			return true;
		else
			this.giveWarning('No choices selected.');
			return false;
	}
};

function GapFillPart(xml, path, question, parentPart, loading)
{
	var gapXML = this.xml.selectNodes('gaps/part');

	this.marks = 0;

	for( var i=0 ; i<gapXML.length; i++ )
	{
		var gap = createPart(gapXML[i], path+'g'+i, this.question, this, loading);
		this.marks += gap.marks;
		this.gaps[i]=gap;
	}

	this.display = new Numbas.display.GapFillPartDisplay(this);
}	
GapFillPart.prototype =
{
	stagedAnswer: 'something',

	revealAnswer: function()
	{
		for(var i=0; i<this.gaps.length; i++)
			this.gaps[i].revealAnswer();
	},

	submit: function()
	{
		for(var i=0;i<this.gaps.length;i++)
		{
			this.gaps[i].submit();
		}
	},

	mark: function()
	{
		this.credit=0;
		if(this.marks>0)
		{
			for(var i=0; i<this.gaps.length; i++)
			{
				var gap = this.gaps[i];
				gap.mark();
				this.credit += gap.credit*gap.marks;
			}
			this.credit/=this.marks;
		}
	},


	validate: function()
	{
		//go through all gaps, and if any one fails to validate then
		//whole part fails to validate
		var success = true;
		for(var i=0; i<this.gaps.length; i++)
			success = success && this.gaps[i].answered;

		return success;
	}
};
GapFillPart.prototype.submit = util.extend(GapFillPart.prototype.submit, Part.prototype.submit);

function InformationPart(xml, path, question, parentPart, loading)
{
	this.display = new Numbas.display.InformationPartDisplay(this);
}


//associate part type names with their object constructors
var partConstructors = Numbas.Question.partConstructors = {
	'CUEdt.JMEPart': JMEPart, 
	'jme': JMEPart,

	'CUEdt.PatternMatchPart': PatternMatchPart,
	'patternmatch': PatternMatchPart,

	'CUEdt.NumberEntryPart': NumberEntryPart,
	'numberentry': NumberEntryPart,

	'CUEdt.MR1_n_2Part': MultipleResponsePart,
	'CUEdt.MRm_n_2Part': MultipleResponsePart,
	'CUEdt.MRm_n_xPart': MultipleResponsePart,
	'1_n_2': MultipleResponsePart,
	'm_n_2': MultipleResponsePart,
	'm_n_x': MultipleResponsePart,

	'CUEdt.GapFillPart': GapFillPart,
	'gapfill': GapFillPart,

	'CUEdt.InformationOnlyPart': InformationPart,
	'information': InformationPart
};

var extend = util.extend;
for(var pc in partConstructors)
	partConstructors[pc]=extend(Part,partConstructors[pc]);

});
