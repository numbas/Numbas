#Copyright 2011 Newcastle University
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.

import os
import re
import sys

def encode(xml):
	xml = xml.strip()
	xml = re.sub('\r','',xml)
	xml = re.sub('\\\\','\\\\\\\\',xml)
	xml = re.sub('\n',r'\\n',xml)
	xml = re.sub('"','\\"',xml)
	return xml

def xml2js(options):
	all = ''
	for themedir in options.themepaths:
		xsltdir = os.path.join(themedir,'xslt')

		if os.path.exists(xsltdir):
			files = filter(lambda x: x[-5:]=='.xslt', os.listdir(xsltdir))
			for x in files:
				if len(all):
					all+=',\n\t\t'
				s = x[:-5]+': \"'+encode(open(os.path.join(xsltdir,x),encoding='utf-8').read())+'\"'
				all+=s

	extensionfiles = ['extensions/'+x+'/'+x+'.js'for x in [os.path.split(y)[1] for y in options.extensions]]

	out = """Numbas.queueScript('settings.js',%s,function() {
Numbas.rawxml = {
	templates: {
		%s
	},

	examXML: \"%s\"
};

});
""" % (str(extensionfiles),all, encode(options.examXML))
	return out

if __name__ == '__main__':
	if(len(sys.argv)>1):
		examXMLfile = sys.argv[1]
	else:
		examXMLfile = os.path.join('..','exams','examXML.xml')
	examXML = open(examXMLfile,encoding='utf-8').read()
	out = xml2js(examXML,os.path.join('..','themes','default'))
