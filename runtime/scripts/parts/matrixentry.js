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
/** @file The {@link Numbas.parts.MatrixEntryPart} object */
Numbas.queueScript('parts/matrixentry',['base','jme','jme-variables','util','part','marking_scripts'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var Part = Numbas.parts.Part;
/** Matrix entry part - student enters a matrix of numbers
 * @constructor
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var MatrixEntryPart = Numbas.parts.MatrixEntryPart = function(path, question, parentPart, store) {
    var settings = this.settings;
    util.copyinto(MatrixEntryPart.prototype.settings,settings);
}
MatrixEntryPart.prototype = /** @lends Numbas.parts.MatrixEntryPart.prototype */
{
    loadFromXML: function(xml) {
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        tryGetAttribute(settings,xml,'answer',['correctanswer'],['correctAnswerString'],{string:true});
        tryGetAttribute(settings,xml,'answer',['correctanswerfractions','rows','columns','allowresize','tolerance','markpercell','allowfractions'],['correctAnswerFractions','numRows','numColumns','allowResize','tolerance','markPerCell','allowFractions']);
        tryGetAttribute(settings,xml,'answer/precision',['type','partialcredit','strict'],['precisionType','precisionPC','strictPrecision']);
        tryGetAttribute(settings,xml,'answer/precision','precision','precisionString',{'string':true});
        var messageNode = xml.selectSingleNode('answer/precision/message');
        if(messageNode) {
            settings.precisionMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
        }
    },
    loadFromJSON: function(data) {
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        tryLoad(data,['correctAnswer', 'correctAnswerFractions', 'numRows', 'numColumns', 'allowResize', 'tolerance', 'markPerCell', 'allowFractions'], settings, ['correctAnswerString', 'correctAnswerFractions', 'numRows', 'numColumns', 'allowResize', 'tolerance', 'markPerCell', 'allowFractions']);
        tryLoad(data,['precisionType', 'precision', 'precisionPartialCredit', 'precisionMessage', 'strictPrecision'], settings, ['precisionType', 'precisionString', 'precisionPC', 'precisionMessage', 'strictPrecision']);
        settings.precisionPC /= 100;
    },
    resume: function() {
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        if(pobj.studentAnswer!==undefined) {
            this.stagedAnswer = pobj.studentAnswer.matrix;
            this.stagedAnswer.rows = pobj.studentAnswer.rows;
            this.stagedAnswer.columns = pobj.studentAnswer.columns;
        }
    },
    finaliseLoad: function() {
        var settings = this.settings;
        var scope = this.getScope();
        var numRows = jme.subvars(settings.numRows, scope);
        settings.numRows = scope.evaluate(numRows).value;
        var numColumns = jme.subvars(settings.numColumns, scope);
        settings.numColumns = scope.evaluate(numColumns).value;
        var tolerance = jme.subvars(settings.tolerance, scope);
        settings.tolerance = scope.evaluate(tolerance).value;
        settings.tolerance = Math.max(settings.tolerance,0.00000000001);
        if(settings.precisionType!='none') {
            settings.allowFractions = false;
        }
        this.studentAnswer = [];
        for(var i=0;i<this.settings.numRows;i++) {
            var row = [];
            for(var j=0;j<this.settings.numColumns;j++) {
                row.push('');
            }
            this.studentAnswer.push(row);
        }
        this.getCorrectAnswer(scope);
        if(!settings.allowResize && (settings.correctAnswer.rows!=settings.numRows || settings.correctAnswer.columns != settings.numColumns)) {
            var correctSize = settings.correctAnswer.rows+'×'+settings.correctAnswer.columns;
            var answerSize = settings.numRows+'×'+settings.numColumns;
            throw(new Numbas.Error('part.matrix.size mismatch',{correct_dimensions:correctSize,input_dimensions:answerSize}));
        }
        if(Numbas.display) {
            this.display = new Numbas.display.MatrixEntryPartDisplay(this);
        }
    },
    /** The student's last submitted answer */
    studentAnswer: '',
    /** The script to mark this part - assign credit, and give messages and feedback.
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() { return Numbas.marking_scripts.matrixentry; },
    /** Properties set when part is generated
     * Extends {@link Numbas.parts.Part#settings}
     * @property {matrix} correctAnswer - the correct answer to the part
     * @property {JME} numRows - default number of rows in the student's answer
     * @property {JME} numColumns - default number of columns in the student's answer
     * @property {Boolean} allowResize - allow the student to change the dimensions of their answer?
     * @property {JME} tolerance - allowed margin of error in each cell (if student's answer is within +/- `tolerance` of the correct answer (after rounding to , mark it as correct
     * @property {Boolean} markPerCell - should the student gain marks for each correct cell (true), or only if they get every cell right (false)?
     * @property {Boolean} allowFractions - can the student enter a fraction as their answer for a cell?
     * @property {String} precisionType - type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures
     * @property {Number} precision - how many decimal places or significant figures to require
     * @property {Number} precisionPC - partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision
     * @property {String} precisionMessage - message to display in the marking feedback if their answer was not given to the required precision
     * @property {Boolean} strictPrecision - must the student give exactly the required precision? If false, omitting trailing zeros is allowed.
     */
    settings: {
        correctAnswer: null,
        correctAnswerFractions: false,
        numRows: '3',
        numColumns: '3',
        allowResize: true,
        tolerance: '0',
        markPerCell: false,
        allowFractions: false,
        precisionType: 'none',    //'none', 'dp' or 'sigfig'
        precisionString: '0',
        precision: 0,
        precisionPC: 0,
        precisionMessage: R('You have not given your answer to the correct precision.'),
        strictPrecision: true
    },
    /** The name of the input widget this part uses, if any.
     * @returns {String}
     */
    input_widget: function() {
        return 'matrix';
    },
    /** Options for this part's input widget
     * @returns {Object}
     */
    input_options: function() {
        return {
            allowFractions: this.settings.allowFractions,
            allowedNotationStyles: ['plain','en','si-en'],
            allowResize: this.settings.allowResize,
            numRows: this.settings.numRows,
            numColumns: this.settings.numColumns,
            parseCells: false
        };
    },
    /** Compute the correct answer, based on the given scope
     * @param {Numbas.jme.Scope} scope
     */
    getCorrectAnswer: function(scope) {
        var settings = this.settings;
        var correctAnswer = jme.subvars(settings.correctAnswerString,scope);
        correctAnswer = jme.evaluate(correctAnswer,scope);
        if(correctAnswer && correctAnswer.type=='matrix') {
            settings.correctAnswer = correctAnswer.value;
        } else if(correctAnswer && correctAnswer.type=='vector') {
            settings.correctAnswer = Numbas.vectormath.toMatrix(correctAnswer.value);
        } else {
            this.error('part.setting not present',{property:'correct answer'});
        }
        settings.precision = jme.subvars(settings.precisionString, scope);
        settings.precision = jme.evaluate(settings.precision,scope).value;

        var correctInput = settings.correctAnswer.map(function(row) {
            return row.map(function(c) {
                if(settings.allowFractions) {
                    var f = math.rationalApproximation(c);
                    if(f[1]!=1) {
                        return f[0]+'/'+f[1];
                    }
                }
                return math.niceNumber(c,{precisionType: settings.precisionType, precision:settings.precision, style: settings.correctAnswerStyle});
            });
        });
        correctInput.rows = settings.correctAnswer.rows;
        correctInput.columns = settings.correctAnswer.columns;
        return correctInput;
    },
    /** Save a copy of the student's answer as entered on the page, for use in marking.
     */
    setStudentAnswer: function() {
        if(this.stagedAnswer !== undefined) {
            var m = this.stagedAnswer;
            this.studentAnswerRows = m.length;
            this.studentAnswerColumns = this.studentAnswerRows>0 ? m[0].length : 0;
        } else {
            this.studentAnswerRows = 0;
            this.studentAnswerColumns = 0;
        }
        this.studentAnswer = this.stagedAnswer;
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the marking script
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return jme.wrapValue(this.studentAnswer);
    }
};
['resume','finaliseLoad','loadFromXML','loadFromJSON'].forEach(function(method) {
    MatrixEntryPart.prototype[method] = util.extend(Part.prototype[method], MatrixEntryPart.prototype[method]);
});
Numbas.partConstructors['matrix'] = util.extend(Part,MatrixEntryPart);
});
