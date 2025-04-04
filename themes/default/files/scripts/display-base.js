Numbas.queueScript('display-base',['display-util', 'display-color', 'controls','math','xml','util','timing','jme','jme-display'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var display_util = Numbas.display_util;
var display_color = Numbas.display_color;
/** @namespace Numbas.display */
var display = Numbas.display = /** @lends Numbas.display */ {
    /** Update the progress bar when loading.
     */
    showLoadProgress: function()
    {
        var p = 100 * Numbas.schedule.completed / Numbas.schedule.total;
        document.querySelector('#loading progress').value = p;
    },
    /** Initialise the display. Called when the exam has loaded.
     */
    init: function() {
        document.body.classList.add('loaded');
        document.getElementById('everything').removeAttribute('style');

        // bind buttons in the modals

        for(let b of document.querySelectorAll('button[aria-controls="navMenu"]')) {
            b.addEventListener('click', function() {
                document.body.classList.toggle('show-sidebar');
            });
        }

        var lightbox = document.querySelector('#lightbox');
        lightbox.addEventListener('click', () => Numbas.display.hide_lightbox());
        document.body.addEventListener('keyup',function() {
            if(lightbox.classList.contains('shown')) {
                Numbas.display.hide_lightbox();
            }
        });

        const color_groups = [
            'background',
            'text',
            'main',
            'primary',
            'link',
            'success',
            'info',
            'warning',
            'danger',
            'muted',
            'highlight',
        ];

        display.setJMEScope(document.getElementById('infoDisplay'), Numbas.exam.scope);
        display.setJMEScope(document.getElementById('diagnostic-feedback'), Numbas.exam.scope);

        var body_style = getComputedStyle(document.body);

        /** Make a Knockout observable whose initial value is taken from the CSS custom property with the given name.
         *
         * @param {string} property_name
         */
        function styleObservable(property_name) {
            const value = body_style.getPropertyValue(property_name)
            const obs = Knockout.observable();
            obs.initial_value = value;
            return obs;
        }

        const forced_colors = window.matchMedia('(forced-colors: active)');

        var vm = this.viewModel = {
            exam: Knockout.observable(Numbas.exam.display),
            style: {
                '--text-size': styleObservable('--text-size'),
                '--spacing-scale': styleObservable('--spacing-scale'),
                '--main-font': styleObservable('--main-font'),
            },
            staged_style: {
                '--text-size': styleObservable('--text-size'),
                '--spacing-scale': styleObservable('--spacing-scale'),
                '--main-font': styleObservable('--main-font'),
            },
            forced_colors: Knockout.observable(forced_colors.matches),
            color_scheme: Knockout.observable('automatic'),
            saveStyle: this.saveStyle,
            modal: this.modal,
            closeModal: function(_, e) {
                let el = e.target;
                while(el && el.tagName != 'DIALOG') {
                    el = el.parentElement;
                }
                if(el) {
                    el.close();
                }
            }
        };
        vm.color_scheme.initial_value = vm.color_scheme();

        forced_colors.addEventListener('change', () => {
            vm.forced_colors(forced_colors.matches);
        });

        vm.using_custom_color_scheme = Knockout.pureComputed(function() {
            return vm.color_scheme() == 'custom';
        });

        
        color_groups.forEach(name => {
            vm.style[`--custom-${name}-color`] = styleObservable(`--light-${name}-color`);
        }),

        vm.css = Knockout.pureComputed(function() {
            var exam = vm.exam();
            var navigateMode = exam.exam.settings.navigateMode;
            var classes = {
                'show-nav': exam.viewType()=='question' || (exam.viewType() == 'infopage' && exam.infoPage()=='introduction'), 
                'show-sidebar': navigateMode=='sequence' || navigateMode=='diagnostic',
                'no-printing': !exam.allowPrinting(),
                'info-page': exam.viewType() == 'infopage',
                'no-printing-questions': !exam.exam.settings.resultsprintquestions,
                'no-printing-advice': !exam.exam.settings.resultsprintadvice,
            }
            return classes;
        });

        vm.attr = Knockout.pureComputed(() => {
            var exam = vm.exam();
            return {
                'data-navigatemode': exam.exam.settings.navigateMode,
            }
        });

        vm.resetStyle = function() {
            Object.values(vm.style).forEach(obs => {
                if(obs.initial_value !== undefined) {
                    obs(obs.initial_value);
                }
            });
            Object.values(vm.staged_style).forEach(obs => {
                if(obs.initial_value !== undefined) {
                    obs(obs.initial_value);
                }
            });
            vm.color_scheme(vm.color_scheme.initial_value);
        }

        vm.resetStyle();

        try {
            var saved_style_options = JSON.parse(localStorage.getItem(this.style_options_localstorage_key)) || {};
            if(saved_style_options.color_scheme) {
                vm.color_scheme(saved_style_options.color_scheme);
            }
            for(var x in this.viewModel.style) {
                if(x in saved_style_options) {
                    this.viewModel.style[x](saved_style_options[x]);
                }
            }
            for(var x in this.viewModel.staged_style) {
                this.viewModel.staged_style[x](this.viewModel.style[x]());
            }
        } catch(e) {
            console.error(e);
        }

        Knockout.computed(function() {
            const root = document.documentElement;

            var css_vars = {
                '--text-size': parseFloat(vm.style['--text-size']()),
                '--spacing-scale': parseFloat(vm.style['--spacing-scale']()),
                '--staged-text-size': parseFloat(vm.staged_style['--text-size']()),
                '--staged-spacing-scale': parseFloat(vm.staged_style['--spacing-scale']()),
                '--main-font': vm.style['--main-font'](),
                '--staged-main-font': vm.staged_style['--main-font'](),
            };

            const color_scheme = vm.color_scheme();
            if(color_scheme == 'automatic') {
                delete root.dataset.prefersColorScheme;
            } else {
                root.dataset.prefersColorScheme = color_scheme;
            }

            for(var x in css_vars) {
                root.style.setProperty(x,css_vars[x]);
            }

            const custom_bg = vm.style['--custom-background-color']();
            const custom_text = vm.style['--custom-text-color']();
            const target_contrast = display_color.dpsContrast(display_color.parseRGB(custom_bg), display_color.parseRGB(custom_text));

            color_groups.forEach(name => {
                const property_name = `--custom-${name}-color`;
                const col = vm.style[property_name]();
                const rgb = display_color.parseRGB(col);
                root.style.setProperty(property_name, col);
                const text = display_color.text_for(rgb, target_contrast);
                root.style.setProperty(`--custom-${name}-text-color`, text);
                if(name == 'background') {
                    display_color.is_dark(rgb) ? root.classList.add('dark-background') : root.classList.remove('dark-background');
                }
            });

            var options = {
                color_scheme
            };
            for(var x in vm.style) {
                options[x] = vm.style[x]();
            }
            try {
                localStorage.setItem(this.style_options_localstorage_key,JSON.stringify(options));
            } catch(e) {
            }
        },this);
        
        this.setExam(Numbas.exam);
        Knockout.applyBindings(this.viewModel);
    },
    style_options_localstorage_key: 'numbas-style-options',

    /** Show the lightbox.
     *
     * @param {Element} original - The original image element which is going to be copied into the lightbox.
     */
    show_lightbox: function(original) {
        lightbox.showModal();
        display.lightbox_original_element = original;
    },

    /** Hide the lightbox.
     *
     */
    hide_lightbox: function() {
        lightbox.close();
        lightbox.innerHTML = '';
        display.lightbox_pressing_state = 'none';
        if(display.lightbox_original_element) {
            display.lightbox_original_element.querySelector('button').focus();
        }
    },

    setExam: function(exam) {
        this.viewModel.exam(exam.display);
        for(var i=0;i<exam.questionList.length;i++) {
            exam.display.applyQuestionBindings(exam.questionList[i]);
        }
        exam.display.questions().map(function(q) {
            q.question.signals.on('HTMLAttached',function() {
                q.init();
            });
        });
        Numbas.signals.trigger('display ready');
    },

    //alert / confirm boxes
    //
    /** Callback functions for the modals.
     *
     * @type {Object<Function>}
     */
    modal: {
        ok: Knockout.observable(function() {}),
        cancel: Knockout.observable(function() {}),
    },
    /** Show an alert dialog.
     *
     * @param {string} msg - message to show the user
     * @param {Function} fnOK - callback when OK is clicked
     */
    showAlert: function(msg,fnOK) {
        this.modal.ok(fnOK);
        document.getElementById('alert-modal-body').innerHTML = msg;
        document.getElementById('alert-modal').showModal();
    },

    /** Show the modal with styling options.
     */
    showStyleModal: function() {
        document.getElementById('style-modal').showModal();
    },

    /** Save the changes to the style options.
     */
    saveStyle: function() {
        Object.entries(display.viewModel.staged_style).forEach(([k,obs]) => {
            display.viewModel.style[k](obs());
        });
        document.getElementById('style-modal').close();
    },

    /** Show a confirmation dialog box.
     *
     * @param {string} msg - message to show the user
     * @param {Function} fnOK - callback if OK is clicked
     * @param {Function} fnCancel - callback if cancelled
     */
    showConfirm: function(msg,fnOK,fnCancel) {
        this.modal.ok(fnOK);
        this.modal.cancel(fnCancel);
        document.getElementById('confirm-modal-body').innerHTML = msg;
        document.getElementById('confirm-modal').showModal();
    },

    /** Show the end exam confirmation dialog box.
    *
    * @param {string} msg - message to show the user
    * @param {Function} fnEnd - callback to end the exam
    * @param {Function} fnCancel - callback if cancelled
    */
    showConfirmEndExam: function(msg,fnEnd,fnCancel) {
        this.modal.ok(fnEnd);
        this.modal.cancel(fnCancel);
        let confirmationInputMsg = R('modal.confirm end exam', {endConfirmation : R('control.confirm end.password')});
        document.getElementById('confirm-end-exam-modal-message').innerHTML = msg;
        document.getElementById('confirm-end-exam-modal-input-message').innerHTML = confirmationInputMsg;
        document.getElementById('confirm-end-exam-modal').showModal();
    },

    lightbox_pressing_state: 'none',

    /** Register event listeners to show the lightbox when images in this element are clicked.
     * 
     * @param {Element} element
     */
    register_lightbox: function(element) {
        var lightbox = document.querySelector('#lightbox');
        function register_image(img) {
            var elem = img.cloneNode();
            var wrapper = document.createElement('span');
            wrapper.setAttribute('class', 'lightbox-image-wrapper');
            var align = img.getAttribute('align');
            switch(align) {
                case 'bottom':
                case 'middle':
                case 'top':
                    wrapper.style['vertical-align'] = align;
                    break;
                case 'left':
                case 'right':
                    wrapper.style['float'] = align;
                    break;
            }

            img.replaceWith(wrapper);

            wrapper.appendChild(img);

            var button = document.createElement('button');
            button.type = 'button';
            button.textContent = '🔍';
            button.title = button.ariaLabel = R('lightbox.zoom in on image');

            function activate() {
                lightbox.innerHTML = '';
                lightbox.appendChild(elem);
                Numbas.display.show_lightbox(wrapper);
            }

            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if(display.lightbox_pressing_state != 'key') {
                    activate();
                } else {
                    display.lightbox_pressing_state = 'click';
                }
            });
            button.addEventListener('keydown', function(e) {
                display.lightbox_pressing_state = 'key';
            })
            button.addEventListener('keyup', function(e) {
                if(display.lightbox_pressing_state == 'click') {
                    e.preventDefault();
                    e.stopPropagation();
                    activate();
                }
                display.lightbox_pressing_state = 'none';
            })
            button.addEventListener('blur', function(e) {
                display.lightbox_pressing_state = 'none';
            });

            button.addEventListener

            wrapper.appendChild(button);
        }
        Array.from(element.querySelectorAll('img,object')).forEach(function(img) {
            if(img.complete) {
                register_image(img);
            } else {
                img.addEventListener('load', function() {
                    register_image(img);
                },{once: true});
            }
        });
    },

    /** 
     * Find the JME scope that applies to this element.
     * Looks for an element with a `jme_scope` attribute.
     * 
     * @param {Element} element
     * @returns {Numbas.jme.Scope}
     */
    find_jme_scope: function(element) {
        while(element) {
            if(element.jme_scope !== undefined) {
                return element.jme_scope;
            }
            element = element.parentElement;
        }
    },

    /**
     * Find the element's top ancestor node. For elements in the document, this will be the document object itself.
     *
     * @param {Element} element
     * @returns {Node}
     */
    find_root_ancestor: function(element) {
        while(element.parentNode) {
            element = element.parentNode;
        }
        return element;
    },

    /** Make MathJax typeset any maths in the selector.
     *
     * @param {Element} [element] - Element to typeset. If not given, the whole page is typeset.
     * @param {Function} callback - Function to call when typesetting is finished.
     */
    typeset: function(element,callback) {
        var delay = 10;

        /**
         * Try to typeset the given elements.
         * An element is typeset if it is attached to the main document, and has a parent which specifies a JME scope to use.
         *
         * After each attempt, if there are any elements still waiting to be typeset, there's an exponentially growing delay before trying again.
         *
         * Once all elements have been typeset, the callback is called.
         */
        function try_to_typeset() {
            try {
                var root = display.find_root_ancestor(element);
                var scope = display.find_jme_scope(element);

                if(root == document && scope) {
                    MathJax.typesetPromise([element]).then(() => {
                        if(callback) {
                            callback();
                        }
                    });
                    return;
                }

                delay *= 1.1;
                setTimeout(try_to_typeset, delay);
            } catch(e) {
                if(MathJax===undefined && !display.failedMathJax) {
                    display.failedMathJax = true;
                    display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
                } else {
                    Numbas.schedule.halt(e);
                }
            }
        }

        setTimeout(try_to_typeset, 1);
    },

    /** Associate a JME scope with the given element.
     *
     * @param {Element} element
     * @param {Numbas.jme.Scope} scope
     */
    setJMEScope: function(element, scope) {
        element.jme_scope = scope;
    },

    /** Make HTML from an XML node and bind it to the given scope and display object.
     * Variables are substituted from the given scope using {@link Numbas.jme.variables.DOMcontentsubvars}.
     *
     * @param {Element} xml
     * @param {XMLDocument} template
     * @param {Numbas.jme.Scope} scope
     * @param {string} contextDescription - Description of the JME context, for error messages.
     * @returns {Promise} - Resolves to the produced HTML element after variables have been substituted.
     */
    makeHTMLFromXML: function(xml, template, scope, contextDescription) {
        var htmlString = Numbas.xml.transform(template, xml);
        var d = document.createElement('div');
        d.innerHTML = htmlString;
        Numbas.xml.localise(d);
        var html = d.firstElementChild;
        display.setJMEScope(html,scope);
        if(!html.getAttribute('data-jme-context-description')) {
            html.setAttribute('data-jme-context-description',contextDescription);
        }
        var promise = new Promise(
            function(resolve, reject) {
                html = Numbas.jme.variables.DOMcontentsubvars(html,scope);

                Numbas.display.register_lightbox(html);
                Numbas.display.typeset(html);
                resolve(html);
            })
            .catch(function(error) {
                var errorContextDescriptionBits = [];
                var errorContextDescription;
                if(error.element) {
                    var elem = error.element;
                    while(elem) {
                        if(elem.nodeType==1) {
                            var desc = Numbas.display.getLocalisedAttribute(elem,'data-jme-context-description');
                            if(desc) {
                                errorContextDescriptionBits.splice(0,0,desc);
                            }
                        }
                        elem = elem.parentElement;
                    }
                    errorContextDescription = errorContextDescriptionBits.join(' ');
                } else {
                    errorContextDescription = contextDescription;
                }
                Numbas.schedule.halt(new Numbas.Error('display.error making html',{contextDescription: errorContextDescription, message: error.message},error));
            })
        ;

        return promise;
    },


    /** The Numbas exam has failed so much it can't continue - show an error message and the error.
     *
     * @param {Error} e
     */
    die: function(e) {
        var message = (e || e.message)+'';
        var stack = e.stack.replace(/\n/g,'<br>\n');
        Numbas.debug(message,false,e);
        //hide all the non-error stuff
        for(let element of document.querySelectorAll('.mainDisplay > *, #loading, #everything')) {
            element.hidden = true;
        }
        //show the error stuff
        document.getElementById('die').hidden = false;
        document.querySelector('#die .error .message').innerHTML = message;
        document.querySelector('#die .error .stack').innerHTML = stack;
    },

    // References to functions in Numbas.display_util, for backwards compatibility.
    measureText: display_util.measureText,

    showScoreFeedback: display_util.showScoreFeedback,

    passwordHandler: display_util.passwordHandler,

    localisePage: display_util.localisePage,

    getLocalisedAttribute: display_util.getLocalisedAttribute,

};

});
