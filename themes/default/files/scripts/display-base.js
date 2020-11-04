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
        // hide the side nav when you click a question selector
        $('.question-nav').on('click','#navMenu.in .questionSelector a',function() {
        });
        // bind buttons in the modals
        $('.modal button.ok').on('click',function() {
            display.modal.ok();
            display.modal.ok = display.modal.cancel = function() {};
        })
        $('#confirm-modal,#alert-modal').on('shown.bs.modal',function() {
            $(this).find('.modal-footer .ok').focus();
        });
        $('.modal button.cancel').on('click',function() {
            display.modal.cancel();
            display.modal.ok = display.modal.cancel = function() {};
        })

        var lightbox = document.querySelector('#lightbox');
        /** Show the lightbox.
         */
        function show_lightbox() {
            lightbox.classList.add('shown');
            lightbox.focus();
        }
        /** Hide the lightbox.
         *
         */
        function hide_lightbox() {
            lightbox.classList.remove('shown');
            lightbox.innerHTML = '';
        }
        $('#questionDisplay').on('click','img,object',function(e) {
            var elem = e.target.cloneNode();
            elem.removeAttribute('width');
            elem.removeAttribute('height');
            var box = e.target.getBoundingClientRect();
            if(elem.width>box.width || elem.height>box.height) {
                lightbox.innerHTML = '';
                lightbox.appendChild(elem);
                show_lightbox();
            }
        });
        lightbox.addEventListener('click',hide_lightbox);
        document.body.addEventListener('keyup',function() {
            if(lightbox.classList.contains('shown')) {
                hide_lightbox();
            }
        });

        this.viewModel = {
            exam: Knockout.observable(Numbas.exam.display)
        }
        
        this.setExam(Numbas.exam);
        Knockout.applyBindings(this.viewModel);
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
     * @type {object.<Function>}
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
        $('#alert-modal .modal-footer .ok').focus();
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
                Numbas.jme.variables.DOMcontentsubvars(html,scope);
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
//get size of contents of an input
//from http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
$.textMetrics = function(el) {
    var h = 0, w = 0;
    var div = document.createElement('div');
    document.body.appendChild(div);
    $(div).css({
        position: 'absolute',
        left: -1000,
        top: -1000,
        display: 'none'
    });
    var val = $(el).val();
    val = val.replace(/ /g,'&nbsp;');
    $(div).html(val);
    var styles = ['font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing'];
    $(styles).each(function() {
        var s = this.toString();
        $(div).css(s, $(el).css(s));
    });
    h = $(div).outerHeight();
    w = $(div).outerWidth();
    $(div).remove();
    var ret = {
     height: h,
     width: w
    };
    return ret;
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
            return {title:R('question.score feedback.'+state())};
        })
    }
};
});
