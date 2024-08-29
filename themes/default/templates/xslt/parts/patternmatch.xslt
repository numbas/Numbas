{% raw %}
<xsl:template match="part[@type='patternmatch']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" class="patternmatch" size="12.5" data-bind="event: inputEvents, textInput: studentAnswer, autosize: true, disable: disabled, attr: {{title: input_title, id: part.full_path+'-input'}}, part_aria_validity: hasWarnings, part: $data"/>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='patternmatch']" mode="correctanswer">
    <span class="correct-answer alert info" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <label>
            <localise>part.correct answer</localise>
            <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" disabled="true" class="patternmatch" data-bind="value: displayAnswer, autosize: true, attr: {{id: part.full_path+'-expected-input'}}"/>
        </label>
    </span>
</xsl:template>
{% endraw %}
