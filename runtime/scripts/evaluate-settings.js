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
/** @file The {@link Numbas.parts.CustomPart} constructor. */
Numbas.queueScript('evaluate-settings',['base','jme','jme-variables','util'],function() {
    var jme = Numbas.jme;

    Numbas.evaluate_settings = {};

    var setting_evaluators = Numbas.evaluate_settings.setting_evaluators = {
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
    };


    Numbas.evaluate_settings.evaluate_settings = function(definition, raw_settings, scope) {
        var settings = {};
        definition.settings.forEach(function(s) {
            var name = s.name;
            var value = raw_settings[name];
            if(value===undefined) {
                value = s.default_value;
            }
            if(!setting_evaluators[s.input_type]) {
                throw(new Numbas.Error('part.custom.unrecognised input type',{input_type:s.input_type}));
            }
            try {
                settings[name] = setting_evaluators[s.input_type](s, value, scope);
            } catch(e) {
                throw(new Numbas.Error('part.custom.error evaluating setting',{setting: name, error: e.message},e));
            }
        });
        return settings;
    }
});
