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

type ResolutionPreset =
  | "automatic"
  | "720p"
  | "1080p"
  | "1440p"
  | "2160p"
  | "custom";
type FrameRatePreset =
  | "automatic"
  | "30"
  | "60"
  | "90"
  | "120"
  | "165"
  | "custom";

const resolutionPresets: Array<{
  value: Exclude<ResolutionPreset, "custom">;
  width: number | null;
  height: number | null;
  label: string;
}> = [
  { value: "automatic", width: null, height: null, label: "Automatic" },
  { value: "720p", width: 1280, height: 720, label: "720p · 1280×720" },
  { value: "1080p", width: 1920, height: 1080, label: "1080p · 1920×1080" },
  { value: "1440p", width: 2560, height: 1440, label: "1440p · 2560×1440" },
  { value: "2160p", width: 3840, height: 2160, label: "4K · 3840×2160" },
];

const frameRatePresets: Array<{
  value: Exclude<FrameRatePreset, "custom">;
  frameRate: number | null;
}> = [
  { value: "automatic", frameRate: null },
  { value: "30", frameRate: 30 },
  { value: "60", frameRate: 60 },
  { value: "90", frameRate: 90 },
  { value: "120", frameRate: 120 },
  { value: "165", frameRate: 165 },
];

const videoCodecs = [
  {
    value: "vp9",
    labelKey: "screen_share_settings.codec_vp9",
    descriptionKey: "screen_share_settings.codec_vp9_description",
  },
  {
    value: "av1",
    labelKey: "screen_share_settings.codec_av1",
    descriptionKey: "screen_share_settings.codec_av1_description",
  },
  {
    value: "h265",
    labelKey: "screen_share_settings.codec_h265",
    descriptionKey: "screen_share_settings.codec_h265_description",
  },
  {
    value: "h264",
    labelKey: "screen_share_settings.codec_h264",
    descriptionKey: "screen_share_settings.codec_h264_description",
  },
  {
    value: "vp8",
    labelKey: "screen_share_settings.codec_vp8",
    descriptionKey: "screen_share_settings.codec_vp8_description",
  },
] as const;

function getResolutionPreset(
  configuration: ScreenShareConfiguration,
): ResolutionPreset {
  return (
    resolutionPresets.find(
      ({ width, height }) =>
        configuration.width === width && configuration.height === height,
    )?.value ?? "custom"
  );
}

function getFrameRatePreset(
  configuration: ScreenShareConfiguration,
): FrameRatePreset {
  return (
    frameRatePresets.find(
      ({ frameRate }) => configuration.frameRate === frameRate,
    )?.value ?? "custom"
  );
}

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
  const [resolutionPreset, setResolutionPreset] = useState<ResolutionPreset>(
    () => getResolutionPreset(configuration),
  );
  const [frameRatePreset, setFrameRatePreset] = useState<FrameRatePreset>(() =>
    getFrameRatePreset(configuration),
  );

  useEffect(() => setDraft(createDraft(configuration)), [configuration]);
  useEffect(
    () => setResolutionPreset(getResolutionPreset(configuration)),
    [configuration.width, configuration.height],
  );
  useEffect(
    () => setFrameRatePreset(getFrameRatePreset(configuration)),
    [configuration.frameRate],
  );

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

  const onResolutionPresetChange = (preset: ResolutionPreset): void => {
    setResolutionPreset(preset);
    if (preset === "custom") return;

    const { width, height } = resolutionPresets.find(
      ({ value }) => value === preset,
    )!;
    setConfiguration({ ...configuration, width, height });
  };

  const onFrameRatePresetChange = (preset: FrameRatePreset): void => {
    setFrameRatePreset(preset);
    if (preset === "custom") return;

    const { frameRate } = frameRatePresets.find(
      ({ value }) => value === preset,
    )!;
    setConfiguration({ ...configuration, frameRate });
  };

  const selectedCodec =
    videoCodecs.find(({ value }) => value === configuration.videoCodec) ??
    videoCodecs[0];

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
        <div className={styles.menuContent}>
          <div className={styles.status} role="status">
            <strong>{t("screen_share_settings.current")}</strong>
            <span>{statusText}</span>
          </div>
          <hr />
          <fieldset className={styles.configuration}>
            <legend>{t("screen_share_settings.requested")}</legend>
            <label className={styles.field}>
              <span>{t("screen_share_settings.resolution")}</span>
              <select
                value={resolutionPreset}
                onChange={(event) =>
                  onResolutionPresetChange(
                    event.target.value as ResolutionPreset,
                  )
                }
                onKeyDown={(event) => event.stopPropagation()}
              >
                {resolutionPresets.map(({ value, label }) => (
                  <option value={value} key={value}>
                    {value === "automatic"
                      ? t("screen_share_settings.automatic")
                      : label}
                  </option>
                ))}
                <option value="custom">
                  {t("screen_share_settings.custom")}
                </option>
              </select>
            </label>
            {resolutionPreset === "custom" && (
              <div className={styles.customGrid}>
                <label className={styles.field}>
                  <span>{t("screen_share_settings.width")}</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={draft.width}
                    onChange={(event) =>
                      setDraft({ ...draft, width: event.target.value })
                    }
                    onBlur={() => commitNumber("width")}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </label>
                <label className={styles.field}>
                  <span>{t("screen_share_settings.height")}</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={draft.height}
                    onChange={(event) =>
                      setDraft({ ...draft, height: event.target.value })
                    }
                    onBlur={() => commitNumber("height")}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </label>
              </div>
            )}
            <label className={styles.field}>
              <span>{t("screen_share_settings.frameRate")}</span>
              <select
                value={frameRatePreset}
                onChange={(event) =>
                  onFrameRatePresetChange(event.target.value as FrameRatePreset)
                }
                onKeyDown={(event) => event.stopPropagation()}
              >
                {frameRatePresets.map(({ value }) => (
                  <option value={value} key={value}>
                    {value === "automatic"
                      ? t("screen_share_settings.automatic")
                      : `${value} FPS`}
                  </option>
                ))}
                <option value="custom">
                  {t("screen_share_settings.custom")}
                </option>
              </select>
            </label>
            {frameRatePreset === "custom" && (
              <label className={styles.field}>
                <span>{t("screen_share_settings.custom_frame_rate")}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.frameRate}
                  onChange={(event) =>
                    setDraft({ ...draft, frameRate: event.target.value })
                  }
                  onBlur={() => commitNumber("frameRate")}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>
            )}
            <label className={styles.field}>
              <span>{t("screen_share_settings.maxBitrateMbps")}</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={draft.maxBitrateMbps}
                placeholder={t("screen_share_settings.automatic")}
                onChange={(event) =>
                  setDraft({ ...draft, maxBitrateMbps: event.target.value })
                }
                onBlur={() => commitNumber("maxBitrateMbps")}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
            <label className={styles.field}>
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
                {videoCodecs.map(({ value, labelKey }) => (
                  <option value={value} key={value}>
                    {t(labelKey)}
                  </option>
                ))}
              </select>
              <small className={styles.description}>
                {t(selectedCodec.descriptionKey)}
              </small>
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
        </div>
      </Menu>
    </div>
  );
};
