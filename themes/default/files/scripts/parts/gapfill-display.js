Numbas.queueScript('display/parts/gapfill',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    /** Display code for a {@link Numbas.parts.GapFillPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name GapFillPartDisplay
     * @memberof Numbas.display
     */
    display.GapFillPartDisplay = function() {
        var base_showCorrectAnswer = this.showCorrectAnswer;
        this.showCorrectAnswer = Knockout.computed(function() {
            return base_showCorrectAnswer() && !this.part.settings.inlineCorrectAnswer;
        },this);

        this.prompt = this.part.prompt.replace(/\[\[(\d+?)\]\]/g, (_, d) => {
            d = parseInt(d);
            if(d >= this.part.gaps.length) {
                throw(new ExamError(`Reference to an undefined gap in a gapfill part (${d})`));
            }
            return `
                <!-- ko with: scope.question.getPart('${this.part.path}g${d}').display -->
                    <span class="part-wrapper" data-bind="promise: html_promise, descendantsComplete: htmlBound"></span>
                <!-- /ko -->
             `;
        });

        this.correct_prompt = this.part.prompt.replace(/\[\[(\d+?)\]\]/g, (_, d) => {
            d = parseInt(d);
            if(d >= this.part.gaps.length) {
                throw(new ExamError(`Reference to an undefined gap in a gapfill part (${d})`));
            }
            return `
                <!-- ko with: scope.question.getPart('${this.part.path}g${d}').display -->
                    <answer-widget params="{
                        answer: correct_answer,
                        widget: input_widget,
                        widget_options: $data.correct_input_options || input_options,
                        part: part,
                        disable: true,
                        title: correct_title,
                        id: part.full_path+'-expected-input'
                    }"></answer-widget>
                <!-- /ko -->
             `;
        });
    }
    display.GapFillPartDisplay.prototype =
    {
        show: function()
        {
            for(var i=0;i<this.part.gaps.length; i++)
                this.part.gaps[i].display.show();
        },
        restoreAnswer: function(studentAnswer)
        {
            if(!studentAnswer) {
                return;
            }
            for(var i=0;i<this.part.gaps.length; i++) {
                if(studentAnswer[i]!==undefined) {
                    this.part.gaps[i].display.restoreAnswer(studentAnswer[i]);
                }
            }
        },
        revealAnswer: function()
        {
        },
        init: function() {
            for(var i=0;i<this.part.gaps.length; i++)
                this.part.gaps[i].display.init();
        },
        end: function() {
            for(var i=0;i<this.part.gaps.length; i++)
                this.part.gaps[i].display.end();
        }
    };
    display.GapFillPartDisplay = extend(display.PartDisplay,display.GapFillPartDisplay,true);
});
