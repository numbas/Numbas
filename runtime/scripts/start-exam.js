$(document).ready(function() {

	// Initialise the exam:
	// - Connect to the LMS, which might have saved student answers
	// - Load the exam XML and the XSL templates
	// - create and initialise the exam object
	// - display the frontpage
	// This function is called when all the other scripts have been loaded and executed. 
	// It uses the scheduling system to make sure the browser isn't locked up when the exam is being initialised
	var init = Numbas.init = function()
	{

		Math.seedrandom();

		var job = Numbas.schedule.add;

		//job(function(){Numbas.timing.start()});			//start timing (for performance tuning)

		job(Numbas.xml.loadXMLDocs);				//load in all the XML and XSLT files

		job(function()
		{
			var store = Numbas.store = new Numbas.storage.SCORMStorage();	//The storage object manages communication between the LMS and the exam
			
			var exam = Numbas.exam = new Numbas.Exam();					//create the exam object, and load in everything from the XML

			switch(store.getEntry())
			{
			case 'ab-initio':
				job(exam.init,exam);
				job(Numbas.display.init);
				job(function() {
					if(exam.showFrontPage)
					{
						exam.display.showInfoPage('frontpage');
					}
					else
					{
						exam.begin();
					}
				});	
				break;

			case 'resume':
				job(exam.load,exam);
				job(Numbas.display.init);

				job(function() {
					if(exam.currentQuestion !== undefined)
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
			//job(function(){Numbas.timing.end('init');});			//end performance timing 
		});

	}

	Numbas.loadScript('settings.js');
	Numbas.loadScript('scripts/exam.js');
	Numbas.startOK = true;
	Numbas.tryInit();
});

