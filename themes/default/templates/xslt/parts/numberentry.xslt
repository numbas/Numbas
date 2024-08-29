{% raw %}
<xsl:template match="part[@type='numberentry']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" step="{answer/inputstep/@value}" class="numberentry" data-bind="event: inputEvents, textInput: studentAnswer, autosize: true, disable: disabled, css: {{'has-error': warningsShown}}, attr: {{title: input_title, id: part.full_path+'-input'}}, part_aria_validity: hasWarnings, part: $data"/>
    <span class="preview" data-bind="visible: showPreview &amp;&amp; studentAnswerLaTeX(), maths: showPreview ? studentAnswerLaTeX() : '', click: focusInput"></span>
    <span class="help-block hint precision-hint" data-bind="visible: showInputHint, html: inputHint"></span>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='numberentry']" mode="correctanswer">
    <span class="correct-answer alert info" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <label>
            <localise>part.correct answer</localise>
            <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" disabled="true" class="jme" data-bind="value: correctAnswer, autosize: true, attr: {{id: part.full_path+'-expected-input'}}"/>
        </label>
    </span>
</xsl:template>
{% endraw %}
