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
Numbas.queueScript('schedule', ['base'], function() {

/** Schedule functions to be called. The scheduler can put tiny timeouts in between function calls so the browser doesn't become unresponsive. It also updates the loading bar.
 *
 * @namespace Numbas.schedule
 */
var schedule = Numbas.schedule = /** @lends Numbas.schedule */ {
    /** Functions to call.
     *
     * @type {Function[]}
     */
    calls: [],
    /** Bits of queue that have been picked up while a task performs sub-tasks.
     *
     * @type {Array.<Array.<Function>>}
     */
    lifts: [],
    /** Number of tasks completed.
     *
     * @type {number}
     */
    completed: 0,
    /** Total number of tasks ever scheduled.
     *
     * @type {number}
     */
    total: 0,
    /** All signal box objects.
     *
     * @type {Array.<Numbas.schedule.SignalBox>}
     */
    signalboxes: [],
    /** Should the scheduler stop running tasks?
     * Don't use this directly - use {@link Numbas.schedule.halt}.
     *
     * @type {boolean}
     */
    halted:false,
    /** Reset the scheduler: remove all callbacks and signal boxes.
     */
    reset: function() {
        schedule.calls = [];
        schedule.lifts = [];
        schedule.completed = 0;
        schedule.total = 0;
        schedule.signalboxes = [];
        Numbas.signals = new Numbas.schedule.SignalBox();
    },
    /** Error which caused the scheduler to halt.
     *
     * @type {Error}
     */
    halt_error: null,
    /** Prevent the scheduler from running any more tasks, and save the error message which caused this.
     *
     * @param {Error} error
     * @see Numbas.schedule.halted
     * @see Numbas.schedule.halt_error
     */
    halt: function(error) {
        Numbas.display && Numbas.display.die(error);
        schedule.halted = true;
        schedule.halt_error = error;
        schedule.signalboxes.forEach(function(sb) {
            sb.halt(error);
        });
    },
    /** Allow the scheduler to run tasks again.
     * Unhalts all signalboxes too.
     */
    unhalt: function() {
        schedule.halted = false;
        schedule.signalboxes.forEach(function(sb) {
            sb.unhalt();
        });
    },
    /** @typedef {object} Numbas.schedule.task_object
     * @property {Function} task - The function to execute.
     * @property {Function} error - A callback, used if an error is raised.
     */
    /** Add a task to the queue.
     *
     * @param {Function|Numbas.schedule.task_object} fn - The function to run, or a dictionary `{task: fn, error: fn}`, where `error` is a callback if an error is caused.
     * @param {object} that - What `this` should be when the function is called.
     */
    add: function(fn, that) {
        if(schedule.halted) {
            return;
        }
        var args = [];
        var l = arguments.length;
        for(var i = 2;i < l;i++) {
            args[i - 2] = arguments[i];
        }
        if(typeof(fn) == 'function') {
            fn = {task: fn};
        }
        var task = function() {
            try {
                fn.task.apply(that, args);
            } catch(e) {
                if(fn.error) {
                    fn.error(e);
                } else {
                    throw(e);
                }
            }
        };
        schedule.calls.push(task);
        setTimeout(schedule.pop, 0);
        schedule.total++;
    },
    /** Pop the first task off the queue and run it.
     *
     * If there's an error, the scheduler halts and shows the error.
     */
    pop: function() {
        var calls = schedule.calls;
        if(!calls.length || schedule.halted) {
            return;
        }
        var task = calls.shift();
        schedule.lift();
        try {
            task();
        } catch(e) {
            schedule.halt(e);
        }
        schedule.drop();
        schedule.completed++;
        Numbas.display && Numbas.display.showLoadProgress();
    },
    /** Pick up the current queue and put stuff in front. Called before running a task, so it can queue things which must be done before the rest of the queue is called. */
    lift: function() {
        schedule.lifts.push(schedule.calls);
        schedule.calls = new Array();
    },
    /** Put the last lifted queue back on the end of the real queue. */
    drop: function() {
        schedule.calls = schedule.calls.concat(schedule.lifts.pop());
    },
};

/** Coordinates Promises corresponding to different stages in the loading process.
 *
 * @class
 * @memberof Numbas.schedule
 */
var SignalBox = schedule.SignalBox = function() {
    this.callbacks = {};
    this.generic_listeners = [];
    schedule.signalboxes.push(this);
}
SignalBox.prototype = { /** @lends Numbas.schedule.SignalBox.prototype */
    /** @typedef Numbas.schedule.callback
     * @type {object}
     * @property {Promise} promise - A promise that will resolve when this signal is triggered.
     * @property {Function} resolve - The promise's `resolve` function.
     * @property {Function} reject - The promise's `reject` function.
     * @property {boolean} resolved - Has the promise been resolved?
     */

    /** Dictionary of registered callbacks.
     *
     * @type {Object<Numbas.schedule.callback>}
     * @private
     */
    callbacks: {},

    /** Callback functions which will be called when any signal is triggered.
     *
     * @type {Array<Numbas.schedule.callback>}
     * @private
     */
    generic_listeners: [],

    /** Get a callback object for the event with the given name.
     * If the callback hasn't been accessed before, it's created.
     *
     * @param {string} name
     * @returns {Numbas.schedule.callback}
     */
    getCallback: function(name) {
        if(this.callbacks[name]) {
            return this.callbacks[name];
        }
        var deferred = this.callbacks[name] = {};
        deferred.promise = new Promise(function(resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        deferred.promise.catch(function(e) {
            deferred.reject(e);
        });
        return deferred;
    },

    /** Once the given event(s) have resolved, run the given callback function. Returns a Promise, so can be used without a callback.
     *
     * @param {string|Array.<string>} events - The name of an event, or a list of event names.
     * @param {Function} [fn] - A callback function to run.
     * @returns {Promise} Resolves when all of the events have resolved, or rejects if the signal box is in an error state.
     */
    on: function(events, fn) {
        var sb = this;
        if(sb.error) {
            return Promise.reject(sb.error);
        }
        if(typeof(events) == 'string') {
            events = [events];
        }
        var promises = [];
        events.map(function(name) {
            var callback = sb.getCallback(name);
            promises.push(callback.promise);
            return callback;
        });
        var promise = Promise.all(promises);
        if(fn) {
            promise = promise.then(function() {
                return new Promise(function(resolve, reject) {
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
            });
            promise.catch(function(e) {
                sb.halt(e);
            });
        }
        return promise;
    },

    /**
     * Register a callback function which will be called whenever any signal has resolved.
     * The callback is called with the name of the triggered signal.
     *
     * @param {Function} fn
     */
    on_any: function(fn) {
        this.generic_listeners.push(fn);
    },

    /** Halt this signal box because of an error: reject all outstanding promises.
     *
     * @param {Error} error - The error that caused the signal box to halt.
     */
    halt: function(error) {
        this.error = error;
        for(var x in this.callbacks) {
            this.callbacks[x].reject(error);
        }
    },

    /** Unhalt this signal box: allow promises to be made again.
     */
    unhalt: function() {
        this.error = null;
    },

    /** Notify the signal box that the event with the given name has happened.
     *
     * @param {string} name
     */
    trigger: function(name) {
        var callback = this.getCallback(name);
        if(this.error) {
            callback.reject(this.error);
        }
        callback.resolved = true;
        callback.resolve();

        this.generic_listeners.forEach((fn) => {
            fn(name);
        });
    }
}

/** Coordinates callbacks to run whenever named events happen.
 *
 * @class
 * @memberof Numbas.schedule
 */
var EventBox = schedule.EventBox = function() {
    this.events = {};
}
EventBox.prototype = {
    getEvent: function(name) {
        if(this.events[name]) {
            return this.events[name];
        }
        var ev = this.events[name] = {
            listeners: []
        }
        this.setEventPromise(ev);
        return ev;
    },

    setEventPromise: function(ev) {
        ev.next = new Promise(function(resolve, reject) {
            ev.next_resolve = resolve;
        });
    },

    /** Register a callback function which is called every time the event is triggered.
     *
     * @param {string} name
     * @param {Function} callback
     */
    on: function(name, callback) {
        var ev = this.getEvent(name);
        ev.listeners.push(callback);
    },

    /** Returns a promise which is resolved the next time the event is triggered.
     *
     * @param {string} name
     * @returns {Promise}
     */
    once: function(name) {
        var ev = this.getEvent(name);
        return ev.next;
    },

    trigger: function(name) {
        var ev = this.getEvent(name);
        var args = Array.from(arguments).slice(1);
        ev.listeners.forEach(function(callback) {
            callback.apply(this, args);
        });
        this.getEvent('').listeners.forEach(function(callback) {
            callback.apply(this, [name, ...args]);
        });
        ev.next_resolve(...arguments);
        this.setEventPromise(ev);
    }
}
/** Signals produced by the Numbas runtime.
 *
 * @type {Numbas.schedule.SignalBox}
 * @memberof Numbas
 */
schedule.reset();

/** Manages a queue of tasks.
 *
 * @memberof Numbas
 */
class Scheduler {
    num_jobs = 0;

    completed_jobs = 0;

    constructor() {
        this.events = new EventBox();
        this.last = Promise.resolve();
    }

    /** Add a task to the queue.
     *
     * @param {Function} fn
     */
    job(fn) {
        this.num_jobs += 1;
        const i = this.num_jobs;
        this.events.trigger('add job', i);
        this.last = this.last.then(fn).catch((error) => {
            Numbas.display && Numbas.display.die(error);
            console.error(error);
        });

        this.last = this.last.then(async () => {
            await (new Promise((resolve) => {
                setTimeout(resolve, 1);
            }));
        })

        this.last.then(() => {
            this.completed_jobs += 1;
            this.events.trigger('finish job', i);
        });
    }
}

Numbas.Scheduler = Scheduler;

});
