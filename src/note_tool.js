/*
 * Project: Concerto
 *   https://github.com/panarch/concerto
 * Code authors:
 *   Taehoon Moon <panarch@kaist.ac.kr>, 2014
 * Licensed under MIT license
 *   https://github.com/panarch/concerto/blob/master/LICENSE
 * Modifications:
 *   function transposeNote created by Thomas Hudziec, 2016
 */

editor.NoteTool = {};

    /**
     * @param {Object} staveNote
     * @param {number} divisions
     * @return {number}
     */
    editor.NoteTool.getDurationFromStaveNote = function getDurationFromStaveNote(staveNote, divisions) {
        var noteType = staveNote.getDuration();
        var numDots;

        if(staveNote.isDotted())
            numDots = staveNote.dots;
        else
            numDots = 0;

        var index = editor.table.NOTE_VEX_TYPES.indexOf(noteType);
        var offset = index - editor.table.NOTE_VEX_QUARTER_INDEX;
        var duration = Math.pow(2, offset) * divisions;
        duration = duration * 2 - duration * Math.pow(2, -numDots);

        return duration;
    };

    function _calculateNoteType(duration, divisions) {
        var i = 0;
        var count;
        var num;
        for (count = 0; count < 20; count++) {
            num = Math.floor(duration / divisions);
            if (num === 1)
                break;
            else if (num > 1) {
                divisions *= 2;
                i++;
            }
            else {
                divisions /= 2;
                i--;
            }
        }

        if (count === 20)
            // TODO throw exception
            console.error('No proper StaveNote type');

        var dots = 0;
        for (count = 0; count < 5; count++) {
            duration -= Math.floor(duration / divisions);
            divisions /= 2;
            num = Math.floor(duration / divisions);
            if (num === 1)
                dots++;
            else
                break;
        }

        return {
            index: i,
            dots: dots
        };
    }

    /**
     * @param {number} duration
     * @param {number} divisions
     * @param {boolean=} withDots
     */
    editor.NoteTool.getStaveNoteTypeFromDuration = function getStaveNoteTypeFromDuration(duration, divisions, withDots) {
        if (withDots === undefined)
            withDots = false;

        var result = _calculateNoteType(duration, divisions);
        var index = editor.table.NOTE_VEX_QUARTER_INDEX + result.index;
        var noteType = editor.table.NOTE_VEX_TYPES[index];

        if (withDots) {
            for (var i = 0; i < result.dots; i++)
                noteType += 'd';
        }

        return noteType;
    };

    editor.NoteTool.getNoteTypeFromDuration = function getNoteTypeFromDuration(duration, divisions) {
        var result = _calculateNoteType(duration, divisions);
        var index = editor.table.NOTE_QUARTER_INDEX + result.index;

        return {
            type: editor.table.NOTE_TYPES[index],
            dot: result.dots
        };
    };

    // transposes note by whole tones
    // example:
    // key: 'c/4'
    // interval: 2
    // return: 'e/4'
    // TODO perform automated testing to proof complete correctness
    // author Thomas Hudziec, 2016
    editor.NoteTool.transposeNote = function transposeNote(key, interval) {
        var step = key[0];
        var octave = +key[key.length - 1];
        var maxInterval = 24;

        if(interval > maxInterval) interval = maxInterval;
        else if(interval < -maxInterval) interval = -maxInterval;

        var mod = editor.table.TONES.length;

        var currentIndex = editor.table.TONES.indexOf(step);
        var shifted = currentIndex + interval;
        var newIndex = shifted % mod;
        if(newIndex < 0) newIndex += mod;
        var newKey = editor.table.TONES[newIndex];

        var octaveShift = shifted / mod;
        octaveShift = Math.floor(octaveShift);
        var newOctave = octave + octaveShift;

        return newKey+'/'+newOctave;
    };
