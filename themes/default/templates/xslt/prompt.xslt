{% raw %}
<xsl:template match="prompt">
    <span class="prompt content-area" localise-data-jme-context-description="part.prompt">
        <xsl:apply-templates />
    </span>
</xsl:template>
{% endraw %}