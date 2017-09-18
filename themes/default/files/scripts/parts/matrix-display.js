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
        this.studentAnswer = ko.observable(p.studentAnswer);

        /** The correct answer
         * @member {observable|number} correctAnswer
         * @memberof Numbas.display.MatrixEntryPartDisplay
         */
        this.correctAnswer = ko.observable(p.settings.correctAnswer);
        this.correctAnswerLaTeX = ko.computed(function() {
            var correctAnswer = this.correctAnswer();
            var m = new Numbas.jme.types.TMatrix(correctAnswer);
            return Numbas.jme.display.texify({tok:m},{fractionnumbers: p.settings.correctAnswerFractions});
        },this);

        this.studentAnswerRows = ko.observable(p.settings.numRows);
        this.studentAnswerColumns = ko.observable(p.settings.numColumns);
        this.allowResize = ko.observable(p.settings.allowResize);

        ko.computed(function() {
            var stagedAnswer = p.stagedAnswer || [null,null,null];
            var oldRows = stagedAnswer[0];
            var oldColumns = stagedAnswer[1];
            var oldMatrix = stagedAnswer[2];
            var newRows = this.studentAnswerRows();
            var newColumns = this.studentAnswerColumns();
            var newMatrix = this.studentAnswer();
            if(newRows != oldRows || newColumns != oldColumns || !util.arraysEqual(oldMatrix,newMatrix)) {
                p.storeAnswer({
                    rows: this.studentAnswerRows(),
                    columns: this.studentAnswerColumns(),
                    matrix: this.studentAnswer()
                });
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
        this.studentAnswerLaTeX = ko.computed(function() {
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
