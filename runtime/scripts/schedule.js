/*
Copyright 2011-14 Newcastle University
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
/** @file Provides {@link Numbas.schedule} */
Numbas.queueScript('schedule',['base'],function() {
/** Schedule functions to be called. The scheduler can put tiny timeouts in between function calls so the browser doesn't become unresponsive. It also updates the loading bar.
 * @namespace Numbas.schedule
 */
var schedule = Numbas.schedule = /** @lends Numbas.schedule */ {
    /** Functions to call
     * @type {function[]}
     */
    calls: [],
    /** Bits of queue that have been picked up while a task performs sub-tasks
     * @type {Array.<Array.<function>>} */
    lifts: [],
    /** Number of tasks completed
     * @type {Number}
     */
    completed: 0,
    /** Total number of tasks ever scheduled
     * @type {Number}
     */
    total: 0,
    /** Should the scheduler stop running tasks?
     * Don't use this directly - use {@link Numbas.schedule.halt}
     * @type {Boolean}
     */
    halted:false,
    /** Error which caused the scheduler to halt
     * @type {Error}
     */
    halt_error: null,
    /** Prevent the scheduler from running any more tasks, and save the error message which caused this.
     * @param {Error} error
     * @see Numbas.schedule.halted
     * @see Numbas.schedule.halt_error
     */
    halt: function(error) {
        Numbas.display && Numbas.display.die(error);
        schedule.halted = true;
        schedule.halt_error = error;
    },
    /** @typedef {Object} Numbas.schedule.task_object
     * @property {function} task - The function to execute.
     * @property {function} error - A callback, used if an error is raised.
     */
    /** Add a task to the queue
     * @param {function|Numbas.schedule.task_object} fn - the function to run, or a dictionary `{task: fn, error: fn}`, where `error` is a callback if an error is caused
     * @param {Object} that - what `this` should be when the function is called
     */
    add: function(fn,that)
    {
        if(schedule.halted)
            return;
        var args = [],l=arguments.length;
        for(var i=2;i<l;i++)
        {
            args[i-2]=arguments[i];
        }
        if(typeof(fn)=='function') {
            fn = {task: fn};
        }
        var task = function()
        {
            try {
                fn.task.apply(that,args);
            } catch(e) {
                if(fn.error) {
                    fn.error(e);
                } else {
                    throw(e);
                }
            }
        };
        schedule.calls.push(task);
        setTimeout(schedule.pop,0);
        schedule.total++;
    },
    /** Pop the first task off the queue and run it.
     *
     * If there's an error, the scheduler halts and shows the error.
     */
    pop: function()
    {
        var calls = schedule.calls;
        if(!calls.length || schedule.halted){return;}
        var task = calls.shift();
        schedule.lift();
        try {
            task();
        }
        catch(e) {
            schedule.halt(e);
        }
        schedule.drop();
        schedule.completed++;
        Numbas.display && Numbas.display.showLoadProgress();
    },
    /** 'pick up' the current queue and put stuff in front. Called before running a task, so it can queue things which must be done before the rest of the queue is called */
    lift: function()
    {
        schedule.lifts.push(schedule.calls);
        schedule.calls=new Array();
    },
    /** Put the last lifted queue back on the end of the real queue */
    drop: function()
    {
        schedule.calls = schedule.calls.concat(schedule.lifts.pop());
    },
};

/** Coordinates Promises corresponding to different stages in the loading process.
 * @constructor
 * @memberof Numbas.schedule
 */
var SignalBox = schedule.SignalBox = function() {
    this.callbacks = {};
}
SignalBox.prototype = { /** @lends Numbas.schedule.SignalBox.prototype */
    /** @typedef Numbas.schedule.callback
     * @type {Object}
     * @property {Promise} Promise
     * @property {function} resolve - the promise's `resolve` function
     * @property {function} reject - the promise's `reject` function
     * @property {Boolean} resolved - has the promise been resolved?
     */

    /** Dictionary of registered callbacks.
     * @type {Object.<Numbas.schedule.callback>}
     * @private
     */
    callbacks: {},

    /** Get a callback object for the event with the hiven name.
     * If the callback hasn't been accessed before, it's created.
     * @param {String} name
     * @returns {Numbas.schedule.callback}
     */
    getCallback: function(name) {
        if(this.callbacks[name]) {
            return this.callbacks[name];
        }
        var deferred = this.callbacks[name] = {};
        deferred.promise = new Promise(function(resolve,reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        deferred.promise.catch(function(e) {
            deferred.reject(e);
        });
        return deferred;
    },

    /** Once the given event(s) have resolved, run the given callback function. Returns a Promise, so can be used without a callback.
     * @param {String|Array.<String>} events - the name of an event, or a list of event names
     * @param {function} [fn] - a callback function to run
     * @returns {Promise} Resolves when all of the events have resolved, or rejects if the signal box is in an error state.
     */
    on: function(events, fn) {
        var sb = this;
        if(sb.error) {
            return Promise.reject(sb.error);
        }
        if(typeof(events)=='string') {
            events = [events];
        }
        var promises = [];
        var callbacks = events.map(function(name) {
            var callback = sb.getCallback(name);
            promises.push(callback.promise);
            return callback;
        });
        var promise = Promise.all(promises);
        if(fn) {
            promise = promise.then(function() {
                return new Promise(function(resolve,reject) {
                    try {
                        if(schedule.halted) {
                            reject(schedule.halt_error)
                        }
                        var result = fn();
                        resolve(result);
                    } catch(e) {
                        reject(e);
                    }
                });
            }).catch(function(e){
                sb.error = e;
                for(var x in sb.callbacks) {
                    sb.callbacks[x].reject(e);
                }
                return Promise.reject(e);
            });
        }
        return promise;
    },

    /** Notify the signal box that the event with the given name has happened.
     * @param {String} name
     */
    trigger: function(name) {
        var callback = this.getCallback(name);
        if(this.error) {
            callback.reject(error);
        }
        callback.resolved = true;
        callback.resolve();
    }
}
});
