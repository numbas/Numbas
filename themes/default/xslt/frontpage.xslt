<?xml version="1.0" encoding="UTF-8"?>
<!-- Copyright (c) Christian Perfect for Newcastle University 2010-2011 -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="xml" version="1.0" encoding="UTF-8" standalone="yes" indent="yes" media-type="text/xhtml" omit-xml-declaration="yes"/>

<xsl:template match="exam">
	<div>
		<table>
			<tr>
				<td>Exam Name:</td>
				<td class="rtd">
					<xsl:value-of select="name" />
				</td>
			</tr>
			<tr>
				<td>Number of Questions:</td>
				<td class="rtd">
					<xsl:value-of select="numQuestions" />
				</td>
			</tr>
			<xsl:if test="showTotalMark='true'">
			<tr>
				<td>Marks Available:</td>
				<td class="rtd">
					<xsl:value-of select="mark" />
				</td>
			</tr>
			</xsl:if>
			<xsl:if test="percentPass>0">
			<tr>
				<td>Pass Percentage:</td>
				<td class="rtd">
					<xsl:value-of select="percentPass*100" /><xsl:text>%</xsl:text>
				</td>
			</tr>
			</xsl:if>
			<xsl:if test="string-length(displayDuration)>0">
				<tr>
					<td>Time Allowed:</td>
					<td class="rtd">
						<xsl:value-of select="displayDuration" />
					</td>
				</tr>
			</xsl:if>
		</table>
		<div class="startBtn">
			<input id="startBtn" class="btn" type="button" value="Start"/>
		</div>
	</div>
</xsl:template>

</xsl:stylesheet>
