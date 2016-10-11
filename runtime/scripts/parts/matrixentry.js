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

/** @file The {@link Numbas.parts.MatrixEntryPart} object */

Numbas.queueScript('parts/matrixentry',['base','display','jme','jme-variables','xml','util','scorm-storage','part'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var tryGetAttribute = Numbas.xml.tryGetAttribute;

var Part = Numbas.parts.Part;

/** Matrix entry part - student enters a matrix of numbers
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var MatrixEntryPart = Numbas.parts.MatrixEntryPart = function(xml, path, question, parentPart, loading) {
	var settings = this.settings;
	util.copyinto(MatrixEntryPart.prototype.settings,settings);

	tryGetAttribute(settings,this.xml,'answer',['correctanswer'],['correctAnswerString'],{string:true});
	tryGetAttribute(settings,this.xml,'answer',['correctanswerfractions','rows','columns','allowresize','tolerance','markpercell','allowfractions'],['correctAnswerFractions','numRows','numColumns','allowResize','tolerance','markPerCell','allowFractions']);

	var numRows = jme.subvars(settings.numRows, this.question.scope);
	settings.numRows = this.question.scope.evaluate(numRows).value;

	var numColumns = jme.subvars(settings.numColumns, this.question.scope);
	settings.numColumns = this.question.scope.evaluate(numColumns).value;

	var tolerance = jme.subvars(settings.tolerance, this.question.scope);
	settings.tolerance = this.question.scope.evaluate(tolerance).value;
	settings.tolerance = Math.max(settings.tolerance,0.00000000001);

	tryGetAttribute(settings,this.xml,'answer/precision',['type','partialcredit','strict'],['precisionType','precisionPC','strictPrecision']);
	tryGetAttribute(settings,this.xml,'answer/precision','precision','precisionString',{'string':true});

	if(settings.precisionType!='none') {
		settings.allowFractions = false;
	}

	this.studentAnswer = [];
	for(var i=0;i<this.settings.numRows;i++) {
		var row = [];
		for(var j=0;j<this.settings.numColumns;j++) {
			row.push('');
		}
		this.studentAnswer.push(row);
	}
	
	var messageNode = this.xml.selectSingleNode('answer/precision/message');
	if(messageNode) {
		settings.precisionMessage = $.xsl.transform(Numbas.xml.templates.question,messageNode).string;
	}

	this.getCorrectAnswer(this.question.scope);

    if(!settings.allowResize && (settings.correctAnswer.rows!=settings.numRows || settings.correctAnswer.columns != settings.numColumns)) {
        var correctSize = settings.correctAnswer.rows+'×'+settings.correctAnswer.columns;
        var answerSize = settings.numRows+'×'+settings.numColumns;
        throw(new Numbas.Error('part.matrix.size mismatch',{correct_dimensions:correctSize,input_dimensions:answerSize}));
    }

	this.display = new Numbas.display.MatrixEntryPartDisplay(this);

	if(loading)
	{
		var pobj = Numbas.store.loadMatrixEntryPart(this);
		if(pobj.studentAnswer) {
			var rows = pobj.studentAnswer.length;
			var columns = rows>0 ? pobj.studentAnswer[0].length : 0;
			this.stagedAnswer = [rows, columns, pobj.studentAnswer];
		}
	}
}
MatrixEntryPart.prototype = /** @lends Numbas.parts.MatrixEntryPart.prototype */
{
	/** The student's last submitted answer */
	studentAnswer: '',

	/** Properties set when part is generated
	 * Extends {@link Numbas.parts.Part#settings}
	 * @property {matrix} correctAnswer - the correct answer to the part
	 * @property {jme} numRows - default number of rows in the student's answer
	 * @property {jme} numColumns - default number of columns in the student's answer
	 * @property {boolean} allowResize - allow the student to change the dimensions of their answer?
	 * @property {jme} tolerance - allowed margin of error in each cell (if student's answer is within +/- `tolerance` of the correct answer (after rounding to , mark it as correct
	 * @property {boolean} markPerCell - should the student gain marks for each correct cell (true), or only if they get every cell right (false)?
	 * @property {boolean} allowFractions - can the student enter a fraction as their answer for a cell?
	 * @property {string} precisionType - type of precision restriction to apply: `none`, `dp` - decimal places, or `sigfig` - significant figures
	 * @property {number} precision - how many decimal places or significant figures to require
	 * @property {number} precisionPC - partial credit to award if the answer is between `minvalue` and `maxvalue` but not given to the required precision
	 * @property {string} precisionMessage - message to display in the marking feedback if their answer was not given to the required precision
	 */
	settings: {
		correctAnswer: null,
		correctAnswerFractions: false,
		numRows: '3',
		numColumns: '3',
		allowResize: true,
		tolerance: '0',
		markPerCell: false,
		allowFractions: false,
		precisionType: 'none',	//'none', 'dp' or 'sigfig'
		precision: 0,
		precisionPC: 0,	//fraction of credit to take away if precision wrong
		precisionMessage: R('You have not given your answer to the correct precision.')	//message to give to student if precision wrong
	},

	/** Compute the correct answer, based on the given scope
	 */
	getCorrectAnswer: function(scope) {
		var settings = this.settings;

		var correctAnswer = jme.subvars(settings.correctAnswerString,scope);
		correctAnswer = jme.evaluate(correctAnswer,scope);
		if(correctAnswer && correctAnswer.type=='matrix') {
			settings.correctAnswer = correctAnswer.value;
		} else if(correctAnswer && correctAnswer.type=='vector') {
			settings.correctAnswer = Numbas.vectormath.toMatrix(correctAnswer.value);
		} else {
			this.error('part.setting not present','correct answer');
		}

		settings.precision = jme.subvars(settings.precisionString, scope);
		settings.precision = jme.evaluate(settings.precision,scope).value;

		switch(settings.precisionType) {
		case 'dp':
			settings.correctAnswer = Numbas.matrixmath.precround(settings.correctAnswer,settings.precision);
			break;
		case 'sigfig':
			settings.correctAnswer = Numbas.matrixmath.siground(settings.correctAnswer,settings.precision);
			break;
		}

	},

	/** Save a copy of the student's answer as entered on the page, for use in marking.
	 */
	setStudentAnswer: function() {
		this.studentAnswerRows = parseInt(this.stagedAnswer[0]);
		this.studentAnswerColumns = parseInt(this.stagedAnswer[1]);
		this.studentAnswer = this.stagedAnswer[2];
	},

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return new Numbas.jme.types.TMatrix(this.studentAnswerAsMatrix());
	},

	studentAnswerAsMatrix: function() {
		var rows = this.studentAnswerRows;
		var columns = this.studentAnswerColumns;

		var studentMatrix = [];
		for(var i=0;i<rows;i++) {
			var row = [];
			for(var j=0;j<columns;j++) {
				var cell = this.studentAnswer[i][j];
				var n = util.parseNumber(cell,this.settings.allowFractions);
				
				if(isNaN(n)) {
					return null;
				} else {
					row.push(n);
				}
			}
			studentMatrix.push(row);
		}

		studentMatrix.rows = rows;
		studentMatrix.columns = columns;
		
		return studentMatrix;
	},

	/** Mark the student's answer */
	mark: function()
	{
		var validation = this.validation;

		if(this.answerList===undefined)
		{
			this.setCredit(0,R('part.marking.nothing entered'));
			return false;
		}

		var correctMatrix = this.settings.correctAnswer;

		if(this.studentAnswer) {
			var studentMatrix = this.studentAnswerAsMatrix();

			if(studentMatrix===null) {
				this.setCredit(0,R('part.matrix.invalid cell'));
				validation.invalidCell = true;
				return;
			} else {
				validation.invalidCell = false;
			}

			var precisionOK = true;
			var rows = studentMatrix.rows;
			var columns = studentMatrix.columns;

			for(var i=0;i<rows;i++) {
				for(var j=0;j<columns;j++) {
					var cell = this.studentAnswer[i][j];
					precisionOK &= math.toGivenPrecision(cell,this.settings.precisionType,this.settings.precision,this.settings.strictPrecision); 
				}
			}

			validation.wrongSize = rows!=correctMatrix.rows || columns!=correctMatrix.columns;
			if(validation.wrongSize) {
				this.answered = true;
				this.setCredit(0,R('part.marking.incorrect'));
				return;
			}

			var rounders = {'dp': Numbas.matrixmath.precround, 'sigfig': Numbas.matrixmath.siground, 'none': function(x){return x}};
			var round = rounders[this.settings.precisionType];
			studentMatrix = round(studentMatrix,this.settings.precision);

			var numIncorrect = 0;
			for(var i=0;i<rows;i++) {
				for(var j=0;j<columns;j++) {
					var studentCell = studentMatrix[i][j];
					var correctCell = correctMatrix[i][j];
					if(!math.withinTolerance(studentCell,correctCell,this.settings.tolerance)) {
						numIncorrect += 1;
					}
				}
			}

			var numCells = rows*columns;

			if(numIncorrect==0) {
				this.setCredit(1,R('part.marking.correct'));
			} else if(this.settings.markPerCell && numIncorrect<numCells) {
				this.setCredit( (numCells-numIncorrect)/numCells, R('part.matrix.some incorrect',{count:numIncorrect}) );
			} else {
				this.setCredit(0,R('part.marking.incorrect'));
			}

			if(!precisionOK) {
				this.multCredit(this.settings.precisionPC,this.settings.precisionMessage);
			}

			this.answered = true;
		} else {
			this.answered = false;
			this.setCredit(0,R('part.matrix.answer invalid'));
		}
	},

	/** Is the student's answer valid? False if the part hasn't been submitted.
	 * @returns {boolean}
	 */
	validate: function()
	{
		var validation = this.validation;

		if(validation.invalidCell) {
			this.giveWarning(R('part.matrix.invalid cell'));
		} else if(!this.answered) {
			this.giveWarning(R('part.matrix.empty cell'));
		}
		
		return this.answered;
	}
}

Numbas.partConstructors['matrix'] = util.extend(Part,MatrixEntryPart);

});

