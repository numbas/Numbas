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
Numbas.queueScript('storage', ['base'], function() {
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
    stores: [],
    storage_classes: {}
};


/** A blank storage object which does nothing.
 *
 * Any real storage object needs to implement all of this object's methods.
 *
 * @memberof Numbas.storage
 * @augments Numbas.storage.Storage
 * @class
 */
class Storage {
    /** Initialise the SCORM data model and this storage object.
     *
     * @param {Numbas.Exam} exam
     */
    init(exam) {
        this.exam = exam;
    }

    init_questions() {
    }

    /** Initialise a question.
     *
     * @param {Numbas.Question} q
     * @abstract
     */
    initQuestion(q) {}

    /**
     * Initialise a part.
     *
     * @param {Numbas.parts.Part} p
     * @abstract
     */
    initPart(p) {}

    /** Get an externally-set extension to the exam duration.
     *
     * @abstract
     * @returns {object}
     */
    getDurationExtension() {
    }

    /** Get suspended exam info.
     *
     * @abstract
     * @param {Numbas.Exam} exam
     * @returns {Numbas.storage.exam_suspend_data}
     */
    load(exam) {}

    /** Save SCORM data - call the SCORM commit method to make sure the data model is saved to the server/backing store.
     *
     * @abstract
     */
    save() {
    }

    /** Load student's name and ID.
     *
     * @abstract
     */
    get_student_name() {}

    /** Get the initial seed value.
     *
     * @abstract
     * @returns {string}
     */
    get_initial_seed() {}

    /**
     * Get suspended info for a question.
     *
     * @abstract
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     */
    loadQuestion(question) {}

    /** Get suspended info for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPart(part) {}

    /** Load a {@link Numbas.parts.JMEPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadJMEPart(part) {}

    /** Load a {@link Numbas.parts.PatternMatchPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadPatternMatchPart(part) {}

    /** Load a {@link Numbas.parts.NumberEntryPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadNumberEntryPart(part) {}

    /** Load a {@link Numbas.parts.MatrixEntryPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMatrixEntryPart(part) {}

    /** Load a {@link Numbas.parts.MultipleResponsePart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadMultipleResponsePart(part) {}

    /** Load a {@link Numbas.parts.ExtensionPart}.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     */
    loadExtensionPart(part) {}

    /** Load a dictionary of JME variables.
     *
     * @param {Object<JME>} vobj
     * @param {Numbas.jme.Scope} scope
     * @returns {Object<Numbas.jme.token>}
     */
    loadVariables(vobj, scope) {
        var variables = {};
        for(const [snames, v_def] of Object.entries(vobj)) {
            const v = scope.evaluate(v_def);
            var names = snames.split(',');
            if(names.length > 1) {
                names.forEach(function(name, i) {
                    variables[name] = scope.evaluate('$multi[' + i + ']', {'$multi':v});
                });
            } else {
                variables[snames] = v;
            }
        }
        return variables;
    }


    /** Call this when the exam is started (when {@link Numbas.Exam#begin} runs, not when the page loads).
     *
     * @abstract
     */
    start() {}

    /** Call this when the exam is paused ({@link Numbas.Exam#pause}).
     *
     * @abstract
     */
    pause() {}

    /** Call this when the exam is resumed ({@link Numbas.Exam#resume}).
     *
     * @abstract
     */
    resume() {}

    /** Call this when the exam ends ({@link Numbas.Exam#end}).
     *
     * @abstract
     */
    end() {}

    /** Get the student's ID.
     *
     * @abstract
     * @returns {string}
     */
    getStudentID() {
        return '';
    }

    /** Get entry state: `ab-initio`, or `resume`.
     *
     * @abstract
     * @returns {string}
     */
    getEntry() {
        return 'ab-initio';
    }

    /** Get viewing mode:
     *
     * - `browse` - see exam info, not questions;
     * - `normal` - sit exam;
     * - `review` - look at completed exam.
     *
     * @abstract
     * @returns {string}
     */
    getMode() {}

    /** Is review mode allowed?
     *
     * @returns {boolean}
     */
    reviewModeAllowed() {}

    /** Call this when the student moves to a different question.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    changeQuestion(question) {}

    /** Call this when a part is answered.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    partAnswered(part) {}

    /** Save the staged answer for a part.
     * Note: this is not part of the SCORM standard, so can't rely on this being saved.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    storeStagedAnswer(part) {}

    /** Save exam-level details.
     *
     * @abstract
     * @param {Numbas.Exam} exam
     */
    saveExam(exam) {}

    /* Save details about a question - save score and success status.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    saveQuestion(question) {}

    /** Record that a question has been submitted.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    questionSubmitted(question) {}

    /** Rcord that the student displayed question advice.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    adviceDisplayed(question) {}

    /** Record that the student revealed the answers to a question.
     *
     * @abstract
     * @param {Numbas.Question} question
     */
    answerRevealed(question) {}

    /** Record that the student showed the steps for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    stepsShown(part) {}

    /** Record that the student hid the steps for a part.
     *
     * @abstract
     * @param {Numbas.parts.Part} part
     */
    stepsHidden(part) {}

    /** Suspend data for the exam - all the other stuff that doesn't fit into the standard SCORM data model.
     *
     * @returns {object}
     */
    examSuspendData() {
        var exam = this.exam;
        if(exam.loading) {
            return undefined;
        }
        var eobj = {
            timeRemaining: exam.timeRemaining || 0,
            timeSpent: exam.timeSpent || 0,
            duration: exam.settings.duration || 0,
            questionSubsets: exam.question_groups.map(function(g) {
                return g.questionSubset
            }),
            questionGroupOrder: exam.questionGroupOrder,
            start: exam.start - 0,
            stop: exam.stop ? exam.stop - 0 : null,
            randomSeed: exam.seed,
            student_name: exam.student_name,
            score:  exam.score,
            max_score:  exam.mark,
        };
        if(exam.settings.navigateMode == 'diagnostic') {
            eobj.diagnostic = this.diagnosticSuspendData();
        }
        eobj.questions = [];
        for(let i = 0;i < exam.questionList.length;i++) {
            eobj.questions.push(this.questionSuspendData(exam.questionList[i]));
        }

        return eobj;
    }

    /** Create suspend data to do with diagnostic mode.
     *
     * @returns {object}
     */
    diagnosticSuspendData() {
        var exam = this.exam;
        var dobj = {};
        dobj.state = Numbas.jme.display.treeToJME({tok:exam.diagnostic_controller.state});
        return dobj;
    }

    /** Create suspend data object for a dictionary of JME variables.
     *
     * @param {Object<Numbas.jme.token>} variables
     * @param {Numbas.jme.Scope} scope
     * @returns {Object<JME>}
     * @see Numbas.storage.SCORMStorage#setSuspendData
     */
    variablesSuspendData(variables, scope) {
        var vobj = {};
        for(const [name, v] of Object.entries(variables)) {
            vobj[name] = Numbas.jme.display.treeToJME({tok: v}, {nicenumber:false, wrapexpressions: true, store_precision: true}, scope);
        }
        return vobj;
    }

    /** Create suspend data object for a question.
     *
     * @param {Numbas.Question} question
     * @returns {Numbas.storage.question_suspend_data}
     * @see Numbas.storage.SCORMStorage#setSuspendData
     */
    questionSuspendData(question) {
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

        if(question.partsMode == 'explore') {
            qobj.currentPart = question.currentPart.path;
        }

        var variables = {};
        var interactive_state = {}; // Extra state information for variables holding interactive objects.
        question.local_definitions.variables.forEach(function(names) {
            names = Numbas.jme.normaliseName(names, scope);
            const value = scope.getVariable(names);
            if(!value) {
                return;
            }
            if(value.get_interactive_state !== undefined) {
                interactive_state[names] = value.get_interactive_state();
            }
            if(!question.variablesTodo[names] || Numbas.jme.isDeterministic(question.variablesTodo[names].tree, scope)) {
                return;
            }
            names.split(',').forEach(function(name) {
                name = name.trim();
                variables[name] = value;
            });
        });
        qobj.variables = this.variablesSuspendData(variables, scope);
        qobj.interactive_state = interactive_state;

        qobj.parts = [];
        for(let i = 0;i < question.parts.length;i++) {
            qobj.parts.push(this.partSuspendData(question.parts[i]));
        }

        return qobj;
    }

    /** Create suspend data object for a part.
     *
     * @param {Numbas.parts.Part} part
     * @returns {Numbas.storage.part_suspend_data}
     * @see Numbas.storage.SCORMStorage#setSuspendData
     */
    partSuspendData(part) {
        var name_bits = [part.name];
        var par = part.parentPart;
        while(par) {
            name_bits.splice(0, 0, par.name);
            par = par.parentPart;
        }
        name_bits.splice(0, 0, part.question.name);
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
                replacements: Numbas.jme.display.treeToJME({tok: c.replacements}, scope),
                results: c.results.map(function(r) {
                    var o = {};
                    for(const [k, v] of Object.entries(r)) {
                        o[k] = Numbas.jme.display.treeToJME({tok: v}, scope);
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
                pobj = Numbas.util.extend_object(pobj, data);
            }
            pobj.student_answer = typeStorage.student_answer(part);
            pobj.correct_answer = typeStorage.correct_answer(part);
        }
        pobj.steps = [];
        for(let i = 0;i < part.steps.length;i++) {
            pobj.steps.push(this.partSuspendData(part.steps[i]));
        }
        pobj.nextParts = [];
        for(let i = 0;i < part.nextParts.length;i++) {
            var np = part.nextParts[i];
            pobj.nextParts.push({
                instance: np.instance ? np.instance.path : null,
                variableReplacements: np.instanceVariables ? this.variablesSuspendData(np.instanceVariables, part.getScope()) : null,
                index: np.instance ? np.instance.index : null
            });
        }
        return pobj;
    }

    /** Get the relevant part storage methods for the given part.
     *
     * @param {Numbas.parts.Part} p
     * @returns {Numbas.storage.partTypeStorage}
     */
    getPartStorage(p) {
        if(p.is_custom_part_type) {
            return storage.partTypeStorage['custom'];
        } else {
            return storage.partTypeStorage[p.type];
        }
    }
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
        interaction_type: function() {
            return 'other';
        },
        correct_answer: function() {},
        student_answer: function() {},
        suspend_data: function() {},
        load: function() {}
    },
    'extension': {
        interaction_type: function() {
            return 'other';
        },
        correct_answer: function() {},
        student_answer: function() {},
        suspend_data: function(part) {
            return {extension_data: part.createSuspendData()};
        },
        load: function() {}
    },
    '1_n_2': {
        interaction_type: function() {
            return 'choice';
        },
        correct_answer: function(part) {
            for(let i = 0;i < part.numAnswers;i++) {
                if(part.settings.maxMatrix[i][0]) {
                    return i + '';
                }
            }
        },
        student_answer: function(part) {
            for(let i = 0;i < part.numAnswers;i++) {
                if(part.ticks[i][0]) {
                    return i + '';
                }
            }
        },
        suspend_data: function(part) {
            return {shuffleAnswers: Numbas.math.inverse(part.shuffleAnswers)};
        },
        load: function(part, data) {
            var ticks = [];
            var tick = parseInt(data.answer, 10);
            for(let i = 0;i < part.numAnswers;i++) {
                ticks.push([i == tick]);
            }
            return ticks;
        }
    },
    'm_n_2': {
        interaction_type: function(part) {
            return 'choice';
        },
        correct_answer: function(part) {
            var good_choices = [];
            for(let i = 0;i < part.numAnswers;i++) {
                if(part.settings.maxMatrix[i][0]) {
                    good_choices.push(i);
                }
            }
            return good_choices.join('[,]');
        },
        student_answer: function(part) {
            var choices = [];
            for(let i = 0;i < part.numAnswers;i++) {
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
            for(let i = 0;i < part.numAnswers;i++) {
                ticks.push([false]);
            }
            data.answer.split('[,]').forEach(function(tickstr) {
                var tick = parseInt(tickstr, 10);
                if(!isNaN(tick)) {
                    ticks[tick][0] = true;
                }
            });
            return ticks;
        }
    },
    'm_n_x': {
        interaction_type: function(part) {
            return 'matching';
        },
        correct_answer: function(part) {
            var good_choices = [];
            for(let i = 0;i < part.settings.maxMatrix.length;i++) {
                for(let j = 0;j < part.settings.maxMatrix[i].length;j++) {
                    if(part.settings.maxMatrix[i][j]) {
                        good_choices.push(i + '[.]' + j);
                    }
                }
            }
            return good_choices.join('[,]');
        },
        student_answer: function(part) {
            var choices = [];
            for(let i = 0;i < part.numAnswers;i++) {
                for(var j = 0;j < part.numChoices;j++) {
                    if(part.ticks[i][j]) {
                        choices.push(i + '[.]' + j);
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
            for(let i = 0;i < part.numAnswers;i++) {
                var row = [];
                ticks.push(row);
                for(let j = 0;j < part.numChoices;j++) {
                    row.push(false);
                }
            }
            var tick_re = /(\d+)\[\.\](\d+)/;
            var bits = data.answer.split('[,]');
            for(let i = 0;i < bits.length;i++) {
                var m = bits[i].match(tick_re);
                if(m) {
                    var x = parseInt(m[1], 10);
                    var y = parseInt(m[2], 10);
                    ticks[x][y] = true;
                }
            }
            return ticks;
        }
    },
    'numberentry': {
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return Numbas.math.niceRealNumber(part.settings.minvalue) + '[:]' + Numbas.math.niceRealNumber(part.settings.maxvalue);
        },
        student_answer: function(part) {
            return part.studentAnswer;
        },
        suspend_data: function() {},
        load: function(part, data) {
            return data.answer || '';
        }
    },
    'matrix': {
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return '{case_matters=false}' + JSON.stringify(part.settings.correctAnswer);
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
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return '{case_matters=' + part.settings.caseSensitive + '}' + part.settings.correctAnswer;
        },
        student_answer: function(part) {
            return part.studentAnswer;
        },
        suspend_data: function() {},
        load: function(part, data) {
            return data.answer || '';
        }
    },
    'jme': {
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return '{case_matters=false}' + part.settings.correctAnswer;
        },
        student_answer: function(part) {
            return part.studentAnswer;
        },
        suspend_data: function() {},
        load: function(part, data) {
            return data.answer || '';
        }
    },
    'gapfill': {
        interaction_type: function(part) {
            return 'other';
        },
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
                return widget_storage.load(part, data);
            }
      }
    }
};

/** @typedef inputWidgetStorage
 * @memberof Numbas.storage
 * @property {Function} interaction_type - Return the SCORM interaction type identifier for the given part.
 * @property {Function} correct_answer - Return a JSON-serialisable object representing the correct answer for the given part.
 * @property {Function} student_answer - Return a JSON-serialisable object representing the student's answer to the given part.
 * @property {Function} load - Given arguments `part` and `data`, load the student's answer to the given part from the suspend data.
 */

/** @type {Object<inputWidgetStorage>}
 * @memberof Numbas.storage
 */
storage.inputWidgetStorage = {
    'string': {
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return part.input_options().correctAnswer;
        },
        student_answer: function(part) {
            return part.studentAnswer;
        },
        load: function(part, data) {
            return data.answer;
        }
    },
    'number': {
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return Numbas.math.niceRealNumber(part.input_options().correctAnswer);
        },
        student_answer: function(part) {
            return part.studentAnswer !== undefined ? Numbas.math.niceRealNumber(part.studentAnswer) : '';
        },
        load: function(part, data) {
            return Numbas.util.parseNumber(data.answer, part.input_options().allowFractions, part.input_options().allowedNotationStyles);
        }
    },
    'jme': {
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return Numbas.jme.display.treeToJME(part.input_options().correctAnswer, {}, part.getScope());
        },
        student_answer: function(part) {
            return Numbas.jme.display.treeToJME(part.studentAnswer, {}, part.getScope());
        },
        load: function(part, data) {
            return Numbas.jme.compile(data.answer);
        }
    },
    'matrix': {
        interaction_type: function(part) {
            return 'fill-in';
        },
        correct_answer: function(part) {
            return JSON.stringify(part.input_options().correctAnswer);
        },
        student_answer: function(part) {
            return JSON.stringify(part.studentAnswer);
        },
        load: function(part, data) {
            try {
                var m = JSON.parse(data.answer);
                m.rows = m.length;
                m.columns = m.length > 0 ? m[0].length : 0;
                return m;
            } catch {
                return undefined;
            }
        }
    },
    'radios': {
        interaction_type: function(part) {
            return 'choice';
        },
        correct_answer: function(part) {
            return part.input_options().correctAnswer + '';
        },
        student_answer: function(part) {
            return part.studentAnswer + '';
        },
        load: function(part, data) {
            return parseInt(data.answer, 10);
        }
    },
    'checkboxes': {
        interaction_type: function(part) {
            return 'choice';
        },
        correct_answer: function(part) {
            var good_choices = [];
            part.input_options().correctAnswer.forEach(function(c, i) {
                if(c) {
                    good_choices.push(i);
                }
            });
            return good_choices.join('[,]');
        },
        student_answer: function(part) {
            var ticked = [];
            if(part.studentAnswer) {
                part.studentAnswer.forEach(function(c, i) {
                    if(c) {
                        ticked.push(i);
                    }
                });
            }
            return ticked.join('[,]');
        },
        load: function(part, data) {
            var ticked = part.input_options().choices.map(function(c) {
                return false;
            });
            data.answer.split('[,]').forEach(function(c) {
                var i = parseInt(c, 10); ticked[i] = true;
            });
            return ticked;
        }
    },
    'dropdown': {
        interaction_type: function(part) {
            return 'choice';
        },
        correct_answer: function(part) {
            return part.input_options().correctAnswer + '';
        },
        student_answer: function(part) {
            return part.studentAnswer + '';
        },
        load: function(part, data) {
            return parseInt(data.answer, 10);
        }
    }
}

Numbas.storage.Storage = Storage;

});
