Numbas.queueScript('marking',['util', 'jme','localisation','jme-variables','math'],function() {
    /** @namespace Numbas.marking */
    var marking = Numbas.marking = {};

    marking.ignore_note_errors = true;

    var jme = Numbas.jme;
    var sig = jme.signature;
    var math = Numbas.math;
    var TNothing = jme.types.TNothing;
    var TString = jme.types.TString;
    var THTML = jme.types.THTML;
    var TList = jme.types.TList;
    var TName = jme.types.TName;
    var TNum = jme.types.TNum;
    var TBool = jme.types.TBool;
    var TDict = jme.types.TDict;

    var Fraction = math.Fraction;

    /** A line of feedback to give to the student, produced while marking their answer.
     * Can modify the credit awarded.
     *
     * @typedef {object} Numbas.marking.feedback_item
     *
     * @property {string} op - The operation to perform. See {@link Numbas.marking.FeedbackOps}
     * @property {number} [credit] - Parameter to change the credit awarded. The exact meaning depends on `op`.
     * @property {string} [reason] - An extra note about why the op is being applied. For 'correct' and 'incorrect' feedback, this helps distinguish cases when the credit awarded doesn't change. 'invalid' means the answer could not be marked.
     * @property {string} [message] - A message to display to the student.
     * @property {number} [factor] - For `MULTIPLY_CREDIT` items, the factor to multiply the current credit by.
     * @property {number} [scale] - For `CONCAT` items, the amount to scale the credit awarded by the concatenated messages by.
     * @property {Numbas.marking.feedback_item[]} [messages] - For `CONCAT` items, the items to add to the state.
     * @property {boolean} [invalid] - For ``END`` items, does this item represent a decision that the answer is invalid?
     */

    /** Kinds of feedback item.
     *
     * @readonly
     * @enum {string}
     * @memberof Numbas.marking
     */
    var FeedbackOps = Numbas.marking.FeedbackOps = {
        /** Set the credit to the given value. */
        SET_CREDIT: 'set_credit',

        /** Add the given amount of credit. */
        ADD_CREDIT: 'add_credit',

        /** Multiply the current credit by the given amount. */
        MULTIPLY_CREDIT: 'multiply_credit',

        /** Subtract the given amount of credit. */
        SUB_CREDIT: 'sub_credit',

        /** End marking. */
        END: 'end',

        /** Give the student a warning next to the answer widget. */
        WARNING: 'warning',

        /** Give the student a message. */
        FEEDBACK: 'feedback',

        /** Add the given list of items to the end of the current list of feedback items. */
        CONCAT: 'concat'
    }

    /** Constructors for feedback items.
     *
     * @see Numbas.marking.feedback_item
     * @memberof Numbas.marking
     * @type {object.<Function>}
     */
    var feedback = Numbas.marking.feedback = {
        set_credit: function(credit,reason,message) {
            return {op: FeedbackOps.SET_CREDIT, credit: credit, reason: reason, message: message}
        },
        add_credit: function(credit,message) {
            return {op: FeedbackOps.ADD_CREDIT, credit: credit, message: message};
        },
        sub_credit: function(credit,message) {
            return {op: FeedbackOps.SUB_CREDIT, credit: credit, message: message};
        },
        multiply_credit: function(factor,message) {
            return {op: FeedbackOps.MULTIPLY_CREDIT, factor: factor, message: message}
        },
        end: function(invalid) {
            return {op: FeedbackOps.END, invalid: invalid || false}
        },
        warning: function(message) {
            return {op: FeedbackOps.WARNING, message: message}
        },
        feedback: function(message,reason,format) {
            return {op: FeedbackOps.FEEDBACK, message: message, reason: reason, format: format}
        },
        concat: function(messages, scale) {
            return {op: FeedbackOps.CONCAT, messages: messages, scale: scale};
        }
    }

    /** Create a JME function which modifies the state.
     *
     * @param {string} name
     * @param {Array.<Function|string>} args - A list of data type constructors for the function's paramters' types. Use the string '?' to match any type. Or, give the type's name with a '*' in front to match any number of that type. If `null`, then `options.typecheck` is used.
     * @param {Function} outtype - The constructor for the output value of the function
     * @param {Function} fn - A function which returns an object `{state,return}`, where `state` is a list of {@link Numbas.marking.feedback_item} to add to the state, and `return` is a {@link Numbas.jme.token}, the result of the function.
     * @see Numbas.marking.StatefulScope
     * @returns {Numbas.jme.funcObj}
     */
    var state_fn = marking.state_fn = function(name, args, outtype, fn) {
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
            state: [feedback.set_credit(1, 'correct', R('part.marking.correct'))]
        };
    }));
    state_functions.push(state_fn('correct',[TString],TBool,function(message) {
        return {
            return: true,
            state: [feedback.set_credit(1, 'correct', message)]
        };
    }));
    state_functions.push(state_fn('incorrect',[],TBool,function(message) {
        return {
            return: false,
            state: [feedback.set_credit(0, 'incorrect', R('part.marking.incorrect'))]
        };
    }));
    state_functions.push(state_fn('incorrect',[TString],TBool,function(message) {
        return {
            return: false,
            state: [feedback.set_credit(0, 'incorrect', message)]
        };
    }));
    var correctif = function(condition,correctMessage,incorrectMessage) {
        var state;
        if(condition) {
            state = feedback.set_credit(1, 'correct', correctMessage || R('part.marking.correct'));
        } else {
            state = feedback.set_credit(0, 'incorrect', incorrectMessage || R('part.marking.incorrect'));
        }
        return {
            return: condition,
            state: [state]
        };
    }
    state_functions.push(state_fn('correctif',[TBool],TBool,correctif));
    state_functions.push(state_fn('correctif',[TBool,TString,TString],TBool,correctif));
    state_functions.push(state_fn('set_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [feedback.set_credit(n, undefined, message)]
        }
    }));
    state_functions.push(state_fn('multiply_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [feedback.multiply_credit(n, message)]
        }
    }));
    state_functions.push(state_fn('multiply_credit_if',[TBool, TNum, TString, TString],TBool,function(condition, n, positive_message, negative_message) {
        return {
            return: condition,
            state: [condition ? feedback.multiply_credit(n, positive_message) : feedback.feedback(negative_message)]
        }
    }));
    state_functions.push(state_fn('multiply_credit_if',[TBool, TNum, TString],TBool,function(condition, n, positive_message) {
        return {
            return: condition,
            state: condition ? [feedback.multiply_credit(n, positive_message)] : []
        }
    }));
    state_functions.push(state_fn('add_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [feedback.add_credit(n, message)]
        }
    }));
    state_functions.push(state_fn('add_credit_if',[TBool, TNum, TString, TString],TBool,function(condition, n, positive_message, negative_message) {
        return {
            return: condition,
            state: [condition ? feedback.add_credit(n, positive_message) : feedback.feedback(negative_message, n<0 ? 'neutral' : 'incorrect')]
        }
    }));
    state_functions.push(state_fn('add_credit_if',[TBool, TNum, TString],TBool,function(condition, n, positive_message) {
        return {
            return: condition,
            state: condition ? [feedback.add_credit(n, positive_message)] : []
        }
    }));
    state_functions.push(state_fn('sub_credit',[TNum,TString],TNum,function(n, message) {
        return {
            return: n,
            state: [feedback.sub_credit(n, message)]
        }
    }));
    state_functions.push(state_fn('end',[],TBool,function() {
        return {
            return: true,
            state: [feedback.end()]
        }
    }));
    state_functions.push(state_fn('fail',[TString],TString,function(message) {
        return {
            return: message,
            state: [
                feedback.set_credit(0, 'invalid', message),
                feedback.end(true)
            ]
        };
    }));
    state_functions.push(state_fn('warn',[TString],TString,function(message) {
        return {
            return: message,
            state: [feedback.warning(message)]
        }
    }));
    state_functions.push(state_fn('feedback',[TString],TString,function(message) {
        return {
            return: message,
            state: [feedback.feedback(message)]
        }
    }));
    state_functions.push(state_fn('positive_feedback',[TString],TString,function(message) {
        return {
            return: message,
            state: [feedback.feedback(message,'correct')]
        }
    }));
    state_functions.push(state_fn('negative_feedback',[TString],TString,function(message) {
        return {
            return: message,
            state: [feedback.feedback(message,'incorrect')]
        }
    }));
    state_functions.push(state_fn('feedback',[THTML],THTML,function(html) {
        return {
            return: html,
            state: [feedback.feedback(html,undefined,'html')]
        }
    }));
    state_functions.push(state_fn('positive_feedback',[THTML],THTML,function(message) {
        return {
            return: message,
            state: [feedback.feedback(message,'correct','html')]
        }
    }));
    state_functions.push(state_fn('negative_feedback',[THTML],THTML,function(message) {
        return {
            return: message,
            state: [feedback.feedback(message,'incorrect','html')]
        }
    }));
    state_functions.push(new jme.funcObj(';',['?','?'],'?',null, {
        evaluate: function(args,cope) {
            return args[1];
        }
    }));
    state_functions.push(state_fn('apply',['multiple (name or list)'],TName,function(args,scope) {
        var out = {
            return: new TNothing(),
            state: []
        }
        for(var i=0;i<args.length;i++) {
            if(args[i].tok.type=='name') {
                var name = jme.normaliseName(args[i].tok.name,scope);
                var p = scope;
                while(p && p.state===undefined) {
                    p = p.parent;
                }
                var state = p.states[name];
                out.return = new TNothing();
                out.state = out.state.concat(state || []);
            } else {
                var feedback = scope.evaluate(args[i]);
                if(feedback.type!='list') {
                    throw(new Numbas.Error('marking.apply.not a list'));
                }
                out.return = feedback;
                out.state = out.state.concat(jme.unwrapValue(feedback));
            }
        }
        return out;
    }));
    jme.lazyOps.push('apply');
    jme.substituteTreeOps.apply = function(tree,scope,allowUnbound) {
        return tree;
    }

    /** Submit the given answer to the given part.
     *
     * @param {Numbas.parts.Part} part
     * @param {*} answer
     * @returns {Numbas.jme.token} - A dictionary with keys "credit", "marks", "feedback", "answered".
     */
    function submit_part(part,answer) {
        var originalAnswer = part.stagedAnswer;
        if(answer!==undefined) {
            part.stagedAnswer = answer;
        }
        part.submit();
        part.stagedAnswer = originalAnswer;
        part.setStudentAnswer();
        return jme.wrapValue({
            credit: part.credit,
            marks: part.availableMarks(),
            feedback: part.finalised_result.states,
            answered: part.answered
        });
    }

    state_functions.push(new jme.funcObj('submit_part',[TString],TDict,null,{
        evaluate: function(args, scope) {
            var part = scope.question.getPart(args[0].value);
            return submit_part(part);
        }
    }));
    state_functions.push(new jme.funcObj('submit_part',[TString,'?'],TDict,null,{
        evaluate: function(args, scope) {
            var part = scope.question.getPart(args[0].value);
            var answer = jme.unwrapValue(args[1]);
            return submit_part(part,answer);
        }
    }));

    state_functions.push(new jme.funcObj('check_pre_submit',[TString, '?', TString],'?',null,{
        evaluate: function(args, scope) {
            var part = scope.question.getPart(args[0].value);
            var answer = args[1];
            var exec_path = args[2].value
            var res = part.do_pre_submit_tasks(answer, scope, exec_path);
            if(res.waiting) {
                return new jme.types.TPromise(res.waiting.then(function(results) {
                    return {
                        gaps: new TList(results.map(function(r) { return new TDict(r); }))
                    };
                }));
            } else {
                return new TNothing();
            }
        }
    }));

    state_functions.push(new jme.funcObj('apply_marking_script',[TString,'?',TDict,TNum],TDict,null,{
        evaluate: function(args, scope) {
            var script_name = args[0].value;
            var script = new marking.MarkingScript(Numbas.raw_marking_scripts[script_name],null,scope);
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
            var answer = args[1];
            var part_result;
            if(answer.type=='nothing') {
                part.setCredit(0,R('part.marking.nothing entered'));
                part_result = {
                    states: {mark: []},
                    state_valid: {},
                    state_errors: {},
                    values: {interpreted_answer:answer}
                }
            } else {
                var part_result = part.mark_answer(answer,scope);
            }
            var result = marking.finalise_state(part_result.states.mark);
            return jme.wrapValue({
                marks: part.availableMarks(),
                credit: result.credit,
                feedback: result.states,
                valid: result.valid,
                states: part_result.states,
                state_valid: part_result.state_valid,
                values: part_result.values
            });
        }
    }));
    state_functions.push(state_fn('concat_feedback',[TList,TNum, sig.optional(sig.type('boolean'))],TList,function(messages, scale, strip_messages) {
        if(strip_messages) {
            messages = messages.map(function(m) {
                return Numbas.util.extend_object({}, m, {message: ''});
            });
        }
        return {
            return: messages,
            state: [feedback.concat(messages, scale)]
        }
    }));


    /** A JME scope with marking state attached.
     * The "current" state is a list of feedback items. 
     * The scope can also refer to previously computed states by name.
     * The state can be modified by functions as they are called.
     * This should be the base.
     *
     * @memberof Numbas.marking
     * @augments Numbas.jme.Scope
     * @class
     * @property {Numbas.marking.feedback_item[]} state
     * @property {object.<Numbas.marking.feedback_item[]>} states - Previously computed states.
     * @property {object.<boolean>} state_valid - Record of whether previously computed states were valid.
     * @property {object.<Error>} state_errors - The errors that caused states to become invalid, if any.
     */
    var StatefulScope = marking.StatefulScope = function() {
        this.nesting_depth = 0;
        this.state = [];
        this.states = {};
        this.state_valid = {};
        this.state_errors = {};
        var scope = this;
        state_functions.forEach(function(fn) {
            scope.addFunction(fn);
        });
    }
    StatefulScope.prototype = /** @lends Numbas.marking.StatefulScope.prototype */ { 
        evaluate: function(expr, variables) {
            var is_top = this.state===undefined || this.nesting_depth==0;
            this.nesting_depth += 1;
            var old_state = is_top ? [] : (this.state || []);
            this.state = [];
            try {
                var v = jme.Scope.prototype.evaluate.apply(this,[expr, variables]);
            } catch(e) {
                this.nesting_depth -= 1;
                throw(e);
            }
            this.nesting_depth -= 1;
            this.state = old_state.concat(this.state);
            return v;
        }
    }
    StatefulScope = marking.StatefulScope = Numbas.util.extend(jme.Scope,StatefulScope);

    /** The result of a marking script.
     *
     * @typedef {object} Numbas.marking.marking_script_result
     *
     * @property {object.<Numbas.marking.feedback_item[]>} states - The feedback resulting from each of the notes.
     * @property {object.<Numbas.jme.token>} values - The values of each of the notes.
     * @property {object.<boolean>} state_valid - See {@link Numbas.marking.StatefulScope#state_valid}.
     * @property {object.<Error>} state_errors - See {@link Numbas.marking.StatefulScope#state_errors}.
     */

    /** Compute the marking note with the given name in the given scope.
     *
     * @memberof Numbas.marking
     * @function
     * @see Numbas.jme.variables.computeVariable
     *
     * @param {string} name
     * @param {object} todo - Dictionary of notes still to evaluate.
     * @param {Numbas.marking.StatefulScope} scope
     *
     * @returns {Numbas.jme.token}
     */
    var compute_note = marking.compute_note = function(name,todo,scope) {
        if(scope.getVariable(name)) {
            return;
        }
        var stateful_scope = scope;
        while(stateful_scope && !stateful_scope.state) {
            stateful_scope = stateful_scope.parent;
        }
        if(!stateful_scope.states[name]) {
            try {
                var res = jme.variables.computeVariable.apply(this,arguments);
                scope.setVariable(name, res);
                stateful_scope.state_valid[name] = true;
                for(var i=0;i<stateful_scope.state.length;i++) {
                    if(stateful_scope.state[i].op=='end' && stateful_scope.state[i].invalid) {
                        stateful_scope.state_valid[name] = false;
                        break;
                    }
                }
            } catch(e) {
                stateful_scope.state_errors[name] = e;
                var invalid_dep = null;
                for(var i=0;i<todo[name].vars.length;i++) {
                    var x = todo[name].vars[i];
                    if(x in todo) {
                        if(!stateful_scope.state_valid[x]) {
                            invalid_dep = x;
                            break;
                        }
                    }
                }
                if(invalid_dep || marking.ignore_note_errors) {
                    stateful_scope.state_valid[name] = false;
                } else {
                    throw(new Numbas.Error("marking.note.error evaluating note",{name:name, message:e.message}));
                }
            }
            stateful_scope.states[name] = stateful_scope.state.slice().map(function(s){s.note = s.note || name; return s});
        }
        return scope.getVariable(name);
    }

    /** A script to mark a part.
     * A list of notes, which can refer to each other. The dependencies must form a directed acyclic graph, like for JME variables.
     *
     * Two notes are required:
     * 
     * * The `mark` note is the final note, used to provide feedback on the part.
     * * The value of the `interpreted_answer` note is used to represent the student's answer, as the script interpreted it.
     * 
     * @memberof Numbas.marking
     * @class
     * 
     * @param {string} source - The definitions of the script's notes.
     * @param {Numbas.marking.MarkingScript} [base] - A base script to extend.
     */
    var MarkingScript = marking.MarkingScript = jme.variables.note_script_constructor(
        function(scope,variables) {
            return new StatefulScope([
                scope, {variables: variables}
            ]);    
        },
        function(result, scope) {
            return {
                states: scope.states,
                values: result.variables,
                state_valid: scope.state_valid,
                state_errors: scope.state_errors
            };
        },
        compute_note
    );

    /** The result of attempting to mark a part.
     *
     * @typedef Numbas.marking.finalised_state
     * @type {object}
     * @property {boolean} valid - Can the answer be marked?
     * @property {number} credit - Proportion of the credit to award.
     * @property {Array.<object>} states - Feedback actions.
     */

    /** Run through a sequence of state operations, accumulating credit.
     * It might look like this is duplicated in `Numbas.parts.Part#apply_feedback`, but we need to be able to get a description of what a sequence of operations does in abstract so it can be reused in marking scripts for parent parts.
     *
     * @see Numbas.parts.Part#apply_feedback
     * @function
     * @memberof Numbas.marking
     * @param {Numbas.marking.feedback_item[]} states
     * @returns {Numbas.marking.finalised_state}
     */
    var finalise_state = marking.finalise_state = function(states) {
        var valid = true;
        var end = false;
        var credit = Fraction.zero;
        var out_states = [];
        var num_lifts = 0;
        var lifts = [];
        var scale = 1;
        for(var i=0;i<states.length;i++) {
            var state = states[i];
            switch(state.op) {
                case FeedbackOps.SET_CREDIT:
                    out_states.push(state);
                    credit = Fraction.fromFloat(state.credit);
                    break;
                case FeedbackOps.MULTIPLY_CREDIT:
                    out_states.push(state);
                    credit = credit.multiply(Fraction.fromFloat(state.factor));
                    break;
                case FeedbackOps.ADD_CREDIT:
                    out_states.push(state);
                    credit = credit.add(Fraction.fromFloat(state.credit));
                    break;
                case FeedbackOps.SUB_CREDIT:
                    out_states.push(state);
                    credit = credit.subtract(Fraction.fromFloat(state.credit));
                    break;
                case FeedbackOps.END:
                    if(num_lifts) {
                        while(i+1<states.length && states[i+1].op!="end_lift") {
                            i += 1;
                        }
                    } else {
                        end = true;
                        if(state.invalid) {
                            valid = false;
                        }
                    }
                    break;
                case FeedbackOps.CONCAT:
                    states = states.slice(0,i+1).concat(
                        [{op:"start_lift",scale:state.scale}],
                        state.messages,
                        [{op:"end_lift"}],
                        states.slice(i+1)
                    );
                    break;
                case "start_lift":
                    num_lifts += 1;
                    lifts.push({credit: credit, scale: scale});
                    credit = Fraction.zero;
                    scale = state.scale;
                    out_states.push(state);
                    break;
                case "end_lift":
                    num_lifts -= 1;
                    var last_lift = lifts.pop();
                    var lift_credit = credit;
                    credit = last_lift.credit;
                    credit = credit.add(lift_credit.multiply(Fraction.fromFloat(scale)));
                    scale = last_lift.scale;
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
            credit: credit.toFloat(),
            states: out_states
        }
    }
});
