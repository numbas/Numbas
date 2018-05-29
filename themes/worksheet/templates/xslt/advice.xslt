{% raw %}
<xsl:template match="advice">
    <div class="adviceContainer" data-bind="visible: adviceDisplayed" localise-data-jme-context-description="question.advice">
        <span class="adviceDisplay content-area">
            <xsl:apply-templates />
        </span>
    </div>
</xsl:template>
{% endraw %}
