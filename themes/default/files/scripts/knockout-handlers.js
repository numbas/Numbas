Numbas.queueScript('knockout-handlers',['display-base'],function() {
    function resizeF() {
        var w = $.textMetrics(this).width;
        $(this).width(Math.max(w+30,60)+'px');
    };

    ko.bindingHandlers.horizontalSlideVisible = {
        init: function(element, valueAccessor) {
            var containerWidth = $(element).width();
            ko.utils.domData.set(element,'originalWidth',containerWidth);
            $(element).css({display:'inline-block', 'overflow-x': 'hidden'});

            var buttonWidth = $(element).children().outerWidth();
            $(element).children().css({width:buttonWidth});
        },
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var originalWidth = ko.utils.domData.get(element,'originalWidth');

            $(element).animate({width: value ? originalWidth : 0}, 1000);
        }
    }

    ko.bindingHandlers.niceNumber = {
        update: function(element,valueAccessor) {
            var n = ko.utils.unwrapObservable(valueAccessor());
            $(element).text(Numbas.math.niceNumber(n));
        }
    }

    ko.bindingHandlers.autosize = {
        init: function(element) {
            //resize text inputs to just fit their contents
            $(element).keyup(resizeF).keydown(resizeF).change(resizeF).each(resizeF);
            resizeF.apply(element);
        },
        update: function(element) {
            resizeF.apply(element);
        }
    }

    ko.bindingHandlers.test = {
        update: function(element,valueAccessor) {
            console.log(ko.utils.unwrapObservable(valueAccessor()));
        }
    }
    ko.bindingHandlers.dom = {
        update: function(element,valueAccessor) {
            var html = ko.utils.unwrapObservable(valueAccessor());
            $(element).children().remove();
            $(element).append(html);
        }
    }

    ko.bindingHandlers.slideVisible = {
        init: function(element,valueAccessor) {
            var v = ko.utils.unwrapObservable(valueAccessor());
            $(element).toggle(v);
        },
            
        update: function(element,valueAccessor) {
            var v = ko.utils.unwrapObservable(valueAccessor());
            if(v)
                $(element).stop().slideDown('fast');
            else
                $(element).stop().slideUp('fast');
        }
    }

    ko.bindingHandlers.fadeVisible = {
        init: function(element,valueAccessor) {
            var v = ko.utils.unwrapObservable(valueAccessor());
            $(element).toggle(v);
        },
            
        update: function(element,valueAccessor) {
            var v = ko.utils.unwrapObservable(valueAccessor());
            if(v)
                $(element).stop().fadeIn();
            else
                $(element).stop().fadeOut();
        }
    }

    ko.bindingHandlers.latex = {
        update: function(element,valueAccessor) {
            ko.bindingHandlers.html.update.apply(this,arguments);
            Numbas.display.typeset(element);
        }
    }

    ko.bindingHandlers.maths = {
        update: function(element,valueAccessor) {
            var val = ko.utils.unwrapObservable(valueAccessor());
            $(element).html('<script type="math/tex">'+val+'</script>');
            Numbas.display.typeset(element);
        }
    }

    ko.bindingHandlers.typeset = {
        update: function(element, valueAccessor) {
            ko.utils.unwrapObservable(valueAccessor());
            Numbas.display.typeset(element);
        }
    }

    ko.bindingHandlers.pulse = {
        init: function() {
        },
        update: function(element,valueAccessor) {
            if(valueAccessor()()) {
                $(element).stop(true).animate({opacity:0},200).animate({opacity:1},200);
            }
        }
    };

    ko.bindingHandlers.carousel = {
        update: function() {

        }
    }

    ko.bindingHandlers.hover = {
        init: function(element,valueAccessor) {
            var val = valueAccessor();
            val(false);
            $(element).hover(
                function() {
                    val(true);
                },
                function() {
                    val(false)
                }
            );
        }
    }

    ko.bindingHandlers.realVisible = ko.bindingHandlers.visible;

    ko.bindingHandlers.visible = {
        init: function(element,valueAccessor) {
            $(element).css('display','');
            ko.utils.domData.set(element,'tabindex',$(element).attr('tabindex'));
        },
        update: function(element,valueAccessor) {
            var val = ko.unwrap(valueAccessor());
            $(element).toggleClass('invisible',!val);
            $(element).attr('disabled',!val);
            if(val) {
                $(element).attr('tabindex',ko.utils.domData.get(element,'tabindex'));
            }
            else {
                $(element).removeAttr('tabindex');
            }
        }
    }

    ko.bindingHandlers.visibleIf = {
        init: function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var val = ko.utils.unwrapObservable(valueAccessor());
            if(val && !ko.utils.domData.get(element,'visible-if-happened')) {
                ko.applyBindingsToDescendants(bindingContext,element);
                ko.utils.domData.set(element,'visible-if-happened',true);
            }
            $(element).toggleClass('invisible',!val);
            return {controlsDescendantBindings: true};
        },
        update:function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var val = ko.utils.unwrapObservable(valueAccessor());
            if(val && !ko.utils.domData.get(element,'visible-if-happened')) {
                ko.applyBindingsToDescendants(bindingContext,element);
                ko.utils.domData.set(element,'visible-if-happened',true);
            }
            $(element).toggleClass('invisible',!val);
        }
    }

    ko.bindingHandlers.stopbinding = {
        init: function() {
            return {controlsDescendantBindings: true};
        }
    }

    ko.bindingHandlers.reorder_table = {
        // reorder the rows and columns of a table, including the header
        // value is an object {rows, columns, leaders}
        // rows and columns are permutations
        // leaders is the number of columns at the start of each row to ignore (so column headers aren't moved)
        init: function(element, valueAccessor) {
            var value = ko.unwrap(valueAccessor());
            var row_order = value.rows;
            var column_order = value.columns;
            var leaders = value.leaders || 0;
            Array.prototype.forEach.call(element.querySelectorAll('tr'),function(r) {
                var columns = Array.prototype.slice.call(r.querySelectorAll('td,th'),leaders);
                for(var i=0;i<column_order.length;i++) {
                    r.appendChild(columns[column_order[i]]);
                }
            });
            Array.prototype.forEach.call(element.querySelectorAll('tbody'),function(body) {
                var rows = Array.prototype.slice.call(body.querySelectorAll('tr'));
                for(var i=0;i<row_order.length;i++) {
                    body.appendChild(rows[row_order[i]]);
                }
            })
        }
    }

    ko.bindingHandlers.reorder_list = {
        init: function(element, valueAccessor) {
            var value = ko.unwrap(valueAccessor());
            var order = value.order;
            var leaders = value.leaders || 0;
            var items = Array.prototype.slice.call(element.children, leaders);
            for(var i=0;i<order.length;i++) {
                element.appendChild(items[order[i]]);
            }
        }
    }

    ko.components.register('answer-widget', {
        viewModel: function(params) {
            this.answerJSON = params.answer;
            this.part = params.part;
            this.partDisplay = params.partDisplay;
            this.disable = params.disable;
            this.widget = params.widget;
        },
        template: '\
        <span data-bind="component: {name: \'answer-widget-\'+widget, params: {answerJSON: answerJSON, part: part, disable: disable}}"></span>\
        '
    });

    ko.components.register('answer-widget-string', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            this.input = ko.observable(ko.unwrap(this.answerJSON() || ''));
            this.part = params.part;
            this.disable = params.disable;
            ko.computed(function() {
                this.answerJSON(this.input());
            },this);
        },
        template: '\
            <input type="text" data-bind="textInput: input, autosize: true, disable: ko.unwrap(disable) || ko.unwrap(part.revealed)">\
        '
    });

    ko.components.register('answer-widget-number', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            this.input = ko.observable(ko.unwrap(this.answerJSON() || ''));
            ko.computed(function() {
                this.answerJSON(this.input());
            },this);
        },
        template: '\
            <input type="text" data-bind="textInput: input, autosize: true, disable: ko.unwrap(disable) || ko.unwrap(part.revealed)">\
        '
    });

    ko.components.register('answer-widget-jme', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            this.input = ko.observable(ko.unwrap(this.answerJSON() || ''));
            ko.computed(function() {
                this.answerJSON(this.input());
            },this);
        },
        template: '\
            <input type="text" data-bind="textInput: input, autosize: true, disable: ko.unwrap(disable) || ko.unwrap(part.revealed)">\
            <span class="preview" data-bind="JME: input"></span>\
        '
    });

    ko.components.register('answer-widget-gapfill', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            var part = params.part;
            this.gaps = ko.computed(function() {
                return part.gaps().map(function(gap) {
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
                        <td><div data-bind="component: {name: \'answer-widget\', params: {answer: answerJSON, widget: part.type().widget, part: part}}"></div></td>\
                    </tr>\
                </tbody>\
            </table>\
        '
    });

    ko.components.register('answer-widget-matrix', {
        viewModel: function(params) {
            this.answerJSON = params.answerJSON;
            this.input = ko.observable([]);
            ko.computed(function() {
                var value = this.input();
                var numRows = value.length;
                var numColumns = numRows>0 ? value[0].length : 0;
                this.answerJSON({rows: numRows, columns: numColumns, matrix: value});
            },this);
        },
        template: '\
            <matrix-input params="value: input, allowResize: true"></matrix-input>\
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
            this.choice = ko.observable(0);
            this.answerJSON = params.answerJSON;
            ko.computed(function() {
                this.answerJSON(this.choice());
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

    ko.components.register('answer-widget-checkboxes', {
        viewModel: function(params) {
            this.part = params.part;
            this.choices = ko.observableArray(this.part.input_options.choices.map(function(choice) {
                return {
                    content: choice,
                    ticked: ko.observable(false)
                }
            }));

            this.answerJSON = params.answerJSON;
            ko.computed(function() {
                this.answerJSON(this.choices().map(function(c){return c.ticked()}));
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
