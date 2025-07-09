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
Numbas.queueScript('parts/gapfill', ['base', 'jme', 'jme-variables', 'util', 'part', 'marking_scripts'], function() {
var util = Numbas.util;
var jme = Numbas.jme;
var Part = Numbas.parts.Part;
/** Gap-fill part: text with multiple input areas, each of which is its own sub-part, known as a 'gap'.
 *
 * @class
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var GapFillPart = Numbas.parts.GapFillPart = function(path, question, parentPart, store) {
    util.copyinto(GapFillPart.prototype.settings, this.settings);
}
GapFillPart.prototype = /** @lends Numbas.parts.GapFillPart.prototype */
{
    /** Properties set when the part is generated.
     *
     * Extends {@link Numbas.parts.Part#settings}
     *
     * @property {boolean} sortAnswers - Should the student's answers to the gaps be put in ascending order before marking?
     */
    settings: {
        sortAnswers: false
    },

    loadFromXML: function(xml) {
        var gapXML = xml.selectNodes('gaps/part');
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        this.marks = 0;
        tryGetAttribute(settings, xml, 'marking', ['sortanswers'], ['sortAnswers']);
        for( var i=0 ; i<gapXML.length; i++ ) {
            var gap = Numbas.createPartFromXML(i, gapXML[i], this.path+'g'+i, this.question, this, this.store);
            this.addGap(gap, i);
        }
    },
    loadFromJSON: function(data) {
        var p = this;
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        tryLoad(data, ['sortAnswers'], settings);
        if('gaps' in data) {
            data.gaps.forEach(function(gd, i) {
                var gap = Numbas.createPartFromJSON(i, gd, p.path+'g'+i, p.question, p, p.store);
                p.addGap(gap, i)
            });
        }
    },
    finaliseLoad: function() {
        if(this.settings.sortAnswers && this.gaps.length) {
            var type = this.gaps[0].type;
            if(this.gaps.some(function(g) {
                return g.type != type;
            })) {
                this.settings.sortAnswers = false;
            }
        }
    },
    initDisplay: function() {
        this.display = new Numbas.display.GapFillPartDisplay(this);
    },

    /** The total marks available for this part, after applying adaptive marking and steps penalties.
     *
     * @returns {number}
     */
    availableMarks: function() {
        var marks = 0;
        for(var i=0;i<this.gaps.length;i++) {
            marks += this.gaps[i].marks;
        }
        if(this.adaptiveMarkingUsed) {
            marks -= this.settings.adaptiveMarkingPenalty;
        }
        if(this.steps.length && this.stepsShown) {
            marks -= this.settings.stepsPenalty;
        }
        marks = Math.max(Math.min(this.marks, marks), 0);
        return marks;
    },


    /** Add a gap to this part.
     *
     * @param {Numbas.parts.Part} gap
     * @param {number} index - the position of the gap
     */
    addGap: function(gap, index) {
        gap.isGap = true;
        this.marks += gap.marks;
        this.gaps.splice(index, 0, gap);
    },
    resume: function() {
        var p = this;
        this.gaps.forEach(function(g) {
            g.resume();
            p.answered = p.answered || g.answered;
        });
    },
    /** Student's answers as visible on the screen (not necessarily yet submitted).
     *
     * @type {Array.<string>}
     */
    stagedAnswer: undefined,
    /** Has the student entered an answer to this part?
     *
     * @see Numbas.parts.Part#stagedAnswer
     * @returns {boolean}
     */
    hasStagedAnswer: function() {
        return this.gaps.some(function(g) {
            return g.hasStagedAnswer();
        });
    },
    /** The script to mark this part - assign credit, and give messages and feedback.
     *
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() {
        return new Numbas.marking.MarkingScript(Numbas.raw_marking_scripts.gapfill, null, this.getScope());
    },
    /** Reveal the answers to all of the child gaps.
     *
     * @param {boolean} dontStore - don't tell the storage that this is happening - use when loading from storage to avoid callback loops
     * @augments Numbas.parts.Part#revealAnswer
     */
    revealAnswer: function(dontStore) {
        for(var i=0; i<this.gaps.length; i++)
            this.gaps[i].revealAnswer(dontStore);
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm.
     *
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        if(this.gaps.some(function(g) {
            return g.rawStudentAnswerAsJME()===undefined;
        })) {
            return undefined;
        }
        return new Numbas.jme.types.TList(this.gaps.map(function(g) {
            return g.rawStudentAnswerAsJME()
        }));
    },
    storeAnswer: function(answer) {
        this.gaps.forEach(function(g, i) {
            g.storeAnswer(answer[i]);
        })
    },
    setStudentAnswer: function() {
        this.studentAnswer = this.gaps.map(function(g) {
            g.setStudentAnswer();
            return g.studentAnswer;
        });
    },
    /** Get the student's answer as a JME data type, to be used in error-carried-forward calculations.
     *
     * @abstract
     * @returns {Numbas.jme.token}
     */
    studentAnswerAsJME: function() {
        return new Numbas.jme.types.TList(this.gaps.map(function(g) {
            return g.studentAnswerAsJME()
        }));
    },

    getCorrectAnswer: function(scope) {
        return this.gaps.map(function(g) {
            return g.getCorrectAnswer(scope);
        });
    },

    marking_parameters: function(studentAnswer, pre_submit_parameters) {
        var p = this;
        var parameters = Part.prototype.marking_parameters.apply(this, arguments);
        var adaptive_order = [];

        /** Detect cyclic references in adaptive marking variable replacements.
         * Visit a gap, and raise an error if it's been visited before, i.e. there's a cycle in the graph of variable replacement dependencies.
         * Then, visit each of the gaps that this gap depends on for variable replacements.
         *
         * @param {Numbas.parts.Part} g - The gap being visited.
         * @param {Array.<Numbas.parts.Part>} path - The gaps that have already been visited.
         */
        function visit(g, path) {
            var i = p.gaps.indexOf(g);
            if(i<0) {
                return;
            }
            path = path || [];
            var pi = path.indexOf(g);
            if(pi>=0) {
                p.error('part.gapfill.cyclic adaptive marking', {name1: g.name, name2: path[pi+1].name});
            }
            g.settings.errorCarriedForwardReplacements.forEach(function(vr) {
                visit(p.question.getPart(vr.part), path.concat([g]));
            })
            if(adaptive_order.indexOf(i)==-1) {
                adaptive_order.push(i);
            }
        }
        p.gaps.forEach(function(g) {
            visit(g);
        });
        parameters['gap_adaptive_order'] = jme.wrapValue(adaptive_order);
        return parameters;
    },

    lock: function() {
        this.gaps.forEach(function(g) {
            g.lock();
        });
    }
};
['loadFromXML', 'resume', 'finaliseLoad', 'loadFromJSON', 'storeAnswer', 'lock'].forEach(function(method) {
    GapFillPart.prototype[method] = util.extend(Part.prototype[method], GapFillPart.prototype[method]);
});
['revealAnswer'].forEach(function(method) {
    GapFillPart.prototype[method] = util.extend(GapFillPart.prototype[method], Part.prototype[method]);
});
Numbas.partConstructors['gapfill'] = util.extend(Part, GapFillPart);
});
