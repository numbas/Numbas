{% raw %}
<xsl:template match="parts">
	<div class="parts">
		<xsl:apply-templates />
	</div>
</xsl:template>

<xsl:template match="part" mode="path">
	<xsl:choose>
		<xsl:when test="parent::gaps">
			<xsl:apply-templates select="../.." mode="path" />
			<xsl:text>g</xsl:text>
		</xsl:when>
		<xsl:when test="parent::steps">
			<xsl:apply-templates select="../.." mode="path" />
			<xsl:text>s</xsl:text>
		</xsl:when>
		<xsl:when test="parent::parts">
			<xsl:text>p</xsl:text>
		</xsl:when>
	</xsl:choose>
	<xsl:value-of select="count(preceding-sibling::part)" />
</xsl:template>

<xsl:template match="part">
	<xsl:variable name="path">
		<xsl:apply-templates select="." mode="path"/>
	</xsl:variable>
	<xsl:variable name="tag">
		<xsl:choose>
			<xsl:when test="ancestor::gaps and not (choices)">span</xsl:when>
			<xsl:otherwise>div</xsl:otherwise>
		</xsl:choose>
	</xsl:variable>
	<xsl:variable name="clear">
		<xsl:choose>
			<xsl:when test="ancestor::gaps"></xsl:when>
			<xsl:otherwise><xsl:text>clearfix</xsl:text></xsl:otherwise>
		</xsl:choose>
	</xsl:variable>
	<xsl:variable name="block">
		<xsl:if test="@type='1_n_2' or @type='m_n_2' or @type='m_n_x'"><xsl:text> block</xsl:text></xsl:if>
	</xsl:variable>

	<xsl:if test="parent::parts">
		<xsl:if test="count(../part) &gt; 1">
			<h4 class="partheader"><xsl:number count="part" format="a) "/></h4>
		</xsl:if>
	</xsl:if>
	<xsl:element name="{$tag}">
		<xsl:attribute name="class">part <xsl:value-of select="$clear"/> type-<xsl:value-of select="@type"/> <xsl:value-of select="$block"/></xsl:attribute>
        <xsl:attribute name="data-bind">with: question.display.getPart('<xsl:value-of select="$path" />')</xsl:attribute>
        <xsl:attribute name="data-part-path"><xsl:value-of select="$path" /></xsl:attribute>
        <xsl:attribute name="data-jme-context-description"><xsl:value-of select="@jme-context-description" /></xsl:attribute>

		<xsl:if test="not(ancestor::gaps)">
			<xsl:apply-templates select="prompt" />
		</xsl:if>
		<xsl:if test="count(steps/part)>0">
			<xsl:apply-templates select="steps"/>
		</xsl:if>
        <span class="student-answer">
            <xsl:attribute name="data-bind">css: {dirty: isDirty, answered: scoreFeedback.answered}, attr: {"feedback-state": scoreFeedback.state}</xsl:attribute>

			<xsl:apply-templates select="." mode="typespecific"/>
			<span class="warning-icon icon-exclamation-sign" data-bind="visible: warnings().length>0, hover: warningsShown, event: {{focus: showWarnings, blur: hideWarnings}}" tabindex="0"></span>
			<span class="warnings alert alert-danger" data-bind="foreach: warnings, visible: warningsShown">
				<span class="warning" data-bind="latex: message"></span>
			</span>
		</span>
		<xsl:apply-templates select="." mode="correctanswer"/>
		<xsl:if test="not(ancestor::gaps)">
			<div class="container-fluid">
				<div class="row">
					<div class="partFeedback .col-2 well pull-right" data-bind="visible: showFeedbackBox">
						<button class="btn btn-primary submitPart" data-bind="css: {{dirty: isDirty}}, click: controls.submit, slideVisible: showSubmitPart"><localise>question.submit part</localise></button>
						<div class="marks" data-bind="pulse: scoreFeedback.update, visible: showMarks()">
							<span class="score" data-bind="html: scoreFeedback.message, visible: isNotOnlyPart"></span>
							<span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr"></span>
						</div>
						<button class="btn btn-primary" id="feedbackToggle" data-bind="slideVisible: showFeedbackToggler, click: controls.toggleFeedback, text: toggleFeedbackText"></button>
					</div>
				</div>
				<div class="row">
					<ol class="feedbackMessages well col-lg-6 col-md-6 col-xs-12 pull-right" data-bind="slideVisible: feedbackShown, foreach: feedbackMessages" localise-data-jme-context-description="part.feedback">
						<li class="feedbackMessage" data-bind="latex: $data"></li>
					</ol>
				</div>
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
