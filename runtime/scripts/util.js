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

// utility.js
// convenience functions, extensions to javascript built-ins, etc.

Numbas.queueScript('scripts/util.js',['math'],function() {
var util = Numbas.util = {

	// extend(A,B) - derive type B from A
	// (class inheritance, really)
	// A should be the constructor for the parent class
	// B should be a constructor to be called after A's constructor is done.
	// B's prototype supercedes A's.
	// returns a constructor for the derived class
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

	//clone an array, with array elements copied too
	//Array.splice() will create a copy of an array, but the elements are the same objects, which can cause fruity bugs.
	//This function clones the array elements as well, so there should be no side-effects when operating on the cloned array.
	//If 'deep' is true, do a deep copy of each element -- see util.copyobj
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

	//clone an object
	//if 'deep' is true, each property is cloned as well (recursively) so there should be no side-effects when operating on the cloned object.
	copyobj: function(obj,deep)
	{
		switch(typeof(obj))
		{
		case 'object':
			if(obj===null)
				return obj;
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
	//add all src's properties to dest
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

	//test if parameter is a boolean
	//returns if parameter is a boolean literal, or any of the strings 'false','true','yes','no', case-insensitive
	isBool: function(b)
	{
		if(b==null) { return false; }
		if(typeof(b)=='boolean') { return true; }

		b = b.toString().toLowerCase();
		return b=='false' || b=='true' || b=='yes' || b=='no';
	},

	//parse parameter as a boolean
	//the boolean value true and the strings 'true' and 'yes' are parsed as the value true, everything else is false.
	parseBool: function(b)
	{
		if(!b)
			return false;
		b = b.toString().toLowerCase();
		return( b=='true' || b=='yes' );
	},

	//pad string s on the left with a character p until it is n characters long
	lpad: function(s,n,p)
	{
		s=s.toString();
		p=p[0];
		while(s.length<n) { s=p+s; }
		return s;
	},

	//replace occurences of '%s' with the extra arguments of the function
	//ie.
	// formatString('hello %s %s','Mr.','Perfect') => 'hello Mr. Perfect'
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

	//get rid of the % on the end of percentages and parse as float, then divide by 100
	//ie.
	// unPercent('50%') => 0.5
	// unPercent('50') => 0.5
	unPercent: function(s)
	{
		return (parseFloat(s.replace(/%/,''))/100);
	},


	//pluralise a word
	//if n is not unity, return plural, else return singular
	pluralise: function(n,singular,plural)
	{
		n = Numbas.math.precround(n,10);
		if(n==-1 || n==1)
			return singular;
		else
			return plural;
	},

	//split a string up according to brackets
	//strips out nested brackets
	//
	//so 
	// splitbrackets('a{{b}}c','{','}') => ['a','b','c']
	splitbrackets: function(t,lb,rb)
	{
		var o=[];
		var l=t.length;
		var s=0;
		var depth=0;
		for(var i=0;i<l;i++)
		{
			if(t.charAt(i)==lb && !(i>0 && t.charAt(i-1)=='\\'))
			{
				depth+=1;
				if(depth==1)
				{
					o.push(t.slice(s,i));
					s=i+1;
				}
				else
				{
					t = t.slice(0,i)+t.slice(i+1);
					i-=1;
				}
			}
			else if(t.charAt(i)==rb && !(i>0 && t.charAt(i-1)=='\\'))
			{
				depth-=1;
				if(depth==0)
				{
					o.push(t.slice(s,i));
					s=i+1;
				}
				else
				{
					t = t.slice(0,i)+t.slice(i+1);
					i -= 1;
				}
			}
		}
		if(s<l)
			o.push(t.slice(s));
		return o;
	},

	//split content text up by TeX maths delimiters
	//includes delimiters, since there are two kinds
	//ie.
	// contentsplitbrackets('hello $x+y$ and \[this\] etc') => ['hello ','$','x+y','$',' and ','\[','this','\]']
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

	//because XML doesn't like having ampersands hanging about, replace them with escape codes
	escapeHTML: function(str)
	{
		return str.replace(/&/g,'&amp;');
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
		out = this.joinPhraseBits(out,[text],out.length);
	return out;
});

var re_subvar = /\{.*?\}/g;
textile.phraseTypes.splice(0,0,function(text) {
	var out = [];
	var m;
	while(m=re_subvar.exec(text))
	{
		var bit = [text.slice(0,m.index),m[0]];
		out = this.joinPhraseBits(out,bit,out.length);
		text = text.slice(re_subvar.lastIndex);
		re_subvar.lastIndex = 0;
	}
	if(out.length)
		out = this.joinPhraseBits(out,[text],out.length);
	return out;
});


cbSplit._compliantExecNpcg = /()??/.exec("")[1] === undefined; // NPCG: nonparticipating capturing group
cbSplit._nativeSplit = String.prototype.split;

} // end `if (!cbSplit)`

// for convenience, override the builtin split function with the cross-browser version...
if(!String.prototype.split)
{
	String.prototype.split = function (separator, limit) {
		return cbSplit(this, separator, limit);
	};
}

//add String.trim when not present
//from http://stackoverflow.com/questions/2308134/trim-in-javascript-not-working-in-ie
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}

//add Array.map when not present
//Array.map applies the given function to every element in the given array
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

//from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Reduce 
if ( !Array.prototype.reduce ) {
  Array.prototype.reduce = function reduce(accumulator){
        var i, l = this.length, curr;
        
        if(typeof accumulator !== "function") // ES5 : "If IsCallable(callbackfn) is false, throw a TypeError exception."
          throw new TypeError("First argument is not callable");

        if((l == 0 || l === null) && (arguments.length <= 1))// == on purpose to test 0 and false.
          throw new TypeError("Array length is 0 and no second argument");
        
        if(arguments.length <= 1){
          curr = this[0]; // Increase i to start searching the secondly defined element in the array
          i = 1; // start accumulating at the second element
        }
        else{
          curr = arguments[1];
        }
        
        for(i = i || 0 ; i < l ; ++i){
          if(i in this)
            curr = accumulator.call(undefined, curr, this[i], i, this);
        }
        
        return curr;
      };
  }
});
