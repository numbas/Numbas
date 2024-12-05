{% raw %}
<xsl:template match="choices" mode="one">
    <xsl:variable name="displaytype"><xsl:value-of select="@displaytype"/></xsl:variable>
    <span localise-data-jme-context-description="part.mcq.choices">
    <xsl:choose>
        <xsl:when test="@displaytype='radiogroup'">
            <fieldset data-bind="part_aria_validity: hasWarnings, part: $data, attr: {{id: part.full_path+'-input'}}">
                <legend data-bind="text: input_title" class="sr-only"></legend>
                <ul class="multiplechoice radiogroup" data-bind="reorder_list: {{order: part.shuffleAnswers}}, css: {{'show-cell-answer-state': showCellAnswerState, 'columns': displayColumns}}">
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
                <ul class="multiplechoice checkbox" data-bind="reorder_list: {{order: part.shuffleAnswers}}, css: {{'show-cell-answer-state': showCellAnswerState, 'columns': displayColumns}}">
                    <xsl:variable name="cols" select="@displaycolumns"/>
                    <xsl:if test="$cols>0"> 
                        <xsl:attribute name="style">grid-template-columns: repeat(<xsl:number value="$cols"/>,auto);</xsl:attribute>
                    </xsl:if>
                    <xsl:apply-templates select="choice" mode="checkbox"/>
                </ul>
            </fieldset>
        </xsl:when>
        <xsl:when test="@displaytype='dropdownlist'">
            <select class="multiplechoice dropdownlist screen-only" data-bind="event: inputEvents, value: studentAnswer, disable: disabled, reorder_list: {{order: part.shuffleAnswers, leaders: 1}}, css: {{'show-cell-answer-state': showCellAnswerState}}, attr: {{title: input_title, id: part.full_path+'-input'}}, part_aria_validity: hasWarnings, part: $data">
                <xsl:apply-templates select="choice" mode="dropdownlist-screen"/>
            </select>
            <span class="multiplechoice dropdownlist print-only" data-bind="value: studentAnswer, reorder_list: {{order: part.shuffleAnswers, leaders: 0}}, css: {{'show-cell-answer-state': showCellAnswerState}}, attr: {{title: input_title, id: part.full_path+'-input'}}, part_aria_validity: hasWarnings, part: $data">
                <xsl:apply-templates select="choice" mode="dropdownlist-print"/>
            </span>
        </xsl:when>
    </xsl:choose>
    </span>
</xsl:template>

<xsl:template match="choices" mode="correctanswer">
    <xsl:variable name="displaytype"><xsl:value-of select="@displaytype"/></xsl:variable>
    <span>
    <xsl:choose>
        <xsl:when test="@displaytype='radiogroup'">
            <fieldset data-bind="attr: {{id: part.full_path+'-expected-input'}}">
                <legend><localise>part.correct answer</localise></legend>
                <ul class="multiplechoice radiogroup" data-bind="reorder_list: {{order: part.shuffleAnswers}}">
                    <xsl:apply-templates select="choice" mode="radiogroup-correctanswer"/>
                </ul>
            </fieldset>
        </xsl:when>
        <xsl:when test="@displaytype='checkbox'">
            <fieldset data-bind="attr: {{id: part.full_path+'-expected-input'}}">
                <legend><localise>part.correct answer</localise></legend>
                <ul class="multiplechoice checkbox" data-bind="reorder_list: {{order: part.shuffleAnswers}}">
                    <xsl:apply-templates select="choice" mode="checkbox-correctanswer"/>
                </ul>
            </fieldset>
        </xsl:when>
        <xsl:when test="@displaytype='dropdownlist'">
            <label>
                <localise>part.correct answer</localise>
                <select class="multiplechoice screen-only" data-bind="value: correctAnswer, reorder_list: {{order: part.shuffleAnswers, leaders: 1}}, attr: {{id: part.full_path+'-expected-input'}}" disabled="true">
                    <xsl:apply-templates select="choice" mode="dropdownlist-correctanswer-screen"/>
                </select>
                <span class="multiplechoice dropdownlist print-only" data-bind="value: correctAnswer, reorder_list: {{order: part.shuffleAnswers, leaders: 0}}, attr: {{id: part.full_path+'-expected-input'}}" disabled="true">
                    <xsl:apply-templates select="choice" mode="dropdownlist-correctanswer-print"/>
                </span>
            </label>
        </xsl:when>
    </xsl:choose>
    </span>
</xsl:template>

<xsl:template match="choice" mode="dropdownlist-screen">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <option value="{$choicenum}">
        <!-- Automatically select the first option as the default -->
        <xsl:attribute name="selected">
            <xsl:if test="$choicenum = 0">selected</xsl:if>
        </xsl:attribute>
        <xsl:apply-templates select="content" mode="no-paragraph" />
    </option>
</xsl:template>

<xsl:template match="choice" mode="dropdownlist-correctanswer-screen">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <option value="{$choicenum}">
        <xsl:apply-templates select="content" mode="no-paragraph" />
    </option>
</xsl:template>

<xsl:template match="choice" mode="dropdownlist-print">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <span class="dropdownlist-option" value="{$choicenum}">
        <xsl:attribute name="data-bind">css: {'checked': studentAnswer()==="<xsl:value-of select="$choicenum"/>"}</xsl:attribute>
        <xsl:apply-templates select="content" mode="no-paragraph"/>
    </span>
</xsl:template>

<xsl:template match="choice" mode="dropdownlist-correctanswer-print">
    <xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
    <span class="dropdownlist-option" value="{$choicenum}">
        <xsl:attribute name="data-bind">css: {'checked': correctAnswer()==="<xsl:value-of select="$choicenum"/>"}</xsl:attribute>
        <xsl:apply-templates select="content" mode="no-paragraph"/>
    </span>
</xsl:template>
{% endraw %}
