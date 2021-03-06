(function(exports) {

  // our DOM container and status message
  var map = d3.select("#team-map")
        .classed("loading", true),
      status = map.append("p")
        .html("Loading the map...");

  // URLs to grab
  var urls = {
    team: SITE_BASEURL + "/api/team/api.json",
    locations: SITE_BASEURL + "/api/locations/api.json",
    topology: SITE_BASEURL + "/assets/data/us-states.json"
  };

  // set up map size, projection, and <svg> container
  var width = 960,
      height = 600,
      proj = d3.geo.albersUsa()
        .scale(1285)
        .translate([width / 2, height / 2]),
      svg = map.append("svg")
        .attr("class", "map")
        .attr("viewBox", [0, 0, width, height].join(" "));

  // queue() loads the URLs in parallel, rather than
  // using nested callbacks
  queue()
    .defer(d3.json, urls.team)
    .defer(d3.json, urls.locations)
    .defer(d3.json, urls.topology)
    .await(function queued(error, team, locations, topology) {
      map.classed("loading", false);
      if (error) return showError(error.statusText);
      // kill the status message
      status.remove();

      // get a GeoJSON FeatureCollection from the topology
      var states = topojson.feature(topology, topology.objects.states);
      renderMapBackground(states.features);

      renderMapTeam(team, locations);
    });

  /*
   * Render an array of team members on the map by joining them
   * onto the airports list by FAA code.
   */
  function renderMapTeam(team, locations) {
    // group members by location
    var members = d3.values(team)
          .filter(function(d) { return d.location; }),
        byLocation = d3.nest()
          .key(function(d) { return d.location; })
          .map(members),
        map_locations = Object.keys(locations)
          .map(function(value, index) {
            var location = locations[value];
            location.code = value;
            return location;
          })
          .filter(function(i) {
            return i.team !== undefined;
          });
    // then draw them on the map
    renderMapLocations(map_locations);
  }

  /*
   * takes an array of GeoJSON features and draws them
   * into a background <g> using the projection `proj`.
   */
  function renderMapBackground(features) {
    var g = svg.append("g")
        .attr("class", "states background"),
      path = d3.geo.path()
        .projection(proj);

    feature = g.selectAll(".state")
      .data(features)
      .enter()
      .append("path")
        .attr("class", "state")
        .attr("d", path);
  }

  /*
   * takes a list of locations that look like:
   *
   * {
   *   code: "SFO",
   *   label: "San Francisco",
   *   latitude: <longitude>,
   *   longitude: <latitude>,
   *   team: []
   * }
   *
   * and draws them on the map as circles with radii proportional to
   * their member count.
   */
  function renderMapLocations(locations) {
    // size accessor (keeping things DRY)
    var size = function getSize(d) {
          return d.team ? d.team.length : 0;
        },
        // label accessor
        label = function getLabel(d) {
          var n = size(d),
              s = n === 1 ? "" : "s";
          return [d.code, ": ", size(d), " member" + s].join("");
        },
        // radius is a sqrt scale because a circle's area
        // is proportional to the square root of its radius
        radius = d3.scale.sqrt()
          .domain([1, d3.max(locations, size)])
          .rangeRound([10, 40])
          .clamp(true);

    // create a <g> container for the pins, and a <g.pin>
    // for each location
    var pins = svg.append("g")
          .attr("class", "pins"),
        pin = pins.selectAll(".pin")
          .data(locations)
          .enter()
          .append("g")
            .attr("class", "pin")
            .attr("transform", function(d) {
              // translate the pin to its projected coordinate
              var lat_lng = [d.longitude, d.latitude];
              var p = proj(lat_lng).map(Math.round);
              return "translate(" + p + ")";
            }),
        // wrap an anchor around each circle
        link = pin.append("a")
          .attr("xlink:href", function(d) {
            return "#" + d.code;
          }),
        // and draw a circle with a proportional radius
        circle = link.append("circle")
          .attr("aria-label", label)
          .attr("r", function(d) {
            // save the radius for later use
            return d.radius = radius(size(d));
          });

    // sort the pins (in the DOM) by latitude
    pin.sort(defaultSort);

    var tip = d3.tip()
      .attr("class", "map-tooltip")
      .direction(function(d) {
        return d.dir || "n";
      })
      .html(label);

    exports.mapTip = tip;

    svg.call(tip);

    // activate and deactiveate event handlers toggle the "on" class
    var activate = function activate(d) {
          tip.show.call(this, d);
          this.classList.add("on");
          // move this node to the front
          this.parentNode.appendChild(this);
        },
        deactivate = function deactivate(d) {
          tip.hide.call(this, d);
          this.classList.remove("on");
          // reset the sort order (in the DOM)
          pin.sort(defaultSort);
        };

    // add handlers for mouse and focus events
    pin
      .on("mouseover", activate)
      .on("mouseout", deactivate)
      .on("focus", activate)
      .on("blur", deactivate);
  }

  function showError(error) {
    map.classed("error", true);
    status.text("Error: " + error);
  }

  function defaultSort(a, b) {
    return d3.descending(a.radius, b.radius)
        || d3.descending(a.latitude, b.latitude)
        || d3.descending(a.longitude, b.longitude);
  }


  function extend(obj) {
    [].slice.call(arguments, 1).forEach(function(arg) {
      if (!arg) return;
      for (var key in arg) {
        obj[key] = arg[key];
      }
    });
    return obj;
  }

  function selectOrAppend(selection, selector) {
    if ((this instanceof d3.selection)) {
      return selection.each(function() {
        selectOrAppend(d3.select(this), selector);
      });
    }

    var child = selection.select(selector);
    if (!child.empty()) return child;

    var parts = selector.split("."),
        name = parts.shift(),
        klass = parts.join(" ");
    return selection.append(name)
      .attr("class", klass);
  }

})(this);
