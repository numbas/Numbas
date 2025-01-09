{% raw %}
<xsl:template match="part[@type='m_n_2']" mode="typespecific">
    <xsl:apply-templates select="choices" mode="one"/>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='m_n_2']" mode="correctanswer">
    <xsl:apply-templates select="choices" mode="correctanswer"/>
</xsl:template>
{% endraw %}
