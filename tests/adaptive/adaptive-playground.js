Numbas.queueScript('base',[],function() {});

Numbas.queueScript('go',['jme','localisation','knockout','adaptive','marking'],function() {

    var adaptive = Numbas.adaptive;
    var jme = Numbas.jme;

    var knowledge_graph = adaptive.knowledge_graph;

    const qmap = window.qmap = {};
    knowledge_graph.topics.forEach(topic => {
        topic.questions.forEach(qname => {
            if(qmap[qname]===undefined) {
                qmap[qname] = {name: qname, topics: [], credit: 0}
            }
            qmap[qname].topics.push(topic.name);
        });
    });

    const questionList = Object.values(qmap).map((q,i) => {
        q.number = i;
        return q;
    });

    const exam = {
        questionList: questionList.slice(0,20),
        currentQuestion: null,
        scope: Numbas.jme.builtinScope
    }

    var script = window.script = Numbas.adaptive_scripts.diagnosys;

    var dc = new adaptive.DiagnosticController(knowledge_graph,exam,script);

    function set_current_question(i) {
        console.log(i);
        exam.currentQuestion = exam.questionList[i];
    }

    set_current_question(dc.next_question());

    var steps = 0;
    while(steps<100 && exam.currentQuestion) {
        console.log(steps,exam.currentQuestion.name, exam.currentQuestion.number);
        steps += 1;
        exam.currentQuestion.credit = Math.random()<0.5 ? 1 : 0;
        dc.after_answering();
        set_current_question(dc.next_question());
        var progress = dc.progress();
        console.log(progress);
    }

    /** Variables in adaptive script scope:

        current_question : Question
        state : ?
        questions: Array.<Question>
        topics: Array.<Topic>
        learning_objectives: LearningObjective

        Question:
            credit : Number
            topics: Array.<Topic>

        Topic:
            leads_to: Array.<Topic>
            depends_on: Array.<Topic>
            learning_objecitves: Array.<LearningObjective>

        LearningObjective:
            name: String
    */
})
