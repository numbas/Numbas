Numbas.queueScript('display/parts/multipleresponse',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    var util = Numbas.util;
    /** Display code for a {@link Numbas.parts.MultipleResponsePart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name MultipleResponsePartDisplay
     * @memberof Numbas.display
     */
    display.MultipleResponsePartDisplay = function()
    {
        var pd = this;
        var p = this.part;

        this.displayColumns = Knockout.observable(p.settings.displayColumns);

        this.showCellAnswerState = Knockout.pureComputed(() => p.settings.showCellAnswerState && this.showCorrectAnswer());

        switch(p.type) {
        case '1_n_2':
            const choices = p.settings.choices;
            switch(p.settings.displayType) {
                case 'radiogroup':
                    this.input_widget = 'radios';
                    break;
                case 'dropdownlist':
                    this.input_widget = 'dropdown';
                    break;
            }

            this.cellFeedback = Knockout.pureComputed(() => {
                const answer = this.input_answer() || [];
                if(!answer.valid) {
                    return [];
                }
                let feedback = answer.value.map((row) => '');
                if(!this.showCellAnswerState()) {
                    return feedback;
                }

                const correct_answer = this.correct_answer()?.value || [];
                feedback = answer.value.map((row,i) => {
                    return row[0] == (correct_answer[i] || [])[0] ? 'correct' : 'incorrect';
                });

                return feedback;
            },this);

            this.correct_input_options = {
                choices,
                displayColumns: p.settings.displayColumns,
                showBlankOption: p.settings.showBlankOption,
                answerAsArray: true,
            };

            break;
        case 'm_n_2':
            this.input_widget = 'checkboxes';

            this.cellFeedback = Knockout.pureComputed(() => {
                const answer = this.input_answer() || [];
                if(!answer.valid) {
                    return [];
                }
                let feedback = answer.value.map((row) => '');
                if(!this.showCellAnswerState()) {
                    return feedback;
                }

                const correct_answer = this.correct_answer()?.value || [];
                feedback = answer.value.map((row,i) => {
                    return row[0] == (correct_answer[i] || [])[0] ? 'correct' : 'incorrect';
                });

                return feedback;
            },this);

            this.correct_input_options = {
                choices: p.settings.choices,
                displayColumns: p.settings.displayColumns,
                minAnswers: p.settings.minAnswers,
                maxAnswers: p.settings.maxAnswers,
                answerAsArray: true,
            }
            break;
        case 'm_n_x':
            this.input_widget = 'm_n_x';
            this.correct_input_options = {
                choices: p.settings.choices,
                answers: p.settings.answers,
                minAnswers: p.settings.minAnswers,
                maxAnswers: p.settings.maxAnswers,
                displayType: p.settings.displayType,
                layout: p.layout,
            };

            this.cellFeedback = Knockout.pureComputed(() => {
                const answer = this.input_answer() || [];
                if(!answer.valid) {
                    return [];
                }
                let feedback = answer.value.map((row) => row.map(() => ''));
                if(!this.showCellAnswerState()) {
                    return feedback;
                }

                const correct_answer = this.correct_answer()?.value || [];
                feedback = answer.value.map((row,i) => row.map((cell,j) => {
                    return cell == (correct_answer[i] || [])[j] ? 'correct' : 'incorrect';
                }));

                return feedback;
            },this);

            break;
        }

        this.input_options = Object.assign(
            {
                cellFeedback: this.cellFeedback,
                showCellAnswerState: this.showCellAnswerState,
            },
            this.correct_input_options
        );

        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));
    }
    display.MultipleResponsePartDisplay.prototype =
    {
        alwaysShowWarnings: true,

        restoreAnswer: function(studentAnswer) {
            console.log(this.part.path, studentAnswer);
            this.input_answer({valid: !!studentAnswer, value: studentAnswer});
        },
    };
    display.MultipleResponsePartDisplay = extend(display.PartDisplay,display.MultipleResponsePartDisplay,true);
});
