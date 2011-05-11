Raphael.fn.arrow = (origin, point, size) ->
  [x1, y1] = origin
  [x2, y2] = point
  angle = Math.atan2(x1-x2,y2-y1)
  angle = (angle / (2 * Math.PI)) * 360
  arrowPath = @path("M#{x2-size} #{y2-size} L#{x2} #{y2} L#{x2-size} #{y2+size}").attr("stroke-width", 3).rotate((90+angle),x2,y2)
  linePath = @path("M#{x1} #{y1} L#{x2} #{y2}").attr("stroke-width", 3)
  return @set().push arrowPath, linePath

Raphael.fn.axes = (chart) ->
  set = @set()
  [ox, oy, mx, my, spill] = [chart.origin.x, chart.origin.y, chart.extent.x, chart.extent.y, chart.axis_spill]
  ymin = [ ox, oy + spill ]
  ymax = [ ox, my ]
  xmin = [ ox - spill, oy ]
  xmax = [ mx, oy ]
  set.push @arrow ymin, ymax, 10
  set.push @arrow xmin, xmax, 10
  return set

Raphael.fn.graph = (chart, dataset, colour) ->
  set = @set()
  ct = 0
  x = -> Math.round(chart.origin.x + ct++ * chart.width / dataset.length)
  y = (value) -> Math.round(chart.origin.y - value * chart.height / chart.scale)
  points = ([x(), y(value), set, value] for value in dataset)
  path = @path("M" + (point[0..1].join(" ") for point in points).join " L").attr
        "stroke-width": 3
        "stroke": colour
  set.push path
  set.graph_points = (@circle(p[0], p[1], 1).attr("stroke", colour).attr("stroke-width", 3) for p in points)
  (set.push point) for point in set.graph_points
  set.datapoints = points
  return set

paper = window.paper = Raphael "paper", $("#paper").innerWidth() - 40, 500

chart =
  padding: 40
  axis_spill: 20

  scale: 50

  graphs: []

  draw: ->
    @origin =
      x: @padding
      y: paper.height - @padding
    @extent =
      x: paper.width - @padding
      y: @padding
    @width = @extent.x - @origin.x
    @height = @origin.y - @extent.y
    @axes = paper.axes this
    @tooltip = paper.circle(0, 0, 10).attr
      "stroke-width": 3
      "stroke": "black"
      "fill": "yellow"
      "fill-opacity": 0.5
      "opacity": 0
    same_point = (p1, p2) ->
      if p1 == null or p2 == null then p1 == p2 else p1[0] == p2[0] and p1[1] == p2[1]
    $(paper.canvas).mousemove (event) =>
      point = @closest_datapoint event.offsetX, event.offsetY
      newpoint = if point[0] < 40 then point[1] else null
      if same_point newpoint, @active_point then return
      @active_point = newpoint
      if @active_point
        [x, y, graph, value] = @active_point
        @tooltip.toFront()
        if @tooltip.attr("opacity") == 0
          @tooltip.attr { "cx": x, "cy": y }
        @tooltip.animate({
          "opacity": 1
          "cx": x
          "cy": y
        }, 100, ">")
        @select_graph graph
      else
        @tooltip.animate { "opacity": 0}, 100, ">"
        @select_graph null

  select_graph: (selected_graph) ->
    for graph in @graphs
      graph.animate { "opacity": if graph == selected_graph or selected_graph == null then 1 else 0.4 }, 100, ">"

  add: (graph) ->
    @graphs.push graph
    @datapoints = [].concat (graph.datapoints for graph in @graphs)...

  closest_datapoint: (x, y) ->
    distance = (point) ->
      dx = Math.abs(x - point[0])
      dy = Math.abs(y - point[1])
      [ Math.sqrt(dx*dx + dy*dy), point ]
    ((distance(point) for point in @datapoints).sort (a, b) -> a[0] - b[0])[0]

chart.draw()

dataset = (offset) -> ((offset + Math.random() * 20) for x in [0..10])

chart.add paper.graph chart, dataset(30), "red"
chart.add paper.graph chart, dataset(20), "blue"
chart.add paper.graph chart, dataset(10), "green"

