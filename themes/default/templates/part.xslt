<?xml version="1.0" encoding="UTF-8"?>
<!--
Copyright 2011-16 Newcastle University
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
    <xsl:output method="html" version="5.0" encoding="UTF-8" standalone="yes" indent="yes" media-type="text/html" omit-xml-declaration="yes"/>
    <xsl:strip-space elements="p"/>
    <xsl:template match="content">
        <xsl:apply-templates select="*" mode="content" />
    </xsl:template>
    <xsl:template match="@*|node()" mode="content">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()" mode="content" />
        </xsl:copy>
    </xsl:template>
    {% include 'xslt/steps.xslt' %}
    {% include 'xslt/prompt.xslt' %}
    {% include 'xslt/part.xslt' %}
    {% include 'xslt/parts/1_n_2.xslt' %}
    {% include 'xslt/parts/m_n_2.xslt' %}
    {% include 'xslt/parts/choices.xslt' %}
    {% include 'xslt/parts/m_n_x.xslt' %}
    {% include 'xslt/parts/patternmatch.xslt' %}
    {% include 'xslt/parts/gapfill.xslt' %}
    {% include 'xslt/parts/jme.xslt' %}
    {% include 'xslt/parts/numberentry.xslt' %}
    {% include 'xslt/parts/matrix.xslt' %}
    {% include 'xslt/parts/information.xslt' %}
    {% include 'xslt/parts/extension.xslt' %}
    {% include 'xslt/parts/custom.xslt' %}
</xsl:stylesheet>
