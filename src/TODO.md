# General
- Do not forget autoFocus (only one element may be focused on dialog)

## Linked devices
  - use icon "link"
  - Change color of add button

## Edit folder
- Support of edit folder => Rename all sub-items too
## Edit device dialog
- Support of rename ID (use name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_') ) 

## List of devices
- Show devices in sub-folders according to adapter. Every adapter has own folder

## Folder control in new device dialog
- Select automatically new created folder

## Add new device dialog
- Add to all states: SET/ACTION/POWER.... some icons //

## Set states
- Make helpers for TextField(only states ) opacity 0.2

## Types (type-detector)
- Check all types that exist and could be created
    - url
    - gate
    - ...

## Functionality
- Do not search in parent if it is folder (only in devices/channels)

## Importer
- OPen dialog.
  - 1. User can select adapters, with some detected devices
    - 1.1 all devices of this adapter are shown in the list (only not existing in aliases)  
  - 2. User can select devices by checkbox to clone into aliases
    - 2.1 User can set room/function for devices (if not set)
    - 2.2 user can set the ID and Smart Name of device in the table 
    - 2.3 User can select if the devices will be cloned flat or by rooms or by functions
    - 2.4 All selected devices will be cloned into aliases.
  

