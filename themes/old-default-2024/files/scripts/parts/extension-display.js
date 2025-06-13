Numbas.queueScript('display/parts/extension',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;
    /** Display code for a {@link Numbas.parts.ExtensionPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name ExtensionPartDisplay
     * @memberof Numbas.display
     */
    display.ExtensionPartDisplay= function() {};
    display.ExtensionPartDisplay= extend(display.PartDisplay,display.ExtensionPartDisplay,true);
});