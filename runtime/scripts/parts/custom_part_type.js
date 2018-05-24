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
    this.resolved_input_options = {};
}
CustomPart.prototype = /** @lends Numbas.parts.CustomPart.prototype */ {
    is_custom_part_type: true,
    getDefinition: function() {
        this.definition = Numbas.custom_part_types[this.type];
        this.setMarkingScript(this.definition.marking_script);
        return this.definition;
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
    },
    loadFromJSON: function(data) {
        var definition = this.getDefinition();
        var tryLoad = Numbas.json.tryLoad;
        var raw_settings = this.raw_settings;
        definition.settings.forEach(function(sdef) {
            tryLoad(data.settings,sdef.name,raw_settings);
        });
    },
    marking_parameters: function(studentAnswer) {
        var o = Part.prototype.marking_parameters.apply(this,[studentAnswer]);
        o.input_options = jme.wrapValue(this.input_options());
        return o;
    },
    resume: function() {
        if(!this.store) {
            return;
        }
        var pobj = this.store.loadPart(this);
        this.stagedAnswer = pobj.studentAnswer;
    },
    finaliseLoad: function() {
        var p = this;
        var settings = this.settings;
        var raw_settings = this.raw_settings;
        var scope = this.getScope();
        this.definition.settings.forEach(function(s) {
            var name = s.name;
            var value = raw_settings[name];
            console.log(name,s.input_type,value);
            if(!p.setting_evaluators[s.input_type]) {
                p.error('part.custom.unrecognised input type',{input_type:s.input_type});
            }
            try {
                settings[name] = p.setting_evaluators[s.input_type].call(p, s, value);
            } catch(e) {
                p.error('part.custom.error evaluating setting',{setting: name, error: e.message});
            }
        });
        var settings_scope = new jme.Scope([scope,{variables:{settings:new jme.types.TDict(settings)}}]);
        var raw_input_options = this.definition.input_options;
        ['correctAnswer','hint'].forEach(function(option) {
            if(raw_input_options[option]===undefined) {
                p.error('part.custom.input option missing',{option:option});
            }
        })
        function evaluate_input_option(option) {
            if(typeof(option)=='string') {
                return jme.unwrapValue(settings_scope.evaluate(option));
            } else {
                if(option.static) {
                    return option.value;
                } else {
                    return jme.unwrapValue(settings_scope.evaluate(option.value));
                }
            }
        }
        for(var option in raw_input_options) {
            try {
                p.resolved_input_options[option] = evaluate_input_option(raw_input_options[option]);
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
    input_widget: function() {
        return this.definition.input_widget;
    },
    input_options: function() {
        return this.resolved_input_options;
    },
    rawStudentAnswerAsJME: function() {
        return this.student_answer_jme_types[this.input_widget()](this.studentAnswer, this.input_options());
    },
    student_answer_jme_types: {
        'string': function(answer) {
            return new types.TString(answer);
        },
        'number': function(answer) {
            return new types.TNum(answer);
        },
        'jme': function(answer) {
            return new types.TExpression(answer);
        },
        'matrix': function(answer,options) {
            if(options.parseCells) {
                return new types.TMatrix(answer);
            } else {
                return jme.wrapValue(answer);
            }
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
            if(!value.trim()) {
                throw(new Numbas.Error("part.custom.empty setting"));
            }
            if(def.subvars) {
                value = jme.subvars(value, scope);
            }
            var result = new jme.types.TExpression(value);
        },
        'checkbox': function(def, value) {
            return new jme.types.TBool(value);
        },
        'dropdown': function(def, value) {
            return new jme.types.TString(value);
        },
        'code': function(def, value) {
            var scope = this.getScope();
            if(!value.trim()) {
                throw(new Numbas.Error('part.custom.empty setting'));
            }
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
            var scope = this.getScope();
            return new jme.types.TList(value.map(function(s){
                if(def.subvars) {
                    s = jme.subvars(s, scope);
                }
                return new jme.types.TString(s)
            }));
        },
        'choose_several': function(def, value) {
            return new jme.wrapValue(value);
        }
    }
};
['resume','finaliseLoad','loadFromXML','loadFromJSON'].forEach(function(method) {
    CustomPart.prototype[method] = util.extend(Part.prototype[method], CustomPart.prototype[method]);
});
CustomPart = Numbas.parts.CustomPart = util.extend(Part,CustomPart);
});
