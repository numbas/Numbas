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
Numbas.queueScript('standard_parts',['parts/jme','parts/patternmatch','parts/numberentry','parts/matrixentry','parts/multipleresponse','parts/gapfill','parts/information','parts/extension','parts/custom_part_type'],function() {});
Numbas.queueScript('question',['base','schedule','jme','jme-variables','util','part','standard_parts'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
/** Create a {@link Numbas.Question} object from an XML definition.
 *
 * @memberof Numbas
 * @param {Element} xml
 * @param {number} number - The number of the question in the exam.
 * @param {Numbas.Exam} [exam] - The exam this question belongs to.
 * @param {Numbas.QuestionGroup} [group] - The group this question belongs to.
 * @param {Numbas.jme.Scope} [scope] - The global JME scope.
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 * @returns {Numbas.Question}
 */
var createQuestionFromXML = Numbas.createQuestionFromXML = function(xml, number, exam, group, scope, store) {
    try {
        var q = new Question(number, exam, group, scope, store);
        q.loadFromXML(xml);
        q.finaliseLoad();
    } catch(e) {
        throw(new Numbas.Error('question.error creating question',{number: number+1, message: e.message}));
    }
    return q;
}
/** Create a {@link Numbas.Question} object from a JSON object.
 *
 * @memberof Numbas
 * @param {object} data
 * @param {number} number - The number of the question in the exam.
 * @param {Numbas.Exam} [exam] - The exam this question belongs to.
 * @param {Numbas.QuestionGroup} [group] - The group this question belongs to.
 * @param {Numbas.jme.Scope} [scope] - The global JME scope.
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 * @returns {Numbas.Question}
 */
var createQuestionFromJSON = Numbas.createQuestionFromJSON = function(data, number, exam, group, scope, store) {
    try {
        var q = new Question(number, exam, group, scope, store);
        q.loadFromJSON(data);
        q.finaliseLoad();
    } catch(e) {
        throw(new Numbas.Error('question.error creating question',{number: number+1, message: e.message},e));
    }
    return q;
}
/** Keeps track of all info to do with an instance of a single question.
 *
 * @class
 * @memberof Numbas
 * @param {number} number - The index of this question in the exam (starting at 0).
 * @param {Numbas.Exam} [exam] - The parent exam.
 * @param {Numbas.QuestionGroup} [group] - The group this question belongs to.
 * @param {Numbas.jme.Scope} [gscope=Numbas.jme.builtinScope] - The global JME scope.
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 */
var Question = Numbas.Question = function( number, exam, group, gscope, store)
{
    var q = this;
    q.store = store;
    q.signals = new Numbas.schedule.SignalBox();
    q.signals.on('partsGenerated',function() {
        q.setErrorCarriedForwardBackReferences();
    })
    q.events = new Numbas.schedule.EventBox();
    q.exam = exam;
    q.tags = [];
    q.group = group;
    q.number = number;
    q.path = `q${this.number}`;
    gscope = gscope || (exam && exam.scope) || Numbas.jme.builtinScope;
    q.scope = new jme.Scope(gscope);
    q.scope.question = q;
    q.preamble = {
        'js': '',
        'css': ''
    };
    q.functionsTodo = [];
    q.variableDefinitions = [];
    q.variablesTodo = {};
    q.rulesets = {};
    q.variablesTest = {
        condition: '',
        maxRuns: 10
    };
    q.parts = [];
    q.partDictionary = {};
    q.extraPartOrder = [];
    q.objectives = [];
    q.penalties = [];
    q.extensions = [];
}

/** The question preamble has been loaded but not run yet- this happens before any variables, functions, rulesets or parts are generated.
 *
 * @event Numbas.Question#preambleLoaded
 * @see Numbas.Question#event:preambleRun
 */
/** The question preamble has been run.
 *
 * @event Numbas.Question#preambleRun
 */
/** The question's function definitions have been loaded, but the corresponding {@link Numbas.jme.funcObj} objects have not been added to the scope yet.
 *
 * @event Numbas.Question#functionsLoaded
 * @see Numbas.Question#event:functionsMade
 */
/** The question's functions have been made and added to the question's scope.
 *
 * @event Numbas.Question#functionsMade
 */
/** The question's ruleset  definitions have been loaded, but the {@link Numbas.jme.rules.Ruleset} objects have not been added to the scope yet.
 *
 * @event Numbas.Question#rulesetsLoaded
 * @see Numbas.Question#event:rulesetsMade
 */
/** The question's rulesets have been made and added to the question's scope.
 *
 * @event Numbas.Question#rulesetsMade
 */
/** Trigger this when you're ready to evaluate the question's variables. In an exam context, the {@link Numbas.Exam} object triggers this event.
 * If the question has been created standalone, this event must be triggered in order for the question to finish loading.
 *
 * @event Numbas.Question#generateVariables
 */
/** The variable definitions have been loaded, but their values have not been generated yet.
 *
 * @event Numbas.Question#variableDefinitionsLoaded
 * @see Numbas.Question#event:variablesSet
 * @see Numbas.Question#event:variablesGenerated
 */
/** The parts of the question have been generated.
 * If resuming an attempt, the parts have not yet been restored to the saved state.
 *
 * @event Numbas.Question#partsGenerated
 * @see Numbas.Question#event:partsResumed
 */
/** Triggered when resuming a saved attempt: the question's parts have been restored to the saved state.
 *
 * @event Numbas.Question#partsResumed
 */
/** The custom constant definitions have been loaded.
 *
 * @event Numbas.Question#constantsLoaded
 */
/** The custom constants have been evaluated and added to the scope
 *
 * @event Numbas.Question#constantsMade
 */
/** The variables have been evaluated, but {@link Numbas.Question.unwrappedVariables} has not been set yet.
 *
 * @event Numbas.Question#variablesSet
 */
/** The variables have been generated and added to the scope, and are ready to use.
 *
 * @event Numbas.Question#variablesGenerated
 */
/** The question advice has been shown to the student.
 *
 * @event Numbas.Question#adviceDisplayed
 */
/** The question is fully loaded and ready to use.
 *
 * @event Numbas.Question#ready
 */
/** The question's HTML has been generated and attached to the page.
 *
 * @event Numbas.Question#mainHTMLAttached
 */
/** The entire question, including each part's HTML, has been generated and attached to the page.
 *
 * @event Numbas.Question#HTMLAttached
 */

Question.prototype = /** @lends Numbas.Question.prototype */
{
    /** How should parts be shown? 
     *
     * * `all` - All available parts are generated straight away.
     * * `explore` - Parts are only generated when required.
     *
     * @type {string}
     */
    partsMode: 'all',

    /** Maximum available marks in explore mode.
     *
     * @type {number}
     */
    maxMarks: 0,

    /** When should information about objectives be shown to the student? ``'always'`` or ``'when-active'``.
     *
     * @type {string}
     */
    objectiveVisibility: 'always',

    /** When should information about penalties be shown to the student? ``'always'`` or ``'when-active'``.
     *
     * @type {string}
     */
    penaltyVisibility: 'always',

    /** In explore mode, the part that the student is currently looking at.
     *
     * @type {Numbas.parts.Part}
     */
    currentPart: null,

    /** Signals produced while loading this question.
     *
     * @type {Numbas.schedule.SignalBox} 
     * */
    signals: undefined,

    /** Storage engine.
     *
     * @type {Numbas.storage.BlankStorage}
     */
    store: undefined,

    /** Throw an error, with the question's identifier prepended to the message.
     *
     * @param {string} message
     * @param {object} args - Arguments for the error message.
     * @param {Error} [originalError] - If this is a re-thrown error, the original error object.
     * @fires Numbas.Question#event:error
     * @throws {Numbas.Error}
     */
    error: function(message, args, originalError) {
        if(originalError && originalError.originalMessages && originalError.originalMessages[0]=='question.error') {
            throw(originalError);
        }
        var nmessage = R.apply(this, [message, args]);
        if(nmessage != message) {
            originalError = new Error(nmessage);
            originalError.originalMessages = [message].concat(originalError.originalMessages || []);
        }
        var niceName = this.name;
        this.events.trigger('error', message, args, originalError);
        throw(new Numbas.Error('question.error',{number: this.number+1, message: nmessage},originalError));
    },

    /** Load the question's settings from an XML <question> node.
     *
     * @param {Element} xml
     * @fires Numbas.Question#preambleLoaded
     * @fires Numbas.Question#constantsLoaded
     * @fires Numbas.Question#functionsLoaded
     * @fires Numbas.Question#rulesetsLoaded
     * @fires Numbas.Question#variableDefinitionsLoaded
     * @fires Numbas.Question#partsGenerated
     * @listens Numbas.Question#variablesGenerated
     */
    loadFromXML: function(xml) {
        var q = this;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        q.xml = xml;
        q.originalXML = q.xml;

        tryGetAttribute(q,q.xml,'.',['name','customName','partsMode','maxMarks','objectiveVisibility','penaltyVisibility']);
        q.hasCustomName = q.customName.trim() != '';
        if(q.hasCustomName) {
            q.name = q.customName.trim();
        }

        var statementNode = q.xml.selectSingleNode('statement');
        q.statement = Numbas.xml.serializeMessage(statementNode);
        var adviceNode = q.xml.selectSingleNode('advice');
        q.advice = Numbas.xml.serializeMessage(adviceNode);

        var preambleNodes = q.xml.selectNodes('preambles/preamble');
        for(var i = 0; i<preambleNodes.length; i++) {
            var lang = preambleNodes[i].getAttribute('language');
            q.preamble[lang] = Numbas.xml.getTextContent(preambleNodes[i]);
        }
        q.signals.trigger('preambleLoaded');

        var extensionNodes = q.xml.selectNodes('extensions/extension');
        extensionNodes.forEach(function(node) {
            q.useExtension(node.textContent);
        });

        var part_defs = Array.from(q.xml.selectNodes('parts//part'));
        if(q.partsMode == 'explore' && part_defs.length == 0) {
            throw(new Numbas.Error('question.explore.no parts defined'));
        }

        var part_types = part_defs.forEach(function(p) {
            var type = tryGetAttribute(null,p,'.','type',[]);
            var cpt = Numbas.custom_part_types[type];
            if(!cpt) {
                return;
            }
            cpt.extensions.forEach(function(extension) {
                q.useExtension(extension)
            });
        });

        q.addExtensionScopes();

        q.constantsTodo = {
            builtin: [],
            custom: []
        }

        var builtinConstantNodes = q.xml.selectNodes('constants/builtin/constant');
        for(var i=0;i<builtinConstantNodes.length;i++) {
            var node = builtinConstantNodes[i];
            var data = {};
            tryGetAttribute(data,node,'.',['name','enable']);
            q.constantsTodo.builtin.push(data);
        }
        var customConstantNodes = q.xml.selectNodes('constants/custom/constant');
        for(var i=0;i<customConstantNodes.length;i++) {
            var node = customConstantNodes[i];
            var data = {};
            tryGetAttribute(data,node,'.',['name','value','tex']);
            q.constantsTodo.custom.push(data);
        }
        q.signals.trigger('constantsLoaded');

        q.functionsTodo = Numbas.xml.loadFunctions(q.xml,q.scope);
        q.signals.trigger('functionsLoaded');

        var tagNodes = q.xml.selectNodes('tags/tag');
        for(var i = 0; i<tagNodes.length; i++) {
            this.tags.push(tagNodes[i].textContent);
        }

        //make rulesets
        var rulesetNodes = q.xml.selectNodes('rulesets/set');
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

        var objectiveNodes = q.xml.selectNodes('objectives/scorebin');
        for(var i=0; i<objectiveNodes.length; i++) {
            var objective = {
                name: '',
                limit: 0,
                score: 0,
                answered: false
            };
            tryGetAttribute(objective, objectiveNodes[i], '.', ['name', 'limit']);
            q.objectives.push(objective);
        }

        var penaltyNodes = q.xml.selectNodes('penalties/scorebin');
        for(var i=0; i<penaltyNodes.length; i++) {
            var penalty = {
                name: '',
                limit: 0,
                score: 0,
                applied: false
            };
            tryGetAttribute(penalty, penaltyNodes[i], '.', ['name', 'limit']);
            q.penalties.push(penalty);
        }

        q.variableDefinitions = Numbas.xml.loadVariables(q.xml,q.scope);
        tryGetAttribute(q.variablesTest,q.xml,'variables',['condition','maxRuns'],[]);
        q.signals.trigger('variableDefinitionsLoaded');
        q.signals.on('variablesGenerated',function() {
            var doc = Sarissa.getDomDocument();
            doc.appendChild(q.originalXML.cloneNode(true));    //get a fresh copy of the original XML, to sub variables into
            q.xml = doc.selectSingleNode('question');
            q.xml.setAttribute('number',q.number);
        });
        q.signals.on('variablesGenerated', function() {
            var partNodes = q.xml.selectNodes('parts/part');
            switch(q.partsMode) {
                case 'all':
                    //load parts
                    for(var j = 0; j<partNodes.length; j++) {
                        var part = Numbas.createPartFromXML(j, partNodes[j], 'p'+j,q,null, q.store);
                        q.addPart(part,j);
                    }
                    break;
                case 'explore':
                    q.addExtraPart(0);
                    break;
            }
            q.signals.trigger('partsGenerated');
        });
    },

    /** Create a part whose definition is at the given index in the question's definition, using the given scope, and add it to this question.
     * The question's variables are remade using the given dictionary of changed variables.
     *
     * @param {number} def_index - The index of the part's definition in the question's list of part definitions.
     * @param {Numbas.jme.Scope} scope
     * @param {Object<Numbas.jme.token>} variables
     * @param {Numbas.parts.Part} [previousPart] - The part that this part follows on from.
     * @param {number} [index] - The position of the part in the parts list (added to the end if not given).
     * @fires Numbas.Question#event:addExtraPart
     * @returns {Numbas.parts.Part}
     */
    addExtraPart: function(def_index,scope,variables,previousPart,index) {
        var p;

        this.extraPartOrder.push(def_index);
        scope = scope || this.scope;
        variables = variables || {};
        var pscope = Numbas.jme.variables.remakeVariables(this.variablesTodo, variables, scope);

        if(this.xml) {
            p = this.createExtraPartFromXML(def_index,pscope);
        } else {
            p = this.createExtraPartFromJSON(def_index,pscope);
        }
        var index = index!==undefined ? index : this.parts.length;
        this.addPart(p,index);
        p.assignName(index,this.parts.length-1);
        p.previousPart = previousPart;
        this.setCurrentPart(p);
        this.updateScore();
        this.events.trigger('addExtraPart', p);
        return p;
    },

    /** Create an extra part with the given XML definition, using the given scope.
     *
     * @param {number} xml_index - The index of the part's definition in the XML.
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.parts.Part}
     */
    createExtraPartFromXML: function(xml_index,scope) {
        var xml = this.xml.selectNodes('parts/part')[xml_index].cloneNode(true);
        this.xml.selectSingleNode('parts').appendChild(xml);
        var j = this.parts.length;
        var p = Numbas.createPartFromXML(xml_index, xml,'p'+j,this,null,this.store, scope);
        return p;
    },

    /** Set the currently displayed part.
     *
     * @param {Numbas.parts.Part} part
     * @fires Numbas.Question#event:setCurrentPart
     */
    setCurrentPart: function(part) {
        this.currentPart = part;
        this.display && this.display.currentPart(part.display);
        this.events.trigger('setCurrentPart', part);
    },

    /** Load the question's settings from a JSON object.
     *
     * @param {object} data
     * @fires Numbas.Question#preambleLoaded
     * @fires Numbas.Question#functionsLoaded
     * @fires Numbas.Question#rulesetsLoaded
     * @fires Numbas.Question#variableDefinitionsLoaded
     * @fires Numbas.Question#partsGenerated
     * @listens Numbas.Question#variablesGenerated
     */
    loadFromJSON: function(data) {
        this.json = data;
        var q = this;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;
        tryLoad(data,['name','customName','partsMode','maxMarks','objectiveVisibility','penaltyVisibility','statement','advice'],q);


        var tags = tryGet(data,'tags');
        if(tags) {
            q.tags = tags.slice();
        }

        var extensions = tryGet(data,'extensions');
        if(extensions) {
            extensions.forEach(function(extension) {
                q.useExtension(extension);
            });
        }

        /**
         * Get the extensions used by custom part types.
         *
         * @param {object} pdata - A part definition.
         */
        function get_part_extensions(pdata) {
            var type = pdata.type;
            var cpt = Numbas.custom_part_types && Numbas.custom_part_types[type];
            if(!cpt) {
                return;
            }
            cpt.extensions.forEach(function(extension) {
                q.useExtension(extension)
            });
            if(pdata.gaps) {
                pdata.gaps.forEach(get_part_extensions);
            }
            if(pdata.steps) {
                pdata.steps.forEach(get_part_extensions);
            }
        }
        var parts = tryGet(data,'parts');
        if(parts) {
            parts.forEach(get_part_extensions);
        }

        q.addExtensionScopes();

        var preambles = tryGet(data,'preamble');
        if(preambles) {
            Object.keys(preambles).forEach(function(key) {
                q.preamble[key] = preambles[key];
            });
        }
        q.signals.trigger('preambleLoaded');

        q.constantsTodo = {
            builtin: [],
            custom: []
        };
        var builtin_constants = tryGet(data,'builtin_constants') || [];
        if(builtin_constants) {
            q.constantsTodo.builtin = Object.entries(builtin_constants).map(function(d){ 
                return {name: d[0], enable: d[1]};
            });
        }
        q.constantsTodo.custom = tryGet(data,'constants') || [];
        q.signals.trigger('constantsLoaded');

        var functions = tryGet(data,'functions');
        if(functions) {
            q.functionsTodo = Object.keys(functions).map(function(name) {
                var fd = functions[name];
                return {
                    name: name,
                    definition: fd.definition,
                    language: fd.language,
                    outtype: fd.type,
                    parameters: fd.parameters.map(function(p){ 
                        return {
                            name:p[0], 
                            type: p[1]
                        }
                    })
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

        var objectives = tryGet(data,'objectives');
        if(objectives) {
            objectives.forEach(function(od) {
                var objective = {
                    name: '',
                    limit: 0,
                    score: 0, 
                    answered: false
                };
                tryLoad(od,['name','limit'],objective);
                q.objectives.push(objective);
            });
        }
        var penalties = tryGet(data,'penalties');
        if(penalties) {
            penalties.forEach(function(pd) {
                var penalty = {
                    name: '',
                    limit: 0,
                    score: 0, 
                    applied: false
                };
                tryLoad(pd,['name','limit'],penalty);
                q.penalties.push(penalty);
            });
        }

        q.variableDefinitions = [];
        var variables = tryGet(data,'variables');
        if(variables) {
            q.variableDefinitions = Object.values(variables);
        }
        var variablesTest = tryGet(data,'variablesTest');
        if(variablesTest) {
            tryLoad(variablesTest,['condition','maxRuns'],q.variablesTest);
        }
        q.signals.trigger('variableDefinitionsLoaded');
        q.signals.on('variablesGenerated', function() {
            var parts = tryGet(data,'parts');
            if(parts) {
                switch(q.partsMode) {
                    case 'all':
                        parts.forEach(function(pd,i) {
                            var p = Numbas.createPartFromJSON(i, pd, 'p'+i, q, null, q.store);
                            q.addPart(p,i);
                        });
                        break;
                    case 'explore':
                        q.addExtraPart(0);
                        break;
                }
            }
            q.signals.trigger('partsGenerated');
        });
    },

    /** Record that this question uses the given extension.
     *
     * @param {string} extension
     */
    useExtension: function(extension) {
        if(this.extensions.contains(extension)) {
            return;
        }
        this.extensions.push(extension);
    },

    /** Extend this question's scope with scopes from any extensions used.
     */
    addExtensionScopes: function() {
        var scope = this.scope;
        for(let extension of this.extensions) {
            if(!Numbas.extensions[extension]) {
                throw(new Numbas.Error("question.required extension not available",{extension: extension}));
            }
            if(Numbas.extensions[extension] && ('scope' in Numbas.extensions[extension])) {
                scope = new Numbas.jme.Scope([scope,Numbas.extensions[extension].scope]);
            }
        }
        this.scope = scope;
    },

    /** Create a part with the given JSON definition, using the given scope, and add it to this question.
     * The question's variables are remade using the given dictionary of changed variables.
     *
     * @param {number} json_index - The index of the part's definition in the JSON.
     * @param {Numbas.jme.Scope} scope
     * @param {Object<Numbas.jme.token>} variables
     * @param {Numbas.parts.Part} [previousPart] - The part that this part follows on from.
     * @param {number} [index] - The position of the part in the parts list (added to the end if not given).
     * @returns {Numbas.parts.Part}
     */
    createExtraPartFromJSON: function(json_index,scope,variables,previousPart,index) {
        var data = this.json.parts[json_index];
        var p = Numbas.createPartFromJSON(json_index, data, 'p'+this.parts.length, this, null, this.store, scope);
        return p;
    },

    /** Set back references for adaptive marking: for each part, maintain a list of other parts which use that part in adaptive marking.
     */
    setErrorCarriedForwardBackReferences: function() {
        var q = this;
        this.allParts().forEach(function(p) {
            p.settings.errorCarriedForwardReplacements.forEach(function(r) {
                var p2 = q.getPart(r.part);
                p2.errorCarriedForwardBackReferences[p.path] = true;
            });
        });
    },

    /** A list of all parts in the question which can be answered by the student: top-level parts, gaps and steps.
     * Doesn't include alternative versions of parts.
     *
     * @returns {Array.<Numbas.parts.Part>}
     */
    allParts: function() {
        return this.parts.reduce(function(out, p) {
            return out.concat([p],p.gaps,p.steps);
        },[]);
    },

    /** Add a part to the question.
     *
     * @param {Numbas.parts.Part} part
     * @param {number} index
     * @fires Numbas.Question#event:addPart
     */
    addPart: function(part, index) {
        this.parts.splice(index, 0, part);
        this.display && this.display.addPart(part);
        this.updateScore();
        this.events.trigger('addPart', part, index);
    },

    /** Remove a part from the question.
     *
     * @param {Numbas.parts.Part} part
     * @fires Numbas.Question#event:removePart
     */
    removePart: function(part) {
        this.parts = this.parts.filter(function(p2) { return p2!=part; });
        this.display && this.display.removePart(part);
        this.updateScore();
        if(this.partsMode=='explore' && this.currentPart==part) {
            if(part.previousPart) {
                this.setCurrentPart(part.previousPart);
            } else {
                this.setCurrentPart(this.parts[0]);
            }
        }
        this.events.trigger('removePart', part);
    },

    /** Perform any tidying up or processing that needs to happen once the question's definition has been loaded.
     *
     * @fires Numbas.Question#functionsMade
     * @fires Numbas.Question#constantsMade
     * @fires Numbas.Question#rulesetsMade
     * @fires Numbas.Question#variablesSet
     * @fires Numbas.Question#variablesGenerated
     * @fires Numbas.Question#ready
     * @fires Numbas.Question#variablesTodoMade
     * @listens Numbas.Question#preambleLoaded
     * @listens Numbas.Question#functionsLoaded
     * @listens Numbas.Question#rulesetsLoaded
     * @listens Numbas.Question#generateVariables
     * @listens Numbas.Question#constantsMade
     * @listens Numbas.Question#functionsMade
     * @listens Numbas.Question#rulesetsMade
     * @listens Numbas.Question#variableDefinitionsLoaded
     * @listens Numbas.Question#variablesSet
     * @listens Numbas.Question#variablesGenerated
     * @listens Numbas.Question#variablesTodoMade
     * @listens Numbas.Question#partsGenerated
     * @listens Numbas.Question#ready
     * @listens Numbas.Question#HTMLAttached
     */
    finaliseLoad: function() {
        var q = this;

        q.displayNumber = q.exam ? q.exam.questionList.filter(function(q2) { return q2.number<q.number && !q2.hasCustomName; }).length : 0;

        q.signals.on('preambleLoaded', function() {
            q.runPreamble();
            if(q.partsMode=='explore') {
                if(q.maxMarks==0) {
                    q.objectives.forEach(function(o) {
                        q.maxMarks += o.limit;
                    });
                }
            }
        });
        q.signals.on(['preambleRun', 'constantsLoaded'], function() {
            var enabled_constants = {};
            q.constantsTodo.builtin.forEach(function(c) {
                c.name.split(',').forEach(function(name) {
                    enabled_constants[name] = c.enable;
                });
            });
            Numbas.jme.variables.makeConstants(Numbas.jme.builtin_constants, q.scope, enabled_constants);
            var defined_constants = Numbas.jme.variables.makeConstants(q.constantsTodo.custom,q.scope);
            q.signals.trigger('constantsMade');
        });
        q.signals.on(['preambleRun', 'functionsLoaded'], function() {
            var functions = Numbas.jme.variables.makeFunctions(q.functionsTodo,q.scope,{question:q});
            q.scope = new jme.Scope([q.scope,{functions: functions}]);
            q.signals.trigger('functionsMade');
        });
        q.signals.on(['preambleRun', 'rulesetsLoaded'],function() {
            Numbas.jme.variables.makeRulesets(q.rulesets,q.scope);
            q.signals.trigger('rulesetsMade');
        });
        q.signals.on(['variableDefinitionsLoaded', 'functionsMade', 'rulesetsMade', 'constantsMade'], function() {
            var todo = q.variablesTodo = {};
            var seen_names = {}
            q.variableDefinitions.forEach(function(def) {
                var name = jme.normaliseName(def.name.trim());
                var names = jme.variables.splitVariableNames(name);
                names.forEach(function(n) {
                    if(seen_names[n]) {
                        q.error("jme.variables.duplicate definition",{name:n});
                    }
                    seen_names[n] = true;
                });
                var definition = def.definition.toString().trim();
                if(name=='') {
                    if(definition=='') {
                        return;
                    }
                    q.error('jme.variables.empty name');
                }
                if(definition=='') {
                    q.error('jme.variables.empty definition',{name:name});
                }
                try {
                    var tree = Numbas.jme.compile(definition);
                } catch(e) {
                    q.error('variable.error in variable definition',{name:name});
                }
                var vars = Numbas.jme.findvars(tree,[],q.scope);
                todo[name] = {
                    tree: tree,
                    vars: vars
                };
            });
            q.signals.trigger('variablesTodoMade')
        });
        q.signals.on(['generateVariables','functionsMade','rulesetsMade', 'constantsMade', 'variablesTodoMade'], function() {
            var conditionSatisfied = false;
            var condition = jme.compile(q.variablesTest.condition);
            var runs = 0;
            var scope;
            var maxRuns = q.variablesTest.maxRuns;
            if(isNaN(maxRuns) || maxRuns < 1) {
                maxRuns = 1;
            }
            maxRuns = Math.min(1000000, maxRuns);
            while(runs<maxRuns && !conditionSatisfied) {
                runs += 1;
                scope = new jme.Scope([q.scope]);
                var result = jme.variables.makeVariables(q.variablesTodo,scope,condition);
                conditionSatisfied = result.conditionSatisfied;
            }
            if(!conditionSatisfied) {
                q.error('jme.variables.question took too many runs to generate variables');
            } else {
                q.scope = scope;
            }
            q.signals.trigger('variablesSet');
        });
        q.signals.on('variablesSet',function() {
            q.scope = new jme.Scope([q.scope]);
            q.scope.flatten();
            q.local_definitions = {
                variables: q.variableDefinitions.map(function(d) { return d.name; }).filter(function(n) { return n.trim(); }),
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
        if(Numbas.display && q.exam && q.exam.display) {
            q.display = new Numbas.display.QuestionDisplay(q);
        }
        q.signals.on('partsGenerated', function() {
            var i = 0;
            q.parts.forEach(function(p) {
                var hasName = p.assignName(i,q.parts.length-1);
                i += hasName ? 1 : 0;
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
        q.signals.on(['ready','HTMLAttached'], function() {
            q.display && q.display.showScore();
        });
    },

    /** Get this question's scope object.
     *
     * @returns {Numbas.jme.Scope}
     */
    getScope: function() {
        return this.scope;
    },

    /** Generate this question's variables.
     *
     * @fires Numbas.Question#generateVariables
     */
    generateVariables: function() {
        this.signals.trigger('generateVariables');
    },
    /** Load saved data about this question from storage.
     *
     * @fires Numbas.Question#variablesSet
     * @fires Numbas.Question#partsResumed
     * @listens Numbas.Question#partsGenerated
     * @listens Numbas.Question#ready
     */
    resume: function() {
        if(!this.store) {
            return;
        }
        var q = this;

        // check the suspend data was for this question - if the test is updated and the question set changes, this won't be the case!
        q.signals.on(['constantsMade'], function() {
            var qobj = q.store.loadQuestion(q);
            for(var x in qobj.variables) {
                q.scope.setVariable(x,qobj.variables[x]);
            }
            q.generateVariables();
            q.signals.on(['variablesSet','partsGenerated'], function() {
                q.parts.forEach(function(part) {
                    part.resume();
                });
                if(q.partsMode=='explore') {
                    qobj.parts.slice(1).forEach(function(pobj,qindex) {
                        var index = pobj.index;
                        var previousPart = q.getPart(pobj.previousPart);
                        var ppobj = q.store.loadPart(previousPart);
                        var i = 0;
                        for(;i<previousPart.nextParts.length;i++) {
                            if(previousPart.nextParts[i].index==index) {
                                break;
                            }
                        }
                        var np = previousPart.nextParts[i];
                        var npobj = ppobj.nextParts[i];
                        np.instanceVariables = q.store.loadVariables(npobj.variableReplacements,previousPart.getScope());
                        previousPart.makeNextPart(np,qindex+1);
                        np.instance.resume();
                    });
                }
                /** Submit a given part, setting its `resume` property so it doesn't save to storage.
                 *
                 * @param {Numbas.parts.Part} part
                 */
                function submit_part(part) {
                    part.resuming = true;
                    if(part.answered) {
                        part.submit();
                    }
                    if(part.resume_stagedAnswer!==undefined) {
                        part.stagedAnswer = part.resume_stagedAnswer;
                    }
                    part.resuming = false;
                }
                q.signals.on('ready',function() {
                    q.parts.forEach(function(part) {
                        part.steps.forEach(submit_part);
                        submit_part(part);
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
                q.display && q.display.resume();
                q.updateScore();
                if(q.partsMode=='explore') {
                    q.setCurrentPart(q.getPart(qobj.currentPart));
                }
                q.signals.trigger('resume');
            });
        });
    },
    /** XML definition of this question.
     *
     * @type {Element}
     */
    xml: null,
    /** Position of this question in the exam.
     *
     * @type {number}
     */
    number: -1,
    /** The question's name.
     *
     * @type {string}
     */
    name: '',
    /** The question's statement text.
     *
     * @type {string}
     */
    statement: '',
    /** The question's advice text.
     *
     * @type {string}
     */
    advice: '',
    /** The JME scope for this question. Contains variables, functions and rulesets defined in this question.
     *
     * @type {Numbas.jme.Scope}
     */
    scope: null,
    /** Maximum marks available for this question.
     *
     * @type {number}
     */
    marks: 0,
    /** Student's score on this question.
     *
     * @type {number}
     */
    score: 0,
    /** Has this question been seen by the student? For determining if you can jump back to this question, when {@link Numbas.Question.navigateBrowse} is disabled.
     *
     * @type {boolean}
     */
    visited: false,
    /** Has this question been answered satisfactorily?
     *
     * @type {boolean}
     */
    answered: false,
    /** Number of times this question has been submitted.
     *
     * @type {number}
     */
    submitted: 0,
    /** Has the advice been displayed?
     *
     * @type {boolean}
     */
    adviceDisplayed: false,
    /** Has this question been locked?
     *
     * @type {boolean}
     */
    locked: false,
    /** Have the correct answers been revealed?
     *
     * @type {boolean}
     */
    revealed: false,
    /** Parts belonging to this question, in the order they're displayed.
     *
     * @type {Numbas.parts.Part}
     */
    parts: [],
    /** Dictionary mapping part addresses (of the form `qXpY[gZ]`) to {@link Numbas.parts.Part} objects.
     *
     * @type {Object<Numbas.parts.Part>}
     */
    partDictionary: {},
    /** The indices in the definition of the extra parts that have been added to this question.
     *
     * @type {Array.<number>}
     */
    extraPartOrder: [],
    /** Associated display object.
     *
     * @type {Numbas.display.QuestionDisplay}
     */
    display: undefined,
    /** Callbacks to run when various events happen.
     *
     * @property {Array.<Function>} HTMLAttached - Run when the question's HTML has been attached to the page.
     * @property {Array.<Function>} variablesGenerated - Run when the question's variables have been generated.
     * @type {Object<Array.<Function>>}
     */
    callbacks: {
    },
    /** Leave this question - called when moving to another question, or showing an info page.
     *
     * @fires Numbas.Question#event:leave
     * @see Numbas.display.QuestionDisplay.leave
     */
    leave: function() {
        this.display && this.display.leave();
        this.events.trigger('leave');
    },
    /** Execute the question's JavaScript preamble - should happen as soon as the configuration has been loaded from XML, before variables are generated.
     *
     * @fires Numbas.Question#preambleRun
     */
    runPreamble: function() {
        var jfn = new Function(['question'], this.preamble.js);
        var res;
        try {
            res = jfn(this);
            return Promise.resolve(res).then(() => {
                this.signals.trigger('preambleRun');
            }).catch(e => {
                try {
                    this.error('question.preamble.error',{message: e.message});
                } catch(e) {
                    Numbas.schedule.halt(e);
                }
            });
        } catch(e) {
            var errorName = e.name=='SyntaxError' ? 'question.preamble.syntax error' : 'question.preamble.error';
            this.error(errorName,{message: e.message});
        }
    },
    /** Get the part object corresponding to a path.
     *
     * @param {Numbas.parts.partpath} path
     * @returns {Numbas.parts.Part}
     */
    getPart: function(path) {
        var p = this.partDictionary[path];
        if(!p) {
            this.error("question.no such part",{path:path});
        }
        return p;
    },

    /** Get the explore mode objective with the given name.
     *
     * @param {string} name
     * @returns {object}
     */
    getObjective: function(name) {
        return this.objectives.find(function(o){ return o.name==name; });
    },

    /** Get the explore mode penalty with the given name.
     *
     * @param {string} name
     * @returns {object}
     */
    getPenalty: function(name) {
        return this.penalties.find(function(p){ return p.name==name; });
    },

    /** Show the question's advice.
     *
     * @param {boolean} dontStore - Don't tell the storage that the advice has been shown - use when loading from storage!
     * @fires Numbas.Question#adviceDisplayed
     */
    getAdvice: function(dontStore) {
        if(!Numbas.is_instructor && this.exam && this.exam.settings.revealAdvice == 'never') {
            return;
        }
        this.adviceDisplayed = true;
        this.display && this.display.showAdvice(true);
        if(this.store && !dontStore) {
            this.store.adviceDisplayed(this);
        }
        this.signals.trigger('adviceDisplayed', dontStore);
    },

    /** Lock this question - the student can no longer change their answers.
     *
     * @fires Numbas.Question#event:locked
     */
    lock: function() {
        this.locked = true;
        this.allParts().forEach(function(part) {
            part.lock();
        });
        this.display && this.display.end();
        this.events.trigger('locked');
    },
    /** Reveal the correct answers to the student.
     *
     * @param {boolean} dontStore - Don't tell the storage that the advice has been shown - use when loading from storage!
     * @fires Numbas.Question#revealed
     */
    revealAnswer: function(dontStore) {
        this.lock();
        this.revealed = true;
        //display advice if allowed
        this.getAdvice(dontStore);
        //part-specific reveal code. Might want to do some logging in future?
        for(var i=0; i<this.parts.length; i++) {
            this.parts[i].revealAnswer(dontStore);
        }
        if(this.display) {
            //display revealed answers
            this.display.revealAnswer();
            this.display.showScore();
        }
        if(this.store && !dontStore) {
            this.store.answerRevealed(this);
        }
        this.exam && this.exam.updateScore();
        this.signals.trigger('revealed', dontStore);
    },
    /** Validate the student's answers to the question. True if all parts are either answered or have no marks available.
     *
     * @returns {boolean}
     */
    validate: function() {
        switch(this.partsMode) {
            case 'all':
                var success = true;
                for(var i=0; i<this.parts.length; i++) {
                    success = success && (this.parts[i].answered || this.parts[i].marks==0);
                }
                return success;
            case 'explore':
                var numAnswered = 0;
                var numMarked = 0;
                this.parts.forEach(function(p) {
                    if(p.doesMarking) {
                        numMarked += 1;
                        if(p.answered) {
                            numAnswered += 1;
                        }
                    }
                });
                return numMarked>0 && numAnswered == numMarked;
        }
    },
    /** Has anything been changed since the last submission? If any part has `isDirty` set to true, return true.
     *
     * @returns {boolean}
     */
    isDirty: function() {
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
     *
     * @see Numbas.Question#isDirty
     * @fires Numbas.Question#event:leavingDirtyQuestion
     * @returns {boolean}
     */
    leavingDirtyQuestion: function() {
        if(this.answered && this.isDirty()) {
            Numbas.display && Numbas.display.showAlert(R('question.unsubmitted changes',{count:this.parts.length}));
            this.events.trigger('leavingDirtyQuestion');
            return true;
        }
        return false;
    },
    /** Calculate the student's total score for this question - adds up all part scores.
     *
     * @fires Numbas.Question#event:calculateScore
     */
    calculateScore: function() {
        var q = this;
        var score = 0;
        var marks = 0;
        var credit = 0;

        switch(this.partsMode) {
            case 'all':
                for(var i=0; i<this.parts.length; i++) {
                    var part = this.parts[i];
                    score += part.score;
                    marks += part.marks;
                    credit += this.marks>0 ? part.credit*part.marks/this.marks : part.credit;
                }
                credit = this.marks>0 ? credit : credit/this.parts.length;
                break;
            case 'explore':
                marks = this.maxMarks;
                this.objectives.forEach(function(o) {
                    o.score = 0;
                    o.answered = false;
                });
                this.penalties.forEach(function(p) {
                    p.score = 0;
                    p.applied = false;
                });
                this.allParts().forEach(function(part) {
                    part.nextParts.forEach(function(np) {
                        if(np.instance) {
                            var penalty = q.getPenalty(np.penalty);
                            if(penalty) {
                                penalty.score += np.penaltyAmount;
                                penalty.applied = true;
                            }
                        }
                    });

                    var objective = q.getObjective(part.settings.exploreObjective);
                    if(!objective) {
                        return;
                    }
                    objective.score += part.score;
                    objective.answered = objective.answered || part.answered;

                });
                this.objectives.forEach(function(o) {
                    o.score = Math.min(o.limit,o.score);
                    score += o.score;
                });
                this.penalties.forEach(function(p) {
                    p.score = Math.min(p.limit,p.score);
                    score -= p.score;
                });
                score = Math.min(this.maxMarks, Math.max(0,score));
                credit = marks>0 ? score/marks : 0;
                break;
        }
        
        this.score = score;
        this.marks = marks;
        this.answered = this.validate();
        this.events.trigger('calculateScore');
    },
    /** Submit every part in the question.
     *
     * @fires Numbas.Question#event:pre-submit
     * @fires Numbas.Question#event:post-submit
     */
    submit: function() {
        this.events.trigger('pre-submit');
        //submit every part
        for(var i=0; i<this.parts.length; i++) {
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
        this.store && this.store.questionSubmitted(this);
        this.events.trigger('post-submit');
    },
    /** 
     * Recalculate the student's score, update the display, and notify storage. 
     *
     * @fires Numbas.Question#event:updateScore
     */
    updateScore: function() {
        //calculate score
        this.calculateScore();
        //update total exam score
        this.exam && this.exam.updateScore();
        //display score - ticks and crosses etc.
        this.display && this.display.showScore();
        //notify storage
        this.store && this.store.saveQuestion(this);
        this.events.trigger('updateScore');
    },
    /** Add a callback function to run when the question's HTML is attached to the page.
     *
     * @param {Function} fn
     * @deprecated Use {@link Numbas.Question#signals} instead.
     * @listens Numbas.Question#HTMLAttached
     */
    onHTMLAttached: function(fn) {
        this.signals.on('HTMLAttached',fn);
    },
    /** Add a callback function to run when the question's variables are generated (but before the HTML is attached).
     *
     * @param {Function} fn
     * @deprecated Use {@link Numbas.Question#signals} instead.
     * @listens Numbas.Question#variablesGenerated
     */
    onVariablesGenerated: function(fn) {
        this.signals.on('variablesGenerated',fn);
    }
};
});
