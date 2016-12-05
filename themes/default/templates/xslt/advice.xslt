{% raw %}
<xsl:template match="advice">
	<div class="adviceContainer" data-bind="visible: adviceDisplayed">
		<h3><localise>question.advice</localise></h3>
		<span class="adviceDisplay content-area">
			<xsl:apply-templates />
		</span>
	</div>
</xsl:template>
{% endraw %}
