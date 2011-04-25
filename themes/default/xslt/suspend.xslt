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
		<p>The Exam has been suspended, press Resume to continue or End to halt this session.</p>
		<p>You will be able to resume this session the next time you start this activity.</p>
		<input type="button" class="btn" id="resumeBtn" value="Resume"/>
		<input type="button" class="btn" id="endBtn" value="End"/>
	</div>
</xsl:template>

</xsl:stylesheet>

