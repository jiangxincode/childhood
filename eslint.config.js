import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";

export default [
  { ignores: ["src-tauri/target/**"] },
  js.configs.recommended,
  {
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "arrow-body-style": ["error", "as-needed"],
      "no-unused-vars": ["warn", { args: "none" }],
      "no-redeclare": ["warn", { builtinGlobals: false }],
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        caches: "readonly",
        HTMLElement: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        Audio: "readonly",
        Image: "readonly",
        location: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        // Node.js globals
        process: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        // Project globals
        jQuery: "readonly",
        $j: "writable",
        SlotMachine: "readonly",
        Vue: "readonly",
        // Shared board theme helper from apps/board-game/board-game-theme.js
        BoardGameTheme: "readonly",
        // Shared helper from apps/common/game-utils.js (loaded via <script> in browser)
        getCurrentPlayerLabel: "readonly",
        planeOption: "writable",
        planeAudio: "writable",
        rule: "writable",
        computer: "writable",
        diceNum: "writable",
        nextStep: "writable",
        sixTime: "writable",
        COORD: "readonly",
        createPlane: "writable",
        initRedCoord: "readonly",
        initBlueCoord: "readonly",
        initYellowCoord: "readonly",
        initGreenCoord: "readonly",
        event: "readonly",
      },
    },
  },
  {
    files: ["**/*.test.js"],
    rules: {
      "no-var": "off",
    },
  },
  {
    // Service worker context: different globals from regular browser scripts.
    files: ["sw.js", "**/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        caches: "readonly",
        clients: "readonly",
        fetch: "readonly",
        URL: "readonly",
        console: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "js/baidu-analytics.js", ".claude/**"],
  },
];
