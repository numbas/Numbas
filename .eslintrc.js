module.exports = {
    "env": {
        "browser": true
    },
    "plugins": [
        "jsdoc",
    ],
    "parserOptions": {
        "ecmaVersion": 12
    },
    "rules": {
        "jsdoc/check-alignment": 1, // Recommended
        "jsdoc/check-examples": 1,
        "jsdoc/check-indentation": 1,
        "jsdoc/check-param-names": 1, // Recommended
        "jsdoc/check-syntax": 1,
        "jsdoc/check-tag-names": 1, // Recommended
        "jsdoc/check-types": 1, // Recommended
        "jsdoc/implements-on-classes": 1, // Recommended
        "jsdoc/match-description": 1,
        "jsdoc/newline-after-description": 1, // Recommended
        "jsdoc/no-types": 0,
        "jsdoc/no-undefined-types": [
            1,
            {
                definedTypes: ['Numbas','JME','TeX','Decimal','matrix','complex','Promise','Observable','observable','jQuery','observableArray']
            }
        ], // Recommended
        "jsdoc/require-description": 1,
        "jsdoc/require-description-complete-sentence": 0,
        "jsdoc/require-example": 0,
        "jsdoc/require-hyphen-before-param-description": 1,
        "jsdoc/require-jsdoc": 1, // Recommended
        "jsdoc/require-param": 1, // Recommended
        "jsdoc/require-param-description": 0, // Recommended
        "jsdoc/require-param-name": 1, // Recommended
        "jsdoc/require-param-type": 1, // Recommended
        "jsdoc/require-returns": 1, // Recommended
        "jsdoc/require-returns-check": 1, // Recommended
        "jsdoc/require-returns-description": 0, // Recommended
        "jsdoc/require-returns-type": 1, // Recommended
        "jsdoc/valid-types": 1, // Recommended

        "linebreak-style": [
            "error",
            "unix"
        ]
    }
};
