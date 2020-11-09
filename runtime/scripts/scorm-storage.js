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
Numbas.queueScript('scorm-storage',['base','util','SCORM_API_wrapper','storage'],function() {
var scorm = Numbas.storage.scorm = {};
/** SCORM storage object - controls saving and loading of data from the LMS.
 *
 * @class
 * @memberof Numbas.storage
 * @augments Numbas.storage.BlankStorage
 */
var SCORMStorage = scorm.SCORMStorage = function()
{
    if(pipwerks.SCORM.init()){
       Numbas.storage.lmsConnected = true;
    }
    else
    {
        var errorCode = pipwerks.SCORM.debug.getCode();
        if(errorCode) {
            throw(new Numbas.Error(R('scorm.error initialising',{message: pipwerks.SCORM.debug.getInfo(errorCode)})));
        }
        //if the pretend LMS extension is loaded, we can start that up
        if(Numbas.storage.PretendLMS)
        {
            if(!Numbas.storage.lms)
            {
                Numbas.storage.lms = new Numbas.storage.PretendLMS();
            }
            window.API_1484_11 = Numbas.storage.lms.API;
            pipwerks.SCORM.init();
        }
        //otherwise return a blank storage object which does nothing
        else
        {
            return new Numbas.storage.BlankStorage();
        }
    }
    this.getEntry();
    //get all question-objective indices
    this.questionIndices = {};
    var numObjectives = parseInt(this.get('objectives._count'),10);
    for(var i=0;i<numObjectives;i++)
    {
        var id = this.get('objectives.'+i+'.id');
        this.questionIndices[id]=i;
    }
    //get part-interaction indices
    this.partIndices = {};
    var numInteractions = parseInt(this.get('interactions._count'),10);
    for(var i=0;i<numInteractions;i++)
    {
        var id = this.get('interactions.'+i+'.id');
        this.partIndices[id]=i;
    }
    Numbas.is_instructor = pipwerks.SCORM.get('numbas.user_role') == 'instructor';
};
SCORMStorage.prototype = /** @lends Numbas.storage.SCORMStorage.prototype */ {
    /** Mode the session started in:
     *
     * * `ab-initio` - starting a new attempt;
     * * `resume` - loaded attempt in progress.
     */
    mode: 'ab-initio',

    /** Indicates whether a true SCORM connection to an LMS exists. 
     *
     * @type {boolean}
     */
    lmsConnected: false,

    /** Reference to the {@link Numbas.Exam} object for the current exam. 
     *
     * @type {Numbas.Exam}
     */
    exam: undefined,

    /** Dictionary mapping question ids (of the form `qN`) to `cmi.objective` indices. 
     *
     * @type {object.<number>}
     */
    questionIndices:{},

    /** Dictionary mapping {@link Numbas.parts.partpath} ids to `cmi.interaction` indices. 
     *
     * @type {object.<number>}
     */
    partIndices:{},

    /** The last `cmi.suspend_data` object.
     *
     * @type {Numbas.storage.exam_suspend_data}
     */
    suspendData: undefined,

    /** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server. */
    save: function()
    {
        var exam = this.exam;
        /** Try to save. Display a "saving" message, then call `SCORM.save()`. If it succeeds, hide the message, else wait and try again.
         */
        function trySave() {
            exam.display.saving(true);
            var saved = pipwerks.SCORM.save();
            if(!saved) {
                Numbas.display.showAlert(R('scorm.failed save'),function(){
                    setTimeout(trySave,1);
                });
            }
            else
                exam.display.saving(false);
        }
        trySave();
    },
    /** Set a SCORM data model element.
     *
     * @param {string} key - Element name. This is prepended with `cmi.`.
     * @param {string} value - Element value.
     * @returns {boolean} - Did the call succeed?
     */
    set: function(key,value)
    {
        var val = pipwerks.SCORM.set('cmi.'+key,value);
        return val;
    },
    /** Get a SCORM data model element.
     *
     * @param {string} key - Element name. This is prepended with `cmi.`.
     * @returns {string} - The value of the element.
     */
    get: function(key)
    {
        var val = pipwerks.SCORM.get('cmi.'+key);
        return val;
    },
    /** Make an id string corresponding to a question, of the form `qN`, where `N` is the question's number.
     *
     * @param {Numbas.Question} question
     * @returns {string}
     */
    getQuestionId: function(question)
    {
        return 'q'+question.number;
    },
    /** Make an id string corresponding to a part, of the form `qNpXgYsZ`.
     *
     * @param {Numbas.parts.Part} part
     * @returns {string}
     */
    getPartId: function(part)
    {
        return this.getQuestionId(part.question)+part.path;
    },
    /** Load student's name and ID.
     */
    get_student_name: function() {
        this.exam.student_name = this.get('learner_name');
        this.exam.student_id = this.get('learner_id');
    },
    /** Initialise the SCORM data model and this storage object.
     *
     * @param {Numbas.Exam} exam
     */
    init: function(exam)
    {
        this.exam = exam;
        this.get_student_name();
        var set = this.set;
        this.set('completion_status','incomplete');
        this.set('exit','suspend');
        this.set('progress_measure',0);
        this.set('session_time','PT0H0M0S');
        this.set('success_status','unknown');
        this.set('score.scaled',0);
        this.set('score.raw',0);
        this.set('score.min',0);
        this.set('score.max',exam.mark);
        this.questionIndices = {};
        this.partIndices = {};
        for(var i=0; i<exam.settings.numQuestions; i++)
        {
            this.initQuestion(exam.questionList[i]);
        }
        this.setSuspendData();
    },
    /** Initialise a question - make an objective for it, and initialise all its parts.
     *
     * @param {Numbas.Question} q
     */
    initQuestion: function(q)
    {
        var id = this.getQuestionId(q);
        if(this.questionIndices[id]===undefined) {
            var index = this.get('objectives._count');
            this.questionIndices[id] = index;
        }
        var prepath = 'objectives.'+this.questionIndices[id]+'.';
        this.set(prepath+'id', id);
        this.set(prepath+'score.min',0);
        this.set(prepath+'score.max',q.marks);
        this.set(prepath+'score.raw',q.score || 0);
        this.set(prepath+'success_status','unknown');
        this.set(prepath+'completion_status','not attempted');
        this.set(prepath+'progress_measure',0);
        this.set(prepath+'description',q.name);
        for(var i=0; i<q.parts.length;i++)
        {
            this.initPart(q.parts[i]);
        }
    },
    /** Get the relevant part storage methods for the given part.
     *
     * @param {Numbas.parts.Part} p
     * @returns {Numbas.storage.scorm.partTypeStorage}
     */
    getPartStorage: function(p) {
        if(p.is_custom_part_type) {
            return scorm.partTypeStorage['custom'];
        } else {
            return scorm.partTypeStorage[p.type];
        }
    },
    /**
     * Initialise a part - make an interaction for it, and set up correct responses.
     *
     * @param {Numbas.parts.Part} p
     */
    initPart: function(p)
    {
        var id = this.getPartId(p);
        if(this.partIndices[id]===undefined) {
            var index = this.get('interactions._count');
            this.partIndices[id] = index;
        }
        var prepath = this.partPath(p);
        this.set(prepath+'id',id);
        this.set(prepath+'objectives.0.id',this.getQuestionId(p.question));
        this.set(prepath+'weighting',p.marks);
        this.set(prepath+'result',0);
        this.set(prepath+'description',p.type);
        var typeStorage = this.getPartStorage(p);
        if(typeStorage) {
            this.set(prepath+'type', typeStorage.interaction_type(p));
            var correct_answer = typeStorage.correct_answer(p);
            if(correct_answer!==undefined) {
                this.set(prepath+'correct_responses.0.pattern', correct_answer);
            }
        }
        if(p.type=='gapfill') {
            for(var i=0;i<p.gaps.length;i++) {
                this.initPart(p.gaps[i]);
            }
        }
        for(var i=0;i<p.steps.length;i++) {
            this.initPart(p.steps[i]);
        }
    },
    /** Suspend data for the exam - all the other stuff that doesn't fit into the standard SCORM data model.
     *
     * @returns {object}
     */
    examSuspendData: function() {
        var exam = this.exam;
        if(exam.loading)
            return;
        var eobj =
        {
            timeRemaining: exam.timeRemaining || 0,
            timeSpent: exam.timeSpent || 0,
            duration: exam.settings.duration || 0,
            questionSubsets: exam.question_groups.map(function(g){ return g.questionSubset }),
            questionGroupOrder: exam.questionGroupOrder,
            start: exam.start-0,
            stop: exam.stop ? exam.stop-0 : null,
            randomSeed: exam && exam.seed
        };
        eobj.questions = [];
        for(var i=0;i<exam.settings.numQuestions;i++)
        {
            eobj.questions.push(this.questionSuspendData(exam.questionList[i]));
        }
        return eobj;
    },
    /** Save the exam suspend data using the `cmi.suspend_data` string.
     */
    setSuspendData: function()
    {
        var eobj = this.examSuspendData();
        if(eobj!==undefined) {
            var estr = JSON.stringify(eobj);
            if(estr!=this.get('suspend_data')) {
                this.set('suspend_data',estr);
            }
        }
        this.setSessionTime();
        this.suspendData = eobj;
    },

    /** Create suspend data object for a dictionary of JME variables.
     *
     * @param {object.<Numbas.jme.token>} variables
     * @returns {object.<JME>}
     * @see Numbas.storage.SCORMStorage#setSuspendData
     */
    variablesSuspendData: function(variables) {
        var vobj = {};
        for(var name in variables) {
            vobj[name] = Numbas.jme.display.treeToJME({tok: variables[name]},{niceNumber:false, wrapexpressions: true})
        }
        return vobj;
    },

    /** Create suspend data object for a question.
     *
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     * @see Numbas.storage.SCORMStorage#setSuspendData
     */
    questionSuspendData: function(question) {
        var qobj =
        {
            name: question.name,
            visited: question.visited,
            answered: question.answered,
            submitted: question.submitted,
            adviceDisplayed: question.adviceDisplayed,
            revealed: question.revealed
        };
        qobj.variables = {};
        if(question.partsMode=='explore') {
            qobj.currentPart = question.currentPart.path;
        }
        question.local_definitions.variables.forEach(function(names) {
            names.split(',').forEach(function(name) {
                var value = question.scope.getVariable(name);
                qobj.variables[name] = Numbas.jme.display.treeToJME({tok: value},{niceNumber:false, wrapexpressions: true});
            });
        });
        qobj.parts = [];
        for(var i=0;i<question.parts.length;i++) {
            qobj.parts.push(this.partSuspendData(question.parts[i]));
        }
        return qobj;
    },
    /** Create suspend data object for a part.
     *
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     * @see Numbas.storage.SCORMStorage#setSuspendData
     */
    partSuspendData: function(part)
    {
        var name_bits = [part.name];
        var par = part.parentPart;
        while(par) {
            name_bits.splice(0,0,par.name);
            par = par.parentPart;
        }
        name_bits.splice(0,0,part.question.name);
        var name = name_bits.join(' ');
        var pobj = {
            answered: part.answered,
            stepsShown: part.stepsShown,
            stepsOpen: part.stepsOpen,
            name: name
        };
        var typeStorage = this.getPartStorage(part);
        if(typeStorage) {
            var data = typeStorage.suspend_data(part, this);
            if(data) {
                pobj = Numbas.util.extend_object(pobj,data);
            }
        }
        pobj.steps = [];
        for(var i=0;i<part.steps.length;i++)
        {
            pobj.steps.push(this.partSuspendData(part.steps[i]));
        }
        pobj.nextParts = [];
        for(var i=0;i<part.nextParts.length;i++) {
            var np = part.nextParts[i];
            pobj.nextParts.push({
                instance: np.instance ? np.instance.path : null,
                variableReplacements: np.instanceVariables ? this.variablesSuspendData(np.instanceVariables) : null,
                index: np.instance ? np.instance.index : null
            });
        }
        return pobj;
    },
    /** Get the suspend data from the SCORM data model.
     *
     * @returns {Numbas.storage.exam_suspend_data}
     */
    getSuspendData: function()
    {
        try {
            if(!this.suspendData)
            {
                var suspend_data = this.get('suspend_data');
                if(suspend_data.length)
                    this.suspendData = JSON.parse(suspend_data);
            }
            if(!this.suspendData) {
                throw(new Numbas.Error('scorm.no exam suspend data'));
            }
        } catch(e) {
            throw(new Numbas.Error('scorm.error loading suspend data',{message: e.message}));
        }
        return this.suspendData;
    },
    /** Get suspended exam info.
     *
     * @param {Numbas.Exam} exam
     * @returns {Numbas.storage.exam_suspend_data}
     */
    load: function(exam)
    {
        this.exam = exam;
        this.get_student_name();
        var eobj = this.getSuspendData();
        this.set('exit','suspend');
        var currentQuestion = this.get('location');
        if(currentQuestion.length)
            currentQuestion=parseInt(currentQuestion,10);
        else
            currentQuestion=undefined;
        var score = parseInt(this.get('score.raw'),10);
        return {
            timeRemaining: eobj.timeRemaining || 0,
            timeSpent: eobj.timeSpent || 0,
            duration: eobj.duration || 0 ,
            questionSubsets: eobj.questionSubsets,
            questionGroupOrder: eobj.questionGroupOrder,
            start: eobj.start,
            stop: eobj.stop,
            score: score,
            currentQuestion: currentQuestion
        };
    },

    /** Load a dictionary of JME variables.
     *
     * @param {object.<JME>} vobj
     * @param {Numbas.jme.Scope} scope
     * @returns {object.<Numbas.jme.token>}
     */
    loadVariables: function(vobj, scope) {
        var variables = {};
        for(var snames in vobj) {
            var v = scope.evaluate(vobj[snames]);
            var names = snames.split(',');
            if(names.length>1) {
                names.forEach(function(name,i) {
                    variables[name] = scope.evaluate('$multi['+i+']',{'$multi':v});
                });
            } else {
                variables[snames] = v;
            }
        }
        return variables;
    },

    /** Get suspended info for a question.
     *
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     */
    loadQuestion: function(question)
    {
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
                score: parseInt(this.get('objectives.'+index+'.score.raw') || 0,10),
                visited: qobj.visited,
                answered: qobj.answered,
                submitted: qobj.submitted,
                adviceDisplayed: qobj.adviceDisplayed,
                revealed: qobj.revealed,
                variables: variables,
                currentPart: qobj.currentPart
            };
        } catch(e) {
            throw(new Numbas.Error('scorm.error loading question',{'number':question.number,message:e.message}));
        }
    },
    /** Get suspended info for a part.
     *
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPart: function(part)
    {
        try {
            var eobj = this.getSuspendData();
            var pobj = eobj.questions[part.question.number];
            var re = /(p|g|s)(\d+)/g;
            while(m = re.exec(part.path))
            {
                var i = parseInt(m[2]);
                switch(m[1])
                {
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
            var prepath = this.partPath(part);
            var sc = this;
            /** Get a SCORM element for this part's interaction.
             *
             * @param {string} key
             * @returns {string}
             */
            function get(key) { return sc.get(prepath+key); };
            pobj.answer = get('learner_response');
            var typeStorage = this.getPartStorage(part);
            if(typeStorage) {
                var studentAnswer = typeStorage.load(part, pobj);
                if(studentAnswer!==undefined) {
                    pobj.studentAnswer = studentAnswer;
                }
            }
            pobj.stagedAnswer = undefined;
            var stagedAnswerString = get('staged_answer');
            if(stagedAnswerString!='') {
                try {
                    pobj.stagedAnswer = JSON.parse(stagedAnswerString);
                } catch(e) {
                }
            }
            return pobj;
        } catch(e) {
            throw(new Numbas.Error('scorm.error loading part',{part:part.name,message:e.message}));
        }
    },

    /** Record duration of the current session.
     */
    setSessionTime: function()
    {
        var timeSpent = new Date(this.exam.timeSpent*1000);
        var sessionTime = 'PT'+timeSpent.getHours()+'H'+timeSpent.getMinutes()+'M'+timeSpent.getSeconds()+'S';
        this.set('session_time',sessionTime);
    },

    /** Call this when the exam is started (when {@link Numbas.Exam#begin} runs, not when the page loads). */
    start: function()
    {
        this.set('completion_status','incomplete');
    },

    /** Call this when the exam is paused.
     *
     * @see Numbas.Exam#pause
     */
    pause: function()
    {
        this.setSuspendData();
    },

    /** Call this when the exam is resumed.
     * 
     * @see Numbas.Exam#resume
     */
    resume: function() {},

    /** Call this when the exam ends.
     *
     * @see Numbas.Exam#end
     */
    end: function()
    {
        this.setSessionTime();
        this.setSuspendData();
        this.set('success_status',this.exam.passed ? 'passed' : 'failed');
        this.set('completion_status','completed');
        pipwerks.SCORM.quit();
    },

    /** Get the student's ID.
     *
     * @returns {string}
     */
    getStudentID: function() {
        var id = this.get('learner_id');
        return id || null;
    },

    /** Get entry state: `ab-initio`, or `resume`.
     *
     * @returns {string}
     */
    getEntry: function()
    {
        return this.get('entry');
    },

    /** Get viewing mode:
     *
     * * `browse` - see exam info, not questions;
     * * `normal` - sit exam;
     * * `review` - look at completed exam.
     *
     * @returns {string}
     */
    getMode: function()
    {
        return this.get('mode');
    },

    /** Call this when the student moves to a different question.
     *
     * @param {Numbas.Question} question
     */
    changeQuestion: function(question)
    {
        this.set('location',question.number);    //set bookmark
        this.setSuspendData();    //because currentQuestion.visited has changed
    },

    /** The 'interactions.N.' prefix for the given part's datamodel elements.
     *
     * @param {Numbas.parts.Part} part
     * @returns {string}
     */
    partPath: function(part) {
        var id = this.getPartId(part);
        var index = this.partIndices[id];
        if(index!==undefined) {
            return 'interactions.'+index+'.';
        }
    },

    /** Call this when a part is answered.
     *
     * @param {Numbas.parts.Part} part
     */
    partAnswered: function(part)
    {
        var sc = this;
        var prepath = this.partPath(part);
        this.set(prepath+'result',part.score);
        if(part.answered) {
            var typeStorage = this.getPartStorage(part);
            if(typeStorage) {
                var answer = typeStorage.student_answer(part,this);
                if(answer!==undefined) {
                    this.set(prepath+'learner_response', answer+'');
                }
            }
        } else {
            this.set(prepath+'learner_response', '');
        }
        this.setSuspendData();
    },
    /** Save the staged answer for a part.
     * Note: this is not part of the SCORM standard, so can't rely on this being saved.
     *
     * @param {Numbas.parts.Part} part
     */
    storeStagedAnswer: function(part) {
        var sc = this;
        var prepath = this.partPath(part);
        if(prepath===undefined) {
            return;
        }
        this.set(prepath+'staged_answer',JSON.stringify(part.stagedAnswer));
    },
    /** Save exam-level details.
     *
     * @param {Numbas.Exam} exam
     */
    saveExam: function(exam)
    {
        if(exam.loading)
            return;
        //update total exam score and so on
        this.set('score.raw',exam.score);
        this.set('score.scaled',(exam.mark > 0 ? exam.score/exam.mark : 0) || 0);
    },
    /** Save details about a question - save score and success status.
     *
     * @param {Numbas.Question} question
     */
    saveQuestion: function(question)
    {
        if(question.exam.loading)
            return;
        var id = this.getQuestionId(question);
        if(!(id in this.questionIndices))
            return;
        var index = this.questionIndices[id];
        var prepath = 'objectives.'+index+'.';
        this.set(prepath+'score.raw',question.score);
        this.set(prepath+'score.scaled',(question.marks > 0 ? question.score/question.marks : 0) || 0);
        this.set(prepath+'success_status', question.score==question.marks ? 'passed' : 'failed' );
        this.set(prepath+'completion_status', question.answered ? 'completed' : 'incomplete' );
        this.setSuspendData();
    },
    /** Record that a question has been submitted.
     *
     * @param {Numbas.Question} question
     */
    questionSubmitted: function(question)
    {
        this.save();
    },
    /** Record that the student displayed question advice.
     *
     * @param {Numbas.Question} question
     */
    adviceDisplayed: function(question)
    {
        this.setSuspendData();
    },
    /** Record that the student revealed the answers to a question.
     *
     * @param {Numbas.Question} question
     */
    answerRevealed: function(question)
    {
        this.setSuspendData();
        this.save();
    },
    /** Record that the student showed the steps for a part.
     *
     * @param {Numbas.parts.Part} part
     */
    stepsShown: function(part)
    {
        this.setSuspendData();
        this.save();
    },
    /** Record that the student hid the steps for a part.
     *
     * @param {Numbas.parts.Part} part
     */
    stepsHidden: function(part)
    {
        this.setSuspendData();
        this.save();
    }
};

/** @typedef {object} Numbas.storage.scorm.partTypeStorage
 * @property {Function} interaction_type(part)
 * @property {Function} correct_answer(part)
 * @property {Function} student_answer(part)
 * @property {Function} suspend_data(part)
 * @property {Function} load(part,data)
 */

scorm.partTypeStorage = {
    'information': {
        interaction_type: function() {return 'other';},
        correct_answer: function() {},
        student_answer: function() {},
        suspend_data: function() {},
        load: function() {}
    },
    'extension': {
        interaction_type: function() {return 'other';},
        correct_answer: function() {},
        student_answer: function() {},
        suspend_data: function(part) {
            return {extension_data: part.createSuspendData()};
        },
        load: function() {}
    },
    '1_n_2': {
        interaction_type: function() {return 'choice';},
        correct_answer: function(part) {
            for(var i=0;i<part.numAnswers;i++) {
                if(part.settings.maxMatrix[i][0]) {
                    return i+'';
                }
            }
        },
        student_answer: function(part) {
            var choices = [];
            for(var i=0;i<part.numAnswers;i++) {
                if(part.ticks[i][0]) {
                    return i+'';
                }
            }
        },
        suspend_data: function(part) {
            return {shuffleAnswers: Numbas.math.inverse(part.shuffleAnswers)};
        },
        load: function(part, data) {
            var ticks = [];
            var tick = parseInt(data.answer,10);
            for(var i=0;i<part.numAnswers;i++) {
                ticks.push([i==tick]);
            }
            return ticks;
        }
    },
    'm_n_2': {
        interaction_type: function(part) {return 'choice';},
        correct_answer: function(part) {
            var good_choices = [];
            for(var i=0;i<part.numAnswers;i++) {
                if(part.settings.maxMatrix[i][0]) {
                    good_choices.push(i);
                }
            }
            return good_choices.join('[,]');
        },
        student_answer: function(part) {
            var choices = [];
            for(var i=0;i<part.numAnswers;i++) {
                if(part.ticks[i][0]) {
                    choices.push(i);
                }
            }
            return choices.join('[,]');
        },
        suspend_data: function(part) {
            return {shuffleAnswers: Numbas.math.inverse(part.shuffleAnswers)};
        },
        load: function(part, data) {
            var ticks = [];
            for(var i=0;i<part.numAnswers;i++) {
                ticks.push([false]);
            }
            data.answer.split('[,]').forEach(function(tickstr) {
                var tick = parseInt(tickstr,10);
                if(!isNaN(tick)) {
                    ticks[tick][0] = true;
                }
            });
            return ticks;
        }
    },
    'm_n_x': {
        interaction_type: function(part) {return 'matching';},
        correct_answer: function(part) {
            var good_choices = [];
            for(var i=0;i<part.settings.maxMatrix.length;i++) {
                for(var j=0;j<part.settings.maxMatrix[i].length;j++) {
                    if(part.settings.maxMatrix[i][j]) {
                        good_choices.push(i+'[.]'+j);
                    }
                }
            }
            return good_choices.join('[,]');
        },
        student_answer: function(part) {
            var choices = [];
            for(var i=0;i<part.numAnswers;i++) {
                for( var j=0;j<part.numChoices;j++ ) {
                    if(part.ticks[i][j]) {
                        choices.push(i+'[.]'+j);
                    }
                }
            }
            return choices.join('[,]');
        },
        suspend_data: function(part) {
            return {
                shuffleAnswers: Numbas.math.inverse(part.shuffleAnswers),
                shuffleChoices: Numbas.math.inverse(part.shuffleChoices)
            };
        },
        load: function(part, data) {
            var ticks = [];
            for(var i=0;i<part.numAnswers;i++) {
                var row = [];
                ticks.push(row);
                for(var j=0;j<part.numChoices;j++) {
                    row.push(false);
                }
            }
            var tick_re=/(\d+)\[\.\](\d+)/;
            var bits = data.answer.split('[,]');
            for(var i=0;i<bits.length;i++) {
                var m = bits[i].match(tick_re);
                if(m) {
                    var x = parseInt(m[1],10);
                    var y = parseInt(m[2],10);
                    ticks[x][y] = true;
                }
            }
            return ticks;
        }
    },
    'numberentry': {
        interaction_type: function(part) {return 'fill-in';},
        correct_answer: function(part) {
            return Numbas.math.niceNumber(part.settings.minvalue)+'[:]'+Numbas.math.niceNumber(part.settings.maxvalue);
        },
        student_answer: function(part) {
            return part.studentAnswer;
        },
        suspend_data: function() {},
        load: function(part, data) { return data.answer || ''; }
    },
    'matrix': {
        interaction_type: function(part) {return 'fill-in';},
        correct_answer: function(part) {
            return '{case_matters=false}'+JSON.stringify(part.settings.correctAnswer);
        },
        student_answer: function(part) {
            return JSON.stringify({
                rows: part.studentAnswerRows,
                columns: part.studentAnswerColumns,
                matrix: part.studentAnswer
            });
        },
        suspend_data: function() {},
        load: function(part, data) {
            if(data.answer) {
                return JSON.parse(data.answer);
            }
        }
    },
    'patternmatch': {
        interaction_type: function(part) {return 'fill-in';},
        correct_answer: function(part) {
            return '{case_matters='+part.settings.caseSensitive+'}'+part.settings.correctAnswer;
        },
        student_answer: function(part) { return part.studentAnswer; },
        suspend_data: function() {},
        load: function(part, data) { return data.answer || ''; }
    },
    'jme': {
        interaction_type: function(part) {return 'fill-in';},
        correct_answer: function(part) {
            return '{case_matters=false}'+part.settings.correctAnswer;
        },
        student_answer: function(part) { return part.studentAnswer; },
        suspend_data: function() {},
        load: function(part, data) { return data.answer || ''; }
    },
    'gapfill': {
        interaction_type: function(part) {return 'other';},
        correct_answer: function(part) {},
        student_answer: function(part) {},
        suspend_data: function(part, store) {
            var gapSuspendData = part.gaps.map(function(gap) {
                return store.partSuspendData(gap);
            });
            return {gaps: gapSuspendData};
        },
        load: function(part) {}
    },
    'custom': {
        interaction_type: function(part) {
            var widget = part.input_widget();
            var storage = scorm.inputWidgetStorage[widget];
            if(storage) {
                return storage.interaction_type(part);
            } else {
                return 'other';
            }
        },
        correct_answer: function(part) {
            var widget = part.input_widget();
            var storage = scorm.inputWidgetStorage[widget];
            if(storage) {
                return storage.correct_answer(part);
            }
        },
        student_answer: function(part) {
            var widget = part.input_widget();
            var storage = scorm.inputWidgetStorage[widget];
            if(storage) {
                return storage.student_answer(part);
            }
        },
        suspend_data: function() {},
        load: function(part, data) {
            var widget = part.input_widget();
            var storage = scorm.inputWidgetStorage[widget];
            if(storage) {
                return storage.load(part,data);
            }
      }
    }
};
scorm.inputWidgetStorage = {
    'string': {
        interaction_type: function(part) { return 'fill-in'; },
        correct_answer: function(part) { return part.input_options().correctAnswer; },
        student_answer: function(part) { return part.studentAnswer; },
        load: function(part, data) { return data.answer; }
    },
    'number': {
        interaction_type: function(part) { return 'fill-in'; },
        correct_answer: function(part) { return Numbas.math.niceNumber(part.input_options().correctAnswer); },
        student_answer: function(part) { return Numbas.math.niceNumber(part.studentAnswer); },
        load: function(part, data) { return Numbas.util.parseNumber(data.answer, part.input_options().allowFractions, part.input_options().allowedNotationStyles); }
    },
    'jme': {
        interaction_type: function(part) { return 'fill-in'; },
        correct_answer: function(part) { return Numbas.jme.display.treeToJME(part.input_options().correctAnswer); },
        student_answer: function(part) { return Numbas.jme.display.treeToJME(part.studentAnswer); },
        load: function(part, data) { return Numbas.jme.compile(data.answer); }
    },
    'matrix': {
        interaction_type: function(part) { return 'fill-in'; },
        correct_answer: function(part) { return JSON.stringify(part.input_options().correctAnswer); },
        student_answer: function(part) { return JSON.stringify(part.studentAnswer); },
        load: function(part, data) {
            try {
                var m = JSON.parse(data.answer);
                m.rows = m.length;
                m.columns = m.length>0 ? m[0].length : 0;
                return m;
            } catch(e) {
                return undefined;
            }
        }
    },
    'radios': {
        interaction_type: function(part) { return 'choice'; },
        correct_answer: function(part) { return part.input_options().correctAnswer+''; },
        student_answer: function(part) { return part.studentAnswer+''; },
        load: function(part, data) { return parseInt(data.answer,10); }
    },
    'checkboxes': {
        interaction_type: function(part) { return 'choice'; },
        correct_answer: function(part) {
            var good_choices = [];
            part.input_options().correctAnswer.forEach(function(c,i) {
                if(c) {
                    good_choices.push(i);
                }
            });
            return good_choices.join('[,]');
        },
        student_answer: function(part) {
            var ticked = [];
            part.studentAnswer.forEach(function(c,i) {
                if(c) {
                    ticked.push(i);
                }
            });
            return ticked.join('[,]');
        },
        load: function(part, data) {
            var ticked = part.input_options().choices.map(function(c){ return false; });
            data.answer.split('[,]').forEach(function(c){ var i = parseInt(c,10); ticked[i] = true; });
            return ticked;
        }
    },
    'dropdown': {
        interaction_type: function(part) { return 'choice'; },
        correct_answer: function(part) { return part.input_options().correctAnswer+''; },
        student_answer: function(part) { return part.studentAnswer+''; },
        load: function(part, data) { return parseInt(data.answer,10); }
    }
}
});
