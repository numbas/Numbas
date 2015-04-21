#!/usr/bin/python3.1

#Copyright 2011-13 Newcastle University
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


import re
import xml.etree.ElementTree as etree
from numbasobject import NumbasObject
from examparser import strcons_fix, strcons
import sys
import os
from htmlescapes import removeHTMLEscapes

class ExamError(Exception):
	def __init__(self,message,hint=''):
		self.message = message
		self.hint = hint
	
	def __str__(self):
		msg = self.message
		if self.hint:
			msg += '\nPossible fix: '+self.hint
		return msg

#data is a DATA object. attr is either a single variable name or a list of names. obj is the object to load the data into. altname is the name of the object property to fill, if different from attr
#if attr is in data, then obj.attr = data[attr], otherwise no change
def tryLoad(data,attr,obj,altname=''):
	if type(attr)==list:
		for x in attr:
			tryLoad(data,x,obj)
		return
	else:
		if not altname:
			altname = attr
		attr = attr.lower()
		if attr in data:
			if type(obj)==dict:
				obj[altname]=data[attr]
			else:
				setattr(obj,altname,data[attr])
		else:
			for key in data.keys():
				if key.lower() == attr:
					if type(obj)==dict:
						obj[altname] = data[key]
					else:
						setattr(obj,altname,data[key])

#convert a block of content into html, wrapped in a <content> tag
def makeContentNode(s):
	s=strcons(s)
	s=removeHTMLEscapes(s)
	s='<span>'+s+'</span>'

	try:
		content = etree.fromstring('<content>'+s+'</content>')
	except etree.ParseError as e:
		sys.stderr.write('Bad content:\n'+s+'\n\n')
		raise e

	for a in content.findall('.//a'):
		a.attrib.setdefault('target','_blank')
	return content

#make an XML element tree. Pass in an array of arrays or strings.
def makeTree(struct):
	if struct == list(struct):
		name = struct[0]
		elem = etree.Element(name)
		for x in struct[1:]:
			elem.append(makeTree(x))
		return elem
	elif struct == strcons_fix(struct):
		return etree.Element(struct)
	elif etree.iselement(struct):
		return struct

#indent XML so it is readable
def indent(elem, level=0):
	i = "\n" + level*"\t"
	if len(elem):
		if not elem.text or not elem.text.strip():
			elem.text = i + "\t"
		if not elem.tail or not elem.tail.strip():
			elem.tail = i
		for elem in elem:
			indent(elem, level+1)
		if not elem.tail or not elem.tail.strip():
			elem.tail = i
	else:
		if level and (not elem.tail or not elem.tail.strip()):
			elem.tail = i

#append a list of elements or tree structures (see makeTree) to an XML element
def appendMany(element,things):
	[element.append(x if etree.iselement(x) else makeTree(x)) for x in things]


def haskey(data,key):
	key = key.lower()
	for k in data.keys():
		if k.lower()==key:
			return True
	return False

#exam object
class Exam:
	name = ''						#title of exam
	duration = 0					#allowed time for exam, in seconds
	percentPass = 0					#percentage classified as a pass
	shuffleQuestions = False		#randomise question order?
	allQuestions = True				#use all questions?
	pickQuestions = 0				#if not using all questions, how many questions to use
	showactualmark = True			#show student's score to student?
	showtotalmark = True			#show total marks available to student?
	showanswerstate = True			#show right/wrong on questions?
	allowrevealanswer = True		#allow student to reveal answer to question?
	adviceType = 'onreveal'			#when is advice shown? 'onreveal' only option at the moment
	adviceGlobalThreshold = 0		#reveal advice if student scores less than this percentage

	def __init__(self,name='Untitled Exam'):
		self.name = name
		self.navigation = {	
				'allowregen': False,				#allow student to re-randomise a question?
				'reverse': True,
				'browse': True,
				'showfrontpage': True,
				'onleave': Event('onleave','none','You have not finished the current question'),
				'preventleave': True,
			}

		self.timing = { 
				'timeout': Event('timeout','none',''),
				'timedwarning': Event('timedwarning','none',''),
				'allowPause': False,
			}

		self.rulesets = {}

		self.functions = []
		self.variables = []
		
		self.questions = []

		self.resources = []
		self.extensions = []
	
	@staticmethod
	def fromstring(string):
		exam_object = NumbasObject(string)
		exam = Exam.fromDATA(exam_object.data)
		return exam

	@staticmethod
	def fromDATA(data):
		exam = Exam()
		tryLoad(data,['name','duration','percentPass','shuffleQuestions','allQuestions','pickQuestions','resources','extensions'],exam)

		if haskey(data,'navigation'):
			nav = data['navigation']
			tryLoad(nav,['allowregen','reverse','browse','showfrontpage','preventleave'],exam.navigation)
			if 'onleave' in nav:
				tryLoad(nav['onleave'],['action','message'],exam.navigation['onleave'])

		if haskey(data,'timing'):
			timing = data['timing']
			tryLoad(timing,['allowPause'],exam.timing)
			for event in ['timeout','timedwarning']:
				if event in timing:
					tryLoad(timing[event],['action','message'],exam.timing[event])

		if haskey(data,'feedback'):
			tryLoad(data['feedback'],['showactualmark','showtotalmark','showanswerstate','allowrevealanswer'],exam)
			if haskey(data['feedback'],'advice'):
				advice = data['feedback']['advice']
				tryLoad(advice,'type',exam,'adviceType')
				tryLoad(advice,'threshold',exam,'adviceGlobalThreshold')

		if haskey(data,'rulesets'):
			rulesets = data['rulesets']
			for name in rulesets.keys():
				l=[]
				for rule in rulesets[name]:
					if isinstance(rule,str):
						l.append(rule)
					else:
						l.append(SimplificationRule.fromDATA(rule))
				exam.rulesets[name] = l

		if haskey(data,'functions'):
			functions = data['functions']
			for function in functions.keys():
				exam.functions.append(Function.fromDATA(function,functions[function]))

		if haskey(data,'variables'):
			variables = data['variables']
			for variable in variables.keys():
				exam.variables.append(Variable(variables[variable]))
		if haskey(data,'questions'):
			for question in data['questions']:
				exam.questions.append(Question.fromDATA(question))

		return exam


	def toxml(self):
		root = makeTree(['exam',
							['settings',
								['navigation'],
								['timing'],
								['feedback',
									['advice']
								],
								['rulesets']
							],
							['functions'],
							['variables'],
							['questions']
						])
		root.attrib = {
				'name': strcons_fix(self.name),
				'percentPass': strcons_fix(self.percentPass)+'%',
			}
		
		settings = root.find('settings')

		nav = settings.find('navigation')
		nav.attrib = {
			'allowregen': strcons_fix(self.navigation['allowregen']),
			'reverse': strcons_fix(self.navigation['reverse']), 
			'browse': strcons_fix(self.navigation['browse']),
			'showfrontpage': strcons_fix(self.navigation['showfrontpage']),
			'preventleave': strcons_fix(self.navigation['preventleave'])
		}

		nav.append(self.navigation['onleave'].toxml())

		timing = settings.find('timing')
		timing.attrib = {
				'duration': strcons_fix(self.duration),
				'allowPause': strcons_fix(self.timing['allowPause']),
		}
		timing.append(self.timing['timeout'].toxml())
		timing.append(self.timing['timedwarning'].toxml())

		feedback = settings.find('feedback')
		feedback.attrib = {
				'showactualmark': strcons_fix(self.showactualmark),
				'showtotalmark': strcons_fix(self.showtotalmark),
				'showanswerstate': strcons_fix(self.showanswerstate),
				'allowrevealanswer': strcons_fix(self.allowrevealanswer)
		}
		feedback.find('advice').attrib = {'type': strcons_fix(self.adviceType), 'threshold': strcons_fix(self.adviceGlobalThreshold)}

		rules = settings.find('rulesets')
		for name in self.rulesets.keys():
			st = etree.Element('set',{'name':name})
			for rule in self.rulesets[name]:
				if isinstance(rule,str):
					st.append(etree.Element('include',{'name':rule}))
				else:
					st.append(rule.toxml())
			rules.append(st)

		variables = root.find('variables')
		for variable in self.variables:
			variables.append(variable.toxml())

		functions = root.find('functions')
		for function in self.functions:
			functions.append(function.toxml())

		questions = root.find('questions')
		questions.attrib = {
				'shuffle': strcons_fix(self.shuffleQuestions),
				'all': strcons_fix(self.allQuestions),
				'pick': strcons_fix(self.pickQuestions),
		}

		for q in self.questions:
			questions.append(q.toxml())

		return root

	def tostring(self):
		try:
			xml = self.toxml()
			indent(xml)
			return(etree.tostring(xml,encoding="UTF-8").decode('utf-8'))
		except etree.ParseError as err:
			raise ExamError('XML Error: %s' % strcons_fix(err))

class SimplificationRule:
	pattern = ''
	result = ''

	def __init__(self):
		self.conditions = []

	@staticmethod
	def fromDATA(data):
		rule=SimplificationRule()
		tryLoad(data,['pattern','conditions','result'],rule)
		return rule

	def toxml(self):
		rule = makeTree(['ruledef',
							['conditions']
						])
		rule.attrib = {	'pattern': strcons_fix(self.pattern),
						'result': strcons_fix(self.result)
						}
		conditions = rule.find('conditions')
		for condition in self.conditions:
			conditions.append(etree.fromstring('<condition>'+condition+'</condition>'))

		return rule


class Event:
	kind = ''
	action = 'none'
	message = ''

	def __init__(self,kind,action,message):
		self.kind = kind
		self.action = action
		self.message = message

	def toxml(self):
		event = makeTree(['event'])
		event.attrib = {'type': strcons_fix(self.kind), 'action': strcons_fix(self.action)}
		event.append(makeContentNode(self.message))
		return event

class Question:
	name = 'Untitled Question'
	statement =''
	advice = ''

	def __init__(self,name='Untitled Question'):
		self.name = name

		self.parts = []
		self.variables = []
		self.variablesTest = {
			'condition': '',
			'maxRuns': 10,
		}
		self.functions = []
		self.rulesets = {}

		self.preamble = {
			'js': '',
			'css': ''
		}

	@staticmethod
	def fromDATA(data):
		question = Question()
		tryLoad(data,['name','statement','advice'],question)

		if haskey(data,'parts'):
			parts = data['parts']
			for part in parts:
				question.parts.append(Part.fromDATA(part))

		if haskey(data,'variables'):
			variables = data['variables']
			for variable in variables.keys():
				question.variables.append(Variable(variables[variable]))

		if haskey(data,'variablesTest'):
			tryLoad(data['variablesTest'],['condition','maxRuns'],question.variablesTest)
		
		if haskey(data,'functions'):
			functions = data['functions']
			for function in functions.keys():
				question.functions.append(Function.fromDATA(function,functions[function]))

		if haskey(data,'preamble'):
			tryLoad(data['preamble'],['js','css'],question.preamble)

		if haskey(data,'rulesets'):
			rulesets = data['rulesets']
			for name in rulesets.keys():
				l=[]
				for rule in rulesets[name]:
					if isinstance(rule,str):
						l.append(rule)
					else:
						l.append(SimplificationRule.fromDATA(rule))
				question.rulesets[name] = l

		return question

	def toxml(self):
		question = makeTree(['question',
								['statement'],
								['parts'],
								['advice'],
								['notes'],
								['variables'],
								['functions'],
								['preambles'],
								['rulesets']
							])

		question.attrib = {'name': strcons_fix(self.name)}
		question.find('statement').append(makeContentNode(self.statement))
		question.find('advice').append(makeContentNode(self.advice))

		parts = question.find('parts')
		for part in self.parts:
			parts.append(part.toxml())

		variables = question.find('variables')
		for variable in self.variables:
			variables.append(variable.toxml())
		variables.attrib = {
			'condition': strcons_fix(self.variablesTest['condition']),
			'maxRuns': strcons_fix(self.variablesTest['maxRuns']),
		}

		functions = question.find('functions')
		for function in self.functions:
			functions.append(function.toxml())

		rules = question.find('rulesets')
		for name in self.rulesets.keys():
			st = etree.Element('set',{'name':name})
			for rule in self.rulesets[name]:
				if isinstance(rule,str):
					st.append(etree.Element('include',{'name':rule}))
				else:
					st.append(rule.toxml())
			rules.append(st)

		preambles = question.find('preambles')
		css_preamble = etree.Element('preamble')
		css_preamble.attrib = {
			'language': 'css'
		}
		css_preamble.text = strcons_fix(self.preamble['css'])
		preambles.append(css_preamble)
		js_preamble = etree.Element('preamble')
		js_preamble.attrib = {
			'language': 'js'
		}
		js_preamble.text = strcons_fix(self.preamble['js'])
		preambles.append(js_preamble)
		preambles.attrib = {
			'nosubvars': 'true'
		}

		return question

class Variable:
	name = ''
	definition = ''

	def __init__(self,data):
		self.name = data.get('name')
		self.definition = data.get('definition')
	
	def toxml(self):
		variable = makeTree(['variable',['value']])
		variable.attrib = {'name': strcons_fix(self.name)}
		variable.find('value').text = strcons_fix(self.definition)
		return variable

class Function:
	name = ''
	type = ''
	definition = ''
	language = 'jme'

	def __init__(self,name):
		self.name = name
		self.parameters = {}
	
	@staticmethod
	def fromDATA(name,data):
		function = Function(name)
		tryLoad(data,['parameters','type','definition','language'],function)
		return function
	
	def toxml(self):
		function = makeTree(['function',
								['parameters']
							])
		function.attrib = { 'name': strcons_fix(self.name),
							'outtype': strcons_fix(self.type),
							'definition': strcons_fix(self.definition),
							'language': strcons_fix(self.language)
							}
		
		parameters = function.find('parameters')

		for pname,ptype in self.parameters:
			parameter = etree.Element('parameter',{'name': pname, 'type': ptype})
			parameters.append(parameter)

		return function

class Part:
	prompt = ''
	kind = ''
	stepsPenalty = 0
	enableMinimumMarks = True
	minimumMarks = 0
	showCorrectAnswer = True

	def __init__(self,marks,prompt=''):
		self.marks = marks
		self.prompt = prompt
		self.steps = []
		self.scripts = {}

	@staticmethod
	def fromDATA(data):
		kind = data['type'].lower()
		partConstructors = {
				'jme': JMEPart,
				'numberentry': NumberEntryPart,
				'matrix': MatrixEntryPart,
				'patternmatch': PatternMatchPart,
				'1_n_2': MultipleChoicePart,
				'm_n_2': MultipleChoicePart,
				'm_n_x': MultipleChoicePart,
				'gapfill': GapFillPart,
				'information': InformationPart
			}
		if not kind in partConstructors:
			raise ExamError(
				'Invalid part type '+kind,
				'Valid part types are '+', '.join(sorted([x for x in partConstructors]))
			)
		part = partConstructors[kind].fromDATA(data)

		tryLoad(data,['stepsPenalty','minimumMarks','enableMinimumMarks','showCorrectAnswer'],part);

		if haskey(data,'marks'):
			part.marks = data['marks']

		if haskey(data,'prompt'):
			part.prompt = data['prompt']

		if haskey(data,'steps'):
			steps = data['steps']
			for step in steps:
				part.steps.append(Part.fromDATA(step))

		if haskey(data,'scripts'):
			for name,script in data['scripts'].items():
				part.scripts[name] = script

		return part
	
	def toxml(self):
		part = makeTree(['part',['prompt'],['steps'],['scripts']])

		part.attrib = {
			'type': strcons_fix(self.kind), 
			'marks': strcons_fix(self.marks), 
			'stepspenalty': strcons_fix(self.stepsPenalty), 
			'enableminimummarks': strcons_fix(self.enableMinimumMarks), 
			'minimummarks': strcons_fix(self.minimumMarks), 
			'showcorrectanswer': strcons_fix(self.showCorrectAnswer)
		}

		part.find('prompt').append(makeContentNode(self.prompt))

		steps = part.find('steps')
		for step in self.steps:
			steps.append(step.toxml())

		scripts = part.find('scripts')
		for name,script_dict in self.scripts.items():
			script_element = etree.Element('script')
			script_element.attrib = {
				'name': name,
				'order': script_dict.get('order','instead')
			}
			script_element.text = strcons_fix(script_dict.get('script',''))
			scripts.append(script_element)

		return part

class JMEPart(Part):
	kind = 'jme'
	answer = ''
	answerSimplification = 'basic,unitFactor,unitPower,unitDenominator,zeroFactor,zeroTerm,zeroPower,collectNumbers,zeroBase,constantsFirst,sqrtProduct,sqrtDivision,sqrtSquare,otherNumbers'
	showPreview = True
	checkingType = 'RelDiff'
	checkingAccuracy = 0		#real default value depends on checkingtype - 0.0001 for difference ones, 5 for no. of digits ones
	failureRate = 1
	vsetRangeStart = 0
	vsetRangeEnd = 1
	vsetRangePoints = 5
	checkVariableNames = False

	def __init__(self,marks=0,prompt=''):
		Part.__init__(self,marks,prompt)

		self.maxLength = Restriction('maxlength',0,'Your answer is too long.')
		self.maxLength.length = 0
		self.minLength = Restriction('minlength',0,'Your answer is too short.')
		self.minLength.length = 0
		self.mustHave = Restriction('musthave',0,'Your answer does not contain all required elements.')
		self.notAllowed = Restriction('notallowed',0,'Your answer contains elements which are not allowed.')
		self.expectedVariableNames = Restriction('expectedvariablenames')
	
	@staticmethod
	def fromDATA(data):
		part = JMEPart()
		tryLoad(data,['answer','answerSimplification','showPreview','checkingType','failureRate','vsetRangePoints','checkVariableNames'],part)

		#default checking accuracies
		if part.checkingType.lower() == 'reldiff' or part.checkingType.lower() == 'absdiff':
			part.checkingAccuracy = 0.0001
		else:	#dp or sigfig
			part.checkingAccuracy = 5
		#get checking accuracy from data, if defined
		tryLoad(data,'checkingAccuracy',part)

		if haskey(data,'maxlength'):
			part.maxLength = Restriction.fromDATA('maxlength',data['maxlength'],part.maxLength)
		if haskey(data,'minlength'):
			part.minLength = Restriction.fromDATA('minlength',data['minlength'],part.minLength)
		if haskey(data,'musthave'):
			part.mustHave = Restriction.fromDATA('musthave',data['musthave'],part.mustHave)
		if haskey(data,'notallowed'):
			part.notAllowed = Restriction.fromDATA('notallowed',data['notallowed'],part.notAllowed)
		if haskey(data,'expectedvariablenames'):
			part.expectedVariableNames = Restriction('expectedvariablenames')
			try:
				part.expectedVariableNames.strings = list(data['expectedvariablenames'])#
			except TypeError:
				raise ExamError('expected variable names setting %s is not a list' % data['expectedvariablenames'])

		if haskey(data,'vsetrange') and len(data['vsetrange']) == 2:
			part.vsetRangeStart = data['vsetrange'][0]
			part.vsetRangeEnd = data['vsetrange'][1]

		return part

	def toxml(self):
		part = Part.toxml(self)
		part.append(makeTree(['answer',
								['correctanswer',['math']],
								['checking',
										['range']
								]
							]))

		answer = part.find('answer')
		answer.attrib = {
				'checkvariablenames': strcons_fix(self.checkVariableNames),
				'showPreview': strcons_fix(self.showPreview),
		}
		correctAnswer = answer.find('correctanswer')
		correctAnswer.attrib = {'simplification': strcons_fix(self.answerSimplification)}
		correctAnswer.find('math').text = strcons_fix(self.answer)
		
		checking = answer.find('checking')
		checking.attrib = {
				'type': strcons_fix(self.checkingType),
				'accuracy': strcons_fix(self.checkingAccuracy),
				'failurerate': strcons_fix(self.failureRate)
		}
		checking.find('range').attrib = {'start': strcons_fix(self.vsetRangeStart), 'end': strcons_fix(self.vsetRangeEnd),  'points': strcons_fix(self.vsetRangePoints)}
		answer.append(self.maxLength.toxml())
		answer.append(self.minLength.toxml())
		answer.append(self.mustHave.toxml())
		answer.append(self.notAllowed.toxml())
		answer.append(self.expectedVariableNames.toxml())
		
		return part

class Restriction:
	message = ''
	length = -1
	showStrings = False

	def __init__(self,name='',partialCredit=0,message=''):
		self.name = name
		self.strings = []
		self.partialCredit = partialCredit
		self.message = message
	
	@staticmethod
	def fromDATA(name,data,restriction=None):
		if restriction==None:
			restriction = Restriction(name)
		tryLoad(data,['showStrings','partialCredit','message','length'],restriction)
		if haskey(data,'strings'):
			for string in data['strings']:
				restriction.strings.append(string)

		return restriction

	def toxml(self):
		restriction = makeTree([self.name,'message'])

		restriction.attrib = {'partialcredit': strcons_fix(self.partialCredit)+'%', 'showstrings': strcons_fix(self.showStrings)}
		if int(self.length)>=0:
			restriction.attrib['length'] = strcons_fix(self.length)

		for s in self.strings:
			string = etree.Element('string')
			string.text = strcons_fix(s)
			restriction.append(string)

		restriction.find('message').append(makeContentNode(self.message))

		return restriction


class PatternMatchPart(Part):
	kind = 'patternmatch'
	caseSensitive = False
	partialCredit = 0
	answer = ''
	displayAnswer = ''

	def __init__(self,marks=0,prompt=''):
		Part.__init__(self,marks,prompt)

	@staticmethod
	def fromDATA(data):
		part = PatternMatchPart()
		tryLoad(data,['caseSensitive','partialCredit','answer','displayAnswer'],part)

		return part

	def toxml(self):
		part = Part.toxml(self)
		appendMany(part,['displayanswer','correctanswer','case'])
		
		part.find('displayanswer').append(makeContentNode(self.displayAnswer))

		part.find('correctanswer').text = strcons_fix(self.answer)

		part.find('case').attrib = {'sensitive': strcons_fix(self.caseSensitive), 'partialcredit': strcons_fix(self.partialCredit)+'%'}

		return part

class NumberEntryPart(Part):
	kind = 'numberentry'
	integerAnswer = False
	integerPartialCredit = 0
	allowFractions = False
	checkingType = 'range'
	answer = 0
	checkingAccuracy = 0
	minvalue = 0
	maxvalue = 0
	correctAnswerFraction = False
	inputStep = 1

	precisionType = 'none'
	precision = 0
	precisionPartialCredit = 0
	precisionMessage = ''
	strictPrecision = True

	def __init__(self,marks=0,prompt=''):
		Part.__init__(self,marks,prompt)
	
	@staticmethod
	def fromDATA(data):
		part = NumberEntryPart()
		tryLoad(data,['correctAnswerFraction','integerAnswer','integerPartialCredit','allowFractions','checkingType','inputStep','precisionType','precision','precisionPartialCredit','precisionMessage','strictPrecision'],part)
		if part.checkingType == 'range':
			if haskey(data,'answer'):
				part.maxvalue = part.minvalue = data['answer']
			else:
				tryLoad(data,['minvalue','maxvalue'],part)
		else:
			tryLoad(data,['answer','checkingAccuracy'],part)


		return part

	def toxml(self):
		part = Part.toxml(self)
		part.append(makeTree(['answer',
								['allowonlyintegeranswers'],
								['precision','message'],
							]
							))

		answer = part.find('answer')
		answer.attrib = {
				'checkingType': strcons_fix(self.checkingType),
				'inputstep': strcons_fix(self.inputStep),
				'allowfractions': strcons_fix(self.allowFractions),
				'correctanswerfraction': strcons_fix(self.correctAnswerFraction),
				}
		if self.checkingType == 'range':
			answer.attrib['minvalue'] = strcons_fix(self.minvalue)
			answer.attrib['maxvalue'] = strcons_fix(self.maxvalue)
		else:
			answer.attrib['answer'] = strcons_fix(self.answer)
			answer.attrib['accuracy'] = strcons_fix(self.checkingAccuracy)
		answer.find('allowonlyintegeranswers').attrib = {'value': strcons_fix(self.integerAnswer), 'partialcredit': strcons_fix(self.integerPartialCredit)+'%'}
		answer.find('precision').attrib = {
			'type': strcons_fix(self.precisionType), 
			'precision': strcons_fix(self.precision), 
			'partialcredit': strcons_fix(self.precisionPartialCredit)+'%',
			'strict': strcons_fix(self.strictPrecision)
		}
		answer.find('precision/message').append(makeContentNode(self.precisionMessage))

		return part

class MatrixEntryPart(Part):
	kind = 'matrix'
	correctAnswer = ''
	correctAnswerFractions = False
	numRows = 3
	numColumns = 3
	allowResize = True

	tolerance = 0
	markPerCell = False
	allowFractions = False

	precisionType = 'none'
	precision = 0
	precisionPartialCredit = 0
	precisionMessage = ''
	strictPrecision = True

	def __init__(self,marks=0,prompt=''):
		Part.__init__(self,marks,prompt)

	@staticmethod
	def fromDATA(data):
		part = MatrixEntryPart()
		tryLoad(data,['correctAnswer','correctAnswerFractions','numRows','numColumns','allowResize','tolerance','markPerCell','allowFractions','precisionType','precision','precisionPartialCredit','precisionMessage','strictPrecision'],part)

		return part

	def toxml(self):
		part = Part.toxml(self)
		part.append(makeTree(['answer',
								['precision','message'],
							]
		))

		answer = part.find('answer')
		answer.attrib = {
			'correctanswer': strcons_fix(self.correctAnswer),
			'correctanswerfractions': strcons_fix(self.correctAnswerFractions),
			'rows': strcons_fix(self.numRows),
			'columns': strcons_fix(self.numColumns),
			'allowresize': strcons_fix(self.allowResize),
			'tolerance': strcons_fix(self.tolerance),
			'markpercell': strcons_fix(self.markPerCell),
			'allowfractions': strcons_fix(self.allowFractions),
		}

		answer.find('precision').attrib = {
			'type': strcons_fix(self.precisionType), 
			'precision': strcons_fix(self.precision), 
			'partialcredit': strcons_fix(self.precisionPartialCredit)+'%',
			'strict': strcons_fix(self.strictPrecision)
		}
		answer.find('precision/message').append(makeContentNode(self.precisionMessage))

		return part

class MultipleChoicePart(Part):
	minMarksEnabled = False
	minMarks = 0
	maxMarksEnabled = False
	maxMarks = 0
	minAnswers = 0
	maxAnswers = 0
	shuffleChoices = False
	shuffleAnswers = False
	displayType = 'radiogroup'
	displayColumns = 1
	warningType = 'none'
	
	def __init__(self,kind,marks=0,prompt=''):
		self.kind = kind
		Part.__init__(self,marks,prompt)

		self.choices = []
		self.answers = []
		self.matrix = []

		self.distractors = []

	@staticmethod
	def fromDATA(data):
		kind = data['type']
		part = MultipleChoicePart(kind)
		displayTypes = {
				'1_n_2': 'radiogroup',
				'm_n_2': 'checkbox',
				'm_n_x': 'radiogroup'
		}

		part.displayType = displayTypes[kind]
		tryLoad(data,['minMarks','maxMarks','minAnswers','maxAnswers','shuffleChoices','shuffleAnswers','displayType','displayColumns','warningType'],part)

		if haskey(data,'minmarks'):
			part.minMarksEnabled = True
		if haskey(data,'maxmarks'):
			part.maxMarksEnabled = True

		if haskey(data,'choices'):
			for choice in data['choices']:
				part.choices.append(choice)

		if haskey(data,'answers'):
			for answer in data['answers']:
				part.answers.append(answer)
	
		if haskey(data,'matrix'):
			part.matrix = data['matrix']
			if isinstance(part.matrix,list) and len(part.matrix)>0 and (not isinstance(part.matrix[0],list)):	#so you can give just one row without wrapping it in another array
				part.matrix = [[x] for x in part.matrix]

		if haskey(data,'distractors'):
			part.distractors = data['distractors']
			if len(part.distractors)>0 and (not isinstance(part.distractors[0],list)):
				part.distractors = [[x] for x in part.distractors]

		return part

	def toxml(self):
		part = Part.toxml(self)
		appendMany(part,['choices','answers',['marking','matrix','maxmarks','minmarks','distractors','warning']])

		choices = part.find('choices')
		choices.attrib = {
			'minimumexpected': strcons_fix(self.minAnswers),
			'maximumexpected': strcons_fix(self.maxAnswers),
			'displaycolumns': strcons_fix(self.displayColumns),
			'order': 'random' if self.shuffleChoices else 'fixed',
			'displaytype': strcons_fix(self.displayType)
			}

		for choice in self.choices:
			choices.append(makeTree(['choice',makeContentNode(choice)]))

		answers = part.find('answers')
		answers.attrib = {'order': 'random' if self.shuffleAnswers else 'fixed'}
		for answer in self.answers:
			answers.append(makeTree(['answer',makeContentNode(answer)]))

		marking = part.find('marking')
		marking.find('maxmarks').attrib = {'enabled': strcons_fix(self.maxMarksEnabled), 'value': strcons_fix(self.maxMarks)}
		marking.find('minmarks').attrib = {'enabled': strcons_fix(self.minMarksEnabled), 'value': strcons_fix(self.minMarks)}
		matrix = marking.find('matrix')
		if isinstance(self.matrix,str):
			matrix.attrib = {'def': strcons_fix(self.matrix)}
		else:
			for i in range(len(self.matrix)):
				for j in range(len(self.matrix[i])):
					mark = etree.Element('mark',{
						'answerindex': strcons_fix(j), 
						'choiceindex': strcons_fix(i), 
						'value': strcons_fix(self.matrix[i][j])
						})
					matrix.append(mark)

		distractors = marking.find('distractors')
		for i in range(len(self.distractors)):
			for j in range(len(self.distractors[i])):
				distractor = etree.Element('distractor',{
					'choiceindex': strcons_fix(i),
					'answerindex': strcons_fix(j)
				})
				distractor.append(makeContentNode(self.distractors[i][j]))
				distractors.append(distractor)

		warning = marking.find('warning')
		warning.attrib = {'type': self.warningType}

		return part

class InformationPart(Part):
	kind = 'information'

	def __init__(self,prompt=''):
		Part.__init__(self,0,prompt)
	
	@staticmethod
	def fromDATA(data):
		return InformationPart()

class GapFillPart(Part):
	kind = 'gapfill'

	def __init__(self,prompt=''):
		Part.__init__(self,0,prompt)
		
		self.gaps = []

	@staticmethod
	def fromDATA(data):
		part = GapFillPart()

		if haskey(data,'gaps'):
			gaps = data['gaps']
			for gap in gaps:
				part.gaps.append(Part.fromDATA(gap))

		return part
	
	def toxml(self):
		self.marks = 0

		prompt = self.prompt

		def replace_gapfill(m):
			d=int(m.group(1))
			if len(self.gaps)<=d:
				raise ExamError("Reference to an undefined gap in a gapfill part (%i,%i)" %(d,len(self.gaps)))
			return '<gapfill reference="%s" />' % d

		self.prompt = re.sub(r"\[\[(\d+?)\]\]",replace_gapfill,self.prompt)
		part = Part.toxml(self)
		self.prompt = prompt

		gaps = etree.Element('gaps')
		part.append(gaps)

		for gap in self.gaps:
			gaps.append(gap.toxml())

		return part

if __name__ == '__main__':
	if len(sys.argv)>1:
		filename = sys.argv[1]
	else:
		filename=os.path.join('..','exams','testExam.exam')

	data = open(filename,encoding='UTF-8').read()
	exam = Exam.fromstring(data)

	xml = exam.tostring()
	sys.stdout.write(xml)
