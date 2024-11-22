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
        /** The student's current (not necessarily submitted) answer
         * @member {observable|string} studentAnswer
         * @memberof Numbas.display.NumberEntryPartDisplay
         */
        this.studentAnswer = Knockout.observable(p.studentAnswer);
        /** The correct answer
         * @member {observable|number} correctAnswer
         * @memberof Numbas.display.NumberEntryPartDisplay
         */
        this.correctAnswer = Knockout.observable('');
        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));
        Knockout.computed(function() {
            p.storeAnswer(this.studentAnswer());
        },this);
        /** Cleaned-up version of student answer (remove commas and trim whitespace)
         *
         * Also check for validity and give warnings
         * @member {observable|string} cleanStudentAnswer
         * @memberof Numbas.display.NumberEntryPartDisplay
         */
        this.cleanStudentAnswer = Knockout.computed(function() {
            var studentAnswer = p.cleanAnswer(this.studentAnswer());
            this.removeWarnings();
            if(studentAnswer=='')
                return '';
            if(p.settings.integerAnswer) {
                var dp = Numbas.math.countDP(studentAnswer);
                if(dp>0)
                    p.giveWarning(R('part.numberentry.answer not integer'));
            }
            if(!util.isNumber(studentAnswer,p.settings.allowFractions,p.settings.notationStyles,true)) {
                p.giveWarning(R(p.settings.allowFractions ? 'part.numberentry.answer not integer or decimal or fraction' : 'part.numberentry.answer not integer or decimal'));
                return '';
            }
            var n = util.parseNumber(studentAnswer,p.settings.allowFractions,p.settings.notationStyles,true);
            return n+'';
        },this);
        /** Does the input box have focus?
         * @member {observable|boolean} inputHasFocus
         * @memberof Numbas.display.NumberEntryPartDisplay
         */
        this.inputHasFocus = Knockout.observable(false);
        /** Give the input box focus
         * @member {function} focusInput
         * @method
         * @memberof Numbas.display.NumberEntryPartDisplay
         */
        this.focusInput = function() {
            this.inputHasFocus(true);
        }
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
    }
    display.NumberEntryPartDisplay.prototype =
    {
        updateCorrectAnswer: function(answer) {
            this.correctAnswer(answer);
        },
        restoreAnswer: function(studentAnswer) {
            this.studentAnswer(studentAnswer);
        }
    };
    display.NumberEntryPartDisplay = extend(display.PartDisplay,display.NumberEntryPartDisplay,true);
});
