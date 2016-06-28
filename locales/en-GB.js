Numbas.queueScript('en-GB',['R'],function() {
/*
Copyright 2011-14 Newcastle University

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
	'page.loading': "Loading...",
	'page.saving': "<p>Saving.</p>\n<p>This might take a few seconds.</p>",

	'mathjax.math processing error': "MathJax processing error: \"%s\" when texifying <code>%s</code>",

	'die.numbas failed': "Numbas has failed",
	'die.sorry': "Sorry, Numbas has encountered an error which means it can't continue. Below is a description of the error.",
	'die.error': "Error",

	'modal.ok': "OK",
	'modal.cancel': "Cancel",

	'exam.exam name': "Exam Name:",
	'exam.random seed': "Session ID:",
	'exam.student name': "Student's Name:",
	'exam.number of questions': "Number of Questions:",
	'exam.marks available': "Marks Available:",
	'exam.pass percentage': "Pass Percentage:",
	'exam.time allowed': "Time Allowed:",
	'exam.passed': 'Passed',
	'exam.failed': 'Failed',
	'exam.review header': "Review: ",
	'frontpage.start': "Start",

	'suspend.paused header': "Paused",
	'suspend.exam suspended': "The Exam has been suspended. Press <em>Resume</em> to continue.",
	'suspend.you can resume': "You will be able to resume this session the next time you start this activity.",
	'suspend.resume': "Resume",

	'result.exit': "Exit Exam",
	'result.print': "Print this results summary",
	'result.review': "Review",
	'result.exam summary': "Exam Summary",
	'result.performance summary': "Performance Summary",
	'result.exam start': "Exam Start:",
	'result.exam stop': "Exam Stop:",
	'result.time spent': "Time Spent:",
	'result.questions attempted': "Questions Attempted:",
	'result.score': "Score:",
	'result.result': "Result:",
	'result.detailed question breakdown': "Detailed Question Breakdown and Feedback",
	'result.question number': "Question Number",
	'result.question score': "Score",
	'result.question review title': "Review this question",
	'result.click a question to review': "Click on a question number to see how your answers were marked and, where available, full solutions.",

	'end.exam has finished': "The exam has finished. You may now close this window.",

	'control.confirm leave': "You haven't finished the exam.",
	'control.not all questions answered': "You have not completed every question in this exam.",
	'control.not all questions submitted': "You have made changes to one or more answers but not submitted them. Please check each question has been submitted.",
	'control.confirm end': "Are you sure you want to end the exam? After you end the exam, you will not be able to change any of your answers.",
	'control.confirm regen': "Would you like to re-randomise this question? If you click OK, all your answers and marks for the current question will be lost.",
	'control.confirm reveal': "Would you like to reveal the answer to this question? Any marks you have received so far will be locked and you will not be able to answer this question later.",
	'control.proceed anyway': "Proceed anyway?",
	'control.regen': "Try another question like this one",
	'control.submit answer': "Submit answer",
	'control.submit all parts': "Submit all parts",
	'control.submit again': "Submit again",
	'control.submit': "Submit",
	'control.previous': "Previous",
	'control.next': "Next",
	'control.advice': "Advice",
	'control.reveal': "Reveal answers",
	'control.total': "Total",
	'control.pause': "Pause",
	'control.end exam': "End Exam",
	'control.back to results': "Go back to results",

	'display.part.jme.error making maths': "Error making maths display",
	
	'exam.xml.bad root': "Root element of exam XML should be 'exam'",
	'exam.changeQuestion.no questions': "This exam contains no questions! Check the .exam file for errors.",

	'feedback.marks': "<strong>%s</strong> %s",
	'feedback.you were awarded': "You were awarded %s.",
	'feedback.taken away': "%s %s taken away.",

	'jme.tokenise.invalid': "Invalid expression: <code>%s</code>",

	'jme.shunt.not enough arguments': "Not enough arguments for operation %s",
	'jme.shunt.no left bracket in function': "No matching left bracket in function application or tuple",
	'jme.shunt.no left square bracket': "No matching left bracket",
	'jme.shunt.no left bracket': "No matching left bracket",
	'jme.shunt.no right bracket': "No matching right bracket",
	'jme.shunt.no right square bracket': "No matching right square bracket to end list",
	'jme.shunt.missing operator': "Expression can't be evaluated -- missing an operator.",

	'jme.typecheck.function maybe implicit multiplication': "Operation %s is not defined. Did you mean <br/><code>%s*%s(...)</code>?",
	'jme.typecheck.function not defined': "Operation '%s' is not defined. Did you mean <br/><code>%s*(...)</code>?",
	'jme.typecheck.op not defined': "Operation '%s' is not defined.",
	'jme.typecheck.no right type definition': "No definition of '%s' of correct type found.",
	'jme.typecheck.no right type unbound name': "Variable <code>%s</code> is not defined.",
	'jme.typecheck.map not on enumerable': "<code>map</code> operation must work over a list or a range, not %s",

	'jme.evaluate.undefined variable': "Variable %s is undefined",

	'jme.func.switch.no default case': "No default case for Switch statement",
	'jme.func.listval.invalid index': "Invalid list index %i on list of size %i",
	'jme.func.listval.not a list': "Object is not subscriptable",
	'jme.func.matrix.invalid row type': "Can't construct a matrix from rows of type %s",
	'jme.func.except.continuous range': "Can't use the 'except' operator on continuous ranges.",

	'jme.matrix.reports bad size': "Matrix reports its size incorrectly - must be an error in constructor function",

	'jme.texsubvars.no right bracket': "No matching <code>]</code> in %s arguments.",
	'jme.texsubvars.missing parameter': "Missing parameter in %s: %s",
	'jme.texsubvars.no right brace': "No matching <code>}</code> in %s",

	'jme.user javascript.error': "Error in user-defined javascript function <code>%s</code><br/>%s",
	'jme.user javascript.error': "Error in user-defined javascript function <code>%s</code>: %s",

	'jme.variables.error making function': "Error making function <code>%s</code>: %s",
	'jme.variables.syntax error in function definition': "Syntax error in function definition",
	'jme.variables.variable not defined': "Variable <code>%s</code> is not defined.",
	'jme.variables.empty definition': "Definition of variable %s is empty.",
	'jme.variables.circular reference': "Circular variable reference in definition of %s",
	'jme.variables.error computing dependency': "Error computing referenced variable <code>%s</code>",
	'jme.variables.error evaluating variable': "Error evaluating variable %s: %s",
	'jme.variables.question took too many runs to generate variables': "A valid set of question variables was not generated in time.",

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

	'part.with steps answer prompt': 'Answer: ',
	
	'part.script.error': "Error in part %s custom script %s: %s",

	'part.marking.steps no matter': "Because you received full marks for the part, your answers to the steps aren't counted.",
	'part.marking.steps change single': "You were awarded <strong>%s</strong> mark for your answers to the steps",
	'part.marking.steps change plural': "You were awarded <strong>%s</strong> marks for your answers to the steps",
	'part.marking.revealed steps with penalty single': "You revealed the steps. The maximum you can score for this part is <strong>%s</strong> mark. Your scores will be scaled down accordingly.",
	'part.marking.revealed steps with penalty plural': "You revealed the steps. The maximum you can score for this part is <strong>%s</strong> marks. Your scores will be scaled down accordingly.",
	'part.marking.revealed steps no penalty': "You revealed the steps.",
	'part.marking.used variable replacements': "This part was marked using your answers to previous parts.",
	'part.marking.variable replacement part not answered': "You must answer %s first",
	'part.marking.resubmit because of variable replacement': "This part's marking depends on your answers to other parts, which you have changed. Submit this part again to update your score.",
	'part.marking.not submitted': "No answer submitted",
	'part.marking.did not answer': "You did not answer this question.",
	'part.marking.total score single': "You scored <strong>%s</strong> mark for this part.",
	'part.marking.total score plural': "You scored <strong>%s</strong> marks for this part.",
	'part.marking.nothing entered': "You did not enter an answer.",
	'part.marking.incorrect': "Your answer is incorrect.",
	'part.marking.correct': "Your answer is correct.",
	'part.correct answer': "Expected answer:",

	'part.missing type attribute': "%s: Missing part type attribute",
	'part.unknown type': "%s: Unrecognised part type %s",

	'part.setting not present': "Property '%s' not set",

	'part.jme.answer missing': "Correct answer is missing",
	'part.jme.answer too long': "Your answer is too long.",
	'part.jme.answer too short': "Your answer is too short.",
	'part.jme.answer invalid': "Your answer is not a valid mathematical expression.<br/>%s.",
	'part.jme.marking.correct': "Your answer is numerically correct.",
	'part.jme.must-have bits': '<span class="monospace">%s</span>',
	'part.jme.must-have one': "Your answer must contain: %s",
	'part.jme.must-have several': "Your answer must contain all of: %s",
	'part.jme.not-allowed bits': '<span class="monospace">%s</span>',
	'part.jme.not-allowed one': "Your answer must not contain: %s",
	'part.jme.not-allowed several': "Your answer must not contain any of: %s",
	'part.jme.unexpected variable name': "Your answer was interpreted to use the unexpected variable name <code>%s</code>.",
	'part.jme.unexpected variable name suggestion': "Your answer was interpreted to use the unexpected variable name <code>%s</code>. Did you mean <code>%s</code>?",

	'part.patternmatch.display answer missing': "Display answer is missing",
	'part.patternmatch.correct except case': "Your answer is correct, except for the case.",

	'part.numberentry.correct except decimal': "Your answer is within the allowed range, but decimal numbers are not allowed.",
	'part.numberentry.correct except fraction': "Your answer is within the allowed range, but fractions are not allowed.",
	'part.numberentry.answer invalid': "You did not enter a valid number.",
	'part.numberentry.answer not integer': "Your answer is invalid. You must enter a whole number, not a decimal.",
	'part.numberentry.answer not integer or decimal': "Your answer is invalid. You must enter an integer or a decimal.",

    'part.mcq.options def not a list': "The expression defining the %ss is not a list.",
    'part.mcq.marking matrix string empty': "The custom marking matrix expression is empty.",
	'part.mcq.choices missing': "Definition of choices is missing",
	'part.mcq.matrix not a number': "Part %s marking matrix cell %s,%s does not evaluate to a number",
	'part.mcq.wrong number of choices': "You selected the wrong number of choices.",
	'part.mcq.no choices selected': "No choices selected.",
	'part.mcq.matrix not a list': "Marking matrix, defined by JME expression, is not a list but it should be.",
	'part.mcq.matrix wrong type': "Element of invalid type '%s' used in marking matrix.",
	'part.mcq.matrix mix of numbers and lists': "Mix of numbers and lists used in marking matrix.",
	'part.mcq.matrix wrong size': "Marking matrix is the wrong size.",
	'part.mcq.correct choice': "You chose the correct answer.",

	'part.matrix.answer invalid': "Your answer is not valid.",
	'part.matrix.invalid cell': "One or more of the cells in your answer is empty or invalid.",
	'part.matrix.some incorrect': "One or more of the cells in your answer is incorrect, but you have been awarded marks for the rest.",
	'part.matrix.empty': "You have not entered an answer.",
	'part.matrix.empty cell': "One or more of the cells in your answer is empty.",
	'part.matrix.size mismatch': "The question author hasn't allowed the student to decide the dimensions of their answer, but the correct answer is %s while the answer input is %s",

	'part.gapfill.feedback header': '<strong>Gap %i</strong>',
	
	'question.loaded name mismatch': "Can't resume this attempt - the package has changed since the last session.",
	'question.error': "Question %i: %s",
	'question.preamble.error': "Error in preamble: %s",
	'question.preamble.syntax error': "Syntax error in preamble",
	'question.unsupported part type': "Unsupported part type",
	'question.header': "Question %i",
	'question.substituting': "Error substituting content: <br/>%s<br/>%s",
	'question.submit part': "Submit part",
	'question.show steps': "Show steps",
	'question.show steps penalty': "You will lose <strong>%s</strong> %s.",
	'question.show steps no penalty': "Your score will not be affected.",
	'question.show steps already penalised': "You have already shown steps. You can show them again with no further penalty.",
	'question.hide steps': "Hide steps",
	'question.hide steps no penalty': "Your score will not be affected.",
	'question.advice': "Advice",
	'question.no such part': "Can't find part %s",
	'question.can not submit': "Can not submit answer - check for errors.",
	'question.answer submitted': "Answer submitted",
	'question.unsubmitted changes.several parts': "You have made changes to your answers but not submitted them. Please check your answers to each part and then press the <strong>Submit all parts</strong> button.",
	'question.unsubmitted changes.one part': "You have made a change to your answer but not submitted it. Please check your answer and then press the <strong>Submit answer</strong> button.",

	'question.score feedback.show': 'Show feedback',
	'question.score feedback.hide': 'Hide feedback',
	'question.score feedback.answered total actual': "Score: %(score)/%(marks)",
	'question.score feedback.answered total': "%(marksString). Answered.",
	'question.score feedback.answered actual': "Score: %(scoreString)",
	'question.score feedback.answered': "Answered.",
	'question.score feedback.unanswered': "Unanswered.",
	'question.score feedback.unanswered total': "%(marksString).",
	'question.score feedback.correct': 'Your answer is correct',
	'question.score feedback.partial': 'Your answer is partially correct',
	'question.score feedback.wrong': 'Your answer is incorrect',

	'question.selector.unsubmitted changes': "Unsubmitted changes.",
	
	'timing.no accumulator': "no timing accumulator %s",
	'timing.time remaining': "Time remaining:",
	
	'xml.could not load': "Couldn't load an XML document: %s",
	'xml.property not number': "Property %s should be a number, but isn't (%s), in node %s",
	'xml.property not boolean': "Property %s should be a boolean, but isn't (%s), in node %s",
	'xml.error in variable definition': "Error in definition of variable <code>%s</code>",

	'scorm.error initialising': "Error initialising SCORM protocol: %s",
	'scorm.failed save': "<p>The request to save data to the server failed. Press <b>OK</b> to try again.</p>\n<p>If you get this message repeatedly, check your internet connection or use a different computer. Your previously submitted answers have been successfully saved and will be restored if you resume this session on a different computer.</p>\n<p>If this message appears persistently and you can't save <em>any</em> answers, please contact your lecturer or teacher.</p>",
	'scorm.no exam suspend data': "Failed to resume: no exam suspend data.",
	'scorm.error loading suspend data': "Error loading suspend data: %s",
	'scorm.error loading question': "Error loading question %s: %s",
	'scorm.no question suspend data': "No question suspend data",
	'scorm.error loading part': "Error loading part %s: %s",
	'scorm.no part suspend data': "No part suspend data",

    'util.product.non list': "Passed a non-list to <code>Numbas.util.product</code>",

	'mark': 'mark',
	'marks': 'marks',
	'was': 'was',
	'were': 'were',

	'part': 'part',
	'gap': 'gap',
	'step': 'step'
});
});
