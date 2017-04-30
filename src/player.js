/*  Author: Andre Bakker, VexUI project
 *  This class requires the MIDI.js in the project to work correctly.
 *
 */

Player = function(){ //(handler){
  this.events = [];
  // this.handler = handler;
  this.currentTime = 0;
  this.currentEventIndex = 0;
  this.ready = false;
  this.loadInstrument("acoustic_grand_piano");
  this.playing = false;
};

Player.prototype.loadInstrument = function(instrumentName){ //, onReady){
  var player = this;
  //Initialize the player
  MIDI.loadPlugin({
    soundfontUrl: "./soundfont/",
    instrument: instrumentName,
    callback: function(){
      player.ready = true;
      // if(onReady)
      //  onReady();
    }
  });
}

Player.prototype.onPlayFinished = function(callback){
  this.callback = callback;
}

/**
 * Add functionality to add events manually, instead of using loadFile
 * @param event -> must have these attributes:
 * channel -> integer
 * subtype -> 'noteOn' | 'noteOff' | 'chordOn' | 'chordOff'
 * noteNumber -> integer
 * velocity -> integer (only required when subtype == 'noteOn' | 'chordOn')
 * queuedTime -> float (when the event will be triggered)
 */
Player.prototype.addEvent = function(event){
  this.events.push(event);
};


Player.prototype.addEvents = function(eventList){
  this.events = this.events.concat(eventList);
};

Player.prototype.play = function(self){
  console.log('[INFO] Player playing...');
  if(self === undefined)
    self = this;
  self.playing = true;
  if(self.currentEventIndex >= self.events.length){
    self.playing = false;
    return self.callback();
  }

  var event = self.events[self.currentEventIndex];

  if(self.currentTime <= event.queuedTime){
    //Fire the event
    self.fireEvent(event);

    //Increment the current event and add current time
    if(self.currentEventIndex + 1 >= self.events.length){
      self.playing = false;
      return self.callback();
    }
    var timeUntilNextEvent = self.events[self.currentEventIndex + 1].queuedTime -
                self.events[self.currentEventIndex].queuedTime;

    self.currentEventIndex++;
    self.currentTime += timeUntilNextEvent;

    self.scheduledId = setTimeout(self.play, timeUntilNextEvent * 1000, self);
  }

};

Player.prototype.stop = function(){
  console.log('[INFO] Player stopping...');
  if(this.scheduledId){
    clearTimeout(this.scheduledId);
    this.clear();
    this.playing = false;
    while(this.events.length){
      var event = this.events.pop();
      if(event.subtype == "noteOff" || event.subtype == "chordOff")
        this.fireEvent(event);
    }
  }
};


Player.prototype.fireEvent = function(event){
  switch(event.subtype){
    case 'noteOn':
      MIDI.noteOn(event.channel, event.noteNumber, event.velocity, 0);
      $('svg #vf-'+event.note.id).colourNote("red");
      // event.note.setHighlight(true);
      // self.handler.redraw();
      break;
    case 'noteOff':
      MIDI.noteOff(event.channel, event.noteNumber, 0);
      $('svg #vf-'+event.note.id).colourNote("black");
      // event.note.setHighlight(false);
      // self.handler.redraw();
      break;
    case 'chordOn':
      MIDI.chordOn(event.channel, event.noteNumber, event.velocity, 0);
      // event.note.setHighlight(true);
      // self.handler.redraw();
      break;
    case 'chordOff':
      MIDI.chordOff(event.channel, event.noteNumber, 0);
      // event.note.setHighlight(false);
      // self.handler.redraw();
      break;
  }
};

Player.prototype.clear = function(){
  this.scheduledId = null;
  this.currentTime = 0;
  this.currentEventIndex = 0;
};

editor.player = new Player();

editor.play = function(){
  console.log('[INFO] Editor playing...');
  var playButton, stopButton;

  playButton = document.getElementById("button-play");
  stopButton = document.getElementById("button-stop");

  //enable stop, disable play
  stopButton.disabled = false;
  playButton.disabled = true;

  //TODO RPM should be set outside...
  var rpm = 120;
  var playInfo = {
      delay: 0,
      rpm: rpm,
      defaultTime : (rpm / 60) // to seconds
      };
  //var script = "MIDI.setVolume(0, 127);";
  var playEvents = [];

  var selMeasureIn = getSelectedMeasureIndex();
  var selNoteIn = getSelectedNoteIndex();

  for(var i = selMeasureIn; i < gl_VfStaves.length; i++){
    var stave = gl_VfStaves[i];

    // set clef to playinfo
    // playInfo.clef = stave.clef;

    // get clef rather from my saved attributes, not from Vex.Flow.Stave object,
    // because VexFlow has it tied with graphical element of clef,
    // but I want clef information only for playing
    playInfo.clef = getCurAttrForMeasure(i, 'vfClef');

    //Call initial barline play events
    // var barNote = new Vex.Flow.BarNote();
    // barNote.setType(stave.modifiers[0].barline);
    // playEvents = playEvents.concat(barNote.getPlayEvents(playInfo, playEvents));

    var j = (i == selMeasureIn) ? selNoteIn : 0;

    for(; j < gl_VfStaveNotes[i].length; j++){

      var staveNote = gl_VfStaveNotes[i][j];
      playEvents = playEvents.concat(staveNote.getPlayEvents(playInfo));//, playEvents));
    }

    //Call final barline play events
    // barNote.setType(stave.modifiers[1].barline);
    // playEvents = playEvents.concat(barNote.getPlayEvents(playInfo, playEvents));
  }

  editor.player.addEvents(playEvents);
  editor.player.onPlayFinished(function(){
    //Reenable play and disable stop
    playButton.disabled = false;
    stopButton.disabled = true;
  });
  editor.player.play();
};

editor.stop = function(){
  console.log('[INFO] Editor stopping...');
  editor.player.stop();

  playButton = document.getElementById("button-play");
  stopButton = document.getElementById("button-stop");

  //enable stop, disable play
  playButton.disabled = false;
  stopButton.disabled = true;

};
