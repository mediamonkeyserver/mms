module.exports = {
    "env": {
        "es6": true,
        "browser": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended"
    ],
    "parserOptions": {
        "sourceType": "module"
    },
    "parser": "babel-eslint",
    "rules": {
        "indent": [
            "warn",
            "tab",
            {"SwitchCase": 1}
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
        "strict": 0,
        // "prefer-template": "warn",
        "template-curly-spacing": [
            "warn",
            "never"
        ],
        "prefer-rest-params": "warn",
		"no-unused-vars": "warn",
		"no-unreachable": "warn",
    }
};