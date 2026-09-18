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
    display.JMEPartDisplay = function() {
        var p = this.part;
        /** The student's current answer (not necessarily submitted)
         * @member {observable|JME} studentAnswer
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.studentAnswer = Knockout.observable('');

        Knockout.computed(function() {
            p.storeAnswer(this.studentAnswer());
        },this);

        this.input_answer = Knockout.computed({
            read: () => {
                return {valid: true, value: this.studentAnswer()};
            },
            write: (v) => {
                this.studentAnswer(v.value);
            }
        });

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


        this.expand_settings = {
            singleLetterVariables: p.settings.singleLetterVariables,
            noUnknownFunctions: !p.settings.allowUnknownFunctions,
            implicitFunctionComposition: p.settings.implicitFunctionComposition
        };

        Knockout.computed(() => {
            const scope = p.getScope();

            const answer = this.studentAnswer();

            if(answer.warnings) {
                for(let warning of answer.warnings) {
                    p.giveWarning(warning);
                }
            }

            if(!answer.valid) {
                return;
            }

            const studentTree = answer.value.tree;

            if(p.settings.checkVariableNames) {
                const usedvars = jme.findvars(studentTree, [], scope);

                const notation = p.getNotation();

                let correctTree = notation.compile(this.correctAnswer());
                correctTree = scope.expandJuxtapositions(correctTree, this.expand_settings);

                const expectedVariableNames = jme.findvars(correctTree, [], scope);
                const unexpectedVariableName = usedvars.find((name) => !expectedVariableNames.contains(name));

                if( unexpectedVariableName !== undefined ) {
                    p.giveWarning(R('part.jme.unexpected variable name', {name:unexpectedVariableName}));
                }
            }
            if(p.settings.mustMatchPattern && p.settings.mustMatchWarningTime=='input' || p.settings.mustMatchWarningTime == 'prevent') {
                const r = new Numbas.jme.rules.Rule(p.settings.mustMatchPattern, null, 'ac');
                const m = r.match(studentTree, scope);
                if(!m) {
                    p.giveWarning(R('part.jme.must-match.warning', {message: p.settings.mustMatchMessage}));
                }
            }
        });

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

        this.input_widget = 'jme';
        this.input_options = {
            showPreview: true,
            notation: p.getNotation(),
            expand_settings: this.expand_settings,
        };
    }
    display.JMEPartDisplay.prototype = {
        updateCorrectAnswer: function(answer) {
            var p = this.part;
            var scope = p.getScope();
            this.correctAnswer(answer);

            var tree = p.getNotation().compile(answer);
            tree = scope.expandJuxtapositions(tree, {
                singleLetterVariables: p.settings.singleLetterVariables,
                noUnknownFunctions: !p.settings.allowUnknownFunctions,
                implicitFunctionComposition: p.settings.implicitFunctionComposition
            });
            var ruleset = jme.collectRuleset(p.settings.answerSimplificationString, scope.allRulesets());
            tree = jme.display.simplifyTree(
                tree,
                ruleset,
                scope
            );

            this.correctAnswerLaTeX(jme.display.texify(tree, ruleset.flags, scope));
        },
        restoreAnswer: function(studentAnswer) {
            this.studentAnswer(studentAnswer);
        }
    };
    display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);
})
