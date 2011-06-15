<?xml version="1.0" encoding="UTF-8"?>
<!--
Copyright 2011 Newcastle University

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
	<xsl:variable name="questionnum" select="count(preceding-sibling::question)"/>
	<div class="question" id="question-{$questionnum}">
		<xsl:apply-templates />
	</div>
</xsl:template>

<xsl:template match="advice">
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
			<xsl:apply-templates select="../../.." mode="path" />
			<xsl:text>g</xsl:text>
		</xsl:when>
		<xsl:when test="parent::part">
			<xsl:apply-templates select=".." mode="path" />
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
		<xsl:attribute name="class">part</xsl:attribute>
		<xsl:attribute name="id">
			<xsl:value-of select="$path" />
		</xsl:attribute>

		<xsl:if test="not(ancestor::gaps)">
			<xsl:apply-templates select="prompt" />
		</xsl:if>
		<xsl:if test="count(part) > 0">
			<div class="steps" id="steps-{$path}">
				<xsl:apply-templates select="part"/>
				<div style="clear:both;"></div>
			</div>
		</xsl:if>
		<xsl:apply-templates select="." mode="typespecific">
			<xsl:with-param name="path" select="$path"/>
		</xsl:apply-templates>
		<span class="warningcontainer" id="warning-{$path}"><img src="resources/exclamation-red.png"/><span class="partwarning"></span></span>
		<xsl:if test="count(part) > 0">
			<div class="stepsBtnDiv" id="stepsBtnDiv-{$path}"><input type="button" value="Show steps" class="btn" id="stepsBtn"></input></div>
		</xsl:if>
		<xsl:if test="not(ancestor::gaps)">
			<div id="partFeedback">
				<input class="btn" id="submitPart" value="Submit part" type="button"></input>
				<div id="marks">
					<span id="score"></span>
					<span id="feedback"><img src="resources/cross.png"/></span>
				</div>
			</div>
		</xsl:if>
	</xsl:element>
</xsl:template>

<xsl:template match="prompt">
	<span id="prompt">
		<xsl:apply-templates />
	</span>
</xsl:template>

<xsl:template match="content">
	<xsl:apply-templates select="*" mode="content" />
</xsl:template>


<xsl:template match="adviceitem">
	<div>
		<xsl:apply-templates />
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
			</ul>
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
		<input type="radio" id="choice-{$answernum}-{$choicenum}" name="choice" />
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
		<input type="checkbox" id="choice-{$answernum}-{$choicenum}" name="choice" />
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
	<div id="multipleresponse-{$path}">
		<table>
			<tr>
				<td/>
				<xsl:for-each select="possibleanswers/possibleanswer">
					<td><xsl:apply-templates select="content"/></td>
				</xsl:for-each>
			</tr>
			<xsl:for-each select="choices/choice">
				<xsl:apply-templates select="." mode="mrx">
					<xsl:with-param name="path" select="$path"/>
					<xsl:with-param name="displaytype" select="$displaytype"/>
				</xsl:apply-templates>
			</xsl:for-each>
		</table>
	</div>
</xsl:template>

<xsl:template match="choice" mode="mrx">
	<xsl:param name="path"/>
	<xsl:param name="displaytype"/>

	<xsl:variable name="answers" select="../../possibleanswers"/>
	<xsl:variable name="choicenum" select="count(preceding-sibling::choice)"/>
	<tr>
		<td><xsl:apply-templates select="content"/></td>
		<xsl:for-each select="$answers/possibleanswer">
			<xsl:variable name="answernum" select="count(preceding-sibling::possibleanswer)"/>
			<td>
				<xsl:choose>
					<xsl:when test="$displaytype='checkbox'">
						<input type="checkbox" id="choice-{$choicenum}-{$answernum}" name="choice-{$choicenum}" />
					</xsl:when>
					<xsl:when test="$displaytype='radiogroup'">
						<input type="radio" id="choice-{$choicenum}-{$answernum}" name="choice-{$choicenum}" />
					</xsl:when>
				</xsl:choose>
			</td>
		</xsl:for-each>
	</tr>
</xsl:template>

<xsl:template match="part[@type='patternmatch' or @type='CUEdt.PatternMatchPart']" mode="typespecific">
	<xsl:param name="path"/>
	
	<input type="text" spellcheck="false" class="patternmatch" size="12.5" id="patternmatch"></input>
</xsl:template>

<xsl:template match="part[@type='gapfill' or @type='CUEdt.GapFillPart']" mode="typespecific">
	<xsl:param name="path"/>
</xsl:template>

<xsl:template match="gapfill" mode="content">
	<xsl:param name="path"/>
	
	<xsl:variable name="n"><xsl:value-of select="@reference"/></xsl:variable>
	<xsl:apply-templates select="ancestor::part/gaps/part[$n+1]" />
</xsl:template>

<xsl:template match="part[@type='jme' or @type='CUEdt.JMEPart']" mode="typespecific">
	<xsl:param name="path"/>

	<input type="text" spellcheck="false" class="jme" id="jme" /><span id="preview" class="mathPreview"></span>
</xsl:template>

<xsl:template match="part[@type='numberentry' or @type='CUEdt.NumberEntryPart']" mode="typespecific">
	<xsl:param name="path"/>
	
	<input type="text" step="{answer/inputstep/@value}" class="numberentry" id="numberentry"/>
</xsl:template>

<xsl:template match="part[@type='information' or @type='CUEdt.InformationOnlyPart']" mode="typespecific">
	<xsl:param name="path"/>
</xsl:template>

<xsl:template match="part" mode="typespecific">
	Unsupported part type <xsl:value-of select="@type"/>
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
