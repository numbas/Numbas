Numbas.queueScript('question-display',['display-util', 'display-base','jme-variables','xml','schedule','jme','util'],function() {
    var display = Numbas.display;
    /** Display properties of a question object.
     *
     * @name QuestionDisplay
     * @memberof Numbas.display
     * @class
     * @param {Numbas.Question} q - the associated question object
     */
    display.QuestionDisplay = function(q)
    {
        var qd = this;
        this.question = q;
        var exam = q.exam;
        
        this.contextDescription = R('question.header',{number:q.number+1});

        /** Does this question have non-empty statement text?
         *
         * @member {observable|string} hasStatement
         * @memberof Numbas.display.QuestionDisplay
         */
        this.hasStatement = Knockout.observable(Numbas.util.isNonemptyHTML(q.statement));
        /** Does this question have non-empty advice text?
         *
         * @member {observable|string} hasAdvice
         * @memberof Numbas.display.QuestionDisplay
         */
        this.hasAdvice = Knockout.observable(Numbas.util.isNonemptyHTML(q.advice));
        /** Has the advice been shown?
         *
         * @member {observable|boolean} adviceDisplayed
         * @memberof Numbas.display.QuestionDisplay
         */
        this.adviceDisplayed = Knockout.observable(false);
        /** Get the {@link Numbas.display.PartDisplay} object for the given path.
         *
         * @param {Numbas.parts.partpath} path
         * @returns {Numbas.display.PartDisplay}
         * @function getPart
         * @memberof Numbas.display.QuestionDisplay
         */
        this.getPart = function(path) {
            return q.getPart(path).display;
        }
        /** Text for the "submit all answers" button.
         *
         * @member {observable|string} submitMessage
         * @memberof Numbas.display.QuestionDisplay
         */
        this.submitMessage = Knockout.observable('');
        /** The name to display for this question - in default locale, it's "Question {N}".
         *
         * @member {observable|string} displayName
         * @memberof Numbas.display.QuestionDisplay
         */
        this.displayName = Knockout.observable(q.exam.settings.navigateMode=='sequence' && q.customName.trim()=='' ? R('question.header',{'number':q.displayNumber+1}) : q.name);
        /** Has the student looked at this question?
         *
         * @see Numbas.Question#visited
         * @member {observable|boolean} visited
         * @memberof Numbas.display.QuestionDisplay
         */
        this.visited = Knockout.observable(q.visited);

        this.isCurrentQuestion = Knockout.computed(function() {
            return exam.display.currentQuestionNumber()==q.number;
        },this);

        /** Is this question visible in the list?
         *
         * @member {observable|boolean} visible
         * @memberof Numbas.display.QuestionDisplay
         */
        this.visible = Knockout.computed(function() {
            var q = this.question;
            var currentQuestionNumber = exam.display.currentQuestionNumber();
            return (
                   exam.display.mode() == 'review'
                || q.number==currentQuestionNumber
                || exam.settings.navigateBrowse                                                 // is browse navigation enabled?
                || this.visited()                            // if not, we can still move backwards to questions already seen if reverse navigation is enabled
                || (currentQuestionNumber!==null && q.number>currentQuestionNumber && exam.display.questions()[q.number-1].visited())    // or you can always move to the next question
            )
        },this);

        /** Display objects for all parts in this question.
         *
         * @member {observable.<Array.<Numbas.display.PartDisplay>>} parts
         * @memberof Numbas.display.QuestionDisplay
         */
        this.parts = Knockout.observableArray(this.question.parts.map(function(p){ return p.display; }));

        /** The first part in the question.
         *
         * @member {observable.<Numbas.display.PartDisplay>} firstPart
         * @memberof Numbas.display.QuestionDisplay
         */
        this.firstPart = Knockout.computed(function() {
            return this.parts()[0];
        },this);

        /** Number of parts in this question.
         *
         * @member {observable|number} numParts
         * @memberof Numbas.display.QuestionDisplay
         */
        this.numParts = Knockout.observable(q.parts.length);

        /** The currently visible part, in explore mode.
         *
         * @member {observable|Numbas.display.PartDisplay} currentPart
         * @memberof Numbas.display.QuestionDisplay
         */
        this.currentPart = Knockout.observable(null);

        this.currentPart.subscribe(function(pd) {
            pd.html_promise.then(function(html) {
                html.scrollIntoView();
                document.querySelector('main.mainDisplay').scrollTo({top: 0});
            });
        },this);

        /** The part that created the current part.
         *
         * @member {observable|Numbas.display.PartDisplay} previousPart
         * @memberof Numbas.display.QuestionDisplay
         */
        this.previousPart = Knockout.computed(function() {
            var p = this.currentPart();
            if(!(p && p.part.previousPart)) {
                return null;
            }
            return p.part.previousPart.display;
        },this);

        /** Set the current part to the previous part, if it's defined.
         *
         * @see Numbas.display.QuestionDisplay.currentPart
         */
        this.goToPreviousPart = function() {
            var p = qd.previousPart();
            if(p) {
                q.setCurrentPart(p.part);
            }
        };

        /** Set the current part.
         *
         * @param {Numbas.display.PartDisplay} pd
         */
        this.setCurrentPart = function(pd) {
            q.setCurrentPart(pd.part);
        }

        /** Student's current score.
         *
         * @see Numbas.Question#score
         * @member {observable|number} score
         * @memberof Numbas.display.QuestionDisplay
         */
        this.score = Knockout.observable(q.score);
        /** Total marks available for this question.
         *
         * @see Numbas.Question#marks
         * @member {observable|number} marks
         * @memberof Numbas.display.QuestionDisplay
         */
        this.marks = Knockout.observable(q.marks);
        /** Proportion of available marks awarded to the student.
         *
         * @member {observable|number} credit
         * @memberof Numbas.display.QuestionDisplay
         */
        this.credit = Knockout.computed(function() {
            return this.score()/this.marks();
        },this);
        /** Does this question do any marking?
         *
         * @member {observable|boolean} doesMarking
         * @memberof Numbas.display.QuestionDisplay
         */
        this.doesMarking = Knockout.computed(function() {
            return this.marks()>0
        },this);
        /** Has this question been answered? 
         *
         * @see Numbas.Question#answered
         * @member {observable|boolean} answered
         * @memberof Numbas.display.QuestionDisplay
         */
        this.answered = Knockout.observable(q.answered);
        /** Has this question been locked?
         *
         * @see Numbas.Question#locked
         * @member {observable|boolean} locked
         * @memberof Numbas.display.QuestionDisplay
         */
        this.locked = Knockout.observable(q.locked);

        this.ended = exam.display.ended;

        /** Have the correct answers been revealed? 
         *
         * @see Numbas.Question#revealed
         * @member {observable|boolean} revealed
         * @memberof Numbas.display.QuestionDisplay
         */
        this.revealed = Knockout.observable(q.revealed);
        /** Have any of this question's parts been answered?
         *
         * @member {observable|boolean} anyAnswered
         * @memberof Numbas.display.QuestionDisplay
         */
        this.anyAnswered = Knockout.observable(false);
        /** Has the student changed any of their answers since submitting?
         *
         * @member {observable|boolean} isDirty
         * @memberof Numbas.display.QuestionDisplay
         */
        this.isDirty = Knockout.observable(false);
        /** Is the student able to reveal the correct answers?
         *
         * @member {observable|boolean} canReveal
         * @memberof Numbas.display.QuestionDisplay
         */
        this.canReveal = Knockout.computed(function() {
            return exam.settings.allowRevealAnswer && !this.revealed();
        },this);
        /** Score feedback string.
         *
         * @member {{update: Function, message: observable|string}} scoreFeedback
         * @memberof Numbas.display.QuestionDisplay
         */
        this.scoreFeedback = Numbas.display_util.showScoreFeedback(this,q.exam.settings);

        /** Explore mode objectives.
         *
         * @member {Array.<object>} objectives
         * @memberof Numbas.display.QuestionDisplay
         */
        this.objectives = q.objectives.map(function(o) {
            var od = {
                objective: o,
                name: o.name,
                marks: Knockout.observable(o.limit),
                score: Knockout.observable(o.score),
                doesMarking: Knockout.observable(true),
                revealed: qd.revealed,
                ended: qd.ended,
                answered: Knockout.observable(false)
            }
            od.credit = Knockout.computed(function() {
                return od.score()/od.marks();
            });
            od.visible = Knockout.computed(function() {
                return q.objectiveVisibility=='always' || od.answered() || od.revealed();
            },this);
            od.feedback = Numbas.display_util.showScoreFeedback(od,q.exam.settings);
            return od;
        });
        /** Explore mode penalties.
         *
         * @member {Array.<object>} penalties
         * @memberof Numbas.display.QuestionDisplay
         */
        this.penalties = q.penalties.map(function(p) {
            var pd = {
                penalty: p,
                name: p.name,
                limit: p.limit,
                score: Knockout.observable(p.score),
                revealed: qd.revealed,
                applied: Knockout.observable(false),
            };
            pd.visible = Knockout.computed(function() {
                return q.penaltyVisibility=='always' || pd.applied() || pd.revealed();
            })
            pd.scoreDisplay = Knockout.computed(function() {
                return Numbas.math.niceNumber(pd.score());
            });
            return pd;
        });

        /** Should the score breakdown table be shown?
         *
         * @member {Observable.<boolean>} showScoreBreakdown
         * @memberof Numbas.display.QuestionDisplay
         */
        this.showScoreBreakdown = Knockout.computed(function() {
            return q.partsMode=='explore' && q.objectives.length>0;
        },this);

        /** Show the tree of parts for navigation?
         *
         * @member {Observable.<boolean>} showPartsTree
         * @memberof Numbas.display.QuestionDisplay
         */
        this.showPartsTree = Knockout.computed(function() {
            return q.partsMode=='explore';
        },this);

        /** Show this question in review mode.
         *
         * @member {Function} review
         * @function
         * @memberof Numbas.display.QuestionDisplay
         */
        this.review = function() {
            exam.reviewQuestion(q.number);
        }

        /** CSS classes for this question's HTML element.
         *
         * @member {Observable.<object>} css_classes
         * @memberof Numbas.display.QuestionDisplay
         */
        this.css_classes = Knockout.computed(function() {
            var css = {};
            css['partsmode-'+q.partsMode] = true;
            return css;
        },this);

        /** Called when Knockout has finished binding all the HTML for this question to the DOM.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        this.htmlBound = function() {
            q.signals.on(['partsGenerated'],function() {
                q.signals.trigger('HTMLAttached');
            });
        }
        q.signals.on('HTMLAttached',function() {
            // Backwards compatibility: an event triggered on the body element when a question's HTML is attached.
            // Deprecated because there's no way of saying
            $('body').trigger('question-html-attached',[q,qd]);
        });

        /** A promise resolving to the question's HTML element.
         *
         * @see Numbas.display.makeHTMLFromXML
         * @type {Promise}
         * @memberof Numbas.display.QuestionDisplay
         */
        this.html_promise = new Promise(function(resolve) {
            qd.resolve_html_promise = resolve;
        });
        this.html_promise.then(function(html) {
            q.signals.trigger('mainHTMLAttached');
        });
    }
    display.QuestionDisplay.prototype = /** @lends Numbas.display.QuestionDisplay.prototype */
    {
        /** The associated question object.
         *
         * @type {Numbas.Question}
         * @memberof Numbas.display.QuestionDisplay
         */
        question: undefined,            //reference back to the main question object

        /** HTML representing the question.
         *
         * @type {Element}
         * @memberof Numbas.display.QuestionDisplay
         */
        html: '',                        //HTML for displaying question

        /** Make the HTML to display the question.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        makeHTML: function() {
            var q = this.question;
            var qd = this;

            var promise = display.makeHTMLFromXML(
                q.xml, 
                Numbas.xml.templates.question, 
                q.scope,
                qd.contextDescription
            );

            promise.then(function(html) {
                qd.html = html;

                qd.resolve_html_promise(html);

                qd.css = document.createElement('style');
                qd.css.setAttribute('type','text/css');
                qd.css.appendChild(document.createTextNode(q.preamble.css));

                document.body.append(qd.css);

                if(qd.css.sheet) {
                    Numbas.util.prefix_css_selectors(qd.css, '#question-'+q.path);
                }

                qd.html.append(qd.css);
            });
        },

        /** Update the list of parts.
         */
        updateParts: function() {
            this.parts(this.question.parts.map(function(p){ return p.display; }));
            this.marks(this.question.marks);
        },

        /** Add a new part to the display.
         *
         * @param {Numbas.parts.Part} p
         */
        addPart: function(p) {
            var qd = this;
            this.updateParts();
            this.question.signals.on('mainHTMLAttached',function() {
                var promise = display.makeHTMLFromXML(
                    p.xml, 
                    Numbas.xml.templates.part, 
                    p.getScope(), 
                    qd.contextDescription+' '+(p.display.name() || p.name)
                );
                function add_html_to_part(p, html) {
                    if(p.display) {
                        p.display.html = html;
                        p.display.resolve_html_promise(html);
                    }
                    p.allChildren().forEach(function(cp) {
                        add_html_to_part(cp, html.querySelector('.part[data-part-path="'+cp.path+'"]'));
                    });
                }
                promise.then(function(html) {
                    add_html_to_part(p, html);
                });
            });
        },

        /** Remove a part from the display.
         *
         * @param {Numbas.parts.Part} p
         */
        removePart: function(p) {
            var qd = this;
            this.updateParts();
            this.question.signals.on('mainHTMLAttached',function() {
                p.display.html_promise.then(function(html) {
                    html.remove();
                });
            });
        },

        /** Show the question.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        show: function()
        {
            var q = this.question;
            var qd = this;
            var exam = q.exam;
            this.visited(q.visited);
            //update the question menu - highlight this question, etc.
            exam.display.updateQuestionMenu();
            switch(exam.mode) {
            case 'normal':
                this.submitMessage( R(q.parts.length<=1 ? 'control.submit answer' : 'control.submit all parts') );
                break;
            case 'review':
                break;
            }
            //show parts
            for(var i=0;i<q.parts.length;i++)
            {
                q.parts[i].display.show();
            }
            //display advice if appropriate
            this.showAdvice();
            //show correct answers if appropriate
            this.revealAnswer();
            //display score if appropriate
            this.showScore(true);
            //scroll back to top of page
            scroll(0,0);
            // make mathjax process the question text (render the maths)
            Numbas.display.typeset(this.html);
        },
        /** Called when the student leaves the question.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        leave: function() {
        },
        /**
         * Show this question's advice.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        showAdvice: function()
        {
            this.adviceDisplayed(this.question.adviceDisplayed);
        },
        /** Reveal the answers to this question.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        revealAnswer: function()
        {
            this.revealed(this.question.revealed);
            if(!this.question.revealed)
                return;
            scroll(0,0);
        },
        /**
         * Display question score and answer state.
         *
         * @param {boolean} noUpdate
         * @memberof Numbas.display.QuestionDisplay
         */
        showScore: function(noUpdate)
        {
            var q = this.question;
            var exam = q.exam;
            this.score(q.score);
            this.marks(q.marks);
            this.answered(q.answered);
            if(!noUpdate) {
                this.scoreFeedback.update(true);
            }
            var anyAnswered = false;
            for(var i=0;i<q.parts.length;i++)
            {
                anyAnswered = anyAnswered || (q.parts[i].doesMarking && q.parts[i].answered);
            }
            this.anyAnswered(anyAnswered);
            this.objectives.forEach(function(o) {
                o.score(o.objective.score);
                o.answered(o.objective.answered);
                o.feedback.update(true);
            });
            this.penalties.forEach(function(p) {
                p.score(-p.penalty.score);
                p.applied(p.penalty.applied);
            });
        },
        /** Scroll to the first part submission error.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        scrollToError: function() {
            scrollTo($('.warning-icon:visible:first'));
        },
        /** Initialise this question's display.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        init: function() {
            var q = this.question;
            for(var i=0;i<q.parts.length;i++)
            {
                q.parts[i].display.init();
            }
            this.numParts(q.parts.length);
        },
        /** Called when the attempt is resumed.
         *
         * @see Numbas.Question#resume
         */
        resume: function() {
            var q = this.question;
            this.adviceDisplayed(q.adviceDisplayed);
            this.answered(q.answered);
            this.locked(q.locked);
            this.revealed(q.revealed);
            this.visited(q.visited);
        },
        /** Called when the exam ends.
         *
         * @memberof Numbas.display.QuestionDisplay
         */
        end: function() {
            var q = this.question;
            this.locked(true);
            q.allParts().forEach(function(part) {
                part.display.end();
            });
            Numbas.display.typeset(this.html);
        }
    };
    /** Scroll the given element into view.
     *
     * @param {Element} el
     */
    function scrollTo(el)
    {
        if(!(el).length)
            return;
        var docTop = $(window).scrollTop();
        var docBottom = docTop + $(window).height();
        var elemTop = $(el).offset().top;
        if((elemTop-docTop < 50) || (elemTop>docBottom-50))
            $('html,body').animate({scrollTop: $(el).offset().top-50 });
    }
})
