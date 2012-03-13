(function() {
if(!window.Numbas) { window.Numbas = {} }	// create the Numbas object.
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


Numbas.Error = function(message)
{
	this.name="Numbas Error";
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
	var m;
	if(m = file.match(/^scripts\/(.+)/))
		file='js/numbas/'+m[1];
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

Numbas.queueScript = function(file, deps, callback)	
//queue up a file's code to be executed
//file is the path of this file
//deps is a list of other files which need to be run before this one can be
//callback is a function wrapping up this file's code
{
	var m;
	if(m = file.match(/^scripts\/(.+)/))
		file='js/numbas/'+m[1];

	var req = scriptreqs[file];

	if(typeof(deps)=='string')
		deps = [deps];
	for(var i=0;i<deps.length;i++)
	{
		var dep = deps[i];
		if(!dep.match('/'))				//so can refer to built-in scripts just by name
			dep = 'js/numbas/'+deps[i]+'.js';
		deps[i] = dep;
		loadScript(dep);
		scriptreqs[dep].backdeps.push(file);
	}
	req.fdeps = deps;
	req.callback = callback;
	
	req.loaded = true;

	if(Numbas.startOK)
	{
		tryInit();
	}
}

var tryInit = Numbas.tryInit = function()
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
