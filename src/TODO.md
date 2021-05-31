# General
- (bf) provide supported list in google, alexa, alisa, material,
- (bf) move icon selector into adapter-react with all possible icons
## Linked devices

## Edit folder

## Edit device dialog
- Edit "read and write" Σ button must be hidden if no IDs defined and read/write IDs
- Disable smart option does not work: https://github.com/ioBroker/ioBroker.devices/issues/51
- Smoke detector has wrong icon in devices
- Save does not work

## List of devices
- Add feature: "Do not show dialog for 5 minutes" for delete dialog
- Linked devices folder in opened state does not modify icon. (skew and so on)
- Move devices between folders (drag & drop)
  - Add pseudo device root by start dragging and if no devices are in root.
  - Try to detect folder for devices if mouse over the device
  - Open folder for just dropped device

## Folder control in new device dialog

## Add new device dialog
- Add to all states: SET/ACTION/POWER.... some icons //
- Remember last selected folder

## Set states
- Add possibility to extend states with own states
  - NAME, type, role, write/read, min/max, def, unit
  - Smart visibility: write is only for level. Value is read only. min/max/unit are only for type=number
  - Add state from other real state

## Types (type-detector)
- Check all types that exist and could be created
    - url
    - Unknown type!weatherCurrent -->

- Extend motion sensor with LUX
- Extend Thermostat with mode: manual, automatic, boost or party
- !Automatically convert % to lowBattery alarm (adapter must be modified!)

## Functionality
- Do not search in parent if it is folder (only in devices/channels)
## Importer
- Find icon of device (hm-rpc.1.001F9A499D118C)

  

