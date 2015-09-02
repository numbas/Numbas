/*
Copyright 2011-15 Newcastle University

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

/** @file The {@link Numbas.parts.MultipleResponsePart} object */

Numbas.queueScript('parts/multipleresponse',['base','display','jme','jme-variables','xml','util','scorm-storage','part'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var tryGetAttribute = Numbas.xml.tryGetAttribute;

var Part = Numbas.parts.Part;

/** Multiple choice part - either pick one from a list, pick several from a list, or match choices with answers (2d grid, either pick one from each row or tick several from each row)
 *
 * Types:
 * * `1_n_2`: pick one from a list. Represented as N answers, 1 choice
 * * `m_n_2`: pick several from a list. Represented as N answers, 1 choice
 * * `m_n_x`: match choices (rows) with answers (columns). Represented as N answers, X choices.
 *
 * @constructor
 * @augments Numbas.parts.Part
 * @memberof Numbas.parts
 */
var MultipleResponsePart = Numbas.parts.MultipleResponsePart = function(xml, path, question, parentPart, loading)
{
	var settings = this.settings;
	util.copyinto(MultipleResponsePart.prototype.settings,settings);

	//work out marks available
	tryGetAttribute(settings,this.xml,'marking/maxmarks','enabled','maxMarksEnabled');
	if(settings.maxMarksEnabled) {
		tryGetAttribute(this,this.xml,'marking/maxmarks','value','marks');
	} else {
		tryGetAttribute(this,this.xml,'.','marks');
	}
	this.marks = util.parseNumber(this.marks) || 0;

	//get minimum marks setting
	tryGetAttribute(settings,this.xml,'marking/minmarks','enabled','minMarksEnabled');
	if(settings.minMarksEnabled) {
		tryGetAttribute(this.settings,this.xml,'marking/minmarks','value','minimumMarks');
	}
	this.settings.minimumMarks = util.parseNumber(this.settings.minimumMarks) || 0;

	//get restrictions on number of choices
	var choicesNode = this.xml.selectSingleNode('choices');
	if(!choicesNode) {
		this.error('part.mcq.choices missing');
	}

	tryGetAttribute(settings,null,choicesNode,['minimumexpected','maximumexpected','order','displayType'],['minAnswers','maxAnswers','choiceOrder']);

	var minAnswers = jme.subvars(settings.minAnswers, this.question.scope);
	minAnswers = jme.evaluate(settings.minAnswers,this.question.scope);
	if(minAnswers && minAnswers.type=='number') {
		settings.minAnswers = minAnswers.value;
	} else {
		this.error('part.setting not present','minimum answers');
	}

	var maxAnswers = jme.subvars(settings.maxAnswers, question.scope);
	maxAnswers = jme.evaluate(settings.maxAnswers,this.question.scope);
	if(maxAnswers && maxAnswers.type=='number') {
		settings.maxAnswers = maxAnswers.value;
	} else {
		this.error('part.setting not present','maximum answers');
	}

	var choiceNodes = choicesNode.selectNodes('choice');

	var answersNode, answerNodes;
	
	//get number of answers and answer order setting
	if(this.type == '1_n_2' || this.type == 'm_n_2') {
		// the XML for these parts lists the options in the <choices> tag, but it makes more sense to list them as answers
		// so swap "answers" and "choices"
		// this all stems from an extremely bad design decision made very early on
		this.flipped = true;
		this.numAnswers = choiceNodes.length;
		this.numChoices = 1;
		settings.answerOrder = settings.choiceOrder;
		settings.choiceOrder = '';
		answersNode = choicesNode;
		answerNodes = choiceNodes;
		choicesNode = null;
	} else {
		this.flipped = false;
		this.numChoices = choiceNodes.length;
		answersNode = this.xml.selectSingleNode('answers');
		if(answersNode) {
			tryGetAttribute(settings,null,answersNode,'order','answerOrder');
			answerNodes = answersNode.selectNodes('answer');
			this.numAnswers = answerNodes.length;
		}
	}

	//get warning type and message for wrong number of choices
	warningNode = this.xml.selectSingleNode('marking/warning');
	if(warningNode) {
		tryGetAttribute(settings,null,warningNode,'type','warningType');
	}
	
	if(loading) {
		var pobj = Numbas.store.loadMultipleResponsePart(this);
		this.shuffleChoices = pobj.shuffleChoices;
		this.shuffleAnswers = pobj.shuffleAnswers;
		this.ticks = pobj.ticks;
	} else {
		this.shuffleChoices = [];
		if(settings.choiceOrder=='random') {
			this.shuffleChoices = math.deal(this.numChoices);
		} else {
			this.shuffleChoices = math.range(this.numChoices);
		}

		this.shuffleAnswers = [];
		if(settings.answerOrder=='random') {
			this.shuffleAnswers = math.deal(this.numAnswers);
		} else {
			this.shuffleAnswers = math.range(this.numAnswers);
		}
	}

	// apply shuffling to XML nodes, so the HTML to display is generated in the right order
	for(i=0;i<this.numAnswers;i++) {
		answersNode.removeChild(answerNodes[i]);
	}
	for(i=0;i<this.numAnswers;i++) {
		answersNode.appendChild(answerNodes[this.shuffleAnswers[i]]);
	}
	if(this.type == 'm_n_x') {
		for(var i=0;i<this.numChoices;i++) {
			choicesNode.removeChild(choiceNodes[i]);
		}
		for(i=0;i<this.numChoices;i++) {
			choicesNode.appendChild(choiceNodes[this.shuffleChoices[i]]);
		}
	}

	// fill layout matrix
	var layout = this.layout = [];
	if(this.type=='m_n_x') {
		var layoutNode = this.xml.selectSingleNode('layout');
		tryGetAttribute(settings,null,layoutNode,['type','expression'],['layoutType','layoutExpression']);
		var layoutTypes = {
			all: function(row,column) { return true; },
			lowertriangle: function(row,column) { return row>=column; },
			strictlowertriangle: function(row,column) { return row>column; },
			uppertriangle: function(row,column) { return row<=column; },
			strictuppertriangle: function(row,column) { return row<column; },
			expression: function(row,column) { return layoutMatrix[row][column]; }
		};
		if(settings.layoutType=='expression') {
			// expression can either give a 2d array (list of lists) or a matrix
			// note that the list goes [row][column], unlike all the other properties of this part object, which go [column][row], i.e. they're indexed by answer then choice
			// it's easier for question authors to go [row][column] because that's how they're displayed, but it's too late to change the internals of the part to match that now
			// I have only myself to thank for this - CP
			var layoutMatrix = jme.unwrapValue(jme.evaluate(settings.layoutExpression,this.question.scope));
		}
		var layoutFunction = layoutTypes[settings.layoutType];
		for(var i=0;i<this.numAnswers;i++) {
			var row = [];
			for(var j=0;j<this.numChoices;j++) {
				row.push(layoutFunction(j,i));
			}
			layout.push(row);
		}
	} else {
		for(var i=0;i<this.numAnswers;i++) {
			var row = [];
			for(var j=0;j<this.numChoices;j++) {
				row.push(true);
			}
			layout.push(row);
		}
	}

	//invert the shuffle so we can now tell where particular choices/answers went
	this.shuffleChoices = math.inverse(this.shuffleChoices);
	this.shuffleAnswers = math.inverse(this.shuffleAnswers);

	//fill marks matrix
	var def;
	if(def = this.xml.selectSingleNode('marking/matrix').getAttribute('def')) {
		settings.markingMatrixString = def;
	} else {
		var matrixNodes = this.xml.selectNodes('marking/matrix/mark');
		var markingMatrixArray = settings.markingMatrixArray = [];
		for( i=0; i<this.numAnswers; i++ ) {
			markingMatrixArray.push([]);
		}
		for( i=0; i<matrixNodes.length; i++ ) {
			var cell = {value: ""};
			tryGetAttribute(cell,null, matrixNodes[i], ['answerIndex', 'choiceIndex', 'value']);

			if(this.flipped) {
				// possible answers are recorded as choices in the multiple choice types.
				// switch the indices round, so we don't have to worry about this again
				cell.answerIndex = cell.choiceIndex;
				cell.choiceIndex = 0;
			}

			//take into account shuffling
			cell.answerIndex = this.shuffleAnswers[cell.answerIndex];
			cell.choiceIndex = this.shuffleChoices[cell.choiceIndex];

			markingMatrixArray[cell.answerIndex][cell.choiceIndex] = cell.value;
		}
	}

	var distractors = [];
	for( i=0; i<this.numAnswers; i++ ) {
		distractors.push([]);
	}
	var distractorNodes = this.xml.selectNodes('marking/distractors/distractor');
	for( i=0; i<distractorNodes.length; i++ )
	{
		var cell = {message: ""};
		tryGetAttribute(cell,null, distractorNodes[i], ['answerIndex', 'choiceIndex']);
		cell.message = $.xsl.transform(Numbas.xml.templates.question,distractorNodes[i]).string;
		cell.message = jme.contentsubvars(cell.message,question.scope);

		if(this.type == '1_n_2' || this.type == 'm_n_2') {	
			// possible answers are recorded as choices in the multiple choice types.
			// switch the indices round, so we don't have to worry about this again
			cell.answerIndex = cell.choiceIndex;
			cell.choiceIndex = 0;
		}

		//take into account shuffling
		cell.answerIndex = this.shuffleAnswers[cell.answerIndex];
		cell.choiceIndex = this.shuffleChoices[cell.choiceIndex];

		distractors[cell.answerIndex][cell.choiceIndex] = cell.message;
	}
	settings.distractors = distractors;

	if(this.type=='1_n_2') {
		settings.maxAnswers = 1;
	} else if(settings.maxAnswers==0) {
		settings.maxAnswers = this.numAnswers * this.numChoices;
	}

	this.getCorrectAnswer(this.question.scope);
	var matrix = this.settings.matrix;
	
	if(this.marks == 0) {	//if marks not set explicitly
		var flat = [];
		switch(this.type)
		{
		case '1_n_2':
			for(var i=0;i<matrix.length;i++) {
				flat.push(matrix[i][0]);
			}
			break;
		case 'm_n_2':
			for(var i=0;i<matrix.length;i++) {
				flat.push(matrix[i][0]);
			}
			break;
		case 'm_n_x':
			if(settings.displayType=='radiogroup') {
				for(var i=0;i<this.numChoices;i++)
				{
					var row = [];
					for(var j=0;j<this.numAnswers;j++)
					{
						row.push(matrix[j][i]);
					}
					row.sort(function(a,b){return a>b ? 1 : a<b ? -1 : 0});
					flat.push(row[row.length-1]);
				}
			} else {
				for(var i=0;i<matrix.length;i++) {
					flat = flat.concat(matrix[i]);
				}
			}
			break;
		}
		flat.sort(function(a,b){return a>b ? 1 : a<b ? -1 : 0});
		for(var i=flat.length-1; i>=0 && flat.length-1-i<settings.maxAnswers && flat[i]>0;i--) {
			this.marks+=flat[i];
		}
	}

	//restore saved choices
	if(loading) {
		this.stagedAnswer = [];
		for( i=0; i<this.numAnswers; i++ ) {
			this.stagedAnswer.push([]);
			for( var j=0; j<this.numChoices; j++ ) {
				this.stagedAnswer[i].push(false);
			}
		}
		for( i=0;i<this.numAnswers;i++) {
			for(j=0;j<this.numChoices;j++) {
				if(pobj.ticks[i][j]) {
					this.stagedAnswer[i][j]=true;
				}
			}
		}
	} else {
		//ticks array - which answers/choices are selected?
		this.ticks = [];
		this.stagedAnswer = [];
		for( i=0; i<this.numAnswers; i++ ) {
			this.ticks.push([]);
			this.stagedAnswer.push([]);
			for( var j=0; j<this.numChoices; j++ ) {
				this.ticks[i].push(false);
				this.stagedAnswer[i].push(false);
			}
		}
	}

	//if this part has a minimum number of answers more than zero, then
	//we start in an error state
	this.wrongNumber = settings.minAnswers > 0;

	this.display = new Numbas.display.MultipleResponsePartDisplay(this);
}
MultipleResponsePart.prototype = /** @lends Numbas.parts.MultipleResponsePart.prototype */
{
	/** Student's last submitted answer/choice selections
	 * @type {Array.Array.<boolean>}
	 */
	ticks: [],
	
	/** Has the student given the wrong number of responses?
	 * @type {boolean}
	 */
	wrongNumber: false,

	/** Number of choices - used by `m_n_x` parts
	 * @type {number}
	 */
	numChoices: 0,

	/** Number of answers
	 * @type {number}
	 */
	numAnswers: 0,

	/** Have choice and answers been swapped (because of the weird settings for 1_n_2 and m_n_2 parts)
	 * @type {boolean}
	 */
	flipped: false,

	/** Properties set when the part is generated
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {boolean} maxMarksEnabled - is there a maximum number of marks the student can get?
	 * @property {number} minAnswers - minimum number of responses the student must select
	 * @property {number} maxAnswers - maxmimum number of responses the student must select
	 * @property {string} choiceOrder - order in which to display choices - either `random` or `fixed`
	 * @property {string} answerOrder - order in which to display answers - either `random` or `fixed`
	 * @property {Array.Array.<number>} matrix - marks for each answer/choice pair. Arranged as `matrix[answer][choice]`
	 * @property {string} displayType - how to display the response selectors. Can be `radiogroup` or `checkbox`
	 * @property {string} warningType - what to do if the student picks the wrong number of responses? Either `none` (do nothing), `prevent` (don't let the student submit), or `warn` (show a warning but let them submit)
	 */
	settings:
	{
		maxMarksEnabled: false,		//is there a maximum number of marks the student can get?
		minAnswers: '0',				//minimum number of responses student must select
		maxAnswers: '0',				//maximum ditto
		choiceOrder: '',			//order in which to display choices
		answerOrder: '',			//order in which to display answers
		matrix: [],					//marks matrix
		displayType: '',			//how to display the responses? can be: radiogroup, dropdownlist, buttonimage, checkbox, choicecontent
		warningType: ''				//what to do if wrong number of responses
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		var matrix = [];
		if(settings.markingMatrixString) {
			matrix = jme.evaluate(settings.markingMatrixString,scope);
			switch(matrix.type) {
			case 'list':
				var numLists = 0;
				var numNumbers = 0;
				for(var i=0;i<matrix.value.length;i++) {
					switch(matrix.value[i].type) {
					case 'list':
						numLists++;
						break;
					case 'number':
						numNumbers++;
						break;
					default:
						this.error('part.mcq.matrix wrong type',matrix.value[i].type);
					}
				}
				if(numLists == matrix.value.length) {
					matrix = matrix.value.map(function(row){	//convert TNums to javascript numbers
						return row.value.map(function(e){return e.value;});
					});
				} else if(numNumbers == matrix.value.length) {
					matrix = matrix.value.map(function(e) {
						return [e.value];
					});
				} else {
					this.error('part.mcq.matrix mix of numbers and lists');
				}
				matrix.rows = matrix.length;
				matrix.columns = matrix[0].length;
				break;
			case 'matrix':
				matrix = matrix.value;
				break;
			default:
				this.error('part.mcq.matrix not a list');
			}
			if(this.flipped) {
				matrix = Numbas.matrixmath.transpose(matrix);
			}
			if(matrix.length!=this.numChoices) {
				this.error('part.mcq.matrix wrong size');
			}

			// take into account shuffling;
			var omatrix = matrix;
			var matrix = [];
			matrix.rows = omatrix.rows;
			matrix.columns = omatrix.columns;
			for(var i=0;i<this.numChoices;i++) {
				matrix[i]=[];
				if(omatrix[i].length!=this.numAnswers) {
					this.error('part.mcq.matrix wrong size');
				}
			}
			for(var i=0; i<this.numChoices; i++) {
				for(var j=0;j<this.numAnswers; j++) {
					matrix[this.shuffleChoices[i]][this.shuffleAnswers[j]] = omatrix[i][j];
				}
			}

			matrix = Numbas.matrixmath.transpose(matrix);
		} else {
			for(var i=0;i<this.numAnswers;i++) {
				var row = [];
				matrix.push(row);
				for(var j=0;j<this.numChoices;j++) {
					var value = settings.markingMatrixArray[i][j];

					if(util.isFloat(value)) {
						value = parseFloat(value);
					} else {
						value = jme.evaluate(value,scope).value;
						if(!util.isFloat(value)) {
							this.error('part.mcq.matrix not a number',this.path,i,j);
						}
						value = parseFloat(value);
					}

					row[j] = value;
				}
			}
		}

		for(var i=0;i<matrix.length;i++) {
			var l = matrix[i].length;
			for(var j=0;j<l;j++) {
				if(!this.layout[i][j]) {
					matrix[i][j] = 0;
				}
			}
		}

		settings.matrix = matrix;
	},

	/** Store the student's choices */
	storeAnswer: function(answerList)
	{
		this.setDirty(true);
		//get choice and answer 
		//in MR1_n_2 and MRm_n_2 parts, only the choiceindex matters
		var answerIndex = answerList[0];
		var choiceIndex = answerList[1];

		switch(this.settings.displayType)
		{
		case 'radiogroup':							//for radiogroup parts, only one answer can be selected.
		case 'dropdownlist':
			for(var i=0; i<this.numAnswers; i++)
			{
				this.stagedAnswer[i][choiceIndex]= i==answerIndex;
			}
			break;
		default:
			this.stagedAnswer[answerIndex][choiceIndex] = answerList[2];
		}
	},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 */
	setStudentAnswer: function() {
		this.ticks = util.copyarray(this.stagedAnswer,true);
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		switch(this.type) {
			case '1_n_2':
				for(var i=0;i<this.numAnswers;i++) {
					if(this.ticks[i][0]) {
						return new jme.types.TNum(i);
					}
				}
				break;
			case 'm_n_2':
				var o = [];
				for(var i=0;i<this.numAnswers;i++) {
					o.push(new jme.types.TBool(this.ticks[i][0]));
				}
				return new jme.types.TList(o);
			case 'm_n_x':
				switch(this.settings.displayType) {
					case 'radiogroup':
						var o = [];
						for(var choice=0;choice<this.numChoices;choice++) {
							for(var answer=0;answer<this.numAnswers;answer++) {
								if(this.ticks[choice][answer]) {
									o.push(new jme.types.TNum(answer));
									break;
								}
							}
						}
						return new jme.types.TList(o);
					case 'checkbox':
						return Numbas.jme.wrapValue(this.ticks);
				}
		}
	},

	/** Mark the student's choices */
	mark: function()
	{
		var validation = this.validation;

		if(this.stagedAnswer==undefined) {
			this.setCredit(0,R('part.marking.did not answer'));
			return false;
		}
		this.setCredit(0);

		validation.numTicks = 0;
		var partScore = 0;
		for( i=0; i<this.numAnswers; i++ ) {
			for(var j=0; j<this.numChoices; j++ ) {
				if(this.ticks[i][j]) {
					validation.numTicks += 1;
				}
			}
		}

		validation.wrongNumber = (validation.numTicks<this.settings.minAnswers || (validation.numTicks>this.settings.maxAnswers && this.settings.maxAnswers>0));
		if(validation.wrongNumber) {
			this.setCredit(0,R('part.mcq.wrong number of choices'));
			return;
		}

		for( i=0; i<this.numAnswers; i++ ) {
			for(var j=0; j<this.numChoices; j++ ) {
				if(this.ticks[i][j]) {
					partScore += this.settings.matrix[i][j];

					var row = this.settings.distractors[i];
					if(row)
						var message = row[j];
					var award = this.settings.matrix[i][j];
					if(award!=0) {
						if(!util.isNonemptyHTML(message) && award>0) {
							message = R('part.mcq.correct choice');
						}
						this.addCredit(award/this.marks,message);
					} else {
						this.markingComment(message);
					}
				}
			}
		}

		if(this.marks>0) {
			if(this.credit<=0) {
				this.markingComment(R('part.marking.incorrect'));
			}
			this.setCredit(Math.min(partScore,this.marks)/this.marks);	//this part might have a maximum number of marks which is less then the sum of the marking matrix
		} else {
			this.setCredit(1,R('part.marking.correct'));
		}
	},

	/** Are the student's answers valid? Show a warning if they've picked the wrong number */
	validate: function()
	{
		var validation = this.validation;

		if(validation.wrongNumber)
		{
			switch(this.settings.warningType)
			{
			case 'prevent':
				this.giveWarning(R('part.mcq.wrong number of choices'));
				return false;
				break;
			case 'warn':
				this.giveWarning(R('part.mcq.wrong number of choices'));
				break;
			}
		}

		if(validation.numTicks>0)
			return true;
		else
			this.giveWarning(R('part.mcq.no choices selected'));
			return false;
	},

	/** Reveal the correct answers, and any distractor messages for the student's choices 
	 * Extends {@link Numbas.parts.Part.revealAnswer}
	 */
	revealAnswer: function()
	{
		var row,message;
		for(var i=0;i<this.numAnswers;i++)
		{
			for(var j=0;j<this.numChoices;j++)
			{
				if((row = this.settings.distractors[i]) && (message=row[j]))
				{
					this.markingComment(message);
				}
			}
		}
	}
};
MultipleResponsePart.prototype.revealAnswer = util.extend(MultipleResponsePart.prototype.revealAnswer, Part.prototype.revealAnswer);

Numbas.partConstructors['1_n_2'] = util.extend(Part,MultipleResponsePart);
Numbas.partConstructors['m_n_2'] = util.extend(Part,MultipleResponsePart);
Numbas.partConstructors['m_n_x'] = util.extend(Part,MultipleResponsePart);
});

