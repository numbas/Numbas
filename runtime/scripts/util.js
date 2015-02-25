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

/** @file Convenience functions, extensions to javascript built-ins, etc. Provides {@link Numbas.util}. Includes es5-shim.js */

Numbas.queueScript('util',['base','math'],function() {

/** @namespace Numbas.util */

var util = Numbas.util = /** @lends Numbas.util */ {

	/** Derive type B from A (class inheritance, really)
	 *
	 * B's prototype supercedes A's.
	 * @param {function} a - the constructor for the parent class
	 * @param {function} b - a constructor to be called after `a`'s constructor is done.
	 * @returns {function} a constructor for the derived class
	 */
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

	/** Clone an array, with array elements copied too.
	 * Array.splice() will create a copy of an array, but the elements are the same objects, which can cause fruity bugs.
	 * This function clones the array elements as well, so there should be no side-effects when operating on the cloned array.
	 * @param {Array} arr
	 * @param {boolean} deep - if true, do a deep copy of each element
	 * @see Numbas.util.copyobj
	 * @returns {Array}
	 */
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

	/** Clone an object.
	 * @param {object} obj
	 * @param {boolean} deep - if true, each property is cloned as well (recursively) so there should be no side-effects when operating on the cloned object.
	 * @returns {object}
	 */
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

	/** Shallow copy an object into an already existing object
	 * (add all src's properties to dest)
	 * @param {object} src
	 * @param {object} dest
	 */
	copyinto: function(src,dest)
	{
		for(var x in src)
		{
			if(dest[x]===undefined)
				dest[x]=src[x]
		}
	},

	/** Generic equality test on {@link Numbas.jme.token}s
	 * @param {Numbas.jme.token} a
	 * @param {Numbas.jme.token} b
	 * @returns {boolean}
	 */
	eq: function(a,b) {
		if(a.type != b.type)
			return false;
		if(a.type in util.equalityTests) {
			return util.equalityTests[a.type](a,b);
		} else {
			throw(new Numbas.Error('util.equality not defined for type %s',a.type));
		}
	},

	equalityTests: {
		'number': function(a,b) {
			return Numbas.math.eq(a.value,b.value);
		},
		'vector': function(a,b) {
			return Numbas.vectormath.eq(a.value,b.value);
		},
		'matrix': function(a,b) {
			return Numbas.matrixmath.eq(a.value,b.value);
		},
		'list': function(a,b) {
			return a.value.length==b.value.length && a.value.filter(function(ae,i){return !util.eq(ae,b.value[i])}).length==0;
		},
		'set': function(a,b) {
			return Numbas.setmath.eq(a.value,b.value);
		},
		'range': function(a,b) {
			return a.value[0]==b.value[0] && a.value[1]==b.value[1] && a.value[2]==b.value[2];
		},
		'name': function(a,b) {
			return a.name == b.name;
		},
		'string': function(a,b) {
			return a.value==b.value;
		},
		'boolean': function(a,b) {
			return a.value==b.value;
		},
	},


	/** Generic inequality test on {@link Numbas.jme.token}s
	 * @param {Numbas.jme.token} a
	 * @param {Numbas.jme.token} b
	 * @returns {boolean}
	 * @see Numbas.util.eq
	 */
	neq: function(a,b) {
		return !util.eq(a,b);
	},

	/** Filter out values in `exclude` from `list`
	 * @param {Numbas.jme.types.TList} list
	 * @param {Numbas.jme.types.TList} exclude
	 * @returns {Array}
	 */
	except: function(list,exclude) {
		return list.filter(function(l) {
			for(var i=0;i<exclude.length;i++) {
				if(util.eq(l,exclude[i]))
					return false;
			}
			return true;
		});
	},

	/** Return a copy of the input list with duplicates removed
	 * @param {array} list
	 * @returns {list}
	 * @see Numbas.util.eq
	 */
	distinct: function(list) {
		if(list.length==0) {
			return [];
		}
		var out = [list[0]];
		for(var i=1;i<list.length;i++) {
			var got = false;
			for(var j=0;j<out.length;j++) {
				if(util.eq(list[i],out[j])) {
					got = true;
					break;
				}
			}
			if(!got) {
				out.push(list[i]);
			}
		}
		return out;
	},

	/** Is value in the list?
	 * @param {array} list
	 * @param {Numbas.jme.token} value
	 * @returns {boolean}
	 */
	contains: function(list,value) {
		for(var i=0;i<list.length;i++) {
			if(util.eq(value,list[i])) {
				return true;
			}
		}
		return false;
	},

	/** Test if parameter is an integer
	 * @param {object} i
	 * @returns {boolean}
	 */
	isInt: function(i)
	{
		return parseInt(i,10)==i;
	},

	/** Test if parameter is a float
	 * @param {object} f
	 * @returns {boolean}
	 */
	isFloat: function(f)
	{
		return parseFloat(f)==f;
	},

	/** Is `n` a number? i.e. `!isNaN(n)`, or is `n` "infinity", or if `allowFractions` is true, is `n` a fraction?
	 * @param {number} n
	 * @param {boolean} allowFractions
	 * @returns {boolean}
	 */
	isNumber: function(n,allowFractions) {
		if(!isNaN(n)) {
			return true;
		}
		n = n.toString().trim();
		if(/-?infinity/i.test(n)) {
			return true;
		} else if(allowFractions && util.re_fraction.test(n)) {
			return true;
		} else {
			return false;
		}
	},

	/** Wrap a list index so -1 maps to length-1
	 * @param {number} n
	 * @param {number} size
	 * @returns {number}
	 */
	wrapListIndex: function(n,size) {
		if(n<0) {
			n += size;
		}
		return n;
	},

	/** Test if parameter is a boolean - that is: a boolean literal, or any of the strings 'false','true','yes','no', case-insensitive.
	 * @param {object} b
	 * @returns {boolean}
	 */
	isBool: function(b)
	{
		if(b==null) { return false; }
		if(typeof(b)=='boolean') { return true; }

		b = b.toString().toLowerCase();
		return b=='false' || b=='true' || b=='yes' || b=='no';
	},

	/** Parse a string as HTML, and return true only if it contains non-whitespace text
	 * @param {string} html
	 * @returns {boolean}
	 */
	isNonemptyHTML: function(html) {
		var d = document.createElement('div');
		d.innerHTML = html;
		return $(d).text().trim().length>0;
	},

	/** Parse parameter as a boolean. The boolean value `true` and the strings 'true' and 'yes' are parsed as the value `true`, everything else is `false`.
	 * @param {object} b
	 * @returns {boolean}
	 */
	parseBool: function(b)
	{
		if(!b)
			return false;
		b = b.toString().toLowerCase();
		return( b=='true' || b=='yes' );
	},

	/** Regular expression recognising a fraction */
	re_fraction: /^\s*(-?)\s*(\d+)\s*\/\s*(\d+)\s*/,

	/** Parse a number - either parseFloat, or parse a fraction
	 * @param {string} s
	 * @returns {number}
	 */
	parseNumber: function(s,allowFractions) {
		s = s.toString().trim();
		var m;
		if(util.isFloat(s)) {
			return parseFloat(s);
		} else if(s.toLowerCase()=='infinity') {
			return Infinity;
		} else if(s.toLowerCase()=='-infinity') {
			return -Infinity;
		} else if(allowFractions && (m = util.re_fraction.exec(s))) {
			var n = parseInt(m[2])/parseInt(m[3]);
			return m[1] ? -n : n;
		} else {
			return NaN;
		}
	},

	/** Pad string `s` on the left with a character `p` until it is `n` characters long.
	 * @param {string} s
	 * @param {number} n
	 * @param {string} p
	 * @returns {string}
	 */
	lpad: function(s,n,p)
	{
		s=s.toString();
		p=p[0];
		while(s.length<n) { s=p+s; }
		return s;
	},

	/** Replace occurences of `%s` with the extra arguments of the function
	 * @example formatString('hello %s %s','Mr.','Perfect') => 'hello Mr. Perfect'
	 * @param {string} str
	 * @param {...string} value - string to substitute
	 * @returns {string}
	 */
	formatString: function(str)
	{
		var i=0;
		for(var i=1;i<arguments.length;i++)
		{
			str=str.replace(/%s/,arguments[i]);
		}
		return str;
	},

	/** Format an amount of currency
	 * @example currency(5.3,'£','p') => £5.30
	 * @param {number} n
	 * @param {string} prefix - symbol to use in front of currency if abs(n) >= 1
	 * @param {string} suffix - symbol to use in front of currency if abs(n) <= 1
	 */
	currency: function(n,prefix,suffix) {
		if(n<0)
			return '-'+util.currency(-n,prefix,suffix);
		else if(n==0) {
			return prefix+'0';
		}

		var s = Numbas.math.niceNumber(Math.floor(100*n));
		if(Math.abs(n)>=1) {
			if(n%1<0.005)
				return prefix+Numbas.math.niceNumber(n);
			s = s.replace(/(..)$/,'.$1');
			return prefix+s
		} else {
			return s+suffix;
		}
	},

	/** Get rid of the % on the end of percentages and parse as float, then divide by 100
	 * @example unPercent('50%') => 0.5
	 * @example unPercent('50') => 0.5
	 * @param {string} s
	 * @returns {number}
	 */
	unPercent: function(s)
	{
		return (parseFloat(s.replace(/%/,''))/100);
	},


	/** Pluralise a word
	 * 
	 * If `n` is not unity, return `plural`, else return `singular`
	 * @param {number} n
	 * @param {string} singular - string to return if `n` is +1 or -1
	 * @param {string} plural - string to returns if `n` is not +1 or -1
	 * @returns {string}
	 */
	pluralise: function(n,singular,plural)
	{
		n = Numbas.math.precround(n,10);
		if(n==-1 || n==1)
			return singular;
		else
			return plural;
	},

	/** Make the first letter in the string a capital
	 * @param {string} str
	 * @returns {string}
	 */
	capitalise: function(str) {
		return str.replace(/^[a-z]/,function(c){return c.toUpperCase()});
	},

	/** Split a string up according to brackets
	 *
	 * Strips out nested brackets
	 * @example splitbrackets('a{{b}}c','{','}') => ['a','b','c']
	 * @param {string} t - string to split
	 * @param {string} lb - left bracket character
	 * @param {string} rb - right bracket character
	 * @returns {string[]} - alternating strings in brackets and strings outside: odd-numbered indices are inside brackets.
	 */
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
			else if(depth>0 && t.charAt(i)==rb && !(i>0 && t.charAt(i-1)=='\\'))
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

	/** Because XML doesn't like having ampersands hanging about, replace them with escape codes
	 * @param {string} str - XML string
	 * @returns {string}
	 */
	escapeHTML: function(str)
	{
		return str.replace(/&/g,'&amp;');
	},

	/** Create a comparison function which sorts objects by a particular property
	 * @param {string} prop - name of the property to sort by
	 * @returns {function}
	 */
	sortBy: function(prop) {
		return function(a,b) {
			if(a[prop]>b[prop])
				return 1;
			else if(a[prop]<b[prop])
				return -1;
			else
				return 0;
		}
	},

	/** Hash a string into a string of digits
	 * 
	 * From {@link http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/}
	 */
	hashCode: function(str){
		var hash = 0, i, c;
		if (str.length == 0) return hash;
		for (i = 0; i < str.length; i++) {
			c = str.charCodeAt(i);
			hash = ((hash<<5)-hash)+c;
		}
		if(hash<0)
			return '0'+(-hash);
		else
			return '1'+hash;
	},

	/** Cartesian product of one or more lists
	 * @param {array} lists - list of arrays
	 * @returns {array}
	 */
	product: function(lists) {
		var indexes = lists.map(function(){return 0});
		var lengths = lists.map(function(l){return l.length});
		var end = lists.length-1;

		var out = [];
		while(indexes[0]!=lengths[0]) {
			out.push(indexes.map(function(i,n){return lists[n][i]}));
			var k = end;
			indexes[k] += 1;
			while(k>0 && indexes[k]==lengths[k]) {
				indexes[k] = 0;
				k -= 1;
				indexes[k] += 1;
			}
		}
		return out;
	},

	/** Zip lists together: given lists [a,b,c,...], [x,y,z,...], return [[a,x],[b,y],[c,z], ...]
	 * @param {array} lists - list of arrays
	 * @returns {array}
	 */
	zip: function(lists) {
		var out = [];
		for(var i=0;true;i++) {
			var z = [];
			for(var j=0;j<lists.length;j++) {
				if(i<lists[j].length) {
					z.push(lists[j][i]);
				} else {
					return out;
				}
			}
			out.push(z);
		}
	},

	/** All combinations of r items from given array, without replacement
	 * @param {array} list
	 * @param {number} r
	 */
	combinations: function(list,r) {
		var indexes = [];
		for(var i=0;i<r;i++) {
			indexes.push(i);
		}
		var length = list.length;
		var end = r-1;

		var out = [];
		var steps = 0;
		while(steps<1000 && indexes[0]<length+1-r) {
			steps += 1;

			out.push(indexes.map(function(i){return list[i]; }));
			indexes[end] += 1;
			if(indexes[end]==length) {
				var k = end;
				while(k>=0 && indexes[k]==length+1-r+k) {
					k -= 1;
					indexes[k] += 1;
				}
				for(k=k+1;k<r;k++) {
					indexes[k] = indexes[k-1]+1;
				}
			}
		}
		return out;
	},

	
	/** All combinations of r items from given array, with replacement
	 * @param {array} list
	 * @param {number} r
	 */
	combinations_with_replacement: function(list,r) {
		var indexes = [];
		for(var i=0;i<r;i++) {
			indexes.push(0);
		}
		var length = list.length;
		var end = r-1;

		var out = [];
		while(indexes[0]<length) {
			out.push(indexes.map(function(i){return list[i]; }));
			indexes[end] += 1;
			if(indexes[end]==length) {
				var k = end;
				while(k>=0 && indexes[k]==length) {
					k -= 1;
					indexes[k] += 1;
				}
				for(k=k+1;k<r;k++) {
					indexes[k] = indexes[k-1];
				}
			}
		}
		return out;
	},


	/** All permutations of all choices of r elements from list
	 *
	 * Inspired by the algorithm in Python's itertools library
	 * @param {array} list - elements to choose and permute
	 * @param {number} r - number of elements to choose
	 */
	permutations: function(list,r) {
		var n = list.length;
		if(r===undefined) {
			r = n;
		}
		var indices = [];
		var cycles = [];
		for(var i=0;i<n;i++) {
			indices.push(i);
		}
		for(var i=n;i>=n-r+1;i--) {
			cycles.push(i);
		}

		var out = [indices.slice(0,r).map(function(v){return list[v]})];

		while(n) {
			for(var i=r-1;i>=0;i--) {
				cycles[i] -= 1
				if(cycles[i]==0) {
					indices.push(indices.splice(i,1)[0]);
					cycles[i] = n-i
				} else {
					var j = cycles[i];
					var t = indices[i];
					indices[i] = indices[n-j];
					indices[n-j] = t;
					out.push(indices.slice(0,r).map(function(v){return list[v]}));
					break;
				}
			}
			if(i==-1) {
				return out;
			}
		}
	}
	
};

var endDelimiters = {
    '$': /[^\\]\$/,
    '\\(': /[^\\]\\\)/,
    '$$': /[^\\]\$\$/,
    '\\[': /[^\\]\\\]/
}
var re_startMaths = /(^|[^\\])(?:\$\$|\$)|\\\(|\\\[|\\begin\{(\w+)\}/;

/** Split a string up by TeX delimiters (`$`, `\[`, `\]`)
 *
 * `bits.re_end` stores the delimiter if the returned array has unfinished maths at the end
 * @param {string} txt - string to split up
 * @param {RegExp} re_end - If tex is split across several strings (e.g. text nodes with <br> in the middle), this can be used to give the end delimiter for unfinished maths 
 * @returns {string[]} bits - stuff outside TeX, left delimiter, TeX, right delimiter, stuff outside TeX, ...
 * @example contentsplitbrackets('hello $x+y$ and \[this\] etc') => ['hello ','$','x+y','$',' and ','\[','this','\]']
 * @memberof Numbas.util
 * @method
 */
var contentsplitbrackets = util.contentsplitbrackets = function(txt,re_end) {
    var i = 0;
    var m;
    var startDelimiter='', endDelimiter='';
	var startText = '';
    var start='', end='';
    var startChop, endChop;
    var re_end;
	var bits = [];
	
    while(txt.length) {
		if(!re_end) {
			m = re_startMaths.exec(txt);
			
			if(!m) {     // if no maths delimiters, we're done
				bits.push(txt);
				txt = '';
				break;
			}
			
			startDelimiter = m[0];
			var start = m.index;
			
			startChop = start+startDelimiter.length;
			startText = txt.slice(0,start);
			if(m[1]) {
				startText += m[1];
				startDelimiter = startDelimiter.slice(m[1].length);
			}
			txt = txt.slice(startChop);

			if(startDelimiter.match(/^\\begin/m)) {    //if this is an environment, construct a regexp to find the corresponding \end{} command.
				var environment = m[1];
				re_end = new RegExp('[^\\\\]\\\\end\\{'+environment+'\\}');    // don't ask if this copes with nested environments
			}
			else if(startDelimiter.match(/^(?:.|[\r\n])\$/m)) {
				re_end = endDelimiters[startDelimiter.slice(1)];
			} else {
				re_end = endDelimiters[startDelimiter];    // get the corresponding end delimiter for the matched start delimiter
			}
		}
        
        m = re_end.exec(txt);
        
        if(!m) {    // if no ending delimiter, the text contains no valid maths
			bits.push(startText,startDelimiter,txt);
			bits.re_end = re_end;
			txt = '';
			break;
        }
        
        endDelimiter = m[0].slice(1);
        var end = m.index+1;    // the end delimiter regexp has a "not a backslash" character at the start because JS regexps don't do negative lookbehind
        endChop = end+endDelimiter.length;
		var math = txt.slice(0,end);
		txt = txt.slice(endChop);
		i += startChop+endChop;

		bits.push(startText,startDelimiter,math,endDelimiter);
		re_end = null;
    }
	return bits;
}

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


// es5-shim.min.js 24/09/2012
//
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
// Module systems magic dance
(function (definition) {
    // RequireJS
    if (typeof define == "function") {
        define(definition);
    // CommonJS and <script>
    } else {
        definition();
    }
})(function () {

/**
 * Brings an environment as close to ECMAScript 5 compliance
 * as is possible with the facilities of erstwhile engines.
 *
 * Annotated ES5: http://es5.github.com/ (specific links below)
 * ES5 Spec: http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf
 * Required reading: http://javascriptweblog.wordpress.com/2011/12/05/extending-javascript-natives/
 */

//
// Function
// ========
//

// ES-5 15.3.4.5
// http://es5.github.com/#x15.3.4.5

if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(that) { // .length is 1
        // 1. Let Target be the this value.
        var target = this;
        // 2. If IsCallable(Target) is false, throw a TypeError exception.
        if (typeof target != "function") {
            throw new TypeError("Function.prototype.bind called on incompatible " + target);
        }
        // 3. Let A be a new (possibly empty) internal list of all of the
        //   argument values provided after thisArg (arg1, arg2 etc), in order.
        // XXX slicedArgs will stand in for "A" if used
        var args = slice.call(arguments, 1); // for normal call
        // 4. Let F be a new native ECMAScript object.
        // 11. Set the [[Prototype]] internal property of F to the standard
        //   built-in Function prototype object as specified in 15.3.3.1.
        // 12. Set the [[Call]] internal property of F as described in
        //   15.3.4.5.1.
        // 13. Set the [[Construct]] internal property of F as described in
        //   15.3.4.5.2.
        // 14. Set the [[HasInstance]] internal property of F as described in
        //   15.3.4.5.3.
        var bound = function () {

            if (this instanceof bound) {
                // 15.3.4.5.2 [[Construct]]
                // When the [[Construct]] internal method of a function object,
                // F that was created using the bind function is called with a
                // list of arguments ExtraArgs, the following steps are taken:
                // 1. Let target be the value of F's [[TargetFunction]]
                //   internal property.
                // 2. If target has no [[Construct]] internal method, a
                //   TypeError exception is thrown.
                // 3. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the
                //   list boundArgs in the same order followed by the same
                //   values as the list ExtraArgs in the same order.
                // 5. Return the result of calling the [[Construct]] internal
                //   method of target providing args as the arguments.

                var F = function(){};
                F.prototype = target.prototype;
                var self = new F;

                var result = target.apply(
                    self,
                    args.concat(slice.call(arguments))
                );
                if (Object(result) === result) {
                    return result;
                }
                return self;

            } else {
                // 15.3.4.5.1 [[Call]]
                // When the [[Call]] internal method of a function object, F,
                // which was created using the bind function is called with a
                // this value and a list of arguments ExtraArgs, the following
                // steps are taken:
                // 1. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 2. Let boundThis be the value of F's [[BoundThis]] internal
                //   property.
                // 3. Let target be the value of F's [[TargetFunction]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the
                //   list boundArgs in the same order followed by the same
                //   values as the list ExtraArgs in the same order.
                // 5. Return the result of calling the [[Call]] internal method
                //   of target providing boundThis as the this value and
                //   providing args as the arguments.

                // equiv: target.call(this, ...boundArgs, ...args)
                return target.apply(
                    that,
                    args.concat(slice.call(arguments))
                );

            }

        };
        // XXX bound.length is never writable, so don't even try
        //
        // 15. If the [[Class]] internal property of Target is "Function", then
        //     a. Let L be the length property of Target minus the length of A.
        //     b. Set the length own property of F to either 0 or L, whichever is
        //       larger.
        // 16. Else set the length own property of F to 0.
        // 17. Set the attributes of the length own property of F to the values
        //   specified in 15.3.5.1.

        // TODO
        // 18. Set the [[Extensible]] internal property of F to true.

        // TODO
        // 19. Let thrower be the [[ThrowTypeError]] function Object (13.2.3).
        // 20. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "caller", PropertyDescriptor {[[Get]]: thrower, [[Set]]:
        //   thrower, [[Enumerable]]: false, [[Configurable]]: false}, and
        //   false.
        // 21. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "arguments", PropertyDescriptor {[[Get]]: thrower,
        //   [[Set]]: thrower, [[Enumerable]]: false, [[Configurable]]: false},
        //   and false.

        // TODO
        // NOTE Function objects created using Function.prototype.bind do not
        // have a prototype property or the [[Code]], [[FormalParameters]], and
        // [[Scope]] internal properties.
        // XXX can't delete prototype in pure-js.

        // 22. Return F.
        return bound;
    };
}

// Shortcut to an often accessed properties, in order to avoid multiple
// dereference that costs universally.
// _Please note: Shortcuts are defined after `Function.prototype.bind` as we
// us it in defining shortcuts.
var call = Function.prototype.call;
var prototypeOfArray = Array.prototype;
var prototypeOfObject = Object.prototype;
var slice = prototypeOfArray.slice;
// Having a toString local variable name breaks in Opera so use _toString.
var _toString = call.bind(prototypeOfObject.toString);
var owns = call.bind(prototypeOfObject.hasOwnProperty);

// If JS engine supports accessors creating shortcuts.
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;
if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
}

//
// Array
// =====
//

// ES5 15.4.3.2
// http://es5.github.com/#x15.4.3.2
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
if (!Array.isArray) {
    Array.isArray = function isArray(obj) {
        return _toString(obj) == "[object Array]";
    };
}

// The IsCallable() check in the Array functions
// has been replaced with a strict check on the
// internal class of the object to trap cases where
// the provided function was actually a regular
// expression literal, which in V8 and
// JavaScriptCore is a typeof "function".  Only in
// V8 are regular expression literals permitted as
// reduce parameters, so it is desirable in the
// general case for the shim to match the more
// strict and common behavior of rejecting regular
// expressions.

// ES5 15.4.4.18
// http://es5.github.com/#x15.4.4.18
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/forEach
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(fun /*, thisp*/) {
        var self = toObject(this),
            thisp = arguments[1],
            i = -1,
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        while (++i < length) {
            if (i in self) {
                // Invoke the callback function with call, passing arguments:
                // context, property value, property key, thisArg object context
                fun.call(thisp, self[i], i, self);
            }
        }
    };
}

// ES5 15.4.4.19
// http://es5.github.com/#x15.4.4.19
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
if (!Array.prototype.map) {
    Array.prototype.map = function map(fun /*, thisp*/) {
        var self = toObject(this),
            length = self.length >>> 0,
            result = Array(length),
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self)
                result[i] = fun.call(thisp, self[i], i, self);
        }
        return result;
    };
}

// ES5 15.4.4.20
// http://es5.github.com/#x15.4.4.20
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
if (!Array.prototype.filter) {
    Array.prototype.filter = function filter(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            result = [],
            value,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self) {
                value = self[i];
                if (fun.call(thisp, value, i, self)) {
                    result.push(value);
                }
            }
        }
        return result;
    };
}

// ES5 15.4.4.16
// http://es5.github.com/#x15.4.4.16
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
if (!Array.prototype.every) {
    Array.prototype.every = function every(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && !fun.call(thisp, self[i], i, self)) {
                return false;
            }
        }
        return true;
    };
}

// ES5 15.4.4.17
// http://es5.github.com/#x15.4.4.17
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
    Array.prototype.some = function some(fun /*, thisp */) {
        var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, self)) {
                return true;
            }
        }
        return false;
    };
}

// ES5 15.4.4.21
// http://es5.github.com/#x15.4.4.21
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduce
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function reduce(fun /*, initial*/) {
        var self = toObject(this),
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        // no value to return if no initial value and an empty array
        if (!length && arguments.length == 1) {
            throw new TypeError('reduce of empty array with no initial value');
        }

        var i = 0;
        var result;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i++];
                    break;
                }

                // if array contains no values, no initial value to return
                if (++i >= length) {
                    throw new TypeError('reduce of empty array with no initial value');
                }
            } while (true);
        }

        for (; i < length; i++) {
            if (i in self) {
                result = fun.call(void 0, result, self[i], i, self);
            }
        }

        return result;
    };
}

// ES5 15.4.4.22
// http://es5.github.com/#x15.4.4.22
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduceRight
if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
        var self = toObject(this),
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        // no value to return if no initial value, empty array
        if (!length && arguments.length == 1) {
            throw new TypeError('reduceRight of empty array with no initial value');
        }

        var result, i = length - 1;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i--];
                    break;
                }

                // if array contains no values, no initial value to return
                if (--i < 0) {
                    throw new TypeError('reduceRight of empty array with no initial value');
                }
            } while (true);
        }

        do {
            if (i in this) {
                result = fun.call(void 0, result, self[i], i, self);
            }
        } while (i--);

        return result;
    };
}

// ES5 15.4.4.14
// http://es5.github.com/#x15.4.4.14
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
        var self = toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }

        var i = 0;
        if (arguments.length > 1) {
            i = toInteger(arguments[1]);
        }

        // handle negative indices
        i = i >= 0 ? i : Math.max(0, length + i);
        for (; i < length; i++) {
            if (i in self && self[i] === sought) {
                return i;
            }
        }
        return -1;
    };
}

// ES5 15.4.4.15
// http://es5.github.com/#x15.4.4.15
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf
if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
        var self = toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }
        var i = length - 1;
        if (arguments.length > 1) {
            i = Math.min(i, toInteger(arguments[1]));
        }
        // handle negative indices
        i = i >= 0 ? i : length - Math.abs(i);
        for (; i >= 0; i--) {
            if (i in self && sought === self[i]) {
                return i;
            }
        }
        return -1;
    };
}

//
// Object
// ======
//

// ES5 15.2.3.2
// http://es5.github.com/#x15.2.3.2
if (!Object.getPrototypeOf) {
    // https://github.com/kriskowal/es5-shim/issues#issue/2
    // http://ejohn.org/blog/objectgetprototypeof/
    // recommended by fschaefer on github
    Object.getPrototypeOf = function getPrototypeOf(object) {
        return object.__proto__ || (
            object.constructor
                ? object.constructor.prototype
                : prototypeOfObject
        );
    };
}

// ES5 15.2.3.3
// http://es5.github.com/#x15.2.3.3
if (!Object.getOwnPropertyDescriptor) {
    var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a non-object: ";

    Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
        if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError(ERR_NON_OBJECT + object);
        }
        // If object does not owns property return undefined immediately.
        if (!owns(object, property)) {
            return;
        }

        // If object has a property then it's for sure both `enumerable` and
        // `configurable`.
        var descriptor =  { enumerable: true, configurable: true };

        // If JS engine supports accessor properties then property may be a
        // getter or setter.
        if (supportsAccessors) {
            // Unfortunately `__lookupGetter__` will return a getter even
            // if object has own non getter property along with a same named
            // inherited getter. To avoid misbehavior we temporary remove
            // `__proto__` so that `__lookupGetter__` will return getter only
            // if it's owned by an object.
            var prototype = object.__proto__;
            object.__proto__ = prototypeOfObject;

            var getter = lookupGetter(object, property);
            var setter = lookupSetter(object, property);

            // Once we have getter and setter we can put values back.
            object.__proto__ = prototype;

            if (getter || setter) {
                if (getter) {
                    descriptor.get = getter;
                }
                if (setter) {
                    descriptor.set = setter;
                }
                // If it was accessor property we're done and return here
                // in order to avoid adding `value` to the descriptor.
                return descriptor;
            }
        }

        // If we got this far we know that object has an own property that is
        // not an accessor so we set it as a value and return descriptor.
        descriptor.value = object[property];
        return descriptor;
    };
}

// ES5 15.2.3.4
// http://es5.github.com/#x15.2.3.4
if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
        return Object.keys(object);
    };
}

// ES5 15.2.3.5
// http://es5.github.com/#x15.2.3.5
if (!Object.create) {
    Object.create = function create(prototype, properties) {
        var object;
        if (prototype === null) {
            object = { "__proto__": null };
        } else {
            if (typeof prototype != "object") {
                throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
            }
            var Type = function () {};
            Type.prototype = prototype;
            object = new Type();
            // IE has no built-in implementation of `Object.getPrototypeOf`
            // neither `__proto__`, but this manually setting `__proto__` will
            // guarantee that `Object.getPrototypeOf` will work as expected with
            // objects created using `Object.create`
            object.__proto__ = prototype;
        }
        if (properties !== void 0) {
            Object.defineProperties(object, properties);
        }
        return object;
    };
}

// ES5 15.2.3.6
// http://es5.github.com/#x15.2.3.6

// Patch for WebKit and IE8 standard mode
// Designed by hax <hax.github.com>
// related issue: https://github.com/kriskowal/es5-shim/issues#issue/5
// IE8 Reference:
//     http://msdn.microsoft.com/en-us/library/dd282900.aspx
//     http://msdn.microsoft.com/en-us/library/dd229916.aspx
// WebKit Bugs:
//     https://bugs.webkit.org/show_bug.cgi?id=36423

function doesDefinePropertyWork(object) {
    try {
        Object.defineProperty(object, "sentinel", {});
        return "sentinel" in object;
    } catch (exception) {
        // returns falsy
    }
}

// check whether defineProperty works if it's given. Otherwise,
// shim partially.
if (Object.defineProperty) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document == "undefined" ||
        doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
        var definePropertyFallback = Object.defineProperty;
    }
}

if (!Object.defineProperty || definePropertyFallback) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                                      "on this javascript engine";

    Object.defineProperty = function defineProperty(object, property, descriptor) {
        if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
        }
        if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null) {
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
        }
        // make a valiant attempt to use the real defineProperty
        // for I8's DOM elements.
        if (definePropertyFallback) {
            try {
                return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
                // try the shim if the real one doesn't work
            }
        }

        // If it's a data property.
        if (owns(descriptor, "value")) {
            // fail silently if "writable", "enumerable", or "configurable"
            // are requested but not supported
            /*
            // alternate approach:
            if ( // can't implement these features; allow false but not true
                !(owns(descriptor, "writable") ? descriptor.writable : true) ||
                !(owns(descriptor, "enumerable") ? descriptor.enumerable : true) ||
                !(owns(descriptor, "configurable") ? descriptor.configurable : true)
            )
                throw new RangeError(
                    "This implementation of Object.defineProperty does not " +
                    "support configurable, enumerable, or writable."
                );
            */

            if (supportsAccessors && (lookupGetter(object, property) ||
                                      lookupSetter(object, property)))
            {
                // As accessors are supported only on engines implementing
                // `__proto__` we can safely override `__proto__` while defining
                // a property to make sure that we don't hit an inherited
                // accessor.
                var prototype = object.__proto__;
                object.__proto__ = prototypeOfObject;
                // Deleting a property anyway since getter / setter may be
                // defined on object itself.
                delete object[property];
                object[property] = descriptor.value;
                // Setting original `__proto__` back now.
                object.__proto__ = prototype;
            } else {
                object[property] = descriptor.value;
            }
        } else {
            if (!supportsAccessors) {
                throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            }
            // If we got that far then getters and setters can be defined !!
            if (owns(descriptor, "get")) {
                defineGetter(object, property, descriptor.get);
            }
            if (owns(descriptor, "set")) {
                defineSetter(object, property, descriptor.set);
            }
        }
        return object;
    };
}

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
if (!Object.defineProperties) {
    Object.defineProperties = function defineProperties(object, properties) {
        for (var property in properties) {
            if (owns(properties, property) && property != "__proto__") {
                Object.defineProperty(object, property, properties[property]);
            }
        }
        return object;
    };
}

// ES5 15.2.3.8
// http://es5.github.com/#x15.2.3.8
if (!Object.seal) {
    Object.seal = function seal(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// ES5 15.2.3.9
// http://es5.github.com/#x15.2.3.9
if (!Object.freeze) {
    Object.freeze = function freeze(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// detect a Rhino bug and patch it
try {
    Object.freeze(function () {});
} catch (exception) {
    Object.freeze = (function freeze(freezeObject) {
        return function freeze(object) {
            if (typeof object == "function") {
                return object;
            } else {
                return freezeObject(object);
            }
        };
    })(Object.freeze);
}

// ES5 15.2.3.10
// http://es5.github.com/#x15.2.3.10
if (!Object.preventExtensions) {
    Object.preventExtensions = function preventExtensions(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// ES5 15.2.3.11
// http://es5.github.com/#x15.2.3.11
if (!Object.isSealed) {
    Object.isSealed = function isSealed(object) {
        return false;
    };
}

// ES5 15.2.3.12
// http://es5.github.com/#x15.2.3.12
if (!Object.isFrozen) {
    Object.isFrozen = function isFrozen(object) {
        return false;
    };
}

// ES5 15.2.3.13
// http://es5.github.com/#x15.2.3.13
if (!Object.isExtensible) {
    Object.isExtensible = function isExtensible(object) {
        // 1. If Type(O) is not Object throw a TypeError exception.
        if (Object(object) !== object) {
            throw new TypeError(); // TODO message
        }
        // 2. Return the Boolean value of the [[Extensible]] internal property of O.
        var name = '';
        while (owns(object, name)) {
            name += '?';
        }
        object[name] = true;
        var returnValue = owns(object, name);
        delete object[name];
        return returnValue;
    };
}

// ES5 15.2.3.14
// http://es5.github.com/#x15.2.3.14
if (!Object.keys) {
    // http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
    var hasDontEnumBug = true,
        dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
        ],
        dontEnumsLength = dontEnums.length;

    for (var key in {"toString": null}) {
        hasDontEnumBug = false;
    }

    Object.keys = function keys(object) {

        if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError("Object.keys called on a non-object");
        }

        var keys = [];
        for (var name in object) {
            if (owns(object, name)) {
                keys.push(name);
            }
        }

        if (hasDontEnumBug) {
            for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                var dontEnum = dontEnums[i];
                if (owns(object, dontEnum)) {
                    keys.push(dontEnum);
                }
            }
        }
        return keys;
    };

}

//
// Date
// ====
//

// ES5 15.9.5.43
// http://es5.github.com/#x15.9.5.43
// This function returns a String value represent the instance in time
// represented by this Date object. The format of the String is the Date Time
// string format defined in 15.9.1.15. All fields are present in the String.
// The time zone is always UTC, denoted by the suffix Z. If the time value of
// this object is not a finite Number a RangeError exception is thrown.
if (!Date.prototype.toISOString || 
    (new Date(-1).toISOString() !== '1969-12-31T23:59:59.999Z') ||
    (new Date(-62198755200000).toISOString().indexOf('-000001') === -1)) {
    Date.prototype.toISOString = function toISOString() {
        var result, length, value, year, month;
        if (!isFinite(this)) {
            throw new RangeError("Date.prototype.toISOString called on non-finite value.");
        }

        year = this.getUTCFullYear();

        month = this.getUTCMonth();
        // see https://github.com/kriskowal/es5-shim/issues/111
        year += Math.floor(month / 12);
        month = (month % 12 + 12) % 12;

        // the date time string format is specified in 15.9.1.15.
        result = [month + 1, this.getUTCDate(),
            this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()];
        year = (year < 0 ? '-' : (year > 9999 ? '+' : '')) + ('00000' + Math.abs(year)).slice(0 <= year && year <= 9999 ? -4 : -6);

        length = result.length;
        while (length--) {
            value = result[length];
            // pad months, days, hours, minutes, and seconds to have two digits.
            if (value < 10) {
                result[length] = "0" + value;
            }
        }
        // pad milliseconds to have three digits.
        return year + "-" + result.slice(0, 2).join("-") + "T" + result.slice(2).join(":") + "." +
            ("000" + this.getUTCMilliseconds()).slice(-3) + "Z";
    }
}

// ES5 15.9.4.4
// http://es5.github.com/#x15.9.4.4
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}


// ES5 15.9.5.44
// http://es5.github.com/#x15.9.5.44
// This function provides a String representation of a Date object for use by
// JSON.stringify (15.12.3).
function isPrimitive(input) {
    var t = typeof input;
    return input === null || t === "undefined" || t === "boolean" || t === "number" || t === "string";
}

function ToPrimitive(input) {
    var val, valueOf, toString;
    if (isPrimitive(input)) {
        return input;
    }
    valueOf = input.valueOf;
    if (typeof valueOf === "function") {
        val = valueOf.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    toString = input.toString;
    if (typeof toString === "function") {
        val = toString.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    throw new TypeError();
}

var dateToJSONIsSupported = false;
try {
    dateToJSONIsSupported = Date.prototype.toJSON && new Date(NaN).toJSON() === null;
} catch (e) {}
if (!dateToJSONIsSupported) {
    Date.prototype.toJSON = function toJSON(key) {
        // When the toJSON method is called with argument key, the following
        // steps are taken:

        // 1.  Let O be the result of calling ToObject, giving it the this
        // value as its argument.
        // 2. Let tv be ToPrimitive(O, hint Number).
        var o = Object(this),
            tv = ToPrimitive(o),
            toISO;
        // 3. If tv is a Number and is not finite, return null.
        if (typeof tv === 'number' && !isFinite(tv)) {
            return null;
        }
        // 4. Let toISO be the result of calling the [[Get]] internal method of
        // O with argument "toISOString".
        toISO = o.toISOString;
        // 5. If IsCallable(toISO) is false, throw a TypeError exception.
        if (typeof toISO != "function") {
            throw new TypeError('toISOString property is not callable');
        }
        // 6. Return the result of calling the [[Call]] internal method of
        //  toISO with O as the this value and an empty argument list.
        return toISO.call(o);

        // NOTE 1 The argument is ignored.

        // NOTE 2 The toJSON function is intentionally generic; it does not
        // require that its this value be a Date object. Therefore, it can be
        // transferred to other kinds of objects for use as a method. However,
        // it does require that any such object have a toISOString method. An
        // object is free to use the argument key to filter its
        // stringification.
    };
}

// ES5 15.9.4.2
// http://es5.github.com/#x15.9.4.2
// based on work shared by Daniel Friesen (dantman)
// http://gist.github.com/303249
if (!Date.parse || "Date.parse is buggy") {
    // XXX global assignment won't work in embeddings that use
    // an alternate object for the context.
    Date = (function(NativeDate) {

        // Date.length === 7
        var Date = function Date(Y, M, D, h, m, s, ms) {
            var length = arguments.length;
            if (this instanceof NativeDate) {
                var date = length == 1 && String(Y) === Y ? // isString(Y)
                    // We explicitly pass it through parse:
                    new NativeDate(Date.parse(Y)) :
                    // We have to manually make calls depending on argument
                    // length here
                    length >= 7 ? new NativeDate(Y, M, D, h, m, s, ms) :
                    length >= 6 ? new NativeDate(Y, M, D, h, m, s) :
                    length >= 5 ? new NativeDate(Y, M, D, h, m) :
                    length >= 4 ? new NativeDate(Y, M, D, h) :
                    length >= 3 ? new NativeDate(Y, M, D) :
                    length >= 2 ? new NativeDate(Y, M) :
                    length >= 1 ? new NativeDate(Y) :
                                  new NativeDate();
                // Prevent mixups with unfixed Date object
                date.constructor = Date;
                return date;
            }
            return NativeDate.apply(this, arguments);
        };

        // 15.9.1.15 Date Time String Format.
        var isoDateExpression = new RegExp("^" +
            "(\\d{4}|[\+\-]\\d{6})" + // four-digit year capture or sign + 6-digit extended year
            "(?:-(\\d{2})" + // optional month capture
            "(?:-(\\d{2})" + // optional day capture
            "(?:" + // capture hours:minutes:seconds.milliseconds
                "T(\\d{2})" + // hours capture
                ":(\\d{2})" + // minutes capture
                "(?:" + // optional :seconds.milliseconds
                    ":(\\d{2})" + // seconds capture
                    "(?:\\.(\\d{3}))?" + // milliseconds capture
                ")?" +
            "(" + // capture UTC offset component
                "Z|" + // UTC capture
                "(?:" + // offset specifier +/-hours:minutes
                    "([-+])" + // sign capture
                    "(\\d{2})" + // hours offset capture
                    ":(\\d{2})" + // minutes offset capture
                ")" +
            ")?)?)?)?" +
        "$");

        var monthes = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

        function dayFromMonth(year, month) {
            var t = month > 1 ? 1 : 0;
            return monthes[month] + Math.floor((year - 1969 + t) / 4) - Math.floor((year - 1901 + t) / 100) + Math.floor((year - 1601 + t) / 400) + 365 * (year - 1970);
        }

        // Copy any custom methods a 3rd party library may have added
        for (var key in NativeDate) {
            Date[key] = NativeDate[key];
        }

        // Copy "native" methods explicitly; they may be non-enumerable
        Date.now = NativeDate.now;
        Date.UTC = NativeDate.UTC;
        Date.prototype = NativeDate.prototype;
        Date.prototype.constructor = Date;

        // Upgrade Date.parse to handle simplified ISO 8601 strings
        Date.parse = function parse(string) {
            var match = isoDateExpression.exec(string);
            if (match) {
                // parse months, days, hours, minutes, seconds, and milliseconds
                // provide default values if necessary
                // parse the UTC offset component
                var year = Number(match[1]),
                    month = Number(match[2] || 1) - 1,
                    day = Number(match[3] || 1) - 1,
                    hour = Number(match[4] || 0),
                    minute = Number(match[5] || 0),
                    second = Number(match[6] || 0),
                    millisecond = Number(match[7] || 0),
                    // When time zone is missed, local offset should be used (ES 5.1 bug)
                    // see https://bugs.ecmascript.org/show_bug.cgi?id=112
                    offset = !match[4] || match[8] ? 0 : Number(new Date(1970, 0)),
                    signOffset = match[9] === "-" ? 1 : -1,
                    hourOffset = Number(match[10] || 0),
                    minuteOffset = Number(match[11] || 0),
                    result;
                if (hour < (minute > 0 || second > 0 || millisecond > 0 ? 24 : 25) && 
                    minute < 60 && second < 60 && millisecond < 1000 && 
                    month > -1 && month < 12 && hourOffset < 24 && minuteOffset < 60 && // detect invalid offsets
                    day > -1 && day < dayFromMonth(year, month + 1) - dayFromMonth(year, month)) {
                    result = ((dayFromMonth(year, month) + day) * 24 + hour + hourOffset * signOffset) * 60;
                    result = ((result + minute + minuteOffset * signOffset) * 60 + second) * 1000 + millisecond + offset;
                    if (-8.64e15 <= result && result <= 8.64e15) {
                        return result;
                    }
                }
                return NaN;
            }
            return NativeDate.parse.apply(this, arguments);
        };

        return Date;
    })(Date);
}

//
// String
// ======
//

// ES5 15.5.4.20
// http://es5.github.com/#x15.5.4.20
var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
    "\u2029\uFEFF";
if (!String.prototype.trim || ws.trim()) {
    // http://blog.stevenlevithan.com/archives/faster-trim-javascript
    // http://perfectionkills.com/whitespace-deviations/
    ws = "[" + ws + "]";
    var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
        trimEndRegexp = new RegExp(ws + ws + "*$");
    String.prototype.trim = function trim() {
        if (this === undefined || this === null) {
            throw new TypeError("can't convert "+this+" to object");
        }
        return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
    };
}

//
// Util
// ======
//

// ES5 9.4
// http://es5.github.com/#x9.4
// http://jsperf.com/to-integer
var toInteger = function (n) {
    n = +n;
    if (n !== n) { // isNaN
        n = 0;
    } else if (n !== 0 && n !== (1/0) && n !== -(1/0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
    return n;
};

var prepareString = "a"[0] != "a";
    // ES5 9.9
    // http://es5.github.com/#x9.9
var toObject = function (o) {
    if (o == null) { // this matches both null and undefined
        throw new TypeError("can't convert "+o+" to object");
    }
    // If the implementation doesn't support by-index access of
    // string characters (ex. IE < 9), split the string
    if (prepareString && typeof o == "string" && o) {
        return o.split("");
    }
    return Object(o);
};
});

});
