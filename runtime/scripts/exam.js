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
Numbas.queueScript('exam', ['base', 'timing', 'util', 'xml', 'schedule', 'storage', 'scorm-storage', 'math', 'question', 'jme-variables', 'jme-display', 'jme-rules', 'jme', 'diagnostic', 'diagnostic_scripts'], function() {
    var util = Numbas.util;

/** Create a {@link Numbas.Exam} object from an XML definition.
 *
 * @memberof Numbas
 * @param {Element} xml
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 * @param {Element} [display_root=undefined] - Should this exam make a {@link Numbas.display.ExamDisplay} object?
 * @param {Numbas.Scheduler} scheduler
 * @returns {Numbas.Exam}
 */
Numbas.createExamFromXML = function(xml, store, display_root, scheduler) {
    var exam = new Exam(store, scheduler);

    exam.loadFromXML(xml);

    exam.finaliseLoad(display_root)

    return exam;
}

/** Create a {@link Numbas.Exam} object from a JSON definition.
 *
 * @memberof Numbas
 * @param {object} data
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @param {Element} display_root - The root element of the exam's display.
 * @param {Numbas.Scheduler} scheduler
 * @returns {Numbas.Exam}
 */
Numbas.createExamFromJSON = function(data, store, display_root, scheduler) {
    var exam = new Exam(store, scheduler);

    exam.loadFromJSON(data);

    exam.finaliseLoad(display_root)

    return exam;
}

/** Keeps track of all info we need to know while exam is running.
 *
 *
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 * @param {Numbas.schedule.Scheduler} scheduler - The task scheduler to use.
 * @class
 * @memberof Numbas
 */
function Exam(store, scheduler)
{
    scheduler = scheduler || new Numbas.Scheduler();

    this.store = store;
    this.scheduler = scheduler;
    this.signals = new Numbas.schedule.SignalBox();
    this.events = new Numbas.schedule.EventBox();
    var scope = new Numbas.jme.Scope(Numbas.jme.builtinScope);
    this.scope = scope;

    var settings = this.settings = util.copyobj(Exam.prototype.settings);
    settings.navigationEvents = {};
    settings.timerEvents = {};
    this.feedbackMessages = [];
    this.question_groups = [];

}
Numbas.Exam = Exam;

/** The exam is ready for the student to start interacting with it.
 *
 * @event Numbas.Exam#ready
 */

/** The question list has been initialised - every question is loaded and ready to use.
 *
 * @event Numbas.Exam#question_list_initialised
 */

Exam.prototype = /** @lends Numbas.Exam.prototype */ {

    /** Load the exam's settings from an XML <exam> node.
     *
     * @param {Element} xml
     */
    loadFromXML: function(xml) {
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        if(!xml) {
            throw(new Numbas.Error('exam.xml.bad root'));
        }
        var settings = this.settings;

        this.xml = xml;
        tryGetAttribute(settings, xml, '.', ['name', 'percentPass', 'allowPrinting']);
        tryGetAttribute(settings, xml, 'questions', ['shuffle', 'all', 'pick'], ['shuffleQuestions', 'allQuestions', 'pickQuestions']);
        tryGetAttribute(settings,
            xml,
            'settings/navigation',
            [
                'allowregen',
                'navigatemode',
                'reverse',
                'browse',
                'allowsteps',
                'showfrontpage',
                'showresultspage',
                'preventleave',
                'typeendtoleave',
                'startpassword',
                'allowAttemptDownload',
                'downloadEncryptionKey',
                'autoSubmit'
            ],

            [
                'allowRegen',
                'navigateMode',
                'navigateReverse',
                'navigateBrowse',
                'allowSteps',
                'showFrontPage',
                'showResultsPage',
                'preventLeave',
                'typeendtoleave',
                'startPassword',
                'allowAttemptDownload',
                'downloadEncryptionKey',
                'autoSubmit'
            ]
        );
        //get navigation events and actions
        var navigationEventNodes = xml.selectNodes('settings/navigation/event');
        var e;
        for(let i=0; i<navigationEventNodes.length; i++ ) {
            e = ExamEvent.createFromXML(navigationEventNodes[i]);
            settings.navigationEvents[e.type] = e;
        }
        tryGetAttribute(settings, xml, 'settings/timing', ['duration', 'allowPause']);
        var timerEventNodes = this.xml.selectNodes('settings/timing/event');
        for(let i=0; i<timerEventNodes.length; i++ ) {
            e = ExamEvent.createFromXML(timerEventNodes[i]);
            settings.timerEvents[e.type] = e;
        }
        var feedbackPath = 'settings/feedback';
        tryGetAttribute(settings, xml, feedbackPath,
            [
                'showactualmarkwhen',
                'showtotalmarkwhen',
                'showanswerstatewhen',
                'showpartfeedbackmessageswhen',
                'enterreviewmodeimmediately',
                'allowrevealanswer',
                'showstudentname',
                'showexpectedanswerswhen',
                'showadvicewhen'
            ],
            [
                'showActualMark',
                'showTotalMark',
                'showAnswerState',
                'showPartFeedbackMessages',
                'enterReviewModeImmediately',
                'allowRevealAnswer',
                'showStudentName',
                'revealExpectedAnswers',
                'revealAdvice'
            ]
        );
        tryGetAttribute(settings, xml, 'settings/feedback/results_options', ['printquestions', 'printadvice'], ['resultsprintquestions', 'resultsprintadvice']);
        var serializer = new XMLSerializer();
        var isEmpty = Numbas.xml.isEmpty;
        var introNode = this.xml.selectSingleNode(feedbackPath+'/intro/content/span');
        this.hasIntro = !isEmpty(introNode);
        this.introMessage = this.hasIntro ? serializer.serializeToString(introNode) : '';

        var end_message_node = this.xml.selectSingleNode(feedbackPath+'/end_message/content/span');
        this.has_end_message = !isEmpty(end_message_node);
        this.end_message = this.has_end_message ? serializer.serializeToString(end_message_node) : '';

        var feedbackMessageNodes = this.xml.selectNodes(feedbackPath+'/feedbackmessages/feedbackmessage');
        for(let i=0;i<feedbackMessageNodes.length;i++) {
            var feedbackMessageNode = feedbackMessageNodes[i];
            var feedbackMessage = {threshold: 0, message: ''};
            feedbackMessage.message = serializer.serializeToString(feedbackMessageNode.selectSingleNode('content/span'));
            tryGetAttribute(feedbackMessage, null, feedbackMessageNode, ['threshold']);
            this.feedbackMessages.push(feedbackMessage);
        }
        var rulesetNodes = xml.selectNodes('settings/rulesets/set');
        var sets = {};
        for(let i=0; i<rulesetNodes.length; i++) {
            var name = rulesetNodes[i].getAttribute('name');
            var set = [];
            //get new rule definitions
            var defNodes = rulesetNodes[i].selectNodes('ruledef');
            for( var j=0; j<defNodes.length; j++ ) {
                var pattern = defNodes[j].getAttribute('pattern');
                var result = defNodes[j].getAttribute('result');
                var conditions = [];
                var conditionNodes = defNodes[j].selectNodes('conditions/condition');
                for(let k=0; k<conditionNodes.length; k++) {
                    conditions.push(Numbas.xml.getTextContent(conditionNodes[k]));
                }
                var rule = new Numbas.jme.display.Rule(pattern, conditions, result);
                set.push(rule);
            }
            //get included sets
            var includeNodes = rulesetNodes[i].selectNodes('include');
            for(let j=0; j<includeNodes.length; j++ ) {
                set.push(includeNodes[j].getAttribute('name'));
            }
            sets[name] = this.scope.rulesets[name] = set;
        }
        for(let [name, set] of Object.entries(sets)) {
            this.scope.rulesets[name] = Numbas.jme.collectRuleset(set, this.scope.allRulesets());
        }
        // question groups
        tryGetAttribute(settings, xml, 'question_groups', ['showQuestionGroupNames', 'shuffleQuestionGroups']);
        var groupNodes = this.xml.selectNodes('question_groups/question_group');
        for(let i=0;i<groupNodes.length;i++) {
            var qg = new QuestionGroup(this, i);
            qg.loadFromXML(groupNodes[i]);
            this.question_groups.push(qg);
        }

        // knowledge graph
        var knowledgeGraphNode = this.xml.selectSingleNode('knowledge_graph');
        var kgdata = Numbas.xml.getTextContent(knowledgeGraphNode);
        if(kgdata) {
            this.knowledge_graph = new Numbas.diagnostic.KnowledgeGraph(JSON.parse(kgdata));
        }

        var diagnosticAlgorithmNode = this.xml.selectSingleNode('settings/diagnostic/algorithm');
        tryGetAttribute(settings, null, diagnosticAlgorithmNode, ['script'], ['diagnosticScript']);
        settings.customDiagnosticScript = Numbas.xml.getTextContent(diagnosticAlgorithmNode);
    },

    loadFromJSON: function(data) {
        this.json = data;
        var exam = this;
        var settings = exam.settings;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;
        tryLoad(data, ['name', 'duration', 'percentPass', 'allowPrinting', 'showQuestionGroupNames', 'showStudentName', 'shuffleQuestions', 'shuffleQuestionGroups'], settings);
        var question_groups = tryGet(data, 'question_groups');
        if(question_groups) {
            question_groups.forEach(function(qgdata) {
                var qg = new QuestionGroup(exam);
                qg.loadFromJSON(qgdata);
                exam.question_groups.push(qg);
            });
        }
        var navigation = tryGet(data, 'navigation');
        if(navigation) {
            tryLoad(navigation, ['allowRegen', 'allowSteps', 'showFrontPage', 'showResultsPage', 'preventLeave', 'typeendtoleave', 'startPassword', 'allowAttemptDownload', 'downloadEncryptionKey', 'autoSubmit', 'navigateMode'], settings);
            tryLoad(navigation, ['reverse', 'browse'], settings, ['navigateReverse', 'navigateBrowse']);
            var onleave = tryGet(navigation, 'onleave');
            settings.navigationEvents.onleave = ExamEvent.createFromJSON('onleave', onleave);
        }
        var timing = tryGet(data, 'timing');
        if(timing) {
            tryLoad(timing, ['allowPause'], settings);
            var timeout = tryGet(timing, 'timeout');
            if(timeout) {
                settings.timerEvents.timeout = ExamEvent.createFromJSON('timeout', timeout);
            }
            var timedwarning = tryGet(timing, 'timedwarning');
            if(timedwarning) {
                settings.timerEvents.timedwarning = ExamEvent.createFromJSON('timedwarning', timedwarning);
            }
        }
        var feedback = tryGet(data, 'feedback');
        if(feedback) {
            tryLoad(
                feedback,
                [
                    'showactualmarkwhen',
                    'showtotalmarkwhen',
                    'showanswerstatewhen',
                    'showpartfeedbackmessageswhen',
                    'enterreviewmodeimmediately',
                    'showexpectedanswerswhen',
                    'showadvicewhen',
                    'allowrevealanswer',
                    'advicethreshold',
                ],
                settings,
                [
                    'showActualMark',
                    'showTotalMark',
                    'showAnswerState',
                    'showPartFeedbackMessages',
                    'enterReviewModeImmediately',
                    'revealExpectedAnswers',
                    'revealAdvice',
                    'allowRevealAnswer',
                    'adviceThreshold'
                ]
            );
            tryLoad(feedback, ['intro'], exam, ['introMessage']);
            var results_options = tryGet(feedback, 'results_options')
            if(results_options) {
                tryLoad(results_options, ['resultsprintquestions', 'resultsprintadvice'], settings);
            }
            var feedbackmessages = tryGet(feedback, 'feedbackmessages');
            if(feedbackmessages) {
                feedbackmessages.forEach(function(d) {
                    var fm = {threshold: 0, message: ''};
                    tryLoad(d, ['mesage', 'threshold'], fm);
                    exam.feedbackMessages.push(fm);
                });
            }
        }

        var diagnostic = tryGet(data, 'diagnostic');
        if(diagnostic) {
            var knowledge_graph = tryGet(diagnostic, 'knowledge_graph');
            if(knowledge_graph) {
                this.knowledge_graph = new Numbas.diagnostic.KnowledgeGraph(knowledge_graph);
            }
            tryLoad(diagnostic, ['script', 'customScript'], settings, ['diagnosticScript', 'customDiagnosticScript']);
        }
    },

    /** Perform any tidying up or processing that needs to happen once the exam's definition has been loaded.
     *
     * @param {Element} [display_root] - The root element of the exam display.
     * @fires Numbas.Exam#diagnostic_controller_initialised
     */
    finaliseLoad: function(display_root) {
        var exam = this;
        const makeDisplay = display_root !== undefined;
        var settings = this.settings;
        this.settings.initial_duration = this.settings.duration;

        this.updateDurationExtension();

        this.updateDisplayDuration();
        this.feedbackMessages.sort(function(a, b){ var ta = a.threshold, tb = b.threshold; return ta>tb ? 1 : ta<tb ? -1 : 0});

        if(this.settings.navigateMode == 'diagnostic') {
            exam.signals.on('question list initialised', function() {
                exam.questionList.forEach(function(q) {
                    var topics = [];
                    q.tags.forEach(function(t) {
                        var m = t.match(/skill: (.*)/);
                        if(m) {
                            topics.push(m[1]);
                        }
                    });
                    q.topics = topics;
                });

                var script;
                switch(exam.settings.diagnosticScript) {
                    case 'custom':
                        script = new Numbas.diagnostic.DiagnosticScript(exam.settings.customDiagnosticScript);
                        break;
                    default:
                        script = Numbas.diagnostic.scripts[exam.settings.diagnosticScript];
                        if(exam.settings.customDiagnosticScript) {
                            script = new Numbas.diagnostic.DiagnosticScript(exam.settings.customDiagnosticScript, script);
                        }
                }
                exam.diagnostic_controller = new Numbas.diagnostic.DiagnosticController(exam.knowledge_graph, exam, script);
                exam.signals.trigger('diagnostic controller initialised');
            }).catch(function(e) {
                Numbas.schedule.halt(e);
            });
        }

        if(Numbas.is_instructor) {
            settings.allowPrinting = true;
        }

        //initialise display
        if(Numbas.display && makeDisplay) {
            this.display = new Numbas.display.ExamDisplay(this, display_root);
        }
    },

    /** Signals produced while loading this exam.
     *
     * @type {Numbas.schedule.SignalBox} 
     */
    signals: undefined,

    /** Storage engine
     *
     * @type {Numbas.storage.BlankStorage}
     */
    store: undefined,

    /** How was the exam started? 
     *
     * One of: `ab-initio`, `resume`, or `review`
     *
     * @type {string}
     */
    entry: 'ab-initio',

    /** Settings for the exam object.
     *
     * @property {string} name - Title of exam
     * @property {number} percentPass - Percentage of max. score student must achieve to pass
     * @property {boolean} allowPrinting - Allow the student to print an exam transcript? If not, the theme should hide everything in print media and not show any buttons to print.
     * @property {boolean} shuffleQuestions - should the questions be shuffled?
     * @property {boolean} shuffleQuestionGroups - randomize question group order?
     * @property {number} numQuestions - number of questions in this sitting
     * @property {boolean} preventLeave - prevent the browser from leaving the page while the exam is running?
     * @property {boolean} typeendtoleave - require written confirmation before leaving the exam?
     * @property {string} startPassword - password the student must enter before beginning the exam
     * @property {boolean} allowRegen - can student re-randomise a question?
     * @property {boolean} allowAttemptDownload - Can the student download their results as a CSV?
     * @property {string} downloadEncryptionKey - key for encryption student data?
     * @property {boolean} autoSubmit - Automatically submit parts after entering an answer? If false, then the student must click the "Save answer" button.
     * @property {string} navigateMode - how is the exam navigated? Either `"sequence"`, `"menu"` or `"diagnostic"`
     * @property {boolean} navigateReverse - can student navigate to previous question?
     * @property {boolean} navigateBrowse - can student jump to any question they like?
     * @property {boolean} allowSteps - are steps enabled?
     * @property {boolean} showFrontPage - show the frontpage before starting the exam?
     * @property {boolean} enterReviewModeImmediately - Should the exam go into review mode immediately after ending, or only when re-entering in review mode?
     * @property {Array.<{[key: string]: Numbas.ExamEvent}>} navigationEvents - checks to perform when doing certain navigation action
     * @property {Array.<{[key: string]: Numbas.ExamEvent}>} timerEvents - Events based on timing.
     * @property {number} duration - The time allowed for the exam, in seconds.
     * @property {number} duration_extension - A number of seconds to add to the duration.
     * @property {number} initial_duration - The duration without any extension applied.
     * @property {boolean} allowPause - Can the student suspend the timer with the pause button or by leaving?
     * @property {string} showActualMark - When should the current score be shown?
     * @property {string} showTotalMark - When should total marks in the exam be shown?
     * @property {string} showAnswerState - When to tell the student if answer is correct/wrong/partial?
     * @property {string} showPartFeedbackMessages - When to show part feedback messages?
     * @property {boolean} allowRevealAnswer - Allow 'reveal answer' button?
     * @property {boolean} showQuestionGroupNames - Show the names of question groups?
     * @property {string} revealAdvice - When should question advice be shown?
     * @property {string} revealExpectedAnswers - When should expected answers be shown?
     * @property {boolean} resultsprintquestions - Show questions in printed results?
     * @property {boolean} resultsprintadvice - Show advice in printed results?
     * @memberof Numbas.Exam
     * @instance
     */
    settings: {
        name: '',
        percentPass: 0,
        allowPrinting: true,
        shuffleQuestions: false,
        numQuestions: 0,
        preventLeave: true,
        startPassword: '',
        allowRegen: false,
        allowAttemptDownload: false,
        downloadEncryptionKey: '',
        autoSubmit: true,
        navigateMode: 'menu',
        navigateReverse: false,
        navigateBrowse: false,
        allowSteps: true,
        showFrontPage: true,
        enterReviewModeImmediately: true,
        navigationEvents: {},
        timerEvents: {},
        duration: 0,
        initial_duration: 0,
        allowPause: false,
        showActualMark: 'inreview',
        showTotalMark: 'inreview',
        showAnswerState: 'inreview',
        showPartFeedbackMessages: 'inreview',
        allowRevealAnswer: false,
        showQuestionGroupNames: false,
        shuffleQuestionGroups: false,
        showStudentName: true,
        revealAdvice: 'inreview',
        revealExpectedAnswers: 'inreview',
        resultsprintquestions: true,
        resultsprintadvice: true,
        diagnosticScript: 'diagnosys',
        customDiagnosticScript: ''
    },
    /** Base node of exam XML
     *
     * @type {Element}
     */
    xml: undefined,
    /** Definition of the exam
     *
     * @type {object}
     */
    json: undefined,
    /**
     * Can be:
     *
     * - `"normal"` - Student is currently sitting the exam.
     * - `"review"` - Student is reviewing a completed exam.
     *
     * @type {string}
     */
    mode: 'normal',
    /** Total marks available in the exam.
     *
     * @type {number}
     */
    mark: 0,
    /** Student's current score.
     *
     * @type {number}
     */
    score: 0,                    //student's current score
    /** Student's score as a percentage.
     *
     * @type {number}
     */
    percentScore: 0,
    /** Have the correct answers been revealed?
     *
     * @type {boolean}
     */
    revealed: false,
    /** Did the student pass the exam?
     *
     * @type {boolean}
     */
    passed: false,                //did student pass the exam?
    /** Student's name.
     *
     * @type {string}
     */
    student_name: undefined,
    /** Student's ID.
     *
     * @type {string}
     */
    student_id: undefined,
    /** JME evaluation environment.
     *
     * Contains variables, rulesets and functions defined by the exam and by extensions.
     *
     * Inherited by each {@link Numbas.Question}'s scope.
     *
     * @type {Numbas.jme.Scope}
     */
    scope: undefined,
    /** Number of the current question.
     *
     * @type {number}
     */
    currentQuestionNumber: 0,
    /** Object representing the current question.
     *
     * @type {Numbas.Question}
     */
    currentQuestion: undefined,
    /**
     * The order in which the question groups are displayed
     *
     * @type {Array.<number>}
     */
    questionGroupOrder: [],
    /** Groups of questions in the exam.
     *
     * @type {Array.<Numbas.QuestionGroup>}
     */
    question_groups: [],
    /** Which questions are used?
     *
     * @type {Array.<number>}
     */
    questionSubset: [],
    /** Question objects, in the order the student will see them.
     *
     * @type {Array.<Numbas.Question>}
     */
    questionList: [],
    /** Stopwatch object - updates the timer every second.
     *
     * @property {Date} start - The time that the stopwatch started.
     * @property {Date} end - The time that the stopwatch ended.
     * @property {number} oldTimeSpent - The value of `timeSpent` when the stopwatch was last updated.
     * @property {number} id - The id of the `Interval` which calls {@link Numbas.Exam#countDown}.
     */
    stopwatch: undefined,
    /** Time that the exam should stop.
     *
     * @type {Date}
     */
    endTime: undefined,
    /** Seconds until the end of the exam.
     *
     * @type {number}
     */
    timeRemaining: 0,
    /** Seconds the exam has been in progress.
     *
     * @type {number}
     */
    timeSpent: 0,
    /** Is the exam in progress?
     *
     * `false` before starting, when paused, and after ending.
     *
     * @type {boolean}
     */
    inProgress: false,
    /** Time the exam started.
     *
     * @type {Date}
     */
    start: Date(),
    /** Time the exam finished.
     *
     * @type {null|Date}
     */
    stop: null,
    /* Display object for this exam.
     *
     * @type {Numbas.display.ExamDisplay}
     */
    display: undefined,
    /** Stuff to do when starting exam afresh, before showing the front page.
     *
     * @fires Numbas.Exam#ready
     * @fires Numbas.Exam#display_ready
     */
    init: function()
    {
        var exam = this;
        if(exam.store) {
            exam.store.init(exam);        //initialise storage
            exam.set_exam_variables();
        }

        exam.scheduler.job(() => exam.chooseQuestionSubset());            //choose questions to use
        exam.scheduler.job(() => exam.makeQuestionList());                //create question objects

        exam.signals.on('question list initialised', function() {
            if(exam.store) {
                exam.store.init_questions();  //initialise question storage
                exam.store.save();            //make sure data get saved to LMS
            }
        });

        var ready_signals = ['question list initialised'];
        if(exam.settings.navigateMode=='diagnostic') {
            ready_signals.push('diagnostic controller initialised');
        }
        exam.signals.on(ready_signals, function() {
            exam.scheduler.job(function() {
                exam.calculateScore();
                exam.signals.trigger('ready');
            });
        });

        exam.signals.on(['ready', 'display question list initialised'], function() {
            exam.signals.trigger('display ready');
        });
    },
    /** Restore previously started exam from storage.
     *
     * @fires Numbas.Exam#ready
     * @listens Numbas.Exam#question_list_initialised
     */
    load: function() {
        var exam = this;
        if(!this.store) {
            return;
        }
        this.loading = true;
        var suspendData = this.store.load(this);    //get saved info from storage
        exam.seed = suspendData.randomSeed || exam.seed;
        exam.scheduler.job(() => exam.set_exam_variables());
        exam.scheduler.job(() => {
            var numQuestions = 0;
            if(suspendData.questionGroupOrder) {
                exam.questionGroupOrder = suspendData.questionGroupOrder.slice();
            } else {
                exam.questionGroupOrder = Numbas.math.range(exam.question_groups.length);
            }
            exam.questionGroupOrder.forEach(function(defined, displayed) {
                var subset = suspendData.questionSubsets[displayed];
                exam.question_groups[defined].questionSubset = subset;
                numQuestions += subset.length;
            });
            exam.settings.numQuestions = numQuestions;
            exam.setStartTime(new Date(suspendData.start));
            if(suspendData.stop) {
                exam.setEndTime(new Date(suspendData.stop));
            }
            if(exam.settings.allowPause) {
                exam.timeSpent = suspendData.timeSpent;
                exam.timeRemaining = exam.settings.duration - (suspendData.duration-suspendData.timeRemaining);
            }
            else {
                exam.endTime = new Date(exam.start.getTime()+exam.settings.duration*1000);
                exam.timeRemaining = (exam.endTime - new Date())/1000;
            }
            exam.score = suspendData.score;
            if(exam.settings.navigateMode=='diagnostic') {
                exam.signals.on('diagnostic controller initialised', function() {
                    exam.diagnostic_controller.state = exam.scope.evaluate(suspendData.diagnostic.state);
                });
            }
        });
        exam.scheduler.job(() => this.makeQuestionList(true));
        exam.signals.on('question list initialised', function() {
            if(suspendData.currentQuestion!==undefined)
                exam.changeQuestion(suspendData.currentQuestion);
            exam.loading = false;
            exam.calculateScore();
            exam.signals.trigger('ready');
        });
    },

    /** Set exam-level variables.
     *
     */
    set_exam_variables: function() {
        this.scope.setVariable('initial_seed', Numbas.jme.wrapValue(this.seed));
        this.scope.setVariable('student_id', Numbas.jme.wrapValue(this.student_id));
    },

    /** Decide which questions to use and in what order.
     *
     * @fires Numbas.Exam#chooseQuestionSubset
     * @see Numbas.QuestionGroup#chooseQuestionSubset
     */
    chooseQuestionSubset: function()
    {
        var numQuestions = 0;
        var numGroups = this.question_groups.length;
        if (this.settings.shuffleQuestionGroups){
            this.questionGroupOrder = Numbas.math.deal(numGroups);
        } else {
            this.questionGroupOrder = Numbas.math.range(numGroups);
        }
        for (var i = 0; i < numGroups; i++) {
            var groupIndex = this.questionGroupOrder[i];
            this.question_groups[groupIndex].chooseQuestionSubset();
            numQuestions += this.question_groups[groupIndex].questionSubset.length;  
        }
        this.settings.numQuestions = numQuestions;
        if(numQuestions==0) {
            throw(new Numbas.Error('exam.changeQuestion.no questions'));
        }
        this.signals.trigger('chooseQuestionSubset');
    },
    /**
     * Having chosen which questions to use, make question list and create question objects.
     *
     * If loading, need to restore randomised variables instead of generating anew.
     *
     * @param {boolean} loading
     * @fires Numbas.Exam#question_list_initialised
     * @fires Numbas.Exam#display_question_list_initialised
     * @listens Numbas.Question#ready
     * @listens Numbas.Question#mainHTMLAttached
     */
    makeQuestionList: function(loading)
    {
        var exam = this;
        this.questionList = [];
        this.questionAcc = 0;
        switch(this.settings.navigateMode) {
            case 'diagnostic':
                this.makeDiagnosticQuestions(loading);
                break;
            default:
                this.makeAllQuestions(loading);
        }
        exam.scheduler.job(() => {
            Promise.all(exam.questionList.map(function(q){ return q.signals.on(['ready']) })).then(function() {
                exam.settings.numQuestions = exam.questionList.length;
                if(exam.settings.navigateMode=='diagnostic') {
                    exam.mark = 1;
                } else {
                    exam.mark = 0;
                    for( var i=0; i<exam.settings.numQuestions; i++ ) {
                        exam.mark += exam.questionList[i].marks;
                    }
                }
                exam.signals.trigger('question list initialised');
            }).catch(function(e) {
                Numbas.schedule.halt(e);
            });
            exam.display && Promise.all(exam.questionList.map(function(q){ return q.signals.on(['ready', 'mainHTMLAttached']) })).then(function() {
                //register questions with exam display
                exam.display.initQuestionList();
                exam.signals.trigger('display question list initialised');
            }).catch(function(e) {
                Numbas.schedule.halt(e);
            });
        });
        if(loading) {
            exam.scheduler.job(() => this.updateScore());
        }
    },

    makeAllQuestions: function(loading) {
        var exam = this;
        var ogroups = this.question_groups.slice();
        this.question_groups = [];
        this.questionGroupOrder.forEach(function(groupIndex, i) {
            var group = ogroups[groupIndex];
            exam.question_groups[i] = group;
            group.questionList = [];
            group.questionSubset.forEach(function(n) {
                exam.scheduler.job(() => group.createQuestion(n, loading));
            });
        });
    },

    makeDiagnosticQuestions: function(loading) {
        var exam = this;
        this.question_groups.forEach(function(g) {
            g.questionList = [];
        });
        if(loading) {
            var eobj = this.store.load(this);
            eobj.questions.forEach(function(qobj, n) {
                var group = exam.question_groups[qobj.group];
                group.createQuestion(qobj.number_in_group, true)
            });
        }
    },

    /** Show the given info page.
     *
     * @param {string} page - The name of the page to show.
     */
    showInfoPage: function(page) {
        this.display && this.display.showInfoPage(page);
        this.events.trigger('showInfoPage', page);
    },

    /** 
     * Show the question menu.
     *
     * @fires Numbas.Exam#event:showInfoPage
     */
    showMenu: function() {
        if(this.currentQuestion && this.currentQuestion.leavingDirtyQuestion()) {
            return;
        }
        this.currentQuestion = undefined;
        this.showInfoPage('menu');
    },

    /** Accept the given password to begin the exam?
     *
     * @param {string} password
     * @returns {boolean}
     */
    acceptPassword: function(password) {
        password = password.trim().toLowerCase();
        var startPassword = this.settings.startPassword.trim().toLowerCase();
        return this.settings.password=='' || password==startPassword;
    },


    /** Record the exam start time.
     *
     * @param {Date} start
     */
    setStartTime: function(start) {
        this.start = start;
        this.display && this.display.setStartTime(this.start);
    },

    /** Record the exam end time.
     *
     * @param {Date} stop
     */
    setEndTime: function(stop) {
        this.stop = stop;
        this.display && this.display.setEndTime(this.stop);
    },

    /**
     * Begin the exam - start timing, go to the first question.
     * 
     * @fires Numbas.Exam#begin
     */
    begin: function()
    {
        this.setStartTime(new Date());
        this.endTime = new Date(this.start.getTime()+this.settings.duration*1000);    //work out when the exam should end
        this.timeRemaining = this.settings.duration;
        this.updateScore();                //initialise score
        //set countdown going
        if(this.mode!='review') {
            this.startTiming();
        }

        switch(this.settings.navigateMode) {
            case 'sequence':
                this.changeQuestion(0);            //start at the first question!
                this.events.trigger('showQuestion');
                this.display && this.display.showQuestion();    //display the current question
                break;
            case 'menu':
                this.showInfoPage('menu');
                break;
            case 'diagnostic':
                var question = this.diagnostic_controller.first_question();
                this.next_diagnostic_question(question);
                break;
        }
        this.signals.trigger('begin');
    },
    /**
     * Pause the exam, and show the `suspend` page.
     * 
     * @fires Numbas.Exam#event:pause
     * @fires Numbas.Exam#event:showInfoPage
     */
    pause: function()
    {
        this.endTiming();
        this.showInfoPage('paused');
        this.store && this.store.pause();
        this.events.trigger('pause');
    },
    /**
     * Resume the exam.
     * 
     * @fires Numbas.Exam#event:resume
     * @fires Numbas.Exam#event:showInfoPage
     */
    resume: function()
    {
        this.startTiming();
        if(this.display) {
            if(this.currentQuestion) {
                this.display.showQuestion();
                this.events.trigger('showQuestion');
            } else if(this.settings.navigateMode=='menu') {
                this.showInfoPage('menu');
            }
        }
        this.events.trigger('resume');
    },
    /**
     * Set the stopwatch going.
     * 
     * @fires Numbas.Exam#event:startTiming
     * @fires Numbas.Exam#event:hideTiming
     * @fires Numbas.Exam#event:showTiming
     */
    startTiming: function() {
        this.inProgress = true;
        this.stopwatch = {
            start: new Date(),
            end: new Date((new Date()).getTime() + this.timeRemaining*1000),
            oldTimeSpent: this.timeSpent,
            id: setInterval(function(){exam.countDown();}, 1000)
        };
        if( this.settings.duration > 0 ) {
            this.display && this.display.showTiming();
            this.events.trigger('showTiming');
        } else {
            this.display && this.display.hideTiming();
            this.events.trigger('hideTiming');
        }
        var exam = this;
        this.events.trigger('startTiming');
        this.countDown();
    },
    /**
     * Calculate time remaining and end the exam when timer reaches zero.
     *
     * @fires Numbas.Exam#event:countDown
     * @fires Numbas.Exam#event:alert
     */
    countDown: function() {
        var t = new Date();
        this.timeSpent = this.stopwatch.oldTimeSpent + (t - this.stopwatch.start)/1000;
        if(this.settings.duration > 0) {
            this.timeRemaining = Math.ceil((this.stopwatch.end - t)/1000);
            this.display && this.display.showTiming();
            this.events.trigger('showTiming');
            let e;
            if(this.settings.duration > 300 && this.timeRemaining<300 && !this.showedTimeWarning) {
                this.showedTimeWarning = true;
                e = this.settings.timerEvents['timedwarning'];
                if(e && e.action=='warn') {
                    this.display && this.display.root_element.showAlert(e.message);
                    this.events.trigger('alert', e.message);
                }
            } else if(this.timeRemaining<=0) {
                e = this.settings.timerEvents['timeout'];
                if(e && e.action=='warn') {
                    this.display && this.display.root_element.showAlert(e.message);
                    this.events.trigger('alert', e.message);
                }
                this.end(true);
            }
        }
        this.events.trigger('countDown', this.timeRemaining);
    },
    /** 
     * Stop the stopwatch. 
     *
     * @fires Numbas.Exam#event:endTiming
     */
    endTiming: function() {
        this.inProgress = false;
        clearInterval( this.stopwatch.id );
        this.events.trigger('endTiming');
    },

    /**
     * Get any duration extension from the storage.
     */
    updateDurationExtension: function() {
        if(!this.store) {
            return;
        }
        var data = this.store.getDurationExtension();
        if(data) {
            if(data.disabled) {
                this.changeDuration(0);
                return;
            }
            var extension = 0;
            switch(data.units) {
                case 'minutes':
                    extension = parseFloat(data.amount)*60;
                    break;
                case 'percent':
                    extension = parseFloat(data.amount)/100 * this.settings.initial_duration;
                    break;
            }
            if(!isNaN(extension)) {
                this.changeDuration(this.settings.initial_duration + extension);
            }
        }
    },

    /**
     * Set the duration of the exam.
     *
     * @param {number} duration
     */
    changeDuration: function(duration) {
        var diff = duration - this.settings.duration;
        this.settings.duration = duration;

        if(diff != 0) {
            if( this.settings.duration > 0 ) {
                this.events.trigger('showTiming');
            } else {
                this.events.trigger('hideTiming');
            }
        }

        this.timeRemaining += diff;
        if(this.stopwatch) {
            this.stopwatch.end = new Date(this.stopwatch.end.getTime() + diff*1000);
        }
        this.updateDisplayDuration();
    },

    /**
     * Update the timing display.
     *
     * @fires Numbas.Exam#event:updateDisplayDuration
     */
    updateDisplayDuration: function() {
        var duration = this.settings.duration;
        this.events.trigger('updateDisplayDuration', duration);
        this.display && (duration > 0 ? this.display.showTiming() : this.display.hideTiming());
        this.events.trigger('showTiming');
    },


    /** Recalculate and display the student's total score.
     *
     * @fires Numbas.Exam#event:updateScore
     * @see Numbas.Exam#calculateScore
     */
    updateScore: function()
    {
        this.calculateScore();
        this.display && this.display.showScore();
        this.store && this.store.saveExam(this);
        this.events.trigger('updateScore');
    },

    /** 
     * Calculate the student's score. 
     *
     * @fires Numbas.Exam#event:calculateScore
     */
    calculateScore: function()
    {
        this.score=0;
        switch(this.settings.navigateMode) {
            case 'sequence':
            case 'menu':
                for(let i=0; i<this.questionList.length; i++)
                    this.score += this.questionList[i].score;
                this.percentScore = this.mark>0 ? Math.floor(100*this.score/this.mark) : 0;
                break;

            case 'diagnostic':
                if(this.diagnostic_controller) {
                    this.diagnostic_progress = this.diagnostic_controller.progress();
                    this.diagnostic_feedback = this.diagnostic_controller.feedback();
                    var credit = this.diagnostic_progress.at(-1)?.credit || 0;
                    this.score = credit*this.mark;
                    this.percentScore = Math.floor(100*credit);
                }
                break;
        }
        this.events.trigger('calculateScore');
    },
    /**
     * Call this when student wants to move between questions.
     *
     * Will check move is allowed and if so change question and update display.
     *
     * @param {number} i - Number of the question to move to
     * @fires Numbas.Exam#event:tryChangeQuestion
     * @fires Numbas.Exam#event:showDiagnosticActions
     * @see Numbas.Exam#changeQuestion
     */
    tryChangeQuestion: function(i)
    {
        this.events.trigger('tryChangeQuestion', i);
        switch(this.settings.navigateMode) {
            case 'sequence':
                if( ! (
                       this.mode=='review' 
                    || this.settings.navigateBrowse     // is browse navigation enabled?
                    || (this.questionList[i].visited && this.settings.navigateReverse)    // if not, we can still move backwards to questions already seen if reverse navigation is enabled
                    || (i>this.currentQuestion.number && this.questionList[i-1].visited)    // or you can always move to the next question
                )) {
                    return;
                }
                break;
        }

        var exam = this;
        /** Change the question.
         */
        function go() {
            switch(exam.settings.navigateMode) {
                case 'diagnostic':
                    var res = exam.diagnostic_actions();
                    if(res.actions.length==1) {
                        exam.do_diagnostic_action(res.actions[0]);
                    } else if(res.actions.length==0) {
                        exam.end(true);
                    } else {
                        exam.display && exam.display.showDiagnosticActions();
                        exam.events.trigger('showDiagnosticActions');
                    }
                    break;
                default:
                    if(i<0 || i>=exam.settings.numQuestions) {
                        return;
                    }
                    exam.changeQuestion(i);
                    exam.display && exam.display.showQuestion();
                    exam.events.trigger('showQuestion');
            }
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
        } else if(this.mode=='review' || currentQuestion.answered || currentQuestion.revealed || currentQuestion.marks==0) {
            go();
        } else {
            var eventObj = this.settings.navigationEvents.onleave;
            switch( eventObj.action ) {
                case 'none':
                    go();
                    break;
                case 'warnifunattempted':
                    if(this.display) {
                        this.display.root_element.showConfirm(eventObj.message+'<p>'+R('control.proceed anyway')+'</p>', go);
                    } else {
                        go();
                    }
                    break;
                case 'preventifunattempted':
                    this.display && this.display.root_element.showAlert(eventObj.message);
                    this.events.trigger('alert', eventObj.message);
                    break;
            }
        }
    },
    /**
     * Change the current question. Student's can't trigger this without going through {@link Numbas.Exam#tryChangeQuestion}.
     *
     * @param {number} i - Number of the question to move to
     * @fires Numbas.Exam#event:changeQuestion
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
        this.events.trigger('changeQuestion', i);
        this.store && this.store.changeQuestion(this.currentQuestion);
    },
    /**
     * Show a question in review mode.
     *
     * @param {number} i - Number of the question to show
     * @fires Numbas.Exam#event:reviewQuestion
     */
    reviewQuestion: function(i) {
        this.changeQuestion(i);
        this.display && this.display.showQuestion();
        this.events.trigger('reviewQuestion', i);
    },
    /**
     * Regenerate the current question.
     *
     * @fires Numbas.Exam#event:startRegen
     * @fires Numbas.Exam#event:endRegen
     * @listens Numbas.Question#ready
     * @listens Numbas.Question#mainHTMLAttached
     * @returns {Promise} - Resolves when the new question is ready.
     */
    regenQuestion: function() {
        var e = this;
        var oq = e.currentQuestion;
        var n = oq.number;
        var group = oq.group
        var n_in_group = group.questionList.indexOf(oq);
        e.events.trigger('startRegen');
        e.display && e.display.startRegen();
        var q;
        if(this.xml) {
            q = Numbas.createQuestionFromXML(oq.originalXML, oq.number, e, oq.group, e.scope, e.store);
        } else if(this.json) {
            q = Numbas.createQuestionFromJSON(oq.json, oq.number, e, oq.group, e.scope, e.store);
        }
        q.generateVariables();
        q.signals.on(['ready', 'mainHTMLAttached'], function() {
            e.currentQuestion.display.init();
            if(e.display) {
                e.display.showQuestion();
                e.events.trigger('showQuestion');
                e.display.endRegen();
            }
        });
        return q.signals.on('ready', function() {
            e.questionList[n] = group.questionList[n_in_group] = q;
            e.changeQuestion(n);
            e.updateScore();
            e.events.trigger('endRegen', oq, q);
        });
    },
    /**
     * Try to end the exam - shows confirmation dialog, and checks that all answers have been submitted.
     *
     * @fires Numbas.Exam#event:tryEnd
     * @see Numbas.Exam#end
     */
    tryEnd: function() {
        this.events.trigger('tryEnd');
        var exam = this;
        var message = R('control.confirm end');
        var answeredAll = true;
        var submittedAll = true;
        for(let i=0;i<this.questionList.length;i++) {
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
        if(this.display) {
            if (exam.settings.typeendtoleave) {
                this.display.root_element.showConfirmEndExam(
                    message,
                    function() {
                        exam.end(true);
                    }
                );
            }
            else {
                this.display.root_element.showConfirm(
                    message,
                    function() {
                        exam.end(true);
                    }
                );
            }
        } else {
            exam.end(true);
        }
    },
    /**
     * End the exam. The student can't directly trigger this without going through {@link Numbas.Exam#tryEnd}.
     *
     * @param {boolean} save - should the end time be saved? See {@link Numbas.storage.BlankStorage#end}
     * @fires Numbas.Exam#event:end
     * @fires Numbas.Exam#event:showInfoPage
     */
    end: function(save) {
        this.mode = 'review';
        switch(this.settings.navigateMode) {
            case 'diagnostic':
                if(save) {
                    this.diagnostic_controller.after_exam_ended();
                }
                this.feedbackMessage = this.diagnostic_controller.feedback();
                break;
            default:
                //work out summary info
                this.passed = (this.percentScore >= this.settings.percentPass*100);
                this.result = R(this.passed ? 'exam.passed' :'exam.failed')
                var percentScore = this.mark >0 ? 100*this.score/this.mark : 0;
                this.feedbackMessage = null;
                for(let i=0;i<this.feedbackMessages.length;i++) {
                    if(percentScore>=this.feedbackMessages[i].threshold) {
                        this.feedbackMessage = this.feedbackMessages[i].message;
                    } else {
                        break;
                    }
                }
        }
        if(save) {
            //get time of finish
            this.setEndTime(new Date());
            //stop the stopwatch
            this.endTiming();
            //send result to LMS, and tell it we're finished
            this.store && this.store.end();
        }
        this.display && this.display.end();

        //display the results

        var revealAnswers = this.settings.enterReviewModeImmediately || (this.entry == 'review' && this.store.reviewModeAllowed()) || Numbas.is_instructor;

        for(let i=0;i<this.questionList.length;i++) {
            this.questionList[i].lock();
        }

        if(revealAnswers) {
            this.revealAnswers();
        }

        this.events.trigger('end', save);
        this.showInfoPage('result');
    },
    /** Reveal the answers to every question in the exam.
     *
     * @fires Numbas.Exam#event:revealAnswers
     */
    revealAnswers: function() {
        this.revealed = true;
        for(let i=0;i<this.questionList.length;i++) {
            this.questionList[i].revealAnswer(true);
        }
        this.events.trigger('revealAnswers');
        this.display && this.display.revealAnswers();
    },

    /** Get the prompt text and list of action options when the student asks to move on.
     *
     * @returns {object}
     */
    diagnostic_actions: function() {
        return this.diagnostic_controller.next_actions();
    },

    do_diagnostic_action: function(action) {
        this.diagnostic_controller.state = action.state;
        this.next_diagnostic_question(action.next_topic);
    },

    /** Show the next question, drawn from the given topic.
     *
     * @param {object} data
     * @fires Numbas.Exam#event:initQuestion
     * @fires Numbas.Exam#event:showQuestion
     */
    next_diagnostic_question: function(data) {
        if(data === null){
            this.end(true);
            return;
        }
        var topic_name = data.topic;
        var question_number = data.number;
        var exam = this;
        if(topic_name===null) {
            this.end(true);
        } else {
            var group = this.question_groups.find(function(g) { return g.settings.name==topic_name; });
            var question = group.createQuestion(question_number);
            question.signals.on(['ready']).then(function() {
                if(exam.store) {
                    exam.store.initQuestion(question);
                }
                exam.changeQuestion(question.number);
                exam.updateScore();
                exam.events.trigger('initQuestion', question);
            }).catch(function(e) {
                Numbas.schedule.halt(e);
            });
            question.signals.on(['ready', 'mainHTMLAttached']).then(function() {
                exam.display && exam.display.showQuestion();
                exam.events.trigger('showQuestion');
            }).catch(function(e) {
                Numbas.schedule.halt(e);
            });
        }
    },
};
/** Represents what should happen when a particular timing or navigation event happens.
 *
 * @class
 * @memberof Numbas
 */
function ExamEvent() {}
ExamEvent.prototype = /** @lends Numbas.ExamEvent.prototype */ {
    /** Name of the event this corresponds to.
     *
     * Navigation events:
     * - `onleave` - The student tries to move to another question without answering the current one.
     *
     * (There used to be more, but now they're all the same one)
     *
     * Timer events:
     * - `timedwarning` - Five minutes until the exam ends.
     * - `timeout` - There's no time left; the exam is over.
     *
     * @memberof Numbas.ExamEvent
     * @instance
     * @type {string}
     */
    type: '',
    /** Action to take when the event happens.
     *
     * Choices for timer events:
     * - `none` - Don't do anything.
     * - `warn` - Show a message.
     *
     * Choices for navigation events:
     * - `none` - just allow the navigation
     * - `warnifunattempted` - Show a warning but allow the student to continue.
     * - `preventifunattempted` - Show a warning but allow the student to continue.
     *
     * @memberof Numbas.ExamEvent
     * @instance
     * @type {string}
     */
    action: 'none',
    /** Message to show the student when the event happens.
     *
     * @memberof Numbas.ExamEvent
     * @instance
     * @type {string}
     */
    message: ''
};
ExamEvent.createFromXML = function(eventNode) {
    var e = new ExamEvent();
    var tryGetAttribute = Numbas.xml.tryGetAttribute;
    tryGetAttribute(e, null, eventNode, ['type', 'action']);
    e.message = Numbas.xml.serializeMessage(eventNode);
    return e;
}
ExamEvent.createFromJSON = function(type, data) {
    var e = new ExamEvent();
    e.type = type;
    if(data) {
        e.action = data.action;
        e.message = data.message;
    }
    return e;
}


/** Represents a group of questions.
 *
 * @class
 * @param {Numbas.Exam} exam - The exam this group belongs to.
 * @param {number} number - The index of this group in the list of groups.
 * @property {Numbas.Exam} exam - The exam this group belongs to.
 * @property {Element} xml - The XML defining the group.
 * @property {object} json - The JSON object defining the group.
 * @property {Array.<number>} questionSubset - The indices of the picked questions, in the order they should appear to the student.
 * @property {Array.<Numbas.Question>} questionList - The questions in this group.
 * @memberof Numbas
 */
function QuestionGroup(exam, number) {
    this.exam = exam;
    this.number = number;
    this.settings = util.copyobj(this.settings);
}
QuestionGroup.prototype = {
    /** Load this question group's settings from the given XML <question_group> node.
     *
     * @param {Element} xml
     */
    loadFromXML: function(xml) {
        this.xml = xml;
        Numbas.xml.tryGetAttribute(this.settings, this.xml, '.', ['name', 'pickingStrategy', 'pickQuestions']);
        this.questionNodes = this.xml.selectNodes('questions/question');
        this.numQuestions = this.questionNodes.length;
    },
    /** Load this question group's settings from the given JSON dictionary.
     *
     * @param {object} data
     */
    loadFromJSON: function(data) {
        this.json = data;
        Numbas.json.tryLoad(data, ['name', 'pickingStrategy', 'pickQuestions'], this.settings);
        if('variable_overrides' in data) {
            for(let i=0;i<data.variable_overrides.length;i++) {
                var vos = data.variable_overrides[i];
                var qd = data.questions[i];
                if('variables' in qd) {
                    vos.forEach(function(vo) {
                        var v = Object.values(qd.variables).find(function(v) { return v.name==vo.name; });
                        if(v) {
                            v.definition = vo.definition;
                        }
                    });
                }
            }
        }
        this.numQuestions = data.questions.length;
    },
    /** Settings for this group.
     *
     * @property {string} name - The group's name.
     * @property {string} pickingStrategy - How to pick the list of questions: 'all-ordered', 'all-shuffled' or 'random-subset'.
     * @property {number} pickQuestions - If `pickingStrategy` is 'random-subset', how many questions to pick.
     */
    settings: {
        name: '',
        pickingStrategy: 'all-ordered',
        pickQuestions: 1
    },
    /** Decide which questions to use and in what order. */
    chooseQuestionSubset: function() {
        switch(this.settings.pickingStrategy) {
            case 'all-ordered':
                this.questionSubset = Numbas.math.range(this.numQuestions);
                break;
            case 'all-shuffled':
                this.questionSubset = Numbas.math.deal(this.numQuestions);
                break;
            case 'random-subset':
                this.questionSubset = Numbas.math.deal(this.numQuestions).slice(0, this.settings.pickQuestions);
                break;
        }
    },
    /**
     * Create a question in this group.
     *
     * @param {number} n - The index of the question in the definitions.
     * @param {boolean} loading - Is the question being resumed?
     * @fires Numbas.Exam#event:createQuestion
     * @returns {Numbas.Question} question
     */
    createQuestion: function(n, loading) {
        var exam = this.exam;
        var question;
        if(this.xml) {
            question = Numbas.createQuestionFromXML(this.questionNodes[n], exam.questionAcc++, exam, this, exam.scope, exam.store, loading);
        } else if(this.json) {
            question = Numbas.createQuestionFromJSON(this.json.questions[n], exam.questionAcc++, exam, this, exam.scope, exam.store, loading);
        }
        question.number_in_group = n;
        if(loading) {
            question.resume();
        } else {
            question.generateVariables();
            question.signals.on('finalisedLoad', function() {
                question.signals.trigger('ready');
            });
        }
        exam.questionList.push(question);
        this.questionList.push(question);
        exam.display && exam.display.addQuestion(question);
        exam.events.trigger('createQuestion', question);
        return question;
    }
}
});
