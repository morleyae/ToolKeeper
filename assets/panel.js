(function () {
  var cep = window.__adobe_cep__ || window.cep;
  var beatPlaceholder = document.getElementById('beat-placeholder');
  var beatSelectionTimer = null;
  var beatSelectionRequestInFlight = false;
  function notify() {
    // Keep host actions quiet; buttons provide their own press feedback.
  }

  function run(script, success) {
    if (!cep || typeof cep.evalScript !== 'function') {
      notify(window.location.protocol === 'file:' ? 'CEP host API unavailable' : 'Browser preview only');
      return;
    }
    cep.evalScript(script, function (result) {
      if (result === undefined || result === null) return;
      var text = String(result).trim();
      if (!text || text === 'undefined' || text === 'null' || text === 'EvalScript error.') return;
      if (/^(ERROR|No |Select |Choose |Please)/i.test(text)) {
        notify(text.replace(/^ERROR:\s*/i, ''));
      }
    });
  }

  function scriptCall(name) { return 'tk' + name + '()'; }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!event.isTrusted || !button || button.disabled || button.matches('.view-tab')) return;
    button.classList.remove('press-feedback');
    void button.offsetWidth;
    button.classList.add('press-feedback');
  });

  function activateView(viewName) {
    document.body.classList.remove('function-search-open');
    document.querySelectorAll('.view-tab[data-view]').forEach(function (tab) {
      var active = tab.dataset.view === viewName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('main > section[data-view]').forEach(function (section) {
      section.hidden = section.dataset.view !== viewName;
    });
  }

  function refreshBeatSelectionStatus() {
    if (!beatPlaceholder || beatSelectionRequestInFlight) return;
    if (!cep || typeof cep.evalScript !== 'function') {
      beatPlaceholder.textContent = 'After Effects host is unavailable.';
      return;
    }
    beatSelectionRequestInFlight = true;
    cep.evalScript('tkGetBeatMarkerLayerStatus()', function (result) {
      beatSelectionRequestInFlight = false;
      var message = String(result || '').trim();
      if (message && message !== 'EvalScript error.') beatPlaceholder.textContent = message;
    });
  }

  function stopBeatSelectionPolling() {
    if (beatSelectionTimer) clearInterval(beatSelectionTimer);
    beatSelectionTimer = null;
  }

  function startBeatSelectionPolling() {
    stopBeatSelectionPolling();
    refreshBeatSelectionStatus();
    if (!cep || typeof cep.evalScript !== 'function') return;
    beatSelectionTimer = setInterval(function () {
      var audioTab = document.querySelector('.view-tab[data-view="audio"]');
      if (!audioTab || !audioTab.classList.contains('active')) {
        stopBeatSelectionPolling();
        return;
      }
      refreshBeatSelectionStatus();
    }, 1000);
  }

  document.querySelectorAll('.view-tab[data-view]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      functionSearch.hidden = true;
      activateView(tab.dataset.view);
      if (tab.dataset.view === 'audio') startBeatSelectionPolling();
      else stopBeatSelectionPolling();
    });
  });

  function getPreference(key, fallback) {
    try {
      var value = window.localStorage.getItem('toolkeeper.' + key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function setPreference(key, value) {
    try { window.localStorage.setItem('toolkeeper.' + key, value); } catch (error) {}
  }

  var defaultView = getPreference('defaultView', 'layer');
  if (defaultView === 'music') defaultView = 'audio';
  if (['layer', 'text', 'audio'].indexOf(defaultView) === -1) defaultView = 'layer';
  activateView(defaultView);
  if (defaultView === 'audio') startBeatSelectionPolling();

  var searchToggle = document.getElementById('search-toggle');
  var functionSearch = document.getElementById('function-search');
  var functionSearchInput = document.getElementById('function-search-input');
  var functionSearchResults = document.getElementById('function-search-results');
    var resizePrecompsDialog = document.getElementById('resize-precomps-dialog');
    var resizePrecompsWidth = document.getElementById('resize-precomps-width');
    var resizePrecompsHeight = document.getElementById('resize-precomps-height');
    var resizePrecompsApply = document.getElementById('resize-precomps-apply');
    var resizePrecompsCancel = document.getElementById('resize-precomps-cancel');
  var clearSearchOnUse = document.getElementById('clear-search-on-use');
  clearSearchOnUse.checked = getPreference('clearSearchOnUse', 'true') !== 'false';

  var searchableActions = [
    { title: 'Text', keywords: 'text layer create', type: 'text', view: 'layer', action: 'create-text' },
    { title: 'Solid', keywords: 'solid layer create color', type: 'solid', view: 'layer', action: 'create-solid' },
    { title: 'Null Object', keywords: 'null layer create', type: 'null', view: 'layer', action: 'create-null' },
    { title: 'Shape', keywords: 'shape layer create', type: 'shape', view: 'layer', action: 'create-shape' },
    { title: 'Camera', keywords: 'camera layer create', type: 'camera', view: 'layer', action: 'create-camera' },
    { title: 'Light', keywords: 'light layer create', type: 'light', view: 'layer', action: 'create-light' },
    { title: 'Adjustment Layer', keywords: 'adjustment layer create', type: 'adjustment', view: 'layer', action: 'create-adjustment' },
    { title: 'Precomp', keywords: 'precomp pre-compose', view: 'layer', action: 'precomp', target: '[data-action="precomp"]' },
    { title: 'Precomp Each', keywords: 'precomp each individual', view: 'layer', action: 'precomp-each', target: '[data-action="precomp-each"]' },
      { title: 'Resize Precomps', keywords: 'resize dimensions width height precomp', view: 'layer', action: 'resize-precomps', target: '[data-action="resize-precomps"]' },
      { title: 'Sort by In Point', keywords: 'sort layers in point timing', view: 'layer', action: 'sort-in-point', target: '[data-action="sort-in-point"]' },
    { title: 'Duplicate', keywords: 'duplicate copy layer', view: 'layer', action: 'duplicate', target: '[data-action="duplicate"]' },
    { title: 'Rename', keywords: 'rename layer', view: 'layer', action: 'rename', target: '[data-action="rename"]' },
    { title: 'Fit Keyframes', keywords: 'fit keys keyframes layer', view: 'layer', action: 'fit', target: '[data-action="fit"]' },
    { title: 'Reverse Layer Order', keywords: 'invert reverse selected layers order stack', view: 'layer', action: 'reverse-order', target: '[data-action="reverse-order"]' },
    { title: 'Invert Keyframes', keywords: 'invert reverse keyframes keys', view: 'layer', action: 'invert', target: '[data-action="invert"]' },
    { title: 'Trim to Keyframes', keywords: 'trim keyframes layer', view: 'layer', action: 'trim-keyframes', target: '[data-action="trim-keyframes"]' },
  ];
  var currentSearchMatches = [];

  function normalized(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function closeFunctionSearch() {
    functionSearch.hidden = true;
    document.body.classList.remove('function-search-open');
    if (clearSearchOnUse.checked) {
      functionSearchInput.value = '';
      renderSearchResults('');
    }
  }

  function renderSearchResults(query) {
    var needle = normalized(query);
    var matches = needle ? searchableActions.filter(function (item) {
      return normalized(item.title + ' ' + item.keywords).indexOf(needle) !== -1;
    }).slice(0, 10) : searchableActions.slice(0, 8);
    currentSearchMatches = matches;
    functionSearchResults.innerHTML = '';
    matches.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'function-search-result';
      button.setAttribute('role', 'option');
      button.innerHTML = '<span>' + item.title + '</span><small>' + item.view[0].toUpperCase() + item.view.slice(1) + '</small>';
      button.addEventListener('click', function () {
        closeFunctionSearch();
        if (item.type) {
          if (item.type === 'adjustment') run('tkCreateAdjustmentLayer()');
          else openCreateLayerDialog(item.type);
        } else {
          activateView(item.view);
          var target = item.target ? document.querySelector(item.target) : null;
          if (target) target.click();
        }
      });
      functionSearchResults.appendChild(button);
    });
    if (!matches.length) {
      var empty = document.createElement('div');
      empty.className = 'function-search-empty';
      empty.textContent = 'No functions found';
      functionSearchResults.appendChild(empty);
    }
  }

  searchToggle.addEventListener('click', function () {
    functionSearch.hidden = false;
    document.body.classList.add('function-search-open');
    renderSearchResults(functionSearchInput.value);
    functionSearchInput.focus();
  });

  functionSearchInput.addEventListener('input', function () {
    renderSearchResults(functionSearchInput.value);
  });

  functionSearchInput.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    var item = currentSearchMatches[0];
    if (!item) return;
    event.preventDefault();
    closeFunctionSearch();
    if (item.type) {
      if (item.type === 'adjustment') run('tkCreateAdjustmentLayer()');
      else openCreateLayerDialog(item.type);
    } else {
      activateView(item.view);
      var target = item.target ? document.querySelector(item.target) : null;
      if (target) target.click();
    }
  });

  renderSearchResults('');

  document.querySelectorAll('[data-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      var action = button.dataset.action;
      var calls = {
        undo: 'app.executeCommand(10015)', text: 'tkCreateTextLayer()', adjustment: 'tkCreateAdjustmentLayer()',
        solid: 'tkCreateSolid()', null: 'tkCreateNullLayer()', shape: 'tkCreateShapeLayer()', camera: 'tkCreateCamera()',
        light: 'tkCreateLight()', 'paste-image': 'tkPasteFromClipboard()', precomp: 'tkPrecomposeSelected(true,true)',
        'precomp-each': 'tkPrecomposeEach(true,true)', decomp: 'tkDecomposeSelected()', duplicate: 'tkDuplicateSelected()',
          'sort-in-point': 'tkSortSelectedLayersByInPoint()',
        rename: 'tkOpenRename()', sequence: 'tkSequenceSelected()', fit: 'tkFitKeyframesToLayer()', 'trim-keyframes': 'tkTrimLayersToKeyframes()',
        invert: 'tkInvertKeyframes()', 'reverse-order': 'tkReverseLayerOrder()', 'find-bad': 'tkFindBadFrames()', 'beat-reset': 'tkResetBeatMarkers()',
        'beat-snap': 'tkSnapToMarkers()',
        'beat-sequence': 'tkSequenceToMarkers()', 'beat-cut': 'tkCutToMarkers()', 'select-caption-clips': 'tkSelectCaptionAudio()',
        'save-style': 'tkSaveTextStyle()', 'auto-captions': 'tkCreateAutoCaptions()',
        'split-text': 'tkSplitSelectedText()', 'select-text': 'tkSelectTextLayers()', 'invert-text': 'tkReverseTextLayers()',
        copy: 'tkCopySelection()', paste: 'tkPasteSelection()'
      };
      if (createLayerButtons.indexOf(action) !== -1) {
        openCreateLayerDialog(action);
        return;
      }
      if (action === 'resize-precomps') {
        resizePrecompsDialog.showModal();
        resizePrecompsWidth.focus();
        resizePrecompsWidth.select();
        return;
      }
      if (action === 'rename') {
        var dialog = document.getElementById('rename-dialog');
        dialog.showModal();
        return;
      }
      if (action === 'auto-captions') {
        var panelOpen = !audioCaptionsPanel.hidden;
        audioCaptionsPanel.hidden = panelOpen;
        button.setAttribute('aria-expanded', panelOpen ? 'false' : 'true');
        if (!panelOpen) {
          document.getElementById('audio-captions-status').textContent = '';
          refreshSavedTextStyles();
          refreshSaveStyleAvailability();
        }
        return;
      }
      if (action === 'save-style') {
        cep.evalScript('tkHasSelectedTextLayer()', function (response) {
          if (String(response || '').trim() !== 'true') {
            showActionNotification('Select a text layer in the timeline to save its style.', 'warning');
            return;
          }
          var saveStyleDialog = document.getElementById('save-text-style-dialog');
          var saveStyleName = document.getElementById('save-text-style-name');
          saveStyleName.value = 'My caption style';
          saveStyleDialog.showModal();
          saveStyleName.focus();
          saveStyleName.select();
        });
        return;
      }
      if (action === 'split-text' || action === 'invert-text') {
        if (!cep || typeof cep.evalScript !== 'function') {
          showActionNotification('After Effects host is unavailable.', 'error');
          return;
        }
        cep.evalScript('tkHasSelectedTextLayer()', function (response) {
          if (String(response || '').trim() !== 'true') {
            showActionNotification('Select a text layer in the timeline first.', 'warning');
            return;
          }
          run(calls[action]);
        });
        return;
      }
      if (action === 'add-markers') {
        var sensitivityInput = document.getElementById('beat-sensitivity');
        var sensitivity = sensitivityInput ? (Number(sensitivityInput.value) || 35) : 35;
        var workAreaOnlyToggle = document.getElementById('work-area-only');
        var workAreaOnly = workAreaOnlyToggle ? workAreaOnlyToggle.checked : false;
        var replaceExisting = document.getElementById('replace-markers').checked;
        var status = document.getElementById('beat-placeholder');
        status.textContent = 'Analyzing selected audio...';
        if (!cep || typeof cep.evalScript !== 'function') {
          status.textContent = 'After Effects host is unavailable.';
          showActionNotification(status.textContent, 'error');
          return;
        }
        var script = 'tkAddBeatMarkers(' + sensitivity + ',' + workAreaOnly + ',' + replaceExisting + ')';
        button.disabled = true;
        try {
          cep.evalScript(script, function (result) {
            button.disabled = false;
            var message = result === undefined || result === null ? '' : String(result).trim();
            status.textContent = message && message !== 'EvalScript error.' ? message : 'Could not analyze the selected audio.';
            var failed = !message || message === 'EvalScript error.' || /^(ERROR:|Select |Open |The selected|Unlock |Could not |Not enough)/i.test(message);
            showActionNotification(status.textContent, message.indexOf('No beat peaks found') === 0 ? 'warning' : (failed ? 'error' : 'success'));
          });
        } catch (error) {
          button.disabled = false;
          status.textContent = 'Could not start beat analysis: ' + error.message;
          showActionNotification(status.textContent, 'error');
        }
        return;
      }
      if (!calls[action]) return;
      var confirmationMessages = {
        'beat-reset': 'Remove ToolKeeper beat markers from the selected audio layer?'
      };
      var confirmDestructive = document.getElementById('confirm-destructive');
      if (confirmationMessages[action] && confirmDestructive.checked && !window.confirm(confirmationMessages[action])) return;
      run(calls[action]);
    });
  });

  var newLayerMenu = document.getElementById('new-layer-menu');
  var createLayerDialog = document.getElementById('create-layer-dialog');
  var createLayerType = '';

  document.getElementById('new-layer-button').addEventListener('click', function () {
    newLayerMenu.showModal();
  });

  resizePrecompsCancel.addEventListener('click', function () {
    resizePrecompsDialog.close();
  });
  resizePrecompsDialog.addEventListener('click', function (event) {
    if (event.target === resizePrecompsDialog) resizePrecompsDialog.close();
  });

  resizePrecompsApply.addEventListener('click', function () {
    var width = Number(resizePrecompsWidth.value);
    var height = Number(resizePrecompsHeight.value);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 30000 || height > 30000) {
      showActionNotification('Enter whole-number dimensions from 1 to 30000 pixels.', 'warning');
      return;
    }
    var cep = window.__adobe_cep__;
    if (!cep || typeof cep.evalScript !== 'function') {
      showActionNotification('After Effects host is unavailable.', 'error');
      return;
    }
    resizePrecompsApply.disabled = true;
    cep.evalScript('tkResizeSelectedPrecomps(' + width + ',' + height + ')', function (result) {
      resizePrecompsApply.disabled = false;
      resizePrecompsDialog.close();
      var message = String(result || '').trim();
      var failed = !message || message.indexOf('ERROR:') === 0 || message === 'EvalScript error.';
      if (message.indexOf('ERROR:') === 0) message = message.substring(6).trim();
      showActionNotification(failed ? (message && message !== 'EvalScript error.' ? message : 'Could not resize selected precomps.') : message, failed ? 'error' : 'success');
    });
  });

  document.querySelectorAll('[data-create-type]').forEach(function (button) {
    button.addEventListener('click', function () {
      var type = button.dataset.createType;
      newLayerMenu.close();
      if (type === 'adjustment') {
        run('tkCreateAdjustmentLayer()');
      } else {
        openCreateLayerDialog(type);
      }
    });
  });

  function openCreateLayerDialog(type) {
    createLayerType = type;
    var names = { text: 'Create Text', solid: 'Create Solid', null: 'Create Null', shape: 'Create Shape', camera: 'Create Camera', light: 'Create Light' };
    document.getElementById('create-layer-title').textContent = names[type] || 'Create Layer';
    document.getElementById('create-layer-name').value = names[type].replace(/^Create\s/, '');
    document.getElementById('create-text-field').hidden = type !== 'text';
    document.getElementById('create-color-field').hidden = type !== 'solid';
    document.getElementById('create-size-fields').hidden = type !== 'solid';
    document.getElementById('create-duration-field').hidden = type === 'camera' || type === 'light';
    createLayerDialog.showModal();
  }

  var createLayerButtons = ['text', 'solid', 'null', 'shape', 'camera', 'light', 'adjustment'];
  document.querySelectorAll('[data-action]').forEach(function (button) {
    if (createLayerButtons.indexOf(button.dataset.action) !== -1) {
      button.dataset.configurable = 'true';
    }
  });

  document.querySelectorAll('[data-configurable="true"]').forEach(function (button) {
    button.removeAttribute('data-configurable');
  });

  document.getElementById('create-layer-color').addEventListener('input', function () {
    document.getElementById('create-layer-color-text').value = this.value;
  });
  document.getElementById('create-layer-color-text').addEventListener('input', function () {
    if (/^#[0-9a-f]{6}$/i.test(this.value)) document.getElementById('create-layer-color').value = this.value;
  });

  document.getElementById('create-layer-cancel').addEventListener('click', function () {
    createLayerDialog.close();
  });

  document.getElementById('create-layer-confirm').addEventListener('click', function () {
    var name = document.getElementById('create-layer-name').value.trim();
    if (!name) name = 'Layer';
    var duration = Math.max(0.04, Number(document.getElementById('create-layer-duration').value) || 5);
    var script = '';
    if (createLayerType === 'text') {
      var text = document.getElementById('create-layer-text').value.trim() || 'Text';
      script = 'tkCreateTextLayer(' + JSON.stringify(name) + ',' + JSON.stringify(text) + ',' + duration + ')';
    } else if (createLayerType === 'solid') {
      var hex = document.getElementById('create-layer-color-text').value.trim();
      if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = '#cccccc';
      var width = Math.max(1, Math.round(Number(document.getElementById('create-layer-width').value) || 1920));
      var height = Math.max(1, Math.round(Number(document.getElementById('create-layer-height').value) || 1080));
      var red = parseInt(hex.slice(1, 3), 16) / 255;
      var green = parseInt(hex.slice(3, 5), 16) / 255;
      var blue = parseInt(hex.slice(5, 7), 16) / 255;
      script = 'tkCreateSolid(' + JSON.stringify(name) + ',' + red + ',' + green + ',' + blue + ',' + width + ',' + height + ',' + duration + ')';
    } else if (createLayerType === 'null') script = 'tkCreateNullLayer(' + JSON.stringify(name) + ',' + duration + ')';
    else if (createLayerType === 'shape') script = 'tkCreateShapeLayer(' + JSON.stringify(name) + ',' + duration + ')';
    else if (createLayerType === 'camera') script = 'tkCreateCamera(' + JSON.stringify(name) + ')';
    else if (createLayerType === 'light') script = 'tkCreateLight(' + JSON.stringify(name) + ')';
    if (script) {
      createLayerDialog.close();
      run(script);
    }
  });

  document.getElementById('save-text-style-cancel').addEventListener('click', function () {
    document.getElementById('save-text-style-dialog').close();
  });

  document.getElementById('save-text-style-name').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('save-text-style-confirm').click();
    }
  });

  document.getElementById('save-text-style-confirm').addEventListener('click', function () {
    var styleName = document.getElementById('save-text-style-name').value.trim();
    if (!styleName) {
      document.getElementById('save-text-style-name').focus();
      return;
    }
    document.getElementById('save-text-style-dialog').close();
    run('tkSaveTextStyle(' + JSON.stringify(styleName) + ')');
    refreshSavedTextStyles();
  });

  document.getElementById('rename-confirm').addEventListener('click', function () {
    var name = document.getElementById('rename-name').value.trim();
    if (!name) return;
    run('tkRenameSelected("' + name.replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '")');
  });

  document.getElementById('settings-button').addEventListener('click', function () {
    document.getElementById('default-view').value = defaultView;
    document.getElementById('settings-dialog').showModal();
  });

  document.getElementById('default-view').addEventListener('change', function () {
    defaultView = this.value;
    setPreference('defaultView', defaultView);
  });

  document.getElementById('confirm-destructive').checked = getPreference('confirmDestructive', 'true') !== 'false';
  document.getElementById('confirm-destructive').addEventListener('change', function () {
    setPreference('confirmDestructive', this.checked ? 'true' : 'false');
  });

  clearSearchOnUse.addEventListener('change', function () {
    setPreference('clearSearchOnUse', this.checked ? 'true' : 'false');
  });

  var pendingCaptionEntries = [];
  var pendingCaptionOriginalEntries = [];
  var pendingCaptionCompId = '';
  var pendingCaptionTextStyle = {};
  var pendingCaptionAudioPath = '';
  var pendingCaptionAudioDuration = 0;
  var pendingCaptionAudioCompIn = 0;
  var pendingCaptionLanguage = '';
  var pendingCaptionLetterCase = 'normal';
  var pendingCaptionKeepPunctuation = true;
  var pendingCaptionAlignment = 'whisper';
  var audioCaptionsPanel = document.getElementById('audio-captions-panel');
  var captionProgressDialog = document.getElementById('caption-progress-dialog');
  var captionProgressStatus = document.getElementById('caption-progress-status');
  var captionProgressPercent = document.getElementById('caption-progress-percent');
  var captionProgressBar = document.querySelector('.caption-progress-bar');
  var captionProgressClose = document.getElementById('caption-progress-close');
  var captionReviewDialog = document.getElementById('caption-review-dialog');
  var audioCaptionsStatus = document.getElementById('audio-captions-status');
  var audioCaptionsRunButton = document.getElementById('audio-captions-run');
  var actionNotification = document.getElementById('action-notification');
  var actionNotificationTimer = null;
  var actionNotificationHideTimer = null;

  function showActionNotification(message, tone) {
    if (!actionNotification) return;
    if (actionNotificationTimer) clearTimeout(actionNotificationTimer);
    if (actionNotificationHideTimer) clearTimeout(actionNotificationHideTimer);
    actionNotification.textContent = message;
    actionNotification.classList.toggle('is-error', tone === 'error');
    actionNotification.classList.toggle('is-success', tone === 'success');
    actionNotification.classList.toggle('is-warning', tone === 'warning');
    actionNotification.hidden = false;
    actionNotification.classList.remove('is-visible');
    void actionNotification.offsetWidth;
    requestAnimationFrame(function () { actionNotification.classList.add('is-visible'); });
    actionNotificationTimer = setTimeout(function () {
      actionNotification.classList.remove('is-visible');
      actionNotificationHideTimer = setTimeout(function () {
        actionNotification.hidden = true;
        actionNotification.classList.remove('is-error', 'is-success', 'is-warning');
        actionNotificationHideTimer = null;
      }, 160);
      actionNotificationTimer = null;
    }, tone === 'error' ? 5000 : 3000);
  }

  function getCaptionNodeModules() {
    var cepNode = window.cep_node || (typeof cep_node !== 'undefined' ? cep_node : null);
    if (!cepNode || typeof cepNode.require !== 'function') throw new Error('ToolKeeper Node runtime is unavailable.');
    return {
      childProcess: cepNode.require('child_process'),
      fs: cepNode.require('fs'),
      os: cepNode.require('os'),
      path: cepNode.require('path'),
      process: cepNode.require('process')
    };
  }

  function setCaptionBusy(busy) {
    audioCaptionsRunButton.disabled = busy;
  }

  function openCaptionProgress(message) {
    captionProgressStatus.textContent = message || 'Preparing captions...';
    setCaptionProgressValue(5);
    captionProgressClose.disabled = true;
    if (!captionProgressDialog.open) captionProgressDialog.showModal();
  }

  function setCaptionProgressValue(percent) {
    var value = Math.max(0, Math.min(100, Number(percent) || 0));
    if (captionProgressBar) {
      captionProgressBar.removeAttribute('indeterminate');
      captionProgressBar.value = value;
      captionProgressBar.max = 100;
    }
    captionProgressPercent.textContent = value + '%';
  }

  function setCaptionProgress(message, percent) {
    captionProgressStatus.textContent = String(message || '').trim() || 'Working...';
    if (percent !== undefined) setCaptionProgressValue(percent);
  }

  function finishCaptionProgress(message) {
    setCaptionProgress(message, 100);
    captionProgressClose.disabled = false;
  }

  function closeCaptionProgress() {
    if (captionProgressDialog.open) captionProgressDialog.close();
  }

  captionProgressClose.addEventListener('click', closeCaptionProgress);

  function captionSetupScript(modules) {
    var extensionSupport = modules.path.join(modules.os.homedir(), 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
    var candidates = [
      modules.path.join(extensionSupport, 'ToolKeeperDev', 'scripts', 'setup-whisper.command'),
      modules.path.join(extensionSupport, 'ToolKeeper', 'scripts', 'setup-whisper.command')
    ];
    for (var i = 0; i < candidates.length; i++) if (modules.fs.existsSync(candidates[i])) return candidates[i];
    return '';
  }

  function captionHelperScript(modules, name) {
    var extensionSupport = modules.path.join(modules.os.homedir(), 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
    var candidates = [
      modules.path.join(extensionSupport, 'ToolKeeperDev', 'scripts', name),
      modules.path.join(extensionSupport, 'ToolKeeper', 'scripts', name)
    ];
    for (var i = 0; i < candidates.length; i++) if (modules.fs.existsSync(candidates[i])) return candidates[i];
    return '';
  }

  function getWhisperPythonPath(modules) {
    var supportPath = modules.path.join(modules.os.homedir(), 'Library', 'Application Support', 'ToolKeeper');
    var candidates = ['whisper-venv-py313', 'whisper-venv-py312', 'whisper-venv-py311', 'whisper-venv-py310', 'whisper-venv-py39', 'whisper-venv'];
    for (var i = 0; i < candidates.length; i++) {
      var pythonPath = modules.path.join(supportPath, candidates[i], 'bin', 'python3');
      if (modules.fs.existsSync(pythonPath)) return pythonPath;
    }
    return '';
  }

  function parseWhisperOutput(output) {
    var text = String(output || '').trim();
    try { return JSON.parse(text); } catch (directError) {}
    var lines = text.split(/[\r\n]+/);
    for (var i = lines.length - 1; i >= 0; i--) {
      var line = lines[i].trim();
      if (line.charAt(0) === '{') {
        try { return JSON.parse(line); } catch (lineError) {}
      }
    }
    throw new Error(text ? text.slice(0, 500) : 'Whisper returned no JSON on stdout.');
  }

  function formatCaptionText(text) {
    var formatted = String(text);
    if (pendingCaptionLetterCase === 'upper') formatted = formatted.toLocaleUpperCase();
    else if (pendingCaptionLetterCase === 'lower') formatted = formatted.toLocaleLowerCase();
    if (!pendingCaptionKeepPunctuation) {
      formatted = formatted.replace(/[,.!?;:…]+/g, '').replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/gm, '');
    }
    return formatted;
  }

  function normalizeCaptionEntries(captions, compIn) {
    var entries = [];
    var phrase = '';
    captions.forEach(function (caption) {
      var word = String(caption.word || caption.text || '').trim();
      if (!word) return;
      if (caption.sentenceStart) phrase = '';
      phrase = phrase ? phrase + ' ' + word : word;
      entries.push({
        word: word,
        originalWord: word,
        start: Number(caption.start) + compIn,
        end: Number(caption.end) + compIn,
        text: formatCaptionText(phrase),
        sentenceStart: Boolean(caption.sentenceStart),
        alignmentOutlier: Boolean(caption.alignmentOutlier)
      });
    });
    if (entries.length) entries[0].sentenceStart = true;
    return entries;
  }

  function rebuildCaptionEntries(text) {
    var words = String(text || '').match(/\S+/g) || [];
    var sentenceStarts = [];
    var parts = String(text || '').split(/\n\s*\n/);
    var consumed = 0;
    parts.forEach(function (part) {
      if (!part.trim()) return;
      sentenceStarts.push(consumed);
      consumed += (part.trim().match(/\S+/g) || []).length;
    });

    var oldEntries = pendingCaptionOriginalEntries.length
      ? pendingCaptionOriginalEntries.slice()
      : pendingCaptionEntries.slice();
    function normalizedCaptionWord(value) {
      return String(value || '')
        .toLocaleLowerCase()
        .replace(/^[^a-z0-9À-ž]+|[^a-z0-9À-ž]+$/gi, '')
        .replace(/[^a-z0-9À-ž]+/gi, '');
    }
    var originalWords = oldEntries.map(function (entry) {
      return normalizedCaptionWord(entry.originalWord || entry.word);
    });

    var rows = originalWords.length + 1;
    var columns = words.length + 1;
    var costs = [];
    var choices = [];
    var i;
    var j;
    for (i = 0; i < rows; i++) {
      costs[i] = [];
      choices[i] = [];
      costs[i][0] = i;
      choices[i][0] = 'delete';
    }
    for (j = 0; j < columns; j++) {
      costs[0][j] = j;
      choices[0][j] = 'insert';
    }
    choices[0][0] = '';

    for (i = 1; i < rows; i++) {
      for (j = 1; j < columns; j++) {
        var match = originalWords[i - 1] === normalizedCaptionWord(words[j - 1]);
        var replaceCost = costs[i - 1][j - 1] + (match ? 0 : 1);
        var deleteCost = costs[i - 1][j] + 1;
        var insertCost = costs[i][j - 1] + 1;
        if (replaceCost <= deleteCost && replaceCost <= insertCost) {
          costs[i][j] = replaceCost;
          choices[i][j] = match ? 'match' : 'replace';
        } else if (deleteCost <= insertCost) {
          costs[i][j] = deleteCost;
          choices[i][j] = 'delete';
        } else {
          costs[i][j] = insertCost;
          choices[i][j] = 'insert';
        }
      }
    }

    var alignedOldIndexes = new Array(words.length);
    i = originalWords.length;
    j = words.length;
    var operationStack = [];
    while (i > 0 || j > 0) {
      var choice = choices[i][j];
      if (choice === 'match' || choice === 'replace') {
        operationStack.push({ kind: choice, oldIndex: i - 1, wordIndex: j - 1 });
        i--;
        j--;
      } else if (choice === 'delete') {
        i--;
      } else {
        operationStack.push({ kind: 'insert', oldIndex: -1, wordIndex: j - 1 });
        j--;
      }
    }
    operationStack.reverse();
    operationStack.forEach(function (operation) {
      if (operation.kind !== 'insert') alignedOldIndexes[operation.wordIndex] = operation.oldIndex;
    });

    var finalAudioEnd = pendingCaptionAudioCompIn + pendingCaptionAudioDuration;
    pendingCaptionEntries = words.map(function (word, index) {
      var oldIndex = alignedOldIndexes[index];
      var old = oldIndex !== undefined ? oldEntries[oldIndex] : null;
      var timing;
      if (old) {
        timing = { start: old.start, end: old.end };
      } else {
        var previousOld = null;
        var nextOld = null;
        for (i = index - 1; i >= 0; i--) {
          if (alignedOldIndexes[i] !== undefined) { previousOld = oldEntries[alignedOldIndexes[i]]; break; }
        }
        for (i = index + 1; i < words.length; i++) {
          if (alignedOldIndexes[i] !== undefined) { nextOld = oldEntries[alignedOldIndexes[i]]; break; }
        }
        if (!previousOld && nextOld) {
          timing = { start: Math.max(pendingCaptionAudioCompIn, nextOld.start - 0.04), end: nextOld.start };
        } else if (previousOld && !nextOld) {
          timing = { start: previousOld.end, end: Math.min(finalAudioEnd || previousOld.end + 0.04, previousOld.end + 0.04) };
        } else if (previousOld && nextOld) {
          timing = { start: previousOld.end, end: nextOld.start };
        } else {
          timing = { start: pendingCaptionAudioCompIn, end: Math.min(finalAudioEnd || pendingCaptionAudioCompIn + 0.04, pendingCaptionAudioCompIn + 0.04) };
        }
      }
      return {
        word: word,
        originalWord: old ? old.originalWord : word,
        start: timing.start,
        end: timing.end,
        text: '',
        sentenceStart: sentenceStarts.indexOf(index) !== -1 || index === 0,
        alignmentOutlier: Boolean(old && old.alignmentOutlier),
        edited: Boolean(!old || old.originalWord !== word)
      };
    });

    for (i = 0; i < pendingCaptionEntries.length; i++) {
      var currentEntry = pendingCaptionEntries[i];
      var currentOldIndex = alignedOldIndexes[i];
      if (currentOldIndex === undefined) continue;
      var nextOldIndex = -1;
      for (j = i + 1; j < pendingCaptionEntries.length; j++) {
        if (alignedOldIndexes[j] !== undefined) {
          nextOldIndex = alignedOldIndexes[j];
          break;
        }
      }
      if (nextOldIndex >= 0 && oldEntries[nextOldIndex].start > currentEntry.start) {
        currentEntry.end = oldEntries[nextOldIndex].start;
      } else {
        var sentenceEnd = i + 1;
        while (sentenceEnd < pendingCaptionEntries.length && !pendingCaptionEntries[sentenceEnd].sentenceStart) sentenceEnd++;
        if (sentenceEnd < pendingCaptionEntries.length) {
          var sentenceNextOldIndex = alignedOldIndexes[sentenceEnd];
          if (sentenceNextOldIndex !== undefined && oldEntries[sentenceNextOldIndex].start > currentEntry.start) {
            currentEntry.end = oldEntries[sentenceNextOldIndex].start;
          }
        }
      }
      if (currentEntry.end <= currentEntry.start) currentEntry.end = oldEntries[currentOldIndex].end;
    }

    for (i = 0; i < pendingCaptionEntries.length; i++) {
      var entry = pendingCaptionEntries[i];
      var alignedIndex = alignedOldIndexes[i];
      if (alignedIndex !== undefined) {
        entry.start = oldEntries[alignedIndex].start;
        entry.end = oldEntries[alignedIndex].end;
      }
      if (i > 0) {
        var previousEntry = pendingCaptionEntries[i - 1];
        if (entry.start < previousEntry.end) entry.start = previousEntry.end;
      }
      if (entry.end < entry.start + 0.001) entry.end = entry.start + 0.001;
    }

    var phrase = '';
    pendingCaptionEntries.forEach(function (entry) {
      if (entry.sentenceStart) phrase = '';
      phrase = phrase ? phrase + ' ' + entry.word : entry.word;
      entry.text = formatCaptionText(phrase);
    });
  }

  function cleanupCaptionAudio(modules) {
    if (!pendingCaptionAudioPath) return;
    try { if (modules.fs.existsSync(pendingCaptionAudioPath)) modules.fs.unlinkSync(pendingCaptionAudioPath); } catch (error) {}
    pendingCaptionAudioPath = '';
  }

  document.getElementById('caption-review-cancel').addEventListener('click', function () {
    try { var modules = getCaptionNodeModules(); cleanupCaptionAudio(modules); } catch (error) {}
    pendingCaptionEntries = [];
    pendingCaptionOriginalEntries = [];
    captionReviewDialog.close();
  });

  function refreshSaveStyleAvailability() {
    var saveButton = document.querySelector('[data-action="save-style"]');
    if (!saveButton) return;
    saveButton.disabled = false;
    saveButton.title = 'Save the selected text layer style';
  }

  setInterval(function () {
    if (audioCaptionsPanel && !audioCaptionsPanel.hidden) refreshSaveStyleAvailability();
  }, 500);

  function refreshSavedTextStyles() {
    var cep = window.__adobe_cep__ || window.cep;
    var select = document.getElementById('audio-captions-text-style');
    var deleteButton = document.getElementById('delete-text-style');
    deleteButton.disabled = !select.value;
    if (!cep || typeof cep.evalScript !== 'function') return;
    cep.evalScript('tkGetSavedTextStyles()', function (response) {
      var names = [];
      var text = String(response || '');
      if (text.indexOf('TK_TEXT_STYLES|') === 0) {
        try { names = JSON.parse(decodeURIComponent(text.substring('TK_TEXT_STYLES|'.length))) || []; } catch (error) { names = []; }
      }
      select.innerHTML = '<option value="">Selected text layer</option>';
      names.forEach(function (name) {
        if (!name) return;
        var option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
    });
  }

  (function setupSavedTextStyleDelete() {
    var select = document.getElementById('audio-captions-text-style');
    var deleteButton = document.getElementById('delete-text-style');
    select.addEventListener('change', function () {
      deleteButton.disabled = !String(select.value || '').trim();
    });
    deleteButton.addEventListener('click', function () {
      var cep = window.__adobe_cep__ || window.cep;
      var styleName = String(select.value || '').trim();
      if (!styleName || !cep || typeof cep.evalScript !== 'function') return;
      cep.evalScript('tkDeleteSavedTextStyle(' + JSON.stringify(styleName) + ')', function (response) {
        var result = String(response || '').trim();
        if (/^(ERROR:|Select)/i.test(result)) {
          showActionNotification(result.replace(/^ERROR:\s*/i, '') || 'Could not delete text style.', 'error');
          return;
        }
        showActionNotification('Deleted saved text style: ' + styleName, 'success');
        select.selectedIndex = 0;
        deleteButton.disabled = true;
        refreshSavedTextStyles();
      });
    });
  })();

  function ensureWhisperReady(modules, callback) {
    var python = getWhisperPythonPath(modules);
    if (python) { callback(python, ''); return; }
    var setupScript = captionSetupScript(modules);
    if (!setupScript) { callback('', 'Whisper setup script is missing.'); return; }
    openCaptionProgress('Setting up Whisper for the first use...');
    setCaptionProgressValue(5);
    var child;
    try { child = modules.childProcess.spawn('/bin/zsh', [setupScript], { stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) { callback('', 'Whisper setup could not start: ' + error.message); return; }
    var stderrText = '';
    var progressRemainder = '';
    var finished = false;
    function finishSetup(path, message) {
      if (finished) return;
      finished = true;
      callback(path, message);
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', function (chunk) {
      var lines = (progressRemainder + String(chunk || '')).split(/\r?\n/);
      progressRemainder = lines.pop() || '';
      lines.forEach(function (line) {
        var progress = line.match(/^TK_SETUP_PROGRESS:(\d+):(.+)$/);
        if (progress) setCaptionProgress(progress[2], Number(progress[1]));
      });
    });
    child.stderr.on('data', function (chunk) { stderrText = (stderrText + String(chunk || '')).slice(-12000); });
    child.on('error', function (error) { finishSetup('', 'Whisper setup failed: ' + error.message); });
    child.on('close', function (exitCode) {
      if (exitCode !== 0) {
        finishSetup('', 'Whisper setup failed: ' + String(stderrText || ('process exited with code ' + exitCode)).trim());
        return;
      }
      python = getWhisperPythonPath(modules);
      if (!python) { finishSetup('', 'Whisper setup finished, but the local Python environment could not be found.'); return; }
      finishSetup(python, 'Local Whisper is ready.');
    });
  }

  audioCaptionsRunButton.addEventListener('click', function () {
    pendingCaptionLetterCase = document.getElementById('audio-captions-case').value;
    pendingCaptionKeepPunctuation = document.getElementById('caption-punctuation').checked;
    var cep = window.__adobe_cep__ || window.cep;
    if (!cep || typeof cep.evalScript !== 'function') { audioCaptionsStatus.textContent = 'After Effects host is unavailable.'; return; }
    var modules;
    try { modules = getCaptionNodeModules(); } catch (error) { audioCaptionsStatus.textContent = error.message; return; }
    setCaptionBusy(true);
    cep.evalScript('tkGetSelectedAudioForCaptions()', function (selectionResponse) {
      selectionResponse = String(selectionResponse || '');
      if (selectionResponse.indexOf('TK_CAPTION_AUDIO|') !== 0) {
        setCaptionBusy(false);
        var selectionMessage = selectionResponse.replace(/^ERROR:\s*/i, '') || 'Select one audio or video layer in the timeline.';
        showActionNotification(selectionMessage, 'warning');
        audioCaptionsStatus.textContent = selectionMessage;
        closeCaptionProgress();
        return;
      }
      openCaptionProgress('Preparing captions...');
      ensureWhisperReady(modules, function (python, setupMessage) {
      if (!python) { setCaptionBusy(false); finishCaptionProgress(setupMessage || 'Whisper is not installed.'); return; }
      if (setupMessage) setCaptionProgress(setupMessage, 25);
      setCaptionProgress('Preparing the selected audio layer...', 30);
      cep.evalScript('tkGetSelectedAudioForCaptions()', function (response) {
      response = String(response || '');
      if (response.indexOf('TK_CAPTION_AUDIO|') !== 0) {
        setCaptionBusy(false);
        audioCaptionsStatus.textContent = response.replace(/^ERROR:\s*/i, '') || 'Could not prepare selected audio.';
        return;
      }
      var audioInfo;
      try { audioInfo = JSON.parse(decodeURIComponent(response.substring('TK_CAPTION_AUDIO|'.length))); }
      catch (error) { setCaptionBusy(false); audioCaptionsStatus.textContent = 'The selected audio information could not be read.'; return; }
      var ffmpeg = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'].find(function (candidate) { return modules.fs.existsSync(candidate); });
      if (!ffmpeg) { setCaptionBusy(false); audioCaptionsStatus.textContent = 'FFmpeg is required. Install it with: brew install ffmpeg'; return; }
      var helper = captionHelperScript(modules, 'transcribe_audio.py');
      if (!helper) { setCaptionBusy(false); audioCaptionsStatus.textContent = 'ToolKeeper transcription script is missing.'; return; }
      pendingCaptionCompId = String(audioInfo.compId || '');
      pendingCaptionTextStyle = audioInfo.textStyle || {};
      var savedStyleName = String(document.getElementById('audio-captions-text-style').value || '').trim();
      pendingCaptionAudioPath = audioInfo.tempPath;
      pendingCaptionAudioDuration = Number(audioInfo.duration) || 0;
      pendingCaptionAudioCompIn = Number(audioInfo.compIn) || 0;
      var ffmpegArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(audioInfo.sourceIn), '-i', audioInfo.sourcePath, '-t', String(audioInfo.duration), '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audioInfo.tempPath];
      if (savedStyleName) {
        cep.evalScript('tkGetSavedTextStyle(' + JSON.stringify(savedStyleName) + ')', function (styleResponse) {
          var styleText = String(styleResponse || '');
          if (styleText.indexOf('TK_TEXT_STYLE|') === 0) {
            try { pendingCaptionTextStyle = JSON.parse(decodeURIComponent(styleText.substring('TK_TEXT_STYLE|'.length))) || {}; } catch (error) {}
          }
          startCaptionAudioExtraction();
        });
      } else {
        startCaptionAudioExtraction();
      }

      function startCaptionAudioExtraction() {
      setCaptionProgress('Extracting audio from the selected layer...', 40);
      modules.childProcess.execFile(ffmpeg, ffmpegArgs, { maxBuffer: 4 * 1024 * 1024 }, function (ffmpegError, stdout, stderr) {
        if (ffmpegError) { setCaptionBusy(false); finishCaptionProgress('Could not extract audio: ' + String(stderr || ffmpegError.message).trim()); return; }
        var language = String(document.getElementById('audio-captions-language').value || '').trim();
      var accuracy = document.querySelector('input[name="accuracy"]:checked');
      var modelsByAccuracy = { fast: 'tiny', precise: 'small', best: 'medium' };
      var model = accuracy ? (modelsByAccuracy[accuracy.value] || 'medium') : 'medium';
        var env = Object.assign({}, modules.process.env);
        env.PATH = modules.path.dirname(ffmpeg) + ':' + (env.PATH || '');
        setCaptionProgress('Transcribing speech with Whisper. The first run may take longer...', 55);
        var child;
        try { child = modules.childProcess.spawn(python, [helper, audioInfo.tempPath, model, language], { env: env, stdio: ['ignore', 'pipe', 'pipe'] }); }
        catch (error) { setCaptionBusy(false); finishCaptionProgress('Could not start Whisper: ' + error.message); return; }
        var stdoutText = '';
        var stderrText = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', function (chunk) { stdoutText += String(chunk || ''); });
        child.stderr.on('data', function (chunk) {
          var text = String(chunk || '');
          stderrText = (stderrText + text).slice(-12000);
          var progress = text.match(/TK_PROGRESS:([^\r\n]+)/);
          var progressText = progress ? progress[1].trim() : '';
          if (progressText.indexOf('Loading') !== -1) setCaptionProgress(progressText, 60);
          else if (progressText.indexOf('Transcribing') !== -1) setCaptionProgress(progressText, 70);
          else if (progressText.indexOf('Aligning') !== -1) setCaptionProgress(progressText, 85);
          else if (progressText) setCaptionProgress(progressText, 90);
        });
        child.on('close', function (exitCode) {
          setCaptionBusy(false);
          if (exitCode !== 0) { setCaptionBusy(false); finishCaptionProgress('Transcription failed: ' + String(stderrText || ('process exited with code ' + exitCode)).trim().slice(-1800)); return; }
          var transcription;
          try { transcription = parseWhisperOutput(stdoutText); }
          catch (error) { setCaptionBusy(false); finishCaptionProgress('Whisper returned unreadable output: ' + error.message); return; }
          var captions = (transcription.captions || []).map(function (caption) {
            return { text: caption.text, word: caption.word, sentenceStart: caption.sentenceStart, alignmentOutlier: caption.alignmentOutlier, start: Number(caption.start), end: Number(caption.end) };
          }).filter(function (caption) { return caption.word && caption.end > caption.start; });
          if (!captions.length) { setCaptionBusy(false); finishCaptionProgress('No speech was detected in the selected audio.'); return; }
          pendingCaptionEntries = normalizeCaptionEntries(captions, pendingCaptionAudioCompIn);
          pendingCaptionOriginalEntries = pendingCaptionEntries.map(function (entry) {
            return {
              word: entry.word,
              originalWord: entry.originalWord,
              start: entry.start,
              end: entry.end,
              text: entry.text,
              sentenceStart: entry.sentenceStart,
              alignmentOutlier: entry.alignmentOutlier,
              edited: false
            };
          });
          if (pendingCaptionEntries.length) {
            var finalCaptionEnd = pendingCaptionAudioCompIn + pendingCaptionAudioDuration;
            if (finalCaptionEnd > pendingCaptionEntries[pendingCaptionEntries.length - 1].end) {
              pendingCaptionEntries[pendingCaptionEntries.length - 1].end = finalCaptionEnd;
            }
          }
          pendingCaptionLanguage = String(transcription.language || '');
          pendingCaptionAlignment = transcription.alignment === 'forced' ? 'forced' : 'whisper';
          var reviewText = document.getElementById('caption-review-text');
          var sentences = [];
          var current = '';
          pendingCaptionEntries.forEach(function (entry) {
            if (entry.sentenceStart && current) { sentences.push(formatCaptionText(current)); current = ''; }
            current = current ? current + ' ' + entry.word : entry.word;
          });
          if (current) sentences.push(formatCaptionText(current));
          reviewText.value = sentences.join('\n\n');
          setCaptionProgressValue(100);
          closeCaptionProgress();
          captionReviewDialog.showModal();
        });
      });
      }
      });
      });
    });
  });

  document.getElementById('caption-review-text').addEventListener('input', function () {
    var selectionStart = this.selectionStart;
    var selectionEnd = this.selectionEnd;
    var formatted = formatCaptionText(this.value);
    if (formatted !== this.value) {
      this.value = formatted;
      this.setSelectionRange(Math.min(selectionStart, formatted.length), Math.min(selectionEnd, formatted.length));
    }
    rebuildCaptionEntries(this.value);
  });

  ['split-x', 'split-y', 'split-scale'].forEach(function (inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', function () {
      if (!cep || typeof cep.evalScript !== 'function') {
        showActionNotification('After Effects host is unavailable.', 'error');
        return;
      }
      var xOffset = Number(document.getElementById('split-x').value) || 0;
      var yOffset = Number(document.getElementById('split-y').value) || 0;
      var scalePercent = Number(document.getElementById('split-scale').value) || 100;
      cep.evalScript('tkTransformSelectedTextLayers(' + xOffset + ',' + yOffset + ',' + scalePercent + ')', function (result) {
        var message = String(result || '').trim();
        if (message.indexOf('ERROR:') === 0) {
          showActionNotification(message.substring(6).trim(), 'warning');
        } else if (message) {
          showActionNotification(message, 'success');
          document.getElementById('split-x').value = '0';
          document.getElementById('split-y').value = '0';
          document.getElementById('split-scale').value = '100';
        }
      });
    });
  });

  document.getElementById('caption-review-create').addEventListener('click', function () {
    rebuildCaptionEntries(document.getElementById('caption-review-text').value);
    if (!pendingCaptionEntries.length) return;
    var cep = window.__adobe_cep__ || window.cep;
    if (!cep || typeof cep.evalScript !== 'function') return;
    var captions = pendingCaptionEntries.map(function (entry) { return { text: entry.text, word: entry.word, start: entry.start, end: entry.end }; });
    var encodedCaptions = JSON.stringify(encodeURIComponent(JSON.stringify(captions)));
    var encodedTextStyle = JSON.stringify(encodeURIComponent(JSON.stringify(pendingCaptionTextStyle || {})));
    var letterCase = pendingCaptionLetterCase;
    var positionInput = document.querySelector('input[name="caption-position"]:checked');
    var captionPosition = positionInput ? positionInput.value : 'bottom';
    var keepPunctuation = pendingCaptionKeepPunctuation;
    var button = document.getElementById('caption-review-create');
    button.disabled = true;
    cep.evalScript('tkCreateCaptionTextLayers(' + encodedCaptions + ',' + JSON.stringify(String(pendingCaptionCompId)) + ',' + encodedTextStyle + ',' + JSON.stringify(letterCase) + ',' + JSON.stringify(captionPosition) + ',' + JSON.stringify(keepPunctuation) + ')', function (result) {
      button.disabled = false;
      var text = String(result || '');
      if (text.indexOf('ERROR:') === 0 || text === 'EvalScript error.') {
        document.getElementByById('caption-review-text').setAttribute('title', text);
        return;
      }
      try { var modules = getCaptionNodeModules(); cleanupCaptionAudio(modules); } catch (error) {}
      pendingCaptionEntries = [];
      pendingCaptionOriginalEntries = [];
      captionReviewDialog.close();
      if (audioCaptionsPanel) {
        audioCaptionsPanel.hidden = true;
        var autoCaptionsButton = document.querySelector('[data-action="auto-captions"]');
        if (autoCaptionsButton) autoCaptionsButton.setAttribute('aria-expanded', 'false');
      }
    });
  });

  document.querySelectorAll('.segmented').forEach(function (group) {
    group.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (item) { item.classList.remove('active'); });
        button.classList.add('active');
        if (group.classList.contains('caption-letter-case')) {
          document.getElementById('audio-captions-case').value = button.dataset.letterCase;
        }
      });
    });
  });

  document.querySelectorAll('.speed-row button').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('.speed-row button').forEach(function (item) { item.classList.remove('active'); });
      button.classList.add('active');
    });
  });

  [['bad-sensitivity','bad-sensitivity-output'],['beat-sensitivity','beat-sensitivity-output'],['caption-words','caption-words-output']].forEach(function (ids) {
    var input = document.getElementById(ids[0]);
    var output = document.getElementById(ids[1]);
    input.addEventListener('input', function () { output.value = input.value; output.textContent = input.value; });
  });

})();
