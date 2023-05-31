Numbas.queueScript('analysis-display', ['base','download','util','csv','display-base'], function() {
    Numbas.analysis = {};
    Numbas.analysis.init = function() {
        const viewModel = {
            /** List of the uploaded files which have successfully uploaded, before they are decrypted. */
            uploaded_files: ko.observableArray(),

            /** List of the decrypted files. Each has its raw decrypted text, filename, and content as a javascript object. */
            decrypted_files: ko.observableArray(),

            /** List of any files which have failed to be decrypted or interpreted. */
            failed_files: ko.observableArray(),

            table_header_readable: ko.observableArray(),

            table_header_computer: ko.observableArray([]),

            expected_results: ko.observableArray(),

            default_passcode: ko.observable(''),

            overridden_passcode: ko.observable(''),

            override_passcode: ko.observable(false),

            /** The current page the user is on. Toggles between 'upload', 'processing', and 'table'.*/
            current_page: ko.observable('upload'),

            /** The potential options for table display, along with description*/
            table_format_options: ko.observableArray([
                { label: 'total', name: 'Total Scores', description: "Show the student's total score, expected score, and percentage mark." },
                { label: 'question', name: 'Question Marks', description: "Show the student's marks for each question" },
                { label: 'all', name: 'All Details', description: "Show all student answers and marks" }]),

            /** The currently selected table format, from the above labels*/
            table_format: ko.observable(''),

            /** An object with various presets such as 'show everything' and 'total score only'. Each element should itself be an object containing a 
             *  true/false as to whether it is enforced, as well as an array of true/false for whether columns are shown - false overrides. 
             *  These are initialised at set_exam_details_from_json, but need to exist here for knockout to generate its inheritances correctly.
             * */
            column_display_presets: ko.observable({
                all_data: ko.observable({ applied: ko.observable(true), shown_columns: ko.observable([]) }), //all_data should *always* be true, it is the baseline. false will be ignored.
                total_only: ko.observable({ applied: ko.observable(false), shown_columns: ko.observable([]) }),
                hide_answers: ko.observable({ applied: ko.observable(false), shown_columns: ko.observable([]) }),
                hide_gaps_and_steps: ko.observable({ applied: ko.observable(false), shown_columns: ko.observable([]) }),
                hide_parts: ko.observable({ applied: ko.observable(false), shown_columns: ko.observable([]) }),
                custom: ko.observable({ applied: ko.observable(false), shown_columns: ko.observable([]) })
            }),

            /**
             * Decrypts and interprets files and adds them to the decrypted_files and uploaded_files objects, or to failed_files if it fails.
             * 
             * Has no protections against duplicate file uploads. Todo in future: check if file name and encrypted file text match, and skip if so.
             * */
            add_files: async function (files) {
                if (this.current_page() != 'processing') { this.move_page('processing') };
                for (let file of files) {
                    try {
                    let decrypted = await this.decrypt_file(file);
                    this.uploaded_files.push(file);
                    this.decrypted_files.push(decrypted);
                    }
                    catch(err) {
                       //decrypt_file will error if the seed is wrong, and then we don't add the files to the storage.
                       //this can also error if decrypted files errors, for example if the questions don't match up
                       //Todo: make the errors clearer. This is a little tricky, as there's a lot of intricacies in the 'why'
                       this.failed_files.push(file);
                    }
                }
            },

            /**
             *  Decrypts a file, mapping it into an object which contains the raw text, filename, and content as an object which is what is used to interpret the data.
             * 
             * Labels the content questions, parts, etc with their unique label to ensure that they are matched to the correct columns if randomisation is in effect.
             *  
             * */
            decrypt_file: async function (file) { 
                let text = await Numbas.download.decrypt(Numbas.util.b64decode(await file.text()), viewModel.passcode());
                let filename = file.name;
                let content = JSON.parse(text);
                content = this.label_content(content);
                return { text: text, filename: filename, content: content }
            },

            /** 
             * Finds the unique label for each bit (question, part, etc) and adds it into the content object
             * Also returns the object but should alter it in-place.
             */
            label_content: function (content) {
                content.questions.forEach(question => {
                    question.label = this.getOriginalPath(question, 'question'); //this doesn't work for anything part or lower as it would need a cyclic object
                    question.parts.forEach((part, part_index) => {
                        part.label = question.label + "p" + part_index;
                        part.gaps?.forEach((gap, gap_index) => {
                            gap.label = part.label + 'g' + gap_index;
                        });
                        part.steps?.forEach((step, step_index) => {
                            step.label = part.label + 's' + step_index;
                        });
                    });
                });
                return content;
            },


            /**
             * Creates a unique tag for the component dependent on the original question order in the editor.
             * Duplicated from exam, with corrections for a difference in what 'part_object.group' represents. 
             * Also does not deal with parts/gaps/steps as they are more easily chained within each question, and p/g/s are tagged onto the question label.
             * 
             * tags are of the form rNqNpNgN or rNqNpNsN, where r is the group number, q is the question number
             * within that group, p is the part number within that question and g or s are the gap/step number 
             * within that part.
             * 
             * Fragments of the main function have been left in case they are easily adjusted.
             * 
             * @param {Object} component A component of the exam - may be a group or question only
             * 
             * @returns {string} 
             */
            getOriginalPath: function (component, componentType) {
                //what we need:
                //decide if this is a group, question, part, gap or step, and construct the r0q0p0g0 from the stored randomisation.
                //if it is a group: obtain 'number' N, return rN
                //if it is a question: obtain number_in_group (check!) M, obtain group.number N, return rNqM
                let gapNumber;
                let stepNumber;
                let partNumber;
                let questionNumber;
                let groupNumber;
                let part;
                let question;
                let group;
                // this allows us to use thingNumber === undefined to remove those which aren't relevant to the part.
                if ((componentType == "gap") || (componentType == "step")) {
                    part = component.parentPart;
                    if (componentType == "gap") {
                        gapNumber = "g" + component.index; //we deliberately add the letter here to avoid 0=false later
                    }
                    if (componentType == "step") {
                        stepNumber = "s" + component.index;
                    }
                }
                if (componentType == "part") {
                    part = component;
                }
                if (part) {
                    question = part.question;
                    partNumber = "p" + part.index;
                }
                if (componentType == "question") {
                    question = component;
                }
                if (question) {
                    group = question.group;
                    questionNumber = "q" + question.number_in_group;
                }
                if (componentType == "group") {
                    group = component;
                }
                groupNumber = "r" + group;
                let tag = (groupNumber || "") + (questionNumber || "") + (partNumber || "") + (gapNumber || "") + (stepNumber || "");
                return tag;
            },

            /**
             * Moves between pages whilst ensuring browser back/forward buttons will work as expected.
             * 
             * Refreshing and restoring all data is not supported - refreshing will reset the page.
             * */
            move_page: function(page) {
                this.current_page(page);
                window.history.pushState({current_page:page},null,"");
            },

            /**
             * Takes the current table_body if used, or generates the matching body if the table format has a html-coded body (as in the 'total' view)
             * */
            download_table: function () {
                let table_body;
                if (this.table_format()=='total') {
                    table_body = [["Student Name","Student Score","Maximum Score","Percentage"]]; //TODO: language R function this
                    this.decrypted_files().forEach((file) => {
                        let content = file.content;
                        let row = [content.student_name,content.score,content.max_score,(100*content.score/content.max_score)+'%'];
                        table_body.push(row);
                    });
                }
                else {
                    table_body = this.table_body().map(((x) => x)); //shallow copy - but means the later unshifts don't mess with the body itself!
                    table_body.unshift(this.table_header_webpage());
                    table_body.unshift(this.filter_columns([this.table_header_computer()])[0]); //because filter takes a 2d array, we first make this 2d and then take the first row of the output
                }
                let filename = "exam_results.csv";
                let content = Numbas.csv.from_array(table_body);
                Numbas.download.download_file(content, filename);
            },

            /**
             * Downloads the data as a full table including all student marks and answers.
             * Does not include the correct answer for each question
             * */
            download_full_table: function () {
                let table_body = this.full_table().map(((x) => x)); //shallow copy - but means the later unshifts don't mess with the body itself!
                table_body.unshift(this.table_header_readable());
                table_body.unshift(this.table_header_computer());
                let filename = "exam_results.csv";
                let content = Numbas.csv.from_array(table_body);
                Numbas.download.download_file(content, filename);
            },

            /** Function for the implementation of the 'custom' column hiding in the presets. currently unused but would designate a column's display as 'false'
             * Uses the column number to hide the column.
            */
            hide_column: function (column_number) {
                let shown_columns = this.column_display_presets().custom().shown_columns();
                shown_columns[column_number] = false;
                this.column_display_presets().custom().shown_columns(shown_columns);
                if (!this.column_display_presets().custom().applied()) {
                    this.column_display_presets().custom().applied(true);
                }
            },

            /** Function for the implementation of the 'custom' column hiding in the presets. currently unused but would designate a column's display as 'false'.
             * Implementation which finds the column by its computer-safe label.
            */
            hide_column_by_name: function (column_name) {
                let column_index = this.table_header_computer().indexOf(column_name);
                this.hide_column(column_index);
            },

            /** Function for the implementation of the 'custom' column hiding in the presets. currently unused but would designate a column's display as 'true'*/
            unhide_column: function (column_number) {
                let shown_columns = this.column_display_presets().custom().shown_columns();
                shown_columns[column_number] = true;
                this.column_display_presets().custom().shown_columns(shown_columns);
            },

            /** Takes a 2-d array of a table and removes columns which should not be shown.*/
            filter_columns: function (table) {
                let new_table = table.map(row => {
                    new_row = row.filter((cell, index) => {
                        return viewModel.show_columns()[index];
                    });
                    return new_row;
                });
                return new_table;
            },

            /** Sets the table display choice. Due to the use of $root, this was cleaner than trying to use the knockout function directly.*/
            set_table_display: function (display_label) {
                this.table_format(display_label)
                return;
            },

            /**
             * Gets the value in the stored exam which matches to the supplied label
             * 
             * @param exam the exam suspend object of a student's data
             * @param label a question/part/gap label in the format 'rNqNpNgNm'
             * @returns the student's answer or mark
             * 
             *  */
            get_content_matching: function (exam, label) {
                let idRegex = /r(\d+)q(\d+)(?:p(\d+))?(?:g(\d+)|s(\d+))?(m|a)?/;
                let [groupNumber, questionNumber, partNumber, gapNumber, stepNumber, markOrAnswer] = idRegex.exec(label)?.slice(1);
                if (markOrAnswer === undefined) {
                    markOrAnswer = "m";
                }
                let group_mapping = exam.questionGroupOrder.indexOf(groupNumber);
                if (group_mapping == -1) {
                    return "";
                }
                let question_mapping = exam.questionSubsets[group_mapping].indexOf(questionNumber);
                if (question_mapping == -1) {
                    return "";
                }
                let newLabel = label;
                if (label.slice(-1) == markOrAnswer) {
                    newLabel = label.slice(0, label.length - 1)
                }
                let questionLabel = "r" + groupNumber + "q" + questionNumber;
                let matched_question;
                exam.questions.forEach(question => {
                    if (question.label == questionLabel) {
                        matched_question = question;
                    };
                });
                if (partNumber === undefined) {
                    return matched_question.score 
                }
                else {
                    let part = matched_question.parts[partNumber];
                    if ((gapNumber === undefined) && (stepNumber === undefined)) {
                        if (markOrAnswer == 'm') {
                            return part.score;
                        }
                        if (markOrAnswer == 'a') {
                            return part.student_answer;
                        }
                        return "ERR: No Part Found"
                    }
                    if (gapNumber !== undefined) {
                        let gap = part.gaps[gapNumber];
                        if (markOrAnswer == 'm') {
                            return gap.score;
                        }
                        if (markOrAnswer == 'a') {
                            return gap.student_answer;
                        }
                        return "ERR: No Gap Found";
                    }
                    if (stepNumber !== undefined) {
                        let step = part.steps[stepNumber];
                        if (markOrAnswer == 'm') {
                            return step.score;
                        }
                        if (markOrAnswer == 'a') {
                            return step.student_answer;
                        }
                        return "ERR: No Step Found";
                    }
                }
                return "ERR: Unsupported fragment" 
                //Should never be able to reach here - either partNumber is undefines, or gapNumber and stepNumber are both undefined or have one defined, 
                //and those have their own errors

            }
        };

        /** The labels for the options for table formatting, for the drop-down on the table page.*/
        viewModel.table_format_labels = ko.computed( function() {
            return viewModel.table_format_options().map(item =>item.label);}
        ); 

        /** Student data tabulated, for every question, part and gap with their mark and answer.*/
        viewModel.full_table = ko.computed(function () {
            //needs to be initialised after the rest of viewModel so it can access decrypted_files(). 
            //Otherwise knockout decides to ignore that dependency forever.
            let full_table = [];
            let full_header = this.table_header_computer();
            full_table.push(this.expected_results());
            for (let file of this.decrypted_files()) {
                let student_row = [];
                let content = file.content;
                student_row.push(content.student_name, content.score);
                for (let heading of full_header.slice(2)) {
                    let value = this.get_content_matching(content, heading);
                    student_row.push(value);                 
                }
                full_table.push(student_row);
            }
            return full_table;
        }, viewModel);

        /** Array of booleans determining whether to display each column based on the full computer-readable headers */
        viewModel.show_columns = ko.computed(function () {
            let presets = viewModel.column_display_presets();
            let shown_columns = presets.all_data().shown_columns();
            for (preset in presets) {
                if (presets[preset]().applied() == true) {
                    shown_columns = shown_columns.map((value, index) => {
                        return value && presets[preset]().shown_columns()[index];
                    });
                }
            }
            return shown_columns;
        }, this);

        /** The passcode to use for decrypting files - defaults to that stored in the exam definition, 
         * but can be overridden if eg there are multiple versions with different passcodes
         * In such cases, the exam used to generate the analysis page must not miss questions that the students could have seen.
         * */
        viewModel.passcode = ko.computed(function () {
            if (viewModel.override_passcode()) {
                return viewModel.overridden_passcode();
            }
            return viewModel.default_passcode();
        });

        /** The displayed table body for the 'all'  and 'question' cases, toggling whether the hide_parts preset is true*/
        viewModel.table_body = ko.computed(function () {
            let full_table = viewModel.full_table();
            let selected_view = viewModel.table_format();
            //this is a clunky bodge of the old method to make the new object work. there is definitely a cleaner way to do this.
            if (selected_view=='question') {
                viewModel.column_display_presets().hide_parts().applied(true);
            } else if (selected_view=='all') {
                viewModel.column_display_presets().hide_parts().applied(false);
            }
            let new_table = viewModel.filter_columns(full_table);
            return new_table
        }, this);

        /** The table header matching the current table in a human readable format*/
        viewModel.table_header_webpage = ko.computed(function () {
            let full_header = viewModel.table_header_readable();
            let new_header = viewModel.filter_columns([full_header]);
            return new_header[0];
        }, this);

        /** The table header matching the current table using the unique question labels.*/
        viewModel.table_header_computer_filtered = ko.computed(function () {
            let full_header = viewModel.table_header_computer();
            let new_header = viewModel.filter_columns([full_header]);
            return new_header[0];
        }, this);

        /** Object for dealing with retrieving the question data from the exam object file 
        */
        const examData = {
            set_exam_details_from_json: async function () {
                /** Load and parse the .exam file. */
                let retrieved_source = await (await fetch(`source.exam`)).text();
                let split_source = retrieved_source.substring(retrieved_source.indexOf("\n") + 1);
                let exam_object = examData.exam_object = JSON.parse(split_source);

                /** Do some processing on the data to produce columns for the results table.
                 */
                let originalOrder = [R('analysis.student name'), R('analysis.total score')];
                let humanReadableOrder = [ R('analysis.student name'), R('analysis.total score')];
                let expected_results = [R("analysis.maximum"),0];
                let max_marks_total = 0;

                exam_object.question_groups.forEach((group_object, group_index) => {
                    let max_marks_group = 0;
                    let group_label = 'r' + group_index;
                    let marks_per_question;
                    group_object.questions.forEach((question_object, question_index) => {
                        let max_marks_question = 0;
                        let questionKey = question_index;
                        let questionName = question_object.name;
                        let groupName = R('analysis.group') + " " + group_index;
                        let question_label = group_label + 'q' + question_index;
                        originalOrder.push(question_label);
                        humanReadableOrder.push(questionName);
                        let expected_results_question_stack = [];

                        question_object.parts.forEach((part_object, part_index) => {
                            let max_marks_part = 0;
                            let partKey = part_index;
                            let partName = part_object.name || (R('part') + " " + partKey);
                            let partType = part_object.type;
                            let part_label = question_label + 'p' + part_index;
                            originalOrder.push(part_label + "m");
                            humanReadableOrder.push(partName + " Marks")
                            let expected_results_part_stack = [];
                            if (partType != 'gapfill') {
                                originalOrder.push(part_label + "a");
                                humanReadableOrder.push(partName + " Answer");
                                max_marks_part = part_object.marks;
                            }
                            part_object.gaps?.forEach((gap_object, gap_index) => { //if optional chaining is not supported, update to full if.
                                let max_marks_gap = 0;
                                let gapKey = gap_index;
                                let gapName = gap_object.name || (R('gap') + " " + gapKey);
                                let gapType = gap_object.type;
                                let gap_label = part_label + 'g' + gap_index;
                                originalOrder.push(gap_label + "m");
                                originalOrder.push(gap_label + "a");
                                humanReadableOrder.push(gapName + " Marks");
                                humanReadableOrder.push(gapName + " Answer");
                                expected_results_part_stack.push(gap_object.marks);
                                expected_results_part_stack.push("");
                                max_marks_part += gap_object.marks;
                            });
                            part_object.steps?.forEach((step_object, step_index) => {
                                let max_marks_step = 0;
                                let stepKey = step_index;
                                let stepName = step_object.name || (R('step') + " " + stepKey);
                                let stepType = step_object.type;
                                let step_label = part_label + 'g' + step_index;
                                originalOrder.push(step_label + "m");
                                originalOrder.push(step_label + "a");
                                humanReadableOrder.push(stepName + " Marks")
                                humanReadableOrder.push(stepName + " Answer")
                                expected_results_part_stack.push(step_object.marks);
                                expected_results_part_stack.push("");
                            });
                            expected_results_question_stack.push(max_marks_part);
                            if (partType != 'gapfill') {
                                expected_results_question_stack.push("");
                            }
                            expected_results_question_stack.push(...expected_results_part_stack);
                            max_marks_question += max_marks_part;
                        });
                        expected_results.push(max_marks_question);
                        expected_results.push(...expected_results_question_stack);
                        max_marks_group += max_marks_question;
                        if (marks_per_question === undefined) {
                            marks_per_question = max_marks_question; 
                        }
                        else if (marks_per_question!=max_marks_question) {
                            marks_per_question = "varies";
                        }
                    });
                    if (group_object.pickingStrategy!="all-ordered" && group_object.pickingStrategy!="all-shuffled") {
                        max_marks_group = "varies";
                        if (group_object.pickingStrategy=="random-subset") {
                            //check all questions have the same mark
                            //if so, multiply it by the pickQuestions
                            if (marks_per_question != "varies"){
                                max_marks_group = marks_per_question*group_object.pickQuestions;
                            }
                        }
                    }
                    if (max_marks_group == "varies") {
                        max_marks_total = "varies";
                    }
                    else if (max_marks_total != "varies") {
                        max_marks_total += max_marks_group;
                    }
                });
                expected_results[1] = max_marks_total;


                /** Fill in the view model with the processed data.
                 */
                viewModel.table_header_computer(originalOrder);
                viewModel.table_header_readable(humanReadableOrder);
                viewModel.expected_results(expected_results)
                viewModel.column_display_presets().all_data().shown_columns(originalOrder.map((x) => true));
                viewModel.column_display_presets().total_only().shown_columns(originalOrder.map((x, index) => {
                    if (index == 0 || index == 1) {
                        return true;
                    }
                    return false;
                }));
                viewModel.column_display_presets().hide_answers().shown_columns(originalOrder.map((x) => {
                    if ( x == R('analysis.student name') || x == R('analysis.total score')) {
                        return true;
                    }
                    if (x.slice(-1) == 'a') {
                        return false;
                    }
                    return true;
                }));
                viewModel.column_display_presets().hide_gaps_and_steps().shown_columns(originalOrder.map((x) => {
                    if (x == R('analysis.student name') || x == R('analysis.total score')) {
                        return true;
                    }
                    if (x.includes('g') || x.includes('s')) {
                        return false;
                    }
                    return true;
                }));
                viewModel.column_display_presets().hide_parts().shown_columns(originalOrder.map((x) => {
                    if (x == R('analysis.student name') || x == R('analysis.total score')) {
                        return true;
                    }
                    if (x.includes('p')) {
                        return false;
                    }
                    return true;
                }));
                viewModel.column_display_presets().custom().shown_columns(originalOrder.map((x) => true));
                viewModel.default_passcode(exam_object.navigation.csvEncryptionKey);
            }
        };

        examData.set_exam_details_from_json();

        /** Knockout binding. Makes everything work!*/
        ko.applyBindings(viewModel, document.getElementById('data_display'));

        /** Sets the initial state to the 'uplaod' page on page load.*/
        window.history.replaceState({current_page: 'upload'}, null, "");

        /** Controls the effect of the back and forward buttons*/
        window.onpopstate = function (event) {
            if (event.state) {
                viewModel.current_page(event.state.current_page);
            }
        }

    };
});
