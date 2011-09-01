/*
Copyright 2011 Newcastle University

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

/*
 This extension will ask the student for their name when they begin the exam, and send scores to a (for now, hard-coded) address through an AJAX request. 
*/

Numbas.queueScript('extensions/simplesave/simplesave.js',['util','pretendlms'],function() {

	//CHANGE THIS ADDRESS!!!
	var address = 'http://myserver.com/save.php';	

	Numbas.init = Numbas.util.extend(Numbas.init,function() {
		Numbas.schedule.add(function() {
			if(Numbas.store.get('entry')=='ab-initio' && 'studentName' in localStorage)
				Numbas.exam.studentName = localStorage['studentName'];
			while(!Numbas.exam.studentName)
				localStorage['studentName'] = Numbas.exam.studentName = prompt('What is your name?');
		});
	});

	Numbas.storage.PretendLMS.prototype.SaveValue = Numbas.util.extend(Numbas.storage.PretendLMS.prototype.SaveValue,function(element,value) {
		if(Numbas.exam)
		{
			var data = {
				name: Numbas.exam.studentName,
				exam: Numbas.exam.name,
				element: element,
				value: value
			};
			$.post(address,data);
		}
	});
});
