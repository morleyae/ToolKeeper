(function () {
  var KEY = "toolkeeper.license.key";
  var DEVICE = "toolkeeper.license.device";
  var CHECKED = "toolkeeper.license.checkedAt";
  var SUITE_KEY = "toolkeepersuite.license.key";
  var SUITE_DEVICE = "toolkeepersuite.license.device";
  var SUITE_CHECKED = "toolkeepersuite.license.checkedAt";
  var OFFLINE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
  var apiBaseUrl = String(window.ToolKeeperLicenseConfig && window.ToolKeeperLicenseConfig.apiBaseUrl || "").replace(/\/+$/, "");
  var gate = document.getElementById("license-gate");
  var copy = document.getElementById("license-gate-copy");
  var status = document.getElementById("license-gate-status");
  var settingsStatus = document.getElementById("license-settings-status");
  var input = document.getElementById("license-key-input");
  var activate = document.getElementById("license-activate-button");
  var cancel = document.getElementById("license-cancel-button");
  var manage = document.getElementById("license-manage-button");
  var busy = false;
  var licensed = false;

  function getCepPaths() {
    var cep = window.__adobe_cep__ || window.cep;
    var fs = window.cep && window.cep.fs;
    if (!cep || !fs || typeof cep.getSystemPath !== "function") return null;
    var userData = String(cep.getSystemPath("userData") || "").replace(/^file:\/\//, "");
    try { userData = decodeURI(userData); } catch (error) {}
    userData = userData.replace(/\\/g, "/").replace(/\/$/, "");
    if (/^\/[A-Za-z]:\//.test(userData)) userData = userData.substring(1);
    return { cep: cep, fs: fs, userData: userData };
  }

  function readFileState(folder) {
    var paths = getCepPaths();
    if (!paths || !paths.userData) return {};
    try {
      var result = paths.fs.readFile(paths.userData + "/" + folder + "/license-state.json");
      if (!result || result.err !== 0 || !result.data) return {};
      var state = JSON.parse(result.data);
      return state && typeof state === "object" ? state : {};
    } catch (error) { return {}; }
  }

  var suitePath = null;
  var suiteState = {};
  var paths = getCepPaths();
  if (paths && paths.userData) {
    suitePath = paths.userData + "/ToolKeeperSuite/license-state.json";
    suiteState = readFileState("ToolKeeperSuite");
  }

  function legacyValue(key) {
    try { return window.localStorage.getItem(key) || ""; } catch (error) { return ""; }
  }

  function readLegacyState() {
    var scene = readFileState("SceneKeeper");
    var tool = readFileState("ToolKeeper");
    return {
      key: suiteState[SUITE_KEY] || suiteState[KEY] || suiteState["scenekeeper.license.key"] || scene["scenekeeper.license.key"] || scene[SUITE_KEY] || tool[KEY] || legacyValue(KEY) || legacyValue("scenekeeper.license.key"),
      device: suiteState[SUITE_DEVICE] || suiteState[DEVICE] || suiteState["scenekeeper.license.device"] || scene["scenekeeper.license.device"] || scene[SUITE_DEVICE] || tool[DEVICE] || legacyValue(DEVICE) || legacyValue("scenekeeper.license.device"),
      checked: suiteState[SUITE_CHECKED] || suiteState[CHECKED] || suiteState["scenekeeper.license.checkedAt"] || scene["scenekeeper.license.checkedAt"] || scene[SUITE_CHECKED] || tool[CHECKED] || legacyValue(CHECKED) || legacyValue("scenekeeper.license.checkedAt")
    };
  }

  var shared = readLegacyState();

  function writeSuiteState() {
    if (!suitePath || !paths || !paths.fs) return false;
    try {
      var dirResult = paths.fs.stat(paths.userData + "/ToolKeeperSuite");
      var exists = dirResult && dirResult.err === 0 && dirResult.data && dirResult.data.isDirectory && dirResult.data.isDirectory();
      if (!exists) {
        var made = paths.fs.makedir(paths.userData + "/ToolKeeperSuite");
        if (!made || made.err !== 0) return false;
      }
      var result = paths.fs.writeFile(suitePath, JSON.stringify(suiteState));
      return Boolean(result && result.err === 0);
    } catch (error) { return false; }
  }

  suiteState[SUITE_KEY] = shared.key || "";
  suiteState[SUITE_DEVICE] = shared.device || "";
  suiteState[SUITE_CHECKED] = shared.checked || "";
  writeSuiteState();

  function getStored(name) {
    return suiteState[name] || "";
  }

  function setStored(name, value) {
    suiteState[name] = String(value);
    writeSuiteState();
  }

  function setStatus(message, error) {
    if (status) {
      status.textContent = message;
      status.classList.toggle("is-error", Boolean(error));
    }
    if (settingsStatus) settingsStatus.textContent = message;
  }

  function getDeviceId() {
    var deviceId = getStored(SUITE_DEVICE);
    if (deviceId) return deviceId;
    var bytes = window.crypto.getRandomValues(new Uint8Array(24));
    deviceId = Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    setStored(SUITE_DEVICE, deviceId);
    return deviceId;
  }

  function request(path, body) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", apiBaseUrl + path, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 25000;
      xhr.onload = function () {
        var response;
        try { response = JSON.parse(xhr.responseText); } catch (error) {
          var parseError = new Error("The license server returned an invalid response.");
          parseError.status = xhr.status;
          reject(parseError);
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(response);
        else {
          var error = new Error(response.error || "License check failed (" + xhr.status + ").");
          error.status = xhr.status;
          reject(error);
        }
      };
      xhr.onerror = function () { var error = new Error("Could not reach the license server."); error.status = 0; reject(error); };
      xhr.ontimeout = function () { var error = new Error("The license server did not respond in time."); error.status = 408; reject(error); };
      xhr.send(JSON.stringify(body));
    });
  }

  function describeError(error) {
    var statusCode = Number(error && error.status) || 0;
    var message = String(error && error.message || "License check failed.");
    if (statusCode === 404) return "This license key was not found. Check the key or contact support.";
    if (statusCode === 403) return "This license key is revoked or unavailable. Contact support.";
    if (statusCode === 409) return "This license key is already activated on another device. Message morley.ae on Discord to reset it.";
    if (statusCode === 429) return "The license service is rate limiting requests. Wait a few minutes and retry.";
    if (statusCode >= 500) return "The license service is temporarily unavailable. Retry in a few minutes.";
    if (statusCode === 408 || statusCode === 0) return "Could not reach the license server. Check your internet connection and retry.";
    return message;
  }

  function showGate(message, locked) {
    copy.textContent = message;
    cancel.hidden = locked;
    gate.hidden = false;
    input.focus();
  }

  function allowOffline(error) {
    var temporary = error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
    var checked = Number(getStored(SUITE_CHECKED)) || 0;
    var elapsed = Date.now() - checked;
    return temporary && checked > 0 && elapsed >= 0 && elapsed <= OFFLINE_GRACE_MS;
  }

  async function verify() {
    var licenseKey = getStored(SUITE_KEY);
    if (!licenseKey) {
      setStatus("No license activated on this installation.", false);
      showGate("Enter your license key to activate ToolKeeper and SceneKeeper on this installation.", true);
      return;
    }
    setStatus("Checking your shared license...", false);
    try {
      await request("/api/verify", { licenseKey: licenseKey, deviceId: getDeviceId() });
      setStored(SUITE_CHECKED, String(Date.now()));
      licensed = true;
      gate.hidden = true;
      setStatus("Shared license active on this installation.", false);
    } catch (error) {
      if (allowOffline(error)) {
        licensed = true;
        gate.hidden = true;
        setStatus("License server unavailable. Offline access is active temporarily.", false);
        return;
      }
      setStatus(describeError(error), true);
      showGate("Enter a valid license key to activate ToolKeeper and SceneKeeper.", true);
    }
  }

  async function activateLicense() {
    if (busy) return;
    var licenseKey = input.value.trim() || getStored(SUITE_KEY);
    if (!licenseKey) { setStatus("Enter your license key to continue.", true); input.focus(); return; }
    busy = true;
    activate.disabled = true;
    activate.textContent = "Checking...";
    setStatus("Activating shared license...", false);
    try {
      await request("/api/activate", { licenseKey: licenseKey, deviceId: getDeviceId() });
      setStored(SUITE_KEY, licenseKey);
      setStored(SUITE_CHECKED, String(Date.now()));
      licensed = true;
      gate.hidden = true;
      input.value = "";
      setStatus("Shared license active on this installation.", false);
    } catch (error) { setStatus(describeError(error), true); }
    finally {
      busy = false;
      activate.disabled = false;
      activate.textContent = "Activate / Verify";
    }
  }

  activate.addEventListener("click", activateLicense);
  input.addEventListener("keydown", function (event) { if (event.key === "Enter") activateLicense(); });
  cancel.addEventListener("click", function () { if (!busy) gate.hidden = true; });
  manage.addEventListener("click", function () {
    var settingsDialog = document.getElementById("settings-dialog");
    if (settingsDialog && typeof settingsDialog.close === "function" && settingsDialog.open) {
      settingsDialog.close();
    }
    showGate("Enter a license key to activate or verify ToolKeeper and SceneKeeper.", !licensed);
  });

  verify();
})();
