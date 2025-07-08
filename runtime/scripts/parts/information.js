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
/** @file The {@link Numbas.parts.} object */
Numbas.queueScript('parts/information',['base','jme','jme-variables','util','part'],function() {
var util = Numbas.util;
var Part = Numbas.parts.Part;
/** Information only part - no input, no marking, just display some content to the student.
 *
 * @class
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var InformationPart = Numbas.parts.InformationPart = function(path, question, parentPart, store) {
}
InformationPart.prototype = /** @lends Numbas.parts.InformationOnlyPart.prototype */ {
    assignName: function(index) {
        if(this.useCustomName) {
            Part.prototype.assignName.apply(this,arguments);
            return false;
        }
        return false;
    },

    loadFromXML: function() {
    },
    loadFromJSON: function() {
    },
    finaliseLoad: function() {
        this.answered = true;
        this.isDirty = false;
    },
    initDisplay: function() {
        this.display = new Numbas.display.InformationPartDisplay(this);
    },
    /** This part is always valid.
     *
     * @returns {boolean} true
     */
    validate: function() {
        this.answered = true;
        return true;
    },
    /** This part is never dirty.
     */
    setDirty: function() {
        this.isDirty = false;
    },
    hasStagedAnswer: function() {
        return true;
    },
    doesMarking: false
};
['finaliseLoad','loadFromXML','loadFromJSON'].forEach(function(method) {
    InformationPart.prototype[method] = util.extend(Part.prototype[method], InformationPart.prototype[method]);
});
Numbas.partConstructors['information'] = util.extend(Part,InformationPart);
});
