{% raw %}
<xsl:template match="advice">
    <div class="adviceContainer" localise-data-jme-context-description="question.advice">
        <span class="adviceDisplay content-area">
            <xsl:apply-templates />
        </span>
    </div>
</xsl:template>
{% endraw %}
