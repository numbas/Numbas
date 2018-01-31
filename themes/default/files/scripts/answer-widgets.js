Numbas.queueScript('answer-widgets',['knockout','util','jme','jme-display'],function() {

    var util = Numbas.util;

    ko.components.register('answer-widget', {
        viewModel: function(params) {
            this.answerJSON = params.answer;
            this.part = params.part;
            this.partDisplay = params.partDisplay;
            this.disable = params.disable;
            this.widget = params.widget;
            this.widget_options = params.widget_options;
            this.classes = {'answer-widget':true};
            this.classes['answer-widget-'+this.widget] = true;
        },
        template: '\
        <span data-bind="css: classes, component: {name: \'answer-widget-\'+widget, params: {answerJSON: answerJSON, part: part, disable: disable, options: widget_options}}"></span>\
        '
    });

    ko.components.register('answer-widget-string', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            var init = ko.unwrap(this.answerJSON);
            this.input = ko.observable(init.valid ? init.value || '' : '');
            this.part = params.part;
            this.disable = params.disable;
            this.options = params.options;
            this.allowEmpty = this.options.allowEmpty;
            var lastValue = this.input();
            ko.computed(function() {
                var value = this.input();
                var valid = value!='' || this.allowEmpty;
                if(value != lastValue) {
                    this.answerJSON({valid: valid, value: value});
                }
                lastValue = value;
            },this);
        },
        template: '\
            <input type="text" data-bind="event: part.inputEvents, textInput: input, autosize: true, disable: ko.unwrap(disable) || ko.unwrap(part.revealed)">\
        '
    });

    ko.components.register('answer-widget-number', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            this.part = params.part.part;
            this.options = params.options;
            this.allowFractions = this.options.allowFractions || false;
            this.allowedNotationStyles = this.options.allowedNotationStyles || ['plain','en','si-en'];
            this.disable = params.disable;

            var init = ko.unwrap(this.answerJSON);
            this.input = ko.observable(init.valid ? Numbas.math.niceNumber(init.value,{style: this.allowedNotationStyles[0]}) || '' : '');

            this.result = ko.computed(function() {
                var input = this.input().trim();
                if(input=='') {
                    return {valid:false};
                }
                if(!util.isNumber(input,this.allowFractions,this.allowedNotationStyles)) {
                    if(util.isNumber(input, true, this.allowedNotationStyles)) {
                        return {valid: false, warnings: [R('answer.number.fractions not allowed')]};
                    } else {
                        return {valid:false, warnings: [R('answer.number.not a number')]};
                    }
                } else {
                    var n = Numbas.util.parseNumber(input,this.allowFractions,this.allowedNotationStyles);
                    return {valid:true, value: n};
                }
            },this);
            ko.computed(function() {
                this.answerJSON(this.result())
            },this);
        },
        template: '\
            <input type="text" data-bind="event: part.inputEvents, textInput: input, autosize: true, disable: ko.unwrap(disable) || ko.unwrap(part.revealed)">\
        '
    });

    ko.components.register('answer-widget-jme', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;

            this.part = params.part;
            var p = this.part.part;
            this.options = params.options;
            this.showPreview = this.options.showPreview || false;

            this.disable = params.disable;

            var init = ko.unwrap(this.answerJSON);
            this.input = ko.observable(init.valid ? Numbas.jme.display.treeToJME(init.value) || '' : '');

            this.latex = ko.computed(function() {
                var input = this.input();
                if(input==='') {
                    return '';
                }

                try {
                    var tex = Numbas.jme.display.exprToLaTeX(input,'',p.question.scope);
                    if(tex===undefined) {
                        throw(new Numbas.Error('display.part.jme.error making maths'));
                    }
                }
                catch(e) {
                    return '';
                }

                return tex;
            },this).extend({throttle:100});

            this.result = ko.computed(function() {
                var input = this.input().trim();

                if(input=='') {
                    return {valid:false};
                }

                try {
                    var expr = Numbas.jme.compile(input);
                    var scope = p.getScope();
                    var ruleset = new Numbas.jme.rules.Ruleset([],{});
                    expr = Numbas.jme.display.simplifyTree(expr, ruleset, scope);
                    return {valid: true, value: expr}
                } catch(e) {
                    return {valid: false, warnings: [R('answer.jme.invalid expression',{message:e.message})]};
                }
                
            },this);
            ko.computed(function() {
                this.answerJSON(this.result())
            },this);
        },
        template: '\
            <input type="text" data-bind="event: part.inputEvents, textInput: input, autosize: true, disable: ko.unwrap(disable) || ko.unwrap(part.revealed)">\
            <span class="jme-preview" data-bind="visible: showPreview && latex(), maths: \'\\\\displaystyle{{\'+latex()+\'}}\'"></span>\
        '
    });

    ko.components.register('answer-widget-gapfill', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            var part = params.part;
            this.gaps = ko.computed(function() {
                return Knockout.unwrap(part.gaps).map(function(gap) {
                    return {answerJSON: ko.observable(), part: gap};
                });
            },this)
            ko.computed(function() {
                this.answerJSON(this.gaps().map(function(g){return g.answerJSON()}));
            },this);
        },
        template: '\
            <table class="table">\
                <tbody data-bind="foreach: gaps">\
                    <tr>\
                        <th><span data-bind="text: part.header"></span></th>\
                        <td><div data-bind="component: {name: \'answer-widget\', params: {answer: answerJSON, widget: Knockout.unwrap(part.type).widget, part: part}}"></div></td>\
                    </tr>\
                </tbody>\
            </table>\
        '
    });

    ko.components.register('answer-widget-matrix', {
        viewModel: function(params) {
            var vm = this;
            this.answerJSON = params.answerJSON;
            this.options = params.options;
            this.disable = params.disable;
            this.allowFractions = this.options.allowFractions || false;
            this.allowedNotationStyles = this.options.allowedNotationStyles || ['plain','en','si-en'];
            this.allowResize = this.options.allowResize===undefined ? true : this.options.allowResize;
            this.numRows = this.options.numRows || 1;
            this.numColumns = this.options.numColumns || 1;
            this.parseCells = this.options.parseCells===undefined ? true : this.options.parseCells;

            var init = ko.unwrap(this.answerJSON);
            var value = init.value;
            if(!value) {
                value = [];
                for(var i=0;i<this.numRows;i++) {
                    var row = [];
                    for(var j=0;j<this.numColumns;j++) {
                        row.push('');
                    }
                    value.push(row);
                }
            }
            this.input = ko.observable(value);

            this.result = ko.computed(function() {
                var value = this.input().slice().map(function(r){return r.slice()});
                var cells = Array.prototype.concat.apply([],value);
                if(this.parseCells) {
                    var valid = cells.every(function(cell){ return util.isNumber(cell,vm.allowFractions,vm.allowedNotationStyles) });
                    if(!valid) {
                        var validFractions = cells.every(function(cell){ return util.isNumber(cell,true,vm.allowedNotationStyles) });
                        if(validFractions) {
                            return {valid: false, warnings: [R('answer.matrix.fractions not allowed')]};
                        } else {
                            return {valid:false, warnings: [R('answer.matrix.some cell not a number')]};
                        }
                    } else {
                        var matrix = value.map(function(row){ return row.map(function(cell){ return Numbas.util.parseNumber(cell,this.allowFractions,this.allowedNotationStyles) }) });
                        matrix.rows = value.length;
                        matrix.columns = matrix.rows>0 ? value[0].length : 0;
                        return {valid:true, value: matrix};
                    }
                } else {
                    return {valid: true, value: value};
                }
            },this);
            var lastValue = this.result();
            ko.computed(function() {
                var result = this.result();
                var valuesSame = result.value.every(function(row,i) { return row.every(function(cell,j){ return cell == lastValue.value[i][j] || isNaN(cell) && isNaN(lastValue.value[i][j]); }) });
                if(!valuesSame || result.valid!=lastValue.valid) {
                    this.answerJSON(result);
                }
                lastValue = result;
            },this);
        },
        template: '\
            <matrix-input params="value: input, allowResize: true, disable: disable, allowResize: allowResize, rows: numRows, columns: numColumns"></matrix-input>\
        '
    });

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
                if(numRows==value.length && (numRows==0 || numColumns==value[0]().length)) {
                    return;
                }
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
        +'					<td class="cell"><input type="text" data-bind="textInput: cell, autosize: true, disable: $parents[1].disable, event: {keydown: $parents[1].keydown, keyup: $parents[1].moveArrow}"></td>'
        +'				</tr>'
        +'			</tbody>'
        +'		</table>'
        +'		<span class="right-bracket"></span>'
        +'	</div>'
        +'</div>'
        }
    )

    ko.components.register('answer-widget-radios', {
        viewModel: function(params) {
            this.part = params.part;
            this.choices = ko.observableArray(this.part.input_options.choices);
            this.choice = ko.observable(null);
            this.answerJSON = params.answerJSON;
            var init = ko.unwrap(this.answerJSON);
            if(init.valid) {
                this.choice(init.value);
            }

            ko.computed(function() {
                var choice = this.choice();
                this.answerJSON({valid: choice!==null, value: choice});
            },this);
        },
        template: '\
            <form>\
            <ul class="list-unstyled" data-bind="foreach: choices">\
                <li><label><input type="radio" name="choice" data-bind="checkedValue: $index, checked: $parent.choice"> <span data-bind="html: $data"></span></label></li>\
            </ul>\
            </form>\
        '
    });

    ko.components.register('answer-widget-dropdown', {
        viewModel: function(params) {
            this.part = params.part;
            this.choices = this.part.input_options.choices.map(function(c,i){return {label: c, index: i}});
            this.choices.splice(0,0,{label: '', index: null});
            this.choice = ko.observable(null);
            this.answerJSON = params.answerJSON;
            var init = ko.unwrap(this.answerJSON);
            if(init.valid) {
                this.choice(this.choices[init.value]+1);
            }

            ko.computed(function() {
                var choice = this.choice();
                if(choice && choice.index!==null) {
                    this.answerJSON({valid: true, value: choice.index});
                } else {
                    this.answerJSON({valid: false});
                }
            },this);
        },
        template: '\
            <select data-bind="options: choices, optionsText: \'label\', value: choice"></select>\
        '
    });

    ko.components.register('answer-widget-checkboxes', {
        viewModel: function(params) {
            this.part = params.part;
            this.answerJSON = params.answerJSON;
            var init = ko.unwrap(this.answerJSON);

            this.choices = ko.observableArray(this.part.input_options.choices.map(function(choice,i) {
                return {
                    content: choice,
                    ticked: ko.observable(init.valid ? init.value[i] : false)
                }
            }));

            var lastValue = this.choices().map(function(c){ return c.ticked() });
            ko.computed(function() {
                var value = this.choices().map(function(c){return c.ticked()});
                var same = value.every(function(c,i){ return c==lastValue[i] });
                if(!same) {
                    this.answerJSON({valid: true, value: value});
                }
                lastValue = value;
            },this);
        },
        template: '\
            <form>\
            <ul class="list-unstyled" data-bind="foreach: choices">\
                <li><label><input type="checkbox" name="choice" data-bind="checked: ticked"> <span data-bind="html: content"></span></label></li>\
            </ul>\
            </form>\
        '
    });

    ko.components.register('answer-widget-m_n_x', {
        viewModel: function(params) {
            this.part = params.part;
            this.answerJSON = params.answerJSON;
            this.choices = ko.computed(function() {
                try {
                    return this.part.type().model.choices().map(function(c){return c.content()});
                } catch(e) {
                    return [];
                }
            },this);
            this.answers = ko.computed(function() {
                try {
                    return this.part.type().model.answers().map(function(c){return c.content()});
                } catch(e) {
                    return [];
                }
            },this);
            this.ticks = ko.computed(function() {
                var choices = this.choices();
                var answers = this.answers();
                var ticks = [];
                for(var i=0;i<choices.length;i++) {
                    var row = [];
                    for(var j=0;j<answers.length;j++) {
                        row.push({ticked: ko.observable(false)});
                    }
                    ticks.push(row);
                }
                return ticks;
            },this);

            ko.computed(function() {
                var ticks = this.ticks().map(function(r){return r.map(function(d){return d.ticked()})});

                // because of the never-ending madness to do with the order of matrices in multiple choice parts,
                // this matrix needs to be transposed
                // It makes more sense for the array to go [choice][answer], because that's how they're displayed, but 
                // changing that would mean breaking old questions.
                var numAnswers = this.answers().length;
                var numChoices = this.choices().length;
                var oticks = [];
                for(var i=0;i<numAnswers;i++) {
                    var row = [];
                    oticks.push(row);
                    for(var j=0;j<numChoices;j++) {
                        row.push(ticks[j][i]);
                    }
                }
                this.answerJSON(oticks);
            },this);
        },
        template: '\
            <form>\
                <table>\
                <thead>\
                <tr>\
                    <td></td>\
                    <!-- ko foreach: answers -->\
                    <th><span data-bind="html: $data"></span></th>\
                    <!-- /ko -->\
                </tr>\
                <tbody data-bind="foreach: ticks">\
                    <tr>\
                        <th><span data-bind="html: $parent.choices()[$index()]"></span></th>\
                        <!-- ko foreach: $data -->\
                        <td><input type="checkbox" data-bind="checked: ticked"></td>\
                        <!-- /ko -->\
                    </tr>\
                </tbody>\
                </table>\
            </form>\
        '
    });

});
