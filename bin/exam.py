#!/usr/bin/python3.1

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


import re
import xml.etree.ElementTree as etree
from textile import textile
import examparser
import sys
import os

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

#convert a textile block of content into html, wrapped in a <content> tag and optionally an <html> tag too.
def makeContentNode(s,addHTML=False):
	s='\n'.join([x.lstrip() for x in s.split('\n')])	#textile doesn't like whitespace at the start of a line, but I do
	s=textile(s)
	if addHTML:
		s='<html>'+s+'</html>'
	return etree.fromstring('<content>'+s+'</content>')

#make an XML element tree. Pass in an array of arrays or strings.
def makeTree(struct):
	if struct == list(struct):
		name = struct[0]
		elem = etree.Element(name)
		for x in struct[1:]:
			elem.append(makeTree(x))
		return elem
	elif struct == str(struct):
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
				'reverse': True,
				'browse': True,
				'onadvance': Event('onadvance','none','You have not finished the current question'),
				'onreverse': Event('onreverse','none','You have not finished the current question'),
				'onmove': Event('onmove','none','You have not finished the current question')
			}

		self.timing = { 
				'timeout': Event('timeout','none',''),
				'timedwarning': Event('timedwarning','none','')
			}
		
		self.questions = []

		self.resources = []
		self.extensions = []
	
	@staticmethod
	def fromstring(string):
		data = examparser.fromstring(string)
		exam = Exam.fromDATA(data)
		return exam

	@staticmethod
	def fromDATA(data):
		exam = Exam()
		tryLoad(data,['name','duration','percentPass','shuffleQuestions','resources','extensions'],exam)

		if 'navigation' in data:
			nav = data['navigation']
			tryLoad(nav,['reverse','browse'],exam.navigation)
			for event in ['onadvance','onreverse','onmove']:
				if event in nav:
					tryLoad(nav[event],['action','message'],exam.navigation[event])

		if 'timing' in data:
			timing = data['timing']
			for event in ['timeout','timedwarning']:
				if event in timing:
					tryLoad(timing[event],['action','message'],exam.timing[event])

		if 'feedback' in data:
			tryLoad(data['feedback'],['showactualmark','showtotalmark','showanswerstate','allowrevealanswer'],exam)
			if 'advice' in data['feedback']:
				advice = data['feedback']['advice']
				tryLoad(advice,'type',exam,'adviceType')
				tryLoad(advice,'threshold',exam,'adviceGlobalThreshold')

		if 'questions' in data:
			for question in data['questions']:
				exam.questions.append(Question.fromDATA(question))

		return exam


	def toxml(self):
		root = makeTree(['exam',
							['questiongroup',
								['navigation',
									['settings',
										['reverse'],
										['browse']
									],
									['events']
								],
								['timing',
									['settings',
										['duration'],
										['timer']
									],
									['events']
								],
								['feedback',
									['settings',
										['showactualmark'],
										['showtotalmark'],
										['showanswerstate'],
										['allowrevealanswer'],
										['advice']
									],
									['events']
								]
							],
							['questions']
						])
		root.attrib = {
				'name': self.name,
				'duration': str(self.duration),
				'score': str(0),
				'percentPass': str(self.percentPass)+'%',
				'totalQuestions': str(len(self.questions)),
				'allQuestions': 'true',
				'selectQuestions': '',
				'shuffleFinalList': str(self.shuffleQuestions),
				'sortingList': '',
				'balancingRule': ''
			}
		
		qg = root.find('questiongroup')

		nav = qg.find('navigation')
		settings = nav.find('settings')
		settings.find('reverse').attrib = {'active':str(self.navigation['reverse'])}
		settings.find('browse').attrib = {'active':str(self.navigation['browse']),'type':'dropdownlist'}

		events = nav.find('events')
		events.append(self.navigation['onadvance'].toxml())
		events.append(self.navigation['onreverse'].toxml())
		events.append(self.navigation['onmove'].toxml())

		timing = qg.find('timing')
		settings = timing.find('settings')
		settings.find('duration').attrib = {'value': str(self.duration)}
		settings.find('timer').attrib = {'countup': 'TRUE'}
		events = timing.find('events')
		events.append(self.timing['timeout'].toxml())
		events.append(self.timing['timedwarning'].toxml())

		feedback = qg.find('feedback/settings')
		feedback.find('showactualmark').attrib = {'active':str(self.showactualmark)}
		feedback.find('showtotalmark').attrib = {'active':str(self.showtotalmark)}
		feedback.find('showanswerstate').attrib = {'active':str(self.showanswerstate)}
		feedback.find('allowrevealanswer').attrib = {'active':str(self.allowrevealanswer)}
		feedback.find('advice').attrib = {'type':self.adviceType, 'globalthreshold': str(self.adviceGlobalThreshold)}

		questions = root.find('questions')
		for q in self.questions:
			questions.append(q.toxml())

		return root

	def tostring(self):
		xml = self.toxml()
		indent(xml)
		return(etree.tostring(xml,encoding="UTF-8").decode('utf-8'))

class Event:
	kind = ''
	action = 'none'
	message = ''

	def __init__(self,kind,action,message):
		self.kind = kind
		self.action = action
		self.message = message

	def toxml(self):
		event = makeTree(['event',
							['action',
								['warning',
									['message']
								]
							]
						])
		event.attrib = {'type':self.kind}
		event.find('action').attrib = {'type':self.action}
		event.find('action/warning/message').append(makeContentNode(self.message))
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
				question.variables.append(Variable(variable,variables[variable]))
		
		if 'functions' in data:
			functions = data['functions']
			for function in functions.keys():
				question.functions.append(Function.fromDATA(function,functions[function]))

		return question

	def toxml(self):
		question = makeTree(['question',
								['statement'],
								['parts'],
								['advice',
									['adviceitem',
										['trigger'],
										['text']
									]
								],
								['notes'],
								['variables'],
								['functions']
							])

		question.attrib = {'name': self.name}
		question.find('statement').append(makeContentNode(self.statement,True))
		question.find('advice/adviceitem/text').append(makeContentNode(self.advice,True))

		parts = question.find('parts')
		for part in self.parts:
			parts.append(part.toxml())

		variables = question.find('variables')
		for variable in self.variables:
			variables.append(variable.toxml())

		functions = question.find('functions')
		for function in self.functions:
			functions.append(function.toxml())

		return question

class Variable:
	name = ''
	definition = ''

	def __init__(self,name,definition):
		self.name = name
		self.definition = definition
	
	def toxml(self):
		variable = etree.Element('variable',{
			'name': str(self.name),
			'value': str(self.definition)
			})
		return variable

class Function:
	name = ''
	type = ''
	definition = ''

	def __init__(self,name):
		self.name = name
		self.parameters = {}
	
	@staticmethod
	def fromDATA(name,data):
		function = Function(name)
		tryLoad(data,['parameters','type','definition'],function)
		return function
	
	def toxml(self):
		function = makeTree(['function',
								['parameters']
							])
		function.attrib = { 'name': self.name,
							'outtype': self.type,
							'definition': self.definition
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
		part = makeTree(['part',['partdata',['prompt']]])

		pd = part.find('partdata')
		pd.attrib = {'type': self.kind, 'marks': str(self.marks), 'stepspenalty': str(self.stepsPenalty), 'enableminimummarks': str(self.enableMinimumMarks), 'minimummarks': str(self.minimumMarks)}

		pd.find('prompt').append(makeContentNode(self.prompt,True))

		for step in self.steps:
			part.append(step.toxml())

		return part

class JMEPart(Part):
	kind = 'jme'
	answer = ''
	answerSimplification = '1111111011111011'
	checkingType = 'RelDiff'
	checkingAccuracy = 0		#real default value depends on checkingtype - 0.0001 for difference ones, 5 for no. of digits ones
	failureRate = 1
	vsetRangeStart = 0
	vsetRangeEnd = 1
	vsetRangePoints = 5

	def __init__(self,marks=0,prompt=''):
		Part.__init__(self,marks,prompt)

		self.maxLength = Restriction('maxlength',0,'Your answer is too long.')
		self.maxLength.length = 0
		self.minLength = Restriction('minlength',0,'Your answer is too short.')
		self.minLength.length = 0
		self.mustHave = Restriction('musthave',0,'Your answer does not contain all required elements.')
		self.notAllowed = Restriction('notallowed',0,'Your answer contains elements which are not allowed.')
	
	@staticmethod
	def fromDATA(data):
		part = JMEPart()
		tryLoad(data,['answer','answerSimplification','checkingType','failureRate','vsetRangePoints'],part)

		#default checking accuracies
		if part.checkingType.lower() == 'reldiff' or part.checkingType.lower() == 'absdiff':
			part.checkingAccuracy = 0.0001
		else:	#dp or sigfig
			part.checkingAccuracy = 5
		#get checking accuracy from data, if defined
		tryLoad(data,'checkingType',part)

		if 'maxlength' in data:
			part.maxLength = Restriction.fromDATA('maxlength',data['maxlength'],part.maxLength)
		if 'minlength' in data:
			part.minLength = Restriction.fromDATA('minlength',data['minlength'],part.minLengt)
		if 'musthave' in data:
			part.mustHave = Restriction.fromDATA('musthave',data['musthave'],part.mustHave)
		if 'notallowed' in data:
			part.notAllowed = Restriction.fromDATA('notallowed',data['notallowed'],part.notAllowed)

		if 'vsetrange' in data and len(data['vsetrange']) == 2:
			part.vsetRangeStart = data['vsetrange'][0]
			part.vsetRangeEnd = data['vsetrange'][1]

		return part

	def toxml(self):
		part = Part.toxml(self)
		pd = part.find('partdata')
		pd.append(makeTree(['answer',
								['correctanswer',['math']],
								['parameters',
									['checking'],
									['failurerate'],
									['vset',
										['range']
									]
								]
							]))

		answer = pd.find('answer/correctanswer')
		answer.attrib = {'simplification': str(self.answerSimplification)}
		answer.find('math').text = str(self.answer)
		
		parameters = pd.find('answer/parameters')
		parameters.find('checking').attrib = {'type': self.checkingType, 'accuracy': str(self.checkingAccuracy)}
		parameters.find('failurerate').attrib = {'value': str(self.failureRate)}
		parameters.find('vset/range').attrib = {'start': str(self.vsetRangeStart), 'end': str(self.vsetRangeEnd),  'points': str(self.vsetRangePoints)}
		parameters.append(self.maxLength.toxml())
		parameters.append(self.minLength.toxml())
		parameters.append(self.mustHave.toxml())
		parameters.append(self.notAllowed.toxml())

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
		restriction = makeTree([self.name,['message']])

		restriction.attrib = {'partialcredit': str(self.partialCredit)+'%', 'showstrings': str(self.showStrings)}
		if self.length>=0:
			restriction.attrib['length']=str(self.length)

		for s in self.strings:
			string = etree.Element('string')
			string.text = s
			restriction.append(string)

		restriction.find('message').append(makeContentNode(self.message,True))

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
		pd = part.find('partdata')
		appendMany(pd,['displayanswer','correctanswer',['parameters',['case']]])
		
		pd.find('displayanswer').append(makeContentNode(self.displayAnswer,True))

		pd.find('correctanswer').attrib = {'value': self.answer}

		pd.find('parameters/case').attrib = {'sensitive': str(self.caseSensitive), 'partialcredit': str(self.partialCredit)+'%'}

		return part

class NumberEntryPart(Part):
	kind = 'numberentry'
	integerAnswer = False
	partialCredit = 0
	minvalue = 0
	maxvalue = 0
	inputStep = 1

	def __init__(self,marks=0,prompt=''):
		Part.__init__(self,marks,prompt)
	
	@staticmethod
	def fromDATA(data):
		part = NumberEntryPart()
		tryLoad(data,['integerAnswer','partialCredit','minvalue','maxvalue','inputStep'],part)
		if 'answer' in data:
			part.maxvalue = part.minvalue = data['answer']

		return part

	def toxml(self):
		part = Part.toxml(self)
		pd = part.find('partdata')
		pd.append(makeTree(['answer',
								['minvalue'],
								['maxvalue'],
								['allowonlyintegeranswers'],
								['inputstep']
							]
							))

		answer = pd.find('answer')
		answer.find('minvalue').attrib = {'value': str(self.minvalue)}
		answer.find('maxvalue').attrib = {'value': str(self.maxvalue)}
		answer.find('allowonlyintegeranswers').attrib = {'value': str(self.integerAnswer), 'partialcredit': str(self.partialCredit)+'%'}
		answer.find('inputstep').attrib = {'value': str(self.inputStep)}

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
	displayColumns = 0
	warningType = 'uwNone'
	warningMessage = ''
	
	def __init__(self,kind,marks=0,prompt=''):
		self.kind = kind
		Part.__init__(self,marks,prompt)

		self.choices = []
		self.answers = []
		self.matrix = []

	@staticmethod
	def fromDATA(data):
		kind = data['type']
		part = MultipleChoicePart(kind)
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
			if not isinstance(part.matrix[0],list):	#so you can give just one row without wrapping it in another array
				part.matrix = [[x] for x in part.matrix]

		return part

	def toxml(self):
		part = Part.toxml(self)
		pd = part.find('partdata')
		appendMany(pd,['choices','possibleanswers',['marking','matrix','maxmarks','minmarks'],'uiwarning'])

		choices = pd.find('choices')
		choices.attrib = {
			'minimumexpected': str(self.minAnswers),
			'maximumexpected': str(self.maxAnswers),
			'displaycolumns': str(self.displayColumns),
			'order': 'random' if self.shuffleChoices else 'fixed',
			'displaytype': self.displayType
			}

		for choice in self.choices:
			choices.append(makeTree(['choice',makeContentNode(choice,True)]))

		answers = pd.find('possibleanswers')
		answers.attrib = {'order': 'random' if self.shuffleAnswers else 'fixed'}
		for answer in self.answers:
			answers.append(makeTree(['possibleanswer',makeContentNode(answer,True)]))

		marking = pd.find('marking')
		marking.find('maxmarks').attrib = {'enabled': str(self.maxMarksEnabled), 'value': str(self.maxMarks)}
		marking.find('minmarks').attrib = {'enabled': str(self.minMarksEnabled), 'value': str(self.minMarks)}
		matrix = marking.find('matrix')
		for i in range(len(self.matrix)):
			for j in range(len(self.matrix[i])):
				mark = etree.Element('mark',{
					'possibleanswerindex': str(j), 
					'choiceindex': str(i), 
					'value': str(self.matrix[i][j])
					})
				matrix.append(mark)

		warning = pd.find('uiwarning')
		warning.attrib = {'type': self.warningType}
		warning.append(makeContentNode(self.warningMessage,True))

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
		self.prompt = re.sub(r"\[\[(.*?)\]\]",lambda m: '<gapfill reference="%s" />' % m.group(1),self.prompt)
		part = Part.toxml(self)
		self.prompt = prompt

		gaps = etree.Element('gaps')
		part.find('partdata').append(gaps)

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
