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
var nicePartName = util.nicePartName;
var Part = Numbas.parts.Part;
/** Judged Mathematical Expression
 *
 * Student enters a string representing a mathematical expression, eg. `x^2+x+1`, and it is compared with the correct answer by evaluating over a range of values.
 * @constructor
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
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
            settings.maxLengthMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
            if($(settings.maxLengthMessage).text() == '')
                settings.maxLengthMessage = R('part.jme.answer too long');
        }
        tryGetAttribute(settings,xml,parametersPath+'/minlength',['length','partialcredit'],['minLength','minLengthPC']);
        var messageNode = xml.selectSingleNode('answer/minlength/message');
        if(messageNode)
        {
            settings.minLengthMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
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
                settings.mustHaveMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
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
                settings.notAllowedMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
        }
        //get pattern the student's answer must match
        var mustMatchNode = xml.selectSingleNode('answer/mustmatchpattern');
        if(mustMatchNode) {
            //partial credit for failing not-allowed test
            tryGetAttribute(settings,xml,mustMatchNode,['pattern','partialCredit','nameToCompare'],['mustMatchPattern','mustMatchPC','nameToCompare']);
            var messageNode = mustMatchNode.selectSingleNode('message');
            if(messageNode) {
                settings.mustMatchMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
            }
        }

        tryGetAttribute(settings,xml,parametersPath,['checkVariableNames','showPreview']);
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
            settings.vsetRangeStart = vsetRange[0];
            settings.vsetRangeEnd = vsetRange[1];
        }
        tryLoad(data.maxlength, ['length', 'partialCredit', 'message'], settings, ['maxLength', 'maxLengthPC', 'maxLengthMessage']);
        tryLoad(data.minlength, ['length', 'partialCredit', 'message'], settings, ['minLength', 'minLengthPC', 'minLengthMessage']);
        tryLoad(data.musthave, ['strings', 'showStrings', 'partialCredit', 'message'], settings, ['mustHave', 'mustHaveShowStrings', 'mustHavePC', 'mustHaveMessage']);
        tryLoad(data.notallowed, ['strings', 'showStrings', 'partialCredit', 'message'], settings, ['notAllowed', 'notAllowedShowStrings', 'notAllowedPC', 'notAllowedMessage']);
        tryLoad(data.mustmatchpattern, ['pattern', 'partialCredit', 'message', 'nameToCompare'], settings, ['mustMatchPattern', 'mustMatchPC', 'mustMatchMessage', 'nameToCompare']);
        tryLoad(data, ['checkVariableNames', 'expectedVariableNames', 'showPreview'], settings);
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
        this.stagedAnswer = '';
        this.getCorrectAnswer(this.getScope());
        if(Numbas.display) {
            this.display = new Numbas.display.JMEPartDisplay(this);
        }
    },
    /** Student's last submitted answer
     * @type {String}
     */
    studentAnswer: '',
    /** The script to mark this part - assign credit, and give messages and feedback.
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() { return Numbas.marking_scripts.jme; },
    /** Properties set when the part is generated.
     *
     * Extends {@link Numbas.parts.Part#settings}
     * @property {JME} correctAnswerString - the definition of the correct answer, without variables substituted into it.
     * @property {String} correctAnswer - An expression representing the correct answer to the question. The student's answer should evaluate to the same value as this.
     * @property {String} answerSimplificationString - string from the XML defining which answer simplification rules to use
     * @property {Array.<String>} answerSimplification - names of simplification rules (see {@link Numbas.jme.display.Rule}) to use on the correct answer
     * @property {String} checkingType - method to compare answers. See {@link Numbas.jme.checkingFunctions}
     * @property {Number} checkingAccuracy - accuracy threshold for checking. Exact definition depends on the checking type.
     * @property {Number} failureRate - comparison failures allowed before we decide answers are different
     * @property {Number} vsetRangeStart - lower bound on range of points to pick values from for variables in the answer expression
     * @property {Number} vsetRangeEnd - upper bound on range of points to pick values from for variables in the answer expression
     * @property {Number} vsetRangePoints - number of points to compare answers on
     * @property {Number} maxLength - maximum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted
     * @property {Number} maxLengthPC - partial credit if the student's answer is too long
     * @property {String} maxLengthMessage - Message to add to marking feedback if the student's answer is too long
     * @property {Number} minLength - minimum length, in characters, of the student's answer. Note that the student's answer is cleaned up before checking length, so extra space or brackets aren't counted
     * @property {Number} minLengthPC - partial credit if the student's answer is too short
     * @property {String} minLengthMessage - message to add to the marking feedback if the student's answer is too short
     * @property {Array.<String>} mustHave - strings which must be present in the student's answer
     * @property {Number} mustHavePC - partial credit to award if any must-have string is missing
     * @property {String} mustHaveMessage - message to add to the marking feedback if the student's answer is missing a must-have string.
     * @property {Boolean} mustHaveShowStrings - tell the students which strings must be included in the marking feedback, if they're missing a must-have?
     * @property {Array.<String>} notAllowed - strings which must not be present in the student's answer
     * @property {Number} notAllowedPC - partial credit to award if any not-allowed string is present
     * @property {String} notAllowedMessage - message to add to the marking feedback if the student's answer contains a not-allowed string.
     * @property {Boolean} notAllowedShowStrings - tell the students which strings must not be included in the marking feedback, if they've used a not-allowed string?
     * @property {String} mustMatchPattern - A pattern that the student's answer must match
     * @property {Number} mustMatchPC - partial credit to award if the student's answer does not match the pattern
     * @property {String} mustMatchMessage - message to add to the marking feedback if the student's answer does not match the pattern
     * @property {String} nameToCompare - the name of a captured subexpression from the pattern match to compare with the corresponding captured part from the correct answer. If empty, the whole expressions are compared.
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
        mustMatchMessage: '',
        nameToCompare: ''
    },
    /** The name of the input widget this part uses, if any.
     * @returns {String}
     */
    input_widget: function() {
        return 'jme';
    },
    /** Options for this part's input widget
     * @returns {Object}
     */
    input_options: function() {
        return {
            showPreview: this.settings.showPreview,
            returnString: true
        };
    },
    /** Compute the correct answer, based on the given scope
     * @param {Numbas.jme.Scope} scope
     * @returns {JME}
     */
    getCorrectAnswer: function(scope) {
        var settings = this.settings;
        var answerSimplification = Numbas.jme.collectRuleset(settings.answerSimplificationString,scope.allRulesets());
        var expr = jme.subvars(settings.correctAnswerString,scope);
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
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return new Numbas.jme.types.TString(this.studentAnswer);
    },

    /** Add a value generator expression to the list in this part's settings.
     * @param {String} name
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
