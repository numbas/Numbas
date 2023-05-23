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

        /** How many questions do some assessment, i.e. have one or more parts that aren't information-only, or are explore mode?
         */
        this.numAssessedQuestions = Knockout.computed(function() {
            return this.questions().filter(function(qd) {
                return qd.question.partsMode == 'explore' || qd.question.parts.some(function(p) { return p.type != 'information'; });
            }).length;
        }, this);
        /** Can the student go back to the previous question? False if the current question is the first one.
         *
         * @member {observable|boolean} canReverse
         * @memberof Numbas.display.ExamDisplay
         */
        this.canReverse = Knockout.computed(function() {
            return (this.mode()=='review' || this.exam.settings.navigateReverse) && this.currentQuestionNumber()>0;
        },this);
        /** Can the student go forward to the next question? False if the current question is the last one.
         *
         * @member {observable|boolean} canAdvance
         * @memberof Numbas.display.ExamDisplay
         */
        this.canAdvance = Knockout.computed(function() {
            switch(this.exam.settings.navigateMode) {
                case 'diagnostic':
                    return true;
                default:
                    return this.currentQuestionNumber()<this.exam.settings.numQuestions-1;
            }
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
        /** Allow the student to print an exam transcript?
         * 
         * @see Numbas.Exam#settings#percentPass
         * @member {observable|boolean} allowPrinting
         * @memberof Numbas.display.ExamDisplay
         */
        this.allowPrinting = Knockout.observable(e.settings.allowPrinting);
        /** Allow the student to download a CSV of their results?
         * 
         * @member {observable|boolean} allowCsvDownload
         * @memberof Numbas.display.ExamDisplay
         */
        this.allowCsvDownload = Knockout.observable(e.settings.allowCsvDownload); 
        /** Key to use for encrypting student data
         * 
         * @member {observable|string} csvEncryptionKey
         * @memberof Numbas.display.ExamDisplay
         */
        this.csvEncryptionKey = Knockout.observable(e.settings.csvEncryptionKey);
        /** Label to use for the "print your transcript" button on the results page.
         *
         * @member {observable|string} printLabel
         * @memberof Numbas.display.ExamDisplay
         */
        this.printLabel = Knockout.computed(function() {
            return R(this.showActualMark() || !this.allowPrinting() ? "result.print" : "end.print");
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
         * @see Numbas.Exam#settings#percentPass
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
        /** The time allowed for the exam, in seconds.
         *
         * @member {observable|number} duration
         * @memberof Numbas.display.ExamDisplay
         */
        this.duration = Knockout.observable(e.settings.duration);
        this.displayDuration = Knockout.computed(function() {
            var duration = this.duration();
            return duration>0 ? Numbas.timing.secsToDisplayTime( duration ) : '';
        },this);
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
         * @member {boolean} needsPassword
         * @memberof Numbas.display.ExamDisplay
         */
        this.needsPassword = e.settings.startPassword != '';

        /** Password entered by the student.
         *
         * @member {observable|string} enteredPassword
         * @memberof Numbas.display.ExamDisplay
         */
        this.enteredPassword = Knockout.observable('');

        /** Does this require the student to input their name
         *
         * @member {boolean} needsStudentName
         * @memberof Numbas.display.ExamDisplay
         */
        this.needsStudentName = e.settings.needsStudentName;

        /** Does this exam allow the student to download their results as a csv?
         *
         * @member {boolean} allowCsvDownload
         * @memberof Numbas.display.ExamDisplay
         */
        this.allowCsvDownload = e.settings.allowCsvDownload;

        /** Key for encrypting student data
         *
         * @member {string} csvEncryptionKey
         * @memberof Numbas.display.ExamDisplay
         */
        this.csvEncryptionKey = e.settings.csvEncryptionKey;

        /** The public encryption key for protecting student download of data
         *
         * @member {string} encryptionKey
         * @memberof Numbas.display.ExamDisplay
         */
         this.csvEncryptionKey = e.settings.csvEncryptionKey;


        /** Student's name.
         *
         * @member {observable|string} student_name
         * @memberof Numbas.display.ExamDisplay
         */
        this.student_name = Knockout.observable('');

        /** Can the exam begin? True if no password is required, or if the student has entered the right password, and no name is required or the student has entered a name.
         *
         * @see Numbas.Exam#acceptPassword
         * @member {observable|boolean} canBegin
         * @memberof Numbas.display.ExamDisplay
         */
        this.canBegin = Knockout.computed(function() {
            return this.exam.acceptPassword(this.enteredPassword()) && (!this.needsStudentName || this.student_name().trim() != '');
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

        /** The student's progress through a diagnostic test.
         */
        this.diagnostic_progress = Knockout.observableArray([]);
        this.diagnostic_feedback = Knockout.observable('');
        this.diagnostic_next_actions = Knockout.observable({feedback: '',actions:[]});

        this.current_topic = ko.observable(null);

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
            if(!this.canBegin()) {
                return;
            }
            this.exam.student_name = this.student_name();
            Numbas.controls.beginExam();
        },

        /** Update the timer.
         *
         * @memberof Numbas.display.ExamDisplay
         */
        showTiming: function()
        {
            this.duration(this.exam.settings.duration);
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

        updateQuestionList: function() {
            if(!this.question_groups) {
                return;
            }
            this.question_groups.forEach(function(qg) {
                qg.questions(qg.group.questionList.map(function(q) { return q.display; }));
            });
            this.questions(this.exam.questionList.map(function(q) { return q.display; }));
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

            if(exam.settings.navigateMode=='diagnostic' && exam.diagnostic_progress) {
                this.diagnostic_feedback(exam.diagnostic_feedback);
                this.diagnostic_progress(exam.diagnostic_progress.map(function(a) {
                    return {
                        name: a.name,
                        progress: a.progress,
                        credit: a.credit
                    };
                }));
            }
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
            var ed = this;
            window.onbeforeunload = null;
            this.infoPage(page);
            this.currentQuestion(null);
            var exam = this.exam;
            //scroll back to top of screen
            scroll(0,0);
            var hide_menu = true;
            switch(page) {
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
                case "paused":
                case "resumed":
                    this.showScore();
                    break;
            }
            this.hideNavMenu();
        },

        /** Show the modal dialog with actions the student can take to move on from the current question.
         */
        showDiagnosticActions: function() {
            var ed = this;
            var res = this.exam.diagnostic_actions();
            var actions = {
                feedback: res.feedback,
                actions: res.actions.map(function(action) {
                    var out = {
                        label: action.label,
                        go: function() {
                            ed.do_diagnostic_action(action);
                        }
                    }
                    return out;
                })
            };
            this.diagnostic_next_actions(actions);
            $('#next-actions-modal').modal('show');
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
            if(exam.settings.navigateMode=='diagnostic') {
                this.current_topic(exam.diagnostic_controller.current_topic());
            }
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

        do_diagnostic_action: function(action) {
            $('#next-actions-modal').modal('hide');
            this.exam.do_diagnostic_action(action);
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
        },
        download_csv: async function(){
            let contents = Numbas.exam.results_csv();
            let encryptedContents = await Numbas.download.encrypt(contents, this.exam.settings.csvEncryptionKey);
            encryptedContents = Numbas.download.b64encode(encryptedContents);
            function slugify(str) {
                if (str === undefined){
                    return '';
                }
                return (str + '').replace(/\s+/g,'-').replace(/[^a-zA-Z0-9\-]/g,'').replace(/-+/g,'-');
                
            }
            const exam_slug = slugify(this.exam.settings.name) ;
            const student_name_slug = slugify(this.exam.student_name);
            const start_time = this.exam.start.toISOString().replace(':','-');
            let filename = `${exam_slug}-${student_name_slug}-${start_time}.txt`;
            Numbas.download.download_file(encryptedContents,filename);
        },
        download_exam_object: async function(){
            let exam_object = Numbas.store.examSuspendData();
            let contents = JSON.stringify(exam_object); //this will need to be a json of the exam object, which seems like it should be created somewhere already as we have ways to access it?
            let encryptedContents = await Numbas.download.encrypt(contents, this.exam.settings.csvEncryptionKey);
            encryptedContents = Numbas.download.b64encode(encryptedContents);
            function slugify(str) {
                if (str === undefined){
                    return '';
                }
                return (str + '').replace(/\s+/g,'-').replace(/[^a-zA-Z0-9\-]/g,'').replace(/-+/g,'-');
                
            }
            const exam_slug = slugify(this.exam.settings.name) ;
            const student_name_slug = slugify(this.exam.student_name);
            const start_time = this.exam.start.toISOString().replace(':','-');
            let filename = `${exam_slug}-${student_name_slug}-${start_time}.txt`;
            Numbas.download.download_file(encryptedContents,filename);
        }
    };
});
