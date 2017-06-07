/**
 * This plugin will be used to transform Diva into a layering tool which will be used to provide
 * the ground truth data for the machine learning algorithm
 * that classifies and isolates the different components of old manuscripts and scores.
 *
 * {string} pluginName - Added to the class prototype. Defines the name for the plugin.
 *
 *
 **/
export default class PixelPlugin
{
    constructor (core)
    {
        this.core = core;
        this.activated = false;
        this.pageToolsIcon = this.createIcon();
        this.scrollEventHandle = null;
        this.zoomEventHandle = null;
        this.mouseHandles = null;
        this.keyboardHandles = null;
        this.layers = null;
        this.matrix = null;
        this.mousePressed = false;
        this.keyboardPress = false;
        this.lastX, this.lastY;
        this.selectedLayer = 0;
        this.keyboardChangingLayers = false;
        this.actions = [];
        this.undoneActions = [];
        this.shiftDown = false;
        this.currentTool = "brush";
        this.lastRelCoordsX = null;
        this.lastRelCoordsY = null;
        this._canvas = null;
        this._ctx = null;
    }

    /**
     * ===============================================
     *         Plugin Activation/Deactivation
     * ===============================================
     **/

    handleClick ()
    {
        if (!this.activated)
            this.activatePlugin();
        else
            this.deactivatePlugin();
    }

    tutorial()
    {
        let overlay = document.createElement('canvas');
        overlay.setAttribute("id", "tutorial canvas");
        overlay.setAttribute("style", "position: absolute; top: 0; left: 0;");
        overlay.width = window.innerWidth;
        overlay.height = window.innerHeight;
        let context = overlay.getContext('2d');
        context.fillStyle = "rgba(0,0,0,0.8)";
        context.fillRect(0, 0,overlay.width,overlay.height);

        let h1 = document.createElement('h1');
        h1.setAttribute("style", "position: absolute; top: 0; left: 0; color: #FFFFFF; font-family: sans-serif");
        let text = document.createTextNode("Hello World");

        h1.appendChild(text);

        document.body.appendChild(overlay);
        document.body.appendChild(h1);
    }

    activatePlugin ()
    {
        // this.tutorial();

        if (this.layers === null)
        {
            // Start by creating layers
            let layer1 = new Layer(0, new Colour(51, 102, 255, 0.8)),
                layer2 = new Layer(1, new Colour(255, 51, 102, 0.8)),
                layer3 = new Layer(2, new Colour(255, 255, 10, 0.8)),
                layer4 = new Layer(3, new Colour(10, 180, 50, 0.8)),
                layer5 = new Layer(4, new Colour(255, 137, 0, 0.8));
            
            layer1.addShapeToLayer(new Rectangle(new Point(23, 42, 0), 24, 24));
            layer2.addShapeToLayer(new Rectangle(new Point(48, 50, 0), 57, 5));
            layer3.addShapeToLayer(new Rectangle(new Point(50, 80, 0), 50, 10));

            this.layers = [layer1, layer2, layer3, layer4, layer5];
        }

        this.disableDragScrollable();
        this.initializeMatrix();
        this.createPluginElements(this.layers);
        this.scrollEventHandle = this.subscribeToScrollEvent();
        this.zoomEventHandle = this.subscribeToZoomLevelWillChangeEvent();
        this.subscribeToMouseEvents();
        this.subscribeToKeyboardEvents();
        this.repaint();  // Repaint the tiles to retrigger VisibleTilesDidLoad
        this.activated = true;
    }

    deactivatePlugin ()
    {
        Diva.Events.unsubscribe(this.scrollEventHandle);
        Diva.Events.unsubscribe(this.zoomEventHandle);
        this.unsubscribeFromMouseEvents();
        this.unsubscribeFromKeyboardEvents();
        this.unsubscribeFromKeyboardPress();
        this.repaint(); // Repaint the tiles to make the highlights disappear off the page
        this.destroyPluginElements(this.layers);
        this._ctx.clearRect(0,0,this._canvas.width, this._canvas.height);
        this.enableDragScrollable();
        this.activated = false;
    }

    disableDragScrollable ()
    {
        console.log("Disabling from Pixel");
        if (!this.core.viewerState.viewportObject.hasAttribute('nochilddrag'))
            this.core.viewerState.viewportObject.setAttribute('nochilddrag', "");
    }

    enableDragScrollable ()
    {
        console.log("Enabling from Pixel");
        if (this.core.viewerState.viewportObject.hasAttribute('nochilddrag'))
            this.core.viewerState.viewportObject.removeAttribute('nochilddrag');
    }

    /**
     * ===============================================
     *        Event Subscription/Unsubscription
     * ===============================================
     **/

    subscribeToZoomLevelWillChangeEvent ()
    {
        let handle = Diva.Events.subscribe('ZoomLevelWillChange', (zoomLevel) =>
        {
            this.drawHighlights(zoomLevel);
        });
        return handle;
    }

    subscribeToScrollEvent()
    {
        this.drawHighlights(this.core.getSettings().zoomLevel);

        let handle = Diva.Events.subscribe('ViewerDidScroll', () =>
        {
            this.drawHighlights(this.core.getSettings().zoomLevel);
        });

        return handle;
    }

    subscribeToMouseEvents ()
    {
        let canvas = document.getElementById("diva-1-outer");

        this.mouseDown = (evt) => { this.onMouseDown(evt); };
        this.mouseUp = (evt) => { this.onMouseUp(evt); };
        this.mouseMove = (evt) => { this.onMouseMove(evt); };

        canvas.addEventListener('mousedown', this.mouseDown);
        canvas.addEventListener('mouseup', this.mouseUp);
        canvas.addEventListener('mouseleave', this.mouseUp);
        canvas.addEventListener('mousemove', this.mouseMove);

        this.mouseHandles = {
            mouseDownHandle: this.mouseDown,
            mouseMoveHandle: this.mouseMove,
            mouseUpHandle: this.mouseUp
        };
    }

    subscribeToKeyboardEvents ()
    {
        this.handleKeyUp = (e) =>
        {
            const KEY_1 = 49;
            const KEY_9 = 56;
            const SHIFT_KEY = 16;

            let lastLayer = this.selectedLayer,
                numberOfLayers = this.layers.length,
                key = e.keyCode ? e.keyCode : e.which;

            if (key >= KEY_1 && key < KEY_1 + numberOfLayers && key <= KEY_9)
            {
                this.layers.forEach ((layer) =>
                {
                    let lastSelectedLayer = this.selectedLayer;

                    this.layers.forEach ((layer) =>
                    {
                        // Not triple equality because layer.LayerType and layerDiv value are of different types
                        if (layer.layerType == key - KEY_1)
                        {
                            let div = document.getElementById("Layer " + layer.layerType + " Selector");

                            if (!div.hasAttribute("selected-layer"))
                                div.classList.add("selected-layer");
                            this.selectedLayer = this.layers.indexOf(layer);
                        }
                        else if (layer.layerType == lastSelectedLayer)
                        {
                            let div = document.getElementById("Layer " + layer.layerType + " Selector");
                            div.classList.remove("selected-layer");
                        }
                    });
                });

                if (lastLayer !== this.selectedLayer && this.mousePressed)
                    this.keyboardChangingLayers = true;
            }
            if (key === SHIFT_KEY)
                this.shiftDown = false;
        };

        this.handleKeyDown = (e) =>
        {
            if (e.code === "KeyZ" && e.shiftKey === false)
            {
                this.undoAction();
            }
            else if (e.code === "KeyZ" && e.shiftKey === true)
            {
                this.redoAction();
            }
            else if (e.key === "Shift")
            {
                this.shiftDown = true;
            }
            else if (e.key === "b")
            {
                this.disableDragScrollable();
                this.currentTool = "brush";
                document.getElementById(this.currentTool).checked = true;
            }
            else if (e.key === "r")
            {
                this.disableDragScrollable();
                this.currentTool = "rectangle";
                document.getElementById(this.currentTool).checked = true;
            }
            else if (e.key === "g")
            {
                this.enableDragScrollable();
                this.currentTool = "grab";
                document.getElementById(this.currentTool).checked = true;
            }
        };

        document.addEventListener("keyup", this.handleKeyUp);
        document.addEventListener("keydown", this.handleKeyDown);

        this.keyboardHandles = {
            keyup: this.handleKeyUp,
            keydown: this.handleKeyDown
        };
    }

    unsubscribeFromMouseEvents ()
    {
        var canvas = document.getElementById("diva-1-outer");

        canvas.removeEventListener('mousedown', this.mouseHandles.mouseDownHandle);
        canvas.removeEventListener('mouseup', this.mouseHandles.mouseUpHandle);
        canvas.removeEventListener('mouseleave', this.mouseHandles.mouseUpHandle);
        canvas.removeEventListener('mousemove', this.mouseHandles.mouseMoveHandle);
    }

    unsubscribeFromKeyboardEvents ()
    {
        document.removeEventListener("keyup", this.keyboardHandles.keyup);
        document.removeEventListener("keydown", this.keyboardHandles.keydown);
    }

    unsubscribeFromKeyboardPress ()
    {
        document.removeEventListener("keydown", this.keyboardHandles);
    }

    /**
     * ===============================================
     *                HTML UI Elements
     * ===============================================
     **/

    createPluginElements (layers)
    {
        this.createPixelCanvas();
        this.createUndoButton();
        this.createRedoButton();
        this.createLayerSelectors(layers);
        this.createBrushSizeSelector();
        this.createToolsView(["brush", "rectangle", "grab"]);
        this.createExportButton();
    }

    destroyPluginElements ()
    {
        this.destroyLayerSelectors();
        this.destroyBrushSizeSelector();
        this.destroyUndoButton();
        this.destroyRedoButton();
        this.destroyExportButton();
        this.destroyPixelCanvas();
        this.destroyToolsView(["brush", "rectangle", "grab"]);
    }

    // Tools are strings or enums masalan
    createToolsView(tools)
    {
        let form = document.createElement("form");
        form.setAttribute("id", "tool selector");

        for (var index = 0; index < tools.length; index++)
        {
            let tool = tools[index],
                radio = document.createElement("input"),
                content = document.createTextNode(tool),
                br = document.createElement("br");

            radio.setAttribute("id", tool);
            radio.setAttribute("type", "radio");
            radio.setAttribute("value", tool);
            radio.setAttribute("name", "tool selector");
            radio.onclick = () =>
            {
                this.currentTool = radio.value;

                if (radio.value === "grab")
                    this.enableDragScrollable();

                else
                    this.disableDragScrollable();
            };

            if (tool === "brush")      // Layer at position 0 is checked by default
                radio.checked = true;


            form.appendChild(radio);
            form.appendChild(content);
            form.appendChild(br);
        }
        document.body.appendChild(form);
    }

    destroyToolsView()
    {
        let form = document.getElementById("tool selector");
        document.body.removeChild(form);
    }

    createPixelCanvas()
    {
        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute("id", "pixelCanvas");
        this._canvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
        this._canvas.width = this.core.getSettings().renderer._canvas.width;
        this._canvas.height = this.core.getSettings().renderer._canvas.height;
        this._ctx = this._canvas.getContext('2d');
        let div = document.getElementById('diva-1-outer');
        div.insertBefore(this._canvas, div.firstChild.nextSibling);
    }

    destroyPixelCanvas()
    {
        let div = document.getElementById('diva-1-outer');
        div.removeChild(this._canvas);
    }


    createIcon ()
    {
        const pageToolsIcon = document.createElement('div');
        pageToolsIcon.classList.add('diva-pixel-icon');

        let root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        root.setAttribute("x", "0px");
        root.setAttribute("y", "0px");
        root.setAttribute("viewBox", "0 0 25 25");
        root.id = `${this.core.settings.selector}pixel-icon`;

        let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.id = `${this.core.settings.selector}pixel-icon-glyph`;
        g.setAttribute("transform", "matrix(1, 0, 0, 1, -11.5, -11.5)");
        g.setAttribute("class", "diva-pagetool-icon");

        //Placeholder icon
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', '15');
        rect.setAttribute('y', '10');
        rect.setAttribute('width', '25');
        rect.setAttribute('height', 25);

        g.appendChild(rect);
        root.appendChild(g);

        pageToolsIcon.appendChild(root);

        return pageToolsIcon;
    }

    createOpacitySlider (layer, parentElement, referenceNode)
    {
        var opacitySlider = document.createElement("input");

        opacitySlider.setAttribute("id", "layer " + layer.layerType + " opacity");
        opacitySlider.setAttribute("type", "range");
        opacitySlider.setAttribute('max', 100);
        opacitySlider.setAttribute('min', 0);
        opacitySlider.setAttribute('value', layer.getOpacity()*100);
        opacitySlider.addEventListener("input", () =>
        {
            layer.setOpacity(opacitySlider.value/100);
            this.repaint();
        });

        parentElement.insertBefore(opacitySlider, referenceNode.nextSibling);
    }

    destroyOpacitySlider (layer)
    {
        let opacitySlider = document.getElementById("layer " + layer.layerType + " opacity");
        console.log(opacitySlider);
        opacitySlider.parentElement.removeChild(opacitySlider);
    }

    createLayerSelectors (layers)
    {
        let RETURN_KEY = 13;

        let form = document.createElement("form");
        form.setAttribute("id", "layer selector");

        for (var index = layers.length - 1; index >= 0; index--)
        {
            let layer = layers[index],
                layerDiv = document.createElement("div"),
                layerName = document.createElement("input"),
                layerToolsDiv = document.createElement("div"),
                colourDiv = document.createElement("div");

            layerDiv.setAttribute("class", "layerDiv");
            layerDiv.setAttribute("id", "Layer " + layer.layerType + " Selector");
            layerDiv.setAttribute("value", layer.layerType);
            layerName.setAttribute("type", "text");
            layerName.setAttribute("value", "Layer " + (layer.layerType + 1));
            colourDiv.setAttribute("class", "color-box");
            colourDiv.setAttribute("style", "background-color: " + layer.colour.toHexString() + ";");
            layerToolsDiv.setAttribute("class", "unchecked-layer-settings");
            layerToolsDiv.setAttribute("id", "Layer " + layer.layerType + " Tools");

            if (layer.layerType === this.layers[0].layerType)      // Layer at position 0 is checked by default
                layerDiv.classList.add("selected-layer");

            // Change Colour
            colourDiv.addEventListener("click", () => {console.log("colour clicked")});

            // Only edit layer name on double click
            layerName.setAttribute("readonly", "true");
            layerName.addEventListener('keypress', function (e) {
                var key = e.which || e.keyCode;
                if (key === RETURN_KEY) {
                    // Save new layer name
                    layerName.setAttribute("readonly", "true");
                }
            });
            layerName.setAttribute("ondblclick", "this.readOnly='';");

            // Select Layer on click
            layerDiv.onclick = () => {
                // Remove selection from previous layer
                let lastSelectedLayer = this.selectedLayer;

                this.layers.forEach ((layer) =>
                {
                    // Not triple equality because layer.LayerType and layerDiv value are of different types
                    if (layer.layerType == layerDiv.getAttribute('value'))
                    {
                        if (!layerToolsDiv.classList.contains("selected-layer"))
                            layerDiv.classList.add("selected-layer");
                        this.selectedLayer = this.layers.indexOf(layer);
                    }
                    else if (layer.layerType == lastSelectedLayer)
                    {
                        let div = document.getElementById("Layer " + layer.layerType + " Selector");
                        div.classList.remove("selected-layer");
                    }
                });
            };

            // Open toolbox on click
            layerToolsDiv.onclick = () =>
            {
                if (layerToolsDiv.classList.contains("unchecked-layer-settings")) //It is unchecked, check it
                {
                    layerToolsDiv.classList.remove("unchecked-layer-settings");
                    layerToolsDiv.classList.add("checked-layer-settings");
                    this.createOpacitySlider(layer, layerToolsDiv.parentElement.parentElement, layerToolsDiv.parentElement);
                }
                else
                {
                    layerToolsDiv.classList.remove("checked-layer-settings");
                    layerToolsDiv.classList.add("unchecked-layer-settings");
                    this.destroyOpacitySlider(layer);
                }
            };


            layerDiv.appendChild(layerName);
            layerDiv.appendChild(layerToolsDiv);
            layerDiv.appendChild(colourDiv);
            form.appendChild(layerDiv);
        }
        document.body.appendChild(form);
    }

    destroyLayerSelectors ()
    {
        let form = document.getElementById("layer selector");
        document.body.removeChild(form);
    }

    createBrushSizeSelector ()
    {
        let brushSizeSelector = document.createElement("input");
        brushSizeSelector.setAttribute("id", "brush size selector");
        brushSizeSelector.setAttribute("type", "range");
        brushSizeSelector.setAttribute('max', 50);
        brushSizeSelector.setAttribute('min', 1);
        brushSizeSelector.setAttribute('value', 10);
        document.body.appendChild(brushSizeSelector);
    }

    destroyBrushSizeSelector ()
    {
        let brushSizeSelector = document.getElementById("brush size selector");
        document.body.removeChild(brushSizeSelector);
    }

    createUndoButton ()
    {
        let undoButton = document.createElement("button"),
            text = document.createTextNode("Undo");

        this.undo = () => { this.undoAction(); };

        undoButton.setAttribute("id", "undo button");
        undoButton.appendChild(text);
        undoButton.addEventListener("click", this.undo);

        document.body.appendChild(undoButton);
    }

    destroyUndoButton ()
    {
        let undoButton = document.getElementById("undo button");
        document.body.removeChild(undoButton);
    }

    createRedoButton ()
    {
        let redoButton = document.createElement("button"),
            text = document.createTextNode("Redo"),
            br = document.createElement("br");

        this.redo = () => { this.redoAction(); };

        br.setAttribute("id", "redo button break");
        redoButton.setAttribute("id", "redo button");
        redoButton.appendChild(text);
        redoButton.addEventListener("click", this.redo);

        document.body.appendChild(redoButton);
        document.body.appendChild(br);
    }

    destroyRedoButton ()
    {
        let redoButton = document.getElementById("redo button");
        document.body.removeChild(redoButton);

        let br = document.getElementById("redo button break");
        document.body.removeChild(br);
    }

    createExportButton ()
    {
        let exportButton = document.createElement("button");
        let text = document.createTextNode("Export as Matrix");

        this.export = () => { this.populateMatrix(); };

        exportButton.setAttribute("id", "export button");
        exportButton.appendChild(text);
        exportButton.addEventListener("click", this.export);

        document.body.appendChild(exportButton);
    }

    destroyExportButton ()
    {
        let exportButton = document.getElementById("export button");
        document.body.removeChild(exportButton);
    }

    /**
     * ===============================================
     *                   Drawing
     * ===============================================
     **/

    onMouseDown (evt)
    {
        let canvas = document.getElementById("diva-1-outer");
        switch (this.currentTool)
        {
            case "brush":
                this.mousePressed = true;
                this.initializeNewPath(canvas, evt);
                break;
            case "rectangle":
                this.mousePressed = true;
                this.initializeRectanglePreview(canvas, evt);
                break;
            case "grab":
                this.mousePressed = true;
                break;
            default:
                this.mousePressed = true;
        }

        // FIXME: At deactivation mouse is down so it clears the actions to redo
        this.undoneActions = [];
    }

    onMouseMove (evt)
    {
        let canvas = document.getElementById("diva-1-outer");
        switch (this.currentTool)
        {
            case "brush":
                this.setupPointPainting(canvas, evt);
                break;
            case "rectangle":
                this.rectanglePreview(canvas,evt);
                break;
            default:
        }
    }

    onMouseUp (evt)
    {
        let canvas = document.getElementById("diva-1-outer");
        switch (this.currentTool)
        {
            case "brush":
                this.mousePressed = false;
                this.repaint();
                break;
            case "rectangle":
                this.mousePressed = false;
                break;
            default:
                this.mousePressed = false;
        }
    }

    initializeNewPath (canvas, evt)
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let selectedLayer = this.layers[this.selectedLayer],
                point = new Point(relativeCoords.x, relativeCoords.y, pageIndex),
                brushSize = document.getElementById("brush size selector").value/10;

            this.lastRelCoordsX = relativeCoords.x;
            this.lastRelCoordsY = relativeCoords.y;

            selectedLayer.createNewPath(brushSize);
            selectedLayer.addToCurrentPath(point);

            this.actions.push(new Action(selectedLayer.getCurrentPath(), selectedLayer));
            this.drawPath(selectedLayer, point, pageIndex, zoomLevel, brushSize, false);
        }
        else
        {
            this.mousePressed = false;
        }
    }

    setupPointPainting (canvas, evt)
    {
        var point,
            horizontalMove = false,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

        if (Math.abs(relativeCoords.x - this.lastRelCoordsX) >= Math.abs(relativeCoords.y - this.lastRelCoordsY))
            horizontalMove = true;

        if (!this.mousePressed)
            return;

        if (!this.isInPageBounds(relativeCoords.x, relativeCoords.y))
            return;

        if (!this.keyboardChangingLayers)
        {
            let pageIndex = this.core.getSettings().currentPageIndex;
            let zoomLevel = this.core.getSettings().zoomLevel;

            if (this.mousePressed && this.shiftDown)
            {
                if (!horizontalMove)
                    point = new Point(this.lastRelCoordsX, relativeCoords.y, pageIndex);

                else
                    point = new Point(relativeCoords.x, this.lastRelCoordsY, pageIndex);
            }
            else
            {
                point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
            }
            let brushSize = this.layers[this.selectedLayer].getCurrentPath().brushSize;
            this.layers[this.selectedLayer].addToCurrentPath(point);
            this.drawPath(this.layers[this.selectedLayer], point, pageIndex, zoomLevel, brushSize, true);
            return;
        }
        this.initializeNewPath(canvas, evt);
        this.keyboardChangingLayers = false;
    }

    initializeRectanglePreview (canvas, evt)
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let selectedLayer = this.layers[this.selectedLayer];
            selectedLayer.addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0));
            this.actions.push(new Action(selectedLayer.getCurrentShape(), selectedLayer));

            this.repaint();
        }
    }

    rectanglePreview (canvas, evt)
    {
        if (this.mousePressed)
        {
            let mousePos = this.getMousePos(canvas, evt),
                relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y),
                lastShape = this.layers[this.selectedLayer].getCurrentShape();

            if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
            {
                // If cursor is to the south east or north west of the point of origin
                if ((relativeCoords.x < lastShape.origin.relativeOriginX && relativeCoords.y < lastShape.origin.relativeOriginY)
                || (relativeCoords.x > lastShape.origin.relativeOriginX && relativeCoords.y > lastShape.origin.relativeOriginY))
                {
                    let lastWidth = lastShape.relativeRectWidth;
                    lastShape.relativeRectWidth = relativeCoords.x - lastShape.origin.relativeOriginX;

                    if (this.shiftDown)
                    {
                        let squareInBounds = this.isInPageBounds(lastShape.origin.relativeOriginX + lastShape.relativeRectWidth,
                            lastShape.origin.relativeOriginY + lastShape.relativeRectWidth);

                        if (squareInBounds)
                        {
                            lastShape.relativeRectHeight = lastShape.relativeRectWidth;
                        }
                        else
                        {
                            lastShape.relativeRectWidth = lastWidth;
                        }
                    }
                    else
                    {
                        lastShape.relativeRectHeight = relativeCoords.y - lastShape.origin.relativeOriginY;
                    }
                }
                else        // If cursor to the north east or south west of the point of origin
                {
                    let lastWidth = lastShape.relativeRectWidth;
                    lastShape.relativeRectWidth = relativeCoords.x - lastShape.origin.relativeOriginX;

                    if (this.shiftDown)
                    {
                        let squareInBounds = this.isInPageBounds(lastShape.origin.relativeOriginX + lastShape.relativeRectWidth,
                            lastShape.origin.relativeOriginY - lastShape.relativeRectWidth);

                        if (squareInBounds)
                        {
                            lastShape.relativeRectHeight = - lastShape.relativeRectWidth;
                        }
                        else
                        {
                            lastShape.relativeRectWidth = lastWidth;
                        }
                    }
                    else
                    {
                        lastShape.relativeRectHeight = relativeCoords.y - lastShape.origin.relativeOriginY;
                    }
                }


                this.repaint();
            }
        }
    }

    redoAction ()
    {
        if (this.undoneActions.length > 0)
        {
            let actionToRedo = this.undoneActions[this.undoneActions.length - 1];

            if (actionToRedo.action.type === "path")
            {
                actionToRedo.layer.addPathToLayer(actionToRedo.action);
                this.actions.push(actionToRedo);
                this.undoneActions.splice(this.undoneActions.length - 1,1);
            }

            else if (actionToRedo.action.type === "shape")
            {
                actionToRedo.layer.addShapeToLayer(actionToRedo.action);
                this.actions.push(actionToRedo);
                this.undoneActions.splice(this.undoneActions.length - 1,1);
            }
            this.repaint();
        }
    }


    undoAction ()
    {
        if (this.actions.length > 0)
        {
            let actionToRemove = this.actions[this.actions.length - 1];
            this.undoneActions.push(actionToRemove);
            this.removeAction(this.actions.length - 1);
        }
    }

    removeAction (index)
    {
        if (this.actions.length > 0 && this.actions.length >= index)
        {
            let actionToRemove = this.actions[index];
            if (actionToRemove.action.type === "path")
            {
                actionToRemove.layer.removePathFromLayer(actionToRemove.action);
                this.actions.splice(index, 1);
            }
            else if (actionToRemove.action.type === "shape")
            {
                actionToRemove.layer.removeShapeFromLayer(actionToRemove.action);
                this.actions.splice(index, 1);
            }
            this.repaint();
        }
    }

    repaint ()
    {
        this.drawHighlights(this.core.getSettings().zoomLevel);
    }

    isInPageBounds (relativeX, relativeY)
    {
        let pageDimensions = this.core.publicInstance.getCurrentPageDimensionsAtCurrentZoomLevel(),
            absolutePageOrigin = this.getAbsoluteCoordinates(0,0),
            absolutePageWidthOffset = pageDimensions.width + absolutePageOrigin.x,  //Taking into account the padding, etc...
            absolutePageHeightOffset = pageDimensions.height + absolutePageOrigin.y,
            relativeBounds = this.getRelativeCoordinates(absolutePageWidthOffset, absolutePageHeightOffset);

        if (relativeX < 0 || relativeY < 0 || relativeX > relativeBounds.x || relativeY > relativeBounds.y)
        {
            return false;
        }
        return true;
    }

    getMousePos (canvas, evt)
    {
        let rect = canvas.getBoundingClientRect();

        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    getRelativeCoordinates (highlightXOffset, highlightYOffset)
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel,
            renderer = this.core.getSettings().renderer,
            scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteRectOriginX = highlightXOffset - renderer._getImageOffset(pageIndex).left + renderer._viewport.left -  viewportPaddingX,
            absoluteRectOriginY = highlightYOffset - renderer._getImageOffset(pageIndex).top + renderer._viewport.top - viewportPaddingY;

        return{
            x: absoluteRectOriginX/scaleRatio,
            y: absoluteRectOriginY/scaleRatio
        };
    }

    getAbsoluteCoordinates (relativeX, relativeY)
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel,
            renderer = this.core.getSettings().renderer,
            scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        let absoluteX = relativeX * scaleRatio,
            absoluteY = relativeY * scaleRatio;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteOffsetX = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteX,
            absoluteOffsetY = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteY;

        return{
            x: absoluteOffsetX,
            y: absoluteOffsetY
        };
    }

    drawPath (layer, point, pageIndex, zoomLevel, brushSize, isDown)
    {
        let renderer = this.core.getSettings().renderer,
            scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = point.relativeOriginX * scaleRatio,
            absoluteRectOriginY = point.relativeOriginY * scaleRatio;

        // This indicates the page on top of which the highlights are supposed to be drawn
        let highlightPageIndex = point.pageIndex;

        if (pageIndex === highlightPageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX,
                highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

            if (isDown)
            {
                this._ctx.beginPath();
                this._ctx.strokeStyle = layer.colour.toString();
                this._ctx.lineWidth = brushSize * scaleRatio;
                this._ctx.lineJoin = "round";
                this._ctx.moveTo(this.lastX, this.lastY);
                this._ctx.lineTo(highlightXOffset, highlightYOffset);
                this._ctx.closePath();
                this._ctx.stroke();
            }

            this.lastX = highlightXOffset;
            this.lastY = highlightYOffset;
        }
    }

    fillPath(layer, point1, point2, zoomLevel, pageIndex, brushSize)
    {
        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);
        let lineWidth = brushSize;
        let absoluteLineWidth = lineWidth * scaleRatio;

        // This indicates the page on top of which the highlights are supposed to be drawn
        let highlightPageIndex = point1.pageIndex;

        if (pageIndex === highlightPageIndex)
        {
            //new Line(point1, point2, brushSize, "round").draw(this.layers[4],pageIndex,zoomLevel,this.core.getSettings().renderer);

            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let point1highlightOffset = point1.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
            var point2highlightOffset = point2.getAbsolutePaddedCoordinates(zoomLevel,pageIndex,renderer);

            new Circle(point1, lineWidth/2).getPixels(layer, pageIndex, zoomLevel, renderer, this.matrix);
            new Circle(point2, lineWidth/2).getPixels(layer, pageIndex, zoomLevel, renderer, this.matrix);

            let ang = new Line(point1, point2).getAngleRad(zoomLevel,pageIndex,renderer);

            // find the first point on the circumference that is orthogonal
            // to the line intersecting the two circle origos

            // These are values with padding
            var start1 = {
                absolutePaddedX: point1highlightOffset.x + Math.cos(ang + Math.PI / 2) * absoluteLineWidth/2,
                absolutePaddedY: point1highlightOffset.y + Math.sin(ang + Math.PI/2)* absoluteLineWidth/2
            };
            var end1 = {
                absolutePaddedX: point2highlightOffset.x + Math.cos(ang + Math.PI / 2) * absoluteLineWidth/2,
                absolutePaddedY: point2highlightOffset.y + Math.sin(ang + Math.PI/2)* absoluteLineWidth/2
            };

            // find the second point on the circumference that is orthogonal
            // to the line intersecting the two circle origos
            var start2 = {
                absolutePaddedX: point1highlightOffset.x + Math.cos(ang - Math.PI / 2) * absoluteLineWidth/2,
                absolutePaddedY: point1highlightOffset.y + Math.sin(ang - Math.PI/2)* absoluteLineWidth/2
            };
            var end2 = {
                absolutePaddedX: point2highlightOffset.x + Math.cos(ang - Math.PI / 2) * absoluteLineWidth/2,
                absolutePaddedY: point2highlightOffset.y + Math.sin(ang - Math.PI/2)* absoluteLineWidth/2
            };

            // 1. get ymax and ymin
            let ymax = Math.round(Math.max(start1.absolutePaddedY, start2.absolutePaddedY, end1.absolutePaddedY, end2.absolutePaddedY));
            let ymin = Math.round(Math.min(start1.absolutePaddedY, start2.absolutePaddedY, end1.absolutePaddedY, end2.absolutePaddedY));
            let pairOfEdges = [[start1,end1], [start2, end2], [start1, start2], [end1, end2]];

            // Logic for scanning lines
            new Shape().getPixels(layer, pageIndex, zoomLevel, renderer, ymax, ymin, pairOfEdges, this.matrix);
        }
    }

    drawHighlights (zoomLevel)
    {
        this._ctx.clearRect(0,0,this._canvas.width, this._canvas.height);
        let renderer = this.core.getSettings().renderer;

        renderer._renderedPages.forEach((pageIndex) =>
        {
            this.layers.forEach((layer) =>
            {
                let shapes = layer.shapes;

                shapes.forEach((shape) =>
                    {
                        shape.draw(layer, pageIndex, zoomLevel, this.core.getSettings().renderer, this._ctx);
                    }
                );

                let paths = layer.paths;
                paths.forEach((path) =>
                    {
                        let isDown = false;

                        path.points.forEach((point) =>
                        {
                            this.drawPath(layer, point, pageIndex, zoomLevel, path.brushSize, isDown);
                            isDown = true;
                        });
                    }
                );
            });
        });
    }

    printMatrix ()
    {
        // Need to implement a buffering page
        // let renderer = this.core.getSettings().renderer;
        let rowlen = this.matrix[0].length;


        for (var row = 0; row < this.matrix.length; row++)
        {
            for (var col = 0; col < rowlen; col++)
            {
                if (this.matrix[row][col] !== -1)
                {
                    this.layers.forEach((layer) =>
                    {
                        if (layer.layerType === this.matrix[row][col])
                        {
                            this._ctx.fillStyle = layer.colour.toString();
                            this._ctx.beginPath();
                            this._ctx.arc(col, row, 0.2,0,2*Math.PI);
                            this._ctx.fill();
                        }
                    });
                }
            }
        }
    }

    /**
     * ===============================================
     *                    Backend
     * ===============================================
     **/

    /**
     * Initializes the base matrix that maps the real-size picture.
     * It wil
     **/
    initializeMatrix ()
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            maxZoomLevel = this.core.getSettings().maxZoomLevel;
        let height = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).height,
            width = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).width;
        this.matrix = new Array(height).fill(null).map(() => new Array(width).fill(-1));
    }

    populateMatrix ()
    {
        console.log("populating");

        this.initializeMatrix();

        let pageIndex = this.core.getSettings().currentPageIndex,
            maxZoomLevel = this.core.getSettings().maxZoomLevel;

        this.layers.forEach((layer) =>
        {
            let shapes = layer.shapes;

            shapes.forEach((shape) =>
                {
                    shape.getPixels(layer, pageIndex, maxZoomLevel, this.core.getSettings().renderer, this.matrix);
                }
            );

            let paths = layer.paths;
            paths.forEach((path) =>
                {
                    for (let index = 0; index < path.points.length - 1; index++)
                    {
                        let point = path.points[index];
                        let nextPoint = path.points[index + 1];
                        this.fillPath(layer, point, nextPoint, maxZoomLevel, pageIndex, path.brushSize);
                    }
                }
            );
        });
        this.printMatrix();
        console.log("Done");
    }
}

export class Shape
{
    constructor (point)
    {
        this.origin = point;
        this.type = "shape";
    }

    /**
     * Abstract method, to be implemented by extending function
     */
    draw ()
    {

    }

    /**
     * copies the polygon to a matrix that represents a page
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     * @param ymax
     * @param ymin
     * @param pairOfEdges
     * @param matrix
     */
    getPixels(layer, pageIndex, zoomLevel, renderer, ymax, ymin, pairOfEdges, matrix)
    {
        // TODO: Check for horizontal or vertical lines
        // For every scan line
        for(var y = ymin; y < ymax; y++)
        {
            let intersectionPoints = [];

            // For every line
            for (var e = 0; e < pairOfEdges.length; e++)
            {
                // Calculate intersection with line
                for(var p = 0; p < pairOfEdges[e].length - 1; p++)
                {
                    let x1 = pairOfEdges[e][p].absolutePaddedX;
                    let y1 = pairOfEdges[e][p].absolutePaddedY;
                    let x2 = pairOfEdges[e][p + 1].absolutePaddedX;
                    let y2 = pairOfEdges[e][p + 1].absolutePaddedY;

                    let deltax = x2 - x1;
                    let deltay = y2 - y1;

                    let x = x1 + deltax / deltay * (y - y1);
                    let roundedX = Math.round(x);

                    if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y))
                    {
                        intersectionPoints.push({
                            absolutePaddedX: roundedX,
                            absolutePaddedY: y
                        });
                    }
                }
            }

            intersectionPoints.sort((a, b) => {
                return a.absolutePaddedX - b.absolutePaddedX;
            });

            // Start filling
            if (intersectionPoints.length > 0)
            {
                for (var index = 0; index < intersectionPoints.length - 1; index++)
                {
                    if (index%2 === 0)
                    {
                        let start = intersectionPoints[index].absolutePaddedX; // This will contain the start of the x coords to fill
                        let end = intersectionPoints[index + 1].absolutePaddedX;    // This will contain the end of the x coords to fill

                        let y = intersectionPoints[index].absolutePaddedY;

                        for (var fill = start; fill < end; fill++)
                        {
                            // Remove padding to get absolute coordinates
                            let absoluteCoords = new Point().getAbsoluteCoordinatesFromPadded(pageIndex,renderer,fill,y);

                            if (absoluteCoords.y >= 0 && absoluteCoords.x >= 0
                                && absoluteCoords.y <= matrix.length && absoluteCoords.x <= matrix[0].length)
                            {
                                matrix[absoluteCoords.y][absoluteCoords.x] = layer.layerType;
                            }
                        }
                    }
                }
            }
        }
    }
}


export class Circle extends Shape
{
    constructor (point, relativeRadius) {
        super(point);
        this.relativeRadius = relativeRadius;
    }

    /**
     * Draws the circle on a canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     */
    draw (layer, pageIndex, zoomLevel, renderer, ctx)
    {
        let scaleRatio = Math.pow(2,zoomLevel);

        if (pageIndex === this.origin.pageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let absoluteCenterWithPadding = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

            //Draw the circle
            ctx.fillStyle = layer.colour.toString();
            ctx.beginPath();
            ctx.arc(absoluteCenterWithPadding.x,absoluteCenterWithPadding.y, this.relativeRadius * scaleRatio,0,2*Math.PI);
            ctx.fill();
        }
    }

    /**
     * Copies the circle to a matrix that represents a page
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     * @param matrix
     */
    getPixels (layer, pageIndex, zoomLevel, renderer, matrix)
    {
        let circleTop = new Point(this.origin.relativeOriginX, this.origin.relativeOriginY - this.relativeRadius, 0);
        let circleBottom = new Point(this.origin.relativeOriginX, this.origin.relativeOriginY + this.relativeRadius, 0);
        let circleLeft = new Point(this.origin.relativeOriginX - this.relativeRadius, this.origin.relativeOriginY, 0);
        let circleRight = new Point(this.origin.relativeOriginX + this.relativeRadius, this.origin.relativeOriginY, 0);

        let scaleRatio = Math.pow(2, zoomLevel);

        for(var y = circleTop.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).y;
            y <= circleBottom.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).y; y++)
        {
            for(var  x = circleLeft.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).x;
                x <= circleRight.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer).x; x++){

                let point1highlightOffset = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);


                let shiftedX = x - point1highlightOffset.x;
                let shiftedY = y - point1highlightOffset.y;

                if(shiftedX*shiftedX + shiftedY*shiftedY <= (this.relativeRadius)*scaleRatio*(this.relativeRadius)*scaleRatio)
                {
                    // Get absolute from padded
                    let absoluteCoords = new Point().getAbsoluteCoordinatesFromPadded(pageIndex,renderer,x,y);
                    if (absoluteCoords.y >= 0 && absoluteCoords.x >= 0
                        && absoluteCoords.y <= matrix.length && absoluteCoords.x <= matrix[0].length)
                    {
                        matrix[absoluteCoords.y][absoluteCoords.x] = layer.layerType;
                    }
                }
            }
        }
    }
}


export class Rectangle extends Shape
{
    constructor (point, relativeRectWidth, relativeRectHeight) {
        super(point);
        this.relativeRectWidth = relativeRectWidth;
        this.relativeRectHeight = relativeRectHeight;
    }

    /**
     * draws a rectangle on a canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     */
    draw (layer, pageIndex, zoomLevel, renderer, ctx)
    {
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        if (pageIndex === this.origin.pageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX,
                highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

            //Draw the rectangle
            ctx.fillStyle = layer.colour.toString();
            ctx.fillRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
        }
    }

    /**
     * copies the rectangle to a matrix that represents a page
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     * @param matrix
     */
    getPixels (layer, pageIndex, zoomLevel, renderer, matrix)
    {
        let scaleRatio = Math.pow(2,zoomLevel);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio;
        let absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio;
        let absoluteRectWidth = this.relativeRectWidth * scaleRatio;
        let absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        if (pageIndex === this.origin.pageIndex)
        {
            // Want abs coord of start and finish
            for(var row = Math.round(Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight)); row <  Math.max(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight); row++)
            {
                for(var col = Math.round(Math.min(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth)); col < Math.max(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth); col++)
                {
                    if (row >= 0 && col >= 0 && row <= matrix.length && col <= matrix[0].length)
                        matrix[row][col] = layer.layerType;
                }
            }
        }
    }
}

export class Path
{
    constructor (brushSize)
    {
        this.points = [];
        this.brushSize = brushSize;
        this.type = "path";
    }

    addPointToPath (point)
    {
        this.points.push(point);
    }
}

export class Point
{
    /**
     * The relative origins allow to position the point at the same page location no matter what the zoom level is
     * @param relativeOriginX
     * @param relativeOriginY
     * @param pageIndex
     */
    constructor (relativeOriginX, relativeOriginY, pageIndex)
    {
        this.relativeOriginX = relativeOriginX;
        this.relativeOriginY = relativeOriginY;
        this.pageIndex = pageIndex;
    }

    /**
     * Calculates the coordinates of a point on a page in pixels given the zoom level
     * where the top left corner of the page always represents the (0,0) coordinate.
     * The function scales the relative coordinates to the required zoom level.
     * @param zoomLevel
     * @returns {{x: number, y: number}}
     */
    getAbsoluteCoordinates(zoomLevel)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        return {
            x: this.relativeOriginX * scaleRatio,
            y: this.relativeOriginY * scaleRatio
        };
    }

    /**
     * Calculates the coordinates of a point on the canvas in pixels, where the top left corner of the canvas
     * represents the (0,0) coordinate.
     * This is relative to the viewport padding.
     * @param zoomLevel
     * @param pageIndex
     * @param renderer
     * @returns {{x: number, y: number}}
     */
    getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer)
    {
        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        let absoluteCoordinates = this.getAbsoluteCoordinates(zoomLevel);

        // Calculates where the highlights should be drawn as a function of the whole canvas coordinates system
        // (to make it look like it is on top of a page in Diva)
        let offsetX = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteCoordinates.x;
        let offsetY = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteCoordinates.y;

        return {
            x: offsetX,
            y: offsetY
        };
    }

    /**
     * Calculates the coordinates of a point on a page in pixels from the padded coordinates used to display the point on canvas
     * @param pageIndex
     * @param renderer
     * @param paddedX
     * @param paddedY
     * @returns {{x: number, y: number}}
     */
    getAbsoluteCoordinatesFromPadded(pageIndex, renderer, paddedX, paddedY)
    {
        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        return {
            x: Math.round(paddedX - (renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX)),
            y: Math.round(paddedY - (renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY))
        };
    }

}

export class Line extends Shape
{
    constructor (startPoint, endPoint, lineWidth, lineJoin)
    {
        super(startPoint);
        this.endPoint = endPoint;
        this.lineWidth = lineWidth;
        this.lineJoin = lineJoin;
    }

    getLineEquation ()
    {
        //TODO: Implement function
    }

    /**
     * Calculates the angle of the line.
     * The angle of a horizontal line is 0 degrees, angles increase in the clockwise direction
     * @param zoomLevel
     * @param pageIndex
     * @param renderer
     * @returns {number}
     */
    getAngleRad (zoomLevel, pageIndex, renderer)
    {
        let startPointAbsolutePaddedCoords = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
        let endPointAbsolutePaddedCoords = this.endPoint.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

        return Math.atan2(endPointAbsolutePaddedCoords.y - startPointAbsolutePaddedCoords.y,
            endPointAbsolutePaddedCoords.x - startPointAbsolutePaddedCoords.x);
    }

    /**
     * Draws a line on a canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     */
    draw (layer, pageIndex, zoomLevel, renderer, ctx)
    {
        let scaleRatio = Math.pow(2,zoomLevel);

        let startPointAbsoluteCoordsWithPadding = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
        let endPointAbsoluteCoordsWithPadding = this.endPoint.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

        ctx.beginPath();
        ctx.strokeStyle = layer.colour.toString();
        ctx.lineWidth = this.lineWidth * scaleRatio;
        ctx.lineJoin = this.lineJoin;
        ctx.moveTo(startPointAbsoluteCoordsWithPadding.x, startPointAbsoluteCoordsWithPadding.y);
        ctx.lineTo(endPointAbsoluteCoordsWithPadding.x, endPointAbsoluteCoordsWithPadding.y);
        ctx.closePath();
        ctx.stroke();
    }
}

export class Action
{
    constructor (action, layer)
    {
        this.action = action;
        this.layer = layer;
    }
}

export class Colour
{
    constructor (red, green, blue, opacity)
    {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.opacity = opacity;
    }

    /**
     * Turns the red, green, blue and opacity values into an HTML color
     * @returns {string}
     */
    toString ()
    {
        return "rgba(" + this.red +  ", " + this.green + ", " + this.blue + ", " + this.opacity + ")";
    }

    toHexString ()
    {
        let hexString = "#";

        let red = this.red.toString(16);
        let green = this.green.toString(16);
        let blue = this.blue.toString(16);

        if (red.length === 1)
            hexString = hexString.concat("0");
        hexString = hexString.concat(red);

        if (green.length === 1)
            hexString = hexString.concat("0");
        hexString = hexString.concat(green);

        if (blue.length === 1)
            hexString = hexString.concat("0");
        hexString = hexString.concat(blue);


        return hexString;
    }
}

export class Layer
{
    constructor (layerType, colour)
    {
        this.layerType = layerType;
        this.shapes = [];
        this.paths = [];
        this.colour = colour;
    }

    addShapeToLayer (shape)
    {
        this.shapes.push(shape);
    }

    addPathToLayer (path)
    {
        this.paths.push(path);
    }

    /**
     * Creates a new path that has the brush size selector width
     * @param point
     */
    addToCurrentPath (point)
    {
        if (this.paths.length === 0)
        {
            let brushSizeSelector = document.getElementById("brush size selector");
            this.createNewPath(brushSizeSelector.value/10);
        }
        this.paths[this.paths.length - 1].addPointToPath(point);
    }

    getCurrentPath ()
    {
        if (this.paths.length > 0)
            return this.paths[this.paths.length - 1];
        else
            return null;
    }

    createNewPath (brushSize)
    {
        this.paths.push(new Path(brushSize));
    }

    removePathFromLayer (path)
    {
        let index = this.paths.indexOf(path);
        this.paths.splice(index, 1);
    }

    removeShapeFromLayer (shape)
    {
        let index = this.shapes.indexOf(shape);
        this.shapes.splice(index, 1);
    }

    setOpacity (opacity)
    {
        this.colour.opacity = opacity;
    }

    getOpacity ()
    {
        return this.colour.opacity;
    }

    getCurrentShape ()
    {
        if (this.shapes.length > 0)
        {
            return this.shapes[this.shapes.length - 1];
        }
        else
        {
            return null;
        }
    }
}

PixelPlugin.prototype.pluginName = "pixel";
PixelPlugin.prototype.isPageTool = true;

/**
 * Make this plugin available in the global context
 * as part of the 'Diva' namespace.
 **/
(function (global)
{
    global.Diva.PixelPlugin = PixelPlugin;
})(window);