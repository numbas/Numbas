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
	'exam.load.badroot': "Root element of exam XML should be 'exam'",
	'exam.changeQuestion.noquestions': "This exam contains no questions! Check the .exam file for errors.",

	'jme.display.unknown token type': "Can't texify token type %s",
	'jme.display.collectRuleset.no sets': 'No sets given to collectRuleset!',
	'jme.display.collectRuleset.set not defined': "Ruleset %s has not been defined",

	'jme.variables.variable not defined': "Variable %s not defined.",

	'jme.shunt.not enough arguments': "Not enough arguments for operation %s",
	'jme.shunt.no left bracket in function': "No matching left bracket in function application or tuple",
	'jme.shunt.no left square bracket': "No matching left bracket",
	'jme.shunt.no left bracket': "No matching left bracket",
	'jme.shunt.no right bracket': "No matching right bracket",
	'jme.shunt.no right square bracket': "No matching right square bracket to end list",
	'jme.shunt.missing operator': "Expression can't be evaluated -- missing an operator.",

	'jme.substituteTree.undefined variable': "Variable %s is undefined",

	'jme.evaluate.undefined variable': "Variable %s is undefined",

	'jme.compile.tokenise failed': "Invalid expression: %s",
	'jme.compile.type error': "Type error in expression %s",

	'jme.typecheck.function not defined': "Operation '%s' is not defined. Did you mean \n\n'%s*(...)' ?",
	'jme.typecheck.op not defined': "Operation '%s' is not defined.",
	'jme.typecheck.no right type definition': "No definition of '%s' of correct type found.",

	'jme.texsubvars.no right bracket': "No matching ] in %s arguments.",
	'jme.texsubvars.missing parameter': "Missing parameter in %s: %s",
	'jme.texsubvars.no right brace': "No matching } in %s",

	'jme.func.switch.no default case': "No default case for Switch statement",
	'jme.func.listval.invalid index': "Invalid list index %s on list of size %s",

	'math.precround.complex': "Can't round to a complex number of decimal places",
	'math.siground.complex': "Can't round to a complex number of sig figs",
	'math.combinations.complex': "Can't compute combinations of complex numbers",
	'math.permutations.complex': "Can't compute permutations of complex numbers",
	'math.gcf.complex': "Can't compute GCF of complex numbers",
	'math.lcm.complex': "Can't compute LCM of complex numbers",

	'vectormath.cross.not 3d': "Can only take the cross product of 3-dimensional vectors.",
	
	'matrixmath.abs.non-square': "Can't compute the determinant of a matrix which isn't square.",
	'matrixmath.abs.too big': "Sorry, can't compute the determinant of a matrix bigger than 3x3 yet.",
	'matrixmath.mul.different sizes': "Can't multiply matrices of different sizes.",
	
	'question.substituting': "Error substituting content: \n%s\n\n%s",
	'question.no such part': "Can't find part %s",
	
	'part.missing type attribute': "Missing part type attribute",
	'part.unknown type': "Unrecognised part type %s",
	'part.jme.answer missing': "Correct answer for a JME part is missing (%s)",
	'part.patternmatch.display answer missing': "Display answer is missing from a Pattern Match part (%s)",
	'part.mcq.choices missing': "Definition of choices is missing from a Multiple Response part (%s)",
	'part.mcq.matrix not a number': "Part %s marking matrix cell %s,%s does not evaluate to a number",
	
	'timing.no accumulator': "no timing accumulator %s",
	
	'xml.could not load': "Couldn't load an XML document: %s",
	'xml.property not number': "Property %s should be a number, but isn't (%s), in node %s",
	'xml.property not boolean': "Property %s should be a boolean, but isn't (%s), in node %s"
});
