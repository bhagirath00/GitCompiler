

const query = {
    get(key) {
        const query = window.location.search.substring(1);
        const vars = query.split("&");
        for (let i = 0; i < vars.length; i++) {
            const pair = vars[i].split("=");
            if (decodeURIComponent(pair[0]) == key) {
                return decodeURIComponent(pair[1]);
            }
        }
    },
    keys() {
        const query = window.location.search.substring(1);
        const vars = query.split("&");
        const keys = [];
        for (let i = 0; i < vars.length; i++) {
            const pair = vars[i].split("=");
            keys.push(decodeURIComponent(pair[0]));
        }
        return keys;
    }
};

const ls = {
    PREFIX: "judge0.",
    set(key, value) {
        if (!key) {
            return;
        }

        try {
            if (value == null) {
                ls.del(key);
                return;
            }

            if (typeof value === "object") {
                value = JSON.stringify(value);
            }

            localStorage.setItem(`${ls.PREFIX}${key}`, value);
        } catch (ignorable) {
        }
    },
    get(key) {
        if (!key) {
            return null;
        }

        try {
            const value = localStorage.getItem(`${ls.PREFIX}${key}`);
            try {
                return JSON.parse(value);
            } catch (ignorable) {
                return value;
            }
        } catch (ignorable) {
            return null;
        }
    },
    del(key) {
        if (!key) {
            return;
        }

        try {
            localStorage.removeItem(`${ls.PREFIX}${key}`);
        } catch (ignorable) {
        }
    }
};

const DEFAULT_CONFIGURATIONS = {
    default: {
        theme: "light",
        styleOptions: {
            showFileMenu: true,
            showSelectLanguage: true,
            showRunButton: true,
            showThemeButton: true,
            showStatusLine: true,
            showCopyright: true,
            showNavigation: true
        },
        appOptions: {
            ioLayout: "column",
            mainLayout: "row",
            showInput: true,
            showOutput: true
        }
    }
};

const PROXY_GET = function (obj, key) {
    if (!key) {
        return null;
    }

    for (const k of key.split(".")) {
        obj = obj[k];
        if (!obj) {
            break;
        }
    }

    return obj;
};

const PROXT_SET = function (obj, key, val) {
    if (!key) {
        return false;
    }

    const keys = key.split(".");
    const lastKey = keys[keys.length - 1];

    for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
            obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
    }

    obj[lastKey] = val;

    return true;
};

const PROXY_HANDLER = {
    get: PROXY_GET,
    set: PROXT_SET
};

const LEGAL_VALUES = new Proxy({
    theme: ["system", "reverse-system", "light", "dark"],
    appOptions: {
        ioLayout: ["stack", "row", "column"]
    }
}, PROXY_HANDLER);

const configuration = {
    CONFIGURATION: null,
    LOADED_CONFIGURATION: null,
    load() {
        configuration.getConfig();
    },
    getConfig() {
        if (!configuration.CONFIGURATION) {
            configuration.CONFIGURATION = new Proxy(JSON.parse(JSON.stringify(DEFAULT_CONFIGURATIONS.default)), {
                get: PROXY_GET,
                set: function (obj, key, val) {
                    if (LEGAL_VALUES[key] && !LEGAL_VALUES[key].includes(val)) {
                        return true;
                    }

                    if (PROXY_GET(obj, key) === val) {
                        return true;
                    }

                    PROXT_SET(obj, key, val);
                    return true;
                }
            });
            configuration.merge(configuration.CONFIGURATION, configuration.getLoadedConfig());
        }
        return configuration.CONFIGURATION;
    },
    getLoadedConfig() {
        if (!configuration.LOADED_CONFIGURATION) {
            configuration.LOADED_CONFIGURATION = new Proxy({}, PROXY_HANDLER);
            for (const key of configuration.getKeys(DEFAULT_CONFIGURATIONS.default)) {
                const val = query.get(`${ls.PREFIX}${key}`) || ls.get(key);
                if (val) {
                    configuration.LOADED_CONFIGURATION[key] = val;
                }
            }
        }
        return configuration.LOADED_CONFIGURATION;
    },
    get(key) {
        const config = configuration.getConfig();
        return ls.get(key) || config[key];
    },
    set(key, val, save = false) {
        const config = configuration.getConfig();
        config[key] = val;
        if (save) {
            ls.set(key, config[key]);
        }
        return config[key];
    },
    getKeys(obj = configuration.getConfig(), prefix = "") {
        return Object.keys(obj).flatMap(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === "object" && obj[key]) {
                return configuration.getKeys(obj[key], fullKey);
            }
            return fullKey;
        });
    },
    merge(dest, src) {
        for (const key of configuration.getKeys(src)) {
            const val = src[key];
            const valStr = String(val || "").toLowerCase();
            if (["true", "on", "yes"].includes(valStr)) {
                dest[key] = true;
            } else if (["false", "off", "no"].includes(valStr)) {
                dest[key] = false;
            } else {
                dest[key] = val;
            }
        }
    }
};

configuration.load();

window.configuration = configuration;
