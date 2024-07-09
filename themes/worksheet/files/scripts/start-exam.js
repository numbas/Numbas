// 'base' gives the third-party libraries on which Numbas depends
Numbas.queueScript('base',['jquery','localisation','seedrandom','knockout','sarissa'],function() {
});


Numbas.queueScript('start-exam',['base','exam','settings'],function() {
    for(var name in Numbas.custom_part_types) {
        Numbas.partConstructors[name] = Numbas.parts.CustomPart;
    };

	Numbas.init = function() {
        Numbas.util.document_ready(function() {
            for(var x in Numbas.extensions) {
                Numbas.activateExtension(x);
            }
            var job = Numbas.schedule.add;

            job(Numbas.xml.loadXMLDocs);				//load in all the XML and XSLT files

            job(function() {
                var store = Numbas.store = new Numbas.storage.scorm.SCORMStorage();	//The storage object manages communication between the LMS and the exam
                Numbas.display.init();
            });
        });
	};
});

