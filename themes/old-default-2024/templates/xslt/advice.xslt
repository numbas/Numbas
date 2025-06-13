{% raw %}
<xsl:template match="advice">
    <div class="adviceContainer" data-bind="visible: hasAdvice() &amp;&amp; adviceDisplayed()" localise-data-jme-context-description="question.advice">
        <h3><localise>question.advice</localise></h3>
        <span class="adviceDisplay content-area">
            <xsl:apply-templates />
        </span>
    </div>
</xsl:template>
{% endraw %}
