/* Do some fun stuff with Javascript via UDP
   Eventually we will implement the SecretAPI here.  Eventually. */

// Constructor method for the holiday using SecretAPI
// Requires a string 'address' (i.e. IP address 192.168.0.20) or resolvable name (i.e. 'light.local')
//
function Holiday(address) {
  this.address = address;
  console.log("Address set to ", this.address)
  
  this.NUM_GLOBES = 50;
  this.FRAME_SIZE = 160;      // Secret API rame size
  this.FRAME_IGNORE = 10;     // Ignore the first 10 bytes of frame
  socketId = null;         // No socket number just yet

  this.closeSocket = closeSocket;
  this.setglobe = setglobe;
  this.getglobe = getglobe;
  this.render = render;

  var globes = new Uint8Array(160);
  this.globes = globes;
  console.log('Array created');

  // Fill the header of the array with zeroes
  for (i=0; i < this.FRAME_IGNORE; i++) {
    this.globes[i] = 0x00;
  }

  // Create the socket we'll use to communicate with the Holiday
  chrome.socket.create('udp', {},
   function(socketInfo) {           // Callback when creation is complete
      // The socket is created, now we want to connect to the service
      socketId = socketInfo.socketId;
      console.log('socket created ', socketInfo.socketId);
    }
  );

  function closeSocket() {
    // Clean up after ourselves;
    chrome.socket.destroy(socketId);
    console.log("Socket destroyed");
  }

  function setglobe(globenum, r, g, b) {
    // Sets a globe's color
    if ((globenum < 0) || (globenum >= this.NUM_GLOBES)) {
      return;
    }

    baseptr = this.FRAME_IGNORE + 3*globenum;
    globes[baseptr] = r;
    globes[baseptr+1] = g;
    globes[baseptr+2] = b; 

    return;
  }

  function getglobe() {
    // Sets a globe's color
    if ((globenum < 0) || (globenum >= this.NUM_GLOBES)) {
      return;
    }

    baseptr = this.FRAME_IGNORE + 3*globenum;
    r = globes[baseptr];
    g = globes[baseptr+1];
    b = globes[baseptr+2];
    return [r,g,b];
  }


  function render() {
    //console.log("Holiday.render");
    //var locaddr = this.address;
    var glbs = this.globes;
    var sid = socketId;
    if (sid == null) {
      console.log("No socket abort render");
      return;
    }

    // Connect via the socket
    chrome.socket.connect(socketId, this.address, 9988, function(result) {

       // We are now connected to the socket so send it some data
      chrome.socket.write(socketId, glbs.buffer,
       function(sendInfo) {
         //console.log("wrote " + sendInfo.bytesWritten);
         return;
      });
    });
    return;
  }

}

function LifeGame(aHoliday) {
  console.log("Instancing LifeGame");
  this.holiday = aHoliday;
  this.numCells = this.holiday.NUM_GLOBES;
  this.randCells = randCells;
  this.renderCells = renderCells;
  this.calculateCells = calculateCells;
  this.moveCells = moveCells;
  this.step = step;

  // Allocate storage for the array of cells
  this.currCells = new Uint8Array(this.numCells);
  this.nextCells = new Uint8Array(this.numCells);
  this.randCells();

  function randCells() {
    // Start with a random assortment of living and dead cells
    for (j=0; j < this.numCells; j++) {
      this.currCells[j] = Math.floor((Math.random()*2)+1) - 1;
    }
    return;
  }

  function calculateCells() {
    // Generate the nextCells values from the currCells values
    //console.log(this.currCells);
    for (j=0; j < this.numCells; j++) {

      // Get the before and after indices for calculations
      if (j == this.numCells-1) {
        k = 0;
        i = j-1;
      } else {
        if (j == 0) {
          i = this.numCells-1;
          k = j+1;
        } else {
          i = j-1;
          k = j+1;
        }
      }    

      // Sum the livingness of the neighbors.  If 2 then die.  If 1 then live.  If 0, then die.
      var crowd = this.currCells[k] + this.currCells[i];
      switch (crowd) {
        case 2:
          this.nextCells[j] = 0;      // too crowded
          break;
        case 1:
          this.nextCells[j] = 1;      // just right
          break;
        case 0:
        default:
          this.nextCells[j] = 0;      // so ronrey
      }
    }
    //console.log(this.nextCells);
    return;
  }

  function renderCells() {
    // Render the cells to a Holiday
    for (j=0; j < this.numCells; j++) {
      if (this.nextCells[j] == 1) {
        this.holiday.setglobe(j, 0x80, 0xff, 0x00);     // Green for alive
      } else {
        this.holiday.setglobe(j, 0x80, 0x90, 0x00);     // Red for dead
      }
    }
    this.holiday.render();    // And render it out
    return;
  }

  function moveCells() {
    // Move cells from next to current
    //console.log("moving cells");
    //console.log(this.currCells);
    //console.log(this.nextCells);
    //console.log("and...")
    for (j=0; j < this.numCells; j++) {
      this.currCells[j] = this.nextCells[j];
    }
    //console.log(this.currCells);
  }

  function step() {
    this.calculateCells();
    //console.log(this.nextCells)
    this.renderCells();
    this.moveCells();
  }
}

// OK, instance the Holiday
var hol = null;
var counter = null;
var game = null;

// Start Demo 
function demoStart() {
  
  console.log("demoStart");
  hol = new Holiday($('#address').val())
  game = new LifeGame(hol);
  counter = setInterval(lifestep, 50); // run every 500 msec
  $('#thebutton').val('Stop');
  return;

}
  
// Stop Demo 
function demoStop() {
  
  //
  // Insert IoTAS Code
  //
  console.log("demoStop");
  clearInterval(counter);
  counter = null;
  hol.closeSocket();
  hol = null;
  game = null;
  $('#thebutton').val('Start');
  return;
  
}

var reentry = false;

// Do this every tick
function lifestep() {
  if (reentry == true) {
    console.log("Re-entry blocked!")
    return;
  }

  // We keep this section re-entry free because evil otherwise.
  reentry = true;
  // Calculate another step and render it out
  //console.log(game);
  game.step();
  reentry = false;
}

function dobutton() {
  console.log("dobutton");
  return;
}

var buttonState = false;

// Lordy, this is one of the reasons I hate Javascript
// And it's not Javascript's fault.  It's the DOM.
// We need to wait until the DOM has loaded before we can fire off all this.
// 
$( document ).ready( function() {
  console.log("Doing the ready");
  // And here's the stuff we do.
  $("#thebutton").click(function () {
    if (buttonState == false) {
      buttonState = true;
      demoStart();
    } else {
      buttonState = false;
      demoStop();
    }
    console.log(buttonState);
    console.log($('#address').val())
  });
});
