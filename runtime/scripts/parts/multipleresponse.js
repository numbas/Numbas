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
 * @constructor
 * @augments Numbas.parts.Part
 * @memberof Numbas.parts
 */
var MultipleResponsePart = Numbas.parts.MultipleResponsePart = function(path, question, parentPart)
{
    var p = this;
    var settings = this.settings;
    util.copyinto(MultipleResponsePart.prototype.settings,settings);

    /*
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
    */

}
MultipleResponsePart.prototype = /** @lends Numbas.parts.MultipleResponsePart.prototype */
{
    loadFromXML: function(xml) {
        var settings = this.settings;
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        var scope = this.getScope();

        //get number of answers and answer order setting
        if(this.type == '1_n_2' || this.type == 'm_n_2') {
            // the XML for these parts lists the options in the <choices> tag, but it makes more sense to list them as answers
            // so swap "answers" and "choices"
            // this all stems from an extremely bad design decision made very early on
            this.flipped = true;
            this.numChoices = 1;
            settings.answerOrder = settings.choiceOrder;
            settings.choiceOrder = '';
        } else {
            this.flipped = false;
        }


        //work out marks available
        tryGetAttribute(settings,xml,'marking/maxmarks','enabled','maxMarksEnabled');
        if(settings.maxMarksEnabled) {
            tryGetAttribute(this,xml,'marking/maxmarks','value','marks');
        } else {
            tryGetAttribute(this,xml,'.','marks');
        }
        
        //get minimum marks setting
        tryGetAttribute(settings,xml,'marking/minmarks','enabled','minMarksEnabled');
        if(settings.minMarksEnabled) {
            tryGetAttribute(settings,xml,'marking/minmarks','value','minimumMarks');
        }

        //get restrictions on number of choices
        var choicesNode = xml.selectSingleNode('choices');
        if(!choicesNode) {
            this.error('part.mcq.choices missing');
        }

        tryGetAttribute(settings,null,choicesNode,['minimumexpected','maximumexpected','order','displayType'],['minAnswers','maxAnswers','choiceOrder']);

        var choiceNodes = choicesNode.selectNodes('choice');

        var answersNode, answerNodes;

        if(this.type == '1_n_2' || this.type == 'm_n_2') {
            // the XML for these parts lists the options in the <choices> tag, but it makes more sense to list them as answers
            // so swap "answers" and "choices"
            // this all stems from an extremely bad design decision made very early on
            this.numAnswers = choiceNodes.length;
            answersNode = choicesNode;
            answerNodes = choiceNodes;
            choicesNode = null;
        } else {
            this.numChoices = choiceNodes.length;
            answersNode = xml.selectSingleNode('answers');
            if(answersNode) {
                tryGetAttribute(settings,null,answersNode,'order','answerOrder');
                answerNodes = answersNode.selectNodes('answer');
                this.numAnswers = answerNodes.length;
            }
        }
    
        var def;

        function loadDef(def,scope,topNode,nodeName) {
            var values = jme.evaluate(def,scope);
            if(values.type!='list') {
                p.error('part.mcq.options def not a list',nodeName);
            }
            var numValues = values.value.length;
            values.value.map(function(value) {
                var node = xml.ownerDocument.createElement(nodeName);
                var content = xml.ownerDocument.createElement('content');
                var span = xml.ownerDocument.createElement('span');
                content.appendChild(span);
                node.appendChild(content);
                topNode.appendChild(node);

                switch(value.type) {
                case 'string':
                    var d = document.createElement('d');
                    d.innerHTML = value.value;
                    var newNode;
                    try {
                        newNode = xml.ownerDocument.importNode(d,true);
                    } catch(e) {
                        d = Numbas.xml.dp.parseFromString('<d>'+value.value.replace(/&(?!amp;)/g,'&amp;')+'</d>','text/xml').documentElement;
                        newNode = xml.ownerDocument.importNode(d,true);
                    }
                    while(newNode.childNodes.length) {
                        span.appendChild(newNode.childNodes[0]);
                    }

                    break;
                case 'html':
                    var selection = $(value.value);
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
                    break;
                default:
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
            cell.message = $.xsl.transform(Numbas.xml.templates.question,distractorNodes[i]).string;
            cell.message = jme.contentsubvars(cell.message,scope);

            if(this.type == '1_n_2' || this.type == 'm_n_2') {    
                // possible answers are recorded as choices in the multiple choice types.
                // switch the indices round, so we don't have to worry about this again
                cell.answerIndex = cell.choiceIndex;
                cell.choiceIndex = 0;
            }

            distractors[cell.answerIndex][cell.choiceIndex] = cell.message;
        }
        settings.distractors = distractors;
    },

    resume: function() {
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadMultipleResponsePart(this);
        this.shuffleChoices = pobj.shuffleChoices;
        this.shuffleAnswers = pobj.shuffleAnswers;
        this.ticks = pobj.ticks;

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
                    this.stagedAnswer[i][j] = true;
                }
            }
        }
    },

    finaliseLoad: function() {
        var settings = this.settings;
        var scope = this.getScope();

        //get number of answers and answer order setting
        if(this.type == '1_n_2' || this.type == 'm_n_2') {
            settings.answerOrder = settings.choiceOrder;
            settings.choiceOrder = '';
        }

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

        this.marks = util.parseNumber(this.marks) || 0;
        settings.minimumMarks = util.parseNumber(settings.minimumMarks) || 0;

        var minAnswers = jme.subvars(settings.minAnswers, scope);
        minAnswers = jme.evaluate(settings.minAnswers, scope);
        if(minAnswers && minAnswers.type=='number') {
            settings.minAnswers = minAnswers.value;
        } else {
            this.error('part.setting not present','minimum answers');
        }

        var maxAnswers = jme.subvars(settings.maxAnswers, scope);
        maxAnswers = jme.evaluate(settings.maxAnswers, scope);
        if(maxAnswers && maxAnswers.type=='number') {
            settings.maxAnswers = maxAnswers.value;
        } else {
            this.error('part.setting not present','maximum answers');
        }

        // fill layout matrix
        var layout = this.layout = [];
        if(this.type=='m_n_x') {
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
                var layoutMatrix = jme.unwrapValue(jme.evaluate(settings.layoutExpression,scope));
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

        if(this.type=='1_n_2') {
            settings.maxAnswers = 1;
        } else if(settings.maxAnswers==0) {
            settings.maxAnswers = this.numAnswers * this.numChoices;
        }

        this.getCorrectAnswer(scope);

        var matrix = this.settings.matrix;
        
        if(this.marks == 0) {    //if marks not set explicitly
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

        this.display = new Numbas.display.MultipleResponsePartDisplay(this);
    },

    /** Student's last submitted answer/choice selections
     * @type {Array.<Array.<Boolean>>}
     */
    ticks: [],
    
    /** The script to mark this part - assign credit, and give messages and feedback.
     * @type {Numbas.marking.MarkingScript}
     */
    markingScript: Numbas.marking_scripts.multipleresponse,

    /** Number of choices - used by `m_n_x` parts
     * @type {Number}
     */
    numChoices: 0,

    /** Number of answers
     * @type {Number}
     */
    numAnswers: 0,

    /** Have choice and answers been swapped (because of the weird settings for 1_n_2 and m_n_2 parts)
     * @type {Boolean}
     */
    flipped: false,

    /** Properties set when the part is generated
     * Extends {@link Numbas.parts.Part#settings}
     * @property {Boolean} maxMarksEnabled - is there a maximum number of marks the student can get?
     * @property {Number} minAnswers - minimum number of responses the student must select
     * @property {Number} maxAnswers - maxmimum number of responses the student must select
     * @property {String} choiceOrder - order in which to display choices - either `random` or `fixed`
     * @property {String} answerOrder - order in which to display answers - either `random` or `fixed`
     * @property {Array.<Array.<Number>>} matrix - marks for each answer/choice pair. Arranged as `matrix[answer][choice]`
     * @property {String} displayType - how to display the response selectors. Can be `radiogroup` or `checkbox`
     * @property {String} warningType - what to do if the student picks the wrong number of responses? Either `none` (do nothing), `prevent` (don't let the student submit), or `warn` (show a warning but let them submit)
     */
    settings:
    {
        maxMarksEnabled: false,        //is there a maximum number of marks the student can get?
        minAnswers: '0',                //minimum number of responses student must select
        maxAnswers: '0',                //maximum ditto
        choiceOrder: '',            //order in which to display choices
        answerOrder: '',            //order in which to display answers
        matrix: [],                    //marks matrix
        displayType: '',            //how to display the responses? can be: radiogroup, dropdownlist, buttonimage, checkbox, choicecontent
        warningType: ''                //what to do if wrong number of responses
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
                    matrix = matrix.value.map(function(row){    //convert TNums to javascript numbers
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
                          value = jme.evaluate(value,scope).value;
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

        settings.matrix = matrix;
    },

    /** Store the student's choices */
    storeAnswer: function(answerList)
    {
        this.setDirty(true);
        this.display && this.display.removeWarnings();
        //get choice and answer 
        //in MR1_n_2 and MRm_n_2 parts, only the choiceindex matters
        var answerIndex = answerList[0];
        var choiceIndex = answerList[1];

        switch(this.settings.displayType)
        {
        case 'radiogroup':                            //for radiogroup parts, only one answer can be selected.
        case 'dropdownlist':
            for(var i=0; i<this.numAnswers; i++)
            {
                this.stagedAnswer[i][choiceIndex]= i===answerIndex;
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

    /** Get the student's answer as it was entered as a JME data type, to be used in the custom marking algorithm
     * @abstract
     * @returns {Numbas.jme.token}
     */
    rawStudentAnswerAsJME: function() {
        return Numbas.jme.wrapValue(this.ticks);
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
['revealAnswer','loadFromXML','resume','finaliseLoad'].forEach(function(method) {
    MultipleResponsePart.prototype[method] = util.extend(Part.prototype[method],MultipleResponsePart.prototype[method]);
});
['revealAnswer'].forEach(function(method) {
    MultipleResponsePart.prototype[method] = util.extend(MultipleResponsePart.prototype[method], Part.prototype[method]);
});

Numbas.partConstructors['1_n_2'] = util.extend(Part,MultipleResponsePart);
Numbas.partConstructors['m_n_2'] = util.extend(Part,MultipleResponsePart);
Numbas.partConstructors['m_n_x'] = util.extend(Part,MultipleResponsePart);
});

