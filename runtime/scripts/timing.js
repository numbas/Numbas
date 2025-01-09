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
/** @file A few functions to do with time and date, and also performance timing. Provides {@link Numbas.timing}. */

/** A duration of time
 * @typdef {object} duration
 * @property {number} seconds
 * @property {number} minutes
 * @property {number} hours
 * @property {number} days
 */

Numbas.queueScript('timing',['base'],function() {
/** @namespace Numbas.timing */
var timing = Numbas.timing = /** @lends Numbas.timing */ {
    /** Get the current date as a string in the user's locale.
     *
     * @returns {string}
     */
    displayDate: function() {
        return (new Date()).toLocaleDateString();
    },

    /** Convert a number of seconds to an object with seconds, minutes, hours and days.
     *
     * @param {number} time
     * @returns {duration}
     */
    secsToUnits: function(time) {
        time = Math.floor(time);
        const seconds = time % 60;
        time = (time - seconds) / 60;
        const minutes = time % 60;
        time = (time - minutes) / 60;
        const hours = time % 24;
        time = (time - hours) / 24;
        const days = time;

        return {seconds, minutes, hours, days};
    },

    /** Convert a number of seconds to a string in `HH:MM:SS` format.
     *
     * @param {number} time
     * @returns {string}
     */
    secsToDisplayTime: function( time ) {
        if(time<0) {
            return '-'+Numbas.timing.secsToDisplayTime(-time);
        }

        const {seconds, minutes, hours} = timing.secsToUnits(time);

        function padded(text, ...numbers) {
            let out = text[0];
            for(let i=0;i<text.length-1;i++) {
                out += numbers[i].toString().padStart(2,'0') + text[i+1];
            }
            return out;
        }

        return padded`${hours}:${minutes}:${seconds}`;
    },

    /** Convert a number of seconds to an ISO8601 duration string in the format `PdDThHmMsS`
     * 
     * @param {number} time
     * @returns {string}
     */
    secsToMachineDuration: function(time) {
        const {seconds, minutes, hours, days} = timing.secsToUnits(time);

        return `P${days}DT${hours}H${minutes}M${seconds}S`;
    },

    /** A queue of timers.
     *
     * @type {Date[]}
     */
    timers: [],
    /** Timing messages - how long did each timer take?
     *
     * @type {Array.<string>}
     */
    messages: [],

    /** Start a new timer.
     *
     * @see {Numbas.timing.timers}
     */
    start: function()
    {
        timing.timers.push(new Date());
    },
    /** End the top timer on the queue.
     *
     * @param {string} label - A description of the timer.
     */
    end: function(label)
    {
        var s='';
        for(var i=0;i<timing.timers.length;i++){s+='   ';}
        s+=(new Date())-timing.timers.pop();
        s+=' '+label;
        timing.messages.push(s);
        if(!timing.timers.length){timing.show();}
    },
    /** Show all timing messages through {@link Numbas.debug}.
     */
    show: function()
    {
        for(var x in timing.accs)
        {
            Numbas.debug(timing.accs[x].total+' '+x,true);
        }
        timing.accs = {};
        for(var i=0;i<timing.messages.length;i++)
        {
            Numbas.debug(timing.messages[i],true);
        }
        timing.messages = [];
    },
    /** Stress test a function by running it a lot of times and seeing how long it takes.
     *
     * @param {Function} f
     * @param {number} times
     */
    stress: function(f,times)
    {
        timing.start();
        for(var i=0;i<times;i++)
        {
            f();
        }
        timing.end();
    },
    /** Timing accumulators.
     *
     * @see Numbas.timing.startacc
     */
    accs: {},
    /** Accumulators are for counting time spent in functions which don't take long to evaluate, but are called repeatedly.
     *
     * Call this with the function's name when you start the function, and {@link Numbas.timing.endacc} with the same name just before returning a value.
     *
     * It copes with recursion automatically, so you don't need to worry about double counting.
     *
     * @param {string} name
     */
    startacc: function(name)
    {
        if(timing.accs[name]==undefined)
        {
            timing.accs[name] = {
                total: 0,
                go: 0
            }
        }
        var acc = timing.accs[name];
        acc.go+=1;
        if(acc.go>1) { return; }
        acc.start = new Date();
    },
    /** Stop accumulating runtime for a function.
     *
     * @param {string} name
     * @see Numbas.timing.startacc
     */
    endacc: function(name)
    {
        var acc = timing.accs[name];
        if(!acc)
            throw(new Numbas.Error('timing.no accumulator',{name:name}));
        acc.go -= 1;
        if(acc.go==0)
        {
            var end = new Date();
            acc.total += (end - acc.start);
        }
    }
};
});
