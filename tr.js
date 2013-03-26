/*jslint vars: true, browser: true, devel: true, indent: 2 */
"use strict";

// Constants and a frame counter
var
  BOARD_ROWS = 20,
  BOARD_COLS = 20,
  TILE_WIDTH = 30,
  TILE_HEIGHT = 30,
  FPS = 10,
  SPECIALIZATION_SCALE = 2,
  frameno = 0;

// http://answers.oreilly.com/topic/1929-how-to-use-the-canvas-and-draw-elements-in-html5/
var relMouseCoords = function (evt){
  var x;
  var y;
  if (evt.pageX || evt.pageY) {
    x = evt.pageX;
    y = evt.pageY;
  } else {
    x = evt.clientX + document.body.scrollLeft +
      document.documentElement.scrollLeft;
    y = evt.clientY + document.body.scrollTop +
      document.documentElement.scrollTop;
  }
  x -= this.offsetLeft;
  y -= this.offsetTop;
  return { x: x, y: y };
};
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

if (!Object.create) {
  Object.create = function (o) {
    if (arguments.length > 1) {
      throw new Error(
        'Object.create implementation only accepts the first parameter.');
    }
    function F() {}
    F.prototype = o;
    return new F();
  };
}

if (!Array.prototype.removeIf) {
  Array.prototype.removeIf = function(pred) {
    var removed = false;
    for (var ii = this.length - 1; ii >= 0 ; ii -= 1) {
      if (pred(this[ii])) {
        this.splice(ii, 1);
        removed = true;
      }
    }
    return removed;
  };
}

if (!Object.prototype.forEachEntry) {
  Object.prototype.forEachEntry = function (fn) {
    for (var key in this) {
      if (this.hasOwnProperty(key)) {
        fn(key, this[key]);
      }
    }
  };
}

var tile = {};

var wall = Object.create(tile);
wall.type = 'wall';
wall.spriteName = function () {
  return 'metal.png';
};

var floor = Object.create(tile);
floor.type = 'floor';
floor.spriteName = function () {
  return 'metalfloor.png';
};

var bombable = Object.create(tile);
bombable.type = 'bombable';
bombable.spriteName = function () {
  return 'bombable2.png';
};

var drillable = Object.create(tile);
drillable.type = 'drillable';
drillable.spriteName = function () {
  return 'drillable.png';
};

var water = Object.create(tile);
water.type = 'water';
water.spriteName = function () {
  return 'water.png';
};

var lava = Object.create(tile);
lava.type = 'lava';
lava.spriteName = function () {
  return 'lava.png';
};

var arrow = Object.create(tile);
arrow.type = 'arrow';
arrow.init = function (direction) {
  this.direction = direction;
  return this;
};
arrow.spriteName = function () {
  return this.direction + '_arrow.png';
};

var bridge = Object.create(tile);
bridge.type = 'bridge';
bridge.init = function (direction) {
  this.direction = direction;
  return this;
};
bridge.spriteName = function () {
  var orientation;
  if (this.direction === 'up' || this.direction === 'down') {
    orientation = 'ns';
  }
  else {
    orientation = 'ew';
  }
  return orientation + '_bridge.png';
};

var start = Object.create(tile);
start.type = 'start';
(function () {
  var FRAMES = ['start00.png', 'start10.png', 'start15.png', 'start20.png',
                'start25.png', 'start30.png', 'start35.png', 'start40.png',
                'start45.png', 'start50.png', 'start55.png', 'start60.png',
                'start55.png', 'start50.png', 'start45.png', 'start40.png',
                'start35.png', 'start30.png', 'start25.png', 'start20.png',
                'start15.png', 'start10.png', 'start05.png' ];
  start.spriteName = function () {
    return FRAMES[frameno % FRAMES.length];
  };
}());

var finish = Object.create(tile);
finish.type = 'finish';
(function () {
  var FRAMES = ['finish00.png', 'finish10.png', 'finish15.png', 'finish20.png',
                'finish25.png', 'finish30.png', 'finish35.png', 'finish40.png',
                'finish45.png', 'finish50.png', 'finish55.png', 'finish60.png',
                'finish55.png', 'finish50.png', 'finish45.png', 'finish40.png',
                'finish35.png', 'finish30.png', 'finish25.png', 'finish20.png',
                'finish15.png', 'finish10.png', 'finish05.png' ];
  finish.spriteName = function () {
    return FRAMES[frameno % FRAMES.length];
  };
}());

var gate = Object.create(tile);
gate.type = 'gate';
gate.init = function (orientation, color) {
  this.orientation = orientation;
  this.color = color;
  return this;
};
gate.spriteName = function () {
  return this.orientation + '_' + this.color + '_gate.png';
};

var gateswitch = Object.create(tile);
gateswitch.type = 'switch';
gateswitch.init = function (color, weight, state) {
  this.color = color;
  this.weight = weight;
  this.state = state;
  return this;
};
gateswitch.spriteName = function () {
  var name = this.color + '_switch_' + this.state;
  if (this.weight === 'heavy') {
    name += '_h';
  }
  name += '.png';
  return name;
};

var movable = {
  animate: true
};
movable.advance = function(game) {};
movable.checkCollisions = function (game) {};
movable.spriteSuffix = function () {
  var suffix = '';
  if (this.direction === 'up') {
    suffix += '1';
  } else if (this.direction === 'down') {
    suffix += '0';
  } else if (this.direction === 'left') {
    suffix += '2';
  } else if (this.direction === 'right') {
    suffix += '3';
  }
  if (this.animate) {
    suffix += ['0', '1', '2', '1'][frameno % 4];
  } else {
    suffix += '1';
  }
  return suffix;
};
movable.spriteName = function () {
  return this.baseSpriteName() + '_' + this.spriteSuffix() + '.png';
};
movable.baseSpriteName = function () {
  return this.type; // by coincidence this is often the same
};

var block = Object.create(movable);
block.type = 'block';

var bot = Object.create(movable);
bot.direction = 'down';
bot.advance = function (game) {
  if (!this.dying) {
    this.position = util.advance(this.position, this.direction);
  }
};
bot.checkCollisions = function (game) {
  var that = this;
  var cell = game.board.cellAt(this.position);
  cell.tiles.forEach(function (tile) {
    if (tile.type == 'arrow') {
      that.direction = tile.direction;
    }
    if ((tile.type === 'water' || tile.type === 'lava') &&
        !cell.tiles.some(
          function (tile) {return tile.type === 'bridge'; })) {
      console.debug(that.type + ' is dying after hitting ' + tile.type);
      that.dying = true;
    }
    else if (tile.type === 'wall' || tile.type === 'bombable' ||
             tile.type === 'drillable' || tile.type === 'block' ||
             tile.type === 'gate') {
      console.debug(that.type + ' is dying after hitting ' + tile.type);
      that.dying = true; // dying for one or more cycles before being cleaned up
    }
    if (tile.type === 'switch' && tile.weight !== 'heavy') {
      game.board.openGates(tile.color);
    }
  });
};

var genericbot = Object.create(bot);
genericbot.type = 'genericbot';
genericbot.spriteName = function () {
  if (this.useAppearanceOf) {
    this.useAppearanceOf.direction = this.direction;
    return this.useAppearanceOf.spriteName();
  }
  return bot.spriteName.call(this);
};


var arrowbot = Object.create(bot);
arrowbot.type = 'arrowbot';
arrowbot.advance = function (game) {
  // pass our advance target back to the previous
  if (game.trainHead) {
    game.trainHead.advanceTarget = this.advanceTarget;
  }
  game.board.placeTile(Object.create(arrow).init(this.direction),
                       this.position);
  game.removeMovable(this);
};


var bombbot = Object.create(bot);
bombbot.type = 'bombbot';
bombbot.checkCollisions = function (game) {
  function isBombable(tile) {
    return tile.type === 'bombable';
  }
  function removeBombable(position) {
    var cell = game.board.cellAt(position);
    if (cell && cell.tiles.removeIf(isBombable)) {
      removeBombable({ row: position.row-1, col: position.col });
      removeBombable({ row: position.row+1, col: position.col });
      removeBombable({ row: position.row, col: position.col-1 });
      removeBombable({ row: position.row, col: position.col+1 });
    }
  }
  bot.checkCollisions.call(this, game);
  removeBombable(this.position);
};

var bridgebot = Object.create(bot);
bridgebot.type = 'bridgebot';

bridgebot.checkCollisions = function (game) {
  function isWaterOrLava(tile) {
    return tile.type === 'water' || tile.type === 'lava';
  }

  var cell = game.board.cellAt(this.position);
  if (cell.tiles.some(isWaterOrLava)) {
    // pass our advance target back to the previous
    if (game.trainHead) {
      game.trainHead.advanceTarget = this.advanceTarget;
    }
    var tile = Object.create(bridge).init(this.direction);
    game.board.placeTile(tile, this.position);
    game.removeMovable(this);
  }
  else {
    bot.checkCollisions.call(this, game);
  }
  
};

var caboosebot = Object.create(bot);
caboosebot.type = 'caboosebot';

var bots = [
  genericbot, 
  arrowbot,
  bombbot,
  bridgebot,
  caboosebot
];

var botByType = {};
bots.forEach(function (bot) {
  botByType[bot.type] = bot;
});

var cell = {
  init: function() {
    this.tiles = [];
    return this;
  }
};

var board = {
  init: function () {
    this.cells = [];
    return this;
  },
  cellAt: function (position) {
    if (this.cells[position.row]) {
      return this.cells[position.row][position.col];
    }
  },
  placeTile: function (tile, position) {
    if (!this.cells[position.row]) {
      this.cells[position.row] = [];
    }
    if (!this.cells[position.row][position.col]) {
      this.cells[position.row][position.col] = Object.create(cell).init();
    }
    this.cells[position.row][position.col].tiles.push(tile);
  },
  openGates: function (color) {
    this.forEachCell(function (position, cell) {
      cell.tiles.removeIf(function (tile) {
        return tile.type === 'gate' && tile.color === color;
      });
    });
  },
  width: function () {
    return this.cells[0].length;
  },
  height: function () {
    return this.cells.length;
  },
  forEachCell: function (fn) {
    var row, col, cell;
    for (var row = 0 ; row < this.cells.length ; row += 1) {
      for (var col = 0 ; col < this.cells[row].length ; col += 1) {
        fn({ row: row, col: col }, this.cells[row][col]);
      }
    }
  },
  forEachTile: function (fn) {
    this.forEachCell(function (position, cell) {
      cell.tiles.forEach(function (tile) {
        fn(position, tile);
      });
    });
  }

};

var levelReader = {
  LEVEL_TILE_ENCODINGS: {
    '.': [floor],
    '0': [wall],
    '1': [floor, bombable],
    '2': [floor], //unused laserable],
    '4': [floor, drillable],
    '5': [water],
    '6': [lava],
    '<': [floor, Object.create(arrow).init('left')],
    '>': [floor, Object.create(arrow).init('right')],
    '^': [floor, Object.create(arrow).init('up')],
    'v': [floor, Object.create(arrow).init('down')],
    's': [floor, start],
    'f': [floor, finish],
    '3': [floor],
    'r': [floor, Object.create(gateswitch).init('red', 'normal', 'up')],
    'g': [floor, Object.create(gateswitch).init('green', 'normal', 'up')],
    'b': [floor, Object.create(gateswitch).init('blue', 'normal', 'up')],
    'o': [floor, Object.create(gateswitch).init('orange', 'normal', 'up')],
    'q': [floor, Object.create(gateswitch).init('red', 'heavy', 'up')],
    'w': [floor, Object.create(gateswitch).init('green', 'heavy', 'up')],
    'a': [floor, Object.create(gateswitch).init('blue', 'heavy', 'up')],
    'z': [floor, Object.create(gateswitch).init('orange', 'heavy', 'up')],
    'R': [floor, Object.create(gate).init('ns', 'red')],
    'G': [floor, Object.create(gate).init('ns', 'green')],
    'B': [floor, Object.create(gate).init('ns', 'blue')],
    'O': [floor, Object.create(gate).init('ns', 'orange')],
    'Q': [floor, Object.create(gate).init('ew', 'red')],
    'W': [floor, Object.create(gate).init('ew', 'green')],
    'A': [floor, Object.create(gate).init('ew', 'blue')],
    'Z': [floor, Object.create(gate).init('ew', 'orange')],
    '{': [floor],
    '}': [floor],
    '[': [floor],
    ']': [floor]
  },

  LEVEL_MOVABLE_ENCODINGS: {
    '3': [block],
    '{': [], //enemy-left
    '}': [], //enemy-right
    '[': [], //enemy-up
    ']': []  //enemy-down
  },

  read: function (name, game, callback) {
    var that = this;
    util.loadAsset("levels/" + name + ".txt", function (req) {
      that.finish(req.responseText, game, callback);
    });
  },

  finish: function (text, game, callback) {
    var lines = text.split(/\r?\n/);
    var row, col, tiles, tile, ii, jj;

    game.levelInfo = { 
      title: lines[0],
      numberOfBots: Number(lines[1]),
      earnedBots: Number(lines[2]),
      numberOfNewBots: Number(lines[3]),
      description: lines[4]
    };

    for (ii = 5, row = 0; ii < lines.length; ii += 1, row += 1) {
      var line = lines[ii];
      for (col = 0; col < line.length; col += 1) {
        var chr = line.charAt(col);
        var pos = { row: row, col: col };
        tiles = this.LEVEL_TILE_ENCODINGS[chr];
        if (tiles) {
          for (jj = 0; jj < tiles.length; jj += 1) {
            tile = Object.create(tiles[jj]);
            game.board.placeTile(tile, pos);
            
            if (tile.type === 'start') {
              game.levelInfo.start = pos;
            }
            if (tile.type === 'finish') {
              game.levelInfo.finish = pos;
            }
          }
        }
      }
    }
    callback();
  }
};

var ui = {
  init: function (game, callback) {
    var that = this;
    this.game = game; // the logic
    this.sprites = {};

    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.mozImageSmoothingEnabled = false;

    var boardbounds = {
      x: 0,
      y: 0, 
      w: BOARD_COLS * TILE_WIDTH,
      h: BOARD_ROWS * TILE_HEIGHT
    };
    var specbounds = {
      x: boardbounds.x + boardbounds.w,
      y: 0,
      w: TILE_WIDTH * SPECIALIZATION_SCALE + 5,
      h: boardbounds.h
    };
    
    this.boardui = boardui.init(game, this, boardbounds);
    this.specui = specui.init(game, this, SPECIALIZATION_SCALE, specbounds);

    this.components = [ this.boardui, this.specui ];

    this.loadImages(['movables', 'terrain'], ['water', 'lava'], callback);
    this.addListeners();

    return this;
  },

  addListeners: function () {
    var that = this;
    this.canvas.addEventListener('mousemove', function (evt) {
      var coords = that.canvas.relMouseCoords(evt);
      for (var ii = 0 ; ii < that.components.length ; ii += 1) {
        var component = that.components[ii];
        if (util.inBounds(component.bounds, coords)
            && component.mouseMoved) {
          component.mouseMoved(coords);
        }
      }
    });
    // mouse clicks will indicate where the train should advance to
    this.canvas.addEventListener('click', function (evt) {
      var coords = that.canvas.relMouseCoords(evt);
      for (var ii = 0 ; ii < that.components.length ; ii += 1) {
        var component = that.components[ii];
        if (util.inBounds(component.bounds, coords)
            && component.mouseClicked) {
          component.mouseClicked(coords);
        }
      }
    }, true);
  },

  draw: function () {
    this.boardui.draw();
    this.specui.draw();
  },

  drawSprite: function (name, posx, posy, xfactor, yfactor) {
    xfactor = xfactor || 1;
    yfactor = yfactor || 1;
    var sprite = this.sprites[name];
    if (sprite) {
      if (sprite.type === 'texture') {
        this.ctx.drawImage(sprite.img, posx, posy, TILE_WIDTH, TILE_HEIGHT,
                           posx, posy, TILE_WIDTH*xfactor, TILE_HEIGHT*yfactor);
      } else {
        this.ctx.drawImage(sprite.img, sprite.x, sprite.y, sprite.w, sprite.h,
                           posx, posy, sprite.w*xfactor, sprite.h*yfactor);
      }
    }
  },

  loadImages: function (spriteSheets, textures, callback) {
    var that = this,
      countdown = spriteSheets.length + textures.length,
      countdownFn = util.callbackAfterCountdown(countdown, callback);

    spriteSheets.forEach(function (sheet) {
      that.loadSpriteSheet(sheet, countdownFn);
    });
    textures.forEach(function (texture) {
      that.loadTexture(texture, countdownFn);
    });
  },

  loadTexture: function (name, callback) {
    var
      textureName = name + '.png',
      imgUrl = 'images/' + textureName,
      imgObj = new Image(),
      textureRep = {
        img: imgObj,
        type: 'texture'
      };

    imgObj.onload = callback;
    this.sprites[textureName] = textureRep;
    imgObj.src = imgUrl;
  },

  loadSpriteSheet: function (name, callback) {
    var
      game = this,
      jsonUrl = 'images/' + name + '.json',
      imgUrl = 'images/' + name + '.png',
      countdownFn = util.callbackAfterCountdown(2, callback),
      imgObj;

    imgObj = new Image();
    //sheetImages[name] = imgObj;
    imgObj.onload = countdownFn;
    imgObj.src = imgUrl;

    util.loadAsset(jsonUrl, function (req) {
      var
      parsed = JSON.parse(req.responseText),
      spriteName,
      spriteRep,
      sprite;

      parsed.frames.forEachEntry(function (spriteName, sprite) {
        spriteRep = {
          x: sprite.frame.x,
          y: sprite.frame.y,
          w: sprite.frame.w,
          h: sprite.frame.h,
          img: imgObj,
          type: 'sprite'
        };
        
        game.sprites[spriteName] = spriteRep;
      });
      
      console.debug('loaded ' + jsonUrl);
      countdownFn();
    });
  }
};

var boardui = {
  init: function (game, ui, bounds) {
    this.game = game;
    this.ui = ui;
    this.bounds = bounds;

    return this;
  },

  mouseClicked: function (coords) {
    this.game.clickPosition = {
      row: Math.floor(coords.y / TILE_HEIGHT),
      col: Math.floor(coords.x / TILE_WIDTH)
    };
  },

  mouseMoved: function (coords) {
    this.game.hoverPosition = {
      row: Math.floor(coords.y / TILE_HEIGHT),
      col: Math.floor(coords.x / TILE_WIDTH)
    };
  },

  draw: function () {
    this.drawBoard();
    this.drawMovables();
    this.drawHighlights();
  },

  drawBoard: function () {
    var that = this;
    //console.log("animating this = " + this);
    //console.log("this.board = " + this.board);
    
    this.game.board.forEachTile(function (position, tile) {
      that.ui.drawSprite(tile.spriteName(),
                         position.col * TILE_WIDTH,
                         position.row * TILE_HEIGHT);
    });
  },

  drawMovables: function () {
    var that = this;
    this.game.movables.forEach(function (mov) {
      that.ui.drawSprite(mov.spriteName(),
                         mov.position.col * TILE_WIDTH,
                         mov.position.row * TILE_HEIGHT);
    });
  },

  drawHighlights: function () {
    var that = this;
    this.game.board.forEachCell(
      function (position, cell) {
        if (cell.onTrainPath || cell.onLaunchPath) {
          if (cell.onTrainPath) {
            that.ui.ctx.fillStyle = 'rgba(255, 255, 0, 0.25)';
          } 
          else {
            that.ui.ctx.fillStyle = 'rgba(0, 255, 0, 0.25)';            
          }
          that.ui.ctx.fillRect(position.col * TILE_WIDTH,
                               position.row * TILE_HEIGHT, 
                               TILE_WIDTH, TILE_HEIGHT);
        }
      });
  },

};

// ui for choosing specialization
var specui = {

  init: function (game, ui, scale, bounds) {
    this.game = game;
    this.ui = ui;
    this.scale = scale;
    this.bounds = bounds;
    return this;
  },

  draw: function () {
    var earned = this.game.levelInfo.earnedBots;

    this.ui.ctx.clearRect(this.bounds.x, this.bounds.y,
                          this.bounds.w, this.bounds.h)

    for (var ii = 0 ; ii < earned+1 && ii < bots.length ; ii += 1) {
      var posx = this.bounds.x + 2;
      var posy = this.bounds.y + ii * (TILE_HEIGHT * this.scale + 5) + 2;
      var bot = Object.create(bots[ii]);
      bot.direction = 'down';
      bot.animate = false;
      this.ui.drawSprite(bot.spriteName(), posx, posy, this.scale, this.scale)
      if (this.game.specialization === bot.type) {
        this.ui.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ui.ctx.fillRect(posx, posy,
                             TILE_WIDTH * this.scale,
                             TILE_HEIGHT * this.scale);

        this.ui.ctx.strokeStyle = 'rgb(0, 255, 0)';
        this.ui.ctx.strokeRect(posx, posy, 
                               TILE_WIDTH * this.scale, 
                               TILE_HEIGHT * this.scale);
      }
    }
  },

  mouseClicked: function (coords) {
    var earned = this.game.levelInfo.earnedBots;
    
    for (var ii = 0 ; ii < earned+1 && ii < bots.length ; ii += 1) {
      var posx = this.bounds.x;
      var posy1 = this.bounds.y + ii * (TILE_HEIGHT * this.scale + 5);
      var posy2 = posy1 + TILE_HEIGHT * this.scale;
      if (coords.y >= posy1 && coords.y <= posy2) {
        var spec = bots[ii].type;
        console.log("specializing to: " + spec);
        if (this.game.specialization === spec) {
          this.game.specialization = null;
        }
        else {
          this.game.specialization = spec;
        }
      }
   }
  },

};

var game = {

  init: function () {
    this.getParams = this.readGetParameters();
    this.ui = ui;
    this.board = Object.create(board).init();
    this.movables = [];
    // the game hasn't started until the player chooses a starting direction
    this.started = false; 

    var doneLoadingCallback =
      util.callbackAfterCountdown(2, util.bind(this, this.doneLoading));
    
    ui.init(game, doneLoadingCallback);
    levelReader.read(this.getParams.level || 'level01', this, doneLoadingCallback);
  },

  readGetParameters: function () {      
    var getstr = window.location.search.substr(1);
    var getsplit = getstr.split('&');
    var getparams = {};
    
    for (var ii = 0 ; ii < getsplit.length ; ii += 1) {
      var av = getsplit[ii].split("=");
      getparams[av[0]] = av[1];
    }
    return getparams;
  },

  doneLoading: function () {
    this.numberToDeploy = this.levelInfo.numberOfBots;
    console.debug("done loading. number left to deploy is : " + this.numberToDeploy);
    // start the game loop
    setInterval(util.bind(this, this.mainLoop), 1000 / FPS);
  },

  mainLoop: function () {
    this.processEvents();
    this.update();
    ui.draw();
    frameno += 1;
  },

  removeDead: function ()  {
    var that = this;
    this.movables.forEach(function (mov) {
      if (mov.dying && that.trainHead === mov) {
        that.trainHead = mov.trainPrevious;
      }
    });

    this.movables.removeIf(
      function (mov) { return mov.dying; });
  },

  removeMovable: function (mov) {
    var idx = this.movables.indexOf(mov);
    console.log("removing movable: " + idx);
    this.movables.splice(idx, 1);
  },

  processEvents: function() {
    if (this.clickPosition) {
      var cell = this.board.cellAt(this.clickPosition);
      if (cell.onTrainPath) {
        if (!this.started) {
          this.started = true;
          this.deployDirection = util.calcDirection(this.levelInfo.start,
                                                    this.clickPosition);
          this.launchTarget = this.clickPosition; // temporary
        }
        else {
          this.trainHead.advanceTarget = this.clickPosition;
        }
        this.advancing = true;
      }
      else if (cell.onLaunchPath) {
        this.launchDirection = util.calcDirection(this.trainHead.position,
                                                  this.clickPosition);
        this.trainHead.advanceTarget = this.clickPosition;
        console.log("set trainHead advancetarget to: " + JSON.stringify(this.trainHead.advanceTarget));
        this.advancing = true;
      }
    }
    this.clickPosition = null;
    this.hoverPosition = null;
    
  },

  maybeLaunch: function () {      
    if (this.launchDirection && this.trainHead !== this.trainCaboose) {
      var launched = this.trainHead;
      this.trainHead = this.trainHead.trainPrevious;
      
      this.removeMovable(launched);

      var specialized = Object.create(
        botByType[this.specialization] || genericbot);
      specialized.position = launched.position;
      specialized.direction = this.launchDirection;
      specialized.advanceTarget = launched.advanceTarget;
      this.movables.push(specialized);

      this.launchDirection = null;
      this.specialization = null;
      this.advancing = true; // advance one space until the new head meets the advanceTarget
    }
  },

  maybeDeploy: function () {
    // if there are remaining bots, deploy
    if (this.started && this.advancing && this.numberToDeploy >= 0) {
      var deployed = Object.create(
        this.numberToDeploy === 0 ? caboosebot : genericbot);
      deployed.position = this.levelInfo.start;
      deployed.direction = this.deployDirection;

      // head is the front car
      if (!this.trainHead) {
        this.trainHead = deployed;
        this.trainHead.advanceTarget = this.launchTarget;
        this.launchTarget = null;
      } 
      // set up links from each car to the car behind it
      if (this.lastDeployed) {
        this.lastDeployed.trainPrevious = deployed;
      }
      if (this.numberToDeploy === 0) {
        this.trainCaboose = deployed;
      }

      this.movables.push(deployed);
      this.lastDeployed = deployed;
      this.numberToDeploy -= 1;
    }
  },
  
  // update the state of the world
  update: function () {
    var that = this;
    
    this.removeDead();

    if (this.trainHead && this.trainHead !== this.trainCaboose
        && this.specialization) {
      this.trainHead.useAppearanceOf = botByType[this.specialization];
    }

    this.maybeLaunch();
    
    if (this.started && this.advancing) {
      this.movables.forEach(function (mov) { mov.advance(that); });
      this.movables.forEach(function (mov) { mov.checkCollisions(that); });
    }

    this.maybeDeploy();

    if (this.advancing && this.trainHead && this.trainHead.advanceTarget && 
        util.positionsEqual(this.trainHead.position,
                            this.trainHead.advanceTarget)) {
      this.advancing = false;
    }

    this.calculatePaths();
  },

  calculatePaths: function() {
    var that = this;

    var isWall = function (cell) {
      return cell.tiles.some(
        function (tile) { return tile.type === 'wall'; });
    };

    var maybeChangeDirection = function (cell, currentDirection) {
      var arrow = cell.tiles.filter(
        function (tile) { return tile.type === 'arrow'; })[0];
      return arrow ? arrow.direction : currentDirection;
    };
    
    var applyToPath = function recur(position, direction, fn, terminalp) {
      var cell;
      if (position.row >= 0 && position.row < that.board.height()
          && position.col >= 0 && position.col < that.board.width()) {
        cell = that.board.cellAt(position);
        if (isWall(cell) || (terminalp && terminalp(cell))) {
          // terminate
        }
        else {
          fn(cell);
          direction = maybeChangeDirection(cell, direction);
          recur(
            util.advance(position, direction), direction, fn, terminalp);
        }
      }
    };

    var applyToPathAllDirs = function (position, fn, terminalp) {
      applyToPath(util.advance(position, 'up'), 'up', fn, terminalp);
      applyToPath(util.advance(position, 'down'), 'down', fn, terminalp);
      applyToPath(util.advance(position, 'left'), 'left', fn, terminalp);
      applyToPath(util.advance(position, 'right'), 'right', fn, terminalp);
    };
    
    // clear path status
    this.board.forEachCell(
      function (position, cell) {
        cell.onTrainPath = null;
        cell.onLaunchPath = null;
      });
    
    // path starts in all directions from the start position 
    var setOnTrainPath = function (cell) { cell.onTrainPath = true; };
    var isOnTrainPath = function (cell) { return cell.onTrainPath; };
    var setOnLaunchPath = function (cell) { cell.onLaunchPath = true; };
    var isOnLaunchPath = function (cell) { return cell.onLaunchPath; };
    if (!this.started) {
      applyToPathAllDirs(this.levelInfo.start, setOnTrainPath, isOnTrainPath);
    }
    else if (this.trainHead) {
      if (this.specialization) {
        applyToPathAllDirs(this.trainHead.position, setOnLaunchPath, isOnLaunchPath);
      }
      else {
        applyToPath(util.advance(this.trainHead.position,
                                 this.trainHead.direction),
                    this.trainHead.direction, setOnTrainPath, isOnTrainPath);
      }
    }

  }

};


var util = {

  loadAsset: function (assetUrl, callback, type) {
    var req = new XMLHttpRequest();
    req.open("GET", assetUrl, true);
    if (type) {
      req.responseType = type;
    }
    if (callback) {
      req.onload = function () { callback(req); };
    }
    req.send();
  },

  bind: function (scope, fn) {
    return function () {
      fn.apply(scope, arguments);
    };
  },

  calcDirection: function (from, to) {
    var drow = to.row - from.row;
    var dcol = to.col - from.col;

    if (Math.abs(drow) > Math.abs(dcol)) {
      return drow > 0 ? 'down' : 'up';
    } else {
      return dcol > 0 ? 'right' : 'left';
    }
  },

  advance: function (position, direction) {
    if (direction === 'up') {
      return { row: position.row - 1, col: position.col };
    } else if (direction === 'down') {
      return { row: position.row + 1, col: position.col };
    } else if (direction === 'left') {
      return { row: position.row, col: position.col - 1 };
    } else if (direction === 'right') {
      return { row: position.row, col: position.col + 1 };
    }
  },
  positionsEqual: function (pos1, pos2) {
    return pos1.row === pos2.row && pos1.col === pos2.col;
  },

  callbackAfterCountdown: function (counter, callback) {
    return function () {
      counter -= 1;
      if (counter === 0 && callback) { callback(); }
    }
  },
  
  inBounds: function (rect, point) {
    return point.x >= rect.x && point.x < rect.x + rect.w
      && point.y >= rect.y && point.y < rect.y + rect.h;
  }

};


var specialize = function (type) {
  game.specialization = type;
};

var launch = function (direction) {
  game.launchDirection = direction;
};

window.onload = function () {
  game.init();
};
