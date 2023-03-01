/*
Copyright 2022 Newcastle University
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
/** @file Functions related to the download and interpretation of student results, and interaction with the results page, usually for outside-LTI contexts. */
Numbas.queueScript('results', ['jme'], function () {


    /** Mathematical functions, providing stuff that the built-in `Math` object doesn't.
     *
     * @namespace Numbas.results */
    var results = Numbas.results = /** @lends Numbas.results */ {
        //var ensure_decimal = math.ensure_decimal = function(n) { ? We need them to be like this to ensure they're accessible from elsewhere, maybe.
        make_csv_row : function (cells) {
            return cells.map(Numbas.results.escape_csv_cell).join(',');
        },

        make_csv : function (rows) {
            return rows.map(Numbas.results.make_csv_row).join('\n');
        },
        
        get_exam_data : function() {
            let examObject = Numbas.exam;
            const exam = {};
            exam.details = {};
            exam.questions = {};
            exam.details.description = exam.xml.getAttribute('name')||"Exam";
            exam.details.studentMarks = examObject.score;
            exam.details.maxMarks = examObject.mark;
            let objectivesCount = sc.GetValue('cmi.objectives._count');
            for (let i = 0; i < objectivesCount; i++) {
                let questionKey = `question${i}`;
                let questionCmiName = `cmi.objectives.${i}`;
                let questionObject = exam.questions[questionKey] = {};
                questionObject.details = {};
                questionObject.parts = {}
                questionObject.details.studentMarks = sc.GetValue(`cmi.objectives.${i}.score.raw`);
                questionObject.details.maxMarks = sc.GetValue(`cmi.objectives.${i}.score.max`);
                questionObject.details.description = sc.GetValue(`cmi.objectives.${i}.description`) || `Question ${i}`;
            }

            let interactionsCount = sc.GetValue('cmi.interactions._count');
            for (let i = 0; i < interactionsCount; i++) {
                let interactionCmiName = `cmi.interactions.${i}`;
                /* CLP: here's a fun thing to think about: the execution order of this line is weird: 
                   the first thing executed is the sc.GetValue call in the middle of the line
                   then the regex at the start
                   and finally `.slice(1)` at the end.
                   
                   JS doesn't have a function piping operator, but you can make things a bit more readable by assigning const values to each of the steps.
                   LM: Tidied the regex/id into consts. I think this makes it more readable?
                */
                const interactionId = sc.GetValue(`cmi.interactions.${i}.id`);
                const idRegex = /q(\d+)p(\d+)(?:g(\d+)|s(\d+))?/;
                const [questionNumber, partNumber, gapNumber, stepNumber] = idRegex.exec(interactionId)?.slice(1);
                let questionKey = `question` + questionNumber;
                let partKey = `part` + partNumber;
                if (!(partKey in exam.questions[questionKey].parts)) {
                    exam.questions[questionKey].parts[partKey] = {};
                    exam.questions[questionKey].parts[partKey].bits = {};
                }

                let partObject = exam.questions[questionKey].parts[partKey];
                let currentDetails;
                let currentDescription;
                if (!(gapNumber == undefined)) {
                    let gapKey = `gap` + gapNumber;
                    let gapObject = partObject.bits[gapKey] = {};
                    gapObject.details = currentDetails = {};
                    currentDescription = `Question ${questionNumber} Part ${partNumber} Gap ${gapNumber}`;
                } else if (!(stepNumber == undefined)) {
                    let stepKey = `step` + stepNumber;
                    let stepObject = partObject.bits[stepKey] = {};
                    stepObject.details = currentDetails = {};
                    currentDescription = `Question ${questionNumber} Part ${partNumber} Step ${stepNumber}`; //Should the step and gap include their Part and Question in their
                    //description? It makes the column titles more fully explained but
                    //soooo much longer
                } else {
                    //this means it is just the part
                    partObject.details = currentDetails = {};
                    currentDescription = `Question ${questionNumber} Part ${partNumber}`;
                }
                currentDetails.studentMarks = sc.GetValue(`cmi.interactions.${i}.result`);
                currentDetails.maxMarks = sc.GetValue(`cmi.interactions.${i}.weighting`);
                currentDetails.expectedResponse = sc.GetValue(`cmi.interactions.${i}.correct_responses.0.pattern`);
                currentDetails.studentResponse = sc.GetValue(`cmi.interactions.${i}.learner_response`);
                currentDetails.description = currentDescription;
            }
            return exam;


        },

        old_get_exam_data : function () {
            const exam = {};
            exam.details = {};
            exam.questions = {};
            exam.details.studentMarks = sc.GetValue('cmi.score.raw');
            exam.details.maxMarks = sc.GetValue('cmi.score.max');
            let objectivesCount = sc.GetValue('cmi.objectives._count');
            for (let i = 0; i < objectivesCount; i++) {
                let questionKey = `question${i}`;
                let questionCmiName = `cmi.objectives.${i}`;
                let questionObject = exam.questions[questionKey] = {};
                questionObject.details = {};
                questionObject.parts = {}
                questionObject.details.studentMarks = sc.GetValue(`cmi.objectives.${i}.score.raw`);
                questionObject.details.maxMarks = sc.GetValue(`cmi.objectives.${i}.score.max`);
                questionObject.details.description = sc.GetValue(`cmi.objectives.${i}.description`) || `Question ${i}`;
            }

            let interactionsCount = sc.GetValue('cmi.interactions._count');
            for (let i = 0; i < interactionsCount; i++) {
                let interactionCmiName = `cmi.interactions.${i}`;
                /* CLP: here's a fun thing to think about: the execution order of this line is weird: 
                   the first thing executed is the sc.GetValue call in the middle of the line
                   then the regex at the start
                   and finally `.slice(1)` at the end.
                   
                   JS doesn't have a function piping operator, but you can make things a bit more readable by assigning const values to each of the steps.
                   LM: Tidied the regex/id into consts. I think this makes it more readable?
                */
                const interactionId = sc.GetValue(`cmi.interactions.${i}.id`);
                const idRegex = /q(\d+)p(\d+)(?:g(\d+)|s(\d+))?/;
                const [questionNumber, partNumber, gapNumber, stepNumber] = idRegex.exec(interactionId)?.slice(1);
                let questionKey = `question` + questionNumber;
                let partKey = `part` + partNumber;
                if (!(partKey in exam.questions[questionKey].parts)) {
                    exam.questions[questionKey].parts[partKey] = {};
                    exam.questions[questionKey].parts[partKey].bits = {};
                }

                let partObject = exam.questions[questionKey].parts[partKey];
                let currentDetails;
                let currentDescription;
                if (!(gapNumber == undefined)) {
                    let gapKey = `gap` + gapNumber;
                    let gapObject = partObject.bits[gapKey] = {};
                    gapObject.details = currentDetails = {};
                    currentDescription = `Question ${questionNumber} Part ${partNumber} Gap ${gapNumber}`;
                } else if (!(stepNumber == undefined)) {
                    let stepKey = `step` + stepNumber;
                    let stepObject = partObject.bits[stepKey] = {};
                    stepObject.details = currentDetails = {};
                    currentDescription = `Question ${questionNumber} Part ${partNumber} Step ${stepNumber}`; //Should the step and gap include their Part and Question in their
                    //description? It makes the column titles more fully explained but
                    //soooo much longer
                } else {
                    //this means it is just the part
                    partObject.details = currentDetails = {};
                    currentDescription = `Question ${questionNumber} Part ${partNumber}`;
                }
                currentDetails.studentMarks = sc.GetValue(`cmi.interactions.${i}.result`);
                currentDetails.maxMarks = sc.GetValue(`cmi.interactions.${i}.weighting`);
                currentDetails.expectedResponse = sc.GetValue(`cmi.interactions.${i}.correct_responses.0.pattern`);
                currentDetails.studentResponse = sc.GetValue(`cmi.interactions.${i}.learner_response`);
                currentDetails.description = currentDescription;
            }
            return exam;
        },

        
        create_results_csv :  function () {
            let exam = Numbas.exam;
            //const exam = Numbas.results.get_exam_data();

            let header = [''];
            let expectedAnswers = ['Ideal'];
            let studentAnswers = ['Student'];

            header.push('Total Score');
            expectedAnswers.push(exam.mark);
            studentAnswers.push(exam.score);

            for (let questionKey of Object.keys(exam.questionList)) {

                let questionObject = exam.questions[questionKey];
                let questionName = questionObject.name||("Question "+questionKey);
                header.push(questionName);
                expectedAnswers.push(questionObject.marks);
                studentAnswers.push(questionObject.score);

                for (let partKey of Object.keys(questionObject.parts)) {
                    let partObject = questionObject.parts[partKey];
                    let partName = partObject.name||("part "+partKey);
                    header.push(questionName + partName + " Marks");
                    expectedAnswers.push(partObject.marks);
                    studentAnswers.push(partObject.score);
                    header.push(questionName + partName + " Answer");
                    expectedAnswers.push(partObject.getCorrectAnswer(partObject.getScope())); 
                    studentAnswers.push(partObject.studentAnswer);

                    for (let gapKey of Object.keys(partObject.gaps)) {
                        let gapObject = partObject.bits[gapKey];
                        //otherwise we have a gap or a step and I do not care which    
                        let gapName = gapObject.name||("Bit "+gapKey);    
                        header.push(questionName + partName + gapName + " Marks");
                        expectedAnswers.push(gapObject.marks);
                        studentAnswers.push(gapObject.score);
                        header.push(questionName + partName + gapName + " Answer");
                        expectedAnswers.push(gapObject.getCorrectAnswer(gapObject.getScope()));
                        studentAnswers.push(gapObject.studentAnswer);
                    }
                    for (let stepKey of Object.keys(partObject.steps)) {
                        let stepObject = partObject.bits[stepKey];
                        //otherwise we have a gap or a step and I do not care which    
                        let stepName = stepObject.name||("Bit "+stepKey);    
                        header.push(questionName + partName + stepName + " Marks");
                        expectedAnswers.push(stepObject.marks);
                        studentAnswers.push(stepObject.score);
                        header.push(questionName + partName + stepName + " Answer");
                        expectedAnswers.push(stepObject.getCorrectAnswer(stepObject.getScope()));
                        studentAnswers.push(stepObject.studentAnswer);
                    }
                }
            }
            return Numbas.results.make_csv([header, expectedAnswers, studentAnswers]);
        },

    }
});