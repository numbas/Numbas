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
Numbas.queueScript('parts/extension', ['base', 'util', 'part'], function() {
var util = Numbas.util;
var Part = Numbas.parts.Part;
/** Extension part - validation and marking should be filled in by an extension, or custom javascript code belonging to the question.
 *
 * @class
 * @param {Element} xml
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var ExtensionPart = Numbas.parts.ExtensionPart = function(xml, path, question, parentPart, store) {
}
ExtensionPart.prototype = /** @lends Numbas.parts.ExtensionPart.prototype */ {
    loadFromXML: function() {},
    loadFromJSON: function() {},
    finaliseLoad: function() {},
    initDisplay: function() {
        this.display = new Numbas.display.ExtensionPartDisplay(this);
    },
    hasStagedAnswer: function() {
        return true;
    },
    doesMarking: true,
    /** Return suspend data for this part so it can be restored when resuming the exam - must be implemented by an extension or the question.
     *
     * @returns {object}
     */
    createSuspendData: function() {
        return {};
    },
    /** Get the suspend data created in a previous session for this part, if it exists.
     *
     * @returns {object}
     */
    loadSuspendData: function() {
        if(!this.store) {
            return undefined;
        }
        var pobj = this.store.loadExtensionPart(this);
        if(pobj) {
            return pobj.extension_data;
        }
        return undefined;
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm.
     *
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return new Numbas.jme.types.TNothing();
    },

    /** The script to mark this part - assign credit, and give messages and feedback.
     *
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() {
        return new Numbas.marking.MarkingScript('mark: nothing\n\ninterpreted_answer: nothing', null, this.getScope());
    },
};
['finaliseLoad', 'loadFromXML', 'loadFromJSON'].forEach(function(method) {
    ExtensionPart.prototype[method] = util.extend(Part.prototype[method], ExtensionPart.prototype[method]);
});
Numbas.partConstructors['extension'] = util.extend(Part, ExtensionPart);
});
