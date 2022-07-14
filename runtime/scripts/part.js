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
/** @file {@link Numbas.parts}, {@link Numbas.partConstructors}, {@link Numbas.createPart} and the generic {@link Numbas.parts.Part} object */
Numbas.queueScript('part',['base','jme','jme-variables','util','marking'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var marking = Numbas.marking;

var SAVE_STAGED_ANSWER_FREQUENCY = 5000;

/** Definitions of custom part types.
 *
 * @name custom_part_types
 * @type {object}
 * @memberof Numbas
 */

/** A unique identifier for a {@link Numbas.parts.Part} object, of the form `qXpY[gZ|sZ]`. Numbering starts from zero, and the `gZ` bit is used only when the part is a gap, and `sZ` is used if it's a step.
 *
 * @typedef Numbas.parts.partpath
 * @type {string}
 */
/** Part type constructors.
 * These functions aren't called directly - they're the original part constructor objects before they're extended with the generic part methods, kept for reference so their methods can be reused by other parts.
 *
 * @see Numbas.partConstructors
 * @namespace Numbas.parts
 * @memberof Numbas
 */
Numbas.parts = {};
/** Associate part type names with their object constructors.
 * These constructors are called by {@link Numbas.createPart} - they should be finalised constructors with all the generic part methods implemented.
 * Most often, you do this by extending {@link Numbas.parts.Part}.
 *
 * @memberof Numbas
 */
var partConstructors = Numbas.partConstructors = {};
/** Create a question part based on an XML definition.
 *
 * @memberof Numbas
 * @param {number} index - The index of the part's definition.
 * @param {Element} xml
 * @param {Numbas.parts.partpath} [path]
 * @param {Numbas.Question} [question]
 * @param {Numbas.parts.Part} [parentPart]
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 * @param {Numbas.jme.Scope} [scope] - Scope in which the part should evaluate JME expressions. If not given, the question's scope or {@link Numbas.jme.builtinScope} are used.
 * @fires Numbas.Part#event:finaliseLoad
 * @returns {Numbas.parts.Part}
 * @throws {Numbas.Error} "part.missing type attribute" if the top node in `xml` doesn't have a "type" attribute.
 */
var createPartFromXML = Numbas.createPartFromXML = function(index, xml, path, question, parentPart, store, scope) {
    var tryGetAttribute = Numbas.xml.tryGetAttribute;
    var type = tryGetAttribute(null,xml,'.','type',[]);
    if(type==null) {
        throw(new Numbas.Error('part.missing type attribute',{part:util.nicePartName(path)}));
    }
    var part = createPart(index, type, path, question, parentPart, store, scope);
    try {
        part.loadFromXML(xml);
        part.finaliseLoad();
        part.signals.trigger('finaliseLoad');
        if(Numbas.display && part.question && part.question.display) {
            part.initDisplay();
        }
    } catch(e) {
        if(e.originalMessage=='part.error') {
            throw(e);
        }
        part.error(e.message,{},e);
    }
    return part;
}
/** Create a question part based on an XML definition.
 *
 * @memberof Numbas
 * @param {number} index - The index of the part's definition.
 * @param {object} data
 * @param {Numbas.parts.partpath} [path]
 * @param {Numbas.Question} [question]
 * @param {Numbas.parts.Part} [parentPart]
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 * @param {Numbas.jme.Scope} [scope] - Scope in which the part should evaluate JME expressions. If not given, the question's scope or {@link Numbas.jme.builtinScope} are used.
 * @fires Numbas.Part#event:finaliseLoad
 * @returns {Numbas.parts.Part}
 * @throws {Numbas.Error} "part.missing type attribute" if `data` doesn't have a "type" attribute.
 */
var createPartFromJSON = Numbas.createPartFromJSON = function(index, data, path, question, parentPart, store, scope) {
    if(!data.type) {
        throw(new Numbas.Error('part.missing type attribute',{part:util.nicePartName(path)}));
    }
    var part = createPart(index, data.type, path, question, parentPart, store, scope);
    part.loadFromJSON(data);
    part.finaliseLoad();
    part.signals.trigger('finaliseLoad');
    return part;
}
/** Create a new question part.
 *
 * @see Numbas.partConstructors
 * @param {number} index - The index of the part's definition.
 * @param {string} type
 * @param {Numbas.parts.partpath} path
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store] - The storage engine to use.
 * @param {Numbas.jme.Scope} [scope] - Scope in which the part should evaluate JME expressions. If not given, the question's scope or {@link Numbas.jme.builtinScope} are used.
 * @returns {Numbas.parts.Part}
 * @throws {Numbas.Error} "part.unknown type" if the given part type is not in {@link Numbas.partConstructors}
 * @memberof Numbas
 */
var createPart = Numbas.createPart = function(index, type, path, question, parentPart, store, scope)
{
    if(partConstructors[type])
    {
        var cons = partConstructors[type];
        var part = new cons(index, path, question, parentPart, store);
        part.type = type;
        part.scope = part.makeScope(scope);
        return part;
    }
    else {
        throw(new Numbas.Error('part.unknown type',{part:util.nicePartName(path),type:type}));
    }
}

/** Base question part object.
 *
 * @class
 * @memberof Numbas.parts
 * @param {number} index - The index of the part's definition.
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @property {boolean} isStep - Is this part a step?
 * @property {boolean} isGap - Is this part a gap?
 * @see Numbas.createPart
 */
var Part = Numbas.parts.Part = function(index, path, question, parentPart, store)
{
    var p = this;
    p.signals = new Numbas.schedule.SignalBox();
    p.events = new Numbas.schedule.EventBox();
    this.index = index;
    this.store = store;
    //remember parent question object
    this.question = question;
    //remember parent part object, so scores can percolate up for steps/gaps
    this.parentPart = parentPart;
    //remember a path for this part, for stuff like marking and warnings
    this.path = path || 'p0';

    this.name = util.capitalise(util.nicePartName(path));

    this.label = '';

    if(this.question) {
        this.question.partDictionary[path] = this;
    }
    //initialise settings object
    this.settings = util.copyobj(Part.prototype.settings);

    //initialise gap and step arrays
    this.gaps = [];
    this.steps = [];
    this.alternatives = [];
    this.isStep = this.path.match(/s\d+$/)!==null;
    this.isGap = this.path.match(/g\d+$/)!==null;
    this.settings.errorCarriedForwardReplacements = [];
    this.errorCarriedForwardBackReferences = {};

    this.nextParts = [];

    this.pre_submit_cache = [];
    this.markingFeedback = [];
    this.finalised_result = {valid: false, credit: 0, states: []};
    this.warnings = [];
    this.scripts = {};

    this.save_staged_answer_debounce = Numbas.util.debounce(SAVE_STAGED_ANSWER_FREQUENCY);

    Object.defineProperty(this,"credit", {
        /** Proportion of available marks awarded to the student - i.e. `score/marks`. Penalties will affect this instead of the raw score, because of things like the steps marking algorithm.
         *
         * @type {number}
         * @returns {number}
         */
        get: function() {
            return this.creditFraction.toFloat();
        },
        set: function(credit) {
            this.creditFraction = math.Fraction.fromFloat(credit);
        }
    });
}
Part.prototype = /** @lends Numbas.parts.Part.prototype */ {
    /** Signals produced while loading this part.
     *
     * @type {Numbas.schedule.SignalBox} 
     * */
    signals: undefined,
    /** Storage engine.
     *
     * @type {Numbas.storage.BlankStorage}
     */
    store: undefined,
    /** XML defining this part.
     *
     * @type {Element}
     */
    xml: '',
    /** JSON defining this part.
     *
     * @type {object}
     */
    json: null,
    /** Load the part's settings from an XML `<part>` node.
     *
     * @param {Element} xml
     */
    loadFromXML: function(xml) {
        this.xml = xml;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        tryGetAttribute(this,this.xml,'.',['type','marks','useCustomName','customName']);
        tryGetAttribute(this.settings,this.xml,'.',['minimumMarks','enableMinimumMarks','stepsPenalty','showCorrectAnswer','showFeedbackIcon','exploreObjective','suggestGoingBack','useAlternativeFeedback'],[]);
        //load steps
        var stepNodes = this.xml.selectNodes('steps/part');
        if(!this.question || !this.question.exam || this.question.exam.settings.allowSteps) {
            for(var i=0; i<stepNodes.length; i++) {
                var step = Numbas.createPartFromXML(i, stepNodes[i], this.path+'s'+i, this.question, this, this.store);
                this.addStep(step,i);
            }
        } else {
            for(var i=0; i<stepNodes.length; i++) {
                stepNodes[i].parentElement.removeChild(stepNodes[i]);
            }
        }
        var alternativeNodes = this.xml.selectNodes('alternatives/part');
        for(var i=0; i<alternativeNodes.length; i++) {
            var alternative = Numbas.createPartFromXML(i, alternativeNodes[i], this.path+'a'+i, this.question, this, this.store);
            this.addAlternative(alternative,i);
        }
        var alternativeFeedbackMessageNode = this.xml.selectSingleNode('alternativefeedbackmessage');
        if(alternativeFeedbackMessageNode) {
            this.alternativeFeedbackMessage = Numbas.xml.transform(Numbas.xml.templates.question, alternativeFeedbackMessageNode);
        }
        // set variable replacements
        var adaptiveMarkingNode = this.xml.selectSingleNode('adaptivemarking');
        tryGetAttribute(this.settings,this.xml,adaptiveMarkingNode,['penalty','strategy'],['adaptiveMarkingPenalty','variableReplacementStrategy']);
        var variableReplacementsNode = this.xml.selectSingleNode('adaptivemarking/variablereplacements');
        var replacementNodes = variableReplacementsNode.selectNodes('replace');
        for(var i=0;i<replacementNodes.length;i++) {
            var n = replacementNodes[i];
            var vr = {}
            tryGetAttribute(vr,n,'.',['variable','part','must_go_first']);
            this.addVariableReplacement(vr.variable, vr.part, vr.must_go_first);
        }

        var nextPartsNode = this.xml.selectSingleNode('nextparts');
        var nextPartNodes = nextPartsNode.selectNodes('nextpart');
        for(var i=0;i<nextPartNodes.length;i++) {
            var nextPartNode = nextPartNodes[i];
            var np = new NextPart(this);
            np.loadFromXML(nextPartNode);
            this.nextParts.push(np);
        }

        // create the JME marking script for the part
        var markingScriptNode = this.xml.selectSingleNode('markingalgorithm');
        var markingScriptString = Numbas.xml.getTextContent(markingScriptNode).trim();
        var markingScript = {};
        tryGetAttribute(markingScript,this.xml,markingScriptNode,['extend']);
        if(markingScriptString) {
            // extend the base marking algorithm if asked to do so
            var extend_base = markingScript.extend;
            this.setMarkingScript(markingScriptString,extend_base);
        } else {
            this.markingScript = this.baseMarkingScript();
        }
        // custom JavaScript scripts
        var scriptNodes = this.xml.selectNodes('scripts/script');
        for(var i=0;i<scriptNodes.length; i++) {
            var name = scriptNodes[i].getAttribute('name');
            var order = scriptNodes[i].getAttribute('order');
            var script = Numbas.xml.getTextContent(scriptNodes[i]);
            this.setScript(name, order, script);
        }
    },
    /** Load the part's settings from a JSON object.
     *
     * @param {object} data
     */
    loadFromJSON: function(data) {
        this.json = data;
        var p = this;
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;
        tryLoad(data,['marks','useCustomName','customName'],this);
        this.marks = parseFloat(this.marks);
        tryLoad(data,['showCorrectAnswer', 'showFeedbackIcon', 'stepsPenalty','variableReplacementStrategy','adaptiveMarkingPenalty','exploreObjective','suggestGoingBack','useAlternativeFeedback'],this.settings);
        var variableReplacements = tryGet(data, 'variableReplacements');
        if(variableReplacements) {
            variableReplacements.map(function(vr) {
                p.addVariableReplacement(vr.variable, vr.part, vr.must_go_first);
            });
        }
        if('steps' in data) {
            data.steps.map(function(sd,i) {
                var s = createPartFromJSON(i, sd, p.path+'s'+i, p.question, p, p.store);
                p.addStep(s,i);
            });
        }
        var alternatives = tryGet(data,'alternatives');
        if(alternatives) {
            alternatives.forEach(function(ad,i) {
                var alternative = Numbas.createPartFromJSON(i, ad, p.path+'a'+i, p.question, p, p.store);
                p.addAlternative(alternative,i);
            });
        }
        tryLoad(data,'alternativeFeedbackMessage',this);
        var marking = {};
        tryLoad(data, ['customMarkingAlgorithm', 'extendBaseMarkingAlgorithm'], marking);
        if(marking.customMarkingAlgorithm) {
            this.setMarkingScript(marking.customMarkingAlgorithm, marking.extendBaseMarkingAlgorithm);
        } else {
            this.markingScript = this.baseMarkingScript();
        }
        if('scripts' in data) {
            for(var name in data.scripts) {
                var script = data.scripts[name];
                this.setScript(name, script.order, script.script);
            }
        }
        var nextParts = tryGet(data,'nextParts');
        if(nextParts) {
            nextParts.forEach(function(npdata) {
                var np = new NextPart(p);
                np.loadFromJSON(npdata);
                p.nextParts.push(np);
            });
        }
    },
    /** Perform any tidying up or processing that needs to happen once the part's definition has been loaded.
     */
    finaliseLoad: function() {
        this.applyScripts();
        if(this.customConstructor) {
            try {
                this.customConstructor.apply(this);
            } catch(e) {
                throw(e);
            }
        }
        var scope = this.getScope();
        this.nextParts.forEach(function(np) {
            if(np.penaltyAmountString!='') {
                np.penaltyAmount = np.penalty ? scope.evaluate(np.penaltyAmountString).value : 0;
            }
        });
    },
    /** Initialise this part's display object.
     * Only called if the question this part belongs to has a display.
     */
    initDisplay: function() {
        this.display = new Numbas.display.PartDisplay(this);
    },
    /** Load saved data about this part from storage.
     * The part is not resubmitted - you must do this afterwards, once any steps or gaps have been resumed.
     * 
     * @fires Numbas.Part#event:resume
     */
    resume: function() {
        this.resuming = true;
        var part = this;
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        this.answered = pobj.answered;
        this.stepsShown = pobj.stepsShown;
        this.stepsOpen = pobj.stepsOpen;
        this.resume_stagedAnswer = pobj.stagedAnswer;
        this.steps.forEach(function(s){ s.resume() });
        this.pre_submit_cache = pobj.pre_submit_cache;
        this.alternatives.forEach(function(alt,i) {
            var aobj = pobj.alternatives[i];
            if(!aobj) {
                return;
            }
            alt.pre_submit_cache = aobj.pre_submit_cache
        });
        var scope = this.getScope();
        this.display && this.display.updateNextParts();
        this.display && this.question && this.question.signals.on(['ready','HTMLAttached'], function() {
            part.display.restoreAnswer(part.resume_stagedAnswer!==undefined ? part.resume_stagedAnswer : part.studentAnswer);
        })
        this.signals.trigger('resume');
        this.resuming = false;
    },
    /** Add a step to this part.
     *
     * @param {Numbas.parts.Part} step
     * @param {number} index - Position of the step.
     * @fires Numbas.Part#event:addStep
     */
    addStep: function(step, index) {
        step.isStep = true;
        this.steps.splice(index,0,step);
        this.stepsMarks += step.marks;
        this.events.trigger('addStep', step, index);
    },
    /** Add an alternative to this part.
     *
     * @param {Numbas.parts.Part} alternative
     * @param {number} index - Position of the alternative.
     * @fires Numbas.Part#event:addAlternative
     */
    addAlternative: function(alternative, index) {
        alternative.isAlternative = true;
        this.alternatives.splice(index,0,alternative);
        this.events.trigger('addAlternative', alternative, index);
    },

    /** A definition of a variable replacement for adaptive marking.
     *
     * @typedef Numbas.parts.adaptive_variable_replacement_definition
     * @property {string} variable - The name of the variable to replace.
     * @property {string} part - The path of the part to use.
     * @property {boolean} must_go_first - Must the referred part be answered before this part can be marked?
     */

    /** Add a variable replacement for this part's adaptive marking.
     *
     * @param {string} variable - The name of the variable to replace.
     * @param {string} part - The path of the part to use.
     * @param {boolean} must_go_first - Must the referred part be answered before this part can be marked?
     * @fires Numbas.Part#event:addVariableReplacement
     */
    addVariableReplacement: function(variable, part, must_go_first) {
        var vr = {
            variable: jme.normaliseName(variable,this.getScope()),
            part: part,
            must_go_first: must_go_first
        };
        this.settings.hasVariableReplacements = true;
        this.settings.errorCarriedForwardReplacements.push(vr);
        this.events.trigger('addVariableReplacement', variable, part);
    },
    /** The base marking script for this part.
     *
     * @abstract
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() {},
    /** Set this part's JME marking script.
     *
     * @param {string} markingScriptString
     * @param {boolean} extend_base - Does this script extend the built-in script?
     */
    setMarkingScript: function(markingScriptString, extend_base) {
        var p = this;
        var oldMarkingScript = this.baseMarkingScript();
        var algo = this.markingScript = new marking.MarkingScript(markingScriptString, extend_base ? oldMarkingScript : undefined, this.getScope());
        // check that the required notes are present
        var requiredNotes = ['mark','interpreted_answer'];
        requiredNotes.forEach(function(name) {
            if(!(name in algo.notes)) {interpreted_answer
                p.error("part.marking.missing required note",{note:name});
            }
        });
    },
    /** Set a custom JavaScript script.
     *
     * @param {string} name - The name of the method to override.
     * @param {string} order - When should the script run? `'instead'`, `'before'` or `'after'`.
     * @param {string} script - The source code of the script.
     * @see {Numbas.parts.Part#applyScripts}
     */
    setScript: function(name,order,script) {
        var withEnv = {
            variables: this.question ? this.question.unwrappedVariables : {},
            question: this.question,
            part: this
        };
        if(name=='mark') {
            // hack on a finalised_state for old marking scripts
            script = 'var res = (function(studentAnswer,scope) {'+script+'\n}).apply(this,arguments); \
this.answered = true; \
if(res) { \
    return res; \
} else {\
    res = { \
        states: {mark: this.markingFeedback.slice()}, \
        values: {interpreted_answer: Numbas.jme.wrapValue(arguments[0])}, \
        state_valid: {mark: true, interpreted_answer: true}, \
        state_errors: {}, \
        added_because_missing: true \
    }; \
    this.markingFeedback = []; \
    this.credit = 0; \
    return res; \
} \
';
            name = 'mark_answer';
        }
        with(withEnv) {
            script = eval('(function(){try{'+script+'\n}catch(e){e = new Numbas.Error(\'part.script.error\',{path:this.name,script:name,message:e.message}); Numbas.showError(e); throw(e);}})');
        }
        this.scripts[name] = {script: script, order: order};
    },
    /** The question this part belongs to.
     *
     * @type {Numbas.Question}
     */
    question: undefined,
    /** Reference to parent of this part, if this is a gap or a step.
     *
     * @type {Numbas.parts.Part}
     */
    parentPart: undefined,
    /** A question-wide unique 'address' for this part.
     *
     * @type {Numbas.parts.partpath}
     */
    path: '',
    /** A readable name for this part, to show to the student.
     * Change it with {@link Numbas.parts.Part#setName}.
     *
     * @type {string}
     */
    name: '',
    /** Should a custom name be used?
     *
     * @type {boolean}
     */
    useCustomName: false,
    /** Custom name for this part, or null if none.
     * Variables will be substituted into this string from the part's scope.
     *
     * @type {string}
     */
    customName: '',
    /** Assign a name to this part, and then assign names to its children.
     *
     * @param {number} index - The number of parts before this one that have names.
     * @param {number} siblings - The number of siblings this part has.
     * @returns {boolean} `true` if this part has a name that should increment the label counter.
     */
    assignName: function(index,siblings) {
        var p = this;

        if(this.useCustomName) {
            this.name = jme.contentsubvars(this.customName,this.getScope(),false);
        } else if(this.isGap) {
            this.name = util.capitalise(R('gap'))+' '+index;
        } else if(this.isStep) {
            this.name = util.capitalise(R('step'))+' '+index;
        } else if(siblings==0) {
            this.name = '';
        } else {
            this.name = util.letterOrdinal(index)+')';
        }

        /** Assign names to the given child parts.
         *
         * @param {Array.<Numbas.parts.Part>} children
         */
        function assign_child_names(children) {
            if(!children) {
                return;
            }
            var i = 0;
            children.forEach(function(c) {
                var hasName = c.assignName(i,children.length-1);
                i += hasName ? 1 : 0;
            });
        }

        assign_child_names(this.gaps);
        assign_child_names(this.steps);
        assign_child_names(this.alternatives);

        this.display && this.display.setName(this.name);
        return this.name != '';
    },
    /** This part's type, e.g. "jme", "numberentry", ...
     *
     * @type {string}
     */
    type: '',
    /** Maximum marks available for this part.
     *
     * @type {number}
     */
    marks: 0,
    /** Marks available for the steps, if any.
     *
     * @type {number}
     */
    stepsMarks: 0,
    /** Credit as a fraction. Used to avoid simple floating point errors.
     *
     * @type {Numbas.math.Fraction}
     */
    creditFraction: new math.Fraction(0,1),
    /** Student's score on this part.
     *
     * @type {number}
     */
    score: 0,
    /** Messages explaining how marks were awarded.
     *
     * @type {Array.<Numbas.parts.feedbackmessage>}
     */
    markingFeedback: [],
    /** The result of the last marking run.
     *
     * @type {Numbas.marking.finalised_state}
     */
    finalised_result: {valid: false, credit: 0, states: []},
    /** Warnings shown next to the student's answer.
     *
     * @type {Array.<string>}
     */
    warnings: [],
    /** Has the student changed their answer since last submitting?
     *
     * @type {boolean}
     */
    isDirty: false,
    /** Student's answers as visible on the screen (not necessarily yet submitted).
     *
     * @type {Array.<string>}
     */
    stagedAnswer: undefined,

    /** Has this part been answered?
     *
     * @type {boolean}
     */
    answered: false,

    /** Child gapfill parts.
     *
     * @type {Numbas.parts.Part[]}
     */
    gaps: [],
    /** Child step parts.
     *
     * @type {Numbas.parts.Part[]}
     */
    steps: [],
    /** Child alternative parts.
     *
     * @type {Numbas.parts.Part[]}
     */
    alternatives: [],
    /** Feedback message shown if this part is used as an alternative.
     *
     * @type {string}
     */
    alternativeFeedbackMessage: '',
    /** Have the steps been show for this part?
     *
     * @type {boolean}
     */
    stepsShown: false,
    /** Is the steps display open?
     *
     * @type {boolean}
     */
    stepsOpen: false,
    /** True if this part should be resubmitted because another part it depended on has changed.
     *
     * @type {boolean}
     */
    shouldResubmit: false,
    /** Does this mark do any marking? False for information only parts.
     *
     * @type {boolean}
     */
    doesMarking: true,
    /** Has the answer to this part been revealed?
     *
     * @type {boolean}
     */
    revealed: false,
    /** Is this part locked? If false, the student can change and submit their answer.
     *
     * @type {boolean}
     */
    locked: false,
    /** Properties set when the part is generated.
     *
     * @type {object}
     * @property {number} stepsPenalty - Number of marks to deduct when the steps are shown.
     * @property {boolean} enableMinimumMarks - Is there a lower limit on the score the student can be awarded for this part?
     * @property {number} minimumMarks - Lower limit on the score the student can be awarded for this part.
     * @property {boolean} showCorrectAnswer - Show the correct answer on reveal?
     * @property {boolean} showFeedbackIcon - Show the tick/cross feedback symbol after this part is submitted?
     * @property {boolean} hasVariableReplacements - Does this part have any variable replacement rules?
     * @property {string} variableReplacementStrategy - `'originalfirst'` or `'alwaysreplace'`.
     * @property {string} exploreObjective - Name of the objective that this part's score counts towards.
     * @property {string} suggestGoingBack - In explore mode, suggest to the student to go back to the previous part after completing this one?
     * @property {number} adaptiveMarkingPenalty - Number of marks to deduct when adaptive marking is used.
     * @property {boolean} useAlternativeFeedback - Show all feedback from an alternative answer? If false, only the alternative feedback message is shown.
     * @property {Array.<Numbas.parts.adaptive_variable_replacement_definition>} errorCarriedForwardReplacements - Variable replacements to make during adaptive marking.
     */
    settings:
    {
        stepsPenalty: 0,
        enableMinimumMarks: true,
        minimumMarks: 0,
        showCorrectAnswer: true,
        showFeedbackIcon: true,
        hasVariableReplacements: false,
        variableReplacementStrategy: 'originalfirst',
        exploreObjective: null,
        suggestGoingBack: false,
        adaptiveMarkingPenalty: 0,
        useAlternativeFeedback: false,
        errorCarriedForwardReplacements: []
    },

    /** The script to mark this part - assign credit, and give messages and feedback.
     *
     * @type {Numbas.marking.MarkingScript}
     */
    markingScript: null,

    /** Throw an error, with the part's identifier prepended to the message.
     *
     * @param {string} message
     * @param {object} args - Arguments for the error message.
     * @param {Error} [originalError] - If this is a re-thrown error, the original error object.
     * @fires Numbas.Part#event:error
     * @throws {Numbas.Error}
     */
    error: function(message, args, originalError) {
        var nmessage = R.apply(this,[message,args]);
        if(nmessage!=message) {
            originalError = new Error(nmessage);
            originalError.originalMessages = [message].concat(originalError.originalMessages || []);
        }
        var niceName = this.name;
        this.events.trigger('error', message, args, originalError);
        throw(new Numbas.Error('part.error',{path: niceName, message: nmessage},originalError));
    },
    /** The name of the input widget this part uses, if any.
     *
     * @returns {string}
     */
    input_widget: function() {
        return null;
    },
    /** Options for this part's input widget.
     * 
     * @returns {object}
     */
    input_options: function() {
        return {};
    },
    applyScripts: function() {
        var part = this;
        this.originalScripts = {};
        for(var name in this.scripts) {
            var script_dict = this.scripts[name];
            var order = script_dict.order;
            var script = script_dict.script;
            switch(name) {
                case 'constructor':
                    this.customConstructor = script;
                    break;
                default:
                    var originalScript = this[name];
                    /** Create a function which runs `script` (instead of the built-in script).
                     *
                     * @param {Function} script
                     * @returns {Function}
                     */
                    function instead(script) {
                        return function() {
                            return script.apply(part,arguments);
                        }
                    }
                    /** Create a function which runs `script` before `originalScript`.
                     *
                     * @param {Function} script
                     * @param {Function} originalScript
                     * @returns {Function}
                     */
                    function before(script,originalScript) {
                        return function() {
                            script.apply(part,arguments);
                            return originalScript.apply(part,arguments);
                        }
                    }
                    /** Create a function which runs `script` after `originalScript`.
                     *
                     * @param {Function} script
                     * @param {Function} originalScript
                     * @returns {Function}
                     */
                    function after(script,originalScript) {
                        return function() {
                            var original_result = originalScript.apply(part,arguments);
                            var after_result = script.apply(part,arguments);
                            if(!after_result || (after_result.added_because_missing && after_result.states && after_result.states.mark && after_result.states.mark.length==0)) {
                                return original_result;
                            }
                            return after_result;
                        }
                    }
                    switch(order) {
                        case 'instead':
                            this[name] = instead(script);
                            break;
                        case 'before':
                            this[name] = before(script,originalScript);
                            break;
                        case 'after':
                            this[name] = after(script,originalScript);
                            break;
                    }
            }
        }
    },
    /** Associated display object. It is not safe to assume this is always present - in the editor, parts have no display.
     *
     * @type {Numbas.display.PartDisplay}
     */
    display: undefined,
    /** Give the student a warning about this part.
     *
     * @param {string} warning
     * @fires Numbas.Part#event:giveWarning
     * @see Numbas.display.PartDisplay.warning
     */
    giveWarning: function(warning)
    {
        this.warnings.push(warning);
        this.display && this.display.warning(warning);
        this.events.trigger('giveWarning', warning);
    },
    /** Set the list of warnings.
     *
     * @param {Array.<string>} warnings
     * @see Numbas.display.PartDisplay.warning
     */
    setWarnings: function(warnings) {
        this.warnings = warnings;
        this.display && this.display.setWarnings(warnings);
    },
    /** Remove all warnings.
     *
     * @see Numbas.display.PartDisplay.warning
     */
    removeWarnings: function() {
        this.setWarnings([]);
    },

    /** The total marks available for this part, after applying adaptive marking and steps penalties.
     *
     * @returns {number}
     */
    availableMarks: function() {
        var marks = this.marks;
        if(this.adaptiveMarkingUsed) {
            marks -= this.settings.adaptiveMarkingPenalty;
        }
        var stepsPart = this.isGap ? this.parentPart : this;
        if(stepsPart.steps.length && stepsPart.stepsShown) {
            var stepsPenalty = stepsPart.settings.stepsPenalty;
            if(this.isGap && this.parentPart.marks>0) {
                stepsPenalty *= this.marks / this.parentPart.marks;
            }
            marks  -= stepsPenalty;
        }
        marks = Math.max(Math.min(this.marks,marks),0);
        return marks;
    },

    /** Calculate the student's score based on their submitted answers.
     *
     * Calls the parent part's `calculateScore` method at the end.
     * 
     * @fires Numbas.Part#event:calculateScore
     */
    calculateScore: function()
    {
        var marks = this.availableMarks();
        if(this.steps.length && this.stepsShown) {
            var oScore = this.score = marks * this.credit;     //score for main keypart
            var stepsScore = 0, stepsMarks=0;
            for(var i=0; i<this.steps.length; i++)
            {
                stepsScore += this.steps[i].score;
                stepsMarks += this.steps[i].marks;
            }
            this.score += stepsScore;                        //add score from steps to total score
            this.score = Math.min(this.score,marks)    //if too many marks are awarded for steps, it's possible that getting all the steps right leads to a higher score than just getting the part right. Clip the score to avoid this.
            this.applyScoreLimits();
            if(stepsMarks!=0 && stepsScore!=0)
            {
                if(this.credit==1)
                    this.markingComment(R('part.marking.steps no matter'));
                else
                {
                    var change = this.score - oScore;
                    if(this.submitting) {
                        this.markingComment(R('part.marking.steps change',{count:change}));
                    }
                }
            }
        }
        else
        {
            this.score = this.credit * marks;
            this.applyScoreLimits();
        }
        if(this.revealed) {
            this.score = 0;
        }
        if(this.parentPart && !this.parentPart.submitting)
            this.parentPart.calculateScore();
        this.events.trigger('calculateScore');
        this.display && this.display.showScore(this.answered);
    },

    /** Make sure the awarded score is between the minimum and maximum available.
     */
    applyScoreLimits: function() {
        var marks = this.availableMarks();
        if(this.settings.enableMinimumMarks && this.score<this.settings.minimumMarks) {
            this.score = this.settings.minimumMarks;
            this.creditFraction = marks!=0 ? math.Fraction.fromFloat(this.settings.minimumMarks,marks) : 0;
            this.markingComment(R('part.marking.minimum score applied',{score:this.settings.minimumMarks}));
        }
        if(this.score>marks) {
            this.finalised_result.states.push(Numbas.marking.feedback.sub_credit(this.credit-1, R('part.marking.maximum score applied',{score:marks})));
            this.score = marks;
            this.creditFraction = math.Fraction.one;
            this.markingComment(R('part.marking.maximum score applied',{score:marks}));
        }
    },

    /** Update the stored answer from the student (called when the student changes their answer, but before submitting).
     *
     * @param {*} answer
     * @param {boolean} dontStore - Don't tell the storage that this is happening - use when loading from storage to avoid callback loops.
     * @fires Numbas.Part#event:storeAnswer
     * @see {Numbas.parts.Part.stagedAnswer}
     */
    storeAnswer: function(answer,dontStore) {
        var p = this;

        this.stagedAnswer = answer;
        this.setDirty(true);
        this.removeWarnings();

        if(!dontStore) {
            if(!this.question || !this.question.exam || !this.question.exam.loading) {
                this.store && this.save_staged_answer_debounce(function() {
                    p.store.storeStagedAnswer(p);
                })
            }
            this.events.trigger('storeAnswer');
        }
    },
    /** Call when the student changes their answer, or submits - update {@link Numbas.parts.Part.isDirty}.
     *
     * @param {boolean} dirty
     * @fires Numbas.Part#event:setDirty
     */
    setDirty: function(dirty) {
        this.isDirty = dirty;
        if(this.display) {
            this.display && this.display.isDirty(dirty);
            if(dirty && this.parentPart && !this.isStep && !this.parentPart.submitting) {
                this.parentPart.setDirty(true);
            }
            this.question && this.question.display && this.question.display.isDirty(this.question.isDirty());
        }
        this.events.trigger('setDirty', dirty);
    },
    /** Get a JME scope for this part.
     * If `this.question` is set, use the question's scope. Otherwise, use {@link Numbas.jme.builtinScope}.
     *
     * @returns {Numbas.jme.Scope}
     */
    getScope: function() {
        if(!this.scope) {
            this.scope = this.makeScope();
        }
        return this.scope;
    },

    /** Make the scope for this part. 
     *
     * @param {Numbas.jme.Scope} [parentScope] - An optional parent scope. If not given, the following are tried: a parent part, the question this part belongs to, `Numbas.jme.builtinScope`.
     * @fires Numbas.Part#event:makeScope
     * @returns {Numbas.jme.Scope}
     */
    makeScope: function(parentScope) {
        if(!parentScope) {
            if(this.parentPart) {
                parentScope = this.parentPart.getScope();
            } else if(this.question) {
                parentScope = this.question.scope;
            } else {
                parentScope = new Numbas.jme.Scope(Numbas.jme.builtinScope);
            }
        }
        var scope = new Numbas.jme.Scope([parentScope]);
        scope.setVariable('part_path',new Numbas.jme.types.TString(this.path));
        scope.part = this;
        this.events.trigger('makeScope');
        return scope;
    },

    /** Mark this part, using adaptive marking when appropriate.
     * @fires Numbas.Part#event:pre-markAdaptive
     * @fires Numbas.Part#event:post-markAdaptive
     * @returns {Numbas.parts.marking_results}
     */
    markAdaptive: function() {
        this.events.trigger('pre-markAdaptive');
        
        if(!this.doesMarking) {
            return;
        }
        this.setStudentAnswer();

        // save existing feedback
        var existing_feedback = {
            warnings: this.warnings.slice(),
            markingFeedback: this.markingFeedback.slice()
        };
        
        var settings = this.isAlternative ? this.parentPart.settings : this.settings;

        var result;
        var try_replacement;
        var hasReplacements = this.getErrorCarriedForwardReplacements().length>0;
        if(settings.variableReplacementStrategy=='originalfirst' || !hasReplacements) {
            var result_original = this.markAgainstScope(this.getScope(),existing_feedback,'');
            if(result_original.waiting_for_pre_submit) {
                return result_original;
            }
            result = result_original;
            var try_replacement = settings.hasVariableReplacements && (!result.answered || result.credit<1);
        }
        if(settings.variableReplacementStrategy=='alwaysreplace' && hasReplacements) {
            try_replacement = true;
        }
        if((!this.question || this.question.partsMode!='explore') && try_replacement) {
            try {
                var scope = this.errorCarriedForwardScope();
                var result_replacement = this.markAgainstScope(scope,existing_feedback,'adaptive ');
                if(result_replacement.waiting_for_pre_submit) {
                    return result_replacement;
                }
                if(!(result_original) || (result_replacement.answered && result_replacement.credit>result_original.credit)) {
                    result = result_replacement;
                    result.finalised_result.states.splice(0,0,Numbas.marking.feedback.feedback(R('part.marking.used variable replacements')));
                    result.adaptiveMarkingUsed = true;
                }
            } catch(e) {
                if(e.originalMessage=='part.marking.variable replacement part not answered') {
                    this.markingComment(e.message);
                } else {
                    try{
                        this.error(e.message,{},e);
                    } catch(pe) {
                        console.error(pe.message);
                        var errorFeedback = [
                            Numbas.marking.feedback.feedback(R('part.marking.error in adaptive marking',{message: e.message}))
                        ];
                        if(!result) {
                            result = {
                                warnings: [],
                                markingFeedback: errorFeedback,
                                finalised_result: {
                                    valid: false,
                                    credit: 0,
                                    states: errorFeedback
                                },
                                values: {},
                                credit: 0,
                                script_result: {
                                    state_errors: {
                                        mark: pe
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        this.events.trigger('post-markAdaptive');
        return result;
    },

    /** Wait for a promise to resolve before submitting.
     *
     * @param {Promise} promise
     */
    wait_for_pre_submit: function(promise) {
        var p = this;
        this.waiting_for_pre_submit = promise;
        if(this.display) {
            this.display.waiting_for_pre_submit(true);
        }
        promise.then(function() {
            p.waiting_for_pre_submit = false;
            p.submit();
            if(p.display) {
                p.display.waiting_for_pre_submit(false);
            }
        });
    },

    /** Submit the student's answers to this part - remove warnings. save answer, calculate marks, update scores.
     * @fires Numbas.Part#event:pre-submit
     * @fires Numbas.Part#event:post-submit
     */
    submit: function() {
        this.events.trigger('pre-submit');
        var p = this;
        this.shouldResubmit = false;

        this.credit = 0;
        this.markingFeedback = [];
        this.finalised_result = {valid: false, credit: 0, states: []};

        if(this.waiting_for_pre_submit) {
            return;
        }

        if(this.question && this.question.partsMode=='explore') {
            if(!this.resuming) {
                this.nextParts.forEach(function(np) {
                    if(np.instance!==null && np.usesStudentAnswer()) {
                        p.removeNextPart(np);
                    }
                });
            }
            if(this.settings.exploreObjective) {
                this.markingComment(
                    R('part.marking.counts towards objective',{objective: this.settings.exploreObjective})
                );
            }
        }

        this.submitting = true;
        if(this.parentPart && !this.parentPart.submitting) {
            this.parentPart.setDirty(true);
        }
        this.removeWarnings();
        if(this.hasStagedAnswer()) {
            this.setDirty(false);
            var existing_feedback = {
                warnings: this.warnings.slice(),
                markingFeedback: this.markingFeedback.slice()
            };

            try {
                var result = this.markAdaptive();
            } catch(e) {
                this.error('part.marking.uncaught error',{message:e.message},e);
            }
            if(!result) {
                this.setCredit(0,R('part.marking.no result after replacement'));
                this.answered = true;
            } else if(result.waiting_for_pre_submit) {
                this.wait_for_pre_submit(result.waiting_for_pre_submit);
                return;
            } else {
                this.setWarnings(result.warnings);
                this.markingFeedback = result.markingFeedback.slice();
                this.finalised_result = result.finalised_result;
                this.adaptiveMarkingUsed = result.adaptiveMarkingUsed;
                this.marking_values = result.values;
                this.credit = result.credit;
                this.answered = result.answered;
            }
        } else {
            this.giveWarning(R('part.marking.not submitted'));
            this.setCredit(0,R('part.marking.did not answer'));;
            this.answered = false;
        }
        if(this.stepsShown) {
            var steps_waiting_for_pre_submit = [];
            this.steps.forEach(function(step) {
                if(step.isDirty) {
                    step.submit();
                    if(step.waiting_for_pre_submit) {
                        steps_waiting_for_pre_submit.push(step.waiting_for_pre_submit);
                    }
                }
            });
            if(steps_waiting_for_pre_submit.length>0) {
                this.wait_for_pre_submit(Promise.all(steps_waiting_for_pre_submit));
                return;
            }
        }
        var availableMarks = this.availableMarks();
        if(availableMarks < this.marks) {
            this.markingFeedback.splice(0,0,{op: 'feedback', message: R('part.marking.maximum scaled down',{count: availableMarks})});
        }
        if(this.stepsShown) {
            this.markingFeedback.splice(0,0,{op: 'feedback', message: R('part.marking.revealed steps')});
        }
        if(this.adaptiveMarkingUsed && this.settings.adaptiveMarkingPenalty>0) {
            this.markingFeedback.splice(0,0,{op: 'feedback', message: R('part.marking.used variable replacements')});
        }
        this.calculateScore();

        this.marking_result = {
            warnings: this.warnings.slice(),
            markingFeedback: this.markingFeedback.slice(),
            finalised_result: this.finalised_result,
            credit: this.credit,
            answered: this.answered
        };

        this.question && this.question.updateScore();
        if(this.answered)
        {
            if(!(this.parentPart && this.parentPart.type=='gapfill') && this.settings.showFeedbackIcon && this.marks!=0) {
                this.markingComment(
                    R('part.marking.total score',{count:this.score})
                );
            }
            if(this.display) {
                this.display.showScore(this.answered);
            }
        }
        if(this.display) {
            this.display.updateNextParts();
        }
        this.store && this.store.partAnswered(this);
        this.submitting = false;
        if(this.answered && this.question) {
            for(var path in this.errorCarriedForwardBackReferences) {
                var p2 = this.question.getPart(path);
                if(p2.settings.variableReplacementStrategy=='alwaysreplace') {
                    try {
                        var answer = p2.getCorrectAnswer(p2.errorCarriedForwardScope());
                        p2.display && p2.display.updateCorrectAnswer(answer);
                    } catch(e) {
                    }
                }
                if(p2.answered) {
                    p2.pleaseResubmit();
                }
            }
        }
        this.events.trigger('post-submit');
    },
    /** Has the student entered an answer to this part?
     *
     * @see Numbas.parts.Part#stagedAnswer
     * @returns {boolean}
     */
    hasStagedAnswer: function() {
        return !(this.stagedAnswer==undefined);
    },
    /** Called by another part when its marking means that the marking for this part might change (i.e., when this part replaces a variable with the answer from the other part).
     * Sets this part as dirty, and gives a warning explaining why the student must resubmit.
     */
    pleaseResubmit: function() {
        if(!this.shouldResubmit) {
            this.shouldResubmit = true;
            this.setDirty(true);
            this.giveWarning(R('part.marking.resubmit because of variable replacement'));
        }
    },

    /** @typedef {object} Numbas.parts.feedbackmessage
     * @property {string} op - The kind of feedback.
     * @see Numbas.parts.Part#setCredit Numbas.parts.Part#addCredit Numbas.parts.Part#multCredit Numbas.parts.Part#markingComment
     */

    /** @typedef {object} Numbas.parts.marking_results
     * A dictionary representing the results of marking a student's answer.
     *
     * @property {Array.<string>} warnings - Warning messages.
     * @property {Numbas.marking.finalised_state} finalised_result - A sequence of marking operations.
     * @property {Array.<Numbas.parts.feedbackmessage>} markingFeedback - Feedback messages to show to student, produced from `finalised_result`.
     * @property {object.<Numbas.jme.token>} values - The values of marking algorithm notes.
     * @property {number} credit - Proportion of the available marks to award to the student.
     * @property {boolean} answered - True if the student's answer could be marked. False if the answer was invalid - the student should change their answer and resubmit.
     */

    /** @typedef {object} Numbas.parts.alternative_result
     * A dictionary representing the result of marking the student's answer against a certain alternative version of the part and a given scope.
     *
     * @property {Numbas.marking.finalised_state} finalised_result - A sequence of marking operations.
     * @property {object.<Numbas.jme.token>} values - The values of marking algorithm notes.
     * @property {number} credit - Proportion of the available marks to award to the student.
     * @property {Numbas.marking.marking_script_result} script_result - The unprocessed result of the marking script.
     */

    /** @typedef {object} Numbas.parts.markAlternatives_result
     * A dictionary representing the results of the `markAlternatives` method.
     *
     * @property {Numbas.parts.alternative_result} result - The data produced by marking against the best alternative
     * @property {Numbas.parts.Part} best_alternative - The alternative which was used. Null if no alternative used.
     */

    /** Mark the student's answer against this part and its alternatives, and return the feedback corresponding to the alternative awarding the most credit.
     *
     * @param {Numbas.jme.Scope} scope - Scope in which to calculate the correct answer.
     * @param {object.<Array.<string>>} feedback - Dictionary of existing `warnings` and `markingFeedback` lists, to add to - copies of these are returned with any additional feedback appended.
     * @param {string} exec_path - A description of the path of execution, for caching pre-submit tasks.
     * @returns {Numbas.parts.markAlternatives_result}
     */
    markAlternatives: function(scope,feedback, exec_path) {
        var part = this;

        var alternatives_waiting = [];

        /** Mark against the given alternative.
         *
         * @param {Numbas.parts.Part} alt
         * @param {string} exec_path - A description of the path of execution, for caching pre-submit tasks.
         * @fires Numbas.Part#event:mark_alternative
         * @returns {Numbas.parts.alternative_result}
         */
        function mark_alternative(alt, exec_path) {
            part.events.trigger('mark_alternative', alt, exec_path);
            alt.restore_feedback(feedback);
            var values;
            var finalised_result = {states: [], valid: false, credit: 0};
            var script_result;
            try {
                var result = alt.mark(scope, exec_path);
                if(result.waiting_for_pre_submit) {
                    alternatives_waiting.push(result.waiting_for_pre_submit);
                    return result;
                }
                finalised_result = result.finalised_result;
                values = result.values;
                script_result = result.script_result
            } catch(e) {
                part.giveWarning(e.message);
                script_result = {
                    state_errors: {
                        mark: e
                    }
                };
            }
            return {finalised_result: finalised_result, values: values, credit: alt.credit, script_result: script_result};
        }

        var res = mark_alternative(this, exec_path);
        if(res.valid) {
            res.values['used_alternative'] = new Numbas.jme.types.TNothing()
            res.values['used_alternative_name'] = new Numbas.jme.types.TNothing();
        }

        if(this.alternatives.length) {
            var best_alternative = null;
            for(var i=0;i<this.alternatives.length;i++) {
                var alt = this.alternatives[i];
                alt.stagedAnswer = this.stagedAnswer;
                alt.setStudentAnswer();
                var altres = mark_alternative(alt,exec_path+' alternative '+i+' ');
                if(altres.waiting_for_pre_submit) {
                    continue;
                }
                if(!altres.finalised_result.valid) {
                    continue;
                }
                var scale = (this.marks==0 ? 1 : alt.marks/this.marks);
                var scaled_credit = altres.credit * scale;
                if(altres.credit==0) {
                    continue;
                }
                if(scaled_credit<res.credit) {
                    continue;
                }
                if(best_alternative && scaled_credit<=best_alternative.scaled_credit) {
                    continue;
                }
                altres.credit = scaled_credit;
                best_alternative = {
                    scale: scale,
                    scaled_credit: scaled_credit,
                    credit: altres.credit,
                    result: altres,
                    alternative: alt,
                    index: i
                }
            }
            if(best_alternative) {
                var alternative = best_alternative.alternative;
                res = best_alternative.result;
                var reason = best_alternative.scaled_credit==1 ? 'correct' : best_alternative.scaled_credit==0 ? 'incorrect' : '';
                var states = [
                    Numbas.marking.feedback.set_credit(best_alternative.scaled_credit,reason,alternative.alternativeFeedbackMessage)
                ];
                if(alternative.settings.useAlternativeFeedback) {
                    states = res.finalised_result.states.map(function(s) {
                        if(s.credit!==undefined) {
                            s.credit *= best_alternative.scale;
                        }
                        return s;
                    }).concat(states);
                }
                res.finalised_result = {
                    credit: best_alternative.scaled_credit,
                    states: states,
                    valid: true
                };
                this.restore_feedback(feedback);
                this.credit = 0;
                this.apply_feedback(res.finalised_result);
                this.warnings = best_alternative.alternative.warnings.slice();
                res.values['used_alternative'] = new Numbas.jme.types.TNum(best_alternative.index);
                res.values['used_alternative_name'] = new Numbas.jme.types.TString(alternative.name);
            }
        }

        if(alternatives_waiting.length > 0) {
            return {waiting_for_pre_submit: Promise.all(alternatives_waiting)};
        }

        if(res.valid) {
            res.script_result.states['used_alternative'] = [];
            res.script_result.states['used_alternative_name'] = [];
            res.script_result.state_valid['used_alternative'] = true;
            res.script_result.state_valid['used_alternative_name'] = true;
        }

        return {
            result: res,
            best_alternative: best_alternative ? best_alternative.alternative : null
        }
    },

    /** Mark the student's answer against the given scope.
     *
     * @param {Numbas.jme.Scope} scope - Scope in which to calculate the correct answer.
     * @param {object.<Array.<string>>} feedback - Dictionary of existing `warnings` and `markingFeedback` lists, to add to - copies of these are returned with any additional feedback appended.
     * @param {string} exec_path - A description of the path of execution, for caching pre-submit tasks.
     * @fires Numbas.Part#event:markAgainstScope
     * @returns {Numbas.parts.marking_results}
     */
    markAgainstScope: function(scope, feedback, exec_path) {
        this.events.trigger('markAgainstScope', scope, feedback, exec_path);
        var altres = this.markAlternatives(scope,feedback, exec_path);
        if(altres.waiting_for_pre_submit) {
            return altres;
        }
        var res = altres.result;
        if(res.script_result.state_errors.mark) {
            var message = res.script_result.state_errors.mark.message;
            this.markingComment(message);
            this.giveWarning(message);
        }

        return {
            warnings: this.warnings.slice(),
            markingFeedback: this.markingFeedback.slice(),
            finalised_result: res.finalised_result,
            values: res.values,
            credit: this.credit,
            answered: this.answered
        }
    },

    /** Return the list of variable replacements to make for adaptive marking.
     * For alternatives, the parent part is used, otherwise this part is used.
     *
     * @returns {Array.<Numbas.parts.adaptive_variable_replacement_definition>}
     */
    getErrorCarriedForwardReplacements: function() {
        return this.isAlternative ? this.parentPart.settings.errorCarriedForwardReplacements : this.settings.errorCarriedForwardReplacements
    },

    /** Replace variables with student's answers to previous parts.
     *
     * @returns {Numbas.jme.Scope}
     */
    errorCarriedForwardScope: function() {
        // dictionary of variables to replace
        var replace = this.getErrorCarriedForwardReplacements();
        var replaced = [];
        if(!this.question) {
            return this.getScope();
        }
        // fill scope with new values of those variables
        var new_variables = {}
        for(var i=0;i<replace.length;i++) {
            var vr = replace[i];
            var p2 = this.question.getPart(vr.part);
            if(p2.answered) {
                new_variables[vr.variable] = p2.studentAnswerAsJME();
                replaced.push(vr.variable);
            } else if(vr.must_go_first) {
                throw(new Numbas.Error("part.marking.variable replacement part not answered",{part:p2.name}));
            }
        }
        scope = Numbas.jme.variables.remakeVariables(this.question.variablesTodo, new_variables, this.getScope());
        return scope;
    },
    /** Compute the correct answer, based on the given scope.
     * Anything to do with marking that depends on the scope should be in this method, and calling it with a new scope should update all the settings used by the marking algorithm.
     *
     * @param {Numbas.jme.Scope} scope
     * @abstract
     */
    getCorrectAnswer: function(scope) {},
    /** Save an answer entered by the student, for use in marking.
     *
     * @abstract
     */
    setStudentAnswer: function() {},
    /** Get the student's answer as it was entered as a JME data type, to be used in the marking script.
     *
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
    },
    /** Get the student's answer as a JME data type, to be used in error-carried-forward calculations.
     *
     * @returns {Numbas.jme.token}
     */
    studentAnswerAsJME: function() {
        return this.interpretedStudentAnswer;
    },

    /** @typedef {object} Numbas.parts.mark_result
     * A dictionary representing the results of marking a student's answer against a given scope, without considering alternatives.
     *
     * @property {Numbas.marking.finalised_state} finalised_result - A sequence of marking operations.
     * @property {object.<Numbas.jme.token>} values - The values of marking algorithm notes.
     * @property {Numbas.marking.marking_script_result} script_result - The unprocessed result of the marking script.
     */

    /** Function which marks the student's answer: run `this.settings.markingScript`, which sets the credit for the student's answer to a number between 0 and 1 and produces a list of feedback messages and warnings.
     * If the question has been answered in a way that can be marked, `this.answered` should be set to `true`.
     *
     * @see Numbas.parts.Part#markingScript
     * @see Numbas.parts.Part#answered
     * @param {Numbas.jme.Scope} scope
     * @param {string} exec_path - A description of the path of execution, for caching pre-submit tasks.
     * @fires Numbas.Part#event:pre-mark
     * @fires Numbas.Part#event:post-mark
     * @returns {Numbas.parts.mark_result}
     */
    mark: function(scope, exec_path) {
        this.events.trigger('pre-mark', scope, exec_path);
        var studentAnswer = this.rawStudentAnswerAsJME();
        var result;
        result = this.mark_answer(studentAnswer,scope, exec_path);
        if(result.waiting_for_pre_submit) {
            return result;
        }
        var finalised_result = {valid: false, credit: 0, states: []};
        if(!result.state_errors.mark) {
            var finalised_result = marking.finalise_state(result.states.mark);
            this.credit = 0;
            this.apply_feedback(finalised_result);
            this.interpretedStudentAnswer = result.values['interpreted_answer'];
        }
        this.events.trigger('post-mark', result, finalised_result);
        return {finalised_result: finalised_result, values: result.values, script_result: result};
    },

    /** Restore a set of feedback messages.
     *
     * @param {object.<Array.<string>>} feedback - Dictionary of existing `warnings` and `markingFeedback` lists, to add to - copies of these are returned with any additional feedback appended.
     */
    restore_feedback: function(feedback) {
        if(feedback===undefined) {
            feedback = {
                warnings: [],
                markingFeedback: []
            }
        }
        this.setWarnings(feedback.warnings.slice());
        this.markingFeedback = feedback.markingFeedback.slice();
    },
    /** Apply a finalised list of feedback states to this part.
     *
     * @param {Numbas.marking.feedback_item[]} feedback
     * @see Numbas.marking.finalise_state
     */
    apply_feedback: function(feedback) {
        var valid = feedback.valid;
        var part = this;
        var end = false;
        var states = feedback.states.slice();
        var i=0;
        var lifts = [];
        var scale = 1;
        while(i<states.length) {
            var state = states[i];
            var FeedbackOps = Numbas.marking.FeedbackOps;
            switch(state.op) {
                case FeedbackOps.SET_CREDIT:
                    part.setCredit(scale*state.credit, state.message, state.reason);
                    break;
                case FeedbackOps.MULTIPLY_CREDIT:
                    part.multCredit(state.factor, state.message);
                    break;
                case FeedbackOps.ADD_CREDIT:
                    part.addCredit(scale*state.credit, state.message);
                    break;
                case FeedbackOps.SUB_CREDIT:
                    part.subCredit(scale*state.credit, state.message);
                    break;
                case FeedbackOps.WARNING:
                    part.giveWarning(state.message);
                    break;
                case FeedbackOps.FEEDBACK:
                    part.markingComment(state.message,state.reason, state.format);
                    break;
                case FeedbackOps.END:
                    if(lifts.length) {
                        while(i+1<states.length && states[i+1].op!="end_lift") {
                            i += 1;
                        }
                    } else {
                        end = true;
                        if(state.invalid) {
                            valid = false;
                        }
                    }
                    break;
                case "start_lift":
                    lifts.push({credit: this.credit, creditFraction: this.creditFraction, scale:scale});
                    this.credit = 0;
                    this.creditFraction = math.Fraction.zero;
                    scale = state.scale;
                    break;
                case 'end_lift':
                    var last_lift = lifts.pop();
                    var lift_credit = this.credit;
                    this.creditFraction = last_lift.creditFraction.add(math.Fraction.fromFloat(lift_credit));
                    scale = last_lift.scale;
                    break;
            }
            i += 1;
            if(end) {
                break;
            }
        }
        part.answered = valid;

        /** Add marks awarded/taken away messages to the end of each feedback item which changes awarded credit.
         */
        var t = 0;
        for(var i=0;i<part.markingFeedback.length;i++) {
            var action = part.markingFeedback[i];
            var credit_change = 0;
            var change_desc;
            if(action.credit!==undefined) {
                var availableMarks = part.availableMarks();
                var change = action.credit*availableMarks;
                credit_change = action.credit;
                if(action.gap!=undefined) {
                    var scale = availableMarks>0 ? part.gaps[action.gap].availableMarks()/availableMarks : 0;
                    change *= scale;
                    credit_change *= part.marks>0 ? scale : 1/part.gaps.length;
                }
                var ot = t;
                t += change;
                change = t-ot;
                if(action.message===undefined) {
                    action.message = '';
                }
                if(change!=0) {
                    if(util.isNonemptyHTML(action.message)) {
                        action.message += '\n\n';
                    }
                    var marks = Math.abs(change);
                    if(change>0) {
                        action.message += R('feedback.you were awarded',{count:marks});
                    } else if(change<0) {
                        action.message += R('feedback.taken away',{count:marks});
                    }
                }
            }
            change_desc = credit_change>0 ? 'positive' : credit_change<0 ? 'negative' : 'neutral';
            switch(action.reason) {
                case 'correct':
                    change_desc = 'positive';
                    break;
                case 'incorrect':
                    change_desc = 'negative';
                    break;
                case 'invalid':
                    change_desc = 'invalid';
                    break;
            }
            action.credit_change = change_desc;
        }

    },

    /**
     * Get JME parameters to pass to the marking script.
     *
     * @param {Numbas.jme.token} studentAnswer - The student's answer to the part.
     * @param {Array.<object.<Numbas.jme.token>>} pre_submit_parameters
     * @param {string} exec_path
     * @returns {object.<Numbas.jme.token>}
     */
    marking_parameters: function(studentAnswer, pre_submit_parameters, exec_path) {
        studentAnswer = jme.makeSafe(studentAnswer);
        var obj = {
            path: jme.wrapValue(this.path),
            name: jme.wrapValue(this.name),
            question_definitions: jme.wrapValue(this.question ? this.question.local_definitions : {}),
            studentAnswer: studentAnswer,
            settings: jme.wrapValue(this.settings),
            marks: new jme.types.TNum(this.availableMarks()),
            partType: new jme.types.TString(this.type),
            exec_path: jme.wrapValue(exec_path),
            gaps: jme.wrapValue(this.gaps.map(function(g){return g.marking_parameters(g.rawStudentAnswerAsJME(), [], exec_path)})),
            steps: jme.wrapValue(this.steps.map(function(s){return s.marking_parameters(s.rawStudentAnswerAsJME(), [], exec_path)}))
        };
        pre_submit_parameters = pre_submit_parameters || [];
        if(pre_submit_parameters.length > 0) {
            var pre_submit = {};
            pre_submit_parameters.forEach(function(params) {
                for(var x in params) {
                    pre_submit[x] = params[x];
                }
            });
            obj.pre_submit = new jme.types.TDict(pre_submit);
        }
        return obj;
    },

    /** 
     * Do all of the pre-submit tasks before marking an answer.
     * Results are cached by `exec_path` and `studentAnswer`.
     *
     * @param {Numbas.jme.token} studentAnswer
     * @param {Numbas.jme.Scope} scope
     * @param {string} exec_path
     * @fires Numbas.Part#event:do_pre_submit_tasks
     * @returns {object}
     */
    do_pre_submit_tasks: function(studentAnswer, scope, exec_path) {
        this.events.trigger('do_pre_submit_tasks');
        if(this.markingScript.notes.pre_submit===undefined) {
            return {parameters: []};
        }
        var p = this;
        var cache = this.pre_submit_cache.find(function(c) {
            return c.exec_path == exec_path && util.eq(studentAnswer, c.studentAnswer, scope);
        });
        if(cache) {
            return {parameters: cache.results};
        }
        var res = this.markingScript.evaluate_note('pre_submit', scope, this.marking_parameters(studentAnswer, [], exec_path));
        if(res.scope.state_errors.pre_submit) {
            throw(new Numbas.Error('part.marking.error in marking script',{message: res.scope.state_errors.pre_submit}));
        }
        res = jme.castToType(res.value,'list');
        var promises = res.value.filter(function(v) { return jme.isType(v,'promise'); }).map(function(v) { return jme.castToType(v,'promise').promise; });

        var all_promises = Promise.all(promises);
        all_promises.then(function(results) {
            p.waiting_for_pre_submit = false;
            p.pre_submit_cache.push({
                exec_path: exec_path,
                studentAnswer: studentAnswer,
                results: results
            });
        });
        this.waiting_for_pre_submit = all_promises;
        return {
            waiting: all_promises
        }
    },

    /** Run the marking script against the given answer.
     * This does NOT apply the feedback and credit to the part object, it just returns it.
     *
     * @param {Numbas.jme.token} studentAnswer
     * @param {Numbas.jme.Scope} scope
     * @param {string} exec_path - A description of the path of execution, for caching pre-submit tasks.
     * @see Numbas.parts.Part#mark
     * @fires Numbas.Part#event:pre-mark_answer
     * @fires Numbas.Part#event:post-mark_answer
    * @returns {Numbas.marking.marking_script_result}
     */
    mark_answer: function(studentAnswer,scope, exec_path) {
        this.events.trigger('pre-mark_answer', studentAnswer, scope, exec_path);
        try {
            this.getCorrectAnswer(scope);
            var pre_submit_result = this.do_pre_submit_tasks(studentAnswer, scope, exec_path);
            if(pre_submit_result.waiting) {
                return {waiting_for_pre_submit: pre_submit_result.waiting};
            }
            var result = this.markingScript.evaluate(
                scope,
                this.marking_parameters(studentAnswer, pre_submit_result.parameters, exec_path)
            );
        } catch(e) {
            throw(new Numbas.Error("part.marking.error in marking script",{message:e.message},e));
        }
        this.events.trigger('post-mark_answer', result);
        return result;
    },
    /** Set the `credit` to an absolute value.
     *
     * @param {number} credit
     * @param {string} message - Message to show in feedback to explain this action.
     * @param {string} reason - Why was the credit set to this value? If given, either 'correct' or 'incorrect'.
     * @fires Numbas.Part#event:setCredit
     */
    setCredit: function(credit,message,reason)
    {
        var oCredit = this.creditFraction;
        this.creditFraction = math.Fraction.fromFloat(credit);
        if(this.settings.showFeedbackIcon) {
            this.markingFeedback.push({
                op: 'add_credit',
                credit: this.creditFraction.subtract(oCredit).toFloat(),
                message: message,
                reason: reason
            });
        }
        this.events.trigger('setCredit', credit, message, reason);
    },
    /** Add an absolute value to `credit`.
     *
     * @param {number} credit - Amount to add.
     * @param {string} message - Message to show in feedback to explain this action.
     * @fires Numbas.Part#event:addCredit
     */
    addCredit: function(credit,message)
    {
        var creditFraction = math.Fraction.fromFloat(credit);
        this.creditFraction = this.creditFraction.add(creditFraction);
        if(this.settings.showFeedbackIcon) {
            this.markingFeedback.push({
                op: 'add_credit',
                credit: credit,
                message: message
            });
        }
        this.events.trigger('addCredit', credit, message);
    },
    /** Subtract an absolute value from `credit`.
     *
     * @param {number} credit - Amount to subtract.
     * @param {string} message - Message to show in feedback to explain this action.
     * @fires Numbas.Part#event:subCredit
     */
    subCredit: function(credit,message)
    {
        var creditFraction = math.Fraction.fromFloat(credit);
        this.creditFraction = this.creditFraction.subtract(creditFraction);
        if(this.settings.showFeedbackIcon) {
            this.markingFeedback.push({
                op: 'sub_credit',
                credit: -credit,
                message: message
            });
        }
        this.events.trigger('subCredit', credit, message);
    },
    /** Multiply `credit` by the given amount - use to apply penalties.
     *
     * @param {number} factor
     * @param {string} message - Message to show in feedback to explain this action.
     * @fires Numbas.Part#event:multCredit
     */
    multCredit: function(factor,message)
    {
        var oCreditFraction = this.creditFraction;
        this.creditFraction = this.creditFraction.multiply(math.Fraction.fromFloat(factor));
        if(this.settings.showFeedbackIcon) {
            this.markingFeedback.push({
                op: 'multiply_credit',
                credit: this.creditFraction.subtract(oCreditFraction).toFloat(),
                factor: factor,
                message: message
            });
            this.events.trigger('multCredit', factor, message);
        }
    },
    /** Add a comment to the marking feedback.
     *
     * @param {string} message
     * @param {string} reason
     * @param {string} format - The format of the message: `"html"` or `"string"`.
     * @fires Numbas.Part#event:markingComment
     */
    markingComment: function(message, reason, format)
    {
        this.markingFeedback.push({
            op: 'feedback',
            message: message,
            reason: reason,
            format: format || 'string'
        });
        this.events.trigger('markingComment', message, reason, format);
    },
    /** Show the steps, as a result of the student asking to show them.
     * If the answers have not been revealed, we should apply the steps penalty.
     *
     * @param {boolean} dontStore - Don't tell the storage that this is happening - use when loading from storage to avoid callback loops.
     * @fires Numbas.Part#event:showSteps
     */
    showSteps: function(dontStore)
    {
        this.openSteps();
        if(this.revealed) {
            return;
        }
        this.stepsShown = true;
        if(!this.revealed) {
            if(this.answered) {
                this.submit();
            } else {
                this.calculateScore();
                this.question && this.question.updateScore();
            }
        } else {
            this.calculateScore();
        }
        this.display && this.display.showSteps();
        if(!dontStore) {
            this.store && this.store.stepsShown(this);
        }
        this.events.trigger('showSteps');
    },
    /** Open the steps, either because the student asked or the answers to the question are being revealed. This doesn't affect the steps penalty.
     *
     * @fires Numbas.Part#event:openSteps
     */
    openSteps: function() {
        this.stepsOpen = true;
        this.events.trigger('openSteps');
        this.display && this.display.showSteps();
    },
    /** Close the steps box. This doesn't affect the steps penalty.
     *
     * @fires Numbas.Part#event:hideSteps
     */
    hideSteps: function()
    {
        this.stepsOpen = false;
        this.events.trigger('hideSteps');
        this.display && this.display.hideSteps();
        this.store && this.store.stepsHidden(this);
    },

    /** Currently available next parts.
     *
     * @returns {Array.<Numbas.parts.NextPart>}
     */
    availableNextParts: function() {
        var extra = this.answered ? {variables: this.marking_values} : {};
        var scope = new jme.Scope([this.getScope(),extra]);
        scope.setVariable('credit',new jme.types.TNum(this.credit));
        scope.setVariable('answered', new jme.types.TBool(this.answered));
        return this.nextParts.filter(function(np) {
            if(np.instance) {
                return true;
            }
            var condition = np.availabilityCondition;
            if(condition=='') {
                return true;
            }
            try {
                var res = scope.evaluate(condition);
                return res.type=='boolean' && res.value;
            } catch(e) {
                return false;
            }
        });
    },
    
    /** Make an instance of the selected next part.
     *
     * @param {Numbas.parts.NextPart} np
     * @param {number} [index] - The position of the part in the question's parts list (added to the end if not given).
     * @fires Numbas.Part#event:makeNextPart
     */
    makeNextPart: function(np,index) {
        this.events.trigger('makeNextPart', np, index);
        var p = this;
        var scope = this.getScope();

        var values = np.instanceVariables;
        if(np.instanceVariables===null) {
            values = np.instanceVariables = {};
            var replaceScope = new jme.Scope([scope,{variables: p.marking_values}]);
            replaceScope.setVariable('credit',new jme.types.TNum(this.credit));
            if(np.variableReplacements.length) {
                np.variableReplacements.forEach(function(vr) {
                    values[vr.variable] = replaceScope.evaluate(vr.definition+'');
                });
            }
        }

        np.instance = this.question.addExtraPart(np.index,scope,values,p,index);
        np.instance.useCustomName = true;
        np.instance.customName = np.label;
        np.instance.assignName();
        if(np.lockAfterLeaving) {
            this.lock();
        }
        if(this.display) {
            this.display.updateNextParts();
        }
        if(index===undefined) {
            this.store && this.store.initPart(np.instance);
            this.question.updateScore();
        }
    },

    /** Remove the existing instance of the given next part.
     *
     * @param {Numbas.parts.NextPart} np
     * @fires Numbas.Part#event:removeNextPart
     */
    removeNextPart: function(np) {
        this.events.trigger('removeNextPart', np);
        if(!np.instance) {
            return;
        }
        this.question.removePart(np.instance);
        np.instance.nextParts.forEach(function(np2) {
            np.instance.removeNextPart(np2);
        });
        np.instance = null;
        np.instanceVariables = null;
        if(this.display) {
            this.display.updateNextParts();
        }
        this.question.updateScore();
    },

    /** Reveal the correct answer to this part.
     *
     * @param {boolean} dontStore - Don't tell the storage that this is happening - use when loading from storage to avoid callback loops.
     * @fires Numbas.Part#event:revealAnswer
     */
    revealAnswer: function(dontStore)
    {
        this.display && this.display.revealAnswer();
        this.revealed = true;
        this.setDirty(false);
        //this.setCredit(0);
        if(this.steps.length>0) {
            this.openSteps();
            for(var i=0; i<this.steps.length; i++ )
            {
                this.steps[i].revealAnswer(dontStore);
            }
        }
        this.events.trigger('revealAnswer', dontStore);
    },

    /** Lock this part.
     * @fires Numbas.Part#event:lock
     */
    lock: function() {
        this.locked = true;
        if(this.display) {
            this.display.lock();
        }
        this.events.trigger('lock');
    }
};

/** Definition of a 'next part' option following on from a part.
 *
 * @class
 * @memberof Numbas.parts
 * @param {Numbas.parts.Part} parentPart - The part this one follows on from.
 */
var NextPart = Numbas.parts.NextPart = function(parentPart) {
    this.parentPart = parentPart;

    this.variableReplacements = [];
}
NextPart.prototype = {
    /** List of variable replacements to make when creating this part.
     *
     * @type {Array.<object>}
     */
    variableReplacements: [],

    /** Values of replaced variables for this next part, once it's been created.
     *
     * @type {object.<Numbas.jme.token>}
     */
    instanceVariables: null,

    /** Reference to the instance of this next part, if it's been created.
     *
     * @type {Numbas.parts.Part}
     */
    instance: null,

    /** Name of the penalty to apply when this part is visited.
     *
     * @type {string}
     */
    penalty: null,

    /** Amount of penalty to apply when this part is visited.
     *
     * @type {number}
     */
    penaltyAmount: 0,

    /** Expression defining the amount of penalty to apply when this part is visited.
     *
     * @type {JME}
     */
    penaltyAmountString: '',

    /** Index of the definition of this part in the question's list of part definitions.
     *
     * @type {number}
     */
    index: null,

    /** Label for the button to select this next part.
     *
     * @type {string}
     */
    label: '',

    /** When should this next part be available to the student?
     *
     * @type {JME}
     */
    availabilityCondition: '',

    /** Load the definition of this next part from XML.
     *
     * @param {Element} xml
     */
    loadFromXML: function(xml) {
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        tryGetAttribute(this,xml,'.',['index','label','availabilityCondition','penalty','lockAfterLeaving']);
        this.index = parseInt(this.index);
        tryGetAttribute(this,xml,'.',['penaltyAmount'],['penaltyAmountString']);
        this.penaltyAmountString += '';
        var replacementNodes = xml.selectNodes('variablereplacements/replacement');
        for(var j=0;j<replacementNodes.length;j++) {
            var replacement = {};
            tryGetAttribute(replacement,replacementNodes[j],'.',['variable','definition']);
            this.variableReplacements.push(replacement);
        }
        var otherPartNode = this.parentPart.question.xml.selectNodes('parts/part')[this.index];
        this.label = this.label || otherPartNode.getAttribute('customname');
        this.xml = otherPartNode;
    },

    /** Load the definition of this next part from JSON.
     *
     * @param {object} data
     */
    loadFromJSON: function(data) {
        var np = this;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;

        tryLoad(data,['label','availabilityCondition','penalty','lockAfterLeaving'],this);
        tryLoad(data,['penaltyAmount','otherPart'],this,['penaltyAmountString','index']);
        this.penaltyAmountString += '';
        var variableReplacements = tryGet(data,'variableReplacements');
        if(variableReplacements) {
            variableReplacements.forEach(function(rd) {
                var replacement = {};
                tryLoad(rd,['variable','definition'],replacement);
                np.variableReplacements.push(replacement);
            });
        }
        var otherPart = this.parentPart.question.json.parts[this.index];
        this.label = this.label || tryGet(otherPart,'customName');
        this.json = data;
    },

    /** Do any of the variable replacements for this next part rely on information from the student's answer to the parent part?
     * Returns true if a variable replacement definition contains a variable name which is not a question variable - it must come from the marking algorithm.
     *
     * @returns {boolean}
     */
    usesStudentAnswer: function() {
        var np = this;
        var question_variables = this.parentPart.question.local_definitions.variables;
        return this.variableReplacements.some(function(vr) {
            var vars = jme.findvars(Numbas.jme.compile(vr.definition),[],np.parentPart.getScope());
            return vars.some(function(name) { return !question_variables.contains(name); });
        });
    }
};

});
