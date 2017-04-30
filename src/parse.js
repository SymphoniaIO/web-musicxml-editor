/*
 * Performs transformation from scoreJson to gl_VfStaves[] and gl_VfStaveNotes[]
 * Prepares gl_VfStaves[] and gl_VfStaveNotes[] for editor.draw.score() function
 */
editor.parse = {
  /**
   * Transform all MusicXML <measures> into Vex.Flow.Staves.
   */
  all: function() {
    console.log('[INFO] Parsing all...');

    gl_VfStaves        = [];
    gl_VfStaveNotes    = [];
    gl_StaveAttributes = [];

    var vfStave;
    var numMeasures = scoreJson["score-partwise"].part[0].measure.length;
    for(var staveIndex = 0; staveIndex < numMeasures; staveIndex++) {
      vfStave = editor.parse.attributes(staveIndex);
      console.log('[DEBUG] Current vfStave width after setting attributes: ' + vfStave.getWidth());
      vfStave = editor.parse.measure(scoreJson["score-partwise"].part[0].measure[staveIndex], staveIndex, vfStave);
      console.log('[DEBUG] Current vfStave width after setting measure: ' + vfStave.getWidth());

      // Push measure to global array, draw() will read from it
      gl_VfStaves.push(vfStave);
    }
  },

  /**
   * Create and initialize a new Vex.Flow.Stave
   * with attributes provided by the MusicXML measure.
   *
   * @return Vex.Flow.Stave
   */
  attributes: function(measureIndex) {
    console.log('[INFO] Parsing attributes...');
    var xmlAttributes = scoreJson["score-partwise"].part[0].measure[measureIndex]['attributes'] || {};
    var attribWidth = 0;

    var staveAttributes = {
      // intentionally commented, by default is this object empty
      // just to show which properties object may contain
      // xmlClef: '',
      // vfClef: '',
      // xmlFifths: 0,
      // xmlDivisions: 4,
      // vfKeySpec: '',
      // vfTimeSpec: ''
    };

    // Create one Vex.Flow.Stave, it corresponds to one <measure>
    var vfStave = new Vex.Flow.Stave(0, 0, editor.staveWidth);

    // Set attributes for current measure if they exist
    if(!$.isEmptyObject(xmlAttributes)) {

      // Setting clef
      if(xmlAttributes.clef) {
        var clef;
        if($.isArray(xmlAttributes.clef)) {
          console.warn("[WARN] Multiple clefs for measure currently not supported.");
          clef = xmlAttributes.clef[0];
        } else {
          clef = xmlAttributes.clef;
        }

        staveAttributes.xmlClef = clef.sign + '/' + clef.line;
        staveAttributes.vfClef = editor.table.CLEF_TYPE_DICT[staveAttributes.xmlClef];
        vfStave.setClef(staveAttributes.vfClef);
        attribWidth += 40;
        // editor.currentClef = vfClefType;
      }

      // Setting key signature
      if(xmlAttributes.key) {
        var keySpec;
        if(xmlAttributes.key.hasOwnProperty('fifths')) {
          var fifths = +xmlAttributes.key.fifths;
          if(fifths === 0) {
            keySpec = 'C';
          } else if(fifths > 0) {
            keySpec = editor.table.SHARP_MAJOR_KEY_SIGNATURES[fifths - 1];
          } else {
            keySpec = editor.table.FLAT_MAJOR_KEY_SIGNATURES[-fifths - 1];
          }
          vfStave.setKeySignature(keySpec);
          attribWidth += Math.abs(fifths) * 10;
          staveAttributes.vfKeySpec = keySpec;
          staveAttributes.xmlFifths = fifths;
          // editor.currentKeySig = keySpec;
        }
      }

      // Setting time signature
      if(xmlAttributes.time) {
        var time;
        if($.isArray(xmlAttributes.time)) {
          console.warn("[WARN] Multiple pairs of beats and beat-type elements in time signature not supported.");
          time = xmlAttributes.time[0];
        } else {
          time = xmlAttributes.time;
        }

        var timeSpec = time.beats + '/' + time['beat-type'];
        vfStave.setTimeSignature(timeSpec);
        attribWidth += 40;
        staveAttributes.vfTimeSpec = timeSpec;
        // editor.currentTimeSig = timeSpec;
      }

      // Setting divisions
      if(xmlAttributes.divisions) {
        staveAttributes.xmlDivisions = xmlAttributes.divisions;
      }

      // Setting stave width
      console.log('[DEBUG] Total attribute width: ' + attribWidth);
      vfStave.setWidth(vfStave.getWidth() + attribWidth);
    }

    // push attributes to global array
    gl_StaveAttributes.push(staveAttributes);
    console.log('[DEBUG] Current stave attributes...\n' + JSON.stringify(gl_StaveAttributes, null, 2));

    return vfStave;
  },

  /**
   * Transform a MusicXML measure into a vfStave.
   *
   * @return Vex.Flow.Stave
   */
  measure: function(measure, staveIndex, vfStave) {
    console.log('[INFO] Parsing measure...');
    var vfStaveNote;
    var vfStaveNotesPerMeasure = [];

    if(measure.note) {
      // Loop over all notes in measure
      var length = measure.note.length;
      for(var noteIndex = 0; noteIndex < length; noteIndex++) {
        vfStaveNote = editor.parse.note(measure.note[noteIndex], staveIndex, noteIndex);
        vfStaveNotesPerMeasure.push(vfStaveNote);
      }
      // Push notes to global array
      gl_VfStaveNotes.push(vfStaveNotesPerMeasure);

      // Width of measure directly proportional to number of notes
      var propWidth = vfStaveNotesPerMeasure.length * editor.noteWidth;

      if(vfStave.getWidth() < propWidth) {
        vfStave.setWidth(propWidth);
      }
    } else { // TODO a rest is a note, so will this ever trigger?
      // Measure doesn't have notes
      console.log('[DEBUG] Measure contains no notes...');
      gl_VfStaveNotes.push([]);
    }

    // TODO This should eventually be replaced with our own optimizing proportions
    if(measure['@width']) {
      console.log('[DEBUG] Measure contains width attribute. Current vfStave width: ' + vfStave.getWidth());
      // In MusicXML, measure width unit is one tenth of interline space
      vfStave.setWidth((measure['@width'] * (vfStave.getSpacingBetweenLines()) / 10));
    }

    return vfStave;
  },

  /**
   * Transform a MusicXML note into a vfStaveNote.
   *
   * @return Vex.Flow.Stave.Note
   */
  note: function(note, measureIndex, noteIndex) {
    console.log('[INFO] Parsing note...');
    var rest  = '';
    var step  = '';
    var oct   = '';
    var dot   = '';
    var vfAcc = '';

    // get MusicXML divisions from attributes for current measure
    var divisions = 4;
    // for(var i = 0; i <= measureIndex; i++) {
    //   if(gl_StaveAttributes[i].xmlDivisions !== undefined)
    //     divisions = gl_StaveAttributes[i].xmlDivisions;
    // }
    divisions = getCurAttrForMeasure(measureIndex, 'xmlDivisions');

    // get note length from divisions and duration
    var staveNoteDuration =
      editor.NoteTool.getStaveNoteTypeFromDuration(note.duration, divisions);
      // to get also dots, add third argument to function - true
      // but currently dots calculating algorithm doesn't work correctly
      // and dot is taken from <dot/> element

    // console.log(step+'/'+oct+', '+'divisions:'+divisions
    //   +', '+'duration:'+note.duration+' -> '+staveNoteDuration);

    // rest is empty element in MusicXML, to json it is converted as {rest: null}
    if(note.hasOwnProperty('rest')) {
      rest = 'r';
      // key = editor.table.DEFAULT_REST_PITCH;
      step = 'b';
      oct = '4';
      // whole measure rest
      if(note.rest && note.rest['@measure'] === 'yes') {
        staveNoteDuration = 'w';
      }
    } else if(note.pitch) {
      // key = note.pitch.step.toLowerCase() + '/' + note.pitch.octave;
      step = note.pitch.step.toLowerCase();
      oct = note.pitch.octave;
      // since this project is yet not interested in how note sounds,
      // alter element is not needed; accidental is read from accidental element
      // TODO: parse also alter element and save it, we are playing also now
    }

    if(note.accidental) {
      // accidental element can have attributes
      var mXmlAcc = (typeof note.accidental === 'string')
                  ? note.accidental
                  : note.accidental['#text'];
      vfAcc = editor.table.ACCIDENTAL_DICT[mXmlAcc];
    }

    var currentClef = getCurAttrForMeasure(measureIndex, 'vfClef');

    var vfStaveNote = new Vex.Flow.StaveNote({
      keys: [step+vfAcc+'/'+oct],
      duration: staveNoteDuration+rest,
      clef: (rest === '') ? currentClef : editor.table.DEFAULT_CLEF,
      auto_stem: true
    });

    // console.log(vfStaveNote.getKeys().toString()+' '+staveNoteDuration);

    // set id for note DOM element in svg
    vfStaveNote.setId('m'+measureIndex+'n'+noteIndex);

    // set accidental
    if(vfAcc !== '') {
      vfStaveNote.addAccidental(0, new Vex.Flow.Accidental(vfAcc));
    }

    // // set dots with dots calculated from duration and divisions
    // var dotsArray = staveNoteDuration.match(/d/g);
    // // how many dots, format of vf duration: 'hdd' - half note with 2 dots
    // if(dotsArray) {
    //   dots = dotsArray.length;
    //   for(var i = 0; i < dots; i++) {
    //     vfStaveNote.addDotToAll();
    //   }
    // }

    // currently support for only one dot
    // to support more dots, xml2json.js needs to be changed -
    // (or use this improved one: https://github.com/henrikingo/xml2json)
    // - currently it is eating up more dots:
    // e.g. from <dot/><dot/><dot/> it makes only one {dot: null}
    if(note.hasOwnProperty('dot')) {
      vfStaveNote.addDotToAll();
      // console.log('dot');
    }

    return vfStaveNote;
  }
}
