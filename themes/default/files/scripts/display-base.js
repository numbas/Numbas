Numbas.queueScript('display-base',['display-util', 'controls','math','xml','util','timing','jme','jme-display'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var display_util = Numbas.display_util;
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
        $('.mainDisplay > footer').show();
        //show the page;
        $('#loading').hide();
        $('#everything').show();
        // bind buttons in the modals
        $('.modal button.ok').on('click',function() {
            display.modal.ok();
            display.modal.ok = display.modal.cancel = function() {};
        })
        $('.modal button.cancel').on('click',function() {
            display.modal.cancel();
            display.modal.ok = display.modal.cancel = function() {};
        })

        $('button[data-toggle="navMenu"]').on('click',function() {
            document.body.classList.toggle('show-sidebar');
        });

        var lightbox = document.querySelector('#lightbox');
        lightbox.addEventListener('click', () => Numbas.display.hide_lightbox());
        document.body.addEventListener('keyup',function() {
            if(lightbox.classList.contains('shown')) {
                Numbas.display.hide_lightbox();
            }
        });

        var style_defaults = {
            backgroundColour: '#ffffff',
            textColour: '#000000',
            textSize: '1'
        };

        var vm = this.viewModel = {
            exam: Knockout.observable(Numbas.exam.display),
            style: {
                backgroundColour: Knockout.observable(''),
                textColour: Knockout.observable(''),
                textSize: Knockout.observable('')
            },
            staged_style: {
                textSize: Knockout.observable('')
            },
            modal: this.modal,
        }
        vm.css = Knockout.computed(function() {
            var exam = vm.exam();
            var navigateMode = exam.exam.settings.navigateMode;
            var classes = {
                'show-nav': exam.viewType()=='question' || (exam.viewType() == 'infopage' && exam.infoPage()=='introduction'), 
                'show-sidebar': navigateMode=='sequence' || navigateMode=='diagnostic',
                'no-printing': !exam.allowPrinting(),
                'info-page': exam.viewType() == 'infopage',
                'no-printing-questions': !exam.exam.settings.resultsshowquestions,
            }
            classes['navigate-'+navigateMode] = true;
            return classes;
        });

        vm.resetStyle = function() {
            for(var x in style_defaults) {
                vm.style[x](style_defaults[x]);
                if(vm.staged_style[x]) {
                    vm.staged_style[x](style_defaults[x]);
                }
            }
        }

        vm.resetStyle();

        try {
            var saved_style_options = JSON.parse(localStorage.getItem(this.style_options_localstorage_key)) || {};
            for(var x in this.viewModel.style) {
                if(x in saved_style_options) {
                    this.viewModel.style[x](saved_style_options[x]);
                    if(x in this.viewModel.staged_style) {
                        this.viewModel.staged_style[x](saved_style_options[x]);
                    }
                }
            }
        } catch(e) {
            console.error(e);
        }

        Knockout.computed(function() {
            var backgroundColour = vm.style.backgroundColour();
            var rgb = display_util.parseRGB(backgroundColour);
            var hsl = display_util.RGBToHSL(rgb[0],rgb[1],rgb[2]);
            var oppositeBackgroundColour = hsl[2]<0.5 ? '255,255,255' : '0,0,0';
            var css_vars = {
                '--background-colour': vm.style.backgroundColour(),
                '--opposite-background-colour': oppositeBackgroundColour,
                '--text-colour': vm.style.textColour(),
                '--text-size': parseFloat(vm.style.textSize()),
                '--staged-text-size': parseFloat(vm.staged_style.textSize())
            };

            for(var x in css_vars) {
                document.body.style.setProperty(x,css_vars[x]);
            }

            var options = {};
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
     */
    show_lightbox: function() {
        lightbox.classList.add('shown');
        lightbox.focus();
    },

    /** Hide the lightbox.
     *
     */
    hide_lightbox: function() {
        lightbox.classList.remove('shown');
        lightbox.innerHTML = '';
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
        display.modal.ok = function() {
            display.viewModel.style.textSize(display.viewModel.staged_style.textSize());
        }
        $('#style-modal').modal('show');
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

    /** Show the end exam confirmation dialog box.
    *
    * @param {string} msg - message to show the user
    * @param {Function} fnEnd - callback to end the exam
    * @param {Function} fnCancel - callback if cancelled
    */
    showConfirmEndExam: function(msg,fnEnd,fnCancel) {
        var fOK = fnEnd || function () {};
        this.modal.ok = function () {
            $('#confirm-end-exam-modal').modal('hide');
            fOK();
        };
        this.modal.cancel = fnCancel || function() {};
        let confirmationInputMsg = R('modal.confirm end exam', {endConfirmation : R('control.confirm end.password')});
        $('#confirm-end-exam-modal-message').html(msg);
        $('#confirm-end-exam-modal-input-message').html(confirmationInputMsg);
        $('#confirm-end-exam-modal').modal('show');
   },

    /** Register event listeners to show the lightbox when images in this element are clicked.
     * 
     * @param {Element} element
     */
    register_lightbox: function(element) {
        var lightbox = document.querySelector('#lightbox');
        for(let img of element.querySelectorAll('img,object')) {
            img.addEventListener('click', function(e) {
                var elem = img.cloneNode();
                elem.removeAttribute('width');
                elem.removeAttribute('height');
                var box = img.getBoundingClientRect();
                if(elem.width > box.width || elem.height > box.height) {
                    lightbox.innerHTML = '';
                    lightbox.appendChild(elem);
                    Numbas.display.show_lightbox();
                }
            });
        }
    },

    /** Make MathJax typeset any maths in the selector.
     *
     * @param {jQuery|Element} [selector] - Elements to typeset. If not given, the whole page is typeset.
     * @param {Function} callback - Function to call when typesetting is finished.
     */
    typeset: function(selector,callback)
    {
        setTimeout(function() {
            try
            {
                if(!selector)
                    selector = $('body');
                $(selector).each(function(i,elem) {
                    var oe;
                    var e = elem;
                    while(e) {
                        oe = e;
                        e = e.parentNode;
                    }
                    if(oe==document) {
                        display.MathJaxQueue.Push(['Typeset',MathJax.Hub,elem]);
                    }
                });
                if(callback)
                    display.MathJaxQueue.Push(callback);
            } catch(e) {
                if(MathJax===undefined && !display.failedMathJax) {
                    display.failedMathJax = true;
                    display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
                } else {
                    Numbas.schedule.halt(e);
                }
            }
        },1);

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

});
