/*
Copyright 2026 Element Max contributors

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type IWidget } from "matrix-widget-api";
import { describe, expect, it } from "vitest";

import WidgetStore from "./WidgetStore";

describe("Element Max widget policy", () => {
    it.each(["m.jitsi", "jitsi"])("rejects the disabled %s widget type", (type) => {
        const widget = {
            id: "disabled-jitsi",
            type,
            creatorUserId: "@alice:example.org",
        } as IWidget;

        expect(() => WidgetStore.instance.addVirtualWidget(widget, "!room:example.org")).toThrow(
            "Jitsi widgets are disabled in Element Max",
        );
    });
});
