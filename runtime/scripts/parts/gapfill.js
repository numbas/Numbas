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

/** @file The {@link Numbas.parts.GapFillPart} object */

Numbas.queueScript('parts/gapfill',['base','jme','jme-variables','util','part','marking_scripts'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;

var Part = Numbas.parts.Part;

/** Gap-fill part: text with multiple input areas, each of which is its own sub-part, known as a 'gap'.
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var GapFillPart = Numbas.parts.GapFillPart = function(path, question, parentPart)
{
}	
GapFillPart.prototype = /** @lends Numbas.parts.GapFillPart.prototype */
{

    loadFromXML: function(xml) {
        var gapXML = xml.selectNodes('gaps/part');

        this.marks = 0;

        for( var i=0 ; i<gapXML.length; i++ ) {
            var gap = Numbas.createPartFromXML(gapXML[i], this.path+'g'+i, this.question, this);
            this.addGap(gap,i);
        }
    },

    finaliseLoad: function() {
        if(Numbas.display) {
            this.display = new Numbas.display.GapFillPartDisplay(this);
        }
    },

    /** Add a gap to this part
     * @param {Numbas.parts.Part} gap
     * @param {Number} index - the position of the gap
     */
    addGap: function(gap, index) {
        gap.isGap = true;
        this.marks += gap.marks;
        this.gaps.splice(index,0,gap);
    },

    resume: function() {
        var p = this;
        this.gaps.forEach(function(g){ 
            g.resume(); 
            p.answered = p.answered || gap.answered;
        });
    },

	/** Included so the "no answer entered" error isn't triggered for the whole gap-fill part.
	 */
	stagedAnswer: 'something',

    /** The script to mark this part - assign credit, and give messages and feedback.
     * @type {Numbas.marking.MarkingScript}
     */
    markingScript: Numbas.marking_scripts.gapfill,

	/** Reveal the answers to all of the child gaps 
	 * Extends {@link Numbas.parts.Part.revealAnswer}
	 */
	revealAnswer: function(dontStore)
	{
		for(var i=0; i<this.gaps.length; i++)
			this.gaps[i].revealAnswer(dontStore);
	},

	/** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	rawStudentAnswerAsJME: function() {
		return new Numbas.jme.types.TList(this.gaps.map(function(g){return g.rawStudentAnswerAsJME()}));
	},

    setStudentAnswer: function() {
        this.studentAnswer = this.gaps.map(function(g) {
            if(g.stagedAnswer) {
                g.answerList = util.copyarray(g.stagedAnswer);
            }
            g.setStudentAnswer();
            return g.studentAnswer;
        });
    },

	/** Get the student's answer as a JME data type, to be used in error-carried-forward calculations
	 * @abstract
	 * @returns {Numbas.jme.token}
	 */
	studentAnswerAsJME: function() {
		return new Numbas.jme.types.TList(this.gaps.map(function(g){return g.studentAnswerAsJME()}));
	},

	/** Mark this part - add up the scores from each of the child gaps.
	 */
	mark_old: function()
	{
		this.credit=0;
		if(this.marks>0)
		{
			for(var i=0; i<this.gaps.length; i++)
			{
				var gap = this.gaps[i];
    			gap.submit();
				this.credit += gap.credit*gap.marks;
				if(this.gaps.length>1)
					this.markingComment(R('part.gapfill.feedback header',{index:i+1}));
				for(var j=0;j<gap.markingFeedback.length;j++)
				{
					var action = util.copyobj(gap.markingFeedback[j]);
					action.gap = i;
					this.markingFeedback.push(action);
				}
			}
			this.credit/=this.marks;
		}

		//go through all gaps, and if any one fails to validate then
		//whole part fails to validate
		var success = true;
		for(var i=0; i<this.gaps.length; i++) {
			success = success && this.gaps[i].answered;
        }

        this.answered = success;
	}

};
['loadFromXML','resume','finaliseLoad'].forEach(function(method) {
    GapFillPart.prototype[method] = util.extend(Part.prototype[method], GapFillPart.prototype[method]);
});
['revealAnswer'].forEach(function(method) {
    GapFillPart.prototype[method] = util.extend(GapFillPart.prototype[method], Part.prototype[method]);
});

Numbas.partConstructors['gapfill'] = util.extend(Part,GapFillPart);
});
