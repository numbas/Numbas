{% raw %}
<xsl:template match="part[@type='m_n_x']" mode="typespecific">
    <xsl:variable name="displaytype" select="choices/@displaytype"/>
    <form autocomplete="nope">
        <fieldset>
            <legend data-bind="attr: {{'aria-label': input_title}}"></legend>
            <table class="choices-grid" data-bind="reorder_table: {{rows: part.shuffleChoices, columns: part.shuffleAnswers, leaders: 1}}, css: {{'show-cell-answer-state': showCellAnswerState}}">
                <thead localise-data-jme-context-description="part.mcq.answers">
                    <td/>
                    <xsl:for-each select="answers/answer">
                        <th><xsl:apply-templates select="content"/></th>
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
    <div class="correct-answer" data-bind="visibleIf: showCorrectAnswer, typeset: showCorrectAnswer">
        <form autocomplete="nope">
            <legend><localise>part.correct answer</localise></legend>
            <fieldset>
                <legend data-bind="attr: {{'aria-label': input_title}}"></legend>
                <table class="choices-grid" data-bind="reorder_table: {{rows: part.shuffleChoices, columns: part.shuffleAnswers, leaders: 1}}">
                    <thead>
                        <td/>
                        <xsl:for-each select="answers/answer">
                            <th><xsl:apply-templates select="content"/></th>
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
        <td class="choice"><xsl:apply-templates select="content"/></td>
        <xsl:for-each select="$answers/answer">
            <xsl:variable name="answernum" select="count(preceding-sibling::answer)"/>
            <td class="option">
                <xsl:choose>
                    <xsl:when test="$displaytype='checkbox'">
                        <xsl:attribute name="data-bind">css: {checked: ticks[<xsl:value-of select="$answernum"/>][<xsl:value-of select="$choicenum"/>], correct: ticks[<xsl:value-of select="$answernum"/>][<xsl:value-of select="$choicenum"/>] &amp;&amp; correctTicks()[<xsl:value-of select="$answernum"/>][<xsl:value-of select="$choicenum"/>]}</xsl:attribute>
                        <input type="checkbox" class="choice" data-bind="checked: ticks[{$answernum}][{$choicenum}], disable: disabled, visible: layout[{$answernum}][{$choicenum}], attr: {{name: part.path+'-choice-'+{$choicenum}}}" />
                    </xsl:when>
                    <xsl:when test="$displaytype='radiogroup'">
                        <xsl:attribute name="data-bind">css: {checked: ticks[<xsl:value-of select="$choicenum"/>]()==<xsl:value-of select="$answernum"/>, correct: ticks[<xsl:value-of select="$choicenum"/>]()==<xsl:value-of select="$answernum"/> &amp;&amp; correctTicks()[<xsl:value-of select="$choicenum"/>]==<xsl:value-of select="$answernum"/>}</xsl:attribute>
                        <input type="radio" class="choice" data-bind="checked: ticks[{$choicenum}], disable: disabled, visible: layout[{$answernum}][{$choicenum}], attr: {{name: part.path+'-choice-'+{$choicenum}}}" value="{$answernum}"/>
                    </xsl:when>
                </xsl:choose>
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
        <td class="choice"><xsl:apply-templates select="content"/></td>
        <xsl:for-each select="$answers/answer">
            <xsl:variable name="answernum" select="count(preceding-sibling::answer)"/>
            <td class="option">
                <xsl:choose>
                    <xsl:when test="$displaytype='checkbox'">
                        <input type="checkbox" class="choice" data-bind="checked: correctTicks()[{$answernum}][{$choicenum}], visible: layout[{$answernum}][{$choicenum}], disable: true, attr: {{name: part.path+'-choice-'+{$choicenum}+'-correctanswer'}}" disabled="true"/>
                    </xsl:when>
                    <xsl:when test="$displaytype='radiogroup'">
                        <input type="radio" class="choice" data-bind="checked: correctTicks()[{$choicenum}]+'', visible: layout[{$answernum}][{$choicenum}], disable: true, attr: {{name: part.path+'-choice-'+{$choicenum}+'-correctanswer'}}" disabled="true" value="{$answernum}"/>
                    </xsl:when>
                </xsl:choose>
            </td>
        </xsl:for-each>
    </tr>
</xsl:template>
{% endraw %}
