<?xml version="1.0" encoding="UTF-8"?>
<!--
Copyright 2011-13 Newcastle University

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="xml" version="1.0" encoding="UTF-8" standalone="yes" indent="yes" media-type="text/xhtml" omit-xml-declaration="yes"/>
<xsl:strip-space elements="p"/>

<!-- this template just for viewing all questions in examXML outside SCORM -->
<xsl:template match="exam">
	<html>
		<body>
			<xsl:apply-templates />
		</body>
	</html>
</xsl:template>

<!-- this is the thing that gets used by SCORM -->
<xsl:template match="question">
	<div class="question clearAfter">
		<xsl:apply-templates />
	</div>
</xsl:template>

<xsl:template match="properties|feedbacksettings|preview|notes|variables|preprocessing" />

<xsl:template match="statement">
	<div class="statement">
		<xsl:apply-templates />
	</div>
</xsl:template>

<xsl:template match="parts">
	<xsl:apply-templates />
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

	<xsl:if test="parent::parts">
		<xsl:if test="count(../part) &gt; 1">
			<h4 class="partheader"><xsl:number count="part" format="a) "/></h4>
		</xsl:if>
	</xsl:if>
	<xsl:element name="{$tag}">
		<xsl:attribute name="class">part <xsl:value-of select="@type"/></xsl:attribute>
		<xsl:attribute name="id">
			<xsl:value-of select="$path" />
		</xsl:attribute>
		<xsl:attribute name="data-bind">with: $root.getPart('<xsl:value-of select="$path" />')</xsl:attribute>

		<xsl:if test="not(ancestor::gaps)">
			<xsl:apply-templates select="prompt" />
		</xsl:if>
		<xsl:if test="count(steps/part)>0">
			<xsl:apply-templates select="steps">
				<xsl:with-param name="path" select="$path"/>
			</xsl:apply-templates>
		</xsl:if>
		<span class="answer">
			<span id="answer-{$path}">
				<xsl:apply-templates select="." mode="typespecific">
					<xsl:with-param name="path" select="$path"/>
				</xsl:apply-templates>
			</span>
			<span class="warning-icon icon-exclamation-sign" data-bind="visible: warnings().length>0, hover: warningsShown"></span>
			<span class="warnings" data-bind="visible: warningsShown, foreach: warnings">
				<span class="warning" data-bind="latex: $data"></span>
			</span>
		</span>
		<xsl:if test="not(ancestor::gaps)">
			<br/>
			<div id="partFeedback">
				<button class="btn" id="submitPart" data-bind="click: controls.submit, visible: !revealed()"><localise>question.submit part</localise></button>
				<div id="marks" data-bind="pulse: scoreFeedback.update">
					<span id="score" data-bind="html: scoreFeedback.message"></span>
					<span id="feedback" data-bind="css: scoreFeedback.state"></span>
				</div>
				<button class="btn" id="feedbackToggle" data-bind="visible: showFeedbackToggler, click: controls.toggleFeedback, text: toggleFeedbackText"></button>
			</div>
			<ol id="feedbackMessages" data-bind="slideVisible: feedbackShown, foreach: feedbackMessages">
				<li class="feedbackMessage" data-bind="latex: $data"></li>
			</ol>
		</xsl:if>
	</xsl:element>
</xsl:template>

<xsl:template match="steps">
	<xsl:param name="path"/>

	<div class="steps" data-bind="slideVisible: stepsShown">
		<xsl:apply-templates select="part"/>
		<div style="clear:both;"></div>
	</div>
	<button class="btn stepsBtn" data-bind="visible: !stepsShown(), click: controls.showSteps"><localise>question.show steps</localise></button>
</xsl:template>

<xsl:template match="prompt">
	<span id="prompt">
		<xsl:apply-templates />
	</span>
</xsl:template>

<xsl:template match="content">
	<xsl:apply-templates select="*" mode="content" />
</xsl:template>

<xsl:template match="distractor">
	<span><xsl:apply-templates /></span>
</xsl:template>


<xsl:template match="advice">
	<div id="adviceContainer" data-bind="visible: adviceDisplayed">
		<h3><localise>question.advice</localise></h3>
		<span id="adviceDisplay">
			<xsl:apply-templates />
		</span>
	</div>
</xsl:template>

 
<xsl:template match="@*|node()" mode="content">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()" mode="content" />
	</xsl:copy>
</xsl:template>

<xsl:template match="choices" mode="one">
	<xsl:param name="path"/>

	<xsl:variable name="displaytype"><xsl:value-of select="@displaytype"/></xsl:variable>
	<form>
	<xsl:choose>
		<xsl:when test="@displaytype='radiogroup'">
			<form>
			<ul class="multiplechoice">
				<xsl:apply-templates select="choice" mode="radiogroup">
					<xsl:with-param name="path" select="$path"/>
				</xsl:apply-templates>
			</ul><br style="clear:left;"/>
			</form>
		</xsl:when>
		<xsl:when test="@displaytype='checkbox'">
			<form>
			<ul class="multiplechoice">
				<xsl:apply-templates select="choice" mode="checkbox">
					<xsl:with-param name="path" select="$path"/>
				</xsl:apply-templates>
			</ul><br style="clear:left;"/>
			</form>
		</xsl:when>
		<xsl:when test="@displaytype='dropdownlist'">
			<select class="multiplechoice">
				<option></option>
				<xsl:apply-templates select="choice" mode="dropdownlist">
					<xsl:with-param name="path" select="$path"/>
				</xsl:apply-templates>
			</select>
		</xsl:when>
	</xsl:choose>
	</form>
</xsl:template>

<xsl:template match="choice" mode="radiogroup">
	<xsl:param name="path"/>
	<xsl:param name="answernum" select="0"/>
	<xsl:variable name="cols" select="../@displaycolumns"/>
	
	<xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
	
	<xsl:variable name="break">
		<xsl:if test="($choicenum mod $cols = 0) and ($cols>0)">
			<xsl:text>clear:both;</xsl:text>
		</xsl:if>
	</xsl:variable>

	<li style="float:left;{$break}">
		<input type="radio" id="choice-{$answernum}-{$choicenum}" name="choice" data-bind="checked: studentAnswer, disable: revealed" value="{$choicenum}"/>
		<xsl:apply-templates select="content"/>
	</li>
</xsl:template>

<xsl:template match="choice" mode="checkbox">
	<xsl:param name="path"/>
	<xsl:param name="answernum" select="0"/>
	<xsl:variable name="cols" select="../@displaycolumns"/>

	<xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>

	<xsl:variable name="break">
		<xsl:if test="($choicenum mod $cols = 0) and ($cols>0)">
			<xsl:text>clear:both;</xsl:text>
		</xsl:if>
	</xsl:variable>

	<li style="float:left;{$break}">
		<input type="checkbox" id="choice-{$answernum}-{$choicenum}" name="choice" data-bind="checked: ticks[{$choicenum}], disable: revealed" />
		<xsl:apply-templates select="content"/>
	</li>
</xsl:template>

<xsl:template match="choice" mode="dropdownlist">
	<xsl:param name="path"/>
	<xsl:param name="answernum" select="0"/>
	
	<xsl:variable name="choicenum"><xsl:value-of select="count(preceding-sibling::choice)"/></xsl:variable>
	<option id="choice-{$answernum}-{$choicenum}">
		<xsl:apply-templates select="content"/>
	</option>
</xsl:template>

<xsl:template match="part[@type='1_n_2' or @type='CUEdt.MR1_n_2Part']" mode="typespecific">
	<xsl:param name="path"/>
	
	<xsl:apply-templates select="choices" mode="one">
		<xsl:with-param name="path" select="$path"/>
	</xsl:apply-templates>
</xsl:template>

<xsl:template match="part[@type='m_n_2' or @type='CUEdt.MRm_n_2Part']" mode="typespecific">
	<xsl:param name="path"/>
	<xsl:apply-templates select="choices" mode="one">
		<xsl:with-param name="path" select="$path"/>
	</xsl:apply-templates>
</xsl:template>

<xsl:template match="part[@type='m_n_x' or @type='CUEdt.MRm_n_xPart']" mode="typespecific">
	<xsl:param name="path"/>

	<xsl:variable name="displaytype" select="choices/@displaytype"/>
	<div id="multipleresponse-{$path}" class="m_n_x">
		<form>
		<table class="choices-grid">
			<thead>
				<td/>
				<xsl:for-each select="answers/answer">
					<th><xsl:apply-templates select="content"/></th>
				</xsl:for-each>
			</thead>
			<tbody>
				<xsl:for-each select="choices/choice">
					<xsl:apply-templates select="." mode="mrx">
						<xsl:with-param name="path" select="$path"/>
						<xsl:with-param name="displaytype" select="$displaytype"/>
					</xsl:apply-templates>
				</xsl:for-each>
			</tbody>
		</table>
		</form>
	</div>
</xsl:template>

<xsl:template match="choice" mode="mrx">
	<xsl:param name="path"/>
	<xsl:param name="displaytype"/>

	<xsl:variable name="answers" select="../../answers"/>
	<xsl:variable name="choicenum" select="count(preceding-sibling::choice)"/>
	<tr>
		<td class="choice"><xsl:apply-templates select="content"/></td>
		<xsl:for-each select="$answers/answer">
			<xsl:variable name="answernum" select="count(preceding-sibling::answer)"/>
			<td class="option">
				<xsl:choose>
					<xsl:when test="$displaytype='checkbox'">
						<input type="checkbox" id="choice-{$choicenum}-{$answernum}" name="choice-{$choicenum}" data-bind="checked: ticks[{$answernum}][{$choicenum}], disable: revealed" />
					</xsl:when>
					<xsl:when test="$displaytype='radiogroup'">
						<input type="radio" id="choice-{$choicenum}-{$answernum}" name="choice-{$choicenum}" data-bind="checked: ticks[{$choicenum}], disable: revealed" value="{$answernum}"/>
					</xsl:when>
				</xsl:choose>
			</td>
		</xsl:for-each>
	</tr>
</xsl:template>

<xsl:template match="part[@type='patternmatch' or @type='CUEdt.PatternMatchPart']" mode="typespecific">
	<xsl:param name="path"/>
	
	<input type="text" spellcheck="false" class="patternmatch" size="12.5" id="patternmatch" data-bind="autosize: true, value: studentAnswer, disable: revealed"></input>
</xsl:template>

<xsl:template match="part[@type='gapfill' or @type='CUEdt.GapFillPart']" mode="typespecific">
	<xsl:param name="path"/>
</xsl:template>

<xsl:template match="gapfill" mode="content">
	<xsl:param name="path"/>
	
	<xsl:variable name="n"><xsl:value-of select="@reference"/></xsl:variable>
	<xsl:apply-templates select="ancestor::part[1]/gaps/part[$n+1]" />
</xsl:template>

<xsl:template match="part[@type='jme' or @type='CUEdt.JMEPart']" mode="typespecific">
	<xsl:param name="path"/>

	<input type="text" spellcheck="false" class="jme" id="jme" data-bind="autosize: true, value: studentAnswer, valueUpdate: 'afterkeydown', hasfocus: inputHasFocus, disable: revealed"/>
	<span id="preview" class="mathPreview" data-bind="visible: studentAnswerLaTeX, maths: studentAnswerLaTeX, click: focusInput"></span>
</xsl:template>

<xsl:template match="part[@type='numberentry' or @type='CUEdt.NumberEntryPart']" mode="typespecific">
	<xsl:param name="path"/>
	
	<input type="text" step="{answer/inputstep/@value}" class="numberentry" id="numberentry" data-bind="autosize: true, value: studentAnswer, disable: revealed"/>
</xsl:template>

<xsl:template match="part[@type='information' or @type='CUEdt.InformationOnlyPart']" mode="typespecific">
	<xsl:param name="path"/>
</xsl:template>

<xsl:template match="part" mode="typespecific">
	<localise>question.unsupported part type</localise> <xsl:value-of select="@type"/>
</xsl:template>

<xsl:template match="math" mode="content">
	<xsl:text> </xsl:text>
	<span class="MathJax_Preview"><xsl:value-of select="text()"/></span>
	<xsl:variable name="scripttype">
		<xsl:if test="name(..)='p' and count(../child::*)=1 and count(../child::text())=0 and name(../..)!='td' and count(ancestor::choice)=0 " >
			<xsl:text>; mode=display</xsl:text>
		</xsl:if>
	</xsl:variable>
	<script type="math/tex{$scripttype}"><xsl:value-of select="text()"/></script>
	<xsl:text> </xsl:text>
</xsl:template>


</xsl:stylesheet>
