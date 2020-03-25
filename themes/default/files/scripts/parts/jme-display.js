Numbas.queueScript('display/parts/jme',['display-base','part-display','util','jme-display','jme'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    var jme = Numbas.jme;
    /** Display code for a {@link Numbas.parts.JMEPart}
     * @constructor
     * @augments Numbas.display.PartDisplay
     * @name JMEPartDisplay
     * @memberof Numbas.display
     */
    display.JMEPartDisplay = function()
    {
        var p = this.part;
        /** The student's current answer (not necessarily submitted)
         * @member {observable|JME} studentAnswer
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.studentAnswer = Knockout.observable('');
        Knockout.computed(function() {
            p.storeAnswer(this.studentAnswer());
        },this);
        /** Should the LaTeX rendering of the student's answer be shown?
         * @member {boolean} showPreview
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.showPreview = p.settings.showPreview;
        /** The correct answer
         * @member {observable|JME} correctAnswer
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.correctAnswer = Knockout.observable('');
        /** The correct answer, in LaTeX form
         * @member {observable|TeX} correctAnswerLaTeX
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.correctAnswerLaTeX = Knockout.observable('');
        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));

        /** The student's answer, in LaTeX form
         * @member {observable|TeX} studentAnswerLaTeX
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.studentAnswerLaTeX = Knockout.computed(function() {
            var studentAnswer = this.studentAnswer();
            if(studentAnswer=='')
                return '';
            this.removeWarnings();
            try {
                var tex = jme.display.exprToLaTeX(studentAnswer,'',p.question.scope);
                if(tex===undefined)
                    throw(new Numbas.Error('display.part.jme.error making maths'));
            }
            catch(e) {
                p.giveWarning(e.message);
                return '';
            }
            if(p.settings.checkVariableNames) {
                var tree = jme.compile(studentAnswer,p.question.scope);
                var usedvars = jme.findvars(tree);
                var failExpectedVariableNames = false;
                var expectedVariableNames = jme.findvars(jme.compile(this.correctAnswer()));
                var unexpectedVariableName;
                for(var i=0;i<usedvars.length;i++) {
                    if(!expectedVariableNames.contains(usedvars[i])) {
                        failExpectedVariableNames = true;
                        unexpectedVariableName = usedvars[i];
                        break;
                    }
                }
                if( failExpectedVariableNames ) {
                    var suggestedNames = unexpectedVariableName.split(jme.re.re_short_name);
                    if(suggestedNames.length>3) {
                        var suggestion = [];
                        for(var i=1;i<suggestedNames.length;i+=2) {
                            suggestion.push(suggestedNames[i]);
                        }
                        suggestion = suggestion.join('*');
                        p.giveWarning(R('part.jme.unexpected variable name suggestion',{name:unexpectedVariableName,suggestion:suggestion}));
                    }
                    else
                        p.giveWarning(R('part.jme.unexpected variable name', {name:unexpectedVariableName}));
                }
            }
            return tex;
        },this).extend({throttle:100});
        /** Does the input box have focus?
         * @member {observable|boolean} inputHasFocus
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.inputHasFocus = Knockout.observable(false);
        /** Give the input box focus
         * @member {function} focusInput
         * @method
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.focusInput = function() {
            this.inputHasFocus(true);
        }
    }
    display.JMEPartDisplay.prototype =
    {
        updateCorrectAnswer: function(answer) {
            var p = this.part;
            this.correctAnswer(answer);
            this.correctAnswerLaTeX(jme.display.exprToLaTeX(answer,p.settings.answerSimplification,p.question.scope));
        },
        restoreAnswer: function(studentAnswer) {
            this.studentAnswer(studentAnswer);
        }
    };
    display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);
})
