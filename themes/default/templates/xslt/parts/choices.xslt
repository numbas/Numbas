{% raw %}
<xsl:template match="choices" mode="one">
    <xsl:variable name="displaytype"><xsl:value-of select="@displaytype"/></xsl:variable>
    <span localise-data-jme-context-description="part.mcq.choices">
    <xsl:choose>
        <xsl:when test="@displaytype='radiogroup'">
            <fieldset data-bind="part_aria_validity: hasWarnings, part: $data, attr: {{id: part.full_path+'-input'}}">
                <legend data-bind="text: input_title" class="sr-only"></legend>
                <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}, css: {{'show-cell-answer-state': showCellAnswerState, 'columns': displayColumns}}">
                    <xsl:variable name="cols" select="@displaycolumns"/>
                    <xsl:if test="$cols>0"> 
                        <xsl:attribute name="style">grid-template-columns: repeat(<xsl:number value="$cols"/>,auto);</xsl:attribute>
                    </xsl:if>
                    <xsl:apply-templates select="choice" mode="radiogroup"/>
                </ul>
            </fieldset>
        </xsl:when>
        <xsl:when test="@displaytype='checkbox'">
            <fieldset data-bind="part_aria_validity: hasWarnings, part: $data, attr: {{id: part.full_path+'-input'}}">
                <legend data-bind="text: input_title" class="sr-only"></legend>
                <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}, css: {{'show-cell-answer-state': showCellAnswerState, 'columns': displayColumns}}">
                    <xsl:variable name="cols" select="@displaycolumns"/>
                    <xsl:if test="$cols>0"> 
                        <xsl:attribute name="style">grid-template-columns: repeat(<xsl:number value="$cols"/>,auto);</xsl:attribute>
                    </xsl:if>
                    <xsl:apply-templates select="choice" mode="checkbox"/>
                </ul>
            </fieldset>
        </xsl:when>
        <xsl:when test="@displaytype='dropdownlist'">
            <select class="multiplechoice" data-bind="value: studentAnswer, disable: disabled, reorder_list: {{order: part.shuffleAnswers, leaders: 1}}, css: {{'show-cell-answer-state': showCellAnswerState}}, attr: {{title: input_title, id: part.full_path+'-input'}}, part_aria_validity: hasWarnings, part: $data">
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
            <fieldset>
                <legend><localise>part.correct answer</localise></legend>
                <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}">
                    <xsl:apply-templates select="choice" mode="radiogroup-correctanswer"/>
                </ul>
            </fieldset>
        </xsl:when>
        <xsl:when test="@displaytype='checkbox'">
            <fieldset>
                <legend><localise>part.correct answer</localise></legend>
                <ul class="multiplechoice" data-bind="reorder_list: {{order: part.shuffleAnswers}}">
                    <xsl:apply-templates select="choice" mode="checkbox-correctanswer"/>
                </ul>
            </fieldset>
        </xsl:when>
        <xsl:when test="@displaytype='dropdownlist'">
            <label>
                <localise>part.correct answer</localise>
                <select class="multiplechoice" data-bind="value: correctAnswer, reorder_list: {{order: part.shuffleAnswers, leaders: 1}}" disabled="true">
                    <option value=""></option>
                    <xsl:apply-templates select="choice" mode="dropdownlist-correctanswer"/>
                </select>
            </label>
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
            <input type="radio" class="choice" data-bind="checked: studentAnswer, disable: disabled, attr: {{name: part.path+'-choice'}}" value="{$choicenum}"/>
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
            <input type="radio" class="choice" data-bind="checked: correctAnswer()+'', attr: {{name: part.path+'-correctanswer'}}" disabled="true" value="{$choicenum}"/>
            <xsl:apply-templates select="content"/>
        </label>
    </li>
</xsl:template>
<xsl:template match="choice" mode="checkbox">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <li>
        <xsl:attribute name="data-bind">css: {checked: ticks[<xsl:value-of select="$choicenum"/>], correct: ticks[<xsl:value-of select="$choicenum"/>] &amp;&amp; correctTicks()[<xsl:value-of select="$choicenum"/>]}</xsl:attribute>
        <label>
            <input type="checkbox" class="choice" data-bind="checked: ticks[{$choicenum}], disable: disabled, attr: {{name: part.path+'-choice'}}" />
            <xsl:apply-templates select="content"/>
        </label>
    </li>
</xsl:template>
<xsl:template match="choice" mode="checkbox-correctanswer">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <li>
        <label>
            <input type="checkbox" class="choice" name="choice" data-bind="checked: correctTicks()[{$choicenum}], attr: {{name: part.path+'-correctanswer'}}" disabled="true" />
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
