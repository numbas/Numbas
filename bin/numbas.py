#!/usr/bin/python3

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
import shutil
from optparse import OptionParser
from exam import Exam
from xml2js import xml2js
from zipfile import ZipFile

def collectFiles(options):
	dirs=[('runtime','.')]

	resources = [os.path.join(os.path.dirname(options.source),x) for x in options.resources]
	dirs += [(os.path.join(os.getcwd(),x),os.path.join('resources',os.path.split(x)[1])) for x in resources if os.path.isdir(x)]

	extensions = [os.path.join(options.path,'extensions',x) for x in options.extensions]
	extfiles = [
			(os.path.join(os.getcwd(),x),os.path.join('extensions',os.path.split(x)[1]))
				for x in extensions if os.path.isdir(x)
			]
	dirs += extfiles

	themepath=os.path.join(options.theme,'files')
	dirs.append((themepath,'.'))
	if options.scorm:
		dirs.append(('scormfiles','.'))


	files = []
	for (src,dst) in dirs:
		src = os.path.join(options.path,src)
		for x in os.walk(src, followlinks=options.followlinks):
			xsrc = x[0]
			xdst = x[0].replace(src,dst,1)
			files += [(os.path.join(xsrc,y),os.path.join(xdst,y)) for y in x[2] if not (y[-1]=='~' or y[-4:]=='.swp')]

	files += [(os.path.join(options.path,x),os.path.join('resources',os.path.basename(x))) for x in resources if not os.path.isdir(x)]

	return files

def compileToDir(options):
	if options.action == 'clean':
		if os.path.exists(options.output):
			shutil.rmtree(options.output)
		os.mkdir(options.output)
	elif options.action =='update':
		if not os.path.exists(options.output):
			os.mkdir(options.output)
	
	files = collectFiles(options)

	def makepath(path):
		path = os.path.dirname(path)
		if not os.path.exists(path):
			makepath(path)
			os.mkdir(path)

	for (src,dst) in files:
		dst = os.path.join(options.output,dst)
		if options.action=='clean' or not os.path.exists(dst) or os.path.getmtime(src)>os.path.getmtime(dst):
			makepath(dst)
			shutil.copyfile(src,dst)
	
	f=open(os.path.join(options.output,'settings.js'),'w',encoding='utf-8')
	f.write(options.xmls)
	f.close()

	print("Exam created in %s" % os.path.relpath(options.output))

def compileToZip(options):
	files = collectFiles(options)
	
	def cleanpath(path):
		if path=='': 
			return ''
		dirname, basename = os.path.split(path)
		dirname=cleanpath(dirname)
		if basename!='.':
			dirname = os.path.join(dirname,basename)
		return dirname

	f = ZipFile(options.output,'w')

	for (src, dst) in files:
		dst = cleanpath(dst)
		f.write(src,dst)

	f.writestr('settings.js',options.xmls.encode('utf-8'))

	print("Exam created in %s" % os.path.relpath(options.output))

	f.close()

def makeExam(options):
	data = open(options.source,encoding='utf-8').read()
	if(options.xml):
		examXML = data
		options.resources=[]
		options.extensions=[]
	else:
		exam = Exam.fromstring(data)
		examXML = exam.tostring()
		print(examXML)
		options.resources = exam.resources
		options.extensions = exam.extensions
	options.examXML = examXML
	options.xmls = xml2js(options)


	if options.zip:
		compileToZip(options)
	else:
		compileToDir(options)


if __name__ == '__main__':

	if 'assesspath' in os.environ:
		path = os.environ['assesspath']
	else:
		path = os.getcwd()

	parser = OptionParser(usage="usage: %prog [options] source")
	parser.add_option('-x','--xml',
						dest='xml',
						action='store_true',
						default=False,
						help='The input is an XML file'
		)
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

	(options,args) = parser.parse_args()
	options.source = args[0]
	if not os.path.exists(options.source):
		options.source = os.path.join(path,options.source)

	if not options.output:
		output = os.path.basename(os.path.splitext(options.source)[0])
		if options.zip:
			output += '.zip'
		options.output=os.path.join(path,'output',output)
	
	if not os.path.exists(options.theme):
		ntheme = os.path.join(options.path,'themes',options.theme)
		if os.path.exists(ntheme):
			options.theme = ntheme
		else:
			print("Couldn't find theme %s" % options.theme)
			options.theme = os.path.join(options.path,'themes','default')

	makeExam(options)

