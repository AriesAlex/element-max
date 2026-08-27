fetch("version.json")
    .then((response) => {
        if (!response.ok) throw new Error("Version metadata is unavailable");
        return response.json();
    })
    .then(({ version }) => {
        if (typeof version !== "string") return;
        document.querySelectorAll("[data-version]").forEach((element) => {
            element.textContent = version;
        });
    })
    .catch(() => {});
