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
        this.visibleTilesHandle = null;
        this.mouseHandles = null;
        this.keyboardHandles = null;
        this.layers = null;
        this.matrix = null;
        this.mousePressed = false;
        this.lastX, this.lastY;
        this.selectedLayer = 0;
        this.keyboardChangingLayers = false;
        this.actions = [];
        this.undoneActions = [];
        this.shiftDown = false;
        this.currentTool = "brush";
    }

    /**
     * ===============================================
     *         Plugin Activation/Deactivation
     * ===============================================
     **/

    handleClick (event, settings, publicInstance, pageIndex)
    {
        if (!this.activated)
            this.activatePlugin();
        else
            this.deactivatePlugin();
    }

    activatePlugin()
    {
        if(this.layers === null)
        {
            // Start by creating layers
            let layer1 = new Layer(0, new Colour(51, 102, 255, 0.8));
            let layer2 = new Layer(1, new Colour(255, 51, 102, 0.8));
            let layer3 = new Layer(2, new Colour(255, 255, 10, 0.8));
            let layer4 = new Layer(3, new Colour(10, 255, 10, 0.8));
            let layer5 = new Layer(4, new Colour(255, 137, 0, 0.8));

            layer1.addShapeToLayer(new Rectangle(new Point(23, 42, 0), 24, 24));
            layer2.addShapeToLayer(new Rectangle(new Point(48, 50, 0), 57, 5));
            layer3.addShapeToLayer(new Rectangle(new Point(50,120, 0), 50, 10));

            this.layers = [layer1, layer2, layer3, layer4, layer5];
        }

        this.initializeMatrix();
        this.visibleTilesHandle = this.subscribeToVisibleTilesEvent();
        this.subscribeToMouseEvents();
        this.keyboardHandles = this.subscribeToKeyboardEvents();
        this.createPluginElements(this.layers);
        this.repaint();  // Repaint the tiles to retrigger VisibleTilesDidLoad
        this.activated = true;
    }

    deactivatePlugin()
    {
        Diva.Events.unsubscribe(this.visibleTilesHandle);
        this.unsubscribeFromMouseEvents();
        this.unsubscribeFromKeyboardEvents();
        this.repaint(); // Repaint the tiles to make the highlights disappear off the page
        this.destroyPluginElements(this.layers);
        this.activated = false;
    }

    /**
     * ===============================================
     *        Event Subscription/Unsubscription
     * ===============================================
     **/

    subscribeToVisibleTilesEvent()
    {
        let handle = Diva.Events.subscribe('VisibleTilesDidLoad', (args) =>
        {
            this.drawHighlights(args);
        });
        return handle;
    }

    subscribeToMouseEvents()
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

    subscribeToKeyboardEvents()
    {
        let handle = (e) =>
        {
            const key1 = 49;
            const key9 = 56;
            const shiftKey = 16;

            let lastLayer = this.selectedLayer;
            let numberOfLayers = this.layers.length;
            let key = e.keyCode ? e.keyCode : e.which;

            if (key >= key1 && key < key1 + numberOfLayers && key <= key9)
            {
                this.selectedLayer = key - key1;
                document.getElementById("layer " + this.selectedLayer).checked = true;

                if (lastLayer !== this.selectedLayer && this.mousePressed)
                    this.keyboardChangingLayers = true;
            }

            if (key === shiftKey)
            {
                this.shiftDown = true;
            }
            else
            {
                this.shiftDown = false;
            }
        };


        let handleKeyDown = (e) =>
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
                console.log("SHIFT");
            }
            else if (e.key === "b")
            {
                this.currentTool = "brush";
            }
            else if (e.key === "r")
            {
                this.currentTool = "rectangle";
            }
        }

        document.addEventListener("keyup", handle);
        document.addEventListener("keydown", handleKeyDown);

        return handle;
    }

    unsubscribeFromMouseEvents()
    {
        var canvas = document.getElementById("diva-1-outer");

        canvas.removeEventListener('moubsedown', this.mouseHandles.mouseDownHandle);
        canvas.removeEventListener('mouseup', this.mouseHandles.mouseUpHandle);
        canvas.removeEventListener('mouseleave', this.mouseHandles.mouseUpHandle);
        canvas.removeEventListener('mousemove', this.mouseHandles.mouseMoveHandle);
    }

    unsubscribeFromKeyboardEvents()
    {
        document.removeEventListener("keyup", this.keyboardHandles);
    }

    /**
     * ===============================================
     *                HTML UI Elements
     * ===============================================
     **/

    createPluginElements(layers)
    {
        this.createUndoButton();
        this.createRedoButton();
        this.createLayerSelectors(layers);
        this.createBrushSizeSelector();
    }

    destroyPluginElements(layers)
    {
        this.destroyLayerSelectors();
        this.destroyBrushSizeSelector();
        this.destroyUndoButton();
        this.destroyRedoButton();
    }

    createOpacitySlider(layer, parentElement)
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

        parentElement.appendChild(opacitySlider);
    }

    destroyOpacitySlider(layer)
    {
        let opacitySlider = document.getElementById("layer " + layer.layerType + " opacity");
        document.body.removeChild(opacitySlider);
    }

    createLayerSelectors(layers)
    {
        let form = document.createElement("form");

        form.setAttribute("id", "layer selector");
        form.setAttribute("action", "");

        layers.forEach((layer) =>
        {
            let radio = document.createElement("input");
            let content = document.createTextNode("Layer " + (layer.layerType + 1));
            let br = document.createElement("br");

            radio.setAttribute("id", "layer " + layer.layerType);
            radio.setAttribute("type", "radio");
            radio.setAttribute("value", layer.layerType);
            radio.setAttribute("name", "layer selector");
            radio.onclick = () => { this.selectedLayer = radio.value; };

            if (layer.layerType === 0)      // Layer 0 is checked by default
                radio.checked = true;

            form.appendChild(radio);
            form.appendChild(content);
            this.createOpacitySlider(layer, form);
            form.appendChild(br);
        });
        document.body.appendChild(form);
    }

    destroyLayerSelectors()
    {
        let form = document.getElementById("layer selector");
        document.body.removeChild(form);
    }

    createBrushSizeSelector()
    {
        let brushSizeSelector = document.createElement("input");
        brushSizeSelector.setAttribute("id", "brush size selector");
        brushSizeSelector.setAttribute("type", "range");
        brushSizeSelector.setAttribute('max', 50);
        brushSizeSelector.setAttribute('min', 1);
        brushSizeSelector.setAttribute('value', 10);
        document.body.appendChild(brushSizeSelector);
    }

    destroyBrushSizeSelector()
    {
        let brushSizeSelector = document.getElementById("brush size selector");
        document.body.removeChild(brushSizeSelector);
    }

    createUndoButton()
    {
        let undoButton = document.createElement("button");
        let text = document.createTextNode("Undo");

        this.undo = () => { this.undoAction(); };

        undoButton.setAttribute("id", "undo button");
        undoButton.appendChild(text);
        undoButton.addEventListener("click", this.undo);

        document.body.appendChild(undoButton);
    }

    destroyUndoButton()
    {
        let undoButton = document.getElementById("undo button");
        document.body.removeChild(undoButton);
    }

    createRedoButton()
    {
        let redoButton = document.createElement("button");
        let text = document.createTextNode("Redo");
        let br = document.createElement("br");

        this.redo = () => { this.redoAction(); };

        br.setAttribute("id", "redo button break");
        redoButton.setAttribute("id", "redo button");
        redoButton.appendChild(text);
        redoButton.addEventListener("click", this.redo);

        document.body.appendChild(redoButton);
        document.body.appendChild(br);
    }

    destroyRedoButton()
    {
        let redoButton = document.getElementById("redo button");
        document.body.removeChild(redoButton);

        let br = document.getElementById("redo button break");
        document.body.removeChild(br);
    }

    /**
     * ===============================================
     *                   Drawing
     * ===============================================
     **/

    onMouseDown(evt)
    {
        let canvas = document.getElementById("diva-1-outer");
        switch (this.currentTool)
        {
            case "brush":
                this.mousePressed = true;
                this.initializeNewPath(canvas, evt);
                this.undoneActions = [];
                break;
            case "rectangle":
                this.mousePressed = true;
                this.rectangleShapePreview(canvas, evt);
                break;
            default:
                this.mousePressed = true;
        }
    }

    onMouseMove(evt)
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

    onMouseUp(evt)
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

    initializeNewPath(canvas, evt)
    {
        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;
        let mousePos = this.getMousePos(canvas, evt);
        let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            let selectedLayer = this.layers[this.selectedLayer];
            let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
            let brushSize = document.getElementById("brush size selector").value/10;

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
        if (this.mousePressed)
        {
            if (this.keyboardChangingLayers)
            {
                this.initializeNewPath(canvas, evt);
                this.keyboardChangingLayers = false;
            }
            else
            {
                let pageIndex = this.core.getSettings().currentPageIndex;
                let zoomLevel = this.core.getSettings().zoomLevel;
                let mousePos = this.getMousePos(canvas, evt);
                let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

                if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
                {
                    let point = new Point(relativeCoords.x, relativeCoords.y, pageIndex);
                    let brushSize = this.layers[this.selectedLayer].getCurrentPath().brushSize;

                    this.layers[this.selectedLayer].addToCurrentPath(point);
                    this.drawPath(this.layers[this.selectedLayer], point, pageIndex, zoomLevel, brushSize, true);
                }
            }
        }
    }


    rectangleShapePreview (canvas, evt)
    {
        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;
        let mousePos = this.getMousePos(canvas, evt);
        let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);

        if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
        {
            this.layers[this.selectedLayer].addShapeToLayer(new Rectangle(new Point(relativeCoords.x,relativeCoords.y,pageIndex), 0, 0));
            this.repaint();
        }
    }

    rectanglePreview (canvas, evt)
    {
        if (this.mousePressed)
        {
            let pageIndex = this.core.getSettings().currentPageIndex;
            let zoomLevel = this.core.getSettings().zoomLevel;
            let mousePos = this.getMousePos(canvas, evt);
            let relativeCoords = this.getRelativeCoordinates(mousePos.x, mousePos.y);
            let lastShape = this.layers[this.selectedLayer].getLastShape();

            if (this.isInPageBounds(relativeCoords.x, relativeCoords.y))
            {
                lastShape.relativeRectWidth = relativeCoords.x - lastShape.origin.relativeOriginX;
                lastShape.relativeRectHeight = relativeCoords.y - lastShape.origin.relativeOriginY;
                this.repaint();
            }
        }
    }

    redoAction ()
    {
        if (this.undoneActions.length > 0)
        {
            let actionToRedo = this.undoneActions[this.undoneActions.length - 1];

            actionToRedo.layer.addPathToLayer(actionToRedo.path);
            this.actions.push(actionToRedo);
            this.undoneActions.splice(this.undoneActions.length - 1,1);
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
        if(this.actions.length > 0 && this.actions.length >= index)
        {
            let actionToRemove = this.actions[index];
            actionToRemove.layer.removePathFromLayer(actionToRemove.path);
            this.actions.splice(index, 1);
            this.repaint();
        }
    }

    repaint()
    {
        this.core.getSettings().renderer._paint();
    }

    isInPageBounds(relativeX, relativeY)
    {
        let pageDimensions = this.core.publicInstance.getCurrentPageDimensionsAtCurrentZoomLevel();
        let absolutePageOrigin = this.getAbsoluteCoordinates(0,0);
        let absolutePageWidthOffset = pageDimensions.width + absolutePageOrigin.x;  //Taking into account the padding, etc...
        let absolutePageHeightOffset = pageDimensions.height + absolutePageOrigin.y;
        let relativeBounds = this.getRelativeCoordinates(absolutePageWidthOffset, absolutePageHeightOffset);

        if (relativeX < 0 || relativeY < 0 || relativeX > relativeBounds.x || relativeY > relativeBounds.y)
        {
            return false;
        }

        return true;
    }

    getMousePos(canvas, evt)
    {
        let rect = canvas.getBoundingClientRect();

        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    getRelativeCoordinates(highlightXOffset, highlightYOffset)
    {
        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;
        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteRectOriginX = highlightXOffset - renderer._getImageOffset(pageIndex).left + renderer._viewport.left -  viewportPaddingX;
        let absoluteRectOriginY = highlightYOffset - renderer._getImageOffset(pageIndex).top + renderer._viewport.top - viewportPaddingY;

        return{
            x: absoluteRectOriginX/scaleRatio,
            y: absoluteRectOriginY/scaleRatio
        };
    }

    getAbsoluteCoordinates(relativeX, relativeY)
    {
        let pageIndex = this.core.getSettings().currentPageIndex;
        let zoomLevel = this.core.getSettings().zoomLevel;

        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        let absoluteX = relativeX * scaleRatio;
        let absoluteY = relativeY * scaleRatio;

        // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
        // (to make it look like it is on top of a page in Diva)
        let absoluteOffsetX = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteX;
        let absoluteOffsetY = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteY;

        return{
            x: absoluteOffsetX,
            y: absoluteOffsetY
        };
    }

    drawPath(layer, point, pageIndex, zoomLevel, brushSize, isDown)
    {
        let renderer = this.core.getSettings().renderer;
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = point.relativeOriginX * scaleRatio;
        let absoluteRectOriginY = point.relativeOriginY * scaleRatio;

        // This indicates the page on top of which the highlights are supposed to be drawn
        let highlightPageIndex = point.pageIndex;

        if (pageIndex === highlightPageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX;
            let highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

            if(isDown)
            {
                renderer._ctx.beginPath();
                renderer._ctx.strokeStyle = layer.colour.toString();
                renderer._ctx.lineWidth = brushSize * scaleRatio;
                renderer._ctx.lineJoin = "round";
                renderer._ctx.moveTo(this.lastX, this.lastY);
                renderer._ctx.lineTo(highlightXOffset, highlightYOffset);
                renderer._ctx.closePath();
                renderer._ctx.stroke();
            }

            this.lastX = highlightXOffset;
            this.lastY = highlightYOffset;
        }
    }

    drawHighlights(args)
    {
        let pageIndex = args[0],
            zoomLevel = args[1];

        this.layers.forEach((layer) =>
        {
            let shapes = layer.shapes;

            shapes.forEach((shape) =>
                {
                    shape.draw(layer, pageIndex, zoomLevel, this.core.getSettings().renderer);
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
    }

    /**
     * ===============================================
     *                    Backend
     * ===============================================
     **/

    /**
     * Initializes the base matrix that maps the real-size picture
     **/
    initializeMatrix()
    {
        if (this.matrix === null)
        {
            let pageIndex = this.core.getSettings().currentPageIndex,
                maxZoomLevel = this.core.getSettings().maxZoomLevel;
            let height = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).height,
                width = this.core.publicInstance.getPageDimensionsAtZoomLevel(pageIndex, maxZoomLevel).width;
            this.matrix = new Array(width).fill(null).map(() => new Array(height).fill(0));
        }
    }

    /**
     * Fills the base matrix with type data outlined by the layer drawings
     * @param path object containing points
     * @param layer The targeted layer containing the pixels to map
     */
    fillMatrix(path, layer)
    {
        let maxZoomLevel = this.core.getSettings().maxZoomLevel;
        let scaleRatio = Math.pow(2, maxZoomLevel);
        path.points.forEach((point) =>
        {
            let absoluteOriginX = point.relativeRectOriginX * scaleRatio,
                absoluteOriginY = point.relativeRectOriginY * scaleRatio;
            this.matrix[absoluteOriginX][absoluteOriginY] = layer.layerType;
        });
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
}

export class Shape
{
    constructor (point)
    {
        this.origin = point
    }

    draw()
    {

    }
}


export class Rectangle extends Shape
{
    constructor(point, relativeRectWidth, relativeRectHeight) {
        super(point);
        this.relativeRectWidth = relativeRectWidth;
        this.relativeRectHeight = relativeRectHeight;
    }

    draw(layer, pageIndex, zoomLevel, renderer)
    {
        let scaleRatio = Math.pow(2,zoomLevel);

        const viewportPaddingX = Math.max(0, (renderer._viewport.width - renderer.layout.dimensions.width) / 2);
        const viewportPaddingY = Math.max(0, (renderer._viewport.height - renderer.layout.dimensions.height) / 2);

        // The following absolute values are experimental values to highlight the square on the first page of Salzinnes, CDN-Hsmu M2149.L4
        // The relative values are used to scale the highlights according to the zoom level on the page itself
        let absoluteRectOriginX = this.origin.relativeOriginX * scaleRatio;
        let absoluteRectOriginY = this.origin.relativeOriginY * scaleRatio;
        let absoluteRectWidth = this.relativeRectWidth * scaleRatio;
        let absoluteRectHeight = this.relativeRectHeight * scaleRatio;

        if (pageIndex === this.origin.pageIndex)
        {
            // Calculates where the highlights should be drawn as a function of the whole webpage coordinates
            // (to make it look like it is on top of a page in Diva)
            let highlightXOffset = renderer._getImageOffset(pageIndex).left - renderer._viewport.left + viewportPaddingX + absoluteRectOriginX;
            let highlightYOffset = renderer._getImageOffset(pageIndex).top - renderer._viewport.top + viewportPaddingY + absoluteRectOriginY;

            //Draw the rectangle
            renderer._ctx.fillStyle = layer.colour.toString();
            renderer._ctx.fillRect(highlightXOffset, highlightYOffset,absoluteRectWidth,absoluteRectHeight);
        }
    }
}

export class Path
{
    constructor (brushSize)
    {
        this.points = [];
        this.brushSize = brushSize;
    }

    addPointToPath(point)
    {
        this.points.push(point);
    }
}

export class Point
{
    constructor (relativeOriginX, relativeOriginY, pageIndex)
    {
        this.relativeOriginX = relativeOriginX;
        this.relativeOriginY = relativeOriginY;
        this.pageIndex = pageIndex;
    }
}

export class Action
{
    constructor (path, layer)
    {
        this.path = path;
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

    toString ()
    {
        return "rgba(" + this.red +  ", " + this.green + ", " + this.blue + ", " + this.opacity + ")";
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

    addShapeToLayer(shape)
    {
        this.shapes.push(shape);
    }

    addPathToLayer(path)
    {
        this.paths.push(path);
    }

    addToCurrentPath(point)
    {
        if (this.paths.length === 0)
        {
            let brushSizeSelector = document.getElementById("brush size selector");
            this.createNewPath(brushSizeSelector.value/10);
        }
        this.paths[this.paths.length - 1].addPointToPath(point);
    }

    getCurrentPath()
    {
        if(this.paths.length > 0)
        {
            return this.paths[this.paths.length - 1];
        }
        else
        {
            return null;
        }
    }

    createNewPath(brushSize)
    {
        this.paths.push(new Path(brushSize));
    }

    removePathFromLayer(path)
    {
        let index = this.paths.indexOf(path);
        this.paths.splice(index, 1);
    }

    setOpacity(opacity)
    {
        this.colour.opacity = opacity;
    }

    getOpacity()
    {
        return this.colour.opacity;
    }

    getLastShape()
    {
        if(this.shapes.length > 0)
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