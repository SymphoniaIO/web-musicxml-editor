/*
 * module for note/measure addition...
 */
editor.add = {
  /**
   * Inserts new measure filled with whole rest AFTER selected measure
   */
  measure: function() {
    console.log("[INFO] Adding measure...");
    var selMeasureIndex = getSelectedMeasureIndex();
    var newMeasureIndex = selMeasureIndex + 1;
    console.log("[DEBUG] Selected Measure Index..." + selMeasureIndex);

    // Create new Vex.Flow.Stave. Positions will be set in draw function.
    var vfNewStave = new Vex.Flow.Stave(0, 0, editor.staveWidth);

    // Add new measure to global array of Vex.Flow Staves, inserting before element at newMeasureIndex
    gl_VfStaves.splice(newMeasureIndex, 0, vfNewStave);
    // add empty attributes for measure
    gl_StaveAttributes.splice(newMeasureIndex, 0, {});
    // fill measure with whole rest
    var wholeRest = new Vex.Flow.StaveNote({ keys: ["b/4"], duration: "wr" });
    wholeRest.setId('m' + selMeasureIndex + 'n0');
    gl_VfStaveNotes.splice(newMeasureIndex, 0, [wholeRest]);

    correctVFStaveIds(newMeasureIndex);

    // add new measure to scoreJson
    var newMeasure = {
      '@number': newMeasureIndex + 1, // Measures not zero-indexed
      note: [
        {
          '@measure' : 'yes',
          rest: null,
          duration: 16  // TODO get duration from divisions in current attributes
        }
      ]
    };

    // Insert new measure to scoreJson
    scoreJson["score-partwise"].part[0].measure.splice(newMeasureIndex, 0, newMeasure);

    correctJSONMeasureNumbers(newMeasureIndex);
  },
  note: function(){
    console.log("[INFO] Adding note...");
    // get and parse id of selected note (id='m13n10')
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex    = getSelectedNoteIndex();
    var vfStaveNote  = gl_VfStaveNotes[measureIndex][noteIndex];

    var noteValue = getRadioValue('note-value');
    // var noteValue = vfStaveNote.getDuration();     //w, h, q, 8, 16
    var dot = $('#dotted-checkbox').is(":checked") ? 'd' : '';
    // var dot = vfStaveNote.isDotted() ? 'd' : '';

    // create new Vex.Flow.StaveNote
    var newNote = new Vex.Flow.StaveNote({
      keys: [ editor.selected.cursorNoteKey ],
      duration: noteValue + dot,
      auto_stem: true
    });
    // set id for note DOM element in svg
    newNote.setId(editor.selected.note.id);

    if(dot === 'd') {
      newNote.addDotToAll();
    }

    // put new note in place of selected rest
    gl_VfStaveNotes[measureIndex].splice(noteIndex, 1, newNote);

    // put new note into scoreJson also
    delete scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].rest;
    delete scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex]['@measure'];

    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].pitch = {};
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].pitch
      .step = editor.selected.cursorNoteKey[0].toUpperCase();
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].pitch
      .octave = editor.selected.cursorNoteKey[editor.selected.cursorNoteKey.length - 1];

    divisions = getCurAttrForMeasure(measureIndex, 'xmlDivisions');
    var xmlDuration = editor.NoteTool.getDurationFromStaveNote(newNote, divisions);
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].duration = xmlDuration;

    editor.svgElem.removeEventListener('click', editor.add.note, false);
    editor.draw.selectedMeasure(false);

    // fluent creating of score:
    // add new measure, if current one is the last one and the note is also the last one
    if(measureIndex === gl_VfStaves.length - 1
      && noteIndex === gl_VfStaveNotes[measureIndex].length - 1) {
      editor.add.measure();
      // select first note in added measure
      measureIndex++;
      editor.selected.measure.id = 'm' + measureIndex;
      editor.selected.note.id = 'm' + measureIndex + 'n0';
      editor.draw.score();
    }

  },
  clef: function(){
    console.log("[INFO] Adding clef...");
    var clefDropdown = $('#clef-dropdown').val();
    // console.log('add clef: '+clefDropdown);
    var measureIndex = getSelectedMeasureIndex();
    var noteIndex = getSelectedNoteIndex();
    var vfStave = gl_VfStaves[measureIndex];

    var currentClef = getCurAttrForMeasure(measureIndex, 'vfClef');

    // change clef only if new is different from current
    if(currentClef !== clefDropdown) {
      vfStave.setClef(clefDropdown);
      gl_StaveAttributes[measureIndex].vfClef = clefDropdown;
      var xmlClef = editor.table.CLEF_VEX_TYPE_DICT[clefDropdown];
      gl_StaveAttributes[measureIndex].xmlClef = xmlClef;
      // put clef into measure attributes in json
      var xmlAttr = scoreJson["score-partwise"].part[0].measure[measureIndex].attributes || {};
      xmlAttr.clef = {};
      xmlAttr.clef.sign = xmlClef.split('/')[0];
      xmlAttr.clef.line = xmlClef.split('/')[1];
      scoreJson["score-partwise"].part[0].measure[measureIndex].attributes = xmlAttr;
    }

    // remove changed clef, if it is the same like previous
    if(measureIndex > 0) {
      var previousClef = getCurAttrForMeasure(measureIndex - 1, 'vfClef');
      if(clefDropdown === previousClef) {
        vfStave.removeClef();
        delete gl_StaveAttributes[measureIndex].vfClef;
        delete gl_StaveAttributes[measureIndex].xmlClef;
        if(scoreJson["score-partwise"].part[0].measure[measureIndex].attributes)
          delete scoreJson["score-partwise"].part[0].measure[measureIndex].attributes.clef;
      }
    }
  },
  keySignature: function() {
    console.log("[INFO] Adding key signature...");
    var keySig = $('#keySig-dropdown').val();

    var measureIndex = getSelectedMeasureIndex();
    var vfStave = gl_VfStaves[measureIndex];

    var currentKeysig = getCurAttrForMeasure(measureIndex, 'vfKeySpec');

    // Only add a new key if it is different than the current key
    if(keySig !== currentKeysig) {
      vfStave.setKeySignature(keySig);

      gl_StaveAttributes[measureIndex].vfKeySpec = keySig;
      var fifths = 0;
      fifths = editor.table.SHARP_MAJOR_KEY_SIGNATURES.indexOf(keySig) + 1;
      if(!fifths)
        fifths = -(editor.table.FLAT_MAJOR_KEY_SIGNATURES.indexOf(keySig) + 1);
      gl_StaveAttributes[measureIndex].xmlFifths = fifths;

      var xmlAttr = scoreJson["score-partwise"].part[0].measure[measureIndex].attributes || {};
      xmlAttr.key = {};
      xmlAttr.key.fifths = fifths;
      // mode is not mandatory (e.g. major, minor, dorian...)

      scoreJson["score-partwise"].part[0].measure[measureIndex].attributes = xmlAttr;
    }

    if(measureIndex > 0) {
      var previousKeysig = getCurAttrForMeasure(measureIndex - 1, 'vfKeySpec');
      if(keySig === previousKeysig) {
        vfStave.removeKeySignature();
        delete gl_StaveAttributes[measureIndex].vfKeySpec;
        delete gl_StaveAttributes[measureIndex].xmlFifths;
        if(scoreJson["score-partwise"].part[0].measure[measureIndex].attributes) {
          delete scoreJson["score-partwise"].part[0].measure[measureIndex].attributes.key;
        }
      }
    }
  },
  timeSignature: function() {
    console.log("[INFO] Adding time signature...");
    var top = $('#timeSigTop').val();
    var bottom = $('#timeSigBottom').val();
    var timeSig = top + '/' + bottom;

    var currentTimesig = getCurAttrForMeasure(measureIndex, 'vfTimeSpec');

    if(timeSig !== currentTimesig) {
      var measureIndex = getSelectedMeasureIndex();
      var vfStave = gl_VfStaves[measureIndex];

      vfStave.setTimeSignature(timeSig);
      gl_StaveAttributes[measureIndex].vfTimeSpec = timeSig;

      var xmlAttr = scoreJson["score-partwise"].part[0].measure[measureIndex].attributes || {};
      xmlAttr.time = {};
      xmlAttr.time.beats = top;
      xmlAttr.time['beat-type'] = bottom;

      scoreJson["score-partwise"].part[0].measure[measureIndex].attributes = xmlAttr;
    }

    if(measureIndex > 0) {
      var previousTimesig = getCurAttrForMeasure(measureIndex - 1, 'vfTimeSpec');
      if(timeSig === previousTimesig) {
        vfStave.removeTimeSignature();
        delete gl_StaveAttributes[measureIndex].vfTimeSpec;
        if(scoreJson["score-partwise"].part[0].measure[measureIndex].attributes) {
          delete scoreJson["score-partwise"].part[0].measure[measureIndex].attributes.time;
        }
      }
    }
  },
  accidental: function(){
    console.log("[INFO] Adding accidental...");
    var vexAcc = getRadioValue('note-accidental');

    var vfStaveNote = getSelectedNote();

    if(!vfStaveNote.isRest()) {
      // TODO change to setAccidental()
      vfStaveNote.addAccidental(0, new Vex.Flow.Accidental(vexAcc));
      // no support for chords currently

      // add accidental to json
      var xmlAcc = '';
      for(var xmlname in editor.table.ACCIDENTAL_DICT) {
        if(vexAcc === editor.table.ACCIDENTAL_DICT[xmlname]) {
          xmlAcc = xmlname;
        }
      }
      scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].accidental = xmlAcc;
    }
  }
}
