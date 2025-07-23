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
/** @file The {@link Numbas.parts.PatternMatchPart} object */
Numbas.queueScript('parts/patternmatch', ['base', 'jme', 'jme-variables', 'util', 'part', 'marking_scripts'], function() {
var util = Numbas.util;
var jme = Numbas.jme;
var Part = Numbas.parts.Part;
/** Text-entry part - student's answer must match the given regular expression.
 *
 * @class
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var PatternMatchPart = Numbas.parts.PatternMatchPart = function(path, question, parentPart, store) {
    var settings = this.settings;
    util.copyinto(PatternMatchPart.prototype.settings, settings);
}
PatternMatchPart.prototype = /** @lends Numbas.PatternMatchPart.prototype */ {
    loadFromXML: function(xml) {
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        settings.correctAnswerString = $.trim(Numbas.xml.getTextContent(xml.selectSingleNode('correctanswer')));
        tryGetAttribute(settings, xml, 'correctanswer', ['mode'], ['matchMode']);
        var displayAnswerNode = xml.selectSingleNode('displayanswer');
        if(!displayAnswerNode)
            this.error('part.patternmatch.display answer missing');
        settings.displayAnswerString = $.trim(Numbas.xml.getTextContent(displayAnswerNode));
        tryGetAttribute(settings, xml, 'case', ['sensitive', 'partialCredit'], 'caseSensitive');
    },
    loadFromJSON: function(data) {
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        tryLoad(data, ['answer', 'displayAnswer'], settings, ['correctAnswerString', 'displayAnswerString']);
        tryLoad(data, ['caseSensitive', 'partialCredit', 'matchMode'], settings);
        settings.partialCredit /= 100;
    },
    finaliseLoad: function() {
        this.getCorrectAnswer(this.getScope());
    },
    initDisplay: function() {
        this.display = new Numbas.display.PatternMatchPartDisplay(this);
    },
    resume: function() {
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        this.stagedAnswer = pobj.studentAnswer;
    },
    /** The student's last submitted answer.
     *
     * @type {string}
     */
    studentAnswer: '',
    /** The script to mark this part - assign credit, and give messages and feedback.
     *
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() {
        return new Numbas.marking.MarkingScript(Numbas.raw_marking_scripts.patternmatch, null, this.getScope()); 
    },
    /** Properties set when the part is generated.
     * Extends {@link Numbas.parts.Part#settings}.
     *
     * @property {string} correctAnswerString - The definition of the correct answer, without variables substituted in.
     * @property {RegExp} correctAnswer - Regular expression pattern to match correct answers.
     * @property {string} displayAnswerString - The definition of the display answer, without variables substituted in.
     * @property {string} displayAnswer - A representative correct answer to display when answers are revealed.
     * @property {boolean} caseSensitive - Does case matter?
     * @property {number} partialCredit - Partial credit to award if the student's answer matches, apart from case, and `caseSensitive` is `true`.
     * @property {string} matchMode - Either "regex", for a regular expression, or "exact", for an exact match.
     */
    settings: {
    correctAnswerString: '.*',
    correctAnswer: /.*/,
    displayAnswerString: '',
    displayAnswer: '',
    caseSensitive: false,
    partialCredit: 0,
    matchMode: 'regex'
    },
    /** The name of the input widget this part uses, if any.
     *
     * @returns {string}
     */
    input_widget: function() {
        return 'string';
    },
    /** Options for this part's input widget.
     *
     * @returns {object}
     */
    input_options: function() {
        return {
            allowEmpty: false
        }
    },
    /** Compute the correct answer, based on the given scope.
     *
     * @param {Numbas.jme.Scope} scope
     * @returns {string}
     */
    getCorrectAnswer: function(scope) {
        var settings = this.settings;
        settings.correctAnswer = jme.subvars(settings.correctAnswerString, scope, true);
        switch(this.settings.matchMode) {
            case 'regex':
                settings.correctAnswer = '^'+settings.correctAnswer+'$';
                settings.displayAnswer = jme.subvars(settings.displayAnswerString, scope, true);
                break;
            case 'exact':
                settings.displayAnswer = settings.correctAnswer;
                break;
        }
        return settings.displayAnswer;
    },
    /** Save a copy of the student's answer as entered on the page, for use in marking.
     */
    setStudentAnswer: function() {
        this.studentAnswer = this.stagedAnswer;
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm.
     *
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return new Numbas.jme.types.TString(this.studentAnswer);
    },
};
['finaliseLoad', 'resume', 'loadFromXML', 'loadFromJSON'].forEach(function(method) {
    PatternMatchPart.prototype[method] = util.extend(Part.prototype[method], PatternMatchPart.prototype[method]);
});
Numbas.partConstructors['patternmatch'] = util.extend(Part, PatternMatchPart);
});
