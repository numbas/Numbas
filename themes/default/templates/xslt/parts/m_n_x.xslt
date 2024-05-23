{% raw %}
<xsl:template match="part[@type='m_n_x']" mode="typespecific">
    <xsl:variable name="displaytype" select="choices/@displaytype"/>
    <form autocomplete="off">
        <fieldset data-bind="part_aria_validity: hasWarnings, part: $data, attr: {{id: part.full_path+'-input'}}">
            <legend data-bind="text: input_title" class="sr-only"></legend>
            <table class="choices-grid" data-bind="reorder_table: {{rows: part.shuffleChoices, columns: part.shuffleAnswers, leaders: 1}}, css: {{'show-cell-answer-state': showCellAnswerState}}">
                <thead localise-data-jme-context-description="part.mcq.answers">
                    <td/>
                    <xsl:for-each select="answers/answer">
                        <xsl:variable name="answernum" select="count(preceding-sibling::answer)"/>
                        <th data-bind="attr: {{id: part.full_path+'-answer-{$answernum}'}}"><xsl:apply-templates select="content"/></th>
                    </xsl:for-each>
                </thead>
                <tbody>
                    <xsl:for-each select="choices/choice">
                        <xsl:apply-templates select="." mode="m_n_x">
                            <xsl:with-param name="displaytype" select="$displaytype"/>
                        </xsl:apply-templates>
                    </xsl:for-each>
                </tbody>
            </table>
        </fieldset>
    </form>
{% endraw %}
    {% include 'xslt/feedback_icon.xslt' %}
{% raw %}
</xsl:template>
<xsl:template match="part[@type='m_n_x']" mode="correctanswer">
    <xsl:variable name="displaytype" select="choices/@displaytype"/>
    <div class="correct-answer" data-bind="visible: showCorrectAnswer, typeset: showCorrectAnswer">
        <form autocomplete="off">
            <legend><localise>part.correct answer</localise></legend>
            <fieldset data-bind="attr: {{id: part.full_path+'-correct-input'}}">
                <legend data-bind="text: input_title" class="sr-only"></legend>
                <table class="choices-grid" data-bind="reorder_table: {{rows: part.shuffleChoices, columns: part.shuffleAnswers, leaders: 1}}">
                    <thead>
                        <td/>
                        <xsl:for-each select="answers/answer">
                            <xsl:variable name="answernum" select="count(preceding-sibling::answer)"/>
                            <th data-bind="attr: {{id: part.full_path+'-expected-answer-{$answernum}'}}"><xsl:apply-templates select="content"/></th>
                        </xsl:for-each>
                    </thead>
                    <tbody>
                        <xsl:for-each select="choices/choice">
                            <xsl:apply-templates select="." mode="m_n_x-correctanswer">
                                <xsl:with-param name="displaytype" select="$displaytype"/>
                            </xsl:apply-templates>
                        </xsl:for-each>
                    </tbody>
                </table>
            </fieldset>
        </form>
    </div>
</xsl:template>
<xsl:template match="choice" mode="m_n_x">
    <xsl:param name="displaytype"/>
    <xsl:variable name="path">
        <xsl:apply-templates select="../.." mode="path"/>
    </xsl:variable>
    <xsl:variable name="answers" select="../../answers"/>
    <xsl:variable name="choicenum" select="count(preceding-sibling::choice)"/>
    <tr>
        <th class="choice" data-bind="attr: {{id: part.full_path+'-choice-{$choicenum}'}}"><xsl:apply-templates select="content"/></th>
        <xsl:for-each select="$answers/answer">
            <xsl:variable name="answernum" select="count(preceding-sibling::answer)"/>
            <td class="option">
                <xsl:attribute name="data-bind">css: tickFeedback()[<xsl:value-of select="$answernum"/>][<xsl:value-of select="$choicenum"/>]</xsl:attribute>
                <label>
                <xsl:choose>
                    <xsl:when test="$displaytype='checkbox'">
                        <input type="checkbox" class="choice" data-bind="event: inputEvents, checked: ticks[{$answernum}][{$choicenum}], disable: disabled, visible: layout[{$answernum}][{$choicenum}], attr: {{name: part.full_path+'-choice-{$choicenum}', 'aria-labelledby': part.full_path+'-choice-{$choicenum} '+part.full_path+'-answer-{$answernum}'}}" />
                    </xsl:when>
                    <xsl:when test="$displaytype='radiogroup'">
                        <input type="radio" class="choice" data-bind="event: inputEvents, checked: ticks[{$choicenum}], disable: disabled, visible: layout[{$answernum}][{$choicenum}], attr: {{name: part.path+'-choice-'+{$choicenum}, 'aria-labelledby': part.full_path+'-choice-{$choicenum} '+part.full_path+'-answer-{$answernum}'}}" value="{$answernum}"/>
                    </xsl:when>
                </xsl:choose>
                </label>
            </td>
        </xsl:for-each>
    </tr>
</xsl:template>
<xsl:template match="choice" mode="m_n_x-correctanswer">
    <xsl:param name="displaytype"/>
    <xsl:variable name="path">
        <xsl:apply-templates select="../.." mode="path"/>
    </xsl:variable>
    <xsl:variable name="answers" select="../../answers"/>
    <xsl:variable name="choicenum" select="count(preceding-sibling::choice)"/>
    <tr>
        <th class="choice" data-bind="attr: {{id: part.full_path+'-expected-choice-{$choicenum}'}}"><xsl:apply-templates select="content"/></th>
        <xsl:for-each select="$answers/answer">
            <xsl:variable name="answernum" select="count(preceding-sibling::answer)"/>
            <td class="option">
                <xsl:choose>
                    <xsl:when test="$displaytype='checkbox'">
                        <input type="checkbox" class="choice" data-bind="checked: correctTicks()[{$answernum}][{$choicenum}], visible: layout[{$answernum}][{$choicenum}], disable: true, attr: {{name: part.path+'-choice-{$choicenum}-correctanswer', 'aria-labelledby': part.full_path+'-expected-choice-{$choicenum} '+part.full_path+'-expected-answer-{$answernum}'}}" disabled="true"/>
                    </xsl:when>
                    <xsl:when test="$displaytype='radiogroup'">
                        <input type="radio" class="choice" data-bind="checked: correctTicks()[{$choicenum}]+'', visible: layout[{$answernum}][{$choicenum}], disable: true, attr: {{name: part.path+'-choice-'+{$choicenum}+'-correctanswer', 'aria-labelledby': part.full_path+'-expected-choice-{$choicenum} '+part.full_path+'-expected-answer-{$answernum}'}}" disabled="true" value="{$answernum}"/>
                    </xsl:when>
                </xsl:choose>
            </td>
        </xsl:for-each>
    </tr>
</xsl:template>
{% endraw %}
