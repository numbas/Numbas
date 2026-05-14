{% raw %}
<xsl:template match="part[@type='gapfill']" mode="typespecific">
</xsl:template>
<xsl:template match="part[@type='gapfill']" mode="correctanswer">
    <label>
        <localise>part.correct answer</localise>
        <span class="content-area">
            <xsl:apply-templates select="prompt/content/*" mode="inlinegapcorrectanswer" />
        </span>
    </label>
</xsl:template>
<xsl:template match="gapfill" mode="content">
    <xsl:variable name="n"><xsl:value-of select="@reference"/></xsl:variable>
    <xsl:apply-templates select="ancestor::part[1]/gaps/part[$n+1]" />
</xsl:template>

<xsl:template match="inlinegapcorrectanswer">
    <xsl:apply-templates select="*" mode="inlinegapcorrectanswer" />
</xsl:template>

<xsl:template match="@*|node()" mode="inlinegapcorrectanswer">
    <xsl:copy>
        <xsl:apply-templates select="@*|node()" mode="inlinegapcorrectanswer" />
    </xsl:copy>
</xsl:template>

<xsl:template match="gapfill" mode="inlinegapcorrectanswer">
    <xsl:variable name="n"><xsl:value-of select="@reference"/></xsl:variable>
    <xsl:apply-templates select="ancestor::part[1]/gaps/part[$n+1]" mode="inlinegapcorrectanswer" />
</xsl:template>

<xsl:template match="part" mode="inlinegapcorrectanswer">
    <xsl:variable name="inline">
        <xsl:choose>
            <xsl:when test="@isgap='true' and @type='1_n_2' and choices/@displaytype='dropdownlist'"><xsl:text>true</xsl:text></xsl:when>
            <xsl:when test="@isgap='true' and not (choices)"><xsl:text>true</xsl:text></xsl:when>
            <xsl:otherwise><xsl:text>false</xsl:text></xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="tag">
        <xsl:choose>
            <xsl:when test="$inline='true'">span</xsl:when>
            <xsl:otherwise>section</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:element name="{$tag}">
        <xsl:attribute name="class">gap correct answer</xsl:attribute>
        <xsl:attribute name="data-bind">with: question.display.getPart('<xsl:value-of select="@path" />'), visible: question.display.getPart('<xsl:value-of select="@path" />').visible, css: {dirty: question.display.getPart('<xsl:value-of select="@path" />').isDirty, 'has-name': question.display.getPart('<xsl:value-of select="@path" />').showName(), answered: answered(), dirty: isDirty(), 'has-feedback-messages': hasFeedbackMessages()}, event: event_handlers</xsl:attribute>
        <xsl:apply-templates select="." mode="correctanswerinput" />
    </xsl:element>
</xsl:template>
{% endraw %}
