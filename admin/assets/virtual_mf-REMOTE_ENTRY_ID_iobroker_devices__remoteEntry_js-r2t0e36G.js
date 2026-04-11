const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./localSharedImportMap-Dfz8GRNG.js","./preload-helper-e_IRvegh.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from "./preload-helper-e_IRvegh.js";
var dist$3 = {};
var utils$2 = {};
var dist$2 = {};
var logger$3 = {};
var dist$1 = {};
var constant$1 = {};
const FederationModuleManifest = "federation-manifest.json";
const MANIFEST_EXT = ".json";
const BROWSER_LOG_KEY = "FEDERATION_DEBUG";
const NameTransformSymbol = {
  AT: "@",
  HYPHEN: "-",
  SLASH: "/"
};
const NameTransformMap = {
  [NameTransformSymbol.AT]: "scope_",
  [NameTransformSymbol.HYPHEN]: "_",
  [NameTransformSymbol.SLASH]: "__"
};
const EncodedNameTransformMap = {
  [NameTransformMap[NameTransformSymbol.AT]]: NameTransformSymbol.AT,
  [NameTransformMap[NameTransformSymbol.HYPHEN]]: NameTransformSymbol.HYPHEN,
  [NameTransformMap[NameTransformSymbol.SLASH]]: NameTransformSymbol.SLASH
};
const SEPARATOR = ":";
const ManifestFileName = "mf-manifest.json";
const StatsFileName = "mf-stats.json";
const MFModuleType = {
  NPM: "npm",
  APP: "app"
};
const MODULE_DEVTOOL_IDENTIFIER = "__MF_DEVTOOLS_MODULE_INFO__";
const ENCODE_NAME_PREFIX = "ENCODE_NAME_PREFIX";
const TEMP_DIR = ".federation";
const MFPrefetchCommon = {
  identifier: "MFDataPrefetch",
  globalKey: "__PREFETCH__",
  library: "mf-data-prefetch",
  exportsKey: "__PREFETCH_EXPORTS__",
  fileName: "bootstrap.js"
};
let TreeShakingStatus = /* @__PURE__ */ (function(TreeShakingStatus2) {
  TreeShakingStatus2[TreeShakingStatus2["UNKNOWN"] = 1] = "UNKNOWN";
  TreeShakingStatus2[TreeShakingStatus2["CALCULATED"] = 2] = "CALCULATED";
  TreeShakingStatus2[TreeShakingStatus2["NO_USE"] = 0] = "NO_USE";
  return TreeShakingStatus2;
})({});
constant$1.BROWSER_LOG_KEY = BROWSER_LOG_KEY;
constant$1.ENCODE_NAME_PREFIX = ENCODE_NAME_PREFIX;
constant$1.EncodedNameTransformMap = EncodedNameTransformMap;
constant$1.FederationModuleManifest = FederationModuleManifest;
constant$1.MANIFEST_EXT = MANIFEST_EXT;
constant$1.MFModuleType = MFModuleType;
constant$1.MFPrefetchCommon = MFPrefetchCommon;
constant$1.MODULE_DEVTOOL_IDENTIFIER = MODULE_DEVTOOL_IDENTIFIER;
constant$1.ManifestFileName = ManifestFileName;
constant$1.NameTransformMap = NameTransformMap;
constant$1.NameTransformSymbol = NameTransformSymbol;
constant$1.SEPARATOR = SEPARATOR;
constant$1.StatsFileName = StatsFileName;
constant$1.TEMP_DIR = TEMP_DIR;
constant$1.TreeShakingStatus = TreeShakingStatus;
var ContainerPlugin = {};
var runtime$1 = {};
var __defProp$1 = Object.defineProperty;
var __exportAll$1 = (all, no_symbols) => {
  let target = {};
  for (var name in all) {
    __defProp$1(target, name, {
      get: all[name],
      enumerable: true
    });
  }
  if (!no_symbols) {
    __defProp$1(target, Symbol.toStringTag, { value: "Module" });
  }
  return target;
};
runtime$1.__exportAll = __exportAll$1;
(function(exports$1) {
  const require_runtime = runtime$1;
  var ContainerPlugin_exports = /* @__PURE__ */ require_runtime.__exportAll({});
  Object.defineProperty(exports$1, "ContainerPlugin_exports", {
    enumerable: true,
    get: function() {
      return ContainerPlugin_exports;
    }
  });
})(ContainerPlugin);
var ContainerReferencePlugin = {};
(function(exports$1) {
  const require_runtime = runtime$1;
  var ContainerReferencePlugin_exports = /* @__PURE__ */ require_runtime.__exportAll({});
  Object.defineProperty(exports$1, "ContainerReferencePlugin_exports", {
    enumerable: true,
    get: function() {
      return ContainerReferencePlugin_exports;
    }
  });
})(ContainerReferencePlugin);
var ModuleFederationPlugin = {};
(function(exports$1) {
  const require_runtime = runtime$1;
  var ModuleFederationPlugin_exports = /* @__PURE__ */ require_runtime.__exportAll({});
  Object.defineProperty(exports$1, "ModuleFederationPlugin_exports", {
    enumerable: true,
    get: function() {
      return ModuleFederationPlugin_exports;
    }
  });
})(ModuleFederationPlugin);
var SharePlugin = {};
(function(exports$1) {
  const require_runtime = runtime$1;
  var SharePlugin_exports = /* @__PURE__ */ require_runtime.__exportAll({});
  Object.defineProperty(exports$1, "SharePlugin_exports", {
    enumerable: true,
    get: function() {
      return SharePlugin_exports;
    }
  });
})(SharePlugin);
var ConsumeSharedPlugin = {};
(function(exports$1) {
  const require_runtime = runtime$1;
  var ConsumeSharedPlugin_exports = /* @__PURE__ */ require_runtime.__exportAll({});
  Object.defineProperty(exports$1, "ConsumeSharedPlugin_exports", {
    enumerable: true,
    get: function() {
      return ConsumeSharedPlugin_exports;
    }
  });
})(ConsumeSharedPlugin);
var ProvideSharedPlugin = {};
(function(exports$1) {
  const require_runtime = runtime$1;
  var ProvideSharedPlugin_exports = /* @__PURE__ */ require_runtime.__exportAll({});
  Object.defineProperty(exports$1, "ProvideSharedPlugin_exports", {
    enumerable: true,
    get: function() {
      return ProvideSharedPlugin_exports;
    }
  });
})(ProvideSharedPlugin);
var env$1 = {};
var define_process_env_default = {};
const require_constant$7 = constant$1;
const isBrowserEnvValue = true;
function isBrowserEnv() {
  return isBrowserEnvValue;
}
function isReactNativeEnv() {
  return typeof navigator !== "undefined" && (navigator == null ? void 0 : navigator.product) === "ReactNative";
}
function isBrowserDebug() {
  try {
    if (isBrowserEnv() && window.localStorage) return Boolean(localStorage.getItem(require_constant$7.BROWSER_LOG_KEY));
  } catch (error2) {
    return false;
  }
  return false;
}
function isDebugMode() {
  if (typeof process !== "undefined" && define_process_env_default && define_process_env_default["FEDERATION_DEBUG"]) return Boolean(define_process_env_default["FEDERATION_DEBUG"]);
  if (typeof FEDERATION_DEBUG !== "undefined" && Boolean(FEDERATION_DEBUG)) return true;
  return isBrowserDebug();
}
const getProcessEnv = function() {
  return typeof process !== "undefined" && define_process_env_default ? define_process_env_default : {};
};
env$1.getProcessEnv = getProcessEnv;
env$1.isBrowserEnv = isBrowserEnv;
env$1.isBrowserEnvValue = isBrowserEnvValue;
env$1.isDebugMode = isDebugMode;
env$1.isReactNativeEnv = isReactNativeEnv;
var utils$1 = {};
const require_constant$6 = constant$1;
const require_env$2 = env$1;
const LOG_CATEGORY$1 = "[ Federation Runtime ]";
const parseEntry = (str, devVerOrUrl, separator = require_constant$6.SEPARATOR) => {
  const strSplit = str.split(separator);
  const devVersionOrUrl = require_env$2.getProcessEnv()["NODE_ENV"] === "development" && devVerOrUrl;
  const defaultVersion = "*";
  const isEntry = (s) => s.startsWith("http") || s.includes(require_constant$6.MANIFEST_EXT);
  if (strSplit.length >= 2) {
    let [name, ...versionOrEntryArr] = strSplit;
    if (str.startsWith(separator)) {
      name = strSplit.slice(0, 2).join(separator);
      versionOrEntryArr = [devVersionOrUrl || strSplit.slice(2).join(separator)];
    }
    let versionOrEntry = devVersionOrUrl || versionOrEntryArr.join(separator);
    if (isEntry(versionOrEntry)) return {
      name,
      entry: versionOrEntry
    };
    else return {
      name,
      version: versionOrEntry || defaultVersion
    };
  } else if (strSplit.length === 1) {
    const [name] = strSplit;
    if (devVersionOrUrl && isEntry(devVersionOrUrl)) return {
      name,
      entry: devVersionOrUrl
    };
    return {
      name,
      version: devVersionOrUrl || defaultVersion
    };
  } else throw `Invalid entry value: ${str}`;
};
const composeKeyWithSeparator = function(...args) {
  if (!args.length) return "";
  return args.reduce((sum, cur) => {
    if (!cur) return sum;
    if (!sum) return cur;
    return `${sum}${require_constant$6.SEPARATOR}${cur}`;
  }, "");
};
const encodeName = function(name, prefix = "", withExt = false) {
  try {
    const ext = withExt ? ".js" : "";
    return `${prefix}${name.replace(new RegExp(`${require_constant$6.NameTransformSymbol.AT}`, "g"), require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.AT]).replace(new RegExp(`${require_constant$6.NameTransformSymbol.HYPHEN}`, "g"), require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.HYPHEN]).replace(new RegExp(`${require_constant$6.NameTransformSymbol.SLASH}`, "g"), require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.SLASH])}${ext}`;
  } catch (err) {
    throw err;
  }
};
const decodeName = function(name, prefix, withExt) {
  try {
    let decodedName = name;
    if (prefix) {
      if (!decodedName.startsWith(prefix)) return decodedName;
      decodedName = decodedName.replace(new RegExp(prefix, "g"), "");
    }
    decodedName = decodedName.replace(new RegExp(`${require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.AT]}`, "g"), require_constant$6.EncodedNameTransformMap[require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.AT]]).replace(new RegExp(`${require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.SLASH]}`, "g"), require_constant$6.EncodedNameTransformMap[require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.SLASH]]).replace(new RegExp(`${require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.HYPHEN]}`, "g"), require_constant$6.EncodedNameTransformMap[require_constant$6.NameTransformMap[require_constant$6.NameTransformSymbol.HYPHEN]]);
    if (withExt) decodedName = decodedName.replace(".js", "");
    return decodedName;
  } catch (err) {
    throw err;
  }
};
const generateExposeFilename = (exposeName, withExt) => {
  if (!exposeName) return "";
  let expose = exposeName;
  if (expose === ".") expose = "default_export";
  if (expose.startsWith("./")) expose = expose.replace("./", "");
  return encodeName(expose, "__federation_expose_", withExt);
};
const generateShareFilename = (pkgName, withExt) => {
  if (!pkgName) return "";
  return encodeName(pkgName, "__federation_shared_", withExt);
};
const getResourceUrl = (module, sourceUrl) => {
  if ("getPublicPath" in module) {
    let publicPath;
    if (!module.getPublicPath.startsWith("function")) publicPath = new Function(module.getPublicPath)();
    else publicPath = new Function("return " + module.getPublicPath)()();
    return `${publicPath}${sourceUrl}`;
  } else if ("publicPath" in module) {
    if (!require_env$2.isBrowserEnv() && !require_env$2.isReactNativeEnv() && "ssrPublicPath" in module && typeof module.ssrPublicPath === "string") return `${module.ssrPublicPath}${sourceUrl}`;
    return `${module.publicPath}${sourceUrl}`;
  } else {
    console.warn("Cannot get resource URL. If in debug mode, please ignore.", module, sourceUrl);
    return "";
  }
};
const assert$1 = (condition, msg) => {
  if (!condition) error$1(msg);
};
const error$1 = (msg) => {
  throw new Error(`${LOG_CATEGORY$1}: ${msg}`);
};
const warn$1 = (msg) => {
  console.warn(`${LOG_CATEGORY$1}: ${msg}`);
};
function safeToString(info) {
  try {
    return JSON.stringify(info, null, 2);
  } catch (e) {
    return "";
  }
}
const VERSION_PATTERN_REGEXP = /^([\d^=v<>~]|[*xX]$)/;
function isRequiredVersion(str) {
  return VERSION_PATTERN_REGEXP.test(str);
}
utils$1.assert = assert$1;
utils$1.composeKeyWithSeparator = composeKeyWithSeparator;
utils$1.decodeName = decodeName;
utils$1.encodeName = encodeName;
utils$1.error = error$1;
utils$1.generateExposeFilename = generateExposeFilename;
utils$1.generateShareFilename = generateShareFilename;
utils$1.getResourceUrl = getResourceUrl;
utils$1.isRequiredVersion = isRequiredVersion;
utils$1.parseEntry = parseEntry;
utils$1.safeToString = safeToString;
utils$1.warn = warn$1;
var generateSnapshotFromManifest$1 = {};
const require_constant$5 = constant$1;
const simpleJoinRemoteEntry = (rPath, rName) => {
  if (!rPath) return rName;
  const transformPath = (str) => {
    if (str === ".") return "";
    if (str.startsWith("./")) return str.replace("./", "");
    if (str.startsWith("/")) {
      const strWithoutSlash = str.slice(1);
      if (strWithoutSlash.endsWith("/")) return strWithoutSlash.slice(0, -1);
      return strWithoutSlash;
    }
    return str;
  };
  const transformedPath = transformPath(rPath);
  if (!transformedPath) return rName;
  if (transformedPath.endsWith("/")) return `${transformedPath}${rName}`;
  return `${transformedPath}/${rName}`;
};
function inferAutoPublicPath(url) {
  return url.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
}
function generateSnapshotFromManifest(manifest2, options = {}) {
  var _a, _b, _c;
  const { remotes = {}, overrides = {}, version } = options;
  let remoteSnapshot;
  const getPublicPath = () => {
    if ("publicPath" in manifest2.metaData) {
      if ((manifest2.metaData.publicPath === "auto" || manifest2.metaData.publicPath === "") && version) return inferAutoPublicPath(version);
      return manifest2.metaData.publicPath;
    } else return manifest2.metaData.getPublicPath;
  };
  const overridesKeys = Object.keys(overrides);
  let remotesInfo = {};
  if (!Object.keys(remotes).length) remotesInfo = ((_a = manifest2.remotes) == null ? void 0 : _a.reduce((res, next) => {
    let matchedVersion;
    const name = next.federationContainerName;
    if (overridesKeys.includes(name)) matchedVersion = overrides[name];
    else if ("version" in next) matchedVersion = next.version;
    else matchedVersion = next.entry;
    res[name] = { matchedVersion };
    return res;
  }, {})) || {};
  Object.keys(remotes).forEach((key) => remotesInfo[key] = { matchedVersion: overridesKeys.includes(key) ? overrides[key] : remotes[key] });
  const { remoteEntry: { path: remoteEntryPath, name: remoteEntryName, type: remoteEntryType }, types: remoteTypes = {
    path: "",
    name: "",
    zip: "",
    api: ""
  }, buildInfo: { buildVersion }, globalName, ssrRemoteEntry } = manifest2.metaData;
  const { exposes } = manifest2;
  let basicRemoteSnapshot = {
    version: version ? version : "",
    buildVersion,
    globalName,
    remoteEntry: simpleJoinRemoteEntry(remoteEntryPath, remoteEntryName),
    remoteEntryType,
    remoteTypes: simpleJoinRemoteEntry(remoteTypes.path, remoteTypes.name),
    remoteTypesZip: remoteTypes.zip || "",
    remoteTypesAPI: remoteTypes.api || "",
    remotesInfo,
    shared: manifest2 == null ? void 0 : manifest2.shared.map((item) => ({
      assets: item.assets,
      sharedName: item.name,
      version: item.version,
      usedExports: item.referenceExports || []
    })),
    modules: exposes == null ? void 0 : exposes.map((expose) => ({
      moduleName: expose.name,
      modulePath: expose.path,
      assets: expose.assets
    }))
  };
  if ((_b = manifest2.metaData) == null ? void 0 : _b.prefetchInterface) {
    const prefetchInterface = manifest2.metaData.prefetchInterface;
    basicRemoteSnapshot = {
      ...basicRemoteSnapshot,
      prefetchInterface
    };
  }
  if ((_c = manifest2.metaData) == null ? void 0 : _c.prefetchEntry) {
    const { path, name, type: type2 } = manifest2.metaData.prefetchEntry;
    basicRemoteSnapshot = {
      ...basicRemoteSnapshot,
      prefetchEntry: simpleJoinRemoteEntry(path, name),
      prefetchEntryType: type2
    };
  }
  if ("publicPath" in manifest2.metaData) {
    remoteSnapshot = {
      ...basicRemoteSnapshot,
      publicPath: getPublicPath()
    };
    if (typeof manifest2.metaData.ssrPublicPath === "string") remoteSnapshot.ssrPublicPath = manifest2.metaData.ssrPublicPath;
  } else remoteSnapshot = {
    ...basicRemoteSnapshot,
    getPublicPath: getPublicPath()
  };
  if (ssrRemoteEntry) {
    const fullSSRRemoteEntry = simpleJoinRemoteEntry(ssrRemoteEntry.path, ssrRemoteEntry.name);
    remoteSnapshot.ssrRemoteEntry = fullSSRRemoteEntry;
    remoteSnapshot.ssrRemoteEntryType = ssrRemoteEntry.type || "commonjs-module";
  }
  return remoteSnapshot;
}
function isManifestProvider(moduleInfo) {
  if ("remoteEntry" in moduleInfo && moduleInfo.remoteEntry.includes(require_constant$5.MANIFEST_EXT)) return true;
  else return false;
}
function getManifestFileName(manifestOptions) {
  if (!manifestOptions) return {
    statsFileName: require_constant$5.StatsFileName,
    manifestFileName: require_constant$5.ManifestFileName
  };
  let filePath = typeof manifestOptions === "boolean" ? "" : manifestOptions.filePath || "";
  let fileName = typeof manifestOptions === "boolean" ? "" : manifestOptions.fileName || "";
  const JSON_EXT = ".json";
  const addExt = (name) => {
    if (name.endsWith(JSON_EXT)) return name;
    return `${name}${JSON_EXT}`;
  };
  const insertSuffix = (name, suffix) => {
    return name.replace(JSON_EXT, `${suffix}${JSON_EXT}`);
  };
  const manifestFileName = fileName ? addExt(fileName) : require_constant$5.ManifestFileName;
  return {
    statsFileName: simpleJoinRemoteEntry(filePath, fileName ? insertSuffix(manifestFileName, "-stats") : require_constant$5.StatsFileName),
    manifestFileName: simpleJoinRemoteEntry(filePath, manifestFileName)
  };
}
generateSnapshotFromManifest$1.generateSnapshotFromManifest = generateSnapshotFromManifest;
generateSnapshotFromManifest$1.getManifestFileName = getManifestFileName;
generateSnapshotFromManifest$1.inferAutoPublicPath = inferAutoPublicPath;
generateSnapshotFromManifest$1.isManifestProvider = isManifestProvider;
generateSnapshotFromManifest$1.simpleJoinRemoteEntry = simpleJoinRemoteEntry;
var logger$2 = {};
const require_env$1 = env$1;
const PREFIX = "[ Module Federation ]";
const DEFAULT_DELEGATE = console;
const LOGGER_STACK_SKIP_TOKENS = [
  "logger.ts",
  "logger.js",
  "captureStackTrace",
  "Logger.emit",
  "Logger.log",
  "Logger.info",
  "Logger.warn",
  "Logger.error",
  "Logger.debug"
];
function captureStackTrace() {
  try {
    const stack = (/* @__PURE__ */ new Error()).stack;
    if (!stack) return;
    const [, ...rawLines] = stack.split("\n");
    const filtered = rawLines.filter((line) => !LOGGER_STACK_SKIP_TOKENS.some((token) => line.includes(token)));
    if (!filtered.length) return;
    return `Stack trace:
${filtered.slice(0, 5).join("\n")}`;
  } catch {
    return;
  }
}
var Logger = class {
  constructor(prefix, delegate = DEFAULT_DELEGATE) {
    this.prefix = prefix;
    this.delegate = delegate ?? DEFAULT_DELEGATE;
  }
  setPrefix(prefix) {
    this.prefix = prefix;
  }
  setDelegate(delegate) {
    this.delegate = delegate ?? DEFAULT_DELEGATE;
  }
  emit(method, args) {
    const delegate = this.delegate;
    const stackTrace = require_env$1.isDebugMode() ? captureStackTrace() : void 0;
    const enrichedArgs = stackTrace ? [...args, stackTrace] : args;
    const order = (() => {
      switch (method) {
        case "log":
          return ["log", "info"];
        case "info":
          return ["info", "log"];
        case "warn":
          return [
            "warn",
            "info",
            "log"
          ];
        case "error":
          return [
            "error",
            "warn",
            "log"
          ];
        default:
          return ["debug", "log"];
      }
    })();
    for (const candidate of order) {
      const handler = delegate[candidate];
      if (typeof handler === "function") {
        handler.call(delegate, this.prefix, ...enrichedArgs);
        return;
      }
    }
    for (const candidate of order) {
      const handler = DEFAULT_DELEGATE[candidate];
      if (typeof handler === "function") {
        handler.call(DEFAULT_DELEGATE, this.prefix, ...enrichedArgs);
        return;
      }
    }
  }
  log(...args) {
    this.emit("log", args);
  }
  warn(...args) {
    this.emit("warn", args);
  }
  error(...args) {
    this.emit("error", args);
  }
  success(...args) {
    this.emit("info", args);
  }
  info(...args) {
    this.emit("info", args);
  }
  ready(...args) {
    this.emit("info", args);
  }
  debug(...args) {
    if (require_env$1.isDebugMode()) this.emit("debug", args);
  }
};
function createLogger(prefix) {
  return new Logger(prefix);
}
function createInfrastructureLogger(prefix) {
  const infrastructureLogger2 = new Logger(prefix);
  Object.defineProperty(infrastructureLogger2, "__mf_infrastructure_logger__", {
    value: true,
    enumerable: false,
    configurable: false
  });
  return infrastructureLogger2;
}
function bindLoggerToCompiler(loggerInstance, compiler, name) {
  if (!loggerInstance.__mf_infrastructure_logger__) return;
  if (!(compiler == null ? void 0 : compiler.getInfrastructureLogger)) return;
  try {
    const infrastructureLogger2 = compiler.getInfrastructureLogger(name);
    if (infrastructureLogger2 && typeof infrastructureLogger2 === "object" && (typeof infrastructureLogger2.log === "function" || typeof infrastructureLogger2.info === "function" || typeof infrastructureLogger2.warn === "function" || typeof infrastructureLogger2.error === "function")) loggerInstance.setDelegate(infrastructureLogger2);
  } catch {
    loggerInstance.setDelegate(void 0);
  }
}
const logger$1 = createLogger(PREFIX);
const infrastructureLogger = createInfrastructureLogger(PREFIX);
logger$2.bindLoggerToCompiler = bindLoggerToCompiler;
logger$2.createInfrastructureLogger = createInfrastructureLogger;
logger$2.createLogger = createLogger;
logger$2.infrastructureLogger = infrastructureLogger;
logger$2.logger = logger$1;
var dom = {};
const require_utils$2 = utils$1;
async function safeWrapper$1(callback, disableWarn) {
  try {
    return await callback();
  } catch (e) {
    !disableWarn && require_utils$2.warn(e);
    return;
  }
}
function isStaticResourcesEqual$1(url1, url2) {
  const REG_EXP = /^(https?:)?\/\//i;
  return url1.replace(REG_EXP, "").replace(/\/$/, "") === url2.replace(REG_EXP, "").replace(/\/$/, "");
}
function createScript(info) {
  let script = null;
  let needAttach = true;
  let timeout = 2e4;
  let timeoutId;
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    const scriptSrc = s.getAttribute("src");
    if (scriptSrc && isStaticResourcesEqual$1(scriptSrc, info.url)) {
      script = s;
      needAttach = false;
      break;
    }
  }
  if (!script) {
    const attrs = info.attrs;
    script = document.createElement("script");
    script.type = (attrs == null ? void 0 : attrs["type"]) === "module" ? "module" : "text/javascript";
    let createScriptRes = void 0;
    if (info.createScriptHook) {
      createScriptRes = info.createScriptHook(info.url, info.attrs);
      if (createScriptRes instanceof HTMLScriptElement) script = createScriptRes;
      else if (typeof createScriptRes === "object") {
        if ("script" in createScriptRes && createScriptRes.script) script = createScriptRes.script;
        if ("timeout" in createScriptRes && createScriptRes.timeout) timeout = createScriptRes.timeout;
      }
    }
    if (!script.src) script.src = info.url;
    if (attrs && !createScriptRes) Object.keys(attrs).forEach((name) => {
      if (script) {
        if (name === "async" || name === "defer") script[name] = attrs[name];
        else if (!script.getAttribute(name)) script.setAttribute(name, attrs[name]);
      }
    });
  }
  let executionError = null;
  const executionErrorHandler = typeof window !== "undefined" ? (evt) => {
    if (evt.filename && isStaticResourcesEqual$1(evt.filename, info.url)) {
      const err = /* @__PURE__ */ new Error(`ScriptExecutionError: Script "${info.url}" loaded but threw a runtime error during execution: ${evt.message} (${evt.filename}:${evt.lineno}:${evt.colno})`);
      err.name = "ScriptExecutionError";
      executionError = err;
    }
  } : null;
  if (executionErrorHandler) window.addEventListener("error", executionErrorHandler);
  const onScriptComplete = async (prev, event) => {
    clearTimeout(timeoutId);
    if (executionErrorHandler) window.removeEventListener("error", executionErrorHandler);
    const onScriptCompleteCallback = () => {
      if ((event == null ? void 0 : event.type) === "error") {
        const networkError = /* @__PURE__ */ new Error(`ScriptNetworkError: Failed to load script "${info.url}" - the script URL is unreachable or the server returned an error (network failure, 404, CORS, etc.)`);
        networkError.name = "ScriptNetworkError";
        (info == null ? void 0 : info.onErrorCallback) && (info == null ? void 0 : info.onErrorCallback(networkError));
      } else if (executionError) (info == null ? void 0 : info.onErrorCallback) && (info == null ? void 0 : info.onErrorCallback(executionError));
      else (info == null ? void 0 : info.cb) && (info == null ? void 0 : info.cb());
    };
    if (script) {
      script.onerror = null;
      script.onload = null;
      safeWrapper$1(() => {
        const { needDeleteScript = true } = info;
        if (needDeleteScript) (script == null ? void 0 : script.parentNode) && script.parentNode.removeChild(script);
      });
      if (prev && typeof prev === "function") {
        const result = prev(event);
        if (result instanceof Promise) {
          const res = await result;
          onScriptCompleteCallback();
          return res;
        }
        onScriptCompleteCallback();
        return result;
      }
    }
    onScriptCompleteCallback();
  };
  script.onerror = onScriptComplete.bind(null, script.onerror);
  script.onload = onScriptComplete.bind(null, script.onload);
  timeoutId = setTimeout(() => {
    onScriptComplete(null, /* @__PURE__ */ new Error(`Remote script "${info.url}" time-outed.`));
  }, timeout);
  return {
    script,
    needAttach
  };
}
function createLink(info) {
  let link = null;
  let needAttach = true;
  const links = document.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    const l = links[i];
    const linkHref = l.getAttribute("href");
    const linkRel = l.getAttribute("rel");
    if (linkHref && isStaticResourcesEqual$1(linkHref, info.url) && linkRel === info.attrs["rel"]) {
      link = l;
      needAttach = false;
      break;
    }
  }
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("href", info.url);
    let createLinkRes = void 0;
    const attrs = info.attrs;
    if (info.createLinkHook) {
      createLinkRes = info.createLinkHook(info.url, attrs);
      if (createLinkRes instanceof HTMLLinkElement) link = createLinkRes;
    }
    if (attrs && !createLinkRes) Object.keys(attrs).forEach((name) => {
      if (link && !link.getAttribute(name)) link.setAttribute(name, attrs[name]);
    });
  }
  const onLinkComplete = (prev, event) => {
    const onLinkCompleteCallback = () => {
      if ((event == null ? void 0 : event.type) === "error") (info == null ? void 0 : info.onErrorCallback) && (info == null ? void 0 : info.onErrorCallback(event));
      else (info == null ? void 0 : info.cb) && (info == null ? void 0 : info.cb());
    };
    if (link) {
      link.onerror = null;
      link.onload = null;
      safeWrapper$1(() => {
        const { needDeleteLink = true } = info;
        if (needDeleteLink) (link == null ? void 0 : link.parentNode) && link.parentNode.removeChild(link);
      });
      if (prev) {
        const res = prev(event);
        onLinkCompleteCallback();
        return res;
      }
    }
    onLinkCompleteCallback();
  };
  link.onerror = onLinkComplete.bind(null, link.onerror);
  link.onload = onLinkComplete.bind(null, link.onload);
  return {
    link,
    needAttach
  };
}
function loadScript(url, info) {
  const { attrs = {}, createScriptHook } = info;
  return new Promise((resolve, reject) => {
    const { script, needAttach } = createScript({
      url,
      cb: resolve,
      onErrorCallback: reject,
      attrs: {
        fetchpriority: "high",
        ...attrs
      },
      createScriptHook,
      needDeleteScript: true
    });
    needAttach && document.head.appendChild(script);
  });
}
dom.createLink = createLink;
dom.createScript = createScript;
dom.isStaticResourcesEqual = isStaticResourcesEqual$1;
dom.loadScript = loadScript;
dom.safeWrapper = safeWrapper$1;
var node = {};
const createScriptNode = (url2, cb2, attrs2, loaderHook2) => {
  cb2(/* @__PURE__ */ new Error("createScriptNode is disabled in non-Node.js environment"));
};
const loadScriptNode = (url2, info) => {
  throw new Error("loadScriptNode is disabled in non-Node.js environment");
};
node.createScriptNode = createScriptNode;
node.loadScriptNode = loadScriptNode;
var normalizeOptions$1 = {};
function normalizeOptions(enableDefault, defaultOptions, key) {
  return function(options) {
    if (options === false) return false;
    if (typeof options === "undefined") if (enableDefault) return defaultOptions;
    else return false;
    if (options === true) return defaultOptions;
    if (options && typeof options === "object") return {
      ...defaultOptions,
      ...options
    };
    throw new Error(`Unexpected type for \`${key}\`, expect boolean/undefined/object, got: ${typeof options}`);
  };
}
normalizeOptions$1.normalizeOptions = normalizeOptions;
var createModuleFederationConfig$1 = {};
const createModuleFederationConfig = (options) => {
  return options;
};
createModuleFederationConfig$1.createModuleFederationConfig = createModuleFederationConfig;
(function(exports$1) {
  Object.defineProperty(exports$1, Symbol.toStringTag, { value: "Module" });
  const require_constant2 = constant$1;
  const require_ContainerPlugin = ContainerPlugin;
  const require_ContainerReferencePlugin = ContainerReferencePlugin;
  const require_ModuleFederationPlugin = ModuleFederationPlugin;
  const require_SharePlugin = SharePlugin;
  const require_ConsumeSharedPlugin = ConsumeSharedPlugin;
  const require_ProvideSharedPlugin = ProvideSharedPlugin;
  const require_env2 = env$1;
  const require_utils2 = utils$1;
  const require_generateSnapshotFromManifest = generateSnapshotFromManifest$1;
  const require_logger2 = logger$2;
  const require_dom = dom;
  const require_node = node;
  const require_normalizeOptions = normalizeOptions$1;
  const require_createModuleFederationConfig = createModuleFederationConfig$1;
  exports$1.BROWSER_LOG_KEY = require_constant2.BROWSER_LOG_KEY;
  exports$1.ENCODE_NAME_PREFIX = require_constant2.ENCODE_NAME_PREFIX;
  exports$1.EncodedNameTransformMap = require_constant2.EncodedNameTransformMap;
  exports$1.FederationModuleManifest = require_constant2.FederationModuleManifest;
  exports$1.MANIFEST_EXT = require_constant2.MANIFEST_EXT;
  exports$1.MFModuleType = require_constant2.MFModuleType;
  exports$1.MFPrefetchCommon = require_constant2.MFPrefetchCommon;
  exports$1.MODULE_DEVTOOL_IDENTIFIER = require_constant2.MODULE_DEVTOOL_IDENTIFIER;
  exports$1.ManifestFileName = require_constant2.ManifestFileName;
  exports$1.NameTransformMap = require_constant2.NameTransformMap;
  exports$1.NameTransformSymbol = require_constant2.NameTransformSymbol;
  exports$1.SEPARATOR = require_constant2.SEPARATOR;
  exports$1.StatsFileName = require_constant2.StatsFileName;
  exports$1.TEMP_DIR = require_constant2.TEMP_DIR;
  exports$1.TreeShakingStatus = require_constant2.TreeShakingStatus;
  exports$1.assert = require_utils2.assert;
  exports$1.bindLoggerToCompiler = require_logger2.bindLoggerToCompiler;
  exports$1.composeKeyWithSeparator = require_utils2.composeKeyWithSeparator;
  Object.defineProperty(exports$1, "consumeSharedPlugin", {
    enumerable: true,
    get: function() {
      return require_ConsumeSharedPlugin.ConsumeSharedPlugin_exports;
    }
  });
  Object.defineProperty(exports$1, "containerPlugin", {
    enumerable: true,
    get: function() {
      return require_ContainerPlugin.ContainerPlugin_exports;
    }
  });
  Object.defineProperty(exports$1, "containerReferencePlugin", {
    enumerable: true,
    get: function() {
      return require_ContainerReferencePlugin.ContainerReferencePlugin_exports;
    }
  });
  exports$1.createInfrastructureLogger = require_logger2.createInfrastructureLogger;
  exports$1.createLink = require_dom.createLink;
  exports$1.createLogger = require_logger2.createLogger;
  exports$1.createModuleFederationConfig = require_createModuleFederationConfig.createModuleFederationConfig;
  exports$1.createScript = require_dom.createScript;
  exports$1.createScriptNode = require_node.createScriptNode;
  exports$1.decodeName = require_utils2.decodeName;
  exports$1.encodeName = require_utils2.encodeName;
  exports$1.error = require_utils2.error;
  exports$1.generateExposeFilename = require_utils2.generateExposeFilename;
  exports$1.generateShareFilename = require_utils2.generateShareFilename;
  exports$1.generateSnapshotFromManifest = require_generateSnapshotFromManifest.generateSnapshotFromManifest;
  exports$1.getManifestFileName = require_generateSnapshotFromManifest.getManifestFileName;
  exports$1.getProcessEnv = require_env2.getProcessEnv;
  exports$1.getResourceUrl = require_utils2.getResourceUrl;
  exports$1.inferAutoPublicPath = require_generateSnapshotFromManifest.inferAutoPublicPath;
  exports$1.infrastructureLogger = require_logger2.infrastructureLogger;
  exports$1.isBrowserEnv = require_env2.isBrowserEnv;
  exports$1.isBrowserEnvValue = require_env2.isBrowserEnvValue;
  exports$1.isDebugMode = require_env2.isDebugMode;
  exports$1.isManifestProvider = require_generateSnapshotFromManifest.isManifestProvider;
  exports$1.isReactNativeEnv = require_env2.isReactNativeEnv;
  exports$1.isRequiredVersion = require_utils2.isRequiredVersion;
  exports$1.isStaticResourcesEqual = require_dom.isStaticResourcesEqual;
  exports$1.loadScript = require_dom.loadScript;
  exports$1.loadScriptNode = require_node.loadScriptNode;
  exports$1.logger = require_logger2.logger;
  Object.defineProperty(exports$1, "moduleFederationPlugin", {
    enumerable: true,
    get: function() {
      return require_ModuleFederationPlugin.ModuleFederationPlugin_exports;
    }
  });
  exports$1.normalizeOptions = require_normalizeOptions.normalizeOptions;
  exports$1.parseEntry = require_utils2.parseEntry;
  Object.defineProperty(exports$1, "provideSharedPlugin", {
    enumerable: true,
    get: function() {
      return require_ProvideSharedPlugin.ProvideSharedPlugin_exports;
    }
  });
  exports$1.safeToString = require_utils2.safeToString;
  exports$1.safeWrapper = require_dom.safeWrapper;
  Object.defineProperty(exports$1, "sharePlugin", {
    enumerable: true,
    get: function() {
      return require_SharePlugin.SharePlugin_exports;
    }
  });
  exports$1.simpleJoinRemoteEntry = require_generateSnapshotFromManifest.simpleJoinRemoteEntry;
  exports$1.warn = require_utils2.warn;
})(dist$1);
var browser = {};
var getShortErrorMsg$1 = {};
const getDocsUrl = (errorCode) => {
  return `View the docs to see how to solve: https://module-federation.io/guide/troubleshooting/${errorCode.split("-")[0].toLowerCase()}#${errorCode.toLowerCase()}`;
};
const getShortErrorMsg = (errorCode, errorDescMap2, args, originalErrorMsg) => {
  const msg = [`${[errorDescMap2[errorCode]]} #${errorCode}`];
  args && msg.push(`args: ${JSON.stringify(args)}`);
  msg.push(getDocsUrl(errorCode));
  originalErrorMsg && msg.push(`Original Error Message:
 ${originalErrorMsg}`);
  return msg.join("\n");
};
getShortErrorMsg$1.getShortErrorMsg = getShortErrorMsg;
(function(exports$1) {
  Object.defineProperty(exports$1, Symbol.toStringTag, { value: "Module" });
  const require_getShortErrorMsg = getShortErrorMsg$1;
  function logAndReport(code, descMap, args, logger2, originalErrorMsg, context2) {
    return logger2(require_getShortErrorMsg.getShortErrorMsg(code, descMap, args, originalErrorMsg));
  }
  exports$1.logAndReport = logAndReport;
})(browser);
let _module_federation_sdk$b = dist$1;
let _module_federation_error_codes_browser = browser;
const LOG_CATEGORY = "[ Federation Runtime ]";
const logger = (0, _module_federation_sdk$b.createLogger)(LOG_CATEGORY);
function assert(condition, msgOrCode, descMap, args, context2) {
  if (!condition) if (descMap !== void 0) error(msgOrCode, descMap, args, void 0, context2);
  else error(msgOrCode);
}
function error(msgOrCode, descMap, args, originalErrorMsg, context2) {
  if (descMap !== void 0) return (0, _module_federation_error_codes_browser.logAndReport)(msgOrCode, descMap, args ?? {}, (msg2) => {
    throw new Error(`${LOG_CATEGORY}: ${msg2}`);
  }, originalErrorMsg, context2);
  const msg = msgOrCode;
  if (msg instanceof Error) {
    if (!msg.message.startsWith(LOG_CATEGORY)) msg.message = `${LOG_CATEGORY}: ${msg.message}`;
    throw msg;
  }
  throw new Error(`${LOG_CATEGORY}: ${msg}`);
}
function warn(msg) {
  if (msg instanceof Error) {
    if (!msg.message.startsWith(LOG_CATEGORY)) msg.message = `${LOG_CATEGORY}: ${msg.message}`;
    logger.warn(msg);
  } else logger.warn(msg);
}
logger$3.assert = assert;
logger$3.error = error;
logger$3.logger = logger;
logger$3.warn = warn;
var tool = {};
const require_logger$d = logger$3;
let _module_federation_sdk$a = dist$1;
function addUniqueItem(arr, item) {
  if (arr.findIndex((name) => name === item) === -1) arr.push(item);
  return arr;
}
function getFMId(remoteInfo) {
  if ("version" in remoteInfo && remoteInfo.version) return `${remoteInfo.name}:${remoteInfo.version}`;
  else if ("entry" in remoteInfo && remoteInfo.entry) return `${remoteInfo.name}:${remoteInfo.entry}`;
  else return `${remoteInfo.name}`;
}
function isRemoteInfoWithEntry(remote2) {
  return typeof remote2.entry !== "undefined";
}
function isPureRemoteEntry(remote2) {
  return !remote2.entry.includes(".json");
}
async function safeWrapper(callback, disableWarn) {
  try {
    return await callback();
  } catch (e) {
    !disableWarn && require_logger$d.warn(e);
    return;
  }
}
function isObject(val) {
  return val && typeof val === "object";
}
const objectToString = Object.prototype.toString;
function isPlainObject(val) {
  return objectToString.call(val) === "[object Object]";
}
function isStaticResourcesEqual(url1, url2) {
  const REG_EXP = /^(https?:)?\/\//i;
  return url1.replace(REG_EXP, "").replace(/\/$/, "") === url2.replace(REG_EXP, "").replace(/\/$/, "");
}
function arrayOptions(options) {
  return Array.isArray(options) ? options : [options];
}
function getRemoteEntryInfoFromSnapshot(snapshot2) {
  const defaultRemoteEntryInfo = {
    url: "",
    type: "global",
    globalName: ""
  };
  if (_module_federation_sdk$a.isBrowserEnvValue || (0, _module_federation_sdk$a.isReactNativeEnv)() || !("ssrRemoteEntry" in snapshot2)) return "remoteEntry" in snapshot2 ? {
    url: snapshot2.remoteEntry,
    type: snapshot2.remoteEntryType,
    globalName: snapshot2.globalName
  } : defaultRemoteEntryInfo;
  if ("ssrRemoteEntry" in snapshot2) return {
    url: snapshot2.ssrRemoteEntry || defaultRemoteEntryInfo.url,
    type: snapshot2.ssrRemoteEntryType || defaultRemoteEntryInfo.type,
    globalName: snapshot2.globalName
  };
  return defaultRemoteEntryInfo;
}
const processModuleAlias = (name, subPath) => {
  let moduleName;
  if (name.endsWith("/")) moduleName = name.slice(0, -1);
  else moduleName = name;
  if (subPath.startsWith(".")) subPath = subPath.slice(1);
  moduleName = moduleName + subPath;
  return moduleName;
};
tool.addUniqueItem = addUniqueItem;
tool.arrayOptions = arrayOptions;
tool.getFMId = getFMId;
tool.getRemoteEntryInfoFromSnapshot = getRemoteEntryInfoFromSnapshot;
tool.isObject = isObject;
tool.isPlainObject = isPlainObject;
tool.isPureRemoteEntry = isPureRemoteEntry;
tool.isRemoteInfoWithEntry = isRemoteInfoWithEntry;
tool.isStaticResourcesEqual = isStaticResourcesEqual;
tool.objectToString = objectToString;
tool.processModuleAlias = processModuleAlias;
tool.safeWrapper = safeWrapper;
var global = {};
const require_logger$c = logger$3;
const require_tool$8 = tool;
let _module_federation_sdk$9 = dist$1;
const CurrentGlobal = typeof globalThis === "object" ? globalThis : window;
const nativeGlobal = (() => {
  try {
    return document.defaultView;
  } catch {
    return CurrentGlobal;
  }
})();
const Global = nativeGlobal;
function definePropertyGlobalVal(target, key, val) {
  Object.defineProperty(target, key, {
    value: val,
    configurable: false,
    writable: true
  });
}
function includeOwnProperty(target, key) {
  return Object.hasOwnProperty.call(target, key);
}
if (!includeOwnProperty(CurrentGlobal, "__GLOBAL_LOADING_REMOTE_ENTRY__")) definePropertyGlobalVal(CurrentGlobal, "__GLOBAL_LOADING_REMOTE_ENTRY__", {});
const globalLoading = CurrentGlobal.__GLOBAL_LOADING_REMOTE_ENTRY__;
function setGlobalDefaultVal(target) {
  if (includeOwnProperty(target, "__VMOK__") && !includeOwnProperty(target, "__FEDERATION__")) definePropertyGlobalVal(target, "__FEDERATION__", target.__VMOK__);
  if (!includeOwnProperty(target, "__FEDERATION__")) {
    definePropertyGlobalVal(target, "__FEDERATION__", {
      __GLOBAL_PLUGIN__: [],
      __INSTANCES__: [],
      moduleInfo: {},
      __SHARE__: {},
      __MANIFEST_LOADING__: {},
      __PRELOADED_MAP__: /* @__PURE__ */ new Map()
    });
    definePropertyGlobalVal(target, "__VMOK__", target.__FEDERATION__);
  }
  target.__FEDERATION__.__GLOBAL_PLUGIN__ ??= [];
  target.__FEDERATION__.__INSTANCES__ ??= [];
  target.__FEDERATION__.moduleInfo ??= {};
  target.__FEDERATION__.__SHARE__ ??= {};
  target.__FEDERATION__.__MANIFEST_LOADING__ ??= {};
  target.__FEDERATION__.__PRELOADED_MAP__ ??= /* @__PURE__ */ new Map();
}
setGlobalDefaultVal(CurrentGlobal);
setGlobalDefaultVal(nativeGlobal);
function resetFederationGlobalInfo() {
  CurrentGlobal.__FEDERATION__.__GLOBAL_PLUGIN__ = [];
  CurrentGlobal.__FEDERATION__.__INSTANCES__ = [];
  CurrentGlobal.__FEDERATION__.moduleInfo = {};
  CurrentGlobal.__FEDERATION__.__SHARE__ = {};
  CurrentGlobal.__FEDERATION__.__MANIFEST_LOADING__ = {};
  Object.keys(globalLoading).forEach((key) => {
    delete globalLoading[key];
  });
}
function setGlobalFederationInstance(FederationInstance) {
  CurrentGlobal.__FEDERATION__.__INSTANCES__.push(FederationInstance);
}
function getGlobalFederationConstructor() {
  return CurrentGlobal.__FEDERATION__.__DEBUG_CONSTRUCTOR__;
}
function setGlobalFederationConstructor(FederationConstructor, isDebug = (0, _module_federation_sdk$9.isDebugMode)()) {
  if (isDebug) {
    CurrentGlobal.__FEDERATION__.__DEBUG_CONSTRUCTOR__ = FederationConstructor;
    CurrentGlobal.__FEDERATION__.__DEBUG_CONSTRUCTOR_VERSION__ = "2.2.3";
  }
}
function getInfoWithoutType(target, key) {
  if (typeof key === "string") if (target[key]) return {
    value: target[key],
    key
  };
  else {
    const targetKeys = Object.keys(target);
    for (const targetKey of targetKeys) {
      const [targetTypeOrName, _] = targetKey.split(":");
      const nKey = `${targetTypeOrName}:${key}`;
      const typeWithKeyRes = target[nKey];
      if (typeWithKeyRes) return {
        value: typeWithKeyRes,
        key: nKey
      };
    }
    return {
      value: void 0,
      key
    };
  }
  else require_logger$c.error(`getInfoWithoutType: "key" must be a string, got ${typeof key} (${JSON.stringify(key)}).`);
}
const getGlobalSnapshot = () => nativeGlobal.__FEDERATION__.moduleInfo;
const getTargetSnapshotInfoByModuleInfo = (moduleInfo, snapshot2) => {
  const getModuleInfo = getInfoWithoutType(snapshot2, require_tool$8.getFMId(moduleInfo)).value;
  if (getModuleInfo && !getModuleInfo.version && "version" in moduleInfo && moduleInfo["version"]) getModuleInfo.version = moduleInfo["version"];
  if (getModuleInfo) return getModuleInfo;
  if ("version" in moduleInfo && moduleInfo["version"]) {
    const { version, ...resModuleInfo } = moduleInfo;
    const moduleKeyWithoutVersion = require_tool$8.getFMId(resModuleInfo);
    const getModuleInfoWithoutVersion = getInfoWithoutType(nativeGlobal.__FEDERATION__.moduleInfo, moduleKeyWithoutVersion).value;
    if ((getModuleInfoWithoutVersion == null ? void 0 : getModuleInfoWithoutVersion.version) === version) return getModuleInfoWithoutVersion;
  }
};
const getGlobalSnapshotInfoByModuleInfo = (moduleInfo) => getTargetSnapshotInfoByModuleInfo(moduleInfo, nativeGlobal.__FEDERATION__.moduleInfo);
const setGlobalSnapshotInfoByModuleInfo = (remoteInfo, moduleDetailInfo) => {
  const moduleKey = require_tool$8.getFMId(remoteInfo);
  nativeGlobal.__FEDERATION__.moduleInfo[moduleKey] = moduleDetailInfo;
  return nativeGlobal.__FEDERATION__.moduleInfo;
};
const addGlobalSnapshot = (moduleInfos) => {
  nativeGlobal.__FEDERATION__.moduleInfo = {
    ...nativeGlobal.__FEDERATION__.moduleInfo,
    ...moduleInfos
  };
  return () => {
    const keys = Object.keys(moduleInfos);
    for (const key of keys) delete nativeGlobal.__FEDERATION__.moduleInfo[key];
  };
};
const getRemoteEntryExports = (name, globalName) => {
  const remoteEntryKey = globalName || `__FEDERATION_${name}:custom__`;
  return {
    remoteEntryKey,
    entryExports: CurrentGlobal[remoteEntryKey]
  };
};
const registerGlobalPlugins = (plugins) => {
  const { __GLOBAL_PLUGIN__ } = nativeGlobal.__FEDERATION__;
  plugins.forEach((plugin2) => {
    if (__GLOBAL_PLUGIN__.findIndex((p) => p.name === plugin2.name) === -1) __GLOBAL_PLUGIN__.push(plugin2);
    else require_logger$c.warn(`The plugin ${plugin2.name} has been registered.`);
  });
};
const getGlobalHostPlugins = () => nativeGlobal.__FEDERATION__.__GLOBAL_PLUGIN__;
const getPreloaded = (id) => CurrentGlobal.__FEDERATION__.__PRELOADED_MAP__.get(id);
const setPreloaded = (id) => CurrentGlobal.__FEDERATION__.__PRELOADED_MAP__.set(id, true);
global.CurrentGlobal = CurrentGlobal;
global.Global = Global;
global.addGlobalSnapshot = addGlobalSnapshot;
global.getGlobalFederationConstructor = getGlobalFederationConstructor;
global.getGlobalHostPlugins = getGlobalHostPlugins;
global.getGlobalSnapshot = getGlobalSnapshot;
global.getGlobalSnapshotInfoByModuleInfo = getGlobalSnapshotInfoByModuleInfo;
global.getInfoWithoutType = getInfoWithoutType;
global.getPreloaded = getPreloaded;
global.getRemoteEntryExports = getRemoteEntryExports;
global.getTargetSnapshotInfoByModuleInfo = getTargetSnapshotInfoByModuleInfo;
global.globalLoading = globalLoading;
global.nativeGlobal = nativeGlobal;
global.registerGlobalPlugins = registerGlobalPlugins;
global.resetFederationGlobalInfo = resetFederationGlobalInfo;
global.setGlobalFederationConstructor = setGlobalFederationConstructor;
global.setGlobalFederationInstance = setGlobalFederationInstance;
global.setGlobalSnapshotInfoByModuleInfo = setGlobalSnapshotInfoByModuleInfo;
global.setPreloaded = setPreloaded;
var semver = {};
var utils = {};
var constants = {};
const buildIdentifier = "[0-9A-Za-z-]+";
const build = `(?:\\+(${buildIdentifier}(?:\\.${buildIdentifier})*))`;
const numericIdentifier = "0|[1-9]\\d*";
const numericIdentifierLoose = "[0-9]+";
const nonNumericIdentifier = "\\d*[a-zA-Z-][a-zA-Z0-9-]*";
const preReleaseIdentifierLoose = `(?:${numericIdentifierLoose}|${nonNumericIdentifier})`;
const preReleaseLoose = `(?:-?(${preReleaseIdentifierLoose}(?:\\.${preReleaseIdentifierLoose})*))`;
const preReleaseIdentifier = `(?:${numericIdentifier}|${nonNumericIdentifier})`;
const preRelease = `(?:-(${preReleaseIdentifier}(?:\\.${preReleaseIdentifier})*))`;
const xRangeIdentifier = `${numericIdentifier}|x|X|\\*`;
const xRangePlain = `[v=\\s]*(${xRangeIdentifier})(?:\\.(${xRangeIdentifier})(?:\\.(${xRangeIdentifier})(?:${preRelease})?${build}?)?)?`;
const hyphenRange = `^\\s*(${xRangePlain})\\s+-\\s+(${xRangePlain})\\s*$`;
const loosePlain = `[v=\\s]*${`(${numericIdentifierLoose})\\.(${numericIdentifierLoose})\\.(${numericIdentifierLoose})`}${preReleaseLoose}?${build}?`;
const gtlt = "((?:<|>)?=?)";
const comparatorTrim = `(\\s*)${gtlt}\\s*(${loosePlain}|${xRangePlain})`;
const loneTilde = "(?:~>?)";
const tildeTrim = `(\\s*)${loneTilde}\\s+`;
const loneCaret = "(?:\\^)";
const caretTrim = `(\\s*)${loneCaret}\\s+`;
const star = "(<|>)?=?\\s*\\*";
const caret = `^${loneCaret}${xRangePlain}$`;
const fullPlain = `v?${`(${numericIdentifier})\\.(${numericIdentifier})\\.(${numericIdentifier})`}${preRelease}?${build}?`;
const tilde = `^${loneTilde}${xRangePlain}$`;
const xRange = `^${gtlt}\\s*${xRangePlain}$`;
const comparator = `^${gtlt}\\s*(${fullPlain})$|^$`;
const gte0 = "^\\s*>=\\s*0.0.0\\s*$";
constants.caret = caret;
constants.caretTrim = caretTrim;
constants.comparator = comparator;
constants.comparatorTrim = comparatorTrim;
constants.gte0 = gte0;
constants.hyphenRange = hyphenRange;
constants.star = star;
constants.tilde = tilde;
constants.tildeTrim = tildeTrim;
constants.xRange = xRange;
const require_constants$1 = constants;
function parseRegex(source) {
  return new RegExp(source);
}
function isXVersion(version) {
  return !version || version.toLowerCase() === "x" || version === "*";
}
function pipe(...fns) {
  return (x) => fns.reduce((v, f) => f(v), x);
}
function extractComparator(comparatorString) {
  return comparatorString.match(parseRegex(require_constants$1.comparator));
}
function combineVersion(major, minor, patch, preRelease2) {
  const mainVersion = `${major}.${minor}.${patch}`;
  if (preRelease2) return `${mainVersion}-${preRelease2}`;
  return mainVersion;
}
utils.combineVersion = combineVersion;
utils.extractComparator = extractComparator;
utils.isXVersion = isXVersion;
utils.parseRegex = parseRegex;
utils.pipe = pipe;
var parser = {};
const require_constants = constants;
const require_utils$1 = utils;
function parseHyphen(range) {
  return range.replace(require_utils$1.parseRegex(require_constants.hyphenRange), (_range, from, fromMajor, fromMinor, fromPatch, _fromPreRelease, _fromBuild, to, toMajor, toMinor, toPatch, toPreRelease) => {
    if (require_utils$1.isXVersion(fromMajor)) from = "";
    else if (require_utils$1.isXVersion(fromMinor)) from = `>=${fromMajor}.0.0`;
    else if (require_utils$1.isXVersion(fromPatch)) from = `>=${fromMajor}.${fromMinor}.0`;
    else from = `>=${from}`;
    if (require_utils$1.isXVersion(toMajor)) to = "";
    else if (require_utils$1.isXVersion(toMinor)) to = `<${Number(toMajor) + 1}.0.0-0`;
    else if (require_utils$1.isXVersion(toPatch)) to = `<${toMajor}.${Number(toMinor) + 1}.0-0`;
    else if (toPreRelease) to = `<=${toMajor}.${toMinor}.${toPatch}-${toPreRelease}`;
    else to = `<=${to}`;
    return `${from} ${to}`.trim();
  });
}
function parseComparatorTrim(range) {
  return range.replace(require_utils$1.parseRegex(require_constants.comparatorTrim), "$1$2$3");
}
function parseTildeTrim(range) {
  return range.replace(require_utils$1.parseRegex(require_constants.tildeTrim), "$1~");
}
function parseCaretTrim(range) {
  return range.replace(require_utils$1.parseRegex(require_constants.caretTrim), "$1^");
}
function parseCarets(range) {
  return range.trim().split(/\s+/).map((rangeVersion) => rangeVersion.replace(require_utils$1.parseRegex(require_constants.caret), (_, major, minor, patch, preRelease2) => {
    if (require_utils$1.isXVersion(major)) return "";
    else if (require_utils$1.isXVersion(minor)) return `>=${major}.0.0 <${Number(major) + 1}.0.0-0`;
    else if (require_utils$1.isXVersion(patch)) if (major === "0") return `>=${major}.${minor}.0 <${major}.${Number(minor) + 1}.0-0`;
    else return `>=${major}.${minor}.0 <${Number(major) + 1}.0.0-0`;
    else if (preRelease2) if (major === "0") if (minor === "0") return `>=${major}.${minor}.${patch}-${preRelease2} <${major}.${minor}.${Number(patch) + 1}-0`;
    else return `>=${major}.${minor}.${patch}-${preRelease2} <${major}.${Number(minor) + 1}.0-0`;
    else return `>=${major}.${minor}.${patch}-${preRelease2} <${Number(major) + 1}.0.0-0`;
    else {
      if (major === "0") if (minor === "0") return `>=${major}.${minor}.${patch} <${major}.${minor}.${Number(patch) + 1}-0`;
      else return `>=${major}.${minor}.${patch} <${major}.${Number(minor) + 1}.0-0`;
      return `>=${major}.${minor}.${patch} <${Number(major) + 1}.0.0-0`;
    }
  })).join(" ");
}
function parseTildes(range) {
  return range.trim().split(/\s+/).map((rangeVersion) => rangeVersion.replace(require_utils$1.parseRegex(require_constants.tilde), (_, major, minor, patch, preRelease2) => {
    if (require_utils$1.isXVersion(major)) return "";
    else if (require_utils$1.isXVersion(minor)) return `>=${major}.0.0 <${Number(major) + 1}.0.0-0`;
    else if (require_utils$1.isXVersion(patch)) return `>=${major}.${minor}.0 <${major}.${Number(minor) + 1}.0-0`;
    else if (preRelease2) return `>=${major}.${minor}.${patch}-${preRelease2} <${major}.${Number(minor) + 1}.0-0`;
    return `>=${major}.${minor}.${patch} <${major}.${Number(minor) + 1}.0-0`;
  })).join(" ");
}
function parseXRanges(range) {
  return range.split(/\s+/).map((rangeVersion) => rangeVersion.trim().replace(require_utils$1.parseRegex(require_constants.xRange), (ret, gtlt2, major, minor, patch, preRelease2) => {
    const isXMajor = require_utils$1.isXVersion(major);
    const isXMinor = isXMajor || require_utils$1.isXVersion(minor);
    const isXPatch = isXMinor || require_utils$1.isXVersion(patch);
    if (gtlt2 === "=" && isXPatch) gtlt2 = "";
    preRelease2 = "";
    if (isXMajor) if (gtlt2 === ">" || gtlt2 === "<") return "<0.0.0-0";
    else return "*";
    else if (gtlt2 && isXPatch) {
      if (isXMinor) minor = 0;
      patch = 0;
      if (gtlt2 === ">") {
        gtlt2 = ">=";
        if (isXMinor) {
          major = Number(major) + 1;
          minor = 0;
          patch = 0;
        } else {
          minor = Number(minor) + 1;
          patch = 0;
        }
      } else if (gtlt2 === "<=") {
        gtlt2 = "<";
        if (isXMinor) major = Number(major) + 1;
        else minor = Number(minor) + 1;
      }
      if (gtlt2 === "<") preRelease2 = "-0";
      return `${gtlt2 + major}.${minor}.${patch}${preRelease2}`;
    } else if (isXMinor) return `>=${major}.0.0${preRelease2} <${Number(major) + 1}.0.0-0`;
    else if (isXPatch) return `>=${major}.${minor}.0${preRelease2} <${major}.${Number(minor) + 1}.0-0`;
    return ret;
  })).join(" ");
}
function parseStar(range) {
  return range.trim().replace(require_utils$1.parseRegex(require_constants.star), "");
}
function parseGTE0(comparatorString) {
  return comparatorString.trim().replace(require_utils$1.parseRegex(require_constants.gte0), "");
}
parser.parseCaretTrim = parseCaretTrim;
parser.parseCarets = parseCarets;
parser.parseComparatorTrim = parseComparatorTrim;
parser.parseGTE0 = parseGTE0;
parser.parseHyphen = parseHyphen;
parser.parseStar = parseStar;
parser.parseTildeTrim = parseTildeTrim;
parser.parseTildes = parseTildes;
parser.parseXRanges = parseXRanges;
var compare$1 = {};
function compareAtom(rangeAtom, versionAtom) {
  rangeAtom = Number(rangeAtom) || rangeAtom;
  versionAtom = Number(versionAtom) || versionAtom;
  if (rangeAtom > versionAtom) return 1;
  if (rangeAtom === versionAtom) return 0;
  return -1;
}
function comparePreRelease(rangeAtom, versionAtom) {
  const { preRelease: rangePreRelease } = rangeAtom;
  const { preRelease: versionPreRelease } = versionAtom;
  if (rangePreRelease === void 0 && Boolean(versionPreRelease)) return 1;
  if (Boolean(rangePreRelease) && versionPreRelease === void 0) return -1;
  if (rangePreRelease === void 0 && versionPreRelease === void 0) return 0;
  for (let i = 0, n = rangePreRelease.length; i <= n; i++) {
    const rangeElement = rangePreRelease[i];
    const versionElement = versionPreRelease[i];
    if (rangeElement === versionElement) continue;
    if (rangeElement === void 0 && versionElement === void 0) return 0;
    if (!rangeElement) return 1;
    if (!versionElement) return -1;
    return compareAtom(rangeElement, versionElement);
  }
  return 0;
}
function compareVersion(rangeAtom, versionAtom) {
  return compareAtom(rangeAtom.major, versionAtom.major) || compareAtom(rangeAtom.minor, versionAtom.minor) || compareAtom(rangeAtom.patch, versionAtom.patch) || comparePreRelease(rangeAtom, versionAtom);
}
function eq(rangeAtom, versionAtom) {
  return rangeAtom.version === versionAtom.version;
}
function compare(rangeAtom, versionAtom) {
  switch (rangeAtom.operator) {
    case "":
    case "=":
      return eq(rangeAtom, versionAtom);
    case ">":
      return compareVersion(rangeAtom, versionAtom) < 0;
    case ">=":
      return eq(rangeAtom, versionAtom) || compareVersion(rangeAtom, versionAtom) < 0;
    case "<":
      return compareVersion(rangeAtom, versionAtom) > 0;
    case "<=":
      return eq(rangeAtom, versionAtom) || compareVersion(rangeAtom, versionAtom) > 0;
    case void 0:
      return true;
    default:
      return false;
  }
}
compare$1.compare = compare;
const require_utils = utils;
const require_parser = parser;
const require_compare = compare$1;
function parseComparatorString(range) {
  return require_utils.pipe(require_parser.parseCarets, require_parser.parseTildes, require_parser.parseXRanges, require_parser.parseStar)(range);
}
function parseRange(range) {
  return require_utils.pipe(require_parser.parseHyphen, require_parser.parseComparatorTrim, require_parser.parseTildeTrim, require_parser.parseCaretTrim)(range.trim()).split(/\s+/).join(" ");
}
function satisfy(version, range) {
  if (!version) return false;
  const extractedVersion = require_utils.extractComparator(version);
  if (!extractedVersion) return false;
  const [, versionOperator, , versionMajor, versionMinor, versionPatch, versionPreRelease] = extractedVersion;
  const versionAtom = {
    operator: versionOperator,
    version: require_utils.combineVersion(versionMajor, versionMinor, versionPatch, versionPreRelease),
    major: versionMajor,
    minor: versionMinor,
    patch: versionPatch,
    preRelease: versionPreRelease == null ? void 0 : versionPreRelease.split(".")
  };
  const orRanges = range.split("||");
  for (const orRange of orRanges) {
    const trimmedOrRange = orRange.trim();
    if (!trimmedOrRange) return true;
    if (trimmedOrRange === "*" || trimmedOrRange === "x") return true;
    try {
      const parsedSubRange = parseRange(trimmedOrRange);
      if (!parsedSubRange.trim()) return true;
      const parsedComparatorString = parsedSubRange.split(" ").map((rangeVersion) => parseComparatorString(rangeVersion)).join(" ");
      if (!parsedComparatorString.trim()) return true;
      const comparators = parsedComparatorString.split(/\s+/).map((comparator2) => require_parser.parseGTE0(comparator2)).filter(Boolean);
      if (comparators.length === 0) continue;
      let subRangeSatisfied = true;
      for (const comparator2 of comparators) {
        const extractedComparator = require_utils.extractComparator(comparator2);
        if (!extractedComparator) {
          subRangeSatisfied = false;
          break;
        }
        const [, rangeOperator, , rangeMajor, rangeMinor, rangePatch, rangePreRelease] = extractedComparator;
        if (!require_compare.compare({
          operator: rangeOperator,
          version: require_utils.combineVersion(rangeMajor, rangeMinor, rangePatch, rangePreRelease),
          major: rangeMajor,
          minor: rangeMinor,
          patch: rangePatch,
          preRelease: rangePreRelease == null ? void 0 : rangePreRelease.split(".")
        }, versionAtom)) {
          subRangeSatisfied = false;
          break;
        }
      }
      if (subRangeSatisfied) return true;
    } catch (e) {
      console.error(`[semver] Error processing range part "${trimmedOrRange}":`, e);
      continue;
    }
  }
  return false;
}
semver.satisfy = satisfy;
var share = {};
var constant = {};
const DEFAULT_SCOPE = "default";
const DEFAULT_REMOTE_TYPE = "global";
constant.DEFAULT_REMOTE_TYPE = DEFAULT_REMOTE_TYPE;
constant.DEFAULT_SCOPE = DEFAULT_SCOPE;
const require_logger$b = logger$3;
const require_tool$7 = tool;
const require_global$6 = global;
const require_constant$4 = constant;
const require_index = semver;
let _module_federation_sdk$8 = dist$1;
function formatShare(shareArgs, from, name, shareStrategy) {
  var _a, _b;
  let get;
  if ("get" in shareArgs) get = shareArgs.get;
  else if ("lib" in shareArgs) get = () => Promise.resolve(shareArgs.lib);
  else get = () => Promise.resolve(() => {
    require_logger$b.error(`Cannot get shared "${name}" from "${from}": neither "get" nor "lib" is provided in the share config.`);
  });
  if (((_a = shareArgs.shareConfig) == null ? void 0 : _a.eager) && ((_b = shareArgs.treeShaking) == null ? void 0 : _b.mode)) require_logger$b.error(`Invalid shared config for "${name}" from "${from}": cannot use both "eager: true" and "treeShaking.mode" simultaneously. Choose one strategy.`);
  return {
    deps: [],
    useIn: [],
    from,
    loading: null,
    ...shareArgs,
    shareConfig: {
      requiredVersion: `^${shareArgs.version}`,
      singleton: false,
      eager: false,
      strictVersion: false,
      ...shareArgs.shareConfig
    },
    get,
    loaded: (shareArgs == null ? void 0 : shareArgs.loaded) || "lib" in shareArgs ? true : void 0,
    version: shareArgs.version ?? "0",
    scope: Array.isArray(shareArgs.scope) ? shareArgs.scope : [shareArgs.scope ?? "default"],
    strategy: (shareArgs.strategy ?? shareStrategy) || "version-first",
    treeShaking: shareArgs.treeShaking ? {
      ...shareArgs.treeShaking,
      mode: shareArgs.treeShaking.mode ?? "server-calc",
      status: shareArgs.treeShaking.status ?? _module_federation_sdk$8.TreeShakingStatus.UNKNOWN,
      useIn: []
    } : void 0
  };
}
function formatShareConfigs(prevOptions, newOptions) {
  const shareArgs = newOptions.shared || {};
  const from = newOptions.name;
  const newShareInfos = Object.keys(shareArgs).reduce((res, pkgName) => {
    const arrayShareArgs = require_tool$7.arrayOptions(shareArgs[pkgName]);
    res[pkgName] = res[pkgName] || [];
    arrayShareArgs.forEach((shareConfig) => {
      res[pkgName].push(formatShare(shareConfig, from, pkgName, newOptions.shareStrategy));
    });
    return res;
  }, {});
  const allShareInfos = { ...prevOptions.shared };
  Object.keys(newShareInfos).forEach((shareKey) => {
    if (!allShareInfos[shareKey]) allShareInfos[shareKey] = newShareInfos[shareKey];
    else newShareInfos[shareKey].forEach((newUserSharedOptions) => {
      if (!allShareInfos[shareKey].find((sharedVal) => sharedVal.version === newUserSharedOptions.version)) allShareInfos[shareKey].push(newUserSharedOptions);
    });
  });
  return {
    allShareInfos,
    newShareInfos
  };
}
function shouldUseTreeShaking(treeShaking, usedExports) {
  if (!treeShaking) return false;
  const { status, mode } = treeShaking;
  if (status === _module_federation_sdk$8.TreeShakingStatus.NO_USE) return false;
  if (status === _module_federation_sdk$8.TreeShakingStatus.CALCULATED) return true;
  if (mode === "runtime-infer") {
    if (!usedExports) return true;
    return isMatchUsedExports(treeShaking, usedExports);
  }
  return false;
}
function versionLt(a, b) {
  const transformInvalidVersion = (version) => {
    if (!Number.isNaN(Number(version))) {
      const splitArr = version.split(".");
      let validVersion = version;
      for (let i = 0; i < 3 - splitArr.length; i++) validVersion += ".0";
      return validVersion;
    }
    return version;
  };
  if (require_index.satisfy(transformInvalidVersion(a), `<=${transformInvalidVersion(b)}`)) return true;
  else return false;
}
const findVersion = (shareVersionMap, cb) => {
  const callback = cb || function(prev, cur) {
    return versionLt(prev, cur);
  };
  return Object.keys(shareVersionMap).reduce((prev, cur) => {
    if (!prev) return cur;
    if (callback(prev, cur)) return cur;
    if (prev === "0") return cur;
    return prev;
  }, 0);
};
const isLoaded = (shared2) => {
  return Boolean(shared2.loaded) || typeof shared2.lib === "function";
};
const isLoading = (shared2) => {
  return Boolean(shared2.loading);
};
const isMatchUsedExports = (treeShaking, usedExports) => {
  if (!treeShaking || !usedExports) return false;
  const { usedExports: treeShakingUsedExports } = treeShaking;
  if (!treeShakingUsedExports) return false;
  if (usedExports.every((e) => treeShakingUsedExports.includes(e))) return true;
  return false;
};
function findSingletonVersionOrderByVersion(shareScopeMap, scope, pkgName, treeShaking) {
  const versions = shareScopeMap[scope][pkgName];
  let version = "";
  let useTreesShaking = shouldUseTreeShaking(treeShaking);
  const callback = function(prev, cur) {
    if (useTreesShaking) {
      if (!versions[prev].treeShaking) return true;
      if (!versions[cur].treeShaking) return false;
      return !isLoaded(versions[prev].treeShaking) && versionLt(prev, cur);
    }
    return !isLoaded(versions[prev]) && versionLt(prev, cur);
  };
  if (useTreesShaking) {
    version = findVersion(shareScopeMap[scope][pkgName], callback);
    if (version) return {
      version,
      useTreesShaking
    };
    useTreesShaking = false;
  }
  return {
    version: findVersion(shareScopeMap[scope][pkgName], callback),
    useTreesShaking
  };
}
const isLoadingOrLoaded = (shared2) => {
  return isLoaded(shared2) || isLoading(shared2);
};
function findSingletonVersionOrderByLoaded(shareScopeMap, scope, pkgName, treeShaking) {
  const versions = shareScopeMap[scope][pkgName];
  let version = "";
  let useTreesShaking = shouldUseTreeShaking(treeShaking);
  const callback = function(prev, cur) {
    if (useTreesShaking) {
      if (!versions[prev].treeShaking) return true;
      if (!versions[cur].treeShaking) return false;
      if (isLoadingOrLoaded(versions[cur].treeShaking)) if (isLoadingOrLoaded(versions[prev].treeShaking)) return Boolean(versionLt(prev, cur));
      else return true;
      if (isLoadingOrLoaded(versions[prev].treeShaking)) return false;
    }
    if (isLoadingOrLoaded(versions[cur])) if (isLoadingOrLoaded(versions[prev])) return Boolean(versionLt(prev, cur));
    else return true;
    if (isLoadingOrLoaded(versions[prev])) return false;
    return versionLt(prev, cur);
  };
  if (useTreesShaking) {
    version = findVersion(shareScopeMap[scope][pkgName], callback);
    if (version) return {
      version,
      useTreesShaking
    };
    useTreesShaking = false;
  }
  return {
    version: findVersion(shareScopeMap[scope][pkgName], callback),
    useTreesShaking
  };
}
function getFindShareFunction(strategy) {
  if (strategy === "loaded-first") return findSingletonVersionOrderByLoaded;
  return findSingletonVersionOrderByVersion;
}
function getRegisteredShare(localShareScopeMap, pkgName, shareInfo, resolveShare) {
  if (!localShareScopeMap) return;
  const { shareConfig, scope = require_constant$4.DEFAULT_SCOPE, strategy, treeShaking } = shareInfo;
  const scopes = Array.isArray(scope) ? scope : [scope];
  for (const sc of scopes) if (shareConfig && localShareScopeMap[sc] && localShareScopeMap[sc][pkgName]) {
    const { requiredVersion } = shareConfig;
    const { version: maxOrSingletonVersion, useTreesShaking } = getFindShareFunction(strategy)(localShareScopeMap, sc, pkgName, treeShaking);
    const defaultResolver = () => {
      const shared2 = localShareScopeMap[sc][pkgName][maxOrSingletonVersion];
      if (shareConfig.singleton) {
        if (typeof requiredVersion === "string" && !require_index.satisfy(maxOrSingletonVersion, requiredVersion)) {
          const msg = `Version ${maxOrSingletonVersion} from ${maxOrSingletonVersion && shared2.from} of shared singleton module ${pkgName} does not satisfy the requirement of ${shareInfo.from} which needs ${requiredVersion})`;
          if (shareConfig.strictVersion) require_logger$b.error(msg);
          else require_logger$b.warn(msg);
        }
        return {
          shared: shared2,
          useTreesShaking
        };
      } else {
        if (requiredVersion === false || requiredVersion === "*") return {
          shared: shared2,
          useTreesShaking
        };
        if (require_index.satisfy(maxOrSingletonVersion, requiredVersion)) return {
          shared: shared2,
          useTreesShaking
        };
        const _usedTreeShaking = shouldUseTreeShaking(treeShaking);
        if (_usedTreeShaking) for (const [versionKey, versionValue] of Object.entries(localShareScopeMap[sc][pkgName])) {
          if (!shouldUseTreeShaking(versionValue.treeShaking, treeShaking == null ? void 0 : treeShaking.usedExports)) continue;
          if (require_index.satisfy(versionKey, requiredVersion)) return {
            shared: versionValue,
            useTreesShaking: _usedTreeShaking
          };
        }
        for (const [versionKey, versionValue] of Object.entries(localShareScopeMap[sc][pkgName])) if (require_index.satisfy(versionKey, requiredVersion)) return {
          shared: versionValue,
          useTreesShaking: false
        };
      }
    };
    const params = {
      shareScopeMap: localShareScopeMap,
      scope: sc,
      pkgName,
      version: maxOrSingletonVersion,
      GlobalFederation: require_global$6.Global.__FEDERATION__,
      shareInfo,
      resolver: defaultResolver
    };
    return (resolveShare.emit(params) || params).resolver();
  }
}
function getGlobalShareScope() {
  return require_global$6.Global.__FEDERATION__.__SHARE__;
}
function getTargetSharedOptions(options) {
  const { pkgName, extraOptions, shareInfos } = options;
  const defaultResolver = (sharedOptions) => {
    if (!sharedOptions) return;
    const shareVersionMap = {};
    sharedOptions.forEach((shared2) => {
      shareVersionMap[shared2.version] = shared2;
    });
    const callback = function(prev, cur) {
      return !isLoaded(shareVersionMap[prev]) && versionLt(prev, cur);
    };
    return shareVersionMap[findVersion(shareVersionMap, callback)];
  };
  const resolver = (extraOptions == null ? void 0 : extraOptions.resolver) ?? defaultResolver;
  const isPlainObject2 = (val) => {
    return val !== null && typeof val === "object" && !Array.isArray(val);
  };
  const merge = (...sources) => {
    const out = {};
    for (const src of sources) {
      if (!src) continue;
      for (const [key, value] of Object.entries(src)) {
        const prev = out[key];
        if (isPlainObject2(prev) && isPlainObject2(value)) out[key] = merge(prev, value);
        else if (value !== void 0) out[key] = value;
      }
    }
    return out;
  };
  return merge(resolver(shareInfos[pkgName]), extraOptions == null ? void 0 : extraOptions.customShareInfo);
}
const addUseIn = (shared2, from) => {
  if (!shared2.useIn) shared2.useIn = [];
  require_tool$7.addUniqueItem(shared2.useIn, from);
};
function directShare(shared2, useTreesShaking) {
  if (useTreesShaking && shared2.treeShaking) return shared2.treeShaking;
  return shared2;
}
share.addUseIn = addUseIn;
share.directShare = directShare;
share.formatShareConfigs = formatShareConfigs;
share.getGlobalShareScope = getGlobalShareScope;
share.getRegisteredShare = getRegisteredShare;
share.getTargetSharedOptions = getTargetSharedOptions;
share.shouldUseTreeShaking = shouldUseTreeShaking;
var manifest = {};
function matchRemoteWithNameAndExpose(remotes, id) {
  for (const remote2 of remotes) {
    const isNameMatched = id.startsWith(remote2.name);
    let expose = id.replace(remote2.name, "");
    if (isNameMatched) {
      if (expose.startsWith("/")) {
        const pkgNameOrAlias = remote2.name;
        expose = `.${expose}`;
        return {
          pkgNameOrAlias,
          expose,
          remote: remote2
        };
      } else if (expose === "") return {
        pkgNameOrAlias: remote2.name,
        expose: ".",
        remote: remote2
      };
    }
    const isAliasMatched = remote2.alias && id.startsWith(remote2.alias);
    let exposeWithAlias = remote2.alias && id.replace(remote2.alias, "");
    if (remote2.alias && isAliasMatched) {
      if (exposeWithAlias && exposeWithAlias.startsWith("/")) {
        const pkgNameOrAlias = remote2.alias;
        exposeWithAlias = `.${exposeWithAlias}`;
        return {
          pkgNameOrAlias,
          expose: exposeWithAlias,
          remote: remote2
        };
      } else if (exposeWithAlias === "") return {
        pkgNameOrAlias: remote2.alias,
        expose: ".",
        remote: remote2
      };
    }
  }
}
function matchRemote(remotes, nameOrAlias) {
  for (const remote2 of remotes) {
    if (nameOrAlias === remote2.name) return remote2;
    if (remote2.alias && nameOrAlias === remote2.alias) return remote2;
  }
}
manifest.matchRemote = matchRemote;
manifest.matchRemoteWithNameAndExpose = matchRemoteWithNameAndExpose;
var load = {};
var dist = {};
var errorCodes = {};
const RUNTIME_001 = "RUNTIME-001";
const RUNTIME_002 = "RUNTIME-002";
const RUNTIME_003 = "RUNTIME-003";
const RUNTIME_004 = "RUNTIME-004";
const RUNTIME_005 = "RUNTIME-005";
const RUNTIME_006 = "RUNTIME-006";
const RUNTIME_007 = "RUNTIME-007";
const RUNTIME_008 = "RUNTIME-008";
const RUNTIME_009 = "RUNTIME-009";
const RUNTIME_010 = "RUNTIME-010";
const RUNTIME_011 = "RUNTIME-011";
const TYPE_001 = "TYPE-001";
const BUILD_001 = "BUILD-001";
const BUILD_002 = "BUILD-002";
errorCodes.BUILD_001 = BUILD_001;
errorCodes.BUILD_002 = BUILD_002;
errorCodes.RUNTIME_001 = RUNTIME_001;
errorCodes.RUNTIME_002 = RUNTIME_002;
errorCodes.RUNTIME_003 = RUNTIME_003;
errorCodes.RUNTIME_004 = RUNTIME_004;
errorCodes.RUNTIME_005 = RUNTIME_005;
errorCodes.RUNTIME_006 = RUNTIME_006;
errorCodes.RUNTIME_007 = RUNTIME_007;
errorCodes.RUNTIME_008 = RUNTIME_008;
errorCodes.RUNTIME_009 = RUNTIME_009;
errorCodes.RUNTIME_010 = RUNTIME_010;
errorCodes.RUNTIME_011 = RUNTIME_011;
errorCodes.TYPE_001 = TYPE_001;
var desc = {};
const require_error_codes = errorCodes;
const runtimeDescMap = {
  [require_error_codes.RUNTIME_001]: "Failed to get remoteEntry exports.",
  [require_error_codes.RUNTIME_002]: 'The remote entry interface does not contain "init"',
  [require_error_codes.RUNTIME_003]: "Failed to get manifest.",
  [require_error_codes.RUNTIME_004]: "Failed to locate remote.",
  [require_error_codes.RUNTIME_005]: "Invalid loadShareSync function call from bundler runtime",
  [require_error_codes.RUNTIME_006]: "Invalid loadShareSync function call from runtime",
  [require_error_codes.RUNTIME_007]: "Failed to get remote snapshot.",
  [require_error_codes.RUNTIME_008]: "Failed to load script resources.",
  [require_error_codes.RUNTIME_009]: "Please call createInstance first.",
  [require_error_codes.RUNTIME_010]: 'The name option cannot be changed after initialization. If you want to create a new instance with a different name, please use "createInstance" api.',
  [require_error_codes.RUNTIME_011]: "The remoteEntry URL is missing from the remote snapshot."
};
const typeDescMap = { [require_error_codes.TYPE_001]: "Failed to generate type declaration. Execute the below cmd to reproduce and fix the error." };
const buildDescMap = {
  [require_error_codes.BUILD_001]: "Failed to find expose module.",
  [require_error_codes.BUILD_002]: "PublicPath is required in prod mode."
};
const errorDescMap = {
  ...runtimeDescMap,
  ...typeDescMap,
  ...buildDescMap
};
desc.buildDescMap = buildDescMap;
desc.errorDescMap = errorDescMap;
desc.runtimeDescMap = runtimeDescMap;
desc.typeDescMap = typeDescMap;
(function(exports$1) {
  Object.defineProperty(exports$1, Symbol.toStringTag, { value: "Module" });
  const require_error_codes2 = errorCodes;
  const require_getShortErrorMsg = getShortErrorMsg$1;
  const require_desc = desc;
  exports$1.BUILD_001 = require_error_codes2.BUILD_001;
  exports$1.BUILD_002 = require_error_codes2.BUILD_002;
  exports$1.RUNTIME_001 = require_error_codes2.RUNTIME_001;
  exports$1.RUNTIME_002 = require_error_codes2.RUNTIME_002;
  exports$1.RUNTIME_003 = require_error_codes2.RUNTIME_003;
  exports$1.RUNTIME_004 = require_error_codes2.RUNTIME_004;
  exports$1.RUNTIME_005 = require_error_codes2.RUNTIME_005;
  exports$1.RUNTIME_006 = require_error_codes2.RUNTIME_006;
  exports$1.RUNTIME_007 = require_error_codes2.RUNTIME_007;
  exports$1.RUNTIME_008 = require_error_codes2.RUNTIME_008;
  exports$1.RUNTIME_009 = require_error_codes2.RUNTIME_009;
  exports$1.RUNTIME_010 = require_error_codes2.RUNTIME_010;
  exports$1.RUNTIME_011 = require_error_codes2.RUNTIME_011;
  exports$1.TYPE_001 = require_error_codes2.TYPE_001;
  exports$1.buildDescMap = require_desc.buildDescMap;
  exports$1.errorDescMap = require_desc.errorDescMap;
  exports$1.getShortErrorMsg = require_getShortErrorMsg.getShortErrorMsg;
  exports$1.runtimeDescMap = require_desc.runtimeDescMap;
  exports$1.typeDescMap = require_desc.typeDescMap;
})(dist);
const require_logger$a = logger$3;
const require_global$5 = global;
const require_constant$3 = constant;
let _module_federation_sdk$7 = dist$1;
let _module_federation_error_codes$6 = dist;
const importCallback = ".then(callbacks[0]).catch(callbacks[1])";
async function loadEsmEntry({ entry, remoteEntryExports }) {
  return new Promise((resolve, reject) => {
    try {
      if (!remoteEntryExports) if (typeof FEDERATION_ALLOW_NEW_FUNCTION !== "undefined") new Function("callbacks", `import("${entry}")${importCallback}`)([resolve, reject]);
      else import(
        /* webpackIgnore: true */
        /* @vite-ignore */
        entry
      ).then(resolve).catch(reject);
      else resolve(remoteEntryExports);
    } catch (e) {
      require_logger$a.error(`Failed to load ESM entry from "${entry}". ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}
async function loadSystemJsEntry({ entry, remoteEntryExports }) {
  return new Promise((resolve, reject) => {
    try {
      if (!remoteEntryExports) if (typeof __system_context__ === "undefined") System.import(entry).then(resolve).catch(reject);
      else new Function("callbacks", `System.import("${entry}")${importCallback}`)([resolve, reject]);
      else resolve(remoteEntryExports);
    } catch (e) {
      require_logger$a.error(`Failed to load SystemJS entry from "${entry}". ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}
function handleRemoteEntryLoaded(name, globalName, entry) {
  const { remoteEntryKey, entryExports } = require_global$5.getRemoteEntryExports(name, globalName);
  if (!entryExports) require_logger$a.error(_module_federation_error_codes$6.RUNTIME_001, _module_federation_error_codes$6.runtimeDescMap, {
    remoteName: name,
    remoteEntryUrl: entry,
    remoteEntryKey
  });
  return entryExports;
}
async function loadEntryScript({ name, globalName, entry, loaderHook, getEntryUrl }) {
  const { entryExports: remoteEntryExports } = require_global$5.getRemoteEntryExports(name, globalName);
  if (remoteEntryExports) return remoteEntryExports;
  const url = getEntryUrl ? getEntryUrl(entry) : entry;
  return (0, _module_federation_sdk$7.loadScript)(url, {
    attrs: {},
    createScriptHook: (url2, attrs) => {
      const res = loaderHook.lifecycle.createScript.emit({
        url: url2,
        attrs
      });
      if (!res) return;
      if (res instanceof HTMLScriptElement) return res;
      if ("script" in res || "timeout" in res) return res;
    }
  }).then(() => {
    return handleRemoteEntryLoaded(name, globalName, entry);
  }, (loadError) => {
    const originalMsg = loadError instanceof Error ? loadError.message : String(loadError);
    require_logger$a.error(_module_federation_error_codes$6.RUNTIME_008, _module_federation_error_codes$6.runtimeDescMap, {
      remoteName: name,
      resourceUrl: url
    }, originalMsg);
  });
}
async function loadEntryDom({ remoteInfo, remoteEntryExports, loaderHook, getEntryUrl }) {
  const { entry, entryGlobalName: globalName, name, type: type2 } = remoteInfo;
  switch (type2) {
    case "esm":
    case "module":
      return loadEsmEntry({
        entry,
        remoteEntryExports
      });
    case "system":
      return loadSystemJsEntry({
        entry,
        remoteEntryExports
      });
    default:
      return loadEntryScript({
        entry,
        globalName,
        name,
        loaderHook,
        getEntryUrl
      });
  }
}
function getRemoteEntryUniqueKey(remoteInfo) {
  const { entry, name } = remoteInfo;
  return (0, _module_federation_sdk$7.composeKeyWithSeparator)(name, entry);
}
async function getRemoteEntry(params) {
  const { origin, remoteEntryExports, remoteInfo, getEntryUrl, _inErrorHandling = false } = params;
  const uniqueKey = getRemoteEntryUniqueKey(remoteInfo);
  if (remoteEntryExports) return remoteEntryExports;
  if (!require_global$5.globalLoading[uniqueKey]) {
    const loadEntryHook = origin.remoteHandler.hooks.lifecycle.loadEntry;
    const loaderHook = origin.loaderHook;
    require_global$5.globalLoading[uniqueKey] = loadEntryHook.emit({
      loaderHook,
      remoteInfo,
      remoteEntryExports
    }).then((res) => {
      if (res) return res;
      return loadEntryDom({
        remoteInfo,
        remoteEntryExports,
        loaderHook,
        getEntryUrl
      });
    }).catch(async (err) => {
      const uniqueKey2 = getRemoteEntryUniqueKey(remoteInfo);
      const isScriptExecutionError = err instanceof Error && err.message.includes("ScriptExecutionError");
      if (err instanceof Error && err.message.includes(_module_federation_error_codes$6.RUNTIME_008) && !isScriptExecutionError && !_inErrorHandling) {
        const wrappedGetRemoteEntry = (params2) => {
          return getRemoteEntry({
            ...params2,
            _inErrorHandling: true
          });
        };
        const RemoteEntryExports = await origin.loaderHook.lifecycle.loadEntryError.emit({
          getRemoteEntry: wrappedGetRemoteEntry,
          origin,
          remoteInfo,
          remoteEntryExports,
          globalLoading: require_global$5.globalLoading,
          uniqueKey: uniqueKey2
        });
        if (RemoteEntryExports) return RemoteEntryExports;
      }
      throw err;
    });
  }
  return require_global$5.globalLoading[uniqueKey];
}
function getRemoteInfo(remote2) {
  return {
    ...remote2,
    entry: "entry" in remote2 ? remote2.entry : "",
    type: remote2.type || require_constant$3.DEFAULT_REMOTE_TYPE,
    entryGlobalName: remote2.entryGlobalName || remote2.name,
    shareScope: remote2.shareScope || require_constant$3.DEFAULT_SCOPE
  };
}
load.getRemoteEntry = getRemoteEntry;
load.getRemoteEntryUniqueKey = getRemoteEntryUniqueKey;
load.getRemoteInfo = getRemoteInfo;
var env = {};
function getBuilderId$1() {
  return typeof FEDERATION_BUILD_IDENTIFIER !== "undefined" ? FEDERATION_BUILD_IDENTIFIER : "";
}
env.getBuilderId = getBuilderId$1;
var plugin = {};
const require_global$4 = global;
function registerPlugins(plugins, instance) {
  const globalPlugins = require_global$4.getGlobalHostPlugins();
  const hookInstances = [
    instance.hooks,
    instance.remoteHandler.hooks,
    instance.sharedHandler.hooks,
    instance.snapshotHandler.hooks,
    instance.loaderHook,
    instance.bridgeHook
  ];
  if (globalPlugins.length > 0) globalPlugins.forEach((plugin2) => {
    if (plugins == null ? void 0 : plugins.find((item) => item.name !== plugin2.name)) plugins.push(plugin2);
  });
  if (plugins && plugins.length > 0) plugins.forEach((plugin2) => {
    hookInstances.forEach((hookInstance) => {
      hookInstance.applyPlugin(plugin2, instance);
    });
  });
  return plugins;
}
plugin.registerPlugins = registerPlugins;
var context = {};
function remoteToEntry(r) {
  return {
    name: r.name,
    alias: r.alias,
    entry: "entry" in r ? r.entry : void 0,
    version: "version" in r ? r.version : void 0,
    type: r.type,
    entryGlobalName: r.entryGlobalName,
    shareScope: r.shareScope
  };
}
function optionsToMFContext(options) {
  var _a, _b, _c, _d, _e, _f;
  const shared2 = {};
  for (const [pkgName, versions] of Object.entries(options.shared)) {
    const first = versions[0];
    if (first) shared2[pkgName] = {
      version: first.version,
      singleton: (_a = first.shareConfig) == null ? void 0 : _a.singleton,
      requiredVersion: ((_b = first.shareConfig) == null ? void 0 : _b.requiredVersion) === false ? false : (_c = first.shareConfig) == null ? void 0 : _c.requiredVersion,
      eager: first.eager,
      strictVersion: (_d = first.shareConfig) == null ? void 0 : _d.strictVersion
    };
  }
  return {
    project: {
      name: options.name,
      mfRole: ((_e = options.remotes) == null ? void 0 : _e.length) > 0 ? "host" : "unknown"
    },
    mfConfig: {
      name: options.name,
      remotes: ((_f = options.remotes) == null ? void 0 : _f.map(remoteToEntry)) ?? [],
      shared: shared2
    }
  };
}
context.optionsToMFContext = optionsToMFContext;
var helpers = {};
var preload = {};
const require_logger$9 = logger$3;
const require_manifest$2 = manifest;
const require_load$4 = load;
let _module_federation_sdk$6 = dist$1;
function defaultPreloadArgs(preloadConfig) {
  return {
    resourceCategory: "sync",
    share: true,
    depsRemote: true,
    prefetchInterface: false,
    ...preloadConfig
  };
}
function formatPreloadArgs(remotes, preloadArgs) {
  return preloadArgs.map((args) => {
    const remoteInfo = require_manifest$2.matchRemote(remotes, args.nameOrAlias);
    require_logger$9.assert(remoteInfo, `Unable to preload ${args.nameOrAlias} as it is not included in ${!remoteInfo && (0, _module_federation_sdk$6.safeToString)({
      remoteInfo,
      remotes
    })}`);
    return {
      remote: remoteInfo,
      preloadConfig: defaultPreloadArgs(args)
    };
  });
}
function normalizePreloadExposes(exposes) {
  if (!exposes) return [];
  return exposes.map((expose) => {
    if (expose === ".") return expose;
    if (expose.startsWith("./")) return expose.replace("./", "");
    return expose;
  });
}
function preloadAssets(remoteInfo, host, assets, useLinkPreload = true) {
  const { cssAssets, jsAssetsWithoutEntry, entryAssets } = assets;
  if (host.options.inBrowser) {
    entryAssets.forEach((asset) => {
      const { moduleInfo } = asset;
      const module = host.moduleCache.get(remoteInfo.name);
      if (module) require_load$4.getRemoteEntry({
        origin: host,
        remoteInfo: moduleInfo,
        remoteEntryExports: module.remoteEntryExports
      });
      else require_load$4.getRemoteEntry({
        origin: host,
        remoteInfo: moduleInfo,
        remoteEntryExports: void 0
      });
    });
    if (useLinkPreload) {
      const defaultAttrs = {
        rel: "preload",
        as: "style"
      };
      cssAssets.forEach((cssUrl) => {
        const { link: cssEl, needAttach } = (0, _module_federation_sdk$6.createLink)({
          url: cssUrl,
          cb: () => {
          },
          attrs: defaultAttrs,
          createLinkHook: (url, attrs) => {
            const res = host.loaderHook.lifecycle.createLink.emit({
              url,
              attrs
            });
            if (res instanceof HTMLLinkElement) return res;
          }
        });
        needAttach && document.head.appendChild(cssEl);
      });
    } else {
      const defaultAttrs = {
        rel: "stylesheet",
        type: "text/css"
      };
      cssAssets.forEach((cssUrl) => {
        const { link: cssEl, needAttach } = (0, _module_federation_sdk$6.createLink)({
          url: cssUrl,
          cb: () => {
          },
          attrs: defaultAttrs,
          createLinkHook: (url, attrs) => {
            const res = host.loaderHook.lifecycle.createLink.emit({
              url,
              attrs
            });
            if (res instanceof HTMLLinkElement) return res;
          },
          needDeleteLink: false
        });
        needAttach && document.head.appendChild(cssEl);
      });
    }
    if (useLinkPreload) {
      const defaultAttrs = {
        rel: "preload",
        as: "script"
      };
      jsAssetsWithoutEntry.forEach((jsUrl) => {
        const { link: linkEl, needAttach } = (0, _module_federation_sdk$6.createLink)({
          url: jsUrl,
          cb: () => {
          },
          attrs: defaultAttrs,
          createLinkHook: (url, attrs) => {
            const res = host.loaderHook.lifecycle.createLink.emit({
              url,
              attrs
            });
            if (res instanceof HTMLLinkElement) return res;
          }
        });
        needAttach && document.head.appendChild(linkEl);
      });
    } else {
      const defaultAttrs = {
        fetchpriority: "high",
        type: (remoteInfo == null ? void 0 : remoteInfo.type) === "module" ? "module" : "text/javascript"
      };
      jsAssetsWithoutEntry.forEach((jsUrl) => {
        const { script: scriptEl, needAttach } = (0, _module_federation_sdk$6.createScript)({
          url: jsUrl,
          cb: () => {
          },
          attrs: defaultAttrs,
          createScriptHook: (url, attrs) => {
            const res = host.loaderHook.lifecycle.createScript.emit({
              url,
              attrs
            });
            if (res instanceof HTMLScriptElement) return res;
          },
          needDeleteScript: true
        });
        needAttach && document.head.appendChild(scriptEl);
      });
    }
  }
}
preload.defaultPreloadArgs = defaultPreloadArgs;
preload.formatPreloadArgs = formatPreloadArgs;
preload.normalizePreloadExposes = normalizePreloadExposes;
preload.preloadAssets = preloadAssets;
const require_global$3 = global;
const require_share$4 = share;
const require_manifest$1 = manifest;
const require_load$3 = load;
const require_preload$3 = preload;
const ShareUtils = {
  getRegisteredShare: require_share$4.getRegisteredShare,
  getGlobalShareScope: require_share$4.getGlobalShareScope
};
const GlobalUtils = {
  Global: require_global$3.Global,
  nativeGlobal: require_global$3.nativeGlobal,
  resetFederationGlobalInfo: require_global$3.resetFederationGlobalInfo,
  setGlobalFederationInstance: require_global$3.setGlobalFederationInstance,
  getGlobalFederationConstructor: require_global$3.getGlobalFederationConstructor,
  setGlobalFederationConstructor: require_global$3.setGlobalFederationConstructor,
  getInfoWithoutType: require_global$3.getInfoWithoutType,
  getGlobalSnapshot: require_global$3.getGlobalSnapshot,
  getTargetSnapshotInfoByModuleInfo: require_global$3.getTargetSnapshotInfoByModuleInfo,
  getGlobalSnapshotInfoByModuleInfo: require_global$3.getGlobalSnapshotInfoByModuleInfo,
  setGlobalSnapshotInfoByModuleInfo: require_global$3.setGlobalSnapshotInfoByModuleInfo,
  addGlobalSnapshot: require_global$3.addGlobalSnapshot,
  getRemoteEntryExports: require_global$3.getRemoteEntryExports,
  registerGlobalPlugins: require_global$3.registerGlobalPlugins,
  getGlobalHostPlugins: require_global$3.getGlobalHostPlugins,
  getPreloaded: require_global$3.getPreloaded,
  setPreloaded: require_global$3.setPreloaded
};
var helpers_default = {
  global: GlobalUtils,
  share: ShareUtils,
  utils: {
    matchRemoteWithNameAndExpose: require_manifest$1.matchRemoteWithNameAndExpose,
    preloadAssets: require_preload$3.preloadAssets,
    getRemoteInfo: require_load$3.getRemoteInfo
  }
};
helpers.default = helpers_default;
var module$1 = {};
const require_logger$8 = logger$3;
const require_tool$6 = tool;
const require_load$2 = load;
const require_context$3 = context;
let _module_federation_sdk$5 = dist$1;
let _module_federation_error_codes$5 = dist;
function createRemoteEntryInitOptions(remoteInfo, hostShareScopeMap, rawInitScope) {
  const localShareScopeMap = hostShareScopeMap;
  const shareScopeKeys = Array.isArray(remoteInfo.shareScope) ? remoteInfo.shareScope : [remoteInfo.shareScope];
  if (!shareScopeKeys.length) shareScopeKeys.push("default");
  shareScopeKeys.forEach((shareScopeKey) => {
    if (!localShareScopeMap[shareScopeKey]) localShareScopeMap[shareScopeKey] = {};
  });
  const remoteEntryInitOptions = {
    version: remoteInfo.version || "",
    shareScopeKeys: Array.isArray(remoteInfo.shareScope) ? shareScopeKeys : remoteInfo.shareScope || "default"
  };
  Object.defineProperty(remoteEntryInitOptions, "shareScopeMap", {
    value: localShareScopeMap,
    enumerable: false
  });
  return {
    remoteEntryInitOptions,
    shareScope: localShareScopeMap[shareScopeKeys[0]],
    initScope: rawInitScope ?? []
  };
}
var Module = class {
  constructor({ remoteInfo, host }) {
    this.inited = false;
    this.initing = false;
    this.lib = void 0;
    this.remoteInfo = remoteInfo;
    this.host = host;
  }
  async getEntry() {
    if (this.remoteEntryExports) return this.remoteEntryExports;
    const remoteEntryExports = await require_load$2.getRemoteEntry({
      origin: this.host,
      remoteInfo: this.remoteInfo,
      remoteEntryExports: this.remoteEntryExports
    });
    require_logger$8.assert(remoteEntryExports, `remoteEntryExports is undefined 
 ${(0, _module_federation_sdk$5.safeToString)(this.remoteInfo)}`);
    this.remoteEntryExports = remoteEntryExports;
    return this.remoteEntryExports;
  }
  async init(id, remoteSnapshot, rawInitScope) {
    const remoteEntryExports = await this.getEntry();
    if (this.inited) return remoteEntryExports;
    if (this.initPromise) {
      await this.initPromise;
      return remoteEntryExports;
    }
    this.initing = true;
    this.initPromise = (async () => {
      const { remoteEntryInitOptions, shareScope, initScope } = createRemoteEntryInitOptions(this.remoteInfo, this.host.shareScopeMap, rawInitScope);
      const initContainerOptions = await this.host.hooks.lifecycle.beforeInitContainer.emit({
        shareScope,
        remoteEntryInitOptions,
        initScope,
        remoteInfo: this.remoteInfo,
        origin: this.host
      });
      if (typeof (remoteEntryExports == null ? void 0 : remoteEntryExports.init) === "undefined") require_logger$8.error(_module_federation_error_codes$5.RUNTIME_002, _module_federation_error_codes$5.runtimeDescMap, {
        hostName: this.host.name,
        remoteName: this.remoteInfo.name,
        remoteEntryUrl: this.remoteInfo.entry,
        remoteEntryKey: this.remoteInfo.entryGlobalName
      }, void 0, require_context$3.optionsToMFContext(this.host.options));
      await remoteEntryExports.init(initContainerOptions.shareScope, initContainerOptions.initScope, initContainerOptions.remoteEntryInitOptions);
      await this.host.hooks.lifecycle.initContainer.emit({
        ...initContainerOptions,
        id,
        remoteSnapshot,
        remoteEntryExports
      });
      this.inited = true;
    })();
    try {
      await this.initPromise;
    } finally {
      this.initing = false;
      this.initPromise = void 0;
    }
    return remoteEntryExports;
  }
  async get(id, expose, options, remoteSnapshot) {
    const { loadFactory = true } = options || { loadFactory: true };
    const remoteEntryExports = await this.init(id, remoteSnapshot);
    this.lib = remoteEntryExports;
    let moduleFactory;
    moduleFactory = await this.host.loaderHook.lifecycle.getModuleFactory.emit({
      remoteEntryExports,
      expose,
      moduleInfo: this.remoteInfo
    });
    if (!moduleFactory) moduleFactory = await remoteEntryExports.get(expose);
    require_logger$8.assert(moduleFactory, `${require_tool$6.getFMId(this.remoteInfo)} remote don't export ${expose}.`);
    const symbolName = require_tool$6.processModuleAlias(this.remoteInfo.name, expose);
    const wrapModuleFactory = this.wraperFactory(moduleFactory, symbolName);
    if (!loadFactory) return wrapModuleFactory;
    return await wrapModuleFactory();
  }
  wraperFactory(moduleFactory, id) {
    function defineModuleId(res, id2) {
      if (res && typeof res === "object" && Object.isExtensible(res) && !Object.getOwnPropertyDescriptor(res, /* @__PURE__ */ Symbol.for("mf_module_id"))) Object.defineProperty(res, /* @__PURE__ */ Symbol.for("mf_module_id"), {
        value: id2,
        enumerable: false
      });
    }
    if (moduleFactory instanceof Promise) return async () => {
      const res = await moduleFactory();
      defineModuleId(res, id);
      return res;
    };
    else return () => {
      const res = moduleFactory();
      defineModuleId(res, id);
      return res;
    };
  }
};
module$1.Module = Module;
var core = {};
var syncHook = {};
var SyncHook = class {
  constructor(type2) {
    this.type = "";
    this.listeners = /* @__PURE__ */ new Set();
    if (type2) this.type = type2;
  }
  on(fn) {
    if (typeof fn === "function") this.listeners.add(fn);
  }
  once(fn) {
    const self = this;
    this.on(function wrapper(...args) {
      self.remove(wrapper);
      return fn.apply(null, args);
    });
  }
  emit(...data) {
    let result;
    if (this.listeners.size > 0) this.listeners.forEach((fn) => {
      result = fn(...data);
    });
    return result;
  }
  remove(fn) {
    this.listeners.delete(fn);
  }
  removeAll() {
    this.listeners.clear();
  }
};
syncHook.SyncHook = SyncHook;
var asyncHook = {};
const require_syncHook$4 = syncHook;
var AsyncHook = class extends require_syncHook$4.SyncHook {
  emit(...data) {
    let result;
    const ls = Array.from(this.listeners);
    if (ls.length > 0) {
      let i = 0;
      const call = (prev) => {
        if (prev === false) return false;
        else if (i < ls.length) return Promise.resolve(ls[i++].apply(null, data)).then(call);
        else return prev;
      };
      result = call();
    }
    return Promise.resolve(result);
  }
};
asyncHook.AsyncHook = AsyncHook;
var syncWaterfallHook = {};
const require_logger$7 = logger$3;
const require_tool$5 = tool;
const require_syncHook$3 = syncHook;
function checkReturnData(originalData, returnedData) {
  if (!require_tool$5.isObject(returnedData)) return false;
  if (originalData !== returnedData) {
    for (const key in originalData) if (!(key in returnedData)) return false;
  }
  return true;
}
var SyncWaterfallHook = class extends require_syncHook$3.SyncHook {
  constructor(type2) {
    super();
    this.onerror = require_logger$7.error;
    this.type = type2;
  }
  emit(data) {
    if (!require_tool$5.isObject(data)) require_logger$7.error(`The data for the "${this.type}" hook should be an object.`);
    for (const fn of this.listeners) try {
      const tempData = fn(data);
      if (checkReturnData(data, tempData)) data = tempData;
      else {
        this.onerror(`A plugin returned an unacceptable value for the "${this.type}" type.`);
        break;
      }
    } catch (e) {
      require_logger$7.warn(e);
      this.onerror(e);
    }
    return data;
  }
};
syncWaterfallHook.SyncWaterfallHook = SyncWaterfallHook;
syncWaterfallHook.checkReturnData = checkReturnData;
var asyncWaterfallHooks = {};
const require_logger$6 = logger$3;
const require_tool$4 = tool;
const require_syncHook$2 = syncHook;
const require_syncWaterfallHook$3 = syncWaterfallHook;
var AsyncWaterfallHook = class extends require_syncHook$2.SyncHook {
  constructor(type2) {
    super();
    this.onerror = require_logger$6.error;
    this.type = type2;
  }
  emit(data) {
    if (!require_tool$4.isObject(data)) require_logger$6.error(`The response data for the "${this.type}" hook must be an object.`);
    const ls = Array.from(this.listeners);
    if (ls.length > 0) {
      let i = 0;
      const processError = (e) => {
        require_logger$6.warn(e);
        this.onerror(e);
        return data;
      };
      const call = (prevData) => {
        if (require_syncWaterfallHook$3.checkReturnData(data, prevData)) {
          data = prevData;
          if (i < ls.length) try {
            return Promise.resolve(ls[i++](data)).then(call, processError);
          } catch (e) {
            return processError(e);
          }
        } else this.onerror(`A plugin returned an incorrect value for the "${this.type}" type.`);
        return data;
      };
      return Promise.resolve(call(data));
    }
    return Promise.resolve(data);
  }
};
asyncWaterfallHooks.AsyncWaterfallHook = AsyncWaterfallHook;
var pluginSystem = {};
const require_logger$5 = logger$3;
const require_tool$3 = tool;
var PluginSystem = class {
  constructor(lifecycle) {
    this.registerPlugins = {};
    this.lifecycle = lifecycle;
    this.lifecycleKeys = Object.keys(lifecycle);
  }
  applyPlugin(plugin2, instance) {
    var _a;
    require_logger$5.assert(require_tool$3.isPlainObject(plugin2), "Plugin configuration is invalid.");
    const pluginName = plugin2.name;
    require_logger$5.assert(pluginName, "A name must be provided by the plugin.");
    if (!this.registerPlugins[pluginName]) {
      this.registerPlugins[pluginName] = plugin2;
      (_a = plugin2.apply) == null ? void 0 : _a.call(plugin2, instance);
      Object.keys(this.lifecycle).forEach((key) => {
        const pluginLife = plugin2[key];
        if (pluginLife) this.lifecycle[key].on(pluginLife);
      });
    }
  }
  removePlugin(pluginName) {
    require_logger$5.assert(pluginName, "A name is required.");
    const plugin2 = this.registerPlugins[pluginName];
    require_logger$5.assert(plugin2, `The plugin "${pluginName}" is not registered.`);
    Object.keys(plugin2).forEach((key) => {
      if (key !== "name") this.lifecycle[key].remove(plugin2[key]);
    });
  }
};
pluginSystem.PluginSystem = PluginSystem;
var snapshot = {};
const require_logger$4 = logger$3;
const require_tool$2 = tool;
const require_preload$2 = preload;
let _module_federation_sdk$4 = dist$1;
let _module_federation_error_codes$4 = dist;
function assignRemoteInfo(remoteInfo, remoteSnapshot) {
  const remoteEntryInfo = require_tool$2.getRemoteEntryInfoFromSnapshot(remoteSnapshot);
  if (!remoteEntryInfo.url) require_logger$4.error(_module_federation_error_codes$4.RUNTIME_011, _module_federation_error_codes$4.runtimeDescMap, { remoteName: remoteInfo.name });
  let entryUrl = (0, _module_federation_sdk$4.getResourceUrl)(remoteSnapshot, remoteEntryInfo.url);
  if (!_module_federation_sdk$4.isBrowserEnvValue && !entryUrl.startsWith("http")) entryUrl = `https:${entryUrl}`;
  remoteInfo.type = remoteEntryInfo.type;
  remoteInfo.entryGlobalName = remoteEntryInfo.globalName;
  remoteInfo.entry = entryUrl;
  remoteInfo.version = remoteSnapshot.version;
  remoteInfo.buildVersion = remoteSnapshot.buildVersion;
}
function snapshotPlugin() {
  return {
    name: "snapshot-plugin",
    async afterResolve(args) {
      const { remote: remote2, pkgNameOrAlias, expose, origin, remoteInfo, id } = args;
      if (!require_tool$2.isRemoteInfoWithEntry(remote2) || !require_tool$2.isPureRemoteEntry(remote2)) {
        const { remoteSnapshot, globalSnapshot } = await origin.snapshotHandler.loadRemoteSnapshotInfo({
          moduleInfo: remote2,
          id
        });
        assignRemoteInfo(remoteInfo, remoteSnapshot);
        const preloadOptions = {
          remote: remote2,
          preloadConfig: {
            nameOrAlias: pkgNameOrAlias,
            exposes: [expose],
            resourceCategory: "sync",
            share: false,
            depsRemote: false
          }
        };
        const assets = await origin.remoteHandler.hooks.lifecycle.generatePreloadAssets.emit({
          origin,
          preloadOptions,
          remoteInfo,
          remote: remote2,
          remoteSnapshot,
          globalSnapshot
        });
        if (assets) require_preload$2.preloadAssets(remoteInfo, origin, assets, false);
        return {
          ...args,
          remoteSnapshot
        };
      }
      return args;
    }
  };
}
snapshot.assignRemoteInfo = assignRemoteInfo;
snapshot.snapshotPlugin = snapshotPlugin;
var generatePreloadAssets$1 = {};
const require_tool$1 = tool;
const require_global$2 = global;
const require_share$3 = share;
const require_preload$1 = preload;
const require_index$1$2 = snapshot;
let _module_federation_sdk$3 = dist$1;
function splitId(id) {
  const splitInfo = id.split(":");
  if (splitInfo.length === 1) return {
    name: splitInfo[0],
    version: void 0
  };
  else if (splitInfo.length === 2) return {
    name: splitInfo[0],
    version: splitInfo[1]
  };
  else return {
    name: splitInfo[1],
    version: splitInfo[2]
  };
}
function traverseModuleInfo(globalSnapshot, remoteInfo, traverse, isRoot, memo = {}, remoteSnapshot) {
  const { value: snapshotValue } = require_global$2.getInfoWithoutType(globalSnapshot, require_tool$1.getFMId(remoteInfo));
  const effectiveRemoteSnapshot = remoteSnapshot || snapshotValue;
  if (effectiveRemoteSnapshot && !(0, _module_federation_sdk$3.isManifestProvider)(effectiveRemoteSnapshot)) {
    traverse(effectiveRemoteSnapshot, remoteInfo, isRoot);
    if (effectiveRemoteSnapshot.remotesInfo) {
      const remoteKeys = Object.keys(effectiveRemoteSnapshot.remotesInfo);
      for (const key of remoteKeys) {
        if (memo[key]) continue;
        memo[key] = true;
        const subRemoteInfo = splitId(key);
        const remoteValue = effectiveRemoteSnapshot.remotesInfo[key];
        traverseModuleInfo(globalSnapshot, {
          name: subRemoteInfo.name,
          version: remoteValue.matchedVersion
        }, traverse, false, memo, void 0);
      }
    }
  }
}
const isExisted = (type2, url) => {
  return document.querySelector(`${type2}[${type2 === "link" ? "href" : "src"}="${url}"]`);
};
function generatePreloadAssets(origin, preloadOptions, remote2, globalSnapshot, remoteSnapshot) {
  const cssAssets = [];
  const jsAssets = [];
  const entryAssets = [];
  const loadedSharedJsAssets = /* @__PURE__ */ new Set();
  const loadedSharedCssAssets = /* @__PURE__ */ new Set();
  const { options } = origin;
  const { preloadConfig: rootPreloadConfig } = preloadOptions;
  const { depsRemote } = rootPreloadConfig;
  traverseModuleInfo(globalSnapshot, remote2, (moduleInfoSnapshot, remoteInfo, isRoot) => {
    var _a;
    let preloadConfig;
    if (isRoot) preloadConfig = rootPreloadConfig;
    else if (Array.isArray(depsRemote)) {
      const findPreloadConfig = depsRemote.find((remoteConfig) => {
        if (remoteConfig.nameOrAlias === remoteInfo.name || remoteConfig.nameOrAlias === remoteInfo.alias) return true;
        return false;
      });
      if (!findPreloadConfig) return;
      preloadConfig = require_preload$1.defaultPreloadArgs(findPreloadConfig);
    } else if (depsRemote === true) preloadConfig = rootPreloadConfig;
    else return;
    const remoteEntryUrl = (0, _module_federation_sdk$3.getResourceUrl)(moduleInfoSnapshot, require_tool$1.getRemoteEntryInfoFromSnapshot(moduleInfoSnapshot).url);
    if (remoteEntryUrl) entryAssets.push({
      name: remoteInfo.name,
      moduleInfo: {
        name: remoteInfo.name,
        entry: remoteEntryUrl,
        type: "remoteEntryType" in moduleInfoSnapshot ? moduleInfoSnapshot.remoteEntryType : "global",
        entryGlobalName: "globalName" in moduleInfoSnapshot ? moduleInfoSnapshot.globalName : remoteInfo.name,
        shareScope: "",
        version: "version" in moduleInfoSnapshot ? moduleInfoSnapshot.version : void 0
      },
      url: remoteEntryUrl
    });
    let moduleAssetsInfo = "modules" in moduleInfoSnapshot ? moduleInfoSnapshot.modules : [];
    const normalizedPreloadExposes = require_preload$1.normalizePreloadExposes(preloadConfig.exposes);
    if (normalizedPreloadExposes.length && "modules" in moduleInfoSnapshot) moduleAssetsInfo = (_a = moduleInfoSnapshot == null ? void 0 : moduleInfoSnapshot.modules) == null ? void 0 : _a.reduce((assets, moduleAssetInfo) => {
      if ((normalizedPreloadExposes == null ? void 0 : normalizedPreloadExposes.indexOf(moduleAssetInfo.moduleName)) !== -1) assets.push(moduleAssetInfo);
      return assets;
    }, []);
    function handleAssets(assets) {
      const assetsRes = assets.map((asset) => (0, _module_federation_sdk$3.getResourceUrl)(moduleInfoSnapshot, asset));
      if (preloadConfig.filter) return assetsRes.filter(preloadConfig.filter);
      return assetsRes;
    }
    if (moduleAssetsInfo) {
      const assetsLength = moduleAssetsInfo.length;
      for (let index = 0; index < assetsLength; index++) {
        const assetsInfo = moduleAssetsInfo[index];
        const exposeFullPath = `${remoteInfo.name}/${assetsInfo.moduleName}`;
        origin.remoteHandler.hooks.lifecycle.handlePreloadModule.emit({
          id: assetsInfo.moduleName === "." ? remoteInfo.name : exposeFullPath,
          name: remoteInfo.name,
          remoteSnapshot: moduleInfoSnapshot,
          preloadConfig,
          remote: remoteInfo,
          origin
        });
        if (require_global$2.getPreloaded(exposeFullPath)) continue;
        if (preloadConfig.resourceCategory === "all") {
          cssAssets.push(...handleAssets(assetsInfo.assets.css.async));
          cssAssets.push(...handleAssets(assetsInfo.assets.css.sync));
          jsAssets.push(...handleAssets(assetsInfo.assets.js.async));
          jsAssets.push(...handleAssets(assetsInfo.assets.js.sync));
        } else if (preloadConfig.resourceCategory === "sync") {
          cssAssets.push(...handleAssets(assetsInfo.assets.css.sync));
          jsAssets.push(...handleAssets(assetsInfo.assets.js.sync));
        }
        require_global$2.setPreloaded(exposeFullPath);
      }
    }
  }, true, {}, remoteSnapshot);
  if (remoteSnapshot.shared && remoteSnapshot.shared.length > 0) {
    const collectSharedAssets = (shareInfo, snapshotShared) => {
      const { shared: registeredShared } = require_share$3.getRegisteredShare(origin.shareScopeMap, snapshotShared.sharedName, shareInfo, origin.sharedHandler.hooks.lifecycle.resolveShare) || {};
      if (registeredShared && typeof registeredShared.lib === "function") {
        snapshotShared.assets.js.sync.forEach((asset) => {
          loadedSharedJsAssets.add(asset);
        });
        snapshotShared.assets.css.sync.forEach((asset) => {
          loadedSharedCssAssets.add(asset);
        });
      }
    };
    remoteSnapshot.shared.forEach((shared2) => {
      var _a;
      const shareInfos = (_a = options.shared) == null ? void 0 : _a[shared2.sharedName];
      if (!shareInfos) return;
      const sharedOptions = shared2.version ? shareInfos.find((s) => s.version === shared2.version) : shareInfos;
      if (!sharedOptions) return;
      require_tool$1.arrayOptions(sharedOptions).forEach((s) => {
        collectSharedAssets(s, shared2);
      });
    });
  }
  const needPreloadJsAssets = jsAssets.filter((asset) => !loadedSharedJsAssets.has(asset) && !isExisted("script", asset));
  return {
    cssAssets: cssAssets.filter((asset) => !loadedSharedCssAssets.has(asset) && !isExisted("link", asset)),
    jsAssetsWithoutEntry: needPreloadJsAssets,
    entryAssets: entryAssets.filter((entry) => !isExisted("script", entry.url))
  };
}
const generatePreloadAssetsPlugin = function() {
  return {
    name: "generate-preload-assets-plugin",
    async generatePreloadAssets(args) {
      const { origin, preloadOptions, remoteInfo, remote: remote2, globalSnapshot, remoteSnapshot } = args;
      if (!_module_federation_sdk$3.isBrowserEnvValue) return {
        cssAssets: [],
        jsAssetsWithoutEntry: [],
        entryAssets: []
      };
      if (require_tool$1.isRemoteInfoWithEntry(remote2) && require_tool$1.isPureRemoteEntry(remote2)) return {
        cssAssets: [],
        jsAssetsWithoutEntry: [],
        entryAssets: [{
          name: remote2.name,
          url: remote2.entry,
          moduleInfo: {
            name: remoteInfo.name,
            entry: remote2.entry,
            type: remoteInfo.type || "global",
            entryGlobalName: "",
            shareScope: ""
          }
        }]
      };
      require_index$1$2.assignRemoteInfo(remoteInfo, remoteSnapshot);
      return generatePreloadAssets(origin, preloadOptions, remoteInfo, globalSnapshot, remoteSnapshot);
    }
  };
};
generatePreloadAssets$1.generatePreloadAssetsPlugin = generatePreloadAssetsPlugin;
var SnapshotHandler$1 = {};
const require_logger$3 = logger$3;
const require_tool = tool;
const require_global$1 = global;
const require_context$2 = context;
const require_asyncHook$3 = asyncHook;
const require_asyncWaterfallHooks$3 = asyncWaterfallHooks;
const require_pluginSystem$3 = pluginSystem;
let _module_federation_sdk$2 = dist$1;
let _module_federation_error_codes$3 = dist;
function getGlobalRemoteInfo(moduleInfo, origin) {
  const hostGlobalSnapshot = require_global$1.getGlobalSnapshotInfoByModuleInfo({
    name: origin.name,
    version: origin.options.version
  });
  const globalRemoteInfo = hostGlobalSnapshot && "remotesInfo" in hostGlobalSnapshot && hostGlobalSnapshot.remotesInfo && require_global$1.getInfoWithoutType(hostGlobalSnapshot.remotesInfo, moduleInfo.name).value;
  if (globalRemoteInfo && globalRemoteInfo.matchedVersion) return {
    hostGlobalSnapshot,
    globalSnapshot: require_global$1.getGlobalSnapshot(),
    remoteSnapshot: require_global$1.getGlobalSnapshotInfoByModuleInfo({
      name: moduleInfo.name,
      version: globalRemoteInfo.matchedVersion
    })
  };
  return {
    hostGlobalSnapshot: void 0,
    globalSnapshot: require_global$1.getGlobalSnapshot(),
    remoteSnapshot: require_global$1.getGlobalSnapshotInfoByModuleInfo({
      name: moduleInfo.name,
      version: "version" in moduleInfo ? moduleInfo.version : void 0
    })
  };
}
var SnapshotHandler = class {
  constructor(HostInstance) {
    this.loadingHostSnapshot = null;
    this.manifestCache = /* @__PURE__ */ new Map();
    this.hooks = new require_pluginSystem$3.PluginSystem({
      beforeLoadRemoteSnapshot: new require_asyncHook$3.AsyncHook("beforeLoadRemoteSnapshot"),
      loadSnapshot: new require_asyncWaterfallHooks$3.AsyncWaterfallHook("loadGlobalSnapshot"),
      loadRemoteSnapshot: new require_asyncWaterfallHooks$3.AsyncWaterfallHook("loadRemoteSnapshot"),
      afterLoadSnapshot: new require_asyncWaterfallHooks$3.AsyncWaterfallHook("afterLoadSnapshot")
    });
    this.manifestLoading = require_global$1.Global.__FEDERATION__.__MANIFEST_LOADING__;
    this.HostInstance = HostInstance;
    this.loaderHook = HostInstance.loaderHook;
  }
  async loadRemoteSnapshotInfo({ moduleInfo, id, expose }) {
    const { options } = this.HostInstance;
    await this.hooks.lifecycle.beforeLoadRemoteSnapshot.emit({
      options,
      moduleInfo
    });
    let hostSnapshot = require_global$1.getGlobalSnapshotInfoByModuleInfo({
      name: this.HostInstance.options.name,
      version: this.HostInstance.options.version
    });
    if (!hostSnapshot) {
      hostSnapshot = {
        version: this.HostInstance.options.version || "",
        remoteEntry: "",
        remotesInfo: {}
      };
      require_global$1.addGlobalSnapshot({ [this.HostInstance.options.name]: hostSnapshot });
    }
    if (hostSnapshot && "remotesInfo" in hostSnapshot && !require_global$1.getInfoWithoutType(hostSnapshot.remotesInfo, moduleInfo.name).value) {
      if ("version" in moduleInfo || "entry" in moduleInfo) hostSnapshot.remotesInfo = {
        ...hostSnapshot == null ? void 0 : hostSnapshot.remotesInfo,
        [moduleInfo.name]: { matchedVersion: "version" in moduleInfo ? moduleInfo.version : moduleInfo.entry }
      };
    }
    const { hostGlobalSnapshot, remoteSnapshot, globalSnapshot } = this.getGlobalRemoteInfo(moduleInfo);
    const { remoteSnapshot: globalRemoteSnapshot, globalSnapshot: globalSnapshotRes } = await this.hooks.lifecycle.loadSnapshot.emit({
      options,
      moduleInfo,
      hostGlobalSnapshot,
      remoteSnapshot,
      globalSnapshot
    });
    let mSnapshot;
    let gSnapshot;
    if (globalRemoteSnapshot) if ((0, _module_federation_sdk$2.isManifestProvider)(globalRemoteSnapshot)) {
      const remoteEntry = _module_federation_sdk$2.isBrowserEnvValue ? globalRemoteSnapshot.remoteEntry : globalRemoteSnapshot.ssrRemoteEntry || globalRemoteSnapshot.remoteEntry || "";
      const moduleSnapshot = await this.getManifestJson(remoteEntry, moduleInfo, {});
      const globalSnapshotRes2 = require_global$1.setGlobalSnapshotInfoByModuleInfo({
        ...moduleInfo,
        entry: remoteEntry
      }, moduleSnapshot);
      mSnapshot = moduleSnapshot;
      gSnapshot = globalSnapshotRes2;
    } else {
      const { remoteSnapshot: remoteSnapshotRes } = await this.hooks.lifecycle.loadRemoteSnapshot.emit({
        options: this.HostInstance.options,
        moduleInfo,
        remoteSnapshot: globalRemoteSnapshot,
        from: "global"
      });
      mSnapshot = remoteSnapshotRes;
      gSnapshot = globalSnapshotRes;
    }
    else if (require_tool.isRemoteInfoWithEntry(moduleInfo)) {
      const moduleSnapshot = await this.getManifestJson(moduleInfo.entry, moduleInfo, {});
      const globalSnapshotRes2 = require_global$1.setGlobalSnapshotInfoByModuleInfo(moduleInfo, moduleSnapshot);
      const { remoteSnapshot: remoteSnapshotRes } = await this.hooks.lifecycle.loadRemoteSnapshot.emit({
        options: this.HostInstance.options,
        moduleInfo,
        remoteSnapshot: moduleSnapshot,
        from: "global"
      });
      mSnapshot = remoteSnapshotRes;
      gSnapshot = globalSnapshotRes2;
    } else require_logger$3.error(_module_federation_error_codes$3.RUNTIME_007, _module_federation_error_codes$3.runtimeDescMap, {
      remoteName: moduleInfo.name,
      remoteVersion: moduleInfo.version,
      hostName: this.HostInstance.options.name,
      globalSnapshot: JSON.stringify(globalSnapshotRes)
    }, void 0, require_context$2.optionsToMFContext(this.HostInstance.options));
    await this.hooks.lifecycle.afterLoadSnapshot.emit({
      id,
      host: this.HostInstance,
      options,
      moduleInfo,
      remoteSnapshot: mSnapshot
    });
    return {
      remoteSnapshot: mSnapshot,
      globalSnapshot: gSnapshot
    };
  }
  getGlobalRemoteInfo(moduleInfo) {
    return getGlobalRemoteInfo(moduleInfo, this.HostInstance);
  }
  async getManifestJson(manifestUrl, moduleInfo, extraOptions) {
    const getManifest = async () => {
      let manifestJson = this.manifestCache.get(manifestUrl);
      if (manifestJson) return manifestJson;
      try {
        let res = await this.loaderHook.lifecycle.fetch.emit(manifestUrl, {});
        if (!res || !(res instanceof Response)) res = await fetch(manifestUrl, {});
        manifestJson = await res.json();
      } catch (err) {
        manifestJson = await this.HostInstance.remoteHandler.hooks.lifecycle.errorLoadRemote.emit({
          id: manifestUrl,
          error: err,
          from: "runtime",
          lifecycle: "afterResolve",
          origin: this.HostInstance
        });
        if (!manifestJson) {
          delete this.manifestLoading[manifestUrl];
          require_logger$3.error(_module_federation_error_codes$3.RUNTIME_003, _module_federation_error_codes$3.runtimeDescMap, {
            manifestUrl,
            moduleName: moduleInfo.name,
            hostName: this.HostInstance.options.name
          }, `${err}`, require_context$2.optionsToMFContext(this.HostInstance.options));
        }
      }
      require_logger$3.assert(manifestJson.metaData && manifestJson.exposes && manifestJson.shared, `"${manifestUrl}" is not a valid federation manifest for remote "${moduleInfo.name}". Missing required fields: ${[
        !manifestJson.metaData && "metaData",
        !manifestJson.exposes && "exposes",
        !manifestJson.shared && "shared"
      ].filter(Boolean).join(", ")}.`);
      this.manifestCache.set(manifestUrl, manifestJson);
      return manifestJson;
    };
    const asyncLoadProcess = async () => {
      const manifestJson = await getManifest();
      const remoteSnapshot = (0, _module_federation_sdk$2.generateSnapshotFromManifest)(manifestJson, { version: manifestUrl });
      const { remoteSnapshot: remoteSnapshotRes } = await this.hooks.lifecycle.loadRemoteSnapshot.emit({
        options: this.HostInstance.options,
        moduleInfo,
        manifestJson,
        remoteSnapshot,
        manifestUrl,
        from: "manifest"
      });
      return remoteSnapshotRes;
    };
    if (!this.manifestLoading[manifestUrl]) this.manifestLoading[manifestUrl] = asyncLoadProcess().then((res) => res);
    return this.manifestLoading[manifestUrl];
  }
};
SnapshotHandler$1.SnapshotHandler = SnapshotHandler;
SnapshotHandler$1.getGlobalRemoteInfo = getGlobalRemoteInfo;
var shared = {};
const require_logger$2 = logger$3;
const require_constant$2 = constant;
const require_share$2 = share;
const require_context$1 = context;
const require_asyncHook$2 = asyncHook;
const require_syncWaterfallHook$2 = syncWaterfallHook;
const require_asyncWaterfallHooks$2 = asyncWaterfallHooks;
const require_pluginSystem$2 = pluginSystem;
let _module_federation_error_codes$2 = dist;
var SharedHandler = class {
  constructor(host) {
    this.hooks = new require_pluginSystem$2.PluginSystem({
      beforeRegisterShare: new require_syncWaterfallHook$2.SyncWaterfallHook("beforeRegisterShare"),
      afterResolve: new require_asyncWaterfallHooks$2.AsyncWaterfallHook("afterResolve"),
      beforeLoadShare: new require_asyncWaterfallHooks$2.AsyncWaterfallHook("beforeLoadShare"),
      loadShare: new require_asyncHook$2.AsyncHook(),
      resolveShare: new require_syncWaterfallHook$2.SyncWaterfallHook("resolveShare"),
      initContainerShareScopeMap: new require_syncWaterfallHook$2.SyncWaterfallHook("initContainerShareScopeMap")
    });
    this.host = host;
    this.shareScopeMap = {};
    this.initTokens = {};
    this._setGlobalShareScopeMap(host.options);
  }
  registerShared(globalOptions, userOptions) {
    const { newShareInfos, allShareInfos } = require_share$2.formatShareConfigs(globalOptions, userOptions);
    Object.keys(newShareInfos).forEach((sharedKey) => {
      newShareInfos[sharedKey].forEach((sharedVal) => {
        sharedVal.scope.forEach((sc) => {
          var _a;
          this.hooks.lifecycle.beforeRegisterShare.emit({
            origin: this.host,
            pkgName: sharedKey,
            shared: sharedVal
          });
          if (!((_a = this.shareScopeMap[sc]) == null ? void 0 : _a[sharedKey])) this.setShared({
            pkgName: sharedKey,
            lib: sharedVal.lib,
            get: sharedVal.get,
            loaded: sharedVal.loaded || Boolean(sharedVal.lib),
            shared: sharedVal,
            from: userOptions.name
          });
        });
      });
    });
    return {
      newShareInfos,
      allShareInfos
    };
  }
  async loadShare(pkgName, extraOptions) {
    const { host } = this;
    const shareOptions = require_share$2.getTargetSharedOptions({
      pkgName,
      extraOptions,
      shareInfos: host.options.shared
    });
    if (shareOptions == null ? void 0 : shareOptions.scope) await Promise.all(shareOptions.scope.map(async (shareScope) => {
      await Promise.all(this.initializeSharing(shareScope, { strategy: shareOptions.strategy }));
    }));
    const { shareInfo: shareOptionsRes } = await this.hooks.lifecycle.beforeLoadShare.emit({
      pkgName,
      shareInfo: shareOptions,
      shared: host.options.shared,
      origin: host
    });
    require_logger$2.assert(shareOptionsRes, `Cannot find shared "${pkgName}" in host "${host.options.name}". Ensure the shared config for "${pkgName}" is declared in the federation plugin options and the host has been initialized before loading shares.`);
    const { shared: registeredShared, useTreesShaking } = require_share$2.getRegisteredShare(this.shareScopeMap, pkgName, shareOptionsRes, this.hooks.lifecycle.resolveShare) || {};
    if (registeredShared) {
      const targetShared = require_share$2.directShare(registeredShared, useTreesShaking);
      if (targetShared.lib) {
        require_share$2.addUseIn(targetShared, host.options.name);
        return targetShared.lib;
      } else if (targetShared.loading && !targetShared.loaded) {
        const factory = await targetShared.loading;
        targetShared.loaded = true;
        if (!targetShared.lib) targetShared.lib = factory;
        require_share$2.addUseIn(targetShared, host.options.name);
        return factory;
      } else {
        const asyncLoadProcess = async () => {
          const factory = await targetShared.get();
          require_share$2.addUseIn(targetShared, host.options.name);
          targetShared.loaded = true;
          targetShared.lib = factory;
          return factory;
        };
        const loading = asyncLoadProcess();
        this.setShared({
          pkgName,
          loaded: false,
          shared: registeredShared,
          from: host.options.name,
          lib: null,
          loading,
          treeShaking: useTreesShaking ? targetShared : void 0
        });
        return loading;
      }
    } else {
      if (extraOptions == null ? void 0 : extraOptions.customShareInfo) return false;
      const _useTreeShaking = require_share$2.shouldUseTreeShaking(shareOptionsRes.treeShaking);
      const targetShared = require_share$2.directShare(shareOptionsRes, _useTreeShaking);
      const asyncLoadProcess = async () => {
        const factory = await targetShared.get();
        targetShared.lib = factory;
        targetShared.loaded = true;
        require_share$2.addUseIn(targetShared, host.options.name);
        const { shared: gShared, useTreesShaking: gUseTreeShaking } = require_share$2.getRegisteredShare(this.shareScopeMap, pkgName, shareOptionsRes, this.hooks.lifecycle.resolveShare) || {};
        if (gShared) {
          const targetGShared = require_share$2.directShare(gShared, gUseTreeShaking);
          targetGShared.lib = factory;
          targetGShared.loaded = true;
          gShared.from = shareOptionsRes.from;
        }
        return factory;
      };
      const loading = asyncLoadProcess();
      this.setShared({
        pkgName,
        loaded: false,
        shared: shareOptionsRes,
        from: host.options.name,
        lib: null,
        loading,
        treeShaking: _useTreeShaking ? targetShared : void 0
      });
      return loading;
    }
  }
  /**
  * This function initializes the sharing sequence (executed only once per share scope).
  * It accepts one argument, the name of the share scope.
  * If the share scope does not exist, it creates one.
  */
  initializeSharing(shareScopeName2 = require_constant$2.DEFAULT_SCOPE, extraOptions) {
    const { host } = this;
    const from = extraOptions == null ? void 0 : extraOptions.from;
    const strategy = extraOptions == null ? void 0 : extraOptions.strategy;
    let initScope = extraOptions == null ? void 0 : extraOptions.initScope;
    const promises = [];
    if (from !== "build") {
      const { initTokens: initTokens2 } = this;
      if (!initScope) initScope = [];
      let initToken = initTokens2[shareScopeName2];
      if (!initToken) initToken = initTokens2[shareScopeName2] = { from: this.host.name };
      if (initScope.indexOf(initToken) >= 0) return promises;
      initScope.push(initToken);
    }
    const shareScope = this.shareScopeMap;
    const hostName = host.options.name;
    if (!shareScope[shareScopeName2]) shareScope[shareScopeName2] = {};
    const scope = shareScope[shareScopeName2];
    const register = (name, shared2) => {
      var _a;
      const { version, eager } = shared2;
      scope[name] = scope[name] || {};
      const versions = scope[name];
      const activeVersion = versions[version] && require_share$2.directShare(versions[version]);
      const activeVersionEager = Boolean(activeVersion && ("eager" in activeVersion && activeVersion.eager || "shareConfig" in activeVersion && ((_a = activeVersion.shareConfig) == null ? void 0 : _a.eager)));
      if (!activeVersion || activeVersion.strategy !== "loaded-first" && !activeVersion.loaded && (Boolean(!eager) !== !activeVersionEager ? eager : hostName > versions[version].from)) versions[version] = shared2;
    };
    const initRemoteModule = async (key) => {
      const { module } = await host.remoteHandler.getRemoteModuleAndOptions({ id: key });
      let remoteEntryExports = void 0;
      try {
        remoteEntryExports = await module.getEntry();
      } catch (error2) {
        remoteEntryExports = await host.remoteHandler.hooks.lifecycle.errorLoadRemote.emit({
          id: key,
          error: error2,
          from: "runtime",
          lifecycle: "beforeLoadShare",
          origin: host
        });
        if (!remoteEntryExports) return;
      } finally {
        if ((remoteEntryExports == null ? void 0 : remoteEntryExports.init) && !module.initing) {
          module.remoteEntryExports = remoteEntryExports;
          await module.init(void 0, void 0, initScope);
        }
      }
    };
    Object.keys(host.options.shared).forEach((shareName) => {
      host.options.shared[shareName].forEach((shared2) => {
        if (shared2.scope.includes(shareScopeName2)) register(shareName, shared2);
      });
    });
    if (host.options.shareStrategy === "version-first" || strategy === "version-first") host.options.remotes.forEach((remote2) => {
      if (remote2.shareScope === shareScopeName2) promises.push(initRemoteModule(remote2.name));
    });
    return promises;
  }
  loadShareSync(pkgName, extraOptions) {
    const { host } = this;
    const shareOptions = require_share$2.getTargetSharedOptions({
      pkgName,
      extraOptions,
      shareInfos: host.options.shared
    });
    if (shareOptions == null ? void 0 : shareOptions.scope) shareOptions.scope.forEach((shareScope) => {
      this.initializeSharing(shareScope, { strategy: shareOptions.strategy });
    });
    const { shared: registeredShared, useTreesShaking } = require_share$2.getRegisteredShare(this.shareScopeMap, pkgName, shareOptions, this.hooks.lifecycle.resolveShare) || {};
    if (registeredShared) {
      if (typeof registeredShared.lib === "function") {
        require_share$2.addUseIn(registeredShared, host.options.name);
        if (!registeredShared.loaded) {
          registeredShared.loaded = true;
          if (registeredShared.from === host.options.name) shareOptions.loaded = true;
        }
        return registeredShared.lib;
      }
      if (typeof registeredShared.get === "function") {
        const module = registeredShared.get();
        if (!(module instanceof Promise)) {
          require_share$2.addUseIn(registeredShared, host.options.name);
          this.setShared({
            pkgName,
            loaded: true,
            from: host.options.name,
            lib: module,
            shared: registeredShared
          });
          return module;
        }
      }
    }
    if (shareOptions.lib) {
      if (!shareOptions.loaded) shareOptions.loaded = true;
      return shareOptions.lib;
    }
    if (shareOptions.get) {
      const module = shareOptions.get();
      if (module instanceof Promise) require_logger$2.error((extraOptions == null ? void 0 : extraOptions.from) === "build" ? _module_federation_error_codes$2.RUNTIME_005 : _module_federation_error_codes$2.RUNTIME_006, _module_federation_error_codes$2.runtimeDescMap, {
        hostName: host.options.name,
        sharedPkgName: pkgName
      }, void 0, require_context$1.optionsToMFContext(host.options));
      shareOptions.lib = module;
      this.setShared({
        pkgName,
        loaded: true,
        from: host.options.name,
        lib: shareOptions.lib,
        shared: shareOptions
      });
      return shareOptions.lib;
    }
    require_logger$2.error(_module_federation_error_codes$2.RUNTIME_006, _module_federation_error_codes$2.runtimeDescMap, {
      hostName: host.options.name,
      sharedPkgName: pkgName
    }, void 0, require_context$1.optionsToMFContext(host.options));
  }
  initShareScopeMap(scopeName, shareScope, extraOptions = {}) {
    const { host } = this;
    this.shareScopeMap[scopeName] = shareScope;
    this.hooks.lifecycle.initContainerShareScopeMap.emit({
      shareScope,
      options: host.options,
      origin: host,
      scopeName,
      hostShareScopeMap: extraOptions.hostShareScopeMap
    });
  }
  setShared({ pkgName, shared: shared2, from, lib, loading, loaded, get, treeShaking }) {
    const { version, scope = "default", ...shareInfo } = shared2;
    const scopes = Array.isArray(scope) ? scope : [scope];
    const mergeAttrs = (shared3) => {
      const merge = (s, key, val) => {
        if (val && !s[key]) s[key] = val;
      };
      const targetShared = treeShaking ? shared3.treeShaking : shared3;
      merge(targetShared, "loaded", loaded);
      merge(targetShared, "loading", loading);
      merge(targetShared, "get", get);
    };
    scopes.forEach((sc) => {
      if (!this.shareScopeMap[sc]) this.shareScopeMap[sc] = {};
      if (!this.shareScopeMap[sc][pkgName]) this.shareScopeMap[sc][pkgName] = {};
      if (!this.shareScopeMap[sc][pkgName][version]) this.shareScopeMap[sc][pkgName][version] = {
        version,
        scope: [sc],
        ...shareInfo,
        lib
      };
      const registeredShared = this.shareScopeMap[sc][pkgName][version];
      mergeAttrs(registeredShared);
      if (from && registeredShared.from !== from) registeredShared.from = from;
    });
  }
  _setGlobalShareScopeMap(hostOptions) {
    const globalShareScopeMap = require_share$2.getGlobalShareScope();
    const identifier = hostOptions.id || hostOptions.name;
    if (identifier && !globalShareScopeMap[identifier]) globalShareScopeMap[identifier] = this.shareScopeMap;
  }
};
shared.SharedHandler = SharedHandler;
var remote = {};
const require_logger$1 = logger$3;
const require_global = global;
const require_constant$1 = constant;
const require_share$1 = share;
const require_manifest = manifest;
const require_load$1 = load;
const require_context = context;
const require_preload = preload;
const require_index$1$1 = module$1;
const require_syncHook$1 = syncHook;
const require_asyncHook$1 = asyncHook;
const require_syncWaterfallHook$1 = syncWaterfallHook;
const require_asyncWaterfallHooks$1 = asyncWaterfallHooks;
const require_pluginSystem$1 = pluginSystem;
const require_SnapshotHandler$1 = SnapshotHandler$1;
let _module_federation_sdk$1 = dist$1;
let _module_federation_error_codes$1 = dist;
var RemoteHandler = class {
  constructor(host) {
    this.hooks = new require_pluginSystem$1.PluginSystem({
      beforeRegisterRemote: new require_syncWaterfallHook$1.SyncWaterfallHook("beforeRegisterRemote"),
      registerRemote: new require_syncWaterfallHook$1.SyncWaterfallHook("registerRemote"),
      beforeRequest: new require_asyncWaterfallHooks$1.AsyncWaterfallHook("beforeRequest"),
      onLoad: new require_asyncHook$1.AsyncHook("onLoad"),
      handlePreloadModule: new require_syncHook$1.SyncHook("handlePreloadModule"),
      errorLoadRemote: new require_asyncHook$1.AsyncHook("errorLoadRemote"),
      beforePreloadRemote: new require_asyncHook$1.AsyncHook("beforePreloadRemote"),
      generatePreloadAssets: new require_asyncHook$1.AsyncHook("generatePreloadAssets"),
      afterPreloadRemote: new require_asyncHook$1.AsyncHook(),
      loadEntry: new require_asyncHook$1.AsyncHook()
    });
    this.host = host;
    this.idToRemoteMap = {};
  }
  formatAndRegisterRemote(globalOptions, userOptions) {
    return (userOptions.remotes || []).reduce((res, remote2) => {
      this.registerRemote(remote2, res, { force: false });
      return res;
    }, globalOptions.remotes);
  }
  setIdToRemoteMap(id, remoteMatchInfo) {
    const { remote: remote2, expose } = remoteMatchInfo;
    const { name, alias } = remote2;
    this.idToRemoteMap[id] = {
      name: remote2.name,
      expose
    };
    if (alias && id.startsWith(name)) {
      const idWithAlias = id.replace(name, alias);
      this.idToRemoteMap[idWithAlias] = {
        name: remote2.name,
        expose
      };
      return;
    }
    if (alias && id.startsWith(alias)) {
      const idWithName = id.replace(alias, name);
      this.idToRemoteMap[idWithName] = {
        name: remote2.name,
        expose
      };
    }
  }
  async loadRemote(id, options) {
    const { host } = this;
    try {
      const { loadFactory = true } = options || { loadFactory: true };
      const { module, moduleOptions, remoteMatchInfo } = await this.getRemoteModuleAndOptions({ id });
      const { pkgNameOrAlias, remote: remote2, expose, id: idRes, remoteSnapshot } = remoteMatchInfo;
      const moduleOrFactory = await module.get(idRes, expose, options, remoteSnapshot);
      const moduleWrapper = await this.hooks.lifecycle.onLoad.emit({
        id: idRes,
        pkgNameOrAlias,
        expose,
        exposeModule: loadFactory ? moduleOrFactory : void 0,
        exposeModuleFactory: loadFactory ? void 0 : moduleOrFactory,
        remote: remote2,
        options: moduleOptions,
        moduleInstance: module,
        origin: host
      });
      this.setIdToRemoteMap(id, remoteMatchInfo);
      if (typeof moduleWrapper === "function") return moduleWrapper;
      return moduleOrFactory;
    } catch (error2) {
      const { from = "runtime" } = options || { from: "runtime" };
      const failOver = await this.hooks.lifecycle.errorLoadRemote.emit({
        id,
        error: error2,
        from,
        lifecycle: "onLoad",
        origin: host
      });
      if (!failOver) throw error2;
      return failOver;
    }
  }
  async preloadRemote(preloadOptions) {
    const { host } = this;
    await this.hooks.lifecycle.beforePreloadRemote.emit({
      preloadOps: preloadOptions,
      options: host.options,
      origin: host
    });
    const preloadOps = require_preload.formatPreloadArgs(host.options.remotes, preloadOptions);
    await Promise.all(preloadOps.map(async (ops) => {
      const { remote: remote2 } = ops;
      const remoteInfo = require_load$1.getRemoteInfo(remote2);
      const { globalSnapshot, remoteSnapshot } = await host.snapshotHandler.loadRemoteSnapshotInfo({ moduleInfo: remote2 });
      const assets = await this.hooks.lifecycle.generatePreloadAssets.emit({
        origin: host,
        preloadOptions: ops,
        remote: remote2,
        remoteInfo,
        globalSnapshot,
        remoteSnapshot
      });
      if (!assets) return;
      require_preload.preloadAssets(remoteInfo, host, assets);
    }));
  }
  registerRemotes(remotes, options) {
    const { host } = this;
    remotes.forEach((remote2) => {
      this.registerRemote(remote2, host.options.remotes, { force: options == null ? void 0 : options.force });
    });
  }
  async getRemoteModuleAndOptions(options) {
    const { host } = this;
    const { id } = options;
    let loadRemoteArgs;
    try {
      loadRemoteArgs = await this.hooks.lifecycle.beforeRequest.emit({
        id,
        options: host.options,
        origin: host
      });
    } catch (error2) {
      loadRemoteArgs = await this.hooks.lifecycle.errorLoadRemote.emit({
        id,
        options: host.options,
        origin: host,
        from: "runtime",
        error: error2,
        lifecycle: "beforeRequest"
      });
      if (!loadRemoteArgs) throw error2;
    }
    const { id: idRes } = loadRemoteArgs;
    const remoteSplitInfo = require_manifest.matchRemoteWithNameAndExpose(host.options.remotes, idRes);
    if (!remoteSplitInfo) require_logger$1.error(_module_federation_error_codes$1.RUNTIME_004, _module_federation_error_codes$1.runtimeDescMap, {
      hostName: host.options.name,
      requestId: idRes
    }, void 0, require_context.optionsToMFContext(host.options));
    const { remote: rawRemote } = remoteSplitInfo;
    const remoteInfo = require_load$1.getRemoteInfo(rawRemote);
    const matchInfo = await host.sharedHandler.hooks.lifecycle.afterResolve.emit({
      id: idRes,
      ...remoteSplitInfo,
      options: host.options,
      origin: host,
      remoteInfo
    });
    const { remote: remote2, expose } = matchInfo;
    require_logger$1.assert(remote2 && expose, `The 'beforeRequest' hook was executed, but it failed to return the correct 'remote' and 'expose' values while loading ${idRes}.`);
    let module = host.moduleCache.get(remote2.name);
    const moduleOptions = {
      host,
      remoteInfo
    };
    if (!module) {
      module = new require_index$1$1.Module(moduleOptions);
      host.moduleCache.set(remote2.name, module);
    }
    return {
      module,
      moduleOptions,
      remoteMatchInfo: matchInfo
    };
  }
  registerRemote(remote2, targetRemotes, options) {
    const { host } = this;
    const normalizeRemote = () => {
      if (remote2.alias) {
        const findEqual = targetRemotes.find((item) => {
          var _a;
          return remote2.alias && (item.name.startsWith(remote2.alias) || ((_a = item.alias) == null ? void 0 : _a.startsWith(remote2.alias)));
        });
        require_logger$1.assert(!findEqual, `The alias ${remote2.alias} of remote ${remote2.name} is not allowed to be the prefix of ${findEqual && findEqual.name} name or alias`);
      }
      if ("entry" in remote2) {
        if (_module_federation_sdk$1.isBrowserEnvValue && typeof window !== "undefined" && !remote2.entry.startsWith("http")) remote2.entry = new URL(remote2.entry, window.location.origin).href;
      }
      if (!remote2.shareScope) remote2.shareScope = require_constant$1.DEFAULT_SCOPE;
      if (!remote2.type) remote2.type = require_constant$1.DEFAULT_REMOTE_TYPE;
    };
    this.hooks.lifecycle.beforeRegisterRemote.emit({
      remote: remote2,
      origin: host
    });
    const registeredRemote = targetRemotes.find((item) => item.name === remote2.name);
    if (!registeredRemote) {
      normalizeRemote();
      targetRemotes.push(remote2);
      this.hooks.lifecycle.registerRemote.emit({
        remote: remote2,
        origin: host
      });
    } else {
      const messages = [`The remote "${remote2.name}" is already registered.`, "Please note that overriding it may cause unexpected errors."];
      if (options == null ? void 0 : options.force) {
        this.removeRemote(registeredRemote);
        normalizeRemote();
        targetRemotes.push(remote2);
        this.hooks.lifecycle.registerRemote.emit({
          remote: remote2,
          origin: host
        });
        (0, _module_federation_sdk$1.warn)(messages.join(" "));
      }
    }
  }
  removeRemote(remote2) {
    var _a;
    try {
      const { host } = this;
      const { name } = remote2;
      const remoteIndex = host.options.remotes.findIndex((item) => item.name === name);
      if (remoteIndex !== -1) host.options.remotes.splice(remoteIndex, 1);
      const loadedModule = host.moduleCache.get(remote2.name);
      if (loadedModule) {
        const remoteInfo = loadedModule.remoteInfo;
        const key = remoteInfo.entryGlobalName;
        if (require_global.CurrentGlobal[key]) if ((_a = Object.getOwnPropertyDescriptor(require_global.CurrentGlobal, key)) == null ? void 0 : _a.configurable) delete require_global.CurrentGlobal[key];
        else require_global.CurrentGlobal[key] = void 0;
        const remoteEntryUniqueKey = require_load$1.getRemoteEntryUniqueKey(loadedModule.remoteInfo);
        if (require_global.globalLoading[remoteEntryUniqueKey]) delete require_global.globalLoading[remoteEntryUniqueKey];
        host.snapshotHandler.manifestCache.delete(remoteInfo.entry);
        let remoteInsId = remoteInfo.buildVersion ? (0, _module_federation_sdk$1.composeKeyWithSeparator)(remoteInfo.name, remoteInfo.buildVersion) : remoteInfo.name;
        const remoteInsIndex = require_global.CurrentGlobal.__FEDERATION__.__INSTANCES__.findIndex((ins) => {
          if (remoteInfo.buildVersion) return ins.options.id === remoteInsId;
          else return ins.name === remoteInsId;
        });
        if (remoteInsIndex !== -1) {
          const remoteIns = require_global.CurrentGlobal.__FEDERATION__.__INSTANCES__[remoteInsIndex];
          remoteInsId = remoteIns.options.id || remoteInsId;
          const globalShareScopeMap = require_share$1.getGlobalShareScope();
          let isAllSharedNotUsed = true;
          const needDeleteKeys = [];
          Object.keys(globalShareScopeMap).forEach((instId) => {
            const shareScopeMap = globalShareScopeMap[instId];
            shareScopeMap && Object.keys(shareScopeMap).forEach((shareScope) => {
              const shareScopeVal = shareScopeMap[shareScope];
              shareScopeVal && Object.keys(shareScopeVal).forEach((shareName) => {
                const sharedPkgs = shareScopeVal[shareName];
                sharedPkgs && Object.keys(sharedPkgs).forEach((shareVersion) => {
                  const shared2 = sharedPkgs[shareVersion];
                  if (shared2 && typeof shared2 === "object" && shared2.from === remoteInfo.name) if (shared2.loaded || shared2.loading) {
                    shared2.useIn = shared2.useIn.filter((usedHostName) => usedHostName !== remoteInfo.name);
                    if (shared2.useIn.length) isAllSharedNotUsed = false;
                    else needDeleteKeys.push([
                      instId,
                      shareScope,
                      shareName,
                      shareVersion
                    ]);
                  } else needDeleteKeys.push([
                    instId,
                    shareScope,
                    shareName,
                    shareVersion
                  ]);
                });
              });
            });
          });
          if (isAllSharedNotUsed) {
            remoteIns.shareScopeMap = {};
            delete globalShareScopeMap[remoteInsId];
          }
          needDeleteKeys.forEach(([insId, shareScope, shareName, shareVersion]) => {
            var _a2, _b, _c;
            (_c = (_b = (_a2 = globalShareScopeMap[insId]) == null ? void 0 : _a2[shareScope]) == null ? void 0 : _b[shareName]) == null ? true : delete _c[shareVersion];
          });
          require_global.CurrentGlobal.__FEDERATION__.__INSTANCES__.splice(remoteInsIndex, 1);
        }
        const { hostGlobalSnapshot } = require_SnapshotHandler$1.getGlobalRemoteInfo(remote2, host);
        if (hostGlobalSnapshot) {
          const remoteKey = hostGlobalSnapshot && "remotesInfo" in hostGlobalSnapshot && hostGlobalSnapshot.remotesInfo && require_global.getInfoWithoutType(hostGlobalSnapshot.remotesInfo, remote2.name).key;
          if (remoteKey) {
            delete hostGlobalSnapshot.remotesInfo[remoteKey];
            if (Boolean(require_global.Global.__FEDERATION__.__MANIFEST_LOADING__[remoteKey])) delete require_global.Global.__FEDERATION__.__MANIFEST_LOADING__[remoteKey];
          }
        }
        host.moduleCache.delete(remote2.name);
      }
    } catch (err) {
      require_logger$1.logger.error(`removeRemote failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
};
remote.RemoteHandler = RemoteHandler;
const require_logger = logger$3;
const require_constant = constant;
const require_share = share;
const require_env = env;
const require_plugin = plugin;
const require_load = load;
const require_index$1 = module$1;
const require_syncHook = syncHook;
const require_asyncHook = asyncHook;
const require_syncWaterfallHook = syncWaterfallHook;
const require_asyncWaterfallHooks = asyncWaterfallHooks;
const require_pluginSystem = pluginSystem;
const require_index$3 = snapshot;
const require_generate_preload_assets = generatePreloadAssets$1;
const require_SnapshotHandler = SnapshotHandler$1;
const require_index$4 = shared;
const require_index$5 = remote;
let _module_federation_sdk = dist$1;
let _module_federation_error_codes = dist;
const USE_SNAPSHOT = typeof FEDERATION_OPTIMIZE_NO_SNAPSHOT_PLUGIN === "boolean" ? !FEDERATION_OPTIMIZE_NO_SNAPSHOT_PLUGIN : true;
var ModuleFederation = class {
  constructor(userOptions) {
    this.hooks = new require_pluginSystem.PluginSystem({
      beforeInit: new require_syncWaterfallHook.SyncWaterfallHook("beforeInit"),
      init: new require_syncHook.SyncHook(),
      beforeInitContainer: new require_asyncWaterfallHooks.AsyncWaterfallHook("beforeInitContainer"),
      initContainer: new require_asyncWaterfallHooks.AsyncWaterfallHook("initContainer")
    });
    this.version = "2.2.3";
    this.moduleCache = /* @__PURE__ */ new Map();
    this.loaderHook = new require_pluginSystem.PluginSystem({
      getModuleInfo: new require_syncHook.SyncHook(),
      createScript: new require_syncHook.SyncHook(),
      createLink: new require_syncHook.SyncHook(),
      fetch: new require_asyncHook.AsyncHook(),
      loadEntryError: new require_asyncHook.AsyncHook(),
      getModuleFactory: new require_asyncHook.AsyncHook()
    });
    this.bridgeHook = new require_pluginSystem.PluginSystem({
      beforeBridgeRender: new require_syncHook.SyncHook(),
      afterBridgeRender: new require_syncHook.SyncHook(),
      beforeBridgeDestroy: new require_syncHook.SyncHook(),
      afterBridgeDestroy: new require_syncHook.SyncHook()
    });
    const plugins = USE_SNAPSHOT ? [require_index$3.snapshotPlugin(), require_generate_preload_assets.generatePreloadAssetsPlugin()] : [];
    const defaultOptions = {
      id: require_env.getBuilderId(),
      name: userOptions.name,
      plugins,
      remotes: [],
      shared: {},
      inBrowser: _module_federation_sdk.isBrowserEnvValue
    };
    this.name = userOptions.name;
    this.options = defaultOptions;
    this.snapshotHandler = new require_SnapshotHandler.SnapshotHandler(this);
    this.sharedHandler = new require_index$4.SharedHandler(this);
    this.remoteHandler = new require_index$5.RemoteHandler(this);
    this.shareScopeMap = this.sharedHandler.shareScopeMap;
    this.registerPlugins([...defaultOptions.plugins, ...userOptions.plugins || []]);
    this.options = this.formatOptions(defaultOptions, userOptions);
  }
  initOptions(userOptions) {
    if (userOptions.name && userOptions.name !== this.options.name) require_logger.error((0, _module_federation_error_codes.getShortErrorMsg)(_module_federation_error_codes.RUNTIME_010, _module_federation_error_codes.runtimeDescMap));
    this.registerPlugins(userOptions.plugins);
    const options = this.formatOptions(this.options, userOptions);
    this.options = options;
    return options;
  }
  async loadShare(pkgName, extraOptions) {
    return this.sharedHandler.loadShare(pkgName, extraOptions);
  }
  loadShareSync(pkgName, extraOptions) {
    return this.sharedHandler.loadShareSync(pkgName, extraOptions);
  }
  initializeSharing(shareScopeName2 = require_constant.DEFAULT_SCOPE, extraOptions) {
    return this.sharedHandler.initializeSharing(shareScopeName2, extraOptions);
  }
  initRawContainer(name, url, container) {
    const remoteInfo = require_load.getRemoteInfo({
      name,
      entry: url
    });
    const module = new require_index$1.Module({
      host: this,
      remoteInfo
    });
    module.remoteEntryExports = container;
    this.moduleCache.set(name, module);
    return module;
  }
  async loadRemote(id, options) {
    return this.remoteHandler.loadRemote(id, options);
  }
  async preloadRemote(preloadOptions) {
    return this.remoteHandler.preloadRemote(preloadOptions);
  }
  initShareScopeMap(scopeName, shareScope, extraOptions = {}) {
    this.sharedHandler.initShareScopeMap(scopeName, shareScope, extraOptions);
  }
  formatOptions(globalOptions, userOptions) {
    const { allShareInfos: shared2 } = require_share.formatShareConfigs(globalOptions, userOptions);
    const { userOptions: userOptionsRes, options: globalOptionsRes } = this.hooks.lifecycle.beforeInit.emit({
      origin: this,
      userOptions,
      options: globalOptions,
      shareInfo: shared2
    });
    const remotes = this.remoteHandler.formatAndRegisterRemote(globalOptionsRes, userOptionsRes);
    const { allShareInfos } = this.sharedHandler.registerShared(globalOptionsRes, userOptionsRes);
    const plugins = [...globalOptionsRes.plugins];
    if (userOptionsRes.plugins) userOptionsRes.plugins.forEach((plugin2) => {
      if (!plugins.includes(plugin2)) plugins.push(plugin2);
    });
    const optionsRes = {
      ...globalOptions,
      ...userOptions,
      plugins,
      remotes,
      shared: allShareInfos
    };
    this.hooks.lifecycle.init.emit({
      origin: this,
      options: optionsRes
    });
    return optionsRes;
  }
  registerPlugins(plugins) {
    const pluginRes = require_plugin.registerPlugins(plugins, this);
    this.options.plugins = this.options.plugins.reduce((res, plugin2) => {
      if (!plugin2) return res;
      if (res && !res.find((item) => item.name === plugin2.name)) res.push(plugin2);
      return res;
    }, pluginRes || []);
  }
  registerRemotes(remotes, options) {
    return this.remoteHandler.registerRemotes(remotes, options);
  }
  registerShared(shared2) {
    this.sharedHandler.registerShared(this.options, {
      ...this.options,
      shared: shared2
    });
  }
};
core.ModuleFederation = ModuleFederation;
var type = {};
var runtime = {};
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
  let target = {};
  for (var name in all) {
    __defProp(target, name, {
      get: all[name],
      enumerable: true
    });
  }
  if (!no_symbols) {
    __defProp(target, Symbol.toStringTag, { value: "Module" });
  }
  return target;
};
runtime.__exportAll = __exportAll;
(function(exports$1) {
  const require_runtime = runtime;
  var type_exports = /* @__PURE__ */ require_runtime.__exportAll({});
  Object.defineProperty(exports$1, "type_exports", {
    enumerable: true,
    get: function() {
      return type_exports;
    }
  });
})(type);
(function(exports$1) {
  Object.defineProperty(exports$1, Symbol.toStringTag, { value: "Module" });
  const require_logger2 = logger$3;
  const require_tool2 = tool;
  const require_global2 = global;
  const require_index2 = semver;
  const require_share2 = share;
  const require_manifest2 = manifest;
  const require_load2 = load;
  const require_helpers = helpers;
  const require_index$2 = module$1;
  const require_core = core;
  const require_index$32 = type;
  let _module_federation_sdk2 = dist$1;
  const helpers$1 = require_helpers.default;
  exports$1.CurrentGlobal = require_global2.CurrentGlobal;
  exports$1.Global = require_global2.Global;
  exports$1.Module = require_index$2.Module;
  exports$1.ModuleFederation = require_core.ModuleFederation;
  exports$1.addGlobalSnapshot = require_global2.addGlobalSnapshot;
  exports$1.assert = require_logger2.assert;
  exports$1.error = require_logger2.error;
  exports$1.getGlobalFederationConstructor = require_global2.getGlobalFederationConstructor;
  exports$1.getGlobalSnapshot = require_global2.getGlobalSnapshot;
  exports$1.getInfoWithoutType = require_global2.getInfoWithoutType;
  exports$1.getRegisteredShare = require_share2.getRegisteredShare;
  exports$1.getRemoteEntry = require_load2.getRemoteEntry;
  exports$1.getRemoteInfo = require_load2.getRemoteInfo;
  exports$1.helpers = helpers$1;
  exports$1.isStaticResourcesEqual = require_tool2.isStaticResourcesEqual;
  Object.defineProperty(exports$1, "loadScript", {
    enumerable: true,
    get: function() {
      return _module_federation_sdk2.loadScript;
    }
  });
  Object.defineProperty(exports$1, "loadScriptNode", {
    enumerable: true,
    get: function() {
      return _module_federation_sdk2.loadScriptNode;
    }
  });
  exports$1.matchRemoteWithNameAndExpose = require_manifest2.matchRemoteWithNameAndExpose;
  exports$1.registerGlobalPlugins = require_global2.registerGlobalPlugins;
  exports$1.resetFederationGlobalInfo = require_global2.resetFederationGlobalInfo;
  exports$1.safeWrapper = require_tool2.safeWrapper;
  exports$1.satisfy = require_index2.satisfy;
  exports$1.setGlobalFederationConstructor = require_global2.setGlobalFederationConstructor;
  exports$1.setGlobalFederationInstance = require_global2.setGlobalFederationInstance;
  Object.defineProperty(exports$1, "types", {
    enumerable: true,
    get: function() {
      return require_index$32.type_exports;
    }
  });
})(dist$2);
let _module_federation_runtime_core = dist$2;
function getBuilderId() {
  return typeof FEDERATION_BUILD_IDENTIFIER !== "undefined" ? FEDERATION_BUILD_IDENTIFIER : "";
}
function getGlobalFederationInstance(name, version) {
  const buildId = getBuilderId();
  return _module_federation_runtime_core.CurrentGlobal.__FEDERATION__.__INSTANCES__.find((GMInstance) => {
    if (buildId && GMInstance.options.id === buildId) return true;
    if (GMInstance.options.name === name && !GMInstance.options.version && !version) return true;
    if (GMInstance.options.name === name && version && GMInstance.options.version === version) return true;
    return false;
  });
}
utils$2.getGlobalFederationInstance = getGlobalFederationInstance;
(function(exports$1) {
  Object.defineProperty(exports$1, Symbol.toStringTag, { value: "Module" });
  const require_utils2 = utils$2;
  let _module_federation_runtime_core2 = dist$2;
  let _module_federation_error_codes2 = dist;
  function createInstance(options) {
    const instance = new ((0, _module_federation_runtime_core2.getGlobalFederationConstructor)() || _module_federation_runtime_core2.ModuleFederation)(options);
    (0, _module_federation_runtime_core2.setGlobalFederationInstance)(instance);
    return instance;
  }
  let FederationInstance = null;
  function init2(options) {
    const instance = require_utils2.getGlobalFederationInstance(options.name, options.version);
    if (!instance) {
      FederationInstance = createInstance(options);
      return FederationInstance;
    } else {
      instance.initOptions(options);
      if (!FederationInstance) FederationInstance = instance;
      return instance;
    }
  }
  function loadRemote(...args) {
    (0, _module_federation_runtime_core2.assert)(FederationInstance, _module_federation_error_codes2.RUNTIME_009, _module_federation_error_codes2.runtimeDescMap);
    return FederationInstance.loadRemote.apply(FederationInstance, args);
  }
  function loadShare(...args) {
    (0, _module_federation_runtime_core2.assert)(FederationInstance, _module_federation_error_codes2.RUNTIME_009, _module_federation_error_codes2.runtimeDescMap);
    return FederationInstance.loadShare.apply(FederationInstance, args);
  }
  function loadShareSync(...args) {
    (0, _module_federation_runtime_core2.assert)(FederationInstance, _module_federation_error_codes2.RUNTIME_009, _module_federation_error_codes2.runtimeDescMap);
    return FederationInstance.loadShareSync.apply(FederationInstance, args);
  }
  function preloadRemote(...args) {
    (0, _module_federation_runtime_core2.assert)(FederationInstance, _module_federation_error_codes2.RUNTIME_009, _module_federation_error_codes2.runtimeDescMap);
    return FederationInstance.preloadRemote.apply(FederationInstance, args);
  }
  function registerRemotes(...args) {
    (0, _module_federation_runtime_core2.assert)(FederationInstance, _module_federation_error_codes2.RUNTIME_009, _module_federation_error_codes2.runtimeDescMap);
    return FederationInstance.registerRemotes.apply(FederationInstance, args);
  }
  function registerPlugins2(...args) {
    (0, _module_federation_runtime_core2.assert)(FederationInstance, _module_federation_error_codes2.RUNTIME_009, _module_federation_error_codes2.runtimeDescMap);
    return FederationInstance.registerPlugins.apply(FederationInstance, args);
  }
  function getInstance() {
    return FederationInstance;
  }
  function registerShared(...args) {
    (0, _module_federation_runtime_core2.assert)(FederationInstance, _module_federation_error_codes2.RUNTIME_009, _module_federation_error_codes2.runtimeDescMap);
    return FederationInstance.registerShared.apply(FederationInstance, args);
  }
  (0, _module_federation_runtime_core2.setGlobalFederationConstructor)(_module_federation_runtime_core2.ModuleFederation);
  Object.defineProperty(exports$1, "Module", {
    enumerable: true,
    get: function() {
      return _module_federation_runtime_core2.Module;
    }
  });
  exports$1.ModuleFederation = _module_federation_runtime_core2.ModuleFederation;
  exports$1.createInstance = createInstance;
  exports$1.getInstance = getInstance;
  Object.defineProperty(exports$1, "getRemoteEntry", {
    enumerable: true,
    get: function() {
      return _module_federation_runtime_core2.getRemoteEntry;
    }
  });
  Object.defineProperty(exports$1, "getRemoteInfo", {
    enumerable: true,
    get: function() {
      return _module_federation_runtime_core2.getRemoteInfo;
    }
  });
  exports$1.init = init2;
  exports$1.loadRemote = loadRemote;
  Object.defineProperty(exports$1, "loadScript", {
    enumerable: true,
    get: function() {
      return _module_federation_runtime_core2.loadScript;
    }
  });
  Object.defineProperty(exports$1, "loadScriptNode", {
    enumerable: true,
    get: function() {
      return _module_federation_runtime_core2.loadScriptNode;
    }
  });
  exports$1.loadShare = loadShare;
  exports$1.loadShareSync = loadShareSync;
  exports$1.preloadRemote = preloadRemote;
  Object.defineProperty(exports$1, "registerGlobalPlugins", {
    enumerable: true,
    get: function() {
      return _module_federation_runtime_core2.registerGlobalPlugins;
    }
  });
  exports$1.registerPlugins = registerPlugins2;
  exports$1.registerRemotes = registerRemotes;
  exports$1.registerShared = registerShared;
})(dist$3);
if (typeof __VUE_HMR_RUNTIME__ === "undefined") {
  globalThis.__VUE_HMR_RUNTIME__ = { createRecord() {
  }, rerender() {
  }, reload() {
  } };
}
const __mfResolveGlobalKey = "__mf_init____mf__virtual/iobroker_devices__mf_v__runtimeInit__mf_v__.js__";
let __mfResolveState = globalThis[__mfResolveGlobalKey];
if (!__mfResolveState) {
  let initResolve2, initReject;
  const initPromise = new Promise((re, rj) => {
    initResolve2 = re;
    initReject = rj;
  });
  __mfResolveState = globalThis[__mfResolveGlobalKey] = {
    initPromise,
    initResolve: initResolve2,
    initReject
  };
  if (typeof window === "undefined") {
    initResolve2({
      loadRemote: function() {
        return Promise.resolve(void 0);
      },
      loadShare: function() {
        return Promise.resolve(void 0);
      }
    });
  }
}
const initResolve = __mfResolveState.initResolve;
const initTokens = {};
const shareScopeName = "default";
const mfName = "iobroker_devices";
let localSharedImportMapPromise;
let exposesMapPromise;
async function getLocalSharedImportMap() {
  localSharedImportMapPromise ??= __vitePreload(() => import("./localSharedImportMap-Dfz8GRNG.js"), true ? __vite__mapDeps([0,1]) : void 0, import.meta.url);
  return localSharedImportMapPromise;
}
async function getExposesMap() {
  exposesMapPromise ??= __vitePreload(() => import("./virtualExposes-BGXredHO.js"), true ? [] : void 0, import.meta.url).then((mod) => mod.default ?? mod);
  return exposesMapPromise;
}
async function init(shared2 = {}, initScope = []) {
  const { usedShared, usedRemotes } = await getLocalSharedImportMap();
  const initRes = dist$3.init({
    name: mfName,
    remotes: usedRemotes,
    shared: usedShared,
    plugins: [],
    shareStrategy: "version-first"
  });
  var initToken = initTokens[shareScopeName];
  if (!initToken)
    initToken = initTokens[shareScopeName] = { from: mfName };
  if (initScope.indexOf(initToken) >= 0) return;
  initScope.push(initToken);
  initRes.initShareScopeMap("default", shared2);
  initResolve(initRes);
  try {
    await Promise.all(await initRes.initializeSharing("default", {
      strategy: "version-first",
      from: "build",
      initScope
    }));
  } catch (e) {
    console.error("[Module Federation]", e);
  }
  return initRes;
}
async function getExposes(moduleName) {
  const exposesMap = await getExposesMap();
  if (!(moduleName in exposesMap)) throw new Error(`[Module Federation] Module ${moduleName} does not exist in container.`);
  return exposesMap[moduleName]().then((res) => () => res);
}
export {
  dist$3 as d,
  getExposes as g,
  init as i
};
