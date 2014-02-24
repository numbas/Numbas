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
from examparser import fix_number_repr as strcons
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
	elif struct == strcons(struct):
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

#exam object
class Exam:
	name = ''						#title of exam
	duration = 0					#allowed time for exam, in seconds
	percentPass = 0					#percentage classified as a pass
	shuffleQuestions = False		#randomise question order?
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
		tryLoad(data,['name','duration','percentPass','shuffleQuestions','resources','extensions'],exam)

		if 'navigation' in data:
			nav = data['navigation']
			tryLoad(nav,['allowregen','reverse','browse','showfrontpage','preventleave'],exam.navigation)
			if 'onleave' in nav:
				tryLoad(nav['onleave'],['action','message'],exam.navigation['onleave'])

		if 'timing' in data:
			timing = data['timing']
			tryLoad(timing,['allowPause'],exam.timing)
			for event in ['timeout','timedwarning']:
				if event in timing:
					tryLoad(timing[event],['action','message'],exam.timing[event])

		if 'feedback' in data:
			tryLoad(data['feedback'],['showactualmark','showtotalmark','showanswerstate','allowrevealanswer'],exam)
			if 'advice' in data['feedback']:
				advice = data['feedback']['advice']
				tryLoad(advice,'type',exam,'adviceType')
				tryLoad(advice,'threshold',exam,'adviceGlobalThreshold')

		if 'rulesets' in data:
			rulesets = data['rulesets']
			for name in rulesets.keys():
				l=[]
				for rule in rulesets[name]:
					if isinstance(rule,str):
						l.append(rule)
					else:
						l.append(SimplificationRule.fromDATA(rule))
				exam.rulesets[name] = l

		if 'functions' in data:
			functions = data['functions']
			for function in functions.keys():
				exam.functions.append(Function.fromDATA(function,functions[function]))

		if 'variables' in data:
			variables = data['variables']
			for variable in variables.keys():
				exam.variables.append(Variable(variables[variable]))
		if 'questions' in data:
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
				'name': strcons(self.name),
				'percentPass': strcons(self.percentPass)+'%',
				'shuffleQuestions': strcons(self.shuffleQuestions),
			}
		
		settings = root.find('settings')

		nav = settings.find('navigation')
		nav.attrib = {
			'allowregen': strcons(self.navigation['allowregen']),
			'reverse': strcons(self.navigation['reverse']), 
			'browse': strcons(self.navigation['browse']),
			'showfrontpage': strcons(self.navigation['showfrontpage']),
			'preventleave': strcons(self.navigation['preventleave'])
		}

		nav.append(self.navigation['onleave'].toxml())

		timing = settings.find('timing')
		timing.attrib = {
				'duration': strcons(self.duration),
				'allowPause': strcons(self.timing['allowPause']),
		}
		timing.append(self.timing['timeout'].toxml())
		timing.append(self.timing['timedwarning'].toxml())

		feedback = settings.find('feedback')
		feedback.attrib = {
				'showactualmark': strcons(self.showactualmark),
				'showtotalmark': strcons(self.showtotalmark),
				'showanswerstate': strcons(self.showanswerstate),
				'allowrevealanswer': strcons(self.allowrevealanswer)
		}
		feedback.find('advice').attrib = {'type': strcons(self.adviceType), 'threshold': strcons(self.adviceGlobalThreshold)}

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
		for q in self.questions:
			questions.append(q.toxml())

		return root

	def tostring(self):
		try:
			xml = self.toxml()
			indent(xml)
			return(etree.tostring(xml,encoding="UTF-8").decode('utf-8'))
		except etree.ParseError as err:
			raise ExamError('XML Error: %s' % strcons(err))

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
		rule.attrib = {	'pattern': strcons(self.pattern),
						'result': strcons(self.result)
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
		event.attrib = {'type': strcons(self.kind), 'action': strcons(self.action)}
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

		if 'parts' in data:
			parts = data['parts']
			for part in parts:
				question.parts.append(Part.fromDATA(part))

		if 'variables' in data:
			variables = data['variables']
			for variable in variables.keys():
				question.variables.append(Variable(variables[variable]))
		
		if 'functions' in data:
			functions = data['functions']
			for function in functions.keys():
				question.functions.append(Function.fromDATA(function,functions[function]))

		if 'preamble' in data:
			tryLoad(data['preamble'],['js','css'],question.preamble)

		if 'rulesets' in data:
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

		question.attrib = {'name': strcons(self.name)}
		question.find('statement').append(makeContentNode(self.statement))
		question.find('advice').append(makeContentNode(self.advice))

		parts = question.find('parts')
		for part in self.parts:
			parts.append(part.toxml())

		variables = question.find('variables')
		for variable in self.variables:
			variables.append(variable.toxml())

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
		css_preamble.text = strcons(self.preamble['css'])
		preambles.append(css_preamble)
		js_preamble = etree.Element('preamble')
		js_preamble.attrib = {
			'language': 'js'
		}
		js_preamble.text = strcons(self.preamble['js'])
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
		variable.attrib = {'name': strcons(self.name)}
		variable.find('value').text = strcons(self.definition)
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
		function.attrib = { 'name': strcons(self.name),
							'outtype': strcons(self.type),
							'definition': strcons(self.definition),
							'language': strcons(self.language)
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

	def __init__(self,marks,prompt=''):
		self.marks = marks
		self.prompt = prompt
		self.steps = []

	@staticmethod
	def fromDATA(data):
		kind = data['type'].lower()
		partConstructors = {
				'jme': JMEPart,
				'numberentry': NumberEntryPart,
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

		tryLoad(data,['stepsPenalty','minimumMarks','enableMinimumMarks'],part);

		if 'marks' in data:
			part.marks = data['marks']

		if 'prompt' in data:
			part.prompt = data['prompt']

		if 'steps' in data:
			steps = data['steps']
			for step in steps:
				part.steps.append(Part.fromDATA(step))

		return part
	
	def toxml(self):
		part = makeTree(['part',['prompt'],['steps']])

		part.attrib = {'type': strcons(self.kind), 'marks': strcons(self.marks), 'stepspenalty': strcons(self.stepsPenalty), 'enableminimummarks': strcons(self.enableMinimumMarks), 'minimummarks': strcons(self.minimumMarks)}

		part.find('prompt').append(makeContentNode(self.prompt))

		steps = part.find('steps')
		for step in self.steps:
			steps.append(step.toxml())

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

		if 'maxlength' in data:
			part.maxLength = Restriction.fromDATA('maxlength',data['maxlength'],part.maxLength)
		if 'minlength' in data:
			part.minLength = Restriction.fromDATA('minlength',data['minlength'],part.minLength)
		if 'musthave' in data:
			part.mustHave = Restriction.fromDATA('musthave',data['musthave'],part.mustHave)
		if 'notallowed' in data:
			part.notAllowed = Restriction.fromDATA('notallowed',data['notallowed'],part.notAllowed)
		if 'expectedvariablenames' in data:
			part.expectedVariableNames = Restriction('expectedvariablenames')
			try:
				part.expectedVariableNames.strings = list(data['expectedvariablenames'])#
			except TypeError:
				raise ExamError('expected variable names setting %s is not a list' % data['expectedvariablenames'])

		if 'vsetrange' in data and len(data['vsetrange']) == 2:
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
				'checkvariablenames': strcons(self.checkVariableNames),
				'showPreview': strcons(self.showPreview),
		}
		correctAnswer = answer.find('correctanswer')
		correctAnswer.attrib = {'simplification': strcons(self.answerSimplification)}
		correctAnswer.find('math').text = strcons(self.answer)
		
		checking = answer.find('checking')
		checking.attrib = {
				'type': strcons(self.checkingType),
				'accuracy': strcons(self.checkingAccuracy),
				'failurerate': strcons(self.failureRate)
		}
		checking.find('range').attrib = {'start': strcons(self.vsetRangeStart), 'end': strcons(self.vsetRangeEnd),  'points': strcons(self.vsetRangePoints)}
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
		if 'strings' in data:
			for string in data['strings']:
				restriction.strings.append(string)

		return restriction

	def toxml(self):
		restriction = makeTree([self.name,'message'])

		restriction.attrib = {'partialcredit': strcons(self.partialCredit)+'%', 'showstrings': strcons(self.showStrings)}
		if self.length>=0:
			restriction.attrib['length'] = strcons(self.length)

		for s in self.strings:
			string = etree.Element('string')
			string.text = strcons(s)
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

		part.find('correctanswer').text = strcons(self.answer)

		part.find('case').attrib = {'sensitive': strcons(self.caseSensitive), 'partialcredit': strcons(self.partialCredit)+'%'}

		return part

class NumberEntryPart(Part):
	kind = 'numberentry'
	integerAnswer = False
	integerPartialCredit = 0
	checkingType = 'range'
	answer = 0
	checkingAccuracy = 0
	minvalue = 0
	maxvalue = 0
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
		tryLoad(data,['integerAnswer','integerPartialCredit','checkingType','inputStep','precisionType','precision','precisionPartialCredit','precisionMessage','strictPrecision'],part)
		if part.checkingType == 'range':
			if 'answer' in data:
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
				'checkingType': strcons(self.checkingType),
				'inputstep': strcons(self.inputStep)
				}
		if self.checkingType == 'range':
			answer.attrib['minvalue'] = strcons(self.minvalue)
			answer.attrib['maxvalue'] = strcons(self.maxvalue)
		else:
			answer.attrib['answer'] = strcons(self.answer)
			answer.attrib['accuracy'] = strcons(self.checkingAccuracy)
		answer.find('allowonlyintegeranswers').attrib = {'value': strcons(self.integerAnswer), 'partialcredit': strcons(self.integerPartialCredit)+'%'}
		answer.find('precision').attrib = {
			'type': strcons(self.precisionType), 
			'precision': strcons(self.precision), 
			'partialcredit': strcons(self.precisionPartialCredit)+'%',
			'strict': strcons(self.strictPrecision)
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
		tryLoad(data,['minMarks','maxMarks','minAnswers','maxAnswers','shuffleChoices','shuffleAnswers','displayType','displayColumns'],part)

		if 'minmarks' in data:
			part.minMarksEnabled = True
		if 'maxmarks' in data:
			part.maxMarksEnabled = True

		if 'choices' in data:
			for choice in data['choices']:
				part.choices.append(choice)

		if 'answers' in data:
			for answer in data['answers']:
				part.answers.append(answer)
	
		if 'matrix' in data:
			part.matrix = data['matrix']
			if isinstance(part.matrix,list) and (not isinstance(part.matrix[0],list)):	#so you can give just one row without wrapping it in another array
				part.matrix = [[x] for x in part.matrix]

		if 'distractors' in data:
			part.distractors = data['distractors']
			if not isinstance(part.distractors[0],list):
				part.distractors = [[x] for x in part.distractors]

		return part

	def toxml(self):
		part = Part.toxml(self)
		appendMany(part,['choices','answers',['marking','matrix','maxmarks','minmarks','distractors']])

		choices = part.find('choices')
		choices.attrib = {
			'minimumexpected': strcons(self.minAnswers),
			'maximumexpected': strcons(self.maxAnswers),
			'displaycolumns': strcons(self.displayColumns),
			'order': 'random' if self.shuffleChoices else 'fixed',
			'displaytype': strcons(self.displayType)
			}

		for choice in self.choices:
			choices.append(makeTree(['choice',makeContentNode(choice)]))

		answers = part.find('answers')
		answers.attrib = {'order': 'random' if self.shuffleAnswers else 'fixed'}
		for answer in self.answers:
			answers.append(makeTree(['answer',makeContentNode(answer)]))

		marking = part.find('marking')
		marking.find('maxmarks').attrib = {'enabled': strcons(self.maxMarksEnabled), 'value': strcons(self.maxMarks)}
		marking.find('minmarks').attrib = {'enabled': strcons(self.minMarksEnabled), 'value': strcons(self.minMarks)}
		matrix = marking.find('matrix')
		if isinstance(self.matrix,str):
			matrix.attrib = {'def': strcons(self.matrix)}
		else:
			for i in range(len(self.matrix)):
				for j in range(len(self.matrix[i])):
					mark = etree.Element('mark',{
						'answerindex': strcons(j), 
						'choiceindex': strcons(i), 
						'value': strcons(self.matrix[i][j])
						})
					matrix.append(mark)

		distractors = marking.find('distractors')
		for i in range(len(self.distractors)):
			for j in range(len(self.distractors[i])):
				distractor = etree.Element('distractor',{
					'choiceindex': strcons(i),
					'answerindex': strcons(j)
				})
				distractor.append(makeContentNode(self.distractors[i][j]))
				distractors.append(distractor)

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

		if 'gaps' in data:
			gaps = data['gaps']
			for gap in gaps:
				part.gaps.append(Part.fromDATA(gap))

		return part
	
	def toxml(self):
		self.marks = 0
		for gap in self.gaps:
			self.marks += gap.marks

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
