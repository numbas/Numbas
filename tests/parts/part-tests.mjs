import '../marking_scripts.js';
import '../diagnostic_scripts.js';
import {with_scorm, SCORM_API} from './scorm_api.mjs';
import {unit_test_exam, unit_test_questions} from './part_unit_tests.mjs';

Numbas.queueScript('part_tests',['qunit','json','jme','localisation','parts/numberentry','parts/jme','parts/matrixentry', 'parts/multipleresponse', 'parts/patternmatch','parts/gapfill','question','exam'],function() {
    var QUnit;
    try {
        var QUnit = global.QUnit;
    } catch(e) {
        QUnit = window.QUnit;
    }

    let jme = Numbas.jme;
    let math = Numbas.math;

    Numbas.diagnostic.load_scripts();

    var createPartFromJSON = function(data){ return Numbas.createPartFromJSON(0, data, 'p0', null, null); };

    async function mark_part(p, answer, scope) {
        var answer = answer;
        scope = scope || p.getScope();
        p.storeAnswer(answer);
        p.setStudentAnswer();
        var res = p.mark(scope);
        if(p.waiting_for_pre_submit) {
            await p.waiting_for_pre_submit;
            res = p.mark(scope);
        }

        return res.finalised_result;
    }

    async function submit_part(p) {
        p.submit();
        if(p.waiting_for_pre_submit) {
            await p.waiting_for_pre_submit;
        }
    }

    function matrix(cells) {
        cells.rows = cells.length;
        cells.columns = cells[0].length;
        return cells;
    }

    function contains_note(res, note) {
        var match = res.states.find(function(s){
            return Object.entries(note).every(function(d) {
                return s[d[0]] == d[1];
            });
        });
        return match!==undefined;
    }

    async function run_with_part_type(type, test_fn){
        let part_types_old = Numbas.custom_part_types;
        Numbas.custom_part_types = type;
        for(var name in Numbas.custom_part_types) {
            Numbas.partConstructors[name] = Numbas.parts.CustomPart;
        };
        await test_fn();
        Numbas.custom_part_types = part_types_old;
    }

    async function run_part_unit_tests(assert, p) {
        for(let test of p.json.unitTests) {
            var done = assert.async();
            p.storeAnswer(test.answer.value);
            p.setStudentAnswer();
            var res = p.mark_answer(p.rawStudentAnswerAsJME(),p.getScope());
            if(res.waiting_for_pre_submit) {
                await res.waiting_for_pre_submit;
                res = p.mark_answer(p.rawStudentAnswerAsJME(),p.getScope());
            }
            assert.ok(res.state_valid.mark,'mark note is valid');
            test.notes.forEach(function(note) {
                assert.ok(res.states[note.name]!==undefined,'Note "'+note.name+'" exists');
                var value = res.values[note.name];
                var expectedValue = Numbas.jme.builtinScope.evaluate(note.expected.value);
                var bothValues = expectedValue && value;
                var differentValue;
                if(bothValues) {
                    if(Numbas.util.equalityTests[expectedValue.type] && Numbas.util.equalityTests[value.type]) {
                        differentValue = !Numbas.util.eq(expectedValue,value);
                    } else {
                        differentValue = expectedValue.type != value.type;
                    }
                } else {
                    differentValue = expectedValue==value;
                }
                assert.notOk(differentValue,'Note "'+note.name+'" has value "'+note.expected.value+'"');
            });

            p.credit = 0;

            await p.submit();
            var final_res = p.marking_result;
            var messages = final_res.markingFeedback.map(function(action){ return action.message; }).join('\n');
            var mark_note = test.notes.find(function(n) { return n.name=='mark' });
            var expectedMessages = mark_note.expected.messages.join('\n');
            assert.equal(messages,expectedMessages,'Feedback messages');
            var warnings = final_res.warnings.join('\n');
            var expectedWarnings = mark_note.expected.warnings.join('\n');
            assert.equal(warnings, expectedWarnings,'Warnings');
            assert.equal(res.state_valid.mark,mark_note.expected.valid,'Valid');
            assert.equal(final_res.credit,mark_note.expected.credit,'Credit');
            done();
        };
    }

    function question_test(name,data,test_fn,error_fn) {
        QUnit.test(name, async function(assert) {
            var done = assert.async();
            var q = Numbas.createQuestionFromJSON(data, 0);
            q.generateVariables();
            q.signals.on('ready').then(function() {
                test_fn(assert,q);
                done();
            }).catch(function(e) {
                if(error_fn) {
                    error_fn(assert,q,e);
                    done();
                } else {
                    console.error(e);
                    done();
                    throw(e);
                }
            });
        });
    }

    function question_unit_test(name, data) {
        question_test(name, data, async function(assert,q) {
            q.allParts().forEach(function(p) {
                run_part_unit_tests(assert, p);
            });
        });
    }

    QUnit.module('Part')
    QUnit.test('Set marks', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', marks: 3, minValue: '1', maxValue: '2'});
        assert.equal(p.marks,3,'3 marks');
    });
    QUnit.test('Empty marks field leads to 0 marks', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', marks: '', minValue: '1', maxValue: '2'});
        assert.equal(p.marks,0,'0 marks');
    });

    QUnit.module('Custom marking JavaScript');
    QUnit.test('set credit to 1', async function(assert) {
        var data = {"type":"numberentry","marks":1,"scripts":{"mark":{"script":"this.setCredit(1,\"Top marks!\");\nthis.answered = true;","order":"instead"}},"minValue":"1","maxValue":"1"};

        var p = createPartFromJSON(data);

        var res = await mark_part(p,'1');
        assert.ok(p.answered,'Part is answerd');
        assert.equal(p.credit,1,'1 credit');
        assert.equal(p.markingFeedback[0].message,"Top marks!\n\nYou were awarded <strong>1</strong> mark.", 'Feedback message is "Top marks!" as set in script');
    });

    QUnit.module('Stateful scope');
    QUnit.test('nested calls in a stateful scope retain scope', async function(assert) {
        var scope = new Numbas.marking.StatefulScope(Numbas.jme.builtinScope);
        scope.evaluate('feedback("Hi");try(correctif(x),y,1);2');
        assert.equal(scope.state.length,1,"Feedback message is not lost when try evaluates the catch clause");
    });

    QUnit.module('Number entry');
    QUnit.test('Answer is 1', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', marks: 1, minValue: '1', maxValue: '1'});
        var res;
        res = await mark_part(p, '1');
        assert.equal(res.credit,1,'"1" marked correct');

        res = await mark_part(p, '0');
        assert.equal(res.credit,0,'"0" marked incorrect');

        res = await mark_part(p, '!');
        assert.equal(res.credit,0,'"!" marked incorrect');
        assert.notOk(res.valid,'"!" is invalid');
    });
    QUnit.test('Partial credit for wrong precision', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp', precisionPartialCredit: 20});
        var res = await mark_part(p,'0.1000');
        assert.equal(res.credit,0.2,'"0.1000" gets partial credit');
    });
    QUnit.test('Answer is 1/3, fractions not allowed', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3'});
        var res = await mark_part(p,'1/3');
        assert.equal(res.credit,0,'"1/3": No credit awarded');
        assert.notOk(res.valid,'"1/3": Not valid');
    });
    QUnit.test('Answer is 1/3, fractions allowed', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', allowFractions: true});
        var res = await mark_part(p,'1/3');
        assert.equal(res.credit,1,'"1/3" correct');
    });
    QUnit.test('Answer is 1/3, fraction must be reduced', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', allowFractions: true, mustBeReduced: true, mustBeReducedPC: 50});
        var res = await mark_part(p,'1/3');
        assert.equal(res.credit,1,'"1/3" correct');
        var res = await mark_part(p,'2/6');
        assert.equal(res.credit,0.5,'"2/6" gets penalty');
        assert.ok(contains_note(res,{note:jme.normaliseName('cancelled'),factor:0.5,op:'multiply_credit'}));
    });
    QUnit.test('Answer is 1/3, to 2 dp', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', precision: '2', precisionType: 'dp'});
        var res = await mark_part(p,'0.33');
        assert.equal(res.credit,1,'"0.33" correct');
        var res = await mark_part(p,'0.330');
        assert.equal(res.credit,0,'"0.330" incorrect');
    });
    QUnit.test('Answer is 0.1, to 2 dp', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp'});
        var res = await mark_part(p,'0.1');
        assert.equal(res.credit,1,'"0.1" correct');
        var res = await mark_part(p,'0.10');
        assert.equal(res.credit,1,'"0.10" correct');
        var res = await mark_part(p,'0.100');
        assert.equal(res.credit,0,'"0.100" incorrect');
    });
    QUnit.test('Answer is 0.1, to 2 dp, strict', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp', strictPrecision: true});
        var res = await mark_part(p,'0.1');
        assert.equal(res.credit,0,'"0.1" incorrect');
    });
    QUnit.test('Answer is 1.22, to 1 dp, strict', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.22', maxValue: '1.22', precision: '1', precisionType: 'dp', strictPrecision: true, precisionPartialCredit: 50});
        var res = await mark_part(p,'1.20');
        assert.equal(res.credit,0,'"1.20" incorrect');
        var res = await mark_part(p,'1.22');
        assert.equal(res.credit,0.5,'"1.22" correct but penalty');
        assert.ok(contains_note(res,{note:jme.normaliseName('correctPrecision'),factor:0.5,op:'multiply_credit'}));
        var res = await mark_part(p,'1.2');
        assert.equal(res.credit,1,'"1.2" correct');
    });
    QUnit.test('Answer is 1.27, to 1 dp, strict', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.27', maxValue: '1.27', precision: '1', precisionType: 'dp', strictPrecision: true, precisionPartialCredit: 50});
        var res = await mark_part(p,'1.27');
        assert.equal(res.credit,0.5,'"1.27" correct but penalty');
        assert.ok(contains_note(res,{note:jme.normaliseName('correctPrecision'),factor:0.5,op:'multiply_credit'}));
        var res = await mark_part(p,'1.3');
        assert.equal(res.credit,1,'"1.3" correct');
    });
    QUnit.test('Answer is 1.27, to 2 sf, strict', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.27', maxValue: '1.27', precision: '2', precisionType: 'sigfig', strictPrecision: true, precisionPartialCredit: 50});
        var res = await mark_part(p,'1.27');
        assert.equal(res.credit,0.5,'"1.27" correct but penalty');
        assert.ok(contains_note(res,{note:jme.normaliseName('correctPrecision'),factor:0.5,op:'multiply_credit'}));
        var res = await mark_part(p,'1.3');
        assert.equal(res.credit,1,'"1.3" correct');
    });
    QUnit.test('Answer is 12700, to 2 sf, strict', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '12700', maxValue: '12700', precision: '2', precisionType: 'sigfig', strictPrecision: true, precisionPartialCredit: 50});
        var res = await mark_part(p,'12700');
        assert.equal(res.credit,0.5,'"12700" correct but penalty');
        assert.ok(contains_note(res,{note:jme.normaliseName('correctPrecision'),factor:0.5,op:'multiply_credit'}));
        var res = await mark_part(p,'13000');
        assert.equal(res.credit,1,'"13000" correct');
    });
    QUnit.test('Answer is 123, only scientific notation allowed', async function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '123', maxValue: '123', notationStyles: ['scientific']});
        var res = await mark_part(p,'1.23e2');
        assert.equal(res.credit, 1,'"1.23e2" is correct');
        var res = await mark_part(p,'1.23e+2');
        assert.equal(res.credit, 1,'"1.23e+2" is correct');
        var res = await mark_part(p,'1.23 e 2');
        assert.equal(res.credit, 1,'"1.23 e 2" is correct');
        var res = await mark_part(p,'123');
        assert.equal(res.credit, 0,'"123" is incorrect');
    });

    QUnit.test('Don\'t mark infinity correct', async function(assert) {
        var p = createPartFromJSON({"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","adaptiveMarkingPenalty":0,"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"});
        var res = await mark_part(p,'1');
        assert.equal(res.credit,1,'"1" is correct');
        var res = await mark_part(p,'infinity');
        assert.equal(res.credit,0,'"infinity" is incorrect');
    });
    QUnit.test("Wiggle room is at 12th sig fig", async function(assert) {
        var p = createPartFromJSON({type:'numberentry','minvalue': 'precround(4^7.9,1)', maxvalue: 'precround(4^7.9,1)', marks: 1});
        var res = await mark_part(p,'57052.4');
        assert.equal(res.credit,1,'"57052.4" is correct');
    });

    QUnit.test('Min and max are -infinity and +infinity', async function(assert) {
        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"-infinity","maxValue":"infinity","notationStyles":["scientific"],"correctAnswerStyle":"scientific"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'0e+0','-infinity, infinity: correct answer is 0e+0');
        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"infinity","maxValue":"infinity","notationStyles":["scientific"],"correctAnswerStyle":"scientific"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'infinity','infinity, infinity: correct answer is infinity');
        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"12","maxValue":"infinity","notationStyles":["scientific"],"correctAnswerStyle":"scientific"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'1.2e+1','12, infinity: correct answer is 1.2e+1');
        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"-infinity","maxValue":"50","notationStyles":["scientific"],"correctAnswerStyle":"scientific"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'5e+1','-infinity, 50: correct answer is 5e+1');

        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"-infinity","maxValue":"infinity","notationStyles":["plain"],"correctAnswerStyle":"plain"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'0','-infinity, infinity: correct answer is 0');
        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"infinity","maxValue":"infinity","notationStyles":["plain"],"correctAnswerStyle":"plain"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'infinity','infinity, infinity: correct answer is infinity');
        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"12","maxValue":"infinity","notationStyles":["plain"],"correctAnswerStyle":"plain"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'12','12, infinity: correct answer is 12');
        var p = createPartFromJSON({"type":"numberentry","marks":1,"minValue":"-infinity","maxValue":"50","notationStyles":["plain"],"correctAnswerStyle":"plain"});
        assert.equal(p.getCorrectAnswer(p.getScope()),'50','-infinity, 50: correct answer is 50');
    });

    QUnit.module('JME')
    QUnit.test('Answer is "x+2"', async function(assert) {
        var p = createPartFromJSON({type:'jme', answer: 'x+2'});
        var res = await mark_part(p,'x+2');
        assert.equal(res.credit,1,'"x+2" correct');
        var res = await mark_part(p,'2+x');
        assert.equal(res.credit,1,'"2+x" correct');
        var res = await mark_part(p,'2');
        assert.equal(res.credit,0,'"2" incorrect');
        var res = await mark_part(p,'!');
        assert.notOk(res.valid,'"!" invalid');
        var res = await mark_part(p,'');
        assert.notOk(res.valid,'"" invalid');
    });
    QUnit.test('Answer that can\'t be evaluated', async function(assert) {
        var data = {"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x^2+x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[],"musthave":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"didn't use ("},"notallowed":{"strings":["^"],"showStrings":false,"partialCredit":0,"message":"did use ^"}};
        var p = createPartFromJSON(data);
        var res = await mark_part(p,'x(x+1)');
        assert.notOk(res.valid,"x(x+1) not valid");
        var expectedFeedback = [{"op":"warning","message":"Your answer is not a valid mathematical expression.<br/>Function <code>x</code> is not defined. Is <code>x</code> a variable, and did you mean <code>x*(...)</code>?.","note":"agree"},{"op":"set_credit","credit":0,"message":"Your answer is not a valid mathematical expression.<br/>Function <code>x</code> is not defined. Is <code>x</code> a variable, and did you mean <code>x*(...)</code>?.","reason":"invalid","note":"agree"},{"invalid": true,"note": "agree","op": "end"}];
        assert.deepEqual(res.states, expectedFeedback,"Warning message doesn't mention note name");

        var res = await mark_part(p,'`');
        assert.notOk(res.valid,"` not valid");
        var expectedFeedback = [{"op":"warning","message":"Your answer is not a valid mathematical expression.<br/>Invalid expression: <code>`</code> at position 0 near <code>`</code>.","note":"studentexpr"},{"op":"set_credit","credit":0,"message":"Your answer is not a valid mathematical expression.<br/>Invalid expression: <code>`</code> at position 0 near <code>`</code>.","reason":"invalid","note":"studentexpr"},{"invalid": true,"note": "studentexpr","op": "end"}];
        assert.deepEqual(res.states, expectedFeedback,"Warning message gives the parser error.");
    });

    if(!jme.caseSensitive) {
        QUnit.test('Case mismatch in a formula', async function(assert) {
            var data = {
                "type":"jme",
                "useCustomName": false,
                "customName": "",
                "marks": 1,
                "scripts": {},
                "customMarkingAlgorithm": "",
                "extendBaseMarkingAlgorithm": true,
                "unitTests": [],
                "showCorrectAnswer": true,
                "showFeedbackIcon": true,
                "variableReplacements": [],
                "variableReplacementStrategy": "originalfirst",
                "nextParts": [],
                "suggestGoingBack": false,
                "adaptiveMarkingPenalty": 0,
                "exploreObjective": null,
                "answer": "x=(y-B)/A",
                "showPreview": true,
                "checkingType": "absdiff",
                "checkingAccuracy": 0.001,
                "failureRate": 1,
                "vsetRangePoints": 5,
                "vsetRange": [0,1],
                "checkVariableNames": false,
                "singleLetterVariables": false,
                "allowUnknownFunctions": true,
                "implicitFunctionComposition": false,
                "valuegenerators": [
                    {
                        "name":"a",
                        "value": ""
                    },
                    {
                        "name": "b",
                        "value": ""
                    },
                    {
                        "name": "x",
                        "value": ""
                    },
                    {
                        "name": "y",
                        "value": ""
                    }
                ]};
            var p = createPartFromJSON(data);
            var res = await mark_part(p,'x=(y-b)/a');
            assert.equal(res.credit,1,"x=(y-b)/a correct");
        });
    }

    QUnit.test('Student doesn\'t use all the variables in the correct answer', async function(assert) {
        var data = {
            "type": "jme",
            "useCustomName": false,
            "customName": "",
            "marks": 1,
            "showCorrectAnswer": true,
            "showFeedbackIcon": true,
            "scripts": {},
            "variableReplacements": [],
            "variableReplacementStrategy": "originalfirst",
            "adaptiveMarkingPenalty": 0,
            "customMarkingAlgorithm": "",
            "extendBaseMarkingAlgorithm": true,
            "unitTests": [],
            "prompt": "<p>$\\simplify[]{x + 0*y^t}$</p>",
            "answer": "x +  0*y^t",
            "answerSimplification": "basic",
            "showPreview": true,
            "checkingType": "absdiff",
            "checkingAccuracy": 0.001,
            "failureRate": 1,
            "vsetRangePoints": 5,
            "vsetRange": [
                0,
                1
            ],
            "checkVariableNames": false,
            "mustmatchpattern": {
                "pattern": "? + ?*?^?",
                "partialCredit": "50",
                "message": "Pattern",
                "nameToCompare": ""
            },
            "valuegenerators": [
                {
                    "name": "t",
                    "value": ""
                },
                {
                    "name": "x",
                    "value": ""
                },
                {
                    "name": "y",
                    "value": ""
                }
            ]
        };
        var p = createPartFromJSON(data);
        var res = await mark_part(p,'x');
        assert.ok(res.valid,"x is valid");
        var expectedFeedback = [
            {
                "op": "set_credit",
                "credit": 1,
                "reason": "correct",
                "message": "Your answer is numerically correct.",
                "note": jme.normaliseName("numericallyCorrect")
            },
            {
                "op": "multiply_credit",
                "factor": 0.5,
                "message": "Your answer is not in the expected form: Pattern",
                "note": jme.normaliseName("failMatchPattern")
            }
        ];
        assert.deepEqual(res.states, expectedFeedback,"x is marked correct");
    });

    question_test('Variables defined by the question aren\'t used in evaluating student\'s expression',
        {"name":"scope used when evaluating JME","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"a":{"name":"a","group":"Ungrouped variables","definition":"[1,2,3]","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["a"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write $2a$</p>","answer":"2a","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}]},
        async function(assert,q) {
            var p = q.getPart('p0');
            p.storeAnswer('2a');
            q.submit();

            assert.equal(q.score,1,'Score is 1');
        }
    );

    QUnit.test('Decimal values aren\'t substituted with scientific notation', function(assert) {
        var data = {
            "type": "jme",
            "marks": 1,
            "answer": "{dec(\"1.234567890123456e-1\")}",
        };
        var p = createPartFromJSON(data);
        assert.equal(p.getCorrectAnswer(p.getScope()), '0.1234567890123456');
    });

    QUnit.test('The equals sign in a formula is replaced with approximate equality', async function(assert) {
        var data = {
            "type": "jme",
            "marks": 1,
            "answer": "y = (x+1/3)^3",
            "vsetRangePoints": 50,
        };
        var p = createPartFromJSON(data);
        var res = await mark_part(p,'y = x^3 + x^2 + x/3 + 1/27');
        assert.equal(res.credit,1,"y = x^3 + x^2 + x/3 + 1/27 correct");
    });

    question_unit_test("Expression is case-sensitive",
        {
            "name":"case sensitivity",
            "parts": [
                {
                    "type":"jme",
                    "marks":1,
                    "unitTests": [
                        {"variables":[],"name":"t/t is incorrect","answer":{"valid":true,"value":"t/t"},"notes":[{"name":"mark","expected":{"value":"nothing","messages":["Your answer is incorrect."],"warnings":[],"error":"","valid":true,"credit":0}}]},
                        {"variables":[],"name":"t/T is correct","answer":{"valid":true,"value":"t/T"},"notes":[{"name":"mark","expected":{"value":"nothing","messages":["Your answer is numerically correct.\n\nYou were awarded <strong>1</strong> mark."],"warnings":[],"error":"","valid":true,"credit":1}}]}
                    ],
                    "answer":"t/T",
                    "caseSensitive":true,
                    "valuegenerators":[{"name":"T","value":""},{"name":"t","value":""}]}
            ]
        }
    );

    QUnit.test('Substituting a negative number into the correct answer', async function(assert) {
        var p = createPartFromJSON({type:'jme', answer: '{a}^2'});
        var a = Numbas.jme.builtinScope.evaluate('-2');
        var s = new Numbas.jme.Scope([Numbas.jme.builtinScope, {variables: {a:a}}]);
        p.scope = s;
        assert.equal(p.getCorrectAnswer(s), '4');
    });

    QUnit.test('Substituting a decimal into the correct answer', async function(assert) {
        var p = createPartFromJSON({type:'jme', answer: '{dec(-3)}^x'});
        assert.equal(p.getCorrectAnswer(p.getScope()), '(-3)^x', 'answer is (-3)^x');
    });

    QUnit.test('Substituting a big rounded decimal into the correct answer', async function(assert) {
        var p = createPartFromJSON({type:'jme', answer: '{siground(dec("1.62e+6"),3)}'});
        var res = await mark_part(p,'1620000');
        assert.equal(res.credit,1,'"1620000" correct');
    });

    QUnit.module('Pattern match');
    QUnit.test('Answer is "hi+"', async function(assert) {
        var p = createPartFromJSON({type:'patternmatch', answer: 'hi+', displayAnswer: 'hi'});
        var res = await mark_part(p,'hi');
        assert.equal(res.credit,1,'"hi" correct');
        var res = await mark_part(p,'hiiiiii');
        assert.equal(res.credit,1,'"hiiiiii" correct');
        var res = await mark_part(p,'h');
        assert.equal(res.credit,0,'"h" incorrect');
        var res = await mark_part(p,'???');
        assert.equal(res.credit,0,'"???" incorrect');
        assert.ok(res.valid,'"???" valid');
    });

    QUnit.module('Matrix entry');
    QUnit.test('Answer is id(2)', async function(assert) {
        var p = createPartFromJSON({type:'matrix', correctAnswer: 'id(2)'});
        var res = await mark_part(p,matrix([['1','0'],['0','1']]));
        assert.equal(res.credit,1,'[[1,0],[0,1]] is correct');
        var res = await mark_part(p,matrix([['1','1'],['0','1']]));
        assert.equal(res.credit,0,'[[1,1],[0,1]] is incorrect');
        var res = await mark_part(p,matrix([['1','0','0'],['0','1','0'],['0','0','0']]));
        assert.equal(res.credit,0,'[[1,0,0],[0,1,0],[0,0,0]] is incorrect');
        assert.ok(res.states.filter(function(s){return s.note=='wrong_size' && s.credit==0}).length>0, '[[1,0,0],[0,1,0],[0,0,0]] fails because wrong size');
    });
    QUnit.test('Fractions', async function(assert) {
        var p = createPartFromJSON({type:'matrix',correctAnswer:'id(2)/2', allowFractions: true});
        var res = await mark_part(p,matrix([['1/2','0'],['0','1/2']]));
        assert.equal(res.credit,1,'fractions marked correct');
    });
    QUnit.test('Rounding', async function(assert) {
        var p = createPartFromJSON({type:'matrix',correctAnswer:'matrix([1.222,1.227],[3,4])', allowFractions: true, precisionType: 'dp', precision: 2, precisionPartialCredit: 50});
        var res = await mark_part(p,matrix([['1.22','1.23'],['3.00','4.00']]));
        assert.equal(res.credit,1,'[[1.22,1.23],[3.00,4.00]] correct');
        var res = await mark_part(p,matrix([['1.222','1.227'],['3.000','4.000']]));
        assert.equal(res.credit,0.5,'[[1.222,1.227],[3.000,4.000]] partially correct');
        var res = await mark_part(p,matrix([['1.222','1.227'],['3.00','4.00']]));
        assert.ok(contains_note(res,{note:jme.normaliseName('all_same_precision'),message: R('part.matrix.not all cells same precision')}),'not all cells same precision warning');
    });


    question_test(
        'Note name used both for question variable and marking note',
        {"name":"wrong size matrix","tags":[],"metadata":{"description":"","licence":"Creative Commons Attribution 4.0 International"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"rows":{"name":"rows","group":"Ungrouped variables","definition":"4","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["rows"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"\n<p>[[0]]</p>","gaps":[{"type":"matrix","marks":"4","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"correctAnswer":"matrix([1,0,3,3,1],[0,1,4,4,2],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0])","correctAnswerFractions":true,"numRows":"6","numColumns":"5","allowResize":true,"tolerance":0,"markPerCell":false,"allowFractions":true}],"sortAnswers":false}]},
        async function(assert,q) {
            var g = q.getPart('p0g0');
            g.storeAnswer(matrix([['2','0'],['0','1']]));
            var p = q.getPart('p0');
            await submit_part(p);
            assert.ok(p.answered,'can submit a smaller matrix than expected');
        }
    );

    QUnit.module('Choose one from a list');
    QUnit.test('Selecting nothing is invalid', async function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: [[1],[0],[0]]});
        var res = await mark_part(p, [[false], [false], [false]]);
        assert.equal(res.valid,false, 'Picking nothing is invalid');
    })
    QUnit.test('Three choices, first answer is correct', async function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: [[1],[0],[0]]});
        var res = await mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,1,'Picking first choice is correct');
        var res = await mark_part(p, [[false], [true], [false]]);
        assert.equal(res.credit,0,'Picking second choice is incorrect');
    })
    QUnit.test('Three choices, third answer is correct', async function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: [[0],[0],[1]]});
        var res = await mark_part(p, [[false], [false], [true]]);
        assert.equal(res.credit,1,'Picking third choice is correct');
        var res = await mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,0,'Picking first choice is incorrect');
    })
    QUnit.test('Three choices, first answer is correct, marking matrix is a JME expression', async function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: '[1,0,0]'});
        var res = await mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,1,'Picking first choice is correct');
        var res = await mark_part(p, [[false], [true], [false]]);
        assert.equal(res.credit,0,'Picking second choice is incorrect');
    })

    QUnit.module('Choose several from a list');
    QUnit.test('Sum ticked cells: Selecting nothing is invalid', async function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[0]], markingMethod: 'sum ticked cells'});
        var res = await mark_part(p, [[false], [false]]);
        assert.notOk(res.valid, 'Picking nothing is invalid');
        var res2 = await mark_part(p, [[false], [true]]);
        assert.ok(res2.valid, 'Picking something is valid');
    });
    QUnit.test('Score per matched cell: Selecting nothing is valid', async function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[0]], markingMethod: 'score per matched cell'});
        var res = await mark_part(p, [[false], [false]]);
        assert.ok(res.valid, 'Picking nothing is valid');
    });
    QUnit.test('Two choices, both right', async function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[1]]});
        var res = await mark_part(p, [[true], [true]]);
        assert.equal(res.credit,1,'Picking both is correct');
        var res = await mark_part(p, [[true], [false]]);
        assert.equal(res.credit,0.5,'Picking just one gives half credit');
    });
    QUnit.test('Two choices, minAnswers = 2', async function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[1]], minAnswers: 2});
        var res = await mark_part(p, [[false], [true]]);
        assert.equal(res.credit,0,'Picking one is incorrect');
    });

    QUnit.module('Match choices with answers');
    QUnit.test('Marking matrix is id(2)', async function(assert) {
        var p = createPartFromJSON({type:'m_n_x', choices: ['a','b'], answers: ['A','B'], matrix: [[1,0],[0,1]]});
        var res = await mark_part(p, [[true,false],[false,true]]);
        assert.equal(res.credit,1,'Picking correct options gives 1 credit');
        var res = await mark_part(p, [[true,true],[true,true]]);
        assert.equal(res.credit,1,'Picking all options gives 1 credit');
    });
    QUnit.test('Marking matrix is id(2) with -5 for wrong choice', async function(assert) {
        var p = createPartFromJSON({type:'m_n_x', choices: ['a','b'], answers: ['A','B'], matrix: [[1,-5],[-5,1]]});
        var res = await mark_part(p, [[true,false],[false,true]]);
        assert.equal(res.credit,1,'Picking correct options gives 1 credit');
        var res = await mark_part(p, [[true,true],[true,true]]);
        p.calculateScore();
        assert.equal(p.credit,0,'Picking all options gives 0 credit');
    });
    QUnit.test('Order of feedback follows reading the grid left-to-right and top-to-bottom', async function(assert) {
        var p = createPartFromJSON({type:'m_n_x', choices: ['a','b'], answers: ['A','B'], matrix: [[1,-5],[-5,1]], distractors: [['Aa','Ba'],['Ab','Bb']]});
        var res = await mark_part(p, [[true,true],[true,true]]);
        assert.equal(res.states.map(s => s.message).join('\n'), 'Aa\nAb\nBa\nBb');
    });

    QUnit.module('Gapfill');
    QUnit.test('One JME gap with answer "x+2"', async function(assert) {
        var p = createPartFromJSON({type:'gapfill', gaps: [{type: 'jme', answer: 'x+2'}]});
        var scope = p.getScope();
        scope.question = {getPart: function(path){ return p.gaps.filter(function(p){return p.path==path})[0]; }};
        var res = await await mark_part(p,['x+2'],scope);
        assert.equal(res.credit,1,'"x+2" correct');
    });

    question_test(
        'One JME gap with string restrictions',
        {"name":"string restriction in gapfill JME part","tags":[],"metadata":{"description":"","licence":"Creative Commons Attribution 4.0 International"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>x^2+x</p>\n<p>[[0]]</p>","gaps":[{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x^2+x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[],"musthave":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"didn't use ("},"notallowed":{"strings":["^"],"showStrings":false,"partialCredit":0,"message":"did use ^"}}]},{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}]},
        async function(assert,q) {
            var p = q.getPart('p0');
            var res = await mark_part(p,['x^2+x']);
            assert.ok(res.valid,"x^2+x is valid");
            assert.equal(res.credit,0,"x^2+x is incorrect");
            var res2 = await mark_part(p,['x*(x+1)']);
            assert.equal(res2.credit,1,"x*(x+1) is correct");
        }
    );

    question_test(
        'A gap-fill is invalid if any of the gaps are invalid',
        {
            "parts": [
                {
                    "type": "gapfill",
                    "gaps": [
                        { "type": "numberentry", "marks": 1, "minValue": "1", "maxValue": "1"},
                        { "type": "numberentry", "marks": 1, "minValue": "1", "maxValue": "1"},
                    ],
                }
            ]
        },
        async function(assert,q) {
            var done = assert.async();
            var p = q.getPart('p0');
            await submit_part(p);
            assert.equal(p.credit, 0);
            assert.notOk(p.answered);

            q.getPart('p0g0').storeAnswer('1');
            await submit_part(p);
            assert.equal(p.credit, 0.5);
            assert.notOk(p.answered);

            q.getPart('p0g1').storeAnswer('1');
            await submit_part(p);
            assert.equal(p.credit, 1);
            assert.ok(p.answered);

            done();
        }
    );

    question_test(
        'Show an error message when a gap relies on an unanswered part',
        {
          "name": "In a gap, when adaptive marking is set to \"always replace variables\" and a \"must be answered\" part is not answered, no error message is shown. #969",
          "variables": {
            "n": {
              "name": "n",
              "group": "Ungrouped variables",
              "definition": "1",
              "description": "",
              "templateType": "anything",
              "can_override": false
            }
          },
          "ungrouped_variables": [
            "n"
          ],
          "parts": [
            {
              "type": "numberentry",
              "marks": 1,
              "minValue": "n",
              "maxValue": "n",
            },
            {
              "type": "gapfill",
              "marks": 0,
              "prompt": "<p>[[0]]</p>",
              "gaps": [
                {
                  "type": "numberentry",
                  "marks": 1,
                  "variableReplacements": [
                    {
                      "variable": "n",
                      "part": "p0",
                      "must_go_first": true
                    }
                  ],
                  "variableReplacementStrategy": "alwaysreplace",
                  "minValue": "n",
                  "maxValue": "n",
                },
              ]
            }
          ],
        },
        async function(assert,q) {
            var done = assert.async();
            var p = q.getPart('p1');
            var g = q.getPart('p1g0');
            g.storeAnswer('1');
            await submit_part(p);
            assert.equal(p.markingFeedback.map(f => f.message).join('\n'), "You must answer a) first.\nYou scored <strong>0</strong> marks for this part.");
            done();
        }
    );

    question_test(
        'Sort answers',
        {
            name: 'q',
            parts: [
                {type: 'gapfill', gaps: [{type:'numberentry', minValue: '1', maxValue: '1', marks: 1},{type:'numberentry', minValue: '2', maxValue: '2', marks: 1}]},
                {type: 'gapfill', sortAnswers: true, gaps: [{type:'numberentry', minValue: '1', maxValue: '1', marks: 1},{type:'numberentry', minValue: '2', maxValue: '2', marks: 1}]}
            ]
        },
        async function(assert,q) {
            var done = assert.async();

            var p = q.getPart('p0');
            var res = await mark_part(p,['1','2']);
            assert.equal(res.credit,1,"1,2 correct without sortAnswers");

            var res = await mark_part(p,['2','1']);
            assert.equal(res.credit,0,"2,1 incorrect without sortAnswers");

            var p = q.getPart('p1');
            var res = await mark_part(p,['1','2']);
            assert.equal(res.credit,1,"1,2 correct with sortAnswers");

            var res = await mark_part(p,['2','1']);
            assert.equal(res.credit,1,"2,1 correct with sortAnswers");

            done();
        }
    );

    QUnit.test("Multiply credit in a gap", async function(assert) {
        var data = {"type":"gapfill","useCustomName":false,"customName":"","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>[[0]]</p>\n<p>[[1]]</p>","gaps":[{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"25","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"sortAnswers":false};
        var p = createPartFromJSON(data);
        var scope = p.getScope();
        scope.question = {getPart: function(path){ return p.gaps.filter(function(p){return p.path==path})[0]; }};
        var res = await mark_part(p,['1.20','1.20'],scope);
        assert.equal(res.credit,0.375,'apply penalty to both gaps');
        var res = await mark_part(p,['1.2','1.20'],scope);
        assert.equal(res.credit,0.75,'apply 50% penalty to second gap');
        var res = await mark_part(p,['1.20','1.2'],scope);
        assert.equal(res.credit,0.625,'apply 25% penalty to first gap');

        var data2 = {"type":"gapfill","useCustomName":false,"customName":"","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>[[0]]</p>\n<p>[[1]]</p>\n<p>[[2]]</p>","gaps":[{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"sortAnswers":false};
        var p2 = createPartFromJSON(data2);
        var scope = p2.getScope();
        scope.question = {getPart: function(path){ return p2.gaps.filter(function(g){return g.path==path})[0]; }};
        var res = await mark_part(p2,['1.20','1.20','1.20'],scope);
        assert.equal(res.credit,0.5,'apply penalty to three gaps');
        assert.equal(p2.creditFraction.toFloat(),0.5,'part.creditFraction is 0.5 as well');
    });

    question_test(
        'Adaptive marking order',
        {
            "name": "adaptive gap order",
            "variables": {
                "a": {
                    "name": "a",
                    "group": "Ungrouped variables",
                    "definition": "1",
                    "description": "",
                    "templateType": "anything"
                },
                "b": {
                    "name": "b",
                    "group": "Ungrouped variables",
                    "definition": "a",
                    "description": "",
                    "templateType": "anything"
                }
            },
            "parts": [
                {
                    "type": "gapfill",
                    "useCustomName": true,
                    "customName": "cycle",
                    "gaps": [
                        {
                            "type": "numberentry",
                            "marks": 1,
                            "variableReplacements": [
                                {
                                    "variable": "a",
                                    "part": "p0g1",
                                    "must_go_first": false
                                }
                            ],
                            "minValue": "b",
                            "maxValue": "b",
                        },
                        {
                            "type": "numberentry",
                            "marks": 1,
                            "variableReplacements": [
                                {
                                    "variable": "b",
                                    "part": "p0g0",
                                    "must_go_first": false
                                }
                            ],
                            "minValue": "a",
                            "maxValue": "a",
                        }
                    ],
                },
                {
                    "type": "gapfill",
                    "useCustomName": true,
                    "customName": "unusual order",
                    "gaps": [
                        {
                            "type": "numberentry",
                            "marks": 1,
                            "variableReplacements": [
                                {
                                    "variable": "a",
                                    "part": "p1g1",
                                    "must_go_first": false
                                }
                            ],
                            "minValue": "b",
                            "maxValue": "b",
                        },
                        {
                            "type": "numberentry",
                            "marks": 1,
                            "minValue": "a",
                            "maxValue": "a",
                        }
                    ],
                }
            ],
        },
        async function(assert,q) {
            var p = q.getPart('p0');
            var done2 = assert.async();
            try {
                var res = await mark_part(p,['2','2']);
            } catch(e) {
                assert.ok(e.originalMessages.indexOf('part.gapfill.cyclic adaptive marking')>=0, 'error due to cyclic dependency in adaptive marking');
            }
            var p = q.getPart('p1');
            var res = await mark_part(p,['2','2']);
            var g = q.getPart('p1g0');
            assert.equal(p.credit,0.5,'b is correct with adaptive marking');
            assert.notOk(g.shouldResubmit,'b is not marked "should resubmit"');
            done2();
        }
    );

    question_test(
        'Re-evaluate destructured variables after variable replacement',
        {
            "name": "Destructured aren't re-evaluated!",
            "variables": {
                "n": {
                    "name": "n",
                    "group": "Ungrouped variables",
                    "definition": "1",
                    "description": "",
                    "templateType": "anything",
                    "can_override": false
                },
                "x,y": {
                    "name": "x,y",
                    "group": "Ungrouped variables",
                    "definition": "[2n,3n]",
                    "description": "",
                    "templateType": "anything",
                    "can_override": false
                }
            },
            "parts": [
                {
                    "type": "numberentry",
                    "minValue": "n",
                    "maxValue": "n",
                },
                {
                    "type": "numberentry",
                    "variableReplacements": [
                        {
                            "variable": "n",
                            "part": "p0",
                            "must_go_first": true
                        }
                    ],
                    "variableReplacementStrategy": "alwaysreplace",
                    "minValue": "x",
                    "maxValue": "x",
                }
            ],
        },
        async function(assert,q) {
            var p = q.getPart('p0');
            var done = assert.async();
            p.storeAnswer('2');
            var res = await submit_part(p);
            var p = q.getPart('p1');
            p.storeAnswer('4');
            var res = await submit_part(p);
            assert.equal(p.credit,1,'2n is now 4');
            done();
        }
    );

    question_test(
        'Adaptive marking error when referenced part doesn\'t exist',
        {
            name:'Adaptive marking error when referenced part doesn\'t exist',
            variables: {
                    'n': {
                        name: 'n',
                        definition: '1'
                    }
            },
            parts: [
                {
                    type: 'numberentry',
                    minvalue: '1',
                    maxvalue: '1',
                    variableReplacements: [
                        { variable: 'n', part: 'p1' }
                    ],
                    variableReplacementStrategy: 'alwaysreplace'
                }
            ]
        },
        async function(assert,q) {
            var done = assert.async();
            var p0 = q.getPart('p0');
            p0.storeAnswer('4');
            await submit_part(p0);
            assert.equal(p0.markingFeedback[0].message, "There was an error in the adaptive marking for this part. Please report this. Question 1: Can't find part p1.");
            done();
        }
    )


    question_test(
        'Adaptive marking carries through to gaps',
        {
            name:'Adaptive marking carries through to gaps',
            variables: {
                    'n': {
                        name: 'n',
                        definition: '1'
                    }
            },
            parts: [
                {
                    type: 'numberentry',
                    minvalue: '1',
                    maxvalue: '1',
                },
                {
                    type: 'gapfill',
                    variableReplacements: [
                        { variable: 'n', part: 'p0' }
                    ],
                    gaps: [
                        {type: 'numberentry', minvalue: 'n', maxvalue: 'n'},
                        {type: 'numberentry', minvalue: '2n', maxvalue: '2n'}
                    ]
                }
            ]
        },
        async function(assert,q) {
            var p0 = q.getPart('p0');
            p0.storeAnswer('4');
            await submit_part(p0);
            var p1 = q.getPart('p1');
            var g0 = q.getPart('p1g0');
            var g1 = q.getPart('p1g1');
            g0.storeAnswer('4');
            g1.storeAnswer('8');
            await submit_part(p1);
            assert.equal(p1.credit,1,'full marks because variable replacements are carried through to the gaps');
            g0.storeAnswer('2');
            g1.storeAnswer('4');
            await submit_part(p1);
            assert.equal(p1.credit,0,'no marks for wrong answers');
        }
    )

        

    QUnit.module('Custom marking algorithms');
    question_test(
        'Error in mark note',
        {"name":"marking algorithm error display","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"jme","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"q:\n  a\n\nmark:\n  apply(z)","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"singleLetterVariables":false,"allowUnknownFunctions":true,"implicitFunctionComposition":false,"valuegenerators":[{"name":"x","value":""}]}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p = q.getPart('p0');
            p.storeAnswer('x');
            p.submit();
            assert.notOk(p.marking_result.answered);
        },
        function(err) {
            console.error(err);
        }
    );


    QUnit.module('Question');
    question_test(
        'Question',
        {
            name:'Barg',
            parts: [
                {type:'jme',answer:'x+2', marks: 1}
            ]
        },
        async function(assert,q) {
            var p = q.getPart('p0');
            assert.ok(p,'Part created');
            p.storeAnswer('x+2');
            q.submit();

            assert.equal(q.name,'Barg');
            assert.equal(q.score,1,'Score is 1');
        }
    );

    question_test(
        'Built-in constants: with j',
        {
            builtin_constants: {
                j: true,
                e: false
            }
        },
        async function(assert, q) {
            assert.ok(q.scope.getConstant('j'), 'j is a defined constant, turned on by the question');
            assert.ok(q.scope.getConstant('pi'), 'pi is a defined constant, turned on by default');
            assert.notOk(q.scope.getConstant('e'), 'e is not a defined constant, turned off by the question');
        }
    );

    question_test(
        'Built-in constants: no j',
        {
            builtin_constants: {
                e: false
            }
        },
        async function(assert, q) {
            assert.notOk(q.scope.getConstant('j'), 'j is not a defined constant, turned off by default');
            assert.ok(q.scope.getConstant('pi'), 'pi is a defined constant, turned on by default');
            assert.notOk(q.scope.getConstant('e'), 'e is not a defined constant, turned off by the question');
        }
    );

    question_test(
        "A big question",
        {"name":"Working on standalone part instances","tags":[],"metadata":{"description":"<p>Check that the&nbsp;MarkingScript reimplementations of the marking algorithms work properly.</p>","licence":"None specified"},"statement":"<p>Parts&nbsp;<strong>a</strong> to&nbsp;<strong>f</strong> use the standard marking algorithms.</p>","advice":"","rulesets":{},"extensions":[],"variables":{"m":{"name":"m","group":"Ungrouped variables","definition":"id(2)","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["m"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a number between 1 and 2</p>","minValue":"1","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"2","precisionPartialCredit":0,"precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":false,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"matrix","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a $2 \\times 2$ identity matrix.</p>","correctAnswer":"id(2)","correctAnswerFractions":false,"numRows":"2","numColumns":"2","allowResize":true,"tolerance":0,"markPerCell":true,"allowFractions":false,"precisionType":"dp","precision":0,"precisionPartialCredit":"40","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true},{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write $x$</p>","answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":true,"expectedVariableNames":["x"],"notallowed":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"<p>No brackets!</p>"}},{"type":"patternmatch","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write \"a+\"</p>","answer":"a+","displayAnswer":"","caseSensitive":true,"partialCredit":"30","matchMode":"exact"},{"type":"1_n_2","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Choose choice 1</p>","minMarks":0,"maxMarks":0,"shuffleChoices":false,"displayType":"radiogroup","displayColumns":0,"choices":["Choice 1","Choice 2","Choice 3"],"matrix":["1",0,"-1"],"distractors":["Choice 1 is good","Choice 2 is not great","Choice 3 is bad"]},{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[{"variable":"m","part":"p1","must_go_first":false}],"variableReplacementStrategy":"alwaysreplace","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>What's&nbsp;the determinant of the matrix in part b?</p>","minValue":"det(m)","maxValue":"det(m)","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"q:\n  apply_marking_script(\"numberentry\",studentAnswer,settings+[\"minvalue\":4,\"maxvalue\":5],1)\n\nr:\n  apply_marking_script(\"numberentry\",studentAnswer,settings+[\"minvalue\":3,\"maxvalue\":4],1)\n\nmark:\n  feedback(\"number between 4 and 5\");\n  concat_feedback(q[\"mark\"][\"feedback\"],marks/2);\n  feedback(\"number between 3 and 4\");\n  concat_feedback(r[\"mark\"][\"feedback\"],marks/2)","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a number between 4 and 5, and between 3 and 4.</p>","minValue":"1","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}]},
        async function(assert,q) {
            assert.ok(q);

            var p1 = q.getPart('p1');
            var p5 = q.getPart('p5');
            p1.storeAnswer(matrix([['2','0'],['0','1']]));
            p1.submit();
            assert.equal(p1.credit,0.75,'0.75 credit on part b for one cell wrong');
            p5.storeAnswer('2');
            p5.submit();
            assert.equal(p5.credit,1,'Adaptive marking used for part f');

        }
    );

    question_test(
        "Steps penalty",
        {"name":"steps penalty","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","useCustomName":false,"customName":"","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"prompt":"<p>[[0]]</p>\n<p>[[1]]</p>","stepsPenalty":"1","steps":[{"type":"information","useCustomName":false,"customName":"","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"prompt":"<p>das</p>"}],"gaps":[{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"sortAnswers":false},{"type":"numberentry","useCustomName":false,"customName":"","marks":"2","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"stepsPenalty":"1","steps":[{"type":"information","useCustomName":false,"customName":"","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"prompt":"<p>das</p>"}],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p0 = q.getPart('p0');
            q.getPart('p0g0').storeAnswer('1');
            q.getPart('p0g1').storeAnswer('2');
            await submit_part(p0);
            assert.equal(p0.score,1,'1 mark with no steps penalty');
            p0.showSteps();
            assert.equal(p0.score,0.5,'0.5 marks with steps penalty');
            var expected_feedback =[
                {
                    "op": "feedback",
                    "message": "You revealed the steps."
                },
                {
                    "op": "feedback",
                    "message": "The maximum you can score for this part is <strong>1</strong> mark. Your scores will be scaled down accordingly."
                },
                {
                    "op": "feedback",
                    "message": "<strong>Gap 0</strong>",
                    "credit_change": "neutral",
                    "format": "string",
                    "reason": undefined
                },
                {
                    "op": "add_credit",
                    "credit": 0.5,
                    "message": "Your answer is correct.\n\nYou were awarded <strong>0.5</strong> marks.",
                    "reason": "correct",
                    "credit_change": "positive"
                },
                {
                    "op": "feedback",
                    "message": "<strong>Gap 1</strong>",
                    "format": "string",
                    "credit_change": "neutral",
                    "reason": undefined
                },
                {
                    "op": "add_credit",
                    "credit": 0,
                    "message": "Your answer is incorrect.",
                    "reason": "incorrect",
                    "credit_change": "negative"
                },
                {
                    "op": "feedback",
                    "format": "string",
                    "message": "You scored <strong>0.5</strong> marks for this part.",
                    "reason": undefined
                }
            ]
            assert.deepEqual(p0.markingFeedback,expected_feedback);

            var p1 = q.getPart('p1')
            p1.storeAnswer('1');
            p1.submit();
            assert.equal(p1.score,2,'2 marks without steps penalty');
            p1.showSteps();
            assert.equal(p1.score,1,'1 marks with steps penalty');
        }
    );

    question_test(
        "Adaptive marking penalty",
        {"name":"adaptive marking penalty","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"a":{"name":"a","group":"Ungrouped variables","definition":"1","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["a"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"minValue":"a","maxValue":"a","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"2","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[{"variable":"a","part":"p0","must_go_first":false}],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":"1","exploreObjective":null,"minValue":"a","maxValue":"a","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p0 = q.getPart('p0');
            var p1 = q.getPart('p1');
            p0.storeAnswer('2');
            p0.submit();
            p1.storeAnswer('2');
            p1.submit();
            assert.equal(p1.score,1,'Adaptive marking penalty applied');
        }
    );

    

    question_test(
        "Catch error in a marking script",
        {"name":"Error in marking algorithm","tags":[],"metadata":{"description":"<p>Show a message when there's an error in the marking algorithm</p>","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"mark: set_credit(1","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}]},
        function() {},
        async function(assert,q,e) {
            assert.deepEqual(e.originalMessages,['part.error', 'jme.script.error parsing notes'],'Error is "jme.script.error parsing notes"');
        }
    );

    QUnit.test('Extension scopes only applied to questions that uses them - issue #710', async function(assert) {
        var done = assert.async();
        Numbas.addExtension('extension_scope_per_question_issue_710', ['jme'], function(ext) {
            ext.scope.addFunction(new Numbas.jme.funcObj('fn710',[], Numbas.jme.types.TNum, function() {
                return 1;
            }));
        });

        var exam_def = {
            name: 'issue #710',
            question_groups: [
                {
                    questions: [
                        {
                            name: 'q1',
                            extensions: ['extension_scope_per_question_issue_710']
                        },
                        {
                            name: 'q2',
                            extensions: []
                        }
                    ]
                }
            ]
        };

        Numbas.activateExtension('extension_scope_per_question_issue_710');
        var e = Numbas.createExamFromJSON(exam_def);
        e.init();
        await e.signals.on('ready');
        assert.equal(e.questionList[0].scope.getFunction('fn710').length, 1, 'q1 has the function');
        assert.equal(e.questionList[1].scope.getFunction('fn710').length, 0, 'q2 does not have the function');
        done();
    });

    QUnit.test('Promise in question preamble', async function(assert) {
        var done = assert.async();
        assert.expect(4);
        var question_def = {
            name: 'question',
            parts: [
                {
                    type: 'numberentry',
                    marks: 1,
                    minvalue: '1',
                    maxvalue: '1'
                }
            ],
            preamble: {
                js: `
return new Promise(resolve => {
    setTimeout(() => {
        question.scope.setVariable('a', Numbas.jme.wrapValue(1)); 
        resolve()
    }, 1);
});`
            },
            variables: {
                b: {
                    name: "b",
                    definition: "a+2",
                    description: "2 more than a",
                    templateType: "anything"
                }
            }
        };
        var question = Numbas.createQuestionFromJSON(question_def);
        assert.notOk(question.scope.getVariable('a'));
        await question.signals.on('preambleRun');
        assert.ok(question.scope.getVariable('a'));
        assert.notOk(question.scope.getVariable('b'));
        question.generateVariables();
        await question.signals.on('variablesGenerated');
        assert.equal(question.scope.getVariable('b').value, 3);
        done();
    });

    QUnit.module('Explore mode');
    question_test(
        'One next part',
        {"name":"Explore mode: one link","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"information","useCustomName":true,"customName":"Beginning","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[{"label":"Step 2","rawLabel":"","otherPart":1,"variableReplacements":[],"availabilityCondition":"","penalty":"","penaltyAmount":0,"lockAfterLeaving":false}],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Step 2","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null}],"partsMode":"explore","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            assert.equal(q.parts.length,1)
            var p = q.currentPart;
            assert.ok(q.currentPart);
            assert.equal(q.currentPart.name,'Beginning');
            assert.equal(q.currentPart.nextParts.length,1);
            assert.equal(q.currentPart.nextParts[0].label,'Step 2');
            q.currentPart.makeNextPart(q.currentPart.nextParts[0]);
            assert.equal(q.parts.length,2);
            assert.equal(q.currentPart.name,'Step 2');
        }
    );

    question_test(
        'Replace a variable',
        {"name":"Explore mode: replace variables","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"a":{"name":"a","group":"Ungrouped variables","definition":"1","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["a"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":true,"customName":"Enter number","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[{"label":"Show a","rawLabel":"","otherPart":1,"variableReplacements":[{"variable":"a","definition":"interpreted_answer"}],"availabilityCondition":"","penalty":"","penaltyAmount":0,"lockAfterLeaving":false}],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"minValue":"a","maxValue":"a","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"information","useCustomName":true,"customName":"Show a","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"prompt":"<p>$a = \\var{a}$</p>"}],"partsMode":"explore","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p = q.currentPart;
            assert.equal(p.getScope().getVariable('a').value,1, 'a = 1');
            p.storeAnswer('2');
            await submit_part(p);
            p.makeNextPart(p.nextParts[0]);
            var p2 = q.currentPart;
            assert.equal(p2.getScope().getVariable('a').value,2, 'a = 2 in the next part');
        }
    );

    question_test(
        'Next part labels match part names',
        {
            "name":"Explore mode: replace variables",
            "variables": {
                "a": {
                    "name":"a",
                    "definition":"1",
                }
            },
            "parts": [
                {
                    "type":"information",
                    "customName":"Beginning",
                    "nextParts":[
                        {
                            "label":"Step {a+1}",
                            "otherPart":0,
                            "variableReplacements": [
                                {
                                    "variable":"a",
                                    "definition":"a+1"
                                }
                            ],
                        }
                    ]
                }
            ],
            "partsMode":"explore",
        },

        async function(assert,q) {
            var p = q.currentPart;
            assert.equal(p.getScope().getVariable('a').value,1, 'a = 1');
            assert.equal(p.nextParts[0].label,'Step 2','Next part option has label "Step 2"');
            p.makeNextPart(p.nextParts[0]);
            var p2 = q.currentPart;
            assert.equal(p2.name,'Step 2', 'Second part has label "Step 2"');
        }
    );

    question_test('Conditional availability of next parts',
        {"name":"Explore mode: conditional availability","tags":[],"metadata":{"descripton":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":true,"customName":"Enter a number","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[{"label":"Always available","rawLabel":"","otherPart":1,"variableReplacements":[],"availabilityCondition":"","penalty":"","penaltyAmount":0,"lockAfterLeaving":false},{"label":"Available when wrong","rawLabel":"","otherPart":2,"variableReplacements":[],"availabilityCondition":"answered and credit<1","penalty":"","penaltyAmount":0,"lockAfterLeaving":false},{"label":"Available when correct","rawLabel":"","otherPart":3,"variableReplacements":[],"availabilityCondition":"answered and credit=1","penalty":"","penaltyAmount":0,"lockAfterLeaving":false},{"label":"Available when answered","rawLabel":"","otherPart":4,"variableReplacements":[],"availabilityCondition":"answered","penalty":"","penaltyAmount":0,"lockAfterLeaving":false}],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"information","useCustomName":true,"customName":"Always available","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Available when wrong","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Available when correct","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Available when answered","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null}],"partsMode":"explore","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p = q.currentPart;
            function check_next_parts(expect) {
                assert.deepEqual(p.availableNextParts().map(function(np){ return np.label; }),expect);
            }
            check_next_parts(['Always available']);
            p.storeAnswer('2');
            p.submit();
            check_next_parts(['Always available','Available when wrong','Available when answered']);
        }
    );

    question_test(
        'Objectives and penalties',
        {"name":"Explore mode: objectives and penalties","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":true,"customName":"Write 1","marks":"1","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[{"label":"Write 1","rawLabel":"","otherPart":0,"variableReplacements":[],"availabilityCondition":"","penalty":"","penaltyAmount":0,"lockAfterLeaving":false},{"label":"Get penalty","rawLabel":"Get penalty","otherPart":0,"variableReplacements":[],"availabilityCondition":"","penalty":"Penalty","penaltyAmount":"0.5","lockAfterLeaving":false},{"label":"Write 2","rawLabel":"","otherPart":1,"variableReplacements":[],"availabilityCondition":"","penalty":"","penaltyAmount":0,"lockAfterLeaving":false}],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":"Main objective","minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":true,"customName":"Write 2","marks":"2","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":"Second objective","minValue":"2","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"partsMode":"explore","maxMarks":"0","objectives":[{"name":"Main objective","limit":1,"mode":"sum"},{"name":"Second objective","limit":"2","mode":"sum"}],"penalties":[{"name":"Penalty","limit":"1","mode":"sum"}],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p = q.currentPart;
            p.storeAnswer('1');
            p.submit();
            assert.equal(q.score,1,'Score 1 for correct answer');

            q.currentPart.makeNextPart(p.nextParts[0]);
            var p2 = q.currentPart;
            p2.storeAnswer('1');
            p2.submit();
            assert.equal(q.score,1,'Score limited to 1');

            q.currentPart.makeNextPart(p.nextParts[2]);
            var p3 = q.currentPart;
            p3.storeAnswer('2');
            p3.submit();
            assert.equal(q.score,3,'Both objectives');
            assert.equal(q.objectives[0].score,1,'First objective has 1 mark');
            assert.equal(q.objectives[1].score,2,'Second objective has 2 marks');

            q.currentPart.makeNextPart(p.nextParts[1]);
            assert.equal(q.score,2.5,'Penalty applied after objectives limited');

        }
    );

    QUnit.module('Alternative answers');
    question_test(
        'Separate number answer',
        {"name":"Alternative answer: 2 instead of 1","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"alternatives":[{"type":"numberentry","useCustomName":true,"customName":"2","marks":0.5,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"alternativeFeedbackMessage":"<p>You wrote 2.</p>","useAlternativeFeedback":false,"minValue":"2","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p = q.parts[0];
            p.storeAnswer('1');
            p.submit();
            assert.equal(p.credit,1,'1 credit for correct answer');
            p.storeAnswer('2');
            p.submit();
            assert.equal(p.credit,0.5,'0.5 credit for alternative answer');
            assert.equal(p.markingFeedback[0].message,'<p>You wrote 2.</p>\n\nYou were awarded <strong>0.5</strong> marks.');
        }
    );

    question_test(
        'Main part gives partial credit',
        {
            "name":"Alternative answer: 2 instead of 1",
            "parts": [
                {
                    "type":"numberentry","marks":1,
                    "customMarkingAlgorithm":"mark: set_credit(0.25,'partial')",
                    "extendBaseMarkingAlgorithm":true,
                    "alternatives": [
                        {"type":"numberentry","useCustomName":true,"customName":"alternative","marks":1,"minValue":"1","maxValue":"1"}
                    ],
                    "minValue":"1",
                    "maxValue":"1",
                }
            ],
        },
        async function(assert,q) {
            var p = q.parts[0];
            p.storeAnswer('1');
            p.submit();
            assert.equal(p.credit,1,'1 credit for correct answer');
            assert.equal(p.markingFeedback[0].message,'You were awarded <strong>1</strong> mark.','Feedback says 1 mark awarded');
        }
    );

    question_test(
        'Expanding range of accepted answers',
        {"name":"Alternative answers: expanding range of accepted answers","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":true,"customName":"1","marks":"5","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"alternatives":[{"type":"numberentry","useCustomName":true,"customName":"0-2","marks":"4","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"alternativeFeedbackMessage":"","useAlternativeFeedback":false,"minValue":"0","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":true,"customName":"0-3","marks":"3","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"alternativeFeedbackMessage":"","useAlternativeFeedback":false,"minValue":"0","maxValue":"3","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            var p = q.parts[0];
            p.storeAnswer('1');
            p.submit();
            assert.equal(p.credit,1,'full credit for 1');
            p.storeAnswer('2');
            p.submit();
            assert.equal(p.credit,4/5,'4/5 marks for 2');
            p.storeAnswer('3');
            p.submit();
            assert.equal(p.credit,3/5,'3/5 marks for 3');
            p.storeAnswer('4');
            p.submit();
            assert.equal(p.credit,0,'0 marks for 4');
        }
    );

    question_test(
        'Show all feedback',
        {"name":"Alternative answers: show all feedback","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"jme","useCustomName":true,"customName":"x","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"alternatives":[{"type":"jme","useCustomName":true,"customName":"y - not all feedback","marks":"0.5","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"alternativeFeedbackMessage":"<p>You wrote y</p>","useAlternativeFeedback":false,"answer":"y","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"singleLetterVariables":false,"allowUnknownFunctions":true,"implicitFunctionComposition":false,"valuegenerators":[{"name":"y","value":""}]},{"type":"jme","useCustomName":true,"customName":"z - all feedback","marks":0.5,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"alternativeFeedbackMessage":"<p>You wrote z</p>","useAlternativeFeedback":true,"answer":"z","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"singleLetterVariables":false,"allowUnknownFunctions":true,"implicitFunctionComposition":false,"valuegenerators":[{"name":"x","value":""}]}],"answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"singleLetterVariables":false,"allowUnknownFunctions":true,"implicitFunctionComposition":false,"valuegenerators":[{"name":"x","value":""}]}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        async function(assert,q) {
            function collect_feedback(feedback) {
                return feedback.map(function(m) { return m.message; }).join('\n');
            }
            var p = q.parts[0];
            p.storeAnswer('x');
            p.submit();
            assert.equal(collect_feedback(p.markingFeedback),'Your answer is numerically correct.\n\nYou were awarded <strong>1</strong> mark.\nYou scored <strong>1</strong> mark for this part.');
            p.storeAnswer('y');
            p.submit();
            assert.equal(collect_feedback(p.markingFeedback),'<p>You wrote y</p>\n\nYou were awarded <strong>0.5</strong> marks.\nYou scored <strong>0.5</strong> marks for this part.');
            p.storeAnswer('z');
            p.submit();
            assert.equal(collect_feedback(p.markingFeedback),'Your answer is numerically correct.\n\nYou were awarded <strong>0.5</strong> marks.\n<p>You wrote z</p>\nYou scored <strong>0.5</strong> marks for this part.');
        }
    );

    /** 
     *  Capture signals and events from Numbas.schedule.EventBox/SignalBox objects.
     *  If `owner` is not given, then the prototype trigger method is replaced, catching signals/events on all objects.
     *  If `owner` is given, then the trigger method is replaced only on that object, so only its signals/events are captured.
     *
     *  Each captured signal/event produces a step assertion. 
     */
    function capture_signals(assert, owner) {
        var oevent_trigger = Numbas.schedule.EventBox.prototype.trigger;
        var eventbox = owner ? owner.events : Numbas.schedule.EventBox.prototype;
        eventbox.trigger = function(name) {
            if(name=='countDown') {
                return;
            }
            assert.step('event: '+name);
            oevent_trigger.apply(this,arguments);
        }
        var osignal_trigger = Numbas.schedule.SignalBox.prototype.trigger;
        var signalbox = owner ? owner.signals : Numbas.schedule.SignalBox.prototype;
        signalbox.trigger = function(name) {
            assert.step('signal: '+name);
            osignal_trigger.apply(this,arguments);
        }

        var done = assert.async();
        return function() {
            eventbox.trigger = oevent_trigger;            
            signalbox.trigger = osignal_trigger;
            done();
        }
    }

    QUnit.module('Signals');
    QUnit.test('Exam signals', async function(assert) {
        var exam_def = {
            name: 'exam',
            question_groups: [
                {
                    questions: [
                        {
                            name: 'Q1',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        },
                        {
                            name: 'Q2',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        }
                    ]
                }
            ]
        };
        var exam = Numbas.createExamFromJSON(exam_def,null,false);
        var done = capture_signals(assert, exam);
        exam.init();
        await exam.signals.on('ready');
        exam.begin();
        await exam.signals.on('begin');
        assert.verifySteps([
            "signal: chooseQuestionSubset",
            "event: createQuestion",
            "event: calculateScore",
            "event: updateScore",
            "event: calculateScore",
            "event: updateScore",
            "event: createQuestion",
            "event: calculateScore",
            "event: updateScore",
            "event: calculateScore",
            "event: updateScore",
            "signal: question list initialised",
            "event: calculateScore",
            "signal: ready",
            "event: calculateScore",
            "event: updateScore",
            "event: hideTiming",
            "event: startTiming",
            "event: showInfoPage",
            "signal: begin"
        ], 'up to beginning the exam');
        
        exam.showMenu();
        assert.verifySteps([
            'event: showInfoPage'
        ], 'showMenu');

        exam.pause();
        assert.verifySteps([
            'event: endTiming',
            'event: showInfoPage',
            'event: pause'
        ], 'pause');

        exam.resume();
        assert.verifySteps([
            'event: hideTiming',
            'event: startTiming',
            'event: resume'
        ], 'resume');

        exam.changeDuration(5000);
        assert.verifySteps([
            'event: showTiming',
            'event: updateDisplayDuration',
            'event: showTiming'
        ], 'changeDuration');

        exam.updateScore();
        assert.verifySteps([
            'event: calculateScore',
            'event: updateScore'
        ], 'updateScore');

        exam.tryChangeQuestion(1);
        assert.verifySteps([
            'event: tryChangeQuestion',
            'event: changeQuestion',
            'event: showQuestion'
        ], 'tryChangeQuestion');

        await exam.regenQuestion();
        assert.verifySteps([
            "event: startRegen",
            "event: calculateScore",
            "event: updateScore",
            "event: calculateScore",
            "event: updateScore",
            "event: changeQuestion",
            "event: calculateScore",
            "event: updateScore",
            "event: endRegen"
        ], 'regenQuestion');

        exam.tryEnd();
        assert.verifySteps([
            'event: tryEnd',
            'event: endTiming',
            'event: calculateScore',
            'event: updateScore',
            'event: calculateScore',
            'event: updateScore',
            'event: revealAnswers',
            'event: end',
            'event: showInfoPage'
        ], 'tryEnd');

        exam.reviewQuestion(0);
        assert.verifySteps([
            'event: changeQuestion',
            'event: reviewQuestion'
        ], 'reviewQuestion');

        done();
        exam.endTiming();

        exam_def = {
            name: 'exam',
            navigation: {
                browse: true,
                navigateMode: 'sequence',
                onleave: {
                    action: 'preventifunattempted'
                }
            },
            question_groups: [
                {
                    questions: [
                        {
                            name: 'Q1',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        },
                        {
                            name: 'Q2',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        }
                    ]
                }
            ]
        };
        exam = Numbas.createExamFromJSON(exam_def,null,false);
        exam.init();
        await exam.signals.on('ready');
        exam.begin();
        await exam.signals.on('begin');
        done = capture_signals(assert, exam);
        
        exam.tryChangeQuestion(1);
        assert.verifySteps([
            "event: tryChangeQuestion",
            "event: alert"
        ], 'tryChangeQuestion prevented because unattempted');

        exam.currentQuestion.parts[0].storeAnswer('1');
        await submit_part(exam.currentQuestion.parts[0]);
        exam.tryChangeQuestion(1);
        assert.verifySteps([
            "event: calculateScore",
            "event: updateScore",
            "event: tryChangeQuestion",
            "event: changeQuestion",
            "event: showQuestion"
        ], 'tryChangeQuestion allowed after submitting');

        done();
        exam.endTiming();
    });

    QUnit.test('Exam signals - diagnostic mode', async function(assert) {
        var exam_def = {
            name: 'exam',
            navigation: {
                navigateMode: 'diagnostic',
            },
            diagnostic: {
                script: 'diagnosys',
                knowledge_graph: {
                    learning_objectives: [
                        { name: 'LO 1' }
                    ],
                    topics: [
                        {
                            name: 'group 1',
                            learning_objectives: ['LO 1'],
                        },
                        {
                            name: 'group 2',
                            learning_objectives: ['LO 1']
                        }
                    ]
                }
            },
            question_groups: [
                {
                    name: 'group 1',
                    questions: [
                        {
                            name: 'Q1',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        },
                        {
                            name: 'Q2',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        }
                    ]
                },
                {
                    name: 'group 2',
                    questions: [
                        {
                            name: 'Q3',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        },
                        {
                            name: 'Q4',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        }
                    ]
                }
            ]
        };
        var exam = Numbas.createExamFromJSON(exam_def,null,false);
        var done = capture_signals(assert, exam);
        exam.init();
        await exam.signals.on('ready');
        exam.begin();
        await exam.events.once('initQuestion');
        assert.verifySteps([
            "signal: chooseQuestionSubset",
            "signal: question list initialised",
            "signal: diagnostic controller initialised",
            "event: calculateScore",
            "signal: ready",
            "event: calculateScore",
            "event: updateScore",
            "event: hideTiming",
            "event: startTiming",
            "event: createQuestion",
            "signal: begin",
            "event: calculateScore",
            "event: updateScore",
            "event: calculateScore",
            "event: updateScore",
            "event: changeQuestion",
            "event: calculateScore",
            "event: updateScore",
            "event: initQuestion",
        ], 'initQuestion triggered on beginning the exam');

        exam.currentQuestion.parts[0].storeAnswer('1');
        await exam.currentQuestion.parts[0].submit();
        assert.verifySteps([
            "event: calculateScore",
            "event: updateScore"
        ], 'score recalculated after submitting an answer');

        exam.tryChangeQuestion(1);
        assert.verifySteps([
            "event: tryChangeQuestion",
            "event: createQuestion"
        ], 'tryChangeQuestion');

        await exam.events.once('initQuestion');
        assert.verifySteps([
            "event: calculateScore",
            "event: updateScore",
            "event: calculateScore",
            "event: updateScore",
            "event: changeQuestion",
            "event: calculateScore",
            "event: updateScore",
            "event: initQuestion"
        ]);

        done();
        exam.endTiming();

        exam_def = {
            name: 'exam',
            navigation: {
                navigateMode: 'diagnostic',
            },
            diagnostic: {
                script: 'custom',
                customScript: `
state: 1

first_topic: "group 1"

first_question: topics[first_topic]["questions"][0]

progress: []

feedback: ""

after_exam_ended: state

next_actions: 
    [
        "feedback": "",
        "actions": [
            [ "label": "", "state": state, "next_question": topics[current_topic]["questions"][0] ],
            [ "label": "", "state": state, "next_question": topics[current_topic]["questions"][0] ]
        ]
    ]
                `,
                knowledge_graph: {
                    learning_objectives: [
                        { name: 'LO 1' }
                    ],
                    topics: [
                        {
                            name: 'group 1',
                            learning_objectives: ['LO 1'],
                        }
                    ]
                }
            },
            question_groups: [
                {
                    name: 'group 1',
                    questions: [
                        {
                            name: 'Q1',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        }
                    ]
                }
            ]
        };

        var exam = Numbas.createExamFromJSON(exam_def,null,false);
        exam.init();
        await exam.signals.on('ready');
        exam.begin();
        await exam.events.once('initQuestion');
        var done = capture_signals(assert, exam);

        exam.tryChangeQuestion(1);
        assert.verifySteps([
            "event: tryChangeQuestion",
            "event: showDiagnosticActions"
        ], 'tryChangeQuestion with multiple actions');

        done();
        exam.endTiming();
    });

    QUnit.test('Question signals', async function(assert) {
        var done = capture_signals(assert);
        var question_def = {
            name: 'question',
            parts: [
                {
                    type: 'numberentry',
                    marks: 1,
                    minvalue: '1',
                    maxvalue: '1'
                }
            ]
        };
        var question = Numbas.createQuestionFromJSON(question_def);
        await question.signals.on('variablesTodoMade');
        // these signals run before the question object is returned here, so we need to capture all signals and events
        assert.verifySteps([
            'signal: preambleLoaded',
            'signal: constantsLoaded',
            'signal: functionsLoaded',
            'signal: rulesetsLoaded',
            'signal: variableDefinitionsLoaded',
            'signal: preambleRun',
            'signal: constantsMade',
            'signal: functionsMade',
            'signal: rulesetsMade',
            'signal: variablesTodoMade'
        ], 'creating a question');
        done();

        done = capture_signals(assert, question);

        question.generateVariables();
        await question.signals.on('ready');
        assert.verifySteps([
            'signal: generateVariables',
            'signal: variablesSet',
            'signal: variablesGenerated',
            'event: calculateScore',
            'event: updateScore',
            'event: addPart',
            'signal: partsGenerated',
            'signal: ready',
            'event: calculateScore',
            'event: updateScore'
        ], 'ready after generating variables');

        question.getAdvice();
        assert.verifySteps([
            'signal: adviceDisplayed'
        ], 'getAdvice');

        question.leave();
        assert.verifySteps([
            'event: leave'
        ], 'leave');

        question.lock();
        assert.verifySteps([
            'event: locked'
        ], 'lock');

        question.parts[0].storeAnswer('1');
        await question.parts[0].submit();
        assert.verifySteps([
            'event: calculateScore',
            'event: updateScore'
        ], 'score recalculated after submitting a part');

        question.leavingDirtyQuestion();
        assert.verifySteps([]);
        
        question.parts[0].storeAnswer('2');
        question.leavingDirtyQuestion();
        assert.verifySteps([
            'event: leavingDirtyQuestion'
        ], 'leavingDirtyQuestion');

        question.submit();
        assert.verifySteps([
            'event: pre-submit',
            'event: calculateScore',
            'event: updateScore',
            'event: calculateScore',
            'event: updateScore',
            'event: post-submit'
        ], 'submit');

        question.revealAnswer();
        assert.verifySteps([
            "event: locked",
            "signal: adviceDisplayed",
            "signal: revealed"
        ], 'revealAnswer');

        done();
    });

    QUnit.test('Question signals - explore mode', async function(assert) {
        var question_def = {
            name: 'question',
            partsMode: 'explore',
            parts: [
                {
                    type: 'numberentry',
                    marks: 1,
                    minvalue: '1',
                    maxvalue: '1',
                    nextParts: [
                        {
                            otherPart: 0
                        },
                        {
                            otherPart: 0,
                            lockAfterLeaving: true
                        }
                    ]
                }
            ]
        };
        var question = Numbas.createQuestionFromJSON(question_def);
        question.generateVariables();
        await question.signals.on('ready');
        var done = capture_signals(assert, question);
        var p1 = question.parts[0];
        var donep = capture_signals(assert, p1);
        p1.makeNextPart(p1.nextParts[0]);
        assert.verifySteps([
            "event: calculateScore",
            "event: updateScore",
            "event: addPart",
            "event: setCurrentPart",
            "event: calculateScore",
            "event: updateScore",
            "event: addExtraPart",
            "event: makeNextPart",
            "event: calculateScore",
            "event: updateScore"
        ], 'makeNextPart');

        question.setCurrentPart(p1);
        assert.verifySteps([
            'event: setCurrentPart'
        ], 'setCurrentPart');

        p1.removeNextPart(p1.nextParts[0]);
        assert.verifySteps(
            [
                "event: calculateScore",
                "event: updateScore",
                "event: removePart",
                "event: calculateScore",
                "event: updateScore",
                "event: removeNextPart"
            ], 
            'removeNextPart'
        );

        donep();
        done();

        done = capture_signals(assert, p1);

        p1.makeNextPart(p1.nextParts[1]);
        assert.verifySteps([
            "event: lock",
            "event: makeNextPart"
        ], 'makeNextPart and lock after leaving');

        done();
    });

    QUnit.test('Part signals', async function(assert) {
        var part_def = {
            type: 'numberentry',
            minvalue: '1',
            maxvalue: '1',
            marks: 1
        }

        var done = capture_signals(assert);
        var part = createPartFromJSON(part_def);

        assert.verifySteps([
            "event: makeScope",
            "signal: finaliseLoad"
        ], 'storing an answer');

        part.assignName();
        assert.verifySteps([
            "event: assignName"
        ], 'assignName');

        try {
            part.error('message');
        } catch(e) {
        }
        assert.verifySteps([
            'event: error'
        ], 'throwing an error');

        part.giveWarning('warning');
        assert.verifySteps([
            'event: giveWarning'
        ], 'giving a warning');

        part.storeAnswer('1');
        part.submit();
        assert.verifySteps([
            "event: setDirty",
            "event: storeAnswer",
            "event: pre-submit",
            "event: setDirty",
            "event: pre-markAdaptive",
            "event: markAgainstScope",
            "event: mark_alternative",
            "event: pre-mark",
            "event: pre-mark_answer",
            "event: do_pre_submit_tasks",
            "event: post-mark_answer",
            "event: setCredit",
            "event: post-mark",
            "event: post-markAdaptive",
            "event: calculateScore",
            "event: markingComment",
            "event: post-submit"
        ], 'submitting a correct answer');
        assert.equal(part.credit,1);

        part.storeAnswer('?');
        part.submit();
        assert.verifySteps([
            "event: setDirty",
            "event: storeAnswer",
            "event: pre-submit",
            "event: setDirty",
            "event: pre-markAdaptive",
            "event: markAgainstScope",
            "event: mark_alternative",
            "event: pre-mark",
            "event: pre-mark_answer",
            "event: do_pre_submit_tasks",
            "event: post-mark_answer",
            "event: giveWarning",
            "event: setCredit",
            "event: post-mark",
            "event: post-markAdaptive",
            "event: calculateScore",
            "event: post-submit"
        ], 'submitting an invalid answer');

        part.revealAnswer();
        assert.verifySteps([
            "event: setDirty",
            "event: revealAnswer"
        ], 'revealAnswer');

        done();

        part_def = {
            type: 'numberentry',
            minvalue: '1',
            maxvalue: '1',
            alternatives: [
                {
                    type: 'numberentry',
                    minvalue: '0',
                    maxvalue: '2',
                }
            ],
            steps: [
                {
                    type: 'information'
                }
            ],
            variableReplacements: [
                {
                    variable: 'x',
                    part: '0'
                }
            ]
        }

        done = capture_signals(assert);
        part = createPartFromJSON(part_def);

        assert.verifySteps([
            "event: makeScope",
            "event: addVariableReplacement",
            "event: makeScope",
            "signal: finaliseLoad",
            "event: addStep",
            "event: makeScope",
            "signal: finaliseLoad",
            "event: addAlternative",
            "signal: finaliseLoad"
        ], 'creating a part with a variable replacement, an alternative and a step');

        part.showSteps();
        assert.verifySteps([
            "event: openSteps",
            "event: calculateScore",
            "event: showSteps"
        ], 'showSteps');

        part.hideSteps();
        assert.verifySteps([
            "event: hideSteps"
        ], 'hideSteps');

        done();

        part_def = {
            type: 'numberentry',
            minvalue: '1',
            maxvalue: '1',
            marks: 1,
            customMarkingAlgorithm: `
pre_submit:
    []
            `,
            extendBaseMarkingAlgorithm: true
        }

        part = createPartFromJSON(part_def);

        part.storeAnswer('1');

        var done = capture_signals(assert, part);
        part.submit();

        assert.verifySteps([
            "event: pre-submit",
            "event: setDirty",
            "event: pre-markAdaptive",
            "event: markAgainstScope",
            "event: mark_alternative",
            "event: pre-mark",
            "event: pre-mark_answer",
            "event: do_pre_submit_tasks",
            "event: waiting_for_pre_submit"
        ], 'submit a part with pre-submit tasks');

        await part.waiting_for_pre_submit;
        assert.verifySteps([
            "event: pre-submit",
            "event: setDirty",
            "event: pre-markAdaptive",
            "event: markAgainstScope",
            "event: mark_alternative",
            "event: pre-mark",
            "event: pre-mark_answer",
            "event: do_pre_submit_tasks",
            "event: post-mark_answer",
            "event: setCredit",
            "event: post-mark",
            "event: post-markAdaptive",
            "event: calculateScore",
            "event: markingComment",
            "event: post-submit",
            "event: completed_pre_submit"
        ], 'once pre-submit tasks are done');

        done();

        part_def = {
            type: 'numberentry',
            minvalue: '1',
            maxvalue: '1',
            marks: 1,
            customMarkingAlgorithm: `
mark:
    set_credit(1,"set");
    multiply_credit(0.5,"mult");
    add_credit(0.1,"add")
    sub_credit(0.1,"sub")
            `,
            extendBaseMarkingAlgorithm: true
        }

        part = createPartFromJSON(part_def);

        part.storeAnswer('1');

        var done = capture_signals(assert, part);

        part.submit();
        assert.verifySteps([
            "event: pre-submit",
            "event: setDirty",
            "event: pre-markAdaptive",
            "event: markAgainstScope",
            "event: mark_alternative",
            "event: pre-mark",
            "event: pre-mark_answer",
            "event: do_pre_submit_tasks",
            "event: post-mark_answer",
            "event: setCredit",
            "event: multCredit",
            "event: addCredit",
            "event: subCredit",
            "event: post-mark",
            "event: post-markAdaptive",
            "event: calculateScore",
            "event: markingComment",
            "event: post-submit"
        ]);

        done();
    });

    QUnit.module('Part unit tests');
    unit_test_questions.forEach(function(data) {
        var name = data.name;
        QUnit.test(name, async function(assert) {
            var done = assert.async();
            var q = Numbas.createQuestionFromJSON(data);
            q.generateVariables();
            q.signals.on('ready', function() {
                q.allParts().forEach(function(p) {
                    run_part_unit_tests(assert, p);
                });
                done();
            }).catch(function(e) {
                console.log(e);
                throw(e);
            });
        });
    });

    QUnit.module('Exams');
    pipwerks.SCORM.API.getHandle = function() {
        var API = pipwerks.SCORM.API;
        return API.get();
    }
    pipwerks.SCORM.API.get = function() {
        var API = pipwerks.SCORM.API.find(window);
        if(API) {
            pipwerks.SCORM.API.isFound = true;
        }
        return API;
    }
    QUnit.test('Resume an exam',async function(assert) {
        var done = assert.async();
        var exam_def = { 
            name: "Exam", 
            question_groups: [
                {
                    questions: [
                        {
                            name: "Q",
                            variables: {
                                x: {
                                    name: "x",
                                    definition: "random(1..100#0)",
                                    description: "A random number between 1 and 100",
                                    templateType: "anything"
                                }
                            }
                        }
                    ]
                }
            ]
        };
        const [run1,run2] = await with_scorm( 
            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
                const q = e.questionList[0];
                return q.scope.variables;
            },

            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.load();
                await e.signals.on('ready');
                const q = e.questionList[0];
                return q.scope.variables;
            }
        );

        assert.ok(Numbas.util.eq(run1.x, run2.x), `Variable x has the same value`);
        done();
    });
    QUnit.test('Resume an exam',async function(assert) {
        var done = assert.async();
        var exam_def = { 
            name: "Exam", 
            question_groups: [
                {
                    questions: [
                        {
                            name: "Q",
                            variables: {
                                x: {
                                    name: "x",
                                    definition: "random(1..100#0)",
                                    description: "A random number between 1 and 100",
                                    templateType: "anything"
                                }
                            }
                        }
                    ]
                }
            ]
        };
        const run1 = await with_scorm(
            async function(data, results, scorm) {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
                e.begin();
                e.tryEnd();
                assert.equal(scorm.GetValue('cmi.completion_status'), 'completed', 'attempt is completed');
            },
        );

        done();
    });

    QUnit.test('Resume an explore mode exam', async function(assert) {
        var done = assert.async();

        const exam_def = {
            name: "Explore mode exam",
            question_groups: [
                {
                    questions: [
                        {
                            name: "Explore mode: one link",
                            variables: {
                                a: {
                                    name: "a",
                                    definition: "5",
                                }
                            },
                            parts: [
                                {
                                    type:"information",
                                    useCustomName:true,
                                    customName:"Beginning",
                                    nextParts: [
                                        {
                                            label:"Step 2",
                                            rawLabel:"",
                                            otherPart:1,
                                            variableReplacements:[
                                                { variable: "a", definition: "6" }
                                            ],
                                            lockAfterLeaving:false
                                        }
                                    ],
                                },
                                {
                                    type:"information",
                                    useCustomName:true,
                                    customName:"Step 2",
                                }
                            ],
                            partsMode:"explore",
                        }
                    ]
                }
            ]
        };

        const [run1,run2] = await with_scorm(
            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
                const q = e.questionList[0];
                assert.equal(Numbas.jme.display.treeToJME({tok:q.currentPart.getScope().getVariable('a')}),'5','a = 5 initially');
                q.currentPart.makeNextPart(q.currentPart.nextParts[0]);
            },

            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.load();
                await e.signals.on('ready');
                const q = e.questionList[0];
                assert.equal(q.parts.length,2);
                assert.equal(q.currentPart.name,'Step 2');
                assert.equal(Numbas.jme.display.treeToJME({tok:q.currentPart.getScope().getVariable('a')}),'6','Variable a value is replaced');
            }
        );

        done();
    });

    QUnit.test('Resume and mark a 1_n_2 part correctly', async function(assert) {
        // See https://github.com/numbas/Numbas/issues/961
        
        assert.expect(2);
        const done = assert.async();

        const exam_def = {
            name: "Exam",
            question_groups: [
                {
                    questions: [
                        {
                            name: "Q",
                            parts: [{type:'1_n_2', choices: ['a','b','c','d','e','f'], shuffleChoices: true, matrix: [[1],[0],[0],[0],[0],[0]]}],
                        }
                    ]
                }
            ]
        };

        const [run1,run2] = await with_scorm(
            async function(data, results, scorm) {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
                const q = e.questionList[0];
                const p = q.getPart('p0');
                p.storeAnswer(p.shuffleAnswers.map((_,i) => [i==0]));
                await submit_part(p);
                return p.credit;
            },

            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.load();
                await e.signals.on('ready');
                const q = e.questionList[0];
                const p = q.getPart('p0');
                return p.credit;
            }
        );

        assert.equal(run1, 1, 'Marked correct in fresh attempt');
        assert.equal(run2, 1, 'Marked correct in restored attempt');

        done();
    });


    QUnit.test('Only save random variables',async function(assert) {
        var done = assert.async();

        var exam_def = {
            name: "Exam", 
            extensions: [ "test_deterministic_variables" ],
            question_groups: [
                {
                    questions: [
                        {
                            name: "Q",
                            extensions: [ "test_deterministic_variables" ],
                            variables: {
                                A: {
                                    name: "A",
                                    definition: "5",
                                },
                                B: {
                                    name: "B",
                                    definition: "random(a..2a#0)",
                                },
                                c: {
                                    name: "c",
                                    definition: "2b",
                                },
                                d: {
                                    name: "d",
                                    definition: "random(1..c)",
                                },
                                e: {
                                    name: "e",
                                    definition: "gcd(d,a)",
                                },
                                f: {
                                    name: "f",
                                    definition: "'Number {e}'",
                                },
                                g: {
                                    name: "g",
                                    definition: "'Number {random(a,b,c)}'",
                                },
                                h: {
                                    name: "h",
                                    definition: "fn()"
                                },
                                i: {
                                    name: "i",
                                    definition: "fn2()"
                                },
                                j: {
                                    name: "j",
                                    definition: "fn3()"
                                },
                                k: {
                                    name: "k",
                                    definition: "fn4()"
                                }
                            },
                            functions: {
                                fn: { 
                                    parameters: [],
                                    type: "number",
                                    language: "jme",
                                    definition: "random(1..5)"
                                }
                            }
                        }
                    ]
                }
            ]
        };

        Numbas.addExtension('test_deterministic_variables', ['jme'], function(ext) {
            ext.scope.addFunction(new Numbas.jme.funcObj('fn2',[], Numbas.jme.types.TNum, function() {
                return Math.random();
            }, {random: true}));
            ext.scope.addFunction(new Numbas.jme.funcObj('fn3',[], Numbas.jme.types.TNum, function() {
                return 5;
            }, {random: false}));
            ext.scope.addFunction(new Numbas.jme.funcObj('fn4',[], Numbas.jme.types.TNum, function() {
                return 5;
            }));
        });

        const [run1,run2] = await with_scorm(
            async function() {
                Numbas.activateExtension('test_deterministic_variables');
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
                const q = e.questionList[0];
                return q.scope.variables;
            },

            async function() {
                var suspend = Numbas.store.load();
                var qobj = suspend.questions[0];
                assert.deepEqual(Object.keys(qobj.variables),['b','d','g','h','i','k'], 'Only non-deterministic variables are saved')
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.load();
                await e.signals.on('ready');
                const q = e.questionList[0];
                return q.scope.variables;
            }
        );

        ['a','b','c'].forEach(function(name) {
            var v1 = run1[name];
            var v2 = run2[name];
            assert.ok(v2 !== undefined, `Variable ${name} is defined`)
            assert.ok(Numbas.util.eq(run1[name], run2[name]), `Variable ${name} has the same value`);
        });

        done();
    });

    QUnit.test('Resume custom constants', async function(assert) {
        // See https://github.com/numbas/Numbas/issues/961
        
        assert.expect(2);
        const done = assert.async();

        const exam_def = {
            name: "Exam",
            question_groups: [
                {
                    questions: [
                        {
                            name: "Q",
                            variables: {
                                'a': {
                                    name: 'a',
                                    definition: 'random(2..5)*imj'
                                },
                                'b': {
                                    name: 'b',
                                    definition: 'conj(a)'
                                }
                            },
                            constants: [
                                {name: 'imj', tex: 'j', value: 'sqrt(-1)'}
                            ]
                        }
                    ]
                }
            ]
        };

        const [run1,run2] = await with_scorm(
            async function(data, results, scorm) {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
                return true;
            },

            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.load();
                await e.signals.on('ready');
                return true;
            }
        );

        assert.ok(run1, 'Fresh attempt starts OK');
        assert.ok(run2, 'Attempt resumes OK');

        done();
    });


    QUnit.test('Resume floating-point values', async function(assert) {
        // See https://github.com/numbas/Numbas/issues/998
        assert.expect(4);
        const done = assert.async();

        const exam_def = {
            name: "Exam",
            question_groups: [
                {
                    questions: [
                        {
                            name: "Q",
                            variables: {
                                'a': {
                                    name: 'a',
                                    definition: 'random(0.2..0.4#0.01)'
                                },
                                'b': {
                                    name: 'b',
                                    definition: 'random(0.2 + 0.01)'
                                },
                                'c': {
                                    name: 'c',
                                    definition: '0.2 + 0.01'
                                },
                                'd': {
                                    name: 'd',
                                    definition: '2 - random(3)i'
                                }
                            },
                            variablesTest: {
                                condition: 'isclose(a,0.3)',
                                maxRuns: 1000
                            }
                        }
                    ]
                }
            ]
        };

        const [run1,run2] = await with_scorm(
            async function(data, results, scorm) {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
                return true;
            },

            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.load();
                await e.signals.on('ready');
                const q = e.questionList[0];
                const a = q.scope.getVariable('a');
                const b = q.scope.getVariable('b');
                const c = q.scope.getVariable('c');
                const d = q.scope.getVariable('d');
                assert.equal(Numbas.jme.display.treeToJME({tok: a}, {}, q.scope),'0.3');
                assert.equal(Numbas.jme.display.treeToJME({tok: b}, {}, q.scope),'0.21');
                assert.equal(Numbas.jme.display.treeToJME({tok: c}, {}, q.scope),'0.21');
                assert.equal(Numbas.jme.display.treeToJME({tok: d}, {}, q.scope),'2 - 3i');

                return true;
            }
        );

        done();
    });
    
    const yes_no_type = {
        "yes-no": {
            "input_widget": "radios",
            "input_options": {
                "correctAnswer": "if(eval(settings[\"correct_answer_expr\"]), 0, 1)", 
                "hint": {"static": true, "value": ""}, 
            }, 
            "marking_script": "mark:\nif(studentanswer=correct_answer,\n  correct(),\n  incorrect()\n)\n\ninterpreted_answer:\nstudentAnswer=0\n\ncorrect_answer:\nif(eval(settings[\"correct_answer_expr\"]),0,1)", 
            "settings": 
            [
                {
                    "name": "correct_answer_expr", 
                    "input_type": "mathematical_expression", 
            }],
            "extensions": []
        }
    }

    const containing_letter_type = {
        "containing-letter": {
            "input_widget": "string",
            "input_options": {
                "correctAnswer": "settings[\"req_letter\"]",
                "hint": { "static": true, "value": "" },
            },
            "marking_script": "mark:\ncorrectif(settings[\"req_letter\"] in interpreted_answer)\n\ninterpreted_answer:\nlower(studentanswer)",
            "settings": [{
                "name": "req_letter",
                "input_type": "string",
            }],
            "extensions": []
        }
    }

    const containing_letters_type = {
        "containing-letters" : {
            "input_widget": "string",
            "input_options": {
                "correctAnswer": "settings[\"req_letters\"]",
                "hint": { "static": true, "value": "" },
            },
            "marking_script": "mark:\ncorrectif(all(map(letter in interpreted_answer,letter,split_letters)))\n\ninterpreted_answer:\nlower(studentanswer)\n\nsplit_letters:\nsplit(lower(settings[\"req_letters\"]),\"\")",
            "settings": [{
                "name": "req_letters",
                "input_type": "string",
            }],
            "extensions": []
        }
    }

    QUnit.test('Yes-no custom part type marked', async function(assert) {
        run_with_part_type(yes_no_type,async function() {
            let p = createPartFromJSON({
                "type": "yes-no",
                "settings": { "correct_answer_expr": "true" }
            });
            var res = await mark_part(p,1);
            assert.equal(res.credit,0,'"No" incorrect'); 
            var res = await mark_part(p,0);
            assert.equal(res.credit,1,'"Yes" correct');
        });
    });

    QUnit.test('Contains-letter custom part type marked', async function(assert) {
        run_with_part_type(containing_letter_type,async function() {
            let p = createPartFromJSON({
                "type": "containing-letter",
                "settings": { "req_letter": "a" }
            });
            var res = await mark_part(p,"lemon");
            assert.equal(res.credit,0,'String not containing "a" is incorrect'); 
            var res = await mark_part(p,"catapult");
            assert.equal(res.credit,1,'String containing "a" is correct');
        });
    });

    QUnit.test('Custom part type with additional marking notes marked', async function(assert) {
        run_with_part_type(containing_letters_type,async function() {
            let p = createPartFromJSON({
                "type": "containing-letters",
                "settings": { "req_letters": "abcd" }
            });
            var res = await mark_part(p,"lemon");
            assert.equal(res.credit,0,'String not containing any required letters is incorrect'); 
            var res = await mark_part(p,"a bed");
            assert.equal(res.credit,0,'String not containing "c" is incorrect'); 
            var res = await mark_part(p,"dark abacus");
            assert.equal(res.credit,1,'String containing all required letters is correct');
        });
    });


    QUnit.test('Resume custom part',async function(assert) {
        run_with_part_type(yes_no_type,async function() {
            var done = assert.async();
            var exam_def = { 
                name: "Exam", 
                question_groups: [
                    {
                        questions: [
                            {                        
                                parts: [
                                {
                                    "type": "yes-no",
                                    "settings": { "correct_answer_expr": "true" }
                                }
                            ]}
                        ]
                    }
                ]
            };
            const [run1,run2,run3] = await with_scorm(
                async function() {
                    var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                    e.init();
                    await e.signals.on('ready');
                    const q = e.questionList[0];
                    const p = q.getPart('p0');
                    p.storeAnswer("0");
                    await submit_part(p);
                    return p.credit;
                },

                async function() {
                    var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                    e.load();
                    await e.signals.on('ready');
                    const q = e.questionList[0];
                    const p = q.getPart('p0');
                    return p.credit;
                },

                
                async function() {
                    var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                    e.load();
                    await e.signals.on('ready');
                    const q = e.questionList[0];
                    const p = q.getPart('p0');
                    p.storeAnswer("1");
                    await submit_part(p);
                    return p.credit;
                }
            );

            assert.ok(true, `No errors in exam generation`);
            assert.equal(run1, 1, 'Marked correct in fresh attempt');
            assert.equal(run2, 1, 'Marked correct in restored attempt');
            assert.equal(run3, 0, 'Marked incorrect in altered attempt');

            done();
        });
    });


    QUnit.test('Resume string based custom part',async function(assert) {
        run_with_part_type(containing_letters_type,async function() {
            var done = assert.async();
            var exam_def = { 
                name: "Exam", 
                question_groups: [
                    {
                        questions: [
                            {                        
                                parts: [
                                {
                                    "type": "containing-letters",
                                    "settings": { "req_letters": "abcd" }
                                }
                            ]}
                        ]
                    }
                ]
            };
            const [run1,run2] = await with_scorm(
                async function() {
                    var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                    e.init();
                    await e.signals.on('ready');
                    const q = e.questionList[0];
                    const p = q.getPart('p0');
                    p.storeAnswer("dark abacus");
                    await submit_part(p);
                    return p.credit;
                },

                async function() {
                    var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                    e.load();
                    await e.signals.on('ready');
                    const q = e.questionList[0];
                    const p = q.getPart('p0');
                    return p.credit;
                },
            );

            assert.ok(true, `No errors in exam generation`);
            assert.equal(run1, 1, 'Marked correct in fresh attempt');
            assert.equal(run2, 1, 'Marked correct in restored attempt');

            done();
        });
    });

    QUnit.test('Resume diagnostic mode', async function(assert) {
        const done = assert.async();

        const exam_def = {
            name: 'exam',
            navigation: {
                navigateMode: 'diagnostic',
            },
            diagnostic: {
                script: 'custom',
                customScript: `
state: 1

first_topic: "group 1"

first_question: topics[first_topic]["questions"][0]

progress: []

feedback: ""

after_exam_ended: state

next_actions: 
    [
        "feedback": "",
        "actions": [
            [ "label": "", "state": state, "next_question": topics[current_topic]["questions"][0] ],
            [ "label": "", "state": state, "next_question": topics[current_topic]["questions"][0] ]
        ]
    ]
                `,
                knowledge_graph: {
                    learning_objectives: [
                        { name: 'LO 1' }
                    ],
                    topics: [
                        {
                            name: 'group 1',
                            learning_objectives: ['LO 1'],
                        }
                    ]
                }
            },
            question_groups: [
                {
                    name: 'group 1',
                    questions: [
                        {
                            name: 'Q1',
                            parts: [{type:'numberentry',minvalue:'1',maxvalue:'1',marks:1}]
                        }
                    ]
                }
            ]
        };

        const [run1, run2] = await with_scorm(
            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.init();
                await e.signals.on('ready');
            },
            async function() {
                var e = Numbas.createExamFromJSON(exam_def,Numbas.store,false);
                e.load();
                await e.signals.on('ready');
            }
        );

        assert.ok(true, `No errors in exam generation`);

        done();
    });

});
