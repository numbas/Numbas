<?xml version="1.0" encoding="UTF-8"?>
<!-- Copyright (c) Christian Perfect for Newcastle University 2010-2011 -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="xml" version="1.0" encoding="UTF-8" standalone="yes" indent="yes" media-type="text/xhtml" omit-xml-declaration="yes"/>

<xsl:template match="/">
	<div>
		<p>The Exam has been suspended, press Resume to continue or End to halt this session.</p>
		<p>You will be able to resume this session the next time you start this activity.</p>
		<input type="button" class="btn" id="resumeBtn" value="Resume"/>
		<input type="button" class="btn" id="endBtn" value="End"/>
	</div>
</xsl:template>

</xsl:stylesheet>

