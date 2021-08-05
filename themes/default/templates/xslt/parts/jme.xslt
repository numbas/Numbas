{% raw %}
<xsl:template match="part[@type='jme']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" class="jme" data-bind="event: inputEvents, textInput: studentAnswer, autosize: true, disable: disabled, attr: {{title: input_title}}"/>
    <span class="jme-preview" data-bind="visible: showPreview &amp;&amp; studentAnswerLaTeX()">
        <span class="sr-only"><localise>jme.interpreted as</localise></span>
        <span aria-live="polite" data-bind="maths: showPreview ? '\\displaystyle{{'+studentAnswerLaTeX()+'}}' : '', click: focusInput"></span>
    </span>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='jme']" mode="correctanswer">
    <span class="correct-answer" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <label>
            <localise>part.correct answer</localise>
            <input type="text" autocapitalize="off" inputmode="text" spellcheck="false" disabled="true" class="jme" data-bind="value: correctAnswer, autosize: true"/>
            <span class="jme-preview" aria-live="polite">
                <span class="sr-only"><localise>jme.interpreted as</localise></span>
                <span aria-live="polite" data-bind="maths: '\\displaystyle{{'+correctAnswerLaTeX()+'}}'"></span>
            </span>
        </label>
    </span>
</xsl:template>
{% endraw %}
