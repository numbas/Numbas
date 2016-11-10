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


/** @file Contains code to load in the other script files, and initialise the exam.
 *
 * Creates the global {@link Numbas} object, inside which everything else is stored, so as not to conflict with anything else that might be running in the page.
 */

(function() {

if(!window.Numbas) { window.Numbas = {} }
/** @namespace Numbas */

/** Extensions should add objects to this so they can be accessed */
Numbas.extensions = {};

/** A function for displaying debug info in the console. It will try to give a reference back to the line that called it, if it can. 
 * @param {string} msg - text to display
 * @param {boolean} [noStack=false] - don't show the stack trace
 */
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

/** Display an error in a nice alert box. Also sends the error to the console via {@link Numbas.debug} 
 * @param {error} e
 */
Numbas.showError = function(e)
{
	var message = (e || e.message)+'';
	message += ' <br> ' + e.stack.replace(/\n/g,'<br>\n');
	Numbas.debug(message);
	Numbas.display.showAlert(message);
	throw(e);
};

/** Generic error class. Extends JavaScript's Error
 * @constructor
 * @param {string} message - A description of the error. Localised by R.js.
 */
Numbas.Error = function(message)
{
	Error.call(this);
	if(Error.captureStackTrace) {
		Error.captureStackTrace(this, this.constructor);
	}

	this.name="Numbas Error";
	this.originalMessage = message;
	this.message = R.apply(this,arguments);
}
Numbas.Error.prototype = Error.prototype;
Numbas.Error.prototype.constructor = Numbas.Error;

var scriptreqs = {};

/** Keep track of loading status of a script and its dependencies
 * @param {string} file - name of script
 * @global
 * @constructor
 * @property {string} file - Name of script
 * @property {boolean} loaded - Has the script been loaded yet?
 * @property {boolean} executed - Has the script been run?
 * @property {Array.string} backdeps - Scripts which depend on this one (need this one to run first)
 * @property {Array.string} fdeps - Scripts which this one depends on (it must run after them)
 * @property {function} callback - The function to run when all this script's dependencies have run (this is the script itself)
 */
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


/** Ask to load a javascript file. Unless `noreq` is set, the file's code must be wrapped in a call to Numbas.queueScript with its filename as the first parameter.
 * @memberof Numbas
 * @param {string} file
 * @param {boolean} noreq - don't create a {@link Numbas.RequireScript} object
 */
var loadScript = Numbas.loadScript = function(file,noreq)	
{
	if(!noreq)
	{
		if(scriptreqs[file]!==undefined)
			return;
		var req = new RequireScript(file);
	}
}

/**
 * Queue up a file's code to be executed.
 * Each script should be wrapped in this function
 * @param {string} file - Name of the script
 * @param {Array.string} deps - A list of other scripts which need to be run before this one can be run
 * @param {function} callback - A function wrapping up this file's code
 */
Numbas.queueScript = function(file, deps, callback)	
{
	// find a RequireScript
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

	Numbas.tryInit();
}

/** Called when all files have been requested, will try to execute all queued code if all script files have been loaded. */
Numbas.tryInit = function()
{
	if(Numbas.dead) {
		return;
	}

	//put all scripts in a list and go through evaluating the ones that can be evaluated, until everything has been evaluated
	var stack = [];
	var ind = 0;
	function get_ind() {
		return 'margin-left: '+ind+'em';
	}

	function tryRun(req) {
		if(req.loaded && !req.executed) {
			var go = true;
			for(var j=0;j<req.fdeps.length;j++)
			{
				if(!scriptreqs[req.fdeps[j]].executed) {
					go=false;
					break;
				}
			}
			if(go)
			{
				if(req.callback) {
					req.callback({exports:window});
				}
				req.executed=true;
				ind++;
				for(var j=0;j<req.backdeps.length;j++) {
					tryRun(scriptreqs[req.backdeps[j]]);
				}
				ind--;
			}
		}
	}
	for(var x in scriptreqs)
	{
		try {
			tryRun(scriptreqs[x]);
		} catch(e) {
			alert(e+'');
			Numbas.debug(e.stack);
			Numbas.dead = true;
			return;
		}
	}
}

/** A wrapper round {@link Numbas.queueScript} to register extensions easily. 
 * @param {string} name - unique name of the extension
 * @param {Array.string} deps - A list of other scripts which need to be run before this one can be run
 * @param {function} callback - Code to set up the extension. It's given the object `Numbas.extensions.<name>` as a parameter, which contains a {@link Numbas.jme.Scope} object.
 */
Numbas.addExtension = function(name,deps,callback) {
	deps.push('jme');
    Numbas.queueScript('extensions/'+name+'/'+name+'.js',deps,function() {
        var extension = Numbas.extensions[name] = {
            scope: new Numbas.jme.Scope()
        };
        callback(extension);
    });
}

/** Check all required scripts have executed - the theme should call this once the document has loaded
 */
Numbas.checkAllScriptsLoaded = function() {
    for(var file in scriptreqs) {
        var req = scriptreqs[file];
        if(req.executed) {
            continue;
        }
        if(req.fdeps.every(function(f){return scriptreqs[f].executed})) {
            Numbas.display.die(new Numbas.Error('die.script not loaded',{file:file}));
            break;
        }
    }
}

})();

