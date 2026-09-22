Numbas.queueScript('display/parts/numberentry',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    var util = Numbas.util;
    /** Display code for a {@link Numbas.parts.NumberEntryPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name NumberEntryPartDisplay
     * @memberof Numbas.display
     */
    display.NumberEntryPartDisplay = function()
    {
        var p = this.part;

        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));

        /** Some text describing how the student should enter their answer
         * @member {observable|string} inputHint
         * @memberof Numbas.display.NumberEntryPartDisplay
         */
        this.inputHint = Knockout.computed(function() {
            if(this.part.settings.precisionType=='none') {
                if(this.part.settings.mustBeReduced) {
                    return R('part.numberentry.give your answer as a reduced fraction');
                } else if(this.part.settings.allowFractions) {
                    return R('part.numberentry.write your answer as a fraction');
                } else {
                    return '';
                }
            } else {
                var precision = this.part.settings.precision;
                var precisionType = R('part.numberentry.precision type.'+this.part.settings.precisionType,{count:precision});
                if (precision === 0) {
                  return R('part.numberentry.give your answer to precision_0',{count: precision,precisionType: precisionType});
                } else {
                  return R('part.numberentry.give your answer to precision',{count: precision,precisionType: precisionType});
                }
            }
        },this);
        /** Show the input hint?
         * @member {observable|string} showInputHint
         * @memberof Numbas.display.NumberEntryPartDisplay
         */
        this.showInputHint = Knockout.computed(function() {
            if(!this.inputHint()) {
                return false;
            }
            if(this.part.settings.precisionType=='none') {
                return this.part.settings.showFractionHint;
            } else {
                return this.part.settings.showPrecisionHint;
            }
        },this);

        this.input_widget = 'number';
        this.input_options = {
            returnString: true,
            allowEmpty: true,
            cleanNumber: false,
            allowFractions: p.settings.allowFractions,
            allowedNotationStyles: p.settings.notationStyles,
            hint: Knockout.pureComputed(() => this.showInputHint() ? this.inputHint() : ''),
        };
    }
    display.NumberEntryPartDisplay.prototype = {
    };
    display.NumberEntryPartDisplay = extend(display.PartDisplay,display.NumberEntryPartDisplay,true);
});
