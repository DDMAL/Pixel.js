import {Path} from './path';
import {Point} from './point';

export class Layer
{
    constructor (layerId, colour, layerName, pixelInstance, layerOpacity)
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
        this.layerOpacity = layerOpacity;
        this.pixelInstance = pixelInstance;
        this.pageIndex = this.pixelInstance.core.getSettings().currentPageIndex;
        this.cloneCanvas();
    }

    cloneCanvas ()
    {
        let maxZoomLevel = this.pixelInstance.core.getSettings().maxZoomLevel;

        let height = this.pixelInstance.core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, maxZoomLevel).height,
            width = this.pixelInstance.core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, maxZoomLevel).width;

        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute("class", "pixel-canvas");
        this.canvas.setAttribute("id", "layer-" + this.layerId + "-canvas");
        this.canvas.width = width;
        this.canvas.height = height;

        this.ctx = this.canvas.getContext('2d');

        this.resizeLayerCanvasToZoomLevel(this.pixelInstance.core.getSettings().zoomLevel);
        this.placeLayerCanvasOnTopOfEditingPage();
    }

    resizeLayerCanvasToZoomLevel (zoomLevel)
    {
        let floorZoom = Math.floor(zoomLevel),
            extra = zoomLevel - floorZoom,
            scaleRatio = Math.pow(2, extra);

        let height = this.pixelInstance.core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, floorZoom).height,
            width = this.pixelInstance.core.publicInstance.getPageDimensionsAtZoomLevel(this.pageIndex, floorZoom).width;

        width *= scaleRatio;
        height *= scaleRatio;

        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";

        this.placeLayerCanvasOnTopOfEditingPage();

        if (this.pixelInstance.uiManager !== null)
            this.pixelInstance.uiManager.resizeBrushCursor();
    }

    placeLayerCanvasOnTopOfEditingPage ()
    {
        let zoomLevel = this.pixelInstance.core.getSettings().zoomLevel;

        let coords = new Point (0,0,0).getCoordsInViewport(zoomLevel, this.pageIndex, this.pixelInstance.core.getSettings().renderer);

        this.canvas.style.left = coords.x + "px";
        this.canvas.style.top = coords.y + "px";
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
     * @param blendMode
     */
    addToCurrentPath (point, blendMode)
    {
        if (this.paths.length === 0)
            this.createNewPath(this.pixelInstance.uiManager.getBrushSizeSelectorValue(), blendMode);

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

    setLayerOpacity (layerOpacity)
    {
        this.layerOpacity = layerOpacity;
    }

    getLayerOpacity ()
    {
        return this.layerOpacity;
    }

    getLayerOpacityCSSString ()
    {
        return "opacity : " + this.layerOpacity;
    }

    drawLayer (zoomLevel, canvas)
    {
        if (!this.isActivated())
            return;

        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let renderer = this.pixelInstance.core.getSettings().renderer;

        renderer._renderedPages.forEach((pageIndex) =>
        {
            this.actions.forEach((action) =>
            {
                action.drawOnPage(this, pageIndex, zoomLevel, renderer, canvas);
            });
        });
    }

    // Called on export
    drawLayerInPageCoords (zoomLevel, canvas, pageIndex)
    {
        this.actions.forEach((action) =>
        {
            action.drawOnPage(this, pageIndex, zoomLevel, this.pixelInstance.core.getSettings().renderer, canvas);
        });
    }
}