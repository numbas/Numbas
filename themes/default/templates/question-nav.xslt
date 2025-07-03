{% raw %}
<!-- bottom nav bar - prv/nxt, plus submit/advice/reveal buttons -->
<nav class="question-nav navbar" data-bind="jmescope: question.scope,attr: {{'aria-label': R('question.nav.label')}}">
    <p class="marks" data-bind="visible: !showScoreBreakdown()">
        <span class="score" data-bind="html: scoreFeedback.message"></span>
        <span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr" aria-hidden="true"></span>
        <span class="sr-only" data-bind="text: scoreFeedback.iconAttr().title"></span>
    </p>

    <table class="explore-breakdown" data-bind="visible: showScoreBreakdown()">
        <tbody>
            <xsl:comment> ko foreach: objectives </xsl:comment>
            <xsl:comment> ko if: visible </xsl:comment>
            <tr>
                <td class="name" data-bind="latex: name"></td>
                <td class="message"><span data-bind="text: feedback.plainMessage"></span></td>
                <td>
                    <span class="feedback-icon" data-bind="css: feedback.iconClass, attr: feedback.iconAttr"></span>
                </td>
            </tr>
            <xsl:comment> /ko </xsl:comment>
            <xsl:comment> /ko </xsl:comment>

            <xsl:comment> ko foreach: penalties </xsl:comment>
            <xsl:comment> ko if: visible </xsl:comment>
            <tr>
                <td class="name" data-bind="latex: name"></td>
                <td class="message"><span data-bind="text: scoreDisplay"></span></td>
                <td></td>
            </tr>
            <xsl:comment> /ko </xsl:comment>
            <xsl:comment> /ko </xsl:comment>
        </tbody>
        <tfoot>
            <tr class="total">
                <th><localise>control.total</localise></th>
                <td>
                    <span class="score" data-bind="html: scoreFeedback.plainMessage"></span>
                </td>
                <td>
                    <span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr"></span>
                </td>
            </tr>
        </tfoot>
    </table>

    <button type="button" class="btn nextQuestionBtn" data-bind="visible: $root.exam().mode()=='normal' &amp;&amp; $root.exam().exam.settings.navigateMode=='diagnostic', click: $parent.advance, attr: {{disabled: !$parent.canAdvance()}}"><localise>control.move to next question</localise></button>
    <button class="btn regenBtn" data-bind="visible: $root.exam().mode()=='normal' &amp;&amp; $root.exam().exam.settings.allowRegen, click: () => Numbas.controls.regenQuestion($root.exam().exam)"><localise>control.regen</localise></button>
    <button class="btn revealBtn" data-bind="visible: question.parts.length &amp;&amp; canReveal(), click: () => Numbas.controls.revealAnswer($root.exam().exam)"><localise>control.reveal</localise></button>
</nav>
{% endraw %}
