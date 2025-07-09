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
/** @file Provides a storage API {@link Numbas.storage.SCORMStorage} which interfaces with SCORM */
Numbas.queueScript('scorm-storage', ['base', 'util', 'SCORM_API_wrapper', 'storage', 'jme-display'], function() {
var scorm = Numbas.storage.scorm = {};
/** SCORM storage object - controls saving and loading of data from the LMS.
 *
 * @class
 * @memberof Numbas.storage
 */
class SCORMStorage extends Numbas.storage.Storage {
    constructor() {
        super();

        if(pipwerks.SCORM.init()) {
           Numbas.storage.lmsConnected = true;
        } else {
            var errorCode = pipwerks.SCORM.debug.getCode();
            if(errorCode) {
                throw(new Numbas.Error(R('scorm.error initialising', {message: pipwerks.SCORM.debug.getInfo(errorCode)})));
            }
            //if the pretend LMS extension is loaded, we can start that up
            if(Numbas.storage.PretendLMS) {
                if(!Numbas.storage.lms) {
                    Numbas.storage.lms = new Numbas.storage.PretendLMS();
                }
                window.API_1484_11 = Numbas.storage.lms.API;
                pipwerks.SCORM.API.handle = window.API_1484_11;
                pipwerks.SCORM.API.isFound = true;
                pipwerks.SCORM.version = '2004';
                pipwerks.SCORM.init();
            } else {
            //otherwise return a blank storage object which does nothing
                return new Numbas.storage.Storage();
            }
        }
        this.getEntry();
        //get all question-objective indices
        this.questionIndices = {};
        var numObjectives = parseInt(this.get('cmi.objectives._count'), 10);
        for(let i = 0;i < numObjectives;i++) {
            const id = this.get('cmi.objectives.' + i + '.id');
            this.questionIndices[id] = i;
        }
        //get part-interaction indices
        this.partIndices = {};
        var numInteractions = parseInt(this.get('cmi.interactions._count'), 10);
        for(let i = 0;i < numInteractions;i++) {
            const id = this.get('cmi.interactions.' + i + '.id');
            this.partIndices[id] = i;
        }
        Numbas.is_instructor = this.get('numbas.user_role') == 'instructor';
    }

    /** Mode the session started in:
     *
     * - `ab-initio` - starting a new attempt;
     * - `resume` - loaded attempt in progress.
     */
    mode = 'ab-initio';

    /** Indicates whether a true SCORM connection to an LMS exists.
     *
     * @type {boolean}
     */
    lmsConnected = true;

    /** Reference to the {@link Numbas.Exam} object for the current exam.
     *
     * @type {Numbas.Exam}
     */
    exam = undefined;

    /** Dictionary mapping question ids (of the form `qN`) to `cmi.objective` indices.
     *
     * @type {{[key:string]: number}}
     */
    questionIndices = {};

    /** Dictionary mapping {@link Numbas.parts.partpath} ids to `cmi.interaction` indices.
     *
     * @type {{[key:string]: number}}
     */
    partIndices = {};

    /** The last `cmi.suspend_data` object.
     *
     * @type {Numbas.storage.exam_suspend_data}
     */
    suspendData = undefined;

    /** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server. */
    save() {
        var exam = this.exam;
        /** Try to save. Display a "saving" message, then call `SCORM.save()`. If it succeeds, hide the message, else wait and try again.
         */
        function trySave() {
            exam.display && exam.display.saving(true);
            var saved = pipwerks.SCORM.save();
            if(!saved) {
                exam.display.root_element.showAlert(R('scorm.failed save'), function() {
                    setTimeout(trySave, 1);
                });
            } else {
                exam.display && exam.display.saving(false);
            }
        }
        trySave();
    }

    /** Set a SCORM data model element.
     *
     * @param {string} key - Element name. This is prepended with `cmi.`.
     * @param {string} value - Element value.
     * @returns {boolean} - Did the call succeed?
     */
    set(key, value) {
        var val = pipwerks.SCORM.set(key, value);
        return val;
    }

    /** Get a SCORM data model element.
     *
     * @param {string} key - Element name. This is prepended with `cmi.`.
     * @returns {string} - The value of the element.
     */
    get(key) {
        var val = pipwerks.SCORM.get(key);
        return val;
    }

    /** Make an id string corresponding to a question, of the form `qN`, where `N` is the question's number.
     *
     * @param {Numbas.Question} question
     * @returns {string}
     */
    getQuestionId(question) {
        return 'q' + question.number;
    }

    /** Make an id string corresponding to a part, of the form `qNpXgYsZ`.
     *
     * @param {Numbas.parts.Part} part
     * @returns {string}
     */
    getPartId(part) {
        return this.getQuestionId(part.question) + part.path;
    }

    /** Load student's name and ID.
     */
    get_student_name() {
        if(this.exam) {
            this.exam.student_name = this.get('cmi.learner_name');
            this.exam.student_id = this.get('cmi.learner_id');
        }
    }

    /** Get the initial seed value.
     *
     * @returns {string}
     */
    get_initial_seed() {
        return this.get('numbas.initial_seed');
    }

    listen_messages() {
        var sc = this;
        this.receive_window_message = function(ev) {
            var data = ev.data;
            try {
                var change = data['numbas change'];
                switch(change) {
                    case 'exam duration extension':
                        sc.exam.updateDurationExtension();
                        break;
                }
            } catch {
            }
        }
        window.addEventListener('message', this.receive_window_message);
    }

    /** Initialise the SCORM data model and this storage object.
     *
     * @param {Numbas.Exam} exam
     */
    init(exam) {
        this.exam = exam;
        this.listen_messages();
        this.get_student_name();
        this.set('cmi.completion_status', 'incomplete');
        this.set('cmi.exit', 'suspend');
        this.set('cmi.progress_measure', 0);
        this.set('cmi.session_time', 'PT0H0M0S');
        this.set('cmi.success_status', 'unknown');
        this.set('cmi.score.scaled', 0);
        this.set('cmi.score.raw', 0);
        this.set('cmi.score.min', 0);
        this.questionIndices = {};
        this.partIndices = {};
    }

    init_questions() {
        for(let i = 0; i < this.exam.settings.numQuestions; i++) {
            this.initQuestion(this.exam.questionList[i]);
        }
        this.setSuspendData();
        this.set('cmi.score.max', this.exam.mark);
    }

    /** Initialise a question - make an objective for it, and initialise all its parts.
     *
     * @param {Numbas.Question} q
     */
    initQuestion(q) {
        var id = this.getQuestionId(q);
        if(this.questionIndices[id] === undefined) {
            var index = this.get('cmi.objectives._count');
            this.questionIndices[id] = index;
        }
        var prepath = 'cmi.objectives.' + this.questionIndices[id] + '.';
        this.set(prepath + 'id', id);
        this.set(prepath + 'score.min', 0);
        this.set(prepath + 'score.max', q.marks);
        this.set(prepath + 'score.raw', q.score || 0);
        this.set(prepath + 'success_status', 'unknown');
        this.set(prepath + 'completion_status', 'not attempted');
        this.set(prepath + 'progress_measure', 0);
        this.set(prepath + 'description', q.name);
        for(let i = 0; i < q.parts.length;i++) {
            this.initPart(q.parts[i]);
        }
    }

    /**
     * Initialise a part - make an interaction for it, and set up correct responses.
     *
     * @param {Numbas.parts.Part} p
     */
    initPart(p) {
        var id = this.getPartId(p);
        if(this.partIndices[id] === undefined) {
            var index = this.get('cmi.interactions._count');
            this.partIndices[id] = index;
        }
        var prepath = this.partPath(p);
        this.set(prepath + 'id', id);
        this.set(prepath + 'objectives.0.id', this.getQuestionId(p.question));
        this.set(prepath + 'weighting', p.marks);
        this.set(prepath + 'result', 0);
        this.set(prepath + 'description', p.type);
        var typeStorage = this.getPartStorage(p);
        if(typeStorage) {
            this.set(prepath + 'type', typeStorage.interaction_type(p));
            var correct_answer = typeStorage.correct_answer(p);
            if(correct_answer !== undefined) {
                this.set(prepath + 'correct_responses.0.pattern', correct_answer);
            }
        }
        if(p.type == 'gapfill') {
            for(let i = 0;i < p.gaps.length;i++) {
                this.initPart(p.gaps[i]);
            }
        }
        for(let i = 0;i < p.steps.length;i++) {
            this.initPart(p.steps[i]);
        }
    }

    /** Save the exam suspend data using the `cmi.suspend_data` string.
     */
    setSuspendData() {
        var eobj = this.examSuspendData();
        if(eobj !== undefined) {
            var estr = JSON.stringify(eobj);
            if(estr != this.get('cmi.suspend_data')) {
                this.set('cmi.suspend_data', estr);
            }
        }
        this.setSessionTime();
        this.suspendData = eobj;
    }

    /** Get the suspend data from the SCORM data model.
     *
     * @returns {Numbas.storage.exam_suspend_data}
     */
    getSuspendData() {
        try {
            if(!this.suspendData) {
                var suspend_data = this.get('cmi.suspend_data');
                if(suspend_data.length) {
                    this.suspendData = JSON.parse(suspend_data);
                }
            }
            if(!this.suspendData) {
                throw(new Numbas.Error('scorm.no exam suspend data'));
            }
        } catch(e) {
            throw(new Numbas.Error('scorm.error loading suspend data', {message: e.message}));
        }
        return this.suspendData;
    }

    /** Get an externally-set extension to the exam duration.
     *
     * @returns {object}
     */
    getDurationExtension() {
        var duration_extension = this.get('numbas.duration_extension.amount');
        var duration_extension_units = this.get('numbas.duration_extension.units');
        var disable_duration = this.get('numbas.disable_duration') == 'true';
        return {
            disabled: disable_duration,
            amount: duration_extension,
            units: duration_extension_units
        }
    }

    /** Get suspended exam info.
     *
     * @param {Numbas.Exam} exam
     * @returns {Numbas.storage.exam_suspend_data}
     */
    load(exam) {
        this.exam = exam;
        this.listen_messages();
        this.get_student_name();
        var eobj = this.getSuspendData();
        this.set('cmi.exit', 'suspend');
        var currentQuestion = this.get('cmi.location');
        if(currentQuestion.length) {
            currentQuestion = parseInt(currentQuestion, 10);
        } else {
            currentQuestion = undefined;
        }
        var score = parseInt(this.get('cmi.score.raw'), 10);
        return {
            timeRemaining: eobj.timeRemaining || 0,
            timeSpent: eobj.timeSpent || 0,
            duration: eobj.duration || 0,
            questionSubsets: eobj.questionSubsets,
            questionGroupOrder: eobj.questionGroupOrder,
            start: eobj.start,
            stop: eobj.stop,
            score: score,
            currentQuestion: currentQuestion,
            diagnostic: eobj.diagnostic,
            questions: eobj.questions
        };
    }

    /** Get suspended info for a question.
     *
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     */
    loadQuestion(question) {
        try {
            var eobj = this.getSuspendData();
            var qobj = eobj.questions[question.number];
            if(!qobj) {
                throw(new Numbas.Error('scorm.no question suspend data'));
            }
            var id = this.getQuestionId(question);
            var index = this.questionIndices[id];
            var variables = this.loadVariables(qobj.variables, question.scope);
            return {
                name: qobj.name,
                score: parseInt(this.get('cmi.objectives.' + index + '.score.raw') || 0, 10),
                visited: qobj.visited,
                answered: qobj.answered,
                submitted: qobj.submitted,
                adviceDisplayed: qobj.adviceDisplayed,
                revealed: qobj.revealed,
                variables: variables,
                currentPart: qobj.currentPart,
                parts: qobj.parts
            };
        } catch(e) {
            throw(new Numbas.Error('scorm.error loading question', {'number':question.number, message:e.message}));
        }
    }

    /** Get suspended info for a part.
     *
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPart(part) {
        try {
            var eobj = this.getSuspendData();
            var pobj = eobj.questions[part.question.number];
            var re = /(p|g|s)(\d+)/g;
            var m;
            while(m = re.exec(part.path)) {
                var i = parseInt(m[2]);
                switch(m[1]) {
                    case 'p':
                        pobj = pobj.parts[i];
                        break;
                    case 'g':
                        pobj = pobj.gaps[i];
                        break;
                    case 's':
                        pobj = pobj.steps[i];
                        break;
                }
            }
            if(!pobj) {
                throw(new Numbas.Error('scorm.no part suspend data'));
            }
            pobj = Numbas.util.copyobj(pobj);
            var prepath = this.partPath(part);
            var sc = this;
            /** Get a SCORM element for this part's interaction.
             *
             * @param {string} key
             * @returns {string}
             */
            function get(key) {
                return sc.get(prepath + key);
            };
            pobj.answer = get('learner_response');
            var typeStorage = this.getPartStorage(part);
            if(typeStorage) {
                var studentAnswer = typeStorage.load(part, pobj);
                if(studentAnswer !== undefined) {
                    pobj.studentAnswer = studentAnswer;
                }
            }
            var scope = part.getScope();
            /**
             * Load cached pre-submit task results.
             *
             * @param {object} cd
             * @returns {Numbas.parts.pre_submit_cache_result}
             */
            function load_pre_submit_cache(cd) {
                var studentAnswer = scope.evaluate(cd.studentAnswer);
                var results = cd.results.map(function(rd) {
                    var o = {};
                    for(const [k, v] of Object.entries(rd)) {
                        o[k] = scope.evaluate(v);
                    }
                    return o;
                });
                return {
                    exec_path: cd.exec_path,
                    studentAnswer: studentAnswer,
                    results: results
                }
            }
            if(Numbas.load_pre_submit_cache !== false) {
                pobj.pre_submit_cache = (pobj.pre_submit_cache || []).map(load_pre_submit_cache);
            } else {
                pobj.pre_submit_cache = []
            }
            pobj.alternatives = (pobj.alternatives || []).map(function(aobj) {
                return {
                    pre_submit_cache: (aobj.pre_submit_cache || []).map(load_pre_submit_cache)
                };
            });
            pobj.stagedAnswer = undefined;
            var stagedAnswerString = get('staged_answer');
            if(stagedAnswerString != '') {
                try {
                    pobj.stagedAnswer = JSON.parse(stagedAnswerString);
                } catch {
                }
            }
            return pobj;
        } catch(e) {
            throw(new Numbas.Error('scorm.error loading part', {part:part.name, message:e.message}));
        }
    }

    /** Record duration of the current session.
     */
    setSessionTime() {
        var timeSpent = this.exam.timeSpent;
        var seconds = Math.floor(timeSpent % 60);
        var minutes = Math.floor(timeSpent / 60) % 60;
        var hours = Math.floor(timeSpent / 60 / 60);

        var sessionTime = 'PT' + hours + 'H' + minutes + 'M' + seconds + 'S';
        this.set('cmi.session_time', sessionTime);
    }

    /** Call this when the exam is started (when {@link Numbas.Exam#begin} runs, not when the page loads). */
    start() {
        this.set('cmi.completion_status', 'incomplete');
    }

    /** Call this when the exam is paused.
     *
     * @see Numbas.Exam#pause
     */
    pause() {
        this.setSuspendData();
    }

    /** Call this when the exam is resumed.
     *
     * @see Numbas.Exam#resume
     */
    resume() {}

    /** Call this when the exam ends.
     *
     * @see Numbas.Exam#end
     */
    end() {
        this.setSessionTime();
        this.setSuspendData();
        this.set('cmi.success_status', this.exam.passed ? 'passed' : 'failed');
        this.set('cmi.completion_status', 'completed');
        pipwerks.SCORM.quit();
    }

    /** Get the student's ID.
     *
     * @returns {string}
     */
    getStudentID() {
        var id = this.get('cmi.learner_id');
        return id || null;
    }

    /** Get entry state: `ab-initio`, or `resume`.
     *
     * @returns {string}
     */
    getEntry() {
        return this.get('cmi.entry');
    }

    /** Get viewing mode:
     *
     * - `browse` - see exam info, not questions;
     * - `normal` - sit exam;
     * - `review` - look at completed exam.
     *
     * @returns {string}
     */
    getMode() {
        return this.get('cmi.mode');
    }

    /** Is review mode allowed?
     *
     * @returns {boolean}
     */
    reviewModeAllowed() {
        var allowed = this.get('numbas.review_allowed');
        return allowed !== 'false';
    }

    /** Call this when the student moves to a different question.
     *
     * @param {Numbas.Question} question
     */
    changeQuestion(question) {
        this.set('cmi.location', question.number);    //set bookmark
        this.setSuspendData();    //because currentQuestion.visited has changed
    }

    /** The 'interactions.N.' prefix for the given part's datamodel elements.
     *
     * @param {Numbas.parts.Part} part
     * @returns {string}
     */
    partPath(part) {
        var id = this.getPartId(part);
        var index = this.partIndices[id];
        if(index !== undefined) {
            return 'cmi.interactions.' + index + '.';
        }
        return undefined;
    }

    /** Call this when a part is answered.
     *
     * @param {Numbas.parts.Part} part
     */
    partAnswered(part) {
        this.storeStagedAnswer(part);
        var prepath = this.partPath(part);
        this.set(prepath + 'result', part.score);
        if(part.answered) {
            var typeStorage = this.getPartStorage(part);
            if(typeStorage) {
                var answer = typeStorage.student_answer(part, this);
                if(answer !== undefined) {
                    this.set(prepath + 'learner_response', answer + '');
                }
            }
        } else {
            this.set(prepath + 'learner_response', '');
        }
        this.setSuspendData();
    }

    /** Save the staged answer for a part.
     * Note: this is not part of the SCORM standard, so can't rely on this being saved.
     *
     * @param {Numbas.parts.Part} part
     */
    storeStagedAnswer(part) {
        var prepath = this.partPath(part);
        if(prepath === undefined) {
            return;
        }
        this.set(prepath + 'staged_answer', JSON.stringify(part.stagedAnswer));
    }

    /** Save exam-level details.
     *
     * @param {Numbas.Exam} exam
     */
    saveExam(exam) {
        if(exam.loading) {
            return;
        }
        //update total exam score and so on
        this.set('cmi.score.raw', exam.score);
        this.set('cmi.score.scaled', (exam.mark > 0 ? exam.score / exam.mark : 0) || 0);
    }

    /** Save details about a question - save score and success status.
     *
     * @param {Numbas.Question} question
     */
    saveQuestion(question) {
        if(question.exam.loading) {
            return;
        }
        var id = this.getQuestionId(question);
        if(!(id in this.questionIndices)) {
            return;
        }
        var index = this.questionIndices[id];
        var prepath = 'cmi.objectives.' + index + '.';
        this.set(prepath + 'score.raw', question.score);
        this.set(prepath + 'score.scaled', (question.marks > 0 ? question.score / question.marks : 0) || 0);
        this.set(prepath + 'success_status', question.score == question.marks ? 'passed' : 'failed');
        this.set(prepath + 'completion_status', question.answered ? 'completed' : 'incomplete');
        this.setSuspendData();
    }

    /** Record that a question has been submitted.
     *
     * @param {Numbas.Question} question
     */
    questionSubmitted(question) {
        this.save();
    }

    /** Record that the student displayed question advice.
     *
     * @param {Numbas.Question} question
     */
    adviceDisplayed(question) {
        this.setSuspendData();
    }

    /** Record that the student revealed the answers to a question.
     *
     * @param {Numbas.Question} question
     */
    answerRevealed(question) {
        this.setSuspendData();
        this.save();
    }

    /** Record that the student showed the steps for a part.
     *
     * @param {Numbas.parts.Part} part
     */
    stepsShown(part) {
        this.setSuspendData();
        this.save();
    }

    /** Record that the student hid the steps for a part.
     *
     * @param {Numbas.parts.Part} part
     */
    stepsHidden(part) {
        this.setSuspendData();
        this.save();
    }
};

scorm.SCORMStorage = SCORMStorage;

});
