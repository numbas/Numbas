Numbas.queueScript('worksheet-display',['display-base', 'display-util', 'display-color', 'start-exam'], function() {
var display_util = Numbas.display_util;
var display_color = Numbas.display_color;

class WorksheetStyleCustomiser extends Numbas.display.StyleCustomiser {
    static style_variables = Numbas.display.StyleCustomiser.style_variables.concat(['--spacing-scale', '--page-margin-top', '--page-margin-bottom', '--page-margin-right', '--page-margin-left']);

    constructor() {
        super(...arguments);
    }
}

class WorksheetDisplay {
    constructor() {
        document.getElementById('everything').removeAttribute('style');
        this.show_settings = ko.observable(true);

        this.cancelling_generation = false;

        this.cancel_generation = () => {
            this.cancelling_generation = true;
            this.reconfigure();
        }

        this.style_customiser = new WorksheetStyleCustomiser(document.body);

        this.saveStyle = () => {
            this.style_customiser.save();

            for(let el of document.querySelectorAll('numbas-exam')) {
                el.style_customiser?.load();
            }

            document.getElementById('style-modal').close();
        }

        this.exams = ko.observableArray([]);
        
        this.shown_id = ko.observable(0);
        this.shown_exam = ko.pureComputed(function() {
            return this.exams()[this.shown_id()-this.offset()];
        },this);

        ko.computed(function() {
            this.exams().forEach(ex => {
                ex.shown(ex==this.shown_exam());
            });
        },this);

        this.numExams = ko.observable(1);
        this.sheetTypes = [
            {name: 'questionsheet', label: R('worksheet.question sheets')},
            {name: 'answersheet', label: R('worksheet.answer sheets')}
        ];
        this.sheetType = ko.observable(this.sheetTypes[0]);

        this.break_between_questions = ko.observable(false);

        this.show_exam_id = ko.observable(true);

        this.answersheet_show_question_content = ko.observable(true);

        this.exam_classes = ko.pureComputed(function() {
            return {
                'questionsheet': this.sheetType().name=='questionsheet',
                'answersheet': this.sheetType().name=='answersheet',
                'break-between-questions': this.break_between_questions(),
                'show-exam-id': this.show_exam_id(),
                'answersheet-show-question-content': this.answersheet_show_question_content(),
            }
        },this);

        /** The number of exams that have finished processing.
         *
         * @type {observable<number>}
         */
        this.progress = ko.pureComputed(function() {
            return this.exams().filter(e => e.status() != 'working').length;
        },this);

        /** A text description of progress.
         *
         * @type {observable<string>}
         */
        this.progressText = ko.pureComputed(function() {
            if(this.numExams()==0) {
                return '';
            }
            const percent = Math.floor(100*this.progress()/this.numExams());
            return `${percent}%`;
        },this);


        /** What is the status of the generator?
         * `configuring` - changing some of the settings.
         * `working` - generating exams
         * `done` - all exams generated
         */
        this.status = ko.observable('configuring');

        this.offset = ko.observable(0);

        this.page_margin_style = ko.pureComputed(() => {
            const {style} = this.style_customiser;
            return `@page {
    margin-top: ${style['--page-margin-top']()}mm;
    margin-bottom: ${style['--page-margin-bottom']()}mm;
    margin-left: ${style['--page-margin-left']()}mm;
    margin-right: ${style['--page-margin-right']()}mm;
}`;
        });
    }

    clear_exams() {
        this.exams([]);
        this.shown_id(this.offset());
        var examList = document.getElementById('examList');
        examList.innerHTML = '';
    }

    reconfigure() {
        this.clear_exams();
        this.show_settings(true);
        this.status('configuring');
    }

    generate() {
        var w = this;

        this.cancelling_generation = false;
        this.show_settings(false);

        this.clear_exams();
        var offset = parseInt(this.offset());
        var numExams = parseInt(this.numExams());

        this.status('working');
        this.show_settings(false);

        function make(n) {
            if(w.cancelling_generation) {
                w.clear_exams();
                return;
            }
            var e = new GeneratedExam(offset+n);
            w.exams.push(e);
            if(n < numExams - 1) {
                e.loaded.promise.then(() => make(n+1));
            } else {
                Promise.all(w.exams().map(ed => ed.loaded.promise)).then(() => {
                    w.status('done');

                });
                /*
                Promise.all(w.exams().map(function(ge){ return ge.exam.signals.getCallback('HTML attached').promise })).then(function() {
                    w.status('done');

                    try {
                        MathJax.typeset([document.getElementById('examList')]);
                    } catch(e) {
                        if(MathJax===undefined && !display.failedMathJax) {
                            display.failedMathJax = true;
                            display.showAlert("Failed to load MathJax. Maths will not be typeset properly.\n\nIf you are the exam author, please check that you are connected to the internet, or modify the theme to load a local copy of MathJax. Instructions for doing this are given in the manual.");
                        } else {
                            Numbas.showError(e);
                        }
                    }
                });
                */
            }
        }

        if(numExams > 0) {
            make(0);
        }

    }

    print() {
        window.print();
    }

    showStyleModal() {
        document.getElementById('style-modal').showModal();
    }
};

class GeneratedExam {
    constructor(offset)  {
        var ge = this;
        this.id = offset;
        this.status = ko.observable('working');

        this.shown = ko.observable(false);

        this.init_data = Numbas.get_exam_init_data();

        this.loaded = Promise.withResolvers();

        this.exam = ko.observable(null);

        this.loaded.promise.then((exam) => {
            exam.settings.showActualMark = 'never';
            exam.settings.showAnswerState = 'never';
            exam.questionList.forEach(function(q) {
                q.display.revealed(true);
                q.allParts().forEach(p => {
                    p.display.revealed(true);
                })
            });

            this.exam(exam);
            this.status('done');
        });
    }

    exam_loaded(ed, e) {
        this.loaded.resolve(e.detail.exam);
    }
}

/* Override the showScoreFeedback logic to force the state of a worksheet: as if nothing is entered and there's no "current score".
 */
var base_showScoreFeedback = display_util.showScoreFeedback;
display_util.showScoreFeedback = function(obj,settings)
{   
    const obj2 = {
        answered: () => false,
        isDirty: () => false,
        ended: () => false,
        score: () => 0,
        marks: () => Knockout.unwrap(obj.marks),
        credit: () => 0,
        doesMarking: () => Knockout.unwrap(obj.marks),
        revealed: () => false,
        plainScore: obj.plainScore
    };
    const settings2 = {
        showTotalMark: settings.showTotalMark,
        showActualMark: false,
        showAnswerState: false,
        reviewShowScore: false,
        reveal_answers_for_instructor: false
    };

    return base_showScoreFeedback(obj2, settings2); 
};


Numbas.init_promise.then(() => {
    const vm = new WorksheetDisplay();
    Knockout.applyBindings(vm, document.getElementById('everything'));
    window.vm = vm;
})


});
