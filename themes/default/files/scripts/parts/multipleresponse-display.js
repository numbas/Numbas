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
            this.input_options = {
                choices,
                displayColumns: p.settings.displayColumns,
                showBlankOption: p.settings.showBlankOption,
                answerAsArray: true,
            }

            break;
        case 'm_n_2':
            this.input_widget = 'checkboxes';
            this.input_options = {
                choices: p.settings.choices,
                displayColumns: p.settings.displayColumns,
                minAnswers: p.settings.minAnswers,
                maxAnswers: p.settings.maxAnswers,
                answerAsArray: true,
            }
            break;
        case 'm_n_x':
            this.input_widget = 'm_n_x';
            this.input_options = {
                choices: p.settings.choices,
                answers: p.settings.answers,
                minAnswers: p.settings.minAnswers,
                maxAnswers: p.settings.maxAnswers,
                displayType: p.settings.displayType,
                layout: p.layout,
            };

            break;
        }

        // TODO - tick feedback

        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));
    }
    display.MultipleResponsePartDisplay.prototype =
    {
        alwaysShowWarnings: true,

        restoreAnswer: function(ticks) {
            this.input_answer({valid: !!ticks, value: ticks});
        },
    };
    display.MultipleResponsePartDisplay = extend(display.PartDisplay,display.MultipleResponsePartDisplay,true);
});
