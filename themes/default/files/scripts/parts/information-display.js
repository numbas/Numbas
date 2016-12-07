Numbas.queueScript('display/parts/information',['display-base','part-display','util'],function() {
    var display = Numbas.display;
    var extend = Numbas.util.extend;

    /** Display code for a {@link Numbas.parts.InformationPart}
     * @augments Numbas.display.PartDisplay
     * @constructor
     * @name InformationPartDisplay
     * @memberof Numbas.display
     */
    display.InformationPartDisplay = function() {};
    display.InformationPartDisplay = extend(display.PartDisplay,display.InformationPartDisplay,true);
});
