Numbas.queueScript('answer-widgets',['knockout','util','jme','jme-display'],function() {
    var util = Numbas.util;
    if(typeof Knockout === 'undefined') { 
        return;
    }

    /** @namespace Numbas.answer_widgets */
    var answer_widgets = Numbas.answer_widgets = {
        /**
         * @enum {Numbas.answer_widgets.custom_answer_widget_params}
         */
        custom_widgets: {}
    };

    var custom_widgets = answer_widgets.custom_widgets;

    /** @typedef Numbas.answer_widgets.custom_answer_widget
     * @function setAnswerJSON
     * @function disable
     * @function enable
     */

    /** @callback Numbas.answer_widgets.custom_answer_widget_constructor
     * @param {Element} element - The parent element of the widget.
     * @param {Numbas.parts.Part} part - The part whose answer the widget represents.
     * @param {string} title - The `title` attribute for the widget: a text description of what the widget represents.
     * @param {Object<Function>} events - Callback functions for events triggered by the widget.
     * @param {Numbas.answer_widgets.answer_changed} answer_changed - A function to call when the entered answer changes.
     * @param {object} options - Any options for the widget.
     * @constructs Numbas.answer_widgets.custom_answer_widget
     */

    /** A function to call when the content of an answer input widget changes.
     *
     * @callback Numbas.answer_widgets.answer_changed
     * @param {Numbas.custom_part_answer} answer
     */

    /** Parameters for registering a custom answer widget.
     *
     * @memberof Numbas.answer_widgets
     * @typedef Numbas.answer_widgets.custom_answer_widget_params
     * @property {string} name - The name of the widget. Used by custom part type definitions to refer to this widget.
     * @property {string} niceName - A readable name to be displayed in the editor.
     * @property {string} signature - The signature of the type of JME value that the input produces.
     * @property {Function} answer_to_jme - Convert a raw answer to a JME token.
     * @property {Array} options_definition - A definition of options that the widget accepts.
     * @property {Numbas.answer_widgets.custom_answer_widget_constructor} widget - A constructor for the widget.
     * @property {Numbas.storage.scorm.inputWidgetStorage} scorm_storage - Methods to save and resume answers using this widget.
     */

    /** Register a custom answer widget.
     *
     * @function
     * @name register_custom_widget
     * @param {Numbas.answer_widgets.custom_answer_widget_params} params
     * @memberof Numbas.answer_widgets
     */
    answer_widgets.register_custom_widget = function(params) {
        var name = params.name;
        custom_widgets[name] = params;
        Numbas.parts.register_custom_part_input_type(name, params.signature);
        Numbas.parts.CustomPart.prototype.student_answer_jme_types[name] = params.answer_to_jme;
        var input_option_types = Numbas.parts.CustomPart.prototype.input_option_types[name] = {};
        if(Numbas.storage) {
            Numbas.storage.inputWidgetStorage[name] = params.scorm_storage;
        }
        params.options_definition.forEach(function(def) {
            var types = {
                'choose_several': 'list of boolean',
                'list_of_strings': 'list of string',
                'choice_maker': 'list of string',
                'number_notation_styles': 'list of string',
                'string': 'string',
                'mathematical_expression': 'string',
                'checkbox': 'boolean',
                'dropdown': 'string',
                'code': 'string',
                'percent': 'number',
                'html': 'string'
            };
            input_option_types[def.name] = types[def.input_type];
        });

        Knockout.components.register('answer-widget-'+name, {
            viewModel: function(params) {
                this.name = name;
                this.params = params;
            },
            template: '<div data-bind="custom_answer_widget: {params: params, name: name}"></div>'
        });
    }


    /** Ensure `v` is an observable, and if it's not given return the default value.
     *
     * @param {object|Observable|undefined} v
     * @param {object} d - The default value.
     * @returns {Observable}
     */
    function defaultObservable(v,d) {
        return v!==undefined ? Knockout.isObservable(v) ? v : Knockout.observable(v) : Knockout.observable(d);
    }

    Knockout.components.register('answer-widget', {
        viewModel: function(params) {
            this.answerJSON = params.answer;
            this.part = params.part;
            this.id = params.id;
            this.disable = params.disable;
            this.widget = params.widget || Knockout.computed(function() { 
                var part = Knockout.unwrap(this.part);
                return part && part.input_widget();
            },this);
            this.widget_options = params.widget_options || Knockout.computed(function() { 
                var part = Knockout.unwrap(this.part);
                return part && part.input_options()
            },this);
            this.classes = {'answer-widget':true};
            this.classes['answer-widget-'+this.widget] = true;
            this.events = params.events;
            this.title = params.title || '';
        },
        template: `
            <span data-bind="if: widget">
                <span data-bind="css: classes, component: {name: 'answer-widget-'+Knockout.unwrap(widget), params: {answerJSON: answerJSON, part: part, id: id, disable: disable, options: widget_options, events: events, title: title}}"></span>
            </span>
        `
    });
    Knockout.components.register('answer-widget-string', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            var init = Knockout.unwrap(this.answerJSON);
            this.input = Knockout.observable(init.valid ? init.value || '' : '');
            this.id = params.id;
            this.part = params.part;
            this.disable = params.disable;
            this.options = Knockout.unwrap(params.options);
            this.events = params.events;
            this.title = params.title || '';
            this.allowEmpty = this.options.allowEmpty;
            var lastValue = this.input();
            this.subscriptions = [
                this.answerJSON.subscribe(function(v) {
                    if(v && v.value!=this.input()) {
                        this.input(v.value);
                    }
                },this),
                this.input.subscribe(function(value) {
                    var empty = value=='';
                    var valid = !empty || this.allowEmpty;
                    if(value != lastValue) {
                        this.answerJSON({valid: valid, value: value, empty: empty});
                    }
                    lastValue = value;
                },this)
            ];
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
            }
        },
        template: `
            <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" data-bind="textInput: input, autosize: true, disable: Knockout.unwrap(disable) || Knockout.unwrap(part.revealed) || Knockout.unwrap(part.locked), event: events, attr: {title: title, id: id+'-input'}, part_aria_validity: part.display.hasWarnings, part: part.display"/>
        `
    });
    Knockout.components.register('answer-widget-number', {
        viewModel: function(params) {
            var vm = this;
            this.answerJSON = params.answerJSON;
            this.part = params.part;
            this.id = params.id;
            this.options = Knockout.unwrap(params.options);
            this.allowFractions = this.options.allowFractions || false;
            this.allowedNotationStyles = this.options.allowedNotationStyles || ['plain','en','si-en'];
            this.disable = params.disable;
            this.events = params.events;
            this.title = params.title || '';
            var init = Knockout.unwrap(this.answerJSON);
            /** Clean up a number, to be set as the value for the input widget.
             * It's run through {@link Numbas.math.niceNumber} with the first allowed notation style.
             * `undefined` produces an empty string.
             *
             * @param {number} n
             * @returns {string}
             */
            function cleanNumber(n) {
                if(n===undefined) {
                    return '';
                }
                if(util.isNumber(n, vm.allowFractions, vm.allowedNotationStyles)) {
                    return n + '';
                }
                return Numbas.math.niceNumber(n,{style: vm.allowedNotationStyles[0]}) || '';
            }
            this.input = Knockout.observable(init.valid ? cleanNumber(init.value) : '');
            var lastValue = init.value;
            this.result = Knockout.computed(function() {
                var input = this.input().trim();
                if(input=='') {
                    return {valid:false, empty: true};
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
            this.subscriptions = [
                this.answerJSON.subscribe(function(v) {
                    if(!v || v.value==this.result().value) {
                        return;
                    }
                    var s = cleanNumber(v.value);
                    if(s!=this.input() && v.valid) {
                        this.input(s);
                    }
                },this)
            ];
            var lastValue = this.input();
            this.setAnswerJSON = Knockout.computed(function() {
                if(Knockout.unwrap(this.disable)) {
                    return;
                }
                if(this.input()!=lastValue) {
                    this.answerJSON(this.result());
                    lastValue = this.input();
                }
            },this);
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
                this.result.dispose();
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" data-bind="textInput: input, autosize: true, disable: Knockout.unwrap(disable) || Knockout.unwrap(part.revealed) || Knockout.unwrap(part.locked), event: events, attr: {title: title, id: id+'-input'}, part_aria_validity: part.display.hasWarnings, part: part.display"/>
        `
    });
    Knockout.components.register('answer-widget-jme', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            var p = this.part = params.part;
            var scope = Knockout.unwrap(p).getScope();
            this.id = params.id;
            this.options = Knockout.unwrap(params.options);
            this.showPreview = this.options.showPreview || false;
            this.returnString = this.options.returnString || false;
            this.disable = params.disable;
            this.events = params.events;
            this.title = params.title || '';
            var init = Knockout.unwrap(this.answerJSON);
            /** Clean a supplied expression, to be used as the value for the input widget.
             * If it's a string, leave it alone.
             * If it's a {@link Numbas.jme.tree}, run it through {@link Numbas.jme.display.treeToJME}.
             *
             * @param {string|Numbas.jme.tree} expr
             * @returns {string}
             */
            function cleanExpression(expr) {
                if(typeof(expr)=='string') {
                    return expr;
                }
                try {
                    return Numbas.jme.display.treeToJME(expr,{},scope) || '';
                } catch(e) {
                    throw(e);
                }
            }
            this.input = Knockout.observable(init.valid ? cleanExpression(init.value) : '');
            this.latex = Knockout.computed(function() {
                var input = this.input();
                if(input==='') {
                    return '';
                }
                try {
                    var tex = Numbas.jme.display.exprToLaTeX(input,'',scope);
                    if(tex===undefined) {
                        throw(new Numbas.Error('display.part.jme.error making maths'));
                    }
                }
                catch(e) {
                    return '';
                }
                return tex;
            },this).extend({throttle:100});
            this.result = Knockout.computed(function() {
                var input = this.input().trim();
                if(input=='') {
                    return {valid:false,empty:true};
                }
                if(this.options.returnString) {
                    return {valid: true, value: input};
                } else {
                    try {
                        var expr = Numbas.jme.compile(input);
                        if(!expr) {
                            return {valid: false, empty: true};
                        }
                        var scope = Knockout.unwrap(p).getScope();
                        var ruleset = new Numbas.jme.rules.Ruleset([],{});
                        expr = Numbas.jme.display.simplifyTree(expr, ruleset, scope);
                        return {valid: true, value: expr}
                    } catch(e) {
                        return {valid: false, warnings: [R('answer.jme.invalid expression',{message:e.message})]};
                    }
                }
            },this);
            this.subscriptions = [
                this.answerJSON.subscribe(function(v) {
                    if(!v || v.value==this.result().value) {
                        return;
                    }
                    var s = cleanExpression(v.value);
                    if(s!=this.input() && v.valid) {
                        this.input(s);
                    }
                },this)
            ];
            var lastValue = this.input();
            this.setAnswerJSON = Knockout.computed(function() {
                if(this.input()!=lastValue) {
                    this.answerJSON(this.result());
                    lastValue = this.input();
                }
            },this);
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
                this.latex.dispose();
                this.result.dispose();
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <input 
                type="text"
                autocapitalize="off"
                inputmode="text"
                spellcheck="false"
                data-bind="event: events, textInput: input, autosize: true, disable: Knockout.unwrap(disable) || Knockout.unwrap(part.revealed) || Knockout.unwrap(part.locked), attr: {id: id+'-input', title: title}, part_aria_validity: part.display.hasWarnings, part: part.display"
            />
            <output class="jme-preview" aria-live="polite" data-bind="visible: showPreview && latex(), attr: {for: id+'-input'}, maths: '\\\\displaystyle{{'+latex()+'}}'"></output>
        `
    });
    Knockout.components.register('answer-widget-gapfill', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            var part = params.part;
            this.disable = params.disable;
            this.gaps = Knockout.computed(function() {
                return Knockout.unwrap(part.gaps).map(function(gap) {
                    return {answerJSON: Knockout.observable(), part: gap};
                });
            },this)
            this.setAnswerJSON = Knockout.computed(function() {
                this.answerJSON(this.gaps().map(function(g){return g.answerJSON()}));
            },this);
            this.dispose = function() {
                this.gaps.dispose();
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <table class="table">
                <tbody data-bind="foreach: gaps">
                    <tr>
                        <th><span data-bind="text: part.header"></span></th>
                        <td><div data-bind="component: {name: \'answer-widget\', params: {answer: answerJSON, widget: Knockout.unwrap(part.type).widget, part: part, disable: disable}}"></div></td>
                    </tr>
                </tbody>
            </table>
        `
    });
    Knockout.components.register('answer-widget-matrix', {
        viewModel: function(params) {
            var vm = this;
            this.answerJSON = params.answerJSON;
            this.part = params.part;
            this.id = params.id;
            this.options = Knockout.unwrap(params.options);
            this.disable = params.disable;
            this.title = params.title || '';
            this.events = params.events;
            this.allowFractions = this.options.allowFractions || false;
            this.allowedNotationStyles = this.options.allowedNotationStyles || ['plain','en','si-en'];
            this.allowResize = this.options.allowResize===undefined ? true : this.options.allowResize;
            this.numRows = this.options.numRows || 1;
            this.numColumns = this.options.numColumns || 1;
            this.minColumns = this.options.minColumns || 0;
            this.maxColumns = this.options.maxColumns || 0;
            this.minRows = this.options.minRows || 0;
            this.maxRows = this.options.maxRows || 0;
            this.prefilledCells = this.options.prefilledCells || [];
            this.showBrackets = this.options.showBrackets===undefined ? true : this.options.showBrackets;
            this.rowHeaders = this.options.rowHeaders || [];
            this.columnHeaders = this.options.columnHeaders || [];
            this.parseCells = this.options.parseCells===undefined ? true : this.options.parseCells;
            var init = Knockout.unwrap(this.answerJSON);
            var value = init.value;
            if(value!==undefined) {
                value = value.map(function(r){ return r.map(function(c){ return vm.parseCells ? Numbas.math.niceNumber(c,{style: vm.allowedNotationStyles[0]}) || '' : c }) });
            }
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
            this.input = Knockout.observable(value);
            this.result = Knockout.computed(function() {
                var value = this.input().slice().map(function(r){return r.map(function(cell) { return cell+''; })});
                var cells = Array.prototype.concat.apply([],value);
                var empty = cells.every(function(cell){return !cell.trim()});
                if(empty) {
                    return {valid: false, empty: true};
                }
                if(this.parseCells) {
                    var valid = cells.every(function(cell){ return cell.trim() && util.isNumber(cell,vm.allowFractions,vm.allowedNotationStyles) });
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
            this.subscriptions = [
                this.answerJSON.subscribe(function(v) {
                    if(!v || util.objects_equal(v.value,this.result().value)) {
                        return;
                    }
                    if(v.valid) {
                        this.input(v.value);
                    }
                },this)
            ];
            var lastValue = this.result();
            this.setAnswerJSON = Knockout.computed(function() {
                var result = this.result();
                var valuesSame = 
                    (!result.valid && !lastValue.valid) || 
                    (
                        (result.value!==undefined && lastValue.value!==undefined) && 
                        result.value.length == lastValue.value.length && 
                        result.value.every(function(row,i) { 
                            return row.length==lastValue.value[i].length && row.every(function(cell,j){ 
                                return cell == lastValue.value[i][j]; 
                            }) 
                        })
                    );
                if(!valuesSame || result.valid!=lastValue.valid) {
                    this.answerJSON(result);
                }
                lastValue = result;
            },this);
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
                this.result.dispose();
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <fieldset data-bind="part_aria_validity: part.display.hasWarnings, part: part.display">
                <matrix-input 
                data-bind="attr: {id: id+'-input'}"
                params="value: input, 
                    allowResize: true,
                    disable: disable,
                    allowResize: allowResize,
                    rows: numRows,
                    columns: numColumns,
                    minColumns: minColumns,
                    maxColumns: maxColumns,
                    minRows: minRows,
                    maxRows: maxRows,
                    prefilledCells: prefilledCells,
                    showBrackets: showBrackets,
                    rowHeaders: rowHeaders,
                    columnHeaders: columnHeaders,
                    events: events,
                    title: title
                "></matrix-input>
            </fieldset>
        `
    });


    /** 
     * A generic component for entering a matrix.
     * Shows a grid of text inputs, optionally surrounded by brackets and/or with a control box on top to change the number of rows and columns.
     */
    Knockout.components.register('matrix-input',{
        viewModel: function(params) {
            var vm = this;
            this.allowResize = defaultObservable(params.allowResize,false);
            this.minColumns = defaultObservable(params.minColumns,0);
            this.maxColumns = defaultObservable(params.maxColumns,0);
            this.minRows = defaultObservable(params.minRows,0);
            this.maxRows = defaultObservable(params.maxRows,0);
            this.showBrackets = defaultObservable(params.showBrackets,true);
            this.rowHeaders = defaultObservable(params.rowHeaders,[]);
            this.columnHeaders = defaultObservable(params.columnHeaders,[]);
            this.prefilledCells = defaultObservable(params.prefilledCells,[]);
            this.hasRowHeaders = Knockout.computed(function() {
                return Knockout.unwrap(this.rowHeaders).length>0;
            },this);
            this.hasColumnHeaders = Knockout.computed(function() {
                return Knockout.unwrap(this.columnHeaders).length>0;
            },this);
            this.title = params.title || '';
            var _numRows = typeof params.rows=='function' ? params.rows : Knockout.observable(Knockout.unwrap(params.rows) || 2);
            this.numRows = Knockout.computed({
                read: _numRows,
                write: function(v) {
                    v = parseInt(v);
                    var minRows = Knockout.unwrap(this.minRows);
                    var maxRows = Knockout.unwrap(this.maxRows);
                    v = minRows==0 ? v : Math.max(minRows,v);
                    v = maxRows==0 ? v : Math.min(maxRows,v);
                    if(v!==_numRows() && !Knockout.unwrap(params.disable)) {
                        return _numRows(v);
                    }
                }
            },this);
            if(typeof params.rows=='function') {
                params.rows.subscribe(function(v) { vm.numRows(v); });
            }
            var _numColumns = typeof params.columns=='function' ? params.columns : Knockout.observable(Knockout.unwrap(params.columns) || 2);
            this.numColumns = Knockout.computed({
                read: _numColumns,
                write: function(v) {
                    var minColumns = Knockout.unwrap(this.minColumns);
                    var maxColumns = Knockout.unwrap(this.maxColumns);
                    v = minColumns==0 ? v : Math.max(minColumns,v);
                    v = maxColumns==0 ? v : Math.min(maxColumns,v);
                    if(v!==_numColumns() && !Knockout.unwrap(params.disable)) {
                        return _numColumns(v);
                    }
                }
            },this);
            if(typeof params.columns=='function') {
                params.columns.subscribe(function(v) { vm.numColumns(v); });
            }
            this.value = Knockout.observableArray([]);
            var v = params.value();
            /** Produce the output value for the widget.
             */
            function make_result() {
                var v = vm.value().map(function(row,i){
                    return row().map(function(cell,j){return cell.cell()})
                })
                vm.result(v);
            };
            /**
             * Make a new cell.
             *
             * @param {number|string} c - The value of the cell.
             * @param {number} row
             * @param {number} column
             * @returns {object} - `cell` is an observable holding the cell's value.
             */
            function make_cell(c,row,column) {
                var prefilled = ((Knockout.unwrap(vm.prefilledCells) || [])[row] || [])[column];
                var use_prefilled = prefilled != '' && prefilled !== undefined;
                c = use_prefilled ? prefilled : c;
                var cell = {cell: Knockout.observable(c), prefilled: use_prefilled, label: R('matrix input.cell label',{row:row+1,column:column+1})};
                cell.cell.subscribe(make_result);
                return cell;
            }
            /** Overwrite the value of the widget with the given matrix.
             *
             * @param {matrix} v
             */
            function setMatrix(v) {
                vm.numRows(v.rows || v.length || 1);
                vm.numColumns(v.columns || (v.length ? v[0].length : 1));
                vm.value(v.map(function(r,row){return Knockout.observableArray(r.map(function(c,column){return make_cell(c,row,column)}))}));
            }
            setMatrix(Knockout.unwrap(params.value));
            this.disable = params.disable || false;
            this.keydown = function(obj,e) {
                this.oldPos = e.target.selectionStart;
                return true;
            }
            this.moveArrow = function(obj,e) {
                var cell = $(e.target).parent('td');
                var selectionStart = e.target.selectionStart;
                switch(e.key) {
                case 'ArrowRight':
                    if(e.target.selectionStart == this.oldPos && e.target.selectionStart==e.target.selectionEnd && e.target.selectionEnd==e.target.value.length) {
                        cell.next().find('input').focus();
                    }
                    break;
                case 'ArrowLeft':
                    if(e.target.selectionStart == this.oldPos && e.target.selectionStart==e.target.selectionEnd && e.target.selectionEnd==0) {
                        cell.prev().find('input').focus();
                    }
                    break;
                case 'ArrowUp':
                    var e = cell.parents('tr').prev().children().eq(cell.index()).find('input');
                    if(e.length) {
                        e.focus();
                        e[0].setSelectionRange(this.oldPos,this.oldPos);
                    }
                    break;
                case 'ArrowDown':
                    var e = cell.parents('tr').next().children().eq(cell.index()).find('input');
                    if(e.length) {
                        e.focus();
                        e[0].setSelectionRange(this.oldPos,this.oldPos);
                    }
                    break;
                }
                return false;
            }

            this.events = params.events || {};
            var okeydown = params.events && params.events.keydown;
            this.events.keydown = function(obj,e) {
                vm.keydown(obj,e);
                if(okeydown) {
                    return okeydown(obj,e);
                }
                return true;
            };
            var okeyup = params.events && params.events.keyup;
            this.events.keyup = function(obj,e) {
                vm.moveArrow(obj,e);
                if(okeyup) {
                    return okeyup(obj,e);
                }
                return true;
            };

            this.result = Knockout.observableArray([]);
            make_result();
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
                        value.push(Knockout.observableArray(row));
                    } else {
                        row = value[i]();
                    }
                    row.splice(numColumns,row.length-numColumns);
                    for(var j=0;j<numColumns;j++) {
                        var cell;
                        if(row.length<=j) {
                            row.push(make_cell('',i,j));
                        } else {
                            cell = row[j];
                        }
                    }
                    value[i](row);
                }
                this.value(value.slice());
                make_result();
            }
            this.updateComputed = Knockout.computed(this.update,this);
            this.subscriptions = [
                params.value.subscribe(function(v) {
                    if(v==this.result()) {
                        return;
                    }
                    setMatrix(v);
                },this)
            ];
            var firstGo = true;
            //update value with model
            this.setValue = Knockout.computed(function() {
                var v = this.result();
                if(firstGo) {
                    firstGo = false;
                    return;
                }
                params.value(v);
            },this)
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
                this.updateComputed.dispose();
                this.setValue.dispose();
            }
        },
        template: `
            <div class="matrix-input" data-bind="attr: {title: title}">
                <!-- ko if: allowResize --><div class="matrix-size">
                    <fieldset><legend class="sr-only">${R('matrix input.size control legend')}</legend>
                    <label class="num-rows">${R('matrix input.rows')}: <input type="number" data-bind="event: events, value: numRows, autosize: true, disable: disable, attr: {'min': minRows()==0 ? 1 : minRows(), 'max': maxRows()==0 ? '' : maxRows()}"/></label>
                    <label class="num-columns">${R('matrix input.columns')}: <input type="number" min="1" data-bind="event: events, value: numColumns, autosize: true, disable: disable, attr: {'min': minColumns()==0 ? 1 : minColumns(), 'max': maxColumns()==0 ? '' : maxColumns()}"/></label>
                    </fieldset>
                </div><!-- /ko -->
                <div class="matrix-wrapper">
                    <fieldset><legend class="sr-only" data-bind="text: title"></legend>
                    <span class="left-bracket" data-bind="visible: showBrackets"></span>
                    <table class="matrix">
                        <thead data-bind="if: hasColumnHeaders">
                            <tr>
                                <th data-bind="visible: hasRowHeaders"><span data-bind="latex: rowHeaders()[0]"></span></th>
                                <!-- ko foreach: columnHeaders --><th data-bind="latex: $data"></th><!-- /ko -->
                            </tr>
                        </thead>
                        <tbody data-bind="foreach: value">
                            <tr>
                                <th data-bind="visible: $parent.hasRowHeaders"><span data-bind="latex: $parent.rowHeaders()[$index()+1] || ''"></span></th>
                                <!-- ko foreach: $data -->
                                <td class="cell"><input type="text" autocapitalize="off" inputmode="text" spellcheck="false" data-bind="attr: {'aria-label': label}, textInput: cell, autosize: true, disable: prefilled || $parents[1].disable, event: $parents[1].events"/></td>
                                <!-- /ko -->
                            </tr>
                        </tbody>
                    </table>
                    <span class="right-bracket" data-bind="visible: showBrackets"></span>
                    </fieldset>
                </div>
            </div>
        `
    });

    Knockout.components.register('answer-widget-radios', {
        viewModel: function(params) {
            this.part = params.part;
            this.id = params.id;
            this.disable = params.disable;
            this.options = Knockout.unwrap(params.options);
            this.events = params.events;
            this.choices = Knockout.observableArray(this.options.choices);
            this.answerAsArray = this.options.answerAsArray;
            this.choice = Knockout.observable(null);
            this.answerJSON = params.answerJSON;
            var init = Knockout.unwrap(this.answerJSON);
            if(init.valid) {
                if(this.answerAsArray) {
                    var choice = init.value.findIndex(function(c){ return c[0]; });
                    if(choice>=0) {
                        this.choice(choice);
                    }
                } else {
                    this.choice(init.value);
                }
            }
            this.choiceArray = Knockout.pureComputed(function() {
                var choice = this.choice();
                if(choice===null || choice===undefined) {
                    return null;
                }
                return this.choices().map(function(c,i){ return [i==choice]; })
            },this);
            this.result = Knockout.computed(function() {
                var value = this.answerAsArray ? this.choiceArray() : this.choice();
                var valid = value!==null;
                var empty = value===null;
                return {value: value, valid: valid, empty: empty};
            },this);
            this.subscriptions = [
                this.answerJSON.subscribe(function(v) {
                    if(!v || !v.valid) {
                        this.choice(null);
                        return;
                    }
                    var choice = this.answerAsArray ? v.value.findIndex(function(c){ return c[0]; }) : v.value;
                    if(choice!=this.choice()) {
                        this.choice(choice);
                    }
                },this)
            ];
            var lastValue = this.result();
            this.setAnswerJSON = Knockout.computed(function() {
                var result = this.result();
                var valuesSame = 
                    (!result.valid && !lastValue.valid) ||
                    !lastValue.valid || 
                    (this.answerAsArray ? 
                        result.value.every(function(c,i){ return c[0]==lastValue.value[i][0]; })
                        : result.value==lastValue.value
                    )
                ;
                if(!valuesSame || result.valid!=lastValue.valid) {
                    this.answerJSON(result);
                }
                lastValue = result;
            },this);
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <form>
                <fieldset data-bind="part_aria_validity: part.display.hasWarnings, part: part.display, attr: {id: id+'-input'}">
                    <ul class="list-unstyled" data-bind="foreach: choices">
                        <li>
                            <label>
                                <input type="radio" name="choice" data-bind="checkedValue: $index, checked: $parent.choice, disable: $parent.disable, event: $parent.events"/> 
                                <span data-bind="html: $data"></span>
                            </label>
                        </li>
                    </ul>
                </fieldset>
            </form>
        `
    });
    Knockout.components.register('answer-widget-dropdown', {
        viewModel: function(params) {
            this.part = params.part;
            this.id = params.id;
            this.disable = params.disable;
            this.options = Knockout.unwrap(params.options);
            this.title = params.title || '';
            this.events = params.events;
            this.nonempty_choices = this.options.choices.map(function(c,i){return {label: c, index: i}});
            this.choices = this.nonempty_choices.slice();
            this.choices.splice(0,0,{label: '', index: null});
            this.answerAsArray = this.options.answerAsArray;
            this.choice = Knockout.observable(null);
            this.answerJSON = params.answerJSON;
            var init = Knockout.unwrap(this.answerJSON);
            if(init.valid) {
                if(this.answerAsArray) {
                    var choice = init.value.findIndex(function(c){ return c[0]; });
                    if(choice>=0) {
                        this.choice(this.choices[choice+1]);
                    }
                } else {
                    this.choice(this.choices[init.value+1]);
                }
            }
            this.subscriptions = [
                this.answerJSON.subscribe(function(v) {
                    if(!v || !v.valid) {
                        this.choice(null);
                        return;
                    }
                    var current = this.choice()
                    var choice = this.answerAsArray ? v.value.findIndex(function(c){ return c[0]; }) : v.value;
                    if(!current || choice!=current.index) {
                        this.choice(this.choices[choice+1]);
                    }
                },this)
            ];
            this.setAnswerJSON = Knockout.computed(function() {
                var choice = this.choice();
                if(choice && choice.index!==null) {
                    var value;
                    if(this.answerAsArray) {
                        value = this.choices.slice(1).map(function(c,i){ return [i==choice.index]; });
                    } else {
                        value = choice.index;
                    }
                    this.answerJSON({valid: true, value: value});
                } else {
                    if(this.answerJSON().valid) {
                        this.answerJSON({valid: false, empty: true});
                    }
                }
            },this);
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <select class="multiplechoice dropdownlist screen-only" data-bind="options: choices, optionsText: 'label', value: choice, disable: disable, event: events, attr: {title: title, id: id+'-input'}, part_aria_validity: part.display.hasWarnings, part: part.display"></select>
            <span class="multiplechoice dropdownlist print-only" data-bind="foreach: nonempty_choices">
                <span class="dropdownlist-option" data-bind="css: {'checked': $parent.choice() == $data}, text: label">
            </span>
        `
    });
    Knockout.components.register('answer-widget-checkboxes', {
        viewModel: function(params) {
            var vm = this;
            this.part = params.part;
            this.id = params.id;
            this.disable = params.disable;
            this.options = Knockout.unwrap(params.options);
            this.events = params.events;
            this.answerJSON = params.answerJSON;
            var init = Knockout.unwrap(this.answerJSON);
            this.answerAsArray = this.options.answerAsArray;
            this.choices = Knockout.computed(function() {
                return Knockout.unwrap(this.options.choices).map(function(choice,i) {
                    return {
                        content: choice,
                        ticked: Knockout.observable(init.valid ? vm.answerAsArray ? init.value[i][0] : init.value[i] : false)
                    }
                });
            },this);
            this.subscriptions = [
                this.answerJSON.subscribe(function(v) {
                    var current = this.choices().map(function(c){ return c.ticked(); });
                    if(!v || v.value===undefined) {
                        return;
                    }
                    var value = v.value;
                    if(this.answerAsArray) {
                        value = value.map(function(row){ return row[0]; });
                    }
                    if(current.length==value.length && current.every(function(t,i){ return t==value[i]; })) {
                        return;
                    }
                    this.choices().map(function(c,i) { c.ticked(v.value[i]); });
                }, this)
            ];
            this.make_result = function() {
                var v = this.choices().map(function(c){ return c.ticked() });
                if(this.answerAsArray) {
                    return v.map(function(c){ return [c]; });
                } else {
                    return v;
                }
            }
            var lastValue = this.make_result();
            this.setAnswerJSON = Knockout.computed(function() {
                var value = this.make_result();
                var same = util.objects_equal(value,lastValue);
                if(!same) {
                    this.answerJSON({valid: true, value: value});
                }
                lastValue = value;
            },this);
            this.dispose = function() {
                this.subscriptions.forEach(function(sub) { sub.dispose(); });
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <form>
                <fieldset data-bind="part_aria_validity: part.display.hasWarnings, part: part.display, attr: {id: id+'-input'}">
                    <ul class="list-unstyled" data-bind="foreach: choices">
                        <li>
                            <label>
                                <input type="checkbox" name="choice" data-bind="checked: ticked, disable: $parent.disable, event: $parent.events"/>
                                <span data-bind="html: content"></span>
                            </label>
                        </li>
                    </ul>
                </fieldset>
            </form>
        `
    });
    Knockout.components.register('answer-widget-m_n_x', {
        viewModel: function(params) {
            var vm = this;
            this.part = params.part;
            this.id = params.id;
            this.answerJSON = params.answerJSON;
            this.disable = params.disable;
            this.options = Knockout.unwrap(params.options);
            this.events = params.events;
            this.choices = Knockout.observableArray(this.options.choices);
            this.answers = Knockout.observableArray(this.options.answers);
            this.layout = this.options.layout;
            for(var i=0;i<this.answers().length;i++) {
                this.layout[i] = this.layout[i] || [];
                for(var j=0;j<this.choices().length;j++) {
                    this.layout[i][j] = this.layout[i][j]===undefined || this.layout[i][j];
                }
            }
            switch(this.options.displayType) {
                case 'radiogroup':
                    this.input_type = 'radio';
                    break;
                default:
                    this.input_type = 'checkbox';
            }
            this.ticks = Knockout.computed(function() {
                var choices = this.choices();
                var answers = this.answers();
                var ticks = [];
                for(var i=0;i<choices.length;i++) {
                    var row = [];
                    row.name = 'row-'+i;
                    if(this.input_type=='checkbox') {
                        for(var j=0;j<answers.length;j++) {
                            row.push({ticked: Knockout.observable(false), display: this.layout[j][i]});
                        }
                    } else {
                        var ticked = row.ticked = Knockout.observable(null);
                        for(var j=0;j<answers.length;j++) {
                            row.push({ticked: ticked, display: this.layout[j][i], name: row.name});
                        }
                    }
                    ticks.push(row);
                }
                return ticks;
            },this);
            var init = Knockout.unwrap(this.answerJSON);
            if(init.valid) {
                var ticks = this.ticks();
                for(var i=0;i<ticks.length;i++) {
                    if(this.input_type=='checkbox') {
                        for(var j=0;j<ticks[i].length;j++) {
                            ticks[i][j].ticked(init.value[j] && init.value[j][i]);
                        }
                    } else {
                        if(typeof init.value[i] == "number") {
                            ticks[i].ticked(init.value[i]);
                        } else {
                            for(var j=0;j<ticks[i].length;j++) {
                                if(init.value[j][i]) {
                                    ticks[i].ticked(j);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            this.result = Knockout.computed(function() {
                var ticks;
                if(this.input_type=='checkbox') {
                    ticks = this.ticks().map(function(r){return r.map(function(d){return d.ticked()})});
                } else {
                    ticks = this.ticks().map(function(r){
                        var ticked = r.ticked();
                        return vm.answers().map(function(a,i) {
                            return i==ticked;
                        });
                    });
                }
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
                return {valid: true, value: oticks};
            },this);
            var lastValue = this.result();
            this.setAnswerJSON = Knockout.computed(function() {
                var result = this.result();
                var same = util.objects_equal(result.value,lastValue.value);
                if(!same) {
                    this.answerJSON(result);
                }
                lastValue = result;
            },this);
            this.dispose = function() {
                this.ticks.dispose();
                this.setAnswerJSON.dispose();
            }
        },
        template: `
            <form>
                <fieldset data-bind="part_aria_validity: part.display.hasWarnings, part: part.display, attr: {id: id+'-input'}">
                    <table>
                        <thead>
                            <tr>
                                <td></td>
                                <!-- ko foreach: answers -->
                                <th><span data-bind="html: $data"></span></th>
                                <!-- /ko -->
                            </tr>
                        </thead>
                        <tbody data-bind="foreach: choices">
                            <tr>
                                <th><span data-bind="html: $data"></span></th>
                                <!-- ko foreach: $parent.ticks()[$index()] -->
                                    <td>
                                    <!-- ko if: $parents[1].input_type=="checkbox" -->
                                        <input type="checkbox" data-bind="visible: display, checked: ticked, disable: $parents[1].disable, event: $parents[1].events"/>
                                    <!-- /ko -->
                                    <!-- ko if: $parents[1].input_type=="radio" -->
                                        <input type="radio" data-bind="visible: display, attr: {name: name, value: $index()}, checked: ticked, disable: $parents[1].disable, event: $parents[1].events, checkedValue: $index()"/>
                                    <!-- /ko -->
                                    </td>
                                <!-- /ko -->
                            </tr>
                        </tbody>
                    </table>
                </fieldset>
            </form>
        `
    });

    Knockout.bindingHandlers.custom_answer_widget = {
        init: function(element, valueAccessor, allBindings) {
            var value = valueAccessor();
            var params = value.params;
            var widget_name = value.name;
            if(!custom_widgets[widget_name]) {
                throw(new Numbas.Error('display.answer widget.unknown widget type',{name: widget_name}));
            }
            var answerJSON = params.answerJSON;
            var init_answerJSON = Knockout.unwrap(answerJSON);
            var part = Knockout.unwrap(params.part);
            var disable = params.disable;
            var options = Knockout.unwrap(params.options);
            var events = params.events || {};
            var title = Knockout.unwrap(params.title) || '';

            var lastValue = init_answerJSON;

            /**
             * Set the answerJSON observable with an answer from the widget.
             *
             * @param {Numbas.custom_part_answer} value
             */
            function answer_changed(value) {
                if(lastValue.value != value.value) {
                    if(!ko.unwrap(disable)) {
                        answerJSON(value);
                    }
                    lastValue = value;
                }
            }

            var widget = new custom_widgets[widget_name].widget(element, part, title, events, answer_changed, options);
            widget.setAnswerJSON(init_answerJSON);

            var subscriptions = [
                answerJSON.subscribe(function(v) {
                    if(v && v.value != lastValue.value) {
                        widget.setAnswerJSON(v);
                        lastValue = v;
                    }
                })
            ];
            if(Knockout.isObservable(disable)) {
                subscriptions.push(
                    disable.subscribe(function(v) {
                        if(v) {
                            widget.disable();
                        } else {
                            widget.enable();
                        }
                    },this)
                );
            } else {
                if(disable) {
                    widget.disable();
                }
            }
            Knockout.utils.domNodeDisposal.addDisposeCallback(element, function() {
                subscriptions.forEach(function(sub) { sub.dispose(); });
            });
        },
        update: function() {
        }
    };
});
