{% raw %}
<xsl:template match="part">
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
        <xsl:attribute name="data-bind">with: question.display.getPart('<xsl:value-of select="@path" />'), visible: question.display.getPart('<xsl:value-of select="@path" />').visible, css: {dirty: question.display.getPart('<xsl:value-of select="@path" />').isDirty, 'has-name': question.display.getPart('<xsl:value-of select="@path" />').showName(), answered: answered()}, event: {focusin: focusin, focusout: focusout}</xsl:attribute>
        <xsl:attribute name="data-part-path"><xsl:value-of select="@path" /></xsl:attribute>
        <xsl:attribute name="data-jme-context-description"><xsl:value-of select="@jme-context-description" /></xsl:attribute>
        <xsl:if test="$inline='false'"><h3 class="partheader" data-bind="visible: showName(), latex: name"></h3></xsl:if>
        <xsl:if test="not(ancestor::gaps)">
            <xsl:apply-templates select="prompt" />
        </xsl:if>
        <xsl:if test="count(steps/part)>0">
            <xsl:apply-templates select="steps"/>
        </xsl:if>
        <span class="student-answer">
            <xsl:attribute name="data-bind">css: {answered: scoreFeedback.answered, 'has-warnings': hasWarnings}, attr: {"feedback-state": scoreFeedback.state}</xsl:attribute>
            <xsl:apply-templates select="." mode="typespecific"/>
            <span class="warnings alert alert-warning" aria-live="assertive" role="alert" data-bind="visible: warningsShown, css: {{shown: warningsShown}}, attr: {{id: part.full_path+'-warnings'}}">
                <xsl:comment>ko foreach: warnings</xsl:comment>
                <span class="warning" data-bind="latex: message"></span>
                <xsl:comment>/ko</xsl:comment>
            </span>
        </span>
        <xsl:apply-templates select="." mode="correctanswer"/>
        <xsl:if test="not(ancestor::gaps)">
            <div class="submit-and-feedback" data-bind="visible: doesMarking">
                <button class="btn btn-primary submitPart" data-bind="visible: showSubmitPart, click: controls.submit, text: isDirty() || !scoreFeedback.answered() ? R('question.submit part') : R('question.answer saved')"><localise>question.submit part</localise></button>
                <p class="waiting-for-pre-submit" data-bind="visible: waiting_for_pre_submit"><localise>part.waiting for pre submit</localise></p>
                <div class="feedbackMessages" role="log" aria-live="polite" aria-atomic="true" data-bind="pulse: scoreFeedback.update, visible: !waiting_for_pre_submit() &amp;&amp; feedbackMessages().length>0" localise-data-jme-context-description="part.feedback">
                    <p class="out-of-date-message" data-bind="visible: isDirty"><localise>part.feedback out of date</localise></p>
                    <p class="sr-only" data-bind="visible: isNotOnlyPart, text: feedback_title"></p>
                    <ol data-bind="visible: shownFeedbackMessages().length, foreach: shownFeedbackMessages">
                        <li class="feedbackMessage" data-bind="attr: {{'data-credit-change': credit_change}}">
                            <xsl:comment>ko if: format=='html'</xsl:comment>
                                <span class="message" data-bind="dom: message"></span>
                            <xsl:comment>/ko</xsl:comment>
                            <xsl:comment>ko if: format=='string'</xsl:comment>
                                <span class="message" data-bind="latex: message"></span>
                            <xsl:comment>/ko</xsl:comment>
                            <span data-bind="visible: $parent.showFeedbackIcon, css: 'feedback-icon '+icon" aria-hidden="true"></span> 
                        </li>
                    </ol>
                </div>
                <div class="partFeedback" data-bind="visible: !waiting_for_pre_submit() &amp;&amp; showFeedbackBox()">
                    <div class="marks" data-bind="pulse: scoreFeedback.update, visible: showMarks()">
                        <span class="score" data-bind="html: scoreFeedback.message"></span>
                        <span class="feedback-icon" data-bind="visible: scoreFeedback.iconClass, css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr" aria-hidden="true"></span>
                        <span class="sr-only" data-bind="text: scoreFeedback.iconAttr().title"></span>
                    </div>
                    <small class="answered-state" data-bind="html: scoreFeedback.answeredString"></small>
                </div>
            </div>
            <div class="next-parts" data-bind="visible: showNextParts">
                <p>
                    <span class="what-next" data-bind="text: whatNextMessage"></span>
                </p>
                <button class="btn btn-link" type="button" data-bind="visible: part.settings.suggestGoingBack, click: question.display.goToPreviousPart">⤺ <localise>question.back to previous part</localise></button>
                <ul data-bind="foreach: nextParts">
                    <li class="next-part">
                        <button class="btn btn-primary next-part-option" type="button" data-bind="click: select, css: {{made: made}}">
                            <span data-bind="latex: label"></span>
                            <span class="hint" data-bind="visible: lockAfterLeaving"> <localise>part.choose next part.will be locked</localise></span>
                        </button>
                    </li>
                </ul>
            </div>
            <div class="dead-end" data-bind="visible: reachedDeadEnd">
                <p><localise>part.reached dead end</localise></p>
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
