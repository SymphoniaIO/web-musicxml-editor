/** Web Editor of MusicXML Files
  *
  * (c) Thomas Hudziec, 2016
  * https://github.com/freetomik/web-musicxml-editor
  * MIT license
 */

scoreJson = {
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

uploadedFileName = 'score';

// one <measure> in MusicXML -> one Vex.Flow.Stave
// all of these three arrays below use share same index
// TODO create one object for these global arrays and methods for changes in all of them
gl_VfStaves = [];       // array with currently rendered vexflow measures(Vex.Flow.Stave)
gl_StaveAttributes = [];  // array of attributes for each measure
gl_VfStaveNotes = [];   // array of arrays with notes to corresponding stave in gl_VfStaves
gl_VfVoices = [];       // array of Vex.Flow.Voice objects for check notes duration in measure

editor = {};
editor.svgElem = $("#svg-container")[0];
// editor.renderer = new Vex.Flow.Renderer('svg-container', Vex.Flow.Renderer.Backends.SVG);
editor.renderer = new Vex.Flow.Renderer(editor.svgElem, Vex.Flow.Renderer.Backends.SVG);
editor.ctx = editor.renderer.getContext();    //SVGContext

// some default sizes
editor.staveWidth = 150;
editor.staveHeight = 140;
editor.noteWidth = 40;

editor.mode = "measure";    // measure or note
editor.measureColor = "#428bca";

function initUI() {
  editor.selected = {
    cursorNoteKey: 'b/4',
    measure: {
      id: 'm0',
      previousId: 'm0'
    },
    note: {
      id: 'm0n0',
      previousId: 'm0n0'
    }
  }

  editor.mousePos = {
    current: {
      x: 0,
      y: 0
    },
    previous: {
      x: 0,
      y: 0
    }
  }

  // uncheck checked accidental radio button
  $("input:radio[name='note-accidental']:checked").prop("checked", false);
  // uncheck note-value radio button
  $("input:radio[name='note-value']:checked").prop("checked", false);
  // check whole note radio button
  $("input:radio[name='note-value'][value='w']").prop("checked", true);
  // examples dropdown
  $("#examples-dropdown").val("default");
  // uncheck doted checkbox
  $("#dotted-checkbox").prop("checked", false);
  // set selected clef to treble
  $("#clef-dropdown").val("treble");
  // set selected key signature to C
  $("#keySig-dropdown").val("C");
  // set selected time signature to 4/4
  $("#timeSigTop").val("4");
  $("#timeSigBottom").val("4");

  $("#button-play").prop("disabled", false);
  $("#button-stop").prop("disabled", true);
}
