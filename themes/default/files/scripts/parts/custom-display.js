Numbas.queueScript('display/parts/custom',['display-base','part-display','util','jme'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;

    /** An answer to a custom part type.
     *
     * @typedef Numbas.custom_part_answer
     * @property {boolean} valid - Is the answer valid?
     * @property {Object} value - The answer.
     * @property {boolean} empty - Is the answer empty?
     */

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
        this.input_options = p.input_options();
        /** The student's current answer (not necessarily submitted)
         * @member {observable|Numbas.custom_part_answer} studentAnswer
         * @memberof Numbas.display.CustomPartDisplay
         */
        this.studentAnswer = Knockout.observable({valid: false, value: this.part.studentAnswer});
        this.correctAnswer = Knockout.observable({});
        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));
        Knockout.computed(function() {
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
        this.alwaysShowWarnings = {radios: true, checkboxes: true, dropdown: true}[this.input_widget] || false;
    };
    display.CustomPartDisplay.prototype = {
        updateCorrectAnswer: function(answer) {
            this.correctAnswer({valid: true, value: answer});
        },
        restoreAnswer: function(studentAnswer) {
            this.studentAnswer({valid: studentAnswer!==undefined, value: studentAnswer});
        }
    };
    display.CustomPartDisplay = extend(display.PartDisplay,display.CustomPartDisplay,true);
});
