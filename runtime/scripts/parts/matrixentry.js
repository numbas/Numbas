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
/** Matrix entry part - student enters a matrix of numbers.
 *
 * @class
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
        tryGetAttribute(settings,xml,'answer',
            [
                'correctanswerfractions',
                'rows',
                'columns',
                'allowresize',
                'mincolumns',
                'maxcolumns',
                'minrows',
                'maxrows',
                'prefilledcells',
                'tolerance',
                'markpercell',
                'allowfractions'
            ],
            [
                'correctAnswerFractions',
                'numRowsString',
                'numColumnsString',
                'allowResize',
                'minColumnsString',
                'maxColumnsString',
                'minRowsString',
                'maxRowsString',
                'prefilledCellsString',
                'toleranceString',
                'markPerCell',
                'allowFractions'
            ]
        );
        tryGetAttribute(settings,xml,'answer/precision',['type','partialcredit','strict'],['precisionType','precisionPC','strictPrecision']);
        tryGetAttribute(settings,xml,'answer/precision','precision','precisionString',{'string':true});
        var messageNode = xml.selectSingleNode('answer/precision/message');
        if(messageNode) {
            settings.precisionMessage = Numbas.xml.transform(Numbas.xml.templates.question,messageNode);
        }
    },
    loadFromJSON: function(data) {
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        tryLoad(data,
            [
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
                'allowFractions'
            ],
            settings,
            [
                'correctAnswerString',
                'correctAnswerFractions',
                'numRowsString',
                'numColumnsString',
                'allowResize',
                'minColumnsString',
                'maxColumnsString',
                'minRowsString',
                'maxRowsString',
                'prefilledCellsString',
                'toleranceString',
                'markPerCell',
                'allowFractions'
            ]
        );
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
        var p = this;
        var settings = this.settings;
        var scope = this.getScope();

        /** Evaluate a setting given as a JME expression.
         *
         * @param {JME} setting
         */
        function eval_setting(setting) {
            var expr = jme.subvars(settings[setting+'String']+'', scope);
            var value = scope.evaluate(expr);
            settings[setting] = value===null ? value : jme.unwrapValue(value);
        }
        ['numRows','numColumns','tolerance','prefilledCells'].map(eval_setting);
        if(settings.allowResize) {
            ['minColumns','maxColumns','minRows','maxRows'].map(eval_setting);
        }

        var prefilled_fractions = settings.allowFractions && settings.correctAnswerFractions;
        var prefilledCells = jme.castToType(scope.evaluate(jme.subvars(settings.prefilledCellsString+'',scope)), 'list');
        if(prefilledCells) {
            settings.prefilledCells = prefilledCells.value.map(function(row) {
                row = jme.castToType(row,'list');
                return row.value.map(function(cell) {
                    if(jme.isType(cell,'rational') && !prefilled_fractions) {
                        cell = jme.castToType(cell,'decimal');
                    }
                    if(jme.isType(cell,'string')) {
                        var s = jme.castToType(cell,'string');
                        return s.value;
                    }
                    if(jme.isType(cell,'number')) {
                        if(prefilled_fractions) {
                            var frac;
                            if(jme.isType(cell,'rational')) {
                                frac = jme.castToType(cell,'rational').value;
                            } else if(jme.isType(cell,'decimal')) {
                                cell = jme.castToType(cell,'decimal');
                                frac = math.Fraction.fromDecimal(cell.value.re);
                            } else {
                                var n = jme.castToType(cell,'number');
                                var approx = math.rationalApproximation(cell.value.toNumber(),35);
                                frac = new math.Fraction(approx[0],approx[1]);
                            }
                            return frac.toString();
                        } else {
                            cell = jme.castToType(cell,'number');
                            return math.niceRealNumber(cell.value,scope);
                        }
                    }
                    p.error('part.matrix.invalid type in prefilled',{type: cell.type});
                })
            });
        }

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
    },
    initDisplay: function() {
        this.display = new Numbas.display.MatrixEntryPartDisplay(this);
    },
    /** The student's last submitted answer.
     *
     * @type {matrix}
     */
    studentAnswer: null,
    /** The script to mark this part - assign credit, and give messages and feedback.
     *
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() { return new Numbas.marking.MarkingScript(Numbas.raw_marking_scripts.matrixentry,null,this.getScope()); },
    /** Properties set when part is generated.
     *
     * Extends {@link Numbas.parts.Part#settings}.
     *
     * @property {matrix} correctAnswer - The correct answer to the part.
     * @property {JME} numRows - Default number of rows in the student's answer.
     * @property {JME} numColumns - Default number of columns in the student's answer.
     * @property {boolean} allowResize - Allow the student to change the dimensions of their answer?
     * @property {JME} tolerance - Allowed margin of error in each cell (if student's answer is within +/- `tolerance` of the correct answer (after rounding to , mark it as correct.
     * @property {boolean} markPerCell - Should the student gain marks for each correct cell (true), or only if they get every cell right (false)?
     * @property {boolean} allowFractions - Can the student enter a fraction as their answer for a cell?
     * @property {string} precisionType - Type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures.
     * @property {number} precision - How many decimal places or significant figures to require.
     * @property {number} precisionPC - Partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision.
     * @property {string} precisionMessage - Message to display in the marking feedback if their answer was not given to the required precision.
     * @property {boolean} strictPrecision - Must the student give exactly the required precision? If false, omitting trailing zeros is allowed.
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
        strictPrecision: true,
        minRows: 0,
        maxRows: 0,
        minColumns: 0,
        maxColumns: 0,
        prefilledCells: []
    },
    /** The name of the input widget this part uses, if any.
     *
     * @returns {string}
     */
    input_widget: function() {
        return 'matrix';
    },
    /** Options for this part's input widget.
     *
     * @returns {object}
     */
    input_options: function() {
        return {
            allowFractions: this.settings.allowFractions,
            allowedNotationStyles: ['plain','en','si-en'],
            allowResize: this.settings.allowResize,
            numRows: this.settings.numRows,
            numColumns: this.settings.numColumns,
            minColumns: this.settings.minColumns,
            maxColumns: this.settings.maxColumns,
            minRows: this.settings.minRows,
            maxRows: this.settings.maxRows,
            parseCells: false
        };
    },
    /** Compute the correct answer, based on the given scope.
     *
     * @param {Numbas.jme.Scope} scope
     * @returns {matrix}
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
                    var f = math.Fraction.fromFloat(c);
                    return f.toString();
                }
                return math.niceRealNumber(c,{precisionType: settings.precisionType, precision:settings.precision, style: settings.correctAnswerStyle});
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
    /** Get the student's answer as it was entered as a JME data type, to be used in the marking script.
     *
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
