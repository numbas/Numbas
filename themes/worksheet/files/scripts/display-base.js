Numbas.queueScript('display-base',['display-util', 'display-color', 'controls','math','xml','util','timing','jme','jme-display','schedule'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var display_util = Numbas.display_util;
var display_color = Numbas.display_color;

var job = Numbas.schedule.add;

/** @namespace Numbas.display */
var display = Numbas.display = /** @lends Numbas.display */ {
    /** Update the progress bar when loading.
     */
    showLoadProgress: function()
    {
        var p = 100 * Numbas.schedule.completed / Numbas.schedule.total;
        document.querySelector('#loading progress').value = p;
    },
    /** Initialise the display. Called as soon as the page loads.
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



        Numbas.display.localisePage();

        for(var x in Numbas.extensions) {
            Numbas.activateExtension(x);
        }
    
        var vm = display.worksheets = new WorksheetDisplay();

        Knockout.applyBindings(vm,document.getElementById('everything'));

    },

    //alert / confirm boxes
    //
    /** Callback functions for the modals.
     *
     * @type {Object<Function>}
     */
    modal: {
        ok: function() {},
        cancel: function() {}
    },
    /** Show an alert dialog.
     *
     * @param {string} msg - message to show the user
     * @param {Function} fnOK - callback when OK is clicked
     */
    showAlert: function(msg,fnOK) {
        fnOK = fnOK || function() {};
        this.modal.ok = fnOK;
        $('#alert-modal .modal-body').html(msg);
        $('#alert-modal').modal('show');
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
        this.modal.ok = fnOK || function(){};
        this.modal.cancel = fnCancel || function(){};
        $('#confirm-modal .modal-body').html(msg);
        $('#confirm-modal').modal('show');
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
    typeset: function(selector,callback)
    {
        // Blank in this theme because maths is typeset once, when the exams are generated.
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

var WorksheetDisplay = Numbas.display.WorksheetDisplay = function() {
    var vm = this;

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


    this.style = {
        '--text-size': styleObservable('--text-size'),
        '--spacing-scale': styleObservable('--spacing-scale'),
        '--main-font': styleObservable('--main-font'),
        '--page-margin-top': styleObservable('--page-margin-top'),
        '--page-margin-bottom': styleObservable('--page-margin-bottom'),
        '--page-margin-left': styleObservable('--page-margin-left'),
        '--page-margin-right': styleObservable('--page-margin-right'),
    };

    this.staged_style = {
        '--text-size': styleObservable('--text-size'),
        '--spacing-scale': styleObservable('--spacing-scale'),
        '--main-font': styleObservable('--main-font'),
    },
    this.forced_colors = Knockout.observable(forced_colors.matches);
    this.color_scheme = Knockout.observable('automatic');
    this.saveStyle = this.saveStyle;
    this.closeModal = function(_, e) {
        let el = e.target;
        while(el && el.tagName != 'DIALOG') {
            el = el.parentElement;
        }
        if(el) {
            el.close();
        }
    }

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
        for(var x in this.style) {
            if(x in saved_style_options) {
                this.style[x](saved_style_options[x]);
            }
        }
        for(var x in this.staged_style) {
            this.staged_style[x](this.style[x]());
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
            '--page-margin-top': parseFloat(vm.style['--page-margin-top']()),
            '--page-margin-left': parseFloat(vm.style['--page-margin-left']()),
            '--page-margin-right': parseFloat(vm.style['--page-margin-right']()),
            '--page-margin-bottom': parseFloat(vm.style['--page-margin-bottom']()),
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

    this.show_settings = ko.observable(true);

    this.cancelling_generation = false;

    this.cancel_generation = function() {
        vm.cancelling_generation = true;
        vm.reconfigure();
    }

    this.exams = ko.observableArray([]);
    
    this.shown_id = ko.observable(0);
    this.shown_exam = ko.pureComputed(function() {
        return this.exams()[this.shown_id()-this.offset()];
    },this);

    this.numExams = ko.observable(1);
    this.sheetTypes = [
        {name: 'questionsheet', label: R('worksheet.question sheets')},
        {name: 'answersheet', label: R('worksheet.answer sheets')}
    ];
    this.sheetType = ko.observable(this.sheetTypes[0]);

    this.break_between_questions = ko.observable(false);

    this.show_exam_id = ko.observable(true);

    this.answersheet_show_question_content = ko.observable(true);

    this.exam_list_classes = ko.pureComputed(function() {
        return {
            'questionsheet': this.sheetType().name=='questionsheet',
            'answersheet': this.sheetType().name=='answersheet',
            'break-between-questions': this.break_between_questions(),
            'show-exam-id': this.show_exam_id(),
            'answersheet-show-question-content': this.answersheet_show_question_content(),
        }
    },this);

    /** The number of exams that have finished processing.
     *
     * @type {observable<number>}
     */
    this.progress = ko.pureComputed(function() {
        return this.exams().filter(e => e.status() != 'working').length;
    },this);

    /** A text description of progress.
     *
     * @type {observable<string>}
     */
    this.progressText = ko.pureComputed(function() {
        if(this.numExams()==0) {
            return '';
        }
        const percent = Math.floor(100*this.progress()/this.numExams());
        return `${percent}%`;
    },this);


    /** What is the status of the generator?
     * `configuring` - changing some of the settings.
     * `working` - generating exams
     * `done` - all exams generated
     */
    this.status = ko.observable('configuring');

    this.offset = ko.observable(0);
}
WorksheetDisplay.prototype = {
    style_options_localstorage_key: 'numbas-style-options-worksheet',

    clear_exams: function() {
        this.exams([]);
        this.shown_id(this.offset());
        var examList = document.getElementById('examList');
        examList.innerHTML = '';

    },

    reconfigure: function() {
        this.clear_exams();
        this.show_settings(true);
        this.status('configuring');
    },

    generate: function() {
        var w = this;

        this.cancelling_generation = false;
        this.show_settings(false);

        this.clear_exams();
        var offset = parseInt(this.offset());
        var numExams = parseInt(this.numExams());

        this.status('working');
        this.show_settings(false);

        function make(n) {
            if(w.cancelling_generation) {
                w.clear_exams();
                return;
            }
            var e = new GeneratedExam(offset+n);
            w.exams.push(e);
            if(n<numExams-1) {
                e.exam.signals.on('question variables generated', function() {
                    make(n+1);
                });
            } else {
                Promise.all(w.exams().map(function(ge){ return ge.exam.signals.getCallback('HTML attached').promise })).then(function() {
                    w.status('done');

                    try {
                        MathJax.typeset([document.getElementById('examList')]);
                    } catch(e) {
                        if(MathJax===undefined && !display.failedMathJax) {
                            display.failedMathJax = true;
                            display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
                        } else {
                            Numbas.showError(e);
                        }
                    }
                });
            }
        }

        if(numExams>0) {
            make(0);
        }

    },
    print: function() {
        window.print();
    },
};

function GeneratedExam(offset) {
    var ge = this;
    this.id = offset;
    Math.seedrandom(offset);
    this.status = ko.observable('working');

    this.shown = ko.pureComputed(function() {
        return Numbas.display.worksheets.shown_exam() == this;
    },this);

    var xml = Numbas.xml.examXML.selectSingleNode('/exam');
    var exam = this.exam = Numbas.createExamFromXML(xml,null,true);
    exam.id = offset;
    job(exam.init,exam);
    exam.settings.showActualMark = false;
    exam.settings.showAnswerState = false;
    exam.signals.on('question list initialised', function() {
        ge.status('done');
        exam.questionList.forEach(function(q) {
            q.revealAnswer();
            q.display.init();
            q.signals.on('HTMLAttached',function() {
                q.signals.trigger('HTML appended');
            });
        });
        Promise.all(exam.questionList.map(function(q){return q.signals.getCallback('variablesGenerated').promise})).then(function() {
            exam.signals.trigger('question variables generated');
        });
        Promise.all(exam.questionList.map(function(q){return q.signals.getCallback('HTML appended').promise})).then(function() {
            exam.signals.trigger('HTML attached');
        });
        exam.signals.on('ready', function() {
            exam.display.showScore();
        });
    });
}

/* Override the showScoreFeedback logic to force the state of a worksheet: as if nothing is entered and there's no "current score".
 */
var base_showScoreFeedback = display_util.showScoreFeedback;
display_util.showScoreFeedback = function(obj,settings)
{   
    const obj2 = {
        answered: () => false,
        isDirty: () => false,
        score: () => 0,
        marks: () => Knockout.unwrap(obj.marks),
        credit: () => 0,
        doesMarking: () => Knockout.unwrap(obj.marks),
        revealed: () => false,
        plainScore: obj.plainScore
    };
    const settings2 = {
        showTotalMark: settings.showTotalMark,
        showActualMark: false,
        showAnswerState: false,
        reviewShowScore: false,
        reveal_answers_for_instructor: false
    };

    return base_showScoreFeedback(obj2, settings2); 
};


});
