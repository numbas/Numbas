{% raw %}
<xsl:template match="part[@type='gapfill']" mode="typespecific">
</xsl:template>

<xsl:template match="part[@type='gapfill']" mode="correctanswer">
</xsl:template>

<xsl:template match="gapfill" mode="content">
	
	<xsl:variable name="n"><xsl:value-of select="@reference"/></xsl:variable>
	<xsl:apply-templates select="ancestor::part[1]/gaps/part[$n+1]" />
</xsl:template>
{% endraw %}
