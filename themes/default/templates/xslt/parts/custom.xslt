{% raw %}
<xsl:template match="part[@custom='true']" mode="typespecific">
    <xsl:if test="count(steps/part)>0"><localise>part.with steps answer prompt</localise></xsl:if>
    <span data-bind="event: inputEvents, component: {{name: 'answer-widget', params: {{answer: studentAnswer, widget: input_widget, widget_options: input_options, part: part, disable: disabled, events: part.display.inputEvents, title: input_title, id: part.full_path}}}}"></span>
    <span class="help-block hint" data-bind="visible: input_options.hint, html: input_options.hint, typeset: input_options.hint"></span>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@custom='true']" mode="correctanswer">
    <span class="correct-answer alert info" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <label>
            <localise>part.correct answer</localise>
            <span data-bind="component: {{name: 'answer-widget', params: {{answer: correctAnswer, widget: input_widget, widget_options: input_options, part: part, disable: true, id: part.full_path+'-expected'}}}}"></span>
        </label>
    </span>
</xsl:template>
{% endraw %}
