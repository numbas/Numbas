#!/usr/bin/python3.1

#Copyright 2011-13 Newcastle University
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
from numbasobject import NumbasObject
from examparser import strcons_fix, strcons
import sys
import os
import json
from htmlescapes import removeHTMLEscapes
import html5lib

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
        parsed_doc = html5lib.parse(s, namespaceHTMLElements=False)
        content = etree.Element('content')
        for i in parsed_doc.findall('body/*'):
            content.append(i)
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

def case_insensitive_get(data,key):
    key = key.lower()
    for k,v in data.items():
        if k.lower()==key:
            return v

#exam object
class Exam(object):
    name = ''                           # title of exam
    duration = 0                        # allowed time for exam, in seconds
    percentPass = 0                     # percentage classified as a pass
    allowPrinting = True                # allow student to print an exam transcript?
    showactualmark = 'always'           # When to show student's score to student.
    showtotalmark = 'always'            # When to show total marks available to student.
    showanswerstate = 'always'          # When to show right/wrong on questions.
    showpartfeedbackmessages = 'always' # When to show part feedback messages.
    enterreviewmodeimmediately = True   # Enter review mode immediately after ending the exam?
    allowrevealanswer = True            # allow student to reveal answer to question?
    intro = ''                          # text shown on the front page
    end_message = ''                    # text shown on the results page
    revealexpectedanswers = 'inreview'  # When to show expected answers.
    revealadvice = True                 # When to show question advice.
    resultsprintquestions = True        # show questions on printed results page?
    resultsprintadvice = True           # show advice on printed results page?
    feedbackMessages = []               # text shown on the results page when the student achieves a certain score
    showQuestionGroupNames = False      # show the names of question groups?
    showstudentname = True              # show the student's name?
    shuffleQuestionGroups = False       # randomize the order of question groups?
    knowledge_graph = None
    diagnostic_script = 'diagnosys'
    custom_diagnostic_script = ''


    def __init__(self,name='Untitled Exam'):
        self.name = name
        self.navigation = {    
                'allowregen': False,                #allow student to re-randomise a question?
                'navigatemode': 'sequence',
                'reverse': True,
                'browse': True,
                'allowsteps': True,
                'showfrontpage': True,
                'onleave': Event('onleave','none','You have not finished the current question'),
                'preventleave': True,
                'typeendtoleave': False,
                'startpassword': '',
                'allowAttemptDownload': False,
                'downloadEncryptionKey': '',
            }

        self.timing = { 
                'timeout': Event('timeout','none',''),
                'timedwarning': Event('timedwarning','none',''),
                'allowPause': True,
            }

        self.rulesets = {}

        self.functions = []
        self.variables = []
        
        self.question_groups = []

        self.resources = []
        self.extensions = []
        self.custom_part_types = []
    
    @staticmethod
    def fromDATA(builder, data):
        exam = Exam()
        tryLoad(data,['name','duration','percentPass','allowPrinting','resources','extensions','custom_part_types','showQuestionGroupNames','showstudentname', 'shuffleQuestionGroups'],exam)

        if haskey(data,'navigation'):
            nav = data['navigation']
            tryLoad(nav,['allowregen','navigatemode','reverse','browse','allowsteps','showfrontpage','preventleave','typeendtoleave','startpassword','allowAttemptDownload','downloadEncryptionKey'],exam.navigation)
            if 'onleave' in nav:
                tryLoad(nav['onleave'],['action','message'],exam.navigation['onleave'])

        if haskey(data,'timing'):
            timing = data['timing']
            tryLoad(timing,['allowPause'],exam.timing)
            for event in ['timeout','timedwarning']:
                if event in timing:
                    tryLoad(timing[event],['action','message'],exam.timing[event])

        if haskey(data,'feedback'):
            tryLoad(data['feedback'],['showactualmark','showtotalmark','showanswerstate','showpartfeedbackmessages','enterreviewmodeimmediately','allowrevealanswer','revealexpectedanswers','revealadvice'],exam)
            if haskey(data['feedback'],'advice'):
                advice = data['feedback']['advice']
            tryLoad(data['feedback'],['intro','end_message'],exam,['intro','end_message'])
            if haskey(data['feedback'],'results_options'):
                results_options = data['feedback']['results_options']
                tryLoad(results_options,'printquestions', exam, 'resultsprintquestions')
                tryLoad(results_options,'printadvice', exam, 'resultsprintadvice')
            if haskey(data['feedback'],'feedbackmessages'):
                exam.feedbackMessages = [builder.feedback_message(f) for f in data['feedback']['feedbackmessages']]

        if haskey(data,'rulesets'):
            rulesets = data['rulesets']
            for name in rulesets.keys():
                l=[]
                for rule in rulesets[name]:
                    if isinstance(rule,str):
                        l.append(rule)
                    else:
                        l.append(builder.simplification_rule(rule))
                exam.rulesets[name] = l

        if haskey(data,'functions'):
            functions = data['functions']
            for function in functions.keys():
                exam.functions.append(builder.function(function,functions[function]))

        if haskey(data,'variables'):
            variables = data['variables']
            for variable in variables.keys():
                exam.variables.append(Variable(variables[variable]))
        if haskey(data,'question_groups'):
            for question in data['question_groups']:
                exam.question_groups.append(builder.question_group(question))

        if haskey(data,'diagnostic'):
            diagnostic = data['diagnostic']
            exam.knowledge_graph = diagnostic['knowledge_graph']
            exam.diagnostic_script = diagnostic['script']
            exam.custom_diagnostic_script = diagnostic['customScript']

        return exam


    def toxml(self):
        root = makeTree(['exam',
                            ['settings',
                                ['navigation'],
                                ['timing'],
                                ['feedback',
                                    ['intro'],
                                    ['end_message'],
                                    ['results_options'],
                                    ['feedbackmessages'],
                                ],
                                ['rulesets'],
                                ['diagnostic',
                                    ['algorithm']
                                ]
                            ],
                            ['functions'],
                            ['variables'],
                            ['question_groups'],
                            ['knowledge_graph'],
                        ])
        root.attrib = {
                'name': strcons(self.name),
                'percentPass': strcons_fix(self.percentPass)+'%',
                'allowPrinting': strcons_fix(self.allowPrinting),
            }
        
        settings = root.find('settings')

        nav = settings.find('navigation')
        nav.attrib = {
            'allowregen': strcons_fix(self.navigation['allowregen']),
            'navigatemode': strcons_fix(self.navigation['navigatemode']),
            'reverse': strcons_fix(self.navigation['reverse']), 
            'browse': strcons_fix(self.navigation['browse']),
            'allowsteps': strcons_fix(self.navigation['allowsteps']),
            'showfrontpage': strcons_fix(self.navigation['showfrontpage']),
            'preventleave': strcons_fix(self.navigation['preventleave']),
            'typeendtoleave': strcons_fix(self.navigation['typeendtoleave']),
            'startpassword': strcons(self.navigation['startpassword']),
            'allowAttemptDownload': strcons_fix(self.navigation['allowAttemptDownload']),
            'downloadEncryptionKey': strcons(self.navigation['downloadEncryptionKey'])
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
                'enterreviewmodeimmediately': strcons_fix(self.enterreviewmodeimmediately),
                'showactualmark': strcons_fix(self.showactualmark),
                'showtotalmark': strcons_fix(self.showtotalmark),
                'showanswerstate': strcons_fix(self.showanswerstate),
                'showpartfeedbackmessages': strcons_fix(self.showpartfeedbackmessages),
                'allowrevealanswer': strcons_fix(self.allowrevealanswer),
                'showstudentname': strcons_fix(self.showstudentname),
                'revealexpectedanswers': strcons_fix(self.revealexpectedanswers),
                'revealadvice': strcons_fix(self.revealadvice),
        }
        feedback.find('intro').append(makeContentNode(self.intro))
        feedback.find('end_message').append(makeContentNode(self.end_message))
        results_options = feedback.find('results_options')
        results_options.attrib = {
                'printquestions': strcons_fix(self.resultsprintquestions),
                'printadvice': strcons_fix(self.resultsprintadvice),
        }
        feedbackmessages = feedback.find('feedbackmessages')
        for fm in self.feedbackMessages:
            feedbackmessages.append(fm.toxml())

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

        question_groups = root.find('question_groups')
        question_groups.attrib = {
            'showQuestionGroupNames': strcons(self.showQuestionGroupNames),
            'shuffleQuestionGroups' : strcons(self.shuffleQuestionGroups),
        }

        for qg in self.question_groups:
            question_groups.append(qg.toxml())

        if self.knowledge_graph is not None:
            kg = root.find('knowledge_graph')
            kg.text = strcons(json.dumps(self.knowledge_graph))

        diagnostic = settings.find('diagnostic')
        algorithm = diagnostic.find('algorithm')
        algorithm.attrib = {
            'script': strcons(self.diagnostic_script),
        }
        algorithm.text = strcons(self.custom_diagnostic_script)
    
        return root

    def tostring(self):
        try:
            xml = self.toxml()
            return(etree.tostring(xml,encoding="UTF-8").decode('utf-8'))
        except etree.ParseError as err:
            raise ExamError('XML Error: %s' % strcons(err))

class SimplificationRule(object):
    pattern = ''
    result = ''

    def __init__(self):
        self.conditions = []

    @staticmethod
    def fromDATA(builder, data):
        rule=SimplificationRule()
        tryLoad(data,['pattern','conditions','result'],rule)
        return rule

    def toxml(self):
        rule = makeTree(['ruledef',
                            ['conditions']
                        ])
        rule.attrib = {    'pattern': strcons(self.pattern),
                        'result': strcons(self.result)
                        }
        conditions = rule.find('conditions')
        for condition in self.conditions:
            conditions.append(etree.fromstring('<condition>'+condition+'</condition>'))

        return rule


class Event(object):
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

class FeedbackMessage(object):
    message = ''
    threshold = 0

    @staticmethod
    def fromDATA(builder, data):
        feedbackmessage = FeedbackMessage()
        tryLoad(data,['message','threshold'],feedbackmessage)
        return feedbackmessage

    def toxml(self):
        feedbackmessage = makeTree(['feedbackmessage'])
        feedbackmessage.attrib = {'threshold': strcons(self.threshold)}
        feedbackmessage.append(makeContentNode(self.message))

        return feedbackmessage

class QuestionGroup(object):
    name = ''
    pickingStrategy = 'all-ordered' # 'all-ordered', ''all-shuffled', 'random-subset'
    pickQuestions = 0

    def __init__(self):
        self.questions = []

    @staticmethod
    def fromDATA(builder, data):
        qg = QuestionGroup()
        tryLoad(data,['name','pickingStrategy','pickQuestions'],qg)

        if 'questions' in data:
            for q in data['questions']:
                qg.questions.append(builder.question(q))

        if 'questionNames' in data:
            question_names = data['questionNames']
            for name,q in zip(question_names,qg.questions):
                q.customName = name

        if 'variable_overrides' in data:
            variable_overrides = data['variable_overrides']
            for vos, q in zip(variable_overrides, qg.questions):
                for vo in vos:
                    v = q.get_variable(vo['name'])
                    if v:
                        v.definition = vo['definition']

        return qg

    def toxml(self):
        qg = makeTree(['question_group',['questions']])
        qg.attrib = {
            'name': strcons(self.name),
            'pickingStrategy': strcons(self.pickingStrategy),
            'pickQuestions': strcons(self.pickQuestions),
        }
        questions = qg.find('questions')
        for q in self.questions:
            questions.append(q.toxml())

        return qg

class Question(object):
    name = 'Untitled Question'
    customName = ''
    statement =''
    advice = ''
    parts_mode = 'all'
    maxMarks = 0
    objectiveVisibility = 'always'
    penaltyVisibility = 'always'

    def __init__(self,name='Untitled Question'):
        self.name = name

        self.parts = []
        self.builtin_constants = {}
        self.constants = []
        self.variables = []
        self.variablesTest = {
            'condition': '',
            'maxRuns': 10,
        }
        self.functions = []
        self.rulesets = {}

        self.tags = []

        self.objectives = []
        self.penalties = []

        self.extensions = []

        self.preamble = {
            'js': '',
            'css': ''
        }

    def get_variable(self, name):
        for v in self.variables:
            if v.name==name:
                return v

    @staticmethod
    def fromDATA(builder, data):
        question = Question()
        tryLoad(data,['name','statement','advice','maxMarks','objectiveVisibility','penaltyVisibility','extensions'],question)
        tryLoad(data,'partsMode',question,'parts_mode')

        if haskey(data,'tags'):
            question.tags = data['tags'][:]

        if haskey(data,'parts'):
            parts = data['parts']
            for part in parts:
                question.parts.append(builder.part(part))

        if haskey(data,'builtin_constants'):
            question.builtin_constants.update(data['builtin_constants'])

        if haskey(data,'constants'):
            question.constants += [CustomConstant(d) for d in data['constants']]

        if haskey(data,'variables'):
            variables = data['variables']
            for variable in variables.keys():
                question.variables.append(Variable(variables[variable]))

        if haskey(data,'variablesTest'):
            tryLoad(data['variablesTest'],['condition','maxRuns'],question.variablesTest)
        
        if haskey(data,'functions'):
            functions = data['functions']
            for function in functions.keys():
                question.functions.append(builder.function(function,functions[function]))

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
                        l.append(builder.simplification_rule(rule))
                question.rulesets[name] = l

        if haskey(data,'objectives'):
            for objdata in data['objectives']:
                question.objectives.append(builder.scorebin(objdata))

        if haskey(data,'penalties'):
            for objdata in data['penalties']:
                question.penalties.append(builder.scorebin(objdata))

        return question

    def toxml(self):
        question = makeTree(['question',
                                ['statement'],
                                ['parts'],
                                ['advice'],
                                ['notes'],
                                ['constants',
                                    ['builtin'],
                                    ['custom'],
                                ],
                                ['variables'],
                                ['functions'],
                                ['preambles'],
                                ['rulesets'],
                                ['objectives'],
                                ['penalties'],
                                ['tags'],
                                ['extensions'],
                            ])

        question.attrib = {
            'name': strcons(self.name),
            'customName': strcons(self.customName),
            'partsMode': strcons(self.parts_mode),
            'maxMarks': strcons_fix(self.maxMarks),
            'objectiveVisibility': strcons_fix(self.objectiveVisibility),
            'penaltyVisibility': strcons_fix(self.penaltyVisibility),
        }
        question.find('statement').append(makeContentNode(self.statement))
        question.find('advice').append(makeContentNode(self.advice))

        parts = question.find('parts')
        for part in self.parts:
            parts.append(part.toxml())

        variables = question.find('variables')
        for variable in self.variables:
            variables.append(variable.toxml())
        variables.attrib = {
            'condition': strcons(self.variablesTest['condition']),
            'maxRuns': strcons_fix(self.variablesTest['maxRuns']),
        }

        builtin_constants = question.find('constants/builtin')
        for name,enable in self.builtin_constants.items():
            c = etree.Element('constant')
            c.attrib = {'name': strcons_fix(name), 'enable': strcons_fix(enable)}
            builtin_constants.append(c)

        custom_constants = question.find('constants/custom')
        for c in self.constants:
            custom_constants.append(c.toxml())

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

        objectives = question.find('objectives')
        for objective in self.objectives:
            objectives.append(objective.toxml())

        penalties = question.find('penalties')
        for penalty in self.penalties:
            penalties.append(penalty.toxml())

        tags = question.find('tags')
        for tag in self.tags:
            tag_element = etree.Element('tag')
            tag_element.text = tag
            tags.append(tag_element)

        extensions = question.find('extensions')
        for extension in self.extensions:
            extension_element = etree.Element('extension')
            extension_element.text = strcons(extension)
            extensions.append(extension_element)

        return question

class Variable(object):
    name = ''
    definition = ''

    def __init__(self,data):
        self.name = data.get('name')
        self.definition = data.get('definition','')
    
    def toxml(self):
        variable = makeTree(['variable',['value']])
        variable.attrib = {'name': strcons(self.name)}
        variable.find('value').text = strcons(self.definition)
        return variable

class CustomConstant(object):
    name = ''
    value = ''
    tex = ''

    def __init__(self,data):
        self.name = data.get('name')
        self.value = data.get('value','')
        self.tex = data.get('tex','')
    
    def toxml(self):
        constant = etree.Element('constant')
        constant.attrib = {
            'name': strcons(self.name),
            'value': strcons(self.value),
            'tex': strcons(self.tex),
        }
        return constant

class Function(object):
    name = ''
    type = ''
    definition = ''
    language = 'jme'

    def __init__(self,name):
        self.name = name
        self.parameters = {}
    
    @staticmethod
    def fromDATA(builder, name, data):
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

        for pname, ptype in self.parameters:
            parameter = etree.Element(
                'parameter',
                {
                    'name': pname, 
                    'type': ptype, 
                }
            )
            parameters.append(parameter)

        return function

class VariableReplacement(object):
    variable = ''
    part = ''
    must_go_first = False

    @staticmethod
    def fromDATA(builder, data):
        vr = VariableReplacement()
        tryLoad(data,['variable','part','must_go_first'],vr)
        return vr

    def toxml(self):
        replacement = etree.Element('replace')
        replacement.attrib = {
            'variable': strcons(self.variable),
            'part': strcons(self.part),
            'must_go_first': strcons_fix(self.must_go_first),
        }
        return replacement

class NextPart(object):
    other_part = ''
    label = ''
    availabilityCondition = ''
    penalty = ''
    penalty_amount = ''
    showPenaltyHint = True
    lockAfterLeaving = False

    def __init__(self):
        self.variable_replacements = []

    @staticmethod
    def fromDATA(builder, data):
        np = NextPart()
        tryLoad(data,'otherPart',np,'other_part')
        tryLoad(data,['label','availabilityCondition','penalty','showPenaltyHint','lockAfterLeaving'],np)
        tryLoad(data,'penaltyAmount',np,'penalty_amount')
        if 'variableReplacements' in data:
            for vrd in data['variableReplacements']:
                vr = {}
                tryLoad(vrd,['variable','definition'],vr)
                np.variable_replacements.append(vr)
        return np

    def toxml(self):
        nextpart = makeTree(['nextpart',
            ['variablereplacements'],
        ])
        nextpart.attrib = {
            'index': strcons(self.other_part),
            'label': strcons(self.label),
            'availabilityCondition': strcons(self.availabilityCondition),
            'penalty': strcons(self.penalty),
            'penaltyamount': strcons_fix(self.penalty_amount),
            'showpenaltyhint': strcons_fix(self.showPenaltyHint),
            'lockafterleaving': strcons_fix(self.lockAfterLeaving),
        }
        variable_replacements = nextpart.find('variablereplacements')
        for vr in self.variable_replacements:
            vre = etree.Element('replacement')
            vre.attrib = {
                'variable': vr['variable'],
                'definition': vr['definition'],
            }
            variable_replacements.append(vre)
        return nextpart

class ScoreBin(object):
    name = ''
    limit = 0

    def __init__(self):
        pass

    @staticmethod
    def fromDATA(builder, data):
        sb = ScoreBin()

        tryLoad(data, ['name','limit'],sb)

        return sb

    def toxml(self):
        scorebin = makeTree(['scorebin'])
        scorebin.attrib = {
            'name': strcons_fix(self.name),
            'limit': strcons_fix(self.limit),
        }
        return scorebin

class Part(object):
    useCustomName = False
    customName = ''
    prompt = ''
    alternativeFeedbackMessage = ''
    useAlternativeFeedback = False
    kind = ''
    stepsPenalty = 0
    enableMinimumMarks = True
    minimumMarks = 0
    showCorrectAnswer = True
    showFeedbackIcon = True
    variableReplacementStrategy = 'originalfirst'
    adaptiveMarkingPenalty = 0
    customMarkingAlgorithm = ''
    extendBaseMarkingAlgorithm = True
    exploreObjective = None
    suggestGoingBack = False

    def __init__(self,marks,prompt=''):
        self.marks = marks
        self.prompt = prompt
        self.steps = []
        self.alternatives = []
        self.scripts = {}
        self.variable_replacements = []
        self.next_parts = []

    def loadDATA(self, builder, data):
        tryLoad(
            data,
            [
                'useCustomName',
                'customName',
                'stepsPenalty',
                'minimumMarks',
                'enableMinimumMarks',
                'showCorrectAnswer',
                'showFeedbackIcon',
                'variableReplacementStrategy',
                'adaptiveMarkingPenalty',
                'customMarkingAlgorithm',
                'extendBaseMarkingAlgorithm',
                'exploreObjective',
                'suggestGoingBack',
                'useAlternativeFeedback',
            ],
            self
        )

        if haskey(data,'marks'):
            self.marks = data['marks']

        if haskey(data,'prompt'):
            self.prompt = data['prompt']

        if haskey(data,'alternativeFeedbackMessage'):
            self.alternativeFeedbackMessage = data['alternativeFeedbackMessage']

        if haskey(data,'steps'):
            steps = data['steps']
            for step in steps:
                self.steps.append(builder.part(step))

        if haskey(data,'alternatives'):
            for alternative in data['alternatives']:
                self.alternatives.append(builder.part(alternative))

        if haskey(data,'scripts'):
            for name,script in data['scripts'].items():
                self.scripts[name] = script

        if haskey(data,'variableReplacements'):
            self.variable_replacements = [builder.variable_replacement(vr) for vr in data['variableReplacements']]

        if haskey(data,'nextParts'):
            self.next_parts = [builder.next_part(np) for np in data['nextParts']]
    
    def toxml(self):
        part = makeTree(['part',
                            ['prompt'],
                            ['alternativefeedbackmessage'],
                            ['steps'],
                            ['alternatives'],
                            ['scripts'],
                            ['adaptivemarking',
                                ['variablereplacements'],
                            ],
                            ['markingalgorithm'],
                            ['nextparts'],
                        ])

        part.attrib = {
            'usecustomname': strcons_fix(self.useCustomName),
            'customName': strcons(self.customName),
            'type': strcons(self.kind), 
            'marks': strcons_fix(self.marks), 
            'stepspenalty': strcons_fix(self.stepsPenalty), 
            'enableminimummarks': strcons_fix(self.enableMinimumMarks), 
            'minimummarks': strcons_fix(self.minimumMarks), 
            'showcorrectanswer': strcons_fix(self.showCorrectAnswer),
            'showfeedbackicon': strcons_fix(self.showFeedbackIcon),
            'exploreobjective': strcons_fix(self.exploreObjective) if self.exploreObjective is not None else '',
            'suggestgoingback': strcons_fix(self.suggestGoingBack),
            'usealternativefeedback': strcons_fix(self.useAlternativeFeedback),
        }

        part.find('prompt').append(makeContentNode(self.prompt))

        if self.alternativeFeedbackMessage:
            part.find('alternativefeedbackmessage').append(makeContentNode(self.alternativeFeedbackMessage))

        steps = part.find('steps')
        for step in self.steps:
            steps.append(step.toxml())

        alternatives = part.find('alternatives')
        for alternative in self.alternatives:
            alternatives.append(alternative.toxml())

        scripts = part.find('scripts')
        for name,script_dict in self.scripts.items():
            script_element = etree.Element('script')
            script_element.attrib = {
                'name': name,
                'order': script_dict.get('order','instead')
            }
            script_element.text = strcons(script_dict.get('script',''))
            scripts.append(script_element)

        marking_algorithm = part.find('markingalgorithm')
        marking_algorithm.text = strcons(self.customMarkingAlgorithm)
        marking_algorithm.attrib = {
            'extend': strcons_fix(self.extendBaseMarkingAlgorithm),
        }

        adaptivemarking = part.find('adaptivemarking')
        adaptivemarking.attrib = {
            'penalty': strcons_fix(self.adaptiveMarkingPenalty),
            'strategy': self.variableReplacementStrategy
        }
        variable_replacements = part.find('adaptivemarking/variablereplacements')
        for vr in self.variable_replacements:
            replacement = vr.toxml()
            variable_replacements.append(replacement)
        next_parts = part.find('nextparts')
        for np in self.next_parts:
            next_parts.append(np.toxml())

        return part

class JMEPart(Part):
    kind = 'jme'
    answer = ''
    answerSimplification = ''
    showPreview = True
    checkingType = 'RelDiff'
    checkingAccuracy = 0        #real default value depends on checkingtype - 0.0001 for difference ones, 5 for no. of digits ones
    failureRate = 1
    vsetRangeStart = 0
    vsetRangeEnd = 1
    vsetRangePoints = 5
    checkVariableNames = False
    singleLetterVariables = False
    allowUnknownFunctions = True
    implicitFunctionComposition = False
    caseSensitive = False
    valueGenerators = []

    def __init__(self,marks=0,prompt=''):
        Part.__init__(self,marks,prompt)

        self.maxLength = LengthRestriction('maxlength',0,'Your answer is too long.')
        self.maxLength.length = 0
        self.minLength = LengthRestriction('minlength',0,'Your answer is too short.')
        self.minLength.length = 0
        self.mustHave = StringRestriction('musthave',0,'Your answer does not contain all required elements.')
        self.notAllowed = StringRestriction('notallowed',0,'Your answer contains elements which are not allowed.')
        self.mustMatchPattern = PatternRestriction('mustmatchpattern')
    
    def loadDATA(self, builder, data):
        super(JMEPart,self).loadDATA(builder, data)

        tryLoad(data,['answer','answerSimplification','showPreview','checkingType','failureRate','vsetRangePoints','checkVariableNames','singleLetterVariables','allowUnknownFunctions','implicitFunctionComposition','caseSensitive'],self)

        #default checking accuracies
        if self.checkingType.lower() == 'reldiff' or self.checkingType.lower() == 'absdiff':
            self.checkingAccuracy = 0.0001
        else:    #dp or sigfig
            self.checkingAccuracy = 5
        #get checking accuracy from data, if defined
        tryLoad(data,'checkingAccuracy',self)

        if haskey(data,'maxlength'):
            self.maxLength = builder.length_restriction('maxlength',data['maxlength'],self.maxLength)
        if haskey(data,'minlength'):
            self.minLength = builder.length_restriction('minlength',data['minlength'],self.minLength)
        if haskey(data,'musthave'):
            self.mustHave = builder.string_restriction('musthave',data['musthave'],self.mustHave)
        if haskey(data,'notallowed'):
            self.notAllowed = builder.string_restriction('notallowed',data['notallowed'],self.notAllowed)
        if haskey(data,'mustmatchpattern'):
            self.mustMatchPattern = builder.pattern_restriction('mustmatchpattern',data['mustmatchpattern'],self.mustMatchPattern)

        if haskey(data,'vsetrange'):
            vsetrange = case_insensitive_get(data,'vsetrange')
            if len(vsetrange) == 2:
                self.vsetRangeStart = vsetrange[0]
                self.vsetRangeEnd = vsetrange[1]

        if haskey(data,'valuegenerators'):
            self.valueGenerators = case_insensitive_get(data,'valuegenerators')

    def toxml(self):
        part = super(JMEPart,self).toxml()
        part.append(makeTree(['answer',
                                ['correctanswer',['math']],
                                ['checking',
                                        ['range'],
                                        ['valuegenerators'],
                                ]
                            ]))

        answer = part.find('answer')
        answer.attrib = {
                'checkvariablenames': strcons_fix(self.checkVariableNames),
                'singlelettervariables': strcons_fix(self.singleLetterVariables),
                'allowunknownfunctions': strcons_fix(self.allowUnknownFunctions),
                'implicitfunctioncomposition': strcons_fix(self.implicitFunctionComposition),
                'caseSensitive': strcons_fix(self.caseSensitive),
                'showPreview': strcons_fix(self.showPreview),
        }
        correctAnswer = answer.find('correctanswer')
        correctAnswer.attrib = {'simplification': strcons(self.answerSimplification)}
        correctAnswer.find('math').text = strcons(self.answer)
        
        checking = answer.find('checking')
        checking.attrib = {
                'type': strcons(self.checkingType),
                'accuracy': strcons_fix(self.checkingAccuracy),
                'failurerate': strcons_fix(self.failureRate)
        }
        checking.find('range').attrib = {'start': strcons_fix(self.vsetRangeStart), 'end': strcons_fix(self.vsetRangeEnd),  'points': strcons_fix(self.vsetRangePoints)}

        valueGenerators = checking.find('valuegenerators')
        for g in self.valueGenerators:
            generator = etree.Element('generator')
            generator.attrib = {'name': g['name'], 'value': g['value']}
            valueGenerators.append(generator)

        answer.append(self.maxLength.toxml())
        answer.append(self.minLength.toxml())
        answer.append(self.mustHave.toxml())
        answer.append(self.notAllowed.toxml())
        answer.append(self.mustMatchPattern.toxml())

        return part

class Restriction:
    message = ''

    def __init__(self,name='',partialCredit=0,message=''):
        self.name = name
        self.strings = []
        self.partialCredit = partialCredit
        self.message = message
    
    @classmethod
    def fromDATA(cls, builder, name, data, restriction=None):
        if restriction==None:
            restriction = cls(name)
        tryLoad(data,['partialCredit','message'],restriction)

        return restriction

    def toxml(self):
        restriction = makeTree([self.name,'message'])

        restriction.attrib = {'partialcredit': strcons_fix(self.partialCredit)+'%'}

        restriction.find('message').append(makeContentNode(self.message))

        return restriction

class LengthRestriction(Restriction):
    length = -1

    @classmethod
    def fromDATA(cls, builder, name, data, restriction=None):
        restriction = super().fromDATA(builder,name,data,restriction)
        tryLoad(data,['length'],restriction)
        return restriction

    def toxml(self):
        restriction = super().toxml()
        if int(self.length)>=0:
            restriction.attrib['length'] = strcons_fix(self.length)

        return restriction

class StringRestriction(Restriction):
    showStrings = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args,**kwargs)
        self.strings = []

    @classmethod
    def fromDATA(cls, builder, name, data, restriction=None):
        restriction = super().fromDATA(builder,name,data,restriction)
        tryLoad(data,['showStrings'],restriction)
        if haskey(data,'strings'):
            for string in data['strings']:
                restriction.strings.append(string)
        return restriction

    def toxml(self):
        restriction = super().toxml()

        restriction.attrib['showstrings'] = strcons_fix(self.showStrings)

        for s in self.strings:
            string = etree.Element('string')
            string.text = strcons(s)
            restriction.append(string)

        return restriction

class PatternRestriction(Restriction):
    pattern = ''
    nameToCompare = ''
    warningTime = 'input'

    @classmethod
    def fromDATA(cls, builder, name, data, restriction=None):
        restriction = super().fromDATA(builder,name,data,restriction)
        tryLoad(data,['pattern','nameToCompare', 'warningTime'],restriction)
        return restriction

    def toxml(self):
        restriction = super().toxml()
        restriction.attrib['pattern'] = strcons_fix(self.pattern)
        restriction.attrib['nameToCompare'] = strcons_fix(self.nameToCompare)
        restriction.attrib['warningTime'] = strcons_fix(self.warningTime)

        return restriction

class PatternMatchPart(Part):
    kind = 'patternmatch'
    caseSensitive = False
    partialCredit = 0
    answer = ''
    displayAnswer = ''
    matchMode = 'regex'

    def __init__(self,marks=0,prompt=''):
        Part.__init__(self,marks,prompt)

    def loadDATA(self, builder, data):
        super(PatternMatchPart,self).loadDATA(builder, data)

        tryLoad(data,['caseSensitive','partialCredit','answer','displayAnswer','matchMode'],self)

    def toxml(self):
        part = super(PatternMatchPart,self).toxml()
        appendMany(part,['displayanswer','correctanswer','case'])
        
        part.find('displayanswer').append(makeContentNode(self.displayAnswer))

        part.find('correctanswer').text = strcons(self.answer)
        part.find('correctanswer').attrib = {'mode':strcons(self.matchMode)}

        part.find('case').attrib = {'sensitive': strcons_fix(self.caseSensitive), 'partialcredit': strcons_fix(self.partialCredit)+'%'}

        return part

class NumberEntryPart(Part):
    kind = 'numberentry'
    allowFractions = False
    notationStyles = ['en','si-en','plain']
    checkingType = 'range'
    answer = 0
    checkingAccuracy = 0
    minvalue = 0
    maxvalue = 0
    correctAnswerFraction = False
    correctAnswerStyle = 'plain'
    inputStep = 1

    mustBeReduced = False
    mustBeReducedPC = 0

    precisionType = 'none'
    precision = 0
    precisionPartialCredit = 0
    precisionMessage = ''
    showPrecisionHint = True
    showFractionHint = True
    strictPrecision = True
    displayAnswer = ''

    def __init__(self,marks=0,prompt=''):
        Part.__init__(self,marks,prompt)
    
    def loadDATA(self, builder, data):
        super(NumberEntryPart,self).loadDATA(builder, data)

        tryLoad(data,['correctAnswerFraction','correctAnswerStyle','allowFractions','notationStyles','checkingType','inputStep','mustBeReduced','mustBeReducedPC','precisionType','precision','precisionPartialCredit','precisionMessage','strictPrecision','showPrecisionHint','showFractionHint', 'displayAnswer'],self)
        if self.checkingType == 'range':
            if haskey(data,'answer'):
                self.maxvalue = self.minvalue = data['answer']
            else:
                tryLoad(data,['minvalue','maxvalue'],self)
        else:
            tryLoad(data,['answer','checkingAccuracy'],self)

    def toxml(self):
        part = super(NumberEntryPart,self).toxml()
        part.append(makeTree(['answer',
                                ['precision','message'],
                            ]
                            ))

        answer = part.find('answer')
        answer.attrib = {
            'checkingType': strcons(self.checkingType),
            'inputstep': strcons_fix(self.inputStep),
            'allowfractions': strcons_fix(self.allowFractions),
            'showfractionhint': strcons_fix(self.showFractionHint),
            'notationstyles': strcons_fix(','.join(self.notationStyles)),
            'correctanswerfraction': strcons_fix(self.correctAnswerFraction),
            'correctanswerstyle': strcons_fix(self.correctAnswerStyle),
            'mustbereduced': strcons_fix(self.mustBeReduced),
            'mustbereducedpc': strcons_fix(self.mustBeReducedPC)+'%',
            'displayanswer': strcons(self.displayAnswer),
        }
        if self.checkingType == 'range':
            answer.attrib['minvalue'] = strcons_fix(self.minvalue)
            answer.attrib['maxvalue'] = strcons_fix(self.maxvalue)
        else:
            answer.attrib['answer'] = strcons_fix(self.answer)
            answer.attrib['accuracy'] = strcons_fix(self.checkingAccuracy)
        answer.find('precision').attrib = {
            'type': strcons(self.precisionType), 
            'precision': strcons_fix(self.precision), 
            'partialcredit': strcons_fix(self.precisionPartialCredit)+'%',
            'strict': strcons_fix(self.strictPrecision),
            'showprecisionhint': strcons_fix(self.showPrecisionHint),
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
    minColumns = 0
    maxColumns = 0
    minRows = 0
    maxRows = 0
    prefilledCells = ''

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

    def loadDATA(self, builder, data):
        super(MatrixEntryPart,self).loadDATA(builder, data)
        tryLoad(data,[
            'correctAnswer',
            'correctAnswerFractions',
            'numRows',
            'numColumns',
            'allowResize',
            'minColumns',
            'maxColumns',
            'minRows',
            'maxRows',
            'prefilledCells',
            'tolerance',
            'markPerCell',
            'allowFractions',
            'precisionType',
            'precision',
            'precisionPartialCredit',
            'precisionMessage',
            'strictPrecision'
        ],self)

    def toxml(self):
        part = super(MatrixEntryPart,self).toxml()
        part.append(makeTree(['answer',
                                ['precision','message'],
                            ]
        ))

        answer = part.find('answer')
        answer.attrib = {
            'correctanswer': strcons(self.correctAnswer),
            'correctanswerfractions': strcons_fix(self.correctAnswerFractions),
            'rows': strcons_fix(self.numRows),
            'columns': strcons_fix(self.numColumns),
            'allowresize': strcons_fix(self.allowResize),
            'mincolumns': strcons_fix(self.minColumns),
            'maxcolumns': strcons_fix(self.maxColumns),
            'minrows': strcons_fix(self.minRows),
            'maxrows': strcons_fix(self.maxRows),
            'tolerance': strcons_fix(self.tolerance),
            'markpercell': strcons_fix(self.markPerCell),
            'allowfractions': strcons_fix(self.allowFractions),
            'prefilledcells': strcons_fix(self.prefilledCells),
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
    layoutType = 'all'
    layoutExpression = ''
    showCellAnswerState = True
    markingMethod = 'positive'
    
    def __init__(self,marks=0,prompt=''):
        Part.__init__(self,marks,prompt)

        self.choices = []
        self.answers = []
        self.matrix = []

        self.distractors = []

    def loadDATA(self, builder, data):
        super(MultipleChoicePart,self).loadDATA(builder, data)

        displayTypes = {
                '1_n_2': 'radiogroup',
                'm_n_2': 'checkbox',
                'm_n_x': 'radiogroup'
        }

        self.displayType = displayTypes[self.kind]
        tryLoad(data,['minMarks','maxMarks','minAnswers','maxAnswers','shuffleChoices','shuffleAnswers','displayType','displayColumns','warningType','showCellAnswerState','markingMethod'],self)

        if haskey(data,'minmarks'):
            self.minMarksEnabled = True
        if haskey(data,'maxmarks'):
            self.maxMarksEnabled = True

        if haskey(data,'choices'):
            if isinstance(data['choices'],list):
                self.choices = data['choices'][:]
            else:
                self.choices = data['choices']

        if haskey(data,'answers'):
            if isinstance(data['answers'],list):
                self.answers = data['answers'][:]
            else:
                self.answers = data['answers']

        if haskey(data,'layout'):
            tryLoad(data['layout'],'type',self,'layoutType')
            tryLoad(data['layout'],'expression',self,'layoutExpression')
    
        if haskey(data,'matrix'):
            self.matrix = data['matrix']
            if isinstance(self.matrix,list) and len(self.matrix)>0 and (not isinstance(self.matrix[0],list)):    #so you can give just one row without wrapping it in another array
                self.matrix = [[x] for x in self.matrix]

        if haskey(data,'distractors'):
            self.distractors = data['distractors']
            if len(self.distractors)>0 and (not isinstance(self.distractors[0],list)):
                self.distractors = [[x] for x in self.distractors]

    def toxml(self):
        part = super(MultipleChoicePart,self).toxml()
        appendMany(part,['choices','answers','layout',['marking','matrix','maxmarks','minmarks','distractors','warning']])

        part.attrib['showcellanswerstate'] = strcons_fix(self.showCellAnswerState)

        choices = part.find('choices')
        choices.attrib = {
            'minimumexpected': strcons_fix(self.minAnswers),
            'maximumexpected': strcons_fix(self.maxAnswers),
            'displaycolumns': strcons_fix(self.displayColumns),
            'shuffle': strcons_fix(self.shuffleChoices),
            'displaytype': strcons(self.displayType),
        }

        if isinstance(self.choices,str):
            choices.attrib['def'] = strcons(self.choices)
        else:
            for choice in self.choices:
                choices.append(makeTree(['choice',makeContentNode(choice)]))

        answers = part.find('answers')
        answers.attrib = {'shuffle': strcons_fix(self.shuffleAnswers)}
        if isinstance(self.answers,str):
            answers.attrib['def'] = strcons(self.answers)
        else:
            for answer in self.answers:
                answers.append(makeTree(['answer',makeContentNode(answer)]))

        layout = part.find('layout')
        layout.attrib = {
            'type': self.layoutType,
            'expression': self.layoutExpression,
        }

        marking = part.find('marking')
        marking.attrib = {'method': strcons_fix(self.markingMethod)}
        marking.find('maxmarks').attrib = {'enabled': strcons_fix(self.maxMarksEnabled), 'value': strcons_fix(self.maxMarks)}
        marking.find('minmarks').attrib = {'enabled': strcons_fix(self.minMarksEnabled), 'value': strcons_fix(self.minMarks)}
        matrix = marking.find('matrix')
        if isinstance(self.matrix,str):
            matrix.attrib = {'def': strcons(self.matrix)}
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

class ChooseOnePart(MultipleChoicePart):
    kind = '1_n_2'

class ChooseSeveralPart(MultipleChoicePart):
    kind = 'm_n_2'

class MatchChoicesWithAnswersPart(MultipleChoicePart):
    kind = 'm_n_x'

class InformationPart(Part):
    kind = 'information'

    def __init__(self,prompt=''):
        Part.__init__(self,0,prompt)

def custom_part_constructor(definition):
    class CustomPart(Part):
        kind = definition['short_name']

        def __init__(self,prompt=''):
            Part.__init__(self,0,prompt)
            self.settings = {}
        
        def loadDATA(self, builder, data):
            super(CustomPart,self).loadDATA(builder, data)
            if 'settings' in data:
                for setting in definition['settings']:
                    tryLoad(data['settings'],setting['name'],self.settings)

        def toxml(self):
            part = super(CustomPart,self).toxml()
            part.attrib['custom'] = 'true'
            part.append(makeTree(['settings']))
            settings = part.find('settings')
            for name,value in self.settings.items():
                setting = etree.Element('setting')
                setting.attrib = {
                    'name': strcons_fix(name),
                    'value': strcons_fix(json.dumps(value))
                }
                settings.append(setting)
            return part

    return CustomPart

class ExtensionPart(Part):
    kind = 'extension'

    def __init__(self,marks=0,prompt=''):
        Part.__init__(self,marks,prompt)
    
class GapFillPart(Part):
    kind = 'gapfill'

    sortAnswers = False

    def __init__(self,prompt=''):
        Part.__init__(self,0,prompt)
        
        self.gaps = []

    def loadDATA(self, builder, data):
        super(GapFillPart,self).loadDATA(builder, data)

        if haskey(data,'gaps'):
            gaps = data['gaps']
            for gap in gaps:
                self.gaps.append(builder.part(gap))
        tryLoad(data, ['sortAnswers'],self)
    
    def toxml(self):
        self.marks = 0

        prompt = self.prompt

        def replace_gapfill(m):
            d=int(m.group(1))
            if len(self.gaps)<=d:
                raise ExamError("Reference to an undefined gap in a gapfill part (%i,%i)" %(d,len(self.gaps)))
            return '<gapfill reference="%s"></gapfill>' % d

        self.prompt = re.sub(r"\[\[(\d+?)\]\]",replace_gapfill,self.prompt)

        part = super(GapFillPart,self).toxml()
        self.prompt = prompt

        gaps = etree.Element('gaps')
        part.append(gaps)

        for gap in self.gaps:
            gaps.append(gap.toxml())

        marking = etree.Element('marking')
        marking.attrib = {
            'sortanswers': strcons_fix(self.sortAnswers),
        }
        part.append(marking)

        return part

class ExamBuilder(object):
    part_constructors = {
        'jme': JMEPart,
        'numberentry': NumberEntryPart,
        'matrix': MatrixEntryPart,
        'patternmatch': PatternMatchPart,
        '1_n_2': ChooseOnePart,
        'm_n_2': ChooseSeveralPart,
        'm_n_x': MatchChoicesWithAnswersPart,
        'gapfill': GapFillPart,
        'information': InformationPart,
        'extension': ExtensionPart,
    }

    def __init__(self, custom_part_types=None):
        self.custom_part_constructors = {}

    def exam_from_string(self, string):
        exam_object = NumbasObject(string)

        self.custom_part_constructors = {}
        custom_part_types = exam_object.data.get('custom_part_types',[])
        if custom_part_types:
            for definition in custom_part_types:
                self.custom_part_constructors[definition['short_name']] = custom_part_constructor(definition)

        return self.exam(exam_object.data)

    def exam(self, data):
        return Exam.fromDATA(self, data)

    def simplification_rule(self, data):
        return SimplificationRule.fromDATA(self, data)

    def feedback_message(self, data):
        return FeedbackMessage.fromDATA(self, data)

    def question_group(self, data):
        return QuestionGroup.fromDATA(self, data)

    def question(self, data):
        return Question.fromDATA(self, data)

    def function(self, name, data):
        return Function.fromDATA(self, name, data)

    def string_restriction(self, name, data, restriction=None):
        return StringRestriction.fromDATA(self, name, data, restriction)

    def length_restriction(self, name, data, restriction=None):
        return LengthRestriction.fromDATA(self, name, data, restriction)

    def pattern_restriction(self, name, data, restriction=None):
        return PatternRestriction.fromDATA(self, name, data, restriction)


    def variable_replacement(self, data):
        return VariableReplacement.fromDATA(self, data)

    def next_part(self, data):
        return NextPart.fromDATA(self, data)

    def part(self, data):
        kind = data['type'].lower()

        constructors = {}
        constructors.update(self.part_constructors)
        constructors.update(self.custom_part_constructors)

        if not kind in constructors:
            raise ExamError(
                'Invalid part type '+kind,
                'Valid part types are '+', '.join(sorted([x for x in constructors]))
            )
        part = constructors[kind]()
        part.loadDATA(self, data)
        return part

    def scorebin(self, data):
        return ScoreBin.fromDATA(self, data)

if __name__ == '__main__':
    if len(sys.argv)>1:
        filename = sys.argv[1]
    else:
        filename=os.path.join('..','exams','testExam.exam')

    data = open(filename,encoding='UTF-8').read()
    exam = Exam.fromstring(data)

    xml = exam.tostring()
    sys.stdout.write(xml)
