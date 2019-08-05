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

/** Definitions of custom part types
 * @name custom_part_types
 * @type {Object}
 * @memberof Numbas
 */

/** A unique identifier for a {@link Numbas.parts.Part} object, of the form `qXpY[gZ|sZ]`. Numbering starts from zero, and the `gZ` bit is used only when the part is a gap, and `sZ` is used if it's a step.
 * @typedef Numbas.parts.partpath
 * @type {String}
 */
/** Part type constructors
 * These functions aren't called directly - they're the original part constructor objects before they're extended with the generic part methods, kept for reference so their methods can be reused by other parts
 * @see Numbas.partConstructors
 * @namespace Numbas.parts
 * @memberof Numbas
 */
Numbas.parts = {};
/** Associate part type names with their object constructors
 * These constructors are called by {@link Numbas.createPart} - they should be finalised constructors with all the generic part methods implemented.
 * Most often, you do this by extending {@link Numbas.parts.Part}
 * @memberof Numbas
 */
var partConstructors = Numbas.partConstructors = {};
/** Create a question part based on an XML definition.
 * @memberof Numbas
 * @param {Element} xml
 * @param {Numbas.parts.partpath} [path]
 * @param {Numbas.Question} [question]
 * @param {Numbas.parts.Part} [parentPart]
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @returns {Numbas.parts.Part}
 * @throws {Numbas.Error} "part.missing type attribute" if the top node in `xml` doesn't have a "type" attribute.
 */
var createPartFromXML = Numbas.createPartFromXML = function(xml, path, question, parentPart, store) {
    var tryGetAttribute = Numbas.xml.tryGetAttribute;
    var type = tryGetAttribute(null,xml,'.','type',[]);
    if(type==null) {
        throw(new Numbas.Error('part.missing type attribute',{part:util.nicePartName(path)}));
    }
    var part = createPart(type, path, question, parentPart, store);
    part.loadFromXML(xml);
    part.finaliseLoad();
    return part;
}
/** Create a question part based on an XML definition.
 * @memberof Numbas
 * @param {Object} data
 * @param {Numbas.parts.partpath} [path]
 * @param {Numbas.Question} [question]
 * @param {Numbas.parts.Part} [parentPart]
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @returns {Numbas.parts.Part}
 * @throws {Numbas.Error} "part.missing type attribute" if `data` doesn't have a "type" attribute.
 */
var createPartFromJSON = Numbas.createPartFromJSON = function(data, path, question, parentPart, store) {
    if(!data.type) {
        throw(new Numbas.Error('part.missing type attribute',{part:util.nicePartName(path)}));
    }
    var part = createPart(data.type, path, question, parentPart, store);
    part.loadFromJSON(data);
    part.finaliseLoad();
    return part;
}
/** Create a new question part.
 * @see Numbas.partConstructors
 * @param {String} type
 * @param {Numbas.parts.partpath} path
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store] - the storage engine to use
 * @returns {Numbas.parts.Part}
 * @throws {Numbas.Error} "part.unknown type" if the given part type is not in {@link Numbas.partConstructors}
 * @memberof Numbas
 */
var createPart = Numbas.createPart = function(type, path, question, parentPart, store)
{
    if(partConstructors[type])
    {
        var cons = partConstructors[type];
        var part = new cons(path, question, parentPart, store);
        part.type = type;
        return part;
    }
    else {
        throw(new Numbas.Error('part.unknown type',{part:util.nicePartName(path),type:type}));
    }
}

/** Base question part object
 * @constructor
 * @memberof Numbas.parts
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @property {Boolean} isStep - is this part a step?
 * @proeprty {Boolean} isGap - is this part a gap?
 * @see Numbas.createPart
 */
var Part = Numbas.parts.Part = function( path, question, parentPart, store)
{
    var p = this;
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
    this.index = parseInt(this.path.match(/\d+$/));
    //initialise settings object
    this.settings = util.copyobj(Part.prototype.settings);
    //initialise gap and step arrays
    this.gaps = [];
    this.steps = [];
    this.isStep = false;
    this.isGap = false;
    this.settings.errorCarriedForwardReplacements = [];
    this.errorCarriedForwardBackReferences = {};
    this.markingFeedback = [];
    this.finalised_result = {valid: false, credit: 0, states: []};
    this.warnings = [];
    this.scripts = {};

    Object.defineProperty(this,"credit", {
        /** Proportion of available marks awarded to the student - i.e. `score/marks`. Penalties will affect this instead of the raw score, because of things like the steps marking algorithm.
         * @type {Number}
         * @returns {Number}
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
    /** Storage engine
     * @type {Numbas.storage.BlankStorage}
     */
    store: undefined,
    /** XML defining this part
     * @type {Element}
     */
    xml: '',
    /** Load the part's settings from an XML <part> node
     * @param {Element} xml
     */
    loadFromXML: function(xml) {
        this.xml = xml;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        tryGetAttribute(this,this.xml,'.',['type','marks','useCustomName','customName']);
        tryGetAttribute(this.settings,this.xml,'.',['minimumMarks','enableMinimumMarks','stepsPenalty','showCorrectAnswer','showFeedbackIcon'],[]);
        //load steps
        var stepNodes = this.xml.selectNodes('steps/part');
        for(var i=0; i<stepNodes.length; i++)
        {
            var step = Numbas.createPartFromXML( stepNodes[i], this.path+'s'+i, this.question, this, this.store);
            this.addStep(step,i);
        }
        // set variable replacements
        var variableReplacementsNode = this.xml.selectSingleNode('adaptivemarking/variablereplacements');
        tryGetAttribute(this.settings,this.xml,variableReplacementsNode,['strategy'],['variableReplacementStrategy'])
        var replacementNodes = variableReplacementsNode.selectNodes('replace');
        this.settings.hasVariableReplacements = replacementNodes.length>0;
        for(var i=0;i<replacementNodes.length;i++) {
            var n = replacementNodes[i];
            var vr = {}
            tryGetAttribute(vr,n,'.',['variable','part','must_go_first']);
            this.addVariableReplacement(vr.variable, vr.part, vr.must_go_first);
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
    /** Load the part's settings from a JSON object
     * @param {Object} data
     */
    loadFromJSON: function(data) {
        var p = this;
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        var tryGet = Numbas.json.tryGet;
        tryLoad(data,['marks','useCustomName','customName'],this);
        this.marks = parseFloat(this.marks);
        tryLoad(data,['showCorrectAnswer', 'showFeedbackIcon', 'stepsPenalty','variableReplacementStrategy'],this.settings);
        var variableReplacements = tryGet(data, 'variableReplacements');
        if(variableReplacements) {
            variableReplacements.map(function(vr) {
                p.addVariableReplacement(vr.variable, vr.part, vr.must_go_first);
            });
        }
        if('steps' in data) {
            data.steps.map(function(sd,i) {
                var s = createPartFromJSON(sd, p.path+'s'+i, p.question, p, p.store);
                p.addStep(s,i);
            });
        }
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
    },
    /** Perform any tidying up or processing that needs to happen once the part's definition has been loaded
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
        if(Numbas.display) {
            this.display = new Numbas.display.PartDisplay(this);
        }
    },
    /** Load saved data about this part from storage
     *  The part is not resubmitted - you must do this afterwards, once any steps or gaps have been resumed.
     */
    resume: function() {
        var part = this;
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        this.answered = pobj.answered;
        this.stepsShown = pobj.stepsShown;
        this.stepsOpen = pobj.stepsOpen;
        this.steps.forEach(function(s){ s.resume() });
        this.display && this.question.signals.on(['ready','HTMLAttached'], function() {
            part.display.restoreAnswer();
        })
    },
    /** Add a step to this part
     * @param {Numbas.parts.Part} step
     * @param {Number} index - position of the step
     */
    addStep: function(step, index) {
        step.isStep = true;
        this.steps.splice(index,0,step);
        this.stepsMarks += step.marks;
    },
    /** Add a variable replacement for this part's adaptive marking
     * @param {String} variable - the name of the variable to replace
     * @param {String} part - the path of the part to use
     * @param {Boolean} must_go_first - Must the referred part be answered before this part can be marked?
     */
    addVariableReplacement: function(variable, part, must_go_first) {
        var vr = {
            variable: variable.toLowerCase(),
            part: part,
            must_go_first: must_go_first
        };
        this.settings.errorCarriedForwardReplacements.push(vr);
    },
    /** The base marking script for this part.
     * @abstract
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() {},
    /** Set this part's JME marking script
     * @param {String} markingScriptString
     * @param {Boolean} extend_base - Does this script extend the built-in script?
     */
    setMarkingScript: function(markingScriptString, extend_base) {
        var p = this;
        var oldMarkingScript = this.baseMarkingScript();
        var algo = this.markingScript = new marking.MarkingScript(markingScriptString, extend_base ? oldMarkingScript : undefined);
        // check that the required notes are present
        var requiredNotes = ['mark','interpreted_answer'];
        requiredNotes.forEach(function(name) {
            if(!(name in algo.notes)) {
                p.error("part.marking.missing required note",{note:name});
            }
        });
    },
    /** Set a custom JavaScript script
     * @param {String} name - the name of the method to override
     * @param {String} order - When should the script run? `'instead'`, `'before'` or `'after'`
     * @param {String} script - the source code of the script
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
            script = 'var res = (function() {'+script+'\n}).apply(this); this.answered = true; return res || {states: this.markingFeedback.slice(), valid: true, credit: this.credit};';
        }
        with(withEnv) {
            script = eval('(function(){try{'+script+'\n}catch(e){e = new Numbas.Error(\'part.script.error\',{path:this.name,script:name,message:e.message}); Numbas.showError(e); throw(e);}})');
        }
        this.scripts[name] = {script: script, order: order};
    },
    /** The question this part belongs to
     * @type {Numbas.Question}
     */
    question: undefined,
    /** Reference to parent of this part, if this is a gap or a step
     * @type {Numbas.parts.Part}
     */
    parentPart: undefined,
    /** A question-wide unique 'address' for this part.
     * @type {Numbas.parts.partpath}
     */
    path: '',
    /** A readable name for this part, to show to the student.
     * Change it with {@link Numbas.parts.Part#setName}
     * @type {String}
     */
    name: '',
    /** Should a custom name be used?
     * @type {Boolean}
     */
    useCustomName: false,
    /** Custom name for this part, or null if none.
     * Variables will be substituted into this string from the part's scope.
     * @type {String}
     */
    customName: '',
    /** Assign a name to this part
     * @param {Number} index - the number of parts before this one that have names.
     * @param {Number} siblings - the number of siblings this part has
     * @returns {Boolean} true if this part has a name that should increment the label counter
     */
    assignName: function(index,siblings) {
        if(this.useCustomName) {
            this.name = jme.subvars(this.customName,this.getScope(),true);
        } else if(this.isGap) {
            this.name = util.capitalise(R('gap'))+' '+index;
        } else if(this.isStep) {
            this.name = util.capitalise(R('step'))+' '+index;
        } else if(siblings==0) {
            return '';
        } else {
            this.name = util.letterOrdinal(index)+')';
        }

        this.display && this.display.setName(this.name);
        return this.name!='';
    },
    /** This part's type, e.g. "jme", "numberentry", ...
     * @type {String}
     */
    type: '',
    /** Maximum marks available for this part
     * @type {Number}
     */
    marks: 0,
    /** Marks available for the steps, if any
     * @type {Number}
     */
    stepsMarks: 0,
    /** Credit as a fraction. Used to avoid simple floating point errors.
     * @type {Numbas.math.Fraction}
     */
    creditFraction: new math.Fraction(0,1),
    /** Student's score on this part
     * @type {Number}
     */
    score: 0,
    /** Messages explaining how marks were awarded
     * @type {Array.<Numbas.parts.feedbackmessage>}
     */
    markingFeedback: [],
    /** The result of the last marking run
     * @type {Numbas.marking.finalised_state}
     */
    finalised_result: {valid: false, credit: 0, states: []},
    /** Warnings shown next to the student's answer
     * @type {Array.<String>}
     */
    warnings: [],
    /** Has the student changed their answer since last submitting?
     * @type {Boolean}
     */
    isDirty: false,
    /** Student's answers as visible on the screen (not necessarily yet submitted)
     * @type {Array.<String>}
     */
    stagedAnswer: undefined,

    /** Has this part been answered?
     * @type {Boolean}
     */
    answered: false,

    /** Child gapfill parts
     * @type {Numbas.parts.Part[]}
     */
    gaps: [],
    /** Child step parts
     * @type {Numbas.parts.Part[]}
     */
    steps: [],
    /** Have the steps been show for this part?
     * @type {Boolean}
     */
    stepsShown: false,
    /** Is the steps display open? (Students can toggle it, but that doesn't affect whether they get the penalty)
     * @type {Boolean}
     */
    stepsOpen: false,
    /** True if this part should be resubmitted because another part it depended on has changed
     * @type {Boolean}
     */
    shouldResubmit: false,
    /** Does this mark do any marking? False for information only parts
     * @type {Boolean}
     */
    doesMarking: true,
    /** Properties set when the part is generated
     * @type {Object}
     * @property {Number} stepsPenalty - Number of marks to deduct when the steps are shown
     * @property {Boolean} enableMinimumMarks - Is there a lower limit on the score the student can be awarded for this part?
     * @property {Number} minimumMarks - Lower limit on the score the student can be awarded for this part
     * @property {Boolean} showCorrectAnswer - Show the correct answer on reveal?
     * @property {Boolean} showFeedbackIcon - Show the tick/cross feedback symbol after this part is submitted?
     * @property {Boolean} hasVariableReplacements - Does this part have any variable replacement rules?
     * @property {String} variableReplacementStrategy - `'originalfirst'` or `'alwaysreplace'`
     */
    settings:
    {
        stepsPenalty: 0,
        enableMinimumMarks: true,
        minimumMarks: 0,
        showCorrectAnswer: true,
        showFeedbackIcon: true,
        hasVariableReplacements: false,
        variableReplacementStrategy: 'originalfirst'
    },

    /** The script to mark this part - assign credit, and give messages and feedback.
     * @type {Numbas.marking.MarkingScript}
     */
    markingScript: null,

    /** Throw an error, with the part's identifier prepended to the message
     * @param {String} message
     * @param {Object} args - arguments for the error message
     * @param {Error} [originalError] - if this is a re-thrown error, the original error object
     * @throws {Numbas.Error}
     */
    error: function(message, args, originalError) {
        var nmessage = R.apply(this,[message,args]);
        if(nmessage!=message) {
            originalError = new Error(nmessage);
            originalError.originalMessages = [message].concat(originalError.originalMessages || []);
        }
        var niceName = this.name;
        throw(new Numbas.Error('part.error',{path: niceName, message: nmessage},originalError));
    },
    /** The name of the input widget this part uses, if any.
     * @returns {String}
     */
    input_widget: function() {
        return null;
    },
    /** Options for this part's input widget
     * @returns {Object}
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
                    /** Create a function which runs `script` (instead of the built-in script)
                     * @param {Function} script
                     * @returns {Function}
                     */
                    function instead(script) {
                        return function() {
                            return script.apply(part,arguments);
                        }
                    }
                    /** Create a function which runs `script` before `originalScript`
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
                    /** Create a function which runs `script` after `originalScript`
                     * @param {Function} script
                     * @param {Function} originalScript
                     * @returns {Function}
                     */
                    function after(script,originalScript) {
                        return function() {
                            originalScript.apply(part,arguments);
                            return script.apply(part,arguments);
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
     * @type {Numbas.display.PartDisplay}
     */
    display: undefined,
    /** Give the student a warning about this part.
     * @param {String} warning
     * @see Numbas.display.PartDisplay.warning
     */
    giveWarning: function(warning)
    {
        this.warnings.push(warning);
        this.display && this.display.warning(warning);
    },
    /** Set the list of warnings
     * @param {Array.<String>} warnings
     * @see Numbas.display.PartDisplay.warning
     */
    setWarnings: function(warnings) {
        this.warnings = warnings;
        this.display && this.display.setWarnings(warnings);
    },
    /** Remove all warnings
     * @see Numbas.display.PartDisplay.warning
     */
    removeWarnings: function() {
        this.setWarnings([]);
    },
    /** Calculate the student's score based on their submitted answers
     *
     * Calls the parent part's `calculateScore` method at the end.
     */
    calculateScore: function()
    {
        if(this.steps.length && this.stepsShown)
        {
            var oScore = this.score = (this.marks - this.settings.stepsPenalty) * this.credit;     //score for main keypart
            var stepsScore = 0, stepsMarks=0;
            for(var i=0; i<this.steps.length; i++)
            {
                stepsScore += this.steps[i].score;
                stepsMarks += this.steps[i].marks;
            }
            var stepsFraction = Math.max(Math.min(1-this.credit,1),0);    //any credit not earned in main part can be earned back in steps
            this.score += stepsScore;                        //add score from steps to total score
            this.score = Math.min(this.score,this.marks - this.settings.stepsPenalty)    //if too many marks are awarded for steps, it's possible that getting all the steps right leads to a higher score than just getting the part right. Clip the score to avoid this.
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
            this.score = this.credit * this.marks;
            this.applyScoreLimits();
        }
        if(this.revealed) {
            this.score = 0;
        }
        if(this.parentPart && !this.parentPart.submitting)
            this.parentPart.calculateScore();
        this.display && this.display.showScore(this.answered);
    },

    /** Make sure the awarded score is between the minimum and maximum available.
     */
    applyScoreLimits: function() {
        if(this.settings.enableMinimumMarks && this.score<this.settings.minimumMarks) {
            this.score = this.settings.minimumMarks;
            this.creditFraction = this.marks!=0 ? math.Fraction.fromFloat(this.settings.minimumMarks,this.marks) : 0;
            this.markingComment(R('part.marking.minimum score applied',{score:this.settings.minimumMarks}));
        }
        if(this.score>this.marks) {
            this.finalised_result.states.push(Numbas.marking.feedback.sub_credit(this.credit-1, R('part.marking.maximum score applied',{score:this.marks})));
            this.score = this.marks;
            this.creditFraction = math.Fraction.one;
            this.markingComment(R('part.marking.maximum score applied',{score:this.marks}));
        }
    },

    /** Update the stored answer from the student (called when the student changes their answer, but before submitting)
     * @param {*} answer
     * @see {Numbas.parts.Part.stagedAnswer}
     */
    storeAnswer: function(answer) {
        this.stagedAnswer = answer;
        this.setDirty(true);
        this.removeWarnings();
    },
    /** Call when the student changes their answer, or submits - update {@link Numbas.parts.Part.isDirty}
     * @param {Boolean} dirty
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
    },
    /** Get a JME scope for this part.
     * If `this.question` is set, use the question's scope. Otherwise, use {@link Numbas.jme.builtinScope}.
     * @returns {Numbas.jme.Scope}
     */
    getScope: function() {
        if(!this.scope) {
            if(this.question) {
                this.scope = this.question.scope;
            } else {
                this.scope = new Numbas.jme.Scope(Numbas.jme.builtinScope);
            }
        }
        return this.scope;
    },
    /** Submit the student's answers to this part - remove warnings. save answer, calculate marks, update scores
     */
    submit: function() {
        this.shouldResubmit = false;
        this.credit = 0;
        this.markingFeedback = [];
        this.finalised_result = {valid: false, credit: 0, states: []};
        this.submitting = true;
        if(this.parentPart && !this.parentPart.submitting) {
            this.parentPart.setDirty(true);
        }
        if(this.stepsShown)
        {
            var stepsMax = this.marks - this.settings.stepsPenalty;
            this.markingComment(
                this.settings.stepsPenalty>0
                    ? R('part.marking.revealed steps with penalty',{count:stepsMax})
                    : R('part.marking.revealed steps no penalty'));
        }
        this.setStudentAnswer();
        if(this.doesMarking) {
            this.removeWarnings();
            if(this.hasStagedAnswer()) {
                this.setDirty(false);
                // save existing feedback
                var existing_feedback = {
                    warnings: this.warnings.slice(),
                    markingFeedback: this.markingFeedback.slice()
                };
                var result;
                var try_replacement;
                try{
                    if(this.settings.variableReplacementStrategy=='originalfirst') {
                        var result_original = this.markAgainstScope(this.getScope(),existing_feedback);
                        result = result_original;
                        var try_replacement = this.settings.hasVariableReplacements && (!result.answered || result.credit<1);
                    }
                    if(this.settings.variableReplacementStrategy=='alwaysreplace' || try_replacement) {
                        try {
                            var scope = this.errorCarriedForwardScope();
                            var result_replacement = this.markAgainstScope(scope,existing_feedback);
                            if(!(result_original) || (result_replacement.answered && result_replacement.credit>result_original.credit)) {
                                result = result_replacement;
                                result.finalised_result.states.splice(0,0,Numbas.marking.feedback.feedback(R('part.marking.used variable replacements')));
                                result.markingFeedback.splice(0,0,{op: 'comment', message: R('part.marking.used variable replacements')});
                            }
                        } catch(e) {
                            if(e.originalMessage=='part.marking.variable replacement part not answered') {
                                this.markingComment(e.message);
                            } else {
                                try{
                                    this.error(e.message,{},e);
                                } catch(pe) {
                                    console.error(pe.message);
                                }
                            }
                        }
                    }
                    if(!result) {
                        this.setCredit(0,R('part.marking.no result after replacement'));
                        this.answered = true;
                    } else {
                        this.setWarnings(result.warnings);
                        this.markingFeedback = result.markingFeedback;
                        this.finalised_result = result.finalised_result;
                        this.credit = result.credit;
                        this.answered = result.answered;
                    }
                } catch(e) {
                    this.error('part.marking.uncaught error',{message:e.message},e);
                }
            } else {
                this.giveWarning(R('part.marking.not submitted'));
                this.setCredit(0,R('part.marking.did not answer'));;
                this.answered = false;
            }
        }
        if(this.stepsShown) {
            for(var i=0;i<this.steps.length;i++) {
                if(this.steps[i].isDirty) {
                    this.steps[i].submit();
                }
            }
        }
        this.calculateScore();
        this.question && this.question.updateScore();
        if(this.answered)
        {
            if(!(this.parentPart && this.parentPart.type=='gapfill') && this.settings.showFeedbackIcon && this.marks!=0) {
                this.markingComment(
                    R('part.marking.total score',{count:this.score})
                );
            }
            this.display && this.display.showScore(this.answered);
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
    },
    /** Has the student entered an answer to this part?
     * @see Numbas.parts.Part#stagedAnswer
     * @returns {Boolean}
     */
    hasStagedAnswer: function() {
        return !(this.stagedAnswer==undefined);
    },
    /** Called by another part when its marking means that the marking for this part might change (i.e., when this part replaces a variable with the answer from the other part)
     * Sets this part as dirty, and gives a warning explaining why the student must resubmit.
     */
    pleaseResubmit: function() {
        if(!this.shouldResubmit) {
            this.shouldResubmit = true;
            this.setDirty(true);
            this.giveWarning(R('part.marking.resubmit because of variable replacement'));
        }
    },
    /** @typedef {Object} Numbas.parts.feedbackmessage
     * @property {String} op - the kind of feedback
     * @see Numbas.parts.Part#setCredit Numbas.parts.Part#addCredit Numbas.parts.Part#multCredit Numbas.parts.Part#markingComment
     */
    /** @typedef {Object} Numbas.parts.marking_results
     * A dictionary representing the results of marking a student's answer.
     * @property {Array.<String>} warnings - Warning messages.
     * @property {Numbas.marking.finalised_state} finalised_result - sequence of marking operations
     * @property {Array.<Numbas.parts.feedbackmessage>} markingFeedback - Feedback messages to show to student, produced from `finalised_result`.
     * @property {Number} credit - Proportion of the available marks to award to the student.
     * @property {Boolean} answered - True if the student's answer could be marked. False if the answer was invalid - the student should change their answer and resubmit.
     */
    /** Calculate the correct answer in the given scope, and mark the student's answer
     * @param {Numbas.jme.Scope} scope - scope in which to calculate the correct answer
     * @param {Object.<Array.<String>>} feedback - dictionary of existing `warnings` and `markingFeedback` lists, to add to - copies of these are returned with any additional feedback appended
     * @returns {Numbas.parts.marking_results}
     */
    markAgainstScope: function(scope,feedback) {
        this.setWarnings(feedback.warnings.slice());
        this.markingFeedback = feedback.markingFeedback.slice();
        var finalised_result = {states: [], valid: false, credit: 0};
        try {
            finalised_result = this.mark(scope);
        } catch(e) {
            this.giveWarning(e.message);
        }
        return {
            warnings: this.warnings.slice(),
            markingFeedback: this.markingFeedback.slice(),
            finalised_result: finalised_result,
            credit: this.credit,
            answered: this.answered
        }
    },
    /** Replace variables with student's answers to previous parts
     * @returns {Numbas.jme.Scope}
     */
    errorCarriedForwardScope: function() {
        // dictionary of variables to replace
        var replace = this.settings.errorCarriedForwardReplacements;
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
        var scope = new Numbas.jme.Scope([this.question.scope,{variables: new_variables}])
        // find dependent variables which need to be recomputed
        var todo = Numbas.jme.variables.variableDependants(this.question.variablesTodo,replaced);
        for(var name in todo) {
            if(name in new_variables) {
                delete todo[name];
            } else {
                scope.deleteVariable(name);
            }
        }
        // compute those variables
        var nv = Numbas.jme.variables.makeVariables(todo,scope);
        scope = new Numbas.jme.Scope([scope,{variables:nv.variables}]);
        return scope;
    },
    /** Compute the correct answer, based on the given scope.
     * Anything to do with marking that depends on the scope should be in this method, and calling it with a new scope should update all the settings used by the marking algorithm.
     * @param {Numbas.jme.Scope} scope
     * @abstract
     */
    getCorrectAnswer: function(scope) {},
    /** Save an answer entered by the student, for use in marking.
     * @abstract
     */
    setStudentAnswer: function() {},
    /** Get the student's answer as it was entered as a JME data type, to be used in the marking script.
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
    },
    /** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
     * @abstract
     * @returns {Numbas.jme.token}
     */
    studentAnswerAsJME: function() {
        return this.interpretedStudentAnswer;
    },
    /** Function which marks the student's answer: run `this.settings.markingScript`, which sets the credit for the student's answer to a number between 0 and 1 and produces a list of feedback messages and warnings.
     * If the question has been answered in a way that can be marked, `this.answered` should be set to `true`.
     * @see Numbas.parts.Part#markingScript
     * @see Numbas.parts.Part#answered
     * @param {Numbas.jme.Scope} scope
     * @returns {Numbas.marking.finalised_state}
     */
    mark: function(scope) {
        var studentAnswer = this.rawStudentAnswerAsJME();
        if(studentAnswer==undefined) {
            this.setCredit(0,R('part.marking.nothing entered'));
            return;
        }
        var result = this.mark_answer(studentAnswer,scope);
        var finalised_result = marking.finalise_state(result.states.mark)
        this.apply_feedback(finalised_result);
        this.interpretedStudentAnswer = result.values['interpreted_answer'];
        return finalised_result;
    },
    /** Apply a finalised list of feedback states to this part.
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
                    part.multCredit(scale*state.factor, state.message);
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
                    part.markingComment(state.message);
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
                    scale = state.scale;
                    break;
                case 'end_lift':
                    var last_lift = lifts.pop();
                    var lift_credit = this.credit;
                    this.creditFraction = last_lift.creditFraction;
                    this.addCredit(lift_credit*last_lift.scale);
                    scale = last_lift.scale;
                    break;
            }
            i += 1;
            if(end) {
                break;
            }
        }
        part.answered = valid;
    },
    marking_parameters: function(studentAnswer) {
        studentAnswer = jme.makeSafe(studentAnswer);
        return {
            path: jme.wrapValue(this.path),
            name: jme.wrapValue(this.name),
            question_definitions: jme.wrapValue(this.question ? this.question.local_definitions : {}),
            studentAnswer: studentAnswer,
            settings: jme.wrapValue(this.settings),
            marks: new jme.types.TNum(this.marks),
            partType: new jme.types.TString(this.type),
            gaps: jme.wrapValue(this.gaps.map(function(g){return g.marking_parameters(g.rawStudentAnswerAsJME())})),
            steps: jme.wrapValue(this.steps.map(function(s){return s.marking_parameters(s.rawStudentAnswerAsJME())}))
        };
    },
    /** Run the marking script against the given answer.
     * This does NOT apply the feedback and credit to the part object, it just returns it.
     * @param {Numbas.jme.token} studentAnswer
     * @param {Numbas.jme.Scope} scope
     * @see Numbas.parts.Part#mark
     * @returns {Numbas.marking.marking_script_result}
     */
    mark_answer: function(studentAnswer,scope) {
        try {
            this.getCorrectAnswer(scope);
            var result = this.markingScript.evaluate(
                scope,
                this.marking_parameters(studentAnswer)
            );
        } catch(e) {
            throw(new Numbas.Error("part.marking.error in marking script",{message:e.message}));
        }
        if(result.state_errors.mark) {
            throw(result.state_errors.mark);
        }
        return result;
    },
    /** Set the `credit` to an absolute value
     * @param {Number} credit
     * @param {String} message - message to show in feedback to explain this action
     * @param {String} reason - why was the credit set to this value? If given, either 'correct' or 'incorrect'.
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
    },
    /** Add an absolute value to `credit`
     * @param {Number} credit - amount to add
     * @param {String} message - message to show in feedback to explain this action
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
    },
    /** Subtract an absolute value from `credit`
     * @param {Number} credit - amount to subtract
     * @param {String} message - message to show in feedback to explain this action
     */
    subCredit: function(credit,message)
    {
        var creditFraction = math.Fraction.fromFloat(credit);
        this.creditFraction = this.creditFraction.subtract(creditFraction);
        if(this.settings.showFeedbackIcon) {
            this.markingFeedback.push({
                op: 'sub_credit',
                credit: credit,
                message: message
            });
        }
    },
    /** Multiply `credit` by the given amount - use to apply penalties
     * @param {Number} factor
     * @param {String} message - message to show in feedback to explain this action
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
        }
    },
    /** Add a comment to the marking feedback
     * @param {String} message
     */
    markingComment: function(message)
    {
        this.markingFeedback.push({
            op: 'feedback',
            message: message
        });
    },
    /** Show the steps, as a result of the student asking to show them.
     * If the answers have not been revealed, we should apply the steps penalty.
     *
     * @param {Boolean} dontStore - don't tell the storage that this is happening - use when loading from storage to avoid callback loops
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
    },
    /** Open the steps, either because the student asked or the answers to the question are being revealed. This doesn't affect the steps penalty.
     */
    openSteps: function() {
        this.stepsOpen = true;
        this.display && this.display.showSteps();
    },
    /** Close the steps box. This doesn't affect the steps penalty.
     */
    hideSteps: function()
    {
        this.stepsOpen = false;
        this.display && this.display.hideSteps();
        this.store && this.store.stepsHidden(this);
    },
    /** Reveal the correct answer to this part
     * @param {Boolean} dontStore - don't tell the storage that this is happening - use when loading from storage to avoid callback loops
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
    }
};

});
