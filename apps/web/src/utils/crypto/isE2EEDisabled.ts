/*
Copyright 2026 AriesAlex

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import SdkConfig from "../../SdkConfig";

/**
 * Whether this client build deliberately operates without Matrix E2EE.
 *
 * This is a product-level switch rather than a homeserver capability check: when enabled,
 * the crypto backend is not initialised and encryption-specific UI must not be exposed.
 */
export function isE2EEDisabled(): boolean {
    return SdkConfig.get("element_max")?.disable_e2ee === true;
}
