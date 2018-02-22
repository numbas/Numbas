{% raw %}
<xsl:template match="part[@type='numberentry']" mode="typespecific">
	<xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
	<input type="text" step="{answer/inputstep/@value}" class="numberentry" data-bind="event: inputEvents, textInput: studentAnswer, autosize: true, disable: revealed"/>
	<span class="preview" data-bind="visible: showPreview &amp;&amp; studentAnswerLaTeX(), maths: showPreview ? studentAnswerLaTeX() : '', click: focusInput"></span>
    <span class="help-block hint precision-hint" data-bind="visible: showPrecisionHint, html: precisionHint"></span>
		<span class="help-block hint fraction-hint" data-bind="visible: showFractionHint, html: fractionHint"></span>
	<span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr"></span>
</xsl:template>

<xsl:template match="part[@type='numberentry']" mode="correctanswer">
	<span class="correct-answer" data-bind="visibleIf: showCorrectAnswer, typeset: showCorrectAnswer">
		<localise>part.correct answer</localise>
		<input type="text" spellcheck="false" disabled="true" class="jme" data-bind="value: correctAnswer, autosize: true"/>
		<span data-bind=""></span>
	</span>
</xsl:template>
{% endraw %}
