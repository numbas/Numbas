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
Numbas.queueScript('parts/multipleresponse',['base','jme','jme-variables','util','part','marking_scripts'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var Part = Numbas.parts.Part;
/** Multiple choice part - either pick one from a list, pick several from a list, or match choices with answers (2d grid, either pick one from each row or tick several from each row)
 *
 * Types:
 * * `1_n_2`: pick one from a list. Represented as N answers, 1 choice
 * * `m_n_2`: pick several from a list. Represented as N answers, 1 choice
 * * `m_n_x`: match choices (rows) with answers (columns). Represented as N answers, X choices.
 *
 * @class
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @augments Numbas.parts.Part
 * @memberof Numbas.parts
 */
var MultipleResponsePart = Numbas.parts.MultipleResponsePart = function(path, question, parentPart, store)
{
    var p = this;
    var settings = this.settings;
    util.copyinto(MultipleResponsePart.prototype.settings,settings);
}
MultipleResponsePart.prototype = /** @lends Numbas.parts.MultipleResponsePart.prototype */
{
    loadFromXML: function(xml) {
        var p = this;
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        var scope = this.getScope();
        //get number of answers and answer order setting
        if(this.type == '1_n_2' || this.type == 'm_n_2') {
            // the XML for these parts lists the options in the <choices> tag, but it makes more sense to list them as answers
            // so swap "answers" and "choices"
            // this all stems from an extremely bad design decision made very early on
            this.flipped = true;
        } else {
            this.flipped = false;
        }
        //work out marks available
        tryGetAttribute(settings,xml,'.','showCellAnswerState');
        tryGetAttribute(settings,xml,'marking','method','markingMethod');
        tryGetAttribute(settings,xml,'marking/maxmarks','enabled','maxMarksEnabled');
        if(this.type=='1_n_2') {
            settings.maxMarksEnabled = false;
        }
        if(settings.maxMarksEnabled) {
            tryGetAttribute(this,xml,'marking/maxmarks','value','marks');
        } else {
            tryGetAttribute(this,xml,'.','marks');
        }
        //get minimum marks setting
        tryGetAttribute(settings,xml,'marking/minmarks','enabled','minMarksEnabled');
        if(this.type=='1_n_2') {
            settings.minMarksEnabled = false;
        }
        if(settings.minMarksEnabled) {
            tryGetAttribute(settings,xml,'marking/minmarks','value','minimumMarks');
        }
        //get restrictions on number of choices
        var choicesNode = xml.selectSingleNode('choices');
        if(!choicesNode) {
            this.error('part.mcq.choices missing');
        }
        tryGetAttribute(settings,null,choicesNode,['minimumexpected','maximumexpected','shuffle','displayType','displayColumns'],['minAnswersString','maxAnswersString','shuffleChoices']);
        var choiceNodes = choicesNode.selectNodes('choice');
        var answersNode, answerNodes;
        if(this.type == '1_n_2' || this.type == 'm_n_2') {
            // the XML for these parts lists the options in the <choices> tag, but it makes more sense to list them as answers
            // so swap "answers" and "choices"
            // this all stems from an extremely bad design decision made very early on
            this.numAnswers = choiceNodes.length;
            this.numChoices = 1;
            answersNode = choicesNode;
            choicesNode = null;
        } else {
            this.numChoices = choiceNodes.length;
            answersNode = xml.selectSingleNode('answers');
            if(answersNode) {
                tryGetAttribute(settings,null,answersNode,'shuffle','shuffleAnswers');
                answerNodes = answersNode.selectNodes('answer');
                this.numAnswers = answerNodes.length;
            }
        }
        var def;
        /** Load the definition of the choice or answer labels.
         *
         * @param {JME} def
         * @param {Numbas.jme.Scope} scope
         * @param {Element} topNode - Parent element of the list of labels
         * @param {string} nodeName - 'choice' or 'answer'.
         * @returns {number} - The number of items.
         */
        function loadDef(def,scope,topNode,nodeName) {
            var values = jme.evaluate(def,scope);
            if(!jme.isType(values,'list')) {
                p.error('part.mcq.options def not a list',{properties: nodeName});
            }
            var numValues = jme.castToType(values,'list').value.length;
            values.value.map(function(value) {
                var node = xml.ownerDocument.createElement(nodeName);
                var content = xml.ownerDocument.createElement('content');
                var span = xml.ownerDocument.createElement('span');
                content.appendChild(span);
                node.appendChild(content);
                topNode.appendChild(node);
                /** Load a string representing the text of a label into the `span` element for this label.
                 *
                 * @param {string} str
                 */
                function load_string(str) {
                    var d = document.createElement('d');
                    d.innerHTML = str;
                    var newNode;
                    try {
                        newNode = xml.ownerDocument.importNode(d,true);
                    } catch(e) {
                        d = Numbas.xml.dp.parseFromString('<d>'+str.replace(/&(?!amp;)/g,'&amp;')+'</d>','text/xml').documentElement;
                        newNode = xml.ownerDocument.importNode(d,true);
                    }
                    while(newNode.childNodes.length) {
                        span.appendChild(newNode.childNodes[0]);
                    }
                }
                if(jme.isType(value,'string')) {
                    load_string(jme.castToType(value,'string').value);
                } else if(jme.isType(value,'number')) {
                    load_string(Numbas.math.niceRealNumber(jme.castToType(value,'string')));
                } else if(jme.isType(value,'html')) {
                    var selection = $(jme.castToType(value,'html').value);
                    for(var i=0;i<selection.length;i++) {
                        try {
                            span.appendChild(xml.ownerDocument.importNode(selection[i],true));
                        } catch(e) {
                            var d = Numbas.xml.dp.parseFromString('<d>'+selection[i].outerHTML+'</d>','text/xml').documentElement;
                            var newNode = xml.ownerDocument.importNode(d,true);
                            while(newNode.childNodes.length) {
                                span.appendChild(newNode.childNodes[0]);
                            }
                        }
                    }
                } else {
                    span.appendChild(xml.ownerDocument.createTextNode(value));
                }
            });
            return numValues;
        }
        if(def = answersNode.getAttribute('def')) {
            settings.answersDef = def;
            var nodeName = this.flipped ? 'choice' : 'answer';
            loadDef(settings.answersDef,scope,answersNode,nodeName);
            answerNodes = answersNode.selectNodes(nodeName);
            this.numAnswers = answerNodes.length;
        }
        if(choicesNode && (def = choicesNode.getAttribute('def'))) {
            settings.choicesDef = def;
            loadDef(settings.choicesDef,scope,choicesNode,'choice');
            choiceNodes = choicesNode.selectNodes('choice');
            this.numChoices = choiceNodes.length;
        }
        //get warning type and message for wrong number of choices
        warningNode = xml.selectSingleNode('marking/warning');
        if(warningNode) {
            tryGetAttribute(settings,null,warningNode,'type','warningType');
        }
        if(this.type=='m_n_x') {
            var layoutNode = xml.selectSingleNode('layout');
            tryGetAttribute(settings,null,layoutNode,['type','expression'],['layoutType','layoutExpression']);
        }
        //fill marks matrix
        var def;
        var markingMatrixNode = xml.selectSingleNode('marking/matrix');
        var markingMatrixString = markingMatrixNode.getAttribute('def');
        var useMarkingString = settings.answersDef || settings.choicesDef || (typeof markingMatrixString == "string");
        if(useMarkingString) {
            settings.markingMatrixString = markingMatrixString;
            if(!settings.markingMatrixString) {
                this.error('part.mcq.marking matrix string empty')
            }
        } else {
            var matrixNodes = xml.selectNodes('marking/matrix/mark');
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
                markingMatrixArray[cell.answerIndex][cell.choiceIndex] = cell.value;
            }
        }
        var distractors = [];
        for( i=0; i<this.numAnswers; i++ ) {
            var row = [];
            for(var j=0;j<this.numChoices;j++) {
                row.push('');
            }
            distractors.push(row);
        }
        var distractorNodes = xml.selectNodes('marking/distractors/distractor');
        for( i=0; i<distractorNodes.length; i++ )
        {
            var cell = {message: ""};
            tryGetAttribute(cell,null, distractorNodes[i], ['answerIndex', 'choiceIndex']);
            cell.message = Numbas.xml.transform(Numbas.xml.templates.question,distractorNodes[i]);
            cell.message = jme.contentsubvars(cell.message,scope);
            if(this.type == '1_n_2' || this.type == 'm_n_2') {
                // possible answers are recorded as choices in the multiple choice types.
                // switch the indices round, so we don't have to worry about this again
                cell.answerIndex = cell.choiceIndex;
                cell.choiceIndex = 0;
            }
            distractors[cell.answerIndex][cell.choiceIndex] = util.isNonemptyHTML(cell.message) ? cell.message : '';
        }
        settings.distractors = distractors;
    },
    loadFromJSON: function(data) {
        var settings = this.settings;
        var tryLoad = Numbas.json.tryLoad;
        var scope = this.getScope();
        //get number of answers and answer order setting
        if(this.type == '1_n_2' || this.type == 'm_n_2') {
            this.flipped = true;
        } else {
            this.flipped = false;
        }
        if(this.type!='1_n_2') {
            tryLoad(data, ['maxMarks'], this, ['marks']);
        }
        tryLoad(data, ['minMarks'], settings, ['minimumMarks']);
        tryLoad(data, ['minAnswers', 'maxAnswers', 'shuffleChoices', 'shuffleAnswers', 'displayType','displayColumns'], settings, ['minAnswersString', 'maxAnswersString', 'shuffleChoices', 'shuffleAnswers', 'displayType','displayColumns']);
        tryLoad(data, ['warningType'], settings);
        tryLoad(data.layout, ['type', 'expression'], settings, ['layoutType', 'layoutExpression']);
        if('choices' in data) {
            if(typeof(data.choices)=='string') {
                choices = jme.evaluate(data.choices, scope);
                if(!choices || !jme.isType(choices,'list')) {
                    this.error('part.mcq.options def not a list',{properties: 'choice'});
                }
                settings.choices = jme.unwrapValue(jme.castToType(choices,'list'));
            } else {
                settings.choices = data.choices;
            }
            this.numChoices = settings.choices.length;
        }
        if('answers' in data) {
            if(typeof(data.answers)=='string') {
                answers = jme.evaluate(data.answers, scope);
                if(!answers || !jme.isType(answers,'list')) {
                    this.error('part.mcq.options def not a list',{properties: 'answer'});
                }
                settings.answers = jme.unwrapValue(jme.castToType(answers,'list'));
            } else {
                settings.answers = data.answers;
            }
            this.numAnswers = settings.answers.length;
        }
        if(this.flipped) {
            this.numAnswers = 1;
        }
        if(typeof(data.matrix)=='string') {
            settings.markingMatrixString = data.matrix;
        } else {
            settings.markingMatrixArray = data.matrix.map(function(row){return typeof(row)=='object' ? row : [row]});
            if(!this.flipped) {
                var m = settings.markingMatrixArray;
                m.rows = this.numChoices;
                m.columns = this.numAnswers;
                settings.markingMatrixArray = Numbas.matrixmath.transpose(settings.markingMatrixArray);
            }
        }
        if(this.flipped) {
            this.numAnswers = this.numChoices;
            this.numChoices = 1;
            this.answers = this.choices;
            this.choices = null;
        }
        tryLoad(data, ['distractors'], settings);
        if(settings.distractors && (this.type=='1_n_2' || this.type=='m_n_2')) {
            settings.distractors = settings.distractors.map(function(d){return [d]});
        }
        if(!settings.distractors) {
            settings.distractors = [];
            for(var i=0;i<this.numAnswers; i++) {
                var row = [];
                for(var j=0;j<this.numChoices; j++) {
                    row.push('');
                }
                settings.distractors.push(row);
            }
        }
    },
    resume: function() {
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        this.shuffleChoices = pobj.shuffleChoices;
        this.shuffleAnswers = pobj.shuffleAnswers;
        this.ticks = pobj.studentAnswer;
        this.stagedAnswer = [];
        for( i=0; i<this.numAnswers; i++ ) {
            this.stagedAnswer.push([]);
            for( var j=0; j<this.numChoices; j++ ) {
                this.stagedAnswer[i].push(pobj.studentAnswer[i][j] || false);
            }
        }
    },
    finaliseLoad: function() {
        var settings = this.settings;
        var scope = this.getScope();
        if(settings.displayType=='radiogroup') {
            settings.markingMethod = 'sum ticked cells';
        }
        //get number of answers and answer order setting
        if(this.type == '1_n_2' || this.type == 'm_n_2') {
            settings.shuffleAnswers = settings.shuffleChoices;
            settings.shuffleChoices = false;
        }
        this.shuffleChoices = [];
        if(settings.shuffleChoices) {
            this.shuffleChoices = math.deal(this.numChoices);
        } else {
            this.shuffleChoices = math.range(this.numChoices);
        }
        this.shuffleAnswers = [];
        if(settings.shuffleAnswers) {
            this.shuffleAnswers = math.deal(this.numAnswers);
        } else {
            this.shuffleAnswers = math.range(this.numAnswers);
        }
        this.marks = util.parseNumber(this.marks) || 0;
        settings.minimumMarks = util.parseNumber(settings.minimumMarks) || 0;
        var minAnswers = jme.subvars(settings.minAnswersString, scope);
        minAnswers = jme.evaluate(minAnswers, scope);
        try {
            settings.minAnswers = jme.castToType(minAnswers,'number').value;
        } catch(e) {
            this.error('part.setting not present',{property: 'minimum answers'});
        }
        var maxAnswers = jme.subvars(settings.maxAnswersString, scope);
        maxAnswers = jme.evaluate(maxAnswers, scope);
        try {
            settings.maxAnswers = jme.castToType(maxAnswers,'number').value;
        } catch(e) {
            this.error('part.setting not present',{property: 'maximum answers'});
        }
        // fill layout matrix
        var layout = this.layout = [];
        if(this.type=='m_n_x') {
            if(settings.layoutType=='expression') {
                // expression can either give a 2d array (list of lists) or a matrix
                // note that the list goes [row][column], unlike all the other properties of this part object, which go [column][row], i.e. they're indexed by answer then choice
                // it's easier for question authors to go [row][column] because that's how they're displayed, but it's too late to change the internals of the part to match that now
                // I have only myself to thank for this - CP
                var layoutMatrix = jme.unwrapValue(jme.evaluate(settings.layoutExpression,scope));
                var layoutFunction = function(row,column) { return layoutMatrix[row][column]; };
            } else {
                var layoutFunction = MultipleResponsePart.layoutTypes[settings.layoutType];
            }
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
        if(this.type=='1_n_2') {
            settings.maxAnswers = 1;
        } else if(settings.maxAnswers==0) {
            settings.maxAnswers = this.numAnswers * this.numChoices;
        }
        this.getCorrectAnswer(scope);
        if(this.marks == 0) {    //if marks not set explicitly
            var matrix = this.settings.matrix;
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
    },
    initDisplay: function() {
        this.display = new Numbas.display.MultipleResponsePartDisplay(this);
    },
    /** Student's last submitted answer/choice selections.
     *
     * @type {Array.<Array.<boolean>>}
     */
    ticks: [],
    /** The script to mark this part - assign credit, and give messages and feedback.
     *
     * @returns {Numbas.marking.MarkingScript}
     */
    baseMarkingScript: function() { return new Numbas.marking.MarkingScript(Numbas.raw_marking_scripts.multipleresponse,null,this.getScope()); },
    /** Number of choices - used by `m_n_x` parts.
     *
     * @type {number}
     */
    numChoices: 0,
    /** Number of answers.
     *
     * @type {number}
     */
    numAnswers: 0,
    /** Have choice and answers been swapped (because of the weird settings for 1_n_2 and m_n_2 parts)?
     *
     * @type {boolean}
     */
    flipped: false,
    /** Properties set when the part is generated.
     * Extends {@link Numbas.parts.Part#settings}.
     *
     * @property {string} markingMethod - The marking method to use for "choose several" or "match choices with answers" parts - one of `sum ticked cells`, `score per matched cell` or `all-or-nothing`.
     * @property {boolean} maxMarksEnabled - Is there a maximum number of marks the student can get?
     * @property {string} minAnswersString - Minimum number of responses the student must select, without variables substituted in.
     * @property {string} maxAnswersString - Maximum number of responses the student must select, without variables substituted in.
     * @property {number} minAnswers - Minimum number of responses the student must select. Generated from `minAnswersString`.
     * @property {number} maxAnswers - Maximum number of responses the student must select. Generated from `maxAnswersString`.
     * @property {string} shuffleChoices - Should the order of choices be randomised?
     * @property {string} shuffleAnswers - Should the order of answers be randomised?
     * @property {Array.<Array.<number>>} matrix - Marks for each answer/choice pair. Arranged as `matrix[answer][choice]`.
     * @property {string} displayType - How to display the response selectors. Can be `radiogroup`, `checkbox` or `dropdownlist`.
     * @property {number} displayColumns - How many columns to use to display the choices.
     * @property {string} warningType - What to do if the student picks the wrong number of responses? Either `none` (do nothing), `prevent` (don't let the student submit), or `warn` (show a warning but let them submit).
     * @property {string} layoutType - The kind of layout to use. See {@link Numbas.parts.MultipleResponsePart.layoutTypes}.
     * @property {JME} layoutExpression - Expression giving a 2d array or matrix describing the layout when `layoutType` is `'expression'`.
     */
    settings:
    {
        markingMethod: 'sum ticked cells',
        maxMarksEnabled: false,        //is there a maximum number of marks the student can get?
        minAnswersString: '0',                //minimum number of responses student must select
        maxAnswersString: '0',                //maximum ditto
        minAnswers: 0,                //minimum number of responses student must select
        maxAnswers: 0,                //maximum ditto
        shuffleChoices: false,
        shuffleAnswers: false,
        matrix: [],                    //marks matrix
        displayType: 'radiogroup',            //how to display the responses? can be: radiogroup, dropdownlist, buttonimage, checkbox, choicecontent
        warningType: 'none',                //what to do if wrong number of responses
        layoutType: 'all',
        layoutExpression: ''
    },
    /** The name of the input widget this part uses, if any.
     *
     * @returns {string}
     */
    input_widget: function() {
        switch(this.type) {
            case '1_n_2':
                switch(this.settings.displayType) {
                    case 'radiogroup':
                        return 'radios'	;
                    case 'dropdownlist':
                        return 'dropdown';
                }
            case 'm_n_2':
                return 'checkboxes';
            case 'm_n_x':
                return 'm_n_x';
        }
    },
    /** Options for this part's input widget.
     *
     * @returns {object}
     */
    input_options: function() {
        return {
            choices: this.settings.choices,
            answers: this.settings.answers,
            displayType: this.settings.displayType,
            layout: this.layout,
            answerAsArray: true
        };
    },
    /** Compute the correct answer, based on the given scope - a matrix filled with 1 for choices that should be selected, and 0 otherwise.
     *
     * @param {Numbas.jme.Scope} scope
     * @returns {matrix}
     */
    getCorrectAnswer: function(scope) {
        var settings = this.settings;
        var matrix = [];
        if(settings.markingMatrixString) {
            matrix = jme.evaluate(settings.markingMatrixString,scope);
            var sig = Numbas.jme.signature;
            var m;
            if(m=sig.type('matrix')([matrix])) {
                matrix = jme.castToType(matrix,m[0]).value;
            } else if(m=sig.listof(sig.type('number'))([matrix])) {
                matrix = jme.castToType(matrix,m[0]).value.map(function(e) {
                    return [e.value];
                });
                matrix.rows = matrix.length;
                matrix.columns = matrix[0].length;
            } else if(m=sig.listof(sig.listof(sig.type('number')))([matrix])) {
                matrix = jme.castToType(matrix,m[0]).value.map(function(row) {
                    return row.value.map(function(e){return e.value;});
                });
                matrix.rows = matrix.length;
                matrix.columns = matrix[0].length;
            } else {
                this.error('part.mcq.matrix not a list');
            }
            if(this.flipped) {
                matrix = Numbas.matrixmath.transpose(matrix);
            }
            if(matrix.length!=this.numChoices) {
                this.error('part.mcq.matrix wrong size');
            }
            // take into account shuffling;
            for(var i=0;i<this.numChoices;i++) {
                if(matrix[i].length!=this.numAnswers) {
                    this.error('part.mcq.matrix wrong size');
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
                        if(value == ''){
                          this.error('part.mcq.matrix cell empty',{part:this.path,row:i,column:j});
                        }
                        try {
                          value = jme.castToType(jme.evaluate(value,scope),'number').value;
                        } catch(e) {
                          this.error('part.mcq.matrix jme error',{part:this.path,row:i,column:j,error:e.message});
                        }
                        if(!util.isFloat(value)) {
                          this.error('part.mcq.matrix not a number',{part:this.path,row:i,column:j});
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
        switch(this.type) {
        case '1_n_2':
            var max = 0, maxi = null;
            for(var i=0;i<this.numAnswers;i++) {
                if(matrix[i][0]>max || maxi===null) {
                    max = matrix[i][0];
                    maxi = i;
                }
            }
            var best = [];
            for(var i=0;i<this.numAnswers;i++) {
                best.push([i==maxi]);
            }
            settings.maxMatrix = best;
            break;
        case 'm_n_2':
            settings.maxMatrix = matrix.map(function(r){ return [r[0]>0]; });
            break;
        case 'm_n_x':
            switch(this.settings.displayType) {
                case 'radiogroup':
                    var correctTicks = [];
                    for(var i=0; i<this.numChoices; i++) {
                        var maxj=-1,max=0;
                        for(var j=0;j<this.numAnswers; j++) {
                            if(maxj==-1 || matrix[j][i]>max) {
                                maxj = j;
                                max = matrix[j][i];
                            }
                        }
                        correctTicks.push(maxj);
                    }
                    settings.maxMatrix = matrix.map(function(r,j) { return r.map(function(c,i) { return j==correctTicks[i]; }) });
                    break;
                case 'checkbox':
                    settings.maxMatrix = matrix.map(function(r) { return r.map(function(c){ return c>0; }) });
                    break;
            }
            break;
        }
        settings.matrix = matrix;
        return settings.maxMatrix;
    },
    /** Store the student's choices.
     *
     * @param {object} answer - Object with properties `answer` and `choice`, giving the index of the chosen item.
     * */
    storeTick: function(answer)
    {
        //get choice and answer
        //in MR1_n_2 and MRm_n_2 parts, only the choiceindex matters
        var answerIndex = answer.answer;
        var choiceIndex = answer.choice;
        switch(this.settings.displayType) {
            case 'radiogroup':                            //for radiogroup parts, only one answer can be selected.
            case 'dropdownlist':
                for(var i=0; i<this.numAnswers; i++) {
                    this.stagedAnswer[i][choiceIndex] = i===answerIndex;
                }
                break;
            default:
                this.stagedAnswer[answerIndex][choiceIndex] = answer.ticked;
        }
        this.storeAnswer(this.stagedAnswer);
    },
    /** Save a copy of the student's answer as entered on the page, for use in marking.
     */
    setStudentAnswer: function() {
        this.ticks = util.copyarray(this.stagedAnswer,true);
    },
    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm.
     *
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return Numbas.jme.wrapValue(this.ticks);
    },
    /** Get the student's answer as a JME data type, to be used in error-carried-forward calculations.
     *
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
    /** Reveal the correct answers, and any distractor messages for the student's choices.
     * Extends {@link Numbas.parts.Part.revealAnswer}.
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
    },

    marking_parameters: function(studentAnswer) {
        var obj = Part.prototype.marking_parameters.apply(this,[studentAnswer]);
        obj.shuffleChoices = jme.wrapValue(this.shuffleChoices);
        obj.shuffleAnswers = jme.wrapValue(this.shuffleAnswers);
        obj.layout = jme.wrapValue(this.layout);
        return obj;
    }
};
['resume','finaliseLoad','loadFromXML','loadFromJSON'].forEach(function(method) {
    MultipleResponsePart.prototype[method] = util.extend(Part.prototype[method],MultipleResponsePart.prototype[method]);
});
['revealAnswer'].forEach(function(method) {
    MultipleResponsePart.prototype[method] = util.extend(MultipleResponsePart.prototype[method], Part.prototype[method]);
});

/** Layouts for multiple response types.
 *
 * @type {object.<Function>}
 */
Numbas.parts.MultipleResponsePart.layoutTypes = {
    all: function(row,column) { return true; },
    lowertriangle: function(row,column) { return row>=column; },
    strictlowertriangle: function(row,column) { return row>column; },
    uppertriangle: function(row,column) { return row<=column; },
    strictuppertriangle: function(row,column) { return row<column; }
};
Numbas.partConstructors['1_n_2'] = util.extend(Part,MultipleResponsePart);
Numbas.partConstructors['m_n_2'] = util.extend(Part,MultipleResponsePart);
Numbas.partConstructors['m_n_x'] = util.extend(Part,MultipleResponsePart);
});
