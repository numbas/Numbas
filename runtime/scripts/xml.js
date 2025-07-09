/*
Copyright 2011-25 Newcastle University
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
/** @file Stuff to do with loading XML, and getting data out of XML. Provides {@link Numbas.xml}. */
Numbas.queueScript('xml', ['base', 'jme'], function() {

/** Raw XML of the exam definition.
 *
 * @name rawxml
 * @memberof Numbas
 * @type {{[key:string]: string}}
 */

/** XML for the current exam.
 *
 * @name examXML
 * @memberof Numbas.xml
 * @type {XMLDocument}
 */

/** XSLT stylesheets.
 *
 * @name templates
 * @memberof Numbas.xml
 * @type {{[key:string]: XMLDocument}}
 */


if(window.XMLDocument) {
/**
 * Extends the XMLDocument to emulate IE's selectNodes.
 *
 * @param {string} xpath_selector - The XPath expression to use.
 * @param {Node} contextNode - The top node to match against.
 * @returns {Array.<Node>} - The nodes matching the XPath expression.
 */
window.XMLDocument.prototype.selectNodes = function(xpath_selector, contextNode) {
    var oResult = this.evaluate(
        xpath_selector,
        contextNode || this,
        this.documentElement,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    var nodeList = new Array(oResult.snapshotLength);
    for(var i=0; i<nodeList.length; i++) {
        nodeList[i] = oResult.snapshotItem(i);
    }
    return nodeList;
}

/**
 * Extends the XMLDocument to emulate IE's `selectSingleNode`.
 *
 * @param {string} xpath_selector - The XPath expression to use.
 * @param {Node} contextNode - this is for internal use only by the same method when called on Elements.
 * @returns {Node} - The first node matching the XPath expression.
 */
window.XMLDocument.prototype.selectSingleNode = function(xpath_selector, contextNode) {
    return this.evaluate(
        xpath_selector,
        contextNode || this,
        this.documentElement,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
};


/**
 * Extends the Element to emulate IE's selectNodes.
 * @param {string} xpath_selector - The XPath expression to use.
 * @returns {Array.<Node>} - The result of the XPath search.
 */
window.Element.prototype.selectNodes = function(xpath_selector) {
    return this.ownerDocument.selectNodes(xpath_selector, this);
};


/**
 * Extends the Element to emulate IE's `selectSingleNode`.
 *
 * @param {string} xpath_selector - The XPath expression to use.
 * @returns {Node} - The first node matching the XPath expression.
 */
window.Element.prototype.selectSingleNode = function(xpath_selector) {
    return this.ownerDocument.selectSingleNode(xpath_selector, this);
};
}

/** @namespace Numbas.xml */
var xml = Numbas.xml = {
    /** DOM parser to use to parse XML.
     *
     * @type {DOMParser}
     * @private
     */
    dp: window.DOMParser ? new window.DOMParser() : null,
    /** Load in all the XSLT/XML documents from {@link Numbas.rawxml}. */
    loadXMLDocs: function() {
        var templates = xml.templates = {};
        for(var x in Numbas.rawxml.templates) {
            templates[x] = xml.loadXML(Numbas.rawxml.templates[x]);
        }
    },
    /** Load in a single XML document.
     *
     * @param {string} xmlstring
     * @returns {XMLDocument}
     */
    loadXML: function(xmlstring) {
        //parse the XML document
        const parser = new DOMParser();
        var doc = parser.parseFromString(xmlstring, 'text/xml');
        //check for errors
        const errorNode = doc.querySelector("parsererror");
        if (errorNode) {
            throw(new Numbas.Error('xml.could not load', {message: Numbas.util.escapeHTML(errorNode.textContent)}));
        }
        //convert all the attribute names to lower case
        var es = doc.selectNodes('descendant::*');
        for(var i=0; i<es.length; i++) {
            var e = es[i];
            var attrs = [];
            var j=0;
            for(j=0; j< e.attributes.length; j++) {
                attrs.push(e.attributes[j].name);
            }
            for(j=0; j< attrs.length; j++) {
                var name = attrs[j];
                if(name!=name.toLowerCase()) {
                    var value = e.getAttribute(name);
                    e.removeAttribute(name);
                    e.setAttribute(name.toLowerCase(), value);
                }
            }
        }
        return doc;
    },
    /** Load user-defined functions from an XML node.
     *
     * @param {Element} xml
     * @returns {Numbas.jme.variables.func_data[]}
     */
    loadFunctions: function(xml) {
        var tmpFunctions = [];
        //work out functions
        var functionNodes = xml.selectNodes('functions/function');
        if(!functionNodes)
            return {};
        //first pass: get function names and types
        for(var i=0; i<functionNodes.length; i++) {
            var name = functionNodes[i].getAttribute('name').toLowerCase();
            var definition = functionNodes[i].getAttribute('definition');
            var language = functionNodes[i].getAttribute('language');
            var outtype = functionNodes[i].getAttribute('outtype').toLowerCase();
            var parameterNodes = functionNodes[i].selectNodes('parameters/parameter');
            var parameters = [];
            for(var j=0; j<parameterNodes.length; j++) {
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
    /** Load variable definitions from an XML node.
     *
     * @param {Element} xml
     * @param {Numbas.jme.Scope} scope - Scope to compile relative to.
     * @returns {Numbas.jme.variables.variable_data_dict[]}
     */
    loadVariables: function(xml, scope) {
        var variableNodes = xml.selectNodes('variables/variable');    //get variable definitions out of XML
        if(!variableNodes)
            return {};
        //evaluate variables - work out dependency structure, then evaluate from definitions in correct order
        var definitions = [];
        for(var i=0; i<variableNodes.length; i++) {
            var name = variableNodes[i].getAttribute('name');
            var definition = Numbas.xml.getTextContent(variableNodes[i].selectSingleNode('value'));
            definitions.push({
                name: name,
                definition: definition
            });
        }
        return definitions;
    },
    /** Lots of the time we have a message stored inside content/html/.. structure.
     *
     * This pulls the message out and serializes it so it can be inserted easily with jQuery.
     *
     * @param {Element} node
     * @returns {string}
     */
    serializeMessage: function(node) {
        return new XMLSerializer().serializeToString(node.selectSingleNode('content'));
    },
    /** Get all the text belonging to an element.
     *
     * @param {Element} elem
     * @returns {string}
     */
    getTextContent: function(elem) {
        return $(elem).text();
    },
    /** Set the text content of an element.
     *
     * @param {Element} elem
     * @param {string} text
     */
    setTextContent: function(elem, text) {
        if(elem.textContent!==undefined)
            elem.textContent = text;
        else
            elem.text = text;
    },
    /** @typedef {object} Numbas.xml.tryGetAttribute_options
     * @property {boolean} string - Always return the attribute as a string.
     */
    /** Try to get attributes from an XML node, and use them to fill in an object's properties if they're present. If `obj` is null, then the loaded value is just returned.
     *
     * @param {object} obj - Object to fill up.
     * @param {Element} xmlroot - Root XML element.
     * @param {Element|string} elem - Either an XML node to get attributes from, or an XPath query to get the element from `xmlroot`.
     * @param {string[]} names - Names of attributes to load.
     * @param {string[]} [altnames] - Names of object properties to associate with attribute names. If undefined, the attribute name is used.
     * @param {Numbas.xml.tryGetAttribute_options} options
     * @returns {object} - The last attribute loaded.
     */
    tryGetAttribute: function(obj, xmlroot, elem, names, altnames, options) {
        if(!options)
            options = {};
        if(typeof(elem)=='string')    //instead of passing in an XML node to use, can give an XPath query, and we try to get that from xmlroot
            elem = xmlroot.selectSingleNode(elem);
        if(!elem)
            return false;
        if(typeof(names)=='string')
            names=[names];
        if(!altnames)
            altnames=[];
        else if(typeof(altnames)=='string')
            altnames=[altnames];
        for(var i=0;i<names.length;i++) {
            var value = elem.getAttribute(names[i].toLowerCase());    //try to get attribute from node
            if(value!==null) {
                //establish which field of target object we're filling in
                var name = altnames[i] ? altnames[i] : names[i];
                if(options.string) {
                //if this property is already defined in the target object, cast the loaded value to the same type as the existing value
                } else if(obj!==null && obj[name]!==undefined) {
                    if(value.length>0) {
                        if(typeof(obj[name]) == 'number') {
                            if(Numbas.util.isNumber(value, true)) {
                                value = Numbas.util.parseNumber(value, true);
                            } else if(Numbas.util.isFloat(Numbas.util.unPercent(value))) {
                                value = Numbas.util.unPercent(value);
                            } else
                                throw(new Numbas.Error('xml.property not number', {name:name, value:value, element:elem}));
                        } else if(typeof(obj[name]) == 'boolean') {
                            if(Numbas.util.isBool(value))
                                value = Numbas.util.parseBool(value);
                            else
                                throw(new Numbas.Error('xml.property not boolean', {name:name, value:value, element:elem}));
                        }
                        //otherwise must be a string, so leave it alone
                    }
                } else {
                    //automatically convert to a number or a boolean if possible
                    if(Numbas.util.isFloat(value)) {
                        value = parseFloat(value);
                    } else if(Numbas.util.isBool(value)) {
                        value = Numbas.util.parseBool(value);
                    }
                }
                if(obj) {
                    obj[name] = value;
                }
            }
        }
        return value;
    },
    /** Replace every `<localise>` tag with its contents, run through localisation, i.e. get localised strings.
     *
     * @param {Element} template
     * @returns {Element}
     */
    localise: function(template) {
        $(template).find('localise').each(function() {
            var localString = R($(this).text());
            $(this).replaceWith(localString);
        });
        return template;
    },
    /** Transform an XML node using the given XSL template, returning a string representation of the transformed XML.
     *
     * @param {Element} template
     * @param {Element} xml
     * @returns {string}
     */
    transform: function(template, xml) {
        const container = xml.ownerDocument.createElement('container');
        xml = xml.cloneNode(true);
        container.append(xml);

        const processor = new XSLTProcessor();
        processor.importStylesheet(template);
        const doc = processor.transformToDocument(container);
        const serializer = new XMLSerializer();

        const string = serializer.serializeToString(doc);

        return string;
    },
    /** Is the given node empty? True if it has no children.
     *
     * @param {Element} node
     * @returns {boolean}
     */
    isEmpty: function(node) {
        return node.childNodes.length==0;
    },


    pretty_print: function(node, indent='') {
        if(node.nodeType != node.ELEMENT_NODE) {
            return;
        }

        const attrs = Array.from(node.attributes).map(({name, value}) => `${name}="${value}"`);

        const children = Array.from(node.children).map((c) => xml.pretty_print(c, indent+'  '));
        const nodeName = node.nodeName.toLowerCase();
        return `${indent}<${nodeName} ${attrs.join(' ')}>${children.length ? '\n'+children.join('\n')+'\n'+indent : ''}</${nodeName}>`
    },
};
});
