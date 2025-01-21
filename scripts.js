////////////////////////////////////////
//VARIABLES
////CONSTANTS
const body = document.getElementById("main")
const table = document.getElementById("world_table")
const settings_table = document.getElementById("settings_table")
////SETTINGS
let size = 150
let generation_smoothening = 20
let generation_type_smoothening = 10
let smoothening_weight = 0.15
let type_smoothening_threshold = 0.8
let type_smoothening_threshold_decay = 0.03
let type_smoothening_fail_chance = 0.2
let decoration_iterations = 5
let generation_type = "grid"
let grid_steps = 7
let grid_value_decay = 0.3
////OTHER VARIABLES
let tiles = []
let entities = []
let decorations = []

let expected_calls = 1
let calls = 0
let done = false
let can_go = false
let square_length = 0
////////////////////////////////////////
//LOADING FUNCTIONS
function LoadTable() {

    console.log("Loading Table...")

    table.innerHTML = ""

    table.cellSpacing = 0
    for (let y = 0; y < size; y++) {

        let tr = document.createElement("tr")
        for (let x = 0; x < size; x++) {

            let td = document.createElement("td")
            td.style.width = square_length + "px"
            td.style.maxWidth = square_length + "px"
            td.style.height = square_length + "px"
            td.style.maxHeight = square_length + "px"
            tr.appendChild(td)       
        }    
        table.appendChild(tr)
    }
    body.appendChild(table)
}

async function SmoothenTiles() {

    for (let i = 0; i < generation_smoothening; i++) {

        console.log("Smoothening Tiles... (" + (i+1) + "/" + generation_smoothening + ")")
        let map_of_average = [];

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let count = 0;
                let sum = 0;

                for (let offset_y = -2; offset_y <= 2; offset_y++) {
                    for (let offset_x = -2; offset_x <= 2; offset_x++) {
                        let neighbour_y = y + offset_y;
                        let neighbour_x = x + offset_x;

                        if (neighbour_y >= 0 && neighbour_y < size && neighbour_x >= 0 && neighbour_x < size) {
                            sum += tiles[neighbour_y * size + neighbour_x].height;
                            count++;
                        }
                    }
                }

                map_of_average.push(sum / count);
            }
        }

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                tiles[y * size + x].height += map_of_average[y * size + x] * smoothening_weight
                tiles[y * size + x].height /= 1 + smoothening_weight
            }
        }

        AssignTypeToTiles()
        ShowTiles()

        await new Promise(r => setTimeout(r, 125));
    }

    await SmoothenTilesByType()
}

async function SmoothenTilesByType() {

    let smoothening_threshold = type_smoothening_threshold

    for (let i = 0; i < generation_type_smoothening; i++) {

        console.log("Smoothening Tiles by Type... (" + (i+1) + "/" + generation_type_smoothening + ")")

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let count = 0;
                let counts = new Map

                for (let offset_y = -1; offset_y <= 1; offset_y++) {
                    for (let offset_x = -1; offset_x <= 1; offset_x++) {
                        let neighbour_y = y + offset_y;
                        let neighbour_x = x + offset_x;

                        if (neighbour_y >= 0 && neighbour_y < size && neighbour_x >= 0 && neighbour_x < size) {
                            
                            let neighbour_type = tiles[neighbour_y * size + neighbour_x].type
                            if (neighbour_type != tiles[y * size + x].type) {
                                if (counts.get(neighbour_type) == undefined)
                                    counts.set(neighbour_type, 1)
                                else
                                    counts.set(neighbour_type, counts.get(neighbour_type) + 1)
                            }
                            count++;
                        }
                    }
                }
                let max_key = null;
                let max_value = -Infinity;
                
                for (let [key, value] of counts) {
                    if (value > max_value) {
                        max_value = value;
                        max_key = key;
                    }
                }

                if (max_value / count > smoothening_threshold) {

                    if (!Chance(type_smoothening_fail_chance))
                        tiles[y * size + x].type = max_key
                }

            }
        }

        smoothening_threshold *= 1 - type_smoothening_threshold_decay

        ShowTiles()
        await new Promise(r => setTimeout(r, 125));
    }
}

function AssignTypeToTiles() {

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {

            let type
            if (tiles[y * size + x].height < 0.30) type = "deep_water"
            else if (tiles[y * size + x].height < 0.40) type = "water"
            else if (tiles[y * size + x].height < 0.58) type = "dirt"
            else if (tiles[y * size + x].height < 0.62) type = "hills"
            else if (tiles[y * size + x].height < 0.70) type = "mountains"
            else type = "cliffs"
            tiles[y * size + x].type = type
        }
    }
}

async function FillTiles() {

    console.log("Generating Random Tiles...")

    tiles = []

    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
            tiles.push({
                "type": "",
                "height": 0.5
            })

    switch (generation_type) {
        case "lines":
        default:
            let past_height = 0.5
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
          
                    let height = Math.random()
        
                    while (Math.abs(height - past_height) > 0.40)
                        height = Math.random()
        
                    past_height = height
                    tiles[y * size + x].height = height
                }
                past_height = 0.5
            }
            AssignTypeToTiles()
            ShowTiles()
            break;

        case "grid":
            calls = 0
            expected_calls = 1
            done = false
            can_go = false
            GenerateGridSquare(0, size, 0, size, 1, 0)
            await Until(() => done)
            break;
    }
    await SmoothenTiles()
}

async function ShowGridFrame(step) {
    calls++

    if (calls != expected_calls) return;

    console.log("Generating Grid...(" + (step+1) + "/" + grid_steps + ")")
    calls = 0
    expected_calls *= 4
    can_go = true

    if (expected_calls >= Math.pow(4, grid_steps)) done = true

    AssignTypeToTiles()
    ShowTiles()

    await new Promise(r => setTimeout(r, 125));
    can_go = false
}

async function GenerateGridSquare(x1, x2, y1, y2, weight, step) {

    if (step != 0) {

        let height = Math.random()
        let weight_plus_one = 1 + weight

        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {

                let index = y * size + x //performance cause half calculations
                tiles[index].height += height * weight
                tiles[index].height /= weight_plus_one

            }
        }
    }

    ShowGridFrame(step)
    await Until(() => can_go)

    if (step+1 < grid_steps) {

        await Until(() => !can_go)

        delta_x = x2 - x1
        delta_y = y2 - y1
        GenerateGridSquare(x1, parseInt(x1+delta_x/2), y1, parseInt(y1+delta_y/2), weight * (1 - grid_value_decay), step+1)
        GenerateGridSquare(x1, parseInt(x1+delta_x/2), parseInt(y1+delta_y/2), y2, weight * (1 - grid_value_decay), step+1)
        GenerateGridSquare(parseInt(x1+delta_x/2), x2, y1, parseInt(y1+delta_y/2), weight * (1 - grid_value_decay), step+1)
        GenerateGridSquare(parseInt(x1+delta_x/2), x2, parseInt(y1+delta_y/2), y2, weight * (1 - grid_value_decay), step+1)
    }
}

function ShowTiles() {

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
  
            switch (tiles[y * size + x].type) {
                case "deep_water": table.children.item(y).children.item(x).style.backgroundColor = "deepskyblue" 
                break
                case "water": table.children.item(y).children.item(x).style.backgroundColor = "skyblue" 
                break
                case "dirt": table.children.item(y).children.item(x).style.backgroundColor = "lightgreen" 
                break
                case "hills": table.children.item(y).children.item(x).style.backgroundColor = "mediumseagreen"
                break
                case "mountains": table.children.item(y).children.item(x).style.backgroundColor = "darkgray"
                break
                case "cliffs": table.children.item(y).children.item(x).style.backgroundColor = "gray"
                break
            }
        }
    }
}

async function GenerateDecorations() {

    for (let i = 0; i < size * size; i++) {
        decorations.push({
            "type": ""
        })
    }

    for (let i = 0; i < decoration_iterations; i++) {

        console.log("Generating Decorations... (" + (i+1) + "/" + decoration_iterations + ")")

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {

                GenerateDecoration(x, y, "")
            }
        }

        ApplyDecorations()
        await new Promise(r => setTimeout(r, 125));
    }
}

function GenerateDecoration(x, y, decoration_type) {

    if (decorations[y * size + x].type != "")
        decoration_type = decorations[y * size + x].type

    switch (tiles[y * size + x].type) {
        case "water": //fish, algae
            switch (decoration_type) {
                case "fish":
                    decorations[y * size + x].type = "fish"
                    if (Chance(0.02)) GenerateDecoration(KeepInBounds(x + RandomInteger(-1, 1), size-1), KeepInBounds(y + RandomInteger(-1, 1), size-1), "fish")
                    break
                case "algae":
                    decorations[y * size + x].type = "algae"
                    if (Chance(0.1)) GenerateDecoration(KeepInBounds(x + RandomInteger(-1, 1), size-1), KeepInBounds(y + RandomInteger(-1, 1), size-1), "algae")
                    break
                default:
                    if (Chance(0.005)) GenerateDecoration(x, y, "fish")
                    else if (Chance(0.005)) GenerateDecoration(x, y, "algae")
                    break
            }
            break
        case "dirt": //tree, flower
            break
        case "hills": //tree * 2
            break
        case "cliffs": //snow
            break
    }
}

function ApplyDecorations() {

    console.log("Applying Decorations...")

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
  
            switch (decorations[y * size + x].type) {
                case "fish": table.children.item(y).children.item(x).innerHTML = "f"
                break
                case "algae": table.children.item(y).children.item(x).innerHTML = "a"
                break
            }
        }
    }
}

function LoadSettingsTable() {

    let setting_function = (name, tr, input_type, base_value) => {

        let td = document.createElement("td")
        td.className = "settingcell"
        td.innerHTML = "<label for='" + name.toLowerCase().replaceAll(" ", "_").replaceAll("%", "") +"'>" + name + "</label><br><input type='" + input_type + "' id='" + name.toLowerCase().replaceAll(" ", "_").replaceAll("%", "") + "' value='" + base_value + "'>"
        tr.appendChild(td)
    }

    let tr = document.createElement("tr")
    setting_function("Size", tr, "number", size)
    setting_function("Smoothening Iterations", tr, "number", generation_smoothening)
    setting_function("Type Smoothening Iterations", tr, "number", generation_type_smoothening)
    setting_function("Smoothening Weight%", tr, "number", smoothening_weight)
    setting_function("Type Smoothening Threshold%", tr, "number", type_smoothening_threshold)
    setting_function("Type Smoothening Decay%", tr, "number", type_smoothening_threshold_decay)
    settings_table.appendChild(tr)

    tr = document.createElement("tr")
    setting_function("Type Smoothening Fail%", tr, "number", type_smoothening_fail_chance)
    setting_function("Generation Type", tr, "text", generation_type)
    setting_function("Grid Steps", tr, "number", grid_steps)
    setting_function("Grid Decay%", tr, "number", grid_value_decay)
    setting_function("Decoration Iterations", tr, "number", decoration_iterations)
    settings_table.appendChild(tr)


    
    let button = document.createElement("button")
    button.innerHTML = "Start Simulation"
    button.id = "button_start"
    button.onclick = Start
    tr = document.createElement("tr")
    let td = document.createElement("td")
    tr.appendChild(document.createElement("td")); tr.appendChild(document.createElement("td")); 
    td.colSpan = 2
    td.appendChild(button)
    tr.appendChild(td)
    tr.appendChild(document.createElement("td")); tr.appendChild(document.createElement("td")); 
    settings_table.appendChild(tr)
}

function GetSettings() {

    if (document.getElementById("size").value < 50) return false
    else size = document.getElementById("size").value

    if (document.getElementById("smoothening_iterations").value < 0) return false
    else generation_smoothening = document.getElementById("smoothening_iterations").value

    if (document.getElementById("type_smoothening_iterations").value < 0) return false
    else generation_type_smoothening = document.getElementById("type_smoothening_iterations").value

    if (document.getElementById("smoothening_weight").value < 0 || document.getElementById("smoothening_weight").value > 1) return false
    else smoothening_weight = parseFloat(document.getElementById("smoothening_weight").value)

    if (document.getElementById("type_smoothening_threshold").value < 0 || document.getElementById("type_smoothening_threshold").value > 1) return false
    else type_smoothening_threshold = parseFloat(document.getElementById("type_smoothening_threshold").value)

    if (document.getElementById("type_smoothening_decay").value < 0 || document.getElementById("type_smoothening_decay").value > 1) return false
    else type_smoothening_threshold_decay = parseFloat(document.getElementById("type_smoothening_decay").value)

    if (document.getElementById("type_smoothening_fail").value < 0 || document.getElementById("type_smoothening_fail").value > 1) return false
    else type_smoothening_fail_chance = parseFloat(document.getElementById("type_smoothening_fail").value)

    if (document.getElementById("generation_type").value != "lines" && document.getElementById("generation_type").value != "grid") return false
    else generation_type = document.getElementById("generation_type").value

    if (document.getElementById("grid_steps").value < 1) return false
    else grid_steps = document.getElementById("grid_steps").value

    if (document.getElementById("grid_decay").value < -1 || document.getElementById("grid_decay").value > 1) return false
    else grid_value_decay = parseFloat(document.getElementById("grid_decay").value)

    if (document.getElementById("decoration_iterations").value < 0) return false
    else decoration_iterations = document.getElementById("decoration_iterations").value

    return true
}
////////////////////////////////////////
//HELPER FUNCTIONS
function Chance(chance) {
    return chance > Math.random()
}

function RandomInteger(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

function KeepInBounds(num, max) {

    return Math.min(Math.max(num, 0), max)
}

function Until(condition_function) {

    const poll = resolve => {
      if(condition_function()) resolve();
      else setTimeout(_ => poll(resolve), 20);
    }
  
    return new Promise(poll);
}
////////////////////////////////////////
//RUNTIME
async function Start() {
    
    if (!GetSettings()) return;
    LoadTable()
    await FillTiles()
    //await GenerateDecorations()
}

function Update() {

    square_length = table.style.width / size
}

LoadSettingsTable()
let update_interval = setInterval(Update, 100);