/*
performs transformation from scoreJson to gl_VfStaves[] and gl_VfStaveNotes[]
prepares gl_VfStaves[] and gl_VfStaveNotes[] for editor.draw.score() function
*/
editor.parse = {
  all: function() {
    console.log('parse');
    // clear global arrays
    gl_VfStaves = [];
    gl_VfStaveNotes = [];
    gl_StaveAttributes = [];

    var vfStave;
    // loop over all <measures>(MusicXML measures) and make Vex.Flow.Staves from them
    for(var i = 0; i < scoreJson["score-partwise"].part[0].measure.length; i++) {
      vfStave = editor.parse.attributes(i);

      vfStave = editor.parse.measure(scoreJson["score-partwise"].part[0].measure[i], i, vfStave);

      // push measure to global array, draw() will read from it
      gl_VfStaves.push(vfStave);
    }
  },

  measure: function(measure, index, vfStave) {
    var vfStaveNote, vfStaveNotesPerMeasure = [];
    if(measure.note) {
      // loop over all notes in measure
      for(var i = 0; i < measure.note.length; i++) {
        vfStaveNote = editor.parse.note(measure.note[i], index, i);
        vfStaveNotesPerMeasure.push(vfStaveNote);
      }
      gl_VfStaveNotes.push(vfStaveNotesPerMeasure);
      // width of measure directly proportional to number of notes
      vfStave.setWidth(vfStaveNotesPerMeasure.length * editor.noteWidth);
      if(vfStave.getWidth() < editor.staveWidth)
        vfStave.setWidth(editor.staveWidth);
    }
    else    // measure doesn't have notes
      gl_VfStaveNotes.push([]);

    if(measure['@width']) {
      // in MusicXML measure width unit is one tenth of interline space
      vfStave.setWidth(measure['@width'] * (vfStave.getSpacingBetweenLines() / 10));
    }

    return vfStave;
  },

  attributes: function(measureIndex) {
    var xmlAttributes = scoreJson["score-partwise"].part[0].measure[measureIndex]['attributes'] || {};

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

    // create one Vex.Flow.Stave, it corresponds to one <measure>
    var vfStave = new Vex.Flow.Stave(0, 0, editor.staveWidth);

    // setting attributes for measure
    if(! $.isEmptyObject(xmlAttributes)) {

      if(xmlAttributes.clef) {
        if($.isArray(xmlAttributes.clef)) {
          console.warn("Multiple clefs for measure currently not supported.");
          var clef = xmlAttributes.clef[0];
        }
        else
          var clef = xmlAttributes.clef;

        staveAttributes.xmlClef = clef.sign + '/' + clef.line;
        staveAttributes.vfClef = editor.table.CLEF_TYPE_DICT[staveAttributes.xmlClef];
        vfStave.setClef(staveAttributes.vfClef);  
        vfStave.setWidth(vfStave.getWidth() + 80);
        // editor.currentClef = vfClefType;
      }

      if(xmlAttributes.key) {
        if(xmlAttributes.key.hasOwnProperty('fifths')) {
          var fifths = +xmlAttributes.key.fifths;
          if(fifths === 0)
            keySpec = 'C';
          else if(fifths > 0)
            keySpec = editor.table.SHARP_MAJOR_KEY_SIGNATURES[fifths - 1];
          else
            keySpec = editor.table.FLAT_MAJOR_KEY_SIGNATURES[-fifths - 1];
          vfStave.setKeySignature(keySpec);
          vfStave.setWidth(vfStave.getWidth() + (Math.abs(fifths) * 30));
          staveAttributes.vfKeySpec = keySpec;
          staveAttributes.xmlFifths = fifths;
          // editor.currentKeySig = keySpec;
        }
      }

      if(xmlAttributes.time) {
        if($.isArray(xmlAttributes.time)) {
          console.warn("Multiple pairs of beats and beat-type elements in time signature not supported.");
          var time = xmlAttributes.time[0];
        }
        else
          var time = xmlAttributes.time;

        var timeSpec = time.beats + '/' + time['beat-type'];
        vfStave.setTimeSignature(timeSpec);
        vfStave.setWidth(vfStave.getWidth() + 80);
        staveAttributes.vfTimeSpec = timeSpec;
        // editor.currentTimeSig = timeSpec;
      }

      if(xmlAttributes.divisions) {
        staveAttributes.xmlDivisions = xmlAttributes.divisions;
      }

    }

    // push attributes to global array
    gl_StaveAttributes.push(staveAttributes);

    return vfStave;
  },

  note: function(note, measureIndex, noteIndex) {
    var rest = '', step = '', oct = '', dot = '', vfAcc = '';
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
      if(note.rest && note.rest['@measure'] === 'yes')
        staveNoteDuration = 'w';
    }
    else if(note.pitch) {
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

    // get current clef
    var currentClef = getCurAttrForMeasure(measureIndex, 'vfClef');

    var vfStaveNote = new Vex.Flow.StaveNote({
      keys: [step+vfAcc+'/'+oct],
      duration: staveNoteDuration+rest,
      clef: rest === '' ? currentClef : 'treble',
      auto_stem: true
    });

    // console.log(vfStaveNote.getKeys().toString()+' '+staveNoteDuration);

    // set id for note DOM element in svg
    vfStaveNote.setAttribute('id', 'm' + measureIndex + 'n' + noteIndex);
    // or use setId function on line 20773 in vexflow-debug.js

    // set accidental
    if(vfAcc !== '')
      vfStaveNote.addAccidental(0, new Vex.Flow.Accidental(vfAcc));

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