window.onload = function() {

  fileInput.addEventListener('change', function(e) {
    try {
      var file = fileInput.files[0];
      var maxFileSize = 2 * 1024 * 1024;    // 2 MB

      if(fileInput.files[0].size > maxFileSize) {
        throw 'Uploaded file size exceeded is bigger than 2MB.';
      }

      if (file.type.match(/.xml/)) {
        console.log('xml file Uploaded');
        var reader = new FileReader();

        // after FileReader finishes reading:
        reader.onload = function(e) {
          try {
            initUI();
            uploadedFileName = file.name;
            loadAndDraw(reader.result);
          } catch(err) {
            console.error(err);
          }
        }

        reader.readAsText(file);

      } else {
        throw 'Uploaded file is not XML file.';
      }
    } catch(err) {
      console.error(err);
    }
  });
}

function loadAndDraw(inputFile) {
  // parse xml using jQuery into xml document object
  if(typeof inputFile === 'string') {
    var xmlDoc = $.parseXML(inputFile);
  }
  // example file loaded via ajax is already of xml Document type
  else {
    var xmlDoc = inputFile;
  }
  if(xmlDoc.documentElement.nodeName !== "score-partwise") {
    throw 'Uploaded file is not MusicXML score-partwise file.';
  }
  // convert xml to json for faster access
  jsonFromXml = xml2json(xmlDoc, '  ');
  // load json to memory; parseJSON is safer than eval
  scoreJson = $.parseJSON(jsonFromXml);
  // turn some only properties into one element array
  scoreJson = onlyChildren2Array(scoreJson);
  // parse json into vexflow structures
  editor.parse.all();
  // draw
  editor.draw.score();
}

function loadExample(url) {
  console.log('loading example file: ' + url);
  $.ajax({
      url: url,
      data: null,
      success: function(data) {
        initUI();
        uploadedFileName = 'example.xml';
        loadAndDraw(data);
      },
      dataType: 'xml'
  });
}

//wraps part, measure and note only child elements
//into one element arrays for later better manipulation
function onlyChildren2Array(scoreJson) {
  if(! $.isArray(scoreJson["score-partwise"].part) ) { //or !(x instanceof Array)
    scoreJson["score-partwise"].part = [ scoreJson["score-partwise"].part ];
  }
  if(! $.isArray(scoreJson["score-partwise"].part[0].measure) ) {
    scoreJson["score-partwise"].part[0].measure =
      [ scoreJson["score-partwise"].part[0].measure ];
  }
  for(var i = 0; i < scoreJson["score-partwise"].part[0].measure.length; i++) {
    if(! $.isArray(scoreJson["score-partwise"].part[0].measure[i].note) ) {
      scoreJson["score-partwise"].part[0].measure[i].note =
        [ scoreJson["score-partwise"].part[0].measure[i].note ];
    }
  }
  return scoreJson;
}
