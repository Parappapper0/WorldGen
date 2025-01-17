////////////////////////////////////////
//VARIABLES
const body = document.getElementsByTagName("body")[0]
const table = document.createElement("table")
const size_x = 150
const size_y = 150
const square_length = 5
const generation_smoothening = 20
const generation_type_smoothening = 10
const smoothening_weight = 0.15
const type_smoothening_treshold = 0.8
const type_smoothening_treshold_decay = 0.03
const type_smoothening_fail_chance = 0.2
const decoration_iterations = 5
let tiles = []
let entities = []
let decorations = []

////////////////////////////////////////
//LOADING FUNCTIONS
function LoadTable() {

    console.log("Loading Table...")

    table.cellSpacing = 0
    for (let y = 0; y < size_y; y++) {

        let tr = document.createElement("tr")
        for (let x = 0; x < size_x; x++) {

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

        for (let y = 0; y < size_y; y++) {
            for (let x = 0; x < size_x; x++) {
                let count = 0;
                let sum = 0;

                for (let offset_y = -1; offset_y <= 1; offset_y++) {
                    for (let offset_x = -1; offset_x <= 1; offset_x++) {
                        let neighbour_y = y + offset_y;
                        let neighbour_x = x + offset_x;

                        if (neighbour_y >= 0 && neighbour_y < size_y && neighbour_x >= 0 && neighbour_x < size_x) {
                            sum += tiles[neighbour_y * size_x + neighbour_x].height;
                            count++;
                        }
                    }
                }

                map_of_average.push(sum / count);
            }
        }

        for (let y = 0; y < size_y; y++) {
            for (let x = 0; x < size_x; x++) {
                tiles[y * size_x + x].height += map_of_average[y * size_x + x] * smoothening_weight
                tiles[y * size_x + x].height /= 1 + smoothening_weight
            }
        }

        AssignTypeToTiles()
        ShowTiles()

        await new Promise(r => setTimeout(r, 125));
    }

    await SmoothenTilesByType()
}

async function SmoothenTilesByType() {

    let smoothening_treshold = type_smoothening_treshold

    for (let i = 0; i < generation_type_smoothening; i++) {

        console.log("Smoothening Tiles by Type... (" + (i+1) + "/" + generation_type_smoothening + ")")

        for (let y = 0; y < size_y; y++) {
            for (let x = 0; x < size_x; x++) {
                let count = 0;
                let counts = new Map

                for (let offset_y = -1; offset_y <= 1; offset_y++) {
                    for (let offset_x = -1; offset_x <= 1; offset_x++) {
                        let neighbour_y = y + offset_y;
                        let neighbour_x = x + offset_x;

                        if (neighbour_y >= 0 && neighbour_y < size_y && neighbour_x >= 0 && neighbour_x < size_x) {
                            
                            let neighbour_type = tiles[neighbour_y * size_x + neighbour_x].type
                            if (neighbour_type != tiles[y * size_x + x].type) {
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

                if (max_value / count > smoothening_treshold) {

                    if (!Chance(type_smoothening_fail_chance))
                        tiles[y * size_x + x].type = max_key
                }

            }
        }

        smoothening_treshold *= 1 - type_smoothening_treshold_decay

        ShowTiles()
        await new Promise(r => setTimeout(r, 125));
    }
}

function AssignTypeToTiles() {

    for (let y = 0; y < size_y; y++) {
        for (let x = 0; x < size_x; x++) {

            let type
            if (tiles[y * size_x + x].height < 0.30) type = "deep_water"
            else if (tiles[y * size_x + x].height < 0.40) type = "water"
            else if (tiles[y * size_x + x].height < 0.58) type = "dirt"
            else if (tiles[y * size_x + x].height < 0.62) type = "hills"
            else if (tiles[y * size_x + x].height < 0.70) type = "mountains"
            else type = "cliffs"
            tiles[y * size_x + x].type = type
        }
    }
}

async function FillTiles() {

    console.log("Generating Random Tiles...")

    for (let y = 0; y < size_y; y++)
        for (let x = 0; x < size_x; x++)
            tiles.push({
                "type": "",
                "height": 1
            })

    let past_height = 0.5
    for (let y = 0; y < size_y; y++) {
        for (let x = 0; x < size_x; x++) {
  
            let height = Math.random()

            while (Math.abs(height - past_height) > 0.40)
                height = Math.random()

            past_height = height
            tiles[y * size_x + x].height = height
        }
        past_height = 0.5
    }

    await SmoothenTiles()
}

function ShowTiles() {

    for (let y = 0; y < size_y; y++) {
        for (let x = 0; x < size_x; x++) {
  
            switch (tiles[y * size_x + x].type) {
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

    for (let i = 0; i < size_x * size_y; i++) {
        decorations.push({
            "type": ""
        })
    }

    for (let i = 0; i < decoration_iterations; i++) {

        console.log("Generating Decorations... (" + (i+1) + "/" + decoration_iterations + ")")

        for (let y = 0; y < size_y; y++) {
            for (let x = 0; x < size_x; x++) {

                GenerateDecoration(x, y, "")
            }
        }

        ApplyDecorations()
        await new Promise(r => setTimeout(r, 125));
    }
}

function GenerateDecoration(x, y, decoration_type) {

    if (decorations[y * size_x + x].type != "")
        decoration_type = decorations[y * size_x + x].type

    switch (tiles[y * size_x + x].type) {
        case "water": //fish, algae
            switch (decoration_type) {
                case "fish":
                    decorations[y * size_x + x].type = "fish"
                    if (Chance(0.02)) GenerateDecoration(KeepInBounds(x + RandomInteger(-1, 1), size_x-1), KeepInBounds(y + RandomInteger(-1, 1), size_y-1), "fish")
                    break
                case "algae":
                    decorations[y * size_x + x].type = "algae"
                    if (Chance(0.1)) GenerateDecoration(KeepInBounds(x + RandomInteger(-1, 1), size_x-1), KeepInBounds(y + RandomInteger(-1, 1), size_y-1), "algae")
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

    for (let y = 0; y < size_y; y++) {
        for (let x = 0; x < size_x; x++) {
  
            switch (decorations[y * size_x + x].type) {
                case "fish": table.children.item(y).children.item(x).innerHTML = "f"
                break
                case "algae": table.children.item(y).children.item(x).innerHTML = "a"
                break
            }
        }
    }
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
////////////////////////////////////////
//RUNTIME
async function Start() {
    
    LoadTable()
    await FillTiles()
    await GenerateDecorations()
}

Start()