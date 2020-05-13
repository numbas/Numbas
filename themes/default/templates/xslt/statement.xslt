{% raw %}
<xsl:template match="statement">
    <div data-bind="visible: hasStatement">
        <div class="statement content-area" localise-data-jme-context-description="question.statement">
            <xsl:apply-templates />
        </div>
        <hr/>
    </div>
</xsl:template>
{% endraw %}
