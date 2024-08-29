{% raw %}
<xsl:template match="part[@type='matrix']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <span><matrix-input data-bind="attr: {{id: part.full_path+'-input'}}" params="rows: studentAnswerRows, columns: studentAnswerColumns, prefilledCells: prefilledCells, value: studentAnswer, allowResize: allowResize, minColumns: minColumns, maxColumns: maxColumns, minRows: minRows, maxRows: maxRows, disable: disabled, events: inputEvents, title: input_title"></matrix-input></span>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='matrix']" mode="correctanswer">
    <span class="correct-answer alert info" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <label>
            <localise>part.correct answer</localise>
            <span><matrix-input data-bind="attr: {{id: part.full_path+'-expected-input'}}" params="rows: correctAnswerRows, columns: correctAnswerColumns, prefilledCells: prefilledCells, value: correctAnswer, allowResize: false, disable: true"></matrix-input></span>
        </label>
    </span>
</xsl:template>
{% endraw %}
