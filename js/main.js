var maps;
var conts;
var terrs;
var conns;

async function initMapDdl() {
  maps = await LoadMaps();

  $.each(maps, function () {
    $("#mapSelect").append(
      $("<option>", {
        value: $(this)[0].Map,
        text: ($(this)[0].Done == 0 ? "To Do - " : "") + $(this)[0].Name,
        disabled: $(this)[0].Done == 0,
      })
    );
  });

  $("#mapSelect").prepend(
    $("<option>", {
      value: -1,
      text: "Select Map...",
      disabled: true,
      selected: true,
    })
  );
}

$("#mapSelect").change(function () {
    map = $(this).val();
    if (map != -1) {
        MapChange();
    }
});

const ev = new Event('MapLoaded');

async function MapChange() {
    $("#mapImg").attr("src", `./img/${map}.png`);
    var img = document.getElementById("mapImg");

    conts = await LoadContinents();
    terrs = await LoadTerritories();
    conns = await Loadconnections();
    
    window.initCanvas(img);
    
    document.dispatchEvent(ev);
}

async function CreateTables() {
  alasql(
    "CREATE TABLE Maps (Id number, Map string, Name string, Blizzards number, Portals number, TotalTerritories number, TotalContinents number, Done number)"
  );
  alasql(
    "CREATE TABLE Continents (Id number, Map string ,Continent string, TroopBonus number, Color string, TerritoryCount number)"
  );
  alasql(
    "CREATE TABLE Territories (Id number, Map string, TerritoryName string, Continent number, NameXOffset number, NameYOffset number, Points string)"
  );
  alasql(
    "CREATE TABLE Connections (Id number, TerritoryId number, ConenctedTerritoryId number)"
  );
  alasql(
    "CREATE TABLE TmpConnections (Id, Map string, TerritoryId number, ConenctedTerritoryId number)"
  );
  alasql("CREATE TABLE Blizzards (BlizzardTerritoryId Number)");
}



async function LoadMaps() {
  await alasql.promise(`DELETE FROM Maps`);
  await alasql.promise(
    `SELECT * INTO Maps FROM CSV("data/maps.csv", {headers:true})`
  );
  return await alasql(`SELECT * FROM Maps ORDER BY Done DESC, Name ASC`);
}

async function LoadContinents() {
  await alasql.promise(`DELETE FROM Continents`);
  await alasql.promise(
    `SELECT * INTO Continents FROM CSV("data/` +
      map +
      `/continents.csv", {headers:true}) ORDER BY Continent`
  );
  return await alasql(`SELECT * FROM Continents`);
}

async function LoadTerritories() {
  await alasql.promise(`DELETE FROM Territories`);
  await alasql.promise(
    `SELECT * INTO Territories FROM CSV("data/` +
      map +
      `/territories.csv", {headers:true}) ORDER BY Continent, TerritoryName`
  );

  DrawTerrPaths();
  return await alasql(`SELECT * FROM Territories`);
}

async function Loadconnections() {
  await alasql.promise(`DELETE FROM Connections`);
  await alasql.promise(
    `SELECT * INTO Connections FROM CSV("data/` +
    map +
    `/connections.csv", {headers:true})`
  );
  return await alasql(`SELECT * FROM Connections`);
}


function DrawTerrPaths() {
  var svg = document.getElementById("mapSvg");

  $("#mapSvg path").remove();
  $("#mapSvg text").remove();

  terrs = alasql(
    `SELECT t.*, c.Color FROM Territories t LEFT JOIN Continents c ON t.Continent = c.Id ORDER BY t.Continent, t.TerritoryName`
  );
  $.each(terrs, function () {
    var terPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    ); //Create a path in SVG's namespace
    terPath.setAttribute("d", $(this)[0].Points);
    terPath.setAttribute("data-id", $(this)[0].Id);
    terPath.setAttribute("data-name", $(this)[0].TerritoryName);
    terPath.setAttribute("data-xoff", $(this)[0].NameXOffset);
    terPath.setAttribute("data-yoff", $(this)[0].NameYOffset);
    terPath.setAttribute("data-continent", $(this)[0].Continent);
    terPath.setAttribute("style", `stroke:${$(this)[0].Color}`);
    terPath.setAttribute("class", "territory");
    svg.appendChild(terPath);
  });

  addTerritoriesName();
}

function addTerritoriesName() {
  var paths = $("path");

  $.each(paths, function () {
    addText($(this));
  });
}

function addText(d) {
  var p = d[0];
  //if (typeof p.getBBox == 'function') {
  var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  var b = p.getBBox();

  var x = d.attr("data-xoff") * 1;
  var y = d.attr("data-yoff") * 1;
  t.setAttribute(
    "transform",
    "translate(" +
      (b.x + b.width / 2 + x) +
      " " +
      (b.y + b.height / 2 + y) +
      ")"
  );
  var name = d.attr("data-name") ? d.attr("data-name") : d.attr("data-id");
  t.textContent = name;
  t.setAttribute("class", "names");
  p.parentNode.insertBefore(t, p.nextSibling);
}
