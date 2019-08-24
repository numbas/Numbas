{% raw %}
<xsl:template match="part">
    <xsl:variable name="inline">
        <xsl:choose>
            <xsl:when test="@isgap='true' and @type='1_n_2' and choices/@displaytype='dropdownlist'"><xsl:text>true</xsl:text></xsl:when>
            <xsl:when test="@isgap='true' and not (choices)"><xsl:text>true</xsl:text></xsl:when>
            <xsl:otherwise></xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="tag">
        <xsl:choose>
            <xsl:when test="$inline='true'">span</xsl:when>
            <xsl:otherwise>div</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="clear">
        <xsl:choose>
            <xsl:when test="@isgap='true'"></xsl:when>
            <xsl:otherwise><xsl:text>clearfix</xsl:text></xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="block">
        <xsl:choose>
        <xsl:when test="@type='m_n_2' or @type='m_n_x'"><xsl:text> block</xsl:text></xsl:when>
            <xsl:when test="@type='1_n_2' and @displaytype='radiogroup'"><xsl:text> block</xsl:text></xsl:when>
        </xsl:choose>
    </xsl:variable>
    <xsl:element name="{$tag}">
        <xsl:attribute name="class">part <xsl:value-of select="$clear"/> type-<xsl:value-of select="@type"/> <xsl:value-of select="$block"/><xsl:if test="parent::steps"> step</xsl:if><xsl:if test="parent::gaps"> gap</xsl:if></xsl:attribute>
        <xsl:attribute name="data-bind">with: question.display.getPart('<xsl:value-of select="@path" />'), css: {dirty: question.display.getPart('<xsl:value-of select="@path" />').isDirty, 'has-name': question.display.getPart('<xsl:value-of select="@path" />').showName()}</xsl:attribute>
        <xsl:attribute name="data-part-path"><xsl:value-of select="@path" /></xsl:attribute>
        <xsl:attribute name="data-jme-context-description"><xsl:value-of select="@jme-context-description" /></xsl:attribute>
        <h4 class="partheader" data-bind="visible: showName(), latex: name"></h4>
        <xsl:if test="not(ancestor::gaps)">
            <xsl:apply-templates select="prompt" />
        </xsl:if>
        <xsl:if test="count(steps/part)>0">
            <xsl:apply-templates select="steps"/>
        </xsl:if>
        <span class="student-answer">
            <xsl:attribute name="data-bind">css: {answered: scoreFeedback.answered, 'has-warnings': hasWarnings}, attr: {"feedback-state": scoreFeedback.state}</xsl:attribute>
            <xsl:apply-templates select="." mode="typespecific"/>
            <span class="warnings alert alert-warning" aria-live="assertive" role="alert" data-bind="visible: warningsShown, css: {{shown: warningsShown}}">
                <xsl:comment>ko foreach: warnings</xsl:comment>
                <span class="warning" data-bind="latex: message"></span>
                <xsl:comment>/ko</xsl:comment>
            </span>
        </span>
        <xsl:apply-templates select="." mode="correctanswer"/>
        <xsl:if test="not(ancestor::gaps)">
            <div class="submit-and-feedback" data-bind="visible: doesMarking">
                <xsl:if test="count(../part) &gt; 1 or ancestor::steps">
                    <button class="btn btn-primary submitPart" data-bind="visible: showSubmitPart, click: controls.submit"><localise>question.submit part</localise></button>
                </xsl:if>
                <div class="feedbackMessages" aria-live="polite" role="log" aria-atomic="true" data-bind="pulse: scoreFeedback.update, visible: feedbackMessages().length>0" localise-data-jme-context-description="part.feedback">
                    <p class="out-of-date-message" data-bind="visible: isDirty"><localise>part.feedback out of date</localise></p>
                    <ol data-bind="visible: showFeedbackMessages, foreach: feedbackMessages">
                        <li class="feedbackMessage" data-bind="attr: {{'data-credit-change': credit_change}}"><span data-bind="visible: $parent.showFeedbackIcon, css: 'feedback-icon '+icon" aria-hidden="true"></span> <span data-bind="latex: message"></span></li>
                    </ol>
                </div>
                <div class="partFeedback" aria-live="polite" role="status" data-bind="visible: showFeedbackBox">
                    <div class="marks" data-bind="pulse: scoreFeedback.update, visible: showMarks()">
                        <span class="score" data-bind="html: scoreFeedback.message"></span>
                        <span class="feedback-icon" data-bind="visible: scoreFeedback.iconClass, css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr" aria-hidden="true"></span>
                        <span class="sr-only" data-bind="text: scoreFeedback.iconAttr().title"></span>
                    </div>
                    <small class="answered-state" data-bind="html: scoreFeedback.answeredString"></small>
                </div>
            </div>
            <div class="next-parts" data-bind="visible: showNextParts">
                <p class="what-next"><localise>part.choose next part</localise></p>
                <ul data-bind="foreach: nextParts">
                    <li class="next-part">
                        <button class="btn btn-link next-part-option" type="button" data-bind="latex: label, click: make, disable: disabled"></button>
                    </li>
                </ul>
            </div>
        </xsl:if>
    </xsl:element>
</xsl:template>
<xsl:template match="part" mode="typespecific">
    <localise>question.unsupported part type</localise> <xsl:text> </xsl:text> <xsl:value-of select="@type"/>
</xsl:template>
<xsl:template match="part" mode="correctanswer">
</xsl:template>
{% endraw %}
