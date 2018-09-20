module.exports = {
    "env": {
        "browser": true
    },
    "parserOptions": {
        "ecmaVersion": 5
    },
    "rules": {
        "linebreak-style": [
            "error",
            "unix"
        ],
        "valid-jsdoc": [
            "error",
            {
                "requireReturnDescription": false, 
            }
        ],
        "require-jsdoc": [
            "error",
            {
                "require": {
                    "FunctionDeclaration": true,
                    "MethodDefinition": true,
                    "ClassDeclaration": true,
                    "FunctionExpression": false
                }
            }
        ]
    }
};
