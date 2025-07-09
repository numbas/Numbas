Numbas.queueScript('localisation', ['i18next', 'localisation-resources'], function(module) {
    module.exports.R = function() {
        { return i18next.t.apply(i18next, arguments) }
    };

    var plain_en = ['plain', 'en', 'si-en'];
    var plain_eu = ['plain-eu', 'eu', 'si-fr'];
    Numbas.locale.default_number_notations = {
        'ar-SA': plain_en,
        'en-GB': plain_en,
        'de-DE': plain_eu,
        'es-ES': plain_eu,
        'fr-FR': plain_eu,
        'he-IL': plain_en,
        'in-ID': plain_eu,
        'it-IT': plain_eu,
        'ja-JP': plain_en,
        'ko-KR': plain_en,
        'nb-NO': plain_eu,
        'nl-NL': plain_eu,
        'pl-PL': plain_eu,
        'pt-BR': plain_eu,
        'sq-AL': plain_eu,
        'sv-SR': plain_eu,
        'tr-TR': plain_eu,
        'vi-VN': plain_eu,
        'zh-CN': plain_en
    }

    Numbas.locale.default_list_separators = {
        'ar-SA': ',',
        'en-GB': ',',
        'de-DE': ';',
        'es-ES': ';',
        'fr-FR': ';',
        'he-IL': ',',
        'in-ID': ';',
        'it-IT': ';',
        'ja-JP': ',',
        'ko-KR': ',',
        'nb-NO': ';',
        'nl-NL': ';',
        'pl-PL': ';',
        'pt-BR': ';',
        'sq-AL': ';',
        'sv-SR': ';',
        'tr-TR': ';',
        'vi-VN': ';',
        'zh-CN': ','
    };

    Numbas.locale.set_preferred_locale = function(locale) {
        Numbas.locale.preferred_locale = locale;
        Numbas.locale.default_number_notation = Numbas.locale.default_number_notations[Numbas.locale.preferred_locale] || plain_en;
        Numbas.locale.default_list_separator = Numbas.locale.default_list_separators[Numbas.locale.preferred_locale] || ',';
    }

    Numbas.locale.init = function() {
        i18next.init({
            lng: Numbas.locale.preferred_locale,
            lowerCaseLng: true,
            keySeparator: false,
            nsSeparator: false,
            interpolation: {
                unescapePrefix: '-',
                format: function(value, format) {
                    if(format == 'niceNumber') {
                        return Numbas.math.niceNumber(value);
                    }
                }
            },
            resources: Numbas.locale.resources
        });
        Numbas.locale.set_preferred_locale(Numbas.locale.preferred_locale);
    };
});
