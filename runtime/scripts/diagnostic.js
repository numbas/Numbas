Numbas.queueScript('diagnostic',['util','jme','localisation','jme-variables'], function() {
    var jme = Numbas.jme;

    var diagnostic = Numbas.diagnostic = {
        scripts: {},
        load_scripts: function() {
            for(var x in Numbas.raw_diagnostic_scripts) {
                diagnostic.scripts[x] = new diagnostic.DiagnosticScript(Numbas.raw_diagnostic_scripts[x]);
            }
        }
    };

    var DiagnosticScript = diagnostic.DiagnosticScript = Numbas.jme.variables.note_script_constructor();

    var KnowledgeGraph = diagnostic.KnowledgeGraph = function(data) {
        this.data = data;
        var topicdict = this.topicdict = {};
        this.topics = data.topics.map(function(t) {
            var topic = {
                name: t.name,
                learning_objectives: t.learning_objectives.slice(),
                depends_on: t.depends_on.slice(),
                leads_to: []
            };
            topicdict[topic.name] = topic;
            return t;
        });

        this.topics.forEach(function(t) {
            t.depends_on.forEach(function(name) {
                topicdict[name].leads_to.push(t);
            });
        });

        this.learning_objectives = data.learning_objectives.slice();
    }

    var DiagnosticController = diagnostic.DiagnosticController = function(knowledge_graph,exam,script) {
        this.knowledge_graph = knowledge_graph;
        this.exam = exam;
        this.script = script;
        this.scope = new jme.Scope([exam.scope,{variables: this.make_init_variables()}]);
        this.state = script.evaluate_note('state',this.scope);
    }
    DiagnosticController.prototype = {
        /** Produce summary data about a question for a diagnostic script to use.
         */
        question_data: function(question) {
            if(!question) {
                return new jme.types.TNothing();
            }
            return jme.wrapValue({
                name: question.name,
                number: question.number,
                credit: question.marks>0 ? question.score/question.marks : 0
            });
        },

        /** Make the initial variables for the diagnostic script.
         */
        make_init_variables: function() {
            var dc = this;

            return {
                topics: jme.wrapValue(this.knowledge_graph.topicdict),
                learning_objectives: jme.wrapValue(this.knowledge_graph.learning_objectives)
            }
        },

        /** Evaluate a note in the diagnostic script, adding in the `state` and `current_question` variables.
         */
        evaluate_note: function(note) {
            var parameters = {
                state: this.state, 
                current_topic: jme.wrapValue(this.exam.currentQuestion ? this.exam.currentQuestion.group.settings.name : null),
                current_question: this.question_data(this.exam.currentQuestion)
            }
            return this.script.evaluate_note(note, this.scope, parameters);
        },

        /** Get the new state after answering a question.
         */
        after_answering: function() {
            var res = jme.castToType(this.evaluate_note('after_answering'),'dict');
            this.state = res.value.state;
            var action = res.value.action;
            return action;
        },

        /** Get the next topic to pick a question on.
         */
        next_topic: function() {
            var res = this.evaluate_note('next_topic');
            if(jme.isType(res,'nothing')) {
                return null;
            } else {
                return jme.unwrapValue(jme.castToType(res,'string'));
            }
        },

        /** Produce a summary of the student's progress through the test.
         */
        progress: function() {
            var res = this.evaluate_note('progress');
            return jme.unwrapValue(res);
        }
    }
})
