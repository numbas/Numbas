Numbas.queueScript('analysis-display', ['base', 'download', 'util', 'csv', 'display-base'], function() {
    Numbas.analysis = {};

    /**
     * Given max scores for an item for each attempt, describe it as either `undefined`, `"varies"` or a number.
     * The max score is `undefined` if no attempt used this item.
     * It's `"varies"` if there are two or more attempts with different values.
     * It's a number if every attempt that uses this item has the same value.
     *
     * @param {Array.<number>} scores
     * @returns {string}
     */
    const describe_max_score = Numbas.analysis.describe_max_score = function(scores) {
        const unique_scores = new Set(scores.filter((s) => s !== undefined));
        if(unique_scores.size == 0) {
            return undefined;
        } else if(unique_scores.size > 1) {
            return 'varies';
        } else {
            return Array.from(unique_scores)[0];
        }
    }

    /**
     * A file uploaded by the user. It should be an attempt data file produced by the Numbas exam runtime.
     * This file is decoded, decrypted and parsed as JSON. The file is considered succesfully processed if all of these steps succeed.
     */
    class AttemptFile {
        constructor(file, vm) {
            this.file = file;
            this.vm = vm;
            this.content = Knockout.observable(null);
            this.error = Knockout.observable(null);
            this.raw_text = Knockout.observable(null);

            this.status = Knockout.computed(() => {
                if(this.error()) {
                    return 'error';
                } else if(this.content() && this.attempt_grouped_questions()) {
                    return 'processed';
                } else {
                    return 'processing';
                }
            });
            this.status_class = Knockout.computed(() => {
                return {
                    'error': 'danger',
                    'processed': '',
                    'processing': 'info'
                }[this.status()] || '';
            });

            this.student_name = Knockout.computed(() => this.content()?.student_name || R('analysis.student name.anonymous'));

            this.start_time = Knockout.computed(() => new Date(this.content()?.start));

            this.score = Knockout.computed(() => this.content()?.score || 0);
            this.max_score = Knockout.computed(() => this.content()?.max_score || 0);

            this.score_percentage = Knockout.computed(() => this.score() / this.max_score());

            this.download_url = window.URL.createObjectURL(this.file);

            /** For each question defined in the exam, an object relating it to the group and question index it appeared at in this attempt.
             */
            this.attempt_grouped_questions = Knockout.computed(() => {
                const exam_object = this.vm.exam_object;
                const content = this.content();
                if(!(content && exam_object)) {
                    return;
                }

                const attempt_grouped_questions = exam_object.question_groups.map(() => []);

                const question_order = content.questionGroupOrder.flatMap((i, s) => content.questionSubsets[s].map((n) => {
                    return {group_number:i, question_number:n}
                })).map((d, i) => {
                    d.data = content.questions[i]; return d
                });
                question_order.forEach(({group_number, question_number, data}) => {
                    attempt_grouped_questions[group_number][question_number] = data;
                });

                return attempt_grouped_questions;
            }, this);

            /** Data for the row corresponding to this attempt in the question totals-only data table.
             */
            this.question_table_row = Knockout.computed(() => {
                const exam_object = this.vm.exam_object;
                if(!(this.content() && exam_object)) {
                    return [];
                }
                const attempt_grouped_questions = this.attempt_grouped_questions();

                const row = [this.student_name(), this.score()];

                exam_object.question_groups.forEach((g, gi) => {
                    g.questions.forEach((q, qi) => {
                        const attempt_question = attempt_grouped_questions[gi][qi];
                        row.push(attempt_question?.score);
                    });
                });

                return row;
            });

            /** Data for the row corresponding to this attempt in the full data table.
             */
            this.full_table_row = Knockout.computed(() => {
                const exam_object = this.vm.exam_object;
                if(!(this.content() && exam_object)) {
                    return [];
                }
                const attempt_grouped_questions = this.attempt_grouped_questions();

                const row = [this.student_name(), this.score()];

                exam_object.question_groups.forEach((g, gi) => {
                    g.questions.forEach((q, qi) => {
                        const attempt_question = attempt_grouped_questions[gi][qi];

                        row.push(attempt_question?.score);

                        if(q.partsMode == 'explore') {
                            return;
                        }

                        q.parts.forEach((p, pi) => {
                            const attempt_part = attempt_question?.parts[pi];
                            row.push(attempt_part?.score);
                            if(p.type != 'gapfill') {
                                row.push(attempt_part?.student_answer || '');
                            }
                            p.gaps?.forEach((g, ggi) => {
                                const attempt_gap = attempt_part?.gaps[ggi];
                                row.push(attempt_gap?.score);
                                row.push(attempt_gap?.student_answer || '');
                            });
                            p.steps?.forEach((s, si) => {
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
         *
         * @param {File} file
         */
        replace_file(file) {
            this.file = file;
            this.decrypt();
        }

        /** Serialise this file to JSON to store in `history.state`.
         *
         * @returns {object}
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
            this.vm.uploaded_files.remove(this);
        }

        /** Decrypt and parse this file's contents.
         */
        async decrypt() {
            try {
                const raw_text = await this.file.text();
                this.raw_text(raw_text);

                const encoded_text = raw_text.slice(raw_text.match(/^----$/m).index + 5);
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

        /** The SCORM data model for this attempt.
         *
         * @returns {object}
         */
        scorm_cmi() {
            const suspend_data = this.content();
            const cmi = {
                'cmi.entry': 'resume',
                'cmi.mode': 'review',
                'cmi.suspend_data': JSON.stringify(suspend_data),
                'cmi.learner_name': this.student_name(),
                'cmi.score.raw': this.score(),
                'numbas.user_role': 'instructor'
            }

            var partAcc = 0;

            /** Initialise SCORM elements for the given part.
             *
             * @param {object} p - Suspend data for the part.
             * @param {string} path
             */
            function visit_part(p, path) {
                const prepath = `cmi.interactions.${partAcc}.`;
                cmi[prepath + 'id'] = path;
                cmi[prepath + 'learner_response'] = p.student_answer;
                partAcc += 1;
                if(p.gaps) {
                    p.gaps.forEach((g, i) => visit_part(g, `${path}g${i}`));
                }
                if(p.steps) {
                    p.steps.forEach((s, i) => visit_part(s, `${path}s${i}`));
                }
            }
            suspend_data.questions.forEach((q, i) => {
                const qid = `q${i}`;
                cmi[`cmi.objectives.${i}.id`] = qid;
                cmi[`cmi.objectives.${i}.score.raw`] = q.score;
                q.parts.forEach((p, j) => visit_part(p, `${qid}p${j}`));
            });
            cmi['cmi.objectives._count'] = suspend_data.questions.length;
            cmi['cmi.interactions._count'] = partAcc;
            return cmi;
        }
    }

    class ViewModel {
        constructor(exam_source) {
            /** The definition of the exam, as a string.
             */
            this.exam_source = exam_source;

            const exam_json = exam_source.slice(exam_source.indexOf("\n") + 1);

            /** The exam definition, loaded from `source.exam` in this package, as an object.
             */
            this.exam_object = JSON.parse(exam_json);

            /** List of the uploaded files which have successfully uploaded, before they are decrypted. */
            this.uploaded_files = Knockout.observableArray();

            /** Definitions of all of the questions in the exam.
             */
            this.all_questions = Knockout.observableArray([]);

            /** A different decryption key to use, entered by the user.
             */
            this.overridden_passcode = Knockout.observable('');

            /** The decryption key for attempt data files, loaded from the exam definition.
             */
            this.default_passcode = Knockout.observable(this.exam_object?.navigation?.downloadEncryptionKey);

            /** Should the `overridden_passcode` be used instead of `default_passcode`?
             */
            this.override_passcode = Knockout.observable(false);

            /** The current tab the user is on. Toggles between 'upload', 'list_files', and 'table'.*/
            this.current_tab = Knockout.observable('list_files');

            this.current_tab.subscribe((v) => {
                document.body.dataset.currentTab = v;
            });

            /**
             * Descriptive names for each column in the full table.
             * This is an array of four rows, containing cells that span several rows or columns.
             */
            this.table_header_readable = Knockout.observableArray([[]]);

            /** Machine-readable names for each column in the full table, giving the path to the corresponding question/part.
             */
            this.table_header_computer = Knockout.observableArray([]);

            this.table_format_options = Knockout.observableArray([
                { label: 'total', name: R('analysis.table.total')},
                { label: 'question', name: R('analysis.table.question')},
                { label: 'all', name: R('analysis.table.all')}
            ]);

            /** The currently selected table format, from the above labels.
             */
            this.table_format = Knockout.observable(this.table_format_options()[0]);

            this.reviewing_file = Knockout.observable(null);

            this.review_file = (file) => {
                const changed = file != this.reviewing_file();
                this.reviewing_file(file);
                this.current_tab('review');
                if(changed) {
                    window.API_1484_11 = new SCORM_API({scorm_cmi: file.scorm_cmi()});
                    const existing_container = document.querySelector('section[data-tab="review"] numbas-exam');
                    const exam_container = document.createElement('numbas-exam');
                    const source_element = existing_container.querySelector('script[type="application/numbas-exam"]');
                    if(source_element) {
                        exam_container.append(source_element);
                        exam_container.append(existing_container.querySelector('script[slot="extension-data"]'));
                    } else {
                        const {source_url, extension_data} = Numbas.get_exam_init_data();
                        exam_container.setAttribute('source_url', source_url);
                        const extension_data_script = document.createElement('script');
                        extension_data_script.setAttribute('type', 'application/json');
                        extension_data_script.setAttribute('slot','extension-data');
                        extension_data_script.textContent = extension_data;
                        exam_container.append(extension_data_script);
                    }
                    exam_container.setAttribute('storage','scorm');
                    existing_container.replaceWith(exam_container);
                }
            };

            this.reviewing_attempt_text = Knockout.computed(function() {
                const file = this.reviewing_file();
                if(!file) {
                    return '';
                }
                return R('analysis.reviewing attempt', {student_name: file.student_name()});
            }, this);

            /** The uploaded files, sorted by status and then by student name.
             */
            this.sorted_files = Knockout.computed(function() {
                return this.uploaded_files().slice().sort((a, b) => {
                    const a_status = a.status();
                    const b_status = b.status();
                    if(a_status != b_status) {
                        return a_status < b_status ? -1 : a_status > b_status ? 1 : 0;
                    }
                    const canonical_name = (f) => f.student_name().toLowerCase().trim();
                    const a_name = canonical_name(a);
                    const b_name = canonical_name(b);

                    return a_name < b_name ? -1 : a_name > b_name ? 1 : 0;
                })
            }, this);

            /** Just uploaded files which have been succesfully decrypted. Only these are shown in the results table.
             */
            this.decrypted_files = Knockout.computed(function() {
                return this.sorted_files().filter((f) => f.status() == 'processed');
            }, this);

            /** The maximum possible score for the exam.
             */
            this.max_score = Knockout.computed(function() {
                return describe_max_score(this.decrypted_files().map((a) => a.content()?.max_score));
            }, this);


            /** The "expected results" row for the "all details" table: available marks for the exam and each question and part.
             */
            this.full_expected_results_row = Knockout.computed(() => {
                const attempts = this.decrypted_files();
                const exam_object = this.exam_object;

                if(!(exam_object && attempts.length)) {
                    return [];
                }

                const row = [
                    R("analysis.expected"),
                    describe_max_score(attempts.map((a) => a.content().max_score))
                ];
                const attempt_grouped_questions = attempts.map((attempt) => attempt.attempt_grouped_questions());
                exam_object.question_groups.forEach((g, gi) => {
                    g.questions.forEach((q, qi) => {
                        const attempt_question = attempt_grouped_questions.map((a) => a[gi][qi]);

                        row.push(describe_max_score(attempt_question.map((q) => q?.max_score)));

                        if(q.partsMode == 'explore') {
                            return;
                        }

                        q.parts.forEach((p, pi) => {
                            const attempt_part = attempt_question.map((q) => q?.parts[pi]);
                            row.push(describe_max_score(attempt_part.map((p) => p?.max_score)));
                            if(p.type != 'gapfill') {
                                row.push('');
                            }
                            p.gaps?.forEach((g, ggi) => {
                                const attempt_gap = attempt_part.map((p) => p?.gaps[ggi]);
                                row.push(describe_max_score(attempt_gap.map((g) => g?.max_score)));
                                row.push('');
                            });
                            p.steps?.forEach((s, si) => {
                                const attempt_step = attempt_part.map((p) => p?.steps[si]);
                                row.push(describe_max_score(attempt_step.map((s) => s?.max_score)));
                                row.push('');
                            });
                        });
                    });
                });

                return row;
            }, this);

            /** A text summary of the files and their status.
             */
            this.file_summary = Knockout.computed(() => {
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
            }, this);

            /** The passcode to use for decrypting files - defaults to that stored in the exam definition,
             * but can be overridden if eg there are multiple versions with different passcodes
             * In such cases, the exam used to generate the analysis page must not miss questions that the students could have seen.
             */
            this.passcode = Knockout.computed(function() {
                if (this.override_passcode()) {
                    return this.overridden_passcode();
                }
                return this.default_passcode();
            }, this);

            /** A File object representing the currently-shown table in CSV format.
             */
            this.download_table = Knockout.computed(() => {
                let table_body;
                const attempts = this.decrypted_files();
                const formatters = {
                    total: () => {
                        table_body = [
                            [R('exam.student name'), R('control.total'), R('analysis.marks available'), R('analysis.percentage')],
                            ...attempts.map((file) => {
                                const content = file.content();
                                return [content.student_name, content.score, content.max_score, (100 * content.score / content.max_score) + '%'];
                            })
                        ];
                    },

                    question: () => {
                        table_body = [
                            [R('exam.student name'), R('control.total'), ...this.all_questions().map((q) => q.name)],
                            [R('analysis.expected'), this.max_score(), ...this.all_questions().map((q) => q.question.max_score)],
                            ...attempts.map((f) => f.question_table_row())
                        ];
                    },

                    all: () => {
                        const header_webpage = this.table_header_readable();
                        const readable_header = header_webpage.map(() => []);
                        const col = header_webpage.map(() => 0);

                        /**
                         * Visit a cell in the `header_webpage` object, and fill in the corresponding parts of `readable_header`, then visit the next cell down.
                         *
                         * @param {number} row - The index of the row to visit.
                         */
                        function visit_cell(row) {
                            const cell = header_webpage[row][col[row]];
                            if(!cell) {
                                return;
                            }
                            col[row] += 1;
                            readable_header[row].push(cell.text);
                            for(let c = 1; c < cell.cols; c++) {
                                readable_header[row].push('');
                            }
                            for(let r = 1;r < cell.rows;r++) {
                                for(let c = 1; c < cell.cols; c++) {
                                    readable_header[row + r].push('');
                                }
                                readable_header[row + r].push('');
                            }
                            // move to the next row down
                            row += cell.rows;
                            if(row < col.length) {
                                // visit all the cells in this row
                                while(readable_header[row].length < readable_header[row - cell.rows].length) {
                                    visit_cell(row);
                                }
                            }
                        }

                        while(col[0] < header_webpage[0].length) {
                            visit_cell(0);
                        }
                        table_body = [this.table_header_computer()];
                        table_body = table_body.concat(readable_header);
                        table_body.push(this.full_expected_results_row());
                        table_body = table_body.concat(attempts.map((f) => f.full_table_row().map((x) => x === undefined ? '' : x)));
                    }
                };

                formatters[this.table_format()?.label]();
                const exam_slug = Numbas.util.slugify(this.exam_object.name);
                const format_slug = Numbas.util.slugify(this.table_format().name);
                const filename = `${exam_slug}-results-${format_slug}.csv`;
                const content = Numbas.csv.from_array(table_body);
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
                this.table_format(this.table_format_options().find((o) => o.label == state.table_format));
            }
            if(state.files !== undefined) {
                this.uploaded_files(state.files.map((fd) => {
                    const af = new AttemptFile(new File([fd.raw_text], fd.filename), this);
                    af.decryptPromise = af.decrypt();
                    return af;
                }));
            }
            if(state.reviewing_file !== undefined && state.reviewing_file !== null && state.reviewing_file >= 0) {
                const af = this.uploaded_files()[state.reviewing_file];
                af.decryptPromise.then(() => {
                    this.review_file(af);
                });
            }

            Knockout.computed(() => {
                const state = {
                    current_tab: this.current_tab(),
                    table_format: this.table_format().label,
                    files: this.uploaded_files().map((f) => f.as_json()),
                    reviewing_file: this.current_tab() == 'review' ? this.uploaded_files().indexOf(this.reviewing_file()) : undefined
                };

                if(window.history.state?.current_tab != state.current_tab) {
                    window.history.pushState(state, null);
                } else {
                    window.history.replaceState(state, null);
                }
            }, this);

        }

        /** Make the structure of the data tables from the exam definition.
         */
        set_exam_details_from_json() {
            const exam_object = this.exam_object;
            /** Do some processing on the data to produce columns for the results table.
             */
            const originalOrder = [R('exam.student name'), R('control.total')];
            const humanReadableOrder = [[{text:R('exam.student name'), cols:1, rows: 4}, {text: R('control.total'), cols: 1, rows: 4}], [], [], []];
            const all_questions = [];

            exam_object.question_groups.forEach((group_object, group_index) => {
                const group_label = 'group' + group_index;
                group_object.questions.forEach((question_object, question_index) => {
                    const customName = group_object.questionNames[question_index] || question_object.name;
                    const questionName = customName;
                    const question_label = group_label + 'q' + question_index;
                    originalOrder.push(question_label);
                    const question_header = {text: questionName, cols: 1, rows: 1};
                    humanReadableOrder[0].push(question_header);
                    humanReadableOrder[1].push({text: R('analysis.score'), cols: 1, rows: 3});

                    all_questions.push({
                        group: group_object,
                        question: question_object,
                        name: customName,
                        max_score: Knockout.computed(() => {
                            return describe_max_score(this.decrypted_files().map((a) => a.attempt_grouped_questions()[group_index][question_index]?.max_score));
                        }, this)
                    });

                    if(question_object.partsMode != 'explore') {
                        question_object.parts.forEach((part_object, part_index) => {
                            const partKey = part_index;
                            const partName = part_object.name || (Numbas.util.capitalise(R('part')) + " " + partKey);
                            const partType = part_object.type;
                            const part_label = question_label + 'p' + part_index;
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
                                const gapKey = gap_index;
                                const gapName = gap_object.name || (R('gap') + " " + gapKey);
                                const gap_label = part_label + 'g' + gap_index;
                                originalOrder.push(gap_label + " score");
                                originalOrder.push(gap_label + " answer");
                                humanReadableOrder[2].push({text: gapName, cols: 2, rows: 1});
                                humanReadableOrder[3].push({text: R('analysis.score'), cols: 1, rows: 1});
                                humanReadableOrder[3].push({text: R('analysis.answer'), cols: 1, rows: 1});
                                part_header.cols += 2;
                            });
                            part_object.steps?.forEach((step_object, step_index) => {
                                const stepKey = step_index;
                                const stepName = step_object.name || (R('step') + " " + stepKey);
                                const step_label = part_label + 's' + step_index;
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
         *
         * @param {object} vm
         * @param {Event} evt
         */
        input_files(vm, evt) {
            this.add_files(Array.from(evt.target.files));
        }

        /**
         * Given a list of `File` objects, wrap them in `AttemptFile` and add to the uploaded_files objects.
         *
         * If a file with the same name has already been uploaded, replace it with the new version.
         *
         * @param {Array.<File>} files
         */
        async add_files(files) {
            if (this.current_tab() != 'list_files') {
                this.move_tab('list_files')()
            };
            files.forEach((file) => {
                const existing = this.uploaded_files().find((f) => f.file.name == file.name);
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
         *
         * @param {string} tab - The ID of the tab to move to.
         * @returns {Function}
         */
        move_tab(tab) {
            return () => {
                this.current_tab(tab);
            }
        }
    }




/** A SCORM API.
 * It provides the `window.API_1484_11` object, which SCORM packages use to interact with the data model.
 *
 * @param {object} options
 */
function SCORM_API(options) {
    var data = options.scorm_cmi;

    this.callbacks = new CallbackHandler();

    this.initialise_data(data);

    this.initialise_api();
}
SCORM_API.prototype = {
    /** Has the API been initialised?
     */
    initialized: false,

    /** Has the API been terminated?
     */
    terminated: false,

    /** The code of the last error that was raised
     */
    last_error: 0,

    /**
     * Setup the SCORM data model.
     * Merge in elements loaded from the page with elements saved to localStorage, taking the most recent value when there's a clash.
     *
     * @param {Object<string>} data
     */
    initialise_data: function(data) {
        // create the data model
        this.data = {};
        for(var key in data) {
            this.data[key] = data[key];
        }

        /** SCORM display mode - 'normal' or 'review'
         */
        this.mode = this.data['cmi.mode'];

        /**
         * Is the client allowed to change data model elements?
         * Not allowed in review mode.
         */
        this.allow_set = this.mode == 'normal';

        this.callbacks.trigger('initialise_data');
    },

    /** Initialise the SCORM API and expose it to the SCORM activity.
     */
    initialise_api: function() {
        var sc = this;

        /** The API object to expose to the SCORM activity
         */
        this.API_1484_11 = {};
        ['Initialize', 'Terminate', 'GetLastError', 'GetErrorString', 'GetDiagnostic', 'GetValue', 'SetValue', 'Commit'].forEach(function(fn) {
            sc.API_1484_11[fn] = function() {
                return sc[fn].apply(sc, arguments);
            };
        });

        /** Counts for the various lists in the data model
         */
        this.counts = {
            'comments_from_learner': 0,
            'comments_from_lms': 0,
            'interactions': 0,
            'objectives': 0,
        }
        this.interaction_counts = [];

        /** Set the counts based on the existing data model
         */
        for(var key in this.data) {
            this.check_key_counts_something(key);
        }

        this.callbacks.trigger('initialise_api');
    },

    /** For a given data model key, if it belongs to a list, update the counter for that list.
     *
     * @param {string} key
     */
    check_key_counts_something: function(key) {
        var m;

        m = key.match(/^cmi.(\w+).(\d+)/);
        if(m) {
            var ckey = m[1];
            var n = parseInt(m[2]);
            this.counts[ckey] = Math.max(n + 1, this.counts[ckey]);
            this.data['cmi.' + ckey + '._count'] = this.counts[ckey];
            if(ckey == 'interactions' && this.interaction_counts[n] === undefined) {
                this.interaction_counts[n] = {
                    'objectives': 0,
                    'correct_responses': 0
                }
            }
        }

        m = key.match(/^cmi.interactions.(\d+).(objectives|correct_responses).(\d+)/);
        if(m) {
            var n1 = parseInt(m[1]);
            var skey = m[2];
            var n2 = parseInt(m[3]);
            this.interaction_counts[n1][skey] = Math.max(n2 + 1, this.interaction_counts[n1][skey]);
            this.data['cmi.interactions.' + n1 + '.' + skey + '._count'] = this.interaction_counts[n1][skey];
        }
    },

    Initialize: function(b) {
        this.callbacks.trigger('Initialize', b);
        if(b != '' || this.initialized || this.terminated) {
            return false;
        }
        this.initialized = true;
        return true;
    },

    Terminate: function(b) {
        this.callbacks.trigger('Terminate', b);
        if(b != '' || !this.initialized || this.terminated) {
            return false;
        }
        this.terminated = true;

        return true;
    },

    GetLastError: function() {
        return this.last_error;
    },

    GetErrorString: function(code) {
        return "I haven't written any error strings yet.";
    },

    GetDiagnostic: function(code) {
        return "I haven't written any error handling yet.";
    },

    GetValue: function(key) {
        var v = this.data[key];
        if(v === undefined) {
            return '';
        } else {
            return v;
        }
    },

    SetValue: function(key, value) {
        if(!this.allow_set) {
            return;
        }
        value = (value + '');
        var changed = value != this.data[key];
        if(changed) {
            this.data[key] = value;
            this.check_key_counts_something(key);
        }
        this.callbacks.trigger('SetValue', key, value, changed);
    },

    Commit: function(s) {
        this.callbacks.trigger('Commit');
        return true;
    }
}

class CallbackHandler {
    constructor() {
        this.callbacks = {};
    }

    on(key, fn) {
        if(this.callbacks[key] === undefined) {
            this.callbacks[key] = [];
        }
        this.callbacks[key].push(fn);
    }

    trigger(key) {
        if(!this.callbacks[key]) {
            return;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        this.callbacks[key].forEach(function(fn) {
            fn.apply(this, args);
        });
    }
}






    Numbas.analysis.init = async function() {
        await Numbas.init_promise;

        Numbas.display.localisePage(document.body);

        /*
        if(!window.isSecureContext) {
            document.body.classList.add('not-secure-context');
            return;
        }
        */
        const params = new URLSearchParams(location.search);

        const locale = params.get('locale') || 'en-GB';

        Numbas.locale.set_preferred_locale(locale);

        const source_url = params.get('source_url');

        let exam_source;
        if(source_url) {
            /** Load and parse the .exam file. */
            const r = new XMLHttpRequest();
            r.open('GET', source_url);
            r.send();
            await (new Promise((resolve) => {
                r.addEventListener('load', () => {
                    setTimeout(resolve, 1);
                });
            }));
            exam_source = r.responseText;
        } else {
            exam_source = document.querySelector('numbas-exam script[type="application/numbas-exam"]').textContent;
        }

        const viewModel = new ViewModel(exam_source);
        viewModel.load_state();

        document.body.addEventListener('dragover', (evt) => evt.preventDefault());
        document.body.addEventListener('drop', (evt) => {
            evt.preventDefault();
            const files = Array.from(evt.dataTransfer.items)
                .filter((f) => f.kind == 'file')
                .map((i) => i.getAsFile())
            ;
            viewModel.add_files(files);
        });

        Knockout.applyBindings(viewModel, document.querySelector('main#analysis'));
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
