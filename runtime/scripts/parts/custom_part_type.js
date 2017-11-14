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

Numbas.queueScript('parts/custom_part_type',['base','jme','jme-variables','util','part'],function() {

var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var types = Numbas.jme.types;

var Part = Numbas.parts.Part;

/** Custom part - a part type defined in {@link Numbas.custom_part_types}
 * @constructor
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var CustomPart = Numbas.parts.CustomPart = function(path, question, parentPart, loading) {
    this.raw_settings = {};
    this.input_options = {};
}
CustomPart.prototype = /** @lends Numbas.parts.CustomPart.prototype */ {
    getDefinition: function() {
        this.definition = Numbas.custom_part_types[this.type];
        this.setMarkingScript(this.definition.marking_script);
    },

    loadFromXML: function(xml) {
        var p = this;
        var raw_settings = this.raw_settings;
        this.getDefinition();
        var tryGetAttribute = Numbas.xml.tryGetAttribute;

        var settingNodes = xml.selectNodes('settings/setting');
        settingNodes.forEach(function(settingNode) {
            var name = settingNode.getAttribute('name');
            var value = settingNode.getAttribute('value');
            raw_settings[name] = JSON.parse(value);
        });

        // create the JME marking script for the part
        var markingScriptNode = this.xml.selectSingleNode('markingalgorithm');
        var markingScriptString = Numbas.xml.getTextContent(markingScriptNode).trim();
        var markingScript = {};
        tryGetAttribute(markingScript,this.xml,markingScriptNode,['extend']);
        if(markingScriptString) {
            // extend the base marking algorithm if asked to do so
            var extend_base = markingScript.extend;
            this.setMarkingScript(markingScriptString,extend_base);
        }
    },

    loadFromJSON: function() {
    },

    finaliseLoad: function() {
        var p = this;
        var settings = this.settings;
        var raw_settings = this.raw_settings;
        var scope = this.getScope();

        this.definition.settings.forEach(function(s) {
            var name = s.name;
            var value = raw_settings[name];
            if(!p.setting_evaluators[s.input_type]) {
                p.error('part.custom.unrecognised input type',{input_type:s.input_type});
            }
            settings[name] = p.setting_evaluators[s.input_type].call(p, s, value);
        });

        var settings_scope = new Numbas.jme.Scope([scope,{variables:{settings:new Numbas.jme.types.TDict(settings)}}]);
        var raw_input_options = this.definition.input_options;

        ['correctAnswer','hint'].forEach(function(option) {
            if(raw_input_options[option]===undefined) {
                p.error('part.custom.input option missing',{option:option});
            }
        })

        for(var option in raw_input_options) {
            try {
                p.input_options[option] = Numbas.jme.unwrapValue(settings_scope.evaluate(raw_input_options[option]));
            } catch(e) {
                p.error('part.custom.error evaluating input option',{option:option,error:e.message});
            }
        }

        try {
            this.getCorrectAnswer(this.getScope());
        } catch(e) {
            this.error(e.message);
        }

        if(Numbas.display) {
            this.display = new Numbas.display.CustomPartDisplay(this);
        }
    },

    getCorrectAnswer: function(scope) {
        var settings = this.settings;
        this.correctAnswer = scope.evaluate(this.definition.input_options.correctAnswer, {settings: this.settings});
    },

    setStudentAnswer: function() {
        this.studentAnswer = this.stagedAnswer;
    },

    rawStudentAnswerAsJME: function() {
        return this.student_answer_jme_types[this.definition.input_widget](this.studentAnswer);
    },

    student_answer_jme_types: {
        'string': function(answer) {
            return new types.TString(answer);
        },
        'number': function(answer) {
            return new types.TNum(util.parseNumber(answer));
        },
        'jme': function(answer) {
            return new types.TExpression(answer);
        },
        'matrix': function(answer) {
            return new types.TMatrix(answer);
        },
        'radios': function(answer) {
            return new types.TNum(answer);
        },
        'checkboxes': function(answer) {
            return new types.TList(answer.map(function(ticked){ return new types.TBool(ticked) }));
        },
        'dropdown': function(answer) {
            return new types.TNum(answer);
        }
    },

    setting_evaluators: {
        'string': function(def, value) {
            var scope = this.getScope();
            if(def.subvars) {
                value = jme.subvars(value, scope, true);
            }
            return new jme.types.TString(value);
        },
        'mathematical_expression': function(def, value) {
            var scope = this.getScope();
            if(def.subvars) {
                value = jme.subvars(value, scope);
            }
            return new jme.types.TExpression(value);
        },
        'checkbox': function(def, value) {
            return new jme.types.TBool(value);
        },
        'dropdown': function(def, value) {
            return new jme.types.TString(value);
        },
        'code': function(def, value) {
            var scope = this.getScope();
            if(def.evaluate) {
                return scope.evaluate(value);
            } else {
                return new jme.types.TString(value);
            }
        },
        'percent': function(def, value) {
            return new jme.types.TNum(value/100);
        },
        'html': function(def, value) {
            var scope = this.getScope();
            if(def.subvars) {
                value = jme.contentsubvars(value, scope);
            }
            return new jme.types.TString(value);
        },
        'list_of_strings': function(def, value) {
            return new jme.types.TList(value.map(function(s){ return new jme.types.TString(s) }));
        },
        'choose_several': function(def, value) {
            var d = {};
            for(var x in value) {
                d[x] = new jme.types.TBool(value[x]);
            }
            return new jme.types.TDict(d);
        }
    }
};
['finaliseLoad','loadFromXML','loadFromJSON'].forEach(function(method) {
    CustomPart.prototype[method] = util.extend(Part.prototype[method], CustomPart.prototype[method]);
});

CustomPart = Numbas.parts.CustomPart = util.extend(Part,CustomPart);
});
