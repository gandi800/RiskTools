var maps;
var conts;
var terrs;
var conns;

var ColorGradientSteps = new Array(9);
ColorGradientSteps[4] = ["#35ff14", "#c3c500", "#f28100", "#f33535"];
ColorGradientSteps[5] = ["#35ff14", "#aed400", "#e0a400", "#f66f00", "#f33535"];
ColorGradientSteps[6] = [
  "#35ff14",
  "#a0dd00",
  "#d0b800",
  "#ec8f00",
  "#f86400",
  "#f33535",
];
ColorGradientSteps[7] = [
  "#35ff14",
  "#95e300",
  "#c3c500",
  "#e0a400",
  "#f28100",
  "#f85c02",
  "#f33535",
];
ColorGradientSteps[8] = [
  "#35ff14",
  "#8ce700",
  "#b8ce00",
  "#d5b300",
  "#e99500",
  "#f57700",
  "#f8570f",
  "#f33535",
];
ColorGradientSteps[9] = [
  "#35ff14",
  "#86ea00",
  "#aed400",
  "#cbbd00",
  "#e0a400",
  "#ee8a00",
  "#f66f00",
  "#f85316",
  "#f33535",
];
ColorGradientSteps[10] = [
  "#35ff14",
  "#80ed00",
  "#a7d900",
  "#c3c500",
  "#d8af00",
  "#e79900",
  "#f28100",
  "#f76900",
  "#f84f1b",
  "#f33535",
];

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

const ev = new Event("MapLoaded");

async function MapChange() {
  $("#mapImg").attr("src", `./img/${map}.png`);
  maps = await LoadMaps();
  conts = await LoadContinents();
  terrs = await LoadTerritories();
  conns = await Loadconnections();

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
  alasql("CREATE TABLE TmpConns (TerritoryId number, ConnectedCt number)");
  alasql("CREATE TABLE Blizzards (BlizzardTerritoryId number)");
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
    );
    terPath.setAttribute("d", $(this)[0].Points);
    terPath.setAttribute("id", $(this)[0].Id);
    terPath.setAttribute("data-id", $(this)[0].Id);
    terPath.setAttribute("data-name", $(this)[0].TerritoryName);
    terPath.setAttribute("data-xoff", $(this)[0].NameXOffset);
    terPath.setAttribute("data-yoff", $(this)[0].NameYOffset);
    terPath.setAttribute("data-continent", $(this)[0].Continent);
    terPath.setAttribute("style", `stroke:${$(this)[0].Color}`);
    terPath.setAttribute("class", "territory");
    svg.appendChild(terPath);
  });

  //addTerritoriesName();
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

function addTextToId(id, text) {
  var d = document.getElementById(id);
  //if (typeof p.getBBox == 'function') {
  var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  var b = d.getBBox();

  var x = d.dataset.xoff * 1;
  var y = d.dataset.yoff * 1;
  t.setAttribute(
    "transform",
    "translate(" +
      (b.x + b.width / 2 + x) +
      " " +
      (b.y + b.height / 2 + y) +
      ")"
  );
  t.textContent = text;
  t.setAttribute("class", "names");
  d.parentNode.insertBefore(t, d.nextSibling);
}
