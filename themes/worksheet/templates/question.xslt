{% extends "default/question.xslt" %}

{% block question_element %}
    <article class="main-content question print-visible" data-bind="css: css_classes, descendantsComplete: htmlBound, {% raw %}attr: {{'aria-label': displayName, id: 'question-'+question.path}}{% endraw %}">
{% endblock %}
