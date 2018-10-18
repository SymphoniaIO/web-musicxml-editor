editor.edit = {
  // changes selected notes pitch
  notePitch: function(interval){
    // get and parse id of selected note (id='m13n10')
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex = getSelectedNoteIndex();
    var vfStaveNote = gl_VfStaveNotes[measureIndex][noteIndex];
    // if note is rest, do nothing
    if(vfStaveNote.isRest())
      return;
    // get notes duration
    var duration = vfStaveNote.getDuration();
    // get notes pitch; currently no chord support
    var key = vfStaveNote.getKeys()[0];   // e.g. 'g##/4'
    // transpose note
    var newKey = editor.NoteTool.transposeNote(key, interval);
    // get current clef
    var currentClef = getCurAttrForMeasure(measureIndex, 'vfClef');
    // create new Vex.Flow.StaveNote
    var newNote = new Vex.Flow.StaveNote({
      keys: [ newKey ],
      duration: duration,   // TODO add dots: /d*/
      clef: currentClef,
      auto_stem: true
    });
    // set id for note DOM element in svg
    newNote.setAttribute('id', editor.selected.note.id);
    // set dots for a rest, however, currently supports only one dot(see parse.js line 140)
    if(vfStaveNote.isDotted()) {
      var dots = vfStaveNote.getDots().length;
      for(var i = 0; i < dots; i++)
        newNote.addDotToAll();
    }
    // replace old note with a transposed one
    gl_VfStaveNotes[measureIndex].splice(noteIndex, 1, newNote);
    // change pitch property in json
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].pitch
      .step = newKey[0].toUpperCase();
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].pitch
      .octave = newKey[newKey.length - 1];
    // delete accidental if any
    delete scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].accidental;
    // uncheck checked accidental radio button
    $("input:radio[name='note-accidental']:checked").prop("checked", false);
  },

  // TODO change duration in json also
  noteDuration: function() {
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex = getSelectedNoteIndex();
    var vfStaveNote = gl_VfStaveNotes[measureIndex][noteIndex];

    var noteDuration = getRadioValue('note-value');

    // get notes pitch; currently no chord support
    var key = vfStaveNote.getKeys()[0];   // e.g. 'g##/4'
    var rest = vfStaveNote.isRest() ? 'r' : '';

    if(vfStaveNote.getAccidentals())
      var accOfSelNote = vfStaveNote.getAccidentals()[0].type;

    // get current clef
    var currentClef = getCurAttrForMeasure(measureIndex, 'vfClef');

    // create new Vex.Flow.StaveNote
    var newNote = new Vex.Flow.StaveNote({
      keys: [ key ],
      duration: noteDuration + rest,   // TODO add dots: /d*/
      clef: currentClef,
      auto_stem: true
    });

    if(accOfSelNote)
      newNote.addAccidental(0, new Vex.Flow.Accidental(accOfSelNote));

    // set id for note DOM element in svg
    newNote.setAttribute('id', editor.selected.note.id);
    // set dots for a rest, however, currently supports only one dot(see parse.js line 140)
    if(vfStaveNote.isDotted()) {
      var dots = vfStaveNote.getDots().length;
      for(var i = 0; i < dots; i++)
        newNote.addDotToAll();
    }
    // replace old note with a transposed one
    gl_VfStaveNotes[measureIndex].splice(noteIndex, 1, newNote);

    // change duration in json
    // get divisions
    var divisions = 0;
    // finds attributes of closest previous measure or current measure
    divisions = getCurAttrForMeasure(measureIndex, 'xmlDivisions');
    // for(var a = 0; a <= measureIndex; a++)
    //   if(! $.isEmptyObject(gl_StaveAttributes[a]) && gl_StaveAttributes[a].xmlDivisions)
    //     divisions = gl_StaveAttributes[a].xmlDivisions;

    if(!divisions)
      console.error('divisions for measures 1 to '+(measureIndex+1)+' are not set');

    var xmlDuration = editor.NoteTool.getDurationFromStaveNote(newNote, divisions);
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].duration = xmlDuration;

  },

  noteDot: function() {
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex = getSelectedNoteIndex();
    var vfStaveNote = gl_VfStaveNotes[measureIndex][noteIndex];
    var noteDuration = vfStaveNote.getDuration();

    if(vfStaveNote.isDotted()) {
      vfStaveNote.removeDot();
      delete scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].dot;
      // add rest after the edited note to ballance timing in measure
      // create new rest with half duration of the note
      let halfDuration = editor.table.NOTE_VEX_TYPES[
        editor.table.NOTE_VEX_TYPES.indexOf(noteDuration) - 1];
      let ballanceRest = new Vex.Flow.StaveNote({
        keys: ['b/4'],  // suppose rest is always at 3rd line
        duration: halfDuration + 'r',
        clef: 'treble',
        auto_stem: true
      });
      ballanceRest.setAttribute('id', 'm' + measureIndex + 'n' + noteIndex);
      // add the rest after edited note
      gl_VfStaveNotes[measureIndex].splice(noteIndex + 1, 0, ballanceRest);
      // renumber following notes (add 1)
      for (var i = noteIndex + 1; i < gl_VfStaveNotes[measureIndex].length; i++) {
        gl_VfStaveNotes[measureIndex][i].setAttribute('id', 'm' + measureIndex + 'n' + i);
      }
      // put ballance rest into scoreJson also
      var divisions = getCurAttrForMeasure(measureIndex, 'xmlDivisions');
      var xmlDuration = editor.NoteTool.getDurationFromStaveNote(ballanceRest, divisions);
      let xmlRest = [{ rest: null, duration: xmlDuration }];
      scoreJson["score-partwise"].part[0].measure[measureIndex].note
        .splice(noteIndex + 1, 0, xmlRest);
    }
    else {
      // TODO check, if dot can be added, and if yes, ballance timing in measure by removing/dividing next note
      if (noteDuration !== '64') {  // lowest support duration frame is one 64th
        vfStaveNote.setDot();
        scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].dot = null;
      }
      else {
        // uncheck dot checkbox after while
        setTimeout(function() { $("#dotted-checkbox:checked").prop("checked", false); }, 50);
        console.log("cannot have duration frame lower than one 64th")
      }
    }
  },

  noteAccidental: function(vexAcc) {
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex = getSelectedNoteIndex();
    var vfStaveNote = gl_VfStaveNotes[measureIndex][noteIndex];

    vfStaveNote.setAccidental(0, new Vex.Flow.Accidental(vexAcc));

    // add accidental to json
    var xmlAcc = '';
    for(var xmlname in editor.table.ACCIDENTAL_DICT)
      if(vexAcc === editor.table.ACCIDENTAL_DICT[xmlname])
        xmlAcc = xmlname;
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].accidental = xmlAcc;
  }

}