{% raw %}
<xsl:template match="steps">
    <div class="steps well clearfix" data-bind="visible: stepsOpen">
        <xsl:apply-templates select="part"/>
    </div>
    <div class="stepsBtn">
        <button class="btn primary" data-bind="visible: !stepsOpen(), click: controls.showSteps"><localise>question.show steps</localise></button>
        <button class="btn primary" data-bind="visible: stepsOpen(), click: controls.hideSteps"><localise>question.hide steps</localise></button>
        <span class="help-block hint penaltyMessage">(<span data-bind="html: stepsPenaltyMessage"></span>)</span>
    </div>
</xsl:template>
{% endraw %}
