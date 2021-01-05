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
            if(studentAnswer.trim()=='')
                return '';
            this.removeWarnings();
            try {
                var scope = p.getScope();
                var studentTree = scope.parser.compile(studentAnswer);
                var expand_settings = {
                    singleLetterVariables: p.settings.singleLetterVariables,
                    noUnknownFunctions: !p.settings.allowUnknownFunctions,
                    implicitFunctionComposition: p.settings.implicitFunctionComposition
                };
                studentTree = scope.expandJuxtapositions(studentTree, expand_settings);
                var tex = jme.display.texify(studentTree);
                if(tex === undefined) {
                    throw(new Numbas.Error('display.part.jme.error making maths'));
                }
            }
            catch(e) {
                p.giveWarning(e.message);
                return '';
            }
            if(p.settings.checkVariableNames) {
                var usedvars = jme.findvars(studentTree);
                var failExpectedVariableNames = false;
                var correctTree = scope.parser.compile(this.correctAnswer());
                correctTree = scope.expandJuxtapositions(correctTree, expand_settings);
                var expectedVariableNames = jme.findvars(correctTree);
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
            var scope = p.getScope();
            this.correctAnswer(answer);

            var tree = jme.compile(answer);
            tree = scope.expandJuxtapositions(tree, {
                singleLetterVariables: p.settings.singleLetterVariables,
                noUnknownFunctions: !p.settings.allowUnknownFunctions,
                implicitFunctionComposition: p.settings.implicitFunctionComposition
            });
            var ruleset = jme.collectRuleset(p.settings.answerSimplification, scope.allRulesets());
            tree = jme.display.simplifyTree(
                tree,
                ruleset,
                scope
            );

            this.correctAnswerLaTeX(jme.display.texify(tree));
        },
        restoreAnswer: function(studentAnswer) {
            this.studentAnswer(studentAnswer);
        }
    };
    display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);
})
