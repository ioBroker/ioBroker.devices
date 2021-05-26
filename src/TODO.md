# General
- (bf) provide supported list in google, alexa, alisa, material,
- (bf) move icon selector into adapter-react with all possible icons
## Linked devices

## Edit folder

## Edit device dialog
<!-- - apply for opened folder
//    transform: skew(137deg, 210deg) scale(0.6) translate(5px, 5px); -->
## List of devices
- Show devices in sub-folders according to adapter. Every adapter has own folder
- Add feature: "Do not show dialog for 5 minutes" for delete dialog
<!-- - On mouse hover do some effect to see the selected line -->
## Folder control in new device dialog
<!-- - Disable add new folder if empty or name is not unique -->
## Add new device dialog
- Add to all states: SET/ACTION/POWER.... some icons //

## Set states

## Types (type-detector)
- Check all types that exist and could be created
    - url
    - gate
    - Unknown type!camera
    - Unknown type!gate
    - Unknown type!floodAlarm
    - Unknown type!weatherCurrent

## Functionality
- Do not search in parent if it is folder (only in devices/channels)

## Importer
- OPen dialog.
  - 1. User can select adapters, with some detected devices
    - 1.1 all devices of this adapter are shown in the list (only not existing in aliases)  
  - 2. User can select devices by checkbox to clone into aliases
    - 2.1 User can set room/function for devices (if not set)
    - 2.2 user can set the ID and Smart Name of device in the table 
    - Do not show devices, that exists in aliases.
    - 2.3 User can select if the devices will be cloned flat or by rooms or by functions
    - 2.4 All selected devices will be cloned into aliases.

  

