var TILE_WIDTH = 30;
var TILE_HEIGHT = 30;
var FPS = 1;
var frameno = 0;

var Tile = Class.extend({
});

var Wall = Tile.extend({
  spriteName: function() {
    return 'metal.png';
  }
});

var Floor = Tile.extend({
  init: function(type) {
    this.type = type;
  },
  spriteName: function() {
    return 'metalfloor.png';
  }
});

var Water = Tile.extend({
  spriteName: function() {
    return 'water.png';
  }
});

var Pit = Tile.extend({
  spriteName: function() {
    return 'lava.png';
  }
});

var Arrow = Tile.extend({
  init: function(direction) {
    this.direction = direction;
  },
  spriteName: function() {
    return this.direction + '_arrow.png';
  }
});

var Start = Tile.extend({
  FRAMES: ['start00.png', 'start10.png', 'start15.png', 'start20.png',
           'start25.png', 'start30.png', 'start35.png', 'start40.png',
           'start45.png', 'start50.png', 'start55.png', 'start60.png',
           'start55.png', 'start50.png', 'start45.png', 'start40.png',
           'start35.png', 'start30.png', 'start25.png', 'start20.png',
           'start15.png', 'start10.png', 'start05.png' ],
  spriteName: function() {
    return this.FRAMES[frameno % this.FRAMES.length];
  },
});

var Finish = Tile.extend({
  FRAMES: ['finish00.png', 'finish10.png', 'finish15.png', 'finish20.png',
           'finish25.png', 'finish30.png', 'finish35.png', 'finish40.png',
           'finish45.png', 'finish50.png', 'finish55.png', 'finish60.png',
           'finish55.png', 'finish50.png', 'finish45.png', 'finish40.png',
           'finish35.png', 'finish30.png', 'finish25.png', 'finish20.png',
           'finish15.png', 'finish10.png', 'finish05.png' ],
  spriteName: function() {
    return this.FRAMES[frameno % this.FRAMES.length];
  },
});

var Gate = Tile.extend({
  init: function(orientation, color) {
    this.orientation = orientation;
    this.color = color;
  }
});

var Switch = Tile.extend({
  init: function(color, type, state) {
    this.color = color;
    this.type = type;
    this.state = state;
  },
  spriteName: function() {
    var name = this.color + '_switch_' + this.state;
    if (this.type == 'heavy') {
      name += '_h';
    }
    name += '.png';
    return name;
  }
});

var Movable = Class.extend({
  init: function(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  },
  spriteSuffix: function() {
    var suffix = '';
    if (this.direction == 'up') {
      suffix += '1';
    } else if (this.direction == 'down') {
      suffix += '0';
    } else if (this.direction == 'left') {
      suffix += '2'
    } else if (this.direction == 'right') {
      suffix += '3';      
    }
    suffix += ['0','1','2','1'][frameno % 4];
    return suffix;
  },
  spriteName: function() {
    return this.baseSpriteName() + '_' + this.spriteSuffix() + '.png';
  }
});

var Block = Movable.extend({
  baseSpriteName: function() {
    return 'block';
  }
});

var Bot = Movable.extend({});

var GenericBot = Bot.extend({
  baseSpriteName: function() {
    return 'genericbot';
  }
});

var ArrowBot = Bot.extend({
  baseSpriteName: function() {
    return 'arrowbot';
  }
});

var LevelReader = Class.extend({
  LEVEL_TILE_ENCODINGS: {
    '.': [new Floor()],
    '0': [new Wall()],
    '1': [new Floor('bombable')],
    '2': [new Floor('laserable')],
    '4': [new Floor('drillable')],
    '5': [new Water()],
    '6': [new Pit()],
    '<': [new Floor(), new Arrow('left')],
    '>': [new Floor(), new Arrow('right')],
    '^': [new Floor(), new Arrow('up')],
    'v': [new Floor(), new Arrow('down')],
    's': [new Floor(), new Start()],
    'f': [new Floor(), new Finish()],
    '3': [new Floor(), new Block()],
    'r': [new Floor(), new Switch('red', 'normal', 'up')],
    'g': [new Floor(), new Switch('green', 'normal', 'up')],
    'b': [new Floor(), new Switch('blue', 'normal', 'up')],
    'o': [new Floor(), new Switch('orange', 'normal', 'up')],
    'q': [new Floor(), new Switch('red', 'heavy', 'up')],
    'w': [new Floor(), new Switch('green', 'heavy', 'up')],
    'a': [new Floor(), new Switch('blue', 'heavy', 'up')],
    'z': [new Floor(), new Switch('orange', 'heavy', 'up')],
    'R': [new Floor(), new Gate('ns', 'red')],
    'G': [new Floor(), new Gate('ns', 'green')],
    'B': [new Floor(), new Gate('ns', 'blue')],
    'O': [new Floor(), new Gate('ns', 'orange')],
    'Q': [new Floor(), new Gate('ew', 'red')],
    'W': [new Floor(), new Gate('ew', 'green')],
    'A': [new Floor(), new Gate('ew', 'blue')],
    'Z': [new Floor(), new Gate('ew', 'orange')],
    '{': [new Floor()], 
    '}': [new Floor()], 
    '[': [new Floor()],
    ']': [new Floor()]
  },

  LEVEL_MOVABLE_ENCODINGS: {
    '3': [new Block()],
    '{': [], //enemy-left
    '}': [], //enemy-right
    '[': [], //enemy-up
    ']': []  //enemy-down
  },

  init: function(){
  },

  read: function(name, game, callback) {
    var self = this;
    loadAsset("levels/" + name + ".txt", function(req) {
      self.finish(req.responseText, game, callback);
    });
  },

  finish: function(text, game, callback) {
    var lines = text.split(/\r?\n/);
    var ii = 0;
    game.lvlTitle = lines[ii++];
    game.lvlNumber = lines[ii++];
    game.lvlEarned = lines[ii++];
    game.lvlNewBots = lines[ii++];
    game.lvlDesc = lines[ii++];

    game.board = new Board();
    
    for (var row = 0; ii < lines.length ; ii++, row++) {
      var line = lines[ii];
      for (var col = 0 ; col < line.length ; col++) {
        var chr = line.charAt(col);

        var tiles = this.LEVEL_TILE_ENCODINGS[chr];
        if (tiles) {
          for (var jj = 0 ; jj < tiles.length ; jj++) {
            game.board.placeTile(tiles[jj], row, col);
          }
        }
      }
    }
    
    
    callback();
  }
});

var Cell = Class.extend({
  init: function() {
    this.tiles = [];
  },

  addTile: function(tile) {
    this.tiles.push(tile);
  },

  removeTile: function(tile) {
    this.tiles.remove(tile);
  }
});

var Board = Class.extend({

  init: function() {
    this.cells = [];
  },

  cellAt: function(row, col) {
    if (this.cells[row]) {
      return this.cells[row][col];
    }
    return null;
  },
  
  placeTile: function(tile, row, col) {
    if (!this.cells[row]) {
      this.cells[row] = [];
    }
    if (!this.cells[row][col]) {
      this.cells[row][col] = new Cell();
    }
    this.cells[row][col].addTile(tile);
  },

  width: function() {
    return this.cells[0].length;
  },

  height: function() {
    return this.cells.length;
  }  
  
});

var Game = Class.extend({

  init: function() {
    var game = this;
    var canvas = document.getElementById('game');

    this.movables = [];
    this.levelReader = new LevelReader();
    this.ctx = canvas.getContext('2d');
    this.sprites = {};
    this.loadImages(['movables', 'terrain'],
                    ['water', 'lava'],
                    bind(this, this.doneLoadingImages));
  },

  doneLoadingImages: function() {
    this.levelReader.read("level01", this,
                          bind(this, this.doneLoadingLevel));
    this.movables.push(new GenericBot(10, 10, 'down'));
    this.movables.push(new ArrowBot(10, 11, 'up'));
    this.movables.push(new ArrowBot(10, 12, 'left'));
    this.movables.push(new ArrowBot(10, 13, 'right'));

  },

  doneLoadingLevel: function() {
    // start the game loop
    setInterval(bind(this, this.mainLoop), 1000/FPS);    
  },

  mainLoop: function() {
    this.drawBoard();
    this.drawMovables();
    frameno++;
  },
  
  drawBoard: function() {
    //console.log("animating this = " + this);
    //console.log("this.board = " + this.board);
    for (var row = 0 ; row < this.board.height() ; row++) {
      for (var col = 0 ; col < this.board.width(); col++) {
        var cell = this.board.cellAt(row, col);
        if (cell) {
          for (var ii = 0 ; ii < cell.tiles.length ; ii++) {
            var spriteName = cell.tiles[ii].spriteName();
            this.drawSprite(spriteName, col * TILE_WIDTH, row * TILE_HEIGHT);
          }
        }
      }
    }
  },

  drawMovables: function() {
    for (var i = 0 ; i < this.movables.length ; i++) {
      var mov = this.movables[i];
      var spriteName = mov.spriteName();
      this.drawSprite(spriteName, mov.x * TILE_WIDTH, mov.y * TILE_HEIGHT);
    }
  },

  drawSprite: function(name, posx, posy) {
    var sprite = this.sprites[name];
    if (sprite) {
      if (sprite.type == 'texture') {
        this.ctx.drawImage(sprite.img, posx, posy, TILE_WIDTH, TILE_HEIGHT,
                           posx, posy, TILE_WIDTH, TILE_HEIGHT);
      }
      else {
        this.ctx.drawImage(sprite.img, sprite.x, sprite.y, sprite.w, sprite.h,
                           posx, posy, sprite.w, sprite.h);
      }
    }
  },

  loadImages: function(spriteSheets, textures, callback) {
    var countdown = spriteSheets.length + textures.length;
    for (var i = 0 ; i < spriteSheets.length ; i++) {
      this.loadSpriteSheet(spriteSheets[i], function() {
        if (--countdown == 0) callback();
      });
    }
    for (var i = 0 ;  i < textures.length ; i++) {
      this.loadTexture(textures[i], function() {
        if (--countdown == 0) callback();
      });
    }
  },

  loadTexture: function(name, callback) {
    var game = this;
    var textureName = name + '.png';
    var imgUrl = 'images/' + textureName;

    var imgObj = new Image();
    imgObj.onload = function() {callback(); };
    
    var textureRep = {
      img: imgObj,
      type: 'texture'
    };
    game.sprites[textureName] = textureRep;

    imgObj.src = imgUrl;
  },

  loadSpriteSheet: function(name, callback) {
    var game = this;
    var jsonUrl = 'images/' + name + '.json';
    var imgUrl = 'images/' + name + '.png';
    var countdown = 2;
    
    var imgObj = new Image();
    //sheetImages[name] = imgObj;
    imgObj.onload = function(){
      console.debug('loaded ' + imgUrl);
      if (--countdown == 0) { callback(); };
    };
    imgObj.src = imgUrl;
    
    loadAsset(jsonUrl, function(req) {
      var parsed = JSON.parse(req.responseText);

      for (spriteName in parsed.frames) {
        var sprite = parsed.frames[spriteName];
        var spriteRep = {
          x: sprite.frame.x,
          y: sprite.frame.y,
          w: sprite.frame.w,
          h: sprite.frame.h,
          img: imgObj,
          type: 'sprite'
        };
        
        game.sprites[spriteName] = spriteRep;        
      }

      console.debug('loaded ' + jsonUrl);
      if (--countdown == 0) { callback() };
    });
  }

});


window.onload = function() { new Game(); };

