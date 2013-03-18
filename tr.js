/*jslint vars: true, browser: true, devel: true, indent: 2 */
(function () {
  "use strict";

  // Constants and a frame counter
  var
    TILE_WIDTH = 30,
    TILE_HEIGHT = 30,
    FPS = 1,
    frameno = 0;

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
      for (var ii = this.length - 1; ii >= 0 ; ii -= 1) {
        if (pred(this[ii])) {
          this.splice(ii, 1);
        }
      }
    };
  }

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (fn) {
      for (var ii = 0; ii < this.length ; ii += 1) {
        fn(this[ii]);
      }
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

  function loadAsset(assetUrl, callback, type) {
    var req = new XMLHttpRequest();
    req.open("GET", assetUrl, true);
    if (type) {
      req.responseType = type;
    }
    if (callback) {
      req.onload = function () { callback(req); };
    }
    req.send();
  }

  function bind(scope, fn) {
    return function () {
      fn.apply(scope, arguments);
    };
  }

  var callbackAfterCountdown = function (counter, callback) {
    return function () {
      counter -= 1;
      if (counter === 0 && callback) { callback(); }
    };
  };

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

  var bombable = Object.create(tile)
  bombable.type = 'bombable';
  bombable.spriteName = function () {
    return 'bombable.png';
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

  var lava = Object.create(tile)
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

  var movable = {};
  movable.advance = function() {};
  movable.checkCollisions = function () {};
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
    suffix += ['0', '1', '2', '1'][frameno % 4];
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
  bot.advance = function () {
    if (!this.dying) {
      if (this.direction === 'up') {
        this.y -= 1;
      } else if (this.direction === 'down') {
        this.y += 1;
      } else if (this.direction === 'left') {
        this.x -= 1;
      } else if (this.direction === 'right') {
        this.x += 1;
      }
    }
  };
  bot.checkCollisions = function (board) {
    var that = this;
    var tiles = board.tilesAt(this.y, this.x);
    tiles.forEach(function (tile) {
      if (tile.type == 'arrow') {
        that.direction = tile.direction;
      }
      if (tile.type === 'wall' || tile.type === 'bombable' ||
          tile.type === 'drillable' || tile.type == 'water' ||
          tile.type === 'lava' || tile.type === 'block' ||
          tile.type === 'gate') {
        that.dying = true; // dying for one or more cycles before being cleaned up
      }
      if (tile.type === 'switch' && tile.weight !== 'heavy') {
        board.openGates(tile.color);
      }
    });
  };

  var genericbot = Object.create(bot);
  genericbot.type = 'genericbot';

  var arrowbot = Object.create(bot);
  arrowbot.type = 'arrowbot';

  var caboosebot = Object.create(bot);
  caboosebot.type = 'caboosebot';
  
  var board = {
    init: function () {
      this.tiles = [];
      return this;
    },
    tilesAt: function (row, col) {
      if (this.tiles[row]) {
        return this.tiles[row][col];
      }
    },
    placeTile: function (tile, row, col) {
      if (!this.tiles[row]) {
        this.tiles[row] = [];
      }
      if (!this.tiles[row][col]) {
        this.tiles[row][col] = [];
      }
      this.tiles[row][col].push(tile);
    },
    openGates: function (color) {
      this.forEachRowCol(function (row, col, cell) {
        cell.removeIf(function (tile) {
          return tile.type === 'gate' && tile.color === color;
        });
      });
    },
    width: function () {
      return this.tiles[0].length;
    },
    height: function () {
      return this.tiles.length;
    },
    forEachCell: function (fn) {
      var row, col, cell;
      for (var row = 0 ; row < this.tiles.length ; row += 1) {
        for (var col = 0 ; col < this.tiles[row].length ; col += 1) {
          var cell = this.tiles[row][col];
          fn(row, col, cell);
        }
      }
    },
    forEachTile: function (fn) {
      this.forEachCell(function (row, col, cell) {
        cell.forEach(function (tile) {
          fn(row, col, tile);
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
      loadAsset("levels/" + name + ".txt", function (req) {
        that.finish(req.responseText, game, callback);
      });
    },

    finish: function (text, game, callback) {
      var lines = text.split(/\r?\n/);
      var row, col, tiles, tile, ii, jj;

      game.levelInfo = { 
        title: lines[0],
        numberOfBots: lines[1],
        earnedBots: lines[2],
        numberOfNewBots: lines[3],
        description: lines[4]
      };

      for (ii = 5, row = 0; ii < lines.length; ii += 1, row += 1) {
        var line = lines[ii];
        for (col = 0; col < line.length; col += 1) {
          var chr = line.charAt(col);

          tiles = this.LEVEL_TILE_ENCODINGS[chr];
          if (tiles) {
            for (jj = 0; jj < tiles.length; jj += 1) {
              tile = Object.create(tiles[jj]);
              game.board.placeTile(tile, row, col);
              
              if (tile.type === 'start') {
                game.levelInfo.start = { x: col, y: row };
              }
              if (tile.type === 'finish') {
                game.levelInfo.finish = { x: col, y: row };
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
      var canvas = document.getElementById('game');
      this.game = game; // the logic
      this.sprites = {};
      this.ctx = canvas.getContext('2d');
      this.loadImages(['movables', 'terrain'], ['water', 'lava'], callback);
      return this;
    },

    drawBoard: function () {
      var that = this;
      //console.log("animating this = " + this);
      //console.log("this.board = " + this.board);
      
      this.game.board.forEachTile(function (row, col, tile) {
        that.drawSprite(tile.spriteName(), col * TILE_WIDTH, row * TILE_HEIGHT);
      });
    },

    drawMovables: function () {
      var that = this;
      this.game.movables.forEach(function (mov) {
        that.drawSprite(mov.spriteName(), mov.x * TILE_WIDTH, mov.y * TILE_HEIGHT);
      });
    },

    drawSprite: function (name, posx, posy) {
      var sprite = this.sprites[name];
      if (sprite) {
        if (sprite.type === 'texture') {
          this.ctx.drawImage(sprite.img, posx, posy, TILE_WIDTH, TILE_HEIGHT,
                             posx, posy, TILE_WIDTH, TILE_HEIGHT);
        } else {
          this.ctx.drawImage(sprite.img, sprite.x, sprite.y, sprite.w, sprite.h,
                             posx, posy, sprite.w, sprite.h);
        }
      }
    },

    loadImages: function (spriteSheets, textures, callback) {
      var that = this,
        countdown = spriteSheets.length + textures.length,
        countdownFn = callbackAfterCountdown(countdown, callback);

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
        countdownFn = callbackAfterCountdown(2, callback),
        imgObj;

      imgObj = new Image();
      //sheetImages[name] = imgObj;
      imgObj.onload = countdownFn;
      imgObj.src = imgUrl;

      loadAsset(jsonUrl, function (req) {
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

  var game = {

    init: function () {
      this.getParams = this.readGetParameters();
      this.ui = ui;
      this.board = Object.create(board).init();
      this.movables = [];

      var doneLoadingCallback =
        callbackAfterCountdown(2, bind(this, this.doneLoading));
      
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
      this.numberToDeploy = this.levelInfo.numberOfBots
      // start the game loop
      setInterval(bind(this, this.mainLoop), 1000 / FPS);
    },

    mainLoop: function () {
      ui.drawBoard();
      ui.drawMovables();
      this.update();
      frameno += 1;
    },

    removeDead: function ()  {
      this.movables.remove
      var ii = this.movables.length - 1;
      while (ii >= 0) {
        if (this.movables[ii].dying) {
          this.movables.splice(ii, 1);
        }
        ii -= 1;
      }
    },
    
    // update the state of the world
    update: function () {
      var that = this,
        deployed;
      
      this.removeDead();
      // advance all bots
      this.movables.forEach(function (mov) { mov.advance(); });
      this.movables.forEach(function (mov) { mov.checkCollisions(that.board); });

      // if there are remaining bots, deploy
      if (this.numberToDeploy >= 0) {
        deployed = Object.create(this.numberToDeploy > 0 ? genericbot : caboosebot);
        deployed.x = this.levelInfo.start.x;
        deployed.y = this.levelInfo.start.y;
        deployed.direction = 'down';
        this.movables.push(deployed);
        this.numberToDeploy -= 1;
      }
    },

  };

  window.onload = function () {
    game.init();
  };

}());
