# General
- (bf) provide supported list in google, alexa, alisa, material,
- (bf) move icon selector into adapter-react with all possible icons
## Linked devices

## Edit folder
- Support of edit folder => Rename all sub-items too
  - Check that new name is free
## Edit device dialog
- Support of rename ID (use name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_') )
  - only for alias and for linkeddevices

## List of devices
- Show devices in sub-folders according to adapter. Every adapter has own folder
- Clone must take name, icon and color (especially icon)

## Folder control in new device dialog
- Select automatically new created folder
  - Open all folders so that new created folder is visible

## Add new device dialog
- Add to all states: SET/ACTION/POWER.... some icons //
- By Clone of not alias/linkeddevicessave in native.originalId the source

## Set states

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
    - Do not show devices, that exists in aliases.
    - 2.3 User can select if the devices will be cloned flat or by rooms or by functions
    - 2.4 All selected devices will be cloned into aliases.

  

