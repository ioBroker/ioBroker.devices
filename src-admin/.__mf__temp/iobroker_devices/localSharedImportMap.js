
// Windows temporarily needs this file, https://github.com/module-federation/vite/issues/68

    import {loadShare} from "@module-federation/runtime";
    const importMap = {
      
        "@emotion/react": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_emotion_mf_1_react__prebuild__.js");
            return pkg;
        }
      ,
        "@emotion/styled": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_emotion_mf_1_styled__prebuild__.js");
            return pkg;
        }
      ,
        "@iobroker/adapter-react-v5": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_iobroker_mf_1_adapter_mf_2_react_mf_2_v5__prebuild__.js");
            return pkg;
        }
      ,
        "@iobroker/dm-widgets": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_iobroker_mf_1_dm_mf_2_widgets__prebuild__.js");
            return pkg;
        }
      ,
        "@iobroker/type-detector": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_iobroker_mf_1_type_mf_2_detector__prebuild__.js");
            return pkg;
        }
      ,
        "@mui/icons-material": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_mui_mf_1_icons_mf_2_material__prebuild__.js");
            return pkg;
        }
      ,
        "@mui/material": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_mui_mf_1_material__prebuild__.js");
            return pkg;
        }
      ,
        "@sentry/browser": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild___mf_0_sentry_mf_1_browser__prebuild__.js");
            return pkg;
        }
      ,
        "leaflet": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild__leaflet__prebuild__.js");
            return pkg;
        }
      ,
        "moment": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild__moment__prebuild__.js");
            return pkg;
        }
      ,
        "react": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild__react__prebuild__.js");
            return pkg;
        }
      ,
        "react-color": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild__react_mf_2_color__prebuild__.js");
            return pkg;
        }
      ,
        "react-dom": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild__react_mf_2_dom__prebuild__.js");
            return pkg;
        }
      ,
        "react-input-color": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild__react_mf_2_input_mf_2_color__prebuild__.js");
            return pkg;
        }
      ,
        "suncalc2": async () => {
          let pkg = await import("__mf__virtual/iobroker_devices__prebuild__suncalc2__prebuild__.js");
            return pkg;
        }
      
    }
      const usedShared = {
      
          "@emotion/react": {
            name: "@emotion/react",
            version: "11.14.0",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@emotion/react"}' must be provided by host`);
              }
              usedShared["@emotion/react"].loaded = true
              const {"@emotion/react": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@emotion/react" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "@emotion/styled": {
            name: "@emotion/styled",
            version: "11.14.1",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@emotion/styled"}' must be provided by host`);
              }
              usedShared["@emotion/styled"].loaded = true
              const {"@emotion/styled": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@emotion/styled" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "@iobroker/adapter-react-v5": {
            name: "@iobroker/adapter-react-v5",
            version: "8.1.6",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@iobroker/adapter-react-v5"}' must be provided by host`);
              }
              usedShared["@iobroker/adapter-react-v5"].loaded = true
              const {"@iobroker/adapter-react-v5": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@iobroker/adapter-react-v5" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "@iobroker/dm-widgets": {
            name: "@iobroker/dm-widgets",
            version: "0.1.10",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@iobroker/dm-widgets"}' must be provided by host`);
              }
              usedShared["@iobroker/dm-widgets"].loaded = true
              const {"@iobroker/dm-widgets": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@iobroker/dm-widgets" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "@iobroker/type-detector": {
            name: "@iobroker/type-detector",
            version: "5.0.11",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@iobroker/type-detector"}' must be provided by host`);
              }
              usedShared["@iobroker/type-detector"].loaded = true
              const {"@iobroker/type-detector": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@iobroker/type-detector" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "@mui/icons-material": {
            name: "@mui/icons-material",
            version: "6.5.0",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@mui/icons-material"}' must be provided by host`);
              }
              usedShared["@mui/icons-material"].loaded = true
              const {"@mui/icons-material": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@mui/icons-material" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "@mui/material": {
            name: "@mui/material",
            version: "6.5.0",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@mui/material"}' must be provided by host`);
              }
              usedShared["@mui/material"].loaded = true
              const {"@mui/material": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@mui/material" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "@sentry/browser": {
            name: "@sentry/browser",
            version: "10.46.0",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"@sentry/browser"}' must be provided by host`);
              }
              usedShared["@sentry/browser"].loaded = true
              const {"@sentry/browser": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "@sentry/browser" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "leaflet": {
            name: "leaflet",
            version: "1.9.4",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"leaflet"}' must be provided by host`);
              }
              usedShared["leaflet"].loaded = true
              const {"leaflet": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "leaflet" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "moment": {
            name: "moment",
            version: "2.30.1",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"moment"}' must be provided by host`);
              }
              usedShared["moment"].loaded = true
              const {"moment": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "moment" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "react": {
            name: "react",
            version: "18.3.1",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"react"}' must be provided by host`);
              }
              usedShared["react"].loaded = true
              const {"react": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "react" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "react-color": {
            name: "react-color",
            version: "2.19.3",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"react-color"}' must be provided by host`);
              }
              usedShared["react-color"].loaded = true
              const {"react-color": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "react-color" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "react-dom": {
            name: "react-dom",
            version: "18.3.1",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"react-dom"}' must be provided by host`);
              }
              usedShared["react-dom"].loaded = true
              const {"react-dom": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "react-dom" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "react-input-color": {
            name: "react-input-color",
            version: "4.0.1",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"react-input-color"}' must be provided by host`);
              }
              usedShared["react-input-color"].loaded = true
              const {"react-input-color": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "react-input-color" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        ,
          "suncalc2": {
            name: "suncalc2",
            version: "1.8.1",
            scope: ["default"],
            loaded: false,
            from: "iobroker_devices",
            async get () {
              if (false) {
                throw new Error(`[Module Federation] Shared module '${"suncalc2"}' must be provided by host`);
              }
              usedShared["suncalc2"].loaded = true
              const {"suncalc2": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = false && "suncalc2" === "react"
                ? (res?.default ?? res)
                : {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "*",
              
            }
          }
        
    }
      const usedRemotes = [
      ]
      export {
        usedShared,
        usedRemotes
      }
      