Numbas.queueScript('analysis-display', ['base','download','util','csv','display-base'], function() {
    Numbas.analysis = {};

    /** A file uploaded by the user. It should be an attempt data file produced by the Numbas exam runtime.
     *  This file is decoded, decrypted and parsed as JSON. The file is considered succesfully processed if all of these steps succeed.
     */
    class AttemptFile {
        constructor(file, vm) {
            this.file = file;
            this.vm = vm;
            this.content = ko.observable(null);
            this.error = ko.observable(null);
            this.raw_text = ko.observable(null);

            this.status = ko.computed(() => {
                if(this.error()) {
                    return 'error';
                } else if(this.content()) {
                    return 'processed';
                } else {
                    return 'processing';
                }
            });
            this.status_class = ko.computed(() => {
                return {
                    'error': 'danger',
                    'processed': '',
                    'processing': 'info'
                }[this.status()] || '';
            });

            this.student_name = ko.computed(() => this.content()?.student_name || R('analysis.student name.anonymous'));
            
            this.start_time = ko.computed(() => new Date(this.content()?.start));

            this.score = ko.computed(() => this.content()?.score || 0);
            this.max_score = ko.computed(() => this.content()?.max_score || 0);

            this.score_percentage = ko.computed(() => this.score() / this.max_score());

            this.download_url = window.URL.createObjectURL(this.file);

            /** Data for the row corresponding to this attempt in the question totals-only data table.
             */
            this.question_table_row = ko.computed(() => {
                const exam_object = this.vm.exam_object;
                if(!(this.content() && exam_object)) {
                    return [];
                }
                const attempt_grouped_questions = this.attempt_grouped_questions();

                const row = [this.student_name(), this.score()];

                exam_object.question_groups.forEach((g,gi) => {
                    g.questions.forEach((q,qi) => {
                        const attempt_question = attempt_grouped_questions[gi][qi];
                        row.push(attempt_question?.score);
                    });
                });

                return row;
            });

            /** Data for the row corresponding to this attempt in the full data table.
             */
            this.full_table_row = ko.computed(() => {
                const exam_object = this.vm.exam_object;
                if(!(this.content() && exam_object)) {
                    return [];
                }
                const attempt_grouped_questions = this.attempt_grouped_questions();

                const row = [this.student_name(), this.score()];

                exam_object.question_groups.forEach((g,gi) => {
                    g.questions.forEach((q,qi) => {
                        const attempt_question = attempt_grouped_questions[gi][qi];

                        row.push(attempt_question?.score);

                        if(q.partsMode == 'explore') {
                            return;
                        }

                        q.parts.forEach((p,pi) => {
                            const attempt_part = attempt_question?.parts[pi];
                            row.push(attempt_part?.score);
                            if(p.type != 'gapfill') {
                                row.push(attempt_part?.student_answer || '');
                            }
                            p.gaps?.forEach((g,ggi) => {
                                const attempt_gap = attempt_part?.gaps[ggi];
                                row.push(attempt_gap?.score);
                                row.push(attempt_gap?.student_answer || '');
                            });
                            p.steps?.forEach((s,si) => {
                                const attempt_step = attempt_part?.steps[si];
                                row.push(attempt_step?.score);
                                row.push(attempt_step?.student_answer || '');
                            });
                        });
                    });
                });

                return row;
            });

            this.decrypt();
        }

        /** Replace the underlying `file` property with a new File object.
         */
        replace_file(file) {
            this.file = file;
            this.decrypt();
        }

        /** Serialise this file to JSON to store in `history.state`.
         */
        as_json() {
            return {
                filename: this.file.name,
                raw_text: this.raw_text()
            }
        }

        /** Forget about this file - remove it from the list of uploaded files.
         */
        remove() {
            viewModel.uploaded_files.remove(this);
        }

        /** Decrypt and parse this file's contents.
         */
        async decrypt() {
            try {
                const raw_text = await this.file.text();
                this.raw_text(raw_text);

                const encoded_text = raw_text.slice(raw_text.match(/^----$/m).index+5);
                const encrypted_text = Numbas.util.b64decode(encoded_text);

                const passcode = this.vm.passcode();
                this.decrypted_text = await Numbas.download.decrypt(encrypted_text, passcode);

                this.content(JSON.parse(this.decrypted_text));

                this.error(null);
            } catch(e) {
                this.error(e);
                return;
            }
        }

        /** For each question defined in the exam, an object relating it to the group and question index it appeared at in this attempt.
         */
        attempt_grouped_questions() {
            const exam_object = this.vm.exam_object;
            const attempt_grouped_questions = exam_object.question_groups.map(() => []);

            const content = this.content();
            if(!content) {
                return [];
            }

            const question_order = content.questionGroupOrder.flatMap((i,s) => content.questionSubsets[s].map(n=>{return {group_number:i,question_number:n}})).map((d,i)=>{ d.data = content.questions[i]; return d});
            question_order.forEach(({group_number, question_number, data}) => {
                attempt_grouped_questions[group_number][question_number] = data;
            });

            return attempt_grouped_questions;
        }

    }

    class ViewModel {
        constructor(exam_object) {
            /** The exam definition, loaded from `source.exam` in this package.
             */
            this.exam_object = exam_object;

            /** List of the uploaded files which have successfully uploaded, before they are decrypted. */
            this.uploaded_files = ko.observableArray();

            /** The maximum possible score for the exam.
             */
            this.max_marks = ko.observable(0);

            /** Definitions of all of the questions in the exam.
             */
            this.all_questions = ko.observableArray([]);

            /** A different decryption key to use, entered by the user.
             */
            this.overridden_passcode = ko.observable('');

            /** The decryption key for attempt data files, loaded from the exam definition.
             */
            this.default_passcode = ko.observable(this.exam_object?.navigation?.downloadEncryptionKey);

            /** Should the `overridden_passcode` be used instead of `default_passcode`?
             */
            this.override_passcode = ko.observable(false);

            /** The current tab the user is on. Toggles between 'upload', 'list_files', and 'table'.*/
            this.current_tab = ko.observable('list_files');

            /** The potential options for table display, along with description*/
            /** Descriptive names for each column in the full table.
             *  This is an array of four rows, containing cells that span several rows or columns.
             */
            this.table_header_readable = ko.observableArray([[]]);

            /** Machine-readable names for each column in the full table, giving the path to the corresponding question/part.
             */
            this.table_header_computer = ko.observableArray([]);

            this.table_format_options = ko.observableArray([
                { label: 'total', name: R('analysis.table.total')},
                { label: 'question', name: R('analysis.table.question')},
                { label: 'all', name: R('analysis.table.all')}
            ]);

            /** The currently selected table format, from the above labels.
             */
            this.table_format = ko.observable(this.table_format_options()[0]);
            
            /** The uploaded files, sorted by status and then by student name.
             */
            this.sorted_files = ko.computed(function() {
                return this.uploaded_files().slice().sort((a,b) => {
                    const a_status = a.status();
                    const b_status = b.status();
                    if(a_status != b_status) {
                        return a_status < b_status ? -1 : a_status > b_status ? 1 : 0;
                    }
                    function canonical_name(f) {
                        return f.student_name().toLowerCase().trim();
                    }
                    const a_name = canonical_name(a);
                    const b_name = canonical_name(b);

                    return a_name < b_name ? -1 : a_name > b_name ? 1 : 0;
                })
            },this);

            /** Just uploaded files which have been succesfully decrypted. Only these are shown in the results table.
             */
            this.decrypted_files = ko.computed(function() {
                return this.uploaded_files().filter(f => f.status() == 'processed' && f.content());
            },this);

            /** The "expected results" row for the "all details" table: available marks for the exam and each question and part.
             */
            this.full_expected_results_row = ko.computed(() => {
                const attempts = this.decrypted_files();
                const exam_object = this.exam_object;

                if(!(exam_object && attempts.length)) {
                    return [];
                }

                /** 
                 * Given max scores for an item for each attempt, describe it as either `undefined`, `"varies"` or a number.
                 * The max score is `undefined` if no attempt used this item.
                 * It's `"varies"` if there are two or more attempts with different values.
                 * It's a number if every attempt that uses this item has the same value.
                 */
                function describe_max_score(scores) {
                    const unique_scores = new Set(scores.filter(s => s !== undefined));
                    if(unique_scores.size == 0) {
                        return undefined;
                    } else if(unique_scores.size > 1) {
                        return 'varies';
                    } else {
                        return Array.from(unique_scores)[0];
                    }
                }

                const row = [
                    R("analysis.expected"),
                    describe_max_score(attempts.map(a=>a.content().max_score))
                ];
                const attempt_grouped_questions = attempts.map(attempt => attempt.attempt_grouped_questions());
                exam_object.question_groups.forEach((g,gi) => {
                    g.questions.forEach((q,qi) => {
                        const attempt_question = attempt_grouped_questions.map(a => a[gi][qi]);

                        row.push(describe_max_score(attempt_question.map(q => q?.max_score)));

                        if(q.partsMode == 'explore') {
                            return;
                        }

                        q.parts.forEach((p,pi) => {
                            const attempt_part = attempt_question.map(q => q?.parts[pi]);
                            row.push(describe_max_score(attempt_part.map(p => p?.max_score)));
                            row.push('');
                            p.gaps?.forEach((g,ggi) => {
                                const attempt_gap = attempt_part.map(p => p?.gaps[ggi]);
                                row.push(describe_max_score(attempt_gap.map(g => g?.max_score)));
                                row.push('');
                            });
                            p.steps?.forEach((s,si) => {
                                const attempt_step = attempt_part.map(p => p?.steps[si]);
                                row.push(describe_max_score(attempt_step.map(s => s?.max_score)));
                                row.push('');
                            });
                        });
                    });
                });

                return row;
            },this);

            /** A text summary of the files and their status.
             */
            this.file_summary = ko.computed(() => {
                const uploaded_files = this.uploaded_files();
                const decrypted_files = this.decrypted_files();
                if(uploaded_files.length == 0) {
                    return R('analysis.summary.no files');
                } else if(decrypted_files.length == 0) {
                    return R('analysis.summary.no decrypted files');
                } else if(decrypted_files.length == 1) {
                    return R('analysis.summary.one file');
                } else {
                    return R('analysis.summary.several files', {num_files: decrypted_files.length});
                }
            },this);

            /** The passcode to use for decrypting files - defaults to that stored in the exam definition, 
             * but can be overridden if eg there are multiple versions with different passcodes
             * In such cases, the exam used to generate the analysis page must not miss questions that the students could have seen.
             * */
            this.passcode = ko.computed(function() {
                if (this.override_passcode()) {
                    return this.overridden_passcode();
                }
                return this.default_passcode();
            }, this);

            /** A File object representing the currently-shown table in CSV format.
             */
            this.download_table = ko.computed(() => {
                let table_body;
                const attempts = this.decrypted_files();
                switch(this.table_format()?.label) {
                    case 'total':
                        table_body = [
                            [R('exam.student name'), R('control.total'),R('analysis.marks available'),R('analysis.percentage')],
                            ...attempts.map((file) => {
                                let content = file.content();
                                return [content.student_name,content.score,content.max_score,(100*content.score/content.max_score)+'%'];
                            })
                        ];
                        break;

                    case 'question':
                        table_body = [
                            [R('exam.student name'), R('control.total'), ...this.all_questions().map(q => q.name)],
                            [R('analysis.expected'), this.max_marks(), ...this.all_questions().map(q => q.question.max_score)],
                            ...attempts.map(f => f.question_table_row())
                        ];
                        break;

                    case 'all':
                        const header_webpage = this.table_header_readable();
                        const readable_header = header_webpage.map(() => []);
                        let col = header_webpage.map(()=>0);
                        function visit_cell(row) {
                            const cell = header_webpage[row][col[row]];
                            if(!cell) {
                                return;
                            }
                            col[row] += 1;
                            readable_header[row].push(cell.text);
                            for(let c=1;c<cell.cols;c++) {
                                readable_header[row].push('');
                            }
                            for(let r=1;r<cell.rows;r++) {
                                for(let c=1;c<cell.cols;c++) {
                                    readable_header[row+r].push('');
                                }
                                readable_header[row+r].push('');
                            }
                            row += cell.rows;
                            if(row<col.length) {
                                while(readable_header[row].length<readable_header[row-cell.rows].length) {
                                    visit_cell(row);
                                }
                            }
                        }
                        while(col[0]<header_webpage[0].length) {
                            visit_cell(0);
                        }
                        table_body = [this.table_header_computer()];
                        table_body = table_body.concat(readable_header);
                        table_body.push(this.full_expected_results_row());
                        table_body = table_body.concat(attempts.map(f=>f.full_table_row().map(x => x===undefined ? '' : x)));
                }

                const exam_slug = Numbas.util.slugify(this.exam_object.name);
                const format_slug = Numbas.util.slugify(this.table_format().name);
                const filename = `${exam_slug}-results-${format_slug}.csv`;
                let content = Numbas.csv.from_array(table_body);
                return new File([content], filename);
            });
        }

        /** Load the state from `window.history`.
         */
        async load_state() {
            this.set_exam_details_from_json();

            const state = window.history.state || {};
            if(state.current_tab !== undefined) {
                this.current_tab(state.current_tab);
            }
            if(state.table_format !== undefined) {
                this.table_format(this.table_format_options().find(o => o.label == state.table_format));
            }
            if(state.files !== undefined) {
                this.uploaded_files(state.files.map(fd => {
                    const af = new AttemptFile(new File([fd.raw_text], fd.filename), this);
                    af.decrypt();
                    return af;
                }));
            }

            ko.computed(() => {
                const state = {
                    current_tab: this.current_tab(),
                    table_format: this.table_format().label,
                    files: this.uploaded_files().map(f => f.as_json())
                };

                if(window.history.state?.current_tab != state.current_tab) {
                    window.history.pushState(state,null);
                } else {
                    window.history.replaceState(state,null);
                }
            },this);

        }

        /** Object for dealing with retrieving the question data from the exam object file 
        */
        set_exam_details_from_json() {
            const exam_object = this.exam_object;
            /** Do some processing on the data to produce columns for the results table.
             */
            let originalOrder = [R('exam.student name'), R('control.total')];
            let humanReadableOrder = [[ {text:R('exam.student name'), cols:1, rows: 4}, {text: R('control.total'), cols: 1, rows: 4}], [], [], []];
            const all_questions = [];

            exam_object.question_groups.forEach((group_object, group_index) => {
                let group_label = 'group' + group_index;
                let marks_per_question;
                group_object.questions.forEach((question_object, question_index) => {
                    let questionKey = question_index;
                    const customName = group_object.questionNames[question_index] || question_object.name;
                    let questionName = customName;
                    let question_label = group_label + 'q' + question_index;
                    originalOrder.push(question_label);
                    var header_length = humanReadableOrder.length;
                    const question_header = {text: questionName, cols: 1, rows: 1};
                    humanReadableOrder[0].push(question_header);
                    humanReadableOrder[1].push({text: R('analysis.score'), cols: 1, rows: 3});

                    all_questions.push({group: group_object, question: question_object, name: customName});

                    if(question_object.partsMode != 'explore') {
                        question_object.parts.forEach((part_object, part_index) => {
                            let partKey = part_index;
                            let partName = part_object.name || (Numbas.util.capitalise(R('part')) + " " + partKey);
                            let partType = part_object.type;
                            let part_label = question_label + 'p' + part_index;
                            originalOrder.push(part_label + " score");
                            const part_header = {text: partName, cols: 1, rows: 1}
                            humanReadableOrder[1].push(part_header);
                            humanReadableOrder[2].push({text: R('analysis.score'), cols: 1, rows: 2})
                            if (partType != 'gapfill') {
                                originalOrder.push(part_label + " answer");
                                humanReadableOrder[2].push({text: R('analysis.answer'), cols: 1, rows: 2});
                                part_header.cols += 1;
                            }
                            part_object.gaps?.forEach((gap_object, gap_index) => { //if optional chaining is not supported, update to full if.
                                let gapKey = gap_index;
                                let gapName = gap_object.name || (R('gap') + " " + gapKey);
                                let gapType = gap_object.type;
                                let gap_label = part_label + 'g' + gap_index;
                                originalOrder.push(gap_label + " score");
                                originalOrder.push(gap_label + " answer");
                                humanReadableOrder[2].push({text: gapName, cols: 2, rows: 1});
                                humanReadableOrder[3].push({text: R('analysis.score'), cols: 1, rows: 1});
                                humanReadableOrder[3].push({text: R('analysis.answer'), cols: 1, rows: 1});
                                part_header.cols += 2;
                            });
                            part_object.steps?.forEach((step_object, step_index) => {
                                let stepKey = step_index;
                                let stepName = step_object.name || (R('step') + " " + stepKey);
                                let stepType = step_object.type;
                                let step_label = part_label + 's' + step_index;
                                originalOrder.push(step_label + " score");
                                originalOrder.push(step_label + "answer");
                                humanReadableOrder[2].push({text: stepName, cols: 2, rows: 1});
                                humanReadableOrder[3].push({text: R('analysis.score'), cols: 1, rows: 1});
                                humanReadableOrder[3].push({text: R('analysis.answer'), cols: 1, rows: 1});
                                part_header.cols += 2;
                            });
                            question_header.cols += part_header.cols;
                        });
                    }
                });
            });

            /** Fill in the view model with the processed data.
             */
            this.all_questions(all_questions);
            this.table_header_computer(originalOrder);
            this.table_header_readable(humanReadableOrder);
        }

        /** Handler for the 'change' event on the upload files input.
         */
        input_files(vm, evt) {
            console.log(evt.target.files);
            this.add_files(Array.from(evt.target.files));
        }

        /**
         * Given a list of `File` objects, wrap them in `AttemptFile` and add to the uploaded_files objects.
         *
         * If a file with the same name has already been uploaded, replace it with the new version.
         * */
        async add_files(files) {
            if (this.current_tab() != 'list_files') { this.move_tab('list_files')() };
            files.forEach(file => {
                const existing = this.uploaded_files().find(f => f.file.name == file.name);
                if(existing) {
                    existing.replace_file(file);
                } else {
                    const af = new AttemptFile(file, this);
                    this.uploaded_files.push(af);
                }
            });
        }

        /**
         * Make a function which will set the current tab to the given one.
         * */
        move_tab(tab) {
            return () => { this.current_tab(tab); }
        }
    }

    Numbas.analysis.init = async function() {

        Numbas.display.localisePage();

        if(!window.isSecureContext) {
            document.body.classList.add('not-secure-context');
            return;
        }

        /** Load and parse the .exam file. */
        let retrieved_source = await (await fetch(`source.exam`)).text();
        let exam_json = retrieved_source.slice(retrieved_source.indexOf("\n") + 1);
        const exam_object = JSON.parse(exam_json);

        const viewModel = new ViewModel(exam_object);
        viewModel.load_state();

        document.body.addEventListener('dragover', evt => evt.preventDefault());
        document.body.addEventListener('drop', evt => {
            evt.preventDefault();
            viewModel.add_files(Array.from(evt.dataTransfer.items).map(i => i.getAsFile()));
        });

        ko.applyBindings(viewModel, document.querySelector('body > main#analysis'));
        window.viewModel = viewModel;

        /** Respond to browser history navigation.
         */
        window.addEventListener('popstate', function(event) {
            if (event.state) {
                viewModel.current_tab(event.state.current_tab);
            }
        });

    };
});
