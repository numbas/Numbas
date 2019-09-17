{% raw %}
<xsl:template match="choices" mode="one">
    <xsl:variable name="displaytype"><xsl:value-of select="@displaytype"/></xsl:variable>
    <span localise-data-jme-context-description="part.mcq.choices">
    <xsl:choose>
        <xsl:when test="@displaytype='radiogroup'">
            <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}, css: {{'show-cell-answer-state': showCellAnswerState, 'columns': displayColumns}}">
                <xsl:variable name="cols" select="@displaycolumns"/>
                <xsl:if test="$cols>0"> 
                    <xsl:attribute name="style">grid-template-columns: repeat(<xsl:number value="$cols"/>,auto);</xsl:attribute>
                </xsl:if>
                <xsl:apply-templates select="choice" mode="radiogroup"/>
            </ul>
        </xsl:when>
        <xsl:when test="@displaytype='checkbox'">
            <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}, css: {{'show-cell-answer-state': showCellAnswerState, 'columns': displayColumns}}">
                <xsl:variable name="cols" select="@displaycolumns"/>
                <xsl:if test="$cols>0"> 
                    <xsl:attribute name="style">grid-template-columns: repeat(<xsl:number value="$cols"/>,auto);</xsl:attribute>
                </xsl:if>
                <xsl:apply-templates select="choice" mode="checkbox"/>
            </ul>
        </xsl:when>
        <xsl:when test="@displaytype='dropdownlist'">
            <select class="multiplechoice" data-bind="value: studentAnswer, disable: revealed, reorder_list: {{order: part.shuffleAnswers, leaders: 1}}, css: {{'show-cell-answer-state': showCellAnswerState}}">
                <option value=""></option>
                <xsl:apply-templates select="choice" mode="dropdownlist"/>
            </select>
        </xsl:when>
    </xsl:choose>
    </span>
</xsl:template>
<xsl:template match="choices" mode="correctanswer">
    <xsl:variable name="displaytype"><xsl:value-of select="@displaytype"/></xsl:variable>
    <span>
    <xsl:choose>
        <xsl:when test="@displaytype='radiogroup'">
            <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}">
                <xsl:apply-templates select="choice" mode="radiogroup-correctanswer"/>
            </ul>
        </xsl:when>
        <xsl:when test="@displaytype='checkbox'">
            <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}">
                <xsl:apply-templates select="choice" mode="checkbox-correctanswer"/>
            </ul>
        </xsl:when>
        <xsl:when test="@displaytype='dropdownlist'">
            <select class="multiplechoice" data-bind="value: correctAnswer, reorder_list: {{order: part.shuffleAnswers, leaders: 1}}" disabled="true">
                <option value=""></option>
                <xsl:apply-templates select="choice" mode="dropdownlist-correctanswer"/>
            </select>
        </xsl:when>
    </xsl:choose>
    </span>
</xsl:template>
<xsl:template match="choice" mode="radiogroup">
    <xsl:variable name="path">
        <xsl:apply-templates select="../.." mode="path"/>
    </xsl:variable>
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <li>
        <xsl:attribute name="data-bind">css: {checked: studentAnswer()==<xsl:value-of select="$choicenum"/>, correct: studentAnswer()==<xsl:value-of select="$choicenum"/> &amp;&amp; correctAnswer()==<xsl:value-of select="$choicenum"/>}</xsl:attribute>
        <label>
            <input type="radio" class="choice" name="{$path}-choice" data-bind="checked: studentAnswer, disable: revealed" value="{$choicenum}"/>
            <xsl:apply-templates select="content"/>
        </label>
    </li>
</xsl:template>
<xsl:template match="choice" mode="radiogroup-correctanswer">
    <xsl:variable name="path">
        <xsl:apply-templates select="../.." mode="path"/>
    </xsl:variable>
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <li>
        <label>
            <input type="radio" class="choice" name="{$path}-choice-correctanswer" data-bind="checked: correctAnswer()+''" disabled="true" value="{$choicenum}"/>
            <xsl:apply-templates select="content"/>
        </label>
    </li>
</xsl:template>
<xsl:template match="choice" mode="checkbox">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <li>
        <xsl:attribute name="data-bind">css: {checked: ticks[<xsl:value-of select="$choicenum"/>], correct: ticks[<xsl:value-of select="$choicenum"/>] &amp;&amp; correctTicks()[<xsl:value-of select="$choicenum"/>]}</xsl:attribute>
        <label>
            <input type="checkbox" class="choice" name="choice" data-bind="checked: ticks[{$choicenum}], disable: revealed" />
            <xsl:apply-templates select="content"/>
        </label>
    </li>
</xsl:template>
<xsl:template match="choice" mode="checkbox-correctanswer">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <li>
        <label>
            <input type="checkbox" class="choice" name="choice" data-bind="checked: correctTicks()[{$choicenum}]" disabled="true" />
            <xsl:apply-templates select="content"/>
        </label>
    </li>
</xsl:template>
<xsl:template match="choice" mode="dropdownlist">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <option value="{$choicenum}">
        <xsl:apply-templates select="content"/>
    </option>
</xsl:template>
<xsl:template match="choice" mode="dropdownlist-correctanswer">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <option value="{$choicenum}">
        <xsl:apply-templates select="content"/>
    </option>
</xsl:template>
<xsl:template match="distractor">
    <span><xsl:apply-templates /></span>
</xsl:template>
{% endraw %}
