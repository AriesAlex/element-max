/*
Copyright 2026 AriesAlex

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    applyStoredThemeOverrides,
    applyThemePreset,
    clearThemeColor,
    collectThemeColorVariables,
    deleteThemePreset,
    exportThemeCollection,
    getThemePresets,
    importThemeCollection,
    resetThemeColors,
    saveThemePreset,
    setThemeColor,
} from "./elementMaxTheme";

describe("Element Max theme persistence", () => {
    let themeVariables: HTMLStyleElement;

    beforeEach(() => {
        localStorage.clear();
        document.body.removeAttribute("style");
        themeVariables = document.createElement("style");
        themeVariables.textContent = `
            body {
                --cpd-color-test: #abcdef;
                --accent: #0055ff;
                --active: rgb(1, 2, 3);
                --local: red;
                --layout-gap: 8px;
            }
        `;
        document.head.appendChild(themeVariables);
    });

    afterEach(() => {
        localStorage.clear();
        document.body.removeAttribute("style");
        themeVariables.remove();
    });

    it("applies valid colors immediately and restores them", () => {
        setThemeColor("--cpd-color-test", "#123456");
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("#123456");

        document.body.style.removeProperty("--cpd-color-test");
        applyStoredThemeOverrides();
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("#123456");

        clearThemeColor("--cpd-color-test");
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("");
    });

    it("rejects unsafe variable names and non-colors", () => {
        expect(() => setThemeColor("background", "red")).toThrow();
        expect(() => setThemeColor("--valid-name", "url(https://example.org/x)")).toThrow();
        expect(() => setThemeColor("--layout-gap", "red")).toThrow();
    });

    it("creates, applies, replaces, and deletes presets", () => {
        expect(saveThemePreset("Ocean", { "--accent": "#0055ff" })).toHaveLength(1);
        expect(saveThemePreset("Ocean", { "--accent": "#00aaff" })).toEqual([
            { name: "Ocean", colors: { "--accent": "#00aaff" } },
        ]);

        applyThemePreset(getThemePresets()[0]);
        expect(document.body.style.getPropertyValue("--accent")).toBe("#00aaff");

        expect(deleteThemePreset("Ocean")).toEqual([]);
        resetThemeColors();
        expect(document.body.style.getPropertyValue("--accent")).toBe("");
    });

    it("round-trips the portable collection and merges presets", () => {
        saveThemePreset("Local", { "--local": "red" });
        const serialized = exportThemeCollection({ "--active": "rgb(1, 2, 3)" });

        localStorage.clear();
        const presets = importThemeCollection(serialized);

        expect(presets).toEqual([{ name: "Local", colors: { "--local": "red" } }]);
        expect(document.body.style.getPropertyValue("--active")).toBe("rgb(1, 2, 3)");
    });

    it("collects only variables whose actual computed values are colors", () => {
        setThemeColor("--accent", "#3366ff");
        setThemeColor("--active", "#4466aa");
        setThemeColor("--cpd-color-test", "#123456");
        setThemeColor("--local", "#ff0000");

        expect(collectThemeColorVariables().map(({ name }) => name)).toEqual([
            "--accent",
            "--active",
            "--cpd-color-test",
            "--local",
        ]);
    });

    it("rejects legacy files that stored colors in layout variables", () => {
        const serialized = JSON.stringify({
            schema: "element-max-theme",
            version: 1,
            active: {
                "--cpd-color-test": "#123456",
                "--layout-gap": "rgb(235, 238, 242)",
            },
            presets: [
                {
                    name: "Recovered",
                    colors: {
                        "--accent": "#3366ff",
                        "--layout-gap": "rgb(235, 238, 242)",
                    },
                },
            ],
        });

        expect(() => importThemeCollection(serialized)).toThrow("Unknown theme color variable: --layout-gap");
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("");
        expect(document.body.style.getPropertyValue("--layout-gap")).toBe("");
    });

    it("clears persisted overrides from the legacy broken editor", () => {
        localStorage.setItem(
            "element_max_theme_editor",
            JSON.stringify({
                version: 1,
                active: {
                    "--cpd-color-test": "#123456",
                    "--layout-gap": "rgb(235, 238, 242)",
                },
                presets: [],
            }),
        );

        applyStoredThemeOverrides();

        expect(localStorage.getItem("element_max_theme_editor")).toBeNull();
        expect(document.body.style.getPropertyValue("--cpd-color-test")).toBe("");
        expect(document.body.style.getPropertyValue("--layout-gap")).toBe("");
    });
});
