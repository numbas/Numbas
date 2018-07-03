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
/** @file The {@link Numbas.parts.NumberEntryPart} object */
Numbas.queueScript('parts/numberentry',['base','jme','jme-variables','util','part','marking_scripts'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var Part = Numbas.parts.Part;
/** Number entry part - student's answer must be within given range, and written to required precision.
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var NumberEntryPart = Numbas.parts.NumberEntryPart = function(xml, path, question, parentPart, loading)
{
    var settings = this.settings;
    util.copyinto(NumberEntryPart.prototype.settings,settings);
}
NumberEntryPart.prototype = /** @lends Numbas.parts.NumberEntryPart.prototype */
{
    loadFromXML: function(xml) {
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        tryGetAttribute(settings,xml,'answer',['minvalue','maxvalue'],['minvalueString','maxvalueString'],{string:true});
        tryGetAttribute(settings,xml,'answer',['correctanswerfraction','correctanswerstyle','allowfractions'],['correctAnswerFraction','correctAnswerStyle','allowFractions']);
        tryGetAttribute(settings,xml,'answer',['mustbereduced','mustbereducedpc'],['mustBeReduced','mustBeReducedPC']);
        var answerNode = xml.selectSingleNode('answer');
        var notationStyles = answerNode.getAttribute('notationstyles');
        if(notationStyles) {
            settings.notationStyles = notationStyles.split(',');
        }
        tryGetAttribute(settings,xml,'answer/precision',['type','partialcredit','strict','showprecisionhint'],['precisionType','precisionPC','strictPrecision','showPrecisionHint']);
        tryGetAttribute(settings,xml,'answer/precision','precision','precisionString',{'string':true});
        var messageNode = xml.selectSingleNode('answer/precision/message');
        if(messageNode) {
            settings.precisionMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
        }
    },
    loadFromJSON: function(data) {
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        tryLoad(data, ['minValue', 'maxValue'], settings, ['minvalueString', 'maxvalueString']);
        tryLoad(data, ['correctAnswerFraction', 'correctAnswerStyle', 'allowFractions'], settings);
        tryLoad(data, ['mustBeReduced', 'mustBeReducedPC'], settings);
        tryLoad(data, ['notationStyles'], settings);
        tryLoad(data, ['precisionPartialCredit', 'strictPrecision', 'showPrecisionHint', 'precision', 'precisionType', 'precisionMessage'], settings, ['precisionPC', 'strictPrecision', 'showPrecisionHint', 'precisionString', 'precisionType', 'precisionMessage']);
    },
    finaliseLoad: function() {
        var settings = this.settings;
        if(settings.precisionType!='none') {
            settings.allowFractions = false;
        }
        try {
            this.getCorrectAnswer(this.getScope());
        } catch(e) {
            this.error(e.message);
        }
        this.stagedAnswer = '';
        if(Numbas.display) {
            this.display = new Numbas.display.NumberEntryPartDisplay(this);
        }
    },
    resume: function() {
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        this.stagedAnswer = pobj.studentAnswer+'';
    },
    /** The student's last submitted answer */
    studentAnswer: '',
    /** The script to mark this part - assign credit, and give messages and feedback.
     * @type {Numbas.marking.MarkingScript}
     */
    markingScript: Numbas.marking_scripts.numberentry,
    /** Properties set when the part is generated
     * Extends {@link Numbas.parts.Part#settings}
     * @property {Number} minvalueString - definition of minimum value, before variables are substituted in
     * @property {Number} minvalue - minimum value marked correct
     * @property {Number} maxvalueString - definition of maximum value, before variables are substituted in
     * @property {Number} maxvalue - maximum value marked correct
     * @property {Number} correctAnswerFraction - display the correct answer as a fraction?
     * @property {Boolean} allowFractions - can the student enter a fraction as their answer?
     * @property {Array.<String>} notationStyles - styles of notation to allow, other than `<digits>.<digits>`. See {@link Numbas.util.re_decimal}.
     * @property {Number} displayAnswer - representative correct answer to display when revealing answers
     * @property {String} precisionType - type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures
     * @property {Number} precisionString - definition of precision setting, before variables are substituted in
     * @property {Boolean} strictPrecision - must the student give exactly the required precision? If false, omitting trailing zeros is allowed.
     * @property {Number} precision - how many decimal places or significant figures to require
     * @property {Number} precisionPC - partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision
     * @property {String} precisionMessage - message to display in the marking feedback if their answer was not given to the required precision
     * @property {Boolean} mustBeReduced - should the student enter a fraction in lowest terms
     * @property {Number} mustBeReducedPC - partial credit to award if the answer is not a reduced fraction
     */
    settings:
    {
        minvalueString: '0',
        maxvalueString: '0',
        minvalue: 0,
        maxvalue: 0,
        correctAnswerFraction: false,
        allowFractions: false,
        notationStyles: ['plain','en','si-en'],
        displayAnswer: 0,
        precisionType: 'none',
        precisionString: '0',
        strictPrecision: false,
        precision: 0,
        precisionPC: 0,
        mustBeReduced: false,
        mustBeReducedPC: 0,
        precisionMessage: R('You have not given your answer to the correct precision.'),
        showPrecisionHint: true
    },
    /** The name of the input widget this part uses, if any.
     * @returns {String}
     */
    input_widget: function() {
        return 'string';
    },
    /** Options for this part's input widget
     * @returns {Object}
     */
    input_options: function() {
        return {
            allowFractions: this.settings.allowFractions,
            allowedNotationStyles: this.settings.notationStyles
        };
    },
    /** Compute the correct answer, based on the given scope
     */
    getCorrectAnswer: function(scope) {
        var settings = this.settings;
        var precision = jme.subvars(settings.precisionString, scope);
        settings.precision = scope.evaluate(precision).value;
        if(settings.precisionType=='sigfig' && settings.precision<=0) {
            throw(new Numbas.Error('part.numberentry.zero sig fig'));
        }
        if(settings.precisionType=='dp' && settings.precision<0) {
            throw(new Numbas.Error('part.numberentry.negative decimal places'));
        }
        var minvalue = jme.subvars(settings.minvalueString,scope);
        minvalue = scope.evaluate(minvalue);
        if(minvalue && minvalue.type=='number') {
            minvalue = minvalue.value;
        } else {
            throw(new Numbas.Error('part.setting not present',{property:R('minimum value')}));
        }
        var maxvalue = jme.subvars(settings.maxvalueString,scope);
        maxvalue = scope.evaluate(maxvalue);
        if(maxvalue && maxvalue.type=='number') {
            maxvalue = maxvalue.value;
        } else {
            throw(new Numbas.Error('part.setting not present',{property:R('maximum value')}));
        }
        var displayAnswer = (minvalue + maxvalue)/2;
        if(settings.correctAnswerFraction) {
            var diff = Math.abs(maxvalue-minvalue)/2;
            var accuracy = Math.max(15,Math.ceil(-Math.log(diff)));
            settings.displayAnswer = jme.display.jmeRationalNumber(displayAnswer,{accuracy:accuracy});
        } else {
            settings.displayAnswer = math.niceNumber(displayAnswer,{precisionType: settings.precisionType, precision:settings.precision, style: settings.correctAnswerStyle});
        }
        var fudge = 0.00000000001;
        settings.minvalue = minvalue - fudge;
        settings.maxvalue = maxvalue + fudge;
    },
    /** Tidy up the student's answer - at the moment, just remove space.
     * You could override this to do more substantial filtering of the student's answer.
     * @param {String} answer
     * @returns {String}
     */
    cleanAnswer: function(answer) {
        answer = answer.toString().trim();
        return answer;
    },
    /** Save a copy of the student's answer as entered on the page, for use in marking.
     */
    setStudentAnswer: function() {
        this.studentAnswer = this.cleanAnswer(this.stagedAnswer);
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return new Numbas.jme.types.TString(this.studentAnswer);
    }
};
['loadFromXML','loadFromJSON','resume','finaliseLoad'].forEach(function(method) {
    NumberEntryPart.prototype[method] = util.extend(Part.prototype[method], NumberEntryPart.prototype[method]);
});
Numbas.partConstructors['numberentry'] = util.extend(Part,NumberEntryPart);
});
