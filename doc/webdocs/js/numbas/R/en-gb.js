/*
Copyright 2011 Newcastle University

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
R.registerLocale('en-GB',{
	'control.confirm end': "Are you sure you want to end the exam? After you end the exam, you will not be able to change any of your answers.",
	'control.confirm regen': "Would you like to re-randomise this question? If you click OK, all your answers and marks for the current question will be lost.",
	'control.confirm reveal': "Would you like to reveal the answer to this question? Any marks you have received so far will be removed and you will not be able to answer this question later.",
	'control.regen': "Try another question like this one",
	'control.submit answer': "Submit answer",
	'control.submit all parts': "Submit all parts",
	'control.submit again': "Submit again",
	'control.submit': "Submit",

	'display.part.jme.error making maths': "Error making maths display",
	
	'exam.xml.bad root': "Root element of exam XML should be 'exam'",
	'exam.changeQuestion.no questions': "This exam contains no questions! Check the .exam file for errors.",

	'feedback.marks': "<strong>%s</strong> %s",
	'feedback.you were awarded': "You were awarded %s.",
	'feedback.taken away': "%s %s taken away.",

	'jme.tokenise.invalid': "Invalid expression: %s",

	'jme.shunt.not enough arguments': "Not enough arguments for operation %s",
	'jme.shunt.no left bracket in function': "No matching left bracket in function application or tuple",
	'jme.shunt.no left square bracket': "No matching left bracket",
	'jme.shunt.no left bracket': "No matching left bracket",
	'jme.shunt.no right bracket': "No matching right bracket",
	'jme.shunt.no right square bracket': "No matching right square bracket to end list",
	'jme.shunt.missing operator': "Expression can't be evaluated -- missing an operator.",

	'jme.typecheck.function not defined': "Operation '%s' is not defined. Did you mean <br/><code>%s*(...)</code>?",
	'jme.typecheck.op not defined': "Operation '%s' is not defined.",
	'jme.typecheck.no right type definition': "No definition of '%s' of correct type found.",

	'jme.evaluate.undefined variable': "Variable %s is undefined",

	'jme.func.switch.no default case': "No default case for Switch statement",
	'jme.func.listval.invalid index': "Invalid list index %i on list of size %i",
	'jme.func.matrix.invalid row type': "Can't construct a matrix from rows of type %s",
	'jme.func.except.continuous range': "Can't use the 'except' operator on continuous ranges.",

	'jme.texsubvars.no right bracket': "No matching <code>]</code> in %s arguments.",
	'jme.texsubvars.missing parameter': "Missing parameter in %s: %s",
	'jme.texsubvars.no right brace': "No matching <code>}</code> in %s",

	'jme.user javascript error': "Error in user-defined javascript function <code>%s</code><br/>%s",

	'jme.variables.variable not defined': "Variable %s not defined.",
	'jme.variables.circular reference': "Circular variable reference in question %s %s",

	'jme.display.unknown token type': "Can't texify token type %s",
	'jme.display.collectRuleset.no sets': 'No sets given to collectRuleset!',
	'jme.display.collectRuleset.set not defined': "Ruleset %s has not been defined",
	'jme.display.simplifyTree.no scope given': "Numbas.jme.display.simplifyTree must be given a Scope",

	'math.precround.complex': "Can't round to a complex number of decimal places",
	'math.siground.complex': "Can't round to a complex number of sig figs",
	'math.combinations.complex': "Can't compute combinations of complex numbers",
	'math.permutations.complex': "Can't compute permutations of complex numbers",
	'math.gcf.complex': "Can't compute GCF of complex numbers",
	'math.lcm.complex': "Can't compute LCM of complex numbers",
	'math.lt.order complex numbers': "Can't order complex numbers",
	'math.choose.empty selection': "Empty selection given to random function",

	'matrixmath.abs.non-square': "Can't compute the determinant of a matrix which isn't square.",
	'matrixmath.abs.too big': "Sorry, can't compute the determinant of a matrix bigger than 3x3 yet.",
	'matrixmath.mul.different sizes': "Can't multiply matrices of different sizes.",

	'vectormath.cross.not 3d': "Can only take the cross product of 3-dimensional vectors.",
	'vectormath.dot.matrix too big': "Can't calculate dot product of a matrix which isn't $1 \\times N$ or $N \\times 1$.",
	'vectormath.cross.matrix too big': "Can't calculate cross product of a matrix which isn't $1 \\times N$ or $N \\times 1$.",

	'part.marking.steps no matter': "Because you received full marks for the part, your answers to the steps aren't counted.",
	'part.marking.steps change single': "You were awarded <strong>%s</strong> mark for your answers to the steps",
	'part.marking.steps change plural': "You were awarded <strong>%s</strong> marks for your answers to the steps",
	'part.marking.revealed steps with penalty single': "You revealed the steps. The maximum you can score for this part is <strong>%s</strong> mark. Your scores will be scaled down accordingly.",
	'part.marking.revealed steps with penalty plural': "You revealed the steps. The maximum you can score for this part is <strong>%s</strong> marks. Your scores will be scaled down accordingly.",
	'part.marking.revealed steps no penalty': "You revealed the steps.",
	'part.marking.not submitted': "No answer submitted",
	'part.marking.did not answer': "You did not answer this question.",
	'part.marking.total score single': "You scored <strong>%s</strong> mark for this part.",
	'part.marking.total score plural': "You scored <strong>%s</strong> marks for this part.",
	'part.marking.nothing entered': "You did not enter an answer.",
	'part.marking.incorrect': "Your answer is incorrect.",
	'part.marking.correct': "Your answer is correct.",

	'part.missing type attribute': "Missing part type attribute",
	'part.unknown type': "Unrecognised part type %s",

	'part.setting not present': "Property '%s' not set in part %s of question \"%s\"",

	'part.jme.answer missing': "Correct answer for a JME part is missing (%s)",
	'part.jme.answer too long': "Your answer is too long.",
	'part.jme.answer too short': "Your answer is too short.",
	'part.jme.answer invalid': "Your answer is not a valid mathematical expression.<br/>%s",
	'part.jme.marking.correct': "Your answer is numerically correct.",
	'part.jme.must-have bits': '<span class="monospace">%s</span>',
	'part.jme.must-have one': "Your answer must contain: %s",
	'part.jme.must-have several': "Your answer must contain all of: %s",
	'part.jme.not-allowed bits': '<span class="monospace">%s</span>',
	'part.jme.not-allowed one': "Your answer must not contain: %s",
	'part.jme.not-allowed several': "Your answer must not contain any of: %s",

	'part.patternmatch.display answer missing': "Display answer is missing from a Pattern Match part (%s)",
	'part.patternmatch.correct except case': "Your answer is correct, except for the case.",

	'part.numberentry.correct except decimal': "Your answer is within the allowed range, but decimal numbers are not allowed.",
	'part.numberentry.answer invalid': "You did not enter a valid number.",

	'part.mcq.choices missing': "Definition of choices is missing from a Multiple Response part (%s)",
	'part.mcq.matrix not a number': "Part %s marking matrix cell %s,%s does not evaluate to a number",
	'part.mcq.wrong number of choices': "You selected the wrong number of choices.",
	'part.mcq.no choices selected': "No choices selected.",
	'part.mcq.matrix not a list': "Marking matrix for a Multiple Response part, defined by JME expression, is not a list but it should be.",
	
	'question.substituting': "Error substituting content: <br/>%s<br/>%s",
	'question.no such part': "Can't find part %s",
	'question.can not submit': "Can not submit answer - check for errors.",
	'question.answer submitted': "Answer submitted",

	'question.score feedback.answered total actual': "Score: %(score)/%(marks)",
	'question.score feedback.answered total': "%(marksString). Answered.",
	'question.score feedback.answered actual': "Score: %(scoreString)",
	'question.score feedback.answered': "Answered.",
	'question.score feedback.unanswered total': "%(marksString).",
	
	'timing.no accumulator': "no timing accumulator %s",
	'timing.time remaining': "Time remaining: %s",
	
	'xml.could not load': "Couldn't load an XML document: %s",
	'xml.property not number': "Property %s should be a number, but isn't (%s), in node %s",
	'xml.property not boolean': "Property %s should be a boolean, but isn't (%s), in node %s"
});
