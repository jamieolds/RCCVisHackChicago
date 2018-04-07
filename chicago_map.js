// Various formatters.
var formatNumber = d3.format(",d"),
  formatChange = d3.format("+,d"),
  formatDate = d3.time.format("%B %d, %Y"),
  formatTime = d3.time.format("%I:%M %p");


// data across years

var width = 800,
    height = 800;


var the_key =null; 
var map_dataset = null; 

var color = d3.scale.linear().domain([0,20]).clamp(true).range(['#fff','#409A99']); 

// array of ids 
var ids = [] 

// dictionary of d3 maps 
var datasets= {};
var extents = {}; 


var path = d3.geo.path().projection(d3.geo.albers().scale(62000).translate([-6600,height*5.2]));

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .direction('n')
  .html(function(d) {
   

   var id = getID(d); 
   str = id + "<br/>"; 
   for (key in datasets) 
   {
      str += datasets[key].get(id)+ "<br/>"
   }
   return str; 
 });
    
svg.call(tip);

//var legend = d3.select("#map-legend").
//  append("svg:svg").
//  attr("width", 160).
//  attr("height", 10)
//for (var i = 0; i <= 7; i++) {
//  legend.append("svg:rect").
//  attr("x", i*20).
//  attr("height", 10).
//  attr("width", 20).
//  attr("class", "q" + i + "-9 ");//color
//};

var cf = crossfilter(); 
var all = cf.groupAll();
var cf_item = {}; 
var cf_items = {}; 

queue()
    .defer(d3.json,"chicago.geojson")
    .defer(d3.tsv,"comm_area_data.tsv", function(d) {

      //this is our first time through 

      if (the_key === null) 
      {
        var idx = 0; 
        for (var i in d) 
        {
          if (idx==0) the_key = i; 
          else if (idx==1) map_dataset = i; 
          idx++; 
        }

        console.log("key: " + the_key); 
        console.log("map: " + map_dataset); 

        for (var i in d)
        {
          if (i == the_key) continue; 
          datasets[i] =d3.map(); 
          cf_item[i] = cf.dimension(function(d) { return d[i]; }); 
          cf_items[i] = cf_item[i].group(); 
          d3.select("#charts").append("div").attr("id",i+"_chart").attr("class","chart"); 

        }
      }

      for(var i in d) {
        //Convert to numbers... ift they are numbers 
        if (!isNaN(+d[i]))
        {
          d[i] = +d[i];
        }
 
        //Set the key to the first column... hopefully it processes it in order! 
        if (i != the_key) 
        {
          datasets[i].set(d[the_key], d[i]); 
        }
      }

      cf.add([d]);
      ids.push(d[the_key]);
    })
    .await(ready);

function ready(error, M) {

  if (error) throw error; 

  for (i in datasets)
  {
    var vmin = null;
    var vmax = null;

    for (j=0; j < datasets[i].values().length; j++)
    {
      var v = datasets[i].values()[j]; 
      if (vmin == null || v < vmin) vmin =v;
      if (vmax == null || v > vmax) vmax =v;

    }
    extents[i] = [vmin,vmax]; 
    console.log("min/max " + i + ":" + vmin + " "+ vmax); 
  }


  svg.append("g")
      .attr("class", "regions")
    .selectAll("path")
      .data(M.features)
    .enter().append("path")
      .style('fill', getColor)
      .attr("id", getID)
      .attr("d", path)
      .on('mouseover',tip.show)
      .on('mouseout', tip.hide);


 // var bbox = svg.selectAll("path").node().getBBox();
//  var center = [bbox.x + bbox.width/2, bbox.y + bbox.height/2]; 
 // var scale = 10; 

//  svg.attr("transform", "scale(" + scale + ")" + "translate("+ center[0] + "," +center[1]+")"); 
//  svg.attr("transform", "scale(20)translate(100,100)"); 

  var charts = []; 
  
  for (d in datasets) 
  {
    charts.push(
    barChart(true)
      .dimension(cf_item[d])
      .group(cf_items[d])
    .x(d3.scale.linear())); 

  }

  var chart = d3.selectAll(".chart")
    .data(charts)
    .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

  renderAll();

  // barChart
  function barChart(percent) {
    if (!barChart.id) barChart.id = 0;

    percent = typeof percent !== 'undefined' ? percent : false;
    var formatAsPercentage = d3.format(".0%");
    
    var axis = d3.svg.axis().orient("bottom");
    if (percent == true) {
      axis.tickFormat(formatAsPercentage);
      
    }
    var margin = {top: 10, right: 10, bottom: 20, left: 10},
      x,
      y = d3.scale.linear().range([50, 0]),
      id = barChart.id++,
      brush = d3.svg.brush(),
      brushDirty,
      dimension,
      group,
      round;

    function chart(div) {
      var width = x.range()[1],
          height = y.range()[0];

      try {
        y.domain([0, group.top(1)[0].value]);
      }
      catch(err) {
        window.reset
      } 

      div.each(function() {
        var div = d3.select(this),
            g = div.select("g");

        // Create the skeletal chart.
        if (g.empty()) {
          div.select(".title").append("a")
              .attr("href", "javascript:reset(" + id + ")")
              .attr("class", "reset")
              .text("reset")
              .style("display", "none");

          g = div.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          g.append("clipPath")
              .attr("id", "clip-" + id)
            .append("rect")
              .attr("width", width)
              .attr("height", height);

          g.selectAll(".bar")
              .data(["background", "foreground"])
            .enter().append("path")
              .attr("class", function(d) { return d + " bar"; })
              .datum(group.all());

          g.selectAll(".foreground.bar")
              .attr("clip-path", "url(#clip-" + id + ")");

          g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + height + ")")
              .call(axis);

          // Initialize the brush component with pretty resize handles.
          var gBrush = g.append("g").attr("class", "brush").call(brush);
          gBrush.selectAll("rect").attr("height", height);
          gBrush.selectAll(".resize").append("path").attr("d", resizePath);
        }

        // Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll(".brush").call(brush);
          div.select(".title a").style("display", brush.empty() ? "none" : null);
          if (brush.empty()) {
            g.selectAll("#clip-" + id + " rect")
                .attr("x", 0)
                .attr("width", width);
          } else {
            var extent = brush.extent();
            g.selectAll("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
          }
        }

        g.selectAll(".bar").attr("d", barPath);
      });

      function barPath(groups) {
        var path = [],
            i = -1,
            n = groups.length,
            d;
        while (++i < n) {
          d = groups[i];
          path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
        }
        return path.join("");
      }

      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }
    }

    brush.on("brushstart.chart", function() {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
      var g = d3.select(this.parentNode),
          extent = brush.extent();
      if (round) g.select(".brush")
          .call(brush.extent(extent = extent.map(round)))
        .selectAll(".resize")
          .style("display", null);
      g.select("#clip-" + id + " rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));

      var selected = [];

      dimension.filterRange(extent).top(Infinity).forEach(function(d) {
        selected.push(d.id)
      });
      svg.attr("class", "counties")
        .selectAll("path")
          .style("fill", function(d) { if (selected.indexOf(d.id) >= 0) {return "q8-9"} else if (extant.indexOf(d.id) >= 0) {return "q5-9"} else {return null;}});

    });

    brush.on("brushend.chart", function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", "none");
        div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
        dimension.filterAll();
      }
    });

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = function(_) {
      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };

    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    return d3.rebind(chart, brush, "on");
  }

  // Renders the specified chart or list.
  function render(method) {
    d3.select(this).call(method);
  }

  // Whenever the brush moves, re-rendering everything.
  function renderAll() {
    chart.each(render);
  }

  window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
  };

  window.reset = function(i) {
    charts.forEach(function (c) {
      c.filter(null);
    })
    renderAll();
    svg.attr("class", "counties")
      .selectAll("path")
        .style("fill", getColor); 
  };

}

function getColor(d) 
{
  console.log("Inside getColor"); 
  console.log(getID(d)); 
  console.log(datasets[map_dataset].get(getID(d))); 
  var v = (20 * (datasets[map_dataset].get(getID(d)) - extents[map_dataset][0]) / ( extents[map_dataset][1] - extents[map_dataset][0])); 
  console.log(v); 
  return color(v); 
}


function getID(d) 
{
  return d.properties[the_key]; 
}


