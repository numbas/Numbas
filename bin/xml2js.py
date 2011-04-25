
#Copyright (c) Christian Perfect for Newcastle University 2010-2011

import os
import re
import sys

def encode(xml):
	xml = re.sub('\n|\r','',xml)
	xml = re.sub('\\\\','\\\\\\\\',xml)
	xml = re.sub('"','\\"',xml)
	return xml

def xml2js(options):
	themedir = os.path.join(options.theme,'xslt')

	all = ''
	files = filter(lambda x: x[-5:]=='.xslt', os.listdir(themedir))
	for x in files:
		if len(all):
			all+=',\n\t\t'
		s = x[:-5]+': \"'+encode(open(os.path.join(themedir,x),encoding='utf-8').read())+'\"'
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
