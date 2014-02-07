/*
Copyright 2011-13 Newcastle University

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
Numbas.startOK = true;

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

	/*
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.charset="utf-8";
	script.src = file;
	document.getElementsByTagName('head')[0].appendChild(script);
	*/
}

Numbas.queueScript = function(file, deps, callback)	
//queue up a file's code to be executed
//file is the path of this file
//deps is a list of other files which need to be run before this one can be
//callback is a function wrapping up this file's code
{
	var req = scriptreqs[file] || new RequireScript(file);

	if(typeof(deps)=='string')
		deps = [deps];
	for(var i=0;i<deps.length;i++)
	{
		var dep = deps[i];
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

	//put all scripts in a list and go through evaluating the ones that can be evaluated, until everything has been evaluated
	var stack = [];
	var ind = 0;
	function get_ind() {
		return 'margin-left: '+ind+'em';
	}

	function tryRun(req) {
		if(req.loaded && !req.executed) {
			//console.log('%ctryrun '+req.file,get_ind());
			var go = true;
			for(var j=0;j<req.fdeps.length;j++)
			{
				if(!scriptreqs[req.fdeps[j]].executed) {
					//console.log('%cdon\'t have '+req.fdeps[j],'color: red;'+get_ind());
					go=false;
					break;
				}
				else {
					//console.log('%cgot '+req.fdeps[j],'color:green;'+get_ind());
				}
			}
			if(go)
			{
				//console.log('%crun '+req.file,'background-color: #eee;'+get_ind());
				req.callback({exports:window});
				req.executed=true;
				ind++;
				for(var j=0;j<req.backdeps.length;j++) {
					//console.log('%ctry '+req.backdeps[j],get_ind());
					tryRun(scriptreqs[req.backdeps[j]]);
				}
				ind--;
			}
		}
	}
	for(var x in scriptreqs)
	{
		tryRun(scriptreqs[x]);
	}
}

Numbas.queueScript('base',['jquery','R','seedrandom','knockout','sarissa'],function() {
});


})();
