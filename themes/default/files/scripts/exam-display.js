Numbas.queueScript('exam-display',['display-base','math','util','timing'],function() {
    var display = Numbas.display;
    var util = Numbas.util;
    /** Display properties of the {@link Numbas.Exam} object.
     * @name ExamDisplay
     * @memberof Numbas.display
     * @constructor
     * @param {Numbas.Exam} e - associated exam
     *
     */
    display.ExamDisplay = function(e)
    {
        this.exam=e;
        /** The exam's mode ({@link Numbas.Exam#mode})
         * @member {observable|String} mode
         * @memberof Numbas.display.ExamDisplay
         */
        this.mode = Knockout.observable(e.mode);
        /** Is {@link Numbas.store} currently saving?
         * @member {observable|Boolean} saving
         * @memberof Numbas.display.ExamDisplay
         */
        this.saving = Knockout.observable(false);
        /** The name of the currently displayed info page
         * @member {observable|String} infoPage
         * @memberof Numbas.display.ExamDisplay
         */
        this.infoPage = Knockout.observable(null);
        /** The current question ({@link Numbas.Exam#currentQuestion})
         * @member {observable|Numbas.Question} currentQuestion
         * @memberof Numbas.display.ExamDisplay
         */
        this.currentQuestion = Knockout.observable(null);
        /** What kind of view are we in at the moment? 'infopage' or 'question'
         * @member {observable|String} viewType
         * @memberof Numbas.display.ExamDisplay
         */
        this.viewType = Knockout.computed(function() {
            if(this.infoPage()) {
                return 'infopage';
            } else if(this.currentQuestion()) {
                return 'question';
            }
        },this);
        /** The number of the current question
         * @member {observable|Number} currentQuestionNumber
         * @memberof Numbas.display.ExamDisplay
         */
        this.currentQuestionNumber = Knockout.computed(function() {
            var q = this.currentQuestion();
            if(q)
                return q.question.number;
            else
                return null;
        },this);
        /** All the exam's question display objects
         * @member {observable|Numbas.display.QuestionDisplay[]} questions
         * @memberof Numbas.display.ExamDisplay
         */
        this.questions = Knockout.observableArray([]);
        /** Can the student go back to the previous question? (False if the current question is the first one
         * @member {observable|Boolean} canReverse
         * @memberof Numbas.display.ExamDisplay
         */
        this.canReverse = Knockout.computed(function() {
            return this.exam.settings.navigateReverse && this.currentQuestionNumber()>0;
        },this);
        /** Can the student go forward to the next question? (False if the current question is the last one)
         * @member {observable|Boolean} canAdvance
         * @memberof Numbas.display.ExamDisplay
         */
        this.canAdvance = Knockout.computed(function() {
            return this.currentQuestionNumber()<this.exam.settings.numQuestions-1;
        },this);
        /** The student's total score ({@link Numbas.Exam#score})
         * @member {observable|Number} score
         * @memberof Numbas.display.ExamDisplay
         */
        this.score = Knockout.observable(e.score);
        /** The total marks available for the exam ({@link Numbas.Exam#mark})
         * @member {observable|Number} marks
         * @memberof Numbas.display.ExamDisplay
         */
        this.marks = Knockout.observable(e.mark);
        /** The percentage score the student needs to achieve to pass ({@link Numbas.Exam#percentPass}), formatted as a string.
         * @member {observable|String} percentPass
         * @memberof Numbas.display.ExamDisplay
         */
        this.percentPass = Knockout.observable(e.settings.percentPass*100+'%');
        /** String displaying the student's current score, and the total marks available, if allowed
         * @member {observable|String} examScoreDisplay
         * @memberof Numbas.display.ExamDisplay
         */
        this.examScoreDisplay = Knockout.computed(function() {
            var niceNumber = Numbas.math.niceNumber;
            var exam = this.exam;
            var score = this.score();
            var marks = this.marks();
            var totalExamScoreDisplay = '';
            if(exam.settings.showTotalMark)
                totalExamScoreDisplay = niceNumber(score)+'/'+niceNumber(marks);
            else
                totalExamScoreDisplay = niceNumber(score);
            return totalExamScoreDisplay;
        },this);
        /** The student's total score as a percentage of the total marks available
         * @member {observable|Number} percentScore
         * @memberof Numbas.display.ExamDisplay
         */
        this.percentScore = Knockout.observable(0);
        /** The time left in the exam
         * @member {observable|String} displayTime
         * @memberof Numbas.display.ExamDisplay
         */
        this.displayTime = Knockout.observable('');
        /** Show the names of question groups in the menu?
         * @member {observable|String} showQuestionGroupNames
         * @memberof Numbas.display.ExamDisplay
         */
        this.showQuestionGroupNames = Knockout.observable(e.settings.showQuestionGroupNames);
        /** Time the exam started, formatted for display
         * @mamber {observable|String} startTime
         * @memberof Numbas.display.ExamDisplay
         */
        var _startTime = Knockout.observable();
        this.startTime = Knockout.computed({
            read: function() {
                var t = _startTime();
                if(t) {
                    return util.formatTime(new Date(t));
                } else {
                    return '';
                }
            },
            write: function(v) {
                return _startTime(v);
            }
        });
        /** Time the exam ended, formatted for display
         * @mamber {observable|String} endTime
         * @memberof Numbas.display.ExamDisplay
         */
        var _endTime = Knockout.observable();
        this.endTime = Knockout.computed({
            read: function() {
                var t = _endTime();
                if(t) {
                    return util.formatTime(new Date(t));
                } else {
                    return '';
                }
            },
            write: function(v) {
                return _endTime(v);
            }
        });
        /** The total time the student has spent in the exam
         * @member {observable|String} timeSpent
         * @memberof Numbas.display.ExamDisplay
         */
        this.timeSpent = Knockout.observable('');
        /** Is the student allowed to pause the exam?
         * @member {Boolean} allowPause
         * @memberof Numbas.display.ExamDisplay
         */
        this.allowPause = e.settings.allowPause;
        /** Total number of questions the student attempted
         * @member {observable|Number} questionsAttempted
         * @memberof Numbas.display.ExamDisplay
         */
        this.questionsAttempted = Knockout.computed(function() {
            return this.questions().reduce(function(s,q) {
                return s + (q.answered() ? 1 : 0);
            },0);
        },this);
        /** Total number of questions the student attempted, formatted as a fraction of the total number of questions
         * @member {observable|String} questionsAttemptedDisplay
         * @memberof Numbas.display.ExamDisplay
         */
        this.questionsAttemptedDisplay = Knockout.computed(function() {
            return this.questionsAttempted()+' / '+this.exam.settings.numQuestions;
        },this);
        /** The result of the exam - passed or failed?
         * @member {observable|String} result
         * @memberof Numbas.display.ExamDisplay
         */
        this.result = Knockout.observable('');
        /** Did the student pass the exam?
         * @member {observable|Boolean} passed
         * @memberof Numbas.display.ExamDisplay
         */
        this.passed = Knockout.observable(false);
        /** Message shown to the student based on their total score
         * @member {observable|String} feedbackMessage
         * @memberof Numbas.display.ExamDisplay
         */
        this.feedbackMessage = Knockout.observable(null);

        this.needsPassword = e.settings.startPassword != '';

        /** Password entered by the student
         * @member {observable|String} enteredPassword
         * @memberof Numbas.display.ExamDisplay
         */
        this.enteredPassword = Knockout.observable('');

        this.canBegin = Knockout.computed(function() {
            return this.exam.acceptPassword(this.enteredPassword());
        },this);

        this.passwordFeedback = Knockout.computed(function() {
            if(this.canBegin()) {
                return {iconClass: 'icon-ok', title: R('exam.password.correct'), buttonClass: 'btn-success'};
            } else if(this.enteredPassword()=='') {
                return {iconClass: '', title: '', buttonClass: 'btn-primary'}
            } else {
                return {iconClass: 'icon-remove', title: R('exam.password.incorrect'), buttonClass: 'btn-danger'};
            }
        },this);

        document.title = e.settings.name;
    }
    display.ExamDisplay.prototype = /** @lends Numbas.display.ExamDisplay.prototype */
    {
        /** Reference to the associated exam object
         * @type {Numbas.Exam}
         * @memberof Numbas.display.ExamDisplay
         */
        exam: undefined,

        /** Try to begin the exam
         * @memberof Numbas.display.ExamDisplay
         */
        beginExam: function() {
            Numbas.controls.beginExam();
        },

        /** Update the timer
         * @memberof Numbas.display.ExamDisplay
         */
        showTiming: function()
        {
            this.displayTime(Numbas.timing.secsToDisplayTime(this.exam.timeRemaining));
            this.timeSpent(Numbas.timing.secsToDisplayTime(this.exam.timeSpent));
        },
        /** Initialise the question list display
         * @memberof Numbas.display.ExamDisplay
         */
        initQuestionList: function() {
            this.question_groups = this.exam.question_groups.map(function(g) {
                return {
                    name: g.settings.name,
                    group: g,
                    questions: Knockout.observable(g.questionList.map(function(q){return q.display}))
                }
            });
            for(var i=0; i<this.exam.questionList.length; i++) {
                this.questions.push(this.exam.questionList[i].display);
            }
        },
        /** Hide the timer
         * @memberof Numbas.display.ExamDisplay
         */
        hideTiming: function()
        {
            this.displayTime('');
        },
        /** Show/update the student's total score
         * @memberof Numbas.display.ExamDisplay
         */
        showScore: function()
        {
            var exam = this.exam;
            this.marks(Numbas.math.niceNumber(exam.mark));
            this.score(Numbas.math.niceNumber(exam.score));
            this.percentScore(exam.percentScore);
        },
        /** Update the question list display - typically, scroll so the current question is visible
         * @memberof Numbas.display.ExamDisplay
         */
        updateQuestionMenu: function()
        {
            var exam = this.exam;
            //scroll question list to centre on current question
            if(display.carouselGo)
                display.carouselGo(exam.currentQuestion.number-1,300);
        },
        /** Show an info page (one of the front page, pause , results, or exit)
         * @param {String} page - name of the page to show
         * @memberof Numbas.display.ExamDisplay
         */
        showInfoPage: function(page)
        {
            window.onbeforeunload = null;
            this.infoPage(page);
            this.currentQuestion(null);
            var exam = this.exam;
            //scroll back to top of screen
            scroll(0,0);
            switch(page)
            {
            case "frontpage":
                this.marks(exam.mark);
                break;
            case "result":
                this.result(exam.result);
                this.passed(exam.passed);
                this.feedbackMessage(exam.feedbackMessage);
                this.startTime(exam.start);
                this.endTime(exam.stop);
                break;
            case "suspend":
                this.showScore();
                break;
            case "exit":
                break;
            }
            this.hideNavMenu();
        },
        /** Show the current question
         * @memberof Numbas.display.ExamDisplay
         */
        showQuestion: function()
        {
            var exam = this.exam;
            this.infoPage(null);
            this.currentQuestion(exam.currentQuestion.display);
            if(exam.settings.preventLeave && this.mode() != 'review')
                window.onbeforeunload = function() { return R('control.confirm leave') };
            else
                window.onbeforeunload = null;
            exam.currentQuestion.display.show();
            this.hideNavMenu();
        },
        /** Hide the sliding side menu
         * @memberof Numbas.display.ExamDisplay
         */
        hideNavMenu: function() {
            if($('#navMenu').data('bs.offcanvas')) {
                $('#navMenu').offcanvas('hide');
            }
        },
        /** Called just before the current question is regenerated
         * @memberof Numbas.display.ExamDisplay
         */
        startRegen: function() {
            $('#questionDisplay').hide();
            this.exam.currentQuestion.display.html.remove();
            this.oldQuestion = this.exam.currentQuestion.display;
        },
        /** Called after the current question has been regenerated
         * @memberof Numbas.display.ExamDisplay
         */
        endRegen: function() {
            var currentQuestion = this.exam.currentQuestion;
            this.questions.splice(currentQuestion.number,1,currentQuestion.display);
            var group = this.question_groups.filter(function(g){return g.group == currentQuestion.group})[0];
            var n_in_group = currentQuestion.group.questionList.indexOf(currentQuestion);
            var group_questions = group.questions();
            group_questions.splice(n_in_group,1,currentQuestion.display);
            group.questions(group_questions);
            this.applyQuestionBindings(currentQuestion);
            $('#questionDisplay').fadeIn(200);
        },
        /** Apply knockout bindings to the given question
         * @param {Numbas.Question}
         * @memberof Numbas.display.ExamDisplay
         */
        applyQuestionBindings: function(question) {
            Knockout.applyBindings({exam: this, question: question.display},question.display.html[0]);
        },
        /** Called when the exam ends
         * @memberof Numbas.display.ExamDisplay
         */
        end: function() {
            this.timeSpent(Numbas.timing.secsToDisplayTime(this.exam.timeSpent));
            this.mode(this.exam.mode);
            this.questions().map(function(q) {
                q.end();
            });
        }
    };
});
