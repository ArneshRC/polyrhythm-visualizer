module.exports = {
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    env: {
        browser: true,
        node: true,
        es2021: true
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    root: true,
    plugins: ["@typescript-eslint"],
    rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                varsIgnorePattern: "^_",
                argsIgnorePattern: "^_"
            }
        ],
        "tailwindcss/classnames-order": "off",
        "tailwindcss/no-custom-classname": "off",
        camelcase: [
            "warn",
            {
                allow: ["elements_selector", "callback_loaded"]
            }
        ]
    }
};
