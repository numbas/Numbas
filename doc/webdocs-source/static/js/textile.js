var textile;
(function() {
	textile = function(src) {
		var tc = new TextileConverter(src);
		return tc.convert();
	};

	function TextileConverter(src)
	{
		this.osrc = this.src = src;
		this.out = '';
		this.footnotes = [];
	}
	TextileConverter.prototype = {

		convert: function() {
			this.src = this.src.replace(/^\n+/,'');
			while( this.src.length )
			{
				for(var i=0;i<blockTypes.length;i++)
				{
					if(blockTypes[i].match.apply(this))
					{
						blockTypes[i].run.apply(this);
						break;
					}
				}
				if(i==blockTypes.length)
					throw(new Error("Error - couldn't match any block type for:\n\n"+this.src));

				this.out += '\n\n';
				this.src = this.src.replace(/^\n+/,'');
			}
			return this.out.trim();
		},

		getBlock: function() {
			var i = this.src.search('\n\n');
			if(i==-1)
				i=this.src.length;
			var block = this.src.slice(0,i).trim();
			this.src = this.src.slice(i+2);
			return block;
		},

		getLine: function() {
			var i = this.src.search('\n');
			if(i==-1)
				i = this.src.length;
			var line = this.src.slice(0,i).trim();
			this.src = this.src.slice(i+1);
			return line;
		},

		footnoteID: function(n) {
			if(!this.footnotes[n])
				this.footnotes[n] = 'fn'+(Math.random()+'').slice(2)+(new Date()).getTime();

			return this.footnotes[n];
		},

		convertSpan: function(span) {
			var nspan = [span];	//alternating bits that can be touched, and bits that should not change

			//do phrase modifiers
			for(var i=0;i<phraseTypes.length;i++)
			{
				for(var j=0;j<nspan.length;j+=2)
				{
					var res = phraseTypes[i].call(this,nspan[j]);
					if(res.length)
					{
						nspan[j] = '';
						nspan = this.joinPhraseBits(nspan,res,j+1);
					}
				}
			}

			//convert glyphs
			for(var i=0;i<nspan.length;i+=2)
			{
				nspan[i] = this.convertGlyphs(nspan[i]);
			}

			return nspan.join('');
		},

		joinPhraseBits: function(arr1,arr2,index)
		{
			if(!arr1.length)
				return arr2;
			index = Math.min(index,arr1.length)
			if(index % 2)
			{
				arr1[index-1] += arr2[0];
				arr2 = arr2.slice(1);
			}
			if(arr2.length % 2 && index<arr1.length &&  arr2.length>1)
			{
				arr1[index] += arr2[arr2.length-1];
				arr2 = arr2.slice(0,-1);
			}
			return arr1.slice(0,index).concat(arr2,arr1.slice(index));
		},

		convertGlyphs: function(txt) {
			for(var i=0;i<glyphRules.length;i++)
			{
				txt = txt.replace(glyphRules[i][0],glyphRules[i][1]);
			}
			//escape < and >
			var bits = txt.split(/(<[^<]+?>)/);
			for(var i=0;i<bits.length;i+=2)
			{
				bits[i] = bits[i].replace('<','&#60;').replace('>','&#62;');
			}
			txt = bits.join('');
			return txt;
		},

		makeTag: function(tagName,attr)
		{
			var open = '<'+tagName;
			for(var x in attr)
			{
				if(attr[x])
					open+=' '+x+'="'+attr[x]+'"';
			}
			var single = open+' />';
			open+='>';
			var close = '</'+tagName+'>';
			return {single: single, open: open, close: close, name: tagName};
		}
	};

	var para = TextileConverter.prototype.makeTag('p');

	var re_simpleTag = /<[^<]+?>/g;
	var re_punct = /[!"#$%&\'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
	var glyphRules = [
		[/\n(?! )/g,'<br />\n'],															//insert HTML newlines
		[/(\w)'(\w)/g,'$1&#8217;$2'],													//apostrophes
		[/(\s)'(\d+\w?)\b(?!')/g,'$1&#8217;$2'],											//abbreviated years ( '09 )
		[new RegExp("(\\S)'(?=\\s|"+re_punct.source+"|<|$)",'g'),'$1&#8217;'],				//single quote closing
		[/'/g,'&#8216;'],																//single quote opening
		[new RegExp('(\\S)"(?=\\s|'+re_punct.source+'|<|$)','g'),'$1&#8221;'],				//double quote closing
		[/"/g,'&#8220;'],																//double quote opening
		[/\b([A-Z][A-Z0-9]{2,})\b(?:\(([^\)]*)\))/g,'<acronym title="$2"><span class="caps">$1</span></acronym>'],	//acronym with a definition
		[/\b([A-Z][A-Z'\-]+[A-Z])(?=[\s.,\)>]|$)/g,'<span class="caps">$1</span>'],		//uppercase word
		[/\b( ?)\.{3}/g,'$1&#8230;'],													//ellipsis
		[/(\s?)--(\s?)/g,'$1&#8212;$2'],													//em dash
		[/(\s?)-(?:\s|$)/g,' &#8211; '],													//en dash
		[/(\d)( ?)x( ?)(?=\d)/g,'$1$2&#215;$3'],											//times sign
		[/(?:^|\b)( ?)\(TM\)/gi,'$1&#8482;'],														//trademark sign
		[/(?:^|\b)( ?)\(R\)/gi,'$1&#174;'],														//registered trademark sign
		[/(?:^|\b)( ?)\(C\)/gi,'$1&#169;']															//copyright sign
	];

	//matches attribute modifier strings
	//use getAttributes to parse this into actual values
	/*
		/(
			(?:
				<|>|=|<>|												justification
				\(+(?!\w)|\)+|											padding
				(?:\([^\#\)]*(?:\#(?:[a-zA-Z]+[_a-zA-Z0-9-:.]*))?\))|	class & id
				\{.*?\}|												style
				\[.*?\]													language
			)*
		)/
	*/
	var re_attr = /((?:<|>|=|<>|\(+(?!\w)|\)+|(?:\([^#\)]*(?:#(?:[a-zA-Z]+[_a-zA-Z0-9-:.]*))?\))|\{.*?\}|\[.*?\])+)/;

	//get individual modifers from attribute strings
	var re_attrAlign = /<>|<|>|=/;
	re_attrAlign.values = {
		'<': 'left',
		'>': 'right',
		'<>': 'justify',
		'=': 'center'
	};
	var re_attrLeftPadding = /\(/g;
	var re_attrRightPadding = /\)/g;
	var re_attrClassId = /\(([^\(#\)]*)(?:#([a-zA-Z]+[_a-zA-Z0-9-:.]*))?\)/g;
	var re_attrClassIdSingle = new RegExp(re_attrClassId.source);	//only matches a single class/id modifier and gives back the class and id parts separately
	var re_attrStyle = /\{(.*?)\}/;
	var re_attrLanguage = /\[(.*?)\]/;

	//parse an attribute-modifier string into an attributes object
	function getAttributes(attr)
	{
		var opt = {
			style: ''
		};

		if(!attr)
			return opt;

		var paddingLeft=0, paddingRight=0;

		var m;

		if(m=re_attrStyle.exec(attr))
		{
			var style = m[1];
			if(style.length && !/;$/.test(style))
				style+=';'
			opt['style'] = style;
		}
		if(m=attr.match(re_attrLeftPadding))
		{
			paddingLeft += m.length;
		}
		if(m=attr.match(re_attrRightPadding))
		{
			paddingRight += m.length;
		}
		if(m=attr.match(re_attrClassId))
		{
			var n = m.length;
			for(j=0;j<n && m[j].length==2;j++){}
			if(j<n)
			{
				m=re_attrClassIdSingle.exec(m[j]);
				if(m[1] || m[2])
				{
					paddingLeft -= (n-j);
					paddingRight -= (n-j);
				}
				if(m[1])
					opt['class'] = m[1];
				if(m[2])
					opt['id'] = m[2];
			}
		}
		if(m=re_attrLanguage.exec(attr))
		{
			opt['lang'] = m[1];
		}
		if(paddingLeft>0)
			opt['style'] += 'padding-left:'+paddingLeft+'em;';
		if(paddingRight>0)
			opt['style'] += 'padding-right:'+paddingRight+'em;';
		if(m=re_attrAlign.exec(attr))
		{
			opt['style'] += 'text-align:'+re_attrAlign.values[m[0]]+';';
		}

		return opt;
	}


	//array containing all the phrase modifiers
	//Contains functions which each replace a particular phrase modifier with the appropriate HTML
	//Functions are called with respect to the TextileConvertor object, so can use things like this.makeTag
	var phraseTypes = textile.phraseTypes = [];

	var shortPunct = '\\.,"\'?!;:';
	function makeNormalPhraseType(start,tagName,protectContents)
	{
		var re = new RegExp('(?:^|\\{|\\[|(['+shortPunct+']|\\s|>))'+start+'(?:'+re_attr.source+' ?)?([^\\s'+start+']+|\\S[^'+start+'\\n]*[^\\s'+start+'\\n])'+start+'(?:$|[\\]}]|('+re_punct.source+'{1,2}|\\s))','g');
		return function(text) {
			var out = [];
			var m;
			while(m=re.exec(text))
			{
				var pre = m[1] || '';
				var post = m[4] || '';
				var attr = getAttributes(m[2]);
				var tag = this.makeTag(tagName,attr);
				var bit = [text.slice(0,m.index)+pre,post];
				if(protectContents)
				{
					var content = this.escapeHTML(m[3]);
					bit.splice(1,0,tag.open+content+tag.close);
				}
				else
					bit.splice(1,0,tag.open,m[3],tag.close);
				out = this.joinPhraseBits(out,bit,out.length);
				text = text.slice(re.lastIndex);
				re.lastIndex = 0;
			};
			if(out.length)
				out[out.length-1]+=text;
			return out;
		};
	}

	phraseTypes.push(makeNormalPhraseType('\\*\\*','b'));
	phraseTypes.push(makeNormalPhraseType('__','i'));
	phraseTypes.push(makeNormalPhraseType('\\*','strong'));
	phraseTypes.push(makeNormalPhraseType('_','em'));
	phraseTypes.push(makeNormalPhraseType('\\?\\?','cite'));
	phraseTypes.push(makeNormalPhraseType('\\-','del'));
	phraseTypes.push(makeNormalPhraseType('\\+','ins'));
	phraseTypes.push(makeNormalPhraseType('\\%','span'));
	phraseTypes.push(makeNormalPhraseType('~','sub'));
	phraseTypes.push(makeNormalPhraseType('\\^','sup'));

	var re_codePhrase = /(?:^|([\s(>])|\[|\{)@(.*?)@(?:([\s)])|$|\]|\})?/gm;
	phraseTypes.push(function(text) {
		var out = [];
		var m;
		while(m=re_codePhrase.exec(text))
		{
			var pre = m[1] || '';
			var post = m[3] || '';
			var bit = [text.slice(0,m.index)+pre,'<code>'+this.escapeHTML(m[2])+'</code>',post];
			out = this.joinPhraseBits(out,bit,out.length);
			text = text.slice(re_codePhrase.lastIndex);
			re_codePhrase.lastIndex = 0;
		}
		if(out.length)
			out[out.length-1] += text;
		return out;
	});

	var re_noTextilePhrase = /(?:^|([\s(>])|\[|\{)==(.*?)==(?:([\s)])|$|\]\})?/gm;
	phraseTypes.push(function(text) {
		var out = [];
		var m;
		while(m=re_noTextilePhrase.exec(text))
		{
			var pre = m[1] || '';
			var post = m[3] || '';
			var bit = [text.slice(0,m.index)+pre,m[2],post];
			out = this.joinPhraseBits(out,bit,out.length);
			text = text.slice(re_noTextilePhrase.lastIndex);
			re_noTextilePhrase.lastIndex = 0;
		}
		if(out.length)
			out[out.length-1] += text;
		return out;
	});

	var re_link = /(?:^|([\s(>])|\[|\{)"(.*?)(?:\((.*)\))?":(\S+?)(?:$|([\s),!?;]|\.(?:$|\s))|\]|\})/g;
	phraseTypes.push(function(text) {
		var out = [];
		var m;
		while(m=re_link.exec(text))
		{
			var pre = m[1] || '';
			var post = m[5] || '';
			var attr = {
				href: m[4],
				title: m[3]
			};
			var tag = this.makeTag('a',attr);
			var bit = [text.slice(0,m.index)+pre,tag.open,m[2],tag.close,post];
			out = this.joinPhraseBits(out,bit,out.length);
			text = text.slice(re_link.lastIndex);
			re_link.lastIndex = 0;
		}
		if(out.length)
			out[out.length-1] += text;
		return out;
	});

	var re_image = /(?:^|([\s(>])|\[|\{)!(.*?)(?:\((.*)\))?!(?::(\S+))?(?:$|([\s)])|\]|\})/g;
	phraseTypes.push(function(text) {
		var out = [];
		var m;
		while(m=re_image.exec(text))
		{
			var pre = m[1] || '';
			var post = m[5] || '';
			var attr = {
				src: m[2],
				title: m[3],
				alt: m[3]
			};
			var img = this.makeTag('img',attr).single;
			if(m[4])
			{
				var tag = this.makeTag('a',{href:m[4]});
				img = tag.open+img+tag.close;
			}
			var bit = [text.slice(0,m.index)+pre,img,post];
			out = this.joinPhraseBits(out,bit,out.length);
			text = text.slice(re_image.lastIndex);
			re_image.lastIndex = 0;
		}
		if(out.length)
			out[out.length-1] += text;
		return out;
	});

	var re_footnotePhrase = /(^|\S)\[(\d+)\]([\s\.,;:?!'"]|$)/g;
	phraseTypes.push(function(text) {
		var out = [];
		var m;
		while(m=re_footnotePhrase.exec(text))
		{
			var pre = m[1] || '';
			var post = m[3] || '';
			var fn = this.footnoteID(m[2]);
			var tag = this.makeTag('a',{href:'#'+fn});
			var bit = [text.slice(0,m.index)+pre,'<sup class="footnote">'+tag.open+m[2]+tag.close+'</sup>',post];
			out = this.joinPhraseBits(out,bit,out.length);
			text = text.slice(re_footnotePhrase.lastIndex);
			re_footnotePhrase.lastIndex = 0;
		}
		if(out.length)
			out[out.length-1] += text;
		return out;
	});

	var re_codeHTMLPhrase = /<code>((?:.|\n)*?)<\/code>/gm;
	phraseTypes.push(function(span) {
		var m;
		var nspan = [];
		while(m=re_codeHTMLPhrase.exec(span))
		{
			var bit = span.slice(0,m.index);
			var tag = '<code>'+this.escapeHTML(m[1])+'</code>';
			span = span.slice(re_codeHTMLPhrase.lastIndex);
			bit = this.convertGlyphs(bit);
			nspan = this.joinPhraseBits(nspan,[bit,tag],nspan.length+1)
			re_codeHTMLPhrase.lastIndex = 0;
		}
		if(nspan.length)
			nspan.push(span);
		return nspan;
	});

	var re_notextileHTMLPhrase = /<notextile>((?:.|\n)*?)<\/notextile>/gm;
	phraseTypes.push(function(span) {
		var m;
		var nspan = [];
		while(m=re_notextileHTMLPhrase.exec(span))
		{
			var bit = span.slice(0,m.index);
			var tag = m[1];
			span = span.slice(re_notextileHTMLPhrase.lastIndex);
			bit = this.convertGlyphs(bit);
			nspan = this.joinPhraseBits(nspan,[bit,tag],nspan.length+1)
			re_notextileHTMLPhrase.lastIndex = 0;
		}
		if(nspan.length)
			nspan.push(span);
		return nspan;
	});

	//separate out HTML tags so they don't get escaped
	//this should be the last phrase type
	phraseTypes.push(function(span) {
		var m;
		var nspan = [];
		while(m = re_simpleTag.exec(span))
		{
			var bit = span.slice(0,m.index);
			var tag = span.slice(m.index,re_simpleTag.lastIndex);
			span = span.slice(re_simpleTag.lastIndex);
			bit = this.convertGlyphs(bit);
			nspan = this.joinPhraseBits(nspan,[bit,tag],nspan.length+1)
			re_simpleTag.lastIndex = 0;
		}
		if(nspan.length)
			nspan.push(span);
		return nspan;
	});

	// array containing all block types.
	// Contains objects of the form
	//	{
	//		match: function()			//returns true if source begins with this kind of block
	//		run: function()				//perform appropriate conversion on the block
	//	}
	// the functions are applied in the context of the TextileConverter object, so read in from this.src and output to this.out
	// the 'run' function should remove the block it converted from this.src
	// if you're adding another block type, add it to the start of this array
	var blockTypes = textile.blockTypes = [];


	var re_anyBlock = new RegExp('^[a-zA-Z][a-zA-Z0-9]*'+re_attr.source+'?\\.+ ');

	var re_list = new RegExp('^(#+|\\*+)'+re_attr.source+'? ');
	var listItem = TextileConverter.prototype.makeTag('li');
	var list = {
		match: function() { return re_list.test(this.src); },
		run: function() {
			var m;
			var listType = '';
			var tags = [], level=0, tag, listType='';
			while(m = this.src.match(re_list))
			{
				var m = this.src.match(re_list);
				var listType = m[1];
				var tagName = listType[0]=='#' ? 'ol' : 'ul';
				var llevel = listType.length;

				while(llevel < level)
				{
					this.out += listItem.close+'\n'+tag.close;
					var o = tags.pop() || {level: 0};
					level = o.level;
					tag = o.tag;
				}
				if(llevel == level && tag && tagName != tag.name)
				{
					this.out += tag.close+listItem.close+'\n';
					var o = tags.pop() || {level: 0};
					level = o.level;
					tag = o.tag;
				}
				//definitely in a state where either current line is deeper nesting or same level as previous <li>
				
				if(level > 0)
				{
					if(llevel == level)
						this.out += listItem.close;
					this.out+='\n'
				}
				if(llevel > level || m[2])
				{
					if(tag)
						tags.push({level: level, tag: tag});
					var attr = getAttributes(m[2]);
					tag = this.makeTag(tagName,attr);
					level = llevel;
					this.out +=tag.open+'\n';
				}
				this.src = this.src.slice(m[0].length);
				var line = this.getLine();
				line = this.convertSpan(line);
				this.out += listItem.open+line;
			}
			this.out += listItem.close+'\n';
			while(tags.length)
			{
				this.out +=tag.close+listItem.close+'\n';
				tag = tags.pop().tag;
			}
			this.out += tag.close;
		}
	};
	blockTypes.push(list);

	var re_table = new RegExp('^(table'+re_attr.source+'?\. *\\n)?(('+re_attr.source+'?\\. )?\\|.*\\|\\n?)+(?:\\n\\n|$)');
	var re_tableRow = new RegExp('^(?:'+re_attr.source+'?\\. )?\\|.*\\|(?:\\n|$)');
	var re_tableCell = new RegExp('^(_)?(\\^|-|~)?(?:\\\\(\\d+))?(?:/(\\d+))?'+re_attr.source+'?\\. ');
	var table = {
		match: function() { return re_table.test(this.src); },
		run: function() {
			var m = re_table.exec(this.src);
			if(m[1])
			{
				var attr = getAttributes(m[2]);
				tableTag = this.makeTag('table',attr);
				this.getLine();
			}
			else
				tableTag = this.makeTag('table');
			this.out += tableTag.open+'\n';

			while(m = re_tableRow.exec(this.src))
			{
				var rowTag;
				if(m[1])
				{
					attr = getAttributes(m[1]);
					rowTag = this.makeTag('tr',attr);
				}
				else
					rowTag = this.makeTag('tr');
				this.out += rowTag.open+'\n';
				var line = this.getLine();
				var cells = line.split('|');
				var l = cells.length;
				for(var i=1;i<l-1;i++)
				{
					var cell = cells[i];
					if(m = re_tableCell.exec(cell))
					{
						cell = cell.slice(m[0].length);
						attr = getAttributes(m[5]);
						var tagName = m[1] ? 'th' : 'td';
						switch(m[2])
						{
						case '^':
							attr['style']+='vertical-align:top;';
							break;
						case '-':
							attr['style']+='vertical-align:middle;';
							break;
						case '~':
							attr['style']+='vertical-align:bottom;';
							break;
						}
						if(m[3])
							attr['colspan'] = m[3];
						if(m[4])
							attr['rowspan'] = m[4];

						var tag = this.makeTag(tagName,attr);
					}
					else
					{
						tag = this.makeTag('td');
					}
					cell = this.convertSpan(cell);
					this.out += tag.open+cell+tag.close+'\n';
				}
				this.out+=rowTag.close+'\n';
			}
			this.out += tableTag.close;
		}
	};
	blockTypes.push(table);

	var re_footnote = new RegExp('^fn(\\d+)'+re_attr.source+'?\\.(\\.)? ');
	var footnote = {
		match: function() { return re_footnote.test(this.src); },
		run: function() {
			var m = this.src.match(re_footnote);
			var n = parseInt(m[1]);
			var attr = getAttributes(m[2]);
			attr.id = this.footnoteID(n);
			attr['class'] = 'footnote';
			var tag = this.makeTag('p',attr);
			var carryon = m[3]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += tag.open+'<sup>'+n+'</sup> '+block+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.convertSpan(block);
					this.out += '\n'+tag.open+block+tag.close;
				}
			}
		}
	};
	blockTypes.push(footnote);

	var re_blockquote = new RegExp('^bq'+re_attr.source+'?\\.(\\.)?(?::(\\S+))? ');
	var blockquote = {
		match: function() { return re_blockquote.test(this.src); },
		run: function() {
			var m = this.src.match(re_blockquote);
			var attr = getAttributes(m[1]);
			var tag = this.makeTag('p',attr);
			if(m[3])
				attr.cite = m[3];
			var btag = this.makeTag('blockquote',attr);
			var carryon = m[2]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += btag.open+'\n'+tag.open+block+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.convertSpan(block);
					this.out += '\n'+tag.open+block+tag.close;
				}
			}
			this.out += '\n'+btag.close;
		}
	};
	blockTypes.push(blockquote);

	var re_blockcode = new RegExp('^bc'+re_attr.source+'?\\.(\\.)? ');
	var blockcode = {
		match: function() { return re_blockcode.test(this.src);},
		run: function() {
			var m = this.src.match(re_blockcode);
			var attr = getAttributes(m[1]);
			var tag = this.makeTag('code',attr);
			if(m[3])
				attr.cite = m[3];
			var btag = this.makeTag('pre',attr);
			var carryon = m[2]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.escapeHTML(block);
			this.out += btag.open+tag.open+block+'\n'+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.escapeHTML(block);
					this.out += '\n'+tag.open+block+'\n'+tag.close;
				}
			}
			this.out += btag.close;
		}
	};
	blockTypes.push(blockcode);

	var re_pre = new RegExp('^pre'+re_attr.source+'?\.(\.)? ');
	var preBlock = {
		match: function() { return re_pre.test(this.src);},
		run: function() {
			var m = re_pre.exec(this.src);
			this.src = this.src.slice(m[0].length);
			var attr = getAttributes(m[1]);
			var tag = this.makeTag('pre',attr);
			var carryon = m[2]!=undefined;


			var block = this.getBlock();

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					block += '\n\n' + this.getBlock();
				}
			}
			block = this.escapeHTML(block);
			
			this.out += tag.open+block+'\n'+tag.close;
		}
	};
	blockTypes.push(preBlock);

	var re_notextile = new RegExp('^notextile'+re_attr.source+'?\.(\.)? ');
	var notextile = {
		match: function() {return re_notextile.test(this.src);},

		run: function() {
			var m = this.src.match(re_notextile);
			var carryon = m[2]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			this.out += block;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					this.out += '\n\n'+block;
				}
			}
		}
	}
	blockTypes.push(notextile);

	//normal block modifiers
	var blocks = ['h1','h2','h3','h4','h5','h6','p','div'];
	//add in any other normal block types here
	var re_block = new RegExp('^('+blocks.join('|')+')'+re_attr.source+'?.(.)? ');
	var normalBlock = {
		match: function() {return re_block.test(this.src);},

		run: function() {
			var m = this.src.match(re_block);
			var tagName = m[1];
			var attr = getAttributes(m[2]);
			var tag = this.makeTag(tagName,attr);
			var carryon = m[3]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += tag.open+block+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.convertSpan(block);
					this.out += '\n'+tag.open+block+tag.close;
				}
			}
		}
	}
	blockTypes.push(normalBlock);

	var re_preHTML = /^<pre((?:\s+\w+(?:\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)>((?:.|\n(?!\n))*)<\/pre>(?:\n\n|$)/;
	var preHTMLBlock = {
		match: function() { return re_preHTML.test(this.src);},
		run: function() {
			var m = re_preHTML.exec(this.src);
			this.src = this.src.slice(m[0].length);

			var attr = m[1];
			var code = this.escapeHTML(m[2]);
			this.out += '<pre'+attr+'>'+code+'</pre>';
		}
	};
	blockTypes.push(preHTMLBlock);


	var re_html = /^<(\w+)((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)>(.|\n(?!\n))*<\/\1>(\n\n|$)/;
	var inlineTags = 'a abbr acronym b bdo big br cite code dfn em i img input kbd label q samp select small span strong sub sup textarea tt var notextile'.split(' ');
	var htmlBlock = {
		match: function() { 
			var m = this.src.match(re_html); 
			if(m)
				return inlineTags.indexOf(m[1])==-1;
		},
		run: function() {
			var html = re_html.exec(this.src)[0].trim();
			this.src = this.src.slice(html.length);
			this.out += html;
		}
	};
	blockTypes.push(htmlBlock);

	var nowrapBlock = {
		match: function() { return this.src.match(/^ /); },
		run: function() {
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += block;
		}
	};
	blockTypes.push(nowrapBlock);

	var plainBlock = {
		match: function() { return true;},
		run: function() {
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += para.open+block+para.close;
		}
	}
	blockTypes.push(plainBlock);

	//HTML characters should be escaped
	var htmlEscapes = [
		'&', '&#38;',
		'<', '&#60;',
		'>', '&#62;',
		"'", '&#39;',
		'"', '&#34;'
	]
	for(var i=0;i<htmlEscapes.length;i+=2)
	{
		htmlEscapes[i] = new RegExp(htmlEscapes[i],'g');
	}
	TextileConverter.prototype.escapeHTML = function(html)
	{
		for(var i=0;i<htmlEscapes.length;i+=2)
		{
			html = html.replace(htmlEscapes[i],htmlEscapes[i+1]);
		}
		return html;
	}

})();
