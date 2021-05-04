/*
Copyright 2011-15 Newcastle University
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
/** @file The {@link Numbas.parts.JMEPart} object */
Numbas.queueScript('parts/jme',['base','jme','jme-variables','util','part','marking_scripts'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var Part = Numbas.parts.Part;
/** Judged Mathematical Expression.
 *
 * Student enters a string representing a mathematical expression, eg. `x^2+x+1`, and it is compared with the correct answer by evaluating over a range of values.
 *
 * @class
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var JMEPart = Numbas.parts.JMEPart = function(path, question, parentPart)
{
    var settings = this.settings;
    util.copyinto(JMEPart.prototype.settings,settings);
    settings.valueGenerators = {};
    settings.mustHave = [];
    settings.notAllowed = [];
}
JMEPart.prototype = /** @lends Numbas.JMEPart.prototype */
{
    loadFromXML: function(xml) {
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        //parse correct answer from XML
        answerNode = xml.selectSingleNode('answer/correctanswer');
        if(!answerNode) {
            this.error('part.jme.answer missing');
        }
        tryGetAttribute(settings,xml,'answer/correctanswer','simplification','answerSimplificationString');
        settings.correctAnswerString = Numbas.xml.getTextContent(answerNode).trim();
        //get checking type, accuracy, checking range
        var parametersPath = 'answer';
        tryGetAttribute(settings,xml,parametersPath+'/checking',['type','accuracy','failurerate'],['checkingType','checkingAccuracy','failureRate']);
        tryGetAttribute(settings,xml,parametersPath+'/checking/range',['start','end','points'],['vsetRangeStart','vsetRangeEnd','vsetRangePoints']);
        
        var valueGeneratorsNode = xml.selectSingleNode('answer/checking/valuegenerators');
        if(valueGeneratorsNode) {
            var valueGenerators = valueGeneratorsNode.selectNodes('generator');
            for(var i=0;i<valueGenerators.length;i++) {
                var generator = {};
                tryGetAttribute(generator,xml,valueGenerators[i],['name','value']);
                this.addValueGenerator(generator.name, generator.value);
            }
        }

        //max length and min length
        tryGetAttribute(settings,xml,parametersPath+'/maxlength',['length','partialcredit'],['maxLength','maxLengthPC']);
        var messageNode = xml.selectSingleNode('answer/maxlength/message');
        if(messageNode)
        {
            settings.maxLengthMessage = Numbas.xml.transform(Numbas.xml.templates.question,messageNode);
            if($(settings.maxLengthMessage).text() == '')
                settings.maxLengthMessage = R('part.jme.answer too long');
        }
        tryGetAttribute(settings,xml,parametersPath+'/minlength',['length','partialcredit'],['minLength','minLengthPC']);
        var messageNode = xml.selectSingleNode('answer/minlength/message');
        if(messageNode)
        {
            settings.minLengthMessage = Numbas.xml.transform(Numbas.xml.templates.question,messageNode);
            if($(settings.minLengthMessage).text() == '')
                settings.minLengthMessage = R('part.jme.answer too short');
        }
        //get list of 'must have' strings
        var mustHaveNode = xml.selectSingleNode('answer/musthave');
        if(mustHaveNode)
        {
            var mustHaves = mustHaveNode.selectNodes('string');
            for(var i=0; i<mustHaves.length; i++)
            {
                settings.mustHave.push(Numbas.xml.getTextContent(mustHaves[i]));
            }
            //partial credit for failing must-have test and whether to show strings which must be present to student when warning message displayed
            tryGetAttribute(settings,xml,mustHaveNode,['partialcredit','showstrings'],['mustHavePC','mustHaveShowStrings']);
            //warning message to display when a must-have is missing
            var messageNode = mustHaveNode.selectSingleNode('message');
            if(messageNode)
                settings.mustHaveMessage = Numbas.xml.transform(Numbas.xml.templates.question,messageNode);
        }
        //get list of 'not allowed' strings
        var notAllowedNode = xml.selectSingleNode('answer/notallowed');
        if(notAllowedNode)
        {
            var notAlloweds = notAllowedNode.selectNodes('string');
            for(var i=0; i<notAlloweds.length; i++)
            {
                settings.notAllowed.push(Numbas.xml.getTextContent(notAlloweds[i]));
            }
            //partial credit for failing not-allowed test
            tryGetAttribute(settings,xml,notAllowedNode,['partialcredit','showstrings'],['notAllowedPC','notAllowedShowStrings']);
            var messageNode = notAllowedNode.selectSingleNode('message');
            if(messageNode)
                settings.notAllowedMessage = Numbas.xml.transform(Numbas.xml.templates.question,messageNode);
        }
        //get pattern the student's answer must match
        var mustMatchNode = xml.selectSingleNode('answer/mustmatchpattern');
        if(mustMatchNode) {
            //partial credit for failing not-allowed test
            tryGetAttribute(settings,xml,mustMatchNode,['pattern','partialCredit','nameToCompare'],['mustMatchPattern','mustMatchPC','nameToCompare']);
            var messageNode = mustMatchNode.selectSingleNode('message');
            if(messageNode) {
                var mustMatchMessage = Numbas.xml.transform(Numbas.xml.templates.question,messageNode);
                if(util.isNonemptyHTML(mustMatchMessage)) {
                    settings.mustMatchMessage = mustMatchMessage;
                }
            }
        }

        tryGetAttribute(settings,xml,parametersPath,['checkVariableNames','singleLetterVariables','allowUnknownFunctions','implicitFunctionComposition','showPreview','caseSensitive']);
    },
    loadFromJSON: function(data) {
        var p = this;
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;
        tryLoad(data, ['answer', 'answerSimplification'], settings, ['correctAnswerString', 'answerSimplificationString']);
        tryLoad(data, ['checkingType', 'checkingAccuracy', 'failureRate'], settings, ['checkingType', 'checkingAccuracy', 'failureRate']);
        tryLoad(data, ['vsetRangePoints'], settings);
        var vsetRange = tryGet(data,'vsetRange');
        if(vsetRange) {
            settings.vsetRangeStart = util.parseNumber(vsetRange[0]);
            settings.vsetRangeEnd = util.parseNumber(vsetRange[1]);
        }
        tryLoad(data.maxlength, ['length', 'partialCredit', 'message'], settings, ['maxLength', 'maxLengthPC', 'maxLengthMessage']);
        tryLoad(data.minlength, ['length', 'partialCredit', 'message'], settings, ['minLength', 'minLengthPC', 'minLengthMessage']);
        tryLoad(data.musthave, ['strings', 'showStrings', 'partialCredit', 'message'], settings, ['mustHave', 'mustHaveShowStrings', 'mustHavePC', 'mustHaveMessage']);
        tryLoad(data.notallowed, ['strings', 'showStrings', 'partialCredit', 'message'], settings, ['notAllowed', 'notAllowedShowStrings', 'notAllowedPC', 'notAllowedMessage']);
        tryLoad(data.mustmatchpattern, ['pattern', 'partialCredit', 'message', 'nameToCompare'], settings, ['mustMatchPattern', 'mustMatchPC', 'mustMatchMessage', 'nameToCompare']);
        settings.mustMatchPC /= 100;
        tryLoad(data, ['checkVariableNames', 'singleLetterVariables', 'allowUnknownFunctions', 'implicitFunctionComposition', 'showPreview','caseSensitive'], settings);
        var valuegenerators = tryGet(data,'valuegenerators');
        if(valuegenerators) {
            valuegenerators.forEach(function(g) {
                p.addValueGenerator(g.name,g.value);
            });
        }
    },
    resume: function() {
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        this.stagedAnswer = pobj.studentAnswer;
    },
    finaliseLoad: function() {
        if(!this.settings.answerSimplificationString.trim()) {
            this.settings.answerSimplificationString = 'basic,unitFactor,unitPower,unitDenominator,zeroFactor,zeroTerm,zeroPower,collectNumbers,zeroBase,constantsFirst,sqrtProduct,sqrtDivision,sqrtSquare,otherNumbers';
        }
        this.stagedAnswer = '';
        this.getCorrectAnswer(this.getScope());
    },
    initDisplay: function() {
        this.display = new Numbas.display.JMEPartDisplay(this);
    },
    /** Student's last submitted answer.
     *
     * @type {string}
     */
    studentAnswer: '',
    /** The script to mark this part - assign credit, and give messages and feedback.
     *
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() { 
        return new Numbas.marking.MarkingScript(Numbas.raw_marking_scripts.jme,null,this.getScope()); 
    },
    /** Properties set when the part is generated.
     *
     * Extends {@link Numbas.parts.Part#settings}
     *
     * @property {JME} correctAnswerString - The definition of the correct answer, without variables substituted into it.
     * @property {string} correctAnswer - An expression representing the correct answer to the question. The student's answer should evaluate to the same value as this.
     * @property {string} answerSimplificationString - String from the XML defining which answer simplification rules to use
     * @property {Array.<string>} answerSimplification - Names of simplification rules (see {@link Numbas.jme.display.Rule}) to use on the correct answer
     * @property {string} checkingType - Method to compare answers. See {@link Numbas.jme.checkingFunctions}
     * @property {number} checkingAccuracy - Accuracy threshold for checking. Exact definition depends on the checking type.
     * @property {number} failureRate - Comparison failures allowed before we decide answers are different
     * @property {number} vsetRangeStart - Lower bound on range of points to pick values from for variables in the answer expression
     * @property {number} vsetRangeEnd - Upper bound on range of points to pick values from for variables in the answer expression
     * @property {number} vsetRangePoints - Number of points to compare answers on
     * @property {number} maxLength - Maximum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted.
     * @property {number} maxLengthPC - Partial credit if the student's answer is too long.
     * @property {string} maxLengthMessage - Message to add to marking feedback if the student's answer is too long.
     * @property {number} minLength - Minimum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted.
     * @property {number} minLengthPC - Partial credit if the student's answer is too short.
     * @property {string} minLengthMessage - Message to add to the marking feedback if the student's answer is too short.
     * @property {Array.<string>} mustHave - Strings which must be present in the student's answer.
     * @property {number} mustHavePC - Partial credit to award if any must-have string is missing.
     * @property {string} mustHaveMessage - Message to add to the marking feedback if the student's answer is missing a must-have string.
     * @property {boolean} mustHaveShowStrings - Tell the students which strings must be included in the marking feedback, if they're missing a must-have?
     * @property {Array.<string>} notAllowed - Strings which must not be present in the student's answer.
     * @property {number} notAllowedPC - Partial credit to award if any not-allowed string is present.
     * @property {string} notAllowedMessage - Message to add to the marking feedback if the student's answer contains a not-allowed string.
     * @property {boolean} notAllowedShowStrings - Tell the students which strings must not be included in the marking feedback, if they've used a not-allowed string?
     * @property {string} mustMatchPattern - A pattern that the student's answer must match.
     * @property {number} mustMatchPC - Partial credit to award if the student's answer does not match the pattern.
     * @property {string} mustMatchMessage - Message to add to the marking feedback if the student's answer does not match the pattern.
     * @property {string} nameToCompare - The name of a captured subexpression from the pattern match to compare with the corresponding captured part from the correct answer. If empty, the whole expressions are compared.
     * @property {boolean} checkVariableNames - Check that the student has used the same variable names as the correct answer?
     * @property {boolean} singleLetterVariables - Force single letter variable names in the answer? Multi-letter variable names will be considered as implicit multiplication.
     * @property {boolean} allowUnknownFunctions - Allow the use of unknown functions in the answer? If false, application of unknown functions will be considered as multiplication instead.
     * @property {boolean} implicitFunctionComposition - Consider juxtaposition of function names as composition?
     * @property {boolean} caseSensitive - Should the answer expression be parsed as case-sensitive?
     */
    settings:
    {
        correctAnswerString: '',
        correctAnswer: '',
        answerSimplificationString: '',
        answerSimplification: ['basic','unitFactor','unitPower','unitDenominator','zeroFactor','zeroTerm','zeroPower','collectNumbers','zeroBase','constantsFirst','sqrtProduct','sqrtDivision','sqrtSquare','otherNumbers'],
        checkingType: 'RelDiff',
        checkingAccuracy: 0,
        failureRate: 1,
        vsetRangeStart: 0,
        vsetRangeEnd: 1,
        vsetRangePoints: 1,
        maxLength: 0,
        maxLengthPC: 0,
        maxLengthMessage: 'Your answer is too long',
        minLength: 0,
        minLengthPC: 0,
        minLengthMessage: 'Your answer is too short',
        mustHave: [],
        mustHavePC: 0,
        mustHaveMessage: '',
        mustHaveShowStrings: false,
        notAllowed: [],
        notAllowedPC: 0,
        notAllowedMessage: '',
        notAllowedShowStrings: false,
        mustMatchPattern: '',
        mustMatchPC: 0,
        mustMatchMessage: R('part.jme.must-match.failed'),
        nameToCompare: '',
        checkVariableNames: false,
        singleLetterVariables: false,
        allowUnknownFunctions: true,
        implicitFunctionComposition: false,
        caseSensitive: false
    },
    /** The name of the input widget this part uses, if any.
     *
     * @returns {string}
     */
    input_widget: function() {
        return 'jme';
    },
    /** Options for this part's input widget.
     *
     * @returns {object}
     */
    input_options: function() {
        return {
            showPreview: this.settings.showPreview,
            returnString: true
        };
    },
    /** Compute the correct answer, based on the given scope.
     *
     * @param {Numbas.jme.Scope} scope
     * @returns {JME}
     */
    getCorrectAnswer: function(scope) {
        var settings = this.settings;
        var answerSimplification = Numbas.jme.collectRuleset(settings.answerSimplificationString,scope.allRulesets());
        var expr = jme.subvars(settings.correctAnswerString,scope);
        settings.correctVariables = jme.findvars(jme.compile(expr),[],scope);
        settings.correctAnswer = jme.display.simplifyExpression(
            expr,
            answerSimplification,
            scope
        );
        if(settings.correctAnswer == '' && this.marks>0) {
            this.error('part.jme.answer missing');
        }
        this.markingScope = new jme.Scope(this.getScope());
        this.markingScope.variables = {};
        return settings.correctAnswer;
    },
    /** Save a copy of the student's answer as entered on the page, for use in marking.
     */
    setStudentAnswer: function() {
        this.studentAnswer = this.stagedAnswer;
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm.
     *
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return new Numbas.jme.types.TString(this.studentAnswer);
    },

    /** Add a value generator expression to the list in this part's settings.
     *
     * @param {string} name
     * @param {JME} expr
     */
    addValueGenerator: function(name, expr) {
        try {
            var expression = new jme.types.TExpression(expr);
            if(expression.tree) {
                this.settings.valueGenerators[name] = expression;
            }
        } catch(e) {
            this.error('part.jme.invalid value generator expression',{name: name, expr: expr, message: e.message}, e);
        }
    }
};
['resume','finaliseLoad','loadFromXML','loadFromJSON'].forEach(function(method) {
    JMEPart.prototype[method] = util.extend(Part.prototype[method], JMEPart.prototype[method]);
});
Numbas.partConstructors['jme'] = util.extend(Part,JMEPart);
});
