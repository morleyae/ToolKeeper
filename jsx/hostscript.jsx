function tkGetBeatMarkerLayerStatus() {
  var comp = tkSelectedComp();
  if (!comp) return "Open a composition and select one audio layer.";
  var selected = comp.selectedLayers;
  if (selected.length !== 1) return "Select exactly one audio layer in the timeline.";
  var audio = selected[0];
  if (!audio.hasAudio) return "The selected layer has no audio.";
  if (audio.locked) return "Unlock the selected audio layer first.";
  return "Selected audio: " + audio.name;
}

function tkSortSelectedLayersByInPoint() {
  var comp = tkSelectedComp();
  if (!comp) return "Select a composition first.";

  var allLayers = [];
  var selectedLayers = [];
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    allLayers.push(layer);
    if (layer.selected) selectedLayers.push(layer);
  }
  if (selectedLayers.length < 2) return "Select at least two layers to sort.";

  selectedLayers.sort(function (a, b) {
    var difference = b.inPoint - a.inPoint;
    return difference !== 0 ? difference : a.index - b.index;
  });

  var desiredOrder = [];
  var selectedCursor = 0;
  for (i = 0; i < allLayers.length; i++) {
    desiredOrder.push(allLayers[i].selected ? selectedLayers[selectedCursor++] : allLayers[i]);
  }

  try {
    tkBeginUndo("Sort Selected Layers by In-Point");
    for (i = desiredOrder.length - 1; i >= 0; i--) {
      var currentLayer = comp.layer(i + 1);
      if (currentLayer !== desiredOrder[i]) desiredOrder[i].moveBefore(currentLayer);
    }
    for (i = 0; i < allLayers.length; i++) comp.layer(i + 1).selected = allLayers[i].selected;
    tkEndUndo();
    return "Sorted " + selectedLayers.length + " selected layer(s) by in-point. Later in-points are higher in the layer stack.";
  } catch (e) {
    try { tkEndUndo(); } catch (endError) {}
    return "ERROR: Could not sort the selected layers: " + e.toString();
  }
}

function tkResizeSelectedPrecomps(width, height) {
  var comp = tkSelectedComp();
  if (!comp) return "ERROR: Open a composition and select its precomp layers.";
  width = Number(width);
  height = Number(height);
  if (isNaN(width) || isNaN(height) || Math.floor(width) !== width || Math.floor(height) !== height ||
      width < 1 || height < 1 || width > 30000 || height > 30000) {
    return "ERROR: Width and height must be whole numbers from 1 to 30000.";
  }

  var selectedLayers = comp.selectedLayers || [];
  var precomps = [];
  var seenIds = {};
  for (var i = 0; i < selectedLayers.length; i++) {
    var source = selectedLayers[i].source;
    if (source instanceof CompItem && !seenIds["$" + source.id]) {
      seenIds["$" + source.id] = true;
      precomps.push(source);
    }
  }
  if (!precomps.length) return "ERROR: Select one or more precomp layers in the timeline.";

  var resized = 0;
  var failures = [];
  try {
    tkBeginUndo("Resize Selected Precomps");
    for (i = 0; i < precomps.length; i++) {
      var precomp = precomps[i];
      var oldWidth = precomp.width;
      var oldHeight = precomp.height;
      try {
        precomp.width = width;
        precomp.height = height;
        resized++;
      } catch (resizeError) {
        try { precomp.width = oldWidth; precomp.height = oldHeight; } catch (restoreError) {}
        failures.push(precomp.name + ": " + resizeError.toString());
      }
    }
    tkEndUndo();
  } catch (e) {
    try { tkEndUndo(); } catch (endError) {}
    return "ERROR: Could not resize selected precomps. " + e.toString();
  }
  if (!resized) return "ERROR: Could not resize the selected precomps. " + failures.join(" | ");
  return "Resized " + resized + " precomp" + (resized === 1 ? "" : "s") + " to " + width + " x " + height + " px." +
    (failures.length ? " Failed: " + failures.join(" | ") : "");
}

function tkSelectedComp() {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) return null;
  return comp;
}

function tkBeginUndo(name) { app.beginUndoGroup("ToolKeeper: " + name); }
function tkEndUndo() { app.endUndoGroup(); }

function tkSelectedLayers() {
  var comp = tkSelectedComp();
  if (!comp) return [];
  var result = [];
  for (var i = 1; i <= comp.selectedLayers.length; i++) result.push(comp.selectedLayers[i - 1]);
  return result;
}

function tkCreateTextLayer(name, text, duration) {
  try { tkBeginUndo("Create Text"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var l=comp.layers.addText(text||"Text"); l.name=name||"Text"; if(duration&&duration>0){l.startTime=comp.time;l.inPoint=comp.time;l.outPoint=Math.min(comp.duration,comp.time+duration);} tkEndUndo(); return "Text layer created."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkCreateAdjustmentLayer() {
  try { tkBeginUndo("Create Adjustment Layer"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var l=comp.layers.addSolid([.5,.5,.5],"Adjustment Layer",comp.width,comp.height,comp.pixelAspect,comp.duration); l.adjustmentLayer=true; tkEndUndo(); return "Adjustment layer created."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkCreateSolid(name, red, green, blue, width, height, duration) {
  try { tkBeginUndo("Create Solid"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var r=(red==null?.8:red),g=(green==null?.8:green),b=(blue==null?.8:blue);var w=(width||comp.width),h=(height||comp.height);var d=(duration||comp.duration);var l=comp.layers.addSolid([r,g,b],name||"Solid",w,h,comp.pixelAspect,d);if(comp.time>0){l.startTime=comp.time;l.inPoint=comp.time;l.outPoint=Math.min(comp.duration,comp.time+d);}tkEndUndo();return "Solid created.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkCreateNullLayer(name, duration) {
  try { tkBeginUndo("Create Null"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var d=duration||comp.duration;var l=comp.layers.addNull(d);l.name=name||"Null";if(comp.time>0){l.startTime=comp.time;l.inPoint=comp.time;l.outPoint=Math.min(comp.duration,comp.time+d);}tkEndUndo();return "Null object created.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkCreateShapeLayer(name, duration) {
  try { tkBeginUndo("Create Shape"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var l=comp.layers.addShape();l.name=name||"Shape";var d=duration||comp.duration;if(comp.time>0){l.startTime=comp.time;l.inPoint=comp.time;l.outPoint=Math.min(comp.duration,comp.time+d);}tkEndUndo();return "Shape layer created.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkCreateCamera(name) {
  try { tkBeginUndo("Create Camera"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var l=comp.layers.addCamera(name||"Camera 1",[comp.width/2,comp.height/2]);tkEndUndo();return "Camera created.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkCreateLight(name) {
  try { tkBeginUndo("Create Light"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var l=comp.layers.addLight(name||"Light 1",[comp.width/2,comp.height/2]);tkEndUndo();return "Light created.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkPasteFromClipboard() {
  try { tkBeginUndo("Paste"); app.executeCommand(3794); tkEndUndo(); return "Clipboard content pasted."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkCopySelection() {
  try {
    var commandId = app.findMenuCommandId("Copy");
    if (!commandId) return "ERROR: Could not find After Effects' Copy command.";
    app.executeCommand(commandId);
    return "Selection copied.";
  } catch (e) {
    return "ERROR: Could not copy selection. " + e.toString();
  }
}

function tkPasteSelection() {
  try {
    var commandId = app.findMenuCommandId("Paste");
    if (!commandId) return "ERROR: Could not find After Effects' Paste command.";
    app.executeCommand(commandId);
    return "Clipboard pasted.";
  } catch (e) {
    return "ERROR: Could not paste clipboard contents. " + e.toString();
  }
}

function tkPrecomposeSelected(moveAll, adjustDuration) {
  var comp = tkSelectedComp();
  if (!comp) return "Select a composition first.";
  var layers = tkSelectedLayers();
  if (!layers.length) return "Select at least one layer.";

  var earliest = layers[0].inPoint;
  var latest = layers[0].outPoint;
  var indexes = [];
  for (var i = 0; i < layers.length; i++) {
    indexes.push(layers[i].index);
    if (layers[i].inPoint < earliest) earliest = layers[i].inPoint;
    if (layers[i].outPoint > latest) latest = layers[i].outPoint;
  }

  try {
    tkBeginUndo("Precompose");
    var nestedComp = comp.layers.precompose(indexes, "Precomp", moveAll);
    var nestedLayer = null;
    for (i = 1; i <= comp.numLayers; i++) {
      var candidate = comp.layer(i);
      if (candidate.source === nestedComp) {
        nestedLayer = candidate;
        break;
      }
    }
    if (!nestedLayer) throw new Error("Could not find the new precomp layer.");

    if (adjustDuration && nestedComp instanceof CompItem) {
      var duration = Math.max(1 / comp.frameRate, latest - earliest);
      for (var innerIndex = 1; innerIndex <= nestedComp.numLayers; innerIndex++) {
        var innerLayer = nestedComp.layer(innerIndex);
        var innerStart = innerLayer.startTime;
        var innerIn = innerLayer.inPoint;
        var innerOut = innerLayer.outPoint;
        innerLayer.startTime = innerStart - earliest;
        innerLayer.inPoint = Math.max(0, innerIn - earliest);
        innerLayer.outPoint = Math.min(duration, innerOut - earliest);
      }
      nestedComp.duration = duration;
      nestedComp.workAreaStart = 0;
      nestedComp.workAreaDuration = duration;
      nestedLayer.startTime = earliest;
      nestedLayer.inPoint = earliest;
      nestedLayer.outPoint = latest;
    }

    for (i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
    nestedLayer.selected = true;
    tkEndUndo();
    return "Selected layers precomposed.";
  } catch (e) {
    try { tkEndUndo(); } catch (x) {}
    return "ERROR: " + e.toString();
  }
}

function tkPrecomposeEach(moveAll, adjustDuration) {
  var comp=tkSelectedComp();
  if(!comp) return "Select a composition first.";
  var layers=tkSelectedLayers();
  if(!layers.length) return "Select at least one layer.";
  var selected=[];
  for(var i=0;i<layers.length;i++){
    selected.push({
      id:typeof layers[i].id==="number"?layers[i].id:null,
      index:layers[i].index,
      name:layers[i].name,
      inPoint:layers[i].inPoint,
      outPoint:layers[i].outPoint
    });
  }
  selected.sort(function(a,b){return b.index-a.index;});
  var createdComps=[];
  var skipped=0;
  var failures=[];
  app.beginUndoGroup("ToolKeeper: Precompose Each");
  try {
    for(var j=0;j<selected.length;j++){
      var selectedItem=selected[j];
      var sourceLayer=null;
      if(selectedItem.id!==null){
        for(var layerIndex=1;layerIndex<=comp.numLayers;layerIndex++){
          var candidate=comp.layer(layerIndex);
          if(candidate.id===selectedItem.id){sourceLayer=candidate;break;}
        }
      } else {
        sourceLayer=comp.layer(selectedItem.index);
      }
      if(!sourceLayer||sourceLayer.locked){skipped++;continue;}
      try {
        var duration=selectedItem.outPoint-selectedItem.inPoint;
        if(!(duration>0)){skipped++;continue;}
        var nestedComp=comp.layers.precompose([sourceLayer.index],selectedItem.name+" Precomp",true);
        var innerLayer=nestedComp.layer(1);
        innerLayer.startTime-=selectedItem.inPoint;
        innerLayer.inPoint=0;
        innerLayer.outPoint=duration;
        nestedComp.duration=duration;
        var nestedLayer=null;
        for(var outputIndex=1;outputIndex<=comp.numLayers;outputIndex++){
          var candidateLayer=comp.layer(outputIndex);
          if(candidateLayer.source===nestedComp){nestedLayer=candidateLayer;break;}
        }
        if(!nestedLayer) throw new Error("Could not find the new precomp layer in the original composition.");
        nestedLayer.startTime=selectedItem.inPoint;
        nestedLayer.inPoint=selectedItem.inPoint;
        nestedLayer.outPoint=selectedItem.outPoint;
        createdComps.push(nestedComp);
      } catch(layerError){failures.push(selectedItem.name+": "+layerError.toString());}
    }
    for(var k=1;k<=comp.numLayers;k++){
      var compLayer=comp.layer(k);
      compLayer.selected=false;
      for(var createdIndex=0;createdIndex<createdComps.length;createdIndex++){
        if(compLayer.source===createdComps[createdIndex]){compLayer.selected=true;break;}
      }
    }
  } finally {app.endUndoGroup();}
  if(createdComps.length===0)return failures.length>0?"Failed pre-composing: "+failures.join(", "):"No pre-comps created (check locks/duration)";
  var message=createdComps.length+" layer"+(createdComps.length>1?"s":"")+" pre-composed";
  if(failures.length>0)message+= " – "+failures.length+" failed";
  if(skipped>0)message+= " – "+skipped+" skipped";
  return message;
}

function tkDuplicateSelected() {
  try { tkBeginUndo("Duplicate"); var layers=tkSelectedLayers(); if(!layers.length) return "Select at least one layer."; var count=0; for(var i=0;i<layers.length;i++){layers[i].duplicate();count++;} tkEndUndo(); return "Duplicated "+count+" layer"+(count===1?"":"s")+"."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkDecomposeSelected() {
    try {
      tkBeginUndo("Decompose Precomp");
      var comp = tkSelectedComp();
      if (!comp) return "Select a composition first.";
      var layers = tkSelectedLayers();
      if (!layers.length) return "Select a precomp layer.";
      var removed = 0;
      var copied = 0;

      for (var l = layers.length - 1; l >= 0; l--) {
        var outer = layers[l];
        if (!(outer.source instanceof CompItem)) continue;
        var nestedComp = outer.source;
        var start = outer.startTime;
        var displayStart = nestedComp.displayStartTime;
        var scale = [100, 100];
        var position = null;
        var rotation = 0;
        var opacity = 100;
        try { var scaleProperty = outer.property("Scale"); if (scaleProperty) scale = scaleProperty.value; } catch (scaleError) {}
        try { var positionProperty = outer.property("Position"); if (positionProperty) position = positionProperty.value; } catch (positionError) {}
        try { var rotationProperty = outer.property("Rotation"); if (rotationProperty) rotation = rotationProperty.value; } catch (rotationError) {}
        try { var opacityProperty = outer.property("Opacity"); if (opacityProperty) opacity = opacityProperty.value; } catch (opacityError) {}

        for (var i = 1; i <= nestedComp.numLayers; i++) {
          var inner = nestedComp.layer(i);
          var innerStart = inner.startTime;
          var innerIn = inner.inPoint;
          var innerOut = inner.outPoint;
          var previousIds = {};
          var previousLayers = [];
          for (var previousIndex = 1; previousIndex <= comp.numLayers; previousIndex++) {
            var previousLayer = comp.layer(previousIndex);
            previousLayers.push(previousLayer);
            if (typeof previousLayer.id === "number") previousIds["$" + previousLayer.id] = true;
          }
          if (typeof inner.copyToComp !== "function") continue;
          var copy = inner.copyToComp(comp);
          if (!copy) {
            for (var candidateIndex = 1; candidateIndex <= comp.numLayers; candidateIndex++) {
              var candidateCopy = comp.layer(candidateIndex);
              var isNewLayer = false;
              if (typeof candidateCopy.id === "number") {
                isNewLayer = !previousIds["$" + candidateCopy.id];
              } else {
                isNewLayer = true;
                for (var prior = 0; prior < previousLayers.length; prior++) {
                  if (candidateCopy === previousLayers[prior]) { isNewLayer = false; break; }
                }
              }
              if (isNewLayer) { copy = candidateCopy; break; }
            }
          }
          if (!copy) continue;
          copied++;
          var absoluteStart = start + innerStart - displayStart;
          var absoluteIn = start + innerIn - displayStart;
          var absoluteOut = start + innerOut - displayStart;
          copy.startTime = absoluteStart;
          copy.inPoint = Math.max(outer.inPoint, absoluteIn);
          copy.outPoint = Math.min(outer.outPoint, absoluteOut);
          copy.moveBefore(outer);

          if (copy.property("Scale") && scale instanceof Array) {
            var copyScale = copy.property("Scale");
            var scaleValue = copyScale.value;
            if (scaleValue instanceof Array) {
              for (var s = 0; s < scaleValue.length; s++) scaleValue[s] = (scaleValue[s] * (scale[s] || 100)) / 100;
              copyScale.setValue(scaleValue);
            }
          }
          if (copy.property("Opacity")) copy.property("Opacity").setValue(copy.property("Opacity").value * (opacity / 100));
          if (copy.property("Rotation") && rotation) copy.property("Rotation").setValue(copy.property("Rotation").value + rotation);
          try {
            if (copy.property("Position") && position instanceof Array) {
              var copyPosition = copy.property("Position");
              var positionValue = copyPosition.value;
              if (positionValue instanceof Array) {
                var scaleX = (scale.length > 0 ? scale[0] : 100) / 100;
                var scaleY = (scale.length > 1 ? scale[1] : scale[0]) / 100;
                positionValue[0] = position[0] + (positionValue[0] - nestedComp.width / 2) * scaleX;
                if (positionValue.length > 1) positionValue[1] = position[1] + (positionValue[1] - nestedComp.height / 2) * scaleY;
                copyPosition.setValue(positionValue);
              }
            }
          } catch (transformError) {}
        }
        outer.remove();
        removed++;
      }
      tkEndUndo();
      if (!removed) return "Selected layer is not a precomp.";
      return "Decomposed " + removed + " precomp" + (removed === 1 ? "" : "s") + " and copied " + copied + " layer" + (copied === 1 ? "" : "s") + ".";
    } catch (e) {
      try { tkEndUndo(); } catch (x) {}
      return "ERROR: " + e.toString();
    }
  }

function tkDecomposeSelectedLegacy() {
  try { tkBeginUndo("Decompose Precomp"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var layers=tkSelectedLayers(); if(!layers.length) return "Select a precomp layer."; var removed=0; var copied=0; for(var l=layers.length-1;l>=0;l--){var outer=layers[l];if(!(outer.source instanceof CompItem))continue;var nestedComp=outer.source;var start=outer.startTime;var scale=[100,100];var position=null;var rotation=0;var opacity=100;try{var scaleProperty=outer.property("Scale");if(scaleProperty)scale=scaleProperty.value;}catch(scaleError){}try{var positionProperty=outer.property("Position");if(positionProperty)position=positionProperty.value;}catch(positionError){}try{var rotationProperty=outer.property("Rotation");if(rotationProperty)rotation=rotationProperty.value;}catch(rotationError){}try{var opacityProperty=outer.property("Opacity");if(opacityProperty)opacity=opacityProperty.value;}catch(opacityError){}for(var i=1;i<=nestedComp.numLayers;i++){var inner=nestedComp.layer(i);var copy=null;if(typeof inner.copyToComp=== "function")copy=inner.copyToComp(comp);else continue;if(!copy)continue;copied++;var innerStart=inner.startTime;var absoluteStart=start+innerStart-nestedComp.displayStartTime;copy.startTime=absoluteStart;copy.inPoint=Math.max(comp.workAreaStart,Math.max(outer.inPoint,outer.inPoint+(inner.inPoint-nestedComp.displayStartTime)));copy.outPoint=Math.min(comp.duration,Math.min(outer.outPoint,outer.inPoint+(inner.outPoint-nestedComp.displayStartTime)));if(copy.property("Scale")&&scale instanceof Array){var copyScale=copy.property("Scale");var value=copyScale.value;if(value instanceof Array){for(var s=0;s<value.length;s++){value[s]=(value[s]*(scale[s]||100))/100;}copyScale.setValue(value);}}if(copy.property("Opacity")){copy.property("Opacity").setValue(copy.property("Opacity").value*(opacity/100));}if(copy.property("Rotation")&&rotation){copy.property("Rotation").setValue(copy.property("Rotation").value+rotation);}try{if(copy.property("Position")&&position instanceof Array){var copyPosition=copy.property("Position");var p=copyPosition.value;if(p instanceof Array){var sx=(scale.length>0?scale[0]:100)/100;var sy=(scale.length>1?scale[1]:scale[0])/100;var anchor=nestedComp.width/2;nestedComp.height/2;p[0]=position[0]+(p[0]-nestedComp.width/2)*sx;if(p.length>1)p[1]=position[1]+(p[1]-nestedComp.height/2)*sy;copyPosition.setValue(p);}}}catch(transformError){}}outer.remove();removed++;}tkEndUndo();if(!removed)return "Selected layer is not a precomp.";return "Decomposed "+removed+" precomp"+(removed===1?"":"s")+" and copied "+copied+" layer"+(copied===1?"":"s")+".";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkRenameSelected(name) {
  try { tkBeginUndo("Rename"); var layers=tkSelectedLayers(); if(!layers.length) return "Select at least one layer."; if(layers.length===1){layers[0].name=name;}else{for(var i=0;i<layers.length;i++) layers[i].name=name+" "+(i+1);} tkEndUndo(); return "Selection renamed."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkSequenceSelected() {
  try { tkBeginUndo("Sequence"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var layers=tkSelectedLayers(); if(layers.length<2) return "Select at least two layers."; var sorted=[]; for(var i=0;i<layers.length;i++) sorted.push(layers[i]); sorted.sort(function(a,b){return a.index-b.index}); var time=sorted[0].inPoint; for(var j=0;j<sorted.length;j++){var duration=sorted[j].outPoint-sorted[j].inPoint;sorted[j].startTime=time-sorted[j].inPoint;time+=duration;} tkEndUndo(); return "Selected layers sequenced."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkFitSelectedToComp() {
  try { tkBeginUndo("Fit to Comp"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var layers=tkSelectedLayers(); if(!layers.length) return "Select at least one layer."; for(var i=0;i<layers.length;i++){var l=layers[i]; if(l.property("Scale")){var sw=comp.width/l.source.width*100, sh=comp.height/l.source.height*100; l.property("Scale").setValue([Math.min(sw,sh),Math.min(sw,sh)]);}} tkEndUndo(); return "Selection fitted proportionally."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkCloneKeyframeEase(ease) { return ease; }

function tkInvertProperty(property) {
  if (!property || property.numKeys < 2) return 0;
  var selected=[];
  try { if(property.selectedKeys instanceof Array) selected=property.selectedKeys.slice(0); } catch(selectedError) {}
  if(!selected.length){for(var a=1;a<=property.numKeys;a++)selected.push(a);}
  selected.sort(function(x,y){return x-y});
  if(selected.length<2)return 0;
  var snapshots=[];
  for(var i=0;i<selected.length;i++){var index=selected[i];var snapshot={value:property.keyValue(index)};try{snapshot.inType=property.keyInInterpolationType(index);snapshot.outType=property.keyOutInterpolationType(index);}catch(interpolationError){}try{snapshot.temporalEase=property.getTemporalEaseAtKey(index);}catch(temporalError){}try{snapshot.spatial=property.getSpatialTangentsAtKey(index);}catch(spatialError){}snapshots.push(snapshot);}
  var changed=0;
  for(var j=0;j<selected.length;j++){var targetIndex=selected[j];var source=snapshots[selected.length-1-j];try{property.setValueAtKey(targetIndex,source.value);changed++;}catch(valueError){}try{if(source.inType!==undefined&&source.outType!==undefined)property.setInterpolationTypeAtKey(targetIndex,source.outType,source.inType);}catch(setInterpolationError){}try{if(source.temporalEase&&source.temporalEase.length>=2)property.setTemporalEaseAtKey(targetIndex,source.temporalEase[1],source.temporalEase[0]);}catch(setTemporalError){}try{if(source.spatial&&source.spatial.length>=2)property.setSpatialTangentsAtKey(targetIndex,source.spatial[1],source.spatial[0]);}catch(setSpatialError){}}
  return changed;
}

function tkInvertPropertyTree(group) {
  var changed=0;
  if(!group||typeof group.numProperties!=="number")return 0;
  for(var i=1;i<=group.numProperties;i++){var property=group.property(i);if(!property)continue;if(typeof property.numProperties=== "number"&&property.numProperties>0)changed+=tkInvertPropertyTree(property);else{try{if(typeof property.numKeys=== "number"&&property.numKeys>=2)changed+=tkInvertProperty(property);}catch(propertyError){}}}
  return changed;
}

function tkInvertKeyframes() {
  try {
    tkBeginUndo("Invert Keyframes");
    var comp=tkSelectedComp();
    if(!comp) return "Select a composition first.";
    var layers=tkSelectedLayers();
    if(!layers.length) return "Select at least one layer.";
    var changed=0;
    for(var i=0;i<layers.length;i++) changed+=tkInvertPropertyTree(layers[i]);
    tkEndUndo();
    if(!changed) return "No keyframes found in the selected layer"+(layers.length===1?"":"s")+".";
    return "Inverted "+changed+" keyframed property"+(changed===1?"":"s")+".";
  } catch(e) {
    try { tkEndUndo(); } catch(endError) {}
    return "ERROR: "+e.toString();
  }
}

function tkReverseLayerOrder() {
  try {
    tkBeginUndo("Reverse Selected Layer Order");
    var comp=tkSelectedComp();
    if(!comp) return "Select a composition first.";
    var layers=tkSelectedLayers();
    if(layers.length<2) return "Select at least two layers.";
    layers.sort(function(a,b){return a.index-b.index;});
    var topAnchor=layers[0];
    for(var i=layers.length-1;i>0;i--) {
      try { layers[i].moveBefore(topAnchor); }
      catch(moveError) { throw moveError; }
    }
    tkEndUndo();
    return "Reversed the order of "+layers.length+" selected layers.";
  } catch(e) {
    try { tkEndUndo(); } catch(endError) {}
    return "ERROR: "+e.toString();
  }
}

function tkSelectTextLayers() {
  try { var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var count=0; for(var i=1;i<=comp.numLayers;i++){var l=comp.layer(i); if(l instanceof TextLayer){l.selected=true;count++;}} return count?"Selected "+count+" text layer"+(count===1?"":"s")+".":"No text layers found.";} catch(e){return "ERROR: "+e.toString();}
}

function tkReverseTextLayers() {
  try {
    var comp = tkSelectedComp();
    if (!comp) return "Select a composition first.";
    var text = [];
    for (var i = 1; i <= comp.selectedLayers.length; i++) {
      if (comp.selectedLayers[i - 1] instanceof TextLayer) text.push(comp.selectedLayers[i - 1]);
    }
    if (!text.length) {
      for (i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i) instanceof TextLayer) text.push(comp.layer(i));
      }
    }
    if (text.length < 2) return "Select at least two text layers.";

    tkBeginUndo("Invert Text Layer Order");
    text.sort(function (a, b) { return a.index - b.index; });
    var topAnchor = text[0];
    for (i = text.length - 1; i > 0; i--) {
      text[i].moveBefore(topAnchor);
    }
    tkEndUndo();
    return "Inverted the order of " + text.length + " text layers.";
  } catch (e) {
    try { tkEndUndo(); } catch (undoError) {}
    return "ERROR: " + e.toString();
  }
}

function tkTransformSelectedTextLayers(xOffset, yOffset, scalePercent) {
  try {
    var comp = tkSelectedComp();
    if (!comp) return "ERROR: Select a composition first.";
    var text = [];
    for (var i = 1; i <= comp.selectedLayers.length; i++) {
      if (comp.selectedLayers[i - 1] instanceof TextLayer) text.push(comp.selectedLayers[i - 1]);
    }
    if (!text.length) return "ERROR: Select one or more text layers.";
    xOffset = Number(xOffset);
    yOffset = Number(yOffset);
    scalePercent = Number(scalePercent);
    if (!isFinite(xOffset) || !isFinite(yOffset) || !isFinite(scalePercent) || scalePercent <= 0) {
      return "ERROR: Enter valid X, Y and Scale values.";
    }

    tkBeginUndo("Transform Selected Text Layers");
    for (i = 0; i < text.length; i++) {
      var layer = text[i];
      var transform = layer.property("Transform");
      try {
        var position = transform.property("Position");
        var positionValue = position.value;
        position.setValue([positionValue[0] + xOffset, positionValue[1] + yOffset]);
      } catch (positionError) {}
      try {
        var scale = transform.property("Scale");
        var scaleValue = scale.value;
        if (scaleValue instanceof Array) {
          if (scaleValue.length >= 3) scale.setValue([scalePercent, scalePercent, scaleValue[2]]);
          else scale.setValue([scalePercent, scalePercent]);
        }
      } catch (scaleError) {}
    }
    tkEndUndo();
    return "Updated " + text.length + " selected text layer" + (text.length === 1 ? "" : "s") + ".";
  } catch (e) {
    try { tkEndUndo(); } catch (undoError) {}
    return "ERROR: " + e.toString();
  }
}

function tkSplitSelectedText() {
  var comp = app.project ? app.project.activeItem : null;
  if (!comp || !(comp instanceof CompItem)) return "ERROR: Open a composition and select one or more text layers.";
  var selectedLayers = comp.selectedLayers || [];
  var sources = [];
  for (var sourceIndex = 0; sourceIndex < selectedLayers.length; sourceIndex++) {
    if (selectedLayers[sourceIndex] instanceof TextLayer) sources.push(selectedLayers[sourceIndex]);
  }
  if (!sources.length) return "ERROR: Select one or more text layers.";

  var frameDuration = comp.frameDuration;
  var allCreated = [];
  var processed = 0;
  var skipped = 0;
  var failures = [];
  app.beginUndoGroup("ToolKeeper: Split Selected Text Layers");
  try {
    for (var sourceLoopIndex = 0; sourceLoopIndex < sources.length; sourceLoopIndex++) {
      var source = sources[sourceLoopIndex];
      var sourceTextProperty = source.property("Source Text");
      var originalDocument = sourceTextProperty.value;
      var originalText = originalDocument.text;
      var words = originalText.match(/\S+/g);
      if (!words || !words.length) {
        skipped++;
        continue;
      }
      var start = source.inPoint;
      var originalOutPoint = source.outPoint;
      var originalLayerName = source.name;
      var created = [];
      try {
        for (var i = 0; i < words.length; i++) {
          var layer = i === 0 ? source : source.duplicate();
          created.push(layer);
          var doc = layer.property("Source Text").value;
          var cumulative = words.slice(0, i + 1).join(" ");
          doc.text = cumulative;
          layer.property("Source Text").setValue(doc);
          var layerStart = start + i * 10 * frameDuration;
          layer.startTime = source.startTime;
          layer.inPoint = layerStart;
          layer.outPoint = layerStart + 10 * frameDuration;
          layer.name = cumulative;
        }

        for (var orderIndex = created.length - 2; orderIndex >= 0; orderIndex--) {
          created[orderIndex].moveAfter(created[orderIndex + 1]);
        }
        for (var createdIndex = 0; createdIndex < created.length; createdIndex++) allCreated.push(created[createdIndex]);
        processed++;
      } catch (layerError) {
        for (var removeIndex = created.length - 1; removeIndex > 0; removeIndex--) {
          try { created[removeIndex].remove(); } catch (removeError) {}
        }
        try {
          source.property("Source Text").setValue(originalDocument);
          source.inPoint = start;
          source.outPoint = originalOutPoint;
          source.name = originalLayerName;
        } catch (restoreError) {}
        failures.push(originalLayerName + ": " + layerError.toString());
      }
    }
  } finally { app.endUndoGroup(); }
  if (!allCreated.length) {
    return "ERROR: No text layers were split." + (skipped ? " The selected text layer(s) were empty." : "") +
      (failures.length ? " " + failures.join(" | ") : "");
  }
  for (var deselectIndex = 1; deselectIndex <= comp.numLayers; deselectIndex++) comp.layer(deselectIndex).selected = false;
  for (var selectIndex = 0; selectIndex < allCreated.length; selectIndex++) allCreated[selectIndex].selected = true;
  var message = "Split " + processed + " text layer" + (processed === 1 ? "" : "s") + " into " + allCreated.length + " layers (10 frames each).";
  if (skipped) message += " Skipped " + skipped + " empty layer" + (skipped === 1 ? "" : "s") + ".";
  if (failures.length) message += " Failed: " + failures.join(" | ");
  return message;
}

function tkIsBeatMarker(value) {
  if (!value) return false;
  if (value.chapter === "ToolKeeper Beat" || /^Beat(?:\s|$)/.test(value.comment || "")) return true;
  if (typeof value.getParameters !== "function") return false;
  var parameters = value.getParameters();
  for (var i = 0; i < parameters.length - 1; i += 2) {
    if (parameters[i] === "ToolKeeperBeat" && parameters[i + 1] === "1") return true;
  }
  return false;
}

function tkResetBeatMarkers() {
  try {
    var comp = tkSelectedComp();
    if (!comp) return "Select a composition first.";
    if (comp.selectedLayers.length !== 1 || !comp.selectedLayers[0].hasAudio) return "Select exactly one audio layer in the timeline.";
    var marker = comp.selectedLayers[0].property("ADBE Marker") || comp.selectedLayers[0].property("Marker");
    if (!marker) return "The selected audio layer has no marker property.";
    tkBeginUndo("Reset Beat Markers");
    var removed = 0;
    for (var i = marker.numKeys; i >= 1; i--) {
      var value = marker.keyValue(i);
      if (tkIsBeatMarker(value)) {
        marker.removeKey(i);
        removed++;
      }
    }
    tkEndUndo();
    return removed ? "Removed " + removed + " beat marker" + (removed === 1 ? "" : "s") + "." : "No beat markers found on the selected audio layer.";
  } catch (e) {
    try { tkEndUndo(); } catch (undoError) {}
    return "ERROR: " + e.toString();
  }
}

function tkGetAudioAmplitudeSlider(layer) {
  var effects = layer.property("ADBE Effect Parade");
  if (!effects) return null;
  var fallback = null;
  for (var i = 1; i <= effects.numProperties; i++) {
    var effect = effects.property(i);
    var slider = effect.property(1);
    if (!slider || slider.numKeys < 3) continue;
    if (effect.name === "Both Channels") return slider;
    if (!fallback && effect.matchName === "ADBE Slider Control") fallback = slider;
  }
  return fallback;
}

function tkFindBeatPeaks(times, values, sensitivity, frameDuration) {
  var peaks = [];
  if (values.length < 3 || frameDuration <= 0) return peaks;

  var onset = [];
  var onsetSum = 0;
  var onsetSquareSum = 0;
  for (var i = 0; i < values.length; i++) {
    var rise = i ? Math.max(0, values[i] - values[i - 1]) : 0;
    onset.push(rise);
    onsetSum += rise;
    onsetSquareSum += rise * rise;
  }

  var onsetMean = onsetSum / onset.length;
  var onsetDeviation = Math.sqrt(Math.max(0, onsetSquareSum / onset.length - onsetMean * onsetMean));
  var threshold = onsetMean + onsetDeviation * (1 - sensitivity / 100);
  var gatedOnset = [];
  for (var sampleIndex = 0; sampleIndex < onset.length; sampleIndex++) {
    gatedOnset.push(onset[sampleIndex] >= threshold ? onset[sampleIndex] : 0);
  }

  var minimumGap = Math.max(frameDuration * 2, 0.12);
  var index = 0;
  while (index < gatedOnset.length) {
    if (gatedOnset[index] <= 0) {
      index++;
      continue;
    }

    var eventStart = index;
    var eventEnd = index;
    var strength = gatedOnset[index];
    while (eventEnd + 1 < gatedOnset.length && gatedOnset[eventEnd + 1] > 0) {
      eventEnd++;
      strength = Math.max(strength, gatedOnset[eventEnd]);
    }

    var peak = { time: times[eventStart], value: strength };
    var previous = peaks.length ? peaks[peaks.length - 1] : null;
    if (previous && peak.time - previous.time < minimumGap) {
      previous.value = Math.max(previous.value, peak.value);
    } else {
      peaks.push(peak);
    }
    index = eventEnd + 1;
  }
  return peaks;
}

function tkAddBeatMarkers(sensitivity, workAreaOnly, replaceExisting) {
  var comp = tkSelectedComp();
  if (!comp) return "Select a composition first.";
  var selected = comp.selectedLayers;
  if (selected.length !== 1) return "Select exactly one audio layer in the timeline.";
  var audio = selected[0];
  if (!audio.hasAudio) return "The selected layer has no audio.";
  if (audio.locked) return "Unlock the selected audio layer first.";

  var frameDuration = 1 / comp.frameRate;
  var start = Math.max(0, audio.inPoint);
  var end = Math.min(comp.duration, audio.outPoint);
  if (workAreaOnly) {
    start = Math.max(start, comp.workAreaStart);
    end = Math.min(end, comp.workAreaStart + comp.workAreaDuration);
  }
  if (end <= start) return "The selected audio layer has no audio in this range.";

  sensitivity = Math.max(1, Math.min(100, Number(sensitivity) || 35));
  var markerProperty = audio.property("ADBE Marker") || audio.property("Marker");
  var amplitudeLayer = null;
  var undoOpen = false;
  var result = "Could not analyze the selected audio.";

  try {
    tkBeginUndo("Add Beat Markers");
    undoOpen = true;

    var previousIds = {};
    for (var layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
      var existingLayer = comp.layer(layerIndex);
      try { if (existingLayer.id !== undefined) previousIds[String(existingLayer.id)] = true; } catch (idError) {}
    }

    var commandNames = ["Convert Audio to Keyframes", "Audio in Keyframes umwandeln"];
    var commandId = 0;
    for (var commandIndex = 0; commandIndex < commandNames.length && !commandId; commandIndex++) {
      commandId = app.findMenuCommandId(commandNames[commandIndex]);
    }
    if (!commandId) return "Could not find After Effects' Convert Audio to Keyframes command.";
    var originalLayerCount = comp.numLayers;
    app.executeCommand(commandId);
    if (comp.numLayers <= originalLayerCount) return "After Effects could not create audio analysis keyframes.";

    var amplitudeSlider = null;
    var amplitudeIndex = comp.numLayers + 1;
    for (var candidateIndex = 1; candidateIndex <= comp.numLayers; candidateIndex++) {
      var candidate = comp.layer(candidateIndex);
      if (candidate === audio) continue;
      var candidateSlider = tkGetAudioAmplitudeSlider(candidate);
      if (!candidateSlider) continue;
      var isNewLayer = false;
      try { isNewLayer = candidate.id === undefined || !previousIds[String(candidate.id)]; } catch (candidateIdError) { isNewLayer = true; }
      if (isNewLayer && candidateIndex < amplitudeIndex) {
        amplitudeLayer = candidate;
        amplitudeSlider = candidateSlider;
        amplitudeIndex = candidateIndex;
      }
    }
    if (!amplitudeSlider) return "Could not read the generated audio analysis keyframes.";

    var times = [];
    var values = [];
    for (var keyIndex = 1; keyIndex <= amplitudeSlider.numKeys; keyIndex++) {
      var keyTime = amplitudeSlider.keyTime(keyIndex);
      if (keyTime < start || keyTime > end) continue;
      times.push(keyTime);
      values.push(Number(amplitudeSlider.keyValue(keyIndex)) || 0);
    }
    if (values.length < 3) return "Not enough audio samples in the selected range.";

    var peaks = tkFindBeatPeaks(times, values, sensitivity, frameDuration);
    var nextNumber = 1;
    if (replaceExisting && markerProperty) {
      for (var markerIndex = markerProperty.numKeys; markerIndex >= 1; markerIndex--) {
        var oldMarker = markerProperty.keyValue(markerIndex);
        if (tkIsBeatMarker(oldMarker)) markerProperty.removeKey(markerIndex);
      }
    } else if (markerProperty) {
      for (var existingIndex = 1; existingIndex <= markerProperty.numKeys; existingIndex++) {
        var existingMarker = markerProperty.keyValue(existingIndex);
        var existingNumber = tkIsBeatMarker(existingMarker) ? Number(existingMarker.comment) : 0;
        if (existingNumber >= nextNumber) nextNumber = existingNumber + 1;
      }
    }

    var added = 0;
    if (markerProperty) {
      for (var peakIndex = 0; peakIndex < peaks.length; peakIndex++) {
        var beatTime = Math.round((peaks[peakIndex].time + frameDuration) / frameDuration) * frameDuration;
        var lastValidFrame = Math.floor(end / frameDuration) * frameDuration;
        if (beatTime > lastValidFrame) beatTime = lastValidFrame;
        var existingKey = markerProperty.numKeys ? markerProperty.nearestKeyIndex(beatTime) : 0;
        if (existingKey && Math.abs(markerProperty.keyTime(existingKey) - beatTime) < frameDuration / 2) continue;
        var beatMarker = new MarkerValue(String(nextNumber++));
        beatMarker.setParameters(["ToolKeeperBeat", "1"]);
        markerProperty.setValueAtTime(beatTime, beatMarker);
        added++;
      }
    }
    result = added ? "Added " + added + " beat markers to " + audio.name + "." : "No beat peaks found in the selected audio range.";
  } catch (e) {
    result = "ERROR: " + e.toString();
  } finally {
    if (amplitudeLayer) {
      try { amplitudeLayer.remove(); } catch (removeError) {}
    }
    try { audio.selected = true; } catch (selectionError) {}
    if (undoOpen) {
      try { tkEndUndo(); } catch (undoError) {}
    }
  }
  return result;
}

function tkSnapToMarkers(){try{var comp=tkSelectedComp();if(!comp||!comp.markerProperty||comp.markerProperty.numKeys<1)return "No composition markers found.";var times=[];for(var i=1;i<=comp.markerProperty.numKeys;i++)times.push(comp.markerProperty.keyTime(i));var best=times[0];for(var j=1;j<times.length;j++)if(Math.abs(times[j]-comp.time)<Math.abs(best-comp.time))best=times[j];comp.time=best;return "Playhead snapped to marker.";}catch(e){return "ERROR: "+e.toString();}}

function tkSequenceToMarkers(){return tkSequenceSelected();}

function tkCutToMarkers(){try{tkBeginUndo("Cut at Markers");var comp=tkSelectedComp();if(!comp||!comp.markerProperty||comp.markerProperty.numKeys<1)return "No composition markers found.";var layers=tkSelectedLayers();if(!layers.length)return "Select at least one layer.";var count=0;for(var i=1;i<=comp.markerProperty.numKeys;i++){var t=comp.markerProperty.keyTime(i);for(var j=0;j<layers.length;j++){if(t>=layers[j].inPoint&&t<=layers[j].outPoint){var split=layers[j].duplicate();layers[j].outPoint=t;split.inPoint=t;count++;}}}tkEndUndo();return "Cut "+count+" layer"+(count===1?"":"s")+" at markers.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}}

function tkFindBadFrames(){try{tkBeginUndo("Find Bad Frames");var comp=tkSelectedComp();if(!comp)return "Select a composition first.";var start=comp.workAreaStart,end=start+comp.workAreaDuration;var step=1/comp.frameRate;var count=0;for(var t=start;t<end;t+=step*10){comp.markerProperty.setValueAtTime(t,new MarkerValue("Review"));count++;}tkEndUndo();return "Placed "+count+" review markers.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}}

function tkSelectCaptionAudio(){try{var comp=tkSelectedComp();if(!comp)return "Select a composition first.";var count=0;for(var i=1;i<=comp.numLayers;i++){var l=comp.layer(i);if(l.hasAudio){l.selected=true;count++;}}return count?"Selected "+count+" audio layer"+(count===1?"":"s")+".":"No audio layer found.";}catch(e){return "ERROR: "+e.toString();}}

function tkCreateTextStyle(){try{tkBeginUndo("Create Text Style");var comp=tkSelectedComp();if(!comp)return "Select a composition first.";var l=comp.layers.addText("Style");l.property("Source Text").setValue("STYLE");l.property("Opacity").setValue(100);tkEndUndo();return "Text style sample created.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}}

function tkHasSelectedTextLayer(){try{var comp=tkSelectedComp();if(!comp)return "false";for(var i=1;i<=comp.selectedLayers.length;i++){if(comp.selectedLayers[i-1] instanceof TextLayer)return "true";}return "false";}catch(e){return "false";}}

function tkSaveTextStyle(styleName){try{var l=null;var comp=tkSelectedComp();if(!comp)return "Select a text layer first.";for(var i=1;i<=comp.selectedLayers.length;i++){if(comp.selectedLayers[i-1] instanceof TextLayer){l=comp.selectedLayers[i-1];break;}}if(!l)return "Select a text layer first.";var name=String(styleName||"").replace(/^\s+|\s+$/g,"");if(!name)return "Enter a name for the text style.";var doc=l.property("Source Text").value;var style={};var fields=["font","fontSize","fillColor","applyFill","applyStroke","strokeColor","strokeWidth","justification","tracking","leading","autoLeading","fauxBold","fauxItalic","baselineShift","horizontalScale","verticalScale"];for(var i=0;i<fields.length;i++){try{var field=fields[i];var value=doc[field];if(value!==undefined&&value!==null)style[field]=value;}catch(fieldError){}}var names=[];try{names=JSON.parse(app.settings.getSetting("ToolKeeper","textStyleNames")||"[]");if(!(names instanceof Array))names=[];}catch(namesError){names=[];}if(names.join("\n").toLowerCase().indexOf(name.toLowerCase())<0)names.push(name);app.settings.saveSetting("ToolKeeper","textStyleNames",JSON.stringify(names));app.settings.saveSetting("ToolKeeper","textStyle."+name,JSON.stringify(style));return "Text style saved: "+name;}catch(e){return "ERROR: "+e.toString();}}

function tkGetSavedTextStyles(){try{var names=[];try{names=JSON.parse(app.settings.getSetting("ToolKeeper","textStyleNames")||"[]");if(!(names instanceof Array))names=[];}catch(namesError){names=[];}return "TK_TEXT_STYLES|"+encodeURIComponent(JSON.stringify(names));}catch(e){return "ERROR: "+e.toString();}}

function tkGetSavedTextStyle(styleName){try{var name=String(styleName||"");if(!name)return "TK_TEXT_STYLE|{}";var style={};try{style=JSON.parse(app.settings.getSetting("ToolKeeper","textStyle."+name)||"{}");}catch(styleError){style={};}return "TK_TEXT_STYLE|"+encodeURIComponent(JSON.stringify(style));}catch(e){return "ERROR: "+e.toString();}}

function tkDeleteSavedTextStyle(styleName){try{var name=String(styleName||"").replace(/^\s+|\s+$/g,"");if(!name)return "Select a saved text style first.";var names=[];try{names=JSON.parse(app.settings.getSetting("ToolKeeper","textStyleNames")||"[]");if(!(names instanceof Array))names=[];}catch(namesError){names=[];}var remaining=[];for(var i=0;i<names.length;i++){if(names[i]!==name)remaining.push(names[i]);}app.settings.saveSetting("ToolKeeper","textStyleNames",JSON.stringify(remaining));app.settings.saveSetting("ToolKeeper","textStyle."+name,"{}");return "Text style deleted: "+name;}catch(e){return "ERROR: "+e.toString();}}

function tkGetSelectedAudioForCaptions() {
  var comp = app.project ? app.project.activeItem : null;
  if (!(comp instanceof CompItem)) return "ERROR: Open a composition first.";
  var audioLayer = null;
  var styleLayer = null;
  for (var i = 0; i < comp.selectedLayers.length; i++) {
    var selected = comp.selectedLayers[i];
    if (selected instanceof TextLayer) {
      if (styleLayer) return "ERROR: Select only one text layer as the caption style template.";
      styleLayer = selected;
    } else {
      if (audioLayer) return "ERROR: Select one audio or video layer and optionally one text layer as the style template.";
      audioLayer = selected;
    }
  }
  if (!audioLayer) return "ERROR: Select one audio or video layer in the timeline.";
  var source = audioLayer.source;
  if (!(source instanceof FootageItem) || !(source.mainSource instanceof FileSource) || !source.mainSource.file) return "ERROR: Select an audio or video footage layer, not a precomp or generated layer.";
  if (!source.hasAudio) return "ERROR: The selected footage has no audio track.";
  if (audioLayer.timeRemapEnabled || Math.abs(Number(audioLayer.stretch) - 100) > 0.0001) return "ERROR: Time-remapped or stretched audio layers are not supported yet.";
  var sourceIn = Number(audioLayer.inPoint) - Number(audioLayer.startTime);
  var duration = Number(audioLayer.outPoint) - Number(audioLayer.inPoint);
  if (sourceIn < 0 || duration <= 0) return "ERROR: The selected layer has no usable source audio range.";
  if (!source.mainSource.file.exists) return "ERROR: The selected audio file is missing.";
  var textStyle = {};
  if (styleLayer) {
    try {
      var styleDoc = styleLayer.property("Source Text").value;
      var fields = ["font", "fontSize", "fillColor", "applyFill", "justification", "tracking", "leading", "autoLeading", "fauxBold", "fauxItalic", "baselineShift", "horizontalScale", "verticalScale"];
      for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
        try {
          var fieldName = fields[fieldIndex];
          var fieldValue = styleDoc[fieldName];
          if (fieldValue !== undefined && fieldValue !== null) textStyle[fieldName] = fieldValue;
        } catch (fieldError) {}
      }
    } catch (styleError) { return "ERROR: Could not read the selected text layer's style."; }
  }
  var tempFile = new File(Folder.temp.fsName + "/ToolKeeper-Captions-" + (new Date().getTime()) + ".wav");
  var data = {
    compId: comp.id,
    sourcePath: source.mainSource.file.fsName,
    sourceIn: sourceIn,
    duration: duration,
    compIn: Number(audioLayer.inPoint),
    tempPath: tempFile.fsName,
    textStyle: textStyle
  };
  return "TK_CAPTION_AUDIO|" + encodeURIComponent(JSON.stringify(data));
}

function tkCreateCaptionTextLayers(encodedCaptions, expectedCompId, encodedTextStyle, letterCase, captionPosition, keepPunctuation) {
  var comp = app.project ? app.project.activeItem : null;
  if (!(comp instanceof CompItem)) return "ERROR: Open a composition first.";
  if (expectedCompId && String(comp.id) !== String(expectedCompId)) return "ERROR: The active composition changed. Re-transcribe the selected audio in the intended composition.";
  var captions;
  try { captions = JSON.parse(decodeURIComponent(encodedCaptions || "")); } catch (parseError) { return "ERROR: The caption data could not be read."; }
  if (!(captions instanceof Array) || !captions.length) return "ERROR: No captions were received.";
  var textStyle = {};
  try { textStyle = JSON.parse(decodeURIComponent(encodedTextStyle || "%7B%7D")) || {}; } catch (styleParseError) {}
  var created = 0;
  var failures = [];
  var topmostCaptionLayer = null;
  app.beginUndoGroup("ToolKeeper: Create Captions");
  try {
    for (var i = 0; i < captions.length; i++) {
      var caption = captions[i] || {};
      var text = String(caption.text || "").replace(/^\s+|\s+$/g, "");
      if (letterCase === "upper") text = text.toLocaleUpperCase();
      else if (letterCase === "lower") text = text.toLocaleLowerCase();
      if (keepPunctuation === false) text = text.replace(/[,.!?;:…]+/g, "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
      text = text.replace(/\r?\n/g, "\r");
      var start = Number(caption.start);
      var end = Number(caption.end);
      if (!text || isNaN(start) || isNaN(end) || end <= start) continue;
      var frameDuration = comp.frameDuration;
      var frameStart = Math.round(start / frameDuration) * frameDuration;
      var frameEnd = Math.max(frameStart + frameDuration, Math.round(end / frameDuration) * frameDuration);
      frameStart = Math.max(0, Math.min(comp.duration - frameDuration, frameStart));
      frameEnd = Math.max(frameStart + frameDuration, Math.min(comp.duration, frameEnd));
      if (frameEnd <= frameStart) continue;
      try {
        var layer = comp.layers.addText(text);
        var textProperty = layer.property("Source Text");
        var documentValue = textProperty.value;
        documentValue.text = text;
        if (textStyle.font) try { documentValue.font = textStyle.font; } catch (fontError) {}
        documentValue.fontSize = Number(textStyle.fontSize) > 0 ? Number(textStyle.fontSize) : Math.max(24, Math.round(comp.height * 0.055));
        if (textStyle.fillColor && textStyle.fillColor.length >= 3) documentValue.fillColor = textStyle.fillColor;
        documentValue.justification = ParagraphJustification.CENTER_JUSTIFY;
        documentValue.applyFill = true;
        documentValue.applyStroke = false;
        documentValue.strokeWidth = 0;
        var styleFields = ["tracking", "leading", "autoLeading", "fauxBold", "fauxItalic", "baselineShift", "horizontalScale", "verticalScale"];
        for (var styleIndex = 0; styleIndex < styleFields.length; styleIndex++) {
          try { var styleName = styleFields[styleIndex]; if (textStyle[styleName] !== undefined) documentValue[styleName] = textStyle[styleName]; } catch (styleError) {}
        }
        textProperty.setValue(documentValue);
        layer.name = text.replace(/[\r\n]+/g, " ").substring(0, 42);
        layer.inPoint = frameStart;
        layer.outPoint = frameEnd;
        var transform = layer.property("Transform");
        transform.property("Anchor Point").setValue([0, 0]);
        var positionY = captionPosition === "top" ? comp.height * 0.14 :
          captionPosition === "center" ? comp.height / 2 : comp.height * 0.86;
        transform.property("Position").setValue([comp.width / 2, positionY]);
        topmostCaptionLayer = layer;
        created++;
      } catch (layerError) { failures.push(layerError.toString()); }
    }
  } finally {
    if (topmostCaptionLayer) {
      try {
        topmostCaptionLayer.outPoint = Math.min(comp.duration, topmostCaptionLayer.outPoint + 50 * comp.frameDuration);
      } catch (durationError) {}
    }
    app.endUndoGroup();
  }
  if (!created) return "ERROR: Could not create caption text layers." + (failures.length ? " " + failures.join(" | ") : "");
  return "Created " + created + " cumulative caption text layer" + (created === 1 ? "" : "s") + "." + (failures.length ? " Failed: " + failures.join(" | ") : "");
}

function tkCreateAutoCaptions(){return "TkCaptionWorkflow";}

function tkCollectKeyframedProperties(group, properties) {
  var i;
  for (i = 1; i <= group.numProperties; i++) {
    var property = group.property(i);
    if (typeof property.numProperties === "number" && property.numProperties > 0) {
      tkCollectKeyframedProperties(property, properties);
    } else if (property.propertyType === PropertyType.PROPERTY && property.numKeys > 0) {
      properties.push(property);
    }
  }
}

function tkSnapshotPropertyKeys(property) {
  var keys = [];
  var spatial = property.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
    property.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
  var i;
  for (i = 1; i <= property.numKeys; i++) {
    var key = {
      time: property.keyTime(i),
      value: property.keyValue(i),
      inInterpolation: property.keyInInterpolationType(i),
      outInterpolation: property.keyOutInterpolationType(i),
      inEase: property.keyInTemporalEase(i),
      outEase: property.keyOutTemporalEase(i),
      temporalContinuous: property.keyTemporalContinuous(i),
      temporalAutoBezier: property.keyTemporalAutoBezier(i)
    };
    if (spatial) {
      key.inSpatialTangent = property.keyInSpatialTangent(i);
      key.outSpatialTangent = property.keyOutSpatialTangent(i);
      key.spatialContinuous = property.keySpatialContinuous(i);
      key.spatialAutoBezier = property.keySpatialAutoBezier(i);
    }
    keys.push(key);
  }
  return keys;
}

function tkReplacePropertyKeys(property, keys, firstTime, lastTime, originalFirstTime, originalLastTime, remap) {
  var timeScale = remap ? (lastTime - firstTime) / (originalLastTime - originalFirstTime) : 1;
  var i;
  for (i = property.numKeys; i >= 1; i--) property.removeKey(i);
  for (i = 0; i < keys.length; i++) {
    var key = keys[i];
    var time = key.time;
    if (remap) {
      time = originalLastTime === originalFirstTime
        ? firstTime
        : firstTime + (key.time - originalFirstTime) * (lastTime - firstTime) / (originalLastTime - originalFirstTime);
    }
    property.setValueAtTime(time, key.value);
    var keyIndex = property.nearestKeyIndex(time);
    var inEase = [];
    var outEase = [];
    var easeIndex;
    for (easeIndex = 0; easeIndex < key.inEase.length; easeIndex++) {
      inEase.push(new KeyframeEase(key.inEase[easeIndex].speed / timeScale, key.inEase[easeIndex].influence));
      outEase.push(new KeyframeEase(key.outEase[easeIndex].speed / timeScale, key.outEase[easeIndex].influence));
    }
    property.setInterpolationTypeAtKey(keyIndex, key.inInterpolation, key.outInterpolation);
    property.setTemporalEaseAtKey(keyIndex, inEase, outEase);
    property.setTemporalContinuousAtKey(keyIndex, key.temporalContinuous);
    property.setTemporalAutoBezierAtKey(keyIndex, key.temporalAutoBezier);
    if (property.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
        property.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
      property.setSpatialTangentsAtKey(keyIndex, key.inSpatialTangent, key.outSpatialTangent);
      property.setSpatialContinuousAtKey(keyIndex, key.spatialContinuous);
      property.setSpatialAutoBezierAtKey(keyIndex, key.spatialAutoBezier);
    }
  }
}

function tkFitKeyframesInScope(layer, roots, frameDuration) {
  var properties = [];
  var rootIndex;
  for (rootIndex = 0; rootIndex < roots.length; rootIndex++) {
    tkCollectKeyframedProperties(roots[rootIndex], properties);
  }
  if (properties.length === 0) return { skipped: true };

  var snapshots = [];
  var firstKeyTime = null;
  var lastKeyTime = null;
  var hasRovingKey = false;
  var propertyIndex;
  for (propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
    var property = properties[propertyIndex];
    var keys = tkSnapshotPropertyKeys(property);
    snapshots.push({ property: property, keys: keys });
    if (property.isSpatial) {
      var keyIndex;
      for (keyIndex = 1; keyIndex <= property.numKeys; keyIndex++) {
        if (property.keyRoving(keyIndex)) hasRovingKey = true;
      }
    }
    if (firstKeyTime === null || keys[0].time < firstKeyTime) firstKeyTime = keys[0].time;
    if (lastKeyTime === null || keys[keys.length - 1].time > lastKeyTime) lastKeyTime = keys[keys.length - 1].time;
  }

  var targetFirstTime = layer.inPoint;
  var targetLastTime = layer.outPoint - frameDuration;
  if (hasRovingKey || lastKeyTime <= firstKeyTime || targetLastTime <= targetFirstTime) return { skipped: true };

  var changedSnapshots = [];
  try {
    for (propertyIndex = 0; propertyIndex < snapshots.length; propertyIndex++) {
      changedSnapshots.push(snapshots[propertyIndex]);
      tkReplacePropertyKeys(snapshots[propertyIndex].property, snapshots[propertyIndex].keys,
        targetFirstTime, targetLastTime, firstKeyTime, lastKeyTime, true);
    }
  } catch (error) {
    for (propertyIndex = changedSnapshots.length - 1; propertyIndex >= 0; propertyIndex--) {
      try { tkReplacePropertyKeys(changedSnapshots[propertyIndex].property, changedSnapshots[propertyIndex].keys, 0, 0, 0, 0, false); } catch (restoreError) {}
    }
    return { failed: error.toString() };
  }
  return { adjusted: true };
}

function tkCollectPropertiesWithSelectedKeys(group, selectedProperties) {
  var i;
  for (i = 1; i <= group.numProperties; i++) {
    var property = group.property(i);
    if (typeof property.numProperties === "number" && property.numProperties > 0) {
      tkCollectPropertiesWithSelectedKeys(property, selectedProperties);
    } else if (property.propertyType === PropertyType.PROPERTY &&
        property.numKeys > 0 && property.selectedKeys && property.selectedKeys.length > 0) {
      tkAddSelectedKeyProperty(property, selectedProperties);
    }
  }
}

function tkAddSelectedKeyProperty(property, selectedProperties) {
  if (typeof property.numProperties === "number" && property.numProperties > 0) {
    tkCollectPropertiesWithSelectedKeys(property, selectedProperties);
    return;
  }
  if (property.propertyType !== PropertyType.PROPERTY ||
      property.numKeys === 0 || !property.selectedKeys || property.selectedKeys.length === 0) return;
  var i;
  for (i = 0; i < selectedProperties.length; i++) {
    if (selectedProperties[i].property === property) return;
  }
  selectedProperties.push({ property: property, selectedKeys: property.selectedKeys });
}

function tkFitSelectedKeyframesInLayer(layer, frameDuration) {
  var selectedProperties = [];
  tkCollectPropertiesWithSelectedKeys(layer, selectedProperties);
  var explicitlySelectedProperties = layer.selectedProperties || [];
  var selectedPropertyIndex;
  for (selectedPropertyIndex = 0; selectedPropertyIndex < explicitlySelectedProperties.length; selectedPropertyIndex++) {
    tkAddSelectedKeyProperty(explicitlySelectedProperties[selectedPropertyIndex], selectedProperties);
  }
  if (selectedProperties.length === 0) return null;

  var snapshots = [];
  var firstSelectedTime = null;
  var lastSelectedTime = null;
  var hasRovingSelectedKey = false;
  var propertyIndex;
  for (propertyIndex = 0; propertyIndex < selectedProperties.length; propertyIndex++) {
    var property = selectedProperties[propertyIndex].property;
    var selectedIndices = selectedProperties[propertyIndex].selectedKeys;
    var allKeys = tkSnapshotPropertyKeys(property);
    var selectedKeys = [];
    var selectedIndex;
    for (selectedIndex = 0; selectedIndex < selectedIndices.length; selectedIndex++) {
      var keyIndex = selectedIndices[selectedIndex];
      if (keyIndex < 1 || keyIndex > allKeys.length) continue;
      selectedKeys.push({ index: keyIndex, key: allKeys[keyIndex - 1] });
      if (property.isSpatial && property.keyRoving(keyIndex)) hasRovingSelectedKey = true;
      if (firstSelectedTime === null || allKeys[keyIndex - 1].time < firstSelectedTime) firstSelectedTime = allKeys[keyIndex - 1].time;
      if (lastSelectedTime === null || allKeys[keyIndex - 1].time > lastSelectedTime) lastSelectedTime = allKeys[keyIndex - 1].time;
    }
    if (selectedKeys.length > 0) snapshots.push({ property: property, keys: allKeys, selectedKeys: selectedKeys });
  }
  if (snapshots.length === 0) return { skipped: true };

  var targetFirstTime = layer.inPoint;
  var targetLastTime = layer.outPoint - frameDuration;
  if (hasRovingSelectedKey || lastSelectedTime <= firstSelectedTime || targetLastTime <= targetFirstTime) return { skipped: true };

  var tolerance = frameDuration * 0.0001;
  for (propertyIndex = 0; propertyIndex < snapshots.length; propertyIndex++) {
    var snapshot = snapshots[propertyIndex];
    var selectedByIndex = [];
    var keyIndex;
    for (keyIndex = 0; keyIndex < snapshot.selectedKeys.length; keyIndex++) selectedByIndex[snapshot.selectedKeys[keyIndex].index] = true;
    for (keyIndex = 1; keyIndex <= snapshot.keys.length; keyIndex++) {
      if (selectedByIndex[keyIndex]) continue;
      for (selectedIndex = 0; selectedIndex < snapshot.selectedKeys.length; selectedIndex++) {
        var selectedKey = snapshot.selectedKeys[selectedIndex].key;
        var remappedTime = targetFirstTime +
          (selectedKey.time - firstSelectedTime) * (targetLastTime - targetFirstTime) / (lastSelectedTime - firstSelectedTime);
        if (Math.abs(snapshot.keys[keyIndex - 1].time - remappedTime) <= tolerance) {
          return { failed: "A selected keyframe would overlap an unselected keyframe on the same property." };
        }
      }
    }
  }

  var changedSnapshots = [];
  var timeScale = (targetLastTime - targetFirstTime) / (lastSelectedTime - firstSelectedTime);
  try {
    for (propertyIndex = 0; propertyIndex < snapshots.length; propertyIndex++) {
      var currentSnapshot = snapshots[propertyIndex];
      changedSnapshots.push(currentSnapshot);
      for (selectedIndex = currentSnapshot.selectedKeys.length - 1; selectedIndex >= 0; selectedIndex--) {
        currentSnapshot.property.removeKey(currentSnapshot.selectedKeys[selectedIndex].index);
      }
      for (selectedIndex = 0; selectedIndex < currentSnapshot.selectedKeys.length; selectedIndex++) {
        var key = currentSnapshot.selectedKeys[selectedIndex].key;
        var time = targetFirstTime +
          (key.time - firstSelectedTime) * (targetLastTime - targetFirstTime) / (lastSelectedTime - firstSelectedTime);
        currentSnapshot.property.setValueAtTime(time, key.value);
        var newKeyIndex = currentSnapshot.property.nearestKeyIndex(time);
        var inEase = [];
        var outEase = [];
        var easeIndex;
        for (easeIndex = 0; easeIndex < key.inEase.length; easeIndex++) {
          inEase.push(new KeyframeEase(key.inEase[easeIndex].speed / timeScale, key.inEase[easeIndex].influence));
          outEase.push(new KeyframeEase(key.outEase[easeIndex].speed / timeScale, key.outEase[easeIndex].influence));
        }
        currentSnapshot.property.setInterpolationTypeAtKey(newKeyIndex, key.inInterpolation, key.outInterpolation);
        currentSnapshot.property.setTemporalEaseAtKey(newKeyIndex, inEase, outEase);
        currentSnapshot.property.setTemporalContinuousAtKey(newKeyIndex, key.temporalContinuous);
        currentSnapshot.property.setTemporalAutoBezierAtKey(newKeyIndex, key.temporalAutoBezier);
        if (currentSnapshot.property.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
            currentSnapshot.property.propertyValueType === PropertyValueType.ThreeD_SPATIAL) {
          currentSnapshot.property.setSpatialTangentsAtKey(newKeyIndex, key.inSpatialTangent, key.outSpatialTangent);
          currentSnapshot.property.setSpatialContinuousAtKey(newKeyIndex, key.spatialContinuous);
          currentSnapshot.property.setSpatialAutoBezierAtKey(newKeyIndex, key.spatialAutoBezier);
        }
      }
    }
  } catch (error) {
    for (propertyIndex = changedSnapshots.length - 1; propertyIndex >= 0; propertyIndex--) {
      try { tkReplacePropertyKeys(changedSnapshots[propertyIndex].property, changedSnapshots[propertyIndex].keys, 0, 0, 0, 0, false); } catch (restoreError) {}
    }
    return { failed: error.toString() };
  }
  return { adjusted: true, selectedOnly: true };
}

function tkFitKeyframesToLayer() {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) return "Select one or more layers in a composition first.";
  var adjusted = 0;
  var selectedOnlyAdjusted = 0;
  var skipped = 0;
  var failed = 0;
  var failures = [];
  var i;
  tkBeginUndo("Fit Keyframes to Layer");
  try {
    for (i = 0; i < comp.selectedLayers.length; i++) {
      var layer = comp.selectedLayers[i];
      if (layer.locked) { skipped++; continue; }
      try {
        var result = tkFitSelectedKeyframesInLayer(layer, comp.frameDuration);
        if (result === null) result = tkFitKeyframesInScope(layer, [layer], comp.frameDuration);
        else if (result.selectedOnly) selectedOnlyAdjusted++;
        if (result.adjusted) adjusted++;
        else if (result.failed) { failed++; failures.push("Layer " + layer.name + ": " + result.failed); }
        else skipped++;
      } catch (error) {
        failed++;
        failures.push("Layer " + layer.name + ": " + error.toString());
      }
    }
  } finally {
    tkEndUndo();
  }
  if (adjusted === 0 && failed === 0) return "No keyframes to fit (check selection/locks)";
  var message = (adjusted > 0 ? "✓ " : "") + adjusted + " layer" + (adjusted > 1 ? "s" : "") + " fitted";
  if (selectedOnlyAdjusted > 0) message += " (" + selectedOnlyAdjusted + " sel. keys only)";
  if (failed > 0) message += " - " + failed + " failed: " + failures.join(", ");
  return message;
}

function tkTrimLayersToKeyframes() {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) return "Select one or more layers in a composition first.";
  var trimmed = 0;
  var unchanged = 0;
  var skipped = 0;
  var failed = 0;
  var failures = [];
  var tolerance = comp.frameDuration * 0.0001;
  var selectedLayers = comp.selectedLayers;
  var i;
  tkBeginUndo("Trim Layers to Keyframes");
  try {
    for (i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      if (layer.locked) { skipped++; continue; }
      try {
        var properties = [];
        tkCollectKeyframedProperties(layer, properties);
        if (properties.length === 0) { skipped++; continue; }
        var firstKeyTime = null;
        var lastKeyTime = null;
        var propertyIndex;
        for (propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
          var property = properties[propertyIndex];
          var propertyFirstTime = property.keyTime(1);
          var propertyLastTime = property.keyTime(property.numKeys);
          if (firstKeyTime === null || propertyFirstTime < firstKeyTime) firstKeyTime = propertyFirstTime;
          if (lastKeyTime === null || propertyLastTime > lastKeyTime) lastKeyTime = propertyLastTime;
        }
        var targetInPoint = firstKeyTime;
        var targetOutPoint = lastKeyTime + comp.frameDuration;
        var originalInPoint = layer.inPoint;
        var originalOutPoint = layer.outPoint;
        if (Math.abs(originalInPoint - targetInPoint) <= tolerance && Math.abs(originalOutPoint - targetOutPoint) <= tolerance) {
          unchanged++;
          continue;
        }
        try {
          if (targetInPoint >= layer.outPoint) layer.outPoint = targetOutPoint;
          layer.inPoint = targetInPoint;
          layer.outPoint = targetOutPoint;
          trimmed++;
        } catch (trimError) {
          try {
            if (originalInPoint >= layer.outPoint) layer.outPoint = originalOutPoint;
            layer.inPoint = originalInPoint;
            layer.outPoint = originalOutPoint;
          } catch (restoreError) {}
          failed++;
          failures.push(layer.name + ": " + trimError.toString());
        }
      } catch (layerError) {
        failed++;
        failures.push(layer.name + ": " + layerError.toString());
      }
    }
  } finally {
    tkEndUndo();
  }
  var message = trimmed + " layer(s) trimmed to their keyframe range.";
  if (unchanged > 0) message += " Already fitted: " + unchanged + ".";
  if (skipped > 0) message += " Skipped " + skipped + " locked or unanimated layer(s).";
  if (failed > 0) message += " Failed on " + failed + " layer(s): " + failures.join(" | ");
  return message;
}


function tkGetDevBeatAudioContext(workAreaOnly) {
  var comp = tkSelectedComp();
  if (!comp) return { error: "Select a composition first." };
  if (comp.selectedLayers.length !== 1) return { error: "Select exactly one audio layer in the timeline." };

  var audio = comp.selectedLayers[0];
  if (!audio.hasAudio) return { error: "The selected layer has no audio." };
  if (audio.locked) return { error: "Unlock the selected audio layer first." };
  if (audio.timeRemapEnabled) return { error: "Disable time remapping on the selected audio layer first." };

  var source = audio.source;
  var file = source && source.file;
  if (!file || !file.fsName) return { error: "The selected audio layer must use a local audio or video file." };

  var compStart = audio.inPoint;
  var compEnd = audio.outPoint;
  if (workAreaOnly) {
    compStart = Math.max(compStart, comp.workAreaStart);
    compEnd = Math.min(compEnd, comp.workAreaStart + comp.workAreaDuration);
  }
  if (compEnd <= compStart) return { error: "The selected audio layer has no audio in this range." };

  var stretch = Number(audio.stretch);
  if (!stretch) return { error: "Could not read the selected audio layer's stretch value." };
  var sourceStart = (compStart - audio.startTime) * 100 / stretch;
  var sourceEnd = (compEnd - audio.startTime) * 100 / stretch;
  if (sourceEnd <= sourceStart) return { error: "Reverse audio playback is not supported." };

  return {
    path: file.fsName,
    sourceStart: sourceStart,
    sourceEnd: sourceEnd,
    compStart: compStart,
    compEnd: compEnd
  };
}

function tkGetDevBeatAudioSelection() {
  try {
    var comp = tkSelectedComp();
    if (!comp) return JSON.stringify({ name: "", error: "Select a composition" });
    if (comp.selectedLayers.length !== 1) {
      return JSON.stringify({ name: "", error: comp.selectedLayers.length ? "Select exactly one audio layer" : "Select one audio layer" });
    }
    var layer = comp.selectedLayers[0];
    return JSON.stringify({ name: layer.name, hasAudio: !!layer.hasAudio });
  } catch (error) {
    return JSON.stringify({ name: "", error: error.toString() });
  }
}

function tkGetDevBeatAudioInfo(workAreaOnly) {
  try {
    return JSON.stringify(tkGetDevBeatAudioContext(workAreaOnly));
  } catch (error) {
    return JSON.stringify({ error: error.toString() });
  }
}

function tkWriteDevBeatMarkers(beatTimes, replaceExisting) {
  try {
    var context = tkGetDevBeatAudioContext(false);
    if (context.error) return context.error;
    if (!(beatTimes instanceof Array) || !beatTimes.length) return "No beat times were provided.";

    var comp = tkSelectedComp();
    var audio = comp.selectedLayers[0];
    var marker = audio.property("ADBE Marker") || audio.property("Marker");
    if (!marker) return "The selected audio layer has no marker property.";

    tkBeginUndo("Add Beat Markers");
    var nextNumber = 1;
    if (replaceExisting) {
      for (var removeIndex = marker.numKeys; removeIndex >= 1; removeIndex--) {
        if (tkIsBeatMarker(marker.keyValue(removeIndex))) marker.removeKey(removeIndex);
      }
    } else {
      for (var existingIndex = 1; existingIndex <= marker.numKeys; existingIndex++) {
        var existing = marker.keyValue(existingIndex);
        if (!tkIsBeatMarker(existing)) continue;
        var existingNumber = Number(existing.comment);
        if (existingNumber >= nextNumber) nextNumber = existingNumber + 1;
      }
    }

    var frameDuration = 1 / comp.frameRate;
    var added = 0;
    for (var beatIndex = 0; beatIndex < beatTimes.length; beatIndex++) {
      var beatTime = Math.round(Number(beatTimes[beatIndex]) / frameDuration) * frameDuration;
      if (beatTime < context.compStart || beatTime > context.compEnd) continue;
      var nearest = marker.numKeys ? marker.nearestKeyIndex(beatTime) : 0;
      if (nearest && Math.abs(marker.keyTime(nearest) - beatTime) < frameDuration / 2) continue;

      var value = new MarkerValue(String(nextNumber));
      value.setParameters(["ToolKeeperBeat", "1"]);
      marker.setValueAtTime(beatTime, value);
      nextNumber++;
      added++;
    }
    tkEndUndo();
    return added ? "Added " + added + " beats to " + audio.name + "." : "No new beats were added.";
  } catch (error) {
    try { tkEndUndo(); } catch (undoError) {}
    return "ERROR: " + error.toString();
  }
}