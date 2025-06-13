Numbas.queueScript('display/parts/multipleresponse',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    var util = Numbas.util;
    /** Display code for a {@link Numbas.parts.MultipleResponsePart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name MultipleResponsePartDisplay
     * @memberof Numbas.display
     */
    display.MultipleResponsePartDisplay = function()
    {
        var pd = this;
        var p = this.part;
        function makeTicker(answer,choice) {
            var obs = Knockout.observable(p.ticks[answer][choice]);
            Knockout.computed(function() {
                p.storeTick({answer:answer, choice:choice, ticked:obs()});
            },p);
            return obs;
        }
        function makeRadioTicker(choice) {
            var obs = Knockout.observable(null);
            for(var i=0;i<p.numAnswers;i++) {
                if(p.ticks[i][choice])
                    obs(i);
            }
            Knockout.computed(function() {
                var answer = parseInt(obs());
                p.storeTick({answer:answer, choice:choice, ticked: true});
            },p);
            return obs;
        }
        function makeCheckboxTicker(answer,choice) {
            var obs = Knockout.observable(p.ticks[answer][choice]);
            Knockout.computed(function() {
                p.storeTick({answer:answer, choice:choice, ticked:obs()});
            });
            return obs;
        }
        function makeTickFeedback(answer,choice) {
            return Knockout.computed(function() {
                var ticks = pd.ticks;
                switch(p.settings.markingMethod) {
                    case 'sum ticked cells':
                        var checked = p.settings.displayType=='radiogroup' ? pd.ticks[choice]()==answer : pd.ticks[answer][choice];
                        return {
                            checked: checked, 
                            correct: checked && p.settings.matrix[answer][choice]>0
                        }
                    case 'score per matched cell':
                    case 'all-or-nothing':
                        return {
                            checked: pd.layout[answer][choice],
                            correct: pd.ticks[answer][choice]()==(p.settings.matrix[answer][choice]>0)
                        }
                }
            },pd);
        }
        this.layout = util.copyarray(p.layout);
        this.showCellAnswerState = Knockout.pureComputed(function() {
            if(p.question && p.question.exam) {
                if(!p.question.exam.display.expectedAnswersRevealed()) {
                    return false;
                }
            }
            return p.settings.showCellAnswerState;
        },this);
        this.displayColumns = Knockout.observable(p.settings.displayColumns);
        switch(p.type) {
        case '1_n_2':
            /** Index of student's current answer choice (not necessarily submitted)
             * @member {observable|number} studentAnswer
             * @memberof Numbas.display.MultipleResponsePartDisplay
             */
            this.studentAnswer = Knockout.observable(null);
            for(var i=0;i<p.numAnswers;i++) {
                if(p.ticks[i][0])
                    this.studentAnswer(i);
            }
            var oldAnswer = null;
            Knockout.computed(function() {
                if(this.studentAnswer()==='' && oldAnswer!==null) {
                    oldAnswer = null;
                    p.storeTick({answer:null, choice: 0});
                }
                var i = parseInt(this.studentAnswer());
                if(i!==oldAnswer && !isNaN(i)) {
                    p.storeTick({answer:i, choice:0});
                    oldAnswer = i;
                }
            },this);
            /** Index of the answer which gains the most marks
             * @member {observable|number} correctAnswer
             * @memberof Numbas.display.MultipleResponsePartDisplay
             */
            this.correctAnswer = Knockout.observable();
            break;
        case 'm_n_2':
            /** For each choice, has the student selected it?
             *
             * For m_n_2 parts, this is a list of booleans. For m_n_x radiogroup parts, it's a list of indices. For m_n_x checkbox parts, it's a 2d array of booleans.
             * @member {observable|boolean[]|number[]|Array.<Array.<boolean>>} ticks
             * @memberof Numbas.display.MultipleResponsePartDisplay
             */
            this.ticks = [];
            /** For each choice, should it be selected to get the most marks?
             *
             * For m_n_2 parts, this is a list of booleans. For m_n_x radiogroup parts, it's a list of indices. For m_n_x checkbox parts, it's a 2d array of booleans.
             * @member {observable|boolean[]|number[]|Array.<Array.<boolean>>} ticks
             * @memberof Numbas.display.MultipleResponsePartDisplay
             */
            this.correctTicks = Knockout.observableArray([]);
            for(var i=0; i<p.numAnswers; i++) {
                this.ticks[i] = makeTicker(i,0);
            }
            if(p.settings.warningType!='none') {
                Knockout.computed(function() {
                    this.removeWarnings();
                    var ticked = 0;
                    this.ticks.map(function(tick) {
                        ticked += tick() ? 1 : 0;
                    });
                    if(ticked<p.settings.minAnswers || ticked>p.settings.maxAnswers) {
                        p.giveWarning(R('part.mcq.wrong number of choices'));
                    };
                },this);
            }
            break;
        case 'm_n_x':
            this.correctTicks = Knockout.observableArray([]);
            switch(p.settings.displayType) {
            case 'radiogroup':
                this.ticks = [];
                for(var i=0; i<p.numChoices; i++) {
                    this.ticks.push(makeRadioTicker(i));
                    var maxj=-1,max=0;
                    for(var j=0;j<p.numAnswers; j++) {
                        if(maxj==-1 || p.settings.matrix[j][i]>max) {
                            maxj = j;
                            max = p.settings.matrix[j][i];
                        }
                    }
                    this.correctTicks.push(maxj);
                }
                break;
            case 'checkbox':
                this.ticks = [];
                for(var i=0; i<p.numAnswers; i++) {
                    var row = [];
                    this.ticks.push(row);
                    var correctRow = [];
                    this.correctTicks.push(correctRow);
                    for(var j=0; j<p.numChoices; j++) {
                        row.push(makeCheckboxTicker(i,j));
                        correctRow.push(p.settings.matrix[i][j]>0);
                    }
                }
                if(p.settings.warningType!='none') {
                    Knockout.computed(function() {
                        this.removeWarnings();
                        var ticked = 0;
                        this.ticks.map(function(row) {
                            row.map(function(tick) {
                                ticked += tick() ? 1 : 0;
                            });
                        });
                        if(ticked<p.settings.minAnswers || ticked>p.settings.maxAnswers) {
                            p.giveWarning(R('part.mcq.wrong number of choices'));
                        };
                    },this);
                }
                break;
            }
            this.tickFeedback = Knockout.observableArray([]);
            for(var i=0; i<p.numAnswers; i++) {
                var feedbackRow = [];
                this.tickFeedback.push(feedbackRow);
                for(var j=0; j<p.numChoices; j++) {
                    feedbackRow.push(makeTickFeedback(i,j));
                }
            }
            break;
        }
        this.updateCorrectAnswer(p.getCorrectAnswer(p.getScope()));
    }
    display.MultipleResponsePartDisplay.prototype =
    {
        alwaysShowWarnings: true,
        updateCorrectAnswer: function(answer) {
            var p = this.part;
            switch(p.type) {
            case '1_n_2':
                var maxi;
                for(var i=0;i<p.numAnswers;i++) {
                    if(answer[i][0]) {
                        maxi = i;
                        break;
                    }
                }
                this.correctAnswer(maxi+'');
                break;
            case 'm_n_2':
                this.correctTicks(answer.map((function(x){ return x[0]; })));
                break;
            case 'm_n_x':
                switch(p.settings.displayType) {
                case 'radiogroup':
                    var ticks = [];
                    for(var i=0; i<p.numChoices; i++) {
                        for(var j=0;j<p.numAnswers;j++) {
                            if(answer[j][i]) {
                                ticks.push(j);
                                break;
                            }
                        }
                    }
                    this.correctTicks(ticks);
                    break;
                case 'checkbox':
                    this.correctTicks(answer);
                    break;
                }
            }
        },

        restoreAnswer: function(ticks) {
            ticks = ticks || this.part.ticks;
            var part = this.part;
            switch(part.type) {
            case '1_n_2':
                var ticked = false;
                for(var i=0;i<part.numAnswers; i++) {
                    if(ticks && ticks[i][0]) {
                        this.studentAnswer(i+'');
                        ticked = true;
                    }
                }
                if(!ticked) {
                    this.studentAnswer(null);
                }
                break;
            case 'm_n_2':
                for(var i=0; i<part.numAnswers; i++) {
                    this.ticks[i](ticks && ticks[i][0]);
                }
                break;
            case 'm_n_x':
                switch(part.settings.displayType) {
                case 'radiogroup':
                    for(var i=0; i<part.numAnswers; i++) {
                        for(var j=0; j<part.numChoices; j++) {
                            if(ticks && ticks[i][j]) {
                                this.ticks[j](i+'');
                            }
                        }
                    }
                    break;
                case 'checkbox':
                    for(var i=0; i<part.numAnswers; i++) {
                        for(var j=0; j<part.numChoices; j++) {
                            this.ticks[i][j](ticks && ticks[i][j]);
                        }
                    }
                    break;
                }
                break;
            }
        }
    };
    display.MultipleResponsePartDisplay = extend(display.PartDisplay,display.MultipleResponsePartDisplay,true);
});
