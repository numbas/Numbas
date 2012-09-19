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


// SCORM EXAM RUNTIME
// numbas.js
// Contains code to load in the other script files, and initialise the exam.
// Creates the global Numbas object, inside which everything else is stored, so as not to conflict with anything else that might be running in the page.
//

//By wrapping everything in an anonymous function, we avoid filling up the namespace with whatever variables we declare
(function() {

if(!window.Numbas) { window.Numbas = {} }	// create the Numbas object.

Numbas.extensions = {};

// Numbas.debug is a function for displaying debug info in the console. It will try to give a reference back to the line that called it, if it can.
Numbas.debug = function(msg,noStack)
{
	if(window.console)
	{
		var e = new Error(msg);
		if(e.stack && !noStack)
		{
			var words= e.stack.split('\n')[2];
			console.log(msg," "+words);
		}
		else
		{
			console.log(msg);
		}
	}
};

// displays an error in a nice alert box. Also sends the error to the console via Numbas.debug
Numbas.showError = function(e)
{
	var message;
	if(e.stack)
	{
		message=e.stack.replace(/\n/g,'<br/>\n');
	}
	else
	{
		message = (e || e.message)+'';
	}
	Numbas.debug(e.stack || message);
	Numbas.display.showAlert(message);
	throw(e);
};

Numbas.Error = function(message)
{
	this.name="Numbas Error";
	this.originalMessage = message;
	this.message = R.apply(this,arguments);
}
Numbas.Error.prototype = Error.prototype;
Numbas.Error.prototype.constructor = Numbas.Error;

// Script loading system.
// call loadScript to load a file. It will then call queueScript with a list of its dependencies, and its code wrapped into a callback function.
// When all the dependencies have been loaded, the callback function is executed. The callback function should finish with a call to scriptLoaded, which keeps track of what's been run.
//

var scriptreqs = {};
Numbas.startOK = false;

function RequireScript(file)
{
	this.file = file;
	scriptreqs[file] = this;
	this.backdeps = [];
	this.fdeps = [];
}
RequireScript.prototype = {
	loaded: false,
	executed: false,
	backdeps: [],
	fdeps: [],
	callback: null
};

var loadScript = Numbas.loadScript = function(file,noreq)	
//load a javascript file. Unless noreq is set, the file's code must be wrapped in a call to Numbas.queueScript with its filename as the first parameter
{
	if(!noreq)
	{
		if(scriptreqs[file]!==undefined)
			return;
		var req = new RequireScript(file);
	}

	var script = document.createElement("script");
	script.type = "text/javascript";
	script.charset="utf-8";
	script.src = file;
	document.getElementsByTagName('head')[0].appendChild(script);
}

var loadCSS = Numbas.loadCSS = function(file)
{
	var link = document.createElement('link');
	link.rel = "stylesheet";
	link.type = "text/css";
	link.href = file;
	document.getElementsByTagName('head')[0].appendChild(link);
}

Numbas.scriptPrefix = 'scripts/';

Numbas.queueScript = function(file, deps, callback)	
//queue up a file's code to be executed
//file is the path of this file
//deps is a list of other files which need to be run before this one can be
//callback is a function wrapping up this file's code
{
	file = file.replace(/^scripts\//,Numbas.scriptPrefix);
	var req = scriptreqs[file];

	if(typeof(deps)=='string')
		deps = [deps];
	for(var i=0;i<deps.length;i++)
	{
		var dep = deps[i];
		if(!dep.match('/'))				//so can refer to built-in scripts just by name
			dep = Numbas.scriptPrefix+deps[i]+'.js';
		deps[i] = dep;
		loadScript(dep);
		scriptreqs[dep].backdeps.push(file);
	}
	req.fdeps = deps;
	req.callback = callback;
	
	req.loaded = true;

	if(Numbas.startOK)
	{
		Numbas.tryInit();
	}
}

Numbas.tryInit = function()
//called when all files have been requested, will try to execute all queued code if all script files have been loaded
{

	//see if every requested script has been loaded
	var go=true;
	for(var x in scriptreqs)
	{
		if(!scriptreqs[x].loaded)
			go=false;
	}
	if(!go) { return; }

	//put all scripts in a list and go through evaluating the ones that can be evaluated, until everything has been evaluated
	var stack = [];
	for(var x in scriptreqs)
	{
		stack.push(scriptreqs[x]);
	}


	while(stack.length)
	{
		for(var i=0;i<stack.length;i++)
		{
			var req = stack[i];
			var go = true;
			for(var j=0;j<req.fdeps.length;j++)
			{
				if(!scriptreqs[req.fdeps[j]].executed)
					go=false;
			}
			if(go)
			{
				req.callback();
				req.executed=true;
				stack.splice(i,1);
				break;
			}
		}
	}
	Numbas.init();
}



})();
