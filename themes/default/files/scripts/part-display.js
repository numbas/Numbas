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

        /** The question this part belongs to
         * @member {Numbas.Question} question
         * @memberof Numbas.display.PartDisplay
         */
        this.question = p.question;

        /** The student's current score ({@link Numbas.parts.Part#score})
         * @member {observable|number} score
         * @memberof Numbas.display.PartDisplay
         */
        this.score = ko.observable(p.score);

        /** The total marks available for this part ({@link Numbas.parts.Part#marks})
         * @member {observable|number} marks
         * @memberof Numbas.display.PartDisplay
         */
        this.marks = ko.observable(p.marks);

        /** Proportion of available marks awarded to the student - i.e. `score/marks`. Penalties will affect this instead of the raw score, because of things like the steps marking algorithm.
         * @member {observable|number} credit
         * @memberof Numbas.display.PartDisplay
         */
        this.credit = ko.observable(p.credit);

        /** Does this part do any marking?
         * @member {observable|boolean} doesMarking
         * @see {Numbas.Part.doesMarking}
         * @memberof Numbas.display.PartDisplay
         */
        this.doesMarking = ko.observable(p.doesMarking);

        /** Has the student answered this part?
         * @member {observable|boolean} answered
         * @memberof Numbas.display.PartDisplay
         */
        this.answered = ko.observable(p.answered);

        /** Has the student changed their answer since the last submission?
         * @member {observable|boolean} isDirty
         * @memberof Numbas.display.PartDisplay
         */
        this.isDirty = ko.observable(false);

        /** Warnings based on the student's answer
         * @member {observable|Array.<{message:string}>} warnings
         * @memberof Numbas.display.PartDisplay
         */
        this.warnings = ko.observableArray([]);

        /** Are the warnings visible?
         * @member {observable|boolean} warningsShown
         * @memberof Numbas.display.PartDisplay
         */
        this.warningsShown = ko.observable(false);

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
         * @member {observable|boolean} feedbackShown
         * @memberof Numbas.display.PartDisplay
         */
        this.feedbackShown = ko.observable(false);

        /** Text for the button to toggle the display of the feedback messages
         * @member {observable|string} toggleFeedbackText
         * @memberof Numbas.display.PartDisplay
         */
        this.toggleFeedbackText = ko.computed(function() {
            return R(this.feedbackShown() ? 'question.score feedback.hide' : 'question.score feedback.show');
        },this);

        /** Feedback messages
         * @member {observable|string[]} feedbackMessages
         * @memberof Numbas.display.PartDisplay
         */
        this.feedbackMessages = ko.observableArray([]);
        
        /** Are there other parts in line with this one? (Used to decide whether to show the submit button and feedback text)
         * True if there's more than one part in the question, or this is a step.
         * @member {observable|boolean} isNotOnlyPart
         * @memberof Numbas.display.PartDisplay
         */
        this.isNotOnlyPart = ko.computed(function() {
            return this.question.display.numParts()>1 || this.part.isStep;
        },this);

        /** Should the button to toggle feedback messages be shown?
         * @member {observable|boolean} showFeedbackToggler
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackToggler = ko.computed(function() {
            var e = p.question.exam;
            return this.isNotOnlyPart() && (p.question.display.revealed() || e.settings.showAnswerState) && pd.feedbackMessages().length;
        },this);

        /** Show the "submit part" button?
         * @member {observable|boolean} showSubmitPart
         * @memberof Numbas.display.PartDisplay
         */
        this.showSubmitPart = ko.computed(function() {
            return this.isNotOnlyPart() && !(this.revealed() || !this.isDirty());
        },this);

        /** Show the marks feedback?
         * @member {observable|boolean} showMarks
         * @memberof Numbas.display.PartDisplay
         */
        this.showMarks = ko.computed(function() {
            return this.isNotOnlyPart() && this.scoreFeedback.message();
        }, this);

        /** Should the box containing part marks and the submit and feedback buttons be shown?
         * @member {observable|boolean} showFeedbackBox
         * @memberof Numbas.display.PartDisplay
         */
        this.showFeedbackBox = ko.computed(function() {
            return this.doesMarking() && (this.showFeedbackToggler() || this.showSubmitPart() || this.showMarks());
        },this);

        /** Have the steps ever been shown? ({@link Numbas.parts.Part#stepsShown})
         * @member {observable|boolean} stepsShown
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsShown = ko.observable(p.stepsShown);

        /** Are the steps currently open? ({@link Numbas.parts.Part#stepsOpen})
         * @member {observable|boolean} stepsOpen
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsOpen = ko.observable(p.stepsOpen);

        /** Have the correct answers been revealed?
         * @member {observable|boolean} revealed
         * @memberof Numbas.display.PartDisplay
         */
        this.revealed = ko.observable(false);

        /** Text to describe the state of the steps penalty
         * @member {observable|string} stepsPenaltyMessage
         * @memberof Numbas.display.PartDisplay
         */
        this.stepsPenaltyMessage = ko.computed(function() {
            if(this.stepsOpen())
                return R('question.hide steps no penalty');
            else if(this.part.settings.stepsPenalty==0 || this.revealed())
                return R('question.show steps no penalty');
            else if(this.stepsShown())
                return R('question.show steps already penalised');
            else
                return R('question.show steps penalty',{count:this.part.settings.stepsPenalty});
        },this);

        /** Should the correct answer be shown? True if revealed and {@link Numbas.parts.Part#settings.showCorrectAnswer}) is true
         * @member {observable|boolean} showCorrectAnswer
         * @memberof Numbas.display.PartDisplay
         */
        this.showCorrectAnswer = ko.computed(function() {
            return p.settings.showCorrectAnswer && pd.revealed();
        });

        /** Display of this parts's current score / answered status
         * @member {observable|object} scoreFeedback
         * @memberof Numbas.display.PartDisplay
         */
        this.scoreFeedback = display.showScoreFeedback(this,p.question.exam.settings);

        /** Control functions
         * @member {object} controls
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
                np.display.removeWarnings();
                np.submit();
                if(!np.answered)
                {
                    Numbas.display.showAlert(R('question.can not submit'));
                }
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
         * @member {object} inputEvents
         * @memberof Numbas.display.PartDisplay
         */
        this.inputEvents = {
            keypress: function(context,e) {
                if(e.which==13) {
                    pd.controls.submit();
                }
                else
                    return true;
            }
        }

        var label = p.isStep ? 'step' : p.isGap ? 'gap' : 'part';
        var index = p.isStep || p.isGap ? p.index : util.letterOrdinal(p.index);
        p.xml.setAttribute('jme-context-description',R(label)+' '+index);
    }
    display.PartDisplay.prototype = /** @lends Numbas.display.PartDisplay.prototype */
    {
        /** Show a warning message about this part
         * @param {string} warning
         * @memberof Numbas.display.PartDisplay
         */
        warning: function(warning)
        {
            this.warnings.push({message:warning+''});
        },

        /** Set the list of warnings
         * @param {string[]} warnings
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
                valid = this.part.validate();
            this.answered(valid);

            if(this.part.markingFeedback.length && !this.part.question.revealed)
            {
                var messages = [];
                var maxMarks = this.part.marks - (this.part.stepsShown ? this.part.settings.stepsPenalty : 0);
                var t = 0;
                for(var i=0;i<this.part.markingFeedback.length;i++)
                {
                    var action = this.part.markingFeedback[i];
                    var change = 0;

                    switch(action.op) {
                    case 'addCredit':
                        change = action.credit*maxMarks;
                        if(action.gap!=undefined)
                            change *= this.part.gaps[action.gap].marks/this.part.marks;
                        t += change;
                        break;
                    }

                    var message = action.message || '';
                    if(util.isNonemptyHTML(message))
                    {
                        var marks = Math.abs(change);

                        if(change>0)
                            message+='\n\n'+R('feedback.you were awarded',{count:marks});
                        else if(change<0)
                            message+='\n\n'+R('feedback.taken away',{count:marks});
                    }
                    if(util.isNonemptyHTML(message))
                        messages.push(message);
                }
                
                this.feedbackMessages(messages);
            }
        },

        /** Called when 'show steps' button is pressed, or coming back to a part after steps shown 
         * @memberof Numbas.display.PartDisplay
         */
        showSteps: function()
        {
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
