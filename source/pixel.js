/**
 * This plugin will be used to transform Diva into a layering tool which will be used to provide
 * the ground truth data for the machine learning algorithm
 * that classifies and isolates the different components of old manuscripts and scores.
 *
 * {string} pluginName - Added to the class prototype. Defines the name for the plugin.
 *
 **/

import {Point} from './point';
import {Rectangle} from './rectangle';
import {Layer} from './layer';
import {Action} from './action';
import {Colour} from './colour';
import {Export} from './export';
import {UIManager} from './ui-manager';
import {Tools} from './tools';

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
        this.mousePressed = false;
        this.selectedLayerIndex = 0;
        this.layerChangedMidDraw = false;
        this.actions = [];
        this.undoneActions = [];
        this.shiftDown = false;
        this.lastRelCoordX = null;
        this.lastRelCoordY = null;
        this.uiManager = null;
        this.tools = null;
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

        if (this.layers === null)
        {
            let divaCanvas = this.core.getSettings().renderer._canvas;

            // Start by creating layers
            let background = new Layer(-1, new Colour(242, 242, 242, 1), "Background", divaCanvas, 1),
                layer1 = new Layer(0, new Colour(51, 102, 255, 1), "Layer 1", divaCanvas, 0.5),
                layer2 = new Layer(1, new Colour(255, 51, 102, 1), "Layer 2", divaCanvas, 0.5),
                layer3 = new Layer(2, new Colour(255, 255, 10, 1), "Layer 3", divaCanvas, 0.5);

            layer1.addShapeToLayer(new Rectangle(new Point(23, 42, 0), 24, 24, "add"));
            layer2.addShapeToLayer(new Rectangle(new Point(48, 50, 0), 57, 5, "add"));
            layer3.addShapeToLayer(new Rectangle(new Point(50, 80, 0), 50, 10, "add"));

            this.layers = [layer1, layer2, layer3];
            this.background = background;
            this.background.canvas = this.core.getSettings().renderer._canvas;  // Link background canvas to the actual diva canvas
        }

        this.uiManager = new UIManager(this);
        this.tools = new Tools(this);
        this.uiManager.createPluginElements(this.layers);
        this.scrollEventHandle = this.subscribeToScrollEvent();
        this.zoomEventHandle = this.subscribeToZoomLevelWillChangeEvent();

        this.disableDragScrollable();
        this.subscribeToMouseEvents();
        this.subscribeToKeyboardEvents();
        this.repaint();  // Repaint the tiles to retrigger VisibleTilesDidLoad

        this.activated = true;
    }

    deactivatePlugin ()
    {
        global.Diva.Events.unsubscribe(this.scrollEventHandle);
        global.Diva.Events.unsubscribe(this.zoomEventHandle);

        this.unsubscribeFromMouseEvents();
        this.unsubscribeFromKeyboardEvents();
        this.unsubscribeFromKeyboardPress();
        this.repaint(); // Repaint the tiles to make the highlights disappear off the page

        this.uiManager.destroyPluginElements(this.layers, this.background);

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
     *        Event Subscription/Unsubscription
     * ===============================================
     **/

    subscribeToZoomLevelWillChangeEvent ()
    {
        let handle = global.Diva.Events.subscribe('ZoomLevelWillChange', (zoomLevel) =>
        {
            this.drawHighlights(zoomLevel);
        });

        return handle;
    }

    subscribeToScrollEvent()
    {
        let handle = global.Diva.Events.subscribe('ViewerDidScroll', () =>
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
<<<<<<< HEAD
     *            Creating HTML UI Elements
     * ===============================================
     **/

    createPluginElements (layers)
    {
        this.placeLayerCanvasesInDiva(layers);
        this.createUndoButton();
        this.createRedoButton();
        this.createLayersView(layers);
        this.createBrushSizeSelector();
        this.createToolsView(["brush", "rectangle", "grab", "eraser", "select"]);
        this.createExportButtons();
    }

    destroyPluginElements (layers, background)
    {
        this.destroyLayerSelectors(layers);
        this.destroyBrushSizeSelector();
        this.destroyUndoButton();
        this.destroyRedoButton();
        this.destroyExportButtons();
        this.destroyPixelCanvases(layers);
        this.destroyToolsView(["brush", "rectangle", "grab", "eraser", "select"]);
        this.destroyLockedLayerSelectors(background);
    }

    // Tools are strings or enums
    createToolsView (tools)
    {
        let form = document.createElement("form");
        form.setAttribute("id", "tool-selector");

        let handleClick = (radio) =>
        {
            radio.addEventListener("click", () =>
            {
                this.currentTool = radio.value;

                if (radio.value === "grab")
                    this.enableDragScrollable();

                else
                    this.disableDragScrollable();
            });
        };

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
            handleClick(radio);

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

    placeLayerCanvasesInDiva (layers)
    {
        let divaCanvas = this.core.getSettings().renderer._canvas;
        for (let index = layers.length - 1; index >= 0; index--)
        {
            let layer = layers[index];
            layer.placeCanvasAfterElement(divaCanvas);

            if (layer.isActivated())
                layer.getCanvas().setAttribute("style", layer.getLayerOpacityCSSString());
            else
                layer.getCanvas().setAttribute("style", "opacity: 0;");
        }

        if (this.background.isActivated())
            this.background.getCanvas().setAttribute("style", this.background.getLayerOpacityCSSString());
        else
            this.background.getCanvas().setAttribute("style", "opacity: 0;");
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
        opacitySlider.setAttribute('max', 50);
        opacitySlider.setAttribute('min', 0);

        opacitySlider.setAttribute('value', layer.getLayerOpacity() * 50);
        opacitySlider.setAttribute("draggable", "false");

        opacitySlider.addEventListener("input", () =>
        {
            layer.setLayerOpacity(opacitySlider.value / 50);
            if (layer.isActivated())    // Respecify opacity only when the layer is activated
                layer.getCanvas().setAttribute("style", layer.getLayerOpacityCSSString());
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

    createBackground ()
    {
        let backgroundViewDiv = document.createElement("div");
        backgroundViewDiv.setAttribute("id", "background-view");
        backgroundViewDiv.setAttribute("class", "background-view");

        // Should only have 1 element, but perhaps there will one day be more than 1 background
        let layer = this.background,
            layerDiv = document.createElement("div"),
            colourDiv = document.createElement("div"),
            layerName = document.createElement("input"),
            layerOptionsDiv = document.createElement("div"),
            layerActivationDiv = document.createElement("div");

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

        if (this.background.isActivated())
            layerActivationDiv.setAttribute("class", "layer-activated");
        else
            layerActivationDiv.setAttribute("class", "layer-deactivated");

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

        this.background.getCanvas().setAttribute("style", "opacity: 1;");

        document.body.appendChild(backgroundViewDiv);
    }

    destroyLockedLayerSelectors ()
    {
        let backgroundViewDiv = document.getElementById("background-view");
        backgroundViewDiv.parentNode.removeChild(backgroundViewDiv);
    }

    createLayersView (layers)
    {
        let departureIndex, destinationIndex;

        let layersViewDiv = document.createElement("div");
        layersViewDiv.setAttribute("id", "layers-view");
        layersViewDiv.setAttribute("class", "layers-view");

        let handleEvents = (layer, colourDiv, layerActivationDiv, layerName, layerOptionsDiv, layerDiv) =>
        {
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
        };


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

            if (layer.isActivated())
                layerActivationDiv.setAttribute("class", "layer-activated");
            else
                layerActivationDiv.setAttribute("class", "layer-deactivated");


            layerActivationDiv.setAttribute("id", "layer-" + layer.layerId + "-activation");

            if (layer.layerId === this.selectedLayerIndex)
            {
                layerDiv.classList.add("selected-layer");
            }

            handleEvents(layer, colourDiv, layerActivationDiv, layerName, layerOptionsDiv, layerDiv);

            layerDiv.appendChild(layerName);
            layerDiv.appendChild(layerOptionsDiv);
            layerDiv.appendChild(colourDiv);
            layerDiv.appendChild(layerActivationDiv);
            layersViewDiv.appendChild(layerDiv);
        }
        document.body.appendChild(layersViewDiv);

        this.createBackground(layers);

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

    createExportButtons ()
    {
        let csvExportButton = document.createElement("button"),
            csvExportText = document.createTextNode("Export as CSV"),
            pngExportButton = document.createElement("button"),
            pngExportText = document.createTextNode("Export as PNG"),
            pngDataExportButton = document.createElement("button"),
            pngDataExportText = document.createTextNode("Export as PNG Data");

        this.exportCSV = () => { this.exportAsCSV(); };
        this.exportPNG = () => { this.exportAsHighlights(); };
        this.exportPNGData = () => { this.exportAsImageData(); };

        csvExportButton.setAttribute("id", "csv-export-button");
        csvExportButton.appendChild(csvExportText);
        csvExportButton.addEventListener("click", this.exportCSV);

        pngExportButton.setAttribute("id", "png-export-button");
        pngExportButton.appendChild(pngExportText);
        pngExportButton.addEventListener("click", this.exportPNG);

        pngDataExportButton.setAttribute("id", "png-export-data-button");
        pngDataExportButton.appendChild(pngDataExportText);
        pngDataExportButton.addEventListener("click", this.exportPNGData);

        document.body.appendChild(csvExportButton);
        document.body.appendChild(pngExportButton);
        document.body.appendChild(pngDataExportButton);
    }

    destroyExportButtons ()
    {
        let csvexportButton = document.getElementById("csv-export-button"),
            pngexportButton = document.getElementById("png-export-button"),
            pngexportDataButton = document.getElementById("png-export-data-button");

        csvexportButton.parentNode.removeChild(csvexportButton);
        pngexportButton.parentNode.removeChild(pngexportButton);
        pngexportDataButton.parentNode.removeChild(pngexportDataButton);
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

    updateProgress (percentage) {
        let percentageStr = percentage + "%";
        let widthStr = "width: " + percentageStr;
        document.getElementById("pbar-inner-div").setAttribute("style", widthStr);
        document.getElementById("pbar-inner-text").innerHTML = percentageStr;
    }

    destroyBackground (layers)
    {
        this.destroyLockedLayerSelectors(layers);
    }


    /**
     * ===============================================
=======
>>>>>>> develop
     *       Handling Keyboard and Mouse Events
     * ===============================================
     *         Layer reordering (Drag and Drop)
     * -----------------------------------------------
     **/

    // Determines which element is being picked up
    dragStart (event)
    {
        event.dataTransfer.setData("Text", event.target.id);
    }

    dragging () //can take an event as an argument
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
        this.uiManager.destroyPluginElements(this.layers, this.background);
        this.uiManager.createPluginElements(this.layers);
        this.selectedLayerIndex = destinationLayerIndex;
        this.highlightLayerSelector(this.layers[this.selectedLayerIndex].layerId); // Layer Type and not index
        // TODO: Optimization: Instead of destroying all of the canvases only destroy and reorder the ones of interest
        this.uiManager.destroyPixelCanvases(this.layers);
        this.uiManager.placeLayerCanvasesInDiva(this.layers);
        this.uiManager.placeLayerCanvasesInDiva(this.background);
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
            this.highlightLayerSelector(key - KEY_1);

            if (lastLayer !== this.selectedLayerIndex && this.mousePressed)
                this.layerChangedMidDraw = true;
        }
        if (key === SHIFT_KEY)
            this.shiftDown = false;
    }

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
            this.tools.setCurrentTool(this.tools.type.brush);
        }
        else if (e.key === "r")
        {
            this.tools.setCurrentTool(this.tools.type.rectangle);
        }
        else if (e.key === "g")
        {
            this.tools.setCurrentTool(this.tools.type.grab);
        }
        else if (e.key === "e")
        {
            this.tools.setCurrentTool(this.tools.type.eraser);
        }
        else if (e.key === "s")
        {
            this.disableDragScrollable();
            this.currentTool =  "select";
            document.getElementById(this.currentTool).checked = true;
        }
    }

    editLayerName (e, layerName)
    {
        const RETURN_KEY = 13;

        // TODO: Listen for changes when clicked outside of LayerName
        // TODO: Unsubscribe from other keyboard listeners
        let key = e.which || e.keyCode;
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
        switch (this.tools.getCurrentTool())
        {
            case this.tools.type.brush:
                this.mousePressed = true;
                this.initializeNewPathInCurrentLayer(canvas, evt);
                break;
            case this.tools.type.rectangle:
                this.mousePressed = true;
                this.initializeRectanglePreview(canvas, evt);
                break;
            case this.tools.type.grab:
                this.mousePressed = true;
                break;
            case this.tools.type.eraser:
                this.mousePressed = true;
                this.initializeNewPathInCurrentLayer(canvas, evt);
                break;
            case "select":
                this.mousePressed = true;
                this.initializeRectanglePreview(canvas, evt);
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
        switch (this.tools.getCurrentTool())
        {
            case this.tools.type.brush:
                this.addPointToCurrentPath(canvas, evt);
                break;
<<<<<<< HEAD
            case "rectangle":
                this.rectanglePreview(canvas, evt);
=======
            case this.tools.type.rectangle:
                this.rectanglePreview(canvas,evt);
>>>>>>> develop
                break;
            case this.tools.type.eraser:
                this.addPointToCurrentPath(canvas, evt);
                break;
            case "select":
                this.rectanglePreview(canvas, evt);
                break;
            default:
        }
    }

    onMouseUp ()    // can take an event as an argument
    {
        // let canvas = document.getElementById("diva-1-outer");
        switch (this.tools.getCurrentTool())
        {
            case this.tools.type.brush:
                this.mousePressed = false;
                break;
            case this.tools.type.rectangle: // TODO: Add action: resized rectangle. This is useful if a user wants to revert a rectangle resize (when implementd)
                this.mousePressed = false;
                break;
            case this.tools.type.eraser:
                this.mousePressed = false;
                break;
            case "select":
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
        // TODO: Implement function
        console.log("colour clicked here");
    }

    displayLayerOptions (layer, layerOptionsDiv)
    {
        if (layerOptionsDiv.classList.contains("unchecked-layer-settings")) //It is unchecked, check it
        {
            layerOptionsDiv.classList.remove("unchecked-layer-settings");
            layerOptionsDiv.classList.add("checked-layer-settings");
            this.uiManager.createOpacitySlider(layer, layerOptionsDiv.parentElement.parentElement, layerOptionsDiv.parentElement);
        }
        else
        {
            layerOptionsDiv.classList.remove("checked-layer-settings");
            layerOptionsDiv.classList.add("unchecked-layer-settings");
            this.uiManager.destroyOpacitySlider(layer);
        }
    }

    toggleLayerActivation (layer, layerActivationDiv)
    {
        if (layerActivationDiv.classList.contains("layer-deactivated")) // Activating
        {
            layerActivationDiv.classList.remove("layer-deactivated");
            layerActivationDiv.classList.add("layer-activated");
            layer.getCanvas().setAttribute("style", layer.getLayerOpacityCSSString());

            if (layer.layerId === -1)      // Background
            {
                layer.activated = true;
            }
            else
            {
                layer.activateLayer();
                this.repaintLayer(layer);
            }
        }
        else    // Deactivating
        {
            layerActivationDiv.classList.remove("layer-activated");
            layerActivationDiv.classList.add("layer-deactivated");

            if (layer.layerId === -1)      // Background
            {
                let opacityStr = "opacity : 0;";
                layer.getCanvas().setAttribute("style", opacityStr);
                layer.activated = false;
            }
            else
            {
                layer.deactivateLayer();
            }
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
    highlightLayerSelector (layerType)
    {
        layerType = parseInt(layerType);

        this.layers.forEach ((layer) =>
        {
            // layerType is a string i
            if (layer.layerId === layerType)
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

    initializeNewPathInCurrentLayer (canvas, evt)
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
            if (this.tools.getCurrentTool() === this.tools.type.brush)
            {
                selectedLayer.createNewPath(brushSize, "add");
                selectedLayer.addToCurrentPath(point, "add");
            }
            else if (this.tools.getCurrentTool() === this.tools.type.eraser)
            {
                selectedLayer.createNewPath(brushSize, "subtract");
                selectedLayer.addToCurrentPath(point, "subtract");
            }

            // Add path to list of actions (used for undo/redo)
            this.actions.push(new Action(selectedLayer.getCurrentPath(), selectedLayer));
<<<<<<< HEAD
            this.drawPath(selectedLayer, point, pageIndex, zoomLevel, brushSize, false, selectedLayer.getCurrentPath().mode, selectedLayer.getCanvas());
=======
            selectedLayer.getCurrentPath().connectPoint(selectedLayer, point, pageIndex, zoomLevel, false, this.core.getSettings().renderer, selectedLayer.getCanvas(), "viewport");
>>>>>>> develop
        }
        else
        {
            this.mousePressed = false;
        }
    }

    addPointToCurrentPath (canvas, evt)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let point,
            horizontalMove = false,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y);

        // FIXME: direction of line drawing should be calculated only after the first shift button press
        // Right now it is being calculated at every point
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
            switch (this.tools.getCurrentTool())
            {
                case this.tools.type.brush:
                    this.layers[this.selectedLayerIndex].addToCurrentPath(point, "add");
                    break;
                case this.tools.type.eraser:
                    this.layers[this.selectedLayerIndex].addToCurrentPath(point, "subtract");
                    break;
                default:
                    this.layers[this.selectedLayerIndex].addToCurrentPath(point, "add");
            }

<<<<<<< HEAD
            this.drawPath(this.layers[this.selectedLayerIndex], point, pageIndex, zoomLevel, brushSize, true, this.layers[this.selectedLayerIndex].getCurrentPath().mode, this.layers[this.selectedLayerIndex].getCanvas());
=======
            let layer = this.layers[this.selectedLayerIndex];
            layer.getCurrentPath().connectPoint(layer, point, pageIndex, zoomLevel, true, this.core.getSettings().renderer, layer.getCanvas(), "viewport");

>>>>>>> develop
            return;
        }

        // If layer changed mid drawing then create a new path on selected layer
        this.initializeNewPathInCurrentLayer(canvas, evt);
        this.layerChangedMidDraw = false;
    }

    initializeRectanglePreview (canvas, evt)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let pageIndex = this.core.getSettings().currentPageIndex,
            mousePos = this.getMousePos(canvas, evt),
            relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y)) {
            let selectedLayer = this.layers[this.selectedLayerIndex];


            if (this.currentTool === "select")
                selectedLayer.addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0, "select", this.currentTool));
            else
                selectedLayer.addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0, "add", this.currentTool));


            this.actions.push(new Action(selectedLayer.getCurrentShape(), selectedLayer));
            this.repaintLayer(selectedLayer);
        }
    }

    rectanglePreview (canvas, evt)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        if (!this.layerChangedMidDraw)
        {
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
        else
        {
            // Create a new rectangle to which the change will be
            this.layerChangedMidDraw = false;
            this.initializeRectanglePreview(canvas, evt);
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

<<<<<<< HEAD
    drawPath (layer, point, pageIndex, zoomLevel, brushSize, isDown, blendMode, canvas)
    {
        let renderer = this.core.getSettings().renderer,
            scaleRatio = Math.pow(2, zoomLevel),
            ctx = canvas.getContext('2d');

        if (pageIndex !== point.pageIndex)
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

        if (pageIndex !== point.pageIndex)
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

        if (pageIndex !== highlightPageIndex)
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

    //used on initial draw, scroll, zoom
=======
>>>>>>> develop
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
<<<<<<< HEAD
                switch (action.type)
                {
                    case "shape":
                        action.draw(layer, pageIndex, zoomLevel, this.core.getSettings().renderer, canvas, this.currentTool);
                        break;
                    case "path":
                        let isDown = false;
                        action.points.forEach((point) => {
                            this.drawPath(layer, point, pageIndex, zoomLevel, action.brushSize, isDown, action.mode, canvas);
                            isDown = true;
                        });
                        break;
                    default:
                        return;
                }
=======
                action.draw(layer, pageIndex, zoomLevel, renderer, canvas);
>>>>>>> develop
            });
        });
    }

<<<<<<< HEAD
    //used on export
=======
    // Called on export
>>>>>>> develop
    drawLayerOnPageCanvas (layer, zoomLevel, canvas, pageIndex)
    {
        layer.actions.forEach((action) =>
        {
<<<<<<< HEAD
            switch (action.type)
            {
                case "shape":
                    action.drawAbsolute(layer, pageIndex, zoomLevel, this.core.getSettings().renderer, canvas);
                    break;
                case "path":
                    let isDown = false;
                    action.points.forEach((point) => {
                        this.drawAbsolutePath(layer, point, pageIndex, zoomLevel, action.brushSize, isDown, action.mode, canvas);
                        isDown = true;
                    });
                    break;
                default:
                    return;
            }
=======
            action.drawAbsolute(layer, pageIndex, zoomLevel, this.core.getSettings().renderer, canvas);
>>>>>>> develop
        });
    }

    drawHighlights (zoomLevel)
    {
        this.layers.forEach((layer) =>
        {
            this.drawLayer(zoomLevel, layer, layer.getCanvas());
        });
    }
    /**
     * ===============================================
     *                    Export
     * ===============================================
     **/

    // Will fill a canvas with the highlighted data and scan every pixel of that and fill another canvas with diva data
    // on the highlighted regions
    exportAsImageData ()
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel;

        new Export(this, this.layers, pageIndex, zoomLevel, this.uiManager).exportLayersAsImageData();
    }

    exportAsHighlights ()
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel;

        new Export(this, this.layers, pageIndex, zoomLevel, this.uiManager).exportLayersAsHighlights();
    }

    exportAsCSV ()
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel;

        new Export(this, this.layers, pageIndex, zoomLevel, this.uiManager).exportLayersAsCSV();
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