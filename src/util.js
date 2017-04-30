function switchToNoteMode() {
  if(editor.mode !== 'note') {
    console.log('[INFO] Switching to note mode...');
    editor.mode = 'note';
    editor.svgElem.addEventListener('mousemove', redrawMeasureWithCursorNote, false);
    editor.draw.score();
  }
}

function switchToMeasureMode() {
  if(editor.mode !== 'measure') {
    console.log('[INFO] Switching to measure mode...');
    editor.mode = 'measure';
    editor.svgElem.removeEventListener('mousemove', redrawMeasureWithCursorNote, false);
    editor.draw.score();
  }
}

/**
 * Re-number all following notes ids in measures in part
 */
function correctVFStaveIds(measureIndex) {
  console.log('[INFO] Within correctVFStaveIds...');
  let measureLength = gl_VfStaveNotes.length;
  for(var m = measureIndex; m < measureLength; m++) {
    let noteLength = gl_VfStaveNotes[m].length;
    for(var n = 0; n < noteLength; n++) {
      console.log('[DEBUG] Re-setting m'+m+'n'+n);
      gl_VfStaveNotes[m][n].setId('m'+m+'n'+n);
    }
  }
}

/**
 * Shift numbering for all following measures in part
 */
function correctJSONMeasureNumbers(measureIndex) {
  console.log('[INFO] Within correctMeasureNumbers...');
  let score = scoreJson["score-partwise"].part[0];
  let numMeasures = score.measure.length;
  for(var m = measureIndex; m < numMeasures; m++) {
    console.log('[DEBUG] Setting m'+m+' to ' + (m + 1));
    score.measure[m]["@number"] = m + 1;
  }
}

// draws note, which is to be added, below mouse cursor when it is
// moving in column of selected note(only rest currenly)
function redrawMeasureWithCursorNote(event) {
  console.log('[DEBUG] Redrawing the note to be added...');
  // get mouse position
  editor.mousePos.current = getMousePos(editor.svgElem, event);

  // get selected measure and note
  var vfStaveNote = getSelectedNote();
  var vfStave     = getSelectedMeasure();

  // currently support only for replacing rest with a new note
  // building chords feature will be added soon
  if(!vfStaveNote.isRest()) {
    return;
  }

  // get column of selected note on stave
  var bb    = vfStave.getBoundingBox();
  var begin = vfStaveNote.getNoteHeadBeginX() - 5;
  bb.setX(begin);
  bb.setW(vfStaveNote.getNoteHeadEndX() - begin + 5);
  // bb.setW(20);
  // bb.draw(editor.ctx);

  // mouse cursor is within note column
  if(isCursorInBoundingBox(bb, editor.mousePos.current) ) {
    // save mouse position
    editor.mousePos.previous = editor.mousePos.current;
    // get new note below mouse cursor
    editor.selected.cursorNoteKey = getCursorNoteKey();

    editor.svgElem.addEventListener('click', editor.add.note, false);

    // redraw only when cursor note changed pitch
    // (mouse changed y position between staff lines/spaces)
    if(editor.lastCursorNote !== editor.selected.cursorNoteKey) {
      // console.log(editor.selected.cursorNoteKey);
      editor.draw.selectedMeasure(true);

    }
    // save previous cursor note for latter comparison
    editor.lastCursorNote = editor.selected.cursorNoteKey;
  }
  // mouse cursor is NOT within note column
  else {
    editor.svgElem.removeEventListener('click', editor.add.note, false);

    // mouse cursor just left note column(previous position was inside n.c.)
    if(isCursorInBoundingBox(bb, editor.mousePos.previous) ) {
      // redraw measure to erase cursor note
      editor.draw.selectedMeasure(false);
      editor.mousePos.previous = editor.mousePos.current;
      editor.lastCursorNote = '';
    }
  }

}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}

function getRadioValue(name) {
  var radios = document.getElementsByName(name);
  for(var i = 0; i < radios.length; i++) {
    if(radios[i].checked) {
      return radios[i].value;
    }
  }
}

/**
 * Find the mouse position and return the correct note for that position.
 */
// TODO rewrite with use of vfStave.getLineForY(editor.mousePos.current.y)
function getCursorNoteKey() {
  var y = gl_VfStaves[getSelectedMeasureIndex()].y;
  // var y = editor.selected.measure.y;
  var notesArray = ['c/','d/','e/','f/','g/','a/','b/'];
  var count = 0;
  var cursorNoteKey;
  var length = notesArray.length;

  for(var octave = 5; octave >= 0; octave--) {
    for(var noteIndex = 0; noteIndex < length; noteIndex++) {
      var noteOffset = (count * 35) - ((noteIndex * 5) - 17);
      if(editor.mousePos.current.y >= (y + noteOffset)
          && editor.mousePos.current.y <= (5 + y + noteOffset)) {
        cursorNoteKey = notesArray[noteIndex] + (octave + 1);
        break;
      }
    }
    count++;
  }
  return cursorNoteKey;
}

function getSelectedMeasureIndex() {
  return +editor.selected.measure.id.split('m')[1];
}

function getSelectedNoteIndex() {
  return +editor.selected.note.id.split('n')[1];
}

function getSelectedMeasure() {
  return gl_VfStaves[getSelectedMeasureIndex()];
}

function getSelectedNote() {
  return gl_VfStaveNotes[getSelectedMeasureIndex()][getSelectedNoteIndex()];
}

/**
 * Highlights properties of selected note on control panel
 */
function highlightSelectedNoteProperties() {
  var vfStaveNote = getSelectedNote();
  var accOfSelNote;

  // Uncheck already checked radio button
  $("input:radio[name='note-accidental']:checked").prop("checked", false);

  // Set radio button for accidental of selected note
  if(vfStaveNote.getAccidentals()) {
    accOfSelNote = vfStaveNote.getAccidentals()[0].type;
    $("input:radio[name='note-accidental'][value='"+accOfSelNote+"']").prop("checked", true);
  }

  // Set radio button for duration of selected note
  var durOfSelNote = vfStaveNote.getDuration();
  $("input:radio[name='note-value'][value='"+durOfSelNote+"']").prop("checked", true);

  // Set dotted checkbox
  $("#dotted-checkbox").prop("checked", vfStaveNote.isDotted());
}

/**
 * @return Current measure attribute from a previously set measure
 */
function getCurAttrForMeasure(measureIndex, attrname) {
  for(var i = measureIndex; i >= 0; i--) {
    if(gl_StaveAttributes[i][attrname]) {
      return gl_StaveAttributes[i][attrname];
    }
  }
}

/**
 * Highlights properties of selected measure on control panel
 */
var gl_selectBoxChangeOnMeasureSelect = false;
var gl_clefBox          = $("#clef-dropdown").selectBoxIt().data("selectBox-selectBoxIt");
var gl_keySigBox        = $("#keySig-dropdown").selectBoxIt().data("selectBox-selectBoxIt");
var gl_timeSigTopBox    = $("#timeSigTop").selectBoxIt().data("selectBox-selectBoxIt");
var gl_timeSigBottomBox = $("#timeSigBottom").selectBoxIt().data("selectBox-selectBoxIt");
function highlightSelectedMeasureProperties() {

  // in this function are set options for select boxes,
  // but selectBoxIt's setOption() triggers change event, which is not desired (jQuery's val() does not)
  // this is temporary ugly hack with global variable,
  // and should be replaced with better mechanism
  gl_selectBoxChangeOnMeasureSelect = true;

  let measureIndex = getSelectedMeasureIndex();
  let staveAttrib = gl_StaveAttributes[getSelectedMeasureIndex()];

  let clef = (staveAttrib.vfClef) ? staveAttrib.vfClef : getCurAttrForMeasure(measureIndex, 'vfClef');
  if(clef) {
    console.log('[DEBUG] Clef exists... ' + clef);
    gl_clefBox.selectOption(clef);
    // $('#clef-dropdown').val(clef);
  }

  let keySig = (staveAttrib.vfKeySpec) ? staveAttrib.vfKeySpec : getCurAttrForMeasure(measureIndex, 'vfKeySpec');
  if(keySig) {
    console.log('[DEBUG] Key exists... ' + keySig);
    gl_keySigBox.selectOption(keySig);
    // $('#keySig-dropdown').val(keySig);
  }

  let timeSig = (staveAttrib.vfTimeSpec) ? staveAttrib.vfTimeSpec : getCurAttrForMeasure(measureIndex, 'vfTimeSpec');
  if(timeSig) {
    console.log('[DEBUG] Time Signature exists... ' + timeSig);
    gl_timeSigTopBox.selectOption(timeSig.split('/')[0]);
    gl_timeSigBottomBox.selectOption(timeSig.split('/')[1]);
    // $('#timeSigTop').val(timeSig.split('/')[0]);
    // $('#timeSigBottom').val(timeSig.split('/')[1]);
  }

  gl_selectBoxChangeOnMeasureSelect = false;
}

function isCursorInBoundingBox(bBox, cursorPos) {
  return (cursorPos.x > bBox.getX())
      && (cursorPos.x < bBox.getX() + bBox.getW())
      && (cursorPos.y > bBox.getY())
      && (cursorPos.y < bBox.getY() + bBox.getH());
}

function moveNote(step) {
  if(getSelectedNote().isRest()) {
    return;
  }
  editor.edit.notePitch(step);
  editor.draw.selectedMeasure(false);
}

function moveMeasure(step) {
  let moveIndex = getSelectedMeasureIndex() + step;
  if(moveIndex < 0 || moveIndex > (gl_VfStaves.length - 1)) {
    return;
  }
  editor.selected.measure.previousId = 'm' + getSelectedMeasureIndex();
  editor.selected.measure.id = 'm' + (moveIndex);
  editor.selected.note.previousId = editor.selected.note.id;
  editor.selected.note.id = editor.selected.measure.id + 'n0';

  $('svg .measureRect#'+editor.selected.measure.previousId)
    .removeClass('highlightedMeasure');
  $('svg .measureRect#'+editor.selected.measure.id)
    .addClass('highlightedMeasure');

  console.log('[INFO] Traversing measures from '+editor.selected.note.previousId+' to '+editor.selected.note.id);
}

/**
 * @param obj1 The first object
 * @param obj2 The second object
 * @returns A new object representing the merged objects. If both objects passed as param have the same prop, then obj2 property is returned.
 */
// author Andre Bakker, VexUI: https://github.com/andrebakker/VexUI
function mergeProperties(obj1, obj2){
  var merged = {};
    for (var attrname in obj1) { merged[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { merged[attrname] = obj2[attrname]; }
    return merged;
}

// Merge `destination` hash with `source` hash, overwriting like keys
// in `source` if necessary.
function mergePropertiesInPlace(source, destination) {
  for (var property in source) {
    destination[property] = source[property];
  }
}
