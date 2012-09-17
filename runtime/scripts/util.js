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
				for(var x in obj)
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

	//generic equality test on JME types
	eq: function(a,b) {
		if(a.type != b.type)
			return false;
		switch(a.type) {
			case 'number':
				return Numbas.math.eq(a.value,b.value);
			case 'vector': 
				return Numbas.vectormath.eq(a.value,b.value);
			case 'matrix':
				return Numbas.matrixmath.eq(a.value,b.value);
			case 'list':
				return a.value.length==b.value.length && a.value.filter(function(ae,i){return !util.eq(ae,b.value[i])}).length==0;
			case 'range':
				return a.value[0]==b.value[0] && a.value[1]==b.value[1] && a.value[2]==b.value[2];
			case 'name':
				return a.name == b.name;
			case 'number':
			case 'string':
			case 'boolean':
				return a.value==b.value;
			default:
				throw(new Numbas.Error('util.equality not defined for type %s',a.type));
		}
	},

	//and the corresponding not-equal test
	neq: function(a,b) {
		return !util.eq(a,b);
	},

	//filter out values in `exclude` from the list `list`
	//`exclude` and `list` are understood to be Numbas TLists, so values are Numbas types
	//that means, look at element types to decide which equality test to use
	except: function(list,exclude) {
		return list.filter(function(l) {
			for(var i=0;i<exclude.length;i++) {
				if(util.eq(l,exclude[i]))
					return false;
			}
			return true;
		});
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

	// parse a string as HTML, and return true only if it contains non-whitespace text
	isNonemptyHTML: function(html) {
		var d = document.createElement('div');
		d.innerHTML = html;
		return $(d).text().trim().length>0;
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

	//make the first letter in the string a capital
	capitalise: function(str) {
		return str.replace(/[a-z]/,function(c){return c.toUpperCase()});
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
	},

	//create a comparison function which sorts objects by a particular property
	sortBy: function(prop) {
		return function(a,b) {
			if(a[prop]>b[prop])
				return 1;
			else if(a[prop]<b[prop])
				return -1;
			else
				return 0;
		}
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
	Array.prototype.merge = function(arr,sortfn)
	{
		if(this.length==0)
			return arr.slice();

		var out = this.concat(arr);
		if(sortfn)
			out.sort(sortfn);
		else
			out.sort();
		if(sortfn) 
		{
			for(var i=1; i<out.length;) {
				if(sortfn(out[i-1],out[i])==0)	//duplicate elements, so remove latest
					out.splice(i,1);
				else
					i++;
			}
		}
		else
		{
			for(var i=1;i<out.length;) {
				if(out[i-1]==out[i])
					out.splice(i,1);
				else
					i++;
			}
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


//es5-shim.js - https://github.com/kriskowal/es5-shim
// -- kriskowal Kris Kowal Copyright (C) 2009-2011 MIT License
// -- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License (Narwhal Project)
// -- dantman Daniel Friesen Copyright (C) 2010 XXX TODO License or CLA
// -- fschaefer Florian Schäfer Copyright (C) 2010 MIT License
// -- Gozala Irakli Gozalishvili Copyright (C) 2010 MIT License
// -- kitcambridge Kit Cambridge Copyright (C) 2011 MIT License
// -- kossnocorp Sasha Koss XXX TODO License or CLA
// -- bryanforbes Bryan Forbes XXX TODO License or CLA
// -- killdream Quildreen Motta Copyright (C) 2011 MIT Licence
// -- michaelficarra Michael Ficarra Copyright (C) 2011 3-clause BSD License
// -- sharkbrainguy Gerard Paapu Copyright (C) 2011 MIT License
// -- bbqsrc Brendan Molloy (C) 2011 Creative Commons Zero (public domain)
// -- iwyg XXX TODO License or CLA
// -- DomenicDenicola Domenic Denicola Copyright (C) 2011 MIT License
// -- xavierm02 Montillet Xavier Copyright (C) 2011 MIT License
// -- Raynos Jake Verbaten Copyright (C) 2011 MIT Licence
// -- samsonjs Sami Samhuri Copyright (C) 2010 MIT License
// -- rwldrn Rick Waldron Copyright (C) 2011 MIT License
// -- lexer Alexey Zakharov XXX TODO License or CLA

/*!
    Copyright (c) 2009, 280 North Inc. http://280north.com/
    MIT License. http://github.com/280north/narwhal/blob/master/README.md
*/
(function(n){"function"==typeof define?define(n):n()})(function(){function n(a){try{return Object.defineProperty(a,"sentinel",{}),"sentinel"in a}catch(d){}}if(!Function.prototype.bind)Function.prototype.bind=function(a){var d=this;if("function"!=typeof d)throw new TypeError;var b=p.call(arguments,1),c=function(){if(this instanceof c){var e=function(){};e.prototype=d.prototype;var e=new e,g=d.apply(e,b.concat(p.call(arguments)));return null!==g&&Object(g)===g?g:e}return d.apply(a,b.concat(p.call(arguments)))};
return c};var l=Function.prototype.call,f=Object.prototype,p=Array.prototype.slice,m=l.bind(f.toString),h=l.bind(f.hasOwnProperty),t,u,q,r,o;if(o=h(f,"__defineGetter__"))t=l.bind(f.__defineGetter__),u=l.bind(f.__defineSetter__),q=l.bind(f.__lookupGetter__),r=l.bind(f.__lookupSetter__);if(!Array.isArray)Array.isArray=function(a){return"[object Array]"==m(a)};if(!Array.prototype.forEach)Array.prototype.forEach=function(a,d){var b=i(this),c=0,e=b.length>>>0;if("[object Function]"!=m(a))throw new TypeError;
for(;c<e;)c in b&&a.call(d,b[c],c,b),c++};if(!Array.prototype.map)Array.prototype.map=function(a,d){var b=i(this),c=b.length>>>0,e=Array(c);if("[object Function]"!=m(a))throw new TypeError;for(var g=0;g<c;g++)g in b&&(e[g]=a.call(d,b[g],g,b));return e};if(!Array.prototype.filter)Array.prototype.filter=function(a,d){var b=i(this),c=b.length>>>0,e=[];if("[object Function]"!=m(a))throw new TypeError;for(var g=0;g<c;g++)g in b&&a.call(d,b[g],g,b)&&e.push(b[g]);return e};if(!Array.prototype.every)Array.prototype.every=
function(a,d){var b=i(this),c=b.length>>>0;if("[object Function]"!=m(a))throw new TypeError;for(var e=0;e<c;e++)if(e in b&&!a.call(d,b[e],e,b))return!1;return!0};if(!Array.prototype.some)Array.prototype.some=function(a,d){var b=i(this),c=b.length>>>0;if("[object Function]"!=m(a))throw new TypeError;for(var e=0;e<c;e++)if(e in b&&a.call(d,b[e],e,b))return!0;return!1};if(!Array.prototype.reduce)Array.prototype.reduce=function(a){var d=i(this),b=d.length>>>0;if("[object Function]"!=m(a))throw new TypeError;
if(!b&&1==arguments.length)throw new TypeError;var c=0,e;if(2<=arguments.length)e=arguments[1];else{do{if(c in d){e=d[c++];break}if(++c>=b)throw new TypeError;}while(1)}for(;c<b;c++)c in d&&(e=a.call(void 0,e,d[c],c,d));return e};if(!Array.prototype.reduceRight)Array.prototype.reduceRight=function(a){var d=i(this),b=d.length>>>0;if("[object Function]"!=m(a))throw new TypeError;if(!b&&1==arguments.length)throw new TypeError;var c,b=b-1;if(2<=arguments.length)c=arguments[1];else{do{if(b in d){c=d[b--];
break}if(0>--b)throw new TypeError;}while(1)}do b in this&&(c=a.call(void 0,c,d[b],b,d));while(b--);return c};if(!Array.prototype.indexOf)Array.prototype.indexOf=function(a){var d=i(this),b=d.length>>>0;if(!b)return-1;var c=0;1<arguments.length&&(c=v(arguments[1]));for(c=0<=c?c:Math.max(0,b+c);c<b;c++)if(c in d&&d[c]===a)return c;return-1};if(!Array.prototype.lastIndexOf)Array.prototype.lastIndexOf=function(a){var d=i(this),b=d.length>>>0;if(!b)return-1;var c=b-1;1<arguments.length&&(c=Math.min(c,
v(arguments[1])));for(c=0<=c?c:b-Math.abs(c);0<=c;c--)if(c in d&&a===d[c])return c;return-1};if(!Object.getPrototypeOf)Object.getPrototypeOf=function(a){return a.__proto__||(a.constructor?a.constructor.prototype:f)};if(!Object.getOwnPropertyDescriptor)Object.getOwnPropertyDescriptor=function(a,d){if("object"!=typeof a&&"function"!=typeof a||null===a)throw new TypeError("Object.getOwnPropertyDescriptor called on a non-object: "+a);if(h(a,d)){var b,c,e;b={enumerable:!0,configurable:!0};if(o){var g=
a.__proto__;a.__proto__=f;c=q(a,d);e=r(a,d);a.__proto__=g;if(c||e){if(c)b.get=c;if(e)b.set=e;return b}}b.value=a[d];return b}};if(!Object.getOwnPropertyNames)Object.getOwnPropertyNames=function(a){return Object.keys(a)};if(!Object.create)Object.create=function(a,d){var b;if(null===a)b={__proto__:null};else{if("object"!=typeof a)throw new TypeError("typeof prototype["+typeof a+"] != 'object'");b=function(){};b.prototype=a;b=new b;b.__proto__=a}void 0!==d&&Object.defineProperties(b,d);return b};if(Object.defineProperty){var l=
n({}),y="undefined"==typeof document||n(document.createElement("div"));if(!l||!y)var s=Object.defineProperty}if(!Object.defineProperty||s)Object.defineProperty=function(a,d,b){if("object"!=typeof a&&"function"!=typeof a||null===a)throw new TypeError("Object.defineProperty called on non-object: "+a);if("object"!=typeof b&&"function"!=typeof b||null===b)throw new TypeError("Property description must be an object: "+b);if(s)try{return s.call(Object,a,d,b)}catch(c){}if(h(b,"value"))if(o&&(q(a,d)||r(a,
d))){var e=a.__proto__;a.__proto__=f;delete a[d];a[d]=b.value;a.__proto__=e}else a[d]=b.value;else{if(!o)throw new TypeError("getters & setters can not be defined on this javascript engine");h(b,"get")&&t(a,d,b.get);h(b,"set")&&u(a,d,b.set)}return a};if(!Object.defineProperties)Object.defineProperties=function(a,d){for(var b in d)h(d,b)&&Object.defineProperty(a,b,d[b]);return a};if(!Object.seal)Object.seal=function(a){return a};if(!Object.freeze)Object.freeze=function(a){return a};try{Object.freeze(function(){})}catch(D){Object.freeze=
function(a){return function(d){return"function"==typeof d?d:a(d)}}(Object.freeze)}if(!Object.preventExtensions)Object.preventExtensions=function(a){return a};if(!Object.isSealed)Object.isSealed=function(){return!1};if(!Object.isFrozen)Object.isFrozen=function(){return!1};if(!Object.isExtensible)Object.isExtensible=function(a){if(Object(a)!==a)throw new TypeError;for(var d="";h(a,d);)d+="?";a[d]=!0;var b=h(a,d);delete a[d];return b};if(!Object.keys){var w=!0,x="toString,toLocaleString,valueOf,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,constructor".split(","),
z=x.length,j;for(j in{toString:null})w=!1;Object.keys=function(a){if("object"!=typeof a&&"function"!=typeof a||null===a)throw new TypeError("Object.keys called on a non-object");var d=[],b;for(b in a)h(a,b)&&d.push(b);if(w)for(b=0;b<z;b++){var c=x[b];h(a,c)&&d.push(c)}return d}}if(!Date.prototype.toISOString||-1===(new Date(-621987552E5)).toISOString().indexOf("-000001"))Date.prototype.toISOString=function(){var a,d,b,c;if(!isFinite(this))throw new RangeError;a=[this.getUTCMonth()+1,this.getUTCDate(),
this.getUTCHours(),this.getUTCMinutes(),this.getUTCSeconds()];c=this.getUTCFullYear();c=(0>c?"-":9999<c?"+":"")+("00000"+Math.abs(c)).slice(0<=c&&9999>=c?-4:-6);for(d=a.length;d--;)b=a[d],10>b&&(a[d]="0"+b);return c+"-"+a.slice(0,2).join("-")+"T"+a.slice(2).join(":")+"."+("000"+this.getUTCMilliseconds()).slice(-3)+"Z"};if(!Date.now)Date.now=function(){return(new Date).getTime()};if(!Date.prototype.toJSON)Date.prototype.toJSON=function(){if("function"!=typeof this.toISOString)throw new TypeError;return this.toISOString()};
if(!Date.parse||864E13!==Date.parse("+275760-09-13T00:00:00.000Z"))Date=function(a){var d=function g(b,d,c,f,h,i,j){var k=arguments.length;return this instanceof a?(k=1==k&&""+b===b?new a(g.parse(b)):7<=k?new a(b,d,c,f,h,i,j):6<=k?new a(b,d,c,f,h,i):5<=k?new a(b,d,c,f,h):4<=k?new a(b,d,c,f):3<=k?new a(b,d,c):2<=k?new a(b,d):1<=k?new a(b):new a,k.constructor=g,k):a.apply(this,arguments)},b=RegExp("^(\\d{4}|[+-]\\d{6})(?:-(\\d{2})(?:-(\\d{2})(?:T(\\d{2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d{3}))?)?(?:Z|(?:([-+])(\\d{2}):(\\d{2})))?)?)?)?$"),
c;for(c in a)d[c]=a[c];d.now=a.now;d.UTC=a.UTC;d.prototype=a.prototype;d.prototype.constructor=d;d.parse=function(d){var c=b.exec(d);if(c){c.shift();for(var f=1;7>f;f++)c[f]=+(c[f]||(3>f?1:0)),1==f&&c[f]--;var h=+c.pop(),i=+c.pop(),j=c.pop(),f=0;if(j){if(23<i||59<h)return NaN;f=6E4*(60*i+h)*("+"==j?-1:1)}h=+c[0];return 0<=h&&99>=h?(c[0]=h+400,a.UTC.apply(this,c)+f-126227808E5):a.UTC.apply(this,c)+f}return a.parse.apply(this,arguments)};return d}(Date);j="\t\n\u000b\u000c\r \u00a0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029\ufeff";
if(!String.prototype.trim||j.trim()){j="["+j+"]";var A=RegExp("^"+j+j+"*"),B=RegExp(j+j+"*$");String.prototype.trim=function(){return(""+this).replace(A,"").replace(B,"")}}var v=function(a){a=+a;a!==a?a=0:0!==a&&a!==1/0&&a!==-(1/0)&&(a=(0<a||-1)*Math.floor(Math.abs(a)));return a},C="a"!="a"[0],i=function(a){if(null==a)throw new TypeError;return C&&"string"==typeof a&&a?a.split(""):Object(a)}});

});
