//add items to front or back & switch views
var frontItems = [];
var backItems = [];
var currView = "front";
function switchView(view=null) {
    const front = document.getElementById('jacket-front');
    const back = document.getElementById('jacket-back');
    const jacketCanvas = document.getElementById('jacketCanvas');
    const jacketCtx = jacketCanvas.getContext('2d');
    //const jacketColSelect = hexToRgb(document.getElementById('jacketcol').value);
    const nextView = view || (currView == 'front' ? 'back' : 'front');
    if (nextView == currView) return;
    const prevView = currView;
    currView = nextView;
    if (nextView == "back") {
        for (let i = 0; i < frontItems.length; i++) {
            frontItems[i].style.display = 'none';
        }
        for (let i = 0; i < backItems.length; i++) {
            backItems[i].style.display = 'block';
        }
        drawCanvasFrontBack(back, jacketCtx, jacketCanvas, currJacketCol);//jacketColSelect);
        document.getElementById('front-view').style.display = 'block';
        document.getElementById('back-view').style.display = 'none';
        logAction('switched_view', {from: prevView, to: 'back'});
    } else {
        for (let i = 0; i < frontItems.length; i++) {
            frontItems[i].style.display = 'block';
        }
        for (let i = 0; i < backItems.length; i++) {
            backItems[i].style.display = 'none';
        }
        drawCanvasFrontBack(front, jacketCtx, jacketCanvas, currJacketCol);//jacketColSelect);
        document.getElementById('back-view').style.display = 'block';
        document.getElementById('front-view').style.display = 'none';
        logAction('switched_view', {from: prevView, to: 'front'});
    }
}
function drawCanvasFrontBack(img, ctx, canvas, jacketCol=null) {
    if (img.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (jacketCol) {
            changeJacketCol(ctx, canvas, jacketCol);
        }
    } else {
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (jacketCol) {
                changeJacketCol(ctx, canvas, jacketCol);
            }
        };
    }
}

//let cursorOffsetX = 0, cursorOffsetY = 0; //change this to setattributedata-cursorx
//drag and drop functionality
function dragOver(e) {
    e.preventDefault();
}
function drag(e) {
    const item = document.getElementById(e.target.id);
    const itemArea = item.getBoundingClientRect();
    item.setAttribute('data-cursorX', (e.clientX-itemArea.left));
    item.setAttribute('data-cursorY', (e.clientY-itemArea.top));
    if (item.classList.contains('dropped-item')) {
        selectItem(item);
    }
    e.dataTransfer.setData("text", document.getElementById(e.target.id).id);
}
function drop(e) {
    e.preventDefault();
    var data = e.dataTransfer.getData("text");
    const item = document.getElementById(data);
    const dropArea = document.getElementById('jacketbox');
    const alreadyDroppedItem = dropArea.querySelector(`#${data}`);
    const jacketCanvas = document.getElementById('jacketCanvas');
    const jacketCtx = jacketCanvas.getContext('2d');
    var imgData = jacketCtx.getImageData(e.offsetX, e.offsetY, 1, 1);
    var rgba = imgData.data;
    if (alreadyDroppedItem) {
        if (rgba[3] !== 0) {
            positionItem(alreadyDroppedItem, e, dropArea);
        } else {
            return;
        }
    } else {
        if (rgba[3] !== 0) { //make sure the pixel under the drop isn't transparent
            const clonedItem = item.cloneNode(true);
            const uniqueId = `${data}-${Date.now()}`;
            clonedItem.id = uniqueId;
            clonedItem.className = item.className + ' dropped-item';
            clonedItem.style.cssText = item.style.cssText;
            dropArea.appendChild(clonedItem);
            positionItem(clonedItem, e, dropArea);
            selectItem(clonedItem);
            if (clonedItem.id.startsWith('light-ind')) {
                selectedColor = defaultColor;
                colorX = null, colorY = null;
                clonedItem.setAttribute('data-speed', 400);
                document.querySelector('input[name="item-movement"][value="Flash ind"]').checked = true;
                document.querySelector('input[name="item-movement"][value="Flash ind"]').dispatchEvent(new Event('change'));
            } else if (clonedItem.id.startsWith('light-strip')) {
                selectedColor = defaultColor;
                colorX = null, colorY = null;
                clonedItem.setAttribute('data-speed', 400);
                document.querySelector('input[name="item-movement"][value="Flash str"]').checked = true;
                document.querySelector('input[name="item-movement"][value="Flash str"]').dispatchEvent(new Event('change'));
            } else if (clonedItem.id.startsWith('fur-patch')) {
                clonedItem.setAttribute('data-speed', 400);
            } else if (clonedItem.id.startsWith('battery')) {
                clonedItem.querySelector('#bar1').style.opacity = 1;
                clonedItem.querySelector('#bar2').style.opacity = 1;
                clonedItem.querySelector('#bar3').style.opacity = 1;
                clonedItem.querySelector('#bar4').style.opacity = 0;
                clonedItem.querySelector('#bar5').style.opacity = 0;
            } else if (clonedItem.id.startsWith('other')) {
                document.querySelector('.popup-cyo').classList.add('show');
                resetCYOPopup();
            }
            flashAnimation(clonedItem);
            clonedItem.addEventListener('click', function() {
                selectItem(clonedItem);
            });
            if (currView == "front") {
                frontItems.push(clonedItem);
            } else if (currView == "back") {
                backItems.push(clonedItem);
            }
            selectItem(clonedItem);
            saveState();
        } else {
            return;
        }
    }
}
function positionItem(item, e, area) {
    const rect = area.getBoundingClientRect();
    const xVal = e.clientX-rect.left-item.offsetWidth/2;//-offsetX;
    const yVal = e.clientY-rect.top-item.offsetHeight/2;//-offsetY;
    item.style.position = 'absolute';
    //item.style.left = `${xVal}px`;
    //item.style.top = `${yVal}px`;
    item.style.left = e.clientX-rect.left-item.getAttribute('data-cursorX');
    item.style.top = e.clientY-rect.top-item.getAttribute('data-cursorY');
    item.style.zIndex = '10';
    item.setAttribute('data-cloneX', item.style.left);
    item.setAttribute('data-cloneY', item.style.top);
    logAction('dropped_item', {itemID: item.id, x: parseInt(item.style.left), y: parseInt(item.style.top)});
    saveState();
    item.x = parseInt(item.style.left);//xVal;
    item.y = parseInt(item.style.top);//yVal;
}

function selectItem(item) {
    document.querySelectorAll('.dropped-item').forEach(item => {
        item.classList.remove('selected-item');
        item.querySelectorAll('.circle, .rectangle, .battery1, .battery2, .rectangle2, .trapezoid, .fur1, .fur2').forEach(part => part.classList.remove('selected-item'));
        if (item.querySelector('.rotate-circle')) {
            item.querySelector('.rotate-circle').remove();
        }
    });
    item.classList.add('selected-item');
    const rotateCircle = document.createElement('div'); //for rotation
    rotateCircle.classList.add('rotate-circle');
    item.appendChild(rotateCircle);
    rotateItem(item, rotateCircle);
    if (item.id.startsWith('light-strip') || item.id.startsWith('battery') || item.id.startsWith('speaker') || item.id.startsWith('fur-patch')) {
        item.style.border = 'none';
    }
    if (item.id.startsWith('light-strip')) {
        rotateCircle.style.top = '100px';
        rotateCircle.style.left = '-25px';
        rotateCircle.style.transform = 'rotate(-90deg)';
        item.style.transformOrigin = "10px 100px";
    } else if (item.id.startsWith('battery')) {
        rotateCircle.style.transform = 'translateX(125%)';
        item.style.transformOrigin = "30px 10px";
    } else if (item.id.startsWith('fur-patch')) {
        const numFurs = parseInt(item.getAttribute('data-amount')) || 5;
        rotateCircle.style.transform = `translateX(${(numFurs*7)/2}px)`;
        item.style.transformOrigin = `${(numFurs*7)/2}px 20px`;
    }
    document.querySelector('.color').style.display = 'block';
    document.querySelector('.speed').style.display = 'block';
    document.getElementById('movement-title').style.display = 'block';
    document.querySelector('.movement').style.display = 'block';
    document.querySelector('.custom-user-input').style.display = 'block';
    const sizeScale = document.querySelector('.size-scaling'); //for scaling
    const amountScale = document.querySelector('.amount-scaling');
    if (item.id.startsWith('light-strip') || item.id.startsWith('fur-patch')) {
        sizeScale.style.display = 'block';
        amountScale.style.display = 'block';
    } else if (item.id.startsWith('speaker')) {
        sizeScale.style.display = 'none';
        amountScale.style.display = 'none';
    } else {
        sizeScale.style.display = 'block';
        amountScale.style.display = 'none';
    }
    item.querySelectorAll('.rectangle, .circle, .battery1, .battery2, .rectangle2, .trapezoid, .fur1, .fur2').forEach(part => part.classList.add('selected-item'));
    document.querySelectorAll('.movement > div').forEach(div => {
        div.style.display = 'none';
    });
    if (item.id.startsWith('speaker')) {
        document.getElementById('movement-title').textContent = "Sound";
        document.getElementById('movement-title').style.marginLeft = "45%";
        document.getElementById('custom-title').textContent = "Describe the desired sound:";
        document.getElementById('speed-title').textContent = "Volume";
        document.getElementById('speed-title').style.marginLeft = "";
        document.querySelector('.color').style.display = "none";
    } else if (item.id.startsWith('display')) {
        document.getElementById('movement-title').textContent = "Display";
        document.getElementById('movement-title').style.marginLeft = "45%";
        document.getElementById('custom-title').textContent = "Write my own:";
        document.getElementById('speed-title').textContent = "Speed";
        document.getElementById('speed-title').style.marginLeft = "";
    } else if (item.id.startsWith('battery')) {
        document.getElementById('speed-title').textContent = "Battery Level";
        document.getElementById('speed-title').style.marginLeft = "17%";
        document.getElementById('custom-title').textContent = "Write my own:";
        document.getElementById('movement-title').textContent = "Action";
        document.getElementById('movement-title').style.marginLeft = "";
    } else {
        document.getElementById('movement-title').textContent = "Action";
        document.getElementById('movement-title').style.marginLeft = "";
        document.getElementById('custom-title').textContent = "Write my own:";
        document.getElementById('speed-title').textContent = "Speed";
        document.getElementById('speed-title').style.marginLeft = "";
    }
    let baseId = item.id;
    if (baseId.includes('CLONED')) {
        baseId = item.id.split('-').slice(0, -2).join('-');
    } else {
        baseId = item.id.split('-').slice(0, -1).join('-');
    }
    const movementElement = document.getElementById(`${baseId}-movement`);
    if (movementElement) {
        movementElement.style.display = 'block';
    }
    loadItemSelections(item.id);
}

function rotateItem(item, rotateCircle) {
    let rotating = false;
    let ogAngle = 0;
    let logRotation = 0;
    rotateCircle.addEventListener('mousedown', function(e) {
        rotating = true;
        const rect = item.getBoundingClientRect();
        const centerX = rect.left+rect.width/2;
        const centerY = rect.top+rect.height/2;
        const xVal = e.clientX;
        const yVal = e.clientY;
        ogAngle = Math.atan2(yVal-centerY, xVal-centerX) - getCurrAngle(item);
        logRotation = getCurrAngle(item) * (180/Math.PI);
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
        if (rotating) {
            const rect = item.getBoundingClientRect();
            const centerX = rect.left+rect.width/2;
            const centerY = rect.top+rect.height/2;
            const xVal = e.clientX;
            const yVal = e.clientY;
            const currAngle = Math.atan2(yVal-centerY, xVal-centerX);
            const rotationAngle = currAngle - ogAngle;
            item.setAttribute('data-rotation', rotationAngle*(180/Math.PI));
            const size = item.getAttribute('data-size') || 1;
            item.style.transform = `scale(${size}) rotate(${rotationAngle*(180/Math.PI)}deg)`;
            item.rotation = rotationAngle*(-180/Math.PI);
        }
    });
    document.addEventListener('mouseup', function() {
        if (rotating) {
            rotating = false;
            if (item.rotation != logRotation) {
                logAction('rotated_item', {itemID: item.id, start: logRotation, end: item.rotation});
            }
            saveState();
        }
    });
}
function getCurrAngle(item) {
    const style = window.getComputedStyle(item);
    let transform;
    if (style.transform) {
        transform = style.transform;
    } else {
        transform = 'none';
    }
    if (transform == 'none') {
        return 0;
    }
    const matrix = transform.replace('matrix(', '').replace(')', '').split(', ');
    return Math.atan2(parseFloat(matrix[1]),parseFloat(matrix[0]));
}

function scaleSize(item, num) {
    const currSize = parseFloat(item.getAttribute('data-size')) || 1;
    let newSize = currSize + num;
    newSize = Math.max(0.5, Math.min(newSize, 2));
    item.setAttribute('data-size', newSize);
    const rotation = item.getAttribute('data-rotation') || 0;
    item.style.transform = `scale(${newSize}) rotate(${rotation}deg)`;
    item.scale = newSize;
    logAction('scaled_item', {itemID: item.id, type: 'size', amount: item.getAttribute('data-size')});
}
function scaleAmount(item, num) {
    if (item.id.startsWith('light-strip')) {
        const currLights = parseInt(item.getAttribute('data-amount')) || 6;
        let newLights = currLights + num;
        newLights = Math.max(2, Math.min(newLights, 12));
        item.setAttribute('data-amount', newLights);
        const rectangle = item.querySelector('.rectangle');
        const totalHeight = 210;
        item.querySelectorAll('.circle').forEach(c => c.remove());
        const gap = (totalHeight-20) / (newLights-1);
        for (let i = 0; i < newLights; i++) {
            const circle = document.createElement('div');
            circle.className = 'circle';
            circle.style.top = `${i*gap-3}px`;
            item.appendChild(circle);
        }
        if (rectangle && !item.contains(rectangle)) item.insertBefore(rectangle, item.firstChild);
        selectItem(item);
        item.amount = newLights;
        logAction('scaled_item', {itemID: item.id, type: 'amount', amount: newLights});
    } else if (item.id.startsWith('fur-patch')) {
        const currFur = parseInt(item.getAttribute('data-amount')) || 5;
        let newFur = currFur + num;
        newFur = Math.max(1, Math.min(newFur, 10));
        item.setAttribute('data-amount', newFur);
        const currentColor = item.color;
        item.innerHTML = '';
        for (let i = 0; i < newFur; i++) {
            const left = i * 9;
            const fur1Top = [0, 20];
            const fur2Top = [10];
            fur1Top.forEach(top => {
                const div = document.createElement('div');
                div.className = 'fur1';
                div.style.top = `${top}px`;
                div.style.left = `${left}px`;
                div.style.backgroundColor = currentColor;
                item.appendChild(div);
            });
            fur2Top.forEach(top => {
                const div = document.createElement('div');
                div.className = 'fur2';
                div.style.top = `${top}px`;
                div.style.left = `${left}px`;
                div.style.backgroundColor = currentColor;
                item.appendChild(div);
            });
        }
        selectItem(item);
        item.amount = newFur;
        logAction('scaled_item', {itemID: item.id, type: 'amount', amount: newFur});
    }
}

//saving and loading item selections/customizations
var itemSelections = {
    front: {},
    back: {}
};
function saveItemSelections(itemID, radioSelection, sliderValue, userInput, itemColor, colorX, colorY, gradient, cyoName='') {
    itemSelections[currView][itemID] = {radioSelection, sliderValue, userInput, itemColor, colorX, colorY, gradient, cyoName, rgba2: [...rgba2]};
}
function loadItemSelections(itemID) {
    const selection = itemSelections[currView][itemID];
    if (selection) {
        const radio = document.querySelector(`input[name="item-movement"][value="${selection.radioSelection}"]`);
        if (radio) {
            radio.checked = true;
        } else {
            resetRadioButtons();
        }
        const slider = document.getElementById("speed-range");
        if (slider) {
            slider.value = selection.sliderValue;
            document.getElementById("value").innerHTML = slider.value;
        }
        const userInputBox = document.getElementById('custom-input');
        if (userInputBox) {
            if (selection.userInput) {
                userInputBox.value = selection.userInput;
            } else {
                userInputBox.value = '';
            }
        }
        const cyoNameBox = document.getElementById('cyo-name2');
        if (cyoNameBox) {
            if (selection.cyoName) {
                cyoNameBox.value = selection.cyoName;
            } else {
                cyoNameBox.value = '';
            }
        }
        if (selection.itemColor) {
            const colorCanvas = document.getElementById('colorCanvas');
            const colorCtx = colorCanvas.getContext('2d');
            const colorImg = document.getElementById('color-wheel');
            colorCtx.clearRect(0,0,colorCanvas.width,colorCanvas.height);
            colorCtx.drawImage(colorImg,0,0,colorCanvas.width,colorCanvas.height);
            if (selection.colorX != null && selection.colorY != null) {
                colorX = selection.colorX;
                colorY = selection.colorY;
                rgba2 = selection.rgba2 || [128, 128, 128];
                gradient = selection.gradient;
                colorCtx.beginPath();
                colorCtx.arc(selection.colorX, selection.colorY, 6, 0, 2 * Math.PI);
                colorCtx.lineWidth = 2;
                colorCtx.strokeStyle = 'black';
                colorCtx.stroke();
                const colorRange = document.getElementById('color-range');
                colorRange.value = selection.gradient;
                colorRange.style.background = `linear-gradient(to right, white, ${selection.itemColor}, black)`;
            }
        } else {
            resetColor();
        }
    } else {
        resetRadioButtons();
        resetSlider();
        resetUserInput();
        resetColor();
    }
}
function resetRadioButtons() {
    document.querySelectorAll('input[name="item-movement"]').forEach(input => {
        input.checked = false;
    });
}
function resetSlider() {
    const slider = document.getElementById("speed-range");
    slider.value = 3;
    document.getElementById("value").innerHTML = 3;
}
function resetUserInput() {
    const userInputBox = document.getElementById('custom-input');
    if (userInputBox) userInputBox.value = '';
}
function resetColor() {
    const colorCanvas = document.getElementById('colorCanvas');
    const colorCtx = colorCanvas.getContext('2d');
    const colorImg = document.getElementById('color-wheel');
    colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
    colorCtx.drawImage(colorImg, 0, 0, colorCanvas.width, colorCanvas.height);
    const colorRange = document.getElementById('color-range');
    colorRange.value = 5;
    gradient = 5;
    rgba2 = [128, 128, 128];
    colorX = null;
    colorY = null;
    colorRange.style.background = `linear-gradient(to right, white, rgba(128, 128, 128, 1), black)`;
}
function resetCYOPopup() {
    if (document.getElementById('cyo-name')) document.getElementById('cyo-name').value = '';
    if (document.getElementById('cyo-desc')) document.getElementById('cyo-desc').value = '';
    if (document.getElementById('cyo-desc')) document.getElementById('cyo-desc').value = '';
}
function hexToRgb(hex) {
    const hexVal = parseInt(hex.slice(1), 16);
    return {
        r: (hexVal>>16) & 255,
        g: (hexVal>>8) & 255,
        b: hexVal & 255
    };
}
function changeJacketCol(ctx, canvas, jacketCol) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgb = imgData.data;
    for (let i = 0; i < rgb.length; i += 4) {
        const r = rgb[i], g = rgb[i+1], b = rgb[i+2];
        if (r>200 && g>200 && b>200) {
            rgb[i] = jacketCol.r;
            rgb[i+1] = jacketCol.g;
            rgb[i+2] = jacketCol.b;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

const defaultColor = 'grey';
let rgba2 = [];
let colorX = null, colorY = null;
let gradient = 5;
let startTime, totalTime;
let currJacketCol = {r: 227, g: 227, b: 227};

document.addEventListener('DOMContentLoaded', function() {
    deselectedSidebar();
    //draw jacket & color images to canvas
    const jacketCanvas = document.getElementById('jacketCanvas');
    const jacketCtx = jacketCanvas.getContext('2d');
    const colorCanvas = document.getElementById('colorCanvas');
    const colorCtx = colorCanvas.getContext('2d');
    const jacketImg = document.getElementById('jacket-front');
    const colorImg = document.getElementById('color-wheel');
    //const jacketColSelect =  document.getElementById('jacketcol');
    const jacketColCanvas = document.getElementById('jacketColCanvas');
    const jacketColCtx = jacketColCanvas.getContext('2d');
    const jacketColImg = document.getElementById('jacket-col-wheel');
    let jacketRgba = [227, 227, 227];
    let jacketColX = null, jacketColY = null;
    let jacketGradient = 5;
    if (jacketColImg.complete) {
        jacketColCtx.drawImage(jacketColImg, 0, 0, jacketColCanvas.width, jacketColCanvas.height);
    } else {
        jacketColImg.onload = function() {
            jacketColCtx.drawImage(jacketColImg, 0, 0, jacketColCanvas.width, jacketColCanvas.height);
        };
    }
    drawCanvasImage(jacketImg, jacketCtx, jacketCanvas, currJacketCol);
    //jacket color wheel selection
    jacketColCanvas.addEventListener('click', function(e) {
        const rect = jacketColCanvas.getBoundingClientRect();
        jacketColX = e.clientX - rect.left;
        jacketColY = e.clientY - rect.top;
        const imgData = jacketColCtx.getImageData(jacketColX, jacketColY, 1, 1).data;
        if (imgData[3] !== 0) {
            jacketRgba = [imgData[0], imgData[1], imgData[2]];
            jacketColCtx.clearRect(0, 0, jacketColCanvas.width, jacketColCanvas.height);
            jacketColCtx.drawImage(jacketColImg, 0, 0, jacketColCanvas.width, jacketColCanvas.height);
            jacketColCtx.beginPath();
            jacketColCtx.arc(jacketColX, jacketColY, 5, 0, 2 * Math.PI);
            jacketColCtx.strokeStyle = 'black';
            jacketColCtx.stroke();
            updateJacketCol();
            saveState();
            logAction('changed_jacket_col', `r:${imgData[0]}, g:${imgData[1]}, b:${imgData[2]}`);
        }
    });
    //jacket gradient selection
    document.getElementById('jacket-col-range').addEventListener('input', function(e) {
        jacketGradient = parseInt(e.target.value);
        updateJacketCol();
        saveState();
        logAction('changed_jacket_col', `r:${currJacketCol.r}, g:${currJacketCol.g}, b:${currJacketCol.b}`);
    });
    function updateJacketCol() {
        let color2 = null;
        let ratio = null;
        if (jacketGradient <= 5) {
            ratio = jacketGradient/5;
            color2 = [Math.round(255+(jacketRgba[0]-255)*ratio), Math.round(255+(jacketRgba[1]-255)*ratio), Math.round(255+(jacketRgba[2]-255)*ratio)];
        } else {
            ratio = (jacketGradient-5)/5;
            color2 = [Math.round(jacketRgba[0]*(1-ratio)), Math.round(jacketRgba[1]*(1-ratio)), Math.round(jacketRgba[2]*(1-ratio))];
        }
        currJacketCol = {r: color2[0], g: color2[1], b: color2[2]};
        const currentImg = currView === 'front' ? jacketImg : document.getElementById('jacket-back');
        drawCanvasImage(currentImg, jacketCtx, jacketCanvas, currJacketCol);
    }
    function drawCanvasImage(img, ctx, canvas, jacketCol=null) {
        if (img.complete) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (jacketCol) {
                changeJacketCol(ctx, canvas, jacketCol);
            }
        } else {
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                if (jacketCol) {
                    changeJacketCol(ctx, canvas, jacketCol);
                }
            };
        }
    }
    //drawCanvasImage(jacketImg, jacketCtx, jacketCanvas, hexToRgb(jacketColSelect.value));
    drawCanvasImage(jacketImg, jacketCtx, jacketCanvas, currJacketCol);
    drawCanvasImage(jacketColImg, jacketColCtx, jacketColCanvas, null);
    /*jacketColSelect.addEventListener('input', function() {
        const front = document.getElementById('jacket-front');
        const back = document.getElementById('jacket-back');
        if (currView == 'front') {
            drawCanvasImage(front, jacketCtx, jacketCanvas, hexToRgb(jacketColSelect.value));
        } else {
            drawCanvasImage(back, jacketCtx, jacketCanvas, hexToRgb(jacketColSelect.value));
        }
        logAction('changed_jacket_col', `r:${hexToRgb(jacketColSelect.value).r}, g:${hexToRgb(jacketColSelect.value).g}, b:${hexToRgb(jacketColSelect.value).b}`);
    });*/
    drawCanvasImage(colorImg, colorCtx, colorCanvas, null);
    //color selecting functionality
    colorCanvas.addEventListener('click', function(e) {
        var imgData = colorCtx.getImageData(e.offsetX, e.offsetY, 1, 1);
        var rgba = imgData.data;
        const rect = colorCanvas.getBoundingClientRect();
        colorX = e.clientX - rect.left;
        colorY = e.clientY - rect.top;
        let selectedItem = null;
        if (rgba[3] !== 0) { //if click isnt on transparent area of image
            let baseColor = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3] / 255})`;
            rgba2[0] = rgba[0];
            rgba2[1] = rgba[1];
            rgba2[2] = rgba[2];
            let selectedColor = updateShade(gradient);
            selectedItem = document.querySelector('.dropped-item.selected-item');
            if (selectedItem) {
                selectedItem.setAttribute('data-flashing-color', selectedColor);
                selectedItem.style.backgroundColor = selectedColor;
                selectedItem.querySelectorAll('.circle, .rectangle, .rectangle2, .trapezoid, .fur1, .fur2').forEach(part => {
                    part.style.backgroundColor = selectedColor;
                });
                if (flashingItems.has(selectedItem)) {
                    selectedItem.setAttribute('data-flashing-color', selectedColor);
                }
                if (selectedItem.classList.contains('battery')) {
                    selectedItem.querySelectorAll('.battery-bar').forEach(bar => {
                        bar.style.backgroundColor = selectedColor;
                    });
                }
                selectedItem.color = selectedColor;
                document.getElementById('color-range').style.background = `linear-gradient(to right, white, ${baseColor}, black)`;
                let radioValue;
                const selectedRadio = document.querySelector('input[name="item-movement"]:checked');
                if (selectedRadio) {
                    radioValue = selectedRadio.value;
                } else {
                    radioValue = null;
                }
                selectedItem.setAttribute('data-color', selectedColor);
                saveState();
                logAction('changed_color', {itemID: selectedItem.id, color: selectedItem.getAttribute('data-color')});
                saveItemSelections(selectedItem.id, radioValue, document.getElementById("speed-range").value, document.getElementById("custom-input").value, selectedColor, colorX, colorY, gradient, selectedItem.cyoName);
            }
            colorCtx.clearRect(0,0,colorCanvas.width,colorCanvas.height);
            colorCtx.drawImage(document.getElementById('color-wheel'),0,0,colorCanvas.width,colorCanvas.height);
            colorCtx.beginPath();
            colorCtx.arc(colorX, colorY, 6, 0, 2 * Math.PI);
            colorCtx.lineWidth = 2;
            colorCtx.strokeStyle = 'black';
            colorCtx.stroke();
        }
    });
    document.getElementById('color-range').addEventListener('input', function() {
        gradient = this.value;
        let selectedColor = updateShade(gradient);
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        if (selectedItem) {
            selectedItem.style.backgroundColor = selectedColor;
            selectedItem.querySelectorAll('.circle, .rectangle, .rectangle2, .trapezoid, .fur1, .fur2').forEach(part => {
                part.style.backgroundColor = selectedColor;
            });
            if (selectedItem.classList.contains('battery')) {
                selectedItem.querySelectorAll('.battery-bar').forEach(bar => {
                    bar.style.backgroundColor = selectedColor;
                });
            }
            if (flashingItems.has(selectedItem)) {
                selectedItem.setAttribute('data-flashing-color', selectedColor);
            }
            selectedItem.color = selectedColor;
            let radioValue;
            const selectedRadio = document.querySelector('input[name="item-movement"]:checked');
            if (selectedRadio) {
                radioValue = selectedRadio.value;
            } else {
                radioValue = null;
            }
            saveState();
            logAction('changed_color', {itemID: selectedItem.id, color: selectedColor});
            saveItemSelections(selectedItem.id, radioValue, document.getElementById("speed-range").value, document.getElementById("custom-input").value, selectedColor, colorX, colorY, gradient, selectedItem.cyoName);
        }
    });
    //create item when clicking jacket
    let clickOpen = false;
    const clickItem = document.querySelector('.click-create');
    let lastClickX = 0;
    let lastClickY = 0;
    jacketCanvas.addEventListener('contextmenu', function(e) {
        var imgData = jacketCtx.getImageData(e.offsetX, e.offsetY, 1, 1);
        var rgba = imgData.data;
        if (!clickOpen && rgba[3] !== 0) {
            const rect = jacketCanvas.getBoundingClientRect();
            lastClickX = e.clientX-rect.left+170;//const x = e.clientX-rect.left+170;
            lastClickY = e.clientY-rect.top+15;//const y = e.clientY-rect.top+15;
            clickItem.style.left = `${lastClickX}px`;
            clickItem.style.top = `${lastClickY}px`;
            clickItem.style.display = 'grid';
            clickOpen = true;
        } else {
            clickItem.style.display = 'none';
            clickOpen = false;
        }
        e.stopPropagation();
    });
    document.addEventListener('click', function(e) {
        if (!clickItem.contains(e.target) && clickOpen == true) {
            clickItem.style.display = 'none';
            clickOpen = false;
        }
    });
    document.querySelectorAll('.click-item').forEach(item => {
        const dropArea = document.getElementById('jacketbox');
        let clickedItem = null;
        item.addEventListener('click', function(e) {
            if (e.target.id == 'click-fur') {
                const ogFur = document.querySelector('.option #fur-patch');
                const furClonedNode = ogFur.cloneNode(true);
                furClonedNode.id = `fur-patch-${Date.now()}`;
                furClonedNode.classList.add('dropped-item');
                dropArea.appendChild(furClonedNode);
                clickPositionItem(furClonedNode, lastClickX, lastClickY, dropArea);
                setTimeout(() => selectItem(furClonedNode), 50);
                selectItem(furClonedNode);
                furClonedNode.addEventListener('click', function () {
                    selectItem(furClonedNode);
                });
                (currView == "front" ? frontItems : backItems).push(furClonedNode);
                clickItem.style.display = 'none';
                clickOpen = false;
                saveState();
                logAction('propagated_item', {itemID: item.id, x: item.x, y: item.y});
            } else if (e.target.id == 'click-light1') {
                selectedColor = defaultColor;
                colorX = null, colorY = null;
                clickedItem = document.getElementById('light-ind').cloneNode(true);
                clickedItem.id = `${'light-ind'}-${Date.now()}`;
                clickedItem.className = document.getElementById('light-ind').className + ' dropped-item';
                dropArea.appendChild(clickedItem);
                clickPositionItem(clickedItem, lastClickX, lastClickY, dropArea);
                setTimeout(() => selectItem(clickedItem), 50);
                selectItem(clickedItem);
                clickedItem.addEventListener('click', function () {
                    selectItem(clickedItem);
                });
                (currView == "front" ? frontItems : backItems).push(clickedItem);
                clickItem.style.display = 'none';
                clickOpen = false;
                selectItem(clickedItem);
                document.querySelector('input[name="item-movement"][value="Flash ind"]').checked = true;
                document.querySelector('input[name="item-movement"][value="Flash ind"]').dispatchEvent(new Event('change'));
                clickedItem.setAttribute('data-speed', 400);
                flashAnimation(clickedItem);
                clickedItem.addEventListener('click', function() {
                    selectItem(clickedItem);
                });
                saveState();
                logAction('propagated_item', {itemID: item.id, x: item.x, y: item.y});
            } else if (e.target.id == 'click-light2') {
                selectedColor = defaultColor;
                colorX = null, colorY = null;
                const ogLights = document.querySelector('.option #light-strip');
                const lightClonedNode = ogLights.cloneNode(true);
                lightClonedNode.id = `light-strip-${Date.now()}`;
                lightClonedNode.classList.add('dropped-item');
                dropArea.appendChild(lightClonedNode);
                clickPositionItem(lightClonedNode, lastClickX, lastClickY, dropArea);
                setTimeout(() => selectItem(lightClonedNode), 50);
                selectItem(lightClonedNode);
                lightClonedNode.addEventListener('click', function () {
                    selectItem(lightClonedNode);
                });
                (currView == "front" ? frontItems : backItems).push(lightClonedNode);
                clickItem.style.display = 'none';
                clickOpen = false;
                selectItem(lightClonedNode);
                document.querySelector('input[name="item-movement"][value="Flash str"]').checked = true;
                document.querySelector('input[name="item-movement"][value="Flash str"]').dispatchEvent(new Event('change'));
                lightClonedNode.setAttribute('data-speed', 400);
                flashAnimation(lightClonedNode);
                lightClonedNode.addEventListener('click', function() {
                    selectItem(lightClonedNode);
                });
                saveState();
                logAction('propagated_item', {itemID: item.id, x: item.x, y: item.y});
            } else if (e.target.id == 'click-battery') {
                const ogBattery = document.querySelector('.option #battery');
                const batteryClonedNode = ogBattery.cloneNode(true);
                batteryClonedNode.id = `battery-${Date.now()}`;
                batteryClonedNode.classList.add('dropped-item');
                dropArea.appendChild(batteryClonedNode);
                clickPositionItem(batteryClonedNode, lastClickX, lastClickY, dropArea);
                setTimeout(() => selectItem(batteryClonedNode), 50);
                selectItem(batteryClonedNode);
                batteryClonedNode.addEventListener('click', function () {
                    selectItem(batteryClonedNode);
                });
                batteryClonedNode.querySelector('#bar1').style.opacity = 1;
                batteryClonedNode.querySelector('#bar2').style.opacity = 1;
                batteryClonedNode.querySelector('#bar3').style.opacity = 1;
                batteryClonedNode.querySelector('#bar4').style.opacity = 0;
                batteryClonedNode.querySelector('#bar5').style.opacity = 0;
                (currView == "front" ? frontItems : backItems).push(batteryClonedNode);
                clickItem.style.display = 'none';
                clickOpen = false;
                saveState();
                logAction('propagated_item', {itemID: item.id, x: item.x, y: item.y});
            } else if (e.target.id == 'click-display') {
                clickedItem = document.getElementById('display').cloneNode(true);
                clickedItem.id = `${'display'}-${Date.now()}`;
                clickedItem.className = document.getElementById('display').className + ' dropped-item';
                dropArea.appendChild(clickedItem);
                clickPositionItem(clickedItem, lastClickX, lastClickY, dropArea);
                setTimeout(() => selectItem(clickedItem), 50);
                selectItem(clickedItem);
                clickedItem.addEventListener('click', function () {
                    selectItem(clickedItem);
                });
                (currView == "front" ? frontItems : backItems).push(clickedItem);
                clickItem.style.display = 'none';
                clickOpen = false;
                saveState();
                logAction('propagated_item', {itemID: item.id, x: item.x, y: item.y});
            } else if (e.target.id == 'click-speaker') {
                const ogSpeaker = document.querySelector('.option #speaker');
                const speakerClonedNode = ogSpeaker.cloneNode(true);
                speakerClonedNode.id = `speaker-${Date.now()}`;
                speakerClonedNode.classList.add('dropped-item');
                dropArea.appendChild(speakerClonedNode);
                clickPositionItem(speakerClonedNode, lastClickX, lastClickY, dropArea);
                setTimeout(() => selectItem(speakerClonedNode), 50);
                selectItem(speakerClonedNode);
                speakerClonedNode.addEventListener('click', function () {
                    selectItem(speakerClonedNode);
                });
                (currView == "front" ? frontItems : backItems).push(speakerClonedNode);
                clickItem.style.display = 'none';
                clickOpen = false;
                saveState();
                logAction('propagated_item', {itemID: item.id, x: item.x, y: item.y});
            } else if (e.target.id == 'click-other') {
                clickedItem = document.getElementById('other').cloneNode(true);
                clickedItem.id = `${'other'}-${Date.now()}`;
                clickedItem.className = document.getElementById('other').className + ' dropped-item';
                dropArea.appendChild(clickedItem);
                clickPositionItem(clickedItem, lastClickX, lastClickY, dropArea);
                setTimeout(() => selectItem(clickedItem), 50);
                selectItem(clickedItem);
                clickedItem.addEventListener('click', function () {
                    selectItem(clickedItem);
                });
                (currView == "front" ? frontItems : backItems).push(clickedItem);
                clickItem.style.display = 'none';
                clickOpen = false;
                document.querySelector('.popup-cyo').classList.add('show');
                resetCYOPopup();
                saveState();
                logAction('propagated_item', {itemID: item.id, x: item.x, y: item.y});
            }
        });
    });
    //slider functionality
    var slider = document.getElementById("speed-range");
    slider.oninput = function() {
        document.querySelector('.dropped-item.selected-item').setAttribute('data-speed', updateSpeed(this.value));//this.value*100);
    }
    //saving radio button selection
    document.querySelectorAll('input[name="item-movement"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const selectedItem = document.querySelector('.dropped-item.selected-item');
            if (selectedItem) {
                const sliderVal = document.getElementById("speed-range").value;
                logAction('changed_button', {itemID: selectedItem.id, button: radio.value});
                saveItemSelections(selectedItem.id, this.value, sliderVal, document.getElementById("custom-input").value, selectedItem.getAttribute('data-color'), colorX, colorY, gradient);
                if (radio.value.includes('Light on')) {
                    stopFlash(selectedItem);
                } else if (radio.value.includes('Flash')) {
                    flashAnimation(selectedItem);
                    const currMovement = document.querySelector('input[name="item-movement"]:checked');
                    if (currMovement && currMovement.value.includes('Light on')) {
                        stopFlash(selectedItem);
                        return;
                    }
                    flashAnimation(selectedItem);
                } else if (radio.value.includes('Trickle up')) {
                    flashAnimation(selectedItem, 'trickle-up');
                    const currMovement = document.querySelector('input[name="item-movement"]:checked');
                    if (currMovement && currMovement.value.includes('Light on')) {
                        stopFlash(selectedItem);
                        return;
                    }
                    flashAnimation(selectedItem, 'trickle-up');
                } else if (radio.value.includes('Trickle down')) {
                    flashAnimation(selectedItem, 'trickle-down');
                    const currMovement = document.querySelector('input[name="item-movement"]:checked');
                    if (currMovement && currMovement.value.includes('Light on')) {
                        stopFlash(selectedItem);
                        return;
                    }
                    flashAnimation(selectedItem, 'trickle-down');
                } else if (radio.value.includes('Random fl')) {
                    flashAnimation(selectedItem, 'random-fl');
                    const currMovement = document.querySelector('input[name="item-movement"]:checked');
                    if (currMovement && currMovement.value.includes('Light on')) {
                        stopFlash(selectedItem);
                        return;
                    }
                    flashAnimation(selectedItem, 'random-fl');
                } else if (radio.value.includes('Shake')) {
                    furAnimation(selectedItem, 'shake');
                } else if (radio.value.includes('Stick up')) {
                    furAnimation(selectedItem, 'stick-up');
                } else if (radio.value.includes('Both')) {
                    furAnimation(selectedItem, 'both');
                } else if (radio.value.includes('Roll')) {
                    furAnimation(selectedItem, 'roll');
                }
                selectedItem.radioSelection = this.value;
                selectedItem.speed = sliderVal;
                saveState();
            }
        });
    });
    //saving user input
    document.getElementById("custom-input").addEventListener('input', function(){
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        let radioValue;
        if (selectedItem) {
            const selectedRadio = document.querySelector('input[name="item-movement"]:checked');
            if (selectedRadio) {
                radioValue = selectedRadio.value;
            } else {
                radioValue = null;
            }
            saveState();
            saveItemSelections(selectedItem.id, radioValue, document.getElementById("speed-range").value, this.value, selectedItem.getAttribute('data-color'), colorX, colorY, gradient, selectedItem.cyoName);
            selectedItem.userinput = document.getElementById("custom-input").value;
            logAction('custom_input', {itemID: selectedItem.id, input: document.getElementById("custom-input").value});
        }
    });
    //saving slider selection
    document.getElementById("speed-range").addEventListener('input', function() {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        let radioValue;
        if (selectedItem) {
            if (selectedItem.classList.contains('battery')) {
                for (let i = 1; i <= 5; i++) {
                    if (i <= this.value) {
                        selectedItem.querySelector('#bar'+i).style.opacity = 1;
                    } else {
                        selectedItem.querySelector('#bar'+i).style.opacity = 0;
                    }
                }
            }
            const selectedRadio = document.querySelector('input[name="item-movement"]:checked');
            if (selectedRadio) {
                radioValue = selectedRadio.value;
            } else {
                radioValue = null;
            }
            selectedItem.setAttribute('data-speed', updateSpeed(this.value));
            selectedItem.speed = this.value;
            saveState();
            logAction('adjusted_slider', {itemID: selectedItem.id, slider: this.value});
            saveItemSelections(selectedItem.id, radioValue, this.value, document.getElementById("custom-input").value, selectedItem.getAttribute('data-color'), colorX, colorY, gradient, selectedItem.cyoName);
            if (flashingItems.has(selectedItem)) {
                flashAnimation(selectedItem, selectedItem.radioSelection.toLowerCase().replace(/\s+/g, '-'));
            }
            if (furAnimItems.has(selectedItem)) {
                furAnimation(selectedItem, selectedItem.radioSelection.toLowerCase().replace(/\s+/g, '-'));
            }
        }
    });
    //delete & move item with keys
    let isCopied = false;
    let copiedItem = null;
    document.addEventListener('keydown', (e) => {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        if (document.activeElement.tagName == 'INPUT' || document.activeElement.tagName == 'TEXTAREA') return;
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
        if (ctrlOrCmd && e.key.toLowerCase() == 'c') { //copy item
            if (selectedItem) {
                isCopied = true;
                copiedItem = selectedItem;
            }
            return;
        }
        if (ctrlOrCmd && e.key.toLowerCase() == 'v') { //paste item
            if (isCopied) duplicate(copiedItem);
            //isCopied = false;
            return;
        }
        if (selectedItem) {
            let newX = parseInt(selectedItem.style.left);
            let newY = parseInt(selectedItem.style.top);
            let tempItem = null;
            if (e.key == 'Delete' || e.key == 'Backspace') {
                deleteItem();
            } else if (e.key == 'ArrowUp') {
                newY -= 10;
                tempItem = {style: {x: `${newX}px`, y: `${newY}px`}};
                if (!isTransparent(tempItem)) {
                    selectedItem.style.left = `${newX}px`;
                    selectedItem.style.top = `${newY}px`;
                    selectedItem.x = newX;
                    selectedItem.y = newY;
                    logAction('moved_item_with_key', {itemID: selectedItem.id, x: newX, y: newY});
                }
            } else if (e.key == 'ArrowDown') {
                newY += 10;
                tempItem = {style: {x: `${newX}px`, y: `${newY}px`}};
                if (!isTransparent(tempItem)) {
                    selectedItem.style.left = `${newX}px`;
                    selectedItem.style.top = `${newY}px`;
                    selectedItem.x = newX;
                    selectedItem.y = newY;
                    logAction('moved_item_with_key', {itemID: selectedItem.id, x: newX, y: newY});
                }
            } else if (e.key == 'ArrowLeft') {
                newX -= 10;
                tempItem = {style: {x: `${newX}px`, y: `${newY}px`}};
                if (!isTransparent(tempItem)) {
                    selectedItem.style.left = `${newX}px`;
                    selectedItem.style.top = `${newY}px`;
                    selectedItem.x = newX;
                    selectedItem.y = newY;
                    logAction('moved_item_with_key', {itemID: selectedItem.id, x: newX, y: newY});
                }
            } else if (e.key == 'ArrowRight') {
                newX += 10;
                tempItem = {style: {x: `${newX}px`, y: `${newY}px`}};
                if (!isTransparent(tempItem)) {
                    selectedItem.style.left = `${newX}px`;
                    selectedItem.style.top = `${newY}px`;
                    selectedItem.x = newX;
                    selectedItem.y = newY;
                    logAction('moved_item_with_key', {itemID: selectedItem.id, x: newX, y: newY});
                }
            }
        }
        saveState();
    });
    //scaling items based on size & amount
    document.getElementById('size-dec').addEventListener('click', () => {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        if (selectedItem) scaleSize(selectedItem, -0.1);
        saveState();
    });
    document.getElementById('size-inc').addEventListener('click', () => {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        if (selectedItem) scaleSize(selectedItem, +0.1);
        saveState();
    });
    document.getElementById('amount-dec').addEventListener('click', () => {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        if (selectedItem) scaleAmount(selectedItem, -1);
        saveState();
    });
    document.getElementById('amount-inc').addEventListener('click', () => {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        if (selectedItem) scaleAmount(selectedItem, +1);
        saveState();
    });
    //cyo new item popup
    document.getElementById("cyo-save").addEventListener('click', function(e) {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        let radioValue;
        if (selectedItem) {
            const selectedRadio = document.querySelector('input[name="item-movement"]:checked');
            if (selectedRadio) {
                radioValue = selectedRadio.value;
            } else {
                radioValue = null;
            }
            const cyoFullName = document.getElementById('cyo-name').value;
            document.getElementById('cyo-name2').value = cyoFullName;
            document.getElementById('custom-input').value = document.getElementById('cyo-desc').value;
            document.querySelector('.popup-cyo').classList.remove('show');
            selectedItem.cyoName = cyoFullName;
            selectedItem.userinput = document.getElementById("custom-input").value;
            let cyoMiddleTxt = selectedItem.querySelector('.cyo-text');
            if (!cyoMiddleTxt) {
                cyoMiddleTxt = document.createElement('div');
                cyoMiddleTxt.className = 'cyo-text';
                cyoMiddleTxt.style.position = 'absolute';
                cyoMiddleTxt.style.top = '50%';
                cyoMiddleTxt.style.left = '50%';
                cyoMiddleTxt.style.transform = 'translate(-50%, -50%)';
                cyoMiddleTxt.style.textAlign = 'center';
                cyoMiddleTxt.style.fontSize = '15px';
                cyoMiddleTxt.style.fontWeight = 'bold';
                cyoMiddleTxt.style.color = 'white';
                cyoMiddleTxt.style.pointerEvents = 'none';
                cyoMiddleTxt.style.webkitTextStroke = '0.5px black';
                selectedItem.appendChild(cyoMiddleTxt);
            }
            cyoMiddleTxt.textContent = cyoFullName.substring(0, 5);
            saveItemSelections(selectedItem.id, radioValue, document.getElementById("speed-range").value, selectedItem.userinput, selectedItem.getAttribute('data-color'), colorX, colorY, gradient, selectedItem.cyoName);
            logAction('created_item', {itemID: selectedItem.id, name: cyoFullName});
        }
    });
    document.getElementById("cyo-cancel").addEventListener('click', function(e) {
        document.querySelector('.popup-cyo').classList.remove('show');
        deleteItem();
    });
    document.getElementById("cyo-name2").addEventListener('input', function() {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        let radioValue;
        if (selectedItem) {
            const selectedRadio = document.querySelector('input[name="item-movement"]:checked');
            if (selectedRadio) {
                radioValue = selectedRadio.value;
            } else {
                radioValue = null;
            }
            const cyoFullName = this.value;
            selectedItem.cyoName = cyoFullName;
            let cyoMiddleTxt = selectedItem.querySelector('.cyo-text');
            if (!cyoMiddleTxt) {
                cyoMiddleTxt = document.createElement('div');
                cyoMiddleTxt.className = 'cyo-text';
                cyoMiddleTxt.style.position = 'absolute';
                cyoMiddleTxt.style.top = '50%';
                cyoMiddleTxt.style.left = '50%';
                cyoMiddleTxt.style.transform = 'translate(-50%, -50%)';
                cyoMiddleTxt.style.textAlign = 'center';
                cyoMiddleTxt.style.fontSize = '12px';
                cyoMiddleTxt.style.fontWeight = 'bold';
                cyoMiddleTxt.style.color = 'white';
                cyoMiddleTxt.style.pointerEvents = 'none';
                cyoMiddleTxt.style.webkitTextStroke = '0.5px black';
                selectedItem.appendChild(cyoMiddleTxt);
            }
            cyoMiddleTxt.textContent = cyoFullName.substring(0, 5);
            saveItemSelections(selectedItem.id, radioValue, document.getElementById("speed-range").value, selectedItem.userinput, selectedItem.getAttribute('data-color'), colorX, colorY, gradient, this.value);
            selectedItem.cyoName = document.getElementById("cyo-name2").value;
            saveState();
            logAction('changed_item_name', {itemID: selectedItem.id, input: cyoFullName});
        }
    });
    //user input for popup
    const p1 = document.getElementById("participant1");
    const vN1 = document.getElementById("videoNum1")
    p1.addEventListener('input', function() {
        if ((p1.value != "") && (vN1.value != "")) {
            document.getElementById("continue-button").disabled = false;
        } else {
            document.getElementById("continue-button").disabled = true;
        }
    });
    vN1.addEventListener('input', function() {
        if ((p1.value != "") && (vN1.value != "")) {
            document.getElementById("continue-button").disabled = false;
        } else {
            document.getElementById("continue-button").disabled = true;
        }
    });
    //info popup
    document.querySelector('.popup-info').style.display = 'none';
    document.getElementById('info-button').addEventListener('click', function() {
        document.querySelector('.popup-info').style.display = 'block';
    });
    document.getElementById('close-info').addEventListener('click', function() {
        document.querySelector('.popup-info').style.display = 'none';
    });
    //submitted popup
    document.getElementById('save-button').addEventListener('click', function() {
        submitPopup();
    });
    //clicking to deselect
    document.querySelector('.container').addEventListener('click', function(e) {
        const selectedItem = document.querySelector('.dropped-item.selected-item');
        if (selectedItem && e.target != selectedItem && !e.target.closest('.customization') && !e.target.closest('.rotate-circle') && !e.target.closest('#back-view') && !e.target.closest('#front-view') && !e.target.closest('.popup-cyo')) {
            selectedItem.classList.remove('selected-item');
            selectedItem.querySelectorAll('.circle, .rectangle, .battery1, .battery2, .rectangle2, .trapezoid, .fur1, .fur2')
            .forEach(part => part.classList.remove('selected-item'));
            const rotateHandle = selectedItem.querySelector('.rotate-circle');
            if (rotateHandle) {
                rotateHandle.remove();
            }
            deselectedSidebar();
        }
        if (e.target.closest('.dropped-item')) {
            const item = e.target.closest('.dropped-item');
            selectItem(item);
        }
    });
});

function deselectedSidebar() {
    document.querySelector('.size-scaling').style.display = 'none';
    document.querySelector('.amount-scaling').style.display = 'none';
    document.querySelector('.color').style.display = 'none';
    document.querySelector('.speed').style.display = 'none';
    document.getElementById('movement-title').style.display = 'none';
    document.querySelector('.movement').style.display = 'none';
    document.querySelector('.custom-user-input').style.display = 'none';
}

function isTransparent(item) {
    const jacketCanvas = document.getElementById('jacketCanvas');
    const jacketCtx = jacketCanvas.getContext('2d');
    var imgData = jacketCtx.getImageData(parseInt(item.style.x)-130, parseInt(item.style.y), 1, 1);
    var rgba = imgData.data;
    return rgba[3] == 0;
}

function clickPositionItem(item, xClick, yClick, area) {
    const rect = area.getBoundingClientRect();
    const xVal = xClick+140-item.offsetWidth/2;//rect.left-item.offsetWidth/2;
    const yVal = yClick+55-item.offsetHeight/2;//rect.top-item.offsetHeight/2;
    item.style.position = 'absolute';
    item.style.left = `${xVal}px`;
    item.style.top = `${yVal}px`;
    item.style.zIndex = '10';
    if (item.id.startsWith('light-strip')) {
        item.style.left=`${xVal-10}px`;
    } else if (item.id.startsWith('battery')) {
        item.style.left=`${xVal-30}px`;
        item.style.top=`${yVal-10}px`;
    } else if (item.id.startsWith('fur-patch')) {
        item.style.left=`${xVal-20}px`;
        item.style.top=`${yVal-20}px`;
    }
    item.x = xVal;
    item.y = yVal;
}

function updateShade(sliderVal) {
    let color2 = null;
    let ratio = null;
    if (sliderVal <= 5) {
        ratio = sliderVal/5;
        color2 = `rgba(${Math.round(255+(rgba2[0]-255)*ratio)}, ${Math.round(255+(rgba2[1]-255)*ratio)}, ${Math.round(255+(rgba2[2]-255)*ratio)}, 1)`.replace(/\s+/g, '');
    } else {
        ratio = (sliderVal-5)/5;
        color2 = `rgba(${Math.round(rgba2[0]*(1-ratio))}, ${Math.round(rgba2[1]*(1-ratio))}, ${Math.round(rgba2[2]*(1-ratio))}, 1)`.replace(/\s+/g, '');
    }
    return color2;
}

function updateSpeed(sliderVal) {
    let speed;
    if (sliderVal == 1) {
        speed = 700;
    } else if (sliderVal == 2) {
        speed = 550;
    } else if (sliderVal == 3) {
        speed = 400;
    } else if (sliderVal == 4) {
        speed = 250;
    } else if (sliderVal == 5) {
        speed = 90;
    }
    return speed;
}

//normalize/reformat color string so rgba comparison works
function normalizeColorStr(colorStr) {
    colorStr = colorStr.replace(/\s+/g, '').toLowerCase();
    if (colorStr.startsWith('rgb(') && !colorStr.startsWith('rgba')) {
        const rgba = colorStr.match(/\d+/g);
        if (rgba && rgba.length == 3) {
            return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},1)`;
        }
    }
    return colorStr;
}

const flashingItems = new Set();
function flashAnimation(item, flashPattern) {
    if (item.flashInterval) {
        clearInterval(item.flashInterval);
    }
    flashingItems.add(item);
    let lights = Array.from(item.querySelectorAll('.circle'));
    let selectedColor = item.getAttribute('data-flashing-color');
    let currSpeed = parseInt(item.getAttribute('data-speed'));
    if (!selectedColor) {
        item.setAttribute('data-flashing-color', defaultColor);
    } else {
        item.setAttribute('data-flashing-color', selectedColor);
    }
    if (flashPattern == 'trickle-up' || flashPattern == 'trickle-down') {
        if (flashPattern == 'trickle-up') {
            lights.reverse();
        }
        let currLight = 0; //current light that's flashing
        item.flashInterval = setInterval(() => {
            selectedColor = normalizeColorStr(item.getAttribute('data-flashing-color'));
            for (let i = 0; i < lights.length; i++) {
                if (i == currLight) {
                    lights[i].style.backgroundColor = selectedColor;
                } else {
                    lights[i].style.backgroundColor = '#bbb';
                }
            }
            currLight = (currLight+1) % lights.length;
        }, currSpeed);
    } else if (flashPattern == 'random-fl') {
        item.flashInterval = setInterval(() => {
            selectedColor = normalizeColorStr(item.getAttribute('data-flashing-color'));
            for (let i = 0; i < lights.length; i++) {
                const randomFlash = Math.random();
                if (randomFlash > 0.5) {
                    lights[i].style.backgroundColor = selectedColor;
                } else {
                    lights[i].style.backgroundColor = '#bbb';
                }
            }
        }, currSpeed);
    } else { //default flash
        let isOn = false;
        item.flashInterval = setInterval(() => {
            let flashingColor = normalizeColorStr(item.getAttribute('data-flashing-color'));
            if (!flashingColor) {
                flashingColor = defaultColor;
            }
            isOn = !isOn;
            if (item.classList.contains('light-ind')) {
                if (isOn) {
                    item.style.backgroundColor = flashingColor;
                } else {
                    item.style.backgroundColor = '#bbb';
                }
            } else {
                item.querySelectorAll('.rectangle, .circle').forEach(part => {
                    if (isOn) {
                        part.style.backgroundColor = flashingColor;
                    } else {
                        part.style.backgroundColor = '#bbb';
                    }
                });
            }
        }, currSpeed);
    }
}
//light on & no flash option
function stopFlash(item) {
    let selectedColor = item.getAttribute('data-flashing-color');
    if (item.flashInterval) { 
        clearInterval(item.flashInterval);
        item.flashInterval = null;
    }
    flashingItems.delete(item);
    if (item.classList.contains('light-ind')) {
        if (item.getAttribute('data-flashing-color')) {
            item.style.backgroundColor = item.getAttribute('data-flashing-color');
        }
        item.style.backgroundColor = selectedColor;
    } else {
        item.querySelectorAll('.rectangle, .circle').forEach(part => {
            if (item.getAttribute('data-flashing-color')) {
                part.style.backgroundColor = item.getAttribute('data-flashing-color');
            }
            part.style.backgroundColor = selectedColor;
        });
    }
}

const furAnimItems = new Set();
function furAnimation(item, shakePattern) {
    if (item.shakeInterval) {
        clearInterval(item.shakeInterval);
    }
    //if (!item.hasAttribute('data-speed')) item.setAttribute('data-speed', 400);
    furAnimItems.add(item);
    const furs = item.querySelectorAll('.fur1, .fur2');
    let currSpeed = parseInt(item.getAttribute('data-speed'));
    if (shakePattern == 'shake') {
        furs.forEach(fur => {
            if (getComputedStyle(fur).transform !== 'none') {
                if (fur.classList.contains('fur1')) {
                    fur.style.transform = 'rotate(15deg)';
                } else if (fur.classList.contains('fur2')) {
                    fur.style.transform = 'rotate(-15deg)';
                }
            }
        });
        let direction = 1;
        item.shakeInterval = setInterval(() => {
            /*item.style.transform = `rotate(${5*direction}deg)`;
            direction *= -1;*/
            furs.forEach(fur => {
                if (fur.classList.contains('fur1')) {
                    fur.style.transform = `rotate(${7*direction}deg)`;
                } else if (fur.classList.contains('fur2')) {
                    fur.style.transform = `rotate(${-7*direction}deg)`;
                }
            });
            direction *= -1;
        }, currSpeed);
    } else if (shakePattern == 'stick-up') {
        furs.forEach(fur => {
            fur.style.transition = 'transform 0.3s ease';
            fur.style.transform = 'rotate(-40deg)';
        });
    } else if (shakePattern == 'both') {
        furAnimation(item, 'stick-up');
        let direction = 1;
        item.shakeInterval = setInterval(() => {
            furs.forEach(fur => {
                fur.style.transform = `rotate(${-7*direction}deg)`;
            });
            direction *= -1;
        }, currSpeed);
    } else if (shakePattern == 'roll') {
        const topFur = [];
        const middleFur = [];
        const bottomFur = [];
        furs.forEach(fur => {
            if (parseInt(fur.style.top) == 0) {
                topFur.push(fur);
            } else if (parseInt(fur.style.top) == 10) {
                middleFur.push(fur);
            } else {
                bottomFur.push(fur);
            }
        });
        let step = 0, pauseCt = 0;
        const maxSteps = 6;
        let direction = 1;
        item.shakeInterval = setInterval(() => {
            if (direction == -1 && pauseCt < 3) {
                pauseCt++;
                return;
            }
            step += direction;
            let topAngle = 10;
            let middleAngle = -10;
            let bottomAngle = 10;
            if (step == 1) {
                topAngle += 9;
            } else if (step == 2) {
                topAngle += 19;
                middleAngle += 9;
            } else if (step == 3) {
                middleAngle += 25;
                bottomAngle += 5;
            } else if (step == 4) {
                middleAngle += 15;
                bottomAngle += 15;
            } else if (step == 5) {
                bottomAngle += 5;
            }
            topFur.forEach(fur => fur.style.transform = `rotate(${topAngle}deg)`);
            middleFur.forEach(fur => fur.style.transform = `rotate(${middleAngle}deg)`);
            bottomFur.forEach(fur => fur.style.transform = `rotate(${bottomAngle}deg)`);
            if (step >= maxSteps) {
                direction = -1;
                step = 0;
                pauseCt = 0;
            } else if (step <= 0 && direction == -1) {
                direction = 1;
            }
        }, currSpeed/2);
    }
}
function stopFur(item) {
    if (item.shakeInterval) { 
        clearInterval(item.shakeInterval);
        item.shakeInterval = null;
    }
    furAnimItems.delete(item);
}

//duplicate selected item
function duplicate(item=null) {
    const selectedItem = item || document.querySelector('.dropped-item.selected-item');
    if (selectedItem) {
        const clonedItem = selectedItem.cloneNode(true);
        //const tempId = selectedItem.id.split('-').slice(0, -1).join('-');
        let tempIdParts = selectedItem.id.split('-');
        if (tempIdParts.includes('CLONED')) {
            tempIdParts = tempIdParts.slice(0, -2);
        } else {
            tempIdParts = tempIdParts.slice(0, -1);
        }
        const tempId = tempIdParts.join('-');
        clonedItem.id = `${tempId}-CLONED-${Date.now()}`;
        clonedItem.className = selectedItem.className + ' dropped-item';
        clonedItem.style.cssText = selectedItem.style.cssText;
        const dropArea = document.getElementById('jacketbox');
        //const rect = selectedItem.getBoundingClientRect();
        let xVal = parseInt(selectedItem.getAttribute('data-cloneX'))+20;//rect.left-dropArea.offsetLeft+10;
        let yVal = parseInt(selectedItem.getAttribute('data-cloneY'))+20;//rect.top-dropArea.offsetTop+10;
        clonedItem.style.position = 'absolute';
        clonedItem.style.left = `${xVal}px`;
        clonedItem.style.top = `${yVal}px`;
        clonedItem.style.zIndex = '10';
        const jacketCanvas = document.getElementById('jacketCanvas');
        const jacketCtx = jacketCanvas.getContext('2d');
        var imgData = jacketCtx.getImageData(parseInt(clonedItem.style.left)-130, parseInt(clonedItem.style.top), 1, 1);
        var rgba = imgData.data;
        if (rgba[3] == 0) return;
        clonedItem.setAttribute("draggable", "true");
        clonedItem.addEventListener('dragstart', drag);
        clonedItem.addEventListener('dragover', dragOver);
        clonedItem.addEventListener('drop', drop);
        dropArea.appendChild(clonedItem);
        if (currView === 'front') {
            frontItems.push(clonedItem);
            clonedItem.style.display = 'block';
        } else if (currView === 'back') {
            backItems.push(clonedItem);
            clonedItem.style.display = 'block';
        }
        const ogCustomizations = itemSelections[currView][selectedItem.id];
        if (ogCustomizations) {
            itemSelections[currView][clonedItem.id] = {...ogCustomizations};
            clonedItem.radioSelection = ogCustomizations.radioSelection;
            clonedItem.speed = ogCustomizations.sliderValue;
            clonedItem.setAttribute('data-speed', updateSpeed(ogCustomizations.sliderValue));//ogCustomizations.sliderValue*100);
            clonedItem.userinput = ogCustomizations.userInput;
            clonedItem.cyoName = ogCustomizations.cyoName;
            clonedItem.color = ogCustomizations.itemColor;
            clonedItem.x = xVal;
            clonedItem.y = yVal;
            clonedItem.setAttribute('data-cloneX', xVal);
            clonedItem.setAttribute('data-cloneY', yVal);
        } else {
            clonedItem.radioSelection = null;
            clonedItem.speed = null;
            clonedItem.userinput = null;
            clonedItem.cyoName = null;
            clonedItem.color = null;
            clonedItem.x = xVal;
            clonedItem.y = yVal;
            clonedItem.setAttribute('data-cloneX', xVal);
            clonedItem.setAttribute('data-cloneY', yVal);
        }
        document.querySelectorAll('.dropped-item.selected-item').forEach(item => {
            item.classList.remove('selected-item');
            item.querySelectorAll('.circle, .rectangle, .battery1, .battery2, .rectangle2, .trapezoid, .fur1, .fur2').forEach(part => part.classList.remove('selected-item'));
            const rotateHandle = item.querySelector('.rotate-circle');
            if (rotateHandle) {
                rotateHandle.remove();
            }
        });
        logAction('duplicated_item', {itemID: selectedItem.id});
        selectItem(clonedItem);
        clonedItem.setAttribute('data-flashing-color', selectedItem.getAttribute('data-flashing-color'));
        if (flashingItems.has(selectedItem)) {
            flashingItems.add(clonedItem);
            let formattedRadioSelection = clonedItem.radioSelection.toLowerCase().replace(/\s+/g, '-');
            flashAnimation(clonedItem, formattedRadioSelection);
        }
        if (furAnimItems.has(selectedItem)) {
            furAnimItems.add(clonedItem);
            let formattedRadioSelection = clonedItem.radioSelection.toLowerCase().replace(/\s+/g, '-');
            furAnimation(clonedItem, formattedRadioSelection);
        }
        selectItem(clonedItem);
        saveState();
    }
}

let keystrokeLog = [];
function logAction(action, info) {
    keystrokeLog.push({
        timestamp: new Date().toISOString(),
        action: action,
        info: info
    });
}

let undoStack = [];
let redoStack = [];
function undo() {
    if (undoStack.length < 2) return;
    const lastState = undoStack.pop();
    redoStack.push(lastState);
    loadState(undoStack[undoStack.length - 1]);
    logAction('undo');
}
function redo() {
    if (redoStack.length == 0) return;
    const redoState = redoStack.pop();
    undoStack.push(redoState);
    loadState(redoState);
    logAction('redo');
}
function saveState() {
    const dropArea = document.getElementById("jacketbox");
    const selectedItem = document.querySelector('.dropped-item.selected-item');
    const visibleItems = Array.from(dropArea.querySelectorAll('.dropped-item')).filter(item => 
        item.style.display != 'none' && !item.id.startsWith('DELETED')
    );
    const allItems = Array.from(dropArea.querySelectorAll('.dropped-item'))
        .filter(item => !item.id.startsWith('DELETED'))
        .map(item => {
            const isFrontItem = frontItems.find(frontItem => frontItem.id == item.id);
            let view = isFrontItem ? 'front' : 'back';
            if (visibleItems.includes(item)) view = currView;
            const settings = itemSelections[view]?.[item.id] ? { ...itemSelections[view][item.id] } : {};
            settings.sliderValue = item.speed || 3;
            settings.userInput = item.userinput;
            settings.rotation = parseFloat(item.getAttribute('data-rotation')) || item.rotation || 0;
            settings.scale = parseFloat(item.getAttribute('data-size')) || item.scale || 1;
            settings.amount = parseFloat(item.getAttribute('data-amount')) || item.amount || 1;
            settings.colorX = colorX;
            settings.colorY = colorY;
            settings.rgba2 = [...rgba2];
            settings.gradient = gradient;
            settings.itemColor = item.getAttribute('data-flashing-color') || item.color;
            settings.cursorX = parseFloat(item.getAttribute('data-cursorX')) || 0;
            settings.cursorY = parseFloat(item.getAttribute('data-cursorY')) || 0;
            settings.cloneX = item.getAttribute('data-cloneX');
            settings.cloneY = item.getAttribute('data-cloneY');
            itemSelections[view][item.id] = settings;
            return {
                id: item.id,
                className: item.className,
                style: item.style.cssText,
                html: item.innerHTML,
                flashingColor: item.getAttribute('data-flashing-color'),
                speed: item.getAttribute('data-speed'),
                view,
                settings//: itemSelections[view]?.[item.id] ? { ...itemSelections[view][item.id] } : null
            };
        });
    if (undoStack.length == 0) {
        undoStack.push({
            items: [],
            selectedId: null,
            view: currView
        });
    }
    const lastState = undoStack[undoStack.length-1];
    if (lastState.items.length != allItems.length ||
        lastState.view != currView ||
        lastState.selectedId != (selectedItem?.id || null) ||
        JSON.stringify(lastState.items) != JSON.stringify(allItems)) {
        undoStack.push({
            items: allItems,
            selectedId: selectedItem?.id || null,
            view: currView
        });
        redoStack = [];
    }
}
function loadState(state) {
    const { items, selectedId, view } = state;
    const dropArea = document.getElementById("jacketbox");
    dropArea.querySelectorAll('.dropped-item').forEach(item => item.remove());
    document.querySelectorAll('input[name="item-movement"]').forEach(radio => radio.checked = false);
    flashingItems.clear();
    furAnimItems.clear();
    frontItems.length = 0;
    backItems.length = 0;
    if (view != currView) switchView(view);
    items.forEach(data => {
        const newItem = document.createElement("div");
        newItem.id = data.id;
        newItem.className = data.className;
        newItem.style.cssText = data.style;
        newItem.innerHTML = data.html;
        newItem.setAttribute('data-flashing-color', data.flashingColor || defaultColor);
        newItem.setAttribute('data-speed', data.speed || 400);
        if (data.settings.cursorX != undefined) newItem.setAttribute('data-cursorX', data.settings.cursorX);
        if (data.settings.cursorY != undefined) newItem.setAttribute('data-cursorY', data.settings.cursorY);
        if (data.settings.cloneX != undefined) newItem.setAttribute('data-cloneX', data.settings.cloneX);
        if (data.settings.cloneY != undefined) newItem.setAttribute('data-cloneY', data.settings.cloneY);
        newItem.setAttribute("draggable", "true");
        newItem.addEventListener('dragstart', drag);
        newItem.addEventListener('dragover', dragOver);
        newItem.addEventListener('drop', drop);
        dropArea.appendChild(newItem);
        if (data.view == 'front') {
            frontItems.push(newItem);
            newItem.style.display = (currView == 'front') ? 'block' : 'none';
        } else {
            backItems.push(newItem);
            newItem.style.display = (currView == 'back') ? 'block' : 'none';
        }
        if (!itemSelections[data.view]) itemSelections[data.view] = {};
        if (data.settings) {
            itemSelections[data.view][data.id] = data.settings;
            newItem.radioSelection = data.settings.radioSelection;
            newItem.speed = data.settings.sliderValue;
            newItem.userinput = data.settings.userInput;
            newItem.color = data.settings.itemColor;
            newItem.scale = data.settings.scale;
            newItem.amount = data.settings.amount;
            if (data.settings.rotation != undefined || data.settings.scale != undefined || data.settings.amount != undefined) {
                const rotation = data.settings.rotation || 0;
                const scale = data.settings.scale || 1;
                const amount = data.settings.amount || 1;
                newItem.rotation = rotation;
                newItem.setAttribute('data-size', scale);
                newItem.setAttribute('data-rotation', rotation);
                newItem.setAttribute('data-amount', amount);
                newItem.style.transform = `scale(${scale}) rotate(${rotation}deg) amount(${amount})`;
            }
            if (data.settings.radioSelection) {
                const radioPattern = data.settings.radioSelection.toLowerCase();
                if (radioPattern.includes('flash') || radioPattern.includes('trickle')) {
                    flashingItems.add(newItem);
                    if (radioPattern.includes('trickle up')) {
                        flashAnimation(newItem, 'trickle-up');
                    } else if (radioPattern.includes('trickle down')) {
                        flashAnimation(newItem, 'trickle-down');
                    } else if (radioPattern.includes('random')) {
                        flashAnimation(newItem, 'random-fl');
                    } else {
                        flashAnimation(newItem);
                    }
                } else if (radioPattern.includes('shake') || radioPattern.includes('stick') || radioPattern.includes('both') || radioPattern.includes('roll')) {
                    furAnimItems.add(newItem);
                    if (radioPattern.includes('both')) {
                        furAnimation(newItem, 'both');
                    } else if (radioPattern.includes('stick')) {
                        furAnimation(newItem, 'stick-up');
                    } else if (radioPattern.includes('shake')) {
                        furAnimation(newItem, 'shake');
                    } else {
                        furAnimation(newItem, 'roll');
                    }
                }
            }
        }
        newItem.addEventListener('click', () => selectItem(newItem));
    });
    frontItems.forEach(item => {
        item.style.display = (currView == 'front') ? 'block' : 'none';
    });
    backItems.forEach(item => {
        item.style.display = (currView == 'back') ? 'block' : 'none';
    });
    if (selectedId) {
        const itemToSelect = dropArea.querySelector(`#${selectedId}`);
        const isItemInCurrentView = (currView == 'front' && frontItems.includes(itemToSelect)) || (currView == 'back' && backItems.includes(itemToSelect));
        if (itemToSelect && isItemInCurrentView) {
            selectItem(itemToSelect);
            if (itemToSelect.radioSelection) {
                const radio = document.querySelector(`input[name="item-movement"][value="${itemToSelect.radioSelection}"]`);
                if (radio) radio.checked = true;
            }
            const slider = document.getElementById('speed-range');
            if (slider) {
                if (itemToSelect.id.startsWith('battery')) {
                    const bars = Array.from(itemToSelect.querySelectorAll('.battery-bar')).filter(bar => bar.style.opacity == '1').length;
                    slider.value = bars || 3;
                    document.getElementById('value').innerHTML = bars || 3;
                } else {
                    slider.value = itemToSelect.speed || 3;
                    document.getElementById('value').innerHTML = itemToSelect.speed || 3;
                }
            }
        } else {
            deselectedSidebar();
        }
    } else {
        deselectedSidebar();
    }
}

//delete selected item
function deleteItem() {
    const selectedItem = document.querySelector('.dropped-item.selected-item');
    if (selectedItem) {
        saveState(currView);
        if (currView == 'front') {
            for (let i = 0; i < frontItems.length; i++) {
                if (frontItems[i].id == selectedItem.id) {
                    frontItems[i].id = "DELETED"+frontItems[i].id;//frontItems.splice(i,1);
                }
            }
        } else if (currView == 'back') {
            for (let i = 0; i < backItems.length; i++) {
                if (backItems[i].id == selectedItem.id) {
                    backItems[i].id = "DELETED"+backItems[i].id;//backItems.splice(i,1);
                }
            }
        }
        selectedItem.remove();
        logAction('deleted_item', {itemID: selectedItem.id});
        deselectedSidebar();
    }
}

function continueToGUI() {
    document.querySelector(".popup").style.display = 'none';
    document.getElementById("participant").value = document.getElementById("participant1").value;
    document.getElementById("videoNum").value = document.getElementById("videoNum1").value;
    startTime = Date.now();
}

async function saveFile() {
    totalTime = (Date.now()-startTime)/1000;
    const completedDesign = document.getElementById('jacketbox');
    const canvas1 = await html2canvas(completedDesign);
    const blob1 = await new Promise(resolve => canvas1.toBlob(resolve));
    switchView();
    const canvas2 = await html2canvas(completedDesign);
    const blob2 = await new Promise(resolve => canvas2.toBlob(resolve));
    const participantNum = document.getElementById('participant').value;
    const videoNum = document.getElementById('videoNum').value;
    var csvFile = "Jacket Side,Item ID,Customization,Speed,User Input,Color,Rotation,Size,Amount,X Position,Y Position\n";
    for (let i = 0; i < frontItems.length; i++) { //items on jacket front
        csvFile += `front,${frontItems[i].id},${frontItems[i].radioSelection},${frontItems[i].speed},"${frontItems[i].userinput}","${frontItems[i].color}",${frontItems[i].rotation},${frontItems[i].scale},${frontItems[i].amount},${frontItems[i].x},${frontItems[i].y}\n`;
    }
    for (let i = 0; i < backItems.length; i++) { //items on jacket back
        csvFile += `back,${backItems[i].id},${backItems[i].radioSelection},${backItems[i].speed},"${backItems[i].userinput}","${backItems[i].color}",${backItems[i].rotation},${frontItems[i].scale},${backItems[i].amount},${backItems[i].x},${backItems[i].y}\n`;
    }
    //csvFile += `JACKET COLOR: ${document.getElementById('jacketcol').value}`;
    csvFile += `"JACKET COLOR: rgb(${currJacketCol.r},${currJacketCol.g},${currJacketCol.b})"`;
    csvFile += `\nTOTAL TIME: ${totalTime}`;
    let keystrokeFile = "Timestamp,Action,Info\n";
    for (const i of keystrokeLog) {
        const { timestamp, action, ...info } = i;
        keystrokeFile += `${timestamp},${action},"${JSON.stringify(info).replace(/"/g, '""')}"\n`;
    }
    let rows = keystrokeFile.trim().split('\n'); //removes last row of keystrokes csv due to switching view
    if (rows.length > 1) rows.pop();
    keystrokeFile = rows.join('\n') + '\n';
    const formData = new FormData();
    formData.append("participant_num", participantNum);
    formData.append("video_num", videoNum);
    const csvBlob = new Blob([csvFile], { type: "text/csv" });
    const csvFileForUpload = new File([csvBlob], `Participant_${participantNum}_Design_${videoNum}.csv`, { type: "text/csv" });
    formData.append("csv_file", csvFileForUpload);
    const keystrokeBlob = new Blob([keystrokeFile], { type: "text/csv" });
    const keystrokeFileForUpload = new File([keystrokeBlob], `KEYSTROKES_Participant_${participantNum}_Design_${videoNum}.csv`, { type: "text/csv" });
    formData.append("keystroke_file", keystrokeFileForUpload);
    formData.append("gui_image1", blob1);
    formData.append("gui_image2", blob2);
    const response = await fetch("http://localhost:3000/upload-csv", {//("http://xxx.xx.xxx.xx:3000/upload-csv", {
        method: "POST",
        body: formData
    });
    const result = await response.json();
    alert(result.message);
}
function submitPopup() {
    document.getElementById('save-button').disabled = true;
    document.getElementById('save-button').style.opacity = 0.5;
}