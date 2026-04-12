

const theme = {
    set(name, save = true) {
        const resolvedName = configuration.set("theme", name, save);
        const resolvedTheme = resolvedName === "system" ? theme.getSystemTheme() : (resolvedName === "reverse-system" ? theme.getReverseSystemTheme() : resolvedName);
        const isLight = resolvedTheme === "light";

        document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");

        document.getElementById("judge0-golden-layout-dark-theme-stylesheet").disabled = isLight;
        document.getElementById("judge0-golden-layout-light-theme-stylesheet").disabled = !isLight;

        if (window.monaco) {
            monaco.editor.setTheme(isLight ? "vs-light" : "vs-dark");
        }

        [".ui.menu", ".ui.input", ".ui.basic.button", ".ui.segment", ".ui.message", ".ui.modal", ".judge0-file-menu"].forEach(s => document.querySelectorAll(s).forEach(e => {
            if (isLight) {
                e.classList.remove("inverted");
            } else {
                e.classList.add("inverted");
            }
        }));

        document.querySelectorAll(".label").forEach(e => {
            if (isLight) {
                e.classList.remove("black");
            } else {
                e.classList.add("black");
            }
        });

        document.getElementById("judge0-theme-toggle-btn").setAttribute("data-content", `Switch between dark and light theme (currently ${resolvedTheme} theme)`);
        const themeToggleBtnIcon = document.getElementById("judge0-theme-toggle-btn-icon");
        if (resolvedTheme === "dark") {
            themeToggleBtnIcon.className = "moon icon";
        } else {
            themeToggleBtnIcon.className = "adjust icon";
        }

        document.querySelectorAll("[data-content]").forEach(e => {
            if (isLight) {
                e.setAttribute("data-variation", "very wide");
            } else {
                e.setAttribute("data-variation", "inverted very wide");
            }
        });

        document.head.querySelectorAll("meta[name='theme-color'], meta[name='msapplication-TileColor']").forEach(e => {
            e.setAttribute("content", isLight ? "#ffffff" : "#1b1c1d");
        });

        // Notify parent window about the theme change
        if (window.top !== window) {
            window.top.postMessage({
                event: "themeChanged",
                theme: isLight ? "light" : "dark"
            }, "*");
        }
    },
    toggle() {
        const current = configuration.get("theme");
        if (current === "dark" || (current === "system" && theme.getSystemTheme() === "dark")) {
            theme.set("light");
        } else {
            theme.set("dark");
        }
    },
    getSystemTheme() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    },
    getReverseSystemTheme() {
        return theme.getSystemTheme() === "dark" ? "light" : "dark";
    },
    isLight() {
        const currentTheme = configuration.get("theme");
        const resolvedTheme = currentTheme === "system" ? theme.getSystemTheme() : (currentTheme === "reverse-system" ? theme.getReverseSystemTheme() : currentTheme);
        return resolvedTheme === "light";
    }
};

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    ["system", "reverse-system"].forEach(t => {
        if (configuration.get("theme") === t) {
            theme.set(t, false);
        }
    });
});

const API_KEY = "";

const AUTH_HEADERS = API_KEY ? {
    "Authorization": `Bearer ${API_KEY}`
} : {};

const CE = "CE";
const EXTRA_CE = "EXTRA_CE";

const AUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var AUTHENTICATED_BASE_URL = {};
AUTHENTICATED_BASE_URL[CE] = AUTHENTICATED_CE_BASE_URL;
AUTHENTICATED_BASE_URL[EXTRA_CE] = AUTHENTICATED_EXTRA_CE_BASE_URL;

const UNAUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var UNAUTHENTICATED_BASE_URL = {};
UNAUTHENTICATED_BASE_URL[CE] = UNAUTHENTICATED_CE_BASE_URL;
UNAUTHENTICATED_BASE_URL[EXTRA_CE] = UNAUTHENTICATED_EXTRA_CE_BASE_URL;

const INITIAL_WAIT_TIME_MS = 0;
const WAIT_TIME_FUNCTION = i => 100;
const MAX_PROBE_REQUESTS = 600;

var fontSize = 13;

var layout;
var ORIGINAL_LAYOUT_CONFIG = null;

var sourceEditor;
var stdinEditor;
var stdoutEditor;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $runBtn;
var $statusLine;

var timeStart;

var languages = {};

var layoutConfig = {
    settings: {
        showPopoutIcon: false,
        reorderEnabled: true
    },
    content: [{
        type: configuration.get("appOptions.mainLayout"),
        content: [{
            type: "component",
            width: 66,
            componentName: "source",
            id: "source",
            title: "Source Code",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, {
            type: "column",
            content: [
                {
                    type: "component",
                    componentName: "stdin",
                    id: "stdin",
                    title: "Input",
                    isClosable: false,
                    componentState: {
                        readOnly: false
                    }
                },
                {
                    type: "component",
                    componentName: "stdout",
                    id: "stdout",
                    title: "Output",
                    isClosable: false,
                    componentState: {
                        readOnly: true
                    }
                }
            ]
        }]
    }]
};

// --- PERSISTENCE: now handled by language-manager.js ---
function saveState() {
    if (!layout || !sourceEditor || window.isRestoringState) return;
    const langId = getSelectedLanguageId();
    const flavor = getSelectedLanguageFlavor();
    // Save code for this language
    saveCodeForLanguage(langId, sourceEditor.getValue());
    // Save layout + other state
    saveLayoutState(
        layout.toConfig(),
        langId,
        flavor,
        stdinEditor.getValue(),
        $compilerOptions.val(),
        $commandLineArguments.val()
    );
}

function loadState() {
    return loadPersistedState();
}



function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
    var escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

function showError(title, content) {
    $("#judge0-site-modal #title").html(title);
    $("#judge0-site-modal .content").html(content);

    let reportTitle = encodeURIComponent(`Error on ${window.location.href}`);
    let reportBody = encodeURIComponent(
        `**Error Title**: ${title}\n` +
        `**Error Timestamp**: \`${new Date()}\`\n` +
        `**Origin**: ${window.location.href}\n` +
        `**Description**:\n${content}`
    );

    $("#report-problem-btn").attr("href", `https://github.com/judge0/ide/issues/new?title=${reportTitle}&body=${reportBody}`);
    $("#judge0-site-modal").modal("show");
}

function showHttpError(jqXHR) {
    showError(`${jqXHR.statusText} (${jqXHR.status})`, `<pre style="white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.05); padding: 10px; border-radius: 4px;">${JSON.stringify(jqXHR, null, 4)}</pre>`);
}

function handleRunError(jqXHR) {
    showHttpError(jqXHR);
    $runBtn.removeClass("loading");

    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "runError",
        data: jqXHR
    })), "*");
}

function handleResult(data) {
    const tat = Math.round(performance.now() - timeStart);
    console.log(`It took ${tat}ms to get submission result.`);

    const status = data.status;
    const stdout = decode(data.stdout);
    const compileOutput = decode(data.compile_output);
    const time = (data.time === null ? "-" : data.time + "s");
    const memory = (data.memory === null ? "-" : data.memory + "KB");

    $statusLine.html(`${status.description}, ${time}, ${memory} (TAT: ${tat}ms)`);

    const output = [compileOutput, stdout].filter(x => x).join("\n").trimEnd();

    stdoutEditor.setValue(output);

    $runBtn.removeClass("loading");

    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "postExecution",
        status: data.status,
        time: data.time,
        memory: data.memory,
        output: output
    })), "*");
}

async function getSelectedLanguage() {
    return getLanguage(getSelectedLanguageFlavor(), getSelectedLanguageId())
}

function getSelectedLanguageId() {
    const val = $("#select-language").dropdown("get value");
    return val ? parseInt(val) : 105;
}

function getSelectedLanguageFlavor() {
    const activeItem = $("#select-language .menu .item.active");
    return activeItem.length ? activeItem.attr("data-flavor") : "CE";
}

function run() {
    const code = sourceEditor.getValue().trim();
    if (code === "") {
        showError("Error", "Source code can't be empty!");
        return;
    }

    // ─── Language Lock Validation ────────────────────────────────
    const langId = getSelectedLanguageId();
    const validation = validateCodeForLanguage(langId, code);
    if (!validation.valid) {
        showError("Language Mismatch", validation.message);
        return;
    }

    $runBtn.addClass("loading");

    stdoutEditor.setValue("");
    $statusLine.html("");

    let x = layout.root.getItemsById("stdout")[0];
    x.parent.header.parent.setActiveContentItem(x);

    let sourceValue = encode(sourceEditor.getValue());
    let stdinValue = encode(stdinEditor.getValue());
    let languageId = getSelectedLanguageId();
    let compilerOptions = $compilerOptions.val();
    let commandLineArguments = $commandLineArguments.val();

    let flavor = getSelectedLanguageFlavor();

    if (languageId === 44) {
        sourceValue = sourceEditor.getValue();
    }

    let data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: stdinValue,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArguments,
        redirect_stderr_to_stdout: true
    };

    let sendRequest = function (data) {
        window.top.postMessage(JSON.parse(JSON.stringify({
            event: "preExecution",
            source_code: sourceEditor.getValue(),
            language_id: languageId,
            flavor: flavor,
            stdin: stdinEditor.getValue(),
            compiler_options: compilerOptions,
            command_line_arguments: commandLineArguments
        })), "*");

        timeStart = performance.now();
        $.ajax({
            url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=false`,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            headers: AUTH_HEADERS,
            success: function (data, textStatus, request) {
                console.log(`Your submission token is: ${data.token}`);
                let region = request.getResponseHeader('X-Judge0-Region');
                setTimeout(fetchSubmission.bind(null, flavor, region, data.token, 1), INITIAL_WAIT_TIME_MS);
            },
            error: handleRunError
        });
    }

    sendRequest(data);
}

function fetchSubmission(flavor, region, submission_token, iteration) {
    if (iteration >= MAX_PROBE_REQUESTS) {
        handleRunError({
            statusText: "Maximum number of probe requests reached.",
            status: 504
        }, null, null);
        return;
    }

    $.ajax({
        url: `${UNAUTHENTICATED_BASE_URL[flavor]}/submissions/${submission_token}?base64_encoded=true`,
        headers: {
            "X-Judge0-Region": region
        },
        success: function (data) {
            if (data.status.id <= 2) { // In Queue or Processing
                $statusLine.html(data.status.description);
                setTimeout(fetchSubmission.bind(null, flavor, region, submission_token, iteration + 1), WAIT_TIME_FUNCTION(iteration));
            } else {
                handleResult(data);
            }
        },
        error: handleRunError
    });
}

function setSourceCodeName(name) {
    $(".lm_title")[0].innerText = name;
}

function getSourceCodeName() {
    return $(".lm_title")[0].innerText;
}

function openFile(content, filename) {
    clear();
    sourceEditor.setValue(content);
    selectLanguageForExtension(filename.split(".").pop());
    setSourceCodeName(filename);
}

function saveFile(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function openAction() {
    document.getElementById("open-file-input").click();
}

async function saveAction() {
    saveFile(sourceEditor.getValue(), getSourceCodeName());
}

function setFontSizeForAllEditors(fontSize) {
    sourceEditor.updateOptions({ fontSize: fontSize });
    stdinEditor.updateOptions({ fontSize: fontSize });
    stdoutEditor.updateOptions({ fontSize: fontSize });
}

async function loadLanguages() {
    return new Promise((resolve, reject) => {
        const icons = {
            105: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
            43: "https://upload.wikimedia.org/wikipedia/commons/1/18/C_Programming_Language.svg",
            91: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
            102: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
            25: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
        };

        const $menu = $("#select-language .menu");
        $menu.empty();

        const SUPPORTED_LANGUAGE_IDS = [43, 105, 91, 25, 102]; // C, C++, Java, Python, JS
        const lastLangId = getLastLanguageId();

        const buildUI = (allData) => {
            const languageMap = {};
            allData.forEach(lang => languageMap[lang.id] = lang);

            SUPPORTED_LANGUAGE_IDS.forEach(id => {
                const language = languageMap[id];
                if (!language) return;

                let displayName = language.name.split(" ")[0];
                if (language.id === 105) displayName = "C++";
                if (language.id === 43) displayName = "C";
                const iconUrl = icons[language.id] || "";

                const config = getLanguageConfig(id);
                const flavor = config ? config.flavor : "CE";

                const $item = $(`
                    <div class="item" data-value="${language.id}" data-flavor="${flavor}" style="display: flex !important; align-items: center !important;">
                        <img src="${iconUrl}" style="width: 16px; height: 16px; margin-right: 4px;">
                        <span class="text">${displayName}</span>
                    </div>
                `);
                $menu.append($item);
            });

            // Initialize Dropdown
            $("#select-language").dropdown({
                onChange: function (value) {
                    loadSelectedLanguage();
                }
            });

            // Force initial selection: use saved ID or default to C++ (105)
            const targetId = lastLangId || 105;
            $("#select-language").dropdown("set selected", targetId.toString());

            resolve();
        };

        $.ajax({
            url: UNAUTHENTICATED_CE_BASE_URL + "/languages",
            success: function (ceData) {
                $.ajax({
                    url: UNAUTHENTICATED_EXTRA_CE_BASE_URL + "/languages",
                    success: function (extraData) {
                        buildUI([...ceData, ...extraData]);
                    },
                    error: () => buildUI(ceData)
                });
            },
            error: reject
        });
    });
};

async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
    const langId = getSelectedLanguageId();
    const config = getLanguageConfig(langId);
    if (!config) return;

    // Update main dropdown icon and text to match selection
    const icons = {
        105: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
        43: "https://upload.wikimedia.org/wikipedia/commons/1/18/C_Programming_Language.svg",
        91: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
        102: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
        25: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
    };
    const iconUrl = icons[langId];
    $("#select-language > .text").css({
        "display": "flex",
        "align-items": "center",
        "gap": "4px",
        "margin-right": "14px"
    }).html(`<img src="${iconUrl}" style="width: 16px; height: 16px;">${config.name}`);


    if (typeof monaco === "undefined" || typeof sourceEditor === "undefined") {
        return;
    }

    // Set Monaco syntax mode
    monaco.editor.setModelLanguage(sourceEditor.getModel(), config.monacoMode);

    // Load saved code for this language, or fall back to template
    const code = loadCodeForLanguage(langId);
    sourceEditor.setValue(code);

    // Save current language selection
    saveState();

    if (!skipSetDefaultSourceCodeName) {
        setSourceCodeName(config.filename);
    }
}

async function selectLanguageByFlavorAndId(languageId, flavor) {
    $("#select-language").dropdown("set selected", languageId.toString());
    await loadSelectedLanguage(true);
}

function selectLanguageForExtension(extension) {
    let language = getLanguageForExtension(extension);
    selectLanguageByFlavorAndId(language.language_id, language.flavor);
}

async function getLanguage(flavor, languageId) {
    return new Promise((resolve, reject) => {
        if (languages[flavor] && languages[flavor][languageId]) {
            resolve(languages[flavor][languageId]);
            return;
        }

        $.ajax({
            url: `${UNAUTHENTICATED_BASE_URL[flavor]}/languages/${languageId}`,
            success: function (data) {
                if (!languages[flavor]) {
                    languages[flavor] = {};
                }

                languages[flavor][languageId] = data;
                resolve(data);
            },
            error: reject
        });
    });
}

window.resetLayout = function () {
    // Clear all saved state via Language Manager
    clearPersistedState();
    if (layout) {
        layout.destroy();
    }
    layout = new GoldenLayout(ORIGINAL_LAYOUT_CONFIG, $("#judge0-site-content"));

    layout.registerComponent("source", function (container, state) {
        sourceEditor = monaco.editor.create(container.getElement()[0], {
            automaticLayout: true,
            scrollBeyondLastLine: true,
            readOnly: state.readOnly,
            language: "cpp",
            minimap: {
                enabled: true
            }
        });
        sourceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);
    });

    layout.registerComponent("stdin", function (container, state) {
        stdinEditor = monaco.editor.create(container.getElement()[0], {
            automaticLayout: true,
            scrollBeyondLastLine: false,
            readOnly: state.readOnly,
            language: "plaintext",
            minimap: {
                enabled: false
            }
        });
    });

    layout.registerComponent("stdout", function (container, state) {
        stdoutEditor = monaco.editor.create(container.getElement()[0], {
            automaticLayout: true,
            scrollBeyondLastLine: false,
            readOnly: state.readOnly,
            language: "plaintext",
            minimap: {
                enabled: false
            }
        });
    });

    layout.on("initialised", function () {
        try {
            setDefaults();
            refreshLayoutSize();
        } finally {
            window.isRestoringState = false;
        }
        window.top.postMessage({ event: "initialised" }, "*");
    });

    window.isRestoringState = true;
    layout.init();
}

function resetLayout() { window.resetLayout(); }

function setDefaults() {
    const langId = getSelectedLanguageId();
    const config = getLanguageConfig(langId);
    setFontSizeForAllEditors(fontSize);
    sourceEditor.setValue(config ? config.template : "");
    stdinEditor.setValue(DEFAULT_STDIN);
    $compilerOptions.val(DEFAULT_COMPILER_OPTIONS);
    $commandLineArguments.val(DEFAULT_CMD_ARGUMENTS);
    $statusLine.html("");
    if (config) setSourceCodeName(config.filename);
    loadSelectedLanguage(true);
}

function clear() {
    sourceEditor.setValue("");
    stdinEditor.setValue("");
    $compilerOptions.val("");
    $commandLineArguments.val("");

    $statusLine.html("");
}

function refreshSiteContentHeight() {
    const navigationHeight = document.getElementById("judge0-site-navigation").offsetHeight;

    const siteContent = document.getElementById("judge0-site-content");
    siteContent.style.height = `${window.innerHeight - navigationHeight}px`;
    siteContent.style.paddingTop = `0px`;
}

function refreshLayoutSize() {
    refreshSiteContentHeight();
    if (layout) {
        layout.updateSize();
    }
}

window.addEventListener("resize", refreshLayoutSize);
document.addEventListener("DOMContentLoaded", async function () {
    $(".ui.selection.dropdown").dropdown();
    $("[data-content]").popup({
        lastResort: "left center"
    });

    refreshSiteContentHeight();

    console.log("Hey, Gitcomplier is open-sourced: https://github.com/Bhagirath00/Gitcomplier.git. Have fun!");

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (event, data) {
        let skipSetDefaultSourceCodeName = (data && data.skipSetDefaultSourceCodeName);
        loadSelectedLanguage(skipSetDefaultSourceCodeName);
    });

    await loadLanguages();

    $compilerOptions = $("#compiler-options");
    $commandLineArguments = $("#command-line-arguments");

    $runBtn = $("#run-btn");
    $runBtn.click(run);

    $("#open-file-input").change(function (e) {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function (e) {
                openFile(e.target.result, selectedFile.name);
            };

            reader.onerror = function (e) {
                showError("Error", "Error reading file: " + e.target.error);
            };

            reader.readAsText(selectedFile);
        }
    });

    $statusLine = $("#judge0-status-line");

    $(document).on("keydown", "body", function (e) {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case "Enter":
                    e.preventDefault();
                    run();
                    break;
                case "s":
                    e.preventDefault();
                    saveAction();
                    break;
                case "o":
                    e.preventDefault();
                    openAction();
                    break;
                case "+":
                case "=":
                    e.preventDefault();
                    fontSize += 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "-":
                    e.preventDefault();
                    fontSize -= 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "0":
                    e.preventDefault();
                    fontSize = 13;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "`":
                    e.preventDefault();
                    sourceEditor.focus();
                    break;
            }
        }
    });

    require(["vs/editor/editor.main"], function (ignorable) {
        theme.set(configuration.get("theme"), false);
        ORIGINAL_LAYOUT_CONFIG = JSON.parse(JSON.stringify(layoutConfig));

        const savedStateForLayout = loadPersistedState();
        const configToUse = savedStateForLayout ? savedStateForLayout.layout : layoutConfig;

        layout = new GoldenLayout(configToUse, $("#judge0-site-content"));

        layout.registerComponent("source", function (container, state) {
            sourceEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: true,
                readOnly: state.readOnly,
                language: "cpp",
                minimap: {
                    enabled: true
                }
            });

            sourceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);
            sourceEditor.onDidChangeModelContent(saveState);
        });

        layout.registerComponent("stdin", function (container, state) {
            stdinEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });
            stdinEditor.onDidChangeModelContent(saveState);
        });

        layout.registerComponent("stdout", function (container, state) {
            stdoutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });
        });

        layout.on("initialised", async function () {
            try {
                const savedState = loadPersistedState();
                if (savedState) {
                    $compilerOptions.val(savedState.compilerOptions || "");
                    $commandLineArguments.val(savedState.cmdArgs || "");
                    stdinEditor.setValue(savedState.stdin || "");
                    const lastLangId = savedState.lastLanguageId || 105;
                    const lastFlavor = savedState.lastFlavor || "CE";
                    await selectLanguageByFlavorAndId(lastLangId, lastFlavor);
                } else {
                    setDefaults();
                }
                refreshLayoutSize();
            } finally {
                window.isRestoringState = false;
            }
            window.top.postMessage({ event: "initialised" }, "*");
        });

        layout.on("stateChanged", saveState);

        window.isRestoringState = true;
        layout.init();
    });

    let superKey = "⌘";
    if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
        superKey = "Ctrl+";
    }

    [$runBtn].forEach(btn => {
        btn.attr("data-content", `${superKey}${btn.attr("data-content")}`);
    });

    document.querySelectorAll(".description").forEach(e => {
        e.innerText = `${superKey}${e.innerText}`;
    });



    document.getElementById("judge0-theme-toggle-btn").addEventListener("click", theme.toggle);
    document.getElementById("judge0-open-file-btn").addEventListener("click", openAction);
    document.getElementById("judge0-save-btn").addEventListener("click", saveAction);

    window.onmessage = function (e) {
        if (!e.data) {
            return;
        }

        if (e.data.action === "setTheme") {
            const currentTheme = theme.isLight() ? "light" : "dark";
            if (e.data.theme && e.data.theme !== currentTheme) {
                theme.set(e.data.theme);
            }
            return;
        }

        // For all other actions, we need the editor to be ready
        if (typeof sourceEditor === "undefined") {
            console.warn("IDE not yet initialized. Ignoring message:", e.data.action);
            return;
        }

        if (e.data.action === "get") {
            window.top.postMessage(JSON.parse(JSON.stringify({
                event: "getResponse",
                source_code: sourceEditor.getValue(),
                language_id: getSelectedLanguageId(),
                flavor: getSelectedLanguageFlavor(),
                stdin: stdinEditor.getValue(),
                stdout: stdoutEditor.getValue(),
                compiler_options: $compilerOptions.val(),
                command_line_arguments: $commandLineArguments.val()
            })), "*");
        } else if (e.data.action === "set") {
            if (e.data.source_code) {
                sourceEditor.setValue(e.data.source_code);
            }
            if (e.data.language_id && e.data.flavor) {
                selectLanguageByFlavorAndId(e.data.language_id, e.data.flavor);
            }
            if (e.data.stdin) {
                stdinEditor.setValue(e.data.stdin);
            }
            if (e.data.stdout) {
                stdoutEditor.setValue(e.data.stdout);
            }
            if (e.data.compiler_options) {
                $compilerOptions.val(e.data.compiler_options);
            }
            if (e.data.command_line_arguments) {
                $commandLineArguments.val(e.data.command_line_arguments);
            }
            if (e.data.api_key) {
                AUTH_HEADERS["Authorization"] = `Bearer ${e.data.api_key}`;
            }
        } else if (e.data.action === "run") {
            run();
        }
    };
});

// DEFAULT_SOURCE is now managed by Language Manager (language-manager.js)
// Each language has its own template file in js/templates/
// Use: getTemplate(languageId) or loadCodeForLanguage(languageId)


const DEFAULT_STDIN = "5 10";

const DEFAULT_COMPILER_OPTIONS = "";
const DEFAULT_CMD_ARGUMENTS = "";
const DEFAULT_LANGUAGE_ID = 105; // C++ (GCC 14.1.0) (https://ce.judge0.com/languages/105)

function getEditorLanguageMode(languageName) {
    const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";
    const LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE = {
        "C++": "cpp",
        "Java": "java",
        "JavaScript": "javascript",
        "Python": "python"
    }

    for (let key in LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE) {
        if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
            return LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE[key];
        }
    }
    return DEFAULT_EDITOR_LANGUAGE_MODE;
}

const EXTENSIONS_TABLE = {
    "cpp": { "flavor": CE, "language_id": 105 }, // C++ (GCC 14.1.0)
    "java": { "flavor": CE, "language_id": 91 }, // Java (JDK 17.0.6)
    "js": { "flavor": CE, "language_id": 102 }, // JavaScript (Node.js 22.08.0)
    "py": { "flavor": EXTRA_CE, "language_id": 25 }, // Python for ML (3.11.2)
};

function getLanguageForExtension(extension) {
    return EXTENSIONS_TABLE[extension] || { "flavor": CE, "language_id": 43 }; // Plain Text (https://ce.judge0.com/languages/43)
}
