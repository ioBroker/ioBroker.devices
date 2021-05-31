# General
- (bf) provide supported list in google, alexa, alisa, material,
- (bf) move icon selector into adapter-react with all possible icons
## Linked devices

## Edit folder

## Edit device dialog
- Edit "read and write" Σ button must be always visible 
- Disable smart option does not work: https://github.com/ioBroker/ioBroker.devices/issues/51
- Smoke detector has wrong icon in devices

## List of devices
<!-- - Show devices in sub-folders according to adapter. Every adapter has own folder -->
<!-- - Add feature: "Do not show dialog for 5 minutes" for delete dialog -->
<!-- - Do not show id for "linked devices folder", "automatically detected" and instances in autodetected -->
- Linked devices folder in opened state does not modify icon. (skew and so on)
- Move devices between folders (drag & drop)

## Folder control in new device dialog
- Disable add new folder if name is not unique

## Add new device dialog
- Add to all states: SET/ACTION/POWER.... some icons //
- Remember last selected folder

## Set states
- Add possibility to extend states with own states
  - NAME, type, role, write/read, min/max, def,

## Types (type-detector)
- Check all types that exist and could be created
    - url
    <!-- - gate -->
    <!-- - Unknown type!camera -->
    <!-- - Unknown type!gate -->
    <!-- - Unknown type!floodAlarm
    - Unknown type!weatherCurrent -->

- Extend motion sensor with LUX
- Extend Thermostat with mode: manual, automatic, boost or party
- Automatically convert % to lowBattery alarm

## Functionality
- Do not search in parent if it is folder (only in devices/channels)

## Importer
<!-- - Find icon of device: https://github.com/ioBroker/ioBroker.admin/blob/master/src-rx/src/components/Enums/EnumBlock.js#L178 -->

  

