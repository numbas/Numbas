Numbas.queueScript('diagnostic', ['util', 'jme', 'localisation', 'jme-variables'], function() {
    var jme = Numbas.jme;

    var diagnostic = Numbas.diagnostic = {
        scripts: {},
        load_scripts: function() {
            for(var x in Numbas.raw_diagnostic_scripts) {
                diagnostic.scripts[x] = new diagnostic.DiagnosticScript(Numbas.raw_diagnostic_scripts[x], null, Numbas.jme.builtinScope);
            }
        }
    };

    diagnostic.DiagnosticScript = Numbas.jme.variables.note_script_constructor();

    /** Definition of a knowledge graph.
     *
     * @typedef Numbas.diagnostic.knowledge_graph_definition
     * @property {Array.<{title: string, name: string}>} learning_objectives - Learning objectives
     * @property {Array.<{depends_on: Array.<string>, title: string, learning_objectives: Array.<string>, name: string}>} topics - Topics
     */

    /** 
     * A representation of a knowledge graph, with a node for each topic and a directed edge when one topic leads to another.
     *
     * @param {Numbas.diagnostic.knowledge_graph_definition} data
     */
    diagnostic.KnowledgeGraph = function(data) {
        this.data = data;
        var topicdict = this.topicdict = {};
        this.topics = (data.topics || []).map(function(t) {
            var topic = {
                name: t.name,
                learning_objectives: (t.learning_objectives || []).slice(),
                depends_on: (t.depends_on || []).slice(),
                leads_to: []
            };
            topicdict[topic.name] = topic;
            return t;
        });

        this.topics.forEach(function(t) {
            (t.depends_on || []).forEach(function(name) {
                topicdict[name].leads_to.push(t.name);
            });
        });

        this.learning_objectives = (data.learning_objectives || []).slice();
    }

    /** A controller for a diagnostic algorithm.
     *
     * @param {Numbas.diagnostic.KnowledgeGraph} knowledge_graph
     * @param {Numbas.Exam} exam
     * @param {Numbas.diagnostic.DiagnosticScript} script
     */
    var DiagnosticController = diagnostic.DiagnosticController = function(knowledge_graph, exam, script) {
        this.knowledge_graph = knowledge_graph;
        this.exam = exam;
        this.script = script;
        this.scope = new jme.Scope([exam.scope, {variables: this.make_init_variables()}]);
        this.state = script.evaluate_note('state', this.scope).value;
    }
    DiagnosticController.prototype = {
        /**
         * Produce summary data about a question for a diagnostic script to use.
         *
         * @param {Numbas.Question} question
         * @returns {Numbas.jme.token} - A dictionary with keys `name`, `number` and `credit`.
         */
        question_data: function(question) {
            if(!question) {
                return new jme.types.TNothing();
            }
            return jme.wrapValue({
                name: question.name,
                number: question.number,
                credit: question.marks>0 ? question.score/question.marks : 0,
                marks: question.marks
            });
        },

        /** 
         * Make the initial variables for the diagnostic script.
         *
         * @returns {object}
         */
        make_init_variables: function() {
            var dc = this;

            var topicdict = {};
            Object.entries(this.knowledge_graph.topicdict).forEach(function(d) {
                var topic_name = d[0];
                var topic = {};
                Object.entries(d[1]).forEach(function(x) {
                    topic[x[0]] = x[1];
                });
                var group = dc.exam.question_groups.find(function(g) { return g.settings.name==topic_name; })
                if(!group) {
                    return;
                }
                topic.questions = [];
                for(var i=0;i<group.numQuestions;i++) {
                    topic.questions.push({
                        topic: topic_name,
                        number: i
                    });
                }
                topicdict[topic_name] = topic;
            });

            return {
                topics: jme.wrapValue(topicdict),
                learning_objectives: jme.wrapValue(this.knowledge_graph.learning_objectives)
            }
        },

        /** Get the name of the topic the current question belongs to.
         *
         * @returns {string}
         */
        current_topic: function() {
            return this.exam.currentQuestion ? this.exam.currentQuestion.group.settings.name : null;
        },

        /**
         * Evaluate a note in the diagnostic script, adding in the `state` and `current_question` variables.
         *
         * @param {string} note - The name of the note to evaluate.
         * @returns {Numbas.jme.token}
         */
        evaluate_note: function(note) {
            var parameters = {
                state: this.state, 
                current_topic: jme.wrapValue(this.current_topic()),
                current_question: this.question_data(this.exam.currentQuestion)
            }
            return this.script.evaluate_note(note, this.scope, parameters).value;
        },

        /** Unwrap a description of a question produced by the script, to either `null` or a dictionary with keys `topic` and `number`.
         *
         * @param {Numbas.jme.token} v
         * @returns {object|null}
         */
        unwrap_question: function(v) {
            if(jme.isType(v, 'nothing')) {
                return null;
            } else {
                return jme.unwrapValue(jme.castToType(v,
                    {
                        type: 'dict',
                        items: {
                            'topic': 'string',
                            'number': 'number'
                        }
                    }
                ));
            }
        },

        /** Get the new state after ending the exam.
         */
        after_exam_ended: function() {
            this.state = this.evaluate_note('after_exam_ended');
        },

        /** 
         * Get the list of actions to offer to the student when they ask to move on.
         *
         * @returns {object}
         */
        next_actions: function() {
            var dc = this;
            var res = this.evaluate_note('next_actions');
            res = jme.castToType(res, 'dict');
            var feedback = jme.unwrapValue(jme.castToType(res.value.feedback, 'string'));
            var actions = jme.castToType(res.value.actions, 'list').value.map(function(action) {
                action = jme.castToType(action, 'dict');
                return {
                    label: jme.unwrapValue(action.value.label),
                    state: action.value.state,
                    next_topic: dc.unwrap_question(action.value.next_question)
                };
            });
            return {
                feedback: feedback,
                actions: actions
            };
        },

        /** Get the first topic to pick a question on.
         *
         * @returns {string}
         */
        first_question: function() {
            var res = this.evaluate_note('first_question');
            return this.unwrap_question(res);
        },

        /** 
         * Produce a summary of the student's progress through the test.
         *
         * @returns {string}
         */
        progress: function() {
            var res = jme.castToType(
                this.evaluate_note('progress'), 
                {
                    type: 'list',
                    all_items: {
                        type: 'dict',
                        items: {
                            'name': 'string',
                            'progress': 'number',
                            'credit': 'number'
                        }
                    }
                }
            );
            return jme.unwrapValue(res);
        },

        /** 
         * Get a block of feedback text to show to the student.
         *
         * @returns {string}
         */
        feedback: function() {
            var res = this.evaluate_note('feedback');
            return jme.unwrapValue(jme.castToType(res, 'string'));
        }
    }
})
