Numbas.queueScript('display-base',['controls','math','xml','util','timing','jme','jme-display'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
/** @namespace Numbas.display */
var display = Numbas.display = /** @lends Numbas.display */ {
    /** Localise strings in page HTML - for tags with an attribute `data-localise`, run that attribute through R.js to localise it, and replace the tag's HTML with the result.
     */
    localisePage: function() {
        $('[data-localise]').each(function() {
            var localString = R($(this).data('localise'));
            $(this).html(localString);
        });
    },
    /** Get the attribute with the given name or, if it doesn't exist, look for localise-<name>.
     * If that exists, localise its value and set the desired attribute, then return it.
     *
     * @param {Element} elem
     * @param {string} name
     * @returns {string}
     */
    getLocalisedAttribute: function(elem, name) {
        var attr_localise;
        var attr = elem.getAttribute(name);
        if(!attr && (attr_localise = elem.getAttribute('localise-'+name))) {
            attr = R(attr_localise);
            elem.setAttribute(name,attr);
        }
        return attr;
    },
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
            confirm_end: {
                confirmation: Knockout.observable('')
            }
        }
        vm.css = Knockout.computed(function() {
            var exam = vm.exam();
            var navigateMode = exam.exam.settings.navigateMode;
            var classes = {
                'show-nav': exam.viewType()=='question', 
                'show-sidebar': navigateMode=='sequence' || navigateMode=='diagnostic',
                'no-printing': !exam.allowPrinting(),
                'info-page': exam.viewType() == 'infopage'
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
            var rgb = parseRGB(backgroundColour);
            var hsl = RGBToHSL(rgb[0],rgb[1],rgb[2]);
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
        $('#confirm-modal.modal-body').html(msg);
        $('#confirm-modal').modal('show');
    },

    /** Compare two strings, ignoring differences in case.
     * Does not ignore differences in accent, even where
     * base characters are identical
    *
    * @param {string} a - reference string
    * @param {string} b - comparison string
    * @returns {boolean}
    */
    caselessCompare: function (a,b) {
        return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
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
        if (Numbas.display.caselessCompare(display.viewModel.confirm_end.confirmation(), R('control.end end'))) {
            fOK();
        }
      };
       this.modal.cancel = fnCancel || function(){};
       $('#confirm-end-exam-modal-message').html(msg);
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
    }
};

/** Parse a colour in hexadecimal RGB format into separate red, green and blue components.
 *
 * @param {string} hex - The hex string representing the colour, in the form `#000000`.
 * @returns {Array.<number>} - An array of the form `[r,g,b]`.
 */
function parseRGB(hex) {
    var r = parseInt(hex.slice(1,3));
    var g = parseInt(hex.slice(3,5));
    var b = parseInt(hex.slice(5,7));
    return [r,g,b];
}

/** Convert a colour given in red, green, blue components to hue, saturation, lightness.
 * From https://css-tricks.com/converting-color-spaces-in-javascript/.
 *
 * @param {number} r - The red component.
 * @param {number} g - The green component.
 * @param {number} b - The blue component.
 * @returns {Array.<number>} - The colour in HSL format, an array of the form `[h,s,l]`.
 * */
function RGBToHSL(r,g,b) {
    r /= 255;
    g /= 255;
    b /= 255;

    var cmin = Math.min(r,g,b);
    var cmax = Math.max(r,g,b);
    var delta = cmax - cmin;

    var h,s,l;

    if (delta == 0) {
        h = 0;
    } else if (cmax == r) {
        h = ((g - b) / delta) % 6;
    } else if (cmax == g) {
        h = (b - r) / delta + 2;
    } else {
        h = (r - g) / delta + 4;
    }

    h = (h*60) % 360;

    if (h < 0) {
        h += 360;
    }

    l = (cmax + cmin) / 2;

    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return [h,s,l];
}

/** Convert a colour in hue, saturation, lightness format to red, green, blue.
 * From https://css-tricks.com/converting-color-spaces-in-javascript/.
 *
 * @param {number} h - The hue component.
 * @param {number} s - The saturation component.
 * @param {number} l - The lightness component.
 * @returns {Array.<number>} - An array of the form `[r,g,b]`.
 */
function HSLToRGB(h,s,l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c/2;

    var r,g,b;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;  
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    r = (r + m) * 255;
    g = (g + m) * 255;
    b = (b + m) * 255;

    return [r,g,b];
}

var measurer;
var measureText_cache = {};
display.measureText = function(element) {
    var styles = window.getComputedStyle(element);

    if(!measurer) {
        measurer = document.createElement('div');
        measurer.style['position'] = 'absolute';
        measurer.style['left'] = '-10000';
        measurer.style['top'] = '-10000';
        measurer.style['visibility'] = 'hidden';
    }

    var keys = ['font-size','font-style', 'font-weight', 'font-family', 'line-height', 'text-transform', 'letter-spacing'];
    var id = element.value+';'+keys.map(function(key) { return styles[key]; }).join(';');
    if(measureText_cache[id]) {
        return measureText_cache[id];
    }
    keys.forEach(function(key) {
        measurer.style[key] = styles[key];
    });
    measurer.textContent = element.value;
    document.body.appendChild(measurer);
    var box = measurer.getBoundingClientRect();
    measureText_cache[id] = box;
    document.body.removeChild(measurer);
    return box;
}

/** An object which can produce feedback: {@link Numbas.Question} or {@link Numbas.parts.Part}.
 *
 * @typedef {object} Numbas.display.feedbackable
 * @property {observable.<boolean>} answered - Has the object been answered?
 * @property {observable.<boolean>} isDirty - Has the student's answer changed?
 * @property {observable.<number>} score - Number of marks awarded
 * @property {observable.<number>} marks - Number of marks available
 * @property {observable.<number>} credit - Proportion of available marks awarded
 * @property {observable.<boolean>} doesMarking - Does the object do any marking?
 * @property {observable.<boolean>} revealed - Have the correct answers been revealed?
 * @property {boolean} plainScore - Show the score without the "Score: " prefix?
 */
/** Settings for {@link Numbas.display.showScoreFeedback}
 *
 * @typedef {object} Numbas.display.showScoreFeedback_settings
 * @property {boolean} showTotalMark - Show the total marks available?
 * @property {boolean} showActualMark - Show the student's current score?
 * @property {boolean} showAnswerState - Show the correct/incorrect state after marking?
 * @property {boolean} reviewShowScore - Show the score once answers have been revealed?
 */
/** Feedback states for a question or part: "wrong", "correct", "partial" or "none".
 *
 * @typedef {string} Numbas.display.feedback_state
 */
/** A model representing feedback on an item which is marked - a question or a part.
 *
 * @typedef {object} Numbas.display.scoreFeedback
 * @property {observable.<boolean>} update - Call `update(true)` when the score changes. Used to trigger animations.
 * @property {observable.<Numbas.display.feedback_state>} state - The current state of the item, to be shown to the student.
 * @property {observable.<boolean>} answered - Has the item been answered? False if the student has changed their answer since submitting.
 * @property {observable.<string>} answeredString - Translated text describing how much of the item has been answered: 'unanswered', 'partially answered' or 'answered'
 * @property {observable.<string>} message - Text summarising the state of the item.
 * @property {observable.<string>} iconClass - CSS class for the feedback icon.
 * @property {observable.<object>} iconAttr - A dictionary of attributes for the feedback icon.
 */
/** Update a score feedback box.
 *
 * @param {Numbas.display.feedbackable} obj - Object to show feedback about.
 * @param {Numbas.display.showScoreFeedback_settings} settings
 * @memberof Numbas.display
 * @returns {Numbas.display.scoreFeedback}
 */
var showScoreFeedback = display.showScoreFeedback = function(obj,settings)
{
    var niceNumber = Numbas.math.niceNumber;
    var scoreDisplay = '';
    var newScore = Knockout.observable(false);
    var answered = Knockout.computed(function() {
        return obj.answered();
    });
    var attempted = Knockout.computed(function() {
        return obj.visited!==undefined && obj.visited();
    });
    var showFeedbackIcon = settings.showFeedbackIcon === undefined ? settings.showAnswerState : settings.showFeedbackIcon;
    var anyAnswered = Knockout.computed(function() {
        if(obj.anyAnswered===undefined) {
            return answered();
        } else {
            return obj.anyAnswered();
        }
    });
    var partiallyAnswered = Knockout.computed(function() {
        return anyAnswered() && !answered();
    },this);
    var revealed = Knockout.computed(function() {
        return (obj.revealed() && settings.reviewShowScore) || Numbas.is_instructor;
    });
    var state = Knockout.computed(function() {
        var score = obj.score();
        var marks = obj.marks();
        var credit = obj.credit();
        if( obj.doesMarking() && showFeedbackIcon && (revealed() || (settings.showAnswerState && anyAnswered())) ) {
            if(credit<=0) {
                return 'wrong';
            } else if(Numbas.math.precround(credit,10)>=1) {
                return 'correct';
            } else {
                return 'partial';
            }
        }
        else {
            return 'none';
        }
    });
    var messageIngredients = ko.computed(function() {
        var score = obj.score();
        var marks = obj.marks();
        var scoreobj = {
            marks: marks,
            score: score,
            marksString: niceNumber(marks)+' '+R('mark',{count:marks}),
            scoreString: niceNumber(score)+' '+R('mark',{count:score}),
        };
        var messageKey;
        if(marks==0) {
            messageKey = 'question.score feedback.not marked';
        } else if(!revealed()) {
            if(settings.showActualMark) {
                if(settings.showTotalMark) {
                    messageKey = 'question.score feedback.score total actual';
                } else {
                    messageKey = 'question.score feedback.score actual';
                }
            } else if(settings.showTotalMark) {
                messageKey = 'question.score feedback.score total';
            } else {
                var key = answered () ? 'answered' : anyAnswered() ? 'partially answered' : 'unanswered';
                messageKey = 'question.score feedback.'+key;
            }
        } else {
            messageKey = 'question.score feedback.score total actual';
        }
        return {key: messageKey, scoreobj: scoreobj};
    });
    return {
        update: Knockout.computed({
            read: function() {
                return newScore();
            },
            write: function() {
                newScore(true);
                newScore(false);
            }
        }),
        revealed: revealed,
        state: state,
        answered: answered,
        answeredString: Knockout.computed(function() {
            if((obj.marks()==0 && !obj.doesMarking()) || !(revealed() || settings.showActualMark || settings.showTotalMark)) {
                return '';
            }
            var key = answered() ? 'answered' : partiallyAnswered() ? 'partially answered' : 'unanswered';
            return R('question.score feedback.'+key);
        },this),
        attemptedString: Knockout.computed(function() {
            var key = attempted() ? 'attempted' : 'unattempted';
            return R('question.score feedback.'+key);
        },this),
        message: Knockout.computed(function() {
            var ingredients = messageIngredients();
            return R(ingredients.key,ingredients.scoreobj);
        }),
        plainMessage: Knockout.computed(function() {
            var ingredients = messageIngredients();
            var key = ingredients.key;
            if(key=='question.score feedback.score total actual' || key=='question.score feedback.score actual') {
                key += '.plain';
            }
            return R(key,ingredients.scoreobj);
        }),
        iconClass: Knockout.computed(function() {
            if (!showFeedbackIcon) {
                return 'invisible';
            }
            switch(state()) {
            case 'wrong':
                return 'icon-remove';
            case 'correct':
                return 'icon-ok';
            case 'partial':
                return 'icon-ok partial';
            default:
                return '';
            }
        }),
        iconAttr: Knockout.computed(function() {
            return {title:state()=='none' ? '' : R('question.score feedback.'+state())};
        })
    }
};
});
