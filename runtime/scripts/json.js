/** @file Stuff to do with loading from JSON objects. Provides {@link Numbas.json}. */
Numbas.queueScript('json',['base'],function() {
/** @namespace Numbas.json */
var json = Numbas.json = {
    /** Try to load an attribute with name from `attr` from `source` into `target`.
     * Tries lower-case.
     *
     * @param {object} source - Object to load value(s) from.
     * @param {string|Array.<string>} attrs - The name, or list of names, of attributes to load.
     * @param {object} target - Object to set values in.
     * @param {string|Array.<string>} altnames - The name, or list of names, to set in the target object.
     */
    tryLoad: function(source,attrs,target,altnames) {
        if(!source) {
            return;
        }
        if(typeof(attrs)=='string') {
            attrs = [attrs];
            altnames = altnames && [altnames];
        }
        altnames = altnames || [];
        for(var i=0;i<attrs.length;i++) {
            var attr = attrs[i];
            var target_attr = altnames[i] || attr;
            var value = json.tryGet(source, attr);
            if(value!==undefined) {
                if(target_attr in target && typeof target[target_attr] == 'string') {
                    value += '';
                }
                if(target_attr in target && typeof target[target_attr] == 'number') {
                    value = parseFloat(value);
                }
                target[target_attr] = value;
            }
        }
    },
    /** Try to load an attribute with the given name from `source`. The given name and its lower-case equivalent are tried.
     *
     * @param {object} source
     * @param {string} attr
     * @returns {*}
     */
    tryGet: function(source, attr) {
        if(attr in source) {
            return source[attr];
        } else if(attr.toLowerCase() in source) {
            return source[attr.toLowerCase()]
        }
    }
}
});
