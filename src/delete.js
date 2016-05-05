editor.delete = {
  // removes selected measure
  measure: function() {
    // protection from removing last remaining measure
    if(scoreJson["score-partwise"].part[0].measure.length <= 1) {
      // TODO error message "Could not remove last remaining measure"
      return;
    }

    // TODO attributes need to be solved
    // if next measure doesn't have attributes, give it attributes from deleted measure
    // if next measure has attributes, merge them with attributes from deleted measure
    // with priority on next measure attributes, use merge from vexui util.js


    // TODO clef, timesig and keysig must remain on very first measure

    var measureIndex = +editor.selected.measure.id.split('m')[1];
    // to avoid inconsistency between measure and note id
    editor.selected.note.id = 'm' + measureIndex + 'n0';

    // remove measure from global arrays
    vfStaves.splice(measureIndex, 1);
    xmlAttributes.splice(measureIndex, 1);
    vfStaveNotes.splice(measureIndex, 1);

    // re-number all following notes ids in measures in part
    for(var m = measureIndex; m < vfStaveNotes.length; m++) {
      for(var n = 0; n < vfStaveNotes[m].length; n++) {
        vfStaveNotes[m][n].setId('m' + m + 'n' + n);
      }
    }

    // remove measure from scoreJson
    scoreJson["score-partwise"].part[0].measure.splice(measureIndex, 1);

    // shift numbering for all following measures in part
    for(var m = measureIndex; m < scoreJson["score-partwise"].part[0].measure.length; m++) {
      scoreJson["score-partwise"].part[0].measure[m]["@number"] = m;
    }
    // if deleted measure was last, mark current last measure as selected
    if(measureIndex >= scoreJson["score-partwise"].part[0].measure.length - 1) {
      editor.selected.measure.id = 'm'+(scoreJson["score-partwise"].part[0].measure.length - 1);
      // mark first note in that measure as selected
      editor.selected.note.id = editor.selected.measure.id + 'n0';
    }
  },
  // deletes note by replacing it with a rest of the same duration
  note: function(){
    // get and parse id of selected note (id='m13n10')
    var mnId = editor.selected.note.id;
    var measureIndex = mnId.split('n')[0].split('m')[1];
    var noteIndex = mnId.split('n')[1];
    var vfStaveNote = vfStaveNotes[measureIndex][noteIndex];
    // if note is already a rest, do nothing
    if(vfStaveNote.isRest())
      return;
    // get notes duration properties
    var duration = vfStaveNote.getDuration();
    // create new Vex.Flow.StaveNote for rest
    var vfRest = new Vex.Flow.StaveNote({
      keys: [ editor.table.DEFAULT_REST_PITCH ],
      duration: duration + 'r'
    });
    // set id for note DOM element in svg
    vfRest.setId(mnId);
    // set dots for a rest, however, currently supports only one dot(see parse.js line 140)
    if(vfStaveNote.isDotted()) {
      var dots = vfStaveNote.getDots().length;
      for(var i = 0; i < dots; i++)
        vfRest.addDotToAll();
    }
    // replace deleted note with a rest
    vfStaveNotes[measureIndex].splice(noteIndex, 1, vfRest);
    // delete pitch property from json
    delete scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].pitch;
    // delete accidental if any
    delete scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex].accidental;
    // create empty rest property
    scoreJson["score-partwise"].part[0].measure[measureIndex].note[noteIndex]['rest'] = null;
    // I assume, that property order does not matter
    // also, currently I don't delete some non-rest elements, like stem, lyric, notations (e.g.slur)
  },
  clef: function(){
    // editor.measures[editor.selected.measure.selection - 1].clef = null;
  },
  timeSignature: function(){
    // editor.measures[editor.selected.measure.selection - 1].showTimeSig = false;
  },
  accidental: function(){
    // var selectedMeasure = editor.selected.measure.selection - 1;
    // var selectedNoteVoice = 'v1';
    // editor.measures[selectedMeasure][selectedNoteVoice][editor.selected.note.selection].accidental = null;
  }
}
