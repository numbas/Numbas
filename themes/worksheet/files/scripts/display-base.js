Numbas.queueScript('display-base',['controls','math','xml','util','timing','jme','jme-display','schedule'],function() {
var util = Numbas.util;
var jme = Numbas.jme;

var job = Numbas.schedule.add;

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
    
        var vm = display.worksheets = new WorksheetDisplay();
        Knockout.applyBindings(vm,document.getElementById('everything'));

    },
    //alert / confirm boxes
    //
    /** Callback functions for the modals.
     *
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
        html.setAttribute('data-jme-context-description',contextDescription);
        var promise = new Promise(function(resolve, reject) {
            try {
                Numbas.jme.variables.DOMcontentsubvars(html,scope);
            } catch(e) {
                throw(new Error(contextDescription+': '+e.message));
            }
            // make mathjax process the question text (render the maths)
            Numbas.display.typeset(html);
            resolve(html);
        });

        return promise;
    },


    /** The Numbas exam has failed so much it can't continue - show an error message and the error.
     *
     * @param {Error} e
     */
    die: function(e) {
        var message = (e || e.message)+'';
        var stack = e.stack.replace(/\n/g,'<br>\n');
        Numbas.debug(message+' <br> '+stack);
        //hide all the non-error stuff
        $('.mainDisplay > *,#loading,#everything').hide();
        //show the error stuff
        $('#die').show();
        $('#die .error .message').html(message);
        $('#die .error .stack').html(stack);
    }
};

var WorksheetDisplay = Numbas.display.WorksheetDisplay = function() {
    this.numExams = ko.observable(1);
    this.sheetTypes = [
        {name: 'questionsheet', label: 'Question sheets'},
        {name: 'answersheet', label: 'Answer sheets'}
    ];
    this.sheetType = ko.observable(this.sheetTypes[0]);
    this.exams = ko.observableArray([]);
    this.progressText = ko.observable('');
    this.offset = ko.observable(0);
}
WorksheetDisplay.prototype = {
    generate: function() {
        var w = this;

        this.exams([]);
        var examList = document.getElementById('examList');
        examList.innerHTML = '';

        var offset = parseInt(this.offset());
        var numExams = parseInt(this.numExams());
        this.progressText('');

        function make(n) {
            var e = new GeneratedExam(offset+n);
            w.exams.push(e);
            if(n<numExams-1) {
                e.exam.signals.on('question variables generated', function() {
                    make(n+1);
                });
            } else {
                Promise.all(w.exams().map(function(ge){ return ge.exam.signals.getCallback('HTML attached').promise })).then(function() {
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
    }
};

function GeneratedExam(offset) {
    var ge = this;
    this.id = offset;
    Math.seedrandom(offset);
    this.progressText = ko.observable('Working...');
    var xml = Numbas.xml.examXML.selectSingleNode('/exam');
    var exam = this.exam = Numbas.createExamFromXML(xml,null,true);
    exam.id = offset;
    job(exam.init,exam);
    exam.settings.showActualMark = false;
    exam.settings.showAnswerState = false;
    exam.signals.on('question list initialised', function() {
        ge.progressText('Done');
        exam.questionList.forEach(function(q) {
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
    });
}


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
