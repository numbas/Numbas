{% raw %}
<xsl:template match="statement">
    <div class="statement content-area" localise-data-jme-context-description="question.statement">
        <xsl:apply-templates />
    </div>
    <hr/>
</xsl:template>
{% endraw %}
