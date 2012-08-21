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
<xsl:template match="/">
	<div>	
		<xsl:apply-templates />
		<div class="exitBtn">
			<button id="exitBtn">Exit</button>
		</div>
		<span id="reviewBtnSpan">
			<button id="reviewBtn">Review</button>
		</span>
	</div>
</xsl:template>

<xsl:template match="examsummary">
	<h3>Exam Summary</h3>

	<table>
		<tr>
			<td>Exam Name:</td>
			<td class="rtd"><xsl:value-of select="name" /></td>
		</tr>
		<tr>
			<td>Number of Questions:</td>
			<td class="rtd"><xsl:value-of select="numberofquestions" /></td>
		</tr>
		<tr>
			<td>Marks Available:</td>
			<td class="rtd"><xsl:value-of select="mark" /></td>	
		</tr>
		<xsl:if test="passpercentage>0">
		<tr>
			<td>Pass Percentage:</td>
			<td class="rtd"><xsl:value-of select="passpercentage*100" />%</td>
		</tr>
		</xsl:if>
		<tr>
			<td>Time Allowed:</td>
			<td class="rtd"><xsl:value-of select="duration" /></td>
		</tr>
	</table>
</xsl:template>

<xsl:template match="performancesummary">
	<h3>Performance Summary</h3>
	<table>
		<tr>
			<td>Exam Start:</td>
			<td class="rtd"><xsl:value-of select="start" /></td>	
		</tr>	
		<tr>
			<td>Exam Stop:</td>
			<td class="rtd"><xsl:value-of select="stop" /></td>	
        </tr>
        <tr>
            <td>Time Spent:</td>
            <td class="rtd"><xsl:value-of select="timespent" /></td>
        </tr> 
		<tr>
			<td>Questions Attempted:</td>
			<td class="rtd"><xsl:value-of select="questionsattempted" /> / <xsl:value-of select="ancestor::report/examsummary/numberofquestions" /></td>
		</tr>
		<tr>
			<td>Score:</td>
			<td class="rtd"><xsl:value-of select="score" /> / <xsl:value-of select="ancestor::report/examsummary/mark" /><br/>(<xsl:value-of select="percentagescore" />%)</td>
		</tr>
		<xsl:if test="passpercentage>0">
		<tr class="resultrow">
			<td>Result:</td>
			<td class="rtd"><xsl:value-of select="result" /></td>	
		</tr>							
		</xsl:if>
	</table>
			
</xsl:template>

<xsl:template match="questions">
	<h3>Detailed Question Breakdown</h3>
	<table>		
		<tr>
			<th class="qtd">
				<xsl:text>Question Number</xsl:text>
			</th>
			<th class="qtd">
				<xsl:text>Topic</xsl:text>
			</th>
			<th class="qtd">
				<xsl:text>Question Score</xsl:text>
			</th>
		</tr>		
		<xsl:apply-templates />
	</table>
</xsl:template>

<xsl:template match="question">
	<tr>
			<td class="qtd">
				<xsl:value-of select="number"/>
			</td>
			<td class="qtd">
				<xsl:value-of select="name"/>
			</td>
			<td class="qtd">
				<xsl:value-of select="score"/><xsl:text> / </xsl:text><xsl:value-of select="marks"/>
			</td>
		</tr>
</xsl:template>



</xsl:stylesheet>
