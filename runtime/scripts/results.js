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


    /** Functions related to the download and interpretation of student results, and interaction with the results page, usually for outside-LTI contexts.
     *
     * @namespace Numbas.results */
    var results = Numbas.results = /** @lends Numbas.results */ {
        // items should be accessible through Numbas.results.function, so either write them inside this as key:function pairs, or if necessary as:
        //var ensure_decimal = math.ensure_decimal = function(n) { ? We need them to be like this to ensure they're accessible from elsewhere, maybe.
        
        /** Ensures a string will not cause issues within a csv due to commas, quotes, etc. 
         * 
         * @param {string} cell 
         * @returns {string}
         */
        escape_csv_cell : function (cell) {
            cell = cell + '';
            if(cell.match(/[,"']/)) {
                cell = '"'+cell.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
            }
            return cell;
        },
        
        /** Escapes each cell of a list of strings such that each will not cause issues within a csv
         * 
         * @param {Array.<string>} cells 
         * @returns {Array.<string>} 
         */
        make_csv_row : function (cells) {
            return cells.map(Numbas.results.escape_csv_cell).join(',');
        },

        /** Escapes each cell of a two-dimensional array of strings such that each will not cause issues within a csv
         * 
         * @param {Array.<Array.<string>>} rows 
         * @returns  {Array.<Array.<string>>} 
         */
        make_csv : function (rows) {
            return rows.map(Numbas.results.make_csv_row).join('\n');
        },
        
        /** Creates a csv record of the student's scores and answers, and the maximal scores and correct answers.
         * 
         * @returns {string} csv of student's results.
         */
        create_results_csv :  function () {
            let exam = Numbas.exam;

            let header = [''];
            let expectedAnswers = ['Ideal'];
            let studentAnswers = ['Student'];

            header.push('Total Score');
            expectedAnswers.push(exam.mark);
            studentAnswers.push(exam.score);

            for (let questionKey of Object.keys(exam.questionList)) {

                let questionObject = exam.questionList[questionKey];
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