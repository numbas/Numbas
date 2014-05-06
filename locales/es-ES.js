Numbas.queueScript('es-ES',['R'],function() {
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
	'page.loading': "Cargando...",
	'page.saving': "<p>Guardando.</p>\n<p>Esto podría tardar unos segundos.</p>",

	'exam.exam name': "Nombre del Examen:",
	'exam.random seed': "ID de la Sesión:",
	'exam.number of questions': "Número de Preguntas:",
	'exam.marks available': "Puntaje Máximo:",
	'exam.pass percentage': "Porcentaje de aprobación:",
	'exam.time allowed': "Tiempo permitido:",
	'exam.passed': 'Aprobado... Muy Bien!!!',
	'exam.failed': 'Reprobado... Intente otra vez',
	'exam.review header': "Revisión: ",
	'frontpage.start': "Comenzar Examen",

	'suspend.exam suspended': "El Examen ha sido suspendido. Presione Reanudar para continuar.",
	'suspend.you can resume': "Usted podrá reanudar esta sesión la próxima vez que inicie esta actividad.",
	'suspend.resume': "Reanudar",

	'result.exit': "Salir",
	'result.print': "Imprimir informe de resultados",
	'result.review': "Revisión",
	'result.exam summary': "Informe del examen",
	'result.performance summary': "Informe de Rendimiento",
	'result.exam start': "Inicio del Examen:",
	'result.exam stop': "Termino del Examen:",
	'result.time spent': "Tiempo ocupado en resolver el examen:",
	'result.questions attempted': "Preguntas Respondidas:",
	'result.score': "Puntaje:",
	'result.result': "Resultado:",
	'result.detailed question breakdown': "Detalle de sus respuestas y retroalimentación",
	'result.question number': "Número de la Pregunta",
	'result.question score': "Puntaje",
	'result.question review title': "Revisar esta Pregunta",
	'result.click a question to review': "Haga click sobre el número de la pregunta para revisar sus respuestas, y si está disponible, la solución al problema.",

	'end.exam has finished': "El examen a finalizado. Ahora puede cerrar esta ventana.",

	'control.confirm leave': "Usted no a terminado de responder su examen.",
	'control.not all questions answered': "Usted no a constestado todas las preguntas de su examen.",
	'control.not all questions submitted': "Ha realizado cambios en una o más respuestas, pero no las ha enviado. Por favor, compruebe cada pregunta se ha respondido.",
	'control.confirm end': "¿Está seguro de terminar su examen? Después que usted finalice el examen, ya no será posible cambiar sus respuestas.",
	'control.confirm regen': "¿Quiere nuevos valores para la pregunta? Si usted hace click en OK, todas sus respuestas y puntaje para esta pregunta se perderán.",
	'control.confirm reveal': "¿Quiere mostrar las respuestas a esta pregunta? Perderá el puntaje recibido hasta ahora.",
	'control.proceed anyway': "¿Desea continuar?",
	'control.regen': "Intentar una nueva versión de esta pregunta",
	'control.submit answer': "Enviar Respuesta",
	'control.submit all parts': "Enviar todas las partes de la pregunta",
	'control.submit again': "Enviar nuevamente",
	'control.submit': "Enviar",
	'control.previous': "Anterior",
	'control.next': "Siguiente",
	'control.advice': "Advice",
	'control.reveal': "Mostrar las respuestas correctas",
	'control.total': "Total",
	'control.pause': "Pausa",
	'control.end exam': "Finalizar Examen",
	'control.back to results': "Volver a Resultados",

	'display.part.jme.error making maths': "Error making maths display",
	
	'exam.xml.bad root': "Root element of exam XML should be 'exam'",
	'exam.changeQuestion.no questions': "Este examen no tiene preguntas! Revisar el archivo con extensión .exam .",

	'feedback.marks': "<strong>%s</strong> %s",
	'feedback.you were awarded': "Usted ha sido favorecido %s.",
	'feedback.taken away': "%s %s ha sido quitado.",

	'jme.tokenise.invalid': "Expresión inválida: %s",

	'jme.shunt.not enough arguments': "No hay suficientes argumentos para la operación %s",
	'jme.shunt.no left bracket in function': "No matching left bracket in function application or tuple",
	'jme.shunt.no left square bracket': "No matching left bracket",
	'jme.shunt.no left bracket': "No matching left bracket",
	'jme.shunt.no right bracket': "No matching right bracket",
	'jme.shunt.no right square bracket': "No matching right square bracket to end list",
	'jme.shunt.missing operator': "La expresión nopuede ser evaluada -- falta un operador.",

	'jme.typecheck.function maybe implicit multiplication': "La operación %s no está definida. ¿Tal vez quiso decir <br/><code>%s*%s(...)</code>?",
	'jme.typecheck.function not defined': "La operación '%s' no está definida. Did you mean <br/><code>%s*(...)</code>?",
	'jme.typecheck.op not defined': "La operación '%s' no está definida.",
	'jme.typecheck.no right type definition': "No definition of '%s' of correct type found.",
	'jme.typecheck.map not on enumerable': "<code>map</code> operation must work over a list or a range, not %s",

	'jme.evaluate.undefined variable': "La variable %s no está definida",

	'jme.func.switch.no default case': "No default case for Switch statement",
	'jme.func.listval.invalid index': "Invalid list index %i on list of size %i",
	'jme.func.listval.not a list': "Object is not subscriptable",
	'jme.func.matrix.invalid row type': "Can't construct a matrix from rows of type %s",
	'jme.func.except.continuous range': "Can't use the 'except' operator on continuous ranges.",

	'jme.texsubvars.no right bracket': "No matching <code>]</code> in %s arguments.",
	'jme.texsubvars.missing parameter': "Falta un parámetro en %s: %s",
	'jme.texsubvars.no right brace': "No corresponde <code>}</code> en %s",

	'jme.user javascript.error': "Error in user-defined javascript function <code>%s</code><br/>%s",
	'jme.user javascript.error': "User-defined javascript function <code>%s</code> didn't return anything",

	'jme.variables.variable not defined': "La variable %s no está definida.",
	'jme.variables.empty definition': "Definition of variable %s is empty.",
	'jme.variables.circular reference': "Circular variable reference in question %s %s",
	'jme.variables.error computing dependency': "Error computing referenced variable <code>%s</code>",

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

	'part.marking.steps no matter': "Because you received full marks for the part, your answers to the steps aren't counted.",
	'part.marking.steps change single': "You were awarded <strong>%s</strong> mark for your answers to the steps",
	'part.marking.steps change plural': "You were awarded <strong>%s</strong> marks for your answers to the steps",
	'part.marking.revealed steps with penalty single': "You revealed the steps. The maximum you can score for this part is <strong>%s</strong> mark. Your scores will be scaled down accordingly.",
	'part.marking.revealed steps with penalty plural': "You revealed the steps. The maximum you can score for this part is <strong>%s</strong> marks. Your scores will be scaled down accordingly.",
	'part.marking.revealed steps no penalty': "You revealed the steps.",
	'part.marking.not submitted': "No ha enviado respuesta",
	'part.marking.did not answer': "Usted no ha respondido esta pregunta.",
	'part.marking.total score single': "You scored <strong>%s</strong> mark for this part.",
	'part.marking.total score plural': "You scored <strong>%s</strong> marks for this part.",
	'part.marking.nothing entered': "You did not enter an answer.",
	'part.marking.incorrect': "Su respuesta es incorrecta.",
	'part.marking.correct': "Su respuesta es correcta.",
	'part.correct answer': "Respuesta correcta:",

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
	'part.jme.unexpected variable name': "Your answer was interpreted to use the unexpected variable name <code>%s</code>.",
	'part.jme.unexpected variable name suggestion': "Your answer was interpreted to use the unexpected variable name <code>%s</code>. Did you mean <code>%s</code>?",

	'part.patternmatch.display answer missing': "Display answer is missing from a Pattern Match part (%s)",
	'part.patternmatch.correct except case': "Your answer is correct, except for the case.",

	'part.numberentry.correct except decimal': "Your answer is within the allowed range, but decimal numbers are not allowed.",
	'part.numberentry.answer invalid': "You did not enter a valid number.",

	'part.mcq.choices missing': "Definition of choices is missing from a Multiple Response part (%s)",
	'part.mcq.matrix not a number': "Part %s marking matrix cell %s,%s does not evaluate to a number",
	'part.mcq.wrong number of choices': "You selected the wrong number of choices.",
	'part.mcq.no choices selected': "No choices selected.",
	'part.mcq.matrix not a list': "Marking matrix for a Multiple Response part, defined by JME expression, is not a list but it should be.",
	'part.mcq.matrix wrong type': "Element of invalid type '%s' used in marking matrix.",
	'part.mcq.matrix mix of numbers and lists': "Mix of numbers and lists used in marking matrix.",
	'part.mcq.matrix wrong size': "Marking matrix is the wrong size.",
	'part.mcq.correct choice': "Usted eligió la respuesta correcta.",

	'part.gapfill.feedback header': '<strong>Gap %i</strong>',
	
	'question.unsupported part type': "Unsupported part type",
	'question.header': "Pregunta %i",
	'question.substituting': "Error substituting content: <br/>%s<br/>%s",
	'question.submit part': "Enviar esta parte",
	'question.show steps': "Mostrar Pasos",
	'question.show steps penalty': "Usted perderá <strong>%s</strong> %s.",
	'question.show steps no penalty': "Su puntaje no se verá afectado.",
	'question.show steps already penalised': "Ya se han mostrado los pasos, no tendrá penalización adicional.",
	'question.hide steps': "Ocultar Pasos",
	'question.hide steps no penalty': "Su puntaje no se verá afectado.",
	'question.advice': "Solución",
	'question.no such part': "Can't find part %s",
	'question.can not submit': "No se puede ingresar su respuesta - por favor revise errores.",
	'question.answer submitted': "Respuesta enviada",
	'question.unsubmitted changes.several parts': "You have made changes to your answers but not submitted them. Please check your answers to each part and then press the <strong>Submit all parts</strong> button.",
	'question.unsubmitted changes.one part': "You have made a change to your answer but not submitted it. Please check your answer and then press the <strong>Submit answer</strong> button.",

	'question.score feedback.show': 'Mostrar Retroalimentación',
	'question.score feedback.hide': 'Ocultar Retroalimentación',
	'question.score feedback.answered total actual': "Puntaje: %(score)/%(marks)",
	'question.score feedback.answered total': "%(marksString). Respondida.",
	'question.score feedback.answered actual': "Puntaje: %(scoreString)",
	'question.score feedback.answered': "Respondida.",
	'question.score feedback.unanswered': "No Respondida.",
	'question.score feedback.unanswered total': "%(marksString).",
	'question.score feedback.correct': 'Su respuesta es correcta',
	'question.score feedback.partial': 'Su respuesta es parcialmente correcta',
	'question.score feedback.wrong': 'Su respuesta es incorrecta',

	'question.selector.unsubmitted changes': "Aún no ha enviado su respuesta.",
	
	'timing.no accumulator': "no timing accumulator %s",
	'timing.time remaining': "Tiempo restante: %s",
	
	'xml.could not load': "Couldn't load an XML document: %s",
	'xml.property not number': "Property %s should be a number, but isn't (%s), in node %s",
	'xml.property not boolean': "Property %s should be a boolean, but isn't (%s), in node %s",

	'scorm.failed save': "<p>The request to save data to the server failed. Press <b>OK</b> to try again.</p>\n<p>If you get this message repeatedly, check your internet connection or use a different computer. Your previously submitted answers have been successfully saved and will be restored if you resume this session on a different computer.</p>\n<p>If this message appears persistently and you can't save <em>any</em> answers, please email <a href=\"mailto:numbas@ncl.ac.uk\">numbas@ncl.ac.uk</a>.</p>",

	'mark': 'Punto',
	'marks': 'Puntos',
	'was': 'fue',
	'were': 'fueron'
});
});
