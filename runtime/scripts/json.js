/** @file Stuff to do with loading from JSON objects. Provides {@link Numbas.json}. */

Numbas.queueScript('json',['base'],function() {
/** @namespace Numbas.json */
var json = Numbas.json = {
    /** Try to load an attribute with name from `attr` from `source` into `target`.
     *  Tries lower-case 
     *  @param {Object} source - object to load value(s) from
     *  @param {String|Array.<String>} attrs - the name, or list of names, of attributes to load
     *  @param {Object} target - object to set values in
     *  @param {String|Array.<String>} altnames - the name, or list of names, to set in the target object
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
            var value = undefined;
            if(attr in source) {
                value = source[attr];
            } else if(attr.toLowerCase() in source) {
                value = source[attr.toLowerCase()];
            }
            if(value!==undefined) {
                if(target_attr in target && typeof target[target_attr] == 'string') {
                    value += '';
                }
                target[target_attr] = value;
            }
        }
    }
}
});
