﻿/*
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
Numbas.queueScript('base',['jquery','localisation','seedrandom','knockout'],function() {
});
Numbas.queueScript('start-exam',['base','util', 'exam','settings'],function() {
    for(var name in Numbas.custom_part_types) {
        Numbas.partConstructors[name] = Numbas.parts.CustomPart;
    };

    /** The current exam.
     *
     * @name exam
     * @memberof Numbas
     * @type {Numbas.Exam}
     */

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
     *
     * @param {object} options
     *
     * @function
     */
    var init = Numbas.init = function(options) {
        Numbas.util.document_ready(async function() {
            let examXML;
            options = options || {xml_url: 'exam.xml'};
            if(options?.xml_url) {
                const res = await fetch(options.xml_url);
                if(!res.ok) {
                    Numbas.schedule.halt(new Numbas.Error('exam.error loading exam XML', {text: res.statusText}));
                }
                examXML = await res.text();
            } else if(options.xml) {
                examXML = options.xml;
            } else {
                throw(new Numbas.Error('exam.no exam definition'));
            }
            Numbas.rawxml.examXML = examXML;
            for(var x in Numbas.extensions) {
                Numbas.activateExtension(x);
            }
            var job = Numbas.schedule.add;
            job(Numbas.xml.loadXMLDocs);
            job(Numbas.diagnostic.load_scripts);
            job(Numbas.display.localisePage);
            job(function() {
                var store = Numbas.store;
                var scorm_store = new Numbas.storage.scorm.SCORMStorage();
                Numbas.storage.addStorage(scorm_store);
                var external_seed = scorm_store.get_initial_seed();
                var seed = external_seed || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
                Math.seedrandom(seed);
                var xml = Numbas.xml.examXML.selectSingleNode('/exam');
                var exam = Numbas.exam = Numbas.createExamFromXML(xml,store,true);
                exam.seed = seed;
                var entry = store.getEntry();
                if(store.getMode() == 'review') {
                    entry = 'review';
                }
                exam.entry = entry;

                switch(entry) {
                    case '':
                    case 'ab-initio':
                        job(exam.init,exam);
                        exam.signals.on('ready', function() {
                            Numbas.signals.trigger('exam ready');
                            job(function() {
                                Numbas.display.init();
                            });
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
                        job(exam.load,exam);
                        exam.signals.on('ready', function() {
                            Numbas.signals.trigger('exam ready');
                            job(function() {
                                Numbas.display.init();
                            });
                            job(function() {
                                if(entry == 'review') {
                                    job(exam.end,exam,false);
                                } else if(exam.currentQuestion !== undefined) {
                                    job(exam.display.showInfoPage,exam.display,'resumed');
                                } else {
                                    job(exam.display.showInfoPage,exam.display,'frontpage');
                                }
                            });
                        });
                        break;
                }
            });
            job(function() {
                Numbas.signals.trigger('Numbas initialised');
            });
        });
    }
});
