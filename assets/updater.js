(function () {
  var config = window.ToolKeeperUpdateConfig || {};
  var notice = document.getElementById('toolkeeper-update-notice');
  var message = document.getElementById('toolkeeper-update-message');
  var retryButton = document.getElementById('toolkeeper-update-retry');
  var finishButton = document.getElementById('toolkeeper-update-finish');
  var continueButton = document.getElementById('toolkeeper-update-continue');
  var manualLink = document.getElementById('toolkeeper-manual-update-link');
  var versionLink = document.getElementById('toolkeeper-version');
  var creatorLink = document.getElementById('toolkeeper-creator-link');
  var whatsNewDialog = document.getElementById('toolkeeper-whats-new');
  var whatsNewTitle = document.getElementById('toolkeeper-whats-new-title');
  var whatsNewCopy = document.getElementById('toolkeeper-whats-new-copy');
  var whatsNewList = document.getElementById('toolkeeper-whats-new-list');
  var whatsNewClose = document.getElementById('toolkeeper-whats-new-close');
  var pendingKey = 'toolkeeper.update.pendingVersion';
  var installedVersionKey = 'toolkeeper.installedVersion';
  var releaseNotes = {
    '1.0.8': ["ToolKeeper now shows a short What's New summary after an update."],
    '1.0.9': [
      'Added the Audio and Text categories to the public ToolKeeper release.',
      'Beat markers use the local beat tracker, and audio captions are included.'
    ]
  };
  var checkInFlight = false;
  var continueThisSession = false;
  var installTimer = null;

  function cepApi() { return window.__adobe_cep__ || window.cep; }
  function fsApi() { return window.cep && window.cep.fs; }

  function openExternal(link) {
    if (!link || !link.href) return;
    var url = String(link.href || '').trim();
    var cepObjects = [window.__adobe_cep__, window.cep, cepApi()].filter(Boolean);
    for (var i = 0; i < cepObjects.length; i += 1) {
      var util = cepObjects[i].util;
      if (util && typeof util.openURLInDefaultBrowser === 'function') {
        util.openURLInDefaultBrowser(url);
        return;
      }
    }
    window.open(url, '_blank', 'noopener');
  }

  [versionLink, creatorLink, manualLink].forEach(function (link) {
    if (!link) return;
    link.addEventListener('click', function (event) {
      event.preventDefault();
      openExternal(link);
    });
  });

  if (versionLink) {
    var version = String(config.currentVersion || '').replace(/^v/i, '');
    versionLink.textContent = config.development ? 'ToolKeeper Dev' : ('ToolKeeper v' + (version || ''));
    versionLink.href = 'https://github.com/morleyae/ToolKeeper/releases/latest';
    versionLink.target = '_blank';
  }
  if (creatorLink) {
    creatorLink.href = 'https://www.tiktok.com/@morley.ae';
    creatorLink.target = '_blank';
  }
  if (manualLink) manualLink.href = 'https://github.com/' + (config.repository || 'morleyae/ToolKeeper') + '/releases/latest';

  function showNotice(text, allowContinue) {
    if (!notice) return;
    message.textContent = text;
    notice.hidden = false;
    if (retryButton) retryButton.hidden = false;
    if (finishButton) finishButton.hidden = true;
    if (continueButton) continueButton.hidden = !allowContinue;
    notice.classList.add('is-visible');
  }

  function hideNotice() {
    if (!notice) return;
    notice.classList.remove('is-visible');
    notice.hidden = true;
  }

  function compareVersions(first, second) {
    var a = String(first || '').replace(/^v/i, '').split('.');
    var b = String(second || '').replace(/^v/i, '').split('.');
    for (var i = 0; i < 3; i++) {
      var left = Number(a[i]) || 0;
      var right = Number(b[i]) || 0;
      if (left > right) return 1;
      if (left < right) return -1;
    }
    return 0;
  }

  function getInstalledVersion() {
    try { return String(window.localStorage.getItem(installedVersionKey) || ''); } catch (error) { return ''; }
  }

  function storeCurrentVersion() {
    try { window.localStorage.setItem(installedVersionKey, String(config.currentVersion || '')); } catch (error) {}
  }

  function showWhatsNew() {
    var currentVersion = String(config.currentVersion || '').replace(/^v/i, '');
    var previousVersion = getInstalledVersion();
    if (!currentVersion || compareVersions(currentVersion, previousVersion) <= 0 || !whatsNewDialog || !whatsNewList) return false;

    var notes = releaseNotes[currentVersion] || [];
    if (!notes.length) {
      storeCurrentVersion();
      return false;
    }

    whatsNewTitle.textContent = "What's New in ToolKeeper v" + currentVersion;
    whatsNewCopy.textContent = previousVersion
      ? 'Since v' + previousVersion + ', ToolKeeper has changed in these ways:'
      : 'Here are the latest improvements in ToolKeeper:';
    while (whatsNewList.firstChild) whatsNewList.removeChild(whatsNewList.firstChild);
    notes.forEach(function (note) {
      var item = document.createElement('li');
      item.textContent = note;
      whatsNewList.appendChild(item);
    });
    whatsNewDialog.showModal();
    window.setTimeout(function () { if (whatsNewClose) whatsNewClose.focus(); }, 0);
    return true;
  }

  function normalizePath(path) {
    var value = String(path || '').replace(/^file:\/\//, '');
    try { value = decodeURI(value); } catch (error) {}
    value = value.replace(/\\/g, '/').replace(/\/$/, '');
    if (/^\/[A-Za-z]:\//.test(value)) value = value.substring(1);
    return value;
  }

  function makeDirectory(path) {
    var fs = fsApi();
    if (!fs) return false;
    var stat = fs.stat(path);
    if (stat && stat.err === 0 && stat.data && typeof stat.data.isDirectory === 'function' && stat.data.isDirectory()) return true;
    var result = fs.makedir(path);
    return Boolean(result && result.err === 0);
  }

  function writeFile(path, data, encoding) {
    var fs = fsApi();
    if (!fs || typeof fs.writeFile !== 'function') return false;
    try {
      var result = encoding === undefined ? fs.writeFile(path, data) : fs.writeFile(path, data, encoding);
      return Boolean(result && result.err === 0);
    } catch (error) {
      return false;
    }
  }

  function requestJson(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/vnd.github+json');
    xhr.setRequestHeader('X-GitHub-Api-Version', '2022-11-28');
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300) return callback(new Error('HTTP ' + xhr.status));
      try { callback(null, JSON.parse(xhr.responseText)); } catch (error) { callback(error); }
    };
    xhr.onerror = function () { callback(new Error('Network error')); };
    xhr.ontimeout = function () { callback(new Error('Request timed out')); };
    xhr.send();
  }

  function encodeBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var chunkSize = 0x8000;
    var binary = '';
    for (var offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
    }
    return window.btoa(binary);
  }

  function downloadFile(url, destination, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.timeout = 120000;
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300 || !xhr.response) return callback(new Error('HTTP ' + xhr.status));
      var encoding = window.cep && window.cep.encoding && window.cep.encoding.Base64;
      if (encoding === undefined) return callback(new Error('CEP Base64 file support is unavailable'));
      callback(writeFile(destination, encodeBase64(xhr.response), encoding) ? null : new Error('Could not save the update archive'));
    };
    xhr.onerror = function () { callback(new Error('Download network error')); };
    xhr.ontimeout = function () { callback(new Error('Update download timed out')); };
    xhr.send();
  }

  function getPlatformName() {
    return /win/i.test((navigator.platform || '') + ' ' + (navigator.userAgent || '')) ? 'Windows' : 'macOS';
  }

  function startInstaller(archivePath, version, callback) {
    var cep = window.__adobe_cep__;
    var processApi = window.cep && window.cep.process;
    var fs = fsApi();
    if (!cep || !processApi || typeof processApi.createProcess !== 'function' || !fs || typeof fs.readFile !== 'function') {
      return callback(new Error('Automatic installation is unavailable in this CEP runtime'));
    }

    var runningPath = normalizePath(cep.getSystemPath('extension'));
    var userData = normalizePath(cep.getSystemPath('userData'));
    var isWindows = getPlatformName() === 'Windows';
    var target = isWindows ? userData + '/Adobe/CEP/extensions/ToolKeeper' : runningPath;
    var updateRoot = userData + '/ToolKeeper';
    var updateDir = updateRoot + '/updates';
    if (!runningPath || !userData || !target || !makeDirectory(updateRoot) || !makeDirectory(updateDir)) {
      return callback(new Error('Could not prepare the update folder'));
    }

    var helperName = 'apply-update-' + (isWindows ? 'windows.ps1' : 'macos.sh');
    var source = fs.readFile(runningPath + '/scripts/' + helperName);
    if (!source || source.err !== 0 || !source.data) return callback(new Error('The update installer is missing'));
    var helperPath = updateDir + '/' + helperName;
    var statePath = updateDir + '/pending-update.txt';
    var resultPath = statePath + '.result';
    if (typeof fs.deleteFile === 'function') {
      try { fs.deleteFile(resultPath); } catch (error) {}
    }
    var state = archivePath + '\n' + target + '\n' + version + '\n';
    var utf8 = window.cep && window.cep.encoding && window.cep.encoding.UTF8;
    var stateWritten = utf8 === undefined ? writeFile(statePath, state) : writeFile(statePath, state, utf8);
    if (!writeFile(helperPath, source.data) || !stateWritten) return callback(new Error('Could not prepare the automatic installer'));

    var launched;
    if (isWindows) {
      launched = processApi.createProcess('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', helperPath, statePath);
      if (!launched || launched.err !== 0) {
        launched = processApi.createProcess('powershell.exe', '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', helperPath, statePath);
      }
    } else {
      launched = processApi.createProcess('/usr/bin/nohup', '/bin/bash', helperPath, statePath);
    }
    if (!launched || launched.err !== 0) return callback(new Error('Could not start the automatic installer'));
    callback(null, resultPath);
  }

  function readFile(path) {
    var fs = fsApi();
    var result = fs && typeof fs.readFile === 'function' ? fs.readFile(path) : null;
    return result && result.err === 0 && result.data ? String(result.data).replace(/^\uFEFF/, '') : '';
  }

  function monitorInstall(version, resultPath, startedAt) {
    var result = readFile(resultPath);
    var lines = result.split(/\r?\n/);
    if (lines[0] === 'PROGRESS') {
      message.textContent = 'Installing ToolKeeper ' + version + ': ' + lines.slice(1).join(' ').trim();
    } else if (lines[0] === 'INSTALLED') {
      message.textContent = 'ToolKeeper ' + version + ' is installed. Finish to reload the panel and use the update.';
      if (retryButton) retryButton.hidden = true;
      if (finishButton) finishButton.hidden = false;
      return;
    } else if (lines[0] === 'ERROR') {
      message.textContent = 'ToolKeeper update failed: ' + lines.slice(1).join(' ').trim();
      if (retryButton) retryButton.hidden = false;
      if (continueButton) continueButton.hidden = false;
      return;
    }
    if (Date.now() - startedAt > 5 * 60 * 1000) {
      message.textContent = 'ToolKeeper installation did not finish. Close and reopen the panel, then try again.';
      if (retryButton) retryButton.hidden = false;
      if (continueButton) continueButton.hidden = false;
      return;
    }
    installTimer = window.setTimeout(function () { monitorInstall(version, resultPath, startedAt); }, 1000);
  }

  function installRelease(release, asset) {
    var cep = cepApi();
    var userData = cep ? normalizePath(cep.getSystemPath('userData')) : '';
    var root = userData + '/ToolKeeper';
    var updateDir = root + '/updates';
    if (!userData || !makeDirectory(root) || !makeDirectory(updateDir)) {
      showNotice('ToolKeeper ' + release.tag_name + ' was found, but the update folder could not be prepared.', true);
      return;
    }
    var archivePath = updateDir + '/' + asset.name;
    showNotice('ToolKeeper ' + release.tag_name + ' was found and is downloading.', false);
    downloadFile(asset.browser_download_url, archivePath, function (downloadError) {
      if (continueThisSession) return;
      if (downloadError) {
        showNotice('The ToolKeeper update download failed. ' + downloadError.message, true);
        return;
      }
      startInstaller(archivePath, release.tag_name, function (installError, resultPath) {
        if (installError) {
          showNotice('ToolKeeper was downloaded, but automatic installation could not start: ' + installError.message, true);
          return;
        }
        try { window.localStorage.setItem(pendingKey, release.tag_name); } catch (error) {}
        if (retryButton) retryButton.hidden = true;
        if (finishButton) finishButton.hidden = true;
        if (continueButton) continueButton.hidden = true;
        message.textContent = 'Installing ToolKeeper ' + release.tag_name + ' while After Effects stays open.';
        monitorInstall(release.tag_name, resultPath, Date.now());
      });
    });
  }

  function checkForUpdates() {
    if (config.development || continueThisSession || checkInFlight || !config.repository || !config.currentVersion) return;
    var cep = cepApi();
    var pending = '';
    try { pending = window.localStorage.getItem(pendingKey) || ''; } catch (error) {}
    if (pending) {
      if (compareVersions(config.currentVersion, pending) < 0) {
        showNotice('ToolKeeper ' + pending + ' is still installing. You can continue working while the installer finishes.', true);
        return;
      }
      try { window.localStorage.removeItem(pendingKey); } catch (error) {}
    }
    checkInFlight = true;
    requestJson('https://api.github.com/repos/' + config.repository + '/releases/latest', function (error, release) {
      checkInFlight = false;
      if (continueThisSession) return;
      if (error) {
        if (error.message === 'HTTP 404') {
          hideNotice();
          return;
        }
        showNotice('Could not check for ToolKeeper updates. The panel will try again the next time it opens.', true);
        return;
      }
      if (!release || release.draft || release.prerelease || compareVersions(release.tag_name, config.currentVersion) <= 0) {
        hideNotice();
        return;
      }
      var assetName = 'ToolKeeper-' + release.tag_name + '.zip';
      var assets = release.assets || [];
      var asset = null;
      for (var i = 0; i < assets.length; i++) if (assets[i].name === assetName) asset = assets[i];
      if (!asset || !asset.browser_download_url) {
        showNotice('ToolKeeper ' + release.tag_name + ' is available, but its release ZIP is missing.', true);
        return;
      }
      installRelease(release, asset);
    });
  }

  if (retryButton) retryButton.addEventListener('click', function () {
    if (config.development) {
      message.textContent = 'Retry clicked. This is only a preview; no update was downloaded or installed.';
      return;
    }
    if (installTimer) window.clearTimeout(installTimer);
    checkForUpdates();
  });
  if (continueButton) continueButton.addEventListener('click', function () {
    if (config.development) {
      hideNotice();
      return;
    }
    continueThisSession = true;
    try { window.localStorage.removeItem(pendingKey); } catch (error) {}
    if (installTimer) window.clearTimeout(installTimer);
    hideNotice();
  });
  if (finishButton) finishButton.addEventListener('click', function () {
    finishButton.disabled = true;
    finishButton.textContent = 'Reloading...';
    try { window.localStorage.removeItem(pendingKey); } catch (error) {}
    window.location.reload();
  });

  if (whatsNewClose) whatsNewClose.addEventListener('click', function () { whatsNewDialog.close(); });
  if (whatsNewDialog) whatsNewDialog.addEventListener('close', storeCurrentVersion);
  window.setTimeout(function () {
    if (!notice || notice.hidden) showWhatsNew();
  }, 1500);

  window.setTimeout(checkForUpdates, 1200);
})();
