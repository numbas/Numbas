Numbas.queueScript('exam-display',['display-base','math','util','timing'],function() {
    var display = Numbas.display;
    var util = Numbas.util;
    /** Display properties of the {@link Numbas.Exam} object.
     *
     * @name ExamDisplay
     * @memberof Numbas.display
     * @class
     * @param {Numbas.Exam} e - associated exam
     *
     */
    display.ExamDisplay = function(e)
    {
        this.exam=e;
        /** The exam's mode.
         *
         * @see Numbas.Exam#mode
         * @member {observable|string} mode
         * @memberof Numbas.display.ExamDisplay
         */
        this.mode = Knockout.observable(e.mode);
        /** Have the correct answers been revealed?
         *
         * @see Numbas.Exam#revealed
         * @member {observable|boolean} revealed
         * @memberof Numbas.display.ExamDisplay
         */
        this.revealed = Knockout.observable(e.revealed);
        /** Is {@link Numbas.store} currently saving?
         *
         * @member {observable|boolean} saving
         * @memberof Numbas.display.ExamDisplay
         */
        this.saving = Knockout.observable(false);
        /** The name of the currently displayed info page.
         *
         * @member {observable|string} infoPage
         * @memberof Numbas.display.ExamDisplay
         */
        this.infoPage = Knockout.observable(null);
        /** The current question.
         *
         * @see Numbas.Exam#currentQuestion
         * @member {observable|Numbas.Question} currentQuestion
         * @memberof Numbas.display.ExamDisplay
         */
        this.currentQuestion = Knockout.observable(null);
        /** What kind of view are we in at the moment? 'infopage' or 'question'.
         *
         * @member {observable|string} viewType
         * @memberof Numbas.display.ExamDisplay
         */
        this.viewType = Knockout.computed(function() {
            if(this.infoPage()) {
                return 'infopage';
            } else if(this.currentQuestion()) {
                return 'question';
            }
        },this);
        /** The number of the current question.
         *
         * @member {observable|number} currentQuestionNumber
         * @memberof Numbas.display.ExamDisplay
         */
        this.currentQuestionNumber = Knockout.computed(function() {
            var q = this.currentQuestion();
            if(q)
                return q.question.number;
            else
                return null;
        },this);
        /** All the exam's question display objects.
         *
         * @member {observable|Numbas.display.QuestionDisplay[]} questions
         * @memberof Numbas.display.ExamDisplay
         */
        this.questions = Knockout.observableArray([]);
        /** Can the student go back to the previous question? False if the current question is the first one.
         *
         * @member {observable|boolean} canReverse
         * @memberof Numbas.display.ExamDisplay
         */
        this.canReverse = Knockout.computed(function() {
            return this.exam.settings.navigateReverse && this.currentQuestionNumber()>0;
        },this);
        /** Can the student go forward to the next question? False if the current question is the last one.
         *
         * @member {observable|boolean} canAdvance
         * @memberof Numbas.display.ExamDisplay
         */
        this.canAdvance = Knockout.computed(function() {
            return this.currentQuestionNumber()<this.exam.settings.numQuestions-1;
        },this);
        /** The student's total score.
         *
         * @see Numbas.Exam#score
         * @member {observable|number} score
         * @memberof Numbas.display.ExamDisplay
         */
        this.score = Knockout.observable(e.score);
        /** Show the student their total score?
         *
         * @member {observable|boolean} showActualMark
         * @memberof Numbas.display.ExamDisplay
         */
        this.showActualMark = Knockout.computed(function() {
            return e.settings.showActualMark || (this.revealed() && e.settings.reviewShowScore) || Numbas.is_instructor;
        },this);
        /** Label to use for the "print your transcript" button on the results page.
         *
         * @member {observable|string} printLabel
         * @memberof Numbas.display.ExamDisplay
         */
        this.printLabel = Knockout.computed(function() {
            return R(this.showActualMark() ? "result.print" : "end.print");
        },this);
        /** The total marks available for the exam.
         *
         * @see Numbas.Exam#mark
         * @member {observable|number} marks
         * @memberof Numbas.display.ExamDisplay
         */
        this.marks = Knockout.observable(e.mark);
        /** The percentage score the student needs to achieve to pass, formatted as a string.
         *
         * @see Numbas.Exam#percentPass
         * @member {observable|string} percentPass
         * @memberof Numbas.display.ExamDisplay
         */
        this.percentPass = Knockout.observable(e.settings.percentPass*100+'%');
        /** String displaying the student's current score, and the total marks available, if allowed.
         *
         * @member {observable|string} examScoreDisplay
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
        /** The student's total score as a percentage of the total marks available.
         *
         * @member {observable|number} percentScore
         * @memberof Numbas.display.ExamDisplay
         */
        this.percentScore = Knockout.observable(0);
        /** The time left in the exam.
         *
         * @member {observable|string} displayTime
         * @memberof Numbas.display.ExamDisplay
         */
        this.displayTime = Knockout.observable('');
        /** Show the names of question groups in the menu?
         *
         * @member {observable|string} showQuestionGroupNames
         * @memberof Numbas.display.ExamDisplay
         */
        this.showQuestionGroupNames = Knockout.observable(e.settings.showQuestionGroupNames);
        /** Time the exam started, formatted for display.
         *
         * @member {observable|string} startTime
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
        /** Time the exam ended, formatted for display.
         *
         * @member {observable|string} endTime
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
        /** The total time the student has spent in the exam.
         *
         * @member {observable|string} timeSpent
         * @memberof Numbas.display.ExamDisplay
         */
        this.timeSpent = Knockout.observable('');
        /** Is the student allowed to pause the exam?
         *
         * @member {boolean} allowPause
         * @memberof Numbas.display.ExamDisplay
         */
        this.allowPause = e.settings.allowPause;
        /** Total number of questions the student attempted.
         *
         * @member {observable|number} questionsAttempted
         * @memberof Numbas.display.ExamDisplay
         */
        this.questionsAttempted = Knockout.computed(function() {
            return this.questions().reduce(function(s,q) {
                return s + (q.answered() ? 1 : 0);
            },0);
        },this);
        /** Total number of questions the student attempted, formatted as a fraction of the total number of questions.
         *
         * @member {observable|string} questionsAttemptedDisplay
         * @memberof Numbas.display.ExamDisplay
         */
        this.questionsAttemptedDisplay = Knockout.computed(function() {
            return this.questionsAttempted()+' / '+this.exam.settings.numQuestions;
        },this);
        /** The result of the exam - passed or failed?
         *
         * @member {observable|string} result
         * @memberof Numbas.display.ExamDisplay
         */
        this.result = Knockout.observable('');
        /** Did the student pass the exam?
         *
         * @member {observable|boolean} passed
         * @memberof Numbas.display.ExamDisplay
         */
        this.passed = Knockout.observable(false);
        /** Message shown to the student based on their total score.
         *
         * @member {observable|string} feedbackMessage
         * @memberof Numbas.display.ExamDisplay
         */
        this.feedbackMessage = Knockout.observable(null);

        /** Does this exam need a password to begin?
         *
         * @member {observable|boolean} canBegin
         * @memberof Numbas.display.ExamDisplay
         */
        this.needsPassword = e.settings.startPassword != '';

        /** Password entered by the student.
         *
         * @member {observable|string} enteredPassword
         * @memberof Numbas.display.ExamDisplay
         */
        this.enteredPassword = Knockout.observable('');

        /** Can the exam begin? True if no password is required, or if the student has entered the right password.
         *
         * @see Numbas.Exam#acceptPassword
         * @member {observable|boolean} canBegin
         * @memberof Numbas.display.ExamDisplay
         */
        this.canBegin = Knockout.computed(function() {
            return this.exam.acceptPassword(this.enteredPassword());
        },this);

        /** Feedback on the password the student has entered.
         * Has properties `iconClass`, `title` and `buttonClass`.
         *
         * @member {observable|object} passwordFeedback
         * @memberof Numbas.display.ExamDisplay
         */
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
        /** Reference to the associated exam object.
         *
         * @type {Numbas.Exam}
         * @memberof Numbas.display.ExamDisplay
         */
        exam: undefined,

        /** Try to begin the exam.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        beginExam: function() {
            Numbas.controls.beginExam();
        },

        /** Update the timer.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        showTiming: function()
        {
            this.displayTime(Numbas.timing.secsToDisplayTime(this.exam.timeRemaining));
            this.timeSpent(Numbas.timing.secsToDisplayTime(this.exam.timeSpent));
        },
        /** Initialise the question list display.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        initQuestionList: function() {
            var exam = this.exam;
            this.question_groups = this.exam.question_groups.map(function(g) {
                var questions = Knockout.observable(g.questionList.map(function(q){return q.display}));
                var show_name = Knockout.computed(function() {
                    return questions().some(function(q) { return q.visible(); });
                });
                var qg = {
                    name: g.settings.name,
                    group: g,
                    questions: questions,
                    show_name: show_name,
                    doesMarking: Knockout.observable(true)
                }
                qg.marks = Knockout.computed(function() {
                    var total = 0;
                    questions().forEach(function(qd) {
                        total += qd.marks();
                    });
                    return total;
                });
                qg.score = Knockout.computed(function() {
                    var score = 0;
                    questions().forEach(function(qd) {
                        score += qd.score();
                    });
                    return score;
                });
                qg.credit = Knockout.computed(function() {
                    var score = qg.score();
                    var marks = qg.marks();
                    return marks==0 ? 0 : score/marks;
                });
                qg.revealed= Knockout.computed(function() {
                    return questions().every(function(qd) {
                        return qd.revealed();
                    });
                });
                qg.anyAnswered = Knockout.computed(function() {
                    return questions().some(function(qd) {
                        return qd.anyAnswered();
                    });
                })
                qg.answered = Knockout.computed(function() {
                    return questions().every(function(qd) {
                        return qd.answered();
                    });
                });
                qg.feedback = display.showScoreFeedback(qg,exam.settings);
                return qg;
            });
            for(var i=0; i<this.exam.questionList.length; i++) {
                this.questions.push(this.exam.questionList[i].display);
            }
        },
        /** Hide the timer.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        hideTiming: function()
        {
            this.displayTime('');
        },
        /** Show/update the student's total score.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        showScore: function()
        {
            var exam = this.exam;
            this.marks(Numbas.math.niceNumber(exam.mark));
            this.score(Numbas.math.niceNumber(exam.score));
            this.percentScore(exam.percentScore);
        },
        /** Update the question list display - typically, scroll so the current question is visible.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        updateQuestionMenu: function()
        {
            var exam = this.exam;
            //scroll question list to centre on current question
            if(display.carouselGo)
                display.carouselGo(exam.currentQuestion.number-1,300);
        },
        /** Show an info page (one of the front page, pause, or results).
         *
         * @param {string} page - Name of the page to show.
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
            }
            this.hideNavMenu();
        },
        /** Show the current question.
         *
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
        /** Hide the sliding side menu.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        hideNavMenu: function() {
            if($('#navMenu').data('bs.offcanvas')) {
                $('#navMenu').offcanvas('hide');
            }
        },
        /** Called just before the current question is regenerated.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        startRegen: function() {
            $('#questionDisplay').hide();
            var html = this.exam.currentQuestion.display.html;
            html.parentElement.removeChild(html);
            this.oldQuestion = this.exam.currentQuestion.display;
        },
        /** Called after the current question has been regenerated.
         *
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
        /**
         * Apply knockout bindings to the given question.
         *
         * @param {Numbas.Question} question
         * @memberof Numbas.display.ExamDisplay
         */
        applyQuestionBindings: function(question) {
        },
        /** Reveal the answers to every question in the exam.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        revealAnswers: function() {
            this.revealed(this.exam.revealed);
        },
        /** Called when the exam ends.
         *
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
