// redraw whole score when window resizes
debouncedResize = null;
$(window).resize(function() {
  if (! debouncedResize)
    debouncedResize = setTimeout(function() {
      editor.draw.score();
      debouncedResize = null;
    }, 50);
});
// $(window).resize(editor.draw.score);

// for highlighting measures
function attachListenersToMeasureRect(measureRectElem) {
  // to avoid multiple handlers attachment
  if(measureRectElem.data('handlers-added'))
    return true;
  measureRectElem.data('handlers-added', true);

  measureRectElem.on('click', function() {
    $(this).css({'fill': editor.measureColor, 'opacity': '0.4'});
    console.log($(this).attr('id'));
    // if it is not second click on already selected measure
    if(editor.selected.measure.id !== $(this).attr('id')) {
      // save currently selected id to previous
      editor.selected.measure.previousId = editor.selected.measure.id;
      editor.selected.measure.id = $(this).attr('id');
      editor.selected.note.previousId = editor.selected.note.id;
      editor.selected.note.id = $(this).attr('id') + 'n0';
      var prevId = editor.selected.measure.previousId;
      $('svg .measureRect#'+prevId).css({'fill': 'transparent'});
      $('svg .measureRect#'+editor.selected.measure.id)
        .css({'fill': editor.measureColor, 'opacity': '0.4'});
      highlightSelectedMeasureProperties();
    }
  });
  measureRectElem.on('mouseenter', function() {
    if(editor.selected.measure.id !== $(this).attr('id'))
      $(this).css({'fill': editor.measureColor, 'opacity': '0.1'}); 
  });
  measureRectElem.on('mouseleave', function() {
    if(editor.selected.measure.id !== $(this).attr('id'))
      $(this).css({'fill': 'transparent'}); 
  });
}

// for highlighting notes
function attachListenersToNote(noteElem) {
  noteElem.addEventListener("mouseover", function() {
    // if editor is in mode for working with notes
    if(editor.mode === 'note') {
      // don't change colour of already selected note
      if(editor.selected.note.id !== $(this).attr('id').split('-')[1]) {
        // change colour for each note parts - stem, head, dot, accidental...
        $(this).colourNote("orange");
      }
    }
  }, false);

  noteElem.addEventListener("mouseout", function() {
    if(editor.mode === 'note') {
      if(editor.selected.note.id !== $(this).attr('id').split('-')[1]) {
        $(this).colourNote("black");
      }
    }
  }, false);

  noteElem.addEventListener("click", function() {
    if(editor.mode === 'note') {
      // if it is not second click on already selected note
      if(editor.selected.note.id !== $(this).attr('id').split('-')[1]) {
        $(this).colourNote("red");
        // save currently selected id to previous
        editor.selected.measure.previousId = editor.selected.measure.id;
        editor.selected.note.previousId = editor.selected.note.id;
        // format of id: id='vf-m13n10' - eleventh note in fourteenth measure(indexing from 0)
        var mnId = $(this).attr('id');
        // save id of newly selected note
        editor.selected.measure.id = mnId.split('-')[1].split('n')[0];  // 'm13'
        editor.selected.note.id = mnId.split('-')[1];                   // 'm13n10'
        // unhighlight previous selected note
        $('svg #vf-'+editor.selected.note.previousId).colourNote("black");
        // highlight properties on control panel accordingly
        highlightSelectedNoteProperties();
      }
    }
  }, false);

}

jQuery.fn.colourNote = function (colour) {
  Vex.forEach(this.find("*"), function(child) {
    child.setAttribute("fill", colour);
    child.setAttribute("stroke", colour);
  });
  return this;
}

clefDropdown = $("#clef-dropdown").selectBoxIt().data("selectBox-selectBoxIt");  // use fancy theme for select box
$("#clef-dropdown").on("change", function() {
  // see comment in util.js in highlightSelectedMeasureProperties()
  if(!gl_selectBoxChangeOnMeasureSelect) {
    editor.add.clef();
    editor.draw.score();
  }
});

keySigDropdown = $("#keySig-dropdown").selectBoxIt().data("selectBox-selectBoxIt");
$("#keySig-dropdown").on("change", function() {
  // see comment in util.js in highlightSelectedMeasureProperties()
  if(!gl_selectBoxChangeOnMeasureSelect) {
    editor.add.keySignature();
    editor.draw.score();
  }
});

examplesDropdown = $("#examples-dropdown").selectBoxIt().data("selectBox-selectBoxIt");
$("#examples-dropdown").on("change", function() {
  var url = $("#examples-dropdown").val();
  if(url !== 'default')
    loadExample(url);
});

$("#timeSig-button").on("click", function() {
  editor.add.timeSignature();
  // editor.draw.selectedMeasure();
  editor.draw.score();
});

timeSigTop = $("#timeSigTop").selectBoxIt().data("selectBox-selectBoxIt");
timeSigBottom = $("#timeSigBottom").selectBoxIt().data("selectBox-selectBoxIt");

// setting/removing accidental to/from note via radio buttons
$("input:radio[name='note-accidental']").on("click",function() {
  var radio = $(this);

  // get selected note
  var selNote = getSelectedNote();

  // don't set accidental for rest
  if(selNote.isRest()) {
    // uncheck this checked radio button after while
    setTimeout(function() {
      $("input:radio[name='note-accidental']:checked").prop("checked", false);     
    }, 50);
    return;
  }

  // radio already checked, uncheck it
  if(radio.is(".selAcc")) {
    // console.log('uncheck');
    radio.prop("checked",false).removeClass("selAcc");
    editor.delete.accidental();
  }
  // radio unchecked, check it
  else {
    // console.log('check');
    $("input:radio[name='"+radio.prop("name")+"'].selAcc").removeClass("selAcc");
    radio.addClass("selAcc");
    var vexAcc = $(this).prop("value");
    // console.log($(this).prop("value"));
    editor.edit.noteAccidental(vexAcc);
  }
  editor.draw.selectedMeasure();
});

// changing note value(duration)
$("input:radio[name='note-value']").on("change",function() {
  editor.edit.noteDuration();
  editor.draw.selectedMeasure();
});

// toggle notes dot
$("#dotted-checkbox").on("change",function() {
  // console.log('dot checkbox change');
  editor.edit.noteDot();
  editor.draw.selectedMeasure();
});
