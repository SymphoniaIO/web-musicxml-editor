/*
 * module for note/measure deletion...
 */
editor.delete = {
  /**
   * Removes selected measure
   */
  measure: function() {
    console.log("[INFO] Deleting measure...");
    // Protection from removing last remaining measure
    if(scoreJson["score-partwise"].part[0].measure.length <= 1) {
      alert('Could not remove last remaining measure');
      return;
    }

    var selMeasureIndex = getSelectedMeasureIndex();
    console.log("[DEBUG] Selected Measure Index..." + selMeasureIndex);

    // To avoid inconsistency between measure and note id
    // console.log("[DEBUG] Selected Note..." + editor.selected.note.id);
    editor.selected.note.id = 'm' + selMeasureIndex + 'n0'; // TODO Don't see point in this
    // console.log("[DEBUG] Selected Note..." + editor.selected.note.id);

    // Merge attributes of measure being deleted with next measure attributes
    if(selMeasureIndex !== gl_StaveAttributes.length - 1) {
      mergePropertiesInPlace(gl_StaveAttributes[selMeasureIndex], gl_StaveAttributes[selMeasureIndex + 1]);
    }

    // Remove selected measure from global arrays
    gl_VfStaves.splice(selMeasureIndex, 1);
    gl_StaveAttributes.splice(selMeasureIndex, 1);
    gl_VfStaveNotes.splice(selMeasureIndex, 1);

    correctVFStaveIds(selMeasureIndex);

    // TODO merge attributes in json like above in gl_StaveAttributes

    // Remove measure from scoreJson
    scoreJson["score-partwise"].part[0].measure.splice(selMeasureIndex, 1);

    correctJSONMeasureNumbers(selMeasureIndex);

    // if deleted measure was last, mark current last measure as selected
    if(selMeasureIndex >= scoreJson["score-partwise"].part[0].measure.length - 1) {
      editor.selected.measure.id = 'm'+(scoreJson["score-partwise"].part[0].measure.length - 1);
      // mark first note in that measure as selected
      editor.selected.note.id = editor.selected.measure.id + 'n0';
    }
  },
  // deletes note by replacing it with a rest of the same duration
  note: function() {
    console.log("[INFO] Deleting note...");
    // get and parse id of selected note (id='m13n10')
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex    = getSelectedNoteIndex();
    var vfStaveNote  = gl_VfStaveNotes[measureIndex][noteIndex];

    // If note is already a rest, do nothing
    if(vfStaveNote.isRest()) {
      return;
    }

    // get notes duration properties
    var duration = vfStaveNote.getDuration();
    // create new Vex.Flow.StaveNote for rest
    var vfRest = new Vex.Flow.StaveNote({
      keys: [ editor.table.DEFAULT_REST_PITCH ],
      duration: duration + 'r'   // TODO add dots before 'r': /d*/
    });
    // set id for note DOM element in svg
    vfRest.setId(editor.selected.note.id);
    // set dots for a rest, however, currently supports only one dot(see parse.js line 140)
    if(vfStaveNote.isDotted()) {
      var dots = vfStaveNote.getDots().length;
      for(var i = 0; i < dots; i++) {
        vfRest.addDotToAll();
      }
    }
    // replace deleted note with a rest
    gl_VfStaveNotes[measureIndex].splice(noteIndex, 1, vfRest);

    // Delete selected note from JSON, replacing with rest
    let selectedNote = scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex];
    delete selectedNote.pitch;
    delete selectedNote.accidental;
    selectedNote['rest'] = null;

    // I assume, that property order does not matter
    // also, currently I don't delete some non-rest elements, like stem, lyric, notations (e.g.slur)
    // uncheck checked accidental radio button
    $("input:radio[name='note-accidental']:checked").prop("checked", false);
  },

  accidental: function() {
    console.log("[INFO] Deleting accidental...");
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex    = getSelectedNoteIndex();
    var vfStaveNote  = gl_VfStaveNotes[measureIndex][noteIndex];

    vfStaveNote.removeAccidental();

    delete scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].accidental;
  }
}
