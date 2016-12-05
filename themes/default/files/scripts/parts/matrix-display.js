Numbas.queueScript('display/parts/matrix',['display-base','part-display','util','jme','jme-display'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;

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
                p.storeAnswer([this.studentAnswerRows(),this.studentAnswerColumns(),this.studentAnswer()]);
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

    ko.components.register('matrix-input',{
        viewModel: function(params) {
            this.allowResize = params.allowResize ? params.allowResize : ko.observable(false);
            if(typeof params.rows=='function') {
                this.numRows = params.rows;
            } else {
                this.numRows = ko.observable(params.rows || 2);
            }
            if(typeof params.columns=='function') {
                this.numColumns = params.columns;
            } else {
                this.numColumns = ko.observable(params.columns || 2);
            }

            var v = params.value();
            this.numRows(v.length || 1);
            this.numColumns(v.length ? v[0].length : 1);
            this.value = ko.observableArray(v.map(function(r){return ko.observableArray(r.map(function(c){return {cell:ko.observable(c)}}))}));

            this.disable = params.disable || false;

            this.keydown = function(obj,e) {
                this.oldPos = e.target.selectionStart;
                return true;
            }


            this.moveArrow = function(obj,e) {
                var cell = $(e.target).parent('td');
                var selectionStart = e.target.selectionStart;
                switch(e.which) {
                case 39:
                    if(e.target.selectionStart == this.oldPos && e.target.selectionStart==e.target.selectionEnd && e.target.selectionEnd==e.target.value.length) {
                        cell.next().find('input').focus();
                    }
                    break;
                case 37:
                    if(e.target.selectionStart == this.oldPos && e.target.selectionStart==e.target.selectionEnd && e.target.selectionEnd==0) {
                        cell.prev().find('input').focus();
                    }
                    break;
                case 38:
                    var e = cell.parents('tr').prev().children().eq(cell.index()).find('input');
                    if(e.length) {
                        e.focus();
                        e[0].setSelectionRange(this.oldPos,this.oldPos);
                    }
                    break;
                case 40:
                    var e = cell.parents('tr').next().children().eq(cell.index()).find('input');
                    if(e.length) {
                        e.focus();
                        e[0].setSelectionRange(this.oldPos,this.oldPos);
                    }
                    break;
                }
                return false;
            }
            
            this.update = function() {
                // update value when number of rows or columns changes
                var numRows = parseInt(this.numRows());
                var numColumns = parseInt(this.numColumns());
                
                var value = this.value();
                value.splice(numRows,value.length-numRows);
                for(var i=0;i<numRows;i++) {
                    var row;
                    if(value.length<=i) {
                        row = [];
                        value.push(ko.observableArray(row));
                    } else {
                        row = value[i]();
                    }
                    row.splice(numColumns,row.length-numColumns);
                    
                    for(var j=0;j<numColumns;j++) {
                        var cell;
                        if(row.length<=j) {
                            cell = ko.observable('');
                            row.push({cell:cell});
                        } else {
                            cell = row[j];
                        }
                    }
                    value[i](row);
                }
                this.value(value);
            }

            ko.computed(this.update,this);
            
            // update model with value
            ko.computed(function() {
                var v = params.value();
                var ov = this.value();
                this.numRows(v.length);
                this.numColumns(v[0] ? v[0].length : 0);
                for(var i=0;i<v.length;i++) {
                    var row = v[i];
                    for(var j=0;j<row.length;j++) {
                        var cell = row[j];
                        if(i<ov.length && j<ov[i]().length) {
                            ov[i]()[j].cell(cell);
                        }
                    }
                }
            },this);
            
            var firstGo = true;
            //update value with model
            ko.computed(function() {
                var v = this.value().map(function(row,i){
                    return row().map(function(cell,j){return cell.cell()})
                })
                if(firstGo) {
                    firstGo = false;
                    return;
                }
                params.value(v);
            },this)
        },
        template: 
         '<div class="matrix-input">'
        +'	<!-- ko if: allowResize --><div class="matrix-size">'
        +'		<label class="num-rows">Rows: <input type="number" min="1" data-bind="value: numRows, autosize: true, disable: disable"/></label>'
        +'		<label class="num-columns">Columns: <input type="number" min="1" data-bind="value: numColumns, autosize: true, disable: disable"/></label>'
        +'	</div><!-- /ko -->'
        +'	<div class="matrix-wrapper">'
        +'		<span class="left-bracket"></span>'
        +'		<table class="matrix">'
        +'			<tbody data-bind="foreach: value">'
        +'				<tr data-bind="foreach: $data">'
        +'					<td class="cell"><input data-bind="value: cell, valueUpdate: \'afterkeydown\', autosize: true, disable: $parents[1].disable, event: {keydown: $parents[1].keydown, keyup: $parents[1].moveArrow}"></td>'
        +'				</tr>'
        +'			</tbody>'
        +'		</table>'
        +'		<span class="right-bracket"></span>'
        +'	</div>'
        +'</div>'
        }
    )
});
