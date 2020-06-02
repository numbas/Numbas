/*
Copyright 2011-14 Newcastle University
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
/** @file Defines the {@link Numbas.Exam} object. */
Numbas.queueScript('exam',['base','timing','util','xml','display','schedule','storage','scorm-storage','math','question','jme-variables','jme-display','jme-rules','jme'],function() {
    var job = Numbas.schedule.add;
    var util = Numbas.util;

/** Create a {@link Numbas.Exam} object from an XML definition.
 * @memberof Numbas
 * @param {Element} xml
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @param {Boolean} [makeDisplay=true] - should this exam make a {@link Numbas.display.ExamDisplay} object?
 * @returns {Numbas.Exam}
 */
var createExamFromXML = Numbas.createExamFromXML = function(xml,store,makeDisplay) {
    var exam = new Exam(store);

    var xml = Numbas.xml.examXML.selectSingleNode('/exam');
    exam.loadFromXML(xml)

    exam.finaliseLoad(makeDisplay)

    return exam;
}

/** Create a {@link Numbas.Exam} object from a JSON definition.
 * @memberof Numbas
 * @param {Object} data
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @param {Boolean} [makeDisplay=true] - should this exam make a {@link Numbas.display.ExamDisplay} object?
 * @returns {Numbas.Exam}
 */
var createExamFromJSON = Numbas.createExamFromJSON = function(data,store,makeDisplay) {
    var exam = new Exam(store);

    exam.loadFromJSON(data);

    exam.finaliseLoad(makeDisplay)

    return exam;
}

/** Keeps track of all info we need to know while exam is running.
 *
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @constructor
 * @memberof Numbas
 */
function Exam(store)
{
    this.store = store;
    this.signals = new Numbas.schedule.SignalBox();
    var scope = new Numbas.jme.Scope(Numbas.jme.builtinScope);
    for(var extension in Numbas.extensions) {
        if('scope' in Numbas.extensions[extension]) {
            scope = new Numbas.jme.Scope([scope,Numbas.extensions[extension].scope]);
        }
    }
    this.scope = scope;

    var settings = this.settings;
    settings.navigationEvents = {};
    settings.timerEvents = {};
    this.feedbackMessages = [];
    this.question_groups = [];

}
Numbas.Exam = Exam;

/** The exam is ready for the student to start interacting with it.
 * @event Numbas.Exam#ready
 */

/** The question list has been initialised - every question is loaded and ready to use.
 * @event Numbas.Exam#question list initialised
 */

Exam.prototype = /** @lends Numbas.Exam.prototype */ {

    /** Load the exam's settings from an XML <exam> node
     * @param {Element} xml
     */
    loadFromXML: function(xml) {
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        if(!xml) {
            throw(new Numbas.Error('exam.xml.bad root'));
        }
        var settings = this.settings;

        this.xml = xml;
        tryGetAttribute(settings,xml,'.',['name','percentPass']);
        tryGetAttribute(settings,xml,'questions',['shuffle','all','pick'],['shuffleQuestions','allQuestions','pickQuestions']);
        tryGetAttribute(settings,xml,'settings/navigation',['allowregen','navigatemode','reverse','browse','allowsteps','showfrontpage','showresultspage','preventleave','startpassword'],['allowRegen','navigateMode','navigateReverse','navigateBrowse','allowSteps','showFrontPage','showResultsPage','preventLeave','startPassword']);
        //get navigation events and actions
        var navigationEventNodes = xml.selectNodes('settings/navigation/event');
        for( var i=0; i<navigationEventNodes.length; i++ ) {
            var e = ExamEvent.createFromXML(navigationEventNodes[i]);
            settings.navigationEvents[e.type] = e;
        }
        tryGetAttribute(settings,xml,'settings/timing',['duration','allowPause']);
        var timerEventNodes = this.xml.selectNodes('settings/timing/event');
        for( i=0; i<timerEventNodes.length; i++ ) {
            var e = ExamEvent.createFromXML(timerEventNodes[i]);
            settings.timerEvents[e.type] = e;
        }
        var feedbackPath = 'settings/feedback';
        tryGetAttribute(settings,xml,feedbackPath,
            [
                'showactualmark',
                'showtotalmark',
                'showanswerstate',
                'allowrevealanswer',
                'showStudentName',
                'reviewshowscore',
                'reviewshowfeedback',
                'reviewshowexpectedanswer',
                'reviewshowadvice'
            ],
            [
                'showActualMark',
                'showTotalMark',
                'showAnswerState',
                'allowRevealAnswer',
                'showStudentName',
                'reviewShowScore',
                'reviewShowFeedback',
                'reviewShowExpectedAnswer',
                'reviewShowAdvice'
            ]
        );
        var serializer = new XMLSerializer();
        var isEmpty = Numbas.xml.isEmpty;
        var introNode = this.xml.selectSingleNode(feedbackPath+'/intro/content/span');
        this.hasIntro = !isEmpty(introNode);
        this.introMessage = this.hasIntro ? serializer.serializeToString(introNode) : '';
        var feedbackMessageNodes = this.xml.selectNodes(feedbackPath+'/feedbackmessages/feedbackmessage');
        for(var i=0;i<feedbackMessageNodes.length;i++) {
            var feedbackMessageNode = feedbackMessageNodes[i];
            var feedbackMessage = {threshold: 0, message: ''};
            feedbackMessage.message = serializer.serializeToString(feedbackMessageNode.selectSingleNode('content/span'));
            tryGetAttribute(feedbackMessage,null,feedbackMessageNode,['threshold']);
            this.feedbackMessages.push(feedbackMessage);
        }
        var rulesetNodes = xml.selectNodes('settings/rulesets/set');
        var sets = {};
        for( i=0; i<rulesetNodes.length; i++) {
            var name = rulesetNodes[i].getAttribute('name');
            var set = [];
            //get new rule definitions
            defNodes = rulesetNodes[i].selectNodes('ruledef');
            for( var j=0; j<defNodes.length; j++ ) {
                var pattern = defNodes[j].getAttribute('pattern');
                var result = defNodes[j].getAttribute('result');
                var conditions = [];
                var conditionNodes = defNodes[j].selectNodes('conditions/condition');
                for(var k=0; k<conditionNodes.length; k++) {
                    conditions.push(Numbas.xml.getTextContent(conditionNodes[k]));
                }
                var rule = new Numbas.jme.display.Rule(pattern,conditions,result);
                set.push(rule);
            }
            //get included sets
            var includeNodes = rulesetNodes[i].selectNodes('include');
            for(var j=0; j<includeNodes.length; j++ ) {
                set.push(includeNodes[j].getAttribute('name'));
            }
            sets[name] = this.scope.rulesets[name] = set;
        }
        for(var name in sets) {
            this.scope.rulesets[name] = Numbas.jme.collectRuleset(sets[name],this.scope.allRulesets());
        }
        // question groups
        tryGetAttribute(settings,xml,'question_groups',['showQuestionGroupNames']);
        var groupNodes = this.xml.selectNodes('question_groups/question_group');
        for(var i=0;i<groupNodes.length;i++) {
            var qg = new QuestionGroup(this);
            qg.loadFromXML(groupNodes[i]);
            this.question_groups.push(qg);
        }
    },

    loadFromJSON: function(data) {
        this.json = data;
        var exam = this;
        var settings = exam.settings;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;
        tryLoad(data,['name','duration','percentPass','showQuestionGroupNames','showStudentName','shuffleQuestions'],settings);
        var question_groups = tryGet(data,'question_groups');
        if(question_groups) {
            question_groups.forEach(function(qgdata) {
                var qg = new QuestionGroup(this);
                qg.loadFromJSON(qgdata);
                exam.question_groups.push(qg);
            });
        }
        var navigation = tryGet(data,'navigation');
        if(navigation) {
            tryLoad(data,['allowRegen','allowSteps','showFrontPage','showResultsPage','preventLeave','startPassword'],settings);
            tryLoad(data,['reverse','browse'],settings,['navigateReverse','navigateBrowse']);
            var onleave = tryGet(navigation,'onleave');
            if(onleave) {
                settings.navigationEvents.onleave = ExamEvent.createFromJSON('onleave',onleave);
            }
        }
        var timing = tryGet(data,'timing');
        if(timing) {
            tryLoad(data,['allowPause'],settings);
            var timeout = tryGet(timing,'timeout');
            if(timeout) {
                settings.timerEvents.timeout = ExamEvent.createFromJSON('timeout',timeout);
            }
            var timedwarning = tryGet(timing,'timedwarning');
            if(timedwarning) {
                settings.timerEvents.timedwarning = ExamEvent.createFromJSON('timedwarning',timedwarning);
            }
        }
        var feedback = tryGet(data,'feedback');
        if(feedback) {
            tryLoad(data,['showActualMark','showTotalMark','showAnswerState','allowRevealAnswer','adviceThreshold']);
            tryLoad(data,['intro'],exam,['introMessage']);
            var feedbackmessages = tryGet(feedback,'feedbackmessages');
            if(feedbackmessages) {
                feedbackmessages.forEach(function(d) {
                    var fm = {threshold: 0, message: ''};
                    tryLoad(d,['mesage','threshold'],fm);
                    exam.feedbackMessages.push(fm);
                });
            }
        }
    },

    finaliseLoad: function(makeDisplay) {
        makeDisplay = makeDisplay || makeDisplay===undefined;
        var settings = this.settings;
        this.displayDuration = settings.duration>0 ? Numbas.timing.secsToDisplayTime( settings.duration ) : '';
        this.feedbackMessages.sort(function(a,b){ var ta = a.threshold, tb = b.threshold; return ta>tb ? 1 : ta<tb ? -1 : 0});

        //initialise display
        if(Numbas.display && makeDisplay) {
            this.display = new Numbas.display.ExamDisplay(this);
        }
    },

    /** Signals produced while loading this exam.
     * @type {Numbas.schedule.SignalBox} 
     * */
    signals: undefined,

    /** Storage engine
     * @type {Numbas.storage.BlankStorage}
     */
    store: undefined,

    /** How was the exam started? 
     * One of: `ab-initio`, `resume`, or `review`
     * @type {String}
     */
    entry: 'ab-initio',

    /** Settings
     * @property {String} name - Title of exam
     * @property {Number} percentPass - Percentage of max. score student must achieve to pass
     * @property {Boolean} shuffleQuestions - should the questions be shuffled?
     * @property {Number} numQuestions - number of questions in this sitting
     * @property {Boolean} preventLeave - prevent the browser from leaving the page while the exam is running?
     * @property {String} startPassword - password the student must enter before beginning the exam
     * @property {Boolean} allowRegen -can student re-randomise a question?
     * @property {String} navigateMode="sequence" - how is the exam navigated? Either `"sequence"` or `"menu"`
     * @property {Boolean} navigateReverse - can student navigate to previous question?
     * @property {Boolean} navigateBrowse - can student jump to any question they like?
     * @property {Boolean} allowSteps - are steps enabled?
     * @property {Boolean} showFrontPage - show the frontpage before starting the exam?
     * @property {Boolean} showResultsPage - show the results page after finishing the exam?
     * @property {Array.<Object.<Numbas.ExamEvent>>} navigationEvents - checks to perform when doing certain navigation action
     * @property {Array.<Object.<Numbas.ExamEvent>>} timerEvents - events based on timing
     * @property {Number} duration - how long is exam? (seconds)
     * @property {Boolean} allowPause - can the student suspend the timer with the pause button or by leaving?
     * @property {Boolean} showActualMark - show current score?
     * @property {Boolean} showTotalMark - show total marks in exam?
     * @property {Boolean} showAnswerState - tell student if answer is correct/wrong/partial?
     * @property {Boolean} allowRevealAnswer - allow 'reveal answer' button?
     * @property {Boolean} showQuestionGroupNames - show the names of question groups?
     * @property {Boolean} reviewShowScore - show student's score in review mode?
     * @property {Boolean} reviewShowFeedback - show part feedback messages in review mode?
     * @property {Boolean} reviewShowAdvice - show question advice in review mode?
     * @memberof Numbas.Exam.prototype
     * @instance
     */
    settings: {
        name: '',
        percentPass: 0,
        shuffleQuestions: false,
        numQuestions: 0,
        preventLeave: true,
        startPassword: '',
        allowRegen: false,
        navigateMode: 'menu',
        navigateReverse: false,
        navigateBrowse: false,
        allowSteps: true,
        showFrontPage: true,
        showResultsPage: 'oncompletion',
        navigationEvents: {},
        timerEvents: {},
        duration: 0,
        allowPause: false,
        showActualMark: false,
        showTotalMark: false,
        showAnswerState: false,
        allowRevealAnswer: false,
        showQuestionGroupNames: false,
        showStudentName: true,
        reviewShowScore: true,
        reviewShowFeedback: true,
        reviewShowExpectedAnswer: true,
        reviewShowAdvice: true
    },
    /** Base node of exam XML
     * @type Element
     */
    xml: undefined,
    /** Definition of the exam
     * @type Object
     */
    json: undefined,
    /**
     * Can be
     *  * `"normal"` - Student is currently sitting the exam
     *  * `"review"` - Student is reviewing a completed exam
     *  @type String
     */
    mode: 'normal',
    /** Total marks available in the exam
     * @type Number
     */
    mark: 0,
    /** Student's current score
     * @type Number
     */
    score: 0,                    //student's current score
    /** Student's score as a percentage
     * @type Number
     */
    percentScore: 0,
    /** Did the student pass the exam?
     * @type Boolean
     */
    passed: false,                //did student pass the exam?
    /** Student's name
     * @type String
     */
    student_name: undefined,
    /** Student's ID
     * @type String
     */
    student_id: undefined,
    /** JME evaluation environment
     *
     * Contains variables, rulesets and functions defined by the exam and by extensions.
     *
     * Inherited by each {@link Numbas.Question}'s scope.
     * @type Numbas.jme.Scope
     */
    scope: undefined,
    /** Number of the current question
     * @type Number
     */
    currentQuestionNumber: 0,
    /**
     * Object representing the current question.
     * @type Numbas.Question
     */
    currentQuestion: undefined,
    /** Groups of questions in the exam
     * @type Array.<Numbas.QuestionGroup>
     */
    question_groups: [],
    /**
     * Which questions are used?
     * @type Number[]
     */
    questionSubset: [],
    /**
     * Question objects, in the order the student will see them
     * @type Array.<Numbas.Question>
     */
    questionList: [],
    /** Exam duration in `h:m:s` format
     * @type String
     */
    displayDuration: '',
    /** Stopwatch object - updates the timer every second.
     * @property {Date} start
     * @property {Date} end
     * @property {Number} oldTimeSpent - `timeSpent` when the stopwatch was last updated
     * @property {Number} id - id of the `Interval` which calls {@link Numbas.Exam#countDown}
     */
    stopwatch: undefined,
    /** Time that the exam should stop
     * @type Date
     */
    endTime: undefined,
    /** Seconds until the end of the exam
     * @type Number
     */
    timeRemaining: 0,
    /** Seconds the exam has been in progress
     * @type Number
     */
    timeSpent: 0,
    /** Is the exam in progress?
     *
     * `false` before starting, when paused, and after ending.
     * @type Boolean
     */
    inProgress: false,
    /** Time the exam started
     * @type Date
     */
    start: Date(),
    /** Time the exam finished
     * @type null|Date
     */
    stop: null,
    /* Display object for this exam
     * @type Numbas.display.ExamDisplay
     */
    display: undefined,
    /** Stuff to do when starting exam afresh, before showing the front page.
     * @fires Numbas.Exam#event:ready
     * @fires Numbas.Exam#event:display ready
     */
    init: function()
    {
        var exam = this;
        job(exam.chooseQuestionSubset,exam);            //choose questions to use
        job(exam.makeQuestionList,exam);                //create question objects
        exam.signals.on('question list initialised', function() {
            if(exam.store) {
                job(exam.store.init,exam.store,exam);        //initialise storage
                job(exam.store.save,exam.store);            //make sure data get saved to LMS
            }
            exam.signals.trigger('ready');
        });
        exam.signals.on(['ready','display question list initialised'],function() {
            exam.signals.trigger('display ready');
        });
    },
    /** Restore previously started exam from storage 
     * @fires Numbas.Exam#event:ready
     * @listens Numbas.Exam#event:question list initialised
     */
    load: function() {
        var exam = this;
        if(!this.store) {
            return;
        }
        this.loading = true;
        var suspendData = this.store.load(this);    //get saved info from storage
        job(function() {
            var e = this;
            e.seed = suspendData.randomSeed || e.seed;
            var numQuestions = 0;
            suspendData.questionSubsets.forEach(function(subset,i) {
                e.question_groups[i].questionSubset = subset;
                numQuestions += subset.length;
            });
            this.settings.numQuestions = numQuestions;
            this.start = new Date(suspendData.start);
            if(suspendData.stop) {
                this.stop = suspendData.stop
            }
            if(this.settings.allowPause) {
                this.timeSpent = suspendData.timeSpent;
                this.timeRemaining = this.settings.duration - (suspendData.duration-suspendData.timeRemaining);
            }
            else {
                this.endTime = new Date(this.start.getTime()+this.settings.duration*1000);
                this.timeRemaining = (this.endTime - new Date())/1000;
            }
            this.score = suspendData.score;
        },this);
        job(this.makeQuestionList,this,true);
        exam.signals.on('question list initialised', function() {
            if(suspendData.currentQuestion!==undefined)
                exam.changeQuestion(suspendData.currentQuestion);
            exam.loading = false;
            exam.calculateScore();
            exam.signals.trigger('ready');
        });
    },
    /** Decide which questions to use and in what order
     * @see Numbas.QuestionGroup#chooseQuestionSubset
     */
    chooseQuestionSubset: function()
    {
        var numQuestions = 0;
        this.question_groups.forEach(function(group) {
            group.chooseQuestionSubset();
            numQuestions += group.questionSubset.length;
        });
        this.settings.numQuestions = numQuestions;
        if(numQuestions==0) {
            throw(new Numbas.Error('exam.changeQuestion.no questions'));
        }
        this.signals.trigger('question subset chosen');
    },
    /**
     * Having chosen which questions to use, make question list and create question objects
     *
     * If loading, need to restore randomised variables instead of generating anew
     *
     * @param {Boolean} loading
     * @fires Numbas.Exam#event:question list initialised
     * @listens Numbas.Question#event:ready
     * @listens Numbas.Question#event:HTMLAttached
     */
    makeQuestionList: function(loading)
    {
        var exam = this;
        this.questionList = [];
        var questionAcc = 0;
        this.question_groups.forEach(function(group) {
            group.questionList = [];
            group.questionSubset.forEach(function(n) {
                job(function(n) {
                    if(group.xml) {
                        var questionNodes = group.xml.selectNodes("questions/question");
                        var question = Numbas.createQuestionFromXML( questionNodes[n], questionAcc++, exam, group, exam.scope, exam.store);
                    } else if(group.json) {
                        var question = Numbas.createQuestionFromJSON( group.json.questions[n], questionAcc++, exam, group, exam.scope, exam.store);
                    }
                    if(loading) {
                        question.resume();
                    } else {
                        question.generateVariables();
                    }
                    exam.questionList.push(question);
                    group.questionList.push(question);
                },group,n);
            });
        });
        job(function() {
            Promise.all(exam.questionList.map(function(q){ return q.signals.on(['ready']) })).then(function() {
                exam.settings.numQuestions = exam.questionList.length;
                //calculate max marks available in exam
                exam.mark = 0;
                //go through the questions and recalculate the part scores, then the question scores, then the exam score
                for( i=0; i<exam.settings.numQuestions; i++ )
                {
                    exam.mark += exam.questionList[i].marks;
                }
                exam.signals.trigger('question list initialised');
            }).catch(function(e) {
                Numbas.schedule.halt(e);
            });
            Promise.all(exam.questionList.map(function(q){ return q.signals.on(['ready','HTMLAttached']) })).then(function() {
                //register questions with exam display
                exam.display.initQuestionList();
                exam.signals.trigger('display question list initialised');
            }).catch(function(e) {
                Numbas.schedule.halt(e);
            });
        });
        if(loading) {
            job(function() {
                this.updateScore();
            },this);
        }
    },

    /** Show the question menu
     */
    showMenu: function() {
        if(this.currentQuestion && this.currentQuestion.leavingDirtyQuestion()) {
            return;
        }
        this.currentQuestion = undefined;
        this.showInfoPage('menu');
    },
    /**
     * Show the given info page
     * @param {String} page - Name of the page to show
     */
    showInfoPage: function(page) {
        if(this.currentQuestion)
            this.currentQuestion.leave();
        this.display && this.display.showInfoPage(page);
    },

    /** Accept the given password to begin the exam?
     * @param {String} password
     * @returns {Boolean}
     */
    acceptPassword: function(password) {
        password = password.trim().toLowerCase();
        var startPassword = this.settings.startPassword.trim().toLowerCase();
        return this.settings.password=='' || password==startPassword;
    },

    /**
     * Begin the exam - start timing, go to the first question
     */
    begin: function()
    {
        this.start = new Date();        //make a note of when the exam was started
        this.endTime = new Date(this.start.getTime()+this.settings.duration*1000);    //work out when the exam should end
        this.timeRemaining = this.settings.duration;
        this.updateScore();                //initialise score
        //set countdown going
        if(this.mode!='review')
            this.startTiming();

        switch(this.settings.navigateMode) {
            case 'sequence':
                this.changeQuestion(0);            //start at the first question!
                this.display && this.display.showQuestion();    //display the current question
                break;
            case 'menu':
                this.display.showInfoPage('menu');
                break;
        }
    },
    /**
     * Pause the exam, and show the `suspend` page
     */
    pause: function()
    {
        this.endTiming();
        this.display && this.display.showInfoPage('suspend');
        this.store && this.store.pause();
    },
    /**
     * Resume the exam
     */
    resume: function()
    {
        this.startTiming();
        if(this.display) {
            if(this.currentQuestion) {
                this.display.showQuestion();
            } else if(this.settings.navigateMode=='menu') {
                this.display.showInfoPage('menu');
            }
        }
    },
    /**
     * Set the stopwatch going
     */
    startTiming: function()
    {
        this.inProgress = true;
        this.stopwatch = {
            start: new Date(),
            end: new Date((new Date()).getTime() + this.timeRemaining*1000),
            oldTimeSpent: this.timeSpent,
            id: setInterval(function(){exam.countDown();}, 1000)
        };
        if( this.settings.duration > 0 )
            this.display && this.display.showTiming();
        else
            this.display && this.display.hideTiming();
        var exam = this;
        this.countDown();
    },
    /**
     * Calculate time remaining and end the exam when timer reaches zero
     */
    countDown: function()
    {
        var t = new Date();
        this.timeSpent = this.stopwatch.oldTimeSpent + (t - this.stopwatch.start)/1000;
        if(this.settings.navigateMode=='sequence' && this.settings.duration > 0)
        {
            this.timeRemaining = Math.ceil((this.stopwatch.end - t)/1000);
            this.display && this.display.showTiming();
            if(this.settings.duration > 300 && this.timeRemaining<300 && !this.showedTimeWarning)
            {
                this.showedTimeWarning = true;
                var e = this.settings.timerEvents['timedwarning'];
                if(e && e.action=='warn')
                {
                    Numbas.display.showAlert(e.message);
                }
            }
            else if(this.timeRemaining<=0)
            {
                var e = this.settings.timerEvents['timeout'];
                if(e && e.action=='warn')
                {
                    Numbas.display.showAlert(e.message);
                }
                this.end(true);
            }
        }
    },
    /** Stop the stopwatch */
    endTiming: function()
    {
        this.inProgress = false;
        clearInterval( this.stopwatch.id );
    },
    /** Recalculate and display the student's total score.
     * @see Numbas.Exam#calculateScore
     */
    updateScore: function()
    {
        this.calculateScore();
        this.display && this.display.showScore();
        this.store && this.store.saveExam(this);
    },
    /** Calculate the student's score */
    calculateScore: function()
    {
        this.score=0;
        for(var i=0; i<this.questionList.length; i++)
            this.score += this.questionList[i].score;
        this.percentScore = this.mark>0 ? Math.floor(100*this.score/this.mark) : 0;
    },
    /**
     * Call this when student wants to move between questions.
     *
     * Will check move is allowed and if so change question and update display
     *
     * @param {Number} i - Number of the question to move to
     * @see Numbas.Exam#changeQuestion
     */
    tryChangeQuestion: function(i)
    {
        if(i<0 || i>=this.settings.numQuestions) {
            return;
        }
        if( ! (
               this.mode=='review' 
            || this.settings.navigateMode=='menu'
            || this.settings.navigateBrowse     // is browse navigation enabled?
            || (this.questionList[i].visited && this.settings.navigateReverse)    // if not, we can still move backwards to questions already seen if reverse navigation is enabled
            || (i>this.currentQuestion.number && this.questionList[i-1].visited)    // or you can always move to the next question
        ))
        {
            return;
        }

        var exam = this;
        /** Change the question
         */
        function go() {
            exam.changeQuestion(i);
            exam.display.showQuestion();
        }
        var currentQuestion = this.currentQuestion;
        if(!currentQuestion) {
            go();
            return;
        }
        if(i==currentQuestion.number) {
            return;
        }
        if(currentQuestion.leavingDirtyQuestion()) {
        } else if(currentQuestion.answered || currentQuestion.revealed || currentQuestion.marks==0) {
            go();
        } else {
            var eventObj = this.settings.navigationEvents.onleave;
            switch( eventObj.action )
            {
            case 'none':
                go();
                break;
            case 'warnifunattempted':
                Numbas.display.showConfirm(eventObj.message+'<p>'+R('control.proceed anyway')+'</p>',go);
                break;
            case 'preventifunattempted':
                Numbas.display.showAlert(eventObj.message);
                break;
            }
        }
    },
    /**
     * Change the current question. Student's can't trigger this without going through {@link Numbas.Exam#tryChangeQuestion}
     *
     * @param {Number} i - Number of the question to move to
     */
    changeQuestion: function(i)
    {
        if(this.currentQuestion) {
            this.currentQuestion.leave();
        }
        this.currentQuestion = this.questionList[i];
        if(!this.currentQuestion)
        {
            throw(new Numbas.Error('exam.changeQuestion.no questions'));
        }
        this.currentQuestion.visited = true;
        this.store && this.store.changeQuestion(this.currentQuestion);
    },
    /**
     * Show a question in review mode
     *
     * @param {Number} i - Number of the question to show
     */
    reviewQuestion: function(i) {
        this.changeQuestion(i);
        this.display && this.display.showQuestion();
    },
    /**
     * Regenerate the current question
     * @listens Numbas.Question#event:ready
     * @listens Numbas.Question#event:HTMLAttached
     */
    regenQuestion: function()
    {
        var e = this;
        var oq = e.currentQuestion;
        var n = oq.number;
        var group = oq.group
        var n_in_group = group.questionList.indexOf(oq);
        e.display.startRegen();
        var q = Numbas.createQuestionFromXML(oq.originalXML, oq.number, e, oq.group, e.scope, e.store);
        q.generateVariables();
        q.signals.on('ready',function() {
            e.questionList[n] = group.questionList[n_in_group] = q;
            e.changeQuestion(n);
            e.updateScore();
        });
        q.signals.on(['ready','HTMLAttached'], function() {
            e.currentQuestion.display.init();
            e.display.showQuestion();
            e.display.endRegen();
        });
    },
    /**
     * Try to end the exam - shows confirmation dialog, and checks that all answers have been submitted.
     * @see Numbas.Exam#end
     */
    tryEnd: function() {
        var exam = this;
        var message = R('control.confirm end');
        var answeredAll = true;
        var submittedAll = true;
        for(var i=0;i<this.questionList.length;i++) {
            if(!this.questionList[i].answered) {
                answeredAll = false;
                break;
            }
            if(this.questionList[i].isDirty()) {
                submittedAll = false;
            }
        }
        if(this.currentQuestion && this.currentQuestion.leavingDirtyQuestion())
            return;
        if(!answeredAll) {
            message = R('control.not all questions answered') + '<br/>' + message;
        }
        else if(!submittedAll) {
            message = R('control.not all questions submitted') + '<br/>' + message;
        }
        Numbas.display.showConfirm(
            message,
            function() {
                job(exam.end,exam,true);
            }
        );
    },
    /**
     * End the exam. The student can't directly trigger this without going through {@link Numbas.Exam#tryEnd}
     * @param {Boolean} save - should the end time be saved? See {@link Numbas.storage.BlankStorage#end}
     */
    end: function(save)
    {
        this.mode = 'review';
        //work out summary info
        this.passed = (this.percentScore >= this.settings.percentPass*100);
        this.result = R(this.passed ? 'exam.passed' :'exam.failed')
        var percentScore = this.mark >0 ? 100*this.score/this.mark : 0;
        this.feedbackMessage = null;
        for(var i=0;i<this.feedbackMessages.length;i++) {
            if(percentScore>=this.feedbackMessages[i].threshold) {
                this.feedbackMessage = this.feedbackMessages[i].message;
            } else {
                break;
            }
        }
        if(save) {
            //get time of finish
            this.stop = new Date();
            //stop the stopwatch
            this.endTiming();
            //send result to LMS, and tell it we're finished
            this.store && this.store.end();
        }
        this.display && this.display.end();
        for(var i=0;i<this.questionList.length;i++) {
            this.questionList[i].revealAnswer(true);
        }
        //display the results
        var showResultsPage = false;
        switch(this.settings.showResultsPage) {
            case 'oncompletion':
                showResultsPage = true;
                break;
            case 'review':
                showResultsPage = this.entry == 'review';
                break;
            default:
                showResultsPage = false;
                break;
        }
        if(showResultsPage || Numbas.is_instructor) {
            this.display && this.display.showInfoPage( 'result' );
        } else {
            this.exit();
        }
    },
    /**
     * Exit the exam - show the `exit` page
     */
    exit: function()
    {
        this.display && this.display.showInfoPage('exit');
    }
};
/** Represents what should happen when a particular timing or navigation event happens
 * @param {Element} eventNode - XML to load settings from
 * @constructor
 * @memberof Numbas
 */
function ExamEvent() {}
ExamEvent.prototype = /** @lends Numbas.ExamEvent.prototype */ {
    /** Name of the event this corresponds to
     *
     * Navigation events:
     * * `onleave` - the student tries to move to another question without answering the current one.
     *
     * (there used to be more, but now they're all the same one)
     *
     * Timer events:
     * * `timedwarning` - Five minutes until the exam ends.
     * * `timeout` - There's no time left; the exam is over.
     * @memberof Numbas.ExamEvent
     * @instance
     * @type String
     */
    type: '',
    /** Action to take when the event happens.
     *
     * Choices for timer events:
     * * `none` - don't do anything
     * * `warn` - show a message
     *
     * Choices for navigation events:
     * * `none` - just allow the navigation
     * * `warnifunattempted` - Show a warning but allow the student to continue.
     * * `preventifunattempted` - Show a warning but allow the student to continue.
     * @memberof Numbas.ExamEvent
     * @instance
     * @type String
     */
    action: 'none',
    /** Message to show the student when the event happens.
     * @memberof Numbas.ExamEvent
     * @instance
     * @type String
     */
    message: ''
};
ExamEvent.createFromXML = function(eventNode) {
    var e = new ExamEvent();
    var tryGetAttribute = Numbas.xml.tryGetAttribute;
    tryGetAttribute(e,null,eventNode,['type','action']);
    e.message = Numbas.xml.serializeMessage(eventNode);
    return e;
}
ExamEvent.createFromJSON = function(type,data) {
    var e = new ExamEvent();
    e.type = type;
    e.action = data.action;
    e.message = data.message;
    return e;
}


/** Represents a group of questions
 *
 * @constructor
 * @param {Numbas.Exam} exam
 * @param {Element} groupNode - the XML defining the group.
 * @property {Numbas.Exam} exam - the exam this group belongs to
 * @property {Element} xml - the XML defining the group
 * @property {Object} json - the JSON object defining the group
 * @property {Array.<Number>} questionSubset - the indices of the picked questions, in the order they should appear to the student
 * @property {Array.<Numbas.Question>} questionList
 * @memberof Numbas
 */
function QuestionGroup(exam) {
    this.exam = exam;
    this.settings = util.copyobj(this.settings);
}
QuestionGroup.prototype = {
    /** Load this question group's settings from the given XML <question_group> node
     * @param {Element} xml
     */
    loadFromXML: function(xml) {
        this.xml = xml;
        Numbas.xml.tryGetAttribute(this.settings,this.xml,'.',['name','pickingStrategy','pickQuestions']);
        var questionNodes = this.xml.selectNodes('questions/question');
        this.numQuestions = questionNodes.length;
    },
    /** Load this question group's settings from the given JSON dictionary
     * @param {Object} data
     */
    loadFromJSON: function(data) {
        this.json = data;
        Numbas.json.tryLoad(data,['name','pickingStrategy','pickQuestions'],this.settings);
        this.numQuestions = data.questions.length;
    },
    /** Settings for this group
     * @property {String} name
     * @property {String} pickingStrategy - how to pick the list of questions: 'all-ordered', 'all-shuffled' or 'random-subset'
     * @property {Number} pickQuestions - if `pickingStrategy` is 'random-subset', how many questions to pick
     */
    settings: {
        name: '',
        pickingStrategy: 'all-ordered',
        pickQuestions: 1
    },
    /** Decide which questions to use and in what order */
    chooseQuestionSubset: function() {
        switch(this.settings.pickingStrategy) {
            case 'all-ordered':
                this.questionSubset = Numbas.math.range(this.numQuestions);
                break;
            case 'all-shuffled':
                this.questionSubset = Numbas.math.deal(this.numQuestions);
                break;
            case 'random-subset':
                this.questionSubset = Numbas.math.deal(this.numQuestions).slice(0,this.settings.pickQuestions);
                break;
        }
    }
}
});
