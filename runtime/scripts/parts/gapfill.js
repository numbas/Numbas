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
    util.copyinto(GapFillPart.prototype.settings,this.settings);
}
GapFillPart.prototype = /** @lends Numbas.parts.GapFillPart.prototype */
{
    /** Properties set when the part is generated.
     *
     * Extends {@link Numbas.parts.Part#settings}
     * @property {Boolean} sortAnswers - Should the student's answers to the gaps be put in ascending order before marking?
     */
    settings: {
        sortAnswers: false
    },

    loadFromXML: function(xml) {
        var gapXML = xml.selectNodes('gaps/part');
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        this.marks = 0;
        tryGetAttribute(settings,xml,'marking',['sortanswers'],['sortAnswers']);
        for( var i=0 ; i<gapXML.length; i++ ) {
            var gap = Numbas.createPartFromXML(gapXML[i], this.path+'g'+i, this.question, this, this.store);
            this.addGap(gap,i);
        }
    },
    loadFromJSON: function(data) {
        var p = this;
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        tryLoad(data,['sortAnswers'],settings);
        if('gaps' in data) {
            data.gaps.forEach(function(gd,i) {
                var gap = Numbas.createPartFromJSON(gd, p.path+'g'+i, p.question, p, p.store);
                p.addGap(gap, i)
            });
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
            p.answered = p.answered || g.answered;
        });
    },
    /** Included so the "no answer entered" error isn't triggered for the whole gap-fill part.
     */
    stagedAnswer: 'something',
    /** The script to mark this part - assign credit, and give messages and feedback.
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() { return Numbas.marking_scripts.gapfill; },
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
        if(this.gaps.some(function(g){ return g.rawStudentAnswerAsJME()===undefined; })) {
            return undefined;
        }
        return new Numbas.jme.types.TList(this.gaps.map(function(g){return g.rawStudentAnswerAsJME()}));
    },
    storeAnswer: function(answer) {
        this.gaps.forEach(function(g,i) {
            g.storeAnswer(answer[i]);
        })
    },
    setStudentAnswer: function() {
        this.studentAnswer = this.gaps.map(function(g) {
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
    }
};
['loadFromXML','resume','finaliseLoad','loadFromJSON','storeAnswer'].forEach(function(method) {
    GapFillPart.prototype[method] = util.extend(Part.prototype[method], GapFillPart.prototype[method]);
});
['revealAnswer'].forEach(function(method) {
    GapFillPart.prototype[method] = util.extend(GapFillPart.prototype[method], Part.prototype[method]);
});
Numbas.partConstructors['gapfill'] = util.extend(Part,GapFillPart);
});
