/**
 * Web Editor of MusicXML Files
 *
 * (c) Thomas Hudziec, 2016
 * https://github.com/freetomik/web-musicxml-editor
 * MIT license
 */

// Initialize the score object.
var scoreJson = {
  'score-partwise': {
    '@version': '3.0',
    'part-list': {
      'score-part': {
        '@id': 'P1',
        'part-name': {}
      }
    },
    part: [
      {
        '@id': 'P1',
        measure: [
          {
            '@number': 1,
            // '@width': 150,
            attributes: {
              divisions: 4,
              key: {
                fifths: 0,
                mode: 'major'
              },
              time: {
                beats: 4,
                'beat-type': 4
              },
              clef: {
                sign: 'G',
                line: 2
              }
            },
            note: [
              {
                rest: null,
                duration: 16
              }
            ]
          }
        ]
      }
    ]
  }
};

// Default file name.
var uploadedFileName = 'score';

// one <measure> in MusicXML -> one Vex.Flow.Stave
// all of these three arrays below use share same index
var gl_VfStaves        = []; // array with currently rendered vexflow measures(Vex.Flow.Stave)
var gl_StaveAttributes = []; // array of attributes for each measure
var gl_VfStaveNotes    = []; // array of arrays with notes to corresponding stave in gl_VfStaves

var editor = {};
editor.svgElem = $("#svg-container")[0];
// editor.renderer = new Vex.Flow.Renderer('svg-container', Vex.Flow.Renderer.Backends.SVG);
editor.renderer = new Vex.Flow.Renderer(editor.svgElem, Vex.Flow.Renderer.Backends.SVG);
editor.ctx = editor.renderer.getContext(); //SVGContext

// TODO: Consider moving these to table.js as Constants
editor.staveWidth  = 150;
editor.staveHeight = 140;
editor.noteWidth   = 40;

// TODO: Use an enum approach to mode,
// as many comparisons are made and an enum approach would be more efficient.
// https://stijndewitt.com/2014/01/26/enums-in-javascript/
editor.mode = ""; // measure or note

/*
 * Initialize the window upon loading the page.
 */
function initUI() {
  console.log("[INFO] Initializing UI...")
  editor.selected = {
    cursorNoteKey: editor.table.DEFAULT_REST_PITCH,
    measure: {
      id: 'm0',
      previousId: 'm0'
    },
    note: {
      id: 'm0n0',
      previousId: 'm0n0'
    }
  };

  editor.mousePos = {
    current: {
      x: 0,
      y: 0
    },
    previous: {
      x: 0,
      y: 0
    }
  };

  // uncheck checked accidental radio button
  $("input:radio[name='note-accidental']:checked").prop("checked", false);
  // uncheck note-value radio button
  $("input:radio[name='note-value']:checked").prop("checked", false);
  // check whole note radio button
  $("input:radio[name='note-value'][value='w']").prop("checked", true);
  // uncheck dotted checkbox
  $("#dotted-checkbox").prop("checked", false);

  $("#button-play").prop("disabled", false);
  $("#button-stop").prop("disabled", true);

  editor.parse.all();
  switchToNoteMode();
  editor.draw.score();
}
