Numbas.queueScript('display/parts/matrix',['display-base','part-display','util','jme','jme-display'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    var util = Numbas.util;
    /** Display code for a {@link Numbas.parts.MatrixEntryPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name MatrixEntryPartDisplay
     * @memberof Numbas.display
     */
    display.MatrixEntryPartDisplay = function()
    {
        var p = this.part;
        /** The student's current (not necessarily submitted) answer
         * @member {observable|string} studentAnswer
         * @memberof Numbas.display.MatrixEntryPartDisplay
         */
        this.studentAnswer = Knockout.observable(p.studentAnswer);
        /** The correct answer
         * @member {observable|number} correctAnswer
         * @memberof Numbas.display.MatrixEntryPartDisplay
         */
        var correctInput = p.settings.correctAnswer.map(function(row) {
            return row.map(function(c) {
                if(p.settings.allowFractions) {
                    return c;
                }
                return Numbas.math.niceNumber(c,{precisionType: p.settings.precisionType, precision: p.settings.precision, style: p.settings.correctAnswerStyle});
            });
        });
        correctInput.rows = p.settings.correctAnswer.rows;
        correctInput.columns = p.settings.correctAnswer.columns;

        this.correctAnswer = Knockout.observable(correctInput);
        this.correctAnswerLaTeX = Knockout.computed(function() {
            var correctAnswer = this.correctAnswer();
            var m = new Numbas.jme.types.TMatrix(correctAnswer);
            return Numbas.jme.display.texify({tok:m},{fractionnumbers: p.settings.correctAnswerFractions});
        },this);
        this.studentAnswerRows = Knockout.observable(p.settings.numRows);
        this.studentAnswerColumns = Knockout.observable(p.settings.numColumns);
        this.allowResize = Knockout.observable(p.settings.allowResize);
        Knockout.computed(function() {
            var stagedAnswer = p.stagedAnswer || {rows:null, columns: null, matrix: null};
            var oldRows = stagedAnswer.rows;
            var oldColumns = stagedAnswer.columns;
            var oldMatrix = stagedAnswer.matrix;
            var newRows = this.studentAnswerRows();
            var newColumns = this.studentAnswerColumns();
            var newMatrix = this.studentAnswer();
            if(newRows != oldRows || newColumns != oldColumns || !util.arraysEqual(oldMatrix,newMatrix)) {
                var m = this.studentAnswer();
                m.rows = this.studentAnswerRows();
                m.columns = this.studentAnswerColumns();
                p.storeAnswer(m);
            }
        },this);
        /** Show a LaTeX rendering of the answer?
         * @member {boolean} showPreview
         * @memberof Numbas.display.MatrixEntryPartDisplay
         */
        this.showPreview = false;
        /** TeX version of student's answer
         * @member {observable|TeX} studentAnswerLaTeX
         * @memberof Numbas.display.MatrixEntryPartDisplay
         */
        this.studentAnswerLaTeX = Knockout.computed(function() {
            return 'student answer latex';
        },this);
    }
    display.MatrixEntryPartDisplay.prototype =
    {
        restoreAnswer: function()
        {
            var studentAnswer = this.part.studentAnswer;
            this.studentAnswerRows(studentAnswer.length || 1);
            this.studentAnswerColumns(studentAnswer.length ? studentAnswer[0].length : 1);
            this.studentAnswer(studentAnswer);
        }
    };
    display.MatrixEntryPartDisplay = extend(display.PartDisplay,display.MatrixEntryPartDisplay,true);
});
