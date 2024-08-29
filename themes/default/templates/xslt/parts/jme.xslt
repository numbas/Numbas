{% raw %}
<xsl:template match="part[@type='jme']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" class="jme" data-bind="event: inputEvents, textInput: studentAnswer, autosize: true, disable: disabled, attr: {{title: input_title, id: part.full_path+'-input'}}, part_aria_validity: hasWarnings, part: $data"/>
    <span class="jme-preview" data-bind="visible: showPreview &amp;&amp; studentAnswerLaTeX()">
        <span class="sr-only"><localise>jme.interpreted as</localise></span>
        <output aria-live="polite" data-bind="attr: {{for: part.full_path+'-input'}}, maths: showPreview ? '\\displaystyle{{'+studentAnswerLaTeX()+'}}' : '', click: focusInput"></output>
    </span>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='jme']" mode="correctanswer">
    <span class="correct-answer alert info" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <label>
            <localise>part.correct answer</localise>
            <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" disabled="true" class="jme" data-bind="value: correctAnswer, autosize: true, attr: {{id: part.full_path+'-expected-input'}}"/>
            <span class="jme-preview">
                <span class="sr-only"><localise>jme.interpreted as</localise></span>
                <output aria-live="polite" data-bind="attr: {{for: part.full_path+'-correct-input'}}, maths: '\\displaystyle{{'+correctAnswerLaTeX()+'}}'"></output>
            </span>
        </label>
    </span>
</xsl:template>
{% endraw %}
