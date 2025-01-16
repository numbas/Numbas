{% raw %}
<xsl:template match="part[@type='matrix']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <matrix-input data-bind="attr: {{id: part.full_path+'-input'}}" params="rows: studentAnswerRows, columns: studentAnswerColumns, prefilledCells: prefilledCells, value: studentAnswer, allowResize: allowResize, minColumns: minColumns, maxColumns: maxColumns, minRows: minRows, maxRows: maxRows, disable: disabled, events: inputEvents, title: input_title"></matrix-input>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='matrix']" mode="correctanswer">
    <label>
        <localise>part.correct answer</localise>
        <matrix-input data-bind="attr: {{id: part.full_path+'-expected-input'}}" params="rows: correctAnswerRows, columns: correctAnswerColumns, prefilledCells: prefilledCells, value: correctAnswer, allowResize: false, disable: true"></matrix-input>
    </label>
</xsl:template>
{% endraw %}
