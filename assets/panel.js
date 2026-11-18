(function () {
  var cep = window.__adobe_cep__ || window.cep;
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
    if (!button || button.disabled) return;
    button.classList.remove('press-feedback');
    void button.offsetWidth;
    button.classList.add('press-feedback');
  });

  function activateView(viewName) {
    document.querySelectorAll('.view-tab[data-view]').forEach(function (tab) {
      var active = tab.dataset.view === viewName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('main > section[data-view]').forEach(function (section) {
      section.hidden = section.dataset.view !== viewName;
    });
  }

  document.querySelectorAll('.view-tab[data-view]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      functionSearch.hidden = true;
      activateView(tab.dataset.view);
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
  if (['layer', 'text', 'music'].indexOf(defaultView) === -1) defaultView = 'layer';
  activateView(defaultView);

  var searchToggle = document.getElementById('search-toggle');
  var functionSearch = document.getElementById('function-search');
  var functionSearchInput = document.getElementById('function-search-input');
  var functionSearchResults = document.getElementById('function-search-results');
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
    { title: 'Duplicate', keywords: 'duplicate copy layer', view: 'layer', action: 'duplicate', target: '[data-action="duplicate"]' },
    { title: 'Rename', keywords: 'rename layer', view: 'layer', action: 'rename', target: '[data-action="rename"]' },
    { title: 'Fit', keywords: 'fit layer comp', view: 'layer', action: 'fit', target: '[data-action="fit"]' },
    { title: 'Invert', keywords: 'invert reverse order', view: 'layer', action: 'invert', target: '[data-action="invert"]' },
    { title: 'Find Bad Frames', keywords: 'bad frames find broken bad', view: 'layer', action: 'find-bad', target: '[data-action="find-bad"]' },
    { title: 'Beat Markers', keywords: 'beat markers music add markers', view: 'music', action: 'add-markers', target: '[data-action="add-markers"]' },
    { title: 'Snap to Beat', keywords: 'beat snap marker', view: 'music', action: 'beat-snap', target: '[data-action="beat-snap"]' },
    { title: 'Sequence on Beats', keywords: 'beat sequence markers', view: 'music', action: 'beat-sequence', target: '[data-action="beat-sequence"]' },
    { title: 'Auto Captions', keywords: 'captions voice subtitles speech', view: 'text', action: 'auto-captions', target: '[data-action="auto-captions"]' },
    { title: 'Split Text', keywords: 'split text words lines letters', view: 'text', action: 'split-text', target: '[data-action="split-text"]' },
    { title: 'Select Text Layers', keywords: 'select all text layers', view: 'text', action: 'select-text', target: '[data-action="select-text"]' }
  ];
  var currentSearchMatches = [];

  function normalized(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function closeFunctionSearch() {
    functionSearch.hidden = true;
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
          if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
        rename: 'tkOpenRename()', sequence: 'tkSequenceSelected()', fit: 'tkFitSelectedToComp()',
        invert: 'tkReverseLayerOrder()', 'find-bad': 'tkFindBadFrames()', 'beat-reset': 'tkResetBeatMarkers()',
        'beat-markers': 'tkAddBeatMarkers()', 'add-markers': 'tkAddBeatMarkers()', 'beat-snap': 'tkSnapToMarkers()',
        'beat-sequence': 'tkSequenceToMarkers()', 'beat-cut': 'tkCutToMarkers()', 'select-caption-clips': 'tkSelectCaptionAudio()',
        'create-style': 'tkCreateTextStyle()', 'save-style': 'tkSaveTextStyle()', 'auto-captions': 'tkCreateAutoCaptions()',
        'split-text': 'tkSplitSelectedText()', 'select-text': 'tkSelectTextLayers()', 'invert-text': 'tkReverseTextLayers()',
        copy: 'app.executeCommand(16)', paste: 'app.executeCommand(21)'
      };
      if (createLayerButtons.indexOf(action) !== -1) {
        openCreateLayerDialog(action);
        return;
      }
      if (action === 'rename') {
        var dialog = document.getElementById('rename-dialog');
        dialog.showModal();
        return;
      }
      if (!calls[action]) return;
      var confirmationMessages = {
        decomp: 'Decompose the selected precomp and remove the original layer?',
        'beat-reset': 'Remove all beat markers from the composition and its layers?'
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

  document.querySelectorAll('.segmented').forEach(function (group) {
    group.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (item) { item.classList.remove('active'); });
        button.classList.add('active');
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

  if (cep && typeof cep.evalScript === 'function') {
    cep.evalScript('tkGetBeatLayers()', function (result) {
      if (!result || result === 'EvalScript error.' || result.indexOf('[]') === 0) return;
      try {
        var layers = JSON.parse(result);
        var select = document.getElementById('beat-layer');
        layers.forEach(function (layer) { var option = document.createElement('option'); option.value = layer.index; option.textContent = layer.name; select.appendChild(option); });
        var markerButton = document.querySelector('[data-action="beat-markers"]');
        markerButton.disabled = false;
        document.getElementById('beat-placeholder').textContent = 'Audio layer detected';
      } catch (e) {}
    });
  }
})();
