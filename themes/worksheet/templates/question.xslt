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
    <xsl:template match="question">
        <article class="main-content question print-visible" data-bind="css: css_classes, descendantsComplete: htmlBound, {% raw %}attr: {{'aria-label': displayName, id: 'question-'+question.path}}{% endraw %}">
            <form autocomplete="off">
                <span style="display:none">\( \begingroup \)</span>
                <header>
                    <h2 data-bind="latex: displayName, attr: {% raw %}{{id: question.path+'-header'}}{% endraw %}" class="question-header"></h2>
                </header>
                <xsl:apply-templates />
                <span style="display: none">\( \endgroup \)</span>
            </form>
            <p class="marks" role="status">
                <span data-bind="visible: numParts()>1 &amp;&amp; question.exam.settings.showTotalMark"><localise>control.total</localise>: </span>
                <span class="score" data-bind="html: scoreFeedback.message, pulse: scoreFeedback.update, visible: question.exam.settings.showTotalMark"></span>
                <span class="feedback-icon" data-bind="css: scoreFeedback.iconClass, attr: scoreFeedback.iconAttr, pulse: scoreFeedback.update" aria-hidden="true"></span>
                <span class="sr-only" data-bind="text: scoreFeedback.iconAttr().title"></span>
            </p>
        </article>
    </xsl:template>
    <xsl:template match="properties|feedbacksettings|preview|notes|variables|preprocessing|preambles" />
    <xsl:template match="content">
        <xsl:apply-templates select="*" mode="content" />
    </xsl:template>
    <xsl:template match="@*|node()" mode="content">
        <xsl:copy>
            <xsl:apply-templates select="@*|node()" mode="content" />
        </xsl:copy>
    </xsl:template>
    <xsl:template match="parts">
        <div class="parts" data-bind="foreach: parts">
            <div class="part-wrapper" data-bind="promise: html_promise, descendantsComplete: htmlBound"></div>
        </div>
    </xsl:template>
    <xsl:template match="part">
    </xsl:template>
    <xsl:template match="tags">
    </xsl:template>
    <xsl:template match="extensions">
    </xsl:template>
    {% include 'xslt/statement.xslt' %}
    {% include 'xslt/advice.xslt' %}
</xsl:stylesheet>
