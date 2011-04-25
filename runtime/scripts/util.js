/*
 * Copyright (c) Christian Perfect for Newcastle University 2010-2011
 */

Numbas.queueScript('scripts/util.js',[],function() {
Numbas.util = {
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
	copyarray: function(arr)
	{
		var arr2 = [];
		for(var i=0;i<arr.length;i++)
			arr2.push(arr[i]);
		return arr2;
	},

	//shallow copy of object
	copyobj: function(obj)
	{
		var newobj={};
		for(x in obj)
		{
			newobj[x]=obj[x];
		}
		return newobj;
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
		return parseInt(i)==i;
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


/***************************************
*
*	Javascript Textile->HTML conversion
*
*	ben@ben-daglish.net (with thanks to John Hughes for improvements)
*   Issued under the "do what you like with it - I take no respnsibility" licence
****************************************/


(function() {
var inpr,inbq,inbqq,html;
var aliases = new Array;
var alg={'>':'right','<':'left','=':'center','<>':'justify','~':'bottom','^':'top'};
var ent={"'":"&#8217;"," - ":" &#8211; ","--":"&#8212;"," x ":" &#215; ","\\.\\.\\.":"&#8230;","\\(C\\)":"&#169;","\\(R\\)":"&#174;","\\(TM\\)":"&#8482;"};
var tags={"b":"\\*\\*","i":"__","em":"_","strong":"\\*","cite":"\\?\\?","sup":"\\^","sub":"~","span":"\\%","del":"-","code":"@","ins":"\\+","del":"-"};
var le="\n\n";
var lstlev=0,lst="",elst="",intable=0,mm="";
var para = /^p(\S*)\.\s*(.*)/;
var rfn = /^fn(\d+)\.\s*(.*)/;
var bq = /^bq\.(\.)?\s*/;
var table=/^table\s*{(.*)}\..*/;
var trstyle = /^\{(\S+)\}\.\s*\|/;
Numbas.util.textile = function(t) {
	t+='\n';
	var lines = t.split(/\r?\n/);
	html="";
	inpr=inbq=inbqq=0;
/*	for(var i=0;i<lines.length;i++) {
		if(lines[i].indexOf("[") == 0) {
			var m = lines[i].indexOf("]");
			aliases[lines[i].substring(1,m)]=lines[i].substring(m+1);
		}
	}
*/
	for(var i=0;i<lines.length;i++) {
		//if (lines[i].indexOf("[") == 0) {continue;}
		if(mm=para.exec(lines[i])){stp(1);inpr=1;html += lines[i].replace(para,"<p"+make_attr(mm[1])+">"+prep(mm[2]));continue;}
		if(mm = /^h(\d)(\S*)\.\s*(.*)/.exec(lines[i])){stp(1);html += tag("h"+mm[1],make_attr(mm[2]),prep(mm[3]))+le;continue;}
		if(mm=rfn.exec(lines[i])){stp(1);inpr=1;html+=lines[i].replace(rfn,'<p id="fn'+mm[1]+'"><sup>'+mm[1]+'<\/sup>'+prep(mm[2]));continue;}
		if (lines[i].indexOf("*") == 0) {lst="<ul>";elst="<\/ul>";}
		else if (lines[i].indexOf("#") == 0) {lst="<\ol>";elst="<\/ol>";}
		else {while (lstlev > 0) {html += elst;if(lstlev > 1){html += "<\/li>";}else{html+="\n";}html+="\n";lstlev--;}lst="";}
		if(lst) {
			stp(1);
			var m = /^([*#]+)\s*(.*)/.exec(lines[i]);
			var lev = m[1].length;
			while(lev < lstlev) {html += elst+"<\/li>\n";lstlev--;}
			while(lstlev < lev) {html=html.replace(/<\/li>\n$/,"\n");html += lst;lstlev++;}
			html += tag("li","",prep(m[2]))+"\n";
			continue;
		}
		if (lines[i].match(table)){stp(1);intable=1;html += lines[i].replace(table,'<table style="$1;">\n');continue;}
		if ((lines[i].indexOf("|") == 0)  || (lines[i].match(trstyle)) ) {
			stp(1);
			if(!intable) {html += "<table>\n";intable=1;}
			var rowst="";var trow="";
			var ts=trstyle.exec(lines[i]);
			if(ts){rowst=qat('style',ts[1]);lines[i]=lines[i].replace(trstyle,"\|");}
			var cells = lines[i].split("|");
			for(j=1;j<cells.length-1;j++) {
				var ttag="td";
				if(cells[j].indexOf("_.")==0) {ttag="th";cells[j]=cells[j].substring(2);}
				cells[j]=prep(cells[j]);
				var al=/^([<>=^~\/\\\{]+.*?)\.(.*)/.exec(cells[j]);
				var at="",st="";
				if(al != null) {
					cells[j]=al[2];
					var cs= /\\(\d+)/.exec(al[1]);if(cs != null){at +=qat('colspan',cs[1]);}
					var rs= /\/(\d+)/.exec(al[1]);if(rs != null){at +=qat('rowspan',rs[1]);}
					var va= /([\^~])/.exec(al[1]);if(va != null){st +="vertical-align:"+alg[va[1]]+";";}
					var ta= /(<>|=|<|>)/.exec(al[1]);if(ta != null){st +="text-align:"+alg[ta[1]]+";";}
					var is= /\{([^\}]+)\}/.exec(al[1]);if(is != null){st +=is[1];}
					if(st != ""){at+=qat('style',st);}					
				}
				trow += tag(ttag,at,cells[j]);
			}
			html += "\t"+tag("tr",rowst,trow)+"\n";
			continue;
		}
		if(intable) {html += "<\/table>"+le;intable=0;}

		if (lines[i]=="") {stp();}
		else if (!inpr) {
			if(mm=bq.exec(lines[i])){lines[i]=lines[i].replace(bq,"");html +="<blockquote>";inbq=1;if(mm[1]) {inbqq=1;}}
			if(lines.length>2)
			{
				html += "<p>"+prep(lines[i]);inpr=1;
			}
			else
				html += prep(lines[i]);
		}
		else {html += prep(lines[i]);}
	}
	stp();
	if(intable)
	{
		html+='<\/table>'+le;
		intable=0;
	}
	while (lstlev > 0) 
	{
		html += elst;
		if(lstlev > 1)
		{
			html += "<\/li>";
		}
		else
		{
			html+="\n";
		}
		html+="\n";
		lstlev--;
	}
	lst="";
	return html;
}

function prep(m){
	var bits = Numbas.util.contentsplitbrackets(m);
	var i;
	for( var j=0; j<bits.length; j+=4)
	{
		m = bits[j]
	
		for(i in ent) {m=m.replace(new RegExp(i,"g"),ent[i]);}
		for(i in tags) {
			m = make_tag(m,RegExp("^"+tags[i]+"(.+?)"+tags[i]),i,"");
			m = make_tag(m,RegExp(" "+tags[i]+"(.+?)"+tags[i]),i," ");
		}
		m=m.replace(/\[(\d+)\]/g,'<sup><a href="#fn$1">$1<\/a><\/sup>');
		m=m.replace(/([A-Z]+)\((.*?)\)/g,'<acronym title="$2">$1<\/acronym>');
		m=m.replace(/\"([^\"]+)\":((http|https|mailto):\S+)/g,'<a href="$2">$1<\/a>');
		m = make_image(m,/!([^!\s]+)!:(\S+)/);
		m = make_image(m,/!([^!\s]+)!/);
		m=m.replace(/"([^\"]+)":(\S+)/g,function($0,$1,$2){return tag("a",qat('href',aliases[$2]),$1)});
		m=m.replace(/(=)?"([^\"]+)"/g,function($0,$1,$2){return ($1)?$0:"&#8220;"+$2+"&#8221;"});

		bits[j] = m;
	}
	m = bits.join('');
	return m;
}

function make_tag(s,re,t,sp) {
	var m;
	while(m = re.exec(s)) {
		var st = make_attr(m[1]);
		m[1]=m[1].replace(/^[\[\{\(]\S+[\]\}\)]/g,"");
		m[1]=m[1].replace(/^[<>=()]+/,"");
		s = s.replace(re,sp+tag(t,st,m[1]));
	}
	return s;
}

function make_image(m,re) {
	var ma = re.exec(m);
	if(ma != null) {
		var attr="";var st="";
		var at = /\((.*)\)$/.exec(ma[1]);
		if(at != null) {attr = qat('alt',at[1])+qat("title",at[1]);ma[1]=ma[1].replace(/\((.*)\)$/,"");}
		if(ma[1].match(/^[><]/)) {st = "float:"+((ma[1].indexOf(">")==0)?"right;":"left;");ma[1]=ma[1].replace(/^[><]/,"");}
		var pdl = /(\(+)/.exec(ma[1]);if(pdl){st+="padding-left:"+pdl[1].length+"em;";}
		var pdr = /(\)+)/.exec(ma[1]);if(pdr){st+="padding-right:"+pdr[1].length+"em;";}
		if(st){attr += qat('style',st);}
		var im = '<img src="'+ma[1]+'"'+attr+" />";
		if(ma.length >2) {im=tag('a',qat('href',ma[2]),im);}
		m = m.replace(re,im);
	}
	return m;
}

function make_attr(s) {
	var st="";var at="";
	if(!s){return "";}
	var l=/\[(\w\w)\]/.exec(s);
	if(l != null) {at += qat('lang',l[1]);}
	var ci=/\((\S+)\)/.exec(s);
	if(ci != null) {
		s = s.replace(/\((\S+)\)/,"");
		at += ci[1].replace(/#(.*)$/,' id="$1"').replace(/^(\S+)/,' class="$1"');
	}
	var ta= /(<>|=|<|>)/.exec(s);if(ta){st +="text-align:"+alg[ta[1]]+";";}
	var ss=/\{(\S+)\}/.exec(s);if(ss){st += ss[1];if(!ss[1].match(/;$/)){st+= ";";}}
	var pdl = /(\(+)/.exec(s);if(pdl){st+="padding-left:"+pdl[1].length+"em;";}
	var pdr = /(\)+)/.exec(s);if(pdr){st+="padding-right:"+pdr[1].length+"em;";}
	if(st) {at += qat('style',st);}
	return at;
}

function qat(a,v){return ' '+a+'="'+v+'"';}
function tag(t,a,c) {return "<"+t+a+">"+c+"</"+t+">";}
function stp(b){if(b){inbqq=0;}if(inpr){html+="<\/p>"+le;inpr=0;}if(inbq && !inbqq){html+="<\/blockquote>"+le;inbq=0;}}
})();

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
