/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import russian from "../../i18n/strings/ru.json";

describe("Element Max Russian translations", () => {
    it("covers the shared user menu", () => {
        expect(russian.user_menu).toEqual({
            link_new_device: "Привязать новое устройство",
            open_feedback: "Обратная связь",
            open_home: "Главная",
            open_security: "Безопасность и конфиденциальность",
            open_settings: "Все настройки",
        });
    });

    it("covers group call tombstones", () => {
        expect(russian.timeline.call_tile.tombstone.room.title).toBe("Групповой звонок завершён");
    });
});
