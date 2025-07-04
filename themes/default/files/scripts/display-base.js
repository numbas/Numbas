Numbas.queueScript('display-base',['display-util', 'display-color', 'controls','math','xml','util','timing','jme','jme-display'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var display_util = Numbas.display_util;
var display_color = Numbas.display_color;

var mj_promise = MathJax.startup.promise;

class NumbasExamElement extends HTMLElement {
    //alert / confirm boxes
    //
    /** Callback functions for the modals.
     *
     * @type {Object<Function>}
     */
    modal = {
        ok: Knockout.observable(function() {}),
        cancel: Knockout.observable(function() {}),
    }

    lightbox_pressing_state = 'none';

    constructor() {
        super();

    }

    connectedCallback() {
        const template = document.getElementById('numbas-exam-template');
        this.attachShadow({mode:'open'});
        this.shadowRoot.append(template.content.cloneNode(true));
        this.setAttribute('data-bind', template.getAttribute('data-bind'));

        this.load();
    }

    showLoadProgress(scheduler) {
        var p = 100 * scheduler.completed_jobs / scheduler.num_jobs;
        this.shadowRoot.querySelector('#loading progress').value = p;
    }

    async load() {
        const options = {
            exam_url: this.getAttribute('source_url'),
            element: this
        };

        const exam_data = await Numbas.load_exam(options);

        const extension_data = JSON.parse(this.getAttribute('extensions'));

        for(let extension of exam_data.extensions) {
            const data = extension_data[extension];
            for(let js of data.javascripts) {
                if(!document.head.querySelector(`script[data-numbas-extension="${extension}"]`)) {
                    const script = document.createElement('script');
                    script.src = `${data.root}/${js}`;
                    script.dataset.numbasExtension = extension;
                    document.head.appendChild(script);
                }
            }
            for(let css of data.stylesheets) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = `${data.root}/${css}`;
                this.shadowRoot.appendChild(link);
            }
        }
    }

    init(exam) {
        this.shadowRoot.append(MathJax.svgStylesheet());

        const lightbox = this.lightbox = this.shadowRoot.getElementById('lightbox');
        lightbox.addEventListener('click', () => this.hide_lightbox());
        document.addEventListener('keyup', () => {
            if(lightbox.classList.contains('shown')) {
                this.hide_lightbox();
            }
        });

        display_util.localisePage(this.shadowRoot);

        // bind buttons in the modals

        for(let b of this.shadowRoot.querySelectorAll('button[aria-controls="navMenu"]')) {
            b.addEventListener('click', () => {
                this.classList.toggle('show-sidebar');
            });
        }

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

        display_util.set_jme_scope(this.shadowRoot.querySelector('#infoDisplay'), exam.scope);
        display_util.set_jme_scope(this.shadowRoot.querySelector('#diagnostic-feedback'), exam.scope);

        var body_style = getComputedStyle(this);

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

        function make_style_object() {
            const names = ['--text-size','--spacing-scale','--font-weight','--main-font'];
            return Object.fromEntries(names.map(name => [name, name.startsWith('--') ? styleObservable(name) : Knockout.observable('')]));
        }

        var vm = this.viewModel = {
            exam: Knockout.observable(exam.display),
            style: make_style_object(),
            staged_style: make_style_object(),
            forced_colors: Knockout.observable(forced_colors.matches),
            color_scheme: Knockout.observable('automatic'),
            saveStyle: this.saveStyle.bind(this),
            modal: this.modal,
            loaded: Knockout.observable(false),

            font_options: Numbas.display.font_options.map(({name,label}) => { return {name, label: R(label)}; }),

            showStyleModal: () => this.showStyleModal(),

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
                'show-sidebar': false,
                'no-printing': !exam.allowPrinting(),
                'info-page': exam.viewType() == 'infopage',
                'no-printing-questions': !exam.exam.settings.resultsprintquestions,
                'no-printing-advice': !exam.exam.settings.resultsprintadvice,
                'loaded': vm.loaded(),
            }
            return classes;
        });

        exam.signals.on('ready', () => {
            vm.loaded(true);
        })


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
            var saved_style_options = JSON.parse(localStorage.getItem(Numbas.display.style_options_localstorage_key)) || {};
            if(saved_style_options.color_scheme) {
                vm.color_scheme(saved_style_options.color_scheme);
            }
            for(var x in vm.style) {
                if(x in saved_style_options) {
                    vm.style[x](saved_style_options[x]);
                }
            }
            for(var x in vm.staged_style) {
                vm.staged_style[x](vm.style[x]());
            }
        } catch(e) {
            console.error(e);
        }

        Knockout.computed(() => {
            const root = this.shadowRoot.querySelector('exam-container');

            var css_vars = {
                '--text-size': parseFloat(vm.style['--text-size']()),
                '--spacing-scale': parseFloat(vm.style['--spacing-scale']()),
                '--font-weight': parseFloat(vm.style['--font-weight']()),
                '--main-font': vm.style['--main-font'](),
                '--staged-text-size': parseFloat(vm.staged_style['--text-size']()),
                '--staged-spacing-scale': parseFloat(vm.staged_style['--spacing-scale']()),
                '--staged-font-weight': parseFloat(vm.staged_style['--font-weight']()),
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
                localStorage.setItem(Numbas.display.style_options_localstorage_key,JSON.stringify(options));
            } catch(e) {
            }
        });
        
        this.setExam(exam);

        Knockout.applyBindings(this.viewModel, this.shadowRoot.querySelector('exam-container'));
    }

    setExam(exam) {
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
    }

    /** Show an alert dialog.
     *
     * @param {string} msg - message to show the user
     * @param {Function} fnOK - callback when OK is clicked
     */
    showAlert(msg,fnOK) {
        this.modal.ok(fnOK);
        this.shadowRoot.getElementById('alert-modal-body').innerHTML = msg;
        this.shadowRoot.getElementById('alert-modal').showModal();
    }

    /** Show the modal with styling options.
     */
    showStyleModal() {
        this.shadowRoot.getElementById('style-modal').showModal();
    }

    /** Save the changes to the style options.
     */
    saveStyle() {
        Object.entries(this.viewModel.staged_style).forEach(([k,obs]) => {
            this.viewModel.style[k](obs());
        });
        this.shadowRoot.getElementById('style-modal').close();
    }

    /** Show a confirmation dialog box.
     *
     * @param {string} msg - message to show the user
     * @param {Function} fnOK - callback if OK is clicked
     * @param {Function} fnCancel - callback if cancelled
     */
    showConfirm(msg,fnOK,fnCancel) {
        this.modal.ok(fnOK);
        this.modal.cancel(fnCancel);
        this.shadowRoot.getElementById('confirm-modal-body').innerHTML = msg;
        this.shadowRoot.getElementById('confirm-modal').showModal();
    }

    /** Show the end exam confirmation dialog box.
    *
    * @param {string} msg - message to show the user
    * @param {Function} fnEnd - callback to end the exam
    * @param {Function} fnCancel - callback if cancelled
    */
    showConfirmEndExam(msg,fnEnd,fnCancel) {
        this.modal.ok(fnEnd);
        this.modal.cancel(fnCancel);
        let confirmationInputMsg = R('modal.confirm end exam', {endConfirmation : R('control.confirm end.password')});
        this.shadowRoot.getElementById('confirm-end-exam-modal-message').innerHTML = msg;
        this.shadowRoot.getElementById('confirm-end-exam-modal-input-message').innerHTML = confirmationInputMsg;
        this.shadowRoot.getElementById('confirm-end-exam-modal').showModal();
    }

    /** Register event listeners to show the lightbox when images in this element are clicked.
     * 
     * @param {Element} element
     */
    register_lightbox(element) {
        const {lightbox} = this;

        const register_image = (img) => {
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

            const activate = () => {
                lightbox.innerHTML = '';
                lightbox.appendChild(elem);
                this.show_lightbox(wrapper);
            }

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(this.lightbox_pressing_state != 'key') {
                    activate();
                } else {
                    this.lightbox_pressing_state = 'click';
                }
            });
            button.addEventListener('keydown', (e) => {
                this.lightbox_pressing_state = 'key';
            })
            button.addEventListener('keyup', (e) => {
                if(this.lightbox_pressing_state == 'click') {
                    e.preventDefault();
                    e.stopPropagation();
                    activate();
                }
                this.lightbox_pressing_state = 'none';
            })
            button.addEventListener('blur', (e) => {
                this.lightbox_pressing_state = 'none';
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
    }

    /** Show the lightbox.
     *
     * @param {Element} original - The original image element which is going to be copied into the lightbox.
     */
    show_lightbox(original) {
        this.lightbox.showModal();
        this.lightbox_original_element = original;
    }

    /** Hide the lightbox.
     *
     */
    hide_lightbox() {
        this.lightbox.close();
        this.lightbox.innerHTML = '';
        this.lightbox_pressing_state = 'none';
        if(this.lightbox_original_element) {
            this.lightbox_original_element.querySelector('button').focus();
        }
    }

}
customElements.define('numbas-exam', NumbasExamElement);

/** @namespace Numbas.display */
var display = Numbas.display = /** @lends Numbas.display */ {
    /** Initialise the display.
     */
    init: function() {
        document.body.classList.add('loaded');

        display_util.localisePage(document.body);

    },

    /** Update the progress bar when loading.
     */
    showLoadProgress: function()
    {
        var p = 100 * Numbas.schedule.completed / Numbas.schedule.total;
        document.querySelector('#loading progress').value = p;
    },

    style_options_localstorage_key: 'numbas-style-options',

    /** List of options for the display font.
     */
    font_options: [
        {name: 'sans-serif', label: 'modal.style.font.sans serif'},
        {name: 'serif', label: 'modal.style.font.serif'},
        {name: 'monospace', label: 'modal.style.font.monospace'},
    ],

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
            var root = display.find_root_ancestor(element);
            var scope = display_util.find_jme_scope(element);

            if((root.nodeType == root.DOCUMENT_FRAGMENT_NODE || root.nodeType == root.DOCUMENT_NODE) && scope) {
                mj_promise = mj_promise.then(() => {
                    MathJax.typesetPromise([element]).then(() => {
                        if(callback) {
                            callback();
                        }
                    });
                }).catch(e => {
                    if(MathJax===undefined && !display.failedMathJax) {
                        display.failedMathJax = true;
                        display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
                    } else {
                        Numbas.schedule.halt(e);
                    }
                });
                return;
            }

            delay *= 1.1;
            setTimeout(try_to_typeset, delay);
        }

        setTimeout(try_to_typeset, 1);
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
    makeHTMLFromXML: function(xml, template, scope, contextDescription, root_element) {
        var htmlString = Numbas.xml.transform(template, xml);
        var d = document.createElement('div');
        d.innerHTML = htmlString;
        Numbas.xml.localise(d);
        var html = d.firstElementChild;
        display_util.set_jme_scope(html,scope);
        if(!html.getAttribute('data-jme-context-description')) {
            html.setAttribute('data-jme-context-description',contextDescription);
        }
        var promise = new Promise(
            function(resolve, reject) {
                html = Numbas.jme.variables.DOMcontentsubvars(html,scope);

                root_element.register_lightbox(html);
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
        for(let element of document.querySelectorAll('numbas-exam')) {
            element.hidden = true;
        }
        //show the error stuff
        document.getElementById('die').hidden = false;
        document.body.querySelector('#die .error .message').innerHTML = message;
        document.body.querySelector('#die .error .stack').innerHTML = stack;
    },

    // References to functions in Numbas.display_util, for backwards compatibility.
    measureText: display_util.measureText,

    showScoreFeedback: display_util.showScoreFeedback,

    passwordHandler: display_util.passwordHandler,

    localisePage: display_util.localisePage,

    getLocalisedAttribute: display_util.getLocalisedAttribute,

    setJMEScope: display_util.set_jme_scope,

    find_root_ancestor: display_util.find_root_ancestor,

};

});
