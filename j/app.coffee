Φ = (1 + Math.sqrt 5) / 2
π = Math.PI

V3.avg = (ps) ->
  t = [ 0.0, 0.0, 0.0 ]
  for p in ps
    t = [ t[0] + p[0], t[1] + p[1], t[2] + p[2] ]
  ((c / ps.length) for c in t)

hsl = (colour) ->
  [ h, s, l ] = colour
  "hsl(#{h}, #{Math.round(s*100)}%, #{Math.round(l*100)}%)"

class Surface
  constructor: (@vertices, @colour, normal, centre) ->
    @normal = normal or V3.normalize (V3.cross (V3.sub @vertices[2], @vertices[1]), (V3.sub @vertices[0], @vertices[1]))
    @centre = centre or V3.avg @vertices

  transform: (entity) ->
    t = entity.position
    r = entity.rotation_matrix()
    new Surface ((V3.add (V3.mul4x4 r, v), t) for v in @vertices), @colour, (V3.mul4x4 r, @normal)

  visible: (scene) ->
    v = V3.sub scene.camera, @vertices[0]
    0 > V3.dot @normal, v

  angle: (p) ->
    d = V3.normalize V3.sub @centre, p
    V3.dot @normal, d

class Entity
  constructor: (@position, @surfaces) ->
    @orientation = [0, 0, 0]

  rotate: (r) ->
    @orientation = V3.add @orientation, r

  rotation_matrix: ->
    r = M4x4.makeRotate @orientation[0], [1, 0, 0]
    r = M4x4.rotate @orientation[1], [0, 1, 0], r
    M4x4.rotate @orientation[2], [0, 0, 1], r

class Scene
  constructor: (@entities) ->
    @camera = [0, 0, 0]
    @ambient_light = 0.6
    @light_source = [0, 0, 0]

  # Assumes a static camera at [0,0,0] facing [0,0,0]
  project: (point) ->
    [dx, dy, dz] = point
    ez = 512
    [ dx * (ez / dz), dy * (ez / dz) ]

class CanvasEngine
  constructor: (@viewport, @scene) ->
    { clientWidth: @width, clientHeight: @height } = @viewport
    [ @halfWidth, @halfHeight ] = [ @width / 2, @height / 2 ]

  project: (point) ->
    [x, y] = @scene.project point
    [ x + @halfWidth, y + @halfHeight ]

  render: ->
    c = @viewport.getContext "2d"
    c.clearRect 0, 0, @width, @height

    for entity in @scene.entities
      for surface in ((surface.transform entity) for surface in entity.surfaces)
        if surface.visible @scene
          angle = surface.angle @scene.light_source
          ps = ((@project v) for v in surface.vertices)
          c.fillStyle = hsl [surface.colour[0], surface.colour[1], surface.colour[2] * (@scene.ambient_light + angle * (1 - @scene.ambient_light))]
          c.beginPath()
          c.moveTo ps[0]...
          for p in ps[1..]
            c.lineTo p...
          c.fill()

cube = (size, centre...) ->
  surfaces = [
    new Surface [
      [-size, -size, -size]
      [ size, -size, -size]
      [ size,  size, -size]
      [-size,  size, -size]
    ], [0, 1.0, 0.5]
    new Surface [
      [-size, -size, size]
      [-size,  size, size]
      [ size,  size, size]
      [ size, -size, size]
    ], [0, 1.0, 0.5]
    new Surface [
      [-size, -size, -size]
      [-size, -size,  size]
      [ size, -size,  size]
      [ size, -size, -size]
    ], [120, 1.0, 0.35]
    new Surface [
      [-size,  size, -size]
      [ size,  size, -size]
      [ size,  size,  size]
      [-size,  size,  size]
    ], [120, 1.0, 0.35]
    new Surface [
      [ size, -size, -size]
      [ size, -size,  size]
      [ size,  size,  size]
      [ size,  size, -size]
    ], [240, 1.0, 0.5]
    new Surface [
      [-size, -size, -size]
      [-size,  size, -size]
      [-size,  size,  size]
      [-size, -size,  size]
    ], [240, 1.0, 0.5]
  ]
  new Entity centre, surfaces

$.domReady ->
  box = cube 10, 0, 0, 50
  scene = new Scene [ box ]
  engine = new CanvasEngine (document.getElementById "viewport"), scene
  interval = setInterval ->
    engine.render()
    box.rotate [0.015, 0.005, 0.01]
  , 1000/50
  $("#viewport").click ->
    clearInterval interval
    $("#viewport").unbind "click"
    console.log scene

