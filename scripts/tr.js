
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

var Block = Tile.extend({
  spriteName: function() {
    return 'block_00.png';
  },
});

var Start = Tile.extend({
  spriteName: function() {
    return ['start00.png', 'start10.png', 'start15.png', 'start20.png',
            'start25.png', 'start30.png', 'start35.png', 'start40.png',
            'start45.png', 'start50.png', 'start55.png', 'start60.png'] ;
  },
});

var Finish = Tile.extend({
  spriteName: function() {
    return ['finish00.png', 'finish10.png', 'finish15.png', 'finish20.png',
            'finish25.png', 'finish30.png', 'finish35.png', 'finish40.png',
            'finish45.png', 'finish50.png', 'finish55.png', 'finish60.png'] ;
  },
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

var tileTypeMap = {
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
  '{': [new Floor()], //enemy-left
  '}': [new Floor()], //enemy-right
  '[': [new Floor()], //enemy-up
  ']': [new Floor()]  //enemy-down
};

var Game = Class.extend({

  init: function() {
    var game = this;
    var canvas = document.getElementById('game');
    this.ctx = canvas.getContext('2d');
    this.sprites = {};
    this.loadSpriteSheets(['movables', 'terrain'], 
                          bind(this, this.doneLoading));
  },

  doneLoading: function() {
    setInterval(bind(this, this.animate), 300);
  },

  animate: function() {
    this.drawSprite(frames[frameno], 0, 0);
    frameno = (frameno + 1) % frames.length;
  },

  drawSprite: function(name, posx, posy) {
    var sprite = this.sprites[name];
    this.ctx.clearRect(posx, posy, sprite.w, sprite.h);
    this.ctx.drawImage(sprite.img, sprite.x, sprite.y, sprite.w, sprite.h,
                  posx, posy, sprite.w, sprite.h);
  },

  loadLevel: function(levelName, callback) {
    loadAsset("levels/" + levelName + ".txt", function(req) {
      
    });
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

