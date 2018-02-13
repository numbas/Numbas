Numbas.queueScript('display/parts/custom',['display-base','part-display','util','jme'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;

    /** Display code for a {@link Numbas.parts.CustomPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name CustomPartDisplay
     * @memberof Numbas.display
     */
    display.CustomPartDisplay = function() {
        var p = this.part;

        /** The type of input widget to use for this part.
         * @member {observable|string} input_widget
         * @memberof Numbas.display.CustomPartDisplay
         */
        this.input_widget = p.input_widget();

        /** Options for the input widget.
         * @member {observable|Object} input_options
         * @memberof Numbas.display.CustomPartDisplay
         */
        this.input_options = p.input_options;

        /** The student's current answer (not necessarily submitted)
         * @member {observable|string} studentAnswer
         * @memberof Numbas.display.CustomPartDisplay
         */
        this.studentAnswer = ko.observable({valid: false, value: this.part.studentAnswer});

        this.correctAnswer = ko.observable({valid: true, value: this.input_options.correctAnswer});

        ko.computed(function() {
            var answer = this.studentAnswer();
            if(Numbas.util.objects_equal(answer.value, p.stagedAnswer) || !answer.valid && p.stagedAnswer===undefined) {
                return;
            }
            if(answer.valid) {
                p.storeAnswer(answer.value);
            } else {
                p.storeAnswer(undefined);
            }
            if(answer.warnings) {
                answer.warnings.forEach(function(warning){ p.giveWarning(warning); });
            }
        },this);
    };
    display.CustomPartDisplay.prototype = {
        restoreAnswer: function() {
            this.studentAnswer({valid: this.part.studentAnswer!==undefined, value: this.part.studentAnswer});
        }
    };
    display.CustomPartDisplay = extend(display.PartDisplay,display.CustomPartDisplay,true);
});
