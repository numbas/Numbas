<?xml version="1.0" encoding="UTF-8"?>
<!-- Copyright (c) Christian Perfect for Newcastle University 2010-2011 -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:output method="html" version="1.0" encoding="UTF-8" standalone="yes" indent="yes" media-type="text/xhtml" omit-xml-declaration="yes"/>
	<xsl:strip-space elements="*"/>	

	<xsl:template match="exam">
		<html>
			<head>
				<title>Maths Test</title>
				<!-- mathjax stuff -->
				<SCRIPT SRC="MathJax/MathJax.js">
				  MathJax.Hub.Config({
					extensions: ["tex2jax.js"],
					tex2jax: {inlineMath: [["$","$"],["\\(","\\)"]]},
					jax: ["input/TeX","output/HTML-CSS"]
				  });
				</SCRIPT>

				<!-- CSS -->
				<link rel="stylesheet" type="text/css" href="EDI.css" />
			</head>
			<body style="font-size:1em;">
				<xsl:apply-templates/>
			</body>
		</html>
	</xsl:template>
	
	
	<xsl:template match="math"><p>$<xsl:apply-templates />$</p></xsl:template>

	<xsl:template match="cn|ci|csymbol"><xsl:value-of select="."/></xsl:template>

	<!-- binary relations -->

	<xsl:template match="reln[child::*[1][name()='eq']]">
		<xsl:variable name="firstoperand" select="child::*[2]"/>
		<xsl:apply-templates select="$firstoperand"/>
		<xsl:for-each select="$firstoperand/following-sibling::*">
			<xsl:text> = </xsl:text>
			<xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="reln[child::*[1][name()='neq']]">
		<xsl:variable name="firstoperand" select="child::*[2]"/>
		<xsl:apply-templates select="$firstoperand"/>
		<xsl:for-each select="$firstoperand/following-sibling::*">
			<xsl:text> \neq </xsl:text>
			<xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="reln[child::*[1][name()='lt']]">
		<xsl:variable name="firstoperand" select="child::*[2]"/>
		<xsl:apply-templates select="$firstoperand"/>
		<xsl:for-each select="$firstoperand/following-sibling::*">
			<xsl:text> \lt </xsl:text>
			<xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="reln[child::*[1][name()='gt']]">
		<xsl:variable name="firstoperand" select="child::*[2]"/>
		<xsl:apply-templates select="$firstoperand"/>
		<xsl:for-each select="$firstoperand/following-sibling::*">
			<xsl:text> \gt </xsl:text>
			<xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="reln[child::*[1][name()='leq']]">
		<xsl:variable name="firstoperand" select="child::*[2]"/>
		<xsl:apply-templates select="$firstoperand"/>
		<xsl:for-each select="$firstoperand/following-sibling::*">
			<xsl:text> \lt = </xsl:text>
			<xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="reln[child::*[1][name()='geq']]">
		<xsl:variable name="firstoperand" select="child::*[2]"/>
		<xsl:apply-templates select="$firstoperand"/>
		<xsl:for-each select="$firstoperand/following-sibling::*">
			<xsl:text> \gt= </xsl:text>
			<xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	
	<!-- arithmetic -->

	<xsl:template match="apply[child::*[1][name()='plus']]">
		<xsl:variable name="firstoperand" select="child::*[2]"/>
		<xsl:apply-templates select="$firstoperand"/>
		<xsl:for-each select="$firstoperand/following-sibling::*">
			<xsl:text>+</xsl:text><xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='minus']]">
		<xsl:choose>
			<xsl:when test="count(child::*)=2">
				<xsl:text>-</xsl:text>
				<xsl:apply-templates select="./*[2]"/>
			</xsl:when>
			<xsl:when test="count(./*)>2"> 
				<xsl:apply-templates select="./*[2]"/>-<xsl:apply-templates select="./*[3]"/>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='times']]">
		<xsl:for-each select="child::*[2]">
			<xsl:call-template name="p3operand"/>
		</xsl:for-each>
		<xsl:for-each select="child::*[position() > 2]">
			<xsl:choose>
				<xsl:when test="name(preceding-sibling::*[1])='cn' and name(.) != 'cn'">
				</xsl:when>
				<xsl:otherwise>
					<xsl:text> \cdot </xsl:text>
				</xsl:otherwise>
			</xsl:choose>
			<xsl:call-template name="p3operand"/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='divide']]">
		<xsl:text>\frac{</xsl:text>
		<xsl:apply-templates select="child::*[2]"/>
		<xsl:text>}{</xsl:text>
		<xsl:apply-templates select="child::*[3]"/>
		<xsl:text>}</xsl:text>
	</xsl:template>

	<xsl:template name="p3operand">
		<xsl:variable name="op"><xsl:value-of select="name(child::*[1])" /></xsl:variable>
		<xsl:choose>
			<xsl:when test="name(.)='apply' and ($op='plus' or $op='minus')">
				<xsl:text>(</xsl:text><xsl:apply-templates select="."/><xsl:text>)</xsl:text>
			</xsl:when>
			<xsl:otherwise>
				<xsl:apply-templates select="."/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='power']]">
		<xsl:for-each select="child::*[2]">
			<xsl:call-template name="p2operand"/>
		</xsl:for-each>
		<xsl:for-each select="child::*[position() > 2]">
			<xsl:text>^{</xsl:text>
			<xsl:apply-templates select="."/>
			<xsl:text>}</xsl:text>
		</xsl:for-each>
	</xsl:template>		

	<xsl:template name="p2operand">
		<xsl:variable name="op"><xsl:value-of select="name(child::*[1])" /></xsl:variable>
		<xsl:choose>
			<xsl:when test="name(.)='apply' and ($op='plus' or $op='minus' or $op='times' or $op='divide')">
				<xsl:text>(</xsl:text><xsl:apply-templates select="."/><xsl:text>)</xsl:text>
			</xsl:when>
			<xsl:otherwise>
				<xsl:apply-templates select="."/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<!-- logic -->

	<xsl:template match="apply[child::*[1][name()='and']]">
		<xsl:for-each select="child::*[2]">
			<xsl:call-template name="p11operand"/>
		</xsl:for-each>
		<xsl:for-each select="child::*[position() > 2]">
			<xsl:text> \vee </xsl:text>
			<xsl:call-template name="p11operand"/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template name="p11operand">
		<xsl:variable name="op"><xsl:value-of select="name(child::*[1])" /></xsl:variable>
		<xsl:choose>
			<xsl:when test="name(.)='apply' and ($op='or' or $op='xor')">
				<xsl:text>(</xsl:text><xsl:apply-templates select="."/><xsl:text>)</xsl:text>
			</xsl:when>
			<xsl:otherwise>
				<xsl:apply-templates select="."/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='or']]">
		<xsl:for-each select="child::*[2]">
			<xsl:call-template name="p12operand"/>
		</xsl:for-each>
		<xsl:for-each select="child::*[position() > 2]">
			<xsl:text> \wedge </xsl:text>
			<xsl:call-template name="p12operand"/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template name="p12operand">
		<xsl:variable name="op"><xsl:value-of select="name(child::*[1])" /></xsl:variable>
		<xsl:choose>
			<xsl:when test="name(.)='apply' and $op='xor'">
				<xsl:text>(</xsl:text><xsl:apply-templates select="."/><xsl:text>)</xsl:text>
			</xsl:when>
			<xsl:otherwise>
				<xsl:apply-templates select="." />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='xor']]">
		<xsl:for-each select="child::*[2]">
			<xsl:apply-templates select="."/>
		</xsl:for-each>
		<xsl:for-each select="child::*[position() > 2]">
			<xsl:text> XOR </xsl:text>
			<xsl:apply-templates select="."/>
		</xsl:for-each>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='not']]">
		<xsl:text>\neg(</xsl:text>
		<xsl:apply-templates select="child::*[2]"/>
		<xsl:text>)</xsl:text>
	</xsl:template>

	<!-- functions -->
	<xsl:template match="apply[child::*[1][name()='fn']]">
		<xsl:call-template name="func">
			<xsl:with-param name="fname"><xsl:apply-templates select="child::*[1]/*"/></xsl:with-param>
		</xsl:call-template>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='factorial']]">
		<xsl:choose>
			<xsl:when test="name(child::*[2]) = 'apply'">
				<xsl:text>(</xsl:text>
				<xsl:apply-templates select="child::*[2]"/>
				<xsl:text>)!</xsl:text>
			</xsl:when>
			<xsl:when test="name(child::*[2]) != 'apply'">
				<xsl:apply-templates select="child::*[2]"/>
				<xsl:text>!</xsl:text>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='ceiling']]">
		<xsl:call-template name="func">
			<xsl:with-param name="fname">ceil</xsl:with-param>
		</xsl:call-template>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='root']]">
		<xsl:text>\sqrt{</xsl:text>
		<xsl:apply-templates select="child::*[2]"/>
		<xsl:text>}</xsl:text>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='rem']]">
		<xsl:call-template name="func">
			<xsl:with-param name="fname">mod</xsl:with-param>
		</xsl:call-template>
	</xsl:template>

	<xsl:template match="apply[child::*[1][name()='cos' or name()='sin' or name()='tan' or name()='sec' or name()='csc' or name()='cot' or name()='arccos' or name()='arcin' or name()='arctan' or name()='sinh' or name()='cosh' or name()='tanh' or name()='coth']]">
		<xsl:variable name="fname">
			<xsl:text>\</xsl:text>
			<xsl:value-of select="name(child::*[1])"/>
		</xsl:variable>
		<xsl:call-template name="func">
			<xsl:with-param name="fname">
				<xsl:text>\</xsl:text>
				<xsl:value-of select="name(child::*[1])"/>
			</xsl:with-param>
		</xsl:call-template>
	</xsl:template>

	<!-- must be one of the other built-in functions for this to apply -->
	<xsl:template match="apply">
		<xsl:call-template name="func">
			<xsl:with-param name="fname"><xsl:value-of select="name(child::*[1])"/></xsl:with-param>
		</xsl:call-template>
	</xsl:template>

	<!-- big template for functions -->
	<xsl:template name="func">
		<xsl:param name="fname"/>
		<xsl:value-of select="$fname"/>
		<xsl:text>(</xsl:text>
		<xsl:for-each select="child::*[2]">
			<xsl:apply-templates select="." />
		</xsl:for-each>
		<xsl:for-each select="child::*[position() > 2]">
			<xsl:text>,</xsl:text>
			<xsl:apply-templates select="." />
		</xsl:for-each>
		<xsl:text>)</xsl:text>
	</xsl:template>
</xsl:stylesheet>


