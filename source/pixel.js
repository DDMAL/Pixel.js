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
        this.rightMousePressed = false;
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
            // Start by creating layers
            let background = new Layer(0, new Colour(242, 242, 242, 1), "Background", this, 1),
                layer1 = new Layer(1, new Colour(51, 102, 255, 1), "Layer 1", this, 0.5),
                layer2 = new Layer(2, new Colour(255, 51, 102, 1), "Layer 2", this, 0.5),
                layer3 = new Layer(3, new Colour(255, 255, 10, 1), "Layer 3", this, 0.5);

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
        this.subscribeToWindowResizeEvent();
        this.subscribeToMouseEvents();
        this.subscribeToKeyboardEvents();
        this.redrawAllLayers();  // Repaint the tiles to retrigger VisibleTilesDidLoad

        this.activated = true;
    }

    deactivatePlugin ()
    {
        global.Diva.Events.unsubscribe(this.scrollEventHandle);
        global.Diva.Events.unsubscribe(this.zoomEventHandle);

        this.unsubscribeFromMouseEvents();
        this.unsubscribeFromKeyboardEvents();
        this.redrawAllLayers(); // Repaint the tiles to make the highlights disappear off the page

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

    subscribeToWindowResizeEvent ()
    {
        window.addEventListener("resize", () =>
        {
            this.layers.forEach((layer) =>
            {
                layer.placeLayerCanvasOnTopOfEditingPage();
            });
        });
    }

    subscribeToZoomLevelWillChangeEvent ()
    {
        let handle = global.Diva.Events.subscribe('ZoomLevelWillChange', (zoomLevel) =>
        {
            this.layers.forEach((layer) =>
            {
                layer.resizeLayerCanvasToZoomLevel(zoomLevel);
            });
        });

        return handle;
    }

    subscribeToScrollEvent ()
    {
        let handle = global.Diva.Events.subscribe('ViewerDidScroll', () =>
        {
            this.layers.forEach((layer) =>
            {
                layer.placeLayerCanvasOnTopOfEditingPage();
            });
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

    /**
     * ===============================================
     *        Handling Keyboard and Mouse Events
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

        this.selectedLayerIndex = destinationLayerIndex;
        this.uiManager.destroyPluginElements(this.layers, this.background);
        this.uiManager.createPluginElements(this.layers);
        this.uiManager.destroyPixelCanvases(this.layers);   // TODO: Optimization: Instead of destroying all of the canvases only destroy and reorder the ones of interest
        this.uiManager.placeLayerCanvasesInDiva(this.layers);
        this.uiManager.placeLayerCanvasesInDiva(this.background);
        this.highlightLayerSelector(this.layers[this.selectedLayerIndex].layerId);
        this.redrawAllLayers();
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

        // Selecting Layer
        if (key >= KEY_1 && key < KEY_1 + numberOfLayers && key <= KEY_9)
        {
            this.highlightLayerSelector(key - KEY_1 + 1);

            if (lastLayer !== this.selectedLayerIndex && this.mousePressed)
                this.layerChangedMidDraw = true;
        }

        if (key === SHIFT_KEY)
            this.shiftDown = false;
    }

    onKeyDown (e)
    {
        switch (e.key)
        {
            case "z":
                if (e.ctrlKey || e.metaKey)                // Cmd + Z
                    this.undoAction();
                break;
            case "Z":
                if (e.ctrlKey || e.metaKey)                 // Cmd + Shift + Z
                    this.redoAction();
                break;
            case "Shift":
                this.shiftDown = true;
                break;
            case "b":
                this.tools.setCurrentTool(this.tools.type.brush);
                break;
            case "r":
                this.tools.setCurrentTool(this.tools.type.rectangle);
                break;
            case "g":
                this.tools.setCurrentTool(this.tools.type.grab);
                break;
            case "e":
                this.tools.setCurrentTool(this.tools.type.eraser);
                break;
            case "s":
                this.tools.setCurrentTool(this.tools.type.select);
        }
    }

    editLayerName (e, layerName)
    {
        const RETURN_KEY = 13;

        // TODO: Listen for changes when clicked outside of LayerName
        // TODO: Unsubscribe from other keyboard listeners
        // TODO: Disable drag for layers
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
        let mouseClickDiv = document.getElementById("diva-1-outer"),
            mousePos = this.getMousePos(mouseClickDiv, evt);

        if (evt.which === 1)
        {
            this.rightMousePressed = false;
            switch (this.tools.getCurrentTool())
            {
                case this.tools.type.brush:
                    this.mousePressed = true;
                    this.initializeNewPathInCurrentLayer(mousePos);
                    break;
                case this.tools.type.rectangle:
                    this.mousePressed = true;
                    this.initializeRectanglePreview(mousePos);
                    break;
                case this.tools.type.grab:
                    this.mousePressed = true;
                    break;
                case this.tools.type.eraser:
                    this.mousePressed = true;
                    this.initializeNewPathInCurrentLayer(mousePos);
                    break;
                case this.tools.type.select:
                    this.mousePressed = true;
                    this.initializeRectanglePreview(mousePos);
                    break;
                default:
                    this.mousePressed = true;
            }
        }

        else if (evt.which === 3)
        {
            this.rightMousePressed = true;
            switch (this.tools.getCurrentTool())
            {
                case this.tools.type.brush:
                    this.mousePressed = false;
                    let brushSizeSlider = document.getElementById("brush-size-selector");
                    let brushSizeValue = (brushSizeSlider.value / brushSizeSlider.max) * 10;
                    //TODO: brush size change on mouse drag here!
                    break;
                case this.tools.type.rectangle:
                    this.mousePressed = true;
                    this.initializeRectanglePreview(mousePos);
                    break;
                default:
                    this.mousePressed = true;
            }
        }

        // FIXME: At deactivation mouse is down so it clears the actions to redo
        this.undoneActions = [];
    }

    onMouseMove (evt)
    {
        let mouseClickDiv = document.getElementById("diva-1-outer"),
            mousePos = this.getMousePos(mouseClickDiv, evt);

        switch (this.tools.getCurrentTool())
        {
            case this.tools.type.brush:
                if (this.rightMousePressed)
                {
                    //UNFINISHED
                    //this.changeBrushSize(mousePos);
                }
                else
                {
                    this.addPointToCurrentPath(mousePos);
                }
                break;
            case this.tools.type.rectangle:
                this.rectanglePreview(mousePos);
                break;
            case this.tools.type.eraser:
                this.addPointToCurrentPath(mousePos);
                break;
            case this.tools.type.select:
                this.rectanglePreview(mousePos);
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
                this.rightMousePressed = false;
                break;
            case this.tools.type.rectangle: // TODO: Add action: resized rectangle. This is useful if a user wants to revert a rectangle resize (when implemented)
                this.mousePressed = false;
                this.rightMousePressed = false;
                break;
            case this.tools.type.eraser:
                this.mousePressed = false;
                this.rightMousePressed = false;
                break;
            case this.tools.type.select: // TODO: remove from shapes array
                this.mousePressed = false;
                this.rightMousePressed = false;
                break;
            default:
                this.mousePressed = false;
                this.rightMousePressed = false;
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
            layer.getCanvas().style.opacity = layer.getLayerOpacity();

            if (layer.layerId === -1)      // Background
            {
                layer.activated = true;
            }
            else
            {
                layer.activateLayer();
                this.redrawLayer(layer);
            }
        }
        else    // Deactivating
        {
            layerActivationDiv.classList.remove("layer-activated");
            layerActivationDiv.classList.add("layer-deactivated");

            if (layer.layerId === -1)      // Background
            {
                layer.getCanvas().style.opacity = 0;
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
            this.redrawLayer(actionToRedo.layer);
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
            this.redrawLayer(actionToRemove.layer);
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

    initializeNewPathInCurrentLayer (mousePos)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().maxZoomLevel,
            relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y);

        // Make sure user is not drawing outside of a diva page
        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let selectedLayer = this.layers[this.selectedLayerIndex],
                point = new Point(relativeCoords.x, relativeCoords.y, pageIndex),
                brushSize = this.uiManager.getBrushSizeSelectorValue();

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
            selectedLayer.getCurrentPath().connectPoint(selectedLayer, point, pageIndex, zoomLevel, false, this.core.getSettings().renderer, selectedLayer.getCanvas(), "page");
        }
        else
        {
            this.mousePressed = false;
        }
    }

    addPointToCurrentPath (mousePos)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let point,
            horizontalMove = false,
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
                zoomLevel = this.core.getSettings().maxZoomLevel;

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

            let layer = this.layers[this.selectedLayerIndex];
            layer.getCurrentPath().connectPoint(layer, point, pageIndex, zoomLevel, true, this.core.getSettings().renderer, layer.getCanvas(), "page");

            return;
        }

        // If layer changed mid drawing then create a new path on selected layer
        this.initializeNewPathInCurrentLayer(mousePos);
        this.layerChangedMidDraw = false;
    }

    initializeRectanglePreview (mousePos)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        let pageIndex = this.core.getSettings().currentPageIndex,
            relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y)) {
            let selectedLayer = this.layers[this.selectedLayerIndex];
            if (this.tools.getCurrentTool() === this.tools.type.select)
                selectedLayer.addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0, "select", this.tools.getCurrentTool()));

            //next 2 condition checks assume the selected tool is rectangle
            else if (this.rightMousePressed)
                selectedLayer.addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0, "subtract", this.tools.getCurrentTool()));

            else
                selectedLayer.addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0, "add", this.tools.getCurrentTool()));


            this.actions.push(new Action(selectedLayer.getCurrentShape(), selectedLayer));
            this.redrawLayer(selectedLayer);
        }
    }

    rectanglePreview (mousePos)
    {
        if (!this.layers[this.selectedLayerIndex].isActivated())
            return;

        if (!this.layerChangedMidDraw)
        {
            if (this.mousePressed)
            {
                let relativeCoords = this.getRelativeCoordinatesFromPadded(mousePos.x, mousePos.y),
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
                this.redrawLayer(this.layers[this.selectedLayerIndex]);
            }
        }
        else
        {
            // Create a new rectangle to which the change will be
            this.layerChangedMidDraw = false;
            this.initializeRectanglePreview(mousePos);
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

    redrawLayer (layer)
    {
        layer.drawLayer(this.core.getSettings().maxZoomLevel, layer.getCanvas());
    }

    redrawAllLayers ()
    {
        this.layers.forEach((layer) =>
        {
            this.redrawLayer(layer);
        });
    }

    isInPageBounds (relativeX, relativeY)
    {
        let pageIndex = this.core.getSettings().currentPageIndex,
            zoomLevel = this.core.getSettings().zoomLevel,
            renderer  = this.core.getSettings().renderer;

        let pageDimensions = this.core.publicInstance.getCurrentPageDimensionsAtCurrentZoomLevel(),
            absolutePageOrigin = new Point(0,0).getCoordsInViewport(zoomLevel,pageIndex,renderer),
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