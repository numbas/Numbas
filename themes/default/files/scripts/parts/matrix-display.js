Numbas.queueScript('display/parts/matrix',['display-base','part-display','util','jme','jme-display'],function() {
    var display = Numbas.display;
    var jme = Numbas.jme;
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

        /** The correct answer
         * @member {observable|matrix} correctAnswer
         * @memberof Numbas.display.MatrixEntryPartDisplay
         */
        this.correctAnswer = Knockout.observable();
        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));
        this.correctAnswerRows = ko.computed(function() {
            return this.correctAnswer().rows;
        },this);
        this.correctAnswerColumns = ko.computed(function() {
            return this.correctAnswer().columns;
        },this);
        this.studentAnswerRows = Knockout.observable(p.settings.numRows || this.correctAnswerRows());
        this.studentAnswerColumns = Knockout.observable(p.settings.numColumns || this.correctAnswerColumns());
        this.allowResize = Knockout.observable(p.settings.allowResize);
        this.minColumns = Knockout.observable(p.settings.minColumns);
        this.maxColumns = Knockout.observable(p.settings.maxColumns);
        this.minRows = Knockout.observable(p.settings.minRows);
        this.maxRows = Knockout.observable(p.settings.maxRows);
        this.prefilledCells = Knockout.observable(p.settings.prefilledCells);
        this.cellFeedback = Knockout.pureComputed(function() {
            const answer = this.input_answer() || {};
            if(!answer.valid) {
                return [];
            }
            let feedback = answer.value.map((row) => row.map(c => ''));
            if(!p.settings.markPerCell || !this.showCorrectAnswer()) {
                return feedback;
            }

            const correct_cells = this.marking_values()?.correct_cells;

            if(!correct_cells) {
                return feedback;
            }

            feedback = feedback.map(row => row.map(c => 'incorrect'));

            jme.unwrapValue(correct_cells).map(([r,c]) => {
                feedback[r][c] = 'correct';
            });
            return feedback;
        }, this);

        this.gridlines = Knockout.pureComputed(function() {
            var numRows = this.studentAnswerRows();
            var numColumns = this.studentAnswerColumns();

            var rowExpression = {
                'afterFirstRow': '[true]+repeat(false, numRows-2)',
                'beforeLastRow': 'repeat(false, numRows-2)+[true]',
                'custom': p.settings.gridlinesCustomRows
            }[p.settings.gridlines] || 'repeat(false, numRows-1)';

            var columnExpression = {
                'afterFirstColumn': '[true]+repeat(false, numColumns-2)',
                'beforeLastColumn': 'repeat(false, numColumns-2)+[true]',
                'custom': p.settings.gridlinesCustomColumns
            }[p.settings.gridlines] || 'repeat(false, numColumns-1)';

            const scope = new jme.Scope([p.getScope(), {variables: {numRows: jme.wrapValue(numRows), numColumns: jme.wrapValue(numColumns)}}]);

            let rowLines, columnLines;
            try {
                rowLines = scope.evaluate(rowExpression);
                rowLines = jme.castToType(rowLines, 'list');
                rowLines = jme.unwrapValue(rowLines);
            } catch(e) {
                p.giveWarning(R('display.part.matrix.error in gridline rows expression', {message: e}));
                rowLines = [];
            }
            try {
                columnLines = scope.evaluate(columnExpression);
                columnLines = jme.castToType(columnLines, 'list');
                columnLines = jme.unwrapValue(columnLines);
            } catch(e) {
                throw(new Numbas.Error('display.part.matrix.error in gridline columns expression', {message: e}));
                columnLines = [];
            }

            return {rows: rowLines, columns: columnLines};
        }, this);

        this.gridlinesRows = Knockout.pureComputed(function() {
            return this.gridlines().rows;
        }, this);

        this.gridlinesColumns = Knockout.pureComputed(function() {
            return this.gridlines().columns;
        }, this);

        this.input_widget = 'matrix';
        this.input_options = {
            parseCells: false,
            numRows: this.studentAnswerRows,
            numColumns: this.studentAnswerColumns,
            minColumns: this.minColumns,
            maxColumns: this.maxColumns,
            minRows: this.minRows,
            maxRows: this.maxRows,
            prefilledCells: this.prefilledCells,
            gridlinesRows: Knockout.computed(() => this.gridlines().rows),
            gridlinesColumns: Knockout.computed(() => this.gridlines().columns),
            showBrackets: true,
            rowHeaders: [],
            columnHeaders: [],
            cellFeedback: this.cellFeedback,
        };
    }
    display.MatrixEntryPartDisplay.prototype =
    {
        updateCorrectAnswer: function(answer) {
            this.correctAnswer(answer);
        },
    };
    display.MatrixEntryPartDisplay = extend(display.PartDisplay,display.MatrixEntryPartDisplay,true);
});
