# Older changes
## 4.0.2 (2026-08-10)
* (@SimonFischer04) Added WindowTilt support in the widgets GUI (#609)
* (@GermanBluefox) Added min/max values (last 24 hours or today) for widgets with history (#610)
* (@GermanBluefox) Reworked the "Blue dark" theme into a deep navy look and gave the category icons a coloured round badge
* (@GermanBluefox) Added role icons for UV index, knots, rpm, operating hours and W/kW/Wh
* (@GermanBluefox) The device list now shows the icon configured for a widget, and falls back to the role icon instead of the generic type icon
* (@GermanBluefox) Info devices are no longer hidden by default; the "i" button in the toolbar now shows whether the filter is active
* (@GermanBluefox) Fixed widgets vanishing from the GUI when they were assigned to a category that no longer exists
* (@GermanBluefox) Fixed categories being dropped as empty although widgets had been moved into them
* (@GermanBluefox) Fixed the "record history" switch: it now follows the alias to the recorded source and is highlighted while recording
* (@GermanBluefox) Fixed clipped values in the wind widget
* (@GermanBluefox) Fixed emoji icons sitting off-centre in the category badges and header
* (@GermanBluefox) Fixed an alias assignment being dropped silently when saving a device whose state was not cached yet
* (@GermanBluefox) Implemented user-specific views
* (@Apollon77) Added widgets for button, buttonSensor, camera and vacuumCleaner, which were shown as "Widget type not supported" before
* (@Apollon77) Added mute and the separate volume feedback state (`VOLUME_ACTUAL`) to the media player widget
* (@Apollon77) Added the missing tilt controls to the blind widgets: tilt now works for button blinds too, has a stop button, and uses the min/max of the state instead of assuming percent
* (@Apollon77) Added an active icon for windowTilt
* (@Apollon77) The light widget now shows the real state from `ON_ACTUAL` instead of echoing the commanded value
* (@Apollon77) Fixed image widgets: the configured defaults were ignored until the settings dialog was opened once, and the refresh button was answered from the cache
* (@Apollon77) Fixed newer device types (windowTilt, camera, percentage, fillLevel, …) landing in the "other" group when auto-grouping is switched on
* (@Apollon77) Fixed the type of created alias states: `defaultType` is now honoured, so the ERROR state is no longer created as boolean
* (@Apollon77) Fixed the air conditioner editor showing the swing state twice and writing it twice on save
* (@Apollon77) Fixed the enum assignment of created devices: it ran once per state and not at all for devices with only optional states
* (@Apollon77) Fixed the build and the CI (unresolvable react-input-color dependency, out-of-sync lock files, node versions)

## 4.0.0 (2026-08-03)
* (@GermanBluefox) Added min/max values (last 24 hours or today) for widgets with history
* (@GermanBluefox) Fixed the history options (chart, trend, min/max) not being offered in the widget settings
* (@GermanBluefox) Recreate all missing instance monitoring objects, not only alive/connected
* (@GermanBluefox) Migrated to react 19 and MUI 9

## 3.0.2 (2026-06-30)
* (@GermanBluefox) Added support for widget icons

## 3.0.1 (2026-06-29)
- (ioBroker-Bot) Adapter requires js-controller >= 6.0.11 now.
- (krobipd) Reduced Safari rendering lag of the device list
- (patricknitsch) Added consumption values to the categories
- (patricknitsch) Fixed the data loss by the folder renaming

## 3.0.0 (2026-06-26)
* (@GermanBluefox) Corrected universal widget
* (@GermanBluefox) Added open-meteo-weather adapter support
* (@GermanBluefox) Read all states anew after the reconnection

## 2.1.5 (2026-05-28)
* (@GermanBluefox) Added a theme type to context

## 2.1.4 (2026-05-27)
* (@GermanBluefox) Added digits after comma for Display widget
* (@GermanBluefox) Added an installation script

## 2.1.2 (2026-05-20)
* (@GermanBluefox) Extended universal widget

## 2.1.0 (2026-05-17)
* (@GermanBluefox) Corrected dragging of widgets

## 2.0.19 (2026-05-16)
* (@GermanBluefox) Corrected icons for rooms
* (@GermanBluefox) Added 2x2 for iFrame

## 2.0.10 (2026-04-25)
* (@GermanBluefox) Working on the new GUI

## 2.0.9 (2026-04-17)
* (@GermanBluefox) Fixing runtime mode

## 2.0.8 (2026-04-13)
* (@GermanBluefox) Added presence widget

## 2.0.7 (2026-04-09)
* (@GermanBluefox) Added new widgets

## 2.0.6 (2026-03-31)
* (@GermanBluefox) Corrected the layout for visualisation

## 2.0.5 (2026-03-26)
* (@GermanBluefox) Added many new widgets.

## 2.0.3 (2026-03-24)
* (@GermanBluefox) Added widgets' visualisation. Now it is possible to create a GUI within the adapter

## 1.2.14 (2026-02-06)
* (@GermanBluefox) Correcting the scrolling on the touch devices
* (@GermanBluefox) Fixing a problem with `ACTUAL` state
* (@GermanBluefox) Correcting the hover effect under safari

## 1.2.12 (2026-02-04)
* (@GermanBluefox) Show in color if fx is not empty
* (@GermanBluefox) Added for all text fields the clear button

## 1.2.9 (2025-09-08)
* (@GermanBluefox) Created for newly created states of devices the full name and not just last part, like `ACTUAL`

## 1.2.8 (2025-07-21)
* (@GermanBluefox) Corrected error in GUI

## 1.2.7 (2025-06-14)
* (@GermanBluefox) Replaced icon for the state import
* (@GermanBluefox) Corrected the edit dialog

## 1.2.6 (2025-04-29)
* (@GermanBluefox) Type-detector updated
* (@GermanBluefox) Execute the conversion formula on the current value
* (@GermanBluefox) Better categories selector
* (@GermanBluefox) Corrected device importer

## 1.2.4 (2025-04-27)
* (@GermanBluefox) Corrected many GUI issues

## 1.2.1 (2025-04-22)
* (@GermanBluefox) Updated logo
* (@GermanBluefox) Updated type-detector

## 1.2.0 (2025-04-20)
* (@GermanBluefox) Updated packages
* (@GermanBluefox) Used vite
* (@GermanBluefox) Used eslint-config of ioBroker
* (@GermanBluefox) Rewritten to TypeScript and corrected all known bugs (Except extension requests)

## 1.1.5 (2023-06-06)
* (Garfonso) fixed: problem with editing imported states
* (Garfonso) fixed: warning
* (Garfonso) fixed: enabling iot again (without setting a custom smartName)
* (Garfonso) fixed: possible crash / typo in 1.1.3.

## 1.1.4 (2023-06-06)
* (bluefox) Updated packages

## 1.1.3 (2023-05-16)
* (bluefox) Better behavior of category selection

## 1.1.2 (2022-11-09)
* (Garfonso) corrected the double states in light devices
* (Garfonso) added CIE color type as equivalent to `rgbSingle` type

## 1.1.1 (2022-11-03)
* (bluefox) Corrected delete dialog
* (bluefox) Added ukrainian translation

## 1.1.0 (2022-09-27)
* (bluefox) Migrated GUI to v5

## 1.0.12 (2022-06-09)
* (bluefox) Allowed to work with devices behind reverse proxy
* (bluefox) Replaced the function icon

## 1.0.11 (2022-06-08)
* (bluefox) Updated some libraries

## 1.0.10 (2022-02-13)
* (bluefox) Corrected edit of folders
* (bluefox) Updated some libraries

## 1.0.9 (2021-07-11)
* (bluefox) Implement the narrow rows

## 1.0.8 (2021-07-04)
* (bluefox) Corrected creation of the devices

## 1.0.7 (2021-06-30)
* (bluefox) Corrected creation the folders

## 1.0.6 (2021-06-27)
* (bluefox) Implemented the filters

## 1.0.5 (2021-06-26)
* (bluefox) Implemented the edit of `states` parameter

## 1.0.4 (2021-06-08)
* (bluefox) Fixed some GUI errors

## 1.0.1 (2021-06-07)
* (bluefox) Added sentry

## 1.0.0 (2021-06-07)
* (bluefox) Added new devices

## 0.3.16 (2021-03-11)
* (bluefox) Fixed the error for IDs with the strange characters

## 0.3.15 (2020-12-13)
* (bluefox) Updated the select ID dialog

## 0.3.13 (2020-08-17)
* (bluefox) Fixed errors by optional states

## 0.3.12 (2020-08-16)
* (bluefox) added the vacuum cleaner

## 0.3.10 (2020-08-12)
* (bluefox) added the air conditioner

## 0.3.6 (2020-04-17)
* (Apollon77) Added Sentry error reporting for Frontend/React

## 0.3.5 (2020-04-17)
* (Apollon77) Fixed typo

## 0.3.4 (2020-03-24)
* (bluefox) Fixed error by device creation

## 0.3.2 (2020-02-09)
* (Apollon77) usage with all kinds of admin ports and reverse proxies optimized

## 0.3.1 (2020-02-09)
* (Apollon77) compatibility with Admin >4.0.0 added

## 0.2.0 (2019-12-20)
* (bluefox) Backend was removed

## 0.1.8 (2019-11-13)
* (bluefox) Allowed the clone of devices

## 0.1.7 (2019-09-15)
* (bluefox) work in progress

## 0.1.2 (2019-09-04)
* (bluefox) work in progress

## 0.1.0 (2019-08-31)
* (bluefox) initial release
