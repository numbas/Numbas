Numbas.queueScript('part-display',['display-base','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    var util = Numbas.util;
    /** Display methods for a generic question part
     * @name PartDisplay
     * @memberof Numbas.display
     * @constructor
     * @param {Numbas.parts.Part} p - the associated part object
     */
    display.PartDisplay = function(p)
    {
        var pd = this;
        /** The associated part object
         * @member {Numbas.parts.Part} part
         * @memberof Numbas.display.PartDisplay
         */
        this.part = p;
        /** The display name of this part
         * @member {observable|String} name
         * @memberof Numbas.display.PartDisplay
         * @see Numbas.parts.Part#name
         */
        this.name = Knockout.observable('');

        /** Title text for this part's answer input
         * @member {observable.<String>} input_title
         * @memberof Numbas.display.PartDisplay
         */
        this.input_title = ko.computed(function() {
            return R('part.input title',{name: this.name()});
        },this);

        /** Should the name of this part be displayed?
         * @member {observable|Boolean} showName
         * @memberof Numbas.display.PartDisplay
         */
        this.showName = ko.computed(function() {
            return this.name() && this.part.question.partsMode=='all';
        },this);
        /** The question this part belongs to
         * @member {Numbas.Question} question
         * @memberof Numbas.display.PartDisplay
         */
        this.question = p.question;
        /** The student's current score ({@link Numbas.parts.Part#score})
         * @member {observable|Number} score
         * @memberof Numbas.display.PartDisplay
         */
        this.score = Knockout.observable(p.score);
        /** The total marks available for this part ({@link Numbas.parts.Part#marks})
         * @member {observable|Number} marks
         * @memberof Numbas.display.PartDisplay
         */
        this.marks = Knockout.observable(p.marks);
        /** Proportion of available marks awarded to the student - i.e. `score/marks`. Penalties will affect this instead of the raw score, because of things like the steps marking algorithm.
         * @member {observable|Number} credit
         * @memberof Numbas.display.PartDisplay
         */
        this.credit = Knockout.observable(p.credit);
        /** Does this part do any marking?
         * @member {observable|Boolean} doesMarking
         * @see Numbas.parts.Part#doesMarking
         * @memberof Numbas.display.PartDisplay
         */
        this.doesMarking = Knockout.observable(p.doesMarking);
        /** Has the student answered this part?
         * @member {observable|Boolean} answered
         * @memberof Numbas.display.PartDisplay
         */
        this.answered = Knockout.observable(p.answered);
        /** Has the student changed their answer since the last submission?
         * @member {observable|Boolean} isDirty
         * @memberof Numbas.display.PartDisplay
         */
        this.isDirty = Knockout.observable(false);

        var _warnings = Knockout.observableArray([]);

        /** Warnings based on the student's answer
         * @member {observable|Array.<Object.<String>>} warnings
         * @memberof Numbas.display.PartDisplay
         */
        this.warnings = Knockout.computed({
            read: function() {
                return _warnings().filter(function(w) { return util.isNonemptyHTML(w.message); });
            },
            write: _warnings
        });
        this.warnings.push = function() {
            return _warnings.push.call(_warnings,arguments);
        }

        /** Does the part have any warnings to show?
         * Changes to false immediately.
         * Only changes to true after a delay if the part is dirty, but immediately if the part is not (i.e. it's just been submitted)
         * @member {observable|Boolean} hasWarnings
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
         * @member {observable|Boolean} warningsShown
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
        /** Show the warnings
         * @member {function} showWarnings
         * @method
         * @memberof Numbas.display.PartDisplay
         */
        this.showWarnings = function() {
            this.warningsShown(true);
        }
        /** Hide the warnings
         * @member {function} hideWarnings
         * @method
         * @memberof Numbas.display.PartDisplay
         */
        this.hideWarnings = function() {
            this.warningsShown(false);
        }
        /** Are the marking feedback messages visible?
         * @member {observable|Boolean} feedbackShown
         * @memberof Numbas.display.PartDisplay
         */
        this.feedbackShown = Knockout.observable(false);
        /** Text for the button to toggle the display of the feedback messages
         * @member {observable|String} toggleFeedbackText
         * @memberof Numbas.display.PartDisplay
         */
        this.toggleFeedbackText = Knockout.computed(function() {
            return R(this.feedbackShown() ? 'question.score feedback.hide' : 'question.score feedback.show');
        },this);
        /** Feedback messages
         * @member {observable|String[]} feedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.feedbackMessages = Knockout.observableArray([]);
        /** Are there other parts in line with this one? (Used to decide whether to show the submit button and feedback text)
         * True if there's more than one part in the question, or this is a step.
         * @member {observable|Boolean} isNotOnlyPart
         * @memberof Numbas.display.PartDisplay
         */
        this.isNotOnlyPart = Knockout.computed(function() {
            return this.question.display.numParts()>1 || this.part.isStep;
        },this);
        /** Have the steps ever been shown? ({@link Numbas.parts.Part#stepsShown})
         * @member {observable|Boolean} stepsShown
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsShown = Knockout.observable(p.stepsShown);
        /** Are the steps currently open? ({@link Numbas.parts.Part#stepsOpen})
         * @member {observable|Boolean} stepsOpen
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsOpen = Knockout.observable(p.stepsOpen);
        /** Have the correct answers been revealed?
         * @member {observable|Boolean} revealed
         * @memberof Numbas.display.PartDisplay
         */
        this.revealed = Knockout.observable(false);
        /** Show the "submit part" button?
         * @member {observable|Boolean} showSubmitPart
         * @memberof Numbas.display.PartDisplay
         */
        this.showSubmitPart = Knockout.computed(function() {
            return this.doesMarking() && !this.revealed();
        },this);
        /** Text to describe the state of the steps penalty
         * @member {observable|String} stepsPenaltyMessage
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
        /** Should the correct answer be shown? True if revealed and {@link Numbas.parts.Part#settings.showCorrectAnswer}) is true
         * @member {observable|Boolean} showCorrectAnswer
         * @memberof Numbas.display.PartDisplay
         */
        this.showCorrectAnswer = Knockout.computed(function() {
            return (p.settings.showCorrectAnswer || Numbas.is_instructor) && pd.revealed();
        });
        var feedback_settings = Numbas.util.copyobj(p.question.exam.settings);
        feedback_settings.showFeedbackIcon = p.settings.showFeedbackIcon;
        if(p.parentPart && p.parentPart.type=='gapfill' && p.parentPart.settings.sortAnswers) {
            feedback_settings.showFeedbackIcon = false;
            feedback_settings.showAnswerState = false;
        }
        /** Display of this parts's current score / answered status
         * @member {observable|Numbas.display.scoreFeedback} scoreFeedback
         * @memberof Numbas.display.PartDisplay
         */
        this.scoreFeedback = display.showScoreFeedback(this, feedback_settings);
        /** Should feedback icons be shown for this part?
         * @member {observable|Boolean} showFeedbackIcon
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackIcon = Knockout.observable(feedback_settings.showFeedbackIcon);
        /** Show the marks feedback?
         * @member {observable|Boolean} showMarks
         * @memberof Numbas.display.PartDisplay
         */
        this.showMarks = Knockout.computed(function() {
            return this.scoreFeedback.message() && (this.isNotOnlyPart() || this.scoreFeedback.iconClass());
        }, this);
        /** Should the box containing part marks and the submit and feedback buttons be shown?
         * @member {observable|Boolean} showFeedbackBox
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackBox = Knockout.computed(function() {
            return this.doesMarking() && this.showMarks();
        },this);
        /** Should the feedback messages be shown?
         * @member {observable|Boolean} showFeedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackMessages = Knockout.pureComputed(function() {
            var e = p.question.exam;
            return (p.question.display.revealed() || e.settings.showAnswerState) && pd.feedbackMessages().length;            
        },this);

        /** Options for the next part
         * @member {observable} nextParts
         * @memberof Numbas.display.PartDisplay
         */
        this.nextParts = ko.observableArray([]);
        this.updateNextParts();

        this.showNextParts = ko.computed(function() {
            if(this.nextParts().length==0) {
                return false;
            }
            return this.answered() || !this.doesMarking();
        },this);

        /** Control functions
         * @member {Object} controls
         * @memberof Numbas.display.PartDisplay
         * @property {function} toggleFeedback - Toggle the display of the marking feedback messages
         * @property {function} submit - Submit the student's answers for marking
         * @property {function} showSteps - Show the steps
         * @property {function} hideSteps - Hide the steps
         */
        this.controls = {
            toggleFeedback: function() {
                pd.feedbackShown(!pd.feedbackShown());
            },
            submit: function() {
                var np = p;
                while(np.isGap)
                    np = np.parentPart;
                np.submit();
                Numbas.store.save();
            },
            showSteps: function() {
                p.showSteps();
            },
            hideSteps: function() {
                p.hideSteps();
            }
        }
        /** Event bindings
         * @member {Object} inputEvents
         * @memberof Numbas.display.PartDisplay
         */
        this.inputEvents = {
            keypress: function(context,e) {
                if(e.which==13) {
                    pd.controls.submit();
                }
                else
                    return true;
            },
            blur: function() {
                pd.hideWarnings();
            },
            focus: function() {
                pd.showWarnings();
            }
        }
        var label = p.isStep ? 'step' : p.isGap ? 'gap' : 'part';
        var index = p.isStep || p.isGap ? p.index : util.letterOrdinal(p.index);
        p.xml.setAttribute('jme-context-description',R(label)+' '+index);
        p.xml.setAttribute('path',p.path);
        p.xml.setAttribute('isgap',p.isGap);
        p.xml.setAttribute('isstep',p.isStep);
    }
    display.PartDisplay.prototype = /** @lends Numbas.display.PartDisplay.prototype */
    {
        /** Set this part's name
         * @param {String} name
         */
        setName: function(name) {
            this.name(name);
        },
        /** Show a warning message about this part
         * @param {String} warning
         * @memberof Numbas.display.PartDisplay
         */
        warning: function(warning)
        {
            this.warnings.push({message:warning+''});
        },
        /** Set the list of warnings
         * @param {Array.<String>} warnings
         * @memberof Numbas.display.PartDisplay
         */
        setWarnings: function(warnings) {
            this.warnings(warnings.map(function(warning){return {message: warning+''}}));
        },
        /** Remove all previously displayed warnings
         * @memberof Numbas.display.PartDisplay
         */
        removeWarnings: function()
        {
            this.part.removeWarnings();
        },
        /** Called when the part is displayed (basically when question is changed)
         * @see Numbas.display.QuestionDisplay.show
         * @memberof Numbas.display.PartDisplay
         */
        show: function()
        {
            var p = this.part;
            this.feedbackShown(false);
            this.showScore(this.part.answered,true);
        },
        /** Called when the correct answer to the question has changed (particularly when this part uses adaptive marking)
         * The displayed correct answer should update.
         * @memberof Numbas.display.PartDisplay
         * @param answer
         * @abstract
         */
        updateCorrectAnswer: function(answer) {},
        /** Show/update the student's score and answer status on this part
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
            if(valid===undefined)
                valid = this.part.answered;
            this.answered(valid);
            if(this.part.markingFeedback.length && !this.part.question.revealed) {
                var messages = this.part.markingFeedback.filter(function(action) { return util.isNonemptyHTML(action.message) || action.credit!=0; }).map(function(action) {
                    var icons = {
                        'positive': 'icon-ok',
                        'negative': 'icon-remove',
                        'neutral': '',
                        'invalid': 'icon-exclamation-sign'
                    }
                    return {credit_change: action.credit_change, message: action.message, icon: icons[action.credit_change]};
                });
                this.feedbackMessages(messages);
            }
        },
        /** Called when 'show steps' button is pressed, or coming back to a part after steps shown
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
        /** Hide the steps
         * @memberof Numbas.display.PartDisplay
         */
        hideSteps: function()
        {
            this.stepsOpen(this.part.stepsOpen);
        },
        /** Fill the student's last submitted answer into inputs
         * @abstract
         * @memberof Numbas.display.PartDisplay
         */
        restoreAnswer: function()
        {
        },
        /** Show the correct answers to this part
         * @memberof Numbas.display.PartDisplay
         */
        revealAnswer: function()
        {
            this.revealed(true);
            this.removeWarnings();
            this.showScore();
        },

        updateNextParts: function() {
            var p = this.part;
            this.nextParts(p.nextParts.map(function(np) {
                return {
                    label: np.label,
                    disabled: np.instances.length>0,
                    make: function() {
                        p.makeNextPart(np);
                    }
                };
            }));
        },

        /** Initialise this part's display
         * @see Numbas.display.QuestionDisplay.init
         * @memberof Numbas.display.PartDisplay
         */
        init: function() {
            this.part.setDirty(false);
            for(var i=0;i<this.part.steps.length;i++) {
                this.part.steps[i].display.init();
            }
        },
        /** Called when the exam ends
         * @memberof Numbas.display.PartDisplay
         */
        end: function() {
            this.restoreAnswer();
            for(var i=0;i<this.part.steps.length;i++) {
                this.part.steps[i].display.end();
            }
        }
    };
});
