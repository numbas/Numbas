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
/** @file The {@link Numbas.Question} object */
Numbas.queueScript('standard_parts',['parts/jme','parts/patternmatch','parts/numberentry','parts/matrixentry','parts/multipleresponse','parts/gapfill','parts/information','parts/extension'],function() {});
Numbas.queueScript('question',['base','schedule','jme','jme-variables','util','part','standard_parts'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
/** Create a {@link Numbas.Question} object from an XML definition
 * @memberof Numbas
 * @param {Element} xml
 * @param {Number} number - the number of the question in the exam
 * @param {Numbas.Exam} [exam] - the exam this question belongs to
 * @param {Numbas.QuestionGroup} [group] - the group this question belongs to
 * @param {Numbas.jme.Scope} [scope] - the global JME scope
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @returns {Numbas.Question}
 */
var createQuestionFromXML = Numbas.createQuestionFromXML = function(xml, number, exam, group, scope, store) {
    try {
        var q = new Question(number, exam, group, scope, store);
        q.loadFromXML(xml);
        q.finaliseLoad();
    } catch(e) {
        throw(new Numbas.Error('question.error creating question',{number: number, message: e.message}));
    }
    return q;
}
/** Create a {@link Numbas.Question} object from a JSON object
 * @memberof Numbas
 * @param {Object} data
 * @param {Number} number - the number of the question in the exam
 * @param {Numbas.Exam} [exam] - the exam this question belongs to
 * @param {Numbas.QuestionGroup} [group] - the group this question belongs to
 * @param {Numbas.jme.Scope} [scope] - the global JME scope
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @returns {Numbas.Question}
 */
var createQuestionFromJSON = Numbas.createQuestionFromJSON = function(data, number, exam, group, scope, store) {
    try {
        var q = new Question(number, exam, group, scope, store);
        q.loadFromJSON(data);
        q.finaliseLoad();
    } catch(e) {
        throw(new Numbas.Error('question.error creating question',{number: number, message: e.message},e));
    }
    return q;
}
/** Keeps track of all info to do with an instance of a single question
 *
 * @constructor
 * @memberof Numbas
 * @param {Number} number - index of this question in the exam (starting at 0)
 * @param {Numbas.Exam} [exam] - parent exam
 * @param {Numbas.QuestionGroup} [group] - group this question belongs to
 * @param {Numbas.jme.Scope} [gscope=Numbas.jme.builtinScope] - global JME scope
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 */
var Question = Numbas.Question = function( number, exam, group, gscope, store)
{
    var q = this;
    q.store = store;
    q.signals = new Numbas.schedule.SignalBox(function(e) {
        e.message = R('question.error',{'number':q.number+1,message:e.message});
        throw(e);
    });
    q.signals.on('partsGenerated',function() {
        q.setErrorCarriedForwardBackReferences();
    })
    q.exam = exam;
    q.group = group;
    q.adviceThreshold = q.exam ? q.exam.adviceGlobalThreshold : 0;
    q.number = number;
    gscope = gscope || (exam && exam.scope) || Numbas.jme.builtinScope;
    q.scope = new jme.Scope(gscope);
    q.scope.question = q;
    q.preamble = {
        'js': '',
        'css': ''
    };
    q.functionsTodo = [];
    q.variablesTodo = {};
    q.rulesets = {};
    q.variablesTest = {
        condition: '',
        maxRuns: 10
    };
    q.parts = [];
    q.partDictionary = {};
}

/** The question preamble has been loaded but not run yet- this happens before any variables, functions, rulesets or parts are generated.
 * @event Numbas.Question#preambleLoaded
 * @see Numbas.Question#event:preambleRun
 */
/** The question preamble has been run.
 * @event Numbas.Question#preambleRun
 */
/** The question's function definitions have been loaded, but the corresponding {@link Numbas.jme.funcObj} objects have not been added to the scope yet.
 * @event Numbas.Question#functionsLoaded
 * @see Numbas.Question#event:functionsMade
 */
/** The question's functions have been made and added to the question's scope.
 * @event Numbas.Question#functionsMade
 */
/** The question's ruleset  definitions have been loaded, but the {@link Numbas.jme.rules.Ruleset} objects have not been added to the scope yet.
 * @event Numbas.Question#rulesetsLoaded
 * @see Numbas.Question#event:rulesetsMade
 */
/** The question's rulesets have been made and added to the question's scope.
 * @event Numbas.Question#rulesetsMade
 */
/** Trigger this when you're ready to evaluate the question's variables. In an exam context, the {@link Numbas.Exam} object triggers this event.
 * If the question has been created standalone, this event must be triggered in order for the question to finish loading.
 * @event Numbas.Question#generateVariables
 */
/** The variable definitions have been loaded, but their values have not been generated yet.
 * @event Numbas.Question#variableDefinitionsLoaded
 * @see Numbas.Question#event:variablesSet
 * @see Numbas.Question#event:variablesGenerated
 */
/** The parts of the question have been generated.
 * If resuming an attempt, the parts have not yet been restored to the saved state.
 * @event Numbas.Question#partsGenerated
 * @see Numbas.Question#event:partsResumed
 */
/** Triggered when resuming a saved attempt: the question's parts have been restored to the saved state.
 * @event Numbas.Question#partsResumed
 */
/** The variables have been evaluated, but {@link Numbas.Question.unwrappedVariables} has not been set yet.
 * @event Numbas.Question#variablesSet
 */
/** The variables have been generated and added to the scope, and are ready to use.
 * @event Numbas.Question#variablesGenerated
 */
/** The question is fully loaded and ready to use.
 * @event Numbas.Question#ready
 */
/** The question's HTML has been generated and attached to the page.
 * @event Numbas.Question#HTMLAttached
 */

Question.prototype = /** @lends Numbas.Question.prototype */
{
    /** Signals produced while loading this question.
     * @type {Numbas.schedule.SignalBox} 
     * */
    signals: undefined,

    /** Storage engine
     * @type {Numbas.storage.BlankStorage}
     */
    store: undefined,
    /** Load the question's settings from an XML <question> node
     * @param {Element} xml
     * @fires Numbas.Question#preambleLoaded
     * @fires Numbas.Question#functionsLoaded
     * @fires Numbas.Question#rulesetsLoaded
     * @fires Numbas.Question#variableDefinitionsLoaded
     * @fires Numbas.Question#partsGenerated
     * @listens Numbas.Question#event:variablesGenerated
     */
    loadFromXML: function(xml) {
        var q = this;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        q.xml = xml;
        q.originalXML = q.xml;
        //get question's name
        tryGetAttribute(q,q.xml,'.','name');
        var preambleNodes = q.xml.selectNodes('preambles/preamble');
        for(var i = 0; i<preambleNodes.length; i++) {
            var lang = preambleNodes[i].getAttribute('language');
            q.preamble[lang] = Numbas.xml.getTextContent(preambleNodes[i]);
        }
        q.signals.trigger('preambleLoaded');
        q.functionsTodo = Numbas.xml.loadFunctions(q.xml,q.scope);
        q.signals.trigger('functionsLoaded');
        //make rulesets
        var rulesetNodes = q.xml.selectNodes('rulesets/set');
        q.rulesets = {};
        for(var i=0; i<rulesetNodes.length; i++) {
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
            for(var j=0; j<includeNodes.length; j++) {
                set.push(includeNodes[j].getAttribute('name'));
            }
            q.rulesets[name] = set;
        }
        q.signals.trigger('rulesetsLoaded');
        q.variablesTodo = Numbas.xml.loadVariables(q.xml,q.scope);
        tryGetAttribute(q.variablesTest,q.xml,'variables',['condition','maxRuns'],[]);
        q.signals.trigger('variableDefinitionsLoaded');
        q.signals.on('variablesGenerated',function() {
            var doc = Sarissa.getDomDocument();
            doc.appendChild(q.originalXML.cloneNode(true));    //get a fresh copy of the original XML, to sub variables into
            q.xml = doc.selectSingleNode('question');
            q.xml.setAttribute('number',q.number);
        });
        q.signals.on('variablesGenerated', function() {
            //load parts
            var partNodes = q.xml.selectNodes('parts/part');
            for(var j = 0; j<partNodes.length; j++) {
                var part = Numbas.createPartFromXML(partNodes[j], 'p'+j,q,null, q.store);
                q.addPart(part,j);
            }
            q.signals.trigger('partsGenerated');
        });
    },
    /** Load the question's settings from a JSON object
     * @param {Object} data
     * @fires Numbas.Question#preambleLoaded
     * @fires Numbas.Question#functionsLoaded
     * @fires Numbas.Question#rulesetsLoaded
     * @fires Numbas.Question#variableDefinitionsLoaded
     * @fires Numbas.Question#partsGenerated
     * @listens Numbas.Question#event:variablesGenerated
     */
    loadFromJSON: function(data) {
        var q = this;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;
        tryLoad(data,'name',q);
        var preambles = tryGet(data,'preamble');
        if(preambles) {
            Object.keys(preambles).forEach(function(key) {
                q.preamble[key] = preambles[key];
            });
        }
        q.signals.trigger('preambleLoaded');
        var functions = tryGet(data,'functions');
        if(functions) {
            q.functionsTodo = Object.keys(functions).map(function(name) {
                var fd = functions[name];
                return {
                    name: name,
                    definition: fd.definition,
                    language: fd.language,
                    outtype: fd.type,
                    parameters: fd.parameters.map(function(p){ return {name:p[0], type: p[1]}})
                };
            });
        }
        q.signals.trigger('functionsLoaded');
        var rulesets = tryGet(data,'rulesets');
        if(rulesets) {
            Object.keys(rulesets).forEach(function(name) {
                q.rulesets[name] = rulesets[name];
            });
        }
        q.signals.trigger('rulesetsLoaded');
        var variables = tryGet(data,'variables');
        if(variables) {
            Object.keys(variables).map(function(name) {
                var vd = variables[name];
                var definition = vd.definition+'';
                if(definition=='') {
                    throw(new Numbas.Error('jme.variables.empty definition',{name:name}));
                }
                try {
                    var tree = Numbas.jme.compile(definition);
                } catch(e) {
                    throw(new Numbas.Error('variable.error in variable definition',{name:name}));
                }
                var vars = Numbas.jme.findvars(tree);
                q.variablesTodo[name.toLowerCase()] = {
                    tree: tree,
                    vars: vars
                }
            });
        }
        var variablesTest = tryGet(data,'variablesTest');
        if(variablesTest) {
            tryLoad(variablesTest,['condition','maxRuns'],q.variablesTest);
        }
        q.signals.trigger('variableDefinitionsLoaded');
        q.signals.on('variablesGenerated', function() {
            var parts = tryGet(data,'parts');
            if(parts) {
                parts.forEach(function(pd,i) {
                    var p = Numbas.createPartFromJSON(pd, 'p'+i, q, q.store);
                    q.addPart(p,i);
                });
            }
            q.signals.trigger('partsGenerated');
        });
    },

    setErrorCarriedForwardBackReferences: function() {
        var q = this;
        this.allParts().forEach(function(p) {
            p.settings.errorCarriedForwardReplacements.forEach(function(r) {
                var p2 = q.getPart(r.part);
                p2.errorCarriedForwardBackReferences[p.path] = true;
            });
        });
    },

    allParts: function() {
        return this.parts.reduce(function(out, p) {
            return out.concat([p],p.gaps,p.steps);
        },[]);
    },

    /** Add a part to the question
     * @param {Numbas.parts.Part} part
     * @param {Number} index
     */
    addPart: function(part, index) {
        this.parts.splice(index, 0, part);
        this.marks += part.marks;
    },
    /** Perform any tidying up or processing that needs to happen once the question's definition has been loaded
     * @fires Numbas.Question#functionsMade
     * @fires Numbas.Question#rulesetsMade
     * @fires Numbas.Question#variablesSet
     * @fires Numbas.Question#variablesGenerated
     * @fires Numbas.Question#ready
     * @listens Numbas.Question#event:preambleLoaded
     * @listens Numbas.Question#event:functionsLoaded
     * @listens Numbas.Question#event:rulesetsLoaded
     * @listens Numbas.Question#event:generateVariables
     * @listens Numbas.Question#event:functionsMade
     * @listens Numbas.Question#event:rulesetsMade
     * @listens Numbas.Question#event:variableDefinitionsLoaded
     * @listens Numbas.Question#event:variablesSet
     * @listens Numbas.Question#event:variablesGenerated
     * @listens Numbas.Question#event:partsGenerated
     * @listens Numbas.Question#event:ready
     * @listens Numbas.Question#event:HTMLAttached
     */
    finaliseLoad: function() {
        var q = this;
        q.signals.on('preambleLoaded', function() {
            q.runPreamble();
        });
        q.signals.on('functionsLoaded', function() {
            q.scope.functions = Numbas.jme.variables.makeFunctions(q.functionsTodo,q.scope,{question:q});
            q.signals.trigger('functionsMade');
        });
        q.signals.on('rulesetsLoaded',function() {
            Numbas.jme.variables.makeRulesets(q.rulesets,q.scope);
            q.signals.trigger('rulesetsMade');
        });
        q.signals.on(['generateVariables','functionsMade','rulesetsMade', 'variableDefinitionsLoaded'], function() {
            var conditionSatisfied = false;
            var condition = jme.compile(q.variablesTest.condition);
            var runs = 0;
            var scope;
            while(runs<q.variablesTest.maxRuns && !conditionSatisfied) {
                runs += 1;
                scope = new jme.Scope([q.scope]);
                var result = jme.variables.makeVariables(q.variablesTodo,scope,condition);
                conditionSatisfied = result.conditionSatisfied;
            }
            if(!conditionSatisfied) {
                throw(new Numbas.Error('jme.variables.question took too many runs to generate variables'));
            } else {
                q.scope = scope;
            }
            q.signals.trigger('variablesSet');
        });
        q.signals.on('variablesSet',function() {
            q.scope = new jme.Scope([q.scope]);
            q.scope.flatten();
            q.local_definitions = {
                variables: Object.keys(q.variablesTodo),
                functions: Object.keys(q.functionsTodo),
                rulesets: Object.keys(q.rulesets)
            };
            q.unwrappedVariables = {};
            var all_variables = q.scope.allVariables()
            for(var name in all_variables) {
                q.unwrappedVariables[name] = Numbas.jme.unwrapValue(all_variables[name]);
            }
            q.signals.trigger('variablesGenerated');
        });
        q.signals.on('variablesGenerated',function() {
            q.name = jme.contentsubvars(q.name,q.scope);
        });
        if(Numbas.display) {
            q.display = new Numbas.display.QuestionDisplay(q);
        }
        q.signals.on('partsGenerated', function() {
            var i = 0;
            q.parts.forEach(function(p) {
                var hasName = p.assignName(i,q.parts.length-1);
                i += hasName ? 1 : 0;
                if(p.gaps) {
                    var gi = 0;
                    p.gaps.forEach(function(g) {
                        var hasName = g.assignName(gi,p.gaps.length-1);
                        gi += hasName ? 1 : 0;
                    });
                }
                if(p.steps) {
                    var si = 0;
                    p.steps.forEach(function(s) {
                        var hasName = s.assignName(si,p.steps.length-1);
                        si += hasName ? 1 : 0;
                    });
                }
            });
        });
        q.signals.on(['variablesGenerated','partsGenerated'], function() {
            //initialise display - get question HTML, make menu item, etc.
            q.display && q.display.makeHTML();
        });
        q.signals.on(['variablesGenerated','partsGenerated'], function() {
            q.signals.trigger('ready');
        });
        q.signals.on('ready',function() {
            q.updateScore();
        });
        q.signals.on(['variablesGenerated','partsGenerated','HTMLAttached'], function() {
            q.display && q.display.showScore();
        });
    },
    generateVariables: function() {
        this.signals.trigger('generateVariables');
    },
    /** Load saved data about this question from storage
     * @fires Numbas.Question#variablesSet
     * @fires Numbas.Question#partsResumed
     * @listens Numbas.Question#event:partsGenerated
     * @listens Numbas.Question#event:ready
     */
    resume: function() {
        if(!this.store) {
            return;
        }
        var q = this;
        // check the suspend data was for this question - if the test is updated and the question set changes, this won't be the case!
        var qobj = this.store.loadQuestion(q);
        if(qobj.name && qobj.name!=q.name) {
            throw(new Numbas.Error('question.loaded name mismatch'));
        }
        for(var x in qobj.variables) {
            q.scope.setVariable(x,qobj.variables[x]);
        }
        q.signals.trigger('variablesSet');
        q.signals.on('partsGenerated', function() {
            q.parts.forEach(function(part) {
                if(loading) {
                    part.resume();
                }
            });
            q.signals.on('ready',function() {
                q.parts.forEach(function(part) {
                    part.steps.forEach(function(step) {
                        if(step.answered) {
                            step.submit();
                        }
                    });
                    if(part.answered) {
                        part.submit();
                    }
                });
            });
            q.signals.trigger('partsResumed');
        });
        q.signals.on('partsResumed',function() {
            q.adviceDisplayed = qobj.adviceDisplayed;
            q.answered = qobj.answered;
            q.revealed = qobj.revealed;
            q.submitted = qobj.submitted;
            q.visited = qobj.visited;
            q.score = qobj.score;
            if(q.revealed) {
                q.revealAnswer(true);
            } else if(q.adviceDisplayed) {
                q.getAdvice(true);
            }
            q.updateScore();
        });
    },
    /** XML definition of this question
     * @type {Element}
     */
    xml: null,
    /** Position of this question in the exam
     * @type {Number}
     */
    number: -1,
    /** Name - shouldn't be shown to students
     * @type {String}
     */
    name: '',
    /** The JME scope for this question. Contains variables, functions and rulesets defined in this question
     * @type {Numbas.jme.Scope}
     */
    scope: null,
    /** Maximum marks available for this question
     * @type {Number}
     */
    marks: 0,
    /** Student's score on this question
     * @type {Number}
     */
    score: 0,
    /** Has this question been seen by the student? For determining if you can jump back to this question, when {@link Numbas.Question.navigateBrowse} is disabled.
     * @type {Boolean}
     */
    visited: false,
    /** Has this question been answered satisfactorily?
     * @type {Boolean}
     */
    answered: false,
    /** Number of times this question has been submitted.
     * @type {Number}
     */
    submitted: 0,
    /** Has the advice been displayed?
     * @type {Boolean}
     */
    adviceDisplayed: false,
    /** Have the correct answers been revealed?
     * @type {Boolean}
     */
    revealed: false,
    /** Parts belonging to this question, in the order they're displayed.
     * @type {Numbas.parts.Part}
     */
    parts: [],
    /** Dictionary mapping part addresses (of the form `qXpY[gZ]`) to {@link Numbas.parts.Part} objects.
     * @type {Object.<Numbas.parts.Part>}
     */
    partDictionary: {},
    /** Associated display object
     * @type {Numbas.display.QuestionDisplay}
     */
    display: undefined,
    /** Callbacks to run when various events happen
     * @property {Array.<function>} HTMLAttached - Run when the question's HTML has been attached to the page.
     * @property {Array.<function>} variablesGenerated - Run when the question's variables have been generated.
     * @type {Object.<Array.<function>>}
     */
    callbacks: {
    },
    /** Leave this question - called when moving to another question, or showing an info page.
     * @see Numbas.display.QuestionDisplay.leave
     */
    leave: function() {
    this.display && this.display.leave();
    },
    /** Execute the question's JavaScript preamble - should happen as soon as the configuration has been loaded from XML, before variables are generated. 
     * @fires Numbas.Question#preambleRun
     */
    runPreamble: function() {
        with({
            question: this
        }) {
            var js = '(function() {'+this.preamble.js+'\n})()';
            try{
                eval(js);
            } catch(e) {
                var errorName = e.name=='SyntaxError' ? 'question.preamble.syntax error' : 'question.preamble.error';
                throw(new Numbas.Error(errorName,{'number':this.number+1,message:e.message}));
            }
        }
        this.signals.trigger('preambleRun');
    },
    /** Get the part object corresponding to a path
     * @param {Numbas.parts.partpath} path
     * @returns {Numbas.parts.Part}
     */
    getPart: function(path)
    {
        return this.partDictionary[path];
    },
    /** Show the question's advice
     * @param {Boolean} dontStore - Don't tell the storage that the advice has been shown - use when loading from storage!
     */
    getAdvice: function(dontStore)
    {
        this.adviceDisplayed = true;
    this.display && this.display.showAdvice(true);
        if(this.store && !dontStore) {
            this.store.adviceDisplayed(this);
        }
    },
    /** Reveal the correct answers to the student
     * @param {Boolean} dontStore - Don't tell the storage that the advice has been shown - use when loading from storage!
     */
    revealAnswer: function(dontStore)
    {
        this.revealed = true;
        //display advice if allowed
        this.getAdvice(dontStore);
        //part-specific reveal code. Might want to do some logging in future?
        for(var i=0; i<this.parts.length; i++) {
            this.parts[i].revealAnswer(dontStore);
        }
        if(this.display) {
            //display revealed answers
            this.display.end();
            this.display.revealAnswer();
            this.display.showScore();
        }
        if(this.store && !dontStore) {
            this.store.answerRevealed(this);
        }
        this.exam && this.exam.updateScore();
    },
    /** Validate the student's answers to the question. True if all parts are either answered or have no marks available.
     * @returns {Boolean}
     */
    validate: function()
    {
        var success = true;
        for(var i=0; i<this.parts.length; i++)
        {
            success = success && (this.parts[i].answered || this.parts[i].marks==0);
        }
        return success;
    },
    /** Has anything been changed since the last submission? If any part has `isDirty` set to true, return true.
     * @returns {Boolean}
     */
    isDirty: function()
    {
        if(this.revealed) {
            return false;
        }
        for(var i=0;i<this.parts.length; i++) {
            if(this.parts[i].isDirty)
                return true;
        }
        return false;
    },
    /** Show a warning and return true if the question is dirty.
     * @see Numbas.Question#isDirty
     * @returns {Boolean}
     */
    leavingDirtyQuestion: function() {
        if(this.answered && this.isDirty()) {
        Numbas.display && Numbas.display.showAlert(R('question.unsubmitted changes',{count:this.parts.length}));
            return true;
        }
    },
    /** Calculate the student's total score for this questoin - adds up all part scores
     */
    calculateScore: function()
    {
        var tmpScore=0;
        for(var i=0; i<this.parts.length; i++)
        {
            tmpScore += this.parts[i].score;
        }
        this.score = tmpScore;
        this.answered = this.validate();
    },
    /** Submit every part in the question */
    submit: function()
    {
        //submit every part
        for(var i=0; i<this.parts.length; i++)
        {
            this.parts[i].submit();
        }
        //validate every part
        //displays warning messages if appropriate,
        //and returns false if any part is not completed sufficiently
        this.answered = this.validate();
        //keep track of how many times question successfully submitted
        if(this.answered)
            this.submitted += 1;
        this.updateScore();
        if(this.exam && this.exam.adviceType == 'threshold' && 100*this.score/this.marks < this.adviceThreshold ) {
            this.getAdvice();
        }
        this.store && this.store.questionSubmitted(this);
    },
    /** Recalculate the student's score, update the display, and notify storage. */
    updateScore: function()
    {
        //calculate score - if warning is uiPrevent then score is 0
        this.calculateScore('uwNone');
        //update total exam score
        this.exam && this.exam.updateScore();
    //display score - ticks and crosses etc.
        this.display && this.display.showScore();
        //notify storage
        this.store && this.store.saveQuestion(this);
    },
    /** Add a callback function to run when the question's HTML is attached to the page
     *
     * @param {Function} fn
     * @deprecated Use {@link Numbas.Question#signals} instead.
     * @listens Numbas.Question#event:HTMLAttached
     */
    onHTMLAttached: function(fn) {
        this.signals.on('HTMLAttached',fn);
    },
    /** Add a callback function to run when the question's variables are generated (but before the HTML is attached)
     *
     * @param {Function} fn
     * @deprecated Use {@link Numbas.Question#signals} instead.
     * @listens Numbas.Question#event:variablesGenerated
     */
    onVariablesGenerated: function(fn) {
        this.signals.on('variablesGenerated',fn);
    }
};
});
