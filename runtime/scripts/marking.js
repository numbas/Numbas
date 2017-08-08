Numbas.queueScript('marking',['jme','localisation','jme-variables'],function() {
    var marking = Numbas.marking = {};

    var jme = Numbas.jme;
    var math = Numbas.math;

    var TString = jme.types.TString;
    var TList = jme.types.TList;
    var TName = jme.types.TName;
    var TNum = jme.types.TNum;
    var TBool = jme.types.TBool;
    var TDict = jme.types.TDict;

    function state_fn(name, args, outtype, fn) {
        return new jme.funcObj(name,args,outtype,null,{
            evaluate: function(args, scope) {
                if(jme.lazyOps.contains(name)) {
                    var res = fn.apply(this, arguments);
                } else {
                    var res = fn.apply(this, args.map(jme.unwrapValue));
                }
                var p = scope;
                while(p.state===undefined) {
                    p = p.parent;
                }
                p.state = p.state.concat(res.state);
                return jme.wrapValue(res.return);
            }
        });
    }

    var state_functions = [];

    state_functions.push(state_fn('correct',[],TBool,function(message) {
        return {
            return: true,
            state: [{op:"set_credit", credit:1, message:R('part.marking.correct')}]
        };
    }));

    state_functions.push(state_fn('correct',[TString],TBool,function(message) {
        return {
            return: true,
            state: [{op:"set_credit", credit:1, message:message}]
        };
    }));

    state_functions.push(state_fn('incorrect',[],TBool,function(message) {
        return {
            return: false,
            state: [{op:"set_credit", credit:0, message:R('part.marking.incorrect')}]
        };
    }));

    state_functions.push(state_fn('incorrect',[TString],TBool,function(message) {
        return {
            return: false,
            state: [{op:"set_credit", credit:0, message:message}]
        };
    }));

    state_functions.push(state_fn('set_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{op:"set_credit", credit:n, message: message}]
        }
    }));

    state_functions.push(state_fn('multiply_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{op:"multiply_credit", factor: n, message: message}]
        }
    }));

    state_functions.push(state_fn('add_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{op:"add_credit", credit:n, message: message}]
        }
    }));

    state_functions.push(state_fn('sub_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [{op:"sub_credit", credit:n, message: message}]
        }
    }));

    state_functions.push(state_fn('end',[],TBool,function() {
        return {
            return: true,
            state: [{op:"end"}]
        }
    }));

    state_functions.push(state_fn('fail',[TString],TString,function(message) {
        return {
            return: message,
            state: [
                {op:"set_credit", credit:0, message:message},
                {op:"end", invalid:true}
            ]
        };
    }));

    state_functions.push(state_fn('warn',[TString],TString,function(message) {
        return {
            return: message,
            state: [{op:"warning", message: message}]
        }
    }));

    state_functions.push(state_fn('feedback',[TString],TString,function(message) {
        return {
            return: message,
            state: [{op:"feedback", message: message}]
        }
    }));

    state_functions.push(new jme.funcObj(';',['?','?'],'?',null, {
        evaluate: function(args,cope) {
            return args[1];
        }
    }));

    state_functions.push(state_fn('apply',[TName],TName,function(args,scope) {
        if(args[0].tok.type=='name') {
            var name = args[0].tok.name.toLowerCase();
            return {
                return: args[0].tok,
                state: scope.states[name] || []
            };
        } else {
            var feedback = scope.evaluate(args[0]);
            if(feedback.type!='list') {
                throw(new Numbas.Error('marking.apply.not a list'));
            }
            return {
                return: feedback,
                state: jme.unwrapValue(feedback)
            }
        }
    }));
    jme.lazyOps.push('apply');
    jme.substituteTreeOps.apply = function(tree,scope,allowUnbound) {
        return tree;
    }

    state_functions.push(new jme.funcObj('submit_part',[TString],TDict,null,{
        evaluate: function(args, scope) {
            var part = scope.question.getPart(args[0].value);
            part.submit();
            return jme.wrapValue({
                credit: part.credit,
                marks: part.marks,
                feedback: part.markingFeedback,
                answered: part.answered
            });
        }
    }));

    state_functions.push(new jme.funcObj('apply_marking_script',[TString,'?',TDict,TNum],TDict,null,{
        evaluate: function(args, scope) {
            var script_name = args[0].value;
            var script = Numbas.marking_scripts[script_name];
            if(!script) {
                throw(new Numbas.Error('marking.apply marking script.script not found',{name: script_name}));
            }
            var nscope = new StatefulScope([scope]);
            for(var x in scope.states) {
                nscope.deleteVariable(x);
            }

            var result = script.evaluate(
                nscope,
                {
                    studentAnswer: args[1],
                    settings: args[2],
                    marks: args[3]
                }
            );

            if(result.state_errors.mark) {
                throw(result.state_errors.mark);
            }

            var notes = {};
            Object.keys(result.states).forEach(function(name) {
                notes[name] = {
                    feedback: result.states[name],
                    value: result.values[name],
                    valid: result.state_valid[name]
                }
            });

            return jme.wrapValue(notes);
        }
    }));

    state_functions.push(new jme.funcObj('mark_part',[TString,'?'],TDict,null,{
        evaluate: function(args, scope) {
            var part = scope.question.getPart(args[0].value);
            var part_result = part.mark_answer(args[1]);
            var result = marking.finalise_state(part_result.states.mark);
            return jme.wrapValue({
                marks: part.marks,
                credit: result.credit,
                feedback: result.states,
                valid: result.valid,
                states: part_result.states,
                state_valid: part_result.state_valid,
                values: part_result.values
            });
        }
    }));

    state_functions.push(state_fn('concat_feedback',[TList,TNum],TList,function(feedback, scale) {
        return {
            return: feedback,
            state: {op: "concat", messages: feedback, scale: scale}
        }
    }));


    var StatefulScope = function() {
        this.new_state = true;
        this.state = [];
        this.states = {};
        this.state_valid = {};
        this.state_errors = {};

        var scope = this;
        state_functions.forEach(function(fn) {
            scope.addFunction(fn);
        });
    }
    StatefulScope.prototype = {
        evaluate: function(expr, variables) {
            var is_top = this.state===undefined || this.new_state;
            this.new_state = false;

            var old_state = is_top ? [] : (this.state || []);
            this.state = [];

            try {
                var v = jme.Scope.prototype.evaluate.apply(this,[expr, variables]);
            } catch(e) {
                this.new_state = true;
                throw(e);
            }

            this.state = old_state.concat(this.state);

            if(is_top) {
                this.new_state = true;
            }

            return v;
        }
    }
    StatefulScope = marking.StatefulScope = Numbas.util.extend(jme.Scope,StatefulScope);

    var re_note = /^((?:\$?[a-zA-Z_][a-zA-Z0-9_]*'*)|\?\??)(?:\s*\(([^)]*)\))?\s*:\s*((?:.|\n)*)$/m;
    var MarkingNote = marking.MarkingNote = function(source) {
        var m = re_note.exec(source.trim());
        if(!m) {
            throw(new Numbas.Error("marking.note.invalid definition",{source: source}));
        }
        this.name = m[1];
        this.description = m[2];
        this.expr = m[3];
        try {
            this.tree = jme.compile(this.expr);
        } catch(e) {
            throw(new Numbas.Error("marking.note.compilation error",{name:name, message:e.message}));
        }
        this.vars = jme.findvars(this.tree);
    }

    var MarkingScript = marking.MarkingScript = function(source, base) {
        try {
            var notes = source.split(/\n(\s*\n)+/);
            var ntodo = {};
            var todo = {};
            notes.forEach(function(note) {
                if(note.trim().length) {
                    var res = new MarkingNote(note);
                    var name = res.name.toLowerCase();
                    ntodo[name] = todo[name] = res;
                }
            });
            if(base) {
                Object.keys(base.notes).forEach(function(name) {
                    if(name in ntodo) {
                        todo['base_'+name] = base.notes[name];
                    } else {
                        todo[name] = base.notes[name];
                    }
                });
            }
        } catch(e) {
            throw(new Numbas.Error("marking.script.error parsing notes",{message:e.message}));
        }
        this.notes = todo;
    }
    MarkingScript.prototype = {
        evaluate: function(scope, variables) {
            scope = new StatefulScope([
                scope, {variables: variables}
            ]);

            var result = jme.variables.makeVariables(this.notes,scope,null,compute_note);

            return {
                states: scope.states, 
                values: result.variables, 
                scope: result.scope, 
                state_valid: scope.state_valid, 
                state_errors: scope.state_errors
            };
        }
    }

    var compute_note = marking.compute_note = function(name,todo,scope) {
        if(scope.getVariable(name)) {
            return;
        } 
        if(!scope.states[name]) {
            try {
                var res = jme.variables.computeVariable.apply(this,arguments);
                scope.setVariable(name, res);
                scope.state_valid[name] = true;
                for(var i=0;i<scope.state.length;i++) {
                    if(scope.state[i].op=='end' && scope.state[i].invalid) {
                        scope.state_valid[name] = false;
                        break;
                    }
                }
            } catch(e) {
                scope.state_errors[name] = e;
                var invalid_dep = null;
                for(var x of todo[name].vars) {
                    if(x in todo) {
                        if(!scope.state_valid[x]) {
                            invalid_dep = x;
                            break;
                        }
                    }
                }
                if(invalid_dep || Numbas.marking.ignore_note_errors) {
                    scope.state_valid[name] = false;
                } else {
                    throw(new Error("Error evaluating note <code>"+name+"</code> - "+e.message));
                }
            }
            scope.states[name] = scope.state.slice().map(function(s){s.note = s.note || name; return s});
        }
        return scope.variables[name];
    }

    /** @typedef Numbas.marking.finalised_state
     * @type {Object}
     * @property {Boolean} valid - Can the answer be marked?
     * @property {Number} credit - Proportion of the credit to award
     * @property {Array.<Object>} states - Feedback actions
     */

    /** Run through a sequence of state operations, accumulating credit.
     * It might look like this is duplicated in `Numbas.parts.Part#apply_feedback`, but we need to be able to get a description of what a sequence of operations does in abstract so it can be reused in marking scripts for parent parts.
     * @see Numbas.parts.Part#apply_feedback
     * @returns {Numbas.marking.finalised_state} a dictionary `{valid: boolean, credit: number, states: object[]}`
     */
    marking.finalise_state = function(states) {
        var valid = true;
        var end = false;
        var credit = 0;
        var out_states = [];
        var num_lifts = 0;

        for(var i=0;i<states.length;i++) {
            var state = states[i];
            switch(state.op) {
                case 'set_credit':
                    out_states.push(state);
                    credit = state.credit;
                    break;
                case 'multiply_credit':
                    out_states.push(state);
                    credit *= state.factor;
                    break;
                case 'add_credit':
                    out_states.push(state);
                    credit += state.credit;
                    break;
                case 'sub_credit':
                    out_states.push(state);
                    credit -= state.credit;
                    break;
                case 'end':
                    if(num_lifts) {
                        while(i+1<states.length && states[i+1].op!='end_lift') {
                            i += 1;
                        }
                    } else {
                        end = true;
                        if(state.invalid) {
                            valid = false;
                        }
                    }
                    break;
                case 'concat':
                    states = states.slice(0,i+1).concat(
                        [{op:"start_lift",scale:state.scale}],
                        state.messages,
                        [{op:"end_lift"}],
                        states.slice(i+1)
                    );
                    break;
                case 'start_lift':
                    num_lifts += 1;
                    out_states.push(state);
                    break;
                case 'end_lift':
                    num_lifts -= 1;
                    out_states.push(state);
                    break;
                default:
                    out_states.push(state);
            }
            if(end) {
                break;
            }
        }

        return {
            valid: valid,
            credit: credit,
            states: out_states
        }
    }
});
