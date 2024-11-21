{% raw %}
<!-- bottom nav bar - prv/nxt, plus submit/advice/reveal buttons -->
<nav class="question-nav question-bottom-nav navbar navbar-default" data-bind="jmescope: question.scope,attr: {{'aria-label': R('question.nav.label')}}">
    <div class="nav navbar-nav">
        <p class="marks navbar-text" data-bind="visible: !showScoreBreakdown()">
            <span class="score" data-bind="html: scoreFeedback.message, pulse: scoreFeedback.update"></span>
            <span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr, pulse: scoreFeedback.update" aria-hidden="true"></span>
            <span class="sr-only" data-bind="text: scoreFeedback.iconAttr().title"></span>
        </p>

        <div class="explore-breakdown" data-bind="visible: showScoreBreakdown()">
            <table>
                <tbody>
                    <xsl:comment> ko foreach: objectives </xsl:comment>
                    <xsl:comment> ko if: visible </xsl:comment>
                    <tr>
                        <td class="name" data-bind="latex: name"></td>
                        <td class="message"><span data-bind="text: feedback.plainMessage, pulse: feedback.update"></span></td>
                        <td>
                            <span class="feedback-icon" data-bind="css: feedback.iconClass, attr: feedback.iconAttr, pulse: feedback.update"></span>
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
                    <tr class="total">
                        <th><localise>control.total</localise></th>
                        <td>
                            <span class="score" data-bind="html: scoreFeedback.plainMessage, pulse: scoreFeedback.update"></span>
                        </td>
                        <td>
                            <span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr, pulse: scoreFeedback.update"></span>
                        </td>
                    </tr>
                </tbody>

            </table>
        </div>

        <button type="button" class="btn default navbar-btn nextQuestionBtn" data-bind="visible: $root.exam().mode()=='normal' &amp;&amp; $root.exam().exam.settings.navigateMode=='diagnostic', click: Numbas.controls.nextQuestion, attr: {{disabled: !$parent.canAdvance()}}"><localise>control.move to next question</localise></button>
        <button class="btn default navbar-btn regenBtn" data-bind="visible: $root.exam().mode()=='normal' &amp;&amp; $root.exam().exam.settings.allowRegen, click: Numbas.controls.regenQuestion"><localise>control.regen</localise></button>
        <button class="btn default navbar-btn revealBtn" data-bind="visible: question.parts.length &amp;&amp; canReveal, click: Numbas.controls.revealAnswer"><localise>control.reveal</localise></button>
    </div>
</nav>
{% endraw %}
