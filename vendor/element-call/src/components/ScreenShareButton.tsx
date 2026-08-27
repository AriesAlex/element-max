/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type FC, useEffect, useState } from "react";
import { Button, Menu, ToggleMenuItem } from "@vector-im/compound-web";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import classNames from "classnames";
import { useTranslation } from "react-i18next";

import { ShareScreenButton } from "../button";
import {
  type ScreenShareConfiguration,
  type ScreenShareStatus,
  screenShareConfiguration,
  screenShareSystemAudio,
} from "../state/ScreenShareSettings";
import { useSetting } from "../settings/settings";
import styles from "./ScreenShareButton.module.css";

interface Props {
  size: "md" | "lg";
  enabled: boolean;
  onClick: () => void;
  status: ScreenShareStatus | null;
  className?: string;
}

type NumericConfigurationKey =
  | "width"
  | "height"
  | "frameRate"
  | "maxBitrateMbps";

const numericConfigurationKeys: NumericConfigurationKey[] = [
  "width",
  "height",
  "frameRate",
  "maxBitrateMbps",
];

const videoCodecs: ScreenShareConfiguration["videoCodec"][] = [
  "vp8",
  "h264",
  "vp9",
  "av1",
  "h265",
];

function createDraft(
  configuration: ScreenShareConfiguration,
): Record<NumericConfigurationKey, string> {
  return Object.fromEntries(
    numericConfigurationKeys.map((key) => [
      key,
      configuration[key]?.toString() ?? "",
    ]),
  ) as Record<NumericConfigurationKey, string>;
}

export const ScreenShareButton: FC<Props> = ({
  size,
  enabled,
  onClick,
  status,
  className,
}) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [configuration, setConfiguration] = useSetting(
    screenShareConfiguration,
  );
  const [systemAudio, setSystemAudio] = useSetting(screenShareSystemAudio);
  const [draft, setDraft] = useState(() => createDraft(configuration));

  useEffect(() => setDraft(createDraft(configuration)), [configuration]);

  const commitNumber = (key: NumericConfigurationKey): void => {
    const rawValue = draft[key].trim();
    const value = rawValue === "" ? null : Number(rawValue);

    if (value === null || (Number.isFinite(value) && value > 0)) {
      const normalizedValue =
        value !== null && (key === "width" || key === "height")
          ? Math.round(value)
          : value;
      setConfiguration({ ...configuration, [key]: normalizedValue });
    } else {
      setDraft(createDraft(configuration));
    }
  };

  const getNumericLabel = (key: NumericConfigurationKey): string => {
    switch (key) {
      case "width":
        return t("screen_share_settings.width");
      case "height":
        return t("screen_share_settings.height");
      case "frameRate":
        return t("screen_share_settings.frameRate");
      case "maxBitrateMbps":
        return t("screen_share_settings.maxBitrateMbps");
    }
  };

  const statusText = status
    ? t("screen_share_settings.status_active", {
        width: status.width ?? "?",
        height: status.height ?? "?",
        frameRate: status.frameRate ?? "?",
        audio: t(
          status.audio
            ? "screen_share_settings.audio_on"
            : "screen_share_settings.audio_off",
        ),
      })
    : t("screen_share_settings.status_idle");

  return (
    <div
      className={classNames(className, styles.container, {
        [styles.containerOpen]: menuOpen,
      })}
    >
      <ShareScreenButton
        size={size}
        enabled={enabled}
        onClick={onClick}
        data-testid="incall_screenshare"
      />
      <Menu
        title={t("screen_share_settings.title")}
        showTitle
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="top"
        trigger={
          <Button
            iconOnly
            className={styles.menuButton}
            Icon={menuOpen ? ChevronUpIcon : ChevronDownIcon}
            kind="tertiary"
            size="lg"
            aria-label={t("screen_share_settings.open")}
          />
        }
      >
        <div className={styles.status} role="status">
          <strong>{t("screen_share_settings.current")}</strong>
          <span>{statusText}</span>
        </div>
        <hr />
        <fieldset className={styles.configuration}>
          <legend>{t("screen_share_settings.requested")}</legend>
          {numericConfigurationKeys.map((key) => (
            <label key={key}>
              <span>{getNumericLabel(key)}</span>
              <input
                type="number"
                min={key === "maxBitrateMbps" ? 0.1 : 1}
                step={
                  key === "width" || key === "height"
                    ? 1
                    : key === "maxBitrateMbps"
                      ? 0.1
                      : 1
                }
                value={draft[key]}
                placeholder={t("screen_share_settings.automatic")}
                onChange={(event) =>
                  setDraft({ ...draft, [key]: event.target.value })
                }
                onBlur={() => commitNumber(key)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
          ))}
          <label>
            <span>{t("screen_share_settings.videoCodec")}</span>
            <select
              value={configuration.videoCodec}
              onChange={(event) =>
                setConfiguration({
                  ...configuration,
                  videoCodec: event.target
                    .value as ScreenShareConfiguration["videoCodec"],
                })
              }
              onKeyDown={(event) => event.stopPropagation()}
            >
              {videoCodecs.map((codec) => (
                <option value={codec} key={codec}>
                  {codec.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <hr />
        <ToggleMenuItem
          label={t("screen_share_settings.system_audio")}
          onSelect={(event) => {
            event.preventDefault();
            setSystemAudio(!systemAudio);
          }}
          checked={systemAudio}
        />
        <p className={styles.hint}>
          {t("screen_share_settings.next_start_hint")}
        </p>
      </Menu>
    </div>
  );
};
