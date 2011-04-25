/*
 * Copyright (c) Christian Perfect for Newcastle University 2010-2011
 */

Numbas.queueScript('scripts/xml.js',[],function() {

var xml = Numbas.xml = {
	dp: new DOMParser(),
	//load in all the XSLT/XML documents
	loadXMLDocs: function()
	{
		var examXML = xml.examXML = xml.loadXML(Numbas.rawxml.examXML);

		var templates = xml.templates = {};
		for(var x in Numbas.rawxml.templates)
		{
			templates[x] = xml.loadXML(Numbas.rawxml.templates[x]);
		}

		return;
	},

	//load in a single XML document
	loadXML: function(xmlstring)
	{
		//parse the XML document
		var doc = xml.dp.parseFromString(xmlstring,'text/xml');

		//check for errors
		if(Sarissa.getParseErrorText(doc) != Sarissa.PARSED_OK)
		{
			throw(new Error("Couldn't load an XML document: "+Sarissa.getParseErrorText(doc)));
		}

		//allow XPath to be used to select nodes
		doc.setProperty('SelectionLanguage','XPath');

		//convert all the attribute names to lower case
		var es = doc.selectNodes('descendant::*');
		for(var i=0; i<es.length; i++)
		{
			var e = es[i];
			var attrs = [];
			var j=0;
			for(j=0; j< e.attributes.length; j++)
			{
				attrs.push(e.attributes[j].name);
			}
			for(j=0; j< attrs.length; j++)
			{
				var name = attrs[j];
				if(name!=name.toLowerCase())
				{
					var value = e.getAttribute(name);
					e.removeAttribute(name);
					e.setAttribute(name.toLowerCase(),value);
				}
			}
		}

		return doc;
	},

	//lots of the time we have a message stored inside content/html/.. structure
	//this pulls the message out and serializes it so it can be inserted easily with jQuery
	serializeMessage: function(node)
	{
		return new XMLSerializer().serializeToString(node.selectSingleNode('content'));
	},

	getTextContent: function(elem)
	{
		return $(elem).text();
	},

	setTextContent: function(elem,text)
	{
		if(elem.textContent!==undefined)
			elem.textContent = text;
		else
			elem.text = text;
	},

	//try to get attributes from an XML node, and use them to fill in an object's properties if they're present. If obj is null, then the loaded value is just returned
	tryGetAttribute: function(obj,elem,names,altnames,options)
	{
		if(!options)
			options = {};

		//can give an xml node to start from. Default is the target object's saved XML.
		var xmlroot;
		if(options.xml)
			xmlroot = options.xml;
		else if(obj)
			xmlroot = obj.xml;

		if(typeof(elem)=='string')	//instead of passing in an XML node to use, can give an XPath query, and we try to get that from xmlroot
			elem = xmlroot.selectSingleNode(elem);
		if(!elem)
			return false;

		if(typeof(names)=='string')
			names=[names];

		if(!altnames)
			altnames=[];
		else if(typeof(altnames)=='string')
			altnames=[altnames];

		for(var i=0;i<names.length;i++)
		{
			var value = elem.getAttribute(names[i].toLowerCase());	//try to get attribute from node

			if(value!==null)
			{
				//establish which field of target object we're filling in
				var name = altnames[i] ? altnames[i] : names[i];
				if(options.string)
				{
				}
				//if this property is already defined in the target object, cast the loaded value to the same type as the existing value
				else if(obj!==null && obj[name]!==undefined)
				{
					if(value.length>0)
					{
						if(typeof(obj[name]) == 'number')
						{
							if(Numbas.util.isFloat(value))
								value = parseFloat(value);
							else if(Numbas.util.isFloat(Numbas.util.unPercent(value)))
							{
								value = Numbas.util.unPercent(value);
							}
							else
								throw(new Error("Property "+name+" should be a number, but isn't ("+value+"), in node "+elem));
						}
						else if(typeof(obj[name]) == 'boolean')
						{
							if(Numbas.util.isBool(value))							
								value = Numbas.util.parseBool(value);
							else
								throw(new Error("Property "+name+" should be a boolean, but isn't ("+value+"), in node "+elem));
						}
						//otherwise must be a string, so leave it alone
					}
				}
				else
				{
					//automatically convert to a number or a boolean if possible
					if(Numbas.util.isFloat(value))	
					{
						value = parseFloat(value);
					}
					else if(Numbas.util.isBool(value))
					{
						value = Numbas.util.parseBool(value);
					}
				}

				if(obj)
					obj[name] = value;
			}
		}
		return value;
	}
};

});
