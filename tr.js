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
        throw new Error('Object.create implementation only accepts the first parameter.');
      }
      function F() {}
      F.prototype = o;
      return new F();
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

  var tile = {};

  var wall = Object.create(tile);
  wall.spriteName = function () {
    return 'metal.png';
  };

  var floor = Object.create(tile);
  floor.spriteName = function () {
    return 'metalfloor.png';
  };

  var bombable = Object.create(tile);
  bombable.spriteName = function () {
    return 'bombable.png';
  };

  var drillable = Object.create(tile);
  drillable.spriteName = function () {
    return 'drillable.png';
  };

  var water = Object.create(tile);
  water.spriteName = function () {
    return 'water.png';
  };

  var pit = Object.create(tile);
  pit.spriteName = function () {
    return 'lava.png';
  };

  var arrow = Object.create(tile);
  arrow.init = function (direction) {
    this.direction = direction;
    return this;
  };
  arrow.spriteName = function () {
    return this.direction + '_arrow.png';
  };

  var start = Object.create(tile);
  start.FRAMES = ['start00.png', 'start10.png', 'start15.png', 'start20.png',
                  'start25.png', 'start30.png', 'start35.png', 'start40.png',
                  'start45.png', 'start50.png', 'start55.png', 'start60.png',
                  'start55.png', 'start50.png', 'start45.png', 'start40.png',
                  'start35.png', 'start30.png', 'start25.png', 'start20.png',
                  'start15.png', 'start10.png', 'start05.png' ];
  start.spriteName = function () {
    return this.FRAMES[frameno % this.FRAMES.length];
  };

  var finish = Object.create(tile);
  finish.FRAMES = ['finish00.png', 'finish10.png', 'finish15.png', 'finish20.png',
                   'finish25.png', 'finish30.png', 'finish35.png', 'finish40.png',
                   'finish45.png', 'finish50.png', 'finish55.png', 'finish60.png',
                   'finish55.png', 'finish50.png', 'finish45.png', 'finish40.png',
                   'finish35.png', 'finish30.png', 'finish25.png', 'finish20.png',
                   'finish15.png', 'finish10.png', 'finish05.png' ];
  finish.spriteName = function () {
    return this.FRAMES[frameno % this.FRAMES.length];
  };

  var gate = Object.create(tile);
  gate.init = function (orientation, color) {
    this.orientation = orientation;
    this.color = color;
    return this;
  };

  var gateswitch = Object.create(tile);
  gateswitch.init = function (color, type, state) {
    this.color = color;
    this.type = type;
    this.state = state;
    return this;
  };
  gateswitch.spriteName = function () {
    var name = this.color + '_switch_' + this.state;
    if (this.type === 'heavy') {
      name += '_h';
    }
    name += '.png';
    return name;
  };

  var movable = {};
  movable.init = function (x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    return this;
  };
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


  var block = Object.create(movable);
  block.baseSpriteName = function () {
    return 'block';
  };

  var bot = Object.create(movable);

  var genericBot = Object.create(bot);
  genericBot.baseSpriteName = function () {
    return 'genericbot';
  };

  var arrowBot = Object.create(bot);
  arrowBot.baseSpriteName = function () {
    return 'arrowbot';
  };


  var cell = {
    init: function () {
      this.tiles = [];
      return this;
    },
    addTile: function (tile) {
      this.tiles.push(tile);
    },
    removeTile: function (tile) {
      this.tiles.remove(tile);
    }
  };

  var board = {
    init: function () {
      this.cells = [];
      return this;
    },
    cellAt: function (row, col) {
      if (this.cells[row]) {
        return this.cells[row][col];
      }
    },
    placeTile: function (tile, row, col) {
      if (!this.cells[row]) {
        this.cells[row] = [];
      }
      if (!this.cells[row][col]) {
        this.cells[row][col] = Object.create(cell).init();
      }
      this.cells[row][col].addTile(tile);
    },
    width: function () {
      return this.cells[0].length;
    },
    height: function () {
      return this.cells.length;
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
      '6': [pit],
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
      'R': [floor, Object.create(gateswitch).init('ns', 'red')],
      'G': [floor, Object.create(gateswitch).init('ns', 'green')],
      'B': [floor, Object.create(gateswitch).init('ns', 'blue')],
      'O': [floor, Object.create(gateswitch).init('ns', 'orange')],
      'Q': [floor, Object.create(gateswitch).init('ew', 'red')],
      'W': [floor, Object.create(gateswitch).init('ew', 'green')],
      'A': [floor, Object.create(gateswitch).init('ew', 'blue')],
      'Z': [floor, Object.create(gateswitch).init('ew', 'orange')],
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
      var lines = text.split(/\r?\n/),
        row,
        col,
        tiles,
        ii,
        jj;

      game.lvlTitle = lines[0];
      game.lvlNumber = lines[1];
      game.lvlEarned = lines[2];
      game.lvlNewBots = lines[3];
      game.lvlDesc = lines[4];

      for (ii = 5, row = 0; ii < lines.length; ii += 1, row += 1) {
        var line = lines[ii];
        for (col = 0; col < line.length; col += 1) {
          var chr = line.charAt(col);

          tiles = this.LEVEL_TILE_ENCODINGS[chr];
          if (tiles) {
            for (jj = 0; jj < tiles.length; jj += 1) {
              game.board.placeTile(tiles[jj], row, col);
            }
          }
        }
      }
      callback();
    }
  };

  var game = {
    init: function () {
      var canvas = document.getElementById('game');
      this.board = Object.create(board).init();
      this.sprites = {};
      this.movables = [];
      this.ctx = canvas.getContext('2d');
      this.loadImages(['movables', 'terrain'],
                      ['water', 'lava'],
                      bind(this, this.doneLoadingImages));
    },

    doneLoadingImages: function () {
      levelReader.read("level01", this,
                       bind(this, this.doneLoadingLevel));
      this.movables.push(Object.create(genericBot).init(10, 10, 'down'));
      this.movables.push(Object.create(arrowBot).init(10, 11, 'up'));
      this.movables.push(Object.create(arrowBot).init(10, 12, 'left'));
      this.movables.push(Object.create(arrowBot).init(10, 13, 'right'));

    },

    doneLoadingLevel: function () {
      // start the game loop
      setInterval(bind(this, this.mainLoop), 1000 / FPS);
    },

    mainLoop: function () {
      this.drawBoard();
      this.drawMovables();
      frameno += 1;
    },

    drawBoard: function () {
      var row,
        col,
        cell,
        ii;
      //console.log("animating this = " + this);
      //console.log("this.board = " + this.board);
      for (row = 0; row < this.board.height(); row += 1) {
        for (col = 0; col < this.board.width(); col += 1) {
          cell = this.board.cellAt(row, col);
          if (cell) {
            for (ii = 0; ii < cell.tiles.length; ii += 1) {
              var spriteName = cell.tiles[ii].spriteName();
              this.drawSprite(spriteName, col * TILE_WIDTH, row * TILE_HEIGHT);
            }
          }
        }
      }
    },

    drawMovables: function () {
      var i,
        mov,
        spriteName;
      for (i = 0; i < this.movables.length; i += 1) {
        mov = this.movables[i];
        spriteName = mov.spriteName();
        this.drawSprite(spriteName, mov.x * TILE_WIDTH, mov.y * TILE_HEIGHT);
      }
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
      var i,
        countdown = spriteSheets.length + textures.length,
        callbackAfterCountdown = function () {
          countdown -= 1;
          if (countdown === 0) { callback(); }
        };
      for (i = 0; i < spriteSheets.length; i += 1) {
        this.loadSpriteSheet(spriteSheets[i], callbackAfterCountdown);
      }
      for (i = 0;  i < textures.length; i += 1) {
        this.loadTexture(textures[i], callbackAfterCountdown);
      }
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

      imgObj.onload = function () { callback(); };
      this.sprites[textureName] = textureRep;
      imgObj.src = imgUrl;
    },

    loadSpriteSheet: function (name, callback) {
      var
        game = this,
        jsonUrl = 'images/' + name + '.json',
        imgUrl = 'images/' + name + '.png',
        countdown = 2,
        imgObj;

      imgObj = new Image();
      //sheetImages[name] = imgObj;
      imgObj.onload = function () {
        console.debug('loaded ' + imgUrl);
        countdown -= 1;
        if (countdown === 0) { callback(); }
      };
      imgObj.src = imgUrl;

      loadAsset(jsonUrl, function (req) {
        var
          parsed = JSON.parse(req.responseText),
          spriteName,
          spriteRep,
          sprite;

        for (spriteName in parsed.frames) {
          if (parsed.frames.hasOwnProperty(spriteName)) {
            sprite = parsed.frames[spriteName];
            spriteRep = {
              x: sprite.frame.x,
              y: sprite.frame.y,
              w: sprite.frame.w,
              h: sprite.frame.h,
              img: imgObj,
              type: 'sprite'
            };

            game.sprites[spriteName] = spriteRep;
          }
        }

        console.debug('loaded ' + jsonUrl);
        countdown -= 1;
        if (countdown === 0) { callback(); }
      });
    }

  };

  window.onload = function () { game.init(); };

}());
