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


Numbas.queueScript('xml',['base','jme'],function() {

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
			xml.localise(templates[x]);
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
			throw(new Numbas.Error('xml.could not load',Sarissa.getParseErrorText(doc)));
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

	loadFunctions: function(xml,scope)
	{
		var tmpFunctions = [];

		//work out functions
		var functionNodes = xml.selectNodes('functions/function');
		if(!functionNodes)
			return {};

		//first pass: get function names and types
		for(var i=0; i<functionNodes.length; i++)
		{
			var name = functionNodes[i].getAttribute('name').toLowerCase();

			var definition = functionNodes[i].getAttribute('definition');
			var language = functionNodes[i].getAttribute('language');

			var outtype = functionNodes[i].getAttribute('outtype').toLowerCase();

			var parameterNodes = functionNodes[i].selectNodes('parameters/parameter');
			var parameters = [];
			for(var j=0; j<parameterNodes.length; j++)
			{
				parameters.push({
					name: parameterNodes[j].getAttribute('name'),
					type: parameterNodes[j].getAttribute('type').toLowerCase()
				});
			}
			tmpFunctions.push({
				name: name,
				definition: definition,
				language: language,
				outtype: outtype,
				parameters: parameters
			});

		}
		return tmpFunctions;
	},
	loadVariables: function(xml,scope) {
		var variableNodes = xml.selectNodes('variables/variable');	//get variable definitions out of XML
		if(!variableNodes)
			return {};

		//list of variable names to ignore because they don't make sense
		var ignoreVariables = ['pi','e','date','year','month','monthname','day','dayofweek','dayofweekname','hour24','hour','minute','second','msecond','firstcdrom'];

		//evaluate variables - work out dependency structure, then evaluate from definitions in correct order
		var todo = {};
		for( var i=0; i<variableNodes.length; i++ )
		{
			var name = variableNodes[i].getAttribute('name').toLowerCase();
			if(!ignoreVariables.contains(name))
			{
				var value = Numbas.xml.getTextContent(variableNodes[i].selectSingleNode('value'));

				var vars = [];

				if(value.trim()=='') {
					throw(new Numbas.Error('jme.variables.empty definition',name));
				}

				var tree = Numbas.jme.compile(value,scope,true);
				vars = vars.merge(Numbas.jme.findvars(tree));
				todo[name]={
					tree: tree,
					vars: vars
				};
			}
		}
		return todo;
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
	tryGetAttribute: function(obj,xmlroot,elem,names,altnames,options)
	{
		if(!options)
			options = {};

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
								throw(new Numbas.Error('xml.property not number',name,value,elem));
						}
						else if(typeof(obj[name]) == 'boolean')
						{
							if(Numbas.util.isBool(value))							
								value = Numbas.util.parseBool(value);
							else
								throw(new Numbas.Error('xml.property not boolean',name,value,elem));
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
	},

	localise: function(template) {
		$(template).find('localise').each(function() {
			var localString = R($(this).text());
			$(this).replaceWith(localString);
		});
		return template;
	}
};

});
