Numbas.queueScript('display-util', ['math'], function() {
    var measurer;
    var measureText_cache = {};

    /**
     * Measure the size of the text in the given input element.
     * Measurements are cached by text value and relevant styles.
     *
     * @param {Element} element
     * @returns {DOMRect}
     */
    function measureText(element) {
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

    /** Resolve a feedback setting, returning a boolean representing whether the feedback should currently be shown.
     *
     * @param {Numbas.display_util.feedbackable} obj
     * @param {string} setting - One of `["always", "oncompletion", "inreview", "never"]`.
     * @returns {boolean}
     */
    function resolve_feedback_setting(obj, setting) {
        return Knockout.pureComputed(function() {
            if(Numbas.is_instructor) {
                return true;
            }

            switch(setting) {
                case 'always':
                    return true;
                case 'oncompletion':
                    return obj.ended();
                case 'inreview':
                    return obj.revealed();
                case 'never':
                    return false;
            }
        });
    }

    /** An object which can produce feedback: {@link Numbas.Question} or {@link Numbas.parts.Part}.
     *
     * @typedef {object} Numbas.display_util.feedbackable
     * @property {observable.<boolean>} answered - Has the object been answered?
     * @property {observable.<boolean>} isDirty - Has the student's answer changed?
     * @property {observable.<number>} score - Number of marks awarded
     * @property {observable.<number>} marks - Number of marks available
     * @property {observable.<number>} credit - Proportion of available marks awarded
     * @property {observable.<boolean>} doesMarking - Does the object do any marking?
     * @property {observable.<boolean>} revealed - Have the correct answers been revealed?
     * @property {observable.<boolean>} ended - Has the exam ended?
     */
    /** Settings for {@link Numbas.display_util.showScoreFeedback}
     *
     * @typedef {object} Numbas.display_util.showScoreFeedback_settings
     * @property {string} showTotalMark - When to show the total marks available.
     * @property {string} showActualMark - When to show the student's current score.
     * @property {string} showAnswerState - When to show the correct/incorrect state after marking.
     * @property {boolean} [reveal_answers_for_instructor=true] - When `Numbas.is_instructor` is true, always act as if the object has been revealed?
     */
    /** Feedback states for a question or part: "wrong", "correct", "partial" or "none".
     *
     * @typedef {string} Numbas.display_util.feedback_state
     */
    /** A model representing feedback on an item which is marked - a question or a part.
     *
     * @typedef {object} Numbas.display_util.scoreFeedback
     * @property {observable.<boolean>} update - Call `update(true)` when the score changes. Used to trigger animations.
     * @property {observable.<boolean>} revealed - Have the correct answers been revealed?
     * @property {observable.<Numbas.display_util.feedback_state>} state - The current state of the item, to be shown to the student.
     * @property {observable.<boolean>} showActualMark - Should the current score be shown?
     * @property {observable.<boolean>} showTotalMark - Should the total available marks be shown?
     * @property {observable.<boolean>} answered - Has the item been answered? False if the student has changed their answer since submitting.
     * @property {observable.<string>} answeredString - Translated text describing how much of the item has been answered: 'unanswered', 'partially answered' or 'answered'
     * @property {observable.<string>} attemptedString - Translated text describing whether the item has been answered.
     * @property {observable.<string>} message - Text summarising the state of the item.
     * @property {observable.<string>} plainMessage - Plain text summarising the state of the item.
     * @property {observable.<string>} iconClass - CSS class for the feedback icon.
     * @property {observable.<object>} iconAttr - A dictionary of attributes for the feedback icon.
     */

    /** Update a score feedback box.
     *
     * @param {Numbas.display_util.feedbackable} obj - Object to show feedback about.
     * @param {Numbas.display_util.showScoreFeedback_settings} settings
     * @memberof Numbas.display
     * @returns {Numbas.display_util.scoreFeedback}
     */
    function showScoreFeedback(obj,settings)
    {
        var niceNumber = Numbas.math.niceNumber;
        var newScore = Knockout.observable(false);
        var answered = Knockout.computed(function() {
            return obj.answered && obj.answered();
        });
        var attempted = Knockout.computed(function() {
            return obj.visited!==undefined && obj.visited();
        });

        var showActualMark = resolve_feedback_setting(obj, settings.showActualMark);
        var showTotalMark = resolve_feedback_setting(obj, settings.showTotalMark);
        var showAnswerState = resolve_feedback_setting(obj, settings.showAnswerState);

        var revealed = Knockout.computed(function() {
            return (obj.revealed() && showActualMark()) || (Numbas.is_instructor && settings.reveal_answers_for_instructor!==false);
        });

        var showFeedbackIcon = settings.showFeedbackIcon === undefined ? showAnswerState() : settings.showFeedbackIcon;

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
        var state = Knockout.computed(function() {
            var credit = obj.credit();
            if( obj.doesMarking() && showFeedbackIcon && (revealed() || (showAnswerState() && anyAnswered())) ) {
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
        var messageIngredients = Knockout.computed(function() {
            var score = obj.score();
            var marks = obj.marks();
            var scoreobj = {
                marks: marks,
                score: score,
                marksString: niceNumber(marks)+' '+R('mark',{count:parseFloat(marks)}),
                scoreString: niceNumber(score)+' '+R('mark',{count:parseFloat(score)}),
            };
            var messageKey;

            if(marks==0) {
                messageKey = 'question.score feedback.not marked';
            } else {
                if(showActualMark()) {
                    if(showTotalMark()) {
                        messageKey = 'question.score feedback.score total actual';
                    } else {
                        messageKey = 'question.score feedback.score actual';
                    }
                } else if(showTotalMark()) {
                    messageKey = 'question.score feedback.score total';
                } else {
                    var key = answered () ? 'answered' : anyAnswered() ? 'partially answered' : 'unanswered';
                    messageKey = 'question.score feedback.'+key;
                }
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
            showActualMark: showActualMark,
            showTotalMark: showTotalMark,
            showAnswerState: showAnswerState,
            answered: answered,
            answeredString: Knockout.computed(function() {
                if(obj.marks()==0 && !obj.doesMarking())  {
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
                    return 'invisible';
                }
            }),
            iconAttr: Knockout.computed(function() {
                return {title:state()=='none' ? '' : R('question.score feedback.'+state())};
            })
        }
    };

    /** An object that handles validating a password.
     *
     * @param {{settings: Function, correct_message: string, incorrect_message: string}} settings
     * @returns {{value: observable.<string>, valid: observable.<boolean>, feedback: observable.<object>}}
     */
    function passwordHandler(settings) {
        var value = Knockout.observable('');

        var valid = Knockout.computed(function() {
            return settings.accept(value());
        });

        return {
            value: value,
            valid: valid,
            feedback: Knockout.computed(() => {
                if(valid()) {
                    return {iconClass: 'icon-ok', title: settings.correct_message, buttonClass: 'success'};
                } else if(value()=='') {
                    return {iconClass: '', title: '', buttonClass: 'primary'}
                } else {
                    return {iconClass: 'icon-remove', title: settings.incorrect_message, buttonClass: 'danger'};
                }
            })
        };
    }

    /** Localise strings in page HTML - for tags with an attribute `data-localise`, run that attribute through R.js to localise it, and replace the tag's HTML with the result.
     *
     * @param {Element} root
     */
    function localisePage(root) {
        for(let e of root.querySelectorAll('[data-localise]')) {
            const localString = R(e.getAttribute('data-localise'));
            e.innerHTML = localString;
        }
        for(let e of root.querySelectorAll('[localise-aria-label]')) {
            const localString = R(e.getAttribute('localise-aria-label'));
            e.setAttribute('aria-label', localString);
        }
    }

    /** Get the attribute with the given name or, if it doesn't exist, look for localise-<name>.
     * If that exists, localise its value and set the desired attribute, then return it.
     *
     * @param {Element} elem
     * @param {string} name
     * @returns {string}
     */
    function getLocalisedAttribute(elem, name) {
        var attr_localise;
        var attr = elem.getAttribute(name);
        if(!attr && (attr_localise = elem.getAttribute('localise-'+name))) {
            attr = R(attr_localise);
            elem.setAttribute(name,attr);
        }
        return attr;
    }

    /** 
     * Move focus to this element.
     * An element which isn't in the tabbing order can't receive focus, but it can be helpful to move the caret position to the top of a container element.
     * This function temporarily sets tabIndex on the given element, focuses it, then restores the original tabIndex.
     *
     * @param {Element} element
     */
    function force_focus(element) {
        const ot = element.tabIndex;
        element.tabIndex = 0;
        element.focus();
        element.tabIndex = ot;
    }

    /** 
     * A Knockout observable representing a duration of time.
     * The main observable is a number representing the duration in seconds.
     * Computed attributes `display` and `machine` are string renderings of the duration for display or machine-reading.
     *
     * @param {number} initial
     * @returns {observable.<number>}
     */
    function duration_observable(initial) {
        const obs = Knockout.observable(initial);
        obs.display = Knockout.computed(function() {
            return Numbas.timing.secsToDisplayTime(Math.max(0,obs()));
        });
        obs.machine = Knockout.computed(function() {
            return Numbas.timing.secsToMachineDuration(Math.max(0,obs()));
        });
        return obs;
    }

    /** 
     * Find the JME scope that applies to this element.
     * Looks for an element with a `jme_scope` attribute.
     * 
     * @param {Element} element
     * @returns {Numbas.jme.Scope}
     */
    function find_jme_scope(element) {
        while(element) {
            if(element.jme_scope !== undefined) {
                return element.jme_scope;
            }
            element = element.parentElement;
        }
    }

    /** Associate a JME scope with the given element.
     *
     * @param {Element} element
     * @param {Numbas.jme.Scope} scope
     */
    function set_jme_scope(element, scope) {
        element.jme_scope = scope;
    }


    /**
     * Find the element's top ancestor node. For elements in the document, this will be the document object itself.
     *
     * @param {Element} element
     * @returns {Node}
     */
    function find_root_ancestor(element) {
        while(element.parentNode) {
            element = element.parentNode;
        }
        return element;
    }

    Numbas.display_util = { 
        measureText,
        showScoreFeedback,
        passwordHandler,
        localisePage,
        getLocalisedAttribute,
        resolve_feedback_setting,
        force_focus,
        duration_observable,
        find_jme_scope,
        set_jme_scope,
        find_root_ancestor,
    };
});
