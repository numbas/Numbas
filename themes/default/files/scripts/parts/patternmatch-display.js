Numbas.queueScript('display/parts/patternmatch',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    /** Display code for a {@link Numbas.parts.PatternMatchPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name PatternMatchPartDisplay
     * @memberof Numbas.display
     */
    display.PatternMatchPartDisplay = function()
    {
        var p = this.part;
        /** The student's current answer (not necessarily submitted)
         * @member {observable|string} studentAnswer
         * @memberof Numbas.display.PatternMatchPartDisplay
         */
        this.studentAnswer = Knockout.observable(this.part.studentAnswer);
        /** The correct answer regular expression
         * @member {observable|RegExp} correctAnswer
         * @memberof Numbas.display.PatternMatchPartDisplay
         */
        this.correctAnswer = Knockout.observable('');
        /** A representative correct answer to display when answers are revealed
         * @member {observable|string} displayAnswer
         * @memberof Numbas.display.PatternMatchPartDisplay
         */
        this.displayAnswer = Knockout.observable();

        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));

        Knockout.computed(function() {
            p.storeAnswer(this.studentAnswer());
        },this);
    }
    display.PatternMatchPartDisplay.prototype =
    {
        updateCorrectAnswer: function(answer) {
            this.correctAnswer(this.part.settings.correctAnswer);
            this.displayAnswer(answer);
        },
        restoreAnswer: function()
        {
            this.studentAnswer(this.part.studentAnswer);
        }
    };
    display.PatternMatchPartDisplay = extend(display.PartDisplay,display.PatternMatchPartDisplay,true);
});
