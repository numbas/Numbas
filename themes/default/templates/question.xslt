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
        <article class="question print-visible" data-bind="visible: isCurrentQuestion, css: css_classes, descendantsComplete: htmlBound, {% raw %}attr: {{'aria-label': displayName, id: 'question-'+question.path}}{% endraw %}">
            <form autocomplete="off">
                <span style="display:none">\( \begingroup \)</span>
                <header>
                    <h2 data-bind="latex: displayName, attr: {% raw %}{{id: question.path+'-header'}}{% endraw %}" class="question-header"></h2>
                    <nav class="parts-tree navbar navbar-default" data-bind="if: showPartsTree, visible: showPartsTree, attr: {% raw %}{{'aria-labelledby': question.path+'-breadcrumbs'}}{% endraw %}">
                        <h3 class="part-progress" data-bind="attr: {% raw %}{{id: question.path+'-breadcrumbs'}}{% endraw %}"><localise>question.progress</localise></h3>
                        <div class="part" data-bind="treeView: firstPart">
                            <div data-bind="jmescope: part.getScope()">
                                <a class="name" data-bind="latex: name, click: $parent.setCurrentPart, css: partTreeCSS, attr: {% raw %}{{'aria-current': partTreeCSS().current ? 'step' : false}}{% endraw %}"></a>
                            </div>
                            <ul data-bind="foreach: madeNextParts">
                                <li>
                                    <div class="part" data-bind="treeNode: $data"></div>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </header>
                <xsl:apply-templates />
                <span style="display: none">\( \endgroup \)</span>
            </form>

            {% include 'question-nav.xslt' %}
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
            <div data-bind="promise: html_promise, descendantsComplete: htmlBound"></div>
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
