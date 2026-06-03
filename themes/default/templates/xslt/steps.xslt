{% raw %}
<xsl:template match="steps">
    <div class="steps well" data-bind="visible: stepsOpen">
        <xsl:apply-templates select="part"/>
    </div>
    <div class="stepsBtn">
        <button class="btn primary" data-bind="visible: !stepsOpen(), click: controls.showSteps, text: part.settings.showStepsLabel"></button>
        <button class="btn primary" data-bind="visible: stepsOpen(), click: controls.hideSteps"><localise>question.hide steps</localise></button>
        <span class="help-block hint penaltyMessage" data-bind="visible: marks() > 0">(<span data-bind="html: stepsPenaltyMessage"></span>)</span>
    </div>
</xsl:template>
{% endraw %}
