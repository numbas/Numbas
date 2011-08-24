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


Numbas.queueScript('scripts/util.js',[],function() {
var util = Numbas.util = {
	//extend(A,B) - derive type B from A
	//(class inheritance, really)
	extend: function(a,b,extendMethods)
	{ 
		var c = function() 
		{ 
			a.apply(this,arguments);
			b.apply(this,arguments);
		};

		var x;
		for(x in a.prototype)
		{
			c.prototype[x]=a.prototype[x];
		}
		for(x in b.prototype)
		{
			c.prototype[x]=b.prototype[x];
		}

		if(extendMethods)
		{
			for(x in a.prototype)
			{
				if(typeof(a.prototype[x])=='function' && b.prototype[x])
					c.prototype[x]=Numbas.util.extend(a.prototype[x],b.prototype[x]);
			}
		}

		return c;
	},

	//shallow copy of array
	copyarray: function(arr,deep)
	{
		arr = arr.slice();
		if(deep)
		{
			for(var i=0;i<arr.length;i++)
			{
				arr[i]=util.copyobj(arr[i],deep);
			}
		}
		return arr;
	},

	//copy of object (shallow copy unless deep == true)
	copyobj: function(obj,deep)
	{
		switch(typeof(obj))
		{
		case 'object':
			if(obj.length!==undefined)
			{
				return util.copyarray(obj,deep);
			}
			else
			{
				var newobj={};
				for(x in obj)
				{
					if(deep)
						newobj[x] = util.copyobj(obj[x],deep);
					else
						newobj[x]=obj[x];
				}
				return newobj;
			}
		default:
			return obj;
		}
	},

	//shallow copy object into already existing object
	copyinto: function(src,dest)
	{
		for(var x in src)
		{
			if(dest[x]===undefined)
				dest[x]=src[x]
		}
	},

	//test if parameter is an integer
	isInt: function(i)
	{
		return parseInt(i,10)==i;
	},

	//test if parameter is a float
	isFloat: function(f)
	{
		return parseFloat(f)==f;
	},

	isBool: function(b)
	{
		if(b==null) { return false; }
		if(typeof(b)=='boolean') { return true; }

		b = b.toString().toLowerCase();
		return b=='false' || b=='true' || b=='yes' || b=='no';
	},

	//parse parameter as a boolean
	parseBool: function(b)
	{
		if(!b)
			return false;
		b = b.toString().toLowerCase();
		return( b=='true' || b=='yes' );
	},

	//pad a string s on the left with a character p until it is n characters long
	lpad: function(s,n,p)
	{
		s=s.toString();
		while(s.length<n) { s=p[0]+s; }
		return s;
	},

	formatString: function(str)
	{
		var i=0;
		var re = /%s/;
		for(var i=1;i<arguments.length;i++)
		{
			str=str.replace(/%s/,arguments[i]);
		}
		return str;
	},

	//get rid of the % on the end of percentages and parse as float
	unPercent: function(s)
	{
		return (parseFloat(s.replace(/%/,''))/100);
	},

	escapeString: function(s)
	{
		if(s===undefined)
			return '';
		return s.replace(/\\n/g,'\n');
	},

	pluralise: function(n,singular,plural)
	{
		if(n==-1 || n==1)
			return singular;
		else
			return plural;
	},


	//split content text up by TeX delimiters
	contentsplitbrackets: function(t)
	{
		var o=[];
		var l=t.length;
		var s=0;
		for(var i=0;i<l;i++)
		{
			if(t.charAt(i)=='$')
			{
				o.push(t.slice(s,i));
				o.push('$');
				s=i+1;
			}
			else if (i<l-1 && t.charAt(i)=='\\' && (t.charAt(i+1)=='[' || t.charAt(i+1)==']'))
			{
				o.push(t.slice(s,i));
				o.push(t.slice(i,i+2));
				s=i+2;
			}
		}
		if(s<l)
			o.push(t.slice(s));
		return o;
	},

	escapeHTML: function(str)
	{
		return str.replace(/&/g,'&amp;');
		//return $('<div/>').text(str).html();
	}

};


//Because indexOf not supported in IE
if(!Array.indexOf)
{
	Array.prototype.indexOf = function(obj){
		for(var i=0; i<this.length; i++){
			if(this[i]==obj){
				return i;
			}
		}
		return -1;
	};
}

//nice short 'string contains' function
if(!String.prototype.contains)
{
	String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
}
if(!Array.prototype.contains)
{
	Array.prototype.contains = function(it) { return this.indexOf(it) != -1; };
}

//merge one array into another, only adding elements which aren't already present
if(!Array.prototype.merge)
{
	Array.prototype.merge = function(arr)
	{
		var out = this.slice();
		for(var i=0;i<arr.length;i++)
		{
			if(!out.contains(arr[i]))
				out.push(arr[i]);
		}
		return out;
	};
}

/* Cross-Browser Split 1.0.1
(c) Steven Levithan <stevenlevithan.com>; MIT License
An ECMA-compliant, uniform cross-browser split method */

var cbSplit;

// avoid running twice, which would break `cbSplit._nativeSplit`'s reference to the native `split`
if (!cbSplit) {

cbSplit = function (str, separator, limit) {
    // if `separator` is not a regex, use the native `split`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
        return cbSplit._nativeSplit.call(str, separator, limit);
    }

    var output = [],
        lastLastIndex = 0,
        flags = (separator.ignoreCase ? "i" : "") +
                (separator.multiline  ? "m" : "") +
                (separator.sticky     ? "y" : ""),
        separator = RegExp(separator.source, flags + "g"), // make `global` and avoid `lastIndex` issues by working with a copy
        separator2, match, lastIndex, lastLength;

    str = str + ""; // type conversion
    if (!cbSplit._compliantExecNpcg) {
        separator2 = RegExp("^" + separator.source + "$(?!\\s)", flags); // doesn't need /g or /y, but they don't hurt
    }

    /* behavior for `limit`: if it's...
    - `undefined`: no limit.
    - `NaN` or zero: return an empty array.
    - a positive number: use `Math.floor(limit)`.
    - a negative number: no limit.
    - other: type-convert, then use the above rules. */
    if (limit === undefined || +limit < 0) {
        limit = Infinity;
    } else {
        limit = Math.floor(+limit);
        if (!limit) {
            return [];
        }
    }

    while (match = separator.exec(str)) {
        lastIndex = match.index + match[0].length; // `separator.lastIndex` is not reliable cross-browser

        if (lastIndex > lastLastIndex) {
            output.push(str.slice(lastLastIndex, match.index));

            // fix browsers whose `exec` methods don't consistently return `undefined` for nonparticipating capturing groups
            if (!cbSplit._compliantExecNpcg && match.length > 1) {
                match[0].replace(separator2, function () {
                    for (var i = 1; i < arguments.length - 2; i++) {
                        if (arguments[i] === undefined) {
                            match[i] = undefined;
                        }
                    }
                });
            }

            if (match.length > 1 && match.index < str.length) {
                Array.prototype.push.apply(output, match.slice(1));
            }

            lastLength = match[0].length;
            lastLastIndex = lastIndex;

            if (output.length >= limit) {
                break;
            }
        }

        if (separator.lastIndex === match.index) {
            separator.lastIndex++; // avoid an infinite loop
        }
    }

    if (lastLastIndex === str.length) {
        if (lastLength || !separator.test("")) {
            output.push("");
        }
    } else {
        output.push(str.slice(lastLastIndex));
    }

    return output.length > limit ? output.slice(0, limit) : output;
};


//add inline and display maths phrase types to textile convertor, so their contents don't get touched


var re_inlineMaths = /\$.*?\$/g;
textile.phraseTypes.splice(0,0,function(text) {
	var out = [];
	var m;
	while(m=re_inlineMaths.exec(text))
	{
		var bit = [text.slice(0,m.index),m[0]];
		out = this.joinPhraseBits(out,bit,out.length);
		text = text.slice(re_inlineMaths.lastIndex);
		re_inlineMaths.lastIndex = 0;
	}
	if(out.length)
		out = this.joinPhraseBits(out,[text],out.length);
		//out[out.length-1] += text;
	return out;
});

var re_displayMaths = /\\\[.*?\\\]/g;
textile.phraseTypes.splice(0,0,function(text) {
	var out = [];
	var m;
	while(m=re_displayMaths.exec(text))
	{
		var bit = [text.slice(0,m.index),m[0]];
		out = this.joinPhraseBits(out,bit,out.length);
		text = text.slice(re_displayMaths.lastIndex);
		re_displayMaths.lastIndex = 0;
	}
	if(out.length)
		out[out.length-1] += text;
	return out;
});


cbSplit._compliantExecNpcg = /()??/.exec("")[1] === undefined; // NPCG: nonparticipating capturing group
cbSplit._nativeSplit = String.prototype.split;

} // end `if (!cbSplit)`

// for convenience...
if(!String.prototype.split)
{
	String.prototype.split = function (separator, limit) {
		return cbSplit(this, separator, limit);
	};
}

//from http://stackoverflow.com/questions/2308134/trim-in-javascript-not-working-in-ie
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}


//from http://www.tutorialspoint.com/javascript/array_map.htm
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in this)
        res[i] = fun.call(thisp, this[i], i, this);
    }

    return res;
  };
}

});
