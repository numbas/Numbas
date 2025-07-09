Numbas.queueScript('exam-to-xml', [], function() {

class ExamError extends Error {
    constructor(message, hint='') {
        super();
        this.message = message;
        this.hint = hint;
    }
}

/**
 * Return a template literal formatter which copies attributes from the given object to a new object.
 * Put each attribute name on a separate line.
 * You can give an interpolation to specify a different value for a target attribute.
 * 
 * @param {object} arg
 * @returns {Function}
 */
function copy_attrs(arg) {
        return function(strs, ...vars) {
                let o = {};
                strs.forEach((str, i) => {
                        str = str.trim();
                        if(!str) {
                                return;
                        }
                        const lines = str.split('\n');
                        lines.slice(0, -1).forEach(line => {
                                line = line.trim();
                                o[line] = arg[line];
                        });
                        const last = lines.at(-1).trim();
                        o[last] = i < vars.length ? vars[i] : arg[last];
                })
                return o;
        }
}

/**
 * Convert all the keys in the object to lowercase.
 *
 * @param {object} data
 * @returns {object}
 */
function lowercase_keys(data) {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k.toLowerCase(), v]));
}

class ExamEvent {
    constructor(builder, name, action, message) {
        this.builder = builder;
        this.name = name;
        this.action = action;
        this.message = message;
    }

    toXML() {
        return this.builder.element(
            'event',
            {
                type: this.name,
                action: this.action,
            },
            [this.builder.makeContentNode(this.message)]
        );
    }
}

class FeedbackMessage {
    message = '';
    threshold = 0;
    
    constructor(builder, data) {
        this.builder = builder;

        builder.tryLoad(data, ['message', 'threshold'], this);
    }

    toXML() {
        return this.builder.element(
            'feedbackmessage',
            {
                threshold: this.threshold
            },
            [this.builder.makeContentNode(this.message)]
        );
    }
}

class QuestionGroup {
    name = '';
    pickingStrategy = 'all-ordered'; // 'all-ordered', 'all-shuffled', 'random-subset'
    pickQuestions = 0;

    constructor(builder, data) {
        this.builder = builder;
        this.questions = [];

        builder.tryLoad(data, ['name', 'pickingStrategy', 'pickQuestions'], this);

        const {questions, questionnames, variable_overrides} = lowercase_keys(data);

        if(questions) {
            this.questions = questions.map(q => builder.question(q));
        }

        if(questionnames) {
            questionnames.forEach((name, i) => {
                this.questions[i].customName = name
            });
        }

        if(variable_overrides) {
            variable_overrides.forEach((vos, i) => {
                const q = this.questions[i];
                for(let {name, definition} of vos) {
                    const v = q.get_variable(name);
                    if(v) {
                        v.definition = definition;
                    }
                }
            })
        }
    }

    toXML() {
        return this.builder.element(
            'question_group',
            {
                name: this.name,
                pickingStrategy: this.pickingStrategy,
                pickQuestions: this.pickQuestions,
            },
            [
                this.builder.element(
                    'questions',
                    {},
                    this.questions.map(q => q.toXML())
                )
            ]
        );
    }
}

class Question {
    name = 'Untitled Question';
    customName = '';
    statement = '';
    advice = '';
    parts_mode = 'all';
    maxMarks = 0;
    objectiveVisibility = 'always';
    penaltyVisibility = 'always';
    
    constructor(builder, data) {
        this.builder = builder;

        this.name = data.name;
        this.parts = [];
        this.builtin_constants = {};
        this.constants = [];
        this.variables = [];
        this.variablesTest = {
            condition: '',
            maxruns: 10
        };

        this.functions = [];
        this.rulesets = {};

        this.tags = [];
        this.objectives = [];
        this.penalties = [];

        this.extensions = [];

        this.preamble = {
            js: '',
            css: ''
        }

        builder.tryLoad(data, ['name', 'statement', 'advice', 'maxMarks', 'objectiveVisibility', 'penaltyVisibility', 'extensions'], this);

        builder.tryLoad(data, ['partsMode'], this, ['parts_mode']);

        const {tags, parts, builtin_constants, constants, variables, variablesTest, functions, preamble, rulesets, objectives, penalties} = data;

        if(tags) {
            this.tags = tags.slice();
        }

        if(parts) {
            this.parts = parts.map(p => builder.part(p));
        }

        if(builtin_constants) {
            this.builtin_constants = builtin_constants;
        }

        if(constants) {
            this.constants = constants.map(c => builder.custom_constant(c));
        }

        if(variables) {
            this.variables = Object.values(variables).map(v => builder.variable(v));
        }

        if(variablesTest) {
            builder.tryLoad(variablesTest, ['condition', 'maxRuns'], this.variablesTest);
        }

        if(functions) {
            this.functions = Object.entries(functions).map(([name, def]) => builder.function(name, def));
        }

        if(preamble) {
            builder.tryLoad(preamble, ['js', 'css'], this.preamble);
        }

        if(rulesets) {
            this.rulesets = builder.rulesets(rulesets);
        }

        if(objectives) {
            this.objectives = objectives.map(o => builder.scorebin(o));
        }

        if(penalties) {
            this.penalties = penalties.map(p => builder.scorebin(p));
        }
    }

    get_variable(name) {
        return this.variables.find(v => v.name == name);
    }

    toXML() {
        const {builder} = this;
        const element = builder.element.bind(builder);
        
        return element(
            'question',
            copy_attrs(this)`
                name
                customName
                partsmode ${this.parts_mode}
                maxMarks
                objectiveVisibility
                penaltyVisibility
            `,
            [
                element('statement', {}, [ builder.makeContentNode(this.statement) ]),
                element(
                    'parts', 
                    {},
                    this.parts.map(p => p.toXML())
                ),
                element('advice', {}, [ builder.makeContentNode(this.advice) ]),
                element(
                    'constants',
                    {},
                    [
                        element(
                            'builtin',
                            {},
                            Object.entries(this.builtin_constants).map(([name, enable]) => element('constant', {name, enable}))
                        ),
                        element(
                            'custom',
                            {},
                            this.constants.map(c => c.toXML())
                        )
                    ]
                ),
                element(
                    'variables',
                    {
                        condition: this.variablesTest.condition,
                        maxRuns: this.variablesTest.maxRuns
                    },
                    this.variables.map(v => v.toXML())
                ),
                element(
                    'functions',
                    {},
                    this.functions.map(f => f.toXML())
                ),
                element(
                    'preambles',
                    {
                        nosubvars: true
                    },
                    Object.entries(this.preamble).map(([language, text]) => element('preamble', {language}, [builder.text_node(text)]))
                ),

                element(
                    'rulesets',
                    {},
                    Object.entries(this.rulesets).map(([name, rules]) => 
                        element(
                            'set',
                            {name},
                            rules.map(rule => typeof rule == 'string' ? element('include', {name:rule}) : rule.toXML())
                        )
                    )
                ),

                element('objectives', {}, this.objectives.map(o => o.toXML())),
                element('penalties', {}, this.penalties.map(p => p.toXML())),

                element('tags', {}, this.tags.map(tag => element('tag', {}, [builder.text_node(tag)]))),

                element('extensions', {}, this.extensions.map(extension => element('extension', {}, [builder.text_node(extension)])))
            ]
        )
    }
}

class CustomConstant {
    name = '';
    value = '';
    tex = '';
    
    constructor(builder, data) {
        this.builder = builder;

        builder.tryLoad(data, ['name', 'value', 'tex'], this);
    }

    toXML() {
        return this.builder.element(
            'constant',
            {
                name: this.name,
                value: this.value,
                tex: this.tex
            }
        )
    }
}

class CustomFunction {
    name = '';
    type = '';
    definition = '';
    language = 'jme';

    constructor(builder, name, data) {
        this.builder = builder;
        
        this.parameters = {};
        
        this.name = name;
        
        builder.tryLoad(data, ['parameters', 'type', 'definition', 'language'], this);
    }

    toXML() {
        const {builder} = this;

        return builder.element(
            'function',
            {
                name: this.name,
                outtype: this.type,
                definition: this.definition,
                language: this.language,
            },
            [
                builder.element(
                    'parameters',
                    {},
                    this.parameters.map(([name, type]) => builder.element('parameter', {name, type}))
                )
            ]
        )
    }
}

class VariableReplacement {
    variable = '';
    part = '';
    must_go_first = false;
    
    constructor(builder, data) {
        this.builder = builder;

        builder.tryLoad(data, ['variable', 'part', 'must_go_first'], this);
    }

    toXML() {
        return this.builder.element(
            'replace',
            {
                variable: this.variable,
                part: this.part,
                must_go_first: this.must_go_first
            }
        )
    }
}

class NextPart {
    otherPart = '';
    label = '';
    availabilityCondition = '';
    penalty = '';
    penaltyAmount = '';
    showPenaltyHint = true;
    lockAfterLeaving = false;
    
    constructor(builder, data) {
        this.builder = builder;
        this.variable_replacements = [];

        builder.tryLoad(data, ['otherPart', 'label', 'availabilityCondition', 'penalty', 'showPenaltyHint', 'lockAfterLeaving', 'penaltyAmount'], this);

        const {variablereplacements} = lowercase_keys(data);
        if(variablereplacements) {
            this.variable_replacements = variablereplacements.map(vrd => builder.tryLoad(vrd, ['variable', 'definition'], {}));
        }
    }

    toXML() {
        const {builder} = this;
        const element = builder.element.bind(builder);

        return element(
            'nextpart',
            copy_attrs(this)`
                index ${this.otherPart}
                label
                availabilityCondition
                penalty
                penaltyAmount
                showPenaltyHint
                lockAfterLeaving
            `,
            [
                element(
                    'variablereplacements',
                    {},
                    this.variable_replacements.map(({variable, definition}) => element('replacement', {variable, definition}))
                )
            ]
        )
    }
}

class Variable {
    name = '';
    definition = '';
    
    constructor(builder, data) {
        this.builder = builder;

        builder.tryLoad(data, ['name', 'definition'], this);
    }

    toXML() {
        const {builder} = this;
        
        return builder.element(
            'variable',
            {
                name: this.name
            },
            [ 
                builder.element(
                    'value',
                    {},
                    [ builder.text_node(this.definition) ]
                )
            ]
        );
    }
}

class ScoreBin {
    name = '';
    limit = 0;

    constructor(builder, data) {
        this.builder = builder;

        builder.tryLoad(data, ['name', 'limit'], this);
    }

    toXML() {
        return this.builder.element(
            'scorebin',
            {
                name: this.name,
                limit: this.limit
            }
        )
    }
}

class Part {
    useCustomName = false;
    customName = '';
    prompt = '';
    alternativeFeedbackMessage = '';
    useAlternativeFeedback = false;
    type = '';
    stepsPenalty = 0;
    enableMinimumMarks = true;
    minimumMarks = 0;
    showCorrectAnswer = true;
    showFeedbackIcon = true;
    variableReplacementStrategy = 'originalfirst';
    adaptiveMarkingPenalty = 0;
    customMarkingAlgorithm = '';
    extendBaseMarkingAlgorithm = true;
    exploreObjective = null;
    suggestGoingBack = false;
    
    constructor(builder, data) {
        this.builder = builder;

        this.steps = [];
        this.alternatives = [];
        this.scripts = {};
        this.variable_replacements = [];
        this.next_parts = [];

        builder.tryLoad(
            data,
            [
                    'useCustomName',
                    'customName',
                    'stepsPenalty',
                    'minimumMarks',
                    'enableMinimumMarks',
                    'showCorrectAnswer',
                    'showFeedbackIcon',
                    'variableReplacementStrategy',
                    'adaptiveMarkingPenalty',
                    'customMarkingAlgorithm',
                    'extendBaseMarkingAlgorithm',
                    'exploreObjective',
                    'suggestGoingBack',
                    'useAlternativeFeedback',
            ],
            this
        );

        const {marks, prompt, alternativefeedbackmessage, steps, alternatives, scripts, variablereplacements, nextparts} = lowercase_keys(data);

        if(marks !== undefined) {
            this.marks = marks;
        }

        if(prompt !== undefined) {
            this.prompt = prompt;
        }

        if(alternativefeedbackmessage) {
            this.alternativeFeedbackMessage = alternativefeedbackmessage;
        }

        if(steps) {
            this.steps = steps.map(step => builder.part(step));
        }

        if(alternatives) {
            this.alternatives = alternatives.map(alternative => builder.part(alternative));
        }

        if(scripts) {
            Object.assign(this.scripts, scripts);
        }

        if(variablereplacements) {
            this.variable_replacements = variablereplacements.map(vr => builder.variable_replacement(vr));
        }

        if(nextparts) {
            this.next_parts = nextparts.map(np => builder.next_part(np));
        }
    }

    toXML() {
        const {builder} = this;
        const element = builder.element.bind(builder);
        return element(
            'part',
            copy_attrs(this)`
            useCustomName
            type
            marks
            stepsPenalty
            enableMinimumMarks
            minimumMarks
            showCorrectAnswer
            showFeedbackIcon
            exploreObjective
            suggestGoingBack
            useAlternativeFeedback
            customName
            `,
            [
                element('prompt', {}, [builder.makeContentNode(this.prompt)]),
                element('alternativefeedbackmessage', {}, this.alternativeFeedbackMessage ? [builder.makeContentNode(this.alternativeFeedbackMessage)] : []),
                element('steps', {}, this.steps.map(step => step.toXML())),
                element('alternatives', {}, this.alternatives.map(alternative => alternative.toXML())),
                element('scripts', {}, Object.entries(this.scripts).map(([name, {order, script}]) => element('script', {name, order: order || 'instead'}, [builder.text_node(script)]))),
                element('markingalgorithm', {extend: this.extendBaseMarkingAlgorithm}, [builder.text_node(this.customMarkingAlgorithm)]),
                element(
                    'adaptivemarking',
                    {
                        penalty: this.adaptiveMarkingPenalty,
                        strategy: this.variableReplacementStrategy,
                    },
                    [
                        element(
                            'variablereplacements',
                            {},
                            this.variable_replacements.map(vr => vr.toXML())
                        )
                    ]
                ),
                element('nextparts', {}, this.next_parts.map(np => np.toXML()))
            ]
        );
    }
}

class JMEPart extends Part {
    type = 'jme'
    answer = '';
    answerSimplification = '';
    showPreview = true;
    checkingType = 'reldiff';
    checkingAccuracy = 0;
    failureRate = 1;
    vsetRangeStart = 0;
    vsetRangeEnd = 1;
    vsetRangePoints = 5;
    checkVariableNames = false;
    singleLetterVariables = false;
    allowUnknownFunctions = true;
    implicitFunctionComposition = false;
    caseSensitive = false;

    constructor(builder, data) {
        super(builder, data);
        this.valueGenerators = [];

        builder.tryLoad(data, ['answer', 'answerSimplification', 'showPreview', 'checkingType', 'failureRate', 'vsetRangePoints', 'checkVariableNames', 'singleLetterVariables', 'allowUnknownFunctions', 'implicitFunctionComposition', 'caseSensitive'], this);

        if(this.checkingType.toLowerCase() == 'reldiff' || this.checkingType.toLowerCase() == 'absdiff') {
            this.checkingAccuracy = 0.0001;
        } else { // dp or sigfig
            this.checkingAccuracy = 5;
        }

        builder.tryLoad(data, 'checkingAccuracy', this);

        const {maxlength, minlength, musthave, notallowed, mustmatchpattern, vsetrange, valuegenerators} = lowercase_keys(data);

        this.maxLength = builder.length_restriction('maxlength', maxlength, 'Your answer is too long.');
        this.minLength = builder.length_restriction('minlength', minlength, 'Your answer is too short.');
        this.mustHave = builder.string_restriction('musthave', musthave, 'Your answer does not contain all required elements.');
        this.notAllowed = builder.string_restriction('notallowed', notallowed, 'Your answer contains elements which are not allowed.');
        this.mustMatchPattern = builder.pattern_restriction('mustmatchpattern', mustmatchpattern);

        if(vsetrange) {
            const [start, end] = vsetrange;
            this.vsetRangeStart = start;
            this.vsetRangeEnd = end;
        }

        if(valuegenerators) {
            this.valueGenerators = valuegenerators.slice();
        }
    }

    toXML() {
        const part = super.toXML();

        const {builder} = this;
        const element = builder.element.bind(builder);
        const text_node = builder.text_node.bind(builder);

        part.append(element(
            'answer',
            copy_attrs(this)`
                checkVariableNames
                singleLetterVariables
                allowUnknownFunctions
                implicitFunctionComposition
                caseSensitive
                showPreview
            `,
            [
                element(
                    'correctanswer',
                    {
                        simplification: this.answerSimplification
                    },
                    [ element('math', {}, [text_node(this.answer)]) ]
                ),
                element(
                    'checking',
                    {
                        type: this.checkingType,
                        accuracy: this.checkingAccuracy,
                        failureRate: this.failureRate
                    },
                    [ 
                        element(
                            'range', 
                            {
                                start: this.vsetRangeStart,
                                end: this.vsetRangeEnd,
                                points: this.vsetRangePoints
                            }
                        ),
                        element('valuegenerators', {}, this.valueGenerators.map(({name, value}) => element('generator', {name, value}))),
                    ]
                ),

                this.maxLength.toXML(),
                this.minLength.toXML(),
                this.mustHave.toXML(),
                this.notAllowed.toXML(),
                this.mustMatchPattern.toXML()
            ]
        ));
        
        return part;
    }
}

class Restriction {
    message = '';
    partialCredit = 0;
    
    constructor(builder, name, data, default_message) {
        this.builder = builder;
        this.message = default_message;
        
        this.name = name;

        builder.tryLoad(data, ['partialCredit', 'message'], this);
    } 

    toXML() {
        return this.builder.element(
            this.name,
            {
                partialcredit: `${this.partialCredit}%`
            },
            [ this.builder.element('message', {}, [this.builder.makeContentNode(this.message)])]
        );
    }
}

class LengthRestriction extends Restriction {
    length = 0;
    
    constructor(builder, name, data, ...args) {
        super(builder, name, data, ...args);

        builder.tryLoad(data, ['length'], this);
    }

    toXML() {
        const restriction = super.toXML();

        if(this.length >= 0) {
            restriction.setAttribute('length', this.length);
        }

        return restriction;
    }
}

class StringRestriction extends Restriction {
    showStrings = false;
    
    constructor(builder, name, data, ...args) {
        super(builder, name, data, ...args);
        
        this.strings = [];

        builder.tryLoad(data, ['showStrings'], this);

        const {strings} = data;
        if(strings) {
            this.strings = strings.slice();
        }
    }

    toXML() {
        const restriction = super.toXML();

        restriction.setAttribute('showstrings', this.showStrings);

        for(let string of this.strings) {
            restriction.append(this.builder.element('string', {}, [this.builder.text_node(string)]));
        }

        return restriction;
    }
}

class PatternRestriction extends Restriction {
    pattern = '';
    nameToCompare = '';
    warningTime = 'input';

    constructor(builder, name, data, ...args) {
        super(builder, name, data, ...args);

        builder.tryLoad(data, ['pattern', 'nameToCompare', 'warningTime'], this);
    }

    toXML() {
        const restriction = super.toXML();

        restriction.setAttribute('pattern', this.pattern);
        restriction.setAttribute('nametocompare', this.nameToCompare);
        restriction.setAttribute('warningtime', this.warningTime);

        return restriction;
    }
}

class PatternMatchPart extends Part {
    type = 'patternmatch';
    caseSensitive = false;
    partialCredit = 0;
    answer = '';
    displayAnswer = '';
    matchMode = 'regex';

    constructor(builder, data) {
        super(builder, data);

        builder.tryLoad(data, ['caseSensitive', 'partialCredit', 'answer', 'displayAnswer', 'matchMode'], this);
    }

    toXML() {
        const part = super.toXML();

        const {builder} = this;
        const element = builder.element.bind(builder);
        
        part.append(element('displayanswer', {}, [builder.makeContentNode(this.displayAnswer)]));

        part.append(element('correctanswer', {mode:this.matchMode}, [builder.text_node(this.answer)]));

        part.append(element(
            'case',
            {
                sensitive: this.caseSensitive,
                partialcredit: `${this.partialCredit}%`
            }
        ));

        return part;
    }
}

class NumberEntryPart extends Part {
    type = 'numberentry';
    allowFractions = false;
    notationStyles = ['en', 'si-en', 'plain'];
    checkingType = 'range';
    answer = 0;
    checkingAccuracy = 0;
    minvalue = 0;
    maxvalue = 0;
    correctAnswerFraction = false;
    correctAnswerStyle = 'plain';
    inputStep = 1;

    mustBeReduced = false;
    mustBeReducedPC = 0;

    precisionType = 'none';
    precision = 0;
    precisionPartialCredit = 0;
    precisionMessage = '';
    showPrecisionHint = true;
    showFractionHint = true;
    strictPrecision = true;
    displayAnswer = '';

    constructor(builder, data) {
        super(builder, data);

        builder.tryLoad(data, ['correctAnswerFraction', 'correctAnswerStyle', 'allowFractions', 'notationStyles', 'checkingType', 'inputstep', 'mustBeReduced', 'mustBeReducedPC', 'precisionType', 'precision', 'precisionPartialCredit', 'precisionMessage', 'strictPrecision', 'showPrecisionHint', 'showFractionHint', 'displayAnswer'], this);

        const {answer} = lowercase_keys(data);
        if(this.checkingType == 'range') {
            if(answer !== undefined) {
                this.maxvalue = this.minvalue = answer;
            } else {
                builder.tryLoad(data, ['minvalue', 'maxvalue'], this);
            }
        } else {
            builder.tryLoad(data, ['answer', 'checkingAccuracy'], this);
        }
    }

    toXML() {
        const part = super.toXML();

        const {builder} = this;
        const element = builder.element.bind(builder);

        part.append(element(
            'answer',
            Object.assign(
                copy_attrs(this)`
                    checkingType
                    inputStep
                    allowFractions
                    showFractionHint
                    notationStyles ${this.notationStyles.join(',')}
                    correctAnswerFraction
                    correctAnswerStyle
                    mustBeReduced
                    mustBeReducedPC ${this.mustBeReducedPC+'%'}
                    displayAnswer
                `,
                this.checkingType == 'range' ?
                    {
                        minvalue: this.minvalue,
                        maxvalue: this.maxvalue
                    }
                :
                    {
                        answer: this.answer,
                        checkingAccuracy: this.checkingAccuracy
                    }
            ),
            [
                element(
                    'precision',
                    {
                        type: this.precisionType,
                        precision: this.precision,
                        partialcredit: `${this.precisionPartialCredit}%`,
                        strict: this.strictPrecision,
                        showprecisionhint: this.showPrecisionHint
                    },
                    [ element('message', {}, [builder.makeContentNode(this.precisionMessage)])]
                )
            ]
        ));

        return part;
    }
}

class MatrixEntryPart extends Part {
    type = 'matrix';
    correctAnswer = '';
    correctAnswerFractions = false;
    numRows = 3;
    numColumns = 3;
    allowResize = true;
    minColumns = 0;
    maxColumns = 0;
    minRows = 0;
    maxRows = 0;
    prefilledCells = '';
    tolerance = 0;
    markPerCell = false;
    allowFractions = false;
    precisionType = 'none';
    precision = 0;
    precisionPartialCredit = 0;
    precisionMessage = '';
    strictPrecision = true;

    constructor(builder, data) {
        super(builder, data);

        builder.tryLoad(
            data,
            [
                'correctAnswer',
                'correctAnswerFractions',
                'numRows',
                'numColumns',
                'allowResize',
                'minColumns',
                'maxColumns',
                'minRows',
                'maxRows',
                'prefilledCells',
                'tolerance',
                'markPerCell',
                'allowFractions',
                'precisionType',
                'precision',
                'precisionPartialCredit',
                'precisionMessage',
                'strictPrecision'
            ],
            this
        );
    }

    toXML() {
        const part = super.toXML();

        const {builder} = this;
        const element = builder.element.bind(builder);

        part.append(element(
            'answer',
            copy_attrs(this)`
                correctAnswer
                correctAnswerFractions
                rows ${this.numRows}
                columns ${this.numColumns}
                allowResize
                minColumns
                maxColumns
                minRows
                maxRows
                tolerance
                markPerCell
                allowFractions
                prefilledCells
            `,
            [
                element(
                    'precision',
                    {
                        type: this.precisionType,
                        precision: this.precision,
                        partialCredit: `${this.precisionPartialCredit}%`,
                        strict: this.strictPrecision
                    },
                    [ element('message', {}, [builder.makeContentNode(this.precisionMessage)]) ]
                )
            ]
        ));

        return part;
    }
}

class MultipleChoicePart extends Part {
    minMarksEnabled = false;
    minMarks = 0;
    maxMarksEnabled = false;
    maxMarks = 0;
    minAnswers = 0;
    maxAnswers = 0;
    shuffleChoices = false;
    shuffleAnswers = false;
    displayType = 'radiogroup';
    displayColumns = 1;
    showBlankOption = true;
    warningType = 'none';
    layoutType = 'all';
    layoutExpression = '';
    showCellAnswerState = true;
    markingMethod = 'positive';
    choicesHeader = '';
    answersHeader = '';

    default_displayType() {
        return 'radiogroup';
    }

    constructor(builder, data) {
        super(builder, data);

        this.choices = [];
        this.answers = [];
        this.matrix = [];
        this.distractors = [];

        this.displayType = this.default_displayType();

        builder.tryLoad(data, ['minMarks', 'maxMarks', 'minAnswers', 'maxAnswers', 'shuffleChoices', 'shuffleAnswers', 'displayType', 'displayColumns', 'warningType', 'showCellAnswerState', 'markingMethod', 'choicesHeader', 'answersHeader', 'showBlankOption'], this);

        const {minmarks, maxmarks, choices, answers, layout, matrix, distractors} = lowercase_keys(data);

        if(minmarks !== undefined) {
            this.minMarksEnabled = true;
        }

        if(maxmarks !== undefined) {
            this.maxMarksEnabled = true;
        }

        if(choices) {
            this.choices = Array.isArray(choices) ? choices.slice() : choices;
        }

        if(answers) {
            this.answers = Array.isArray(answers) ? answers.slice() : answers;
        }

        if(layout !== undefined) {
            builder.tryLoad(layout, ['type', 'expression'], this, ['layoutType', 'layoutExpression']);
        }

        if(matrix !== undefined) {
            this.matrix = matrix;
            if(Array.isArray(matrix) && matrix.length > 0 && !Array.isArray(matrix[0])) {
                this.matrix = matrix.map(x => [x]);
            }
        }

        if(distractors) {
            this.distractors = distractors;
            if(Array.isArray(distractors) && distractors.length > 0 && !Array.isArray(distractors[0])) {
                this.distractors = distractors.map(x => [x]);
            }
        }
    }

    toXML() {
        const part = super.toXML();

        const {builder} = this;
        const element = builder.element.bind(builder);

        part.setAttribute('showcellanswerstate', this.showCellAnswerState);

        const choices = element(
            'choices',
            {
                minimumexpected: this.minAnswers,
                maximumexpected: this.maxAnswers,
                displaycolumns: this.displayColumns,
                shuffle: this.shuffleChoices,
                displayType: this.displayType,
                showBlankOption: this.showBlankOption,
            }
        );
        choices.append(element('header', {}, [builder.makeContentNode(this.choicesHeader)]));
        if(typeof this.choices == 'string') {
            choices.setAttribute('def', this.choices);
        } else {
            for(let choice of this.choices) {
                choices.append(element('choice', {}, [builder.makeContentNode(choice)]));
            }
        }
        part.append(choices);

        const answers = element(
            'answers',
            {
                shuffle: this.shuffleAnswers,
            }
        );
        answers.append(element('header', {}, [builder.makeContentNode(this.answersHeader)]));
        if(typeof this.answers == 'string') {
            answers.setAttribute('def', this.answers);
        } else {
            for(let answer of this.answers) {
                answers.append(element('answer', {}, [builder.makeContentNode(answer)]));
            }
        }
        part.append(answers);

        part.append(element(
            'layout',
            {
                type: this.layoutType,
                expression: this.layoutExpression
            }
        ));

        part.append(element(
            'marking',
            {
                method: this.markingMethod
            },
            [
                element('maxmarks', {enabled: this.maxMarksEnabled, value: this.maxMarks}),
                element('minmarks', {enabled: this.minMarksEnabled, value: this.minMarks}),
                typeof this.matrix == 'string' ?
                    element(
                        'matrix',
                        {
                            def: this.matrix
                        }
                    )
                :
                    element(
                        'matrix',
                        {},
                        this.matrix.flatMap((row, i) => row.map((v, j) => element('mark', {answerindex: j, choiceindex: i, value: v})))
                    ),
                element(
                    'distractors',
                    {},
                    this.distractors.flatMap((row, i) => row.map((v, j) => element('distractor', {choiceindex: i, answerindex: j}, [builder.makeContentNode(v)])))
                ),
                element('warning', {type: this.warningType})
            ]
        ))

        return part;
    }
}

class ChooseOnePart extends MultipleChoicePart {
    type = '1_n_2';
}

class ChooseSeveralPart extends MultipleChoicePart {
    type = 'm_n_2';
    default_displayType() {
        return 'checkbox'; 
    }
}

class MatchChoicesWithAnswersPart extends MultipleChoicePart {
    type = 'm_n_x';
}

class InformationPart extends Part {
    type = 'information';
}

/** Create a class for a custom part type with the given definition.
 *
 * @param {object} definition
 * @returns {Function}
 */
function custom_part_constructor(definition) {
    class CustomPart extends Part {
        type = definition.short_name;

        constructor(builder, data) {
            super(builder, data);

            this.type = definition.short_name;
            this.settings = {};

            const {settings: settings_def} = lowercase_keys(definition);
            const {settings: settings_data} = lowercase_keys(data);
            if(settings_def) {
                for(let {name} of settings_def) {
                    builder.tryLoad(settings_data, name, this.settings);
                }
            }
        }

        toXML() {
            const part = super.toXML();

            const {builder} = this;
            const element = builder.element.bind(builder);

            part.setAttribute('custom', true);

            const settings = element(
                'settings',
                {},
                Object.entries(this.settings).map(([name, value]) => element(
                    'setting',
                    {
                        name,
                        value: JSON.stringify(value)
                    }
                ))
            )
            part.append(settings);

            return part;
        }
    }

    return CustomPart;
}

class ExtensionPart extends Part {
    type = 'extension';
}

class GapFillPart extends Part {
    type = 'gapfill';
    sortAnswers = false;

    constructor(builder, data) {
        super(builder, data);
        this.gaps = [];

        const {gaps} = lowercase_keys(data);
        if(gaps) {
            this.gaps = gaps.map(g => builder.part(g));
        }

        builder.tryLoad(data, ['sortAnswers'], this);

        this.prompt = this.prompt.replace(/\[\[(\d+?)\]\]/g, (_, d) => {
            d = parseInt(d);
            if(d >= this.gaps.length) {
                throw(new ExamError(`Reference to an undefined gap in a gapfill part (${d})`));
            }
            return `<gapfill reference="${d}"></gapfill>`;
        })
    }

    toXML() {
        const part = super.toXML();

        const {builder} = this;
        const element = builder.element.bind(builder);

        part.append(element(
            'gaps',
            {},
            this.gaps.map(g => g.toXML())
        ));

        part.append(element(
            'marking',
            {
                sortanswers: this.sortAnswers
            }
        ));

        return part;        
    }
}

class SimplificationRule {
    pattern = '';
    result = '';

    constructor(builder, data) {
        this.builder = builder;
        this.conditions = [];

        builder.tryLoad(data, ['pattern', 'conditions', 'result'], this);
    }

    toXML() {
        const {builder} = this;
        return builder.element(
            'ruledef',
            {
                pattern: this.pattern,
                result: this.result,
            },
            [ builder.element('conditions', {}, this.conditions.map(c => builder.element('condition', {}, [builder.text_node(c)])))]
        );
    }
}

class Exam {
    name = ''                                                     // title of exam
    duration = 0                                                // allowed time for exam, in seconds
    percentPass = 0                                         // percentage classified as a pass
    allowPrinting = true                                // allow student to print an exam transcript?
    showactualmarkwhen = 'always'                     // When to show student's score to student.
    showtotalmarkwhen = 'always'                        // When to show total marks available to student.
    showanswerstatewhen = 'always'                    // When to show right/wrong on questions.
    showpartfeedbackmessageswhen = 'always' // When to show part feedback messages.
    enterreviewmodeimmediately = true     // Enter review mode immediately after ending the exam?
    allowrevealanswer = true                        // allow student to reveal answer to question?
    intro = ''                                                    // text shown on the front page
    end_message = ''                                        // text shown on the results page
    showexpectedanswerswhen = 'inreview'    // When to show expected answers.
    showadvicewhen = true                                 // When to show question advice.
    resultsprintquestions = true                // show questions on printed results page?
    resultsprintadvice = true                     // show advice on printed results page?
    feedbackMessages = []                             // text shown on the results page when the student achieves a certain score
    showQuestionGroupNames = false            // show the names of question groups?
    showstudentname = true                            // show the student's name?
    shuffleQuestionGroups = false             // randomize the order of question groups?
    knowledge_graph = null
    diagnostic_script = 'diagnosys'
    custom_diagnostic_script = ''

    
    constructor(builder, data) {
        this.builder = builder;
        
        this.navigation = {
            'allowregen': false,
            'navigatemode': 'sequence',
            'reverse': true,
            'browse': true,
            'allowsteps': true,
            'showfrontpage': true,
            'onleave': builder.examevent('onleave', 'none', 'You have not finished the current question.'),
            'preventleave': true,
            'typeendtoleave': false,
            'startpassword': '',
            'allowAttemptDownload': false,
            'downloadEncryptionKey': '',
            'autoSubmit': true,
        }

        this.timing = {
            'timeout': builder.examevent('timeout', 'none', ''),
            'timedwarning': builder.examevent('timedwarning', 'none', ''),
            'allowPause': true,
        }

        this.rulesets = {};
        
        this.functions = [];
        
        this.variables = [];

        this.question_groups = [];

        this.resources = [];

        this.extensions = [];

        this.custom_part_types = [];

        data = lowercase_keys(data);

        builder.tryLoad(data, ['name', 'duration', 'percentPass', 'allowPrinting', 'resources', 'extensions', 'custom_part_types', 'showQuestionGroupNames', 'showstudentname', 'shuffleQuestionGroups'], this);

        const {navigation, timing, feedback, rulesets, functions, variables, question_groups, diagnostic} = data;

        if(navigation) {
            builder.tryLoad(navigation, ['allowregen', 'navigatemode', 'reverse', 'browse', 'allowsteps', 'showfrontpage', 'showresultspage', 'preventleave', 'typeendtoleave', 'startpassword', 'allowAttemptDownload', 'downloadEncryptionKey', 'autoSubmit'], this.navigation);
            const {onleave} = navigation;
            if(onleave) {
                builder.tryLoad(onleave, ['action', 'message'], this.navigation.onleave);
            }
        }

        if(timing) {
                builder.tryLoad(timing, ['allowPause'], this.timing);
                for(let event of ['timeout', 'timedwarning']) {
                        if(event in timing) {
                                builder.tryLoad(timing[event], ['action', 'message'], this.timing[event]);
                        }
                }
        }

        if(feedback) {
            builder.tryLoad(feedback, ['showactualmarkwhen', 'showtotalmarkwhen', 'showanswerstatewhen', 'showpartfeedbackmessageswhen', 'enterreviewmodeimmediately', 'allowrevealanswer', 'showexpectedanswerswhen', 'showadvicewhen'], this);
            builder.tryLoad(feedback, ['intro', 'end_message'], this);
            const {results_options, feedbackmessages} = lowercase_keys(feedback);
            if(results_options) {
                builder.tryLoad(results_options, ['printquestions', 'printadvice'], this, ['resultsprintquestions', 'resultsprintadvice']);
            }
            if(feedbackmessages) {
                this.feedbackMessages = feedbackmessages.map(f => builder.feedback_message(f));
            }
        }

        if(rulesets) {
            this.rulesets = builder.rulesets(rulesets);
        }

        if(functions) {
            Object.entries(functions).forEach(([name, def]) => {
                this.functions.push(builder.function(name, def));
            });
        }
        
        if(variables) {
            Object.entries(variables).forEach(([name, def]) => {
                this.variables.push(builder.variable(name, def));
            });
        }

        if(question_groups) {
            for(let qg of question_groups) {
                this.question_groups.push(builder.question_group(qg));
            }
        }

        if(diagnostic) {
            this.knowledge_graph = diagnostic.knowledge_graph;
            this.diagnostic_script = diagnostic.script;
            this.custom_diagnostic_script = diagnostic.customScript;
        }
    }

    toXML() {
        const {builder} = this;
        const root = builder.doc.documentElement;
        root.setAttribute('name', this.name);
        root.setAttribute('percentpass', `${this.percentPass}%`);
        root.setAttribute('allowprinting', this.allowPrinting);

        const element = builder.element.bind(builder);

        const {navigation, timing} = this;
        const settings = element(
            'settings', 
            {}, 
            [ element(
                    'navigation',
                    copy_attrs(navigation)`
                        allowregen
                        navigatemode
                        reverse
                        browse
                        allowsteps
                        showfrontpage
                        preventleave
                        typeendtoleave
                        startpassword
                        allowAttemptDownload
                        downloadEncryptionKey
                        autoSubmit
                    `,
                    [navigation.onleave.toXML()]
                ),

                element(
                    'timing',
                    {
                        duration: this.duration,
                        allowPause: timing.allowPause
                    },
                    [timing.timeout.toXML(), timing.timedwarning.toXML()]
                ),

                element(
                    'feedback',
                    copy_attrs(this)`
                        enterreviewmodeimmediately
                        showactualmarkwhen
                        showtotalmarkwhen
                        showanswerstatewhen
                        showpartfeedbackmessageswhen
                        allowrevealanswer
                        showstudentname
                        showexpectedanswerswhen
                        showadvicewhen
                    `,
                    [
                        element('intro', {}, [builder.makeContentNode(this.intro)]),
                        element('end_message', {}, [builder.makeContentNode(this.end_message)]),
                        element(
                            'results_options',
                            {
                                printquestions: this.resultsprintquestions,
                                printadvice: this.resultsprintadvice
                            }
                        ),
                        element('feedbackmessages', {}, this.feedbackMessages.map(fm => fm.toXML()))
                    ]
                ),

                element(
                    'rulesets',
                    {},
                    Object.entries(this.rulesets).map(([name, rules]) => {
                        return element(
                            'set',
                            {name},
                            rules.map(rule => typeof rule == 'string' ? element('include', {name:rule}) : rule.toXML())
                        )
                    })
                ),

                element(
                    'diagnostic',
                    {},
                    [ element(
                        'algorithm',
                        {
                            script: this.diagnostic_script,
                        },
                        [ builder.text_node(this.custom_diagnostic_script) ]
                    )]
                )
            ]
        );
        root.append(settings);

        root.append(element('functions', {}, this.functions.map(f => f.toXML())));

        root.append(element('variables', {}, this.variables.map(v => v.toXML())));

        root.append(element(
            'question_groups',
            {
                showQuestionGroupNames: this.showQuestionGroupNames,
                shuffleQuestionGroups: this.shuffleQuestionGroups
            },
            this.question_groups.map(qg => qg.toXML())
        ));

        if(this.knowledge_graph) {
            root.append(element('knowledge_graph', {}, [builder.text_node(JSON.stringify(this.knowledge_graph))]));
        }
        
        return root;
    }
}

class ExamBuilder {

    part_constructors = {
        'jme': JMEPart,
        'numberentry': NumberEntryPart,
        'matrix': MatrixEntryPart,
        'patternmatch': PatternMatchPart,
        '1_n_2': ChooseOnePart,
        'm_n_2': ChooseSeveralPart,
        'm_n_x': MatchChoicesWithAnswersPart,
        'gapfill': GapFillPart,
        'information': InformationPart,
        'extension': ExtensionPart,
    }
    
    constructor() {
        this.doc = document.implementation.createDocument(null, "exam");
    }

    /** 
     * Try to load the given attributes from `data` into `obj`.
     * 
     * @param {object} data
     * @param {string|string[]} attrs - Names of attributes to load.
     * @param {object} obj
     * @param {string|string[]} altnames - Names to map names in `attr` to.
     * @returns {object} - The `obj` argument.
     */
    tryLoad(data, attrs, obj, altnames = []) {
        if(typeof attrs == 'string') {
            attrs = [attrs];
        }
        if(typeof altnames == 'string') {
            altnames = [altnames];
        }
        data = lowercase_keys(data);
        attrs.forEach((attr, i) => {
            const altname = altnames[i] || attr;
            attr = attr.toLowerCase();
            if(attr in data) {
                obj[altname] = data[attr];
            }
        });
        return obj;
    }

    /** 
     * Convert a block of content into HTML, wrapped in a `<content>` tag.
     * 
     * @param {string} s
     * @returns {Element}
     */
    makeContentNode(s) {
        if(s === undefined) {
            s = '';
        }
        const content = this.doc.createElement('content');

        const span = document.createElement('span');
        span.innerHTML = s;

        const serializer = new XMLSerializer();

        content.innerHTML = serializer.serializeToString(span).replace('span xmlns="http://www.w3.org/1999/xhtml"', 'span');

        for(let a of content.querySelectorAll('a:not([target])')) {
            a.setAttribute('target', '_blank');
        }

        return content;
    }

    /**
     * Make an XML element.
     *
     * @param {string} name
     * @param {object} [attributes] - Attributes to set on the element.
     * @param {Array.<Element>} [children]
     * @returns {Element}
     */
    element(name, attributes, children) {
        const elem = this.doc.createElement(name);
        if(attributes) {
            Object.entries(attributes).forEach(([k, v]) => elem.setAttribute(k.toLowerCase(), (v === null || v === undefined) ? '' : v));
        }
        if(children) {
            for(let child of children) {
                elem.appendChild(child);
            }
        }
        return elem;
    }

    /**
     * Create a text node with the given text.
     *
     * @param {string} text
     * @returns {Node}
     */
    text_node(text) {
        return this.doc.createTextNode(text);
    }

    /**
     * Make a tree of XML elements.
     *
     * @param {Array} struct
     * @returns {Element}
     */
    makeTree(struct) {
        if(Array.isArray(struct)) {
            const [name, children] = struct;
            const elem = this.doc.createElement(name);
            if(children) {
                for(let c of children) {
                    elem.append(this.makeTree(c));
                }
            }
            return elem;
        } else if(typeof struct == 'string') {
            return this.doc.createElement(struct);
        } else {
            return struct;
        }
    }

    /**
     * Append a list of elements or tree structures {@see ExamBuilder.makeTree} to an XML element.
     *
     * @param {Element} element
     * @param {Array} things
     */
    appendMany(element, things) {
        for(let thing of things) {
            if(thing instanceof Element) {
                element.append(thing);
            } else {
                element.append(this.makeTree(thing));
            }
        }
    }

    exam(data) {
        this.custom_part_types = data.custom_part_types;

        return new Exam(this, data);
    }

    examevent(name, action, message) {
        return new ExamEvent(this, name, action, message);
    }

    simplification_rule(data) {
        return new SimplificationRule(this, data);
    }

    feedback_message(data) {
        return new FeedbackMessage(this, data);
    }

    question_group(data) {
        return new QuestionGroup(this, data);
    }

    question(data) {
        return new Question(this, data);
    }

    function(name, def) {
        return new CustomFunction(this, name, def);
    }

    string_restriction(name, data, default_message) {
        return new StringRestriction(this, name, data === undefined ? {} : data, default_message);
    }

    length_restriction(name, data, default_message) {
        return new LengthRestriction(this, name, data === undefined ? {} : data, default_message);
    }

    pattern_restriction(name, data) {
        return new PatternRestriction(this, name, data === undefined ? {} : data);
    }

    variable_replacement(data) {
        return new VariableReplacement(this, data);
    }

    next_part(data) {
        return new NextPart(this, data);
    }

    custom_constant(data) {
        return new CustomConstant(this, data);
    }

    variable(data) {
        return new Variable(this, data);
    }

    part(data) {
        const kind = data.type.toLowerCase();

        const constructors = Object.assign(
            {}, 
            this.part_constructors, 
            Object.fromEntries(this.custom_part_types.map(cpt => [cpt.short_name, custom_part_constructor(cpt)]))
        );

        const part_constructor = constructors[kind];

        if(!part_constructor) {
            throw(new ExamError(
                `Invalid part type ${kind}`,
                `Valid part types are ${Object.keys(constructors).join(', ')}.`
            ))
        }

        return new part_constructor(this, data);
    }

    scorebin(data) {
        return new ScoreBin(this, data);
    }

    rulesets(data) {
        return Object.fromEntries(Object.entries(data).map(([name, rules]) => {
            const l = [];
            for(let rule of rules) {
                if(typeof rule == 'string') {
                    l.push(rule);
                } else {
                    l.push(this.simplification_rule(rule));
                }
            }
            return [name, l];
        }));
    }
}

Numbas.exam_to_xml = function(data) {
    const builder = new ExamBuilder();

    const exam = builder.exam(data);

    const xml = exam.toXML();

    return xml;
}

});
