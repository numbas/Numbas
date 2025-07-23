Numbas.queueScript('part-display',['display-util', 'display-base','util','jme'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    var util = Numbas.util;
    /** Display methods for a generic question part.
     *
     * @name PartDisplay
     * @memberof Numbas.display
     * @class
     * @param {Numbas.parts.Part} p - The associated part object.
     */
    display.PartDisplay = function(p)
    {
        var pd = this;
        /** The associated part object.
         *
         * @member {Numbas.parts.Part} part
         * @memberof Numbas.display.PartDisplay
         */
        this.part = p;
        /** The display name of this part.
         *
         * @member {observable|string} name
         * @memberof Numbas.display.PartDisplay
         * @see Numbas.parts.Part#name
         */
        this.name = Knockout.observable('');
        /** Title text for this part's answer input.
         *
         * @member {observable.<string>} input_title
         * @memberof Numbas.display.PartDisplay
         */
        this.input_title = Knockout.computed(function() {
            return R('part.input title',{name: this.name()});
        },this);

        this.feedback_title = Knockout.computed(function() {
            return R('part.feedback title',{name: this.name()});
        }, this);

        /** Should the name of this part be displayed?
         *
         * @member {observable|boolean} showName
         * @memberof Numbas.display.PartDisplay
         */
        this.showName = Knockout.computed(function() {
            return this.name() && !this.part.isGap && (this.part.question.partsMode=='all' || this.revealed());
        },this);

        /** The question this part belongs to.
         *
         * @member {Numbas.Question} question
         * @memberof Numbas.display.PartDisplay
         */
        this.question = p.question;

        /** Should this part be shown?
         *
         * @member {boolean} visible
         * @memberof Numbas.display.PartDisplay
         */
        this.visible = Knockout.computed(function() {
            switch(this.question.partsMode) {
                case 'all':
                    return true;
                case 'explore':
                    var part = this.part;
                    while(part.parentPart) {
                        part = part.parentPart;
                    }
                    return this.question.display.currentPart()==part.display || this.question.exam.display.mode() == 'review';
            }
        },this);

        /** The student's current score.
         *
         * @see Numbas.parts.Part#score
         * @member {observable|number} score
         * @memberof Numbas.display.PartDisplay
         */
        this.score = Knockout.observable(p.score);
        /** The total marks available for this part.
         *
         * @see Numbas.parts.Part#marks
         * @member {observable|number} marks
         * @memberof Numbas.display.PartDisplay
         */
        this.marks = Knockout.observable(p.marks);
        /** Proportion of available marks awarded to the student - i.e. `score/marks`. Penalties will affect this instead of the raw score, because of things like the steps marking algorithm.
         *
         * @member {observable|number} credit
         * @memberof Numbas.display.PartDisplay
         */
        this.credit = Knockout.observable(p.credit);
        /** Does this part do any marking?
         *
         * @member {observable|boolean} doesMarking
         * @see Numbas.parts.Part#doesMarking
         * @memberof Numbas.display.PartDisplay
         */
        this.doesMarking = Knockout.observable(p.doesMarking);
        /** Has the student answered this part?
         *
         * @member {observable|boolean} answered
         * @memberof Numbas.display.PartDisplay
         */
        this.answered = Knockout.observable(p.answered);
        /** Has the student changed their answer since the last submission?
         *
         * @member {observable|boolean} isDirty
         * @memberof Numbas.display.PartDisplay
         */
        this.isDirty = Knockout.observable(false);

        this.isDirty.subscribe(function() {
            if(!pd.isDirty()) {
                return;
            }
            setTimeout(function() {
                pd.controls.auto_submit();
            }, 1000);
        });

        /** Is this part waiting for some pre-submit tasks to finish before submitting?
         *
         * @member {observable|boolean} waiting_for_pre_submit
         * @memberof Numbas.display.PartDisplay
         */
        this.waiting_for_pre_submit = Knockout.observable(false);

        var _warnings = Knockout.observableArray([]);

        /** Warnings based on the student's answer.
         *
         * @member {observable | Array.<Object<string>>} warnings
         * @memberof Numbas.display.PartDisplay
         */
        this.warnings = Knockout.computed({
            read: function() {
                return _warnings().filter(function(w) { return util.isNonemptyHTML(w.message); });
            },
            write: _warnings
        });
        this.warnings.push = function() {
            return _warnings.push.apply(_warnings,arguments);
        }

        /** Does the part have any warnings to show?
         * Changes to false immediately.
         * Only changes to true after a delay if the part is dirty, but immediately if the part is not (i.e. it's just been submitted).
         *
         * @member {observable|boolean} hasWarnings
         */
        this.hasWarnings = Knockout.observable(false);
        var lastWarningReset;
        Knockout.computed(function() {
            if(this.warnings().length==0) {
                this.hasWarnings(false);
                if(lastWarningReset) {
                    clearTimeout(lastWarningReset);
                    lastWarningReset = null;
                }
            }
        },this);
        Knockout.computed(function() {
            if(this.warnings().length>0) {
                if(lastWarningReset) {
                    clearTimeout(lastWarningReset);
                }
                if(this.isDirty()) {
                    lastWarningReset = setTimeout(function() {
                        pd.hasWarnings(true);
                    },500);
                } else {
                    pd.hasWarnings(true);
                }
            }
        },this);

        var _warningsShown = Knockout.observable(false);
        /** Should the warning box be shown?
         *
         * @member {observable|boolean} warningsShown
         * @memberof Numbas.display.PartDisplay
         */
        this.warningsShown = Knockout.computed({
            read: function() {
                return this.hasWarnings() && (_warningsShown() || this.alwaysShowWarnings);
            },
            write: function(v) {
                return _warningsShown(v);
            }
        },this);

        function position_warnings() {
            if(!pd.html || !pd.warningsShown.peek()) {
                return;
            }
            var margin = 10;

            var warnings_box = pd.html.querySelector(':scope > .student-answer .warnings');
            var answer = pd.html.querySelector(':scope > .student-answer');
            var offsetTop = 0;
            var offsetLeft = 0;
            var el = answer;
            while(el.offsetParent && !el.classList.contains('question')) {
                offsetTop += el.offsetTop;
                offsetLeft += el.offsetLeft;
                el = el.offsetParent;
            }
            var answer_height = answer.getBoundingClientRect().height;
            var answer_width = answer.getBoundingClientRect().width;

            var wtop = offsetTop + (p.isGap ? 0 : answer_height);
            var wleft = (offsetLeft + (p.isGap ? margin + answer_width : 0));

            warnings_box.style.top = wtop + 'px';
            warnings_box.style.left = wleft + 'px';

            var box = warnings_box.getBoundingClientRect();
            const question_html = pd.part.question.display.html;
            var question_box = question_html.getBoundingClientRect();
            var docWidth = question_box.width;
            var dr = box.right - question_box.left - docWidth + margin;
            warnings_box.classList.remove('shifted-down');
            if(dr > 0) {
                wleft -= dr;
                if(p.isGap) {
                    wtop += answer_height;
                    warnings_box.classList.add('shifted-down');
                }
                warnings_box.style.left = wleft + 'px';
                warnings_box.style.top = wtop + 'px';
            }
            warnings_box.style.width = '';
            const ideal_width = parseFloat(window.getComputedStyle(warnings_box).width.replace('px',''));
            var maxWidth = docWidth - 3*margin;
            if(ideal_width > maxWidth) {
                warnings_box.style.width = maxWidth + 'px';
            }
        }


        /** Show the warnings.
         *
         * @member {Function} showWarnings
         * @function
         * @memberof Numbas.display.PartDisplay
         */
        this.showWarnings = function() {
            this.warningsShown(true);
            position_warnings();
        }

        setInterval(position_warnings,200);
        
        /** Hide the warnings.
         *
         * @member {Function} hideWarnings
         * @function
         * @memberof Numbas.display.PartDisplay
         */
        this.hideWarnings = function() {
            this.warningsShown(false);
        }
        /** Feedback messages.
         *
         * @member {observable} feedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.feedbackMessages = Knockout.observableArray([]);

        /** Are there other parts in line with this one? (Used to decide whether to show the submit button and feedback text)
         * True if there's more than one part in the question, or this is a step.
         *
         * @member {observable|boolean} isNotOnlyPart
         * @memberof Numbas.display.PartDisplay
         */
        this.isNotOnlyPart = Knockout.computed(function() {
            return this.question.display.numParts()>1 || this.part.isStep;
        },this);

        var _feedbackShown = ko.observable(false);

        /** Is the box containing the feedback messages open?
         *
         * @member {observable.<boolean>} feedbackShown
         * @memberof Numbas.display.PartDisplay
         */
        this.feedbackShown = Knockout.computed({
            read: function() {
                return _feedbackShown() || !this.isNotOnlyPart()
            },

            write: function(v) {
                _feedbackShown(v);
            }
        }, this);

        /** Text for the button to toggle the display of the feedback messages.
         *
         * @member {observable|string} feedbackToggleText
         * @memberof Numbas.display.PartDisplay
         */
        this.feedbackToggleText = Knockout.pureComputed(function() {
            if(this.waiting_for_pre_submit()) {
                return R('part.waiting for pre submit');
            }
            return this.feedbackShown() ? R('part.hide feedback') : R('part.show feedback');
        }, this);

        /** Have the steps ever been shown? 
         *
         * @see Numbas.parts.Part#stepsShown
         * @member {observable|boolean} stepsShown
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsShown = Knockout.observable(p.stepsShown);
        /** Are the steps currently open?
         *
         * @see Numbas.parts.Part#stepsOpen
         * @member {observable|boolean} stepsOpen
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsOpen = Knockout.observable(p.stepsOpen);

        this.ended = this.question.exam.display.ended;

        /** Have the correct answers been revealed?
         *
         * @member {observable|boolean} revealed
         * @memberof Numbas.display.PartDisplay
         */
        this.revealed = Knockout.observable(false);
        /** Has this part been locked?
         *
         * @member {observable|boolean} locked
         * @memberof Numbas.display.PartDisplay
         */
        this.locked = Knockout.observable(false);
        /** Is this part disabled? True if revealed or locked.
         *
         * @member {observable|boolean} locked
         * @memberof Numbas.display.PartDisplay
         */
        this.disabled = Knockout.computed(function() {
            return this.revealed() || this.locked();
        },this);
        /** Show the "submit part" button?
         *
         * @member {observable|boolean} showSubmitPart
         * @memberof Numbas.display.PartDisplay
         */
        this.showSubmitPart = Knockout.computed(function() {
            return this.doesMarking() && !this.disabled();
        },this);
        /** Text to describe the state of the steps penalty.
         *
         * @member {observable|string} stepsPenaltyMessage
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsPenaltyMessage = Knockout.computed(function() {
            if(this.stepsOpen()) {
                return R('question.hide steps no penalty');
            } else if(this.part.settings.stepsPenalty==0 || this.revealed()) {
                return R('question.show steps no penalty');
            } else if(this.stepsShown()) {
                return R('question.show steps already penalised');
            } else {
                return R('question.show steps penalty',{count:this.part.settings.stepsPenalty});
            }
        },this);
        /** Should the correct answer be shown? True if revealed and {@link Numbas.parts.Part#settings.showCorrectAnswer}) is true.
         *
         * @member {observable|boolean} showCorrectAnswer
         * @memberof Numbas.display.PartDisplay
         */
        this.showCorrectAnswer = Knockout.computed(function() {
            if(!pd.revealed()) {
                return false;
            }
            return Numbas.is_instructor || (p.settings.showCorrectAnswer && p.question.display.expectedAnswersRevealed());
        });

        var feedback_settings = Numbas.util.copyobj(p.question.exam.settings);

        feedback_settings.showFeedbackIcon = p.settings.showFeedbackIcon;
        if(p.parentPart && p.parentPart.type=='gapfill' && p.parentPart.settings.sortAnswers) {
            feedback_settings.showFeedbackIcon = false;
            feedback_settings.showAnswerState = false;
        }

        /** Display of this parts's current score / answered status.
         *
         * @member {observable|Numbas.display.scoreFeedback} scoreFeedback
         * @memberof Numbas.display.PartDisplay
         */
        this.scoreFeedback = Numbas.display_util.showScoreFeedback(this, feedback_settings);

        /** Should feedback icons be shown for this part?
         *
         * @member {observable|boolean} showFeedbackIcon
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackIcon = Knockout.observable(feedback_settings.showFeedbackIcon);

        /** Show the marks feedback?
         *
         * @member {observable|boolean} showMarks
         * @memberof Numbas.display.PartDisplay
         */
        this.showMarks = Knockout.computed(function() {
            return this.scoreFeedback.message() && (this.isNotOnlyPart() || !(this.scoreFeedback.iconClass()=='' || this.scoreFeedback.iconClass()=='invisible'));
        }, this);

        /** Should the box containing part marks and the submit and feedback buttons be shown?
         *
         * @member {observable|boolean} showFeedbackBox
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackBox = Knockout.computed(function() {
            return this.doesMarking();
        },this);

        /** Should the feedback messages be shown?
         *
         * @member {observable|boolean} showFeedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackMessages = Numbas.display_util.resolve_feedback_setting(this, p.question.exam.settings.showPartFeedbackMessages);

        /** Has the feedback changed since it was last looked at?
         * @member {observable|boolean} showFeedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.changedFeedback = Knockout.observable(false);

        this.feedbackShown.subscribe(function(shown) {
            if(shown) {
                pd.changedFeedback(false);
            }
        });

        /**
         * Feedback messages that are shown to the student.
         * If all feedback should be shown, then returns the entire list. If not, then only messages relating to invalid input are shown.
         *
         * @member {observable.<Array>} shownFeedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.shownFeedbackMessages = Knockout.computed(function() {
            var messages = this.feedbackMessages();

            // If not showing part feedback messages, only show messages about invalid input.
            if(!this.showFeedbackMessages()) {
                messages = messages.filter(function(m) { return m.credit_change == 'invalid'; });
            }

            // If not showing the answer correctness, don't show messages that give positive or negative feedback.
            if(!this.scoreFeedback.showAnswerState()) {
                messages = messages.filter(function(m) { 
                    return !(m.credit_change == 'positive' || m.credit_change == 'negative');
                });
            }

            // If showing the current score and this part is marked, add a message giving the total score.
            if(feedback_settings.showFeedbackIcon && this.marks()!=0 && this.scoreFeedback.showActualMark() && this.answered()) {
                messages.push({
                    credit_change: '',
                    message: '',
                    icon: '',
                    credit_message: R('part.marking.total score',{count:p.score}),
                    format: 'string'
                });
            }
            return messages;
        },this);

        this.shownFeedbackMessages.subscribe(function(messages) {
            pd.changedFeedback(!pd.feedbackShown() && messages.length > 0);
        })

        /**
         * Does this part have any shown feedback messages?
         *
         * @member {observable.<boolean>} hasFeedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.hasFeedbackMessages = Knockout.pureComputed(function() {
            return this.shownFeedbackMessages().length > 0 || this.waiting_for_pre_submit();
        }, this);

        /** Options for the next part.
         *
         * @member {observable} nextParts
         * @memberof Numbas.display.PartDisplay
         */
        this.nextParts = Knockout.observableArray([]);
        this.updateNextParts();

        /** Should the list of next parts be shown?
         *
         * @member {observable.<boolean>} showNextParts
         * @memberof Numbas.display.PartDisplay
         */
        this.showNextParts = Knockout.computed(function() {
            if(this.part.question.partsMode!='explore') {
                return false;
            }
            if(!(this.part.settings.suggestGoingBack || this.nextParts().length>0)) {
                return false;
            }
            if(this.revealed()) {
                return false;
            }
            return true;
        },this);

        /** Header for the menu of next parts.
         * 
         * @member {observable.<string>} whatNextMessage
         * @memberof Numbas.display.PartDisplay
         */
        this.whatNextMessage = Knockout.computed(function() {
            return R(this.answered() ? "part.choose next part.answered" : "part.choose next part.unanswered");
        },this);

        /** Is this part a dead end? True if answered or doesn't do marking, and there are no next parts.
         * 
         * @member {observable.<boolean>} reachedDeadEnd
         * @memberof Numbas.display.PartDisplay
         */
        this.reachedDeadEnd = Knockout.computed(function() {
            return this.part.question.partsMode=='explore' && (this.answered() || !this.doesMarking()) && !this.showNextParts() && !this.revealed();
        },this);

        /** CSS classes for the parts tree display.
         *
         * @member {observable.<object>} partTreeCSS
         * @memberof Numbas.display.PartDisplay
         */
        this.partTreeCSS = Knockout.computed(function() {
            return {
                current: this==this.question.display.currentPart()
            };
        },this);

        /** Next parts that have been made.
         *
         * @member {observableArray.<Numbas.display.PartDisplay>} madeNextParts
         * @memberof Numbas.display.PartDisplay
         */
        this.madeNextParts = Knockout.computed(function() {
            var parts = this.nextParts().filter(function(np){ return np.made; }).map(function(np) { return np.instance; });
            return parts.sort(function(a,b) { return a.part.path<b.part.path ? -1 : a.part.path>b.part.path ? 1 : 0});
        },this);

        /** Control functions.
         *
         * @member {object} controls
         * @memberof Numbas.display.PartDisplay
         * @property {Function} submit - Submit the student's answers for marking.
         * @property {Function} showSteps - Show the steps.
         * @property {Function} hideSteps - Hide the steps.
         */
        this.controls = {
            auto_submit: function() {
                if(!p.question.exam.settings.autoSubmit) {
                    return;
                }
                var clicking_inside = pd.clicking_inside;

                setTimeout(function() {
                    if(!pd.will_autoSubmit) {
                        return;
                    }
                    pd.will_autoSubmit = false;

                    if(p.type == 'gapfill') {
                        if(!p.gaps.every(g => g.isDirty || g.answered)) {
                            return;
                        }
                    }
                    pd.controls.submit(!clicking_inside);
                }, 100);
            },
            submit: function(auto) {
                if(auto !== true) {
                    pd.feedbackShown(true);
                }
                var ps = p;
                while(ps.isGap) {
                    ps = ps.parentPart;
                }
                Numbas.controls.submitPart(ps);
            },
            showSteps: function() {
                p.showSteps();
            },
            hideSteps: function() {
                p.hideSteps();
            }
        }

        var autoSubmit_part = this.autoSubmit_part = p.parentPart && p.parentPart.type=='gapfill' ? p.parentPart : p;
        this.will_autoSubmit = false;

        /** Event bindings.
         *
         * @member {object} inputEvents
         * @memberof Numbas.display.PartDisplay
         */
        this.inputEvents = {
            keyup: function(context, e) {
                if (e.key == 'Escape') {
                    pd.hideWarnings();
                } else {
                    return true;    // allow the event to be handled as normal
                }
            },
            keypress: function(context, e) {
                if (e.key == 'Enter') {
                    pd.controls.submit();
                } else {
                    return true;    // allow the event to be handled as normal
                }
            },
            blur: function() {
                pd.hideWarnings();
                
                if(pd.isDirty()) {
                    autoSubmit_part.display.will_autoSubmit = true;
                    autoSubmit_part.display.controls.auto_submit();
                }
            },
            focus: function() {
                autoSubmit_part.display.will_autoSubmit = false;
                pd.showWarnings();
            }
        };

        p.xml.setAttribute('jme-context-description',p.name);
        p.xml.setAttribute('path',p.path);
        p.xml.setAttribute('isgap',p.isGap);
        p.xml.setAttribute('isstep',p.isStep);

        /** A promise resolving to the part's HTML element.
         *
         * @see Numbas.display.makeHTMLFromXML
         * @type {Promise}
         * @memberof Numbas.display.PartDisplay
         */
        pd.html_promise = new Promise(function(resolve) {
            pd.resolve_html_promise = resolve;
        });

        /** Called when Knockout has finished binding the HTML for this part to the DOM.
         *
         * @memberof Numbas.display.PartDisplay
         */
        this.htmlBound = function() {
            p.signals.trigger('HTMLAttached');
        };
    }
    display.PartDisplay.prototype = /** @lends Numbas.display.PartDisplay.prototype */
    {
        /** Set this part's name.
         *
         * @param {string} name
         */
        setName: function(name) {
            this.name(name || this.part.name);
        },
        /** Show a warning message about this part.
         *
         * @param {string} warning
         * @memberof Numbas.display.PartDisplay
         */
        warning: function(warning)
        {
            this.warnings.push({message:warning+''});
        },
        /** Set the list of warnings.
         *
         * @param {Array.<string>} warnings
         * @memberof Numbas.display.PartDisplay
         */
        setWarnings: function(warnings) {
            this.warnings(warnings.map(function(warning){return {message: warning+''}}));
        },
        /** Remove all previously displayed warnings.
         *
         * @memberof Numbas.display.PartDisplay
         */
        removeWarnings: function()
        {
            this.part.removeWarnings();
        },
        /** Called when the part is displayed (basically when question is changed).
         *
         * @see Numbas.display.QuestionDisplay.show
         * @memberof Numbas.display.PartDisplay
         */
        show: function()
        {
            var p = this.part;
            this.showScore(this.part.answered,true);
        },
        /** Called when the correct answer to the question has changed (particularly when this part uses adaptive marking).
         * The displayed correct answer should update.
         *
         * @memberof Numbas.display.PartDisplay
         * @param {*} answer
         * @abstract
         */
        updateCorrectAnswer: function(answer) {},
        /**
         * Show/update the student's score and answer status on this part.
         *
         * @param {boolean} valid
         * @param {boolean} noUpdate
         * @memberof Numbas.display.PartDisplay
         */
        showScore: function(valid,noUpdate)
        {
            var p = this.part;
            var exam = p.question.exam;
            this.score(p.score);
            this.marks(p.marks);
            this.credit(p.credit);
            if(!noUpdate) {
                this.scoreFeedback.update(true);
            }
            if(valid===undefined) {
                valid = this.part.answered;
            }
            this.answered(valid);
            if(this.part.markingFeedback.length) {
                if(!this.part.question.revealed) {
                    var messages = this.part.markingFeedback.filter(function(action) { return util.isNonemptyHTML(action.message) || action.credit!=0; }).map(function(action) {
                        var icons = {
                            'positive': 'icon-ok',
                            'negative': 'icon-remove',
                            'neutral': '',
                            'invalid': 'icon-exclamation-sign'
                        }
                        return {credit_change: action.credit_change, message: action.message, credit_message: action.credit_message, icon: icons[action.credit_change], format: action.format || 'string'};
                    });
                    this.feedbackMessages(messages);
                }
            } else {
                this.feedbackMessages([]);
            }
        },
        /** Called when 'show steps' button is pressed, or coming back to a part after steps shown.
         *
         * @memberof Numbas.display.PartDisplay
         */
        showSteps: function() {
            this.stepsShown(this.part.stepsShown);
            this.stepsOpen(this.part.stepsOpen);
            for(var i=0;i<this.part.steps.length;i++)
            {
                this.part.steps[i].display.show();
            }
        },
        /** Hide the steps.
         *
         * @memberof Numbas.display.PartDisplay
         */
        hideSteps: function()
        {
            this.stepsOpen(this.part.stepsOpen);
        },
        /** Fill the student's last submitted answer into inputs.
         *
         * @abstract
         * @param {object} studentAnswer
         * @memberof Numbas.display.PartDisplay
         */
        restoreAnswer: function(studentAnswer)
        {
        },
        /** Show the correct answers to this part.
         *
         * @memberof Numbas.display.PartDisplay
         */
        revealAnswer: function()
        {
            this.revealed(true);
            this.removeWarnings();
            this.showScore();
        },

        /** Lock this part.
         *
         * @memberof Numbas.display.PartDisplay
         */
        lock: function() {
            this.locked(true);
        },

        event_handlers: {
            pointerdown: function(e) {
                this.clicking_inside = true;
                return true;
            },

            pointerup: function(e) {
                this.clicking_inside = false;
                return true;
            },

            focusin: function(e) {
                this.will_autoSubmit = false;
                return true;
            },
        
            focusout: function(e) {
                if(this.isDirty()) {
                    this.autoSubmit_part.display.will_autoSubmit = true;
                    this.autoSubmit_part.display.controls.auto_submit();
                }
                return true;
            },
        },

        /** Update the list of next parts.
         * Called when an instance of a next part is created or removed.
         *
         * @memberof Numbas.display.PartDisplay
         */
        updateNextParts: function() {
            var p = this.part;
            this.nextParts(p.availableNextParts().map(function(np) {
                var penaltyAmount = np.penalty ? np.penaltyAmount : 0;
                var label = np.label;
                if(!np.instance && np.showPenaltyHint && penaltyAmount!=0) {
                    label += ' '+R('part.next part.penalty amount',{count:penaltyAmount});
                }
                return {
                    label: label,
                    made: np.instance !== null,
                    instance: np.instance !== null ? np.instance.display : null,
                    penaltyAmount: penaltyAmount,
                    lockAfterLeaving: np.lockAfterLeaving,
                    select: function() {
                        if(np.instance) {
                            p.question.setCurrentPart(np.instance)
                        } else {
                            p.makeNextPart(np);
                        }
                    }
                };
            }));
        },

        /** Initialise this part's display.
         *
         * @see Numbas.display.QuestionDisplay.init
         * @memberof Numbas.display.PartDisplay
         */
        init: function() {
            this.part.setDirty(false);
            for(var i=0;i<this.part.steps.length;i++) {
                this.part.steps[i].display.init();
            }
        },
        /** Called when the exam ends.
         *
         * @memberof Numbas.display.PartDisplay
         */
        end: function() {
            this.restoreAnswer(this.part.studentAnswer);
        }
    };
});
