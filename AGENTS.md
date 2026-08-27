# Инструкции для агентов

Этот публичный репозиторий содержит кастомный Windows-клиент Element Max на базе стабильных релизов
`element-hq/element-web`. Цель форка — сохранить совместимость с используемым MatrixRTC и дать
гибко настраиваемую трансляцию экрана с ручными шириной, высотой, FPS, битрейтом, кодеком,
индикатором фактических параметров захвата и системным звуком Windows.

## Архитектура и источники истины

- `apps/web` — Element Web, который встраивает Element Call как статический widget.
- `apps/desktop` — Electron-оболочка. Захват Windows loopback принадлежит этому слою; не переносить его
  в web-клиент и не подменять виртуальными аудиоустройствами.
- `vendor/element-call` — отслеживаемое `git subtree` совместимой версии Element Call.
- `vendor/element-call/src/state/ScreenShareSettings.ts` — единственный владелец сохраняемой конфигурации
  захвата и публикации экрана. Не дублировать constraints и publish options в view model.
- `vendor/element-call/src/components/ScreenShareButton.tsx` — UI ручных настроек и фактического статуса
  захвата. `LocalMember.ts` только применяет конфигурацию и публикует фактические track settings.
- `vendor/matrix-js-sdk` — отслеживаемое `git subtree` точного Matrix JS SDK commit, зафиксированного
  совместимым Element Call. Он собирается до Element Call и подключается к нему через локальную `link:`
  dependency, чтобы git dependency не запускала невоспроизводимый package lifecycle.
- `apps/desktop/element.max` — единственный build/runtime variant Element Max. В нём отдельные app ID,
  protocol, product name и собственный update feed, поэтому официальный Element не перезаписывает форк,
  а Element Max использует отдельный профиль и обновляется только из `AriesAlex/element-max`.
- `apps/desktop/src/displayMediaCallback.ts` — единственный владелец правила добавления Windows
  `audio: "loopback"`; Electron main process только применяет его к фактическому display-media request.
- `UPDATING.md` — источник истины по базовым upstream-тегам и процедуре обновления.

Element Call сначала собирается из `vendor/element-call`, затем `apps/web` получает его через локальную
`link:` dependency. Не возвращай опубликованный npm-пакет и не копируй собранные bundles вручную в
репозиторий. Версию Element Call нельзя повышать отдельно только потому, что вышел новый релиз: сначала
проверь widget API, MatrixRTC transport discovery и реальную совместимость с homeserver.

## Обновление из upstream

- `origin` — публичный `AriesAlex/element-max`.
- `upstream` — `https://github.com/element-hq/element-web.git`.
- `element-call-upstream` — `https://github.com/element-hq/element-call.git`.
- `matrix-js-sdk-upstream` — `https://github.com/matrix-org/matrix-js-sdk.git`.
- Стабильный Element вливай в `main` явным merge-коммитом по `UPDATING.md`. Rebase на upstream и force
  push запрещены: история форка и каждого обновления должна оставаться аудируемой.
- Element Call обновляй только совместимым стабильным тегом через `git subtree pull --squash`. После
  merge заново встраивай небольшой quality patch в актуальную upstream-архитектуру; не сохраняй старый
  код как wrapper, fallback или параллельную реализацию.
- После успешного обновления меняй записанные в `UPDATING.md` базовые теги и commits.

## Проверка и сборка

Используются Node.js 24; корневой Element фиксирует pnpm 11.20.0, Element Call — 11.6.0, а его точный
Matrix JS SDK — 11.2.2. Не заменяй эти версии одной глобальной. Базовая последовательность:

```powershell
Push-Location vendor/matrix-js-sdk
corepack pnpm@11.2.2 install --frozen-lockfile --ignore-scripts
corepack pnpm@11.2.2 build:compile
corepack pnpm@11.2.2 build:types
Pop-Location
Push-Location vendor/element-call
corepack pnpm@11.6.0 install --frozen-lockfile
corepack pnpm@11.6.0 build:full --config vite-embedded.config.js
corepack pnpm@11.6.0 test:unit --run src/state/ScreenShareSettings.test.ts src/components/ScreenShareButton.test.tsx src/state/CallViewModel/localMember/LocalMember.test.ts
Pop-Location
corepack pnpm@11.20.0 install --frozen-lockfile
corepack pnpm@11.20.0 --dir apps/desktop test:unit --run src/displayMediaCallback.test.ts src/ipc.test.ts
corepack pnpm@11.20.0 --dir apps/desktop lint:types:src
Copy-Item apps/desktop/element.max/config.json apps/web/config.json
corepack pnpm@11.20.0 --filter element-web build
```

Matrix JS SDK устанавливается без lifecycle-скриптов, затем compile и types запускаются явно ровно один
раз под pnpm 11.2.2. Иначе его `prepare` вызывает голый `pnpm` и может подхватить корневую версию 11.20.0.
`build:full --config vite-embedded.config.js` пишет готовый локальный пакет напрямую в
`vendor/element-call/embedded/web/dist` и не запускает вложенный `pnpm` неправильной корневой версии.
Полный upstream desktop suite сейчас содержит Windows-неспецифичные ожидания Unix-разделителей путей,
поэтому для этого patch запускаются два затронутых desktop test-файла и проверка типов.
Нативной Windows-сборке нужны MSVC x64 environment, Rust target `x86_64-pc-windows-msvc`, native Windows
Perl, Tcl и NASM. Локальный release-скрипт сам входит в установленный Visual Studio DevShell и проверяет
инструменты; ручной Windows workflow устанавливает недостающие Tcl и NASM. Не подменяй MSVC `link.exe`
одноимённым Unix tool из Git `usr/bin`.

- После изменений screen share обязательно проверь произвольные ручные запросы, включая 3840×2160@120
  и 2560×1440@165, пустые автоматические значения, выбранные кодек и битрейт, а также фактические
  resolution/FPS/audio из media track. Фиксированного пресета разрешения или FPS у форка нет: начальные
  значения редактируются без встроенного верхнего ограничения. Для Windows отдельная audio track должна
  содержать системный звук без голоса самого Element.
- Electron должен оставаться не ниже версии, где исправлено применение `restrictOwnAudio` к display
  media. При обновлении Electron повторно проверяй loopback и отсутствие эха звонка.
- Штатный релиз собирается локально на Windows командой `./scripts/release-element-max.ps1` только из
  чистого и уже отправленного `main`. Скрипт полностью пересобирает зависимости, webapp, native-модули и
  x64 Squirrel package, проверяет `RELEASES`, обновляет rolling prerelease `element-max-latest` и запускает
  лёгкий Pages deployment. В release должны оставаться только `Element-Max-Setup.exe`, `RELEASES` и один
  `*-full.nupkg`; отдельные SHA/checksum-assets запрещены.
- `.github/workflows/build-element-max-windows.yaml` — только ручной запасной путь через
  `workflow_dispatch`; не добавляй запуск по push, merge, tag или расписанию. Обычные commits и merge в
  `main` не должны запускать тяжёлую Windows-сборку на GitHub.
- `.github/workflows/deploy-element-max-pages.yaml` не компилирует приложение: он вручную или после
  ручной fallback-сборки скачивает готовый Squirrel feed из rolling release, удаляет прежние
  `github-pages` artifacts и публикует landing/feed с retention один день.
- Локальные `apps/web/config.json`, `webapp`, `dist`, `node_modules` и прочие результаты сборки не
  коммить. Временные исследовательские файлы держи вне репозитория.

## Качество и устойчивые правила

- Главный приоритет — чистый, простой, сильный итоговый код в контексте всей кодовой базы. Минимальность
  означает отсутствие лишнего кода, состояния, абстракций и неверного слоя владения, а не минимальное
  число строк patch.
- Перед решением проверяй реальный код, data flow, runtime-поведение, зависимости, тесты и сборку. Не
  выводи архитектуру из названий и не додумывай неизвестный контракт.
- У каждого правила должен быть один владелец. Переиспользуй существующие точки расширения, helper-ы и
  workflow; не добавляй параллельный слой.
- Не добавляй предположительные fallback, compatibility-ветки, wrappers или runtime-проверки «на всякий
  случай». Если после исследования контракт остаётся неоднозначным, спроси пользователя.
- Сохраняй unrelated dirty work. Не удаляй, не откатывай, не stage и не включай в delivery чужие
  изменения.
- После каждого изменения пересматривай полный diff: удаляй неиспользуемые импорты, методы, файлы,
  временные обёртки и следы промежуточной гипотезы; проверяй границы владения и возможность упростить
  итог без потери ясности.
- «"Работает" недостаточно. После того как довел до рабочего состояния, убедись, что решение встроено
  в код красиво и без временных подпорок. Если по пути пришлось оставить костыль или фоллбэк, потом
  обязательно добейся его удаления, даже если для этого надо явно попросить пользователя сделать
  связанное изменение.»
- Если пользователь в ходе работы даёт новые устойчивые правила по стилю кода, структуре или процессу,
  то их надо кратко и по делу сразу добавлять в этот файл `AGENTS.md`, если это реально полезно будущим
  агентам.
- Правила в `AGENTS.md` добавлять только если пользователь явно просит сохранить что-то универсальное
  и долговременное; не заносить туда ситуативные договорённости текущей задачи.

## Git, приватность и секреты

- Перед commit проверь `git status --short` и полный diff. Не включай generated или unrelated файлы.
- Репозиторий публичный. Не коммить и не пушить `.env`, credentials, signing material, токены, приватные
  ключи и другие секреты.
- Никогда не печатай значения секретов в логах, diff, ответах, issues, pull requests или комментариях.
