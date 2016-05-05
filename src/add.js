/*
module for note/measure addition...
*/
editor.add = {
  // inserts new measure filled with whole rest AFTER selected measure
  measure: function(){
    // get and parse id of selected measure (id='m13')
    var measureIndex = +editor.selected.measure.id.split('m')[1];

    // create new Vex.Flow.Stave, positions will be set in draw function
    var vfNewStave = new Vex.Flow.Stave(0, 0, editor.staveWidth);
    // add measure to global array of Vex.Flow Staves
    // splice adds before, but we need to insert after - reason for measureIndex + 1
    // splice also takes higher index than biggest as biggest
    vfStaves.splice(measureIndex + 1, 0, vfNewStave);
    // add empty attributes for measure
    xmlAttributes.splice(measureIndex + 1, 0, {});
    // fill measure with whole rest
    var wholeRest = new Vex.Flow.StaveNote({ keys: ["b/4"], duration: "wr" });
    wholeRest.setId('m' + measureIndex + 'n0');
    vfStaveNotes.splice(measureIndex + 1, 0, [wholeRest]);

    // re-number all following notes ids in measures in part
    for(var m = measureIndex + 1; m < vfStaveNotes.length; m++) {
      for(var n = 0; n < vfStaveNotes[m].length; n++) {
        vfStaveNotes[m][n].setId('m' + m + 'n' + n);
      }
    }

    // add new measure to scoreJson
    var newMeasure = {
      '@number': measureIndex + 2,
      note: [
        {
          '@measure' : 'yes',
          rest: null,
          duration: 16  // TODO get duration from divisions in current attributes
        }
      ]
    };
    // insert new measure to json
    scoreJson["score-partwise"].part[0].measure.splice(measureIndex + 1, 0, newMeasure);
    
    // shift numbering for all following measures in part
    for(var m = measureIndex + 1; m < scoreJson["score-partwise"].part[0].measure.length; m++) {
      scoreJson["score-partwise"].part[0].measure[m]["@number"] = m + 1;
    }
  },
  note: function(){
    console.log('add note');
    // var thisNoteOrRest = getRadioValue('note-or-rest');  //"" or "r"
    var noteValue = getRadioValue('note-value');     //w, h, q, 8, 16
    var dot = $('#dotted-checkbox').is(":checked") ? 'd' : '';

    // get and parse id of selected note (id='m13n10')
    var mnId = editor.selected.note.id;
    var measureIndex = mnId.split('n')[0].split('m')[1];
    var noteIndex = mnId.split('n')[1];
    var vfStaveNote = vfStaveNotes[measureIndex][noteIndex];

    // create new Vex.Flow.StaveNote
    var vfNote = new Vex.Flow.StaveNote({
      keys: [ editor.selected.cursorNoteKey ],
      duration: noteValue + dot,
      auto_stem: true
    });
    // set id for note DOM element in svg
    vfNote.setId(mnId);

    if(dot === 'd')
      vfNote.addDotToAll();

    // put new note in place of selected rest
    vfStaveNotes[measureIndex].splice(noteIndex, 1, vfNote);

    // TODO put new note into scoreJson also

    editor.svgElem.removeEventListener('click', editor.add.note, false); 
    editor.draw.selectedMeasure(false);

  },
  clef: function(){
    // var dropdownValue = editor.clefDropdown.value;
    // editor.measures[editor.selected.measure.selection - 1].clef = dropdownValue;
  },
  keySignature: function(){ 
    // editor.measures[editor.selected.measure.selection - 1].keySig = editor.keySignature.value;
  },
  timeSignature: function(){
    // var top = $('#timeSigTop').val();
    // var bottom = $('#timeSigBottom').val();
    // var selectedMeasure = editor.selected.measure.selection - 1;

    // editor.measures[selectedMeasure].timeSigTop = top;
    // editor.measures[selectedMeasure].timeSigBottom = bottom;
    // editor.measures[selectedMeasure].showTimeSig = true;
  },
  accidental: function(){
    var vexAcc = getRadioValue('note-accidental');

    var mnId = editor.selected.note.id;
    var measureIndex = mnId.split('n')[0].split('m')[1];
    var noteIndex = mnId.split('n')[1];
    var vfStaveNote = vfStaveNotes[measureIndex][noteIndex];

    if(!vfStaveNote.isRest()) {
      // TODO change to setAccidental()
      vfStaveNote.addAccidental(0, new Vex.Flow.Accidental(vexAcc));
      // no support for chords currently

      // add accidental to json
      var xmlAcc = '';
      for(var xmlname in editor.table.ACCIDENTAL_DICT) {
        if(vexAcc === editor.table.ACCIDENTAL_DICT[xmlname])
          xmlAcc = xmlname;
      }
      scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].accidental = xmlAcc;
    }
  }, 
  dot: function(){
    // var selectedMeasure = editor.selected.measure.selection - 1;
    // var selectedNoteVoice = 'v1';
    // var checkboxValue = $('#dotted-checkbox').is(":checked");
    // // var isSelectedNoteDotted = editor.measures[selectedMeasure][selectedNoteVoice][editor.selected.note.selection].dotted;

    // editor.measures[selectedMeasure][selectedNoteVoice][editor.selected.note.selection].dotted = checkboxValue;
  }
}
