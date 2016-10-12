// 'base' gives the third-party libraries on which Numbas depends
Numbas.queueScript('base',['jquery','localisation','seedrandom','knockout','sarissa','es6-promise'],function() {
});


Numbas.queueScript('start-exam',['base','exam','settings'],function() {
	Numbas.init = function() {
		var job = Numbas.schedule.add;

		job(Numbas.xml.loadXMLDocs);				//load in all the XML and XSLT files

		job(function() {
			var store = Numbas.store = new Numbas.storage.SCORMStorage();	//The storage object manages communication between the LMS and the exam
			Numbas.display.init();
		});
	};
});

