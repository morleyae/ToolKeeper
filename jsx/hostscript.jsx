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

function tkPrecomposeSelected(moveAll, adjustDuration) {
  try { tkBeginUndo("Precompose"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var layers=tkSelectedLayers(); if(!layers.length) return "Select at least one layer."; var earliest=layers[0].inPoint;var latest=layers[0].outPoint;var indexes=[];for(var i=0;i<layers.length;i++){indexes.push(layers[i].index);if(layers[i].inPoint<earliest)earliest=layers[i].inPoint;if(layers[i].outPoint>latest)latest=layers[i].outPoint;}var nestedComp=comp.layers.precompose(indexes,"Precomp",moveAll);var nestedLayer=null;if(comp.selectedLayers&&comp.selectedLayers.length)nestedLayer=comp.selectedLayers[0];if(adjustDuration&&nestedComp instanceof CompItem){var duration=Math.max(1/comp.frameRate,latest-earliest);nestedComp.duration=duration;nestedComp.workAreaStart=0;nestedComp.workAreaDuration=duration;}if(nestedLayer&&adjustDuration){nestedLayer.startTime=earliest;nestedLayer.inPoint=earliest;nestedLayer.outPoint=latest;}tkEndUndo();return "Selected layers precomposed.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkPrecomposeEach(moveAll, adjustDuration) {
  try { tkBeginUndo("Precompose Each"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var layers=tkSelectedLayers(); if(!layers.length) return "Select at least one layer.";var count=0;var snapshot=[];for(var i=0;i<layers.length;i++){snapshot.push({index:layers[i].index,inPoint:layers[i].inPoint,outPoint:layers[i].outPoint,name:layers[i].name});}snapshot.sort(function(a,b){return b.index-a.index});for(var j=0;j<snapshot.length;j++){var original=comp.layer(snapshot[j].index);if(!original)continue;var duration=Math.max(1/comp.frameRate,snapshot[j].outPoint-snapshot[j].inPoint);var nestedComp=comp.layers.precompose([original.index],snapshot[j].name||"Precomp_"+(j+1),moveAll);var nestedLayer=null;if(comp.selectedLayers&&comp.selectedLayers.length)nestedLayer=comp.selectedLayers[0];if(adjustDuration&&nestedComp instanceof CompItem){nestedComp.duration=duration;nestedComp.workAreaStart=0;nestedComp.workAreaDuration=duration;}if(nestedLayer){nestedLayer.startTime=snapshot[j].inPoint;nestedLayer.inPoint=snapshot[j].inPoint;nestedLayer.outPoint=snapshot[j].outPoint;}count++;}tkEndUndo();return "Precomposed "+count+" selected layer"+(count===1?"":"s")+".";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkDuplicateSelected() {
  try { tkBeginUndo("Duplicate"); var layers=tkSelectedLayers(); if(!layers.length) return "Select at least one layer."; var count=0; for(var i=0;i<layers.length;i++){layers[i].duplicate();count++;} tkEndUndo(); return "Duplicated "+count+" layer"+(count===1?"":"s")+"."; } catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString(); }
}

function tkDecomposeSelected() {
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

function tkReverseLayerOrder() {
  try { tkBeginUndo("Invert Keyframes"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first.";var layers=tkSelectedLayers();if(!layers.length)return "Select at least one layer.";var changed=0;for(var i=0;i<layers.length;i++)changed+=tkInvertPropertyTree(layers[i]);tkEndUndo();if(!changed)return "No keyframes found in the selected layer"+(layers.length===1?"":"s")+".";return "Inverted "+changed+" keyframed property"+(changed===1?"":"s")+".";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}
}

function tkSelectTextLayers() {
  try { var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var count=0; for(var i=1;i<=comp.numLayers;i++){var l=comp.layer(i); if(l instanceof TextLayer){l.selected=true;count++;}} return count?"Selected "+count+" text layer"+(count===1?"":"s")+".":"No text layers found.";} catch(e){return "ERROR: "+e.toString();}
}

function tkReverseTextLayers() {
  try { var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var text=[]; for(var i=1;i<=comp.numLayers;i++){if(comp.layer(i) instanceof TextLayer) text.push(comp.layer(i));} if(text.length<2) return "Select at least two text layers."; var source=text.map(function(l){return l.name}); for(var j=0;j<text.length;j++) text[j].name=source[text.length-1-j]; return "Text layer names reversed.";} catch(e){return "ERROR: "+e.toString();}
}

function tkSplitSelectedText() {
  try { tkBeginUndo("Split Text"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var selected=tkSelectedLayers(); if(!selected.length) return "Select at least one text layer."; var created=0; for(var i=0;i<selected.length;i++){var source=selected[i]; if(!(source instanceof TextLayer)) continue; var property=source.property("Source Text"); var text=property.value.text||""; var words=text.split(/\s+/); if(words.length<2) continue; for(var w=0;w<words.length;w++){var copy=source.duplicate(); copy.name=source.name+" - "+words[w]; property=copy.property("Source Text"); var doc=property.value; doc.text=words[w]; property.setValue(doc); copy.inPoint=source.inPoint+w*(source.outPoint-source.inPoint)/words.length/10; copy.outPoint=source.outPoint;} created++;} tkEndUndo(); return created?"Text split into word layers.":"No suitable text selection found.";} catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString();}
}

function tkGetBeatLayers() {
  var comp=tkSelectedComp(); if(!comp) return "[]"; var result=[]; for(var i=1;i<=comp.numLayers;i++){var l=comp.layer(i); if(l.hasAudio) result.push({index:i,name:l.name});} return JSON.stringify(result);
}

function tkResetBeatMarkers() {
  try { tkBeginUndo("Reset Beat Markers"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var removed=0; for(var i=1;i<=comp.numLayers;i++){var marker=comp.layer(i).property("Marker"); if(marker){for(var k=marker.numKeys;k>=1;k--){marker.removeKey(k);removed++;}}} if(comp.markerProperty){for(var m=comp.markerProperty.numKeys;m>=1;m--){comp.markerProperty.removeKey(m);removed++;}} tkEndUndo(); return removed?"Removed "+removed+" marker"+(removed===1?"":"s")+".":"No markers found.";} catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString();}
}

function tkAddBeatMarkers() {
  try { tkBeginUndo("Add Beat Markers"); var comp=tkSelectedComp(); if(!comp) return "Select a composition first."; var audio=null; for(var i=1;i<=comp.numLayers;i++){if(comp.layer(i).hasAudio){audio=comp.layer(i);break;}} if(!audio) return "Select or enable a layer with audio."; var property=comp.markerProperty; var frame=1/comp.frameRate; var start=Math.max(comp.workAreaStart,0); var end=comp.workAreaStart+comp.workAreaDuration; if(end>comp.duration) end=comp.duration; var count=0; for(var t=start;t<end;t+=frame*12){var comment=""+(++count); property.setValueAtTime(t,new MarkerValue(comment));} tkEndUndo(); return "Added "+count+" beat markers.";} catch(e){try{tkEndUndo()}catch(x){} return "ERROR: "+e.toString();}
}

function tkSnapToMarkers(){try{var comp=tkSelectedComp();if(!comp||!comp.markerProperty||comp.markerProperty.numKeys<1)return "No composition markers found.";var times=[];for(var i=1;i<=comp.markerProperty.numKeys;i++)times.push(comp.markerProperty.keyTime(i));var best=times[0];for(var j=1;j<times.length;j++)if(Math.abs(times[j]-comp.time)<Math.abs(best-comp.time))best=times[j];comp.time=best;return "Playhead snapped to marker.";}catch(e){return "ERROR: "+e.toString();}}

function tkSequenceToMarkers(){return tkSequenceSelected();}

function tkCutToMarkers(){try{tkBeginUndo("Cut at Markers");var comp=tkSelectedComp();if(!comp||!comp.markerProperty||comp.markerProperty.numKeys<1)return "No composition markers found.";var layers=tkSelectedLayers();if(!layers.length)return "Select at least one layer.";var count=0;for(var i=1;i<=comp.markerProperty.numKeys;i++){var t=comp.markerProperty.keyTime(i);for(var j=0;j<layers.length;j++){if(t>=layers[j].inPoint&&t<=layers[j].outPoint){var split=layers[j].duplicate();layers[j].outPoint=t;split.inPoint=t;count++;}}}tkEndUndo();return "Cut "+count+" layer"+(count===1?"":"s")+" at markers.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}}

function tkFindBadFrames(){try{tkBeginUndo("Find Bad Frames");var comp=tkSelectedComp();if(!comp)return "Select a composition first.";var start=comp.workAreaStart,end=start+comp.workAreaDuration;var step=1/comp.frameRate;var count=0;for(var t=start;t<end;t+=step*10){comp.markerProperty.setValueAtTime(t,new MarkerValue("Review"));count++;}tkEndUndo();return "Placed "+count+" review markers.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}}

function tkSelectCaptionAudio(){try{var comp=tkSelectedComp();if(!comp)return "Select a composition first.";var count=0;for(var i=1;i<=comp.numLayers;i++){var l=comp.layer(i);if(l.hasAudio){l.selected=true;count++;}}return count?"Selected "+count+" audio layer"+(count===1?"":"s")+".":"No audio layer found.";}catch(e){return "ERROR: "+e.toString();}}

function tkCreateTextStyle(){try{tkBeginUndo("Create Text Style");var comp=tkSelectedComp();if(!comp)return "Select a composition first.";var l=comp.layers.addText("Style");l.property("Source Text").setValue("STYLE");l.property("Opacity").setValue(100);tkEndUndo();return "Text style sample created.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}}

function tkSaveTextStyle(){try{var l=null;var comp=tkSelectedComp();if(!comp)return "Select a text layer first.";for(var i=1;i<=comp.selectedLayers.length;i++){if(comp.selectedLayers[i-1] instanceof TextLayer){l=comp.selectedLayers[i-1];break;}}if(!l)return "Select a text layer first.";var doc=l.property("Source Text").value;app.settings.saveSetting("ToolKeeper","textStyleFont",doc.font||"");app.settings.saveSetting("ToolKeeper","textStyleSize",doc.fontSize||0);return "Text style saved.";}catch(e){return "ERROR: "+e.toString();}}

function tkCreateAutoCaptions(){try{tkBeginUndo("Create Captions");var comp=tkSelectedComp();if(!comp)return "Select a composition first.";var audio=null;for(var i=1;i<=comp.numLayers;i++){if(comp.layer(i).hasAudio){audio=comp.layer(i);break;}}if(!audio)return "Select or enable a layer with audio.";var duration=audio.outPoint-audio.inPoint;var l=comp.layers.addText("Audio caption");var prop=l.property("Source Text");prop.setValue("Caption text");l.inPoint=audio.inPoint;l.outPoint=audio.outPoint;tkEndUndo();return "Placeholder caption created. Connect speech transcription to replace it.";}catch(e){try{tkEndUndo()}catch(x){}return "ERROR: "+e.toString();}}
