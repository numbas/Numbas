{% raw %}
<xsl:template match="part[@type='m_n_2']" mode="typespecific">
    <xsl:apply-templates select="choices" mode="one"/>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='m_n_2']" mode="correctanswer">
    <div class="correct-answer alert info" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <xsl:apply-templates select="choices" mode="correctanswer"/>
    </div>
</xsl:template>
{% endraw %}
