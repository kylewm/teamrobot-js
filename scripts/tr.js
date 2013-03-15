
var frames = ["arrowbot_20.png", "arrowbot_21.png", "arrowbot_22.png", "arrowbot_21.png"];
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
  spriteName: function() {
    return ['start00.png', 'start10.png', 'start15.png', 'start20.png',
            'start25.png', 'start30.png', 'start35.png', 'start40.png',
            'start45.png', 'start50.png', 'start55.png', 'start60.png',
            'start55.png', 'start50.png', 'start45.png', 'start40.png',
            'start35.png', 'start30.png', 'start25.png', 'start20.png',
            'start15.png', 'start10.png', 'start05.png' ] ;
  },
});

var Finish = Tile.extend({
  spriteName: function() {
    return ['finish00.png', 'finish10.png', 'finish15.png', 'finish20.png',
            'finish25.png', 'finish30.png', 'finish35.png', 'finish40.png',
            'finish45.png', 'finish50.png', 'finish55.png', 'finish60.png',
            'finish55.png', 'finish50.png', 'finish45.png', 'finish40.png',
            'finish35.png', 'finish30.png', 'finish25.png', 'finish20.png',
            'finish15.png', 'finish10.png', 'finish05.png' ] ;

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
  init: function(direction) {
    this.direction = direction;
  }
});

var Block = Movable.extend({
  spriteName: function() {
    return 'block_00.png';
  },
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

  read: function(name, callback) {
    var self = this;
    loadAsset("levels/" + name + ".txt", function(req) {
      self.finish(req.responseText, callback);
    });
  },

  finish: function(text, callback) {
    var lines = text.split(/\r?\n/);
    var ii = 0;
    var lvlTitle = lines[ii++];
    var lvlNumber = lines[ii++];
    var lvlEarned = lines[ii++];
    var lvlNewBots = lines[ii++];
    var lvlDesc = lines[ii++];

    var board = new Board();
    
    for (var row = 0; ii < lines.length ; ii++, row++) {
      var line = lines[ii];
      for (var col = 0 ; col < line.length ; col++) {
        var chr = line.charAt(col);

        var tiles = this.LEVEL_TILE_ENCODINGS[chr];
        if (tiles) {
          for (var jj = 0 ; jj < tiles.length ; jj++) {
            board.placeTile(tiles[jj], row, col);
          }
        }
      }
    }
    
    callback(board);
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

    this.board = null;
    this.levelReader = new LevelReader();
    this.ctx = canvas.getContext('2d');
    this.sprites = {};
    this.loadSpriteSheets(['movables', 'terrain'], 
                          bind(this, this.doneLoading));
  },

  doneLoading: function() {
    var self = this;
    var callback = function(board) {
      self.board = board;
      setInterval(bind(self, self.animate), 200);
    };
    this.levelReader.read("level01", callback);
  },
  
  animate: function() {
    //console.log("animating this = " + this);
    //console.log("this.board = " + this.board);
    for (var row = 0 ; row < this.board.height() ; row++) {
      for (var col = 0 ; col < this.board.width(); col++) {
        var cell = this.board.cellAt(row, col);
        if (cell) {
          for (var ii = 0 ; ii < cell.tiles.length ; ii++) {
            var spriteName = cell.tiles[ii].spriteName();
            if (spriteName instanceof Array) {
              spriteName = spriteName[frameno % spriteName.length];
            }
            this.drawSprite(spriteName, col * 30, row * 30);
          }
        }
      }
    }
    frameno++;
  },

  drawSprite: function(name, posx, posy) {
    var sprite = this.sprites[name];
    if (sprite) {
      this.ctx.drawImage(sprite.img, sprite.x, sprite.y, sprite.w, sprite.h,
                         posx, posy, sprite.w, sprite.h);
    }
  },

  loadSpriteSheets: function(names, callback) {
    var countdown = names.length;
    for (var i = 0 ; i < names.length ; i++) {
      this.loadSpriteSheet(names[i], function() {
        if (--countdown == 0) { callback(); }
      });
    }
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
      if (--countdown == 0) { callback() };
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
          img: imgObj
        };
        
        game.sprites[spriteName] = spriteRep;        
      }

      console.debug('loaded ' + jsonUrl);
      if (--countdown == 0) { callback() };
    });
  }

});


window.onload = function() { new Game(); };

