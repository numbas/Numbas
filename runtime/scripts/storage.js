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
Numbas.queueScript('storage',['base'],function() {
/** @namespace Numbas.storage */
/** @typedef exam_suspend_data
 * @memberof Numbas.storage
 * @property {number} timeRemaining - Seconds until the end of the exam ({@link Numbas.Exam#timeRemaining})
 * @property {number} duration - Length of the exam, in seconds ({@link Numbas.Exam#settings})
 * @property {Array.<Array.<number>>} questionSubsets - The sets of questions in each question group ({@link Numbas.Exam#question_groups})
 * @property {Date} start - The time the exam was started ({@link Numbas.Exam#start})
 * @property {number} score - The student's current score ({@link Numbas.exam#score})
 * @property {number} currentQuestion - The index of the current question ({@link Numbas.Exam#currentQuestionNumber})
 */
/** @typedef question_suspend_data
 * @memberof Numbas.storage
 * @property {string} name - The name of the question ({@link Numbas.Question#name})
 * @property {number} score - The student's score for this question ({@link Numbas.Question#score})
 * @property {boolean} visited - Has the student visited this question yet? ({@link Numbas.Question#visited})
 * @property {boolean} answered - Has the student answered this question? ({@link Numbas.Question#answered})
 * @property {boolean} adviceDisplayed - Has the advice been displayed? ({@link Numbas.Question#adviceDisplayed})
 * @property {boolean} revealed - Have the correct answers been revealed? ({@link Numbas.Question#revealed})
 * @property {Object<JME>} variables - A dictionary of the values of the question variables. ({@link Numbas.Question#scope})
 * @see Numbas.storage.SCORMStorage#loadQuestion
 */
/** @typedef part_suspend_data
 * @memberof Numbas.storage
 * @property {string} answer - student's answer to the part, as encoded for saving
 * @property {boolean} answered - has the student answered this part? ({@link Numbas.parts.Part#answered})
 * @property {boolean} stepsShown - have the steps been shown? ({@link Numbas.parts.Part#stepsShown})
 * @property {boolean} stepsOpen - are the steps currently visible? ({@link Numbas.parts.Part#stepsOpen})
 * @property {Array.<Numbas.storage.part_suspend_data>} gaps - data for gaps, if this is a gapfill part
 * @property {Array.<Numbas.storage.part_suspend_data>} steps - data for steps, if this part has steps
 * @property {string} studentAnswer - student's answer, for {@link Numbas.parts.JMEPart}, {@link Numbas.parts.NumberEntryPart} or {@link Numbas.parts.PatternMatchPart} parts
 * @property {Array.<number>} shuffleChoices - order of choices, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {Array.<number>} shuffleAnswers - order of answers, if this is a {@link Numbas.parts.MultipleResponsePart}
 * @property {Array.<Array.<number>>} ticks - student's choices, for {@link Numbas.parts.MultipleResponsePart} parts
 */

var storage = Numbas.storage = {
    stores: []
};

/** A blank storage object which does nothing.
 *
 * Any real storage object needs to implement all of this object's methods.
 *
 * @memberof Numbas.storage
 * @class
 */
Numbas.storage.BlankStorage = function() {}
Numbas.storage.BlankStorage.prototype = /** @lends Numbas.storage.BlankStorage.prototype */ {
    /** Initialise the SCORM data model and this storage object.
     *
     * @param {Numbas.Exam} exam
     */
    init: function(exam) {
        this.exam = exam;
    },
    /** Initialise a question.
     *
     * @param {Numbas.Question} q
     * @abstract
     */
    initQuestion: function(q) {},
    /**
     * Initialise a part.
     *
     * @param {Numbas.parts.Part} p
     * @abstract
     */
    initPart: function(p) {},
    /** Get an externally-set extension to the exam duration.
     *
     * @abstract
     * @returns {object}
     */
    getDurationExtension: function() {
    },

    /** Get suspended exam info.
     *
     * @abstract
     * @param {Numbas.Exam} exam
     * @returns {Numbas.storage.exam_suspend_data}
     */
    load: function(exam) {},
    /** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server/backing store. 
     *
     * @abstract
     */
    save: function() {
    },
    /** Load student's name and ID.
     *
     * @abstract
     */
    get_student_name: function() {},
    /**
     * Get suspended info for a question.
     *
     * @abstract
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     */
    loadQuestion: function(question) {},
    /** Get suspended info for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPart: function(part) {},
    /** Load a {@link Numbas.parts.JMEPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadJMEPart: function(part) {},
    /** Load a {@link Numbas.parts.PatternMatchPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPatternMatchPart: function(part) {},
    /** Load a {@link Numbas.parts.NumberEntryPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadNumberEntryPart: function(part) {},
    /** Load a {@link Numbas.parts.MatrixEntryPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMatrixEntryPart: function(part) {},
    /** Load a {@link Numbas.parts.MultipleResponsePart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMultipleResponsePart: function(part) {},
    /** Load a {@link Numbas.parts.ExtensionPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadExtensionPart: function(part) {},

    /** Load a dictionary of JME variables.
     *
     * @param {Object<JME>} vobj
     * @param {Numbas.jme.Scope} scope
     * @returns {Object<Numbas.jme.token>}
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


    /** Call this when the exam is started (when {@link Numbas.Exam#begin} runs, not when the page loads).
     *
     * @abstract
     */
    start: function() {},
    /** Call this when the exam is paused ({@link Numbas.Exam#pause}).
     *
     * @abstract
     */
    pause: function() {},
    /** Call this when the exam is resumed ({@link Numbas.Exam#resume}). 
     *
     * @abstract
     */
    resume: function() {},
    /** Call this when the exam ends ({@link Numbas.Exam#end}).
     *
     * @abstract
     */
    end: function() {},
    /** Get the student's ID.
     *
     * @abstract
     * @returns {string}
     */
    getStudentID: function() {
        return '';
    },
    /** Get entry state: `ab-initio`, or `resume`.
     *
     * @abstract
     * @returns {string}
     */
    getEntry: function() {
        return 'ab-initio';
    },
    /** Get viewing mode:
     *
     * * `browse` - see exam info, not questions;
     * * `normal` - sit exam;
     * * `review` - look at completed exam.
     *
     * @abstract
     * @returns {string}
     */
    getMode: function() {},
    /** Is review mode allowed?
     *
     * @returns {boolean}
     */
    reviewModeAllowed: function() {},
    /** Call this when the student moves to a different question.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    changeQuestion: function(question) {},
    /** Call this when a part is answered.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    partAnswered: function(part) {},
    /** Save the staged answer for a part.
     * Note: this is not part of the SCORM standard, so can't rely on this being saved.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    storeStagedAnswer: function(part) {},
    /** Save exam-level details.
     *
     * @abstract
     * @param {Numbas.Exam} exam
     */
    saveExam: function(exam) {},
    /* Save details about a question - save score and success status.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    saveQuestion: function(question) {},
    /** Record that a question has been submitted.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    questionSubmitted: function(question) {},
    /** Rcord that the student displayed question advice.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    adviceDisplayed: function(question) {},
    /** Record that the student revealed the answers to a question.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    answerRevealed: function(question) {},
    /** Record that the student showed the steps for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    stepsShown: function(part) {},
    /** Record that the student hid the steps for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    stepsHidden: function(part) {},

    /** Suspend data for the exam - all the other stuff that doesn't fit into the standard SCORM data model.
     *
     * @returns {object}
     */
    examSuspendData: function() {
        var exam = this.exam;
        if(exam.loading) {
            return undefined;
        }
        var eobj = {
            timeRemaining: exam.timeRemaining || 0,
            timeSpent: exam.timeSpent || 0,
            duration: exam.settings.duration || 0,
            questionSubsets: exam.question_groups.map(function(g){ return g.questionSubset }),
            questionGroupOrder: exam.questionGroupOrder,
            start: exam.start-0,
            stop: exam.stop ? exam.stop-0 : null,
            randomSeed: exam && exam.seed,
            student_name: exam.student_name, 
            score:  exam.score,
            max_score:  exam.mark,
        };
        if(exam.settings.navigateMode=='diagnostic') {
            eobj.diagnostic = this.diagnosticSuspendData();
        }
        eobj.questions = [];
        for(var i=0;i<exam.questionList.length;i++) {
            eobj.questions.push(this.questionSuspendData(exam.questionList[i]));
        }

        return eobj;
    },

    /** Create suspend data to do with diagnostic mode.
     *
     * @returns {object}
     */
    diagnosticSuspendData: function() {
        var exam = this.exam;
        var dobj = {};
        dobj.state = Numbas.jme.display.treeToJME({tok:exam.diagnostic_controller.state});
        return dobj;
    },

    /** Create suspend data object for a dictionary of JME variables.
     *
     * @param {Object<Numbas.jme.token>} variables
     * @param {Numbas.jme.Scope} scope
     * @returns {Object<JME>}
     * @see Numbas.storage.SCORMStorage#setSuspendData
     */
    variablesSuspendData: function(variables, scope) {
        var vobj = {};
        for(var name in variables) {
            vobj[name] = Numbas.jme.display.treeToJME({tok: variables[name]},{nicenumber:false, wrapexpressions: true, store_precision: true}, scope);
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
        var qobj = {
            name: question.name,
            number_in_group: question.number_in_group,
            group: question.group.number,
            visited: question.visited,
            answered: question.answered,
            submitted: question.submitted,
            adviceDisplayed: question.adviceDisplayed,
            revealed: question.revealed,
            score: question.score,
            max_score: question.marks
        };

        var scope = question.getScope();

        if(question.partsMode=='explore') {
            qobj.currentPart = question.currentPart.path;
        }

        var variables = {};
        question.local_definitions.variables.forEach(function(names) {
            names = Numbas.jme.normaliseName(names, scope);
            if(!question.variablesTodo[names] || Numbas.jme.isDeterministic(question.variablesTodo[names].tree,scope)) {
                return;
            }
            names.split(',').forEach(function(name) {
                name = name.trim();
                var value = question.scope.getVariable(name);
                variables[name] = value;
            });
        });
        qobj.variables = this.variablesSuspendData(variables, scope);

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

        var scope = part.getScope();
        /**
         * Produce the suspend data for cached pre-submit task results.
         *
         * @param {Numbas.parts.pre_submit_cache_result} c
         * @returns {object}
         */
        function pre_submit_cache_suspendData(c) {
            var obj = {
                exec_path: c.exec_path,
                studentAnswer: Numbas.jme.display.treeToJME({tok: c.studentAnswer}, scope),
                results: c.results.map(function(r) {
                    var o = {};
                    for(var x in r) {
                        o[x] = Numbas.jme.display.treeToJME({tok:r[x]}, scope);
                    }
                    return o;
                })
            };
            return obj;
        }

        var pobj = {
            answered: part.answered,
            stepsShown: part.stepsShown,
            stepsOpen: part.stepsOpen,
            name: name,
            index: part.index,
            previousPart: part.previousPart ? part.previousPart.path : null,
            pre_submit_cache: part.pre_submit_cache.map(pre_submit_cache_suspendData),
            alternatives: part.alternatives.map(function(alt) {
                return {
                    pre_submit_cache: alt.pre_submit_cache.map(pre_submit_cache_suspendData)
                };
            }),
            score: part.score,
            max_score: part.marks,
        };
        var typeStorage = this.getPartStorage(part);
        if(typeStorage) {
            var data = typeStorage.suspend_data(part, this);
            if(data) {
                pobj = Numbas.util.extend_object(pobj,data);
            }
            pobj.student_answer = typeStorage.student_answer(part);
            pobj.correct_answer = typeStorage.correct_answer(part);
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
                variableReplacements: np.instanceVariables ? this.variablesSuspendData(np.instanceVariables, part.getScope()) : null,
                index: np.instance ? np.instance.index : null
            });
        }
        return pobj;
    },

    /** Get the relevant part storage methods for the given part.
     *
     * @param {Numbas.parts.Part} p
     * @returns {Numbas.storage.partTypeStorage}
     */
    getPartStorage: function(p) {
        if(p.is_custom_part_type) {
            return storage.partTypeStorage['custom'];
        } else {
            return storage.partTypeStorage[p.type];
        }
    },
};

/** @typedef {object} Numbas.storage.partTypeStorage
 * @property {Function} interaction_type - `(part)`
 * @property {Function} correct_answer - `(part)`
 * @property {Function} student_answer - `(part)`
 * @property {Function} suspend_data - `(part)`
 * @property {Function} load - `(part,data)`
 */

storage.partTypeStorage = {
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
            return Numbas.math.niceRealNumber(part.settings.minvalue)+'[:]'+Numbas.math.niceRealNumber(part.settings.maxvalue);
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
            var widget_storage = storage.inputWidgetStorage[widget];
            if(widget_storage) {
                return widget_storage.interaction_type(part);
            } else {
                return 'other';
            }
        },
        correct_answer: function(part) {
            var widget = part.input_widget();
            var widget_storage = storage.inputWidgetStorage[widget];
            if(widget_storage) {
                return widget_storage.correct_answer(part);
            }
        },
        student_answer: function(part) {
            var widget = part.input_widget();
            var widget_storage = storage.inputWidgetStorage[widget];
            if(widget_storage) {
                return widget_storage.student_answer(part);
            }
        },
        suspend_data: function() {},
        load: function(part, data) {
            var widget = part.input_widget();
            var widget_storage = storage.inputWidgetStorage[widget];
            if(widget_storage) {
                return widget_storage.load(part,data);
            }
      }
    }
};

/** @typedef inputWidgetStorage
 * @memberof Numbas.storage
 * @property {function} interaction_type - Return the SCORM interaction type identifier for the given part.
 * @property {function} correct_answer - Return a JSON-serialisable object representing the correct answer for the given part.
 * @property {function} student_answer - Return a JSON-serialisable object representing the student's answer to the given part.
 * @property {function} load - Given arguments `part` and `data`, load the student's answer to the given part from the suspend data.
 */

/** @type {Object.<inputWidgetStorage>}
 * @memberof Numbas.storage
 */
storage.inputWidgetStorage = {
    'string': {
        interaction_type: function(part) { return 'fill-in'; },
        correct_answer: function(part) { return part.input_options().correctAnswer; },
        student_answer: function(part) { return part.studentAnswer; },
        load: function(part, data) { return data.answer; }
    },
    'number': {
        interaction_type: function(part) { return 'fill-in'; },
        correct_answer: function(part) { return Numbas.math.niceRealNumber(part.input_options().correctAnswer); },
        student_answer: function(part) { return part.studentAnswer !== undefined ? Numbas.math.niceRealNumber(part.studentAnswer) : ''; },
        load: function(part, data) { return Numbas.util.parseNumber(data.answer, part.input_options().allowFractions, part.input_options().allowedNotationStyles); }
    },
    'jme': {
        interaction_type: function(part) { return 'fill-in'; },
        correct_answer: function(part) { return Numbas.jme.display.treeToJME(part.input_options().correctAnswer,{},part.getScope()); },
        student_answer: function(part) { return Numbas.jme.display.treeToJME(part.studentAnswer,{},part.getScope()); },
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
            if(part.studentAnswer) {
                part.studentAnswer.forEach(function(c,i) {
                    if(c) {
                        ticked.push(i);
                    }
                });
            }
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

storage.addStorage = function(store) {
    storage.stores.push(store);
}

/** The active storage object ({@link Numbas.storage}) to be used by the exam */
Numbas.store = {};

Object.keys(Numbas.storage.BlankStorage.prototype).forEach(function(method_name) {
    Numbas.store[method_name] = function() {
        let ret = undefined;
        for(let store of storage.stores) {
            let store_ret = store[method_name].apply(store, arguments);
            if(ret === undefined) {
                ret = store_ret;
            }
        }
        return ret;
    }
});

/** Initialise the storage the mechanism, resetting the list of storage backends.
 */
storage.init = function() {
    storage.stores = [];
    return Numbas.store;
};
storage.init();

});
