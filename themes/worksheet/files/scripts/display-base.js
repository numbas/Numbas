Numbas.queueScript('display-base',['display-util', 'controls','math','xml','util','timing','jme','jme-display','schedule'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var display_util = Numbas.display_util;

var job = Numbas.schedule.add;

Numbas.is_instructor = true;

/** @namespace Numbas.display */
var display = Numbas.display = /** @lends Numbas.display */ {
    /** Update the progress bar when loading.
     */
    showLoadProgress: function()
    {
        var p= 100 * Numbas.schedule.completed / Numbas.schedule.total;
        $('#loading .progress-bar').width(p+'%');
    },
    /** Initialise the display. Called as soon as the page loads.
     */
    init: function()
    {
        //hide the various content-display bits
        $('.mainDisplay > *').hide();
        //show the page;
        $('#loading').hide();
        $('#everything').show();

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
    /** Make MathJax typeset any maths in the selector.
     *
     * @param {jQuery|Element} [selector] - Elements to typeset. If not given, the whole page is typeset.
     * @param {Function} callback - Function to call when typesetting is finished.
     */
    typeset: function(selector,callback)
    {
    },

    /** Associate a JME scope with the given element.
     *
     * @param {Element} element
     * @param {Numbas.jme.Scope} scope
     */
    setJMEScope: function(element, scope) {
        $(element).addClass('jme-scope').data('jme-scope',scope);
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
        html = d.firstElementChild;
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
        $('.mainDisplay > *,#loading,#everything').hide();
        //show the error stuff
        $('#die').show();
        $('#die .error .message').html(message);
        $('#die .error .stack').html(stack);
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

    var style_defaults = {
        backgroundColour: '#ffffff',
        textColour: '#000000',
        textSize: '12',
        page_margins: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
        }
    };

    this.style = {
        backgroundColour: Knockout.observable(''),
        textColour: Knockout.observable(''),
        textSize: Knockout.observable(''),
        page_margins: {
            top: ko.observable(10),
            bottom: ko.observable(10),
            left: ko.observable(10),
            right: ko.observable(10)
        },
    };

    this.resetStyle = function() {
        for(var x in style_defaults) {
            if(typeof this.style[x] == 'object') {
                for(var y in this.style[x]) {
                    this.style[x][y](style_defaults[x][y]);
                }
            } else {
                this.style[x](style_defaults[x]);
            }
        }
    }

    this.resetStyle();

    try {
        var saved_style_options = JSON.parse(localStorage.getItem(this.style_options_localstorage_key)) || {};
        for(var x in this.style) {
            if(x in saved_style_options) {
                if(typeof this.style[x] == 'object') {
                    for(var y in this.style[x]) {
                        this.style[x][y](saved_style_options[x][y]);
                    }
                } else {
                    this.style[x](saved_style_options[x]);
                }
            }
        }
    } catch(e) {
        console.error(e);
    }

    const page_style = document.createElement('style');
    document.head.appendChild(page_style);

    Knockout.computed(function() {
        var backgroundColour = vm.style.backgroundColour();
        var rgb = display_util.parseRGB(backgroundColour);
        var hsl = display_util.RGBToHSL(rgb[0],rgb[1],rgb[2]);
        var oppositeBackgroundColour = hsl[2]<0.5 ? '255,255,255' : '0,0,0';
        const page_margins = [vm.style.page_margins.top, vm.style.page_margins.right, vm.style.page_margins.bottom, vm.style.page_margins.left].map(o=>`${o()}mm`).join(' ');

        var css_vars = {
            '--background-colour': vm.style.backgroundColour(),
            '--opposite-background-colour': oppositeBackgroundColour,
            '--text-colour': vm.style.textColour(),
            '--text-size': parseFloat(vm.style.textSize()) * (4/3)/18,
            '--page-margin': page_margins
        };

        for(var x in css_vars) {
            document.body.style.setProperty(x,css_vars[x]);
        }

        /** The @page rule doesn't seem to use CSS custom properties, so instead insert a <style> tag in the page with the page margins.
         */
        page_style.textContent = `@page {
            margin: ${page_margins}
        }`;

        var options = {};
        for(var x in vm.style) {
            if(typeof vm.style[x] == 'object') {
                options[x] = {};
                for(var y in vm.style[x]) {
                    options[x][y] = vm.style[x][y]();
                }
            } else {
                options[x] = vm.style[x]();
            }
        }
        try {
            localStorage.setItem(this.style_options_localstorage_key,JSON.stringify(options));
        } catch(e) {
        }
    },this);
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
                        MathJax.Hub.Queue(['Typeset',MathJax.Hub,'examList']);
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
