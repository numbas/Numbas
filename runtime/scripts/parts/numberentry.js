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
 *
 * @class
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var NumberEntryPart = Numbas.parts.NumberEntryPart = function(path, question, parentPart, store)
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
        tryGetAttribute(settings,xml,'answer',['correctanswerfraction','correctanswerstyle','allowfractions','showfractionhint','displayanswer'],['correctAnswerFraction','correctAnswerStyle','allowFractions','showFractionHint', 'displayAnswerString']);
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
            settings.precisionMessage = Numbas.xml.transform(Numbas.xml.templates.question,messageNode);
        }
    },
    loadFromJSON: function(data) {
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        if('answer' in data) {
            settings.minvalueString = settings.maxvalueString = data.answer+'';
        }
        tryLoad(data, ['minValue', 'maxValue'], settings, ['minvalueString', 'maxvalueString']);
        tryLoad(data, ['correctAnswerFraction', 'correctAnswerStyle', 'allowFractions'], settings);
        tryLoad(data, ['mustBeReduced', 'mustBeReducedPC'], settings);
        settings.mustBeReducedPC /= 100;
        tryLoad(data, ['notationStyles'], settings);
        tryLoad(data, ['precisionPartialCredit', 'strictPrecision', 'showPrecisionHint', 'showFractionHint', 'precision', 'precisionType', 'precisionMessage'], settings, ['precisionPC', 'strictPrecision', 'showPrecisionHint', 'showFractionHint', 'precisionString', 'precisionType', 'precisionMessage']);
        settings.precisionPC /= 100;
    },
    finaliseLoad: function() {
        var settings = this.settings;
        if(settings.precisionType!='none') {
            settings.allowFractions = false;
        }
        try {
            this.getCorrectAnswer(this.getScope());
        } catch(e) {
            this.error(e.message,{},e);
        }
        this.stagedAnswer = '';
    },
    initDisplay: function() {
        this.display = new Numbas.display.NumberEntryPartDisplay(this);
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
     *
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() { return new Numbas.marking.MarkingScript(Numbas.raw_marking_scripts.numberentry,null,this.getScope()); },
    /** Properties set when the part is generated
     * Extends {@link Numbas.parts.Part#settings}
     *
     * @property {number} minvalueString - Definition of minimum value, before variables are substituted in.
     * @property {number} minvalue - Minimum value marked correct.
     * @property {number} maxvalueString - Definition of maximum value, before variables are substituted in.
     * @property {number} maxvalue - Maximum value marked correct.
     * @property {number} correctAnswerFraction - Display the correct answer as a fraction?
     * @property {boolean} allowFractions - Can the student enter a fraction as their answer?
     * @property {Array.<string>} notationStyles - Styles of notation to allow, other than `<digits>.<digits>`. See {@link Numbas.util.re_decimal}.
     * @property {string} displayAnswerString - The definition of the display answer, without variables substituted in.
     * @property {number} displayAnswer - Representative correct answer to display when revealing answers.
     * @property {string} precisionType - Type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures.
     * @property {number} precisionString - Definition of precision setting, before variables are substituted in.
     * @property {boolean} strictPrecision - Must the student give exactly the required precision? If false, omitting trailing zeros is allowed.
     * @property {number} precision - How many decimal places or significant figures to require.
     * @property {number} precisionPC - Partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision.
     * @property {string} precisionMessage - Message to display in the marking feedback if their answer was not given to the required precision.
     * @property {boolean} mustBeReduced - Should the student enter a fraction in lowest terms.
     * @property {number} mustBeReducedPC - Partial credit to award if the answer is not a reduced fraction.
     * @property {boolean} showPrecisionHint - Show a hint about the required precision next to the input?
     * @property {boolean} showFractionHint - Show a hint that the answer should be a fraction next to the input?
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
        showPrecisionHint: true,
        showFractionHint: true
    },
    /** The name of the input widget this part uses, if any.
     *
     * @returns {string}
     */
    input_widget: function() {
        return 'string';
    },
    /** Options for this part's input widget.
     *
     * @returns {object}
     */
    input_options: function() {
        return {
            allowFractions: this.settings.allowFractions,
            allowedNotationStyles: this.settings.notationStyles
        };
    },
    /** Compute the correct answer, based on the given scope.
     *
     * @param {Numbas.jme.Scope} scope
     * @returns {string}
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
        var ominvalue = minvalue;
        if(!minvalue) {
            this.error('part.setting not present',{property:R('minimum value')});
        }
        var maxvalue = jme.subvars(settings.maxvalueString,scope);
        maxvalue = scope.evaluate(maxvalue);
        var omaxvalue = maxvalue;
        if(!maxvalue) {
            this.error('part.setting not present',{property:R('maximum value')});
        }

        var dmin = jme.castToType(minvalue,'decimal').value;
        var dmax = jme.castToType(maxvalue,'decimal').value;
        if(dmax.lessThan(dmin)) {
            var tmp = dmin;
            dmin = dmax;
            dmax = tmp;
            tmp = minvalue;
            minvalue = maxvalue;
            maxvalue = tmp;
        }

        var isNumber = ominvalue.type=='number' || omaxvalue.type=='number';

        if(minvalue.type=='number' && isFinite(minvalue.value)) {
            var size = Math.floor(Math.log10(Math.abs(minvalue.value)));
            minvalue = new jme.types.TNum(minvalue.value - Math.pow(10,size-12));
            minvalue.precisionType = 'dp';
            minvalue.precision = 12 - size;
        }
        minvalue = jme.castToType(minvalue,'decimal').value;
        settings.minvalue = minvalue;
        if(maxvalue.type=='number' && isFinite(maxvalue.value)) {
            var size = Math.floor(Math.log10(Math.abs(maxvalue.value)));
            maxvalue = new jme.types.TNum(maxvalue.value + Math.pow(10,size-12));
            maxvalue.precisionType = 'dp';
            maxvalue.precision = 12 - size;
        }
        maxvalue = jme.castToType(maxvalue,'decimal').value;
        settings.maxvalue = maxvalue;


        var displayAnswer;
        if(settings.displayAnswerString) {
            displayAnswer = scope.evaluate(jme.subvars(settings.displayAnswerString+'', scope));
            if(settings.allowFractions && settings.correctAnswerFraction && jme.isType(displayAnswer,'rational')) {
                displayAnswer = jme.unwrapValue(jme.castToType(displayAnswer,'rational'));
                settings.displayAnswer = displayAnswer.toString();
            } else if(jme.isType(displayAnswer,'decimal')) {
                displayAnswer = jme.unwrapValue(jme.castToType(displayAnswer,'decimal'));
                settings.displayAnswer = math.niceNumber(displayAnswer.toNumber(),{precisionType: settings.precisionType, precision:settings.precision, style: settings.correctAnswerStyle});
            } else if(jme.isType(displayAnswer,'number')) {
                displayAnswer = jme.unwrapValue(jme.castToType(displayAnswer,'number'));
                settings.displayAnswer = math.niceNumber(displayAnswer,{precisionType: settings.precisionType, precision:settings.precision, style: settings.correctAnswerStyle});
            } else if(jme.isType(displayAnswer,'string')) {
                settings.displayAnswer = jme.unwrapValue(jme.castToType(displayAnswer,'string'));
            } else {
                this.error('part.numberentry.display answer wrong type',{want_type: 'string', got_type: displayAnswer.type});
            }
        } else {
            if(minvalue.re.isFinite()) {
                if(maxvalue.re.isFinite()) {
                    displayAnswer = minvalue.plus(maxvalue).dividedBy(2);
                } else {
                    displayAnswer = minvalue;
                }
            } else {
                if(maxvalue.re.isFinite()) {
                    displayAnswer = maxvalue;
                } else if(maxvalue.equals(minvalue)) {
                    displayAnswer = maxvalue;
                } else {
                    displayAnswer = new math.ComplexDecimal(new Decimal(0));
                }
            }
            if(settings.allowFractions && settings.correctAnswerFraction) {
                var frac;
                if(isNumber) {
                    var approx = math.rationalApproximation(displayAnswer.re.toNumber(),35);
                    frac = new math.Fraction(approx[0],approx[1]);
                } else {
                    frac = math.Fraction.fromDecimal(displayAnswer.re);
                }
                settings.displayAnswer = frac.toString();
            } else {
                settings.displayAnswer = math.niceNumber(displayAnswer.toNumber(),{precisionType: settings.precisionType, precision:settings.precision, style: settings.correctAnswerStyle});
            }
        }
        return settings.displayAnswer;
    },
    /** Tidy up the student's answer - at the moment, just remove space.
     * You could override this to do more substantial filtering of the student's answer.
     *
     * @param {string} answer
     * @returns {string}
     */
    cleanAnswer: function(answer) {
        if(answer===undefined) {
            answer = '';
        }
        answer = answer.toString().trim();
        return answer;
    },
    /** Save a copy of the student's answer as entered on the page, for use in marking.
     */
    setStudentAnswer: function() {
        this.studentAnswer = this.cleanAnswer(this.stagedAnswer);
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm.
     *
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
