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
Numbas.queueScript('base',['jquery','localisation','seedrandom','knockout','sarissa','es6-promise'],function() {
});

Numbas.queueScript('start-exam',['base','exam','settings'],function() {

    for(var name in Numbas.custom_part_types) {
        Numbas.partConstructors[name] = Numbas.parts.CustomPart;
    };

	/**
	 * Initialise the exam:
	 *
	 * - Connect to the LMS, which might have saved student answers
	 * - Load the exam XML and the XSL templates
	 * - create and initialise the exam object
	 * - display the frontpage
	 *
	 * This function is called when all the other scripts have been loaded and executed. 
	 * It uses the scheduling system to make sure the browser isn't locked up when the exam is being initialised
	 * @memberof Numbas
	 * @method
	 */
	var init = Numbas.init = function()
	{
	$(document).ready(function() {
		var seed = Math.seedrandom(new Date().getTime());

		var job = Numbas.schedule.add;

		job(Numbas.xml.loadXMLDocs);				//load in all the XML and XSLT files

		job(Numbas.display.localisePage);

		job(function()
		{
			var store = Numbas.store = new Numbas.storage.SCORMStorage();	//The storage object manages communication between the LMS and the exam
			
			var exam = Numbas.exam = new Numbas.Exam();					//create the exam object, and load in everything from the XML
			exam.seed = Numbas.util.hashCode(seed);

			var entry = store.getEntry();
			if(store.getMode() == 'review')
				entry = 'review';

			switch(entry)
			{
			case 'ab-initio':
				job(exam.init,exam);
                exam.signals.on('question list initialised', function() {
				job(function() {
                        Numbas.display.init();
                });
				job(function() {
					if(exam.settings.showFrontPage)
					{
						exam.display.showInfoPage('frontpage');
					}
					else
					{
						exam.begin();
					}
				});	
                })
				break;

			case 'resume':
			case 'review':
				job(exam.load,exam);
				job(Numbas.display.init);

				job(function() {
					if(entry == 'review')
					{
						job(exam.end,exam,false);
					}
					else if(exam.currentQuestion !== undefined)
					{
						job(exam.display.showInfoPage,exam.display,'suspend');
					}
					else
					{
						job(exam.display.showInfoPage,exam.display,'frontpage');
					}
				});

				break;
			}
		});

	});
	}

});
