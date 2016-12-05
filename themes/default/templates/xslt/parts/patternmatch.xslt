{% raw %}
<xsl:template match="part[@type='patternmatch']" mode="typespecific">
	<xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
	<input type="text" spellcheck="false" class="patternmatch" size="12.5" data-bind="event: inputEvents, value: studentAnswer, valueUpdate: 'afterkeydown', autosize: true, disable: revealed"></input>
	<span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr"></span>
</xsl:template>

<xsl:template match="part[@type='patternmatch']" mode="correctanswer">
	<span class="correct-answer" data-bind="visibleIf: showCorrectAnswer, typeset: showCorrectAnswer">
		<localise>part.correct answer</localise>
		<input type="text" spellcheck="false" disabled="true" class="patternmatch" data-bind="value: displayAnswer, autosize: true"/>
	</span>
</xsl:template>
{% endraw %}
