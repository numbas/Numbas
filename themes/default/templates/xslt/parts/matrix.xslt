{% raw %}
<xsl:template match="part[@type='matrix']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <span><matrix-input params="rows: studentAnswerRows, columns: studentAnswerColumns, value: studentAnswer, allowResize: allowResize, disable: revealed, events: inputEvents, title: input_title"></matrix-input></span>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='matrix']" mode="correctanswer">
    <span class="correct-answer" data-bind="visibleIf: showCorrectAnswer, typeset: showCorrectAnswer">
        <label>
            <localise>part.correct answer</localise>
            <span><matrix-input params="rows: correctAnswerRows, columns: correctAnswerColumns, value: correctAnswer, allowResize: false, disable: true"></matrix-input></span>
        </label>
    </span>
</xsl:template>
{% endraw %}
