/*
Vex.Flow.Stave extensions
author:
  Tomas Hudziec, 2016
inspiration from:
  https://github.com/andrebakker/VexUI/blob/master/src/VexFlowExtension.js
  by Andre Bakker, MIT license
*/

Vex.Flow.Stave.prototype.getModifierIndex = function(constructor){
  if(this.modifiers)
    for(var i = 0; i < this.modifiers.length; i++)
      if(this.modifiers[i] instanceof constructor)
        return i;
  return -1;
}

Vex.Flow.Stave.prototype.removeClef = function(){
  var clefs = this.getModifiers(Vex.Flow.StaveModifier.Position.BEGIN, Vex.Flow.Clef.category);
  if(clefs.length === 0)
    return;
  if(this.getModifierIndex(Vex.Flow.Clef) !== -1) {
    this.modifiers.splice(this.getModifierIndex(Vex.Flow.Clef), 1);
    // set default stave clef
    this.clef = "treble";
  }
}

Vex.Flow.Stave.prototype.removeKeySignature = function(){
  var keySignatures = this.getModifiers(Vex.Flow.StaveModifier.Position.BEGIN,
                                        Vex.Flow.KeySignature.category);
  if(keySignatures.length === 0)
    return;
  this.modifiers.splice(this.getModifierIndex(Vex.Flow.KeySignature), 1);
}

Vex.Flow.Stave.prototype.removeTimeSignature = function(){
  var timeSignatures = this.getModifiers(Vex.Flow.StaveModifier.Position.BEGIN,
                                        Vex.Flow.TimeSignature.category);
  if(timeSignatures.length === 0)
    return;
  this.modifiers.splice(this.getModifierIndex(Vex.Flow.TimeSignature), 1);
}

Vex.Flow.StaveNote.prototype.getModifierIndex = function(constructor){
  if(this.modifiers)
    for(var i = 0; i < this.modifiers.length; i++)
      if(this.modifiers[i] instanceof constructor)
        return i;
  return -1;
}

Vex.Flow.StaveNote.prototype.removeAccidental = function(){
  var accidentals = this.getAccidentals();
  if(accidentals && accidentals.length === 0)
    return;
  this.modifiers.splice(this.getModifierIndex(Vex.Flow.Accidental), 1);
}

Vex.Flow.StaveNote.prototype.setAccidental = function(i, accidental){
  var accidentals = this.getAccidentals();
  if(accidentals && accidentals.length !== 0)
    this.removeAccidental();

  this.addAccidental(i, accidental);
}

// sets one dot to StaveNote if it doesn't have any
Vex.Flow.StaveNote.prototype.setDot = function(){
  if(!this.isDotted()) {
    this.addDotToAll();
  }
}

// removes one dot from StaveNote
Vex.Flow.StaveNote.prototype.removeDot = function(){
  if(this.isDotted()) {
    this.dots = 0;
    this.modifiers.splice(this.getModifierIndex(Vex.Flow.Dot), 1);
  }
}


// for MIDI playback

Vex.Flow.StaveNote.prototype.getPlayEvents = function(playInfo){
  //Prepare the notes to be sent
  var notes = [];

  for(var i = 0; i < this.keys.length; i++){
    notes.push(MIDI.keyToNote[this.keys[i].replace('/','').toUpperCase()]);
  }

  //Set clef offset for notes
  for (var i = 0; i < notes.length; i++) {
    notes[i] += editor.MidiClefOffsets[playInfo.clef];
  };

  var keyPressTime = playInfo.defaultTime / editor.table.DURATION_DICT[this.duration];

  //Set the modifiers for this note (update note value)
  for (var i = 0; i < this.modifiers.length; i++) {
    var modifier = this.modifiers[i];
    if(modifier instanceof Vex.Flow.Accidental){
      var modValue;

      switch(modifier.type){
        case "bb":
        modValue = -2;
        break;
        case "b":
        modValue = -1;
        break;
        case "n":
        modValue = 0;
        break;
        case "#":
        modValue = 1;
        break;
        case "##":
        modValue = 2;
        break;
      }

      notes[modifier.index] += modValue;
    }
    else if(modifier instanceof Vex.Flow.Dot){
      keyPressTime *= 1.5;
    }

  };

  // we don't play rests
  if(this.isRest())
    notes = [NaN];

  //  velocity is set as 127

  var events = [];

  events.push({
    type: 'channel',
    channel: 0,
    subtype: notes.length==1?'noteOn':'chordOn',
    noteNumber: notes.length==1?notes[0]:notes,
    velocity: 127,
    queuedTime: playInfo.delay,
    note: this
  });
  events.push({
    type: 'channel',
    channel: 0,
    subtype: notes.length==1?'noteOff':'chordOff',
    noteNumber: notes.length==1?notes[0]:notes,
    queuedTime: playInfo.delay + keyPressTime,
    note: this
  });


  //increment the delay
  playInfo.delay = playInfo.delay + keyPressTime;

  return events;
};
