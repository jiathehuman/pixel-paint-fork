function Get_Array_From_Rgb(rgb)
{
    if (rgb === "transparent") {
        return [0, 0, 0, 0];
    }
    rgb = rgb.replace(" ", "");
    rgb = rgb.slice(4,rgb.length-1);

    let rgb_split = rgb.split(",");

    let r = parseInt(rgb_split[0]);
    let g = parseInt(rgb_split[1]);
    let b = parseInt(rgb_split[2]);

    return [r,g,b];
}

function Rgb_To_Hex(rgb)
{
    if(rgb.includes("#"))
        return rgb;

    rgb = rgb.replace(" ", "");
    rgb = rgb.slice(4,rgb.length-1);

    let rgb_split = rgb.split(",");

    let r = parseInt(rgb_split[0]);
    let g = parseInt(rgb_split[1]);
    let b = parseInt(rgb_split[2]);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function Random_Color()
{
    let r = Math.floor(Math.random()*255);
    let g = Math.floor(Math.random()*255);
    let b = Math.floor(Math.random()*255);
    return "rgb(" + r + ", " + g + ", " + b + ")";
}

function Get_X_From_CellInt(idx)
{
    return idx % CELLS_PER_ROW;
}

function Get_Y_From_CellInt(idx)
{
    return Math.floor(idx / CELLS_PER_ROW);
}

function Get_CellInt_From_CellXY(x, y)
{
    return x + (y * CELLS_PER_ROW);
}

function Px_To_Int(str)
{
    // does parseInt do anything wrong?
    return parseInt(str.slice(0, str.length-2));
}

function Int_To_Px(int)
{
    return int + "px";
}

function Pad_Start_Int(int, pad=4)
{
    return int.toString().padStart(pad, 0);
}

function Color_All_Toolbar_Buttons()
{
    let buttons = document.querySelectorAll(".toolbarButton");
    buttons.forEach(function(b) {
        b.style.backgroundColor = BUTTON_UP_COLOR;
        // b.style.outline = BUTTON_UP_COLOR;
        // BUTTON_UP_BORDER
    })
}

function Populate_Canvas_With_Cells()
{
    const canvasDiv = document.getElementById("canvas-div");
    for(let i=0; i<CELLS_PER_ROW*CELLS_PER_ROW; i+=1)
    {
        let div = document.createElement("div");
        div.className = "canvasCell";
        div.classList.add("no-select");
        div.id = Pad_Start_Int(i);
        div.style.backgroundColor = CANVAS_INIT_COLOR;

        canvasDiv.appendChild(div);
    }
}

function Populate_Palette_With_Cells()
{
    const paletteDiv = document.getElementById("palette-div");

    for(let i=0; i<palette_color_array.length; i += 1)
    {
        let cell = document.createElement("div");
        cell.className = "paletteCell";
        cell.style.backgroundColor = palette_color_array[i];
        paletteDiv.appendChild(cell);
    }
}

let keyboardShortcutsPinned = false;

function Populate_GBPalette_With_Cells()
{
    const gameboyPaletteDiv = document.getElementById("gameboy-palette-div");

    for(let i=0; i<gb_palette_color_array.length; i += 1)
    {
        let cell = document.createElement("div");
        cell.className = "paletteCell";
        cell.style.backgroundColor = gb_palette_color_array[i];
        gameboyPaletteDiv.appendChild(cell);
    }
}

function Update_Tooltip_Text()
{
    const bindings = (typeof KeyboardSettings !== 'undefined') ? KeyboardSettings.getBindings() : null;

    for (let label in Tools)
    {
        if (!Object.prototype.hasOwnProperty.call(Tools, label))
            continue;

        const config = Tools[label];
        const btn = document.getElementById(config["button-id"]);
        if (!btn)
            continue;

        const tooltip = btn.children[0];
        if (!tooltip)
            continue;

        const code = bindings && bindings[label] ? bindings[label] : config["hotkey"];
        tooltip.innerHTML = label + "<span class='hotkeyText'> (" + Format_Hotkey_Display(code) + ")</span>";
    }

    if (bindings)
    {
        const undoText = document.querySelector('#undo-button .hotkeyText');
        if (undoText)
            undoText.textContent = '(' + Format_Hotkey_Display(bindings.undo) + ')';

        const redoText = document.querySelector('#redo-button .hotkeyText');
        if (redoText)
            redoText.textContent = '(' + Format_Hotkey_Display(bindings.redo) + ')';

        const gridText = document.querySelector('#grid-button .hotkeyText');
        if (gridText)
            gridText.textContent = '(' + Format_Hotkey_Display(bindings.toggleGrid) + ')';
    }
}

function Set_Cursor(newCursorString)
{
    document.getElementById("canvas-div").style.cursor = newCursorString;
}

function Get_Cursor()
{
    return document.getElementById("canvas-div").style.cursor;
}

function Color_Toolbar_Button_As_Down(elem)
{
    elem.style.backgroundColor = BUTTON_DOWN_COLOR;
    elem.style.outline = BUTTON_DOWN_OUTLINE;
}

function Color_Toolbar_Button_When_Up(elem)
{
    elem.style.backgroundColor = BUTTON_UP_COLOR;
    elem.style.outline = BUTTON_UP_OUTLINE;
}

function Get_Canvas_Pixels()
{
    let canvasCells = document.querySelectorAll(".canvasCell");
    let canvasPixels = [];
    canvasCells.forEach(function(cell){
        canvasPixels.push(cell.style.backgroundColor);
    })
    return canvasPixels;
}

function Format_Hotkey_Display(code)
{
    if (!code)
        return '';

    if (typeof KeyboardSettings !== 'undefined' && KeyboardSettings.getDisplayLabel)
    {
        let label = KeyboardSettings.getDisplayLabel(code);
        if (label)
            return label.toUpperCase();
    }

    if (code.indexOf('Key') === 0 && code.length > 3)
        return code.slice(3).toUpperCase();
    if (code.indexOf('Digit') === 0 && code.length > 5)
        return code.slice(5);
    if (code.indexOf('Numpad') === 0 && code.length > 6)
        return ('Num ' + code.slice(6)).toUpperCase();

    return code.toUpperCase();
}

function Display_Keyboard_Shortcuts()
{
  const infoSection = document.getElementById("info-section");
  if (!infoSection)
    return;

  infoSection.style.opacity = "1";
  infoSection.style.backgroundColor = "#2a2a2a";
  infoSection.style.pointerEvents = "auto";
}

function Hide_Keyboard_Shortcuts(evt, force)
{
  if (!force && keyboardShortcutsPinned)
    return;

  const infoSection = document.getElementById("info-section");
  if (!infoSection)
    return;

  if (!force)
  {
    const nextTarget = evt ? evt.relatedTarget : null;
    if (Is_Target_Within_Keyboard_Shortcuts(nextTarget))
      return;
  }

  infoSection.style.opacity = "0";
  infoSection.style.backgroundColor = "none";
  infoSection.style.pointerEvents = "none";
}

function Toggle_Keyboard_Shortcuts()
{
  if (keyboardShortcutsPinned)
  {
    keyboardShortcutsPinned = false;
    Hide_Keyboard_Shortcuts(null, true);
    return;
  }

  keyboardShortcutsPinned = true;
  Display_Keyboard_Shortcuts();
}

function Is_Target_Within_Keyboard_Shortcuts(target)
{
  if (!target)
    return false;

  const hoverButton = document.getElementById("keyboard-shortcut-hover");
  const infoSection = document.getElementById("info-section");

  if (hoverButton && hoverButton.contains(target))
    return true;
  if (infoSection && infoSection.contains(target))
    return true;

  return false;
}

