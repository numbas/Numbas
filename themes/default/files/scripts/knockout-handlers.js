Numbas.queueScript('knockout-handlers',['display-util', 'display-base', 'answer-widgets'],function() {
    Knockout.onError = function(err) {
        Numbas.display.die(err);
    };

    function resizeF(element) {
        var w = Numbas.display_util.measureText(element).width;
        element.style['width'] = Math.max(w+30,60)+'px';
    };

    Knockout.bindingHandlers.niceNumber = {
        update: function(element,valueAccessor) {
            var n = Knockout.utils.unwrapObservable(valueAccessor());
            element.textContent = Numbas.math.niceNumber(n);
        }
    }
    Knockout.bindingHandlers.percentage = {
        update: function(element,valueAccessor) {
            var n = Knockout.utils.unwrapObservable(valueAccessor());
            element.textContent = Numbas.math.niceNumber(n*100, {precisionType: 'dp', precision: 1})+'%';
        }
    }

    /** Set the text content and `datetime` attribute of a `<time>` tag based on the given Date object.
     *
     * @see Numbas.display_util.duration_observable
     */
    Knockout.bindingHandlers.datetime = {
        update: function(element,valueAccessor) {
            var time = Knockout.unwrap(valueAccessor());
            element.textContent = Numbas.util.formatTime(time);
            element.setAttribute('datetime', time.toISOString());
        }
    }

    /** Set the text content and `datetime` attribute of a `<time>` tag based on the given duration, a `Numbas.display_util.duration_observable` object.
     *
     * @see Numbas.display_util.duration_observable
     */
    Knockout.bindingHandlers.duration = {
        update: function(element,valueAccessor) {
            var obs = valueAccessor();
            element.textContent = obs.display();
            element.setAttribute('datetime', obs.machine());
        }
    }

    Knockout.bindingHandlers.autosize = {
        init: function(element) {
            //resize text inputs to just fit their contents
            element.addEventListener('keyup', () => resizeF(element));
            element.addEventListener('keydown', () => resizeF(element));
            element.addEventListener('change', () => resizeF(element));
            element.addEventListener('input', () => resizeF(element));
            resizeF(element);
        },
        update: function(element, valueAccessor, allBindings) {
            var textInput = allBindings.get('textInput');
            if(textInput) {
                textInput();
            }
            var value = allBindings.get('value');
            if(value) {
                value();
            }
            resizeF(element);
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
            element.innerHTML = '';
            if(typeof html == 'string') {
                element.innerHTML = html;
            } else {
                element.append(html);
            }
        }
    }
    Knockout.bindingHandlers.latex = {
        update: function(element,valueAccessor) {
            var value = Knockout.unwrap(valueAccessor());
            Knockout.bindingHandlers.html.update.apply(this,arguments);
            
            if(value && value.toString().trim()) {
                Numbas.display.typeset(element);
            }
        }
    }

    /** 
     * Render a TeX expression inside this element.
     * The element is hidden while MathJax typesets the TeX.
     */
    Knockout.bindingHandlers.maths = {
        update: function(element,valueAccessor) {
            var val = Knockout.utils.unwrapObservable(valueAccessor());
            const hidden = element.hidden;
            element.hidden = true;
            element.innerHTML = '\\('+val+'\\)';
            Numbas.display.typeset(element, () => { element.hidden = hidden; });
        }
    }
    Knockout.bindingHandlers.jmescope = {
        update: function(element, valueAccessor) {
            Numbas.display_util.set_jme_scope(element, Knockout.unwrap(valueAccessor()));
        }
    };
    Knockout.bindingHandlers.typeset = {
        update: function(element, valueAccessor) {
            Knockout.utils.unwrapObservable(valueAccessor());
            Numbas.display.typeset(element);
        }
    }

    Knockout.bindingHandlers.realVisible = Knockout.bindingHandlers.visible;

    Knockout.bindingHandlers.visible = {
        init: function(element,valueAccessor) {
            element.style.display = '';
            Knockout.utils.domData.set(element,'tabindex',element.getAttribute('tabindex'));
        },
        update: function(element,valueAccessor) {
            var val = Knockout.unwrap(valueAccessor());
            element.classList.toggle('invisible', !val);
            !val ? element.setAttribute('disabled',true) : element.removeAttribute('disabled');
            if(val) {
                const tabindex = Knockout.utils.domData.get(element,'tabindex');
                if(tabindex !== null) {
                    element.setAttribute('tabindex', tabindex);
                }
            }
            else {
                element.removeAttribute('tabindex');
            }
        }
    }
    Knockout.bindingHandlers.visibleIf = Knockout.bindingHandlers.visible; // removed because it didn't work, but aliased to `visible` for backwards compatibility

    Knockout.bindingHandlers.promise = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var promise = Knockout.unwrap(valueAccessor());
            promise.then(function(html) {
                element.appendChild(html);
                Knockout.applyBindingsToDescendants(bindingContext,element);
            });
            return {controlsDescendantBindings: true};
        }
    }
    Knockout.bindingHandlers.reorder_table = {
        // reorder the rows and columns of a table, including the header
        // value is an object {rows, columns, leaders}
        // rows and columns are permutations
        // leaders is the number of columns at the start of each row to ignore (so column headers aren't moved)
        init: function(element, valueAccessor) {
            var value = Knockout.unwrap(valueAccessor());
            var row_order = value.rows;
            var column_order = value.columns;
            var leaders = value.leaders || 0;
            Array.prototype.forEach.call(element.querySelectorAll('tr:not([data-shuffle="no"])'),function(r) {
                var columns = Array.prototype.slice.call(r.querySelectorAll(':is(td,th):not([data-shuffle="no"])'),leaders);
                for(var i=0;i<column_order.length;i++) {
                    r.appendChild(columns[column_order[i]]);
                }
            });
            Array.prototype.forEach.call(element.querySelectorAll('tbody'),function(body) {
                var rows = Array.prototype.slice.call(body.querySelectorAll('tr'));
                for(var i=0;i<row_order.length;i++) {
                    body.appendChild(rows[row_order[i]]);
                }
            });
            const choice_header = element.querySelector('.choice-heading');
            if(choice_header) {
                const first_row = element.querySelector('tbody tr:first-child');
                first_row.insertBefore(choice_header, first_row.firstChild);
            }
        }
    }
    Knockout.bindingHandlers.reorder_list = {
        init: function(element, valueAccessor) {
            var value = Knockout.unwrap(valueAccessor());
            var order = value.order;
            var leaders = value.leaders || 0;
            var items = Array.prototype.slice.call(element.children, leaders);
            for(var i=0;i<order.length;i++) {
                element.appendChild(items[order[i]]);
            }
        }
    }


    Knockout.bindingHandlers.treeView = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var trees = (bindingContext.$trees || []).slice();
            trees.push({
                element: element,
                context: bindingContext
            })
            var innerBindingContext = bindingContext.extend(valueAccessor).extend({
                '$trees': trees
            });
          
            var options = {
              templateEngine: Knockout.nativeTemplateEngine.instance
            };

            element.addEventListener('keydown', e => {
                if(e.target == element) {
                    return;
                }

                const focused = document.activeElement;

                let el = focused;
                while(el.parentElement && el.parentElement.role != 'group' && el.parentElement.role != 'tree') {
                    el = el.parentElement;
                }
                if(!el.parentElement) {
                    return;
                }
                const all_items = Array.from(element.querySelectorAll('[role="treeitem"]'));
                const siblings = Array.from(el.parentElement.children);
                const i = siblings.indexOf(el);

                function focus_item(j) {
                    if(el.parentElement.role == 'tree') {
                        return;
                    }
                    const item = siblings[j];
                    if(!item) {
                        return;
                    }
                    item.querySelector('[role="treeitem"]').focus();
                }

                const handlers = {
                    'ArrowLeft': () => {
                        let el = focused;
                        while(el && el.role!='group') {
                            el = el.parentElement;
                        };
                        if(!el) {
                            return;
                        }
                        const item = el.parentElement.querySelector('[role="treeitem"]');
                        if(!item) {
                            return;
                        }
                        item.focus();
                    },
                    'ArrowRight': () => {
                        let el = focused;
                        let group;
                        while(el && !group) {
                            el = el.parentElement;
                            group = el.querySelector('[role="group"]');
                        }
                        if(!group) {
                            return;
                        }
                        const first_child = group.querySelector('[role="group"] [role="treeitem"]');
                        if(!first_child) {
                            return;
                        }
                        first_child.focus();
                    },
                    'ArrowUp': () => {
                        focus_item(i-1);
                    },
                    'ArrowDown': () => {
                        focus_item(i+1);
                    },
                    'Home': () => {
                        const first_item = element.querySelector('[role="treeitem"]');
                        if(!first_item) {
                            return;
                        }
                        first_item.focus();
                    },
                    'End': () => {
                        const last_item = all_items[all_items.length-1];
                        if(!last_item) {
                            return;
                        }
                        last_item.focus();
                    },
                    'Backspace': () => {
                        search = search.slice(0, search.length-1);
                    }
                }
                if(handlers[e.key]) {
                    handlers[e.key]();
                    e.preventDefault();
                } else if(e.key.length==1) {
                    let j = all_items.indexOf(focused);
                    const cycled_items = all_items.slice(j+1).concat(all_items.slice(0,j));
                    const search = e.key.toLowerCase();
                    let minpos = Infinity;
                    let hits = [];
                    const item = cycled_items.find(item => item.textContent.toLowerCase().includes(search));
                    if(item) {
                        item.focus();
                        e.preventDefault();
                    }
                }
            });
          
            return Knockout.bindingHandlers.template.init(element, function() { return options }, allBindings, viewModel, innerBindingContext);

        },
        'update': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var v = Knockout.unwrap(valueAccessor());
            if(v===undefined) {
                return;
            }
            var trees = (bindingContext.$trees || []).slice();
            var innerBindingContext = bindingContext.createChildContext(valueAccessor).extend({
                '$trees': trees,
            });
            trees.push({
                element: element,
                context: bindingContext.extend({'$trees':trees})
            })
            var options = {
                templateEngine: Knockout.nativeTemplateEngine.instance
            }
            return Knockout.bindingHandlers.template.update(element, function() { return options }, allBindings, viewModel, innerBindingContext)
        }
    };

    Knockout.bindingHandlers.treeNode = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            return {controlsDescendantBindings: true};
        },
      
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var trees = bindingContext.$trees;
            var tree = trees[trees.length - 1];
            var innerBindingContext = tree.context.createChildContext(valueAccessor);
            var options = {
              name: tree.element,
                templateEngine: Knockout.nativeTemplateEngine.instance
            }
            return Knockout.bindingHandlers.template.update(element, function() { return options }, allBindings, viewModel, innerBindingContext)
        }
    }

    Knockout.bindingHandlers.download_file = {
        update: function(element, valueAccessor) {
            const file = Knockout.unwrap(valueAccessor());
            try {
                URL.revokeObjectURL(element.getAttribute('href'));
            } catch(e) {
            }
            element.setAttribute('href', window.URL.createObjectURL(file));
            element.setAttribute('download', file.name);
        }
    }

    Knockout.bindingHandlers.part_aria_validity = {
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            const pd = Knockout.unwrap(allBindings().part);
            const valid = Knockout.unwrap(valueAccessor());
            if(valid) {
                element.setAttribute('aria-invalid',true);
                element.setAttribute('aria-errormessage', pd.part.full_path+'-warnings');
            } else {
                element.removeAttribute('aria-invalid');
                element.removeAttribute('aria-errormessage');
            }
        }
    }

    /** Bind the `open` attribute of a `<details>` element.
     */
    Knockout.bindingHandlers.open = {
        init: function(element, valueAccessor) {
            const value = valueAccessor();
            if(typeof value == 'function') {
                element.addEventListener('toggle', function(e) {
                    value(element.open);
                });
            }
        },

        update: function(element, valueAccessor) {
            const open = Knockout.unwrap(valueAccessor());
            element.open = open;
        }
    }

    Knockout.bindingHandlers.modal = {
        init: function(element, valueAccessor) {
            const options = valueAccessor();

            element.addEventListener('close', e => {
                const submit = Knockout.unwrap(options.submit);
                const cancel = Knockout.unwrap(options.cancel);
                element.close();
                if(element.returnValue != 'cancel') {
                    if(submit) {
                        submit();
                    }
                } else {
                    if(cancel) {
                        cancel();
                    }
                }
            });
        },
        update: function(element, valueAccessor) {
            const {show} = Knockout.unwrap(valueAccessor());
            if(show === undefined) {
                return;
            }
            if(show) {
                element.showModal();
            } else {
                element.close();
            }
        }
    };

    Knockout.bindingHandlers.tablist = {
        init: function(element, valueAccessor) {

            let search = '';

            element.addEventListener('keydown', e => {
                if(e.target==element) {
                    return;
                }
                const tabs = Array.from(element.querySelectorAll('[role="tab"]'));
                const i = tabs.indexOf(e.target);
                const cycled_tabs = tabs.slice(i+1).concat(tabs.slice(0,i+1));

                if(!tabs.length) {
                    return;
                }

                function focus_tab(j) {
                    tabs[j].focus();
                    search = '';
                    e.preventDefault();
                }

                function search_for_tab(n) {
                    const tab = cycled_tabs.find(tab => tab.dataset.name && tab.dataset.name.toLowerCase().startsWith(search)) || cycled_tabs.find(tab => tab.dataset.name && tab.dataset.name.toLowerCase().includes(search));
                    if(tab) {
                        tab.focus();
                    }
                    return tab;
                }

                const handlers = {
                    'ArrowUp': () => {
                        focus_tab((i + tabs.length - 1) % tabs.length);
                    },
                    'ArrowDown': () => {
                        focus_tab((i + 1) % tabs.length);
                    },
                    'Home': () => {
                        focus_tab(0);
                    },
                    'End': () => {
                        focus_tab(tabs.length-1);
                    },
                    ' ': () => {
                        e.target.dispatchEvent(new Event('click'));
                        e.preventDefault();
                    }
                };

                if(handlers[e.key]) {
                    handlers[e.key]();
                } else if(e.key.length==1) {
                    e.preventDefault();
                    search += e.key;
                    while(search.length) {
                        const moved = search_for_tab();
                        if(moved) {
                            break;
                        }
                        search = search.slice(1);
                    }
                }
            });
        }
    }

});
