function onSPJMode() {
    return function (event) {
        event.target.checked = !event.target.checked;
        window.localStorage.setItem("spj-mode", event.target.checked ? "true" : "false");
        updateTheme();
    };
}

function onDarkMode(value) {
    return function (event) {
        const light = document.getElementById("menu-light-mode");
        const dark = document.getElementById("menu-dark-mode");
        const system = document.getElementById("menu-system-mode");

        event.target.checked = true;
        if (event.target === light) {
            window.localStorage.setItem("dark-mode", "false");
        } else {
            light.checked = false;
        }
        if (event.target === dark) {
            window.localStorage.setItem("dark-mode", "true");
        } else {
            dark.checked = false;
        }
        if (event.target === system) {
            window.localStorage.removeItem("dark-mode");
        } else {
            system.checked = false;
        }

        updateTheme();
    };
}

function updateTheme() {
    const spj = window.localStorage.getItem("spj-mode") == "true";
    const darkValue = window.localStorage.getItem("dark-mode");
    const dark =
        darkValue === null
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
            : darkValue == "true";

    document.body.classList[spj ? "add" : "remove"]("spj-mode");
    document.body.classList[dark ? "add" : "remove"]("sl-theme-dark");
}

window.onload = function () {
    document.getElementById("menu-light-mode").checked =
        window.localStorage.getItem("dark-mode") == "false";
    document.getElementById("menu-dark-mode").checked =
        window.localStorage.getItem("dark-mode") == "true";
    document.getElementById("menu-system-mode").checked =
        window.localStorage.getItem("dark-mode") === null;
    document.getElementById("menu-spj-mode").checked =
        window.localStorage.getItem("spj-mode") == "true";

    document.getElementById("menu-light-mode").onclick = onDarkMode("false");
    document.getElementById("menu-dark-mode").onclick = onDarkMode("true");
    document.getElementById("menu-system-mode").onclick = onDarkMode(null);
    document.getElementById("menu-spj-mode").onclick = onSPJMode();
};
