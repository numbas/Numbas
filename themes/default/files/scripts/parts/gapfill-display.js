Numbas.queueScript('display/parts/gapfill',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    /** Display code for a {@link Numbas.parts.GapFillPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name GapFillPartDisplay
     * @memberof Numbas.display
     */
    display.GapFillPartDisplay = function()
    {
        this.showCorrectAnswer = false;
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
