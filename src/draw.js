editor.draw = {
  // clears svg and draws all measures (whole score) again
  score: function() {
    console.log('draw');

    var canvasWidth = document.getElementById('svg-wrapper').clientWidth;
    var canvasHeight = document.getElementById('svg-wrapper').clientHeight;
    $('#svg-container').attr('width', canvasWidth);

    // to avoid NaNs in svg viewbox:
    // https://groups.google.com/forum/?fromgroups=#!topic/vexflow/RWtqOhQoXMI
    // editor.ctx.svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    // editor.ctx.scale(1, 1);

    // or resize ctx here and also on lines 43 - 49
    // editor.ctx.resize(canvasWidth, canvasHeight);

    // or this:
    // editor.ctx.width = editor.ctx.svg.clientWidth;
    // editor.ctx.height = editor.ctx.svg.clientHeight;
    // editor.ctx.width = canvasWidth;
    // editor.ctx.height = canvasHeight;

    // or this:
    // editor.ctx.svg.style.width = "100%";
    // editor.ctx.svg.style.height = "100%";

    editor.ctx.clear();
    // editor.ctx.svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

    // no cursor note will be displayed
    editor.selected.cursorNoteKey = null;

    // var minWidth = noteWidth * maxLength;
    // var minWidth = editor.noteWidth * 4;

    var attributes = {};
    // var count = 0;
    var staveX = 10, staveY = 0;

    // loop over all measures
    for(var staveIndex = 0; staveIndex < gl_VfStaves.length; staveIndex++) {

      var stave = gl_VfStaves[staveIndex];

      var staveWidth = stave.getWidth();

      // add changes in attributes for current measure to attributes object
      attributes = mergeProperties(attributes, gl_StaveAttributes[staveIndex]);

      // calculate newline
      var staveEnd = staveX + staveWidth;
      if(staveEnd > canvasWidth) {
        staveX = 10;
        staveY = staveY + editor.staveHeight;
        newLine = true;
        // gl_StaveAttributes[staveIndex].isFirstOnLine = true;
      }
      else {
        newLine = false;
        // gl_StaveAttributes[staveIndex].isFirstOnLine = false;
      }

      // gradually extend height of canvas
      // if((staveY + editor.staveHeight) > $('#svg-container').attr('height'))
      //   $('#svg-container').attr('height', staveY + editor.staveHeight);

      // if one measure is wider than canvas(e.g. in Chant.xml), extend canvas
      if(staveWidth > $('#svg-container').attr('width')) {
        $('#svg-container').attr('width', staveWidth);
        // editor.ctx.width = staveWidth;
        // editor.ctx.resize(staveWidth, canvasHeight);
      }

      // set height of canvas after last rendered measure
      if(staveIndex == gl_VfStaves.length - 1) {
        $('#svg-container').attr('height', staveY + editor.staveHeight);
        // editor.ctx.height = staveY + editor.staveHeight;
        // editor.ctx.resize(canvasWidth, staveY + editor.staveHeight);
      }

      // set position and width of stave
      stave.setX(staveX);
      stave.setY(staveY);
      // if measure doesn't have its own width(set as attribute in xml)
      // if(stave.getWidth() == editor.staveWidth)
      //   stave.setWidth(staveWidth);
      // else
        // staveWidth = stave.getWidth();

      // set rendering context for stave
      stave.setContext(editor.ctx);

      // clef and key signature must be rendered on every first measure on new line
      if(newLine === true || staveIndex === 0) {
        stave.setClef(attributes.vfClef);
        stave.setKeySignature(attributes.vfKeySpec);
        if(!newLine && attributes.vfTimeSpec) stave.setTimeSignature(attributes.vfTimeSpec);
        // number of accidentals in key signature
        var numOfAcc = editor.table.SHARP_MAJOR_KEY_SIGNATURES.indexOf(attributes.vfKeySpec) + 1;
        if(!numOfAcc)
          numOfAcc = editor.table.FLAT_MAJOR_KEY_SIGNATURES.indexOf(attributes.vfKeySpec) + 1;

        // extend width of measure with clef | keysig | timesig
        staveWidth = attributes.vfStavewidth;
        stave.setWidth(staveWidth);
      }
      // remove clef and key signature when not newline
      else {
        // vexflow extension
        stave.removeClef();
        stave.removeKeySignature();
      }


      editor.draw.measure(staveIndex, false);

      // set start x position for next measure
      staveX = staveX + staveWidth;

    } // loop over measures

    // highlight selected note
    if(editor.mode === 'note')
      $('svg #vf-'+editor.selected.note.id).colourNote("red");

  },




  // removes particular measure(stave) from svg and draws it again
  measure: function(drawnMeasureIndex, cursorNoteEnabled) {
    // $('#vf-mg'+drawnMeasureIndex).empty();
    $('#vf-m'+drawnMeasureIndex).remove();

    var stave = gl_VfStaves[drawnMeasureIndex];

    // set stave properties
    var clef = gl_StaveAttributes[drawnMeasureIndex].vfClef;
    if(clef) stave.setClef(clef);
    var keySig = gl_StaveAttributes[drawnMeasureIndex].vfKeySpec;
    if(keySig) stave.setKeySignature(keySig);
    var timeSig = gl_StaveAttributes[drawnMeasureIndex].vfTimeSpec;
    if(timeSig) stave.setTimeSignature(timeSig);

    // svg stave(=measure) group
    editor.ctx.openGroup("stave", "m"+drawnMeasureIndex, {pointerBBox: true});
      // draw stave
      stave.draw();

      // create svg <rect> element exactly overlapping stave for stave selection and highlight
      editor.ctx.rect(stave.getX(),
                      stave.y,
                      stave.getWidth(),
                      editor.staveHeight,
                      {
                        'class': 'measureRect',
                        'id': 'm'+drawnMeasureIndex,
                        'fill': 'transparent'
                      }
                    );

      // find time signature in Attributes for current Measure
      var beats = 4, beat_type = 4;
      for(var a = drawnMeasureIndex; a >= 0; a--) {
        // finds attributes of closest previous measure or current measure
        if(! $.isEmptyObject(gl_StaveAttributes[a]) && gl_StaveAttributes[a].vfTimeSpec) {
          var timeSplitted = gl_StaveAttributes[a].vfTimeSpec.split('/');
          beats = timeSplitted[0];
          beat_type = timeSplitted[1];
          break;
        }
      }

      var voice = new Vex.Flow.Voice({
          num_beats: beats,
          beat_value: beat_type,
          resolution: Vex.Flow.RESOLUTION
        });

      voice.setStrict(false);    //TODO: let it be strict for check notes duration in measure

      voice.addTickables(gl_VfStaveNotes[drawnMeasureIndex]);

      //https://github.com/0xfe/vexflow/wiki/Automatic-Beaming:
      var beams = new Vex.Flow.Beam.generateBeams(gl_VfStaveNotes[drawnMeasureIndex], {
        groups: [new Vex.Flow.Fraction(beats, beat_type)]
      });

      var selMeasureIndex = getSelectedMeasureIndex();
      var selNoteIndex = getSelectedNoteIndex();
      var selVFStaveNote = gl_VfStaveNotes[selMeasureIndex][selNoteIndex];

      // draw the cursor note, if drawing selected measure and cursor note is enabled
      if(editor.mode === 'note' && +selMeasureIndex === drawnMeasureIndex && cursorNoteEnabled) {
        var noteValue = getRadioValue('note-value');
        var dot = $('#dotted-checkbox').is(":checked") ? 'd' : '';
        // get note properties
        // var noteValue = selVFStaveNote.getDuration();     //w, h, q, 8, 16
        // var dot = selVFStaveNote.isDotted() ? 'd' : '';

        // create cursor note
        var cursorNote = new Vex.Flow.StaveNote({
          keys: [editor.selected.cursorNoteKey],
          duration: noteValue + dot,
          auto_stem: true
        });
        // console.log(cursorNote);
        if(dot === 'd') cursorNote.addDotToAll();

        cursorNote.setStave(stave);

        // create separate voice for cursor note
        var cursorNoteVoice = new Vex.Flow.Voice({
            num_beats: beats,
            beat_value: beat_type,
            resolution: Vex.Flow.RESOLUTION
          });
        cursorNoteVoice.setStrict(false);
        cursorNoteVoice.addTickables([cursorNote]);

        new Vex.Flow.Formatter()
          .joinVoices([voice, cursorNoteVoice])
          .format([voice, cursorNoteVoice], stave.getWidth() * 0.8);

        // cursor note is only note in its voice, so it is on place of the very first note
        // we need to shift it to selected note x position
        var xShift = selVFStaveNote.getX();
        // shift back by width of accidentals on left side of first note in measure
        xShift -= gl_VfStaveNotes[drawnMeasureIndex][0].getMetrics().modLeftPx;
        cursorNote.setXShift(xShift);

        cursorNoteVoice.draw(editor.ctx, stave);
      }
      // measure mode, no cursor note
      else {
        // format and justify the notes to 80% of staveWidth
        new Vex.Flow.Formatter()
          .joinVoices([voice])
          .format([voice], stave.getWidth() * 0.8);
        // also exists method formatToStave()...
        // but it is rather helper function I guess, like FormatAndDraw() in Voice
      }

      // draw normal voice always
      voice.draw(editor.ctx, stave);

      beams.forEach(function(beam) {
        beam.setContext(editor.ctx).draw();
      });

      // mouse events listeners on <rect> for selecting measures
      if(editor.mode === 'measure') {
        $('svg .measureRect#m'+drawnMeasureIndex).each(function() {
          attachListenersToMeasureRect($(this));
        });
        // highlight selected measure
        if(drawnMeasureIndex === selMeasureIndex)
          $('svg .measureRect#m'+selMeasureIndex)
            .css({'fill': editor.measureColor, 'opacity': '0.4'});
      }

      // if last note is behind width of stave, extend stave
      // var lastNoteX = gl_VfStaveNotes[m][gl_VfStaveNotes[m].length - 1].getNoteHeadEndX();
      // if((lastNoteX - stave.getX()) > staveWidth) {
      //   console.log('stave['+m+'] extended, lastNoteX: '+lastNoteX+'staveWidth: '+staveWidth);
      //   stave.setWidth(lastNoteX + 10);
      //   stave.draw();
      // }
      // TODO rather create function calculateStaveWidth(stave())

    // svg measure group
    editor.ctx.closeGroup();

    // adding event listeners to note objects
    for(var n = 0; n < gl_VfStaveNotes[drawnMeasureIndex].length; n++){
      // adding listeners for interactivity: (from vexflow stavenote_tests.js line 463)
      // item is svg group: <g id="vf-m1n3" class="vf-stavenote">
      var item = gl_VfStaveNotes[drawnMeasureIndex][n].getElem();
      attachListenersToNote(item);
      // var noteBBox = gl_VfStaveNotes[drawnMeasureIndex][n].getBoundingBox();
      // noteBBox.draw(editor.ctx);
    }

  },

  selectedMeasure: function(cursorNoteEnabled) {
    var measureIndex = getSelectedMeasureIndex();

    console.log('redraw measure['+measureIndex+']');

    editor.draw.measure(measureIndex, cursorNoteEnabled);

    // highlight selected note
    if(editor.mode === 'note')
      $('svg #vf-'+editor.selected.note.id).colourNote("red");
  }

}
