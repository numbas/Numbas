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
import sys
import re

class ParseError(Exception):
	def __init__(self,parser,message,hint=''):
		self.expression = parser.source[parser.cursor:parser.cursor+50]
		self.line = parser.source[:parser.cursor].count('\n')+1
		self.message = message
		self.hint = hint
	
	def __str__(self):
		msg = '%s at line %s near: \n\t %s ' % (self.message,self.line,self.expression)
		if self.hint:
			msg += '\nPossible fix: '+self.hint
		return msg

class ExamParser:
	source = ''
	cursor = 0

	#parse a string into a data structure
	def parse(self,source):
		self.source = source
		self.cursor = 0
		self.data = self.getthing()
		if self.source[self.cursor:].strip()!='':
			raise ParseError(self,"Didn't parse all input","check for unmatched brackets")
		return self.data

	#scan past comments
	def lstripcomments(self):
		os=self.source[self.cursor:]
		s = os.lstrip()
		s=s.lstrip()	#get rid of leading whitespace

		while s[:2]=='//':
			s=s[s.find('\n')+1:].lstrip()
		self.cursor += len(os)-len(s)

	def stripspace(self):
		os = self.source[self.cursor:]
		s=os.lstrip(' \t\r\x0b\x0c')
		self.cursor += len(os)-len(s)

	def getthing(self):
		self.lstripcomments()

		f=self.source[self.cursor]

		if f=='{':	#object
			self.cursor+=1
			self.lstripcomments()

			obj = {}
			while self.cursor<len(self.source) and self.source[self.cursor]!='}':
				i=self.cursor
				namere = re.compile(r'^\w*$')
				while i<len(self.source) and self.source[i]!=':':
					if(not namere.match(self.source[self.cursor:i].strip())):
						raise ParseError(self,"Invalid name '%s' for an object property" % self.source[self.cursor:i],"check for mismatched brackets")
					i+=1
				if i==len(self.source):
					raise ParseError(self,"Expected a colon")

				name = self.source[self.cursor:i].rstrip().lower()
				self.cursor = i+1
				thing = self.getthing()
				obj[name] = thing

				oc = self.cursor
				self.stripspace()

				if i==len(self.source):
					self.cursor=oc
					raise ParseError(self,"Couldn't find anything to assign as object property '%s'" % name,"check for unmatched brackets")

				if self.source[self.cursor]=='\n':
					self.cursor +=1
					self.lstripcomments()

				elif self.source[self.cursor:self.cursor+2]=='//':
					self.lstripcomments()
				else:
					self.lstripcomments()
					if self.source[self.cursor]==',' or self.source[self.cursor]=='\n':
						self.cursor+=1
						self.lstripcomments()
					elif self.source[self.cursor]=='}':
						break
					else:
						raise ParseError(self,'Expected either } or , in object definition')
			if self.cursor == len(self.source):
				raise ParseError(self,'Expected a } to close an object')

			self.cursor +=1
			return obj

		elif f=='[':	#array
			self.cursor += 1
			self.lstripcomments()

			arr=[]
			while self.cursor<len(self.source) and self.source[self.cursor]!=']':
				thing = self.getthing()
				arr.append(thing)

				self.stripspace()

				if self.source[self.cursor]=='\n':
					self.cursor+=1
					self.lstripcomments()
				elif self.source[self.cursor:self.cursor+2]=='//':
					self.lstripcomments()
				else:
					self.lstripcomments()
					if self.source[self.cursor]==',':
						self.cursor +=1
					elif self.source[self.cursor]==']':
						break
					else:
						raise ParseError(self,"Expected either , or ] in array definition")
			if self.cursor == len(self.source):
				raise ParseError(self,'Expected a ] to end an array')
			self.cursor +=1
			return arr

		elif f=='"':	#string literal - double quotes
			if self.source[self.cursor:self.cursor+3]=='"""':	#triple-quoted  string
				i=self.cursor+3
				while i<len(self.source)-2 and self.source[i:i+3]!='"""':
					i+=1
				if i==len(self.source)-2:
					raise ParseError(self,'Expected """ to end string literal')
				string = self.source[self.cursor+3:i]
				self.cursor = i+3
			else:
				i=self.cursor+1
				while i<len(self.source) and self.source[i]!='"':
					i+=1
				if i==len(self.source):
					raise ParseError(self,'Expected " to end string literal')
				string = self.source[self.cursor+1:i]
				self.cursor = i+1
			return string
		elif f=="'":	#string literal - single quotes
			if self.source[self.cursor:self.cursor+3]=="'''":	#triple-quoted  string
				i=self.cursor+3
				while i<len(self.source)-2 and self.source[i:i+3]!="'''":
					i+=1
				if i==len(self.source)-2:
					raise ParseError(self,"Expected ''' to end string literal")
				string = self.source[self.cursor+3:i]
				self.cursor = i+3
			else:
				i=self.cursor+1
				while i<len(self.source) and self.source[i]!="'":
					i+=1
				if i==len(self.source):
					raise ParseError(self,"Expected ' to end string literal")
				string = self.source[self.cursor+1:i]
				self.cursor = i+1
			return string
		else:	#undelimited literal
			i=self.cursor
			while i<len(self.source) and self.source[i] not in ']}\n,' and self.source[i:i+2]!='//':
				i+=1
			
			v=self.source[self.cursor:i].strip()
			l=v.lower()
			if is_number(v):
				if is_int(v):
					v=int(v)
				else:
					v=float(v)
			elif l=='true':
				v=True
			elif l=='false':
				v=False

			self.cursor = i
			return v

def printdata(data,tabs=''):
	if type(data)==dict:
		s=''
		first=True
		for x in data.keys():
			if not first:
				s+=', '
				if '\n' in s:
					s+='\n'+tabs+'\t'
			if type(data[x])==dict or type(data[x])==list:
				s+='\n'+tabs+'\t'
			s+=x+': '+printdata(data[x],tabs+'\t')
			first=False
		if '\n' in s: 
			s='{\n'+tabs+'\t'+s+'\n'+tabs+'}'
		else:
			s='{'+s+'}'
		return s
	elif type(data)==list:
		s=''
		first=True
		for x in data:
			if not first:
				s+=', '
				if '\n' in s:
					s+='\n'+tabs+'\t'
			if type(x)==dict or type(x)==list:
				s+='\n'+tabs+'\t'
			s+=printdata(x,tabs+'\t')
			first=False
		if '\n' in s: 
			s='[\n'+tabs+'\t'+s+'\n'+tabs+']'
		else:
			s='['+s+']'
		return s
	else:
		if type(data)==str and ('\n' in data or '}' in data or ']' in data or ',' in data):
			if '"' in data:
				return '"""'+data+'"""'
			else:
				return '"'+data+'"'
		else:
			return str(data)


#utility functions

def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

def is_int(s):
	try:
		int(s)
		return True
	except ValueError:
		return False


def __demo():
	source='''
	//comment
	{ 			//comment!
		a: """ "hi"	//comment
	said the man"""	//comment
		b: howdy, c: there	//comment
		d: "sailor,man"    //comment asd 

		e: geoff		//comment
		f: [eggs , beans,{a:hi}]
	}
	'''
	#source=open('testExam.exam').read()
	parser = ExamParser()
	try:
		data = parser.parse(source)
		source=printdata(data)
		data=parser.parse(source)
		print(printdata(data))
	except ParseError as err:
		print('Parse error: ', str(err))

if __name__ == '__main__':
	__demo()
