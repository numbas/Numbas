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

        /** Should the LaTeX rendering of the student's answer be shown?
         * @member {boolean} showPreview
         * @memberof Numbas.display.JMEPartDisplay
         */
        this.showPreview = p.settings.showPreview;

        this.expand_settings = {
            singleLetterVariables: p.settings.singleLetterVariables,
            noUnknownFunctions: !p.settings.allowUnknownFunctions,
            implicitFunctionComposition: p.settings.implicitFunctionComposition
        };

        Knockout.computed(() => {
            const scope = p.getScope();

            const answer = this.input_answer();

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

        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));
    }
    display.JMEPartDisplay.prototype = {
        setStudentAnswer: function(studentAnswer) {
            this.part.storeAnswer(studentAnswer.string || '');
        }
    };
    display.JMEPartDisplay = extend(display.PartDisplay,display.JMEPartDisplay,true);
})
