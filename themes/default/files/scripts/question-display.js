Numbas.queueScript('question-display',['display-base','jme-variables','xml','schedule','jme'],function() {
    var display = Numbas.display;
    /** Display properties of a question object
     * @name QuestionDisplay
     * @memberof Numbas.display
     * @constructor
     * @param {Numbas.Question} q - the associated question object
     */
    display.QuestionDisplay = function(q)
    {
        this.question = q;
        var exam = q.exam;

        /** Has the advice been shown?
         * @member {observable|Boolean} adviceDisplayed
         * @memberof Numbas.display.QuestionDisplay
         */
        this.adviceDisplayed = ko.observable(false);

        /** Get the {@link Numbas.display.PartDisplay} object for the given path.
         * @param {partpath} path
         * @returns {Numbas.display.PartDisplay}
         * @method getPart
         * @memberof Numbas.display.QuestionDisplay
         */
        this.getPart = function(path) {
            return q.getPart(path).display;
        }

        /** Text for the "submit all answers" button
         * @member {observable|String} submitMessage
         * @memberof Numbas.display.QuestionDisplay
         */
        this.submitMessage = ko.observable('');

        /** The name to display for this question - in default locale, it's "Question {N}"
         * @member {observable|String} displayName
         * @memberof Numbas.display.QuestionDisplay
         */
        this.displayName = ko.observable(R('question.header',{'number':q.number+1}));

        /** Has the student looked at this question? ({@link Numbas.Question#visited})
         * @member {observable|Boolean} visited
         * @memberof Numbas.display.QuestionDisplay
         */
        this.visited = ko.observable(q.visited);

        /** Is this question visible in the list?
         * @member {observable|Boolean} visible
         * @memberof Numbas.display.QuestionDisplay
         */
        this.visible = ko.computed(function() {
            var q = this.question;
            var currentQuestionNumber = exam.display.currentQuestionNumber();
            return (q.number==currentQuestionNumber
                || exam.settings.navigateBrowse 												// is browse navigation enabled?
                || this.visited()							// if not, we can still move backwards to questions already seen if reverse navigation is enabled
                || (currentQuestionNumber!==null && q.number>currentQuestionNumber && exam.display.questions()[q.number-1].visited())	// or you can always move to the next question
            )
        },this);

        /** Number of parts in this question
         * @member {observable|Number} numParts
         * @memberof Numbas.display.QuestionDisplay
         */
        this.numParts = ko.observable(q.parts.length);

        /** Student's current score ({@link Numbas.Question#score})
         * @member {observable|Number} score
         * @memberof Numbas.display.QuestionDisplay
         */
        this.score = ko.observable(q.score);

        /** Total marks available for this question ({@link Numbas.Question#marks})
         * @member {observable|Number} marks
         * @memberof Numbas.display.QuestionDisplay
         */
        this.marks = ko.observable(q.marks);

        /** Proportion of available marks awarded to the student
         * @member {observable|Number} credit
         * @memberof Numbas.display.QuestionDisplay
         */
        this.credit = ko.computed(function() {
            return this.score()/this.marks();
        },this);

        /** Does this question do any marking?
         * @member {observable|Boolean} doesMarking
         * @memberof Numbas.display.QuestionDisplay
         */
        this.doesMarking = ko.computed(function() {
            return this.marks()>0
        },this);

        /** Has this question been answered? ({@link Numbas.Question#answered})
         * @member {observable|Boolean} answered
         * @memberof Numbas.display.QuestionDisplay
         */
        this.answered = ko.observable(q.answered);

        /** Have the correct answers been revealed? ({@link Numbas.Question#revealed})
         * @member {observable|Boolean} revealed
         * @memberof Numbas.display.QuestionDisplay
         */
        this.revealed = ko.observable(q.revealed);

        /** Have any of this question's parts been answered?
         * @member {observable|Boolean} anyAnswered
         * @memberof Numbas.display.QuestionDisplay
         */
        this.anyAnswered = ko.observable(false);

        /** Has the student changed any of their answers since submitting?
         * @member {observable|Boolean} isDirty
         * @memberof Numbas.display.QuestionDisplay
         */
        this.isDirty = ko.observable(false);

        /** Is the student able to reveal the correct answers?
         * @member {observable|Boolean} canReveal
         * @memberof Numbas.display.QuestionDisplay
         */
        this.canReveal = ko.computed(function() {
            return exam.settings.allowRevealAnswer && !this.revealed();
        },this);

        /** Score feedback string
         * @member {{update: function, message: observable|String}} scoreFeedback
         * @memberof Numbas.display.QuestionDisplay
         */
        this.scoreFeedback = display.showScoreFeedback(this,q.exam.settings);

        /** Show this question in review mode
         * @member {function} review
         * @method
         * @memberof Numbas.display.QuestionDisplay
         */
        this.review = function() {
            exam.reviewQuestion(q.number);
        }
    }
    display.QuestionDisplay.prototype = /** @lends Numbas.display.QuestionDisplay.prototype */
    {
        /** The associated question object
         * @type {Numbas.Question}
         * @memberof Numbas.display.QuestionDisplay
         */
        question: undefined,			//reference back to the main question object

        /** HTML representing the question
         * @type {Element}
         * @memberof Numbas.display.QuestionDisplay
         */
        html: '',						//HTML for displaying question

        /** Make the HTML to display the question 
         * @memberof Numbas.display.QuestionDisplay
         */
        makeHTML: function() {
            var q = this.question;
            var qd = this;
            var html = this.html = $($.xsl.transform(Numbas.xml.templates.question, q.xml).string);
            html.addClass('jme-scope').data('jme-scope',q.scope);
            html.attr('data-jme-context-description',R('question.header',{number:q.number+1}));
            html.find('table').wrap('<div class="table-responsive">');	// wrap tables so they have a scrollbar when they overflow
            $('#questionDisplay').append(html);

            qd.css = document.createElement('style');
            qd.css.setAttribute('type','text/css');
            if(qd.css.styleSheet) {
                qd.css.styleSheet.cssText = q.preamble.css;
            } else {
                qd.css.appendChild(document.createTextNode(q.preamble.css));
            }

            Numbas.schedule.add(function()
            {
                html.each(function(e) {
                    Numbas.jme.variables.DOMcontentsubvars(this,q.scope);
                })

                // trigger a signal that the question HTML is attached
                // DEPRECATED: use question.onHTMLAttached(fn) instead
                $('body').trigger('question-html-attached',q,qd);
                $('body').unbind('question-html-attached');

                // make mathjax process the question text (render the maths)
                Numbas.display.typeset(qd.html,qd.postTypesetF);

                q.signals.trigger('HTMLAttached');
            });
        },

        /** Show the question 
         * @memberof Numbas.display.QuestionDisplay
         */
        show: function()
        {
            var q = this.question;
            var qd = this;
            var exam = q.exam;

            this.html.append(this.css);

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
            this.postTypesetF = function(){};
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
            Numbas.display.typeset(this.html,this.postTypesetF);
        },

        /** Called when the student leaves the question 
         * @memberof Numbas.display.QuestionDisplay
         */
        leave: function() {
            $(this.css).remove();
        },

        /** Show this question's advice 
         * @memberof Numbas.display.QuestionDisplay
         */
        showAdvice: function( fromButton )
        {
            this.adviceDisplayed(this.question.adviceDisplayed);
        },

        /** Reveal the answers to this question 
         * @memberof Numbas.display.QuestionDisplay
         */
        revealAnswer: function()
        {
            this.revealed(this.question.revealed);
            if(!this.question.revealed)
                return;
            scroll(0,0);
        },

        /** Display question score and answer state 
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
                anyAnswered |= q.parts[i].answered;
            }
            this.anyAnswered(anyAnswered);
        },

        /** Scroll to the first part submission error 
         * @memberof Numbas.display.QuestionDisplay
         */
        scrollToError: function() {
            scrollTo($('.warning-icon:visible:first'));
        },

        /** Initialise this question's display 
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

        /** Called when the exam ends 
         * @memberof Numbas.display.QuestionDisplay
         */
        end: function() {
            var q = this.question;
            for(var i=0;i<q.parts.length;i++)
            {
                q.parts[i].display.end();
            }
        }
    };

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
