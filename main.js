var bWidth = 30;
var bHeight = 16;
var bpxWidth = 20 + bWidth * 16;
var bpxHeight = 30 + 32 + bHeight * 16;
var smileyMargin = (bpxWidth - 13 * 8 - 30) / 2; 
var mineNum = 99;
var mineRemain = mineNum;
var gameover = false;
var board;
var time;
var timer = null;
var flagged = [];
var known = [];
var highlighted = [];
var count = 0;
var limit = 0;
var win = 0;
var loss = 0;

buildBoard();
$("#custom").change(() => {
    var value = $("#custom").val();
    if (value === "easy") {
        updateInput(9, 9, 10);
    } else if (value === "medium") {
        updateInput(16, 16, 40);
    } else if (value === "hard") {
        updateInput(16, 30, 99);
    } else {
        $("#h-input").attr("disabled", null);
        $("#w-input").attr("disabled", null);
        $("#m-input").attr("disabled", null);
    }
});
$("#custom").trigger("change");

function updateInput(h, w, m) {
    var hbox =  $("#h-input");
    var wbox =  $("#w-input");
    var mbox =  $("#m-input");
    hbox.val(h);
    wbox.val(w);
    mbox.val(m);
    hbox.attr("disabled",  "");
    wbox.attr("disabled", "");
    mbox.attr("disabled", "");
    hbox.trigger("input");
}

function updateP() {
    var pbox =  $("#p-input");
    var h =  $("#h-input").val();
    var w =  $("#w-input").val();
    var m =  $("#m-input").val();
    pbox.val(Number(m/(h*w)*100).toFixed(2));
}

//------------------------------------Front-end-----------------------------------------
function buildBoard() {
    $(".board").css({"width" : `${bpxWidth}px`, "height" : `${bpxHeight}px`});
    buildHeader();
    buildField();
    initListeners();
    initVariables();
}

function initVariables() {
    flagged = [];
    time = 0;
    mineRemain = mineNum;
    updateCounter(mineRemain, "m");
    updateCounter(time, "t");
}

function buildHeader() {
    var header = $(".board-header");
    header.empty();
    header.append("<div class='border-tl'></div>");
    for (var i = 0; i < bWidth; i++) {
        header.append("<div class='border-hor'></div>");
    }
    header.append("<div class='border-tr'></div>");
    header.append("<div class='border-ver-long'></div>");
    header.append("<div class='t0' id='m100' style='margin-left:5px'></div>");
    header.append("<div class='t0' id='m10'></div>");
    header.append("<div class='t0' id='m1'></div>");
    header.append(`<div class='smiley' id='smiley' style="margin-left: ${smileyMargin}px; margin-right: ${smileyMargin}px"></div>`);
    header.append("<div class='t0' id='t100'></div>");
    header.append("<div class='t0' id='t10'></div>");
    header.append("<div class='t0' id='t1' style='margin-right:5px'></div>");
    header.append("<div class='border-ver-long'></div>");
    header.append("<div class='border-ml'></div>");
    for (var i = 0; i < bWidth; i++) {
        header.append("<div class='border-hor'></div>");
    }
    header.append("<div class='border-mr'></div>");
}

function buildField() {
    var field = $(".field");
    field.empty();

    for(var i = 0; i < bHeight; i++) {
        field.append("<div class='border-ver'></div>");
        for (var j = 0; j < bWidth; j++) {
            field.append(`<div class='b tile' id="${i}-${j}"></div>`);
        }
        field.append("<div class='border-ver'></div>");
    }

    field.append("<div class='border-bl'></div>");
    for (var i = 0; i < bWidth; i++) {
        field.append("<div class='border-hor'></div>");
    }
    field.append("<div class='border-br'></div>");
}

function initListeners() {
    $(".tile").on("mouseover", function(e) {
        if (!gameover) {
            if (e.buttons === 1 && !$(this).hasClass("flag")) {
                $(this).addClass("tile-pressed");
                if (!$("#smiley").hasClass("observing"))
                    $("#smiley").addClass("observing");
            }
        }
    });

    $(".tile").on("mousedown", function(e) {
        if (!gameover) {
            if (e.buttons === 1 && !$(this).hasClass("flag")) {
                $(this).addClass("tile-pressed");
                $("#smiley").addClass("observing");
            } else if (e.button === 2 && board) { // flagging
                flag(this);
            }
        }
    });

    $(".tile").on("mouseout", function(e) {
        if (!gameover) {
            $(this).removeClass("tile-pressed");
            $("#smiley").removeClass("observing");
        }
    });

    $(".tile").on("mouseup", function(e) {
        if (!gameover) {
            $("#smiley").removeClass("observing");
            if (e.button === 0 && $(this).hasClass("tile")) {
                makeMove(this);
            }
        }
    });

    $(".smiley").on("mousedown mouseover", function(e) {
        if (e.buttons === 1) {
            $(this).addClass("smiley-pressed");
        }
    });

    $(".smiley").on("mouseout", function(e) {
        $(this).removeClass("smiley-pressed");
    });

    $(".smiley").on("mouseup", function(e) {
        if (e.button === 0) {
            reset();
        }
    });
}

//----------------------------------Board-init----------------------------------
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function revealAllMines() {
    for (var i = 0; i < bHeight; i++) {
        for (var j = 0; j < bWidth; j++) {
            var target = $("#" + i + "-" + j);
            if (board[i][j] === -1 && target.hasClass("tile")) {
                target.removeClass("tile");
                target.addClass("mine");
            } else if (board[i][j] != -1 && target.hasClass("flag")) {
                target.toggleClass("flag false");
            }
        }
    }
}

function initBoardValues(x, y) {
    mineNum = Math.min(mineNum, bWidth * bHeight - 1);
    board = [];
    known = [];
    for (var i = 0; i < bHeight; i++) {
        board[i] = [];
        known[i] = [];
        for (var j = 0; j < bWidth; j++)
            known[i][j] = null;
    }

    // generate mines
    var generated = 0;
    while (generated < mineNum) {
        var i = getRandomInt(0, bHeight - 1);
        var j = getRandomInt(0, bWidth - 1);
        if (!(i === x && j === y) && board[i][j] !== -1) {
            board[i][j] = -1;
            generated++;
        }
    }
    // fill values
    for (var i = 0; i < bHeight; i++) {
        for (var j = 0; j < bWidth; j++) {
            if (board[i][j] !== -1) {
                // check surroundings
                var count = 0;
                for (var a = Math.max(i - 1, 0); a <= Math.min(i + 1, bHeight - 1); a++) {
                    for (var b = Math.max(j - 1, 0); b <= Math.min(j + 1, bWidth - 1); b++) {
                        if (board[a][b] === -1)
                            count++;
                    }
                }
                board[i][j] = count;
            }
        }
    }
}

/**
 * Explore neighboring tiles if value is 0.
 * 
 * @param {*} x 
 * @param {*} y 
 */
function expandTile(x, y) {
    var e = document.getElementById(x + "-" + y).classList;
    if (e.contains("tile")) {
        e.remove("tile");
        e.add("o" + board[x][y]);
        known[x][y] = board[x][y];

        if (board[x][y] === 0) {
            for (var i = Math.max(x - 1, 0); i <= Math.min(x + 1, bHeight - 1); i++) {
                for (var j = Math.max(y - 1, 0); j <= Math.min(y + 1, bWidth - 1); j++) {
                    expandTile(i, j);
                }
            }
        }
    }
}

function updateCounter(counter, c) {
    if (counter > 999) counter = 999;
    if (counter < 0) counter = 0;
    $(`#${c}100`).attr("class", "t" + parseInt(Math.floor(counter/100)));
    $(`#${c}10`).attr("class", "t" + (parseInt(Math.floor(counter/10)) % 10));
    $(`#${c}1`).attr("class", "t" + (counter % 10));
}

/**
 * Called when player starts first move.
 * 
 * @param {*} x 
 * @param {*} y 
 */
function startGame(x, y) {
    initBoardValues(x, y);
    timer = window.setInterval(function() {
        time++; 
        updateCounter(time, "t");
    }, 1000);
}

function checkWin() {
    if (mineRemain === 0) {
        var result = true;
        flagged.forEach(function (e) {
            var x = e.split("-")[0];
            var y = e.split("-")[1];
            if (board[x][y] !== -1)
                result = false;
        });
        return result;
    }

    for (var i = 0; i < bHeight; i++) {
        for (var j = 0; j < bWidth; j++) {
            var current = $("#"+ i + "-" + j);
            if (board[i][j] === -1 && !(flagged.includes(i + "-" + j) || current.hasClass("tile"))) {
                return false;
            }
            if (board[i][j] > -1 && (flagged.includes(i + "-" + j) || current.hasClass("tile"))) {
                return false;
            }
        }
    }
    return true;
}

function endGame() {
    revealAllMines();
    gameover = true;
    clearInterval(timer);
    board = null;
}

//-----------------------------------Game-Actions-------------------------------------------
function makeMove(e) {
    var x = parseInt($(e).attr("id").split("-")[0]);
    var y = parseInt($(e).attr("id").split("-")[1]);
    if (!board) {
        startGame(x, y);
    }
    $(e).removeClass("tile-pressed");
    if (board[x][y] === -1) {
        $(e).removeClass("tile");
        $(e).addClass("caught");
        $("#smiley").toggleClass("smiley defeat")
        endGame();
    } else {
        expandTile(x, y);
        if (checkWin()) {
            $("#smiley").addClass("victory");
            endGame();    
        }
    }
}   

function flag (e, auto) {
    // fix itself when auto
    if (mineRemain === 0 && auto) {
        $(".flag").toArray().forEach(e => {
            flag(e);
        });
        makeApparentMoves();
    } 
    var x = parseInt($(e).attr("id").split("-")[0]);
    var y = parseInt($(e).attr("id").split("-")[1]);
    if ($(e).hasClass("tile") && mineRemain > 0) {
        mineRemain--;
        flagged.push(x + "-" + y);
        known[x][y] = -1;
        $(e).toggleClass("tile flag");
    }
    else if ($(e).hasClass("flag")) {
        flagged.splice(flagged.indexOf(x + "-" + y), 1);
        mineRemain++;
        known[x][y] = null;
        $(e).toggleClass("tile flag");
    }
    updateCounter(mineRemain, "m");
    if (checkWin()) {
        $("#smiley").addClass("victory");
        endGame();  
    }
}

/**
 * Press on the smiley
 */
function reset() {
    $(".smiley").removeClass("smiley-pressed");
    // reset field
    for (var i = 0; i < bHeight; i++) {
        for (var j = 0; j < bWidth; j++) {
            $("#" + i + "-" + j).attr("class", "b tile");
        }
    }
    // reset header
    clearInterval(timer);
    initVariables();
    $("#smiley").attr("class", "smiley");
    clearHighlighted();
    board = null;
    gameover = false;
}

//--------------------------------Moves-calculations-------------------------------------------

function makeApparentMoves() {
    var changed = false;
    if (board) {
        try {
            for (var i = 0; i < bHeight; i++) {
                for (var j = 0; j < bWidth; j++) {
                    if (known[i][j] > 0) {
                        var open = 0;
                        var flagged = 0;
                        for (var a = Math.max(i - 1, 0); a <= Math.min(i + 1, bHeight - 1); a++) {
                            for (var b = Math.max(j - 1, 0); b <= Math.min(j + 1, bWidth - 1); b++) {
                                if (known[a][b] === null || known[a][b] === -1)
                                    open++;
                                if (known[a][b] === -1)
                                    flagged++;
                            }
                        }
                        
                        for (var a = Math.max(i - 1, 0); a <= Math.min(i + 1, bHeight - 1); a++) {
                            for (var b = Math.max(j - 1, 0); b <= Math.min(j + 1, bWidth - 1); b++) {
                                if (known[a][b] === null) {
                                    if (flagged === board[i][j]) {
                                        makeMove($("#" + a + "-" + b));
                                        changed = true;
                                    } else if (open === board[i][j]) {
                                        flag($("#" + a + "-" +b), true);
                                        changed = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch(e) {
            console.log(e);
            return changed;
        }
    }
    return changed;
}

function makeComputedMoves() {
    var edges = getEdgeTiles();
    var equations = generateEquations(edges);
    //console.log(equations);
    // make a guess, no edge tiles
    // guess a tile that has a neighbor
    if (equations[0].length === 0) {
        pickOpenTile();
        return [true, [], []];
    }

    var matrix = matrixRREF(equations[1]);
    //console.log(equations[1]);
    //console.log(matrix);
    
    var changed = false;
    
    try {
        for (var i = 0; i < matrix.length; i++) {
            var row = matrix[i];
            var positiveCoefs = row.slice(0, row.length - 1).filter(e => e > 0);
            var negativeCoefs = row.slice(0, row.length - 1).filter(e => e < 0);
            var value = row[row.length - 1];
    
            // if value is 0 and the coefficients are > 0,
            // all of the non-zero coefficients are 0
            if (positiveCoefs.length > 0 && negativeCoefs.length === 0 && value === 0) {
                for (var j = 0; j < row.length - 1; j++) {
                    if (row[j] > 0) {
                        makeMove($("#" + equations[0][j]));
                        changed = true;
                    }
                }
            } 
            // if the sum of all positive coefficients equals to value,
            // all positive coefs are mines and negative ones are clear, 
            // and vice versa
            else if (value !== 0 && (positiveCoefs.reduce((a,b) => a+b, 0) === value
                        || negativeCoefs.reduce((a,b) => a+b, 0) === value)) {
                for (var j = 0; j < row.length - 1; j++) { 
                    if (row[j] * value > 0) {
                        flag($("#" + equations[0][j]), true);
                        changed = true;
                    } else if (row[j] * value < 0){
                        makeMove($("#" + equations[0][j]));
                        changed = true;
                    }
                }
            }
        }
    } catch (e) {
        console.log(e);
        return [changed, equations[0], matrix, edges];
    }
    
    return [changed, equations[0], matrix, edges];
}

function calculateProbability(positions , edges) {
    // split the mines into groups that have no effect to each other
    var groups = [];

    for (var i = 0; i < edges.length; i++) {
        for (var j = i + 1; j < edges.length; j++) {
            // check if two tiles connected
            if (new Set(edges[i].concat(edges[j])).size < edges[i].length + edges[j].length) {
                var found = false;
                for (var a = 0; a < groups.length; a++) {
                    if (groups[a].has(positions[i]) || groups[a].has(positions[j])) {
                        found = true;
                        groups[a].add(positions[i]);
                        groups[a].add(positions[j]);
                        break;
                    }
                }
                if (!found) {
                    groups.push(new Set([positions[i], positions[j]]));
                }
            }
        }
    }

    // merge the overlap groups and remove dups
    for (var i = 0; i < groups.length; i++) {
        for (var j = 0; j < groups.length; j++) {
            if (i !== j) {
                var merged = new Set([...groups[i], ...groups[j]]);
                if (merged.size < groups[i].size + groups[j].size) {
                    if (i < j) {
                        groups[i] = merged;
                        groups.splice(j, 1);
                        j--;
                    } else {
                        groups[j] = merged;
                        groups.splice(i, 1);
                        i--;
                    }
                }
            }
        }
    }

    for (var i = 0; i < groups.length; i++) {
        groups[i] = Array.from(groups[i]);
    }

    var result = [];
    var matrixes = [];
    var solutions = [];

    for (var i = 0; i < groups.length; i++) {
        var edge = [];
        for (var j = 0; j < groups[i].length; j++) {
            var a = parseInt(groups[i][j].split("-")[0]);
            var b = parseInt(groups[i][j].split("-")[1]);
            edge[groups[i][j]] = getNeighbors(a, b);
        }
        matrixes[i] = matrixRREF(generateEquations(edge)[1]);
        solutions[i] = generateSolutions(matrixes[i]);
        result[i] = [];
        if (solutions[i] === undefined || solutions[i].length === 0) {
            continue;
        }

        // for each column
        for (var j = 0; j < solutions[i][0].length; j++) {
            var count = 0;
            // count occurance of 1s
            for (var k = 0; k < solutions[i].length; k++) {
                if (solutions[i][k][j] === 1)
                    count++;
            }
            result[i][j] = count / solutions[i].length;
        }
    }

    /*var solutions = generateSolutions(matrix);
    if (solutions === undefined || solutions.length === 0) {
        return [];
    }
    

    // for each column
    for (var i = 0; i < solutions[0].length; i++) {
        var count = 0;
        // count occurance of 1s
        for (var j = 0; j < solutions.length; j++) {
            if (solutions[j][i] === 1)
                count++;
        }
        result[i] = count / solutions.length;
    }
    */
    return [groups, result];
}

//---------------------------------User-Actions-------------------------------------------
function guess(auto) {
    try {
        if (board) {
            // clear highlighted
            clearHighlighted();
    
            var stage1 = makeApparentMoves();
            if (!stage1) {
                var stage2 = makeComputedMoves();
                if (!stage2[0]) {
                    var p = calculateProbability(stage2[1], Object.values(stage2[3]));
                    var positions = p[0].flat(Infinity);
                    p = p[1].flat(Infinity);
    
                    // error on flagging, fix itself
                    if (p.length < positions.length) {
                        $(".flag").toArray().forEach(e => {
                            flag(e);
                        });
                    }

                    var min = Math.min(...p);
                    var max = Math.max(...p);

                    for (var i = 0; i < positions.length; i++) {
                        var e = $("#" + positions[i]);
                        e.css("box-shadow", `inset 0 0 0 ${ p[i] === min || p[i] === 1 ? 3 : 1.2}px ${getColor(p[i])}`);
                        e.attr("title", `${Number(p[i] * 100).toFixed(3)}%`)
                        highlighted.push(e);
                    }

                    if (auto) {
                        if (max === 1) {
                            for (var i = 0; i < p.length; i++) {
                                if (p[i] === max) {
                                    var target = $("#" + positions[i]);
                                    flag(target, true);
                                }
                            }
                        } 

                        if (min === 0) {
                            for (var i = 0; i < p.length; i++) {
                                if (p[i] === min) {
                                    var target = $("#" + positions[i]);
                                    makeMove(target);
                                }
                            }
                        } else {
                            var available = [];
                            for (var i = 0; i < p.length; i++) {
                                if (p[i] === min) {
                                    available.push(positions[i]);
                                }
                            }
                            var target = $("#" + available[Math.floor(Math.random() * available.length)]);
                            makeMove(target);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
}

function clearHighlighted() {
    highlighted.forEach(e => {
        e.css("box-shadow", "");
        e.attr("title", "");
    });
    highlighted = [];
}

function updateBoardSize() {
    var heightCap = 30;
    var widthCap = 50;
    var width = $("#w-input").val();
    var height = $("#h-input").val();
    var mines = $("#m-input").val();

    reset();
    bWidth = Math.min(width, widthCap);
    bWidth = Math.max(width, 8);
    bHeight = Math.min(height, heightCap);
    bHeight = Math.max(height, 8);
    
    mineNum = Math.min(bWidth * bHeight, mines);
    bpxWidth = 20 + bWidth * 16;
    bpxHeight = 30 + 32 + bHeight * 16;
    smileyMargin = (bpxWidth - 13 * 8 - 30) / 2; 
    buildBoard();
}

//----------------------------------Calculations-helpers-------------------------------------

function getEdgeTiles() {
    var tiles = [];
    if (board)
        for (var i = 0; i < bHeight; i++) {
            for (var j = 0; j < bWidth; j++) {
                if (known[i][j] === null) {
                    var neighbors = getNeighbors(i, j);
                    if (neighbors.length > 0)
                        tiles[i + "-" + j] = neighbors;
                }
            }
        }
    return tiles;
}

function getNeighbors(i, j) {
    var toReturn = [];
    for (var a = Math.max(i - 1, 0); a <= Math.min(i + 1, bHeight - 1); a++) {
        for (var b = Math.max(j - 1, 0); b <= Math.min(j + 1, bWidth - 1); b++) {
            if (known[a][b] && known[a][b] >= 0 && !(a === i && b === j)) {
                toReturn.push(a + "-" + b);
            }
        }
    }
    return toReturn;
}

function generateEquations(edges) {
    var eqns = [];
    var indexes = [];
    var reversed = [];

    for (var e in edges) {
        indexes.push(e);
        edges[e].forEach( key => {
            if (!reversed[key])
                reversed[key] = [];
            reversed[key].push(e);
        });
    }
    

    for (var e in reversed) {
        var i = parseInt(e.split("-")[0]);
        var j = parseInt(e.split("-")[1]);
        var eqn = new Array(indexes.length + 1).fill(0);
        
        reversed[e].forEach(element => {
            eqn[indexes.indexOf(element)] = 1;
        });

        // get value
        var flagged = 0;
        for (var a = Math.max(i - 1, 0); a <= Math.min(i + 1, bHeight - 1); a++) {
            for (var b = Math.max(j - 1, 0); b <= Math.min(j + 1, bWidth - 1); b++) {
                if (known[a][b] === -1 && !(a === i && b === j)) {
                    flagged++;
                }
            }
        }

        eqn[eqn.length - 1] = known[i][j] - flagged;
        eqns.push(eqn);
    }
    return [indexes, eqns];
}

/**
 * Return the Row Reduced Echelon Form of a matrix. 
 * Input is array of arrays where each subarrays are rows of matrix
 * in order top to bottom.
 * 
 * @param {Array of Arrays} matrix 
 */
function matrixRREF(matrix) {
    var m = copyOf(matrix);
    
    // check matrix 
    var n = m[0].length; // number of column
    for (var i = 1; i < m.length; i++) {
        if (m[i].length !== n)
            return [];
    }

    // column
    var j = 0;
    // for each row
    for (var i = 0; i < m.length; i++) {
        // check column 
        while (true) {
            var allZeros = true;
            for (var a = 0; a < m.length; a++) {
                if (m[a][j] !== 0) {
                    allZeros = false;
                    break;
                }
            }
            if (allZeros) {
                j++;
                if (j >= n)
                    return m;
            } else {
                break;
            }
        }
        
        // 
        while (m[i][j] === 0) {
            var swapped = false;
            for (var a = i + 1; a < m.length; a++) {
                if (m[a][j] !== 0) {
                    swapped = true;
                    // switch row a and i
                    var copy = copyOf(m[a]);
                    m[a] = m[i];
                    m[i] = copy;
                    break;
                }
            }
            
            if (!swapped)
                j++;
            if (j >=n)
                return m;
        }
        
        //  divide row i by pivot m[i][j]
        var pivot = m[i][j];
        if (pivot !== 0)
            for (var a = 0; a < n; a++) {
                m[i][a] /= pivot;
            }   

        // subtract current row from every other rows
        for (var k = 0; k < m.length; k++) {
            if (k !== i) {
                var mult = m[k][j];
                for (var a = 0; a < n; a++) {
                    m[k][a] -= m[i][a] * mult;
                }
            }
        }
        j++;
        if (j >= n)
            return m;
    }
    return m;
}

/**
 * Return a deep copy of an object.
 * 
 * @param {*} object
 */
function copyOf(object) {
    return JSON.parse(JSON.stringify(object));
}

function pickOpenTile() {
    for (var i = 0; i < bHeight; i++) 
        for (var j = 0; j < bWidth; j++) {
            if (known[i][j] === null)
                for (var a = Math.max(i - 1, 0); a <= Math.min(i + 1, bHeight - 1); a++) {
                    for (var b = Math.max(j - 1, 0); b <= Math.min(j + 1, bWidth - 1); b++) {
                        if (known[a][b]) {
                            makeMove($("#" + i + "-" + j));
                            console.log("bs " + i + "-" + j);
                            return;
                        }
                    }
                }
        }
}

function bruteForceSols(matrix) {
    var solutions = [];
    for (var i = 0; i < parseInt(Math.pow(2, matrix[0].length - 1)); i++) {
        var solution = [];
        var n = i;
        var fit = true;

        for (var k = 0; k < matrix[0].length -1; k++) {
            solution[k] = n % 2;
            n = Math.floor(n / 2);
        }

        for (var j = 0; j < matrix.length; j++) {
            if (matrix[j].slice(0, matrix[0].length - 1).filter(e => e !== 0).length === 0)
                break;

            var sum = 0;
            
            for (var k = 0; k < matrix[0].length -1; k++) {
                sum += solution[k] * matrix[j][k];
            }

            if (sum !== matrix[j][matrix[0].length-1]) {
                fit = false;
                break;
            }
        }

        if (fit)
            solutions.push(solution);
    }
    return solutions;
}

function generateSolutions(matrix) {
    var solutions;//new Array(matrix[0].length - 1);

    // for each row in matrix
    for (var i = 0; i < matrix.length; i++) {
        var current = matrix[i];
        // indexes of non zeros
        var nonZeros = [];
        for (var j = 0; j < current.length - 1; j++) {
            if (current[j] !== 0)
                nonZeros.push(j);
        }

        if (nonZeros.length === 0) 
            break;

        // check all solutions for a row
        var set = [];
        for (var j = 0; j < parseInt(Math.pow(2, nonZeros.length)); j++) {
            var solution = new Array(matrix[0].length - 1);
            var n = j;
            var sum = 0;
            // generate solution
            for (var k = 0; k < nonZeros.length; k++) {
                solution[nonZeros[k]] = n % 2;
                sum += (n % 2) * current[nonZeros[k]];
                n = Math.floor(n / 2);
            }

            // check if solution is matched with row
            if (sum === current[current.length - 1]) {
                set.push(solution);
            }
        }

        // join solutions
        if (!solutions || solutions.length === 0)
            solutions = set;
        else {
            if (set.length === 0)
                continue;

            // find overlap columns
            var overlap = [];
            for (var j = 0; j < matrix[0].length; j++) {
                if (set[0][j] !== undefined && solutions[0][j] !== undefined)
                    overlap.push(j);
            }
            var newSet = [];
            // for each row in first set [solutions]
            for (var a = 0; a < solutions.length; a++) {
                // for each row in second set [set]
                for (var b = 0; b < set.length; b++) {
                    // check overlap
                    var pass = true;
                    for (var c = 0; c < overlap.length; c++) {
                        var index = overlap[c];
                        if (solutions[a][index] !== set[b][index]) {
                            pass = false;
                            continue;
                        }
                    }
                    if (!pass)
                        continue;
                    
                    // join 2 rows
                    var solution = new Array(matrix[0].length - 1);
                    for (var c = 0; c < solution.length; c++) {
                        solution[c] = solutions[a][c] != undefined ? solutions[a][c] : set[b][c];
                    }
                    newSet.push(solution);
                }
            }
            solutions = newSet;
        }
    }
    return solutions;
}

/**
 * Get color from green to red based on scale value.
 * Used for board highlights.
 * 
 * @param {Double} value a scale from 0-1
 */
function getColor(value) {
    var r;
    var g;

    if (value / 0.5 <= 1) {
        g = 1;
        r = value * 2;
    } else {
        g = 1 - (value - 0.5) * 2;
        r = 1;
    }
    return `rgb(${Math.round(255 * r)}, ${Math.round(255 * g)}, 0)`;
}

//------------------------------------Stats------------------------------------------------------
/**
 * Helper for automation.
 */
function auto() {
    if (gameover || !board) {
        reset();
        //var corners = ["0-0", "0-" + (bWidth-1), (bHeight-1) + "-" + (bWidth-1), (bHeight-1) + "-0"]
        //makeMove($("#" + corners[Math.floor(Math.random() * corners.length)]));
        makeMove($("#" + (bHeight-1) + "-0"));
    }
    guess(true);
    if (!gameover) {
        setTimeout(() => {
            auto();
        }, 50);
    } else {
        count++;
        if ($("#smiley").attr("class").toString().includes("victory")) {
            win++;
        } else {
            loss++;
        }
        if (count < limit)
            auto();
    }
}

/**
 * Run the game for some # of times.
 * 
 * @param {Integer} num 
 */
function runTrials(num) {
    count = 0;
    limit = num;
    auto();
}

/**
 * Display stats for ran trials.
 * 
 */
function stats() {
    console.log("win = " + win);
    console.log("loss = " + loss);
    console.log("winrate = " + (win / (win + loss) * 100) + "%");
}