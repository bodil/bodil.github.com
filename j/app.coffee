Φ = (1 + Math.sqrt 5) / 2
π = Math.PI

V3.avg = (ps) ->
  t = [ 0.0, 0.0, 0.0 ]
  for p in ps
    t = [ t[0] + p[0], t[1] + p[1], t[2] + p[2] ]
  ((c / ps.length) for c in t)

class Surface
  constructor: (@vertices, @colour, normal, radius, centre) ->
    @normal = normal or V3.normalize (V3.cross (V3.sub @vertices[2], @vertices[1]), (V3.sub @vertices[0], @vertices[1]))
    @centre = centre or V3.avg @vertices
    # The radius of the surface is the distance from the
    # centre to the farthest vertex.
    @radius = radius or Math.max ((V3.length (V3.sub v, @centre)) for v in @vertices)...

  transform: (entity) ->
    t = entity.position
    r = entity.rotation_matrix()
    new Surface ((V3.add (V3.mul4x4 r, v), t) for v in @vertices), @colour, (V3.mul4x4 r, @normal), @radius

  visible: (scene) ->
    v = V3.sub scene.camera, @vertices[0]
    0 > V3.dot @normal, v

  angle: (p) ->
    d = V3.normalize V3.sub @centre, p
    V3.dot @normal, d

  extremes: (p) ->
    # Get the two intersection points between the sphere
    # defined by the centre of the surface and its radius,
    # and a line running through the centre of the surface
    # and p.
    d = V3.scale (V3.direction p, @centre), @radius
    [ (V3.add @centre, d), (V3.sub @centre, d) ]

  hsl: (scale) ->
    [ h, s, l ] = @colour
    "hsl(#{h}, #{Math.round(s*100)}%, #{Math.round((l*scale)*100)}%)"

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
    @light_source = [-40, 0, 50]
    @light_source.falloff = 30.0

  # Assumes a static camera at [0,0,0] facing [0,0,0]
  project: (point) ->
    [dx, dy, dz] = point
    ez = 512
    if dz == 0 then [dx, dy] else [ dx * (ez / dz), dy * (ez / dz) ]

  light_intensity: (distance) ->
    1.0 / (distance / @light_source.falloff)

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

    # intersections = []

    for entity in @scene.entities
      lines = []
      obscured_lines = []
      for surface in ((surface.transform entity) for surface in entity.surfaces)
        ps = ((@project v) for v in surface.vertices)
        if surface.visible @scene
          lines.push ps
          [ p1, p2 ] = surface.extremes @scene.light_source
          p1_ = @project p1
          p2_ = @project p2
          # Create the gradient using the projected coords of the two extremes
          gradient = c.createLinearGradient p1_[0], p1_[1], p2_[0], p2_[1]
          l1 = @scene.light_intensity V3.length V3.sub p1, @scene.light_source
          l2 = @scene.light_intensity V3.length V3.sub p2, @scene.light_source
          gradient.addColorStop 0, surface.hsl l1
          gradient.addColorStop 1, surface.hsl l2
          c.fillStyle = gradient
          # intersections.push [p1_, p2_]

          c.beginPath()
          c.moveTo ps[0]...
          for p in ps[1..]
            c.lineTo p...
          c.fill()
        else
          obscured_lines.push ps

      for ps in obscured_lines
        c.strokeStyle = "rgba(0,0,0,0.05)"
        c.lineWidth = 3
        c.miterLimit = 1
        c.beginPath()
        c.moveTo ps[0]...
        for p in ps[1..]
          c.lineTo p...
        c.closePath()
        c.stroke()
      for ps in lines
        c.strokeStyle = "black"
        c.lineWidth = 3
        c.miterLimit = 1
        c.beginPath()
        c.moveTo ps[0]...
        for p in ps[1..]
          c.lineTo p...
        c.closePath()
        c.stroke()

    # for vs in intersections
    #   c.strokeStyle = "black"
    #   c.lineWidth = 2
    #   c.beginPath()
    #   c.moveTo vs[0]...
    #   c.lineTo vs[1]...
    #   c.stroke()

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

