Numbas.queueScript('answer-widget-tests', ['qunit', 'answer-widgets', 'part_tests'], function() {
    QUnit.module('Number answer widget');

    QUnit.test('Invalid input explains a scientific-only notation restriction', async function(assert) {
        await Numbas.signals.on('localisation initialised');
        const component = await new Promise(resolve => Knockout.components.get('answer-widget-number', resolve));
        const notation = Knockout.observable(['scientific']);
        const allowFractions = Knockout.observable(false);
        const answerJSON = Knockout.observable({valid: false});
        const widget = component.createViewModel({
            answerJSON,
            options: {allowedNotationStyles: notation, allowFractions},
            part: {},
            disable: false
        }, {element: document.createElement('span')});

        widget.input('not a number');
        assert.deepEqual(widget.result().warnings, ['You must enter a number in scientific notation.']);
        widget.input('1.23e2');
        assert.true(widget.result().valid, 'Scientific notation is accepted');
        assert.deepEqual(widget.result().warnings, []);

        notation(['scientific', 'plain']);
        widget.input('123');
        assert.true(widget.result().valid, 'A decimal is accepted when plain notation is also allowed');
        widget.input('not a number');
        assert.deepEqual(widget.result().warnings, [R('answer.number.not a number')]);

        notation(['scientific']);
        allowFractions(true);
        assert.deepEqual(widget.result().warnings, [R('answer.number.not a number')], 'Fractions also allowed: do not claim scientific notation is required');
        widget.dispose();
    });
});
