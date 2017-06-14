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
        this.background = null;
        this.layers = null;
        this.matrix = null;
        this.mousePressed = false;
        this.keyboardPress = false;
        this.lastAbsX = null;
        this.lastAbsY = null;
        this.selectedLayerIndex = 0;
        this.layerChangedMidDraw = false;
        this.actions = [];
        this.undoneActions = [];
        this.shiftDown = false;
        this.currentTool = "brush";
        this.lastRelCoordX = null;
        this.lastRelCoordY = null;
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

    tutorial ()
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

        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute("id", "pixel-canvas");
        this._canvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
        this._canvas.width = this.core.getSettings().renderer._canvas.width;
        this._canvas.height = this.core.getSettings().renderer._canvas.height;
        this._ctx = this._canvas.getContext('2d');

        // pixel canvas has to be placed on top of diva canvas and before the diva-viewport
        // This means it should be appended as its next sibling
        // Otherwise it will block diva's scrolling functionality
        let divaCanvas = this.core.getSettings().renderer._canvas;
        divaCanvas.parentNode.insertBefore(this._canvas, divaCanvas.nextSibling);

        if (this.layers === null)
        {
            let divaCanvas = this.core.getSettings().renderer._canvas,
                pageIndex = this.core.getSettings().currentPageIndex;
            // Start by creating layers
            let background = new Layer(-2, new Colour(242, 242, 242, 1), "Background", divaCanvas),
                layer1 = new Layer(0, new Colour(51, 102, 255, 0.8), "Layer 1", divaCanvas),
                layer2 = new Layer(1, new Colour(255, 51, 102, 0.8), "Layer 2", divaCanvas),
                layer3 = new Layer(2, new Colour(255, 255, 10, 0.8), "Layer 3", divaCanvas),
                layer4 = new Layer(3, new Colour(10, 180, 50, 0.8), "Layer 4", divaCanvas),
                layer5 = new Layer(4, new Colour(255, 137, 0, 0.8), "Layer 5", divaCanvas);

            background.addShapeToLayer(new Rectangle(new Point(0, 0, pageIndex), 350, 225, "add"));
            layer1.addShapeToLayer(new Rectangle(new Point(23, 42, 0), 24, 24, "add"));
            layer2.addShapeToLayer(new Rectangle(new Point(48, 50, 0), 57, 5, "add"));
            layer3.addShapeToLayer(new Rectangle(new Point(50, 80, 0), 50, 10, "add"));

            this.layers = [layer1, layer2, layer3, layer4, layer5];
            this.background = [background];
        }

        this.disableDragScrollable();
        this.createPluginElements(this.layers);
        this.createBackground(this.background);
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
        this.destroyPluginElements(this.layers, this.background);
        //this.destroyBackground(this.background);

        // TODO: Remove all layer canvases
        // this._ctx.clearRect(0,0,this._canvas.width, this._canvas.height);
        this.enableDragScrollable();
        this.activated = false;
    }

    enableDragScrollable ()
    {
        if (this.core.viewerState.viewportObject.hasAttribute('nochilddrag'))
            this.core.viewerState.viewportObject.removeAttribute('nochilddrag');
    }

    disableDragScrollable ()
    {
        if (!this.core.viewerState.viewportObject.hasAttribute('nochilddrag'))
            this.core.viewerState.viewportObject.setAttribute('nochilddrag', "");
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

        // Used for unsubscription
        this.mouseHandles = {
            mouseDownHandle: this.mouseDown,
            mouseMoveHandle: this.mouseMove,
            mouseUpHandle: this.mouseUp
        };
    }

    subscribeToKeyboardEvents ()
    {
        this.handleKeyUp = (e) => { this.onKeyUp(e); };
        this.handleKeyDown = (e) => { this.onKeyDown(e); };

        document.addEventListener("keyup", this.handleKeyUp);
        document.addEventListener("keydown", this.handleKeyDown);

        // Used for unsubscription
        this.keyboardHandles = {
            keyup: this.handleKeyUp,
            keydown: this.handleKeyDown
        };
    }

    unsubscribeFromMouseEvents ()
    {
        let canvas = document.getElementById("diva-1-outer");

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
     *            Creating HTML UI Elements
     * ===============================================
     **/

    createBackground (layers)
    {
        this.createPixelCanvases(layers);
        this.createLockedLayerSelectors(layers);
        //Next three create calls are here for UI placement. Truly belong in createPluginElements.
        this.createBrushSizeSelector();
        this.createToolsView(["brush", "rectangle", "grab", "eraser"]);
        this.createExportButton();
    }

    destroyBackground (layers)
    {
        this.destroyPixelCanvases(layers);
        this.destroyLockedLayerSelectors(layers);
    }

    createPluginElements (layers)
    {
        this.createPixelCanvases(layers);
        this.createUndoButton();
        this.createRedoButton();
        this.createLayerSelectors(layers);
        // this.createBrushSizeSelector();
        // this.createToolsView(["brush", "rectangle", "grab", "eraser"]);
        // this.createExportButton();
    }

    destroyPluginElements (layers, background)
    {
        this.destroyLayerSelectors(layers);
        this.destroyBrushSizeSelector();
        this.destroyUndoButton();
        this.destroyRedoButton();
        this.destroyExportButton();
        this.destroyPixelCanvases(layers);
        this.destroyToolsView(["brush", "rectangle", "grab", "eraser"]);
        this.destroyPixelCanvases(background);
        this.destroyLockedLayerSelectors(background);
    }

    // Tools are strings or enums
    createToolsView (tools)
    {
        let form = document.createElement("form");
        form.setAttribute("id", "tool-selector");

        // Create an element for each tool and
        for (let index = 0; index < tools.length; index++)
        {
            let tool = tools[index],
                radio = document.createElement("input"),
                content = document.createTextNode(tool),
                br = document.createElement("br");

            radio.setAttribute("id", tool);
            radio.setAttribute("type", "radio");
            radio.setAttribute("value", tool);
            radio.setAttribute("name", "tool-selector");
            radio.onclick = () =>
            {
                this.currentTool = radio.value;

                if (radio.value === "grab")
                    this.enableDragScrollable();

                else
                    this.disableDragScrollable();
            };

            // TODO: this.selectedTool (fixes tool selection after deactivating and activating plugin)
            // Currently on reactivation, selected radio button does not correspond to tool
            if (tool === "brush")      // Layer at position 0 is checked by default
                radio.checked = true;

            form.appendChild(radio);
            form.appendChild(content);
            form.appendChild(br);
        }
        document.body.appendChild(form);
    }

    destroyToolsView ()
    {
        let form = document.getElementById("tool-selector");
        form.parentNode.removeChild(form);
    }

    createPixelCanvases (layers)
    {
        for (let index = layers.length - 1; index >= 0; index--)
        {
            let divaCanvas = this.core.getSettings().renderer._canvas;
            layers[index].placeCanvasAfterElement(divaCanvas);
        }
    }

    destroyPixelCanvases (layers)
    {
        layers.forEach((layer) =>
        {
            layer.getCanvas().parentNode.removeChild(layer.getCanvas());
        });
    }

    createOpacitySlider (layer, parentElement, referenceNode)
    {
        let opacityDiv = document.createElement("div"),
            opacityText = document.createElement("p"),
            opacitySlider = document.createElement("input"),
            text = document.createTextNode("Opacity");

        opacityDiv.setAttribute("class", "layer-tool");
        opacityDiv.setAttribute("id", "layer-" + layer.layerId + "-opacity-tool");

        opacityText.setAttribute("class", "layer-tool-text");
        opacityText.setAttribute("id", "layer-" + layer.layerId + "-opacity-text");

        opacitySlider.setAttribute("class", "layer-tool-slider");
        opacitySlider.setAttribute("id", "layer-" + layer.layerId + "-opacity-slider");
        opacitySlider.setAttribute("type", "range");
        opacitySlider.setAttribute('max', 20);
        opacitySlider.setAttribute('min', 0);
        opacitySlider.setAttribute('value', layer.getOpacity() * 20);
        opacitySlider.setAttribute("draggable", "false");
        opacitySlider.addEventListener("input", () =>
        {
            layer.setOpacity(opacitySlider.value / 20);
            this.repaintLayer(layer);
        });

        opacityText.appendChild(text);
        opacityDiv.appendChild(opacityText);
        opacityDiv.appendChild(opacitySlider);
        parentElement.insertBefore(opacityDiv, referenceNode.nextSibling);
    }

    destroyOpacitySlider (layer)
    {
        let opacitySlider = document.getElementById("layer-" + layer.layerId + "-opacity-tool");
        opacitySlider.parentElement.removeChild(opacitySlider);
    }

    //////////////////
    createLockedLayerSelectors (layers)
    {
        let backgroundViewDiv = document.createElement("div");
        backgroundViewDiv.setAttribute("id", "background-view");
        backgroundViewDiv.setAttribute("class", "background-view");

        // Backwards because layers' display should be the same as visual "z-index" priority (depth)
        for (var index = layers.length - 1; index >= 0; index--)
        {
            let layer = layers[index],
                layerDiv = document.createElement("div"),
                colourDiv = document.createElement("div"),
                layerName = document.createElement("input"),
                layerOptionsDiv = document.createElement("div"),
                layerActivationDiv = document.createElement("div");

            layerDiv.setAttribute("index", index);
            layerDiv.setAttribute("draggable", "false");
            layerDiv.setAttribute("class", "layer-div");
            layerDiv.setAttribute("value", layer.layerId);
            layerDiv.setAttribute("id", "layer-" + layer.layerId + "-selector");

            layerName.setAttribute("type", "text");
            layerName.setAttribute("readonly", "true");
            layerName.setAttribute("value", layer.layerName);
            layerName.setAttribute("ondblclick", "this.readOnly='';");

            colourDiv.setAttribute("class", "color-box");
            colourDiv.setAttribute("style", "background-color: " + layer.colour.toHexString() + ";");

            layerOptionsDiv.setAttribute("class", "unchecked-layer-settings");
            layerOptionsDiv.setAttribute("id", "layer-" + layer.layerId + "-options");

            layerActivationDiv.setAttribute("class", "layer-activated");
            layerActivationDiv.setAttribute("id", "layer-" + layer.layerId + "-activation");

            if (layer.layerId === this.selectedLayerIndex)
            {
                layerDiv.classList.add("selected-layer");
            }

            colourDiv.addEventListener("click", () => { this.displayColourOptions(); });
            layerActivationDiv.addEventListener("click", () => { this.toggleLayerActivation(layer, layerActivationDiv); });
            layerName.addEventListener('keypress', (e) => { this.editLayerName(e, layerName); });
            layerOptionsDiv.onclick = () => { this.displayLayerOptions(layer, layerOptionsDiv); };

            layerDiv.appendChild(layerName);
            layerDiv.appendChild(layerOptionsDiv);
            layerDiv.appendChild(colourDiv);
            layerDiv.appendChild(layerActivationDiv);
            backgroundViewDiv.appendChild(layerDiv);
        }
        document.body.appendChild(backgroundViewDiv);
    }
    //////////////

    destroyLockedLayerSelectors ()
    {
        let backgroundViewDiv = document.getElementById("background-view");
        backgroundViewDiv.parentNode.removeChild(backgroundViewDiv);
    }

    createLayerSelectors (layers)
    {
        let departureIndex, destinationIndex;

        let layersViewDiv = document.createElement("div");
        layersViewDiv.setAttribute("id", "layers-view");
        layersViewDiv.setAttribute("class", "layers-view");

        // Backwards because layers' display should be the same as visual "z-index" priority (depth)
        for (var index = layers.length - 1; index >= 0; index--)
        {
            let layer = layers[index],
                layerDiv = document.createElement("div"),
                colourDiv = document.createElement("div"),
                layerName = document.createElement("input"),
                layerOptionsDiv = document.createElement("div"),
                layerActivationDiv = document.createElement("div");

            layerDiv.setAttribute("index", index);
            layerDiv.setAttribute("draggable", "true");
            layerDiv.setAttribute("class", "layer-div");
            layerDiv.setAttribute("value", layer.layerId);
            layerDiv.setAttribute("id", "layer-" + layer.layerId + "-selector");

            layerName.setAttribute("type", "text");
            layerName.setAttribute("readonly", "true");
            layerName.setAttribute("value", layer.layerName);
            layerName.setAttribute("ondblclick", "this.readOnly='';");

            colourDiv.setAttribute("class", "color-box");
            colourDiv.setAttribute("style", "background-color: " + layer.colour.toHexString() + ";");

            layerOptionsDiv.setAttribute("class", "unchecked-layer-settings");
            layerOptionsDiv.setAttribute("id", "layer-" + layer.layerId + "-options");

            layerActivationDiv.setAttribute("class", "layer-activated");
            layerActivationDiv.setAttribute("id", "layer-" + layer.layerId + "-activation");

            if (layer.layerId === this.selectedLayerIndex)
            {
                layerDiv.classList.add("selected-layer");
            }

            colourDiv.addEventListener("click", () => { this.displayColourOptions(); });
            layerActivationDiv.addEventListener("click", () => { this.toggleLayerActivation(layer, layerActivationDiv); });
            layerName.addEventListener('keypress', (e) => { this.editLayerName(e, layerName); });
            layerOptionsDiv.onclick = () => { this.displayLayerOptions(layer, layerOptionsDiv); };

            layerDiv.ondrag = (evt) => { this.dragging(evt); };
            layerDiv.ondragstart = (evt) => { this.dragStart(evt); };
            layerDiv.ondrop = (evt) => { this.drop(evt, departureIndex, destinationIndex); };
            layerDiv.onmousedown = () =>
            {
                departureIndex = layerDiv.getAttribute("index");
                this.highlightSelectedLayer(layerDiv.getAttribute("value"));
            };

            layerDiv.ondragover = (evt) =>
            {
                this.allowDrop(evt);
                destinationIndex = layerDiv.getAttribute("index");
            };

            layerDiv.appendChild(layerName);
            layerDiv.appendChild(layerOptionsDiv);
            layerDiv.appendChild(colourDiv);
            layerDiv.appendChild(layerActivationDiv);
            layersViewDiv.appendChild(layerDiv);
        }
        document.body.appendChild(layersViewDiv);
    }

    destroyLayerSelectors ()
    {
        let layersViewDiv = document.getElementById("layers-view");
        layersViewDiv.parentNode.removeChild(layersViewDiv);
    }

    createBrushSizeSelector ()
    {
        let brushSizeSelector = document.createElement("input");
        brushSizeSelector.setAttribute("id", "brush-size-selector");
        brushSizeSelector.setAttribute("type", "range");
        brushSizeSelector.setAttribute('max', 50);
        brushSizeSelector.setAttribute('min', 1);
        brushSizeSelector.setAttribute('value', 10);

        document.body.appendChild(brushSizeSelector);
    }

    destroyBrushSizeSelector ()
    {
        let brushSizeSelector = document.getElementById("brush-size-selector");
        brushSizeSelector.parentNode.removeChild(brushSizeSelector);
    }

    createUndoButton ()
    {
        let undoButton = document.createElement("button"),
            text = document.createTextNode("Undo");

        this.undo = () => { this.undoAction(); };

        undoButton.setAttribute("id", "undo-button");
        undoButton.appendChild(text);
        undoButton.addEventListener("click", this.undo);

        document.body.appendChild(undoButton);
    }

    destroyUndoButton ()
    {
        let undoButton = document.getElementById("undo-button");
        undoButton.parentNode.removeChild(undoButton);
    }

    createRedoButton ()
    {
        let redoButton = document.createElement("button"),
            text = document.createTextNode("Redo");

        this.redo = () => { this.redoAction(); };

        redoButton.setAttribute("id", "redo-button");
        redoButton.appendChild(text);
        redoButton.addEventListener("click", this.redo);

        document.body.appendChild(redoButton);
    }

    destroyRedoButton ()
    {
        let redoButton = document.getElementById("redo-button");
        redoButton.parentNode.removeChild(redoButton);
    }

    createExportButton ()
    {
        let exportButton = document.createElement("button"),
            text = document.createTextNode("Export as Matrix");

        this.export = () => { this.populateMatrix(); };

        exportButton.setAttribute("id", "export-button");
        exportButton.appendChild(text);
        exportButton.addEventListener("click", this.export);

        document.body.appendChild(exportButton);
    }

    destroyExportButton ()
    {
        let exportButton = document.getElementById("export-button");
        exportButton.parentNode.removeChild(exportButton);
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


    /**
     * ===============================================
     *       Handling Keyboard and Mouse Events
     * ===============================================
     **/

    /**
     * -----------------------------------------------
     *         Layer reordering (Drag and Drop)
     * -----------------------------------------------
     **/

    // Determines which element is being picked up
    dragStart (event)
    {
        event.dataTransfer.setData("Text", event.target.id);
    }

    dragging (event)
    {
        // Do nothing
    }

    // Mark area as a drop zone on hover
    allowDrop (event)
    {
        event.preventDefault();
    }

    drop (event, departureLayerIndex, destinationLayerIndex)
    {
        event.preventDefault();
        let tempLayerStorage = this.layers[departureLayerIndex];

        if (departureLayerIndex > destinationLayerIndex)
        {
            for (let i = 1; i <= (departureLayerIndex - destinationLayerIndex); i++)
            {
                this.layers[departureLayerIndex - i + 1] = this.layers[departureLayerIndex - i];
            }
            this.layers[destinationLayerIndex] = tempLayerStorage;
        }

        else if (departureLayerIndex < destinationLayerIndex)
        {
            for (let i = 1; i <= (destinationLayerIndex - departureLayerIndex); i++)
            {
                this.layers[departureLayerIndex - 1 + i] = this.layers[parseFloat(departureLayerIndex) + i];
            }
            this.layers[destinationLayerIndex] = tempLayerStorage;
        }
        this.destroyPluginElements(this.layers, this.background);
        //this.destroyPixelCanvases(this.background);
        this.createPluginElements(this.layers);
        this.createBackground(this.background); //newly added
        this.selectedLayerIndex = destinationLayerIndex;
        this.highlightSelectedLayer(this.layers[this.selectedLayerIndex].layerId); // Layer Type and not index
        // TODO: Optimization: Instead of destroying all of the canvases only destroy and reorder the ones of interest
        this.destroyPixelCanvases(this.layers);
        this.createPixelCanvases(this.layers);
        this.repaint();
    }

    /**
     * -----------------------------------------------
     *                Keyboard Events
     * -----------------------------------------------
     **/

    onKeyUp (e)
    {
        const KEY_1 = 49;
        const KEY_9 = 56;
        const SHIFT_KEY = 16;

        let lastLayer = this.selectedLayerIndex,
            numberOfLayers = this.layers.length,
            key = e.keyCode ? e.keyCode : e.which;

        if (key >= KEY_1 && key < KEY_1 + numberOfLayers && key <= KEY_9)
        {
            this.highlightSelectedLayer(key - KEY_1);

            if (lastLayer !== this.selectedLayerIndex && this.mousePressed)
                this.layerChangedMidDraw = true;
        }
        if (key === SHIFT_KEY)
            this.shiftDown = false;
    };

    onKeyDown (e)
    {
        // Cmd + Z
        if (e.code === "KeyZ" && e.shiftKey === false)
        {
            this.undoAction();
        }
        // Cmd + Shift + Z
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
        else if (e.key === "e")
        {
            this.disableDragScrollable();
            this.currentTool = "eraser";
            document.getElementById(this.currentTool).checked = true;
        }
    };

    editLayerName (e, layerName)
    {
        console.log("editing");
        const RETURN_KEY = 13;

        // TODO: Listen for changes when clicked outside of LayerName
        // TODO: Unsubscribe from other keyboard listeners
        var key = e.which || e.keyCode;
        if (key === RETURN_KEY)
        {
            // TODO: Subscribe to other keyboard listeners
            this.layers[this.selectedLayerIndex].updateLayerName(layerName.value);
            layerName.setAttribute("readonly", "true");
        }
    }

    /**
     * -----------------------------------------------
     *                Mouse Events
     * -----------------------------------------------
     **/

    getMousePos (canvas, evt)
    {
        let rect = canvas.getBoundingClientRect();

        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

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
            case "eraser":
                this.mousePressed = true;
                this.initializeNewPath(canvas, evt);
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
            case "eraser":
                this.setupPointPainting(canvas, evt);
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
                break;
            case "rectangle":
                this.mousePressed = false;
                break;
            case "eraser":
                this.mousePressed = false;
                break;
            default:
                this.mousePressed = false;
        }
    }

    /**
     * -----------------------------------------------
     *                 Tools Selection
     * -----------------------------------------------
     **/

    displayColourOptions ()
    {
        console.log("colour clicked here");
    }

    displayLayerOptions (layer, layerOptionsDiv)
    {
        if (layerOptionsDiv.classList.contains("unchecked-layer-settings")) //It is unchecked, check it
        {
            layerOptionsDiv.classList.remove("unchecked-layer-settings");
            layerOptionsDiv.classList.add("checked-layer-settings");
            this.createOpacitySlider(layer, layerOptionsDiv.parentElement.parentElement, layerOptionsDiv.parentElement);
        }
        else
        {
            layerOptionsDiv.classList.remove("checked-layer-settings");
            layerOptionsDiv.classList.add("unchecked-layer-settings");
            this.destroyOpacitySlider(layer);
        }
    }

    toggleLayerActivation (layer, layerActivationDiv)
    {
        if (layerActivationDiv.classList.contains("layer-deactivated")) //It is unchecked, check it
        {
            layerActivationDiv.classList.remove("layer-deactivated");
            layerActivationDiv.classList.add("layer-activated");
            layer.activateLayer();
            this.repaintLayer(layer);
        }
        else
        {
            layerActivationDiv.classList.remove("layer-activated");
            layerActivationDiv.classList.add("layer-deactivated");
            layer.deactivateLayer();
        }
    }

    /**
     * -----------------------------------------------
     *                   Undo / Redo
     * -----------------------------------------------
     **/

    redoAction ()
    {
        if (this.undoneActions.length > 0)
        {
            let actionToRedo = this.undoneActions[this.undoneActions.length - 1];

            if (!actionToRedo.layer.isActivated())
                return;

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
            this.repaintLayer(actionToRedo.layer);
        }
    }

    undoAction ()
    {
        if (this.actions.length > 0)
        {
            let actionToRemove = this.actions[this.actions.length - 1];

            if (!actionToRemove.layer.isActivated())
                return;

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
            this.repaintLayer(actionToRemove.layer);
        }
    }

    /**
     * ===============================================
     *                   Drawing
     * ===============================================
     **/

    // Specify the class of the selected div. CSS takes care of the rest
    highlightSelectedLayer (layerType)
    {
        this.layers.forEach ((layer) =>
        {
            // Not triple equality because layer.LayerType and layerDiv value are of different types
            if (layer.layerId == layerType)
            {
                let div = document.getElementById("layer-" + layer.layerId + "-selector");

                if (!div.hasAttribute("selected-layer"))
                    div.classList.add("selected-layer");
                this.selectedLayerIndex = this.layers.indexOf(layer);
            }
            else
            {
                let div = document.getElementById("layer-" + layer.layerId + "-selector");
                if (div.classList.contains("selected-layer"))
                    div.classList.remove("selected-layer");
            }
        });
    }

    initializeNewPath (canvas, evt)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y);

        // Make sure user is not drawing outside of a diva page
        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let selectedLayer = this.layers[this.selectedLayerIndex],
                point = new Point(relativeCoords.x, relativeCoords.y, pageIndex),
                brushSize = document.getElementById("brush-size-selector").value / 10;

            this.lastRelCoordX = relativeCoords.x;
            this.lastRelCoordY = relativeCoords.y;

            // Create New Path in Layer
            if (this.currentTool === "brush")
            {
                selectedLayer.createNewPath(brushSize, "add");
                selectedLayer.addToCurrentPath(point, "add");
            }
            else if (this.currentTool === "eraser")
            {
                selectedLayer.createNewPath(brushSize, "subtract");
                selectedLayer.addToCurrentPath(point, "subtract");
            }

            // Add path to list of actions (used for undo/redo)
            this.actions.push(new Action(selectedLayer.getCurrentPath(), selectedLayer));
            this.drawPath(selectedLayer, point, pageIndex, zoomLevel, brushSize, false, selectedLayer.getCurrentPath().blendMode, selectedLayer.getCanvas());
        }
        else
        {
            this.mousePressed = false;
        }
    }

    setupPointPainting (canvas, evt)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let point,
            horizontalMove = false,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y);

        // FIXME: direction of line drawing should be calculated only after the first shift button press
        // Right now it is being caluclated at every point
        if (Math.abs(relativeCoords.x - this.lastRelCoordX) >= Math.abs(relativeCoords.y - this.lastRelCoordY))
            horizontalMove = true;

        if (!this.mousePressed)
            return;

        if (!this.isInPageBounds(relativeCoords.x, relativeCoords.y))
            return;

        if (!this.layerChangedMidDraw)
        {
            let pageIndex = this.core.getSettings().currentPageIndex,
                zoomLevel = this.core.getSettings().zoomLevel;

            if (this.mousePressed && this.shiftDown)
            {
                if (!horizontalMove)
                    point = new Point(this.lastRelCoordX, relativeCoords.y, pageIndex);
                else
                    point = new Point(relativeCoords.x, this.lastRelCoordY, pageIndex);
            }
            else
            {
                point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
            }

            // Draw path with new point
            let brushSize = this.layers[this.selectedLayerIndex].getCurrentPath().brushSize;

            if (this.currentTool === "brush")
            {
                this.layers[this.selectedLayerIndex].addToCurrentPath(point, "add");
            }
            else if (this.currentTool === "eraser")
            {
                this.layers[this.selectedLayerIndex].addToCurrentPath(point, "subtract");
            }

            this.drawPath(this.layers[this.selectedLayerIndex], point, pageIndex, zoomLevel, brushSize, true, this.layers[this.selectedLayerIndex].getCurrentPath().blendMode, this.layers[this.selectedLayerIndex].getCanvas());
            return;
        }

        // If layer changed mid drawing then create a new path on selected layer
        this.initializeNewPath(canvas, evt);
        this.layerChangedMidDraw = false;
    }

    initializeRectanglePreview (canvas, evt)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let pageIndex = this.core.getSettings().currentPageIndex,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let selectedLayer = this.layers[this.selectedLayerIndex];
            selectedLayer.addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0, "add"));
            this.actions.push(new Action(selectedLayer.getCurrentShape(), selectedLayer));
            this.repaintLayer(selectedLayer);
        }
    }

    rectanglePreview (canvas, evt)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        if (this.mousePressed)
        {
            let mousePos = this.getMousePos(canvas, evt),
                relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y),
                lastShape = this.layers[this.selectedLayerIndex].getCurrentShape();

            if (!this.isInPageBounds(relativeCoords.x, relativeCoords.y))
                return;

            // If cursor is to the main diagonal (south east or north west of the point of origin)
            if (this.isInMainDiagonal(relativeCoords, lastShape))
            {
                let lastWidth = lastShape.relativeRectWidth;
                lastShape.relativeRectWidth = relativeCoords.x - lastShape.origin.relativeOriginX;

                // Draw a square on shift down
                if (this.shiftDown)
                {
                    let squareInBounds = this.isInPageBounds(lastShape.origin.relativeOriginX + lastShape.relativeRectWidth,
                        lastShape.origin.relativeOriginY + lastShape.relativeRectWidth);

                    if (squareInBounds)
                        lastShape.relativeRectHeight = lastShape.relativeRectWidth;
                    else
                        lastShape.relativeRectWidth = lastWidth;
                }
                else
                    lastShape.relativeRectHeight = relativeCoords.y - lastShape.origin.relativeOriginY;
            }
            else        // If cursor is to the antidiagonal (north east or south west of the point of origin)
            {
                let lastWidth = lastShape.relativeRectWidth;
                lastShape.relativeRectWidth = relativeCoords.x - lastShape.origin.relativeOriginX;

                if (this.shiftDown)
                {
                    let squareInBounds = this.isInPageBounds(lastShape.origin.relativeOriginX + lastShape.relativeRectWidth,
                        lastShape.origin.relativeOriginY - lastShape.relativeRectWidth);

                    if (squareInBounds)
                        lastShape.relativeRectHeight = - lastShape.relativeRectWidth;
                    else
                        lastShape.relativeRectWidth = lastWidth;
                }
                else
                    lastShape.relativeRectHeight = relativeCoords.y - lastShape.origin.relativeOriginY;
            }
            this.repaintLayer(this.layers[this.selectedLayerIndex]);
        }
    }

    // TODO: Generalize so that function returns any general relative position using enums
    isInMainDiagonal (relativeCoords, lastShape)
    {
        if (relativeCoords.x < lastShape.origin.relativeOriginX && relativeCoords.y < lastShape.origin.relativeOriginY)
            return true;
        else if (relativeCoords.x > lastShape.origin.relativeOriginX && relativeCoords.y > lastShape.origin.relativeOriginY)
            return true;

        return false;
    }

    repaintLayer (layer)
    {
        this.drawLayer(this.core.getSettings().zoomLevel, layer, layer.getCanvas());
    }

    repaint ()
    {
        this.drawHighlights(this.core.getSettings().zoomLevel);
    }

    isInPageBounds (relativeX, relativeY)
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel,
            renderer  = this.core.getSettings().renderer;

        let pageDimensions = this.core.publicInstance.getCurrentPageDimensionsAtCurrentZoomLevel(),
            absolutePageOrigin = new Point(0,0).getAbsolutePaddedCoordinates(zoomLevel,pageIndex,renderer),
            absolutePageWidthOffset = pageDimensions.width + absolutePageOrigin.x,  //Taking into account the padding, etc...
            absolutePageHeightOffset = pageDimensions.height + absolutePageOrigin.y,
            relativeBounds = this.getRelativeCoordinatesFromPadded(absolutePageWidthOffset, absolutePageHeightOffset);

        if (relativeX < 0 || relativeY < 0 || relativeX > relativeBounds.x || relativeY > relativeBounds.y)
            return false;

        return true;
    }

    getRelativeCoordinatesFromPadded (paddedX, paddedY)
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel,
            renderer = this.core.getSettings().renderer,
            scaleRatio = Math.pow(2, zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteRectOriginX = paddedX - renderer._getImageOffset(pageIndex).left + renderer._viewport.left -  viewportPaddingX,
            absoluteRectOriginY = paddedY - renderer._getImageOffset(pageIndex).top + renderer._viewport.top - viewportPaddingY;

        return{
            x: absoluteRectOriginX/scaleRatio,
            y: absoluteRectOriginY/scaleRatio
        };
    }

    drawPath (layer, point, pageIndex, zoomLevel, brushSize, isDown, blendMode, canvas)
    {
        let renderer = this.core.getSettings().renderer,
            scaleRatio = Math.pow(2, zoomLevel),
            ctx = canvas.getContext('2d');

        if (!(pageIndex === point.pageIndex))
            return;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absolutePaddedCoords = point.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

        let highlightXOffset = absolutePaddedCoords.x,
            highlightYOffset = absolutePaddedCoords.y;

        if (isDown)
        {
            if (blendMode === "add")
            {
                ctx.globalCompositeOperation="source-over";
                ctx.beginPath();
                ctx.strokeStyle = layer.colour.toHTMLColour();
                ctx.lineWidth = brushSize * scaleRatio;
                ctx.lineJoin = "round";
                ctx.moveTo(this.lastAbsX, this.lastAbsY);
                ctx.lineTo(highlightXOffset, highlightYOffset);
                ctx.closePath();
                ctx.stroke();
            }

            else if (blendMode === "subtract")
            {
                ctx.globalCompositeOperation="destination-out";
                ctx.beginPath();
                ctx.strokeStyle = "rgba(250,250,250,1)"; // It is important to have the alpha always equal to 1. RGB are not important when erasing
                ctx.lineWidth = brushSize * scaleRatio;
                ctx.lineJoin = "round";
                ctx.moveTo(this.lastAbsX, this.lastAbsY);
                ctx.lineTo(highlightXOffset, highlightYOffset);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.globalCompositeOperation="source-over";
        }
        this.lastAbsX = highlightXOffset;
        this.lastAbsY = highlightYOffset;
    }

    drawAbsolutePath (layer, point, pageIndex, zoomLevel, brushSize, isDown, blendMode, canvas)
    {
        let scaleRatio = Math.pow(2, zoomLevel),
            ctx = canvas.getContext('2d');

        if (!(pageIndex === point.pageIndex))
            return;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteCoords = point.getAbsoluteCoordinates(zoomLevel);

        if (isDown)
        {
            if (blendMode === "add")
            {
                ctx.globalCompositeOperation="source-over";
                ctx.beginPath();
                ctx.strokeStyle = layer.colour.toHTMLColour();
                ctx.lineWidth = brushSize * scaleRatio;
                ctx.lineJoin = "round";
                ctx.moveTo(this.lastAbsX, this.lastAbsY);
                ctx.lineTo(absoluteCoords.x, absoluteCoords.y);
                ctx.closePath();
                ctx.stroke();
            }

            else if (blendMode === "subtract")
            {
                ctx.globalCompositeOperation="destination-out";
                ctx.beginPath();
                ctx.strokeStyle = "rgba(250,250,250,1)"; // It is important to have the alpha always equal to 1. RGB are not important when erasing
                ctx.lineWidth = brushSize * scaleRatio;
                ctx.lineJoin = "round";
                ctx.moveTo(this.lastAbsX, this.lastAbsY);
                ctx.lineTo(absoluteCoords.x, absoluteCoords.y);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.globalCompositeOperation="source-over";
        }
        this.lastAbsX = absoluteCoords.x;
        this.lastAbsY = absoluteCoords.y;
    }


    fillPath(layer, point1, point2, zoomLevel, pageIndex, brushSize, blendMode)
    {
        let renderer = this.core.getSettings().renderer,
            scaleRatio = Math.pow(2,zoomLevel),
            lineWidth = brushSize,
            absoluteLineWidth = lineWidth * scaleRatio,
            highlightPageIndex = point1.pageIndex;

        if (!pageIndex === highlightPageIndex)
            return;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let point1highlightOffset = point1.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
        var point2highlightOffset = point2.getAbsolutePaddedCoordinates(zoomLevel,pageIndex,renderer);

        new Circle(point1, lineWidth/2).getPixels(layer, pageIndex, zoomLevel, renderer, this.matrix, blendMode);
        new Circle(point2, lineWidth/2).getPixels(layer, pageIndex, zoomLevel, renderer, this.matrix, blendMode);

        let ang = new Line(point1, point2).getAngleRad(zoomLevel,pageIndex,renderer);

        // find the first point on the circumference that is orthogonal
        // to the line intersecting the two circle origos

        // These are values with padding
        var start1 = {
            absolutePaddedX: point1highlightOffset.x + Math.cos(ang + Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point1highlightOffset.y + Math.sin(ang + Math.PI / 2) * absoluteLineWidth / 2
        };
        var end1 = {
            absolutePaddedX: point2highlightOffset.x + Math.cos(ang + Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point2highlightOffset.y + Math.sin(ang + Math.PI / 2) * absoluteLineWidth / 2
        };

        // find the second point on the circumference that is orthogonal
        // to the line intersecting the two circle origos
        var start2 = {
            absolutePaddedX: point1highlightOffset.x + Math.cos(ang - Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point1highlightOffset.y + Math.sin(ang - Math.PI / 2) * absoluteLineWidth / 2
        };
        var end2 = {
            absolutePaddedX: point2highlightOffset.x + Math.cos(ang - Math.PI / 2) * absoluteLineWidth / 2,
            absolutePaddedY: point2highlightOffset.y + Math.sin(ang - Math.PI / 2) * absoluteLineWidth / 2
        };

        // 1. get ymax and ymin
        let ymax = Math.round(Math.max(start1.absolutePaddedY, start2.absolutePaddedY, end1.absolutePaddedY, end2.absolutePaddedY));
        let ymin = Math.round(Math.min(start1.absolutePaddedY, start2.absolutePaddedY, end1.absolutePaddedY, end2.absolutePaddedY));
        let pairOfEdges = [[start1, end1], [start2, end2], [start1, start2], [end1, end2]];

        // Logic for polygon fill using scan lines
        new Shape().getPixels(layer, pageIndex, zoomLevel, renderer, ymax, ymin, pairOfEdges, this.matrix, blendMode);
    }

    drawLayer (zoomLevel, layer, canvas)
    {
        if (!layer.isActivated())
            return;

        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let renderer = this.core.getSettings().renderer;

        renderer._renderedPages.forEach((pageIndex) =>
        {
            layer.actions.forEach((action) =>
            {
                switch (action.type)
                {
                    case "shape":
                        action.draw(layer, pageIndex, zoomLevel, this.core.getSettings().renderer, canvas);
                        break;
                    case "path":
                        let isDown = false;
                        action.points.forEach((point) => {
                            this.drawPath(layer, point, pageIndex, zoomLevel, action.brushSize, isDown, action.blendMode, canvas);
                            isDown = true;
                        });
                        break;
                    default:
                        return;
                }
            });
        });
    }

    drawLayerOnPageCanvas (zoomLevel, layer, canvas)
    {
        console.log(canvas);

        let renderer = this.core.getSettings().renderer;

        renderer._renderedPages.forEach((pageIndex) =>
        {
            layer.actions.forEach((action) =>
            {
                console.log(action);

                switch (action.type)
                {
                    case "shape":
                        action.drawAbsolute(layer, pageIndex, zoomLevel, this.core.getSettings().renderer, canvas);
                        break;
                    case "path":
                        let isDown = false;
                        action.points.forEach((point) => {
                            this.drawAbsolutePath(layer, point, pageIndex, zoomLevel, action.brushSize, isDown, action.blendMode, canvas);
                            isDown = true;
                        });
                        break;
                    default:
                        return;
                }
            });
        });
    }

    drawHighlights (zoomLevel)
    {
        this.layers.forEach((layer) =>
        {
            this.drawLayer(zoomLevel, layer, layer.getCanvas());
        });
    }

    printMatrix ()
    {
        // Need to implement a buffering page
        // let renderer = this.core.getSettings().renderer;
        let rowlen = this.matrix[0].length;

        for (let row = 0; row < this.matrix.length; row++)
        {
            for (let col = 0; col < rowlen; col++)
            {
                let matrixEntryLen = this.matrix[row][col].length;

                if (this.matrix[row][col][matrixEntryLen - 1] !== -1)
                {
                    this.layers.forEach((layer) =>
                    {
                        if (layer.layerId === this.matrix[row][col][matrixEntryLen - 1])
                        {
                            this._ctx.fillStyle = layer.colour.toHTMLColour();
                            this._ctx.beginPath();
                            this._ctx.arc(col, row, 0.2, 0, 2 * Math.PI);
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
     * The matrix will be a 3D matrix that stores the information for all layers
     **/
    initializeMatrix (zoomLevel)
    {
        let pageIndex = this.core.getSettings().currentPageIndex;
        let height = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, zoomLevel).height,
            width = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, zoomLevel).width;

        // Decalaration of a 2D array
        this.matrix = new Array(height).fill(null).map(() => new Array(width).fill(-1));
    }

    // Creating a canvas with the size of the
    populateMatrix ()
    {
        console.log("Populating");

        let pageIndex = this.core.getSettings().currentPageIndex,
            maxZoomLevel = this.core.getSettings().zoomLevel;
        let height = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).height,
            width = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).width;

        this.initializeMatrix(maxZoomLevel);

        let baseCanvas = document.createElement('canvas');
        baseCanvas.setAttribute("class", "export-page-canvas");
        baseCanvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
        baseCanvas.width = width;
        baseCanvas.height = height;

        // TODO: The idea here is to draw on 5 different canvases (on top of each other) then fill the matrix from there layer by layer
        this.layers.forEach((layer) =>
        {
            let opacity = layer.getOpacity();
            layer.setOpacity(1);

            // This will be used for drawing absolute stuff
            let newCanvas = document.createElement('canvas');
            newCanvas.setAttribute("class", "export-page-canvas");
            newCanvas.setAttribute("id", "layer-" + layer.layerId + "-export-canvas");
            newCanvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
            newCanvas.width = width;
            newCanvas.height = height;

            this.drawLayerOnPageCanvas(maxZoomLevel, layer, newCanvas);
            baseCanvas.getContext('2d').drawImage(newCanvas, 0, 0);
            layer.setOpacity(opacity);
        });

        let viewerCanvas = document.createElement('canvas');
        viewerCanvas.setAttribute("class", "export-page-canvas-viewer");
        viewerCanvas.width = width;
        viewerCanvas.height = height;

        viewerCanvas.getContext('2d').clearRect(0, 0, viewerCanvas.width, viewerCanvas.height);

        let num = 0;

        for (let row = 0; row < height; row++)
        {
            for (let col = 0; col < width; col++)
            {
                let data = baseCanvas.getContext('2d').getImageData(col,row,1,1).data;
                let colour = new Colour(data[0], data[1], data[2], data[3]);

                viewerCanvas.getContext('2d').fillStyle = colour.toHTMLColour();
                viewerCanvas.getContext('2d').fillRect(col, row, 1, 1);

                // this.layers.forEach((layer) =>
                // {
                //     if ((layer.colour.red === colour.red) && (layer.colour.blue === colour.blue) && (layer.colour.green === colour.green))
                //     {
                //         layer.setOpacity(1);
                //         viewerCanvas.getContext('2d').fillStyle = layer.colour.toHTMLColour();
                //         viewerCanvas.getContext('2d').fillRect(col, row, 1, 1);
                //         this.matrix[row][col] = layer.layerId;
                //     }
                //     else if (data[3] !== 0)
                //     {
                //         // console.log(layer, colour);
                //     }
                // });
            }
            console.log(row * 100 / height)
        }
        document.body.appendChild(viewerCanvas);
        console.log(num);
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

    drawAbsolute ()
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
    getPixels(layer, pageIndex, zoomLevel, renderer, ymax, ymin, pairOfEdges, matrix, blendMode)
    {
        // TODO: Check for horizontal or vertical lines
        // For every scan line
        for (let y = ymin; y < ymax; y++)
        {
            let intersectionPoints = [];

            // For every line calculate the intersection edges
            for (let e = 0; e < pairOfEdges.length; e++)
            {
                // Calculate intersection with line
                for (let p = 0; p < pairOfEdges[e].length - 1; p++)
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

                        for (let fill = start; fill < end; fill++)
                        {
                            // Remove padding to get absolute coordinates
                            let absoluteCoords = new Point().getAbsoluteCoordinatesFromPadded(pageIndex,renderer,fill,y);

                            if (absoluteCoords.y >= 0 && absoluteCoords.x >= 0
                                && absoluteCoords.y <= matrix.length && absoluteCoords.x <= matrix[0].length)
                            {
                                let matrixEntryLen = matrix[absoluteCoords.y][absoluteCoords.x].length;

                                if (blendMode === "add" && (matrix[absoluteCoords.y][absoluteCoords.x][matrixEntryLen - 1] !== layer.layerId))
                                {
                                    matrix[absoluteCoords.y][absoluteCoords.x].push(layer.layerId);
                                }
                                else if (blendMode === "subtract" && (matrix[absoluteCoords.y][absoluteCoords.x][matrixEntryLen - 1] === layer.layerId))
                                {
                                    matrix[absoluteCoords.y][absoluteCoords.x].pop();
                                }
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
    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        if (pageIndex === this.origin.pageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let absoluteCenterWithPadding = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

            //Draw the circle
            ctx.fillStyle = layer.colour.toHTMLColour();
            ctx.beginPath();
            ctx.arc(absoluteCenterWithPadding.x,absoluteCenterWithPadding.y, this.relativeRadius * scaleRatio,0,2*Math.PI);
            ctx.fill();
        }
    }

    drawAbsolute (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        if (pageIndex === this.origin.pageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let absoluteCenter = this.origin.getAbsoluteCoordinates(zoomLevel);

            //Draw the circle
            ctx.fillStyle = layer.colour.toHTMLColour();
            ctx.beginPath();
            ctx.arc(absoluteCenter.x,absoluteCenter.y, this.relativeRadius * scaleRatio,0,2*Math.PI);
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
    getPixels (layer, pageIndex, zoomLevel, renderer, matrix, blendMode)
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
                        let matrixEntryLen = matrix[absoluteCoords.y][absoluteCoords.x].length;

                        if (blendMode === "add" && (matrix[absoluteCoords.y][absoluteCoords.x][matrixEntryLen - 1] !== layer.layerId))
                        {
                            matrix[absoluteCoords.y][absoluteCoords.x].push(layer.layerId);
                        }
                        else if (blendMode === "subtract" && (matrix[absoluteCoords.y][absoluteCoords.x][matrixEntryLen - 1] === layer.layerId))
                        {
                            matrix[absoluteCoords.y][absoluteCoords.x].pop();
                        }
                    }
                }
            }
        }
    }
}


export class Rectangle extends Shape
{
    constructor (point, relativeRectWidth, relativeRectHeight, blendMode) {
        super(point);
        this.relativeRectWidth = relativeRectWidth;
        this.relativeRectHeight = relativeRectHeight;
        this.blendMode = blendMode;
    }

    /**
     * draws a rectangle on a canvas
     * @param layer
     * @param pageIndex
     * @param zoomLevel
     * @param renderer
     */
    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        // TODO: Use padded coordinates
        if (this.blendMode === "add")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
                // (to make it look like it is on top of a page in Diva)
                let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX,
                    highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.fillRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
            }
        }

        else if (this.blendMode === "subtract")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
                // (to make it look like it is on top of a page in Diva)
                let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX,
                    highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.clearRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
            }
        }
    }

    drawAbsolute (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = this.relativeRectWidth * scaleRatio,
            absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        // TODO: Use padded coordinates
        if (this.blendMode === "add")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.fillRect(absoluteRectOriginX, absoluteRectOriginY,absoluteRectWidth,absoluteRectHeight);
            }
        }

        else if (this.blendMode === "subtract")
        {
            if (pageIndex === this.origin.pageIndex)
            {
                //Draw the rectangle
                ctx.fillStyle = layer.colour.toHTMLColour();
                ctx.clearRect(absoluteRectOriginX, absoluteRectOriginY,absoluteRectWidth,absoluteRectHeight);
            }
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
    getPixels (layer, pageIndex, zoomLevel, renderer, matrix, blendMode)
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
                    {
                        let matrixEntryLen = matrix[row][col].length;

                        if (blendMode === "add" && (matrix[row][col][matrixEntryLen - 1] !== layer.layerId))
                        {
                            matrix[row][col].push(layer.layerId);
                        }
                        else if (blendMode === "subtract" && (matrix[row][col][matrixEntryLen - 1] === layer.layerId))
                        {
                            matrix[row][col].pop();
                        }
                    }
                }
            }
        }
    }
}

export class Path
{
    constructor (brushSize, blendMode)
    {
        this.points = [];
        this.brushSize = brushSize;
        this.type = "path";
        this.blendMode = blendMode
    }

    addPointToPath (point)
    {
        this.points.push(point);
    }

    draw ()
    {

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
    draw (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        let startPointAbsoluteCoordsWithPadding = this.origin.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);
        let endPointAbsoluteCoordsWithPadding = this.endPoint.getAbsolutePaddedCoordinates(zoomLevel, pageIndex, renderer);

        ctx.beginPath();
        ctx.strokeStyle = layer.colour.toHTMLColour();
        ctx.lineWidth = this.lineWidth * scaleRatio;
        ctx.lineJoin = this.lineJoin;
        ctx.moveTo(startPointAbsoluteCoordsWithPadding.x, startPointAbsoluteCoordsWithPadding.y);
        ctx.lineTo(endPointAbsoluteCoordsWithPadding.x, endPointAbsoluteCoordsWithPadding.y);
        ctx.closePath();
        ctx.stroke();
    }

    drawAbsolute (layer, pageIndex, zoomLevel, renderer, canvas)
    {
        let scaleRatio = Math.pow(2,zoomLevel);
        let ctx = canvas.getContext('2d');

        let startPointAbsoluteCoords = this.origin.getAbsoluteCoordinates(zoomLevel);
        let endPointAbsoluteCoords = this.endPoint.getAbsoluteCoordinates(zoomLevel);

        ctx.beginPath();
        ctx.strokeStyle = layer.colour.toHTMLColour();
        ctx.lineWidth = this.lineWidth * scaleRatio;
        ctx.lineJoin = this.lineJoin;
        ctx.moveTo(startPointAbsoluteCoords.x, startPointAbsoluteCoords.y);
        ctx.lineTo(endPointAbsoluteCoords.x, endPointAbsoluteCoords.y);
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
    constructor (red, green, blue, alpha)
    {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    /**
     * Turns the red, green, blue and opacity values into an HTML colour
     * @returns {string}
     */
    toHTMLColour ()
    {
        return "rgba(" + this.red +  ", " + this.green + ", " + this.blue + ", " + this.alpha + ")";
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
    constructor (layerId, colour, layerName, divaCanvas)
    {
        this.layerId = layerId;
        this.shapes = [];
        this.paths = [];
        this.colour = colour;
        this.layerName = layerName;
        this.canvas = null;
        this.ctx = null;
        this.actions = [];
        this.activated = true;
        this.createCanvas(divaCanvas)
    }

    createCanvas (divaCanvas)
    {
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute("class", "pixel-canvas");
        this.canvas.setAttribute("id", "layer-" + this.layerId + "-canvas");
        this.canvas.setAttribute("style", "position: absolute; top: 0; left: 0;");
        this.canvas.width = divaCanvas.width;
        this.canvas.height = divaCanvas.height;

        this.ctx = this.canvas.getContext('2d');
    }

    placeCanvasAfterElement (element)
    {
        element.parentNode.insertBefore(this.canvas, element.nextSibling);
    }

    getCanvas ()
    {
        return this.canvas;
    }

    getCtx ()
    {
        return this.ctx;
    }

    clearCtx ()
    {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateLayerName (newLayerName)
    {
        this.layerName = newLayerName;
    }

    addShapeToLayer (shape)
    {
        this.shapes.push(shape);
        this.actions.push(shape);
    }

    addPathToLayer (path)
    {
        this.paths.push(path);
        this.actions.push(path);
    }

    /**
     * Creates a new path that has the brush size selector width
     * @param point
     */
    addToCurrentPath (point, blendMode)
    {
        if (this.paths.length === 0)
        {
            let brushSizeSelector = document.getElementById("brush-size-selector");
            this.createNewPath(brushSizeSelector.value / 10, blendMode);
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

    createNewPath (brushSize, blendMode)
    {
        let path = new Path(brushSize, blendMode);
        this.paths.push(path);
        this.actions.push(path);
    }

    removePathFromLayer (path)
    {
        let index = this.paths.indexOf(path);
        this.paths.splice(index, 1);

        let actionIndex = this.actions.indexOf(path);
        this.actions.splice(actionIndex, 1);
    }

    removeShapeFromLayer (shape)
    {
        let index = this.shapes.indexOf(shape);
        this.shapes.splice(index, 1);

        let actionIndex = this.actions.indexOf(shape);
        this.actions.splice(actionIndex, 1);
    }

    setOpacity (opacity)
    {
        this.colour.alpha = opacity;
    }

    getOpacity ()
    {
        return this.colour.alpha;
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

    deactivateLayer ()
    {
        this.activated = false;
        this.clearCtx();
    }

    activateLayer ()
    {
        this.activated = true;
    }

    toggleLayerActivation ()
    {
        this.activated = !this.activated;
    }

    isActivated ()
    {
        return this.activated;
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