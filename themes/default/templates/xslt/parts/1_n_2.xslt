{% raw %}
<xsl:template match="part[@type='1_n_2']" mode="typespecific">
    <xsl:apply-templates select="choices" mode="one"/>
    <span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr"></span>
</xsl:template>
<xsl:template match="part[@type='1_n_2']" mode="correctanswer">
    <span class="correct-answer" data-bind="visibleIf: showCorrectAnswer, typeset: showCorrectAnswer">
        <localise>part.correct answer</localise>
        <xsl:apply-templates select="choices" mode="correctanswer"/>
    </span>
</xsl:template>
{% endraw %}