$(document).ready(function() {
	Numbas.loadScript('settings.js');
	Numbas.loadScript('scripts/exam.js');
	Numbas.startOK = true;

	Numbas.init = function() {
		var job = Numbas.schedule.add;

		job(Numbas.xml.loadXMLDocs);				//load in all the XML and XSLT files

		job(function() {
			var store = Numbas.store = new Numbas.storage.SCORMStorage();	//The storage object manages communication between the LMS and the exam
			Numbas.display.init();
		});
	};

	Numbas.tryInit();
});

