Numbas.queueScript('display-base',['controls','math','xml','util','timing','jme','jme-display'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
/** @namespace Numbas.display */
var display = Numbas.display = /** @lends Numbas.display */ {
    /** Localise strings in page HTML - for tags with an attribute `data-localise`, run that attribute through R.js to localise it, and replace the tag's HTML with the result
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
     * @param {String} name
     * @returns {String}
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
    /** Update the progress bar when loading
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
        Knockout.applyBindings(Numbas.exam.display);
        for(var i=0;i<Numbas.exam.questionList.length;i++) {
            Numbas.exam.display.applyQuestionBindings(Numbas.exam.questionList[i]);
        }
        $(document).keydown( function(e)
        {
            if(!Numbas.exam.inProgress) { return; }
            if($('input:focus').length || $('#jqibox').is(':visible'))
                return;
            switch(e.keyCode)
            {
            case 37:
                Numbas.controls.previousQuestion();
                break;
            case 39:
                Numbas.controls.nextQuestion();
                break;
            }
        });
        Numbas.exam.display.questions().map(function(q) {
            q.init();
        });
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
    },
    /** Does an input element currently have focus?
     * @type {Boolean}
     */
    inInput: false,
    //alert / confirm boxes
    //
    /** Callback functions for the modals
     * @type {Object.<function>}
     */
    modal: {
        ok: function() {},
        cancel: function() {}
    },
    /** Show an alert dialog
     * @param {String} msg - message to show the user
     * @param {function} fnOK - callback when OK is clicked
     */
    showAlert: function(msg,fnOK) {
        fnOK = fnOK || function() {};
        this.modal.ok = fnOK;
        $('#alert-modal .modal-body').html(msg);
        $('#alert-modal').modal('show');
        $('#alert-modal .modal-footer .ok').focus();
    },
    /** Show a confirmation dialog box
     * @param {String} msg - message to show the user
     * @param {function} fnOK - callback if OK is clicked
     * @param {function} fnCancel - callback if cancelled
     */
    showConfirm: function(msg,fnOK,fnCancel) {
        this.modal.ok = fnOK || function(){};
        this.modal.cancel = fnCancel || function(){};
        $('#confirm-modal .modal-body').html(msg);
        $('#confirm-modal').modal('show');
    },
    /** Make MathJax typeset any maths in the selector
     * @param {jQuery|Element} [selector] - elements to typeset. If not given, the whole page is typeset
     * @param {function} callback - function to call when typesetting is finished
     */
    typeset: function(selector,callback)
    {
        try
        {
            if(!selector)
                selector = $('body');
            $(selector).each(function(i,elem) {
                display.MathJaxQueue.Push(['Typeset',MathJax.Hub,elem]);
            });
            if(callback)
                display.MathJaxQueue.Push(callback);
        }
        catch(e)
        {
            if(MathJax===undefined && !display.failedMathJax)
            {
                display.failedMathJax = true;
                display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
            }
            else
            {
                Numbas.showError(e);
            }
        };
    },
    /** The Numbas exam has failed so much it can't continue - show an error message and the error
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
 * @typedef {Object} Numbas.display.feedbackable
 * 	@property {observable.<Boolean>} answered - has the object been answered?
 * 	@property {observable.<Boolean>} isDirty - has the student's answer changed?
 * 	@property {observable.<Number>} score - number of marks awarded
 *  @property {observable.<Number>} marks - number of marks available
 *  @property {observable.<Number>} credit - proportion of available marks awarded
 *  @property {observable.<Boolean>} doesMarking - does the object do any marking?
 *	@property {observable.<Boolean>} revealed - have the correct answers been revealed?
 */
/** Settings for {@link Numbas.display.showScoreFeedback}
 * @typedef {Object} Numbas.display.showScoreFeedback_settings
 * @property {Boolean} showTotalMark - Show the total marks available?
 * @property {Boolean} showActualMark - Show the student's current score?
 * @property {Boolean} showAnswerState - Show the correct/incorrect state after marking?
 */
/** Feedback states for a question or part: "wrong", "correct", "partial" or "none".
 * @typedef {String} Numbas.display.feedback_state
 */
/** A model representing feedback on an item which is marked - a question or a part.
 * @typedef {Object} Numbas.display.scoreFeedback
 * @property {observable.<Boolean>} update - Call `update(true)` when the score changes. Used to trigger animations.
 * @property {observable.<Numbas.display.feedback_state>} state - The current state of the item, to be shown to the student.
 * @property {observable.<Boolean>} answered - Has the item been answered? False if the student has changed their answer since submitting.
 * @property {observable.<String>} message - Text summarising the state of the item.
 * @property {observable.<String>} iconClass - CSS class for the feedback icon.
 * @property {observable.<Object>} iconAttr - A dictionary of attributes for the feedback icon.
 */
/** Update a score feedback box
 * @param {Numbas.display.feedbackable} obj - object to show feedback about
 * @param {Numbas.display.showScoreFeedback_settings} settings
 * @memberof Numbas.display
 * @returns Numbas.display.scoreFeedback
 */
var showScoreFeedback = display.showScoreFeedback = function(obj,settings)
{
    var niceNumber = Numbas.math.niceNumber;
    var scoreDisplay = '';
    var newScore = Knockout.observable(false);
    var answered = Knockout.computed(function() {
        return !obj.isDirty() && (obj.answered() || obj.credit()>0);
    });
    var state = Knockout.computed(function() {
        var revealed = obj.revealed(), score = obj.score(), marks = obj.marks(), credit = obj.credit();
        if( obj.doesMarking() && settings.showFeedbackIcon && (revealed || (settings.showAnswerState && answered())) ) {
            if(credit<=0) {
                return 'wrong';
            } else if(credit==1) {
                return 'correct';
            } else {
                return 'partial';
            }
        }
        else {
            return 'none';
        }
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
        state: state,
        answered: answered,
        message: Knockout.computed(function() {
            var revealed = obj.revealed(), score = obj.score(), marks = obj.marks();
            var scoreobj = {
                marks: marks,
                score: score,
                marksString: niceNumber(marks)+' '+R('mark',{count:marks}),
                scoreString: niceNumber(score)+' '+R('mark',{count:score})
            };
            if(revealed && !answered()) {
                return R('question.score feedback.unanswered');
            } else if(answered() && obj.doesMarking() && marks>0) {
                var str = 'question.score feedback.answered'
                            + (revealed || settings.showTotalMark ? ' total' : '')
                            + (revealed || settings.showActualMark ? ' actual' : '')
                return R(str,scoreobj);
            } else if(revealed || settings.showTotalMark) {
                return R('question.score feedback.unanswered total',scoreobj);
            }
            else
                return '';
        }),
        iconClass: Knockout.computed(function() {
            if (!settings.showFeedbackIcon) {
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
