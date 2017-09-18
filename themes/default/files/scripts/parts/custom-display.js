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
        this.input_widget = p.definition.input_widget;

        /** Options for the input widget.
         * @member {observable|Object} input_options
         * @memberof Numbas.display.CustomPartDisplay
         */
        this.input_options = p.input_options;

        /** The student's current answer (not necessarily submitted)
         * @member {observable|string} studentAnswer
         * @memberof Numbas.display.CustomPartDisplay
         */
        this.studentAnswer = ko.observable(this.part.studentAnswer);

        this.correctAnswer = ko.observable(this.input_options.correctAnswer);

        ko.computed(function() {
            p.storeAnswer(this.studentAnswer());
        },this);
    };
    display.CustomPartDisplay = extend(display.PartDisplay,display.CustomPartDisplay,true);
});
