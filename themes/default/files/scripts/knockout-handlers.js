Numbas.queueScript('knockout-handlers',['display-base','answer-widgets'],function() {
    Knockout.onError = function(err) {
        Numbas.display.die(err);
    };
    function resizeF() {
        var w = $.textMetrics(this).width;
        $(this).width(Math.max(w+30,60)+'px');
    };
    Knockout.bindingHandlers.horizontalSlideVisible = {
        init: function(element, valueAccessor) {
            var containerWidth = $(element).width();
            Knockout.utils.domData.set(element,'originalWidth',containerWidth);
            $(element).css({display:'inline-block', 'overflow-x': 'hidden'});
            var buttonWidth = $(element).children().outerWidth();
            $(element).children().css({width:buttonWidth});
        },
        update: function(element, valueAccessor) {
            var value = Knockout.utils.unwrapObservable(valueAccessor());
            var originalWidth = Knockout.utils.domData.get(element,'originalWidth');
            $(element).animate({width: value ? originalWidth : 0}, 1000);
        }
    }
    Knockout.bindingHandlers.niceNumber = {
        update: function(element,valueAccessor) {
            var n = Knockout.utils.unwrapObservable(valueAccessor());
            $(element).text(Numbas.math.niceNumber(n));
        }
    }
    Knockout.bindingHandlers.autosize = {
        init: function(element) {
            //resize text inputs to just fit their contents
            $(element).keyup(resizeF).keydown(resizeF).change(resizeF).each(resizeF);
            resizeF.apply(element);
        },
        update: function(element) {
            resizeF.apply(element);
        }
    }
    Knockout.bindingHandlers.test = {
        update: function(element,valueAccessor) {
            console.log(Knockout.utils.unwrapObservable(valueAccessor()));
        }
    }
    Knockout.bindingHandlers.dom = {
        update: function(element,valueAccessor) {
            var html = Knockout.utils.unwrapObservable(valueAccessor());
            $(element).children().remove();
            $(element).append(html);
        }
    }
    Knockout.bindingHandlers.slideVisible = {
        init: function(element,valueAccessor) {
            var v = Knockout.utils.unwrapObservable(valueAccessor());
            $(element).toggle(v);
        },
        update: function(element,valueAccessor) {
            var v = Knockout.utils.unwrapObservable(valueAccessor());
            if(v)
                $(element).stop().slideDown('fast');
            else
                $(element).stop().slideUp('fast');
        }
    }
    Knockout.bindingHandlers.fadeVisible = {
        init: function(element,valueAccessor) {
            var v = Knockout.utils.unwrapObservable(valueAccessor());
            $(element).toggle(v);
        },
        update: function(element,valueAccessor) {
            var v = Knockout.utils.unwrapObservable(valueAccessor());
            if(v)
                $(element).stop().fadeIn();
            else
                $(element).stop().fadeOut();
        }
    }
    Knockout.bindingHandlers.latex = {
        update: function(element,valueAccessor) {
            Knockout.bindingHandlers.html.update.apply(this,arguments);
            Numbas.display.typeset(element);
        }
    }
    Knockout.bindingHandlers.maths = {
        update: function(element,valueAccessor) {
            var val = Knockout.utils.unwrapObservable(valueAccessor());
            $(element).html('<script type="math/tex">'+val+'</script>');
            Numbas.display.typeset(element);
        }
    }
    Knockout.bindingHandlers.typeset = {
        update: function(element, valueAccessor) {
            Knockout.utils.unwrapObservable(valueAccessor());
            Numbas.display.typeset(element);
        }
    }
    Knockout.bindingHandlers.pulse = {
        init: function() {
        },
        update: function(element,valueAccessor) {
            if(valueAccessor()()) {
                $(element).stop(true).animate({opacity:0},200).animate({opacity:1},200);
            }
        }
    };
    Knockout.bindingHandlers.carousel = {
        update: function() {
        }
    }
    Knockout.bindingHandlers.hover = {
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
    Knockout.bindingHandlers.realVisible = Knockout.bindingHandlers.visible;
    Knockout.bindingHandlers.visible = {
        init: function(element,valueAccessor) {
            $(element).css('display','');
            Knockout.utils.domData.set(element,'tabindex',$(element).attr('tabindex'));
        },
        update: function(element,valueAccessor) {
            var val = Knockout.unwrap(valueAccessor());
            $(element).toggleClass('invisible',!val);
            $(element).attr('disabled',!val);
            if(val) {
                $(element).attr('tabindex',Knockout.utils.domData.get(element,'tabindex'));
            }
            else {
                $(element).removeAttr('tabindex');
            }
        }
    }
    Knockout.bindingHandlers.visibleIf = {
        init: function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var val = Knockout.utils.unwrapObservable(valueAccessor());
            if(val && !Knockout.utils.domData.get(element,'visible-if-happened')) {
                Knockout.applyBindingsToDescendants(bindingContext,element);
                Knockout.utils.domData.set(element,'visible-if-happened',true);
            }
            $(element).toggleClass('invisible',!val);
            return {controlsDescendantBindings: true};
        },
        update:function(element,valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var val = Knockout.utils.unwrapObservable(valueAccessor());
            if(val && !Knockout.utils.domData.get(element,'visible-if-happened')) {
                Knockout.applyBindingsToDescendants(bindingContext,element);
                Knockout.utils.domData.set(element,'visible-if-happened',true);
            }
            $(element).toggleClass('invisible',!val);
        }
    }
    Knockout.bindingHandlers.stopbinding = {
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
});