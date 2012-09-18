#!/usr/bin/env python3

#Copyright 2011 Newcastle University
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#	   http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.


import os
import io
import sys
import traceback
import shutil
from optparse import OptionParser
import examparser
from exam import Exam,ExamError
from xml2js import xml2js
from zipfile import ZipFile
import xml.etree.ElementTree as etree
from itertools import count

namespaces = {
	'': 'http://www.imsglobal.org/xsd/imscp_v1p1',
	'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
	'adlcp': 'http://www.adlnet.org/xsd/adlcp_v1p3',
	'adlseq': 'http://www.adlnet.org/xsd/adlseq_v1p3',
	'adlnav': 'http://www.adlnet.org/xsd/adlnav_v1p3',
	'imsss': 'http://www.imsglobal.org/xsd/imsss',
}

# because pre-py3.2 versions of etree always put a colon in front of tag names
# from http://stackoverflow.com/questions/8113296/supressing-namespace-prefixes-in-elementtree-1-2
if etree.VERSION[0:3] == '1.2':
	#in etree < 1.3, this is a workaround for supressing prefixes

	def fixtag(tag, namespaces):
		import string
		# given a decorated tag (of the form {uri}tag), return prefixed
		# tag and namespace declaration, if any
		if isinstance(tag, etree.QName):
			tag = tag.text
		namespace_uri, tag = tag[1:].split("}", 1)
		prefix = namespaces.get(namespace_uri)
		if namespace_uri not in namespaces:
			prefix = etree._namespace_map.get(namespace_uri)
			if namespace_uri not in etree._namespace_map:
				prefix = "ns%d" % len(namespaces)
			namespaces[namespace_uri] = prefix
			if prefix == "xml":
				xmlns = None
			else:
				if prefix is not None:
					nsprefix = ':' + prefix
				else:
					nsprefix = ''
				xmlns = ("xmlns%s" % nsprefix, namespace_uri)
		else:
			xmlns = None
		if prefix is not None:
			prefix += ":"
		else:
			prefix = ''

		return "%s%s" % (prefix, tag), xmlns

	etree.fixtag = fixtag
	for ns,url in namespaces.items():
		etree._namespace_map[url] = ns if len(ns) else None
else:
	#For etree > 1.3, use register_namespace function
	for ns,url in namespaces.items():
		try:
			etree.register_namespace(ns,url)		
		except AttributeError:
			etree._namespace_map[url]=ns


try:
	basestring
except NameError:
	basestring = str


def collectFiles(options):
	dirs=[('runtime','.')]

	resources = [os.path.join(options.sourcedir,x) for x in options.resources]
	dirs += [(os.path.join(os.getcwd(),x),os.path.join('resources',os.path.split(x)[1])) for x in resources if os.path.isdir(x)]

	extensions = [os.path.join(options.path,'extensions',x) for x in options.extensions]
	extfiles = [
			(os.path.join(os.getcwd(),x),os.path.join('extensions',os.path.split(x)[1]))
				for x in extensions if os.path.isdir(x)
			]
	dirs += extfiles

	for themepath in options.themepaths:
		dirs.append((os.path.join(themepath,'files'),'.'))

	if options.scorm:
		dirs.append(('scormfiles','.'))


	files = {}
	for (src,dst) in dirs:
		src = os.path.join(options.path,src)
		for x in os.walk(src, followlinks=options.followlinks):
			xsrc = x[0]
			xdst = x[0].replace(src,dst,1)
			for y in x[2]:
				if not (y[-1]=='~' or y[-4:]=='.swp'):
					files[os.path.join(xdst,y)] = os.path.join(xsrc,y) 

	for x in resources:
		if not os.path.isdir(x):
			files[os.path.join('resources',os.path.basename(x))] = os.path.join(options.path,x)
	
	return files

def compileToDir(exam,files,options):
	if options.action == 'clean':
		try:
			shutil.rmtree(options.output)
		except OSError:
			pass
	try:
		os.mkdir(options.output)
	except OSError:
		pass
	
	def makepath(path):	#make sure directory hierarchy of path exists by recursively creating directories
		dir = os.path.dirname(path)
		if not os.path.exists(dir):
			makepath(dir)
			try:
				os.mkdir(dir)
			except OSError:
				pass

	for (dst,src) in files.items():
		dst = os.path.join(options.output,dst)
		if isinstance(src,basestring):
			if options.action=='clean' or not os.path.exists(dst) or os.path.getmtime(src)>os.path.getmtime(dst):
				makepath(dst)
				shutil.copyfile(src,dst)
		else:
			shutil.copyfileobj(src,open(dst,'w'))
	
	f=open(os.path.join(options.output,'settings.js'),'w',encoding='utf-8')
	f.write(options.xmls)
	f.close()

	print("Exam created in %s" % os.path.relpath(options.output))

def compileToZip(exam,files,options):
	
	def cleanpath(path):
		if path=='': 
			return ''
		dirname, basename = os.path.split(path)
		dirname=cleanpath(dirname)
		if basename!='.':
			dirname = os.path.join(dirname,basename)
		return dirname

	f = ZipFile(options.output,'w')

	for (dst,src) in files.items():
		dst = cleanpath(dst)
		if isinstance(src,basestring):
			f.write(src,dst)
		else:
			f.writestr(dst,src.read())


	f.writestr('settings.js',options.xmls.encode('utf-8'))

	print("Exam created in %s" % os.path.relpath(options.output))

	f.close()

def makeExam(options):
	try:
		exam = Exam.fromstring(options.source)
		examXML = exam.tostring()
		options.resources = exam.resources
		options.extensions = exam.extensions
	except ExamError as err:
		raise Exception('Error constructing exam:\n%s' % err)
	except examparser.ParseError as err:
		raise Exception("Failed to compile exam due to parsing error.\n%s" % err)
	except:
		raise Exception('Failed to compile exam.')

	options.examXML = examXML
	options.xmls = xml2js(options)

	files = collectFiles(options)

	if options.scorm:
		IMSprefix = '{http://www.imsglobal.org/xsd/imscp_v1p1}'
		manifest = etree.fromstring(open(os.path.join(options.path,'scormfiles','imsmanifest.xml')).read())
		manifest.attrib['identifier'] = 'Numbas: %s' % exam.name
		manifest.find('%sorganizations/%sorganization/%stitle' % (IMSprefix,IMSprefix,IMSprefix)).text = exam.name
		manifest = etree.tostring(manifest)
		try:
			manifest = manifest.decode('utf-8')
		except AttributeError:
			pass
		files[os.path.join('.','imsmanifest.xml')] = io.StringIO(manifest)
		
	if options.zip:
		compileToZip(exam,files,options)
	else:
		compileToDir(exam,files,options)

def get_theme_path(theme,options):
	if os.path.exists(theme):
		return theme
	else:
		ntheme = os.path.join(options.path,'themes',theme)
		if os.path.exists(ntheme):
			return ntheme
		else:
			raise Exception("Couldn't find theme %s" % theme)

if __name__ == '__main__':

	if 'assesspath' in os.environ:
		path = os.environ['assesspath']
	else:
		path = os.getcwd()

	parser = OptionParser(usage="usage: %prog [options] source")
	parser.add_option('-t','--theme',
						dest='theme',
						action='store',
						type='string',
						default='default',
						help='Path to the theme to use'
		)
	parser.add_option('-f','--followlinks',
						dest='followlinks',
						action='store_true',
						default=False,
						help='Whether to follow symbolic links in the theme directories'
		)
	parser.add_option('-u','--update',
						dest='action',
						action='store_const',
						const='update',
						default='update',
						help='Update an existing exam.'
		)
	parser.add_option('-c','--clean',
						dest='action',
						action='store_const',
						const='clean',
						help='Start afresh, deleting any existing exam in the target path'
		)
	parser.add_option('-z','--zip',
						dest = 'zip',
						action='store_true',
						default=False,
						help='Create a zip file instead of a directory'
		)
	parser.add_option('-s','--scorm',
						dest='scorm',
						action='store_true',
						default=False,
						help='Include the files necessary to make a SCORM package'
		)
	parser.add_option('-p','--path',
						dest='path',
						default=path,
						help='The path to the Numbas files (or you can set the ASSESSPATH environment variable)'
		)
	parser.add_option('-o','--output',
						dest='output',
						help='The target path'
		)
	parser.add_option('--pipein',
						dest='pipein',
						action='store_true',
						default=False,
						help="Read .exam from stdin")

	(options,args) = parser.parse_args()

	if options.pipein:
		options.source = sys.stdin.read()
		options.sourcedir = os.getcwd()
		if not options.output:
			options.output = os.path.join(path,'output','exam')
	else:
		source_path = args[0]
		if not os.path.exists(source_path):
			osource = source_path
			source_path = os.path.join(path,source_path)
			if not os.path.exists(source_path):
				print("Couldn't find source file %s" % osource)
				exit(1)
		options.source=open(source_path,encoding='utf-8').read()
		options.sourcedir = os.path.dirname(source_path)

		if not options.output:
			output = os.path.basename(os.path.splitext(source_path)[0])
			if options.zip:
				output += '.zip'
			options.output=os.path.join(path,'output',output)
	

	options.themepaths = [options.theme]
	for theme,i in zip(options.themepaths,count()):
		theme = options.themepaths[i] = get_theme_path(theme,options)
		inherit_file = os.path.join(theme,'inherit.txt')
		if os.path.exists(inherit_file):
			options.themepaths += open(inherit_file).read().splitlines()

	options.themepaths.reverse()

	try:
		makeExam(options)
	except Exception as err:
		sys.stderr.write(str(err)+'\n')
		_,_,exc_traceback = sys.exc_info()
		traceback.print_exc()
		exit(1)
