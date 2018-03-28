module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 2017
    },
    "rules": {
        "indent": [
            "warn",
            "tab",
            { "SwitchCase": 1 }
        ],
        "linebreak-style": [
            "warn",
            "unix"
        ],
        "quotes": [
            "warn",
            "single"
        ],
        "semi": [
            "warn",
            "always"
        ],
        // "prefer-template": "warn",
        "template-curly-spacing": [
            "warn",
            "never"
        ],
        "prefer-rest-params": "warn",
    }
};