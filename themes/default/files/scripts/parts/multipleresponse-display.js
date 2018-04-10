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
        var p = this.part;
        function makeTicker(answer,choice) {
            var obs = ko.observable(p.ticks[answer][choice]);
            ko.computed(function() {
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
            var obs = ko.observable(p.ticks[answer][choice]);
            ko.computed(function() {
                p.storeTick({answer:answer, choice:choice, ticked:obs()});
            });
            return obs;
        }
        this.layout = util.copyarray(p.layout);
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
                if(this.studentAnswer()==='') {
                    oldAnswer = null;
                    p.storeTick({answer:null, choice: 0});
                }
                var i = parseInt(this.studentAnswer());
                if(i!==oldAnswer && !isNaN(i)) {
                    p.storeTick({answer:i, choice:0});
                    oldAnswer = i;
                }
            },this);
            var max = 0, maxi = -1;
            for(var i=0;i<p.numAnswers;i++) {
                if(p.settings.matrix[i][0]>max || maxi==-1) {
                    max = p.settings.matrix[i][0];
                    maxi = i;
                }
            }
            /** Index of the answer which gains the most marks
             * @member {observable|number} correctAnswer
             * @memberof Numbas.display.MultipleResponsePartDisplay
             */
            this.correctAnswer = Knockout.observable(maxi+'');
            break;
        case 'm_n_2':
            /** For each choice, has the student selected it?
             *
             * For m_n_2 parts, this is a list of booleans. For m_n_x radiogroup parts, it's a list of indices. For m_n_x checkbox parts, it's a 2d array of booleans.
             * @member {observable|boolean[]|number[]|Array.Array.<boolean>} ticks
             * @memberof Numbas.display.MultipleResponsePartDisplay
             */
            this.ticks = [];
            /** For each choice, should it be selected to get the most marks?
             *
             * For m_n_2 parts, this is a list of booleans. For m_n_x radiogroup parts, it's a list of indices. For m_n_x checkbox parts, it's a 2d array of booleans.
             * @member {observable|boolean[]|number[]|Array.Array.<boolean>} ticks
             * @memberof Numbas.display.MultipleResponsePartDisplay
             */
            this.correctTicks = [];
            for(var i=0; i<p.numAnswers; i++) {
                this.ticks[i] = makeTicker(i,0);
                this.correctTicks[i] = p.settings.matrix[i][0]>0;
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
            switch(p.settings.displayType) {
            case 'radiogroup':
                this.ticks = [];
                this.correctTicks = [];
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
                this.correctTicks = [];
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
            break;
        }
    }
    display.MultipleResponsePartDisplay.prototype =
    {
        restoreAnswer: function()
        {
            var part = this.part;
            switch(part.type) {
            case '1_n_2':
                this.studentAnswer(null);
                for(var i=0;i<part.numAnswers; i++) {
                    if(part.ticks[i][0])
                        this.studentAnswer(i+'');
                }
                break;
            case 'm_n_2':
                for(var i=0; i<part.numAnswers; i++) {
                    this.ticks[i](part.ticks[i][0]);
                }
                break;
            case 'm_n_x':
                switch(part.settings.displayType) {
                case 'radiogroup':
                    for(var i=0; i<part.numAnswers; i++) {
                        for(var j=0; j<part.numChoices; j++) {
                            if(part.ticks[i][j]) {
                                this.ticks[j](i+'');
                            }
                        }
                    }
                    break;
                case 'checkbox':
                    for(var i=0; i<part.numAnswers; i++) {
                        for(var j=0; j<part.numChoices; j++) {
                            this.ticks[i][j](part.ticks[i][j]);
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