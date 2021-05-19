# General
<!-- - All buttons are contained -->
- Do not forget autoFocus (only one element may be focused on dialog)
- Dialogs must act by ENTER
<!-- - Scroll of devices: header must be always on top -->
<!-- - Show only aliases by default is ON. -->
- Clone of device

## Edit folder
<!-- - scroll if content is too high -->
## Edit device dialog
<!-- - Alias can be an object {read: "ID1", write: "ID2"} 
  Edit dialog must support it -->

## List of devices
<!-- - Remove all other view types except ID (just comment it, do not delete yet) -->
<!-- - Make font for name a bit bigger -->
- Make ID italic in the list
<!-- - Translate device type -->
<!-- - Add to device type the icon -->
- Where is 00091BE99106CB.1 in ID view
<!-- - Why some devices are double in name view -->
<!-- - use Icon for device icon (very first icon in the row) -->

## Folder control in new device dialog
<!-- - Add expand/collapse all folder icons -->
- By creation of new folder process on ENTER event

## Add new device dialog
- Add Alexa/Google/Alisa/Material icons for every type of device by drop down menu
<!-- - Remove "instance" from drop down menu -->
- Add to all states: SET/ACTION/POWER.... some icons
## Set states
- Add tooltip by label: 
    - Type: boolean
    - Write: true
    - Role: switch power

- Add header: Indicators
- Use normal translated names for types: e.g. vacuumCleaner => Робот-пылесос, light => Свет

## Types (type-detector)
- Check all types that exist and could be created
    - url
    - gate
    - ...

## Functionality
- Do not search in parent if it is folder (only in devices/channels)
- 


