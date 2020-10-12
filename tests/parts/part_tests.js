Numbas.queueScript('base',[],function() {});
Numbas.queueScript('go',['json','jme','localisation','parts/numberentry','parts/jme','parts/matrixentry', 'parts/multipleresponse', 'parts/patternmatch','parts/gapfill','question'],function() {
    let jme = Numbas.jme;
    let math = Numbas.math;

    var createPartFromJSON = function(data){ return Numbas.createPartFromJSON(data, 'p0', null, null); };

    function mark_part(p, answer, scope) {
        var answer = answer;
        scope = scope || p.getScope();
        p.storeAnswer(answer);
        p.setStudentAnswer();
        return p.mark(scope).finalised_result;
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

    function question_test(name,data,test_fn,error_fn) {
        QUnit.test(name, function(assert) {
            var done = assert.async();
            var q = Numbas.createQuestionFromJSON(data);
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

    QUnit.module('Part')
    QUnit.test('Set marks', function(assert) {
        var p = createPartFromJSON({type:'numberentry', marks: 3, minValue: '1', maxValue: '2'});
        assert.equal(p.marks,3,'3 marks');
    });

    QUnit.module('Custom marking JavaScript');
    QUnit.test('set credit to 1', function(assert) {
        var data = {"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{"mark":{"script":"this.setCredit(1,\"Top marks!\");\nthis.answered = true;","order":"instead"}},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"};

        var p = createPartFromJSON(data);

        var res = mark_part(p,'1');
        assert.ok(p.answered,'Part is answerd');
        assert.equal(p.credit,1,'1 credit');
        assert.equal(p.markingFeedback[0].message,"Top marks!\n\nYou were awarded <strong>1</strong> mark.", 'Feedback message is "Top marks!" as set in script');
    });

    QUnit.module('Stateful scope');
    QUnit.test('nested calls in a stateful scope retain scope', function(assert) {
        var scope = new Numbas.marking.StatefulScope(Numbas.jme.builtinScope);
        scope.evaluate('feedback("Hi");try(correctif(x),y,1);2');
        assert.equal(scope.state.length,1,"Feedback message is not lost when try evaluates the catch clause");
    });

    QUnit.module('Number entry');
    QUnit.test('Answer is 1', function(assert) {
        var p = createPartFromJSON({type:'numberentry', marks: 1, minValue: '1', maxValue: '1'});
        var res;
        res = mark_part(p, '1');
        assert.equal(res.credit,1,'"1" marked correct');

        res = mark_part(p, '0');
        assert.equal(res.credit,0,'"0" marked incorrect');

        res = mark_part(p, '!');
        assert.equal(res.credit,0,'"!" marked incorrect');
        assert.notOk(res.valid,'"!" is invalid');
    });
    QUnit.test('Partial credit for wrong precision', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp', precisionPartialCredit: 20});
        var res = mark_part(p,'0.1000');
        assert.equal(res.credit,0.2,'"0.1000" gets partial credit');
    });
    QUnit.test('Answer is 1/3, fractions not allowed', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3'});
        var res = mark_part(p,'1/3');
        assert.equal(res.credit,0,'"1/3": No credit awarded');
        assert.notOk(res.valid,'"1/3": Not valid');
    });
    QUnit.test('Answer is 1/3, fractions allowed', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', allowFractions: true});
        var res = mark_part(p,'1/3');
        assert.equal(res.credit,1,'"1/3" correct');
    });
    QUnit.test('Answer is 1/3, fraction must be reduced', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', allowFractions: true, mustBeReduced: true, mustBeReducedPC: 50});
        var res = mark_part(p,'1/3');
        assert.equal(res.credit,1,'"1/3" correct');
        var res = mark_part(p,'2/6');
        assert.equal(res.credit,0.5,'"2/6" gets penalty');
        assert.ok(contains_note(res,{note:'cancelled',factor:0.5,op:'multiply_credit'}));
    });
    QUnit.test('Answer is 1/3, to 2 dp', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1/3', maxValue: '1/3', precision: '2', precisionType: 'dp'});
        var res = mark_part(p,'0.33');
        assert.equal(res.credit,1,'"0.33" correct');
        var res = mark_part(p,'0.330');
        assert.equal(res.credit,0,'"0.330" incorrect');
    });
    QUnit.test('Answer is 0.1, to 2 dp', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp'});
        var res = mark_part(p,'0.1');
        assert.equal(res.credit,1,'"0.1" correct');
        var res = mark_part(p,'0.10');
        assert.equal(res.credit,1,'"0.10" correct');
        var res = mark_part(p,'0.100');
        assert.equal(res.credit,0,'"0.100" incorrect');
    });
    QUnit.test('Answer is 0.1, to 2 dp, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '0.1', maxValue: '0.1', precision: '2', precisionType: 'dp', strictPrecision: true});
        var res = mark_part(p,'0.1');
        assert.equal(res.credit,0,'"0.1" incorrect');
    });
    QUnit.test('Answer is 1.22, to 1 dp, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.22', maxValue: '1.22', precision: '1', precisionType: 'dp', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'1.20');
        assert.equal(res.credit,0,'"1.20" incorrect');
        var res = mark_part(p,'1.22');
        assert.equal(res.credit,0.5,'"1.22" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'1.2');
        assert.equal(res.credit,1,'"1.2" correct');
    });
    QUnit.test('Answer is 1.27, to 1 dp, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.27', maxValue: '1.27', precision: '1', precisionType: 'dp', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'1.27');
        assert.equal(res.credit,0.5,'"1.27" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'1.3');
        assert.equal(res.credit,1,'"1.3" correct');
    });
    QUnit.test('Answer is 1.27, to 2 sf, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '1.27', maxValue: '1.27', precision: '2', precisionType: 'sigfig', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'1.27');
        assert.equal(res.credit,0.5,'"1.27" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'1.3');
        assert.equal(res.credit,1,'"1.3" correct');
    });
    QUnit.test('Answer is 12700, to 2 sf, strict', function(assert) {
        var p = createPartFromJSON({type:'numberentry', minValue: '12700', maxValue: '12700', precision: '2', precisionType: 'sigfig', strictPrecision: true, precisionPartialCredit: 50});
        var res = mark_part(p,'12700');
        assert.equal(res.credit,0.5,'"12700" correct but penalty');
        assert.ok(contains_note(res,{note:'correctprecision',factor:0.5,op:'multiply_credit'}));
        var res = mark_part(p,'13000');
        assert.equal(res.credit,1,'"13000" correct');
    });

    QUnit.test('Don\'t mark infinity correct', function(assert) {
        var p = createPartFromJSON({"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","adaptiveMarkingPenalty":0,"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"});
        var res = mark_part(p,'1');
        assert.equal(res.credit,1,'"1" is correct');
        var res = mark_part(p,'infinity');
        assert.equal(res.credit,0,'"infinity" is incorrect');
    });

    QUnit.module('JME')
    QUnit.test('Answer is "x+2"', function(assert) {
        var p = createPartFromJSON({type:'jme', answer: 'x+2'});
        var res = mark_part(p,'x+2');
        assert.equal(res.credit,1,'"x+2" correct');
        var res = mark_part(p,'2+x');
        assert.equal(res.credit,1,'"2+x" correct');
        var res = mark_part(p,'2');
        assert.equal(res.credit,0,'"2" incorrect');
        var res = mark_part(p,'!');
        assert.notOk(res.valid,'"!" invalid');
        var res = mark_part(p,'');
        assert.notOk(res.valid,'"" invalid');
    });
    QUnit.test('Answer that can\'t be evaluated', function(assert) {
        var data = {"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x^2+x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[],"musthave":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"didn't use ("},"notallowed":{"strings":["^"],"showStrings":false,"partialCredit":0,"message":"did use ^"}};
        var p = createPartFromJSON(data);
        var res = mark_part(p,'x(x+1)');
        assert.notOk(res.valid,"x(x+1) not valid");
        var expectedFeedback = [{"op":"warning","message":"Your answer is not a valid mathematical expression.<br/>Function <code>x</code> is not defined. Is <code>x</code> a variable, and did you mean <code>x*(...)</code>?.","note":"agree"},{"op":"set_credit","credit":0,"message":"Your answer is not a valid mathematical expression.<br/>Function <code>x</code> is not defined. Is <code>x</code> a variable, and did you mean <code>x*(...)</code>?.","reason":"invalid","note":"agree"}];
        assert.deepEqual(res.states, expectedFeedback,"Warning message doesn't mention note name");
    });

    QUnit.test('Case mismatch in a formula', function(assert) {
        var data = {"type":"jme","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"answer":"x=(y-B)/A","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"singleLetterVariables":false,"allowUnknownFunctions":true,"implicitFunctionComposition":false,"valuegenerators":[{"name":"a","value":""},{"name":"b","value":""},{"name":"x","value":""},{"name":"y","value":""}]};
        var p = createPartFromJSON(data);
        var res = mark_part(p,'x=(y-b)/a');
        assert.equal(res.credit,1,"x=(y-b)/a correct");
    });

    QUnit.test('Student doesn\'t use all the variables in the correct answer', function(assert) {
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
        var res = mark_part(p,'x');
        assert.ok(res.valid,"x is valid");
        var expectedFeedback = [
            {
                "op": "set_credit",
                "credit": 1,
                "reason": "correct",
                "message": "Your answer is numerically correct.",
                "note": "numericallycorrect"
            },
            {
                "op": "multiply_credit",
                "factor": 0.5,
                "message": "Pattern",
                "note": "failmatchpattern"
            }
        ];
        assert.deepEqual(res.states, expectedFeedback,"x is marked correct");
    });

    question_test('Variables defined by the question aren\'t used in evaluating student\'s expression',
        {"name":"scope used when evaluating JME","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"a":{"name":"a","group":"Ungrouped variables","definition":"[1,2,3]","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["a"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write $2a$</p>","answer":"2a","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}]},
        function(assert,q) {
            var p = q.getPart('p0');
            p.storeAnswer('2a');
            q.submit();

            assert.equal(q.score,1,'Score is 1');
        }
    );

    QUnit.module('Pattern match');
    QUnit.test('Answer is "hi+"', function(assert) {
        var p = createPartFromJSON({type:'patternmatch', answer: 'hi+', displayAnswer: 'hi'});
        var res = mark_part(p,'hi');
        assert.equal(res.credit,1,'"hi" correct');
        var res = mark_part(p,'hiiiiii');
        assert.equal(res.credit,1,'"hiiiiii" correct');
        var res = mark_part(p,'h');
        assert.equal(res.credit,0,'"h" incorrect');
        var res = mark_part(p,'???');
        assert.equal(res.credit,0,'"???" incorrect');
        assert.ok(res.valid,'"???" valid');
    });

    QUnit.module('Matrix entry');
    QUnit.test('Answer is id(2)', function(assert) {
        var p = createPartFromJSON({type:'matrix', correctAnswer: 'id(2)'});
        var res = mark_part(p,matrix([['1','0'],['0','1']]));
        assert.equal(res.credit,1,'[[1,0],[0,1]] is correct');
        var res = mark_part(p,matrix([['1','1'],['0','1']]));
        assert.equal(res.credit,0,'[[1,1],[0,1]] is incorrect');
        var res = mark_part(p,matrix([['1','0','0'],['0','1','0'],['0','0','0']]));
        assert.equal(res.credit,0,'[[1,0,0],[0,1,0],[0,0,0]] is incorrect');
        assert.ok(res.states.filter(function(s){return s.note=='wrong_size' && s.credit==0}).length>0, '[[1,0,0],[0,1,0],[0,0,0]] fails because wrong size');
    });
    QUnit.test('Fractions', function(assert) {
        var p = createPartFromJSON({type:'matrix',correctAnswer:'id(2)/2', allowFractions: true});
        var res = mark_part(p,matrix([['1/2','0'],['0','1/2']]));
        assert.equal(res.credit,1,'fractions marked correct');
    });
    QUnit.test('Rounding', function(assert) {
        var p = createPartFromJSON({type:'matrix',correctAnswer:'matrix([1.222,1.227],[3,4])', allowFractions: true, precisionType: 'dp', precision: 2, precisionPartialCredit: 50});
        var res = mark_part(p,matrix([['1.22','1.23'],['3.00','4.00']]));
        assert.equal(res.credit,1,'[[1.22,1.23],[3.00,4.00]] correct');
        var res = mark_part(p,matrix([['1.222','1.227'],['3.000','4.000']]));
        assert.equal(res.credit,0.5,'[[1.222,1.227],[3.000,4.000]] partially correct');
        var res = mark_part(p,matrix([['1.222','1.227'],['3.00','4.00']]));
        assert.ok(contains_note(res,{note:'all_same_precision',message: R('part.matrix.not all cells same precision')}),'not all cells same precision warning');
    });


    question_test(
        'Note name used both for question variable and marking note',
        {"name":"wrong size matrix","tags":[],"metadata":{"description":"","licence":"Creative Commons Attribution 4.0 International"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"rows":{"name":"rows","group":"Ungrouped variables","definition":"4","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["rows"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"\n<p>[[0]]</p>","gaps":[{"type":"matrix","marks":"4","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"correctAnswer":"matrix([1,0,3,3,1],[0,1,4,4,2],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0])","correctAnswerFractions":true,"numRows":"6","numColumns":"5","allowResize":true,"tolerance":0,"markPerCell":false,"allowFractions":true}],"sortAnswers":false}]},
        function(assert,q) {
            var g = q.getPart('p0g0');
            g.storeAnswer(matrix([['2','0'],['0','1']]));
            var p = q.getPart('p0');
            p.submit();
            assert.ok(p.answered,'can submit a smaller matrix than expected');
        }
    );

    QUnit.module('Choose one from a list');
    QUnit.test('Three choices, first answer is correct', function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: [[1],[0],[0]]});
        var res = mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,1,'Picking first choice is correct');
        var res = mark_part(p, [[false], [true], [false]]);
        assert.equal(res.credit,0,'Picking second choice is incorrect');
    })
    QUnit.test('Three choices, third answer is correct', function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: [[0],[0],[1]]});
        var res = mark_part(p, [[false], [false], [true]]);
        assert.equal(res.credit,1,'Picking third choice is correct');
        var res = mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,0,'Picking first choice is incorrect');
    })
    QUnit.test('Three choices, first answer is correct, marking matrix is a JME expression', function(assert) {
        var p = createPartFromJSON({type:'1_n_2', choices: ['a','b','c'], matrix: '[1,0,0]'});
        var res = mark_part(p, [[true], [false], [false]]);
        assert.equal(res.credit,1,'Picking first choice is correct');
        var res = mark_part(p, [[false], [true], [false]]);
        assert.equal(res.credit,0,'Picking second choice is incorrect');
    })

    QUnit.module('Choose several from a list');
    QUnit.test('Two choices, both right', function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[1]]});
        var res = mark_part(p, [[true], [true]]);
        assert.equal(res.credit,1,'Picking both is correct');
        var res = mark_part(p, [[true], [false]]);
        assert.equal(res.credit,0.5,'Picking just one gives half credit');
    });
    QUnit.test('Two choices, minAnswers = 2', function(assert) {
        var p = createPartFromJSON({type:'m_n_2', choices: ['a','b'], matrix: [[1],[1]], minAnswers: 2});
        var res = mark_part(p, [[false], [true]]);
        assert.equal(res.credit,0,'Picking one is incorrect');
    });

    QUnit.module('Match choices with answers');
    QUnit.test('Marking matrix is id(2)', function(assert) {
        var p = createPartFromJSON({type:'m_n_x', choices: ['a','b'], answers: ['A','B'], matrix: [[1,0],[0,1]]});
        var res = mark_part(p, [[true,false],[false,true]]);
        assert.equal(res.credit,1,'Picking correct options gives 1 credit');
        var res = mark_part(p, [[true,true],[true,true]]);
        assert.equal(res.credit,1,'Picking all options gives 1 credit');
    });
    QUnit.test('Marking matrix is id(2) with -5 for wrong choice', function(assert) {
        var p = createPartFromJSON({type:'m_n_x', choices: ['a','b'], answers: ['A','B'], matrix: [[1,-5],[-5,1]]});
        var res = mark_part(p, [[true,false],[false,true]]);
        assert.equal(res.credit,1,'Picking correct options gives 1 credit');
        var res = mark_part(p, [[true,true],[true,true]]);
        p.calculateScore();
        assert.equal(p.credit,0,'Picking all options gives 0 credit');
    });

    QUnit.module('Gapfill');
    QUnit.test('One JME gap with answer "x+2"', function(assert) {
        var p = createPartFromJSON({type:'gapfill', gaps: [{type: 'jme', answer: 'x+2'}]});
        var scope = p.getScope();
        scope.question = {getPart: function(path){ return p.gaps.filter(function(p){return p.path==path})[0]; }};
        var res = mark_part(p,['x+2'],scope);
        assert.equal(res.credit,1,'"x+2" correct');
    });

    question_test(
        'One JME gap with string restrictions',
        {"name":"string restriction in gapfill JME part","tags":[],"metadata":{"description":"","licence":"Creative Commons Attribution 4.0 International"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"gapfill","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>x^2+x</p>\n<p>[[0]]</p>","gaps":[{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x^2+x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[],"musthave":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"didn't use ("},"notallowed":{"strings":["^"],"showStrings":false,"partialCredit":0,"message":"did use ^"}}]},{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"expectedVariableNames":[]}]},
        function(assert,q) {
            var p = q.getPart('p0');
            var res = mark_part(p,['x^2+x']);
            assert.ok(res.valid,"x^2+x is valid");
            assert.equal(res.credit,0,"x^2+x is incorrect");
            var res2 = mark_part(p,['x*(x+1)']);
            assert.equal(res2.credit,1,"x*(x+1) is correct");
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
        function(assert,q) {
            var p = q.getPart('p0');
            var res = mark_part(p,['1','2']);
            assert.equal(res.credit,1,"1,2 correct without sortAnswers");
            var res = mark_part(p,['2','1']);
            assert.equal(res.credit,0,"2,1 incorrect without sortAnswers");
            var p = q.getPart('p1');
            var res = mark_part(p,['1','2']);
            assert.equal(res.credit,1,"1,2 correct with sortAnswers");
            var res = mark_part(p,['2','1']);
            assert.equal(res.credit,1,"2,1 correct with sortAnswers");
        }
    );

    QUnit.test("Multiply credit in a gap",function(assert) {
        var data = {"type":"gapfill","useCustomName":false,"customName":"","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>[[0]]</p>\n<p>[[1]]</p>","gaps":[{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"25","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"sortAnswers":false};
        var p = createPartFromJSON(data);
        var scope = p.getScope();
        scope.question = {getPart: function(path){ return p.gaps.filter(function(p){return p.path==path})[0]; }};
        var res = mark_part(p,['1.20','1.20'],scope);
        assert.equal(res.credit,0.375,'apply penalty to both gaps');
        var res = mark_part(p,['1.2','1.20'],scope);
        assert.equal(res.credit,0.75,'apply 50% penalty to second gap');
        var res = mark_part(p,['1.20','1.2'],scope);
        assert.equal(res.credit,0.625,'apply 25% penalty to first gap');

        var data2 = {"type":"gapfill","useCustomName":false,"customName":"","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>[[0]]</p>\n<p>[[1]]</p>\n<p>[[2]]</p>","gaps":[{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"10","showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"minValue":"1.2","maxValue":"1.2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"1","precisionPartialCredit":"50","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"sortAnswers":false};
        var p2 = createPartFromJSON(data2);
        var scope = p2.getScope();
        scope.question = {getPart: function(path){ return p2.gaps.filter(function(g){return g.path==path})[0]; }};
        var res = mark_part(p2,['1.20','1.20','1.20'],scope);
        assert.equal(res.credit,0.5,'apply penalty to three gaps');
        assert.equal(p2.creditFraction.toFloat(),0.5,'part.creditFraction is 0.5 as well');
    });

    QUnit.module('Custom marking algorithms');
    question_test(
        'Error in mark note',
        {"name":"marking algorithm error display","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"jme","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"q:\n  a\n\nmark:\n  apply(z)","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":false,"singleLetterVariables":false,"allowUnknownFunctions":true,"implicitFunctionComposition":false,"valuegenerators":[{"name":"x","value":""}]}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        function(assert,q) {
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
        function(assert,q) {
            var p = q.getPart('p0');
            assert.ok(p,'Part created');
            p.storeAnswer('x+2');
            q.submit();

            assert.equal(q.name,'Barg');
            assert.equal(q.score,1,'Score is 1');
        }
    );

    question_test(
        "A big question",
        {"name":"Working on standalone part instances","tags":[],"metadata":{"description":"<p>Check that the&nbsp;MarkingScript reimplementations of the marking algorithms work properly.</p>","licence":"None specified"},"statement":"<p>Parts&nbsp;<strong>a</strong> to&nbsp;<strong>f</strong> use the standard marking algorithms.</p>","advice":"","rulesets":{},"extensions":[],"variables":{"m":{"name":"m","group":"Ungrouped variables","definition":"id(2)","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["m"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a number between 1 and 2</p>","minValue":"1","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"precisionType":"dp","precision":"2","precisionPartialCredit":0,"precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":false,"showPrecisionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"matrix","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a $2 \\times 2$ identity matrix.</p>","correctAnswer":"id(2)","correctAnswerFractions":false,"numRows":"2","numColumns":"2","allowResize":true,"tolerance":0,"markPerCell":true,"allowFractions":false,"precisionType":"dp","precision":0,"precisionPartialCredit":"40","precisionMessage":"You have not given your answer to the correct precision.","strictPrecision":true},{"type":"jme","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write $x$</p>","answer":"x","showPreview":true,"checkingType":"absdiff","checkingAccuracy":0.001,"failureRate":1,"vsetRangePoints":5,"vsetRange":[0,1],"checkVariableNames":true,"expectedVariableNames":["x"],"notallowed":{"strings":["("],"showStrings":false,"partialCredit":0,"message":"<p>No brackets!</p>"}},{"type":"patternmatch","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write \"a+\"</p>","answer":"a+","displayAnswer":"","caseSensitive":true,"partialCredit":"30","matchMode":"exact"},{"type":"1_n_2","marks":0,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Choose choice 1</p>","minMarks":0,"maxMarks":0,"shuffleChoices":false,"displayType":"radiogroup","displayColumns":0,"choices":["Choice 1","Choice 2","Choice 3"],"matrix":["1",0,"-1"],"distractors":["Choice 1 is good","Choice 2 is not great","Choice 3 is bad"]},{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[{"variable":"m","part":"p1","must_go_first":false}],"variableReplacementStrategy":"alwaysreplace","customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>What's&nbsp;the determinant of the matrix in part b?</p>","minValue":"det(m)","maxValue":"det(m)","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","marks":1,"showCorrectAnswer":true,"showFeedbackIcon":true,"scripts":{},"variableReplacements":[],"variableReplacementStrategy":"originalfirst","customMarkingAlgorithm":"q:\n  apply_marking_script(\"numberentry\",studentAnswer,settings+[\"minvalue\":4,\"maxvalue\":5],1)\n\nr:\n  apply_marking_script(\"numberentry\",studentAnswer,settings+[\"minvalue\":3,\"maxvalue\":4],1)\n\nmark:\n  feedback(\"number between 4 and 5\");\n  concat_feedback(q[\"mark\"][\"feedback\"],marks/2);\n  feedback(\"number between 3 and 4\");\n  concat_feedback(r[\"mark\"][\"feedback\"],marks/2)","extendBaseMarkingAlgorithm":true,"unitTests":[],"prompt":"<p>Write a number between 4 and 5, and between 3 and 4.</p>","minValue":"1","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}]},
        function(assert,q) {
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
        "Adaptive marking penalty",
        {"name":"adaptive marking penalty","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{"a":{"name":"a","group":"Ungrouped variables","definition":"1","description":"","templateType":"anything"}},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":["a"],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":false,"customName":"","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"minValue":"a","maxValue":"a","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":false,"customName":"","marks":"2","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[{"variable":"a","part":"p0","must_go_first":false}],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":"1","exploreObjective":null,"minValue":"a","maxValue":"a","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        function(assert,q) {
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
        function(assert,q,e) {
            assert.equal(e.originalMessage,'marking.script.error parsing notes','Error is "marking.script.error parsing notes"');
        }
    );

    QUnit.module('Explore mode');
    question_test(
        'One next part',
        {"name":"Explore mode: one link","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"information","useCustomName":true,"customName":"Beginning","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[{"label":"Step 2","rawLabel":"","otherPart":1,"variableReplacements":[],"availabilityCondition":"","penalty":"","penaltyAmount":0,"lockAfterLeaving":false}],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Step 2","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null}],"partsMode":"explore","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        function(assert,q) {
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
        function(assert,q) {
            var p = q.currentPart;
            assert.equal(p.getScope().getVariable('a').value,1);
            p.storeAnswer('2');
            p.submit();
            p.makeNextPart(p.nextParts[0]);
            var p2 = q.currentPart;
            assert.equal(p2.getScope().getVariable('a').value,2);
        }
    );

    question_test('Conditional availability of next parts',
        {"name":"Explore mode: conditional availability","tags":[],"metadata":{"descripton":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":true,"customName":"Enter a number","marks":1,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[{"label":"Always available","rawLabel":"","otherPart":1,"variableReplacements":[],"availabilityCondition":"","penalty":"","penaltyAmount":0,"lockAfterLeaving":false},{"label":"Available when wrong","rawLabel":"","otherPart":2,"variableReplacements":[],"availabilityCondition":"answered and credit<1","penalty":"","penaltyAmount":0,"lockAfterLeaving":false},{"label":"Available when correct","rawLabel":"","otherPart":3,"variableReplacements":[],"availabilityCondition":"answered and credit=1","penalty":"","penaltyAmount":0,"lockAfterLeaving":false},{"label":"Available when answered","rawLabel":"","otherPart":4,"variableReplacements":[],"availabilityCondition":"answered","penalty":"","penaltyAmount":0,"lockAfterLeaving":false}],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"information","useCustomName":true,"customName":"Always available","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Available when wrong","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Available when correct","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null},{"type":"information","useCustomName":true,"customName":"Available when answered","marks":0,"scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null}],"partsMode":"explore","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        function(assert,q) {
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
        function(assert,q) {
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
        function(assert,q) {
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
        'Expanding range of accepted answers',
        {"name":"Alternative answers: expanding range of accepted answers","tags":[],"metadata":{"description":"","licence":"None specified"},"statement":"","advice":"","rulesets":{},"extensions":[],"variables":{},"variablesTest":{"condition":"","maxRuns":100},"ungrouped_variables":[],"variable_groups":[],"functions":{},"preamble":{"js":"","css":""},"parts":[{"type":"numberentry","useCustomName":true,"customName":"1","marks":"5","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"showCorrectAnswer":true,"showFeedbackIcon":true,"variableReplacements":[],"variableReplacementStrategy":"originalfirst","nextParts":[],"suggestGoingBack":false,"adaptiveMarkingPenalty":0,"exploreObjective":null,"alternatives":[{"type":"numberentry","useCustomName":true,"customName":"0-2","marks":"4","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"alternativeFeedbackMessage":"","useAlternativeFeedback":false,"minValue":"0","maxValue":"2","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"},{"type":"numberentry","useCustomName":true,"customName":"0-3","marks":"3","scripts":{},"customMarkingAlgorithm":"","extendBaseMarkingAlgorithm":true,"unitTests":[],"alternativeFeedbackMessage":"","useAlternativeFeedback":false,"minValue":"0","maxValue":"3","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"minValue":"1","maxValue":"1","correctAnswerFraction":false,"allowFractions":false,"mustBeReduced":false,"mustBeReducedPC":0,"showFractionHint":true,"notationStyles":["plain","en","si-en"],"correctAnswerStyle":"plain"}],"partsMode":"all","maxMarks":0,"objectives":[],"penalties":[],"objectiveVisibility":"always","penaltyVisibility":"always"},
        function(assert,q) {
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
        function(assert,q) {
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

    QUnit.module('Part unit tests');
    unit_test_questions.forEach(function(data) {
        var name = data.name;
        QUnit.test(name, function(assert) {
            var done = assert.async();
            var q = Numbas.createQuestionFromJSON(data);
            q.generateVariables();
            q.signals.on('ready', function() {
                q.allParts().forEach(function(p) {
                    p.json.unitTests.forEach(function(test) {
                        p.storeAnswer(test.answer.value);
                        p.setStudentAnswer();
                        var res = p.mark_answer(p.rawStudentAnswerAsJME(),p.getScope());
                        assert.ok(res.state_valid.mark);
                        test.notes.forEach(function(note) {
                            assert.ok(res.states[note.name]!==undefined,'Note "'+note.name+'" exists');
                            var value = res.values[note.name];
                            var expectedValue = Numbas.jme.builtinScope.evaluate(note.expected.value);
                            var bothValues = expectedValue && value;
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

                        p.submit();
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
                    });
                });
                done();
            }).catch(function(e) {
                console.log(e);
                throw(e);
            });
        });
    });
});
