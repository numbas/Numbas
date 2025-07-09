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
/** @file Start the exam */
// 'base' gives the third-party libraries on which Numbas depends
Numbas.queueScript('base', ['jquery', 'localisation', 'seedrandom', 'knockout'], function() {
});
Numbas.queueScript('start-exam', ['base', 'util', 'exam', 'settings', 'exam-to-xml'], function() {
    /** The current exam.
     *
     * @name exam
     * @memberof Numbas
     * @type {Numbas.Exam}
     */

    /**
     * @typedef Numbas.load_exam_options
     * @type {object}
     * @property {string} exam_url - A URL to load the exam definition from.
     * @property {string} exam_source - A string containing the exam definition.
     */

    /**
     * Load an exam definition from the given source or data, load any required extensions, and then initialise the exam.
     *
     * @param {Numbas.load_exam_options} options
     *
     * @returns {{custom_part_types: Array.<{short_name: string}>, extensions: Array.<string>}}
     */
    Numbas.load_exam = async function(options) {
        let source;

        if(options.exam_url) {
            const res = await fetch(options.exam_url);
            if(!res.ok) {
                Numbas.schedule.halt(new Numbas.Error('exam.error loading exam definition', {text: res.statusText}));
            }
            source = await res.text();

        } else if(options.exam_source) {
            source = options.exam_source;
        } else {
            throw(new Numbas.Error('exam.no exam definition'));
        }

        const encoded_json = source.replace(/^\/\/.*$/m, '');

        const exam_data = JSON.parse(encoded_json);

        Numbas.custom_part_types = Object.fromEntries(exam_data.custom_part_types.map((cpt) => [cpt.short_name, cpt]));

        const examXML = Numbas.exam_to_xml(exam_data).selectSingleNode('/exam');

        const deps = exam_data.extensions.map((extension) => `extensions/${extension}/${extension}.js`);

        Numbas.awaitScripts(deps).then(() => {
            let store;

            if(options.scorm) {
                store = new Numbas.storage.scorm.SCORMStorage();
            } else {
                store = new Numbas.storage.Storage();
            }

            Numbas.init_extensions();

            Numbas.init_exam(examXML, store, options.element);

        });

        return exam_data;
    }

    /**
     * Initialise the exam:
     *
     * - Connect to the LMS, which might have saved student answers
     * - Load the exam XML and the XSL templates
     * - create and initialise the exam object
     * - display the frontpage
     *
     * This function is called when all the other scripts have been loaded and executed.
     * It uses the scheduling system to make sure the browser isn't locked up when the exam is being initialised.
     *
     * @memberof Numbas
     * @fires Numbas.signals#exam_ready
     * @fires Numbas.signals#Numbas_initialised
     * @function
     *
     * @param {Element} examXML - The XML definition of the exam.
     * @param {Numbas.storage.Storage} store - Attempt data storage controller.
     * @param {Element} [element] - The root `<numbas-exam>` element for this exam's display.
     */
    Numbas.init_exam = async function(examXML, store, element) {
        await numbas_init.promise;

        const scheduler = new Numbas.Scheduler();
        if(element) {
            scheduler.events.on('add job', () => element.showLoadProgress(scheduler));
            scheduler.events.on('finish job', () => element.showLoadProgress(scheduler));
        }
        var job = scheduler.job.bind(scheduler);

        job(function() {
            var external_seed = null; // TODO store.get_initial_seed();
            var seed = external_seed || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
            Math.seedrandom(seed);
            var exam = Numbas.createExamFromXML(examXML, store, element, scheduler);
            exam.seed = seed;

            var entry = store.getEntry();
            if(store.getMode() == 'review') {
                entry = 'review';
            }
            exam.entry = entry;

            switch(entry) {
                case '':
                case 'ab-initio':
                    job(() => exam.init());
                    exam.signals.on('ready', function() {
                        Numbas.signals.trigger('exam ready');
                        element && job(() => element.init(exam));
                        job(function() {
                            if(exam.settings.showFrontPage) {
                                exam.display.showInfoPage('frontpage');
                            } else {
                                exam.begin();
                            }
                        });
                    })
                    break;
                case 'resume':
                case 'review':
                    job(() => exam.load());
                    exam.signals.on('ready', function() {
                        Numbas.signals.trigger('exam ready');
                        element && job(() => element.init(exam));
                        job(function() {
                            if(entry == 'review') {
                                job(() => exam.end(false));
                            } else if(exam.currentQuestion !== undefined) {
                                job(() => exam.display.showInfoPage('resumed'));
                            } else {
                                job(() => exam.display.showInfoPage('frontpage'));
                            }
                        });
                    });
                    break;
            }

            Numbas.signals.trigger('Numbas initialised');
        });
    }

    Numbas.init_extensions = function() {
        for(var name in Numbas.custom_part_types) {
            Numbas.partConstructors[name] = Numbas.parts.CustomPart;
        };

        for(var x in Numbas.extensions) {
            Numbas.activateExtension(x);
        }
    }

    const numbas_init = Promise.withResolvers();

    Numbas.util.document_ready(function() {
        Numbas.locale.init();

        var job = Numbas.schedule.add;
        job(Numbas.xml.loadXMLDocs);
        job(Numbas.diagnostic.load_scripts);
        job(Numbas.display.init);
        job(() => numbas_init.resolve());
    });
});
