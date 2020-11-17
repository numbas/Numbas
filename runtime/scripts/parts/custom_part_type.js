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
Numbas.queueScript('parts/custom_part_type',['base','jme','jme-variables','util','part','marking'],function() {
var util = Numbas.util;
var jme = Numbas.jme;
var math = Numbas.math;
var types = Numbas.jme.types;
var Part = Numbas.parts.Part;
/** Custom part - a part type defined in {@link Numbas.custom_part_types}.
 *
 * @class
 * @param {Numbas.parts.partpath} [path='p0']
 * @param {Numbas.Question} question
 * @param {Numbas.parts.Part} parentPart
 * @param {Numbas.storage.BlankStorage} [store]
 * @memberof Numbas.parts
 * @augments Numbas.parts.Part
 */
var CustomPart = Numbas.parts.CustomPart = function(path, question, parentPart, store) {
    this.raw_settings = {};
    this.resolved_input_options = {};
}
CustomPart.prototype = /** @lends Numbas.parts.CustomPart.prototype */ {
    is_custom_part_type: true,
    getDefinition: function() {
        this.definition = Numbas.custom_part_types[this.type];
        return this.definition;
    },
    baseMarkingScript: function() {
        var definition = this.getDefinition();
        return new Numbas.marking.MarkingScript(definition.marking_script);
    },
    loadFromXML: function(xml) {
        var p = this;
        var raw_settings = this.raw_settings;
        this.getDefinition();
        var tryGetAttribute = Numbas.xml.tryGetAttribute;
        var settingNodes = xml.selectNodes('settings/setting');
        for(var i=0;i<settingNodes.length;i++) {
            var settingNode = settingNodes[i];
            var name = settingNode.getAttribute('name');
            var value = settingNode.getAttribute('value');
            raw_settings[name] = JSON.parse(value);
        }
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

    evaluateSettings: function(scope) {
        var p = this;
        var settings = this.settings;
        var raw_settings = this.raw_settings;
        this.definition.settings.forEach(function(s) {
            var name = s.name;
            var value = raw_settings[name];
            if(!p.setting_evaluators[s.input_type]) {
                p.error('part.custom.unrecognised input type',{input_type:s.input_type});
            }
            try {
                settings[name] = p.setting_evaluators[s.input_type].call(p, s, value, scope);
            } catch(e) {
                p.error('part.custom.error evaluating setting',{setting: name, error: e.message},e);
            }
        });
    },

    finaliseLoad: function() {
        var p = this;
        var settings = this.settings;
        var scope = this.getScope();
        this.evaluateSettings(scope);
        var settings_scope = new jme.Scope([scope,{variables:{settings:new jme.types.TDict(settings)}}]);
        var raw_input_options = this.definition.input_options;
        ['correctAnswer','hint'].forEach(function(option) {
            if(raw_input_options[option]===undefined) {
                p.error('part.custom.input option missing',{option:option});
            }
        })
        /** Get the value of an input option by evaluating its definition.
         *
         * @param {string|object} option
         * @returns {*}
         */
        function evaluate_input_option(option) {
            var def = raw_input_options[option];
            var val;
            if(typeof(def)=='string') {
                val = settings_scope.evaluate(def);
            } else {
                if(def.static) {
                    return def.value;
                } else {
                    val = settings_scope.evaluate(def.value);
                }
            }
            var generic_options = {
                'hint': 'string'
            }
            var type = generic_options[option] || p.input_option_types[p.definition.input_widget][option];
            if(!type) {
                return jme.unwrapValue(val);
            }
            var sig = jme.parse_signature(type);
            var m = sig([val]);
            if(!m) {
                throw(new Numbas.Error("part.custom.input option has wrong type",{option: option, shouldbe: type}));
            }
            var castval = jme.castToType(val,m[0]);
            return jme.unwrapValue(castval);
        }
        for(var option in raw_input_options) {
            if(option=='correctAnswer') {
                continue;
            }
            try {
                p.resolved_input_options[option] = evaluate_input_option(option);
            } catch(e) {
                p.error('part.custom.error evaluating input option',{option:option,error:e.message},e);
            }
        }
        this.input_signature = jme.parse_signature(this.get_input_type());
        try {
            this.getCorrectAnswer(this.getScope());
        } catch(e) {
            this.error(e.message,{},e);
        }
    },
    initDisplay: function() {
        this.display = new Numbas.display.CustomPartDisplay(this);
    },
    getCorrectAnswer: function(scope) {
        this.evaluateSettings(scope);
        var settings = this.settings;
        var correctAnswer = scope.evaluate(this.definition.input_options.correctAnswer, {settings: this.settings});
        var m = this.input_signature([correctAnswer]);
        if(!m) {
            throw(new Numbas.Error("part.custom.expected answer has wrong type",{shouldbe: this.get_input_type(), type: correctAnswer.type}));
        }
        this.correctAnswer = jme.castToType(correctAnswer,m[0]);
        switch(this.definition.input_widget) {
            case 'jme':
                return jme.display.treeToJME(this.correctAnswer.tree);
            case 'checkboxes':
                return this.correctAnswer.value.map(function(c){ return c.value; });
            case 'matrix':
                if(!this.resolved_input_options.parseCells) {
                    return jme.unwrapValue(this.correctAnswer);
                }
            default:
                return this.correctAnswer.value;
        }
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
        if(this.studentAnswer===undefined) {
            return new types.TNothing();
        }
        return this.student_answer_jme_types[this.input_widget()](this.studentAnswer, this.input_options());
    },
    get_input_type: function() {
        switch(this.definition.input_widget) {
            case 'string': 
                return 'string';
            case 'number': 
                return 'string';
            case 'jme': 
                return 'expression';
            case 'matrix': 
                return this.resolved_input_options.parseCells ? 'matrix' :'list of list of string';
            case 'radios': 
            case 'dropdown':
                return 'number';
            case 'checkboxes': 
                return 'list of boolean';
        }
    },
    input_option_types: {
        'string': {
            'allowEmpty': 'boolean'
        },
        'number': {
            'allowedNotationStyles': 'list of string',
            'allowFractions': 'boolean'
        },
        'jme': {
            'showPreview': 'boolean'
        },
        'matrix': {
            'allowedNotationStyles': 'list of string',
            'allowFractions': 'boolean',
            'parseCells': 'boolean',
            'allowResize': 'boolean',
            'numRows': 'number',
            'numColumns': 'number'
        },
        'radios': {
            'choices': 'list of string'
        },
        'checkboxes': {
            'choices': 'list of string'
        },
        'dropdown': {
            'choices': 'list of string'
        }
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
        'string': function(def, value, scope) {
            if(def.subvars) {
                value = jme.subvars(value, scope, true);
            }
            return new jme.types.TString(value);
        },
        'mathematical_expression': function(def, value, scope) {
            if(!value.trim()) {
                throw(new Numbas.Error("part.custom.empty setting"));
            }
            if(def.subvars) {
                value = jme.subvars(value, scope);
            }
            var result = new jme.types.TExpression(value);
            return result;
        },
        'checkbox': function(def, value) {
            return new jme.types.TBool(value);
        },
        'dropdown': function(def, value) {
            return new jme.types.TString(value);
        },
        'code': function(def, value, scope) {
            if(def.evaluate) {
                if(!value.trim()) {
                    throw(new Numbas.Error('part.custom.empty setting'));
                }
                return scope.evaluate(value);
            } else {
                return new jme.types.TString(value);
            }
        },
        'percent': function(def, value) {
            return new jme.types.TNum(value/100);
        },
        'html': function(def, value, scope) {
            if(def.subvars) {
                value = jme.contentsubvars(value, scope);
            }
            return new jme.types.TString(value);
        },
        'list_of_strings': function(def, value, scope) {
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
