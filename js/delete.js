editor.delete = {
  measure: function(){
    if(editor.measures.length > 1) {   //protection from removing last remaining measure
      //TODO: editor.selected.measure can be null/undefined
      // splice the selected measure
      console.log('delete:'+editor.selected.measure.selection);
      editor.measures.splice(editor.selected.measure.selection - 1, 1);

      // reset the selected measure to the measure after the measure that was just deleted
      // editor.selected.measure.selection = editor.selected.measure.selection + 1;
      // reset all measure numbers
      for(i=0; i<editor.measures.length; i++){
        editor.measures[i].measure = i + 1;
      }
    }
  },
  note: function(){
    var selectedNoteVoice = 'v1';

    editor.measures[editor.selected.measure.selection - 1][selectedNoteVoice].splice(editor.selected.note.selection, 1);
    editor.selected.note.selection = null;
    editor.selected.note.clicked = false;
  },
  clef: function(){
    editor.measures[editor.selected.measure.selection - 1].clef = null;
  },
  timeSignature: function(){
    editor.measures[editor.selected.measure.selection - 1].showTimeSig = false;
  },
  accidental: function(){
    var selectedMeasure = editor.selected.measure.selection - 1;
    var selectedNoteVoice = 'v1';
    editor.measures[selectedMeasure][selectedNoteVoice][editor.selected.note.selection].accidental = null;
  }
}
