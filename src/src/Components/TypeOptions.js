import { Types } from 'iobroker.type-detector';

import { FcGoogle } from 'react-icons/fc';
import { SiAmazonalexa } from 'react-icons/si';
import { TiCogOutline as IconWorking } from 'react-icons/ti';
import { MdPermScanWifi as IconUnreach } from 'react-icons/md';
import { MdPriorityHigh as IconMaintain } from 'react-icons/md';
import { MdBatteryAlert as IconLowbat } from 'react-icons/md';
import { MdError as IconError } from 'react-icons/md';
import { MdDirections } from 'react-icons/md';
import { AiOutlineAppstoreAdd } from 'react-icons/ai';
import { BiLastPage } from 'react-icons/bi';
import {FaCompressArrowsAlt, FaRunning, FaSun} from 'react-icons/fa';
import { FaCompress } from 'react-icons/fa';
import { FaVolumeMute } from 'react-icons/fa';
import { GiLaserPrecision } from 'react-icons/gi';
import { AiOutlineRadiusBottomleft } from 'react-icons/ai';
import { AiOutlineColumnHeight } from 'react-icons/ai';
import { AiOutlineColumnWidth } from 'react-icons/ai';
import { AiOutlineSwap } from 'react-icons/ai';
import { FaToggleOn } from 'react-icons/fa';
import { FaDoorOpen } from 'react-icons/fa';
import { MdGpsFixed } from 'react-icons/md';
import { GiStopSign } from 'react-icons/gi';
import { IoIosWater } from 'react-icons/io';
import { GiNuclearWaste } from 'react-icons/gi';
import { AiFillPauseCircle } from 'react-icons/ai';
import { GiMatterStates } from 'react-icons/gi';
import { MdWork } from 'react-icons/md';
import { MdDeveloperMode } from 'react-icons/md';
import { AiOutlinePoweroff } from 'react-icons/ai';
import { SiBoost } from 'react-icons/si';
import {WiDaySunny, WiFire, WiHumidity, WiSmoke, WiThermometer} from 'react-icons/wi';
import { GiTreeSwing } from 'react-icons/gi';
import { GiSpeedometer } from 'react-icons/gi';
import WindowTilted from './icons/WindowTilted';
import MaterialIcon from './icons/Material';
import {FiPower, HiOutlineLightBulb} from "react-icons/all";

const TYPE_OPTIONS = {
    [Types.airCondition]:    { alexa: false, alisa: true,  google: false, material: false },
    [Types.blindButtons]:    { alexa: false, alisa: false, google: false, material: false },
    [Types.blind]:           { alexa: false, alisa: true,  google: true,  material: true  },
    [Types.buttonSensor]:    { alexa: false, alisa: false, google: false, material: false },
    [Types.button]:          { alexa: false, alisa: false, google: true,  material: true  },
    [Types.camera]:          { alexa: false, alisa: false, google: false, material: false },
    [Types.ct]:              { alexa: true,  alisa: true,  google: true,  material: false },
    [Types.dimmer]:          { alexa: true,  alisa: true,  google: true,  material: true  },
    [Types.door]:            { alexa: false, alisa: true,  google: true,  material: false },
    [Types.fireAlarm]:       { alexa: false, alisa: false, google: false, material: false },
    [Types.floodAlarm]:      { alexa: false, alisa: false, google: false, material: false },
    [Types.gate]:            { alexa: false, alisa: false, google: false, material: false },
    [Types.hue]:             { alexa: true,  alisa: false, google: true,  material: true  },
    [Types.humidity]:        { alexa: false, alisa: true,  google: false, material: true  },
    [Types.image]:           { alexa: false, alisa: false, google: false, material: false },
    [Types.info]:            { alexa: false, alisa: false, google: true,  material: false },
    [Types.light]:           { alexa: true,  alisa: true,  google: true,  material: false },
    [Types.location]:        { alexa: false, alisa: false, google: false, material: false },
    [Types.lock]:            { alexa: true,  alisa: true,  google: false, material: true  },
    [Types.media]:           { alexa: false, alisa: false, google: true,  material: true  },
    [Types.motion]:          { alexa: false, alisa: true,  google: false, material: false },
    [Types.rgbSingle]:       { alexa: false, alisa: true,  google: true,  material: false },
    [Types.rgb]:             { alexa: false, alisa: false, google: true,  material: true  },
    [Types.slider]:          { alexa: false, alisa: false, google: true,  material: false },
    [Types.socket]:          { alexa: true,  alisa: true,  google: true,  material: false },
    [Types.temperature]:     { alexa: false, alisa: true,  google: true,  material: true  },
    [Types.thermostat]:      { alexa: true,  alisa: true,  google: true,  material: true  },
    [Types.url]:             { alexa: false, alisa: false, google: false, material: false },
    [Types.vacuumCleaner]:   { alexa: false, alisa: true,  google: false, material: false },
    [Types.valve]:           { alexa: false, alisa: false, google: false, material: false },
    [Types.volumeGroup]:     { alexa: false, alisa: false, google: false, material: true  },
    [Types.volume]:          { alexa: false, alisa: false, google: false, material: true  },
    [Types.warning]:         { alexa: false, alisa: false, google: false, material: true  },
    [Types.weatherCurrent]:  { alexa: false, alisa: false, google: false, material: false },
    [Types.weatherForecast]: { alexa: false, alisa: false, google: false, material: true  },
    [Types.windowTilt]:      { alexa: false, alisa: false, google: true,  material: true  },
    [Types.window]:          { alexa: false, alisa: true,  google: true,  material: true  },
};

export const ICONS_TYPE = {
    alexa: <SiAmazonalexa style={{margin: '0 3px', width: 16, height: 16}} />,
    alisa: <img style={{margin: '0 3px', width: 16, height: 16}} src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMzcwcHgiIGhlaWdodD0iMzcwcHgiIHZpZXdCb3g9IjAgMCAzNzAgMzcwIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPCEtLSBHZW5lcmF0b3I6IFNrZXRjaCA0Ni4yICg0NDQ5NikgLSBodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2ggLS0+CiAgICA8dGl0bGU+R3JvdXA8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZGVmcz4KICAgICAgICA8bGluZWFyR3JhZGllbnQgeDE9IjAlIiB5MT0iMTAwJSIgeDI9IjEwMCUiIHkyPSIwJSIgaWQ9ImxpbmVhckdyYWRpZW50LTEiPgogICAgICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjQzkyNkZGIiBvZmZzZXQ9IjAlIj48L3N0b3A+CiAgICAgICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiM0QTI2RkYiIG9mZnNldD0iMTAwJSI+PC9zdG9wPgogICAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgICA8ZyBpZD0iUGFnZS0xIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0iR3JvdXAiPgogICAgICAgICAgICA8cmVjdCBpZD0iUmVjdGFuZ2xlIiBmaWxsPSIjRkZGRkZGIiB4PSI3NyIgeT0iNzIiIHdpZHRoPSIyMTUiIGhlaWdodD0iMTk5Ij48L3JlY3Q+CiAgICAgICAgICAgIDxnIGlkPSJhbGljZV9sb2dvIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGZpbGw9InVybCgjbGluZWFyR3JhZGllbnQtMSkiPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTE4NSwzNzAgQzgyLjgyNzMyMDksMzcwIDAsMjg3LjE3MjY3OCAwLDE4NSBDMCw4Mi44MjczMjA5IDgyLjgyNzMyMDksMCAxODUsMCBDMjg3LjE3MjY3OCwwIDM3MCw4Mi44MjczMjA5IDM3MCwxODUgQzM3MCwyODcuMTcyNjc4IDI4Ny4xNzI2NzgsMzcwIDE4NSwzNzAgWiBNMTAwLjI4Nzk1MiwyNDQuNzA4MjQ0IEMxMTMuNTY4OTA4LDI1Ny45MjM4NzUgMTQ4Ljk0NTcxNiwyNjUuODU5NTc3IDE4NSwyNjUuOTk4Njc3IEMyMjEuMDUzMTgzLDI2NS44NTk1NzcgMjU2LjQzMTA5MiwyNTcuOTIzODc1IDI2OS43MTIwNDgsMjQ0LjcwODI0NCBDMzAyLjcwODYwOCwyMTEuODczOTg0IDIyMi41MDAwNDQsODYuMDgwMTUgMTg1LjA0MTI3Niw4NS44OTcyMzgzIEMxNDcuNDk5OTU2LDg2LjA4MDE1IDY3LjI5MTM5MTIsMjExLjg3Mzk4NCAxMDAuMjg3OTUyLDI0NC43MDgyNDQgWiIgaWQ9ImFsaXNhLXN5bWJvbCI+PC9wYXRoPgogICAgICAgICAgICA8L2c+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=" alt="alisa"/>,
    google: <FcGoogle style={{margin: '0 3px', width: 16, height: 16}} />,
    material: <MaterialIcon style={{margin: '0 3px', width: 16, height: 16}} />,
}

export const STATES_NAME_ICONS = {
    'SET': AiOutlineAppstoreAdd,
    'WORKING': MdWork,
    'UNREACH': IconUnreach,
    'LOWBAT': IconLowbat,
    'MAINTAIN': IconMaintain,
    'ERROR': IconError,
    'DIRECTION': MdDirections,
    'CONNECTED': IconUnreach,
    'ACTUAL': IconWorking,
    'SECOND': BiLastPage,
    'PRESS_LONG': FaCompressArrowsAlt,
    'PRESS': FaCompress,
    'MUTE': FaVolumeMute,
    'ACCURACY': GiLaserPrecision,
    'RADIUS': AiOutlineRadiusBottomleft,
    'ELEVATION': AiOutlineColumnHeight,
    'LATITUDE': AiOutlineColumnWidth,
    'LONGITUDE': AiOutlineSwap,
    'GPS': MdGpsFixed,
    'ON_ACTUAL': FaToggleOn,
    'ON_SET': FaToggleOn,
    'OPEN': FaDoorOpen,
    'STOP': GiStopSign,
    'WATER_ALARM': IoIosWater,  // water
    'WASTE_ALARM': GiNuclearWaste,
    'PAUSE': AiFillPauseCircle,
    'STATE': GiMatterStates,
    'BATTERY': IconLowbat,
    'WASTE': GiNuclearWaste,
    'WATER': IoIosWater,
    'WORK_MODE': MdWork,
    'MODE': MdDeveloperMode,
    'POWER': AiOutlinePoweroff,
    'BOOST': SiBoost,
    'HUMIDITY': WiHumidity,
    'TEMPERATURE': WiThermometer,
    'BRIGHTNESS': WiDaySunny,
    'MOTION': FaRunning,
    'FIRE': WiFire,
    'WINDOW': WindowTilted,
    'SMOKE': WiSmoke,
    'SWING': GiTreeSwing,
    'SPEED': GiSpeedometer,
    'DIMMER': HiOutlineLightBulb,
    'ON': FiPower,
    'COLOR_TEMP': FaSun,
}

export default TYPE_OPTIONS;