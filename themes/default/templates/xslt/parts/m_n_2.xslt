{% raw %}
<xsl:template match="part[@type='m_n_2']" mode="typespecific">
    <xsl:apply-templates select="choices" mode="one"/>
    <span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr"></span>
</xsl:template>
<xsl:template match="part[@type='m_n_2']" mode="correctanswer">
    <div class="correct-answer" data-bind="visibleIf: showCorrectAnswer, typeset: showCorrectAnswer">
        <xsl:apply-templates select="choices" mode="correctanswer"/>
    </div>
</xsl:template>
{% endraw %}
