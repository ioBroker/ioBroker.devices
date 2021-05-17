# General
- All buttons are contained
- Do not forget autoFocus (only one element may be focused on dialog)
- Dialogs must act by ENTER
- Scroll of devices: header must be always on top
- Show only aliases by default is ON.
## Edit device dialog
- if name in english does not exist => do not show "undefined"
- Alias can be an object {read: "ID1", write: "ID2"} 
  Edit dialog must support it

## List of devices
- Show devices in form of folders in ID mode
- Better visualisation of folders in non ID mode
- Remove all other view types except ID (just comment it, do not delete yet)
- Make font for name a bit bigger
- Make ID italic in the list
- use special controls for room/function
- Use Icon control for Rooms/Functions icons in dialog
- Translate device type
- Add to device type the icon
- Where is 00091BE99106CB.1 in ID view
- Why some devices are double in name view
- Edit folders (icon, color, name) and delete (only empty one)
- Remove root
- Add folder "Automatically detected" and do not allow creation of the folder with same name

## Folder control in new device dialog
- Create new folder selector and creator like javascript
- Change icon for create new device
- Add expand/collapse all folder icons
- By creation of new folder process on ENTER event
- minHeight of folder control is equal with fields on the right

## Add new device dialog
- Use special controls for rooms/functions
- Add Alexa/Google/Alisa/Material icons for every type of device by drop down menu
- Remove "instance" from drop down menu
- Better layout: use full width for text inputs
- Drop down menu for types: icons have strange size
- States => Definition of states and providing of IDs
- General: color, name, icon and so on
- use new IconSelector control from Admin
- Add to all states: SET/ACTION/POWER.... some icons

## Set states
- Add tooltip by label: 
    - Type: boolean
    - Write: true
    - Role: switch power

- Add header: Indicators
- Use normal translated names for types: e.g. vacuumCleaner => Робот-пылесос, light => Свет

## Types
- Check all types that they exist and could be created

## Functionality
- Do not search in parent if it is folder (only in devices/channels)
- 


