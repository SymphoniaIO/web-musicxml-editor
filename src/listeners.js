// Redraw whole score when window resizes
var debouncedResize = null;
$(window).resize(function() {
  if (! debouncedResize)
    debouncedResize = setTimeout(function() {
      editor.draw.score();
      debouncedResize = null;
    }, 50);
});
// $(window).resize(editor.draw.score);

// Listeners for highlighting measures
function attachListenersToMeasureRect($measureRectElem) {
  // Base case: Measure has already been assigned handlers
  if($measureRectElem.data('handlers-added')) {
    return true;
  }
  $measureRectElem.data('handlers-added', true);

  $measureRectElem.on('click', function selectMeasure() {
    console.log("[DEBUG] Selected measure " + this.id);
    // Only select an unselected measure
    if(editor.selected.measure.id !== this.id) {
      editor.selected.measure.previousId = editor.selected.measure.id;
      editor.selected.note.previousId    = editor.selected.note.id;
      editor.selected.measure.id = this.id;
      editor.selected.note.id    = this.id + 'n0';

      $('svg .measureRect#'+editor.selected.measure.previousId)
        .removeClass('highlightedMeasure');
      $('svg .measureRect#'+editor.selected.measure.id)
        .removeClass('hoveredMeasure');
      $('svg .measureRect#'+editor.selected.measure.id)
        .addClass('highlightedMeasure');

      highlightSelectedMeasureProperties();
    }
  });

  $measureRectElem.on('mouseenter mouseleave', function hover() {
    if(editor.selected.measure.id !== this.id) {
      $(this).toggleClass('hoveredMeasure');
    }
  });
}

// Listeners for highlighting notes
function attachListenersToNote(noteElem) {
  noteElem.addEventListener("mouseover", function() {
    // if editor is in mode for working with notes
    if(editor.mode === 'note') {
      // don't change colour of already selected note
      if(editor.selected.note.id !== this.id.split('-')[1]) {
        // change colour for each note parts - stem, head, dot, accidental...
        $(this).colourNote("orange");
      }
    }
  }, false);

  noteElem.addEventListener("mouseout", function() {
    if(editor.mode === 'note') {
      if(editor.selected.note.id !== this.id.split('-')[1]) {
        $(this).colourNote("black");
      }
    }
  }, false);

  noteElem.addEventListener("click", function selectNote() {
    if(editor.mode === 'note') {
      // if it is not second click on already selected note
      console.log('[DEBUG] ' + this.id);
      if(editor.selected.note.id !== this.id.split('-')[1]) {
        $(this).colourNote("red");
        // save currently selected id to previous
        editor.selected.measure.previousId = editor.selected.measure.id;
        editor.selected.note.previousId = editor.selected.note.id;
        // format of id: id='vf-m13n10' - eleventh note in fourteenth measure(indexing from 0)
        var mnId = this.id;
        // save id of newly selected note
        editor.selected.measure.id = mnId.split('-')[1].split('n')[0];  // 'm13'
        editor.selected.note.id    = mnId.split('-')[1];                // 'm13n10'
        // unhighlight previous selected note
        $('svg #vf-'+editor.selected.note.previousId).colourNote("black");
        // highlight properties on control panel accordingly
        highlightSelectedNoteProperties();
      }
    }
  }, false);
}

jQuery.fn.colourNote = function (colour) {
  // TODO: Fix universal selector. Use .children()?
  Vex.forEach(this.find("*"), function(child) {
    child.setAttribute("fill", colour);
    child.setAttribute("stroke", colour);
  });
  return this;
}

$("#clef-dropdown").on("change", function() {
  // see comment in util.js in highlightSelectedMeasureProperties()
  if(!gl_selectBoxChangeOnMeasureSelect) {
    console.log("[INFO] Changing the clef...");
    editor.add.clef();
    editor.parse.all();
    editor.draw.score();
  }
});

$("#keySig-dropdown").on("change", function() {
  // see comment in util.js in highlightSelectedMeasureProperties()
  if(!gl_selectBoxChangeOnMeasureSelect) {
    console.log("[INFO] Changing the key signature...");
    editor.add.keySignature();
    editor.parse.all();
    editor.draw.score();
  }
});

$("#timeSig-button").on("click", function() {
  console.log("[INFO] Changing the time signature...");
  editor.add.timeSignature();
  // editor.draw.selectedMeasure();
  editor.draw.score();
});

$("#examples-dropdown").selectBoxIt();
$("#examples-dropdown").on("change", function() {
  console.log("[INFO] Selecting an example...");
  var url = $(this).val();
  if(url !== 'default')
    loadExample(url);
});

// setting/removing accidental to/from note via radio buttons
// TODO Bugfix, select an accidental for a note with no accidental, then
// select the same accidental for another note with no accidental.
$("input:radio[name='note-accidental']").on("click",function() {
  var $radio = $(this);

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
  if($radio.is(".selAcc")) {
    // console.log('uncheck');
    $radio.prop("checked",false).removeClass("selAcc");
    editor.delete.accidental();
  }
  // radio unchecked, check it
  else {
    // console.log('check');
    $("input:radio[name='"+$radio.prop("name")+"'].selAcc").removeClass("selAcc");
    $radio.addClass("selAcc");
    var vexAcc = $(this).prop("value");
    // console.log($(this).prop("value"));
    // TODO Does not use editor.add.accidental, which means JSON does not get affected.
    editor.edit.noteAccidental(vexAcc);
  }
  editor.draw.selectedMeasure();
});

// changing note value(duration)
$("input:radio[name='note-value']").on("change",function() {
  editor.edit.noteDuration();
  editor.draw.selectedMeasure();
});

// call is already in HTML
// toggle notes dot
// $("#dotted-checkbox").on("change",function() {
//   console.log('dot checkbox change');
//   editor.edit.noteDot();
//   editor.draw.selectedMeasure();
// });

/*
 * Testing Keyboard Events
 */
$("body").on("keydown", function(e) {
  // if (e.metaKey || e.ctrlKey) {
  //   if(e.keyCode === 219) {
  //     e.preventDefault();
  //     switchToMeasureMode();
  //   } else if(e.keyCode === 221) {
  //     e.preventDefault();
  //     switchToNoteMode();
  //   }
  // }

  if (editor.mode === 'note') {
    switch (e.keyCode) {
      case 38:
        e.preventDefault();
        console.log("[DEBUG] Up: " + e.keyCode);
        if(e.metaKey) {
          moveNote(7);
        } else {
          moveNote(1);
        }
        break;
      case 40:
        e.preventDefault();
        console.log("[DEBUG] Down: " + e.keyCode);
        if(e.metaKey) {
          moveNote(-7);
        } else {
          moveNote(-1);
        }
        break;
    }
  } else if (editor.mode === 'measure') {
    switch (e.keyCode) {
      case 37:
        e.preventDefault();
        console.log("[DEBUG] Left: " + e.keyCode);
        moveMeasure(-1);
        break;
      case 39:
        e.preventDefault();
        console.log("[DEBUG] Right: " + e.keyCode);
        moveMeasure(1);
        break;
    }
  }
});
