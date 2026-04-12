/**
 * LanguageManager - Yuktisutra IDE
 * 
 * Handles:
 * - Loading correct template per language
 * - Language lock (Java = Java only, etc.)
 * - Per-language code memory
 * - Monaco editor mode switching
 * - LeetCode-style smart wrapping detection
 */

const LANGUAGE_CONFIGS = {
    105: {
        id: 105,
        flavor: "CE",
        name: "C++",
        monacoMode: "cpp",
        filename: "main.cpp",
        template: CPP_TEMPLATE,
        // Detection: is this valid standalone C++?
        isFullProgram: (code) => code.includes("int main"),
        // Lock check: code should be C++ syntax
        validate: (code) => {
            const javaSignatures = ["public class", "System.out", "import java"];
            const pythonSignatures = ["def main", "print(", "import sys"];
            for (const sig of [...javaSignatures, ...pythonSignatures]) {
                if (code.includes(sig)) return { valid: false, message: `You selected C++ but this looks like a different language. Switch language or write C++ code.` };
            }
            return { valid: true };
        }
    },
    43: {
        id: 43,
        flavor: "CE",
        name: "C",
        monacoMode: "c",
        filename: "main.c",
        template: C_TEMPLATE,
        isFullProgram: (code) => code.includes("int main"),
        validate: (code) => {
            const javaSignatures = ["public class", "System.out"];
            const pythonSignatures = ["def main", "print("];
            for (const sig of [...javaSignatures, ...pythonSignatures]) {
                if (code.includes(sig)) return { valid: false, message: `You selected C but this looks like a different language. Switch language or write C code.` };
            }
            return { valid: true };
        }
    },
    91: {
        id: 91,
        flavor: "CE",
        name: "Java",
        monacoMode: "java",
        filename: "Main.java",
        template: JAVA_TEMPLATE,
        isFullProgram: (code) => code.includes("public class"),
        validate: (code) => {
            const cppSignatures = ["#include", "int main(", "std::"];
            const pythonSignatures = ["def main", "print(", "import sys"];
            for (const sig of cppSignatures) {
                if (code.includes(sig)) return { valid: false, message: `You selected Java but this looks like C++. Switch language or write Java code.` };
            }
            for (const sig of pythonSignatures) {
                if (code.includes(sig)) return { valid: false, message: `You selected Java but this looks like Python. Switch language or write Java code.` };
            }
            return { valid: true };
        }
    },
    102: {
        id: 102,
        flavor: "CE",
        name: "JavaScript",
        monacoMode: "javascript",
        filename: "solution.js",
        template: JAVASCRIPT_TEMPLATE,
        isFullProgram: (code) => code.includes("require(") || code.includes("process.stdin"),
        validate: (code) => {
            const cppSignatures = ["#include", "int main(", "std::"];
            const javaSignatures = ["public class", "System.out"];
            for (const sig of cppSignatures) {
                if (code.includes(sig)) return { valid: false, message: `You selected JavaScript but this looks like C++. Switch language or write JavaScript code.` };
            }
            for (const sig of javaSignatures) {
                if (code.includes(sig)) return { valid: false, message: `You selected JavaScript but this looks like Java. Switch language or write JavaScript code.` };
            }
            return { valid: true };
        }
    },
    25: {
        id: 25,
        flavor: "EXTRA_CE",
        name: "Python",
        monacoMode: "python",
        filename: "solution.py",
        template: PYTHON_TEMPLATE,
        isFullProgram: (code) => code.includes("def main") || code.includes("if __name__"),
        validate: (code) => {
            const cppSignatures = ["#include", "int main(", "std::"];
            const javaSignatures = ["public class", "System.out", "import java"];
            for (const sig of cppSignatures) {
                if (code.includes(sig)) return { valid: false, message: `You selected Python but this looks like C++. Switch language or write Python code.` };
            }
            for (const sig of javaSignatures) {
                if (code.includes(sig)) return { valid: false, message: `You selected Python but this looks like Java. Switch language or write Python code.` };
            }
            return { valid: true };
        }
    }
};

// ─── Storage Key ────────────────────────────────────────────────
const STORAGE_KEY = "yuktisutra.ide.state.v3";

// ─── Get template for a language ────────────────────────────────
function getTemplate(languageId) {
    const config = LANGUAGE_CONFIGS[languageId];
    return config ? config.template : "";
}

// ─── Get config for a language ──────────────────────────────────
function getLanguageConfig(languageId) {
    return LANGUAGE_CONFIGS[languageId] || null;
}

// ─── Save code per language into localStorage ────────────────────
function saveCodeForLanguage(languageId, code) {
    const state = loadPersistedState() || {};
    if (!state.codes) state.codes = {};
    state.codes[languageId] = code;
    state.lastLanguageId = languageId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Save full layout state ──────────────────────────────────────
function saveLayoutState(layoutConfig, languageId, flavor, stdin, compilerOptions, cmdArgs) {
    const state = loadPersistedState() || {};
    state.layout = layoutConfig;
    state.lastLanguageId = languageId;
    state.lastFlavor = flavor;
    state.stdin = stdin;
    state.compilerOptions = compilerOptions;
    state.cmdArgs = cmdArgs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Load code for a specific language ──────────────────────────
function loadCodeForLanguage(languageId) {
    const state = loadPersistedState();
    if (state && state.codes && state.codes[languageId]) {
        return state.codes[languageId];
    }
    return getTemplate(languageId);
}

// ─── Load full persisted state ───────────────────────────────────
function loadPersistedState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

// ─── Clear all persisted state (called by Reset button) ──────────
function clearPersistedState() {
    localStorage.removeItem(STORAGE_KEY);
    // Also clear old key if exists
    localStorage.removeItem("yuktisutra.ide.state");
}

// ─── Validate code before running ────────────────────────────────
function validateCodeForLanguage(languageId, code) {
    const config = LANGUAGE_CONFIGS[languageId];
    if (!config) return { valid: true };
    return config.validate(code);
}

// ─── Get last used language from storage ─────────────────────────
function getLastLanguageId() {
    const state = loadPersistedState();
    return state && state.lastLanguageId ? state.lastLanguageId : 105; // Default: C++
}
