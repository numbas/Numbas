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

def fromstring(s):
	return getthing(s)[1]

def lstripcomments(s):
	s=s.lstrip()	#get rid of leading whitespace

	while s[:2]=='//':
		s=s[s.find('\n')+1:].lstrip()
	return s

def getthing(s):
	s=lstripcomments(s)	#get rid of leading whitespace

	f=s[0]

	if f=='{':	#object
		s=lstripcomments(s[1:])
		obj = {}
		while s[0]!='}':
			i=0
			while i<len(s) and s[i]!=':':
				i+=1
			if i==len(s):
				print("Expected a colon from %s" % s[:100])
				return
			name = s[0:i].rstrip().lower()
			s, thing = getthing(s[i+1:])
			obj[name] = thing
			s=s.lstrip(' \t\r\x0b\x0c')
			if s[0]=='\n':
				s=lstripcomments(s[1:])
			elif s[:2]=='//':
				s=lstripcomments(s)
			else:
				s=lstripcomments(s)
				if s[0]==',' or s[0]=='\n':
					s=lstripcomments(s[1:])
				elif s[0]=='}':
					break
				else:
					print(name)
					print("Expected either } or , or linebreak from %s" % s[:100])
					return
		return s[1:], obj

	elif f=='[':	#array
		s=lstripcomments(s[1:])
		arr=[]
		while len(s) and s[0]!=']':
			s, thing = getthing(s)
			arr.append(thing)
			s=s.lstrip(' \t\r\x0b\x0c')
			if s[0]=='\n':
				s=lstripcomments(s[1:])
			elif s[:2]=='//':
				s=lstripcomments(s)
			else:
				s=lstripcomments(s)
				if s[0]==',':
					s=s[1:]
				elif s[0]==']':
					break
				else:
					print("Expected either , or ] from %s" % s[:100])
					return
		if not len(s):
			print("Missing ] to end array")
			return
		return s[1:],arr

	elif f=='"':	#string literal
		if len(s)>=6 and s[:3]=='"""':	#triple-quoted  string
			i=3
			while i<len(s)-2 and s[i:i+3]!='"""':
				i+=1
			if i==len(s)-2:
				print('Expected """ from %s' % s[:100])
				return
			string = s[3:i]
			s=s[i+3:]
		else:
			i=1
			while i<len(s) and s[i]!='"':
				i+=1
			if i==len(s):
				print('Expected " from %s' % s[:100])
				return
			string = s[1:i]
			s=s[i+1:]
		return s,string
	else:	#undelimited literal
		i=0
		while i<len(s) and s[i] not in ']}\n,' and s[i:i+2]!='//':
			i+=1
		
		v=s[:i].strip()
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
		return s[i:],v


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

if __name__ == '__main__':
	source='''
	{ 
		a: """ "hi"
	said the man"""
		b: howdy, c: there
		d: "sailor,man"
		e: geoff
		f: [eggs , beans,{a:hi}]
	}
	'''
	source=open('testExam.exam').read()
	data = fromstring(source)
	source=printdata(data)
	data=fromstring(source)
	print(printdata(data))
